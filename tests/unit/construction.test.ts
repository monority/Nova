import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState } from '../../src/domain/city'
import { placeBuilding, removeBuilding, validatePlacement } from '../../src/domain/construction'

function world() {
  return createWorld({ seed: 4242, width: 16, height: 16 })
}

function findCell(reason: 'buildable' | 'water' | 'restricted') {
  const currentWorld = world()
  const cell = currentWorld.cells.find((candidate) => candidate.buildable === reason)
  if (!cell) throw new Error(`No ${reason} cell available in fixture`)
  return { x: cell.x, y: cell.y }
}

describe('construction placement', () => {
  it('accepts an empty buildable cell', () => {
    const currentWorld = world()
    const position = findCell('buildable')
    expect(validatePlacement(currentWorld, createCityState(), 'house', position)).toEqual({ valid: true })
  })

  it('rejects out of bounds, water and restricted cells', () => {
    const currentWorld = world()
    const city = createCityState()
    expect(validatePlacement(currentWorld, city, 'house', { x: -1, y: 0 })).toEqual({ valid: false, reason: 'out_of_bounds' })
    expect(validatePlacement(currentWorld, city, 'house', findCell('water'))).toEqual({ valid: false, reason: 'water' })
    expect(validatePlacement(currentWorld, city, 'house', findCell('restricted'))).toEqual({ valid: false, reason: 'not_buildable' })
  })

  it('creates stable building IDs and occupancy', () => {
    const currentWorld = world()
    const position = findCell('buildable')
    const result = placeBuilding(currentWorld, createCityState(), 'house', position)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.building.id).toBe('building:1')
    expect(result.city.buildings).toHaveLength(1)
    expect(result.city.occupancy.size).toBe(1)
    expect(validatePlacement(currentWorld, result.city, 'house', position)).toEqual({ valid: false, reason: 'occupied' })
  })

  it('releases occupancy on removal and handles unknown IDs safely', () => {
    const currentWorld = world()
    const position = findCell('buildable')
    const placed = placeBuilding(currentWorld, createCityState(), 'house', position)
    if (!placed.valid) throw new Error('Expected fixture placement to be valid')
    const removed = removeBuilding(placed.city, placed.building.id)
    expect(removed.removed).toBe(true)
    expect(removed.city.buildings).toHaveLength(0)
    expect(removed.city.occupancy.size).toBe(0)
    expect(removeBuilding(removed.city, 'building:unknown').removed).toBe(false)
  })
})
