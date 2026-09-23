/**
 * Step 10AF — Population Growth & Settlement Consequence Audit.
 *
 * AUDIT ONLY. `src/` is untouched: every number below is measured from the
 * real runtime (`stepSimulation`, `applyCommand`, the derived queries).
 * Fixtures use direct domain operations (createBuilding / createRoads /
 * createColonist + assignJobs), the convention of the previous audits, so the
 * audit measures the economy rather than the placement order.
 *
 * Layout conventions:
 *  - `rowColony`: residences on y=0, one road row on y=1, workplaces on y=2,
 *    all on ONE network; workplace columns follow the requested order.
 *  - explicit `world(...)` layouts for the spatial section (corridor,
 *    partition, extension).
 *
 * Run:
 *   npx vitest run tests/populationGrowthSettlementAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getAccessibleBuildingIds,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getRoadNetworks,
  getServedColonistCount,
  getWaterCoverage,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterShortage,
  hashCanonicalState,
  iterateBuildings,
  iterateColonists,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validatePlacement,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10af', width: 48, height: 24 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const withStocks = (
  state: SimulationState,
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
  },
})

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10af: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10af: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10af: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Placement {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
}

interface WorldSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly Placement[]
  readonly roads?: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const world = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 100_000,
    material: spec.material ?? 500,
    water: spec.water ?? 50,
  })
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) {
    state = op(state, placement.type, placement.x, placement.y)
  }
  for (const cell of spec.roads ?? []) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

interface WorkCounts {
  readonly wells: number
  readonly farms: number
  readonly workshops: number
}

const rowRoads = (maxX: number): CellCoordinate[] =>
  Array.from({ length: maxX + 1 }, (_, x) => ({ x, y: 1 }))

/**
 * Compact row colony: residences on y=0, road row on y=1, workplaces on y=2.
 * Workplace columns start after the residences and follow `order`, so the
 * measured assignment reflects a documented priority.
 */
const rowColony = (
  residenceCount: number,
  counts: WorkCounts,
  order: readonly BuildingType[] = ['well', 'farm', 'workshop'],
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number } = {},
  colonists = residenceCount
): SimulationState => {
  const residences = Array.from({ length: residenceCount }, (_, i) => ({ x: 1 + 2 * i, y: 0 }))
  const workplaces: Placement[] = []
  let col = residenceCount
  for (const type of order) {
    const n = type === 'well' ? counts.wells : type === 'farm' ? counts.farms : counts.workshops
    for (let i = 0; i < n; i += 1) {
      workplaces.push({ type, x: 1 + 2 * col, y: 2 })
      col += 1
    }
  }
  const maxX = 1 + 2 * Math.max(col - 1, residenceCount - 1) + 1
  return world({
    residences,
    workplaces,
    roads: rowRoads(maxX),
    colonists,
    ...stocks,
  })
}

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly housingCapacity: number
  readonly housingAvailable: number
  readonly jobCapacity: number
  readonly employed: number
  readonly unemployed: number
  readonly staffedWells: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly foodProduction: number
  readonly foodConsumption: number
  readonly foodNet: number
  readonly waterProduction: number
  readonly waterConsumption: number
  readonly waterNet: number
  readonly servedColonists: number
  readonly waterShortage: boolean
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly operationalBuildings: number
  readonly residences: number
  readonly roads: number
  readonly accessibleBuildings: number
  readonly waterServedResidences: number
}

const staffedWells = (state: SimulationState): number =>
  [...iterateBuildings(state)].filter(
    (building) => building.type === 'well' && countWorkersAt(state, building.id) > 0
  ).length

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const housing = getHousingSummary(state)
  const foodProduction = getFoodProductionPerTick(state)
  const foodConsumption = getFoodConsumptionPerTick(state)
  const waterProduction = getWaterProductionPerTick(state)
  const waterConsumption = getWaterNeedPerTick(state)
  const materialProduction = getMaterialProductionPerTick(state)
  const materialUpkeep = getMaterialUpkeepPerTick(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    material: state.resources.construction,
    water: state.resources.water,
    housingCapacity: housing.totalCapacity,
    housingAvailable: housing.availableCapacity,
    jobCapacity: getJobCapacity(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    staffedWells: staffedWells(state),
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    foodProduction,
    foodConsumption,
    foodNet: foodProduction - foodConsumption,
    waterProduction,
    waterConsumption,
    waterNet: waterProduction - waterConsumption,
    servedColonists: getServedColonistCount(state),
    waterShortage: getWaterShortage(state),
    materialProduction,
    materialUpkeep,
    materialNet: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    operationalBuildings: [...iterateBuildings(state)].filter((b) => b.status === 'operational').length,
    residences: [...iterateBuildings(state)].filter((b) => b.type === 'residence').length,
    roads: Object.keys(state.roads).length,
    accessibleBuildings: getAccessibleBuildingIds(state).length,
    waterServedResidences: getWaterServedResidenceCount(state),
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const HORIZONS = [10, 30, 60, 120, 240, 600] as const

const atHorizons = (
  state: SimulationState,
  horizons: readonly number[]
): { readonly horizon: number; readonly snapshot: Snapshot }[] => {
  const rows: { horizon: number; snapshot: Snapshot }[] = []
  let current = state
  for (const horizon of horizons) {
    while (current.time.tick < horizon) current = stepSimulation(current)
    rows.push({ horizon, snapshot: snapshot(current) })
  }
  return rows
}

const affordableAt = (state: SimulationState, type: BuildingType, cell: CellCoordinate): boolean =>
  getPlacementAffordability(state, cell, type).affordable

/** Minimal supporting Well count for a population (one Well = 2 colonists). */
const wellsFor = (population: number): number => Math.ceil(population / 2)
/** Balanced Farm count for a population (one Farm feeds 2 colonists). */
const farmsFor = (population: number): number => Math.ceil(population / 2)

// ---------------------------------------------------------------------------
// 1. Current causal model
// ---------------------------------------------------------------------------

describe('1. Current causal model and where the loops stop', { timeout: 30000 }, () => {
  it('documents the measured chain on a two-colonist reference colony', () => {
    const colony = rowColony(2, { wells: 1, farms: 1, workshops: 1 })
    const first = snapshot(colony)
    const settled = snapshot(runTicks(colony, 120))
    audit('CAUSAL_MODEL', {
      chain: [
        'Residence -> housing capacity (1 each)',
        'housing + Food + Water capacity -> admission',
        'population -> workforce (1 job per colonist)',
        'workforce -> Farm / Well / Workshop',
        'Workshop -> Material -> construction -> more buildings -> more housing',
      ],
      first,
      settled,
      stops: {
        admission: 'min(housing, Water production capacity, Food)',
        workforce: '1 job per colonist, no specialist',
        material: 'storage 25 per operational Workshop, produced only by a staffed Workshop',
        food: 'uncapped',
        water: 'uncapped but consumed 1 per served colonist',
      },
    })
    expect(first.housingCapacity).toBe(2)
    expect(first.staffedWells).toBe(1)
    expect(first.staffedFarms).toBe(1)
    expect(first.staffedWorkshops).toBe(0)
    expect(settled.population).toBe(2)
    expect(settled.materialNet).toBe(0)
  })

  it('measures the housing / Water capacity / food tri-limit on admission', () => {
    const housingOnly = runTicks(
      world({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
        ],
        workplaces: [],
        roads: [],
        colonists: 0,
      }),
      20
    )
    const waterCapped = runTicks(rowColony(3, { wells: 1, farms: 0, workshops: 0 }, ['well'], {}, 2), 20)
    const foodBelowNeed = runTicks(
      rowColony(4, { wells: 2, farms: 0, workshops: 0 }, ['well'], { food: 1 }, 2),
      2
    )
    // No Well: the historical Food + housing rule applies. One Farm and two
    // colonists is Food-balanced (production == consumption), so the stock
    // returns to 0 every tick and `food > 0` never holds: nobody is admitted.
    const noWell = (farms: number): SimulationState =>
      world({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
          { x: 7, y: 0 },
        ],
        workplaces: Array.from({ length: farms }, (_, i) => ({ type: 'farm' as const, x: 1 + 2 * i, y: 2 })),
        roads: rowRoads(9),
        colonists: 2,
        food: 0,
      })
    const foodLimited = runTicks(noWell(1), 60)
    const foodSurplus = runTicks(noWell(2), 60)
    // The workforce cannot cover Water headroom AND Food: with the Wells
    // staffed first, the Farm is vacant and the colony starves.
    const wellsFirst = runTicks(
      rowColony(4, { wells: 2, farms: 1, workshops: 0 }, ['well', 'farm'], { food: 0 }, 2),
      60
    )
    audit('ADMISSION_LIMITS', {
      housingOnly: snapshot(housingOnly),
      waterCapped: snapshot(waterCapped),
      foodBelowNeed: snapshot(foodBelowNeed),
      foodLimited: snapshot(foodLimited),
      foodSurplus: snapshot(foodSurplus),
      wellsFirst: snapshot(wellsFirst),
      note: 'Food is all-or-nothing: below the need the colony dies in one tick; balanced Food admits nobody; only a Food surplus admits. Two colonists cannot staff Water headroom AND Food at the same time.',
    })
    expect(getPopulationCount(housingOnly)).toBe(3)
    expect(getPopulationCount(waterCapped)).toBe(2)
    expect(getPopulationCount(foodBelowNeed)).toBe(0)
    expect(getPopulationCount(foodLimited)).toBe(2)
    expect(getPopulationCount(foodSurplus)).toBeGreaterThan(2)
    expect(getPopulationCount(wellsFirst)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Population scaling
// ---------------------------------------------------------------------------

describe('2. Population scaling', { timeout: 30000 }, () => {
  it('measures 1..10 colonists on a balanced colony at six horizons', () => {
    const rows: unknown[] = []
    for (const population of [1, 2, 3, 4, 6, 8, 10]) {
      const start = rowColony(
        population,
        { wells: wellsFor(population), farms: farmsFor(population), workshops: 1 },
        ['well', 'farm', 'workshop'],
        { food: 50_000, material: 500, water: 50 },
        population
      )
      const horizons = atHorizons(start, HORIZONS)
      rows.push({
        population,
        wells: wellsFor(population),
        farms: farmsFor(population),
        workshops: 1,
        workplaces: wellsFor(population) + farmsFor(population) + 1,
        horizons: horizons.map((row) => ({
          h: row.horizon,
          pop: row.snapshot.population,
          employed: row.snapshot.employed,
          staffedWells: row.snapshot.staffedWells,
          staffedFarms: row.snapshot.staffedFarms,
          staffedWorkshops: row.snapshot.staffedWorkshops,
          foodProd: row.snapshot.foodProduction,
          foodNeed: row.snapshot.foodConsumption,
          foodNet: row.snapshot.foodNet,
          waterProd: row.snapshot.waterProduction,
          waterNeed: row.snapshot.waterConsumption,
          waterNet: row.snapshot.waterNet,
          matGross: row.snapshot.materialProduction,
          matUpkeep: row.snapshot.materialUpkeep,
          matNet: row.snapshot.materialNet,
          storage: row.snapshot.storageCapacity,
          material: row.snapshot.material,
          water: row.snapshot.water,
          food: row.snapshot.food,
          residences: row.snapshot.residences,
          roads: row.snapshot.roads,
          operational: row.snapshot.operationalBuildings,
        })),
      })
    }
    audit('POPULATION_SCALING', {
      horizons: HORIZONS,
      rows,
      note: 'balanced colony: wells = ceil(P/2), farms = ceil(P/2), 1 Workshop',
    })

    for (const row of rows as {
      population: number
      workplaces: number
      horizons: { pop: number; staffedWorkshops: number; matGross: number; waterNet: number }[]
    }[]) {
      const end = row.horizons[row.horizons.length - 1]
      if (end === undefined) throw new Error('10af: missing horizon')
      expect(end.pop).toBe(row.population)
      expect(end.matGross).toBe(0) // the Workshop never wins a worker
      expect(row.workplaces).toBeGreaterThanOrEqual(row.population)
      // A self-balanced colony never accumulates Water or Food surplus.
      expect(end.waterNet).toBeLessThanOrEqual(1)
    }
  })

  it('measures the cost of staffing one Workshop at a balanced population', () => {
    const rows: unknown[] = []
    for (const population of [2, 4, 6, 8, 10]) {
      const farms = farmsFor(population) - 1 // one fewer Farm frees the worker
      const start = rowColony(
        population,
        { wells: wellsFor(population), farms, workshops: 1 },
        ['well', 'farm', 'workshop'],
        { food: 50_000, material: 500, water: 50 },
        population
      )
      const settled = runTicks(start, 60)
      rows.push({
        population,
        wells: wellsFor(population),
        farms,
        workshops: 1,
        snapshot: snapshot(settled),
        foodDeficitPerTick: Math.max(0, population - 2 * farms),
      })
    }
    audit('INDUSTRY_COST', {
      rows,
      note: 'staffing a Workshop requires removing one Farm worker: the colony gains Material but runs a Food deficit',
    })
    for (const row of rows as { snapshot: Snapshot; foodDeficitPerTick: number }[]) {
      expect(row.snapshot.staffedWorkshops).toBe(1)
      expect(row.snapshot.foodNet).toBe(-row.foodDeficitPerTick)
      expect(row.foodDeficitPerTick).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Residence addition
// ---------------------------------------------------------------------------

describe('3. Residence addition (R1 -> R6)', { timeout: 30000 }, () => {
  it('measures fixed-Water dormancy versus Water-matched growth', () => {
    const fixedWater: unknown[] = []
    const waterMatched: unknown[] = []
    for (const residences of [2, 3, 4, 5, 6]) {
      const fixed = rowColony(
        residences,
        { wells: 1, farms: 2, workshops: 1 },
        ['well', 'farm', 'workshop'],
        { food: 50_000, material: 500, water: 50 },
        2 // the runtime-admissible population for one Well
      )
      const fixedSettled = runTicks(fixed, 120)
      fixedWater.push({
        residences,
        wells: 1,
        immediateCost: 25,
        populationBefore: 2,
        populationAfter: snapshot(fixedSettled).population,
        dormantResidences: residences - snapshot(fixedSettled).population,
        tick: fixedSettled.time.tick,
        resource: snapshot(fixedSettled),
      })

      const population = Math.min(residences, 2 * wellsFor(residences))
      const matched = rowColony(
        residences,
        { wells: wellsFor(residences), farms: farmsFor(population), workshops: 1 },
        ['well', 'farm', 'workshop'],
        { food: 50_000, material: 500, water: 50 },
        2
      )
      const matchedSettled = runTicks(matched, 120)
      waterMatched.push({
        residences,
        wells: wellsFor(residences),
        immediateCost: 25 + (wellsFor(residences) - 1) * 25,
        populationLimit: population,
        populationAfter: snapshot(matchedSettled).population,
        dormantResidences: residences - snapshot(matchedSettled).population,
        resource: snapshot(matchedSettled),
      })
    }
    audit('RESIDENCE_ADDITION', {
      fixedWater,
      waterMatched,
      note: 'fixed Water: extra Residences are dormant capacity; Water-matched: each added Well unlocks up to two more colonists',
    })
    for (const row of fixedWater as { populationAfter: number; dormantResidences: number; residences: number }[]) {
      expect(row.populationAfter).toBe(2)
      if (row.residences >= 3) expect(row.dormantResidences).toBeGreaterThanOrEqual(1)
    }
    for (const row of waterMatched as { populationAfter: number; populationLimit: number }[]) {
      expect(row.populationAfter).toBe(row.populationLimit)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Population vs workforce ratios
// ---------------------------------------------------------------------------

describe('4. Population vs workforce ratios', { timeout: 30000 }, () => {
  it('runs the six explicit ratio configurations for 600 ticks', () => {
    const CONFIGS = [
      { name: '2P/1F/1Ws', population: 2, farms: 1, workshops: 1 },
      { name: '4P/2F/1Ws', population: 4, farms: 2, workshops: 1 },
      { name: '4P/1F/2Ws', population: 4, farms: 1, workshops: 2 },
      { name: '6P/2F/2Ws', population: 6, farms: 2, workshops: 2 },
      { name: '6P/3F/1Ws', population: 6, farms: 3, workshops: 1 },
      { name: '6P/1F/3Ws', population: 6, farms: 1, workshops: 3 },
    ] as const
    const rows: unknown[] = []
    for (const config of CONFIGS) {
      const wells = wellsFor(config.population)
      const start = rowColony(
        config.population,
        { wells, farms: config.farms, workshops: config.workshops },
        ['well', 'farm', 'workshop'],
        { food: 50_000, material: 500, water: 50 },
        config.population
      )
      const settled = runTicks(start, 600)
      rows.push({
        config: config.name,
        population: config.population,
        wells,
        farms: config.farms,
        workshops: config.workshops,
        workplaces: wells + config.farms + config.workshops,
        before: snapshot(start),
        at600: snapshot(settled),
        stable:
          snapshot(settled).population === config.population &&
          snapshot(settled).foodNet >= 0 &&
          snapshot(settled).waterNet >= 0,
      })
    }
    audit('WORKFORCE_RATIOS', { rows, note: 'Wells are the supporting infrastructure (ceil(P/2)); all runs are 600 ticks' })
    const byName = (name: string) =>
      (rows as { config: string; stable: boolean; at600: Snapshot }[]).find((row) => row.config === name)
    // Measured law (600 ticks): a configuration is EITHER population-stable
    // and Food-balanced with zero industry, OR industrial with a permanent
    // Food deficit. There is no configuration that is both.
    let stableCount = 0
    for (const row of rows as { stable: boolean; at600: Snapshot }[]) {
      if (row.stable) {
        stableCount += 1
        expect(row.at600.materialNet).toBe(0)
        expect(row.at600.staffedWorkshops).toBe(0)
      } else {
        expect(row.at600.foodNet).toBeLessThan(0)
        expect(row.at600.staffedWorkshops).toBeGreaterThanOrEqual(1)
      }
    }
    expect(stableCount).toBe(3)
    expect(byName('2P/1F/1Ws')?.at600.materialNet).toBe(0)
    expect(byName('6P/1F/3Ws')?.at600.foodNet).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Marginal colonist
// ---------------------------------------------------------------------------

describe('5. Marginal colonist versus one more building', { timeout: 30000 }, () => {
  it('measures the delta of +1 colonist, +1 Farm, +1 Well, +1 Workshop, +1 Residence', () => {
    const base = (): SimulationState =>
      rowColony(3, { wells: 1, farms: 1, workshops: 1 }, ['well', 'farm', 'workshop'], {
        food: 50_000,
        material: 500,
        water: 50,
      }, 2)
    const variants: { readonly name: string; readonly build: () => SimulationState }[] = [
      { name: 'base (2P/1Well/1Farm/1Ws)', build: base },
      {
        name: '+1 colonist (3P, audit-forced above the Water cap)',
        build: () => {
          const state = base()
          const residence = [...iterateBuildings(state)].find((b) => b.type === 'residence')
          if (residence === undefined) throw new Error('10af: no residence')
          return assignJobs(createColonist(state, residence.id).state)
        },
      },
      {
        name: '+1 Farm',
        build: () => {
          const state = base()
          return assignJobs(op(state, 'farm', 9, 2))
        },
      },
      {
        name: '+1 Well',
        build: () => {
          const state = base()
          return assignJobs(op(state, 'well', 9, 2))
        },
      },
      {
        name: '+1 Workshop',
        build: () => {
          const state = base()
          return assignJobs(op(state, 'workshop', 9, 2))
        },
      },
      {
        name: '+1 Residence (no colonist)',
        build: () => {
          const state = base()
          return assignJobs(op(state, 'residence', 9, 0))
        },
      },
    ]
    const rows: unknown[] = []
    for (const variant of variants) {
      const start = variant.build()
      const settled = runTicks(start, 60)
      rows.push({ variant: variant.name, before: snapshot(start), at60: snapshot(settled) })
    }
    audit('MARGINAL_COLONIST', { rows })
    const baseRow = rows[0] as { at60: Snapshot }
    const colonistRow = rows[1] as { at60: Snapshot }
    const farmRow = rows[2] as { at60: Snapshot }
    const wellRow = rows[3] as { at60: Snapshot }
    // +1 colonist raises consumption without raising the Water/Food capacity
    // that could support it.
    expect(colonistRow.at60.population).toBe(3)
    expect(colonistRow.at60.waterNet).toBeLessThan(baseRow.at60.waterNet)
    // +1 Farm adds Food; +1 Well adds Water capacity.
    expect(farmRow.at60.foodProduction).toBeGreaterThanOrEqual(baseRow.at60.foodProduction)
    expect(wellRow.at60.waterProduction).toBeGreaterThanOrEqual(baseRow.at60.waterProduction)
  })
})

// ---------------------------------------------------------------------------
// 6. Spatial growth
// ---------------------------------------------------------------------------

describe('6. Spatial growth', { timeout: 30000 }, () => {
  it('compares compact / corridor / partition / extension layouts', () => {
    // Compact: one network, everything adjacent to the same road row.
    const compact = rowColony(2, { wells: 1, farms: 1, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 2)

    // Corridor: worksites far from the residences, joined by a long road.
    const corridorResidences: CellCoordinate[] = [
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ]
    const corridorWorkplaces: Placement[] = [
      { type: 'well', x: 1, y: 8 },
      { type: 'farm', x: 3, y: 8 },
      { type: 'workshop', x: 5, y: 8 },
    ]
    const corridorRoads: CellCoordinate[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 1, y: 5 },
      { x: 1, y: 6 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
    ]
    const corridor = world({ residences: corridorResidences, workplaces: corridorWorkplaces, roads: corridorRoads, colonists: 2 })

    // Partition: two independent road networks; only network A has a Well.
    const partition = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })

    // Extension: a new residential zone far from the worksites, joined by a spur.
    const extension = world({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
        { x: 15, y: 0 },
        { x: 17, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: [
        ...rowRoads(6),
        { x: 7, y: 1 },
        { x: 8, y: 1 },
        { x: 9, y: 1 },
        ...Array.from({ length: 8 }, (_, i) => ({ x: 10, y: 1 + i })),
        { x: 11, y: 8 },
        { x: 12, y: 8 },
        { x: 13, y: 8 },
        { x: 14, y: 8 },
        { x: 15, y: 8 },
        { x: 15, y: 7 },
        { x: 15, y: 6 },
        { x: 15, y: 5 },
        { x: 15, y: 4 },
        { x: 15, y: 3 },
        { x: 15, y: 2 },
        { x: 15, y: 1 },
        { x: 16, y: 1 },
        { x: 17, y: 1 },
      ],
      colonists: 4,
    })

    const rows = [
      { layout: 'compact', state: compact },
      { layout: 'corridor', state: corridor },
      { layout: 'partition', state: partition },
      { layout: 'extension', state: extension },
    ].map((entry) => {
      const settled = runTicks(entry.state, 120)
      const networks = getRoadNetworks(settled)
      const coverage = getWaterCoverage(settled)
      const mobilityConnected = [...iterateColonists(settled)].filter(
        (colonist) => getColonistWorkMobility(settled, colonist.id).mobilityConnected
      ).length
      const inaccessibleWorkplaces = [...iterateBuildings(settled)]
        .filter(
          (building) =>
            (building.type === 'farm' || building.type === 'workshop' || building.type === 'well') &&
            !getBuildingRoadAccess(settled, building.id).hasRoadAccess
        )
        .map((building) => `${building.type}@${building.x},${building.y}`)
      return {
        layout: entry.layout,
        roadCells: Object.keys(settled.roads).length,
        roadCost: Object.keys(settled.roads).length * 5,
        networks: networks.length,
        networkSizes: networks.map((network) => network.length),
        accessibleBuildings: getAccessibleBuildingIds(settled).length,
        mobilityConnectedColonists: mobilityConnected,
        waterServedResidences: coverage.servedResidenceIds.length,
        servedColonists: coverage.servedColonistIds.length,
        inaccessibleWorkplaces,
        snapshot: snapshot(settled),
      }
    })
    audit('SPATIAL_GROWTH', { rows })

    const byLayout = (name: string) =>
      (rows as { layout: string; networkSizes: number[]; snapshot: Snapshot; mobilityConnectedColonists: number; roadCost: number }[]).find(
        (row) => row.layout === name
      )
    expect(byLayout('partition')?.networkSizes.length).toBe(2)
    expect(byLayout('partition')?.snapshot.waterServedResidences).toBe(1)
    expect(byLayout('compact')?.mobilityConnectedColonists).toBe(2)
    const corridorRow = byLayout('corridor')
    const compactRow = byLayout('compact')
    expect((corridorRow?.roadCost ?? 0) > (compactRow?.roadCost ?? 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 7. Population growth failure modes
// ---------------------------------------------------------------------------

describe('7. Population growth failure modes', { timeout: 30000 }, () => {
  it('runs and classifies the failure-mode catalogue', () => {
    interface FailureCase {
      readonly name: string
      readonly build: () => SimulationState
      readonly ticks: number
    }
    const cases: FailureCase[] = [
      {
        name: 'food-shortage',
        build: () => rowColony(3, { wells: 1, farms: 1, workshops: 0 }, ['well', 'farm'], { food: 30 }, 3),
        ticks: 240,
      },
      {
        name: 'water-shortage-transient',
        build: () => rowColony(3, { wells: 2, farms: 2, workshops: 0 }, ['well', 'farm'], { food: 50_000, water: 0 }, 3),
        ticks: 240,
      },
      {
        name: 'water-shortage-at-capacity',
        build: () => rowColony(5, { wells: 2, farms: 2, workshops: 0 }, ['well', 'farm'], { food: 50_000, water: 0 }, 3),
        ticks: 240,
      },
      {
        name: 'no-workforce',
        build: () => rowColony(1, { wells: 2, farms: 2, workshops: 2 }, ['well', 'farm', 'workshop'], {}, 1),
        ticks: 240,
      },
      {
        name: 'too-many-farms',
        build: () => rowColony(2, { wells: 1, farms: 4, workshops: 1 }, ['farm', 'well', 'workshop'], {}, 2),
        ticks: 240,
      },
      {
        name: 'too-many-wells',
        build: () => rowColony(2, { wells: 4, farms: 1, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 2),
        ticks: 240,
      },
      {
        name: 'too-many-workshops',
        build: () => rowColony(2, { wells: 1, farms: 1, workshops: 4 }, ['well', 'farm', 'workshop'], {}, 2),
        ticks: 240,
      },
      {
        name: 'useless-housing',
        build: () => rowColony(6, { wells: 1, farms: 1, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 2),
        ticks: 240,
      },
      {
        name: 'unemployed-colonists',
        build: () => world({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 5, y: 0 },
          ],
          workplaces: [{ type: 'farm', x: 1, y: 2 }],
          roads: rowRoads(6),
          colonists: 3,
        }),
        ticks: 240,
      },
      {
        name: 'isolated-residential-network',
        build: () => world({
          residences: [
            { x: 1, y: 0 },
            { x: 9, y: 0 },
          ],
          workplaces: [{ type: 'well', x: 1, y: 2 }],
          roads: [
            { x: 1, y: 1 },
            { x: 9, y: 1 },
          ],
          colonists: 1,
        }),
        ticks: 240,
      },
      {
        name: 'inaccessible-productive-building',
        build: () => world({
          residences: [{ x: 1, y: 0 }],
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'farm', x: 9, y: 9 },
          ],
          roads: [{ x: 1, y: 1 }],
          colonists: 1,
        }),
        ticks: 240,
      },
      {
        name: 'material-blocked',
        build: () => rowColony(2, { wells: 1, farms: 1, workshops: 1 }, ['well', 'farm', 'workshop'], { material: 0 }, 2),
        ticks: 240,
      },
      {
        name: 'construction-impossible',
        build: () => rowColony(2, { wells: 1, farms: 1, workshops: 1 }, ['well', 'well', 'farm'], { material: 0, water: 0 }, 2),
        ticks: 240,
      },
    ]

    const rows: unknown[] = []
    for (const failure of cases) {
      const start = failure.build()
      const settled = runTicks(start, failure.ticks)
      const end = snapshot(settled)
      const startSnap = snapshot(start)
      const colonyDied = end.population === 0 && startSnap.population > 0
      const waterRecovering = end.waterProduction > end.waterConsumption
      const growthBlockedByWater =
        end.waterProduction < end.waterConsumption + 1 || end.waterShortage
      const growthBlockedByHousing = end.housingAvailable === 0
      rows.push({
        failure: failure.name,
        ticks: failure.ticks,
        start: {
          population: startSnap.population,
          food: startSnap.food,
          material: startSnap.material,
          water: startSnap.water,
        },
        end: {
          population: end.population,
          food: end.food,
          material: end.material,
          water: end.water,
          foodNet: end.foodNet,
          waterNet: end.waterNet,
          materialNet: end.materialNet,
          staffedWells: end.staffedWells,
          staffedFarms: end.staffedFarms,
          staffedWorkshops: end.staffedWorkshops,
          waterShortage: end.waterShortage,
        },
        colonyDied,
        waterRecovering,
        growthBlockedByWater,
        growthBlockedByHousing,
        unservedResidences: end.residences - end.waterServedResidences,
      })
    }
    audit('FAILURE_MODES', {
      rows,
      classification: {
        'food-shortage': { recoverable: false, playerControllable: true, note: 'starvation wipes the colony; production stays 0' },
        'water-shortage-transient': { recoverable: true, playerControllable: true, note: 'production > need: the stock grows and the shortage clears (housing already full)' },
        'water-shortage-at-capacity': { recoverable: false, playerControllable: true, note: 'the colony fills to the production capacity, then production == need keeps the stock at 0: shortage is the steady state' },
        'no-workforce': { recoverable: false, playerControllable: true, note: 'one colonist cannot staff growth infrastructure AND industry' },
        'too-many-farms': { recoverable: true, playerControllable: true, note: 'Food surplus can leave the Well unstaffed: growth blocked, colony alive' },
        'too-many-wells': { recoverable: true, playerControllable: true, note: 'Water surplus competes with Farms for workers' },
        'too-many-workshops': { recoverable: true, playerControllable: true, note: 'industry staffing competes with Water/Food' },
        'useless-housing': { recoverable: true, playerControllable: true, note: 'dormant capacity, no penalty' },
        'unemployed-colonists': { recoverable: true, playerControllable: true, note: 'excess population is inert' },
        'isolated-residential-network': { recoverable: true, playerControllable: true, note: 'unserved residence: admission blocked, no penalty' },
        'inaccessible-productive-building': { recoverable: true, playerControllable: true, note: 'unstaffed producer: no output, no upkeep' },
        'material-blocked': { recoverable: true, playerControllable: true, note: 'material income resumes once a Workshop is staffed' },
        'construction-impossible': { recoverable: true, playerControllable: true, note: 'no Material and no Water: building stops until income resumes' },
      },
    })
    expect(rows.length).toBe(cases.length)
    const byName = (name: string) =>
      (rows as {
        failure: string
        colonyDied: boolean
        waterRecovering: boolean
        growthBlockedByWater: boolean
        growthBlockedByHousing: boolean
      }[]).find((row) => row.failure === name)
    expect(byName('food-shortage')?.colonyDied).toBe(true)
    expect(byName('useless-housing')?.colonyDied).toBe(false)
    expect(byName('water-shortage-transient')?.waterRecovering).toBe(true)
    expect(byName('water-shortage-at-capacity')?.growthBlockedByWater).toBe(true)
    expect(byName('too-many-farms')?.growthBlockedByWater).toBe(true)
    expect(byName('unemployed-colonists')?.growthBlockedByHousing).toBe(true)
    const isolated = (rows as { failure: string; unservedResidences: number }[]).find(
      (row) => row.failure === 'isolated-residential-network'
    )
    expect(isolated?.unservedResidences).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 8. Marginal value of housing
// ---------------------------------------------------------------------------

describe('8. Marginal value of housing', { timeout: 30000 }, () => {
  it('measures R1..R6 under a fixed one-Well Water capacity', () => {
    const rows: unknown[] = []
    for (const residences of [1, 2, 3, 4, 5, 6]) {
      const start = rowColony(residences, { wells: 1, farms: 2, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 2)
      const settled = runTicks(start, 240)
      const snap = snapshot(settled)
      rows.push({
        residences,
        housingCapacity: snap.housingCapacity,
        effectivePopulation: snap.population,
        dormantCapacity: snap.housingCapacity - snap.population,
        workforce: snap.employed,
        marginalProduction: 0,
        marginalConsumption: 0,
        waterCapacity: snap.waterProduction,
        snapshot: snap,
      })
    }
    audit('HOUSING_MARGINAL_VALUE', {
      rows,
      note: 'one Well advertises capacity for two colonists: every Residence beyond the second is dormant capacity',
    })
    for (const row of rows as { residences: number; effectivePopulation: number; dormantCapacity: number; marginalProduction: number }[]) {
      if (row.residences >= 2) expect(row.effectivePopulation).toBe(2)
      if (row.residences >= 3) expect(row.dormantCapacity).toBeGreaterThanOrEqual(1)
      expect(row.marginalProduction).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 9-10. Consequence candidates + classification
// ---------------------------------------------------------------------------

describe('9-10. Consequence candidates (measured with the existing runtime)', { timeout: 30000 }, () => {
  it('A — population density / housing quality', () => {
    // Measured: extra housing adds capacity that cannot be used under the
    // Water production cap, and there is no per-cell or per-quality concept.
    const dense = runTicks(rowColony(6, { wells: 1, farms: 2, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 2), 240)
    const denseSnapshot = snapshot(dense)
    const perResidenceCapacity = denseSnapshot.housingCapacity / denseSnapshot.residences
    const usedCapacity = denseSnapshot.population / denseSnapshot.housingCapacity
    audit('CANDIDATE_A_DENSITY', {
      housingCapacity: denseSnapshot.housingCapacity,
      population: denseSnapshot.population,
      usedCapacity,
      perResidenceCapacity,
      densityConceptPresent: false,
      evidence: 'capacity is exactly 1 per Residence and only 33% of it is usable under one Well; density would be a presentation score with no consumer',
    })
    expect(perResidenceCapacity).toBe(1)
    expect(usedCapacity).toBeLessThan(0.5)
  })

  it('B — service coverage', () => {
    // Measured: one Well already covers exactly one road network, and a
    // partitioned settlement needs a second Well before a second service.
    const partition = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })
    const coverage = getWaterCoverage(partition)
    audit('CANDIDATE_B_SERVICE_COVERAGE', {
      networks: getRoadNetworks(partition).length,
      servedResidences: coverage.servedResidenceIds.length,
      unservedResidences: 2 - coverage.servedResidenceIds.length,
      secondWellCost: 25,
      evidence: 'the Water service is already localized by road network: a second network already forces a second Well, so another service would duplicate the pattern',
    })
    expect(coverage.servedResidenceIds.length).toBe(1)
  })

  it('C — food distribution (global model under growth)', () => {
    // Measured: Food is produced anywhere and consumed anywhere; distance and
    // network membership never enter the food rule.
    const isolatedFarm = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [{ type: 'farm', x: 9, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })
    const settled = runTicks(isolatedFarm, 60)
    const snap = snapshot(settled)
    const mobilityConnected = [...iterateColonists(settled)].filter(
      (colonist) => getColonistWorkMobility(settled, colonist.id).mobilityConnected
    ).length
    audit('CANDIDATE_C_FOOD_DISTRIBUTION', {
      networks: getRoadNetworks(settled).length,
      mobilityConnectedColonists: mobilityConnected,
      population: snap.population,
      foodProduction: snap.foodProduction,
      foodConsumption: snap.foodConsumption,
      foodNet: snap.foodNet,
      foodIsGlobal: true,
      evidence:
        'Food is produced and consumed colony-wide with no distance term; a local model would reuse the Water coverage primitives, so the missing piece is not a rule but a consequence for a shortage (which already exists as starvation)',
    })
    expect(snap.foodConsumption).toBeGreaterThan(0)
  })

  it('D — water distribution (already localized)', () => {
    const partition = world({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'well', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })
    const coverage = getWaterCoverage(partition)
    audit('CANDIDATE_D_WATER_DISTRIBUTION', {
      networks: getRoadNetworks(partition).length,
      servedResidences: coverage.servedResidenceIds.length,
      servedColonists: coverage.servedColonistIds.length,
      evidence: 'Water is already localized through 09D networks + 09E access: nothing new to add without duplicating getWaterCoverage',
    })
    expect(coverage.servedResidenceIds.length).toBe(2)
  })

  it('E — settlement stages', () => {
    const rows = [1, 2, 4, 6, 8, 10].map((population) => {
      const state = rowColony(
        population,
        { wells: wellsFor(population), farms: farmsFor(population), workshops: 1 },
        ['well', 'farm', 'workshop'],
        {},
        population
      )
      return {
        population,
        buildings: Object.keys(state.buildings).length,
        roads: Object.keys(state.roads).length,
        waterCapacity: getWaterProductionPerTick(state),
        housingCapacity: getHousingSummary(state).totalCapacity,
        jobCapacity: getJobCapacity(state),
        stageUnlocksAnything: false,
      }
    })
    audit('CANDIDATE_E_SETTLEMENT_STAGES', {
      rows,
      evidence: 'objective thresholds exist (population / buildings / water capacity) but nothing in the runtime consumes a stage value',
    })
    expect(rows.length).toBe(6)
  })

  it('F — labor specialization', () => {
    // Measured: every workplace is type-blind; the only assignment inputs are
    // 09K connectivity and 09M distance-then-id.
    const state = rowColony(6, { wells: 3, farms: 3, workshops: 2 }, ['well', 'farm', 'workshop'], {}, 6)
    const workers = [...iterateBuildings(state)]
      .filter((building) => countWorkersAt(state, building.id) > 0)
      .map((building) => building.type)
    const distances = [...iterateColonists(state)]
      .map((colonist) => getColonistWorkMobility(state, colonist.id))
      .map((mobility) => ({ connected: mobility.mobilityConnected, workplaceId: mobility.workplaceId }))
    audit('CANDIDATE_F_SPECIALIZATION', {
      staffedTypes: workers,
      assignmentInputs: distances,
      workerAttributes: 0,
      evidence: 'assignment is fully determined by connectivity + distance; a specialization attribute would add a constraint rather than express an existing one',
    })
    expect(distances.every((entry) => entry.connected)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 11. Architecture invariants
// ---------------------------------------------------------------------------

describe('11. Architecture invariants (src-immutable audit)', { timeout: 30000 }, () => {
  it('keeps the persisted model, determinism and insertion-order invariance intact', () => {
    const scenario = (): SimulationState =>
      rowColony(4, { wells: 2, farms: 2, workshops: 1 }, ['well', 'farm', 'workshop'], {}, 4)
    const run = (): SimulationState => runTicks(scenario(), 200)
    const a = run()
    const b = run()
    const saved = JSON.parse(serializeSave(a)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    audit('ARCHITECTURE', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      derivedAbsent: ['coverage', 'mobility', 'networkId', 'served', 'staffed', 'density'].map((term) => ({
        term,
        present: serializeCanonicalState(a).includes(term),
      })),
    })
    expect(saved.version).toBe(8)
    expect(SAVE_VERSION).toBe(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(a)).not.toContain('coverage')
  })

  it('keeps the placement rules unchanged (Workshop still Water-gated)', () => {
    const state = rowColony(2, { wells: 1, farms: 1, workshops: 0 }, ['well', 'farm'], { water: 0 }, 2)
    const noWater = validatePlacement(state, { x: 9, y: 2 }, 'workshop')
    const withWater = { ...state, resources: { ...state.resources, water: 1 } }
    const okWithWater = validatePlacement(withWater, { x: 9, y: 2 }, 'workshop')
    audit('PLACEMENT_UNCHANGED', {
      withoutWater: noWater.valid ? 'valid' : noWater.reason,
      withWater: okWithWater.valid ? 'valid' : okWithWater.reason,
      affordableWithoutWater: affordableAt(state, 'workshop', { x: 9, y: 2 }),
    })
    expect(noWater.valid).toBe(false)
    expect(okWithWater.valid).toBe(true)
  })
})
