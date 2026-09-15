import { createCityState, type CityState } from '../city'
import type { World } from '../world'
import { advanceClock, createSimulationClock, type SimulationClock } from './simulation-clock'
import { advancePopulation, createPopulationState, type PopulationState } from '../population'
import { advanceEconomy, createEconomyState, type EconomyState } from '../economy'

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
  return {
    ...state,
    clock: advanceClock(state.clock, 1),
    population: advancePopulation(state.population, state.city, 1 / 60),
    economy: advanceEconomy(state.economy, state.city, state.population, 1 / 60),
  }
}
