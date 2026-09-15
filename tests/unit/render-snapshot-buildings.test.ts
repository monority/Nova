import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { placeBuilding } from '../../src/domain/construction'
import { createCityState } from '../../src/domain/city'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { toRenderSnapshot } from '../../src/application/queries/to-render-snapshot'

describe('building render projection', () => {
  it('projects only render data for buildings', () => {
    const world = createWorld({ seed: 4242, width: 16, height: 16 })
    const position = world.cells.find((cell) => cell.buildable === 'buildable')
    if (!position) throw new Error('Expected a buildable fixture cell')
    const result = placeBuilding(world, createCityState(), 'house', { x: position.x, y: position.y })
    if (!result.valid) throw new Error('Expected fixture placement to be valid')
    const snapshot = toRenderSnapshot({ ...createSimulationState(world), city: result.city })
    expect(snapshot.buildings).toEqual([{ id: 'building:1', type: 'house', position: { x: position.x, y: position.y } }])
  })
})
