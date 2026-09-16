/**
 * Canonical simulation state (docs/22-canonical-simulation.md).
 *
 * One authoritative state. Contains only what is needed to reproduce and
 * advance the world. No rendering, UI or platform data.
 *
 * Determinism rules:
 * - entity maps are Records; all iteration must be sorted (housing.ts);
 * - IDs come from canonical counters, never from randomness;
 * - simulation time is explicit, never wall-clock.
 */
import type { BuildingState, BuildingType } from '../building/building.js';
import type { ColonistState } from '../population/colonist.js';
import type { WorldConfig } from '../world/grid.js';
export interface SimulationTime {
    /** Current tick. Starts at 0, increments once per completed tick. */
    readonly tick: number;
}
interface EntityCounters {
    readonly nextBuildingId: number;
    readonly nextColonistId: number;
}
export interface SimulationState {
    readonly config: SimulationConfig;
    readonly time: SimulationTime;
    readonly buildings: Readonly<Record<string, BuildingState>>;
    readonly colonists: Readonly<Record<string, ColonistState>>;
    readonly counters: EntityCounters;
}
/**
 * Deterministic configuration required to reproduce behavior
 * (docs/30-architecture-foundation.md, canonical state contents).
 */
export interface SimulationConfig {
    readonly world: WorldConfig;
}
export declare const createInitialState: (config: SimulationConfig) => SimulationState;
export declare const makeBuildingId: (n: number) => string;
export declare const makeColonistId: (n: number) => string;
export declare const createBuilding: (state: SimulationState, type: BuildingType, x: number, y: number, constructionTicks: number) => {
    state: SimulationState;
    buildingId: string;
};
export declare const createColonist: (state: SimulationState, residenceId: string) => {
    state: SimulationState;
    colonistId: string;
};
export {};
