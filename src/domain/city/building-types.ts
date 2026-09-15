import type { GridPosition } from './grid-position'

export type BuildingId = string & { readonly __brand: 'BuildingId' }
export type BuildingTypeId = 'house'

export interface BuildingTypeDefinition {
  readonly id: BuildingTypeId
  readonly width: number
  readonly height: number
}

export interface Building {
  readonly id: BuildingId
  readonly type: BuildingTypeId
  readonly position: GridPosition
}

export const HOUSE_BUILDING: BuildingTypeDefinition = {
  id: 'house',
  width: 1,
  height: 1,
}

export const BUILDING_TYPES: Readonly<Record<BuildingTypeId, BuildingTypeDefinition>> = {
  house: HOUSE_BUILDING,
}

export function toBuildingId(value: string): BuildingId {
  return value as BuildingId
}
