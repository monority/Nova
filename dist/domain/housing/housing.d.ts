/**
 * Housing queries (pure derivations, docs/30-architecture-foundation.md).
 *
 * Housing capacity exists only for operational residences (docs/06).
 * Occupancy is derived from colonist residence assignments: the colonist
 * record is the single source of truth for the residence relationship.
 */
import type { BuildingState } from '../building/building.js';
import type { ColonistState } from '../population/colonist.js';
import type { SimulationState } from '../simulation/state.js';
export interface HousingSummary {
    readonly totalCapacity: number;
    readonly occupiedCapacity: number;
    readonly availableCapacity: number;
}
export declare const isOperationalResidence: (building: BuildingState) => boolean;
export declare const getHousingSummary: (state: SimulationState) => HousingSummary;
/**
 * Deterministic tie-break (docs/31): operational residences without a
 * resident are returned in ascending building-id order.
 */
export declare const availableResidenceIds: (state: SimulationState) => string[];
export declare function iterateBuildings(state: SimulationState): IterableIterator<BuildingState>;
export declare function iterateColonists(state: SimulationState): IterableIterator<ColonistState>;
