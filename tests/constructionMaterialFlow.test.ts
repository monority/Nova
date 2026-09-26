import { describe, expect, it } from 'vitest'

import {
  BUILDING_CATALOG,
  countEmployedWorkers,
  getMaterialStorageCapacity,
  getMaterialUpkeepPerTick,
  getResourceStock,
  hashCanonicalState,
  loadSave,
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

const atConstruction = (
  state: SimulationState,
  construction: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
})

/** One staffed operational road-connected Workshop (cap 25), one colonist. */
const singleWorkshop = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  // Step 09F: production requires road access — connect BEFORE production ticks.
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state) // t4: operational + staffed
  return state
}

/** Rest state pinned to the historical 08F equilibrium stock (24 material). */
const equilibrium24 = (): SimulationState =>
  atConstruction(singleWorkshop(), 24)

/**
 * Two operational Workshops, two employed workers (cap 50, gross 4).
 * No farm: the 100-food bootstrap covers the few ticks these tests run.
 */
const twoWorkshopsTwoWorkers = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // t4: WS1 operational + staffed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5)) // t5
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // t6: WS2 operational, cap 50
  state = stepSimulation(state, place('residence', 1, 0)) // t7
  state = withRoadsForWorkshops(state) // 09K: connect the second residence
  state = stepSimulation(state) // t8: colonist-2 admitted + employed
  return state
}

/** Two operational Workshops, one employed worker (cap 50, gross 2). */
const twoWorkshopsOneWorker = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // t4: WS1 operational + staffed
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5)) // t5
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // t6: WS2 operational (vacant), cap 50
  return state
}

describe('construction material flow (Step 08G)', () => {
  describe('A — reach construction threshold', () => {
    it('1 — 24 material + valid production reaches 25 mid-tick', () => {
      const before = equilibrium24()
      expect(getResourceStock(before).construction).toBe(24)
      // Production (+1 stored under cap 25) and Step 10CQ income (+2) run
      // before the transaction, so the 25-cost placement is accepted from a
      // 24 rest stock.
      const after = stepSimulation(before, place('residence', 0, 0))
      expect(Object.keys(after.buildings)).toHaveLength(
        Object.keys(before.buildings).length + 1
      )
    })

    it('2 — construction succeeds at 25 with the 2-tick contract intact', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
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

    it('3 — exactly 25 material is consumed (24 + 1 stored + 2 income − 25 − 1 upkeep)', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      // Step 10CQ.1: 24 + 1 stored + 2 income − 25 cost = 2, upkeep takes 1.
      expect(getResourceStock(after).construction).toBe(1)
    })
  })

  describe('B — no hypothetical overflow', () => {
    it('4 — gross above remaining capacity does not inflate spendable stock', () => {
      // 2 workers gross 4, but only 1 fits under cap 50 at stock 49.
      // Spendable mid-tick stock is 50, not 49 + 4 = 53.
      const before = atConstruction(twoWorkshopsTwoWorkers(), 49)
      const after = stepSimulation(before, place('farm', 5, 5))
      // Step 10CQ.1: 49 + 1 stored + 4 income − 25 cost − 2 upkeep = 27
      // (a model that ignored the clamp would give 53).
      expect(getResourceStock(after).construction).toBe(27)
    })

    it('5 — fully discarded production adds nothing to a build', () => {
      // Bootstrap stock 75 sits above the single-workshop cap: stored is 0.
      const before = atConstruction(singleWorkshop(), 75)
      const after = stepSimulation(before, place('farm', 5, 5))
      // Step 10CQ.1: 75 + 0 stored + 2 income − 25 cost − 1 upkeep = 51.
      expect(getResourceStock(after).construction).toBe(51)
    })
  })

  describe('C — atomic failure', () => {
    it('6 — insufficient material places nothing', () => {
      const before = atConstruction(createTestState(), 10)
      const after = stepSimulation(before, place('residence', 3, 3))
      expect(Object.keys(after.buildings)).toHaveLength(0)
    })

    it('7 — stock is unchanged on failure', () => {
      const before = atConstruction(createTestState(), 10)
      const after = stepSimulation(before, place('residence', 3, 3))
      expect(getResourceStock(after).construction).toBe(10)
    })

    it('8 — building state is unchanged on failure (occupied cell)', () => {
      const before = equilibrium24()
      const count = Object.keys(before.buildings).length
      const after = stepSimulation(before, place('farm', 2, 2))
      expect(Object.keys(after.buildings)).toHaveLength(count)
      // The rejected command still runs production (1 stored) and income (2)
      // minus upkeep (1): 24 + 1 + 2 − 1 = 26 (Step 10CQ.1).
      expect(getResourceStock(after).construction).toBe(26)
    })
  })

  describe('D — upkeep interaction', () => {
    it('9 — construction at 25 leaves stock for upkeep to pay from (Step 10CQ.1)', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      // 24 + 1 stored + 2 income − 25 cost = 2, then upkeep pays its 1.
      expect(getResourceStock(after).construction).toBe(1)
    })

    it('10 — upkeep is paid from the stock left after construction (due 1, paid 1)', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      expect(materialUpkeepDueForTick(after)).toBe(1)
      expect(getMaterialUpkeepPerTick(after)).toBe(1)
      // Step 10CQ.1: income leaves 2 after the 25-cost spend, so the full
      // 1 due is paid and 1 remains (the clamped path lives in test 19).
      expect(getResourceStock(after).construction).toBe(1)
    })

    it('11 — material never goes negative through construction + upkeep', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      expect(getResourceStock(after).construction).toBeGreaterThanOrEqual(0)
    })

    it('12 — the workshop stays operational and staffed after a clamped upkeep', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      const workshop = Object.values(after.buildings).find(
        (b) => b.type === 'workshop'
      )
      expect(workshop?.status).toBe('operational')
      expect(countEmployedWorkers(after)).toBe(1)
    })
  })

  describe('E — all building types', () => {
    it('13 — residence builds from stock 24 (Step 10CQ.1)', () => {
      const after = stepSimulation(equilibrium24(), place('residence', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('residence')
      // 24 + 1 stored + 2 income − 25 cost − 1 upkeep = 1.
      expect(getResourceStock(after).construction).toBe(1)
    })

    it('14 — farm builds from stock 24 (Step 10CQ.1)', () => {
      const after = stepSimulation(equilibrium24(), place('farm', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('farm')
      expect(getResourceStock(after).construction).toBe(1)
    })

    it('15 — workshop builds from stock 24 (no special case)', () => {
      const after = stepSimulation(withWorkshopWater(equilibrium24()), place('workshop', 0, 0))
      expect(after.buildings['building-3']?.type).toBe('workshop')
      expect(after.buildings['building-3']?.status).toBe('underConstruction')
      expect(getResourceStock(after).construction).toBe(1)
    })
  })

  describe('F — multiple workshops', () => {
    it('16 — two workshops give capacity 50', () => {
      expect(
        getMaterialStorageCapacity(twoWorkshopsTwoWorkers())
      ).toBe(50)
    })

    it('17 — two-worker production interacts deterministically with upkeep', () => {
      // Step 10CQ.1: 48 + 2 stored + 4 income − 25 cost − 2 upkeep = 27.
      const before = atConstruction(twoWorkshopsTwoWorkers(), 48)
      const after = stepSimulation(before, place('residence', 5, 5))
      expect(getResourceStock(after).construction).toBe(27)
      expect(materialUpkeepDueForTick(after)).toBe(2)
      expect(countEmployedWorkers(after)).toBe(2)
    })

    it('18 — one-worker production under two-workshop capacity', () => {
      // Step 10CQ.1: 48 + 2 stored + 2 income − 25 cost − 1 upkeep = 26.
      const before = atConstruction(twoWorkshopsOneWorker(), 48)
      expect(countEmployedWorkers(before)).toBe(1)
      const after = stepSimulation(before, place('farm', 5, 5))
      expect(getResourceStock(after).construction).toBe(26)
      expect(materialUpkeepDueForTick(after)).toBe(1)
    })

    it('19 — upkeep goes partial when construction leaves less than due', () => {
      // Step 10CQ.1: the pin moves 22 → 18 so the partial-upkeep
      // precondition survives income: 18 + 4 stored + 4 income − 25 cost = 1,
      // which is below the 2 due: pays 1, ends 0.
      const before = atConstruction(twoWorkshopsTwoWorkers(), 18)
      const after = stepSimulation(before, place('farm', 5, 5))
      expect(getResourceStock(after).construction).toBe(0)
      expect(materialUpkeepDueForTick(after)).toBe(2)
      expect(countEmployedWorkers(after)).toBe(2)
      for (const building of Object.values(after.buildings)) {
        if (building.type === 'workshop') {
          expect(building.status).toBe('operational')
        }
      }
    })
  })

  describe('G — determinism', () => {
    it('20 — repeated replay of the 24 → build → 1 path is identical', () => {
      const run = (): SimulationState =>
        stepSimulation(equilibrium24(), place('residence', 0, 0))
      const a = run()
      const b = run()
      expect(a).toEqual(b)
    })

    it('21 — hash is identical across replays', () => {
      const a = stepSimulation(equilibrium24(), place('residence', 0, 0))
      const b = stepSimulation(equilibrium24(), place('residence', 0, 0))
      expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    })
  })

  describe('H — persistence', () => {
    it('22 — save/load round-trips after construction (SAVE_VERSION 4)', () => {
      expect(SAVE_VERSION).toBe(8)
      const state = stepSimulation(equilibrium24(), place('residence', 0, 0))
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
      expect(getResourceStock(restored).construction).toBe(1)
    })

    it('23 — save/load round-trips after a production-only tick', () => {
      const state = stepSimulation(equilibrium24())
      // Step 10CQ.1: 24 + 1 stored + 2 income − 1 upkeep = 26.
      expect(getResourceStock(state).construction).toBe(26)
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    })

    it('24 — save/load round-trips after construction + partial upkeep', () => {
      const state = stepSimulation(
        // Step 10CQ.1: pin18 keeps the partial-upkeep precondition (see 19).
        atConstruction(twoWorkshopsTwoWorkers(), 18),
        place('farm', 5, 5)
      )
      expect(getResourceStock(state).construction).toBe(0)
      const restored = loadSave(serializeSave(state))
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
      expect(materialUpkeepDueForTick(restored)).toBe(2)
    })
  })

  describe('catalog frozen (Step 08G §2)', () => {
    it('no numerical rebalance slipped in', () => {
      expect(BUILDING_CATALOG.residence.constructionCost).toBe(25)
      expect(BUILDING_CATALOG.farm.constructionCost).toBe(25)
      expect(BUILDING_CATALOG.workshop.constructionCost).toBe(25)
    })
  })
})
