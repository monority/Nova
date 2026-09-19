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
 * Orthogonal grid adjacency for two road cells (Step 09D).
 * Manhattan distance exactly 1. Diagonal adjacency is NOT connected.
 */
export const areRoadsAdjacent = (
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number }
): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1

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

/**
 * Road network connectivity (Step 09D). A road network is a connected
 * component of operational road cells using orthogonal adjacency only.
 * Under-construction roads are excluded from the network.
 */

/**
 * Returns all road IDs in the same connected component as roadId, in
 * deterministic ascending-id order. Returns an empty array if roadId is
 * unknown or under-construction.
 */
export const getConnectedRoadIds = (
  state: SimulationState,
  roadId: string
): readonly string[] => {
  const road = state.roads[roadId]
  if (road === undefined || !isOperationalRoad(road)) {
    return []
  }

  // Multi-source BFS over operational roads only. Neighbors are discovered
  // in ascending road-id order, so results never depend on record insertion.
  const visited = new Set<string>([roadId])
  const queue = [roadId]
  const operational = [...iterateRoads(state)].filter(isOperationalRoad)
  const byId = new Map<string, RoadState>(
    operational.map((roadState) => [roadState.id, roadState])
  )

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const currentId = queue[cursor]!
    const current = byId.get(currentId)
    if (current === undefined) {
      continue
    }
    for (const candidate of operational) {
      if (!visited.has(candidate.id) && areRoadsAdjacent(current, candidate)) {
        visited.add(candidate.id)
        queue.push(candidate.id)
      }
    }
  }

  return [...visited].sort()
}

/**
 * Returns all road networks as an array of networks, where each network is an
 * array of road IDs in ascending-id order. Networks are ordered by their
 * lowest road ID. Returns an empty array when no operational roads exist.
 */
export const getRoadNetworks = (
  state: SimulationState
): readonly (readonly string[])[] => {
  const allOperational = [...iterateRoads(state)].filter(isOperationalRoad)
  const remaining = new Set(allOperational.map((road) => road.id))
  const networks: string[][] = []

  for (const road of allOperational) {
    if (!remaining.has(road.id)) {
      continue
    }
    const connected = getConnectedRoadIds(state, road.id)
    for (const id of connected) {
      remaining.delete(id)
    }
    networks.push([...connected])
  }

  return networks.sort((a: string[], b: string[]) => {
    if (a[0] === undefined || b[0] === undefined) {
      return 0
    }
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  })
}

/**
 * Number of disconnected road networks in canonical state.
 */
export const getRoadNetworkCount = (state: SimulationState): number =>
  getRoadNetworks(state).length

/**
 * Building road access (Step 09E). A building has road access when at least
 * one orthogonally adjacent cell contains an OPERATIONAL road, and the
 * building itself is operational. Access is a local spatial relation; the
 * reachable road networks are then derived from 09D connectivity (the
 * building never bridges two networks — it is not a road).
 *
 * Derived state only: nothing here is persisted or hashed.
 */

export interface BuildingRoadAccess {
  readonly buildingId: string
  /** Operational adjacent roads giving access, ascending id order. */
  readonly roadIds: readonly string[]
  /**
   * Road networks reachable through those roads (09D), identified by their
   * lowest road id (the getRoadNetworks component ordering convention),
   * deduplicated and sorted ascending. One network may be reached via
   * several roads; two distinct networks are never merged.
   */
  readonly networkIds: readonly string[]
  readonly hasRoadAccess: boolean
}

/**
 * Road access of one building. Pure and deterministic: same state, same
 * result, independent of record insertion order (iterateRoads and
 * getRoadNetworks are both ascending-id deterministic).
 *
 * Unknown building, under-construction building, or building with no
 * adjacent operational road: hasRoadAccess false, empty road/network lists.
 */
export const getBuildingRoadAccess = (
  state: SimulationState,
  buildingId: string
): BuildingRoadAccess => {
  const building = state.buildings[buildingId]
  if (building === undefined || building.status !== 'operational') {
    return { buildingId, roadIds: [], networkIds: [], hasRoadAccess: false }
  }
  const cell = { x: building.x, y: building.y }
  // iterateRoads yields ascending id order, so access roads are sorted by
  // construction; no secondary sort needed.
  const roadIds = [...iterateRoads(state)]
    .filter((road) => isOperationalRoad(road) && areRoadsAdjacent(cell, road))
    .map((road) => road.id)
  if (roadIds.length === 0) {
    return { buildingId, roadIds: [], networkIds: [], hasRoadAccess: false }
  }
  // Reuse 09D connectivity (no second graph): map each access road to its
  // network, identified by the network's lowest road id.
  const networkIdByRoad = new Map<string, string>()
  for (const network of getRoadNetworks(state)) {
    const networkId = network[0]
    if (networkId === undefined) {
      continue
    }
    for (const roadId of network) {
      networkIdByRoad.set(roadId, networkId)
    }
  }
  const networkIds = [
    ...new Set(
      roadIds
        .map((roadId) => networkIdByRoad.get(roadId))
        .filter((networkId): networkId is string => networkId !== undefined)
    ),
  ].sort()
  return { buildingId, roadIds, networkIds, hasRoadAccess: true }
}

