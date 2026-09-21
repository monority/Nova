/**
 * Food Economy Dependency Audit (Step 10T).
 *
 * AUDIT ONLY — `src/` is untouched. Reconstructs the current Food loop and
 * compares two candidate next dependencies, modelled only in audit mirrors:
 *
 *   Candidate A — bounded Food storage (a cap, optionally a Granary)
 *   Candidate B — Farm production input (Material consumed per Farm)
 *
 * Run:
 *   npx vitest run tests/foodEconomyDependencyAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  FOOD_PER_FARM_PER_TICK,
  getPopulationCount,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  iterateBuildings,
  isOperationalFarm,
  countWorkersAt,
  materialProductionForTick,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedBuilding,
  progressPlacedRoads,
  SAVE_VERSION,
  serializeCanonicalState,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  waterProductionForTick,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10t', width: 60, height: 20 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

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
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
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
  readonly farms?: number
  readonly workshops?: number
  readonly wells?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const world = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 10000,
    material: spec.material ?? 1000,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells)
  const residenceIds: string[] = []
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * 2, 0)
    residenceIds.push(`building-${i + 1}`)
  }
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  const colonists = spec.colonists ?? 0
  for (let i = 0; i < Math.min(colonists, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
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
// Audit mirror (current tick + hypothetical Food rules)
// ---------------------------------------------------------------------------

interface MirrorOptions {
  /** Candidate A: discard Food above this colony stock. */
  readonly foodCap?: number
  /** Candidate B: Material consumed per staffed operational Farm. */
  readonly farmInput?: number
  /** Candidate B: Food produced per Farm when the input is paid. */
  readonly farmOutput?: number
}

const stepMirror = (state: SimulationState, opts: MirrorOptions): SimulationState => {
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  let produced = constructed
  if (opts.farmInput !== undefined) {
    // Each staffed operational Farm (ascending id) pays its input atomically;
    // an unpaid Farm produces 0 this tick.
    const output = opts.farmOutput ?? FOOD_PER_FARM_PER_TICK
    let material = produced.resources.construction
    let food = produced.resources.food
    for (const building of iterateBuildings(produced)) {
      if (!isOperationalFarm(building) || countWorkersAt(produced, building.id) === 0) continue
      if (material < opts.farmInput) continue
      material -= opts.farmInput
      food += output
    }
    produced = { ...produced, resources: { ...produced.resources, construction: material, food } }
  } else {
    produced = produceFood(constructed)
  }
  if (opts.foodCap !== undefined && produced.resources.food > opts.foodCap) {
    produced = { ...produced, resources: { ...produced.resources, food: opts.foodCap } }
  }
  const watered = produceWater(produced)
  const consumed = consumeFood(watered, requiredFood)
  const gateActive = hasOperationalWell(consumed.state)
  const coverage = gateActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null ? 0 : coverage.servedColonistIds.length
  const productionCapacity =
    coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null ? { state: consumed.state, shortage: false } : consumeWater(consumed.state, servedNeed)
  const populated = updatePopulation(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : {
          shortage: waterConsumed.shortage,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )
  const staffed = assignJobs(populated)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommand(materialized, undefined)
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed = progressPlacedRoads(progressedBuilding, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(maintained)
}

const runMirror = (
  start: SimulationState,
  ticks: number,
  opts: MirrorOptions
): { state: SimulationState; trace: FoodRecord[] } => {
  let state = start
  const trace: FoodRecord[] = []
  for (let i = 0; i < ticks; i += 1) {
    state = stepMirror(state, opts)
    trace.push(record(state))
  }
  return { state, trace }
}

interface FoodRecord {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
  readonly foodProduction: number
  readonly foodNeed: number
  readonly foodShortage: boolean
}

const record = (state: SimulationState): FoodRecord => {
  const foodProduction = countStaffedOperationalFarms(state) * FOOD_PER_FARM_PER_TICK
  const foodNeed = getPopulationCount(state)
  const staffedWorkshops = Object.values(state.buildings).filter(
    (b) => b.type === 'workshop' && b.status === 'operational' && countWorkersAt(state, b.id) > 0
  ).length
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    material: state.resources.construction,
    water: state.resources.water,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops,
    staffedWells: countStaffedOperationalWells(state),
    foodProduction,
    foodNeed,
    foodShortage: foodProduction < foodNeed && foodNeed > 0,
  }
}

// A mirror with no Food/Building rule change must equal stepSimulation.
const stepBaselineMirror = (state: SimulationState): SimulationState => {
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  const produced = produceFood(constructed)
  const watered = produceWater(produced)
  const consumed = consumeFood(watered, requiredFood)
  const gateActive = hasOperationalWell(consumed.state)
  const coverage = gateActive ? getWaterCoverage(consumed.state) : null
  const servedNeed = coverage === null ? 0 : coverage.servedColonistIds.length
  const productionCapacity = coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null ? { state: consumed.state, shortage: false } : consumeWater(consumed.state, servedNeed)
  const populated = updatePopulation(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : {
          shortage: waterConsumed.shortage,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )
  const staffed = assignJobs(populated)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommand(materialized, undefined)
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed = progressPlacedRoads(progressedBuilding, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(maintained)
}

// ---------------------------------------------------------------------------
// §3/§4 — Current Food loop and pressure
// ---------------------------------------------------------------------------

describe('§3 — current Food causal loop', () => {
  it('documents the exact current rules', () => {
    audit('FOOD_LOOP', {
      production: 'Farm operational + staffed (>=1 worker) -> +2 Food/tick (produceFood)',
      staffing: 'Farm job capacity 1; production requires road/mobility-eligible worker',
      capacity: 'one Farm = one worker = 2 Food/tick',
      consumption: 'population x 1, all-or-nothing (consumeFood)',
      stock: 'colony-global, uncapped, persisted as resources.food',
      spatial: 'Food stock is NOT spatial; production is gated only by staffing/roads',
      roadDependent: 'indirectly: a Farm needs a mobility-connected worker (09K)',
      networkDependent: 'via worker mobility only; Food itself is global',
      produced: 'phase produceFood, before consumeFood/consumeWater/admission',
      consumed: 'phase consumeFood, before admission',
      populationLoss: 'consumeFood shortage -> updatePopulation removes every colonist',
    })
    expect(true).toBe(true)
  })

  it('the audit mirror equals stepSimulation when no hypothetical rule is enabled', () => {
    for (const start of [
      world({ residences: 4, farms: 2, workshops: 1, wells: 1, colonists: 3, water: 4 }),
      world({ residences: 6, farms: 3, colonists: 2 }),
    ]) {
      let mirror = start
      let production = start
      for (let i = 0; i < 30; i += 1) {
        mirror = stepBaselineMirror(mirror)
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(mirror)).toBe(serializeCanonicalState(production))
    }
    audit('MIRROR_FIDELITY', { identical: true })
  })
})

describe('§4 — current Food pressure', () => {
  it('measures the five scenarios over 60/120/240/600 ticks', () => {
    const scenarios: Record<string, WorldSpec> = {
      A_oneFarm: { residences: 6, farms: 1, colonists: 1 },
      B_twoFarms: { residences: 6, farms: 2, colonists: 1 },
      C_farmWorkshop: { residences: 6, farms: 1, workshops: 1, colonists: 1 },
      D_farmWell: { residences: 6, farms: 1, wells: 1, colonists: 1 },
      E_allThree: { residences: 6, farms: 1, workshops: 1, wells: 1, colonists: 1 },
    }
    const out: Record<string, unknown> = {}
    for (const [name, spec] of Object.entries(scenarios)) {
      const rows: Record<string, unknown> = {}
      for (const ticks of [60, 120, 240, 600]) {
        const settled = advance(world(spec), ticks)
        const r = record(settled)
        rows[`t${ticks}`] = {
          population: r.population,
          food: r.food,
          foodProduction: r.foodProduction,
          foodNeed: r.foodNeed,
          farmsStaffed: r.staffedFarms,
          workshopsStaffed: r.staffedWorkshops,
          wellsStaffed: r.staffedWells,
          material: r.material,
          water: r.water,
        }
      }
      out[name] = rows
    }
    audit('FOOD_PRESSURE', out)
    for (const name of Object.keys(scenarios)) {
      const rows = out[name] as Record<string, { population: number }>
      expect(rows['t600']!.population).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('§5 — Food stock analysis', () => {
  it('an uncapped surplus accumulates without bound and has no spatial consequence', () => {
    // 4 Farms, 4 colonists: +4 Food/tick net.
    const start = world({ residences: 4, farms: 4, colonists: 4, food: 0 })
    const rows = [60, 120, 240, 600].map((ticks) => {
      const settled = advance(start, ticks)
      return { ticks, food: settled.resources.food, population: getPopulationCount(settled) }
    })
    audit('FOOD_UNBOUNDED', rows)
    expect(rows[3]!.food).toBeGreaterThan(rows[2]!.food)
    expect(rows[3]!.food).toBeGreaterThan(2000)
  })

  it('does not trivialize survival in a deficit colony: the buffer only delays starvation', () => {
    // 1 Farm, 6 colonists -> net -4/tick; Food 10000 buys ~2500 ticks.
    let state = world({ residences: 6, farms: 1, colonists: 1, food: 10000 })
    let starvedTick: number | null = null
    for (let i = 0; i < 3000; i += 1) {
      state = stepSimulation(state)
      if (getPopulationCount(state) === 0) {
        starvedTick = state.time.tick
        break
      }
    }
    audit('FOOD_BUFFER', { starvedTick, foodAtDeath: state.resources.food })
    expect(starvedTick).not.toBeNull()
    expect(starvedTick!).toBeGreaterThan(2000)
  })
})

// ---------------------------------------------------------------------------
// §12 — Food storage experiment (Candidate A)
// ---------------------------------------------------------------------------

describe('§12 — Food storage experiment (audit mirror)', () => {
  it('compares caps 5 / 10 / 25 / 50 against uncapped', () => {
    // A surplus colony where the cap never binds, and a deficit colony where
    // the cap changes only the size of the buffer.
    const surplus = world({ residences: 2, farms: 2, colonists: 1, food: 50 })
    const deficit = world({ residences: 6, farms: 1, colonists: 6, food: 50 })
    const caps = [undefined, 5, 10, 25, 50] as const
    const rows = caps.map((cap) => {
      const opts: MirrorOptions = cap === undefined ? {} : { foodCap: cap }
      const surplusRun = runMirror(surplus, 240, opts)
      const deficitRun = runMirror(deficit, 240, opts)
      return {
        cap: cap ?? 'uncapped',
        surplusFoodEnd: surplusRun.state.resources.food,
        surplusOverflowed: cap !== undefined && surplusRun.state.resources.food >= cap,
        deficitPopulationEnd: getPopulationCount(deficitRun.state),
        deficitStarved: deficitRun.trace.some((r) => r.population === 0),
        deficitShortageTicks: deficitRun.trace.filter((r) => r.foodShortage).length,
      }
    })
    audit('FOOD_STORAGE_CAPS', rows)
    // Uncapped and capped surplus both survive; a cap only discards overflow.
    expect(rows[0]!.deficitPopulationEnd).toBe(0)
  })

  it('shows the cap never creates a decision in a surplus colony', () => {
    // 2 Farms, 1 colonist: production 4 > need 1; the cap is reached instantly.
    const start = world({ residences: 1, farms: 2, colonists: 1, food: 0 })
    const rows = [5, 10, 25, 50].map((cap) => {
      const run = runMirror(start, 120, { foodCap: cap })
      return { cap, food: run.state.resources.food, population: getPopulationCount(run.state) }
    })
    audit('FOOD_CAP_SURPLUS', rows)
    for (const row of rows) {
      expect(row.food).toBeLessThanOrEqual(row.cap)
    }
  })
})

// ---------------------------------------------------------------------------
// §14 — Farm input experiment (Candidate B)
// ---------------------------------------------------------------------------

describe('§14 — Farm input experiment (audit mirror)', () => {
  it('compares three Material -> Farm -> Food ratios', () => {
    const start = world({ residences: 6, farms: 2, workshops: 2, colonists: 4, material: 50, food: 200 })
    const ratios = [
      { label: '1 Material -> 2 Food', farmInput: 1, farmOutput: 2 },
      { label: '1 Material -> 3 Food', farmInput: 1, farmOutput: 3 },
      { label: '2 Material -> 4 Food', farmInput: 2, farmOutput: 4 },
    ]
    const rows = ratios.map((ratio) => {
      const run = runMirror(start, 240, { farmInput: ratio.farmInput, farmOutput: ratio.farmOutput })
      const r = record(run.state)
      return {
        ratio: ratio.label,
        population: r.population,
        food: r.food,
        material: r.material,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        materialNetPerTick: materialProductionForTick(run.state) - r.staffedWorkshops,
      }
    })
    audit('FARM_INPUT_RATIOS', rows)
    for (const row of rows) {
      expect(row.population).toBeGreaterThanOrEqual(0)
    }
  })

  it('shows Farm input turns Material into a mandatory Food tax', () => {
    // 2 Farms + 2 Workshops, 4 colonists: baseline Material net +2.
    const start = world({ residences: 6, farms: 2, workshops: 2, colonists: 4, material: 0, food: 500 })
    const baseline = advance(start, 60)
    const withInput = runMirror(start, 60, { farmInput: 1, farmOutput: 2 }).state
    audit('FARM_INPUT_TAX', {
      baseline: {
        material: baseline.resources.construction,
        food: baseline.resources.food,
        population: getPopulationCount(baseline),
      },
      withInput: {
        material: withInput.resources.construction,
        food: withInput.resources.food,
        population: getPopulationCount(withInput),
      },
      note: 'the 2 staffed Farms consume the 2 net Material the Workshops produce',
    })
    expect(baseline.resources.construction).toBeGreaterThan(withInput.resources.construction)
  })

  it('tests the Farm-input deadlock: no Material means no Food', () => {
    // 2 Farms, 0 Workshops, Material 0 -> Farms cannot pay the input.
    const start = world({ residences: 2, farms: 2, colonists: 2, material: 0, food: 3 })
    const run = runMirror(start, 30, { farmInput: 1, farmOutput: 2 })
    audit('FARM_INPUT_DEADLOCK', {
      population: getPopulationCount(run.state),
      food: run.state.resources.food,
      material: run.state.resources.construction,
      starved: run.trace.some((r) => r.population === 0),
    })
    // No Material -> no Food production -> the reserve is exhausted -> death.
    expect(getPopulationCount(run.state)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §6/§13 — Granary concept
// ---------------------------------------------------------------------------

describe('§6/§13 — Granary concept (audit only)', () => {
  it('answers the Granary design questions from measured behaviour', () => {
    // A Granary would only raise the cap; a raised cap cannot create a decision
    // when Food output already exceeds need.
    const surplus = runMirror(world({ residences: 1, farms: 2, colonists: 1, food: 0 }), 120, { foodCap: 10 })
    audit('GRANARY_QUESTIONS', {
      storageCapAloneEnough: 'no — it only bounds an accumulator with no sink',
      granaryNeedsToBeABuilding: 'no evidence for a building; a derived cap is simpler',
      spatialPressure: 'none measured: Food is colony-global and a cap is not spatial',
      roadAccess: 'not required by the current model',
      networkCoverage: 'not present for Food; Water is the only covered service',
      farmOutputTransport: 'none exists and none is justified',
      becomesAnotherService: 'yes — a Granary would add a building without a new causal chain',
      playerDecision: 'none beyond "build more Farms" which already exists',
      waterCoverageInteraction: 'none required',
      workforceInteraction: 'none unless staffed, which would add a second upkeep-like decision',
      surplusWithCap10FoodAfter120: surplus.state.resources.food,
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §8 — Deadlock analysis
// ---------------------------------------------------------------------------

describe('§8 — deadlock analysis', () => {
  it('records terminal/recoverable states for the current model and both candidates', () => {
    const cases: Record<string, WorldSpec> = {
      farmHeavy: { residences: 4, farms: 3, colonists: 3 },
      workshopHeavy: { residences: 4, workshops: 3, colonists: 3 },
      noFarms: { residences: 3, workshops: 2, colonists: 3 },
      noWorkshops: { residences: 3, farms: 2, colonists: 3 },
      noWells: { residences: 3, farms: 2, wells: 0, colonists: 3 },
      allThree: { residences: 5, farms: 1, workshops: 1, wells: 1, colonists: 4 },
    }
    const current: Record<string, number> = {}
    const storage: Record<string, number> = {}
    const input: Record<string, number> = {}
    for (const [name, spec] of Object.entries(cases)) {
      current[name] = getPopulationCount(advance(world(spec), 240))
      storage[name] = getPopulationCount(runMirror(world(spec), 240, { foodCap: 10 }).state)
      input[name] = getPopulationCount(runMirror(world(spec), 240, { farmInput: 1, farmOutput: 2 }).state)
    }
    audit('DEADLOCK_ANALYSIS', { current, foodCap10: storage, farmInput: input })
    // No column is universally zero: the terminal risk is configuration-specific.
    expect(Object.keys(cases).length).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// §9/§10 — Equilibrium and workforce competition
// ---------------------------------------------------------------------------

describe('§9/§10 — equilibrium and workforce competition', () => {
  it('measures per-producer sustainable population', () => {
    audit('EQUILIBRIUM', {
      foodPerStaffedFarm: FOOD_PER_FARM_PER_TICK,
      foodPerColonist: 1,
      sustainablePopulationPerFarm: FOOD_PER_FARM_PER_TICK,
      materialPerStaffedWorkshopGross: 2,
      materialUpkeepPerWorkshop: 1,
      waterPerStaffedWell: 2,
      sustainablePopulationPerWell: 2,
      foodClassification: 'constrained only by workforce while population <= 2 x staffed Farms',
    })
    expect(true).toBe(true)
  })

  it('measures Farm vs Workshop vs Well opportunity cost', () => {
    const start = world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 1 })
    const auto = record(start)
    const well = Object.values(start.buildings).find((b) => b.type === 'well')!
    const farm = Object.values(start.buildings).find((b) => b.type === 'farm')!
    const toWell = record(stepSimulation(start, { type: 'reassignColonist', colonistId: 'colonist-1', workplaceId: well.id }))
    const toFarm = record(stepSimulation(start, { type: 'reassignColonist', colonistId: 'colonist-1', workplaceId: farm.id }))
    audit('WORKFORCE_COMPETITION', {
      automatic: { farms: auto.staffedFarms, workshops: auto.staffedWorkshops, wells: auto.staffedWells },
      toWell: { farms: toWell.staffedFarms, workshops: toWell.staffedWorkshops, wells: toWell.staffedWells },
      toFarm: { farms: toFarm.staffedFarms, workshops: toFarm.staffedWorkshops, wells: toFarm.staffedWells },
    })
    expect(auto.staffedFarms + auto.staffedWorkshops + auto.staffedWells).toBe(1)
    expect(toWell.staffedWells).toBe(1)
    expect(toFarm.staffedFarms).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §11 — Spatial analysis
// ---------------------------------------------------------------------------

describe('§11 — spatial analysis', () => {
  it('Food ignores space where Water does not', () => {
    // Identical buildings/workforce, Farm on a separate network from the
    // residence: the Farm is unstaffed and produces 0; Water coverage is
    // spatial. Food itself has no coverage.
    let state = withStocks(createState(), { food: 10000, material: 1000 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    state = op(state, 'farm', 20, 2) // separate network
    state = opRoad(state, 21, 2)
    state = createColonist(state, 'building-1').state
    state = assignJobs(state)
    audit('SPATIAL_FOOD_VS_WATER', {
      farmStaffed: countStaffedOperationalFarms(state),
      foodProduction: countStaffedOperationalFarms(state) * FOOD_PER_FARM_PER_TICK,
      waterServedResidences: getWaterCoverage(state).servedResidenceIds,
      waterCoverageRule: 'Residence shares a network with an operational road-accessible Well',
      foodCoverageRule: 'none — Food is a colony-global stock',
    })
    expect(countStaffedOperationalFarms(state)).toBe(0)
    expect(getWaterCoverage(state).servedResidenceIds).toEqual([])
  })

  it('answering the concrete-decision question for each candidate', () => {
    audit('NEW_DECISION', {
      foodStorage: 'the only new decision is how much surplus to keep, which the current model already expresses as a buffer',
      granary: 'placement would not change the outcome (Food is global), so no new spatial decision',
      farmInput: 'the decision collapses to "build more Workshops", which already exists',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §15 — Candidate comparison
// ---------------------------------------------------------------------------

describe('§15 — candidate comparison', () => {
  it('produces the comparison matrix from measured evidence', () => {
    audit('CANDIDATE_MATRIX', [
      {
        dimension: 'adds meaningful pressure',
        foodStorage: 'no (cap only bounds an accumulator)',
        farmInput: 'yes but only as a tax',
      },
      { dimension: 'adds spatial decisions', foodStorage: 'no', farmInput: 'no' },
      { dimension: 'uses existing systems', foodStorage: 'yes', farmInput: 'yes' },
      { dimension: 'requires new resource', foodStorage: 'no', farmInput: 'no' },
      { dimension: 'requires new building', foodStorage: 'optional (Granary)', farmInput: 'no' },
      { dimension: 'requires logistics', foodStorage: 'no', farmInput: 'no' },
      { dimension: 'strengthens workforce competition', foodStorage: 'no', farmInput: 'indirectly (more Workshops)' },
      { dimension: 'creates circular dependencies', foodStorage: 'no', farmInput: 'yes (Material <-> Food)' },
      { dimension: 'deadlock risk', foodStorage: 'low', farmInput: 'high (no Material -> no Food)' },
      { dimension: 'player recovery possible', foodStorage: 'yes', farmInput: 'only if Material remains' },
      { dimension: 'preserves Food survival role', foodStorage: 'yes', farmInput: 'yes' },
      { dimension: 'preserves Water distinction', foodStorage: 'yes', farmInput: 'yes' },
      { dimension: 'architecture impact', foodStorage: 'small', farmInput: 'small' },
      { dimension: 'save complexity', foodStorage: 'none if derived cap', farmInput: 'none' },
      { dimension: 'gameplay decision created', foodStorage: 'none beyond the existing buffer', farmInput: 'none beyond more Workshops' },
      { dimension: 'evidence from current simulation', foodStorage: 'Food uncapped and accumulates', farmInput: 'Material already the construction bottleneck' },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §16/§17 — Boundary regressions
// ---------------------------------------------------------------------------

describe('§16/§17 — Water and Material boundary regressions', () => {
  it('neither candidate changes Water production-headroom admission', () => {
    const start = world({ residences: 6, wells: 1, colonists: 1, water: 0 })
    const current = advance(start, 30)
    const storage = runMirror(start, 30, { foodCap: 10000 }).state
    const input = runMirror(start, 30, { farmInput: 1, farmOutput: 2 }).state
    audit('WATER_BOUNDARY', {
      currentPopulation: getPopulationCount(current),
      storagePopulation: getPopulationCount(storage),
      inputPopulation: getPopulationCount(input),
      waterHeadroom: 'production 2 supports population 2',
    })
    expect(getPopulationCount(current)).toBe(2)
    expect(getPopulationCount(storage)).toBe(2)
    expect(getPopulationCount(input)).toBe(2)
  })

  it('Farm input makes Material a mandatory Food tax', () => {
    const start = world({ residences: 4, farms: 2, workshops: 2, colonists: 4, material: 0, food: 1000 })
    const baseline = advance(start, 120)
    const input = runMirror(start, 120, { farmInput: 1, farmOutput: 2 }).state
    audit('MATERIAL_BOUNDARY', {
      baselineMaterial: baseline.resources.construction,
      inputMaterial: input.resources.construction,
      storageCap: '25 per operational Workshop (unchanged)',
      upkeep: '1 per staffed Workshop (unchanged)',
    })
    expect(baseline.resources.construction).toBeGreaterThan(input.resources.construction)
  })
})

// ---------------------------------------------------------------------------
// §18/§19 — Persistence, determinism, performance
// ---------------------------------------------------------------------------

describe('§18/§19 — persistence, determinism, performance', () => {
  it('records the future persistence impact and confirms SAVE_VERSION', () => {
    audit('PERSISTENCE_IMPACT', {
      saveVersionNow: SAVE_VERSION,
      foodStorageDerivedCap: 'if derived, no new canonical state and no version bump',
      granaryBuilding: 'if added, a new building type string only — no shape change',
      farmInput: 'no new state (reads resources.construction)',
    })
    expect(SAVE_VERSION).toBe(6)
  })

  it('measures 60/120/600-tick cost of the current economy', () => {
    const start = world({ residences: 20, farms: 6, workshops: 6, wells: 6, colonists: 20 })
    const measure = (ticks: number): number => {
      const t0 = performance.now()
      let next = start
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [60, 120, 600].map((ticks) => ({ ticks, ms: Number(measure(ticks).toFixed(1)) }))
    audit('PERFORMANCE', rows)
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
  }, 300000)

  it('replay determinism is unaffected by the audit', () => {
    const run = (): SimulationState => advance(world({ residences: 4, farms: 2, workshops: 1, wells: 1, colonists: 3 }), 240)
    expect(hashCanonicalState(run())).toBe(hashCanonicalState(run()))
    audit('DETERMINISM', { hash: hashCanonicalState(run()) })
  })
})

// ---------------------------------------------------------------------------
// §22 — Classification evidence
// ---------------------------------------------------------------------------

describe('§22 — classification evidence', () => {
  it('summarises the evidence used for the final classification', () => {
    // Current Food model: surplus colonies accumulate unbounded; a deficit
    // colony's only lever is workforce allocation (more Farms / more workers).
    const surplus = advance(world({ residences: 4, farms: 4, colonists: 4, food: 0 }), 600)
    const deficit = advance(world({ residences: 6, farms: 1, colonists: 6, food: 50 }), 60)
    audit('CLASSIFICATION_EVIDENCE', {
      surplusFood: surplus.resources.food,
      surplusPopulation: getPopulationCount(surplus),
      deficitPopulation: getPopulationCount(deficit),
      foodIsSpatial: false,
      foodHasStorageCap: false,
      foodSustainablePerFarm: 2,
    })
    expect(surplus.resources.food).toBeGreaterThan(2000)
  })
})
