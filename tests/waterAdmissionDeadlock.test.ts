import { describe, expect, it } from 'vitest'

import {
  countWorkersAt,
  createRoads,
  isResidenceWaterServed,
  iterateColonists,
  stepSimulation,
  waterProductionForTick,
  type CellCoordinate,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, placeCatchUp } from './helpers.js'

type TestBuildingType = 'residence' | 'farm' | 'well'

const place = (
  buildingType: TestBuildingType,
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', buildingType, x, y })

/**
 * Inject operational roads (test-local; same no-cost, no-tick convention as
 * the shared helpers so placement budgets stay exact).
 */
const withOperationalRoads = (
  state: SimulationState,
  cells: readonly CellCoordinate[]
): SimulationState => {
  const created = createRoads(state, cells)
  let roads = created.state.roads
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) {
      roads = {
        ...roads,
        [id]: { ...road, status: 'operational', constructionRemaining: 0 },
      }
    }
  }
  return { ...created.state, roads }
}

const colonistsInResidence = (
  state: SimulationState,
  residenceId: string
): number => {
  let count = 0
  for (const colonist of iterateColonists(state)) {
    if (colonist.residenceId === residenceId) {
      count += 1
    }
  }
  return count
}

const populationOf = (state: SimulationState): number =>
  [...iterateColonists(state)].length

/**
 * The confirmed deadlock colony: R1 + colonist 1 (works the Farm) + an
 * operational, road-connected but VACANT Well + a served vacant R2.
 * Layout (8x8): R1 (0,0), Farm (0,2), Well (2,0), R2 (2,2), one road row
 * y=1 joining all four buildings into a single covered network.
 */
const buildDeadlockColony = (): SimulationState => {
  let state = createTestState()
  state = placeCatchUp(state, place('residence', 0, 0)) // building-1
  state = placeCatchUp(state, place('farm', 0, 2)) // building-2
  state = placeCatchUp(state, place('well', 2, 0)) // building-3
  state = placeCatchUp(state, place('residence', 2, 2)) // building-4
  state = withOperationalRoads(state, [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ])
  return state
}

describe('water admission deadlock (root-cause regression)', () => {
  it('admits the second colonist so the vacant Well gets staffed', () => {
    let state = buildDeadlockColony()
    for (let i = 0; i < 8; i += 1) {
      state = stepSimulation(state)
    }
    // R2 is served, so coverage is not the blocker: the headroom/shortage
    // guards must recognise the staffable vacant Well as potential capacity.
    expect(isResidenceWaterServed(state, 'building-4')).toBe(true)
    expect(colonistsInResidence(state, 'building-4')).toBe(1)
    expect(countWorkersAt(state, 'building-3')).toBe(1)
    expect(waterProductionForTick(state)).toBe(2)
  })

  it('still blocks admission when capacity is genuinely insufficient', () => {
    // Two served colonists, one staffed Well (potential 2), vacant served R3:
    // 2 >= 2 + 0 + 1 never holds, so R3 must stay empty (anti-treadmill).
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0)) // building-1
    state = placeCatchUp(state, place('residence', 0, 2)) // building-2
    state = placeCatchUp(state, place('well', 2, 0)) // building-3
    state = placeCatchUp(state, place('residence', 3, 0)) // building-4
    state = withOperationalRoads(state, [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ])
    for (let i = 0; i < 8; i += 1) {
      state = stepSimulation(state)
    }
    expect(isResidenceWaterServed(state, 'building-4')).toBe(true)
    expect(populationOf(state)).toBe(2)
    expect(colonistsInResidence(state, 'building-4')).toBe(0)
    expect(countWorkersAt(state, 'building-3')).toBe(1)
  })

  it('ignores a vacant Well that no worker could ever reach', () => {
    // Same as above plus an isolated vacant operational Well on its own stub
    // network (no residence): it must NOT count as potential capacity.
    let state = createTestState()
    state = placeCatchUp(state, place('residence', 0, 0)) // building-1
    state = placeCatchUp(state, place('residence', 0, 2)) // building-2
    state = placeCatchUp(state, place('well', 2, 0)) // building-3
    // Top-up: the scenario needs one more building than the starting stock
    // covers; the admission gate under test is unaffected by the source.
    state = {
      ...state,
      resources: {
        ...state.resources,
        money: state.resources.money + 25,
      },
    }
    state = placeCatchUp(state, place('well', 5, 5)) // building-4, isolated
    state = placeCatchUp(state, place('residence', 3, 0)) // building-5
    state = withOperationalRoads(state, [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 5, y: 6 },
    ])
    for (let i = 0; i < 8; i += 1) {
      state = stepSimulation(state)
    }
    expect(countWorkersAt(state, 'building-4')).toBe(0)
    expect(waterProductionForTick(state)).toBe(2)
    expect(isResidenceWaterServed(state, 'building-5')).toBe(true)
    expect(populationOf(state)).toBe(2)
    expect(colonistsInResidence(state, 'building-5')).toBe(0)
  })
})
