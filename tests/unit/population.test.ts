import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createCityState } from '../../src/domain/city'
import { placeBuilding } from '../../src/domain/construction'
import { advancePopulation, createPopulationState, getHousingCapacity, SIMULATION_SECONDS_PER_DAY } from '../../src/domain/population'

function cityWithHouse() {
  const world = createWorld({ seed: 4242, width: 16, height: 16 })
  const cell = world.cells.find((candidate) => candidate.buildable === 'buildable')
  if (!cell) throw new Error('Expected a buildable cell')
  const result = placeBuilding(world, createCityState(), 'house', { x: cell.x, y: cell.y })
  if (!result.valid) throw new Error('Expected house placement to be valid')
  return result.city
}

describe('population system', () => {
  it('starts empty and cannot grow without housing', () => {
    expect(advancePopulation(createPopulationState(), createCityState(), SIMULATION_SECONDS_PER_DAY).total).toBe(0)
  })

  it('derives capacity from houses and grows deterministically over time', () => {
    const city = cityWithHouse()
    const first = advancePopulation(createPopulationState(), city, SIMULATION_SECONDS_PER_DAY)
    const second = advancePopulation(createPopulationState(), city, SIMULATION_SECONDS_PER_DAY)
    expect(getHousingCapacity(city)).toBe(4)
    expect(first).toEqual(second)
    expect(first.total).toBe(1)
  })

  it('never exceeds housing capacity', () => {
    const city = cityWithHouse()
    expect(advancePopulation(createPopulationState(), city, SIMULATION_SECONDS_PER_DAY * 10).total).toBe(4)
  })
})
