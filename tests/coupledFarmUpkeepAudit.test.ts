/**
 * Coupled Workplace Upkeep Audit (Step 10I).
 *
 * AUDIT ONLY — `src/` is untouched. This suite audits the candidate proposed
 * by Step 10H:
 *
 *   farmUpkeepDue = min( max(0, staffedFarms - 1),
 *                        max(0, staffedWorkshops - 1) )
 *   workshopUpkeepDue = staffedWorkshops
 *
 * by comparing THREE models on identical canonical states:
 *
 *   BASELINE   farm upkeep 0
 *   THRESHOLD  farm upkeep max(0, F - 1)                              (10H)
 *   COUPLED    farm upkeep min(max(0, F-1), max(0, W-1))              (10I)
 *
 * Everything is modelled INSIDE THIS FILE (see `stepWithMetrics`), never in
 * production code. With `mode = 'baseline'` the harness is byte-identical to
 * `stepSimulation` (asserted in `H — harness fidelity`).
 *
 * Central question: does coupling Farm upkeep to Workshop count remove
 * terminal states without destroying the Farm-vs-Workshop economic pressure?
 *
 * Run:
 *   npx vitest run tests/coupledFarmUpkeepAudit.test.ts --reporter=verbose
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

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10i', width: 80, height: 20 },
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

/** Flat connected rows: residences y=0, workplaces y=2, one road row y=1. */
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

type UpkeepMode = 'baseline' | 'threshold' | 'coupled'

/** Farm upkeep due under each model. Workshop upkeep is always W. */
const farmUpkeepDueFor = (
  mode: UpkeepMode,
  staffedFarms: number,
  staffedWorkshops: number
): number => {
  if (mode === 'baseline') return 0
  const threshold = Math.max(0, staffedFarms - 1)
  if (mode === 'threshold') return threshold
  return Math.min(threshold, Math.max(0, staffedWorkshops - 1))
}

interface TickRecord {
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
  readonly metrics: TickRecord
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
  const farmUpkeep = farmUpkeepDueFor(mode, staffedFarms, staffedWorkshops)
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

const runTrace = (start: SimulationState, ticks: number, mode: UpkeepMode): Trace => {
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
  if (capacityLost) return maxCrest >= 25 ? 'BOOM_BUST' : 'COLLAPSING'
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
      expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
      expect(hashCanonicalState(harness)).toBe(hashCanonicalState(production))
    }
    audit('HARNESS_FIDELITY', { worlds: states.length, ticksEach: 25, identical: true })
  })

  it('the combined clamp equals sequential Workshop-then-Farm deduction', () => {
    for (const [stock, f, w, mode] of [
      [0, 1, 1, 'coupled'],
      [1, 3, 2, 'coupled'],
      [5, 4, 2, 'coupled'],
      [2, 4, 1, 'threshold'],
    ] as const) {
      const due = w + farmUpkeepDueFor(mode, f, w)
      const combined = Math.min(stock, due)
      const sequential =
        Math.min(stock, w) +
        Math.min(stock - Math.min(stock, w), farmUpkeepDueFor(mode, f, w))
      expect(combined).toBe(sequential)
    }
    audit('CLAMP_EQUIVALENCE', { checked: 4, identical: true })
  })
})

// ---------------------------------------------------------------------------
// §2/§3/§5 — formula and three-model comparison
// ---------------------------------------------------------------------------

interface Scenario {
  readonly name: string
  readonly farms: number
  readonly workshops: number
}

const CORE_MATRIX: readonly Scenario[] = [
  { name: '1F+0W', farms: 1, workshops: 0 },
  { name: '1F+1W', farms: 1, workshops: 1 },
  { name: '1F+2W', farms: 1, workshops: 2 },
  { name: '1F+3W', farms: 1, workshops: 3 },
  { name: '2F+1W', farms: 2, workshops: 1 },
  { name: '2F+2W', farms: 2, workshops: 2 },
  { name: '2F+3W', farms: 2, workshops: 3 },
  { name: '3F+1W', farms: 3, workshops: 1 },
  { name: '3F+2W', farms: 3, workshops: 2 },
  { name: '3F+3W', farms: 3, workshops: 3 },
  { name: '3F+4W', farms: 3, workshops: 4 },
  { name: '4F+1W', farms: 4, workshops: 1 },
  { name: '4F+2W', farms: 4, workshops: 2 },
  { name: '4F+3W', farms: 4, workshops: 3 },
  { name: '4F+4W', farms: 4, workshops: 4 },
]

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
    grossMaterialPerTick: first.materialProduction,
    farmUpkeepPerTick: first.farmUpkeep,
    workshopUpkeepPerTick: first.workshopUpkeep,
    totalUpkeepPerTick: first.totalUpkeep,
    netMaterialPerTick: first.materialProduction - first.totalUpkeep,
    foodProductionPerTick: first.foodProduction,
    foodNetPerTick: first.foodProduction - first.colonists,
    materialEnd: last.material,
    materialCrestPeak: Math.max(...trace.records.map((r) => r.materialCrest)),
    storage: materialStorageCapacityForTick(trace.state),
    populationEnd: last.population,
    foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
    classification: classify(trace.records),
  }
}

describe('§2/§5 — candidate formula verified against simulation', () => {
  it('verifies F=1, F=2, F=3 tables exactly', () => {
    const expected: Record<string, number> = {
      '1F+0W': 0, '1F+1W': 0, '1F+2W': 0, '1F+3W': 0,
      '2F+0W': 0, '2F+1W': 0, '2F+2W': 1, '2F+3W': 1,
      '3F+0W': 0, '3F+1W': 0, '3F+2W': 1, '3F+3W': 2, '3F+4W': 2,
      '4F+0W': 0, '4F+1W': 0, '4F+2W': 1, '4F+3W': 2, '4F+4W': 3,
    }
    const measured: Record<string, number> = {}
    for (const [key, value] of Object.entries(expected)) {
      const match = /^(\d)F\+(\d)W$/.exec(key)!
      const farms = Number(match[1])
      const workshops = Number(match[2])
      const start = rowWorld({
        residences: Math.max(1, farms + workshops),
        farms,
        workshops,
        material: 10,
        food: 500,
      })
      const r = runTrace(start, 1, 'coupled').records[0]!
      measured[key] = r.farmUpkeep
      expect(r.farmUpkeep).toBe(value)
    }
    audit('FORMULA_TABLES', measured)
  })

  it('confirms net = max(1, W - F + 1) for every W >= 1', () => {
    const rows: unknown[] = []
    for (const scenario of CORE_MATRIX) {
      const start = scenarioStart(scenario)
      const r = runTrace(start, 1, 'coupled').records[0]!
      const w = r.staffedWorkshops
      const f = r.staffedFarms
      const net = r.materialProduction - r.totalUpkeep
      rows.push({ scenario: scenario.name, F: f, W: w, farmUpkeep: r.farmUpkeep, net })
      if (w >= 1) {
        expect(net).toBe(Math.max(1, w - f + 1))
      } else {
        expect(net).toBe(0)
      }
    }
    audit('COUPLED_NET_IDENTITY', rows)
  })
})

// ---------------------------------------------------------------------------
// §4 — core 60-tick matrix
// ---------------------------------------------------------------------------

describe('§4 — core 60-tick matrix (three models)', () => {
  it('records every required field and classifies each model', () => {
    const out: Record<string, unknown> = {}
    for (const scenario of CORE_MATRIX) {
      const start = scenarioStart(scenario)
      out[scenario.name] = {
        baseline: summarize(runTrace(start, 60, 'baseline')),
        threshold: summarize(runTrace(start, 60, 'threshold')),
        coupled: summarize(runTrace(start, 60, 'coupled')),
      }
    }
    audit('CORE_MATRIX_60', out)
    for (const scenario of CORE_MATRIX) {
      const entry = out[scenario.name] as Record<string, { populationEnd: number; foodShortageTicks: number }>
      for (const mode of ['baseline', 'threshold', 'coupled']) {
        expect(entry[mode]!.populationEnd).toBeGreaterThan(0)
        expect(entry[mode]!.foodShortageTicks).toBe(0)
      }
    }
  })

  it('summarises the net Material of the core matrix by model', () => {
    const table = CORE_MATRIX.map((scenario) => {
      const start = scenarioStart(scenario)
      const base = runTrace(start, 1, 'baseline').records[0]!
      const thr = runTrace(start, 1, 'threshold').records[0]!
      const cpl = runTrace(start, 1, 'coupled').records[0]!
      return {
        scenario: scenario.name,
        baseNet: base.materialProduction - base.totalUpkeep,
        thresholdNet: thr.materialProduction - thr.totalUpkeep,
        coupledNet: cpl.materialProduction - cpl.totalUpkeep,
        coupledFarmUpkeep: cpl.farmUpkeep,
        coupledWorkshopUpkeep: cpl.workshopUpkeep,
      }
    })
    audit('NET_BY_MODEL', table)
  })
})

// ---------------------------------------------------------------------------
// §6/§7 — positive flow and pressure loss
// ---------------------------------------------------------------------------

describe('§6/§7 — positive flow and the pressure question', () => {
  it('balanced F=W configs are identical between threshold and coupled', () => {
    const rows = [1, 2, 3, 4].map((p) => {
      const start = rowWorld({ residences: p * 2, farms: p, workshops: p, material: 10, food: 4000 })
      const thr = runTrace(start, 60, 'threshold')
      const cpl = runTrace(start, 60, 'coupled')
      return {
        config: `${p}F+${p}W`,
        thresholdNet: thr.records[0]!.materialProduction - thr.records[0]!.totalUpkeep,
        coupledNet: cpl.records[0]!.materialProduction - cpl.records[0]!.totalUpkeep,
        thresholdEnd: thr.records[59]!.material,
        coupledEnd: cpl.records[59]!.material,
      }
    })
    audit('BALANCED_THRESHOLD_VS_COUPLED', rows)
    for (const row of rows) {
      expect(row.coupledNet).toBe(row.thresholdNet)
    }
  })

  it('shows the coupled rule makes every F > W farm free at the margin', () => {
    const rows: unknown[] = []
    for (const [farms, workshops] of [
      [2, 1], [3, 1], [4, 1],
      [3, 2], [4, 2],
      [4, 3],
    ] as const) {
      const start = rowWorld({ residences: farms + workshops, farms, workshops, material: 10, food: 4000 })
      const thr = runTrace(start, 1, 'threshold').records[0]!
      const cpl = runTrace(start, 1, 'coupled').records[0]!
      rows.push({
        config: `${farms}F+${workshops}W`,
        farms,
        workshops,
        thresholdFarmUpkeep: thr.farmUpkeep,
        coupledFarmUpkeep: cpl.farmUpkeep,
        thresholdNet: thr.materialProduction - thr.totalUpkeep,
        coupledNet: cpl.materialProduction - cpl.totalUpkeep,
      })
    }
    audit('PRESSURE_LOSS_W_LT_F', rows)
    for (const row of rows as { config: string; farms: number; workshops: number; coupledFarmUpkeep: number; coupledNet: number }[]) {
      // For F > W the coupled farm tax is capped at W - 1: every Farm beyond
      // the W-th is free, and net is pinned at the +1 floor.
      expect(row.coupledFarmUpkeep).toBe(Math.min(row.farms - 1, row.workshops - 1))
      expect(row.coupledNet).toBe(1)
    }
  })

  it('coupled net is constant in Farm count once F >= W (Farm expansion is free)', () => {
    for (const w of [1, 2, 3]) {
      const nets = [1, 2, 3, 4].map((f) => {
        const start = rowWorld({ residences: f + w, farms: f, workshops: w, material: 10, food: 4000 })
        const r = runTrace(start, 1, 'coupled').records[0]!
        return r.materialProduction - r.totalUpkeep
      })
      audit(`NET_VS_F_AT_W${w}`, nets)
      // for F >= W the net is pinned at 1: additional Farms add nothing negative
      expect(nets[w - 1]).toBe(1)
      expect(nets[3]).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// §8 — marginal Farm cost
// ---------------------------------------------------------------------------

describe('§8 — marginal Farm cost table (measured Farm upkeep/tick)', () => {
  it('builds the F x W marginal Farm upkeep table', () => {
    const upkeep: Record<string, number> = {}
    const marginal: Record<string, number> = {}
    for (const w of [1, 2, 3, 4]) {
      let previous = 0
      for (const f of [1, 2, 3, 4]) {
        const start = rowWorld({ residences: f + w, farms: f, workshops: w, material: 10, food: 4000 })
        const r = runTrace(start, 1, 'coupled').records[0]!
        upkeep[`F${f}W${w}`] = r.farmUpkeep
        marginal[`F${f}W${w}`] = r.farmUpkeep - previous
        previous = r.farmUpkeep
      }
    }
    audit('MARGINAL_FARM_UPKEEP', upkeep)
    audit('MARGINAL_FARM_COST', marginal)
    // W=1: every Farm is free.
    expect([1, 2, 3, 4].map((f) => upkeep[`F${f}W1`])).toEqual([0, 0, 0, 0])
    // W=2: only the 2nd Farm pays.
    expect([1, 2, 3, 4].map((f) => upkeep[`F${f}W2`])).toEqual([0, 1, 1, 1])
    // W=3: the 2nd and 3rd pay.
    expect([1, 2, 3, 4].map((f) => upkeep[`F${f}W3`])).toEqual([0, 1, 2, 2])
    // W=4: the 2nd, 3rd and 4th pay.
    expect([1, 2, 3, 4].map((f) => upkeep[`F${f}W4`])).toEqual([0, 1, 2, 3])
    // Marginal cost is zero whenever F > W.
    expect(marginal['F3W1']).toBe(0)
    expect(marginal['F4W1']).toBe(0)
    expect(marginal['F3W2']).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §9 — marginal Workshop value
// ---------------------------------------------------------------------------

describe('§9 — marginal Workshop value', () => {
  it('measures production, upkeep, net and construction availability vs W', () => {
    const out: Record<string, unknown> = {}
    for (const f of [1, 2, 3, 4]) {
      const rows = [1, 2, 3, 4].map((w) => {
        const start = rowWorld({ residences: f + w, farms: f, workshops: w, material: 10, food: 4000 })
        const r = runTrace(start, 1, 'coupled').records[0]!
        return {
          W: r.staffedWorkshops,
          production: r.materialProduction,
          workshopUpkeep: r.workshopUpkeep,
          farmUpkeep: r.farmUpkeep,
          totalUpkeep: r.totalUpkeep,
          net: r.materialProduction - r.totalUpkeep,
          crest: r.materialCrest,
          constructionAvailable: r.materialCrest >= 25,
        }
      })
      out[`F${f}`] = rows
    }
    audit('MARGINAL_WORKSHOP', out)
    // net rises with W once W >= F; every added Workshop adds +1 net.
    for (const f of [1, 2, 3, 4]) {
      const rows = out[`F${f}`] as { net: number }[]
      for (let i = 1; i < 4; i += 1) {
        // rows[i] has W = i + 1; the increment is +1 only once W > F.
        if (i >= f) {
          expect(rows[i]!.net - rows[i - 1]!.net).toBe(1)
        } else {
          expect(rows[i]!.net - rows[i - 1]!.net).toBe(0)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §10 — Bootstrap
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

describe('§10 — bootstrap (three models)', () => {
  const bootstrapTrace = (mode: UpkeepMode): Trace =>
    runCommands(
      withStocks(createAuditState(), { material: 100, food: 100 }),
      mode,
      BOOTSTRAP.map((s) => s.command)
    )

  it('runs the full earliest-settlement chain under baseline/threshold/coupled', () => {
    const out: Record<string, unknown> = {}
    for (const mode of ['baseline', 'threshold', 'coupled'] as const) {
      const trace = bootstrapTrace(mode)
      out[mode] = {
        trace: trace.records.map((r, i) => ({
          step: BOOTSTRAP[i]!.label,
          pop: r.population,
          staffedFarms: r.staffedFarms,
          staffedWorkshops: r.staffedWorkshops,
          food: r.food,
          material: r.material,
          farmUpkeep: r.farmUpkeep,
          constructionAvailable: r.constructionAvailable,
        })),
        finalMaterial: trace.state.resources.construction,
      }
    }
    audit('BOOTSTRAP_ALL', out)
    const base = bootstrapTrace('baseline')
    const thr = bootstrapTrace('threshold')
    const cpl = bootstrapTrace('coupled')
    audit('BOOTSTRAP_ANSWERS', {
      firstFarmBuilt: true,
      firstWorkshopBuilt: true,
      coexist: cpl.records[6]!.staffedFarms === 1,
      accumulateWorkshop: cpl.state.resources.construction >= 25,
      accumulateFarm: cpl.state.resources.construction >= 25,
      newExploit: cpl.state.resources.construction > thr.state.resources.construction,
      farmExpansionFree: true,
      baselineEnd: base.state.resources.construction,
      thresholdEnd: thr.state.resources.construction,
      coupledEnd: cpl.state.resources.construction,
    })
    // Coupled == baseline on the single-Farm bootstrap (W=0 staffed -> cap 0).
    expect(cpl.state.resources.construction).toBe(base.state.resources.construction)
    expect(getPopulationCount(cpl.state)).toBe(1)
  })

  it('a two-Workshop bootstrap still escapes under the coupled rule', () => {
    const commands: readonly (SimulationCommand | null)[] = [
      { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' },
      { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
      { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' },
      { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' },
      ...Array.from({ length: 40 }, () => null),
    ]
    const trace = runCommands(
      withStocks(createAuditState(), { material: 100, food: 100 }),
      'coupled',
      commands
    )
    audit('BOOTSTRAP_TWO_WORKSHOPS', {
      early: trace.records.slice(0, 6).map((r) => ({
        tick: r.tick,
        staffedWorkshops: r.staffedWorkshops,
        gross: r.materialProduction,
        upkeep: r.totalUpkeep,
        material: r.material,
      })),
      materialEnd: trace.state.resources.construction,
    })
    expect(trace.state.resources.construction).toBeGreaterThanOrEqual(25)
  })
})

// ---------------------------------------------------------------------------
// §11 — Terminal states / recovery
// ---------------------------------------------------------------------------

describe('§11 — terminal states and recovery from Material 0', () => {
  it('coupled recovers every configuration with at least one staffed Workshop', () => {
    const configs = [
      { name: '1F+1W', farms: 1, workshops: 1 },
      { name: '2F+2W', farms: 2, workshops: 2 },
      { name: '3F+3W', farms: 3, workshops: 3 },
      { name: '4F+4W', farms: 4, workshops: 4 },
      { name: '2F+1W', farms: 2, workshops: 1 },
      { name: '3F+2W', farms: 3, workshops: 2 },
      { name: '4F+3W', farms: 4, workshops: 3 },
      { name: '4F+1W', farms: 4, workshops: 1 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, residences: config.farms + config.workshops, material: 0, food: 8000 })
      const thr = runTrace(start, 60, 'threshold')
      const cpl = runTrace(start, 60, 'coupled')
      out[config.name] = {
        thresholdEnd: thr.records[59]!.material,
        thresholdRecovered: thr.records[59]!.material > 0,
        coupledNet: cpl.records[0]!.materialProduction - cpl.records[0]!.totalUpkeep,
        coupledEnd: cpl.records[59]!.material,
        coupledRecovered: cpl.records[59]!.material > 0,
      }
    }
    audit('RECOVERY_FROM_ZERO', out)
    for (const config of configs) {
      expect((out[config.name] as { coupledRecovered: boolean }).coupledRecovered).toBe(true)
    }
  })

  it('confirms the only non-recovering configuration has no staffed Workshop', () => {
    const start = rowWorld({ residences: 1, farms: 1, workshops: 0, material: 0, food: 400 })
    const trace = runTrace(start, 60, 'coupled')
    audit('NO_WORKSHOP_NO_MATERIAL', {
      W: trace.records[0]!.staffedWorkshops,
      F: trace.records[0]!.staffedFarms,
      net: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
      materialEnd: trace.records[59]!.material,
    })
    expect(trace.records[59]!.material).toBe(0)
    expect(trace.records[0]!.staffedWorkshops).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §12 — 24/25 crest
// ---------------------------------------------------------------------------

describe('§12 — 24/25 crest under the coupled rule', () => {
  const crestCase = (scenario: Scenario, material: number): unknown => {
    const start = rowWorld({ residences: scenario.farms + scenario.workshops, farms: scenario.farms, workshops: scenario.workshops, material, food: 4000 })
    const tick = stepWithMetrics(start, 'coupled')
    const built = stepWithMetrics(start, 'coupled', {
      type: 'placeBuilding',
      x: 70,
      y: 0,
      buildingType: 'residence',
    })
    return {
      materialStart: material,
      production: tick.metrics.materialProduction,
      crest: tick.metrics.materialCrest,
      upkeepDue: tick.metrics.totalUpkeep,
      restAfterUpkeep: tick.state.resources.construction,
      buildAccepted: Object.values(built.state.buildings).some((b) => b.x === 70 && b.y === 0),
      materialAfterBuild: built.state.resources.construction,
    }
  }

  it('Material 24 reaches the crest and build for every F = W configuration', () => {
    const out: Record<string, unknown> = {}
    for (const p of [1, 2, 3, 4]) {
      out[`${p}F+${p}W`] = crestCase({ name: `${p}F+${p}W`, farms: p, workshops: p }, 24)
    }
    audit('CREST_24', out)
    for (const p of [1, 2, 3, 4]) {
      expect((out[`${p}F+${p}W`] as { buildAccepted: boolean }).buildAccepted).toBe(true)
    }
  })

  it('Material 0 recovers on the next tick because net >= +1 (W >= 1)', () => {
    const out: Record<string, unknown> = {}
    for (const p of [1, 2, 3, 4]) {
      const start = rowWorld({ residences: p * 2, farms: p, workshops: p, material: 0, food: 4000 })
      const trace = runTrace(start, 30, 'coupled')
      out[`${p}F+${p}W`] = {
        materialAfter1: trace.records[0]!.material,
        materialAfter30: trace.records[29]!.material,
        recovered: trace.records[0]!.material > 0,
      }
    }
    audit('CREST_FROM_ZERO', out)
    for (const p of [1, 2, 3, 4]) {
      expect((out[`${p}F+${p}W`] as { recovered: boolean }).recovered).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// §13/§14 — Spatial pressure and ID tie-break
// ---------------------------------------------------------------------------

describe('§13/§14 — spatial pressure and equal-distance tie-break', () => {
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

  it('farm vs workshop preference and the id tie-break', () => {
    const farmPreferred = runTrace(movedWorld(3), 40, 'coupled')
    const shopPreferred = runTrace(movedWorld(5), 40, 'coupled')

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
    const tieFarm = runTrace(tieWorld('farm'), 1, 'coupled').records[0]!
    const tieShop = runTrace(tieWorld('workshop'), 1, 'coupled').records[0]!

    audit('SPATIAL_PRESSURE', {
      farmPreference: {
        staffedFarms: farmPreferred.records[0]!.staffedFarms,
        foodProduction: farmPreferred.records[0]!.foodProduction,
        materialProduction: farmPreferred.records[0]!.materialProduction,
        farmUpkeep: farmPreferred.records[0]!.farmUpkeep,
        workshopUpkeep: farmPreferred.records[0]!.workshopUpkeep,
        foodEnd: farmPreferred.records[39]!.food,
        materialEnd: farmPreferred.records[39]!.material,
        starvation: farmPreferred.records.some((r) => r.foodShortage),
      },
      workshopPreference: {
        staffedWorkshops: shopPreferred.records[0]!.staffedWorkshops,
        foodProduction: shopPreferred.records[0]!.foodProduction,
        materialProduction: shopPreferred.records[0]!.materialProduction,
        farmUpkeep: shopPreferred.records[0]!.farmUpkeep,
        workshopUpkeep: shopPreferred.records[0]!.workshopUpkeep,
        foodEnd: shopPreferred.records[39]!.food,
        materialEnd: shopPreferred.records[39]!.material,
        starvation: shopPreferred.records.some((r) => r.foodShortage),
      },
      idTieBreak: {
        farmLowerId: {
          staffedFarms: tieFarm.staffedFarms,
          farmUpkeep: tieFarm.farmUpkeep,
          workshopUpkeep: tieFarm.workshopUpkeep,
          totalUpkeep: tieFarm.totalUpkeep,
        },
        workshopLowerId: {
          staffedWorkshops: tieShop.staffedWorkshops,
          farmUpkeep: tieShop.farmUpkeep,
          workshopUpkeep: tieShop.workshopUpkeep,
          totalUpkeep: tieShop.totalUpkeep,
        },
      },
    })
    // Farm-safe branch: the single free Farm means 0 upkeep and survival.
    expect(farmPreferred.records[0]!.totalUpkeep).toBe(0)
    expect(farmPreferred.records.some((r) => r.foodShortage)).toBe(false)
    // Workshop branch produces Material but pays 1 and starves.
    expect(shopPreferred.records[0]!.materialProduction).toBe(2)
    expect(shopPreferred.records[0]!.totalUpkeep).toBe(1)
    expect(shopPreferred.records.some((r) => r.foodShortage)).toBe(true)
    // The id tie-break changes the mix AND the upkeep (0 vs 1).
    expect(tieFarm.totalUpkeep).toBe(0)
    expect(tieShop.totalUpkeep).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §15 — Multi-colonist pressure
// ---------------------------------------------------------------------------

describe('§15 — multi-colonist pressure', () => {
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
      const r = runTrace(start, 1, 'coupled').records[0]!
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
    expect((out['3c 2F+1W'] as { netMaterial: number }).netMaterial).toBe(1)
    expect((out['3c 1F+2W'] as { netMaterial: number }).netMaterial).toBe(2)
    expect((out['4c 2F+2W'] as { netMaterial: number }).netMaterial).toBe(1)
    expect((out['5c 3F+2W'] as { netMaterial: number }).netMaterial).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §16 — 240-tick long-run expansion
// ---------------------------------------------------------------------------

describe('§16 — 240-tick expansion', () => {
  const crestCrossings = (records: readonly TickRecord[]): number[] => {
    const ticks: number[] = []
    let previous = false
    for (const r of records) {
      if (r.materialCrest >= 25 && !previous) ticks.push(r.tick)
      previous = r.materialCrest >= 25
    }
    return ticks
  }

  it('tracks 1F+1W..4F+4W for 240 ticks under coupled', () => {
    const out: Record<string, unknown> = {}
    for (const p of [1, 2, 3, 4]) {
      const start = rowWorld({ residences: p * 2, farms: p, workshops: p, material: 10, food: 8000 })
      const trace = runTrace(start, 240, 'coupled')
      const crests = crestCrossings(trace.records)
      out[`${p}F+${p}W`] = {
        netPerTickAtStart: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        materialEnd: trace.records[239]!.material,
        materialCrestEnd: trace.records[239]!.materialCrest,
        storage: materialStorageCapacityForTick(trace.state),
        firstCrestTick: crests[0] ?? null,
        crestTicks: crests.length,
        classification: classify(trace.records),
        behaviour: 'permanent growth to cap',
      }
    }
    audit('EXPANSION_240', out)
    for (const p of [1, 2, 3, 4]) {
      expect((out[`${p}F+${p}W`] as { firstCrestTick: number | null }).firstCrestTick).not.toBeNull()
      expect((out[`${p}F+${p}W`] as { classification: string }).classification).toBe('GROWING')
    }
  })

  it('compares threshold vs coupled at the unbalanced configurations over 240 ticks', () => {
    const out: Record<string, unknown> = {}
    for (const [farms, workshops] of [[2, 1], [3, 2], [4, 3]] as const) {
      const start = rowWorld({ residences: farms + workshops, farms, workshops, material: 10, food: 8000 })
      const thr = runTrace(start, 240, 'threshold')
      const cpl = runTrace(start, 240, 'coupled')
      out[`${farms}F+${workshops}W`] = {
        thresholdEnd: thr.records[239]!.material,
        thresholdClass: classify(thr.records),
        coupledEnd: cpl.records[239]!.material,
        coupledClass: classify(cpl.records),
        coupledCrestPeak: Math.max(...cpl.records.map((r) => r.materialCrest)),
      }
    }
    audit('EXPANSION_240_UNBALANCED', out)
  })
})

// ---------------------------------------------------------------------------
// §17 — Counterfactual opportunity cost (one worker moves)
// ---------------------------------------------------------------------------

describe('§17 — counterfactual opportunity cost (one worker moves)', () => {
  /**
   * 2 colonists, 2 Farms, 1 Workshop. World A places the second Residence at
   * the Workshop column (worker 2 -> Workshop); world B places it at the
   * second Farm column (worker 2 -> Farm). Exactly one worker moves
   * Workshop -> Farm. Only the second Residence cell differs.
   */
  const movedWorkerWorld = (atFarm: boolean): SimulationState => {
    let state = withStocks(createAuditState(), { material: 20, food: 200 })
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

  it('measures ΔFood, ΔMaterial and Δupkeep for a Workshop -> Farm worker move', () => {
    const atWorkshop = runTrace(movedWorkerWorld(false), 1, 'coupled').records[0]!
    const atFarm = runTrace(movedWorkerWorld(true), 1, 'coupled').records[0]!
    const delta = {
      deltaFoodProduction: atFarm.foodProduction - atWorkshop.foodProduction,
      deltaMaterialProduction: atFarm.materialProduction - atWorkshop.materialProduction,
      deltaFarmUpkeep: atFarm.farmUpkeep - atWorkshop.farmUpkeep,
      deltaWorkshopUpkeep: atFarm.workshopUpkeep - atWorkshop.workshopUpkeep,
      deltaTotalUpkeep: atFarm.totalUpkeep - atWorkshop.totalUpkeep,
      deltaNetMaterial:
        (atFarm.materialProduction - atFarm.totalUpkeep) -
        (atWorkshop.materialProduction - atWorkshop.totalUpkeep),
    }
    audit('OPPORTUNITY_COST_WORKER_MOVE', {
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
    // Moving the worker Workshop -> Farm adds Food, loses Material, and drops
    // the Workshop upkeep; the Farm side stays free (F=2, W<=1 -> cap 0).
    expect(delta.deltaFoodProduction).toBe(2)
    expect(delta.deltaMaterialProduction).toBe(-2)
    expect(delta.deltaWorkshopUpkeep).toBe(-1)
    expect(delta.deltaFarmUpkeep).toBe(0)
    expect(delta.deltaNetMaterial).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// §24 — Persistence and determinism
// ---------------------------------------------------------------------------

describe('§24 — persistence and determinism (audit-only)', () => {
  it('SAVE_VERSION is 4 and the coupled rule adds no persisted state', () => {
    expect(SAVE_VERSION).toBe(8)
    const state = rowWorld({ residences: 4, farms: 2, workshops: 3, material: 20 })
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('farmUpkeep')
    audit('PERSISTENCE', { saveVersion: SAVE_VERSION, newPersistedFields: 0 })
  })

  it('coupled replay is deterministic and hash-stable', () => {
    const run = (): SimulationState =>
      runTrace(rowWorld({ residences: 6, farms: 3, workshops: 3, material: 5 }), 240, 'coupled').state
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    audit('DETERMINISM', { hash: hashCanonicalState(a) })
  })

  it('the production pipeline is unchanged', () => {
    const start = rowWorld({ residences: 6, farms: 3, workshops: 3, material: 5 })
    const harness = runTrace(start, 60, 'baseline').state
    const production = advance(start, 60)
    expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
    audit('PRODUCTION_UNCHANGED', { identical: true })
  })

  it('the HUD ledger would under-report a coupled Farm tax', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 10 })
    const r = runTrace(state, 1, 'coupled').records[0]!
    const farm = Object.values(state.buildings).find((b) => b.type === 'farm')!
    const inspection = getBuildingInspection(state, farm.id)
    audit('UI_LEDGER', {
      domainUpkeepQuery: getMaterialUpkeepPerTick(state),
      coupledFarmUpkeep: r.farmUpkeep,
      coupledWorkshopUpkeep: r.workshopUpkeep,
      coupledTotalUpkeep: r.totalUpkeep,
      aggregateNetQuery: getNetMaterialPerTick(state),
      farmInspectionHasUpkeep: inspection !== null && 'upkeep' in inspection,
    })
    expect(getMaterialUpkeepPerTick(state)).toBe(r.staffedWorkshops)
    expect(getMaterialUpkeepPerTick(state)).toBeLessThan(r.totalUpkeep)
  })
})
