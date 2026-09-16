/**
 * Simulation phases (docs/11-time-and-events.md).
 *
 * Phase order is part of the simulation contract. Step 0 order:
 *
 *   1. applyCommand       - player placement (validated, deterministic)
 *   2. advanceConstruction- construction progress -> operational
 *   3. updatePopulation   - colonist arrives iff housing capacity exists
 *   4. advanceTime        - tick += 1
 *
 * Every phase is a pure function: (state, ...) -> new state.
 * No phase mutates its input. No phase depends on rendering, UI,
 * wall-clock time or randomness.
 */
import { type BuildingState } from '../building/building.js';
import type { CellCoordinate } from '../world/grid.js';
import type { SimulationCommand } from './command.js';
import { type SimulationState } from './state.js';
/** A cell is occupied iff a building exists on it. */
export declare const isCellOccupied: (state: SimulationState, cell: CellCoordinate) => boolean;
export interface CommandApplicationResult {
    readonly state: SimulationState;
    readonly accepted: boolean;
    readonly reason: string | null;
}
/**
 * Valid placement: known type, inside bounds, free cell.
 * Invalid command = explicit no-op (same canonical state), never an error
 * thrown across the phase boundary.
 */
export declare const applyCommand: (state: SimulationState, command: SimulationCommand | undefined) => CommandApplicationResult;
/** progressConstruction is pure; remaining reaches 0 => operational. */
export declare const progressOneBuilding: (building: BuildingState) => BuildingState;
export declare const advanceConstruction: (state: SimulationState) => SimulationState;
/**
 * A colonist is created only when an operational residence without a
 * resident exists (docs/07: first colonist appears only when valid housing
 * capacity exists). Residences are consumed in ascending id order.
 */
export declare const updatePopulation: (state: SimulationState) => SimulationState;
/** Simulation time is canonical state, never wall-clock (docs/11). */
export declare const advanceTime: (state: SimulationState) => SimulationState;
