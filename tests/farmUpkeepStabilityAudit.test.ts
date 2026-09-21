/**
 * Farm Upkeep Stability Audit (Step 10G).
 *
 * AUDIT ONLY — `src/` is untouched. The candidate rule
 *
 *   staffed operational Farm -> 1 Material upkeep / tick
 *
 * is modelled INSIDE THIS FILE (see `stepWithMetrics`), never in production
 * code. The audit question:
 *
 *   Does symmetric staffed-workplace upkeep create a healthier, more
 *   meaningful economic constraint, or a pathological Material starvation /
 *   death spiral?
 *
 * The candidate is inserted at the EXACT phase the existing Workshop upkeep
 * occupies (step.ts phase 8b, after produceMaterial/applyCommand, before
 * advanceTime) as a COMBINED clamp:
 *
 *   due  = staffed Workshops + staffed Farms
 *   paid = min(stock, due)
 *
 * Because `min(stock, a) + min(stock - min(stock, a), b) === min(stock, a+b)`
 * for non-negative a, b, a sequential deduction (Workshop first, Farm second)
 * is numerically identical — so the audit does not depend on deduction order.
 *
 * Harness fidelity is proven by `describe('H — harness fidelity')`: with the
 * candidate disabled, `stepWithMetrics` is byte-identical to the production
 * `stepSimulation` for every audited state.
 *
 * Every `AUDIT ...` console line is raw evidence quoted in
 * docs/roadmap/Step10G.md. Run:
 *   npx vitest run tests/farmUpkeepStabilityAudit.test.ts --reporter=verbose
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
  getEmploymentSummary,
  getPopulationCount,
  hashCanonicalState,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  materialStorageCapacityForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  produceFood,
  produceMaterial,
  progressPlacedBuilding,
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

/** Wide, flat audit world: enough columns for 16 residences + 16 workplaces. */
const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10g', width: 48, height: 12 },
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
  },
})

interface WorldSpec {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  /** Which workplace type is created first -> which gets the lower id. */
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

/**
 * One connected road network: residences on row y = 0, workplaces on row
 * y = 2, a road row y = 1 spanning every column. Every residence is
 * mobility-connected to every workplace, and the workplace in the residence's
 * own column is at road distance 0. `residences` colonists are injected.
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
// Candidate harness (audit-only; mirrors step.ts with farm upkeep at 8b)
// ---------------------------------------------------------------------------

interface TickRecord {
  readonly tick: number
  readonly colonists: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly food: number
  readonly material: number
  /**
   * Construction stock at phase 8a (after production, before upkeep): the
   * exact value a player command validates against. A build is affordable
   * on a tick iff this crest reaches 25, even when the resting stock does not.
   */
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
 * Exact mirror of stepSimulation(state, command) with the candidate Farm
 * upkeep added to phase 8b. When `farmUpkeep` is false the function is
 * byte-identical to the production tick (asserted in §H).
 */
const stepWithMetrics = (
  state: SimulationState,
  farmUpkeep: boolean,
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
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed = progressPlacedRoads(progressedBuilding, commanded)

  const workshopUpkeep = materialUpkeepDueForTick(progressed)
  const farmUpkeepDue = farmUpkeep ? staffedFarms : 0
  const totalUpkeep = workshopUpkeep + farmUpkeepDue
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
      farmUpkeep: farmUpkeepDue,
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
  farmUpkeep: boolean
): Trace => {
  let state = start
  const records: TickRecord[] = []
  for (let i = 0; i < ticks; i += 1) {
    const result = stepWithMetrics(state, farmUpkeep)
    state = result.state
    records.push(result.metrics)
  }
  return { state, records }
}

/** Run a command sequence, recording one tick per command. */
const runCommands = (
  start: SimulationState,
  farmUpkeep: boolean,
  commands: readonly (SimulationCommand | null)[]
): Trace => {
  let state = start
  const records: TickRecord[] = []
  for (const command of commands) {
    const result =
      command === null
        ? stepWithMetrics(state, farmUpkeep)
        : stepWithMetrics(state, farmUpkeep, command)
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
// Trajectory classification (Step 10G §5)
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
  const materials = records.map((r) => r.material)
  const maxMaterial = Math.max(...materials)
  const finalMaterial = materials[materials.length - 1] ?? 0
  const reachedThreshold = maxMaterial >= 25
  if (capacityLost) {
    return reachedThreshold ? 'BOOM_BUST' : 'COLLAPSING'
  }
  if (reachedThreshold) return 'GROWING'
  if (finalMaterial >= 0) return 'MARGINALLY_STABLE'
  return 'STABLE'
}

// ---------------------------------------------------------------------------
// H — Harness fidelity (candidate disabled must equal production step)
// ---------------------------------------------------------------------------

describe('H — harness fidelity', () => {
  it('stepWithMetrics(farmUpkeep=false) is byte-identical to stepSimulation', () => {
    const states: SimulationState[] = [
      rowWorld({ residences: 1, farms: 0, workshops: 1, material: 0, food: 200 }),
      rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10, food: 200 }),
      rowWorld({ residences: 3, farms: 2, workshops: 2, material: 0, food: 500 }),
      rowWorld({ residences: 4, farms: 2, workshops: 2, first: 'workshop', material: 5 }),
    ]
    for (const start of states) {
      let candidate = start
      let production = start
      for (let i = 0; i < 25; i += 1) {
        candidate = stepWithMetrics(candidate, false).state
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(candidate)).toBe(
        serializeCanonicalState(production)
      )
      expect(hashCanonicalState(candidate)).toBe(hashCanonicalState(production))
    }
    audit('HARNESS_FIDELITY', { worlds: states.length, ticksEach: 25, identical: true })
  })

  it('the combined clamp equals sequential Workshop-then-Farm deduction', () => {
    for (const [stock, farms, shops] of [
      [0, 1, 1],
      [1, 1, 1],
      [1, 2, 1],
      [3, 2, 1],
      [5, 2, 3],
    ] as const) {
      const due = shops + farms
      const combined = Math.min(stock, due)
      const sequential =
        Math.min(stock, shops) + Math.min(stock - Math.min(stock, shops), farms)
      expect(combined).toBe(sequential)
    }
    audit('CLAMP_EQUIVALENCE', { checked: 5, identical: true })
  })
})

// ---------------------------------------------------------------------------
// §2 — Baseline reproduction (current rules)
// ---------------------------------------------------------------------------

describe('§2 — baseline reproduction (current rules, Farm upkeep absent)', () => {
  it('locks the audited constants to their src values', () => {
    const constants = {
      materialStorage: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      workshopUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      foodPerFarm: FOOD_PER_FARM_PER_TICK,
      materialPerWorker: MATERIAL_PER_WORKER_PER_TICK,
    }
    audit('CONSTANTS', constants)
    expect(constants).toEqual({
      materialStorage: 25,
      workshopUpkeep: 1,
      foodPerFarm: 2,
      materialPerWorker: 2,
    })
  })

  it('reproduces the 1-staffed-Workshop equilibrium at 24 (cap 25, net +1)', () => {
    const start = rowWorld({ residences: 1, farms: 0, workshops: 1, material: 0, food: 200 })
    const r0 = runTrace(start, 1, false).records[0]!
    expect(r0.staffedWorkshops).toBe(1)
    expect(r0.staffedFarms).toBe(0)
    expect(r0.materialProduction).toBe(2)
    expect(r0.workshopUpkeep).toBe(1)
    expect(r0.farmUpkeep).toBe(0)
    const trace = runTrace(start, 40, false)
    const after = trace.records.map((r) => r.material)
    audit('BASELINE_ONE_WORKSHOP', {
      storage: materialStorageCapacityForTick(trace.state),
      tick20: after[19],
      tick24: after[23],
      tick40: after[39],
      canAfford25AtRest: trace.state.resources.construction >= 25,
    })
    expect(after[19]).toBe(20)
    expect(after[23]).toBe(24)
    expect(after[39]).toBe(24)
    expect(trace.state.resources.construction).toBeLessThan(25)
  })

  it('confirms a staffed Farm currently costs no Material', () => {
    const start = rowWorld({ residences: 1, farms: 1, workshops: 0, material: 10, food: 100 })
    const after = runTrace(start, 30, false).state
    audit('BASELINE_FARM_UPKEEP_ZERO', {
      materialStart: 10,
      materialAfter30: after.resources.construction,
      farmUpkeepDue: countStaffedOperationalFarms(start),
    })
    expect(after.resources.construction).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// §4 / §5 — Core 60-tick stability experiment
// ---------------------------------------------------------------------------

interface Scenario {
  readonly name: string
  readonly residences: number
  readonly farms: number
  readonly workshops: number
}

const CORE_SCENARIOS: readonly Scenario[] = [
  { name: '1F+0W', residences: 1, farms: 1, workshops: 0 },
  { name: '1F+1W', residences: 2, farms: 1, workshops: 1 },
  { name: '2F+1W', residences: 3, farms: 2, workshops: 1 },
  { name: '1F+2W', residences: 3, farms: 1, workshops: 2 },
  { name: '2F+2W', residences: 4, farms: 2, workshops: 2 },
  { name: '3F+2W', residences: 5, farms: 3, workshops: 2 },
  { name: '2F+3W', residences: 5, farms: 2, workshops: 3 },
]

const CORE_TICKS = 60

describe('§4/§5 — core 60-tick stability (candidate Farm upkeep ON)', () => {
  it('records every required field for every scenario and classifies the trajectory', () => {
    const summary: Record<string, unknown> = {}
    for (const scenario of CORE_SCENARIOS) {
      const start = rowWorld({
        residences: scenario.residences,
        farms: scenario.farms,
        workshops: scenario.workshops,
        material: 10,
        food: 1000,
      })
      const trace = runTrace(start, CORE_TICKS, true)
      const first = trace.records[0]!
      const last = trace.records[trace.records.length - 1]!
      const peak = Math.max(...trace.records.map((r) => r.material))
      const floor = Math.min(...trace.records.map((r) => r.material))
      const classification = classify(trace.records)
      summary[scenario.name] = {
        colonists: first.colonists,
        staffedFarms: first.staffedFarms,
        staffedWorkshops: first.staffedWorkshops,
        foodStart: first.food,
        foodEnd: last.food,
        materialStart: first.material,
        materialEnd: last.material,
        materialPeak: peak,
        materialFloor: floor,
        grossMaterialPerTick: first.materialProduction,
        totalUpkeepPerTick: first.totalUpkeep,
        netMaterialPerTick: first.materialProduction - first.totalUpkeep,
        foodProductionPerTick: first.foodProduction,
        foodNetPerTick: first.foodProduction - first.colonists,
        storage: materialStorageCapacityForTick(trace.state),
        populationEnd: last.population,
        constructionAvailable: last.constructionAvailable,
        foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
        classification,
      }
    }
    audit('CORE_60_TICK', summary)
    // Every scenario must stay alive (Food buffer isolates Material).
    for (const scenario of CORE_SCENARIOS) {
      const entry = summary[scenario.name] as { populationEnd: number; foodShortageTicks: number }
      expect(entry.foodShortageTicks).toBe(0)
      expect(entry.populationEnd).toBeGreaterThan(0)
    }
  })

  it('prints a full per-tick trace for the two critical scenarios', () => {
    for (const scenario of [
      { name: '1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '2F+1W', residences: 3, farms: 2, workshops: 1 },
    ] as const) {
      const start = rowWorld({ ...scenario, material: 10, food: 1000 })
      const trace = runTrace(start, 30, true)
      audit(`TRACE_${scenario.name}`, trace.records)
    }
  })

  it('the candidate is net-zero or negative exactly when staffed Workshops <= staffed Farms', () => {
    for (const scenario of CORE_SCENARIOS) {
      const start = rowWorld({ ...scenario, material: 10, food: 1000 })
      const r = runTrace(start, 1, true).records[0]!
      const farmWorkers = r.staffedFarms
      const shopWorkers = r.staffedWorkshops
      const gross = r.materialProduction
      const net = gross - r.totalUpkeep
      audit(`NET_${scenario.name}`, {
        farmWorkers,
        shopWorkers,
        gross,
        totalUpkeep: r.totalUpkeep,
        net,
        expectedNet: shopWorkers - farmWorkers,
      })
      // stored gross equals 2 x staffed workshops while below storage cap
      expect(gross).toBe(shopWorkers * MATERIAL_PER_WORKER_PER_TICK)
      expect(net).toBe(shopWorkers - farmWorkers)
    }
  })
})

describe('§5 — classification comparison (baseline vs candidate)', () => {
  it('compares the classification of every scenario under both rules', () => {
    const comparison: Record<string, unknown> = {}
    for (const scenario of CORE_SCENARIOS) {
      const start = rowWorld({ ...scenario, material: 10, food: 1000 })
      const base = runTrace(start, CORE_TICKS, false)
      const cand = runTrace(start, CORE_TICKS, true)
      comparison[scenario.name] = {
        baseline: {
          classification: classify(base.records),
          materialEnd: base.records[CORE_TICKS - 1]!.material,
          materialPeak: Math.max(...base.records.map((r) => r.material)),
        },
        candidate: {
          classification: classify(cand.records),
          materialEnd: cand.records[CORE_TICKS - 1]!.material,
          materialPeak: Math.max(...cand.records.map((r) => r.material)),
        },
      }
    }
    audit('CLASSIFICATION_COMPARISON', comparison)
  })

  it('candidate NEVER drives Material below zero (partial clamp holds)', () => {
    for (const scenario of CORE_SCENARIOS) {
      const start = rowWorld({ ...scenario, material: 1, food: 1000 })
      const trace = runTrace(start, CORE_TICKS, true)
      for (const record of trace.records) {
        expect(record.material).toBeGreaterThanOrEqual(0)
      }
    }
    audit('NO_NEGATIVE_MATERIAL', { scenarios: CORE_SCENARIOS.length, ticks: CORE_TICKS })
  })
})

// ---------------------------------------------------------------------------
// §6 — The critical 24 / 25 experiment
// ---------------------------------------------------------------------------

describe('§6 — critical 24/25 equilibrium experiment', () => {
  it('candidate 1F+1W: gross 2, total upkeep 2, net exactly 0 at any stock', () => {
    const start = rowWorld({ residences: 2, farms: 1, workshops: 1, material: 0, food: 200 })
    const trace = runTrace(start, 40, true)
    const r = trace.records[0]!
    audit('CRITICAL_1F1W', {
      grossMaterial: r.materialProduction,
      farmUpkeep: r.farmUpkeep,
      workshopUpkeep: r.workshopUpkeep,
      totalUpkeep: r.totalUpkeep,
      netMaterial: r.materialProduction - r.totalUpkeep,
      materialTrace: trace.records.map((x) => x.material).slice(0, 5),
      materialAfter40: trace.state.resources.construction,
    })
    expect(r.materialProduction).toBe(2)
    expect(r.totalUpkeep).toBe(2)
    for (const record of trace.records) {
      expect(record.material).toBe(0)
    }
  })

  it('candidate 1F+1W from a 24 stock equilibrates at 23; the crest still allows a timed build', () => {
    const start = rowWorld({ residences: 2, farms: 1, workshops: 1, material: 24, food: 200 })
    const trace = runTrace(start, 40, true)
    audit('CRITICAL_1F1W_AT_24', {
      materialAfter40: trace.state.resources.construction,
      restEquilibrium: 23,
      crestEquilibrium: 25,
      note: 'near the 25 storage cap the clamp reduces stored production to 1, so upkeep 2 yields rest 23; phase 8a still crests 25 every tick',
    })
    // Near the cap the clamp cuts stored production: 24 -> 25 (crest) -> 23.
    expect(trace.state.resources.construction).toBe(23)
    expect(trace.records.every((r) => r.materialCrest === 25)).toBe(true)
    // On the crest tick, produceMaterial fills to 25 and applyCommand can
    // spend it in the SAME tick (08G phase 8a precedes 8b).
    const crest = stepWithMetrics(start, true, {
      type: 'placeBuilding',
      x: 9,
      y: 0,
      buildingType: 'residence',
    })
    expect(crest.state.buildings['building-5']).toBeDefined()
  })

  it('minimum accumulating configuration: W must exceed F', () => {
    const rows: unknown[] = []
    for (const [farms, workshops] of [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 2],
      [2, 3],
      [2, 4],
      [3, 3],
      [3, 4],
    ] as const) {
      const colonists = farms + workshops
      const start = rowWorld({
        residences: colonists,
        farms,
        workshops,
        material: 0,
        food: 2000,
      })
      const trace = runTrace(start, 60, true)
      const last = trace.records[59]!
      rows.push({
        farms,
        workshops: workshops,
        colonists,
        netPerTick: last.materialProduction - last.totalUpkeep,
        netPerTickAtStart: trace.records[0]!.materialProduction - trace.records[0]!.totalUpkeep,
        materialEnd: last.material,
        classification: classify(trace.records),
      })
    }
    audit('MIN_ACCUMULATION', rows)
    for (const row of rows as { farms: number; workshops: number; classification: string }[]) {
      if (row.workshops > row.farms) {
        expect(row.classification).toBe('GROWING')
      } else {
        expect(row.classification).toBe('MARGINALLY_STABLE')
      }
    }
  })

  it('2W+1F grows; 2W+2F is exactly net-zero (the structural Farm cost)', () => {
    const growStart = rowWorld({ residences: 3, farms: 1, workshops: 2, material: 0, food: 2000 })
    const grow = runTrace(growStart, 60, true)
    const flatStart = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0, food: 2000 })
    const flat = runTrace(flatStart, 60, true)
    audit('CRITICAL_2W1F_VS_2W2F', {
      twoWorkshopsOneFarm: {
        netPerTick: grow.records[0]!.materialProduction - grow.records[0]!.totalUpkeep,
        materialEnd: grow.state.resources.construction,
      },
      twoWorkshopsTwoFarms: {
        netPerTick: flat.records[0]!.materialProduction - flat.records[0]!.totalUpkeep,
        materialEnd: flat.state.resources.construction,
      },
    })
    expect(grow.records[0]!.materialProduction - grow.records[0]!.totalUpkeep).toBe(1)
    expect(flat.records[0]!.materialProduction - flat.records[0]!.totalUpkeep).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §7 — Construction stability
// ---------------------------------------------------------------------------

describe('§7 — construction stability (time-to-25)', () => {
  const ticksTo = (
    start: SimulationState,
    farmUpkeep: boolean,
    cap = 300
  ): number | null => {
    let state = start
    for (let tick = 0; tick < cap; tick += 1) {
      const result = stepWithMetrics(state, farmUpkeep)
      state = result.state
      if (result.metrics.materialCrest >= 25) return tick + 1
    }
    return null
  }

  it('measures time-to-25 for representative configurations', () => {
    const configs = [
      { name: '1W', residences: 1, farms: 0, workshops: 1 },
      { name: '1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '1F+2W', residences: 3, farms: 1, workshops: 2 },
      { name: '2F+2W', residences: 4, farms: 2, workshops: 2 },
      { name: '2F+3W', residences: 5, farms: 2, workshops: 3 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, material: 0, food: 2000 })
      out[config.name] = {
        baselineTicksTo25: ticksTo(start, false),
        candidateTicksTo25: ticksTo(start, true),
      }
    }
    audit('CONSTRUCTION_TIME_TO_25', out)
    // W <= F never reaches the build cost; W > F always does.
    expect(out['1F+1W']).toEqual({ baselineTicksTo25: expect.any(Number), candidateTicksTo25: null })
    expect(out['2F+2W']).toEqual({ baselineTicksTo25: expect.any(Number), candidateTicksTo25: null })
    expect((out['1F+2W'] as { candidateTicksTo25: number | null }).candidateTicksTo25).not.toBeNull()
    expect((out['2F+3W'] as { candidateTicksTo25: number | null }).candidateTicksTo25).not.toBeNull()
  })

  it('the candidate never makes an expanding configuration unable to expand', () => {
    // W > F always accumulates; W <= F never does. The dependency is exact.
    const out: Record<string, number | null> = {}
    for (const [farms, workshops] of [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 4],
    ] as const) {
      const start = rowWorld({
        residences: farms + workshops,
        farms,
        workshops,
        material: 0,
        food: 2000,
      })
      out[`F${farms}W${workshops}`] = ticksTo(start, true)
    }
    audit('CONSTRUCTION_EXPANSION_MATRIX', out)
    for (const [key, value] of Object.entries(out)) {
      const farms = Number(key.slice(1, key.indexOf('W')))
      const workshops = Number(key.slice(key.indexOf('W') + 1))
      if (workshops > farms) {
        expect(value).not.toBeNull()
      } else {
        expect(value).toBeNull()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §8 — Bootstrap experiment (real command chain, candidate rule)
// ---------------------------------------------------------------------------

interface BootstrapStep {
  readonly label: string
  readonly command: SimulationCommand | null
}

const BOOTSTRAP_SEQUENCE: readonly BootstrapStep[] = [
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

const bootstrapTrace = (farmUpkeep: boolean): Trace => {
  const start = withStocks(createAuditState(), { material: 100, food: 100 })
  return runCommands(start, farmUpkeep, BOOTSTRAP_SEQUENCE.map((s) => s.command))
}

describe('§8 — bootstrap experiment', () => {
  it('runs the earliest settlement sequence under both rules and answers the 7 questions', () => {
    const candidate = bootstrapTrace(true)
    const baseline = bootstrapTrace(false)
    const countType = (state: SimulationState, type: BuildingType): number =>
      Object.values(state.buildings).filter((b) => b.type === type).length
    const summarize = (trace: Trace, state: SimulationState): unknown =>
      trace.records.map((r, i) => ({
        step: BOOTSTRAP_SEQUENCE[i]!.label,
        tick: r.tick,
        pop: r.population,
        food: r.food,
        material: r.material,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        farmUpkeep: r.farmUpkeep,
        workshopUpkeep: r.workshopUpkeep,
        constructionAvailable: r.constructionAvailable,
      })).concat([{
        step: 'FINAL',
        tick: state.time.tick,
        pop: getPopulationCount(state),
        food: state.resources.food,
        material: state.resources.construction,
        staffedFarms: countStaffedOperationalFarms(state),
        staffedWorkshops: countStaffedOperationalWorkshops(state),
        farmUpkeep: 0,
        workshopUpkeep: 0,
        constructionAvailable: state.resources.construction >= 25,
      }])
    audit('BOOTSTRAP_CANDIDATE', summarize(candidate, candidate.state))
    audit('BOOTSTRAP_BASELINE', summarize(baseline, baseline.state))
    audit('BOOTSTRAP_ANSWERS', {
      firstFarmBuilt: countType(candidate.state, 'farm') >= 1,
      firstFarmStaffed: countStaffedOperationalFarms(candidate.state) === 1,
      firstWorkshopBuilt: countType(candidate.state, 'workshop') >= 1,
      bothMaintained: countStaffedOperationalFarms(candidate.state) +
        countStaffedOperationalWorkshops(candidate.state) === 1,
      secondWorkshopBuilt: countType(candidate.state, 'workshop') >= 2,
      secondFarmBuilt: countType(candidate.state, 'farm') >= 2,
      deadEnd:
        candidate.state.resources.construction < 25 &&
        !candidate.records[candidate.records.length - 1]!.constructionAvailable,
      candidateMaterialEnd: candidate.state.resources.construction,
      baselineMaterialEnd: baseline.state.resources.construction,
    })
    // The candidate drains the residual bootstrap stock to 0; the baseline
    // leaves it at rest below the 25 build cost. BOTH are stuck at the gap.
    expect(candidate.state.resources.construction).toBe(0)
    expect(baseline.state.resources.construction).toBeLessThan(25)
    expect(getPopulationCount(candidate.state)).toBe(1)
  })

  it('a two-Workshop bootstrap still escapes under the candidate', () => {
    const commands: readonly (SimulationCommand | null)[] = [
      { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' },
      { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
      { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' },
      { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' },
      { type: 'placeBuilding', x: 3, y: 2, buildingType: 'workshop' },
      ...Array.from({ length: 40 }, () => null),
    ]
    const start = withStocks(createAuditState(), { material: 100, food: 100 })
    const trace = runCommands(start, true, commands)
    audit('BOOTSTRAP_TWO_WORKSHOPS', {
      tickAfterBuild3: trace.records[4]!.material,
      staffedWorkshops: trace.records[4]!.staffedWorkshops,
      netPerTick: trace.records[4]!.materialProduction - trace.records[4]!.totalUpkeep,
      materialAfter45Ticks: trace.state.resources.construction,
      constructionAvailable: trace.state.resources.construction >= 25,
    })
    expect(trace.records[4]!.staffedWorkshops).toBe(1)
    expect(trace.records[4]!.materialProduction - trace.records[4]!.totalUpkeep).toBe(1)
    expect(trace.state.resources.construction).toBeGreaterThanOrEqual(25)
  })
})

// ---------------------------------------------------------------------------
// §9 — Food starvation interaction
// ---------------------------------------------------------------------------

describe('§9 — Food starvation interaction', () => {
  it('low Food starves the colony regardless of Material (loop is one-directional)', () => {
    // 1 Farm cannot feed 3 colonists: net Food -1/tick. Food 4 -> starvation.
    const candidateStart = rowWorld({
      residences: 3,
      farms: 1,
      workshops: 2,
      material: 100,
      food: 4,
    })
    const baselineStart = rowWorld({
      residences: 3,
      farms: 1,
      workshops: 2,
      material: 100,
      food: 4,
    })
    const candidate = runTrace(candidateStart, 20, true)
    const baseline = runTrace(baselineStart, 20, false)
    audit('FOOD_LOW_CANDIDATE', {
      foodTrace: candidate.records.map((r) => r.food),
      materialTrace: candidate.records.map((r) => r.material),
      populationTrace: candidate.records.map((r) => r.population),
      starvationTick: candidate.records.find((r) => r.foodShortage)?.tick ?? null,
      staffedEnd: candidate.records[19]!.staffedFarms + candidate.records[19]!.staffedWorkshops,
    })
    audit('FOOD_LOW_BASELINE', {
      starvationTick: baseline.records.find((r) => r.foodShortage)?.tick ?? null,
      populationEnd: baseline.records[19]!.population,
    })
    // Same starvation tick in both worlds: Farm upkeep does not feed anyone.
    expect(candidate.records.find((r) => r.foodShortage)?.tick).toBe(
      baseline.records.find((r) => r.foodShortage)?.tick
    )
    expect(candidate.records[19]!.population).toBe(0)
  })

  it('low Material cannot starve the colony: unpaid Farm upkeep has no production consequence', () => {
    const start = rowWorld({
      residences: 2,
      farms: 1,
      workshops: 1,
      material: 0,
      food: 50,
    })
    const trace = runTrace(start, 30, true)
    audit('MATERIAL_LOW_NO_STARVATION', {
      materialTrace: trace.records.slice(0, 4).map((r) => r.material),
      foodTrace: trace.records.slice(0, 4).map((r) => r.food),
      foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
      populationEnd: trace.records[29]!.population,
      farmStillStaffed: trace.records[29]!.staffedFarms,
      note: 'unpaid upkeep clamps to stock; it never disables a Farm or a worker',
    })
    expect(trace.records.filter((r) => r.foodShortage).length).toBe(0)
    expect(trace.records[29]!.population).toBe(2)
    expect(trace.records[29]!.staffedFarms).toBe(1)
  })

  it('the proposed chain Farm->Food->workers->Workshop->Material->Farm upkeep is ACYCLIC', () => {
    // Material shortfall cannot feed back into Food: the only consequence of
    // unpaid upkeep is a lower Material stock. Measured: a colony with 0
    // Material and a staffed Farm keeps producing Food indefinitely.
    const start = rowWorld({ residences: 2, farms: 1, workshops: 1, material: 0, food: 100 })
    const trace = runTrace(start, 40, true)
    const foodSlope =
      (trace.records[39]!.food - trace.records[0]!.food) / 40
    audit('LOOP_DIRECTIONALITY', {
      foodSlopePerTick: foodSlope,
      materialFloor: Math.min(...trace.records.map((r) => r.material)),
      materialCeiling: Math.max(...trace.records.map((r) => r.material)),
      conclusion: 'low Material does not reduce Food output or worker count',
    })
    expect(foodSlope).toBe(0)
    expect(trace.records[39]!.population).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §10 — Worker competition under symmetric upkeep
// ---------------------------------------------------------------------------

describe('§10 — worker competition under symmetric upkeep', () => {
  it('makes the Farm vs Workshop fork genuinely two-sided', () => {
    const paired = (first: 'farm' | 'workshop'): SimulationState => {
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
    const farmBranch = runTrace(paired('farm'), 1, true).records[0]!
    const shopBranch = runTrace(paired('workshop'), 1, true).records[0]!
    audit('FORK_TWO_SIDED', {
      farmStaffed: {
        farmWorkers: farmBranch.staffedFarms,
        shopWorkers: farmBranch.staffedWorkshops,
        foodProduction: farmBranch.foodProduction,
        materialProduction: farmBranch.materialProduction,
        totalUpkeep: farmBranch.totalUpkeep,
        netMaterial: farmBranch.materialProduction - farmBranch.totalUpkeep,
      },
      workshopStaffed: {
        farmWorkers: shopBranch.staffedFarms,
        shopWorkers: shopBranch.staffedWorkshops,
        foodProduction: shopBranch.foodProduction,
        materialProduction: shopBranch.materialProduction,
        totalUpkeep: shopBranch.totalUpkeep,
        netMaterial: shopBranch.materialProduction - shopBranch.totalUpkeep,
      },
    })
    // Candidate opportunity cost: Farm = +2 Food AND -1 Material; Workshop =
    // +2 Material AND -1 Material. Both branches now pay Material.
    expect(farmBranch.totalUpkeep).toBe(1)
    expect(farmBranch.foodProduction).toBe(2)
    expect(shopBranch.totalUpkeep).toBe(1)
    expect(shopBranch.materialProduction).toBe(2)
  })

  it('runs the four mandated competition scenarios', () => {
    const scenarios = [
      { name: '1c 1F+1W', residences: 1, farms: 1, workshops: 1 },
      { name: '2c 1F+1W', residences: 2, farms: 1, workshops: 1 },
      { name: '2c 2F+1W', residences: 2, farms: 2, workshops: 1 },
      { name: '2c 1F+2W', residences: 2, farms: 1, workshops: 2 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const scenario of scenarios) {
      const start = rowWorld({ ...scenario, material: 10, food: 200 })
      const r = runTrace(start, 1, true).records[0]!
      out[scenario.name] = {
        colonists: r.colonists,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        unemployed: r.unemployed,
        foodProduction: r.foodProduction,
        materialProduction: r.materialProduction,
        totalUpkeep: r.totalUpkeep,
        netMaterial: r.materialProduction - r.totalUpkeep,
      }
    }
    audit('COMPETITION_SCENARIOS', out)
    // 1 colonist: exactly one workplace staffed and it pays 1 Material.
    expect((out['1c 1F+1W'] as { staffedFarms: number; staffedWorkshops: number }).staffedFarms +
      (out['1c 1F+1W'] as { staffedWorkshops: number }).staffedWorkshops).toBe(1)
    expect((out['1c 1F+1W'] as { totalUpkeep: number }).totalUpkeep).toBe(1)
    // 2 colonists + 1F+1W: both staffed, net Material 0.
    expect((out['2c 1F+1W'] as { totalUpkeep: number }).totalUpkeep).toBe(2)
    expect((out['2c 1F+1W'] as { netMaterial: number }).netMaterial).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §11 — Spatial preference
// ---------------------------------------------------------------------------

describe('§11 — spatial preference under the candidate', () => {
  /**
   * Identical topology, only the residence column moves two cells: it changes
   * which workplace (Farm or Workshop) is nearest, and therefore which
   * upkeep/output pair the colony gets. Both are distance 0 to their column.
   */
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

  it('the two-column move flips Food vs Material AND the Material upkeep', () => {
    const farmSelected = movedWorld(3)
    const shopSelected = movedWorld(5)
    const farmRun = runTrace(farmSelected, 40, true)
    const shopRun = runTrace(shopSelected, 40, true)
    audit('SPATIAL_TWO_COLUMN', {
      residenceAtFarmColumn: {
        staffedFarms: farmRun.records[0]!.staffedFarms,
        staffedWorkshops: farmRun.records[0]!.staffedWorkshops,
        foodAfter40: farmRun.records[39]!.food,
        materialAfter40: farmRun.records[39]!.material,
        totalUpkeep: farmRun.records[0]!.totalUpkeep,
        foodShortage: farmRun.records.some((r) => r.foodShortage),
      },
      residenceAtWorkshopColumn: {
        staffedFarms: shopRun.records[0]!.staffedFarms,
        staffedWorkshops: shopRun.records[0]!.staffedWorkshops,
        foodAfter40: shopRun.records[39]!.food,
        materialAfter40: shopRun.records[39]!.material,
        totalUpkeep: shopRun.records[0]!.totalUpkeep,
        foodShortage: shopRun.records.some((r) => r.foodShortage),
      },
    })
    expect(farmRun.records[0]!.totalUpkeep).toBe(1)
    expect(shopRun.records[0]!.totalUpkeep).toBe(1)
    expect(farmRun.records.some((r) => r.foodShortage)).toBe(false)
    expect(shopRun.records.some((r) => r.foodShortage)).toBe(true)
  })

  it('equal-distance id tie-break puts the upkeep on the farm, not the workshop', () => {
    const tie = (first: 'farm' | 'workshop'): SimulationState => {
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
    const farmFirst = runTrace(tie('farm'), 1, true).records[0]!
    const shopFirst = runTrace(tie('workshop'), 1, true).records[0]!
    audit('SPATIAL_ID_TIE', {
      farmCreatedFirst: {
        staffedFarms: farmFirst.staffedFarms,
        staffedWorkshops: farmFirst.staffedWorkshops,
        totalUpkeep: farmFirst.totalUpkeep,
        foodProduction: farmFirst.foodProduction,
        materialProduction: farmFirst.materialProduction,
      },
      workshopCreatedFirst: {
        staffedFarms: shopFirst.staffedFarms,
        staffedWorkshops: shopFirst.staffedWorkshops,
        totalUpkeep: shopFirst.totalUpkeep,
        foodProduction: shopFirst.foodProduction,
        materialProduction: shopFirst.materialProduction,
      },
    })
    // The tie-break decides the output mix; under the candidate BOTH mixes
    // pay exactly 1 upkeep, so the tie no longer changes the Material cost.
    expect(farmFirst.totalUpkeep).toBe(1)
    expect(shopFirst.totalUpkeep).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §12 — One-tick Food timing
// ---------------------------------------------------------------------------

describe('§12 — one-tick Food timing under the candidate', () => {
  it('Farm upkeep is charged on the staffing tick, one tick BEFORE the first Food arrives', () => {
    // Farm placed on tick T, operational on T+1. produceFood runs before
    // assignJobs, so the newly staffed Farm pays upkeep on T+1 but produces
    // nothing until T+2. Phase order is preserved (not reordered).
    const commands: readonly (SimulationCommand | null)[] = [
      { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' },
      { type: 'placeRoads', cells: [{ x: 1, y: 1 }] },
      { type: 'placeBuilding', x: 1, y: 2, buildingType: 'farm' },
      ...Array.from({ length: 5 }, () => null),
    ]
    const start = withStocks(createAuditState(), { material: 60, food: 10 })
    const trace = runCommands(start, true, commands)
    audit('TIMING_PHASE_ORDER', trace.records.map((r, i) => ({
      step: i < 3 ? ['place R', 'place road', 'place F'][i] : `tick ${i - 2}`,
      tick: r.tick,
      staffedFarms: r.staffedFarms,
      foodProduction: r.foodProduction,
      food: r.food,
      farmUpkeep: r.farmUpkeep,
      material: r.material,
    })))
    const operational = trace.records[3]!
    // T+1: staffed and charged upkeep, but zero Food produced yet.
    expect(operational.staffedFarms).toBe(1)
    expect(operational.foodProduction).toBe(0)
    expect(operational.farmUpkeep).toBe(1)
    const next = trace.records[4]!
    expect(next.foodProduction).toBe(2)
    expect(next.farmUpkeep).toBe(1)
  })

  it('the one-tick lead cannot create an artificial one-tick collapse', () => {
    // The only consequence of the lead is that a colony with exactly 1
    // Material at the moment the Farm is staffed loses that Material before
    // the Farm feeds it. Food is never affected: the lead is one tick, and
    // the Farm produces on the following tick regardless of Material.
    const start = rowWorld({ residences: 1, farms: 1, workshops: 0, material: 1, food: 3 })
    const trace = runTrace(start, 10, true)
    audit('TIMING_NO_ONE_TICK_COLLAPSE', {
      materialTrace: trace.records.map((r) => r.material),
      foodTrace: trace.records.map((r) => r.food),
      foodShortageTicks: trace.records.filter((r) => r.foodShortage).length,
      note: 'Food stays >= 0; the colony is fed because the Farm was already staffed before the first upkeep tick',
    })
    expect(trace.records.filter((r) => r.foodShortage).length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §13 — Expansion threshold analysis
// ---------------------------------------------------------------------------

describe('§13 — expansion threshold: minimum Workshops per Farm', () => {
  it('builds the mandated thresholds table', () => {
    const table = [0, 1, 2, 3].map((farms) => {
      let minimum: number | null = null
      for (let workshops = Math.max(0, farms - 1); workshops <= farms + 3; workshops += 1) {
        if (workshops === 0 && farms === 0) continue
        const start = rowWorld({
          residences: farms + workshops,
          farms,
          workshops,
          material: 0,
          food: 3000,
        })
        const trace = runTrace(start, 60, true)
        const last = trace.records[59]!
        const maxCrest = Math.max(...trace.records.map((r) => r.materialCrest))
        const net = last.materialProduction - last.totalUpkeep
        if (net >= 0 && maxCrest >= 25) {
          minimum = workshops
          break
        }
      }
      return { farms, minimumWorkshopsForAccumulation: minimum }
    })
    audit('EXPANSION_THRESHOLD_TABLE', table)
    expect(table).toEqual([
      { farms: 0, minimumWorkshopsForAccumulation: 1 },
      { farms: 1, minimumWorkshopsForAccumulation: 2 },
      { farms: 2, minimumWorkshopsForAccumulation: 3 },
      { farms: 3, minimumWorkshopsForAccumulation: 4 },
    ])
  })

  it('converts the threshold into worker requirements (one worker per workplace)', () => {
    const rows = [0, 1, 2, 3].map((farms) => {
      const workshops = farms + 1
      const workers = farms + workshops
      return { farms, workshops, requiredWorkers: workers, netMaterialPerTick: workshops - farms }
    })
    audit('EXPANSION_WORKER_REQUIREMENTS', rows)
    expect(rows).toEqual([
      { farms: 0, workshops: 1, requiredWorkers: 1, netMaterialPerTick: 1 },
      { farms: 1, workshops: 2, requiredWorkers: 3, netMaterialPerTick: 1 },
      { farms: 2, workshops: 3, requiredWorkers: 5, netMaterialPerTick: 1 },
      { farms: 3, workshops: 4, requiredWorkers: 7, netMaterialPerTick: 1 },
    ])
  })
})

// ---------------------------------------------------------------------------
// §14 — Death spiral test
// ---------------------------------------------------------------------------

describe('§14 — death spiral test (low Material, candidate ON)', () => {
  const configs = [
    { name: 'M1 1F+1W', residences: 2, farms: 1, workshops: 1 },
    { name: 'M1 2F+1W', residences: 3, farms: 2, workshops: 1 },
    { name: 'M1 1F+2W', residences: 3, farms: 1, workshops: 2 },
    { name: 'M0 2F+2W', residences: 4, farms: 2, workshops: 2 },
  ] as const

  it('runs 60 ticks from Material = 1 and reports capacity retention', () => {
    const out: Record<string, unknown> = {}
    for (const config of configs) {
      const start = rowWorld({ ...config, material: 1, food: 4000 })
      const trace = runTrace(start, 60, true)
      const first = trace.records[0]!
      const last = trace.records[59]!
      out[config.name] = {
        materialStart: first.material,
        materialMin: Math.min(...trace.records.map((r) => r.material)),
        materialEnd: last.material,
        totalUpkeepPerTick: first.totalUpkeep,
        staffedStart: first.staffedFarms + first.staffedWorkshops,
        staffedEnd: last.staffedFarms + last.staffedWorkshops,
        capacityLost:
          last.staffedFarms + last.staffedWorkshops <
          first.staffedFarms + first.staffedWorkshops,
        populationEnd: last.population,
        classification: classify(trace.records),
      }
    }
    audit('DEATH_SPIRAL', out)
    // No config loses productive capacity: upkeep never deactivates anything.
    for (const config of configs) {
      const entry = out[config.name] as { capacityLost: boolean; materialMin: number }
      expect(entry.capacityLost).toBe(false)
      expect(entry.materialMin).toBeGreaterThanOrEqual(0)
    }
  })

  it('shows the exact floor: W>F recovers, W<=F floors at 0', () => {
    const floorOf = (farms: number, workshops: number): number => {
      const start = rowWorld({
        residences: farms + workshops,
        farms,
        workshops,
        material: 1,
        food: 4000,
      })
      const trace = runTrace(start, 60, true)
      return trace.records[59]!.material
    }
    const floors = {
      F1W2: floorOf(1, 2),
      F1W1: floorOf(1, 1),
      F2W1: floorOf(2, 1),
      F2W2: floorOf(2, 2),
    }
    audit('DEATH_SPIRAL_FLOORS', floors)
    expect(floors.F1W2).toBeGreaterThan(1)
    expect(floors.F1W1).toBe(1)
    expect(floors.F2W1).toBe(0)
    expect(floors.F2W2).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §15 — Recovery test
// ---------------------------------------------------------------------------

describe('§15 — recovery test', () => {
  it('distinguishes irreversible collapse from recoverable shortage', () => {
    const recover = (farms: number, workshops: number): unknown => {
      const start = rowWorld({
        residences: farms + workshops,
        farms,
        workshops,
        material: 0,
        food: 4000,
      })
      const trace = runTrace(start, 60, true)
      const end = trace.records[59]!
      return {
        netPerTick: end.materialProduction - end.totalUpkeep,
        materialEnd: end.material,
        recovered: end.material > 0,
      }
    }
    const out = {
      F1W1: recover(1, 1),
      F2W1: recover(2, 1),
      F1W2: recover(1, 2),
      F2W3: recover(2, 3),
    }
    audit('RECOVERY_FROM_ZERO', out)
    expect((out.F1W1 as { recovered: boolean }).recovered).toBe(false)
    expect((out.F2W1 as { recovered: boolean }).recovered).toBe(false)
    expect((out.F1W2 as { recovered: boolean }).recovered).toBe(true)
    expect((out.F2W3 as { recovered: boolean }).recovered).toBe(true)
  })

  it('existing player actions can recover a positive-but-trapped colony, not a zero one', () => {
    // Case A: stock 24, W=F (trap below the build cost at rest). The crest
    // tick of 08G lets the player build a Workshop, escaping by player action.
    const trapped = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 24, food: 500 })
    const crest = stepWithMetrics(trapped, true, {
      type: 'placeBuilding',
      x: 15,
      y: 2,
      buildingType: 'workshop',
    })
    audit('RECOVERY_PLAYER_ACTION', {
      beforeMaterial: trapped.resources.construction,
      afterBuildMaterial: crest.state.resources.construction,
      workshopBuilt: Object.values(crest.state.buildings).some(
        (b) => b.type === 'workshop' && b.x === 15 && b.y === 2
      ),
    })
    expect(Object.values(crest.state.buildings).some((b) => b.x === 15 && b.y === 2)).toBe(true)

    // Case B: stock 0, W=F (no material for any command). No recovery path
    // exists: no demolish, no unassign, no free capacity change.
    const dead = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0, food: 500 })
    const rejected = stepWithMetrics(dead, true, {
      type: 'placeBuilding',
      x: 15,
      y: 2,
      buildingType: 'workshop',
    })
    expect(Object.values(rejected.state.buildings).some((b) => b.x === 15 && b.y === 2)).toBe(false)
    audit('RECOVERY_IRREVERSIBLE', {
      material: dead.resources.construction,
      buildAccepted: false,
      note: 'no demolish and no unassign exist; W<=F at zero Material is terminal',
    })
  })
})

// ---------------------------------------------------------------------------
// §16 — Candidate classification (measured, not asserted subjectively)
// ---------------------------------------------------------------------------

describe('§16 — candidate classification evidence', () => {
  it('aggregates the evidence used for the final classification', () => {
    const scenarios = CORE_SCENARIOS.map((scenario) => {
      const start = rowWorld({ ...scenario, material: 10, food: 1000 })
      const candidate = runTrace(start, CORE_TICKS, true)
      const baseline = runTrace(start, CORE_TICKS, false)
      const first = candidate.records[0]!
      return {
        name: scenario.name,
        netMaterialPerTick: first.materialProduction - first.totalUpkeep,
        candidateClass: classify(candidate.records),
        baselineClass: classify(baseline.records),
        candidateMaterialEnd: candidate.records[CORE_TICKS - 1]!.material,
        baselineMaterialEnd: baseline.records[CORE_TICKS - 1]!.material,
      }
    })
    const regressions = scenarios.filter((s) => s.candidateClass !== s.baselineClass)
    const traps = scenarios.filter((s) => s.candidateClass === 'MARGINALLY_STABLE')
    audit('CLASSIFICATION_EVIDENCE', {
      scenarios,
      regressedScenarios: regressions.map((s) => s.name),
      trappedScenarios: traps.map((s) => s.name),
      collapses: scenarios.filter((s) => s.candidateClass === 'COLLAPSING').length,
      booms: scenarios.filter((s) => s.candidateClass === 'BOOM_BUST').length,
    })
    expect(regressions.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §21 — Performance (audit harness measured separately)
// ---------------------------------------------------------------------------

describe('§21 — audit harness performance (separate from production)', () => {
  it('benchmarks the candidate harness against the production tick', () => {
    const world = rowWorld({ residences: 8, farms: 4, workshops: 4, material: 0, food: 5000 })
    const measureTicks = (farmUpkeep: boolean, ticks: number): number => {
      const start = performance.now()
      let state = world
      for (let i = 0; i < ticks; i += 1) {
        state = farmUpkeep
          ? stepWithMetrics(state, true).state
          : stepSimulation(state)
      }
      return performance.now() - start
    }
    const productionMs = measureTicks(false, 200)
    const candidateMs = measureTicks(true, 200)
    audit('PERF_HARNESS_VS_PRODUCTION', {
      production200TicksMs: Number(productionMs.toFixed(2)),
      candidate200TicksMs: Number(candidateMs.toFixed(2)),
      perTickProductionMs: Number((productionMs / 200).toFixed(3)),
      perTickCandidateMs: Number((candidateMs / 200).toFixed(3)),
    })
    // The harness must not be pathologically slower than production.
    expect(candidateMs).toBeLessThan(productionMs * 5 + 50)
    expect(productionMs).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §22 — Persistence and determinism
// ---------------------------------------------------------------------------

describe('§22 — persistence and determinism (audit-only)', () => {
  it('SAVE_VERSION is 4 and no candidate state exists to persist', () => {
    expect(SAVE_VERSION).toBe(4)
    const state = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 20 })
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('farmUpkeep')
    expect(serialized).not.toContain('upkeep')
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    audit('PERSISTENCE', { saveVersion: SAVE_VERSION, newPersistedFields: 0 })
  })

  it('candidate replay is deterministic and hash-stable', () => {
    const run = (): SimulationState =>
      runTrace(rowWorld({ residences: 4, farms: 2, workshops: 3, material: 5 }), 60, true).state
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    audit('DETERMINISM', { hash: hashCanonicalState(a) })
  })

  it('the production pipeline is unchanged: baseline replay equals stepSimulation replay', () => {
    const start = rowWorld({ residences: 4, farms: 2, workshops: 3, material: 5 })
    const harness = runTrace(start, 60, false).state
    const production = advance(start, 60)
    expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
    audit('PRODUCTION_UNCHANGED', { identical: true })
  })
})
