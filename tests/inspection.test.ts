import { describe, expect, it } from 'vitest'

import {
  type PlaceBuildingCommand,
  getBuildingIdAtCell,
  getBuildingInspection,
  stepSimulation,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

describe('building inspection (Step 3)', () => {
  it('exposes construction state right after placement', () => {
    const state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getBuildingInspection(state, 'building-1')).toEqual({
      id: 'building-1',
      type: 'residence',
      status: 'underConstruction',
      cell: { x: 6, y: 6 },
      constructionRemaining: 1,
      constructionDuration: 2,
      housingCapacity: 1,
      occupiedHousing: 0,
    })
  })

  it('construction remaining decreases as ticks progress', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getBuildingInspection(state, 'building-1')?.constructionRemaining).toBe(1)
    state = stepSimulation(state)
    expect(getBuildingInspection(state, 'building-1')?.constructionRemaining).toBe(0)
  })

  it('transitions to operational when construction finishes', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getBuildingInspection(state, 'building-1')?.status).toBe('underConstruction')
    state = stepSimulation(state)
    expect(getBuildingInspection(state, 'building-1')?.status).toBe('operational')
  })

  it('housing capacity reflects the domain catalog once operational', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    const under = getBuildingInspection(state, 'building-1')
    expect(under?.housingCapacity).toBe(1)
    expect(under?.occupiedHousing).toBe(0)
    state = stepSimulation(state)
    const operational = getBuildingInspection(state, 'building-1')
    expect(operational?.status).toBe('operational')
    expect(operational?.housingCapacity).toBe(1)
    expect(operational?.occupiedHousing).toBe(1)
  })

  it('colonist residence points to the correct building', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    state = stepSimulation(state)
    expect(state.colonists['colonist-1']?.residenceId).toBe('building-1')
    expect(getBuildingInspection(state, 'building-1')?.occupiedHousing).toBe(1)
  })

  it('resolves the building id at a cell and null for empty cells', () => {
    const state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getBuildingIdAtCell(state, { x: 6, y: 6 })).toBe('building-1')
    expect(getBuildingIdAtCell(state, { x: 1, y: 1 })).toBeNull()
  })

  it('returns null for unknown ids', () => {
    expect(getBuildingInspection(createTestState(), 'building-999')).toBeNull()
  })

  it('is a pure deterministic query (same state, same result)', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    state = stepSimulation(state)
    state = stepSimulation(state, placeResidence(4, 4))
    expect(getBuildingInspection(state, 'building-1')).toEqual(
      getBuildingInspection(state, 'building-1')
    )
    expect(getBuildingInspection(state, 'building-2')).toEqual(
      getBuildingInspection(state, 'building-2')
    )
  })
})