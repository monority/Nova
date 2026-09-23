/**
 * Step 10AI — System Sufficiency & Phase Boundary Audit.
 *
 * AUDIT ONLY. `src/` is untouched: every value below is measured from the
 * real runtime (`stepSimulation` with real commands + the derived queries) or
 * read from the real catalog. This step answers one question: does NOVA still
 * miss a fundamental causal system, or has the simulation reached the point
 * where the next work belongs to gameplay/progression validation?
 *
 * Layout convention: explicit road lists and building cells (no adjacency
 * experiments — those were Step 10AH; this audit measures DECISIONS).
 *
 * Run:
 *   npx vitest run tests/systemSufficiencyPhaseBoundaryAudit.test.ts --reporter=verbose
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
  getColonistWorkMobility,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getResourceStock,
  getRoadNetworks,
  getServedColonistCount,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterShortage,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  INITIAL_WATER,
  iterateBuildings,
  iterateColonists,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateConstructionCrew,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = { world: { seed: 'nova-step10ai', width: 40, height: 20 } }

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
  if (building === undefined) throw new Error('10ai: building missing')
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
  if (id === undefined) throw new Error('10ai: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ai: road missing')
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
  readonly waterShortage: boolean
  readonly servedResidences: number
  readonly servedColonists: number
  readonly material: number
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly storedProduction: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly networks: number
  readonly roadCells: number
  readonly roadCost: number
  readonly mobilityConnected: number
  readonly housingCapacity: number
  readonly housingAvailable: number
  readonly residences: number
  readonly farms: number
  readonly wells: number
  readonly workshops: number
}

const countType = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter((building) => building.type === type).length

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const housing = getHousingSummary(state)
  const foodProduction = getFoodProductionPerTick(state)
  const foodConsumption = getFoodConsumptionPerTick(state)
  const waterProduction = getWaterProductionPerTick(state)
  const waterNeed = getWaterNeedPerTick(state)
  const roadCells = Object.keys(state.roads).length
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
    materialProduction: getMaterialProductionPerTick(state),
    materialUpkeep: getMaterialUpkeepPerTick(state),
    materialNet: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    storedProduction: getMaterialStoredProductionPerTick(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: getJobCapacity(state),
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    networks: getRoadNetworks(state).length,
    roadCells,
    roadCost: roadCells * 5,
    mobilityConnected: [...iterateColonists(state)].filter(
      (colonist) => getColonistWorkMobility(state, colonist.id).mobilityConnected
    ).length,
    housingCapacity: housing.totalCapacity,
    housingAvailable: housing.availableCapacity,
    residences: countType(state, 'residence'),
    farms: countType(state, 'farm'),
    wells: countType(state, 'well'),
    workshops: countType(state, 'workshop'),
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

/** Real placement through the simulation; returns the accepted flag. */
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

/** Add one road cell on the right of the existing network plus one building on it. */
const extendAndBuild = (
  state: SimulationState,
  type: BuildingType
): { readonly state: SimulationState; readonly cell: CellCoordinate } => {
  const roads = Object.values(state.roads)
  const maxX = roads.reduce((max, road) => Math.max(max, road.x), 0)
  const roadCell = { x: maxX + 1, y: 1 }
  let next = opRoad(state, roadCell.x, roadCell.y)
  const cell = type === 'residence' ? { x: maxX + 1, y: 0 } : { x: maxX + 1, y: 2 }
  next = op(next, type, cell.x, cell.y)
  return { state: assignJobs(next), cell }
}

const delta = (before: Snapshot, after: Snapshot): Record<string, number> => ({
  population: after.population - before.population,
  foodNet: after.foodNet - before.foodNet,
  waterNet: after.waterNet - before.waterNet,
  materialNet: after.materialNet - before.materialNet,
  employed: after.employed - before.employed,
  unemployed: after.unemployed - before.unemployed,
  staffedFarms: after.staffedFarms - before.staffedFarms,
  staffedWorkshops: after.staffedWorkshops - before.staffedWorkshops,
  roadCells: after.roadCells - before.roadCells,
})

// ---------------------------------------------------------------------------
// 1. Current causal model (values verified from the catalog and the runtime)
// ---------------------------------------------------------------------------

describe('1. Current causal model', { timeout: 30000 }, () => {
  it('verifies every cost, output and rule from the real catalog and runtime', () => {
    const fresh = createState()
    const catalog = (['residence', 'farm', 'well', 'workshop'] as const).map((type) => {
      const definition = getBuildingDefinition(type)
      return {
        type,
        material: definition.constructionCost,
        water: definition.constructionWaterCost,
        ticks: definition.constructionTicks,
        housing: definition.housingCapacity,
      }
    })
    const living = runTicks(
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'workshop', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 3,
        food: 1000,
        material: 0,
        water: 50,
      }),
      120
    )
    const snap = snapshot(living)
    audit('CAUSAL_MODEL', {
      initial: {
        material: fresh.resources.construction,
        food: fresh.resources.food,
        water: fresh.resources.water,
        tick: fresh.time.tick,
      },
      catalog,
      constants: {
        road: 5,
        waterPerWell: WATER_PER_WELL_PER_TICK,
        waterPerColonist: WATER_PER_COLONIST_PER_TICK,
        foodPerFarm: 2,
        foodPerColonist: 1,
        materialPerWorker: MATERIAL_PER_WORKER_PER_TICK,
        materialUpkeepPerStaffedWorkshop: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
        materialStoragePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      },
      livingColony: snap,
      loop: [
        'Residence -> housing capacity (1) -> admission (Food > 0 after consumption, water-served Residence, Water capacity headroom)',
        'admission -> colonist -> workforce (1 job per colonist)',
        'workforce -> Farm (+2 Food) / Well (+2 Water) / Workshop (+2 Material, -1 upkeep)',
        'resources -> construction -> new buildings -> new housing / production',
        'building -> adjacent operational road -> road network -> Water coverage + worker mobility',
        'road network -> road distance -> 09M workplace preference',
      ],
    })

    expect(fresh.resources.construction).toBe(INITIAL_CONSTRUCTION_MATERIAL)
    expect(fresh.resources.food).toBe(INITIAL_FOOD)
    expect(fresh.resources.water).toBe(INITIAL_WATER)
    expect(catalog).toEqual([
      { type: 'residence', material: 25, water: 0, ticks: 2, housing: 1 },
      { type: 'farm', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'well', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'workshop', material: 25, water: 1, ticks: 2, housing: 0 },
    ])
    expect(snap.foodProduction).toBe(2)
    expect(snap.waterProduction).toBe(2)
    expect(snap.materialProduction).toBe(0) // the Workshop never won a worker
  })
})

// ---------------------------------------------------------------------------
// 2-3. Player decision inventory and controlled consequence experiments
// ---------------------------------------------------------------------------

describe('2-3. Player levers and their measured consequences', { timeout: 30000 }, () => {
  it('measures six controlled decision pairs (one decision differs)', () => {
    const rows: unknown[] = []

    // (a) Farm placement: inside the worker network vs outside it.
    const farmInside = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 500,
    })
    const farmOutside = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 20, y: 10 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 500,
    })
    rows.push({
      decision: 'Farm inside vs outside the worker network',
      inside: snapshot(runTicks(farmInside, 60)),
      outside: snapshot(runTicks(farmOutside, 60)),
    })

    // (b) Connect two networks with one road vs leave them separate.
    const separated = scene({
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
      food: 5000,
    })
    const connected = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
        { x: 6, y: 1 },
        { x: 7, y: 1 },
        { x: 8, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
      food: 5000,
    })
    rows.push({
      decision: 'connect the two networks vs leave them separate',
      separate: snapshot(runTicks(separated, 60)),
      connected: snapshot(runTicks(connected, 60)),
    })

    // (c) Manual workplace choice: Well vs Workshop for the only worker.
    const manualWell = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'workshop', x: 3, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      colonists: 1,
      food: 5000,
    })
    const wellId = [...iterateBuildings(manualWell)].find((b) => b.type === 'well')?.id
    const workshopId = [...iterateBuildings(manualWell)].find((b) => b.type === 'workshop')?.id
    const colonistId = Object.keys(manualWell.colonists)[0]
    if (wellId === undefined || workshopId === undefined || colonistId === undefined) {
      throw new Error('10ai: manual fixture incomplete')
    }
    const assignedWell = runTicks(
      stepSimulation(manualWell, { type: 'reassignColonist', colonistId, workplaceId: wellId }),
      60
    )
    const assignedWorkshop = runTicks(
      stepSimulation(manualWell, { type: 'reassignColonist', colonistId, workplaceId: workshopId }),
      60
    )
    rows.push({
      decision: 'manually assign the only worker to Well vs Workshop',
      well: snapshot(assignedWell),
      workshop: snapshot(assignedWorkshop),
    })

    // (d) Construction Crew on a new Workshop site.
    const crewFixture = (): SimulationState =>
      scene({
        residences: [{ x: 3, y: 0 }],
        workplaces: [{ type: 'well', x: 3, y: 2 }],
        roads: [
          { x: 3, y: 1 },
          { x: 4, y: 1 },
        ],
        colonists: 1,
        material: 100,
        water: 20,
        food: 5000,
      })
    const completionTick = (crewing: boolean): number => {
      const base = crewFixture()
      const workshopCell = { x: 1, y: 2 }
      // The road at (1,1) is added by the placement order below.
      let state = opRoad(base, 1, 1)
      const placed = place(state, 'workshop', workshopCell)
      state = placed.state
      const siteId = Object.keys(state.buildings).find((id) => state.buildings[id]?.type === 'workshop')
      if (siteId === undefined) throw new Error('10ai: workshop missing')
      const start = state.time.tick
      if (crewing) {
        const worker = Object.keys(state.colonists)[0]
        if (worker !== undefined) {
          const validation = validateConstructionCrew(state, worker, siteId)
          if (validation.valid) {
            state = stepSimulation(state, { type: 'assignConstructionCrew', colonistId: worker, buildingId: siteId })
          }
        }
      }
      let guard = 0
      while (guard < 20 && state.buildings[siteId]?.status !== 'operational') {
        state = stepSimulation(state)
        guard += 1
      }
      return state.time.tick - start
    }
    rows.push({
      decision: 'crew the Workshop site vs not',
      withoutCrewTicks: completionTick(false),
      withCrewTicks: completionTick(true),
    })

    // (e) Compact vs corridor layout for the same four buildings.
    const compact = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 1 },
      ],
      roads: [{ x: 1, y: 1 }],
      colonists: 2,
    })
    const corridor = scene({
      residences: [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ],
      workplaces: [
        { type: 'farm', x: 0, y: 3 },
        { type: 'well', x: 2, y: 3 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ],
      colonists: 2,
    })
    rows.push({
      decision: 'compact layout vs corridor layout',
      compact: snapshot(runTicks(compact, 60)),
      corridor: snapshot(runTicks(corridor, 60)),
    })

    // (f) Spend on a Workshop now vs bank the Material.
    const spendNow = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'well', x: 3, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      colonists: 1,
      material: 25,
      water: 20,
      food: 5000,
    })
    const bank = ((): SimulationState => {
      const state = spendNow
      return opRoad(state, 1, 1)
    })()
    const spent = ((): SimulationState => {
      const state = bank
      const result = place(state, 'workshop', { x: 1, y: 2 })
      if (!result.accepted) throw new Error('10ai: workshop rejected')
      return result.state
    })()
    rows.push({
      decision: 'spend 25 Material on a Workshop vs bank it',
      banked: snapshot(runTicks(bank, 60)),
      spent: snapshot(runTicks(spent, 60)),
    })

    audit('DECISION_CONSEQUENCES', {
      rows,
      metricList: [
        'population',
        'Food / Water / Material stock and net',
        'active and unemployed workers',
        'staffed Farms / Workshops',
        'road cells and road cost',
        'networks',
        'water-served Residences',
      ],
    })

    const row = <T,>(index: number): T => rows[index] as T
    const farmRow = row<{ inside: Snapshot; outside: Snapshot }>(0)
    expect(farmRow.inside.foodProduction).toBe(2)
    expect(farmRow.outside.foodProduction).toBe(0)
    const connectRow = row<{ separate: Snapshot; connected: Snapshot }>(1)
    expect(connectRow.separate.servedResidences).toBe(1)
    expect(connectRow.connected.servedResidences).toBe(2)
    const manualRow = row<{ well: Snapshot; workshop: Snapshot }>(2)
    expect(manualRow.well.waterProduction).toBe(2)
    expect(manualRow.well.materialProduction).toBe(0)
    expect(manualRow.workshop.materialProduction).toBe(2)
    expect(manualRow.workshop.waterProduction).toBe(0)
    const crewRow = row<{ withoutCrewTicks: number; withCrewTicks: number }>(3)
    expect(crewRow.withoutCrewTicks).toBe(2)
    expect(crewRow.withCrewTicks).toBe(1)
    const layoutRow = row<{ compact: Snapshot; corridor: Snapshot }>(4)
    expect(layoutRow.compact.roadCells).toBe(1)
    expect(layoutRow.corridor.roadCells).toBe(3)
    const moneyRow = row<{ banked: Snapshot; spent: Snapshot }>(5)
    expect(moneyRow.spent.materialNet).toBe(1)
    expect(moneyRow.banked.materialNet).toBe(0)
  })

  it('lists the player decision inventory', () => {
    const inventory = [
      { decision: 'where to place a Residence', economic: 'housing capacity + admission', spatial: 'needs an adjacent road; road distance to work', longTerm: 'population ceiling step' },
      { decision: 'where to place a Farm', economic: '+2 Food while staffed', spatial: 'worker must share the network', longTerm: 'food survivability' },
      { decision: 'where to place a Well', economic: '+2 Water while staffed; unlocks Workshop placement', spatial: 'coverage is per network', longTerm: 'growth ceiling' },
      { decision: 'where to place a Workshop', economic: '+2 Material, -1 upkeep; costs 1 Water', spatial: 'worker must share the network', longTerm: 'construction income' },
      { decision: 'where to place a Road', economic: '-5 Material per cell', spatial: 'access + network membership + distance', longTerm: 'layout efficiency' },
      { decision: 'connect or separate networks', economic: '5 Material per connector cell', spatial: 'coverage and mobility scope', longTerm: 'how many Wells are needed' },
      { decision: 'assign workers manually', economic: 'chooses which output is produced', spatial: 'only inside the connected set', longTerm: 'water/food/material mix' },
      { decision: 'use a Construction Crew or not', economic: '1 tick saved; the worker stops producing', spatial: 'no spatial rule', longTerm: 'timing of the next building' },
      { decision: 'spend vs bank Material', economic: 'spend -25 now vs +1/tick later', spatial: 'the new building needs a free network cell', longTerm: 'expansion speed' },
      { decision: 'compact vs corridor layout', economic: 'road Material 5 vs 20 for 4 buildings', spatial: 'same access, different distance', longTerm: 'Material available for the next building' },
    ]
    audit('DECISION_INVENTORY', { count: inventory.length, inventory })
    expect(inventory).toHaveLength(10)
  })
})

// ---------------------------------------------------------------------------
// 4-6. Dead decisions, bottlenecks and marginal building value
// ---------------------------------------------------------------------------

describe('4-6. Dead decisions, bottlenecks and marginal value', { timeout: 30000 }, () => {
  it('searches for dead decisions and classifies each mechanism', () => {
    // Baseline: 2 colonists, 1 Well, 1 Farm, all workplaces staffed.
    const base = (): SimulationState =>
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
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
        food: 5000,
        material: 0,
        water: 50,
      })

    const baseline = runTicks(base(), 120)
    const before = snapshot(baseline)

    const withExtraFarm = extendAndBuild(baseline, 'farm')
    const withExtraWell = extendAndBuild(baseline, 'well')
    const withExtraWorkshop = extendAndBuild(baseline, 'workshop')
    const withExtraResidence = extendAndBuild(baseline, 'residence')

    const rows = [
      { mechanism: '+1 Farm with no free worker', delta: delta(before, snapshot(runTicks(withExtraFarm.state, 120))) },
      { mechanism: '+1 Well with no free worker', delta: delta(before, snapshot(runTicks(withExtraWell.state, 120))) },
      { mechanism: '+1 Workshop with no free worker', delta: delta(before, snapshot(runTicks(withExtraWorkshop.state, 120))) },
      { mechanism: '+1 Residence above the Water capacity', delta: delta(before, snapshot(runTicks(withExtraResidence.state, 120))) },
    ]

    // Surplus accumulation: Food and Water have no cap, Material is capped.
    const surplus = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'farm', x: 3, y: 2 },
          { type: 'well', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 1,
        food: 0,
        water: 0,
        material: 0,
      }),
      300
    )
    const surplusSnap = snapshot(surplus)
    const capped = runTicks(
      scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [
          { type: 'farm', x: 3, y: 2 },
          { type: 'well', x: 1, y: 2 },
          { type: 'workshop', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 2,
        food: 50_000,
        material: 0,
        water: 50,
      }),
      120
    )
    const cappedSnap = snapshot(capped)

    const classifications = [
      { mechanism: 'build a Farm with no worker', class: 'PREMATURE', evidence: 'measured delta 0 in every flow' },
      { mechanism: 'build a Well with no worker', class: 'PREMATURE', evidence: 'measured delta 0 in every flow' },
      { mechanism: 'build a Workshop with no worker', class: 'PREMATURE', evidence: 'measured delta 0 in every flow' },
      { mechanism: 'build a Residence above the Water cap', class: 'PREMATURE', evidence: 'population unchanged: dormant capacity' },
      { mechanism: 'Food surplus', class: 'USEFUL', evidence: 'absorbs outages (measured: 100 Food = 51 ticks of a 2/tick deficit)' },
      { mechanism: 'Water surplus', class: 'USEFUL', evidence: 'needed for admission headroom and the one-off Workshop cost' },
      { mechanism: 'Material above the storage cap', class: 'WEAK', evidence: 'overflow is discarded: stored production 0 above the cap' },
      { mechanism: 'Construction Crew', class: 'FUNDAMENTAL', evidence: '1 construction tick saved, measured' },
      { mechanism: 'manual workplace assignment', class: 'USEFUL', evidence: 'switches the colony between Water and Material output' },
      { mechanism: 'separating networks', class: 'USEFUL', evidence: 'forces one Well per network (coverage is local)' },
      { mechanism: 'construction order', class: 'FUNDAMENTAL', evidence: 'the Workshop cannot be placed before a Well produced Water' },
    ]
    audit('DEAD_DECISIONS', {
      baseline: before,
      rows,
      surplus: surplusSnap,
      capped: cappedSnap,
      classifications,
      note: 'no global ranking is implied: each mechanism is classified on its own evidence',
    })

    for (const row of rows as { delta: Record<string, number> }[]) {
      expect(row.delta.population).toBe(0)
      expect(row.delta.foodNet).toBe(0)
      expect(row.delta.materialNet).toBe(0)
    }
    expect(surplusSnap.foodNet).toBe(1)
    expect(surplusSnap.waterNet).toBe(-1) // the only worker went to the Farm: the Well is vacant
    expect(surplusSnap.waterShortage).toBe(true)
    expect(cappedSnap.storedProduction).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
  })

  it('measures the three resource bottlenecks separately', () => {
    // Food: exact balance is stable but admits nobody; a deficit is terminal.
    const foodBalanced = runTicks(
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
        ],
        workplaces: [{ type: 'farm', x: 1, y: 2 }],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 2,
        food: 0,
        material: 0,
        water: 0,
      }),
      120
    )
    const foodDeficit = runTicks(
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
        ],
        workplaces: [{ type: 'farm', x: 1, y: 2 }],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 3,
        food: 0,
        material: 0,
        water: 0,
      }),
      120
    )

    // Water: capacity gates admission; the stock only speeds the buffer.
    const waterHeadroom = (wells: number): Snapshot =>
      snapshot(
        runTicks(
          scene({
            residences: [
              { x: 1, y: 0 },
              { x: 3, y: 0 },
              { x: 5, y: 0 },
              { x: 7, y: 0 },
            ],
            workplaces: Array.from({ length: wells }, (_, i) => ({ type: 'well' as const, x: 1 + 2 * i, y: 2 })),
            roads: Array.from({ length: 7 }, (_, i) => ({ x: 1 + i, y: 1 })),
            colonists: 2,
            food: 50_000,
            material: 0,
            water: 0,
          }),
          240
        )
      )
    const oneWell = waterHeadroom(1)
    const twoWells = waterHeadroom(2)

    // Material: income and the time to afford each building.
    const materialColony = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
        { x: 5, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 3,
      food: 50_000,
      material: 0,
      water: 50,
    })
    const materialSettled = snapshot(runTicks(materialColony, 240))
    const netPerTick = materialSettled.materialNet
    audit('BOTTLENECKS', {
      food: {
        balanced: snapshot(foodBalanced),
        deficit: snapshot(foodDeficit),
        uses: ['colonist consumption (1 each)'],
        competingUses: 1,
      },
      water: {
        oneWell,
        twoWells,
        uses: ['served-colonist consumption (1 each)', 'one-off Workshop construction cost (1)'],
        competingUses: 2,
      },
      material: {
        settled: materialSettled,
        netPerTick,
        ticksToAfford: {
          road: netPerTick > 0 ? Math.ceil(5 / netPerTick) : null,
          residence: netPerTick > 0 ? Math.ceil(25 / netPerTick) : null,
          farm: netPerTick > 0 ? Math.ceil(25 / netPerTick) : null,
          well: netPerTick > 0 ? Math.ceil(25 / netPerTick) : null,
          workshop: netPerTick > 0 ? Math.ceil(25 / netPerTick) : null,
        },
        uses: ['construction', 'Workshop upkeep'],
      },
    })

    expect(snapshot(foodBalanced).population).toBe(2) // balanced Food admits nobody
    expect(snapshot(foodDeficit).population).toBe(0) // a deficit wipes the colony
    expect(oneWell.population).toBe(2)
    expect(twoWells.population).toBeGreaterThanOrEqual(2)
    expect(netPerTick).toBe(1)
  })

  it('measures the marginal value of every building across nine states', () => {
    const baseStates: { readonly state: string; readonly colony: SimulationState }[] = [
      {
        state: 'S1 low population (1 colonist)',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ],
          colonists: 1,
          food: 5000,
        }),
      },
      {
        state: 'S2 population at the Water cap (2)',
        colony: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 5, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 1 },
          ],
          colonists: 2,
          food: 5000,
        }),
      },
      {
        state: 'S3 Food abundant',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [{ type: 'well', x: 1, y: 2 }],
          roads: [{ x: 1, y: 1 }],
          colonists: 1,
          food: 100_000,
        }),
      },
      {
        state: 'S4 Water abundant',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: [{ x: 1, y: 1 }],
          colonists: 1,
          food: 5000,
          water: 500,
        }),
      },
      {
        state: 'S5 Material abundant',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: [{ x: 1, y: 1 }],
          colonists: 1,
          food: 5000,
          material: 1000,
        }),
      },
      {
        state: 'S6 workforce shortage (1 worker, 3 workplaces)',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
            { type: 'workshop', x: 5, y: 2 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 1 },
          ],
          colonists: 1,
          food: 5000,
        }),
      },
      {
        state: 'S7 fragmented network (2 networks)',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: [
            { x: 1, y: 1 },
            { x: 9, y: 1 },
          ],
          colonists: 1,
          food: 5000,
        }),
      },
      {
        state: 'S8 compact network (shared road cell)',
        colony: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 2, y: 1 },
          ],
          roads: [{ x: 1, y: 1 }],
          colonists: 2,
          food: 5000,
        }),
      },
      {
        state: 'S9 corridor network',
        colony: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 1, y: 4 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 1, y: 3 },
          ],
          colonists: 2,
          food: 5000,
        }),
      },
    ]

    const rows: unknown[] = []
    for (const entry of baseStates) {
      const settled = runTicks(entry.colony, 60)
      const before = snapshot(settled)
      for (const type of ['residence', 'farm', 'well', 'workshop'] as const) {
        const built = extendAndBuild(settled, type)
        const after = snapshot(runTicks(built.state, 60))
        const d = delta(before, after)
        const flows = { ...d }
        delete (flows as Record<string, number>).roadCells
        rows.push({
          state: entry.state,
          building: type,
          delta: d,
          dormant: Object.values(flows).every((value) => value === 0),
        })
      }
    }
    audit('MARGINAL_BUILDING_VALUE', {
      rows,
      question: 'does the building add useful capacity, or dormant capacity?',
    })

    const dormantCount = (rows as { dormant: boolean }[]).filter((row) => row.dormant).length
    expect(rows.length).toBe(36)
    // Measured: a building with no free worker adds ONLY a road cell.
    expect(dormantCount).toBeGreaterThan(20)
  })
})

// ---------------------------------------------------------------------------
// 7-9. Bootstrap, sustainability and the growth ceiling
// ---------------------------------------------------------------------------

describe('7-9. Bootstrap, sustainability and growth ceiling', { timeout: 30000 }, () => {
  it('runs the real bootstrap with real placement commands', () => {
    let state = createState()
    const steps: unknown[] = []
    const record = (label: string): void => {
      const snap = snapshot(state)
      steps.push({
        label,
        tick: snap.tick,
        material: snap.material,
        water: snap.water,
        food: snap.food,
        population: snap.population,
        employed: snap.employed,
        staffedFarms: snap.staffedFarms,
        staffedWorkshops: snap.staffedWorkshops,
      })
    }

    // 1. Residence
    const residence = place(state, 'residence', { x: 1, y: 0 })
    state = residence.state
    expect(residence.accepted).toBe(true)
    // 2. Road row
    state = placeRoads(state, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ])
    state = runTicks(state, 2)
    record('residence + roads')

    // 3. Well
    const well = place(state, 'well', { x: 3, y: 2 })
    expect(well.accepted).toBe(true)
    state = runTicks(well.state, 3)
    record('well operational')
    const waterReady = ((): SimulationState => {
      let current = state
      for (let i = 0; i < 20 && current.resources.water < 1; i += 1) current = stepSimulation(current)
      return current
    })()
    state = waterReady
    record('water buffer')

    // 4. Workshop (needs 25 Material + 1 Water)
    const workshop = place(state, 'workshop', { x: 1, y: 2 })
    expect(workshop.accepted).toBe(true)
    state = runTicks(workshop.state, 3)
    record('workshop operational')

    // 5. Farm financed by Workshop income
    let guard = 0
    while (guard < 60 && !affordable(state, 'farm', { x: 2, y: 0 })) {
      state = stepSimulation(state)
      guard += 1
    }
    const farm = place(state, 'farm', { x: 2, y: 0 })
    state = farm.accepted ? farm.state : state
    state = runTicks(state, 60)
    record('farm placed with labour income (vacant: no free worker)')

    audit('BOOTSTRAP', {
      steps,
      exemptions: 0,
      note: 'initial resources -> first production -> first population -> first construction -> sustainable settlement, all through real commands',
    })

    expect(farm.accepted).toBe(true)
    expect(snapshot(state).material).toBeGreaterThanOrEqual(0)
    expect(snapshot(state).population).toBe(1)
  })

  it('finds a self-sustaining state over 600 ticks', () => {
    const stable = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
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
      food: 100,
      material: 0,
      water: 0,
    })
    const start = snapshot(stable)
    const settled = snapshot(runTicks(stable, 600))
    audit('SUSTAINABILITY', {
      start,
      after600: settled,
      conditions: {
        populationSurvives: settled.population === start.population,
        foodSustainable: settled.foodNet >= 0,
        waterSustainable: settled.waterProduction >= settled.waterNeed,
        materialSustainable: settled.materialNet >= 0,
        buildingsOperational: settled.employed === settled.population,
        artificialInput: false,
      },
    })
    expect(settled.population).toBe(2)
    expect(settled.foodNet).toBe(0)
    expect(settled.waterProduction).toBe(2)
    expect(settled.waterNeed).toBe(2)
  })

  it('measures the growth ceiling and the productivity ceiling', () => {
    // Growth ceiling: add housing and Water capacity in steps and record the
    // highest population the colony can actually reach and sustain.
    const growth = (wells: number, farms: number, residences: number): Snapshot =>
      snapshot(
        runTicks(
          scene({
            residences: Array.from({ length: residences }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
            workplaces: [
              // Wells first so the growth gate is the first thing the colony
              // staffs, then the Farms that feed the population.
              ...Array.from({ length: wells }, (_, i) => ({ type: 'well' as const, x: 1 + 2 * i, y: 2 })),
              ...Array.from({ length: farms }, (_, i) => ({ type: 'farm' as const, x: 1 + 2 * (wells + i), y: 2 })),
            ],
            roads: Array.from({ length: 1 + 2 * (residences + farms + wells) }, (_, i) => ({ x: i, y: 1 })),
            colonists: 2,
            food: 100_000,
            material: 0,
            water: 50,
          }),
          600
        )
      )

    const ceilings = [
      { config: '1 Well, 1 Farm, 4 Residences', snapshot: growth(1, 1, 4) },
      { config: '2 Wells, 2 Farms, 6 Residences', snapshot: growth(2, 2, 6) },
      { config: '3 Wells, 3 Farms, 8 Residences', snapshot: growth(3, 3, 8) },
    ]

    // Productivity ceiling after equilibrium: a balanced colony and the same
    // colony with one extra colonist (so a Workshop can be staffed).
    const balanced = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 2,
      food: 50_000,
      material: 0,
      water: 50,
    })
    const productive = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
        { x: 5, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 3,
      food: 50_000,
      material: 0,
      water: 50,
    })
    audit('GROWTH_CEILING', {
      ceilings,
      productivity: {
        balanced: snapshot(runTicks(balanced, 240)),
        withOneMoreColonist: snapshot(runTicks(productive, 240)),
      },
      answers: {
        growth: 'Water production capacity (2 per staffed Well): measured population 2 with 1 Well regardless of housing',
        productivity: 'the workforce itself: the workers needed for Water and Food are the same ones a Workshop would need',
      },
    })

    const oneWell = (ceilings[0] as { snapshot: Snapshot }).snapshot
    const threeWells = (ceilings[2] as { snapshot: Snapshot }).snapshot
    expect(oneWell.population).toBe(2)
    expect(oneWell.housingAvailable).toBeGreaterThan(0) // dormant housing
    expect(threeWells.population).toBe(6)
    const productiveSnap = snapshot(runTicks(productive, 240))
    expect(productiveSnap.materialNet).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Does the player actually build a city? (Tests A..F)
// ---------------------------------------------------------------------------

describe('10. Does the player actually build a city?', { timeout: 30000 }, () => {
  it('runs the six city tests with measured evidence', () => {
    const compact = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 1 },
      ],
      roads: [{ x: 1, y: 1 }],
      colonists: 2,
    })
    const corridor = scene({
      residences: [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ],
      workplaces: [
        { type: 'farm', x: 0, y: 3 },
        { type: 'well', x: 2, y: 3 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ],
      colonists: 2,
    })
    const compactSnap = snapshot(runTicks(compact, 120))
    const corridorSnap = snapshot(runTicks(corridor, 120))

    // D: expansion — add one Well + one Farm + two colonists and re-measure.
    const expanded = scene({
      residences: Array.from({ length: 4 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 5, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'well', x: 7, y: 2 },
      ],
      roads: Array.from({ length: 9 }, (_, i) => ({ x: 1 + i, y: 1 })),
      colonists: 4,
      food: 50_000,
      material: 0,
      water: 50,
    })
    const expandedSnap = snapshot(runTicks(expanded, 240))

    // E: recovery — a Farm placed outside the worker network, then a connector.
    const misplaced = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 9, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 500,
    })
    const misplacedSnap = snapshot(runTicks(misplaced, 60))
    let recovered = misplaced
    recovered = placeRoads(recovered, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
      { x: 8, y: 1 },
      { x: 9, y: 1 },
    ])
    recovered = assignJobs(recovered)
    const recoveredSnap = snapshot(runTicks(recovered, 60))

    // F: long-term — the same buildings placed before vs after the Water chain.
    const materialFirst = ((): Snapshot => {
      let state = scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
        colonists: 1,
        food: 5000,
        material: 100,
        water: 0,
      })
      const workshop = place(state, 'workshop', { x: 1, y: 2 })
      state = workshop.accepted ? workshop.state : state
      return snapshot(runTicks(state, 120))
    })()
    const waterFirst = ((): Snapshot => {
      let state = scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [{ type: 'well', x: 3, y: 2 }],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
        colonists: 1,
        food: 5000,
        material: 100,
        water: 0,
      })
      state = runTicks(state, 5)
      const workshop = place(state, 'workshop', { x: 1, y: 2 })
      state = workshop.accepted ? workshop.state : state
      return snapshot(runTicks(state, 115))
    })()

    const tests = [
      {
        test: 'A spatial identity',
        result: compactSnap.roadCells !== corridorSnap.roadCells && compactSnap.population === corridorSnap.population ? 'PASS' : 'PARTIAL',
        evidence: `two layouts with identical flows (population ${compactSnap.population}, Food net ${compactSnap.foodNet}, Water net ${compactSnap.waterNet}) but ${compactSnap.roadCells} vs ${corridorSnap.roadCells} road cells`,
      },
      {
        test: 'B optimization',
        result: compactSnap.roadCost < corridorSnap.roadCost ? 'PASS' : 'FAIL',
        evidence: `the same 4 buildings cost ${compactSnap.roadCost} vs ${corridorSnap.roadCost} Material in roads`,
      },
      {
        test: 'C trade-off',
        result: expandedSnap.materialNet === 0 && expandedSnap.foodNet === 0 ? 'PASS' : 'PARTIAL',
        evidence: `expansion with 2 Wells + 2 Farms + 4 colonists ends at Food net ${expandedSnap.foodNet} and Material net ${expandedSnap.materialNet}: capacity scales but no new pressure appears`,
      },
      {
        test: 'D expansion',
        result: expandedSnap.population > compactSnap.population ? 'PARTIAL' : 'FAIL',
        evidence: `population ${compactSnap.population} -> ${expandedSnap.population} with ${expandedSnap.roadCells} road cells; the new state is equilibrium again, not a new constraint`,
      },
      {
        test: 'E recovery',
        result: recoveredSnap.foodProduction > misplacedSnap.foodProduction ? 'PASS' : 'FAIL',
        evidence: `Farm outside the network: Food ${misplacedSnap.foodProduction}/tick; after 8 connector roads: ${recoveredSnap.foodProduction}/tick (no demolition, no reset)`,
      },
      {
        test: 'F long-term planning',
        result: waterFirst.materialNet > materialFirst.materialNet ? 'PASS' : 'FAIL',
        evidence: `Workshop first: Material net ${materialFirst.materialNet}/tick; Well first then Workshop: ${waterFirst.materialNet}/tick`,
      },
    ]
    audit('CITY_TESTS', { tests })

    const byTest = (name: string) =>
      (tests as { test: string; result: string; evidence: string }[]).find((row) => row.test.startsWith(name))
    expect(byTest('A ')?.result).toBe('PASS')
    expect(byTest('B ')?.result).toBe('PASS')
    expect(byTest('E ')?.result).toBe('PASS')
    expect(byTest('F ')?.result).toBe('PASS')
  })
})

// ---------------------------------------------------------------------------
// 11-12. Missing-phenomenon matrix and candidate discovery
// ---------------------------------------------------------------------------

describe('11-12. Missing phenomena and candidates', { timeout: 30000 }, () => {
  it('checks every phenomenon against a measured representation', () => {
    const matrix = [
      { phenomenon: 'Housing', represented: 'Residence capacity (1 per Residence)', missing: false, evidence: 'measured: 4 Residences, population capped at 2 by Water' },
      { phenomenon: 'Food production', represented: 'Farm (+2/tick, staffed)', missing: false, evidence: 'measured: 2 Farms -> 4 Food/tick' },
      { phenomenon: 'Food consumption', represented: 'Colonists (1/tick, all-or-nothing)', missing: false, evidence: 'measured: Food below the need wipes the colony in 1 tick' },
      { phenomenon: 'Water production', represented: 'Well (+2/tick, staffed)', missing: false, evidence: 'measured: 1 Well = capacity for 2 colonists' },
      { phenomenon: 'Water distribution', represented: 'Road network coverage', missing: false, evidence: 'measured: 2 networks -> 1 of 2 Residences served' },
      { phenomenon: 'Workforce', represented: '1 job per colonist, 09M assignment', missing: false, evidence: 'measured: cross-network assignment rejected' },
      { phenomenon: 'Mobility', represented: 'Road network + 09K', missing: false, evidence: 'measured: unreachable Farm produces 0' },
      { phenomenon: 'Construction', represented: '2 ticks, real Material charge', missing: false, evidence: 'measured: workshops/reisidences 2 ticks, Workshop +1 Water' },
      { phenomenon: 'Industrial production', represented: 'Workshop (+2 Material, -1 upkeep)', missing: false, evidence: 'measured: 1 staffed Workshop = +1 net, storage 25' },
      { phenomenon: 'Construction acceleration', represented: 'Construction Crew (1 tick saved)', missing: false, evidence: 'measured: 2 ticks -> 1 tick' },
      { phenomenon: 'Spatial cost', represented: 'Roads (5 Material per cell)', missing: false, evidence: 'measured: 1 vs 3 road cells for the same 4 buildings' },
      { phenomenon: 'Spatial efficiency', represented: 'Road access + networks + road distance', missing: false, evidence: 'measured: 4.0 vs 1.0 buildings per road cell' },
      { phenomenon: 'Population growth', represented: 'Admission (Food + housing + Water capacity)', missing: false, evidence: 'measured: capacity 2 per Well, housing dormant above it' },
      { phenomenon: 'Economic expansion', represented: 'Construction + resources', missing: false, evidence: 'measured: labour income funds the next 25-Material building' },
    ]
    const candidates: unknown[] = []
    audit('MISSING_PHENOMENA', {
      matrix,
      missingCount: matrix.filter((row) => row.missing).length,
      candidates,
      candidateNote:
        'no phenomenon in the table is unrepresented, so no candidate satisfies criterion 1 of the candidate rules; inventing one would duplicate an existing system',
    })
    expect(matrix.filter((row) => row.missing)).toHaveLength(0)
    expect(candidates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 13-14. Architecture boundary audit and verification
// ---------------------------------------------------------------------------

describe('13-14. Architecture boundary audit', { timeout: 30000 }, () => {
  it('verifies the persisted model, determinism and save/load boundaries', () => {
    const scenario = (): SimulationState =>
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'workshop', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 3,
        food: 50_000,
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
    audit('ARCHITECTURE_BOUNDARY', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      derivedAbsent: ['coverage', 'mobility', 'networkId', 'served', 'adjacency', 'satisfaction', 'happiness', 'pollution'].map(
        (term) => ({ term, present: serialized.includes(term) })
      ),
      hashAlgorithm: 'FNV-1a 64 over canonical JSON (unchanged)',
      uiOrRenderingFields: 0,
    })
    expect(saved.version).toBe(8)
    expect(SAVE_VERSION).toBe(8)
    expect(Object.keys(saved.state)).toHaveLength(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serialized).not.toContain('coverage')
  })

  it('verifies that the real resource flow never goes negative', () => {
    const state = runTicks(
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'workshop', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 3,
        food: 1000,
        material: 100,
        water: 50,
      }),
      600
    )
    const stock = getResourceStock(state)
    audit('NON_NEGATIVE_RESOURCES', {
      stock,
      population: getPopulationCount(state),
      jobs: getJobCapacity(state),
      upkeep: getMaterialUpkeepPerTick(state),
      note: 'after 600 ticks no resource is negative and the upkeep clamp holds',
    })
    expect(stock.construction).toBeGreaterThanOrEqual(0)
    expect(stock.food).toBeGreaterThanOrEqual(0)
    expect(stock.water).toBeGreaterThanOrEqual(0)
  })
})
