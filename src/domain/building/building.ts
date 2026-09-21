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
  /**
   * Water required to START construction (Step 10AD). ONE-OFF: charged in the
   * same atomic placement transaction as `constructionCost`, exactly once, and
   * never consumed by operation (a Workshop consumes no Water per tick).
   * 0 for every building whose construction needs no Water, so the field is a
   * concrete construction property of the catalog, not a cost abstraction.
   */
  readonly constructionWaterCost: number
}

/**
 * Deterministic building catalog. Part of the simulation contract:
 * changing a value here is a simulation-behavior change.
 */
export const BUILDING_CATALOG: Readonly<
  Record<BuildingType, BuildingDefinition>
> = {
  residence: { constructionTicks: 2, housingCapacity: 1, constructionCost: 25, constructionWaterCost: 0 },
  // Step 06B: first food producer (Phase 4). Same lifecycle as a residence,
  // zero housing capacity — it never admits colonists. Food output lives in
  // resource.ts (FOOD_PER_FARM_PER_TICK), not in this catalog.
  farm: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 0 },
  // Step 07C: first workplace. Same lifecycle as a residence, zero housing
  // capacity — it never admits colonists. Job capacity (1) is a workplace
  // property and lives in jobs.ts (WORKSHOP_JOB_CAPACITY); this catalog stays
  // the source of truth for CONSTRUCTION properties only. Step 10AD adds the
  // Water construction investment (1 Water, one-off at placement).
  workshop: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 1 },
  // Step 10P: the second essential service. A concrete workplace (capacity 1)
  // that produces Water while staffed, operational and road-accessible. Same
  // lifecycle and cost as every other building; no special construction path.
  // Step 10AD: the Well is the Water bootstrap ROOT and is never Water-costed.
  well: { constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 0 },
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
