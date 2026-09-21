/**
 * Inspection queries (docs/00: every important outcome has an
 * understandable cause). Pure derivations over canonical state.
 */

import type { BuildingStatus, BuildingType } from '../../domain/building/building.js'
import { getBuildingDefinition } from '../../domain/building/building.js'
import type { HousingSummary } from '../../domain/housing/housing.js'
import { getHousingSummary, iterateBuildings, iterateColonists } from '../../domain/housing/housing.js'
import { countWorkersAt, jobCapacityOf } from '../../domain/jobs/jobs.js'
import type { WorkplaceAssignmentMode } from '../../domain/population/colonist.js'
import {
  getConstructionCrewId,
  validateConstructionCrew,
  validateReassignment,
  type ConstructionCrewReason,
  type ReassignmentReason,
} from '../../domain/simulation/phases.js'
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
  /**
   * The colonist crewing this building (Step 10Y), or null. Derived from
   * colonist state in ascending id order; never persisted.
   */
  readonly constructionCrewId: string | null
  /**
   * Construction progress this site receives per tick: 1, plus 1 when crewed
   * (Step 10Y §2). Derived, deterministic, never persisted.
   */
  readonly constructionProgressPerTick: number
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
    constructionCrewId: getConstructionCrewId(state, building.id),
    constructionProgressPerTick:
      building.status === 'underConstruction' &&
      getConstructionCrewId(state, building.id) !== null
        ? 2
        : 1,
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

// ---------------------------------------------------------------------------
// Manual workforce reassignment queries (Step 10M)
// ---------------------------------------------------------------------------

/** Player-facing view of one colonist's employment (Step 10M). */
export interface ColonistInspection {
  readonly id: string
  readonly residenceId: string | null
  readonly workplaceId: string | null
  readonly workplaceAssignmentMode: WorkplaceAssignmentMode
  /** Under-construction building this colonist crews, or null (Step 10Y). */
  readonly constructionAssignmentId: string | null
}

export const getColonistInspection = (
  state: SimulationState,
  colonistId: string
): ColonistInspection | null => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) {
    return null
  }
  return {
    id: colonist.id,
    residenceId: colonist.residenceId,
    workplaceId: colonist.workplaceId,
    workplaceAssignmentMode: colonist.workplaceAssignmentMode,
    constructionAssignmentId: colonist.constructionAssignmentId,
  }
}

/**
 * One possible reassignment target for a colonist. `eligible` is the exact
 * domain validation result (never re-derived in the UI); `reason` carries the
 * deterministic rejection cause for invalid targets; `isCurrent` marks the
 * colonist's present workplace (a deterministic no-op if re-selected).
 */
export interface ReassignmentOption {
  readonly workplaceId: string
  readonly type: BuildingType
  readonly status: BuildingStatus
  readonly distance: number | null
  readonly workers: number
  readonly capacity: number
  readonly eligible: boolean
  readonly reason: ReassignmentReason | null
  readonly isCurrent: boolean
}

/**
 * All Farm/Workshop targets for one colonist, in ascending building-id order.
 * `validateReassignment` is the single source of truth for eligibility, so the
 * UI never duplicates mobility, capacity or operational rules.
 */
export const getReassignmentOptions = (
  state: SimulationState,
  colonistId: string
): readonly ReassignmentOption[] => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) {
    return []
  }
  const options: ReassignmentOption[] = []
  for (const building of iterateBuildings(state)) {
    if (building.type !== 'farm' && building.type !== 'workshop') {
      continue
    }
    const validation = validateReassignment(state, colonistId, building.id)
    const isCurrent = colonist.workplaceId === building.id
    options.push({
      workplaceId: building.id,
      type: building.type,
      status: building.status,
      distance: validation.valid ? validation.distance : null,
      workers: countWorkersAt(state, building.id),
      capacity: jobCapacityOf(building),
      eligible: validation.valid && !isCurrent,
      reason: validation.valid ? null : validation.reason,
      isCurrent,
    })
  }
  return options
}

// ---------------------------------------------------------------------------
// Construction crew queries (Step 10Y)
// ---------------------------------------------------------------------------

/** Player-facing view of one colonist as a potential construction crew member. */
export interface ConstructionCrewOption {
  readonly colonistId: string
  /** True when this colonist may be assigned to the inspected site right now. */
  readonly eligible: boolean
  /** Deterministic rejection cause when not eligible. */
  readonly reason: ConstructionCrewReason | null
  /** True when this colonist already crews the inspected site. */
  readonly isCurrent: boolean
  /** The colonist's workplace (cleared by a successful crew assignment). */
  readonly workplaceId: string | null
  /** The site this colonist crews, when it is a different one. */
  readonly constructionAssignmentId: string | null
}

/**
 * All colonists as candidate crew for one under-construction building, in
 * ascending colonist-id order. `validateConstructionCrew` is the single
 * source of truth for eligibility, so the UI never re-derives the one-crew /
 * one-site invariants. Returns an empty list for an operational building.
 */
export const getConstructionCrewOptions = (
  state: SimulationState,
  buildingId: string
): readonly ConstructionCrewOption[] => {
  const building = state.buildings[buildingId]
  if (building === undefined || building.status !== 'underConstruction') {
    return []
  }
  const options: ConstructionCrewOption[] = []
  for (const colonist of iterateColonists(state)) {
    const validation = validateConstructionCrew(state, colonist.id, buildingId)
    const isCurrent = colonist.constructionAssignmentId === buildingId
    options.push({
      colonistId: colonist.id,
      eligible: validation.valid && !isCurrent,
      reason: validation.valid ? null : validation.reason,
      isCurrent,
      workplaceId: colonist.workplaceId,
      constructionAssignmentId: colonist.constructionAssignmentId,
    })
  }
  return options
}
