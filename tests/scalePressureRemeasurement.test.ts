/**
 * Step 10BR - scale-pressure remeasurement.
 *
 * Audit only: every fixture uses the current simulation and canonical domain
 * predicates. No economy, workforce, progression, persistence, or scenario rule
 * is changed by this suite.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countStaffedOperationalWells,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getNetMaterialPerTick,
  getProgression,
  getResourceStock,
  getRoadNetworks,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWorkplaceWorkforceDiagnosis,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10br', width: 24, height: 8 },
}

const base = (): SimulationState => {
  const state = createInitialState(config)
  return {
    ...state,
    resources: { construction: 1000, food: 1000, water: 1000 },
  }
}

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
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

const roadRow = (state: SimulationState, length: number): SimulationState => {
  const cells = Array.from({ length: length + 1 }, (_, x) => ({ x, y: 1 }))
  const created = createRoads(state, cells)
  const roads = { ...created.state.roads }
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) {
      roads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
    }
  }
  return { ...created.state, roads }
}

const addColonists = (state: SimulationState, population: number): SimulationState => {
  let next = state
  for (let index = 0; index < population; index += 1) {
    next = createColonist(next, `building-${index + 1}`).state
  }
  return next
}

const compact = (
  population: number,
  workplaceTypes: readonly BuildingType[]
): SimulationState => {
  let state = base()
  for (let index = 0; index < population; index += 1) {
    state = operational(state, 'residence', 1 + index * 2, 0)
  }
  state = roadRow(state, Math.max(12, population * 2 + 2))
  workplaceTypes.forEach((type, index) => {
    state = operational(state, type, 1 + index * 2, 2)
  })
  return assignJobs(addColonists(state, population))
}

const distributed = (
  population: number,
  workplaceTypes: readonly BuildingType[]
): SimulationState => {
  let state = base()
  for (let index = 0; index < population; index += 1) {
    state = operational(state, 'residence', 1 + index * 2, 0)
  }
  state = roadRow(state, 22)
  const positions = [1, 3, 15, 17, 19, 21]
  workplaceTypes.forEach((type, index) => {
    state = operational(state, type, positions[index] ?? positions[positions.length - 1]!, 2)
  })
  return assignJobs(addColonists(state, population))
}

const buildingIds = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((building) => building.type === type && building.status === 'operational')
    .map((building) => building.id)
    .sort()

const diagnosisKinds = (state: SimulationState): Record<string, number> => {
  const kinds: Record<string, number> = {}
  for (const id of [...buildingIds(state, 'farm'), ...buildingIds(state, 'well'), ...buildingIds(state, 'workshop')]) {
    const kind = getWorkplaceWorkforceDiagnosis(state, id).kind
    kinds[kind] = (kinds[kind] ?? 0) + 1
  }
  return kinds
}

const metrics = (state: SimulationState) => {
  const buildings = Object.values(state.buildings)
  const workplaces = buildings.filter(
    (building) =>
      building.status === 'operational' &&
      (building.type === 'farm' || building.type === 'well' || building.type === 'workshop')
  )
  const jobs = getEmploymentSummary(state)
  return {
    population: Object.keys(state.colonists).length,
    residences: buildingIds(state, 'residence').length,
    farms: buildingIds(state, 'farm').length,
    wells: buildingIds(state, 'well').length,
    workshops: buildingIds(state, 'workshop').length,
    roads: Object.keys(state.roads).length,
    networks: getRoadNetworks(state).length,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWells: countStaffedOperationalWells(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    vacantEligible: workplaces.filter((building) => countWorkersAt(state, building.id) === 0).length,
    inaccessible: workplaces.filter((building) => !getBuildingRoadAccess(state, building.id).hasRoadAccess).length,
    workers: jobs.employed,
    crew: Object.values(state.colonists).filter((colonist) => colonist.constructionAssignmentId !== null).length,
    foodProduction: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodBalance: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    waterCapacity: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    materialNet: getNetMaterialPerTick(state),
    material: getResourceStock(state).construction,
    reserve: state.storage.material,
    stage: getProgression(state).stage,
    diagnoses: diagnosisKinds(state),
  }
}

const reverseRecords = (state: SimulationState): SimulationState => ({
  ...state,
  buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
  roads: Object.fromEntries(Object.entries(state.roads).reverse()),
  colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
})

describe('Step 10BR — scale-pressure remeasurement', () => {
  it('reproduces the 10BO baseline and measures the compact population curve', () => {
    const rows = [
      { population: 3, types: ['farm', 'farm', 'well', 'well'] as BuildingType[] },
      { population: 4, types: ['farm', 'farm', 'well', 'well'] as BuildingType[] },
      { population: 5, types: ['farm', 'farm', 'farm', 'well', 'well', 'well'] as BuildingType[] },
      { population: 6, types: ['farm', 'farm', 'farm', 'well', 'well', 'well'] as BuildingType[] },
    ].map((row) => ({ ...metrics(compact(row.population, row.types)), population: row.population }))

    expect(rows[0]).toMatchObject({ population: 3, staffedFarms: 2, staffedWells: 1, workers: 3, vacantEligible: 1, waterCapacity: 2 })
    expect(rows[1]).toMatchObject({ population: 4, staffedFarms: 2, staffedWells: 2, workers: 4, vacantEligible: 0, waterCapacity: 4 })
    expect(rows[2]).toMatchObject({ population: 5, staffedFarms: 3, staffedWells: 2, workers: 5, vacantEligible: 1, waterCapacity: 4 })
    expect(rows[3]).toMatchObject({ population: 6, staffedFarms: 3, staffedWells: 3, workers: 6, vacantEligible: 0, waterCapacity: 6 })
    expect(rows.every((row) => row.foodBalance >= 0 && row.stage === 'village')).toBe(true)
  })

  it('measures spatial variation without changing the economic composition', () => {
    const types: BuildingType[] = ['farm', 'well', 'well', 'farm', 'well', 'farm']
    const compactState = compact(5, types)
    const distributedState = distributed(5, types)
    expect(metrics(compactState).population).toBe(5)
    expect(metrics(distributedState).population).toBe(5)
    expect(metrics(compactState).farms).toBe(metrics(distributedState).farms)
    expect(metrics(compactState).wells).toBe(metrics(distributedState).wells)
    expect(metrics(distributedState).networks).toBe(1)
    expect(metrics(distributedState).diagnoses).toBeDefined()
  })

  it('compares Food-heavy, Water-heavy, Material-heavy, and mixed production at four workers', () => {
    const mixes: Record<string, BuildingType[]> = {
      foodHeavy: ['farm', 'farm', 'well', 'well'],
      waterHeavy: ['well', 'well', 'farm', 'farm'],
      materialHeavy: ['workshop', 'workshop', 'farm', 'well'],
      mixed: ['farm', 'well', 'workshop', 'workshop'],
    }
    const rows = Object.entries(mixes).map(([label, types]) => ({ label, ...metrics(compact(4, types)) }))
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.workers).toBe(4)
      expect(row.stage).toBeDefined()
      expect(row.diagnoses.staffed).toBe(4)
    }
    expect(rows.find((row) => row.label === 'foodHeavy')?.foodProduction).toBe(4)
    expect(rows.find((row) => row.label === 'materialHeavy')?.materialNet).toBe(2)
  })

  it('measures Construction Crew opportunity cost and recovery', () => {
    const start = compact(4, ['farm', 'farm', 'well', 'well'])
    const site = createBuilding(start, 'residence', 0, 3, 4)
    const worker = Object.values(start.colonists).find((colonist) => colonist.workplaceId !== null)
    if (worker === undefined) throw new Error('missing worker')
    const assigned = stepSimulation(site.state, {
      type: 'assignConstructionCrew',
      colonistId: worker.id,
      buildingId: site.buildingId,
    })
    const during = metrics(assigned)
    expect(during.crew).toBe(1)
    expect(during.workers).toBe(3)
    expect(during.staffedFarms + during.staffedWells + during.staffedWorkshops).toBe(3)

    let recovered = assigned
    for (let tick = 0; tick < 3; tick += 1) recovered = stepSimulation(recovered)
    const after = metrics(recovered)
    expect(after.crew).toBe(0)
    expect(after.workers).toBe(4)
    expect(after.staffedFarms + after.staffedWells + after.staffedWorkshops).toBe(4)
  })

  it('confirms manual reassignment changes the measured mix without changing rules', () => {
    const start = compact(5, ['farm', 'farm', 'farm', 'well', 'well', 'well'])
    const wells = buildingIds(start, 'well')
    const farms = buildingIds(start, 'farm')
    const wellWorker = Object.values(start.colonists).find((colonist) => colonist.workplaceId === wells[0]!)
    if (wellWorker === undefined) throw new Error('missing well worker')
    const changed = stepSimulation(start, {
      type: 'reassignColonist',
      colonistId: wellWorker.id,
      workplaceId: farms[2]!,
    })
    expect(countWorkersAt(changed, farms[2]!)).toBe(1)
    expect(metrics(changed).workers).toBe(5)
  })

  it('keeps measurements deterministic, insertion-order invariant, and save/load stable', () => {
    const state = compact(5, ['farm', 'farm', 'well', 'well', 'workshop', 'workshop'])
    const replay = compact(5, ['farm', 'farm', 'well', 'well', 'workshop', 'workshop'])
    expect(metrics(state)).toEqual(metrics(replay))
    expect(hashCanonicalState(assignJobs(reverseRecords(state)))).toBe(hashCanonicalState(state))
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(assignJobs(restored))).toBe(hashCanonicalState(state))
    expect(metrics(restored)).toEqual(metrics(state))
  })
})
