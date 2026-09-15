import type { SimulationState } from '../../domain/simulation/simulation-state'
import { advanceSimulationTick } from '../../domain/simulation/simulation-state'

export interface SimulationStepper {
  step(state: SimulationState): SimulationState
}

export const deterministicSimulationStepper: SimulationStepper = {
  step: advanceSimulationTick,
}
