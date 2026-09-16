/**
 * World / grid layer.
 *
 * Terrain stays minimal per docs/05-world-and-terrain.md: only what a
 * simulation system consumes. Step 0 consumes only buildable bounds.
 */

export interface WorldConfig {
  readonly seed: string
  readonly width: number
  readonly height: number
}

export interface CellCoordinate {
  readonly x: number
  readonly y: number
}

export const isInBounds = (world: WorldConfig, cell: CellCoordinate): boolean =>
  cell.x >= 0 && cell.x < world.width && cell.y >= 0 && cell.y < world.height

/** Stable, order-independent key for a cell. Used for occupancy lookups. */
export const cellKey = (cell: CellCoordinate): string => `${cell.x},${cell.y}`
