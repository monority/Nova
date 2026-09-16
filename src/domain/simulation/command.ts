/**
 * Simulation command model (docs/13 of step0, docs/30 architecture).
 *
 * Commands are explicit player intentions. They are validated, deterministic
 * and applied by the simulation, never by UI/rendering code.
 */

import type { BuildingType } from '../building/building.js'

export interface PlaceBuildingCommand {
  readonly type: 'placeBuilding'
  readonly x: number
  readonly y: number
  readonly buildingType: BuildingType
}

export type SimulationCommand = PlaceBuildingCommand
