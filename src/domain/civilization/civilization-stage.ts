import type { CityState } from '../city'

/** Step 22 — Civilization progression. Pure, deterministic, no simulation of its own. */

export type CivilizationStage = 'wilderness' | 'settlement' | 'village' | 'town'

export const STAGE_ORDER: readonly CivilizationStage[] = ['wilderness', 'settlement', 'village', 'town']

export const STAGE_LABELS: Readonly<Record<CivilizationStage, string>> = {
  wilderness: 'WILDERNESS',
  settlement: 'SETTLEMENT',
  village: 'VILLAGE',
  town: 'TOWN',
}

/** Single source of truth for stage thresholds (docs/20-product-contract.md). */
export const CIVILIZATION_THRESHOLDS = {
  settlement: {
    population: 20,
    houses: 1,
  },
  village: {
    population: 50,
  },
  town: {
    population: 500,
  },
} as const

export interface CivilizationInputs {
  readonly population: number
  /** Completed houses. Apartments count: densified houses remain housing stock. */
  readonly houses: number
}

/** Housing stock counts houses and densified apartments (former houses). */
export function countHousingStock(city: CityState): number {
  return city.buildings.filter((building) => building.type === 'house' || building.type === 'apartment').length
}

/**
 * Pure stage evaluator. Condition order matters: town first, wilderness last.
 * The stage is a projection of current state, not stored progression.
 */
export function evaluateCivilizationStage(inputs: CivilizationInputs): CivilizationStage {
  if (inputs.population >= CIVILIZATION_THRESHOLDS.town.population) return 'town'
  if (inputs.population >= CIVILIZATION_THRESHOLDS.village.population) return 'village'
  if (
    inputs.population >= CIVILIZATION_THRESHOLDS.settlement.population &&
    inputs.houses >= CIVILIZATION_THRESHOLDS.settlement.houses
  ) {
    return 'settlement'
  }
  return 'wilderness'
}
