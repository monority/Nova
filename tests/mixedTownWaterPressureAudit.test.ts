/** Step 10CE - mixed-Town Water pressure audit. Measurement only. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getProgression,
  getResourceStock,
  getReassignmentOptions,
  getTownCapabilityStatus,
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

const config: SimulationConfig = { world: { seed: 'nova-step10ce', width: 28, height: 10 } }

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
  return { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } } }
}

const town = (types: readonly BuildingType[], water = 20): SimulationState => {
  let state = createInitialState(config)
  state = { ...state, resources: { construction: 1000, food: 1000, water } }
  for (let index = 0; index < 10; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  const created = createRoads(state, Array.from({ length: 25 }, (_, x) => ({ x, y: 1 })))
  state = created.state
  const roads = { ...state.roads }
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) roads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  state = { ...state, roads }
  types.forEach((type, index) => { state = op(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < 10; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const metrics = (state: SimulationState) => ({
  farms: countStaffedOperationalFarms(state),
  wells: countStaffedOperationalWells(state),
  workshops: countStaffedOperationalWorkshops(state),
  workers: Object.values(state.colonists).filter((colonist) => colonist.workplaceId !== null).length,
  food: getResourceStock(state).food,
  foodRate: getFoodProductionPerTick(state),
  water: getResourceStock(state).water,
  waterRate: getWaterProductionPerTick(state),
  waterNeed: getWaterNeedPerTick(state),
  waterHeadroom: getWaterProductionPerTick(state) - getWaterNeedPerTick(state),
  material: getResourceStock(state).construction,
  materialRate: getMaterialProductionPerTick(state),
  stage: getProgression(state).stage,
  townReview: getTownCapabilityStatus(state).available,
})

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const move = (state: SimulationState, from: BuildingType, to: BuildingType): SimulationState | null => {
  const source = Object.values(state.colonists).find((colonist) => {
    if (colonist.workplaceId === null) return false
    const building = state.buildings[colonist.workplaceId]
    return building?.type === from && getReassignmentOptions(state, colonist.id).some((option) => option.type === to && option.eligible)
  })
  if (source === undefined) return null
  const target = getReassignmentOptions(state, source.id).find((option) => option.type === to && option.eligible)
  return target === undefined ? null : stepSimulation(state, { type: 'reassignColonist', colonistId: source.id, workplaceId: target.workplaceId })
}

const balanced = (): SimulationState => town(['farm', 'well', 'farm', 'well', 'farm', 'well', 'farm', 'well', 'farm', 'well'], 100)
const waterTight = (): SimulationState => town(['workshop', 'farm', 'farm', 'farm', 'farm', 'farm', 'well', 'well', 'well', 'well', 'well'], 20)
const foodTight = (): SimulationState => town(['workshop', 'farm', 'well', 'well', 'well', 'well', 'well', 'workshop', 'workshop', 'workshop'], 100)
const materialTight = (): SimulationState => town(['workshop', 'workshop', 'workshop', 'farm', 'farm', 'farm', 'well', 'well', 'well', 'well'], 100)
const mixedPressure = (): SimulationState => town(['workshop', 'farm', 'farm', 'farm', 'well', 'well', 'well', 'well', 'workshop', 'workshop'], 20)

describe('Step 10CE — mixed-Town Water pressure audit', () => {
  it('measures balanced, Water-tight, Food-tight, and Material-tight classes', () => {
    const rows = {
      balanced: metrics(balanced()),
      waterTight: metrics(waterTight()),
      foodTight: metrics(foodTight()),
      materialTight: metrics(materialTight()),
    }
    expect(rows.balanced.waterHeadroom).toBeGreaterThanOrEqual(0)
    expect(rows.balanced.foodRate).toBeGreaterThanOrEqual(rows.balanced.waterNeed)
    expect(rows.waterTight.waterHeadroom).toBeLessThan(0)
    expect(rows.foodTight.foodRate).toBeLessThan(10)
    expect(rows.materialTight.materialRate).toBeGreaterThanOrEqual(rows.balanced.materialRate)
    expect(rows.waterTight.townReview).toBe(true)
  })

  it('measures multi-tick Water pressure and recurrence', () => {
    const start = waterTight()
    const short = metrics(advance(start, 4))
    const medium = metrics(advance(start, 12))
    const long = metrics(advance(start, 24))
    expect(short.waterHeadroom).toBeLessThan(0)
    expect(medium.water).toBeLessThan(short.water)
    expect(long.water).toBe(0)
    expect(long.waterRate).toBe(short.waterRate)
    expect(long.foodRate).toBe(short.foodRate)
  })

  it('shows existing Farm/Well reassignment resolves Water pressure but moves the tradeoff', () => {
    const start = waterTight()
    const resolved = move(start, 'farm', 'well')
    expect(resolved).not.toBeNull()
    if (resolved === null) return
    const before = metrics(start)
    const after = metrics(resolved)
    expect(after.waterHeadroom).toBeGreaterThan(before.waterHeadroom)
    expect(after.foodRate).toBeLessThan(before.foodRate)
    expect(after.waterRate).toBeGreaterThan(before.waterRate)
  })

  it('shows Workshop reassignment resolves Water pressure only by accepting Material cost', () => {
    const start = waterTight()
    const resolved = move(start, 'workshop', 'well')
    expect(resolved).not.toBeNull()
    if (resolved === null) return
    const before = metrics(start)
    const after = metrics(resolved)
    expect(after.waterHeadroom).toBeGreaterThan(before.waterHeadroom)
    expect(after.materialRate).toBeLessThan(before.materialRate)
    expect(after.foodRate).toBe(before.foodRate)
  })

  it('keeps the mixed-Town matrix deterministic and save/load stable', () => {
    const start = mixedPressure()
    const replay = mixedPressure()
    expect(metrics(start)).toEqual(metrics(replay))
    expect(hashCanonicalState(assignJobs(start))).toBe(hashCanonicalState(assignJobs(replay)))
    const restored = loadSave(serializeSave(start))
    expect(metrics(restored)).toEqual(metrics(start))
    expect(metrics(advance(restored, 8))).toEqual(metrics(advance(start, 8)))
  })
})
