/**
 * Placement affordability feedback (Step 10AD-1).
 *
 * The hover preview and the authoritative dispatch gate share ONE predicate
 * (`getPlacementAffordability`). These tests pin the two cases the Step 10AD
 * Water cost made load-bearing:
 *
 *   1. the 24-Material equilibrium: the rest stock is below the 25 cost, but
 *      this tick's stored Workshop inflow completes it — the domain ACCEPTS the
 *      placement, so the preview must report it as buildable;
 *   2. a genuinely unaffordable placement (Material or Water) stays refused.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getMaterialStoredProductionPerTick,
  getPlacementAffordability,
  getResourceStock,
  stepSimulation,
  validatePlacement,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10ad1', width: 20, height: 10 } }

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ad1: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10ad1: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ad1: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

/**
 * A colony with one staffed operational Workshop and a visible Material stock.
 * The Workshop is staffed, so `materialStoredProductionForTick` is live.
 */
const workshopColony = (material: number, water = 5): SimulationState => {
  let state = createInitialState(config)
  state = { ...state, resources: { ...state.resources, food: 500, construction: material, water } }
  state = op(state, 'residence', 1, 0)
  state = op(state, 'workshop', 1, 2)
  state = opRoad(state, 1, 1)
  state = createColonist(state, 'building-1').state
  return assignJobs(state)
}

const place = (x: number, y: number, type: BuildingType) =>
  ({ type: 'placeBuilding', x, y, buildingType: type }) as const

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

describe('§1 — the 24-Material equilibrium is buildable', () => {
  it('reports the Workshop as affordable at rest 24 while the domain accepts it', () => {
    const state = workshopColony(24)
    const stored = getMaterialStoredProductionPerTick(state)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    // The domain's own verdict at rest, for contrast.
    const restValidation = validatePlacement(state, { x: 3, y: 2 }, 'workshop')
    // The authoritative dispatch: the domain accepts mid-tick.
    const dispatched = stepSimulation(state, place(3, 2, 'workshop'))
    audit('WALL_24', {
      visibleMaterial: getResourceStock(state).construction,
      storedThisTick: stored,
      restValidation,
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      domainAcceptedThePlacement:
        Object.keys(dispatched.buildings).length > Object.keys(state.buildings).length,
      materialAfterDispatch: getResourceStock(dispatched).construction,
    })
    expect(getResourceStock(state).construction).toBe(24)
    expect(stored).toBeGreaterThanOrEqual(1)
    expect(restValidation).toEqual({ valid: false, reason: 'insufficientResources' })
    expect(affordability.coveredByStoredProduction).toBe(true)
    expect(affordability.affordable).toBe(true)
    // The preview now agrees with what the domain actually does.
    expect(Object.keys(dispatched.buildings)).toHaveLength(3)
  })

  it('still refuses a placement the stored inflow cannot cover', () => {
    // 20 Material with a staffed Workshop: 20 + 1 stored < 25.
    const state = workshopColony(20)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    const dispatched = stepSimulation(state, place(3, 2, 'workshop'))
    audit('WALL_REFUSED', {
      visibleMaterial: getResourceStock(state).construction,
      storedThisTick: getMaterialStoredProductionPerTick(state),
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      reason: affordability.placement.valid ? null : affordability.placement.reason,
      domainAccepted: Object.keys(dispatched.buildings).length > Object.keys(state.buildings).length,
    })
    expect(affordability.affordable).toBe(false)
    expect(affordability.coveredByStoredProduction).toBe(false)
    expect(Object.keys(dispatched.buildings)).toHaveLength(2)
  })
})

describe('§1 — the Water shortfall is its own refusal', () => {
  it('is refused for Water even when stored Material covers the cost', () => {
    // Material 24 + stored 1 = 25 (the Material clause alone would pass), but
    // Water 0: the placement must stay refused, exactly as the domain refuses it.
    const state = workshopColony(24, 0)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    const dispatched = stepSimulation(state, place(3, 2, 'workshop'))
    audit('WATER_REFUSAL', {
      material: getResourceStock(state).construction,
      storedThisTick: getMaterialStoredProductionPerTick(state),
      water: getResourceStock(state).water,
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      reason: affordability.placement.valid ? null : affordability.placement.reason,
      waterRequired: affordability.waterRequired,
      domainAccepted: Object.keys(dispatched.buildings).length > Object.keys(state.buildings).length,
    })
    expect(affordability.affordable).toBe(false)
    // Stored Material production must NOT be treated as covering the Water cost.
    expect(affordability.coveredByStoredProduction).toBe(false)
    // The validator reports the Material shortfall first (its deterministic
    // order) and the placement is refused either way.
    expect(affordability.placement).toEqual({ valid: false, reason: 'insufficientResources' })
    expect(Object.keys(dispatched.buildings)).toHaveLength(2)
  })

  it('reports the Water reason when only Water is missing', () => {
    const state = workshopColony(30, 0)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    audit('WATER_ONLY', {
      material: getResourceStock(state).construction,
      water: getResourceStock(state).water,
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      reason: affordability.placement.valid ? null : affordability.placement.reason,
    })
    expect(affordability.affordable).toBe(false)
    expect(affordability.placement).toEqual({ valid: false, reason: 'insufficientWater' })
  })

  it('accepts the same placement once one Water is available', () => {
    const state = workshopColony(24, 1)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    const dispatched = stepSimulation(state, place(3, 2, 'workshop'))
    audit('WATER_READY', {
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      waterAfter: getResourceStock(dispatched).water,
      domainAccepted: Object.keys(dispatched.buildings).length > Object.keys(state.buildings).length,
    })
    expect(affordability.affordable).toBe(true)
    expect(Object.keys(dispatched.buildings)).toHaveLength(3)
    expect(getResourceStock(dispatched).water).toBe(0)
  })
})

describe('§1 — the shared predicate never invents a second rule', () => {
  it('agrees with validatePlacement whenever the placement is fully affordable', () => {
    const state = workshopColony(50, 3)
    const affordability = getPlacementAffordability(state, { x: 3, y: 2 }, 'workshop')
    audit('AGREEMENT', {
      placement: affordability.placement,
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
    })
    expect(affordability.placement).toEqual({ valid: true })
    expect(affordability.affordable).toBe(true)
    expect(affordability.coveredByStoredProduction).toBe(false)
  })

  it('keeps non-resource failures (occupied cell) refused and uncompensated', () => {
    const state = workshopColony(24)
    // (1,2) is the existing operational Workshop: occupied.
    const affordability = getPlacementAffordability(state, { x: 1, y: 2 }, 'workshop')
    audit('OCCUPIED', {
      affordable: affordability.affordable,
      coveredByStoredProduction: affordability.coveredByStoredProduction,
      reason: affordability.placement.valid ? null : affordability.placement.reason,
    })
    expect(affordability.affordable).toBe(false)
    expect(affordability.coveredByStoredProduction).toBe(false)
    expect(affordability.placement).toEqual({ valid: false, reason: 'cellOccupied' })
  })
})
