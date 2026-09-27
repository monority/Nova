/**
 * Step 10CT — Reserve-Aware Building Affordability.
 *
 * Phase 7's affordability contract must predict what the authoritative
 * building command will actually accept. Step 10BJ releases Material above the
 * protected Storage floor (15) to fund a valid `placeBuilding` transaction, but
 * `getPlacementAffordability` only counted stock + stored production + income,
 * so the hover/commit gate refused a building the deterministic simulation
 * would build from the reserve.
 *
 * Pinned invariant:
 *
 *   getPlacementAffordability(state, cell, type).affordable
 *     === stepSimulation(state, placeBuilding).accepted
 *
 * Nothing here changes the domain: `releaseProtectedMaterialReserve` and the
 * dispatch pipeline stay authoritative; the query only mirrors them.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getPlacementAffordability,
  getRoadsPlacementAffordability,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'
import { PROTECTED_MATERIAL_RESERVE } from '@/domain/storage/storage.js'
import { withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

const config: SimulationConfig = {
  world: { seed: 'nova-step10ct', width: 12, height: 12 },
}

/** A free cell in the fixture world (the income fixture lives on x=0). */
const FREE = { x: 6, y: 6 }

const withMain = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction: material },
})

const withStorage = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  storage: { ...state.storage, material },
})

const withWater = (state: SimulationState, water: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, water },
})

const buildingCount = (state: SimulationState): number =>
  Object.keys(state.buildings).length

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ct: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/** One staffed operational Farm on a connected road: +1 Material/tick, no upkeep. */
const farmWorkerFixture = (): SimulationState => {
  let state = createInitialState(config)
  state = operational(state, 'residence', 0, 0)
  state = operational(state, 'farm', 0, 2)
  const roadCreated = createRoads(state, [{ x: 0, y: 1 }])
  const roads = { ...roadCreated.state.roads }
  for (const roadId of roadCreated.roadIds) {
    const road = roads[roadId]
    if (road !== undefined) {
      roads[roadId] = { ...road, status: 'operational', constructionRemaining: 0 }
    }
  }
  state = { ...roadCreated.state, roads }
  const residenceId = Object.keys(state.buildings).find(
    (id) => state.buildings[id]?.type === 'residence'
  )
  if (residenceId === undefined) throw new Error('10ct: missing residence')
  state = createColonist(state, residenceId).state
  return assignJobs(state)
}

/** One staffed operational Workshop: +2 stored production and +2 income, 1 upkeep, cap 25. */
const staffedWorkshopFixture = (): SimulationState => {
  let state = createInitialState(config)
  state = stepSimulation(state, {
    type: 'placeBuilding', x: 2, y: 2, buildingType: 'residence',
  })
  state = stepSimulation(state)
  state = stepSimulation(withWorkshopWater(state), {
    type: 'placeBuilding', x: 4, y: 4, buildingType: 'workshop',
  })
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state)
  return stepSimulation(state)
}

const residence = (x: number, y: number) =>
  ({ type: 'placeBuilding' as const, x, y, buildingType: 'residence' as const })

describe('10CT — reserve-aware building affordability', () => {
  it('B1 — the protected reserve completes a 25-cost building', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 40)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.coveredByProtectedReserve).toBe(true)
    expect(affordability.affordable).toBe(true)
    expect(affordability.releasedFromStorage).toBe(25)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(1)
    expect(after.resources.construction).toBe(0)
    expect(after.storage.material).toBe(PROTECTED_MATERIAL_RESERVE)
  })

  it('B2 — the floor stays protected: storage 15 releases nothing', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 15)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.releasedFromStorage).toBe(0)
    expect(affordability.coveredByProtectedReserve).toBe(false)
    expect(affordability.affordable).toBe(false)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(0)
    expect(after.storage.material).toBe(15)
  })

  it('B3 — a reserve below the cost still cannot build (storage 20 releases 5)', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 20)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.releasedFromStorage).toBe(5)
    expect(affordability.coveredByProtectedReserve).toBe(false)
    expect(affordability.affordable).toBe(false)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(0)
  })

  it('B4 — empty storage releases nothing', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 0)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.releasedFromStorage).toBe(0)
    expect(affordability.affordable).toBe(false)
  })

  it('B5 — sufficient main stock does not touch the reserve', () => {
    const state = withStorage(withMain(createInitialState(config), 25), 40)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.placement.valid).toBe(true)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.coveredByProtectedReserve).toBe(false)
    expect(affordability.affordable).toBe(true)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(after.storage.material).toBe(40)
  })

  it('B6 — same-tick inflow alone still covers: the reserve is not attributed', () => {
    const state = withStorage(withMain(farmWorkerFixture(), 24), 40)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.coveredByProtectedReserve).toBe(false)
    expect(affordability.affordable).toBe(true)
  })

  it('B7 — reserve plus this tick income build exactly once (storage 40, main 0, +1 income)', () => {
    const state = withStorage(withMain(farmWorkerFixture(), 0), 40)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.coveredByProtectedReserve).toBe(true)

    const beforeCount = buildingCount(state)
    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(beforeCount + 1)
    expect(after.storage.material).toBe(PROTECTED_MATERIAL_RESERVE)
    // 25 released + 1 income - 25 cost = 1 left in the main stock.
    expect(after.resources.construction).toBe(1)
  })

  it('B8 — the reserve funds a shortfall the stock and income alone cannot (storage 39, +1 income)', () => {
    const state = withStorage(withMain(farmWorkerFixture(), 0), 39)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    // Income alone gives 1, stored production 0: only the reserve closes the gap.
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.coveredByProtectedReserve).toBe(true)
    expect(affordability.affordable).toBe(true)
    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(buildingCount(state) + 1)
  })

  it('B9 — a Water shortfall is never masked by the reserve (Workshop needs 1 Water)', () => {
    const state = withWater(withStorage(withMain(createInitialState(config), 0), 40), 0)
    const affordability = getPlacementAffordability(state, FREE, 'workshop')
    expect(affordability.placement).toEqual({ valid: false, reason: 'insufficientResources' })
    expect(affordability.coveredByProtectedReserve).toBe(false)
    expect(affordability.affordable).toBe(false)

    const after = stepSimulation(state, {
      type: 'placeBuilding', x: FREE.x, y: FREE.y, buildingType: 'workshop',
    })
    expect(buildingCount(after)).toBe(0)
  })

  it('B10 — a spatial failure is never masked by the reserve', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 40)
    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    const occupied = getPlacementAffordability(after, FREE, 'residence')
    expect(occupied.placement.valid).toBe(false)
    expect(occupied.coveredByProtectedReserve).toBe(false)
    expect(occupied.affordable).toBe(false)
  })

  it('B11 — the query agrees with the command across a reserve sweep (main 0)', () => {
    for (let stored = 0; stored <= 40; stored += 5) {
      const before = withStorage(withMain(createInitialState(config), 0), stored)
      const affordable = getPlacementAffordability(before, FREE, 'residence').affordable
      const after = stepSimulation(before, residence(FREE.x, FREE.y))
      const accepted = buildingCount(after) > buildingCount(before)
      expect(affordable, `storage=${stored}`).toBe(accepted)
    }
  })

  it('B12 — the released stock shrinks the storage clamp exactly as the domain does', () => {
    // Staffed Workshop: gross 2, cap 25, income 2. Reserve 39 releases 24, so
    // the post-release clamp stores only 1 (not the pre-release 2).
    const base = staffedWorkshopFixture()
    const state = withStorage(withMain(base, 0), 39)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.coveredByProtectedReserve).toBe(true)
    expect(affordability.releasedFromStorage).toBe(24)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    // 24 released + 1 stored (clamped) + 2 income - 25 cost - 1 upkeep = 1.
    expect(after.resources.construction).toBe(1)
    expect(buildingCount(after)).toBe(buildingCount(base) + 1)
  })

  it('B13 — roads still do not use the protected reserve (10BJ is building-only)', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 40)
    const cells = [FREE]
    expect(getRoadsPlacementAffordability(state, cells).affordable).toBe(false)
    const after = stepSimulation(state, { type: 'placeRoads', cells })
    expect(Object.keys(after.roads)).toHaveLength(0)
    expect(after.storage.material).toBe(40)
  })

  it('B14 — affordability stays derived: no mutation, save/load identical, SAVE_VERSION 8', () => {
    const state = withStorage(withMain(createInitialState(config), 0), 40)
    const before = hashCanonicalState(state)
    getPlacementAffordability(state, FREE, 'residence')
    expect(hashCanonicalState(state)).toBe(before)

    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(before)
    expect(getPlacementAffordability(restored, FREE, 'residence')).toEqual(
      getPlacementAffordability(state, FREE, 'residence')
    )
    expect(SAVE_VERSION).toBe(8)
  })
})
