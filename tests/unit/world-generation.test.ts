import { describe, expect, it } from 'vitest'
import { generateWorld } from '../../src/engine/terrain/world-generator'

describe('world generation', () => {
  it('generates identical worlds for the same seed and dimensions', () => {
    expect(generateWorld({ seed: 4242, width: 16, height: 12 })).toEqual(generateWorld({ seed: 4242, width: 16, height: 12 }))
  })

  it('respects dimensions and cell count', () => {
    const world = generateWorld({ seed: 42, width: 16, height: 12 })
    expect(world.width).toBe(16)
    expect(world.height).toBe(12)
    expect(world.cells).toHaveLength(192)
  })

  it('keeps terrain values within domain invariants', () => {
    const world = generateWorld({ seed: 42, width: 32, height: 32 })
    expect(world.cells.every((cell) => cell.elevation >= 0 && cell.elevation <= 1)).toBe(true)
    expect(world.cells.some((cell) => cell.water)).toBe(true)
    expect(world.cells.some((cell) => cell.buildable === 'buildable')).toBe(true)
    expect(world.cells.filter((cell) => cell.water).every((cell) => cell.buildable === 'water')).toBe(true)
  })

  it('rejects invalid dimensions', () => {
    expect(() => generateWorld({ seed: 42, width: 0, height: 12 })).toThrow()
  })
})
