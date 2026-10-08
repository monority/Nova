import { describe, expect, it } from 'vitest'

import {
  commerceRevenueForTick,

  countEmployedWorkers,
  countStaffedOperationalWorkshops,
  getEmploymentSummary,
  getJobCapacity,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getProductiveWorkerCount,
  getRevenuePerTick,
  getResourceStock,
  hashCanonicalState,
  isEmployed,
  loadSave,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  maintenanceDueForTick,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, withRoadsForWorkshops, placeCatchUp, withWorkshopWater } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withConstruction = (
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

/** Step until the stock covers a 25 build cost (all catalog costs are 25). */
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

/**
 * R residences + W workshops. Step 10E: food is pre-stocked (farms now need
 * a worker, which would compete with these workshops and skew the labor
 * counts this fixture asserts).
 * Step 08F: one staffed Workshop equilibrates at 24, so workshops precede
 * construction — the second Workshop is funded from bootstrap, income under
 * the growing capacity funds the rest. The w=0 case fits bootstrap exactly.
 */
const capacityState = (residences: number, workshops: number): SimulationState => {
  // Step 10E: this fixture measures the labor constraint, so food is
  // pre-stocked instead of produced by (now worker-requiring) farms. This
  // keeps population and employment counts exactly as asserted.
  let state = withFood(createTestState(), 100000)
  state = placeCatchUp(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  let built = 0
  if (workshops >= 1) {
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 0, 5)) // stock 50
    state = withRoadsForWorkshops(state) // 09F: road for WS1
    state = stepSimulation(state) // colonist-1 employed, stock 49
    built = 1
  }
  if (workshops >= 2) {
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 1, 5)) // stock 24
    state = withRoadsForWorkshops(state) // 09F: road for WS2
    state = stepSimulation(state) // second operational, cap 50, stock 25
    built = 2
  }
  for (let i = 1; i < residences; i++) {
    state = untilAffordable(state)
    state = placeCatchUp(state, place('residence', i, 0))
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    state = stepSimulation(state)
  }
  for (let k = built; k < workshops; k++) {
    state = untilAffordable(state)
    state = placeCatchUp(withWorkshopWater(state), place('workshop', k + 2, 5))
    state = withRoadsForWorkshops(state) // 09F: road for the new workshop
    state = stepSimulation(state)
  }
  return state
}

describe('productive labor constraint (Step 08E)', () => {
  it('A — zero Workshops: colonists exist, production 0, upkeep on residences', () => {
    const state = capacityState(2, 0)
    const population = Object.keys(state.colonists).length
    expect(population).toBeGreaterThan(0)
    expect(getJobCapacity(state)).toBe(0)
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: no workshops, but the 2 residences still owe maintenance —
    // exactly offset by their 2 taxes, so the stock holds flat.
    expect(maintenanceDueForTick(state)).toBe(2)
    const before = getResourceStock(state).money
    const after = stepSimulation(stepSimulation(state))
    expect(getResourceStock(after).money).toBe(before)
  })

  it('B — vacant operational Workshop: no commerce (unconnected), upkeep 1', () => {
    let state = createTestState()
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // t2: operational, nobody housed
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: vacant and unconnected earns nothing but still owes 1.
    expect(maintenanceDueForTick(state)).toBe(1)
  })

  it('C — one staffed Workshop: connected commerce 2, upkeep 2 (both buildings)', () => {
    const state = capacityState(1, 1)
    expect(getProductiveWorkerCount(state)).toBe(1)
    expect(commerceRevenueForTick(state)).toBe(2)
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getNetMoneyPerTick(state)).toBe(1)
  })

  it('D — two Workshops, one worker: both connected workshops earn (Step001)', () => {
    const state = capacityState(1, 2)
    expect(getEmploymentSummary(state).employed).toBe(1)
    expect(getProductiveWorkerCount(state)).toBe(1)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    // Step001: the vacant workshop is connected, so it earns commerce too:
    // 2 workshops x 2 = 4 against 3 maintenance (residence + 2 workshops).
    expect(commerceRevenueForTick(state)).toBe(4)
    expect(maintenanceDueForTick(state)).toBe(3)
    expect(getNetMoneyPerTick(state)).toBe(2)
  })

  it('E — two Workshops, two workers: commerce 4, upkeep 4 (all buildings)', () => {
    const state = capacityState(2, 2)
    expect(getProductiveWorkerCount(state)).toBe(2)
    expect(commerceRevenueForTick(state)).toBe(4)
    expect(maintenanceDueForTick(state)).toBe(4)
    expect(getNetMoneyPerTick(state)).toBe(2)
  })

  it('F — excess population: 5 colonists, capacity 2 => production 4', () => {
    const state = capacityState(5, 2)
    const summary = getEmploymentSummary(state)
    expect(summary.population).toBe(5)
    expect(summary.jobCapacity).toBe(2)
    expect(summary.employed).toBe(2)
    expect(summary.unemployed).toBe(3)
    expect(getProductiveWorkerCount(state)).toBe(2)
    // Population alone (5 × 2 = 10) must NOT leak into production.
    expect(commerceRevenueForTick(state)).toBe(4)
    expect(commerceRevenueForTick(state)).toBe(
      getProductiveWorkerCount(state) * COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
    // Step001: 5 residences + 2 workshops pay 7 maintenance.
    expect(maintenanceDueForTick(state)).toBe(7)
  })

  it('G — Workshop under construction: no commerce, upkeep on the residence only', () => {
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 4, 4)) // t3: constructing
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: the constructing workshop pays nothing, the operational
    // residence already owes 1.
    expect(maintenanceDueForTick(state)).toBe(1)
    // Construction never implies capacity, even with a waiting colonist.
    expect(getJobCapacity(state)).toBe(0)
  })

  it('H — starvation: 0 workers => 0 commerce, upkeep still due, stock drops by maintenance', () => {
    // Farm-less colony: food 0 starves on the very next tick.
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = placeCatchUp(withWorkshopWater(state), place('workshop', 4, 4)) // t3
    state = stepSimulation(state) // t4: operational, employed
    state = withFood(state, 0)
    const materialBefore = getResourceStock(state).money
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(0)
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: residence + workshop stay operational and owe 2 against 0
    // revenue — death costs the treasury one maintenance bill.
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getResourceStock(state).money).toBe(materialBefore - 2)
  })

  it('productive count equals actual valid assignments', () => {
    for (const [r, w] of [
      [1, 1],
      [1, 2],
      [2, 2],
      [5, 2],
    ] as const) {
      const state = capacityState(r, w)
      expect(getProductiveWorkerCount(state)).toBe(
        countEmployedWorkers(state)
      )
      let resolved = 0
      for (const colonist of Object.values(state.colonists)) {
        if (isEmployed(state, colonist)) {
          resolved += 1
          const workplace = state.buildings[colonist.workplaceId ?? '']
          expect(workplace?.type).toBe('workshop')
          expect(workplace?.status).toBe('operational')
        }
      }
      expect(getProductiveWorkerCount(state)).toBe(resolved)
      expect(getProductiveWorkerCount(state)).toBeLessThanOrEqual(
        getJobCapacity(state)
      )
    }
  })

  it('production query equals simulation revenue (single stream, no double count)', () => {
    const state = capacityState(2, 2)
    const income = getRevenuePerTick(state)
    const upkeep = maintenanceDueForTick(state)
    const before = getResourceStock(state).money
    const after = stepSimulation(state)
    // Step001: ONE revenue stream (taxes + commerce) minus the upkeep
    // actually paid (clamped to stock + income). The old formula added
    // stored production and income separately — that double-counts
    // commerce now that revenue already includes it.
    const upkeepPaid = Math.min(before + income, upkeep)
    expect(getResourceStock(after).money).toBe(before + income - upkeepPaid)
  })

  it('upkeep counts all operational buildings (Step001)', () => {
    // capacityState(1, 1): residence + workshop; (2, 2): +residence +workshop;
    // (5, 2): 5 residences + 2 workshops.
    expect(getMaintenanceDuePerTick(capacityState(1, 1))).toBe(2)
    expect(getMaintenanceDuePerTick(capacityState(2, 2))).toBe(4)
    expect(maintenanceDueForTick(capacityState(5, 2))).toBe(7)
  })

  it('conservation: treasury never negative (deficits clamp, no debt)', () => {
    const starts: SimulationState[] = [
      capacityState(2, 0),
      capacityState(1, 1),
      capacityState(1, 2),
      capacityState(5, 2),
      withConstruction(capacityState(2, 2), 0),
    ]
    // Step001: upkeep routinely exceeds commerce (deficit colonies); the
    // conserved quantity is the floor — maintenance is clamped to stock +
    // income, so the treasury can rest at 0 but never below it.
    for (const start of starts) {
      let state = start
      for (let i = 0; i < 20; i++) {
        state = stepSimulation(state)
        expect(getResourceStock(state).money).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('determinism: capacity scenario replays to identical state + hash', () => {
    const run = (): SimulationState => {
      let state = capacityState(5, 2)
      state = placeCatchUp(state, place('farm', 3, 3))
      state = stepSimulation(state)
      state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('save/hash: SAVE_VERSION 9, round-trip stable, nothing new persisted', () => {
    expect(SAVE_VERSION).toBe(9)
    const state = stepSimulation(capacityState(5, 2))
    const raw = serializeSave(state)
    expect(raw).not.toContain('productive')
    expect(raw).not.toContain('upkeep')
    const restored = loadSave(raw)
    expect(restored).toEqual(state)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })
})
