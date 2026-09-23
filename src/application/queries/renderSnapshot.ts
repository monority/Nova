/**
 * Render snapshot projection (docs/14-rendering-architecture.md).
 *
 * canonical state -> projection -> renderer.
 * The snapshot is derived: it never mutates canonical state and never
 * becomes a second source of truth.
 */

import { iterateBuildings, iterateColonists } from '../../domain/housing/housing.js'
import { iterateRoads } from '../../domain/road/road.js'
import { cellKey, listBlockedCells } from '../../domain/world/grid.js'
import type { RoadStatus } from '../../domain/road/road.js'
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

export interface RenderRoad {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly status: RoadStatus
  /**
   * Step 09H: orthogonal continuity, derived for presentation only (road
   * orientation is never persisted). True iff an OPERATIONAL road occupies
   * the neighbour cell; all false while this road is still under
   * construction, so a construction slab is never drawn as a connected
   * segment. The renderer consumes this instead of deriving domain
   * adjacency from the projected road list.
   */
  readonly connections: RenderRoadConnections
}

export interface RenderRoadConnections {
  readonly north: boolean
  readonly east: boolean
  readonly south: boolean
  readonly west: boolean
}

export interface RenderSnapshot {
  readonly tick: number
  readonly world: {
    readonly width: number
    readonly height: number
  }
  readonly buildings: readonly RenderBuilding[]
  readonly colonists: readonly RenderColonist[]
  /** Step 09C: authoritative road cells projected for rendering. */
  readonly roads: readonly RenderRoad[]
  /**
   * Step 10AV: terrain-blocked cells, in the canonical order of
   * `config.world.blockedCells` (never a renderer-side derivation). Empty
   * when the world has no terrain, so the renderer draws nothing. Terrain is
   * projection input only: it carries no productivity, cost or bonus.
   */
  readonly blockedCells: readonly { readonly x: number; readonly y: number }[]
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
    roads: [...iterateRoads(state)].map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      status: r.status,
      connections: roadConnections(state, r),
    })),
    blockedCells: listBlockedCells(state.config.world).map((cell) => ({
      x: cell.x,
      y: cell.y,
    })),
  }
}

/**
 * Orthogonal continuity of one road (Step 09H). Operational neighbours only;
 * under-construction roads are neither segments nor connectors (09D).
 */
const roadConnections = (
  state: SimulationState,
  road: { readonly x: number; readonly y: number; readonly status: RoadStatus }
): RenderRoadConnections => {
  if (road.status !== 'operational') {
    return NO_CONNECTIONS
  }
  const operationalCells = new Set(
    [...iterateRoads(state)]
      .filter((candidate) => candidate.status === 'operational')
      .map((candidate) => cellKey(candidate))
  )
  return {
    north: operationalCells.has(cellKey({ x: road.x, y: road.y - 1 })),
    east: operationalCells.has(cellKey({ x: road.x + 1, y: road.y })),
    south: operationalCells.has(cellKey({ x: road.x, y: road.y + 1 })),
    west: operationalCells.has(cellKey({ x: road.x - 1, y: road.y })),
  }
}

const NO_CONNECTIONS: RenderRoadConnections = {
  north: false,
  east: false,
  south: false,
  west: false,
}
