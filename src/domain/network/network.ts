/**
 * Transport network connectivity (Step 09A).
 *
 * Minimal domain concept answering one question: is an existing settlement
 * entity connected to the settlement's accessible network?
 *
 * The network is an abstract spatial connectivity layer only. No roads, no
 * vehicles, no movement, no logistics (Step 09A §9/§10/§11).
 *
 * Rules (Step 09A §3/§4/§5/§6/§8):
 * - only operational buildings participate; under-construction buildings are
 *   neither accessible nor bridge connectivity;
 * - operational Residences are network roots (multi-source; no main residence);
 * - two buildings are linked iff orthogonally adjacent on the integer grid
 *   (|dx| + |dy| === 1); diagonal corner-touching is NOT connected;
 * - a building is accessible iff it shares a connected component with at
 *   least one operational Residence (roots are accessible themselves).
 *
 * Determinism (Step 09A §12): pure derivation over canonical state. Neighbor
 * expansion follows the repository's existing stable building ordering
 * (ascending building id, housing.ts). No randomness, no wall-clock, no
 * dependence on record insertion order.
 *
 * Derived state only (Step 09A §13): nothing here is persisted, hashed, or
 * stored. SAVE_VERSION unchanged.
 */

import { isOperationalResidence, iterateBuildings } from '../housing/housing.js'
import type { SimulationState } from '../simulation/state.js'

/**
 * Orthogonal grid adjacency (Step 09A §3). Two occupied cells are adjacent
 * when their Manhattan distance is exactly 1. Works for any integer
 * coordinates, including negatives; no coordinate limits are introduced.
 */
export const areOrthogonallyAdjacent = (
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number }
): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1

/**
 * Ids of accessible buildings in deterministic ascending building-id order
 * (Step 09A §14: the repository's existing stable building ordering).
 * Empty when there is no operational Residence (Step 09A §6).
 */
export const getAccessibleBuildingIds = (
  state: SimulationState
): readonly string[] => {
  // Operational buildings only, ascending id order (iterateBuildings).
  const operational = [...iterateBuildings(state)].filter(
    (b) => b.status === 'operational'
  )
  const roots = operational.filter(isOperationalResidence)
  if (roots.length === 0) {
    return []
  }
  // Multi-source BFS. Neighbors expand in ascending building-id order, so
  // the result depends only on canonical state, never on insertion order.
  const accessible = new Set<string>()
  const queue: string[] = []
  for (const root of roots) {
    accessible.add(root.id)
    queue.push(root.id)
  }
  const byId = new Map(operational.map((b) => [b.id, b]))
  while (queue.length > 0) {
    const currentId = queue.shift() as string
    const current = byId.get(currentId)
    if (current === undefined) {
      continue
    }
    for (const candidate of operational) {
      if (
        !accessible.has(candidate.id) &&
        areOrthogonallyAdjacent(current, candidate)
      ) {
        accessible.add(candidate.id)
        queue.push(candidate.id)
      }
    }
  }
  return [...accessible].sort()
}

/** True iff the building is operational and shares a component with a root. */
export const isBuildingAccessible = (
  state: SimulationState,
  buildingId: string
): boolean => {
  const building = state.buildings[buildingId]
  if (building === undefined || building.status !== 'operational') {
    return false
  }
  return getAccessibleBuildingIds(state).includes(buildingId)
}
