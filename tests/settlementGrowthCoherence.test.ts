/**
 * Step G1.2 — Growth feedback & spatial coherence (focused tests).
 *
 * Pins the refined growth contract: the expansion cell is the eligible cell
 * nearest the existing settlement (ascending (x, y) tie-break), the derived
 * growth feedback names the single blocking cause, existing player decisions
 * (roads/coverage/material) shape the frontier, and everything stays derived,
 * deterministic and bounded.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  evaluateSettlementGrowth,
  getGrowthCandidateCell,
  getProgression,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeSave,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-g1-2-coherence', width: 16, height: 12 },
}

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('g1.2: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const building = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  return created.state
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('g1.2: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('g1.2: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const base = (): SimulationState => {
  const state = createInitialState(config)
  return {
    ...state,
    resources: { ...state.resources, food: 10_000, water: 100, money: 1_000 },
  }
}

/**
 * Spatial pathology fixture: a developed cluster at x=10..11 (Residence + Well
 * + two roads) plus a remote covered road stub at x=1 (road + Well). The old
 * ascending (x, y) rule chose the remote cell (0,1); the coherent rule must
 * choose next to the cluster.
 */
const clusterFixture = (): SimulationState => {
  let state = base()
  state = opRoad(state, 10, 1)
  state = opRoad(state, 11, 1)
  state = op(state, 'residence', 10, 0)
  state = op(state, 'well', 10, 2)
  state = opRoad(state, 1, 1)
  state = op(state, 'well', 1, 2)
  return state
}

/** Minimal Town with Water headroom (mirrors tests/settlementGrowth.test.ts). */
const townFixture = (): SimulationState => {
  let state = base()
  for (const x of [1, 2, 3]) state = opRoad(state, x, 1)
  state = op(state, 'residence', 1, 0)
  state = op(state, 'residence', 3, 0)
  state = op(state, 'well', 1, 2)
  state = op(state, 'well', 3, 2)
  for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) state = opRoad(state, x, 1)
  for (const x of [6, 8, 10, 12]) state = op(state, 'residence', x, 0)
  for (const x of [6, 8, 10]) state = op(state, 'farm', x, 2)
  state = op(state, 'workshop', 12, 2)
  const residences = Object.values(state.buildings)
    .filter((b) => b.type === 'residence')
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  for (let i = 0; i < 6; i += 1) {
    const residence = residences[i]
    if (residence === undefined) throw new Error('g1.2: missing residence')
    state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

describe('G1.2 — spatial coherence', () => {
  it('does not grow on the far side of the board from the settlement', () => {
    const state = clusterFixture()
    const candidate = getGrowthCandidateCell(state)
    // The old ascending (x, y) scan would have picked the remote stub cell
    // (0,1) at x=0; the coherent rule stays with the developed cluster at x~10.
    expect(candidate).not.toBeNull()
    expect(candidate?.x).toBeGreaterThanOrEqual(9)
    expect(candidate).toEqual({ x: 11, y: 0 })
  })

  it('picks the eligible cell nearest the nearest building', () => {
    const state = clusterFixture()
    const candidate = getGrowthCandidateCell(state)
    if (candidate === null) throw new Error('g1.2: no candidate')
    const nearest = Math.min(
      ...Object.values(state.buildings).map((b) => manhattan(candidate, b))
    )
    expect(nearest).toBe(1)
    // The remote stub cell (0,1) exists and is eligible, but is distance 2.
    expect(manhattan({ x: 0, y: 1 }, { x: 1, y: 2 })).toBe(2)
  })

  it('tie-breaks equally-near cells by ascending (x, y)', () => {
    const state = clusterFixture()
    // (11,0) and (11,2) are both distance 1 from the cluster; (11,0) wins.
    expect(getGrowthCandidateCell(state)).toEqual({ x: 11, y: 0 })
  })

  it('skips occupied cells (both buildings and roads) and terrain', () => {
    let state = clusterFixture()
    state = building(state, 'residence', 11, 0) // under construction, occupies
    expect(getGrowthCandidateCell(state)).toEqual({ x: 11, y: 2 })

    const roadless: SimulationState = { ...state, roads: {} }
    expect(getGrowthCandidateCell(roadless)).toBeNull()
  })

  it('is independent of building insertion order', () => {
    // Same positions, different creation order -> same chosen cell.
    let a = base()
    a = opRoad(a, 10, 1)
    a = opRoad(a, 11, 1)
    a = op(a, 'residence', 10, 0)
    a = op(a, 'well', 10, 2)
    a = opRoad(a, 1, 1)
    a = op(a, 'well', 1, 2)

    let b = base()
    b = op(b, 'well', 1, 2)
    b = opRoad(b, 1, 1)
    b = op(b, 'well', 10, 2)
    b = op(b, 'residence', 10, 0)
    b = opRoad(b, 11, 1)
    b = opRoad(b, 10, 1)

    expect(getGrowthCandidateCell(a)).toEqual(getGrowthCandidateCell(b))
  })
})

describe('G1.2 — growth feedback', () => {
  it('is ready with no blocker in the growth conditions', () => {
    const decision = evaluateSettlementGrowth(townFixture())
    expect(decision.ready).toBe(true)
    expect(decision.blocker).toBeNull()
    expect(decision.demand).toBe(true)
    expect(decision.affordable).toBe(true)
  })

  it('names the single blocking cause in causal order', () => {
    expect(evaluateSettlementGrowth(base()).blocker).toBe('notTown')
    expect(evaluateSettlementGrowth(op(townFixture(), 'residence', 2, 0)).blocker).toBe(
      'noHousingPressure'
    )
    const shortWater: SimulationState = {
      ...townFixture(),
      resources: { ...townFixture().resources, water: 0 },
    }
    expect(evaluateSettlementGrowth(shortWater).blocker).toBe('waterShortage')
    // Remove one Well: capacity 2 with 2 served colonists has no headroom.
    const singleWell = townFixture()
    const extraWell = Object.values(singleWell.buildings).find(
      (b) => b.type === 'well' && b.x === 3 && b.y === 2
    )
    const withoutWell: SimulationState = {
      ...singleWell,
      buildings: Object.fromEntries(
        Object.entries(singleWell.buildings).filter(([id]) => id !== extraWell?.id)
      ),
    }
    expect(evaluateSettlementGrowth(withoutWell).blocker).toBe('noWaterHeadroom')
    const broke: SimulationState = {
      ...townFixture(),
      resources: { ...townFixture().resources, money: 0 },
    }
    expect(evaluateSettlementGrowth(broke).blocker).toBe('unaffordable')
  })

  it('reports noEligibleCell while housing pressure remains', () => {
    let state = townFixture()
    // Occupy every eligible growth cell with an under-construction Residence so
    // the home is not yet an available vacancy (housing pressure survives).
    for (const cell of [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    ]) {
      state = building(state, 'residence', cell.x, cell.y)
    }
    expect(evaluateSettlementGrowth(state).blocker).toBe('noEligibleCell')
  })

  it('keeps the feedback derived: never persisted, pure, deterministic', () => {
    const state = townFixture()
    const before = hashCanonicalState(state)
    const first = evaluateSettlementGrowth(state)
    const second = evaluateSettlementGrowth(state)
    expect(first).toEqual(second)
    expect(hashCanonicalState(state)).toBe(before)

    const serialized = serializeSave(state)
    for (const term of ['growthBlocker', 'growthDemand', 'growthCell', 'growthState']) {
      expect(serialized.includes(term), term).toBe(false)
    }
    expect(SAVE_VERSION).toBe(12)

    const restored = loadSave(serialized)
    expect(evaluateSettlementGrowth(restored)).toEqual(first)
    expect(getGrowthCandidateCell(restored)).toEqual(getGrowthCandidateCell(state))
  })
})

describe('G1.2 — player agency through existing systems', () => {
  it('requires Well coverage: an uncovered network grants no growth frontier', () => {
    let state = base()
    state = opRoad(state, 1, 1)
    state = op(state, 'residence', 1, 0)
    expect(getGrowthCandidateCell(state)).toBeNull()

    state = op(state, 'well', 1, 2)
    expect(getGrowthCandidateCell(state)).not.toBeNull()
  })

  it('lets road layout move the growth frontier', () => {
    let state = base()
    state = opRoad(state, 1, 1)
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 1, 2)
    expect(getGrowthCandidateCell(state)).toEqual({ x: 0, y: 1 })

    // The player extends the covered road: the frontier moves to the new cells.
    state = opRoad(state, 2, 1)
    expect(getGrowthCandidateCell(state)).toEqual({ x: 2, y: 0 })
  })

  it('keeps the Material and stage gates causal', () => {
    const broke: SimulationState = {
      ...townFixture(),
      resources: { ...townFixture().resources, money: 0 },
    }
    expect(evaluateSettlementGrowth(broke).demand).toBe(true)
    expect(evaluateSettlementGrowth(broke).blocker).toBe('unaffordable')

    // A non-Town colony never grows regardless of material.
    const village = base()
    expect(getProgression(op(opRoad(village, 1, 1), 'residence', 1, 0)).stage).not.toBe('town')
    expect(evaluateSettlementGrowth(village).active).toBe(false)
  })
})
