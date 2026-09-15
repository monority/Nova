import { describe, expect, it } from 'vitest'
import { COMMUNITY_SERVICE_RADIUS, hasServiceCoverage, isWithinServiceCoverage, toServiceBuildingId, createCityState } from '../../src/domain/city'

describe('community service coverage', () => {
  it('uses Manhattan distance and includes the radius boundary', () => {
    expect(isWithinServiceCoverage({ x: 4, y: 4 }, { x: 4 + COMMUNITY_SERVICE_RADIUS, y: 4 })).toBe(true)
    expect(isWithinServiceCoverage({ x: 4, y: 4 }, { x: 4 + COMMUNITY_SERVICE_RADIUS, y: 5 })).toBe(false)
  })

  it('accepts coverage from any overlapping service', () => {
    const city = { ...createCityState(), services: [{ id: toServiceBuildingId('service:1'), type: 'community' as const, position: { x: 2, y: 2 } }] }
    expect(hasServiceCoverage(city, { x: 2, y: 6 })).toBe(true)
    expect(hasServiceCoverage(city, { x: 20, y: 20 })).toBe(false)
  })
})
