import { describe, expect, it } from 'vitest'

import {
  type PlaceBuildingCommand,
  stepSimulation,
  hashCanonicalState,
  type SimulationState,
  availableResidenceIds,
  getHousingSummary,
  getInspectionSummary,
  getBuildingInspection,
  getResourceStock,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

/** Tick 2 canonical state: one operational residence, one admitted colonist. */
const colonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, placeResidence(2, 2))
  state = stepSimulation(state) // Step 10Y: 1 construction tick left
  state = stepSimulation(state)
  return state
}

describe('simulation tick', () => {
  it('advances time without a command and changes nothing else', () => {
    const state = createTestState()
    const next = stepSimulation(state)
    expect(next.time.tick).toBe(1)
    expect(next.buildings).toEqual({})
    expect(next.colonists).toEqual({})
    expect(hashCanonicalState(state)).not.toBe(hashCanonicalState(next))
  })

  it('does not mutate the input state', () => {
    const state = createTestState()
    const before = hashCanonicalState(state)
    stepSimulation(state, placeResidence(3, 3))
    expect(hashCanonicalState(state)).toBe(before)
  })

  it('runs a full causal scenario: placement -> construction -> operational -> colonist', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(2, 2))

    // Tick 1: building placed, still under construction. No colonist.
    const b1 = state.buildings['building-1']
    expect(b1).toBeDefined()
    expect(b1?.status).toBe('underConstruction')
    // Step 10Y: no placement catch-up — the catalog's 2 ticks are literal.
    expect(b1?.constructionRemaining).toBe(2)
    expect(Object.keys(state.colonists)).toHaveLength(0)

    // Tick 2: still under construction.
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('underConstruction')

    // Tick 3: construction finishes => operational => housing capacity
    // exists => colonist admitted and assigned in the same tick.
    state = stepSimulation(state)
    const b2 = state.buildings['building-1']
    expect(b2?.status).toBe('operational')
    expect(b2?.constructionRemaining).toBe(0)
    const colonist = state.colonists['colonist-1']
    expect(colonist).toBeDefined()
    expect(colonist?.residenceId).toBe('building-1')
    expect(getHousingSummary(state)).toEqual({
      totalCapacity: 1,
      occupiedCapacity: 1,
      availableCapacity: 0,
    })

    // No new colonist without new capacity.
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(1)
    expect(getInspectionSummary(state).colonistCount).toBe(1)
  })

  it('rejects invalid placements as explicit no-ops', () => {
    let state = stepSimulation(createTestState(), placeResidence(-1, 0))
    expect(Object.keys(state.buildings)).toHaveLength(0)
    state = stepSimulation(state, placeResidence(0, 8))
    expect(Object.keys(state.buildings)).toHaveLength(0)
    state = stepSimulation(state, placeResidence(0, 0))
    state = stepSimulation(state, placeResidence(0, 0))
    expect(Object.keys(state.buildings)).toHaveLength(1)
  })

  it('operational residence exists only after its lifecycle completes', () => {
    let state = stepSimulation(createTestState(), placeResidence(4, 4))
    // Under construction: no operational capacity, no colonist.
    expect(availableResidenceIds(state)).toHaveLength(0)
    expect(Object.keys(state.colonists)).toHaveLength(0)
    state = stepSimulation(state)
    state = stepSimulation(state)
    // Operational: capacity created and consumed by the admitted colonist.
    expect(availableResidenceIds(state)).toHaveLength(0)
    expect(state.colonists['colonist-1']?.residenceId).toBe('building-1')
  })

  it('admission tie-break is stable across buildings', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(1, 1))
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state)
    state = stepSimulation(state)
    // Both operational since tick 2: both get colonists, lowest id first.
    expect(state.colonists['colonist-1']?.residenceId).toBe('building-1')
    expect(state.colonists['colonist-2']?.residenceId).toBe('building-2')
  })

  it('inspection query exposes building state', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getBuildingInspection(state, 'building-1')?.status).toBe('underConstruction')
    state = stepSimulation(state)
    state = stepSimulation(state)
    expect(getBuildingInspection(state, 'building-1')?.status).toBe('operational')
    expect(getBuildingInspection(state, 'building-999')).toBeNull()
  })
})

describe('simulation shapes', () => {
  it('keeps building record shape stable', () => {
    let state: SimulationState = stepSimulation(createTestState(), placeResidence(2, 2))
    state = stepSimulation(state)
    state = stepSimulation(state)
    const building = state.buildings['building-1']
    expect(Object.keys(building ?? {}).sort()).toEqual([
      'constructionRemaining',
      'id',
      'status',
      'type',
      'x',
      'y',
    ])
  })
})

describe('food need simulation (Step 05)', () => {
  it('keeps food stock in the canonical resource shape', () => {
    const state = createTestState()
    expect(Object.keys(state.resources).sort()).toEqual(['construction', 'food', 'water'])
  })

  it('colonist admitted on tick N does not consume until tick N+1', () => {
    const state = colonistState()
    expect(Object.keys(state.colonists)).toHaveLength(1)
    expect(getResourceStock(state).food).toBe(100)
    const next = stepSimulation(state)
    expect(getResourceStock(next).food).toBe(99)
  })

  it('one colonist consumes exactly 1 food per tick', () => {
    let state = colonistState()
    state = stepSimulation(state)
    expect(getResourceStock(state).food).toBe(99)
    state = stepSimulation(state)
    expect(getResourceStock(state).food).toBe(98)
  })

  it('two colonists consume 2 food per tick', () => {
    let state = colonistState()
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state) // Step 10Y: 1 construction tick left
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(2)
    // Step 10Y timing isolation: pin food so the consumption deltas below
    // measure consumption, not the extra construction tick.
    state = withFood(state, 98)
    expect(getResourceStock(state).food).toBe(98)
    const a = stepSimulation(state)
    const b = stepSimulation(a)
    expect(getResourceStock(a).food).toBe(96)
    expect(getResourceStock(b).food).toBe(94)
  })

  it('four colonists consume 4 food per tick', () => {
    let state = colonistState()
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state, placeResidence(7, 7))
    state = stepSimulation(state, placeResidence(3, 3))
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(4)
    state = withFood(state, 93) // Step 10Y timing isolation
    expect(getResourceStock(state).food).toBe(93)
    expect(getResourceStock(stepSimulation(state)).food).toBe(89)
  })

  it('fed boundary: food === population feeds the colony (food -> 0, colonists survive)', () => {
    const fedEmpty = withFood(colonistState(), 1)
    const after = stepSimulation(fedEmpty)
    expect(getResourceStock(after).food).toBe(0)
    expect(Object.keys(after.colonists)).toHaveLength(1)
    // Next tick: food 0 < population 1 => the colony starves.
    const starved = stepSimulation(after)
    expect(getResourceStock(starved).food).toBe(0)
    expect(Object.keys(starved.colonists)).toHaveLength(0)
  })

  it('shortage: food < population starves the whole colony in the same tick', () => {
    const state = withFood(colonistState(), 0)
    const starved = stepSimulation(state)
    expect(getResourceStock(starved).food).toBe(0)
    expect(Object.keys(starved.colonists)).toHaveLength(0)
    expect(getHousingSummary(starved)).toEqual({
      totalCapacity: 1,
      occupiedCapacity: 0,
      availableCapacity: 1,
    })
  })

  it('population 0 consumes no food', () => {
    let state = createTestState()
    for (let i = 0; i < 5; i++) {
      state = stepSimulation(state)
    }
    expect(getResourceStock(state).food).toBe(100)
  })

  it('admission is gated on food > 0', () => {
    let state = stepSimulation(createTestState(), placeResidence(2, 2))
    state = stepSimulation(state)
    state = stepSimulation(state) // Step 10Y: 2 construction ticks
    expect(Object.keys(state.colonists)).toHaveLength(1)
    // Simulate an exhausted, emptied colony with free capacity.
    state = {
      ...state,
      colonists: {},
      resources: { ...state.resources, food: 0 },
    }
    const next = stepSimulation(state)
    expect(Object.keys(next.colonists)).toHaveLength(0)
    expect(getHousingSummary(next).occupiedCapacity).toBe(0)
  })

  it('admission tie-break stays ascending residence id while food allows', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(1, 1))
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state)
    state = stepSimulation(state)
    state = stepSimulation(state)
    expect(state.colonists['colonist-1']?.residenceId).toBe('building-1')
    expect(state.colonists['colonist-2']?.residenceId).toBe('building-2')
  })

  it('starvation is deterministic across repeated runs', () => {
    const run = (): string => {
      let state = withFood(colonistState(), 0)
      state = stepSimulation(state)
      return hashCanonicalState(state)
    }
    expect(run()).toBe(run())
  })

  it('does not mutate the input state when starving', () => {
    const state = withFood(colonistState(), 0)
    const before = hashCanonicalState(state)
    stepSimulation(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})
