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
  /**
   * Colonists whose workplace is this building, derived for rendering
   * (Step 07C §13). The renderer must not derive domain relationships itself,
   * so a staffed Workshop is distinguished from a vacant one from here.
   * Always 0 for building types that never employ anyone.
   */
  readonly workers: number
}

export interface RenderColonist {
  readonly id: string
  readonly residenceId: string | null
  /**
   * Cell of the assigned residence, derived for rendering. Step 1 contract
   * addition (renderer must not derive domain relationships itself).
   * Null when homeless (never produced in Step 0/1).
   */
  readonly cell: { readonly x: number; readonly y: number } | null
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

export const toRenderSnapshot = (state: SimulationState): RenderSnapshot => {
  const workerCounts = new Map<string, number>()
  for (const colonist of iterateColonists(state)) {
    const workplaceId = colonist.workplaceId
    if (workplaceId !== null) {
      workerCounts.set(workplaceId, (workerCounts.get(workplaceId) ?? 0) + 1)
    }
  }
  return {
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
      workers: workerCounts.get(b.id) ?? 0,
    })),
    colonists: [...iterateColonists(state)].map((c) => ({
      id: c.id,
      residenceId: c.residenceId,
      cell:
        c.residenceId !== null
          ? (() => {
              const residence = state.buildings[c.residenceId]
              return residence ? { x: residence.x, y: residence.y } : null
            })()
          : null,
    })),
  }
}
