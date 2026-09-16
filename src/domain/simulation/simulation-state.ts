import { createCityState, type CityState } from '../city'
import type { World } from '../world'
import { advanceClock, createSimulationClock, SIMULATION_TIME, type SimulationClock } from './simulation-clock'
import { advancePopulation, createPopulationState, type PopulationState } from '../population'
import {
  advanceEconomy,
  createEconomyState,
  trySpendMaterials,
  type EconomyState,
} from '../economy'
import { CONSTRUCTION_COSTS, EVOLVE_COST } from '../economy/resource-costs'
import { advanceDevelopment } from '../development'

export interface SimulationState {
  readonly world: World
  readonly city: CityState
  readonly clock: SimulationClock
  readonly population: PopulationState
  readonly economy: EconomyState
}

/**
 * Step 23 — Canonical tick order (docs/20-product-contract.md).
 * One tick equals one simulated day. Each phase maps onto existing systems;
 * empty phases are explicit identity steps, not hidden behavior.
 */
export const CANONICAL_TICK_PHASES = [
  'commands',
  'accessibility',
  'production',
  'consumption',
  'housing',
  'construction',
  'events',
  'hash',
] as const

export type CanonicalTickPhase = (typeof CANONICAL_TICK_PHASES)[number]

export function createSimulationState(world: World): SimulationState {
  return {
    world,
    city: createCityState(),
    clock: createSimulationClock(),
    population: createPopulationState(),
    economy: createEconomyState(),
  }
}

export function advanceSimulationTick(state: SimulationState): SimulationState {
  // 1. Commands — player commands apply synchronously at the commit boundary
  // (runtime.commitState), never mid-tick. Nothing to apply here.
  const afterCommands = state
  // 2. Accessibility — road access is derived on demand from the road network
  // (validation, scoring, coverage). No cached accessibility state exists.
  const afterAccessibility = afterCommands

  const nextClock = advanceClock(afterAccessibility.clock, SIMULATION_TIME.TICKS_PER_DAY)
  // 3-5. Production + consumption + housing — economy and population advance
  // by exactly one simulated day per tick.
  const nextPopulation = advancePopulation(
    afterAccessibility.population,
    afterAccessibility.city,
    SIMULATION_TIME.SECONDS_PER_DAY,
  )
  const producedEconomy = advanceEconomy(
    afterAccessibility.economy,
    afterAccessibility.city,
    nextPopulation,
    SIMULATION_TIME.SECONDS_PER_DAY,
  )
  // 6. Construction — autonomous development gated by material affordability.
  const nextCity = advanceDevelopment(
    afterAccessibility.world,
    afterAccessibility.city,
    nextPopulation,
    producedEconomy,
    nextClock.currentTick,
  )
  const developmentCost = measureDevelopmentCost(afterAccessibility.city, nextCity)
  const nextEconomy =
    developmentCost > 0 ? (trySpendMaterials(producedEconomy, developmentCost) ?? producedEconomy) : producedEconomy

  // 7. Events — derived downstream by pure projections
  // (projectUrbanChanges, projectStageTransitionGroup), never stored.
  // 8. Hash — derived on demand via getSimulationStateHash, never stored.
  return {
    ...afterAccessibility,
    clock: nextClock,
    city: nextCity,
    population: nextPopulation,
    economy: nextEconomy,
  }
}

/** Material cost of an autonomous development delta (new buildings/roads + evolutions). */
function measureDevelopmentCost(previous: CityState, next: CityState): number {
  if (next === previous) return 0
  let cost = 0
  const previousBuildings = new Map(previous.buildings.map((building) => [building.id, building.type] as const))
  for (const building of next.buildings) {
    const previousType = previousBuildings.get(building.id)
    if (previousType === undefined) cost += CONSTRUCTION_COSTS[building.type] ?? 0
    else if (previousType !== building.type) cost += EVOLVE_COST
  }
  const previousRoads = new Set(previous.roads.map((road) => road.id))
  for (const road of next.roads) {
    if (!previousRoads.has(road.id)) cost += CONSTRUCTION_COSTS.road
  }
  return cost
}
