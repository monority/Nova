/**
 * Inspection queries (docs/00: every important outcome has an
 * understandable cause). Pure derivations over canonical state.
 */

import type { HousingSummary } from '../../domain/housing/housing.js'
import { getHousingSummary, iterateBuildings, iterateColonists } from '../../domain/housing/housing.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export interface InspectionSummary {
  readonly tick: number
  readonly buildingCount: number
  readonly operationalResidenceCount: number
  readonly colonistCount: number
  readonly housing: HousingSummary
}

export const getInspectionSummary = (
  state: SimulationState
): InspectionSummary => {
  let operationalResidenceCount = 0
  for (const building of iterateBuildings(state)) {
    if (building.type === 'residence' && building.status === 'operational') {
      operationalResidenceCount += 1
    }
  }
  let colonistCount = 0
  for (const colonist of iterateColonists(state)) {
    if (colonist !== undefined) {
      colonistCount += 1
    }
  }
  return {
    tick: state.time.tick,
    buildingCount: Object.keys(state.buildings).length,
    operationalResidenceCount,
    colonistCount,
    housing: getHousingSummary(state),
  }
}

/** Inspection detail for one building, or null when the id is unknown. */
export const getBuildingInspection = (
  state: SimulationState,
  buildingId: string
):
  | {
      readonly id: string
      readonly type: string
      readonly status: string
      readonly constructionRemaining: number
    }
  | null => {
  const building = state.buildings[buildingId]
  if (building === undefined) {
    return null
  }
  return {
    id: building.id,
    type: building.type,
    status: building.status,
    constructionRemaining: building.constructionRemaining,
  }
}
