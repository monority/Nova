import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { toRenderWorld } from '../../src/application/queries/to-render-world'

describe('render world projection', () => {
  it('projects plain render data without domain identifiers', () => {
    const renderWorld = toRenderWorld(createWorld({ seed: 7, width: 4, height: 4 }))
    expect(renderWorld.width).toBe(4)
    expect(renderWorld.cells[0]).not.toHaveProperty('id')
    expect(renderWorld.cells).toHaveLength(16)
  })
})
