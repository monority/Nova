/**
 * Step001 — Revenue-Aware Building Affordability.
 *
 * The protected Material reserve is gone (treasury directly spendable,
 * taxes flow every tick). The affordability contract keeps its pinned
 * invariant with money semantics:
 *
 *   getPlacementAffordability(state, cell, type).affordable
 *     === stepSimulation(state, placeBuilding).accepted
 *
 * where acceptance now means treasury covers the cost, or the same tick's
 * public revenue (taxes + commerce) completes it.
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

const config: SimulationConfig = {
  world: { seed: 'nova-step001-afford', width: 12, height: 12 },
}

/** A free cell in the fixture world (the revenue fixture lives on x=0). */
const FREE = { x: 6, y: 6 }

const withMoney = (state: SimulationState, money: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, money },
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
  if (building === undefined) throw new Error('money-afford: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/**
 * One residence + one colonist + one connected operational Workshop:
 * revenue is 1 tax + 2 commerce = 3/tick, maintenance is 2/tick.
 */
const revenueFixture = (): SimulationState => {
  let state = createInitialState(config)
  state = operational(state, 'residence', 0, 0)
  state = operational(state, 'workshop', 0, 2)
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
  if (residenceId === undefined) throw new Error('money-afford: missing residence')
  state = createColonist(state, residenceId).state
  return assignJobs(state)
}

const residence = (x: number, y: number) =>
  ({ type: 'placeBuilding' as const, x, y, buildingType: 'residence' as const })

describe('Step001 — revenue-aware building affordability', () => {
  it('M1 — treasury alone covers: valid, affordable, accepted', () => {
    const state = withMoney(createInitialState(config), 25)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.placement.valid).toBe(true)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(true)
    expect(affordability.moneyRequired).toBe(25)
    expect(affordability.moneyAvailable).toBe(25)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(1)
    expect(after.resources.money).toBe(0)
  })

  it('M2 — same-tick revenue completes the cost: accepted exactly once', () => {
    // Treasury 23 + revenue 3 (1 tax + 2 commerce) = 26 ≥ 25.
    const state = withMoney(revenueFixture(), 23)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.placement.valid).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(true)
    expect(affordability.affordable).toBe(true)

    const beforeCount = buildingCount(state)
    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(beforeCount + 1)
    // 23 + 3 revenue − 25 cost − 2 maintenance (clamped to the 1 left) = 0.
    expect(after.resources.money).toBe(0)
  })

  it('M3 — revenue short: refused, treasury keeps its flow', () => {
    // Treasury 20 + revenue 3 = 23 < 25.
    const state = withMoney(revenueFixture(), 20)
    const affordability = getPlacementAffordability(state, FREE, 'residence')
    expect(affordability.affordable).toBe(false)

    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    expect(buildingCount(after)).toBe(buildingCount(state))
    // No construction: 20 + 3 revenue − 2 maintenance = 21.
    expect(after.resources.money).toBe(21)
  })

  it('M4 — a Water shortfall is never masked by revenue (Workshop needs 1 Water)', () => {
    const state = withWater(withMoney(createInitialState(config), 100), 0)
    const affordability = getPlacementAffordability(state, FREE, 'workshop')
    expect(affordability.placement).toEqual({ valid: false, reason: 'insufficientWater' })
    expect(affordability.coveredBySameTickInflow).toBe(false)
    expect(affordability.affordable).toBe(false)

    const after = stepSimulation(state, {
      type: 'placeBuilding', x: FREE.x, y: FREE.y, buildingType: 'workshop',
    })
    expect(buildingCount(after)).toBe(0)
  })

  it('M5 — a spatial failure is never masked by revenue', () => {
    const state = withMoney(createInitialState(config), 100)
    const after = stepSimulation(state, residence(FREE.x, FREE.y))
    const occupied = getPlacementAffordability(after, FREE, 'residence')
    expect(occupied.placement.valid).toBe(false)
    expect(occupied.affordable).toBe(false)
  })

  it('M6 — roads use the same revenue clause (treasury 3 + revenue 3 ≥ 5)', () => {
    const state = withMoney(revenueFixture(), 3)
    const cells = [FREE]
    expect(getRoadsPlacementAffordability(state, cells).affordable).toBe(true)
    const after = stepSimulation(state, { type: 'placeRoads', cells })
    // 1 pre-existing contact road + 1 new road.
    expect(Object.keys(after.roads)).toHaveLength(2)
    // 3 + 3 revenue − 5 road − 2 maintenance (clamped to the 1 left) = 0.
    expect(after.resources.money).toBe(0)

    const short = withMoney(revenueFixture(), 1)
    expect(getRoadsPlacementAffordability(short, cells).affordable).toBe(false)
    const refused = stepSimulation(short, { type: 'placeRoads', cells })
    // The rejected command adds nothing: only the pre-existing contact road.
    expect(Object.keys(refused.roads)).toHaveLength(1)
  })

  it('M7 — the query agrees with the command across a treasury sweep', () => {
    for (let money = 0; money <= 30; money += 2) {
      const before = withMoney(revenueFixture(), money)
      const affordable = getPlacementAffordability(before, FREE, 'residence').affordable
      const after = stepSimulation(before, residence(FREE.x, FREE.y))
      const accepted = buildingCount(after) > buildingCount(before)
      expect(affordable, `money=${money}`).toBe(accepted)
    }
  })

  it('M8 — affordability stays derived: no mutation, save/load identical, SAVE_VERSION 9', () => {
    const state = withMoney(revenueFixture(), 23)
    const before = hashCanonicalState(state)
    getPlacementAffordability(state, FREE, 'residence')
    expect(hashCanonicalState(state)).toBe(before)

    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(before)
    expect(getPlacementAffordability(restored, FREE, 'residence')).toEqual(
      getPlacementAffordability(state, FREE, 'residence')
    )
    expect(SAVE_VERSION).toBe(9)
  })
})
