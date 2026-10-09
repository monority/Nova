/**
 * Canonical simulation state (docs/22-canonical-simulation.md).
 *
 * One authoritative state. Contains only what is needed to reproduce and
 * advance the world. No rendering, UI or platform data.
 *
 * Determinism rules:
 * - entity maps are Records; all iteration must be sorted (housing.ts);
 * - IDs come from canonical counters, never from randomness;
 * - simulation time is explicit, never wall-clock.
 */

import type { BuildingState, BuildingType } from '../building/building.js'
import type { ColonistState } from '../population/colonist.js'
import { ROAD_CONSTRUCTION_TICKS, type RoadState } from '../road/road.js'
import { createInitialResourceStock, type ResourceStock } from '../resource/resource.js'
import { createInitialStorageHub, type StorageHub } from '../storage/storage.js'
import {
  cellKey,
  isInBounds,
  isTerrainBlocked,
  listBlockedCells,
  normalizeBlockedCells,
  type WorldConfig,
} from '../world/grid.js'
import { hasDepositAt, normalizeDeposits, type Deposits } from '../world/deposits.js'

export interface SimulationTime {
  /** Current tick. Starts at 0, increments once per completed tick. */
  readonly tick: number
}

interface EntityCounters {
  readonly nextBuildingId: number
  readonly nextColonistId: number
  readonly nextRoadId: number
}

export interface SimulationState {
  readonly config: SimulationConfig
  readonly time: SimulationTime
  readonly resources: ResourceStock
  /** Centralized storage hub (Step 10BG). Aggregates surplus production
   * for strategic buffering. */
  readonly storage: StorageHub
  readonly buildings: Readonly<Record<string, BuildingState>>
  readonly colonists: Readonly<Record<string, ColonistState>>
  /** Authoritative mobility infrastructure (Step 09C). Derived road
   * connectivity is never stored here. */
  readonly roads: Readonly<Record<string, RoadState>>
  /** Finite wood deposits present in the sector (Step003). Mutable state:
   * extraction decrements `remaining`; exhausted deposits stay with 0. */
  readonly woodDeposits: Deposits
  /** Finite stone deposits present in the sector (Step005). Same rules. */
  readonly stoneDeposits: Deposits
  readonly counters: EntityCounters
}

/**
 * Deterministic configuration required to reproduce behavior
 * (docs/30-architecture-foundation.md, canonical state contents).
 */
export interface SimulationConfig {
  readonly world: WorldConfig
}

/**
 * Canonical world normalization (Step 10AV). Terrain is stored in exactly one
 * form: validated keys, deduplicated, sorted by (x, y). An EMPTY list is
 * dropped so "no terrain" has a single representation (the absent field) and
 * a terrain-free world keeps its historical canonical form and hash. A
 * malformed key throws here, at the only place a world is constructed.
 */
export const normalizeWorldConfig = (world: WorldConfig): WorldConfig => {
  const blocked = world.blockedCells
  if (blocked === undefined) {
    return world
  }
  const normalized = normalizeBlockedCells(blocked)
  if (normalized.length === 0) {
    return { seed: world.seed, width: world.width, height: world.height }
  }
  return { ...world, blockedCells: normalized }
}

/** The same normalization applied to a whole simulation config. */
export const normalizeConfig = (config: SimulationConfig): SimulationConfig => {
  const world = normalizeWorldConfig(config.world)
  return world === config.world ? config : { world }
}

export const createInitialState = (config: SimulationConfig): SimulationState => {
  const normalized = normalizeConfig(config)
  assertValidConfig(normalized)
  const world = normalized.world
  const base: SimulationState = {
    config: normalized,
    time: { tick: 0 },
    resources: createInitialResourceStock(),
    storage: createInitialStorageHub(),
    buildings: {},
    colonists: {},
    roads: {},
    woodDeposits: normalizeDeposits(world.woodDeposits ?? []),
    stoneDeposits: normalizeDeposits(world.stoneDeposits ?? []),
    // planks live in resources (Step006); no separate state field.
    counters: { nextBuildingId: 1, nextColonistId: 1, nextRoadId: 1 },
  }
  // Step004 (audit D4, day-0 bootstrap hardening): every new colony owns
  // exactly one Colony Center — the settlement anchor that guarantees the
  // primitive recovery path from tick 0. Placed at the first valid cell in
  // deterministic bottom-right (y, x) scan order: in bounds, not
  // terrain-blocked, not a wood deposit. Operational from tick 0 (it is the
  // founding structure, not a construction project). A world without a
  // single valid cell cannot host a colony at all — that is a config error,
  // thrown here.
  const cell = firstAnchorCell(world, base.woodDeposits, base.stoneDeposits)
  if (cell === null) {
    throw new Error(
      'Invalid world: no buildable cell available for the Colony Center'
    )
  }
  return {
    ...base,
    buildings: {
      [COLONY_CENTER_ID]: {
        id: COLONY_CENTER_ID,
        type: 'colonyCenter',
        x: cell.x,
        y: cell.y,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

/** The canonical Colony Center building id (Step004). Deliberately NOT from
 * the `building-N` counter: pre-placing the anchor must not shift the ids of
 * the player's own first buildings. */
export const COLONY_CENTER_ID = 'colony-center'

/**
 * First cell (bottom-right scan order: y descending, then x descending) that
 * can host the Colony Center: in bounds, not terrain-blocked, not a wood
 * deposit. Deterministic per world. The bottom-right preference keeps the
 * anchor clear of the origin-anchored fixture/scenario building space.
 */
const firstAnchorCell = (
  world: WorldConfig,
  wood: Deposits,
  stone: Deposits
): { readonly x: number; readonly y: number } | null => {
  for (let y = world.height - 1; y >= 0; y -= 1) {
    for (let x = world.width - 1; x >= 0; x -= 1) {
      const cell = { x, y }
      if (!isInBounds(world, cell)) continue
      if (isTerrainBlocked(world, cell)) continue
      if (hasDepositAt(wood, x, y)) continue
      if (hasDepositAt(stone, x, y)) continue
      return cell
    }
  }
  return null
}

const assertValidConfig = (config: SimulationConfig): void => {
  const { world } = config
  if (!Number.isInteger(world.width) || world.width < 1) {
    throw new Error('world.width must be a positive integer')
  }
  if (!Number.isInteger(world.height) || world.height < 1) {
    throw new Error('world.height must be a positive integer')
  }
  if (world.seed.length === 0) {
    throw new Error('world.seed must be a non-empty string')
  }
  // Step 10AV: terrain must address real cells of THIS world. Format and
  // canonical order are already guaranteed by normalizeWorldConfig; bounds
  // cannot be checked without the dimensions, so they are checked here.
  for (const cell of listBlockedCells(world)) {
    if (!isInBounds(world, cell)) {
      throw new Error(`world.blockedCells out of bounds: ${cellKey(cell)}`)
    }
  }
}

export const makeBuildingId = (n: number): string => `building-${n}`
export const makeColonistId = (n: number): string => `colonist-${n}`
export const makeRoadId = (n: number): string => `road-${n}`

export const createBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number,
  constructionTicks: number
): { state: SimulationState; buildingId: string } => {
  const id = makeBuildingId(state.counters.nextBuildingId)
  const building: BuildingState = {
    id,
    type,
    x,
    y,
    status: 'underConstruction',
    constructionRemaining: constructionTicks,
  }
  return {
    buildingId: id,
    state: {
      ...state,
      buildings: { ...state.buildings, [id]: building },
      counters: { ...state.counters, nextBuildingId: state.counters.nextBuildingId + 1 },
    },
  }
}

export const createColonist = (
  state: SimulationState,
  residenceId: string
): { state: SimulationState; colonistId: string } => {
  const id = makeColonistId(state.counters.nextColonistId)
  // New colonists start unemployed: employment is granted only by the
  // deterministic assignJobs phase (Step 07C §4). Step 10M: the initial
  // assignment mode is `automatic`, so pre-10M behavior is unchanged.
  const colonist: ColonistState = {
    id,
    residenceId,
    workplaceId: null,
    workplaceAssignmentMode: 'automatic',
    // Step 10Y: a new colonist never starts on a construction crew.
    constructionAssignmentId: null,
  }
  return {
    colonistId: id,
    state: {
      ...state,
      colonists: { ...state.colonists, [id]: colonist },
      counters: { ...state.counters, nextColonistId: state.counters.nextColonistId + 1 },
    },
  }
}

/**
 * Create road pieces for already-normalized cells (Step 09C). IDs allocate
 * in cell order from the canonical nextRoadId counter — never random, never
 * wall-clock. Every road starts underConstruction with the domain
 * ROAD_CONSTRUCTION_TICKS duration.
 */
export const createRoads = (
  state: SimulationState,
  cells: readonly { readonly x: number; readonly y: number }[]
): { state: SimulationState; roadIds: string[] } => {
  const roadIds: string[] = []
  let nextId = state.counters.nextRoadId
  let roads = state.roads
  for (const cell of cells) {
    const id = makeRoadId(nextId)
    nextId += 1
    const road: RoadState = {
      id,
      x: cell.x,
      y: cell.y,
      status: 'underConstruction',
      constructionRemaining: ROAD_CONSTRUCTION_TICKS,
    }
    roads = { ...roads, [id]: road }
    roadIds.push(id)
  }
  return {
    roadIds,
    state: {
      ...state,
      roads,
      counters: { ...state.counters, nextRoadId: nextId },
    },
  }
}
