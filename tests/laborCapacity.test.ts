import { describe, expect, it } from 'vitest'

import {
  countEmployedWorkers,
  countStaffedOperationalWorkshops,
  getEmploymentSummary,
  getJobCapacity,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getProductiveWorkerCount,
  getResourceStock,
  hashCanonicalState,
  isEmployed,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  materialProductionForTick,
  materialUpkeepDueForTick,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState, withRoadsForWorkshops } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withConstruction = (
  state: SimulationState,
  construction: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

/** Step until the stock covers a 25 build cost (all catalog costs are 25). */
const untilAffordable = (state: SimulationState): SimulationState => {
  let ticks = 0
  while (getResourceStock(state).construction < 25) {
    state = stepSimulation(state)
    ticks += 1
    if (ticks > 1000) {
      throw new Error('test helper: refill never reached 25')
    }
  }
  return state
}

/**
 * R residences + W workshops, food sustained (1 farm up to 2 pop, 2 beyond).
 * Step 08F: one staffed Workshop equilibrates at 24, so workshops precede
 * farms — the second Workshop is funded from bootstrap, income under the
 * growing capacity funds the rest. The w=0 case fits bootstrap exactly.
 */
const capacityState = (residences: number, workshops: number): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 0, 0)) // t1
  state = stepSimulation(state) // t2: colonist-1
  let built = 0
  if (workshops >= 1) {
    state = stepSimulation(state, place('workshop', 0, 5)) // stock 50
    state = withRoadsForWorkshops(state) // 09F: road for WS1
    state = stepSimulation(state) // colonist-1 employed, stock 49
    built = 1
  }
  if (workshops >= 2) {
    state = stepSimulation(state, place('workshop', 1, 5)) // stock 24
    state = withRoadsForWorkshops(state) // 09F: road for WS2
    state = stepSimulation(state) // second operational, cap 50, stock 25
    built = 2
  }
  const farms = residences <= 2 ? 1 : 2
  for (let f = 0; f < farms; f++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('farm', 6 + f, 6))
    state = stepSimulation(state)
  }
  for (let i = 1; i < residences; i++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('residence', i, 0))
    state = stepSimulation(state)
  }
  for (let k = built; k < workshops; k++) {
    state = untilAffordable(state)
    state = stepSimulation(state, place('workshop', k + 2, 5))
    state = withRoadsForWorkshops(state) // 09F: road for the new workshop
    state = stepSimulation(state)
  }
  return state
}

describe('productive labor constraint (Step 08E)', () => {
  it('A — zero Workshops: colonists exist, production 0, upkeep 0', () => {
    const state = capacityState(2, 0)
    const population = Object.keys(state.colonists).length
    expect(population).toBeGreaterThan(0)
    expect(getJobCapacity(state)).toBe(0)
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    const before = getResourceStock(state).construction
    const after = stepSimulation(stepSimulation(state))
    expect(getResourceStock(after).construction).toBe(before)
  })

  it('B — vacant operational Workshop: production 0, upkeep 0', () => {
    let state = createTestState()
    state = stepSimulation(state, place('workshop', 1, 1)) // t1
    state = stepSimulation(state) // t2: operational, nobody housed
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
  })

  it('C — one staffed Workshop: 1 productive => 2 material, upkeep 1', () => {
    const state = capacityState(1, 1)
    expect(getProductiveWorkerCount(state)).toBe(1)
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    expect(getNetMaterialPerTick(state)).toBe(1)
  })

  it('D — two Workshops, one worker: productive 1 => 2 material', () => {
    const state = capacityState(1, 2)
    expect(getEmploymentSummary(state).employed).toBe(1)
    expect(getProductiveWorkerCount(state)).toBe(1)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    // The second Workshop is vacant and therefore free.
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    expect(getNetMaterialPerTick(state)).toBe(1)
  })

  it('E — two Workshops, two workers: productive 2 => 4 material', () => {
    const state = capacityState(2, 2)
    expect(getProductiveWorkerCount(state)).toBe(2)
    expect(materialProductionForTick(state)).toBe(4)
    expect(materialUpkeepDueForTick(state)).toBe(2)
    expect(getNetMaterialPerTick(state)).toBe(2)
  })

  it('F — excess population: 5 colonists, capacity 2 => production 4', () => {
    const state = capacityState(5, 2)
    const summary = getEmploymentSummary(state)
    expect(summary.population).toBe(5)
    expect(summary.jobCapacity).toBe(2)
    expect(summary.employed).toBe(2)
    expect(summary.unemployed).toBe(3)
    expect(getProductiveWorkerCount(state)).toBe(2)
    // Population alone (5 × 2 = 10) must NOT leak into production.
    expect(materialProductionForTick(state)).toBe(4)
    expect(materialProductionForTick(state)).toBe(
      getProductiveWorkerCount(state) * MATERIAL_PER_WORKER_PER_TICK
    )
    expect(materialUpkeepDueForTick(state)).toBe(2)
  })

  it('G — Workshop under construction: no production, no upkeep', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = stepSimulation(state, place('workshop', 4, 4)) // t3: constructing
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    // Construction never implies capacity, even with a waiting colonist.
    expect(getJobCapacity(state)).toBe(0)
  })

  it('H — starvation: 0 workers => 0 production, 0 upkeep, no penalty', () => {
    // Farm-less colony: food 0 starves on the very next tick.
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = stepSimulation(state) // t4: operational, employed
    state = withFood(state, 0)
    const materialBefore = getResourceStock(state).construction
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(0)
    expect(getProductiveWorkerCount(state)).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    expect(materialUpkeepDueForTick(state)).toBe(0)
    expect(getResourceStock(state).construction).toBe(materialBefore)
  })

  it('productive count equals actual valid assignments', () => {
    for (const [r, w] of [
      [1, 1],
      [1, 2],
      [2, 2],
      [5, 2],
    ] as const) {
      const state = capacityState(r, w)
      expect(getProductiveWorkerCount(state)).toBe(
        countEmployedWorkers(state)
      )
      let resolved = 0
      for (const colonist of Object.values(state.colonists)) {
        if (isEmployed(state, colonist)) {
          resolved += 1
          const workplace = state.buildings[colonist.workplaceId ?? '']
          expect(workplace?.type).toBe('workshop')
          expect(workplace?.status).toBe('operational')
        }
      }
      expect(getProductiveWorkerCount(state)).toBe(resolved)
      expect(getProductiveWorkerCount(state)).toBeLessThanOrEqual(
        getJobCapacity(state)
      )
    }
  })

  it('production query equals simulation production (tick delta)', () => {
    const state = capacityState(2, 2)
    const expected = materialProductionForTick(state)
    const upkeep = materialUpkeepDueForTick(state)
    const before = getResourceStock(state).construction
    const after = stepSimulation(state)
    // No build commanded: delta is exactly production minus upkeep paid.
    expect(getResourceStock(after).construction).toBe(before + expected - upkeep)
  })

  it('upkeep unchanged by 08E (staffed 1=>1, 2=>2)', () => {
    expect(getMaterialUpkeepPerTick(capacityState(1, 1))).toBe(1)
    expect(getMaterialUpkeepPerTick(capacityState(2, 2))).toBe(2)
    expect(materialUpkeepDueForTick(capacityState(5, 2))).toBe(2)
  })

  it('conservation: material >= 0, upkeep <= production on valid states', () => {
    const starts: SimulationState[] = [
      capacityState(2, 0),
      capacityState(1, 1),
      capacityState(1, 2),
      capacityState(5, 2),
      withConstruction(capacityState(2, 2), 0),
    ]
    for (const start of starts) {
      let state = start
      for (let i = 0; i < 20; i++) {
        expect(materialUpkeepDueForTick(state)).toBeLessThanOrEqual(
          materialProductionForTick(state)
        )
        state = stepSimulation(state)
        expect(getResourceStock(state).construction).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('determinism: capacity scenario replays to identical state + hash', () => {
    const run = (): SimulationState => {
      let state = capacityState(5, 2)
      state = stepSimulation(state, place('farm', 3, 3))
      state = stepSimulation(state)
      state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('save/hash: SAVE_VERSION 4, round-trip stable, nothing new persisted', () => {
    expect(SAVE_VERSION).toBe(4)
    const state = stepSimulation(capacityState(5, 2))
    const raw = serializeSave(state)
    expect(raw).not.toContain('productive')
    expect(raw).not.toContain('upkeep')
    const restored = loadSave(raw)
    expect(restored).toEqual(state)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })
})
