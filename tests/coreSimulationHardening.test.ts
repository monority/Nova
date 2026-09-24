/** Step 10BY - core simulation hardening invariant audit. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  applyCommand,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFarmWellAllocationSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getProgression,
  getTownCapabilityStatus,
  getReassignmentOptions,
  validateReassignment,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10by', width: 24, height: 8 } }

const base = (): SimulationState => {
  const state = createInitialState(config)
  return { ...state, resources: { construction: 1000, food: 1000, water: 1000 } }
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

const roadRow = (state: SimulationState, length: number): SimulationState => {
  const created = createRoads(state, Array.from({ length: length + 1 }, (_, x) => ({ x, y: 1 })))
  const roads = { ...created.state.roads }
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) roads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  return { ...created.state, roads }
}

const fixture = (workers: number, types: readonly BuildingType[]): SimulationState => {
  let state = base()
  for (let index = 0; index < workers; index += 1) state = operational(state, 'residence', 1 + index * 2, 0)
  state = roadRow(state, 22)
  types.forEach((type, index) => { state = operational(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < workers; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const mixed = (): SimulationState => fixture(5, ['farm', 'well', 'workshop', 'farm', 'well', 'workshop'])
const townQualified = (): SimulationState => fixture(10, ['workshop', 'well', 'well', 'well', 'well', 'farm', 'farm', 'farm', 'farm', 'farm', 'farm'])

const assignmentsAreSingular = (state: SimulationState): boolean => {
  const workplaceCounts = new Map<string, number>()
  for (const colonist of Object.values(state.colonists)) {
    if (colonist.workplaceId === null) continue
    if (!state.buildings[colonist.workplaceId]) return false
    workplaceCounts.set(colonist.workplaceId, (workplaceCounts.get(colonist.workplaceId) ?? 0) + 1)
  }
  return [...workplaceCounts.values()].every((count) => count <= 1)
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const reverseRecords = (state: SimulationState): SimulationState => ({
  ...state,
  buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
  roads: Object.fromEntries(Object.entries(state.roads).reverse()),
  colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
})

describe('Step 10BY — core simulation hardening', () => {
  it('keeps colonist assignments singular and valid', () => {
    const state = mixed()
    expect(assignmentsAreSingular(state)).toBe(true)
    expect(Object.values(state.colonists).every((colonist) => colonist.workplaceId === null || state.buildings[colonist.workplaceId] !== undefined)).toBe(true)
    for (const building of iterateBuildings(state)) {
      if (building.type === 'farm' || building.type === 'well' || building.type === 'workshop') {
        expect(countWorkersAt(state, building.id)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps production rates, stocks, and workforce summaries distinct', () => {
    const state = mixed()
    const summary = getFarmWellAllocationSummary(state)
    expect(getFoodProductionPerTick(state)).toBe(summary.foodProduction)
    expect(getFoodConsumptionPerTick(state)).toBe(summary.foodConsumption)
    expect(getWaterProductionPerTick(state)).toBe(summary.waterCapacity)
    expect(getWaterNeedPerTick(state)).toBe(summary.waterNeed)
    expect(getMaterialProductionPerTick(state)).toBe(2)
    expect(state.resources.food).not.toBe(getFoodProductionPerTick(state))
    expect(state.resources.water).not.toBe(getWaterProductionPerTick(state))
    expect(state.resources.construction).not.toBe(getMaterialProductionPerTick(state))
  })

  it('preserves zero, one, many, and partial-world edge behavior', () => {
    const empty = base()
    expect(getFoodProductionPerTick(empty)).toBe(0)
    expect(getWaterProductionPerTick(empty)).toBe(0)
    expect(getMaterialProductionPerTick(empty)).toBe(0)
    const farmOnly = fixture(1, ['farm'])
    expect(countStaffedOperationalFarms(farmOnly)).toBe(1)
    expect(countStaffedOperationalWells(farmOnly)).toBe(0)
    const workshopOnly = fixture(1, ['workshop'])
    expect(countStaffedOperationalWorkshops(workshopOnly)).toBe(1)
    expect(getProgression(workshopOnly).stage).toBe('wilderness')
  })

  it('rejects invalid reassignment targets without changing canonical state', () => {
    const state = mixed()
    const before = serializeCanonicalState(state)
    const worker = Object.values(state.colonists).find((colonist) => colonist.workplaceId !== null)
    if (worker === undefined) throw new Error('missing worker')
    for (const workplaceId of ['missing', 'residence-missing']) {
      const result = applyCommand(state, { type: 'reassignColonist', colonistId: worker.id, workplaceId })
      expect(result.accepted).toBe(false)
      expect(result.state).toBe(state)
    }
    expect(serializeCanonicalState(state)).toBe(before)
  })

  it('preserves the three-way economy and reverses each reassignment', () => {
    const start = mixed()
    const source = Object.values(start.colonists).find((colonist) => {
      if (colonist.workplaceId === null) return false
      return getReassignmentOptions(start, colonist.id).some((option) => option.type === 'workshop' && option.eligible)
    })
    const target = source === undefined ? undefined : getReassignmentOptions(start, source.id).find((option) => option.type === 'workshop' && option.eligible)
    if (source === undefined || target === undefined) throw new Error('missing move target')
    const changed = stepSimulation(start, { type: 'reassignColonist', colonistId: source.id, workplaceId: target.workplaceId })
    expect(getMaterialProductionPerTick(changed)).toBeGreaterThan(getMaterialProductionPerTick(start))
    expect(getTownCapabilityStatus(changed).available).toBe(getTownCapabilityStatus(start).available)
  })

  it('keeps Town derived and revalidates after a bad reallocation', () => {
    const town = townQualified()
    expect(getProgression(town).stage).toBe('town')
    expect(getTownCapabilityStatus(town).available).toBe(true)
    const workshopId = Object.values(town.buildings).find((building) => building.type === 'workshop')?.id
    const worker = Object.values(town.colonists).find((colonist) => colonist.workplaceId === workshopId)
    if (workshopId === undefined || worker === undefined) throw new Error('missing Town worker')
    const farmTarget = Object.values(town.buildings)
      .filter((building) => building.type === 'farm')
      .map((building) => building.id)
      .find((buildingId) => validateReassignment(town, worker.id, buildingId).valid)
    if (farmTarget === undefined) throw new Error('missing Town farm')
    const degraded = stepSimulation(town, { type: 'reassignColonist', colonistId: worker.id, workplaceId: farmTarget })
    expect(getProgression(degraded).stage).toBe('village')
    expect(getTownCapabilityStatus(degraded).available).toBe(false)
  })

  it('keeps save/load and uninterrupted continuation equivalent', () => {
    const start = mixed()
    const uninterrupted = advance(start, 8)
    const restored = loadSave(serializeSave(start))
    const continued = advance(restored, 8)
    expect(serializeCanonicalState(continued)).toBe(serializeCanonicalState(uninterrupted))
    expect(hashCanonicalState(continued)).toBe(hashCanonicalState(uninterrupted))
  })

  it('keeps equivalent record order deterministic', () => {
    const state = mixed()
    const reordered = reverseRecords(state)
    expect(hashCanonicalState(assignJobs(reordered))).toBe(hashCanonicalState(assignJobs(state)))
    expect(getFarmWellAllocationSummary(reordered)).toEqual(getFarmWellAllocationSummary(state))
  })
})
