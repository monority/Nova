/**
 * Demand-driven settlement growth (Step G1.1, refined by Step G1.2).
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
 *     network, NEAREST to the existing settlement, tie-broken by (x, y))
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
 *
 * Step G1.2 spatial coherence: the expansion cell is the eligible cell closest
 * to the existing settlement (Manhattan distance to the nearest building), with
 * an ascending (x, y) tie-break. This replaces the plain ascending (x, y) scan
 * that could grow on the opposite side of the board from the settlement.
 */

import { BUILDING_CATALOG } from '../building/building.js'
import { availableResidenceIds, iterateBuildings } from '../housing/housing.js'
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

/**
 * Why settlement growth is not currently happening. `null` means the
 * settlement is ready to grow (demand and affordability both hold). This is
 * derived feedback only — never persisted, never a hidden counter.
 */
export type GrowthBlocker =
  | 'notTown'
  | 'noHousingPressure'
  | 'waterShortage'
  | 'noWaterHeadroom'
  | 'noEligibleCell'
  | 'unaffordable'

export interface SettlementGrowthDecision {
  /** True once the settlement has reached Town (growth's activation boundary). */
  readonly active: boolean
  /** True when the settlement wants another Residence right now. */
  readonly demand: boolean
  /** The deterministic cell growth would use, or null when none is eligible. */
  readonly cell: CellCoordinate | null
  /** True when the Residence cost is covered by the main Material stock. */
  readonly affordable: boolean
  /** The single derived cause growth is waiting on, or null when ready. */
  readonly blocker: GrowthBlocker | null
  /** Convenience: `blocker === null` (demand + affordable + eligible). */
  readonly ready: boolean
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const manhattan = (
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number }
): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/**
 * Deterministic expansion cell (Step G1.2): among the eligible cells — empty,
 * in-bounds, non-blocked, orthogonally adjacent to an operational road on a
 * Well-covered network — pick the one **nearest to the existing settlement**
 * (minimum Manhattan distance to the nearest building of any type), ties broken
 * by ascending (x, y). No randomness, no renderer state, no insertion order.
 *
 * Growth therefore extends the settlement outward from where it already is,
 * instead of filling the lowest-coordinate eligible cell anywhere on the board.
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
  const buildings = [...iterateBuildings(state)]
  let best: { readonly cell: CellCoordinate; readonly distance: number } | null = null
  const { width, height } = state.config.world
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const cell = { x, y }
      if (!isInBounds(state.config.world, cell)) continue
      if (isTerrainBlocked(state.config.world, cell)) continue
      if (isCellBlocked(state, cell)) continue
      let served = false
      for (const [dx, dy] of NEIGHBOURS) {
        const roadId = getRoadIdAtCell(state, { x: x + dx, y: y + dy })
        if (roadId === null) continue
        const road = state.roads[roadId]
        if (road === undefined || !isOperationalRoad(road)) continue
        const networkId = networkIdByRoad.get(roadId)
        if (networkId !== undefined && coverage.coveredNetworkIds.has(networkId)) {
          served = true
          break
        }
      }
      if (!served) continue
      let distance = Number.POSITIVE_INFINITY
      for (const building of buildings) {
        distance = Math.min(distance, manhattan(cell, building))
      }
      if (best === null || distance < best.distance) {
        best = { cell, distance }
      }
    }
  }
  return best === null ? null : best.cell
}

/**
 * Derived growth decision. Pure: reads existing derived state only and never
 * mutates, caches or persists anything.
 */
export const evaluateSettlementGrowth = (
  state: SimulationState
): SettlementGrowthDecision => {
  const active = hasTownCapability(state)
  const coverage = getWaterCoverage(state)
  const servedNeed =
    coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const shortage = servedNeed > 0 && state.resources.water < servedNeed
  const housingPressure = availableResidenceIds(state).length === 0
  const waterHeadroom =
    waterProductionForTick(state) >= servedNeed + WATER_PER_COLONIST_PER_TICK
  const cell = active ? getGrowthCandidateCell(state) : null
  const demand = active && !shortage && housingPressure && waterHeadroom && cell !== null
  const affordable = hasSufficientResources(
    state.resources,
    BUILDING_CATALOG.residence.constructionCost
  )
  // One derived cause, in causal order (the first thing the player can act on).
  let blocker: GrowthBlocker | null = null
  if (!active) blocker = 'notTown'
  else if (!housingPressure) blocker = 'noHousingPressure'
  else if (shortage) blocker = 'waterShortage'
  else if (!waterHeadroom) blocker = 'noWaterHeadroom'
  else if (cell === null) blocker = 'noEligibleCell'
  else if (!affordable) blocker = 'unaffordable'
  return {
    active,
    demand,
    cell,
    affordable,
    blocker,
    ready: blocker === null,
  }
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
  if (!decision.ready || decision.cell === null) {
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
