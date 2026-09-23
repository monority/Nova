/**
 * Road network connectivity tests (Step 09D).
 *
 * Tests derived connectivity over canonical operational RoadState only.
 * No persistence, no hash, no mutation.
 */

import { describe, expect, it } from 'vitest'

import {
  areRoadsAdjacent,
  createRoads,
  getConnectedRoadIds,
  getRoadIdAtCell,
  getRoadNetworkCount,
  getRoadNetworks,
  hashCanonicalState,
  isOperationalRoad,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type PlaceRoadsCommand,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

const placeRoads = (cells: { readonly x: number; readonly y: number }[]): PlaceRoadsCommand => ({
  type: 'placeRoads',
  cells,
})

/** Place an operational road directly in the domain (arbitrary canonical states). */
const operationalRoadAt = (
  state: SimulationState,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) {
    throw new Error('test helper: no road created')
  }
  const road = created.state.roads[id]
  if (road === undefined) {
    throw new Error('test helper: road missing after createRoads')
  }
  return {
    id,
    state: {
      ...created.state,
      roads: {
        ...created.state.roads,
        [id]: { ...road, status: 'operational', constructionRemaining: 0 },
      },
    },
  }
}

describe('road network connectivity (Step 09D)', () => {
  it('A — empty settlement has zero networks', () => {
    const fresh = createTestState()
    expect(getRoadNetworkCount(fresh)).toBe(0)
    expect(getRoadNetworks(fresh)).toEqual([])
  })

  it('B — one operational road forms one network', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    expect(getRoadNetworkCount(state)).toBe(1)
    expect(getRoadNetworks(state)).toEqual([[r.id]])
    expect(getConnectedRoadIds(state, r.id)).toEqual([r.id])
  })

  it('C — adjacent roads form one network', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    const f = operationalRoadAt(state, 1, 0)
    state = f.state
    expect(areRoadsAdjacent({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true)
    expect(getRoadNetworkCount(state)).toBe(1)
    expect(getRoadNetworks(state)).toEqual([[r.id, f.id].sort()])
    expect(getConnectedRoadIds(state, r.id)).toEqual([r.id, f.id].sort())
    expect(getConnectedRoadIds(state, f.id)).toEqual([r.id, f.id].sort())
  })

  it('D — multi-hop chain is one network', () => {
    let state = createTestState()
    const ids: string[] = []
    for (const x of [0, 1, 2, 3]) {
      const placed = operationalRoadAt(state, x, 0)
      state = placed.state
      ids.push(placed.id)
    }
    expect(getRoadNetworkCount(state)).toBe(1)
    for (const id of ids) {
      expect(getConnectedRoadIds(state, id)).toEqual([...ids].sort())
    }
  })

  it('E — disconnected components are separate networks', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    const near = operationalRoadAt(state, 1, 0)
    state = near.state
    const far1 = operationalRoadAt(state, 5, 5)
    state = far1.state
    const far2 = operationalRoadAt(state, 6, 5)
    state = far2.state
    expect(getRoadNetworkCount(state)).toBe(2)
    const networks = getRoadNetworks(state)
    expect(networks.length).toBe(2)
    const sizes = networks.map((n) => n.length).sort((a, b) => a - b)
    expect(sizes).toEqual([2, 2])
  })

  it('F — diagonal-only roads are separate networks', () => {
    let state = createTestState()
    const a = operationalRoadAt(state, 0, 0)
    state = a.state
    const b = operationalRoadAt(state, 1, 1)
    state = b.state
    expect(areRoadsAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false)
    expect(getRoadNetworkCount(state)).toBe(2)
    expect(getConnectedRoadIds(state, a.id)).toEqual([a.id])
    expect(getConnectedRoadIds(state, b.id)).toEqual([b.id])
  })

  it('G — intersection forms one network', () => {
    let state = createTestState()
    // Cross shape: B at center, A, C, D, E around
    const a = operationalRoadAt(state, 0, 0)
    state = a.state
    const b = operationalRoadAt(state, 1, 0)
    state = b.state
    const c = operationalRoadAt(state, 2, 0)
    state = c.state
    const d = operationalRoadAt(state, 1, 1)
    state = d.state
    const e = operationalRoadAt(state, 1, -1)
    state = e.state
    expect(getRoadNetworkCount(state)).toBe(1)
    const allIds = [a.id, b.id, c.id, d.id, e.id].sort()
    for (const id of allIds) {
      expect(getConnectedRoadIds(state, id)).toEqual(allIds)
    }
  })

  it('H — under-construction roads are excluded, then join when operational', () => {
    // Placed through the real simulation path: under construction at t1.
    const placed = stepSimulation(createTestState(), placeRoads([{ x: 0, y: 0 }]))
    const roadId = getRoadIdAtCell(placed, { x: 0, y: 0 })
    if (roadId === null) {
      throw new Error('test: road id not found after placement')
    }
    const road = placed.roads[roadId]!
    expect(road.status).toBe('underConstruction')
    // Under-construction road is not part of any network.
    expect(getConnectedRoadIds(placed, roadId)).toEqual([])
    expect(getRoadNetworkCount(placed)).toBe(0)

    // Advance to operational through the lifecycle (no phase change needed).
    const advanced = stepSimulation(placed)
    const advancedRoad = advanced.roads[roadId]!
    expect(advancedRoad.status).toBe('operational')
    expect(getRoadNetworkCount(advanced)).toBe(1)
    expect(getConnectedRoadIds(advanced, roadId)).toEqual([roadId])
  })

  it('I — lifecycle: construction completion adds road to network, two-segment bridge', () => {
    // Two separated segments placed through the real simulation path.
    let state = stepSimulation(
      createTestState(),
      placeRoads([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ])
    )
    state = stepSimulation(state) // both segments become operational
    const leftId = getRoadIdAtCell(state, { x: 0, y: 0 })!
    const rightId = getRoadIdAtCell(state, { x: 2, y: 0 })!
    expect(state.roads[leftId]!.status).toBe('operational')
    expect(getRoadNetworkCount(state)).toBe(2)

    // Gap road bridges the two operational ends once operational itself.
    const mid = operationalRoadAt(state, 1, 0)
    state = mid.state
    expect(getRoadNetworkCount(state)).toBe(1)
    expect(getConnectedRoadIds(state, leftId)).toEqual([leftId, mid.id, rightId].sort())
    // Demote the middle road to under construction: two networks again.
    const demoted: SimulationState = {
      ...state,
      roads: {
        ...state.roads,
        [mid.id]: { ...state.roads[mid.id]!, status: 'underConstruction', constructionRemaining: 1 },
      },
    }
    expect(isOperationalRoad(demoted.roads[mid.id]!)).toBe(false)
    expect(getRoadNetworkCount(demoted)).toBe(2)
    expect(getConnectedRoadIds(demoted, leftId)).toEqual([leftId])
    expect(getConnectedRoadIds(demoted, rightId)).toEqual([rightId])
  })

  it('J — unknown road returns empty', () => {
    const fresh = createTestState()
    expect(getConnectedRoadIds(fresh, 'road-unknown')).toEqual([])
  })

  it('K — multiple components independently queryable', () => {
    let state = createTestState()
    const a = operationalRoadAt(state, 0, 0)
    state = a.state
    const b = operationalRoadAt(state, 1, 0)
    state = b.state
    const c = operationalRoadAt(state, 5, 5)
    state = c.state
    const d = operationalRoadAt(state, 6, 5)
    state = d.state
    expect(getConnectedRoadIds(state, a.id)).toEqual([a.id, b.id].sort())
    expect(getConnectedRoadIds(state, b.id)).toEqual([a.id, b.id].sort())
    expect(getConnectedRoadIds(state, c.id)).toEqual([c.id, d.id].sort())
    expect(getConnectedRoadIds(state, d.id)).toEqual([c.id, d.id].sort())
  })

  it('L — purity: query does not mutate state', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    const f = operationalRoadAt(state, 1, 0)
    state = f.state
    const hashBefore = hashCanonicalState(state)
    const serialBefore = serializeCanonicalState(state)
    const result = getConnectedRoadIds(state, r.id)
    expect(hashCanonicalState(state)).toBe(hashBefore)
    expect(serializeCanonicalState(state)).toBe(serialBefore)
    // Mutating the returned array doesn't affect future queries
    ;(result as string[]).push('road-999')
    expect(getConnectedRoadIds(state, r.id)).toEqual([r.id, f.id].sort())
  })

  it('M — determinism: same state produces identical results', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    const f = operationalRoadAt(state, 1, 0)
    state = f.state
    const w = operationalRoadAt(state, 2, 0)
    state = w.state
    const first = getRoadNetworks(state)
    const second = getRoadNetworks(state)
    expect(second).toEqual(first)
    // Rebuild identical canonical state
    let replay = createTestState()
    const rr = operationalRoadAt(replay, 0, 0)
    replay = rr.state
    const rf = operationalRoadAt(replay, 1, 0)
    replay = rf.state
    const rw = operationalRoadAt(replay, 2, 0)
    replay = rw.state
    expect(serializeCanonicalState(replay)).toBe(serializeCanonicalState(state))
    expect(getRoadNetworks(replay)).toEqual(first)
    // Reversed insertion order yields same result
    const reordered: SimulationState = {
      ...state,
      roads: Object.fromEntries(Object.entries(state.roads).reverse()),
    }
    expect(getRoadNetworks(reordered)).toEqual(first)
  })

  it('N — save/load round-trip preserves derived network results', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 0, 0)
    state = r.state
    const f = operationalRoadAt(state, 1, 0)
    state = f.state
    const before = getRoadNetworks(state)
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getRoadNetworks(loaded)).toEqual(before)
    // No network cache persisted: SAVE_VERSION unchanged.
    expect(SAVE_VERSION).toBe(8)
  })
})
