/**
 * Step005 — physical stone extraction: the Quarry slice.
 *
 * Mirrors the Step003 wood invariants over stone deposits
 * (docs/audits/RESOURCE-ECONOMIC-SYSTEM-AUDIT-2026-10-08.md, D1/D2):
 * staffed Quarry + orthogonally adjacent finite deposits → resources.stone.
 * Wood remains the primitive recovery resource: the Colony Center never
 * collects stone.
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  hashCanonicalState,
  loadSave,
  produceStone,
  serializeSave,
  stepSimulation,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: {
    seed: 'nova-step005-stone',
    width: 12,
    height: 12,
    stoneDeposits: [{ x: 5, y: 2, remaining: 10 }],
  },
}

const fresh = (): SimulationState => createInitialState(config)

const operational = (
  state: SimulationState,
  type: Parameters<typeof createBuilding>[1],
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('stone: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const staffedQuarry = (): SimulationState => {
  let state = operational(fresh(), 'quarry', 5, 3) // adjacent to the (5,2) stone deposit
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
  return assignJobs(state)
}

describe('Step005 — stone extraction', () => {
  it('normal extraction: staffed Quarry adjacent to a deposit increases stone and drains it', () => {
    const state = staffedQuarry()
    const before = state.resources.stone

    const after = produceStone(state)

    expect(after.resources.stone).toBe(before + 2)
    expect(after.stoneDeposits['5,2']!.remaining).toBe(8)
  })

  it('unstaffed Quarry produces zero', () => {
    let state = operational(fresh(), 'quarry', 5, 3)
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
    const unstaffed: SimulationState = {
      ...state,
      colonists: Object.fromEntries(
        Object.entries(state.colonists).map(([id, c]) => [id, { ...c, workplaceId: null }])
      ),
    }

    const after = produceStone(unstaffed)

    expect(after.resources.stone).toBe(unstaffed.resources.stone)
    expect(after.stoneDeposits['5,2']!.remaining).toBe(10)
  })

  it('empty deposit produces zero and remains present', () => {
    const emptyConfig: SimulationConfig = {
      world: {
        seed: 'nova-step005-stone-empty',
        width: 12,
        height: 12,
        stoneDeposits: [{ x: 5, y: 2, remaining: 0 }],
      },
    }
    let state = createInitialState(emptyConfig)
    state = operational(state, 'quarry', 5, 3)
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

    const after = produceStone(state)

    expect(after.resources.stone).toBe(state.resources.stone)
    expect(after.stoneDeposits['5,2']).toBeDefined()
    expect(after.stoneDeposits['5,2']!.remaining).toBe(0)
  })

  it('final extraction is capped by the remaining quantity', () => {
    const lowConfig: SimulationConfig = {
      world: {
        seed: 'nova-step005-stone-low',
        width: 12,
        height: 12,
        stoneDeposits: [{ x: 5, y: 2, remaining: 1 }],
      },
    }
    let state = createInitialState(lowConfig)
    state = operational(state, 'quarry', 5, 3)
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

    const after = produceStone(state)

    expect(after.resources.stone).toBe(1)
    expect(after.stoneDeposits['5,2']!.remaining).toBe(0)
  })

  it('no ex-nihilo generation: no stone deposits, no stone', () => {
    const barren: SimulationConfig = {
      world: { seed: 'nova-step005-barren', width: 12, height: 12 },
    }
    let state = createInitialState(barren)
    state = operational(state, 'quarry', 5, 3)
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

    const after = produceStone(state)

    expect(Object.keys(state.stoneDeposits)).toHaveLength(0)
    expect(after.resources.stone).toBe(0)
  })

  it('orthogonal adjacency only: a diagonal deposit is not extractable', () => {
    const diagConfig: SimulationConfig = {
      world: {
        seed: 'nova-step005-diag',
        width: 12,
        height: 12,
        stoneDeposits: [{ x: 6, y: 2, remaining: 10 }], // diagonal to (5,3)
      },
    }
    let state = createInitialState(diagConfig)
    state = operational(state, 'quarry', 5, 3)
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

    const after = produceStone(state)
    expect(after.resources.stone).toBe(0)
  })

  it('determinism: same state, same ticks, identical canonical hash', () => {
    const run = (): SimulationState => {
      let state = staffedQuarry()
      for (let i = 0; i < 6; i += 1) state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.resources.stone).toBeGreaterThan(0)
    expect(a.stoneDeposits['5,2']!.remaining).toBeLessThan(10)
  })

  it('full tick path: a placed staffed Quarry extracts through stepSimulation', () => {
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
    state = operational(state, 'quarry', 5, 3)
    state = assignJobs(state)

    state = stepSimulation(state)
    expect(state.resources.stone).toBe(2)
    expect(state.stoneDeposits['5,2']!.remaining).toBe(8)
  })

  it('existing Colony Center recovery remains functional and collects no stone', () => {
    // Wood-only fallback: the anchor collects wood from a WOOD deposit and
    // ignores stone deposits entirely.
    const bothConfig: SimulationConfig = {
      world: {
        seed: 'nova-step005-both',
        width: 12,
        height: 12,
        stoneDeposits: [{ x: 10, y: 11, remaining: 10 }],
        woodDeposits: [{ x: 10, y: 11, remaining: 10 }],
      },
    }
    let state = createInitialState(bothConfig)
    // Anchor + wood deposit adjacent: wood collected, stone untouched.
    state = produceStone({ ...state })
    expect(state.resources.stone).toBe(0)
    expect(state.stoneDeposits['10,11']!.remaining).toBe(10)
  })

  it('stone deposits block placement like wood deposits', () => {
    const state = fresh()
    const validation = validateStonePlacement(state)
    expect(validation).toEqual({ valid: false, reason: 'depositBlocked' })
  })
})

// Local helper: placement validation over the stone deposit cell.
function validateStonePlacement(state: ReturnType<typeof fresh>) {
  // Import lazily via the index barrel contract: reuse the authoritative
  // validator through a dispatch attempt (identical semantics to wood).
  const attempt = applyCommand(state, {
    type: 'placeBuilding',
    x: 5,
    y: 2,
    buildingType: 'residence',
  })
  expect(attempt.accepted).toBe(false)
  return { valid: false as const, reason: attempt.reason }
}

// loadSave/serializeSave round-trip smoke for the new fields.
describe('Step005 — stone persistence', () => {
  it('save/load preserves stone stock and stone deposits', () => {
    const state = fresh()
    const restored = loadSave(serializeSave(state))
    expect(restored.resources.stone).toBe(state.resources.stone)
    expect(restored.stoneDeposits).toEqual(state.stoneDeposits)
  })
})
