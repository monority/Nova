export type WorldId = string & { readonly __brand: 'WorldId' }
export type CellId = string & { readonly __brand: 'CellId' }

export type Buildability = 'buildable' | 'restricted' | 'water'

export interface TerrainCell {
  readonly id: CellId
  readonly x: number
  readonly y: number
  readonly elevation: number
  readonly water: boolean
  readonly buildable: Buildability
}

export interface World {
  readonly id: WorldId
  readonly seed: number
  readonly width: number
  readonly height: number
  readonly cells: readonly TerrainCell[]
}

export function getWorldCell(world: World, x: number, y: number): TerrainCell | undefined {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= world.width || y >= world.height) return undefined
  return world.cells[y * world.width + x]
}

export function toWorldId(value: string): WorldId {
  return value as WorldId
}

export function toCellId(value: string): CellId {
  return value as CellId
}
