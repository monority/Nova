import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import { DEVELOPMENT_INTERVAL_TICKS } from '../../src/domain/development'
import { getHousingCapacity } from '../../src/domain/population'
import { advanceSimulationTick } from '../../src/domain/simulation/simulation-state'

describe('emergent urban morphology', () => {
  it('keeps the initial settlement spatially coherent and deterministic', () => {
    const world = createWorld({ seed: 4242, width: 64, height: 48 })
    const state = createInitialSettlement(world)
    const houses = state.city.buildings.filter((building) => building.type === 'house')
    const averageDistance = houses.reduce((sum, house, index) => sum + (index === 0 ? 0 : Math.abs(house.position.x - houses[0].position.x) + Math.abs(house.position.y - houses[0].position.y)), 0) / houses.length
    expect(averageDistance).toBeLessThan(20)
    expect(state.city.zones).toHaveLength(2)
  })

  it('allows a saturated residential core to densify through the real tick', () => {
    const world = createWorld({ seed: 4242, width: 64, height: 48 })
    let state = createInitialSettlement(world)
    state = { ...state, population: { ...state.population, total: getHousingCapacity(state.city) } }
    for (let tick = 0; tick < DEVELOPMENT_INTERVAL_TICKS; tick += 1) state = advanceSimulationTick(state)
    expect(state.city.buildings.some((building) => building.type === 'apartment')).toBe(true)
  })
})
