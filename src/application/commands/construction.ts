import { placeBuilding as placeBuildingInCity, placeRoad as placeRoadInCity, removeBuilding as removeBuildingFromCity, removeRoad as removeRoadFromCity, type PlacementResult, type RemoveBuildingResult, type RoadPlacementResult } from '../../domain/construction'
import type { BuildingId, BuildingTypeId, GridPosition, RoadId } from '../../domain/city'
import type { SimulationRuntimePort } from '../contracts/simulation-runtime'
import { clampPopulationToHousing } from '../../domain/population'
import { createZone, placeCommunityService, removeCommunityService, type ZonePlacementResult, type ZoneType, type ServicePlacementResult } from '../../domain/city'

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

export interface CreateZoneCommand { readonly type: ZoneType; readonly cells: readonly GridPosition[] }
export interface RemoveZoneCommand { readonly zoneId: string }
export interface PlaceServiceCommand { readonly position: GridPosition }

export function createDevelopmentZone(runtime: SimulationRuntimePort, command: CreateZoneCommand): ZonePlacementResult {
  const state = runtime.getState()
  const result = createZone(state.world, state.city.zones, command.type, command.cells, state.city.nextZoneSequence)
  if (result.valid) runtime.commitState({ ...state, city: { ...state.city, zones: result.zones, nextZoneSequence: state.city.nextZoneSequence + 1 } })
  return result
}

export function removeDevelopmentZone(runtime: SimulationRuntimePort, command: RemoveZoneCommand): void {
  const state = runtime.getState()
  runtime.commitState({ ...state, city: { ...state.city, zones: state.city.zones.filter((zone) => zone.id !== command.zoneId) } })
}

export function placeService(runtime: SimulationRuntimePort, command: PlaceServiceCommand): ServicePlacementResult {
  const state = runtime.getState(); const result = placeCommunityService(state.world, state.city, command.position)
  if (result.valid) runtime.commitState({ ...state, city: result.city })
  return result
}

export function removeService(runtime: SimulationRuntimePort, serviceId: string): void {
  const state = runtime.getState(); runtime.commitState({ ...state, city: removeCommunityService(state.city, serviceId as import('../../domain/city').ServiceBuildingId) })
}

export function placeBuilding(runtime: SimulationRuntimePort, command: PlaceBuildingCommand): PlacementResult {
  const state = runtime.getState()
  const result = placeBuildingInCity(state.world, state.city, command.type, command.position)
  if (result.valid) runtime.commitState({ ...state, city: result.city, population: clampPopulationToHousing(state.population, result.city) })
  return result
}

export function removeBuilding(runtime: SimulationRuntimePort, command: RemoveBuildingCommand): RemoveBuildingResult {
  const state = runtime.getState()
  const result = removeBuildingFromCity(state.city, command.buildingId)
  if (result.removed) runtime.commitState({ ...state, city: result.city, population: clampPopulationToHousing(state.population, result.city) })
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
