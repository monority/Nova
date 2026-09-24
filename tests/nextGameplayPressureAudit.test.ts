/** Step 10CA - next gameplay pressure audit. Measurement only. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getFarmWellAllocationSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getProgression,
  getResourceStock,
  getRoadNetworks,
  getTownCapabilityStatus,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getReassignmentOptions,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10ca', width: 28, height: 10 } }

const base = (): SimulationState => {
  const state = createInitialState(config)
  return { ...state, resources: { construction: 1000, food: 1000, water: 1000 } }
}

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
  return { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } } }
}

const road = (state: SimulationState, x: number, y = 1): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('missing road')
  const value = created.state.roads[id]
  if (value === undefined) throw new Error('missing road')
  return { ...created.state, roads: { ...created.state.roads, [id]: { ...value, status: 'operational', constructionRemaining: 0 } } }
}

const settlement = (workers: number, types: readonly BuildingType[], disconnected = false): SimulationState => {
  let state = base()
  for (let index = 0; index < workers; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  for (let x = 0; x <= 24; x += 1) {
    if (disconnected && x === 8) continue
    state = road(state, x)
  }
  types.forEach((type, index) => { state = op(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < workers; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const metrics = (state: SimulationState) => {
  const summary = getFarmWellAllocationSummary(state)
  return {
    population: Object.keys(state.colonists).length,
    farms: summary.farmStaffed,
    wells: summary.wellStaffed,
    workshops: countStaffedOperationalWorkshops(state),
    foodStock: getResourceStock(state).food,
    foodRate: getFoodProductionPerTick(state),
    foodNeed: getFoodConsumptionPerTick(state),
    waterStock: getResourceStock(state).water,
    waterRate: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    materialStock: getResourceStock(state).construction,
    materialRate: getMaterialProductionPerTick(state),
    networks: getRoadNetworks(state).length,
    accessible: Object.values(state.buildings).filter((building) => getBuildingRoadAccess(state, building.id).hasRoadAccess).length,
    stage: getProgression(state).stage,
    blockers: getProgression(state).blockers,
    townReview: getTownCapabilityStatus(state).available,
  }
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const move = (state: SimulationState, from: BuildingType, to: BuildingType): SimulationState => {
  const source = Object.values(state.colonists).find((colonist) => {
    if (colonist.workplaceId === null) return false
    const building = state.buildings[colonist.workplaceId]
    return building?.type === from && getReassignmentOptions(state, colonist.id).some((option) => option.type === to && option.eligible)
  })
  if (source === undefined) throw new Error(`no ${from} to ${to} move`)
  const target = getReassignmentOptions(state, source.id).find((option) => option.type === to && option.eligible)
  if (target === undefined) throw new Error('missing target')
  return stepSimulation(state, { type: 'reassignColonist', colonistId: source.id, workplaceId: target.workplaceId })
}

describe('Step 10CA — current gameplay pressure map', () => {
  it('measures a healthy Town-boundary settlement', () => {
    const state = settlement(10, ['farm', 'farm', 'farm', 'farm', 'farm', 'farm', 'workshop', 'well', 'well', 'well', 'well', 'well'])
    const result = metrics(state)
    expect(result.stage).toBe('town')
    expect(result.townReview).toBe(true)
    expect(result.farms).toBe(6)
    expect(result.wells).toBe(3)
    expect(result.workshops).toBe(1)
    expect(result.foodRate).toBeGreaterThanOrEqual(result.foodNeed)
    expect(result.waterRate).toBeGreaterThan(0)
    expect(result.networks).toBe(1)
  })

  it('measures the current three-way decision and reversibility', () => {
    const state = settlement(4, ['farm', 'well', 'farm', 'workshop', 'farm'])
    const before = metrics(state)
    const farmHeavy = move(state, 'workshop', 'farm')
    const wellState = settlement(4, ['well', 'workshop', 'farm', 'farm', 'well'])
    const wellHeavy = move(wellState, 'workshop', 'well')
    expect(metrics(farmHeavy).foodRate).toBeGreaterThan(before.foodRate)
    expect(metrics(farmHeavy).materialRate).toBeLessThan(before.materialRate)
    expect(metrics(wellHeavy).waterRate).toBeGreaterThan(metrics(wellState).waterRate)
    expect(metrics(wellHeavy).materialRate).toBeLessThan(metrics(wellState).materialRate)
    expect(metrics(move(farmHeavy, 'farm', 'workshop')).materialRate).toBe(before.materialRate)
  })

  it('measures multi-tick trajectories and distinguishes rates from stocks', () => {
    const state = settlement(4, ['farm', 'well', 'workshop', 'farm', 'well'])
    const first = metrics(state)
    const later = metrics(advance(state, 12))
    expect(later.foodStock).toBeLessThanOrEqual(first.foodStock)
    expect(later.waterStock).toBeLessThanOrEqual(first.waterStock)
    expect(later.materialStock).toBeLessThanOrEqual(first.materialStock)
    expect(later.foodRate).toBe(first.foodRate)
    expect(later.waterRate).toBe(first.waterRate)
    expect(later.materialRate).toBe(first.materialRate)
  })

  it('measures spatial validity pressure from a disconnected road row', () => {
    const connected = settlement(4, ['farm', 'well', 'workshop', 'farm'])
    const split = settlement(4, ['farm', 'well', 'workshop', 'farm', 'well'], true)
    expect(metrics(connected).networks).toBe(1)
    expect(metrics(split).networks).toBe(2)
    expect(metrics(split).networks).toBe(2)
    expect(metrics(split).foodRate).toBe(metrics(connected).foodRate)
  })

  it('keeps the current pressure map deterministic and save/load stable', () => {
    const state = settlement(10, ['farm', 'farm', 'farm', 'farm', 'farm', 'workshop', 'well', 'well', 'well', 'well', 'well'])
    const replay = settlement(10, ['farm', 'farm', 'farm', 'farm', 'farm', 'workshop', 'well', 'well', 'well', 'well', 'well'])
    expect(metrics(state)).toEqual(metrics(replay))
    expect(hashCanonicalState(assignJobs(state))).toBe(hashCanonicalState(assignJobs(replay)))
    const restored = loadSave(serializeSave(state))
    expect(metrics(restored)).toEqual(metrics(state))
  })
})
