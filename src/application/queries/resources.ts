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
import { iterateBuildings } from '../../domain/housing/housing.js'
import {
  countOperationalFarms,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  materialProductionForTick,
  materialStorageCapacityForTick,
  materialStoredProductionForTick,
} from '../../domain/simulation/phases.js'
import {
  getWaterCoverage,
  getWaterStatus,
  hasOperationalWell,
  waterProductionForTick,
  waterNeedForTick,
} from '../../domain/water/water.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export const getResourceStock = (state: SimulationState): ResourceStock =>
  state.resources

/**
 * Deterministic farm output per tick (Step 06B Part B, staffed-only since
 * Step 10E §7). Pure derivation over canonical state: staffed operational
 * farms × fixed output. Never stored. Single source of truth: the
 * simulation phase (`foodProductionForTick`).
 */
export const getFoodProductionPerTick = (state: SimulationState): number =>
  countStaffedOperationalFarms(state) * FOOD_PER_FARM_PER_TICK

/**
 * Productive Farm workers this tick (Step 10E §10): colonists assigned to
 * operational Farm capacity — the ONLY labor that produces Food. Thin
 * derived counting over the canonical employment relation, mirroring
 * getProductiveWorkerCount (which stays Workshop/Material-scoped so the UI
 * message "X workers produced Y material" keeps its contract). Derived,
 * never stored, never persisted, never hashed.
 */
export const getProductiveFarmWorkerCount = (
  state: SimulationState
): number => countStaffedOperationalFarms(state)

/**
 * Vacant operational Farms this tick (Step 10E §10): operational with no
 * worker — they produce 0 Food. Derived, never stored/persisted/hashed.
 */
export const getVacantOperationalFarmCount = (
  state: SimulationState
): number =>
  countOperationalFarms(state) - countStaffedOperationalFarms(state)

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

// ---------------------------------------------------------------------------
// Water queries (Step 10P). Derived only: coverage, service and shortage are
// never stored, persisted or hashed; only `resources.water` is canonical.
// ---------------------------------------------------------------------------

/** Canonical Water stock. */
export const getWaterStock = (state: SimulationState): number =>
  state.resources.water

/** Water produced per tick by staffed, road-accessible Wells. */
export const getWaterProductionPerTick = (state: SimulationState): number =>
  waterProductionForTick(state)

/** Water required per tick by water-served colonists. */
export const getWaterNeedPerTick = (state: SimulationState): number =>
  waterNeedForTick(state)

/** Colonists whose Residence is currently water-served. */
export const getServedColonistCount = (state: SimulationState): number =>
  getWaterStatus(state).servedColonistCount

/** Operational Residences currently water-served. */
export const getWaterServedResidenceCount = (state: SimulationState): number =>
  getWaterStatus(state).servedResidenceCount

/** True when served colonists exist and the stock cannot cover their need. */
export const getWaterShortage = (state: SimulationState): boolean =>
  getWaterStatus(state).shortage

/**
 * True when no served colonist is short of water: either nobody needs water
 * (no coverage) or the stock covers every served colonist this tick.
 *
 * Step 10AR note: this is a STOCK-COVERAGE test, not a balance test. A colony
 * with production == need and an empty reserve answers `false` here while its
 * Water flow is perfectly balanced — `getWaterSupplyStatus` is the precise
 * derived status that names the difference.
 */
export const isWaterSupplySustainable = (state: SimulationState): boolean => {
  const status = getWaterStatus(state)
  return status.servedColonistCount === 0 || status.stock >= status.needPerTick
}

/**
 * The precise Water supply state (Step 10AR). ONE derived value built only
 * from existing queries, so the UI can never conflate the five concepts the
 * Water rules actually use:
 *
 *   capacity  - Water a staffed, road-accessible Well can sustain per tick
 *   need      - Water the currently SERVED colonists consume per tick
 *   balance   - capacity - need (the flow)
 *   reserve   - the canonical stock
 *   service   - whether Residences share a covered road network
 *   shortage  - whether the stock cannot cover this tick's need
 *
 *   inactive  - no operational Well: the Water gate is inactive (bootstrap)
 *   noService - a Well exists but no Residence is served by it
 *   noReserve - production >= need but the reserve is empty (the 10AQ case:
 *               a balanced flow with nothing stored)
 *   supplied  - production >= need and the reserve covers this tick
 *   draining  - production < need, the stock still covers this tick
 *   shortage  - production < need and the stock cannot cover this tick
 *
 * The FLOW is evaluated before the RESERVE, so an empty reserve with a
 * sufficient flow reads `noReserve` ("nothing stored") instead of `shortage`
 * ("cannot supply"). The domain's tick-coverage rule is unchanged and is still
 * exposed as `shortage`: with production == need and an empty reserve the
 * admission gate still blocks growth this tick.
 *
 * Derived only: never stored, persisted or hashed. Pure.
 */
export type WaterSupplyState =
  | 'inactive'
  | 'noService'
  | 'noReserve'
  | 'supplied'
  | 'draining'
  | 'shortage'

export interface WaterSupplyStatus {
  readonly state: WaterSupplyState
  /** Staffed, road-accessible Wells x WATER_PER_WELL_PER_TICK. */
  readonly capacity: number
  /** Served colonists x WATER_PER_COLONIST_PER_TICK. */
  readonly need: number
  /** `capacity - need`: positive is a growing reserve. */
  readonly balance: number
  /** The canonical Water stock. */
  readonly reserve: number
  /** Operational Residences sharing a covered network. */
  readonly servedResidences: number
  /** Operational Residences in total (the service ratio denominator). */
  readonly residences: number
  /** Colonists whose Residence is served. */
  readonly servedColonists: number
  /** The existing stock-shortage rule, unchanged. */
  readonly shortage: boolean
}

export const getWaterSupplyStatus = (
  state: SimulationState
): WaterSupplyStatus => {
  const status = getWaterStatus(state)
  const active = hasOperationalWell(state)
  const service = getWaterCoverage(state)
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence' && building.status === 'operational'
  ).length
  const capacity = status.productionPerTick
  const need = status.needPerTick
  const reserve = status.stock
  const state0: WaterSupplyState = !active
    ? 'inactive'
    : status.servedColonistCount === 0
      ? 'noService'
      : capacity >= need
        ? reserve >= need
          ? 'supplied'
          : 'noReserve'
        : reserve >= need
          ? 'draining'
          : 'shortage'
  return {
    state: state0,
    capacity,
    need,
    balance: capacity - need,
    reserve,
    servedResidences: service.servedResidenceIds.length,
    residences,
    servedColonists: status.servedColonistCount,
    shortage: status.shortage,
  }
}
