import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState, resolveSelectableAt, toRoadId } from '../../src/domain/city'
import { placeBuilding } from '../../src/domain/construction'

describe('selectable resolution', () => {
  it('resolves a building by its grid cell', () => {
    const world = createWorld({ seed: 4242, width: 16, height: 16 })
    const cell = world.cells.find((candidate) => candidate.buildable === 'buildable')
    if (!cell) throw new Error('Expected a buildable cell')
    const result = placeBuilding(world, createCityState(), 'house', { x: cell.x, y: cell.y })
    if (!result.valid) throw new Error('Expected placement to succeed')
    expect(resolveSelectableAt(result.city, { x: cell.x, y: cell.y })).toEqual({ kind: 'building', id: 'building:1' })
  })

  it('resolves roads and returns null for empty cells', () => {
    const city = { ...createCityState(), roads: [{ id: toRoadId('road:1'), position: { x: 2, y: 3 }, orientation: 'horizontal' as const }] }
    expect(resolveSelectableAt(city, { x: 2, y: 3 })).toEqual({ kind: 'road', id: 'road:1' })
    expect(resolveSelectableAt(city, { x: 8, y: 8 })).toBeNull()
  })
})
