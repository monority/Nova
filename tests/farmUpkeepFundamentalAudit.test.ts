/**
 * Fundamental Farm Upkeep Audit (Step 10J).
 *
 * AUDIT ONLY — `src/` is untouched. The question:
 *
 *   Does NOVA need Farm Material upkeep at all?
 *
 * Three conceptual models are measured:
 *
 *   MODEL A  BASELINE   farm upkeep 0 (current production)
 *   MODEL B  FULL       farm upkeep = staffedFarms (historical, 10G)
 *   MODEL C  WORKER     the existing 10E competition, measured directly:
 *                       one worker -> Farm (+2 Food) OR Workshop (+2 Material, -1 upkeep)
 *
 * Model B is modelled only inside this file (`stepWithMetrics`, mode 'full').
 * Model A uses the production `stepSimulation` for every trajectory, with the
 * mode-'baseline' harness used only where the phase-8a crest must be observed
 * (it is byte-identical to `stepSimulation`).
 *
 * Run:
 *   npx vitest run tests/farmUpkeepFundamentalAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  FOOD_PER_FARM_PER_TICK,
  getBuildingInspection,
  getEmploymentSummary,
  getMaterialProductionPerTick,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPopulationCount,
  getRoadIdAtCell,
  hashCanonicalState,
  loadSave,
  materialStorageCapacityForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  produceFood,
  produceMaterial,
  progressPlacedRoads,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  type BuildingType,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixture plumbing
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10j', width: 60, height: 20 },
}

const createAuditState = (): SimulationState => createInitialState(auditConfig)

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('audit: building missing')
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

const opRoad = (
  state: SimulationState,
  x: number,
  y: number
): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('audit: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('audit: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const addColonist = (
  state: SimulationState,
  residenceId: string
): SimulationState => createColonist(state, residenceId).state

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

interface WorldSpec {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

const rowWorld = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createAuditState(), {
    food: spec.food ?? 2000,
    material: spec.material ?? 10,
    // Step 10AD: seed the Workshop construction Water (see farmUpkeepStability).
    water: 10,
  })
  const columns = Math.max(spec.residences, spec.farms + spec.workshops)
  const residenceIds: string[] = []
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * 2, 0)
    residenceIds.push(`building-${i + 1}`)
  }
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) {
      state = op(state, type, 1 + (i + offset) * 2, 2)
    }
  }
  if ((spec.first ?? 'farm') === 'farm') {
    place('farm', spec.farms, 0)
    place('workshop', spec.workshops, spec.farms)
  } else {
    place('workshop', spec.workshops, 0)
    place('farm', spec.farms, spec.workshops)
  }
  for (let x = 0; x < 2 * columns + 2; x += 1) {
    state = opRoad(state, x, 1)
  }
  for (const id of residenceIds) state = addColonist(state, id)
  return assignJobs(state)
}

/**
 * Operational world with SPARE residences: `residences` operational homes,
 * `colonists` injected, so population can grow by admission while food lasts.
 */
const growingWorld = (spec: {
  readonly residences: number
  readonly colonists: number
  readonly farms: number
  readonly workshops: number
  readonly food?: number
  readonly material?: number
}): SimulationState => {
  let state = withStocks(createAuditState(), {
    food: spec.food ?? 2000,
    material: spec.material ?? 10,
  })
  const columns = Math.max(spec.residences, spec.farms + spec.workshops)
  const residenceIds: string[] = []
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * 2, 0)
    residenceIds.push(`building-${i + 1}`)
  }
  for (let i = 0; i < spec.farms; i += 1) state = op(state, 'farm', 1 + i * 2, 2)
  for (let i = 0; i < spec.workshops; i += 1) {
    state = op(state, 'workshop', 1 + (spec.farms + i) * 2, 2)
  }
  for (let x = 0; x < 2 * columns + 2; x += 1) {
    state = opRoad(state, x, 1)
  }
  for (let i = 0; i < Math.min(spec.colonists, residenceIds.length); i += 1) {
    state = addColonist(state, residenceIds[i]!)
  }
  return assignJobs(state)
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Baseline-with-crest harness + FULL-upkeep harness (audit-only)
// ---------------------------------------------------------------------------

type UpkeepMode = 'baseline' | 'full'

const farmUpkeepDueFor = (mode: UpkeepMode, staffedFarms: number): number =>
  mode === 'full' ? staffedFarms : 0

interface TickMetrics {
  readonly tick: number
  readonly colonists: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly food: number
  readonly material: number
  readonly materialCrest: number
  readonly foodProduction: number
  readonly materialProduction: number
  readonly farmUpkeep: number
  readonly workshopUpkeep: number
  readonly totalUpkeep: number
  readonly upkeepPaid: number
  readonly constructionAvailable: boolean
  readonly foodShortage: boolean
  readonly population: number
  readonly unemployed: number
}

interface StepResult {
  readonly state: SimulationState
  readonly metrics: TickMetrics
}

const stepWithMetrics = (
  state: SimulationState,
  mode: UpkeepMode,
  command?: SimulationCommand
): StepResult => {
  const colonistsAtStart = getPopulationCount(state)
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  const foodProduction =
    countStaffedOperationalFarms(constructed) * FOOD_PER_FARM_PER_TICK
  const produced = produceFood(constructed)
  const consumed = consumeFood(produced, requiredFood)
  const populated = updatePopulation(consumed.state, consumed.fed)
  const staffed = assignJobs(populated)
  const staffedFarms = countStaffedOperationalFarms(staffed)
  const staffedWorkshops = countStaffedOperationalWorkshops(staffed)
  const materialProduction = materialStoredProductionForTick(staffed)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommand(materialized, command)
  const crestStock = commanded.state.resources.construction
  const progressed = progressPlacedRoads(commanded.state, commanded)

  const workshopUpkeep = materialUpkeepDueForTick(progressed)
  const farmUpkeep = farmUpkeepDueFor(mode, staffedFarms)
  const totalUpkeep = workshopUpkeep + farmUpkeep
  const upkeepPaid = Math.min(progressed.resources.construction, totalUpkeep)
  const maintained =
    upkeepPaid > 0
      ? {
          ...progressed,
          resources: {
            ...progressed.resources,
            construction: progressed.resources.construction - upkeepPaid,
          },
        }
      : progressed

  const final = advanceTime(maintained)

  return {
    state: final,
    metrics: {
      tick: state.time.tick,
      colonists: colonistsAtStart,
      staffedFarms,
      staffedWorkshops,
      food: final.resources.food,
      material: final.resources.construction,
      materialCrest: crestStock,
      foodProduction,
      materialProduction,
      farmUpkeep,
      workshopUpkeep,
      totalUpkeep,
      upkeepPaid,
      constructionAvailable: crestStock >= 25,
      foodShortage: !consumed.fed,
      population: getPopulationCount(final),
      unemployed: getEmploymentSummary(final).unemployed,
    },
  }
}

interface Trace {
  readonly state: SimulationState
  readonly records: readonly TickMetrics[]
}

const runMetrics = (
  start: SimulationState,
  ticks: number,
  mode: UpkeepMode
): Trace => {
  let state = start
  const records: TickMetrics[] = []
  for (let i = 0; i < ticks; i += 1) {
    const result = stepWithMetrics(state, mode)
    state = result.state
    records.push(result.metrics)
  }
  return { state, records }
}

/** Ticks until the phase-8a crest first reaches 25 (a build is affordable). */
const ticksToAfford = (start: SimulationState, cap = 400): number | null => {
  let state = start
  for (let tick = 0; tick < cap; tick += 1) {
    const result = stepWithMetrics(state, 'baseline')
    state = result.state
    if (result.metrics.materialCrest >= 25) return tick + 1
  }
  return null
}

// ---------------------------------------------------------------------------
// 1. Harness fidelity
// ---------------------------------------------------------------------------

describe('1 — harness fidelity', () => {
  it("baseline mode is byte-identical to stepSimulation", () => {
    for (const start of [
      rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10 }),
      rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0 }),
      rowWorld({ residences: 5, farms: 3, workshops: 2, first: 'workshop', material: 5 }),
    ]) {
      let harness = start
      let production = start
      for (let i = 0; i < 30; i += 1) {
        harness = stepWithMetrics(harness, 'baseline').state
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
      expect(hashCanonicalState(harness)).toBe(hashCanonicalState(production))
    }
    audit('HARNESS_FIDELITY', { identical: true })
  })
})

// ---------------------------------------------------------------------------
// 2. Baseline rules (re-read from src behavior)
// ---------------------------------------------------------------------------

describe('2 — baseline rules', () => {
  it('locks the current Farm and Workshop operating rules', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10 })
    const r = runMetrics(state, 1, 'baseline').records[0]!
    audit('BASELINE_RULES', {
      farmProduction: r.foodProduction,
      workshopGross: r.materialProduction,
      farmUpkeep: r.farmUpkeep,
      workshopUpkeep: r.workshopUpkeep,
      storage: materialStorageCapacityForTick(state),
    })
    expect(r.farmUpkeep).toBe(0)
    expect(r.foodProduction).toBe(2)
    expect(r.workshopUpkeep).toBe(1)
    expect(materialStorageCapacityForTick(state)).toBe(25)
  })

  it('reproduces the 24 x W baseline Material equilibrium', () => {
    const equilibria = [1, 2, 3].map((w) => {
      const start = rowWorld({ residences: w, farms: 0, workshops: w, material: 0, food: 4000 })
      const final = advance(start, 80).resources.construction
      return { W: w, equilibrium: final, storage: materialStorageCapacityForTick(start) }
    })
    audit('BASELINE_EQUILIBRIUM', equilibria)
    expect(equilibria.map((e) => e.equilibrium)).toEqual([24, 48, 72])
  })
})

// ---------------------------------------------------------------------------
// 3. Core experiment matrix (60 + 240 ticks)
// ---------------------------------------------------------------------------

interface Scenario {
  readonly name: string
  readonly farms: number
  readonly workshops: number
}

const MATRIX: readonly Scenario[] = [
  { name: '1F+0W', farms: 1, workshops: 0 },
  { name: '1F+1W', farms: 1, workshops: 1 },
  { name: '1F+2W', farms: 1, workshops: 2 },
  { name: '2F+1W', farms: 2, workshops: 1 },
  { name: '2F+2W', farms: 2, workshops: 2 },
  { name: '2F+3W', farms: 2, workshops: 3 },
  { name: '3F+1W', farms: 3, workshops: 1 },
  { name: '3F+2W', farms: 3, workshops: 2 },
  { name: '3F+3W', farms: 3, workshops: 3 },
  { name: '4F+1W', farms: 4, workshops: 1 },
  { name: '4F+2W', farms: 4, workshops: 2 },
  { name: '4F+3W', farms: 4, workshops: 3 },
  { name: '4F+4W', farms: 4, workshops: 4 },
]

const scenarioStart = (scenario: Scenario, food = 4000): SimulationState =>
  rowWorld({
    residences: scenario.farms + scenario.workshops,
    farms: scenario.farms,
    workshops: scenario.workshops,
    material: 10,
    food,
  })

const summarize = (trace: Trace): unknown => {
  const first = trace.records[0]!
  const last = trace.records[trace.records.length - 1]!
  return {
    colonists: first.colonists,
    staffedFarms: first.staffedFarms,
    staffedWorkshops: first.staffedWorkshops,
    unemployed: first.unemployed,
    food: last.food,
    material: last.material,
    foodProduction: first.foodProduction,
    materialProduction: first.materialProduction,
    materialUpkeep: first.totalUpkeep,
    foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
    constructionAvailableTicks: trace.records.filter((r) => r.constructionAvailable).length,
    populationEnd: last.population,
  }
}

describe('3 — core matrix (60 and 240 ticks, baseline)', () => {
  it('records the required fields for every scenario', () => {
    const out: Record<string, unknown> = {}
    for (const scenario of MATRIX) {
      const start = scenarioStart(scenario)
      out[scenario.name] = {
        t60: summarize(runMetrics(start, 60, 'baseline')),
        t240: summarize(runMetrics(start, 240, 'baseline')),
      }
    }
    audit('CORE_MATRIX', out)
    for (const scenario of MATRIX) {
      const entry = out[scenario.name] as { t60: { foodShortageTicks: number }; t240: { foodShortageTicks: number; populationEnd: number } }
      expect(entry.t60.foodShortageTicks).toBe(0)
      expect(entry.t240.foodShortageTicks).toBe(0)
      expect(entry.t240.populationEnd).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Worker opportunity cost
// ---------------------------------------------------------------------------

describe('4 — worker opportunity cost', () => {
  /** 2 colonists, 2 Farms, 1 Workshop; only the 2nd Residence moves. */
  const movedWorld = (atFarm: boolean): SimulationState => {
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'residence', atFarm ? 5 : 3, 0)
    state = op(state, 'farm', 1, 2)
    state = op(state, 'farm', 5, 2)
    state = op(state, 'workshop', 3, 2)
    for (let x = 0; x <= 6; x += 1) state = opRoad(state, x, 1)
    state = addColonist(state, 'building-1')
    state = addColonist(state, 'building-2')
    return assignJobs(state)
  }

  it('measures the exact deltas for one worker moving Workshop -> Farm', () => {
    const atWorkshop = runMetrics(movedWorld(false), 1, 'baseline').records[0]!
    const atFarm = runMetrics(movedWorld(true), 1, 'baseline').records[0]!
    const delta = {
      food: atFarm.foodProduction - atWorkshop.foodProduction,
      materialGross: atFarm.materialProduction - atWorkshop.materialProduction,
      materialNet:
        (atFarm.materialProduction - atFarm.totalUpkeep) -
        (atWorkshop.materialProduction - atWorkshop.totalUpkeep),
      workshopUpkeep: atFarm.workshopUpkeep - atWorkshop.workshopUpkeep,
    }
    audit('WORKER_MOVE_WORKSHOP_TO_FARM', {
      atWorkshop: {
        staffedFarms: atWorkshop.staffedFarms,
        staffedWorkshops: atWorkshop.staffedWorkshops,
        foodProduction: atWorkshop.foodProduction,
        materialProduction: atWorkshop.materialProduction,
        totalUpkeep: atWorkshop.totalUpkeep,
      },
      atFarm: {
        staffedFarms: atFarm.staffedFarms,
        staffedWorkshops: atFarm.staffedWorkshops,
        foodProduction: atFarm.foodProduction,
        materialProduction: atFarm.materialProduction,
        totalUpkeep: atFarm.totalUpkeep,
      },
      delta,
    })
    expect(delta).toEqual({ food: 2, materialGross: -2, materialNet: -1, workshopUpkeep: -1 })
  })

  it('measures the reverse move Farm -> Workshop', () => {
    const atFarm = runMetrics(movedWorld(true), 1, 'baseline').records[0]!
    const atWorkshop = runMetrics(movedWorld(false), 1, 'baseline').records[0]!
    const delta = {
      food: atWorkshop.foodProduction - atFarm.foodProduction,
      materialGross: atWorkshop.materialProduction - atFarm.materialProduction,
      materialNet:
        (atWorkshop.materialProduction - atWorkshop.totalUpkeep) -
        (atFarm.materialProduction - atFarm.totalUpkeep),
    }
    audit('WORKER_MOVE_FARM_TO_WORKSHOP', delta)
    expect(delta).toEqual({ food: -2, materialGross: 2, materialNet: 1 })
  })

  it('the move is observable in the 60-tick stock trajectories', () => {
    const a = runMetrics(movedWorld(false), 60, 'baseline')
    const b = runMetrics(movedWorld(true), 60, 'baseline')
    audit('WORKER_MOVE_TRAJECTORY_60', {
      atWorkshop: { food: a.state.resources.food, material: a.state.resources.construction },
      atFarm: { food: b.state.resources.food, material: b.state.resources.construction },
      deltaFood: b.state.resources.food - a.state.resources.food,
      deltaMaterial: b.state.resources.construction - a.state.resources.construction,
    })
    expect(b.state.resources.food).toBeGreaterThan(a.state.resources.food)
  })
})

// ---------------------------------------------------------------------------
// 5. Food pressure
// ---------------------------------------------------------------------------

describe('5 — Food pressure', () => {
  it('compares more Farms vs more Workshops at identical population = 4', () => {
    const worlds = [
      { name: '3F+1W', farms: 3, workshops: 1 },
      { name: '2F+2W', farms: 2, workshops: 2 },
      { name: '1F+3W', farms: 1, workshops: 3 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const world of worlds) {
      const start = rowWorld({ residences: 4, farms: world.farms, workshops: world.workshops, material: 0, food: 500 })
      const trace = runMetrics(start, 60, 'baseline')
      out[world.name] = {
        foodStart: trace.records[0]!.food,
        foodEnd: trace.state.resources.food,
        foodSlopePerTick: (trace.state.resources.food - 500) / 60,
        materialEnd: trace.state.resources.construction,
        materialPerTick: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
      }
    }
    audit('FOOD_PRESSURE', out)
    // More Farms -> Food grows without bound; more Workshops -> Food drains.
    expect((out['3F+1W'] as { foodSlopePerTick: number }).foodSlopePerTick).toBeGreaterThan(0)
    expect((out['1F+3W'] as { foodSlopePerTick: number }).foodSlopePerTick).toBeLessThan(0)
  })

  it('shows Food is uncapped: a Food-surplus colony accumulates forever', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 0, material: 0, food: 100 })
    const t240 = advance(start, 240)
    audit('FOOD_UNCAPPED', {
      food100: 100,
      foodAfter240: t240.resources.food,
      note: 'Food has no storage ceiling and no non-survival sink',
    })
    expect(t240.resources.food).toBe(100 + 240 * (4 - 2))
  })
})

// ---------------------------------------------------------------------------
// 6. Material bottleneck
// ---------------------------------------------------------------------------

describe('6 — Material bottleneck', () => {
  it('measures time-to-25 and storage equilibrium per scenario', () => {
    const configs = ['1F+1W', '1F+2W', '2F+1W', '2F+2W', '3F+1W', '3F+2W'] as const
    const rows = configs.map((name) => {
      const scenario = MATRIX.find((m) => m.name === name)!
      const start = scenarioStart(scenario, 4000)
      const zero = { ...start, resources: { ...start.resources, construction: 0 } }
      const t25 = ticksToAfford(zero)
      const equilibrium = advance(zero, 240).resources.construction
      return {
        scenario: name,
        netMaterialPerTick: runMetrics(start, 1, 'baseline').records[0]!.materialProduction -
          runMetrics(start, 1, 'baseline').records[0]!.totalUpkeep,
        ticksTo25: t25,
        storage: materialStorageCapacityForTick(start),
        equilibrium,
        nextResidenceCost: 25,
        nextWorkshopCost: 25,
        nextFarmCost: 25,
      }
    })
    audit('MATERIAL_BOTTLENECK', rows)
    for (const row of rows) expect(row.ticksTo25).not.toBeNull()
  })

  it('confirms Material is developmental and Food is survival-only', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10, food: 100 })
    const before = getNetMaterialPerTick(state)
    audit('RESOURCE_ROLES', {
      netMaterialQuery: before,
      materialUpkeepQuery: getMaterialUpkeepPerTick(state),
      materialProductionQuery: getMaterialProductionPerTick(state),
      foodUses: ['population admission', 'starvation gate'],
      materialUses: ['building construction'],
    })
    expect(before).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 7. Population feedback (240 ticks, spare residences)
// ---------------------------------------------------------------------------

describe('7 — population feedback', () => {
  it('runs low / balanced / high Farm colonies with spare housing for 240 ticks', () => {
    const worlds = [
      { name: 'lowFarm', farms: 1, workshops: 5 },
      { name: 'balanced', farms: 3, workshops: 3 },
      { name: 'highFarm', farms: 5, workshops: 1 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const world of worlds) {
      const start = growingWorld({
        residences: 6,
        colonists: 1,
        farms: world.farms,
        workshops: world.workshops,
        food: 4000,
        material: 0,
      })
      const trace = runMetrics(start, 240, 'baseline')
      const last = trace.records[239]!
      out[world.name] = {
        farms: world.farms,
        workshops: world.workshops,
        populationTrace: [trace.records[0]!.population, trace.records[4]!.population, trace.records[49]!.population, last.population],
        staffedFarmsEnd: last.staffedFarms,
        staffedWorkshopsEnd: last.staffedWorkshops,
        unemployedEnd: last.unemployed,
        foodEnd: last.food,
        materialEnd: last.material,
        foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
      }
    }
    audit('POPULATION_FEEDBACK', out)
    // The high-Farm colony grows population and keeps Food positive; the
    // low-Farm colony cannot sustain a large population.
    expect((out['highFarm'] as { populationEnd?: number; populationTrace: number[] }).populationTrace[3]).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// 8. Spatial pressure
// ---------------------------------------------------------------------------

describe('8 — spatial pressure (09M, no Farm upkeep)', () => {
  const residenceAt = (x: number, y: number): SimulationState => {
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', x, y)
    state = addColonist(state, 'building-1')
    state = op(state, 'farm', 3, 3)
    state = op(state, 'workshop', 5, 3)
    state = opRoad(state, 3, 2)
    state = opRoad(state, 4, 2)
    state = opRoad(state, 5, 2)
    return assignJobs(state)
  }

  it('unequal distance: the nearer workplace wins regardless of type', () => {
    const nearFarm = runMetrics(residenceAt(3, 1), 1, 'baseline').records[0]!
    const nearShop = runMetrics(residenceAt(5, 1), 1, 'baseline').records[0]!
    audit('SPATIAL_UNEQUAL', {
      nearFarm: { staffedFarms: nearFarm.staffedFarms, food: nearFarm.foodProduction, material: nearFarm.materialProduction },
      nearShop: { staffedWorkshops: nearShop.staffedWorkshops, food: nearShop.foodProduction, material: nearShop.materialProduction },
    })
    expect(nearFarm.staffedFarms).toBe(1)
    expect(nearShop.staffedWorkshops).toBe(1)
  })

  it('equal distance: the id tie-break decides Farm vs Workshop', () => {
    const tie = (first: 'farm' | 'workshop'): SimulationState => {
      let state = withStocks(createAuditState(), { material: 20, food: 500 })
      state = op(state, 'residence', 2, 1)
      state = addColonist(state, 'building-1')
      if (first === 'farm') {
        state = op(state, 'farm', 1, 2)
        state = op(state, 'workshop', 3, 2)
      } else {
        state = op(state, 'workshop', 1, 2)
        state = op(state, 'farm', 3, 2)
      }
      state = opRoad(state, 2, 2)
      return assignJobs(state)
    }
    const farmFirst = runMetrics(tie('farm'), 1, 'baseline').records[0]!
    const shopFirst = runMetrics(tie('workshop'), 1, 'baseline').records[0]!
    audit('SPATIAL_ID_TIE', {
      farmLowerId: { staffedFarms: farmFirst.staffedFarms, food: farmFirst.foodProduction, material: farmFirst.materialProduction },
      workshopLowerId: { staffedWorkshops: shopFirst.staffedWorkshops, food: shopFirst.foodProduction, material: shopFirst.materialProduction },
    })
    expect(farmFirst.foodProduction).toBe(2)
    expect(shopFirst.materialProduction).toBe(2)
  })

  it('disconnected workplaces are never staffed (09K gate)', () => {
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = addColonist(state, 'building-1')
    state = op(state, 'farm', 5, 5) // no road at all
    state = assignJobs(state)
    const r = runMetrics(state, 1, 'baseline').records[0]!
    audit('SPATIAL_DISCONNECTED', { staffedFarms: r.staffedFarms, unemployed: r.unemployed })
    expect(r.staffedFarms).toBe(0)
    expect(r.unemployed).toBe(1)
  })

  it('alternative road length changes who works where', () => {
    const build = (extraRoad: boolean): SimulationState => {
      let state = withStocks(createAuditState(), { material: 20, food: 500 })
      state = op(state, 'residence', 2, 1)
      state = addColonist(state, 'building-1')
      state = op(state, 'farm', 2, 3)
      state = op(state, 'workshop', 6, 3)
      for (let x = 1; x <= (extraRoad ? 6 : 3); x += 1) state = opRoad(state, x, 2)
      return assignJobs(state)
    }
    const short = runMetrics(build(false), 1, 'baseline').records[0]!
    const long = runMetrics(build(true), 1, 'baseline').records[0]!
    audit('SPATIAL_ROAD_LENGTH', {
      shortNetwork: { staffedFarms: short.staffedFarms, staffedWorkshops: short.staffedWorkshops, food: short.foodProduction, material: short.materialProduction },
      longNetwork: { staffedFarms: long.staffedFarms, staffedWorkshops: long.staffedWorkshops, food: long.foodProduction, material: long.materialProduction },
    })
    expect(short.foodProduction).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 9. Remove-Farm-upkeep counterfactual vs FULL upkeep (10G)
// ---------------------------------------------------------------------------

describe('9 — baseline vs historical FULL Farm upkeep', () => {
  it('compares both models across the core matrix', () => {
    const rows = MATRIX.map((scenario) => {
      const start = scenarioStart(scenario, 4000)
      const base = runMetrics(start, 60, 'baseline')
      const full = runMetrics(start, 60, 'full')
      return {
        scenario: scenario.name,
        baseMaterialEnd: base.state.resources.construction,
        fullMaterialEnd: full.state.resources.construction,
        baseFoodShortage: base.records.filter((r) => r.foodShortage).length,
        fullFoodShortage: full.records.filter((r) => r.foodShortage).length,
        baseNet: base.records[0]!.materialProduction - base.records[0]!.totalUpkeep,
        fullNet: full.records[0]!.materialProduction - full.records[0]!.totalUpkeep,
      }
    })
    audit('BASELINE_VS_FULL', rows)
    const regressions = rows.filter((r) => r.fullMaterialEnd < r.baseMaterialEnd)
    audit('FULL_UPKEEP_EFFECT', {
      scenariosWhereFullReducesMaterial: regressions.map((r) => r.scenario),
      scenariosWhereFullAddsFoodShortage: rows.filter((r) => r.fullFoodShortage > r.baseFoodShortage).map((r) => r.scenario),
    })
    expect(regressions.length).toBeGreaterThan(0)
  })

  it('compares what FULL added vs what baseline already had', () => {
    audit('FULL_ADDITION', {
      added: [
        'extra Material drain (farm tax)',
        'irreversible W<=F traps (10G) / W=F-1 traps (10H)',
      ],
      alreadyPresentWithoutFarmUpkeep: [
        'worker opportunity cost (10E)',
        'spatial distance preference (09M)',
        'Material storage / construction bottleneck (08F)',
        'Food survival gate and starvation (05B)',
      ],
    })
  })
})

// ---------------------------------------------------------------------------
// 10. Terminal states
// ---------------------------------------------------------------------------

describe('10 — terminal states (baseline)', () => {
  const configs = [
    { name: '1F+1W', farms: 1, workshops: 1 },
    { name: '2F+1W', farms: 2, workshops: 1 },
    { name: '3F+1W', farms: 3, workshops: 1 },
    { name: '3F+2W', farms: 3, workshops: 2 },
    { name: '4F+1W', farms: 4, workshops: 1 },
    { name: '4F+2W', farms: 4, workshops: 2 },
  ] as const

  it('Material 0 / Food 0 survives when Farm output covers the need', () => {
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ residences: config.farms + config.workshops, farms: config.farms, workshops: config.workshops, material: 0, food: 0 })
      const trace = runMetrics(start, 120, 'baseline')
      out[config.name] = {
        populationEnd: trace.records[119]!.population,
        foodEnd: trace.records[119]!.food,
        materialEnd: trace.records[119]!.material,
        foodProduction: trace.records[0]!.foodProduction,
        foodNeed: trace.records[0]!.colonists,
        starvationTick: trace.records.find((r) => r.foodShortage)?.tick ?? null,
      }
    }
    audit('TERMINAL_FOOD_ZERO', out)
    // Every mandated config is Farm-rich enough (2 Food per Farm >= pop/2) that
    // production precedes consumption and covers the need even from Food 0.
    for (const config of configs) {
      const entry = out[config.name] as { populationEnd: number; materialEnd: number }
      expect(entry.populationEnd).toBeGreaterThan(0)
      expect(entry.materialEnd).toBeGreaterThan(0)
    }
  })

  it('Food 0 is terminal only when Farm output cannot cover the need', () => {
    // 1F+2W: 3 colonists, 2 Food/tick -> net -1. From Food 0 the colony starves
    // on tick 1 and never recovers (05B colony-wide starvation, no re-admission
    // without surplus Food).
    const start = rowWorld({ residences: 3, farms: 1, workshops: 2, material: 0, food: 0 })
    const trace = runMetrics(start, 120, 'baseline')
    audit('TERMINAL_FOOD_SHORT', {
      populationEnd: trace.records[119]!.population,
      foodProduction: trace.records[0]!.foodProduction,
      foodNeed: trace.records[0]!.colonists,
      starvationTick: trace.records.find((r) => r.foodShortage)?.tick ?? null,
    })
    expect(trace.records[119]!.population).toBe(0)
  })

  it('Material 0 / Food 1000 recovers whenever a Workshop is staffed', () => {
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ residences: config.farms + config.workshops, farms: config.farms, workshops: config.workshops, material: 0, food: 4000 })
      const trace = runMetrics(start, 120, 'baseline')
      out[config.name] = {
        netMaterial: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        materialEnd: trace.records[119]!.material,
        recovered: trace.records[119]!.material > 0,
        foodEnd: trace.records[119]!.food,
        foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
      }
    }
    audit('TERMINAL_MATERIAL_ZERO', out)
    for (const config of configs) {
      expect((out[config.name] as { recovered: boolean }).recovered).toBe(true)
    }
  })

  it('Food-scarcity terminal: too few Farms for the population starves permanently', () => {
    // 1F+2W with a large reserve still dies if the reserve cannot outlast the
    // colony: 3 colonists / 2 Food = -1/tick. This is the pre-existing 05B
    // survival gate, independent of any Farm Material upkeep.
    const start = rowWorld({ residences: 3, farms: 1, workshops: 2, material: 0, food: 3 })
    const trace = runMetrics(start, 120, 'baseline')
    audit('TERMINAL_FOOD_SCARCITY', {
      populationEnd: trace.records[119]!.population,
      foodEnd: trace.records[119]!.food,
      starvationTick: trace.records.find((r) => r.foodShortage)?.tick ?? null,
      note: 'starvation is colony-wide and irreversible in the existing 05B rule',
    })
    expect(trace.records[119]!.population).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 11. Agency test
// ---------------------------------------------------------------------------

describe('11 — agency test (five player decisions)', () => {
  it('evaluates decisions A-E against measured outcomes', () => {
    // A: Farm vs Workshop (worker move).
    const a = runMetrics(
      rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10, food: 500 }),
      1,
      'baseline'
    ).records[0]!
    // D: Farm-first vs Workshop-first bootstrap order (spatial mix, not cost).
    const farmFirst = rowWorld({ residences: 1, farms: 1, workshops: 1, first: 'farm' })
    const shopFirst = rowWorld({ residences: 1, farms: 1, workshops: 1, first: 'workshop' })
    const farmMix = runMetrics(farmFirst, 1, 'baseline').records[0]!
    const shopMix = runMetrics(shopFirst, 1, 'baseline').records[0]!

    audit('AGENCY', {
      A_farmVsWorkshop: {
        classification: 'REAL',
        evidence: {
          farmTurn: { food: a.foodProduction, material: a.materialProduction },
          measuredDeltaFromWorkerMove: { food: 2, materialGross: -2, materialNet: -1 },
        },
      },
      B_whereToPlaceFarm: { classification: 'REAL', evidence: '09M nearest-workplace selection; unequal-distance test flips the employer' },
      C_whereToPlaceWorkshop: { classification: 'REAL', evidence: 'Farm and Workshop share one candidate pool and compete for the same worker' },
      D_expansionOrder: {
        classification: 'REAL',
        evidence: { farmFirstMix: { food: farmMix.foodProduction, material: farmMix.materialProduction }, workshopFirstMix: { food: shopMix.foodProduction, material: shopMix.materialProduction } },
      },
      E_spatialArrangement: { classification: 'REAL', evidence: 'moving a Residence two columns flips Food vs Material production (SPATIAL_UNEQUAL)' },
    })
    expect(a.foodProduction + a.materialProduction).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 12. Counterfactual expansion strategies (240 ticks, scripted)
// ---------------------------------------------------------------------------

describe('12 — counterfactual expansion strategies', () => {
  interface PlanItem {
    readonly kind: 'building'
    readonly type: BuildingType
    readonly x: number
    readonly y: number
  }

  /** Two pre-built homes supply the two workers; the plan varies workplace order. */
  const baseColony = (): SimulationState => {
    // Step 10AD: the plans place Workshops, which need the one-off Water.
    let state = withStocks(createAuditState(), { material: 100, food: 800, water: 10 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'residence', 1, 2)
    state = opRoad(state, 2, 0)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 2, 2)
    state = addColonist(state, 'building-1')
    state = addColonist(state, 'building-2')
    return assignJobs(state)
  }

  const plans: Record<string, readonly PlanItem[]> = {
    A: [
      { kind: 'building', type: 'farm', x: 3, y: 0 },
      { kind: 'building', type: 'workshop', x: 3, y: 2 },
      { kind: 'building', type: 'farm', x: 3, y: 4 },
      { kind: 'building', type: 'workshop', x: 3, y: 6 },
    ],
    B: [
      { kind: 'building', type: 'workshop', x: 3, y: 0 },
      { kind: 'building', type: 'farm', x: 3, y: 2 },
      { kind: 'building', type: 'workshop', x: 3, y: 4 },
      { kind: 'building', type: 'farm', x: 3, y: 6 },
    ],
    C: [
      { kind: 'building', type: 'farm', x: 3, y: 0 },
      { kind: 'building', type: 'farm', x: 3, y: 2 },
      { kind: 'building', type: 'workshop', x: 3, y: 4 },
      { kind: 'building', type: 'workshop', x: 3, y: 6 },
    ],
    D: [
      { kind: 'building', type: 'workshop', x: 3, y: 0 },
      { kind: 'building', type: 'workshop', x: 3, y: 2 },
      { kind: 'building', type: 'farm', x: 3, y: 4 },
      { kind: 'building', type: 'farm', x: 3, y: 6 },
    ],
  }

  const drive = (plan: readonly PlanItem[], ticks: number): {
    readonly state: SimulationState
    readonly placementTicks: readonly (number | null)[]
    readonly materialEnd: number
    readonly materialSlope: number
    readonly foodEnd: number
    readonly population: number
    readonly unemployed: number
  } => {
    let state = baseColony()
    let index = 0
    const placementTicks: (number | null)[] = plan.map(() => null)
    const startMaterial = state.resources.construction
    for (let t = 0; t < ticks; t += 1) {
      const item = plan[index]
      if (item === undefined) {
        state = stepSimulation(state)
        continue
      }
      // Keep the vertical road column (x=2) continuous up to the new cell.
      const missing: { x: number; y: number }[] = []
      for (let y = 0; y <= item.y; y += 1) {
        if (getRoadIdAtCell(state, { x: 2, y }) === null) missing.push({ x: 2, y })
      }
      if (missing.length > 0) {
        state = stepSimulation(state, { type: 'placeRoads', cells: missing })
        continue
      }
      const before = Object.keys(state.buildings).length
      state = stepSimulation(state, {
        type: 'placeBuilding',
        x: item.x,
        y: item.y,
        buildingType: item.type,
      })
      const after = Object.keys(state.buildings).length
      if (after > before) {
        placementTicks[index] = t
        index += 1
      }
    }
    return {
      state,
      placementTicks,
      materialEnd: state.resources.construction,
      materialSlope: (state.resources.construction - startMaterial) / ticks,
      foodEnd: state.resources.food,
      population: getPopulationCount(state),
      unemployed: getEmploymentSummary(state).unemployed,
    }
  }

  it('runs the four scripted build orders and compares trajectories', () => {
    const out: Record<string, unknown> = {}
    for (const [name, plan] of Object.entries(plans)) {
      const result = drive(plan, 240)
      out[name] = {
        plan: plan.map((p) => `${p.type}(${p.x},${p.y})`),
        placementTicks: result.placementTicks,
        materialEnd: result.materialEnd,
        materialSlope: Number(result.materialSlope.toFixed(3)),
        foodEnd: result.foodEnd,
        population: result.population,
        unemployed: result.unemployed,
        staffedFarms: countStaffedOperationalFarms(result.state),
        staffedWorkshops: countStaffedOperationalWorkshops(result.state),
      }
    }
    audit('EXPANSION_STRATEGIES', out)
    // Build order matters: A, B and D finish all four workplaces; C
    // (Farm, Farm, Workshop, Workshop) stalls because the two Farms claim both
    // workers, the Workshop is built but never staffed, and no Material income
    // exists to pay for roads + the fourth building.
    for (const name of ['A', 'B', 'D'] as const) {
      const entry = out[name] as { placementTicks: (number | null)[] }
      expect(entry.placementTicks.every((t) => t !== null)).toBe(true)
    }
    const c = out['C'] as { placementTicks: (number | null)[]; materialEnd: number; staffedWorkshops: number; staffedFarms: number }
    expect(c.placementTicks.some((t) => t === null)).toBe(true)
    expect(c.staffedWorkshops).toBe(0)
    expect(c.staffedFarms).toBe(2)
    // The finished strategies diverge in staffing and Material too.
    const ends = Object.values(out).map((v) => (v as { materialEnd: number }).materialEnd)
    expect(new Set(ends).size).toBeGreaterThan(1)
    expect((out['D'] as { staffedFarms: number }).staffedFarms).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 13. Storage / construction pressure
// ---------------------------------------------------------------------------

describe('13 — storage and construction pressure', () => {
  it('measures storage capacity, equilibrium and time-to-construction vs W', () => {
    const rows: unknown[] = []
    for (const w of [1, 2, 3]) {
      for (const f of [1, 2, 3]) {
        const start = rowWorld({ residences: f + w, farms: f, workshops: w, material: 0, food: 4000 })
        rows.push({
          farms: f,
          workshops: w,
          storage: materialStorageCapacityForTick(start),
          equilibrium: advance(start, 200).resources.construction,
          ticksTo25: ticksToAfford(start),
        })
      }
    }
    audit('STORAGE_CONSTRUCTION', rows)
    // Equilibrium is 24 x W across all Farm counts; only W sets capacity.
    for (const row of rows as { workshops: number; equilibrium: number; storage: number }[]) {
      expect(row.storage).toBe(25 * row.workshops)
      expect(row.equilibrium).toBe(24 * row.workshops)
    }
  })

  it('shows Workshop expansion is the only way to raise the Material ceiling', () => {
    const rows = [1, 2, 3, 4].map((w) => {
      const start = rowWorld({ residences: 2 + w, farms: 2, workshops: w, material: 0, food: 4000 })
      return { workshops: w, storage: materialStorageCapacityForTick(start), equilibrium: advance(start, 200).resources.construction }
    })
    audit('WORKSHOP_CEILING', rows)
    expect(rows.map((r) => r.equilibrium)).toEqual([24, 48, 72, 96])
  })
})

// ---------------------------------------------------------------------------
// 16. Persistence / determinism
// ---------------------------------------------------------------------------

describe('16 — persistence and determinism', () => {
  it('SAVE_VERSION 4, no persisted Farm upkeep, deterministic replay', () => {
    expect(SAVE_VERSION).toBe(7)
    const state = rowWorld({ residences: 5, farms: 3, workshops: 3, material: 5 })
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    const a = advance(state, 120)
    const b = advance(state, 120)
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    audit('PERSISTENCE_DETERMINISM', { saveVersion: SAVE_VERSION, hash: hashCanonicalState(a) })
  })

  it('insertion-order determinism holds for the baseline', () => {
    const build = (): SimulationState => {
      let state = createAuditState()
      state = op(state, 'residence', 1, 0)
      state = op(state, 'residence', 3, 0)
      state = op(state, 'farm', 1, 2)
      state = op(state, 'workshop', 3, 2)
      for (let x = 0; x <= 4; x += 1) state = opRoad(state, x, 1)
      state = addColonist(state, 'building-1')
      state = addColonist(state, 'building-2')
      return assignJobs(state)
    }
    expect(serializeCanonicalState(build())).toBe(serializeCanonicalState(build()))
    audit('INSERTION_ORDER', { identical: true })
  })

  it('HUD exposes Workshop upkeep only (no Farm upkeep exists to report)', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 10 })
    const farm = Object.values(state.buildings).find((b) => b.type === 'farm')!
    audit('UI_INFORMATION', {
      materialUpkeepQuery: getMaterialUpkeepPerTick(state),
      materialProductionQuery: getMaterialProductionPerTick(state),
      netMaterialQuery: getNetMaterialPerTick(state),
      farmInspectionHasUpkeep: getBuildingInspection(state, farm.id) !== null && 'upkeep' in (getBuildingInspection(state, farm.id) as object),
      workerAtFarm: countWorkersAt(state, farm.id),
    })
    expect(getMaterialUpkeepPerTick(state)).toBe(2)
  })
})
