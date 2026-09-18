import { describe, expect, it } from 'vitest'

import {
  hashCanonicalState,
  type PlaceBuildingCommand,
  SAVE_VERSION,
  SaveValidationError,
  serializeSave,
  loadSave,
  serializeCanonicalState,
  stepSimulation,
  toRenderSnapshot,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

describe('persistence', () => {
  it('save/load round-trip preserves canonical state', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(2, 2))
    state = stepSimulation(state)
    state = stepSimulation(state)
    state = stepSimulation(state)

    const loaded = loadSave(serializeSave(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
  })

  it('simulation continues identically after load (behavioral equivalence)', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(3, 3))
    state = stepSimulation(state)
    state = stepSimulation(state)

    const loaded = loadSave(serializeSave(state))
    const fromOriginal = stepSimulation(state)
    const fromLoaded = stepSimulation(loaded)
    expect(hashCanonicalState(fromOriginal)).toBe(
      hashCanonicalState(fromLoaded)
    )
  })

  it('save file has explicit format and version', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as Record<string, unknown>
    expect(parsed['format']).toBe('nova-save')
    expect(parsed['version']).toBe(SAVE_VERSION)
  })

  it('rejects unsupported save versions', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 999
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(
      SaveValidationError
    )
  })

  it('explicitly rejects v2 saves (no silent food migration)', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 2
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(
      SaveValidationError
    )
  })

  it('rejects saves missing the food field', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as { state: { resources: Record<string, unknown> } }
    delete parsed.state.resources['food']
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(
      SaveValidationError
    )
  })

  it('rejects invalid food values', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as { state: { resources: Record<string, unknown> } }
    parsed.state.resources['food'] = -1
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(
      SaveValidationError
    )
    parsed.state.resources['food'] = 1.5
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(
      SaveValidationError
    )
  })

  it('rejects unknown format and malformed JSON', () => {
    expect(() => loadSave('not json')).toThrow(SaveValidationError)
    expect(() => loadSave('{"format":"other","version":1,"state":{}}')).toThrow(
      SaveValidationError
    )
  })

  it('rejects state containing unexpected fields', () => {
    const save = serializeSave(createTestState())
    const parsed = JSON.parse(save) as {
      state: Record<string, unknown>
    }
    parsed.state['cameraState'] = { x: 1 }
    expect(() =>
      loadSave(JSON.stringify({ ...parsed }))
    ).toThrow(SaveValidationError)
  })

  it('loaded state produces identical render snapshot', () => {
    let state = stepSimulation(createTestState(), placeResidence(1, 2))
    state = stepSimulation(state)
    state = stepSimulation(state)
    const loaded = loadSave(serializeSave(state))
    expect(toRenderSnapshot(loaded)).toEqual(toRenderSnapshot(state))
  })
})
