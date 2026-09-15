import { describe, expect, it } from 'vitest'
import { createRandom } from '../../src/engine/random/random-source'

describe('seeded random source', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createRandom(4242)
    const second = createRandom(4242)
    expect(Array.from({ length: 8 }, () => first.next())).toEqual(Array.from({ length: 8 }, () => second.next()))
  })

  it('produces a different sequence for different seeds', () => {
    const first = createRandom(4242)
    const second = createRandom(4243)
    expect(first.next()).not.toBe(second.next())
  })

  it('respects integer and float ranges', () => {
    const random = createRandom(42)
    expect(random.nextInt(3, 3)).toBe(3)
    expect(random.nextFloat(-1, 1)).toBeGreaterThanOrEqual(-1)
    expect(random.nextFloat(-1, 1)).toBeLessThan(1)
  })
})
