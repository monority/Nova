import type { BuildingId } from './building-types'
import type { CityState } from './city-state'
import type { RoadId } from './road-types'
import type { ZoneId } from './zones'
import type { GridPosition } from './grid-position'

export type SelectableObject =
  | { readonly kind: 'building'; readonly id: BuildingId }
  | { readonly kind: 'road'; readonly id: RoadId }
  | { readonly kind: 'zone'; readonly id: ZoneId }
  | { readonly kind: 'service'; readonly id: import('./service-types').ServiceBuildingId }

export function resolveSelectableAt(city: CityState, position: GridPosition): SelectableObject | null {
  const building = city.buildings.find((candidate) => candidate.position.x === position.x && candidate.position.y === position.y)
  if (building) return { kind: 'building', id: building.id }
  const road = city.roads.find((candidate) => candidate.position.x === position.x && candidate.position.y === position.y)
  if (road) return { kind: 'road', id: road.id }
  const zone = city.zones.find((candidate) => candidate.cells.some((cell) => cell.x === position.x && cell.y === position.y))
  if (zone) return { kind: 'zone', id: zone.id }
  const service = city.services.find((candidate) => candidate.position.x === position.x && candidate.position.y === position.y)
  return service ? { kind: 'service', id: service.id } : null
}
