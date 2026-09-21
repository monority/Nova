/**
 * Building domain model.
 *
 * Lifecycle (docs/06-construction.md):
 *   placement -> under_construction -> operational
 *
 * Construction is not operation: a building only contributes housing
 * capacity once operational. No economic/material costs in Step 0.
 */

export type BuildingType = 'residence' | 'farm' | 'workshop' | 'well'

export type BuildingStatus = 'underConstruction' | 'operational'

export interface BuildingState {
  readonly id: string
  readonly type: BuildingType
  readonly x: number
  readonly y: number
  readonly status: BuildingStatus
  /** Ticks remaining before the building becomes operational. */
  readonly constructionRemaining: number
}

export interface BuildingDefinition {
  /** Ticks required to go from placement to operational. */
  readonly constructionTicks: number
  /** Housing capacity once operational. */
  readonly housingCapacity: number
  /**
   * Construction material required to START construction (Step 4).
   * The resource is deducted atomically by the simulation, never by UI.
   */
  readonly constructionCost: number
}

/**
 * Deterministic building catalog. Part of the simulation contract:
 * changing a value here is a simulation-behavior change.
 */
export const BUILDING_CATALOG: Readonly<
  Record<BuildingType, BuildingDefinition>
> = {
  residence: { constructionTicks: 2, housingCapacity: 1, constructionCost: 25 },
  // Step 06B: first food producer (Phase 4). Same lifecycle as a residence,
  // zero housing capacity — it never admits colonists. Food output lives in
  // resource.ts (FOOD_PER_FARM_PER_TICK), not in this catalog.
  farm: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25 },
  // Step 07C: first workplace. Same lifecycle as a residence, zero housing
  // capacity — it never admits colonists. Job capacity (1) is a workplace
  // property and lives in jobs.ts (WORKSHOP_JOB_CAPACITY); this catalog stays
  // the source of truth for CONSTRUCTION properties only.
  workshop: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25 },
  // Step 10P: the second essential service. A concrete workplace (capacity 1)
  // that produces Water while staffed, operational and road-accessible. Same
  // lifecycle and cost as every other building; no special construction path.
  well: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25 },
}

export const getBuildingDefinition = (
  type: BuildingType
): BuildingDefinition => {
  const definition = BUILDING_CATALOG[type]
  if (definition === undefined) {
    throw new Error(`Unknown building type: ${type}`)
  }
  return definition
}
