/**
 * Water Bootstrap & Service Economy Audit (Step 10Q).
 *
 * AUDIT ONLY — `src/` is untouched. Evaluates the Step 10P Water
 * implementation, in particular the deliberate bootstrap correction:
 *
 *   10O: operational + staffed + road-accessible Well -> coverage
 *   10P: operational + road-accessible Well -> coverage; staffing -> production only
 *
 * Run:
 *   npx vitest run tests/waterBootstrapEconomyAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
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
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  waterProductionForTick,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures (mirroring tests/waterService.test.ts)
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10q', width: 60, height: 20 },
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
    food: spec.food ?? 1000,
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

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const staffedFarms = (state: SimulationState): number => {
  let count = 0
  for (const b of Object.values(state.buildings)) {
    if (b.type !== 'farm' || b.status !== 'operational') continue
    if (Object.values(state.colonists).some((c) => c.workplaceId === b.id)) count += 1
  }
  return count
}
const staffedWorkshops = (state: SimulationState): number => {
  let count = 0
  for (const b of Object.values(state.buildings)) {
    if (b.type !== 'workshop' || b.status !== 'operational') continue
    if (Object.values(state.colonists).some((c) => c.workplaceId === b.id)) count += 1
  }
  return count
}

interface Snap {
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
}

const snapshot = (state: SimulationState): Snap => ({
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  water: state.resources.water,
  staffedFarms: staffedFarms(state),
  staffedWorkshops: staffedWorkshops(state),
  staffedWells: countStaffedOperationalWells(state),
})

// ---------------------------------------------------------------------------
// §3 — Actual Water causal loop
// ---------------------------------------------------------------------------

describe('§3 — actual Water causal loop', () => {
  it('reconstructs the verified phase order and timing', () => {
    audit('PHASE_ORDER', [
      'advanceConstruction',
      'updateNeeds (Food need)',
      'produceFood',
      'produceWater',
      'consumeFood',
      'consumeWater',
      'updatePopulation (Food + Water + housing)',
      'assignJobs (Farm | Workshop | Well)',
      'produceMaterial',
      'applyCommand',
      'progressPlaced*',
      'upkeepBuildings',
      'advanceTime',
    ])
    // Staffing lag: a Well assigned on tick N produces on tick N+1.
    const state = waterWorld({ residences: 1, wells: 1, colonists: 0, water: 0 })
    const t1 = advance(state, 1)
    audit('TIMING_ANSWERS', {
      afterTick1Population: getPopulationCount(t1),
      afterTick1Water: t1.resources.water,
      afterTick1StaffedWells: countStaffedOperationalWells(t1),
      afterTick2Water: advance(state, 2).resources.water,
    })
    expect(getPopulationCount(t1)).toBe(1)
    // The admission tick computed coverage before the colonist existed, so
    // no Water was consumed; the assigned worker produces from tick 2.
    expect(t1.resources.water).toBe(0)
    expect(countStaffedOperationalWells(t1)).toBe(1)
    expect(advance(state, 2).resources.water).toBe(1) // +2 produced, -1 consumed
  })
})

// ---------------------------------------------------------------------------
// §4 — Bootstrap scenarios
// ---------------------------------------------------------------------------

describe('§4 — bootstrap scenarios', () => {
  it('A — Residence only (no Well): the gate is off, so the colony grows', () => {
    const state = waterWorld({ residences: 1, wells: 0, colonists: 0, food: 1000, water: 0 })
    const after = advance(state, 3)
    audit('SCENARIO_A', {
      population: getPopulationCount(after),
      water: after.resources.water,
      hasWell: hasOperationalWell(after),
      note: 'Step 10O expected 0; the 10P bootstrap rule keeps the gate off without a Well',
    })
    expect(getPopulationCount(after)).toBe(1)
  })

  it('B — operational road-accessible Well, vacant (Farm claims the worker)', () => {
    // R + Farm + Well on one network; the colonist is nearest to the Farm,
    // so the Well stays vacant.
    const state = waterWorld({ residences: 2, farms: 1, wells: 1, colonists: 1, food: 1000, water: 0 })
    const afterFirst = advance(state, 1)
    const afterMany = advance(state, 20)
    audit('SCENARIO_B', {
      firstTick: snapshot(afterFirst),
      after20: snapshot(afterMany),
      coverage: getWaterStatus(afterMany),
    })
    expect(countStaffedOperationalWells(state)).toBe(0)
    expect(getWaterCoverage(state).servedResidenceIds.length).toBeGreaterThan(0)
    expect(getPopulationCount(afterMany)).toBe(1)
  })

  it('C — operational Well staffed: exact one-tick production lag', () => {
    const state = waterWorld({ residences: 2, wells: 1, colonists: 0, food: 1000, water: 0 })
    const trace: unknown[] = []
    let current = state
    for (let i = 0; i < 10; i += 1) {
      current = stepSimulation(current)
      trace.push({
        tick: current.time.tick,
        population: getPopulationCount(current),
        water: current.resources.water,
        production: waterProductionForTick(current),
        staffedWells: countStaffedOperationalWells(current),
      })
    }
    audit('SCENARIO_C', trace)
    // One Well (+2) can serve two colonists, stabilising at +0 after that.
    expect(getPopulationCount(current)).toBe(2)
  })

  it('D — Well under construction: no operational Well, so the gate is off', () => {
    let state = waterWorld({ residences: 1, wells: 0, colonists: 0, food: 1000, water: 0 })
    const created = createBuilding(state, 'well', 20, 2, 2)
    state = created.state
    const underConstruction = advance(state, 1)
    audit('SCENARIO_D', {
      hasOperationalWell: hasOperationalWell(underConstruction),
      population: getPopulationCount(underConstruction),
      coverage: getWaterCoverage(underConstruction).servedResidenceIds.length,
      production: waterProductionForTick(underConstruction),
    })
    // No operational Well yet -> bootstrap rule: admission behaves as before.
    expect(hasOperationalWell(underConstruction)).toBe(false)
    expect(getPopulationCount(underConstruction)).toBe(1)
    expect(waterProductionForTick(underConstruction)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §5 — First-colonist bootstrap (real commands)
// ---------------------------------------------------------------------------

describe('§5 — first-colonist bootstrap', () => {
  it('is playable: R -> road -> Well -> first colonist -> staffing -> growth', () => {
    let state = createState()
    const commands: { readonly label: string; readonly command: Parameters<typeof stepSimulation>[1] }[] = [
      { label: 'place R', command: { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' } },
      { label: 'road', command: { type: 'placeRoads', cells: [{ x: 1, y: 1 }] } },
      { label: 'place Well', command: { type: 'placeBuilding', x: 1, y: 2, buildingType: 'well' } },
    ]
    const trace: unknown[] = []
    for (const step of commands) {
      state = stepSimulation(state, step.command)
      trace.push({ step: step.label, tick: state.time.tick, ...snapshot(state) })
    }
    // Let the residence and Well finish construction.
    for (let i = 0; i < 3; i += 1) {
      state = stepSimulation(state)
      trace.push({ step: 'wait', tick: state.time.tick, ...snapshot(state) })
    }
    // Add a second Residence on the same network to grow.
    state = stepSimulation(state, { type: 'placeBuilding', x: 3, y: 0, buildingType: 'residence' })
    for (let i = 0; i < 4; i += 1) state = stepSimulation(state)
    audit('BOOTSTRAP_SEQUENCE', trace)
    expect(getPopulationCount(state)).toBeGreaterThanOrEqual(1)
    expect(countStaffedOperationalWells(state)).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// §6 — Coverage vs stock matrix
// ---------------------------------------------------------------------------

describe('§6 — coverage vs stock matrix', () => {
  it('measures the admission outcome for every coverage/stock/staffing cell', () => {
    // R1 occupied, R2 free, plus a Farm so the Well can stay vacant. Staffing
    // is applied with the command primitive directly (no tick), so the only
    // tick measured is the admission tick.
    const build = (scenario: {
      readonly covered: boolean
      readonly stock: number
      readonly staffed: boolean
    }): { readonly state: SimulationState; readonly actuallyStaffed: boolean } => {
      let state = waterWorld({
        residences: 2,
        farms: 1,
        wells: 1,
        colonists: 0,
        food: 1000,
        water: scenario.stock,
      })
      state = createColonist(state, 'building-1').state
      state = assignJobs(state)
      if (!scenario.covered) {
        const well = Object.values(state.buildings).find((b) => b.type === 'well')!
        state = {
          ...state,
          roads: Object.fromEntries(
            Object.entries(state.roads).filter(
              ([, road]) => !(road.y === 1 && Math.abs(road.x - well.x) <= 1)
            )
          ),
        }
      }
      let actuallyStaffed = false
      if (scenario.staffed) {
        const well = Object.values(state.buildings).find((b) => b.type === 'well')!
        const colonist = Object.values(state.colonists)[0]!
        const result = applyCommand(state, {
          type: 'reassignColonist',
          colonistId: colonist.id,
          workplaceId: well.id,
        })
        state = result.state
        actuallyStaffed = result.accepted
      }
      return { state, actuallyStaffed }
    }
    const rows: { coverage: boolean; stock: number; requested: boolean; staffed: boolean; admitted: number }[] = []
    for (const covered of [false, true]) {
      for (const stock of [0, 5]) {
        for (const requested of [false, true]) {
          const built = build({ covered, stock, staffed: requested })
          const after = advance(built.state, 1)
          rows.push({
            coverage: covered,
            stock,
            requested,
            staffed: countStaffedOperationalWells(built.state) > 0,
            admitted: getPopulationCount(after),
          })
        }
      }
    }
    audit('COVERAGE_STOCK_MATRIX', rows)
    // Uncovered: the free Residence is unserved, so no admission, regardless
    // of stock or attempted staffing (a roadless Well cannot be staffed).
    for (const row of rows.filter((r) => !r.coverage)) {
      expect(row.admitted).toBe(1)
    }
    // Covered + vacant + stock 0: no production -> shortage -> blocked.
    expect(rows.find((r) => r.coverage && r.stock === 0 && !r.requested)!.admitted).toBe(1)
    // Covered + staffed: production 2 vs served need 1 -> one admission.
    expect(rows.find((r) => r.coverage && r.stock === 0 && r.requested)!.admitted).toBe(2)
    // Step 10S: headroom uses production capacity, not stock, so a vacant Well
    // cannot fund growth even with a reserve.
    expect(rows.find((r) => r.coverage && r.stock === 5 && !r.requested)!.admitted).toBe(1)
    expect(rows.find((r) => r.coverage && r.stock === 5 && r.requested)!.admitted).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §7 — Water shortage semantics
// ---------------------------------------------------------------------------

describe('§7 — Water shortage semantics', () => {
  it('existing colonists survive a shortage; growth resumes when production returns', () => {
    // 2 colonists served, 1 Well vacant (Farm nearer) -> shortage.
    let state = waterWorld({ residences: 2, farms: 1, wells: 1, colonists: 2, food: 1000, water: 0 })
    const shortage = advance(state, 10)
    const populationDuring = getPopulationCount(shortage)
    const statusDuring = getWaterStatus(shortage)
    // Staff the Well -> production returns.
    const well = Object.values(shortage.buildings).find((b) => b.type === 'well')!
    const farmWorker = Object.values(shortage.colonists).find((c) => {
      const w = shortage.buildings[c.workplaceId ?? '']
      return w?.type === 'farm'
    })!
    state = stepSimulation(shortage, { type: 'reassignColonist', colonistId: farmWorker.id, workplaceId: well.id })
    const recovered = advance(state, 5)
    audit('SHORTAGE_SEMANTICS', {
      populationDuring,
      shortage: statusDuring.shortage,
      waterDuring: shortage.resources.water,
      populationRecovered: getPopulationCount(recovered),
      waterRecovered: recovered.resources.water,
      staffedWells: countStaffedOperationalWells(recovered),
    })
    expect(populationDuring).toBe(2)
    expect(statusDuring.shortage).toBe(true)
    expect(countStaffedOperationalWells(recovered)).toBe(1)
    expect(recovered.resources.water).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// §8 — Multi-colonist consumption
// ---------------------------------------------------------------------------

describe('§8 — multi-colonist consumption', () => {
  it('need equals served colonists and consumption is min(stock, need)-clamped', () => {
    const rows = [1, 2, 3, 4].map((colonists) => {
      const state = waterWorld({ residences: colonists, wells: 1, colonists, water: 10 })
      const status = getWaterStatus(state)
      // Production is 2 when the Well is staffed (1 worker), so one Well can
      // only hold the line at 2 served colonists.
      return {
        colonists,
        servedColonists: status.servedColonistCount,
        need: status.needPerTick,
        stock: status.stock,
        production: status.productionPerTick,
      }
    })
    audit('MULTI_CONSUMPTION', rows)
    for (const row of rows) {
      expect(row.servedColonists).toBe(row.colonists)
      expect(row.need).toBe(row.colonists)
    }
  })

  it('an insufficient stock is clamped, never negative, and blocks admission only', () => {
    const state = waterWorld({ residences: 4, wells: 1, colonists: 3, water: 1, food: 1000 })
    const after = advance(state, 10)
    audit('INSUFFICIENT_STOCK', {
      water: after.resources.water,
      population: getPopulationCount(after),
      shortage: getWaterStatus(after).shortage,
    })
    expect(after.resources.water).toBeGreaterThanOrEqual(0)
    expect(getPopulationCount(after)).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// §9 — Admission order boundary
// ---------------------------------------------------------------------------

describe('§9 — admission order boundary', () => {
  it('measures the production-headroom admission boundary', () => {
    // Step 10S: one staffed Well (production 2) sustains 2 served colonists.
    const build = (population: number): SimulationState =>
      waterWorld({ residences: population + 1, wells: 1, colonists: population, food: 1000, water: 0 })
    const rows = [1, 2, 3].map((population) => {
      const after = advance(build(population), 1)
      return { population, after: getPopulationCount(after), water: after.resources.water }
    })
    audit('ADMISSION_BOUNDARY', rows)
    expect(rows[0]!.after).toBe(2)
    expect(rows[1]!.after).toBe(2)
    expect(rows[2]!.after).toBe(3)
  })

  it('admits multiple colonists per tick when production capacity allows', () => {
    // 2 staffed Wells (2 colonists) -> production 4, served need 2.
    const rows = [1, 2, 3].map((free) => {
      const state = waterWorld({ residences: 2 + free, wells: 2, colonists: 2, food: 1000, water: 0 })
      const after = advance(state, 1)
      return { free, population: getPopulationCount(after), water: after.resources.water }
    })
    audit('ADMISSION_RESIDENCES', rows)
    expect(rows[0]!.population).toBe(3)
    expect(rows[1]!.population).toBe(4)
    expect(rows[2]!.population).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §10/§11 — Workforce bootstrap and competition
// ---------------------------------------------------------------------------

describe('§10/§11 — workforce bootstrap and competition', () => {
  it('1 / 2 / 3 colonists with Farm + Well', () => {
    const rows = [1, 2, 3].map((colonists) => {
      const state = waterWorld({ residences: colonists, farms: 1, wells: 1, colonists, water: 0 })
      const after = advance(state, 5)
      return { colonists, ...snapshot(after) }
    })
    audit('WORKFORCE_BOOTSTRAP', rows)
    expect(rows[0]!.staffedFarms + rows[0]!.staffedWells).toBe(1)
    expect(rows[1]!.staffedFarms + rows[1]!.staffedWells).toBe(2)
  })

  it('manual Farm -> Well / Workshop -> Well deltas are exactly production shifts', () => {
    const farmToWell = waterWorld({ residences: 2, farms: 1, wells: 1, colonists: 2, water: 100 })
    // Force a Farm + vacant Well layout: add a second Farm so both colonists farm.
    const state = waterWorld({ residences: 2, farms: 2, wells: 1, colonists: 2, water: 100 })
    void farmToWell
    const before = {
      food: staffedFarms(state) * 2,
      material: materialProduction(state),
      water: waterProductionForTick(state),
    }
    const well = Object.values(state.buildings).find((b) => b.type === 'well')!
    const farmWorker = Object.values(state.colonists).find((c) => {
      const w = state.buildings[c.workplaceId ?? '']
      return w?.type === 'farm'
    })!
    const after = stepSimulation(state, { type: 'reassignColonist', colonistId: farmWorker.id, workplaceId: well.id })
    const deltas = {
      food: staffedFarms(after) * 2 - before.food,
      material: materialProduction(after) - before.material,
      water: waterProductionForTick(after) - before.water,
    }
    audit('MANUAL_DELTAS', { before, after: { food: staffedFarms(after) * 2, material: materialProduction(after), water: waterProductionForTick(after) }, deltas })
    expect(deltas).toEqual({ food: -2, material: 0, water: 2 })

    const shopState = waterWorld({ residences: 2, workshops: 2, wells: 1, colonists: 2, water: 100 })
    const shopWorker = Object.values(shopState.colonists).find((c) => {
      const w = shopState.buildings[c.workplaceId ?? '']
      return w?.type === 'workshop'
    })!
    const shopWell = Object.values(shopState.buildings).find((b) => b.type === 'well')!
    const shopAfter = stepSimulation(shopState, { type: 'reassignColonist', colonistId: shopWorker.id, workplaceId: shopWell.id })
    audit('MANUAL_WORKSHOP_TO_WELL', {
      materialBefore: materialProduction(shopState),
      materialAfter: materialProduction(shopAfter),
      waterAfter: waterProductionForTick(shopAfter),
    })
    expect(materialProduction(shopAfter) - materialProduction(shopState)).toBe(-2)
    expect(waterProductionForTick(shopAfter)).toBe(2)
  })

  it('no implicit Well priority: automatic assignment stays distance-then-id', () => {
    // Farm at distance 0, Well at distance 1 -> the Farm wins.
    const state = waterWorld({ residences: 1, farms: 1, wells: 1, colonists: 1 })
    const colonist = Object.values(state.colonists)[0]!
    const workplace = state.buildings[colonist.workplaceId ?? '']!
    audit('NO_WELL_PRIORITY', { workplaceType: workplace.type })
    expect(workplace.type).toBe('farm')
  })
})

function materialProduction(state: SimulationState): number {
  let total = 0
  for (const b of Object.values(state.buildings)) {
    if (b.type !== 'workshop' || b.status !== 'operational') continue
    const workers = Object.values(state.colonists).filter((c) => c.workplaceId === b.id).length
    if (workers > 0) total += workers * 2
  }
  return total
}

// ---------------------------------------------------------------------------
// §12 — Spatial coverage
// ---------------------------------------------------------------------------

describe('§12 — spatial coverage', () => {
  const twoNetworks = (connect: boolean): SimulationState => {
    let state = withStocks(createState(), { material: 1000, food: 1000, water: 100 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 1, 2)
    state = op(state, 'residence', 20, 0)
    state = opRoad(state, 2, 0)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 2, 2)
    state = opRoad(state, 21, 0)
    if (connect) {
      for (let x = 2; x <= 21; x += 1) state = opRoad(state, x, 1)
    }
    return state
  }

  it('different networks are unserved; reconnecting serves them again', () => {
    const disconnected = twoNetworks(false)
    const connected = twoNetworks(true)
    audit('SPATIAL_COVERAGE', {
      disconnected: getWaterCoverage(disconnected).servedResidenceIds,
      connected: getWaterCoverage(connected).servedResidenceIds,
      roadlessWell: getWaterCoverage(waterWorld({ residences: 1, wells: 1, roads: false })).servedResidenceIds,
      multipleWells: getWaterCoverage(waterWorld({ residences: 1, wells: 2 })).servedResidenceIds,
    })
    expect(getWaterCoverage(disconnected).servedResidenceIds).toEqual(['building-1'])
    expect(getWaterCoverage(connected).servedResidenceIds).toEqual(['building-1', 'building-3'])
    expect(getWaterCoverage(waterWorld({ residences: 1, wells: 1, roads: false })).servedResidenceIds).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// §13 — Critical: does a vacant Well sustain growth?
// ---------------------------------------------------------------------------

describe('§13 — vacant Well cannot sustain growth', () => {
  it('a vacant Well provides coverage but blocks growth through shortage', () => {
    // R1..R4 served, 1 Farm (nearer) + 1 vacant Well, 1 initial colonist.
    const state = waterWorld({ residences: 4, farms: 1, wells: 1, colonists: 1, food: 5000, water: 0 })
    const after = advance(state, 120)
    audit('VACANT_WELL_120', {
      population: getPopulationCount(after),
      water: after.resources.water,
      staffedWells: countStaffedOperationalWells(after),
      status: getWaterStatus(after),
    })
    expect(countStaffedOperationalWells(state)).toBe(0)
    expect(getPopulationCount(after)).toBe(1)
  })

  it('a large Water reserve cannot fund growth without production capacity', () => {
    const state = waterWorld({ residences: 6, farms: 1, wells: 1, colonists: 1, food: 5000, water: 5 })
    const after = advance(state, 60)
    audit('VACANT_WELL_RESERVE', {
      population: getPopulationCount(after),
      water: after.resources.water,
      staffedWells: countStaffedOperationalWells(after),
    })
    // Step 10S: headroom uses production capacity, so a vacant Well (production
    // 0) cannot admit beyond the bootstrap colonist whatever the stock.
    expect(getPopulationCount(after)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §14/§15/§16 — Long-run economy, equilibrium, population feedback
// ---------------------------------------------------------------------------

describe('§14/§15/§16 — long-run economy', () => {
  const scenarios: Record<string, () => SimulationState> = {
    A_farmWell: () => waterWorld({ residences: 3, farms: 1, wells: 1, colonists: 0, food: 4000, water: 0 }),
    B_workshopWell: () => waterWorld({ residences: 3, workshops: 1, wells: 1, colonists: 0, food: 4000, water: 0 }),
    C_all: () => waterWorld({ residences: 4, farms: 1, workshops: 1, wells: 1, colonists: 0, food: 4000, water: 0 }),
    D_farmHeavy: () => waterWorld({ residences: 5, farms: 3, wells: 1, colonists: 0, food: 4000, water: 0 }),
    E_workshopHeavy: () => waterWorld({ residences: 5, workshops: 3, wells: 1, colonists: 0, food: 4000, water: 0 }),
    F_waterHeavy: () => waterWorld({ residences: 5, wells: 3, colonists: 0, food: 4000, water: 0 }),
    G_manualMixed: () => {
      const s = waterWorld({ residences: 4, farms: 1, workshops: 1, wells: 1, colonists: 0, food: 4000, water: 0 })
      return s
    },
  }

  it('runs 60 and 240 ticks', () => {
    const out: Record<string, unknown> = {}
    for (const [name, maker] of Object.entries(scenarios)) {
      const t60 = advance(maker(), 60)
      const t240 = advance(maker(), 240)
      out[name] = { t60: snapshot(t60), t240: snapshot(t240) }
    }
    audit('LONG_RUN', out)
    for (const name of Object.keys(scenarios)) {
      const entry = out[name] as { t240: { population: number } }
      expect(entry.t240.population).toBeGreaterThan(0)
    }
  })

  it('Water equilibrium: +1 / 0 / -1 for 1 / 2 / 3 served colonists with one staffed Well', () => {
    const rows = [1, 2, 3].map((colonists) => {
      // 1 staffed Well, no Farm so the Well is the nearest workplace.
      const state = waterWorld({ residences: colonists, wells: 1, colonists, water: 0, food: 5000 })
      const after = advance(state, 10)
      return {
        colonists,
        production: waterProductionForTick(after),
        need: getWaterStatus(after).needPerTick,
        net: waterProductionForTick(after) - getWaterStatus(after).needPerTick,
        water: after.resources.water,
        population: getPopulationCount(after),
      }
    })
    audit('WATER_EQUILIBRIUM', rows)
    expect(rows[0]!.net).toBe(1)
    expect(rows[1]!.net).toBe(0)
    expect(rows[2]!.net).toBe(-1)
  })

  it('population feedback: growth raises consumption and slows itself without upkeep', () => {
    // One staffed Well, plenty of served housing and Food.
    const state = waterWorld({ residences: 6, wells: 1, colonists: 0, food: 10000, water: 0 })
    const trace: { tick: number; population: number; water: number; net: number }[] = []
    let current = state
    for (let i = 0; i < 40; i += 1) {
      current = stepSimulation(current)
      trace.push({
        tick: current.time.tick,
        population: getPopulationCount(current),
        water: current.resources.water,
        net: waterProductionForTick(current) - getWaterStatus(current).needPerTick,
      })
    }    audit('POPULATION_FEEDBACK', trace.filter((_, i) => i % 5 === 0 || i < 8))
    // Step 10S: production headroom caps the served population at the Well
    // capacity (2 for one staffed Well) and production equals need at
    // equilibrium. (The residual stock after consumption can still be below
    // the need; that is a buffer, not a deficit.)
    expect(getPopulationCount(current)).toBe(2)
    expect(waterProductionForTick(current)).toBe(getWaterStatus(current).needPerTick)
  })
})

// ---------------------------------------------------------------------------
// §17 — Food / Water interaction
// ---------------------------------------------------------------------------

describe('§17 — Food / Water interaction', () => {
  it('Food shortage kills; Water shortage only stops growth', () => {
    // Food shortage with abundant Water: colony starves.
    const foodShort = waterWorld({ residences: 3, farms: 0, wells: 1, colonists: 3, food: 1, water: 100 })
    const starved = advance(foodShort, 5)
    // Water shortage with abundant Food: colony survives.
    const waterShort = waterWorld({ residences: 3, farms: 1, wells: 1, colonists: 3, food: 5000, water: 0 })
    const survived = advance(waterShort, 20)
    audit('FOOD_WATER_INTERACTION', {
      foodShortage: { population: getPopulationCount(starved), food: starved.resources.food },
      waterShortage: { population: getPopulationCount(survived), water: survived.resources.water },
    })
    expect(getPopulationCount(starved)).toBe(0)
    expect(getPopulationCount(survived)).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// §18 — Persistence / migration / hash
// ---------------------------------------------------------------------------

describe('§18 — persistence, migration and hash', () => {
  it('SAVE_VERSION 6; water round-trips; derived coverage is not persisted', () => {
    expect(SAVE_VERSION).toBe(8)
    const state = waterWorld({ residences: 2, wells: 1, colonists: 1, water: 7 })
    const restored = loadSave(serializeSave(state))
    expect(restored.resources.water).toBe(7)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    const serialized = serializeCanonicalState(state)
    for (const derived of ['servedColonist', 'servedResidence', 'coverage', 'shortage', 'waterNeed']) {
      expect(serialized).not.toContain(derived)
    }
    // Changing only Water changes the hash.
    const changed = withStocks(state, { water: 8 })
    expect(hashCanonicalState(changed)).not.toBe(hashCanonicalState(state))
  })
})

// ---------------------------------------------------------------------------
// §19 — Determinism
// ---------------------------------------------------------------------------

describe('§19 — determinism', () => {
  it('replay, save/load and insertion order are deterministic', () => {
    const run = (): SimulationState =>
      advance(waterWorld({ residences: 4, farms: 1, workshops: 1, wells: 1, colonists: 4, water: 10 }), 120)
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    audit('DETERMINISM', { hash: hashCanonicalState(a) })
  })
})

// ---------------------------------------------------------------------------
// §20 — Performance
// ---------------------------------------------------------------------------

describe('§20 — performance', () => {
  const cluster = (workplaces: number, residences: number): SimulationState => {
    let state = withStocks(createState(), { material: 1000, food: 100000, water: 100000 })
    const residenceIds: string[] = []
    const clusters = Math.ceil(workplaces / 8)
    for (let i = 0; i < residences; i += 1) {
      const c = Math.floor(i / 8)
      const slot = i % 8
      state = op(state, 'residence', 1 + slot * 2, 4 * c + 2)
      residenceIds.push(`building-${i + 1}`)
    }
    for (let i = 0; i < workplaces; i += 1) {
      const c = Math.floor(i / 8)
      const slot = i % 8
      const type: BuildingType = i % 3 === 0 ? 'farm' : i % 3 === 1 ? 'workshop' : 'well'
      state = op(state, type, 1 + slot * 2, 4 * c)
    }
    for (let c = 0; c < clusters; c += 1) {
      for (let x = 0; x <= 17; x += 1) state = opRoad(state, x, 4 * c + 1)
    }
    for (const id of residenceIds) state = createColonist(state, id).state
    return assignJobs(state)
  }

  it('measures coverage and step cost at four sizes', () => {
    const measure = (fn: () => void): number => {
      const start = performance.now()
      fn()
      return performance.now() - start
    }
    const out: Record<string, unknown> = {}
    for (const [name, workplaces, residences, ticks] of [
      ['SMALL', 9, 5, 10],
      ['MEDIUM', 90, 40, 3],
      ['LARGE', 300, 120, 0],
      ['XL', 900, 360, 0],
    ] as const) {
      const state = cluster(workplaces, residences)
      const coverageMs = measure(() => { getWaterCoverage(state) })
      const tickMs = ticks > 0
        ? measure(() => { let next = state; for (let i = 0; i < ticks; i += 1) next = stepSimulation(next) }) / ticks
        : null
      out[name] = {
        workplaces,
        residences,
        coverageMs: Number(coverageMs.toFixed(3)),
        perTickMs: tickMs === null ? null : Number(tickMs.toFixed(3)),
        servedResidences: getWaterCoverage(state).servedResidenceIds.length,
      }
    }
    audit('PERFORMANCE', out)
    expect((out['XL'] as { coverageMs: number }).coverageMs).toBeLessThan(2000)
  }, 300000)
})
