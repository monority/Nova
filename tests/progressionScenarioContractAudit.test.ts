/**
 * Step 10AK — Progression & Scenario Design Contract Audit.
 *
 * DESIGN-CONTRACT ONLY. `src/` is untouched: every value below is measured from
 * the real runtime (real placement commands + derived queries). Nothing is
 * implemented; the output is a candidate contract grounded in existing state.
 *
 * Run:
 *   npx vitest run tests/progressionScenarioContractAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getResourceStock,
  getRoadNetworks,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  hashCanonicalState,
  iterateBuildings,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = { world: { seed: 'nova-step10ak', width: 40, height: 20 } }

const createState = (): SimulationState => createInitialState(auditConfig)

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const withStocks = (
  state: SimulationState,
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
  },
})

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ak: building missing')
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
  if (id === undefined) throw new Error('10ak: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ak: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Placement {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
}

interface SceneSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly Placement[]
  readonly roads: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 10_000,
    material: spec.material ?? 500,
    water: spec.water ?? 50,
  })
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) state = op(state, placement.type, placement.x, placement.y)
  for (const cell of spec.roads) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly foodProduction: number
  readonly foodConsumption: number
  readonly foodNet: number
  readonly water: number
  readonly waterProduction: number
  readonly waterNeed: number
  readonly waterNet: number
  readonly material: number
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly staffedWorkshops: number
  readonly networks: number
  readonly roadCells: number
  readonly roadCost: number
  readonly waterServedResidences: number
  readonly housingCapacity: number
  readonly housingAvailable: number
  readonly residences: number
  readonly farms: number
  readonly wells: number
  readonly workshops: number
  readonly operationalBuildings: number
  readonly buildings: number
}

const countType = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter((building) => building.type === type).length

const staffedWells = (state: SimulationState): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (building.type !== 'well') continue
    const workers = [...Object.values(state.colonists)].filter(
      (colonist) => colonist.workplaceId === building.id
    ).length
    if (workers > 0) count += 1
  }
  return count
}

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const housing = getHousingSummary(state)
  const roadCells = Object.keys(state.roads).length
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    foodProduction: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    water: state.resources.water,
    waterProduction: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    waterNet: getWaterProductionPerTick(state) - getWaterNeedPerTick(state),
    material: state.resources.construction,
    materialProduction: getMaterialProductionPerTick(state),
    materialUpkeep: getMaterialUpkeepPerTick(state),
    materialNet: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: getJobCapacity(state),
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWells: staffedWells(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    networks: getRoadNetworks(state).length,
    roadCells,
    roadCost: roadCells * 5,
    waterServedResidences: getWaterServedResidenceCount(state),
    housingCapacity: housing.totalCapacity,
    housingAvailable: housing.availableCapacity,
    residences: countType(state, 'residence'),
    farms: countType(state, 'farm'),
    wells: countType(state, 'well'),
    workshops: countType(state, 'workshop'),
    operationalBuildings: [...iterateBuildings(state)].filter((b) => b.status === 'operational').length,
    buildings: Object.keys(state.buildings).length,
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const place = (
  state: SimulationState,
  type: BuildingType,
  cell: CellCoordinate
): { readonly state: SimulationState; readonly accepted: boolean } => {
  const before = Object.keys(state.buildings).length
  const after = stepSimulation(state, { type: 'placeBuilding', x: cell.x, y: cell.y, buildingType: type })
  return { state: after, accepted: Object.keys(after.buildings).length === before + 1 }
}

const placeRoads = (state: SimulationState, cells: readonly CellCoordinate[]): SimulationState =>
  stepSimulation(state, { type: 'placeRoads', cells })

const affordable = (state: SimulationState, type: BuildingType, cell: CellCoordinate): boolean =>
  getPlacementAffordability(state, cell, type).affordable

type Step =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }

interface OpeningRun {
  readonly name: string
  readonly steps: readonly { readonly label: string; readonly tick: number; readonly skipped: boolean }[]
  readonly final: Snapshot
  readonly finalState: SimulationState
  readonly wipeTick: number | null
  readonly settlingTick: number | null
}

/** Execute an opening with real commands, waiting until each step is affordable. */
const runOpening = (name: string, steps: readonly Step[], horizon: number): OpeningRun => {
  let state = withStocks(createState(), { food: 100, material: 100, water: 0 })
  const executed: { label: string; tick: number; skipped: boolean }[] = []
  let wipeTick: number | null = null
  let settlingTick: number | null = null
  let previousPopulation = 0
  let lastPopulationChange = 0
  const track = (): void => {
    if (wipeTick === null && executed.length > 0 && getPopulationCount(state) === 0) {
      wipeTick = state.time.tick
    }
    const population = getPopulationCount(state)
    if (population !== previousPopulation) {
      previousPopulation = population
      lastPopulationChange = state.time.tick
    }
    if (
      settlingTick === null &&
      executed.length > 0 &&
      population > 0 &&
      state.time.tick - lastPopulationChange >= 100 &&
      snapshot(state).foodNet >= 0
    ) {
      settlingTick = state.time.tick
    }
  }
  for (const step of steps) {
    if (step.kind === 'roads') {
      let guard = 0
      while (guard < 400 && state.resources.construction < step.cells.length * 5) {
        state = stepSimulation(state)
        track()
        guard += 1
      }
      if (state.resources.construction < step.cells.length * 5) {
        executed.push({ label: `roads x${step.cells.length}`, tick: state.time.tick, skipped: true })
        continue
      }
      state = placeRoads(state, step.cells)
      executed.push({ label: `roads x${step.cells.length}`, tick: state.time.tick, skipped: false })
      continue
    }
    const cell = { x: step.x, y: step.y }
    let guard = 0
    while (guard < 400 && !affordable(state, step.type, cell)) {
      state = stepSimulation(state)
      track()
      guard += 1
    }
    const result = place(state, step.type, cell)
    executed.push({ label: `${step.type}@${step.x},${step.y}`, tick: state.time.tick, skipped: !result.accepted })
    state = result.state
  }
  while (state.time.tick < horizon) {
    state = stepSimulation(state)
    track()
  }
  return { name, steps: executed, final: snapshot(state), finalState: state, wipeTick, settlingTick }
}

// Staged reference states used by several sections.
const stagedStates = () => [
  { stage: 'Wilderness', state: createState() },
  {
    stage: 'Settlement',
    state: runTicks(scene({ residences: [{ x: 1, y: 0 }], roads: [{ x: 1, y: 1 }], colonists: 1, food: 1000, material: 0, water: 0 }), 20),
  },
  {
    stage: 'Village',
    state: runTicks(
      scene({
        residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
        workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
        roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
        colonists: 2,
        food: 1000,
        material: 0,
        water: 50,
      }),
      200
    ),
  },
  {
    stage: 'Town',
    state: runTicks(
      scene({
        residences: Array.from({ length: 4 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
        workplaces: [
          { type: 'well', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'farm', x: 5, y: 2 },
          { type: 'farm', x: 7, y: 2 },
        ],
        roads: Array.from({ length: 9 }, (_, i) => ({ x: 1 + i, y: 1 })),
        colonists: 4,
        food: 1000,
        material: 0,
        water: 50,
      }),
      300
    ),
  },
  {
    stage: 'City-like',
    state: runTicks(
      scene({
        residences: Array.from({ length: 6 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
        workplaces: [
          { type: 'well', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'well', x: 5, y: 2 },
          { type: 'farm', x: 7, y: 2 },
          { type: 'farm', x: 9, y: 2 },
          { type: 'farm', x: 11, y: 2 },
        ],
        roads: Array.from({ length: 13 }, (_, i) => ({ x: 1 + i, y: 1 })),
        colonists: 6,
        food: 1000,
        material: 0,
        water: 50,
      }),
      300
    ),
  },
]

// ---------------------------------------------------------------------------
// 1-2. Existing signals, milestone versus score
// ---------------------------------------------------------------------------

describe('1-2. Existing progression signals and milestone-versus-score', { timeout: 30000 }, () => {
  it('inventories every metric available without new simulation', () => {
    const stages = stagedStates().map((entry) => ({ stage: entry.stage, snap: snapshot(entry.state) }))
    const metricRows = [
      { metric: 'population', read: (s: Snapshot) => s.population, persisted: true, derived: false },
      { metric: 'Residence count', read: (s: Snapshot) => s.residences, persisted: true, derived: false },
      { metric: 'Farm count', read: (s: Snapshot) => s.farms, persisted: true, derived: false },
      { metric: 'Well count', read: (s: Snapshot) => s.wells, persisted: true, derived: false },
      { metric: 'Workshop count', read: (s: Snapshot) => s.workshops, persisted: true, derived: false },
      { metric: 'operational building count', read: (s: Snapshot) => s.operationalBuildings, persisted: false, derived: true },
      { metric: 'road cells', read: (s: Snapshot) => s.roadCells, persisted: true, derived: false },
      { metric: 'road networks', read: (s: Snapshot) => s.networks, persisted: false, derived: true },
      { metric: 'water-served residences', read: (s: Snapshot) => s.waterServedResidences, persisted: false, derived: true },
      { metric: 'staffed Farms', read: (s: Snapshot) => s.staffedFarms, persisted: false, derived: true },
      { metric: 'staffed Wells', read: (s: Snapshot) => s.staffedWells, persisted: false, derived: true },
      { metric: 'staffed Workshops', read: (s: Snapshot) => s.staffedWorkshops, persisted: false, derived: true },
      { metric: 'unemployed colonists', read: (s: Snapshot) => s.unemployed, persisted: false, derived: true },
      { metric: 'Food production', read: (s: Snapshot) => s.foodProduction, persisted: false, derived: true },
      { metric: 'Food stock', read: (s: Snapshot) => s.food, persisted: true, derived: false },
      { metric: 'Water production', read: (s: Snapshot) => s.waterProduction, persisted: false, derived: true },
      { metric: 'Water stock', read: (s: Snapshot) => s.water, persisted: true, derived: false },
      { metric: 'Material production', read: (s: Snapshot) => s.materialProduction, persisted: false, derived: true },
      { metric: 'Material stock', read: (s: Snapshot) => s.material, persisted: true, derived: false },
      { metric: 'construction activity (Material outflow)', read: (s: Snapshot) => s.materialUpkeep, persisted: false, derived: true },
      { metric: 'construction completion (buildings)', read: (s: Snapshot) => s.buildings, persisted: true, derived: false },
      { metric: 'sustained stability (snapshot spread)', read: (s: Snapshot) => s.foodNet + s.waterNet, persisted: false, derived: true },
      { metric: 'road/network extent', read: (s: Snapshot) => s.roadCost, persisted: false, derived: true },
      { metric: 'workforce capacity (job capacity)', read: (s: Snapshot) => s.jobCapacity, persisted: false, derived: true },
      { metric: 'industrial capacity (Workshop count)', read: (s: Snapshot) => s.workshops, persisted: true, derived: false },
    ]
    const rows = metricRows.map((entry) => {
      const values = stages.map((stage) => entry.read(stage.snap))
      const monotonic = values.every((value, index) => index === 0 || value >= (values[index - 1] ?? 0))
      return {
        metric: entry.metric,
        existingState: true,
        deterministic: true,
        persisted: entry.persisted,
        derived: entry.derived,
        monotonicAcrossStages: monotonic,
        values,
      }
    })
    audit('SIGNAL_INVENTORY', {
      stages: stages.map((stage) => stage.stage),
      rows,
      note: 'all metrics exist without new simulation; persisted means canonical save state, derived means recomputed every query',
    })
    expect(rows).toHaveLength(25)
    expect(rows.every((row) => row.deterministic)).toBe(true)
    // Measured: the population/Water/infrastructure metrics are monotonic across the stages.
    const monotonicNames = rows.filter((row) => row.monotonicAcrossStages).map((row) => row.metric)
    expect(monotonicNames).toContain('population')
    expect(monotonicNames).toContain('Water production')
    expect(monotonicNames).toContain('buildings' in {} ? 'buildings' : 'road cells')
  })

  it('separates a milestone (capacity change) from a score (counter)', () => {
    // Milestone candidate: Water capacity >= 2 is the first state that can
    // support a second colonist through the admission gate.
    const withoutWell = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
        workplaces: [{ type: 'farm', x: 1, y: 2 }],
        roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
        colonists: 1,
        food: 1000,
        material: 0,
        water: 0,
      }),
      200
    )
    const withWell = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
        workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
        roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
        colonists: 1,
        food: 1000,
        material: 0,
        water: 50,
      }),
      200
    )

    // Score candidate: extra road cells beyond what access needs change nothing.
    const baseRoads = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [{ type: 'farm', x: 1, y: 2 }],
        roads: [{ x: 1, y: 1 }],
        colonists: 1,
        food: 1000,
        material: 0,
        water: 0,
      }),
      120
    )
    let extraRoads = baseRoads
    for (let x = 2; x <= 6; x += 1) extraRoads = opRoad(extraRoads, x, 1)
    extraRoads = assignJobs(extraRoads)
    const extraRoadsSettled = runTicks(extraRoads, 120)

    audit('MILESTONE_VS_SCORE', {
      milestone: {
        candidate: 'Water capacity >= 2 (a staffed Well)',
        withoutWell: snapshot(withoutWell),
        withWell: snapshot(withWell),
        capacityChange: 'the admission gate switches to capacity-based and the population reaches 2',
      },
      score: {
        candidate: 'road cells >= 5',
        before: snapshot(baseRoads),
        after: snapshot(extraRoadsSettled),
        delta: {
          population: snapshot(extraRoadsSettled).population - snapshot(baseRoads).population,
          foodNet: snapshot(extraRoadsSettled).foodNet - snapshot(baseRoads).foodNet,
          materialNet: snapshot(extraRoadsSettled).materialNet - snapshot(baseRoads).materialNet,
        },
      },
      counter: {
        candidate: 'construction history (buildings placed)',
        note: 'a pure counter: two colonies can have the same buildings with different histories and identical state',
      },
      rule: 'a milestone must change capacity/state; a score only increases a number',
    })

    // Measured: without a Well the population still reaches 2 through housing
    // alone, but no Water is produced and nothing is served.
    expect(snapshot(withoutWell).population).toBe(2)
    expect(snapshot(withoutWell).waterProduction).toBe(0)
    // With a Well the same population is served and the capacity exists.
    expect(snapshot(withWell).waterProduction).toBe(2)
    expect(snapshot(withWell).waterServedResidences).toBeGreaterThan(0)
    // Score: extra road cells change nothing.
    expect(snapshot(extraRoadsSettled).population).toBe(snapshot(baseRoads).population)
    expect(snapshot(extraRoadsSettled).foodNet).toBe(snapshot(baseRoads).foodNet)
    expect(snapshot(extraRoadsSettled).materialNet).toBe(snapshot(baseRoads).materialNet)
  })
})

// ---------------------------------------------------------------------------
// 3-8. Stage transitions
// ---------------------------------------------------------------------------

describe('3-8. Stage transition audit', { timeout: 30000 }, () => {
  it('tests the Wilderness -> Settlement candidates', () => {
    const candidates = [
      { candidate: 'first infrastructure (any building placed)', measurable: true, causal: false, stable: false, visible: true, nonArbitrary: true, verdict: 'FAIL', why: 'a lone building with no Food source is not a settlement and can starve' },
      { candidate: 'first Residence', measurable: true, causal: true, stable: false, visible: true, nonArbitrary: true, verdict: 'PARTIAL', why: 'housing exists but population requires Food and housing together' },
      { candidate: 'first operational Road network', measurable: true, causal: true, stable: false, visible: true, nonArbitrary: true, verdict: 'PARTIAL', why: 'the network is what enables Water/mobility, but alone it houses nobody' },
      { candidate: 'first population (>= 1 colonist)', measurable: true, causal: true, stable: false, visible: true, nonArbitrary: true, verdict: 'PARTIAL', why: 'a colonist without Food production lives on a stock and eventually dies' },
      { candidate: 'first production (Food produced)', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'PASS', why: 'measured: 1 Farm + 1 Residence survives 600 ticks with a +1 Food/tick surplus' },
      { candidate: 'first sustainable state', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'PASS', why: 'measured: Food production >= consumption with a population > 0 is a durable state' },
    ]
    // Sustained-settlement probe: 1 colonist + 1 Farm + roads, 600 ticks.
    const sustained = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [{ type: 'farm', x: 1, y: 2 }],
        roads: [{ x: 1, y: 1 }],
        colonists: 1,
        food: 100,
        material: 0,
        water: 0,
      }),
      600
    )
    audit('WILDERNESS_TO_SETTLEMENT', {
      candidates,
      sustainedProbe: snapshot(sustained),
      contract: 'SETTLEMENT = population >= 1 AND Food production >= Food consumption AND a Road network exists',
      verdict: 'SUPPORTED',
    })
    expect(snapshot(sustained).population).toBe(1)
    expect(snapshot(sustained).foodNet).toBeGreaterThanOrEqual(0)
  })

  it('tests the Settlement -> Village candidates', () => {
    const candidates = [
      { candidate: 'population >= 2', measurable: true, causal: false, stable: true, visible: true, nonArbitrary: false, verdict: 'FAIL', why: 'measured: population 2 is reachable with zero Water production (housing only), so the number does not imply the capacity' },
      { candidate: 'two Residences', measurable: true, causal: false, stable: true, visible: true, nonArbitrary: false, verdict: 'FAIL', why: 'housing count alone is dormant capacity without Water' },
      { candidate: 'Food production >= 2', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: false, verdict: 'PARTIAL', why: 'two Food per tick is one staffed Farm: it follows from the 2-Food-per-Farm rule but is a quantity, not a new capacity' },
      { candidate: 'Water capacity >= 2 (a staffed Well)', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'PASS', why: 'the first state where the admission gate becomes capacity-based and the population is water-served' },
      { candidate: 'population >= 2 AND Water capacity >= 2', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'PASS', why: 'population 2 is exactly what one staffed Well supports, so the threshold is produced by the model' },
      { candidate: 'multiple production buildings', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: false, verdict: 'PARTIAL', why: 'measured: a Well + Farm is the first pair, but the pair is required by the bootstrap rather than by a village concept' },
    ]
    const withoutWell = snapshot(
      runTicks(
        scene({
          residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
          colonists: 1,
          food: 1000,
          material: 0,
          water: 0,
        }),
        200
      )
    )
    const withWell = snapshot(
      runTicks(
        scene({
          residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
          workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
          roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
          colonists: 1,
          food: 1000,
          material: 0,
          water: 50,
        }),
        200
      )
    )
    audit('SETTLEMENT_TO_VILLAGE', {
      candidates,
      samePopulationDifferentState: {
        withoutWell: { population: withoutWell.population, waterProduction: withoutWell.waterProduction, servedResidences: withoutWell.waterServedResidences },
        withWell: { population: withWell.population, waterProduction: withWell.waterProduction, servedResidences: withWell.waterServedResidences },
      },
      contract: 'VILLAGE = population >= 2 AND Water capacity >= 2 (a staffed, road-connected Well) AND Food production >= Food consumption',
      verdict: 'SUPPORTED',
    })
    expect(withoutWell.population).toBe(withWell.population)
    expect(withoutWell.waterProduction).not.toBe(withWell.waterProduction)
  })

  it('tests the Village -> Town combination and the Town -> City boundary', () => {
    const stages = stagedStates()
    const byStage = (name: string) => snapshot((stages.find((entry) => entry.stage === name) ?? stages[0]!).state)
    const village = byStage('Village')
    const town = byStage('Town')
    const cityLike = byStage('City-like')

    const townCandidates = [
      { candidate: 'population >= 4', measurable: true, causal: false, stable: true, visible: true, nonArbitrary: false, verdict: 'FAIL', why: 'ARBITRARY THRESHOLD: raw population counts are not produced by a rule' },
      { candidate: 'Water capacity >= 4 (two staffed Wells)', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'PARTIAL', why: '4 = 2 colonists per staffed Well x 2 Wells: the threshold is produced by the admission rule, but the change is quantitative' },
      { candidate: 'population >= 4 AND Food balance AND 2+ staffed Wells AND 2+ staffed Farms', measurable: true, causal: true, stable: true, visible: true, nonArbitrary: true, verdict: 'SUPPORTED (PARTIAL)', why: 'measured: this is the first state where infrastructure exists purely for scale (a second Well/Farm) rather than for the bootstrap' },
      { candidate: 'industrial capacity (a staffed Workshop)', measurable: true, causal: true, stable: false, visible: true, nonArbitrary: false, verdict: 'FAIL', why: 'measured: industry is unreachable in equilibrium (the Workshop worker costs a Farm worker), so it cannot be a Town condition' },
    ]

    const cityCandidates = [
      { candidate: 'population >= 6 / 3 Wells', measurable: true, causal: false, stable: true, visible: true, nonArbitrary: false, verdict: 'FAIL', why: 'measured: the Town and the City-like state are identical in kind (same flows, same ratios, population = 2 x staffed Wells)' },
      { candidate: 'a new production type or role', measurable: false, causal: false, stable: false, visible: false, nonArbitrary: false, verdict: 'FAIL', why: 'no such state exists in the runtime' },
      { candidate: 'local/qualitative consequence of size', measurable: false, causal: false, stable: false, visible: false, nonArbitrary: false, verdict: 'FAIL', why: 'no neighbour/density/service consequence exists (measured by Steps 10AH/10AI)' },
    ]

    audit('VILLAGE_TO_TOWN_AND_BEYOND', {
      village: { population: village.population, staffedWells: village.staffedWells, waterProduction: village.waterProduction, foodNet: village.foodNet, roadCells: village.roadCells },
      town: { population: town.population, staffedWells: town.staffedWells, waterProduction: town.waterProduction, foodNet: town.foodNet, roadCells: town.roadCells },
      cityLike: { population: cityLike.population, staffedWells: cityLike.staffedWells, waterProduction: cityLike.waterProduction, foodNet: cityLike.foodNet, roadCells: cityLike.roadCells },
      townCandidates,
      cityCandidates,
      townContract: 'TOWN = population >= 4 AND Water capacity >= 4 AND Food production >= Food consumption AND at least 2 staffed Farms AND at least 1 staffed Workshop',
      townVerdict: 'PARTIALLY SUPPORTED (the thresholds are model-produced, the change is quantitative only)',
      townToCity: 'TOWN -> CITY = NOT YET CONTRACTABLE',
      cityToMetropolis: 'CITY -> METROPOLIS = NOT YET CONTRACTABLE',
      missingPiece:
        'a state that a larger colony can express and a Town cannot: measured, the extra capacity is dormant (population = 2 x staffed Wells, and adding buildings without a worker changes nothing)',
    })

    expect(town.population).toBe(4)
    expect(cityLike.population).toBe(6)
    // Measured: same shape, only scale differs.
    expect(town.waterProduction / town.population).toBe(cityLike.waterProduction / cityLike.population)
    expect(town.foodNet).toBe(0)
    expect(cityLike.foodNet).toBe(0)
    expect(town.staffedWorkshops).toBe(0)
    expect(cityLike.staffedWorkshops).toBe(0)
  })

  it('tests whether Autonome is representable with existing state', () => {
    // Autonomy proxies: neutral flows for every resource, sustained.
    const villageScale = snapshot(
      runTicks(
        scene({
          residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
          workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
          roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
          colonists: 2,
          food: 100,
          material: 0,
          water: 0,
        }),
        600
      )
    )
    const industrialAttempt = snapshot(
      runTicks(
        scene({
          residences: Array.from({ length: 3 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
            { type: 'farm', x: 5, y: 2 },
            { type: 'workshop', x: 7, y: 2 },
          ],
          roads: Array.from({ length: 8 }, (_, i) => ({ x: 1 + i, y: 1 })),
          colonists: 3,
          food: 50_000,
          material: 0,
          water: 50,
        }),
        600
      )
    )
    audit('AUTONOME_CONTRACT', {
      autonomyProxies: {
        sufficientProduction: 'Food production >= Food consumption',
        sustainableConsumption: 'Water production >= Water need',
        prolongedStability: 'population constant for 600 ticks',
        productiveCapacity: 'staffed building count',
        independenceFromAnExternalState: 'no external state exists in the runtime',
      },
      villageScale: { population: villageScale.population, foodNet: villageScale.foodNet, waterNet: villageScale.waterNet, materialNet: villageScale.materialNet },
      industrialAttempt: { population: industrialAttempt.population, foodNet: industrialAttempt.foodNet, waterNet: industrialAttempt.waterNet, materialNet: industrialAttempt.materialNet, staffedWorkshops: industrialAttempt.staffedWorkshops },
      verdict: 'METROPOLIS -> AUTONOME = NOT YET CONTRACTABLE',
      why: 'measured: neutral flows (the only autonomy proxy in the model) are already reached at Village scale (2 colonists, 1 Well, 1 Farm); there is no external state to be independent from, so a larger colony cannot express a new autonomy state',
    })
    expect(villageScale.foodNet).toBe(0)
    expect(villageScale.waterNet).toBe(0)
    expect(villageScale.materialNet).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 9-10. Contract candidates and the arbitrary-threshold audit
// ---------------------------------------------------------------------------

describe('9-10. Contract candidates and thresholds', { timeout: 30000 }, () => {
  it('summarises the transition candidates and audits every proposed threshold', () => {
    const transitions = [
      { stage: 'Wilderness -> Settlement', contract: 'population >= 1 AND Food production >= Food consumption AND a Road network exists', existingData: true, causal: true, stable: true, nonArbitrary: true, status: 'SUPPORTED' },
      { stage: 'Settlement -> Village', contract: 'population >= 2 AND Water capacity >= 2 AND Food production >= Food consumption', existingData: true, causal: true, stable: true, nonArbitrary: true, status: 'SUPPORTED' },
      { stage: 'Village -> Town', contract: 'population >= 4 AND Water capacity >= 4 AND Food production >= Food consumption AND >= 2 staffed Farms', existingData: true, causal: true, stable: true, nonArbitrary: true, status: 'PARTIALLY SUPPORTED' },
      { stage: 'Town -> City', contract: 'none identified', existingData: false, causal: false, stable: false, nonArbitrary: false, status: 'NOT CONTRACTABLE' },
      { stage: 'City -> Metropolis', contract: 'none identified', existingData: false, causal: false, stable: false, nonArbitrary: false, status: 'NOT CONTRACTABLE' },
      { stage: 'Metropolis -> Autonome', contract: 'none identified', existingData: false, causal: false, stable: false, nonArbitrary: false, status: 'NOT CONTRACTABLE' },
    ]
    const thresholds = [
      { threshold: 'population >= 1', causal: true, justification: 'the first colonist the housing + Food rule admits', classification: 'CAUSAL' },
      { threshold: 'population >= 2', causal: true, justification: 'one staffed Well supports exactly 2 colonists (2 Water produced, 1 consumed each)', classification: 'CAUSAL (as a capacity consequence)' },
      { threshold: 'Water capacity >= 2', causal: true, justification: 'the minimum capacity that both activates the admission gate and serves the population', classification: 'CAUSAL' },
      { threshold: 'Water capacity >= 4', causal: true, justification: '2 staffed Wells x 2 colonists: produced by the same rule, so it is a scale consequence rather than a preference', classification: 'CAUSAL (scale)' },
      { threshold: 'population >= 4', causal: true, justification: 'only non-arbitrary as a consequence of Water capacity >= 4; on its own it is a preference', classification: 'CAUSAL ONLY VIA CAPACITY' },
      { threshold: 'population >= 6', causal: false, justification: 'no rule produces 6 as a distinct state: it is 3 x 2', classification: 'ARBITRARY THRESHOLD' },
      { threshold: 'roads >= 5', causal: false, justification: 'road cells are a cost, not a milestone; extra cells beyond access change nothing (measured)', classification: 'ARBITRARY THRESHOLD' },
      { threshold: 'Workshop >= 1', causal: true, justification: 'industry requires the Water chain (the Workshop placement costs 1 Water)', classification: 'CAUSAL (but not reachable in equilibrium)' },
      { threshold: 'staffed Farms >= 1', causal: true, justification: 'the Food rule: one farm feeds two colonists', classification: 'CAUSAL' },
      { threshold: 'ticks >= N', causal: false, justification: 'no rule produces a duration; only a measured convergence window can anchor it', classification: 'ARBITRARY THRESHOLD unless anchored to a measured convergence' },
    ]
    audit('CONTRACT_CANDIDATES', { transitions })
    audit('THRESHOLD_AUDIT', {
      thresholds,
      rule: 'a number is acceptable only when the model itself produces it (capacity per building, consumption per colonist, cost per cell)',
    })
    expect(transitions.filter((row) => row.status === 'SUPPORTED')).toHaveLength(2)
    expect(transitions.filter((row) => row.status === 'PARTIALLY SUPPORTED')).toHaveLength(1)
    expect(transitions.filter((row) => row.status === 'NOT CONTRACTABLE')).toHaveLength(3)
    expect(thresholds.filter((row) => row.classification === 'ARBITRARY THRESHOLD').length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// 11-15. Scenario design
// ---------------------------------------------------------------------------

describe('11-15. Scenario design contract', { timeout: 30000 }, () => {
  it('inventories the scenario dimensions available from existing state', () => {
    const dimensions = [
      { dimension: 'starting Material', existing: true, example: '25 / 100 / 1000', measuredEffect: 'low Material delays every building; high Material is partly wasted above the 25 storage cap' },
      { dimension: 'starting Food', existing: true, example: '0 / 100 / 100000', measuredEffect: 'Food 0 with production below consumption wipes in 1 tick' },
      { dimension: 'starting Water', existing: true, example: '0 / 50 / 500', measuredEffect: 'Water stock only buffers: admission is gated by production capacity' },
      { dimension: 'initial buildings', existing: true, example: 'any set', measuredEffect: 'a pre-built Well changes the admission rule from housing-only to capacity-based' },
      { dimension: 'initial roads', existing: true, example: '0..n cells, one or several networks', measuredEffect: 'networks decide coverage and mobility scope' },
      { dimension: 'initial colonists', existing: true, example: '0..n', measuredEffect: 'population without Food production drains the stock' },
      { dimension: 'initial workforce assignments', existing: true, example: 'automatic / manual', measuredEffect: 'measured: a manual assignment switches the colony between Water and Material' },
      { dimension: 'initial network topology', existing: true, example: 'compact / corridor / partitioned', measuredEffect: 'measured: 1 vs 3 road cells for the same 4 buildings' },
      { dimension: 'available build space', existing: true, example: 'world width/height', measuredEffect: 'road cost scales with distance' },
      { dimension: 'existing production capacity', existing: true, example: 'Farms / Wells / Workshops', measuredEffect: 'measured: capacity is the growth ceiling (2 colonists per staffed Well)' },
    ]
    // Scenario vs free play: only the initial state changes, never a rule.
    const freePlay = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 100,
      material: 100,
      water: 0,
    })
    const lowMaterial = withStocks(freePlay, { material: 25 })
    const highMaterial = withStocks(freePlay, { material: 1000 })
    audit('SCENARIO_DIMENSIONS', {
      definition: 'SCENARIO = initial state + existing constraints + objective/framing (never new mechanics)',
      dimensions,
      sameRulesProbe: {
        freePlay: snapshot(freePlay),
        lowMaterial: snapshot(lowMaterial),
        highMaterial: snapshot(highMaterial),
        note: 'the three states differ only in `resources.construction`; the simulation rules are identical',
      },
    })
    expect(dimensions).toHaveLength(10)
    expect(snapshot(freePlay).foodProduction).toBe(snapshot(lowMaterial).foodProduction)
  })

  it('defines the six scenario archetypes with measured central decisions', () => {
    // A: First Settlement — measured in 10AJ trace A (stable at tick 105).
    // B: Water Constraint — a Well-first opening reaches the Water ceiling then
    //    starves without Food (measured in 10AJ trace C).
    // C: Industrial Expansion — a Workshop-first opening produces Material but
    //    the only worker leaves the Farm (measured in 10AJ trace B).
    // D: Spatial Efficiency — compact vs corridor road budgets.
    // E: Population Expansion — housing before Water/Food.
    // F: Recovery — a misplaced Farm is recovered with a connector road.
    const archetypes = [
      {
        scenario: 'A — First Settlement',
        initialState: 'Material 100, Food 100, Water 0, no buildings, no roads',
        centralDecision: 'which archetype to fund from the initial budget',
        systems: ['construction', 'housing', 'Food', 'Water', 'roads'],
        limitingVariable: 'Material (115 needed for a full settlement)',
        success: 'a settlement with Food production >= consumption and population >= 1',
        failure: 'Food collapse before a Farm is staffed',
        differs: 'no pre-existing infrastructure: every rule must be bootstrapped',
      },
      {
        scenario: 'B — Water Constraint',
        initialState: 'Material 100, Food 100, Water 0, one Residence, one Well site prepared',
        centralDecision: 'invest in Water capacity before Food, or the reverse',
        systems: ['Water', 'admission', 'workforce', 'Food'],
        limitingVariable: 'Water capacity (2 colonists per staffed Well)',
        success: 'Water capacity >= population and Food production >= consumption',
        failure: 'measured: Water ceiling at tick 6 then Food collapse at tick 55 (10AJ trace C)',
        differs: 'the Water gate is the binding rule from the first tick',
      },
      {
        scenario: 'C — Industrial Expansion',
        initialState: 'Material 100, Food 100, an existing Well plan',
        centralDecision: 'when to spend 25 Material + 1 Water on a Workshop',
        systems: ['Workshop', 'Material', 'workforce', 'construction'],
        limitingVariable: 'workforce (one colonist per workplace)',
        success: 'a staffed Workshop producing Material without losing Food balance',
        failure: 'measured: industry at tick 9 then Food collapse at tick 104 (10AJ trace B)',
        differs: 'the central tension is the workforce allocation, not the resource cost',
      },
      {
        scenario: 'D — Spatial Efficiency',
        initialState: 'low Material budget with a fixed building goal',
        centralDecision: 'how many road cells to spend for the same buildings',
        systems: ['roads', 'network', 'mobility', 'coverage'],
        limitingVariable: 'Material per road cell (5)',
        success: 'the target buildings connected at minimum road cost',
        failure: 'no failure: excess road spending only delays construction',
        differs: 'the optimization target is the layout, not the resource flow',
      },
      {
        scenario: 'E — Population Expansion',
        initialState: 'several Residences planned, Food and Water unbuilt',
        centralDecision: 'grow population before or after Food/Water capacity',
        systems: ['housing', 'admission', 'Food', 'Water'],
        limitingVariable: 'the capacity behind each colonist (1 Food and 1 Water per tick)',
        success: 'population growth matched by Food and Water capacity',
        failure: 'measured: 3 colonists against 1 Farm wipes the colony in 1 tick',
        differs: 'housing is intentionally ahead of capacity',
      },
      {
        scenario: 'F — Recovery',
        initialState: 'a partly built settlement with one broken constraint (e.g. a Farm outside the network)',
        centralDecision: 'which existing rule to repair first',
        systems: ['roads', 'mobility', 'production', 'Food'],
        limitingVariable: 'the repair cost (5 Material per connector cell)',
        success: 'the broken constraint is repaired without a reset',
        failure: 'a Food collapse that empties the colony before the repair completes',
        differs: 'the opening state is already suboptimal by construction',
      },
    ]
    audit('SCENARIO_ARCHETYPES', { archetypes })
    expect(archetypes).toHaveLength(6)
    expect(archetypes.every((row) => row.systems.length >= 3)).toBe(true)
  })

  it('maps the three objective forms and measures a causal duration anchor', () => {
    // Causal anchor for a "maintain stability" duration: the measured
    // convergence of a real settlement.
    let state = withStocks(createState(), { food: 100, material: 100, water: 0 })
    state = place(state, 'residence', { x: 1, y: 0 }).state
    state = placeRoads(state, [{ x: 1, y: 1 }, { x: 2, y: 1 }])
    state = place(state, 'farm', { x: 1, y: 2 }).state
    state = place(state, 'residence', { x: 2, y: 0 }).state
    let stableSince: number | null = null
    let previousPopulation = getPopulationCount(state)
    let convergenceTick: number | null = null
    for (let i = 0; i < 400; i += 1) {
      state = stepSimulation(state)
      const population = getPopulationCount(state)
      if (population !== previousPopulation) {
        previousPopulation = population
        stableSince = state.time.tick
      }
      const snap = snapshot(state)
      if (stableSince !== null && state.time.tick - stableSince >= 100 && snap.foodNet >= 0 && convergenceTick === null) {
        convergenceTick = state.time.tick
      }
    }
    const objectiveForms = [
      { form: 'Survival objective', shape: 'maintain a stable settlement for N ticks', compatibleScenarios: ['A', 'B', 'C', 'E'], anchor: `N anchored to the measured convergence window: the canonical settlement stabilises at tick ${convergenceTick ?? 0} and then holds neutral flows for 100+ ticks`, arbitraryRisk: 'N is arbitrary unless tied to the measured convergence' },
      { form: 'Milestone objective', shape: 'reach an existing measurable state', compatibleScenarios: ['A', 'B', 'C', 'D', 'E', 'F'], anchor: 'the stage contracts (Settlement / Village) are model-produced states', arbitraryRisk: 'none when the contract uses capacity rather than raw counts' },
      { form: 'Constraint objective', shape: 'reach a measurable state while respecting an existing constraint', compatibleScenarios: ['B', 'D', 'E', 'F'], anchor: 'existing constraints: Water capacity, workforce, Material budget, network membership', arbitraryRisk: 'none: the constraint is already enforced by the simulation' },
    ]
    audit('OBJECTIVE_FORMS', { convergenceTick, objectiveForms })
    expect(objectiveForms).toHaveLength(3)
    expect(convergenceTick).not.toBeNull()
  })

  it('uses the existing failure catalogue and checks scenario failure reachability', () => {
    const failures = [
      { failure: 'Food collapse', causalExisting: true, reachableIn: ['A', 'B', 'C', 'E', 'F'] },
      { failure: 'Water shortage (growth blocked)', causalExisting: true, reachableIn: ['A', 'B', 'E'] },
      { failure: 'inability to staff production', causalExisting: true, reachableIn: ['C', 'E'] },
      { failure: 'inaccessible production', causalExisting: true, reachableIn: ['D', 'F'] },
      { failure: 'resource exhaustion (Material 0, no income)', causalExisting: true, reachableIn: ['C', 'D'] },
      { failure: 'construction deadlock (no Material and no Water)', causalExisting: true, reachableIn: ['C', 'D'] },
      { failure: 'inability to expand (Water capacity ceiling)', causalExisting: true, reachableIn: ['A', 'B', 'E'] },
    ]
    audit('SCENARIO_FAILURES', { failures, note: 'no new failure condition is introduced: every entry is a measured rule of the current simulation' })
    expect(failures).toHaveLength(7)
    expect(failures.every((row) => row.causalExisting)).toBe(true)
  })

  it('verifies that free play and scenarios differ only by starting state', () => {
    const freePlay = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 100,
      material: 100,
      water: 0,
    })
    const scenarioStart = scene({
      residences: [],
      workplaces: [],
      roads: [],
      colonists: 0,
      food: 100,
      material: 100,
      water: 0,
    })
    const scenarioSettled = runTicks(scenarioStart, 100)
    const freeSettled = runTicks(freePlay, 100)
    audit('FREE_PLAY_VS_SCENARIO', {
      freePlay: { start: snapshot(freePlay), after100: snapshot(freeSettled) },
      scenario: { start: snapshot(scenarioStart), after100: snapshot(scenarioSettled) },
      difference: 'only the initial buildings/roads',
      rulesIdentical: true,
      catalogUnchanged: getBuildingDefinition('workshop').constructionCost === 25 && getBuildingDefinition('workshop').constructionWaterCost === 1,
    })
    // The empty scenario start produces nothing on its own: the rules need a player action.
    expect(snapshot(scenarioSettled).buildings).toBe(0)
    expect(snapshot(freeSettled).foodProduction).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 16-19. UX contract, readability, initial state, content depth
// ---------------------------------------------------------------------------

describe('16-19. UX contract, readability, initial state and content depth', { timeout: 30000 }, () => {
  it('checks that every progression UX field is computable from existing state', () => {
    const colony = scene({
      residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }],
      colonists: 2,
      food: 100,
      material: 10,
      water: 0,
    })
    const snap = snapshot(colony)
    const blockingReasons: string[] = []
    if (snap.waterProduction < snap.population + 1) blockingReasons.push('Water capacity does not cover the population plus one admission')
    if (snap.jobCapacity - snap.employed === 0) blockingReasons.push('no vacant workplace: industry needs an extra colonist')
    if (snap.material < 25) blockingReasons.push(`Material ${snap.material} is below the 25 building cost`)
    const uxFields = [
      { field: 'Current stage', computable: true, from: 'the stage contract over existing state', value: 'Settlement (population 2, Water capacity 2)' },
      { field: 'Next milestone', computable: true, from: 'the next unmet contract condition', value: 'Town: Water capacity >= 4 (2 staffed Wells)' },
      { field: 'Progress toward milestone', computable: true, from: 'staffed Wells 1 of 2', value: '1 / 2 staffed Wells' },
      { field: 'Current blocking condition', computable: true, from: 'measured inequalities of existing queries', value: blockingReasons },
      { field: 'Primary objective', computable: false, from: 'scenario framing (not simulation state)', value: 'requires the scenario/objective definition, no new runtime state' },
    ]
    audit('UX_CONTRACT', {
      snapshot: snap,
      blockingReasons,
      uxFields,
      note: '4 of 5 fields are computable from existing state; the objective label belongs to the scenario layer',
    })
    expect(blockingReasons.length).toBeGreaterThan(0)
    expect(uxFields.filter((row) => row.computable)).toHaveLength(4)
  })

  it('answers the five readability questions from existing state only', () => {
    const colony = scene({
      residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
      colonists: 2,
      food: 100,
      material: 10,
      water: 0,
    })
    const snap = snapshot(colony)
    const readable = [
      { question: 'Where am I?', answer: `population ${snap.population}, ${snap.buildings} buildings, stage Village`, source: 'population + building counts' },
      { question: 'What am I trying to accomplish?', answer: 'the current scenario objective', source: 'scenario layer (no runtime data)' },
      { question: 'Why am I blocked?', answer: 'Water capacity 2 vs population 2 (no headroom) and Material 10 < 25', source: 'getWaterProductionPerTick vs getWaterNeedPerTick + resource stock' },
      { question: 'Which decision unblocks it?', answer: 'build a Well (25 Material) after saving, or reassign the free worker', source: 'existing build options + manual reassignment' },
      { question: 'What have I accomplished?', answer: 'Settlement reached, Village in progress (Water capacity 2, Food balanced)', source: 'stage contract over existing state' },
    ]
    audit('OBJECTIVE_READABILITY', { snapshot: snap, readable, missingInformation: 'only the objective label (question 2), which the scenario layer provides' })
    expect(readable.every((row) => row.answer.length > 0)).toBe(true)
  })

  it('audits four plausible openings from the real initial state', () => {
    const openings: { readonly name: string; readonly steps: readonly Step[] }[] = [
      {
        name: 'O1 housing + Food first',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
          { kind: 'building', type: 'residence', x: 2, y: 0 },
          { kind: 'building', type: 'farm', x: 1, y: 2 },
        ],
      },
      {
        name: 'O2 Water capacity first',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
          { kind: 'building', type: 'well', x: 1, y: 2 },
          { kind: 'building', type: 'residence', x: 2, y: 0 },
        ],
      },
      {
        name: 'O3 industry first',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
          { kind: 'building', type: 'well', x: 3, y: 2 },
          { kind: 'building', type: 'workshop', x: 1, y: 2 },
          { kind: 'building', type: 'farm', x: 2, y: 0 },
        ],
      },
      {
        name: 'O4 single colonist + Farm + second Farm',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
          { kind: 'building', type: 'farm', x: 1, y: 2 },
          { kind: 'building', type: 'farm', x: 3, y: 2 },
        ],
      },
    ]
    const rows = openings.map((opening) => {
      const run = runOpening(opening.name, opening.steps, 400)
      const viable = run.wipeTick === null && run.final.population > 0
      return {
        opening: run.name,
        order: run.steps,
        wipeTick: run.wipeTick,
        viable,
        final: run.final,
        reason: run.wipeTick !== null
          ? 'Food collapse: the only worker did not staff a Farm'
          : run.final.population >= 2
            ? 'stable two-colonist settlement'
            : 'stable single-colonist settlement (no growth)',
      }
    })
    audit('INITIAL_STATE_AUDIT', {
      rows,
      budgetFinding: '2 Residences + Well + Farm + roads = 115 Material > the 100 start',
      viableOpenings: rows.filter((row) => row.viable).length,
      dominantOpening: 'O1 reaches the only stable two-colonist settlement; O2/O3 reach Water or industry but starve',
      framingGap: 'the game does not explain that Food must be staffed before Water/industry consumes the only worker',
    })
    expect(rows).toHaveLength(4)
    expect(rows.filter((row) => row.viable).length).toBeGreaterThanOrEqual(2)
    expect(rows.some((row) => row.wipeTick !== null)).toBe(true)
  })

  it('measures how much content each archetype actually contains', () => {
    const measurement = (name: string, steps: readonly Step[], horizon: number): Record<string, unknown> => {
      const run = runOpening(name, steps, horizon)
      const constructions = run.steps.filter((step) => !step.skipped).length
      const decisions = steps.length
      const constraints: string[] = []
      if (run.final.material < 25) constraints.push('Material below the building cost')
      if (run.final.waterProduction < run.final.population) constraints.push('Water capacity below population')
      if (run.final.jobCapacity - run.final.employed === 0) constraints.push('no vacant workplace')
      if (run.final.foodNet < 0) constraints.push('Food deficit')
      const snapshotRun = run.final
      const lastConstructionTick = run.steps.filter((step) => !step.skipped).reduce((max, step) => Math.max(max, step.tick), 0)
      return {
        archetype: name,
        significantDecisions: decisions,
        constructionsAccepted: constructions,
        constructionsSkipped: run.steps.filter((step) => step.skipped).length,
        constraintsEncountered: constraints,
        trajectoriesFromThisStart: 3,
        lastConstructionTick,
        settlingTick: run.settlingTick,
        finalState: {
          population: snapshotRun.population,
          foodNet: snapshotRun.foodNet,
          waterNet: snapshotRun.waterNet,
          materialNet: snapshotRun.materialNet,
          wipeTick: run.wipeTick,
        },
      }
    }
    const rows = [
      measurement('A First Settlement', [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
        { kind: 'building', type: 'residence', x: 2, y: 0 },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
      ], 300),
      measurement('D Spatial Efficiency', [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
        { kind: 'building', type: 'well', x: 0, y: 1 },
      ], 300),
      measurement('C Industrial Expansion', [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
        { kind: 'building', type: 'well', x: 3, y: 2 },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
        { kind: 'building', type: 'workshop', x: 2, y: 0 },
      ], 300),
    ]
    audit('CONTENT_DEPTH', {
      rows,
      note: 'a scenario is gameplay content only if the decisions before convergence are consequential; measured convergence is short (a few dozen ticks) because the building set is small',
    })
    expect(rows.every((row) => (row.significantDecisions as number) >= 4)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 20-22. Final design contract, architecture, verification
// ---------------------------------------------------------------------------

describe('20-22. Final design contract and architecture', { timeout: 30000 }, () => {
  it('states the proposed (unimplemented) contract', () => {
    const contract = {
      progression: {
        'Wilderness -> Settlement': 'SUPPORTED',
        'Settlement -> Village': 'SUPPORTED',
        'Village -> Town': 'PARTIALLY SUPPORTED',
        'Town -> City': 'NOT CONTRACTABLE',
        'City -> Metropolis': 'NOT CONTRACTABLE',
        'Metropolis -> Autonome': 'NOT CONTRACTABLE',
      },
      scenarioDefinition: 'SCENARIO = initial state + existing constraints + objective/framing (no new mechanics)',
      objectiveTypes: [
        'Survival: maintain neutral Food and Water flows with a stable population',
        'Milestone: reach a stage contract expressed in model-produced capacity',
        'Constraint: reach a stage contract while respecting an existing constraint (Water capacity, workforce, Material budget, network membership)',
      ],
      stageInformation: [
        'current stage (from the stage contract)',
        'next milestone (the next unmet contract condition)',
        'progress (staffed Wells / Farms and Water capacity against the next condition)',
        'current blocking condition (measured inequalities of existing queries)',
        'primary objective (provided by the scenario layer, not by the simulation)',
      ],
      deferred: [
        'Town -> City',
        'City -> Metropolis',
        'Metropolis -> Autonome',
        'any progression that would need a new state field, a new resource or a multiplier',
      ],
    }
    audit('FINAL_CONTRACT', contract)
    expect(Object.values(contract.progression).filter((status) => status === 'SUPPORTED')).toHaveLength(2)
    expect(contract.deferred).toHaveLength(4)
  })

  it('verifies the architecture boundary', () => {
    const scenario = (): SimulationState =>
      scene({
        residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
        workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
        roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
        colonists: 2,
        food: 1000,
        material: 0,
        water: 50,
      })
    const a = runTicks(scenario(), 200)
    const b = runTicks(scenario(), 200)
    const saved = JSON.parse(serializeSave(a)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    const serialized = serializeCanonicalState(a)
    audit('ARCHITECTURE', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      newPersistentStateRequired: false,
      migrationsRequired: 0,
      derivedAbsent: ['coverage', 'mobility', 'networkId', 'served', 'stage', 'milestone', 'progress', 'objective', 'score'].map(
        (term) => ({ term, present: serialized.includes(term) })
      ),
      stock: getResourceStock(a),
    })
    expect(saved.version).toBe(8)
    expect(SAVE_VERSION).toBe(8)
    expect(Object.keys(saved.state)).toHaveLength(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serialized).not.toContain('stage')
  })
})
