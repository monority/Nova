import { BUILDING_TYPES, COMMUNITY_SERVICE_RADIUS, classifyRoad, getRoadComponent, hasServiceCoverage, type BuildingId, type CityState, type GridPosition, type RoadId, type ServiceBuildingId } from '../../domain/city'
import type { SimulationState } from '../../domain/simulation/simulation-state'

export type Selection = { readonly kind: 'building'; readonly id: BuildingId } | { readonly kind: 'road'; readonly id: RoadId } | { readonly kind: 'service'; readonly id: ServiceBuildingId } | { readonly kind: 'zone'; readonly id: string }
export type Inspection =
  | { readonly kind: 'building'; readonly id: string; readonly title: string; readonly description: string; readonly position: GridPosition; readonly capacity: number; readonly foodPerDay: number; readonly roadAccess: boolean; readonly serviceCoverage: boolean; readonly status: string }
  | { readonly kind: 'road'; readonly id: string; readonly title: string; readonly description: string; readonly roadClass: string; readonly connectedCells: number; readonly status: string }
  | { readonly kind: 'service'; readonly id: string; readonly title: string; readonly description: string; readonly position: GridPosition; readonly coverageRadius: number; readonly status: string }
  | { readonly kind: 'zone'; readonly id: string; readonly title: string; readonly description: string; readonly cells: number; readonly status: string }

export function toInspection(state: SimulationState, selection: Selection | null): Inspection | null {
  if (!selection) return null
  if (selection.kind === 'building') {
    const building = state.city.buildings.find((candidate) => candidate.id === selection.id)
    if (!building) return null
    const definition = BUILDING_TYPES[building.type]
    return { kind: 'building', id: building.id, title: building.type.toUpperCase(), description: building.type === 'farm' ? 'Agricultural building' : building.type === 'apartment' ? 'Dense residential building' : 'Residential building', position: building.position, capacity: definition.housingCapacity, foodPerDay: definition.foodPerDay, roadAccess: hasAdjacentRoad(state.city, building.position), serviceCoverage: hasServiceCoverage(state.city, building.position), status: building.type === 'apartment' ? 'DENSIFIED' : building.type === 'farm' ? 'ACTIVE' : 'GROWING' }
  }
  if (selection.kind === 'road') {
    const road = state.city.roads.find((candidate) => candidate.id === selection.id)
    if (!road) return null
    return { kind: 'road', id: road.id, title: 'ROAD', description: classifyRoad(road, state.city.roads).toUpperCase(), roadClass: classifyRoad(road, state.city.roads).toUpperCase(), connectedCells: getRoadComponent(state.city.roads, road.position).length, status: 'ACTIVE' }
  }
  if (selection.kind === 'service') {
    const service = state.city.services.find((candidate) => candidate.id === selection.id)
    if (!service) return null
    return { kind: 'service', id: service.id, title: 'COMMUNITY', description: 'Community service', position: service.position, coverageRadius: COMMUNITY_SERVICE_RADIUS, status: 'COVERAGE ACTIVE' }
  }
  const zone = state.city.zones.find((candidate) => candidate.id === selection.id)
  return zone ? { kind: 'zone', id: zone.id, title: zone.type.toUpperCase(), description: 'Development intention', cells: zone.cells.length, status: 'ACTIVE' } : null
}

function hasAdjacentRoad(city: CityState, position: GridPosition): boolean {
  return city.roads.some((road) => Math.abs(road.position.x - position.x) + Math.abs(road.position.y - position.y) === 1)
}
