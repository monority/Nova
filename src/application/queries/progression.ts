/**
 * Settlement progression queries (Step 10AL).
 *
 * DERIVED ONLY. The progression layer OBSERVES the simulation; it never
 * modifies it. Nothing here is stored, persisted or hashed, and
 * SAVE_VERSION stays 7 (Step 10AK established that no new persistent state
 * is required).
 *
 * Only the two transitions the design audit could justify are contracted:
 *
 *   Wilderness -> Settlement : population >= 1
 *                              AND Food production >= Food consumption
 *                              AND an operational road network exists
 *   Settlement -> Village    : population >= COLONISTS_PER_STAFFED_WELL
 *                              AND Water capacity >= WATER_PER_WELL_PER_TICK
 *                              AND Food production >= Food consumption
 *
 * Every threshold is produced by the model itself (1 Water per served
 * colonist, 2 Water per staffed Well, 2 Food per staffed Farm). Town and
 * Town is a derived capability state: Village conditions plus a staffed
 * Workshop. No new persistent state is required.
 *
 * Food sustainability is not re-implemented here: the authoritative query
 * (`isFoodSupplySustainable`) is reused, so there is exactly one definition.
 * Water is read as derived CAPACITY (`getWaterProductionPerTick`), never as
 * the Water stock.
 */

import { WATER_PER_WELL_PER_TICK } from '../../domain/resource/resource.js'
import { getRoadNetworks } from '../../domain/road/road.js'
import { getPopulationCount, countStaffedOperationalWorkshops } from '../../domain/simulation/phases.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import {
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getWaterProductionPerTick,
  isFoodSupplySustainable,
} from './resources.js'

export type ProgressionStage = 'wilderness' | 'settlement' | 'village' | 'town'

/**
 * Colonists one staffed Well supports. NOT an arbitrary number: a Well
 * produces WATER_PER_WELL_PER_TICK Water per tick and a water-served
 * colonist consumes exactly one Water per tick, so the first capacity step
 * of the model is exactly this many colonists. Both the population and the
 * Water-capacity Village conditions are expressed with it.
 */
export const COLONISTS_PER_STAFFED_WELL = WATER_PER_WELL_PER_TICK

export type ProgressionConditionId = 'population' | 'food' | 'roads' | 'water' | 'workshop'

export interface ProgressionCondition {
  readonly id: ProgressionConditionId
  /** Short label for the UI checklist. */
  readonly label: string
  readonly met: boolean
  /** Measured value, e.g. `2 colonists` or `Water capacity 2/tick`. */
  readonly detail: string
}

export interface ProgressionStatus {
  readonly stage: ProgressionStage
  readonly stageLabel: string
  readonly nextStage: ProgressionStage | null
  readonly nextStageLabel: string | null
  /** Conditions of the CURRENT stage (empty for Wilderness). */
  readonly conditions: readonly ProgressionCondition[]
  /** Conditions of the NEXT stage (empty once progression is deferred). */
  readonly nextConditions: readonly ProgressionCondition[]
  /** Labels of the unmet next-stage conditions, in declaration order. */
  readonly blockers: readonly string[]
  /** True once no further transition is contracted. */
  readonly deferred: boolean
}

const STAGE_LABELS: Readonly<Record<ProgressionStage, string>> = {
  wilderness: 'Wilderness',
  settlement: 'Settlement',
  village: 'Village',
  town: 'Town',
}

const populationCondition = (
  state: SimulationState,
  required: number
): ProgressionCondition => {
  const population = getPopulationCount(state)
  return {
    id: 'population',
    label: `Population ${required}`,
    met: population >= required,
    detail: `${population} colonist${population === 1 ? '' : 's'}`,
  }
}

const foodCondition = (state: SimulationState): ProgressionCondition => ({
  id: 'food',
  label: 'Food balance',
  met: isFoodSupplySustainable(state),
  detail: `${getFoodProductionPerTick(state)} / ${getFoodConsumptionPerTick(state)} Food per tick`,
})

const roadsCondition = (state: SimulationState): ProgressionCondition => {
  const networks = getRoadNetworks(state).length
  return {
    id: 'roads',
    label: 'Road network',
    met: networks > 0,
    detail: networks === 1 ? '1 operational network' : `${networks} operational networks`,
  }
}

const waterCapacityCondition = (state: SimulationState): ProgressionCondition => {
  const capacity = getWaterProductionPerTick(state)
  return {
    id: 'water',
    label: `Water capacity ${WATER_PER_WELL_PER_TICK}`,
    met: capacity >= WATER_PER_WELL_PER_TICK,
    detail: `capacity ${capacity} / tick`,
  }
}

/** Conditions for reaching Settlement, in declaration order. */
export const getSettlementConditions = (
  state: SimulationState
): readonly ProgressionCondition[] => [
  populationCondition(state, 1),
  foodCondition(state),
  roadsCondition(state),
]

/** Conditions for reaching Village, in declaration order. */
export const getVillageConditions = (
  state: SimulationState
): readonly ProgressionCondition[] => [
  populationCondition(state, COLONISTS_PER_STAFFED_WELL),
  waterCapacityCondition(state),
  foodCondition(state),
]

export const getTownConditions = (state: SimulationState): readonly ProgressionCondition[] => [
  {
    id: 'workshop',
    label: 'Staffed Workshop',
    met: countStaffedOperationalWorkshops(state) > 0,
    detail: `${countStaffedOperationalWorkshops(state)} staffed`,
  },
  waterCapacityCondition(state),
  foodCondition(state),
]

const allMet = (conditions: readonly ProgressionCondition[]): boolean =>
  conditions.every((condition) => condition.met)

/**
 * Deterministic progression status derived from canonical state. Pure: it
 * reads existing queries only and never mutates or caches.
 */
export interface TownCapabilityStatus {
  readonly available: boolean
  readonly label: string
  readonly detail: string
}

/** Derived Town capability: review and manually rebalance the live workforce. */
export const getTownCapabilityStatus = (state: SimulationState): TownCapabilityStatus => {
  const available = getProgression(state).stage === 'town'
  return {
    available,
    label: available ? 'Town workforce allocation' : 'Town workforce allocation locked',
    detail: available
      ? 'Farm / Well / Workshop allocation is active; use Move worker to rebalance.'
      : 'Reach Town to review and rebalance the live workforce.',
  }
}

export const getProgression = (state: SimulationState): ProgressionStatus => {
  const settlement = getSettlementConditions(state)
  const village = getVillageConditions(state)
  const isVillageBase = allMet(village)
  const isTown = isVillageBase && allMet(getTownConditions(state))
  const isVillage = isTown || isVillageBase
  const isSettlement = isVillage || allMet(settlement)
  const stage: ProgressionStage = isTown
    ? 'town'
    : isVillage
      ? 'village'
      : isSettlement
        ? 'settlement'
        : 'wilderness'
  const nextStage: ProgressionStage | null =
    stage === 'wilderness' ? 'settlement' : stage === 'settlement' ? 'village' : stage === 'village' ? 'town' : null
  const nextConditions: readonly ProgressionCondition[] =
    nextStage === 'settlement' ? settlement : nextStage === 'village' ? village : nextStage === 'town' ? getTownConditions(state) : []
  return {
    stage,
    stageLabel: STAGE_LABELS[stage],
    nextStage,
    nextStageLabel: nextStage === null ? null : STAGE_LABELS[nextStage],
    conditions: stage === 'wilderness' ? [] : stage === 'settlement' ? settlement : stage === 'village' ? village : getTownConditions(state),
    nextConditions,
    blockers: nextConditions
      .filter((condition) => !condition.met)
      .map((condition) => condition.label),
    deferred: nextStage === null,
  }
}
