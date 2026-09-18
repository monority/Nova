import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  hashCanonicalState,
  serializeCanonicalState,
} from '@/index'
import { testConfig } from './helpers.js'

describe('canonical state', () => {
  it('creates a valid initial state', () => {
    const state = createInitialState(testConfig)
    expect(state.time.tick).toBe(0)
    expect(state.buildings).toEqual({})
    expect(state.colonists).toEqual({})
    expect(state.counters.nextBuildingId).toBe(1)
    expect(state.counters.nextColonistId).toBe(1)
  })

  it('rejects invalid world config', () => {
    expect(() => createInitialState({ world: { seed: 's', width: 0, height: 8 } })).toThrow()
    expect(() => createInitialState({ world: { seed: 's', width: 8, height: 1.5 } })).toThrow()
    expect(() => createInitialState({ world: { seed: '', width: 8, height: 8 } })).toThrow()
  })

  it('serializes deterministically regardless of key insertion order', () => {
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
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(reordered))
  })

  it('produces a stable deterministic hash', () => {
    const state = createInitialState(testConfig)
    expect(hashCanonicalState(state)).toBe(hashCanonicalState(createInitialState(testConfig)))
    expect(hashCanonicalState(state)).toMatch(/^[0-9a-f]{16}$/)
  })

  it('changes hash when canonical content changes', () => {
    const state = createInitialState(testConfig)
    const changed = { ...state, time: { tick: 1 } }
    expect(hashCanonicalState(state)).not.toBe(hashCanonicalState(changed))
  })
})
