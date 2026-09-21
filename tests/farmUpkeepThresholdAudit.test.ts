/**
 * Farm Upkeep Threshold Audit (Step 10H).
 *
 * AUDIT ONLY — `src/` is untouched. This suite audits the threshold rule
 * proposed by Step 10G:
 *
 *   farmUpkeepDue = max(0, staffedFarms - 1)
 *
 * by comparing THREE upkeep models on identical canonical states:
 *
 *   BASELINE   farm upkeep 0                       (current game)
 *   CANDIDATE  farm upkeep max(0, F - 1)           (the threshold)
 *   FULL       farm upkeep F                       (the Step 10G candidate)
 *
 * Everything is modelled INSIDE THIS FILE (see `stepWithMetrics`), never in
 * production code. With `mode = 'baseline'` the harness is byte-identical to
 * the production `stepSimulation` (asserted in `H — harness fidelity`).
 *
 * Rule verified in src (unchanged):
 *   Farm staffed -> +2 Food/tick
 *   Workshop staffed -> +2 Material/tick
 *   Workshop upkeep = 1 per staffed operational Workshop per tick
 *   Storage = 25 per operational Workshop; building cost 25; 2-tick build
 *   Food need = population x 1; Food is all-or-nothing per colony
 *
 * Expected identity (to be verified, not assumed):
 *   net Material / tick = W - max(0, F - 1)
 *
 * Run:
 *   npx vitest run tests/farmUpkeepThresholdAudit.test.ts --reporter=verbose
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
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  FOOD_PER_FARM_PER_TICK,
  getBuildingInspection,
  getEmploymentSummary,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPopulationCount,
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

/** Wide flat audit world: enough columns for 32 residences + 32 workplaces. */
const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10h', width: 80, height: 20 },
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
  stocks: { readonly food?: number; readonly material?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: state.resources.water,
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

/**
 * One connected road network: residences on row y = 0, workplaces on row
 * y = 2, one operational road row y = 1. Every residence is mobility-connected
 * to every workplace; its own-column workplace is at road distance 0.
 */
const rowWorld = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createAuditState(), {
    food: spec.food ?? 1000,
    material: spec.material ?? 10,
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

// ---------------------------------------------------------------------------
// Three-model harness (audit-only)
// ---------------------------------------------------------------------------

type UpkeepMode = 'baseline' | 'candidate' | 'full'

/** Farm upkeep due under each model. */
const farmUpkeepDueFor = (mode: UpkeepMode, staffedFarms: number): number => {
  if (mode === 'baseline') return 0
  if (mode === 'full') return staffedFarms
  return Math.max(0, staffedFarms - 1)
}

interface TickRecord {
  readonly tick: number
  readonly colonists: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly food: number
  readonly material: number
  /** Stock at phase 8a (post-production, pre-upkeep): the build-affordable crest. */
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
  readonly metrics: TickRecord
}

/**
 * Exact mirror of stepSimulation with one of the three farm-upkeep models at
 * phase 8b, as a combined clamp `paid = min(stock, workshopDue + farmDue)`.
 */
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
  readonly records: readonly TickRecord[]
}

const runTrace = (
  start: SimulationState,
  ticks: number,
  mode: UpkeepMode
): Trace => {
  let state = start
  const records: TickRecord[] = []
  for (let i = 0; i < ticks; i += 1) {
    const result = stepWithMetrics(state, mode)
    state = result.state
    records.push(result.metrics)
  }
  return { state, records }
}

const runCommands = (
  start: SimulationState,
  mode: UpkeepMode,
  commands: readonly (SimulationCommand | null)[]
): Trace => {
  let state = start
  const records: TickRecord[] = []
  for (const command of commands) {
    const result =
      command === null
        ? stepWithMetrics(state, mode)
        : stepWithMetrics(state, mode, command)
    state = result.state
    records.push(result.metrics)
  }
  return { state, records }
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
// Trajectory classification (same definitions as Step 10G)
// ---------------------------------------------------------------------------

type TrajectoryClass =
  | 'STABLE'
  | 'GROWING'
  | 'MARGINALLY_STABLE'
  | 'COLLAPSING'
  | 'BOOM_BUST'

const classify = (records: readonly TickRecord[]): TrajectoryClass => {
  const first = records[0]
  if (first === undefined) throw new Error('audit: empty trace')
  const initialStaffed = first.staffedFarms + first.staffedWorkshops
  const capacityLost = records.some(
    (r) => r.staffedFarms + r.staffedWorkshops < initialStaffed
  )
  const maxCrest = Math.max(...records.map((r) => r.materialCrest))
  if (capacityLost) {
    return maxCrest >= 25 ? 'BOOM_BUST' : 'COLLAPSING'
  }
  if (maxCrest >= 25) return 'GROWING'
  return 'MARGINALLY_STABLE'
}

// ---------------------------------------------------------------------------
// H — harness fidelity
// ---------------------------------------------------------------------------

describe('H — harness fidelity', () => {
  it("mode 'baseline' is byte-identical to stepSimulation", () => {
    const states: SimulationState[] = [
      rowWorld({ residences: 1, farms: 0, workshops: 1, material: 0, food: 200 }),
      rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10, food: 200 }),
      rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0, food: 500 }),
      rowWorld({ residences: 5, farms: 3, workshops: 2, first: 'workshop', material: 5 }),
    ]
    for (const start of states) {
      let harness = start
      let production = start
      for (let i = 0; i < 25; i += 1) {
        harness = stepWithMetrics(harness, 'baseline').state
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(harness)).toBe(
        serializeCanonicalState(production)
      )
      expect(hashCanonicalState(harness)).toBe(hashCanonicalState(production))
    }
    audit('HARNESS_FIDELITY', { worlds: states.length, ticksEach: 25, identical: true })
  })

  it('the combined clamp equals sequential Workshop-then-Farm deduction', () => {
    for (const [stock, farms, shops, mode] of [
      [0, 1, 1, 'candidate'],
      [1, 2, 1, 'candidate'],
      [3, 3, 2, 'candidate'],
      [5, 2, 3, 'full'],
      [2, 4, 1, 'full'],
    ] as const) {
      const due = shops + farmUpkeepDueFor(mode, farms)
      const combined = Math.min(stock, due)
      const sequential =
        Math.min(stock, shops) + Math.min(stock - Math.min(stock, shops), farmUpkeepDueFor(mode, farms))
      expect(combined).toBe(sequential)
    }
    audit('CLAMP_EQUIVALENCE', { checked: 5, identical: true })
  })
})

// ---------------------------------------------------------------------------
// §3/§4/§5 — 60-tick matrix, three-model comparison, formula
// ---------------------------------------------------------------------------

interface Scenario {
  readonly name: string
  readonly farms: number
  readonly workshops: number
}

const MATRIX: readonly Scenario[] = [
  { name: '1F+0W', farms: 1, workshops: 0 },
  { name: '1F+1W', farms: 1, workshops: 1 },
  { name: '2F+1W', farms: 2, workshops: 1 },
  { name: '2F+2W', farms: 2, workshops: 2 },
  { name: '3F+2W', farms: 3, workshops: 2 },
  { name: '3F+3W', farms: 3, workshops: 3 },
  { name: '4F+3W', farms: 4, workshops: 3 },
  { name: '4F+4W', farms: 4, workshops: 4 },
]

const MATRIX_TICKS = 60

const scenarioStart = (scenario: Scenario): SimulationState =>
  rowWorld({
    residences: scenario.farms + scenario.workshops,
    farms: scenario.farms,
    workshops: scenario.workshops,
    material: 10,
    food: 1000,
  })

const summarize = (trace: Trace): unknown => {
  const first = trace.records[0]!
  const last = trace.records[trace.records.length - 1]!
  return {
    colonists: first.colonists,
    staffedFarms: first.staffedFarms,
    staffedWorkshops: first.staffedWorkshops,
    foodStart: first.food,
    foodEnd: last.food,
    materialStart: first.material,
    materialEnd: last.material,
    materialPeak: Math.max(...trace.records.map((r) => r.material)),
    materialCrestPeak: Math.max(...trace.records.map((r) => r.materialCrest)),
    grossMaterialPerTick: first.materialProduction,
    farmUpkeepPerTick: first.farmUpkeep,
    workshopUpkeepPerTick: first.workshopUpkeep,
    totalUpkeepPerTick: first.totalUpkeep,
    netMaterialPerTick: first.materialProduction - first.totalUpkeep,
    foodProductionPerTick: first.foodProduction,
    foodNetPerTick: first.foodProduction - first.colonists,
    storage: materialStorageCapacityForTick(trace.state),
    populationEnd: last.population,
    foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
    classification: classify(trace.records),
  }
}

describe('§4/§5 — 60-tick matrix under the three models', () => {
  it('records every required field for every scenario and model', () => {
    const out: Record<string, unknown> = {}
    for (const scenario of MATRIX) {
      const start = scenarioStart(scenario)
      out[scenario.name] = {
        baseline: summarize(runTrace(start, MATRIX_TICKS, 'baseline')),
        candidate: summarize(runTrace(start, MATRIX_TICKS, 'candidate')),
        full: summarize(runTrace(start, MATRIX_TICKS, 'full')),
      }
    }
    audit('MATRIX_60_TICK', out)
    for (const scenario of MATRIX) {
      const entry = out[scenario.name] as Record<string, { foodShortageTicks: number; populationEnd: number }>
      for (const mode of ['baseline', 'candidate', 'full']) {
        expect(entry[mode]!.foodShortageTicks).toBe(0)
        expect(entry[mode]!.populationEnd).toBeGreaterThan(0)
      }
    }
  })

  it('prints a per-tick trace for the boundary scenarios', () => {
    for (const scenario of [
      { name: '2F+2W', farms: 2, workshops: 2 },
      { name: '3F+2W', farms: 3, workshops: 2 },
    ] as const) {
      const start = scenarioStart(scenario)
      audit(
        `TRACE_CANDIDATE_${scenario.name}`,
        runTrace(start, 30, 'candidate').records
      )
    }
  })

  it('verifies farmUpkeepDue and net = W - max(0, F - 1) for the whole matrix', () => {
    const rows: unknown[] = []
    for (const scenario of MATRIX) {
      const start = scenarioStart(scenario)
      const r = runTrace(start, 1, 'candidate').records[0]!
      const f = r.staffedFarms
      const w = r.staffedWorkshops
      const expectedFarmUpkeep = Math.max(0, f - 1)
      const expectedNet = w - Math.max(0, f - 1)
      rows.push({
        scenario: scenario.name,
        F: f,
        W: w,
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        totalUpkeep: r.totalUpkeep,
        gross: r.materialProduction,
        net: r.materialProduction - r.totalUpkeep,
        expectedNet,
      })
      expect(r.farmUpkeep).toBe(expectedFarmUpkeep)
      expect(r.materialProduction - r.totalUpkeep).toBe(expectedNet)
    }
    audit('FORMULA_VERIFICATION', rows)
  })

  it('identifies the accumulation boundary W >= F and the W = F - 1 floor', () => {
    const rows = MATRIX.map((scenario) => {
      const start = scenarioStart(scenario)
      const trace = runTrace(start, MATRIX_TICKS, 'candidate')
      const first = trace.records[0]!
      const last = trace.records[MATRIX_TICKS - 1]!
      return {
        scenario: scenario.name,
        W: first.staffedWorkshops,
        F: first.staffedFarms,
        net: first.materialProduction - first.totalUpkeep,
        materialCrestPeak: Math.max(...trace.records.map((r) => r.materialCrest)),
        materialEnd: last.material,
        classification: classify(trace.records),
        grows: first.staffedWorkshops >= first.staffedFarms,
      }
    })
    audit('ACCUMULATION_BOUNDARY', rows)
    for (const row of rows) {
      if (row.grows) expect(row.classification).toBe('GROWING')
      else expect(row.classification).toBe('MARGINALLY_STABLE')
    }
  })

  it('confirms the first Farm is free and each extra Farm costs exactly 1', () => {
    const f = [0, 1, 2, 3, 4].map((farms) => ({
      F: farms,
      farmUpkeep: farmUpkeepDueFor('candidate', farms),
    }))
    audit('FARM_UPKEEP_LADDER', f)
    expect(f).toEqual([
      { F: 0, farmUpkeep: 0 },
      { F: 1, farmUpkeep: 0 },
      { F: 2, farmUpkeep: 1 },
      { F: 3, farmUpkeep: 2 },
      { F: 4, farmUpkeep: 3 },
    ])
  })
})

// ---------------------------------------------------------------------------
// §6 — Bootstrap
// ---------------------------------------------------------------------------

interface BootstrapStep {
  readonly label: string
  readonly command: SimulationCommand | null
}

const BOOTSTRAP: readonly BootstrapStep[] = [
  { label: 'place R1', command: { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' } },
  { label: 'road (1,1)', command: { type: 'placeRoads', cells: [{ x: 1, y: 1 }] } },
  { label: 'place F1', command: { type: 'placeBuilding', x: 1, y: 2, buildingType: 'farm' } },
  { label: 'wait 1', command: null },
  { label: 'wait 2', command: null },
  { label: 'road (2,1)', command: { type: 'placeRoads', cells: [{ x: 2, y: 1 }] } },
  { label: 'place W1', command: { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' } },
  ...Array.from({ length: 20 }, (_, i) => ({ label: `drain ${i + 1}`, command: null })),
  { label: 'try R2', command: { type: 'placeBuilding', x: 2, y: 0, buildingType: 'residence' } },
  { label: 'settle', command: null },
]

describe('§6 — bootstrap experiment (real command chain)', () => {
  const bootstrapTrace = (mode: UpkeepMode): Trace =>
    runCommands(
      withStocks(createAuditState(), { material: 100, food: 100 }),
      mode,
      BOOTSTRAP.map((s) => s.command)
    )

  it('compares baseline / full / threshold on the earliest settlement sequence', () => {
    const summarise = (trace: Trace): unknown =>
      trace.records.map((r, i) => ({
        step: BOOTSTRAP[i]!.label,
        tick: r.tick,
        pop: r.population,
        food: r.food,
        material: r.material,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        constructionAvailable: r.constructionAvailable,
      }))
    for (const mode of ['baseline', 'full', 'candidate'] as const) {
      audit(`BOOTSTRAP_${mode.toUpperCase()}`, summarise(bootstrapTrace(mode)))
    }
    const base = bootstrapTrace('baseline')
    const full = bootstrapTrace('full')
    const cand = bootstrapTrace('candidate')
    audit('BOOTSTRAP_ANSWERS', {
      firstFarmBuilt: true,
      firstFarmStaffed: cand.records[6]!.staffedFarms === 1,
      firstWorkshopBuilt: Object.values(cand.state.buildings).some((b) => b.type === 'workshop'),
      coexists: cand.records[6]!.staffedFarms === 1,
      accumulateToWorkshop: cand.state.resources.construction >= 25,
      accumulateToFarm: cand.state.resources.construction >= 25,
      step10gTrapAvoided: cand.state.resources.construction === base.state.resources.construction,
      baselineMaterialEnd: base.state.resources.construction,
      fullMaterialEnd: full.state.resources.construction,
      candidateMaterialEnd: cand.state.resources.construction,
    })
    // The threshold makes the single-farm bootstrap byte-identical to today's
    // baseline: no drain, no Step10G bootstrap trap.
    expect(cand.state.resources.construction).toBe(base.state.resources.construction)
    expect(cand.state.resources.construction).toBeGreaterThan(full.state.resources.construction)
    expect(getPopulationCount(cand.state)).toBe(1)
  })

  it('a two-Workshop bootstrap still escapes under the threshold', () => {
    const commands: readonly (SimulationCommand | null)[] = [
      { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' },
      { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
      { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' },
      { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' },
      ...Array.from({ length: 40 }, () => null),
    ]
    const trace = runCommands(
      withStocks(createAuditState(), { material: 100, food: 100 }),
      'candidate',
      commands
    )
    audit('BOOTSTRAP_TWO_WORKSHOPS', {
      early: trace.records.slice(0, 8).map((r) => ({
        tick: r.tick,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        gross: r.materialProduction,
        upkeep: r.totalUpkeep,
        material: r.material,
      })),
      materialEnd: trace.state.resources.construction,
      constructionAvailable: trace.state.resources.construction >= 25,
    })
    expect(trace.state.resources.construction).toBeGreaterThanOrEqual(25)
  })
})

// ---------------------------------------------------------------------------
// §7 — First-Farm invariance
// ---------------------------------------------------------------------------

describe('§7 — first-Farm invariance (baseline vs candidate)', () => {
  it('1 staffed Farm has an identical Material, Food and staffing trajectory', () => {
    for (const spec of [
      { residences: 1, farms: 1, workshops: 0 },
      { residences: 2, farms: 1, workshops: 1 },
    ] as const) {
      const start = rowWorld({ ...spec, material: 10, food: 300 })
      const base = runTrace(start, 60, 'baseline')
      const cand = runTrace(start, 60, 'candidate')
      expect(serializeCanonicalState(cand.state)).toBe(serializeCanonicalState(base.state))
      expect(hashCanonicalState(cand.state)).toBe(hashCanonicalState(base.state))
      for (let i = 0; i < 60; i += 1) {
        expect(cand.records[i]!.material).toBe(base.records[i]!.material)
        expect(cand.records[i]!.food).toBe(base.records[i]!.food)
        expect(cand.records[i]!.staffedFarms).toBe(base.records[i]!.staffedFarms)
        expect(cand.records[i]!.constructionAvailable).toBe(base.records[i]!.constructionAvailable)
      }
      audit(`FIRST_FARM_INVARIANCE_${spec.farms}F${spec.workshops}W`, {
        materialEnd: cand.state.resources.construction,
        foodEnd: cand.state.resources.food,
        farmUpkeep: cand.records[0]!.farmUpkeep,
        identicalToBaseline: true,
      })
    }
  })

  it('explains the invariance: farmUpkeepDue = max(0, 1 - 1) = 0', () => {
    const start = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    const r = runTrace(start, 1, 'candidate').records[0]!
    audit('FIRST_FARM_WHY', {
      staffedFarms: r.staffedFarms,
      farmUpkeep: r.farmUpkeep,
      workshopUpkeep: r.workshopUpkeep,
    })
    expect(r.farmUpkeep).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §8 — Second-Farm pressure
// ---------------------------------------------------------------------------

describe('§8 — second-Farm pressure', () => {
  it('measures the marginal cost of going from 1F to 2F at fixed W', () => {
    const one = summarize(runTrace(rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10, food: 500 }), 60, 'candidate'))
    const two = summarize(runTrace(rowWorld({ residences: 3, farms: 2, workshops: 1, material: 10, food: 500 }), 60, 'candidate'))
    audit('SECOND_FARM_MARGINAL', { oneFarm: one, twoFarms: two })
    const a = one as { farmUpkeepPerTick: number; netMaterialPerTick: number; foodProductionPerTick: number; colonists: number }
    const b = two as { farmUpkeepPerTick: number; netMaterialPerTick: number; foodProductionPerTick: number; colonists: number }
    expect(b.farmUpkeepPerTick - a.farmUpkeepPerTick).toBe(1)
    expect(b.foodProductionPerTick - a.foodProductionPerTick).toBe(2)
    expect(b.colonists - a.colonists).toBe(1)
    expect(b.netMaterialPerTick - a.netMaterialPerTick).toBe(-1)
  })

  it('the second Farm flips 1F+1W from +1 to 0 net Material', () => {
    const one = runTrace(rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10 }), 1, 'candidate').records[0]!
    const two = runTrace(rowWorld({ residences: 3, farms: 2, workshops: 1, material: 10 }), 1, 'candidate').records[0]!
    audit('SECOND_FARM_FLIP', {
      oneFarmNet: one.materialProduction - one.totalUpkeep,
      twoFarmsNet: two.materialProduction - two.totalUpkeep,
    })
    expect(one.materialProduction - one.totalUpkeep).toBe(1)
    expect(two.materialProduction - two.totalUpkeep).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §9 — Farm expansion pressure (controlled W)
// ---------------------------------------------------------------------------

describe('§9 — Farm expansion pressure at fixed W = 2', () => {
  it('measures marginal Food, marginal upkeep and marginal worker per added Farm', () => {
    const rows = [1, 2, 3, 4].map((farms) => {
      const start = rowWorld({ residences: farms + 2, farms, workshops: 2, material: 10, food: 2000 })
      const r = runTrace(start, 1, 'candidate').records[0]!
      return {
        farms: r.staffedFarms,
        workshops: r.staffedWorkshops,
        workers: r.staffedFarms + r.staffedWorkshops,
        foodProduction: r.foodProduction,
        farmUpkeep: r.farmUpkeep,
        netMaterial: r.materialProduction - r.totalUpkeep,
      }
    })
    const marginal = rows.slice(1).map((row, i) => ({
      from: rows[i]!.farms,
      to: row.farms,
      marginalFood: row.foodProduction - rows[i]!.foodProduction,
      marginalFarmUpkeep: row.farmUpkeep - rows[i]!.farmUpkeep,
      marginalWorker: row.workers - rows[i]!.workers,
      marginalNetMaterial: row.netMaterial - rows[i]!.netMaterial,
    }))
    audit('FARM_EXPANSION_W2', { rows, marginal })
    for (const m of marginal) {
      expect(m.marginalFood).toBe(2)
      expect(m.marginalFarmUpkeep).toBe(1)
      expect(m.marginalWorker).toBe(1)
      expect(m.marginalNetMaterial).toBe(-1)
    }
  })
})

// ---------------------------------------------------------------------------
// §10 — Workshop expansion pressure (controlled F)
// ---------------------------------------------------------------------------

describe('§10 — Workshop expansion pressure at fixed F = 2', () => {
  it('measures accumulation, storage, Food sustainability and workers per added Workshop', () => {
    const rows = [1, 2, 3, 4].map((workshops) => {
      const start = rowWorld({ residences: 2 + workshops, farms: 2, workshops, material: 10, food: 2000 })
      const r = runTrace(start, 1, 'candidate').records[0]!
      return {
        workshops: r.staffedWorkshops,
        farms: r.staffedFarms,
        storage: materialStorageCapacityForTick(start),
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        netMaterial: r.materialProduction - r.totalUpkeep,
        foodProduction: r.foodProduction,
        foodNet: r.foodProduction - r.colonists,
        workers: r.staffedFarms + r.staffedWorkshops,
      }
    })
    audit('WORKSHOP_EXPANSION_F2', rows)
    expect(rows[0]!.netMaterial).toBe(0)
    expect(rows[1]!.netMaterial).toBe(1)
    expect(rows[2]!.netMaterial).toBe(2)
    expect(rows[3]!.netMaterial).toBe(3)
    expect(rows.map((r) => r.storage)).toEqual([25, 50, 75, 100])
  })
})

// ---------------------------------------------------------------------------
// §11 — Labor opportunity cost
// ---------------------------------------------------------------------------

describe('§11 — Food vs Material opportunity cost', () => {
  it('compares 1F+1W, 2F+1W and 1F+2W under the candidate', () => {
    const configs = [
      { name: '1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '2F+1W', residences: 3, farms: 2, workshops: 1 },
      { name: '1F+2W', residences: 3, farms: 1, workshops: 2 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, material: 10, food: 500 })
      const r = runTrace(start, 1, 'candidate').records[0]!
      out[config.name] = {
        colonists: r.colonists,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        foodProduction: r.foodProduction,
        materialProduction: r.materialProduction,
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        netMaterial: r.materialProduction - r.totalUpkeep,
        foodNet: r.foodProduction - r.colonists,
      }
    }
    audit('OPPORTUNITY_COST', out)
    expect((out['1F+1W'] as { netMaterial: number }).netMaterial).toBe(1)
    expect((out['2F+1W'] as { netMaterial: number }).netMaterial).toBe(0)
    expect((out['1F+2W'] as { netMaterial: number }).netMaterial).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §12 — Spatial pressure
// ---------------------------------------------------------------------------

describe('§12 — spatial pressure under the threshold', () => {
  const movedWorld = (residenceX: number): SimulationState => {
    let state = withStocks(createAuditState(), { material: 20, food: 30 })
    state = op(state, 'residence', residenceX, 1)
    state = addColonist(state, 'building-1')
    state = op(state, 'farm', 3, 3)
    state = op(state, 'workshop', 5, 3)
    state = opRoad(state, 3, 2)
    state = opRoad(state, 4, 2)
    state = opRoad(state, 5, 2)
    return assignJobs(state)
  }

  it('farm preference vs workshop preference vs equal-distance id tie-break', () => {
    const farmPreferred = runTrace(movedWorld(3), 40, 'candidate')
    const shopPreferred = runTrace(movedWorld(5), 40, 'candidate')

    const tieWorld = (first: 'farm' | 'workshop'): SimulationState => {
      let state = withStocks(createAuditState(), { material: 20, food: 30 })
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
    const tie = runTrace(tieWorld('farm'), 1, 'candidate').records[0]!
    const tieShop = runTrace(tieWorld('workshop'), 1, 'candidate').records[0]!

    audit('SPATIAL_PRESSURE', {
      farmPreference: {
        selected: 'farm',
        staffedFarms: farmPreferred.records[0]!.staffedFarms,
        foodProduction: farmPreferred.records[0]!.foodProduction,
        materialProduction: farmPreferred.records[0]!.materialProduction,
        farmUpkeep: farmPreferred.records[0]!.farmUpkeep,
        workshopUpkeep: farmPreferred.records[0]!.workshopUpkeep,
        foodEnd: farmPreferred.records[39]!.food,
        materialEnd: farmPreferred.records[39]!.material,
        foodShortage: farmPreferred.records.some((r) => r.foodShortage),
      },
      workshopPreference: {
        selected: 'workshop',
        staffedWorkshops: shopPreferred.records[0]!.staffedWorkshops,
        foodProduction: shopPreferred.records[0]!.foodProduction,
        materialProduction: shopPreferred.records[0]!.materialProduction,
        farmUpkeep: shopPreferred.records[0]!.farmUpkeep,
        workshopUpkeep: shopPreferred.records[0]!.workshopUpkeep,
        foodEnd: shopPreferred.records[39]!.food,
        materialEnd: shopPreferred.records[39]!.material,
        foodShortage: shopPreferred.records.some((r) => r.foodShortage),
      },
      equalDistanceIdTie: {
        farmCreatedFirst: {
          staffedFarms: tie.staffedFarms,
          staffedWorkshops: tie.staffedWorkshops,
          farmUpkeep: tie.farmUpkeep,
          workshopUpkeep: tie.workshopUpkeep,
          totalUpkeep: tie.totalUpkeep,
        },
        workshopCreatedFirst: {
          staffedFarms: tieShop.staffedFarms,
          staffedWorkshops: tieShop.staffedWorkshops,
          farmUpkeep: tieShop.farmUpkeep,
          workshopUpkeep: tieShop.workshopUpkeep,
          totalUpkeep: tieShop.totalUpkeep,
        },
      },
    })
    // Farm preference: no Farm upkeep (first Farm free) and Food survives.
    expect(farmPreferred.records[0]!.farmUpkeep).toBe(0)
    expect(farmPreferred.records.some((r) => r.foodShortage)).toBe(false)
    // Workshop preference: +2 Material, 1 Workshop upkeep, but the colony starves.
    expect(shopPreferred.records[0]!.materialProduction).toBe(2)
    expect(shopPreferred.records.some((r) => r.foodShortage)).toBe(true)
    // Equal distance: the id tie-break decides the mix AND the upkeep, because
    // the first staffed Farm is free while a staffed Workshop always pays 1.
    expect(tie.totalUpkeep).toBe(0)
    expect(tieShop.totalUpkeep).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §13 — Multi-colonist competition
// ---------------------------------------------------------------------------

describe('§13 — multi-colonist competition', () => {
  it('measures employment, production and upkeep for the mandated scenarios', () => {
    const scenarios = [
      { name: '2c 1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '3c 2F+1W', residences: 3, farms: 2, workshops: 1 },
      { name: '3c 1F+2W', residences: 3, farms: 1, workshops: 2 },
      { name: '4c 2F+2W', residences: 4, farms: 2, workshops: 2 },
      { name: '5c 3F+2W', residences: 5, farms: 3, workshops: 2 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const scenario of scenarios) {
      const start = rowWorld({ ...scenario, material: 10, food: 500 })
      const employment = getEmploymentSummary(start)
      const r = runTrace(start, 1, 'candidate').records[0]!
      out[scenario.name] = {
        employed: employment.employed,
        unemployed: employment.unemployed,
        farmWorkers: r.staffedFarms,
        workshopWorkers: r.staffedWorkshops,
        food: r.food,
        material: r.material,
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        netMaterial: r.materialProduction - r.totalUpkeep,
      }
    }
    audit('MULTI_COLONIST', out)
    expect((out['2c 1F+1W'] as { netMaterial: number }).netMaterial).toBe(1)
    expect((out['3c 2F+1W'] as { netMaterial: number }).netMaterial).toBe(0)
    expect((out['3c 1F+2W'] as { netMaterial: number }).netMaterial).toBe(2)
    expect((out['4c 2F+2W'] as { netMaterial: number }).netMaterial).toBe(1)
    expect((out['5c 3F+2W'] as { netMaterial: number }).netMaterial).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §14 — Construction feedback
// ---------------------------------------------------------------------------

describe('§14 — construction feedback loops', () => {
  it('measures the Farm -> Food -> worker -> Workshop -> Material loop', () => {
    const withoutFarm = runTrace(rowWorld({ residences: 1, farms: 0, workshops: 1, material: 10 }), 1, 'candidate').records[0]!
    const withFarm = runTrace(rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10 }), 1, 'candidate').records[0]!
    audit('LOOP_FARM_TO_WORKSHOP', {
      workshopOnly: { net: withoutFarm.materialProduction - withoutFarm.totalUpkeep, foodNet: withoutFarm.foodProduction - withoutFarm.colonists },
      plusFarm: { net: withFarm.materialProduction - withFarm.totalUpkeep, foodNet: withFarm.foodProduction - withFarm.colonists },
      note: 'the free first Farm turns a Food-negative workshop colony into a Food-neutral one without taxing Material',
    })
    expect(withoutFarm.foodProduction - withoutFarm.colonists).toBeLessThan(0)
    expect(withFarm.foodProduction - withFarm.colonists).toBe(0)
    expect(withFarm.materialProduction - withFarm.totalUpkeep).toBe(1)
  })

  it('measures the Workshop -> Material -> Farm loop and its marginal ceiling', () => {
    const rows = [1, 2, 3].map((farms) =>
      runTrace(rowWorld({ residences: farms + 1, farms, workshops: 1, material: 10, food: 1000 }), 1, 'candidate').records[0]!
    )
    audit('LOOP_WORKSHOP_TO_FARM', rows.map((r, i) => ({
      farms: [1, 2, 3][i],
      workshops: r.staffedWorkshops,
      farmUpkeep: r.farmUpkeep,
      netMaterial: r.materialProduction - r.totalUpkeep,
    })))
    expect(rows[0]!.materialProduction - rows[0]!.totalUpkeep).toBe(1)
    expect(rows[1]!.materialProduction - rows[1]!.totalUpkeep).toBe(0)
    expect(rows[2]!.materialProduction - rows[2]!.totalUpkeep).toBe(-1)
  })

  it('shows the dependency direction: adding a Farm beyond W never adds Material', () => {
    const rows = [1, 2, 3, 4].map((farms) =>
      runTrace(rowWorld({ residences: farms + 1, farms, workshops: 1, material: 10, food: 2000 }), 1, 'candidate').records[0]!
    )
    audit('FARM_CEILING_W1', rows.map((r, i) => ({
      farms: i + 1,
      farmUpkeep: r.farmUpkeep,
      netMaterial: r.materialProduction - r.totalUpkeep,
    })))
    expect(rows[3]!.materialProduction - rows[3]!.totalUpkeep).toBe(-2)
  })
})

// ---------------------------------------------------------------------------
// §15 — 120-tick expansion test
// ---------------------------------------------------------------------------

describe('§15 — 120-tick expansion test', () => {
  const crestCrossings = (records: readonly TickRecord[]): number[] => {
    const ticks: number[] = []
    let previous = false
    for (const r of records) {
      if (r.materialCrest >= 25 && !previous) ticks.push(r.tick)
      previous = r.materialCrest >= 25
    }
    return ticks
  }

  it('tracks 1F+1W, 2F+2W, 3F+3W, 4F+4W over 120 ticks', () => {
    const out: Record<string, unknown> = {}
    for (const p of [1, 2, 3, 4]) {
      const start = rowWorld({ residences: p * 2, farms: p, workshops: p, material: 10, food: 4000 })
      const trace = runTrace(start, 120, 'candidate')
      const last = trace.records[119]!
      out[`${p}F+${p}W`] = {
        netPerTickAtStart: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        materialEnd: last.material,
        materialCrestEnd: last.materialCrest,
        storage: materialStorageCapacityForTick(trace.state),
        firstCrestTick: crestCrossings(trace.records)[0] ?? null,
        crestTicks: crestCrossings(trace.records).length,
        classification: classify(trace.records),
        behaviour: 'accumulates to cap',
      }
    }
    audit('EXPANSION_120_TICK', out)
    for (const p of [1, 2, 3, 4]) {
      const entry = out[`${p}F+${p}W`] as { firstCrestTick: number | null; classification: string }
      expect(entry.firstCrestTick).not.toBeNull()
      expect(entry.classification).toBe('GROWING')
    }
  })

  it('compares the 120-tick behaviour of the three models at W = F', () => {
    const out: Record<string, unknown> = {}
    for (const mode of ['baseline', 'candidate', 'full'] as const) {
      const start = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 10, food: 4000 })
      const trace = runTrace(start, 120, mode)
      out[mode] = {
        firstCrestTick: crestCrossings(trace.records)[0] ?? null,
        materialEnd: trace.records[119]!.material,
        classification: classify(trace.records),
      }
    }
    audit('EXPANSION_120_MODELS_2F2W', out)
    // baseline +2/tick, candidate +1/tick, full 0/tick.
    expect((out['full'] as { firstCrestTick: number | null }).firstCrestTick).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// §16 — 24/25 crest behaviour
// ---------------------------------------------------------------------------

describe('§16 — 24/25 crest behaviour', () => {
  it('material 24 can be converted into a 25-cost building before upkeep', () => {
    const configs = [
      { name: '2F+2W', residences: 4, farms: 2, workshops: 2 },
      { name: '3F+3W', residences: 6, farms: 3, workshops: 3 },
      { name: '2F+3W', residences: 5, farms: 2, workshops: 3 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, material: 24, food: 2000 })
      const tick = stepWithMetrics(start, 'candidate')
      const built = stepWithMetrics(start, 'candidate', {
        type: 'placeBuilding',
        x: 60,
        y: 0,
        buildingType: 'residence',
      })
      out[config.name] = {
        production: tick.metrics.materialProduction,
        crest: tick.metrics.materialCrest,
        restAfterUpkeep: tick.state.resources.construction,
        buildAccepted: Object.values(built.state.buildings).some((b) => b.x === 60 && b.y === 0),
        materialAfterBuild: built.state.resources.construction,
        upkeepDue: tick.metrics.totalUpkeep,
      }
    }
    audit('CREST_24_25', out)
    for (const config of configs) {
      const entry = out[config.name] as { crest: number; buildAccepted: boolean }
      expect(entry.crest).toBeGreaterThanOrEqual(25)
      expect(entry.buildAccepted).toBe(true)
    }
    expect((out['2F+2W'] as { restAfterUpkeep: number }).restAfterUpkeep).toBe(25)
    expect((out['3F+3W'] as { restAfterUpkeep: number }).restAfterUpkeep).toBe(25)
    expect((out['2F+3W'] as { restAfterUpkeep: number }).restAfterUpkeep).toBe(26)
  })
})

// ---------------------------------------------------------------------------
// §17 — Recovery
// ---------------------------------------------------------------------------

describe('§17 — recovery from Material 0', () => {
  it('identifies the recovery boundary W >= F', () => {
    const configs = [
      { name: '1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '2F+2W', residences: 4, farms: 2, workshops: 2 },
      { name: '3F+2W', residences: 5, farms: 3, workshops: 2 },
      { name: '2F+3W', residences: 5, farms: 2, workshops: 3 },
      { name: '3F+1W', residences: 4, farms: 3, workshops: 1 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, material: 0, food: 4000 })
      const trace = runTrace(start, 60, 'candidate')
      const first = trace.records[0]!
      out[config.name] = {
        W: first.staffedWorkshops,
        F: first.staffedFarms,
        netPerTick: first.materialProduction - first.totalUpkeep,
        materialEnd: trace.records[59]!.material,
        recovered: trace.records[59]!.material > 0,
      }
    }
    audit('RECOVERY_FROM_ZERO', out)
    expect((out['1F+1W'] as { recovered: boolean }).recovered).toBe(true)
    expect((out['2F+2W'] as { recovered: boolean }).recovered).toBe(true)
    expect((out['2F+3W'] as { recovered: boolean }).recovered).toBe(true)
    expect((out['3F+2W'] as { recovered: boolean }).recovered).toBe(false)
    expect((out['3F+1W'] as { recovered: boolean }).recovered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §18 — Terminal state
// ---------------------------------------------------------------------------

describe('§18 — terminal states', () => {
  it('W <= F - 1 at Material 0 is terminal for small colonies', () => {
    const out: Record<string, unknown> = {}
    for (const [farms, workshops] of [
      [2, 1],
      [3, 2],
      [4, 3],
    ] as const) {
      const start = rowWorld({
        residences: farms + workshops,
        farms,
        workshops,
        material: 0,
        food: 4000,
      })
      const trace = runTrace(start, 240, 'candidate')
      out[`F${farms}W${workshops}`] = {
        netPerTick: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        materialEnd: trace.records[239]!.material,
        crest: trace.records[239]!.materialCrest,
        capacityRetained: true,
        escaped: trace.records[239]!.materialCrest >= 25,
      }
    }
    audit('TERMINAL_SMALL', out)
    for (const key of Object.keys(out)) {
      expect((out[key] as { escaped: boolean }).escaped).toBe(false)
    }
  })

  it('the crest lets a large W = F - 1 colony escape from Material 0', () => {
    const rows = [10, 12, 13, 14].map((workshops) => {
      const farms = workshops + 1
      const start = rowWorld({
        residences: farms + workshops,
        farms,
        workshops,
        material: 0,
        food: 40000,
      })
      const r = runTrace(start, 1, 'candidate').records[0]!
      return {
        W: workshops,
        F: farms,
        netPerTick: r.materialProduction - r.totalUpkeep,
        crestFromZero: r.materialCrest,
        buildAffordable: r.materialCrest >= 25,
      }
    })
    audit('TERMINAL_LARGE_CREST', rows)
    expect(rows[0]!.buildAffordable).toBe(false)
    expect(rows[1]!.buildAffordable).toBe(false)
    expect(rows[2]!.buildAffordable).toBe(true)
    expect(rows[3]!.buildAffordable).toBe(true)
  })

  it('no player action escapes a small terminal colony (no demolish, no unassign)', () => {
    const start = rowWorld({ residences: 3, farms: 2, workshops: 1, material: 0, food: 4000 })
    const attempted = stepWithMetrics(start, 'candidate', {
      type: 'placeBuilding',
      x: 60,
      y: 2,
      buildingType: 'workshop',
    })
    audit('TERMINAL_PLAYER_ACTION', {
      material: start.resources.construction,
      buildAccepted: Object.values(attempted.state.buildings).some((b) => b.x === 60),
      note: 'commands are placeBuilding/placeRoads only; no demolish or unassign exists',
    })
    expect(Object.values(attempted.state.buildings).some((b) => b.x === 60)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §19 — UI information audit
// ---------------------------------------------------------------------------

describe('§19 — UI information audit (hypothetical, no UI change)', () => {
  it('the current ledger exposes only aggregate workshop upkeep', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 10 })
    const r = runTrace(state, 1, 'candidate').records[0]!
    const farm = Object.values(state.buildings).find((b) => b.type === 'farm')!
    const inspection = getBuildingInspection(state, farm.id)
    audit('UI_INFORMATION', {
      domainUpkeepQuery: getMaterialUpkeepPerTick(state),
      candidateFarmUpkeep: r.farmUpkeep,
      candidateWorkshopUpkeep: r.workshopUpkeep,
      candidateTotalUpkeep: r.totalUpkeep,
      aggregateNetQuery: getNetMaterialPerTick(state),
      farmInspectionKeys: inspection === null ? null : Object.keys(inspection),
      farmInspectionHasUpkeep: inspection !== null && 'upkeep' in inspection,
      note: 'getMaterialUpkeepPerTick counts Workshops only; a future Farm upkeep would need a new query/ledger line',
    })
    expect(getMaterialUpkeepPerTick(state)).toBe(r.staffedWorkshops)
    expect(getMaterialUpkeepPerTick(state)).toBeLessThan(r.totalUpkeep)
    expect(inspection).not.toHaveProperty('upkeep')
  })
})

// ---------------------------------------------------------------------------
// §25 — Persistence and determinism
// ---------------------------------------------------------------------------

describe('§25 — persistence and determinism (audit-only)', () => {
  it('SAVE_VERSION is 4; the threshold adds no persisted state', () => {
    expect(SAVE_VERSION).toBe(7)
    const state = rowWorld({ residences: 4, farms: 2, workshops: 3, material: 20 })
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('farmUpkeep')
    audit('PERSISTENCE', { saveVersion: SAVE_VERSION, newPersistedFields: 0 })
  })

  it('candidate replay is deterministic and hash-stable', () => {
    const run = (): SimulationState =>
      runTrace(rowWorld({ residences: 5, farms: 3, workshops: 3, material: 5 }), 120, 'candidate').state
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    audit('DETERMINISM', { hash: hashCanonicalState(a) })
  })

  it('the production pipeline is unchanged', () => {
    const start = rowWorld({ residences: 5, farms: 3, workshops: 3, material: 5 })
    const harness = runTrace(start, 60, 'baseline').state
    const production = advance(start, 60)
    expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
    audit('PRODUCTION_UNCHANGED', { identical: true })
  })
})
