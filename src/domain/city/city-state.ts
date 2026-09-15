import type { Building, BuildingId } from './building-types'
import type { CellId } from '../world'

export interface CityState {
  readonly buildings: readonly Building[]
  readonly occupancy: ReadonlyMap<CellId, BuildingId>
  readonly nextBuildingSequence: number
}

export function createCityState(): CityState {
  return {
    buildings: [],
    occupancy: new Map(),
    nextBuildingSequence: 1,
  }
}
