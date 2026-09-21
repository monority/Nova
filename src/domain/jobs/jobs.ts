/**
 * Jobs / employment domain model (Step 07C, design contract Step 07B,
 * Farm workplaces Step 10E).
 *
 * The whole Jobs layer is deliberately concrete and minimal:
 *
 *   Residence -> Colonist -> Farm/Workshop -> Employment -> Food/Material
 *
 * - two concrete workplaces exist: the Farm and the Workshop (capacity 1 each);
 * - a colonist holds at most one job (`ColonistState.workplaceId`);
 * - a Farm or Workshop employs at most one colonist;
 * - employment is canonical state, every aggregate below is derived.
 *
 * Deliberately absent (Step 07C §21, mobility gate Step 09K, spatial
 * preference Step 09M, Farm workplaces Step 10E): Job/Worker entities,
 * EmploymentSystem, generic workplace or workforce frameworks, a stored
 * `labour` resource, skills, efficiency, priorities, morale, travel time,
 * commute cost, player-side employment control, recipes and production
 * chains. Employment eligibility requires residence–workplace mobility
 * connectivity (09K), and the CHOICE among eligible workplaces follows the
 * shortest operational road distance (09M); everything about *how* a
 * colonist travels remains unmodeled. Step 10E adds NO type priority:
 * Farms and Workshops compete in one pool, distance-then-id decides.
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

/** Jobs offered by one operational Farm (Step 10E: capacity = 1, like Workshops). */
export const FARM_JOB_CAPACITY = 1

/** An operational Farm offers jobs (Step 10E). Same lifecycle rule as Workshops. */
export const isOperationalFarm = (building: WorkplaceLike): boolean =>
  building.type === 'farm' && building.status === 'operational'

/**
 * An operational Well offers jobs (Step 10P). Same lifecycle rule as every
 * other workplace; it is a concrete type, not a generic producer.
 */
export const isOperationalWell = (building: WorkplaceLike): boolean =>
  building.type === 'well' && building.status === 'operational'

/** A building offers jobs once operational: Farm, Workshop or Well (Step 10P). */
export const isOperationalWorkplace = (building: WorkplaceLike): boolean =>
  isOperationalWorkshop(building) ||
  isOperationalFarm(building) ||
  isOperationalWell(building)

/** A workplace only offers jobs once operational (docs/06 lifecycle). */
export const isOperationalWorkshop = (building: WorkplaceLike): boolean =>
  building.type === 'workshop' && building.status === 'operational'

/** Jobs offered by one building: 1 for an operational Farm or Workshop, else 0. */
export const jobCapacityOf = (building: WorkplaceLike): number =>
  isOperationalWorkplace(building) ? WORKSHOP_JOB_CAPACITY : 0

/** Total job capacity of the colony: operational Farms + Workshops × capacity. */
export const getJobCapacity = (state: SimulationState): number => {
  let capacity = 0
  for (const building of iterateBuildings(state)) {
    capacity += jobCapacityOf(building)
  }
  return capacity
}

/**
 * A colonist is employed iff `workplaceId` resolves to an operational Farm
 * or Workshop (Step 10E: Farms joined the workplace pool). Resolving the
 * reference keeps "non-operational workplace => zero valid workers" true.
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
  return workplace !== undefined && isOperationalWorkplace(workplace)
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