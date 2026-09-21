/**
 * Step 10AE — Water × Construction × Workforce Economic Pressure Audit.
 *
 * AUDIT ONLY. `src/` is untouched: every number below is measured from the
 * real runtime (`stepSimulation`, `applyCommand`, the derived queries), not
 * re-derived from the documentation. Fixtures are built with direct domain
 * operations (createBuilding / createRoads / createColonist + assignJobs),
 * the convention already used by the previous audit suites, so the audit
 * measures the economy rather than the placement order.
 *
 * Layout convention (one shared road row, so every building is on ONE network
 * and every workplace is mobility-connected to every residence):
 *
 *   y = 0 : residences      x = 1 + 2 * col
 *   y = 1 : road row        x = 0 .. 2 * maxCol + 2
 *   y = 2 : workplaces      x = 1 + 2 * col
 *
 * Road distance between a residence at col i and a workplace at col k is
 * `2 * |i - k|`, so assignment order is fully determined by the columns.
 *
 * Run:
 *   npx vitest run tests/waterConstructionWorkforcePressureAudit.test.ts --reporter=verbose
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
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getServedColonistCount,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterShortage,
  getWaterStatus,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  INITIAL_WATER,
  isWaterSupplySustainable,
  iterateBuildings,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateConstructionCrew,
  validatePlacement,
  validateReassignment,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10ae', width: 40, height: 12 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

const ROW_RESIDENCE = 0
const ROW_ROAD = 1
const ROW_WORKPLACE = 2

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const withStocks = (
  state: SimulationState,
  stocks: {
    readonly food?: number
    readonly material?: number
    readonly water?: number
  }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
  },
})

/** Operational building, placed directly (no cost, no tick). */
const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ae: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

/** Operational road, placed directly (no cost, no tick). */
const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10ae: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ae: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface WorkplaceSpec {
  readonly type: BuildingType
  readonly col: number
}

interface ColonySpec {
  readonly residenceCols: readonly number[]
  readonly workplaces?: readonly WorkplaceSpec[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
  readonly roads?: boolean
}

const build = (spec: ColonySpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 100_000,
    material: spec.material ?? 100,
    water: spec.water ?? 0,
  })
  for (const col of spec.residenceCols) {
    state = op(state, 'residence', col * 2 + 1, ROW_RESIDENCE)
  }
  const workplaces = spec.workplaces ?? []
  for (const workplace of workplaces) {
    state = op(state, workplace.type, workplace.col * 2 + 1, ROW_WORKPLACE)
  }
  if (spec.roads !== false) {
    const maxCol = Math.max(
      0,
      ...spec.residenceCols,
      ...workplaces.map((workplace) => workplace.col)
    )
    for (let x = 0; x <= maxCol * 2 + 2; x += 1) {
      state = opRoad(state, x, ROW_ROAD)
    }
  }
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence'
  )
  const wanted = spec.colonists ?? spec.residenceCols.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

/** Convenience: workplaces farms -> wells -> workshops in ascending columns. */
const spreadWorkplaces = (
  startCol: number,
  counts: { readonly farms: number; readonly wells: number; readonly workshops: number }
): WorkplaceSpec[] => {
  const list: WorkplaceSpec[] = []
  let col = startCol
  for (let i = 0; i < counts.farms; i += 1) list.push({ type: 'farm', col: col++ })
  for (let i = 0; i < counts.wells; i += 1) list.push({ type: 'well', col: col++ })
  for (let i = 0; i < counts.workshops; i += 1) list.push({ type: 'workshop', col: col++ })
  return list
}

const cellOf = (type: BuildingType, col: number): CellCoordinate => ({
  x: col * 2 + 1,
  y: type === 'residence' ? ROW_RESIDENCE : ROW_WORKPLACE,
})

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly housingAvailable: number
  readonly jobCapacity: number
  readonly employed: number
  readonly unemployed: number
  readonly foodProduction: number
  readonly foodConsumption: number
  readonly waterProduction: number
  readonly waterNeed: number
  readonly servedColonists: number
  readonly waterShortage: boolean
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly netMaterial: number
  readonly storageCapacity: number
  readonly storedProduction: number
  readonly operationalBuildings: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
}

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const housing = getHousingSummary(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    material: state.resources.construction,
    water: state.resources.water,
    housingAvailable: housing.availableCapacity,
    jobCapacity: getJobCapacity(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    foodProduction: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    waterProduction: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    servedColonists: getServedColonistCount(state),
    waterShortage: getWaterShortage(state),
    materialProduction: getMaterialProductionPerTick(state),
    materialUpkeep: getMaterialUpkeepPerTick(state),
    netMaterial: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    storedProduction: getMaterialStoredProductionPerTick(state),
    operationalBuildings: [...iterateBuildings(state)].filter(
      (building) => building.status === 'operational'
    ).length,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

/** Snapshots at absolute tick horizons (state starts at tick 0). */
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

const HORIZONS = [10, 30, 60, 120, 240, 600] as const

/** Real placement through the simulation; returns the new building id. */
const placeReal = (
  state: SimulationState,
  type: BuildingType,
  cell: CellCoordinate
): { readonly state: SimulationState; readonly buildingId: string | null } => {
  const before = new Set(Object.keys(state.buildings))
  const after = stepSimulation(state, {
    type: 'placeBuilding',
    x: cell.x,
    y: cell.y,
    buildingType: type,
  })
  const buildingId =
    Object.keys(after.buildings).find((id) => !before.has(id)) ?? null
  return { state: after, buildingId }
}

const affordableAt = (
  state: SimulationState,
  type: BuildingType,
  cell: CellCoordinate
): boolean => getPlacementAffordability(state, cell, type).affordable

// ---------------------------------------------------------------------------
// 1. Reference state — measured, not re-read from the docs
// ---------------------------------------------------------------------------

describe('1. Reference state (measured from the runtime)', () => {
  it('pins the starting stocks, costs and catalog construction properties', () => {
    const fresh = createState()
    const catalog = (
      ['residence', 'farm', 'workshop', 'well'] as const
    ).map((type) => {
      const definition = getBuildingDefinition(type)
      return {
        type,
        constructionCost: definition.constructionCost,
        constructionWaterCost: definition.constructionWaterCost,
        constructionTicks: definition.constructionTicks,
        housingCapacity: definition.housingCapacity,
      }
    })
    audit('REFERENCE_STATE', {
      tick: fresh.time.tick,
      food: fresh.resources.food,
      material: fresh.resources.construction,
      water: fresh.resources.water,
      buildings: Object.keys(fresh.buildings).length,
      colonists: Object.keys(fresh.colonists).length,
      roads: Object.keys(fresh.roads).length,
      saveVersion: SAVE_VERSION,
      catalog,
    })

    expect(fresh.resources.construction).toBe(INITIAL_CONSTRUCTION_MATERIAL)
    expect(fresh.resources.food).toBe(INITIAL_FOOD)
    expect(fresh.resources.water).toBe(INITIAL_WATER)
    expect(SAVE_VERSION).toBe(7)
    expect(getBuildingDefinition('workshop')).toMatchObject({
      constructionCost: 25,
      constructionWaterCost: 1,
      constructionTicks: 2,
      housingCapacity: 0,
    })
    expect(getBuildingDefinition('well')).toMatchObject({
      constructionCost: 25,
      constructionWaterCost: 0,
    })
    expect(getBuildingDefinition('residence')).toMatchObject({
      constructionCost: 25,
      housingCapacity: 1,
    })
  })

  it('pins the derived production/consumption constants', () => {
    const colony = build({
      residenceCols: [0, 1],
      workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
      colonists: 2,
      food: 1000,
      material: 100,
      water: 5,
    })
    audit('REFERENCE_CONSTANTS', {
      waterPerWellPerTick: WATER_PER_WELL_PER_TICK,
      waterPerColonistPerTick: WATER_PER_COLONIST_PER_TICK,
      foodPerFarmPerTick: FOOD_PER_FARM_PER_TICK,
      foodPerColonistPerTick: FOOD_PER_COLONIST_PER_TICK,
      materialPerWorkerPerTick: MATERIAL_PER_WORKER_PER_TICK,
      materialUpkeepPerStaffedWorkshopPerTick:
        MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      materialStoragePerOperationalWorkshop:
        MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      measured: snapshot(colony),
    })
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
    expect(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(25)
    // The measured colony matches the constants (2 colonists, 1 well, 1 farm).
    const measured = snapshot(colony)
    expect(measured.waterProduction).toBe(2)
    expect(measured.waterNeed).toBe(2)
    expect(measured.foodProduction).toBe(2)
    expect(measured.foodConsumption).toBe(2)
    expect(measured.storageCapacity).toBe(25)
  })

  it('separates persisted state from derived state in the canonical save', () => {
    const colony = runTicks(
      build({
        residenceCols: [0, 1],
        workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
        colonists: 2,
        food: 1000,
        material: 100,
        water: 5,
      }),
      20
    )
    const serialized = serializeCanonicalState(colony)
    const saved = JSON.parse(serializeSave(colony)) as {
      version: number
      state: Record<string, unknown>
    }
    audit('PERSISTED_STATE', {
      saveVersion: saved.version,
      topLevelKeys: Object.keys(saved.state).sort(),
      derivedTermsAbsent: [
        'coverage',
        'served',
        'mobility',
        'networkId',
        'staffed',
        'capacity',
      ].map((term) => ({ term, present: serialized.includes(term) })),
      serializedLength: serialized.length,
    })
    expect(saved.version).toBe(7)
    expect(Object.keys(saved.state).sort()).toEqual([
      'buildings',
      'colonists',
      'config',
      'counters',
      'resources',
      'roads',
      'time',
    ])
    // Only `resources.water` is canonical; every Water/service derivation is
    // absent from the persisted payload.
    expect(serialized).not.toContain('"coverage"')
    expect(serialized).not.toContain('servedColonist')
    expect(serialized).not.toContain('mobility')
  })

  it('measures the live admission rule with and without an operational Well', () => {
    // No Well: the historical Food + housing rule admits.
    const noWell = runTicks(
      build({
        residenceCols: [0, 1, 2],
        workplaces: [],
        colonists: 0,
        food: 100,
        material: 0,
        water: 0,
      }),
      10
    )
    // One Well + two served colonists: the Water gate caps admission at the
    // Water production capacity (2 / well), so the third Residence stays empty.
    const withWell = runTicks(
      build({
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 0, wells: 1, workshops: 0 }),
        colonists: 2,
        food: 100,
        material: 0,
        water: 10,
      }),
      10
    )
    audit('ADMISSION_RULE', {
      withoutWell: snapshot(noWell),
      withWell: snapshot(withWell),
    })
    expect(snapshot(noWell).population).toBe(3)
    expect(snapshot(withWell).population).toBe(2)
    expect(getWaterProductionPerTick(withWell)).toBe(2)
    expect(getHousingSummary(withWell).availableCapacity).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Water industrial opportunity cost
// ---------------------------------------------------------------------------

describe('2. Water industrial opportunity cost', () => {
  it('A — measures the Water balance per (wells, population)', () => {
    const rows: unknown[] = []
    for (const wells of [0, 1, 2]) {
      for (const population of [0, 1, 2, 3, 4]) {
        const state = build({
          residenceCols: [0, 1, 2, 3, 4],
          workplaces: spreadWorkplaces(5, { farms: 0, wells, workshops: 0 }),
          colonists: population,
          food: 100_000,
          material: 0,
          water: 20,
        })
        const production = getWaterProductionPerTick(state)
        const need = getWaterNeedPerTick(state)
        const net = production - need
        rows.push({
          wells,
          population,
          served: getServedColonistCount(state),
          production,
          need,
          net,
          ticksFor1Water: net > 0 ? Math.ceil(1 / net) : null,
          ticksFor4Water: net > 0 ? Math.ceil(4 / net) : null,
          sustainable: isWaterSupplySustainable(state),
        })
      }
    }
    audit('WATER_BALANCE', { rows })
    // Measured laws: production is 2 per STAFFED Well (so it is bounded by
    // both the Well count and the available workforce), need is the served
    // population, and net is their difference.
    for (const row of rows as {
      wells: number
      population: number
      served: number
      production: number
      need: number
      net: number
    }[]) {
      expect(row.served).toBe(row.wells > 0 ? row.population : 0)
      expect(row.need).toBe(row.served)
      expect(row.production).toBe(2 * Math.min(row.wells, row.population))
      expect(row.net).toBe(row.production - row.need)
    }
    const oneWellTwoColonists = (rows as { wells: number; population: number; net: number }[]).find(
      (row) => row.wells === 1 && row.population === 2
    )
    expect(oneWellTwoColonists?.net).toBe(0)
  })

  it('B — measures the cumulative Water cost of N Workshops', () => {
    const rows: unknown[] = []
    for (const workshops of [1, 2, 3, 4]) {
      let state = build({
        residenceCols: [0, 1],
        workplaces: spreadWorkplaces(2, { farms: 0, wells: 1, workshops }),
        colonists: 2,
        food: 100_000,
        material: 1000,
        water: 10,
      })
      const waterBefore = state.resources.water
      const materialBefore = state.resources.construction
      // Pay for one extra Workshop at the first free column and measure the
      // one-off charge, then let the colony settle for 30 ticks.
      const extraCol = 2 + 1 + workshops // well at col 2, configured workshops follow
      if (affordableAt(state, 'workshop', cellOf('workshop', extraCol))) {
        state = placeReal(state, 'workshop', cellOf('workshop', extraCol)).state
      }
      const afterPlacement = snapshot(state)
      state = runTicks(state, 30)
      const settled = snapshot(state)
      rows.push({
        workshopsConfigured: workshops,
        waterBefore,
        materialBefore,
        oneOffWaterCharged: waterBefore - afterPlacement.water,
        oneOffMaterialCharged: materialBefore - afterPlacement.material,
        positionWater: afterPlacement.water,
        settledWater: settled.water,
        settledMaterial: settled.material,
        settledStorage: settled.storageCapacity,
        population: settled.population,
        waterProduction: settled.waterProduction,
        waterNeed: settled.waterNeed,
      })
    }
    audit('WORKSHOP_WATER_COST', {
      rows,
      note: 'construction Water is a one-off charge; daily consumption is the served population, unchanged by the Workshop',
    })
    for (const row of rows as { oneOffWaterCharged: number }[]) {
      expect(row.oneOffWaterCharged).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Workforce × Water × Material
// ---------------------------------------------------------------------------

describe('3. Workforce x Water x Material configurations', () => {
  const CONFIGS = [
    { name: '1F+1W+1Ws', farms: 1, wells: 1, workshops: 1 },
    { name: '1F+1W+2Ws', farms: 1, wells: 1, workshops: 2 },
    { name: '2F+1W+1Ws', farms: 2, wells: 1, workshops: 1 },
    { name: '2F+1W+2Ws', farms: 2, wells: 1, workshops: 2 },
  ] as const

  it('measures each configuration at the runtime-admissible population and fully staffed', () => {
    const rows: unknown[] = []
    for (const config of CONFIGS) {
      const workplaces = spreadWorkplaces(6, config)
      const admissible = 2 // one Well -> Water production capacity 2
      const fullyStaffed = workplaces.length
      for (const [mode, population] of [
        ['admissible', admissible],
        ['fully-staffed', fullyStaffed],
      ] as const) {
        const start = build({
          residenceCols: [0, 1, 2, 3, 4, 5],
          workplaces,
          colonists: population,
          food: 100_000,
          material: 100,
          water: 20,
        })
        const horizons = atHorizons(start, HORIZONS)
        rows.push({
          config: config.name,
          mode,
          population,
          workplaces: fullyStaffed,
          horizons: horizons.map((row) => ({
            h: row.horizon,
            pop: row.snapshot.population,
            employed: row.snapshot.employed,
            foodProd: row.snapshot.foodProduction,
            foodNeed: row.snapshot.foodConsumption,
            waterProd: row.snapshot.waterProduction,
            waterNeed: row.snapshot.waterNeed,
            materialGross: row.snapshot.materialProduction,
            materialUpkeep: row.snapshot.materialUpkeep,
            materialNet: row.snapshot.netMaterial,
            storage: row.snapshot.storageCapacity,
            material: row.snapshot.material,
            water: row.snapshot.water,
            food: row.snapshot.food,
          })),
        })
      }
    }
    audit('WORKFORCE_WATER_MATERIAL', { horizons: HORIZONS, rows })

    // Measured invariant: material gross output is 2 per staffed Workshop and
    // the storage capacity is 25 per operational Workshop, at every horizon.
    for (const row of rows as {
      horizons: { materialGross: number; storage: number; materialUpkeep: number }[]
    }[]) {
      for (const horizon of row.horizons) {
        expect(horizon.materialGross % MATERIAL_PER_WORKER_PER_TICK).toBe(0)
        expect(horizon.storage % MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP).toBe(0)
        expect(horizon.materialUpkeep).toBe(horizon.materialGross / 2)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Industrial expansion test W0 -> W4
// ---------------------------------------------------------------------------

describe('4. Industrial expansion W0 -> W4', () => {
  it('halts at W0 when the colony already runs at the Water production cap', () => {
    let state = build({
      residenceCols: [0, 1],
      workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 0 }),
      colonists: 2,
      food: 100_000,
      material: 100,
      water: 0,
    })
    const before = snapshot(state)
    const firstFreeCol = 2 + 2 // residence columns 0/1, workplaces at 2 (farm) and 3 (well)
    const transitions: unknown[] = []
    for (let n = 1; n <= 4; n += 1) {
      const targetCol = firstFreeCol + n - 1
      let waited = 0
      while (waited < 600 && !affordableAt(state, 'workshop', cellOf('workshop', targetCol))) {
        state = stepSimulation(state)
        waited += 1
      }
      const canPlace = affordableAt(state, 'workshop', cellOf('workshop', targetCol))
      if (!canPlace) {
        transitions.push({ target: `W${n}`, waited, placed: false, water: state.resources.water, material: state.resources.construction })
        break
      }
      state = placeReal(state, 'workshop', cellOf('workshop', targetCol)).state
      transitions.push({ target: `W${n}`, waited, placed: true, water: state.resources.water, material: state.resources.construction })
    }
    audit('EXPANSION_AT_WATER_CAP', {
      before,
      transitions,
      note: 'population at the Water production cap => net Water 0 => no Workshop is ever affordable',
    })
    expect(before.waterNeed).toBe(2)
    expect(before.waterProduction).toBe(2)
    expect((transitions[0] as { placed: boolean }).placed).toBe(false)
    expect(state.resources.water).toBe(0)
  })

  it('places W1..W4 from a seeded buffer and measures every transition', () => {
    interface ExpansionRow {
      readonly target: string
      readonly placed: boolean
      readonly waited: number
      readonly waterBefore: number
      readonly materialBefore: number
      readonly staffedWorkshopsBefore: number
      readonly staffedFarmsBefore: number
      readonly waterAfter: number
      readonly materialAfter: number
      readonly settledWater: number
      readonly settledMaterial: number
      readonly settledStaffedWorkshops: number
      readonly settledStaffedFarms: number
      readonly settledNetMaterial: number
      readonly settledWaterNet: number
    }

    const runScenario = (population: number): ExpansionRow[] => {
      let state = build({
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 0 }),
        colonists: population,
        food: 100_000,
        material: 100,
        water: 5,
      })
      const transitions: ExpansionRow[] = []
      const firstFreeCol = 2 + 2 // farm col 2, well col 3
      for (let n = 1; n <= 4; n += 1) {
        const targetCol = firstFreeCol + n - 1
        const before = snapshot(state)
        let waited = 0
        while (waited < 600 && !affordableAt(state, 'workshop', cellOf('workshop', targetCol))) {
          state = stepSimulation(state)
          waited += 1
        }
        if (!affordableAt(state, 'workshop', cellOf('workshop', targetCol))) {
          transitions.push({
            target: `W${n}`,
            placed: false,
            waited,
            waterBefore: before.water,
            materialBefore: before.material,
            staffedWorkshopsBefore: before.staffedWorkshops,
            staffedFarmsBefore: before.staffedFarms,
            waterAfter: state.resources.water,
            materialAfter: state.resources.construction,
            settledWater: state.resources.water,
            settledMaterial: state.resources.construction,
            settledStaffedWorkshops: countStaffedOperationalWorkshops(state),
            settledStaffedFarms: countStaffedOperationalFarms(state),
            settledNetMaterial: getNetMaterialPerTick(state),
            settledWaterNet:
              getWaterProductionPerTick(state) - getWaterNeedPerTick(state),
          })
          break
        }
        const placed = placeReal(state, 'workshop', cellOf('workshop', targetCol))
        state = placed.state
        const after = snapshot(state)
        const settled = runTicks(state, 30)
        state = settled
        transitions.push({
          target: `W${n}`,
          placed: true,
          waited,
          waterBefore: before.water,
          materialBefore: before.material,
          staffedWorkshopsBefore: before.staffedWorkshops,
          staffedFarmsBefore: before.staffedFarms,
          waterAfter: after.water,
          materialAfter: after.material,
          settledWater: settled.resources.water,
          settledMaterial: settled.resources.construction,
          settledStaffedWorkshops: countStaffedOperationalWorkshops(settled),
          settledStaffedFarms: countStaffedOperationalFarms(settled),
          settledNetMaterial: getNetMaterialPerTick(settled),
          settledWaterNet:
            getWaterProductionPerTick(settled) - getWaterNeedPerTick(settled),
        })
      }
      return transitions
    }

    const admissible = runScenario(2)
    const forced = runScenario(3)
    audit('EXPANSION_WITH_BUFFER', {
      admissiblePopulation: admissible,
      forcedPopulation: forced,
      note: 'seeded Water 5 + material 100 => four Workshops are placed with no waiting: the one-off cost is a capacity tax, not a timing signal. Whether a Workshop is then STAFFED depends on the workforce, not on Water. Population 3 is audit-forced (one Well advertises capacity 2).',
    })
    // Measured: at the runtime-admissible population (2) every Workplace is
    // already taken by the Farm and the Well, so no added Workshop is staffed
    // and the Material flow stays at 0; the seeded Water still pays for all
    // four Workshops.
    expect(admissible.filter((row) => row.placed)).toHaveLength(4)
    for (const row of admissible) expect(row.waited).toBe(0)
    const admissibleLast = admissible[admissible.length - 1]
    expect(admissibleLast?.settledStaffedWorkshops).toBe(0)
    expect(admissibleLast?.settledNetMaterial).toBe(0)
    // Measured: an audit-forced third colonist immediately pushes the colony
    // ABOVE the Water production cap (3 served vs 2 produced), so the stock
    // drains to 0 and the SECOND Workshop is never affordable. This is the
    // real industrial-expansion constraint: the Water balance, not the rank
    // of the Workshop.
    expect(forced.filter((row) => row.placed)).toHaveLength(1)
    expect(forced[0]?.settledWaterNet).toBe(-1)
    expect(forced[1]?.placed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Water buffer sensitivity
// ---------------------------------------------------------------------------

describe('5. Water buffer sensitivity', () => {
  it('rejects at Water 0, accepts from Water 1, and never lets the buffer replace production capacity', () => {
    const rows: unknown[] = []
    for (const water of [0, 1, 2, 5, 10]) {
      const start = build({
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 1, wells: 1, workshops: 0 }),
        colonists: 2,
        food: 10_000,
        material: 100,
        water,
      })
      const validation = validatePlacement(start, cellOf('workshop', 5), 'workshop')
      const affordability = getPlacementAffordability(
        start,
        cellOf('workshop', 5),
        'workshop'
      )
      const placed = placeReal(start, 'workshop', cellOf('workshop', 5))
      const afterPlacement = snapshot(placed.state)
      const horizon = atHorizons(placed.state, [1, 5, 30])
      rows.push({
        seededWater: water,
        validation: validation.valid ? 'valid' : validation.reason,
        affordable: affordability.affordable,
        accepted: placed.buildingId !== null,
        waterAfter: afterPlacement.water,
        materialAfter: afterPlacement.material,
        shortageAfter: afterPlacement.waterShortage,
        servedAfter: afterPlacement.servedColonists,
        populationAt5: horizon[1]?.snapshot.population,
        populationAt30: horizon[2]?.snapshot.population,
      })
    }
    audit('WATER_BUFFER_SENSITIVITY', {
      rows,
      note: 'the buffer only decides whether the one-off charge is payable; admission is gated by Water PRODUCTION capacity, not by the stock',
    })
    const zero = rows[0] as { validation: string; accepted: boolean; waterAfter: number }
    expect(zero.validation).toBe('insufficientWater')
    expect(zero.accepted).toBe(false)
    expect(zero.waterAfter).toBe(0)
    for (const row of rows.slice(1) as { accepted: boolean; waterAfter: number }[]) {
      expect(row.accepted).toBe(true)
    }
    // Storage does not unlock the third colonist: production capacity is 2.
    for (const row of rows as { populationAt30: number | undefined }[]) {
      expect(row.populationAt30).toBe(2)
    }
  })

  it('shows that a bigger buffer does not change the Water balance', () => {
    const rows: unknown[] = []
    for (const water of [1, 10, 100]) {
      let state = build({
        residenceCols: [0, 1],
        workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
        colonists: 2,
        food: 100_000,
        material: 0,
        water,
      })
      const start = snapshot(state)
      state = runTicks(state, 600)
      const end = snapshot(state)
      rows.push({
        seededWater: water,
        startWater: start.water,
        endWater: end.water,
        startMaterial: start.material,
        endMaterial: end.material,
        population: end.population,
        waterNet: end.waterProduction - end.waterNeed,
        materialNet: end.netMaterial,
      })
    }
    audit('WATER_BUFFER_NO_BALANCE_CHANGE', { rows })
    for (const row of rows as { startWater: number; endWater: number; waterNet: number }[]) {
      expect(row.endWater).toBe(row.startWater) // net 0: the buffer only shifts the level
      expect(row.waterNet).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Workforce opportunity cost
// ---------------------------------------------------------------------------

describe('6. Workforce opportunity cost', () => {
  it('measures one colonist on a Well / Farm / Workshop at 10/30/60 ticks', () => {
    const rows: unknown[] = []
    for (const type of ['well', 'farm', 'workshop'] as const) {
      for (const [mode, population] of [
        ['alone', 1],
        ['paired', 2],
      ] as const) {
        let state = build({
          residenceCols: [0, 1],
          workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
          colonists: population,
          food: 10_000,
          material: 0,
          water: 10,
        })
        // Pin the FIRST workplace of the requested type manually, so the
        // comparison isolates the job itself and not 09M distance ordering.
        const workplaces = [...iterateBuildings(state)].filter(
          (building) => building.type === type
        )
        const target = workplaces[0]
        const colonist = Object.keys(state.colonists)[0]
        if (target !== undefined && colonist !== undefined) {
          const reassignment = validateReassignment(state, colonist, target.id)
          if (reassignment.valid) {
            state = stepSimulation(state, {
              type: 'reassignColonist',
              colonistId: colonist,
              workplaceId: target.id,
            })
          }
        }
        const horizons = atHorizons(state, [10, 30, 60])
        rows.push({
          job: type,
          mode,
          population,
          assigned: [...iterateBuildings(state)]
            .filter((building) => countWorkersAt(state, building.id) > 0)
            .map((building) => building.type),
          horizons: horizons.map((row) => ({
            h: row.horizon,
            water: row.snapshot.water,
            waterProd: row.snapshot.waterProduction,
            foodProd: row.snapshot.foodProduction,
            food: row.snapshot.food,
            material: row.snapshot.material,
            materialNet: row.snapshot.netMaterial,
            population: row.snapshot.population,
            employed: row.snapshot.employed,
          })),
        })
      }
    }
    audit('WORKFORCE_FLOWS', {
      rows,
      note: 'one colonist can hold exactly one job: staffing the Well and producing Material are mutually exclusive at population 1',
    })
    const alone = rows.filter((row) => (row as { mode: string }).mode === 'alone') as {
      job: string
      horizons: { h: number; material: number; water: number }[]
    }[]
    const well = alone.find((row) => row.job === 'well')
    const workshop = alone.find((row) => row.job === 'workshop')
    expect(well?.horizons[2]?.material).toBe(0)
    expect(workshop?.horizons[2]?.water).toBeGreaterThanOrEqual(0)
  })

  it('measures the four manual reassignment transitions', () => {
    const base = (): SimulationState =>
      build({
        residenceCols: [0],
        workplaces: spreadWorkplaces(1, { farms: 1, wells: 1, workshops: 1 }),
        colonists: 1,
        food: 10_000,
        material: 0,
        water: 10,
      })
    const idOf = (state: SimulationState, type: BuildingType): string => {
      const building = [...iterateBuildings(state)].find((item) => item.type === type)
      if (building === undefined) throw new Error(`10ae: no ${type}`)
      return building.id
    }
    const colonistId = (state: SimulationState): string => {
      const id = Object.keys(state.colonists)[0]
      if (id === undefined) throw new Error('10ae: no colonist')
      return id
    }
    const transitions = [
      ['Farm -> Well', 'farm', 'well'],
      ['Well -> Workshop', 'well', 'workshop'],
      ['Workshop -> Farm', 'workshop', 'farm'],
      ['Workshop -> Well', 'workshop', 'well'],
      ['Farm -> Workshop', 'farm', 'workshop'],
      ['Well -> Farm', 'well', 'farm'],
    ] as const
    const rows: unknown[] = []
    for (const [label, from, to] of transitions) {
      let state = base()
      // Baseline: the colonist is put on `from` first (manual), then moved.
      state = stepSimulation(state, {
        type: 'reassignColonist',
        colonistId: colonistId(state),
        workplaceId: idOf(state, from),
      })
      const before = snapshot(state)
      const validation = validateReassignment(state, colonistId(state), idOf(state, to))
      state = stepSimulation(state, {
        type: 'reassignColonist',
        colonistId: colonistId(state),
        workplaceId: idOf(state, to),
      })
      const after = snapshot(state)
      const settled = runTicks(state, 30)
      rows.push({
        label,
        validation: validation.valid ? 'valid' : validation.reason,
        beforeWaterProd: before.waterProduction,
        beforeFoodProd: before.foodProduction,
        beforeMaterialProd: before.materialProduction,
        afterWaterProd: after.waterProduction,
        afterFoodProd: after.foodProduction,
        afterMaterialProd: after.materialProduction,
        settledWater: settled.resources.water,
        settledFood: settled.resources.food,
        settledMaterial: settled.resources.construction,
        settledStaffed: [...iterateBuildings(settled)]
          .filter((building) => countWorkersAt(settled, building.id) > 0)
          .map((building) => building.type),
      })
    }
    audit('REASSIGNMENT_TRANSITIONS', { rows })
    for (const row of rows as { validation: string }[]) {
      expect(row.validation).toBe('valid')
    }
    const farmToWell = (rows as { label: string; afterWaterProd: number; afterFoodProd: number }[]).find(
      (row) => row.label === 'Farm -> Well'
    )
    expect(farmToWell?.afterWaterProd).toBe(2)
    expect(farmToWell?.afterFoodProd).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Construction Crew interaction
// ---------------------------------------------------------------------------

describe('7. Construction crew interaction', () => {
  const crewFixture = (): SimulationState =>
    build({
      residenceCols: [0],
      workplaces: spreadWorkplaces(1, { farms: 1, wells: 1, workshops: 0 }),
      colonists: 1,
      food: 10_000,
      material: 500,
      water: 20,
    })

  it('saves exactly one construction tick for Residence / Farm / Well / Workshop', () => {
    const rows: unknown[] = []
    for (const type of ['residence', 'farm', 'well', 'workshop'] as const) {
      for (const crewing of [false, true]) {
        let state = crewFixture()
        const cell = { x: 15, y: ROW_WORKPLACE }
        const placed = placeReal(state, type, type === 'residence' ? { x: 15, y: ROW_RESIDENCE } : cell)
        state = placed.state
        const siteId = placed.buildingId
        if (siteId === null) throw new Error('10ae: placement rejected')
        const tickAtPlacement = state.time.tick
        if (crewing) {
          const colonistId = Object.keys(state.colonists)[0]
          if (colonistId !== undefined) {
            const validation = validateConstructionCrew(state, colonistId, siteId)
            if (validation.valid) {
              state = stepSimulation(state, {
                type: 'assignConstructionCrew',
                colonistId,
                buildingId: siteId,
              })
            }
          }
        }
        let guard = 0
        while (guard < 20 && state.buildings[siteId]?.status !== 'operational') {
          state = stepSimulation(state)
          guard += 1
        }
        rows.push({
          type,
          crewed: crewing,
          // Elapsed ticks from the placement tick. The crew-assignment tick
          // itself already applies the +1 (Step 10Y), so a crewed 2-tick site
          // completes in 1 elapsed tick.
          ticksToOperational: state.time.tick - tickAtPlacement,
          completionTick: state.time.tick,
          placementTick: tickAtPlacement,
        })
      }
    }
    audit('CREW_CONSTRUCTION_TICKS', { rows })
    for (const row of rows as { crewed: boolean; ticksToOperational: number }[]) {
      expect(row.ticksToOperational).toBe(row.crewed ? 1 : 2)
    }
  })

  it('links Water -> crew -> earlier completion and measures the production start', () => {
    const rows: unknown[] = []
    for (const crewing of [false, true]) {
      let state = build({
        residenceCols: [1],
        workplaces: spreadWorkplaces(2, { farms: 0, wells: 1, workshops: 0 }),
        colonists: 1,
        food: 10_000,
        material: 25,
        water: 20,
      })
      // The Workshop is at the Residence's own column (road distance 0), so
      // once it is operational the colonist takes it and Material production
      // starts; the Well is two road steps farther.
      const placed = placeReal(state, 'workshop', { x: 3, y: ROW_WORKPLACE })
      state = placed.state
      const placementTick = state.time.tick
      const siteId = placed.buildingId
      if (siteId === null) throw new Error('10ae: placement rejected')
      if (crewing) {
        const colonistId = Object.keys(state.colonists)[0]
        if (colonistId !== undefined) {
          state = stepSimulation(state, {
            type: 'assignConstructionCrew',
            colonistId,
            buildingId: siteId,
          })
        }
      }
      // Fixed absolute horizon for both runs, so the comparison is not
      // polluted by one branch executing an extra tick.
      const horizon = placementTick + 20
      // The crew-assignment tick itself can already complete the site, so the
      // initial state is inspected before stepping.
      let completionTick: number | null =
        state.buildings[siteId]?.status === 'operational' ? state.time.tick : null
      let firstProductionTick: number | null =
        getMaterialProductionPerTick(state) > 0 ? state.time.tick : null
      while (state.time.tick < horizon) {
        state = stepSimulation(state)
        if (completionTick === null && state.buildings[siteId]?.status === 'operational') {
          completionTick = state.time.tick
        }
        if (firstProductionTick === null && getMaterialProductionPerTick(state) > 0) {
          firstProductionTick = state.time.tick
        }
      }
      const settled = snapshot(state)
      rows.push({
        crewed: crewing,
        ticksToCompletion: (completionTick ?? state.time.tick) - placementTick,
        ticksToFirstProduction:
          (firstProductionTick ?? state.time.tick) - placementTick,
        materialAtHorizon: settled.material,
        waterAtHorizon: settled.water,
        staffedWorkshops: settled.staffedWorkshops,
        netMaterial: settled.netMaterial,
      })
    }
    audit('CREW_PRODUCTION_CHAIN', {
      rows,
      note: 'the crew finishes the building one tick earlier, but a crewed colonist is skipped by assignJobs on the completion tick, so output starts on the same tick when that colonist is the only worker',
    })
    const without = rows[0] as { ticksToCompletion: number; ticksToFirstProduction: number; materialAtHorizon: number }
    const withCrew = rows[1] as { ticksToCompletion: number; ticksToFirstProduction: number; materialAtHorizon: number }
    expect(without.ticksToCompletion).toBe(2)
    expect(withCrew.ticksToCompletion).toBe(1)
    expect(without.ticksToFirstProduction).toBe(2)
    expect(withCrew.ticksToFirstProduction).toBe(2)
    expect(withCrew.materialAtHorizon).toBe(without.materialAtHorizon)
  })
})

// ---------------------------------------------------------------------------
// 8. Long-run stability
// ---------------------------------------------------------------------------

describe('8. Long-run stability', () => {
  it('runs 900 ticks on six representative colonies and reports stability', () => {
    const scenarios = [
      {
        name: 'water-rich',
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 2, wells: 2, workshops: 1 }),
        colonists: 3,
        food: 50_000,
        material: 500,
        water: 50,
      },
      {
        name: 'water-constrained',
        residenceCols: [0, 1],
        workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
        colonists: 2,
        food: 50_000,
        material: 100,
        water: 0,
      },
      {
        name: 'material-rich',
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 2, wells: 2, workshops: 2 }),
        colonists: 3,
        food: 50_000,
        material: 10_000,
        water: 500,
      },
      {
        name: 'material-constrained',
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 2, wells: 2, workshops: 2 }),
        colonists: 3,
        food: 50_000,
        material: 0,
        water: 50,
      },
      {
        name: 'workforce-constrained',
        residenceCols: [0],
        workplaces: spreadWorkplaces(1, { farms: 2, wells: 2, workshops: 2 }),
        colonists: 1,
        food: 50_000,
        material: 500,
        water: 500,
      },
      {
        name: 'food-deficit',
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 1, wells: 1, workshops: 0 }),
        colonists: 3,
        food: 200,
        material: 100,
        water: 20,
      },
    ] as const

    const rows: unknown[] = []
    for (const scenario of scenarios) {
      const start = build(scenario)
      const startSnapshot = snapshot(start)
      let state = start
      const waterTrace: number[] = []
      const materialTrace: number[] = []
      const foodTrace: number[] = []
      for (let i = 0; i < 900; i += 1) {
        state = stepSimulation(state)
        if (i >= 800) {
          waterTrace.push(state.resources.water)
          materialTrace.push(state.resources.construction)
          foodTrace.push(state.resources.food)
        }
      }
      const endSnapshot = snapshot(state)
      const minMax = (values: number[]): { min: number; max: number; spread: number } => ({
        min: Math.min(...values),
        max: Math.max(...values),
        spread: Math.max(...values) - Math.min(...values),
      })
      rows.push({
        scenario: scenario.name,
        start: {
          population: startSnapshot.population,
          water: startSnapshot.water,
          material: startSnapshot.material,
          food: startSnapshot.food,
        },
        at600: null,
        at900: {
          population: endSnapshot.population,
          water: endSnapshot.water,
          material: endSnapshot.material,
          food: endSnapshot.food,
          waterProd: endSnapshot.waterProduction,
          waterNeed: endSnapshot.waterNeed,
          foodProd: endSnapshot.foodProduction,
          foodNeed: endSnapshot.foodConsumption,
          materialNet: endSnapshot.netMaterial,
          storage: endSnapshot.storageCapacity,
          employed: endSnapshot.employed,
          operationalBuildings: endSnapshot.operationalBuildings,
        },
        last100Ticks: {
          water: minMax(waterTrace),
          material: minMax(materialTrace),
          food: minMax(foodTrace),
        },
        foodStarved: endSnapshot.population === 0,
        foodUnbounded: endSnapshot.food > 40_000,
        waterUnbounded: endSnapshot.water > 400,
        materialCapped:
          endSnapshot.storageCapacity > 0 &&
          endSnapshot.material >= endSnapshot.storageCapacity - 1,
      })
    }
    audit('LONG_RUN', { ticks: 900, rows })

    // Measured invariants that hold for every scenario.
    for (const row of rows as {
      at900: { water: number; material: number; food: number; population: number }
    }[]) {
      expect(row.at900.water).toBeGreaterThanOrEqual(0)
      expect(row.at900.material).toBeGreaterThanOrEqual(0)
      expect(row.at900.food).toBeGreaterThanOrEqual(0)
      expect(row.at900.population).toBeGreaterThanOrEqual(0)
    }
    const byName = (name: string) =>
      (rows as { scenario: string; at900: { population: number; food: number } }[]).find(
        (row) => row.scenario === name
      )
    // Water-rich with 3 colonists and 2 wells: net Water +1 forever, so the
    // stock is unbounded (no cap exists today).
    const waterRich = byName('water-rich')
    expect(waterRich?.at900.population).toBeGreaterThan(0)
    // Food-deficit colony: starvation is permanent (population 0, food 0).
    const foodDeficit = byName('food-deficit')
    expect(foodDeficit?.at900.population).toBe(0)
    expect(foodDeficit?.at900.food).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 9-10. Candidate evaluation + classification
// ---------------------------------------------------------------------------

describe('9-10. Next-system candidates (measured with the existing runtime)', () => {
  it('A — Food storage: measures the unbounded surplus and the hard starvation event', () => {
    // Surplus: 2 staffed farms vs 1 colonist -> food grows without bound.
    const surplus = runTicks(
      build({
        residenceCols: [0],
        workplaces: spreadWorkplaces(1, { farms: 2, wells: 0, workshops: 0 }),
        colonists: 1,
        food: 100,
        material: 0,
        water: 0,
      }),
      300
    )
    // Deficit: starvation is all-or-nothing in a single tick. 3 colonists
    // against 1 staffed Farm is a measured -1 Food/tick.
    let deficit = build({
      residenceCols: [0, 1, 2],
      workplaces: spreadWorkplaces(3, { farms: 1, wells: 0, workshops: 0 }),
      colonists: 3,
      food: 20,
      material: 0,
      water: 0,
    })
    let starveTick = -1
    for (let i = 0; i < 100 && starveTick < 0; i += 1) {
      deficit = stepSimulation(deficit)
      if (getPopulationCount(deficit) === 0) starveTick = deficit.time.tick
    }
    audit('CANDIDATE_A_FOOD_STORAGE', {
      surplus: {
        foodAfter300: surplus.resources.food,
        foodProduction: getFoodProductionPerTick(surplus),
        foodConsumption: getFoodConsumptionPerTick(surplus),
        capped: false,
      },
      deficit: { starveTick, population: getPopulationCount(deficit) },
      evidence: 'surplus is unbounded and unused; shortage is a single-tick colony wipe',
    })
    expect(surplus.resources.food).toBeGreaterThan(300)
    expect(starveTick).toBeGreaterThan(0)
    expect(getPopulationCount(deficit)).toBe(0)
  })

  it('B — Water storage: measures the unbounded stock and the production-cap admission gate', () => {
    // A colony with net Water +1 grows its stock for 600 ticks with no cap.
    const state = runTicks(
      build({
        residenceCols: [0],
        workplaces: spreadWorkplaces(1, { farms: 0, wells: 1, workshops: 0 }),
        colonists: 1,
        food: 100_000,
        material: 0,
        water: 0,
      }),
      600
    )
    // A huge stock never admits the colonist that the production capacity
    // cannot support.
    const capped = runTicks(
      build({
        residenceCols: [0, 1, 2],
        workplaces: spreadWorkplaces(3, { farms: 0, wells: 1, workshops: 0 }),
        colonists: 2,
        food: 100_000,
        material: 0,
        water: 1000,
      }),
      60
    )
    audit('CANDIDATE_B_WATER_STORAGE', {
      stockAfter600: state.resources.water,
      stockIsUncapped: state.resources.water > 400,
      populationWith1000Water: getPopulationCount(capped),
      productionCapacity: getWaterProductionPerTick(capped),
      availableHousing: getHousingSummary(capped).availableCapacity,
      evidence: 'Water has no cap and admission is gated by production capacity, not by stock: a storage building would change the level, not the decision',
    })
    expect(state.resources.water).toBeGreaterThan(400)
    expect(getPopulationCount(capped)).toBe(2)
  })

  it('C — Farm input: measures what a per-tick Farm Water/ Material input would do', () => {
    // Current farm economics: 2 Food/tick, staffed, no input, and no Well in
    // this fixture, so no colonist is water-served yet.
    const farm = build({
      residenceCols: [0],
      workplaces: spreadWorkplaces(1, { farms: 1, wells: 0, workshops: 0 }),
      colonists: 1,
      food: 0,
      material: 0,
      water: 0,
    })
    const withWell = build({
      residenceCols: [0],
      workplaces: spreadWorkplaces(1, { farms: 1, wells: 1, workshops: 0 }),
      colonists: 1,
      food: 0,
      material: 0,
      water: 10,
    })
    // Hypothetical input: use the existing numbers to derive the balance, no
    // runtime change. A Farm consuming 1 Water/tick would need one MORE Well
    // per Farm, and the Water gate would then cap population at 2/well while
    // the farm itself consumes from the same budget.
    const waterRows = [1, 2, 3].map((farms) => ({
      farms,
      farmWaterInputPerTick: farms,
      wellsNeededForBalance: farms,
      wellMaterialCost: farms * 25,
      productionPerWell: WATER_PER_WELL_PER_TICK,
      colonistNeedPerWell: WATER_PER_COLONIST_PER_TICK * 2,
    }))
    audit('CANDIDATE_C_FARM_INPUT', {
      currentFarm: {
        foodPerTick: getFoodProductionPerTick(farm),
        waterInputPerTick: 0,
        materialInputPerTick: 0,
        waterNeedWithoutWell: getWaterNeedPerTick(farm),
        waterNeedWithWell: getWaterNeedPerTick(withWell),
      },
      hypotheticalWaterInput: waterRows,
      evidence:
        'a per-tick Farm input doubles the Water demand per Well and competes directly with population headroom; with one Well a farm + 2 colonists would already be at the cap',
    })
    expect(getFoodProductionPerTick(farm)).toBe(2)
    expect(getWaterNeedPerTick(farm)).toBe(0) // no Well -> no coverage -> no need
    expect(getWaterNeedPerTick(withWell)).toBe(1)
  })

  it('D — Production dependency: measures the existing one-off Water contract', () => {
    // Current: the Workshop pays Water ONCE at placement and never again.
    const place = placeReal(
      build({
        residenceCols: [0],
        workplaces: spreadWorkplaces(1, { farms: 0, wells: 1, workshops: 0 }),
        colonists: 1,
        food: 100_000,
        material: 100,
        water: 10,
      }),
      'workshop',
      { x: 5, y: ROW_WORKPLACE }
    )
    const afterPlacement = place.state
    const settled = runTicks(afterPlacement, 200)
    const recurringWater = getWaterStatus(settled)
    audit('CANDIDATE_D_PRODUCTION_DEPENDENCY', {
      waterChargedAtPlacement: 1,
      waterAfter200Ticks: settled.resources.water,
      waterNeedPerTick: recurringWater.needPerTick,
      workshopStillOperational:
        [...iterateBuildings(settled)].find((building) => building.type === 'workshop')
          ?.status ?? null,
      evidence:
        'the Water relationship is construction-only; a per-tick Water -> Workshop dependency would add a second sink competing with population and would require a second Well to stay solvent at the minimum colony (2 production vs 2 colonists + 1 workshop)',
    })
    expect(getWaterNeedPerTick(settled)).toBe(1)
    expect(settled.resources.water).toBeGreaterThan(0)
  })

  it('E — Settlement service: measures the existing coverage/network primitives a second service would reuse', () => {
    const state = build({
      residenceCols: [0, 1],
      workplaces: spreadWorkplaces(2, { farms: 0, wells: 1, workshops: 0 }),
      colonists: 2,
      food: 100_000,
      material: 0,
      water: 10,
    })
    const status = getWaterStatus(state)
    audit('CANDIDATE_E_SETTLEMENT_SERVICE', {
      servedResidences: status.servedResidenceCount,
      servedColonists: status.servedColonistCount,
      coveredByOneWell: getWaterProductionPerTick(state),
      reusablePrimitives: ['getRoadNetworks', 'getBuildingRoadAccess', 'getWaterCoverage'],
      evidence:
        'the Well already demonstrates the full service shape (producer -> road network coverage -> consumer); a second service would duplicate it unless it gates a NEW consequence',
    })
    expect(status.servedResidenceCount).toBe(2)
    expect(getWaterProductionPerTick(state)).toBe(2)

    const classification = [
      {
        candidate: 'A — Food storage',
        classification: 'B — useful but incomplete',
        evidence:
          'food surplus is unbounded and unused, and starvation is a single-tick colony wipe; a cap/stock would create a real build-fewer-farms decision, but no consequence beyond buffering exists yet',
      },
      {
        candidate: 'B — Water storage',
        classification: 'C — weak',
        evidence:
          'Water has no cap and admission is gated by production capacity, not stock: measured 1000 Water still admits only 2 colonists; storage would change the buffer level, not the decision',
      },
      {
        candidate: 'C — Farm input',
        classification: 'E — rejected',
        evidence:
          'a per-tick Farm input competes with the population need for the same 2 Water/Well and pushes the minimum colony into deficit; Food must exist before the first Well, so the input attacks the bootstrap root',
      },
      {
        candidate: 'D — Production dependency',
        classification: 'D — premature',
        evidence:
          'the one-off Water placement cost already creates the dependency at the correct point; a recurring Water -> Workshop sink needs a second Well before it is solvent and breaks the minimum-colony balance',
      },
      {
        candidate: 'E — Settlement service',
        classification: 'B — useful but incomplete',
        evidence:
          'the coverage/network primitives are reusable and local, but no second consumer consequence exists yet, so it would duplicate the Well without a new decision',
      },
    ]
    audit('CLASSIFICATION', { classification })
    expect(classification).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// 11. Architecture invariants
// ---------------------------------------------------------------------------

describe('11. Architecture invariants (src-immutable audit)', () => {
  it('keeps the persisted model unchanged and the simulation deterministic', () => {
    const scenario = (): SimulationState =>
      build({
        residenceCols: [0, 1],
        workplaces: spreadWorkplaces(2, { farms: 1, wells: 1, workshops: 1 }),
        colonists: 2,
        food: 10_000,
        material: 100,
        water: 5,
      })
    const run = (): SimulationState => runTicks(scenario(), 200)
    const a = run()
    const b = run()
    audit('DETERMINISM', {
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      saveVersion: SAVE_VERSION,
      roundTripHashEqual: hashCanonicalState(a) === hashCanonicalState(a),
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(SAVE_VERSION).toBe(7)

    // Insertion-order invariance: reordering the record keys must not change
    // the canonical hash.
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))

    // No derived Water field is persisted anywhere in the payload.
    const serialized = serializeSave(a)
    for (const term of ['coverage', 'servedResidence', 'networkId', 'mobilityConnected', 'staffed']) {
      expect(serialized).not.toContain(term)
    }
  })
})
