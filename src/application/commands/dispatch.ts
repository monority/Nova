/**
 * Application command boundary (docs/30: commands change simulation state,
 * queries derive information). Thin, explicit orchestration; no God Service.
 */

import type { SimulationCommand } from '../../domain/simulation/command.js'
import { stepSimulation } from '../../domain/simulation/step.js'
import type { SimulationState } from '../../domain/simulation/state.js'

/**
 * Run one simulation tick with an optional player command.
 * The only sanctioned way for UI code to modify simulation state.
 */
export const dispatchCommand = (
  state: SimulationState,
  command?: SimulationCommand
): SimulationState => stepSimulation(state, command)
