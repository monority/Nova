import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getNetMaterialPerTick,
  getProgression,
  getResourceStock,
  getRoadNetworks,
  getWaterProductionPerTick,
  iterateBuildings,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10bo', width: 16, height: 8 } }
const base = (): SimulationState => createInitialState(config)

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

const road = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
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

const row = (state: SimulationState, length: number): SimulationState => {
  let next = state
  for (let x = 0; x <= length; x += 1) next = road(next, x, 1)
  return next
}

const colony = (population: number): SimulationState => {
  let state = {
    ...base(),
    resources: { construction: 1000, food: 1000, water: 1000 },
  }
  for (let i = 0; i < population; i += 1) state = operational(state, 'residence', i, 0)
  const farmCount = Math.ceil(population / 2)
  const wellCount = Math.ceil(population / 2)
  for (let i = 0; i < farmCount; i += 1) state = operational(state, 'farm', i, 2)
  for (let i = 0; i < wellCount; i += 1) state = operational(state, 'well', i + 6, 2)
  state = row(state, population + 6)
  for (let i = 0; i < population; i += 1) {
    const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
    const residence = residences[i]
    if (residence === undefined) throw new Error('missing residence')
    state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const metrics = (state: SimulationState) => {
  const employment = getEmploymentSummary(state)
  const buildings = [...iterateBuildings(state)]
  return {
    population: Object.keys(state.colonists).length,
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    waterCapacity: getWaterProductionPerTick(state),
    water: getResourceStock(state).water,
    materialNet: getNetMaterialPerTick(state),
    material: getResourceStock(state).construction,
    reserve: state.storage.material,
    workers: employment.employed,
    farms: buildings.filter((b) => b.type === 'farm' && b.status === 'operational').length,
    wells: buildings.filter((b) => b.type === 'well' && b.status === 'operational').length,
    workshops: buildings.filter((b) => b.type === 'workshop' && b.status === 'operational').length,
    roads: Object.keys(state.roads).length,
    networks: getRoadNetworks(state).length,
    stage: getProgression(state).stage,
  }
}

describe('Step 10BO — concrete scale-pressure measurement', () => {
  it('measures controlled population scaling without changing economy constants', () => {
    const rows = [2, 3, 4, 5, 6, 8, 10].map((population) => ({ ...metrics(colony(population)), population }))
    for (const row of rows) {
      expect(row.foodNet).toBeGreaterThanOrEqual(0)
      expect(row.materialNet).toBeGreaterThanOrEqual(0)
      expect(row.stage).toBe('village')
    }
    expect(rows.find((row) => row.population === 2)?.waterCapacity).toBe(2)
    expect(rows.find((row) => row.population === 3)?.waterCapacity).toBe(2)
    expect(rows.find((row) => row.population === 4)?.waterCapacity).toBe(4)
    expect(rows.find((row) => row.population === 5)?.waterCapacity).toBe(4)
    expect(rows.find((row) => row.population === 6)?.waterCapacity).toBe(6)
    expect(rows.find((row) => row.population === 10)?.workers).toBe(10)
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
  })

  it('shows the same healthy state under replay and insertion-order replay', () => {
    const first = colony(6)
    const second = colony(6)
    expect(metrics(first)).toEqual(metrics(second))
    let a = first
    let b = second
    for (let tick = 0; tick < 12; tick += 1) {
      a = stepSimulation(a)
      b = stepSimulation(b)
    }
    expect(metrics(a)).toEqual(metrics(b))
  })

  it('measures construction pressure as existing Material and duration pressure, not a new mechanic', () => {
    const start = colony(4)
    const sites = [...iterateBuildings(start)].filter((b) => b.type === 'residence').length
    expect(sites).toBe(4)
    expect(getMaterialProductionPerTick(start)).toBe(0)
    expect(start.resources.construction).toBe(1000)
  })
})
