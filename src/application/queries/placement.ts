/**
 * Placement affordability query (Step 10AD-1).
 *
 * ONE concrete predicate shared by the hover feedback and the authoritative
 * dispatch gate, so the UI can never drift from the domain rule:
 *
 *   affordable = validatePlacement accepts the cell
 *              | the only failure is missing Material
 *                AND this tick's STORED Workshop inflow completes it
 *
 * Why the second clause exists (Step 08G §5, Step 10AD): the construction
 * transaction runs mid-tick, AFTER `produceMaterial` stored this tick's output
 * and BEFORE `upkeepBuildings` drains it. A lone staffed Workshop equilibrates
 * at 24 Material (stored 1 − upkeep 1 = net 0), so a 25-cost building is
 * reachable exactly on that tick. The stock query alone would report
 * "insufficient material" for a placement the domain accepts.
 *
 * It is deliberately NOT generalised: it mirrors the existing dispatch check,
 * reads only existing derived queries, and never predicts future ticks. Water
 * (Step 10AD) is part of the placement contract, so it is surfaced here too —
 * but stored Material never covers a Water shortfall.
 */

import { getBuildingDefinition, type BuildingType } from '../../domain/building/building.js'
import type { CellCoordinate } from '../../domain/world/grid.js'
import {
  validatePlacement,
  type PlacementValidation,
} from '../../domain/simulation/phases.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import {
  getMaterialStoredProductionPerTick,
  getResourceStock,
} from './resources.js'

export interface PlacementAffordability {
  /** The authoritative validation result for the cell (unchanged). */
  readonly placement: PlacementValidation
  /**
   * True when the authoritative dispatch gate would accept this placement:
   * `placement.valid`, or Material covered by this tick's stored inflow.
   */
  readonly affordable: boolean
  readonly materialRequired: number
  readonly materialAvailable: number
  readonly waterRequired: number
  readonly waterAvailable: number
  /** True when only the same-tick stored Material inflow makes it affordable. */
  readonly coveredByStoredProduction: boolean
}

export const getPlacementAffordability = (
  state: SimulationState,
  cell: CellCoordinate,
  buildingType: BuildingType
): PlacementAffordability => {
  const placement = validatePlacement(state, cell, buildingType)
  const definition = getBuildingDefinition(buildingType)
  const stock = getResourceStock(state)
  const materialRequired = definition.constructionCost
  const waterRequired = definition.constructionWaterCost
  // Stored Material inflow may complete a Material shortfall, but it must never
  // mask a Water shortfall: the Water part of the placement contract has no
  // same-tick producer equivalent, so it is checked directly.
  const coveredByStoredProduction =
    !placement.valid &&
    placement.reason === 'insufficientResources' &&
    stock.water >= waterRequired &&
    stock.construction + getMaterialStoredProductionPerTick(state) >= materialRequired
  return {
    placement,
    affordable: placement.valid || coveredByStoredProduction,
    materialRequired,
    materialAvailable: stock.construction,
    waterRequired,
    waterAvailable: stock.water,
    coveredByStoredProduction,
  }
}
