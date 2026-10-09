/**
 * Material Demand & Phase 5 Service Audit (Step 10U).
 *
 * AUDIT ONLY — `src/` is untouched. Establishes the current Material loop,
 * measures whether its bounded surplus is actually a problem, and audits
 * two candidate next dependencies in audit-only mirrors:
 *
 *   Candidate A — ongoing Material demand (population-coupled / maintenance)
 *   Candidate B — Phase 5 essential service
 *
 * Run:
 *   npx vitest run tests/materialDemandPhase5Audit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  TAX_PER_INHABITANT_PER_TICK,

  collectRevenue,
  getCommerceRevenuePerTick,

  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  countOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getPopulationCount,
  getRoadIdAtCell,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  maintenanceDueForTick,
  produceFood,
  produceWater,
  progressPlacedRoads,
  SAVE_VERSION,
  serializeCanonicalState,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  payMaintenance,
  waterProductionForTick,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10u', width: 60, height: 20 },
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
    money: stocks.material ?? state.resources.money,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
    wood: 0,
    stone: 0,
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
    food: spec.food ?? 20000,
    material: spec.material ?? 0,
    // Step 10AD: workshops placed through the command path need the one-off
    // Water construction investment; these Material-audit fixtures seed it.
    water: spec.water ?? 10,
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
// Audit mirror (current tick + hypothetical Material demand)
// ---------------------------------------------------------------------------

interface MirrorOptions {
  /** Candidate A1: Material consumed per live colonist each tick. */
  readonly materialPerColonist?: number
  /** Candidate A2: Material consumed per operational building each tick. */
  readonly materialPerBuilding?: number
}

const stepMirror = (state: SimulationState, opts: MirrorOptions): SimulationState => {
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
  const funded = collectRevenue(staffed)
    // Hypothetical ongoing demand, applied at the existing upkeep position.
  let demanded = funded
  const extraDue =
    (opts.materialPerColonist ?? 0) * getPopulationCount(funded) +
    (opts.materialPerBuilding ?? 0) *
      Object.values(funded.buildings).filter((b) => b.status === 'operational').length
  if (extraDue > 0) {
    const paid = Math.min(funded.resources.money, extraDue)
    demanded = {
      ...funded,
      resources: { ...funded.resources, money: funded.resources.money - paid },
    }
  }
  const commanded = applyCommand(demanded, undefined)
  const progressed = progressPlacedRoads(commanded.state, commanded)
  const maintained = payMaintenance(progressed)
  return advanceTime(maintained)
}

const runMirror = (
  start: SimulationState,
  ticks: number,
  opts: MirrorOptions
): SimulationState => {
  let state = start
  for (let i = 0; i < ticks; i += 1) state = stepMirror(state, opts)
  return state
}

interface MaterialRecord {
  readonly tick: number
  readonly population: number
  readonly material: number
  readonly gross: number
  readonly upkeep: number
  readonly stored: number
  readonly maintenance: number
}

const record = (state: SimulationState): MaterialRecord => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  material: state.resources.money,
  gross: COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK * countStaffedOperationalFarmsWorkshops(state),
  upkeep: maintenanceDueForTick(state),
  stored: getCommerceRevenuePerTick(state),
  maintenance: maintenanceDueForTick(state),
})

const countStaffedOperationalFarmsWorkshops = (state: SimulationState): number => {
  let count = 0
  for (const b of Object.values(state.buildings)) {
    if (b.type !== 'workshop' || b.status !== 'operational') continue
    if (Object.values(state.colonists).some((c) => c.workplaceId === b.id)) count += 1
  }
  return count
}

// ---------------------------------------------------------------------------
// Construction-order driver (real commands)
// ---------------------------------------------------------------------------

interface PlanItem {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
}

const drivePlan = (
  plan: readonly PlanItem[],
  ticks: number,
  startMaterial = 300
): { placed: (number | null)[]; materialEnd: number; spent: number } => {
  // Step 10AD: the plans place a Workshop, which needs the one-off Water
  // construction investment. This Material-audit fixture seeds it.
  let state = withStocks(createState(), { food: 20000, material: startMaterial, water: 10 })
  let index = 0
  const placed: (number | null)[] = plan.map(() => null)
  let spent = 0
  for (let t = 0; t < ticks; t += 1) {
    const item = plan[index]
    if (item !== undefined) {
      const missing: { x: number; y: number }[] = []
      for (let y = 0; y <= item.y; y += 1) {
        if (getRoadIdAtCell(state, { x: 2, y }) === null) missing.push({ x: 2, y })
      }
      if (missing.length > 0) {
        const before = state.resources.money
        state = stepSimulation(state, { type: 'placeRoads', cells: missing })
        spent += before - state.resources.money
        continue
      }
      const before = Object.keys(state.buildings).length
      const beforeStock = state.resources.money
      state = stepSimulation(state, { type: 'placeBuilding', x: item.x, y: item.y, buildingType: item.type })
      if (Object.keys(state.buildings).length > before) {
        placed[index] = t
        spent += beforeStock - state.resources.money
        index += 1
      }
    } else {
      state = stepSimulation(state)
    }
  }
  return { placed, materialEnd: state.resources.money, spent }
}

// ---------------------------------------------------------------------------
// §3/§4 — Current Material loop and equilibrium
// ---------------------------------------------------------------------------

describe('§3/§4 — current Material loop and equilibrium', () => {
  it('documents the loop constants, revenue lift and W-scaling (Step001)', () => {
    const rows = [1, 2, 3].map((w) => {
      const start = world({ residences: w, workshops: w, colonists: w })
      const settled = advance(start, 200)
      const later = advance(start, 210)
      const stockEnd = settled.resources.money
      const growth = (later.resources.money - stockEnd) / 10
      // Revenue w taxes + 2w commerce; maintenance 2w buildings.
      const revenue = 3 * w
      const upkeep = 2 * w
      return {
        workshops: w,
        grossPerTick: COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK * w,
        revenuePerTick: revenue,
        upkeepPerTick: upkeep,
        netPerTick: revenue - upkeep,
        maintenance: maintenanceDueForTick(start),
        stockT200: stockEnd,
        measuredGrowthPerTick: growth,
      }
    })
    audit('MATERIAL_EQUILIBRIUM', rows)
    for (const row of rows) {
      expect(row.maintenance).toBe(2 * row.workshops)
      // No cap: unbounded linear accumulation at revenue − maintenance.
      expect(row.stockT200).toBe(200 * row.workshops)
      expect(row.measuredGrowthPerTick).toBe(row.netPerTick)
      expect(row.netPerTick).toBe(row.workshops)
    }
    audit('MATERIAL_LOOP', {
      gross: `${COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK} per connected Workshop`,
      revenue: `${TAX_PER_INHABITANT_PER_TICK} per inhabitant + commerce (Step001, uncapped)`,
      upkeep: `${MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK} per operational building`,
      net: 'taxes + commerce − maintenance (+1 per Workshop pair)',
      storage: 'no treasury cap; the hub buffers food and water only',
      money: '25 per building, 5 per road cell',
      negativeMaterial: 'impossible (deductions clamp; build rejected when unaffordable)',
      overflow: 'none — revenue always lands in full',
      spatial: 'Money itself is global; only Workshop COMMERCE is spatial',
      consumption: 'construction + building maintenance only',
    })
    expect(true).toBe(true)
  })

  it('the treasury grows linearly with no cap (Step001)', () => {
    const start = world({ residences: 2, workshops: 2, colonists: 2, material: 0 })
    const settled = advance(start, 240)
    const later = advance(start, 250)
    const growth = (later.resources.money - settled.resources.money) / 10
    audit('MATERIAL_CAP', {
      stock: settled.resources.money,
      commerceInflow: getCommerceRevenuePerTick(settled),
      growthPerTick: growth,
    })
    // Commerce flows regardless of balance: 2 connected Workshops.
    expect(getCommerceRevenuePerTick(settled)).toBe(4)
    // Revenue 6 − maintenance 4 = +2/tick: 240 × 2 = 480.
    expect(settled.resources.money).toBe(480)
    expect(growth).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §5 — Long-run pressure across the five scenarios
// ---------------------------------------------------------------------------

describe('§5 — long-run Material pressure', () => {
  it('runs scenarios A-E over 60/120/240/600/1200 ticks', () => {
    const scenarios: Record<string, WorldSpec> = {
      A: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2 },
      B: { residences: 3, farms: 2, workshops: 1, wells: 1, colonists: 3 },
      C: { residences: 3, farms: 1, workshops: 2, wells: 1, colonists: 3 },
      D: { residences: 4, farms: 2, workshops: 2, wells: 1, colonists: 4 },
      E: { residences: 5, farms: 2, workshops: 2, wells: 2, colonists: 5 },
    }
    const out: Record<string, unknown> = {}
    for (const [name, spec] of Object.entries(scenarios)) {
      const rows: Record<string, unknown> = {}
      for (const ticks of [60, 120, 240, 600, 1200]) {
        const settled = advance(world(spec), ticks)
        const r = record(settled)
        rows[`t${ticks}`] = {
          population: r.population,
          food: settled.resources.food,
          water: settled.resources.water,
          material: r.material,
          stored: r.stored,
          upkeep: r.upkeep,
          operationalBuildings: Object.values(settled.buildings).filter((b) => b.status === 'operational').length,
        }
      }
      out[name] = rows
    }
    audit('MATERIAL_PRESSURE', out)
  })

  it('shows Material accumulates linearly with no plateau (Step001)', () => {
    const start = world({ residences: 2, workshops: 2, colonists: 2, material: 0 })
    const t60 = advance(start, 60)
    const t1200 = advance(start, 1200)
    audit('MATERIAL_PLATEAU', {
      t60: t60.resources.money,
      t1200: t1200.resources.money,
      growsLinearly: t1200.resources.money > t60.resources.money,
    })
    // +2/tick: 120 at t60, 2400 at t1200.
    // Revenue 6 (2 taxes + 4 commerce) − maintenance 4 = +2/tick, so the
    // old plateau is gone: accumulation is linear from tick 0.
    expect(t60.resources.money).toBe(120)
    expect(t1200.resources.money).toBeGreaterThan(t60.resources.money)
    expect(t1200.resources.money - t60.resources.money).toBe(2 * (1200 - 60))
  })
})

// ---------------------------------------------------------------------------
// §6 — Construction as the existing Material sink
// ---------------------------------------------------------------------------

describe('§6 — construction as the existing sink', () => {
  it('measures construction orders and how long Material stays binding', () => {
    const orders: Record<string, PlanItem[]> = {
      housingFirst: [
        { type: 'residence', x: 1, y: 0 },
        { type: 'residence', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 0 },
        { type: 'workshop', x: 3, y: 2 },
      ],
      farmFirst: [
        { type: 'residence', x: 1, y: 0 },
        { type: 'farm', x: 3, y: 0 },
        { type: 'workshop', x: 3, y: 2 },
        { type: 'residence', x: 1, y: 2 },
      ],
      workshopFirst: [
        { type: 'residence', x: 1, y: 0 },
        { type: 'workshop', x: 3, y: 0 },
        { type: 'farm', x: 3, y: 2 },
        { type: 'residence', x: 1, y: 2 },
      ],
      mixed: [
        { type: 'residence', x: 1, y: 0 },
        { type: 'workshop', x: 3, y: 0 },
        { type: 'residence', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
    }
    const rows = Object.entries(orders).map(([name, plan]) => {
      const result = drivePlan(plan, 600)
      return {
        order: name,
        placementTicks: result.placed,
        complete: result.placed.every((t) => t !== null),
        materialEnd: result.materialEnd,
        totalSpent: result.spent,
      }
    })
    audit('CONSTRUCTION_ORDERS', rows)
    for (const row of rows) expect(row.complete).toBe(true)
  })

  it('quantifies the total build-out demand against one Workshop', () => {
    // Full small settlement: 4 residences + 2 farms + 2 workshops + 2 wells
    // + a road spine. Cost = 25 per building + 5 per road.
    const buildings = 4 + 2 + 2 + 2
    const roads = 12
    const total = buildings * 25 + roads * 5
    const ticksWithOneWorkshop = total // +1/tick net from one staffed Workshop
    audit('BUILD_OUT_DEMAND', {
      buildings,
      roads,
      totalMaterial: total,
      netPerTickOneWorkshop: 1,
      ticksToAffordWithOneWorkshop: ticksWithOneWorkshop,
      note: 'construction is a large sink during growth; it only stops once built out',
    })
    expect(total).toBeGreaterThan(200)
  })
})

// ---------------------------------------------------------------------------
// §7 — Storage cap analysis
// ---------------------------------------------------------------------------

describe('§7 — storage cap analysis', () => {
  it('shows the cap bounds production inflow while income bypasses it (Step 10CQ.1)', () => {
    const start = world({ residences: 1, workshops: 1, colonists: 1, material: 0 })
    const trace: MaterialRecord[] = []
    let state = start
    for (let i = 0; i < 30; i += 1) {
      state = stepSimulation(state)
      trace.push(record(state))
    }
    audit('STORAGE_CAP_TRACE', trace.filter((_, i) => i % 5 === 0 || i < 4))

    const atCap = record(advance(start, 30))
    const later = advance(start, 40)
    audit('MONEY_GROWTH_SUMMARY', {
      stockT30: atCap.material,
      commerceInflow: atCap.stored,
      upkeep: atCap.upkeep,
      growthPerTick: (later.resources.money - atCap.material) / 10,
    })
    // No cap: revenue 3 − maintenance 2 = +1/tick from the first tick.
    expect(atCap.stored).toBe(2)
    expect(atCap.material).toBe(30)
    expect(later.resources.money - atCap.material).toBe(10)
  })

  it('commerce counts connected Workshops regardless of staffing', () => {
    const staffed = world({ residences: 2, workshops: 2, colonists: 2 })
    const vacant = world({ residences: 1, workshops: 2, colonists: 1 })
    audit('COMMERCE_STAFFING', {
      staffedCommerce: getCommerceRevenuePerTick(staffed),
      vacantCommerce: getCommerceRevenuePerTick(vacant),
      vacantOperationalWorkshops: countOperationalWorkshops(vacant),
    })
    expect(getCommerceRevenuePerTick(staffed)).toBe(4)
    expect(getCommerceRevenuePerTick(vacant)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §8 — Candidate A: ongoing Material demand (audit mirrors)
// ---------------------------------------------------------------------------

describe('§8 — ongoing Material demand candidates', () => {
  it('A1 population-coupled consumption', () => {
    const start = world({ residences: 4, farms: 2, workshops: 2, colonists: 4, material: 48 })
    const rows = [0, 1, 2].map((perColonist) => {
      const settled = runMirror(start, 240, { materialPerColonist: perColonist })
      return {
        materialPerColonist: perColonist,
        population: getPopulationCount(settled),
        material: settled.resources.money,
      }
    })
    audit('MATERIAL_DEMAND_A1', rows)
    // Demand grows with population; the player must build more Workshops.
    expect(rows[0]!.material).toBeGreaterThan(rows[2]!.material)
  })

  it('A2 building maintenance', () => {
    const start = world({ residences: 4, farms: 2, workshops: 2, colonists: 4, material: 48 })
    const rows = [0, 1, 2].map((perBuilding) => {
      const settled = runMirror(start, 240, { materialPerBuilding: perBuilding })
      return {
        materialPerBuilding: perBuilding,
        population: getPopulationCount(settled),
        material: settled.resources.money,
      }
    })
    audit('MATERIAL_DEMAND_A2', rows)
    expect(rows[0]!.material).toBeGreaterThanOrEqual(rows[2]!.material)
  })

  it('A3/A4 are qualitative: a service operation or expansion pressure', () => {
    audit('MATERIAL_DEMAND_A3_A4', {
      A3_serviceOperation: 'a service building consuming Material to operate — the causal direction must come from the service (Candidate B), not from the sink',
      A4_expansionPressure: 'a higher settlement stage increasing Material demand — no settlement-stage model exists, so it would be artificial',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §9/§10 — Phase 5 service candidates
// ---------------------------------------------------------------------------

describe('§9/§10 — Phase 5 service candidates', () => {
  it('evaluates each category against the Water baseline dimensions', () => {
    audit('SERVICE_CANDIDATES', [
      {
        category: 'Sanitation',
        affectsPopulation: 'growth (like Water)',
        newDimension: 'none — coverage topology duplicates Water',
        spatial: 'coverage (duplicate)',
        workforce: 'yes',
        newResource: 'yes (duplicate)',
        verdict: 'duplicates Water',
      },
      {
        category: 'Health',
        affectsPopulation: 'survival/quality',
        newDimension: 'could introduce graded quality rather than binary access',
        spatial: 'coverage or capacity',
        workforce: 'yes',
        newResource: 'maybe',
        verdict: 'needs a quality/consequence model that does not exist yet',
      },
      {
        category: 'Energy',
        affectsPopulation: 'indirect',
        newDimension: 'requires devices/machines to consume it',
        spatial: 'network',
        workforce: 'yes',
        newResource: 'yes',
        verdict: 'no device/power model at this scale — premature',
      },
      {
        category: 'Education',
        affectsPopulation: 'long-term quality',
        newDimension: 'requires a time-scale/cohort model',
        spatial: 'coverage',
        workforce: 'yes',
        newResource: 'maybe',
        verdict: 'no long-horizon model — premature',
      },
      {
        category: 'Shelter quality',
        affectsPopulation: 'housing capacity/quality',
        newDimension: 'couples Material to housing and gives Material an ongoing role',
        spatial: 'placement of upgrades/residences',
        workforce: 'possibly',
        newResource: 'no (uses Material)',
        verdict: 'only category that naturally connects Material without a bare tax',
      },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §11 — Material <-> service relationship
// ---------------------------------------------------------------------------

describe('§11 — Material and service relationship', () => {
  it('records whether Material is causal or attached', () => {
    audit('MATERIAL_SERVICE_RELATION', {
      question: 'if Material were removed from the service design, would the service still make sense?',
      sanitationHealthEnergyEducation: 'yes — the service would still work, so attaching Material to it would be an artificial sink',
      shelterQuality: 'no — a shelter upgrade is literally built and maintained with Material, so the demand is causal',
      caution: 'do not add upkeep merely to create a sink; the causal direction must come from the service',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §12 — Deadlock analysis
// ---------------------------------------------------------------------------

describe('§12 — deadlock analysis', () => {
  it('checks terminal states for the current model and the demand mirrors', () => {
    const states: Record<string, WorldSpec> = {
      noFarms: { residences: 4, workshops: 2, wells: 1, colonists: 4 },
      noWorkshops: { residences: 4, farms: 2, wells: 1, colonists: 4 },
      noWells: { residences: 4, farms: 2, workshops: 2, colonists: 4 },
      oneOfEach: { residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3 },
      lowMaterial: { residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, material: 0 },
      highMaterial: { residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, material: 100 },
    }
    const out: Record<string, unknown> = {}
    for (const [name, spec] of Object.entries(states)) {
      const current = advance(world(spec), 600)
      const a1 = runMirror(world(spec), 600, { materialPerColonist: 1 })
      const a2 = runMirror(world(spec), 600, { materialPerBuilding: 1 })
      out[name] = {
        currentPopulation: getPopulationCount(current),
        a1Population: getPopulationCount(a1),
        a2Population: getPopulationCount(a2),
        a1Material: a1.resources.money,
        a2Material: a2.resources.money,
      }
    }
    audit('DEADLOCK_ANALYSIS', out)
    for (const name of Object.keys(states)) {
      expect((out[name] as { currentPopulation: number }).currentPopulation).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// §13/§14/§15/§16 — Agency, workforce, spatial, feedback
// ---------------------------------------------------------------------------

describe('§13–§16 — agency, workforce, spatial, feedback', () => {
  it('material demand creates no new placement/order decision', () => {
    audit('PLAYER_AGENCY', {
      populationCoupled: 'decision collapses to "build more Workshops" — no new placement or order choice',
      buildingMaintenance: 'decision collapses to "own fewer buildings" — penalizes the settlement the player already built',
      serviceOperation: 'depends on the service (Candidate B)',
      expansionPressure: 'no settlement-stage model to attach to',
      conclusion: 'none of the recurring-demand models add a distinct player decision',
    })
    expect(true).toBe(true)
  })

  it('workforce pool and spatial structure are unchanged by the demand models', () => {
    const start = world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 1 })
    const auto = Object.values(start.colonists)[0]!.workplaceId
    const settled = runMirror(start, 60, { materialPerColonist: 1 })
    audit('WORKFORCE_SPATIAL', {
      pool: 'Farm | Workshop | Well (unchanged)',
      automaticWorkplace: auto,
      materialIsSpatial: false,
      workshopWorkforceIsSpatial: true,
      newPlacementDecision: 'none added by the demand mirrors',
      populationAfterDemand: getPopulationCount(settled),
    })
    expect(true).toBe(true)
  })

  it('records the three existing closed loops', () => {
    audit('POPULATION_FEEDBACK', {
      food: 'population -> Food need -> consumption -> shortage -> population loss',
      water: 'population -> Water need -> growth eligibility -> Well workforce -> production -> capacity',
      material: 'Workshops -> Material -> construction -> buildings -> workforce/housing/service capacity',
      question: 'does Material need another loop now?',
      evidence: 'Material is consumed by every construction during growth; it only plateaus once built out',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §17 — Phase 5 dependency audit
// ---------------------------------------------------------------------------

describe('§17 — Phase 5 dependency audit', () => {
  it('scores whether the roadmap should enter Phase 5', () => {
    audit('PHASE5_AUDIT', {
      dependsOnExistingSystems: 'possible',
      teachesNewConcept: 'no category yet adds a genuinely new simulation concept beyond Water coverage',
      realPlayerDecision: 'none identified that is not a tax or a duplicate',
      remainsConcrete: 'yes',
      avoidsGenericArchitecture: 'yes',
      avoidsDuplicatingWater: 'no for sanitation/health coverage',
      conclusion: 'defer Phase 5 until the settlement scale or a new consequence dimension exists',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §18/§19 — Persistence, determinism, performance
// ---------------------------------------------------------------------------

describe('§18/§19 — persistence, determinism, performance', () => {
  it('records persistence impact and confirms SAVE_VERSION', () => {
    audit('PERSISTENCE_IMPACT', {
      saveVersionNow: SAVE_VERSION,
      populationCoupled: 'no new state; derived from population each tick',
      buildingMaintenance: 'no new state; derived from operational buildings',
      phase5Service: 'would add a building type and possibly a resource — a shape change and a version bump',
    })
    expect(SAVE_VERSION).toBe(12)
  })

  it('measures baseline performance and mirror determinism', () => {
    const start = world({ residences: 20, farms: 6, workshops: 6, wells: 6, colonists: 20 })
    const measure = (ticks: number): number => {
      const t0 = performance.now()
      let next = start
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [60, 120, 600].map((ticks) => ({ ticks, ms: Number(measure(ticks).toFixed(1)) }))
    const a = runMirror(start, 120, { materialPerColonist: 1 })
    const b = runMirror(start, 120, { materialPerColonist: 1 })
    audit('PERFORMANCE', { rows, mirrorDeterministic: hashCanonicalState(a) === hashCanonicalState(b), hash: hashCanonicalState(a) })
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
  }, 300000)
})
