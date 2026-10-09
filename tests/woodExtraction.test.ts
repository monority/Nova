/**
 * Step003 — physical wood extraction: the anti-self-lock slice.
 *
 * Proves the audit's Wood invariant (docs/audits/
 * RESOURCE-ECONOMIC-SYSTEM-AUDIT-2026-10-08.md, D2/D4):
 * > Fundamental resources required for progression must always have at least
 * > one recovery path available with current capabilities.
 *
 * Blocks: normal extraction, empty deposit, unstaffed camp, Colony Center
 * fallback, no ex-nihilo generation, determinism, placement protection.
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  createBuilding,
  createColonist,
  createRoads,
  assignJobs,
  stepSimulation,
  advanceConstruction,
  produceWood,
  applyCommand,
  adjacentRemaining,
  hashCanonicalState,
  validatePlacement,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: {
    seed: 'nova-step003-wood',
    width: 12,
    height: 12,
    woodDeposits: [
      { x: 5, y: 2, remaining: 10 },
      { x: 9, y: 8, remaining: 4 },
    ],
  },
}

const fresh = (): SimulationState => createInitialState(config)

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('wood: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const staffedCamp = (): SimulationState => {
  let state = operational(fresh(), 'lumberCamp', 5, 3) // adjacent to the (5,2) deposit
  state = operational(state, 'residence', 5, 5)
  const residenceId = Object.values(state.buildings).find((b) => b.type === 'residence')!.id
  state = createColonist(state, residenceId).state
  // Operational road contact for camp staffing (09F: workplaces need road
  // access; under-construction roads connect nothing).
  const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
  const roads = { ...roadCreated.state.roads }
  for (const roadId of roadCreated.roadIds) {
    const road = roads[roadId]
    if (road !== undefined) {
      roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
    }
  }
  state = { ...roadCreated.state, roads }
  return assignJobs(state)
}

const emptyDepositConfig: SimulationConfig = {
  world: {
    seed: 'nova-step003-wood-empty',
    width: 12,
    height: 12,
    woodDeposits: [{ x: 5, y: 2, remaining: 0 }],
  },
}

describe('Step003 — wood extraction', () => {
  it('normal extraction: staffed camp adjacent to a deposit increases wood and drains the deposit', () => {
    const state = staffedCamp()
    const woodBefore = state.resources.wood
    const depositBefore = state.woodDeposits['5,2']!.remaining

    const after = produceWood(state)

    // Camp yield 2, deposit has 10: full extraction.
    expect(after.resources.wood).toBe(woodBefore + 2)
    expect(after.woodDeposits['5,2']!.remaining).toBe(depositBefore - 2)
    expect(state.woodDeposits['5,2']!.remaining).toBe(depositBefore) // pure
  })

  it('empty deposit: a staffed camp adjacent to an exhausted deposit extracts zero', () => {
    let state = createInitialState(emptyDepositConfig)
    state = operational(state, 'lumberCamp', 5, 3)
    state = operational(state, 'residence', 5, 5)
    const residenceId = Object.values(state.buildings).find((b) => b.type === 'residence')!.id
    state = createColonist(state, residenceId).state
    const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
    const roads = { ...roadCreated.state.roads }
    for (const roadId of roadCreated.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
      }
    }
    state = { ...roadCreated.state, roads }
    state = assignJobs(state)

    const after = produceWood(state)

    expect(state.woodDeposits['5,2']!.remaining).toBe(0)
    expect(after.resources.wood).toBe(state.resources.wood) // no extraction
    expect(after.woodDeposits['5,2']).toBeDefined() // exhausted, not removed
  })

  it('unstaffed camp: no worker, no extraction (commerce-style fallback does not exist)', () => {
    let state = operational(fresh(), 'lumberCamp', 5, 3) // staffable but nobody home
    state = operational(state, 'residence', 5, 5)
    state = createColonist(state, Object.values(state.buildings).find((b) => b.type === 'residence')!.id).state
    state = createRoads(state, [{ x: 5, y: 4 }]).state
    // Deliberately NOT staffing: remove the colonist's assignment eligibility
    // by unassigning via a state clone (no camp job taken).
    const unstaffed: SimulationState = {
      ...state,
      colonists: Object.fromEntries(
        Object.entries(state.colonists).map(([id, c]) => [id, { ...c, workplaceId: null }])
      ),
    }

    const after = produceWood(unstaffed)

    expect(after.resources.wood).toBe(unstaffed.resources.wood)
    expect(after.woodDeposits['5,2']!.remaining).toBe(10)
  })

  it('extraction never exceeds the remaining deposit (partial drain at the tail)', () => {
    const lowConfig: SimulationConfig = {
      world: {
        seed: 'nova-step003-wood-low',
        width: 12,
        height: 12,
        woodDeposits: [{ x: 5, y: 2, remaining: 1 }],
      },
    }
    let state = createInitialState(lowConfig)
    state = operational(state, 'lumberCamp', 5, 3)
    state = operational(state, 'residence', 5, 5)
    state = createColonist(state, Object.values(state.buildings).find((b) => b.type === 'residence')!.id).state
    const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
    const roads = { ...roadCreated.state.roads }
    for (const roadId of roadCreated.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
      }
    }
    state = { ...roadCreated.state, roads }
    state = assignJobs(state)

    const after = produceWood(state)

    expect(after.woodDeposits['5,2']!.remaining).toBe(0)
    expect(after.resources.wood).toBe(1) // only what the deposit had
  })

  it('Colony Center fallback: an eligible deposit recovers wood WITHOUT any worker', () => {
    // Population 0, no Lumber Camp at all — the D4 anti-self-lock path.
    const state = operational(fresh(), 'colonyCenter', 5, 3)
    expect(Object.keys(state.colonists)).toHaveLength(0)

    const after = produceWood(state)

    expect(after.resources.wood).toBe(1) // WOOD_PER_COLONY_CENTER_PER_TICK
    expect(after.woodDeposits['5,2']!.remaining).toBe(9)
  })

  it('Colony Center fallback over ticks: eventually recovers wood without a camp', () => {
    let state = operational(fresh(), 'colonyCenter', 5, 3)
    for (let i = 0; i < 5; i += 1) {
      state = produceWood(state)
    }
    expect(state.resources.wood).toBe(5)
    expect(state.woodDeposits['5,2']!.remaining).toBe(5)
  })

  it('no ex-nihilo generation: with all deposits exhausted, nothing can increase wood', () => {
    const barren: SimulationConfig = {
      world: { seed: 'nova-step003-barren', width: 12, height: 12 },
    }
    let state = createInitialState(barren)
    state = operational(state, 'lumberCamp', 5, 3)
    state = operational(state, 'residence', 5, 5)
    state = createColonist(state, Object.values(state.buildings).find((b) => b.type === 'residence')!.id).state
    const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
    const roads = { ...roadCreated.state.roads }
    for (const roadId of roadCreated.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
      }
    }
    state = { ...roadCreated.state, roads }
    state = assignJobs(state)
    state = operational(state, 'colonyCenter', 7, 3)

    const after = produceWood(state)

    expect(Object.keys(state.woodDeposits)).toHaveLength(0)
    expect(after.resources.wood).toBe(0)
    expect(after.woodDeposits).toEqual(state.woodDeposits)
  })

  it('adjacency is orthogonal only: a diagonal deposit is not extractable', () => {
    const diagConfig: SimulationConfig = {
      world: {
        seed: 'nova-step003-diag',
        width: 12,
        height: 12,
        woodDeposits: [{ x: 6, y: 2, remaining: 10 }], // diagonal to (5,3)
      },
    }
    let state = createInitialState(diagConfig)
    state = operational(state, 'lumberCamp', 5, 3)
    state = operational(state, 'residence', 5, 5)
    state = createColonist(state, Object.values(state.buildings).find((b) => b.type === 'residence')!.id).state
    const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
    const roads = { ...roadCreated.state.roads }
    for (const roadId of roadCreated.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
      }
    }
    state = { ...roadCreated.state, roads }
    state = assignJobs(state)

    expect(adjacentRemaining(state.woodDeposits, 5, 3)).toBe(0)

    const after = produceWood(state)
    expect(after.resources.wood).toBe(0)
  })

  it('determinism: same state, same ticks, identical canonical hash', () => {
    const run = (): SimulationState => {
      let state = staffedCamp()
      state = operational(state, 'colonyCenter', 5, 4) // also adjacent to (5,2)? no: (5,4)-(5,2) not adjacent; uses camp only
      for (let i = 0; i < 6; i += 1) state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.resources.wood).toBeGreaterThan(0)
    expect(a.woodDeposits['5,2']!.remaining).toBeLessThan(10)
  })

  it('full tick path: a placed staffed camp extracts through stepSimulation', () => {
    // Through the REAL pipeline: advance construction, staff via assignJobs,
    // then step. The camp becomes productive the tick after assignment
    // (same next-tick timing contract as farms).
    let state = fresh()
    state = operational(state, 'residence', 5, 5)
    state = createColonist(state, Object.values(state.buildings).find((b) => b.type === 'residence')!.id).state
    const roadCreated = createRoads(state, [{ x: 5, y: 4 }])
    const roads = { ...roadCreated.state.roads }
    for (const roadId of roadCreated.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
      }
    }
    state = { ...roadCreated.state, roads }
    state = operational(state, 'lumberCamp', 5, 3)
    state = assignJobs(state) // camp job exists and is eligible
    expect(Object.values(state.buildings).find((b) => b.type === 'lumberCamp')?.status).toBe('operational')
    expect(state.resources.wood).toBe(0)

    state = stepSimulation(state)
    expect(state.resources.wood).toBe(2)
    expect(state.woodDeposits['5,2']!.remaining).toBe(8)
  })

  it('placement protection: buildings never overwrite a wood deposit', () => {
    const state = fresh()
    const validation = validatePlacement(state, { x: 5, y: 2 }, 'residence')
    expect(validation).toEqual({ valid: false, reason: 'depositBlocked' })
    // And the authoritative command refuses without spending.
    const after = applyCommand(state, { type: 'placeBuilding', x: 5, y: 2, buildingType: 'residence' })
    expect(after.accepted).toBe(false)
    // Step004: only the pre-placed Colony Center anchor exists.
    expect(Object.keys(after.state.buildings)).toEqual(['colony-center'])
    expect(after.state.resources.money).toBe(state.resources.money)
  })

  it('through advanceConstruction: the production phase composes with the orchestrator stages', () => {
    const state = staffedCamp()
    const constructed = advanceConstruction(state)
    const after = produceWood(constructed)
    expect(after.resources.wood).toBe(state.resources.wood + 2)
  })
})
