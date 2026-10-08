import { describe, expect, it } from 'vitest'

import {
  commerceRevenueForTick,

  BUILDING_CATALOG,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getRevenuePerTick,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getResourceStock,
  hashCanonicalState,
  loadSave,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  maintenanceDueForTick,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type BuildingState,
  type ColonistState,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, withRoadsForWorkshops, withStaffedFarms, withWorkshopWater } from './helpers.js'

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
 * N employed colonists staffing N operational Workshops, food kept
 * sustainable with two farms. Step 08F: a single staffed Workshop
 * equilibrates at stock 24, so the second Workshop comes from bootstrap
 * funds; worker income under the growing capacity funds the rest.
 */
const colony = (n: number): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3: stock 50
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // colonist-1 employed, stock 49
  if (n === 0) {
    return withStaffedFarms(state)
  }
  state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5))
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // second operational, cap 50
  state = untilAffordable(state)
  state = stepSimulation(state, place('farm', 6, 6)) // Step 10Y
  state = stepSimulation(state) // 1 construction tick left
  state = stepSimulation(state)
  state = withStaffedFarms(state) // Step 10E: farms produce only when staffed
  state = untilAffordable(state)
  state = stepSimulation(state, place('farm', 7, 7)) // Step 10Y
  state = stepSimulation(state) // 1 construction tick left
  state = stepSimulation(state)
  state = withStaffedFarms(state) // Step 10E: second farmer
  // Step001: a balanced colony earns net ~0 and cannot fund its own
  // expansion (poverty trap — covered by the trap/recovery tests, not
  // here). The loop below is grant-funded ONCE so the STRUCTURAL colony
  // still gets built; earnings are abstracted, mechanics below stay real.
  // Grant covers the loop's spend: (n-1) residences + (n-2) workshops.
  if (n >= 2) {
    state = withConstruction(state, 25 * (2 * n - 2))
  }
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
  return withStaffedFarms(state)
}

/** Residence + Workshop, no farm: food 0 starves on the next tick. */
const workshopOnlyState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for production
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // operational, employed
  return state
}

/** Same food buildings as colony(1) (residence + 2 farms), minus Workshop. */
const noWorkshopTwin = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(state, place('farm', 6, 6)) // t3
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // farm operational
  state = stepSimulation(state, place('farm', 7, 7))
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state) // second farm operational
  return withStaffedFarms(state) // Step 10E: two staffed farms, food sustained
}

/**
 * Synthetic query fixture for the §5 balance matrix.
 *
 * Reachable rows (staffed === workers, or vacant extras) arise naturally;
 * Reachable rows (staffed === workers, or vacant extras) arise naturally;
 * deficit rows (staffed < workers with employed output counted in full)
 * cannot arise from assignJobs — several colonists share one workplace —
 * so they are documented query-level fixtures, not simulation states.
 */
const matrixFixture = (workers: number, staffed: number): SimulationState => {
  const base = createTestState()
  const buildings: Record<string, BuildingState> = {}
  const colonists: Record<string, ColonistState> = {}
  for (let w = 0; w < staffed; w++) {
    const id = `building-${w + 1}`
    buildings[id] = {
      id,
      type: 'workshop',
      x: w,
      y: 5,
      status: 'operational',
      constructionRemaining: 0,
    }
  }
  for (let c = 0; c < workers; c++) {
    const id = `colonist-${c + 1}`
    // Spread workers over staffed workshops round-robin; with staffed = 0
    // every colonist stays unemployed.
    const workplaceId =
      staffed === 0 ? null : `building-${(c % staffed) + 1}`
    colonists[id] = { id, residenceId: 'building-99', workplaceId, workplaceAssignmentMode: 'automatic', constructionAssignmentId: null }
  }
  return withRoadsForWorkshops({
    ...base,
    resources: { ...base.resources, money: 100, food: 100 },
    buildings,
    colonists,
    counters: {
      nextBuildingId: Object.keys(buildings).length + 1,
      nextColonistId: workers + 1,
      nextRoadId: 1,
    },
  })
}

describe('economic invariants (Step 08D)', () => {
  it('INV-01 — material (and food) never negative across representative states', () => {
    const scenarios: SimulationState[] = [
      createTestState(),
      colony(0),
      colony(1),
      colony(2),
      colony(4),
      withConstruction(colony(2), 1),
      withConstruction(colony(1), 0),
      withFood(colony(1), 0),
    ]
    for (const start of scenarios) {
      let state = start
      for (let tick = 0; tick < 30; tick++) {
        state = stepSimulation(state)
        expect(getResourceStock(state).money).toBeGreaterThanOrEqual(0)
        expect(getResourceStock(state).food).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('INV-02 — staffing bound holds; upkeep may exceed commerce (Step001 deficit documented)', () => {
    // Net per colony under money (revenue plekken taxes+commerce minus
    // maintenance over all operational buildings): colony(0) +1, the
    // balanced colonies 0, colony(4) +2 (4 workshops vs 2 farms).
    const expectedNet: Record<number, number> = { 0: 1, 1: 0, 2: 0, 4: 2 }
    for (const n of [0, 1, 2, 4]) {
      const state = colony(n)
      const summary = getEmploymentSummary(state)
      expect(countStaffedOperationalWorkshops(state)).toBeLessThanOrEqual(
        summary.employed
      )
      // Treasury never negative even in deficit (clamp, no debt).
      expect(getResourceStock(state).money).toBeGreaterThanOrEqual(0)
      expect(getNetMoneyPerTick(state)).toBe(expectedNet[n])
    }
  })

  it('INV-03 — vacant operational Workshop still pays 1 maintenance (earns commerce when connected)', () => {
    let state = createTestState()
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational, nobody housed
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getEmploymentSummary(state).employed).toBe(0)
    // Step001: vacancy removes staffing, not infrastructure — the building
    // owes maintenance (unconnected here, so no commerce either).
    expect(maintenanceDueForTick(state)).toBe(1)
    expect(getMaintenanceDuePerTick(state)).toBe(1)
  })

  it('INV-04 — under-construction Workshop pays 0', () => {
    const constructing = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1)
    )
    expect(constructing.buildings['building-1']?.status).toBe(
      'underConstruction'
    )
    expect(maintenanceDueForTick(constructing)).toBe(0)
    expect(getMaintenanceDuePerTick(constructing)).toBe(0)
  })

  it('INV-05 — Residence and Farm DO pay maintenance (Step001)', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 0, 0)) // t1
    state = stepSimulation(state) // t2: colonist, residence operational
    state = stepSimulation(state, place('farm', 6, 6)) // t3
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state) // t4: farm operational, farmer assigned
    state = stepSimulation(state) // t5: first staffed production tick
    expect(
      Object.values(state.buildings).some((b) => b.type === 'workshop')
    ).toBe(false)
    expect(countStaffedOperationalWorkshops(state)).toBe(0)
    // Step001: residence + farm = 2 maintenance units (no workshop needed).
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    // Food still flows: a staffed Farm produces without any upkeep.
    expect(getFoodProductionPerTick(state)).toBe(2)
  })

  it('INV-06 — one worker cannot staff multiple Workshops', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 0, 0)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = stepSimulation(withWorkshopWater(state), place('workshop', 0, 5)) // t3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // t4: employed
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 5)) // t5
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // t6: second operational, still 1 colonist
    const summary = getEmploymentSummary(state)
    expect(summary.population).toBe(1)
    expect(summary.employed).toBe(1)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    for (const building of Object.values(state.buildings)) {
      if (building.type === 'workshop') {
        expect(countWorkersAt(state, building.id)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('INV-07 — commerce scales with connected workshops (Step001: staffing-independent)', () => {
    expect(COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK).toBe(2)
    // Step001: commerce counts connected workshops, vacant included — so
    // synthetic single-purpose fixtures measure the linearity (2/4/8),
    // while colony(1) already shows 4 (both its workshops connected).
    expect(commerceRevenueForTick(matrixFixture(0, 1))).toBe(2)
    expect(commerceRevenueForTick(matrixFixture(0, 2))).toBe(4)
    expect(commerceRevenueForTick(matrixFixture(0, 4))).toBe(8)
    expect(commerceRevenueForTick(colony(1))).toBe(4)
  })

  it('INV-08 — upkeep scales with operational buildings (7/8/12 here)', () => {
    expect(MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK).toBe(1)
    // Step001: every operational building pays — colony(1) has 7
    // (residence + 2 workshops + 2 farms + 2 farmer residences),
    // colony(2) adds a residence (8), colony(4) adds 3 residences +
    // 2 workshops (12).
    expect(maintenanceDueForTick(colony(1))).toBe(7)
    expect(maintenanceDueForTick(colony(2))).toBe(8)
    expect(maintenanceDueForTick(colony(4))).toBe(12)
  })

  it('INV-09 — tick delta = revenue − upkeep actually paid (Step001)', () => {
    // Net per colony under money: colony(1) 0, colony(2) 0, colony(4) +2.
    const expectedNet: Record<number, number> = { 1: 0, 2: 0, 4: 2 }
    for (const n of [1, 2, 4]) {
      expect(getNetMoneyPerTick(colony(n))).toBe(expectedNet[n])
      const state = colony(n)
      const before = getResourceStock(state).money
      const income = getRevenuePerTick(state)
      const upkeepDue = maintenanceDueForTick(state)
      const upkeepPaid = Math.min(before + income, upkeepDue)
      const after = stepSimulation(state)
      expect(getResourceStock(after).money).toBe(
        before + income - upkeepPaid
      )
      expect(income).toBeGreaterThan(0)
    }
  })

  it('INV-10 — zero workers: no revenue, upkeep still due, treasury drains by maintenance', () => {
    let state = createTestState()
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // t2: still under construction -> no upkeep yet
    expect(getRevenuePerTick(state)).toBe(0)
    expect(getMaintenanceDuePerTick(state)).toBe(0)
    expect(getNetMoneyPerTick(state)).toBe(0)
    state = stepSimulation(state) // t3: operational, vacant
    expect(getMaintenanceDuePerTick(state)).toBe(1)
    const before = getResourceStock(state).money
    for (let i = 0; i < 5; i++) {
      state = stepSimulation(state)
    }
    // Step001: a vacant connected workshop earns nothing here (unconnected)
    // and still owes 1/tick: 75 − 5 = 70.
    expect(getResourceStock(state).money).toBe(before - 5)
  })

  it('INV-11 — empty stock holds at zero (Step001 poverty trap), population stable', () => {
    let state = withConstruction(colony(1), 0)
    expect(getFoodProductionPerTick(state)).toBeGreaterThanOrEqual(
      getFoodConsumptionPerTick(state)
    )
    const populationBefore = Object.keys(state.colonists).length
    state = stepSimulation(state)
    // Step001: colony(1) nets exactly 0 (revenue 7 vs maintenance 7), so an
    // empty treasury stays empty — maintenance is clamped, never debt, and
    // nobody starves (food sustained), so the population holds.
    expect(getResourceStock(state).money).toBe(0)
    expect(Object.keys(state.colonists).length).toBe(populationBefore)
  })

  it('INV-12 — construction costs unchanged (25/25/25)', () => {
    expect(BUILDING_CATALOG.residence.constructionCost).toBe(25)
    expect(BUILDING_CATALOG.farm.constructionCost).toBe(25)
    expect(BUILDING_CATALOG.workshop.constructionCost).toBe(25)
  })

  it('INV-13 — construction creates no hidden upkeep before operational', () => {
    let state = createTestState()
    const before = getResourceStock(state).money
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    // Only the build cost left the stock; no upkeep on the placement tick.
    expect(getResourceStock(state).money).toBe(before - 25)
    expect(maintenanceDueForTick(state)).toBe(0)
    state = stepSimulation(state) // t2: operational, vacant
    expect(maintenanceDueForTick(state)).toBe(0)
  })

  it('INV-14 — determinism: same state + same commands, same state + same hash', () => {
    const run = (): SimulationState => {
      let state = colony(2)
      state = stepSimulation(state, place('farm', 3, 3))
      state = stepSimulation(state)
      state = stepSimulation(state)
      state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('phase order — revenue lands before maintenance (Step001)', () => {
    // From an empty stock: revenue (+7) lands first, then upkeep (−7) is
    // clamped to it: result 0 proves the order (upkeep-first would pay 0
    // from the empty stock, then leave the full 7).
    const empty = withConstruction(colony(1), 0)
    const tickBefore = empty.time.tick
    const after = stepSimulation(empty)
    expect(getResourceStock(after).money).toBe(0)
    expect(after.time.tick).toBe(tickBefore + 1)
    // A newcomer admitted this tick is assigned and nets production minus
    // upkeep in the same tick: assignJobs -> produceMaterial -> upkeep.
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1 admitted
    const stockBefore = getResourceStock(state).money
    state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational + staffed; the newcomer's
    // tax was already flowing, so the workshop coming online nets commerce
    // +2 minus its own maintenance +1: +1 on the tick.
    expect(getResourceStock(state).money).toBe(stockBefore - 25 + 1)
  })

  it('balance matrix (§5) — production / upkeep / net per fixture row (Step001: net includes per-capita taxes)', () => {
    const rows: Array<{
      workers: number
      staffed: number
      production: number
      upkeep: number
      net: number
    }> = [
      { workers: 0, staffed: 0, production: 0, upkeep: 0, net: 0 },
      { workers: 1, staffed: 0, production: 0, upkeep: 0, net: 1 },
      { workers: 1, staffed: 1, production: 2, upkeep: 1, net: 2 },
      { workers: 2, staffed: 0, production: 0, upkeep: 0, net: 2 },
      { workers: 2, staffed: 1, production: 2, upkeep: 1, net: 3 },
      { workers: 2, staffed: 2, production: 4, upkeep: 2, net: 4 },
      { workers: 4, staffed: 0, production: 0, upkeep: 0, net: 4 },
      { workers: 4, staffed: 2, production: 4, upkeep: 2, net: 6 },
      { workers: 4, staffed: 4, production: 8, upkeep: 4, net: 8 },
    ]
    for (const row of rows) {
      const state = matrixFixture(row.workers, row.staffed)
      // Note: isEmployed resolves workplaceId against operational
      // workshops, so shared-workplace fixtures still count every
      // colonist as employed — exactly the fixture semantics.
      expect(commerceRevenueForTick(state)).toBe(row.production)
      expect(maintenanceDueForTick(state)).toBe(row.upkeep)
      expect(getMaintenanceDuePerTick(state)).toBe(row.upkeep)
      expect(getNetMoneyPerTick(state)).toBe(row.net)
    }
  })

  it('isolation A — workshop presence does not alter food trajectory', () => {
    // Twins differ ONLY by the Workshop; food stocks synced, then 10 ticks.
    let a = withFood(colony(1), 50)
    let b = withFood(noWorkshopTwin(), 50)
    for (let i = 0; i < 10; i++) {
      a = stepSimulation(a)
      b = stepSimulation(b)
      expect(getResourceStock(a).food).toBe(getResourceStock(b).food)
      expect(Object.keys(a.colonists).length).toBe(
        Object.keys(b.colonists).length
      )
    }
  })

  it('isolation B — starvation: food rules only, treasury nets zero', () => {
    const state = withFood(workshopOnlyState(), 0)
    const materialBefore = getResourceStock(state).money
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    // Step001: the vacant but connected Workshop still earns 2 commerce
    // against 2 maintenance (residence + workshop) — death tick nets zero,
    // so the stock is untouched by the starvation itself.
    expect(commerceRevenueForTick(after)).toBe(2)
    expect(maintenanceDueForTick(after)).toBe(2)
    expect(getResourceStock(after).money).toBe(materialBefore)
  })

  it('isolation C — empty treasury with healthy food: holds at zero, no pop penalty', () => {
    let state = withConstruction(colony(2), 0)
    const foodBefore = getResourceStock(state).food
    expect(foodBefore).toBeGreaterThan(0)
    const populationBefore = Object.keys(state.colonists).length
    state = stepSimulation(state)
    // Step001: colony(2) nets exactly 0, so the empty treasury holds at 0
    // (no recovery — poverty trap) while the fed population holds steady.
    expect(getResourceStock(state).money).toBe(0)
    expect(Object.keys(state.colonists).length).toBe(populationBefore)
    // Step 10E: 2 Workshop workers + 2 Farm workers = 4 colonists; two
    // staffed farms produce 4 while 4 colonists consume 4 -> net 0.
    expect(getFoodProductionPerTick(state)).toBe(4)
    expect(getFoodConsumptionPerTick(state)).toBe(4)
    expect(getResourceStock(state).food).toBe(foodBefore)
  })

  it('queries (§7) — upkeep/net match simulation arithmetic, stay derived', () => {
    const states = [
      createTestState(),
      colony(0),
      colony(1),
      colony(2),
      colony(4),
    ]
    for (const state of states) {
      expect(getMaintenanceDuePerTick(state)).toBe(
        maintenanceDueForTick(state)
      )
      // Step001: net money is revenue (taxes + commerce) minus upkeep —
      // per-capita taxes are part of the net, unlike the old production-
      // minus-upkeep identity.
      expect(getNetMoneyPerTick(state)).toBe(
        getRevenuePerTick(state) - maintenanceDueForTick(state)
      )
      // Pure: input hash untouched by querying or applying upkeep phases.
      const before = hashCanonicalState(state)
      getMaintenanceDuePerTick(state)
      getNetMoneyPerTick(state)
      expect(hashCanonicalState(state)).toBe(before)
    }
  })

  it('save/hash (§8) — SAVE_VERSION 9, round-trip stable, no upkeep fields', () => {
    expect(SAVE_VERSION).toBe(9)
    const state = stepSimulation(colony(2))
    const raw = serializeSave(state)
    expect(raw).not.toContain('upkeep')
    expect(raw).not.toContain('netMaterial')
    const restored = loadSave(raw)
    expect(restored).toEqual(state)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })
})
