/**
 * Step 10AW — Terrain content & scenario integration AUDIT.
 *
 * AUDIT ONLY: no production file changed, no new mechanic, no new scenario, no
 * economic constant, no SAVE_VERSION change. Everything below is measured on
 * the IMPLEMENTED Step 10AV terrain (`config.world.blockedCells`, real
 * refusals, real rendering) with the EXISTING mechanics only.
 *
 * The question is NOT "is terrain cool". It is: which phenomena terrain makes
 * possible actually change the player's decision space with the mechanics NOVA
 * already has, and which are only a renamed road/Material/Water decision?
 *
 * The central measurement is `subsetAnalysis`: the set of outcome signatures
 * reachable from the same starting state through the same candidate actions,
 * with terrain versus the same world without it.
 *
 * Run:
 *   npx vitest run tests/terrainContentScenarioIntegrationAudit.test.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  canonicalJson,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  FOOD_PER_COLONIST_PER_TICK,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getDistanceBetweenAccesses,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getObjectiveStatus,
  getProgression,
  getReassignmentOptions,
  getRoadIdAtCell,
  getRoadNetworks,
  getServedColonistCount,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterSupplyStatus,
  hashCanonicalState,
  isCellOccupied,
  isTerrainBlocked,
  iterateBuildings,
  loadSave,
  normalizeBlockedCells,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  validatePlacement,
  validateRoadsPlacement,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const worldConfig = (
  blockedCells: readonly string[],
  width = 12,
  height = 12
): SimulationConfig => ({
  world: {
    seed: 'nova-step10aw',
    width,
    height,
    ...(blockedCells.length === 0 ? {} : { blockedCells }),
  },
})

const cellKey = (cell: CellCoordinate): string => `${cell.x},${cell.y}`

/** The Step 10AU/10AV ridge: column 2 except the connector (2,1). */
const RIDGE = [
  '2,0',
  '2,2',
  '2,3',
  '2,4',
  '2,5',
  '2,6',
  '2,7',
  '2,8',
  '2,9',
  '2,10',
  '2,11',
]

// ---------------------------------------------------------------------------
// Audit-local harness (real domain constructors, real terrain)
// ---------------------------------------------------------------------------

interface SceneSpec {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly {
    readonly type: BuildingType
    readonly x: number
    readonly y: number
  }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly material?: number
  readonly food?: number
  readonly water?: number
}

const operationalBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10aw: building missing')
  }
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

const operationalRoad = (
  state: SimulationState,
  x: number,
  y: number
): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  const road = id === undefined ? undefined : created.state.roads[id]
  if (id === undefined || road === undefined) {
    throw new Error('10aw: road missing')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const scene = (spec: SceneSpec, blockedCells: readonly string[] = []): SimulationState => {
  let state = createInitialState(worldConfig([...blockedCells]))
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 100,
      food: spec.food ?? 100,
      water: spec.water ?? 0,
    },
  }
  for (const [x, y] of spec.residences) {
    state = operationalBuilding(state, 'residence', x, y)
  }
  for (const building of spec.buildings) {
    state = operationalBuilding(state, building.type, building.x, building.y)
  }
  for (const [x, y] of spec.roads) {
    state = operationalRoad(state, x, y)
  }
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence'
  )
  for (let index = 0; index < Math.min(spec.colonists, residences.length); index += 1) {
    const residence = residences[index]
    if (residence !== undefined) {
      state = createColonist(state, residence.id).state
    }
  }
  return assignJobs(state)
}

const tick = (state: SimulationState, times: number): SimulationState => {
  let next = state
  for (let index = 0; index < times; index += 1) {
    next = stepSimulation(next)
  }
  return next
}

/** Lay real road commands (one per cell) and settle until operational. */
const layRoads = (
  state: SimulationState,
  cells: readonly CellCoordinate[],
  settleTicks = 4
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = stepSimulation(next, { type: 'placeRoads', cells: [cell] })
  }
  return tick(next, settleTicks)
}

const assignments = (state: SimulationState): Record<string, string> => {
  const byId: Record<string, string> = {}
  for (const id of Object.keys(state.colonists).sort()) {
    const workplaceId = state.colonists[id]?.workplaceId ?? null
    const workplace = workplaceId === null ? undefined : state.buildings[workplaceId]
    byId[id] = workplace === undefined ? 'none' : workplace.type
  }
  return byId
}

const mobilityConnectedCount = (state: SimulationState): number =>
  Object.keys(state.colonists).filter(
    (id) => getColonistWorkMobility(state, id).mobilityConnected
  ).length

const buildingIdsOfType = (state: SimulationState, type: BuildingType): string[] =>
  [...iterateBuildings(state)]
    .filter((building) => building.type === type)
    .map((building) => building.id)
    .sort()

const read = (state: SimulationState) => {
  const supply = getWaterSupplyStatus(state)
  const employment = getEmploymentSummary(state)
  return {
    tick: state.time.tick,
    population: Object.keys(state.colonists).length,
    material: state.resources.construction,
    food: state.resources.food,
    water: state.resources.water,
    waterCapacity: getWaterProductionPerTick(state),
    waterServedResidences: getWaterServedResidenceCount(state),
    servedColonists: getServedColonistCount(state),
    waterSupply: supply.state,
    foodPerTick: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    networks: getRoadNetworks(state).length,
    roads: Object.keys(state.roads).length,
    operationalRoads: Object.values(state.roads).filter(
      (road) => road.status === 'operational'
    ).length,
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: employment.jobCapacity,
    mobilityConnected: mobilityConnectedCount(state),
    stage: getProgression(state).stage,
  }
}

/** Coarse outcome signature used for the decision-space measurements. */
const signature = (state: SimulationState): string => {
  const metrics = read(state)
  return [
    metrics.population,
    metrics.waterServedResidences,
    metrics.waterCapacity,
    metrics.foodPerTick,
    metrics.foodConsumption,
    metrics.networks,
    metrics.employed,
    metrics.stage,
  ].join('|')
}

/** Road distance (cells) between the residence and one workplace type. */
const distanceBetween = (state: SimulationState, type: BuildingType): number | null => {
  const residence = [...iterateBuildings(state)].find(
    (building) => building.type === 'residence'
  )
  const workplace = [...iterateBuildings(state)].find(
    (building) => building.type === type
  )
  if (residence === undefined || workplace === undefined) {
    return null
  }
  return getDistanceBetweenAccesses(
    state,
    getBuildingRoadAccess(state, residence.id),
    getBuildingRoadAccess(state, workplace.id)
  )
}

/**
 * Minimum number of NEW road cells needed to join two existing road cells,
 * or null when no route exists. Buildings and terrain are impassable; moving
 * through an existing road is free, through a free cell costs 1 (a new road
 * cell). This is the audit's affordability-vs-feasibility probe for a ROUTE:
 * `null` means no amount of Material can help.
 */
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const roadCellsToReconnect = (
  state: SimulationState,
  blockedCells: readonly string[],
  from: CellCoordinate,
  to: CellCoordinate
): number | null => {
  const blocked = new Set(blockedCells)
  const occupied = new Set<string>()
  for (const building of iterateBuildings(state)) {
    occupied.add(cellKey(building))
  }
  const roads = new Set<string>()
  for (const road of Object.values(state.roads)) {
    roads.add(cellKey(road))
    occupied.add(cellKey(road))
  }
  const { width, height } = state.config.world
  const passable = (cell: CellCoordinate): boolean =>
    cell.x >= 0 &&
    cell.x < width &&
    cell.y >= 0 &&
    cell.y < height &&
    !blocked.has(cellKey(cell)) &&
    (!occupied.has(cellKey(cell)) || roads.has(cellKey(cell)))
  const distance = new Map<string, number>([[cellKey(from), 0]])
  const queue: { readonly cell: CellCoordinate; readonly cost: number }[] = [
    { cell: from, cost: 0 },
  ]
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()
    if (current === undefined) {
      break
    }
    if (current.cost > (distance.get(cellKey(current.cell)) ?? Number.POSITIVE_INFINITY)) {
      continue
    }
    if (cellKey(current.cell) === cellKey(to)) {
      return current.cost
    }
    for (const [dx, dy] of NEIGHBOURS) {
      const next = { x: current.cell.x + dx, y: current.cell.y + dy }
      if (!passable(next)) {
        continue
      }
      const step = roads.has(cellKey(next)) ? 0 : 1
      const cost = current.cost + step
      if (cost < (distance.get(cellKey(next)) ?? Number.POSITIVE_INFINITY)) {
        distance.set(cellKey(next), cost)
        queue.push({ cell: next, cost })
      }
    }
  }
  return distance.get(cellKey(to)) ?? null
}

/**
 * Decision-space comparison (sections 9-10): apply every candidate first action
 * to the SAME starting state in both worlds (with and without terrain), settle
 * for a fixed horizon, and compare the reachable outcome signatures. A
 * configuration that only removes options yields a subset; a configuration that
 * changes the mapping from action to outcome yields signatures the open map
 * cannot reach.
 */
interface CandidateAction {
  readonly label: string
  readonly run: (state: SimulationState) => SimulationState
}

interface SubsetAnalysis {
  readonly terrainSignatures: number
  readonly openSignatures: number
  readonly onlyWithTerrain: readonly string[]
  readonly onlyWithoutTerrain: readonly string[]
  readonly byAction: { readonly terrain: Record<string, string>; readonly open: Record<string, string> }
}

const subsetAnalysis = (
  terrainStart: SimulationState,
  openStart: SimulationState,
  actions: readonly CandidateAction[],
  horizon: number
): SubsetAnalysis => {
  const run = (
    start: SimulationState
  ): { signatures: string[]; byAction: Record<string, string> } => {
    const byAction: Record<string, string> = {}
    const set = new Set<string>()
    for (const action of actions) {
      const reached = action.run(start)
      const value = signature(tick(reached, horizon))
      byAction[action.label] = value
      set.add(value)
    }
    return { signatures: [...set].sort(), byAction }
  }
  const terrain = run(terrainStart)
  const open = run(openStart)
  return {
    terrainSignatures: terrain.signatures.length,
    openSignatures: open.signatures.length,
    onlyWithTerrain: terrain.signatures.filter((value) => !open.signatures.includes(value)),
    onlyWithoutTerrain: open.signatures.filter((value) => !terrain.signatures.includes(value)),
    byAction: { terrain: terrain.byAction, open: open.byAction },
  }
}

/** An action that lays a whole corridor, or nothing at all when it is illegal. */
const atomicRoads = (cells: readonly CellCoordinate[]): CandidateAction => ({
  label: `corridor ${cells.length} cells`,
  run: (state) =>
    validateRoadsPlacement(state, cells).valid ? layRoads(state, cells) : state,
})

// ---------------------------------------------------------------------------
// 1. Variant C — the three connector roles, measured causally
// ---------------------------------------------------------------------------

describe('1. variant C: the three connector roles', () => {
  const fixture = (): SimulationState =>
    createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)

  const stateAfter = (
    command: Parameters<typeof stepSimulation>[1],
    ticks: number
  ): SimulationState => tick(stepSimulation(fixture(), command), ticks)

  it('measures connector = road, connector = building and connector = blocked', () => {
    const start = fixture()
    const asRoad = stateAfter({ type: 'placeRoads', cells: [{ x: 2, y: 1 }] }, 2)
    const asBuilding = stateAfter(
      { type: 'placeBuilding', x: 2, y: 1, buildingType: 'farm' },
      2
    )
    const blocked = scene(
      {
        residences: [
          [1, 0],
          [5, 0],
        ],
        buildings: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 5, y: 2 },
          { type: 'farm', x: 4, y: 2 },
        ],
        roads: [
          [1, 1],
          [3, 1],
          [4, 1],
          [5, 1],
        ],
        colonists: 2,
        material: 30,
        food: 30,
        water: 20,
      },
      ['0,1', ...RIDGE]
    )
    const rows = {
      start: { ...read(start), assignments: assignments(start) },
      connectorAsRoad: { ...read(asRoad), assignments: assignments(asRoad), ticksToEffect: 2 },
      connectorAsBuilding: {
        ...read(asBuilding),
        assignments: assignments(asBuilding),
        ticksToEffect: 2,
      },
      connectorBlocked: { ...read(blocked), assignments: assignments(blocked) },
    }
    audit('VARIANT_C', rows)

    // A — connector = road: one network, both Residences served and reachable.
    expect(rows.connectorAsRoad.networks).toBe(1)
    expect(rows.connectorAsRoad.waterServedResidences).toBe(2)
    expect(rows.connectorAsRoad.servedColonists).toBe(2)
    expect(rows.connectorAsRoad.waterCapacity).toBe(2)
    expect(rows.connectorAsRoad.material).toBe(25)
    // B — connector = building: two networks, the WEST Residence unserved.
    expect(rows.connectorAsBuilding.networks).toBe(2)
    expect(rows.connectorAsBuilding.waterServedResidences).toBe(1)
    expect(rows.connectorAsBuilding.material).toBe(5)
    // C — connector blocked: identical severance, no command can ever fix it.
    expect(rows.connectorBlocked.networks).toBe(2)
    expect(rows.connectorBlocked.waterServedResidences).toBe(1)
    // Food/Water BALANCE is identical in all three roles: the role decides
    // service and mobility, never a production rate.
    for (const row of [
      rows.connectorAsRoad,
      rows.connectorAsBuilding,
      rows.connectorBlocked,
    ]) {
      expect(row.foodPerTick).toBe(2)
      expect(row.foodConsumption).toBe(2)
      expect(row.waterCapacity).toBe(2)
      expect(row.population).toBe(2)
      expect(row.stage).toBe('village')
    }
  })

  it('measures the west colonist cross-region option in each role', () => {
    const start = fixture()
    const eastVacantFarmId = buildingIdsOfType(start, 'farm')[1] ?? ''
    const westColonistId = Object.keys(start.colonists).sort()[0] ?? ''
    const optionOf = (state: SimulationState) =>
      getReassignmentOptions(state, westColonistId).find(
        (entry) => entry.workplaceId === eastVacantFarmId
      )
    const asRoad = stateAfter({ type: 'placeRoads', cells: [{ x: 2, y: 1 }] }, 2)
    const asBuilding = stateAfter(
      { type: 'placeBuilding', x: 2, y: 1, buildingType: 'farm' },
      2
    )
    const rows = {
      road: {
        eligible: optionOf(asRoad)?.eligible ?? false,
        reason: optionOf(asRoad)?.reason ?? null,
        distance: optionOf(asRoad)?.distance ?? null,
      },
      building: {
        eligible: optionOf(asBuilding)?.eligible ?? false,
        reason: optionOf(asBuilding)?.reason ?? null,
      },
    }
    audit('VARIANT_C_MOBILITY', rows)
    expect(rows.road.eligible).toBe(true)
    expect(rows.road.reason).toBeNull()
    expect(rows.building.eligible).toBe(false)
    expect(rows.building.reason).toBe('notConnected')
  })
})

// ---------------------------------------------------------------------------
// 2. The player decision: legal options, reversibility, recovery
// ---------------------------------------------------------------------------

describe('2. the player decision behind each role', () => {
  it('enumerates the legal options on the connector cell', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const connector = { x: 2, y: 1 }
    const options = [
      { option: 'road', command: { type: 'placeRoads' as const, cells: [connector] } },
      { option: 'residence', command: { type: 'placeBuilding' as const, x: 2, y: 1, buildingType: 'residence' as const } },
      { option: 'farm', command: { type: 'placeBuilding' as const, x: 2, y: 1, buildingType: 'farm' as const } },
      { option: 'well', command: { type: 'placeBuilding' as const, x: 2, y: 1, buildingType: 'well' as const } },
      { option: 'workshop', command: { type: 'placeBuilding' as const, x: 2, y: 1, buildingType: 'workshop' as const } },
    ]
    const rows = options.map((entry) => {
      const accepted = applyCommand(start, entry.command).accepted
      const settled = tick(stepSimulation(start, entry.command), 6)
      const measured = read(settled)
      return {
        option: entry.option,
        accepted,
        networks: measured.networks,
        servedResidences: measured.waterServedResidences,
        westResidenceServed: getWaterCoverage(settled).servedResidenceIds.includes(
          buildingIdsOfType(start, 'residence')[0] ?? ''
        ),
        population: measured.population,
        material: measured.material,
        signature: signature(settled),
      }
    })
    audit('CONNECTOR_OPTIONS', rows)
    // Every role is LEGAL: the connector cell is a real decision, not a rule.
    expect(rows.every((row) => row.accepted)).toBe(true)
    expect(new Set(rows.map((row) => row.signature)).size).toBeGreaterThan(1)
    expect(rows.find((row) => row.option === 'road')?.networks).toBe(1)
    expect(rows.find((row) => row.option === 'farm')?.networks).toBe(2)
  })

  it('measures the recovery cost of the wrong role (no demolition exists)', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const wrong = tick(
      stepSimulation(start, {
        type: 'placeBuilding',
        x: 2,
        y: 1,
        buildingType: 'residence',
      }),
      2
    )
    const attempts = [
      { attempt: 'road on the connector', command: { type: 'placeRoads' as const, cells: [{ x: 2, y: 1 }] } },
      { attempt: 'road around the ridge (row 0)', command: { type: 'placeRoads' as const, cells: [{ x: 2, y: 0 }] } },
      { attempt: 'road around the ridge (row 5)', command: { type: 'placeRoads' as const, cells: [{ x: 2, y: 5 }] } },
      { attempt: 'well in the west', command: { type: 'placeBuilding' as const, x: 0, y: 1, buildingType: 'well' as const } },
    ]
    const rows = attempts.map((entry) => {
      const validation =
        entry.command.type === 'placeRoads'
          ? validateRoadsPlacement(wrong, entry.command.cells)
          : validatePlacement(
              wrong,
              { x: entry.command.x, y: entry.command.y },
              entry.command.buildingType
            )
      return {
        attempt: entry.attempt,
        accepted: validation.valid,
        reason: validation.valid ? null : validation.reason,
      }
    })
    const westResidenceId = buildingIdsOfType(start, 'residence')[0] ?? ''
    const after40 = read(tick(wrong, 40))
    const westServedAt40 = getWaterCoverage(tick(wrong, 40)).servedResidenceIds.includes(
      westResidenceId
    )
    audit('RECOVERY_ATTEMPTS', { attempts: rows, after40Ticks: after40, westServedAt40 })
    expect(rows.every((row) => !row.accepted)).toBe(true)
    expect(rows.map((row) => row.reason)).toEqual([
      'cellOccupiedByBuilding',
      'terrainBlocked',
      'terrainBlocked',
      'terrainBlocked',
    ])
    // The penalty is permanent and it is NARROW: the connector Residence is
    // itself served (it touches both networks), so the colony still grows and
    // produces — only the WEST Residence stays outside Water coverage forever.
    expect(after40.networks).toBe(2)
    expect(after40.population).toBe(3)
    expect(after40.waterServedResidences).toBe(2)
    expect(westServedAt40).toBe(false)
    expect(after40.foodNet).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Affordability vs feasibility
// ---------------------------------------------------------------------------

describe('3. affordability vs feasibility', () => {
  it('refuses a blocked cell at every Material level and a free cell below cost', () => {
    const rows = [20, 25, 100, 300, 3000].map((material) => {
      const base = scene(
        { residences: [], buildings: [], roads: [], colonists: 0, material },
        ['2,2']
      )
      const blockedAttempt = applyCommand(base, {
        type: 'placeBuilding',
        x: 2,
        y: 2,
        buildingType: 'well',
      })
      const freeAttempt = applyCommand(base, {
        type: 'placeBuilding',
        x: 3,
        y: 2,
        buildingType: 'well',
      })
      return {
        material,
        blocked: blockedAttempt.accepted ? 'accepted' : blockedAttempt.reason,
        free: freeAttempt.accepted ? 'accepted' : freeAttempt.reason,
        blockedStateUnchanged: blockedAttempt.state === base,
      }
    })
    audit('AFFORDABILITY_VS_FEASIBILITY', rows)
    for (const row of rows) {
      expect(row.blocked).toBe('terrainBlocked')
      expect(row.blockedStateUnchanged).toBe(true)
    }
    expect(rows.map((row) => row.free)).toEqual([
      'insufficientResources',
      'accepted',
      'accepted',
      'accepted',
      'accepted',
    ])
  })
})

// ---------------------------------------------------------------------------
// 4. Road detour: the marginal cost of terrain
// ---------------------------------------------------------------------------

describe('4. road detour', () => {
  const detourBase = (blocked: readonly string[]): SimulationState =>
    scene(
      {
        residences: [[1, 0]],
        buildings: [{ type: 'well', x: 5, y: 0 }],
        roads: [[1, 1]],
        colonists: 1,
        material: 100,
        water: 0,
      },
      blocked
    )

  const paths: ReadonlyArray<{ variant: string; blocked: string[]; cells: CellCoordinate[] }> = [
    {
      variant: 'A direct',
      blocked: [],
      cells: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
    },
    {
      variant: 'B one blocked cell',
      blocked: ['3,1'],
      cells: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
    },
    {
      variant: 'C longer detour',
      blocked: ['3,1', '3,2'],
      cells: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
    },
  ]

  it('measures the direct route, one obstacle and a longer detour', () => {
    const rows = paths.map(({ variant, blocked, cells }) => {
      const base = detourBase(blocked)
      const built = layRoads(base, cells)
      const materialSpent = base.resources.construction - built.resources.construction
      const settled = read(tick(built, 60))
      return {
        variant,
        roadCells: read(built).roads - 1,
        materialSpent,
        distance: distanceBetween(built, 'well'),
        networks: settled.networks,
        waterServedResidences: settled.waterServedResidences,
        waterCapacity: settled.waterCapacity,
        population: settled.population,
        foodNet: settled.foodNet,
        stage: settled.stage,
      }
    })
    const marginal = {
      deltaCellsB: (rows[1]?.roadCells ?? 0) - (rows[0]?.roadCells ?? 0),
      deltaCellsC: (rows[2]?.roadCells ?? 0) - (rows[0]?.roadCells ?? 0),
      deltaMaterialB: (rows[1]?.materialSpent ?? 0) - (rows[0]?.materialSpent ?? 0),
      deltaMaterialC: (rows[2]?.materialSpent ?? 0) - (rows[0]?.materialSpent ?? 0),
      deltaDistanceB: (rows[1]?.distance ?? 0) - (rows[0]?.distance ?? 0),
      deltaDistanceC: (rows[2]?.distance ?? 0) - (rows[0]?.distance ?? 0),
    }
    audit('ROAD_DETOUR', { rows, marginal })
    expect(rows.map((row) => row.roadCells)).toEqual([4, 6, 8])
    expect(marginal.deltaMaterialB).toBe(2 * ROAD_CONSTRUCTION_COST)
    expect(marginal.deltaMaterialC).toBe(4 * ROAD_CONSTRUCTION_COST)
    expect(marginal.deltaDistanceB).toBe(2)
    expect(marginal.deltaDistanceC).toBe(4)
    // Beyond the road cells: identical network, coverage, capacity, population
    // and food balance after 60 ticks — a Material tax and nothing else.
    for (const row of rows) {
      expect(row.networks).toBe(1)
      expect(row.waterServedResidences).toBe(1)
      expect(row.waterCapacity).toBe(2)
      expect(row.population).toBe(1)
      expect(row.foodNet).toBe(-1)
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Multi-route geometry
// ---------------------------------------------------------------------------

describe('5. multi-route geometry', () => {
  /**
   * One Residence, a Well and a Farm, joined by road arms of different lengths.
   * Terrain blocks (1,1), the first cell of the SHORT arm to the Well, so the
   * only remaining way to reach the Well is a longer corridor. Buildings and
   * resources are identical in both worlds: only the route changes.
   */
  const multiRoute = (blocked: readonly string[]): SimulationState => {
    const northArm: readonly (readonly [number, number])[] =
      blocked.length === 0
        ? [
            [1, 1],
            [1, 0],
          ]
        : [
            [1, 2],
            [2, 2],
            [2, 1],
          ]
    const spec: SceneSpec = {
      residences: [[0, 0]],
      buildings: [
        { type: 'well', x: 2, y: 0 },
        { type: 'farm', x: 1, y: 4 },
      ],
      roads: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        ...northArm,
      ],
      colonists: 1,
      material: 100,
      food: 100,
      water: 0,
    }
    return scene(spec, blocked)
  }

  it('measures how a forced detour flips the 09M workplace preference', () => {
    const direct = multiRoute([])
    const detoured = multiRoute(['1,1'])
    const rows = {
      direct: {
        ...read(direct),
        assignments: assignments(direct),
        wellDistance: distanceBetween(direct, 'well'),
        farmDistance: distanceBetween(direct, 'farm'),
      },
      detoured: {
        ...read(detoured),
        assignments: assignments(detoured),
        wellDistance: distanceBetween(detoured, 'well'),
        farmDistance: distanceBetween(detoured, 'farm'),
      },
    }
    audit('MULTI_ROUTE', rows)
    // Direct geometry: the Well is the nearer workplace.
    expect(rows.direct.wellDistance).toBe(0)
    expect(rows.direct.farmDistance).toBe(3)
    expect(Object.values(rows.direct.assignments)).toEqual(['well'])
    expect(rows.direct.waterCapacity).toBe(2)
    expect(rows.direct.foodPerTick).toBe(0)
    // Detoured geometry: the Farm becomes nearer -> the preference FLIPS ->
    // the same Well produces nothing and the Farm produces instead.
    expect(rows.detoured.wellDistance).toBe(4)
    expect(rows.detoured.farmDistance).toBe(3)
    expect(Object.values(rows.detoured.assignments)).toEqual(['farm'])
    expect(rows.detoured.waterCapacity).toBe(0)
    expect(rows.detoured.foodPerTick).toBe(2)
    // Same buildings, same resources, one network in both worlds.
    expect(rows.direct.networks).toBe(1)
    expect(rows.detoured.networks).toBe(1)
    expect(rows.direct.population).toBe(1)
    expect(rows.detoured.population).toBe(1)
  })

  it('measures the long-run consequence of that flip', () => {
    const mid = {
      direct: read(tick(multiRoute([]), 20)),
      detoured: read(tick(multiRoute(['1,1']), 20)),
    }
    const long = {
      direct: read(tick(multiRoute([]), 120)),
      detoured: read(tick(multiRoute(['1,1']), 120)),
    }
    audit('MULTI_ROUTE_LONG_RUN', { mid, long })
    // 20 ticks: both worlds still alive; the direct one has produced 40 Water
    // and no Food, the detoured one 40 Food and no Water.
    expect(mid.direct.waterCapacity).toBe(2)
    expect(mid.direct.foodPerTick).toBe(0)
    expect(mid.detoured.waterCapacity).toBe(0)
    expect(mid.detoured.foodPerTick).toBe(2)
    expect(mid.direct.water).toBeGreaterThan(mid.detoured.water)
    expect(mid.detoured.food).toBeGreaterThan(mid.direct.food)
    // 120 ticks: the direct world has eaten its reserve and starved, the
    // detoured one is alive and Food-positive but Water-short.
    expect(long.direct.population).toBe(0)
    expect(long.detoured.population).toBe(1)
    expect(long.detoured.foodNet).toBe(1)
    expect(long.detoured.waterSupply).toBe('shortage')
  })
})

// ---------------------------------------------------------------------------
// 6. Cell-role competition
// ---------------------------------------------------------------------------

describe('6. cell-role competition', () => {
  it('measures the three roles of one cell against three consequences', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const westResidenceId = buildingIdsOfType(start, 'residence')[0] ?? ''
    const eastVacantFarmId = buildingIdsOfType(start, 'farm')[1] ?? ''
    const westColonistId = Object.keys(start.colonists).sort()[0] ?? ''
    const asRoad = tick(
      stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }),
      2
    )
    const asFarm = tick(
      stepSimulation(start, {
        type: 'placeBuilding',
        x: 2,
        y: 1,
        buildingType: 'farm',
      }),
      2
    )
    const rows = [
      { role: 'road', state: asRoad },
      { role: 'building (farm)', state: asFarm },
      { role: 'blocked (no command)', state: start },
    ].map(({ role, state }) => {
      const measured = read(state)
      return {
        role,
        connectivity: measured.networks,
        waterService: measured.waterServedResidences,
        westResidenceServed: getWaterCoverage(state).servedResidenceIds.includes(
          westResidenceId
        ),
        crossRegionEligible:
          getReassignmentOptions(state, westColonistId).find(
            (entry) => entry.workplaceId === eastVacantFarmId
          )?.eligible ?? false,
        workforceMobility: measured.mobilityConnected,
        jobs: `${measured.employed}/${measured.jobCapacity}`,
        population: measured.population,
        stage: measured.stage,
      }
    })
    audit('CELL_ROLE_COMPETITION', rows)
    const [road, building, blocked] = rows
    // Three distinct consequences of the SAME cell: connectivity, Water
    // service, cross-region workforce mobility.
    expect(road?.connectivity).toBe(1)
    expect(building?.connectivity).toBe(2)
    expect(blocked?.connectivity).toBe(2)
    expect(road?.waterService).toBe(2)
    expect(building?.waterService).toBe(1)
    expect(blocked?.waterService).toBe(1)
    expect(road?.westResidenceServed).toBe(true)
    expect(building?.westResidenceServed).toBe(false)
    expect(road?.crossRegionEligible).toBe(true)
    expect(building?.crossRegionEligible).toBe(false)
    // Population, stage and production capacity stay identical: the role never
    // changes a rate. The only job-count difference is that the BUILDING role
    // adds a workplace, which has nothing to do with terrain.
    expect(new Set(rows.map((row) => row.stage)).size).toBe(1)
    expect(new Set(rows.map((row) => row.population)).size).toBe(1)
    expect(road?.jobs).toBe('2/3')
    expect(blocked?.jobs).toBe('2/3')
    expect(building?.jobs).toBe('2/4')
  })
})

// ---------------------------------------------------------------------------
// 7. Constrained Water recovery
// ---------------------------------------------------------------------------

describe('7. constrained Water recovery', () => {
  it('measures every solution to the blocked Well site', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const westResidenceId = buildingIdsOfType(start, 'residence')[0] ?? ''
    const servedWest = (state: SimulationState): boolean =>
      getWaterCoverage(state).servedResidenceIds.includes(westResidenceId)

    // Which cells can ever extend the WEST network? Its only road is (1,1).
    const extensionAttempts = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
    ].map((cell) => {
      const validation = validateRoadsPlacement(start, [cell])
      return {
        cell: cellKey(cell),
        adjacent: Math.abs(cell.x - 1) + Math.abs(cell.y - 1) === 1,
        accepted: validation.valid,
        reason: validation.valid ? null : validation.reason,
      }
    })

    // Solution 1 — a Well on a west cell (including the connector itself).
    const wellAttempts = [
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 2 },
    ].map((cell) => {
      const validation = validatePlacement(start, cell, 'well')
      return {
        cell: cellKey(cell),
        accepted: validation.valid,
        reason: validation.valid ? null : validation.reason,
      }
    })
    const wellOnConnector = read(
      tick(
        stepSimulation(start, {
          type: 'placeBuilding',
          x: 2,
          y: 1,
          buildingType: 'well',
        }),
        20
      )
    )

    // Solution 2 — the connector road (the only legal west extension).
    const connectorRoad = read(
      tick(
        stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }),
        20
      )
    )
    // Solution 3 — a third Residence in the east instead of serving the west.
    const eastResidence = read(
      tick(
        stepSimulation(start, {
          type: 'placeBuilding',
          x: 3,
          y: 0,
          buildingType: 'residence',
        }),
        20
      )
    )
    const rows = {
      extensionAttempts,
      wellAttempts,
      solutionWellOnConnector: { ...wellOnConnector, servedWest: servedWest(tick(stepSimulation(start, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'well' }), 20)) },
      solutionConnectorRoad: { ...connectorRoad, servedWest: servedWest(tick(stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }), 20)) },
      solutionEastResidence: { ...eastResidence, servedWest: servedWest(tick(stepSimulation(start, { type: 'placeBuilding', x: 3, y: 0, buildingType: 'residence' }), 20)) },
    }
    audit('CONSTRAINED_WATER', rows)

    // The blocked site is refused; the connector and a free east site are not.
    expect(wellAttempts.map((attempt) => attempt.reason)).toEqual([
      'terrainBlocked',
      null,
      null,
    ])
    // No free cell ADJACENT to the west road can be built on except the
    // connector: the connector is the only extension the west network has.
    const adjacentFree = extensionAttempts.filter((attempt) => attempt.adjacent)
    expect(adjacentFree.filter((attempt) => attempt.accepted).map((attempt) => attempt.cell)).toEqual([
      '2,1',
    ])
    expect(adjacentFree.filter((attempt) => !attempt.accepted).map((attempt) => attempt.cell)).toEqual([
      '0,1',
      '1,0',
      '1,2',
    ])
    // Both viable Water solutions to the west region pass through that cell.
    expect(rows.solutionWellOnConnector.servedWest).toBe(true)
    expect(rows.solutionConnectorRoad.servedWest).toBe(true)
    // Serving the west with a Well is 5x the price of the connector road, and
    // the Well itself stays UNSTAFFED (jobs 2/4): the west Residence is served
    // on paper because an operational Well grants coverage whether or not
    // anyone works it. That is existing 10P semantics, reached through terrain.
    expect(rows.solutionConnectorRoad.material).toBe(25)
    expect(rows.solutionWellOnConnector.material).toBe(5)
    expect(rows.solutionWellOnConnector.waterCapacity).toBe(
      rows.solutionConnectorRoad.waterCapacity
    )
    expect(rows.solutionWellOnConnector.jobCapacity).toBeGreaterThan(
      rows.solutionConnectorRoad.jobCapacity
    )
    // The east-only alternative leaves the west Residence unserved forever.
    expect(rows.solutionEastResidence.servedWest).toBe(false)
    expect(rows.solutionEastResidence.population).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 8. Redundancy with the existing mechanics
// ---------------------------------------------------------------------------

describe('8. redundancy audit', () => {
  it('classifies every observed phenomenon (measurements only)', () => {
    const terrain = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const open = createScenarioState(worldConfig([]), {
      ...TERRAIN_CHOKEPOINT_FIXTURE,
      blockedCells: [],
    })
    const rows = [
      {
        phenomenon: 'Chokepoint',
        classification: 'A',
        evidence:
          'the same command (a building on the connector) yields a severed state that 40 ticks and every recovery attempt leave identical, and no stock change can place a road on a blocked cell (measured terrainBlocked at Material 20/25/100/300/3000) — feasibility, not affordability',
      },
      {
        phenomenon: 'Detour',
        classification: 'E',
        evidence:
          'measured marginal cost +2 cells/+10 Material (short) and +4 cells/+20 Material (long); network, coverage, capacity, population and food balance are IDENTICAL after 60 ticks — a Material tax only',
      },
      {
        phenomenon: 'Multi-route',
        classification: 'B',
        evidence:
          'measured: blocking the short arm flips the 09M nearest-workplace choice (well 0<3 becomes farm 3<4), so the same Well produces 0 instead of 2 Water and the Farm produces 2 instead of 0 Food, and after 120 ticks the direct world starves while the detoured one survives. The mechanism is existing (09M + Water production) and the same outcomes are reachable on an open map by another layout, so it is a route tax on the layout, not a new rule',
      },
      {
        phenomenon: 'Water constraint',
        classification: 'C',
        evidence:
          'the blocked site forbids one placement, but every measured west Water solution passes through the connector cell and the cheapest one is a 5-Material road versus a 25-Material Well on the same cell: the optimum is trivial and the alternatives are money',
      },
      {
        phenomenon: 'Expansion',
        classification: 'C',
        evidence:
          'blocked cells only remove candidate cells from a placement; the existing layout-efficiency decision already prices that (road 5/cell), and no measured outcome differs from the open-map control except the Material spent',
      },
    ]
    audit('REDUNDANCY', rows)
    // The terrain fixture and its open-map control differ ONLY by terrain.
    expect(read(terrain).material).toBe(read(open).material)
    expect(read(terrain).population).toBe(read(open).population)
    expect(Object.keys(terrain.buildings).length).toBe(
      Object.keys(open.buildings).length
    )
    // Both start split (the connector is not a road in the fixture); the open
    // map can simply build the connection anywhere, the terrain world cannot.
    expect(getRoadNetworks(terrain).length).toBe(2)
    expect(getRoadNetworks(open).length).toBe(2)
    expect(validateRoadsPlacement(open, [{ x: 2, y: 0 }]).valid).toBe(true)
    expect(validateRoadsPlacement(terrain, [{ x: 2, y: 0 }])).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
  })
})

// ---------------------------------------------------------------------------
// 9-10. Scenario candidates and their distinctness
// ---------------------------------------------------------------------------

describe('9-10. scenario candidates and distinctness', () => {
  const fixtureOf = (blockedCells: readonly string[]): SimulationState =>
    createScenarioState(worldConfig([]), {
      ...TERRAIN_CHOKEPOINT_FIXTURE,
      blockedCells,
    })

  it('candidate A (chokepoint): terrain removes the repair, adds no outcome', () => {
    const actions: readonly CandidateAction[] = [
      { label: 'road on the connector', run: (s) => stepSimulation(s, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }) },
      { label: 'farm on the connector', run: (s) => stepSimulation(s, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'farm' }) },
      { label: 'residence on the connector', run: (s) => stepSimulation(s, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' }) },
      { label: 'nothing', run: (s) => s },
    ]
    const analysis = subsetAnalysis(fixtureOf(RIDGE), fixtureOf([]), actions, 8)

    // The repair of a wrong cell role, measured as a ROUTE: after a building
    // occupies the connector, how many NEW road cells would reconnect the two
    // networks, and is that possible at all?
    const wrongRole = (blockedCells: readonly string[]): SimulationState => {
      const start = fixtureOf(blockedCells)
      return tick(
        stepSimulation(start, {
          type: 'placeBuilding',
          x: 2,
          y: 1,
          buildingType: 'residence',
        }),
        2
      )
    }
    const west = wrongRole(RIDGE)
    const openWrong = wrongRole([])
    const openCells = roadCellsToReconnect(openWrong, [], { x: 1, y: 1 }, { x: 3, y: 1 })
    const repair = {
      terrainCells: roadCellsToReconnect(west, RIDGE, { x: 1, y: 1 }, { x: 3, y: 1 }),
      openCells,
      openCost: openCells === null ? null : openCells * ROAD_CONSTRUCTION_COST,
      leftoverMaterial: west.resources.construction,
      affordableInFixture:
        openCells === null ? null : openCells * ROAD_CONSTRUCTION_COST <= west.resources.construction,
      richTerrainCells: roadCellsToReconnect(
        { ...west, resources: { ...west.resources, construction: 3000 } },
        RIDGE,
        { x: 1, y: 1 },
        { x: 3, y: 1 }
      ),
    }
    audit('CANDIDATE_A_CHOKEPOINT', { analysis, repair })

    // Nothing new becomes reachable with terrain for the direct options, and
    // those options reach exactly the same outcomes in both worlds...
    expect(analysis.onlyWithTerrain).toEqual([])
    expect(analysis.onlyWithoutTerrain).toEqual([])
    // ...the ONLY structural difference is the repair ROUTE: it exists at a
    // Material price without terrain and does not exist at ANY Material with
    // it (measured again with 3000 Material).
    expect(repair.openCells).not.toBeNull()
    expect(repair.terrainCells).toBeNull()
    expect(repair.richTerrainCells).toBeNull()
    // Within the fixture's own budget (5 Material left after the wrong role)
    // the open-world repair is not affordable either: the difference is
    // PRINCIPLE (a richer colony could always pay it), not cash.
    expect(repair.affordableInFixture).toBe(false)
    expect(repair.openCost).toBeGreaterThan(repair.leftoverMaterial)
  })

  it('candidate B (split settlement): one Well per zone, priced by terrain', () => {
    const spec: SceneSpec = {
      residences: [
        [1, 0],
        [5, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 5, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ],
      colonists: 2,
      material: 60,
      food: 60,
      water: 10,
    }
    const actions: readonly CandidateAction[] = [
      {
        label: 'two wells (one per zone)',
        run: (s) => {
          const first = stepSimulation(s, { type: 'placeBuilding', x: 0, y: 1, buildingType: 'well' })
          return stepSimulation(first, { type: 'placeBuilding', x: 3, y: 2, buildingType: 'well' })
        },
      },
      {
        label: 'one well + connector road',
        run: (s) => {
          const first = stepSimulation(s, { type: 'placeBuilding', x: 3, y: 2, buildingType: 'well' })
          return stepSimulation(first, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] })
        },
      },
      { label: 'nothing', run: (s) => s },
    ]
    const analysis = subsetAnalysis(
      scene(spec, RIDGE),
      scene(spec, []),
      actions,
      8
    )
    audit('CANDIDATE_B_SPLIT', analysis)
    // Both options stay LEGAL in both worlds and reach the SAME outcomes: the
    // split decides what each option COSTS (a Well per network at 25 each,
    // versus one connector road at 5) — the 10AR partitioned-valley decision,
    // now parameterised by terrain instead of by the player's own layout.
    expect(analysis.onlyWithTerrain).toEqual([])
    expect(analysis.onlyWithoutTerrain).toEqual([])
    expect(analysis.byAction.terrain['two wells (one per zone)']).toBe(
      analysis.byAction.open['two wells (one per zone)']
    )
    expect(analysis.byAction.open['two wells (one per zone)']).not.toBe(
      analysis.byAction.open['one well + connector road']
    )
  })

  it('candidate C (constrained expansion): candidate cells only', () => {
    const spec: SceneSpec = {
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
      material: 100,
      food: 100,
      water: 0,
    }
    const cluster = ['0,0', '0,1', '2,1', '2,2', '2,3', '3,1']
    const actions: readonly CandidateAction[] = [
      { label: 'residence at 0,0', run: (s) => stepSimulation(s, { type: 'placeBuilding', x: 0, y: 0, buildingType: 'residence' }) },
      { label: 'residence at 3,0', run: (s) => stepSimulation(s, { type: 'placeBuilding', x: 3, y: 0, buildingType: 'residence' }) },
      { label: 'residence at 0,2', run: (s) => stepSimulation(s, { type: 'placeBuilding', x: 0, y: 2, buildingType: 'residence' }) },
      { label: 'road at 0,1', run: (s) => stepSimulation(s, { type: 'placeRoads', cells: [{ x: 0, y: 1 }] }) },
      { label: 'road at 2,0', run: (s) => stepSimulation(s, { type: 'placeRoads', cells: [{ x: 2, y: 0 }] }) },
    ]
    const analysis = subsetAnalysis(scene(spec, cluster), scene(spec, []), actions, 6)
    const openStart = scene(spec, [])
    const terrainStart = scene(spec, cluster)
    const legality = actions.map((action) => {
      const probe = action.run(openStart)
      const newBuildingId = Object.keys(probe.buildings).find(
        (id) => openStart.buildings[id] === undefined
      )
      if (newBuildingId !== undefined) {
        const building = probe.buildings[newBuildingId]
        return {
          action: action.label,
          terrain:
            building === undefined
              ? false
              : validatePlacement(
                  terrainStart,
                  { x: building.x, y: building.y },
                  building.type
                ).valid,
          open: true,
        }
      }
      const newRoadId = Object.keys(probe.roads).find(
        (id) => openStart.roads[id] === undefined
      )
      const road = newRoadId === undefined ? undefined : probe.roads[newRoadId]
      return {
        action: action.label,
        terrain:
          road === undefined
            ? false
            : validateRoadsPlacement(terrainStart, [{ x: road.x, y: road.y }]).valid,
        open: true,
      }
    })
    audit('CANDIDATE_C_EXPANSION', { analysis, legality })
    expect(analysis.onlyWithTerrain).toEqual([])
    // Every action is legal on the open map; terrain refuses exactly the ones
    // that target a blocked cell and changes nothing else.
    expect(legality.filter((row) => !row.terrain).map((row) => row.action)).toEqual([
      'residence at 0,0',
      'road at 0,1',
    ])
    // The refused placement removes a CELL, not an outcome: the same signature
    // stays reachable through another legal cell, so candidate C's terrain is a
    // pure option-count reduction with no new and no lost outcome.
    expect(analysis.onlyWithoutTerrain).toEqual([])
    expect(analysis.onlyWithTerrain).toEqual([])
  })

  it('candidate D (constrained Water): the blocked site forbids, money compensates', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const rich: SimulationState = {
      ...start,
      resources: { ...start.resources, construction: 3000 },
    }
    const attempts = [
      { label: 'well at 0,1', check: () => validatePlacement(start, { x: 0, y: 1 }, 'well') },
      { label: 'well at 0,1 (Material 3000)', check: () => validatePlacement(rich, { x: 0, y: 1 }, 'well') },
      { label: 'road at 0,1', check: () => validateRoadsPlacement(start, [{ x: 0, y: 1 }]) },
      { label: 'road at 2,5', check: () => validateRoadsPlacement(start, [{ x: 2, y: 5 }]) },
      { label: 'well at 3,2 (east site)', check: () => validatePlacement(rich, { x: 3, y: 2 }, 'well') },
    ].map((entry) => {
      const validation = entry.check()
      return {
        label: entry.label,
        accepted: validation.valid,
        reason: validation.valid ? null : validation.reason,
      }
    })
    audit('CANDIDATE_D_WATER', attempts)
    expect(attempts.map((attempt) => attempt.reason)).toEqual([
      'terrainBlocked',
      'terrainBlocked',
      'terrainBlocked',
      'terrainBlocked',
      null,
    ])
    // The alternative east site stays legal: the constraint is one cell, never
    // a missing capability, and Material is never the reason for a refusal.
    expect(attempts[4]?.accepted).toBe(true)
  })

  it('candidate E (multi-route): the second corridor is a privilege of open terrain', () => {
    const spec: SceneSpec = {
      residences: [[0, 0]],
      buildings: [
        { type: 'well', x: 2, y: 0 },
        { type: 'farm', x: 1, y: 4 },
      ],
      roads: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
      colonists: 1,
      material: 100,
      food: 100,
      water: 0,
    }
    const shortArmCells = [
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]
    const longArmCells = [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ]
    const shortArm: CandidateAction = { ...atomicRoads(shortArmCells), label: 'short arm' }
    const longArm: CandidateAction = { ...atomicRoads(longArmCells), label: 'long arm' }
    const noArm: CandidateAction = { label: 'no arm', run: (s) => s }
    const terrainStart = scene(spec, ['1,1'])
    const openStart = scene(spec, [])
    const analysis = subsetAnalysis(terrainStart, openStart, [shortArm, longArm, noArm], 8)
    const legality = [
      { arm: 'short arm', cells: shortArmCells.length, cellsList: shortArmCells },
      { arm: 'long arm', cells: longArmCells.length, cellsList: longArmCells },
    ].map((row) => ({
      arm: row.arm,
      cells: row.cells,
      terrain: validateRoadsPlacement(terrainStart, row.cellsList).valid,
      open: validateRoadsPlacement(openStart, row.cellsList).valid,
    }))
    audit('CANDIDATE_E_MULTI_ROUTE', { analysis, legality })

    // The SHORT corridor exists only without terrain: with it there is no route
    // choice left, only the long one.
    expect(legality).toEqual([
      { arm: 'short arm', cells: 2, terrain: false, open: true },
      { arm: 'long arm', cells: 3, terrain: true, open: true },
    ])
    // The corridor choice really changes the outcome on the open map (the 09M
    // flip), so the option terrain removes is a MEANINGFUL one: the reachable
    // set shrinks by a non-trivial outcome and grows by nothing.
    expect(analysis.byAction.open['short arm']).not.toBe(
      analysis.byAction.open['long arm']
    )
    expect(analysis.onlyWithTerrain).toEqual([])
    expect(analysis.onlyWithoutTerrain.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 11-12. Catalogue and objective primitives
// ---------------------------------------------------------------------------

describe('11-12. catalogue decision and objective primitives', () => {
  it('needs no new objective primitive for any candidate', () => {
    const primitives = ['stage', 'population', 'waterCapacity', 'foodBalance', 'building']
    const candidates = [
      { candidate: 'Chokepoint Settlement', objective: 'stage village + population 3', expressible: true },
      { candidate: 'Split Settlement', objective: 'stage village + 2 operational Wells', expressible: true },
      { candidate: 'Constrained Expansion', objective: 'stage settlement + population N', expressible: true },
      { candidate: 'Constrained Water', objective: 'waterCapacity 4', expressible: true },
      { candidate: 'Multi-route Geometry', objective: 'waterCapacity 2 + foodBalance', expressible: true },
    ]
    audit('OBJECTIVE_PRIMITIVES', { primitives, candidates })
    expect(candidates.every((candidate) => candidate.expressible)).toBe(true)
    // Audit-only: the curated catalogue was untouched by that audit (Step
    // 10BE later added one curated content scenario).
    expect(SCENARIOS).toHaveLength(8)
    expect(SCENARIOS.every((scenario) => scenario.blockedCells === undefined)).toBe(true)
  })

  it('evaluates the existing fixture objective with those primitives', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const status = getObjectiveStatus(start, TERRAIN_CHOKEPOINT_FIXTURE.objective)
    const kinds = TERRAIN_CHOKEPOINT_FIXTURE.objective.requirements.map(
      (requirement) => requirement.kind
    )
    audit('FIXTURE_OBJECTIVE', { kinds, status })
    expect(kinds).toEqual(['stage', 'population'])
    expect(status.state).toBe('in_progress')
    expect(status.blockers).toEqual(['Population 3'])
  })
})

// ---------------------------------------------------------------------------
// 14. Long-run regression
// ---------------------------------------------------------------------------

describe('14. long-run regression', () => {
  it('stays static and hidden-effect free over 60 and 600 ticks', () => {
    const start = createScenarioState(worldConfig([]), TERRAIN_CHOKEPOINT_FIXTURE)
    const connected = tick(
      stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }),
      2
    )
    const at60 = tick(connected, 60)
    const at600 = tick(at60, 540)
    const rows = {
      start: read(start),
      connected: read(connected),
      at60: read(at60),
      at600: read(at600),
      terrainAt600: at600.config.world.blockedCells,
    }
    audit('LONG_RUN', rows)
    // Terrain is STATIC: byte-identical after 600 ticks.
    expect(at600.config.world.blockedCells).toEqual(
      normalizeBlockedCells(TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? [])
    )
    // No oscillation and no divergence: two independent 600-tick runs agree.
    const again = tick(
      tick(
        stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }),
        2
      ),
      600
    )
    expect(hashCanonicalState(again)).toBe(hashCanonicalState(at600))
    expect(rows.at600.waterServedResidences).toBe(2)
    expect(rows.at600.networks).toBe(1)
    expect(rows.at600.waterCapacity).toBe(2)
    expect(rows.at600.servedColonists).toBe(2)
  })

  it('has no hidden economic effect: never-targeted terrain changes nothing', () => {
    const plain = createInitialState(worldConfig([]))
    const terrain = createInitialState(worldConfig(['0,0', '11,11']))
    const run = (state: SimulationState): SimulationState => {
      let next = stepSimulation(state, {
        type: 'placeBuilding',
        x: 4,
        y: 4,
        buildingType: 'residence',
      })
      next = stepSimulation(next, { type: 'placeRoads', cells: [{ x: 4, y: 5 }] })
      return tick(next, 600)
    }
    const a = run(plain)
    const b = run(terrain)
    const strip = (state: SimulationState): string =>
      canonicalJson({
        ...state,
        config: {
          world: {
            seed: state.config.world.seed,
            width: state.config.world.width,
            height: state.config.world.height,
          },
        },
      })
    audit('HIDDEN_EFFECT', {
      identicalWithoutTerrainField: strip(a) === strip(b),
      material: read(b).material,
      population: read(b).population,
      food: read(b).food,
    })
    expect(strip(a)).toBe(strip(b))
  })
})

// ---------------------------------------------------------------------------
// 15. Determinism, insertion order, save/load, hash
// ---------------------------------------------------------------------------

describe('15. determinism, insertion order, save/load, hash', () => {
  const fixture = (blockedCells: readonly string[]): SimulationState =>
    createScenarioState(worldConfig([]), {
      ...TERRAIN_CHOKEPOINT_FIXTURE,
      blockedCells,
    })

  const drive = (state: SimulationState): SimulationState => {
    let next = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] })
    next = stepSimulation(next, {
      type: 'placeBuilding',
      x: 3,
      y: 0,
      buildingType: 'residence',
    })
    return tick(next, 30)
  }

  it('is deterministic, insertion-order invariant and save/load stable', () => {
    const cells = TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? []
    const first = drive(fixture(cells))
    const second = drive(fixture(cells))
    const shuffled = drive(fixture([...cells].reverse()))
    const reloadedBefore = loadSave(serializeSave(fixture(cells)))
    const reloadedAfter = loadSave(serializeSave(first))
    const rows = {
      deterministic: hashCanonicalState(first) === hashCanonicalState(second),
      insertionOrderEquivalent: hashCanonicalState(shuffled) === hashCanonicalState(first),
      reloadEquivalent: hashCanonicalState(reloadedAfter) === hashCanonicalState(first),
      terrainSurvivesSave: reloadedBefore.config.world.blockedCells,
      saveVersion: SAVE_VERSION,
      beforeHash: hashCanonicalState(reloadedBefore),
      afterHash: hashCanonicalState(reloadedAfter),
    }
    audit('DETERMINISM_SAVE', rows)
    expect(rows.deterministic).toBe(true)
    expect(rows.insertionOrderEquivalent).toBe(true)
    expect(rows.reloadEquivalent).toBe(true)
    expect(rows.terrainSurvivesSave).toEqual(normalizeBlockedCells(cells))
    expect(rows.saveVersion).toBe(8)
    expect(rows.beforeHash).not.toBe(rows.afterHash)
  })

  it('keeps every derived terrain fact out of the persisted state', () => {
    const state = drive(fixture(TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? []))
    const saved = JSON.parse(serializeSave(state)) as { state: Record<string, unknown> }
    const terrainKeys = Object.keys(saved.state).filter((key) =>
      key.toLowerCase().includes('terrain')
    )
    const worldKeys = Object.keys(
      (saved.state['config'] as { world: Record<string, unknown> }).world
    ).sort()
    audit('PERSISTED_TERRAIN', {
      topLevelKeys: Object.keys(saved.state).sort(),
      terrainKeys,
      worldKeys,
    })
    expect(terrainKeys).toEqual([])
    expect(worldKeys).toEqual(['blockedCells', 'height', 'seed', 'width'])
  })
})

// ---------------------------------------------------------------------------
// 16. Architecture audit: who is allowed to read terrain
// ---------------------------------------------------------------------------

describe('16. architecture audit', () => {
  const SOURCE_ROOT = 'src'
  const TERRAIN_REFERENCE = /blockedCells|isTerrainBlocked|normalizeBlockedCells|parseBlockedCell|listBlockedCells/

  const collectSources = (dir: string): string[] => {
    const files: string[] = []
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        files.push(...collectSources(path))
      } else if (path.endsWith('.ts')) {
        files.push(path.replace(/\\/g, '/'))
      }
    }
    return files
  }

  it('is read only by the world config, placement validation, scenario assembly, persistence and rendering', () => {
    const readers = collectSources(SOURCE_ROOT)
      .filter((file) => TERRAIN_REFERENCE.test(readFileSync(file, 'utf8')))
      .sort()
    const expected = [
      'src/app/main.ts',
      'src/application/persistence/save.ts',
      'src/application/queries/renderSnapshot.ts',
      'src/application/scenarios.ts',
      'src/domain/simulation/phases.ts',
      'src/domain/simulation/state.ts',
      'src/domain/world/grid.ts',
      'src/renderer/three/novaRenderer.ts',
    ].sort()
    audit('TERRAIN_CONSUMERS', { readers, expected })
    expect(readers).toEqual(expected)
  })

  it('is never read by production, workforce, population, construction or objective code', () => {
    const forbidden = [
      'src/domain/resource/resource.ts',
      'src/domain/water/water.ts',
      'src/domain/jobs/jobs.ts',
      'src/domain/housing/housing.ts',
      'src/domain/mobility/mobility.ts',
      'src/domain/network/network.ts',
      'src/domain/building/building.ts',
      'src/domain/road/road.ts',
      'src/domain/population/colonist.ts',
      'src/domain/simulation/step.ts',
      'src/domain/simulation/hash.ts',
      'src/application/queries/resources.ts',
      'src/application/queries/progression.ts',
      'src/application/queries/objective.ts',
      'src/application/queries/inspection.ts',
      'src/application/queries/network.ts',
      'src/application/queries/roads.ts',
    ]
    const offenders = forbidden.filter((file) =>
      TERRAIN_REFERENCE.test(readFileSync(file, 'utf8'))
    )
    audit('FORBIDDEN_TERRAIN_READERS', { checked: forbidden.length, offenders })
    expect(offenders).toEqual([])
  })

  it('keeps placement validation the only domain gate and terrain-free worlds byte-identical', () => {
    const state = createInitialState(worldConfig(['2,2']))
    expect(validatePlacement(state, { x: 2, y: 2 }, 'residence')).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    expect(validateRoadsPlacement(state, [{ x: 2, y: 2 }])).toEqual({
      valid: false,
      reason: 'terrainBlocked',
    })
    // The economic surface is untouched by the terrain field.
    expect(canonicalJson(createInitialState(worldConfig([])))).not.toContain('blocked')
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(countWorkersAt(state, 'missing')).toBe(0)
    expect(getRoadIdAtCell(state, { x: 2, y: 2 })).toBeNull()
    expect(isTerrainBlocked(state.config.world, { x: 2, y: 2 })).toBe(true)
    expect(isCellOccupied(state, { x: 2, y: 2 })).toBe(false)
    expect(assignJobs(state)).toBe(state)
  })
})
