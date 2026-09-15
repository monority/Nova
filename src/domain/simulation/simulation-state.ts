import { createCityState, type CityState } from '../city'
import type { World } from '../world'
import { advanceClock, createSimulationClock, type SimulationClock } from './simulation-clock'
import { advancePopulation, createPopulationState, type PopulationState } from '../population'
import { advanceEconomy, createEconomyState, type EconomyState } from '../economy'
import { advanceDevelopment } from '../development'

export interface SimulationState {
  readonly world: World
  readonly city: CityState
  readonly clock: SimulationClock
  readonly population: PopulationState
  readonly economy: EconomyState
}

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
  const nextClock = advanceClock(state.clock, 1)
  const nextPopulation = advancePopulation(state.population, state.city, 1 / 60)
  const nextEconomy = advanceEconomy(state.economy, state.city, nextPopulation, 1 / 60)
  const nextCity = advanceDevelopment(state.world, state.city, nextPopulation, nextEconomy, nextClock.currentTick)
  return {
    ...state,
    clock: nextClock,
    city: nextCity,
    population: nextPopulation,
    economy: nextEconomy,
  }
}
