import type { SimulationState } from '../../domain/simulation/simulation-state'

export interface ResourceSummary {
  readonly food: number
  readonly energy: number
  readonly materials: number
  readonly foodShortage: number
  readonly energyShortage: number
  readonly constrained: boolean
}

export function toResourceSummary(state: SimulationState): ResourceSummary {
  const { economy } = state
  return {
    food: Math.floor(economy.food),
    energy: Math.floor(economy.energy),
    materials: Math.floor(economy.materials),
    foodShortage: economy.foodShortage,
    energyShortage: economy.energyShortage,
    constrained: economy.foodShortage > 0 || economy.energyShortage > 0,
  }
}
