/**
 * Road queries (Step 09C Phase I). Pure derivations over canonical state.
 *
 * Only what the application/UI/tests need: counts, lookup, occupancy.
 * No derived transport-network semantics here — no reachable roads, no
 * routes, no accessibility, no traffic. Those belong to later steps.
 */

import { getRoadIdAtCell, isOperationalRoad, iterateRoads } from '../../domain/road/road.js'
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
