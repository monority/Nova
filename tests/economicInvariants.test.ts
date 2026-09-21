import { describe, expect, it } from 'vitest'

import {
  BUILDING_CATALOG,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getResourceStock,
  hashCanonicalState,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  materialProductionForTick,
  materialUpkeepDueForTick,
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
  construction: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
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
    resources: { ...base.resources, construction: 100, food: 100 },
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
        expect(getResourceStock(state).construction).toBeGreaterThanOrEqual(0)
        expect(getResourceStock(state).food).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('INV-02 — upkeep never exceeds production (staffed <= workers)', () => {
    for (const n of [0, 1, 2, 4]) {
      const state = colony(n)
      const summary = getEmploymentSummary(state)
      expect(countStaffedOperationalWorkshops(state)).toBeLessThanOrEqual(
        summary.employed
      )
      expect(materialUpkeepDueForTick(state)).toBeLessThanOrEqual(
        materialProductionForTick(state)
      )
      expect(getNetMaterialPerTick(state)).toBeGreaterThanOrEqual(0)
    }
  })

  it('INV-03 — vacant operational Workshop pays 0', () => {
    let state = createTestState()
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational, nobody housed
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getEmploymentSummary(state).employed).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    expect(getMaterialUpkeepPerTick(state)).toBe(0)
  })

  it('INV-04 — under-construction Workshop pays 0', () => {
    const constructing = stepSimulation(withWorkshopWater(createTestState()), place('workshop', 1, 1)
    )
    expect(constructing.buildings['building-1']?.status).toBe(
      'underConstruction'
    )
    expect(materialUpkeepDueForTick(constructing)).toBe(0)
    expect(getMaterialUpkeepPerTick(constructing)).toBe(0)
  })

  it('INV-05 — Residence and Farm never contribute to upkeep', () => {
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
    expect(materialUpkeepDueForTick(state)).toBe(0)
    expect(getMaterialUpkeepPerTick(state)).toBe(0)
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

  it('INV-07 — production scales linearly (1=>2, 2=>4, 4=>8)', () => {
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
    expect(materialProductionForTick(colony(1))).toBe(2)
    expect(materialProductionForTick(colony(2))).toBe(4)
    expect(materialProductionForTick(colony(4))).toBe(8)
  })

  it('INV-08 — upkeep scales linearly (1=>1, 2=>2, 4=>4)', () => {
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
    expect(materialUpkeepDueForTick(colony(1))).toBe(1)
    expect(materialUpkeepDueForTick(colony(2))).toBe(2)
    expect(materialUpkeepDueForTick(colony(4))).toBe(4)
  })

  it('INV-09 — net material scales linearly (1=>+1, 2=>+2, 4=>+4)', () => {
    for (const n of [1, 2, 4]) {
      expect(getNetMaterialPerTick(colony(n))).toBe(n)
      const state = colony(n)
      const before = getResourceStock(state).construction
      const after = stepSimulation(state)
      expect(getResourceStock(after).construction).toBe(before + n)
    }
  })

  it('INV-10 — zero workers: production 0, upkeep 0, stock frozen', () => {
    let state = createTestState()
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // t2: operational, vacant
    expect(getMaterialProductionPerTick(state)).toBe(0)
    expect(getMaterialUpkeepPerTick(state)).toBe(0)
    expect(getNetMaterialPerTick(state)).toBe(0)
    const before = getResourceStock(state).construction
    for (let i = 0; i < 5; i++) {
      state = stepSimulation(state)
    }
    expect(getResourceStock(state).construction).toBe(before)
  })

  it('INV-11 — recovery: empty stock with workers turns positive', () => {
    let state = withConstruction(colony(1), 0)
    expect(getFoodProductionPerTick(state)).toBeGreaterThanOrEqual(
      getFoodConsumptionPerTick(state)
    )
    const populationBefore = Object.keys(state.colonists).length
    state = stepSimulation(state)
    expect(getResourceStock(state).construction).toBe(1)
    expect(Object.keys(state.colonists).length).toBe(populationBefore)
  })

  it('INV-12 — construction costs unchanged (25/25/25)', () => {
    expect(BUILDING_CATALOG.residence.constructionCost).toBe(25)
    expect(BUILDING_CATALOG.farm.constructionCost).toBe(25)
    expect(BUILDING_CATALOG.workshop.constructionCost).toBe(25)
  })

  it('INV-13 — construction creates no hidden upkeep before operational', () => {
    let state = createTestState()
    const before = getResourceStock(state).construction
    state = stepSimulation(withWorkshopWater(state), place('workshop', 1, 1)) // t1
    // Only the build cost left the stock; no upkeep on the placement tick.
    expect(getResourceStock(state).construction).toBe(before - 25)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    state = stepSimulation(state) // t2: operational, vacant
    expect(materialUpkeepDueForTick(state)).toBe(0)
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

  it('phase order — produceMaterial -> upkeepBuildings -> advanceTime', () => {
    // From an empty stock, production (+2) must refill BEFORE upkeep (−1)
    // in the same tick: result 1 proves the order (upkeep-first would
    // pay 0 then produce, leaving 2).
    const empty = withConstruction(colony(1), 0)
    const tickBefore = empty.time.tick
    const after = stepSimulation(empty)
    expect(getResourceStock(after).construction).toBe(1)
    expect(after.time.tick).toBe(tickBefore + 1)
    // A newcomer admitted this tick is assigned and nets production minus
    // upkeep in the same tick: assignJobs -> produceMaterial -> upkeep.
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1 admitted
    const stockBefore = getResourceStock(state).construction
    state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state) // operational + staffed; stored 0, upkeep −1
    expect(getResourceStock(state).construction).toBe(stockBefore - 25 - 1)
  })

  it('balance matrix (§5) — production / upkeep / net per fixture row', () => {
    const rows: Array<{
      workers: number
      staffed: number
      production: number
      upkeep: number
      net: number
    }> = [
      { workers: 0, staffed: 0, production: 0, upkeep: 0, net: 0 },
      { workers: 1, staffed: 0, production: 0, upkeep: 0, net: 0 },
      { workers: 1, staffed: 1, production: 2, upkeep: 1, net: 1 },
      { workers: 2, staffed: 0, production: 0, upkeep: 0, net: 0 },
      { workers: 2, staffed: 1, production: 4, upkeep: 1, net: 3 },
      { workers: 2, staffed: 2, production: 4, upkeep: 2, net: 2 },
      { workers: 4, staffed: 0, production: 0, upkeep: 0, net: 0 },
      { workers: 4, staffed: 2, production: 8, upkeep: 2, net: 6 },
      { workers: 4, staffed: 4, production: 8, upkeep: 4, net: 4 },
    ]
    for (const row of rows) {
      const state = matrixFixture(row.workers, row.staffed)
      // Note: isEmployed resolves workplaceId against operational
      // workshops, so shared-workplace fixtures still count every
      // colonist as employed — exactly the fixture semantics.
      expect(materialProductionForTick(state)).toBe(row.production)
      expect(materialUpkeepDueForTick(state)).toBe(row.upkeep)
      expect(getMaterialUpkeepPerTick(state)).toBe(row.upkeep)
      expect(getNetMaterialPerTick(state)).toBe(row.net)
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

  it('isolation B — starvation: food rules only, no material penalty', () => {
    const state = withFood(workshopOnlyState(), 0)
    const materialBefore = getResourceStock(state).construction
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(materialProductionForTick(after)).toBe(0)
    expect(materialUpkeepDueForTick(after)).toBe(0)
    // Death tick: no production, no upkeep — stock untouched.
    expect(getResourceStock(after).construction).toBe(materialBefore)
  })

  it('isolation C — empty material with healthy food: recovery, no pop penalty', () => {
    let state = withConstruction(colony(2), 0)
    const foodBefore = getResourceStock(state).food
    expect(foodBefore).toBeGreaterThan(0)
    const populationBefore = Object.keys(state.colonists).length
    state = stepSimulation(state)
    // Workers kept producing through the empty stock: net +2 recovered.
    expect(getResourceStock(state).construction).toBe(2)
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
      expect(getMaterialUpkeepPerTick(state)).toBe(
        materialUpkeepDueForTick(state)
      )
      expect(getNetMaterialPerTick(state)).toBe(
        materialProductionForTick(state) - materialUpkeepDueForTick(state)
      )
      // Pure: input hash untouched by querying or applying upkeep phases.
      const before = hashCanonicalState(state)
      getMaterialUpkeepPerTick(state)
      getNetMaterialPerTick(state)
      expect(hashCanonicalState(state)).toBe(before)
    }
  })

  it('save/hash (§8) — SAVE_VERSION 4, round-trip stable, no upkeep fields', () => {
    expect(SAVE_VERSION).toBe(7)
    const state = stepSimulation(colony(2))
    const raw = serializeSave(state)
    expect(raw).not.toContain('upkeep')
    expect(raw).not.toContain('netMaterial')
    const restored = loadSave(raw)
    expect(restored).toEqual(state)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })
})
