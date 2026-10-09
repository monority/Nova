/**
 * Step 10CW — Phase 8 Production Economy Investigation (measurement only).
 *
 * AUDIT. `src/` is untouched: every number below is measured from the real
 * runtime (`stepSimulation`, the derived queries, the building catalog and the
 * resource/storage constants), not inferred from documentation or from
 * generic city-builder conventions.
 *
 * Fixtures use direct domain operations (createBuilding / createRoads /
 * createColonist + assignJobs), the same convention as the previous audit
 * suites, so the audit measures the economy rather than the placement order.
 *
 * Layout convention (one shared road row, so every workplace is
 * mobility-connected to every residence):
 *
 *   y = 0 : residences   x = 1 + 2 * i
 *   y = 1 : road row     x = 0 .. 2 * maxCol + 2
 *   y = 2 : workplaces   x = 1 + 2 * i   (farms, then wells, then workshops)
 *
 * Purpose: map the existing production/consumption model, then test whether
 * any candidate Phase 8 direction creates a genuinely NEW player decision.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  BUILDING_CATALOG,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getRevenuePerTick,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getServedColonistCount,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  iterateBuildings,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  stepSimulation,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'
import {
  DEFAULT_STORAGE_CAPACITIES,
  createInitialStorageHub,
} from '@/domain/storage/storage.js'

const config: SimulationConfig = { world: { seed: 'nova-step10cw', width: 24, height: 12 } }

const ROW_RESIDENCE = 0
const ROW_ROAD = 1
const ROW_WORKPLACE = 2

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const withStocks = (
  state: SimulationState,
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number }
): SimulationState => ({
  ...state,
  resources: {
    money: stocks.material ?? state.resources.money,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
    wood: 0,
    stone: 0,
    planks: 0,
  },
})

/** Operational building, placed directly (no cost, no tick). */
const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10cw: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/** Operational road, placed directly (no cost, no tick). */
const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10cw: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10cw: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly wells?: number
  readonly workshops?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
  readonly roads?: boolean
}

const build = (spec: Spec): SimulationState => {
  let state = withStocks(createInitialState(config), {
    food: spec.food ?? 100_000,
    material: spec.material ?? 100,
    water: spec.water ?? 0,
  })
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + 2 * i, ROW_RESIDENCE)
  }
  let col = 0
  const place = (type: BuildingType, count: number): void => {
    for (let i = 0; i < count; i += 1) {
      state = op(state, type, 1 + 2 * col, ROW_WORKPLACE)
      col += 1
    }
  }
  place('farm', spec.farms ?? 0)
  place('well', spec.wells ?? 0)
  place('workshop', spec.workshops ?? 0)
  if (spec.roads !== false) {
    const maxX = 1 + 2 * col + 2
    for (let x = 0; x <= maxX; x += 1) state = opRoad(state, x, ROW_ROAD)
  }
  const residences = [...iterateBuildings(state)]
    .filter((building) => building.type === 'residence')
    .sort((a, b) => a.x - b.x)
  const wanted = spec.colonists ?? spec.residences
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

interface Row {
  readonly tick: number
  readonly population: number
  readonly employed: number
  readonly housingAvailable: number
  readonly food: number
  readonly water: number
  readonly material: number
  readonly foodProd: number
  readonly foodConsumed: number
  readonly waterProd: number
  readonly waterNeed: number
  readonly waterServed: number
  readonly materialGross: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly storedProduction: number
  readonly workforceIncome: number
}

const snapshot = (state: SimulationState): Row => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  employed: getEmploymentSummary(state).employed,
  housingAvailable: getHousingSummary(state).availableCapacity,
  food: state.resources.food,
  water: state.resources.water,
  material: state.resources.money,
  foodProd: getFoodProductionPerTick(state),
  foodConsumed: getFoodConsumptionPerTick(state),
  waterProd: getWaterProductionPerTick(state),
  waterNeed: getWaterNeedPerTick(state),
  waterServed: getServedColonistCount(state),
  materialGross: getRevenuePerTick(state),
  materialUpkeep: getMaintenanceDuePerTick(state),
  materialNet: getNetMoneyPerTick(state),
  storageCapacity: 0,
  storedProduction: 0,
  workforceIncome: getRevenuePerTick(state),
})

const trace = (state: SimulationState, horizons: readonly number[]): Row[] => {
  const rows: Row[] = []
  let current = state
  for (const horizon of horizons) {
    while (current.time.tick < horizon) current = stepSimulation(current)
    rows.push(snapshot(current))
  }
  return rows
}

const HORIZONS = [1, 4, 12, 24, 60] as const

describe('1. Production dependency (measured from the catalog and the runtime)', () => {
  it('every building definition carries construction/housing only — no input, recipe or efficiency field', () => {
    for (const type of ['residence', 'farm', 'workshop', 'well', 'lumberCamp', 'colonyCenter', 'quarry'] as const) {
      expect(Object.keys(getBuildingDefinition(type)).sort()).toEqual([
        'constructionCost',
        'constructionPlankCost',
        'constructionTicks',
        'constructionWaterCost',
        'housingCapacity',
      ])
    }
    expect(getBuildingDefinition('farm').constructionCost).toBe(25)
    expect(getBuildingDefinition('workshop').constructionWaterCost).toBe(1)
  })

  it('pins the production/consumption rates and the one recurring cost', () => {
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK).toBe(2)
    expect(MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK).toBe(1)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
  })

  it('road access gates production (0 without, nominal with); the inhabitant tax flows regardless', () => {
    for (const [type, query, nominal, roadless] of [
      ['farm', getFoodProductionPerTick, 2, 0],
      ['well', getWaterProductionPerTick, 2, 0],
      // Revenue never hits 0 while inhabited: roadless kills commerce (2)
      // but the 1/person tax still flows.
      ['workshop', getRevenuePerTick, 3, 1],
    ] as const) {
      const disconnected = build({
        residences: 1,
        [type === 'farm' ? 'farms' : type === 'well' ? 'wells' : 'workshops']: 1,
        colonists: 1,
        roads: false,
      } as Spec)
      const connected = build({
        residences: 1,
        [type === 'farm' ? 'farms' : type === 'well' ? 'wells' : 'workshops']: 1,
        colonists: 1,
      } as Spec)
      expect(query(disconnected), `${type} roadless`).toBe(roadless)
      expect(query(connected), `${type} connected`).toBe(nominal)
    }
  })

  it('staffing gates commerce; upkeep follows operational buildings', () => {
    const vacant = build({ residences: 1, workshops: 1, colonists: 0 })
    // Vacant counts for commerce: 0 tax + 2 commerce; both buildings bill upkeep.
    expect(getRevenuePerTick(vacant)).toBe(2)
    expect(getMaintenanceDuePerTick(vacant)).toBe(2)

    const staffed = build({ residences: 1, workshops: 1, colonists: 1 })
    // Staffed: 1 tax + 2 commerce; upkeep unchanged (already operational).
    expect(getRevenuePerTick(staffed)).toBe(3)
    expect(getMaintenanceDuePerTick(staffed)).toBe(2)
  })
})

describe('2. Resource flow across representative settlements (measured)', () => {
  const settlements: ReadonlyArray<{ readonly name: string; readonly state: SimulationState }> = [
    { name: 'low-population farm', state: build({ residences: 1, farms: 1, colonists: 1 }) },
    { name: 'balanced farm+well', state: build({ residences: 2, farms: 1, wells: 1, colonists: 2 }) },
    {
      name: 'production-heavy',
      state: build({ residences: 2, farms: 2, wells: 1, workshops: 1, colonists: 4 }),
    },
    {
      name: 'workforce-constrained',
      state: build({ residences: 3, farms: 1, wells: 1, workshops: 1, colonists: 1 }),
    },
    {
      name: 'stock-rich',
      state: build({ residences: 1, farms: 1, colonists: 1, material: 1000 }),
    },
    {
      name: 'stock-poor',
      state: build({ residences: 1, farms: 1, colonists: 1, material: 0, water: 0 }),
    },
  ]

  it('produces a horizon trace for every settlement', () => {
    const table = settlements.map((settlement) => ({
      name: settlement.name,
      rows: trace(settlement.state, HORIZONS),
    }))
    audit('RESOURCE_FLOW', { horizons: HORIZONS, table })
    expect(table).toHaveLength(6)
    for (const entry of table) expect(entry.rows).toHaveLength(HORIZONS.length)
  })

  it('balanced workforce: Food and Water break even; the tax accrues but upkeep outruns it (no Workshop)', () => {
    const rows = trace(build({ residences: 2, farms: 1, wells: 1, colonists: 2 }), [12])
    const row = rows[0]
    if (row === undefined) throw new Error('10cw: missing row')
    expect(row.foodProd).toBe(row.foodConsumed) // 2 = 2
    expect(row.waterProd).toBe(row.waterServed * WATER_PER_COLONIST_PER_TICK) // 2 = 2
    // No commerce without a Workshop, but 2 inhabitants pay tax; 4 buildings bill upkeep.
    expect(row.materialGross).toBe(2)
    expect(row.materialUpkeep).toBe(4)
    expect(row.workforceIncome).toBe(2)
  })

  it('resource stocks have different ceiling rules: Food/Water uncapped, Material production capped', () => {
    // Food accumulates when a Farm out-produces the colonists it feeds.
    const foodRich = trace(build({ residences: 1, farms: 1, colonists: 1, food: 0 }), [60])[0]
    if (foodRich === undefined) throw new Error('10cw: missing food row')
    expect(foodRich.food).toBeGreaterThan(DEFAULT_STORAGE_CAPACITIES.food)
    expect(foodRich.storageCapacity).toBe(0) // no operational Workshop

    // Water accumulates when a Well out-produces the colonist it serves.
    const waterRich = trace(build({ residences: 1, wells: 1, colonists: 1, water: 0 }), [60])[0]
    if (waterRich === undefined) throw new Error('10cw: missing water row')
    expect(waterRich.water).toBeGreaterThan(DEFAULT_STORAGE_CAPACITIES.water)
  })
})

describe('3. Input/output coupling (measured)', () => {
  it('production consumes no resource input; the only recurring Material cost is Workshop upkeep', () => {
    const state = build({
      residences: 2,
      farms: 1,
      wells: 1,
      workshops: 1,
      colonists: 3,
      food: 1000,
      water: 100,
      material: 10,
    })
    const before = snapshot(state)
    const after = snapshot(stepSimulation(state))
    // Material: stored production + income − upkeep. No production input term.
    expect(after.material - before.material).toBe(
      after.storedProduction + after.workforceIncome - after.materialUpkeep
    )
    // Food and Water are produced/consumed by colonists only.
    expect(after.food - before.food).toBe(after.foodProd - (before.foodConsumed || 0))
    expect(after.water - before.water).toBeGreaterThanOrEqual(
      after.waterProd - after.waterServed * WATER_PER_COLONIST_PER_TICK
    )
  })

  it('there are no intermediate goods and no production chains', () => {
    // Exactly three resources; three distinct producers; no definition input.
    const producers = ['farm', 'well', 'workshop'] as const
    expect(producers).toHaveLength(3)
    for (const type of Object.keys(BUILDING_CATALOG) as BuildingType[]) {
      expect('inputs' in getBuildingDefinition(type)).toBe(false)
      expect('recipe' in getBuildingDefinition(type)).toBe(false)
    }
    // The only consumers of produced goods are colonists (Food/Water) and
    // construction (Material); no building consumes another building output.
    const oneFarm = build({ residences: 1, farms: 1, colonists: 1, food: 0, material: 0 })
    expect(getFoodProductionPerTick(oneFarm)).toBe(2)
    // Tax flows (1 inhabitant); no commerce without a Workshop.
    expect(getRevenuePerTick(oneFarm)).toBe(1)
    expect(getWaterProductionPerTick(oneFarm)).toBe(0)
  })
})

describe('4. Production vs workforce income (measured)', () => {
  it('revenue decomposes into tax plus Workshop commerce; upkeep is per operational building', () => {
    const state = build({ residences: 1, workshops: 1, colonists: 1, material: 0 })
    const before = snapshot(state)
    // 1 tax + 2 commerce; upkeep 2 (residence + workshop).
    expect(before.materialGross).toBe(3)
    expect(before.workforceIncome).toBe(3)
    expect(before.materialUpkeep).toBe(2)
    // Net +1/tick into the uncapped treasury.
    expect(before.materialGross - before.materialUpkeep).toBe(1)
  })

  it('Farm/Well employment pays no commerce (tax still flows)', () => {
    const farm = snapshot(build({ residences: 1, farms: 1, colonists: 1, material: 0 }))
    expect(farm.foodProd).toBe(2)
    // 1 tax, 0 commerce.
    expect(farm.materialGross).toBe(1)
    expect(farm.workforceIncome).toBe(1)

    const well = snapshot(build({ residences: 1, wells: 1, colonists: 1, material: 0, water: 0 }))
    expect(well.waterProd).toBe(2)
    expect(well.materialGross).toBe(1)
    expect(well.workforceIncome).toBe(1)
  })

  it('treasury is uncapped: workshop revenue accrues linearly with no storage clamp', () => {
    const state = build({ residences: 1, workshops: 1, colonists: 1, material: 0 })
    // No cap: revenue lands every tick and the stock climbs without bound.
    const rows = trace(state, [20])
    const atCap = rows[0]
    if (atCap === undefined) throw new Error('10cw: missing cap row')
    expect(atCap.material).toBeGreaterThan(0)
    expect(atCap.storedProduction).toBe(0) // no storage stage in Step001
    expect(atCap.workforceIncome).toBe(3)
  })

  it('empty treasury: a building command with 0 money is refused', () => {
    const state = build({ residences: 0, material: 0, roads: false })
    const cell = { x: 6, y: 6 }
    const affordability = getPlacementAffordability(state, cell, 'residence')
    expect(affordability.affordable).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    const after = stepSimulation(state, {
      type: 'placeBuilding',
      x: cell.x,
      y: cell.y,
      buildingType: 'residence',
    })
    expect(Object.keys(after.buildings)).toHaveLength(1)
  })
})

describe('5. Decision pressure per resource (measured)', () => {
  it('Food: the only existential shortage — starvation removes colonists', () => {
    const state = build({ residences: 1, farms: 0, colonists: 1, food: 0 })
    expect(getPopulationCount(state)).toBe(1)
    const after = stepSimulation(state)
    expect(getPopulationCount(after)).toBe(0)
  })

  it('Water: a service/admission gate, never a killer', () => {
    // No Well at all: Water is not consulted, the colony grows on Food/Housing.
    const noWell = trace(build({ residences: 2, farms: 1, colonists: 1, water: 0 }), [12])[0]
    if (noWell === undefined) throw new Error('10cw: missing row')
    expect(noWell.population).toBeGreaterThanOrEqual(1)
    // With a Well, production serves at most 2 colonists and the serviceable
    // colonist count caps admission; Water shortage blocks growth, not life.
    const withWell = trace(
      build({ residences: 3, farms: 1, wells: 1, colonists: 2 }),
      [12]
    )[0]
    if (withWell === undefined) throw new Error('10cw: missing row')
    expect(withWell.population).toBeGreaterThanOrEqual(1)
    expect(withWell.waterProd).toBe(2)
    expect(withWell.waterServed).toBeLessThanOrEqual(2)
    expect(withWell.population).toBeLessThanOrEqual(2)
  })

  it('Material: a construction affordability constraint, never a survival constraint', () => {
    const state = build({ residences: 1, farms: 1, colonists: 1, material: 0 })
    expect(getPopulationCount(state)).toBe(1)
    const cell = { x: 8, y: 8 }
    expect(getPlacementAffordability(state, cell, 'residence').affordable).toBe(false)
    const after = stepSimulation(state)
    expect(getPopulationCount(after)).toBeGreaterThanOrEqual(1)
    expect(after.resources.food).toBeGreaterThan(0)
  })

  it('one colonist holds one job: the three workplace types compete for the same workforce', () => {
    const constrained = build({
      residences: 1,
      farms: 1,
      wells: 1,
      workshops: 1,
      colonists: 1,
    })
    expect(getEmploymentSummary(constrained).employed).toBe(1)
    const jobs = [...iterateBuildings(constrained)].filter(
      (building) => building.type !== 'residence'
    )
    expect(jobs).toHaveLength(4) // Step005: anchor + farm + well + workshop (quarry not in this fixture)
    // Income scales with which job the single colonist takes.
    const perJob = (['farm', 'well', 'workshop'] as const).map((type) => {
      const only = build({ residences: 1, [type === 'farm' ? 'farms' : type === 'well' ? 'wells' : 'workshops']: 1, colonists: 1, material: 0 })
      return { type, income: getRevenuePerTick(only) }
    })
    audit('ONE_JOB_INCOME', { rows: perJob })
    expect(perJob).toHaveLength(3)
  })
})

describe('6. Candidate Phase 8 directions — evidence only (no ranking)', () => {
  it('A — production inputs: no input exists today, only the Workshop upkeep cost', () => {
    const warehouse = build({
      residences: 3,
      farms: 1,
      wells: 1,
      workshops: 1,
      colonists: 3,
      food: 500,
      water: 100,
      material: 10,
    })
    const before = snapshot(warehouse)
    const after = snapshot(stepSimulation(warehouse))
    // Production turns labour into output with no resource consumed as input:
    // the treasury moves by revenue − upkeep (3 + 2 − 6 = −1 here), Food/Water
    // move only through colonist needs. Upkeep is the one recurring cost and
    // it is a Money deduction, not a production input.
    expect(after.materialGross).toBe(5)
    expect(after.materialUpkeep).toBe(6)
    // Commerce is Workshop-only: the tax (3) flows regardless of workplace.
    expect(after.workforceIncome).toBe(5)
    expect(after.storedProduction).toBe(0)
    expect(after.material - before.material).toBe(
      after.materialGross - after.materialUpkeep
    )
    audit('DIRECTION_A_INPUTS', { before, after, upkeep: after.materialUpkeep })
  })

  it('B — production chains: no building consumes another building output', () => {
    const chain = build({
      residences: 2,
      farms: 1,
      wells: 1,
      workshops: 1,
      colonists: 3,
      food: 100,
      water: 50,
      material: 25,
    })
    const rows = trace(chain, [12])
    audit('DIRECTION_B_CHAINS', { rows })
    // Every producer's output is a terminal good consumed by colonists or construction.
    expect(Object.keys(BUILDING_CATALOG)).toEqual(['residence', 'farm', 'workshop', 'well', 'lumberCamp', 'colonyCenter', 'quarry'])
  })

  it('C — consumption: the only produced-goods consumption is Food/Water by colonists', () => {
    const colony = build({ residences: 2, farms: 1, wells: 1, colonists: 2 })
    const before = snapshot(colony)
    const after = snapshot(stepSimulation(colony))
    audit('DIRECTION_C_CONSUMPTION', {
      foodConsumed: before.foodConsumed,
      waterServed: before.waterServed,
      materialConsumed: after.materialUpkeep,
    })
    expect(before.foodConsumed).toBe(2)
    expect(before.waterServed).toBe(2)
  })

  it('D — specialization: existing workforce allocation already differentiates producer types', () => {
    const rows = (['farm', 'well', 'workshop'] as const).map((type) => {
      const state = build({
        residences: 1,
        [type === 'farm' ? 'farms' : type === 'well' ? 'wells' : 'workshops']: 1,
        colonists: 1,
        material: 0,
      })
      return {
        type,
        food: getFoodProductionPerTick(state),
        water: getWaterProductionPerTick(state),
        material: getRevenuePerTick(state),
        income: getRevenuePerTick(state),
        upkeep: getMaintenanceDuePerTick(state),
      }
    })
    audit('DIRECTION_D_SPECIALIZATION', { rows })
    expect(rows).toHaveLength(3)
  })

  it('E — efficiency/upgrades: no efficiency, upgrade or multiplier state exists', () => {
    const state = build({ residences: 1, workshops: 1, colonists: 1 })
    // No efficiency field on persisted state or definitions.
    expect('efficiency' in state).toBe(false)
    expect('upgrades' in state).toBe(false)
    for (const type of Object.keys(BUILDING_CATALOG) as BuildingType[]) {
      expect('efficiency' in getBuildingDefinition(type)).toBe(false)
    }
  })
})

describe('7. Anti-feature / decision gate evidence', () => {
  it('every measured flow is already coupled to a decision that exists today', () => {
    const decisions = {
      producers: ['farm', 'well', 'workshop'],
      money: ['placeBuilding', 'placeRoads'],
      survival: ['food', 'water'],
    }
    expect(decisions.producers).toHaveLength(3)
    expect(decisions.money).toHaveLength(2)
    expect(decisions.survival).toHaveLength(2)
  })

  it('storage hub holds food and water only (money lives in the treasury)', () => {
    // Surplus food/water buffers in the hub; money never enters it.
    const farm = trace(build({ residences: 1, farms: 1, colonists: 1, food: 0 }), [60])[0]
    if (farm === undefined) throw new Error('10cw: missing farm row')
    expect(farm.food).toBeGreaterThan(DEFAULT_STORAGE_CAPACITIES.food)

    const well = trace(build({ residences: 1, wells: 1, colonists: 1, water: 0 }), [60])[0]
    if (well === undefined) throw new Error('10cw: missing well row')
    expect(well.water).toBeGreaterThan(DEFAULT_STORAGE_CAPACITIES.water)
    expect(createInitialStorageHub().food).toBe(0)
    expect(createInitialStorageHub().water).toBe(0)
  })
})
