import type { CityState } from '../city'
import { BUILDING_TYPES } from '../city'
import type { PopulationState } from '../population'
import { SIMULATION_SECONDS_PER_DAY } from '../population'
import {
  ENERGY_PER_BUILDING_PER_DAY,
  ENERGY_PER_SERVICE_PER_DAY,
  INITIAL_ENERGY,
  INITIAL_FOOD,
  INITIAL_MATERIALS,
  MATERIALS_PER_DAY_SETTLEMENT_SOURCE,
  PEOPLE_PER_ENERGY_UNIT_PER_DAY,
} from './resource-costs'

export interface EconomyState {
  readonly food: number
  readonly foodProduced: number
  readonly foodConsumed: number
  readonly foodShortage: number
  readonly energy: number
  readonly energyProduced: number
  readonly energyConsumed: number
  readonly energyShortage: number
  readonly materials: number
  readonly materialsProduced: number
  readonly materialsConsumed: number
}

export const FOOD_CONSUMPTION_PER_PERSON_PER_DAY = 0.1

export function createEconomyState(): EconomyState {
  return {
    food: 0,
    foodProduced: 0,
    foodConsumed: 0,
    foodShortage: 0,
    energy: 0,
    energyProduced: 0,
    energyConsumed: 0,
    energyShortage: 0,
    materials: 0,
    materialsProduced: 0,
    materialsConsumed: 0,
  }
}

/** Contract starting values (Step 21): food 180, energy 120, materials 300. */
export function createInitialEconomyState(): EconomyState {
  return {
    ...createEconomyState(),
    food: INITIAL_FOOD,
    energy: INITIAL_ENERGY,
    materials: INITIAL_MATERIALS,
  }
}

export function getFoodProductionPerDay(city: CityState): number {
  return city.buildings.reduce((total, building) => total + buildingFoodPerDay(building.type), 0)
}

function buildingFoodPerDay(type: keyof typeof BUILDING_TYPES): number {
  return BUILDING_TYPES[type].foodPerDay
}

export function getEnergyProductionPerDay(city: CityState): number {
  return city.services.length * ENERGY_PER_SERVICE_PER_DAY
}

export function getEnergyConsumptionPerDay(city: CityState, population: PopulationState): number {
  return (
    city.buildings.length * ENERGY_PER_BUILDING_PER_DAY +
    Math.floor(population.total / PEOPLE_PER_ENERGY_UNIT_PER_DAY)
  )
}

export function advanceEconomy(
  economy: EconomyState,
  city: CityState,
  population: PopulationState,
  elapsedSeconds: number,
): EconomyState {
  const elapsedDays = elapsedSeconds / SIMULATION_SECONDS_PER_DAY

  const foodProduced = getFoodProductionPerDay(city) * elapsedDays
  const foodConsumed = population.total * FOOD_CONSUMPTION_PER_PERSON_PER_DAY * elapsedDays
  const availableFood = economy.food + foodProduced

  const energyProduced = getEnergyProductionPerDay(city) * elapsedDays
  const energyConsumed = getEnergyConsumptionPerDay(city, population) * elapsedDays
  const availableEnergy = economy.energy + energyProduced

  const materialsProduced = MATERIALS_PER_DAY_SETTLEMENT_SOURCE * elapsedDays

  return {
    food: Math.max(0, availableFood - foodConsumed),
    foodProduced,
    foodConsumed,
    foodShortage: Math.max(0, foodConsumed - availableFood),
    energy: Math.max(0, availableEnergy - energyConsumed),
    energyProduced,
    energyConsumed,
    energyShortage: Math.max(0, energyConsumed - availableEnergy),
    materials: economy.materials + materialsProduced,
    materialsProduced,
    materialsConsumed: 0,
  }
}

export function canAffordMaterials(economy: EconomyState, cost: number): boolean {
  return economy.materials >= cost
}

/** Spend materials for construction. Never goes negative; returns null when unaffordable. */
export function trySpendMaterials(economy: EconomyState, cost: number): EconomyState | null {
  if (cost < 0) return null
  if (economy.materials < cost) return null
  return { ...economy, materials: economy.materials - cost, materialsConsumed: economy.materialsConsumed + cost }
}
