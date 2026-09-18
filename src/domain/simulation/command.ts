/**
 * Simulation command model (docs/13 of step0, docs/30 architecture).
 *
 * Commands are explicit player intentions. They are validated, deterministic
 * and applied by the simulation, never by UI/rendering code.
 */

import type { BuildingType } from '../building/building.js'
import type { CellCoordinate } from '../world/grid.js'

export interface PlaceBuildingCommand {
  readonly type: 'placeBuilding'
  readonly x: number
  readonly y: number
  readonly buildingType: BuildingType
}

/**
 * Multi-cell mobility construction (Step 09C Phase G). One command carries
 * the whole drag: the domain normalizes (dedupe + deterministic order),
 * validates the entire set, prices the total, and applies all cells or
 * rejects with zero mutation. Atomic from the simulation's point of view.
 */
export interface PlaceRoadsCommand {
  readonly type: 'placeRoads'
  readonly cells: readonly CellCoordinate[]
}

export type SimulationCommand = PlaceBuildingCommand | PlaceRoadsCommand
