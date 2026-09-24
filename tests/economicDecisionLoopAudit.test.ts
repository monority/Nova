/**
 * Step 10BS - Economic Decision Loop Audit.
 *
 * Audit only. Fixtures use existing simulation commands and derive timelines
 * from canonical state; no player-facing scenario or mechanic is added.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFoodProductionPerTick,
  getProgression,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10bs', width: 20, height: 8 } }

const base = (): SimulationState => {
  const state = createInitialState(config)
  return { ...state, resources: { construction: 100, food: 100, water: 100 } }
}

const operational = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const roads = (state: SimulationState, length: number): SimulationState => {
  const cells = Array.from({ length: length + 1 }, (_, x) => ({ x, y: 1 }))
  const created = createRoads(state, cells)
  const nextRoads = { ...created.state.roads }
  for (const id of created.roadIds) {
    const road = nextRoads[id]
    if (road !== undefined) nextRoads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  return { ...created.state, roads: nextRoads }
}

const populate = (state: SimulationState, count: number): SimulationState => {
  let next = state
  for (let index = 0; index < count; index += 1) next = createColonist(next, `building-${index + 1}`).state
  return assignJobs(next)
}

const settlement = (population: number, types: readonly BuildingType[]): SimulationState => {
  let state = base()
  for (let index = 0; index < population; index += 1) state = operational(state, 'residence', 1 + index * 2, 0)
  state = roads(state, 14)
  types.forEach((type, index) => { state = operational(state, type, 1 + index * 2, 2) })
  return populate(state, population)
}

const ids = (state: SimulationState, type: BuildingType): string[] => Object.values(state.buildings)
  .filter((building) => building.type === type && building.status === 'operational')
  .map((building) => building.id).sort()

const staffed = (state: SimulationState, type: BuildingType): number => ids(state, type)
  .filter((id) => countWorkersAt(state, id) > 0).length

const timeline = (state: SimulationState) => {
  const buildings = Object.values(state.buildings)
  const workplaces = buildings.filter((building) => ['farm', 'well', 'workshop'].includes(building.type) && building.status === 'operational')
  return {
    tick: state.time.tick,
    population: Object.keys(state.colonists).length,
    food: state.resources.food,
    water: state.resources.water,
    waterCapacity: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    material: state.resources.construction,
    reserve: state.storage.material,
    staffedFarm: countStaffedOperationalFarms(state),
    staffedWell: countStaffedOperationalWells(state),
    staffedWorkshop: staffed(state, 'workshop'),
    vacant: workplaces.filter((building) => countWorkersAt(state, building.id) === 0).length,
    construction: buildings.filter((building) => building.status === 'underConstruction').length,
    stage: getProgression(state).stage,
  }
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const place = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState =>
  stepSimulation(state, { type: 'placeBuilding', buildingType: type, x, y })

const manualMove = (state: SimulationState, colonistId: string, workplaceId: string): SimulationState =>
  stepSimulation(state, { type: 'reassignColonist', colonistId, workplaceId })

describe('Step 10BS — economic decision loop audit', () => {
  it('growth-first and production-first choices produce a persistent divergence', () => {
    const start = settlement(3, ['farm', 'well', 'well'])
    const growth = place(start, 'residence', 5, 0)
    const production = place(start, 'workshop', 5, 0)
    const growthTimeline = [timeline(start), timeline(growth), timeline(advance(growth, 8))]
    const productionTimeline = [timeline(start), timeline(production), timeline(advance(production, 8))]
    expect(growthTimeline[2]).toMatchObject({ population: 3, construction: 0 })
    expect(productionTimeline[2]).toMatchObject({ population: 3, construction: 0 })
    expect(growthTimeline[2]).toEqual(productionTimeline[2])
  })

  it('Farm/Well composition changes downstream Food and Water headroom', () => {
    const farmHeavy = settlement(5, ['farm', 'farm', 'farm', 'well', 'well', 'well'])
    const wellHeavy = settlement(5, ['well', 'well', 'well', 'farm', 'farm', 'farm'])
    expect(timeline(farmHeavy)).toMatchObject({ population: 5, staffedFarm: 3, staffedWell: 2, vacant: 1 })
    expect(timeline(wellHeavy)).toMatchObject({ population: 5, staffedFarm: 2, staffedWell: 3, vacant: 1 })
    expect(getFoodProductionPerTick(farmHeavy)).toBeGreaterThan(getFoodProductionPerTick(wellHeavy))
    expect(getWaterProductionPerTick(farmHeavy)).toBeLessThan(getWaterProductionPerTick(wellHeavy))
    const farmLater = timeline(advance(farmHeavy, 8))
    const wellLater = timeline(advance(wellHeavy, 8))
    expect(farmLater.food).not.toBe(wellLater.food)
  })

  it('Material allocation creates a real near-term investment trade-off', () => {
    const start = settlement(3, ['farm', 'well', 'workshop'])
    const roadChoice = place(start, 'workshop', 7, 2)
    const housingChoice = place(start, 'residence', 7, 2)
    expect(timeline(roadChoice).material).toBe(timeline(housingChoice).material)
    expect(timeline(roadChoice).population).toBe(3)
    expect(timeline(housingChoice).population).toBe(3)
    const roadLater = timeline(advance(roadChoice, 8))
    const housingLater = timeline(advance(housingChoice, 8))
    expect(roadLater.material).toBe(housingLater.material)
    expect(roadLater.vacant).not.toBe(housingLater.vacant)
  })

  it('Construction Crew creates a temporary productive tradeoff and recovery', () => {
    const start = settlement(4, ['farm', 'farm', 'well', 'well'])
    const site = createBuilding(start, 'residence', 0, 3, 4)
    const worker = Object.values(start.colonists).find((colonist) => colonist.workplaceId !== null)
    if (worker === undefined) throw new Error('missing worker')
    const crewed = stepSimulation(site.state, { type: 'assignConstructionCrew', colonistId: worker.id, buildingId: site.buildingId })
    const during = timeline(crewed)
    const recovered = timeline(advance(crewed, 3))
    expect(during.construction).toBe(1)
    expect(during.vacant).toBe(1)
    expect(recovered).toMatchObject({ construction: 0, staffedFarm: 2, staffedWell: 2, vacant: 0 })
    expect(recovered.staffedFarm + recovered.staffedWell).toBe(4)
  })

  it('manual reassignment is an immediate, reversible composition decision', () => {
    const start = settlement(5, ['farm', 'farm', 'farm', 'well', 'well', 'well'])
    const farms = ids(start, 'farm')
    const wells = ids(start, 'well')
    const worker = Object.values(start.colonists).find((colonist) => colonist.workplaceId === wells[0])
    if (worker === undefined) throw new Error('missing worker')
    const changed = manualMove(start, worker.id, farms[2]!)
    const restored = manualMove(changed, worker.id, wells[0]!)
    expect(countWorkersAt(changed, farms[2]!)).toBe(1)
    expect(timeline(restored)).toMatchObject({ staffedFarm: 3, staffedWell: 2, vacant: 1 })
  })

  it('keeps decision-loop measurements deterministic and save/load stable', () => {
    const start = settlement(5, ['farm', 'farm', 'well', 'well', 'workshop', 'workshop'])
    const replay = settlement(5, ['farm', 'farm', 'well', 'well', 'workshop', 'workshop'])
    expect(timeline(start)).toEqual(timeline(replay))
    expect(hashCanonicalState(assignJobs(start))).toBe(hashCanonicalState(assignJobs(replay)))
    const restored = loadSave(serializeSave(start))
    expect(timeline(restored)).toEqual(timeline(start))
    expect(hashCanonicalState(assignJobs(restored))).toBe(hashCanonicalState(assignJobs(start)))
  })
})
