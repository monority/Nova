/**
 * Centralized Storage Hub (Step 10BG).
 *
 * The settlement introduces a single storage hub that aggregates food, water, and
 * construction material. This enables strategic resource management:
 * surplus production fills the hub, and shortages are buffered against
 * lean periods.
 *
 * The hub is deterministic: all allocation rules follow fixed priorities
 * and capacities. No randomness, no caching, no side effects.
 */

export interface StorageCapacities {
  /** Max food units storable (TUNING REQUIRED). */
  readonly food: number
  /** Max water units storable (TUNING REQUIRED). */
  readonly water: number
  /** Max construction material units storable (TUNING REQUIRED). */
  readonly material: number
}

/**
 * Fixed storage capacities for the settlement phase (Step 10BG).
 * These define the strategic ceiling: players must balance production
 * against storage to avoid waste.
 */
export const DEFAULT_STORAGE_CAPACITIES: StorageCapacities = {
  food: 50,
  water: 30,
  material: 40,
}

/**
 * Material reserve floor for Step 10BJ.
 *
 * The 40-unit reserve can cover one standard 25-unit building transaction.
 * Keeping the remaining 15 units protected makes the releasable maximum
 * exactly one normal construction cost, derived from current scale rather
 * than a new progression constant.
 */
export const PROTECTED_MATERIAL_RESERVE = 15

export interface StorageHub {
  /** Current food stored. Never negative. */
  readonly food: number
  /** Current water stored. Never negative. */
  readonly water: number
  /** Current construction material stored. Never negative. */
  readonly material: number
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
  material: 0,
  capacities: DEFAULT_STORAGE_CAPACITIES,
})

/**
 * Check if any storage slot is below capacity (i.e., not full).
 * Returns true if there is room to absorb surplus.
 */
export const hasStorageHeadroom = (storage: StorageHub): boolean =>
  storage.food < storage.capacities.food ||
  storage.water < storage.capacities.water ||
  storage.material < storage.capacities.material

/**
 * Check if storage is critically low on any critical resource.
 * Critical = food or water (not material, which is build-only).
 */
export const isStorageCritical = (storage: StorageHub): boolean =>
  storage.food < 5 || storage.water < 3

/**
 * Allocation: move surplus from the production stock into storage.
 *
 * Rules (deterministic, no randomness):
 * 1. Food: if stock > 0 and storage has food headroom, fill up to capacity
 * 2. Water: if stock > 0 and storage has water headroom, fill up to capacity
 * 3. Material: if stock > 0 and storage has material headroom, fill up to capacity
 *
 * Priority order (critical needs first): food → water → material
 * Overflow is discarded (never stored, never retroactively applied).
 */
export const allocateToStorage = (
  storage: StorageHub,
  resourceFood: number,
  resourceWater: number,
  resourceMaterial: number
): {
  storage: StorageHub
  remainingFood: number
  remainingWater: number
  remainingMaterial: number
} => {
  let nextStorage = storage
  let remainingFood = resourceFood
  let remainingWater = resourceWater
  let remainingMaterial = resourceMaterial

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

  // Material allocation (lowest priority)
  if (remainingMaterial > 0) {
    const materialHeadroom = nextStorage.capacities.material - nextStorage.material
    if (materialHeadroom > 0) {
      const allocated = Math.min(remainingMaterial, materialHeadroom)
      nextStorage = { ...nextStorage, material: nextStorage.material + allocated }
      remainingMaterial -= allocated
    }
  }

  return {
    storage: nextStorage,
    remainingFood,
    remainingWater,
    remainingMaterial,
  }
}

/**
 * Release from storage to cover a shortfall.
 *
 * Rules:
 * 1. Food: if shortfall > 0 and storage has food, deduct from storage
 * 2. Water: if shortfall > 0 and storage has water, deduct from storage
 * 3. Material: if shortfall > 0 and storage has material, deduct from storage
 *
 * Returns the updated storage and any unmet shortfall.
 */
export const releaseFromStorage = (
  storage: StorageHub,
  foodShortfall: number,
  waterShortfall: number,
  materialShortfall: number
): {
  storage: StorageHub
  unmetFood: number
  unmetWater: number
  unmetMaterial: number
} => {
  let nextStorage = storage
  let unmetFood = foodShortfall
  let unmetWater = waterShortfall
  let unmetMaterial = materialShortfall

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

  // Material release
  if (unmetMaterial > 0 && storage.material > 0) {
    const release = Math.min(unmetMaterial, storage.material)
    nextStorage = { ...nextStorage, material: nextStorage.material - release }
    unmetMaterial -= release
  }

  return {
    storage: nextStorage,
    unmetFood,
    unmetWater,
    unmetMaterial,
  }
}

export interface StorageReleaseResult {
  readonly storage: StorageHub
  readonly operationalMaterial: number
  readonly releaseAmount: number
}

/**
 * Release only Material above the protected floor, and only enough to cover
 * an operational deficit. This is a pure operation: no same-tick release is
 * implied by this helper; callers decide when demand exists.
 */
export const releaseProtectedMaterialReserve = (
  storage: StorageHub,
  operationalMaterial: number,
  operationalRequirement: number
): StorageReleaseResult => {
  const deficit = Math.max(0, operationalRequirement - operationalMaterial)
  const releasable = Math.max(0, storage.material - PROTECTED_MATERIAL_RESERVE)
  const releaseAmount = Math.min(deficit, releasable)
  if (releaseAmount === 0) {
    return { storage, operationalMaterial, releaseAmount: 0 }
  }
  return {
    storage: { ...storage, material: storage.material - releaseAmount },
    operationalMaterial: operationalMaterial + releaseAmount,
    releaseAmount,
  }
}

/**
 * Storage utilization summary for UI feedback.
 */
export const getStorageSummary = (storage: StorageHub) => ({
  foodPercent: Math.round((storage.food / storage.capacities.food) * 100),
  waterPercent: Math.round((storage.water / storage.capacities.water) * 100),
  materialPercent: Math.round((storage.material / storage.capacities.material) * 100),
  isFull:
    storage.food >= storage.capacities.food &&
    storage.water >= storage.capacities.water &&
    storage.material >= storage.capacities.material,
  isCritical: isStorageCritical(storage),
})
