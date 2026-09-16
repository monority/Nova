import type { BuildingTypeId } from '../city/building-types'

/** Step 21 — MVP economy constants. Centralized, documented, testable. */
export const INITIAL_FOOD = 180
export const INITIAL_ENERGY = 120
export const INITIAL_MATERIALS = 300

/** Community service acts as the MVP energy producer (contract Generator: 12/tick). */
export const ENERGY_PER_SERVICE_PER_DAY = 12
/** Settlement-level basic material source (contract: 6/tick). No extraction chain in MVP. */
export const MATERIALS_PER_DAY_SETTLEMENT_SOURCE = 6
/** MVP energy demand: 1 per building per day + 1 per 20 people per day. */
export const ENERGY_PER_BUILDING_PER_DAY = 1
export const PEOPLE_PER_ENERGY_UNIT_PER_DAY = 20

export const CONSTRUCTION_COSTS: Readonly<Record<BuildingTypeId | 'road' | 'community', number>> = {
  house: 20,
  farm: 20,
  apartment: 35,
  road: 5,
  community: 30,
}

/** Material cost to evolve an existing building (e.g. house → apartment densification). */
export const EVOLVE_COST = 15

export function constructionCost(kind: BuildingTypeId | 'road' | 'community'): number {
  return CONSTRUCTION_COSTS[kind]
}
