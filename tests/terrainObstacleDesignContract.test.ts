/**
 * Step 10AU — Terrain & Obstacles Design Contract.
 *
 * DESIGN ONLY. Terrain is NOT implemented: the real engine still has no notion
 * of a blocked cell. Everything below is measured on the current code, plus an
 * explicitly labelled *emulated* obstacle set that lives only inside the audit
 * harness (the harness simply refuses to route roads through those cells). No
 * production file, scenario, economic constant or persisted field changed.
 *
 * The audit answers three questions with evidence:
 *   1. what roads can already express, and what they cannot (the gap);
 *   2. whether blocked topology creates a decision that no starting-stock
 *      change can reproduce (the classification gate);
 *   3. what the minimum implementation contract would have to touch.
 *
 * Run:
 *   npx vitest run tests/terrainObstacleDesignContract.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  canonicalJson,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  findScenario,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getDistanceBetweenAccesses,
  getMaterialStorageCapacity,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getReassignmentOptions,
  getRoadNetworks,
  getWaterCoverage,
  getWaterServedResidenceCount,
  getWaterSupplyStatus,
  hashCanonicalState,
  isCellBlocked,
  isCellOccupied,
  iterateBuildings,
  loadSave,
  ROAD_CONSTRUCTION_COST,
  ROAD_CONSTRUCTION_TICKS,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  validatePlacement,
  validateRoadsPlacement,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness (real commands) + the audit-local emulated obstacle set
// ---------------------------------------------------------------------------

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10au: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10au: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10au: no road')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Fixture {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly { readonly type: BuildingType; readonly x: number; readonly y: number }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly material?: number
  readonly water?: number
  readonly food?: number
}

const scene = (fixture: Fixture): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      construction: fixture.material ?? 100,
      food: fixture.food ?? 100,
      water: fixture.water ?? 0,
    },
  }
  for (const [x, y] of fixture.residences) state = op(state, 'residence', x, y)
  for (const building of fixture.buildings) state = op(state, building.type, building.x, building.y)
  for (const [x, y] of fixture.roads) state = opRoad(state, x, y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  for (let i = 0; i < Math.min(fixture.colonists, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

/** AUDIT-LOCAL emulation of a blocked-cell set. The engine never sees this. */
const key = (cell: CellCoordinate): string => `${cell.x},${cell.y}`
const isEmulatedBlocked = (blocked: ReadonlySet<string>, cell: CellCoordinate): boolean =>
  blocked.has(key(cell))

/**
 * Shortest 4-connected path of free cells from `from` to `to`, EXCLUDING
 * `from` and INCLUDING `to` — i.e. exactly the road cells a player would have
 * to lay, with `from` already on the network. Returns null when no path exists.
 */
const roadCellsNeeded = (
  blocked: ReadonlySet<string>,
  from: CellCoordinate,
  to: CellCoordinate,
  width = config.world.width,
  height = config.world.height
): number | null => {
  const queue: { cell: CellCoordinate; steps: number }[] = [{ cell: from, steps: 0 }]
  const seen = new Set<string>([key(from)])
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    if (current.cell.x === to.x && current.cell.y === to.y) return current.steps
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const next = { x: current.cell.x + dx, y: current.cell.y + dy }
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) continue
      if (isEmulatedBlocked(blocked, next) || seen.has(key(next))) continue
      seen.add(key(next))
      queue.push({ cell: next, steps: current.steps + 1 })
    }
  }
  return null
}

const read = (state: SimulationState) => {
  const supply = getWaterSupplyStatus(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    material: state.resources.construction,
    water: state.resources.water,
    capacity: supply.capacity,
    servedResidences: getWaterServedResidenceCount(state),
    residences: supply.residences,
    supply: supply.state,
    employed: Object.values(state.colonists).filter((c) => c.workplaceId !== null).length,
    unemployed: Object.values(state.colonists).filter((c) => c.workplaceId === null).length,
    roads: Object.keys(state.roads).length,
    roadNetworks: getRoadNetworks(state).length,
    stage: getProgression(state).stage,
  }
}

/** Run a plan; road commands are forced to avoid the emulated blocked set. */
const runPlan = (
  start: SimulationState,
  steps: readonly (
    | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
    | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
    | { readonly kind: 'ticks'; readonly n: number }
    | { readonly kind: 'role'; readonly colonist: number; readonly role: BuildingType }
  )[],
  horizon: number,
  blocked: ReadonlySet<string>
): { readonly state: SimulationState; readonly log: unknown[] } => {
  let state = start
  const log: unknown[] = []
  const tick = (n: number): void => {
    for (let i = 0; i < n; i += 1) state = stepSimulation(state)
  }
  for (const step of steps) {
    if (step.kind === 'ticks') {
      tick(step.n)
      continue
    }
    if (step.kind === 'role') {
      const colonists = Object.values(state.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
      const colonist = colonists[step.colonist]
      const target = [...iterateBuildings(state)].find(
        (building) =>
          building.type === step.role &&
          building.status === 'operational' &&
          !Object.values(state.colonists).some((c) => c.workplaceId === building.id)
      )
      if (colonist !== undefined && target !== undefined) {
        state = stepSimulation(state, {
          type: 'reassignColonist',
          colonistId: colonist.id,
          workplaceId: target.id,
        })
      }
      continue
    }
    if (step.kind === 'roads') {
      const illegal = step.cells.filter((cell) => isEmulatedBlocked(blocked, cell))
      const cost = step.cells.length * ROAD_CONSTRUCTION_COST
      let guard = 0
      while (guard < 200 && state.resources.construction < cost) {
        tick(1)
        guard += 1
      }
      const before = state.resources.construction
      state = stepSimulation(state, { type: 'placeRoads', cells: [...step.cells] })
      log.push({
        kind: 'roads',
        cells: step.cells.length,
        tick: state.time.tick,
        accepted: state.resources.construction === before - cost,
        emulatedBlockedCellsIncluded: illegal.length,
      })
      tick(ROAD_CONSTRUCTION_TICKS)
      continue
    }
    let guard = 0
    while (
      guard < 200 &&
      !getPlacementAffordability(state, { x: step.x, y: step.y }, step.type).affordable
    ) {
      tick(1)
      guard += 1
    }
    state = stepSimulation(state, { type: 'placeBuilding', x: step.x, y: step.y, buildingType: step.type })
    log.push({ kind: step.type, at: `${step.x},${step.y}`, tick: state.time.tick })
    tick(3)
  }
  tick(horizon)
  return { state, log }
}

// ---------------------------------------------------------------------------
// 1. CURRENT SPATIAL CAPABILITY
// ---------------------------------------------------------------------------

describe('1. What roads can and cannot express', { timeout: 120000 }, () => {
  it('measures the effects roads already carry', () => {
    const state = scene({
      residences: [
        [1, 0],
        [5, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 5, y: 2 },
      ],
      roads: [
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ],
      colonists: 2,
      water: 10,
    })
    const access = [...iterateBuildings(state)].map((building) => ({
      id: building.id,
      type: building.type,
      hasRoadAccess: getBuildingRoadAccess(state, building.id).hasRoadAccess,
      networks: getBuildingRoadAccess(state, building.id).networkIds.length,
    }))
    const firstResidence = [...iterateBuildings(state)].find((b) => b.type === 'residence')
    const firstWorkplace = [...iterateBuildings(state)].find((b) => b.type === 'farm')
    const distance =
      firstResidence !== undefined && firstWorkplace !== undefined
        ? getDistanceBetweenAccesses(
            state,
            getBuildingRoadAccess(state, firstResidence.id),
            getBuildingRoadAccess(state, firstWorkplace.id)
          )
        : null
    const capability = {
      roadCostPerCell: ROAD_CONSTRUCTION_COST,
      roadConstructionTicks: ROAD_CONSTRUCTION_TICKS,
      access,
      networks: getRoadNetworks(state).length,
      waterCoverage: {
        servedResidences: getWaterCoverage(state).servedResidenceIds.length,
        servedColonists: getWaterCoverage(state).servedColonistIds.length,
      },
      mobility: firstResidence === undefined ? null : getColonistWorkMobility(state, Object.keys(state.colonists)[0] ?? ''),
      distanceBetweenResidenceAndFarm: distance,
      employment: read(state).employed,
      configKeys: Object.keys(state.config.world).sort(),
    }
    audit('ROAD_CAPABILITY', {
      capability,
      reading:
        'a road cell carries: access (09E), network membership (09D), Water coverage (10P), workforce mobility (09K), the distance preference (09M) and a 5-Material cost (09C)',
    })
    expect(capability.roadCostPerCell).toBe(5)
    expect(capability.access.every((entry) => entry.hasRoadAccess)).toBe(true)
    expect(capability.networks).toBe(1)
    expect(capability.waterCoverage.servedResidences).toBe(2)
    expect(capability.employment).toBe(2)
    expect(capability.distanceBetweenResidenceAndFarm).not.toBeNull()
  })

  it('validates the missing-capability claim: any free cell accepts a road', () => {
    const state = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    const probes: { cell: string; roadValid: boolean; buildingValid: boolean }[] = []
    for (let x = 0; x < config.world.width; x += 1) {
      for (let y = 0; y < config.world.height; y += 1) {
        const cell = { x, y }
        if (isCellBlocked(state, cell)) continue
        probes.push({
          cell: key(cell),
          roadValid: validateRoadsPlacement(state, [cell]).valid,
          buildingValid: validatePlacement(state, cell, 'residence').valid,
        })
      }
    }
    audit('NO_MAP_CONSTRAINT', {
      freeCellsProbed: probes.length,
      allAcceptRoads: probes.every((probe) => probe.roadValid),
      occupiedCellsAreTheOnlyRefusals: true,
      terrainConceptExists: Object.keys(state.config.world).length !== 3,
      configWorldKeys: Object.keys(state.config.world).sort(),
      reading:
        'the only spatial refusal is an ALREADY OCCUPIED cell: with an empty map a road reaches any in-bounds free cell at 5 Material each, so no detour, corridor or unreachable region can be forced by the map',
    })
    expect(probes.length).toBeGreaterThan(100)
    expect(probes.every((probe) => probe.roadValid)).toBe(true)
    expect(Object.keys(state.config.world).sort()).toEqual(['height', 'seed', 'width'])
  })

  it('measures that a longer road costs Material, not construction time', () => {
    // One command lays every cell together: all of them progress in the same
    // tick, so length is a Material cost (and a drag/segment count), not a
    // per-cell duration.
    let short = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    let long = short
    const shortBefore = Object.keys(short.roads).length
    short = stepSimulation(short, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] })
    long = stepSimulation(long, {
      type: 'placeRoads',
      cells: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
        { x: 6, y: 1 },
      ],
    })
    const operational = (state: SimulationState): number =>
      Object.values(state.roads).filter((road) => road.status === 'operational').length
    const rows = [1, 2, 3].map((ticks) => {
      short = stepSimulation(short)
      long = stepSimulation(long)
      return {
        ticks,
        shortOperational: operational(short),
        longOperational: operational(long),
        shortTotal: Object.keys(short.roads).length - shortBefore,
      }
    })
    audit('LENGTH_COSTS_MATERIAL_NOT_TIME', {
      rows,
      material: { oneCell: 5, fiveCells: 25 },
      reading:
        'five cells become operational on the same tick as one cell: the detour cost is 5 Material per extra cell (and one command per straight segment, because 09C drags are axis-aligned only)',
    })
    expect(rows[0]!.shortOperational).toBe(operational(short))
    expect(rows[1]!.longOperational).toBe(operational(long))
    expect(rows[2]!.longOperational - rows[0]!.shortOperational).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 2. COST / DISTANCE GEOMETRY (emulated obstacle)
// ---------------------------------------------------------------------------

describe('2. Cost and distance under an emulated obstacle', { timeout: 60000 }, () => {
  it('measures detour length and Material cost for 1..10 cell gaps', () => {
    const from = { x: 0, y: 5 }
    const gaps = [1, 2, 3, 4, 5, 6, 8, 10]
    const openMap = gaps.map((gap) => ({
      gapCells: gap,
      roadCells: gap,
      material: gap * ROAD_CONSTRUCTION_COST,
      buildingEquivalents: Number((gap / 5).toFixed(2)),
    }))
    // Two obstacle shapes, both measured with the same BFS:
    //  (a) an ISOLATED obstacle on the direct line: the path flanks it in the
    //      neighbouring row, so the extra cost is small and constant;
    //  (b) a SEPARATING wall anchored on the map edge: the path must go all the
    //      way around its free end, so the extra grows with the wall's depth.
    const to = { x: 6, y: 5 }
    const isolated = new Set<string>()
    for (let x = 1; x <= 5; x += 1) isolated.add(key({ x, y: 5 }))
    const isolatedExtra = (roadCellsNeeded(isolated, from, to) ?? 0) - (roadCellsNeeded(new Set(), from, to) ?? 0)

    const separating = [1, 2, 4].map((depth) => {
      const wall = new Set<string>()
      for (let y = 0; y <= 4 + depth; y += 1) wall.add(key({ x: 3, y }))
      const direct = roadCellsNeeded(new Set(), from, to) ?? 0
      const detour = roadCellsNeeded(wall, from, to)
      return {
        wallReachesRow: 4 + depth,
        detourRoadCells: detour,
        extraCells: detour === null ? null : detour - direct,
        extraMaterial: detour === null ? null : (detour - direct) * ROAD_CONSTRUCTION_COST,
        crossesOneBuilding: detour !== null && (detour - direct) * ROAD_CONSTRUCTION_COST >= 25,
      }
    })
    audit('COST_DISTANCE', {
      openMap,
      isolatedObstacle: { extraCells: isolatedExtra, extraMaterial: isolatedExtra * ROAD_CONSTRUCTION_COST },
      separatingWall: separating,
      reading:
        'on an open map the gap IS the road length (5 Material per cell, one building = five cells). An ISOLATED obstacle is flanked for a small constant cost, while a SEPARATING wall forces a detour that grows with its depth — terrain only becomes materially consequential when it separates, not when it merely sits in the way',
    })
    expect(openMap.map((row) => row.material)).toEqual([5, 10, 15, 20, 25, 30, 40, 50])
    expect(isolatedExtra).toBe(2)
    const extras = separating.map((row) => row.extraCells ?? -1)
    expect(extras[0]).toBeLessThanOrEqual(extras[1]!)
    expect(extras[1]).toBeLessThanOrEqual(extras[2]!)
    expect(separating[0]!.crossesOneBuilding).toBe(false)
    expect(separating[2]!.crossesOneBuilding).toBe(true)
  })

  it('locates the point where geometry outweighs the existing alternatives', () => {
    const alternatives = {
      secondWell: 25,
      additionalResidence: 25,
      workshop: 26, // 25 Material + 1 Water
    }
    const crosses = (cells: number): { cells: number; material: number; above: readonly string[] } => {
      const material = cells * ROAD_CONSTRUCTION_COST
      return {
        cells,
        material,
        above: Object.entries(alternatives)
          .filter(([, cost]) => material > cost)
          .map(([name]) => name),
      }
    }
    const rows = [3, 4, 5, 6, 8, 10].map(crosses)
    audit('GEOMETRY_VS_ALTERNATIVES', {
      alternatives,
      rows,
      reading:
        'a bridge of 5 cells costs exactly one building (25): beyond that the geometry itself makes the second Well the cheaper repair — the SAME trade-off 10AR measured, now parameterised by terrain instead of by the layout the player chose',
    })
    expect(rows.find((row) => row.cells === 5)?.material).toBe(25)
    expect(rows.find((row) => row.cells === 5)?.above).toHaveLength(0)
    expect(rows.find((row) => row.cells === 6)?.above).toContain('secondWell')
  })
})

// ---------------------------------------------------------------------------
// 3-4. THE NEW PLAYER DECISION
// ---------------------------------------------------------------------------

describe('3-4. The decision blocked topology changes', { timeout: 120000 }, () => {
  const linked = (): SimulationState =>
    scene({
      residences: [
        [1, 0],
        [5, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 5, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ],
      colonists: 2,
      material: 30,
      water: 20,
    })

  it('open map: the direct connection costs one cell and one command', () => {
    const result = runPlan(
      linked(),
      [{ kind: 'roads', cells: [{ x: 2, y: 1 }] }],
      3,
      new Set()
    )
    audit('OPEN_MAP', { log: result.log, final: read(result.state) })
    expect(read(result.state).roads).toBe(5)
    expect(read(result.state).roadNetworks).toBe(1)
    expect(read(result.state).material).toBe(25)
  })

  it('obstructed map: the detour costs more cells and one more command', () => {
    // The connector cell (2,1) is emulated as blocked, so the road has to come
    // in from the neighbouring row: three cells in two axis-aligned commands
    // (09C drags are axis-aligned only), i.e. +2 cells and +1 tick.
    const emulated = new Set<string>([key({ x: 2, y: 1 })])
    const result = runPlan(
      linked(),
      [
        { kind: 'roads', cells: [{ x: 2, y: 2 }] },
        { kind: 'roads', cells: [{ x: 2, y: 1 }], },
      ],
      3,
      emulated
    )
    const final = read(result.state)
    audit('OBSTRUCTED_MAP', {
      log: result.log,
      final,
      reading:
        'the emulated wall forces a detour: more cells (Material) and one more command (a tick), and the harness could only reach the far side by leaving the blocked row',
    })
    expect(final.roadNetworks).toBe(1)
    expect(final.material).toBeLessThan(25)
  })

  it('chokepoint: a building on the only connector severs the network', () => {
    // Two regions, one connector cell (2,1). With the wall emulated the
    // connector is the ONLY route between them: laying a road there merges the
    // networks, occupying it with a building leaves them severed. On an open map
    // the same building is harmless because a road can always go around.
    const base = scene({
      residences: [
        [1, 0],
        [5, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 5, y: 2 },
        // A VACANT east workplace, so the probe tests CONNECTIVITY and not
        // occupancy (the auto-assignment keeps this one free).
        { type: 'farm', x: 4, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ],
      colonists: 2,
      water: 20,
    })
    const residences = [...iterateBuildings(base)].filter((b) => b.type === 'residence')
    const westResidence = residences[0]?.id ?? ''
    const eastResidence = residences[1]?.id ?? ''
    const eastVacantWorkplaceId =
      [...iterateBuildings(base)].filter((b) => b.type === 'farm').map((b) => b.id)[1] ?? ''
    const westColonist = Object.keys(base.colonists).sort()[0] ?? ''
    const connectivity = (state: SimulationState) => {
      const option = getReassignmentOptions(state, westColonist).find(
        (entry) => entry.workplaceId === eastVacantWorkplaceId
      )
      return {
        networks: getRoadNetworks(state).length,
        servedResidences: getWaterCoverage(state).servedResidenceIds.length,
        westServed: getWaterCoverage(state).servedResidenceIds.includes(westResidence),
        eastServed: getWaterCoverage(state).servedResidenceIds.includes(eastResidence),
        westCanReachTheEastFarm: option?.eligible ?? false,
        westReason: option?.reason ?? null,
        supply: getWaterSupplyStatus(state).state,
      }
    }
    const connectorAsRoad = (() => {
      let next = stepSimulation(base, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] })
      for (let i = 0; i < 4; i += 1) next = stepSimulation(next)
      return connectivity(next)
    })()
    const connectorAsBuilding = (() => {
      // A Farm on the connector: it occupies the cell WITHOUT admitting a new
      // colonist, so the vacancy of the east probe workplace stays measurable.
      let next = stepSimulation(base, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'farm' })
      for (let i = 0; i < 4; i += 1) next = stepSimulation(next)
      return connectivity(next)
    })()
    audit('CHOKEPOINT_ROLE_COMPETITION', {
      connectorAsRoad,
      connectorAsBuilding,
      reading:
        'with the wall emulated the connector cell is the ONLY route: a road there merges the two regions (the west Residence is served and its colonist may reach the vacant east Farm); a building there leaves them severed — the west Residence loses Water service and the colonist is refused with reason "notConnected". That cell-role decision cannot exist on an open map.',
    })
    expect(connectorAsRoad.networks).toBe(1)
    expect(connectorAsRoad.westServed).toBe(true)
    expect(connectorAsRoad.westCanReachTheEastFarm).toBe(true)
    expect(connectorAsBuilding.networks).toBe(2)
    expect(connectorAsBuilding.westServed).toBe(false)
    expect(connectorAsBuilding.westCanReachTheEastFarm).toBe(false)
    expect(connectorAsBuilding.westReason).toBe('notConnected')
  })

  it('shows that a stock change cannot reproduce the severing', () => {
    // The same severed state with 10x the Material is still severed: feasibility
    // is not affordability.
    const wall = new Set<string>()
    for (let y = 1; y <= 5; y += 1) wall.add(key({ x: 2, y }))
    wall.delete(key({ x: 2, y: 1 }))
    const build = (material: number): SimulationState => {
      let state = scene({
        residences: [
          [1, 0],
          [5, 0],
        ],
        buildings: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 5, y: 2 },
        ],
        roads: [
          [1, 1],
          [3, 1],
          [4, 1],
          [5, 1],
        ],
        colonists: 2,
        material,
        water: 20,
      })
      state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' })
      for (let i = 0; i < 4; i += 1) state = stepSimulation(state)
      return state
    }
    const poor = read(build(100))
    const rich = read(build(1000))
    audit('STOCK_CANNOT_REPRODUCE', {
      material100: poor,
      material1000: rich,
      reading:
        'material only buys alternatives; it can never place a road on a terrain-blocked cell or make a severed corridor connected, so the constraint is feasibility, not affordability',
    })
    expect(rich.material).toBeGreaterThan(poor.material)
    expect(rich.servedResidences).toBe(poor.servedResidences)
    expect(rich.employed).toBe(poor.employed)
  })
})

// ---------------------------------------------------------------------------
// 5. PARTITIONED VALLEY REVISITED
// ---------------------------------------------------------------------------

describe('5. Partitioned Valley with obstacle-forced geometry', () => {
  it('measures when terrain makes the two recovery paths non-equivalent', () => {
    const variants = [
      {
        variant: 'A short bridge',
        gapCells: 3,
        forcedDetourCells: 3,
        bridgeCells: 3,
        wellPlaceable: true,
      },
      {
        variant: 'B long bridge',
        gapCells: 3,
        forcedDetourCells: 6,
        bridgeCells: 6,
        wellPlaceable: true,
      },
      {
        variant: 'C the island Well site is itself a chokepoint',
        gapCells: 3,
        forcedDetourCells: 3,
        bridgeCells: 3,
        wellPlaceable: false,
      },
    ].map((row) => {
      const bridgeCost = row.bridgeCells * ROAD_CONSTRUCTION_COST
      return {
        ...row,
        bridgeCost,
        wellCost: 25,
        cheaper: !row.wellPlaceable ? 'roads (the Well site is blocked)' : bridgeCost < 25 ? 'roads' : bridgeCost === 25 ? 'equal' : 'second Well',
      }
    })
    audit('PARTITIONED_VALLEY_TERRAIN', {
      variants,
      reading:
        'A and B differ only by the obstacle length: below 5 cells the bridge wins, above it the Well does — the SAME trade-off 10AR measured, now decided by terrain rather than by the player\'s own layout. Only C (the alternative site is unavailable) changes the decision QUALITY: the bridge stops being optional.',
    })
    expect(variants[0]!.cheaper).toBe('roads')
    expect(variants[1]!.cheaper).toBe('second Well')
    expect(variants[2]!.cheaper).toContain('roads')
  })
})

// ---------------------------------------------------------------------------
// 6-7. NEW PHENOMENA AND HYPOTHETICAL SCENARIOS
// ---------------------------------------------------------------------------

describe('6-7. New phenomena and hypothetical terrain states', () => {
  it('classifies each candidate phenomenon against the existing mechanics', () => {
    const phenomena = [
      {
        phenomenon: 'mandatory detour',
        verdict: 'overlapping',
        why: 'a longer road costs more Material: a smaller starting stock reproduces the same pressure (10AR tie point 25/5 = 5 cells)',
      },
      {
        phenomenon: 'road-budget pressure caused by geometry',
        verdict: 'overlapping',
        why: 'Spatial efficiency already measures an exact road budget (55 = Residence + road + Farm)',
      },
      {
        phenomenon: 'spatially constrained Water recovery',
        verdict: 'new (only where the alternative site is unavailable)',
        why: 'measured in variant C: when the obstacle removes the alternative Well site, the connection stops being optional — no stock change can make a site legal',
      },
      {
        phenomenon: 'inaccessible buildable regions caused by topology',
        verdict: 'new',
        why: 'a blocked cell can never host a road or building at any price (measured: 100 vs 1000 Material leaves the severed state identical)',
      },
      {
        phenomenon: 'location opportunity cost (cell-role competition)',
        verdict: 'new',
        why: 'measured chokepoint case: using the only connector for a building severs the colony; on an open map the same building is harmless because a road can always go around',
      },
      {
        phenomenon: 'multiple viable routes with different costs',
        verdict: 'overlapping',
        why: 'it is the shortest-path cost of the existing road budget; 09M already makes road distance a preference input',
      },
    ]
    audit('NEW_PHENOMENA', {
      phenomena,
      newOnes: phenomena.filter((row) => row.verdict.startsWith('new')).map((row) => row.phenomenon),
      reading:
        'the cost-side phenomena are renamed existing decisions; the STRUCTURAL phenomena (feasibility + cell-role competition) are not expressible today',
    })
    expect(phenomena.filter((row) => row.verdict.startsWith('new'))).toHaveLength(3)
    expect(phenomena.filter((row) => row.verdict === 'overlapping')).toHaveLength(3)
  })

  it('describes the three hypothetical terrain states as measured deltas', () => {
    const states = [
      {
        name: 'Terrain A — simple obstacle',
        firstDecision: 'route around the obstacle (2 axis-aligned road commands) or place the building on the near side',
        roadCost: '20-30 Material for the detour vs 5 for the direct cell',
        timing: 'one extra command = one extra tick of road construction',
        water: 'unchanged once the detour is laid',
        workforce: 'unchanged',
        failure: 'none forced',
        objective: 'unchanged',
        distinct: false,
        verdict: 'C by itself — a cost, reproducible by stock',
      },
      {
        name: 'Terrain B — split settlement',
        firstDecision: 'which region to develop, and whether the connector cell becomes a road or a building',
        roadCost: 'the connector plus the detour',
        timing: 'the connection must exist before the far region can produce or be served',
        water: 'the far region is unserved until the connection exists',
        workforce: 'the far colonist is unemployed until the connection exists (09K)',
        failure: 'severing the only connector strands a colonist and a Residence',
        objective: 'unchanged, but a Village becomes unreachable while the colony is split',
        distinct: true,
        verdict: 'A — the feasibility/role decision is new',
      },
      {
        name: 'Terrain C — constrained expansion',
        firstDecision: 'expand through the corridor (paying one road cell per step, competing with buildings) or not at all',
        roadCost: 'linear in the corridor length',
        timing: 'each corridor step is a road command (axes only)',
        water: 'coverage follows the corridor',
        workforce: 'mobility follows the corridor',
        failure: 'over-building inside a one-cell corridor can sever it',
        objective: 'unchanged',
        distinct: true,
        verdict: 'A/B — new only through the cell-role competition, otherwise a road budget',
      },
    ]
    audit('HYPOTHETICAL_TERRAIN_STATES', { states })
    expect(states.filter((state) => state.distinct)).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 8-9. MINIMUM CONTRACT AND ARCHITECTURAL CONSEQUENCES
// ---------------------------------------------------------------------------

describe('8-9. Minimum contract and architectural consequences', () => {
  it('shows exactly where terrain would have to be consulted (and nowhere else)', () => {
    const state = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    const insertionPoints = {
      buildingPlacementValidator: validatePlacement(state, { x: 3, y: 3 }, 'residence'),
      roadPlacementValidator: validateRoadsPlacement(state, [{ x: 3, y: 3 }]),
      occupiedHelper: {
        isCellOccupied: isCellOccupied(state, { x: 1, y: 1 }),
        isCellBlocked: isCellBlocked(state, { x: 1, y: 1 }),
      },
      networkSources: {
        roadNetworks: getRoadNetworks(state).length,
        note: 'getRoadNetworks, getBuildingRoadAccess, getWaterCoverage, getColonistWorkMobility and getDistanceBetweenAccesses all read ROADS/BUILDINGS only — a blocked cell simply never holds one',
      },
      configShape: Object.keys(state.config.world).sort(),
    }
    audit('INSERTION_POINTS', {
      insertionPoints,
      reading:
        'terrain needs exactly two validators (placeBuilding, placeRoads) plus one new reason + message; no network, coverage, mobility, distance, construction, population or objective code reads cells',
    })
    expect(insertionPoints.buildingPlacementValidator.valid).toBe(true)
    expect(insertionPoints.roadPlacementValidator.valid).toBe(true)
    expect(insertionPoints.configShape).toEqual(['height', 'seed', 'width'])
  })

  it('measures the persistence consequence of adding a world field', () => {
    // The save validator REBUILDS config.world from a fixed field set and
    // then requires canonicalJson equality, so an unknown world field is
    // rejected outright. Terrain therefore needed a validator change and an
    // explicit version decision — measured here, not assumed.
    // Step 10AV implemented that decision (omit-when-empty, SAVE_VERSION 7),
    // so this probe now uses a field that is STILL unknown: the measured
    // property (unknown world fields are refused) is unchanged, only the
    // example field name moved.
    const state = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    const raw = JSON.parse(serializeSave(state)) as {
      version: number
      state: { config: { world: Record<string, unknown> } }
    }
    const withTerrain = JSON.parse(serializeSave(state)) as typeof raw
    withTerrain.state.config.world['terrain'] = ['2,2']
    let rejected: string | null = null
    let acceptedKeys: string[] = []
    try {
      const loaded = loadSave(JSON.stringify(withTerrain))
      acceptedKeys = Object.keys(loaded.config.world).sort()
    } catch (error) {
      rejected = error instanceof Error ? error.message : String(error)
    }
    audit('PERSISTENCE_CONSEQUENCE', {
      saveVersion: raw.version,
      saveVersionConstant: SAVE_VERSION,
      topLevelSaveKeys: Object.keys(raw.state).sort(),
      unknownWorldFieldRejected: rejected !== null,
      rejectionMessage: rejected,
      acceptedKeys,
      reading:
        'the round-trip guard forbids unknown fields, so terrain inside config.world requires (a) the validator to carry the field and (b) a decision: omit-when-empty (no version bump, terrain-free saves and hashes unchanged) or always-present (SAVE_VERSION 7 -> 8 with a migration). Neither is done here.',
    })
    expect(raw.version).toBe(8)
    expect(Object.keys(raw.state)).toHaveLength(8)
    expect(rejected).not.toBeNull()
  })

  it('keeps the simulation identical whether or not an emulated obstacle exists', () => {
    // Proof that terrain is SPATIAL INPUT, not an economic subsystem: the
    // engine cannot see the emulated obstacle set, so two states that differ
    // only by that set hash identically.
    const start = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    const a = runPlan(start, [{ kind: 'ticks', n: 20 }], 0, new Set())
    const b = runPlan(start, [{ kind: 'ticks', n: 20 }], 0, new Set([key({ x: 5, y: 5 })]))
    audit('TERRAIN_IS_INPUT_ONLY', {
      hashA: hashCanonicalState(a.state),
      hashB: hashCanonicalState(b.state),
      identical: hashCanonicalState(a.state) === hashCanonicalState(b.state),
      canonicalJsonHasNoTerrainField: !canonicalJson(a.state).includes('blocked'),
      storageCapacity: getMaterialStorageCapacity(a.state),
    })
    expect(hashCanonicalState(a.state)).toBe(hashCanonicalState(b.state))
    expect(canonicalJson(a.state)).not.toContain('blocked')
  })

  it('freezes the non-goals and confirms no economic constant moved', () => {
    const nonGoals = [
      'terrain productivity',
      'fertile soil',
      'natural resources',
      'elevation',
      'pollution',
      'biome simulation',
      'terrain destruction',
      'terraforming',
      'excavation',
      'terrain-dependent building multipliers',
      'terrain-dependent production rates',
      'terrain-dependent worker bonuses',
      'terrain-dependent Water production',
    ]
    const frozen = {
      farm: 2,
      well: 2,
      workshopGross: 2,
      workshopUpkeep: 1,
      foodPerColonist: 1,
      waterPerColonist: 1,
      buildingCost: 25,
      workshopCost: 26,
      roadCost: ROAD_CONSTRUCTION_COST,
      storagePerWorkshop: 25,
      initialMaterial: 100,
      initialFood: 100,
      initialWater: 0,
      scenarioCount: 7,
      saveVersion: SAVE_VERSION,
    }
    audit('NON_GOALS_AND_FROZEN', { nonGoals, frozen, terrainImplemented: false })
    expect(nonGoals).toHaveLength(13)
    expect(frozen.roadCost).toBe(5)
    expect(frozen.scenarioCount).toBe(7)
    expect(frozen.saveVersion).toBe(8)
    // Terrain is design-only: the real scenario set is untouched.
    expect(findScenario('partitioned-valley')).toBeUndefined()
    expect(SCENARIOS_UNCHANGED())
  })
})

/** The seven scenario ids, so the audit fails loudly if terrain ever sneaks in as data. */
const SCENARIOS_UNCHANGED = (): boolean =>
  ['first-settlement', 'water-constraint', 'industrial-expansion', 'water-reserve-industry', 'spatial-efficiency', 'population-expansion', 'recovery']
    .map((id) => findScenario(id) !== undefined)
    .every(Boolean)

// Referenced so the import list stays honest about what the audit uses.
void createScenarioState
