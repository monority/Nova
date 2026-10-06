/**
 * Step001 — building maintenance.
 *
 * Every operational building pays maintenance per tick; vacant counts,
 * under-construction does not. Payment is clamped to the treasury (partial
 * payment, never negative, no deactivation, no debt). Revenue (taxes +
 * commerce) lands before maintenance in the same tick.
 */

import { describe, expect, it } from 'vitest'

import {
  collectRevenue,
  countOperationalBuildings,
  countStaffedOperationalWorkshops,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getRevenuePerTick,
  hashCanonicalState,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  payMaintenance,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
  getResourceStock,
  getEmploymentSummary,
  SAVE_VERSION,
} from '@/index'
import { createTestState, withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withMoney = (
  state: SimulationState,
  money: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, money },
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

/** Tick 4: residence + colonist employed in one connected operational Workshop. */
const workshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  state = withRoadsForWorkshops(state) // connected road for commerce
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // operational, employed
  return state
}

/** One connected operational Workshop, zero colonists (vacant). */
const vacantWorkshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // operational, nobody housed
  return state
}

/** Step until the treasury covers a 25 build cost (all catalog costs are 25). */
const untilAffordable = (state: SimulationState): SimulationState => {
  let ticks = 0
  while (getResourceStock(state).money < 25) {
    state = stepSimulation(state)
    ticks += 1
    if (ticks > 1000) {
      throw new Error('test helper: refill never reached 25')
    }
  }
  return state
}

/** N operational Workshops with N colonists; food pre-stocked. */
const staffedState = (n: number): SimulationState => {
  let state = withFood(createTestState(), 100000)
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // colonist-1 employed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5))
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // second operational
  for (let i = 1; i < n; i++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('residence', i, 0))
    state = withRoadsForWorkshops(state)
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state)
    if (i >= 2) {
      state = untilAffordable(state)
      state = stepSimulation(withWorkshopWater(state), place('workshop', i + 1, 5))
      state = withRoadsForWorkshops(state)
      state = stepSimulation(state) // Step 10Y: 1 construction tick left
      state = stepSimulation(state)
    }
  }
  return state
}

describe('building maintenance (Step001)', () => {
  it('A — no operational building pays 0', () => {
    const fresh = createTestState()
    expect(countOperationalBuildings(fresh)).toBe(0)
    expect(getMaintenanceDuePerTick(fresh)).toBe(0)
    expect(payMaintenance(fresh)).toBe(fresh)
    // Under-construction buildings only: still 0.
    const constructing = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    expect(getMaintenanceDuePerTick(constructing)).toBe(0)
    expect(payMaintenance(constructing)).toBe(constructing)
  })

  it('B — a vacant operational Workshop pays maintenance (and still earns commerce)', () => {
    const state = vacantWorkshopState()
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getEmploymentSummary(state).employed).toBe(0)
    // Step001 behavior change: maintenance is infrastructure, not labor.
    expect(getMaintenanceDuePerTick(state)).toBe(
      MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK
    )
    const before = getResourceStock(state).money
    const after = stepSimulation(state)
    // Commerce (+2) exceeds maintenance (−1): net +1.
    expect(getResourceStock(after).money).toBe(before + 1)
  })

  it('C — residence plus staffed connected Workshop: maintenance 2, revenue 3', () => {
    const state = workshopState()
    expect(MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK).toBe(1)
    expect(countOperationalBuildings(state)).toBe(2)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    expect(getRevenuePerTick(state)).toBe(3)
    expect(getNetMoneyPerTick(state)).toBe(1)
  })

  it('D — maintenance scales with every operational building', () => {
    const state = staffedState(2)
    expect(getEmploymentSummary(state).employed).toBe(2)
    expect(getMaintenanceDuePerTick(state)).toBe(
      countOperationalBuildings(state) * MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK
    )
    expect(countOperationalBuildings(state)).toBe(4)
  })

  it('E — four staffed Workshops: dues follow the building count', () => {
    const state = staffedState(4)
    expect(getEmploymentSummary(state).employed).toBe(4)
    expect(getMaintenanceDuePerTick(state)).toBe(
      countOperationalBuildings(state) * MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK
    )
  })

  it('F — no colonists: no taxes, commerce may still flow', () => {
    const state = vacantWorkshopState()
    expect(getEmploymentSummary(state).employed).toBe(0)
    expect(getRevenuePerTick(state)).toBe(2)
    expect(getNetMoneyPerTick(state)).toBe(1)
  })

  it('G — one tick moves the treasury by the net flow', () => {
    const state = workshopState()
    const before = getResourceStock(state).money
    const after = stepSimulation(state)
    expect(getResourceStock(after).money).toBe(before + getNetMoneyPerTick(state))
  })

  it('H — insufficient treasury: partial payment, never negative', () => {
    const state = withMoney(staffedState(2), 1)
    expect(getMaintenanceDuePerTick(state)).toBeGreaterThan(1)
    const after = payMaintenance(state)
    expect(getResourceStock(after).money).toBe(0)
    expect(getResourceStock(after).money).toBeGreaterThanOrEqual(0)
  })

  it('I — zero treasury: maintenance due, payment 0, no exception', () => {
    const state = withMoney(workshopState(), 0)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    const after = payMaintenance(state)
    expect(getResourceStock(after).money).toBe(0)
  })

  it('J — buildings stay operational after a deficit', () => {
    const state = withMoney(workshopState(), 0)
    const after = stepSimulation(state)
    // Revenue (+3) lands before maintenance (−2) in the same tick.
    expect(getResourceStock(after).money).toBe(1)
    for (const building of Object.values(after.buildings)) {
      expect(building.status).toBe('operational')
    }
    expect(after.colonists['colonist-1']?.workplaceId).not.toBeNull()
  })

  it('K — recovery: revenue continues and the treasury turns positive', () => {
    let state = withMoney(workshopState(), 0)
    state = stepSimulation(state)
    expect(getResourceStock(state).money).toBe(1)
    expect(getRevenuePerTick(state)).toBe(3)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    state = stepSimulation(state)
    expect(getResourceStock(state).money).toBe(2)
  })

  it('L — starvation removes taxes but maintenance persists on standing buildings', () => {
    const state = withFood(workshopState(), 0)
    const moneyBefore = getResourceStock(state).money
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(getEmploymentSummary(after).employed).toBe(0)
    expect(countStaffedOperationalWorkshops(after)).toBe(0)
    // Step001: maintenance is infrastructure — the standing residence and
    // Workshop still owe 2, commerce still pays 2: net 0, treasury untouched.
    expect(getMaintenanceDuePerTick(after)).toBe(2)
    expect(getResourceStock(after).money).toBe(moneyBefore)
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

  it('maintenance never mutates its input and derives no persisted state', () => {
    const state = workshopState()
    const before = hashCanonicalState(state)
    const after = payMaintenance(state)
    expect(hashCanonicalState(state)).toBe(before)
    // Residence + Workshop owe 2.
    expect(getResourceStock(state).money).toBe(
      getResourceStock(after).money + 2
    )
    expect(SAVE_VERSION).toBe(9)
  })

  it('collectRevenue is pure and additive', () => {
    const state = workshopState()
    const before = hashCanonicalState(state)
    const after = collectRevenue(state)
    expect(hashCanonicalState(state)).toBe(before)
    expect(getResourceStock(after).money).toBe(
      getResourceStock(state).money + getRevenuePerTick(state)
    )
  })
})
