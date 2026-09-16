/**
 * Render snapshot projection (docs/14-rendering-architecture.md).
 *
 * canonical state -> projection -> renderer.
 * The snapshot is derived: it never mutates canonical state and never
 * becomes a second source of truth.
 */

import { iterateBuildings, iterateColonists } from '../../domain/housing/housing.js'
import type { BuildingStatus, BuildingType } from '../../domain/building/building.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export interface RenderBuilding {
  readonly id: string
  readonly type: BuildingType
  readonly x: number
  readonly y: number
  readonly status: BuildingStatus
}

export interface RenderColonist {
  readonly id: string
  readonly residenceId: string | null
}

export interface RenderSnapshot {
  readonly tick: number
  readonly world: {
    readonly width: number
    readonly height: number
  }
  readonly buildings: readonly RenderBuilding[]
  readonly colonists: readonly RenderColonist[]
}

export const toRenderSnapshot = (state: SimulationState): RenderSnapshot => ({
  tick: state.time.tick,
  world: {
    width: state.config.world.width,
    height: state.config.world.height,
  },
  buildings: [...iterateBuildings(state)].map((b) => ({
    id: b.id,
    type: b.type,
    x: b.x,
    y: b.y,
    status: b.status,
  })),
  colonists: [...iterateColonists(state)].map((c) => ({
    id: c.id,
    residenceId: c.residenceId,
  })),
})
