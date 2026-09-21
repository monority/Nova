/**
 * Building road access tests (Step 09E).
 *
 * Building → adjacent operational Road → Road Network (09D).
 * Pure derived queries only: nothing persisted, nothing hashed, no mutation.
 */

import { describe, expect, it } from 'vitest'

import {
  createBuilding,
  createRoads,
  getBuildingRoadAccess,
  getRoadIdAtCell,
  hashCanonicalState,
  getRoadNetworks,
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

/** Operational building at a cell (arbitrary canonical state). */
const operationalAt = (
  state: SimulationState,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, 'farm', x, y, 2)
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

/** Operational road directly in the domain (arbitrary canonical state). */
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

describe('building road access (Step 09E)', () => {
  it('A — building with no adjacent road has no access', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    expect(getBuildingRoadAccess(state, b.id)).toEqual({
      buildingId: b.id,
      roadIds: [],
      networkIds: [],
      hasRoadAccess: false,
    })
  })

  it('B — road at north gives access', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const r = operationalRoadAt(state, 4, 3)
    state = r.state
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([r.id])
    expect(access.networkIds).toEqual([r.id])
  })

  it('C — road at east gives access', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const r = operationalRoadAt(state, 5, 4)
    state = r.state
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([r.id])
  })

  it('D — diagonal road gives no access', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const r = operationalRoadAt(state, 5, 5)
    state = r.state
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(false)
    expect(access.roadIds).toEqual([])
    expect(access.networkIds).toEqual([])
  })

  it('E — under-construction road gives no access', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    // Real simulation path: the road is under construction after placement.
    const placed = stepSimulation(state, placeRoads([{ x: 4, y: 3 }]))
    const roadId = getRoadIdAtCell(placed, { x: 4, y: 3 })
    if (roadId === null) {
      throw new Error('test: road id not found after placement')
    }
    expect(placed.roads[roadId]!.status).toBe('underConstruction')
    expect(getBuildingRoadAccess(placed, b.id).hasRoadAccess).toBe(false)
    // Operational transition flips access on with no persisted mutation.
    const advanced = stepSimulation(placed)
    const access = getBuildingRoadAccess(advanced, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([roadId])
  })

  it('F — under-construction building has no active access', () => {
    let state = createTestState()
    const r = operationalRoadAt(state, 4, 3)
    state = r.state
    // Real simulation path: building placed and still under construction.
    const placed = stepSimulation(state, { type: 'placeBuilding', x: 4, y: 4, buildingType: 'farm' })
    const buildingId = 'building-1'
    expect(placed.buildings[buildingId]!.status).toBe('underConstruction')
    expect(getBuildingRoadAccess(placed, buildingId).hasRoadAccess).toBe(false)
    // Once operational, access becomes active.
    const advanced = stepSimulation(placed)
    const access = getBuildingRoadAccess(advanced, buildingId)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([r.id])
  })

  it('G — multiple adjacent roads of one network: one network entry', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    // W, N, E all adjacent to the building; connectors (3,3) and (5,3)
    // link them into ONE network (W-N via (3,3), N-E via (5,3)).
    const w = operationalRoadAt(state, 3, 4)
    state = w.state
    const n = operationalRoadAt(state, 4, 3)
    state = n.state
    const e = operationalRoadAt(state, 5, 4)
    state = e.state
    state = operationalRoadAt(state, 3, 3).state
    state = operationalRoadAt(state, 5, 3).state
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([w.id, n.id, e.id].sort())
    // All three access roads belong to the same network: deduped to one id
    // (the network's lowest road id, per 09D component ordering convention).
    expect(access.networkIds.length).toBe(1)
    expect(access.networkIds).toEqual([getRoadNetworks(state)[0]![0]])
  })

  it('H — two distinct networks: building never merges them', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    // North road, isolated network 1.
    const n = operationalRoadAt(state, 4, 3)
    state = n.state
    // South road, isolated network 2 (not adjacent to north road).
    const s = operationalRoadAt(state, 4, 5)
    state = s.state
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([n.id, s.id].sort())
    // Two distinct network ids: the building is not a bridge.
    expect(access.networkIds).toEqual([n.id, s.id].sort())
    expect(new Set(access.networkIds).size).toBe(2)
  })

  it('I — network reached via one access road: full network id exposed', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    // r1 adjacent to the building; r2 extends the network north. Geometric
    // note: two roads cannot be adjacent to each other AND both adjacent to
    // the same 1x1 building, so access roads and network extent are tested
    // separately (G covers several access roads of one network).
    const r1 = operationalRoadAt(state, 4, 3)
    state = r1.state
    const r2 = operationalRoadAt(state, 4, 2)
    state = r2.state
    // r1-r2 orthogonally adjacent: one network per 09D.
    const access = getBuildingRoadAccess(state, b.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds).toEqual([r1.id])
    expect(access.networkIds).toEqual([r1.id])
    expect(access.networkIds[0]).not.toBe(r2.id)
  })

  it('J — determinism: same state, same result; insertion order irrelevant', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const n = operationalRoadAt(state, 4, 3)
    state = n.state
    const s = operationalRoadAt(state, 4, 5)
    state = s.state
    const first = getBuildingRoadAccess(state, b.id)
    const second = getBuildingRoadAccess(state, b.id)
    expect(second).toEqual(first)
    // Reversed road record insertion: identical result.
    const reordered: SimulationState = {
      ...state,
      roads: Object.fromEntries(Object.entries(state.roads).reverse()),
    }
    expect(getBuildingRoadAccess(reordered, b.id)).toEqual(first)
  })

  it('K — save/load round-trip preserves derived access; nothing serialized', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const n = operationalRoadAt(state, 4, 3)
    state = n.state
    const s = operationalRoadAt(state, 4, 5)
    state = s.state
    const before = getBuildingRoadAccess(state, b.id)
    expect(before.networkIds.length).toBe(2)
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getBuildingRoadAccess(loaded, b.id)).toEqual(before)
    // No access state persisted: SAVE_VERSION unchanged.
    expect(SAVE_VERSION).toBe(6)
  })

  it('L — unknown building id has no access', () => {
    const fresh = createTestState()
    expect(getBuildingRoadAccess(fresh, 'building-unknown')).toEqual({
      buildingId: 'building-unknown',
      roadIds: [],
      networkIds: [],
      hasRoadAccess: false,
    })
  })

  it('M — purity: query does not mutate state', () => {
    let state = createTestState()
    const b = operationalAt(state, 4, 4)
    state = b.state
    const r = operationalRoadAt(state, 4, 3)
    state = r.state
    const hashBefore = hashCanonicalState(state)
    const serialBefore = serializeCanonicalState(state)
    getBuildingRoadAccess(state, b.id)
    expect(hashCanonicalState(state)).toBe(hashBefore)
    expect(serializeCanonicalState(state)).toBe(serialBefore)
  })
})
