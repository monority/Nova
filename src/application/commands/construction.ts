import { placeBuilding as placeBuildingInCity, removeBuilding as removeBuildingFromCity, type PlacementResult, type RemoveBuildingResult } from '../../domain/construction'
import type { BuildingId, BuildingTypeId, GridPosition } from '../../domain/city'
import type { SimulationRuntimePort } from '../contracts/simulation-runtime'

export interface PlaceBuildingCommand {
  readonly type: BuildingTypeId
  readonly position: GridPosition
}

export interface RemoveBuildingCommand {
  readonly buildingId: BuildingId
}

export function placeBuilding(runtime: SimulationRuntimePort, command: PlaceBuildingCommand): PlacementResult {
  const state = runtime.getState()
  const result = placeBuildingInCity(state.world, state.city, command.type, command.position)
  if (result.valid) runtime.commitState({ ...state, city: result.city })
  return result
}

export function removeBuilding(runtime: SimulationRuntimePort, command: RemoveBuildingCommand): RemoveBuildingResult {
  const state = runtime.getState()
  const result = removeBuildingFromCity(state.city, command.buildingId)
  if (result.removed) runtime.commitState({ ...state, city: result.city })
  return result
}
