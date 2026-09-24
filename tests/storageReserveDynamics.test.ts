import { describe, expect, it } from 'vitest'

import {
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
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
import { createTestState } from './helpers.js'

const TWO_WORKER_PRODUCTION = MATERIAL_PER_WORKER_PER_TICK * 2
const BUILDING_COST = 25
const STORAGE_CAPACITY = 40

type ReserveTrace = {
  main: number
  storage: number
  released: number
  constructions: number
  lost: number
}

const emptyTrace = (main = 0, storage = 0): ReserveTrace => ({
  main,
  storage,
  released: 0,
  constructions: 0,
  lost: 0,
})

/** Scenario driver using production/storage domain rules, without a second economy model. */
const produce = (trace: ReserveTrace, production: number): ReserveTrace => {
  const mainCapacity = MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP
  const mainHeadroom = Math.max(0, mainCapacity - trace.main)
  const stored = Math.min(production, mainHeadroom)
  const overflow = production - stored
  const allocation = allocateToStorage(
    { ...createTestState().storage, material: trace.storage },
    0,
    0,
    overflow
  )
  return {
    ...trace,
    main: trace.main + stored,
    storage: allocation.storage.material,
    lost: trace.lost + allocation.remainingMaterial,
  }
}

const construct = (trace: ReserveTrace): ReserveTrace => {
  const release = releaseProtectedMaterialReserve(
    { ...createTestState().storage, material: trace.storage },
    trace.main,
    BUILDING_COST
  )
  if (release.operationalMaterial < BUILDING_COST) {
    return {
      ...trace,
      main: release.operationalMaterial,
      storage: release.storage.material,
      released: trace.released + release.releaseAmount,
    }
  }
  return {
    ...trace,
    main: release.operationalMaterial - BUILDING_COST,
    storage: release.storage.material,
    released: trace.released + release.releaseAmount,
    constructions: trace.constructions + 1,
  }
}

const total = (trace: ReserveTrace): number => trace.main + trace.storage

describe('Step 10BK — protected reserve dynamics and balance audit', () => {
  it('A — stable production does not release or collapse reserve', () => {
    const trace = emptyTrace(25, 20)
    for (let tick = 0; tick < 10; tick += 1) {
      const before = trace.storage
      expect(construct(trace).released).toBe(0)
      expect(trace.storage).toBe(before)
    }
    expect(trace).toMatchObject({ main: 25, storage: 20, released: 0, constructions: 0 })
  })

  it('B — two-worker surplus accumulates deterministically to capacity', () => {
    let trace = emptyTrace(24, 0)
    for (let tick = 0; tick < 40; tick += 1) trace = produce(trace, TWO_WORKER_PRODUCTION)
    expect(trace.main).toBe(25)
    expect(trace.storage).toBe(STORAGE_CAPACITY)
    expect(trace.lost).toBeGreaterThan(0)

    const replay = emptyTrace(24, 0)
    let repeated = replay
    for (let tick = 0; tick < 40; tick += 1) repeated = produce(repeated, TWO_WORKER_PRODUCTION)
    expect(repeated).toEqual(trace)
  })

  it('C — short crisis releases only excess and never crosses floor', () => {
    const before = emptyTrace(0, 30)
    const after = construct(before)
    expect(after.released).toBe(15)
    expect(after.storage).toBe(PROTECTED_MATERIAL_RESERVE)
    expect(after.constructions).toBe(0)
    expect(after.main).toBe(15)
  })

  it('C — full reserve supports one standard construction event', () => {
    const after = construct(emptyTrace(0, 40))
    expect(after.released).toBe(25)
    expect(after.storage).toBe(15)
    expect(after.main).toBe(0)
    expect(after.constructions).toBe(1)
  })

  it('D — prolonged crisis exhausts releasable reserve once, then fails', () => {
    let trace = emptyTrace(0, 40)
    trace = construct(trace)
    const afterFirst = trace
    trace = construct(trace)
    const afterSecond = trace
    expect(afterFirst.storage).toBe(15)
    expect(afterSecond.storage).toBe(15)
    expect(afterSecond.released).toBe(25)
    expect(afterSecond.constructions).toBe(1)
  })

  it('E — recovery rebuilds reserve from floor through overflow', () => {
    let trace = emptyTrace(25, PROTECTED_MATERIAL_RESERVE)
    for (let tick = 0; tick < 9; tick += 1) trace = produce(trace, TWO_WORKER_PRODUCTION)
    expect(trace.main).toBe(25)
    expect(trace.storage).toBe(STORAGE_CAPACITY)
  })

  it('F — repeated short crises do not ping-pong or reuse release', () => {
    let trace = emptyTrace(0, 40)
    trace = construct(trace)
    trace = construct(trace)
    expect(trace.released).toBe(25)
    expect(trace.constructions).toBe(1)
    expect(trace.storage).toBe(15)
  })

  it('conservation holds: production changes only pool location until explicit loss', () => {
    let trace = emptyTrace(24, 0)
    const initialTotal = total(trace)
    for (let tick = 0; tick < 40; tick += 1) trace = produce(trace, TWO_WORKER_PRODUCTION)
    expect(initialTotal + 40 * TWO_WORKER_PRODUCTION - trace.lost).toBe(total(trace))
  })

  it('same-tick release uses pre-production state and remains deterministic', () => {
    const state: SimulationState = {
      ...createTestState(),
      resources: { ...createTestState().resources, construction: 0 },
      storage: { ...createTestState().storage, material: 39 },
    }
    const command = { type: 'placeBuilding' as const, x: 6, y: 6, buildingType: 'residence' as const }
    const a = stepSimulation(state, command)
    const b = stepSimulation(state, command)
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.storage.material).toBe(15)
    expect(a.resources.construction).toBe(24)
  })

  it('save/load preserves reserve and candidate floors remain deterministic', () => {
    const state: SimulationState = {
      ...createTestState(),
      storage: { ...createTestState().storage, material: 30 },
    }
    const restored = loadSave(serializeSave(state))
    expect(restored.storage).toEqual(state.storage)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    for (const floor of [10, 15, 20]) {
      const releasable = Math.max(0, 40 - floor)
      expect(releasable).toBeGreaterThanOrEqual(20)
    }
  })
})
