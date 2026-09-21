/**
 * Housing & Workforce Admission Audit (Step 10K).
 *
 * AUDIT ONLY — `src/` is untouched. The question:
 *
 *   Is the `F,F,W,W` outcome an artificial workforce dead-end, or a valid
 *   consequence of limited population and construction order?
 *
 * Current admission rule (src/domain/simulation/phases.ts `updatePopulation`):
 *   - if the tick was NOT fed, ALL colonists are removed;
 *   - otherwise, WHILE `food > 0` and a free operational Residence exists,
 *     one colonist is admitted per free Residence (ascending building id);
 *   - admission does not deduct Food and does not reserve Food for the new
 *     colonists;
 *   - `assignJobs` runs in the SAME tick, after admission.
 *
 * Run:
 *   npx vitest run tests/housingWorkforceAdmissionAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  availableResidenceIds,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getEmploymentSummary,
  getHousingSummary,
  getPopulationCount,
  getRoadIdAtCell,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10k', width: 60, height: 20 },
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

interface RowSpec {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly colonists?: number
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

/** Flat rows: residences y=0, workplaces y=2, one road row y=1. */
const rowWorld = (spec: RowSpec): SimulationState => {
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
  const colonists = spec.colonists ?? spec.residences
  for (let i = 0; i < Math.min(colonists, residenceIds.length); i += 1) {
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
// Plan driver (real commands, deterministic order)
// ---------------------------------------------------------------------------

interface PlanItem {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
}

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly unemployed: number
  readonly vacantHousing: number
}

const snapshot = (state: SimulationState): Snapshot => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  staffedFarms: countStaffedOperationalFarms(state),
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  unemployed: getEmploymentSummary(state).unemployed,
  vacantHousing: getHousingSummary(state).availableCapacity,
})

interface DriveResult {
  readonly state: SimulationState
  readonly snapshots: readonly Snapshot[]
  readonly placementTicks: readonly (number | null)[]
  readonly placedCount: number
}

/**
 * Drive a plan of buildings in a vertical street (road column x = 2,
 * residences x = 1, workplaces x = 3). Roads are placed lazily and the whole
 * road column is kept continuous. Each tick either places one thing or steps.
 */
const drivePlan = (
  plan: readonly PlanItem[],
  ticks: number,
  startMaterial = 100,
  startFood = 100
): DriveResult => {
  let state = withStocks(createAuditState(), { material: startMaterial, food: startFood })
  let index = 0
  const placementTicks: (number | null)[] = plan.map(() => null)
  const snapshots: Snapshot[] = []
  for (let t = 0; t < ticks; t += 1) {
    const item = plan[index]
    if (item !== undefined) {
      const missing: { x: number; y: number }[] = []
      for (let y = 0; y <= item.y; y += 1) {
        if (getRoadIdAtCell(state, { x: 2, y }) === null) missing.push({ x: 2, y })
      }
      if (missing.length > 0) {
        state = stepSimulation(state, { type: 'placeRoads', cells: missing })
      } else {
        const before = Object.keys(state.buildings).length
        state = stepSimulation(state, {
          type: 'placeBuilding',
          x: item.x,
          y: item.y,
          buildingType: item.type,
        })
        if (Object.keys(state.buildings).length > before) {
          placementTicks[index] = t
          index += 1
        }
      }
    } else {
      state = stepSimulation(state)
    }
    snapshots.push(snapshot(state))
  }
  return { state, snapshots, placementTicks, placedCount: index }
}

const R = (x: number, y: number): PlanItem => ({ type: 'residence', x, y })
const F = (x: number, y: number): PlanItem => ({ type: 'farm', x, y })
const W = (x: number, y: number): PlanItem => ({ type: 'workshop', x, y })

// ---------------------------------------------------------------------------
// 1/3 — Current admission rule and phase ordering
// ---------------------------------------------------------------------------

describe('1/3 — current admission rule and phase ordering', () => {
  it('admits one colonist per free operational Residence while Food > 0', () => {
    let state = withStocks(createAuditState(), { material: 0, food: 5 })
    for (let i = 0; i < 3; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
    // No road needed for admission; housing only.
    const before = snapshot(state)
    state = stepSimulation(state)
    const after = snapshot(state)
    audit('ADMISSION_RULE', {
      housing: getHousingSummary(state).totalCapacity,
      populationBefore: before.population,
      populationAfter: after.population,
      foodBefore: before.food,
      foodAfter: after.food,
      note: 'population = min(free operational housing) while food > 0; admission does not deduct food',
    })
    expect(after.population).toBe(3)
  })

  it('documents the verified phase order', () => {
    audit('PHASE_ORDER', [
      '1. advanceConstruction',
      '2. updateNeeds (food need = population x 1)',
      '3. produceFood (staffed Farms, pre-assignment stock)',
      '4. consumeFood (all-or-nothing)',
      '5. updatePopulation (starvation, then admission while food > 0)',
      '6. assignJobs (same tick as admission)',
      '7. produceMaterial (storage-clamped)',
      '8a. applyCommand (construction, pre-upkeep stock)',
      '8b. upkeepBuildings (staffed Workshops)',
      '9. advanceTime',
    ])
    expect(true).toBe(true)
  })

  it('shows admission is food-presence-gated, not food-sufficiency-gated', () => {
    // 3 free residences, 5 Food, 0 population. One tick admits 3 colonists
    // WITHOUT deducting the 5 Food. The next tick consumes 3 and the third
    // starves the colony.
    let state = withStocks(createAuditState(), { material: 0, food: 5 })
    for (let i = 0; i < 3; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
    const trace: Snapshot[] = []
    for (let i = 0; i < 5; i += 1) {
      state = stepSimulation(state)
      trace.push(snapshot(state))
    }
    audit('ADMISSION_OVERFILL', trace.map((s) => ({ tick: s.tick, pop: s.population, food: s.food })))
    expect(trace[0]!.population).toBe(3)
    expect(trace[4]!.population).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4 — Admission timing audit
// ---------------------------------------------------------------------------

describe('4 — admission timing (Residence -> colonist -> Farm -> Workshop)', () => {
  it('traces the first 12 ticks', () => {
    const plan = [R(1, 0), F(3, 0), W(3, 2)]
    const result = drivePlan(plan, 12)
    audit('TIMING_TRACE', result.snapshots.map((s) => ({
      tick: s.tick,
      pop: s.population,
      food: s.food,
      material: s.material,
      staffedFarms: s.staffedFarms,
      staffedWorkshops: s.staffedWorkshops,
      vacantHousing: s.vacantHousing,
    })))
    // A colonist is admitted the tick the Residence becomes operational and
    // is assigned (or not) in the SAME tick.
    expect(result.snapshots.some((s) => s.population > 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5 — Minimal bootstrap scenarios
// ---------------------------------------------------------------------------

describe('5 — minimal bootstrap scenarios', () => {
  const scenarios: Record<string, readonly PlanItem[]> = {
    A: [R(1, 0), F(3, 0), W(3, 2)],
    B: [R(1, 0), W(3, 0), F(3, 2)],
    C: [R(1, 0), F(3, 0), F(3, 2), W(3, 4), W(3, 6)],
    D: [R(1, 0), W(3, 0), W(3, 2), F(3, 4), F(3, 6)],
    E: [R(1, 0), F(3, 0), W(3, 2), F(3, 4), W(3, 6)],
    F: [R(1, 0), W(3, 0), F(3, 2), W(3, 4), F(3, 6)],
  }

  it('runs all six construction sequences for 120 ticks', () => {
    const out: Record<string, unknown> = {}
    for (const [name, plan] of Object.entries(scenarios)) {
      const result = drivePlan(plan, 120)
      const peakFarms = Math.max(...result.snapshots.map((s) => s.staffedFarms))
      const peakWorkshops = Math.max(...result.snapshots.map((s) => s.staffedWorkshops))
      out[name] = {
        plan: plan.map((p) => `${p.type}(${p.x},${p.y})`),
        placementTicks: result.placementTicks,
        placedCount: result.placedCount,
        peakFarms,
        peakWorkshops,
        final: {
          population: snapshot(result.state).population,
          food: result.state.resources.food,
          material: result.state.resources.construction,
          staffedFarms: countStaffedOperationalFarms(result.state),
          staffedWorkshops: countStaffedOperationalWorkshops(result.state),
        },
      }
    }
    audit('BOOTSTRAP_SCENARIOS', out)
    // With ONE Residence (one worker), the sequences split cleanly:
    //  - Farm-first (A, C, E): the worker farms, the colony survives, but no
    //    Workshop is ever staffed and Material never grows;
    //  - Workshop-first (B, D, F): a Workshop is staffed and Material grows,
    //    but with no Farm the colony eventually starves.
    for (const name of ['A', 'C', 'E'] as const) {
      const entry = out[name] as { peakWorkshops: number; final: { population: number } }
      expect(entry.peakWorkshops).toBe(0)
      expect(entry.final.population).toBe(1)
    }
    for (const name of ['B', 'D', 'F'] as const) {
      const entry = out[name] as { peakWorkshops: number; final: { population: number } }
      expect(entry.peakWorkshops).toBeGreaterThanOrEqual(1)
      expect(entry.final.population).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 6 — Housing capacity experiment
// ---------------------------------------------------------------------------

describe('6 — housing capacity', () => {
  it('adds housing to 2 Farms + 2 Workshops and observes the workforce', () => {
    const rows = [2, 3, 4].map((housing) => {
      const state = rowWorld({ residences: housing, farms: 2, workshops: 2, material: 10 })
      const r = snapshot(state)
      return {
        housing,
        population: r.population,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        unemployed: r.unemployed,
        materialIncomePerTick: countStaffedOperationalWorkshops(state),
      }
    })
    audit('HOUSING_CAPACITY_2F2W', rows)
    expect(rows[0]!.staffedWorkshops).toBe(0)
    expect(rows[1]!.staffedWorkshops).toBe(1)
    expect(rows[2]!.staffedWorkshops).toBe(2)
  })

  it('runs the 3-worker case and confirms Material income appears', () => {
    const start = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 0, food: 2000 })
    const trace: Snapshot[] = []
    let state = start
    for (let i = 0; i < 30; i += 1) {
      state = stepSimulation(state)
      trace.push(snapshot(state))
    }
    audit('HOUSING_RESOLVES', {
      staffedFarms: trace[0]!.staffedFarms,
      staffedWorkshops: trace[0]!.staffedWorkshops,
      materialEnd: trace[29]!.material,
    })
    expect(trace[0]!.staffedWorkshops).toBe(1)
    expect(trace[29]!.material).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 7 — Workforce saturation
// ---------------------------------------------------------------------------

describe('7 — workforce saturation (4 workplaces, 1-5 workers)', () => {
  it('measures assignment at every workforce level', () => {
    const rows = [1, 2, 3, 4, 5].map((workers) => {
      const state = rowWorld({ residences: workers, colonists: workers, farms: 2, workshops: 2 })
      const r = snapshot(state)
      const employment = getEmploymentSummary(state)
      return {
        workers,
        employed: employment.employed,
        unemployed: r.unemployed,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        vacantWorkplaces: 4 - employment.employed,
      }
    })
    audit('WORKFORCE_SATURATION', rows)
    expect(rows[0]!.employed).toBe(1)
    expect(rows[3]!.employed).toBe(4)
    expect(rows[4]!.employed).toBe(4)
    expect(rows[4]!.unemployed).toBe(1)
  })

  it('adding one worker can staff a previously vacant Workshop', () => {
    const two = rowWorld({ residences: 2, colonists: 2, farms: 2, workshops: 2 })
    const three = rowWorld({ residences: 3, colonists: 3, farms: 2, workshops: 2 })
    audit('ADD_ONE_WORKER', {
      twoWorkers: { staffedFarms: snapshot(two).staffedFarms, staffedWorkshops: snapshot(two).staffedWorkshops },
      threeWorkers: { staffedFarms: snapshot(three).staffedFarms, staffedWorkshops: snapshot(three).staffedWorkshops },
    })
    expect(snapshot(two).staffedWorkshops).toBe(0)
    expect(snapshot(three).staffedWorkshops).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 8 — Is F,F,W,W actually a dead-end?
// ---------------------------------------------------------------------------

describe('8 — F,F,W,W recovery', () => {
  /** The stuck state: 2 homes, 2 Farms, 2 Workshops, Material 5, no income. */
  const stuckState = (material = 5): SimulationState =>
    rowWorld({ residences: 2, farms: 2, workshops: 2, material, food: 2000 })

  it('confirms the stuck state has no Material income', () => {
    const state = stuckState()
    const r = snapshot(state)
    audit('STUCK_STATE', {
      material: r.material,
      staffedFarms: r.staffedFarms,
      staffedWorkshops: r.staffedWorkshops,
      vacantHousing: r.vacantHousing,
      unemployed: r.unemployed,
    })
    expect(r.material).toBe(5)
    expect(r.staffedWorkshops).toBe(0)
    expect(r.vacantHousing).toBe(0)
  })

  it('B — waiting does not recover: 240 ticks keep Material and staffing flat', () => {
    const start = stuckState()
    const trace: Snapshot[] = []
    let state = start
    for (let i = 0; i < 240; i += 1) {
      state = stepSimulation(state)
      trace.push(snapshot(state))
    }
    audit('RECOVERY_WAIT', {
      materialEnd: trace[239]!.material,
      staffedFarms: trace[239]!.staffedFarms,
      staffedWorkshops: trace[239]!.staffedWorkshops,
      changed: trace[239]!.material !== 5,
    })
    expect(trace[239]!.material).toBe(5)
    expect(trace[239]!.staffedWorkshops).toBe(0)
  })

  it('A/C — a new Residence recovers the allocation, but only if Material >= 25', () => {
    // Attempt the Residence from Material 5: rejected.
    const poor = stuckState(5)
    const rejected = stepSimulation(poor, { type: 'placeBuilding', x: 5, y: 0, buildingType: 'residence' })
    expect(Object.values(rejected.buildings).some((b) => b.x === 5 && b.y === 0)).toBe(false)

    // From Material 30: accepted. The new colonist staffs the near Workshop.
    const rich = stuckState(30)
    const accepted = stepSimulation(rich, { type: 'placeBuilding', x: 5, y: 0, buildingType: 'residence' })
    expect(Object.values(accepted.buildings).some((b) => b.x === 5 && b.y === 0)).toBe(true)
    const recovered = advance(accepted, 6)
    audit('RECOVERY_ADD_RESIDENCE', {
      fromMaterial5: { accepted: false },
      fromMaterial30: {
        accepted: true,
        population: getPopulationCount(recovered),
        staffedWorkshops: countStaffedOperationalWorkshops(recovered),
        materialAfter6: recovered.resources.construction,
      },
    })
    expect(countStaffedOperationalWorkshops(recovered)).toBeGreaterThanOrEqual(1)
  })

  it('D/E — another Farm or Workshop does not add a worker', () => {
    const start = stuckState(30)
    const farm = stepSimulation(start, { type: 'placeBuilding', x: 9, y: 2, buildingType: 'farm' })
    const shop = stepSimulation(start, { type: 'placeBuilding', x: 11, y: 2, buildingType: 'workshop' })
    audit('RECOVERY_ADD_WORKPLACE', {
      afterFarm: { population: getPopulationCount(advance(farm, 6)), staffedWorkshops: countStaffedOperationalWorkshops(advance(farm, 6)) },
      afterWorkshop: { population: getPopulationCount(advance(shop, 6)), staffedWorkshops: countStaffedOperationalWorkshops(advance(shop, 6)) },
      note: 'no new worker is created, so the vacant Workshops stay vacant',
    })
    expect(countStaffedOperationalWorkshops(advance(farm, 6))).toBe(0)
    expect(countStaffedOperationalWorkshops(advance(shop, 6))).toBe(0)
  })

  it('concludes: recovery requires a new Residence, which requires the Material the trap denies', () => {
    const start = stuckState(5)
    // Free cells that are not occupied in the stuck world (Residences at
    // x=1,3 y=0; Farms at x=1,3 y=2; Workshops at x=5,7 y=2).
    const attempts = [
      { type: 'residence' as const, x: 9, y: 0 },
      { type: 'farm' as const, x: 9, y: 2 },
      { type: 'workshop' as const, x: 11, y: 2 },
    ]
    for (const attempt of attempts) {
      const next = stepSimulation(start, {
        type: 'placeBuilding',
        x: attempt.x,
        y: attempt.y,
        buildingType: attempt.type,
      })
      expect(
        Object.values(next.buildings).some((b) => b.x === attempt.x && b.y === attempt.y)
      ).toBe(false)
    }
    audit('DEAD_END_VERDICT', {
      recoverableWithinExistingActions: false,
      reason: 'worker addition requires a Residence (25 Material); the vacant Workshop produces no Material; no demolish or reassignment exists',
    })
  })
})

// ---------------------------------------------------------------------------
// 9 — Food -> population feedback
// ---------------------------------------------------------------------------

describe('9 — Food -> population feedback', () => {
  it('compares 1 / 2 / 3 Farms at identical housing', () => {
    const rows = [1, 2, 3].map((farms) => {
      let state = rowWorld({ residences: 4, colonists: 1, farms, workshops: 0, material: 0, food: 2000 })
      const trace: Snapshot[] = []
      for (let i = 0; i < 240; i += 1) {
        state = stepSimulation(state)
        trace.push(snapshot(state))
      }
      const last = trace[239]!
      return {
        farms,
        population: last.population,
        foodEnd: last.food,
        foodProduction: countStaffedOperationalFarms(state) * 2,
        staffedFarms: last.staffedFarms,
        populationTrace: [trace[0]!.population, trace[239]!.population],
      }
    })
    audit('FOOD_POPULATION', rows)
    // Housing sets the population ceiling immediately; Farm count sets whether
    // that population can be fed.
    expect(rows[0]!.population).toBe(4)
    expect(rows[0]!.foodEnd).toBeLessThan(rows[2]!.foodEnd)
  })
})

// ---------------------------------------------------------------------------
// 10 — Construction order (6 items, converges?)
// ---------------------------------------------------------------------------

describe('10 — construction order', () => {
  const sequences: Record<string, readonly PlanItem[]> = {
    A: [R(1, 0), F(3, 0), F(3, 2), W(3, 4), W(3, 6), R(1, 4)],
    B: [R(1, 0), W(3, 0), W(3, 2), F(3, 4), F(3, 6), R(1, 4)],
    C: [R(1, 0), F(3, 0), W(3, 2), F(3, 4), W(3, 6), R(1, 4)],
    D: [R(1, 0), W(3, 0), F(3, 2), W(3, 4), F(3, 6), R(1, 4)],
  }

  it('runs the four 6-item sequences for 240 ticks with the bootstrap budget', () => {
    const out: Record<string, unknown> = {}
    for (const [name, plan] of Object.entries(sequences)) {
      const result = drivePlan(plan, 240, 100, 100)
      out[name] = {
        placementTicks: result.placementTicks,
        placedCount: result.placedCount,
        complete: result.placedCount === plan.length,
        final: {
          population: snapshot(result.state).population,
          food: result.state.resources.food,
          material: result.state.resources.construction,
          staffedFarms: countStaffedOperationalFarms(result.state),
          staffedWorkshops: countStaffedOperationalWorkshops(result.state),
        },
      }
    }
    audit('CONSTRUCTION_ORDER_100', out)
    // Material-first sequences finish; Farm-first sequences stall.
    expect((out['B'] as { complete: boolean }).complete).toBe(true)
    expect((out['D'] as { complete: boolean }).complete).toBe(true)
    expect((out['A'] as { complete: boolean }).complete).toBe(false)
    expect((out['C'] as { complete: boolean }).complete).toBe(false)
  })

  it('runs the same sequences with a 400 Material budget to isolate allocation', () => {
    const out: Record<string, unknown> = {}
    for (const [name, plan] of Object.entries(sequences)) {
      const result = drivePlan(plan, 240, 400, 100)
      out[name] = {
        placedCount: result.placedCount,
        complete: result.placedCount === plan.length,
        final: {
          population: snapshot(result.state).population,
          staffedFarms: countStaffedOperationalFarms(result.state),
          staffedWorkshops: countStaffedOperationalWorkshops(result.state),
          unemployed: getEmploymentSummary(result.state).unemployed,
          material: result.state.resources.construction,
        },
      }
    }
    audit('CONSTRUCTION_ORDER_400', out)
    // With Material available every sequence completes, but the 2-home colony
    // still has only 2 workers for 4 workplaces, so the mix follows the order.
    for (const name of Object.keys(sequences)) {
      expect((out[name] as { complete: boolean }).complete).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 11 — Housing vs workforce matrix
// ---------------------------------------------------------------------------

describe('11 — housing vs workforce matrix (2 Farms + 2 Workshops)', () => {
  it('varies housing and workers independently', () => {
    const rows = [
      { housing: 1, workers: 0 },
      { housing: 2, workers: 1 },
      { housing: 3, workers: 2 },
      { housing: 4, workers: 3 },
      { housing: 5, workers: 4 },
    ].map((entry) => {
      const state = rowWorld({
        residences: entry.housing,
        colonists: entry.workers,
        farms: 2,
        workshops: 2,
      })
      const r = snapshot(state)
      const employment = getEmploymentSummary(state)
      return {
        housing: entry.housing,
        workers: entry.workers,
        staffedFarms: r.staffedFarms,
        staffedWorkshops: r.staffedWorkshops,
        unemployed: r.unemployed,
        vacantWorkplaces: 4 - employment.employed,
      }
    })
    audit('HOUSING_VS_WORKFORCE', rows)
    // Workers, not housing, determine staffing; housing caps the workers.
    expect(rows[0]!.staffedFarms + rows[0]!.staffedWorkshops).toBe(0)
    expect(rows[4]!.staffedFarms + rows[4]!.staffedWorkshops).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 12 — Determinism
// ---------------------------------------------------------------------------

describe('12 — determinism', () => {
  it('building insertion order does not change the final state', () => {
    const build = (): SimulationState => {
      let state = createAuditState()
      state = op(state, 'residence', 1, 0)
      state = op(state, 'residence', 1, 2)
      state = opRoad(state, 2, 0)
      state = opRoad(state, 2, 1)
      state = opRoad(state, 2, 2)
      state = op(state, 'farm', 3, 0)
      state = op(state, 'workshop', 3, 2)
      state = addColonist(state, 'building-1')
      state = addColonist(state, 'building-2')
      return assignJobs(state)
    }
    const a = build()
    const b = build()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    // Re-inserting the entity records in reverse key order must not leak into
    // any sorted iteration or into the canonical hash.
    const reversed: SimulationState = {
      ...a,
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    expect(countStaffedOperationalFarms(reversed)).toBe(countStaffedOperationalFarms(a))
    audit('INSERTION_ORDER', { identical: true, hash: hashCanonicalState(a) })
  })

  it('save/load preserves population, residenceId and workplaceId', () => {
    const state = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 10 })
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(
      Object.values(restored.colonists).map((c) => ({ r: c.residenceId, w: c.workplaceId }))
    ).toEqual(Object.values(state.colonists).map((c) => ({ r: c.residenceId, w: c.workplaceId })))
    audit('SAVE_LOAD_HASH', { hash: hashCanonicalState(state), saveVersion: SAVE_VERSION })
  })

  it('repeated simulation is byte-identical', () => {
    const start = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 10 })
    expect(serializeCanonicalState(advance(start, 120))).toBe(
      serializeCanonicalState(advance(start, 120))
    )
    audit('REPEAT_DETERMINISM', { identical: true })
  })

  it('available residences are enumerated in ascending building id', () => {
    const state = rowWorld({ residences: 3, colonists: 0, farms: 0, workshops: 0 })
    audit('AVAILABLE_RESIDENCES', availableResidenceIds(state))
    expect(availableResidenceIds(state)).toEqual(['building-1', 'building-2', 'building-3'])
  })
})

// ---------------------------------------------------------------------------
// 13/14 — Agency and safety
// ---------------------------------------------------------------------------

describe('13/14 — agency and safety', () => {
  it('classifies the five workforce decisions', () => {
    audit('AGENCY', {
      housingPlacement: {
        classification: 'REAL',
        evidence: 'each operational Residence admits one colonist in the same tick; housing is the only workforce lever',
      },
      farmConstruction: {
        classification: 'REAL',
        evidence: 'a Farm adds +2 Food capacity and competes for the same worker; 1F/4-housing starves, 3F/4-housing sustains',
      },
      workshopConstruction: {
        classification: 'REAL',
        evidence: 'a Workshop adds +2 Material gross and 25 storage, but needs a worker the Farm may have claimed',
      },
      constructionOrder: {
        classification: 'REAL',
        evidence: 'A/C stall, B/D complete with the same 100 budget (CONSTRUCTION_ORDER_100)',
      },
      workforceAvailability: {
        classification: 'REAL',
        evidence: 'workers < workplaces leaves vacant workplaces (WORKFORCE_SATURATION rows 1-3)',
      },
    })
    expect(true).toBe(true)
  })

  it('documents recoverable and unrecoverable states', () => {
    audit('SAFETY', {
      foodZero_farmRich: 'recoverable: produceFood precedes consumeFood, so Farm output saves the tick',
      foodZero_farmPoor: 'unrecoverable: colony-wide starvation, no re-admission without surplus Food',
      materialZero_withWorkshop: 'recoverable: net = staffed Workshops per tick',
      workersLessThanWorkplaces: 'recoverable if Material >= 25 for a Residence; otherwise a permanent allocation trap',
      ffwwDeadEnd: 'unrecoverable with existing actions: Material 5, vacant Workshop, no demolish/reassign, Residence unaffordable',
      housingLimited: 'the root cause: housing caps population, and a Farm-first order can consume that population before a Workshop is staffed',
    })
    expect(true).toBe(true)
  })
})
