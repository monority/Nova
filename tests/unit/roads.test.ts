import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState, toRoadId } from '../../src/domain/city'
import { getRoadConnectionMask, placeRoad, removeRoad, ROAD_CONNECTION, validateRoadPlacement } from '../../src/domain/construction'

function fixture() {
  return createWorld({ seed: 4242, width: 16, height: 16 })
}

function buildablePosition(offset = 0) {
  const world = fixture()
  const cells = world.cells.filter((cell) => cell.buildable === 'buildable')
  const cell = cells[offset]
  if (!cell) throw new Error('Missing buildable fixture cell')
  return { x: cell.x, y: cell.y }
}

function connectedFixturePosition() {
  const world = fixture()
  const position = world.cells.find((cell) => {
    if (cell.buildable !== 'buildable' || cell.x < 1 || cell.y < 1 || cell.x >= world.width - 1 || cell.y >= world.height - 1) return false
    return [
      world.cells[(cell.y - 1) * world.width + cell.x],
      world.cells[cell.y * world.width + cell.x + 1],
      world.cells[(cell.y + 1) * world.width + cell.x],
      world.cells[cell.y * world.width + cell.x - 1],
    ].every((neighbor) => neighbor.buildable === 'buildable')
  })
  if (!position) throw new Error('Missing connected road fixture')
  return { x: position.x, y: position.y }
}

describe('road construction', () => {
  it('places deterministic roads and rejects occupied cells', () => {
    const world = fixture()
    const position = buildablePosition()
    const placed = placeRoad(world, createCityState(), position)
    expect(placed.valid).toBe(true)
    if (!placed.valid) return
    expect(placed.road.id).toBe('road:1')
    expect(validateRoadPlacement(world, placed.city, position)).toEqual({ valid: false, reason: 'occupied' })
  })

  it('derives straight, corner, T and cross connectivity masks', () => {
    const world = fixture()
    const center = connectedFixturePosition()
    const positions = [center, { x: center.x + 1, y: center.y }, { x: center.x - 1, y: center.y }, { x: center.x, y: center.y - 1 }, { x: center.x, y: center.y + 1 }]
    let city = createCityState()
    positions.slice(0, 3).forEach((position) => {
      const result = placeRoad(world, city, position)
      if (!result.valid) throw new Error('Expected road fixture placement to be valid')
      city = result.city
    })
    expect(getRoadConnectionMask(city, center)).toBe(ROAD_CONNECTION.east | ROAD_CONNECTION.west)
    const withNorth = placeRoad(world, city, positions[3])
    if (!withNorth.valid) throw new Error('Expected north road placement to be valid')
    expect(getRoadConnectionMask(withNorth.city, center)).toBe(ROAD_CONNECTION.north | ROAD_CONNECTION.east | ROAD_CONNECTION.west)
    const withSouth = placeRoad(world, withNorth.city, positions[4])
    if (!withSouth.valid) throw new Error('Expected south road placement to be valid')
    expect(getRoadConnectionMask(withSouth.city, center)).toBe(ROAD_CONNECTION.north | ROAD_CONNECTION.east | ROAD_CONNECTION.south | ROAD_CONNECTION.west)
  })

  it('removes a road and releases occupancy', () => {
    const world = fixture()
    const position = buildablePosition()
    const placed = placeRoad(world, createCityState(), position)
    if (!placed.valid) throw new Error('Expected road fixture placement to be valid')
    const removed = removeRoad(placed.city, placed.road.id)
    expect(removed.removed).toBe(true)
    expect(removed.city.roads).toHaveLength(0)
    expect(removed.city.occupancy.size).toBe(0)
    expect(removeRoad(removed.city, toRoadId('road:unknown')).removed).toBe(false)
  })
})
