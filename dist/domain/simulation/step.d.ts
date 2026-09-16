/**
 * Simulation entry point.
 *
 *   stepSimulation(state, command?) -> new SimulationState
 *
 * Pure: never mutates `state`, always produces a new canonical state.
 * Deterministic: same input state + same command => same output state,
 * regardless of environment, frame rate or execution moment (docs/31).
 */
import type { SimulationCommand } from './command.js';
import type { SimulationState } from './state.js';
export declare const stepSimulation: (state: SimulationState, command?: SimulationCommand) => SimulationState;
