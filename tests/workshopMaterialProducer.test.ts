import { describe, expect, it } from 'vitest'

import {
  createRoads,
  getMaterialProductionPerTick,
  stepSimulation,
  type CellCoordinate,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import {
  createTestState,
  placeCatchUp,
  withWorkshopWater,
} from './helpers.js'

type TestBuildingType = 'residence' | 'farm' | 'well' | 'workshop'

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

const step = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) {
    next = stepSimulation(next)
  }
  return next
}

describe('Workshop is the sole Material producer', () => {
  it('a staffed Farm generates no Material', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(state, place('farm', 0, 2))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    // Settle: colonist admitted, assigned to the Farm, food flowing.
    state = step(state, 4)
    const before = state.resources.construction
    state = stepSimulation(state)
    // No workshop exists, so upkeep is 0 and storage inflow is 0: any delta
    // would be generic employment income.
    expect(state.resources.construction).toBe(before)
  })

  it('a staffed Well generates no Material', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(state, place('well', 0, 2))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = step(state, 4)
    const before = state.resources.construction
    state = stepSimulation(state)
    expect(state.resources.construction).toBe(before)
  })

  it('a staffed road-connected Workshop produces Material', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 2, 0))
    state = withOperationalRoads(state, [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
    // Isolate production: empty the stock so the 08F storage clamp cannot
    // hide the inflow.
    state = {
      ...state,
      resources: { ...state.resources, construction: 0 },
    }
    state = step(state, 2)
    const before = state.resources.construction
    state = stepSimulation(state)
    // Net +3 for the tick: gross 2 stored + 2 Workshop income − 1 upkeep,
    // with no overflow to the hub.
    expect(getMaterialProductionPerTick(state)).toBe(2)
    expect(state.resources.construction).toBe(before + 3)
    expect(state.storage.material).toBe(0)
  })

  it('a vacant Workshop produces no Material', () => {
    let state = createTestState()
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 0, 0))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = step(state, 3)
    expect(getMaterialProductionPerTick(state)).toBe(0)
  })

  it('the first Workshop stays constructible without employment income', () => {
    // Bootstrap path: Residence + Well (starting stock only), earn Water,
    // then pay the 25 Material + 1 Water Workshop cost. No income exists
    // anywhere on this path after the generic-income removal.
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(state, place('well', 0, 2))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    let guard = 0
    while (state.resources.water < 1 && guard < 10) {
      state = stepSimulation(state)
      guard += 1
    }
    expect(state.resources.water).toBeGreaterThanOrEqual(1)
    expect(state.resources.construction).toBeGreaterThanOrEqual(25)
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 2, 0))
    const workshop = Object.values(state.buildings).find(
      (building) => building.type === 'workshop'
    )
    expect(workshop).toBeDefined()
    state = withOperationalRoads(state, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
    state = step(state, 3)
    const operational = Object.values(state.buildings).find(
      (building) => building.type === 'workshop'
    )
    expect(operational?.status).toBe('operational')
  })
})
