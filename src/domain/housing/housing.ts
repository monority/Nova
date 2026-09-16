/**
 * Housing queries (pure derivations, docs/30-architecture-foundation.md).
 *
 * Housing capacity exists only for operational residences (docs/06).
 * Occupancy is derived from colonist residence assignments: the colonist
 * record is the single source of truth for the residence relationship.
 */

import type { BuildingState } from '../building/building.js'
import type { ColonistState } from '../population/colonist.js'
import type { SimulationState } from '../simulation/state.js'

export interface HousingSummary {
  readonly totalCapacity: number
  readonly occupiedCapacity: number
  readonly availableCapacity: number
}

export const isOperationalResidence = (building: BuildingState): boolean =>
  building.type === 'residence' && building.status === 'operational'

export const getHousingSummary = (state: SimulationState): HousingSummary => {
  let totalCapacity = 0
  for (const building of iterateBuildings(state)) {
    if (isOperationalResidence(building)) {
      totalCapacity += 1
    }
  }

  let occupiedCapacity = 0
  for (const colonist of iterateColonists(state)) {
    if (colonist.residenceId !== null) {
      occupiedCapacity += 1
    }
  }

  return {
    totalCapacity,
    occupiedCapacity,
    availableCapacity: totalCapacity - occupiedCapacity,
  }
}

/**
 * Deterministic tie-break (docs/31): operational residences without a
 * resident are returned in ascending building-id order.
 */
export const availableResidenceIds = (state: SimulationState): string[] => {
  const occupied = new Set<string>()
  for (const colonist of iterateColonists(state)) {
    if (colonist.residenceId !== null) {
      occupied.add(colonist.residenceId)
    }
  }
  return [...iterateBuildings(state)]
    .filter((b) => isOperationalResidence(b) && !occupied.has(b.id))
    .map((b) => b.id)
}

export function* iterateBuildings(
  state: SimulationState
): IterableIterator<BuildingState> {
  // Explicit sorted iteration: record key order never affects results.
  for (const id of Object.keys(state.buildings).sort()) {
    const building = state.buildings[id]
    if (building !== undefined) {
      yield building
    }
  }
}

export function* iterateColonists(
  state: SimulationState
): IterableIterator<ColonistState> {
  for (const id of Object.keys(state.colonists).sort()) {
    const colonist = state.colonists[id]
    if (colonist !== undefined) {
      yield colonist
    }
  }
}
