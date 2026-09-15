import type { CityState } from '../city'
import { BUILDING_TYPES } from '../city'
import type { PopulationState } from '../population'
import { SIMULATION_SECONDS_PER_DAY } from '../population'

export interface EconomyState {
  readonly food: number
  readonly foodProduced: number
  readonly foodConsumed: number
  readonly foodShortage: number
}

export const FOOD_CONSUMPTION_PER_PERSON_PER_DAY = 0.1

export function createEconomyState(): EconomyState {
  return { food: 0, foodProduced: 0, foodConsumed: 0, foodShortage: 0 }
}

export function getFoodProductionPerDay(city: CityState): number {
  return city.buildings.reduce((total, building) => total + BUILDING_TYPES[building.type].foodPerDay, 0)
}

export function advanceEconomy(economy: EconomyState, city: CityState, population: PopulationState, elapsedSeconds: number): EconomyState {
  const elapsedDays = elapsedSeconds / SIMULATION_SECONDS_PER_DAY
  const foodProduced = getFoodProductionPerDay(city) * elapsedDays
  const foodConsumed = population.total * FOOD_CONSUMPTION_PER_PERSON_PER_DAY * elapsedDays
  const availableFood = economy.food + foodProduced
  const food = Math.max(0, availableFood - foodConsumed)
  return { food, foodProduced, foodConsumed, foodShortage: Math.max(0, foodConsumed - availableFood) }
}
