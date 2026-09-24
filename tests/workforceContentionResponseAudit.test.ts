/**
 * Step 10BP - Farm/Well workforce contention response audit.
 *
 * AUDIT ONLY. These tests measure the current type-blind workforce model and
 * the existing manual/construction controls. They do not define a new policy.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getColonistInspection,
  getEmploymentSummary,
  getRoadNetworks,
  getWaterProductionPerTick,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  validateReassignment,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10bp', width: 16, height: 8 },
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

const road = (state: SimulationState, x: number): SimulationState => {
  const created = createRoads(state, [{ x, y: 1 }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('missing road')
  const createdRoad = created.state.roads[id]
  if (createdRoad === undefined) throw new Error('missing road state')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...createdRoad, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const makeColony = (spatial = false): SimulationState => {
  let state = base()
  for (let index = 0; index < 3; index += 1) {
    state = operational(state, 'residence', 1 + index * 2, 0)
  }
  for (let x = 0; x <= 10; x += 1) state = road(state, x)

  if (spatial) {
    // Distances make the first worker take a Farm, the next two take Wells.
    state = operational(state, 'farm', 1, 2)
    state = operational(state, 'well', 3, 2)
    state = operational(state, 'well', 5, 2)
    state = operational(state, 'farm', 9, 2)
  } else {
    // Equal distances plus IDs make the first two take Farms.
    state = operational(state, 'farm', 1, 2)
    state = operational(state, 'farm', 3, 2)
    state = operational(state, 'well', 7, 2)
    state = operational(state, 'well', 9, 2)
  }

  for (let index = 0; index < 3; index += 1) {
    state = createColonist(state, `building-${index + 1}`).state
  }
  return assignJobs(state)
}

const idsOf = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((building) => building.type === type)
    .map((building) => building.id)
    .sort()

const workerOn = (state: SimulationState, workplaceId: string): string => {
  const colonist = Object.values(state.colonists).find(
    (candidate) => candidate.workplaceId === workplaceId
  )
  if (colonist === undefined) throw new Error('missing worker')
  return colonist.id
}

const staffed = (state: SimulationState): { farms: number; wells: number } => ({
  farms: idsOf(state, 'farm').filter((id) => countWorkersAt(state, id) > 0).length,
  wells: idsOf(state, 'well').filter((id) => countWorkersAt(state, id) > 0).length,
})

const reverseRecords = (state: SimulationState): SimulationState => ({
  ...state,
  buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
  roads: Object.fromEntries(Object.entries(state.roads).reverse()),
  colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
})

describe('Step 10BP - current workforce contention', () => {
  it('reproduces the population-3 reference case as a 2/1 Farm/Well split', () => {
    const state = makeColony()
    expect(Object.keys(state.colonists)).toHaveLength(3)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 3,
      employed: 3,
      unemployed: 0,
      jobCapacity: 4,
      vacantJobs: 1,
    })
    expect(staffed(state)).toEqual({ farms: 2, wells: 1 })
    expect(getWaterProductionPerTick(state)).toBe(2)
    expect(getRoadNetworks(state)).toHaveLength(1)
  })

  it('uses distance before building id, not a hidden Food priority', () => {
    const ordinary = makeColony()
    const spatial = makeColony(true)
    expect(staffed(ordinary)).toEqual({ farms: 2, wells: 1 })
    expect(staffed(spatial)).toEqual({ farms: 1, wells: 2 })
    expect(hashCanonicalState(assignJobs(reverseRecords(ordinary)))).toBe(
      hashCanonicalState(ordinary)
    )
  })

  it('manual reassignment can choose either side of the contention', () => {
    const ordinary = makeColony()
    const farms = idsOf(ordinary, 'farm')
    const wells = idsOf(ordinary, 'well')
    const farmWorker = workerOn(ordinary, farms[0]!)
    const wellPriority = stepSimulation(ordinary, {
      type: 'reassignColonist',
      colonistId: farmWorker,
      workplaceId: wells[1]!,
    })
    expect(staffed(wellPriority)).toEqual({ farms: 1, wells: 2 })
    expect(getColonistInspection(wellPriority, farmWorker)?.workplaceAssignmentMode).toBe('manual')

    const spatial = makeColony(true)
    const spatialFarms = idsOf(spatial, 'farm')
    const spatialWells = idsOf(spatial, 'well')
    const wellWorker = workerOn(spatial, spatialWells[0]!)
    expect(validateReassignment(spatial, wellWorker, spatialFarms[1]!)).toMatchObject({
      valid: true,
    })
    const farmPriority = stepSimulation(spatial, {
      type: 'reassignColonist',
      colonistId: wellWorker,
      workplaceId: spatialFarms[1]!,
    })
    expect(staffed(farmPriority)).toEqual({ farms: 2, wells: 1 })
  })

  it('construction crew deliberately removes one worker from production', () => {
    const start = makeColony()
    const farmWorker = workerOn(start, idsOf(start, 'farm')[0]!)
    const site = createBuilding(start, 'residence', 0, 3, 4)
    const withSite = site.state
    const after = stepSimulation(withSite, {
      type: 'assignConstructionCrew',
      colonistId: farmWorker,
      buildingId: site.buildingId,
    })
    expect(after.colonists[farmWorker]?.workplaceId).toBeNull()
    expect(after.colonists[farmWorker]?.constructionAssignmentId).toBe(site.buildingId)
    expect(staffed(after)).toEqual({ farms: 1, wells: 1 })
  })

  it('replays identically after save/load without adding assignment state', () => {
    const state = makeColony(true)
    const restored = loadSave(serializeSave(state))
    expect(serializeSave(restored)).toBe(serializeSave(state))
    expect(hashCanonicalState(assignJobs(restored))).toBe(hashCanonicalState(state))
    expect(staffed(restored)).toEqual({ farms: 1, wells: 2 })
  })

  it('keeps the existing workforce concepts free of specialization state', () => {
    const state = makeColony()
    expect(Object.keys(state.colonists).sort()).toEqual([
      'colonist-1',
      'colonist-2',
      'colonist-3',
    ])
    expect(Object.values(state.colonists).every((colonist) =>
      'workplaceId' in colonist && 'workplaceAssignmentMode' in colonist
    )).toBe(true)
    expect(countStaffedOperationalFarms(state)).toBe(2)
    expect(countStaffedOperationalWorkshops(state)).toBe(0)
  })
})
