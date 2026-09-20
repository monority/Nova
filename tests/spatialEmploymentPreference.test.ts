/**
 * Spatial employment preference tests (Step 09M).
 *
 * Rule under test:
 *   a colonist may only work in a Workshop whose residence is linked by the
 *   operational road network (09K gate, unchanged), and among those eligible
 *   Workshops it chooses the one at the SMALLEST operational road distance
 *   from its residence; a perfect tie is broken by the lowest Workshop id.
 *
 * Distance contract (see `getRoadDistance` / `getRoadDistanceBetweenBuildings`):
 *   minimum number of orthogonal road-to-road steps (BFS edges) between any
 *   operational contact road of the residence and any operational contact
 *   road of the Workshop. Under-construction roads never participate. The
 *   value is derived only — never persisted, never hashed, never cached.
 *
 * Blocks M-A .. M-S follow the step's mandatory list.
 */

import { describe, expect, it } from 'vitest'

import {
  areBuildingsMobilityConnected,
  assignJobs,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  getBuildingRoadAccess,
  getEmploymentSummary,
  getRoadDistance,
  getRoadDistanceBetweenBuildings,
  getRoadIdAtCell,
  getRoadNetworkCount,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialUpkeepDueForTick,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

type Cell = { readonly x: number; readonly y: number }

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

/** Road at a cell with an explicit status (operational unless stated). */
const road = (
  state: SimulationState,
  x: number,
  y: number,
  status: 'operational' | 'underConstruction' = 'operational'
): SimulationState => {
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
        status,
        constructionRemaining: status === 'operational' ? 0 : 1,
      },
    },
  }
}

const roads = (
  state: SimulationState,
  cells: readonly Cell[],
  status: 'operational' | 'underConstruction' = 'operational'
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = road(next, cell.x, cell.y, status)
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

const workplaceOf = (state: SimulationState, colonistId: string): string | null =>
  state.colonists[colonistId]?.workplaceId ?? null

const distance = (
  state: SimulationState,
  residenceId: string,
  workshopId: string
): number | null => getRoadDistanceBetweenBuildings(state, residenceId, workshopId)

// ---------------------------------------------------------------------------
// M-A — direct road
// ---------------------------------------------------------------------------

describe('M-A — direct road', () => {
  it('M-A — a single shared road cell connects the pair at distance 0', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 3)
    state = workshop.state
    state = roads(state, [{ x: 1, y: 2 }])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(distance(state, residence.id, workshop.id)).toBe(0)
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBe(workshop.id)
    expect(materialProductionForTick(assigned)).toBe(2)
    expect(materialUpkeepDueForTick(assigned)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// M-B / M-C — short vs long, and the nearest wins even with a higher id
// ---------------------------------------------------------------------------

describe('M-B / M-C — nearest distance beats id order', () => {
  /**
   * R(1,1). One chain (1,2),(2,2),(3,2),(4,2),(5,2).
   *   W_near at (1,3) shares contact (1,2)  -> distance 0
   *   W_far  at (5,3) uses contact (5,2)    -> distance 4
   */
  const shortVsLong = (nearFirst: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const firstAt = nearFirst ? { x: 1, y: 3 } : { x: 5, y: 3 }
    const secondAt = nearFirst ? { x: 5, y: 3 } : { x: 1, y: 3 }
    const firstBuilt = operationalBuilding(state, 'workshop', firstAt.x, firstAt.y)
    state = firstBuilt.state
    const secondBuilt = operationalBuilding(state, 'workshop', secondAt.x, secondAt.y)
    state = secondBuilt.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    const nearId = nearFirst ? firstBuilt.id : secondBuilt.id
    const farId = nearFirst ? secondBuilt.id : firstBuilt.id
    return { state, colonistId: colonist.id, nearId, farId }
  }

  it('M-B — two eligible Workshops: the nearer one is chosen', () => {
    const fixture = shortVsLong(true)
    expect(distance(fixture.state, 'building-1', fixture.nearId)).toBe(0)
    expect(distance(fixture.state, 'building-1', fixture.farId)).toBe(4)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.nearId)
    expect(countWorkersAt(assigned, fixture.farId)).toBe(0)
  })

  it('M-C — the nearest Workshop wins even when it has the HIGHER id', () => {
    // Far Workshop created first (lower id); near Workshop created second.
    const fixture = shortVsLong(false)
    expect(fixture.nearId > fixture.farId).toBe(true)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.nearId)
    expect(countWorkersAt(assigned, fixture.farId)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// M-D — equal distance
// ---------------------------------------------------------------------------

describe('M-D — equal distance ties break on the lowest Workshop id', () => {
  /** R(3,1) between two Workshops, one shared contact road each. */
  const symmetric = (leftFirst: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 3, 1)
    state = residence.state
    const firstAt = leftFirst ? { x: 1, y: 1 } : { x: 5, y: 1 }
    const secondAt = leftFirst ? { x: 5, y: 1 } : { x: 1, y: 1 }
    const firstBuilt = operationalBuilding(state, 'workshop', firstAt.x, firstAt.y)
    state = firstBuilt.state
    const secondBuilt = operationalBuilding(state, 'workshop', secondAt.x, secondAt.y)
    state = secondBuilt.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return {
      state,
      colonistId: colonist.id,
      firstId: firstBuilt.id,
      secondId: secondBuilt.id,
      lowestId: firstBuilt.id < secondBuilt.id ? firstBuilt.id : secondBuilt.id,
    }
  }

  it('M-D — perfect tie: the lowest-id Workshop wins, independently of record order', () => {
    const fixture = symmetric(true)
    // Both Workshops sit at distance 0 from the residence (shared contacts).
    expect(distance(fixture.state, 'building-1', fixture.firstId)).toBe(0)
    expect(distance(fixture.state, 'building-1', fixture.secondId)).toBe(0)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.lowestId)

    // Reversing the record insertion order keeps ids and the result.
    const reversed: SimulationState = {
      ...assigned,
      buildings: Object.fromEntries(Object.entries(assigned.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(assigned.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(assigned))
    expect(workplaceOf(assignJobs(reversed), fixture.colonistId)).toBe(
      fixture.lowestId
    )
  })

  it('M-D2 — reversed creation order still picks the lowest id of that arrangement', () => {
    const fixture = symmetric(false)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.lowestId)
  })
})

// ---------------------------------------------------------------------------
// M-E / M-F / M-G — multiple contacts on both sides, shortest pair wins
// ---------------------------------------------------------------------------

describe('M-E / M-F / M-G — multi-contact buildings use the shortest pair', () => {
  /**
   * A closed loop gives BOTH buildings two contact roads:
   *   short leg: (2,1),(3,1),(4,1)            R contact (2,1), W contact (4,1)
   *   long  leg: (1,2),(2,2),(3,2),(4,2),(5,2) R contact (1,2), W contact (5,2)
   * The legs join at (2,1)-(2,2), so this is ONE network.
   */
  const loop = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 1)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, residenceId: residence.id, workshopId: workshop.id, colonistId: colonist.id }
  }

  it('M-E — a residence touching several roads is measured through its best contact', () => {
    const fixture = loop()
    const access = getBuildingRoadAccess(fixture.state, fixture.residenceId)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds.length).toBe(2)
    // (2,1) -> (3,1) -> (4,1) = 2 edges is the shortest pair.
    expect(distance(fixture.state, fixture.residenceId, fixture.workshopId)).toBe(2)
  })

  it('M-F — a Workshop touching several roads is measured through its best contact', () => {
    const fixture = loop()
    const access = getBuildingRoadAccess(fixture.state, fixture.workshopId)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds.length).toBe(2)
    expect(distance(fixture.state, fixture.residenceId, fixture.workshopId)).toBe(2)
  })

  it('M-G — the shortest contact pair wins over the long leg (4)', () => {
    const fixture = loop()
    expect(getRoadNetworkCount(fixture.state)).toBe(1)
    // Long leg alone would report 4; the minimum over all contact pairs is 2.
    expect(distance(fixture.state, fixture.residenceId, fixture.workshopId)).toBe(2)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.workshopId)
  })

  it('M-G2 — the answer does not depend on which contact is discovered first', () => {
    const fixture = loop()
    // Reversing road ids (record order) must not change the distance.
    const reversed: SimulationState = {
      ...fixture.state,
      roads: Object.fromEntries(Object.entries(fixture.state.roads).reverse()),
    }
    expect(distance(reversed, fixture.residenceId, fixture.workshopId)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// M-H — disconnected
// ---------------------------------------------------------------------------

describe('M-H — no operational path', () => {
  it('M-H — separate networks: distance is null and the Workshop is ineligible', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 5)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 5, y: 6 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(distance(state, residence.id, workshop.id)).toBeNull()
    expect(areBuildingsMobilityConnected(state, residence.id, workshop.id)).toBe(
      false
    )
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBeNull()
    expect(materialProductionForTick(assigned)).toBe(0)
    expect(materialUpkeepDueForTick(assigned)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// M-I — under construction
// ---------------------------------------------------------------------------

describe('M-I — under-construction roads never contribute', () => {
  it('M-I — a road under construction cannot make a Workshop eligible', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const reachable = operationalBuilding(state, 'workshop', 1, 3)
    state = reachable.state
    const blocked = operationalBuilding(state, 'workshop', 3, 1)
    state = blocked.state
    // Reachable Workshop: operational shared contact (1,2).
    state = road(state, 1, 2, 'operational')
    // Blocked Workshop: its only contact (2,1) is UNDER CONSTRUCTION.
    state = road(state, 2, 1, 'underConstruction')
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(state.roads[getRoadIdAtCell(state, { x: 2, y: 1 }) ?? '']?.status).toBe(
      'underConstruction'
    )
    expect(distance(state, residence.id, blocked.id)).toBeNull()
    expect(distance(state, residence.id, reachable.id)).toBe(0)
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBe(reachable.id)
    expect(countWorkersAt(assigned, blocked.id)).toBe(0)
  })

  it('M-I2 — completing the road makes the second Workshop eligible', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const reachable = operationalBuilding(state, 'workshop', 1, 3)
    state = reachable.state
    const blocked = operationalBuilding(state, 'workshop', 3, 1)
    state = blocked.state
    state = road(state, 1, 2, 'operational')
    state = road(state, 2, 1, 'underConstruction')
    // Complete it without touching the tick lifecycle.
    const roadId = getRoadIdAtCell(state, { x: 2, y: 1 })
    if (roadId === null) throw new Error('test helper: missing road')
    const blockedRoad = state.roads[roadId]!
    state = {
      ...state,
      roads: {
        ...state.roads,
        [roadId]: { ...blockedRoad, status: 'operational', constructionRemaining: 0 },
      },
    }
    // (2,1) is now a contact of BOTH the residence and the second Workshop.
    expect(distance(state, residence.id, blocked.id)).toBe(0)
    // Both Workshops are at distance 0 -> tie -> lowest id wins (first built).
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBe(reachable.id)
  })
})

// ---------------------------------------------------------------------------
// M-J — network partition
// ---------------------------------------------------------------------------

describe('M-J — network partition stays partitioned', () => {
  it('M-J — a residence reaching two networks stays multi-network', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const near = operationalBuilding(state, 'workshop', 3, 1)
    state = near.state
    const far = operationalBuilding(state, 'workshop', 1, 5)
    state = far.state
    // N1 (short): (2,1) shared contact -> distance 0.
    state = road(state, 2, 1, 'operational')
    // N2 (long): (1,2),(1,3),(1,4) -> 2 road steps to the contact (1,4).
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(getRoadNetworkCount(state)).toBe(2)
    expect(distance(state, residence.id, near.id)).toBe(0)
    expect(distance(state, residence.id, far.id)).toBe(2)
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBe(near.id)
    expect(getRoadNetworkCount(assigned)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// M-K — network merge
// ---------------------------------------------------------------------------

describe('M-K — merging networks makes a Workshop eligible', () => {
  it('M-K — bridging two networks creates the path and the employment', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 1)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 4, y: 1 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(getRoadNetworkCount(state)).toBe(2)
    expect(distance(state, residence.id, workshop.id)).toBeNull()
    expect(workplaceOf(assignJobs(state), colonist.id)).toBeNull()

    // Bridge: (3,1) joins (2,1) and (4,1).
    const merged = road(state, 3, 1, 'operational')
    expect(getRoadNetworkCount(merged)).toBe(1)
    expect(distance(merged, residence.id, workshop.id)).toBe(2)
    expect(workplaceOf(assignJobs(merged), colonist.id)).toBe(workshop.id)
  })
})

// ---------------------------------------------------------------------------
// M-L — reassignment after the network changes
// ---------------------------------------------------------------------------

describe('M-L — the preference is re-evaluated against the current network', () => {
  /**
   * R(1,1). W_A(1,4) reached via (1,2),(1,3)   -> 1 road step.
   * W_B(3,1) reached via (1,2),(2,2),(3,2)    -> 2 road steps.
   * Adding the shortcut (2,1) puts W_B at distance 0 (shared contact with
   * the residence) while W_A stays at 1, so the worker must move.
   */
  const build = (withShortcut: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 4)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 3, 1)
    state = workshopB.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ])
    if (withShortcut) {
      state = road(state, 2, 1, 'operational')
    }
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, colonistId: colonist.id, workshopAId: workshopA.id, workshopBId: workshopB.id }
  }

  it('M-L — a shortcut that makes another Workshop nearer reassigns the worker', () => {
    const before = build(false)
    expect(distance(before.state, 'building-1', before.workshopAId)).toBe(1)
    expect(distance(before.state, 'building-1', before.workshopBId)).toBe(2)
    const assignedBefore = assignJobs(before.state)
    expect(workplaceOf(assignedBefore, before.colonistId)).toBe(before.workshopAId)

    // Same canonical state plus one road: the preference is recomputed.
    const shortcut = road(before.state, 2, 1, 'operational')
    expect(distance(shortcut, 'building-1', before.workshopBId)).toBe(0)
    expect(distance(shortcut, 'building-1', before.workshopAId)).toBe(1)
    const assignedAfter = assignJobs(shortcut)
    expect(workplaceOf(assignedAfter, before.colonistId)).toBe(before.workshopBId)
    expect(countWorkersAt(assignedAfter, before.workshopAId)).toBe(0)
  })

  it('M-L2 — breaking the shortcut restores the previous choice', () => {
    const fixture = build(true)
    const assigned = assignJobs(fixture.state)
    expect(workplaceOf(assigned, fixture.colonistId)).toBe(fixture.workshopBId)

    // Remove the shortcut: W_B falls back to 2, W_A to 1.
    const shortcutId = getRoadIdAtCell(fixture.state, { x: 2, y: 1 })
    if (shortcutId === null) throw new Error('test helper: missing shortcut')
    const withoutShortcut = {
      ...fixture.state,
      roads: Object.fromEntries(
        Object.entries(fixture.state.roads).filter(([id]) => id !== shortcutId)
      ),
    }
    const reassigned = assignJobs(withoutShortcut)
    expect(workplaceOf(reassigned, fixture.colonistId)).toBe(fixture.workshopAId)
  })
})

// ---------------------------------------------------------------------------
// M-M / M-N — capacity
// ---------------------------------------------------------------------------

describe('M-M / M-N — capacity and multiple colonists', () => {
  it('M-M — one Workshop, two colonists: exactly one job', () => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const residenceB = operationalBuilding(state, 'residence', 1, 3)
    state = residenceB.state
    const workshop = operationalBuilding(state, 'workshop', 3, 2)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ])
    const cA = withColonist(state, residenceA.id)
    state = cA.state
    const cB = withColonist(state, residenceB.id)
    state = cB.state

    const assigned = assignJobs(state)
    expect(getEmploymentSummary(assigned)).toEqual({
      population: 2,
      employed: 1,
      unemployed: 1,
      jobCapacity: 1,
      vacantJobs: 0,
    })
    // Lowest colonist id wins the single seat.
    expect(workplaceOf(assigned, cA.id)).toBe(workshop.id)
    expect(workplaceOf(assigned, cB.id)).toBeNull()
  })

  it('M-N — two Workshops / two colonists on independent networks', () => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    state = road(state, 1, 2, 'operational')
    const residenceB = operationalBuilding(state, 'residence', 5, 1)
    state = residenceB.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = road(state, 5, 2, 'operational')
    const cA = withColonist(state, residenceA.id)
    state = cA.state
    const cB = withColonist(state, residenceB.id)
    state = cB.state

    const assigned = assignJobs(state)
    expect(getRoadNetworkCount(assigned)).toBe(2)
    expect(workplaceOf(assigned, cA.id)).toBe(workshopA.id)
    expect(workplaceOf(assigned, cB.id)).toBe(workshopB.id)
    expect(materialProductionForTick(assigned)).toBe(4)
    expect(materialUpkeepDueForTick(assigned)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// M-O — insertion-order invariance
// ---------------------------------------------------------------------------

describe('M-O — insertion-order invariance', () => {
  it('M-O — same result for reversed record order and reversed road-id order', () => {
    const build = (roadCells: readonly Cell[]) => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const workshopA = operationalBuilding(state, 'workshop', 1, 3)
      state = workshopA.state
      const workshopB = operationalBuilding(state, 'workshop', 5, 3)
      state = workshopB.state
      state = roads(state, roadCells)
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      return { state, colonistId: colonist.id, workshopAId: workshopA.id, workshopBId: workshopB.id }
    }
    const ascending = build([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const descending = build([
      { x: 5, y: 2 },
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ])
    const assignedAsc = assignJobs(ascending.state)
    const assignedDesc = assignJobs(descending.state)
    // W_A shares contact (1,2) -> distance 0; W_B uses (5,2) -> distance 4.
    expect(workplaceOf(assignedAsc, ascending.colonistId)).toBe(
      ascending.workshopAId
    )
    expect(workplaceOf(assignedDesc, descending.colonistId)).toBe(
      descending.workshopAId
    )
    // Distances are identical regardless of road-id allocation order.
    expect(distance(ascending.state, 'building-1', ascending.workshopBId)).toBe(4)
    expect(distance(descending.state, 'building-1', descending.workshopBId)).toBe(4)

    // Reversing the record maps of a settled state also changes nothing.
    const reversedRecords: SimulationState = {
      ...assignedAsc,
      buildings: Object.fromEntries(Object.entries(assignedAsc.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(assignedAsc.roads).reverse()),
      colonists: Object.fromEntries(Object.entries(assignedAsc.colonists).reverse()),
    }
    expect(hashCanonicalState(reversedRecords)).toBe(hashCanonicalState(assignedAsc))
    expect(workplaceOf(assignJobs(reversedRecords), ascending.colonistId)).toBe(
      ascending.workshopAId
    )
  })
})

// ---------------------------------------------------------------------------
// M-P — repeated assignment (no churn)
// ---------------------------------------------------------------------------

describe('M-P — repeated assignment does not churn', () => {
  it('M-P — assignJobs is a no-op reference when the choice is already optimal', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    const once = assignJobs(state)
    expect(workplaceOf(once, colonist.id)).toBe(workshopA.id)
    const twice = assignJobs(once)
    expect(twice).toBe(once)
    const thrice = assignJobs(twice)
    expect(thrice).toBe(once)
  })
})

// ---------------------------------------------------------------------------
// M-Q — deterministic distance
// ---------------------------------------------------------------------------

describe('M-Q — distance is a pure derived value', () => {
  it('M-Q — same state, same distance; querying never mutates the state', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 1)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    const before = hashCanonicalState(state)
    const first = distance(state, residence.id, workshop.id)
    const second = distance(state, residence.id, workshop.id)
    expect(first).toBe(2)
    expect(second).toBe(first)
    expect(hashCanonicalState(state)).toBe(before)
    // The lower-level primitive is equally stable.
    const accessA = getBuildingRoadAccess(state, residence.id)
    const accessB = getBuildingRoadAccess(state, workshop.id)
    expect(getRoadDistance(state, accessA.roadIds, accessB.roadIds)).toBe(first)
    expect(hashCanonicalState(state)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// M-R / M-S — persistence and hash
// ---------------------------------------------------------------------------

describe('M-R / M-S — no persistence, stable hash', () => {
  const scenario = (): SimulationState => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return assignJobs(state)
  }

  it('M-R — SAVE_VERSION 4, and the distance is absent from the save', () => {
    expect(SAVE_VERSION).toBe(4)
    const state = scenario()
    const raw = serializeSave(state)
    for (const fragment of ['distance', 'roadDistance', 'preference']) {
      expect(raw.includes(fragment)).toBe(false)
    }
    const loaded = loadSave(raw)
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
  })

  it('M-S — computing distances leaves the canonical hash untouched', () => {
    const state = scenario()
    const before = hashCanonicalState(state)
    for (const workshopId of Object.keys(state.buildings)) {
      if (state.buildings[workshopId]?.type !== 'workshop') continue
      distance(state, 'building-1', workshopId)
    }
    expect(hashCanonicalState(state)).toBe(before)
    // Deterministic replay: the same fixture yields the same hash.
    expect(hashCanonicalState(scenario())).toBe(before)
  })
})
