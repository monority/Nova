import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState } from '../../src/domain/city'
import { placeBuilding, placeRoad } from '../../src/domain/construction'

describe('building and road occupancy compatibility', () => {
  it('rejects a building on a road', () => {
    const world = createWorld({ seed: 4242, width: 16, height: 16 })
    const cell = world.cells.find((candidate) => candidate.buildable === 'buildable')
    if (!cell) throw new Error('Expected buildable fixture cell')
    const road = placeRoad(world, createCityState(), { x: cell.x, y: cell.y })
    if (!road.valid) throw new Error('Expected road placement to be valid')
    expect(placeBuilding(world, road.city, 'house', { x: cell.x, y: cell.y })).toEqual({ valid: false, reason: 'occupied' })
  })

  it('rejects a road on a building', () => {
    const world = createWorld({ seed: 4242, width: 16, height: 16 })
    const cell = world.cells.find((candidate) => candidate.buildable === 'buildable')
    if (!cell) throw new Error('Expected buildable fixture cell')
    const building = placeBuilding(world, createCityState(), 'house', { x: cell.x, y: cell.y })
    if (!building.valid) throw new Error('Expected building placement to be valid')
    expect(placeRoad(world, building.city, { x: cell.x, y: cell.y })).toEqual({ valid: false, reason: 'occupied' })
  })
})
