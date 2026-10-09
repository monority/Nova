/**
 * Step G1.1 — Demand-driven settlement growth (focused tests).
 *
 * Pins the deterministic growth contract: Town activation, the derived demand
 * condition, the deterministic eligible cell, reuse of the Residence
 * construction transaction, one growth per tick, anti-treadmill saturation,
 * persistence neutrality (`SAVE_VERSION = 8`, no new state) and determinism.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  BUILDING_CATALOG,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  evaluateSettlementGrowth,
  getGrowthCandidateCell,
  getGrowthStatus,
  getMaintenanceDuePerTick,
  getProgression,
  getRevenuePerTick,
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
  world: { seed: 'nova-step-g1-1', width: 16, height: 12 },
}

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('g1.1: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('g1.1: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('g1.1: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const colonistAt = (state: SimulationState, residenceIndex: number): SimulationState => {
  const residences = Object.values(state.buildings)
    .filter((building) => building.type === 'residence')
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  const residence = residences[residenceIndex]
  if (residence === undefined) throw new Error('g1.1: residence missing')
  return createColonist(state, residence.id).state
}

/**
 * A Town with Water headroom. Two separate road networks:
 *  - network A (covered by two staffed Wells) holds 2 occupied Residences and
 *    the two Wells, so exactly 2 colonists are water-served while capacity is 4
 *    → headroom for one more served colonist;
 *  - network B (uncovered) holds 4 occupied Residences plus 3 staffed Farms and
 *    one staffed Workshop.
 * 6 colonists, 6 occupied Residences (no vacancy), food 6/tick, capacity 4.
 */
const townFixture = (
  overrides: { readonly material?: number; readonly water?: number } = {}
): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      ...state.resources,
      food: 10_000,
      water: overrides.water ?? 100,
      money: overrides.material ?? 100,
    },
  }
  // Network A: roads 1..3 at y=1, residences (1,0)/(3,0), wells (1,2)/(3,2).
  for (const x of [1, 2, 3]) state = opRoad(state, x, 1)
  state = op(state, 'residence', 1, 0)
  state = op(state, 'residence', 3, 0)
  state = op(state, 'well', 1, 2)
  state = op(state, 'well', 3, 2)
  // Network B: roads 5..12 at y=1, residences (6,8,10,12 @ y0),
  // farms (6,8,10 @ y2), workshop (12,2).
  for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) state = opRoad(state, x, 1)
  for (const x of [6, 8, 10, 12]) state = op(state, 'residence', x, 0)
  for (const x of [6, 8, 10]) state = op(state, 'farm', x, 2)
  state = op(state, 'workshop', 12, 2)
  for (let index = 0; index < 6; index += 1) state = colonistAt(state, index)
  return assignJobs(state)
}

const countBuildings = (state: SimulationState, type: BuildingType): number =>
  Object.values(state.buildings).filter((building) => building.type === type).length

const buildingCount = (state: SimulationState): number => Object.keys(state.buildings).length

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

describe('G1.1 — growth activation and demand', () => {
  it('activates only once the settlement has reached Town', () => {
    const town = townFixture()
    expect(getProgression(town).stage).toBe('town')
    expect(getGrowthStatus(town).active).toBe(true)

    // A Settlement/Village state (no staffed Workshop) is inactive.
    let village = createInitialState(config)
    village = { ...village, resources: { ...village.resources, food: 10_000, water: 100 } }
    village = opRoad(village, 1, 1)
    village = op(village, 'residence', 1, 0)
    village = op(village, 'well', 1, 2)
    village = op(village, 'farm', 3, 2)
    village = opRoad(village, 3, 1)
    village = colonistAt(village, 0)
    village = assignJobs(village)
    expect(getProgression(village).stage).not.toBe('town')
    expect(getGrowthStatus(village).active).toBe(false)
    expect(getGrowthStatus(village).demand).toBe(false)
  })

  it('demands growth when Town has housing pressure and Water headroom', () => {
    const decision = evaluateSettlementGrowth(townFixture())
    expect(decision.active).toBe(true)
    expect(decision.demand).toBe(true)
    expect(decision.cell).not.toBeNull()
    expect(decision.affordable).toBe(true)
  })

  it('has no demand without Water headroom (one staffed Well serves only 2)', () => {
    // Remove the second Well from network A by rebuilding the fixture with one.
    let state = createInitialState(config)
    state = { ...state, resources: { ...state.resources, food: 10_000, water: 100 } }
    for (const x of [1, 2, 3]) state = opRoad(state, x, 1)
    state = op(state, 'residence', 1, 0)
    state = op(state, 'residence', 3, 0)
    state = op(state, 'well', 1, 2)
    for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) state = opRoad(state, x, 1)
    for (const x of [6, 8, 10, 12]) state = op(state, 'residence', x, 0)
    for (const x of [6, 8, 10]) state = op(state, 'farm', x, 2)
    state = op(state, 'workshop', 12, 2)
    for (let index = 0; index < 6; index += 1) state = colonistAt(state, index)
    state = assignJobs(state)

    expect(getProgression(state).stage).toBe('town')
    const decision = evaluateSettlementGrowth(state)
    // Capacity 2, served 2 (network A only) → no headroom for a 3rd served colonist.
    expect(decision.demand).toBe(false)
  })

  it('has no demand while a vacant Residence already exists', () => {
    // One vacant operational Residence (served by network A) removes the
    // housing pressure that growth exists to relieve.
    const withVacancy = op(townFixture(), 'residence', 2, 0)
    expect(getProgression(withVacancy).stage).toBe('town')
    expect(evaluateSettlementGrowth(withVacancy).demand).toBe(false)
  })

  it('has no demand while Water is short, or when the Residence is unaffordable', () => {
    expect(evaluateSettlementGrowth(townFixture({ water: 0 })).demand).toBe(false)
    const broke = evaluateSettlementGrowth(townFixture({ material: 24 }))
    expect(broke.demand).toBe(true)
    expect(broke.affordable).toBe(false)
  })

  it('demand and the eligible cell are derived (never persisted)', () => {
    const state = townFixture()
    const serialized = serializeSave(state)
    for (const term of ['growthDemand', 'growthCell', 'growthActive']) {
      expect(serialized.includes(term), term).toBe(false)
    }
    expect(SAVE_VERSION).toBe(12)
  })
})

describe('G1.1 — deterministic eligible cell', () => {
  it('selects the same cell for identical states, nearest the settlement first', () => {
    const a = getGrowthCandidateCell(townFixture())
    const b = getGrowthCandidateCell(townFixture())
    expect(a).toEqual(b)
    // (2,0) is adjacent to the covered road (2,1) and one step from the two
    // network-A Residences; the old (x, y) scan would have picked (0,1).
    expect(a).toEqual({ x: 2, y: 0 })
  })

  it('skips occupied cells and requires an operational covered road adjacency', () => {
    let state = townFixture()
    // Occupy the first candidate (2,0) with a Residence.
    state = op(state, 'residence', 2, 0)
    const next = getGrowthCandidateCell(state)
    expect(next).not.toEqual({ x: 2, y: 0 })
    expect(next).not.toBeNull()

    // Remove every road → no candidate at all.
    const roadless: SimulationState = { ...state, roads: {} }
    expect(getGrowthCandidateCell(roadless)).toBeNull()
  })
})

describe('G1.1 — construction reuse and tick semantics', () => {
  it('grows one Residence per tick through the normal construction transaction', () => {
    const before = townFixture()
    const after = stepSimulation(before)
    expect(buildingCount(after)).toBe(buildingCount(before) + 1)
    expect(countBuildings(after, 'residence')).toBe(countBuildings(before, 'residence') + 1)
    // Catalog cost, deducted exactly once, plus this tick's income and upkeep
    // (income is credited before the growth phase, upkeep after it).
    expect(after.resources.money).toBe(
      before.resources.money -
        BUILDING_CATALOG.residence.constructionCost +
        getRevenuePerTick(before) -
        getMaintenanceDuePerTick(before)
    )
    // Growth spends the treasury only; the hub (food/water buffering) is
    // untouched by construction.
    expect(after.storage).toEqual(before.storage)
    // The new Residence missed this tick's advanceConstruction: it starts at
    // the catalog duration like a player placement.
    const grown = Object.values(after.buildings).find(
      (building) => building.type === 'residence' && building.x === 2 && building.y === 0
    )
    expect(grown?.status).toBe('underConstruction')
    expect(grown?.constructionRemaining).toBe(BUILDING_CATALOG.residence.constructionTicks)
  })

  it('never starts more than one autonomous Residence per tick', () => {
    let current = townFixture()
    for (let tick = 0; tick < 6; tick += 1) {
      const next = stepSimulation(current)
      const residences = countBuildings(next, 'residence') - countBuildings(current, 'residence')
      expect(residences).toBeLessThanOrEqual(1)
      current = next
    }
  })

  it('saturates instead of growing forever (anti-treadmill)', () => {
    // Network A has only four eligible build cells adjacent to its covered
    // roads, and the Water capacity bounds served population, so growth is
    // finite: it must stop well before an unbounded run.
    const start = townFixture({ material: 100_000, water: 100_000 })
    const after = runTicks(start, 60)
    expect(countBuildings(after, 'residence')).toBeGreaterThan(
      countBuildings(start, 'residence')
    )
    expect(countBuildings(after, 'residence')).toBeLessThanOrEqual(10)
    expect(evaluateSettlementGrowth(after).demand).toBe(false)
  })

  it('is a no-op when the Residence is unaffordable, with no reserve to draw', () => {
    // Treasury 0 + this tick's revenue is still below the 25 cost, so
    // growth must not build. There is no reserve anymore: the treasury is
    // directly spendable and simply stays short.
    const broke: SimulationState = townFixture({ material: 0 })
    expect(evaluateSettlementGrowth(broke).demand).toBe(true)
    expect(evaluateSettlementGrowth(broke).affordable).toBe(false)
    const after = stepSimulation(broke)
    expect(countBuildings(after, 'residence')).toBe(countBuildings(broke, 'residence'))
    expect(after.resources.money).toBe(
      Math.max(0, getRevenuePerTick(broke) - getMaintenanceDuePerTick(broke))
    )
  })
})

describe('G1.1 — determinism and persistence neutrality', () => {
  it('grows identically from identical states and survives save/load', () => {
    const a = runTicks(townFixture(), 5)
    const b = runTicks(townFixture(), 5)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))

    const restored = loadSave(serializeSave(a))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(a))
    expect(getGrowthStatus(restored)).toEqual(getGrowthStatus(a))
    expect(SAVE_VERSION).toBe(12)
  })

  it('keeps the cross-check with the derived progression stage', () => {
    // The domain Town mirror must agree with the application progression query.
    const fixtures: readonly SimulationState[] = [
      createInitialState(config),
      townFixture(),
      townFixture({ material: 0 }),
    ]
    for (const state of fixtures) {
      expect(getGrowthStatus(state).active).toBe(getProgression(state).stage === 'town')
    }
  })
})
