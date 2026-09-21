/**
 * Transport / Employment Boundary Audit tests (Step 09N).
 *
 * AUDIT ONLY. This file measures what the current road → access → mobility →
 * employment → spatial preference → production → upkeep chain actually does,
 * scenario by scenario (09N blocks A..N). It does not change any production
 * rule: all fixtures are built with the existing public domain API, and the
 * only state manipulations performed here are audit-side status edits
 * (simulating a road rupture/repair, which has no demolition API yet).
 *
 * Every assertion is a MEASURED FACT (employment, production, upkeep, stock,
 * road count, road cost, network count, distance, assignment). Gameplay
 * classifications (A strong / B useful / C equivalent / D informational /
 * E missing) live in docs/roadmap/Step09N.md, not here.
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
  getRoadDistanceBetweenBuildings,
  getRoadIdAtCell,
  getRoadNetworkCount,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialUpkeepDueForTick,
  produceMaterial,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  validateRoadsPlacement,
  type BuildingType,
  type RoadStatus,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

type Cell = { readonly x: number; readonly y: number }

// ---------------------------------------------------------------------------
// Fixture helpers (same shapes as the 09M test file)
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

const road = (
  state: SimulationState,
  x: number,
  y: number,
  status: RoadStatus = 'operational'
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

/**
 * Roads through the CANONICAL command path: validateRoadsPlacement
 * (dedupe + normalize + validate) then createRoads — exactly how the
 * placeRoads command allocates ids, so id allocation is input-order
 * independent.
 */
const roadsBatch = (
  state: SimulationState,
  cells: readonly Cell[],
  status: RoadStatus = 'operational'
): SimulationState => {
  const validation = validateRoadsPlacement(state, cells)
  if (!validation.valid) {
    throw new Error(`audit helper: invalid road batch (${validation.reason})`)
  }
  const created = createRoads(state, validation.cells)
  let next = created.state.roads
  for (const id of created.roadIds) {
    const target = next[id]
    if (target === undefined) {
      throw new Error('audit helper: batch road missing')
    }
    next = {
      ...next,
      [id]: {
        ...target,
        status,
        constructionRemaining: status === 'operational' ? 0 : 1,
      },
    }
  }
  return { ...created.state, roads: next }
}

const roads = (
  state: SimulationState,
  cells: readonly Cell[],
  status: RoadStatus = 'operational'
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = road(next, cell.x, cell.y, status)
  }
  return next
}

/** AUDIT-SIDE status edit: flip an existing road between the two statuses. */
const setRoadStatus = (
  state: SimulationState,
  x: number,
  y: number,
  status: RoadStatus
): SimulationState => {
  const id = getRoadIdAtCell(state, { x, y })
  if (id === null) {
    throw new Error(`audit helper: no road at (${x},${y})`)
  }
  const target = state.roads[id]
  if (target === undefined) {
    throw new Error('audit helper: road missing')
  }
  return {
    ...state,
    roads: {
      ...state.roads,
      [id]: {
        ...target,
        status,
        constructionRemaining: status === 'operational' ? 0 : 1,
      },
    },
  }
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

/** Full audit measurement block for one state. */
const measure = (state: SimulationState) => {
  const roadCount = Object.keys(state.roads).length
  return {
    employment: getEmploymentSummary(state),
    production: materialProductionForTick(state),
    upkeepDue: materialUpkeepDueForTick(state),
    stock: state.resources.construction,
    networks: getRoadNetworkCount(state),
    roadCount,
    roadCost: roadCount * ROAD_CONSTRUCTION_COST,
  }
}

// ---------------------------------------------------------------------------
// A — Distance utile
// ---------------------------------------------------------------------------

describe('A — distance changes the choice, not the aggregate', () => {
  /**
   * R(1,1); chain (1,2)..(5,2); W_near(1,3) d0; W_far(5,3) d4.
   * W_far created FIRST so it holds the lower id.
   */
  const distanceFixture = (onlyFar: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const far = operationalBuilding(state, 'workshop', 5, 3)
    state = far.state
    let nearId: string | null = null
    if (!onlyFar) {
      const near = operationalBuilding(state, 'workshop', 1, 3)
      state = near.state
      nearId = near.id
    }
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, colonistId: colonist.id, farId: far.id, nearId }
  }

  it('A1 — nearest workshop is chosen even with the higher id', () => {
    const f = distanceFixture(false)
    expect(f.nearId).not.toBeNull()
    expect(distance(f.state, 'building-1', f.nearId!)).toBe(0)
    expect(distance(f.state, 'building-1', f.farId)).toBe(4)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.nearId)
    expect(measure(assigned)).toMatchObject({
      production: 2,
      upkeepDue: 1,
      networks: 1,
      roadCount: 5,
      roadCost: 25,
    })
  })

  it('A2 — with only the far workshop the economy is identical', () => {
    const f = distanceFixture(true)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.farId)
    expect(measure(assigned)).toMatchObject({
      production: 2,
      upkeepDue: 1,
      roadCost: 25,
    })
  })
})

// ---------------------------------------------------------------------------
// B — Distance sans capacité (slack capacity)
// ---------------------------------------------------------------------------

describe('B — one colonist, two workshops, two free jobs', () => {
  it('B1 — distance decides while capacity is slack', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const far = operationalBuilding(state, 'workshop', 5, 3)
    state = far.state
    const near = operationalBuilding(state, 'workshop', 1, 3)
    state = near.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const c1 = withColonist(state, residence.id)
    state = c1.state

    const assigned = assignJobs(state)
    // Distance (not id order) decides which of the two free jobs is taken.
    expect(workplaceOf(assigned, c1.id)).toBe(near.id)
    expect(countWorkersAt(assigned, far.id)).toBe(0)
    expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
  })

  it('B2 — a second colonist saturates capacity; the far workshop is then used', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const far = operationalBuilding(state, 'workshop', 5, 3)
    state = far.state
    const near = operationalBuilding(state, 'workshop', 1, 3)
    state = near.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const c1 = withColonist(state, residence.id)
    state = c1.state
    const c2 = withColonist(state, residence.id)
    state = c2.state

    const assigned = assignJobs(state)
    // First colonist keeps the near slot; the second fills the far one.
    expect(workplaceOf(assigned, c1.id)).toBe(near.id)
    expect(workplaceOf(assigned, c2.id)).toBe(far.id)
    expect(measure(assigned)).toMatchObject({
      employment: {
        population: 2,
        employed: 2,
        jobCapacity: 2,
        vacantJobs: 0,
      },
      production: 4,
      upkeepDue: 2,
    })
  })
})

// ---------------------------------------------------------------------------
// C — Distance avec capacité saturée (mapping under reversed ids)
// ---------------------------------------------------------------------------

describe('C — two colonists, two workshops, reversed ids', () => {
  it('C1 — each colonist lands on its own nearest workshop; full employment', () => {
    let state = createTestState()
    const r1 = operationalBuilding(state, 'residence', 1, 1)
    state = r1.state
    const r2 = operationalBuilding(state, 'residence', 5, 1)
    state = r2.state
    // W_b is far from R1 but near R2; created FIRST (lower id).
    const wb = operationalBuilding(state, 'workshop', 5, 3)
    state = wb.state
    const wa = operationalBuilding(state, 'workshop', 1, 3)
    state = wa.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const c1 = withColonist(state, r1.id)
    state = c1.state
    const c2 = withColonist(state, r2.id)
    state = c2.state

    expect(distance(state, r1.id, wa.id)).toBe(0)
    expect(distance(state, r1.id, wb.id)).toBe(4)
    expect(distance(state, r2.id, wb.id)).toBe(0)
    expect(distance(state, r2.id, wa.id)).toBe(4)

    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, c1.id)).toBe(wa.id)
    expect(workplaceOf(assigned, c2.id)).toBe(wb.id)
    expect(measure(assigned)).toMatchObject({
      production: 4,
      upkeepDue: 2,
      networks: 1,
      roadCost: 25,
    })
  })
})

// ---------------------------------------------------------------------------
// D — Rupture de réseau
// ---------------------------------------------------------------------------

describe('D — breaking an intermediate road', () => {
  /** Scenario A fixture, colonist assigned to the near workshop. */
  const ruptureFixture = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const far = operationalBuilding(state, 'workshop', 5, 3)
    state = far.state
    const near = operationalBuilding(state, 'workshop', 1, 3)
    state = near.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    state = assignJobs(state)
    return { state, colonistId: colonist.id, nearId: near.id, farId: far.id }
  }

  it('D1 — rupture elsewhere in the network changes nothing', () => {
    const f = ruptureFixture()
    // Break the chain between the two workshop branches.
    const broken = setRoadStatus(f.state, 3, 2, 'underConstruction')
    expect(getRoadNetworkCount(broken)).toBe(2)
    const reassigned = assignJobs(broken)
    // The colonist's own pair (R–W_near) is untouched: assignment retained.
    expect(workplaceOf(reassigned, f.colonistId)).toBe(f.nearId)
    expect(measure(reassigned)).toMatchObject({ production: 2, upkeepDue: 1 })
  })

  it('D2 — rupturing the residence contact unemploys cleanly, no stale derived data', () => {
    const f = ruptureFixture()
    const broken = setRoadStatus(f.state, 1, 2, 'underConstruction')
    const reassigned = assignJobs(broken)
    expect(workplaceOf(reassigned, f.colonistId)).toBeNull()
    expect(
      areBuildingsMobilityConnected(reassigned, 'building-1', f.nearId)
    ).toBe(false)
    expect(distance(reassigned, 'building-1', f.nearId)).toBeNull()
    expect(measure(reassigned)).toMatchObject({
      employment: { employed: 0, unemployed: 1 },
      production: 0,
      upkeepDue: 0,
    })
    // Roads still exist (roadCount unchanged); only status changed.
    expect(measure(reassigned).roadCount).toBe(measure(f.state).roadCount)
    // Re-running the assignment is a fixed point (no churn).
    expect(serializeCanonicalState(assignJobs(reassigned))).toBe(
      serializeCanonicalState(reassigned)
    )
  })
})

// ---------------------------------------------------------------------------
// E — Raccordement de réseau
// ---------------------------------------------------------------------------

describe('E — bridging two networks', () => {
  /**
   * R(3,3) touches netA {(3,2),(3,1),(2,1)} via (3,2) and netB
   * {(3,4),(3,5),(4,5)} via (3,4). W_a on netA at d2, W_b on netB at d2.
   * Bridge chain: (4,2),(4,3),(4,4).
   */
  const twoNetworksFixture = (withWorkshops: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 3, 3)
    state = residence.state
    let wa: string | null = null
    let wb: string | null = null
    if (withWorkshops) {
      const a = operationalBuilding(state, 'workshop', 1, 1)
      state = a.state
      wa = a.id
      const b = operationalBuilding(state, 'workshop', 5, 5)
      state = b.state
      wb = b.id
    }
    state = roads(state, [
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, colonistId: colonist.id, wa, wb }
  }

  const bridge = (state: SimulationState): SimulationState =>
    roads(state, [
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
    ])

  it('E1 — bridging already-eligible networks changes access, not outcomes', () => {
    const f = twoNetworksFixture(true)
    expect(getRoadNetworkCount(f.state)).toBe(2)
    const before = assignJobs(f.state)
    const beforeM = measure(before)
    expect(beforeM.employment.employed).toBe(1)
    expect(beforeM.production).toBe(2)
    expect(beforeM.upkeepDue).toBe(1)
    // Both workshops eligible before the bridge, tied at distance 2.
    const chosenBefore = workplaceOf(before, f.colonistId)
    expect(distance(f.state, 'building-1', chosenBefore ?? '')).toBe(2)

    const bridged = assignJobs(bridge(f.state))
    const afterM = measure(bridged)
    expect(getRoadNetworkCount(bridge(f.state))).toBe(1)
    expect(afterM.employment.employed).toBe(beforeM.employment.employed)
    expect(afterM.production).toBe(beforeM.production)
    expect(afterM.upkeepDue).toBe(beforeM.upkeepDue)
    expect(workplaceOf(bridged, f.colonistId)).toBe(chosenBefore)
  })

  it('E2 — bridging creates real employment only when it changes eligibility', () => {
    // Same layout, but the ONLY workshop sits on the far network.
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 3, 3)
    state = residence.state
    const wb = operationalBuilding(state, 'workshop', 5, 5)
    state = wb.state
    state = roads(state, [
      { x: 3, y: 2 },
      { x: 4, y: 5 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(getRoadNetworkCount(state)).toBe(2)
    expect(distance(state, residence.id, wb.id)).toBeNull()
    const before = assignJobs(state)
    expect(workplaceOf(before, colonist.id)).toBeNull()
    expect(measure(before)).toMatchObject({ production: 0, upkeepDue: 0 })

    // The bridge cell adjacent to the Workshop becomes a second Workshop
    // contact: measured distance is the minimum over contacts.
    const bridged = assignJobs(
      roads(state, [
        { x: 4, y: 2 },
        { x: 5, y: 2 },
        { x: 5, y: 3 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
      ])
    )
    expect(getRoadNetworkCount(bridged)).toBe(1)
    expect(distance(bridged, residence.id, wb.id)).toBe(4)
    expect(workplaceOf(bridged, colonist.id)).toBe(wb.id)
    expect(measure(bridged)).toMatchObject({ production: 2, upkeepDue: 1 })
  })
})

// ---------------------------------------------------------------------------
// F — Géométrie équivalente
// ---------------------------------------------------------------------------

describe('F — equal-cost geometries are economically equivalent', () => {
  /** Each variant: 1 residence, 1 workshop, 3 roads → cost 15. */
  const geometry = (cells: readonly Cell[], wx: number, wy: number) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', wx, wy)
    state = workshop.state
    state = roads(state, cells)
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, residenceId: residence.id, workshopId: workshop.id, colonistId: colonist.id }
  }

  const straight = () =>
    geometry(
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ],
      5,
      1
    )
  const lShape = () =>
    geometry(
      [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      3,
      3
    )
  const withBranch = () =>
    geometry(
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 2 },
      ],
      5,
      1
    )
  const withLoop = () =>
    geometry(
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 2 },
      ],
      5,
      1
    )

  it('F1 — straight and L shapes: same cost, same distance, same economy', () => {
    for (const f of [straight(), lShape()]) {
      expect(measure(f.state).roadCost).toBe(15)
      expect(distance(f.state, f.residenceId, f.workshopId)).toBe(2)
      const assigned = assignJobs(f.state)
      expect(workplaceOf(assigned, f.colonistId)).toBe(f.workshopId)
      expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
    }
  })

  it('F2 — branch and loop add cost without changing distance or economy', () => {
    for (const f of [withBranch(), withLoop()]) {
      expect(measure(f.state).roadCost).toBeGreaterThan(15)
      expect(distance(f.state, f.residenceId, f.workshopId)).toBe(2)
      const assigned = assignJobs(f.state)
      expect(workplaceOf(assigned, f.colonistId)).toBe(f.workshopId)
      expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
    }
  })

  it('F3 — a longer detour keeps employment: distance alone does not move output', () => {
    // 5-road detour to the same workshop corner: cost 25, distance 4.
    const f = geometry(
      [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
      ],
      5,
      1
    )
    expect(measure(f.state).roadCost).toBe(25)
    expect(distance(f.state, f.residenceId, f.workshopId)).toBe(4)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.workshopId)
    expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
  })
})

// ---------------------------------------------------------------------------
// G — Résidence multi-réseaux
// ---------------------------------------------------------------------------

describe('G — residence touching two networks chooses across both', () => {
  /**
   * R(3,3): contact (2,3) on netA [(2,3),(2,2),(2,1)], contact (4,3) on
   * netB [(4,3),(4,4),(4,5)]. W_a(1,1) on netA d2; W_b(5,5) on netB d2.
   */
  const multiNetwork = (equal: boolean, bFirst: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 3, 3)
    state = residence.state
    let wa: string | null = null
    let wb: string | null = null
    if (bFirst) {
      const b = operationalBuilding(state, 'workshop', equal ? 5 : 5, equal ? 5 : 6)
      state = b.state
      wb = b.id
      const a = operationalBuilding(state, 'workshop', 1, 1)
      state = a.state
      wa = a.id
    } else {
      const a = operationalBuilding(state, 'workshop', 1, 1)
      state = a.state
      wa = a.id
      const b = operationalBuilding(state, 'workshop', equal ? 5 : 5, equal ? 5 : 6)
      state = b.state
      wb = b.id
    }
    state = roads(state, [
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 4, y: 5 },
    ])
    if (!equal) {
      state = roads(state, [{ x: 4, y: 6 }])
    }
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, residenceId: residence.id, wa: wa!, wb: wb!, colonistId: colonist.id }
  }

  it('G1 — the residence sees both networks', () => {
    const f = multiNetwork(true, false)
    const access = getBuildingRoadAccess(f.state, f.residenceId)
    expect(access.networkIds.length).toBe(2)
    expect(access.hasRoadAccess).toBe(true)
  })

  it('G2 — equal distances across networks: tie-break on lowest id', () => {
    const f = multiNetwork(true, false)
    expect(distance(f.state, f.residenceId, f.wa)).toBe(2)
    expect(distance(f.state, f.residenceId, f.wb)).toBe(2)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(
      f.wa < f.wb ? f.wa : f.wb
    )
  })

  it('G3 — a nearer workshop on the OTHER network wins, whatever the ids', () => {
    // W_b pushed to distance 3; created first (lower id); W_a second.
    const f = multiNetwork(false, true)
    expect(distance(f.state, f.residenceId, f.wa)).toBe(2)
    expect(distance(f.state, f.residenceId, f.wb)).toBe(3)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.wa)
  })
})

// ---------------------------------------------------------------------------
// H — Workshop multi-contacts
// ---------------------------------------------------------------------------

describe('H — workshop with several contacts measures the minimum', () => {
  /**
   * R(1,1); chain (2,1)..(6,1). W(6,3) with THREE contacts:
   *   (6,2) via chain -> d5   (primary)
   *   (7,3) via (7,1),(7,2) -> d7   (secondary)
   *   (6,4) via (7,1)..(7,4) -> d9   (tertiary)
   */
  const multiContact = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 6, 3)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 6, y: 2 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 6, y: 4 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, residenceId: residence.id, workshopId: workshop.id, colonistId: colonist.id }
  }

  it('H1 — distance is the minimum over all valid contacts', () => {
    const f = multiContact()
    expect(getBuildingRoadAccess(f.state, f.workshopId).roadIds.length).toBe(3)
    expect(distance(f.state, f.residenceId, f.workshopId)).toBe(5)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.workshopId)
    expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
  })

  it('H2 — losing the nearest contact raises the distance, employment survives', () => {
    const f = multiContact()
    const degraded = setRoadStatus(f.state, 6, 2, 'underConstruction')
    // Under-construction contact excluded from access: two contacts remain.
    expect(getBuildingRoadAccess(degraded, f.workshopId).roadIds.length).toBe(2)
    expect(distance(degraded, f.residenceId, f.workshopId)).toBe(7)
    const assigned = assignJobs(degraded)
    expect(workplaceOf(assigned, f.colonistId)).toBe(f.workshopId)
    expect(measure(assigned)).toMatchObject({ production: 2, upkeepDue: 1 })
  })
})

// ---------------------------------------------------------------------------
// I — Routes sous construction
// ---------------------------------------------------------------------------

describe('I — under-construction roads never connect anything', () => {
  const underConstructionFixture = () => {
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
    state = setRoadStatus(state, 3, 1, 'underConstruction')
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, residenceId: residence.id, workshopId: workshop.id, colonistId: colonist.id }
  }

  it('I1 — a uc segment splits the network and blocks eligibility with no temp assignment', () => {
    const f = underConstructionFixture()
    expect(measure(f.state).networks).toBe(2)
    expect(getRoadNetworkCount(f.state)).toBe(2)
    expect(distance(f.state, f.residenceId, f.workshopId)).toBeNull()
    expect(areBuildingsMobilityConnected(f.state, f.residenceId, f.workshopId)).toBe(false)
    const assigned = assignJobs(f.state)
    expect(workplaceOf(assigned, f.colonistId)).toBeNull()
    expect(measure(assigned)).toMatchObject({ production: 0, upkeepDue: 0 })
    // The uc road still exists in canonical state (blocks the cell) but is
    // in no network.
    expect(measure(assigned).roadCount).toBe(3)
  })

  it('I2 — the same network fully operational is employed', () => {
    const f = underConstructionFixture()
    const repaired = assignJobs(setRoadStatus(f.state, 3, 1, 'operational'))
    expect(getRoadNetworkCount(repaired)).toBe(1)
    expect(workplaceOf(repaired, f.colonistId)).toBe(f.workshopId)
    expect(measure(repaired)).toMatchObject({ production: 2, upkeepDue: 1 })
  })
})

// ---------------------------------------------------------------------------
// J — Changement de préférence
// ---------------------------------------------------------------------------

describe('J — preference change after network reshaping', () => {
  it('J1 — additive-only reshaping never flips the choice (stability)', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const a = operationalBuilding(state, 'workshop', 2, 3)
    state = a.state
    const b = operationalBuilding(state, 'workshop', 6, 4)
    state = b.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 3 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    // B starts on a separate network: ineligible. A wins.
    expect(distance(state, residence.id, b.id)).toBeNull()
    const first = assignJobs(state)
    expect(workplaceOf(first, colonist.id)).toBe(a.id)

    // Bridge B in additively: (3,2),(4,2),(5,2) connect to (2,2)/(6,2).
    const bridged = assignJobs(
      roads(first, [
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ])
    )
    expect(distance(bridged, residence.id, b.id)).toBe(6)
    expect(distance(bridged, residence.id, a.id)).toBe(1)
    // B is farther, so the choice is stable even after reconnecting.
    expect(workplaceOf(bridged, colonist.id)).toBe(a.id)
  })

  it('J2 — a strictly nearer workshop DOES flip the assignment (no hysteresis)', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const a = operationalBuilding(state, 'workshop', 5, 3)
    state = a.state
    const b = operationalBuilding(state, 'workshop', 1, 5)
    state = b.state
    // A: chain (1,2)..(5,2) -> d4. B: separate network {(1,4)} -> ineligible.
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 1, y: 4 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    expect(getRoadNetworkCount(state)).toBe(2)
    expect(distance(state, residence.id, b.id)).toBeNull()
    const first = assignJobs(state)
    expect(workplaceOf(first, colonist.id)).toBe(a.id)
    expect(distance(first, residence.id, a.id)).toBe(4)

    // One bridging road makes B strictly nearer (d2) than A (d4):
    // (1,3) is adjacent to both the residence contact (1,2) and B's (1,4).
    const reshaped = assignJobs(roads(first, [{ x: 1, y: 3 }]))
    expect(distance(reshaped, residence.id, b.id)).toBe(2)
    expect(distance(reshaped, residence.id, a.id)).toBe(4)
    expect(workplaceOf(reshaped, colonist.id)).toBe(b.id)
    // Re-run: stable at the new optimum (no churn).
    expect(serializeCanonicalState(assignJobs(reshaped))).toBe(
      serializeCanonicalState(reshaped)
    )
  })
})

// ---------------------------------------------------------------------------
// K — Coût contre distance
// ---------------------------------------------------------------------------

describe('K — construction cost vs employment distance', () => {
  it('K1 — short+cheap vs long+costly: identical economy, cost is the only difference', () => {
    const short = (() => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const workshop = operationalBuilding(state, 'workshop', 1, 3)
      state = workshop.state
      state = roads(state, [{ x: 1, y: 2 }])
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      return { state, colonistId: colonist.id }
    })()
    const long = (() => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const workshop = operationalBuilding(state, 'workshop', 5, 3)
      state = workshop.state
      state = roads(state, [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ])
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      return { state, colonistId: colonist.id }
    })()

    const shortM = measure(assignJobs(short.state))
    const longM = measure(assignJobs(long.state))
    expect(shortM.roadCost).toBe(5)
    expect(longM.roadCost).toBe(25)
    // Same production, same upkeep: distance moved nothing but the bill.
    expect(longM.production).toBe(shortM.production)
    expect(longM.upkeepDue).toBe(shortM.upkeepDue)
  })

  it('K2 — shared chain vs independent pairs: sharing buys no economic advantage', () => {
    // Independent: two 1-road pairs, total cost 10, both d0.
    const independent = (() => {
      let state = createTestState()
      const r1 = operationalBuilding(state, 'residence', 1, 1)
      state = r1.state
      const w1 = operationalBuilding(state, 'workshop', 1, 3)
      state = w1.state
      const r2 = operationalBuilding(state, 'residence', 5, 1)
      state = r2.state
      const w2 = operationalBuilding(state, 'workshop', 5, 3)
      state = w2.state
      state = roads(state, [
        { x: 1, y: 2 },
        { x: 5, y: 2 },
      ])
      const c1 = withColonist(state, r1.id)
      state = c1.state
      const c2 = withColonist(state, r2.id)
      state = c2.state
      return { state, c1: c1.id, c2: c2.id, w1: w1.id, w2: w2.id }
    })()
    // Shared: one chain serves all four buildings, total cost 25, longer ds.
    const shared = (() => {
      let state = createTestState()
      const r1 = operationalBuilding(state, 'residence', 1, 1)
      state = r1.state
      const r2 = operationalBuilding(state, 'residence', 3, 1)
      state = r2.state
      const w1 = operationalBuilding(state, 'workshop', 5, 1)
      state = w1.state
      const w2 = operationalBuilding(state, 'workshop', 4, 3)
      state = w2.state
      state = roads(state, [
        { x: 2, y: 1 },
        { x: 4, y: 1 },
        { x: 4, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ])
      const c1 = withColonist(state, r1.id)
      state = c1.state
      const c2 = withColonist(state, r2.id)
      state = c2.state
      return { state, c1: c1.id, c2: c2.id, w1: w1.id, w2: w2.id }
    })()

    const indM = measure(assignJobs(independent.state))
    const shaM = measure(assignJobs(shared.state))
    expect(indM.roadCost).toBe(10)
    expect(shaM.roadCost).toBe(25)
    // Both fully employ both colonists; production/upkeep identical.
    expect(indM.production).toBe(4)
    expect(shaM.production).toBe(4)
    expect(shaM.upkeepDue).toBe(indM.upkeepDue)
    // Shared layout yields WORSE distances (c1 takes the d3 workshop).
    expect(distance(shared.state, 'building-1', shared.w2)).toBe(3)
    expect(distance(independent.state, 'building-1', independent.w1)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// L — Plusieurs colonists et plusieurs Workshops
// ---------------------------------------------------------------------------

describe('L — population/workshop matrix and processing-order artifact', () => {
  /** R(1,1) + W(1,3) sharing one road: the minimal employed colony. */
  const pair = (state: SimulationState, ox: number, oy: number) => {
    let next = state
    const residence = operationalBuilding(next, 'residence', ox, oy)
    next = residence.state
    const workshop = operationalBuilding(next, 'workshop', ox, oy + 2)
    next = workshop.state
    next = roads(next, [{ x: ox, y: oy + 1 }])
    const colonist = withColonist(next, residence.id)
    next = colonist.state
    return { state: next, residenceId: residence.id, workshopId: workshop.id, colonistId: colonist.id }
  }

  it('L1 — 1R/2W: one vacancy, distance picks the workshop', () => {
    let state = createTestState()
    const p = pair(state, 1, 1)
    state = p.state
    const extra = operationalBuilding(state, 'workshop', 5, 5)
    state = extra.state
    state = roads(state, [{ x: 5, y: 4 }])
    const assigned = assignJobs(state)
    expect(measure(assigned)).toMatchObject({
      employment: { population: 1, employed: 1, jobCapacity: 2, vacantJobs: 1 },
      production: 2,
      upkeepDue: 1,
    })
    expect(workplaceOf(assigned, p.colonistId)).toBe(p.workshopId)
  })

  it('L2 — 2R/2W: full employment', () => {
    let state = createTestState()
    const p1 = pair(state, 1, 1)
    state = p1.state
    const p2 = pair(state, 5, 1)
    state = p2.state
    const assigned = assignJobs(state)
    expect(measure(assigned)).toMatchObject({
      employment: { population: 2, employed: 2, vacantJobs: 0 },
      production: 4,
      upkeepDue: 2,
    })
    expect(workplaceOf(assigned, p1.colonistId)).toBe(p1.workshopId)
    expect(workplaceOf(assigned, p2.colonistId)).toBe(p2.workshopId)
  })

  it('L3 — 2R/3W: one workshop stays vacant, economy unchanged', () => {
    let state = createTestState()
    const p1 = pair(state, 1, 1)
    state = p1.state
    const p2 = pair(state, 5, 1)
    state = p2.state
    const extra = operationalBuilding(state, 'workshop', 3, 5)
    state = extra.state
    state = roads(state, [{ x: 3, y: 4 }])
    const assigned = assignJobs(state)
    expect(measure(assigned)).toMatchObject({
      employment: { population: 2, employed: 2, jobCapacity: 3, vacantJobs: 1 },
      production: 4,
      upkeepDue: 2,
    })
    expect(countWorkersAt(assigned, extra.id)).toBe(0)
  })

  it('L4 — 3R/2W: one colonist stays unemployed', () => {
    let state = createTestState()
    const p1 = pair(state, 1, 1)
    state = p1.state
    const p2 = pair(state, 5, 1)
    state = p2.state
    const r3 = operationalBuilding(state, 'residence', 3, 5)
    state = r3.state
    const c3 = withColonist(state, r3.id)
    state = c3.state
    const assigned = assignJobs(state)
    expect(measure(assigned)).toMatchObject({
      employment: { population: 3, employed: 2, unemployed: 1 },
      production: 4,
      upkeepDue: 2,
    })
    expect(workplaceOf(assigned, c3.id)).toBeNull()
  })

  it('L5 — ascending colonist order can force a farther assignment (order artifact)', () => {
    // R_A(3,1) colonist A FIRST; R_B(1,1) colonist B second.
    // W1(1,3): d(R_B,W1)=0, d(R_A,W1)=2. W2(5,3): d(R_A,W2)=2, d(R_B,W2)=4.
    let state = createTestState()
    const ra = operationalBuilding(state, 'residence', 3, 1)
    state = ra.state
    const rb = operationalBuilding(state, 'residence', 1, 1)
    state = rb.state
    const w1 = operationalBuilding(state, 'workshop', 1, 3)
    state = w1.state
    const w2 = operationalBuilding(state, 'workshop', 5, 3)
    state = w2.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const ca = withColonist(state, ra.id)
    state = ca.state
    const cb = withColonist(state, rb.id)
    state = cb.state

    expect(distance(state, rb.id, w1.id)).toBe(0)
    expect(distance(state, ra.id, w1.id)).toBe(2)
    expect(distance(state, ra.id, w2.id)).toBe(2)
    expect(distance(state, rb.id, w2.id)).toBe(4)

    const assigned = assignJobs(state)
    // A is processed first (ascending id): takes W1 on a distance TIE (2 vs 2,
    // lowest id wins), pushing B — strictly nearer to W1 — onto the d4 W2.
    expect(workplaceOf(assigned, ca.id)).toBe(w1.id)
    expect(workplaceOf(assigned, cb.id)).toBe(w2.id)
    // Measured order artifact: actual total distance 6 vs optimal 2.
    const actualTotal =
      (distance(assigned, ra.id, workplaceOf(assigned, ca.id) ?? '') ?? 0) +
      (distance(assigned, rb.id, workplaceOf(assigned, cb.id) ?? '') ?? 0)
    expect(actualTotal).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// M — Invariance topologique
// ---------------------------------------------------------------------------

describe('M — topological invariance under insertion order', () => {
  const buildInOrder = (reverseBuildings: boolean, batchRoads: boolean) => {
    let state = createTestState()
    const order: readonly ('r' | 'near' | 'far')[] = reverseBuildings
      ? ['far', 'r', 'near']
      : ['r', 'near', 'far']
    const ids: Record<string, string> = {}
    for (const which of order) {
      if (which === 'r') {
        const made = operationalBuilding(state, 'residence', 1, 1)
        state = made.state
        ids.r = made.id
      } else if (which === 'near') {
        const made = operationalBuilding(state, 'workshop', 1, 3)
        state = made.state
        ids.near = made.id
      } else {
        const made = operationalBuilding(state, 'workshop', 5, 3)
        state = made.state
        ids.far = made.id
      }
    }
    const cells = [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]
    state = batchRoads
      ? roadsBatch(state, [...cells].reverse())
      : roadsBatch(state, cells)
    const colonist = withColonist(state, ids.r!)
    state = colonist.state
    return { state, ids, colonistId: colonist.id }
  }

  it('M1 — different building insertion order: same outcome, ids only as tie-break', () => {
    const a = buildInOrder(false, false)
    const b = buildInOrder(true, false)
    expect(b.ids.near).not.toBe(a.ids.near) // ids really differ
    expect(distance(a.state, a.ids.r!, a.ids.near!)).toBe(0)
    expect(distance(b.state, b.ids.r!, b.ids.near!)).toBe(0)
    expect(distance(a.state, a.ids.r!, a.ids.far!)).toBe(4)
    expect(distance(b.state, b.ids.r!, b.ids.far!)).toBe(4)
    const assignedA = assignJobs(a.state)
    const assignedB = assignJobs(b.state)
    // Same spatial decision in both orders: the near workshop wins.
    expect(workplaceOf(assignedA, a.colonistId)).toBe(a.ids.near)
    expect(workplaceOf(assignedB, b.colonistId)).toBe(b.ids.near)
    expect(measure(assignedA)).toMatchObject({ production: 2, upkeepDue: 1 })
    expect(measure(assignedB)).toMatchObject({ production: 2, upkeepDue: 1 })
  })

  it('M2 — single-call road batches normalize ids: reversed input, identical state', () => {
    const a = buildInOrder(false, false)
    const b = buildInOrder(false, true)
    expect(Object.keys(a.state.roads).sort()).toEqual(Object.keys(b.state.roads).sort())
    expect(serializeCanonicalState(assignJobs(a.state))).toBe(
      serializeCanonicalState(assignJobs(b.state))
    )
  })
})

// ---------------------------------------------------------------------------
// N — Rejouabilité
// ---------------------------------------------------------------------------

describe('N — replay, persistence and derived-only audit', () => {
  const build = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const far = operationalBuilding(state, 'workshop', 5, 3)
    state = far.state
    const near = operationalBuilding(state, 'workshop', 1, 3)
    state = near.state
    state = roads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return state
  }

  it('N1 — identical command sequences produce identical states and hashes', () => {
    const a = assignJobs(produceMaterial(build()))
    const b = assignJobs(produceMaterial(build()))
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    // Save roundtrip keeps the hash stable.
    const reloaded = loadSave(serializeSave(a))
    expect(hashCanonicalState(reloaded)).toBe(hashCanonicalState(a))
  })

  it('N2 — nothing distance/network/audit related is persisted', () => {
    const state = assignJobs(build())
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('distance')
    expect(serialized).not.toContain('networkIds')
    expect(serialized).not.toContain('mobilityConnected')
    expect(serialized).not.toContain('audit')
    // SAVE_VERSION unchanged by the audit step.
    expect(SAVE_VERSION).toBe(6)
  })
})
