export interface GridPosition {
  readonly x: number
  readonly y: number
}

export function isIntegerGridPosition(position: GridPosition): boolean {
  return Number.isInteger(position.x) && Number.isInteger(position.y)
}
