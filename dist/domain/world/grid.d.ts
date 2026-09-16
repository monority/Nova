/**
 * World / grid layer.
 *
 * Terrain stays minimal per docs/05-world-and-terrain.md: only what a
 * simulation system consumes. Step 0 consumes only buildable bounds.
 */
export interface WorldConfig {
    readonly seed: string;
    readonly width: number;
    readonly height: number;
}
export interface CellCoordinate {
    readonly x: number;
    readonly y: number;
}
export declare const isInBounds: (world: WorldConfig, cell: CellCoordinate) => boolean;
/** Stable, order-independent key for a cell. Used for occupancy lookups. */
export declare const cellKey: (cell: CellCoordinate) => string;
