import { describe, expect, it } from 'vitest'

import {
  createRoads,
  getBuildingRoadFeedback,
  stepSimulation,
  type CellCoordinate,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, placeCatchUp, withWorkshopWater } from './helpers.js'

type TestBuildingType = 'residence' | 'farm' | 'workshop' | 'well'

const place = (
  buildingType: TestBuildingType,
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', buildingType, x, y })

/** Inject operational roads (no cost, no tick — same convention as helpers). */
const withOperationalRoads = (
  state: SimulationState,
  cells: readonly CellCoordinate[]
): SimulationState => {
  const created = createRoads(state, cells)
  let roads = created.state.roads
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) {
      roads = {
        ...roads,
        [id]: { ...road, status: 'operational', constructionRemaining: 0 },
      }
    }
  }
  return { ...created.state, roads }
}

/** A 2-tick building placed with catch-up needs exactly one tick to finish. */
const finishConstruction = (state: SimulationState): SimulationState =>
  stepSimulation(state)

describe('road connectivity feedback', () => {
  it('returns null for an unknown building', () => {
    expect(getBuildingRoadFeedback(createTestState(), 'building-9')).toBeNull()
  })

  it('reports Connected for an operational road-adjacent Farm', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('farm', 0, 0))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = finishConstruction(state)
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'connected',
      connected: true,
      consequence: null,
    })
  })

  it('reports Missing for an operational building with no road', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('farm', 0, 0))
    state = finishConstruction(state)
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'missing',
      connected: false,
      consequence:
        'Workers cannot reach this Farm, so it cannot be staffed and produces no Food.',
    })
  })

  it('explains the consequence for a disconnected Workshop', () => {
    let state = createTestState()
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 3, 3))
    state = finishConstruction(state)
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'missing',
      connected: false,
      consequence:
        'Workers cannot reach this Workshop, so it cannot be staffed and produces no Material.',
    })
  })

  it('explains the water consequence for a disconnected Well', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('well', 4, 4))
    state = finishConstruction(state)
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'missing',
      connected: false,
      consequence:
        'Workers cannot reach this Well, so it cannot be staffed, produces no Water and serves no network.',
    })
  })

  it('explains the workforce and water consequence for a disconnected Residence', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 5, 5))
    state = finishConstruction(state)
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'missing',
      connected: false,
      consequence:
        'Residents cannot reach any workplace, and Water cannot reach this Residence.',
    })
  })

  it('stays pending while the building is under construction', () => {
    // Access is a property of OPERATIONAL buildings (09E); an
    // under-construction building gets no misleading Missing verdict.
    let state = createTestState()
    state = placeCatchUp(state, place('farm', 0, 0))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    expect(getBuildingRoadFeedback(state, 'building-1')).toEqual({
      status: 'pending',
      connected: false,
      consequence: null,
    })
  })
})
