/**
 * Step001 — resource-specific storage semantics (food and water only).
 *
 * Money is accounted, never stored: the hub carries food and water buffers
 * and nothing else.
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  stepSimulation,
  type SimulationState,
} from '@/index'
import { testConfig } from './helpers.js'

const withStorage = (state: SimulationState, food: number, water: number): SimulationState => ({
  ...state,
  storage: {
    ...state.storage,
    food,
    water,
  },
})

describe('Step001 — resource-specific storage semantics', () => {
  it('Food storage is persisted state but has no production or consumption path', () => {
    const state = withStorage(createInitialState(testConfig), 50, 0)
    const next = stepSimulation(state)
    expect(next.storage.food).toBe(50)
    expect(next.resources.food).toBe(state.resources.food)
  })

  it('Water storage is persisted state but does not change Water admission or stock', () => {
    const state = withStorage(createInitialState(testConfig), 0, 30)
    const next = stepSimulation(state)
    expect(next.storage.water).toBe(30)
    expect(next.resources.water).toBe(0)
  })

  it('Food and Water reserve values remain independent of the treasury', () => {
    const state = withStorage(createInitialState(testConfig), 12, 7)
    const next = stepSimulation(state)
    expect(next.storage).toEqual(state.storage)
  })

  it('Storage persistence shape carries food and water capacities only', () => {
    const state = withStorage(createInitialState(testConfig), 1, 2)
    expect(state.storage.capacities).toEqual({ food: 50, water: 30 })
    expect(state.storage.food).toBe(1)
    expect(state.storage.water).toBe(2)
  })
})
