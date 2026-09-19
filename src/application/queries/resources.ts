/**
 * Resource queries (Step 4 §9, Step 07C §1). Pure, deterministic, no DOM,
 * browser or Three.js. The returned stock is canonical state; there is no
 * second mutable copy.
 */

import {
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  type ResourceStock,
} from '../../domain/resource/resource.js'
import { countEmployedWorkers } from '../../domain/jobs/jobs.js'
import {
  countOperationalFarms,
  countStaffedOperationalWorkshops,
  materialProductionForTick,
  materialStorageCapacityForTick,
  materialStoredProductionForTick,
} from '../../domain/simulation/phases.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export const getResourceStock = (state: SimulationState): ResourceStock =>
  state.resources

/**
 * Deterministic farm output per tick (Step 06B Part B). Pure derivation over
 * canonical state: operational farms × fixed output. Never stored.
 */
export const getFoodProductionPerTick = (state: SimulationState): number =>
  countOperationalFarms(state) * FOOD_PER_FARM_PER_TICK

/** Deterministic colony food demand per tick: population × 1 (Step 05B). */
export const getFoodConsumptionPerTick = (state: SimulationState): number =>
  Object.keys(state.colonists).length * FOOD_PER_COLONIST_PER_TICK

/**
 * Derived food forecast (Step 07C §1, correcting the Step 07A finding).
 *
 * The forecast is net-aware: it answers "how many ticks until Food reaches
 * zero?" under the CURRENT net rate, and returns null when that question has
 * no finite answer:
 *
 *   population = 0                     -> null (nobody needs food)
 *   production >= consumption          -> null (net non-negative: sustainable)
 *   production <  consumption          -> floor(food / (consumption - production))
 *
 * Pure presentation/query value. Never stored in canonical state, never
 * persisted, never hashed (Step 05C §4).
 */
export const getFoodTicksRemaining = (
  state: SimulationState
): number | null => {
  const population = Object.keys(state.colonists).length
  if (population === 0) {
    return null
  }
  const consumption = population * FOOD_PER_COLONIST_PER_TICK
  const netLoss = consumption - getFoodProductionPerTick(state)
  if (netLoss <= 0) {
    return null
  }
  return Math.floor(state.resources.food / netLoss)
}

/**
 * True when a live colony's food flow is non-negative this tick, i.e. the
 * reserve never has to reach zero. False while nobody needs food: with no
 * consumers there is no supply relationship to be sustainable.
 */
export const isFoodSupplySustainable = (state: SimulationState): boolean => {
  const population = Object.keys(state.colonists).length
  if (population === 0) {
    return false
  }
  return (
    getFoodProductionPerTick(state) >= population * FOOD_PER_COLONIST_PER_TICK
  )
}

/**
 * Productive workers this tick (Step 08E): colonists actually assigned to
 * operational Workshop capacity. This is the ONLY labor that produces
 * Material — population alone never produces. Thin name over the canonical
 * employment relation so UI and tests share the 08E vocabulary.
 * Derived, never stored, never persisted, never hashed.
 */
export const getProductiveWorkerCount = (state: SimulationState): number =>
  countEmployedWorkers(state)

/**
 * Deterministic construction-material output per tick (Step 07C §6, gated by
 * Step 09F): only staffed road-accessible operational Workshops produce —
 * every other employed colonist's output is blocked. Derived, never stored
 * as a `labour` resource. Single source of truth: the simulation phase.
 */
export const getMaterialProductionPerTick = (
  state: SimulationState
): number => materialProductionForTick(state)

/**
 * Deterministic upkeep due per tick (Step 08C): staffed operational
 * Workshops × 1. Pure derivation, never stored, never persisted, never
 * hashed — same conventions as the other economic queries.
 */
export const getMaterialUpkeepPerTick = (state: SimulationState): number =>
  countStaffedOperationalWorkshops(state) *
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK

/** Net material flow per tick: production − upkeep (Step 08C). */
export const getNetMaterialPerTick = (state: SimulationState): number =>
  getMaterialProductionPerTick(state) - getMaterialUpkeepPerTick(state)

/**
 * Material storage capacity (Step 08F §9): operational Workshops × 25,
 * vacant included, under-construction excluded. Pure derivation, never
 * stored, never persisted, never hashed.
 */
export const getMaterialStorageCapacity = (state: SimulationState): number =>
  materialStorageCapacityForTick(state)

/**
 * Production actually stored after the storage clamp (Step 08F §10):
 * gross production minus deterministically discarded overflow. The existing
 * getMaterialProductionPerTick keeps its gross contract; this query names
 * the stored part explicitly. Derived, never stored/persisted/hashed.
 */
export const getMaterialStoredProductionPerTick = (
  state: SimulationState
): number => materialStoredProductionForTick(state)
