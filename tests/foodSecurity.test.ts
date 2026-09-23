/**
 * Food security contract tests (Step 10A, executed per docs/roadmap/Step10B.md).
 *
 * Formalizes NOVA's first explicit population need as a verified causal chain:
 *
 *   population -> food need -> food stock -> food consumption
 *     -> satisfied / shortage -> existing population consequence
 *
 * The design (docs/roadmap/Step10A.md, corrected by Step10A-1) established that
 * the existing 05B/06B implementation already conforms to the contract, so this
 * suite modifies NO production rule. It does three things:
 *
 *   1. CONTRACT — pins the exact numeric rules (need, production, consumption
 *      bound, shortage, famine consequence, admission gating) as tests;
 *   2. TRANSPORT ANTI-COUPLING — proves Food behavior is identical with/without
 *      roads, for farms, residences and arbitrary topologies (Step10A-1 §A-E),
 *      so no transport/logistics coupling can creep in silently;
 *   3. DETERMINISM — same commands and replays produce identical states/hashes;
 *      derived observations never touch canonical state.
 *
 * Deliberately absent (Step10A §Implementation): food logistics, road-gated
 * farms/residences, distance-based food, any generic Need framework, any second
 * starvation mechanism, any new persisted state.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  consumeFood,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  foodProductionForTick,
  getPopulationCount,
  hashCanonicalState,
  INITIAL_FOOD,
  loadSave,
  produceFood,
  serializeCanonicalState,
  serializeSave,
  SAVE_VERSION,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const operationalBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('test helper: building missing after createBuilding')
  }
  return {
    id: created.buildingId,
    state: {
      ...created.state,
      buildings: {
        ...created.state.buildings,
        [created.buildingId]: {
          ...building,
          status: 'operational',
          constructionRemaining: 0,
        },
      },
    },
  }
}

const road = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) {
    throw new Error('test helper: no road created')
  }
  const createdRoad = created.state.roads[id]
  if (createdRoad === undefined) {
    throw new Error('test helper: road missing after createRoads')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: {
        ...createdRoad,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

const roads = (
  state: SimulationState,
  cells: readonly { readonly x: number; readonly y: number }[]
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = road(next, cell.x, cell.y)
  }
  return next
}

const withColonist = (
  state: SimulationState,
  residenceId: string
): { state: SimulationState; id: string } => {
  const created = createColonist(state, residenceId)
  return { id: created.colonistId, state: created.state }
}

/** Residence + one colonist, both operational/live, roads optional. */
const housedColonist = (options?: {
  readonly food?: number
  readonly roadCells?: readonly { readonly x: number; readonly y: number }[]
}): { state: SimulationState; residenceId: string; colonistId: string } => {
  let state = createTestState()
  if (options?.food !== undefined) {
    state = { ...state, resources: { ...state.resources, food: options.food } }
  }
  const residence = operationalBuilding(state, 'residence', 1, 1)
  state = residence.state
  const colonist = withColonist(state, residence.id)
  state = colonist.state
  if (options?.roadCells !== undefined) {
    state = roads(state, options.roadCells)
  }
  return { state, residenceId: residence.id, colonistId: colonist.id }
}

const runFullChain = (state: SimulationState): SimulationState =>
  stepSimulation(state)

// ---------------------------------------------------------------------------
// 1. Contract tests (Step10B.md §6 items 1-12)
// ---------------------------------------------------------------------------

describe('contract — food need', () => {
  it('1-2 — food need = population x 1; zero population = zero need', () => {
    const empty = createTestState()
    expect(updateNeeds(empty)).toBe(0)
    expect(getPopulationCount(empty)).toBe(0)

    const one = housedColonist().state
    expect(getPopulationCount(one)).toBe(1)
    expect(updateNeeds(one)).toBe(1 * FOOD_PER_COLONIST_PER_TICK)

    // Four colonists (two residences) -> need 4.
    let four = createTestState()
    const r1 = operationalBuilding(four, 'residence', 1, 1)
    four = r1.state
    const r2 = operationalBuilding(four, 'residence', 5, 5)
    four = r2.state
    const c1 = withColonist(four, r1.id)
    four = c1.state
    const c2 = withColonist(four, r1.id)
    four = c2.state
    const c3 = withColonist(four, r2.id)
    four = c3.state
    const c4 = withColonist(four, r2.id)
    four = c4.state
    expect(updateNeeds(four)).toBe(4)
  })
})

/** Residence + colonist + farm sharing one road contact, worker assigned. */
const staffedFarmFixture = (): {
  state: SimulationState
  residenceId: string
  farmId: string
  colonistId: string
} => {
  let state = createTestState()
  const residence = operationalBuilding(state, 'residence', 1, 1)
  state = residence.state
  const colonist = withColonist(state, residence.id)
  state = colonist.state
  const farm = operationalBuilding(state, 'farm', 1, 3)
  state = farm.state
  state = roads(state, [{ x: 1, y: 2 }]) // shared contact: distance 0
  state = assignJobs(state)
  return {
    state,
    residenceId: residence.id,
    farmId: farm.id,
    colonistId: colonist.id,
  }
}

describe('contract — food production', () => {
  it('3 — production = staffed farms x 2; vacant farms produce 0 (Step 10E)', () => {
    let state = createTestState()
    expect(foodProductionForTick(state)).toBe(0)
    const f1 = operationalBuilding(state, 'farm', 2, 2)
    state = f1.state
    // Vacant farm: operational but 0 production.
    expect(foodProductionForTick(state)).toBe(0)
    // Staffed farm: 2 per tick.
    const staffed = staffedFarmFixture()
    expect(foodProductionForTick(staffed.state)).toBe(FOOD_PER_FARM_PER_TICK)
    expect(countWorkersAt(staffed.state, staffed.farmId)).toBe(1)
    // Under-construction farms produce nothing.
    const pending = createBuilding(state, 'farm', 1, 6, 2)
    state = pending.state
    expect(foodProductionForTick(state)).toBe(0)
  })

  it('4 — farm road access alone never produces; only staffing does (Step 10E)', () => {
    // Same farm, roadless vs roaded, both vacant: identical 0 production.
    // (Step 10E: the farm gate is worker eligibility, never road access.)
    const roadless = operationalBuilding(
      createTestState(),
      'farm',
      2,
      2
    ).state
    const roaded = roads(
      operationalBuilding(createTestState(), 'farm', 2, 2).state,
      [{ x: 3, y: 2 }]
    )
    expect(foodProductionForTick(roadless)).toBe(0)
    expect(foodProductionForTick(roaded)).toBe(0)
    expect(produceFood(roadless).resources.food).toBe(
      produceFood(roaded).resources.food
    )
  })
})

describe('contract — consumption bounds', () => {
  it('5-6 — consumption bounded by stock; stock never negative', () => {
    const need = 4
    const stockBefore = 3
    const state = housedColonist({ food: stockBefore }).state
    const result = consumeFood(state, need)
    expect(result.fed).toBe(false)
    expect(result.state.resources.food).toBe(0)
    expect(result.state.resources.food).toBeGreaterThanOrEqual(0)
    // foodConsumed = min(stockBefore, need) = stockBefore = 3; shortage = 1.
    const consumed = stockBefore - result.state.resources.food
    expect(consumed).toBe(Math.min(stockBefore, need))
    expect(need - consumed).toBeGreaterThan(0)
  })

  it('7 — full stock satisfies the need exactly', () => {
    const need = 2
    const state = housedColonist({ food: 10 }).state
    // Two colonists -> need 2.
    const second = withColonist(state, 'building-1')
    const result = consumeFood(second.state, need)
    expect(result.fed).toBe(true)
    expect(result.state.resources.food).toBe(10 - need)
    const consumed = 10 - result.state.resources.food
    expect(consumed).toBe(Math.min(10, need))
    expect(need - consumed).toBe(0)
  })

  it('9 — zero stock produces a full shortage without going negative', () => {
    const state = housedColonist({ food: 0 }).state
    const result = consumeFood(state, 1)
    expect(result.fed).toBe(false)
    expect(result.state.resources.food).toBe(0)
  })

  it('zero need is vacuously fed and touches nothing', () => {
    const state = createTestState()
    const result = consumeFood(state, 0)
    expect(result.fed).toBe(true)
    expect(result.state).toBe(state)
  })
})

describe('contract — population consequence', () => {
  it('10 — shortage triggers the established famine: entire colony leaves', () => {
    // Full chain: 2 colonists, food 1 < need 2 -> famine this tick.
    let state = housedColonist({ food: 1 }).state
    const second = withColonist(state, 'building-1')
    state = second.state
    const after = runFullChain(state)
    expect(getPopulationCount(after)).toBe(0)
    expect(Object.keys(after.colonists)).toHaveLength(0)
  })

  it('11 — no second starvation mechanism: production failure alone does not kill', () => {
    // No farm at all, but stock covers the need: colonists survive.
    const state = housedColonist({ food: 5 }).state
    const after = runFullChain(state)
    expect(getPopulationCount(after)).toBe(1)
    expect(after.resources.food).toBe(4)
  })

  it('admission is food-gated: food 0 admits nobody, food > 0 admits', () => {
    // Free operational residence + food 0 -> no admission.
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const starved = updatePopulation({ ...state, resources: { ...state.resources, food: 0 } }, true)
    expect(getPopulationCount(starved)).toBe(0)
    const admitted = updatePopulation(state, true)
    expect(getPopulationCount(admitted)).toBe(1)
  })

  it('12 — food-derived observations never alter canonical state', () => {
    const staffed = staffedFarmFixture()
    const state = staffed.state
    const before = serializeCanonicalState(state)
    expect(updateNeeds(state)).toBe(1)
    expect(foodProductionForTick(state)).toBe(2)
    expect(serializeCanonicalState(state)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// 2. Transport anti-coupling tests (Step10B.md §3, Step10A-1 scenarios A-E)
// ---------------------------------------------------------------------------

describe('transport anti-coupling', () => {
  /** Same colony shape, roads vary. Food chain runs identically. */
  const colony = (variant: 'no-road' | 'straight' | 'loop') => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const farm = operationalBuilding(state, 'farm', 6, 1)
    state = farm.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    if (variant === 'straight') {
      state = roads(state, [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ])
    } else if (variant === 'loop') {
      state = roads(state, [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
      ])
    }
    return state
  }

  it('13 — A: farm without road cannot be staffed (production 0, need persists)', () => {
    // Step 10E: the farm gate is worker eligibility (mobility), never road
    // access. Without roads the colonist cannot reach the farm: vacant.
    const state = colony('no-road')
    expect(foodProductionForTick(state)).toBe(0)
    const after = runFullChain(state)
    // The colonist still has a need and eats from stock: need persists.
    expect(getPopulationCount(after)).toBe(1)
    expect(after.resources.food).toBe(INITIAL_FOOD - 1)
  })

  it('14 — B: the same farm with a road is staffed (production 2)', () => {
    // Straight roads connect residence (1,1) to farm (6,1): the colonist is
    // assigned during the tick and the staffed farm produces next phase.
    const connected = assignJobs(colony('straight'))
    expect(foodProductionForTick(connected)).toBe(2)
    const after = runFullChain(connected)
    expect(getPopulationCount(after)).toBe(1)
    expect(after.resources.food).toBe(INITIAL_FOOD + 2 - 1)
  })

  it('15-16 — C/D: residence with and without road has the identical food need and outcome', () => {
    // Residence + colonist, farm connected or not, roads near the residence
    // or not: the need is 1 and the tick is fed in every case.
    const isolated = housedColonist({ food: 10 }).state
    const isolatedAfter = runFullChain(isolated)
    expect(isolatedAfter.resources.food).toBe(10 - 1 + 0)
    expect(getPopulationCount(isolatedAfter)).toBe(1)

    const connected = housedColonist({ food: 10, roadCells: [{ x: 2, y: 1 }] })
      .state
    const connectedAfter = runFullChain(connected)
    expect(connectedAfter.resources.food).toBe(10 - 1 + 0)
    expect(getPopulationCount(connectedAfter)).toBe(1)
  })

  it('17-18 — E: different road topologies with identical food inputs give identical food outcomes', () => {
    const results = (['no-road', 'straight', 'loop'] as const).map((v) => {
      const after = runFullChain(colony(v))
      return {
        food: after.resources.food,
        population: getPopulationCount(after),
        buildings: Object.keys(after.buildings).length,
        serialized: serializeCanonicalState(after),
      }
    })
    // Food result identical across every topology (roads differ, food does not).
    for (const r of results) {
      expect(r.food).toBe(results[0]!.food)
      expect(r.population).toBe(results[0]!.population)
      expect(r.buildings).toBe(results[0]!.buildings)
    }
  })

  it('farm output is identical across staffed colonies (roads enable, never gate)', () => {
    // Two colonies, different road layouts, both staffing their farm:
    // identical +2 output. Roads enable staffing; they never gate the farm.
    const colonyA = (() => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      const farm = operationalBuilding(state, 'farm', 1, 3)
      state = farm.state
      return assignJobs(roads(state, [{ x: 1, y: 2 }]))
    })()
    const colonyB = (() => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 3, 3)
      state = residence.state
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      const farm = operationalBuilding(state, 'farm', 5, 3)
      state = farm.state
      return assignJobs(
        roads(state, [
          { x: 4, y: 3 },
          { x: 3, y: 2 },
        ])
      )
    })()
    expect(foodProductionForTick(colonyA)).toBe(2)
    expect(foodProductionForTick(colonyB)).toBe(2)
    expect(produceFood(colonyA).resources.food).toBe(
      produceFood(colonyB).resources.food
    )
    expect(produceFood(colonyA).resources.food).toBe(
      INITIAL_FOOD + FOOD_PER_FARM_PER_TICK
    )
  })
})

// ---------------------------------------------------------------------------
// 3. Tick ordering (Step10B.md §4)
// ---------------------------------------------------------------------------

describe('tick ordering', () => {
  it('staffed production happens before consumption: a staffed farm feeds this tick', () => {
    // Step 10E: the farm must already be staffed when produceFood runs
    // (assignment from a previous tick). Staffed farm: +2 then -1.
    let state = createTestState()
    state = { ...state, resources: { ...state.resources, food: 0 } }
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    const farm = operationalBuilding(state, 'farm', 1, 3)
    state = farm.state
    state = roads(state, [{ x: 1, y: 2 }])
    state = assignJobs(state) // staffed now
    const after = runFullChain(state)
    // produceFood ran before consumeFood: +2 then -1.
    expect(after.resources.food).toBe(1)
    expect(getPopulationCount(after)).toBe(1)
  })

  it('starvation runs before material production: a starving worker produces nothing', () => {
    let state = createTestState()
    state = { ...state, resources: { ...state.resources, food: 0 } }
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    const workshop = operationalBuilding(state, 'workshop', 5, 5)
    state = workshop.state
    state = roads(state, [{ x: 5, y: 4 }])
    const after = runFullChain(state)
    // Famine removed the colonist before produceMaterial; stock stays 0.
    expect(getPopulationCount(after)).toBe(0)
    expect(after.resources.construction).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 4. Determinism (Step10B.md §6 items 19-20) + persistence (§7)
// ---------------------------------------------------------------------------

describe('determinism and persistence', () => {
  const replayFixture = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const farm = operationalBuilding(state, 'farm', 5, 5)
    state = farm.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return state
  }

  it('19-20 — same commands, identical food result, identical hash; replay and save/load stable', () => {
    const a = runFullChain(runFullChain(replayFixture()))
    const b = runFullChain(runFullChain(replayFixture()))
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    // Save/load round-trip preserves the hash.
    const reloaded = loadSave(serializeSave(a))
    expect(hashCanonicalState(reloaded)).toBe(hashCanonicalState(a))
    // Nothing Food-derived is serialized.
    const serialized = serializeCanonicalState(a)
    expect(serialized).not.toContain('foodNeed')
    expect(serialized).not.toContain('foodShortage')
    expect(serialized).not.toContain('fed')
    // SAVE_VERSION unchanged.
    expect(SAVE_VERSION).toBe(8)
  })
})
