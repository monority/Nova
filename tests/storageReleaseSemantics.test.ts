import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  type SimulationState,
} from '@/index'
import {
  PROTECTED_MATERIAL_RESERVE,
  allocateToStorage,
  releaseProtectedMaterialReserve,
} from '@/domain/storage/storage.js'
import { testConfig } from './helpers.js'

const withStorageMaterial = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  storage: { ...state.storage, material },
})

const withMainMaterial = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction: material },
})

const placeResidence = { type: 'placeBuilding' as const, x: 6, y: 6, buildingType: 'residence' as const }

describe('Step 10BJ — protected Material release semantics', () => {
  it('uses a derived 15-unit protected floor and never releases without a deficit', () => {
    const storage = { ...createInitialState(testConfig).storage, material: 40 }
    const result = releaseProtectedMaterialReserve(storage, 25, 25)
    expect(PROTECTED_MATERIAL_RESERVE).toBe(15)
    expect(result.releaseAmount).toBe(0)
    expect(result.operationalMaterial).toBe(25)
    expect(result.storage.material).toBe(40)
  })

  it('releases only the excess above the floor and only the deficit', () => {
    const storage = { ...createInitialState(testConfig).storage, material: 30 }
    const result = releaseProtectedMaterialReserve(storage, 0, 25)
    expect(result.releaseAmount).toBe(15)
    expect(result.operationalMaterial).toBe(15)
    expect(result.storage.material).toBe(15)
  })

  it('preserves exact floor, empty, and full-reserve boundaries', () => {
    const empty = releaseProtectedMaterialReserve(createInitialState(testConfig).storage, 0, 25)
    expect(empty.releaseAmount).toBe(0)
    const floor = releaseProtectedMaterialReserve(
      { ...createInitialState(testConfig).storage, material: 15 }, 0, 25
    )
    expect(floor.releaseAmount).toBe(0)
    const full = releaseProtectedMaterialReserve(
      { ...createInitialState(testConfig).storage, material: 40 }, 0, 25
    )
    expect(full.releaseAmount).toBe(25)
    expect(full.storage.material).toBe(15)
  })

  it('releases pre-existing reserve before a building command, then construction spends operational stock', () => {
    const initial = withMainMaterial(withStorageMaterial(createInitialState(testConfig), 40), 0)
    const result = stepSimulation(initial, placeResidence)
    expect(result.resources.construction).toBe(0)
    expect(result.storage.material).toBe(15)
    expect(result.buildings['building-1']?.status).toBe('underConstruction')
  })

  it('does not release when the protected floor blocks the request', () => {
    const initial = withMainMaterial(withStorageMaterial(createInitialState(testConfig), 15), 0)
    const result = stepSimulation(initial, placeResidence)
    expect(result.resources.construction).toBe(0)
    expect(result.storage.material).toBe(15)
    expect(result.buildings['building-1']).toBeUndefined()
  })

  it('does not release for sufficient main stock', () => {
    const initial = {
      ...withStorageMaterial(createInitialState(testConfig), 40),
      resources: { ...createInitialState(testConfig).resources, construction: 25 },
    }
    const result = stepSimulation(initial, placeResidence)
    expect(result.storage.material).toBe(40)
    expect(result.resources.construction).toBe(0)
  })

  it('does not release for invalid construction commands', () => {
    const initial = withMainMaterial(withStorageMaterial(createInitialState(testConfig), 40), 0)
    const result = stepSimulation(initial, { ...placeResidence, x: 99, y: 99 })
    expect(result.storage.material).toBe(40)
    expect(result.resources.construction).toBe(0)
  })

  it('does not collapse newly produced overflow into same-tick release', () => {
    const initial = withMainMaterial(withStorageMaterial(createInitialState(testConfig), 39), 0)
    const result = stepSimulation(initial, placeResidence)
    expect(result.storage.material).toBe(15)
    expect(result.resources.construction).toBe(24)
    expect(result.buildings['building-1']).toBeUndefined()
  })

  it('does not ping-pong when the released operational amount is not consumed', () => {
    const initial = withStorageMaterial(createInitialState(testConfig), 40)
    const first = releaseProtectedMaterialReserve(initial.storage, 0, 10)
    const second = releaseProtectedMaterialReserve(first.storage, first.operationalMaterial, 10)
    expect(first.releaseAmount).toBe(10)
    expect(second.releaseAmount).toBe(0)
    expect(second.storage.material).toBe(30)
  })

  it('save/load and hash preserve released state without persisting transient calculations', () => {
    const initial = withStorageMaterial(createInitialState(testConfig), 40)
    const restored = loadSave(serializeSave(initial))
    expect(restored.storage).toEqual(initial.storage)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(initial))
    const changed = withStorageMaterial(initial, 39)
    expect(hashCanonicalState(changed)).not.toBe(hashCanonicalState(initial))
  })

  it('retains pure overflow bounds and resource independence', () => {
    const base = createInitialState(testConfig).storage
    const result = allocateToStorage(base, 0, 0, 100)
    expect(result.storage.material).toBe(40)
    expect(result.remainingMaterial).toBe(60)
    expect(result.storage.food).toBe(0)
    expect(result.storage.water).toBe(0)
  })
})
