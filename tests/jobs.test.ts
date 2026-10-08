import { describe, expect, it } from 'vitest'

import {
  getMaintenanceDuePerTick,

  collectRevenue,
  commerceRevenueForTick,
  getCommerceRevenuePerTick,

  assignJobs,
  BUILDING_CATALOG,
  countEmployedWorkers,
  countWorkersAt,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodTicksRemaining,
  getJobCapacity,
  getRevenuePerTick,
  getNetMoneyPerTick,
  getResourceStock,
  hashCanonicalState,
  isEmployed,
  isFoodSupplySustainable,
  isOperationalWorkshop,
  jobCapacityOf,
  loadSave,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  maintenanceDueForTick,
  type PlaceBuildingCommand,
  SAVE_VERSION,
  SaveValidationError,
  serializeSave,
  stepSimulation,
  type SimulationState,
  toRenderSnapshot,
  WORKSHOP_JOB_CAPACITY,
} from '@/index'
import { createTestState, withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

const withMoney = (
  state: SimulationState,
  money: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, money },
})

const colonistOf = (state: SimulationState, id: string) => {
  const colonist = state.colonists[id]
  if (colonist === undefined) {
    throw new Error(`test helper: missing colonist ${id}`)
  }
  return colonist
}

/** Force a workplace reference to build invalid/duplicate scenarios. */
const withWorkplace = (
  state: SimulationState,
  colonistId: string,
  workplaceId: string | null
): SimulationState => ({
  ...state,
  colonists: {
    ...state.colonists,
    [colonistId]: { ...colonistOf(state, colonistId), workplaceId },
  },
})

/** Tick 3: one operational residence + one unemployed colonist.
 *
 * Step 10Y: a placed building is no longer caught up on its placement tick,
 * so `constructionTicks: 2` now means exactly two construction ticks after
 * placement (this is what makes a construction crew's +1 observable).
 */
const colonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1: placed (2 remaining)
  state = stepSimulation(state) // t2: 1 remaining
  state = stepSimulation(state) // t3: operational, colonist-1
  return state
}

/** Tick 5: operational residence + colonist employed in `building-2`. */
const workshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: residence 1 remaining
  state = stepSimulation(state) // t3: residence operational, colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t4
  state = withRoadsForWorkshops(state) // 09F: road for production
  state = stepSimulation(state) // t5: workshop 1 remaining
  state = stepSimulation(state) // t6: workshop operational, employed, net +1
  return state
}

/** Tick 4: two operational residences + two unemployed colonists. */
const twoColonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: residence 1 remaining
  state = stepSimulation(state) // t3: colonist-1
  state = stepSimulation(state, place('residence', 4, 4)) // t4
  state = stepSimulation(state) // t5: residence 1 remaining
  state = stepSimulation(state) // t6: colonist-2
  return state
}

/** Tick 8: two colonists, two operational Workshops (building-2, building-3). */
const twoWorkshopState = (): SimulationState => {
  let state = colonistState() // t3
  state = stepSimulation(withWorkshopWater(state), place('workshop', 6, 6)) // t4: building-2
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // t5: 1 remaining
  state = stepSimulation(state) // t6: building-2 operational, colonist-1 employed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 7, 7)) // t7: building-3
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // t8: 1 remaining
  state = stepSimulation(state) // t9: building-3 operational
  return state
}

describe('workshop building (Step 07C §3)', () => {
  it('defines the minimal workplace contract in the catalog', () => {
    expect(BUILDING_CATALOG.workshop).toEqual({
      constructionTicks: 2,
      housingCapacity: 0,
      constructionCost: 25,
      // Step 10AD: the Workshop's one-off Water construction investment.
      constructionWaterCost: 1,
    })
    expect(WORKSHOP_JOB_CAPACITY).toBe(1)
    expect(COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK).toBe(2)
  })

  it('exposes job capacity for operational Farms and Workshops (Step 10E)', () => {
    expect(jobCapacityOf({ type: 'workshop', status: 'operational' })).toBe(1)
    expect(jobCapacityOf({ type: 'workshop', status: 'underConstruction' })).toBe(0)
    expect(jobCapacityOf({ type: 'farm', status: 'operational' })).toBe(1)
    expect(jobCapacityOf({ type: 'farm', status: 'underConstruction' })).toBe(0)
    expect(jobCapacityOf({ type: 'residence', status: 'operational' })).toBe(0)
    expect(isOperationalWorkshop({ type: 'workshop', status: 'underConstruction' })).toBe(false)
  })

  it('uses the existing construction lifecycle and deducts the catalog cost', () => {
    const state = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    expect(getResourceStock(state).money).toBe(75)
    const workshop = state.buildings['building-1']
    expect(workshop?.type).toBe('workshop')
    expect(workshop?.status).toBe('underConstruction')
    // Step 10Y: no placement catch-up — a 2-tick building starts at 2.
    expect(workshop?.constructionRemaining).toBe(2)
    expect(state.time.tick).toBe(1)
  })

  it('becomes operational after the catalog construction duration', () => {
    let state = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('underConstruction')
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(state.buildings['building-1']?.constructionRemaining).toBe(0)
    expect(getJobCapacity(state)).toBe(1)
  })

  it('never provides housing and never admits a colonist by itself', () => {
    let state = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    state = stepSimulation(state)
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(Object.keys(state.colonists)).toHaveLength(0)
    expect(getJobCapacity(state)).toBe(1)
    expect(countEmployedWorkers(state)).toBe(0)
  })
})

describe('deterministic job assignment (Step 07C §4)', () => {
  it('does nothing without colonists', () => {
    const empty = createTestState()
    expect(assignJobs(empty)).toBe(empty)

    let state = stepSimulation(withWorkshopWater(empty), place('workshop', 1, 1))
    state = stepSimulation(state)
    state = stepSimulation(state) // Step 10Y: 2 construction ticks after placement
    expect(getJobCapacity(state)).toBe(1)
    expect(assignJobs(state)).toBe(state)
    expect(Object.keys(assignJobs(state).colonists)).toHaveLength(0)
  })

  it('leaves every colonist unemployed while no workshop exists', () => {
    const state = colonistState()
    expect(assignJobs(state)).toBe(state)
    expect(getEmploymentSummary(state)).toEqual({
      population: 1,
      employed: 0,
      unemployed: 1,
      jobCapacity: 0,
      vacantJobs: 0,
    })
  })

  it('a non-operational workshop cannot employ', () => {
    let state = stepSimulation(withWorkshopWater(colonistState()), place('workshop', 6, 6))
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    state = assignJobs(state)
    expect(getJobCapacity(state)).toBe(0)
    expect(state.colonists['colonist-1']?.workplaceId).toBeNull()
    expect(assignJobs(state)).toBe(state)
  })

  it('one colonist / one workshop: employed at that workshop', () => {
    const state = workshopState()
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(getEmploymentSummary(state)).toEqual({
      population: 1,
      employed: 1,
      unemployed: 0,
      jobCapacity: 1,
      vacantJobs: 0,
    })
    expect(countWorkersAt(state, 'building-2')).toBe(1)
    expect(isEmployed(state, colonistOf(state, 'colonist-1'))).toBe(true)
  })

  it('multiple colonists / one workshop: lowest colonist id wins', () => {
    let state = stepSimulation(withWorkshopWater(twoColonistState()), place('workshop', 6, 6))
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state)
    state = stepSimulation(state) // Step 10Y: operational
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-3')
    expect(state.colonists['colonist-2']?.workplaceId).toBeNull()
    expect(getEmploymentSummary(state)).toEqual({
      population: 2,
      employed: 1,
      unemployed: 1,
      jobCapacity: 1,
      vacantJobs: 0,
    })
  })

  it('one colonist / multiple workshops: ascending workshop id order', () => {
    const state = twoWorkshopState()
    expect(getJobCapacity(state)).toBe(2)
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(getEmploymentSummary(state).vacantJobs).toBe(1)
  })

  it('multiple colonists / multiple workshops: deterministic nearest-Workshop preference (09M)', () => {
    // Step 08F: storage clamp changes material flow, not assignment. Top up
    // the stock so this ordering test funds both placements deterministically.
    let state = withMoney(twoColonistState(), 100) // t6
    state = stepSimulation(withWorkshopWater(state), place('workshop', 6, 6)) // t7: building-3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // 1 remaining
    state = stepSimulation(state) // t9: colonist-1 -> building-3
    state = withMoney(state, 100)
    state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 0)) // t10: building-4
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // 1 remaining
    state = stepSimulation(state) // t12: nearest-Workshop preference
    // Step 09M: among eligible Workshops the NEAREST road distance wins.
    // Residence (2,2) is 4 road steps from building-4 (0,0) and 6 from
    // building-3 (6,6), so colonist-1 takes building-4; residence (4,4) is
    // then 2 steps from building-3, so colonist-2 takes it. Deterministic.
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-4')
    expect(state.colonists['colonist-2']?.workplaceId).toBe('building-3')
    expect(getEmploymentSummary(state)).toEqual({
      population: 2,
      employed: 2,
      unemployed: 0,
      jobCapacity: 2,
      vacantJobs: 0,
    })
  })

  it('preserves an existing assignment while it remains the nearest Workshop (09M)', () => {
    // The natural state already sits in the nearest Workshop: re-running
    // assignJobs must be a no-op reference-for-reference (no churn).
    const natural = twoWorkshopState()
    expect(natural.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(assignJobs(natural)).toBe(natural)

    // An assignment forced to the farther Workshop does NOT survive: the 09M
    // spatial preference re-applies against the current network each tick.
    const forced = withWorkplace(natural, 'colonist-1', 'building-3')
    const after = assignJobs(forced)
    expect(after).not.toBe(forced)
    expect(after.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(countWorkersAt(after, 'building-3')).toBe(0)
  })

  it('clears a reference to a missing building', () => {
    const state = withWorkplace(colonistState(), 'colonist-1', 'building-99')
    const after = assignJobs(state)
    expect(after.colonists['colonist-1']?.workplaceId).toBeNull()
    expect(after).not.toBe(state)
  })

  it('clears a reference to a non-workshop building', () => {
    const residence = withWorkplace(colonistState(), 'colonist-1', 'building-1')
    expect(assignJobs(residence).colonists['colonist-1']?.workplaceId).toBeNull()

    let farmState = stepSimulation(colonistState(), place('farm', 6, 6))
    farmState = stepSimulation(farmState)
    farmState = stepSimulation(farmState) // Step 10Y: operational
    expect(farmState.buildings['building-2']?.status).toBe('operational')
    const farm = withWorkplace(farmState, 'colonist-1', 'building-2')
    expect(assignJobs(farm).colonists['colonist-1']?.workplaceId).toBeNull()
  })

  it('never lets one workshop hold more than one worker', () => {
    let state = stepSimulation(withWorkshopWater(twoColonistState()), place('workshop', 6, 6))
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // 1 remaining
    state = stepSimulation(state) // Step 10Y: colonist-1 -> building-3
    const forced = withWorkplace(state, 'colonist-2', 'building-3')
    const after = assignJobs(forced)
    expect(after.colonists['colonist-1']?.workplaceId).toBe('building-3')
    expect(after.colonists['colonist-2']?.workplaceId).toBeNull()
    expect(countWorkersAt(after, 'building-3')).toBe(1)
  })

  it('holds the documented employment invariants', () => {
    const states = [
      colonistState(),
      workshopState(),
      twoWorkshopState(),
      withWorkplace(colonistState(), 'colonist-1', 'building-99'),
    ]
    for (const state of states) {
      const summary = getEmploymentSummary(state)
      expect(summary.employed).toBeLessThanOrEqual(summary.population)
      expect(summary.employed).toBeLessThanOrEqual(summary.jobCapacity)
      expect(summary.vacantJobs).toBeGreaterThanOrEqual(0)
      expect(Object.keys(assignJobs(state).colonists)).toHaveLength(summary.population)
    }
  })
})

describe('construction material production (Step 07C §6-§8)', () => {
  it('produces nothing with zero workers, upkeep on the residence', () => {
    const state = colonistState()
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: no workshop, but the resident pays 1 tax.
    expect(getRevenuePerTick(state)).toBe(1)
    // Revenue is positive, so collection returns a funded copy (+1 tax).
    expect(collectRevenue(state).resources.money).toBe(
      state.resources.money + 1
    )
    // Step001: no workshop, but the residence still owes 1 maintenance.
    expect(maintenanceDueForTick(state)).toBe(1)
  })

  it('an operational workshop with no worker earns nothing, still owes upkeep', () => {
    let state = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational
    expect(getJobCapacity(state)).toBe(1)
    expect(commerceRevenueForTick(state)).toBe(0)
    expect(collectRevenue(state)).toBe(state)
    const after = stepSimulation(state)
    // Step001: 75 build remainder, unconnected so no commerce: t3 lands 74,
    // t4 (after) lands 73.
    expect(getResourceStock(after).money).toBe(73)
  })

  it('one worker: connected commerce +2, upkeep 2 over both buildings, net +1', () => {
    const state = workshopState()
    expect(commerceRevenueForTick(state)).toBe(2)
    // Step001: residence + workshop both pay.
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getNetMoneyPerTick(state)).toBe(1)
    // Step001: no cap exists — the revenue query returns commerce (2) at
    // any balance; it is no longer a storable share.
    const before = getResourceStock(state).money
    expect(getCommerceRevenuePerTick(state)).toBe(2)
    const after = stepSimulation(state)
    // Step001: revenue 3 (1 tax + 2 commerce) minus upkeep 2: +1.
    expect(getResourceStock(after).money).toBe(before + 1)
    expect(getResourceStock(after).food).toBe(getResourceStock(state).food - 1)
    // From an empty stock the same tick nets revenue 3 minus upkeep 2.
    const empty = withMoney(state, 0)
    expect(getCommerceRevenuePerTick(empty)).toBe(2)
    const recovered = stepSimulation(empty)
    expect(getResourceStock(recovered).money).toBe(1)
  })

  it('multiple workers add commerce linearly; upkeep counts every building', () => {
    let state = twoWorkshopState() // 1 colonist, 2 workshops
    state = stepSimulation(state, place('residence', 0, 0)) // t10
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    state = stepSimulation(state) // 1 construction tick left
    state = stepSimulation(state) // t12: second colonist admitted and employed
    expect(getEmploymentSummary(state).employed).toBe(2)
    expect(commerceRevenueForTick(state)).toBe(4)
    // Step001: 2 residences + 2 workshops pay 4 upkeep (net +2 with
    // revenue 2 taxes + 4 commerce = 6).
    expect(maintenanceDueForTick(state)).toBe(4)
    expect(getNetMoneyPerTick(state)).toBe(2)
    const before = getResourceStock(state).money
    const after = stepSimulation(state)
    expect(getResourceStock(after).money).toBe(before + 2)
  })

  it('a newly operational workshop is staffed and produces the same tick', () => {
    let state = stepSimulation(withWorkshopWater(colonistState()), place('workshop', 6, 6)) // t4
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    const before = getResourceStock(state).money
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    state = stepSimulation(state) // t5: 1 construction tick left
    state = stepSimulation(state) // t6: operational this tick
    expect(state.buildings['building-2']?.status).toBe('operational')
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    // Step001: same-tick commerce (+2, connected from completion) with no
    // cap; revenue 3 minus upkeep 2 nets the +1 measured below.
    expect(getCommerceRevenuePerTick(state)).toBe(2)
    expect(getResourceStock(state).money).toBe(before + 1)
  })

  it('a newly admitted colonist is employed and produces the same tick', () => {
    let state = colonistState() // t3: colonist-1
    state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t4
    state = withRoadsForWorkshops(state) // 09F: road for production
    state = stepSimulation(state) // t5: W1 1 construction tick left
    state = stepSimulation(state) // t6: W1 operational, net +1
    state = stepSimulation(withWorkshopWater(state), place('workshop', 6, 6)) // t7: W2 placed
    state = withRoadsForWorkshops(state) // 09F: road for W2
    state = stepSimulation(state) // t8: W2 1 construction tick left
    state = stepSimulation(state) // t9: W2 operational
    state = stepSimulation(state, place('residence', 7, 7)) // t10
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    const beforeAdmission = getResourceStock(state).money
    expect(Object.keys(state.colonists)).toHaveLength(1)
    state = stepSimulation(state) // t11: residence 1 construction tick left
    // Step 10Y timing isolation: pin the stock so the admission tick measures
    // exactly the same economics as before the extra construction tick.
    state = withMoney(state, beforeAdmission)
    state = stepSimulation(state) // t12: colonist-2 admitted this tick
    expect(Object.keys(state.colonists)).toHaveLength(2)
    expect(state.colonists['colonist-2']?.workplaceId).toBe('building-3')
    // Step001: two staffed Workshops earn 4 commerce + 2 taxes = 6 revenue
    // against 4 upkeep (2 residences + 2 workshops): +2 on the tick.
    expect(getResourceStock(state).money).toBe(beforeAdmission + 2)
  })

  it('starvation removes the worker before production: no death-tick food, treasury nets zero', () => {
    const state = withFood(workshopState(), 0)
    const materialBefore = getResourceStock(state).money
    expect(getEmploymentSummary(state).employed).toBe(1)
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(getResourceStock(after).food).toBe(0)
    expect(getEmploymentSummary(after).employed).toBe(0)
    // Step001: the vacant but connected workshop still earns 2 commerce
    // against 2 maintenance — the death tick nets zero either way.
    expect(getRevenuePerTick(after)).toBe(2)
    expect(getResourceStock(after).money).toBe(materialBefore)
  })

  it('food shortage never generates workers by itself', () => {
    let state = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1))
    state = stepSimulation(state)
    state = withFood(state, 0)
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    // Step001: no colonists, no taxes, unconnected workshop (no roads here)
    // earns nothing; the lone building still owes 1: 75 - 1 = 74.
    expect(getResourceStock(after).money).toBe(74)
    expect(commerceRevenueForTick(after)).toBe(0)
  })

  it('treasury is uncapped: revenue lands in full at any balance', () => {
    let state = workshopState()
    const start = getResourceStock(state).money
    // t6: 50 bootstrap − 25 residence + 1 tax − 1 maintenance (t3), then
    // Workshop commerce joins at t6: 50 + 3 − 2 = 51.
    expect(start).toBe(51)
    // Step001: no cap — commerce flows at any balance, so the stock grows
    // +1/tick (revenue 3 − maintenance 2) from the first tick.
    for (let i = 0; i < 60; i++) {
      state = stepSimulation(state)
      expect(getCommerceRevenuePerTick(state)).toBe(2)
    }
    expect(getResourceStock(state).money).toBe(111)
    expect(getRevenuePerTick(state)).toBe(3)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    expect(getResourceStock(state).food).toBeGreaterThan(0)
    expect(Object.keys(state.colonists)).toHaveLength(1)
  })
})

describe('jobs integration: housing -> colonist -> workshop -> employment -> material -> construction', () => {
  it('labor-generated material enables further construction with an exact deduction', () => {
    // Step 08F: workshopState carries bootstrap stock 51 (Step 10CQ.1: 50
    // bootstrap + 2 income − 1 upkeep) above the single-workshop capacity
    // (25). Spending drops it into the storable range, where worker output
    // refills it; the second Workshop raises capacity.
    // Step 08G: the construction transaction runs AFTER production and
    // income, and BEFORE upkeep, so a placement tick stores first, then
    // credits income, then deducts 25, then pays upkeep on the remainder.
    let state = workshopState() // t6: 1 worker, money 51 (50 + 3 revenue − 2 maintenance)
    state = stepSimulation(withWorkshopWater(state), place('workshop', 6, 6)) // t7: 51 + 3 − 25 − 2 → 27
    expect(getResourceStock(state).money).toBe(27)
    state = withRoadsForWorkshops(state) // connect the new Workshop: commerce starts at completion
    state = stepSimulation(state) // t8: 1 construction tick left: 27 + 3 − 2 → 28
    // Step 10Y timing isolation: pin the stock so the post-completion trace
    // measures exactly the same economics as before the extra tick.
    state = withMoney(state, 27)
    state = stepSimulation(state) // t9: building-3 operational (vacant): 27 + 5 − 3 → 29
    expect(getResourceStock(state).money).toBe(29)
    expect(getRevenuePerTick(state)).toBe(5)
    expect(getMaintenanceDuePerTick(state)).toBe(3)
    state = stepSimulation(state) // t10: 29 + 5 − 3 → 31
    expect(getResourceStock(state).money).toBe(31)
    state = stepSimulation(withWorkshopWater(state), place('workshop', 7, 7)) // t11: 31 + 5 − 25 − 3 → 8
    expect(getResourceStock(state).money).toBe(8)

    // Below the 25 cost: another building would be rejected right now.
    expect(getResourceStock(state).money).toBeLessThan(
      BUILDING_CATALOG.workshop.constructionCost
    )

    // Revenue plus commerce raises the stock back to the construction
    // cost; the third Workshop (7,7) joins once operational.
    let ticks = 0
    while (getResourceStock(state).money < 25) {
      state = stepSimulation(state)
      ticks += 1
      expect(ticks).toBeLessThanOrEqual(30)
    }
    expect(getResourceStock(state).money).toBeGreaterThanOrEqual(25)
    expect(getEmploymentSummary(state).employed).toBe(1)
    // Steady state from here (all buildings operational, housing full):
    // one tick moves the treasury by exactly the queried net flow.
    const steady = getResourceStock(state).money
    const net = getNetMoneyPerTick(state)
    state = stepSimulation(state)
    expect(getResourceStock(state).money).toBe(steady + net)

    const before = getResourceStock(state).money
    const revenue = getRevenuePerTick(state)
    const maintenance = getMaintenanceDuePerTick(state)
    state = stepSimulation(state, place('residence', 0, 0))
    expect(state.buildings['building-5']?.type).toBe('residence')
    // Exact deduction for the construction, plus this tick's revenue,
    // minus maintenance.
    expect(getResourceStock(state).money).toBe(before + revenue - 25 - maintenance)
  })
})

describe('determinism and immutability (Step 07C §11)', () => {
  const runScenario = (): SimulationState => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2))
    state = stepSimulation(state)
    state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4))
    state = stepSimulation(state)
    state = stepSimulation(withWorkshopWater(state), place('workshop', 6, 6))
    state = stepSimulation(state)
    state = stepSimulation(state)
    return state
  }

  it('repeated identical simulations produce identical employment, material and hash', () => {
    const a = runScenario()
    const b = runScenario()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.colonists).toEqual(b.colonists)
    expect(a.buildings).toEqual(b.buildings)
    expect(getResourceStock(a)).toEqual(getResourceStock(b))
    expect(getEmploymentSummary(a)).toEqual(getEmploymentSummary(b))
  })

  it('jobs phases never mutate the input state', () => {
    const state = workshopState()
    const before = hashCanonicalState(state)
    assignJobs(state)
    collectRevenue(state)
    commerceRevenueForTick(state)
    getEmploymentSummary(state)
    expect(hashCanonicalState(state)).toBe(before)

    const stepped = stepSimulation(state)
    expect(hashCanonicalState(state)).toBe(before)
    expect(stepped).not.toBe(state)
  })

  it('the canonical hash covers employment state', () => {
    const employed = workshopState()
    const unemployed = withWorkplace(employed, 'colonist-1', null)
    expect(hashCanonicalState(employed)).not.toBe(hashCanonicalState(unemployed))
  })
})

describe('employment render projection (Step 07C §13)', () => {
  it('projects workers per building so a staffed workshop is visible', () => {
    const snapshot = toRenderSnapshot(twoWorkshopState())
    const byId = (id: string) => snapshot.buildings.find((b) => b.id === id)
    expect(byId('building-1')?.workers).toBe(0) // residence
    expect(byId('building-2')?.workers).toBe(1) // staffed workshop
    expect(byId('building-3')?.workers).toBe(0) // vacant workshop
    expect(snapshot.buildings.map((b) => b.workers)).toEqual([0, 1, 0])
  })

  it('drops the projection when the colony starves', () => {
    const starved = stepSimulation(withFood(workshopState(), 0))
    const snapshot = toRenderSnapshot(starved)
    expect(snapshot.colonists).toHaveLength(0)
    expect(snapshot.buildings.map((b) => b.workers)).toEqual([0, 0])
  })
})

describe('jobs persistence (Step 07C §10)', () => {
  it('bumps the save version to 9', () => {
    expect(SAVE_VERSION).toBe(10)
  })

  it('round-trips employment state with hash and behavioral equivalence', () => {
    const state = workshopState()
    const restored = loadSave(serializeSave(state))
    expect(restored.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(hashCanonicalState(stepSimulation(restored))).toBe(
      hashCanonicalState(stepSimulation(state))
    )
  })

  it('rejects invalid workplaceId values', () => {
    const save = serializeSave(workshopState())
    for (const invalid of [42, {}, true, []]) {
      const parsed = JSON.parse(save) as {
        state: { colonists: Record<string, Record<string, unknown>> }
      }
      const colonist = parsed.state.colonists['colonist-1']
      if (colonist === undefined) {
        throw new Error('test helper: missing serialized colonist')
      }
      colonist['workplaceId'] = invalid
      expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
    }
  })

  it('rejects a missing workplaceId field', () => {
    const save = serializeSave(workshopState())
    const parsed = JSON.parse(save) as {
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    delete parsed.state.colonists['colonist-1']?.['workplaceId']
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })

  it('explicitly rejects v3 saves (no silent employment migration)', () => {
    const save = serializeSave(workshopState())
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 3
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })
})

describe('food forecast correction (Step 07C §1 / §17)', () => {
  it('reports no finite forecast when nobody needs food', () => {
    const state = createTestState()
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports the finite remaining ticks when production is zero', () => {
    const state = withFood(colonistState(), 5)
    expect(getFoodConsumptionPerTick(state)).toBe(1)
    expect(getFoodTicksRemaining(state)).toBe(5)
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports the exact finite forecast when production < consumption', () => {
    const state = withFood(twoColonistState(), 5)
    expect(getFoodConsumptionPerTick(state)).toBe(2)
    expect(getFoodTicksRemaining(state)).toBe(2)
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports sustainable when production equals consumption', () => {
    let state = twoColonistState()
    state = stepSimulation(state, place('farm', 6, 6))
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state) // 1 construction tick left
    state = stepSimulation(state)
    expect(getJobCapacity(state)).toBe(1)
    expect(getFoodConsumptionPerTick(state)).toBe(2)
    expect(state.resources.food).toBeGreaterThan(0)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
  })

  it('reports sustainable when production exceeds consumption', () => {
    let state = colonistState()
    state = stepSimulation(state, place('farm', 6, 6))
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state) // 1 construction tick left
    state = stepSimulation(state)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
  })

  it('never claims a finite starvation time on a non-negative net flow', () => {
    // Step 10Y timing: a 2-tick building completes two ticks after placement,
    // so the completing farm is staffed and produces from the second tick.
    let state = withFood(colonistState(), 3)
    state = stepSimulation(state, place('farm', 6, 6)) // t4: eat 1 -> 2
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state) // t5: 1 tick left; eat 1 -> 1
    state = stepSimulation(state) // t6: farm op + assigned; eat 1 -> 0
    state = stepSimulation(state) // t7: +2 produced, 1 eaten -> 1
    expect(state.resources.food).toBeGreaterThanOrEqual(0)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
    // Zero food plus a net non-negative flow is not a finite countdown.
    expect(withFood(state, 0).resources.food).toBe(0)
    expect(getFoodTicksRemaining(withFood(state, 0))).toBeNull()
  })

  it('is derived only: never stored on the state, never a new resource', () => {
    const state = twoColonistState()
    getFoodTicksRemaining(state)
    isFoodSupplySustainable(state)
    expect(Object.keys(state.resources).sort()).toEqual(['food', 'money', 'water', 'wood'])
    expect(Object.keys(state).sort()).toEqual([
      'buildings',
      'colonists',
      'config',
      'counters',
      'resources',
      'roads',
      'storage',
      'time',
      'woodDeposits',
    ])
    expect(withMoney(state, 10).resources.money).toBe(10)
  })

  it('does not mutate the input state', () => {
    const state = withFood(colonistState(), 3)
    const before = hashCanonicalState(state)
    getFoodTicksRemaining(state)
    isFoodSupplySustainable(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})
