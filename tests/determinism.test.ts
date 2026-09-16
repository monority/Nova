import { describe, expect, it } from 'vitest'

import {
  hashCanonicalState,
  type PlaceBuildingCommand,
  serializeCanonicalState,
  stepSimulation,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

/** Mandatory determinism test (step0 #21, docs/31 level 4). */
describe('determinism', () => {
  it('same initial state + same command sequence => same canonical hash', () => {
    const runScenario = (): SimulationStateLike => {
      let state = createTestState()
      state = stepSimulation(state, placeResidence(2, 2))
      state = stepSimulation(state)
      state = stepSimulation(state, placeResidence(5, 5))
      state = stepSimulation(state)
      state = stepSimulation(state)
      state = stepSimulation(state)
      state = stepSimulation(state)
      return { serialized: serializeCanonicalState(state), hash: hashCanonicalState(state) }
    }

    const runA = runScenario()
    const runB = runScenario()
    expect(runA.hash).toBe(runB.hash)
    expect(runA.serialized).toBe(runB.serialized)
  })

  it('key insertion order does not affect serialization', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(1, 1))
    state = stepSimulation(state, placeResidence(6, 6))
    state = stepSimulation(state)
    state = stepSimulation(state)

    const reordered = {
      counters: state.counters,
      colonists: state.colonists,
      buildings: state.buildings,
      time: state.time,
      config: state.config,
    }
    expect(serializeCanonicalState(state)).toBe(
      serializeCanonicalState(reordered)
    )
    expect(hashCanonicalState(state)).toBe(hashCanonicalState(reordered))
  })

  it('different command sequences produce different states', () => {
    const a = stepSimulation(createTestState(), placeResidence(2, 2))
    const b = stepSimulation(createTestState(), placeResidence(3, 3))
    expect(hashCanonicalState(a)).not.toBe(hashCanonicalState(b))
  })
})

interface SimulationStateLike {
  readonly serialized: string
  readonly hash: string
}
