import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import { toResourceSummary } from '../../src/application/queries/to-resource-summary'
import {
  advanceEconomy,
  canAffordMaterials,
  createEconomyState,
  createInitialEconomyState,
  getEnergyConsumptionPerDay,
  getEnergyProductionPerDay,
  trySpendMaterials,
} from '../../src/domain/economy/economy-state'
import {
  CONSTRUCTION_COSTS,
  EVOLVE_COST,
  INITIAL_ENERGY,
  INITIAL_FOOD,
  INITIAL_MATERIALS,
} from '../../src/domain/economy/resource-costs'
import { SIMULATION_SECONDS_PER_DAY } from '../../src/domain/population'

describe('step21 economy foundation', () => {
  it('starts at contract values food 180 / energy 120 / materials 300', () => {
    const economy = createInitialEconomyState()
    expect(economy.food).toBe(INITIAL_FOOD)
    expect(economy.energy).toBe(INITIAL_ENERGY)
    expect(economy.materials).toBe(INITIAL_MATERIALS)
    expect(INITIAL_FOOD).toBe(180)
    expect(INITIAL_ENERGY).toBe(120)
    expect(INITIAL_MATERIALS).toBe(300)
  })

  it('initial settlement uses contract resource values', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 }))
    expect(state.economy.food).toBe(180)
    expect(state.economy.energy).toBe(120)
    expect(state.economy.materials).toBe(300)
  })

  it('farm production increases food deterministically', () => {
    const state = createInitialSettlement(createWorld({ seed: 7, width: 64, height: 48 }))
    const emptyPop = { total: 0, growthProgress: 0 }
    const first = advanceEconomy(state.economy, state.city, emptyPop, SIMULATION_SECONDS_PER_DAY)
    const second = advanceEconomy(state.economy, state.city, emptyPop, SIMULATION_SECONDS_PER_DAY)
    expect(first.food).toBe(second.food)
    expect(first.food).toBeGreaterThan(state.economy.food)
  })

  it('population consumption decreases food deterministically', () => {
    const state = createInitialSettlement(createWorld({ seed: 7, width: 64, height: 48 }))
    const noPop = advanceEconomy(state.economy, state.city, { total: 0, growthProgress: 0 }, SIMULATION_SECONDS_PER_DAY)
    const fullPop = advanceEconomy(
      state.economy,
      state.city,
      { total: 100, growthProgress: 0 },
      SIMULATION_SECONDS_PER_DAY,
    )
    expect(fullPop.food).toBeLessThan(noPop.food)
    expect(fullPop.foodConsumed).toBeCloseTo(10, 6)
  })

  it('energy production follows community services, consumption follows buildings and people', () => {
    const state = createInitialSettlement(createWorld({ seed: 7, width: 64, height: 48 }))
    expect(getEnergyProductionPerDay(state.city)).toBe(state.city.services.length * 12)
    expect(getEnergyConsumptionPerDay(state.city, { total: 0, growthProgress: 0 })).toBe(state.city.buildings.length)
    expect(getEnergyConsumptionPerDay(state.city, { total: 40, growthProgress: 0 })).toBe(
      state.city.buildings.length + 2,
    )
  })

  it('materials trickle deterministically without population consumption', () => {
    const economy = createEconomyState()
    const state = createInitialSettlement(createWorld({ seed: 7, width: 64, height: 48 }))
    const result = advanceEconomy(economy, state.city, { total: 500, growthProgress: 0 }, SIMULATION_SECONDS_PER_DAY)
    expect(result.materials).toBeCloseTo(6, 6)
    expect(result.materialsConsumed).toBe(0)
  })

  it('construction costs are centralized and documented', () => {
    expect(CONSTRUCTION_COSTS.house).toBe(20)
    expect(CONSTRUCTION_COSTS.farm).toBe(20)
    expect(CONSTRUCTION_COSTS.road).toBe(5)
    expect(CONSTRUCTION_COSTS.community).toBe(30)
    expect(EVOLVE_COST).toBe(15)
  })

  it('insufficient materials prevent spending and resources never go negative', () => {
    const economy = createEconomyState()
    expect(canAffordMaterials(economy, 20)).toBe(false)
    expect(trySpendMaterials(economy, 20)).toBeNull()
    const rich = createInitialEconomyState()
    const spent = trySpendMaterials(rich, 20)
    expect(spent?.materials).toBe(280)
    expect(spent?.materialsConsumed).toBe(20)
    const drained = advanceEconomy(rich, { ...createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 })).city, buildings: [], services: [] }, { total: 100000, growthProgress: 0 }, SIMULATION_SECONDS_PER_DAY * 365)
    expect(drained.food).toBeGreaterThanOrEqual(0)
    expect(drained.energy).toBeGreaterThanOrEqual(0)
    expect(drained.materials).toBeGreaterThanOrEqual(0)
  })

  it('two identical runs produce identical resource state', () => {
    const run = () => {
      const state = createInitialSettlement(createWorld({ seed: 99, width: 64, height: 48 }))
      return advanceEconomy(state.economy, state.city, { total: 12, growthProgress: 0 }, SIMULATION_SECONDS_PER_DAY)
    }
    expect(run()).toEqual(run())
  })

  it('resource summary exposes player-facing values', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 }))
    const summary = toResourceSummary(state)
    expect(summary.food).toBe(180)
    expect(summary.energy).toBe(120)
    expect(summary.materials).toBe(300)
    expect(summary.constrained).toBe(false)
  })
})
