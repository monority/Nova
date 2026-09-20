/**
 * Residential-to-work mobility contract (Step 09G, employment gate Step 09K).
 *
 * Answers one question only: does the road network currently offer a
 * continuity between a colonist's residence and that colonist's workplace?
 *
 *   Colonist -> residenceId  -> Residence  -> 09E road access -> networkIds
 *   Colonist -> workplaceId  -> Workplace  -> 09E road access -> networkIds
 *   connected iff the two networkId sets intersect
 *
 * This is a spatial fact, not a movement model:
 *
 *   mobilityConnected  !=  "the colonist physically travels"
 *   mobilityConnected  ==  "the road network links both buildings right now"
 *
 * Deliberately absent (Step 09G §5/§11/§12/§14): distance, travel time,
 * pathfinding, vehicles, transit, congestion, commute penalties,
 * population/housing/production/food/upkeep effects. Step 09K adds exactly
 * one gameplay consequence on top of 09F: employment eligibility requires
 * mobility connectivity (enforced in `assignJobs`, never stored here).
 *
 * Derived state only: nothing here is persisted, hashed, or stored, and no
 * cache is introduced. The single source of truth stays 09E
 * `getBuildingRoadAccess` — this module intersects its results, it never
 * re-derives adjacency or connectivity.
 */

import {
  getBuildingRoadAccess,
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
