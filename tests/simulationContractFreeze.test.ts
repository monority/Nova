/** Step 10BZ - simulation contract freeze and boundary audit. */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFarmWellAllocationSummary,
  getProgression,
  getResourceStock,
  getTownCapabilityStatus,
  hashCanonicalState,
  loadSave,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10bz', width: 24, height: 8 } }

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

const roads = (state: SimulationState): SimulationState => {
  const created = createRoads(state, Array.from({ length: 23 }, (_, x) => ({ x, y: 1 })))
  const nextRoads = { ...created.state.roads }
  for (const id of created.roadIds) {
    const road = nextRoads[id]
    if (road !== undefined) nextRoads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  return { ...created.state, roads: nextRoads }
}

const mixed = (): SimulationState => {
  let state = base()
  for (let index = 0; index < 5; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  state = roads(state)
  for (const [index, type] of (['farm', 'well', 'workshop', 'farm', 'well', 'workshop'] as BuildingType[]).entries()) state = op(state, type, 1 + index * 2, 2)
  for (let index = 0; index < 5; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const town = (): SimulationState => {
  let state = base()
  for (let index = 0; index < 10; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  state = roads(state)
  for (const [index, type] of (['workshop', 'well', 'well', 'well', 'well', 'farm', 'farm', 'farm', 'farm', 'farm', 'farm'] as BuildingType[]).entries()) state = op(state, type, 1 + index * 2, 2)
  for (let index = 0; index < 10; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const reorder = (state: SimulationState): SimulationState => ({
  ...state,
  buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
  roads: Object.fromEntries(Object.entries(state.roads).reverse()),
  colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
})

describe('Step 10BZ — simulation contract freeze', () => {
  it('freezes canonical workforce and building contracts', () => {
    const state = mixed()
    for (const colonist of Object.values(state.colonists)) {
      if (colonist.workplaceId !== null) expect(state.buildings[colonist.workplaceId]).toBeDefined()
    }
    for (const building of Object.values(state.buildings)) {
      if (building.type === 'farm' || building.type === 'well' || building.type === 'workshop') {
        expect(countWorkersAt(state, building.id)).toBeLessThanOrEqual(1)
      }
    }
    expect(countStaffedOperationalFarms(state)).toBe(2)
    expect(countStaffedOperationalWells(state)).toBe(2)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
  })

  it('freezes stock, rate, capacity, and headroom as separate contracts', () => {
    const state = mixed()
    const summary = getFarmWellAllocationSummary(state)
    expect(summary.foodProduction).toBe(4)
    expect(summary.foodConsumption).toBe(5)
    expect(summary.waterCapacity).toBe(4)
    expect(summary.waterNeed).toBe(5)
    expect(summary.waterHeadroom).toBe(-1)
    expect(getResourceStock(state).food).toBe(1000)
    expect(getResourceStock(state).water).toBe(1000)
    expect(getResourceStock(state).construction).toBe(1000)
  })

  it('freezes invalid command boundaries and no-op behavior', () => {
    const state = mixed()
    const worker = Object.values(state.colonists).find((colonist) => colonist.workplaceId !== null)
    if (worker === undefined) throw new Error('missing worker')
    const before = serializeCanonicalState(state)
    const result = applyCommand(state, { type: 'reassignColonist', colonistId: worker.id, workplaceId: 'missing-building' })
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('unknownWorkplace')
    expect(result.state).toBe(state)
    expect(serializeCanonicalState(state)).toBe(before)
  })

  it('freezes the current tick result and derived-query purity', () => {
    const state = mixed()
    const before = serializeCanonicalState(state)
    const summary = getFarmWellAllocationSummary(state)
    const after = stepSimulation(state)
    expect(getFarmWellAllocationSummary(state)).toEqual(summary)
    expect(serializeCanonicalState(state)).toBe(before)
    expect(after.time.tick).toBe(state.time.tick + 1)
  })

  it('freezes dynamic Town progression and capability invalidation', () => {
    const state = town()
    expect(getProgression(state).stage).toBe('town')
    expect(getTownCapabilityStatus(state).available).toBe(true)
    const workshopId = Object.values(state.buildings).find((building) => building.type === 'workshop')?.id
    const worker = Object.values(state.colonists).find((colonist) => colonist.workplaceId === workshopId)
    const farmId = Object.values(state.buildings).find((building) => building.type === 'farm' && countWorkersAt(state, building.id) === 0)?.id
    if (workshopId === undefined || worker === undefined || farmId === undefined) throw new Error('missing Town transition target')
    const degraded = stepSimulation(state, { type: 'reassignColonist', colonistId: worker.id, workplaceId: farmId })
    expect(getProgression(degraded).stage).toBe('village')
    expect(getTownCapabilityStatus(degraded).available).toBe(false)
  })

  it('freezes save/load continuation and hash equivalence', () => {
    const state = mixed()
    const uninterrupted = advance(state, 6)
    const continued = advance(loadSave(serializeSave(state)), 6)
    expect(serializeCanonicalState(continued)).toBe(serializeCanonicalState(uninterrupted))
    expect(hashCanonicalState(continued)).toBe(hashCanonicalState(uninterrupted))
  })

  it('freezes insertion-order independence', () => {
    const state = mixed()
    const reordered = reorder(state)
    expect(hashCanonicalState(assignJobs(reordered))).toBe(hashCanonicalState(assignJobs(state)))
    expect(getFarmWellAllocationSummary(reordered)).toEqual(getFarmWellAllocationSummary(state))
    expect(getProgression(reordered)).toEqual(getProgression(state))
  })
})
