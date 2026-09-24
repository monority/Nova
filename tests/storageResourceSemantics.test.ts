import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  stepSimulation,
  type SimulationState,
} from '@/index'
import { testConfig } from './helpers.js'

const withStorage = (state: SimulationState, food: number, water: number, material: number): SimulationState => ({
  ...state,
  storage: {
    ...state.storage,
    food,
    water,
    material,
  },
})

describe('Step 10BM — resource-specific storage semantics', () => {
  it('Food storage is persisted state but has no production or consumption path', () => {
    const state = withStorage(createInitialState(testConfig), 50, 0, 0)
    const next = stepSimulation(state)
    expect(next.storage.food).toBe(50)
    expect(next.resources.food).toBe(state.resources.food)
  })

  it('Water storage is persisted state but does not change Water admission or stock', () => {
    const state = withStorage(createInitialState(testConfig), 0, 30, 0)
    const next = stepSimulation(state)
    expect(next.storage.water).toBe(30)
    expect(next.resources.water).toBe(0)
  })

  it('Food and Water reserve values remain independent of Material reserve', () => {
    const state = withStorage(createInitialState(testConfig), 12, 7, 40)
    const next = stepSimulation(state)
    expect(next.storage).toEqual(state.storage)
  })

  it('Material remains only resource with active overflow/release semantics', () => {
    const state = withStorage(createInitialState(testConfig), 50, 30, 0)
    const next = stepSimulation(state)
    expect(next.storage.food).toBe(50)
    expect(next.storage.water).toBe(30)
    expect(next.storage.material).toBe(0)
  })

  it('Storage persistence shape remains common without implying common gameplay', () => {
    const state = withStorage(createInitialState(testConfig), 1, 2, 3)
    expect(state.storage.capacities).toEqual({ food: 50, water: 30, material: 40 })
    expect(state.storage.food).toBe(1)
    expect(state.storage.water).toBe(2)
    expect(state.storage.material).toBe(3)
  })
})
