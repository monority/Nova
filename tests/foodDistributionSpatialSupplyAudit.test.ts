/**
 * Step 10AG — Food Distribution & Spatial Supply Audit.
 *
 * AUDIT ONLY. `src/` is untouched: every number below is measured from the
 * real runtime (`stepSimulation`, `applyCommand`, the derived queries).
 * Fixtures use direct domain operations (createBuilding / createRoads /
 * createColonist + assignJobs), the convention of the previous audits.
 *
 * Food is expected to be GLOBAL (one colony-wide stock) while Water is
 * LOCALIZED (road network -> coverage -> served Residence). This audit
 * measures exactly what that difference costs and what it hides.
 *
 * Layout convention: residences on y=0, roads on y=1, workplaces on y=2, so a
 * workplace at (x, 2) is road-adjacent to (x, 1).
 *
 * Run:
 *   npx vitest run tests/foodDistributionSpatialSupplyAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getColonistWorkMobility,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getRoadNetworks,
  getServedColonistCount,
  getVacantOperationalFarmCount,
  getWaterCoverage,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterShortage,
  hashCanonicalState,
  iterateBuildings,
  iterateColonists,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validatePlacement,
  validateReassignment,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10ag', width: 32, height: 24 },
}

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

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ag: building missing')
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
  if (id === undefined) throw new Error('10ag: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ag: road missing')
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

interface WorldSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly Placement[]
  readonly roads?: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const world = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 10_000,
    material: spec.material ?? 500,
    water: spec.water ?? 50,
  })
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) {
    state = op(state, placement.type, placement.x, placement.y)
  }
  for (const cell of spec.roads ?? []) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

/** Horizontal road row on y=1 from x=0 to maxX. */
const rowRoads = (maxX: number): CellCoordinate[] =>
  Array.from({ length: maxX + 1 }, (_, x) => ({ x, y: 1 }))

/** Compact row colony: residences y=0, road row y=1, workplaces y=2. */
const rowColony = (
  residenceCount: number,
  counts: { readonly farms: number; readonly wells: number; readonly workshops?: number },
  order: readonly BuildingType[] = ['farm', 'well', 'workshop'],
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number } = {},
  colonists = residenceCount
): SimulationState => {
  const residences = Array.from({ length: residenceCount }, (_, i) => ({ x: 1 + 2 * i, y: 0 }))
  const workplaces: Placement[] = []
  let col = residenceCount
  for (const type of order) {
    const n = type === 'farm' ? counts.farms : type === 'well' ? counts.wells : counts.workshops ?? 0
    for (let i = 0; i < n; i += 1) {
      workplaces.push({ type, x: 1 + 2 * col, y: 2 })
      col += 1
    }
  }
  const maxX = 1 + 2 * Math.max(col - 1, residenceCount - 1) + 1
  return world({ residences, workplaces, roads: rowRoads(maxX), colonists, ...stocks })
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
  readonly waterShortage: boolean
  readonly servedResidences: number
  readonly servedColonists: number
  readonly material: number
  readonly materialNet: number
  readonly employed: number
  readonly unemployed: number
  readonly staffedFarms: number
  readonly vacantFarms: number
  readonly staffedWells: number
  readonly networks: number
  readonly networkSizes: readonly number[]
  readonly mobilityConnected: number
  readonly roads: number
  readonly housingAvailable: number
}

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const networks = getRoadNetworks(state)
  const foodProduction = getFoodProductionPerTick(state)
  const foodConsumption = getFoodConsumptionPerTick(state)
  const waterProduction = getWaterProductionPerTick(state)
  const waterNeed = getWaterNeedPerTick(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    foodProduction,
    foodConsumption,
    foodNet: foodProduction - foodConsumption,
    water: state.resources.water,
    waterProduction,
    waterNeed,
    waterNet: waterProduction - waterNeed,
    waterShortage: getWaterShortage(state),
    servedResidences: getWaterServedResidenceCount(state),
    servedColonists: getServedColonistCount(state),
    material: state.resources.construction,
    materialNet: getNetMaterialPerTick(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    staffedFarms: countStaffedOperationalFarms(state),
    vacantFarms: getVacantOperationalFarmCount(state),
    staffedWells: [...iterateBuildings(state)].filter(
      (building) => building.type === 'well' && countWorkersAt(state, building.id) > 0
    ).length,
    networks: networks.length,
    networkSizes: networks.map((network) => network.length),
    mobilityConnected: [...iterateColonists(state)].filter(
      (colonist) => getColonistWorkMobility(state, colonist.id).mobilityConnected
    ).length,
    roads: Object.keys(state.roads).length,
    housingAvailable: getHousingSummary(state).availableCapacity,
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

/** Ticks until the colony population reaches 0 (or `maxTicks`). */
const ticksUntilWipe = (state: SimulationState, maxTicks = 400): number => {
  let current = state
  for (let i = 0; i < maxTicks; i += 1) {
    current = stepSimulation(current)
    if (getPopulationCount(current) === 0) return i + 1
  }
  return -1
}

const farmIds = (state: SimulationState): readonly string[] =>
  [...iterateBuildings(state)].filter((b) => b.type === 'farm').map((b) => b.id)

const workerCountsByFarm = (state: SimulationState): readonly number[] =>
  farmIds(state).map((id) => countWorkersAt(state, id))

const affordableAt = (state: SimulationState, type: BuildingType, cell: CellCoordinate): boolean =>
  getPlacementAffordability(state, cell, type).affordable

// ---------------------------------------------------------------------------
// 1. Current Food model versus the Water model
// ---------------------------------------------------------------------------

describe('1. Current Food model versus the Water model', { timeout: 30000 }, () => {
  it('measures the global Food chain and the local Water chain on one colony', () => {
    const colony = rowColony(2, { farms: 1, wells: 1 }, ['farm', 'well'], { food: 100 }, 2)
    const start = snapshot(colony)
    const after1 = snapshot(stepSimulation(colony))
    const settled = snapshot(runTicks(colony, 60))
    audit('CURRENT_MODEL', {
      foodChain: 'Farm -> one colony-wide Food stock -> colony-wide consumption -> population',
      waterChain: 'Well -> 09D road networks (coverage) -> served Residence -> served colonist consumption',
      start,
      afterOneTick: after1,
      settled,
      foodRules: {
        production: 'staffed, operational, road-accessible Farms x 2',
        consumption: '1 per colonist, all-or-nothing for the whole colony',
        locality: 'none: no distance, no network, no delivery',
        cap: 'none',
      },
      waterRules: {
        production: 'staffed, operational, road-accessible Wells x 2',
        consumption: '1 per water-SERVED colonist',
        locality: 'coverage is per road network',
        cap: 'none',
      },
    })
    expect(start.foodProduction).toBe(2)
    expect(start.foodConsumption).toBe(2)
    expect(settled.population).toBe(2)
    expect(settled.foodNet).toBe(0)
  })

  it('shows Food crossing a network boundary that blocks Water', () => {
    // Network A (x 0..3): Residence A + Well A. Network B (x 8..11):
    // Residence B + Farm B. Food produced on B feeds Residence A; Water
    // produced on A does NOT serve Residence B.
    const split = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 3, y: 2 },
        { type: 'farm', x: 9, y: 2 },
      ],
      roads: [
        ...rowRoads(3),
        ...Array.from({ length: 4 }, (_, i) => ({ x: 8 + i, y: 1 })),
      ],
      colonists: 2,
      food: 0,
      water: 50,
    })
    const settled = runTicks(split, 60)
    const snap = snapshot(settled)
    const coverage = getWaterCoverage(settled)
    audit('CROSS_NETWORK', {
      snapshot: snap,
      servedResidenceIds: coverage.servedResidenceIds,
      note: 'Farm B feeds the colonist of Residence A (Food is global) while Well A serves only Residence A (Water is local)',
    })
    expect(snap.networks).toBe(2)
    expect(snap.foodProduction).toBe(2)
    expect(snap.foodConsumption).toBe(2)
    expect(snap.population).toBe(2) // nobody starves: Food crossed the boundary
    expect(snap.servedResidences).toBe(1) // Water did not cross it
  })
})

// ---------------------------------------------------------------------------
// 2. Food spatial blind spots
// ---------------------------------------------------------------------------

describe('2. Food spatial blind spots (same buildings, different layouts)', { timeout: 30000 }, () => {
  it('compares compact / corridor / partition / remote farm / remote residence', () => {
    const compact = rowColony(2, { farms: 1, wells: 1 }, ['farm', 'well'], {}, 2)

    const corridor = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 8 },
        { type: 'well', x: 3, y: 8 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 1, y: 5 },
        { x: 1, y: 6 },
        { x: 1, y: 7 },
        { x: 2, y: 7 },
        { x: 3, y: 7 },
      ],
      colonists: 2,
    })

    // Partition: Farm on network A, Well on network B.
    const partition = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })

    // Remote farm: the Farm exists but has no road at all.
    const remoteFarm = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 20, y: 20 },
        { type: 'well', x: 1, y: 2 },
      ],
      roads: rowRoads(4),
      colonists: 2,
    })

    // Remote residence: the second Residence has no road, the Farm is local.
    const remoteResidence = world({
      residences: [
        { x: 1, y: 0 },
        { x: 20, y: 20 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: rowRoads(4),
      colonists: 2,
    })

    const layouts = [
      { layout: 'compact', state: compact },
      { layout: 'corridor', state: corridor },
      { layout: 'partition', state: partition },
      { layout: 'remote-farm', state: remoteFarm },
      { layout: 'remote-residence', state: remoteResidence },
    ].map((entry) => {
      const settled = runTicks(entry.state, 60)
      return { layout: entry.layout, settled: snapshot(settled), assignment: workerCountsByFarm(settled) }
    })
    audit('FOOD_SPATIAL_BLIND_SPOTS', {
      layouts,
      question: 'does the position of a Farm change anything directly?',
      answer:
        'Food itself is position-independent: only the WORKER mobility changes. remote-farm loses its worker (production 0); remote-residence loses its worker (unemployment) but still eats from the global stock',
    })

    const byLayout = (name: string) =>
      (layouts as { layout: string; settled: Snapshot; assignment: number[] }[]).find((row) => row.layout === name)
    expect(byLayout('compact')?.settled.foodNet).toBe(0)
    expect(byLayout('corridor')?.settled.foodNet).toBe(0)
    expect(byLayout('partition')?.settled.foodNet).toBe(0)
    // Remote farm: no worker reaches it, so production stops and the colony
    // lives on the stock only.
    expect(byLayout('remote-farm')?.settled.foodProduction).toBe(0)
    expect(byLayout('remote-farm')?.settled.foodNet).toBe(-2)
    // Remote residence: its colonist is unemployed but still fed globally.
    expect(byLayout('remote-residence')?.settled.population).toBe(2)
    expect(byLayout('remote-residence')?.settled.unemployed).toBe(1)
    expect(byLayout('remote-residence')?.settled.foodNet).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Farm workforce versus Food logistics
// ---------------------------------------------------------------------------

describe('3. Farm workforce versus Food logistics', { timeout: 30000 }, () => {
  it('measures the worker-mobility gate on production', () => {
    const accessible = rowColony(2, { farms: 1, wells: 1 }, ['farm', 'well'], {}, 2)
    const inaccessible = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 20, y: 20 },
        { type: 'well', x: 1, y: 2 },
      ],
      roads: rowRoads(4),
      colonists: 2,
    })
    const twoFarms = world({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: rowRoads(4),
      colonists: 1,
    })
    // Near Farm at distance 0 and far Farm at distance 4: the near one wins.
    const nearFar = world({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 5, y: 2 },
      ],
      roads: rowRoads(6),
      colonists: 1,
    })

    const rows = [
      { scenario: 'farm-inaccessible', state: inaccessible },
      { scenario: 'farm-accessible', state: accessible },
      { scenario: 'two-farms-one-worker', state: twoFarms },
      { scenario: 'near-farm-and-far-farm', state: nearFar },
    ].map((entry) => {
      const settled = runTicks(entry.state, 30)
      return { scenario: entry.scenario, snapshot: snapshot(settled), assignment: workerCountsByFarm(settled) }
    })
    audit('FARM_WORKFORCE', {
      rows,
      note: 'production follows the WORKER: an unreachable Farm produces 0 and a reachable one produces 2, with no Food delivery anywhere',
    })

    const byScenario = (name: string) =>
      (rows as { scenario: string; snapshot: Snapshot; assignment: number[] }[]).find(
        (row) => row.scenario === name
      )
    expect(byScenario('farm-inaccessible')?.snapshot.foodProduction).toBe(0)
    expect(byScenario('farm-accessible')?.snapshot.foodProduction).toBe(2)
    expect(byScenario('two-farms-one-worker')?.snapshot.foodProduction).toBe(2)
    expect(byScenario('two-farms-one-worker')?.snapshot.vacantFarms).toBe(1)
    expect(byScenario('near-farm-and-far-farm')?.assignment).toEqual([1, 0])
  })

  it('measures manual assignment across and within networks', () => {
    const state = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 9, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 1,
      food: 1000,
    })
    const colonistId = Object.keys(state.colonists)[0]
    const farms = farmIds(state)
    const farmA = farms[0]
    const farmB = farms[1]
    if (colonistId === undefined || farmA === undefined || farmB === undefined) {
      throw new Error('10ag: fixture incomplete')
    }
    // The colonist lives on network A; Farm A is on A and Farm B on B.
    const homeAssignment = workerCountsByFarm(state)
    const toOwnFarm = validateReassignment(state, colonistId, farmA)
    const toForeignFarm = validateReassignment(state, colonistId, farmB)
    const crossNetwork = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId,
      workplaceId: farmB,
    })
    const toOwnSettled = runTicks(
      stepSimulation(state, { type: 'reassignColonist', colonistId, workplaceId: farmA }),
      30
    )
    audit('MANUAL_FARM_ASSIGNMENT', {
      homeAssignment,
      toOwnFarm: toOwnFarm.valid ? 'valid' : toOwnFarm.reason,
      toForeignFarm: toForeignFarm.valid ? 'valid' : toForeignFarm.reason,
      crossNetworkAfter: snapshot(crossNetwork),
      toOwnSettled: snapshot(toOwnSettled),
      note: 'the mobility rule (09K) is the only spatial gate on Food production; it rejects a residence-to-farm assignment across networks',
    })
    expect(toOwnFarm.valid).toBe(true)
    expect(toForeignFarm.valid).toBe(false)
    expect(snapshot(crossNetwork).foodProduction).toBe(snapshot(state).foodProduction)
    expect(snapshot(toOwnSettled).foodProduction).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 4. Food storage versus Food distribution
// ---------------------------------------------------------------------------

describe('4. Food storage versus Food distribution', { timeout: 30000 }, () => {
  it('A — measures how long a global Food stock absorbs a production outage', () => {
    const rows = [0, 5, 20, 100].map((food) => {
      const state = world({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: 20, y: 20 },
          { type: 'well', x: 1, y: 2 },
        ],
        roads: rowRoads(4),
        colonists: 2,
        food,
      })
      return { food, wipeTick: ticksUntilWipe(state, 200), consumptionPerTick: getFoodConsumptionPerTick(state) }
    })
    audit('FOOD_STORAGE_OUTAGE', {
      rows,
      note: 'the global stock IS the storage: it absorbs exactly stock / consumption ticks and then the colony is wiped in one tick',
    })
    for (const row of rows as { food: number; wipeTick: number; consumptionPerTick: number }[]) {
      expect(row.consumptionPerTick).toBe(2)
    }
    const zero = (rows as { food: number; wipeTick: number }[]).find((row) => row.food === 0)
    const hundred = (rows as { food: number; wipeTick: number }[]).find((row) => row.food === 100)
    expect(zero?.wipeTick).toBe(1)
    expect(hundred?.wipeTick).toBeGreaterThan(40)
  })

  it('B — measures that a local model would separate Residence A from Farm B', () => {
    // Farm B feeds Residence A today (global). A local model would require a
    // chain Farm B -> Residence A; today the only requirement is a worker.
    const state = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 9, y: 2 },
        { type: 'well', x: 1, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
      food: 0,
    })
    const settled = runTicks(state, 60)
    const snap = snapshot(settled)
    audit('FOOD_DISTRIBUTION_COUNTERFACTUAL', {
      networks: snap.networks,
      foodProduction: snap.foodProduction,
      foodConsumption: snap.foodConsumption,
      population: snap.population,
      food: snap.food,
      waterServedResidences: snap.servedResidences,
      note: 'today Farm B feeds both Residences while Well A serves only its own network; a local Food model would need Farm B -> Residence A delivery',
    })
    expect(snap.networks).toBe(2)
    expect(snap.population).toBe(2)
    expect(snap.food).toBe(0) // exactly consumed: nobody starves, nobody accumulates
  })
})

// ---------------------------------------------------------------------------
// 5. Partition test
// ---------------------------------------------------------------------------

describe('5. Partition test', { timeout: 30000 }, () => {
  const splitColony = (): SimulationState =>
    world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 9, y: 2 },
        { type: 'well', x: 1, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
      food: 1000,
      water: 50,
    })

  it('breaks Farm A and measures the outcome', () => {
    // Farm A is replaced by an under-construction site: it exists but produces
    // nothing, and the Food chain has no alternative but the global stock.
    const base = splitColony()
    const farms = farmIds(base)
    const farmA = farms[0]
    if (farmA === undefined) throw new Error('10ag: no farm A')
    const broken: SimulationState = {
      ...base,
      buildings: {
        ...base.buildings,
        [farmA]: { ...base.buildings[farmA]!, status: 'underConstruction', constructionRemaining: 2 },
      },
    }
    const healthy = runTicks(base, 60)
    const settledBroken = runTicks(broken, 60)
    audit('PARTITION_BREAK_FARM', {
      healthy: snapshot(healthy),
      farmABroken: snapshot(settledBroken),
      note: 'breaking one Farm reduces total Food by 2/tick; the other Farm keeps feeding BOTH networks and Water service is unaffected',
    })
    expect(snapshot(healthy).foodProduction).toBe(4)
    expect(snapshot(settledBroken).foodProduction).toBe(2)
    expect(snapshot(settledBroken).population).toBe(2)
  })

  it('breaks Residence A (isolated, still fed) and compares with Water', () => {
    // Residence A is moved off the road network: its colonist cannot reach any
    // workplace (unemployed) but keeps eating from the global stock, whereas
    // the Water coverage of its network is unchanged (the Well is on A).
    const isolated = world({
      residences: [
        { x: 1, y: 0 },
        { x: 20, y: 20 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      colonists: 2,
      food: 1000,
      water: 50,
    })
    const settled = runTicks(isolated, 60)
    const snap = snapshot(settled)
    audit('PARTITION_BREAK_RESIDENCE', {
      snapshot: snap,
      note: 'the isolated Residence cannot work (unemployment) but is still fed globally; Water coverage is unaffected because the Well sits on its own network',
    })
    expect(snap.population).toBe(2)
    expect(snap.unemployed).toBe(1)
    expect(snap.foodNet).toBe(0) // production 2 vs consumption 2
  })

  it('measures the Water counter-example on the same partition', () => {
    // Two networks, one Well on A: only A is served, so a colonist on B is
    // not water-served even though Food crosses freely.
    const state = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
      food: 1000,
    })
    const snap = snapshot(state)
    const coverage = getWaterCoverage(state)
    audit('PARTITION_WATER_COUNTER_EXAMPLE', {
      snapshot: snap,
      servedResidenceIds: coverage.servedResidenceIds,
      servedColonistIds: coverage.servedColonistIds,
    })
    expect(snap.networks).toBe(2)
    expect(snap.servedResidences).toBe(1)
    expect(snap.servedColonists).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Failure modes
// ---------------------------------------------------------------------------

describe('6. Food failure modes', { timeout: 30000 }, () => {
  it('runs the seven required Food states and measures duration and recovery', () => {
    const baseColony = (food: number, farmAccessible = true): SimulationState =>
      world({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: farmAccessible ? 1 : 20, y: farmAccessible ? 2 : 20 },
          { type: 'well', x: 3, y: 2 },
        ],
        roads: rowRoads(4),
        colonists: 2,
        food,
        water: 50,
      })

    // Food exactly balanced needs a production source: 1 Farm vs 2 colonists.
    const cases = [
      { name: 'food-equals-zero', state: rowColony(2, { farms: 0, wells: 1 }, ['well'], { food: 0 }, 2), ticks: 10 },
      { name: 'food-below-population', state: rowColony(2, { farms: 0, wells: 1 }, ['well'], { food: 1 }, 2), ticks: 10 },
      { name: 'food-equals-population', state: rowColony(2, { farms: 1, wells: 1 }, ['farm', 'well'], { food: 0 }, 2), ticks: 60 },
      { name: 'food-above-population', state: rowColony(2, { farms: 2, wells: 1 }, ['farm', 'well'], { food: 50 }, 2), ticks: 60 },
      { name: 'farm-inaccessible', state: baseColony(50, false), ticks: 60 },
      { name: 'farm-accessible-unstaffed', state: rowColony(2, { farms: 1, wells: 2 }, ['well', 'farm'], { food: 50 }, 2), ticks: 60 },
      { name: 'farm-accessible-staffed', state: rowColony(2, { farms: 1, wells: 1 }, ['farm', 'well'], { food: 50 }, 2), ticks: 60 },
    ]

    const rows = cases.map((entry) => {
      const settled = runTicks(entry.state, entry.ticks)
      const start = snapshot(entry.state)
      const end = snapshot(settled)
      const wipeTick = ticksUntilWipe(entry.state, 200)
      return {
        name: entry.name,
        ticks: entry.ticks,
        start: { population: start.population, food: start.food, foodNet: start.foodNet },
        end: {
          population: end.population,
          food: end.food,
          foodNet: end.foodNet,
          staffedFarms: end.staffedFarms,
          waterShortage: end.waterShortage,
        },
        wipeTick,
      }
    })
    audit('FOOD_FAILURE_MODES', {
      rows,
      classification: {
        'food-equals-zero': { outcome: 'wipe in 1 tick', recoverable: false, playerControllable: true },
        'food-below-population': { outcome: 'wipe in 1 tick', recoverable: false, playerControllable: true },
        'food-equals-population': { outcome: 'stable at 0 stock, nobody admitted', recoverable: true, playerControllable: true },
        'food-above-population': { outcome: 'stable, reserves accumulate', recoverable: true, playerControllable: true },
        'farm-inaccessible': { outcome: 'production 0, colony lives on the stock', recoverable: true, playerControllable: true },
        'farm-accessible-unstaffed': { outcome: 'production 0 (the Well took the only worker first)', recoverable: true, playerControllable: true },
        'farm-accessible-staffed': { outcome: 'production 2, balanced', recoverable: true, playerControllable: true },
      },
      note: 'Food shortage is terminal and all-or-nothing, and that brutality is independent of distribution: it follows from the colony-wide consumption rule, not from transport',
    })

    const byName = (name: string) =>
      (rows as { name: string; start: { foodNet: number }; end: { population: number; food: number; foodNet: number; staffedFarms: number }; wipeTick: number }[]).find(
        (row) => row.name === name
      )
    expect(byName('food-equals-zero')?.wipeTick).toBe(1)
    expect(byName('food-below-population')?.wipeTick).toBe(1)
    expect(byName('food-equals-population')?.end.foodNet).toBe(0)
    expect(byName('food-equals-population')?.wipeTick).toBe(-1)
    expect(byName('food-above-population')?.end.food).toBeGreaterThan(50)
    expect(byName('farm-inaccessible')?.start.foodNet).toBe(-2)
    expect(byName('farm-inaccessible')?.wipeTick).toBeGreaterThan(0)
    expect(byName('farm-accessible-unstaffed')?.start.foodNet).toBe(-2)
    expect(byName('farm-accessible-staffed')?.end.foodNet).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7-8. Hypotheses and spatial value
// ---------------------------------------------------------------------------

describe('7-8. Hypotheses and spatial value of Food', { timeout: 30000 }, () => {
  it('compares four layouts with the same building count', () => {
    const compact = rowColony(2, { farms: 1, wells: 1, workshops: 1 }, ['farm', 'well', 'workshop'], {}, 3)
    const corridor = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 8 },
        { type: 'well', x: 3, y: 8 },
        { type: 'workshop', x: 5, y: 8 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 1, y: 5 },
        { x: 1, y: 6 },
        { x: 1, y: 7 },
        { x: 2, y: 7 },
        { x: 3, y: 7 },
        { x: 4, y: 7 },
        { x: 5, y: 7 },
      ],
      colonists: 3,
    })
    const partition = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 9, y: 2 },
        { type: 'workshop', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })
    const remoteFarm = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 20, y: 20 },
        { type: 'well', x: 1, y: 2 },
        { type: 'workshop', x: 3, y: 2 },
      ],
      roads: rowRoads(4),
      colonists: 3,
    })

    const rows = [
      { layout: 'compact', state: compact },
      { layout: 'corridor', state: corridor },
      { layout: 'partition', state: partition },
      { layout: 'remote-farm', state: remoteFarm },
    ].map((entry) => {
      const settled = runTicks(entry.state, 120)
      const snap = snapshot(settled)
      return {
        layout: entry.layout,
        food: snap.food,
        foodProduction: snap.foodProduction,
        foodNet: snap.foodNet,
        water: snap.water,
        waterNet: snap.waterNet,
        material: snap.material,
        materialNet: snap.materialNet,
        population: snap.population,
        employed: snap.employed,
        unemployed: snap.unemployed,
        roads: snap.roads,
        networks: snap.networks,
        servedResidences: snap.servedResidences,
      }
    })
    audit('SPATIAL_VALUE', {
      rows,
      hypotheses: {
        H1_foodGlobal: 'supported: the only layout effect measured is on WORKER mobility, not on Food itself',
        H2_foodLocal: 'not supported: no measured scenario needs a Food chain, only a reachable worker',
        H3_storageFirst: 'the global stock already is an unbounded buffer',
        H4_redundantWithWater: 'supported: a Food distribution would reproduce network -> coverage -> served Residence',
        H5_newStrategicLayer: 'not supported: every measured difference is already a workforce/layout decision',
      },
    })
    expect(rows.length).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 9-10. Classification and the pass criteria
// ---------------------------------------------------------------------------

describe('9-10. Candidate classification and pass criteria', { timeout: 30000 }, () => {
  it('classifies the five options from measured evidence', () => {
    const classification = [
      {
        option: 'A — Food storage',
        classification: 'C — weak',
        evidence:
          'the global stock already absorbs exactly stock/consumption ticks of outage (0 -> wipe in 1 tick; 100 -> more than 40 ticks); a storage system would only bound the buffer, not create a dependency',
      },
      {
        option: 'B — Food distribution',
        classification: 'D — premature',
        evidence:
          'Food already crosses network boundaries (Farm B feeds Residence A) while Water does not; the only spatial gate that exists is the worker mobility rule (09K), so a distribution system would duplicate network -> coverage -> served Residence',
      },
      {
        option: 'C — Farm service/coverage',
        classification: 'D — premature',
        evidence:
          'a Farm already requires a mobility-connected worker (measured: an unreachable Farm produces exactly 0); coverage of residences would add the Water shape on top of that',
      },
      {
        option: 'D — Farm input',
        classification: 'E — rejected',
        evidence:
          'a per-tick Farm input competes with population for the same Water/Food capacity and attacks the bootstrap root (Food must exist before the first Well can be staffed); 10AE already measured this',
      },
      {
        option: 'E — No change (Food stays global)',
        classification: 'A — fundamental',
        evidence:
          'the current global Food model already produces the emergent constraints (worker mobility gates farm output, starvation is terminal, surplus is unbounded) without adding a system',
      },
    ]
    audit('CLASSIFICATION', { classification })

    const passCriteria = [
      { criterion: '1 spatial consequence currently absent', satisfied: false, evidence: 'inaccessible Farm already loses its worker and produces 0' },
      { criterion: '2 new player decision', satisfied: false, evidence: 'the decision is already "place the Farm inside the worker network"' },
      { criterion: '3 interacts with >= 2 systems', satisfied: true, evidence: 'roads + farms + population would interact, but by duplication' },
      { criterion: '4 clear difference from Water coverage', satisfied: false, evidence: 'a Food service would be network -> coverage -> served Residence, identical to Water' },
      { criterion: '5 possible recovery', satisfied: true, evidence: 'food shortages are player-recoverable while the stock lasts' },
      { criterion: '6 no catastrophic bootstrap loop', satisfied: true, evidence: 'the first Farm still needs only a road for its worker' },
      { criterion: '7 localizable without a generic framework', satisfied: true, evidence: 'it would reuse getRoadNetworks/getBuildingRoadAccess' },
    ]
    audit('PASS_CRITERIA', { passCriteria })
    expect(classification).toHaveLength(5)
    expect(passCriteria.filter((criterion) => !criterion.satisfied)).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// 11. Architecture invariants
// ---------------------------------------------------------------------------

describe('11. Architecture invariants (src-immutable audit)', { timeout: 30000 }, () => {
  it('keeps the persisted model, determinism and insertion-order invariance intact', () => {
    const scenario = (): SimulationState => rowColony(2, { farms: 1, wells: 1, workshops: 1 }, ['farm', 'well', 'workshop'], {}, 3)
    const run = (): SimulationState => runTicks(scenario(), 200)
    const a = run()
    const b = run()
    const saved = JSON.parse(serializeSave(a)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    audit('ARCHITECTURE', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      derivedAbsent: ['coverage', 'served', 'mobility', 'networkId', 'delivery', 'route'].map((term) => ({
        term,
        present: serializeCanonicalState(a).includes(term),
      })),
    })
    expect(saved.version).toBe(8)
    expect(SAVE_VERSION).toBe(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(a)).not.toContain('coverage')
  })

  it('keeps the placement rules unchanged', () => {
    const state = rowColony(2, { farms: 1, wells: 0 }, ['farm'], { water: 0 }, 2)
    const noWater = validatePlacement(state, { x: 9, y: 2 }, 'workshop')
    audit('PLACEMENT_UNCHANGED', {
      workshopWithoutWater: noWater.valid ? 'valid' : noWater.reason,
      affordableWithoutWater: affordableAt(state, 'workshop', { x: 9, y: 2 }),
      farmCostUnchanged: getPlacementAffordability(state, { x: 9, y: 2 }, 'farm').materialRequired,
    })
    expect(noWater.valid).toBe(false)
  })
})
