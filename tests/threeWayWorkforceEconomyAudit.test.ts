/** Step 10BU - three-way Farm/Well/Workshop workforce economy audit. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFarmWellAllocationSummary,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getReassignmentOptions,
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

const config: SimulationConfig = { world: { seed: 'nova-step10bu', width: 24, height: 8 } }

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

const roads = (state: SimulationState): SimulationState => {
  const created = createRoads(state, Array.from({ length: 16 }, (_, x) => ({ x, y: 1 })))
  const nextRoads = { ...created.state.roads }
  for (const id of created.roadIds) {
    const road = nextRoads[id]
    if (road !== undefined) nextRoads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  return { ...created.state, roads: nextRoads }
}

const ids = (state: SimulationState, type: BuildingType): string[] => Object.values(state.buildings)
  .filter((building) => building.type === type && building.status === 'operational')
  .map((building) => building.id)
  .sort()

const fixture = (workers: number, types: BuildingType[]): SimulationState => {
  let state = base()
  for (let index = 0; index < workers; index += 1) state = operational(state, 'residence', 1 + index * 2, 0)
  state = roads(state)
  types.forEach((type, index) => { state = operational(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < workers; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const metrics = (state: SimulationState) => ({
  farms: countStaffedOperationalFarms(state),
  wells: countStaffedOperationalWells(state),
  workshops: countStaffedOperationalWorkshops(state),
  food: getFoodProductionPerTick(state),
  water: getWaterProductionPerTick(state),
  waterNeed: getWaterNeedPerTick(state),
  material: getMaterialProductionPerTick(state),
  summary: getFarmWellAllocationSummary(state),
})

const findMove = (state: SimulationState, from: BuildingType, to: BuildingType): { colonistId: string; workplaceId: string } => {
  const fromIds = ids(state, from)
  for (const colonist of Object.values(state.colonists)) {
    if (colonist.workplaceId === null || !fromIds.includes(colonist.workplaceId)) continue
    const target = getReassignmentOptions(state, colonist.id).find((option) => option.type === to && option.eligible)
    if (target !== undefined) return { colonistId: colonist.id, workplaceId: target.workplaceId }
  }
  throw new Error(`no valid ${from} to ${to} move`)
}

const move = (state: SimulationState, from: BuildingType, to: BuildingType): SimulationState => {
  const pair = findMove(state, from, to)
  return stepSimulation(state, { type: 'reassignColonist', colonistId: pair.colonistId, workplaceId: pair.workplaceId })
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

describe('Step 10BU — three-way workforce economy audit', () => {
  it('measures a staffable Farm/Well/Workshop composition', () => {
    const state = fixture(5, ['farm', 'well', 'workshop', 'farm', 'well', 'workshop'])
    const result = metrics(state)
    expect(result.farms).toBeGreaterThan(0)
    expect(result.wells).toBeGreaterThan(0)
    expect(result.workshops).toBeGreaterThan(0)
    expect(result.summary.population).toBe(5)
    expect(result.food).toBe(4)
    expect(result.water).toBe(4)
    expect(result.material).toBe(2)
  })

  it('measures Farm to Workshop and its reversible counterpart', () => {
    const start = fixture(4, ['farm', 'well', 'farm', 'well', 'workshop'])
    const before = metrics(start)
    const changed = move(start, 'farm', 'workshop')
    const after = metrics(changed)
    expect(after.farms).toBe(before.farms - 1)
    expect(after.workshops).toBe(before.workshops + 1)
    expect(after.food).toBe(before.food - 2)
    expect(after.material).toBe(before.material + 2)
    expect(after.water).toBe(before.water)
    const restored = move(changed, 'workshop', 'farm')
    expect(metrics(restored)).toEqual(before)
  })

  it('measures Well to Workshop and its reversible counterpart', () => {
    const start = fixture(4, ['well', 'farm', 'well', 'farm', 'workshop'])
    const before = metrics(start)
    const changed = move(start, 'well', 'workshop')
    const after = metrics(changed)
    expect(after.wells).toBe(before.wells - 1)
    expect(after.workshops).toBe(before.workshops + 1)
    expect(after.water).toBe(before.water - 2)
    expect(after.material).toBe(before.material + 2)
    expect(after.food).toBe(before.food)
    const restored = move(changed, 'workshop', 'well')
    expect(metrics(restored)).toEqual(before)
  })

  it('measures the larger mixed composition and persistence over ticks', () => {
    const state = fixture(6, ['farm', 'farm', 'well', 'well', 'workshop', 'workshop'])
    const before = metrics(state)
    const later = metrics(advance(state, 8))
    expect(later.farms).toBe(before.farms)
    expect(later.wells).toBe(before.wells)
    expect(later.workshops).toBe(before.workshops)
    expect(later.food).toBe(before.food)
    expect(later.water).toBe(before.water)
    expect(later.material).toBe(before.material)
  })

  it('keeps three-way measurements deterministic and save/load stable', () => {
    const state = fixture(5, ['farm', 'well', 'farm', 'well', 'workshop', 'workshop'])
    const replay = fixture(5, ['farm', 'well', 'farm', 'well', 'workshop', 'workshop'])
    expect(metrics(state)).toEqual(metrics(replay))
    expect(hashCanonicalState(assignJobs(state))).toBe(hashCanonicalState(assignJobs(replay)))
    const restored = loadSave(serializeSave(state))
    expect(metrics(restored)).toEqual(metrics(state))
    expect(hashCanonicalState(assignJobs(restored))).toBe(hashCanonicalState(assignJobs(state)))
  })
})
