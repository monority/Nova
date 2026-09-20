import { describe, expect, it } from 'vitest'

import {
  countStaffedOperationalWorkshops,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  hashCanonicalState,
  materialStoredProductionForTick,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
  upkeepBuildings,
  getResourceStock,
  getEmploymentSummary,
  materialProductionForTick,
  materialUpkeepDueForTick,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  SAVE_VERSION,
} from '@/index'
import { createTestState, withRoadsForWorkshops } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withConstruction = (
  state: SimulationState,
  construction: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

/** Tick 4: residence + colonist employed in one operational Workshop. */
const workshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(state, place('workshop', 4, 4)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for production
  state = stepSimulation(state) // t4: operational, employed
  return state
}

/** One operational Workshop, zero colonists (vacant). */
const vacantWorkshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('workshop', 1, 1)) // t1
  state = stepSimulation(state) // t2: operational, nobody housed
  return state
}

/** Step until the stock covers a 25 build cost (all catalog costs are 25). */
const untilAffordable = (state: SimulationState): SimulationState => {
  let ticks = 0
  while (getResourceStock(state).construction < 25) {
    state = stepSimulation(state)
    ticks += 1
    if (ticks > 1000) {
      throw new Error('test helper: refill never reached 25')
    }
  }
  return state
}

/**
 * N staffed operational Workshops with N colonists. Step 08F: a single
 * staffed Workshop equilibrates at stock 24 (below the 25 build cost), so
 * the second Workshop is built from bootstrap funds first; worker income
 * (+1/tick under the 50 capacity, growing with staffing) funds the rest.
 * Step 10E: food is pre-stocked (farms now require a worker).
 */
const staffedState = (n: number): SimulationState => {
  // Step 10E: material fixtures isolate the variable they measure. Farms now
  // require a worker, so food is pre-stocked instead of produced by free
  // farms — population, staffing and every material number stay untouched.
  let state = withFood(createTestState(), 100000)
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(state, place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // t4: colonist-1 employed, stock 49
  state = stepSimulation(state, place('workshop', 1, 5)) // t5: stock 24
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // t6: second operational, stock 25
  for (let i = 1; i < n; i++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('residence', i, 0))
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    state = stepSimulation(state)
    if (i >= 2) {
      // Base already provides two Workshops; further pairs need one more.
      state = untilAffordable(state)
      state = stepSimulation(state, place('workshop', i + 1, 5))
      state = withRoadsForWorkshops(state) // 09F: road for the new workshop
      state = stepSimulation(state)
    }
  }
  return state
}

describe('operational upkeep (Step 08C)', () => {
  it('A — no operational workshop pays 0', () => {
    const fresh = createTestState()
    expect(countStaffedOperationalWorkshops(fresh)).toBe(0)
    expect(materialUpkeepDueForTick(fresh)).toBe(0)
    expect(getMaterialUpkeepPerTick(fresh)).toBe(0)
    expect(upkeepBuildings(fresh)).toBe(fresh)
    // Under-construction buildings only: still 0.
    const constructing = stepSimulation(createTestState(), place('workshop', 1, 1))
    expect(materialUpkeepDueForTick(constructing)).toBe(0)
    expect(upkeepBuildings(constructing)).toBe(constructing)
  })

  it('B — operational vacant workshop pays 0', () => {
    const state = vacantWorkshopState()
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getEmploymentSummary(state).employed).toBe(0)
    expect(countStaffedOperationalWorkshops(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    const before = getResourceStock(state).construction
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(before)
  })

  it('C — one staffed operational workshop pays 1', () => {
    const state = workshopState()
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    expect(getMaterialUpkeepPerTick(state)).toBe(1)
  })

  it('D — two staffed operational workshops pay 2', () => {
    const state = staffedState(2)
    expect(getEmploymentSummary(state).employed).toBe(2)
    expect(countStaffedOperationalWorkshops(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(2)
  })

  it('E — four staffed operational workshops pay 4', () => {
    const state = staffedState(4)
    expect(getEmploymentSummary(state).employed).toBe(4)
    expect(countStaffedOperationalWorkshops(state)).toBe(4)
    expect(materialUpkeepDueForTick(state)).toBe(4)
  })

  it('F — zero workers pay 0', () => {
    const state = vacantWorkshopState()
    expect(getEmploymentSummary(state).employed).toBe(0)
    expect(getMaterialUpkeepPerTick(state)).toBe(0)
    expect(getNetMaterialPerTick(state)).toBe(0)
  })

  it('G — production + upkeep: gross 2, upkeep 1, stored clamped', () => {
    const state = workshopState()
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    expect(getNetMaterialPerTick(state)).toBe(1)
    // Step 08F: bootstrap stock (49) covers the 25 capacity, so stored
    // production is 0 and only upkeep drains the stock.
    expect(materialStoredProductionForTick(state)).toBe(0)
    const before = getResourceStock(state).construction
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(before - 1)
    // Below capacity the full net flow lands: 0 + 2 − 1 = 1.
    const low = stepSimulation(withConstruction(state, 0))
    expect(getResourceStock(low).construction).toBe(1)
  })

  it('H — insufficient material: partial payment, never negative', () => {
    // Two staffed Workshops owe 2 with only 1 in stock.
    const state = withConstruction(staffedState(2), 1)
    expect(materialUpkeepDueForTick(state)).toBe(2)
    const after = upkeepBuildings(state)
    expect(getResourceStock(after).construction).toBe(0)
    expect(getResourceStock(after).construction).toBeGreaterThanOrEqual(0)
  })

  it('I — zero material: upkeep due, payment 0, no exception', () => {
    const state = withConstruction(workshopState(), 0)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    const after = upkeepBuildings(state)
    expect(getResourceStock(after).construction).toBe(0)
  })

  it('J — buildings stay operational after a deficit', () => {
    const state = withConstruction(workshopState(), 0)
    const after = stepSimulation(state)
    // Production (+2) refills before upkeep (−1) in the same tick.
    expect(getResourceStock(after).construction).toBe(1)
    for (const building of Object.values(after.buildings)) {
      expect(building.status).toBe('operational')
    }
    expect(after.colonists['colonist-1']?.workplaceId).not.toBeNull()
  })

  it('K — recovery: production continues and material turns positive', () => {
    let state = withConstruction(workshopState(), 0)
    state = stepSimulation(state)
    // Net is +1 per tick, so one tick suffices from an empty stock.
    expect(getResourceStock(state).construction).toBe(1)
    expect(materialProductionForTick(state)).toBe(2)
    expect(getMaterialUpkeepPerTick(state)).toBe(1)
    state = stepSimulation(state)
    expect(getResourceStock(state).construction).toBe(2)
  })

  it('L — starvation purges jobs: upkeep 0, no double penalty', () => {
    const state = withFood(workshopState(), 0)
    const materialBefore = getResourceStock(state).construction
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(getEmploymentSummary(after).employed).toBe(0)
    expect(countStaffedOperationalWorkshops(after)).toBe(0)
    expect(materialUpkeepDueForTick(after)).toBe(0)
    // No production and no upkeep on the death tick: stock untouched.
    expect(getResourceStock(after).construction).toBe(materialBefore)
  })

  it('M — determinism: same state + same commands, same final state', () => {
    const run = (): SimulationState => {
      let state = workshopState()
      state = stepSimulation(state, place('farm', 6, 6))
      state = stepSimulation(state)
      state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a).toEqual(b)
  })

  it('upkeep never mutates its input and derives no persisted state', () => {
    const state = workshopState()
    const before = hashCanonicalState(state)
    const after = upkeepBuildings(state)
    expect(hashCanonicalState(state)).toBe(before)
    expect(getResourceStock(state).construction).toBe(
      getResourceStock(after).construction + 1
    )
    expect(SAVE_VERSION).toBe(4)
  })
})
