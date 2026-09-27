/**
 * Placement affordability query (Step 10AD-1, extended Step 10CT).
 *
 * ONE concrete predicate shared by the hover feedback and the authoritative
 * dispatch gate, so the UI can never drift from the domain rule:
 *
 *   affordable = validatePlacement accepts the cell
 *              | the only failure is missing Material
 *                AND this tick's STORED Workshop inflow / workforce income
 *                    completes it
 *              | the only failure is missing Material
 *                AND the Step 10BJ protected Storage release completes it
 *
 * Why the inflow clause exists (Step 08G §5, Step 10AD): the construction
 * transaction runs mid-tick, AFTER `produceMaterial` stored this tick's output
 * and BEFORE `upkeepBuildings` drains it. A lone staffed Workshop equilibrates
 * at 24 Material (stored 1 − upkeep 1 = net 0), so a 25-cost building is
 * reachable exactly on that tick. The stock query alone would report
 * "insufficient material" for a placement the domain accepts.
 *
 * Why the reserve clause exists (Step 10CT): the dispatch pipeline releases
 * Material above the protected Storage floor for a valid building command
 * BEFORE it validates (`releaseMaterialForCommand`, Step 10BJ). The stock
 * query alone would refuse a placement the domain funds from that reserve.
 *
 * It mirrors the existing dispatch check, reads only existing derived queries,
 * and never predicts future ticks. Water (Step 10AD) is part of the placement
 * contract, so it is surfaced here too — neither stored Material nor the
 * reserve ever covers a Water shortfall.
 */

import { getBuildingDefinition, type BuildingType } from '../../domain/building/building.js'
import { isOperationalWorkplace } from '../../domain/jobs/jobs.js'
import {
  getBuildingRoadAccessWithNetworks,
  getRoadIdAtCell,
  getRoadNetworks,
  isOperationalRoad,
  normalizeRoadCells,
  ROAD_CONSTRUCTION_COST,
} from '../../domain/road/road.js'
import type { CellCoordinate } from '../../domain/world/grid.js'
import {
  validatePlacement,
  validateRoadsPlacement,
  type PlacementValidation,
  type RoadPlacementValidation,
} from '../../domain/simulation/phases.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import { getWaterCoverage } from '../../domain/water/water.js'
import { releaseProtectedMaterialReserve } from '../../domain/storage/storage.js'
import { getWorkforceIncome } from './inspection.js'
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
  /** True when the same-tick stored inflow or income completes the Material cost. */
  readonly coveredBySameTickInflow: boolean
  /**
   * True when the Step 10BJ protected Storage release is what completes the
   * Material cost (and the same-tick inflow alone would not).
   */
  readonly coveredByProtectedReserve: boolean
  /**
   * Material the protected reserve releases for this placement (Storage above
   * the 15-unit floor, capped at the deficit). 0 when not a Material shortfall.
   */
  readonly releasedFromStorage: number
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
  // Step 10CQ: income is credited before commands, so a shortfall may also be
  // covered by this tick's workforce income (not just stored Workshop production).
  const coveredBySameTickInflow =
    !placement.valid &&
    placement.reason === 'insufficientResources' &&
    stock.water >= waterRequired &&
    stock.construction + getMaterialStoredProductionPerTick(state) + getWorkforceIncome(state) >= materialRequired
  // Step 10CT: the building command releases Material above the protected
  // Storage floor BEFORE it validates (Step 10BJ `releaseMaterialForCommand`).
  // Mirror that release here, or the hover gate refuses a placement the
  // domain builds. The release consumes the deficit from the reserve and also
  // shrinks this tick's storage clamp, so stored production is derived from the
  // RELEASED stock — not the current one. Water is checked first: an
  // insufficient Water investment makes the preflight release fail, so the
  // reserve must never mask it.
  let coveredByProtectedReserve = false
  let releasedFromStorage = 0
  if (
    !placement.valid &&
    placement.reason === 'insufficientResources' &&
    stock.water >= waterRequired &&
    !coveredBySameTickInflow
  ) {
    const release = releaseProtectedMaterialReserve(
      state.storage,
      stock.construction,
      materialRequired
    )
    releasedFromStorage = release.releaseAmount
    if (release.releaseAmount > 0) {
      const storedAfterRelease = getMaterialStoredProductionPerTick({
        ...state,
        resources: { ...state.resources, construction: release.operationalMaterial },
      })
      coveredByProtectedReserve =
        release.operationalMaterial +
          storedAfterRelease +
          getWorkforceIncome(state) >=
        materialRequired
    }
  }
  return {
    placement,
    affordable:
      placement.valid || coveredBySameTickInflow || coveredByProtectedReserve,
    materialRequired,
    materialAvailable: stock.construction,
    waterRequired,
    waterAvailable: stock.water,
    coveredBySameTickInflow,
    coveredByProtectedReserve,
    releasedFromStorage,
  }
}

/**
 * Road placement affordability query (Step 10CS).
 *
 * The second Material expenditure path gets the same contract as
 * `getPlacementAffordability`: ONE derived predicate that predicts what the
 * authoritative dispatch gate will accept, so the hover/commit feedback can
 * never refuse a road the domain would build.
 *
 * Why the same-tick inflow clause exists: the construction transaction runs
 * mid-tick, AFTER `produceMaterial` stored this tick's output and AFTER
 * `creditMaterialIncome` credited this tick's income. A road set whose cost is
 * covered by `stock + stored production + income` is therefore accepted even
 * when the current stock alone is short.
 *
 * Deliberately NOT generalised to the protected Storage reserve: Step 10BJ
 * releases that reserve for valid BUILDING commands only, and road placement
 * has no Water cost. The clause mirrors exactly the road pipeline, nothing
 * more.
 */
export interface RoadPlacementAffordability {
  /** The authoritative validation result for the cell set (unchanged). */
  readonly placement: RoadPlacementValidation
  /**
   * True when the authoritative dispatch gate would accept this road set:
   * `placement.valid`, or Material covered by this tick's inflow.
   */
  readonly affordable: boolean
  readonly materialRequired: number
  readonly materialAvailable: number
  /** True when this tick's stored production or income completes the cost. */
  readonly coveredBySameTickInflow: boolean
}

export const getRoadsPlacementAffordability = (
  state: SimulationState,
  cells: readonly CellCoordinate[]
): RoadPlacementAffordability => {
  const placement = validateRoadsPlacement(state, cells)
  const materialRequired =
    normalizeRoadCells(cells).length * ROAD_CONSTRUCTION_COST
  const materialAvailable = getResourceStock(state).construction
  const coveredBySameTickInflow =
    !placement.valid &&
    placement.reason === 'insufficientResources' &&
    materialAvailable +
      getMaterialStoredProductionPerTick(state) +
      getWorkforceIncome(state) >=
      materialRequired
  return {
    placement,
    affordable: placement.valid || coveredBySameTickInflow,
    materialRequired,
    materialAvailable,
    coveredBySameTickInflow,
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
