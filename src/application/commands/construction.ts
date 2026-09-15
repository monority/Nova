import { placeBuilding as placeBuildingInCity, placeRoad as placeRoadInCity, removeBuilding as removeBuildingFromCity, removeRoad as removeRoadFromCity, type PlacementResult, type RemoveBuildingResult, type RoadPlacementResult } from '../../domain/construction'
import type { BuildingId, BuildingTypeId, GridPosition, RoadId } from '../../domain/city'
import type { SimulationRuntimePort } from '../contracts/simulation-runtime'

export interface PlaceBuildingCommand {
  readonly type: BuildingTypeId
  readonly position: GridPosition
}

export interface RemoveBuildingCommand {
  readonly buildingId: BuildingId
}

export interface PlaceRoadCommand {
  readonly position: GridPosition
}

export interface RemoveRoadCommand {
  readonly roadId: RoadId
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

export function placeRoad(runtime: SimulationRuntimePort, command: PlaceRoadCommand): RoadPlacementResult {
  const state = runtime.getState()
  const result = placeRoadInCity(state.world, state.city, command.position)
  if (result.valid) runtime.commitState({ ...state, city: result.city })
  return result
}

export function removeRoad(runtime: SimulationRuntimePort, command: RemoveRoadCommand): RemoveBuildingResult {
  const state = runtime.getState()
  const result = removeRoadFromCity(state.city, command.roadId)
  if (result.removed) runtime.commitState({ ...state, city: result.city })
  return result
}
