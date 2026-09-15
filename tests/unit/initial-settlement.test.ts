import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'

describe('initial settlement scenario', () => {
  it('creates a deterministic, populated starting settlement', () => {
    const world = createWorld({ seed: 4242, width: 64, height: 48 })
    const first = createInitialSettlement(world)
    const second = createInitialSettlement(world)
    expect(first.city).toEqual(second.city)
    expect(first.city.buildings.filter((building) => building.type === 'house')).toHaveLength(6)
    expect(first.city.buildings.filter((building) => building.type === 'farm')).toHaveLength(2)
    expect(first.city.roads.length).toBeGreaterThanOrEqual(1)
    expect(first.city.services).toHaveLength(1)
    expect(first.city.zones).toHaveLength(2)
    expect(first.population.total).toBeGreaterThan(0)
  })
})
