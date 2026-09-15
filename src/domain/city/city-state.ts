import type { Building, BuildingId } from './building-types'
import type { Road, RoadId } from './road-types'
import type { CellId } from '../world'
import type { DevelopmentZone } from './zones'
import type { ServiceBuilding, ServiceBuildingId } from './service-types'

export type Occupant =
  | { readonly kind: 'building'; readonly id: BuildingId }
  | { readonly kind: 'road'; readonly id: RoadId }
  | { readonly kind: 'service'; readonly id: ServiceBuildingId }

export interface CityState {
  readonly buildings: readonly Building[]
  readonly roads: readonly Road[]
  readonly occupancy: ReadonlyMap<CellId, Occupant>
  readonly nextBuildingSequence: number
  readonly nextRoadSequence: number
  readonly zones: readonly DevelopmentZone[]
  readonly nextZoneSequence: number
  readonly services: readonly ServiceBuilding[]
  readonly nextServiceSequence: number
}

export function createCityState(): CityState {
  return {
    buildings: [],
    roads: [],
    occupancy: new Map(),
    nextBuildingSequence: 1,
    nextRoadSequence: 1,
    zones: [],
    nextZoneSequence: 1,
    services: [],
    nextServiceSequence: 1,
  }
}
