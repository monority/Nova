/**
 * Coordinate conversion boundary (Step 1 #5).
 *
 * One explicit, pure, tested mapping between simulation cells and Three.js
 * world positions. The renderer must never invent its own mapping.
 *
 * Cell (0,0) is the top-left simulation cell; the grid is centered on the
 * world origin so camera/scenes stay stable across world sizes.
 */

export interface GridDimensions {
  readonly width: number
  readonly height: number
}

export interface CellCoordinate {
  readonly x: number
  readonly y: number
}

/** Simulation cell -> world position on the ground plane (y = 0). */
export const simulationCellToWorldPosition = (
  cell: CellCoordinate,
  grid: GridDimensions
): { readonly x: number; readonly z: number } => ({
  x: cell.x - (grid.width - 1) / 2,
  z: cell.y - (grid.height - 1) / 2,
})

/** World position on the ground plane -> simulation cell. Inverse mapping. */
export const worldPositionToSimulationCell = (
  worldX: number,
  worldZ: number,
  grid: GridDimensions
): CellCoordinate => ({
  x: Math.round(worldX + (grid.width - 1) / 2),
  y: Math.round(worldZ + (grid.height - 1) / 2),
})

export const isInGrid = (cell: CellCoordinate, grid: GridDimensions): boolean =>
  cell.x >= 0 &&
  cell.x < grid.width &&
  cell.y >= 0 &&
  cell.y < grid.height
