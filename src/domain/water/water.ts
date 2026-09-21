/**
 * Water service & coverage domain model (Step 10P).
 *
 * The second essential service, kept concrete: one resource (`water`), one
 * building (`well`), one derived coverage rule. No generic Service/Producer
 * abstraction, no pipes, no logistics, no travel simulation.
 *
 * Contract:
 *
 *   Well (operational + road-accessible)
 *       -> covers the road networks it touches
 *   Residence
 *       -> is water-served while it shares a covered road network
 *   colonist
 *       -> is water-served while their Residence is water-served
 *
 * Coverage is DERIVED from the existing 09D road networks and 09E building
 * access — never stored, never hashed, never persisted. Production itself is
 * staffed-only (see `waterProductionForTick`), so an unstaffed Well provides
 * coverage (service availability) but no supply (resource availability).
 *
 * NOTE (documented Step 10P correction): Step 10O proposed requiring a
 * *staffed* Well for coverage. That is impossible at bootstrap — the first
 * colonist needs water service to be admitted, but only a colonist can staff
 * the Well. Coverage therefore requires an operational, road-accessible Well;
 * staffing still gates Water *production*, so an unstaffed Well cannot
 * sustain growth beyond the first colonist.
 */

import { iterateBuildings, iterateColonists } from '../housing/housing.js'
import { countWorkersAt, isOperationalWell } from '../jobs/jobs.js'
import {
  getBuildingRoadAccess,
  getBuildingRoadAccessWithNetworks,
  getRoadNetworks,
} from '../road/road.js'
import {
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
} from '../resource/resource.js'
import type { SimulationState } from '../simulation/state.js'

export interface WaterCoverage {
  /** Road networks (09D lowest-road-id ids) covered by an operational Well. */
  readonly coveredNetworkIds: ReadonlySet<string>
  /** Operational Residences sharing a covered network, ascending id order. */
  readonly servedResidenceIds: readonly string[]
  /** Colonists whose Residence is water-served, ascending colonist id order. */
  readonly servedColonistIds: readonly string[]
}

/**
 * Derived water coverage for the whole colony. Pure and deterministic:
 * `getRoadNetworks`, `iterateBuildings`, `iterateColonists` are all
 * ascending-id deterministic. One 09D network derivation per call, reused for
 * every Well and Residence (no per-pair BFS).
 */
export const getWaterCoverage = (state: SimulationState): WaterCoverage => {
  const networks = getRoadNetworks(state)
  const coveredNetworkIds = new Set<string>()
  for (const building of iterateBuildings(state)) {
    if (!isOperationalWell(building)) {
      continue
    }
    const access = getBuildingRoadAccessWithNetworks(
      state,
      building.id,
      networks
    )
    if (!access.hasRoadAccess) {
      continue
    }
    for (const networkId of access.networkIds) {
      coveredNetworkIds.add(networkId)
    }
  }

  const networkIdsOfResidence = (residenceId: string): readonly string[] => {
    const building = state.buildings[residenceId]
    if (
      building === undefined ||
      building.type !== 'residence' ||
      building.status !== 'operational'
    ) {
      return []
    }
    return getBuildingRoadAccessWithNetworks(state, residenceId, networks)
      .networkIds
  }
  const isServed = (residenceId: string): boolean =>
    networkIdsOfResidence(residenceId).some((networkId) =>
      coveredNetworkIds.has(networkId)
    )

  const servedResidenceIds: string[] = []
  for (const building of iterateBuildings(state)) {
    if (
      building.type === 'residence' &&
      building.status === 'operational' &&
      isServed(building.id)
    ) {
      servedResidenceIds.push(building.id)
    }
  }

  const servedColonistIds: string[] = []
  for (const colonist of iterateColonists(state)) {
    if (colonist.residenceId !== null && isServed(colonist.residenceId)) {
      servedColonistIds.push(colonist.id)
    }
  }

  return { coveredNetworkIds, servedResidenceIds, servedColonistIds }
}

/**
 * Staffed operational Wells (mirror of countStaffedOperationalWorkshops).
 * Deterministic ascending-id iteration.
 */
export const countStaffedOperationalWells = (
  state: SimulationState
): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (isOperationalWell(building) && countWorkersAt(state, building.id) > 0) {
      count += 1
    }
  }
  return count
}

/**
 * True once the colony owns at least one operational Well. This activates the
 * Water admission gate (Step 10P bootstrap rule, documented in Step10P.md):
 * until a Well exists, the historical Food + housing admission rule applies,
 * because no colonist can exist to staff a Well before the first admission.
 */
export const hasOperationalWell = (state: SimulationState): boolean => {
  for (const building of iterateBuildings(state)) {
    if (isOperationalWell(building)) {
      return true
    }
  }
  return false
}

/**
 * Water actually produced this tick: staffed operational Wells WITH road
 * access, mirroring the 09F Workshop production contract. Vacant, roadless or
 * under-construction Wells produce exactly 0.
 */
export const waterProductionForTick = (state: SimulationState): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (!isOperationalWell(building)) {
      continue
    }
    if (countWorkersAt(state, building.id) === 0) {
      continue
    }
    if (!getBuildingRoadAccess(state, building.id).hasRoadAccess) {
      continue
    }
    total += WATER_PER_WELL_PER_TICK
  }
  return total
}

/** Water required this tick: one unit per water-served colonist. */
export const waterNeedForTick = (state: SimulationState): number =>
  getWaterCoverage(state).servedColonistIds.length *
  WATER_PER_COLONIST_PER_TICK

/** Derived water supply status (never stored). */
export interface WaterStatus {
  readonly servedResidenceCount: number
  readonly servedColonistCount: number
  readonly productionPerTick: number
  readonly needPerTick: number
  readonly stock: number
  /** True when served colonists exist and the stock cannot cover their need. */
  readonly shortage: boolean
}

export const getWaterStatus = (state: SimulationState): WaterStatus => {
  const coverage = getWaterCoverage(state)
  const need = coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  return {
    servedResidenceCount: coverage.servedResidenceIds.length,
    servedColonistCount: coverage.servedColonistIds.length,
    productionPerTick: waterProductionForTick(state),
    needPerTick: need,
    stock: state.resources.water,
    shortage: need > 0 && state.resources.water < need,
  }
}
