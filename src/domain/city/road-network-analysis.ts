import type { GridPosition } from './grid-position'
import type { Road } from './road-types'

export type RoadClass = 'local' | 'arterial'
export const ARTERIAL_MIN_LENGTH = 6
export const ARTERIAL_MIN_INTERSECTIONS = 1

export function getRoadComponent(roads: readonly Road[], start: GridPosition): readonly GridPosition[] {
  const roadAt = (position: GridPosition) => roads.find((road) => road.position.x === position.x && road.position.y === position.y)
  if (!roadAt(start)) return []
  const result: GridPosition[] = []
  const queue = [start]
  const visited = new Set<string>()
  while (queue.length > 0) {
    const position = queue.shift() as GridPosition
    const key = `${position.x}:${position.y}`
    if (visited.has(key) || !roadAt(position)) continue
    visited.add(key)
    result.push(position)
    queue.push({ x: position.x, y: position.y - 1 }, { x: position.x + 1, y: position.y }, { x: position.x, y: position.y + 1 }, { x: position.x - 1, y: position.y })
  }
  return result
}

export function isRoadIntersection(roads: readonly Road[], position: GridPosition): boolean {
  const neighbors = [
    { x: position.x, y: position.y - 1 }, { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y + 1 }, { x: position.x - 1, y: position.y },
  ]
  return neighbors.filter((neighbor) => roads.some((road) => road.position.x === neighbor.x && road.position.y === neighbor.y)).length >= 3
}

export function classifyRoad(road: Road, roads: readonly Road[]): RoadClass {
  const component = getRoadComponent(roads, road.position)
  const intersections = component.filter((position) => isRoadIntersection(roads, position)).length
  return component.length >= ARTERIAL_MIN_LENGTH && intersections >= ARTERIAL_MIN_INTERSECTIONS ? 'arterial' : 'local'
}
