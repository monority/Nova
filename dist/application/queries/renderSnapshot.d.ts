/**
 * Render snapshot projection (docs/14-rendering-architecture.md).
 *
 * canonical state -> projection -> renderer.
 * The snapshot is derived: it never mutates canonical state and never
 * becomes a second source of truth.
 */
import type { BuildingStatus, BuildingType } from '../../domain/building/building.js';
import type { SimulationState } from '../../domain/simulation/state.js';
export interface RenderBuilding {
    readonly id: string;
    readonly type: BuildingType;
    readonly x: number;
    readonly y: number;
    readonly status: BuildingStatus;
}
export interface RenderColonist {
    readonly id: string;
    readonly residenceId: string | null;
}
export interface RenderSnapshot {
    readonly tick: number;
    readonly world: {
        readonly width: number;
        readonly height: number;
    };
    readonly buildings: readonly RenderBuilding[];
    readonly colonists: readonly RenderColonist[];
}
export declare const toRenderSnapshot: (state: SimulationState) => RenderSnapshot;
