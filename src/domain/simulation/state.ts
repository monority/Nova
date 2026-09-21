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
import type { WorldConfig } from '../world/grid.js'

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
  readonly buildings: Readonly<Record<string, BuildingState>>
  readonly colonists: Readonly<Record<string, ColonistState>>
  /** Authoritative mobility infrastructure (Step 09C). Derived road
   * connectivity is never stored here. */
  readonly roads: Readonly<Record<string, RoadState>>
  readonly counters: EntityCounters
}

/**
 * Deterministic configuration required to reproduce behavior
 * (docs/30-architecture-foundation.md, canonical state contents).
 */
export interface SimulationConfig {
  readonly world: WorldConfig
}

export const createInitialState = (config: SimulationConfig): SimulationState => {
  assertValidConfig(config)
  return {
    config,
    time: { tick: 0 },
    resources: createInitialResourceStock(),
    buildings: {},
    colonists: {},
    roads: {},
    counters: { nextBuildingId: 1, nextColonistId: 1, nextRoadId: 1 },
  }
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
