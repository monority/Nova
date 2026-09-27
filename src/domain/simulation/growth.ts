/**
 * Demand-driven settlement growth (Step G1.1).
 *
 * The first slice of the G1 product phase: once a settlement has reached
 * **Town**, it grows physically because of the demand and infrastructure the
 * player created — not on a timer.
 *
 * Causal chain (all derived from canonical state, nothing stored):
 *
 *   Town capability
 *     + no vacant Residence (housing is the binding constraint)
 *     + Water capacity headroom for one more served colonist
 *     + no current Water shortage
 *     = growth demand
 *   → deterministic eligible cell (empty, road-adjacent, on a Well-covered
 *     network, ascending (x, y))
 *   → the existing Residence construction transaction (catalog cost + ticks)
 *   → the normal construction lifecycle → housing capacity → admission → demand
 *
 * Anti-treadmill: growth is bounded by the player's Water infrastructure. A
 * Town at the Village water capacity has no headroom, so it cannot grow until
 * the player builds another Well; the new Residence then fills with a colonist,
 * consuming the headroom again. Growth is therefore a consequence of service
 * investment, not an automatic loop.
 *
 * Reuse: the construction transaction is the same `createBuilding` +
 * `deductResources` pair the `placeBuilding` command uses, with the catalog's
 * cost and construction ticks. Growth deliberately does not release the
 * protected Storage reserve (that stays a player-only affordance) and adds no
 * persisted state, so `SAVE_VERSION` is unchanged.
 */

import { BUILDING_CATALOG } from '../building/building.js'
import { availableResidenceIds } from '../housing/housing.js'
import {
  FOOD_PER_COLONIST_PER_TICK,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  deductResources,
  hasSufficientResources,
} from '../resource/resource.js'
import {
  getRoadIdAtCell,
  getRoadNetworks,
  isOperationalRoad,
} from '../road/road.js'
import { getWaterCoverage, waterProductionForTick } from '../water/water.js'
import { isInBounds, isTerrainBlocked, type CellCoordinate } from '../world/grid.js'
import {
  countStaffedOperationalWorkshops,
  foodProductionForTick,
  getPopulationCount,
  isCellBlocked,
} from './phases.js'
import { createBuilding, type SimulationState } from './state.js'

/**
 * Town capability, mirroring the derived progression contract
 * (`application/queries/progression.ts`): Village conditions (population >=
 * WATER_PER_WELL_PER_TICK, Water capacity >= WATER_PER_WELL_PER_TICK, Food
 * balance) plus a staffed operational Workshop. A cross-check test pins this
 * mirror to `getProgression(state).stage === 'town'`.
 */
const hasTownCapability = (state: SimulationState): boolean => {
  const population = getPopulationCount(state)
  return (
    population >= WATER_PER_WELL_PER_TICK &&
    waterProductionForTick(state) >= WATER_PER_WELL_PER_TICK &&
    foodProductionForTick(state) >= population * FOOD_PER_COLONIST_PER_TICK &&
    countStaffedOperationalWorkshops(state) > 0
  )
}

export interface SettlementGrowthDecision {
  /** True once the settlement has reached Town (growth's activation boundary). */
  readonly active: boolean
  /** True when the settlement wants another Residence right now. */
  readonly demand: boolean
  /** The deterministic cell growth would use, or null when none is eligible. */
  readonly cell: CellCoordinate | null
  /** True when the Residence cost is covered by the main Material stock. */
  readonly affordable: boolean
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

/**
 * Deterministic expansion cell: the first empty, in-bounds, non-blocked cell in
 * ascending (x, y) order that is orthogonally adjacent to an operational road
 * on a Well-covered network (so the new Residence will actually be served).
 * No randomness, no renderer state, no insertion order.
 */
export const getGrowthCandidateCell = (
  state: SimulationState
): CellCoordinate | null => {
  const coverage = getWaterCoverage(state)
  if (coverage.coveredNetworkIds.size === 0) {
    return null
  }
  const networkIdByRoad = new Map<string, string>()
  for (const network of getRoadNetworks(state)) {
    const networkId = network[0]
    if (networkId === undefined) continue
    for (const roadId of network) {
      networkIdByRoad.set(roadId, networkId)
    }
  }
  const { width, height } = state.config.world
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const cell = { x, y }
      if (!isInBounds(state.config.world, cell)) continue
      if (isTerrainBlocked(state.config.world, cell)) continue
      if (isCellBlocked(state, cell)) continue
      for (const [dx, dy] of NEIGHBOURS) {
        const roadId = getRoadIdAtCell(state, { x: x + dx, y: y + dy })
        if (roadId === null) continue
        const road = state.roads[roadId]
        if (road === undefined || !isOperationalRoad(road)) continue
        const networkId = networkIdByRoad.get(roadId)
        if (networkId !== undefined && coverage.coveredNetworkIds.has(networkId)) {
          return cell
        }
      }
    }
  }
  return null
}

/**
 * Derived growth decision. Pure: reads existing derived state only and never
 * mutates, caches or persists anything.
 */
export const evaluateSettlementGrowth = (
  state: SimulationState
): SettlementGrowthDecision => {
  const active = hasTownCapability(state)
  if (!active) {
    return { active: false, demand: false, cell: null, affordable: false }
  }
  const coverage = getWaterCoverage(state)
  const servedNeed =
    coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const shortage = servedNeed > 0 && state.resources.water < servedNeed
  const housingPressure = availableResidenceIds(state).length === 0
  const waterHeadroom =
    waterProductionForTick(state) >= servedNeed + WATER_PER_COLONIST_PER_TICK
  const cell = getGrowthCandidateCell(state)
  const demand = !shortage && housingPressure && waterHeadroom && cell !== null
  const affordable = hasSufficientResources(
    state.resources,
    BUILDING_CATALOG.residence.constructionCost
  )
  return { active, demand, cell, affordable }
}

/**
 * One autonomous Residence construction per tick, at most. Runs in the tick
 * pipeline after the player's command (player priority) and after road
 * progress, before upkeep. Uses the SAME construction transaction as
 * `placeBuilding` (catalog cost + construction ticks + the normal lifecycle);
 * the only difference is the source of the decision. Returns the input state
 * reference when there is no demand, no eligible cell, or it is unaffordable.
 */
export const growSettlement = (state: SimulationState): SimulationState => {
  const decision = evaluateSettlementGrowth(state)
  if (!decision.demand || !decision.affordable || decision.cell === null) {
    return state
  }
  const definition = BUILDING_CATALOG.residence
  const created = createBuilding(
    state,
    'residence',
    decision.cell.x,
    decision.cell.y,
    definition.constructionTicks
  )
  const deducted = deductResources(
    created.state.resources,
    definition.constructionCost
  )
  return { ...created.state, resources: deducted }
}
