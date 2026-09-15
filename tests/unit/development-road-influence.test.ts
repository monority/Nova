import { describe, expect, it } from 'vitest'
import { getRoadInfluence } from '../../src/domain/development'
import { toRoadId, type Road } from '../../src/domain/city'

const road: Road = { id: toRoadId('road:1'), position: { x: 4, y: 4 }, orientation: 'horizontal' }

describe('road development influence', () => {
  it('uses deterministic Manhattan distance bands', () => {
    expect(getRoadInfluence({ x: 4, y: 5 }, [road])).toBe(3)
    expect(getRoadInfluence({ x: 4, y: 6 }, [road])).toBe(2)
    expect(getRoadInfluence({ x: 4, y: 7 }, [road])).toBe(1)
    expect(getRoadInfluence({ x: 4, y: 8 }, [road])).toBe(0)
  })

  it('returns no influence when there are no roads', () => {
    expect(getRoadInfluence({ x: 0, y: 0 }, [])).toBe(0)
  })
})
