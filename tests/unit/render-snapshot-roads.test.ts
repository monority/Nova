import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState } from '../../src/domain/city'
import { placeRoad } from '../../src/domain/construction'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { toRenderSnapshot } from '../../src/application/queries/to-render-snapshot'
import { ROAD_CONNECTION } from '../../src/domain/construction'

describe('road render projection', () => {
  it('projects deterministic connection data without domain internals', () => {
    const world = createWorld({ seed: 4242, width: 16, height: 16 })
    const center = world.cells.find((cell) => cell.buildable === 'buildable')
    if (!center) throw new Error('Expected buildable fixture cell')
    let city = createCityState()
    const first = placeRoad(world, city, { x: center.x, y: center.y })
    if (!first.valid) throw new Error('Expected first road placement')
    city = first.city
    const second = placeRoad(world, city, { x: center.x + 1, y: center.y })
    if (!second.valid) throw new Error('Expected second road placement')
    city = second.city
    const snapshot = toRenderSnapshot({ ...createSimulationState(world), city })
    expect(snapshot.roads).toHaveLength(2)
    expect(snapshot.roads[0].connectionMask).toBe(ROAD_CONNECTION.east)
    expect(snapshot.roads[0]).not.toHaveProperty('occupancy')
  })
})
