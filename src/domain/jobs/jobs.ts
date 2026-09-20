/**
 * Jobs / employment domain model (Step 07C, design contract Step 07B).
 *
 * The whole Jobs layer is deliberately concrete and minimal:
 *
 *   Residence -> Colonist -> Workshop -> Employment -> Construction Material
 *
 * - one concrete workplace exists: the Workshop (job capacity 1);
 * - a colonist holds at most one job (`ColonistState.workplaceId`);
 * - a Workshop employs at most one colonist;
 * - employment is canonical state, every aggregate below is derived.
 *
 * Deliberately absent (Step 07C §21, mobility gate Step 09K):
 * Job/Worker entities, EmploymentSystem, generic workplace or workforce
 * frameworks, a stored `labour` resource, skills, efficiency, priorities,
 * morale, distance, travel time, player-side employment control, recipes
 * and production chains. Employment eligibility requires residence–
 * workplace mobility connectivity (09K); everything about *how* a colonist
 * travels remains unmodeled.
 */

import type { BuildingStatus, BuildingType } from '../building/building.js'
import { iterateBuildings, iterateColonists } from '../housing/housing.js'
import type { ColonistState } from '../population/colonist.js'
import type { SimulationState } from '../simulation/state.js'

/** Jobs offered by one operational Workshop (Step 07C §3: capacity = 1). */
export const WORKSHOP_JOB_CAPACITY = 1

/**
 * The only building facts a workplace decision needs. Structural so that both
 * canonical `BuildingState` and the derived `BuildingInspection` qualify.
 */
export interface WorkplaceLike {
  readonly type: BuildingType
  readonly status: BuildingStatus
}

/** A workplace only offers jobs once operational (docs/06 lifecycle). */
export const isOperationalWorkshop = (building: WorkplaceLike): boolean =>
  building.type === 'workshop' && building.status === 'operational'

/** Jobs offered by one building: 1 for an operational Workshop, otherwise 0. */
export const jobCapacityOf = (building: WorkplaceLike): number =>
  isOperationalWorkshop(building) ? WORKSHOP_JOB_CAPACITY : 0

/** Total job capacity of the colony: operational Workshops × capacity. */
export const getJobCapacity = (state: SimulationState): number => {
  let capacity = 0
  for (const building of iterateBuildings(state)) {
    capacity += jobCapacityOf(building)
  }
  return capacity
}

/**
 * A colonist is employed iff `workplaceId` resolves to an operational
 * Workshop. Resolving the reference (rather than only testing for null) keeps
 * the invariant "non-operational Workshop => zero valid workers" true even
 * between `assignJobs` and `produceMaterial`.
 */
export const isEmployed = (
  state: SimulationState,
  colonist: ColonistState
): boolean => {
  const workplaceId = colonist.workplaceId
  if (workplaceId === null) {
    return false
  }
  const workplace = state.buildings[workplaceId]
  return workplace !== undefined && isOperationalWorkshop(workplace)
}

/** Employed colonists — the deterministic labor supply of this tick. */
export const countEmployedWorkers = (state: SimulationState): number => {
  let count = 0
  for (const colonist of iterateColonists(state)) {
    if (isEmployed(state, colonist)) {
      count += 1
    }
  }
  return count
}

/** Colonists working at one specific building (used by inspection/tests). */
export const countWorkersAt = (
  state: SimulationState,
  buildingId: string
): number => {
  let count = 0
  for (const colonist of iterateColonists(state)) {
    if (colonist.workplaceId === buildingId) {
      count += 1
    }
  }
  return count
}

export interface EmploymentSummary {
  readonly population: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly vacantJobs: number
}

/**
 * Derived employment shape for UI/E2E projections. Guaranteed by `assignJobs`:
 * employed <= population, employed <= jobCapacity, vacantJobs >= 0.
 */
export const getEmploymentSummary = (
  state: SimulationState
): EmploymentSummary => {
  const population = Object.keys(state.colonists).length
  const employed = countEmployedWorkers(state)
  const jobCapacity = getJobCapacity(state)
  return {
    population,
    employed,
    unemployed: population - employed,
    jobCapacity,
    vacantJobs: jobCapacity - employed,
  }
}