import { describe, expect, it } from 'vitest'

import {
  getCommerceRevenuePerTick,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  TAX_PER_INHABITANT_PER_TICK,

  createRoads,
  getRevenuePerTick,
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

describe('Step001 — commerce flows through connected Workshops; employment mints nothing', () => {
  it('a staffed Farm earns no commerce: revenue is taxes only', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(state, place('farm', 0, 2))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    // Settle: colonist admitted, assigned to the Farm, food flowing.
    state = step(state, 4)
    expect(getCommerceRevenuePerTick(state)).toBe(0)
    // One inhabitant taxed; no commerce without a Workshop.
    expect(getRevenuePerTick(state)).toBe(TAX_PER_INHABITANT_PER_TICK)
    const before = state.resources.money
    state = stepSimulation(state)
    // Net −1 for the tick: taxes 1 − maintenance 2 (residence + farm).
    expect(state.resources.money).toBe(before - 1)
  })

  it('a staffed Well earns no commerce: revenue is taxes only', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(state, place('well', 0, 2))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = step(state, 4)
    expect(getCommerceRevenuePerTick(state)).toBe(0)
    expect(getRevenuePerTick(state)).toBe(TAX_PER_INHABITANT_PER_TICK)
  })

  it('a staffed road-connected Workshop earns commerce', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0))
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 2, 0))
    state = withOperationalRoads(state, [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
    state = step(state, 2)
    const before = state.resources.money
    state = stepSimulation(state)
    // Net +1 for the tick: taxes 1 + commerce 2 − maintenance 2.
    expect(getRevenuePerTick(state)).toBe(
      TAX_PER_INHABITANT_PER_TICK + COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
    expect(state.resources.money).toBe(before + 1)
  })

  it('a vacant connected Workshop still earns commerce (network, not labor)', () => {
    let state = createTestState()
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 0, 0))
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = step(state, 3)
    expect(getCommerceRevenuePerTick(state)).toBe(
      COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('the first Workshop stays constructible on taxes alone', () => {
    // Bootstrap path: Residence + Well (starting stock only), earn Water,
    // then pay the 25 Money + 1 Water Workshop cost. Taxes accumulate
    // while Water builds, so employment income is never required.
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
    expect(state.resources.money).toBeGreaterThanOrEqual(25)
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
