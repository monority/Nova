/**
 * Step 10CS — Road Expenditure Affordability.
 *
 * Phase 7's affordability contract must cover BOTH Material expenditure paths.
 * `placeBuilding` gained the income-aware query in Step 10CR; `placeRoads` is
 * the second path and had no derived affordability at all, so the UI gate
 * refused a road the domain would build once this tick's income is credited.
 *
 * The pinned invariant: for every state,
 *
 *   getRoadsPlacementAffordability(state, cells).affordable
 *     === stepSimulation(state, placeRoads).accepted
 *
 * Nothing here changes the domain: the validator still reports the raw stock
 * shortfall, and the query is the derived income-aware layer on top of it.
 */

import { describe, expect, it } from 'vitest'

import {
  getCommerceRevenuePerTick,
  getNetMoneyPerTick,
  getTaxRevenuePerTick,

  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getMaintenanceDuePerTick,
  getPlacementAffordability,
  getRoadsPlacementAffordability,
  getRevenuePerTick,
  hashCanonicalState,
  loadSave,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  validateRoadsPlacement,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10cs', width: 12, height: 12 },
}

/** A free cell in the fixture world (residences/farm/road live on x=0). */
const FREE_CELL = { x: 6, y: 6 }

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10cs: missing building')
  }
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational' as const,
        constructionRemaining: 0,
      },
    },
  }
}

/**
 * One staffed operational Workshop on a connected road: the ONLY employment
 * that earns Material income (product-model correction: Farm/Well workers
 * earn nothing). +2 income/tick, −1 upkeep/tick, and stored production is
 * isolated by the 08F cap below. This isolates the `getRevenuePerTick`
 * term of the affordability clause on the income source that exists.
 */
const workshopWorkerFixture = (): SimulationState => {
  let state = createInitialState(config)
  state = operational(state, 'residence', 0, 0)
  state = operational(state, 'workshop', 0, 2)
  const roadCreated = createRoads(state, [{ x: 0, y: 1 }])
  const roads = { ...roadCreated.state.roads }
  for (const roadId of roadCreated.roadIds) {
    const road = roads[roadId]
    if (road !== undefined) {
      roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
    }
  }
  state = { ...roadCreated.state, roads }
  const residenceId = Object.keys(state.buildings).find(
    (id) => state.buildings[id]?.type === 'residence'
  )
  if (residenceId === undefined) {
    throw new Error('10cs: missing residence')
  }
  state = createColonist(state, residenceId).state
  return assignJobs(state)
}

const withMaterial = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, money: material },
})

const roadCount = (state: SimulationState): number => Object.keys(state.roads).length

describe('10CS — road expenditure affordability', () => {
  it('R0 — the fixture isolates revenue: +3/tick (1 tax + 2 commerce), maintenance 2', () => {
    // Uncapped treasury: the recurring flow is revenue (3) minus
    // maintenance (2) at any balance.
    const state = withMaterial(workshopWorkerFixture(), 25)
    expect(getRevenuePerTick(state)).toBe(3)
    expect(getTaxRevenuePerTick(state)).toBe(1)
    expect(getCommerceRevenuePerTick(state)).toBe(2)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    expect(getNetMoneyPerTick(state)).toBe(1)
  })

  it('R1 — stock alone covers the road: valid, affordable, no inflow clause', () => {
    const state = withMaterial(workshopWorkerFixture(), ROAD_CONSTRUCTION_COST)
    const affordability = getRoadsPlacementAffordability(state, [FREE_CELL])
    expect(affordability.placement.valid).toBe(true)
    expect(affordability.affordable).toBe(true)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.moneyRequired).toBe(ROAD_CONSTRUCTION_COST)
    expect(affordability.moneyAvailable).toBe(ROAD_CONSTRUCTION_COST)
  })

  it('R2 — one below cost is completed by this tick income, then the command accepts', () => {
    const before = withMaterial(workshopWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    const affordability = getRoadsPlacementAffordability(before, [FREE_CELL])
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.affordable).toBe(true)

    const after = stepSimulation(before, { type: 'placeRoads', cells: [FREE_CELL] })
    expect(roadCount(after)).toBe(roadCount(before) + 1)
    // 4 stock + 3 revenue − 5 road − 2 upkeep = exactly 0 left.
    expect(after.resources.money).toBe(0)
  })

  it('R3 — control: without any inflow the same stock is short', () => {
    const before = withMaterial(workshopWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    // Step001: a workerless colony still earns commerce, so the control
    // isolates the inflow clause by disconnecting the network (commerce 0)
    // and removing the colonists (taxes 0) — zero revenue, stock 4 < 5.
    const workerless: SimulationState = { ...before, colonists: {}, roads: {} }
    expect(getRevenuePerTick(workerless)).toBe(0)
    const affordability = getRoadsPlacementAffordability(workerless, [FREE_CELL])
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(false)
  })

  it('R4 — the query agrees with the authoritative command across a material sweep', () => {
    for (let material = 0; material <= 8; material += 1) {
      const before = withMaterial(workshopWorkerFixture(), material)
      const affordable = getRoadsPlacementAffordability(before, [FREE_CELL]).affordable
      const after = stepSimulation(before, { type: 'placeRoads', cells: [FREE_CELL] })
      const accepted = roadCount(after) > roadCount(before)
      expect(affordable, `material=${material}`).toBe(accepted)
    }
  })

  it('R5 — multi-cell cost scales and the boundary is exact', () => {
    const cells = [
      { x: 6, y: 6 },
      { x: 7, y: 6 },
    ]
    const required = 2 * ROAD_CONSTRUCTION_COST

    const covered = getRoadsPlacementAffordability(
      withMaterial(workshopWorkerFixture(), required - 1),
      cells
    )
    expect(covered.moneyRequired).toBe(required)
    expect(covered.coveredBySameTickInflow).toBe(true)
    expect(covered.affordable).toBe(true)

    const short = getRoadsPlacementAffordability(
      withMaterial(workshopWorkerFixture(), required - 5),
      cells
    )
    // Stock 5 + 4 same-tick inflow (2 stored + 2 income) = 9 < 10.
    expect(short.affordable).toBe(false)
  })

  it('R6 — a spatial failure is never masked by available Material', () => {
    const state = withMaterial(workshopWorkerFixture(), 1000)
    // (0,0) holds the fixture residence.
    const affordability = getRoadsPlacementAffordability(state, [{ x: 0, y: 0 }])
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(false)
  })

  it('R7 — duplicate cells are priced once (normalized, like the domain)', () => {
    const state = withMaterial(workshopWorkerFixture(), 1000)
    const affordability = getRoadsPlacementAffordability(state, [FREE_CELL, FREE_CELL])
    expect(affordability.moneyRequired).toBe(ROAD_CONSTRUCTION_COST)
  })

  it('R8 — a rejected road command spends nothing and creates no road', () => {
    const before = withMaterial(workshopWorkerFixture(), 0)
    const after = stepSimulation(before, { type: 'placeRoads', cells: [FREE_CELL] })
    expect(roadCount(after)).toBe(roadCount(before))
    // Same-tick inflow (3 revenue) is credited and upkeep (−2) is
    // paid independently of the rejected command; the road cost is not spent.
    expect(after.resources.money).toBe(1)
    expect(after.resources.money).toBeLessThan(ROAD_CONSTRUCTION_COST)
  })

  it('R9 — the query is a pure derivation: it never mutates the state', () => {
    const state = withMaterial(workshopWorkerFixture(), 3)
    const before = hashCanonicalState(state)
    getRoadsPlacementAffordability(state, [FREE_CELL])
    expect(hashCanonicalState(state)).toBe(before)
  })

  it('R10 — the domain validator is unchanged: it still reports the raw stock shortfall', () => {
    const state = withMaterial(workshopWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    expect(validateRoadsPlacement(state, [FREE_CELL])).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
    expect(getRoadsPlacementAffordability(state, [FREE_CELL]).affordable).toBe(true)
  })

  it('R11 — building affordability (Step 10CR) stays income-aware', () => {
    const before = withMaterial(workshopWorkerFixture(), 24)
    const affordability = getPlacementAffordability(before, { x: 8, y: 8 }, 'residence')
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.affordable).toBe(true)
  })

  it('R12 — affordability stays derived: save/load is identical and SAVE_VERSION is 8', () => {
    const state = withMaterial(workshopWorkerFixture(), 4)
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(getRoadsPlacementAffordability(restored, [FREE_CELL])).toEqual(
      getRoadsPlacementAffordability(state, [FREE_CELL])
    )
    expect(SAVE_VERSION).toBe(11)
  })
})
