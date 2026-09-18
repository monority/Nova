import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  hashCanonicalState,
  serializeCanonicalState,
  stepSimulation,
  type PlaceBuildingCommand,
} from '@/index'
import { createTestState, testConfig } from './helpers.js'

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
    const a = createInitialState(testConfig)
    const b = createInitialState(testConfig)
    // Same logical state built with different insertion order.
    const reordered = {
      counters: { ...b.counters, nextRoadId: 1 },
      colonists: b.colonists,
      buildings: b.buildings,
      time: b.time,
      resources: b.resources,
      config: b.config,
      roads: {},
    }
    expect(serializeCanonicalState(a)).toBe(
      serializeCanonicalState(reordered)
    )
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(reordered))
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
