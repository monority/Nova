/**
 * Inspection queries (docs/00: every important outcome has an
 * understandable cause). Pure derivations over canonical state.
 */

import type { BuildingStatus, BuildingType } from '../../domain/building/building.js'
import { getBuildingDefinition } from '../../domain/building/building.js'
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

/**
 * Causal inspection for one building (Step 3). Pure derivation over
 * canonical state: nothing shown in the UI is computed anywhere else.
 * Construction duration and housing capacity come from the deterministic
 * building catalog; occupancy comes from colonist residence assignments.
 */
export interface BuildingInspection {
  readonly id: string
  readonly type: BuildingType
  readonly status: BuildingStatus
  readonly cell: { readonly x: number; readonly y: number }
  /** Ticks remaining before the building becomes operational. */
  readonly constructionRemaining: number
  /** Total construction ticks defined by the building catalog (Step 3 §3). */
  readonly constructionDuration: number
  /** Housing capacity once operational, from the domain catalog. */
  readonly housingCapacity: number
  /** Colonists whose residence is this building, derived from colonists. */
  readonly occupiedHousing: number
}

/** Inspection detail for one building, or null when the id is unknown. */
export const getBuildingInspection = (
  state: SimulationState,
  buildingId: string
): BuildingInspection | null => {
  const building = state.buildings[buildingId]
  if (building === undefined) {
    return null
  }
  const definition = getBuildingDefinition(building.type)
  let occupiedHousing = 0
  for (const colonist of iterateColonists(state)) {
    if (colonist.residenceId === building.id) {
      occupiedHousing += 1
    }
  }
  return {
    id: building.id,
    type: building.type,
    status: building.status,
    cell: { x: building.x, y: building.y },
    constructionRemaining: building.constructionRemaining,
    constructionDuration: definition.constructionTicks,
    housingCapacity: definition.housingCapacity,
    occupiedHousing,
  }
}

/**
 * Id of the building occupying a cell, or null when the cell is empty.
 * Used by picking: the renderer keeps returning cells, the application
 * decides the domain meaning of the cell.
 */
export const getBuildingIdAtCell = (
  state: SimulationState,
  cell: { readonly x: number; readonly y: number }
): string | null => {
  for (const building of iterateBuildings(state)) {
    if (building.x === cell.x && building.y === cell.y) {
      return building.id
    }
  }
  return null
}
