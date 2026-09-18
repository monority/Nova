import { describe, expect, it } from 'vitest'

import {
  BUILDING_CATALOG,
  countOperationalFarms,
  FOOD_PER_FARM_PER_TICK,
  getFoodProductionPerTick,
  getFoodTicksRemaining,
  getHousingSummary,
  getResourceStock,
  hashCanonicalState,
  loadSave,
  produceFood,
  SAVE_VERSION,
  serializeSave,
  stepSimulation,
  type PlaceBuildingCommand,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

const placeFarm = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'farm',
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

/** One operational residence + one admitted colonist (tick 2). */
const colonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, placeResidence(2, 2))
  state = stepSimulation(state)
  return state
}

describe('farm catalog (Step 06B)', () => {
  it('defines the minimal producer contract', () => {
    expect(BUILDING_CATALOG.farm).toEqual({
      constructionTicks: 2,
      housingCapacity: 0,
      constructionCost: 25,
    })
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
  })

  it('farms cost construction material through the shared placement path', () => {
    const state = stepSimulation(createTestState(), placeFarm(1, 1))
    expect(getResourceStock(state).construction).toBe(75)
    expect(state.buildings['building-1']?.type).toBe('farm')
    expect(state.buildings['building-1']?.status).toBe('underConstruction')
  })

  it('farms never provide housing capacity', () => {
    let state = stepSimulation(createTestState(), placeFarm(1, 1))
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(getHousingSummary(state)).toEqual({
      totalCapacity: 0,
      occupiedCapacity: 0,
      availableCapacity: 0,
    })
    expect(Object.keys(state.colonists)).toHaveLength(0)
  })
})

describe('produceFood phase (Step 06B)', () => {
  it('produces nothing without farms and returns the input state', () => {
    const state = colonistState()
    expect(produceFood(state)).toBe(state)
    expect(countOperationalFarms(state)).toBe(0)
    expect(getFoodProductionPerTick(state)).toBe(0)
  })

  it('a non-operational farm produces nothing', () => {
    const state = stepSimulation(createTestState(), placeFarm(1, 1))
    expect(countOperationalFarms(state)).toBe(0)
    expect(produceFood(state)).toBe(state)
  })

  it('an operational farm produces exactly FOOD_PER_FARM_PER_TICK', () => {
    let state = stepSimulation(createTestState(), placeFarm(1, 1))
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(countOperationalFarms(state)).toBe(1)
    expect(getFoodProductionPerTick(state)).toBe(2)
    // Production starts the very tick the farm becomes operational (tick 2).
    expect(getResourceStock(state).food).toBe(102)
    // Zero colonists: stockpile, no consumption.
    expect(getResourceStock(stepSimulation(state)).food).toBe(104)
  })

  it('multiple producers sum deterministically', () => {
    let state = createTestState()
    state = stepSimulation(state, placeFarm(1, 1))
    state = stepSimulation(state, placeFarm(2, 2))
    state = stepSimulation(state)
    expect(countOperationalFarms(state)).toBe(2)
    expect(getFoodProductionPerTick(state)).toBe(4)
    const foodBefore = getResourceStock(state).food
    const after = stepSimulation(state)
    expect(getResourceStock(after).food).toBe(foodBefore + 4)
  })

  it('same-tick save: a farm operational this tick feeds consumption this tick', () => {
    // Farm completes construction on the very tick the colony would starve:
    // production (phase 4) precedes consumption (phase 5), so +2 covers the
    // 1 colonist and the colony survives with food 1.
    let state = colonistState()
    state = stepSimulation(state, placeFarm(0, 0))
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    state = withFood(state, 0)
    const after = stepSimulation(state)
    expect(after.buildings['building-2']?.status).toBe('operational')
    expect(Object.keys(after.colonists)).toHaveLength(1)
    expect(getResourceStock(after).food).toBe(1)
  })

  it('insufficient production preserves the documented shortage behavior', () => {
    // 3 colonists need 3; a single farm (+2) cannot save them.
    // Material budget: residence + farm + 2 residences = 100.
    let state = colonistState()
    state = stepSimulation(state, placeFarm(0, 0))
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state, placeResidence(7, 7))
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(3)
    state = withFood(state, 0)
    const starved = stepSimulation(state)
    expect(getResourceStock(starved).food).toBe(0)
    expect(Object.keys(starved.colonists)).toHaveLength(0)
  })

  it('sufficient production sustains the colony indefinitely', () => {
    // 2 colonists consume 2/tick; 1 farm produces 2/tick: net zero.
    let state = colonistState()
    state = stepSimulation(state, placeFarm(0, 0))
    state = stepSimulation(state, placeResidence(5, 5))
    state = stepSimulation(state)
    expect(Object.keys(state.colonists)).toHaveLength(2)
    const foodBefore = getResourceStock(state).food
    for (let i = 0; i < 10; i++) {
      state = stepSimulation(state)
    }
    expect(Object.keys(state.colonists)).toHaveLength(2)
    expect(getResourceStock(state).food).toBe(foodBefore)
  })

  it('food may exceed the initial stock: no cap, invariant food >= 0', () => {
    let state = stepSimulation(createTestState(), placeFarm(1, 1))
    // Tick 2: farm operational, first +2. Tick 3: second +2.
    state = stepSimulation(state)
    state = stepSimulation(state)
    expect(getResourceStock(state).food).toBe(104)
    expect(getResourceStock(state).food).toBeGreaterThanOrEqual(0)
  })

  it('production is deterministic and non-mutating', () => {
    const run = (): string => {
      let state = colonistState()
      state = stepSimulation(state, placeFarm(0, 0))
      state = stepSimulation(state)
      state = stepSimulation(state)
      return hashCanonicalState(state)
    }
    expect(run()).toBe(run())
    const state = colonistState()
    const before = hashCanonicalState(state)
    produceFood(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})

describe('food forecast query (Step 06B Part A §6)', () => {
  it('is null while nobody needs food and never stored', () => {
    const state = createTestState()
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(Object.keys(state.resources).sort()).toEqual([
      'construction',
      'food',
    ])
  })

  it('reports floor(food / population)', () => {
    const state = withFood(colonistState(), 99)
    expect(getFoodTicksRemaining(state)).toBe(99)
    const fedEmpty = withFood(colonistState(), 1)
    expect(getFoodTicksRemaining(fedEmpty)).toBe(1)
    const starving = withFood(colonistState(), 0)
    expect(getFoodTicksRemaining(starving)).toBe(0)
  })
})

describe('farm persistence (Step 06B §14)', () => {
  it('round-trips a state containing farms (SAVE_VERSION 4 since Step 07C)', () => {
    // Step 07C added ColonistState.workplaceId, bumping the save version from
    // 3 to 4. Farm behavior itself is unchanged and still round-trips.
    expect(SAVE_VERSION).toBe(4)
    let state = stepSimulation(createTestState(), placeFarm(1, 1))
    state = stepSimulation(state)
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(restored.buildings['building-1']?.type).toBe('farm')
    // Behavioral equivalence: production continues identically after load.
    expect(getResourceStock(stepSimulation(restored)).food).toBe(
      getResourceStock(stepSimulation(state)).food
    )
  })
})
