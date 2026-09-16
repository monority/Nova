export type { EconomyState } from './economy-state'
export {
  FOOD_CONSUMPTION_PER_PERSON_PER_DAY,
  advanceEconomy,
  canAffordMaterials,
  createEconomyState,
  createInitialEconomyState,
  getEnergyConsumptionPerDay,
  getEnergyProductionPerDay,
  getFoodProductionPerDay,
  trySpendMaterials,
} from './economy-state'
export {
  CONSTRUCTION_COSTS,
  ENERGY_PER_BUILDING_PER_DAY,
  ENERGY_PER_SERVICE_PER_DAY,
  EVOLVE_COST,
  INITIAL_ENERGY,
  INITIAL_FOOD,
  INITIAL_MATERIALS,
  MATERIALS_PER_DAY_SETTLEMENT_SOURCE,
  PEOPLE_PER_ENERGY_UNIT_PER_DAY,
  constructionCost,
} from './resource-costs'
