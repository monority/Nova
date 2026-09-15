import type { GridPosition } from './grid-position'
import type { World } from '../world'
import { getWorldCell } from '../world'

export type ZoneType = 'residential' | 'agricultural'
export type ZoneId = string & { readonly __brand: 'ZoneId' }
export interface DevelopmentZone { readonly id: ZoneId; readonly type: ZoneType; readonly cells: readonly GridPosition[] }
export function toZoneId(value: string): ZoneId { return value as ZoneId }
export type ZonePlacementResult = { readonly valid: true; readonly zone: DevelopmentZone; readonly zones: readonly DevelopmentZone[] } | { readonly valid: false; readonly reason: 'out_of_bounds' | 'water' | 'not_buildable' | 'occupied' }
export function createZone(world: World, zones: readonly DevelopmentZone[], type: ZoneType, cells: readonly GridPosition[], sequence: number): ZonePlacementResult {
  const unique = [...new Map(cells.map((cell) => [`${cell.x}:${cell.y}`, cell])).values()].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const position of unique) {
    const worldCell = getWorldCell(world, position.x, position.y)
    if (!worldCell) return { valid: false, reason: 'out_of_bounds' }
    if (worldCell.water) return { valid: false, reason: 'water' }
    if (worldCell.buildable !== 'buildable') return { valid: false, reason: 'not_buildable' }
    if (zones.some((zone) => zone.cells.some((cell) => cell.x === position.x && cell.y === position.y))) return { valid: false, reason: 'occupied' }
  }
  const zone = { id: toZoneId(`zone:${sequence}`), type, cells: unique }
  return { valid: true, zone, zones: [...zones, zone] }
}
