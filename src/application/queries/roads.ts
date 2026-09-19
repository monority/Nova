/**
 * Road queries (Step 09C Phase I + Step 09D). Pure derivations over
 * canonical state.
 *
 * Counts, lookup, occupancy, and derived road network connectivity.
 * Network state is derived only, never persisted. See Step 09D.
 */

import {
  getConnectedRoadIds as domainGetConnectedRoadIds,
  getRoadIdAtCell,
  getRoadNetworkCount as domainGetRoadNetworkCount,
  getRoadNetworks as domainGetRoadNetworks,
  isOperationalRoad,
  iterateRoads,
} from '../../domain/road/road.js'
import type { SimulationState } from '../../domain/simulation/state.js'

/** Total roads in canonical state, any status. */
export const getRoadCount = (state: SimulationState): number =>
  Object.keys(state.roads).length

/** Operational roads only. */
export const getOperationalRoadCount = (state: SimulationState): number => {
  let count = 0
  for (const road of iterateRoads(state)) {
    if (isOperationalRoad(road)) {
      count += 1
    }
  }
  return count
}

/** Road ids in deterministic ascending-id order. */
export const getRoadIds = (state: SimulationState): readonly string[] =>
  [...iterateRoads(state)].map((road) => road.id)

/** Id of the road occupying a cell, or null when the cell has no road. */
export const getRoadIdAt = (
  state: SimulationState,
  cell: { readonly x: number; readonly y: number }
): string | null => getRoadIdAtCell(state, cell)

/** True iff the cell holds a road (any status). */
export const isRoadAt = (
  state: SimulationState,
  cell: { readonly x: number; readonly y: number }
): boolean => getRoadIdAtCell(state, cell) !== null

/**
 * Road network queries (Step 09D). Pure derivations over canonical state.
 * Network state is derived only — never persisted, never hashed.
 */

/**
 * Number of disconnected road networks in canonical state.
 * Operational roads only; under-construction roads excluded.
 */
export const getRoadNetworkCount = (state: SimulationState): number =>
  domainGetRoadNetworkCount(state)

/**
 * All road networks as an array of arrays of road IDs in ascending-id order.
 * Networks ordered by their lowest road ID. Empty when no operational roads.
 */
export const getRoadNetworks = (
  state: SimulationState
): readonly (readonly string[])[] => domainGetRoadNetworks(state)

/**
 * Road IDs in the same connected component as roadId, in ascending-id order.
 * Empty when roadId is unknown or under-construction.
 */
export const getConnectedRoadIds = (
  state: SimulationState,
  roadId: string
): readonly string[] => domainGetConnectedRoadIds(state, roadId)
