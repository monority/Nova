import type { CityState } from '../city'
import { placeBuilding, placeRoad, validatePlacement } from '../construction'
import type { EconomyState } from '../economy'
import type { PopulationState } from '../population'
import { getHousingCapacity } from '../population'
import type { World } from '../world'
import type { Building, GridPosition, BuildingTypeId, Road } from '../city'

export interface DevelopmentPressure { readonly position: GridPosition; readonly score: number }

export const ROAD_ADJACENCY_BONUS = 4
export const RESIDENTIAL_ROAD_INFLUENCE_WEIGHT = 5
export const MAX_AUTONOMOUS_ROAD_EXTENSION = 4

export const DEVELOPMENT_INTERVAL_TICKS = 60 * 10
export function advanceDevelopment(world: World, city: CityState, population: PopulationState, economy: EconomyState, currentTick: number): CityState {
  if (currentTick === 0 || currentTick % DEVELOPMENT_INTERVAL_TICKS !== 0) return city
  const residentialPressure = population.total >= getHousingCapacity(city)
  const agriculturalPressure = economy.foodShortage > 0
  const zoneOrder = agriculturalPressure ? ['agricultural', 'residential'] as const : residentialPressure ? ['residential', 'agricultural'] as const : []
  for (const type of zoneOrder) {
    const buildingType = type === 'agricultural' ? 'farm' : 'house'
    for (const zone of city.zones.filter((candidate) => candidate.type === type)) {
      const candidates = zone.cells
        .filter((cell) => validatePlacement(world, city, buildingType, cell).valid)
        .map((position) => ({ position, score: scoreDevelopmentCell(city, position, buildingType) }))
        .sort(comparePressure)
      if (candidates.length > 0) {
        const result = placeBuilding(world, city, buildingType, candidates[0].position)
        if (result.valid) return extendRoadNetwork(world, result.city, result.building)
      }
    }
  }
  return city
}

export function buildRoadConnection(from: GridPosition, target: GridPosition): readonly GridPosition[] {
  const cells: GridPosition[] = []
  const stepX = Math.sign(target.x - from.x)
  const stepY = Math.sign(target.y - from.y)
  for (let x = from.x + stepX; x !== target.x; x += stepX) cells.push({ x, y: from.y })
  for (let y = from.y + stepY; y !== target.y; y += stepY) cells.push({ x: target.x, y })
  return cells
}

function extendRoadNetwork(world: World, city: CityState, building: Building): CityState {
  if (city.roads.some((road) => manhattanDistance(road.position, building.position) === 1)) return city
  if (city.roads.length === 0) return city
  const target = [...city.roads].sort((a, b) => manhattanDistance(a.position, building.position) - manhattanDistance(b.position, building.position) || a.position.y - b.position.y || a.position.x - b.position.x)[0]
  let nextCity = city
  for (const cell of buildRoadConnection(building.position, target.position).slice(0, MAX_AUTONOMOUS_ROAD_EXTENSION)) {
    const result = placeRoad(world, nextCity, cell)
    if (!result.valid) break
    nextCity = result.city
  }
  return nextCity
}

export function scoreDevelopmentCell(city: CityState, position: GridPosition, buildingType: BuildingTypeId): number {
  const existing = city.buildings.filter((building) => building.type === buildingType)
  const nearestDistance = existing.length > 0 ? Math.min(...existing.map((building) => manhattanDistance(building.position, position))) : 0
  const adjacent = existing.some((candidate) => manhattanDistance(candidate.position, position) === 1)
  const buildingScore = existing.length === 0 ? 0 : (adjacent ? 100 : 0) + Math.max(0, 50 - nearestDistance * 10)
  if (buildingType !== 'house') return buildingScore
  const roadInfluence = getRoadInfluence(position, city.roads)
  const roadAdjacency = city.roads.some((road) => manhattanDistance(road.position, position) === 1) ? ROAD_ADJACENCY_BONUS : 0
  return buildingScore + roadInfluence * RESIDENTIAL_ROAD_INFLUENCE_WEIGHT + roadAdjacency
}

export function getRoadInfluence(position: GridPosition, roads: readonly Road[]): number {
  if (roads.length === 0) return 0
  const nearestDistance = Math.min(...roads.map((road) => manhattanDistance(road.position, position)))
  if (nearestDistance <= 1) return 3
  if (nearestDistance === 2) return 2
  if (nearestDistance === 3) return 1
  return 0
}

function manhattanDistance(a: GridPosition, b: GridPosition): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }
function comparePressure(a: DevelopmentPressure, b: DevelopmentPressure): number {
  return b.score - a.score || a.position.y - b.position.y || a.position.x - b.position.x
}
