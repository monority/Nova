import { describe, expect, it } from 'vitest'

import {
  hashCanonicalState,
  type PlaceBuildingCommand,
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

describe('render snapshot', () => {
  it('is derived from canonical state', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(2, 3))
    state = stepSimulation(state)
    state = stepSimulation(state)

    const snapshot = toRenderSnapshot(state)
    expect(snapshot.tick).toBe(state.time.tick)
    expect(snapshot.world).toEqual({ width: 8, height: 8 })
    expect(snapshot.buildings).toEqual([
      {
        id: 'building-1',
        type: 'residence',
        x: 2,
        y: 3,
        status: 'operational',
        // Step 07C: employment is projected for rendering (0 for residences).
        workers: 0,
      },
    ])
    expect(snapshot.colonists).toEqual([
      { id: 'colonist-1', residenceId: 'building-1', cell: { x: 2, y: 3 } },
    ])
  })

  it('does not mutate canonical state', () => {
    const state = stepSimulation(createTestState(), placeResidence(1, 1))
    const before = hashCanonicalState(state)
    toRenderSnapshot(state)
    toRenderSnapshot(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})
