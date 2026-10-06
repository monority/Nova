/**
 * Step001 — storage allocate/release semantics (food and water only).
 *
 * The hub buffers physical surpluses with fixed priorities; money is never
 * stored. Allocation and release are pure and deterministic.
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
} from '@/index'
import {
  allocateToStorage,
  createInitialStorageHub,
  releaseFromStorage,
} from '@/domain/storage/storage.js'
import { testConfig } from './helpers.js'

const placeResidence = { type: 'placeBuilding' as const, x: 6, y: 6, buildingType: 'residence' as const }

describe('Step001 — storage allocate/release semantics', () => {
  it('allocates food first, up to capacity', () => {
    const result = allocateToStorage(createInitialStorageHub(), 100, 0)
    expect(result.storage.food).toBe(50)
    expect(result.remainingFood).toBe(50)
    expect(result.storage.water).toBe(0)
  })

  it('allocates water after food headroom', () => {
    const result = allocateToStorage(createInitialStorageHub(), 10, 100)
    expect(result.storage.food).toBe(10)
    expect(result.remainingFood).toBe(0)
    expect(result.storage.water).toBe(30)
    expect(result.remainingWater).toBe(70)
  })

  it('releases food before water, capped at the shortfall', () => {
    const hub = { ...createInitialStorageHub(), food: 20, water: 30 }
    const result = releaseFromStorage(hub, 8, 40)
    expect(result.storage.food).toBe(12)
    expect(result.unmetFood).toBe(0)
    expect(result.storage.water).toBe(0)
    expect(result.unmetWater).toBe(10)
  })

  it('empty hub releases nothing', () => {
    const result = releaseFromStorage(createInitialStorageHub(), 5, 5)
    expect(result.unmetFood).toBe(5)
    expect(result.unmetWater).toBe(5)
  })

  it('hub state is orthogonal to construction: a build touches money only', () => {
    const initial = createInitialState(testConfig)
    const result = stepSimulation(initial, placeResidence)
    expect(result.storage.food).toBe(0)
    expect(result.storage.water).toBe(0)
    expect(result.resources.money).toBe(75)
    expect(result.buildings['building-1']?.status).toBe('underConstruction')
  })

  it('save/load and hash preserve hub state', () => {
    const initial = {
      ...createInitialState(testConfig),
      storage: { ...createInitialState(testConfig).storage, food: 12, water: 7 },
    }
    const restored = loadSave(serializeSave(initial))
    expect(restored.storage).toEqual(initial.storage)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(initial))
    const changed = {
      ...initial,
      storage: { ...initial.storage, food: 11 },
    }
    expect(hashCanonicalState(changed)).not.toBe(hashCanonicalState(initial))
  })
})
