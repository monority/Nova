/**
 * Residential-to-work mobility contract (Step 09G, employment gate Step 09K,
 * road-distance preference Step 09M).
 *
 * Answers two questions over the same derived road data:
 *
 *   1. does the road network currently offer a continuity between a
 *      colonist's residence and that colonist's workplace? (09G/09K)
 *   2. how far apart are two buildings along the operational road network?
 *      (09M)
 *
 *   Colonist -> residenceId  -> Residence  -> 09E road access -> networkIds
 *   Colonist -> workplaceId  -> Workplace  -> 09E road access -> networkIds
 *   connected iff the two networkId sets intersect
 *   distance  = shortest operational road path between any pair of contacts
 *
 * This is a spatial fact, not a movement model:
 *
 *   mobilityConnected  !=  "the colonist physically travels"
 *   mobilityConnected  ==  "the road network links both buildings right now"
 *   roadDistance       ==  "how many road steps separate them right now"
 *
 * Deliberately absent (Step 09G §5/§11/§12/§14, Step 09M §23): travel time,
 * speed, movement, pathfinding frameworks, vehicles, transit, congestion,
 * commute penalties, population/housing/production/food/upkeep effects.
 * Step 09K gates EMPLOYMENT on connectivity; Step 09M only orders the CHOICE
 * among already-eligible workplaces by road distance (enforced in
 * `assignJobs`, never stored here).
 *
 * Derived state only: nothing here is persisted, hashed, or stored, and no
 * cache is introduced. The single source of truth stays 09E
 * `getBuildingRoadAccess` for contacts and 09D connectivity for reachability —
 * this module intersects/measures its results, it never re-derives adjacency.
 */

import {
  getBuildingRoadAccess,
  getRoadDistance,
  type BuildingRoadAccess,
} from '../road/road.js'
import type { SimulationState } from '../simulation/state.js'

export interface ColonistWorkMobility {
  readonly colonistId: string
  /** Residence id held by the colonist, or null when homeless. */
  readonly residenceId: string | null
  /** Workplace id held by the colonist, or null when unemployed. */
  readonly workplaceId: string | null
  /** 09E networks reachable from the residence (empty when inaccessible). */
  readonly residenceNetworkIds: readonly string[]
  /** 09E networks reachable from the workplace (empty when inaccessible). */
  readonly workplaceNetworkIds: readonly string[]
  /**
   * True iff residence and workplace are both operational, both have road
   * access, and share at least one road network. Both endpoints may have
   * several networks (09E §7): the test is an intersection, never
   * "first network equals first network".
   */
  readonly mobilityConnected: boolean
}

const NO_NETWORKS: readonly string[] = []

/**
 * Shared-network test over two 09E network lists (Step 09G §7): a true set
 * intersection, never "first network equals first network". Both lists
 * arrive ascending-id sorted from 09E, so the result is deterministic.
 */
const haveSharedNetwork = (
  residenceNetworks: readonly string[],
  workplaceNetworks: readonly string[]
): boolean => {
  const workplaceSet = new Set(workplaceNetworks)
  return residenceNetworks.some((networkId) => workplaceSet.has(networkId))
}

/**
 * Pair-level mobility connectivity (Step 09K): are two buildings linked
 * through at least one common operational road network right now?
 *
 * This is the single eligibility predicate behind both the colonist query
 * below and the employment gate in `assignJobs` — one rule, not two.
 * Unknown building ids resolve to empty network lists (09E), so they are
 * simply never connected. Pure, deterministic, derived only.
 */
export const areBuildingsMobilityConnected = (
  state: SimulationState,
  buildingAId: string,
  buildingBId: string
): boolean => {
  const accessA = getBuildingRoadAccess(state, buildingAId)
  if (!accessA.hasRoadAccess) {
    return false
  }
  const accessB = getBuildingRoadAccess(state, buildingBId)
  if (!accessB.hasRoadAccess) {
    return false
  }
  return haveSharedNetwork(accessA.networkIds, accessB.networkIds)
}

/**
 * Shortest operational-road distance between two buildings (Step 09M).
 *
 * Contract: buildings are not road cells, so each side contributes its
 * 09E contact roads (all orthogonally adjacent OPERATIONAL roads) and the
 * distance is the minimum over every contact pair of the 09M road distance
 * (`getRoadDistance`, BFS edges over operational roads only).
 *
 * Consequences, all deliberate:
 * - two buildings sharing a contact road are at distance 0;
 * - a residence adjacent to several roads is not penalised by the first
 *   contact found: the minimum over all its contacts wins;
 * - a Workshop adjacent to several roads is measured through its best
 *   contact;
 * - under-construction roads never contribute (09E excludes them);
 * - `null` means "no operational road path" — the same condition as
 *   `areBuildingsMobilityConnected` returning false.
 *
 * Pure, deterministic and derived only: it reads canonical state, is never
 * persisted, never hashed, and never cached.
 */
export const getRoadDistanceBetweenBuildings = (
  state: SimulationState,
  buildingAId: string,
  buildingBId: string
): number | null => {
  const accessA = getBuildingRoadAccess(state, buildingAId)
  if (!accessA.hasRoadAccess) {
    return null
  }
  const accessB = getBuildingRoadAccess(state, buildingBId)
  if (!accessB.hasRoadAccess) {
    return null
  }
  return getRoadDistance(state, accessA.roadIds, accessB.roadIds)
}

/** Absent/unresolvable endpoint: an explicit "no mobility relationship". */
const noMobility = (
  colonistId: string,
  residenceId: string | null,
  workplaceId: string | null
): ColonistWorkMobility => ({
  colonistId,
  residenceId,
  workplaceId,
  residenceNetworkIds: NO_NETWORKS,
  workplaceNetworkIds: NO_NETWORKS,
  mobilityConnected: false,
})

/**
 * Derived mobility relationship of one colonist (Step 09G §4).
 *
 * Pure and deterministic: the result depends only on canonical state
 * (colonist reference, buildings, roads) and never on record insertion
 * order — 09E `getBuildingRoadAccess` is ascending-id deterministic and the
 * intersection below is computed on sorted lists.
 *
 * Unknown colonist, homeless colonist, unemployed colonist, unknown
 * endpoint, under-construction endpoint, missing/under-construction road, or
 * diagonal-only road: `mobilityConnected` false — the same operational
 * rules 09E already applies.
 *
 * Two 09E derivations per call: a local, per-call cache (never persisted)
 * is deliberately not introduced yet (Step 09G §13) — the colony scale this
 * contract runs at does not justify one, and a cache would be the first step
 * toward the canonical mobility state 09G explicitly refuses.
 */
export const getColonistWorkMobility = (
  state: SimulationState,
  colonistId: string
): ColonistWorkMobility => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) {
    return noMobility(colonistId, null, null)
  }
  const residenceId = colonist.residenceId
  const workplaceId = colonist.workplaceId
  if (residenceId === null || workplaceId === null) {
    return noMobility(colonistId, residenceId, workplaceId)
  }
  const residence: BuildingRoadAccess = getBuildingRoadAccess(
    state,
    residenceId
  )
  const workplace: BuildingRoadAccess = getBuildingRoadAccess(
    state,
    workplaceId
  )
  return {
    colonistId,
    residenceId,
    workplaceId,
    residenceNetworkIds: residence.networkIds,
    workplaceNetworkIds: workplace.networkIds,
    mobilityConnected: haveSharedNetwork(
      residence.networkIds,
      workplace.networkIds
    ),
  }
}
