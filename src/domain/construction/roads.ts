import type { CityState } from '../city/city-state'
import { ROAD_ORIENTATION, toRoadId, type GridPosition, type Road } from '../city'
import { getWorldCell, type World } from '../world'

export const ROAD_CONNECTION = {
  north: 1,
  east: 2,
  south: 4,
  west: 8,
} as const

export type RoadConnectionMask = number
export type RoadPlacementFailureReason =
  | 'out_of_bounds'
  | 'water'
  | 'not_buildable'
  | 'occupied'
  | 'insufficient_materials'

export type RoadPlacementResult =
  | { readonly valid: true; readonly road: Road; readonly city: CityState }
  | { readonly valid: false; readonly reason: RoadPlacementFailureReason }

export function roadAt(city: CityState, position: GridPosition): Road | undefined {
  return city.roads.find((road) => road.position.x === position.x && road.position.y === position.y)
}

export function getRoadConnectionMask(city: CityState, position: GridPosition): RoadConnectionMask {
  let mask = 0
  if (roadAt(city, { x: position.x, y: position.y - 1 })) mask |= ROAD_CONNECTION.north
  if (roadAt(city, { x: position.x + 1, y: position.y })) mask |= ROAD_CONNECTION.east
  if (roadAt(city, { x: position.x, y: position.y + 1 })) mask |= ROAD_CONNECTION.south
  if (roadAt(city, { x: position.x - 1, y: position.y })) mask |= ROAD_CONNECTION.west
  return mask
}

export function validateRoadPlacement(world: World, city: CityState, position: GridPosition): { readonly valid: true } | { readonly valid: false; readonly reason: RoadPlacementFailureReason } {
  const cell = getWorldCell(world, position.x, position.y)
  if (!cell) return { valid: false, reason: 'out_of_bounds' }
  if (cell.water) return { valid: false, reason: 'water' }
  if (cell.buildable !== 'buildable') return { valid: false, reason: 'not_buildable' }
  if (city.occupancy.has(cell.id)) return { valid: false, reason: 'occupied' }
  return { valid: true }
}

export function placeRoad(world: World, city: CityState, position: GridPosition): RoadPlacementResult {
  const validation = validateRoadPlacement(world, city, position)
  if (!validation.valid) return validation
  const road: Road = {
    id: toRoadId(`road:${city.nextRoadSequence}`),
    position: { x: position.x, y: position.y },
    orientation: ROAD_ORIENTATION,
  }
  const cell = getWorldCell(world, position.x, position.y)
  if (!cell) return { valid: false, reason: 'out_of_bounds' }
  const occupancy = new Map(city.occupancy)
  occupancy.set(cell.id, { kind: 'road', id: road.id })
  return {
    valid: true,
    road,
    city: { ...city, roads: [...city.roads, road], occupancy, nextRoadSequence: city.nextRoadSequence + 1 },
  }
}

export function removeRoad(city: CityState, roadId: string): { readonly removed: boolean; readonly city: CityState } {
  const road = city.roads.find((candidate) => candidate.id === roadId)
  if (!road) return { removed: false, city }
  const roads = city.roads.filter((candidate) => candidate.id !== roadId)
  const occupancy = new Map(city.occupancy)
  occupancy.forEach((occupant, cellId) => {
    if (occupant.kind === 'road' && occupant.id === road.id) occupancy.delete(cellId)
  })
  return { removed: true, city: { ...city, roads, occupancy } }
}
