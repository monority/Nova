/**
 * Application command boundary (docs/30: commands change simulation state,
 * queries derive information). Thin, explicit orchestration; no God Service.
 */
import { stepSimulation } from '../../domain/simulation/step.js';
/**
 * Run one simulation tick with an optional player command.
 * The only sanctioned way for UI code to modify simulation state.
 */
export const dispatchCommand = (state, command) => stepSimulation(state, command);
//# sourceMappingURL=dispatch.js.map