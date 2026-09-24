import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  hashCanonicalState,
  loadSave,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  produceMaterial,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type SimulationState,
} from '@/index'
import { allocateToStorage, createInitialStorageHub } from '@/domain/storage/storage.js'
import { createTestState, withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

const withConstruction = (state: SimulationState, construction: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
  storage: { ...state.storage, food: 0, water: 0, material: 0 },
})

const withStorageMaterial = (state: SimulationState, material: number): SimulationState => ({
  ...state,
  storage: { ...state.storage, material },
})

/** One staffed operational Workshop: 2 gross Material/tick, 25 main cap. */
const staffedWorkshop = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'residence' })
  state = stepSimulation(state)
  state = stepSimulation(withWorkshopWater(state), {
    type: 'placeBuilding', x: 4, y: 4, buildingType: 'workshop',
  })
  state = withRoadsForWorkshops(state)
  state = stepSimulation(state)
  return stepSimulation(state)
}

describe('Step 10BI — protected Storage reserve audit', () => {
  it('A/B — no false overflow below or exactly at main capacity', () => {
    const below = produceMaterial(withConstruction(staffedWorkshop(), 22))
    expect(below.resources.construction).toBe(24)
    expect(below.storage.material).toBe(0)

    const exact = produceMaterial(withConstruction(staffedWorkshop(), 23))
    expect(exact.resources.construction).toBe(25)
    expect(exact.storage.material).toBe(0)
  })

  it('C/D/E/F — overflow is additive, bounded, and deterministic', () => {
    const partial = produceMaterial(withStorageMaterial(withConstruction(staffedWorkshop(), 24), 10))
    expect(partial.resources.construction).toBe(25)
    expect(partial.storage.material).toBe(11)

    const full = produceMaterial(withStorageMaterial(withConstruction(staffedWorkshop(), 24), 39))
    expect(full.resources.construction).toBe(25)
    expect(full.storage.material).toBe(40)

    const over = produceMaterial(withStorageMaterial(withConstruction(staffedWorkshop(), 24), 40))
    expect(over.resources.construction).toBe(25)
    expect(over.storage.material).toBe(40)
  })

  it('E/F — excess beyond both caps follows existing loss behavior', () => {
    const initial = withStorageMaterial(withConstruction(staffedWorkshop(), 24), 40)
    const result = allocateToStorage(initial.storage, 0, 0, 1000)
    expect(result.remainingMaterial).toBe(1000)
    expect(result.storage.material).toBe(40)
  })

  it('multi-tick reserve persists without reset or double-counting', () => {
    const first = produceMaterial(withConstruction(staffedWorkshop(), 24))
    expect(first.storage.material).toBe(1)
    const second = produceMaterial(first)
    expect(second.storage.material).toBe(3)
    const third = produceMaterial(second)
    expect(third.storage.material).toBe(5)

    let replay = withConstruction(staffedWorkshop(), 24)
    for (let tick = 0; tick < 3; tick += 1) replay = produceMaterial(replay)
    expect(replay).toEqual(third)
  })

  it('construction never draws from protected Storage', () => {
    const state = withStorageMaterial(withConstruction(staffedWorkshop(), 0), 40)
    const result = applyCommand(state, {
      type: 'placeBuilding', x: 6, y: 6, buildingType: 'residence',
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('insufficientResources')
    expect(result.state.resources.construction).toBe(0)
    expect(result.state.storage.material).toBe(40)
  })

  it('construction consumes main stock and leaves Storage untouched', () => {
    const state = withStorageMaterial(withConstruction(staffedWorkshop(), 25), 15)
    const result = applyCommand(state, {
      type: 'placeBuilding', x: 6, y: 6, buildingType: 'residence',
    })
    expect(result.accepted).toBe(true)
    expect(result.state.resources.construction).toBe(0)
    expect(result.state.storage.material).toBe(15)
  })

  it('Food and Water slots remain untouched by Material overflow', () => {
    const result = produceMaterial(withConstruction(staffedWorkshop(), 24))
    expect(result.storage.food).toBe(0)
    expect(result.storage.water).toBe(0)
    expect(result.storage.material).toBe(1)
  })

  it('capacity invariants hold at zero, boundary, overflow, and full reserve', () => {
    const values = [0, 1, 39, 40]
    for (const material of values) {
      const result = allocateToStorage(createInitialStorageHub(), 0, 0, material)
      expect(result.storage.material).toBeGreaterThanOrEqual(0)
      expect(result.storage.material).toBeLessThanOrEqual(result.storage.capacities.material)
    }
  })

  it('save/load preserves empty, partial, and full Storage', () => {
    for (const material of [0, 17, 40]) {
      const original = withStorageMaterial(createTestState(), material)
      const restored = loadSave(serializeSave(original))
      expect(restored.storage).toEqual(original.storage)
      expect(hashCanonicalState(restored)).toBe(hashCanonicalState(original))
    }
    expect(SAVE_VERSION).toBe(8)
  })

  it('hash changes when any Storage resource changes', () => {
    const base = createTestState()
    const changed = {
      ...base,
      storage: { ...base.storage, material: 1 },
    }
    expect(hashCanonicalState(changed)).not.toBe(hashCanonicalState(base))
    expect(hashCanonicalState({ ...base, storage: { ...base.storage, food: 1 } }))
      .not.toBe(hashCanonicalState(base))
    expect(hashCanonicalState({ ...base, storage: { ...base.storage, water: 1 } }))
      .not.toBe(hashCanonicalState(base))
  })

  it('replay is deterministic and storage constants remain unchanged', () => {
    const start = withStorageMaterial(withConstruction(staffedWorkshop(), 24), 0)
    let a = start
    let b = start
    for (let tick = 0; tick < 5; tick += 1) {
      a = stepSimulation(a)
      b = stepSimulation(b)
    }
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.storage.capacities).toEqual({ food: 50, water: 30, material: 40 })
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
  })
})
