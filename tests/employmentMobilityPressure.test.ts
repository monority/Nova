/**
 * Employment mobility pressure audit (Step 09L).
 *
 * AUDIT TOOLING — not gameplay, not a rebalance. These tests exercise the
 * UNMODIFIED simulation (09K rules) through deterministic spatial scenarios
 * and pin the measured outcomes: employment, productive workers, production,
 * upkeep, Material, network count, mobility facts and hash.
 *
 * The purpose is to establish, with evidence, how much spatial pressure the
 * current mobility-gated employment rule actually creates — i.e. whether road
 * topology influences job CHOICE or merely job ELIGIBILITY.
 *
 * Nothing here is a runtime dependency (test-only, like every other audit
 * suite in tests/). All fixtures are built with the public domain entry
 * points; no production code changes accompany this step.
 */

import { describe, expect, it } from 'vitest'

import {
  areBuildingsMobilityConnected,
  assignJobs,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getEmploymentSummary,
  getJobCapacity,
  getRoadNetworkCount,
  getRoadNetworks,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateRoadsPlacement,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

type Cell = { readonly x: number; readonly y: number }

// ---------------------------------------------------------------------------
// Fixture helpers (direct domain ops; arbitrary canonical states)
// ---------------------------------------------------------------------------

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
): SimulationState => {
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
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
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
    next = operationalRoad(next, cell.x, cell.y)
  }
  return next
}

/** Colonist bound to a residence, optionally pre-assigned to a workplace. */
const withColonist = (
  state: SimulationState,
  residenceId: string,
  workplaceId: string | null = null
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

// ---------------------------------------------------------------------------
// Measurement harness
// ---------------------------------------------------------------------------

interface Facts {
  readonly roads: number
  readonly networks: number
  readonly residences: readonly string[]
  readonly workshops: readonly string[]
  readonly colonists: readonly string[]
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly production: number
  readonly stored: number
  readonly upkeep: number
  readonly staffedWorkshops: number
  readonly material: number
  readonly workerByWorkshop: Readonly<Record<string, number>>
  readonly workplaceByColonist: Readonly<Record<string, string | null>>
  readonly mobilityByColonist: Readonly<Record<string, boolean>>
  readonly hash: string
}

/** Immutable snapshot of every fact the audit measures on one state. */
const facts = (state: SimulationState): Facts => {
  const buildings = Object.keys(state.buildings).sort()
  const residences = buildings.filter(
    (id) => state.buildings[id]?.type === 'residence'
  )
  const workshops = buildings.filter(
    (id) => state.buildings[id]?.type === 'workshop'
  )
  const colonists = Object.keys(state.colonists).sort()
  const employment = getEmploymentSummary(state)
  const workerByWorkshop: Record<string, number> = {}
  for (const id of workshops) {
    workerByWorkshop[id] = countWorkersAt(state, id)
  }
  const workplaceByColonist: Record<string, string | null> = {}
  const mobilityByColonist: Record<string, boolean> = {}
  for (const id of colonists) {
    const colonist = state.colonists[id]
    workplaceByColonist[id] = colonist?.workplaceId ?? null
    mobilityByColonist[id] =
      getColonistWorkMobility(state, id).mobilityConnected
  }
  return {
    roads: Object.keys(state.roads).length,
    networks: getRoadNetworkCount(state),
    residences,
    workshops,
    colonists,
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: employment.jobCapacity,
    production: materialProductionForTick(state),
    stored: materialStoredProductionForTick(state),
    upkeep: materialUpkeepDueForTick(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    material: state.resources.construction,
    workerByWorkshop,
    workplaceByColonist,
    mobilityByColonist,
    hash: hashCanonicalState(state),
  }
}

/** assignJobs then snapshot (the audit's standard observation). */
const settled = (state: SimulationState): Facts => facts(assignJobs(state))

// ---------------------------------------------------------------------------
// Experiment A — one residence / one workshop
// ---------------------------------------------------------------------------

describe('experiment A — one Residence / one Workshop', () => {
  it('A1 — no road: unemployed, zero production, zero upkeep', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 4)
    state = workshop.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    const f = settled(state)
    expect(f.roads).toBe(0)
    expect(f.networks).toBe(0)
    expect(f.employed).toBe(0)
    expect(f.unemployed).toBe(1)
    expect(f.production).toBe(0)
    expect(f.upkeep).toBe(0)
    expect(f.staffedWorkshops).toBe(0)
    expect(f.workplaceByColonist[colonist.id]).toBeNull()
    expect(f.mobilityByColonist[colonist.id]).toBe(false)
  })

  it('A2 — direct road connection: employed, normal production and upkeep', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 3)
    state = workshop.state
    state = operationalRoad(state, 1, 2)
    const colonist = withColonist(state, residence.id)
    state = colonist.state

    const f = settled(state)
    expect(f.roads).toBe(1)
    expect(f.networks).toBe(1)
    expect(f.employed).toBe(1)
    expect(f.unemployed).toBe(0)
    expect(f.production).toBe(2)
    expect(f.upkeep).toBe(1)
    expect(f.workplaceByColonist[colonist.id]).toBe(workshop.id)
    expect(f.mobilityByColonist[colonist.id]).toBe(true)
  })

  it('A3 — long corridor is semantically identical to A2 (cost aside)', () => {
    const build = (workshopY: number, cells: readonly Cell[]): Facts => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const workshop = operationalBuilding(state, 'workshop', 1, workshopY)
      state = workshop.state
      state = operationalRoads(state, cells)
      const colonist = withColonist(state, residence.id)
      return settled(colonist.state)
    }
    const a = build(3, [{ x: 1, y: 2 }])
    const b = build(6, [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
    ])

    // Every simulation consequence is identical...
    expect(b.employed).toBe(a.employed)
    expect(b.unemployed).toBe(a.unemployed)
    expect(b.production).toBe(a.production)
    expect(b.upkeep).toBe(a.upkeep)
    expect(b.staffedWorkshops).toBe(a.staffedWorkshops)
    expect(b.networks).toBe(a.networks)
    expect(b.mobilityByColonist).toEqual(a.mobilityByColonist)
    // ...except the road count / construction cost: 1 cell vs 4 cells.
    expect(a.roads).toBe(1)
    expect(b.roads).toBe(4)
    const costDirect = validateRoadsPlacement(createTestState(), [{ x: 1, y: 2 }])
    const costCorridor = validateRoadsPlacement(createTestState(), [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
    ])
    expect(costDirect.valid && costDirect.totalCost).toBe(ROAD_CONSTRUCTION_COST)
    expect(costCorridor.valid && costCorridor.totalCost).toBe(
      4 * ROAD_CONSTRUCTION_COST
    )
  })
})

// ---------------------------------------------------------------------------
// Experiment B — two residences / two workshops
// ---------------------------------------------------------------------------

describe('experiment B — two Residences / two Workshops', () => {
  /** R_A(1,1)—road(1,2)—W_A(1,3) · R_B(5,1)—road(5,2)—W_B(5,3). */
  const parallelNetworks = () => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    state = operationalRoad(state, 1, 2)
    const residenceB = operationalBuilding(state, 'residence', 5, 1)
    state = residenceB.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = operationalRoad(state, 5, 2)
    const colonistA = withColonist(state, residenceA.id)
    state = colonistA.state
    const colonistB = withColonist(state, residenceB.id)
    state = colonistB.state
    return {
      state,
      residenceAId: residenceA.id,
      residenceBId: residenceB.id,
      workshopAId: workshopA.id,
      workshopBId: workshopB.id,
      colonistAId: colonistA.id,
      colonistBId: colonistB.id,
    }
  }

  it('B1 — parallel networks: each colonist works locally, deterministically', () => {
    const fixture = parallelNetworks()
    const f = settled(fixture.state)
    expect(f.networks).toBe(2)
    expect(f.employed).toBe(2)
    expect(f.unemployed).toBe(0)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
    expect(f.workplaceByColonist[fixture.colonistAId]).toBe(fixture.workshopAId)
    expect(f.workplaceByColonist[fixture.colonistBId]).toBe(fixture.workshopBId)
  })

  it('B2 — a colonist can only reach the Workshop on their own network', () => {
    // R_A(1,1)—road(1,2)—W_A(1,3) [N1]; W_B(5,3)—road(5,2) [N2], no residence.
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    state = operationalRoad(state, 1, 2)
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = operationalRoad(state, 5, 2)
    const colonist = withColonist(state, residenceA.id)
    state = colonist.state

    const f = settled(state)
    expect(f.employed).toBe(1)
    expect(f.workplaceByColonist[colonist.id]).toBe(workshopA.id)
    // W_B is road-accessible but unreachable from R_A: never selected.
    expect(getBuildingRoadAccess(state, workshopB.id).hasRoadAccess).toBe(true)
    expect(
      areBuildingsMobilityConnected(state, residenceA.id, workshopB.id)
    ).toBe(false)
    expect(countWorkersAt(state, workshopB.id)).toBe(0)
  })

  it('B3 — both Workshops reachable: the NEAREST wins, not the creation order (09M)', () => {
    // R(1,1) + two Workshops on one shared road chain (1,2)..(5,2).
    // Road distance: (3,1) is 2 steps away, (5,1) is 4 steps away, so the
    // nearer Workshop wins in EITHER creation order. 09L recorded the
    // pre-09M id-order tie-break; 09M replaces it with road distance.
    const bothReachable = (first: Cell, second: Cell) => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const firstBuilt = operationalBuilding(state, 'workshop', first.x, first.y)
      state = firstBuilt.state
      const secondBuilt = operationalBuilding(state, 'workshop', second.x, second.y)
      state = secondBuilt.state
      state = operationalRoads(state, [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ])
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      const nearIsLeft = first.x === 3
      return {
        state,
        colonistId: colonist.id,
        firstId: firstBuilt.id,
        secondId: secondBuilt.id,
        nearestId: nearIsLeft ? firstBuilt.id : secondBuilt.id,
      }
    }

    // Near Workshop created first -> near wins.
    const nearFirst = bothReachable({ x: 3, y: 1 }, { x: 5, y: 1 })
    expect(
      settled(nearFirst.state).workplaceByColonist[nearFirst.colonistId]
    ).toBe(nearFirst.nearestId)
    // Far Workshop created first -> the NEAR one still wins.
    const farFirst = bothReachable({ x: 5, y: 1 }, { x: 3, y: 1 })
    expect(settled(farFirst.state).workplaceByColonist[farFirst.colonistId]).toBe(
      farFirst.nearestId
    )
    expect(farFirst.nearestId).toBe(farFirst.secondId)
  })
})

// ---------------------------------------------------------------------------
// Experiment C — two colonists / two workshops / one network
// ---------------------------------------------------------------------------

describe('experiment C — two colonists / two Workshops / one shared network', () => {
  /** Road row y=3 x=0..7; R_A(1,2) R_B(5,2) W_A(1,4) W_B(5,4). */
  const sharedNetwork = () => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 2)
    state = residenceA.state
    const residenceB = operationalBuilding(state, 'residence', 5, 2)
    state = residenceB.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 4)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 4)
    state = workshopB.state
    state = operationalRoads(
      state,
      [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 3 }))
    )
    const colonistA = withColonist(state, residenceA.id)
    state = colonistA.state
    const colonistB = withColonist(state, residenceB.id)
    state = colonistB.state
    return {
      state,
      residenceAId: residenceA.id,
      residenceBId: residenceB.id,
      workshopAId: workshopA.id,
      workshopBId: workshopB.id,
      colonistAId: colonistA.id,
      colonistBId: colonistB.id,
    }
  }

  it('C1 — both colonists and both Workshops share one network', () => {
    const fixture = sharedNetwork()
    const state = assignJobs(fixture.state)
    const f = facts(state)
    expect(f.networks).toBe(1)
    expect(f.employed).toBe(2)
    expect(f.unemployed).toBe(0)
    expect(f.jobCapacity).toBe(2)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
    // Ascending colonist id x ascending workshop id: c1->W_A, c2->W_B.
    expect(f.workplaceByColonist[fixture.colonistAId]).toBe(fixture.workshopAId)
    expect(f.workplaceByColonist[fixture.colonistBId]).toBe(fixture.workshopBId)
    // Both colonists are mobility-connected to BOTH workshops.
    for (const colonistId of [fixture.colonistAId, fixture.colonistBId]) {
      const residenceId = state.colonists[colonistId]?.residenceId
      expect(residenceId).not.toBeNull()
      expect(
        areBuildingsMobilityConnected(state, residenceId!, fixture.workshopAId)
      ).toBe(true)
      expect(
        areBuildingsMobilityConnected(state, residenceId!, fixture.workshopBId)
      ).toBe(true)
    }
  })

  it('C2 — assignments are stable: re-running assignJobs is a no-op', () => {
    const fixture = sharedNetwork()
    const once = assignJobs(fixture.state)
    const twice = assignJobs(once)
    expect(twice).toBe(once)
    expect(facts(twice)).toEqual(facts(once))
  })

  it('C3 — adding a redundant spur does not change assignments', () => {
    const fixture = sharedNetwork()
    const before = settled(fixture.state)
    // Extend the network downward away from every building: pure redundancy.
    const withSpur = operationalRoads(fixture.state, [
      { x: 3, y: 4 },
      { x: 3, y: 5 },
    ])
    const after = settled(withSpur)
    expect(after.networks).toBe(before.networks)
    expect(after.workplaceByColonist).toEqual(before.workplaceByColonist)
    expect(after.employed).toBe(before.employed)
    expect(after.production).toBe(before.production)
    expect(after.upkeep).toBe(before.upkeep)
  })

  it('C4 — assignment is independent of record insertion order', () => {
    const fixture = sharedNetwork()
    const settledState = assignJobs(fixture.state)
    const expected = facts(settledState)
    const reversed: SimulationState = {
      ...settledState,
      roads: Object.fromEntries(Object.entries(settledState.roads).reverse()),
      buildings: Object.fromEntries(
        Object.entries(settledState.buildings).reverse()
      ),
      colonists: Object.fromEntries(
        Object.entries(settledState.colonists).reverse()
      ),
    }
    expect(hashCanonicalState(reversed)).toBe(expected.hash)
    expect(facts(assignJobs(reversed))).toEqual(expected)
  })

  it('C5 — road id allocation order does not change assignments', () => {
    const build = (roadCells: readonly Cell[]) => {
      let state = createTestState()
      const residenceA = operationalBuilding(state, 'residence', 1, 2)
      state = residenceA.state
      const residenceB = operationalBuilding(state, 'residence', 5, 2)
      state = residenceB.state
      const workshopA = operationalBuilding(state, 'workshop', 1, 4)
      state = workshopA.state
      const workshopB = operationalBuilding(state, 'workshop', 5, 4)
      state = workshopB.state
      state = operationalRoads(state, roadCells)
      const colonistA = withColonist(state, residenceA.id)
      state = colonistA.state
      const colonistB = withColonist(state, residenceB.id)
      state = colonistB.state
      return settled(state)
    }
    const ascending = build([0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    const descending = build([7, 6, 5, 4, 3, 2, 1, 0].map((x) => ({ x, y: 3 })))
    expect(descending.workplaceByColonist).toEqual(
      ascending.workplaceByColonist
    )
    expect(descending.production).toBe(ascending.production)
    expect(descending.upkeep).toBe(ascending.upkeep)
    expect(descending.networks).toBe(ascending.networks)
  })
})

// ---------------------------------------------------------------------------
// Experiment D — competing workshops (more Workshops than workers)
// ---------------------------------------------------------------------------

describe('experiment D — competing Workshops, one worker', () => {
  const competing = (first: Cell, second: Cell, extraSpur: boolean) => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const firstBuilt = operationalBuilding(state, 'workshop', first.x, first.y)
    state = firstBuilt.state
    const secondBuilt = operationalBuilding(state, 'workshop', second.x, second.y)
    state = secondBuilt.state
    state = operationalRoads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    if (extraSpur) {
      state = operationalRoads(state, [
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ])
    }
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return {
      state,
      colonistId: colonist.id,
      firstId: firstBuilt.id,
      secondId: secondBuilt.id,
    }
  }

  it('D1 — the NEAREST reachable Workshop is staffed (09M)', () => {
    const fixture = competing({ x: 3, y: 1 }, { x: 5, y: 1 }, false)
    const f = settled(fixture.state)
    expect(f.employed).toBe(1)
    expect(f.workplaceByColonist[fixture.colonistId]).toBe(fixture.firstId)
    expect(f.workerByWorkshop[fixture.secondId]).toBe(0)
    // Vacant W_B still contributes storage capacity (08F, unchanged): the
    // 100 bootstrap stock is above the 50 cap, so nothing is stored.
    expect(f.jobCapacity).toBe(2)
    expect(f.stored).toBe(0)
  })

  it('D2 — creation order is irrelevant: the nearest Workshop still wins (09M)', () => {
    // Created far-first: 09L's id-order rule would pick the far Workshop;
    // 09M picks the near one regardless of which was built first.
    const fixture = competing({ x: 5, y: 1 }, { x: 3, y: 1 }, false)
    const f = settled(fixture.state)
    expect(f.workplaceByColonist[fixture.colonistId]).toBe(fixture.secondId)
    expect(f.workerByWorkshop[fixture.firstId]).toBe(0)
  })

  it('D3 — a redundant spur does not change which Workshop is chosen', () => {
    const plain = settled(competing({ x: 3, y: 1 }, { x: 5, y: 1 }, false).state)
    const spurned = settled(competing({ x: 3, y: 1 }, { x: 5, y: 1 }, true).state)
    expect(spurned.networks).toBe(plain.networks)
    expect(spurned.workplaceByColonist).toEqual(plain.workplaceByColonist)
  })
})

// ---------------------------------------------------------------------------
// Experiment E — network partition
// ---------------------------------------------------------------------------

describe('experiment E — network partition', () => {
  /**
   * R_A(0,0) at the corner of two independent road arms:
   *   N1 east  (1,0),(2,0),(3,0) -> W_A(4,0)
   *   N2 south (0,2),(0,3)       -> W_B(0,4)   (+ R_B(1,2) local to N2)
   */
  const partitioned = (mode: 'E1' | 'E2' | 'E3') => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 0, 0)
    state = residenceA.state
    const residenceB = operationalBuilding(state, 'residence', 1, 2)
    state = residenceB.state
    const workshopA = operationalBuilding(state, 'workshop', 4, 0)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 0, 4)
    state = workshopB.state

    state = operationalRoads(state, [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
    state = operationalRoads(state, [
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ])
    if (mode === 'E2') {
      // Reach N2 up to R_A's south neighbour: R_A becomes multi-network,
      // while N2 still never touches N1.
      state = operationalRoad(state, 0, 1)
    }
    if (mode === 'E3') {
      // Bridge N1 and N2 at (1,1): one shared network for everything.
      state = operationalRoads(state, [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ])
    }

    const colonistA = withColonist(state, residenceA.id)
    state = colonistA.state
    const colonistB = withColonist(state, residenceB.id)
    state = colonistB.state
    return {
      state,
      residenceAId: residenceA.id,
      residenceBId: residenceB.id,
      workshopAId: workshopA.id,
      workshopBId: workshopB.id,
      colonistAId: colonistA.id,
      colonistBId: colonistB.id,
    }
  }

  it('E1 — partitions: each colonist works only inside their own network', () => {
    const fixture = partitioned('E1')
    const state = assignJobs(fixture.state)
    const f = facts(state)
    expect(f.networks).toBe(2)
    expect(f.employed).toBe(2)
    expect(f.unemployed).toBe(0)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
    expect(f.workplaceByColonist[fixture.colonistAId]).toBe(fixture.workshopAId)
    expect(f.workplaceByColonist[fixture.colonistBId]).toBe(fixture.workshopBId)
    expect(
      areBuildingsMobilityConnected(
        state,
        fixture.residenceAId,
        fixture.workshopBId
      )
    ).toBe(false)
    expect(
      areBuildingsMobilityConnected(
        state,
        fixture.residenceBId,
        fixture.workshopAId
      )
    ).toBe(false)
  })

  it('E2 — Residence A reaches both networks, without merging them', () => {
    const fixture = partitioned('E2')
    const state = assignJobs(fixture.state)
    const f = facts(state)
    // The partition survives: two components, never merged by a building.
    expect(f.networks).toBe(2)
    expect(
      areBuildingsMobilityConnected(
        state,
        fixture.residenceAId,
        fixture.workshopAId
      )
    ).toBe(true)
    expect(
      areBuildingsMobilityConnected(
        state,
        fixture.residenceAId,
        fixture.workshopBId
      )
    ).toBe(true)
    // Selection still favours the lowest-id eligible Workshop.
    expect(f.workplaceByColonist[fixture.colonistAId]).toBe(fixture.workshopAId)
    expect(f.employed).toBe(2)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
  })

  it('E3 — merging into one network makes every pair eligible', () => {
    const fixture = partitioned('E3')
    const state = assignJobs(fixture.state)
    const f = facts(state)
    expect(f.networks).toBe(1)
    for (const residenceId of [fixture.residenceAId, fixture.residenceBId]) {
      for (const workshopId of [fixture.workshopAId, fixture.workshopBId]) {
        expect(
          areBuildingsMobilityConnected(state, residenceId, workshopId)
        ).toBe(true)
      }
    }
    // Employment, production and upkeep are UNCHANGED versus the partition.
    expect(f.employed).toBe(2)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Experiment F — network merge
// ---------------------------------------------------------------------------

describe('experiment F — network merge', () => {
  it('F1 — merging saturated networks adds eligibility but changes no outcome', () => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    state = operationalRoad(state, 1, 2)
    const residenceB = operationalBuilding(state, 'residence', 5, 1)
    state = residenceB.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = operationalRoad(state, 5, 2)
    const colonistA = withColonist(state, residenceA.id)
    state = colonistA.state
    const colonistB = withColonist(state, residenceB.id)
    state = colonistB.state

    const before = settled(state)
    expect(before.networks).toBe(2)
    expect(before.employed).toBe(2)

    // Bridge the two networks along row y=2: (1,2)..(5,2).
    const merged = operationalRoads(state, [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ])
    const after = settled(merged)
    expect(after.networks).toBe(1)
    expect(after.employed).toBe(before.employed)
    expect(after.unemployed).toBe(before.unemployed)
    expect(after.production).toBe(before.production)
    expect(after.upkeep).toBe(before.upkeep)
    expect(after.workplaceByColonist).toEqual(before.workplaceByColonist)
    // The new cross-eligible relationships are real and measurable.
    expect(
      areBuildingsMobilityConnected(merged, residenceA.id, workshopB.id)
    ).toBe(true)
    expect(
      areBuildingsMobilityConnected(merged, residenceB.id, workshopA.id)
    ).toBe(true)
    expect(
      areBuildingsMobilityConnected(state, residenceA.id, workshopB.id)
    ).toBe(false)
  })

  it('F2 — merging relieves an actual bottleneck (stranded colonist gets a job)', () => {
    // N1: R_A(1,1) -- (1,2) -- W_A(1,3) -- (1,4) -- R_B(1,5)
    //     reached around W_A via (2,2),(2,3),(2,4): one connected network.
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 1)
    state = residenceA.state
    const residenceB = operationalBuilding(state, 'residence', 1, 5)
    state = residenceB.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 3)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 3)
    state = workshopB.state
    state = operationalRoads(state, [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 1, y: 4 },
    ])
    // N2: W_B(5,3) + (5,2) — vacant, isolated from N1.
    state = operationalRoad(state, 5, 2)

    const colonistA = withColonist(state, residenceA.id)
    state = colonistA.state
    const colonistB = withColonist(state, residenceB.id)
    state = colonistB.state

    const before = settled(state)
    expect(before.networks).toBe(2)
    // c1 staffs W_A; c2's only reachable Workshop (W_A) is taken -> stranded.
    expect(before.employed).toBe(1)
    expect(before.unemployed).toBe(1)
    expect(before.production).toBe(2)
    expect(before.upkeep).toBe(1)
    expect(before.workplaceByColonist[colonistB.id]).toBeNull()

    // Merge N1 and N2: bridge (2,2) -> (5,2) along row y=2.
    const merged = operationalRoads(state, [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ])
    const after = settled(merged)
    expect(after.networks).toBe(1)
    // The previously stranded colonist now reaches the vacant W_B.
    expect(after.employed).toBe(2)
    expect(after.unemployed).toBe(0)
    expect(after.production).toBe(4)
    expect(after.upkeep).toBe(2)
    expect(after.workplaceByColonist[colonistB.id]).toBe(workshopB.id)
  })
})

// ---------------------------------------------------------------------------
// Experiment G — network shape equivalence
// ---------------------------------------------------------------------------

describe('experiment G — network shape equivalence', () => {
  /** Four equal-cost (4 road cells) geometries with one R, one W, one colonist. */
  const geometries: Record<
    string,
    { residence: Cell; workshop: Cell; roads: Cell[] }
  > = {
    straight: {
      residence: { x: 1, y: 1 },
      workshop: { x: 1, y: 4 },
      roads: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
    },
    lShape: {
      residence: { x: 1, y: 1 },
      workshop: { x: 4, y: 3 },
      roads: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
    },
    branch: {
      residence: { x: 1, y: 1 },
      workshop: { x: 5, y: 1 },
      roads: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 2 },
      ],
    },
    loop: {
      residence: { x: 1, y: 2 },
      workshop: { x: 4, y: 2 },
      roads: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
    },
  }

  const buildGeometry = (name: string) => {
    const geometry = geometries[name]
    if (geometry === undefined) {
      throw new Error(`test helper: unknown geometry ${name}`)
    }
    let state = createTestState()
    const residence = operationalBuilding(
      state,
      'residence',
      geometry.residence.x,
      geometry.residence.y
    )
    state = residence.state
    const workshop = operationalBuilding(
      state,
      'workshop',
      geometry.workshop.x,
      geometry.workshop.y
    )
    state = workshop.state
    state = operationalRoads(state, geometry.roads)
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return { state, colonistId: colonist.id }
  }

  it('G1 — straight, L, branch and loop collapse to identical simulation facts', () => {
    const names = ['straight', 'lShape', 'branch', 'loop'] as const
    const results = names.map((name) => {
      const fixture = buildGeometry(name)
      const state = assignJobs(fixture.state)
      return { name, f: facts(state) }
    })
    for (const { f } of results) {
      expect(f.roads).toBe(4)
      expect(f.networks).toBe(1)
      expect(f.employed).toBe(1)
      expect(f.production).toBe(2)
      expect(f.upkeep).toBe(1)
      expect(Object.values(f.mobilityByColonist)).toEqual([true])
    }
    const first = results[0]?.f
    if (first === undefined) {
      throw new Error('test helper: no geometry results')
    }
    for (const { f } of results) {
      expect(f.roads).toBe(first.roads)
      expect(f.networks).toBe(first.networks)
      expect(f.employed).toBe(first.employed)
      expect(f.production).toBe(first.production)
      expect(f.upkeep).toBe(first.upkeep)
      expect(f.mobilityByColonist).toEqual(first.mobilityByColonist)
    }
    // Canonical hashes are NOT equal: the canonical state still distinguishes
    // shapes (different road cells); only the SIMULATION OUTCOMES collapse.
    expect(new Set(results.map((r) => r.f.hash)).size).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Experiment H — road cost pressure
// ---------------------------------------------------------------------------

describe('experiment H — road cost pressure', () => {
  const cost = (cells: readonly Cell[]): number => {
    const validation = validateRoadsPlacement(createTestState(), [...cells])
    if (!validation.valid) {
      throw new Error(`test helper: invalid roads (${validation.reason})`)
    }
    return validation.totalCost
  }

  it('H1 — cost is linear in road cells: the only length signal in the model', () => {
    expect(ROAD_CONSTRUCTION_COST).toBe(5)
    const direct = cost([{ x: 1, y: 2 }])
    const longCorridor = cost([
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
    ])
    const twoIndependent = cost([
      { x: 1, y: 2 },
      { x: 5, y: 2 },
    ])
    const sharedNetwork = cost([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ])
    expect(direct).toBe(1 * ROAD_CONSTRUCTION_COST)
    expect(longCorridor).toBe(4 * ROAD_CONSTRUCTION_COST)
    expect(twoIndependent).toBe(2 * ROAD_CONSTRUCTION_COST)
    expect(sharedNetwork).toBe(5 * ROAD_CONSTRUCTION_COST)
  })

  it('H2 — equal-cell topologies have exactly equal cost', () => {
    const straight = cost([
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ])
    const lShape = cost([
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ])
    expect(lShape).toBe(straight)
  })
})

// ---------------------------------------------------------------------------
// Experiment I — employment bottleneck
// ---------------------------------------------------------------------------

describe('experiment I — employment bottleneck under road topology', () => {
  /**
   * Base: R1(1,1) R2(1,3) R3(1,5); W1(3,1) W2(3,5).
   * Road column x=2 is varied per mode to change who can reach what.
   */
  const bottleneck = (mode: 'I1' | 'I2' | 'I3') => {
    let state = createTestState()
    const residence1 = operationalBuilding(state, 'residence', 1, 1)
    state = residence1.state
    const residence2 = operationalBuilding(state, 'residence', 1, 3)
    state = residence2.state
    const residence3 = operationalBuilding(state, 'residence', 1, 5)
    state = residence3.state
    const workshop1 = operationalBuilding(state, 'workshop', 3, 1)
    state = workshop1.state
    const workshop2 = operationalBuilding(state, 'workshop', 3, 5)
    state = workshop2.state

    if (mode === 'I1') {
      // One connected column (2,1)..(2,6): every residence reaches every shop.
      state = operationalRoads(
        state,
        [1, 2, 3, 4, 5, 6].map((y) => ({ x: 2, y }))
      )
    } else if (mode === 'I2') {
      // Only Residence 1 has access (single road at (2,1)).
      state = operationalRoad(state, 2, 1)
    } else {
      // N1 = {(2,1),(2,2),(2,3)}: R1, R2 and W1.
      // N2 = {(2,5)}:              R3 and W2.  (Manhattan-2 apart: separate.)
      state = operationalRoads(state, [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 5 },
      ])
    }

    const c1 = withColonist(state, residence1.id)
    state = c1.state
    const c2 = withColonist(state, residence2.id)
    state = c2.state
    const c3 = withColonist(state, residence3.id)
    state = c3.state
    return {
      state,
      colonist1Id: c1.id,
      colonist2Id: c2.id,
      colonist3Id: c3.id,
      workshop1Id: workshop1.id,
      workshop2Id: workshop2.id,
    }
  }

  it('I1 — full connectivity: capacity, not road topology, is the limit', () => {
    const f = settled(bottleneck('I1').state)
    expect(f.networks).toBe(1)
    expect(f.jobCapacity).toBe(2)
    expect(f.employed).toBe(2)
    expect(f.unemployed).toBe(1)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
    expect(f.staffedWorkshops).toBe(2)
  })

  it('I2 — one connected residence: road topology creates the bottleneck', () => {
    const fixture = bottleneck('I2')
    const state = assignJobs(fixture.state)
    const f = facts(state)
    expect(f.employed).toBe(1)
    expect(f.unemployed).toBe(2)
    expect(f.jobCapacity).toBe(2)
    expect(f.production).toBe(2)
    expect(f.upkeep).toBe(1)
    expect(f.staffedWorkshops).toBe(1)
    expect(f.workplaceByColonist[fixture.colonist1Id]).toBe(fixture.workshop1Id)
    expect(f.workplaceByColonist[fixture.colonist2Id]).toBeNull()
    expect(f.workplaceByColonist[fixture.colonist3Id]).toBeNull()
  })

  it('I3 — partial connectivity: one shop saturated, the other reachable only by R3', () => {
    const fixture = bottleneck('I3')
    const state = assignJobs(fixture.state)
    const f = facts(state)
    // N1 (R1, R2, W1) and N2 (R3, W2): 2 networks.
    expect(f.networks).toBe(2)
    expect(f.employed).toBe(2)
    expect(f.unemployed).toBe(1)
    expect(f.production).toBe(4)
    expect(f.upkeep).toBe(2)
    // c1 -> W1 (lowest id reachable); c2 -> W1 taken and W2 is on another
    // network, so c2 stays unemployed; c3 -> W2.
    expect(f.workplaceByColonist[fixture.colonist1Id]).toBe(fixture.workshop1Id)
    expect(f.workplaceByColonist[fixture.colonist2Id]).toBeNull()
    expect(f.workplaceByColonist[fixture.colonist3Id]).toBe(fixture.workshop2Id)
    expect(f.staffedWorkshops).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Experiment J — construction transition (real lifecycle)
// ---------------------------------------------------------------------------

describe('experiment J — construction transition through the real tick lifecycle', () => {
  const place = (
    buildingType: 'residence' | 'workshop',
    x: number,
    y: number
  ) => ({ type: 'placeBuilding' as const, x, y, buildingType })
  const roads = (cells: readonly Cell[]) => ({
    type: 'placeRoads' as const,
    cells,
  })

  it('J1 — under-construction road blocks mobility; operational road enables it', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 1, 1))
    state = stepSimulation(state) // colonist admitted
    state = stepSimulation(state, place('workshop', 1, 3))
    // Road placed this tick: under construction.
    state = stepSimulation(state, roads([{ x: 1, y: 2 }]))
    expect(state.roads['road-1']?.status).toBe('underConstruction')
    expect(getColonistWorkMobility(state, 'colonist-1').mobilityConnected).toBe(
      false
    )
    expect(facts(state).employed).toBe(0)
    expect(facts(state).production).toBe(0)
    expect(facts(state).upkeep).toBe(0)
    const beforeTick = state.time.tick

    // Next tick: the road completes and employment appears in the same tick.
    state = stepSimulation(state)
    expect(state.roads['road-1']?.status).toBe('operational')
    expect(state.time.tick).toBe(beforeTick + 1)
    expect(getColonistWorkMobility(state, 'colonist-1').mobilityConnected).toBe(
      true
    )
    expect(facts(state).employed).toBe(1)
    expect(facts(state).production).toBe(2)
    expect(facts(state).upkeep).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Experiment K — residential-side topology
// ---------------------------------------------------------------------------

describe('experiment K — residential-side topology', () => {
  /** Three 4-road layouts reaching one Workshop from one Residence. */
  const layouts: Record<string, { workshop: Cell; roads: Cell[] }> = {
    K1: {
      workshop: { x: 1, y: 6 },
      roads: [
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 1, y: 5 },
      ],
    },
    K2: {
      workshop: { x: 3, y: 4 },
      roads: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
    },
    K3: {
      workshop: { x: 4, y: 3 },
      roads: [
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
    },
  }

  it('K1/K2/K3 — residential-side shape changes nothing but cost', () => {
    const results = Object.entries(layouts).map(([name, layout]) => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const workshop = operationalBuilding(
        state,
        'workshop',
        layout.workshop.x,
        layout.workshop.y
      )
      state = workshop.state
      state = operationalRoads(state, layout.roads)
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      return { name, f: facts(assignJobs(state)) }
    })
    // Equal road count (4) -> equal cost; identical simulation outcomes.
    for (const { f } of results) {
      expect(f.roads).toBe(4)
      expect(f.networks).toBe(1)
      expect(f.employed).toBe(1)
      expect(f.production).toBe(2)
      expect(f.upkeep).toBe(1)
      expect(Object.values(f.mobilityByColonist)).toEqual([true])
    }
    const byName = Object.fromEntries(results.map((r) => [r.name, r.f]))
    expect(byName.K1?.production).toBe(byName.K2?.production)
    expect(byName.K2?.production).toBe(byName.K3?.production)
    expect(byName.K1?.upkeep).toBe(byName.K3?.upkeep)
  })
})

// ---------------------------------------------------------------------------
// Persistence / determinism for representative audit scenarios
// ---------------------------------------------------------------------------

describe('audit persistence and determinism', () => {
  const scenario = (): SimulationState => {
    let state = createTestState()
    const residenceA = operationalBuilding(state, 'residence', 1, 2)
    state = residenceA.state
    const residenceB = operationalBuilding(state, 'residence', 5, 2)
    state = residenceB.state
    const workshopA = operationalBuilding(state, 'workshop', 1, 4)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 4)
    state = workshopB.state
    state = operationalRoads(
      state,
      [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 3 }))
    )
    const cA = withColonist(state, residenceA.id)
    state = cA.state
    const cB = withColonist(state, residenceB.id)
    state = cB.state
    return assignJobs(state)
  }

  it('P1 — SAVE_VERSION 4 and save/load round-trip the audited state exactly', () => {
    expect(SAVE_VERSION).toBe(7)
    const state = scenario()
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(facts(loaded)).toEqual(facts(state))
    const raw = serializeSave(state)
    for (const fragment of ['mobility', 'eligible', 'bottleneck', 'pressure']) {
      expect(raw.includes(fragment)).toBe(false)
    }
  })

  it('P2 — deterministic replay: same fixture, same facts, same hash', () => {
    const a = scenario()
    const b = scenario()
    expect(facts(a)).toEqual(facts(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(getRoadNetworks(a)).toEqual(getRoadNetworks(b))
  })

  it('P3 — derived queries are pure: hashing the state after querying is stable', () => {
    const state = scenario()
    const before = hashCanonicalState(state)
    for (const id of Object.keys(state.colonists)) {
      getColonistWorkMobility(state, id)
    }
    for (const id of Object.keys(state.buildings)) {
      getBuildingRoadAccess(state, id)
    }
    getRoadNetworks(state)
    materialProductionForTick(state)
    materialUpkeepDueForTick(state)
    assignJobs(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// Classification summary (evidence-backed, code-pinned)
// ---------------------------------------------------------------------------

describe('audit classification summary', () => {
  it('S1 — headline invariants: stranded labour, distance-ordered choice, cost-only length', () => {
    // (1) Road topology CAN strand an employable colonist (Experiment I2).
    let stranded = createTestState()
    const r1 = operationalBuilding(stranded, 'residence', 1, 1)
    stranded = r1.state
    const r2 = operationalBuilding(stranded, 'residence', 1, 3)
    stranded = r2.state
    const w1 = operationalBuilding(stranded, 'workshop', 3, 1)
    stranded = w1.state
    const w2 = operationalBuilding(stranded, 'workshop', 3, 5)
    stranded = w2.state
    stranded = operationalRoad(stranded, 2, 1)
    const sc1 = withColonist(stranded, r1.id)
    stranded = sc1.state
    const sc2 = withColonist(stranded, r2.id)
    stranded = sc2.state
    const strandedFacts = settled(stranded)
    expect(strandedFacts.employed).toBe(1)
    expect(strandedFacts.unemployed).toBe(1)
    expect(strandedFacts.jobCapacity).toBe(2)

    // (2) When two Workshops are reachable, the NEAREST wins regardless of
    //     which was created first (09M; 09L recorded the pre-09M id-order
    //     behaviour, which 09M intentionally replaces).
    const competing = (firstIsLeft: boolean) => {
      let state = createTestState()
      const residence = operationalBuilding(state, 'residence', 1, 1)
      state = residence.state
      const firstPos = firstIsLeft ? { x: 3, y: 1 } : { x: 5, y: 1 }
      const secondPos = firstIsLeft ? { x: 5, y: 1 } : { x: 3, y: 1 }
      const firstBuilt = operationalBuilding(state, 'workshop', firstPos.x, firstPos.y)
      state = firstBuilt.state
      const secondBuilt = operationalBuilding(
        state,
        'workshop',
        secondPos.x,
        secondPos.y
      )
      state = secondBuilt.state
      state = operationalRoads(state, [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ])
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      // (3,1) is 2 road steps away; (5,1) is 4: the near one always wins.
      const nearId = firstIsLeft ? firstBuilt.id : secondBuilt.id
      const farId = firstIsLeft ? secondBuilt.id : firstBuilt.id
      return {
        expected: nearId,
        farId,
        facts: settled(state),
        colonistId: colonist.id,
      }
    }
    const nearFirst = competing(true)
    expect(nearFirst.facts.workplaceByColonist[nearFirst.colonistId]).toBe(
      nearFirst.expected
    )
    expect(nearFirst.facts.workerByWorkshop[nearFirst.farId]).toBe(0)
    const farFirst = competing(false)
    expect(farFirst.facts.workplaceByColonist[farFirst.colonistId]).toBe(
      farFirst.expected
    )
    expect(farFirst.facts.workerByWorkshop[farFirst.farId]).toBe(0)

    // (3) Length matters only through construction cost (Experiment H1).
    const short = validateRoadsPlacement(createTestState(), [{ x: 1, y: 2 }])
    const long = validateRoadsPlacement(createTestState(), [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
    ])
    expect(short.valid && short.totalCost).toBe(ROAD_CONSTRUCTION_COST)
    expect(long.valid && long.totalCost).toBe(3 * ROAD_CONSTRUCTION_COST)
    // (4) Job capacity is a topology-independent ceiling in every scenario.
    expect(getJobCapacity(stranded)).toBe(2)
  })
})
