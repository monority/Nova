import type { Building, BuildingId } from './building-types'
import type { Road, RoadId } from './road-types'
import type { CellId } from '../world'
import type { DevelopmentZone } from './zones'

export type Occupant =
  | { readonly kind: 'building'; readonly id: BuildingId }
  | { readonly kind: 'road'; readonly id: RoadId }

export interface CityState {
  readonly buildings: readonly Building[]
  readonly roads: readonly Road[]
  readonly occupancy: ReadonlyMap<CellId, Occupant>
  readonly nextBuildingSequence: number
  readonly nextRoadSequence: number
  readonly zones: readonly DevelopmentZone[]
  readonly nextZoneSequence: number
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
  }
}
