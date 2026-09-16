import { BUILDING_TYPES, toBuildingId, type Building, type BuildingId, type BuildingTypeId } from '../city/building-types'
import type { CityState } from '../city/city-state'
import type { GridPosition } from '../city/grid-position'
import { getWorldCell, type World } from '../world'

export type PlacementFailureReason = 'out_of_bounds' | 'water' | 'not_buildable' | 'occupied' | 'insufficient_materials'

export type PlacementResult =
  | { readonly valid: true; readonly building: Building; readonly city: CityState }
  | { readonly valid: false; readonly reason: PlacementFailureReason }

export type PlacementCheck = {
  readonly valid: true
} | {
  readonly valid: false
  readonly reason: PlacementFailureReason
}

export function getFootprintCells(type: BuildingTypeId, position: GridPosition): readonly GridPosition[] {
  const definition = BUILDING_TYPES[type]
  return Array.from({ length: definition.width * definition.height }, (_, index) => ({
    x: position.x + (index % definition.width),
    y: position.y + Math.floor(index / definition.width),
  }))
}

export function validatePlacement(world: World, city: CityState, type: BuildingTypeId, position: GridPosition): PlacementCheck {
  for (const cellPosition of getFootprintCells(type, position)) {
    const cell = getWorldCell(world, cellPosition.x, cellPosition.y)
    if (!cell) return { valid: false, reason: 'out_of_bounds' }
    if (cell.water) return { valid: false, reason: 'water' }
    if (cell.buildable !== 'buildable') return { valid: false, reason: 'not_buildable' }
    if (city.occupancy.has(cell.id)) return { valid: false, reason: 'occupied' }
  }
  return { valid: true }
}

export function placeBuilding(world: World, city: CityState, type: BuildingTypeId, position: GridPosition): PlacementResult {
  const validation = validatePlacement(world, city, type, position)
  if (!validation.valid) return validation

  const building: Building = {
    id: toBuildingId(`building:${city.nextBuildingSequence}`),
    type,
    position: { x: position.x, y: position.y },
  }
  const occupancy = new Map(city.occupancy)
  getFootprintCells(type, position).forEach((cellPosition) => {
    const cell = getWorldCell(world, cellPosition.x, cellPosition.y)
    if (cell) occupancy.set(cell.id, { kind: 'building', id: building.id })
  })
  return {
    valid: true,
    building,
    city: {
      buildings: [...city.buildings, building],
      roads: city.roads,
      occupancy,
      nextBuildingSequence: city.nextBuildingSequence + 1,
      nextRoadSequence: city.nextRoadSequence,
      zones: city.zones,
      nextZoneSequence: city.nextZoneSequence,
      services: city.services,
      nextServiceSequence: city.nextServiceSequence,
    },
  }
}

export interface RemoveBuildingResult {
  readonly removed: boolean
  readonly city: CityState
}

export function removeBuilding(city: CityState, buildingId: string): RemoveBuildingResult {
  const building = city.buildings.find((candidate) => candidate.id === buildingId)
  if (!building) return { removed: false, city }
  const buildings = city.buildings.filter((candidate) => candidate.id !== buildingId)
  const occupancy = new Map(city.occupancy)
  occupancy.forEach((occupant, cellId) => {
    if (occupant.kind === 'building' && occupant.id === building.id) occupancy.delete(cellId)
  })
  return {
    removed: true,
    city: { ...city, buildings, occupancy },
  }
}

export function evolveBuilding(city: CityState, buildingId: BuildingId, type: BuildingTypeId): CityState {
  const buildings = city.buildings.map((building) => building.id === buildingId ? { ...building, type } : building)
  return { ...city, buildings }
}
