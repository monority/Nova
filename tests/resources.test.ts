import { describe, expect, it } from 'vitest'

import {
  BUILDING_CATALOG,
  deductFood,
  FOOD_PER_COLONIST_PER_TICK,
  getBuildingDefinition,
  getResourceStock,
  hasSufficientFood,
  hashCanonicalState,
  INITIAL_FOOD,
  loadSave,
  type PlaceBuildingCommand,
  serializeSave,
  stepSimulation,
  validatePlacement,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: 'residence',
})

const withStock = (state: SimulationState, construction: number): SimulationState => ({
  ...state,
  resources: { construction, food: 100, water: 0 },
})

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

const COST = 25

describe('resource model (Step 4)', () => {
  it('initial stock is deterministic', () => {
    expect(getResourceStock(createTestState()).construction).toBe(100)
    expect(getResourceStock(createTestState())).toEqual(getResourceStock(createTestState()))
  })

  it('initial food stock is deterministic', () => {
    const stock = getResourceStock(createTestState())
    expect(stock.food).toBe(INITIAL_FOOD)
    expect(stock.food).toBe(100)
    expect(getResourceStock(createTestState()).food).toBe(
      getResourceStock(createTestState()).food
    )
  })

  it('building cost is defined by the domain catalog', () => {
    expect(BUILDING_CATALOG['residence'].constructionCost).toBe(COST)
    expect(getBuildingDefinition('residence').constructionCost).toBe(COST)
  })

  it('accepted placement deducts the cost from the stock', () => {
    const state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(getResourceStock(state).construction).toBe(100 - COST)
    expect(Object.keys(state.buildings)).toHaveLength(1)
  })

  it('rejected placement leaves resources and buildings unchanged', () => {
    const low = withStock(createTestState(), 10)
    const rejected = stepSimulation(low, placeResidence(6, 6))
    expect(getResourceStock(rejected).construction).toBe(10)
    expect(Object.keys(rejected.buildings)).toHaveLength(0)
    expect(rejected.colonists).toEqual({})
  })

  it('multiple accepted constructions consume the stock deterministically', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(6, 6))
    expect(getResourceStock(state).construction).toBe(75)
    state = stepSimulation(state, placeResidence(4, 4))
    expect(getResourceStock(state).construction).toBe(50)
    state = stepSimulation(state, placeResidence(2, 2))
    expect(getResourceStock(state).construction).toBe(25)
    state = stepSimulation(state, placeResidence(0, 0))
    expect(getResourceStock(state).construction).toBe(0)
    expect(Object.keys(state.buildings)).toHaveLength(4)
  })

  it('placement is rejected once the stock is below the cost', () => {
    let state = createTestState()
    for (const cell of [{ x: 6, y: 6 }, { x: 4, y: 4 }, { x: 2, y: 2 }, { x: 0, y: 0 }]) {
      state = stepSimulation(state, placeResidence(cell.x, cell.y))
    }
    const buildingsBefore = Object.keys(state.buildings).length
    const stockBefore = getResourceStock(state).construction
    const rejected = stepSimulation(state, placeResidence(1, 1))
    expect(Object.keys(rejected.buildings)).toHaveLength(buildingsBefore)
    expect(getResourceStock(rejected).construction).toBe(stockBefore)
  })

  it('construction lifecycle is unchanged by the new resource', () => {
    let state = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(state.buildings['building-1']?.status).toBe('underConstruction')
    expect(state.buildings['building-1']?.constructionRemaining).toBe(1)
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(state.buildings['building-1']?.constructionRemaining).toBe(0)
  })

  it('distinguishes spatial rejection from resource rejection', () => {
    const occupied = stepSimulation(createTestState(), placeResidence(6, 6))
    expect(validatePlacement(occupied, { x: 6, y: 6 }, 'residence')).toEqual({
      valid: false,
      reason: 'cellOccupied',
    })
    const broke = withStock(createTestState(), 0)
    expect(validatePlacement(broke, { x: 3, y: 3 }, 'residence')).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
    expect(validatePlacement(broke, { x: 3, y: 3 }, 'residence')).not.toEqual({
      valid: false,
      reason: 'cellOccupied',
    })
  })

  it('persistence round-trips the resource stock', () => {
    let state = createTestState()
    state = stepSimulation(state, placeResidence(6, 6))
    state = stepSimulation(state, placeResidence(4, 4))
    const loaded = loadSave(serializeSave(state))
    expect(getResourceStock(loaded).construction).toBe(50)
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
  })

  it('canonical hash changes when the resource stock changes', () => {
    const a = stepSimulation(createTestState(), placeResidence(6, 6))
    const b = withStock(a, 50)
    expect(hashCanonicalState(a)).not.toBe(hashCanonicalState(b))
    expect(serializeSave(a)).not.toBe(serializeSave(b))
  })

  it('canonical hash changes when food changes', () => {
    const a = createTestState()
    const b = withFood(a, 99)
    expect(hashCanonicalState(a)).not.toBe(hashCanonicalState(b))
    expect(serializeSave(a)).not.toBe(serializeSave(b))
  })
})

describe('food resource (Step 05)', () => {
  it('exposes the food contract constants', () => {
    expect(INITIAL_FOOD).toBe(100)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
  })

  it('hasSufficientFood is a colony-level all-or-nothing check', () => {
    expect(hasSufficientFood({ construction: 0, food: 5, water: 0 }, 5)).toBe(true)
    expect(hasSufficientFood({ construction: 0, food: 4, water: 0 }, 5)).toBe(false)
    expect(hasSufficientFood({ construction: 0, food: 0, water: 0 }, 0)).toBe(true)
  })

  it('deductFood is atomic and pure', () => {
    const stock = { construction: 0, food: 10, water: 0 }
    const deducted = deductFood(stock, 3)
    expect(deducted.food).toBe(7)
    expect(deducted).not.toBe(stock)
    expect(stock.food).toBe(10)
  })

  it('deductFood rejects negative amounts and insufficient food', () => {
    expect(() => deductFood({ construction: 0, food: 10, water: 0 }, -1)).toThrow(
      'Negative food deduction'
    )
    expect(() => deductFood({ construction: 0, food: 2, water: 0 }, 5)).toThrow(
      'Insufficient food'
    )
  })
})