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
import { isOperationalWorkplace } from '../../domain/jobs/jobs.js'
import {
  getBuildingRoadAccessWithNetworks,
  getRoadIdAtCell,
  getRoadNetworks,
  isOperationalRoad,
} from '../../domain/road/road.js'
import type { CellCoordinate } from '../../domain/world/grid.js'
import {
  validatePlacement,
  type PlacementValidation,
} from '../../domain/simulation/phases.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import { getWaterCoverage } from '../../domain/water/water.js'
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

/**
 * Spatial consequence preview (Step 10BA). Answers, BEFORE a command, what the
 * candidate cell's road network would be — and therefore whether a Residence
 * placed there could ever be water-served and how many workplaces it could
 * reach. It creates NO new causality: every number below is read from the
 * existing 09D/09E access and 10P coverage derivations, applied to the
 * candidate cell instead of to an existing building.
 *
 * Read-only and pure: it never mutates, never reserves and never persists
 * anything, and it is computed from the same primitives the placement
 * authority uses (adjacent operational road cells -> their 09D network ->
 * whether that network is covered by an operational Well).
 */
export interface PlacementSpatialPreview {
  /** Operational road cells orthogonally adjacent to the candidate cell. */
  readonly adjacentRoads: number
  /** 09D networks those roads belong to (canonical lowest-road-id ids). */
  readonly networkIds: readonly string[]
  /** True when at least one touched network is covered by an operational Well. */
  readonly waterCovered: boolean
  /** Operational workplaces reachable through those networks. */
  readonly reachableWorkplaces: number
}

const SPATIAL_NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

export const getPlacementSpatialPreview = (
  state: SimulationState,
  cell: CellCoordinate
): PlacementSpatialPreview => {
  const networks = getRoadNetworks(state)
  const networkIdByRoad = new Map<string, string>()
  for (const network of networks) {
    const networkId = network[0]
    if (networkId === undefined) {
      continue
    }
    for (const roadId of network) {
      networkIdByRoad.set(roadId, networkId)
    }
  }
  const adjacentRoadIds: string[] = []
  for (const [dx, dy] of SPATIAL_NEIGHBOURS) {
    const roadId = getRoadIdAtCell(state, { x: cell.x + dx, y: cell.y + dy })
    if (roadId === null) {
      continue
    }
    const road = state.roads[roadId]
    if (road !== undefined && isOperationalRoad(road)) {
      adjacentRoadIds.push(roadId)
    }
  }
  const networkIds = [
    ...new Set(
      adjacentRoadIds
        .map((roadId) => networkIdByRoad.get(roadId))
        .filter((networkId): networkId is string => networkId !== undefined)
    ),
  ].sort()
  const coveredNetworkIds = getWaterCoverage(state).coveredNetworkIds
  let reachableWorkplaces = 0
  for (const building of Object.values(state.buildings).sort((a, b) =>
    a.id < b.id ? -1 : 1
  )) {
    if (!isOperationalWorkplace(building)) {
      continue
    }
    const access = getBuildingRoadAccessWithNetworks(state, building.id, networks)
    if (access.networkIds.some((networkId) => networkIds.includes(networkId))) {
      reachableWorkplaces += 1
    }
  }
  return {
    adjacentRoads: adjacentRoadIds.length,
    networkIds,
    waterCovered: networkIds.some((networkId) => coveredNetworkIds.has(networkId)),
    reachableWorkplaces,
  }
}
