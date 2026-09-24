/**
 * Scenario objective queries (Step 10AN).
 *
 * DERIVED ONLY. An objective is a small declarative spec evaluated against
 * canonical state; nothing is stored, persisted or hashed, and SAVE_VERSION
 * stays 7. This is deliberately not a quest framework: five requirement kinds
 * cover every scenario, and each one maps to an existing authoritative query.
 *
 * Semantics (Step 10AN §5, deliberately a closed set of three states):
 *
 *   completed   - every requirement is met in the CURRENT state
 *   failed       - the colony is dead (population 0) with requirements pending
 *   in_progress  - otherwise; the unmet requirement labels are the blockers
 *
 * NOT_STARTED and BLOCKED are intentionally not implemented: they would need
 * either persisted history or a heuristic, while the unmet-requirement list is
 * already the player-visible cause. A momentary evaluation also means a colony
 * that reaches a milestone and then degrades falls back to in_progress (no
 * hidden state) - documented as the deliberate trade-off of not adding history.
 */

import type { BuildingType } from '../../domain/building/building.js'
import { getPopulationCount } from '../../domain/simulation/phases.js'
import { iterateBuildings } from '../../domain/housing/housing.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import { getProgression, type ProgressionStage } from './progression.js'
import { getFoodConsumptionPerTick, getFoodProductionPerTick, getWaterProductionPerTick } from './resources.js'

export type ObjectiveRequirement =
  | { readonly kind: 'stage'; readonly stage: ProgressionStage }
  | { readonly kind: 'population'; readonly atLeast: number }
  | { readonly kind: 'waterCapacity'; readonly atLeast: number }
  | { readonly kind: 'foodBalance' }
  | { readonly kind: 'building'; readonly buildingType: BuildingType; readonly atLeast: number }

export interface ObjectiveDefinition {
  /** Short label shown next to `Objective —`. */
  readonly label: string
  /** Framing sentence: what the scenario is about (never evaluated). */
  readonly description: string
  /** The starting constraint the scenario imposes (never evaluated). */
  readonly constraint: string
  /** The success condition, evaluated against canonical state only. */
  readonly requirements: readonly ObjectiveRequirement[]
  /**
   * True when this scenario starts with colonists, so `population 0` proves a
   * collapse. A scenario that legitimately starts empty must set it false:
   * distinguishing "died" from "not started yet" without saved history needs
   * this one declarative bit (see Step 10AN §5).
   */
  readonly failsWithoutColonists: boolean
}

export type ObjectiveState = 'in_progress' | 'completed' | 'failed'

export interface ObjectiveRequirementStatus {
  readonly label: string
  readonly met: boolean
  readonly detail: string
}

export interface ObjectiveStatus {
  readonly state: ObjectiveState
  readonly met: boolean
  readonly requirements: readonly ObjectiveRequirementStatus[]
  /** Labels of the unmet requirements, in declaration order. */
  readonly blockers: readonly string[]
}

const STAGE_RANK: Readonly<Record<ProgressionStage, number>> = {
  wilderness: 0,
  settlement: 1,
  village: 2,
  town: 3,
}

const BUILDING_LABELS: Readonly<Record<BuildingType, string>> = {
  residence: 'Residence',
  farm: 'Farm',
  workshop: 'Workshop',
  well: 'Well',
}

const countOperational = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter(
    (building) => building.type === type && building.status === 'operational'
  ).length

const requirementStatus = (
  state: SimulationState,
  requirement: ObjectiveRequirement
): ObjectiveRequirementStatus => {
  switch (requirement.kind) {
    case 'stage': {
      const stage = getProgression(state).stage
      const met = STAGE_RANK[stage] >= STAGE_RANK[requirement.stage]
      return {
        label: `Reach ${requirement.stage === 'settlement' ? 'Settlement' : 'Village'}`,
        met,
        detail: `stage ${stage}`,
      }
    }
    case 'population': {
      const population = getPopulationCount(state)
      return {
        label: `Population ${requirement.atLeast}`,
        met: population >= requirement.atLeast,
        detail: `${population} colonist${population === 1 ? '' : 's'}`,
      }
    }
    case 'waterCapacity': {
      const capacity = getWaterProductionPerTick(state)
      return {
        label: `Water capacity ${requirement.atLeast}`,
        met: capacity >= requirement.atLeast,
        detail: `capacity ${capacity} / tick`,
      }
    }
    case 'foodBalance': {
      const production = getFoodProductionPerTick(state)
      const consumption = getFoodConsumptionPerTick(state)
      return {
        label: 'Food balance',
        met: getPopulationCount(state) > 0 && production >= consumption,
        detail: `${production} / ${consumption} Food per tick`,
      }
    }
    case 'building': {
      const count = countOperational(state, requirement.buildingType)
      const label = BUILDING_LABELS[requirement.buildingType]
      return {
        label: `${label} built`,
        met: count >= requirement.atLeast,
        detail: `${count} operational ${label}${count === 1 ? '' : 's'}`,
      }
    }
  }
}

/**
 * Deterministic objective status derived from canonical state. Pure: reads
 * existing queries only, never mutates or caches.
 */
export const getObjectiveStatus = (
  state: SimulationState,
  objective: ObjectiveDefinition
): ObjectiveStatus => {
  const requirements = objective.requirements.map((requirement) =>
    requirementStatus(state, requirement)
  )
  const blockers = requirements.filter((entry) => !entry.met).map((entry) => entry.label)
  const met = blockers.length === 0
  const objectiveState: ObjectiveState = met
    ? 'completed'
    : objective.failsWithoutColonists && getPopulationCount(state) === 0
      ? 'failed'
      : 'in_progress'
  return { state: objectiveState, met, requirements, blockers }
}
