/**
 * Residential-to-work mobility contract tests (Step 09G).
 *
 * Residence -> 09E road access -> networkIds
 * Workplace -> 09E road access -> networkIds
 * mobilityConnected iff the two sets intersect.
 *
 * Pure derived query only: nothing persisted, nothing hashed, no gameplay
 * consequence (jobs, production, population, food, upkeep, storage and
 * construction are all untouched by 09G).
 */

import { describe, expect, it } from 'vitest'

import {
  createBuilding,
  createColonist,
  createRoads,
  getColonistWorkMobility,
  getRoadNetworks,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

type Cell = { readonly x: number; readonly y: number }

/** Operational building placed directly in the domain (arbitrary state). */
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

/** Operational road placed directly in the domain (arbitrary state). */
const operationalRoad = (
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

/** Operational roads at several cells, in deterministic input order. */
const operationalRoads = (
  state: SimulationState,
  cells: readonly Cell[]
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = operationalRoad(next, cell.x, cell.y).state
  }
  return next
}

/** Colonist bound to a residence and a workplace (canonical domain op). */
const withColonist = (
  state: SimulationState,
  residenceId: string,
  workplaceId: string | null
): { state: SimulationState; id: string } => {
  const created = createColonist(state, residenceId)
  const colonist = created.state.colonists[created.colonistId]
  if (colonist === undefined) {
    throw new Error('test helper: colonist missing after createColonist')
  }
  return {
    id: created.colonistId,
    state: {
      ...created.state,
      colonists: {
        ...created.state.colonists,
        [created.colonistId]: { ...colonist, workplaceId },
      },
    },
  }
}

/**
 * Base geometry (8x8 test world):
 *   residence (1,1) · chain x=2, y=1..6 · workshop (1,6)
 * The chain is 6 contiguous operational roads: one network, endpoints
 * orthogonally adjacent to their building.
 */
const RESIDENCE_CELL: Cell = { x: 1, y: 1 }
const WORKSHOP_CELL: Cell = { x: 1, y: 6 }
const CHAIN_CELLS: readonly Cell[] = [
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 2, y: 4 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
]

interface Fixture {
  readonly state: SimulationState
  readonly residenceId: string
  readonly workshopId: string
  readonly colonistId: string
}

/** Residence and workplace linked by one common road network. */
const connectedFixture = (): Fixture => {
  let state = createTestState()
  const residence = operationalBuilding(
    state,
    'residence',
    RESIDENCE_CELL.x,
    RESIDENCE_CELL.y
  )
  state = residence.state
  const workshop = operationalBuilding(
    state,
    'workshop',
    WORKSHOP_CELL.x,
    WORKSHOP_CELL.y
  )
  state = workshop.state
  state = operationalRoads(state, CHAIN_CELLS)
  const colonist = withColonist(state, residence.id, workshop.id)
  return {
    state: colonist.state,
    residenceId: residence.id,
    workshopId: workshop.id,
    colonistId: colonist.id,
  }
}

/** Same buildings, but the two access roads belong to distinct networks. */
const disconnectedFixture = (): Fixture => {
  let state = createTestState()
  const residence = operationalBuilding(state, 'residence', 1, 1)
  state = residence.state
  const workshop = operationalBuilding(state, 'workshop', 1, 6)
  state = workshop.state
  state = operationalRoad(state, 2, 1).state
  state = operationalRoad(state, 2, 6).state
  const colonist = withColonist(state, residence.id, workshop.id)
  return {
    state: colonist.state,
    residenceId: residence.id,
    workshopId: workshop.id,
    colonistId: colonist.id,
  }
}

describe('residential-to-work mobility contract (Step 09G)', () => {
  it('A — residence and workplace on the same network are connected', () => {
    const { state, colonistId, residenceId, workshopId } = connectedFixture()
    const mobility = getColonistWorkMobility(state, colonistId)
    expect(mobility.colonistId).toBe(colonistId)
    expect(mobility.residenceId).toBe(residenceId)
    expect(mobility.workplaceId).toBe(workshopId)
    expect(mobility.mobilityConnected).toBe(true)
    // One network per endpoint, and it is the SAME network id.
    expect(mobility.residenceNetworkIds.length).toBe(1)
    expect(mobility.workplaceNetworkIds.length).toBe(1)
    expect(mobility.residenceNetworkIds).toEqual(mobility.workplaceNetworkIds)
  })

  it('B — distinct networks: each endpoint has access, no shared network', () => {
    const { state, colonistId } = disconnectedFixture()
    const mobility = getColonistWorkMobility(state, colonistId)
    expect(mobility.mobilityConnected).toBe(false)
    expect(mobility.residenceNetworkIds.length).toBe(1)
    expect(mobility.workplaceNetworkIds.length).toBe(1)
    // Both endpoints are road-accessible: only the network differs.
    const shared = mobility.residenceNetworkIds.filter((id) =>
      mobility.workplaceNetworkIds.includes(id)
    )
    expect(shared).toEqual([])
    expect(getRoadNetworks(state).length).toBe(2)
  })

  it('C — residence without road access is not connected', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    state = operationalRoad(state, 2, 6).state
    const colonist = withColonist(state, residence.id, workshop.id)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.mobilityConnected).toBe(false)
    expect(mobility.residenceNetworkIds).toEqual([])
    expect(mobility.workplaceNetworkIds.length).toBe(1)
  })

  it('D — workplace without road access is not connected', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    state = operationalRoad(state, 2, 1).state
    const colonist = withColonist(state, residence.id, workshop.id)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.mobilityConnected).toBe(false)
    expect(mobility.residenceNetworkIds.length).toBe(1)
    expect(mobility.workplaceNetworkIds).toEqual([])
  })

  it('E — under-construction roads give no mobility', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    // Real path: created roads start under construction (09C lifecycle).
    const created = createRoads(state, [...CHAIN_CELLS])
    state = created.state
    expect(
      Object.values(state.roads).every((road) => road.status === 'underConstruction')
    ).toBe(true)
    const colonist = withColonist(state, residence.id, workshop.id)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.mobilityConnected).toBe(false)
    expect(mobility.residenceNetworkIds).toEqual([])
    expect(mobility.workplaceNetworkIds).toEqual([])
  })

  it('F — under-construction buildings are not connected, even with roads', () => {
    let state = createTestState()
    // Under-construction endpoints (createBuilding default lifecycle).
    const residence = createBuilding(state, 'residence', 1, 1, 2)
    state = residence.state
    const workshop = createBuilding(state, 'workshop', 1, 6, 2)
    state = workshop.state
    state = operationalRoads(state, CHAIN_CELLS)
    const colonist = withColonist(state, residence.buildingId, workshop.buildingId)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.mobilityConnected).toBe(false)
    expect(mobility.residenceNetworkIds).toEqual([])
    expect(mobility.workplaceNetworkIds).toEqual([])
  })

  it('G — indirect network: several roads, endpoints far apart, still connected', () => {
    const { state, colonistId } = connectedFixture()
    // 5 rows apart, linked by 6 chained roads: no distance is consulted.
    expect(CHAIN_CELLS.length).toBe(6)
    const mobility = getColonistWorkMobility(state, colonistId)
    expect(mobility.mobilityConnected).toBe(true)
    expect(getRoadNetworks(state).length).toBe(1)
    expect(mobility.residenceNetworkIds).toEqual(mobility.workplaceNetworkIds)
  })

  it('H — several networks per building: one shared network is enough', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    // Residence: Nx1 = {(2,1)} isolated, Nx2 = {(1,2)..(1,5)} reaching the
    // workshop. (2,1) and (1,2) are diagonally placed: not connected.
    state = operationalRoad(state, 2, 1).state
    state = operationalRoads(state, [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
    ])
    // Workshop: Nx2 via (1,5), plus isolated Nx3 = {(2,6)}.
    state = operationalRoad(state, 2, 6).state
    const colonist = withColonist(state, residence.id, workshop.id)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.residenceNetworkIds.length).toBe(2)
    expect(mobility.workplaceNetworkIds.length).toBe(2)
    const shared = mobility.residenceNetworkIds.filter((id) =>
      mobility.workplaceNetworkIds.includes(id)
    )
    expect(shared.length).toBe(1)
    expect(mobility.mobilityConnected).toBe(true)
  })

  it('I — no common network: two networks on each side, still disconnected', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 6, 6)
    state = workshop.state
    // Residence side: (2,1) and (1,2) are Manhattan 2 apart -> two networks.
    state = operationalRoad(state, 2, 1).state
    state = operationalRoad(state, 1, 2).state
    // Workplace side: (5,6) and (6,5) are Manhattan 2 apart -> two networks.
    state = operationalRoad(state, 5, 6).state
    state = operationalRoad(state, 6, 5).state
    const colonist = withColonist(state, residence.id, workshop.id)
    const mobility = getColonistWorkMobility(colonist.state, colonist.id)
    expect(mobility.residenceNetworkIds.length).toBe(2)
    expect(mobility.workplaceNetworkIds.length).toBe(2)
    const shared = mobility.residenceNetworkIds.filter((id) =>
      mobility.workplaceNetworkIds.includes(id)
    )
    expect(shared).toEqual([])
    expect(mobility.mobilityConnected).toBe(false)
  })

  it('J — several colonists: results are independent per colonist', () => {
    const base = connectedFixture()
    // Second residence + isolated road network; same workplace as colonist-1.
    const residence2 = operationalBuilding(base.state, 'residence', 6, 1)
    let state = residence2.state
    state = operationalRoad(state, 6, 2).state
    const colonist2 = withColonist(state, residence2.id, base.workshopId)
    state = colonist2.state

    const first = getColonistWorkMobility(state, base.colonistId)
    const second = getColonistWorkMobility(state, colonist2.id)
    expect(first.mobilityConnected).toBe(true)
    expect(second.mobilityConnected).toBe(false)
    expect(second.residenceId).toBe(residence2.id)
    expect(second.workplaceId).toBe(base.workshopId)
    // Both share the workplace: the difference comes from the residence side.
    expect(second.workplaceNetworkIds).toEqual(first.workplaceNetworkIds)
    expect(second.residenceNetworkIds).not.toEqual(first.residenceNetworkIds)
  })

  it('K — colonist without workplace has no mobility relationship', () => {
    const base = connectedFixture()
    const jobless = withColonist(base.state, base.residenceId, null)
    const mobility = getColonistWorkMobility(jobless.state, jobless.id)
    expect(mobility.workplaceId).toBeNull()
    expect(mobility.workplaceNetworkIds).toEqual([])
    expect(mobility.mobilityConnected).toBe(false)
    // An incomplete endpoint yields the explicit "no mobility relationship"
    // shape: the query does not invent a partial residence side (09G §5).
    expect(mobility.residenceNetworkIds).toEqual([])
  })

  it('L — colonist without residence has no mobility relationship', () => {
    const base = connectedFixture()
    const colonist = base.state.colonists[base.colonistId]
    if (colonist === undefined) {
      throw new Error('test: colonist missing')
    }
    const homeless: SimulationState = {
      ...base.state,
      colonists: {
        ...base.state.colonists,
        [base.colonistId]: { ...colonist, residenceId: null },
      },
    }
    const mobility = getColonistWorkMobility(homeless, base.colonistId)
    expect(mobility.residenceId).toBeNull()
    expect(mobility.residenceNetworkIds).toEqual([])
    expect(mobility.mobilityConnected).toBe(false)
    // Unknown colonist: same explicit "no relationship" shape.
    expect(getColonistWorkMobility(homeless, 'colonist-unknown')).toEqual({
      colonistId: 'colonist-unknown',
      residenceId: null,
      workplaceId: null,
      residenceNetworkIds: [],
      workplaceNetworkIds: [],
      mobilityConnected: false,
    })
  })

  it('M — save/load: derived mobility survives, nothing is serialized', () => {
    const { state, colonistId } = connectedFixture()
    const before = getColonistWorkMobility(state, colonistId)
    expect(before.mobilityConnected).toBe(true)
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getColonistWorkMobility(loaded, colonistId)).toEqual(before)
    expect(SAVE_VERSION).toBe(8)
  })

  it('N — determinism and purity: same state, same result, state untouched', () => {
    const { state, colonistId } = connectedFixture()
    const first = getColonistWorkMobility(state, colonistId)
    const second = getColonistWorkMobility(state, colonistId)
    expect(second).toEqual(first)
    const hashBefore = hashCanonicalState(state)
    const serialBefore = serializeCanonicalState(state)
    getColonistWorkMobility(state, colonistId)
    expect(hashCanonicalState(state)).toBe(hashBefore)
    expect(serializeCanonicalState(state)).toBe(serialBefore)
    // Independently built identical fixture: identical derived result.
    const rebuilt = connectedFixture()
    expect(getColonistWorkMobility(rebuilt.state, rebuilt.colonistId)).toEqual(
      first
    )
  })

  it('O — insertion order of colonists and roads never affects the result', () => {
    const { state, colonistId } = connectedFixture()
    const expected = getColonistWorkMobility(state, colonistId)
    const reordered: SimulationState = {
      ...state,
      roads: Object.fromEntries(Object.entries(state.roads).reverse()),
      colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
    }
    expect(getColonistWorkMobility(reordered, colonistId)).toEqual(expected)
  })

  it('P — 09G has no gameplay consequence (09F behavior unchanged)', () => {
    const { state, colonistId, residenceId } = connectedFixture()
    const mobility = getColonistWorkMobility(state, colonistId)
    expect(mobility.mobilityConnected).toBe(true)
    // Mobility is a derived spatial fact only: the canonical state carries
    // no mobility field on the colonist.
    const colonist = state.colonists[colonistId]
    expect(colonist).toEqual({
      id: colonistId,
      residenceId,
      workplaceId: state.colonists[colonistId]?.workplaceId ?? null,
      // Step 10M: the assignment mode is canonical; mobility itself is still
      // a derived fact and never stored on the colonist.
      workplaceAssignmentMode: 'automatic',
      // Step 10Y: the construction crew assignment is canonical and null here.
      constructionAssignmentId: null,
    })
    expect(Object.keys(colonist ?? {})).not.toContain('mobilityConnected')
  })
})
