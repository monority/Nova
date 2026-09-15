import { createCityState, type CityState } from '../city'
import type { World } from '../world'
import { advanceClock, createSimulationClock, type SimulationClock } from './simulation-clock'

export interface SimulationState {
  readonly world: World
  readonly city: CityState
  readonly clock: SimulationClock
}

export function createSimulationState(world: World): SimulationState {
  return {
    world,
    city: createCityState(),
    clock: createSimulationClock(),
  }
}

export function advanceSimulationTick(state: SimulationState): SimulationState {
  return {
    ...state,
    clock: advanceClock(state.clock, 1),
  }
}
