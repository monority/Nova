/**
 * Step 10BQ - workforce contention feedback contract tests.
 *
 * The diagnostic is derived from the existing domain predicates. These tests
 * do not assert or change assignment policy.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getWorkplaceWorkforceDiagnosis,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10bq', width: 18, height: 8 },
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

const colony = (): SimulationState => {
  let state = base()
  for (let index = 0; index < 3; index += 1) {
    state = operational(state, 'residence', 1 + index * 2, 0)
  }
  for (let x = 0; x <= 10; x += 1) state = road(state, x)
  state = operational(state, 'farm', 1, 2)
  state = operational(state, 'farm', 3, 2)
  state = operational(state, 'well', 7, 2)
  state = operational(state, 'well', 9, 2)
  for (let index = 0; index < 3; index += 1) {
    state = createColonist(state, `building-${index + 1}`).state
  }
  return assignJobs(state)
}

const buildingOf = (state: SimulationState, type: BuildingType, index: number): string => {
  const id = Object.values(state.buildings)
    .filter((building) => building.type === type)
    .map((building) => building.id)
    .sort()[index]
  if (id === undefined) throw new Error('missing workplace')
  return id
}

describe('Step 10BQ - derived workforce contention diagnosis', () => {
  it('classifies a staffed workplace without contention', () => {
    const state = colony()
    expect(getWorkplaceWorkforceDiagnosis(state, buildingOf(state, 'farm', 0))).toEqual({
      kind: 'staffed',
      workers: 1,
    })
  })

  it('distinguishes an available eligible worker from contention', () => {
    const state = colony()
    const availableWell = buildingOf(state, 'well', 1)
    const next = {
      ...state,
      colonists: {
        ...state.colonists,
        'colonist-3': {
          ...state.colonists['colonist-3']!,
          workplaceId: null,
          workplaceAssignmentMode: 'automatic' as const,
        },
      },
    }
    expect(getWorkplaceWorkforceDiagnosis(next, availableWell)).toEqual({
      kind: 'available',
      unassignedEligible: 1,
    })
  })

  it('reports contention when an accessible workplace has no available worker', () => {
    const state = colony()
    expect(getWorkplaceWorkforceDiagnosis(state, buildingOf(state, 'well', 1))).toEqual({
      kind: 'workerShortage',
      population: 3,
      assignedElsewhere: 3,
    })
  })

  it('preserves accessibility as the cause for a roadless workplace', () => {
    let state = base()
    state = operational(state, 'residence', 1, 0)
    state = road(state, 1)
    state = operational(state, 'well', 10, 5)
    state = createColonist(state, 'building-1').state
    const well = buildingOf(state, 'well', 0)
    expect(getWorkplaceWorkforceDiagnosis(state, well)).toEqual({
      kind: 'notConnected',
    })
  })

  it('does not report contention for an under-construction workplace', () => {
    const state = colony()
    const created = createBuilding(state, 'well', 12, 2, 3)
    expect(getWorkplaceWorkforceDiagnosis(created.state, created.buildingId)).toEqual({
      kind: 'notOperational',
    })
  })

  it('clears contention after a manual reassignment and survives save/load', () => {
    const state = colony()
    const vacantWell = buildingOf(state, 'well', 1)
    const worker = Object.values(state.colonists).find(
      (colonist) => colonist.workplaceId !== null && colonist.workplaceId !== vacantWell
    )
    if (worker === undefined) throw new Error('missing worker')
    const assigned = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: worker.id,
      workplaceId: vacantWell,
    })
    expect(getWorkplaceWorkforceDiagnosis(assigned, vacantWell)).toEqual({
      kind: 'staffed',
      workers: 1,
    })

    const restored = loadSave(serializeSave(assigned))
    expect(getWorkplaceWorkforceDiagnosis(restored, vacantWell)).toEqual({
      kind: 'staffed',
      workers: 1,
    })
  })
})
