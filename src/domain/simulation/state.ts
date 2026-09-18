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
import { createInitialResourceStock, type ResourceStock } from '../resource/resource.js'
import type { WorldConfig } from '../world/grid.js'

export interface SimulationTime {
  /** Current tick. Starts at 0, increments once per completed tick. */
  readonly tick: number
}

interface EntityCounters {
  readonly nextBuildingId: number
  readonly nextColonistId: number
}

export interface SimulationState {
  readonly config: SimulationConfig
  readonly time: SimulationTime
  readonly resources: ResourceStock
  readonly buildings: Readonly<Record<string, BuildingState>>
  readonly colonists: Readonly<Record<string, ColonistState>>
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
    counters: { nextBuildingId: 1, nextColonistId: 1 },
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
  // deterministic assignJobs phase (Step 07C §4).
  const colonist: ColonistState = { id, residenceId, workplaceId: null }
  return {
    colonistId: id,
    state: {
      ...state,
      colonists: { ...state.colonists, [id]: colonist },
      counters: { ...state.counters, nextColonistId: state.counters.nextColonistId + 1 },
    },
  }
}
