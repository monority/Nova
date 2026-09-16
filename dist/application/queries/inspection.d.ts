/**
 * Inspection queries (docs/00: every important outcome has an
 * understandable cause). Pure derivations over canonical state.
 */
import type { HousingSummary } from '../../domain/housing/housing.js';
import type { SimulationState } from '../../domain/simulation/state.js';
export interface InspectionSummary {
    readonly tick: number;
    readonly buildingCount: number;
    readonly operationalResidenceCount: number;
    readonly colonistCount: number;
    readonly housing: HousingSummary;
}
export declare const getInspectionSummary: (state: SimulationState) => InspectionSummary;
/** Inspection detail for one building, or null when the id is unknown. */
export declare const getBuildingInspection: (state: SimulationState, buildingId: string) => {
    readonly id: string;
    readonly type: string;
    readonly status: string;
    readonly constructionRemaining: number;
} | null;
