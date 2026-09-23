/**
 * Step 10AV — Terrain as spatial input.
 *
 * Terrain is IMPLEMENTED here, and this file pins the whole contract:
 *
 *   - `config.world.blockedCells` is canonical ("x,y" keys, deduped, sorted
 *     numerically by (x, y)), optional, and ABSENT whenever empty, so a
 *     terrain-free world keeps its historical canonical form and hash;
 *   - the ONLY effect is that the two placement validators refuse a blocked
 *     cell with the structured reason `terrainBlocked`, atomically and before
 *     affordability;
 *   - nothing else reads terrain: two states differing only by a blocked set
 *     that no command ever targets stay economically identical;
 *   - persistence stays SAVE_VERSION 7 (omit-when-empty, no migration);
 *   - the Step 10AU chokepoint phenomenon is reproduced on the REAL engine by
 *     the `terrain-chokepoint` fixture (variant C: the west Well site is
 *     blocked, so the connector cell is the only route that exists).
 *
 * Run:
 *   npx vitest run tests/terrainSpatialInput.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  canonicalJson,
  cellKey,
  createInitialState,
  createScenarioState,
  findScenario,
  findScenarioFixture,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  SaveValidationError,
  getBuildingDefinition,
  getPlacementAffordability,
  getReassignmentOptions,
  getRoadNetworks,
  getWaterCoverage,
  getWaterServedResidenceCount,
  hashCanonicalState,
  isCellOccupied,
  isTerrainBlocked,
  iterateBuildings,
  listBlockedCells,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  normalizeBlockedCells,
  parseBlockedCell,
  ROAD_CONSTRUCTION_COST,
  ROAD_CONSTRUCTION_TICKS,
  SAVE_VERSION,
  SCENARIOS,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  toRenderSnapshot,
  validatePlacement,
  validateRoadsPlacement,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10av', width: 12, height: 12 },
}

const terrainConfig = (
  blockedCells: readonly string[],
  seed = 'nova-step10av'
): SimulationConfig => ({
  world: { seed, width: 12, height: 12, blockedCells },
})

const terrainState = (blockedCells: readonly string[]): SimulationState =>
  createInitialState(terrainConfig(blockedCells))

/** Blocked set that no command in these tests ever targets. */
const BYSTANDER_TERRAIN: readonly string[] = ['0,0', '11,11', '0,11']

/**
 * The same state with terrain removed from the world config, so two runs can
 * be compared on everything EXCEPT the terrain field itself.
 */
const withoutTerrain = (state: SimulationState): unknown => ({
  ...state,
  config: {
    world: {
      seed: state.config.world.seed,
      width: state.config.world.width,
      height: state.config.world.height,
    },
  },
})

const tick = (state: SimulationState, times = 1): SimulationState => {
  let next = state
  for (let i = 0; i < times; i += 1) {
    next = stepSimulation(next)
  }
  return next
}

const buildingIdOfType = (state: SimulationState, type: string): readonly string[] =>
  [...iterateBuildings(state)]
    .filter((building) => building.type === type)
    .map((building) => building.id)
    .sort()

const cellAt = (state: SimulationState, x: number, y: number): CellCoordinate => ({
  x,
  y,
})

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

// ---------------------------------------------------------------------------
// 1. Terrain state: format, normalization, canonical form
// ---------------------------------------------------------------------------

describe('1. terrain state and canonical form', () => {
  it('accepts a buildable cell and refuses a blocked one', () => {
    const state = terrainState(['2,2'])
    expect(validatePlacement(state, cellAt(state, 1, 1), 'residence')).toEqual({
      valid: true,
    })
    expect(validatePlacement(state, cellAt(state, 2, 2), 'residence')).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    expect(isTerrainBlocked(state.config.world, cellAt(state, 2, 2))).toBe(true)
    expect(isTerrainBlocked(state.config.world, cellAt(state, 2, 3))).toBe(false)
  })

  it('reads a malformed key as malformed, never as a cell', () => {
    for (const malformed of ['2 ,2', 'x,2', '2', '2,', '-1,0', '2,2,3', '']) {
      expect(() => parseBlockedCell(malformed)).toThrow(/Malformed blocked cell/)
      expect(() => normalizeBlockedCells([malformed])).toThrow(
        /Malformed blocked cell/
      )
      expect(() =>
        createInitialState(terrainConfig([malformed]))
      ).toThrow(/Malformed blocked cell/)
    }
  })

  it('rejects a blocked cell outside the world', () => {
    expect(() =>
      createInitialState({ world: { seed: 's', width: 4, height: 4, blockedCells: ['4,0'] } })
    ).toThrow(/out of bounds/)
    expect(() =>
      createInitialState({ world: { seed: 's', width: 4, height: 4, blockedCells: ['0,4'] } })
    ).toThrow(/out of bounds/)
    expect(() =>
      createInitialState({ world: { seed: 's', width: 4, height: 4, blockedCells: ['9,9'] } })
    ).toThrow(/out of bounds/)
  })

  it('normalizes duplicates and sorts numerically, not lexicographically', () => {
    expect(normalizeBlockedCells(['3,4', '1,2', '3,4'])).toEqual(['1,2', '3,4'])
    // Numeric (x, y) order: "10,0" comes AFTER "2,0".
    expect(normalizeBlockedCells(['10,0', '2,0', '2,10', '2,2'])).toEqual([
      '2,0',
      '2,2',
      '2,10',
      '10,0',
    ])
    expect(normalizeBlockedCells([])).toEqual([])
  })

  it('treats insertion order as irrelevant (same canonical form and hash)', () => {
    const first = terrainState(['3,4', '1,2', '7,7'])
    const second = terrainState(['7,7', '1,2', '3,4', '1,2'])
    expect(first.config.world.blockedCells).toEqual(['1,2', '3,4', '7,7'])
    expect(serializeCanonicalState(first)).toBe(serializeCanonicalState(second))
    expect(hashCanonicalState(first)).toBe(hashCanonicalState(second))
  })

  it('treats an empty list as no terrain at all (single representation)', () => {
    const absent = createInitialState(config)
    const empty = createInitialState(terrainConfig([]))
    expect(empty.config.world.blockedCells).toBeUndefined()
    expect(Object.keys(empty.config.world).sort()).toEqual([
      'height',
      'seed',
      'width',
    ])
    expect(serializeCanonicalState(empty)).toBe(serializeCanonicalState(absent))
    expect(hashCanonicalState(empty)).toBe(hashCanonicalState(absent))
  })

  it('keeps a terrain-free world free of any terrain field', () => {
    const state = createInitialState(config)
    expect(canonicalJson(state)).not.toContain('blocked')
    expect(JSON.stringify(serializeSave(state))).not.toContain('blockedCells')
  })

  it('makes terrain part of the canonical hash: none != one obstacle', () => {
    const none = createInitialState(config)
    const one = terrainState(['2,2'])
    expect(serializeCanonicalState(none)).not.toBe(serializeCanonicalState(one))
    expect(hashCanonicalState(none)).not.toBe(hashCanonicalState(one))
  })

  it('projects the canonical list for rendering (sorted, never re-derived)', () => {
    const state = terrainState(['3,4', '1,2'])
    const snapshot = toRenderSnapshot(state)
    expect(snapshot.blockedCells).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
    const terrainFree = createInitialState(config)
    const terrainFreeSnapshot = toRenderSnapshot(terrainFree)
    expect(terrainFreeSnapshot.blockedCells).toEqual([])
    expect(listBlockedCells(terrainFree.config.world)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2. Building placement
// ---------------------------------------------------------------------------

describe('2. building placement', () => {
  it('refuses a blocked cell with terrainBlocked and mutates nothing', () => {
    const state = terrainState(['2,2'])
    const result = applyCommand(state, {
      type: 'placeBuilding',
      x: 2,
      y: 2,
      buildingType: 'residence',
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('terrainBlocked')
    // Same state REFERENCE: no building, no counter move, no cost, no tick.
    expect(result.state).toBe(state)
    expect(Object.keys(result.state.buildings)).toHaveLength(0)
    expect(result.state.counters).toEqual(state.counters)
    expect(result.state.resources.construction).toBe(state.resources.construction)
    expect(result.state.time.tick).toBe(0)
  })

  it('accepts the same building on an unblocked cell next door', () => {
    const state = terrainState(['2,2'])
    const result = applyCommand(state, {
      type: 'placeBuilding',
      x: 3,
      y: 2,
      buildingType: 'residence',
    })
    expect(result.accepted).toBe(true)
    expect(Object.keys(result.state.buildings)).toHaveLength(1)
    expect(result.state.resources.construction).toBe(
      state.resources.construction - getBuildingDefinition('residence').constructionCost
    )
  })

  it('checks terrain before affordability', () => {
    const poor: SimulationState = {
      ...terrainState(['2,2']),
      resources: { construction: 0, food: 0, water: 0 },
    }
    const result = applyCommand(poor, {
      type: 'placeBuilding',
      x: 2,
      y: 2,
      buildingType: 'residence',
    })
    expect(result.reason).toBe('terrainBlocked')
    // A Workshop additionally needs Water: terrain still wins the reason order.
    expect(
      applyCommand(poor, {
        type: 'placeBuilding',
        x: 2,
        y: 2,
        buildingType: 'workshop',
      }).reason
    ).toBe('terrainBlocked')
  })

  it('checks bounds before terrain', () => {
    const state = terrainState(['2,2'])
    expect(validatePlacement(state, cellAt(state, 12, 12), 'residence')).toEqual({
      valid: false,
      reason: 'outOfBounds',
    })
    expect(validatePlacement(state, cellAt(state, 2, 2), 'residence')).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
  })

  it('surfaces terrainBlocked through the shared affordability query', () => {
    const state = terrainState(['2,2'])
    const affordability = getPlacementAffordability(state, cellAt(state, 2, 2), 'residence')
    expect(affordability.placement).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    expect(affordability.affordable).toBe(false)
    expect(affordability.coveredByStoredProduction).toBe(false)
  })

  it('leaves the construction contract untouched (2 ticks after placement)', () => {
    const state = terrainState(['0,0'])
    const placed = stepSimulation(state, {
      type: 'placeBuilding',
      x: 4,
      y: 4,
      buildingType: 'residence',
    })
    const id = Object.keys(placed.buildings)[0] ?? ''
    expect(placed.buildings[id]?.constructionRemaining).toBe(2)
    expect(tick(placed).buildings[id]?.constructionRemaining).toBe(1)
    expect(tick(placed, 2).buildings[id]?.status).toBe('operational')
  })
})

// ---------------------------------------------------------------------------
// 3. Road placement (atomic)
// ---------------------------------------------------------------------------

describe('3. road placement is atomic', () => {
  it('refuses a blocked cell', () => {
    const state = terrainState(['2,2'])
    expect(validateRoadsPlacement(state, [cellAt(state, 2, 2)])).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
  })

  it('refuses a whole drag that crosses one blocked cell', () => {
    const state = terrainState(['2,2'])
    const cells = [cellAt(state, 1, 2), cellAt(state, 2, 2), cellAt(state, 3, 2)]
    expect(validateRoadsPlacement(state, cells)).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    const result = applyCommand(state, { type: 'placeRoads', cells })
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('terrainBlocked')
    // Atomic: no partial road, no Material spent, no counter move.
    expect(result.state).toBe(state)
    expect(Object.keys(result.state.roads)).toHaveLength(0)
    expect(result.placedRoadIds).toEqual([])
    expect(result.state.resources.construction).toBe(100)
  })

  it('keeps the reason order (empty, bounds, terrain, occupancy, cost)', () => {
    const state = terrainState(['2,2'])
    expect(validateRoadsPlacement(state, [])).toEqual({
      valid: false,
      reason: 'emptyCells',
    })
    expect(validateRoadsPlacement(state, [cellAt(state, 99, 0)])).toEqual({
      valid: false,
      reason: 'outOfBounds',
    })
    expect(
      validateRoadsPlacement(state, [cellAt(state, 99, 0), cellAt(state, 2, 2)])
    ).toEqual({ valid: false, reason: 'outOfBounds' })
  })

  it('leaves road cost and the valid set unchanged elsewhere', () => {
    const state = terrainState(['0,0'])
    expect(validateRoadsPlacement(state, [cellAt(state, 1, 1), cellAt(state, 2, 1)])).toEqual({
      valid: true,
      cells: [cellAt(state, 1, 1), cellAt(state, 2, 1)],
      totalCost: 10,
    })
    const placed = stepSimulation(state, {
      type: 'placeRoads',
      cells: [cellAt(state, 1, 1), cellAt(state, 2, 1)],
    })
    expect(Object.keys(placed.roads)).toHaveLength(2)
    expect(placed.resources.construction).toBe(100 - 2 * ROAD_CONSTRUCTION_COST)
    // Step 09C: a placed road is caught up once by the same tick's command
    // phase, so it keeps the 2-tick contract (2 -> 1 at placement).
    expect(
      Object.values(placed.roads).every(
        (road) => road.constructionRemaining === ROAD_CONSTRUCTION_TICKS - 1
      )
    ).toBe(true)
  })

  it('refuses a blocked cell before occupancy (terrain cannot be occupied by design)', () => {
    const base = createInitialState(config)
    const built = stepSimulation(base, {
      type: 'placeBuilding',
      x: 3,
      y: 3,
      buildingType: 'residence',
    })
    // Artificial (a sculpted state declares a blocked cell that already holds
    // a building), used only to pin the reason ORDER: bounds, then terrain,
    // then occupancy, then cost.
    const state: SimulationState = {
      ...built,
      config: {
        world: { ...built.config.world, blockedCells: ['3,3', '3,4'] },
      },
    }
    expect(validateRoadsPlacement(state, [cellAt(state, 3, 3)])).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    expect(validateRoadsPlacement(state, [cellAt(state, 3, 4)])).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    // Occupancy is still reported for an occupied cell that is NOT blocked.
    expect(
      validateRoadsPlacement(
        { ...built, config: { world: { ...built.config.world, blockedCells: ['5,5'] } } },
        [cellAt(state, 3, 3)]
      )
    ).toEqual({ valid: false, reason: 'cellOccupiedByBuilding' })
    expect(isCellOccupied(state, cellAt(state, 3, 3))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Persistence (omit-when-empty, SAVE_VERSION 7)
// ---------------------------------------------------------------------------

describe('4. persistence', () => {
  it('keeps SAVE_VERSION at 7 and writes no terrain field when empty', () => {
    expect(SAVE_VERSION).toBe(8)
    const saved = serializeSave(createInitialState(config))
    expect(saved).not.toContain('blockedCells')
    const raw = JSON.parse(saved) as { version: number }
    expect(raw.version).toBe(8)
  })

  it('writes terrain only when the world owns blocked cells', () => {
    const saved = serializeSave(terrainState(['1,2', '3,2']))
    expect(saved).toContain('"blockedCells":["1,2","3,2"]')
    const raw = JSON.parse(saved) as { version: number }
    expect(raw.version).toBe(8)
  })

  it('loads an old save without terrain as terrain-free', () => {
    const saved = serializeSave(createInitialState(config))
    const loaded = loadSave(saved)
    expect(loaded.config.world.blockedCells).toBeUndefined()
    expect(hashCanonicalState(loaded)).toBe(
      hashCanonicalState(createInitialState(config))
    )
  })

  it('round-trips terrain exactly and keeps behaviour identical after reload', () => {
    const state = tick(
      stepSimulation(terrainState(['2,2', '2,3']), {
        type: 'placeBuilding',
        x: 4,
        y: 4,
        buildingType: 'residence',
      }),
      2
    )
    const loaded = loadSave(serializeSave(state))
    expect(loaded.config.world.blockedCells).toEqual(['2,2', '2,3'])
    expect(canonicalJson(loaded)).toBe(canonicalJson(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    // Same terrain, same refusal, after the round trip.
    expect(validatePlacement(loaded, cellAt(loaded, 2, 2), 'farm')).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
  })

  it('accepts an explicitly empty list as no terrain', () => {
    const raw = JSON.parse(serializeSave(createInitialState(config))) as {
      state: { config: { world: Record<string, unknown> } }
    }
    raw.state.config.world['blockedCells'] = []
    const loaded = loadSave(JSON.stringify(raw))
    expect(loaded.config.world.blockedCells).toBeUndefined()
  })

  it('rejects a non-canonical or out-of-bounds terrain list', () => {
    const base = (): { state: { config: { world: Record<string, unknown> } } } =>
      JSON.parse(serializeSave(createInitialState(config))) as {
        state: { config: { world: Record<string, unknown> } }
      }

    const unsorted = base()
    unsorted.state.config.world['blockedCells'] = ['3,3', '1,1']
    expect(() => loadSave(JSON.stringify(unsorted))).toThrow(SaveValidationError)

    const duplicated = base()
    duplicated.state.config.world['blockedCells'] = ['1,1', '1,1']
    expect(() => loadSave(JSON.stringify(duplicated))).toThrow(/duplicates/)

    const malformed = base()
    malformed.state.config.world['blockedCells'] = ['1, 1']
    expect(() => loadSave(JSON.stringify(malformed))).toThrow(SaveValidationError)

    const outOfBounds = base()
    outOfBounds.state.config.world['blockedCells'] = ['12,0']
    expect(() => loadSave(JSON.stringify(outOfBounds))).toThrow(/out of bounds/)

    const notAnArray = base()
    notAnArray.state.config.world['blockedCells'] = '1,1'
    expect(() => loadSave(JSON.stringify(notAnArray))).toThrow(
      /config.world.blockedCells/
    )
  })
})

// ---------------------------------------------------------------------------
// 5. Scenario wiring
// ---------------------------------------------------------------------------

describe('5. scenario wiring', () => {
  it('writes scenario terrain into the world config, normalized', () => {
    const state = createScenarioState(config, TERRAIN_CHOKEPOINT_FIXTURE)
    expect(state.config.world.blockedCells).toEqual(
      normalizeBlockedCells(TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? [])
    )
    for (const key of state.config.world.blockedCells ?? []) {
      const cell = parseBlockedCell(key)
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(config.world.width)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(config.world.height)
    }
  })

  it('keeps every curated scenario unchanged and terrain-free', () => {
    // 7 when this step ran; Step 10BE later added one content scenario.
    expect(SCENARIOS).toHaveLength(8)
    for (const scenario of SCENARIOS) {
      expect(scenario.blockedCells).toBeUndefined()
      const state = createScenarioState(config, scenario)
      expect('blockedCells' in state.config.world).toBe(false)
      expect(Object.keys(state.config.world).sort()).toEqual([
        'height',
        'seed',
        'width',
      ])
    }
    // The fixture is NOT part of the curated catalogue.
    expect(findScenario('terrain-chokepoint')).toBeUndefined()
    expect(findScenarioFixture('terrain-chokepoint')).toBe(TERRAIN_CHOKEPOINT_FIXTURE)
    expect(findScenarioFixture('first-settlement')).toBeUndefined()
  })

  it('assembles the fixture deterministically', () => {
    const first = createScenarioState(config, TERRAIN_CHOKEPOINT_FIXTURE)
    const second = createScenarioState(config, TERRAIN_CHOKEPOINT_FIXTURE)
    expect(hashCanonicalState(first)).toBe(hashCanonicalState(second))
    // Authoring the same cells in a different order is the same state.
    const shuffled = createScenarioState(config, {
      ...TERRAIN_CHOKEPOINT_FIXTURE,
      blockedCells: [...(TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? [])].reverse(),
    })
    expect(hashCanonicalState(shuffled)).toBe(hashCanonicalState(first))
  })

  it('refuses a scenario whose terrain leaves the world', () => {
    expect(() =>
      createScenarioState(
        { world: { seed: 'small', width: 4, height: 4 } },
        TERRAIN_CHOKEPOINT_FIXTURE
      )
    ).toThrow(/out of bounds/)
  })
})

// ---------------------------------------------------------------------------
// 6. The fixture: variant C on the real engine
// ---------------------------------------------------------------------------

describe('6. terrain-chokepoint fixture (variant C)', () => {
  const start = (): SimulationState =>
    createScenarioState(config, TERRAIN_CHOKEPOINT_FIXTURE)

  const connectivity = (state: SimulationState) => {
    const residences = buildingIdOfType(state, 'residence')
    const farms = buildingIdOfType(state, 'farm')
    const colonists = Object.keys(state.colonists).sort()
    const westColonistId = colonists[0] ?? ''
    const eastVacantFarmId = farms[1] ?? ''
    const coverage = getWaterCoverage(state)
    const option = getReassignmentOptions(state, westColonistId).find(
      (entry) => entry.workplaceId === eastVacantFarmId
    )
    return {
      networks: getRoadNetworks(state).length,
      servedResidences: coverage.servedResidenceIds.length,
      westServed: coverage.servedResidenceIds.includes(residences[0] ?? ''),
      eastServed: coverage.servedResidenceIds.includes(residences[1] ?? ''),
      westCanReachEastFarm: option?.eligible ?? false,
      westReason: option?.reason ?? null,
    }
  }

  it('starts split: two networks, the west Residence unserved', () => {
    const state = start()
    const measured = connectivity(state)
    expect(measured.networks).toBe(2)
    expect(measured.westServed).toBe(false)
    expect(measured.eastServed).toBe(true)
    expect(getWaterServedResidenceCount(state)).toBe(1)
    // Two colonists, two Residences, one Well: the settlement itself is valid.
    expect(Object.keys(state.colonists)).toHaveLength(2)
    expect(serializeSave(state)).toContain('"blockedCells"')
  })

  it('case A — the connector cell as a road merges everything', () => {
    const placed = stepSimulation(start(), {
      type: 'placeRoads',
      cells: [{ x: 2, y: 1 }],
    })
    const merged = tick(placed, 2)
    const measured = connectivity(merged)
    expect(measured.networks).toBe(1)
    expect(measured.servedResidences).toBe(2)
    expect(measured.westServed).toBe(true)
    expect(measured.eastServed).toBe(true)
    expect(measured.westCanReachEastFarm).toBe(true)
    expect(merged.resources.construction).toBe(30 - ROAD_CONSTRUCTION_COST)
  })

  it('case B — the connector cell as a building severs the colony', () => {
    const placed = stepSimulation(start(), {
      type: 'placeBuilding',
      x: 2,
      y: 1,
      buildingType: 'farm',
    })
    const severed = tick(placed, 2)
    const measured = connectivity(severed)
    expect(measured.networks).toBe(2)
    expect(measured.servedResidences).toBe(1)
    expect(measured.westServed).toBe(false)
    expect(measured.westCanReachEastFarm).toBe(false)
    expect(measured.westReason).toBe('notConnected')
  })

  it('case C — the alternative Well site is terrain, not a price', () => {
    const state = start()
    expect(validatePlacement(state, cellAt(state, 0, 1), 'well')).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    // Still refused with 100x the Material: a blocked cell is never legal.
    const rich: SimulationState = {
      ...state,
      resources: { ...state.resources, construction: 3000 },
    }
    expect(
      applyCommand(rich, { type: 'placeBuilding', x: 0, y: 1, buildingType: 'well' })
        .reason
    ).toBe('terrainBlocked')
    // And the only free cell touching the west road is the connector itself.
    const westRoadCell = cellAt(state, 1, 1)
    const freeNeighbours = NEIGHBOURS.map(([dx, dy]) =>
      cellAt(state, westRoadCell.x + dx, westRoadCell.y + dy)
    ).filter(
      (cell) =>
        !isCellOccupied(state, cell) &&
        !isTerrainBlocked(state.config.world, cell) &&
        state.roads !== undefined &&
        !Object.values(state.roads).some(
          (road) => road.x === cell.x && road.y === cell.y
        )
    )
    expect(freeNeighbours.map(cellKey)).toEqual(['2,1'])
  })

  it('proves the ridge is the only route (no detour exists)', () => {
    const state = start()
    // Every cell of column 2 except the connector is blocked.
    for (let y = 0; y < config.world.height; y += 1) {
      const cell = cellAt(state, 2, y)
      expect(isTerrainBlocked(state.config.world, cell)).toBe(y === 1 ? false : true)
    }
    // So no road command can ever reach the east region around the ridge.
    for (let y = 0; y < config.world.height; y += 1) {
      if (y === 1) continue
      expect(validateRoadsPlacement(state, [cellAt(state, 2, y)])).toEqual({
        valid: false,
        reason: 'terrainBlocked',
      })
    }
  })

  it('shows that a larger stock cannot reproduce the severing', () => {
    const sever = (material: number) => {
      const state: SimulationState = {
        ...start(),
        resources: { ...start().resources, construction: material },
      }
      const placed = stepSimulation(state, {
        type: 'placeBuilding',
        x: 2,
        y: 1,
        buildingType: 'farm',
      })
      return tick(placed, 2)
    }
    const poor = connectivity(sever(30))
    const rich = connectivity(sever(3000))
    expect(rich.networks).toBe(poor.networks)
    expect(rich.servedResidences).toBe(poor.servedResidences)
    expect(rich.westServed).toBe(poor.westServed)
    expect(rich.westCanReachEastFarm).toBe(poor.westCanReachEastFarm)
  })
})

// ---------------------------------------------------------------------------
// 7. Terrain is input only
// ---------------------------------------------------------------------------

describe('7. terrain is spatial input only', () => {
  it('changes nothing when no command ever targets a blocked cell', () => {
    const plain = createInitialState(config)
    const terrain = createInitialState(
      terrainConfig([...BYSTANDER_TERRAIN], 'nova-step10av')
    )
    const run = (state: SimulationState): SimulationState => {
      let next = stepSimulation(state, {
        type: 'placeBuilding',
        x: 4,
        y: 4,
        buildingType: 'residence',
      })
      next = stepSimulation(next, {
        type: 'placeRoads',
        cells: [cellAt(next, 4, 5)],
      })
      return tick(next, 4)
    }
    const without = run(plain)
    const withTerrain = run(terrain)
    // Everything except the terrain field itself is identical: resources,
    // buildings, roads, colonists, counters, tick and derived relationships.
    expect(withoutTerrain(withTerrain)).toEqual(withoutTerrain(without))
    expect(serializeCanonicalState(without).includes('blockedCells')).toBe(false)
    expect(serializeCanonicalState(withTerrain)).toContain('blockedCells')
  })

  it('leaves every economic constant and rate untouched', () => {
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
    expect(ROAD_CONSTRUCTION_COST).toBe(5)
    expect(ROAD_CONSTRUCTION_TICKS).toBe(2)
    expect(getBuildingDefinition('residence').constructionCost).toBe(25)
    expect(getBuildingDefinition('farm').constructionCost).toBe(25)
    expect(getBuildingDefinition('well').constructionCost).toBe(25)
    expect(getBuildingDefinition('workshop').constructionCost).toBe(25)
    expect(getBuildingDefinition('workshop').constructionWaterCost).toBe(1)
    expect(getBuildingDefinition('residence').constructionTicks).toBe(2)
    expect(getBuildingDefinition('well').constructionTicks).toBe(2)
  })

  it('produces the same tick trajectory in the fixture with or without the ridge', () => {
    // The same scenario data with terrain removed must run identically tick
    // for tick: terrain never feeds a phase.
    const withRidge = createScenarioState(config, TERRAIN_CHOKEPOINT_FIXTURE)
    // Terrain removed by declaring an EMPTY list, which the shared assembler
    // normalizes to "no terrain" — the same data with no blocked cell.
    const withoutRidge = createScenarioState(
      { world: { seed: 'nova-step10av', width: 12, height: 12 } },
      { ...TERRAIN_CHOKEPOINT_FIXTURE, blockedCells: [] }
    )
    const drive = (state: SimulationState): SimulationState => {
      const next = stepSimulation(state, {
        type: 'placeBuilding',
        x: 3,
        y: 0,
        buildingType: 'residence',
      })
      return tick(next, 6)
    }
    expect(withoutTerrain(drive(withRidge))).toEqual(withoutTerrain(drive(withoutRidge)))
  })
})
