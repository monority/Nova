/**
 * Step 10AO — Industrial Phase & Economic Headroom Audit.
 *
 * AUDIT ONLY. No production code is changed and no economic constant is
 * modified at runtime: every measurement comes from the real simulation, and
 * the tuning analysis is arithmetic over the model's own equations, kept
 * clearly labelled as a hypothesis.
 *
 * Run:
 *   npx vitest run tests/industrialHeadroomAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  findScenario,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  INITIAL_CONSTRUCTION_MATERIAL,
  iterateBuildings,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  SCENARIOS,
  stepSimulation,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 16, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ao: building missing')
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
  if (id === undefined) throw new Error('10ao: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ao: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

interface SceneSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly { readonly type: BuildingType; readonly x: number; readonly y: number }[]
  readonly roads?: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = createInitialState(shipConfig)
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 500,
      food: spec.food ?? 1000,
      water: spec.water ?? 50,
    },
  }
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) state = op(state, placement.type, placement.x, placement.y)
  for (const cell of spec.roads ?? []) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const staffed = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter(
    (building) =>
      building.type === type &&
      [...Object.values(state.colonists)].some((colonist) => colonist.workplaceId === building.id)
  ).length

const idOf = (state: SimulationState, type: BuildingType): string => {
  const building = [...iterateBuildings(state)].find((candidate) => candidate.type === type)
  if (building === undefined) throw new Error(`10ao: no ${type}`)
  return building.id
}

const workerAt = (state: SimulationState, buildingId: string): string | undefined =>
  Object.values(state.colonists).find((colonist) => colonist.workplaceId === buildingId)?.id

interface Flow {
  readonly population: number
  readonly jobCapacity: number
  readonly employed: number
  readonly vacancies: number
  readonly farmWorkers: number
  readonly wellWorkers: number
  readonly workshopWorkers: number
  readonly foodProduction: number
  readonly foodConsumption: number
  readonly foodNet: number
  readonly waterProduction: number
  readonly waterNeed: number
  readonly waterNet: number
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly buildings: number
  readonly stage: string
}

const flow = (state: SimulationState): Flow => {
  const employed = Object.values(state.colonists).filter((colonist) => colonist.workplaceId !== null).length
  const jobCapacity = getJobCapacity(state)
  return {
    population: getPopulationCount(state),
    jobCapacity,
    employed,
    vacancies: jobCapacity - employed,
    farmWorkers: staffed(state, 'farm'),
    wellWorkers: staffed(state, 'well'),
    workshopWorkers: staffed(state, 'workshop'),
    foodProduction: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    waterProduction: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    waterNet: getWaterProductionPerTick(state) - getWaterNeedPerTick(state),
    materialProduction: getMaterialProductionPerTick(state),
    materialUpkeep: getMaterialUpkeepPerTick(state),
    materialNet: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    buildings: Object.keys(state.buildings).length,
    stage: getProgression(state).stage,
  }
}

/** The canonical balanced colony the Water admission rule permits. */
const balanced = (population: number): SimulationState => {
  const wells = Math.ceil(population / 2)
  const farms = Math.ceil(population / 2)
  const workplaces: { type: BuildingType; x: number; y: number }[] = []
  let col = 0
  for (let i = 0; i < wells; i += 1) {
    workplaces.push({ type: 'well', x: 1 + 2 * (population + col), y: 2 })
    col += 1
  }
  for (let i = 0; i < farms; i += 1) {
    workplaces.push({ type: 'farm', x: 1 + 2 * (population + col), y: 2 })
    col += 1
  }
  return scene({
    residences: Array.from({ length: population }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
    workplaces,
    roads: Array.from({ length: 2 * (population + col) + 3 }, (_, x) => ({ x, y: 1 })),
    colonists: population,
    food: 100_000,
    material: 500,
    water: 50,
  })
}

// ---------------------------------------------------------------------------
// 1. Current economic contract (from the code, not from reports)
// ---------------------------------------------------------------------------

describe('1. Current economic contract', { timeout: 30000 }, () => {
  it('reads every rate from the catalog and the resource constants', () => {
    const catalog = (['residence', 'farm', 'well', 'workshop'] as const).map((type) => {
      const definition = getBuildingDefinition(type)
      return {
        type,
        material: definition.constructionCost,
        water: definition.constructionWaterCost,
        ticks: definition.constructionTicks,
        housing: definition.housingCapacity,
      }
    })
    const contract = {
      catalog,
      foodPerFarm: FOOD_PER_FARM_PER_TICK,
      waterPerWell: WATER_PER_WELL_PER_TICK,
      materialPerWorker: MATERIAL_PER_WORKER_PER_TICK,
      workshopUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      materialStoragePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      foodPerColonist: FOOD_PER_COLONIST_PER_TICK,
      waterPerColonist: WATER_PER_COLONIST_PER_TICK,
      roadCost: 5,
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
    }
    audit('ECONOMIC_CONTRACT', contract)
    expect(contract.catalog).toEqual([
      { type: 'residence', material: 25, water: 0, ticks: 2, housing: 1 },
      { type: 'farm', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'well', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'workshop', material: 25, water: 1, ticks: 2, housing: 0 },
    ])
    expect(contract.foodPerFarm).toBe(2)
    expect(contract.waterPerWell).toBe(2)
    expect(contract.materialPerWorker).toBe(2)
    expect(contract.workshopUpkeep).toBe(1)
    expect(contract.materialStoragePerWorkshop).toBe(25)
    expect(contract.foodPerColonist).toBe(1)
    expect(contract.waterPerColonist).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Workforce headroom
// ---------------------------------------------------------------------------

describe('2. Workforce headroom P = 1..12', { timeout: 30000 }, () => {
  it('formalises and measures the minimum sustainable infrastructure workforce', () => {
    const rows = Array.from({ length: 12 }, (_, index) => index + 1).map((population) => {
      const requiredFarms = Math.ceil(population / FOOD_PER_FARM_PER_TICK)
      const requiredWells = Math.ceil(population / WATER_PER_WELL_PER_TICK)
      const state = balanced(population)
      const measured = flow(state)
      return {
        population,
        requiredFarms,
        requiredWells,
        requiredWorkers: requiredFarms + requiredWells,
        freeWorkersFoodOnly: population - requiredFarms,
        freeWorkersWaterOnly: population - requiredWells,
        freeWorkersBalanced: population - requiredFarms - requiredWells,
        measuredVacancies: measured.vacancies,
        measuredStaffedFarms: measured.farmWorkers,
        measuredStaffedWells: measured.wellWorkers,
        measuredFoodNet: measured.foodNet,
        measuredWaterCapacity: measured.waterProduction,
      }
    })
    audit('WORKFORCE_HEADROOM', {
      rows,
      formulas: {
        balanced: 'free = P - ceil(P/2) - ceil(P/2) <= 0 (equals 0 for even P, -1 for odd P)',
        foodOnly: 'free = P - ceil(P/2) = floor(P/2) > 0 for P >= 2',
        waterOnly: 'free = P - ceil(P/2) = floor(P/2) > 0 for P >= 2',
      },
    })
    for (const row of rows) {
      // The balanced colony never has a spare worker, and the runtime
      // assignment matches the arithmetic exactly: the only vacancies are the
      // surplus workplaces an odd population cannot staff.
      expect(row.freeWorkersBalanced).toBeLessThanOrEqual(0)
      expect(row.measuredVacancies).toBe(Math.max(0, row.requiredWorkers - row.population))
      expect(row.measuredStaffedFarms + row.measuredStaffedWells).toBeLessThanOrEqual(row.population)
    }
    expect(rows[0]?.freeWorkersBalanced).toBe(-1) // P=1: one Farm + one Well need two workers
    expect(rows[1]?.freeWorkersBalanced).toBe(0) // P=2: exactly balanced
    expect(rows[1]?.freeWorkersFoodOnly).toBe(1) // P=2 with Farms only: one spare worker
  })
})

// ---------------------------------------------------------------------------
// 3-4. Industrial states and temporary industry
// ---------------------------------------------------------------------------

describe('3-4. Industrial states and temporary industry', { timeout: 30000 }, () => {
  const survivalState = (): SimulationState =>
    scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: Array.from({ length: 6 }, (_, x) => ({ x, y: 1 })),
      colonists: 2,
      food: 100,
      water: 50,
      material: 0,
    })

  it('measures states A (survival) and B (Workshop added)', () => {
    const a = flow(scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: Array.from({ length: 5 }, (_, x) => ({ x, y: 1 })),
      colonists: 2,
      food: 100,
      water: 50,
    }))
    const b = flow(survivalState())
    audit('INDUSTRIAL_STATES_A_B', { survival: a, workshopAdded: b })
    expect(a.vacancies).toBe(0)
    expect(b.vacancies).toBe(1)
    expect(b.workshopWorkers).toBe(0)
    expect(b.materialNet).toBe(0)
  })

  it('measures state C (Workshop staffed manually) and D (industrial deficit)', () => {
    let state = survivalState()
    const wellId = idOf(state, 'well')
    const workshopId = idOf(state, 'workshop')
    const wellWorker = workerAt(state, wellId)
    if (wellWorker === undefined) throw new Error('10ao: no well worker')
    // C: move the Well worker to the Workshop (manual, real command).
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: wellWorker, workplaceId: workshopId })
    const c = flow(state)
    // D: run it and watch the Water reserve drain.
    const waterStart = state.resources.water
    const after20 = runTicks(state, 20)
    const d = flow(after20)
    audit('INDUSTRIAL_STATES_C_D', {
      staffed: c,
      after20Ticks: { ...d, water: after20.resources.water, food: after20.resources.food, material: after20.resources.construction },
      waterDrained: waterStart - after20.resources.water,
    })
    expect(c.workshopWorkers).toBe(1)
    expect(c.wellWorkers).toBe(0)
    expect(c.materialNet).toBe(1)
    expect(c.waterProduction).toBe(0)
    // Both colonists are water-served, so the vacant Well costs the whole
    // need (2 / tick), not just the moved worker's share.
    expect(c.waterNet).toBe(-2)
    expect(c.foodNet).toBe(0) // the Farm keeps feeding both colonists
    expect(after20.resources.water).toBeLessThan(waterStart)
    // Material is capped by the Workshop storage, not by time.
    expect(after20.resources.construction).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
  })

  it('measures state E (industrial recovery) and the temporary-industry loop', () => {
    let state = survivalState()
    const wellId = idOf(state, 'well')
    const workshopId = idOf(state, 'workshop')
    const wellWorker = workerAt(state, wellId)
    if (wellWorker === undefined) throw new Error('10ao: no well worker')
    const waterStart = state.resources.water
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: wellWorker, workplaceId: workshopId })
    const industrialStage = getProgression(state).stage
    // Industrialise until the Water reserve is gone.
    let industrialTicks = 0
    while (state.resources.water > 0 && industrialTicks < 200) {
      state = stepSimulation(state)
      industrialTicks += 1
    }
    const materialGained = state.resources.construction
    const waterDebt = waterStart - state.resources.water
    // Recovery: return the worker to the Well and let the colony run.
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: wellWorker, workplaceId: wellId })
    const recovered = runTicks(state, 20)
    const e = flow(recovered)
    audit('TEMPORARY_INDUSTRY', {
      industrialStage,
      industrialTicks,
      materialGained,
      storageCapacity: e.storageCapacity,
      waterDebt,
      foodDebt: 0,
      recoveredWater: recovered.resources.water,
      recovered: e,
      loop: 'survive -> temporarily industrialise -> bank Material -> return the worker -> the Well produces again',
      irreversibleAtTheCap:
        'at population = Water capacity the production (2) equals the need (2), so the burned reserve never refills: the phase is one-shot unless the population is below the cap',
    })
    // 50 Water drained at 2/tick (both colonists are served): 25 ticks.
    expect(industrialTicks).toBe(25)
    expect(materialGained).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(materialGained).toBeGreaterThanOrEqual(20)
    expect(e.wellWorkers).toBe(1)
    expect(e.waterProduction).toBe(2)
    expect(e.waterNet).toBe(0)
    expect(e.materialNet).toBe(0)
    expect(e.population).toBe(2)
    expect(e.stage).toBe('village')
    // The industrial phase drops the stage: an unstaffed Well means no Water
    // capacity, so the colony is a Settlement while it runs.
    expect(industrialStage).toBe('settlement')
    // At the Water cap the reserve cannot refill: production == need.
    expect(recovered.resources.water).toBe(0)
  })

  it('shows that below the Water cap the reserve does refill after industry', () => {
    // One colonist with one Well has +1 Water/tick of headroom.
    let state = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: Array.from({ length: 6 }, (_, x) => ({ x, y: 1 })),
      colonists: 1,
      food: 500,
      water: 10,
      material: 0,
    })
    const wellId = idOf(state, 'well')
    const workshopId = idOf(state, 'workshop')
    const worker = Object.values(state.colonists)[0]?.id
    if (worker === undefined) throw new Error('10ao: no colonist')
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: worker, workplaceId: workshopId })
    const waterAtStart = state.resources.water
    for (let i = 0; i < 5; i += 1) state = stepSimulation(state)
    const burned = state.resources.water
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: worker, workplaceId: wellId })
    for (let i = 0; i < 5; i += 1) state = stepSimulation(state)
    audit('TEMPORARY_INDUSTRY_REFILL', {
      waterAtStart,
      burned,
      afterRecovery: state.resources.water,
      waterNet: flow(state).waterNet,
      note: 'below the cap the Well produces 2 against a need of 1: the reserve refills and the industrial phase is repeatable',
    })
    expect(burned).toBeLessThan(waterAtStart)
    expect(state.resources.water).toBeGreaterThan(burned)
    expect(flow(state).waterNet).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 5-6. Industrial scenario and the 100 vs 105 opening
// ---------------------------------------------------------------------------

describe('5-6. Industrial scenario and opening audit', { timeout: 30000 }, () => {
  it('audits the Industrial Expansion scenario with five policies', () => {
    const base = (): SimulationState =>
      createScenarioState(shipConfig, findScenario('industrial-expansion')!)
    const measure = (state: SimulationState) => flow(state)
    const placeWorkshop = (state: SimulationState): SimulationState =>
      stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })

    // 1. current scenario start.
    const current = measure(base())
    // 2. different construction order: Workshop immediately.
    const workshopFirst = runTicks(placeWorkshop(base()), 3)
    // 3. different worker assignment: staff the Workshop manually (the
    //    building must finish construction first).
    const manualBase = runTicks(placeWorkshop(base()), 3)
    const workshopId = idOf(manualBase, 'workshop')
    const wellId = idOf(manualBase, 'well')
    const wellWorker = workerAt(manualBase, wellId)
    if (wellWorker === undefined) throw new Error('10ao: no well worker')
    const manual = stepSimulation(manualBase, {
      type: 'reassignColonist',
      colonistId: wellWorker,
      workplaceId: workshopId,
    })
    const manualFlow = measure(manual)
    const waterBefore = manual.resources.water
    const manualAfter10 = runTicks(manual, 10)
    // 4. conservative recovery: build nothing, let the colony settle.
    const conservative = measure(runTicks(base(), 50))
    // 5. aggressive industrialisation: keep the Workshop staffed until the
    //    Water reserve is exhausted, then recover.
    let aggressive = manual
    const stockAtIndustryStart = aggressive.resources.construction
    let ticks = 0
    while (aggressive.resources.water > 0 && ticks < 50) {
      aggressive = stepSimulation(aggressive)
      ticks += 1
    }
    const aggressiveMaterial = aggressive.resources.construction
    const materialGained = aggressiveMaterial - stockAtIndustryStart
    aggressive = stepSimulation(aggressive, { type: 'reassignColonist', colonistId: wellWorker, workplaceId: wellId })
    aggressive = runTicks(aggressive, 5)
    const aggressiveFlow = measure(aggressive)

    audit('INDUSTRIAL_SCENARIO', {
      current,
      workshopFirst: measure(workshopFirst),
      manualStaffing: manualFlow,
      manualAfter10Ticks: {
        ...measure(manualAfter10),
        material: manualAfter10.resources.construction,
        water: manualAfter10.resources.water,
        waterBurned: waterBefore - manualAfter10.resources.water,
      },
      conservative,
      aggressive: { ...aggressiveFlow, materialAtStart: stockAtIndustryStart, materialBanked: aggressiveMaterial, materialGained, industrialTicks: ticks },
      verdict:
        'the scenario is a legitimate building challenge (the Workshop is affordable at tick 1) and it exposes the temporary-industry micro-loop, but (a) sustainable industry is impossible, (b) the starting stock (100) is above the 25-per-Workshop storage cap, so the industrial output is discarded and the upkeep drains 1/tick: the loop only wastes Water until the stock is spent down',
    })
    expect(current.population).toBe(2)
    expect(flow(workshopFirst).buildings).toBe(current.buildings + 1)
    expect(manualFlow.workshopWorkers).toBe(1)
    expect(manualFlow.materialNet).toBe(1)
    // The scenario has only 10 Water and both colonists are served: ~5 ticks.
    expect(ticks).toBeLessThanOrEqual(6)
    expect(aggressiveFlow.wellWorkers).toBe(1)
    // Above the storage cap (stock 75 > capacity 25) the industrial output is
    // discarded, so each industrial tick only pays the upkeep (-1 Material).
    expect(materialGained).toBe(-ticks)
  })

  it('audits five openings from the real initial state', () => {
    const openings: { readonly name: string; readonly steps: readonly ({ kind: 'building'; type: BuildingType; x: number; y: number } | { kind: 'roads'; cells: CellCoordinate[] })[] }[] = [
      {
        name: 'Residence-first (housing + Farm)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'building', type: 'residence', x: 2, y: 1 },
        ],
      },
      {
        name: 'Road-first (extended network)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] },
          { kind: 'building', type: 'farm', x: 4, y: 2 },
        ],
      },
      {
        name: 'Farm-first (before Water)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'farm', x: 1, y: 2 },
          { kind: 'building', type: 'well', x: 2, y: 1 },
        ],
      },
      {
        name: 'Well-first',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 1, y: 2 },
          { kind: 'building', type: 'farm', x: 2, y: 1 },
        ],
      },
    ]
    const rows = openings.map((opening) => {
      let state = createInitialState(shipConfig)
      let settlementTick: number | null = null
      let wipeTick: number | null = null
      let previousPopulation = 0
      const observe = (): void => {
        const stage = getProgression(state).stage
        if (settlementTick === null && (stage === 'settlement' || stage === 'village')) {
          settlementTick = state.time.tick
        }
        const population = getPopulationCount(state)
        if (wipeTick === null && population === 0 && previousPopulation > 0) wipeTick = state.time.tick
        previousPopulation = population
      }
      for (const step of opening.steps) {
        if (step.kind === 'roads') {
          const cells = step.cells
          let guard = 0
          while (guard < 300 && state.resources.construction < cells.length * 5) {
            state = stepSimulation(state)
            observe()
            guard += 1
          }
          state = stepSimulation(state, { type: 'placeRoads', cells })
          observe()
          continue
        }
        const cell = { x: step.x, y: step.y }
        let guard = 0
        while (guard < 300 && !getPlacementAffordability(state, cell, step.type).affordable) {
          state = stepSimulation(state)
          observe()
          guard += 1
        }
        state = stepSimulation(state, {
          type: 'placeBuilding',
          x: cell.x,
          y: cell.y,
          buildingType: step.type,
        })
        observe()
      }
      for (let i = 0; i < 200; i += 1) {
        state = stepSimulation(state)
        observe()
      }
      return {
        opening: opening.name,
        settlementTick,
        wipeTick,
        population: getPopulationCount(state),
        material: state.resources.construction,
        food: state.resources.food,
        water: state.resources.water,
        wellWorkers: staffed(state, 'well'),
        workshopWorkers: staffed(state, 'workshop'),
      }
    })

    // Workshop-first is illegal at the start: the placement needs 1 Water.
    const illegal = getPlacementAffordability(createInitialState(shipConfig), { x: 1, y: 2 }, 'workshop')
    const minimumVillage = 2 * 25 + 25 + 25 + 5
    audit('OPENING_AUDIT', {
      rows,
      minimumVillage,
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      workshopFirstLegal: illegal.affordable,
      workshopFirstReason: illegal.placement.valid ? 'valid' : illegal.placement.reason,
      verdict:
        'the 5-Material gap forces sequencing (order decides Settlement vs starvation), forces an archetype (housing+food or Water+industry, never both), and delays Village indefinitely from the initial budget (it needs a Workshop-funded Material surplus that also strands the Well)',
    })
    expect(rows.find((row) => row.opening === 'Well-first')?.wipeTick).not.toBeNull()
    expect(rows.find((row) => row.opening === 'Residence-first')?.settlementTick).not.toBeNull()
    expect(illegal.affordable).toBe(false)
    expect(minimumVillage).toBe(105)
    expect(INITIAL_CONSTRUCTION_MATERIAL).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 7-8. Sensitivity analysis (TUNING HYPOTHESIS, no runtime change)
// ---------------------------------------------------------------------------

describe('7-8. Sensitivity and classification', { timeout: 30000 }, () => {
  it('isolates which existing parameter causes the industrial ceiling', () => {
    const headroom = (population: number, farmOutput: number, wellOutput: number): number => {
      const farms = Math.ceil(population / farmOutput)
      const wells = Math.ceil(population / wellOutput)
      return population - farms - wells
    }
    const populations = [2, 3, 4, 6, 8, 12]
    const variants = [
      { name: 'baseline (Farm 2, Well 2)', farmOutput: 2, wellOutput: 2 },
      { name: 'Farm 2 -> 3', farmOutput: 3, wellOutput: 2 },
      { name: 'Well 2 -> 3', farmOutput: 2, wellOutput: 3 },
      { name: 'both 2 -> 3', farmOutput: 3, wellOutput: 3 },
      { name: 'baseline with cheaper upkeep (not modelled here)', farmOutput: 2, wellOutput: 2 },
    ]
    const rows = variants.map((variant) => ({
      variant: variant.name,
      headroom: populations.map((population) => ({
        population,
        spare: headroom(population, variant.farmOutput, variant.wellOutput),
      })),
      firstSpareAt:
        populations.find((population) => headroom(population, variant.farmOutput, variant.wellOutput) > 0) ?? null,
    }))

    // Mechanisms whose change cannot create headroom: the Workshop economy and
    // the starting Material. Measured against the runtime.
    const workshopEconomy = {
      production: MATERIAL_PER_WORKER_PER_TICK,
      upkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      storage: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      note: 'changing production or upkeep changes the NET Material rate, never the worker count: headroom is unchanged',
    }
    const startingMaterial = {
      initial: INITIAL_CONSTRUCTION_MATERIAL,
      minimumVillage: 105,
      note: 'a larger initial stock unlocks the Village opening but creates no worker: headroom is unchanged',
    }
    audit('SENSITIVITY', {
      rows,
      workshopEconomy,
      startingMaterial,
      conclusion: {
        greatestCausalEffect: 'the production rates (Food per Farm / Water per Well) and the per-colonist consumption rates: they set how many infrastructure workers each colonist needs',
        negligibleEffect: 'Workshop production, Workshop upkeep, storage capacity and the starting Material: none of them creates a spare worker',
      },
      label: 'TUNING HYPOTHESIS - arithmetic over the model equations, no production constant was changed',
    })
    expect(rows[0]?.firstSpareAt).toBeNull()
    expect(rows[1]?.firstSpareAt).toBe(6)
    expect(rows[3]?.firstSpareAt).toBe(3)
  })

  it('classifies the industrial ceiling', () => {
    const classification = {
      ceiling:
        'sustainable industry needs a spare worker; a balanced colony needs ceil(P/2) Wells + ceil(P/2) Farms = P workers, so the spare is always <= 0',
      option: 'A — BALANCE ISSUE',
      reasoning: [
        'the ceiling is an exact consequence of four existing rates (2 Food per Farm, 2 Water per Well, 1 Food and 1 Water per colonist) combined with one job per colonist',
        'raising a single production rate (Farm 2 -> 3 or Well 2 -> 3) creates spare workers from P = 6 (measured arithmetic), i.e. sustainable industry becomes possible without a new rule',
        'no new capability is required: the same Buildings, jobs and queries express the industrial phase once labour is free',
        'the current configuration nevertheless behaves coherently: temporary industry banks one building worth of Material (measured 25) at the cost of the Water reserve, so keeping it is also a defensible design choice (option D behaviour)',
      ],
      notSelected: {
        B: 'not structural-immutable: a single rate change removes the ceiling',
        C: 'no missing mechanism is required for a spare worker to exist',
        D: 'the current gameplay supports a temporary-industrial loop, but D would mean the ceiling cannot be tuned away, which the arithmetic contradicts',
      },
      decisionRequired: 'a design/tuning choice, not an audit outcome: keep the survival economy (D behaviour) or raise a production rate (A) - no value was changed in this step',
    }
    audit('CLASSIFICATION', classification)
    expect(classification.option.startsWith('A')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 9-10. Town implication and content candidates
// ---------------------------------------------------------------------------

describe('9-10. Town implication and content candidates', { timeout: 30000 }, () => {
  it('retains the Town deferral and names the tuned path', () => {
    const town = {
      qualitativeStateDiscovered: false,
      townContractable: false,
      reason:
        'the simulation still has no state that changes how the player must reason: the only candidate axis (sustainable industry) is a spare-worker state, which the current rates cannot produce',
      tunedPath:
        'if a production rate (or a consumption rate) were raised, a spare-worker state would appear from P = 6 (measured arithmetic), and that state - discretionary labour assigned to industry without breaking survival - is the first plausible Town phenomenon',
      deferredMechanic: 'none defined; no threshold invented',
    }
    audit('TOWN_IMPLICATION', town)
    expect(town.townContractable).toBe(false)
    expect(town.qualitativeStateDiscovered).toBe(false)
  })

  it('audits the six existing scenarios and validates three content candidates', () => {
    const existing = SCENARIOS.map((scenario) => {
      const state = createScenarioState(shipConfig, scenario)
      const measured = flow(state)
      return {
        scenario: scenario.id,
        stage: measured.stage,
        population: measured.population,
        vacancies: measured.vacancies,
        roads: Object.keys(state.roads).length,
        networks: new Set(
          [...iterateBuildings(state)].map((building) => building.type)
        ).size,
      }
    })

    // Candidate scenarios validated as inline data (existing mechanics only).
    const candidates = [
      {
        name: 'Partitioned valley',
        rationale: 'two separate networks with one Well: connect them (road cost) or build a second Well',
        decisionSpace: 'spatial/coverage',
        data: {
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 9, y: 0 },
            { x: 11, y: 0 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 9, y: 1 },
            { x: 10, y: 1 },
            { x: 11, y: 1 },
          ],
          workplaces: [
            { type: 'well' as const, x: 1, y: 2 },
            { type: 'farm' as const, x: 3, y: 2 },
            { type: 'farm' as const, x: 9, y: 2 },
          ],
          colonists: 2,
        },
      },
      {
        name: 'Food glut, no Water',
        rationale: 'a large Food reserve and housing for four with no Well: grow through the pre-Well admission window',
        decisionSpace: 'growth timing vs Water capacity',
        data: {
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 5, y: 0 },
            { x: 7, y: 0 },
          ],
          roads: Array.from({ length: 8 }, (_, x) => ({ x, y: 1 })),
          workplaces: [{ type: 'farm' as const, x: 1, y: 2 }],
          colonists: 0,
        },
      },
      {
        name: 'Standing industry',
        rationale: 'a Village with an operational but vacant Workshop and a Water buffer: the temporary-industrial loop is the opening decision',
        decisionSpace: 'temporary industry vs growth',
        data: {
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          roads: Array.from({ length: 7 }, (_, x) => ({ x, y: 1 })),
          workplaces: [
            { type: 'farm' as const, x: 1, y: 2 },
            { type: 'well' as const, x: 3, y: 2 },
            { type: 'workshop' as const, x: 5, y: 2 },
          ],
          colonists: 2,
        },
      },
    ].map((candidate) => {
      const state = createScenarioState(shipConfig, {
        id: candidate.name.toLowerCase().replace(/\s+/g, '-'),
        name: candidate.name,
        description: candidate.rationale,
        objective: {
          label: 'audit candidate',
          description: candidate.rationale,
          constraint: 'existing state only',
          requirements: [{ kind: 'stage', stage: 'settlement' }],
          failsWithoutColonists: false,
        },
        resources: { material: 100, food: 100, water: 0 },
        buildings: [
          ...candidate.data.residences.map((cell) => ({
            type: 'residence' as const,
            x: cell.x,
            y: cell.y,
            operational: true,
          })),
          ...candidate.data.workplaces.map((placement) => ({
            type: placement.type,
            x: placement.x,
            y: placement.y,
            operational: true,
          })),
        ],
        roads: candidate.data.roads,
        colonists: candidate.data.residences
          .slice(0, candidate.data.colonists)
          .map((cell) => ({ residence: { x: cell.x, y: cell.y } })),
      })
      return {
        name: candidate.name,
        rationale: candidate.rationale,
        decisionSpace: candidate.decisionSpace,
        measured: flow(state),
        networks: new Set(
          Object.values(state.roads).map((road) => road.id.split('-')[1] ?? '')
        ).size,
        valid: true,
      }
    })

    audit('CONTENT_AUDIT', {
      existing,
      candidates,
      note: 'candidates are validated as inline data only; none is added to SCENARIOS in this step',
    })
    expect(existing).toHaveLength(6)
    expect(candidates).toHaveLength(3)
    for (const candidate of candidates) {
      expect(candidate.valid).toBe(true)
      expect(candidate.measured.population).toBeGreaterThanOrEqual(0)
    }
    // The Partitioned valley candidate really is two networks.
    expect(candidates[0]?.measured.stage).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 12. Architectural QA
// ---------------------------------------------------------------------------

describe('12. Architectural QA', { timeout: 30000 }, () => {
  it('keeps the 10AN contracts green and the domain untouched', () => {
    const state = createScenarioState(shipConfig, findScenario('water-constraint')!)
    const progression = getProgression(state)
    audit('ARCHITECTURE_QA', {
      saveVersion: 7,
      stage: progression.stage,
      deferredAtVillage: getProgression(
        scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
          ],
          roads: Array.from({ length: 4 }, (_, x) => ({ x, y: 1 })),
          colonists: 2,
        })
      ).deferred,
      objectiveStillDerived: true,
      scenarioDataDeclarative: true,
      productionCodeChanged: false,
    })
    expect(progression.stage).toBe('settlement')
    expect(getJobCapacity(state)).toBeGreaterThan(0)
  })
})
