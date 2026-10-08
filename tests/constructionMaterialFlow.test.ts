/**
 * Step001 — money flow through the construction transaction.
 *
 * Revenue (taxes + commerce) lands before the player command; maintenance
 * is deducted after. The treasury is uncapped: revenue always lands in
 * full, and exact spend math is pinned below.
 */

import { describe, expect, it } from 'vitest'

import {
  BUILDING_CATALOG,
  countEmployedWorkers,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getResourceStock,
  getRevenuePerTick,
  hashCanonicalState,
  loadSave,
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

const atMoney = (
  state: SimulationState,
  money: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, money },
})

/** One staffed operational road-connected Workshop, one colonist: revenue 3, maintenance 2. */
const singleWorkshop = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  // Step 09F: commerce requires road access — connect BEFORE revenue ticks.
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t4: operational + staffed
  return state
}

/**
 * Two connected operational Workshops, two employed workers.
 * Revenue 6 (2 taxes + 4 commerce), maintenance 4. No farm: the 100-food
 * bootstrap covers the few ticks these tests run.
 */
const twoWorkshopsTwoWorkers = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t4: WS1 operational + staffed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5)) // t5
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t6: WS2 operational
  state = stepSimulation(state, place('residence', 1, 0)) // t7
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t8: colonist-2 admitted + employed
  return state
}

/** Two connected operational Workshops, one employed worker. Revenue 5, maintenance 3. */
const twoWorkshopsOneWorker = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t4: WS1 operational + staffed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5)) // t5
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t6: WS2 operational (vacant)
  return state
}

describe('money flow (Step001)', () => {
  describe('A — reach construction threshold', () => {
    it('1 — 22 money + 3 revenue reaches 25 mid-tick', () => {
      const before = atMoney(singleWorkshop(), 22)
      expect(getResourceStock(before).money).toBe(22)
      // Revenue (+3) runs before the transaction, so the 25-cost placement
      // is accepted from a 22 treasury.
      const after = stepSimulation(before, place('residence', 0, 0))
      expect(Object.keys(after.buildings)).toHaveLength(
        Object.keys(before.buildings).length + 1
      )
    })

    it('2 — construction succeeds with the 2-tick contract intact', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      const placed = after.buildings['building-3']
      expect(placed?.type).toBe('residence')
      expect(placed?.status).toBe('underConstruction')
      // Step 10Y: a placed building is no longer caught up, so the catalog's
      // 2 construction ticks are exactly two ticks after placement.
      expect(placed?.constructionRemaining).toBe(2)
      const mid = stepSimulation(after)
      expect(mid.buildings['building-3']?.status).toBe('underConstruction')
      const next = stepSimulation(mid)
      expect(next.buildings['building-3']?.status).toBe('operational')
    })

    it('3 — exact spend: 30 + 3 revenue − 25 cost − 2 maintenance = 6', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      expect(getResourceStock(after).money).toBe(6)
    })
  })

  describe('B — no treasury cap', () => {
    it('4 — revenue at a large balance lands in full', () => {
      const before = atMoney(singleWorkshop(), 10000)
      const after = stepSimulation(before, place('farm', 5, 5))
      // 10000 + 3 revenue − 25 cost − 2 maintenance = 9976 (never clamped).
      expect(getResourceStock(after).money).toBe(9976)
    })

    it('5 — revenue without construction accumulates net flow', () => {
      // Complete the Workshop's second construction tick first so the resting
      // state earns full revenue: tax 1 + commerce 2 − maintenance 2 = net 1.
      const before = atMoney(stepSimulation(singleWorkshop()), 75)
      const after = stepSimulation(before)
      // 75 + 3 revenue − 2 maintenance = 76.
      expect(getResourceStock(after).money).toBe(76)
      expect(getNetMoneyPerTick(before)).toBe(1)
    })
  })

  describe('C — atomic failure', () => {
    it('6 — insufficient money places nothing', () => {
      const before = atMoney(createTestState(), 10)
      const after = stepSimulation(before, place('residence', 3, 3))
      expect(Object.keys(after.buildings)).toHaveLength(0)
    })

    it('7 — treasury is unchanged on failure (no revenue, no buildings)', () => {
      const before = atMoney(createTestState(), 10)
      const after = stepSimulation(before, place('residence', 3, 3))
      expect(getResourceStock(after).money).toBe(10)
    })

    it('8 — building state is unchanged on failure (occupied cell)', () => {
      const before = atMoney(singleWorkshop(), 30)
      const count = Object.keys(before.buildings).length
      const after = stepSimulation(before, place('farm', 2, 2))
      expect(Object.keys(after.buildings)).toHaveLength(count)
      // The rejected command still runs revenue (+3) minus maintenance (−2).
      expect(getResourceStock(after).money).toBe(31)
    })
  })

  describe('D — maintenance interaction', () => {
    it('9 — construction at 23 leaves the treasury for maintenance to clear', () => {
      // 23 + 3 revenue − 25 cost = 1, then maintenance pays its clamped 1.
      const after = stepSimulation(atMoney(singleWorkshop(), 23), place('residence', 0, 0))
      expect(getResourceStock(after).money).toBe(0)
    })

    it('10 — maintenance is due for the standing buildings after construction', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      // Residence + Workshop operational; the new residence is still dry.
      expect(getMaintenanceDuePerTick(after)).toBe(2)
      expect(getResourceStock(after).money).toBe(6)
    })

    it('11 — money never goes negative through construction + maintenance', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 23), place('residence', 0, 0))
      expect(getResourceStock(after).money).toBeGreaterThanOrEqual(0)
    })

    it('12 — the workshop stays operational and staffed after a clamped maintenance', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 23), place('residence', 0, 0))
      const workshop = Object.values(after.buildings).find(
        (b) => b.type === 'workshop'
      )
      expect(workshop?.status).toBe('operational')
      expect(countEmployedWorkers(after)).toBe(1)
    })
  })

  describe('E — all building types', () => {
    it('13 — residence builds from money 23', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 23), place('residence', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('residence')
      expect(getResourceStock(after).money).toBe(0)
    })

    it('14 — farm builds from money 23', () => {
      const after = stepSimulation(atMoney(singleWorkshop(), 23), place('farm', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('farm')
      expect(getResourceStock(after).money).toBe(0)
    })

    it('15 — workshop builds from money 23 (no special case)', () => {
      const after = stepSimulation(withWorkshopWater(atMoney(singleWorkshop(), 23)), place('workshop', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('workshop')
      expect(after.buildings['building-3']?.status).toBe('underConstruction')
      expect(getResourceStock(after).money).toBe(0)
    })
  })

  describe('F — multiple workshops', () => {
    it('16 — two-workshop revenue and maintenance interact deterministically', () => {
      // 48 + 6 revenue − 25 cost − 4 maintenance = 25.
      const before = atMoney(twoWorkshopsTwoWorkers(), 48)
      const after = stepSimulation(before, place('residence', 5, 5))
      expect(getResourceStock(after).money).toBe(25)
      expect(getMaintenanceDuePerTick(after)).toBe(4)
      expect(countEmployedWorkers(after)).toBe(2)
    })

    it('17 — one worker under two workshops: revenue 5, maintenance 3', () => {
      // 48 + 5 revenue − 25 cost − 3 maintenance = 25.
      const before = atMoney(twoWorkshopsOneWorker(), 48)
      expect(countEmployedWorkers(before)).toBe(1)
      const after = stepSimulation(before, place('farm', 5, 5))
      expect(getResourceStock(after).money).toBe(25)
      expect(getMaintenanceDuePerTick(after)).toBe(3)
    })

    it('18 — maintenance goes partial when construction leaves less than due', () => {
      // 20 + 6 revenue − 25 cost = 1, below the 4 due: pays 1, ends 0.
      const before = atMoney(twoWorkshopsTwoWorkers(), 20)
      const after = stepSimulation(before, place('farm', 5, 5))
      expect(getResourceStock(after).money).toBe(0)
      expect(getMaintenanceDuePerTick(after)).toBe(4)
      expect(countEmployedWorkers(after)).toBe(2)
      for (const building of Object.values(after.buildings)) {
        if (building.type === 'workshop') {
          expect(building.status).toBe('operational')
        }
      }
    })
  })

  describe('G — determinism', () => {
    it('19 — repeated replay of the build path is identical', () => {
      const run = (): SimulationState =>
        stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      const a = run()
      const b = run()
      expect(a).toEqual(b)
    })

    it('20 — hash is identical across replays', () => {
      const a = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      const b = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    })
  })

  describe('H — persistence', () => {
    it('21 — save/load round-trips after construction (SAVE_VERSION 9)', () => {
      expect(SAVE_VERSION).toBe(9)
      const state = stepSimulation(atMoney(singleWorkshop(), 30), place('residence', 0, 0))
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
      expect(getResourceStock(restored).money).toBe(6)
    })

    it('22 — save/load round-trips after a revenue-only tick', () => {
      const state = stepSimulation(atMoney(singleWorkshop(), 75))
      // 75 + 3 revenue − 2 maintenance = 76.
      expect(getResourceStock(state).money).toBe(76)
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    })

    it('23 — save/load round-trips after construction + partial maintenance', () => {
      const state = stepSimulation(
        atMoney(twoWorkshopsTwoWorkers(), 20),
        place('farm', 5, 5)
      )
      expect(getResourceStock(state).money).toBe(0)
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
      expect(getMaintenanceDuePerTick(restored)).toBe(4)
    })
  })

  describe('catalog frozen (Step 08G §2)', () => {
    it('no numerical rebalance slipped in', () => {
      expect(BUILDING_CATALOG.residence.constructionCost).toBe(25)
      expect(BUILDING_CATALOG.farm.constructionCost).toBe(25)
      expect(BUILDING_CATALOG.workshop.constructionCost).toBe(25)
    })
  })

  describe('revenue reads', () => {
    it('single-workshop fixture reports revenue 3', () => {
      // The historical fixture rests one tick before completion; the
      // operational state earns the full 3 (tax 1 + commerce 2).
      expect(getRevenuePerTick(stepSimulation(singleWorkshop()))).toBe(3)
    })
  })
})
