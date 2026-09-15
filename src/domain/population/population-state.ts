import type { CityState } from '../city'
import { BUILDING_TYPES } from '../city'

export interface PopulationState {
  readonly total: number
  readonly growthProgress: number
}

// Abstract population scale: fast enough to observe settlement growth at high simulation speeds.
export const POPULATION_GROWTH_PER_DAY = 60
export const SIMULATION_SECONDS_PER_DAY = 24 * 60 * 60

export function createPopulationState(): PopulationState {
  return { total: 0, growthProgress: 0 }
}

export function getHousingCapacity(city: CityState): number {
  return city.buildings.reduce((capacity, building) => capacity + BUILDING_TYPES[building.type].housingCapacity, 0)
}

export function advancePopulation(population: PopulationState, city: CityState, elapsedSeconds: number): PopulationState {
  const capacity = getHousingCapacity(city)
  if (capacity <= 0) return { total: 0, growthProgress: 0 }
  const cappedTotal = Math.min(population.total, capacity)
  if (cappedTotal >= capacity || elapsedSeconds <= 0) return { total: cappedTotal, growthProgress: population.growthProgress }
  const progress = population.growthProgress + (elapsedSeconds / SIMULATION_SECONDS_PER_DAY) * POPULATION_GROWTH_PER_DAY
  const growth = Math.min(capacity - cappedTotal, Math.floor(progress))
  return { total: cappedTotal + growth, growthProgress: growth >= Math.floor(progress) ? progress - Math.floor(progress) : 0 }
}

export function clampPopulationToHousing(population: PopulationState, city: CityState): PopulationState {
  return { ...population, total: Math.min(population.total, getHousingCapacity(city)) }
}
