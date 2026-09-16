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
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

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
    expect(b1?.constructionRemaining).toBe(1)
    expect(Object.keys(state.colonists)).toHaveLength(0)

    // Tick 2: construction finishes => operational => housing capacity
    // exists => colonist admitted and assigned in the same tick
    // (phase 2 then phase 3).
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
