import type { GridPosition } from './grid-position'
import type { ServiceBuilding, ServiceBuildingId } from './service-types'
import { toServiceBuildingId } from './service-types'
import type { World } from '../world'
import { getWorldCell } from '../world'
import type { CityState } from './city-state'

export const COMMUNITY_SERVICE_RADIUS = 4
export type ServicePlacementResult = { readonly valid: true; readonly service: ServiceBuilding; readonly city: CityState } | { readonly valid: false; readonly reason: 'out_of_bounds' | 'water' | 'not_buildable' | 'occupied' }
export function isWithinServiceCoverage(servicePosition: GridPosition, targetPosition: GridPosition): boolean { return Math.abs(servicePosition.x - targetPosition.x) + Math.abs(servicePosition.y - targetPosition.y) <= COMMUNITY_SERVICE_RADIUS }
export function hasServiceCoverage(city: CityState, position: GridPosition): boolean { return city.services.some((service) => isWithinServiceCoverage(service.position, position)) }
export function placeCommunityService(world: World, city: CityState, position: GridPosition): ServicePlacementResult {
  const cell = getWorldCell(world, position.x, position.y)
  if (!cell) return { valid: false, reason: 'out_of_bounds' }
  if (cell.water) return { valid: false, reason: 'water' }
  if (cell.buildable !== 'buildable') return { valid: false, reason: 'not_buildable' }
  if (city.occupancy.has(cell.id)) return { valid: false, reason: 'occupied' }
  const service = { id: toServiceBuildingId(`service:${city.nextServiceSequence}`), type: 'community' as const, position: { ...position } }
  const occupancy = new Map(city.occupancy); occupancy.set(cell.id, { kind: 'service', id: service.id })
  return { valid: true, service, city: { ...city, services: [...city.services, service], occupancy, nextServiceSequence: city.nextServiceSequence + 1 } }
}
export function removeCommunityService(city: CityState, serviceId: ServiceBuildingId): CityState {
  const service = city.services.find((candidate) => candidate.id === serviceId)
  if (!service) return city
  const cell = [...city.occupancy.entries()].find(([, occupant]) => occupant.kind === 'service' && occupant.id === serviceId)?.[0]
  const occupancy = new Map(city.occupancy); if (cell) occupancy.delete(cell)
  return { ...city, services: city.services.filter((candidate) => candidate.id !== serviceId), occupancy }
}
