import { describe, expect, it } from 'vitest'
import { buildRoadConnection } from '../../src/domain/development'

describe('autonomous road extension', () => {
  it('builds a deterministic horizontal-then-vertical Manhattan path', () => {
    expect(buildRoadConnection({ x: 1, y: 1 }, { x: 4, y: 3 })).toEqual([
      { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 2 },
    ])
  })

  it('returns no segments when already on the target cell', () => {
    expect(buildRoadConnection({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([])
  })
})
