/** Step 10BT1 - Farm/Well allocation expression contract tests. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFarmWellAllocationSummary,
  getReassignmentOptions,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10bt1', width: 20, height: 8 } }

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

const road = (state: SimulationState, x: number): SimulationState => {
  const created = createRoads(state, [{ x, y: 1 }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('missing road')
  const value = created.state.roads[id]
  if (value === undefined) throw new Error('missing road state')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...value, status: 'operational', constructionRemaining: 0 } },
  }
}

const fixture = (types: BuildingType[]): SimulationState => {
  let state = base()
  for (let index = 0; index < 5; index += 1) state = operational(state, 'residence', 1 + index * 2, 0)
  for (let x = 0; x <= 12; x += 1) state = road(state, x)
  types.forEach((type, index) => { state = operational(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < 5; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const farmHeavy = (): SimulationState => fixture(['farm', 'farm', 'farm', 'well', 'well', 'well'])
const wellHeavy = (): SimulationState => fixture(['well', 'well', 'well', 'farm', 'farm', 'farm'])

describe('Step 10BT1 — Farm/Well allocation expression', () => {
  it('expresses the Farm-heavy allocation and its Food/Water consequence', () => {
    expect(getFarmWellAllocationSummary(farmHeavy())).toEqual({
      population: 5,
      employed: 5,
      farmStaffed: 3,
      farmCapacity: 3,
      wellStaffed: 2,
      wellCapacity: 3,
      vacantFarmJobs: 0,
      vacantWellJobs: 1,
      foodProduction: 6,
      foodConsumption: 5,
      foodBalance: 1,
      waterCapacity: 4,
      waterNeed: 5,
      waterHeadroom: -1,
    })
  })

  it('expresses the Well-heavy allocation as the reversible counterpart', () => {
    expect(getFarmWellAllocationSummary(wellHeavy())).toEqual({
      population: 5,
      employed: 5,
      farmStaffed: 2,
      farmCapacity: 3,
      wellStaffed: 3,
      wellCapacity: 3,
      vacantFarmJobs: 1,
      vacantWellJobs: 0,
      foodProduction: 4,
      foodConsumption: 5,
      foodBalance: -1,
      waterCapacity: 6,
      waterNeed: 5,
      waterHeadroom: 1,
    })
  })

  it('follows manual reassignment and save/load without persisted UI state', () => {
    const start = wellHeavy()
    const well = Object.values(start.buildings).find((building) => building.type === 'well' && building.status === 'operational' && start.colonists['colonist-1']?.workplaceId !== building.id)
    if (well === undefined) throw new Error('missing well')
    const worker = Object.values(start.colonists).find((colonist) => colonist.workplaceId === well.id)
    if (worker === undefined) throw new Error('missing worker')
    const target = getReassignmentOptions(start, worker.id).find((option) => option.type === 'farm' && option.eligible)
    if (target === undefined) throw new Error('missing eligible farm')
    const moved = stepSimulation(start, { type: 'reassignColonist', colonistId: worker.id, workplaceId: target.workplaceId })
    expect(getFarmWellAllocationSummary(moved)).toMatchObject({ farmStaffed: 3, wellStaffed: 2, waterHeadroom: -1 })
    const restored = loadSave(serializeSave(moved))
    expect(getFarmWellAllocationSummary(restored)).toEqual(getFarmWellAllocationSummary(moved))
  })

  it('does not change allocation or diagnosis when the state is replayed', () => {
    const state = farmHeavy()
    expect(getFarmWellAllocationSummary(assignJobs(state))).toEqual(getFarmWellAllocationSummary(state))
  })
})
