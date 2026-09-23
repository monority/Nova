/**
 * World / grid layer.
 *
 * Terrain stays minimal per docs/05-world-and-terrain.md: only what a
 * simulation system consumes. Step 0 consumes only buildable bounds.
 *
 * Step 10AV: the ONLY terrain concept is `blocked` — a cell that can never
 * hold a building or a road. It is spatial input, never an economic system:
 * no productivity, no cost multiplier, no bonus, no resource. Two states
 * exist (buildable, blocked) and nothing else.
 */

export interface WorldConfig {
  readonly seed: string
  readonly width: number
  readonly height: number
  /**
   * Step 10AV: blocked cells as canonical `"x,y"` keys, deduplicated and
   * sorted numerically by (x, y). ABSENT (or empty) means no terrain: an
   * empty list must never be stored, so a terrain-free world keeps exactly
   * its historical canonical form and hash.
   */
  readonly blockedCells?: readonly string[]
}

export interface CellCoordinate {
  readonly x: number
  readonly y: number
}

export const isInBounds = (world: WorldConfig, cell: CellCoordinate): boolean =>
  cell.x >= 0 && cell.x < world.width && cell.y >= 0 && cell.y < world.height

/** Stable, order-independent key for a cell. Used for occupancy lookups. */
export const cellKey = (cell: CellCoordinate): string => `${cell.x},${cell.y}`

/**
 * A canonical blocked-cell key is exactly `"<non-negative int>,<int>"`. Any
 * other spelling (whitespace, sign, empty, non-numeric) is malformed and is
 * rejected rather than silently interpreted.
 */
const BLOCKED_CELL_KEY = /^[0-9]+,[0-9]+$/

/** Parse one canonical blocked-cell key. Throws on a malformed key. */
export const parseBlockedCell = (key: string): CellCoordinate => {
  if (!BLOCKED_CELL_KEY.test(key)) {
    throw new Error(`Malformed blocked cell: ${key}`)
  }
  const [x, y] = key.split(',')
  return { x: Number(x), y: Number(y) }
}

const compareBlockedCellKeys = (a: string, b: string): number => {
  const cellA = parseBlockedCell(a)
  const cellB = parseBlockedCell(b)
  return cellA.x === cellB.x ? cellA.y - cellB.y : cellA.x - cellB.x
}

/**
 * Canonical blocked-cell list: every key validated, duplicates removed, then
 * sorted numerically by (x, y). Insertion order therefore never matters —
 * two scenarios authoring the same cells in different orders produce the
 * same array, the same canonical JSON and the same hash.
 */
export const normalizeBlockedCells = (keys: readonly string[]): string[] => {
  const unique = new Set<string>()
  for (const key of keys) {
    parseBlockedCell(key)
    unique.add(key)
  }
  return [...unique].sort(compareBlockedCellKeys)
}

/**
 * True iff the cell is blocked by terrain. The ONLY read of terrain in the
 * simulation: placement validators call it, nothing else does. An absent (or
 * empty) list means every cell is buildable.
 */
export const isTerrainBlocked = (
  world: WorldConfig,
  cell: CellCoordinate
): boolean => {
  const blocked = world.blockedCells
  if (blocked === undefined || blocked.length === 0) {
    return false
  }
  return blocked.includes(cellKey(cell))
}

/** Blocked cells as coordinates, in the canonical order of the list. */
export const listBlockedCells = (
  world: WorldConfig
): readonly CellCoordinate[] => (world.blockedCells ?? []).map(parseBlockedCell)
