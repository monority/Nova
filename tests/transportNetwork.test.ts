import { describe, expect, it } from 'vitest'

import {
  areOrthogonallyAdjacent,
  createBuilding,
  getAccessibleBuildingCount,
  getAccessibleBuildingIds,
  hashCanonicalState,
  isBuildingAccessible,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

/** Place a building and force it operational (arbitrary canonical states). */
const operationalAt = (
  state: SimulationState,
  type: PlaceBuildingCommand['buildingType'],
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

const withStatus = (
  state: SimulationState,
  id: string,
  status: 'underConstruction' | 'operational'
): SimulationState => {
  const building = state.buildings[id]
  if (building === undefined) {
    throw new Error(`test helper: unknown building ${id}`)
  }
  return {
    ...state,
    buildings: {
      ...state.buildings,
      [id]: { ...building, status, constructionRemaining: 0 },
    },
  }
}

describe('transport network connectivity (Step 09A)', () => {
  it('A — empty settlement has no accessible buildings', () => {
    const fresh = createTestState()
    expect(getAccessibleBuildingIds(fresh)).toEqual([])
    expect(getAccessibleBuildingCount(fresh)).toBe(0)
    // Operational buildings but zero Residences: still nothing.
    let state = fresh
    let placed: { state: SimulationState; id: string }
    placed = operationalAt(state, 'farm', 1, 1)
    state = placed.state
    placed = operationalAt(state, 'workshop', 2, 1)
    state = placed.state
    expect(getAccessibleBuildingIds(state)).toEqual([])
    expect(isBuildingAccessible(state, placed.id)).toBe(false)
  })

  it('B — single Residence: operational accessible, constructing not', () => {
    let state = createTestState()
    const placed = operationalAt(state, 'residence', 3, 3)
    state = placed.state
    expect(getAccessibleBuildingIds(state)).toEqual([placed.id])
    expect(isBuildingAccessible(state, placed.id)).toBe(true)

    const constructing = stepSimulation(createTestState(), place('residence', 3, 3))
    expect(getAccessibleBuildingIds(constructing)).toEqual([])
    const constructingId = 'building-1'
    expect(isBuildingAccessible(constructing, constructingId)).toBe(false)
  })

  it('C — direct adjacency: farm and workshop both accessible', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 0, 0)
    state = r.state
    const f = operationalAt(state, 'farm', 1, 0)
    state = f.state
    expect(getAccessibleBuildingIds(state)).toEqual([r.id, f.id])
    expect(isBuildingAccessible(state, f.id)).toBe(true)

    const w = operationalAt(state, 'workshop', 0, 1)
    state = w.state
    expect(getAccessibleBuildingIds(state)).toEqual([r.id, f.id, w.id])
  })

  it('D — multi-hop chain R -> F -> W -> F all connected', () => {
    let state = createTestState()
    const ids: string[] = []
    const cells: Array<[PlaceBuildingCommand['buildingType'], number, number]> = [
      ['residence', 0, 0],
      ['farm', 1, 0],
      ['workshop', 2, 0],
      ['farm', 3, 0],
    ]
    for (const [type, x, y] of cells) {
      const placed = operationalAt(state, type, x, y)
      state = placed.state
      ids.push(placed.id)
    }
    expect(getAccessibleBuildingIds(state)).toEqual([...ids].sort())
    for (const id of ids) {
      expect(isBuildingAccessible(state, id)).toBe(true)
    }
  })

  it('E — disconnected component stays inaccessible', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 0, 0)
    state = r.state
    const near = operationalAt(state, 'farm', 1, 0)
    state = near.state
    const far1 = operationalAt(state, 'farm', 5, 5)
    state = far1.state
    const far2 = operationalAt(state, 'workshop', 6, 5)
    state = far2.state
    // The far pair is mutually adjacent but has no Residence root.
    expect(areOrthogonallyAdjacent({ x: 5, y: 5 }, { x: 6, y: 5 })).toBe(true)
    expect(getAccessibleBuildingIds(state)).toEqual([r.id, near.id].sort())
    expect(isBuildingAccessible(state, far1.id)).toBe(false)
    expect(isBuildingAccessible(state, far2.id)).toBe(false)
  })

  it('F — diagonal-only connection is inaccessible', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 0, 0)
    state = r.state
    const diag = operationalAt(state, 'workshop', 1, 1)
    state = diag.state
    expect(
      areOrthogonallyAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })
    ).toBe(false)
    expect(getAccessibleBuildingIds(state)).toEqual([r.id])
    expect(isBuildingAccessible(state, diag.id)).toBe(false)
  })

  it('G — lifecycle: constructing excluded, operational included', () => {
    // Adjacent but under construction: excluded and bridges nothing.
    let state = stepSimulation(
      stepSimulation(createTestState(), place('residence', 0, 0)),
      place('farm', 1, 0)
    )
    const farmId = 'building-2'
    expect(getAccessibleBuildingIds(state)).toEqual(['building-1'])
    expect(isBuildingAccessible(state, farmId)).toBe(false)
    // Becoming operational makes it accessible (existing lifecycle, no phase change).
    state = stepSimulation(state)
    expect(state.buildings[farmId]?.status).toBe('operational')
    expect(getAccessibleBuildingIds(state)).toEqual(['building-1', farmId].sort())
    // A non-operational middle building stops contributing to connectivity.
    let chain = createTestState()
    const r = operationalAt(chain, 'residence', 0, 0)
    chain = r.state
    const mid = operationalAt(chain, 'farm', 1, 0)
    chain = mid.state
    const end = operationalAt(chain, 'workshop', 2, 0)
    chain = end.state
    expect(isBuildingAccessible(chain, end.id)).toBe(true)
    chain = withStatus(chain, mid.id, 'underConstruction')
    expect(isBuildingAccessible(chain, end.id)).toBe(false)
    expect(getAccessibleBuildingIds(chain)).toEqual([r.id])
  })

  it('H — multiple roots, no arbitrary root selection', () => {
    let state = createTestState()
    const r1 = operationalAt(state, 'residence', 0, 0)
    state = r1.state
    const a = operationalAt(state, 'farm', 1, 0)
    state = a.state
    const r2 = operationalAt(state, 'residence', 5, 5)
    state = r2.state
    const b = operationalAt(state, 'workshop', 6, 5)
    state = b.state
    const orphan = operationalAt(state, 'farm', 3, 3)
    state = orphan.state
    expect(getAccessibleBuildingIds(state)).toEqual(
      [r1.id, a.id, r2.id, b.id].sort()
    )
    expect(isBuildingAccessible(state, orphan.id)).toBe(false)
  })

  it('I — determinism: same state, same result; replay identical', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 2, 2)
    state = r.state
    const f = operationalAt(state, 'farm', 3, 2)
    state = f.state
    const first = getAccessibleBuildingIds(state)
    const second = getAccessibleBuildingIds(state)
    expect(second).toEqual(first)
    // Rebuild the identical canonical state: identical result.
    let replay = createTestState()
    const rr = operationalAt(replay, 'residence', 2, 2)
    replay = rr.state
    const rf = operationalAt(replay, 'farm', 3, 2)
    replay = rf.state
    expect(serializeCanonicalState(replay)).toBe(serializeCanonicalState(state))
    expect(getAccessibleBuildingIds(replay)).toEqual(first)
    // Record key order never affects the result.
    const reordered: SimulationState = {
      ...state,
      buildings: Object.fromEntries(
        Object.entries(state.buildings).reverse()
      ),
    }
    expect(getAccessibleBuildingIds(reordered)).toEqual(first)
  })

  it('J — purity: query mutates nothing, hash/serialization stable', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 0, 0)
    state = r.state
    const f = operationalAt(state, 'farm', 1, 0)
    state = f.state
    const hashBefore = hashCanonicalState(state)
    const serialBefore = serializeCanonicalState(state)
    const result = getAccessibleBuildingIds(state)
    expect(hashCanonicalState(state)).toBe(hashBefore)
    expect(serializeCanonicalState(state)).toBe(serialBefore)
    // Fresh collection: mutating it changes nothing downstream.
    ;(result as string[]).push('building-999')
    expect(getAccessibleBuildingIds(state)).toEqual([r.id, f.id].sort())
  })

  it('spatial edge cases (§16): negatives, large coords, chains, branches', () => {
    // Negative coordinates.
    let state = createTestState()
    const r = operationalAt(state, 'residence', -3, -2)
    state = r.state
    const n = operationalAt(state, 'farm', -2, -2)
    state = n.state
    expect(getAccessibleBuildingIds(state)).toEqual([r.id, n.id].sort())
    // Large coordinates.
    const big = operationalAt(state, 'workshop', 1000000, -1000000)
    state = big.state
    expect(isBuildingAccessible(state, big.id)).toBe(false)
    // Long chain (20 hops) from one root.
    let chain = createTestState()
    const root = operationalAt(chain, 'residence', 0, 0)
    chain = root.state
    for (let i = 1; i <= 20; i++) {
      const placed = operationalAt(chain, 'farm', i, 0)
      chain = placed.state
    }
    expect(getAccessibleBuildingCount(chain)).toBe(21)
    // Branching network: root with three arms.
    let branch = createTestState()
    const rb = operationalAt(branch, 'residence', 0, 0)
    branch = rb.state
    for (const [type, x, y] of [
      ['farm', 1, 0],
      ['farm', 2, 0],
      ['workshop', 0, 1],
      ['workshop', 0, 2],
      ['farm', -1, 0],
    ] as const) {
      const placed = operationalAt(branch, type, x, y)
      branch = placed.state
    }
    expect(getAccessibleBuildingCount(branch)).toBe(6)
    // Sparse settlement: isolated operational buildings, one root alone.
    let sparse = createTestState()
    const rs = operationalAt(sparse, 'residence', 0, 0)
    sparse = rs.state
    const s1 = operationalAt(sparse, 'farm', 10, 10)
    sparse = s1.state
    const s2 = operationalAt(sparse, 'workshop', -7, 4)
    sparse = s2.state
    expect(getAccessibleBuildingIds(sparse)).toEqual([rs.id])
  })

  it('persistence: save/load round-trip preserves derived accessibility', () => {
    let state = createTestState()
    const r = operationalAt(state, 'residence', 0, 0)
    state = r.state
    const f = operationalAt(state, 'farm', 1, 0)
    state = f.state
    const before = getAccessibleBuildingIds(state)
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getAccessibleBuildingIds(loaded)).toEqual(before)
    // No accessibility state persisted: SAVE_VERSION unchanged.
    expect(SAVE_VERSION).toBe(6)
  })
})
