import type { CityState } from '../city'
import { placeBuilding } from '../construction'
import type { EconomyState } from '../economy'
import type { PopulationState } from '../population'
import { getHousingCapacity } from '../population'
import type { World } from '../world'

export const DEVELOPMENT_INTERVAL_TICKS = 60 * 10
export function advanceDevelopment(world: World, city: CityState, population: PopulationState, economy: EconomyState, currentTick: number): CityState {
  if (currentTick === 0 || currentTick % DEVELOPMENT_INTERVAL_TICKS !== 0) return city
  const residentialPressure = population.total >= getHousingCapacity(city)
  const agriculturalPressure = economy.foodShortage > 0
  const zoneOrder = agriculturalPressure ? ['agricultural', 'residential'] as const : residentialPressure ? ['residential', 'agricultural'] as const : []
  for (const type of zoneOrder) {
    const buildingType = type === 'agricultural' ? 'farm' : 'house'
    for (const zone of city.zones.filter((candidate) => candidate.type === type)) {
      const cells = [...zone.cells].sort((a, b) => a.y - b.y || a.x - b.x)
      for (const cell of cells) {
        const result = placeBuilding(world, city, buildingType, cell)
        if (result.valid) return result.city
      }
    }
  }
  return city
}
