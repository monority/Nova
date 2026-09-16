import type { BuildingTypeId, GridPosition, RoadClass, ZoneType } from '../../domain/city'
import { classifyRoad, hasServiceCoverage } from '../../domain/city'
import type { SimulationState } from '../../domain/simulation/simulation-state'

export type SimulationEvent =
  | { readonly type: 'building-created'; readonly buildingId: string; readonly buildingType: BuildingTypeId }
  | { readonly type: 'road-created'; readonly roadId: string; readonly roadClass: RoadClass }
  | { readonly type: 'building-evolved'; readonly buildingId: string; readonly from: BuildingTypeId; readonly to: BuildingTypeId }

export type UrbanChangeKind = 'BUILDING_CREATED' | 'ROAD_CREATED' | 'BUILDING_EVOLVED'
export interface UrbanChangeContext {
  readonly zone: ZoneType | null
  readonly adjacentToRoad: boolean
  readonly nearCommunityService: boolean
  readonly from?: BuildingTypeId
  readonly to?: BuildingTypeId
  readonly roadClass?: RoadClass
}
export interface UrbanChange {
  readonly kind: UrbanChangeKind
  readonly id: string
  readonly position: GridPosition
  readonly tick: number
  readonly label: string
  readonly context: UrbanChangeContext
}

const eventPriority: Record<SimulationEvent['type'], number> = {
  'building-evolved': 0,
  'road-created': 1,
  'building-created': 2,
}

export function detectSimulationEvents(previous: SimulationState, current: SimulationState): SimulationEvent[] {
  const previousBuildings = new Map(previous.city.buildings.map((building) => [building.id, building]))
  const events: SimulationEvent[] = []
  for (const building of current.city.buildings) {
    const prior = previousBuildings.get(building.id)
    if (!prior) events.push({ type: 'building-created', buildingId: building.id, buildingType: building.type })
    else if (prior.type !== building.type) events.push({ type: 'building-evolved', buildingId: building.id, from: prior.type, to: building.type })
  }
  const previousRoadIds = new Set(previous.city.roads.map((road) => road.id))
  for (const road of current.city.roads) {
    if (!previousRoadIds.has(road.id)) events.push({ type: 'road-created', roadId: road.id, roadClass: classifyRoad(road, current.city.roads) })
  }
  return events.sort((left, right) => eventPriority[left.type] - eventPriority[right.type] || eventId(left).localeCompare(eventId(right)))
}

function eventId(event: SimulationEvent): string {
  return event.type === 'building-evolved' ? event.buildingId : event.type === 'building-created' ? event.buildingId : event.roadId
}

export function summarizeSimulationEvents(events: readonly SimulationEvent[]): string[] {
  if (events.length === 0) return []
  const evolution = events.filter((event) => event.type === 'building-evolved')
  const roads = events.filter((event) => event.type === 'road-created')
  const buildings = events.filter((event) => event.type === 'building-created')
  const summary: string[] = []
  for (const event of evolution) if (event.type === 'building-evolved') summary.push(`BUILDING EVOLVED · ${event.from.toUpperCase()} → ${event.to.toUpperCase()}`)
  if (roads.length === 1) summary.push('NEW ROAD')
  else if (roads.length > 1) summary.push(`ROAD NETWORK · ${roads.length} SEGMENTS`)
  if (buildings.length === 1) summary.push(`NEW ${buildings[0].buildingType.toUpperCase()}`)
  else if (buildings.length > 1) summary.push(`NEW DEVELOPMENT · ${buildings.length} BUILDINGS`)
  return summary
}

export function projectUrbanChanges(previous: SimulationState, current: SimulationState): UrbanChange[] {
  return detectSimulationEvents(previous, current).map((event): UrbanChange | null => {
    const position = event.type === 'road-created'
      ? current.city.roads.find((road) => road.id === event.roadId)?.position
      : current.city.buildings.find((building) => building.id === (event.type === 'building-created' ? event.buildingId : event.buildingId))?.position
    if (!position) return null
    const zone = current.city.zones.find((candidate) => candidate.cells.some((cell) => samePosition(cell, position)))?.type ?? null
    const adjacentToRoad = current.city.roads.some((road) => manhattan(road.position, position) === 1)
    const nearCommunityService = hasServiceCoverage(current.city, position)
    if (event.type === 'road-created') {
      return { kind: 'ROAD_CREATED', id: event.roadId, position: { ...position }, tick: current.clock.currentTick, label: 'ROAD EXTENDED', context: { zone, adjacentToRoad: false, nearCommunityService, roadClass: event.roadClass } }
    }
    if (event.type === 'building-evolved') {
      return { kind: 'BUILDING_EVOLVED', id: event.buildingId, position: { ...position }, tick: current.clock.currentTick, label: 'DENSIFICATION', context: { zone, adjacentToRoad, nearCommunityService, from: event.from, to: event.to } }
    }
    return { kind: 'BUILDING_CREATED', id: event.buildingId, position: { ...position }, tick: current.clock.currentTick, label: event.buildingType === 'apartment' ? 'APARTMENT CREATED' : `${event.buildingType.toUpperCase()} BUILT`, context: { zone, adjacentToRoad, nearCommunityService } }
  }).filter((change): change is UrbanChange => change !== null)
}

export interface UrbanChangeGroup {
  readonly key: string
  readonly changes: readonly UrbanChange[]
  readonly label: string
  readonly context: UrbanChangeContext
  readonly tick: number
}

export function groupUrbanChanges(changes: readonly UrbanChange[]): UrbanChangeGroup[] {
  const groups = new Map<string, UrbanChange[]>()
  for (const change of changes) {
    const type = change.kind === 'BUILDING_CREATED' ? change.label : change.kind
    const zone = change.context.zone ?? 'outside'
    const key = `${change.tick}:${type}:${zone}`
    const group = groups.get(key) ?? []
    group.push(change)
    groups.set(key, group)
  }
  return [...groups.values()].sort((left, right) => right[0].tick - left[0].tick || left[0].kind.localeCompare(right[0].kind) || left[0].id.localeCompare(right[0].id)).map((group) => {
    const first = group[0]
    const label = group.length > 1 && first.kind === 'BUILDING_CREATED'
      ? `${group.length} ${first.label.replace(' BUILT', 'S BUILT').replace(' CREATED', 'S CREATED')}`
      : first.label
    return { key: `${first.tick}:${first.kind}:${first.id}`, changes: group, label, context: first.context, tick: first.tick }
  })
}

function samePosition(left: GridPosition, right: GridPosition): boolean { return left.x === right.x && left.y === right.y }
function manhattan(left: GridPosition, right: GridPosition): number { return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) }
