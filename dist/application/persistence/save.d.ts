/**
 * Persistence over canonical state (docs/17, docs/18).
 *
 * - Saves represent canonical simulation state, never renderer state.
 * - Explicit format version from the first save implementation.
 * - Unknown/unsupported versions are rejected, never silently migrated.
 */
import type { SimulationState } from '../../domain/simulation/state.js';
export declare const SAVE_FORMAT = "nova-save";
export declare const SAVE_VERSION = 1;
export interface SaveFile {
    readonly format: typeof SAVE_FORMAT;
    readonly version: number;
    readonly state: SimulationState;
}
export declare const serializeSave: (state: SimulationState) => string;
export declare class SaveValidationError extends Error {
}
/** Restore canonical state from serialized content. Rejects anything not matching SAVE_VERSION. */
export declare const loadSave: (raw: string) => SimulationState;
/** Minimal canonical-shape validation. Full behavioral validation lives in tests. */
export declare const validateStateShape: (raw: Record<string, unknown>) => SimulationState;
