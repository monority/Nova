/** Step 10CG - Town gameplay quality audit. */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getFarmWellAllocationSummary,
  getProgression,
  getReassignmentOptions,
  getTownCapabilityStatus,
  getWorkplaceWorkforceDiagnosis,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10cg', width: 24, height: 8 } }

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
  return { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } } }
}

const fixture = (workers: number, types: BuildingType[]): SimulationState => {
  let state = { ...createInitialState(config), resources: { construction: 1000, food: 1000, water: 1000 } }
  for (let index = 0; index < workers; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  const created = createRoads(state, Array.from({ length: 23 }, (_, x) => ({ x, y: 1 })))
  state = created.state
  const roads = { ...state.roads }
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) roads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  state = { ...state, roads }
  types.forEach((type, index) => { state = op(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < workers; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const town = (): SimulationState => fixture(10, ['workshop', 'farm', 'farm', 'farm', 'farm', 'farm', 'well', 'well', 'well', 'well'])
const mixed = (): SimulationState => fixture(2, ['farm', 'well'])
const decision = (): SimulationState => fixture(4, ['workshop', 'farm', 'well', 'farm', 'well'])

const allocation = (state: SimulationState) => getFarmWellAllocationSummary(state)

const moveFirst = (state: SimulationState, from: BuildingType, to: BuildingType): SimulationState => {
  const colonist = Object.values(state.colonists).find((candidate) => {
    const building = candidate.workplaceId === null ? undefined : state.buildings[candidate.workplaceId]
    return building?.type === from
  })
  if (colonist === undefined) throw new Error('missing worker')
  const target = getReassignmentOptions(state, colonist.id).find((option) => option.type === to && option.eligible)
  if (target === undefined) throw new Error('missing eligible target')
  return stepSimulation(state, { type: 'reassignColonist', colonistId: colonist.id, workplaceId: target.workplaceId })
}

describe('Step 10CG — Town gameplay quality audit', () => {
  it('exposes Village-to-Town progression and Town workforce review as derived state', () => {
    const village = mixed()
    expect(getProgression(village).stage).toBe('village')
    expect(getTownCapabilityStatus(village).available).toBe(false)
    const state = town()
    expect(getProgression(state).stage).toBe('town')
    expect(getTownCapabilityStatus(state)).toEqual({
      available: true,
      label: 'Town workforce allocation',
      detail: 'Farm / Well / Workshop allocation is active; use Move worker to rebalance.',
    })
  })

  it('exposes the current workforce allocation summary and actual reassignment consequences', () => {
    const before = allocation(decision())
    const changed = moveFirst(decision(), 'farm', 'well')
    const after = allocation(changed)
    expect(before.foodProduction).toBeGreaterThan(0)
    expect(after.foodProduction).toBe(before.foodProduction - 2)
    expect(after.waterCapacity).toBe(before.waterCapacity + 2)
  })

  it('keeps vacancy and accessibility causes distinct in the derived diagnosis', () => {
    const state = mixed()
    const created = createBuilding(state, 'well', 12, 4, 2)
    const inaccessible = created.state.buildings[created.buildingId]
    if (inaccessible === undefined) throw new Error('missing inaccessible well')
    const inaccessibleState = { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...inaccessible, status: 'operational' as const, constructionRemaining: 0 } } }
    const inaccessibleId = created.buildingId
    expect(getBuildingRoadAccess(inaccessibleState, inaccessibleId).hasRoadAccess).toBe(false)
    expect(getWorkplaceWorkforceDiagnosis(inaccessibleState, inaccessibleId).kind).toBe('notConnected')
  })

  it('keeps the current semantic UI selectors available for the player journey', () => {
    const html = readFileSync('index.html', 'utf8')
    for (const selector of [
      'stat-allocation',
      'inspection-worker',
      'town-capability',
      'reassign-target',
      'reassign-confirm',
      'progression-progress',
      'progression-next',
    ]) expect(html).toContain(selector)
  })

  it('keeps Town allocation state deterministic and save/load understandable', () => {
    const state = town()
    const restored = loadSave(serializeSave(state))
    expect(getProgression(restored)).toEqual(getProgression(state))
    expect(getTownCapabilityStatus(restored)).toEqual(getTownCapabilityStatus(state))
    expect(allocation(restored)).toEqual(allocation(state))
  })
})
