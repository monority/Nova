import type { GridPosition } from './grid-position'

export type BuildingId = string & { readonly __brand: 'BuildingId' }
export type BuildingTypeId = 'house' | 'farm' | 'apartment'

export interface BuildingTypeDefinition {
  readonly id: BuildingTypeId
  readonly width: number
  readonly height: number
  readonly housingCapacity: number
  readonly foodPerDay: number
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
  housingCapacity: 4,
  foodPerDay: 0,
}

export const FARM_BUILDING: BuildingTypeDefinition = {
  id: 'farm',
  width: 1,
  height: 1,
  housingCapacity: 0,
  foodPerDay: 8,
}

export const APARTMENT_BUILDING: BuildingTypeDefinition = {
  id: 'apartment',
  width: 1,
  height: 1,
  housingCapacity: 12,
  foodPerDay: 0,
}

export const BUILDING_TYPES: Readonly<Record<BuildingTypeId, BuildingTypeDefinition>> = {
  house: HOUSE_BUILDING,
  farm: FARM_BUILDING,
  apartment: APARTMENT_BUILDING,
}

export function toBuildingId(value: string): BuildingId {
  return value as BuildingId
}
