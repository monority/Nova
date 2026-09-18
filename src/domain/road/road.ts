/**
 * Mobility infrastructure domain model (Step 09C).
 *
 * Implements the Step 09B contract (§3-§5): a road is a concrete domain
 * concept, independent from BuildingState — never a BuildingType, so
 * housing/jobs/food/upkeep/storage selectors never match a road.
 *
 * One road piece occupies exactly one integer grid cell (same
 * CellCoordinate primitive as buildings; no second coordinate system).
 * Orientation is derived from the neighbour mask when needed and is never
 * persisted. No tiers, no demolition, no network semantics here.
 */

import { cellKey, type CellCoordinate } from '../world/grid.js'
import type { SimulationState } from '../simulation/state.js'

export type RoadStatus = 'underConstruction' | 'operational'

export interface RoadState {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly status: RoadStatus
  /** Ticks remaining before the road becomes operational. */
  readonly constructionRemaining: number
}

/**
 * Construction duration. Same 2-tick timing semantics as every building
 * catalog entry (placement tick 2 -> 1 via the phase-8a catch-up, next tick
 * 1 -> 0 operational). Reuses the existing lifecycle, no second system.
 */
export const ROAD_CONSTRUCTION_TICKS = 2

/**
 * Explicit domain cost rule (Step 09C Phase E). Smallest reasonable initial
 * value on the existing Material scale: one building (25) equals one
 * five-cell road. No upkeep, no storage interaction, no money.
 */
export const ROAD_CONSTRUCTION_COST = 5

export const isOperationalRoad = (road: RoadState): boolean =>
  road.status === 'operational'

/**
 * Deterministic ascending-id iteration, mirroring iterateBuildings
 * (housing.ts). Record key order never affects results.
 */
export function* iterateRoads(state: SimulationState): IterableIterator<RoadState> {
  for (const id of Object.keys(state.roads).sort()) {
    const road = state.roads[id]
    if (road !== undefined) {
      yield road
    }
  }
}

/** True iff a road occupies the cell (any status blocks, like buildings). */
export const isRoadOccupied = (
  state: SimulationState,
  cell: CellCoordinate
): boolean => {
  for (const road of iterateRoads(state)) {
    if (road.x === cell.x && road.y === cell.y) {
      return true
    }
  }
  return false
}

/** Id of the road occupying a cell, or null when the cell has no road. */
export const getRoadIdAtCell = (
  state: SimulationState,
  cell: CellCoordinate
): string | null => {
  for (const road of iterateRoads(state)) {
    if (road.x === cell.x && road.y === cell.y) {
      return road.id
    }
  }
  return null
}

/**
 * Normalize a requested cell list into deterministic order: deduplicate by
 * cellKey, then sort by (x, y). Road IDs are allocated in this order, so the
 * authoritative result never depends on drag direction or input order.
 */
export const normalizeRoadCells = (
  cells: readonly CellCoordinate[]
): CellCoordinate[] => {
  const seen = new Set<string>()
  const unique: CellCoordinate[] = []
  for (const cell of cells) {
    const key = cellKey(cell)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push({ x: cell.x, y: cell.y })
    }
  }
  unique.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  return unique
}

/**
 * Drag expansion (Step 09C Phase F). Horizontal or vertical drags only:
 * same cell -> one cell; shared x -> vertical inclusive range; shared y ->
 * horizontal inclusive range. Anything else (diagonal / L-shape) returns
 * null: arbitrary diagonal roads are explicitly deferred, and the caller
 * treats null as an invalid drag rather than inventing geometry.
 *
 * The returned list is always in deterministic ascending order, independent
 * of drag direction (A -> B equals B -> A).
 */
export const expandRoadDrag = (
  start: CellCoordinate,
  end: CellCoordinate
): CellCoordinate[] | null => {
  if (start.x === end.x && start.y === end.y) {
    return [{ x: start.x, y: start.y }]
  }
  if (start.x === end.x) {
    const low = Math.min(start.y, end.y)
    const high = Math.max(start.y, end.y)
    const cells: CellCoordinate[] = []
    for (let y = low; y <= high; y += 1) {
      cells.push({ x: start.x, y })
    }
    return cells
  }
  if (start.y === end.y) {
    const low = Math.min(start.x, end.x)
    const high = Math.max(start.x, end.x)
    const cells: CellCoordinate[] = []
    for (let x = low; x <= high; x += 1) {
      cells.push({ x, y: start.y })
    }
    return cells
  }
  return null
}
