import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'

describe('createWorld', () => {
  it('returns a valid domain World through the application boundary', () => {
    const world = createWorld({ seed: 4242, width: 8, height: 6 })
    expect(world.id).toBe('world-4242-8x6')
    expect(world.cells).toHaveLength(48)
  })
})
