/**
 * Farm employment & worker competition tests (Step 10E).
 *
 * Rule under test:
 *   a Farm produces Food only when it is OPERATIONAL and STAFFED, and its
 *   worker is an ordinary colonist drawn from the SAME labour pool as
 *   Workshops. Among eligible workplaces (Farm or Workshop) a colonist picks
 *   the smallest operational road distance, tie-broken by the lowest building
 *   id — NO building-type priority (09M remains authoritative).
 *
 * Timing contract (Step 10E §11-12): `produceFood` (phase 4) runs BEFORE
 * `assignJobs` (phase 7), so it reads the assignment written by the PREVIOUS
 * tick. A Farm staffed on tick N therefore produces from tick N+1. The phase
 * order is deliberately unchanged; Workshop Material timing (assignJobs then
 * produceMaterial, same tick) is untouched.
 *
 * Food is NOT road-gated: road access only matters because EMPLOYMENT is
 * mobility-gated (09K). A Farm's output changes when worker eligibility
 * changes, never because of a road-to-food rule.
 */

import { describe, expect, it } from 'vitest'

import {
  areBuildingsMobilityConnected,
  assignJobs,
  countStaffedOperationalFarms,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  FARM_JOB_CAPACITY,
  foodProductionForTick,
  getBuildingRoadAccess,
  getEmploymentSummary,
  getJobCapacity,
  getPopulationCount,
  getRoadDistanceBetweenBuildings,
  hashCanonicalState,
  isOperationalFarm,
  isOperationalWorkplace,
  jobCapacityOf,
  loadSave,
  materialProductionForTick,
  produceFood,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  WORKSHOP_JOB_CAPACITY,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

// ---------------------------------------------------------------------------
// Helpers
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

const opRoad = (
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

const roads = (
  state: SimulationState,
  cells: readonly { readonly x: number; readonly y: number }[]
): SimulationState => {
  let next = state
  for (const cell of cells) {
    next = opRoad(next, cell.x, cell.y)
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

const workplaceOf = (
  state: SimulationState,
  colonistId: string
): string | null => state.colonists[colonistId]?.workplaceId ?? null

/** Residence(1,1) + farm(1,3) sharing road (1,2): distance 0. */
const farmPair = () => {
  let state = createTestState()
  const residence = operationalBuilding(state, 'residence', 1, 1)
  state = residence.state
  const farm = operationalBuilding(state, 'farm', 1, 3)
  state = farm.state
  state = roads(state, [{ x: 1, y: 2 }])
  return { state, residenceId: residence.id, farmId: farm.id }
}

/**
 * Competition fixture: residence(1,1); farm(1,3) at distance 0 (shared road
 * (1,2)); workshop(5,3) far away (chain (2,2)..(5,2)). Created farm-first or
 * workshop-first to prove id order is only a tie-break.
 */
const competitionPair = (workplaceFirst: 'farm' | 'workshop') => {
  let state = createTestState()
  const residence = operationalBuilding(state, 'residence', 1, 1)
  state = residence.state
  const firstType: BuildingType =
    workplaceFirst === 'farm' ? 'farm' : 'workshop'
  const firstAt = workplaceFirst === 'farm' ? { x: 1, y: 3 } : { x: 5, y: 3 }
  const secondAt = workplaceFirst === 'farm' ? { x: 5, y: 3 } : { x: 1, y: 3 }
  const first = operationalBuilding(state, firstType, firstAt.x, firstAt.y)
  state = first.state
  const secondType: BuildingType =
    workplaceFirst === 'farm' ? 'workshop' : 'farm'
  const second = operationalBuilding(state, secondType, secondAt.x, secondAt.y)
  state = second.state
  state = roads(state, [
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
  ])
  return {
    state,
    residenceId: residence.id,
    nearId: workplaceFirst === 'farm' ? first.id : second.id,
    farId: workplaceFirst === 'farm' ? second.id : first.id,
    nearType: 'farm' as BuildingType,
    farType: 'workshop' as BuildingType,
  }
}

// ---------------------------------------------------------------------------
// A/B/C — Farm alone, staffed farm, workshop unchanged
// ---------------------------------------------------------------------------

describe('A/B — a Farm produces only when staffed', () => {
  it('defines the minimal workplace contract for Farms', () => {
    expect(FARM_JOB_CAPACITY).toBe(1)
    expect(WORKSHOP_JOB_CAPACITY).toBe(1)
    expect(isOperationalFarm({ type: 'farm', status: 'operational' })).toBe(true)
    expect(isOperationalFarm({ type: 'farm', status: 'underConstruction' })).toBe(false)
    expect(
      isOperationalWorkplace({ type: 'farm', status: 'operational' })
    ).toBe(true)
    expect(
      isOperationalWorkplace({ type: 'workshop', status: 'operational' })
    ).toBe(true)
    expect(
      isOperationalWorkplace({ type: 'residence', status: 'operational' })
    ).toBe(false)
    expect(jobCapacityOf({ type: 'farm', status: 'operational' })).toBe(1)
    expect(jobCapacityOf({ type: 'farm', status: 'underConstruction' })).toBe(0)
  })

  it('A — 1 operational Farm, 0 colonists: production 0', () => {
    let state = createTestState()
    const farm = operationalBuilding(state, 'farm', 1, 1)
    state = farm.state
    expect(foodProductionForTick(state)).toBe(0)
    expect(countStaffedOperationalFarms(state)).toBe(0)
    expect(getJobCapacity(state)).toBe(1)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 0,
      employed: 0,
      jobCapacity: 1,
      vacantJobs: 1,
    })
    expect(produceFood(state)).toBe(state)
  })

  it('B — 1 eligible colonist staffs the Farm: production 2', () => {
    const fixture = farmPair()
    let state = withColonist(fixture.state, fixture.residenceId).state
    expect(foodProductionForTick(state)).toBe(0) // vacant before assignment
    state = assignJobs(state)
    expect(countWorkersAt(state, fixture.farmId)).toBe(1)
    expect(countStaffedOperationalFarms(state)).toBe(1)
    expect(foodProductionForTick(state)).toBe(2)
    const before = state.resources.food
    expect(produceFood(state).resources.food).toBe(before + 2)
  })

  it('a Farm without road access cannot be staffed (mobility gate, no Food road rule)', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const farm = operationalBuilding(state, 'farm', 6, 6) // no roads at all
    state = farm.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    expect(areBuildingsMobilityConnected(state, residence.id, farm.id)).toBe(
      false
    )
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBeNull()
    expect(foodProductionForTick(assigned)).toBe(0)
  })
})

describe('C — Workshop behavior is unchanged', () => {
  it('C1 — a staffed operational Workshop still produces 2 Material', () => {
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 1, 1)
    state = residence.state
    const workshop = operationalBuilding(state, 'workshop', 1, 3)
    state = workshop.state
    state = roads(state, [{ x: 1, y: 2 }])
    const colonist = withColonist(state, residence.id)
    state = assignJobs(colonist.state)
    expect(countWorkersAt(state, workshop.id)).toBe(1)
    expect(materialProductionForTick(state)).toBe(2)
    expect(foodProductionForTick(state)).toBe(0) // no farm at all
  })

  it('C2 — a vacant operational Workshop produces 0', () => {
    let state = createTestState()
    const workshop = operationalBuilding(state, 'workshop', 1, 1)
    state = workshop.state
    state = roads(state, [{ x: 2, y: 1 }])
    expect(materialProductionForTick(state)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// D/E/F — competition for one labour pool
// ---------------------------------------------------------------------------

describe('D — Farm + Workshop + one colonist: exactly one is staffed', () => {
  it('D1 — the nearest workplace wins (Farm at distance 0 beats the far Workshop)', () => {
    const fixture = competitionPair('farm') // farm created first (lower id)
    let state = withColonist(fixture.state, fixture.residenceId).state
    state = assignJobs(state)
    expect(workplaceOf(state, 'colonist-1')).toBe(fixture.nearId)
    expect(countStaffedOperationalFarms(state)).toBe(1)
    expect(foodProductionForTick(state)).toBe(2)
    expect(materialProductionForTick(state)).toBe(0)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 1,
      employed: 1,
      jobCapacity: 2,
      vacantJobs: 1,
    })
  })

  it('D2 — distance beats id order: the near Workshop wins when it is farther from the low id', () => {
    // Workshop created first (lower id) but placed FAR; farm created second
    // (higher id) but placed NEAR. The near farm must win.
    const fixture = competitionPair('workshop')
    let state = withColonist(fixture.state, fixture.residenceId).state
    state = assignJobs(state)
    expect(workplaceOf(state, 'colonist-1')).toBe(fixture.nearId)
    expect(state.buildings[fixture.nearId]?.type).toBe('farm')
    expect(foodProductionForTick(state)).toBe(2)
    expect(materialProductionForTick(state)).toBe(0)
  })

  it('D3 — equal distance across types: lowest id wins (no type priority)', () => {
    // Residence between a farm and a workshop, both at equal distance.
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 3, 1)
    state = residence.state
    const farm = operationalBuilding(state, 'farm', 1, 1)
    state = farm.state
    const workshop = operationalBuilding(state, 'workshop', 5, 1)
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    expect(
      getRoadDistanceBetweenBuildings(state, residence.id, farm.id)
    ).toBe(
      getRoadDistanceBetweenBuildings(state, residence.id, workshop.id)
    )
    const assigned = assignJobs(state)
    // Farm has the lower id (created first) -> farm wins on the tie-break,
    // proving the selection is type-blind.
    expect(workplaceOf(assigned, colonist.id)).toBe(farm.id)
    expect(foodProductionForTick(assigned)).toBe(2)
    expect(materialProductionForTick(assigned)).toBe(0)
  })
})

describe('E — Farm + Workshop + two colonists: both staffed', () => {
  it('E1 — two colonists fill both workplaces', () => {
    const fixture = competitionPair('farm')
    let state = fixture.state
    const c1 = withColonist(state, fixture.residenceId)
    state = c1.state
    const c2 = withColonist(state, fixture.residenceId)
    state = c2.state
    const assigned = assignJobs(state)
    expect(getEmploymentSummary(assigned)).toMatchObject({
      population: 2,
      employed: 2,
      jobCapacity: 2,
      vacantJobs: 0,
    })
    expect(countStaffedOperationalFarms(assigned)).toBe(1)
    expect(foodProductionForTick(assigned)).toBe(2) // one staffed farm
    expect(materialProductionForTick(assigned)).toBe(2) // one staffed workshop
  })
})

describe('F — mixed Farm/Workshop capacities', () => {
  /**
   * Colony with R residences (one resident each) + F farms + W workshops, all
   * attached to one road network so every pair is mobility-connected. The
   * selection among them is 09M distance-then-id, so which TYPE gets staffed
   * is not dictated here — only the capacity/one-worker contracts are.
   */
  const mixed = (
    residences: number,
    farms: number,
    workshops: number
  ): SimulationState => {
    let state = createTestState()
    const residenceIds: string[] = []
    for (let i = 0; i < residences; i += 1) {
      const r = operationalBuilding(state, 'residence', i, 0)
      state = r.state
      residenceIds.push(r.id)
    }
    for (let i = 0; i < farms; i += 1) {
      const f = operationalBuilding(state, 'farm', i + 4, 0)
      state = f.state
    }
    for (let i = 0; i < workshops; i += 1) {
      const w = operationalBuilding(state, 'workshop', i + 4, 2)
      state = w.state
    }
    // One road row (y=1) touching every residence (y=0), farm (y=0) and
    // workshop (y=2) — a single connected network.
    const roadCells: { x: number; y: number }[] = []
    for (let i = 0; i < 8; i += 1) {
      roadCells.push({ x: i, y: 1 })
    }
    state = roads(state, roadCells)
    for (const id of residenceIds) {
      const c = withColonist(state, id)
      state = c.state
    }
    return assignJobs(state)
  }

  /** Staffed workplaces of any type — one worker each by construction. */
  const staffedWorkplaceCount = (state: SimulationState): number =>
    countStaffedOperationalFarms(state) +
    Object.values(state.buildings).filter(
      (b) => b.type === 'workshop' && countWorkersAt(state, b.id) > 0
    ).length

  const assertOneWorkerPerWorkplace = (state: SimulationState): void => {
    for (const b of Object.values(state.buildings)) {
      if (b.type === 'farm' || b.type === 'workshop') {
        expect(countWorkersAt(state, b.id)).toBeLessThanOrEqual(1)
      }
    }
  }

  const assertNoFreeProduction = (state: SimulationState): void => {
    const staffedFarms = countStaffedOperationalFarms(state)
    const staffedWorkshops = Object.values(state.buildings).filter(
      (b) => b.type === 'workshop' && countWorkersAt(state, b.id) > 0
    ).length
    expect(foodProductionForTick(state)).toBe(staffedFarms * 2)
    expect(materialProductionForTick(state)).toBe(staffedWorkshops * 2)
  }

  it('F1 — 2 Farms + 1 Workshop + 2 colonists: two staffed, one vacant', () => {
    const state = mixed(2, 2, 1)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 2,
      employed: 2,
      jobCapacity: 3,
      vacantJobs: 1,
    })
    expect(staffedWorkplaceCount(state)).toBe(2)
    assertOneWorkerPerWorkplace(state)
    assertNoFreeProduction(state)
  })

  it('F2 — 1 Farm + 2 Workshops + 2 colonists: two staffed, one vacant', () => {
    const state = mixed(2, 1, 2)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 2,
      employed: 2,
      jobCapacity: 3,
      vacantJobs: 1,
    })
    expect(staffedWorkplaceCount(state)).toBe(2)
    assertOneWorkerPerWorkplace(state)
    assertNoFreeProduction(state)
  })

  it('F3 — 2 Farms + 2 Workshops + 2 colonists: exactly two staffed', () => {
    const state = mixed(2, 2, 2)
    expect(getEmploymentSummary(state)).toMatchObject({
      population: 2,
      employed: 2,
      jobCapacity: 4,
      vacantJobs: 2,
    })
    expect(staffedWorkplaceCount(state)).toBe(2)
    assertOneWorkerPerWorkplace(state)
    assertNoFreeProduction(state)
    expect(foodProductionForTick(state) + materialProductionForTick(state)).toBe(
      4
    )
  })
})

// ---------------------------------------------------------------------------
// G/H — construction state and mobility disconnect
// ---------------------------------------------------------------------------

describe('G — construction state', () => {
  it('G1 — an under-construction Farm is not a workplace and produces nothing', () => {
    let state = createTestState()
    state = stepSimulation(state, {
      type: 'placeBuilding',
      x: 1,
      y: 1,
      buildingType: 'residence',
    })
    state = stepSimulation(state) // residence operational, colonist-1
    state = stepSimulation(state, {
      type: 'placeBuilding',
      x: 1,
      y: 3,
      buildingType: 'farm',
    }) // farm underConstruction (tick 3)
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    expect(jobCapacityOf(state.buildings['building-2']!)).toBe(0)
    expect(foodProductionForTick(state)).toBe(0)
    // The colonist has no eligible workplace yet.
    expect(state.colonists['colonist-1']?.workplaceId).toBeNull()
    // A road on the next tick; the farm is still under construction then.
    state = stepSimulation(state, {
      type: 'placeRoads',
      cells: [{ x: 1, y: 2 }],
    })
  })

  it('G2 — after becoming operational: assigned, then productive next tick', () => {
    let state = createTestState()
    state = stepSimulation(state, {
      type: 'placeBuilding',
      x: 1,
      y: 1,
      buildingType: 'residence',
    })
    state = stepSimulation(state)
    state = stepSimulation(state, {
      type: 'placeBuilding',
      x: 1,
      y: 3,
      buildingType: 'farm',
    })
    state = stepSimulation(state, {
      type: 'placeRoads',
      cells: [{ x: 1, y: 2 }],
    })
    // Road complete + farm operational on the next tick: assignment happens,
    // but produceFood already ran before assignJobs this tick.
    state = stepSimulation(state)
    expect(state.buildings['building-2']?.status).toBe('operational')
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(countStaffedOperationalFarms(state)).toBe(1)
    // Next tick: the staffed farm produces.
    const before = state.resources.food
    const next = stepSimulation(state)
    expect(next.resources.food).toBe(before + 2 - 1)
  })
})

describe('H — mobility disconnect/reconnect', () => {
  it('H1 — breaking the shared contact unstaffs the Farm and stops Food', () => {
    const fixture = farmPair()
    let state = withColonist(fixture.state, fixture.residenceId).state
    state = assignJobs(state)
    expect(foodProductionForTick(state)).toBe(2)
    // Rupture: the shared contact road becomes underConstruction.
    const roadId = Object.keys(state.roads)[0]!
    state = {
      ...state,
      roads: {
        ...state.roads,
        [roadId]: {
          ...state.roads[roadId]!,
          status: 'underConstruction',
          constructionRemaining: 1,
        },
      },
    }
    const reassigned = assignJobs(state)
    expect(workplaceOf(reassigned, 'colonist-1')).toBeNull()
    expect(countStaffedOperationalFarms(reassigned)).toBe(0)
    expect(foodProductionForTick(reassigned)).toBe(0)
    expect(getBuildingRoadAccess(reassigned, fixture.farmId).hasRoadAccess).toBe(
      false
    )
  })

  it('H2 — reconnecting restores eligibility and Food on the next assignment', () => {
    const fixture = farmPair()
    let state = withColonist(fixture.state, fixture.residenceId).state
    const roadId = Object.keys(state.roads)[0]!
    state = {
      ...state,
      roads: {
        ...state.roads,
        [roadId]: {
          ...state.roads[roadId]!,
          status: 'underConstruction',
          constructionRemaining: 1,
        },
      },
    }
    state = assignJobs(state)
    expect(foodProductionForTick(state)).toBe(0)
    // Repair the road (operational again).
    state = {
      ...state,
      roads: {
        ...state.roads,
        [roadId]: {
          ...state.roads[roadId]!,
          status: 'operational',
          constructionRemaining: 0,
        },
      },
    }
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, 'colonist-1')).toBe(fixture.farmId)
    expect(foodProductionForTick(assigned)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// I — spatial preference (09M stays authoritative)
// ---------------------------------------------------------------------------

describe('I — spatial preference across workplace types', () => {
  it('I1 — varying road distance flips the winner between Farm and Workshop', () => {
    // Sampled in both geometries: the NEAR workplace always wins, and the
    // selection is type-blind (09M distance then id).
    const nearFarm = competitionPair('farm')
    const nearWorkshop = competitionPair('workshop')
    const a = assignJobs(
      withColonist(nearFarm.state, nearFarm.residenceId).state
    )
    const b = assignJobs(
      withColonist(nearWorkshop.state, nearWorkshop.residenceId).state
    )
    expect(a.buildings[workplaceOf(a, 'colonist-1')!]?.type).toBe('farm')
    expect(b.buildings[workplaceOf(b, 'colonist-1')!]?.type).toBe('farm')
    // Both fixtures place the farm near; flipping the geometry to place the
    // workshop near must produce the mirror result.
    let state = createTestState()
    const residence = operationalBuilding(state, 'residence', 5, 1)
    state = residence.state
    const farm = operationalBuilding(state, 'farm', 1, 1) // far
    state = farm.state
    const workshop = operationalBuilding(state, 'workshop', 5, 3) // near
    state = workshop.state
    state = roads(state, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 2 },
    ])
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    const assigned = assignJobs(state)
    expect(workplaceOf(assigned, colonist.id)).toBe(workshop.id)
    expect(foodProductionForTick(assigned)).toBe(0)
    expect(materialProductionForTick(assigned)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// J — Food is not road-gated; only employment is mobility-gated
// ---------------------------------------------------------------------------

describe('J — Food is not road-gated', () => {
  it('J1 — an unstaffed road-connected Farm still produces 0', () => {
    // Road access exists, but no colonist is available: production stays 0.
    let state = createTestState()
    const farm = operationalBuilding(state, 'farm', 1, 1)
    state = farm.state
    state = roads(state, [{ x: 2, y: 1 }])
    expect(getBuildingRoadAccess(state, farm.id).hasRoadAccess).toBe(true)
    expect(foodProductionForTick(state)).toBe(0)
  })

  it('J2 — staffing, not road access, is what moves production', () => {
    const fixture = farmPair()
    const vacant = fixture.state
    expect(foodProductionForTick(vacant)).toBe(0)
    const staffed = assignJobs(
      withColonist(vacant, fixture.residenceId).state
    )
    expect(foodProductionForTick(staffed)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Determinism, persistence, performance guard
// ---------------------------------------------------------------------------

describe('determinism and persistence', () => {
  it('replay: same commands produce the same state and hash', () => {
    const run = (): SimulationState => {
      let state = competitionPair('farm').state
      const c = withColonist(state, 'building-1')
      state = c.state
      state = assignJobs(state)
      for (let i = 0; i < 5; i += 1) {
        state = stepSimulation(state)
      }
      return state
    }
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('save/load preserves farm employment and stays off the save surface', () => {
    const fixture = competitionPair('farm')
    const state = assignJobs(
      withColonist(fixture.state, fixture.residenceId).state
    )
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(SAVE_VERSION).toBe(5)
    // No derived staffing field is persisted or hashed.
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('farmWorkers')
    expect(serialized).not.toContain('staffed')
    expect(serialized).not.toContain('vacant')
  })

  it('population/employment invariants hold with farms in the pool', () => {
    const state = assignJobs(competitionPair('farm').state)
    const summary = getEmploymentSummary(state)
    expect(summary.employed).toBeLessThanOrEqual(summary.population)
    expect(summary.employed).toBeLessThanOrEqual(summary.jobCapacity)
    expect(summary.vacantJobs).toBeGreaterThanOrEqual(0)
    expect(getPopulationCount(state)).toBeGreaterThanOrEqual(0)
  })
})
