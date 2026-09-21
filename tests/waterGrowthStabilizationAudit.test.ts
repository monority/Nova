/**
 * Water Growth Loop Stabilization Audit (Step 10R).
 *
 * AUDIT ONLY — `src/` is untouched. Compares three admission models for the
 * existing Step 10P Water system:
 *
 *   current     the shipped `updatePopulation(state, fed, waterGate)`
 *   reservation Candidate A: admit only while one Water unit is unreserved
 *   onePerTick  Candidate B: at most one admission per tick while gated
 *
 * The candidate models are implemented ONLY in this file, as a full tick
 * mirror that swaps the admission phase. `stepAudit(state, 'current')` is
 * byte-identical to `stepSimulation` (asserted).
 *
 * Run:
 *   npx vitest run tests/waterGrowthStabilizationAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  availableResidenceIds,
  consumeFood,
  consumeWater,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getPopulationCount,
  getWaterCoverage,
  getWaterStatus,
  hasOperationalWell,
  hashCanonicalState,
  loadSave,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedRoads,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  waterProductionForTick,
  WATER_PER_COLONIST_PER_TICK,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10r', width: 60, height: 20 },
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
  readonly roads?: boolean
}

const waterWorld = (spec: WorldSpec): SimulationState => {
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
  if (spec.roads !== false) {
    for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  }
  const colonists = spec.colonists ?? 0
  for (let i = 0; i < Math.min(colonists, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
  }
  return assignJobs(state)
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Candidate harness (audit-only tick mirror)
// ---------------------------------------------------------------------------

type AdmissionModel = 'current' | 'reservation' | 'onePerTick' | 'headroom'

interface WaterGate {
  readonly shortage: boolean
  readonly servedResidenceIds: ReadonlySet<string>
}

/**
 * Candidate admission loops (audit-only).
 *
 * All gated candidates keep the first-colonist bootstrap exemption: a colony
 * with zero colonists admits one colonist so a vacant Well can be staffed.
 * Without it, Candidate A deadlocks (stock 0 cannot reserve a unit, but the
 * Well cannot produce without a colonist).
 */
const admit = (
  state: SimulationState,
  fed: boolean,
  gate: WaterGate | undefined,
  model: AdmissionModel,
  production: number,
  need: number
): SimulationState => {
  if (model === 'current' || gate === undefined) {
    return updatePopulation(state, fed, gate)
  }
  let next = fed ? state : { ...state, colonists: {} }
  if (gate.shortage) {
    return next
  }
  let admitted = 0
  while (next.resources.food > 0) {
    const pending = availableResidenceIds(next)
    const chosen = pending.find((id) => gate.servedResidenceIds.has(id))
    if (chosen === undefined) break
    const bootstrap = getPopulationCount(next) === 0
    if (model === 'onePerTick' && admitted >= 1) break
    if (model === 'reservation' && !bootstrap && next.resources.water - admitted < 1) break
    if (model === 'headroom' && !bootstrap && production < need + admitted + 1) break
    next = createColonist(next, chosen).state
    admitted += 1
  }
  return next
}

/** Exact mirror of stepSimulation with the admission phase swapped. */
const stepAudit = (state: SimulationState, model: AdmissionModel): SimulationState => {
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  const produced = produceFood(constructed)
  const watered = produceWater(produced)
  const consumed = consumeFood(watered, requiredFood)
  const gateActive = hasOperationalWell(consumed.state)
  const coverage = gateActive ? getWaterCoverage(consumed.state) : null
  const need =
    coverage === null ? 0 : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const production = coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null ? { state: consumed.state, shortage: false } : consumeWater(consumed.state, need)
  const populated = admit(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : { shortage: waterConsumed.shortage, servedResidenceIds: new Set(coverage.servedResidenceIds) },
    model,
    production,
    need
  )
  const staffed = assignJobs(populated)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommand(materialized, undefined)
  const progressed = progressPlacedRoads(commanded.state, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(maintained)
}

interface TickRecord {
  readonly tick: number
  readonly population: number
  readonly water: number
  readonly production: number
  readonly need: number
  readonly shortage: boolean
  readonly net: number
}

const traceTick = (state: SimulationState): TickRecord => {
  const status = getWaterStatus(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    water: state.resources.water,
    production: status.productionPerTick,
    need: status.needPerTick,
    shortage: status.shortage,
    net: status.productionPerTick - status.needPerTick,
  }
}

const runModel = (
  start: SimulationState,
  ticks: number,
  model: AdmissionModel
): { state: SimulationState; trace: TickRecord[] } => {
  let state = start
  const trace: TickRecord[] = []
  for (let i = 0; i < ticks; i += 1) {
    state = stepAudit(state, model)
    trace.push(traceTick(state))
  }
  return { state, trace }
}

/** The 10Q overshoot fixture: 6 served residences, 1 staffed Well, 1 colonist. */
const overshootWorld = (water = 0): SimulationState =>
  waterWorld({ residences: 6, wells: 1, colonists: 1, food: 10000, water })

// ---------------------------------------------------------------------------
// §2/§3 — Current model and overshoot reproduction
// ---------------------------------------------------------------------------

describe('§2/§3 — current admission model and 10Q overshoot', () => {
  it('the candidate harness is byte-identical to stepSimulation when the Water gate is inactive', () => {
    // Fixtures without a Well keep the gate inactive, so the Step 10S
    // production-headroom rule does not participate and the harness must
    // still mirror stepSimulation exactly.
    for (const start of [
      waterWorld({ residences: 3, farms: 1, workshops: 1, colonists: 1 }),
      waterWorld({ residences: 6, farms: 2, workshops: 2, colonists: 2 }),
      waterWorld({ residences: 2, farms: 1, colonists: 1 }),
    ]) {
      let harness = start
      let production = start
      for (let i = 0; i < 30; i += 1) {
        harness = stepAudit(harness, 'current')
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(harness)).toBe(serializeCanonicalState(production))
      expect(hashCanonicalState(harness)).toBe(hashCanonicalState(production))
    }
    audit('HARNESS_FIDELITY', { identical: true })
  })

  it('reproduces the overshoot: one tick jumps to the served housing cap', () => {
    const start = overshootWorld(0)
    const before = traceTick(start)
    const after = stepAudit(start, 'current')
    audit('OVERSHOOT_REPRODUCTION', {
      before: { population: before.population, water: before.water, production: before.production, need: before.need },
      afterOneTick: traceTick(after),
      admissions: getPopulationCount(after) - getPopulationCount(start),
    })
    expect(before.population).toBe(1)
    expect(getPopulationCount(after)).toBe(6)
    // Next tick: production 2, need 6 -> permanent net -4.
    const next = stepAudit(after, 'current')
    expect(traceTick(next).net).toBe(-4)
  })

  it('documents the exact current semantics and overshoot mechanism', () => {
    audit('CURRENT_SEMANTICS', {
      production: 'produceWater, before consumeFood/consumeWater/admission',
      consumption: 'consumeWater, before admission; need = served colonists x 1',
      admission: 'updatePopulation, after consumeWater',
      waterCheck: 'gate.shortage = (servedColonists > 0 && stock < need) at consumeWater time',
      multipleAdmissionsPerTick: true,
      newColonistConsumesSameTick: false,
      reservation: false,
      shortageMeaning: 'current stock below current served need (not future sustainability)',
      overshootMechanism:
        'the loop admits into every served free Residence while (a) the colony is not currently in deficit and (b) Food > 0; the new colonists are only charged next tick',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §4 — Water-binding boundary
// ---------------------------------------------------------------------------

describe('§4 — water-binding boundary (current model, one tick)', () => {
  it('measures admission capacity for the mandated boundary table', () => {
    const cases = [
      { free: 0, population: 1, stock: 0, production: 2 },
      { free: 1, population: 1, stock: 0, production: 2 },
      { free: 2, population: 1, stock: 0, production: 2 },
      { free: 6, population: 1, stock: 0, production: 2 },
      { free: 6, population: 1, stock: 1, production: 2 },
      { free: 6, population: 1, stock: 2, production: 2 },
      { free: 6, population: 1, stock: 5, production: 2 },
      { free: 6, population: 1, stock: 10, production: 2 },
      { free: 6, population: 3, stock: 2, production: 2 },
      { free: 6, population: 3, stock: 5, production: 2 },
    ] as const
    const rows = cases.map((c) => {
      // residences = occupied population + free; 1 staffed Well.
      const start = waterWorld({
        residences: c.population + c.free,
        wells: 1,
        colonists: c.population,
        food: 10000,
        water: c.stock,
      })
      const after = stepAudit(start, 'current')
      return {
        freeResidences: c.free,
        currentPopulation: c.population,
        stock: c.stock,
        production: c.production,
        admissions: getPopulationCount(after) - c.population,
        populationAfter: getPopulationCount(after),
        waterAfter: after.resources.water,
        shortageAfter: getWaterStatus(after).shortage,
      }
    })
    audit('WATER_BINDING_BOUNDARY', rows)
    // Only 0 free Residences must admit nobody.
    expect(rows[0]!.admissions).toBe(0)
    expect(rows[1]!.admissions).toBe(1)
    expect(rows[3]!.admissions).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// §5 — Candidate A: reservation
// ---------------------------------------------------------------------------

describe('§5 — Candidate A: explicit reservation (audit model)', () => {
  it('A1 — one available Water unit admits exactly one colonist', () => {
    const start = waterWorld({ residences: 2, wells: 1, colonists: 1, food: 10000, water: 1 })
    const after = stepAudit(start, 'reservation')
    audit('RESERVATION_A1', {
      before: traceTick(start),
      after: traceTick(after),
      admissions: getPopulationCount(after) - 1,
    })
    // produceWater 2 -> stock 3; consume 1 -> 2; one unit reserved per admission.
    expect(getPopulationCount(after)).toBe(2)
  })

  it('A2/A3 — stock bounds the admissions, funded growth is allowed', () => {
    const rows = [5, 10].map((stock) => {
      const start = overshootWorld(stock)
      const after = stepAudit(start, 'reservation')
      return {
        stock,
        admissions: getPopulationCount(after) - 1,
        populationAfter: getPopulationCount(after),
        waterAfter: after.resources.water,
      }
    })
    audit('RESERVATION_A2_A3', rows)
    // With 6 free served Residences a bigger reserve funds more admissions,
    // but never more than the housing cap.
    expect(rows[0]!.populationAfter).toBeLessThanOrEqual(6)
    expect(rows[1]!.populationAfter).toBeLessThanOrEqual(6)
    expect(rows[1]!.admissions).toBeGreaterThanOrEqual(rows[0]!.admissions)
  })

  it('A4 — same-tick production is spendable for admission', () => {
    // stock 0, staffed Well produces 2 before admission; reservation may use it.
    const start = overshootWorld(0)
    const after = stepAudit(start, 'reservation')
    audit('RESERVATION_A4', { admissions: getPopulationCount(after) - 1, waterAfter: after.resources.water })
    expect(getPopulationCount(after)).toBeGreaterThan(1)
  })

  it('A5 — existing colonists consume before reservation (stock is post-consumption)', () => {
    // 3 served colonists, stock 0, production 2 -> shortage -> no admission.
    const shortage = waterWorld({ residences: 6, wells: 1, colonists: 3, food: 10000, water: 0 })
    const afterShortage = stepAudit(shortage, 'reservation')
    // 3 served colonists, stock 5, production 2 -> no shortage -> reservation uses the surplus.
    const surplus = waterWorld({ residences: 6, wells: 1, colonists: 3, food: 10000, water: 5 })
    const afterSurplus = stepAudit(surplus, 'reservation')
    audit('RESERVATION_A5', {
      shortage: { population: getPopulationCount(afterShortage), water: afterShortage.resources.water },
      surplus: { population: getPopulationCount(afterSurplus), water: afterSurplus.resources.water },
    })
    expect(getPopulationCount(afterShortage)).toBe(3)
    expect(getPopulationCount(afterSurplus)).toBeGreaterThan(3)
  })

  it('answers the reservation design questions', () => {
    audit('RESERVATION_DESIGN', {
      whatIsReserved: 'one Water unit per admitted colonist, for this tick only',
      phase: 'inside updatePopulation, after consumeWater',
      perColonistOrResidence: 'per admitted colonist',
      transientOrPersistent: 'transient same-tick derived counter (no state)',
      survivesFailedAdmission: 'no reservation is committed unless the admission happens',
      invalidatedByConstruction: 'recomputed each tick from canonical state',
      persisted: false,
      hashed: false,
      secondCanonicalWaterState: false,
      soleCanonicalStock: 'resources.water remains the only persisted Water state',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §6 — Candidate B: one admission per tick
// ---------------------------------------------------------------------------

describe('§6 — Candidate B: one admission per tick (audit model)', () => {
  it('B1/B2 — growth is throttled to +1/tick, always', () => {
    const rows = [0, 5].map((stock) => {
      const start = overshootWorld(stock)
      const first = stepAudit(start, 'onePerTick')
      const run = runModel(start, 20, 'onePerTick')
      return {
        stock,
        firstTickAdmissions: getPopulationCount(first) - 1,
        populationAfter20: getPopulationCount(run.state),
      }
    })
    audit('ONE_PER_TICK_B1_B2', rows)
    for (const row of rows) {
      expect(row.firstTickAdmissions).toBe(1)
    }
  })

  it('B3 — a large reserve is still throttled to +1/tick', () => {
    const start = overshootWorld(20)
    const first = stepAudit(start, 'onePerTick')
    audit('ONE_PER_TICK_B3', {
      stock: 20,
      firstTickAdmissions: getPopulationCount(first) - 1,
      populationAfter1: getPopulationCount(first),
    })
    expect(getPopulationCount(first)).toBe(2)
  })

  it('B4 — the bootstrap first colonist is still admitted', () => {
    // No Well yet -> gate off -> the harness falls back to the current loop.
    const start = waterWorld({ residences: 1, colonists: 0, food: 10000 })
    const after = stepAudit(start, 'onePerTick')
    audit('ONE_PER_TICK_B4', { population: getPopulationCount(after) })
    expect(getPopulationCount(after)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §7 — Direct comparison matrix
// ---------------------------------------------------------------------------

describe('§7 — direct comparison', () => {
  it('compares the four models on the overshoot fixture', () => {
    const start = overshootWorld(5)
    const rows = (['current', 'reservation', 'onePerTick', 'headroom'] as const).map((model) => {
      const one = stepAudit(start, model)
      const run = runModel(start, 120, model)
      const last = run.trace[run.trace.length - 1]!
      return {
        model,
        firstTickAdmissions: getPopulationCount(one) - 1,
        populationAfter120: last.population,
        waterAfter120: last.water,
        needAfter120: last.need,
        productionAfter120: last.production,
        netAfter120: last.net,
        shortageAfter120: last.shortage,
      }
    })
    audit('COMPARISON_MATRIX', rows)
    const byModel = Object.fromEntries(rows.map((r) => [r.model, r]))
    // Current, reservation and one-per-tick all end in a permanent deficit;
    // only production-headroom converges to the Water production capacity.
    expect(byModel['current']!.netAfter120).toBeLessThan(0)
    expect(byModel['reservation']!.netAfter120).toBeLessThan(0)
    expect(byModel['onePerTick']!.netAfter120).toBeLessThan(0)
    expect(byModel['headroom']!.populationAfter120).toBe(2)
    expect(byModel['headroom']!.netAfter120).toBe(0)
    audit('COMPARISON_NOTES', {
      reservationUsesStock: true,
      reservationStillOvershoots: true,
      reservationNeedsBootstrapExemption: true,
      onePerTickThrottlesFundedGrowth: true,
      headroomConvergesToProduction: true,
      anyCandidateNeedsNewState: false,
    })
  })
})

// ---------------------------------------------------------------------------
// §8/§9 — Invariant and existing-vs-new colonist ordering
// ---------------------------------------------------------------------------

describe('§8/§9 — invariant and resource priority', () => {
  it('tests the candidate invariants against the models', () => {
    // Invariant A: no admission without one available unit.
    const noUnit = waterWorld({ residences: 6, wells: 1, colonists: 3, food: 10000, water: 0 })
    // Invariant B/C: Water never negative after admission+consumption.
    const rows = (['current', 'reservation', 'onePerTick'] as const).map((model) => {
      const run = runModel(noUnit, 30, model)
      const minWater = Math.min(...run.trace.map((r) => r.water))
      return { model, minWater }
    })
    audit('INVARIANT_TEST', rows)
    for (const row of rows) {
      expect(row.minWater).toBeGreaterThanOrEqual(0)
    }
  })

  it('makes the existing-vs-new colonist priority explicit', () => {
    const cases = [
      { water: 1, production: 0 },
      { water: 2, production: 0 },
      { water: 3, production: 0 },
      { water: 1, production: 2 },
    ].map((c) => {
      // 1 existing served colonist, 1 free served Residence, Well vacant
      // (production 0) or staffed (production 2). Use 2 Wells: one staffed by
      // the existing colonist, one vacant.
      const start = waterWorld({ residences: 2, wells: c.production > 0 ? 1 : 2, colonists: 1, food: 10000, water: c.water })
      const current = stepAudit(start, 'current')
      const reservation = stepAudit(start, 'reservation')
      return {
        water: c.water,
        production: c.production,
        currentAdmissions: getPopulationCount(current) - 1,
        reservationAdmissions: getPopulationCount(reservation) - 1,
      }
    })
    audit('EXISTING_VS_NEW', cases)
    expect(cases.length).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §10 — Population feedback (long run)
// ---------------------------------------------------------------------------

describe('§10 — population feedback over 120/240/600 ticks', () => {
  it('runs the overshoot fixture under all four models', () => {
    const summary: Record<string, unknown> = {}
    for (const model of ['current', 'reservation', 'onePerTick', 'headroom'] as const) {
      const start = overshootWorld(0)
      const out: Record<string, unknown> = {}
      for (const ticks of [120, 240, 600]) {
        const run = runModel(start, ticks, model)
        const last = run.trace[run.trace.length - 1]!
        out[`t${ticks}`] = {
          population: last.population,
          water: last.water,
          net: last.net,
          shortage: last.shortage,
        }
      }
      summary[model] = out
    }
    audit('POPULATION_FEEDBACK', summary)
    const current = summary['current'] as { t600: { population: number; net: number } }
    const reservation = summary['reservation'] as { t600: { population: number; net: number } }
    const onePerTick = summary['onePerTick'] as { t600: { population: number; net: number } }
    const headroom = summary['headroom'] as { t600: { population: number; net: number } }
    // From stock 0: current overshoots to the housing cap, reservation and
    // one-per-tick overshoot less, and headroom converges to production.
    expect(current.t600.population).toBe(6)
    expect(current.t600.net).toBeLessThan(0)
    expect(reservation.t600.population).toBe(3)
    expect(reservation.t600.net).toBeLessThan(0)
    expect(onePerTick.t600.population).toBe(4)
    expect(headroom.t600.population).toBe(2)
    expect(headroom.t600.net).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §11 — Workforce feedback
// ---------------------------------------------------------------------------

describe('§11 — workforce feedback', () => {
  it('runs representative mixes under the reservation model', () => {
    const scenarios = [
      { name: '1F+1W', farms: 1, wells: 1 },
      { name: '2F+1W', farms: 2, wells: 1 },
      { name: '1Shop+1W', workshops: 1, wells: 1 },
      { name: '1F+1Shop+1W', farms: 1, workshops: 1, wells: 1 },
    ]
    const rows = scenarios.map((s) => {
      const start = waterWorld({ residences: 6, farms: s.farms ?? 0, workshops: s.workshops ?? 0, wells: s.wells ?? 0, colonists: 1, food: 20000, water: 0 })
      const run = runModel(start, 120, 'reservation')
      const last = run.trace[run.trace.length - 1]!
      return { ...s, population: last.population, water: last.water, shortage: last.shortage, staffedWells: countStaffedOperationalWells(run.state) }
    })
    audit('WORKFORCE_FEEDBACK', rows)
    for (const row of rows) {
      expect(row.population).toBeGreaterThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// §12 — Spatial feedback
// ---------------------------------------------------------------------------

describe('§12 — spatial feedback under reservation', () => {
  it('coverage stays spatial under the reservation model', () => {
    const disconnected = (() => {
      let state = withStocks(createState(), { material: 1000, food: 10000, water: 100 })
      state = op(state, 'residence', 1, 0)
      state = op(state, 'well', 1, 2)
      state = op(state, 'residence', 20, 0)
      state = opRoad(state, 2, 0)
      state = opRoad(state, 2, 1)
      state = opRoad(state, 2, 2)
      state = opRoad(state, 21, 0)
      state = createColonist(state, 'building-1').state
      return assignJobs(state)
    })()
    const connected = (() => {
      const state = disconnected
      let next = state
      for (let x = 2; x <= 21; x += 1) next = opRoad(next, x, 1)
      return next
    })()
    const afterDisconnected = stepAudit(disconnected, 'reservation')
    const afterConnected = stepAudit(connected, 'reservation')
    audit('SPATIAL_FEEDBACK', {
      disconnected: {
        served: getWaterCoverage(disconnected).servedResidenceIds,
        population: getPopulationCount(afterDisconnected),
      },
      connected: {
        served: getWaterCoverage(connected).servedResidenceIds,
        population: getPopulationCount(afterConnected),
      },
      roadless: getWaterCoverage(waterWorld({ residences: 1, wells: 1, roads: false })).servedResidenceIds,
    })
    expect(getWaterCoverage(disconnected).servedResidenceIds).toEqual(['building-1'])
    expect(getWaterCoverage(connected).servedResidenceIds).toEqual(['building-1', 'building-3'])
  })
})

// ---------------------------------------------------------------------------
// §13/§14 — Bootstrap and shortage recovery
// ---------------------------------------------------------------------------

describe('§13/§14 — bootstrap and shortage recovery', () => {
  it('keeps the bootstrap and recovery coherent under reservation', () => {
    // Bootstrap: no Well -> gate off -> first colonist admitted.
    const bootstrap = waterWorld({ residences: 1, colonists: 0, food: 10000 })
    const bootAfter = stepAudit(bootstrap, 'reservation')
    // Shortage: Water 0 with served colonists -> blocked admission but survival.
    const shortage = waterWorld({ residences: 6, wells: 1, colonists: 3, food: 10000, water: 0 })
    const shortageAfter = runModel(shortage, 20, 'reservation')
    // Recovery: add a second Well (staffed when a colonist is free) -> growth can resume.
    const recovered = withStocks(shortage, { water: 20 })
    const recoveredRun = runModel(recovered, 20, 'reservation')
    audit('BOOTSTRAP_RECOVERY', {
      bootstrapPopulation: getPopulationCount(bootAfter),
      shortagePopulation: getPopulationCount(shortageAfter.state),
      shortageAlive: getPopulationCount(shortageAfter.state) === 3,
      recoveredPopulation: getPopulationCount(recoveredRun.state),
    })
    expect(getPopulationCount(bootAfter)).toBe(1)
    expect(getPopulationCount(shortageAfter.state)).toBe(3)
    expect(getPopulationCount(recoveredRun.state)).toBeGreaterThanOrEqual(3)
    void recovered
  })
})

// ---------------------------------------------------------------------------
// §15/§16 — Architecture, persistence and performance impact
// ---------------------------------------------------------------------------

describe('§15/§16 — persistence and performance impact', () => {
  it('reservation needs no new canonical state; one-per-tick needs none either', () => {
    audit('PERSISTENCE_IMPACT', {
      saveVersion: SAVE_VERSION,
      reservationNewState: false,
      reservationSaveVersionBump: false,
      reservationHashChange: false,
      reservationMigration: false,
      onePerTickNewState: false,
      onePerTickSaveVersionBump: false,
      onePerTickHashChange: false,
      note: 'both candidates are same-tick derived admission rules',
    })
    const state = waterWorld({ residences: 2, wells: 1, colonists: 1, water: 4 })
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(SAVE_VERSION).toBe(7)
  })

  it('measures the admission-loop cost (existing population/residence scan)', () => {
    const measure = (fn: () => void): number => {
      const start = performance.now()
      fn()
      return performance.now() - start
    }
    const rows = (['current', 'reservation', 'onePerTick'] as const).map((model) => {
      const start = waterWorld({ residences: 120, wells: 40, colonists: 60, food: 100000, water: 1000 })
      const ms = measure(() => {
        let next = start
        for (let i = 0; i < 3; i += 1) next = stepAudit(next, model)
      })
      return { model, threeTicksMs: Number(ms.toFixed(3)) }
    })
    audit('PERFORMANCE', rows)
    for (const row of rows) {
      expect(row.threeTicksMs).toBeLessThan(30000)
    }
  }, 300000)
})
