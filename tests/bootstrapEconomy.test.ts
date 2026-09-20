/**
 * Bootstrap economy audit scenarios (Step 09I).
 *
 * AUDIT TOOLING — not gameplay, not a rebalance. These tests drive the
 * UNMODIFIED simulation through canonical early-game sequences and pin the
 * resulting resource trajectories exactly. Any future economic change breaks
 * loudly here first, which is the point: the tables below ARE the audit
 * evidence (gross/stored/upkeep per tick, Material/Food at every step).
 *
 * Nothing in this file is a runtime dependency: it imports the same public
 * simulation entry points as every other test.
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  BUILDING_CATALOG,
  consumeFood,
  countEmployedWorkers,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  foodProductionForTick,
  getBuildingRoadAccess,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  materialProductionForTick,
  materialStoredProductionForTick,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  materialUpkeepDueForTick,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  produceFood,
  produceMaterial,
  progressPlacedBuilding,
  progressPlacedRoads,
  ROAD_CONSTRUCTION_COST,
  ROAD_CONSTRUCTION_TICKS,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  upkeepBuildings,
  updateNeeds,
  updatePopulation,
  WORKSHOP_JOB_CAPACITY,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

const place = (
  buildingType: 'residence' | 'workshop' | 'farm',
  x: number,
  y: number
) => ({ type: 'placeBuilding' as const, x, y, buildingType })

const roads = (cells: readonly { readonly x: number; readonly y: number }[]) =>
  ({ type: 'placeRoads' as const, cells })

/** One audited trajectory row: post-tick canonical state + derived flows. */
interface TrajRow {
  readonly tick: number
  readonly material: number
  readonly food: number
  readonly population: number
  readonly employed: number
  /** Gross Material output the state would produce (09F-gated). */
  readonly gross: number
  /** Stored output after the 08F clamp. */
  readonly stored: number
  /** Upkeep due. */
  readonly upkeep: number
}

const row = (state: SimulationState): TrajRow => ({
  tick: state.time.tick,
  material: state.resources.construction,
  food: state.resources.food,
  population: Object.keys(state.colonists).length,
  employed: countEmployedWorkers(state),
  gross: materialProductionForTick(state),
  stored: materialStoredProductionForTick(state),
  upkeep: materialUpkeepDueForTick(state),
})

const slim = (state: SimulationState): TrajRow => row(state)

describe('canonical rules from source (Step 09I §3/§8)', () => {
  it('A0 — starting stock, catalog, rates and road constants are unchanged', () => {
    expect(INITIAL_CONSTRUCTION_MATERIAL).toBe(100)
    expect(INITIAL_FOOD).toBe(100)
    expect(BUILDING_CATALOG.residence).toEqual({
      constructionTicks: 2,
      housingCapacity: 1,
      constructionCost: 25,
    })
    expect(BUILDING_CATALOG.farm).toEqual({
      constructionTicks: 2,
      housingCapacity: 0,
      constructionCost: 25,
    })
    expect(BUILDING_CATALOG.workshop).toEqual({
      constructionTicks: 2,
      housingCapacity: 0,
      constructionCost: 25,
    })
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
    expect(WORKSHOP_JOB_CAPACITY).toBe(1)
    expect(ROAD_CONSTRUCTION_COST).toBe(5)
    expect(ROAD_CONSTRUCTION_TICKS).toBe(2)
  })
})

describe('scenario A — minimum viable settlement (Step 09I §5)', () => {
  it('A1 — first Residence admits the first colonist on tick 2', () => {
    // t0: canonical initial state.
    let state = createTestState()
    expect(slim(state)).toEqual({
      tick: 0, material: 100, food: 100, population: 0,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    // t1: Residence placed (25). No colonist yet: the building is placed at
    // phase 8a, AFTER this tick's admission phase.
    state = stepSimulation(state, place('residence', 2, 2))
    expect(slim(state)).toEqual({
      tick: 1, material: 75, food: 100, population: 0,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    expect(state.buildings['building-1']?.status).toBe('underConstruction')
    // t2: Residence operational; admission requires food > 0 after
    // consumption (100 > 0 holds with zero consumers).
    state = stepSimulation(state)
    expect(slim(state)).toEqual({
      tick: 2, material: 75, food: 100, population: 1,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    expect(state.buildings['building-1']?.status).toBe('operational')
    // Capacity result: 25 spent, 75 remain, 1 housed colonist, food untouched.
  })
})

describe('scenario B — Workshop without road (Step 09I §5, 09K-gated)', () => {
  /** Scenario A end state (t2), then Workshop, then 6 roadless ticks. */
  const runB = (): SimulationState[] => {
    const states: SimulationState[] = []
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    states.push(state)
    for (let i = 0; i < 6; i += 1) {
      state = stepSimulation(state) // t4..t9
      states.push(state)
    }
    return states
  }

  it('B1 — roadless Workshop: no worker, zero production, zero upkeep (09K)', () => {
    const [t3, t4, t5, t6, t7, t8, t9] = runB()
    // t3: Workshop placed (25). First food consumption (1 colonist).
    expect(slim(t3!)).toEqual({
      tick: 3, material: 50, food: 99, population: 1,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    // t4: Workshop operational but not mobility-connected to the residence.
    // Under 09K the colonist is never employed, so production AND upkeep are
    // both 0 — no worker means no staffed Workshop (the old 09F
    // "staffed roadless sink" no longer exists).
    expect(slim(t4!)).toEqual({
      tick: 4, material: 50, food: 98, population: 1,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    expect(t4!.buildings['building-2']?.status).toBe('operational')
    expect(getBuildingRoadAccess(t4!, 'building-2').hasRoadAccess).toBe(false)
    // t5..t9: stock frozen (no production, no upkeep); food drains 1/tick.
    expect([t5!, t6!, t7!, t8!, t9!].map(slim)).toEqual([
      { tick: 5, material: 50, food: 97, population: 1, employed: 0, gross: 0, stored: 0, upkeep: 0 },
      { tick: 6, material: 50, food: 96, population: 1, employed: 0, gross: 0, stored: 0, upkeep: 0 },
      { tick: 7, material: 50, food: 95, population: 1, employed: 0, gross: 0, stored: 0, upkeep: 0 },
      { tick: 8, material: 50, food: 94, population: 1, employed: 0, gross: 0, stored: 0, upkeep: 0 },
      { tick: 9, material: 50, food: 93, population: 1, employed: 0, gross: 0, stored: 0, upkeep: 0 },
    ])
  })
})

describe('scenario C — minimum road-served Workshop (Step 09I §5)', () => {
  /** Scenario A (t2) → Workshop (t3) → 3-cell path (t4) → complete (t5).
   *  Under 09K a single adjacent road no longer suffices: the residence must
   *  share the workshop's network, so the path (3,2),(4,2),(4,3) links
   *  residence (2,2) to workshop (4,4). */
  const runC = (): SimulationState[] => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    const t3 = stepSimulation(state, place('workshop', 4, 4)) // t3
    const t4 = stepSimulation(t3, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4
    const t5 = stepSimulation(t4) // t5: roads operational
    return [t3, t4, t5]
  }

  it('C1 — exact Material trajectory to first resumed production', () => {
    const [t3, t4, t5] = runC()
    expect(slim(t3!)).toEqual({
      tick: 3, material: 50, food: 99, population: 1,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    // t4: Workshop operational; the 3-cell path costs 15 and is still under
    // construction, so no access, no employment, no production, no upkeep.
    expect(slim(t4!)).toEqual({
      tick: 4, material: 35, food: 98, population: 1,
      employed: 0, gross: 0, stored: 0, upkeep: 0,
    })
    expect(t4!.roads['road-1']?.status).toBe('underConstruction')
    expect(getBuildingRoadAccess(t4!, 'building-2').hasRoadAccess).toBe(false)
    // t5: roads operational → mobility connects → employed → gross production
    // resumes (2), but the 08F clamp discards it (stock 35 ≥ capacity 25).
    // Upkeep drains to 34.
    expect(slim(t5!)).toEqual({
      tick: 5, material: 34, food: 97, population: 1,
      employed: 1, gross: 2, stored: 0, upkeep: 1,
    })
    expect(t5!.roads['road-1']?.status).toBe('operational')
    expect(getBuildingRoadAccess(t5!, 'building-2').hasRoadAccess).toBe(true)
    // First resumed-production tick is tick 5; total bootstrap spend is
    // 25 + 25 + 15 = 65, from the 100 starting stock (no upkeep before t5).
  })
})

describe('scenario D — sustained one-Workshop economy (Step 09I §7)', () => {
  const runD = (): SimulationState[] => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = stepSimulation(state, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4
    const states: SimulationState[] = []
    for (let i = 0; i < 26; i += 1) {
      state = stepSimulation(state) // t5..t30
      states.push(state)
    }
    return states
  }

  it('D1 — stock drains to the 08F equilibrium and fixes at 24, net zero', () => {
    const states = runD()
    const at = (tick: number): SimulationState => states[tick - 5]!
    // Above capacity: stored 0, upkeep drains exactly 1/tick from the t5
    // post-road stock (34) until the 24 equilibrium is reached at t15.
    expect(at(10).resources.construction).toBe(29)
    expect(at(20).resources.construction).toBe(24)
    // The 24 fixed point: stored 1, upkeep 1, net 0 — forever.
    expect(slim(at(24))).toEqual({
      tick: 24, material: 24, food: 78, population: 1,
      employed: 1, gross: 2, stored: 1, upkeep: 1,
    })
    expect(slim(at(30))).toEqual({
      tick: 30, material: 24, food: 72, population: 1,
      employed: 1, gross: 2, stored: 1, upkeep: 1,
    })
    // Steady state: gross 2/tick, upkeep 1/tick, stored 1/tick, net 0.
  })
})

describe('scenario E — first expansion (Step 09I §5)', () => {
  /** Scenario C end (t5): material 43, food 97, road-served Workshop. */
  const scenarioCEnd = (): SimulationState => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = stepSimulation(state, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4
    return stepSimulation(state) // t5
  }

  it('E1 — Farm bought from transient stock recovers to the same equilibrium', () => {
    let state = scenarioCEnd()
    // t6: Farm affordable (34 ≥ 25): 34 − 25 − 1 upkeep = 8. Under 09K the
    // road path costs 15 (not 5), so the transient stock is lower.
    state = stepSimulation(state, place('farm', 0, 0))
    expect(slim(state)).toEqual({
      tick: 6, material: 8, food: 96, population: 1,
      employed: 1, gross: 2, stored: 2, upkeep: 1,
    })
    // t7: Farm operational: food +2 −1; Material stock 8 → stored 2.
    state = stepSimulation(state)
    expect(slim(state)).toEqual({
      tick: 7, material: 9, food: 97, population: 1,
      employed: 1, gross: 2, stored: 2, upkeep: 1,
    })
    // Recovery continues +1 Material and +1 Food per tick until Material
    // fixes at 24 again while Food (uncapped) keeps accumulating.
    for (let i = 0; i < 16; i += 1) {
      state = stepSimulation(state) // t8..t23
    }
    expect(slim(state)).toEqual({
      tick: 23, material: 24, food: 113, population: 1,
      employed: 1, gross: 2, stored: 1, upkeep: 1,
    })
  })

  it('E2 — equilibrium finances construction through same-tick stored inflow', () => {
    // Scenario D end: material fixed at 24, cheapest building costs 25.
    let state = scenarioCEnd()
    for (let i = 0; i < 25; i += 1) {
      state = stepSimulation(state) // t6..t30 → equilibrium
    }
    expect(state.resources.construction).toBe(24)
    // The bare validator on the post-tick stock rejects (24 < 25)...
    const attempt = applyCommand(state, place('farm', 0, 0))
    expect(attempt.accepted).toBe(false)
    expect(attempt.reason).toBe('insufficientResources')
    expect(attempt.state).toBe(state)
    // ...but the real tick adds this tick's stored inflow BEFORE the
    // construction transaction (phase 8a runs after produceMaterial):
    // 24 + 1 stored = 25, exactly one building.
    const after = stepSimulation(state, place('farm', 0, 0))
    expect(Object.keys(after.buildings)).toEqual([
      'building-1',
      'building-2',
      'building-3',
    ])
    // 25 spent; the upkeep shortfall is absorbed without debt (08C partial
    // payment clamps to the empty stock).
    expect(after.resources.construction).toBe(0)
    expect(after.resources.food).toBe(71)
    // Recovery accumulates +1/tick from 0 back toward 24: one 25-cost
    // building per ~25 ticks sustained from equilibrium. No savings trap.
    let recovered = after
    for (let i = 0; i < 10; i += 1) {
      recovered = stepSimulation(recovered)
    }
    expect(recovered.resources.construction).toBe(10)
  })

  it('E3 — a second (vacant) Workshop raises capacity and accumulation resumes', () => {
    let state = scenarioCEnd()
    // t6: second Workshop bought from transient stock (34 ≥ 25).
    state = stepSimulation(state, place('workshop', 4, 5))
    expect(slim(state).material).toBe(8)
    // t7: second Workshop operational but vacant — storage counts it anyway
    // (capacity 50), upkeep stays 1 (only the staffed Workshop pays).
    state = stepSimulation(state)
    expect(slim(state)).toEqual({
      tick: 7, material: 9, food: 95, population: 1,
      employed: 1, gross: 2, stored: 2, upkeep: 1,
    })
    expect(countEmployedWorkers(state)).toBe(1)
    // Accumulation passes THROUGH the old 24 ceiling toward the new one (49).
    for (let i = 0; i < 7; i += 1) {
      state = stepSimulation(state) // t8..t14
    }
    expect(slim(state)).toEqual({
      tick: 14, material: 16, food: 88, population: 1,
      employed: 1, gross: 2, stored: 2, upkeep: 1,
    })
    for (let i = 0; i < 6; i += 1) {
      state = stepSimulation(state) // t15..t20
    }
    expect(state.resources.construction).toBe(22)
  })
})

describe('food interaction (Step 09I §10)', () => {
  it('F1 — first consumption, runway, and no Farm requirement before production', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    // No colonist yet: nothing consumed.
    expect(state.resources.food).toBe(100)
    state = stepSimulation(state) // t2: colonist admitted after a 0-need tick
    expect(state.resources.food).toBe(100)
    state = stepSimulation(state, place('workshop', 4, 4)) // t3: first meal
    expect(state.resources.food).toBe(99)
    state = stepSimulation(state, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4
    state = stepSimulation(state) // t5: production resumes with NO farm
    expect(state.resources.food).toBe(97)
    expect(materialProductionForTick(state)).toBe(2)
    // ~97 ticks of Food runway remain: Food is not the bootstrap bottleneck.
  })
})

describe('roadless Workshop as a sink (Step 09I §11)', () => {
  it('G1 — a roadless Workshop is vacant under 09K: no production, no upkeep', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = stepSimulation(state) // t4: operational but not mobility-connected
    const start = state.resources.construction
    for (let i = 0; i < 5; i += 1) {
      state = stepSimulation(state)
      // 09K: no mobility connection → no worker → no staffed Workshop.
      // production = 0, upkeep = 0, net Material = 0: stock frozen.
      expect(materialProductionForTick(state)).toBe(0)
      expect(materialUpkeepDueForTick(state)).toBe(0)
      expect(state.resources.construction).toBe(start)
    }
    // This is the key 09K economy change: the old 09F "staffed roadless sink"
    // (1 Material/tick drain for no output) no longer exists. A roadless
    // Workshop is now simply idle — it costs nothing and produces nothing
    // until the player connects the residence to it.
  })
})

describe('correctness invariants over a mixed run (Step 09I §14)', () => {
  it('H1 — phase-by-phase replay: every flow applied exactly once per tick', () => {
    let state = createTestState()
    const script = [
      place('residence', 2, 2), // t1
      undefined, // t2
      place('workshop', 4, 4), // t3
      roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }]), // t4
      undefined, // t5
      place('farm', 0, 0), // t6
      undefined, // t7
      roads([{ x: 4, y: 5 }, { x: 5, y: 5 }]), // t8
    ] as const
    let minMaterial = Number.POSITIVE_INFINITY
    let minFood = Number.POSITIVE_INFINITY
    for (const command of script) {
      const before = state
      // Exact-once replay: re-execute the tick phase by phase through the
      // same exported functions stepSimulation composes, asserting every
      // intermediate resource delta. Any double deduction, skipped flow, or
      // ordering change breaks loudly here.
      const t1 = advanceConstruction(before)
      expect(t1.resources).toEqual(before.resources)
      const need = updateNeeds(t1)
      expect(need).toBe(Object.keys(t1.colonists).length)
      const t2 = produceFood(t1)
      expect(t2.resources.construction).toBe(t1.resources.construction)
      const consumed = consumeFood(t2, need)
      expect(consumed.fed).toBe(true) // no starvation anywhere in bootstrap
      const t3 = consumed.state
      expect(t3.resources.food).toBe(
        t1.resources.food + foodProductionForTick(t1) - need,
      )
      const t4 = updatePopulation(t3, consumed.fed)
      expect(t4.resources).toEqual(t3.resources)
      const t5 = assignJobs(t4)
      expect(t5.resources).toEqual(t4.resources)
      const t6 = produceMaterial(t5)
      expect(t6.resources.construction - t5.resources.construction).toBe(
        materialStoredProductionForTick(t5),
      )
      const t7 = applyCommand(t6, command)
      // A missing command is an explicit no-op (no transaction), never a
      // rejection; every scripted command is valid and affordable.
      if (command === undefined) {
        expect(t7.accepted).toBe(false)
        expect(t7.reason).toBeNull()
        expect(t7.state).toBe(t6)
      } else {
        expect(t7.accepted).toBe(true)
      }
      const paid = t6.resources.construction - t7.state.resources.construction
      const expectedCost =
        command === undefined
          ? 0
          : command.type === 'placeRoads'
            ? command.cells.length * ROAD_CONSTRUCTION_COST
            : 25
      expect(paid).toBe(expectedCost)
      const t8a = progressPlacedBuilding(t7)
      const t8 = progressPlacedRoads(t8a, t7)
      expect(t8.resources).toEqual(t7.state.resources)
      const due = materialUpkeepDueForTick(t8)
      const t9 = upkeepBuildings(t8)
      expect(t8.resources.construction - t9.resources.construction).toBe(
        Math.min(t8.resources.construction, due),
      )
      const t10 = advanceTime(t9)
      // The replay IS the real path: identical canonical state.
      expect(serializeCanonicalState(t10)).toBe(
        serializeCanonicalState(stepSimulation(before, command)),
      )
      state = stepSimulation(before, command)
      minMaterial = Math.min(minMaterial, state.resources.construction)
      minFood = Math.min(minFood, state.resources.food)
    }
    expect(minMaterial).toBeGreaterThanOrEqual(0)
    expect(minFood).toBeGreaterThanOrEqual(0)
  })
})

describe('determinism of bootstrap scenarios (Step 09I §15)', () => {
  /** Scenario C extended: road-served Workshop, then 10 sustained ticks. */
  const runBootstrap = (): { trajectory: TrajRow[]; hash: string } => {
    let state = createTestState()
    const trajectory: TrajRow[] = [slim(state)]
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    trajectory.push(slim(state))
    state = stepSimulation(state) // t2
    trajectory.push(slim(state))
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    trajectory.push(slim(state))
    state = stepSimulation(state, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4
    trajectory.push(slim(state))
    for (let i = 0; i < 11; i += 1) {
      state = stepSimulation(state) // t5..t15
      trajectory.push(slim(state))
    }
    return { trajectory, hash: hashCanonicalState(state) }
  }

  it('I1 — same initial state + same commands = same trajectory + same hash', () => {
    const first = runBootstrap()
    const second = runBootstrap()
    expect(second.trajectory).toEqual(first.trajectory)
    expect(second.hash).toBe(first.hash)
    // The trajectory is 16 deterministic rows, t0..t15, reproducible.
    expect(first.trajectory.length).toBe(16)
    expect(first.trajectory[15]).toEqual({
      tick: 15, material: 24, food: 87, population: 1,
      employed: 1, gross: 2, stored: 1, upkeep: 1,
    })
  })
})

describe('persistence of bootstrap states (Step 09I §16)', () => {
  it('J1 — save/load mid-bootstrap continues identically', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = stepSimulation(state, roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])) // t4: road under construction
    // Save/load at the most fragile point: transient construction states.
    const loaded = loadSave(serializeSave(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(SAVE_VERSION).toBe(4)
    // Continue both 5 ticks: identical futures.
    let direct = state
    let resumed = loaded
    for (let i = 0; i < 5; i += 1) {
      direct = stepSimulation(direct)
      resumed = stepSimulation(resumed)
    }
    expect(hashCanonicalState(resumed)).toBe(hashCanonicalState(direct))
    expect(slim(resumed)).toEqual(slim(direct))
    expect(resumed.resources.construction).toBe(30)
  })
})
