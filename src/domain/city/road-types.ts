import type { GridPosition } from './grid-position'

export type RoadId = string & { readonly __brand: 'RoadId' }
export type RoadOrientation = 'horizontal' | 'vertical'

export interface Road {
  readonly id: RoadId
  readonly position: GridPosition
  readonly orientation: RoadOrientation
}

export const ROAD_ORIENTATION: RoadOrientation = 'horizontal'

export function toRoadId(value: string): RoadId {
  return value as RoadId
}
