/**
 * Centralized Storage Hub (Step 10BG, Step001).
 *
 * The settlement introduces a single storage hub that aggregates food and
 * water. This enables strategic resource management: surplus production
 * fills the hub, and shortages are buffered against lean periods. Money is
 * NOT stored here — the treasury is accounted, not physical, and uncapped
 * by design (Step001 removed the material slot; flowing taxes replace the
 * old protected-reserve anti-softlock).
 *
 * The hub is deterministic: all allocation rules follow fixed priorities
 * and capacities. No randomness, no caching, no side effects.
 */

export interface StorageCapacities {
  /** Max food units storable (TUNING REQUIRED). */
  readonly food: number
  /** Max water units storable (TUNING REQUIRED). */
  readonly water: number
}

/**
 * Fixed storage capacities for the settlement phase (Step 10BG).
 * These define the strategic ceiling: players must balance production
 * against storage to avoid waste.
 */
export const DEFAULT_STORAGE_CAPACITIES: StorageCapacities = {
  food: 50,
  water: 30,
}

export interface StorageHub {
  /** Current food stored. Never negative. */
  readonly food: number
  /** Current water stored. Never negative. */
  readonly water: number
  /** Maximum capacities per resource type. */
  readonly capacities: StorageCapacities
}

/**
 * Initial storage hub state (empty).
 * Created once at simulation start; never mutated in place.
 */
export const createInitialStorageHub = (): StorageHub => ({
  food: 0,
  water: 0,
  capacities: DEFAULT_STORAGE_CAPACITIES,
})

/**
 * Check if any storage slot is below capacity (i.e., not full).
 * Returns true if there is room to absorb surplus.
 */
export const hasStorageHeadroom = (storage: StorageHub): boolean =>
  storage.food < storage.capacities.food ||
  storage.water < storage.capacities.water

/**
 * Check if storage is critically low on any critical resource.
 * Critical = food or water, the two physical buffered resources.
 */
export const isStorageCritical = (storage: StorageHub): boolean =>
  storage.food < 5 || storage.water < 3

/**
 * Allocation: move surplus from the production stock into storage.
 *
 * Rules (deterministic, no randomness):
 * 1. Food: if stock > 0 and storage has food headroom, fill up to capacity
 * 2. Water: if stock > 0 and storage has water headroom, fill up to capacity
 *
 * Priority order (critical needs first): food → water.
 * Overflow is discarded (never stored, never retroactively applied).
 */
export const allocateToStorage = (
  storage: StorageHub,
  resourceFood: number,
  resourceWater: number
): {
  storage: StorageHub
  remainingFood: number
  remainingWater: number
} => {
  let nextStorage = storage
  let remainingFood = resourceFood
  let remainingWater = resourceWater

  // Food allocation (highest priority)
  if (remainingFood > 0) {
    const foodHeadroom = nextStorage.capacities.food - nextStorage.food
    if (foodHeadroom > 0) {
      const allocated = Math.min(remainingFood, foodHeadroom)
      nextStorage = { ...nextStorage, food: nextStorage.food + allocated }
      remainingFood -= allocated
    }
  }

  // Water allocation
  if (remainingWater > 0) {
    const waterHeadroom = nextStorage.capacities.water - nextStorage.water
    if (waterHeadroom > 0) {
      const allocated = Math.min(remainingWater, waterHeadroom)
      nextStorage = { ...nextStorage, water: nextStorage.water + allocated }
      remainingWater -= allocated
    }
  }

  return {
    storage: nextStorage,
    remainingFood,
    remainingWater,
  }
}

/**
 * Release from storage to cover a shortfall.
 *
 * Rules:
 * 1. Food: if shortfall > 0 and storage has food, deduct from storage
 * 2. Water: if shortfall > 0 and storage has water, deduct from storage
 *
 * Returns the updated storage and any unmet shortfall.
 */
export const releaseFromStorage = (
  storage: StorageHub,
  foodShortfall: number,
  waterShortfall: number
): {
  storage: StorageHub
  unmetFood: number
  unmetWater: number
} => {
  let nextStorage = storage
  let unmetFood = foodShortfall
  let unmetWater = waterShortfall

  // Food release
  if (unmetFood > 0 && storage.food > 0) {
    const release = Math.min(unmetFood, storage.food)
    nextStorage = { ...nextStorage, food: nextStorage.food - release }
    unmetFood -= release
  }

  // Water release
  if (unmetWater > 0 && storage.water > 0) {
    const release = Math.min(unmetWater, storage.water)
    nextStorage = { ...nextStorage, water: nextStorage.water - release }
    unmetWater -= release
  }

  return {
    storage: nextStorage,
    unmetFood,
    unmetWater,
  }
}

/**
 * Step001: protected Material reserve removed with the hub material slot.
 * The treasury is directly spendable and taxes flow every tick a
 * population exists, so the old reserve's anti-softlock role is obsolete.
 */

/**
 * Storage utilization summary for UI feedback.
 */
export const getStorageSummary = (storage: StorageHub) => ({
  foodPercent: Math.round((storage.food / storage.capacities.food) * 100),
  waterPercent: Math.round((storage.water / storage.capacities.water) * 100),
  isFull:
    storage.food >= storage.capacities.food &&
    storage.water >= storage.capacities.water,
  isCritical: isStorageCritical(storage),
})
