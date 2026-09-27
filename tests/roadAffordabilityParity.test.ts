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
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getPlacementAffordability,
  getRoadsPlacementAffordability,
  getWorkforceIncome,
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
 * One staffed operational Farm on a connected road: +1 Material income per
 * tick, no stored Workshop production and no upkeep. This isolates the
 * `getWorkforceIncome` term of the affordability clause.
 */
const farmWorkerFixture = (): SimulationState => {
  let state = createInitialState(config)
  state = operational(state, 'residence', 0, 0)
  state = operational(state, 'farm', 0, 2)
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
  resources: { ...state.resources, construction: material },
})

const roadCount = (state: SimulationState): number => Object.keys(state.roads).length

describe('10CS — road expenditure affordability', () => {
  it('R0 — the fixture isolates income: +1/tick, no stored production, no upkeep', () => {
    const state = withMaterial(farmWorkerFixture(), 0)
    expect(getWorkforceIncome(state)).toBe(1)
    expect(getMaterialStoredProductionPerTick(state)).toBe(0)
    expect(getMaterialUpkeepPerTick(state)).toBe(0)
  })

  it('R1 — stock alone covers the road: valid, affordable, no inflow clause', () => {
    const state = withMaterial(farmWorkerFixture(), ROAD_CONSTRUCTION_COST)
    const affordability = getRoadsPlacementAffordability(state, [FREE_CELL])
    expect(affordability.placement.valid).toBe(true)
    expect(affordability.affordable).toBe(true)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.materialRequired).toBe(ROAD_CONSTRUCTION_COST)
    expect(affordability.materialAvailable).toBe(ROAD_CONSTRUCTION_COST)
  })

  it('R2 — one below cost is completed by this tick income, then the command accepts', () => {
    const before = withMaterial(farmWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    const affordability = getRoadsPlacementAffordability(before, [FREE_CELL])
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.affordable).toBe(true)

    const after = stepSimulation(before, { type: 'placeRoads', cells: [FREE_CELL] })
    expect(roadCount(after)).toBe(roadCount(before) + 1)
    // 4 stock + 1 income = exactly the 5 cost, spent once.
    expect(after.resources.construction).toBe(0)
  })

  it('R3 — control: without the worker income the same stock is short', () => {
    const before = withMaterial(farmWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    const workerless: SimulationState = { ...before, colonists: {} }
    const affordability = getRoadsPlacementAffordability(workerless, [FREE_CELL])
    expect(getWorkforceIncome(workerless)).toBe(0)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(false)
  })

  it('R4 — the query agrees with the authoritative command across a material sweep', () => {
    for (let material = 0; material <= 8; material += 1) {
      const before = withMaterial(farmWorkerFixture(), material)
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
      withMaterial(farmWorkerFixture(), required - 1),
      cells
    )
    expect(covered.materialRequired).toBe(required)
    expect(covered.coveredBySameTickInflow).toBe(true)
    expect(covered.affordable).toBe(true)

    const short = getRoadsPlacementAffordability(
      withMaterial(farmWorkerFixture(), required - 2),
      cells
    )
    expect(short.affordable).toBe(false)
  })

  it('R6 — a spatial failure is never masked by available Material', () => {
    const state = withMaterial(farmWorkerFixture(), 1000)
    // (0,0) holds the fixture residence.
    const affordability = getRoadsPlacementAffordability(state, [{ x: 0, y: 0 }])
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(false)
  })

  it('R7 — duplicate cells are priced once (normalized, like the domain)', () => {
    const state = withMaterial(farmWorkerFixture(), 1000)
    const affordability = getRoadsPlacementAffordability(state, [FREE_CELL, FREE_CELL])
    expect(affordability.materialRequired).toBe(ROAD_CONSTRUCTION_COST)
  })

  it('R8 — a rejected road command spends nothing and creates no road', () => {
    const before = withMaterial(farmWorkerFixture(), 0)
    const after = stepSimulation(before, { type: 'placeRoads', cells: [FREE_CELL] })
    expect(roadCount(after)).toBe(roadCount(before))
    // Income is credited independently of the command; the road cost is not spent.
    expect(after.resources.construction).toBe(getWorkforceIncome(before))
    expect(after.resources.construction).toBeLessThan(ROAD_CONSTRUCTION_COST)
  })

  it('R9 — the query is a pure derivation: it never mutates the state', () => {
    const state = withMaterial(farmWorkerFixture(), 3)
    const before = hashCanonicalState(state)
    getRoadsPlacementAffordability(state, [FREE_CELL])
    expect(hashCanonicalState(state)).toBe(before)
  })

  it('R10 — the domain validator is unchanged: it still reports the raw stock shortfall', () => {
    const state = withMaterial(farmWorkerFixture(), ROAD_CONSTRUCTION_COST - 1)
    expect(validateRoadsPlacement(state, [FREE_CELL])).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
    expect(getRoadsPlacementAffordability(state, [FREE_CELL]).affordable).toBe(true)
  })

  it('R11 — building affordability (Step 10CR) stays income-aware', () => {
    const before = withMaterial(farmWorkerFixture(), 24)
    const affordability = getPlacementAffordability(before, { x: 8, y: 8 }, 'residence')
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.affordable).toBe(true)
  })

  it('R12 — affordability stays derived: save/load is identical and SAVE_VERSION is 8', () => {
    const state = withMaterial(farmWorkerFixture(), 4)
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(getRoadsPlacementAffordability(restored, [FREE_CELL])).toEqual(
      getRoadsPlacementAffordability(state, [FREE_CELL])
    )
    expect(SAVE_VERSION).toBe(8)
  })
})
