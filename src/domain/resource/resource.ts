/**
 * Resource domain model (docs/game/08-RESOURCES.md, Step001).
 *
 * Money is the colony treasury: taxes per inhabitant plus commerce per
 * connected Workshop flow in every tick, construction and maintenance flow
 * out. Food is the first colonist need, consumed all-or-nothing at the
 * colony level; farms produce it. The treasury is uncapped by design —
 * money is accounted, not stored as a physical good — while food and water
 * keep their physical stocks and storage-hub buffering.
 * Stocks are canonical simulation state — the UI/renderer never mutate or
 * interpret them beyond queries.
 */

export interface ResourceStock {
  /** Public treasury in whole money units (Step001). Pays construction. */
  readonly money: number
  /** Colony food reserve in whole meal-units (Step 5). */
  readonly food: number
  /**
   * Colony water reserve (Step 10P). Produced by staffed operational Wells,
   * consumed by water-served colonists. Canonical persisted state: it takes
   * part in the save schema and the canonical hash. Coverage/service is
   * derived and never stored.
   */
  readonly water: number
  /**
   * Colony wood reserve in whole log-units (Step003). The FIRST physical
   * resource: extracted from finite cell-keyed Wood deposits by staffed
   * Lumber Camps (or the Colony Center's primitive collection). Canonical
   * persisted state like food and water; the treasury does not buy it and
   * it is never created ex nihilo.
   */
  readonly wood: number
  /**
   * Colony stone reserve in whole block-units (Step005). Extracted from
   * finite cell-keyed Stone deposits by staffed Quarries. Canonical
   * persisted state like food, water and wood; never created ex nihilo.
   */
  readonly stone: number
  /**
   * Colony plank reserve in whole plank-units (Step006). The first
   * TRANSFORMED resource: produced by staffed operational Workshops
   * consuming wood (2 wood -> 1 plank per tick). Canonical persisted state;
   * never created ex nihilo.
   */
  readonly planks: number
}

/** Deterministic starting treasury (never random). Buys the day-0 setup. */
export const INITIAL_TREASURY = 100
/** Deterministic starting food stock (Step 05B §Food resource semantics). */
export const INITIAL_FOOD = 100
/** Deterministic starting water stock (Step 10P: explicitly zero). */
export const INITIAL_WATER = 0
/** Deterministic starting wood stock (Step003: explicitly zero — wood only
 * enters the colony through extraction from finite deposits). */
export const INITIAL_WOOD = 0
/** Deterministic starting stone stock (Step005: explicitly zero, same rule). */
export const INITIAL_STONE = 0
/** Deterministic starting plank stock (Step006: explicitly zero — planks only
 * enter the colony through transformation). */
export const INITIAL_PLANKS = 0
/** One live colonist needs exactly one food unit per tick (Step 05B). */
export const FOOD_PER_COLONIST_PER_TICK = 1
/** One operational farm produces exactly two food units per tick (Step 06B). */
export const FOOD_PER_FARM_PER_TICK = 2
/**
 * Public revenue per live inhabitant per tick (Step001 taxes). Counted from
 * live colonists; the aggregate-population migration (Step002) keeps the
 * per-capita contract and only changes how the headcount is derived.
 */
export const TAX_PER_INHABITANT_PER_TICK = 1
/**
 * Commerce revenue per connected operational Workshop per tick (Step001).
 * A Workshop is connected when operational and road-accessible, vacant
 * included, under-construction excluded — trade flows through the network,
 * not through individual employment.
 */
export const COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK = 2
/**
 * Maintenance due per operational building per tick (Step001). Every
 * operational building pays, whatever its type or staffing; vacant and
 * under-construction buildings cost 0. Deducted after revenue, clamped to
 * the available treasury (partial payment, never negative, no
 * deactivation, no debt).
 */
export const MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK = 1

/** One staffed operational Well produces two water units per tick (Step 10P). */
export const WATER_PER_WELL_PER_TICK = 2
/** One water-served colonist consumes one water unit per tick (Step 10P). */
export const WATER_PER_COLONIST_PER_TICK = 1

/**
 * One staffed operational Lumber Camp extracts two wood units per tick
 * (Step003) — capped by the remaining quantity of the adjacent deposits.
 */
export const WOOD_PER_LUMBER_CAMP_PER_TICK = 2
/**
 * The Colony Center's primitive collection (Step003, audit D4): deliberately
 * one wood unit per tick — a low-rate anti-self-lock fallback that must never
 * replace a Lumber Camp economically.
 */
export const WOOD_PER_COLONY_CENTER_PER_TICK = 1
/**
 * One staffed operational Quarry extracts two stone units per tick (Step005)
 * — same modest rate as the Lumber Camp, capped by the adjacent deposits.
 */
export const STONE_PER_QUARRY_PER_TICK = 2
/**
 * Step006 transformation recipe (the ONLY recipe): one staffed operational
 * Workshop consumes WOOD_PER_WORKSHOP_RECIPE wood and produces
 * PLANKS_PER_WORKSHOP_RECIPE planks per tick. All-or-nothing: partial input
 * produces nothing. Commerce is unchanged and separate (documented
 * separation — re-anchoring deferred).
 */
export const WOOD_PER_WORKSHOP_RECIPE = 2
export const PLANKS_PER_WORKSHOP_RECIPE = 1

/**
 * Settlement-phase storage allocation constants (Step 10BG).
 * Storage enables strategic buffering: surplus fills the hub,
 * shortages are absorbed before colony-level consumption.
 */
export const STORAGE_ALLOCATION_PHASE = 'townStorage'

export const createInitialResourceStock = (): ResourceStock => ({
  money: INITIAL_TREASURY,
  food: INITIAL_FOOD,
  water: INITIAL_WATER,
  wood: INITIAL_WOOD,
  stone: INITIAL_STONE,
  planks: INITIAL_PLANKS,
})

export const hasSufficientResources = (stock: ResourceStock, cost: number): boolean =>
  stock.money >= cost

/** Atomic deduction from the treasury. Pure: never mutates the input stock. */
export const deductResources = (stock: ResourceStock, cost: number): ResourceStock => {
  if (cost < 0) {
    throw new Error(`Negative money cost: ${cost}`)
  }
  if (!hasSufficientResources(stock, cost)) {
    throw new Error(`Insufficient funds: ${stock.money} < ${cost}`)
  }
  return { ...stock, money: stock.money - cost }
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

/** Wood reserve check (Step003). Mirrors the Food access rule. */
export const hasSufficientWood = (stock: ResourceStock, required: number): boolean =>
  stock.wood >= required

/** Atomic wood deduction. Pure: never mutates the input stock. */
export const deductWood = (stock: ResourceStock, amount: number): ResourceStock => {
  if (amount < 0) {
    throw new Error(`Negative wood deduction: ${amount}`)
  }
  if (!hasSufficientWood(stock, amount)) {
    throw new Error(`Insufficient wood: ${stock.wood} < ${amount}`)
  }
  return { ...stock, wood: stock.wood - amount }
}

/** Water reserve check (Step 10P). Mirrors the Food access rule. */
export const hasSufficientWater = (stock: ResourceStock, required: number): boolean =>
  stock.water >= required

/** Atomic water deduction. Pure: never mutates the input stock. */
export const deductWater = (stock: ResourceStock, amount: number): ResourceStock => {
  if (amount < 0) {
    throw new Error(`Negative water deduction: ${amount}`)
  }
  if (!hasSufficientWater(stock, amount)) {
    throw new Error(`Insufficient water: ${stock.water} < ${amount}`)
  }
  return { ...stock, water: stock.water - amount }
}