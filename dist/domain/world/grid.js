/**
 * World / grid layer.
 *
 * Terrain stays minimal per docs/05-world-and-terrain.md: only what a
 * simulation system consumes. Step 0 consumes only buildable bounds.
 */
export const isInBounds = (world, cell) => cell.x >= 0 && cell.x < world.width && cell.y >= 0 && cell.y < world.height;
/** Stable, order-independent key for a cell. Used for occupancy lookups. */
export const cellKey = (cell) => `${cell.x},${cell.y}`;
//# sourceMappingURL=grid.js.map