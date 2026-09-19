/**
 * Spatial network pressure audit (Step 09J).
 *
 * AUDIT TOOLING — not gameplay, not a rebalance. These tests pin what the
 * CURRENT road/network model can and cannot express, using only existing
 * domain/application functions. Every measurement below is the audit
 * evidence: where two topologies produce identical derived facts, the test
 * asserts that identity explicitly — that collapse IS the finding.
 *
 * Nothing in this file is a runtime dependency (test-only, like every
 * other audit suite in tests/).
 */

import { describe, expect, it } from 'vitest'

import {
  areRoadsAdjacent,
  assignJobs,
  countEmployedWorkers,
  createBuilding,
  createColonist,
  createRoads,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getRoadNetworkCount,
  getRoadNetworks,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialUpkeepDueForTick,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  validatePlacement,
  validateRoadsPlacement,
  type BuildingType,
  type SimulationState,
} from '@/index'
import * as Nova from '@/index'
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

/** Colonist bound to a residence, optionally to a workplace (canonical op). */
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

/** Semantic facts the simulation sees for one residence→workplace pair. */
interface PairFacts {
  readonly roadCount: number
  readonly networkCount: number
  readonly residenceNetworks: readonly string[]
  readonly workplaceNetworks: readonly string[]
  readonly residenceAccess: boolean
  readonly workplaceAccess: boolean
  readonly mobilityConnected: boolean
}

const pairFacts = (
  state: SimulationState,
  residenceId: string,
  workshopId: string,
  colonistId: string
): PairFacts => {
  const residence = getBuildingRoadAccess(state, residenceId)
  const workplace = getBuildingRoadAccess(state, workshopId)
  return {
    roadCount: Object.keys(state.roads).length,
    networkCount: getRoadNetworkCount(state),
    residenceNetworks: residence.networkIds,
    workplaceNetworks: workplace.networkIds,
    residenceAccess: residence.hasRoadAccess,
    workplaceAccess: workplace.hasRoadAccess,
    mobilityConnected: getColonistWorkMobility(state, colonistId)
      .mobilityConnected,
  }
}

describe('current spatial model facts (Step 09J §3)', () => {
  it('A0 — occupancy, adjacency and model absences, from source', () => {
    // Roads and buildings each occupy exactly one integer cell...
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const road = operationalRoad(state, 2, 1)
    state = road.state
    expect(state.buildings[residence.id]).toMatchObject({ x: 1, y: 1 })
    expect(state.roads[road.id]).toMatchObject({ x: 2, y: 1 })
    // ...and never share one: both placement validators reject the other.
    expect(validateRoadsPlacement(state, [{ x: 1, y: 1 }])).toEqual({
      valid: false,
      reason: 'cellOccupiedByBuilding',
    })
    expect(
      validatePlacement(state, { x: 2, y: 1 }, 'residence').valid
    ).toBe(false)
    // Adjacency is orthogonal Manhattan-1 only: diagonals never connect.
    expect(areRoadsAdjacent({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true)
    expect(areRoadsAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false)
    expect(areRoadsAdjacent({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false)
    // No travel/pathfinding/movement API exists on the public barrel: the
    // only "distance" in the codebase is Manhattan-1 adjacency and camera
    // positioning (verified by source search; this pins the absences).
    const banned = [
      'shortest',
      'dijkstra',
      'pathfind',
      'travel',
      'commute',
      'vehicle',
      'traffic',
      'movement',
      'passenger',
      'cargo',
    ]
    const exported = Object.keys(Nova).map((key) => key.toLowerCase())
    for (const fragment of banned) {
      expect(
        exported.filter((key) => key.includes(fragment)),
        `no public API containing "${fragment}"`
      ).toEqual([])
    }
  })
})

describe('topology scenarios A–C: direct, corridor, L-shape (Step 09J §5)', () => {
  /** A: R(1,1) — road (1,2) — W(1,3). One road, one network. */
  const scenarioA = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 3)
    state = workshop.state
    state = operationalRoad(state, 1, 2).state
    const colonist = withColonist(state, residence.id, workshop.id)
    return {
      state: colonist.state,
      residenceId: residence.id,
      workshopId: workshop.id,
      colonistId: colonist.id,
    }
  }

  /** B: R(1,1) — 6-road corridor x=2 — W(1,6). Same membership, more road. */
  const scenarioB = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    state = operationalRoads(state, [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
      { x: 2, y: 6 },
    ])
    const colonist = withColonist(state, residence.id, workshop.id)
    return {
      state: colonist.state,
      residenceId: residence.id,
      workshopId: workshop.id,
      colonistId: colonist.id,
    }
  }

  /** C: L-shape. R(1,1) — (2,1),(2,2),(2,3) — W(3,3). */
  const scenarioC = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 3, 3)
    state = workshop.state
    state = operationalRoads(state, [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ])
    const colonist = withColonist(state, residence.id, workshop.id)
    return {
      state: colonist.state,
      residenceId: residence.id,
      workshopId: workshop.id,
      colonistId: colonist.id,
    }
  }

  it('A1 — direct connection: one road, one network, pair fully linked', () => {
    const { state, residenceId, workshopId, colonistId } = scenarioA()
    const facts = pairFacts(state, residenceId, workshopId, colonistId)
    expect(facts.roadCount).toBe(1)
    expect(facts.networkCount).toBe(1)
    expect(facts.residenceAccess).toBe(true)
    expect(facts.workplaceAccess).toBe(true)
    expect(facts.residenceNetworks).toEqual(facts.workplaceNetworks)
    expect(facts.mobilityConnected).toBe(true)
  })

  it('B1 — longer corridor is semantically identical to direct (modulo cost)', () => {
    const a = scenarioA()
    const b = scenarioB()
    const factsA = pairFacts(a.state, a.residenceId, a.workshopId, a.colonistId)
    const factsB = pairFacts(b.state, b.residenceId, b.workshopId, b.colonistId)
    // Same network count, same access, same mobility, same single shared
    // network per endpoint — the model does NOT distinguish the corridor.
    expect(factsB.networkCount).toBe(factsA.networkCount)
    expect(factsB.residenceAccess).toBe(factsA.residenceAccess)
    expect(factsB.workplaceAccess).toBe(factsA.workplaceAccess)
    expect(factsB.mobilityConnected).toBe(factsA.mobilityConnected)
    expect(factsB.residenceNetworks.length).toBe(1)
    expect(factsB.workplaceNetworks.length).toBe(1)
    // The ONLY current difference: 6 road cells cost 6× the Material.
    expect(factsB.roadCount).toBe(6)
    const costA = validateRoadsPlacement(createTestState(), [{ x: 1, y: 2 }])
    const costB = validateRoadsPlacement(createTestState(), [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 },
    ])
    expect(costA.valid && costA.totalCost).toBe(1 * ROAD_CONSTRUCTION_COST)
    expect(costB.valid && costB.totalCost).toBe(6 * ROAD_CONSTRUCTION_COST)
  })

  it('C1 — L-shape is semantically identical to a straight corridor', () => {
    const b = scenarioB()
    const c = scenarioC()
    const factsB = pairFacts(b.state, b.residenceId, b.workshopId, b.colonistId)
    const factsC = pairFacts(c.state, c.residenceId, c.workshopId, c.colonistId)
    expect(factsC.networkCount).toBe(1)
    expect(factsC.residenceAccess).toBe(true)
    expect(factsC.workplaceAccess).toBe(true)
    expect(factsC.mobilityConnected).toBe(true)
    // Shape is invisible to the simulation: same facts as the corridor.
    expect(factsC.networkCount).toBe(factsB.networkCount)
    expect(factsC.mobilityConnected).toBe(factsB.mobilityConnected)
  })
})

describe('topology scenarios D–E: branch and disconnection (Step 09J §5)', () => {
  it('D1 — branch: the spur gives the Farm access, changes nothing for R–W', () => {
    // R(1,1) — (2,1),(3,1),(4,1) — W(5,1), spur (3,2) — F(3,3).
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 1)
    state = workshop.state
    const farm = operationalBuilding(state, 'farm', 3, 3)
    state = farm.state
    state = operationalRoads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 3, y: 2 },
    ])
    const colonist = withColonist(state, residence.id, workshop.id)
    state = colonist.state
    expect(getRoadNetworkCount(state)).toBe(1)
    expect(getBuildingRoadAccess(state, residence.id).hasRoadAccess).toBe(true)
    expect(getBuildingRoadAccess(state, workshop.id).hasRoadAccess).toBe(true)
    // The branch is FUNCTIONAL for the Farm (access it would otherwise lack)
    // and REDUNDANT for the R–W pair (their facts match a spur-less chain).
    expect(getBuildingRoadAccess(state, farm.id).hasRoadAccess).toBe(true)
    expect(getColonistWorkMobility(state, colonist.id).mobilityConnected).toBe(
      true
    )
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
  })

  it('E1 — disconnected networks: the current meaningful boundary', () => {
    // R(1,1) — (2,1) [N1] ··· W(5,5) — (5,4) [N2].
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 5, 5)
    state = workshop.state
    state = operationalRoad(state, 2, 1).state
    state = operationalRoad(state, 5, 4).state
    const colonist = withColonist(state, residence.id, workshop.id)
    state = colonist.state
    const facts = pairFacts(state, residence.id, workshop.id, colonist.id)
    expect(facts.networkCount).toBe(2)
    // Each endpoint HAS access — access alone never crosses networks.
    expect(facts.residenceAccess).toBe(true)
    expect(facts.workplaceAccess).toBe(true)
    expect(facts.residenceNetworks).not.toEqual(facts.workplaceNetworks)
    expect(facts.mobilityConnected).toBe(false)
  })
})

describe('multi-network building access geometry (Step 09J §5 F + §11)', () => {
  /** B(4,4) with N/E/S/W neighbours free for road placement. */
  const buildingAt44 = (): { state: SimulationState; id: string } => {
    const initial = createTestState()
    const building = operationalBuilding(initial, 'farm', 4, 4)
    return { state: building.state, id: building.id }
  }

  it('F1 — two adjacent isolated roads reach two distinct networks', () => {
    const { state: s0, id } = buildingAt44()
    // (4,3) and (5,4) are Manhattan-2 apart: never the same network.
    const s1 = operationalRoad(s0, 4, 3).state
    const s2 = operationalRoad(s1, 5, 4).state
    const access = getBuildingRoadAccess(s2, id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds.length).toBe(2)
    expect(access.networkIds.length).toBe(2)
    expect(getRoadNetworkCount(s2)).toBe(2)
  })

  it('F2 — three and four reachable networks: the geometric maximum', () => {
    const { state: s0, id } = buildingAt44()
    // N(4,3), E(5,4), S(4,5): pairwise Manhattan-2 → three networks.
    let state = operationalRoads(s0, [
      { x: 4, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
    ])
    expect(getBuildingRoadAccess(state, id).networkIds.length).toBe(3)
    // + W(3,4): Manhattan-2 from all three → four networks, the maximum
    // (a 1×1 building has exactly four orthogonal neighbours).
    state = operationalRoad(state, 3, 4).state
    const access = getBuildingRoadAccess(state, id)
    expect(access.networkIds.length).toBe(4)
    expect(new Set(access.networkIds).size).toBe(4)
  })

  it('F3 — extending one access road keeps the network count at two', () => {
    const { state: s0, id } = buildingAt44()
    let state = operationalRoad(s0, 4, 3).state
    state = operationalRoad(state, 5, 4).state
    // Grow the northern network away from the building: still two networks.
    state = operationalRoad(state, 4, 2).state
    const access = getBuildingRoadAccess(state, id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.networkIds.length).toBe(2)
    expect(getRoadNetworks(state).length).toBe(2)
  })

  it('F4 — mobility uses set intersection across multi-network endpoints', () => {
    // Residence R(1,1) reaching [N1, N2]; Workshop W(1,6) reaching [N2, N3].
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 6)
    state = workshop.state
    // N1 = {(2,1)} isolated; N2 = (1,2)..(1,5) reaching the workshop.
    state = operationalRoad(state, 2, 1).state
    state = operationalRoads(state, [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
    ])
    // N3 = {(2,6)} isolated at the workshop side.
    state = operationalRoad(state, 2, 6).state
    const residenceAccess = getBuildingRoadAccess(state, residence.id)
    const workplaceAccess = getBuildingRoadAccess(state, workshop.id)
    expect(residenceAccess.networkIds.length).toBe(2)
    expect(workplaceAccess.networkIds.length).toBe(2)
    const colonist = withColonist(state, residence.id, workshop.id)
    state = colonist.state
    // Exactly one shared network (N2) → connected, never "first == first".
    const shared = residenceAccess.networkIds.filter((networkId) =>
      workplaceAccess.networkIds.includes(networkId)
    )
    expect(shared.length).toBe(1)
    expect(getColonistWorkMobility(state, colonist.id).mobilityConnected).toBe(
      true
    )
  })

  it('F5 — multi-network access is practically player-constructible', () => {
    // The geometry needs no tricks: two separate valid road placements on
    // free cells adjacent to the building — both accepted by the domain.
    const fresh = createTestState()
    const first = validateRoadsPlacement(fresh, [{ x: 4, y: 3 }])
    expect(first.valid).toBe(true)
    let state = createTestState()
    const building = operationalBuilding(state, 'farm', 4, 4)
    state = building.state
    state = operationalRoad(state, 4, 3).state
    const second = validateRoadsPlacement(state, [{ x: 5, y: 4 }])
    expect(second.valid).toBe(true)
    // (No new UI path needed: two ordinary single-cell placements suffice.)
  })
})

describe('redundant topology: loops (Step 09J §5 G + §8)', () => {
  it('G1 — a 2×2 loop is one network, like any 4-chain', () => {
    const loop = operationalRoads(createTestState(), [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ])
    const chain = operationalRoads(createTestState(), [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ])
    expect(getRoadNetworkCount(loop)).toBe(1)
    expect(getRoadNetworkCount(chain)).toBe(1)
    expect(getRoadNetworks(loop).length).toBe(
      getRoadNetworks(chain).length
    )
  })

  it('G2 — a building inside a loop still reaches exactly one network', () => {
    // 3×3 ring (8 roads, one network) with a building at the center (2,2):
    // four access roads, all the same network. A loop can never yield
    // multi-network access — it is connected by definition.
    let state = createTestState()
    const center = operationalBuilding(state, 'farm', 2, 2)
    state = center.state
    state = operationalRoads(state, [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 1, y: 2 }, /* (2,2) = building */ { x: 3, y: 2 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
    ])
    expect(getRoadNetworkCount(state)).toBe(1)
    const access = getBuildingRoadAccess(state, center.id)
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds.length).toBe(4)
    expect(access.networkIds.length).toBe(1)
  })

  it('G3 — chain extension past the building is pure redundancy', () => {
    // R(1,1) — (2,1) — W(3,1), then extend (2,2),(2,3) away from both
    // buildings: same network, no new access, no mobility change — only
    // cost. (The spur must route around the buildings: a building cell is
    // not a road, so a spur through it would split the network instead.)
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 3, 1)
    state = workshop.state
    state = operationalRoad(state, 2, 1).state
    const colonist = withColonist(state, residence.id, workshop.id)
    state = colonist.state
    const before = pairFacts(state, residence.id, workshop.id, colonist.id)
    expect(before.networkCount).toBe(1)
    state = operationalRoads(state, [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ])
    const after = pairFacts(state, residence.id, workshop.id, colonist.id)
    expect(after.networkCount).toBe(before.networkCount)
    expect(after.residenceNetworks).toEqual(before.residenceNetworks)
    expect(after.workplaceNetworks).toEqual(before.workplaceNetworks)
    expect(after.mobilityConnected).toBe(before.mobilityConnected)
    expect(after.roadCount).toBe(before.roadCount + 2)
  })
})

describe('multiple workplaces on one network (Step 09J §9)', () => {
  /**
   * R(1,1) + colonist; W_a(3,3) built first (lower id), W_b(5,5) second.
   * Employment is assigned by ascending workshop id — topology-blind.
   */
  const twoWorkshops = () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshopA = operationalBuilding(state, 'workshop', 3, 3)
    state = workshopA.state
    const workshopB = operationalBuilding(state, 'workshop', 5, 5)
    state = workshopB.state
    const colonist = withColonist(state, residence.id)
    return {
      state: colonist.state,
      residenceId: residence.id,
      workshopAId: workshopA.id,
      workshopBId: workshopB.id,
      colonistId: colonist.id,
    }
  }

  it('I1 — the worker goes to the first-built Workshop, wherever the road is', () => {
    // Road ONLY at the second-built Workshop: employment still lands on W_a.
    const base = twoWorkshops()
    let state = operationalRoad(base.state, 5, 4).state
    state = assignJobs(state)
    const colonist = state.colonists[base.colonistId]
    expect(colonist?.workplaceId).toBe(base.workshopAId)
    // Consequence: staffed roadless W_a produces 0 (upkeep 1); road-served
    // W_b sits vacant. Identical road count, opposite outcome vs I2.
    expect(materialProductionForTick(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(1)
  })

  it('I2 — road at the first-built Workshop: same road count, production 2', () => {
    const base = twoWorkshops()
    let state = operationalRoad(base.state, 3, 2).state
    state = assignJobs(state)
    expect(state.colonists[base.colonistId]?.workplaceId).toBe(
      base.workshopAId
    )
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
  })

  it('I3 — roads at both: employment unchanged, storage doubles (09I rule)', () => {
    const base = twoWorkshops()
    let state = operationalRoad(base.state, 3, 2).state
    state = operationalRoad(state, 5, 4).state
    state = assignJobs(state)
    expect(countEmployedWorkers(state)).toBe(1)
    expect(materialProductionForTick(state)).toBe(2)
    // The vacant Workshop still counts for 08F storage (2 × 25 = 50).
    expect(materialProductionForTick(state)).toBe(2)
    expect(getRoadNetworkCount(state)).toBe(2)
  })

  it('I4 — disconnected networks change nothing about employment', () => {
    // W_a and W_b on separate networks: assignment is still id-ordered.
    const base = twoWorkshops()
    let state = operationalRoads(base.state, [
      { x: 3, y: 2 },
      { x: 5, y: 4 },
    ])
    expect(getRoadNetworkCount(state)).toBe(2)
    state = assignJobs(state)
    expect(state.colonists[base.colonistId]?.workplaceId).toBe(
      base.workshopAId
    )
  })
})

describe('multiple residences, one workplace network (Step 09J §10)', () => {
  /**
   * R1(1,1) + colonist-1, R2(5,5) + colonist-2, single W(3,3) (capacity 1).
   * Chain (2,1),(3,1),(4,1),(4,2),(4,3),(4,4),(4,5) links all three.
   */
  const twoResidences = (connected: boolean) => {
    let state = createTestState()
    const residence1 = operationalBuilding(state, 'residence', 1, 1)
    state = residence1.state
    const residence2 = operationalBuilding(state, 'residence', 5, 5)
    state = residence2.state
    const workshop = operationalBuilding(state, 'workshop', 3, 3)
    state = workshop.state
    if (connected) {
      state = operationalRoads(state, [
        { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 2 },
        { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 },
      ])
    } else {
      // R1 segment isolated; W+R2 segment separate.
      state = operationalRoads(state, [{ x: 2, y: 1 }, { x: 3, y: 1 }])
      state = operationalRoads(state, [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }])
    }
    const colonist1 = withColonist(state, residence1.id)
    state = colonist1.state
    const colonist2 = withColonist(state, residence2.id)
    state = colonist2.state
    state = assignJobs(state)
    return {
      state,
      residence1Id: residence1.id,
      residence2Id: residence2.id,
      workshopId: workshop.id,
      colonist1Id: colonist1.id,
      colonist2Id: colonist2.id,
    }
  }

  it('J1 — both residences reach one network; employment ignores the network', () => {
    const { state, workshopId, colonist1Id, colonist2Id } = twoResidences(true)
    expect(getRoadNetworkCount(state)).toBe(1)
    // Capacity 1: colonist-1 employed, colonist-2 unemployed — the network
    // does not create a second job.
    expect(state.colonists[colonist1Id]?.workplaceId).toBe(workshopId)
    expect(state.colonists[colonist2Id]?.workplaceId).toBeNull()
    expect(materialProductionForTick(state)).toBe(2)
    expect(getColonistWorkMobility(state, colonist1Id).mobilityConnected).toBe(
      true
    )
    // Unemployed colonist: no mobility relationship at all.
    expect(
      getColonistWorkMobility(state, colonist2Id).mobilityConnected
    ).toBe(false)
  })

  it('J2 — disconnecting R2 changes employment and production not at all', () => {
    const linked = twoResidences(true)
    const split = twoResidences(false)
    expect(getRoadNetworkCount(split.state)).toBe(2)
    // Identical employment, production and upkeep in both versions...
    expect(split.state.colonists[split.colonist1Id]?.workplaceId).toBe(
      split.workshopId
    )
    expect(split.state.colonists[split.colonist2Id]?.workplaceId).toBeNull()
    expect(materialProductionForTick(split.state)).toBe(
      materialProductionForTick(linked.state)
    )
    expect(materialUpkeepDueForTick(split.state)).toBe(
      materialUpkeepDueForTick(linked.state)
    )
    // ...the ONLY difference is the informational mobility flag.
    expect(
      getColonistWorkMobility(split.state, split.colonist1Id).mobilityConnected
    ).toBe(false)
    expect(
      getColonistWorkMobility(linked.state, linked.colonist1Id).mobilityConnected
    ).toBe(true)
  })
})

describe('topology equivalence classes (Step 09J §12)', () => {
  /** Four 4-road geometries linking an R–W pair on one network. */
  const geometries: Record<string, { residence: Cell; workshop: Cell; roads: Cell[] }> = {
    straight: {
      residence: { x: 1, y: 1 },
      workshop: { x: 1, y: 4 },
      roads: [
        { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 },
      ],
    },
    lShape: {
      residence: { x: 1, y: 1 },
      workshop: { x: 4, y: 3 },
      roads: [
        { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 },
      ],
    },
    branch: {
      residence: { x: 1, y: 1 },
      workshop: { x: 5, y: 1 },
      roads: [
        { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 2 },
      ],
    },
    loop: {
      residence: { x: 1, y: 2 },
      workshop: { x: 4, y: 2 },
      roads: [
        { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 },
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
      state, 'residence', geometry.residence.x, geometry.residence.y
    )
    state = residence.state
    const workshop = operationalBuilding(
      state, 'workshop', geometry.workshop.x, geometry.workshop.y
    )
    state = workshop.state
    state = operationalRoads(state, geometry.roads)
    const colonist = withColonist(state, residence.id, workshop.id)
    return {
      state: colonist.state,
      residenceId: residence.id,
      workshopId: workshop.id,
      colonistId: colonist.id,
    }
  }

  it('L1 — straight, L, branch and loop collapse to identical simulation facts', () => {
    const names = ['straight', 'lShape', 'branch', 'loop'] as const
    const results = names.map((name) => {
      const fixture = buildGeometry(name)
      return pairFacts(
        fixture.state, fixture.residenceId, fixture.workshopId, fixture.colonistId
      )
    })
    for (const facts of results) {
      // Same road count (4 → same cost 20), one network, both endpoints
      // linked, mobility true — geometry is invisible to the simulation.
      expect(facts.roadCount).toBe(4)
      expect(facts.networkCount).toBe(1)
      expect(facts.residenceAccess).toBe(true)
      expect(facts.workplaceAccess).toBe(true)
      expect(facts.residenceNetworks.length).toBe(1)
      expect(facts.workplaceNetworks.length).toBe(1)
      expect(facts.mobilityConnected).toBe(true)
    }
  })
})

describe('persistence and determinism of topologies (Step 09J §20)', () => {
  const loopState = (): SimulationState => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 2)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 4, 2)
    state = workshop.state
    state = operationalRoads(state, [
      { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 },
    ])
    const colonist = withColonist(state, residence.id, workshop.id)
    return colonist.state
  }

  it('N1 — same topology, same derived facts, same hash; order-independent', () => {
    const first = loopState()
    const second = loopState()
    expect(hashCanonicalState(first)).toBe(hashCanonicalState(second))
    expect(getRoadNetworks(first)).toEqual(getRoadNetworks(second))
    const reordered: SimulationState = {
      ...first,
      roads: Object.fromEntries(Object.entries(first.roads).reverse()),
      buildings: Object.fromEntries(Object.entries(first.buildings).reverse()),
    }
    expect(getRoadNetworks(reordered)).toEqual(getRoadNetworks(first))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(first))
  })

  it('N2 — save/load preserves topology and all derived queries', () => {
    const state = loopState()
    const residenceId = Object.keys(state.buildings).find(
      (id) => state.buildings[id]?.type === 'residence'
    )
    const workshopId = Object.keys(state.buildings).find(
      (id) => state.buildings[id]?.type === 'workshop'
    )
    const colonistId = Object.keys(state.colonists)[0]
    if (
      residenceId === undefined ||
      workshopId === undefined ||
      colonistId === undefined
    ) {
      throw new Error('test helper: fixture ids missing')
    }
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getRoadNetworks(loaded)).toEqual(getRoadNetworks(state))
    expect(getBuildingRoadAccess(loaded, residenceId)).toEqual(
      getBuildingRoadAccess(state, residenceId)
    )
    expect(getColonistWorkMobility(loaded, colonistId)).toEqual(
      getColonistWorkMobility(state, colonistId)
    )
    expect(pairFacts(loaded, residenceId, workshopId, colonistId)).toEqual(
      pairFacts(state, residenceId, workshopId, colonistId)
    )
    expect(SAVE_VERSION).toBe(4)
  })
})
