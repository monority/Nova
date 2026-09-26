import { describe, expect, it } from 'vitest'

import {
  countEmployedWorkers,
  countStaffedOperationalWorkshops,
  getEmploymentSummary,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getResourceStock,
  hashCanonicalState,
  loadSave,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  materialProductionForTick,
  materialStorageCapacityForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

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

/**
 * Step 10E: material fixtures isolate the variable they measure. Farms now
 * require a worker, so instead of free farm food these fixtures pre-stock a
 * food buffer large enough to outlive the fixture (food is uncapped). This
 * keeps population, staffing and every material number untouched.
 */
const withFoodBuffer = (state: SimulationState): SimulationState => ({
  ...state,
  resources: { ...state.resources, food: 100000 },
})

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

/** N operational Workshops, vacant (no residence, no colonists). */
const vacantWorkshops = (n: number): SimulationState => {
  let state = createTestState()
  for (let i = 0; i < n; i++) {
    state = stepSimulation(withWorkshopWater(state), place('workshop', i, 5))
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state)
  }
  return state
}

/** Exactly one staffed operational Workshop (cap 25), no farm. */
const singleWorkshop = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for production
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // operational + staffed, stock 49
  return state
}

/**
 * N staffed operational Workshops with N colonists. Step 08F: a single
 * staffed Workshop equilibrates at 24, so the second comes from bootstrap
 * funds and income funds the rest. Step 10E: food is pre-stocked (farms now
 * require a worker; this fixture measures material, so food is isolated).
 */
const staffedLadder = (n: number): SimulationState => {
  let state = withFoodBuffer(createTestState())
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // employed, stock 49
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5))
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // cap 50
  for (let i = 1; i < n; i++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('residence', i, 0))
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state)
    if (i >= 2) {
      state = untilAffordable(state)
      state = stepSimulation(withWorkshopWater(state), place('workshop', i + 1, 5))
      state = withRoadsForWorkshops(state) // 09F: road for the new workshop
      state = stepSimulation(state) // Step 10Y: 1 construction tick left
      state = stepSimulation(state)
    }
  }
  return state
}

describe('material storage capacity (Step 08F)', () => {
  it('capacity constant is exactly one build cost per workshop', () => {
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
  })

  it('1 — zero operational workshops → capacity 0', () => {
    expect(materialStorageCapacityForTick(createTestState())).toBe(0)
    expect(getMaterialStorageCapacity(createTestState())).toBe(0)
    // Bootstrap stock is preserved, not clamped (§4).
    expect(getResourceStock(createTestState()).construction).toBe(100)
  })

  it('2/3/4 — capacity scales 25 / 50 / 100', () => {
    expect(getMaterialStorageCapacity(vacantWorkshops(1))).toBe(25)
    expect(getMaterialStorageCapacity(staffedLadder(2))).toBe(50)
    expect(getMaterialStorageCapacity(staffedLadder(4))).toBe(100)
  })

  it('5 — vacant workshop contributes the same capacity as staffed', () => {
    const vacant = vacantWorkshops(2)
    expect(getMaterialStorageCapacity(vacant)).toBe(50)
    expect(materialUpkeepDueForTick(vacant)).toBe(0)
    expect(materialProductionForTick(vacant)).toBe(0)
    const staffed = staffedLadder(2)
    expect(getMaterialStorageCapacity(staffed)).toBe(50)
  })

  it('6 — under-construction workshop contributes zero capacity', () => {
    const constructing = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1)
    )
    expect(constructing.buildings['building-1']?.status).toBe(
      'underConstruction'
    )
    expect(getMaterialStorageCapacity(constructing)).toBe(0)
    expect(materialStoredProductionForTick(constructing)).toBe(0)
  })

  it('same-tick operational workshop contributes capacity that tick', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2
    state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
    expect(getMaterialStorageCapacity(state)).toBe(0)
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational + staffed same tick
    expect(getMaterialStorageCapacity(state)).toBe(25)
    // Bootstrap stock (50) covers capacity: stored 0; upkeep drains 1 while
    // Step 10CQ income credits 2 (one staffed Workshop worker): 50 − 1 + 2 = 51.
    expect(materialStoredProductionForTick(state)).toBe(0)
    expect(getResourceStock(state).construction).toBe(51)
  })

  it('7 — below capacity the full gross production is stored', () => {
    const state = withConstruction(singleWorkshop(), 0)
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialStoredProductionForTick(state)).toBe(2)
    expect(getMaterialStoredProductionPerTick(state)).toBe(2)
    // Step 10CQ.1: 0 + 2 stored production + 2 income − 1 upkeep = 3.
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(3)
  })

  it('8 — near capacity production is clamped to available space', () => {
    // Example B shape: 1 worker, cap 25, stock 24 → stored 1.
    const state = withConstruction(singleWorkshop(), 24)
    expect(materialStoredProductionForTick(state)).toBe(1)
    // Step 10CQ.1: 24 + 1 stored (free space) + 2 income − 1 upkeep = 26.
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(26)
  })

  it('9 — at capacity zero production is stored, upkeep still drains', () => {
    const state = withConstruction(singleWorkshop(), 25)
    expect(materialStoredProductionForTick(state)).toBe(0)
    // Step 10CQ.1: 25 + 0 stored + 2 income − 1 upkeep = 26 — income lifts
    // the stock above the cap even though production is fully clamped.
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(26)
  })

  it('12 — production then upkeep under capacity (§6 flow)', () => {
    // Two workers, cap 50, stock 48 → stored 2 → 50 → upkeep 2 → 48.
    // Production and upkeep settle in the SAME tick (no cap bypass).
    const state = withConstruction(staffedLadder(2), 48)
    expect(materialProductionForTick(state)).toBe(4)
    expect(materialStoredProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(2)
    // Step 10CQ.1: 48 + 2 stored + 4 income − 2 upkeep = 52; the next tick is
    // at/above the 50 cap (stored 0): 52 + 4 − 2 = 54.
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(52)
    const settled = stepSimulation(after)
    expect(getResourceStock(settled).construction).toBe(54)
  })

  it('13 — at full storage income outweighs upkeep: stock grows, production stays clamped (Step 10CQ.1)', () => {
    let state = withConstruction(singleWorkshop(), 25)
    state = stepSimulation(state) // stored 0; 25 + 2 income − 1 upkeep = 26
    // While the Workshop is staffed, income (2/tick) exceeds upkeep (1/tick),
    // so the old upkeep-only drain that freed space for production is gone.
    expect(getResourceStock(state).construction).toBe(26)
    state = stepSimulation(state) // still above the cap: 26 + 2 − 1 = 27
    expect(getResourceStock(state).construction).toBe(27)
    expect(materialStoredProductionForTick(state)).toBe(0)
  })

  it('14 — recovery from zero still works', () => {
    const state = withConstruction(singleWorkshop(), 0)
    const after = stepSimulation(state)
    // Step 10CQ.1: 0 + 2 stored + 2 income − 1 upkeep = 3.
    expect(getResourceStock(after).construction).toBe(3)
    expect(countEmployedWorkers(after)).toBe(1)
  })

  it('15 — upkeep follows staffing, not capacity', () => {
    expect(materialUpkeepDueForTick(vacantWorkshops(2))).toBe(0)
    expect(materialUpkeepDueForTick(staffedLadder(2))).toBe(2)
    expect(getMaterialUpkeepPerTick(staffedLadder(4))).toBe(4)
  })

  it('11 — material never negative across storage regimes', () => {
    const starts: SimulationState[] = [
      withConstruction(singleWorkshop(), 0),
      withConstruction(singleWorkshop(), 24),
      withConstruction(singleWorkshop(), 25),
      withConstruction(staffedLadder(2), 48),
      withConstruction(staffedLadder(2), 50),
      staffedLadder(4),
    ]
    for (const start of starts) {
      let state = start
      for (let i = 0; i < 30; i++) {
        state = stepSimulation(state)
        expect(getResourceStock(state).construction).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('16 — production query stays gross under clamp', () => {
    const full = withConstruction(staffedLadder(2), 50)
    expect(getMaterialProductionPerTick(full)).toBe(4)
    expect(materialProductionForTick(full)).toBe(4)
    expect(getMaterialStoredProductionPerTick(full)).toBe(0)
    // Gross is workers × 2 regardless of available space.
    expect(getMaterialProductionPerTick(full)).toBe(
      countEmployedWorkers(full) * 2
    )
  })

  it('17 — capacity query matches the simulation clamp bound', () => {
    const states = [
      createTestState(),
      vacantWorkshops(1),
      vacantWorkshops(2),
      staffedLadder(1),
      staffedLadder(2),
      staffedLadder(4),
    ]
    for (const state of states) {
      const cap = getMaterialStorageCapacity(state)
      expect(cap).toBe(materialStorageCapacityForTick(state))
      // Stored production never exceeds available space by construction.
      const available = Math.max(
        0,
        cap - getResourceStock(state).construction
      )
      expect(getMaterialStoredProductionPerTick(state)).toBe(
        Math.min(materialProductionForTick(state), available)
      )
    }
  })

  it('over-capacity bootstrap is never downward-clamped; income exceeds upkeep (Step 10CQ.1)', () => {
    // §4/§16: the stock above the 25 capacity is preserved; production stores
    // 0 while over capacity. Step 10CQ: income (2) now exceeds upkeep (1), so
    // the over-capacity stock grows +1/tick instead of draining.
    let state = singleWorkshop()
    expect(getResourceStock(state).construction).toBe(51)
    const before = getResourceStock(state).construction
    state = stepSimulation(state)
    expect(getResourceStock(state).construction).toBe(before + 1)
    expect(materialStoredProductionForTick(state)).toBeLessThanOrEqual(
      Math.max(
        0,
        getMaterialStorageCapacity(state) -
          getResourceStock(state).construction
      )
    )
  })

  it('documents single-workshop accumulation above the cap (§27, Step 10CQ.1)', () => {
    // Cap 25, gross 2 stored (clamped), income 2, upkeep 1: below the cap the
    // stock rises +3/tick to 24, one clamp tick (+1 stored) reaches 26, then
    // production stores 0 and income − upkeep = +1/tick. Step 10CQ replaces
    // the old 24 equilibrium: a staffed Workshop now funds builds over time.
    let state = withConstruction(singleWorkshop(), 0)
    for (let i = 0; i < 60; i++) {
      state = stepSimulation(state)
    }
    expect(getResourceStock(state).construction).toBe(77)
    expect(getResourceStock(state).construction).toBeGreaterThan(25)
    expect(materialStoredProductionForTick(state)).toBe(0)
  })

  it('18 — deterministic replay with clamping', () => {
    const run = (): SimulationState => {
      let state = staffedLadder(2)
      state = stepSimulation(state, place('farm', 3, 3))
      state = stepSimulation(state)
      state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('19/20 — save/load round-trip (empty, partial, full, multi) + hash', () => {
    expect(SAVE_VERSION).toBe(8)
    const states: SimulationState[] = [
      withConstruction(singleWorkshop(), 0),
      withConstruction(singleWorkshop(), 13),
      withConstruction(singleWorkshop(), 25),
      withConstruction(staffedLadder(2), 50),
      stepSimulation(staffedLadder(4)),
    ]
    for (const state of states) {
      const raw = serializeSave(state)
      expect(raw).not.toContain('upkeep')
      expect(raw).not.toContain('capacity')
      expect(raw).not.toContain('storedProduction')
      expect(raw).not.toContain('overflow')
      const restored = loadSave(raw)
      expect(restored).toEqual(state)
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    }
  })

  it('queries stay derived: no persisted or hashed storage state', () => {
    const state = staffedLadder(2)
    const before = hashCanonicalState(state)
    getMaterialStorageCapacity(state)
    getMaterialStoredProductionPerTick(state)
    expect(hashCanonicalState(state)).toBe(before)
    expect(getEmploymentSummary(state).employed).toBe(
      countStaffedOperationalWorkshops(state)
    )
  })
})
