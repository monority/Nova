/**
 * Building domain model.
 *
 * Lifecycle (docs/06-construction.md):
 *   placement -> under_construction -> operational
 *
 * Construction is not operation: a building only contributes housing
 * capacity once operational. No economic/material costs in Step 0.
 */

export type BuildingType = 'residence'

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
}

/**
 * Deterministic building catalog. Part of the simulation contract:
 * changing a value here is a simulation-behavior change.
 */
export const BUILDING_CATALOG: Readonly<
  Record<BuildingType, BuildingDefinition>
> = {
  residence: { constructionTicks: 2, housingCapacity: 1 },
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
