/**
 * Simulation entry point.
 *
 *   stepSimulation(state, command?) -> new SimulationState
 *
 * Pure: never mutates `state`, always produces a new canonical state.
 * Deterministic: same input state + same command => same output state,
 * regardless of environment, frame rate or execution moment (docs/31).
 */
import { advanceConstruction, advanceTime, applyCommand, updatePopulation, } from './phases.js';
export const stepSimulation = (state, command) => {
    // Phase 1: apply player command.
    const applied = applyCommand(state, command);
    // Phase 2: construction / lifecycle.
    const constructed = advanceConstruction(applied.state);
    // Phase 3: population / housing admission.
    const populated = updatePopulation(constructed);
    // Phase 4: advance simulation time.
    return advanceTime(populated);
};
//# sourceMappingURL=step.js.map