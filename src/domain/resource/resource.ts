/**
 * Resource domain model (docs/09-economy-foundation.md, Step 4 + Step 05).
 *
 * Step 4: an abstract construction material used to start building.
 * Step 05: food, the first colonist need, consumed all-or-nothing at the
 * colony level. Step 06B added food production (farms); Step 07C added
 * material production (employed colonists). Neither stock is capped; the
 * stock is canonical simulation state — the UI/renderer never mutate or
 * interpret it beyond queries.
 */

export interface ResourceStock {
  /** Abstract material used to start building construction. */
  readonly construction: number
  /** Colony food reserve in whole meal-units (Step 5). */
  readonly food: number
}

/** Deterministic starting construction stock (Step 4 §2: never random). */
export const INITIAL_CONSTRUCTION_MATERIAL = 100
/** Deterministic starting food stock (Step 05B §Food resource semantics). */
export const INITIAL_FOOD = 100
/** One live colonist needs exactly one food unit per tick (Step 05B). */
export const FOOD_PER_COLONIST_PER_TICK = 1
/** One operational farm produces exactly two food units per tick (Step 06B). */
export const FOOD_PER_FARM_PER_TICK = 2
/**
 * One employed colonist produces exactly two construction-material units per
 * tick (Step 07C §6). Direct output into the existing construction stock: no
 * intermediate `labour` resource, no recipe, no efficiency, no cap.
 */
export const MATERIAL_PER_WORKER_PER_TICK = 2
/**
 * One staffed operational Workshop costs exactly one construction-material
 * unit per tick (Step 08C). Only Workshops that are operational AND staffed
 * pay; vacant Workshops, Residences and Farms cost 0. Integer, deducted
 * after production, clamped to the available stock (partial payment, never
 * negative, no deactivation, no debt).
 */
export const MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK = 1

export const createInitialResourceStock = (): ResourceStock => ({
  construction: INITIAL_CONSTRUCTION_MATERIAL,
  food: INITIAL_FOOD,
})

export const hasSufficientResources = (stock: ResourceStock, cost: number): boolean =>
  stock.construction >= cost

/** Atomic deduction. Pure: never mutates the input stock. */
export const deductResources = (stock: ResourceStock, cost: number): ResourceStock => {
  if (cost < 0) {
    throw new Error(`Negative construction cost: ${cost}`)
  }
  if (!hasSufficientResources(stock, cost)) {
    throw new Error(
      `Insufficient construction material: ${stock.construction} < ${cost}`
    )
  }
  return { ...stock, construction: stock.construction - cost }
}

/**
 * Colony-level food check (Step 05 all-or-nothing feeding). The whole colony
 * is fed only when the reserve covers every colonist: mirrors the Step 04
 * hasSufficientResources access rule before any deduction.
 */
export const hasSufficientFood = (stock: ResourceStock, required: number): boolean =>
  stock.food >= required

/** Atomic food deduction. Pure: never mutates the input stock. */
export const deductFood = (stock: ResourceStock, amount: number): ResourceStock => {
  if (amount < 0) {
    throw new Error(`Negative food deduction: ${amount}`)
  }
  if (!hasSufficientFood(stock, amount)) {
    throw new Error(`Insufficient food: ${stock.food} < ${amount}`)
  }
  return { ...stock, food: stock.food - amount }
}