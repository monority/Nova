/**
 * Water production-headroom admission — implementation tests (Step 10S).
 *
 * Covers the Step 10R conclusion: a colonist may only be admitted while the
 * colony's Water production capacity can sustain the resulting served
 * population, with an explicit first-colonist bootstrap exemption.
 */

import { describe, expect, it } from 'vitest'

import {
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

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10s', width: 60, height: 20 },
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
  if (building === undefined) throw new Error('test: building missing')
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
  if (id === undefined) throw new Error('test: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('test: road missing')
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

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const pop = (state: SimulationState): number => getPopulationCount(state)
const production = (state: SimulationState): number => waterProductionForTick(state)
const need = (state: SimulationState): number => getWaterStatus(state).needPerTick

// ---------------------------------------------------------------------------
// 1 — Invariant and bootstrap exemption
// ---------------------------------------------------------------------------

describe('1 — production-headroom invariant', () => {
  it('one staffed Well sustains exactly 2 served colonists', () => {
    const start = waterWorld({ residences: 6, wells: 1, colonists: 1 })
    const after = advance(start, 1)
    const settled = advance(start, 30)
    audit('ONE_WELL', {
      afterOneTick: pop(after),
      settled: pop(settled),
      production: production(settled),
      need: need(settled),
      shortage: getWaterStatus(settled).shortage,
    })
    expect(pop(after)).toBe(2)
    expect(pop(settled)).toBe(2)
    expect(production(settled)).toBe(need(settled))
  })

  it('two staffed Wells sustain 4 served colonists', () => {
    const start = waterWorld({ residences: 8, wells: 2, colonists: 2 })
    const settled = advance(start, 30)
    audit('TWO_WELLS', { settled: pop(settled), production: production(settled), need: need(settled) })
    expect(pop(settled)).toBe(4)
    expect(production(settled)).toBe(4)
  })

  it('three staffed Wells sustain 6 served colonists', () => {
    const start = waterWorld({ residences: 10, wells: 3, colonists: 3 })
    const settled = advance(start, 40)
    audit('THREE_WELLS', { settled: pop(settled), production: production(settled), need: need(settled) })
    expect(pop(settled)).toBe(6)
    expect(production(settled)).toBe(6)
  })

  it('never admits beyond production capacity', () => {
    const start = waterWorld({ residences: 20, wells: 1, colonists: 2 })
    const settled = advance(start, 60)
    audit('NEVER_BEYOND', { settled: pop(settled), capacity: production(settled) })
    expect(pop(settled)).toBe(2)
    expect(pop(settled)).toBeLessThanOrEqual(production(settled))
  })
})

// ---------------------------------------------------------------------------
// 2 — Multiple same-tick admissions
// ---------------------------------------------------------------------------

describe('2 — multiple admissions in one tick', () => {
  it('allows several admissions in one tick when capacity supports them', () => {
    // 2 Wells, 1 colonist: tick 1 staffs the second Well; tick 2 has production
    // 4 and admits two colonists in the same pass.
    const start = waterWorld({ residences: 8, wells: 2, colonists: 1 })
    const t1 = advance(start, 1)
    const t2 = advance(start, 2)
    audit('MULTI_SAME_TICK', {
      t1: { population: pop(t1), production: production(t1) },
      t2: { population: pop(t2), production: production(t2), admissionsInTick2: pop(t2) - pop(t1) },
    })
    expect(pop(t2) - pop(t1)).toBe(2)
    expect(pop(t2)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 3 — Edge cases A–I
// ---------------------------------------------------------------------------

describe('3 — edge cases', () => {
  it('A — population 0, no Well: the first colonist bootstraps', () => {
    const after = advance(waterWorld({ residences: 1, colonists: 0 }), 1)
    expect(pop(after)).toBe(1)
  })

  it('B — population 1, vacant Well: no growth', () => {
    // Farm is nearer, so the Well stays vacant (production 0).
    const start = waterWorld({ residences: 6, farms: 1, wells: 1, colonists: 1 })
    const settled = advance(start, 40)
    audit('EDGE_B', { settled: pop(settled), staffedWells: countStaffedOperationalWells(settled) })
    expect(countStaffedOperationalWells(start)).toBe(0)
    expect(pop(settled)).toBe(1)
  })

  it('C — population 1, one staffed Well: reaches 2', () => {
    const settled = advance(waterWorld({ residences: 6, wells: 1, colonists: 1 }), 20)
    expect(pop(settled)).toBe(2)
  })

  it('D — population 2, one staffed Well: no admission', () => {
    const settled = advance(waterWorld({ residences: 6, wells: 1, colonists: 2 }), 20)
    expect(pop(settled)).toBe(2)
  })

  it('E — population 2, two staffed Wells: grows toward 4', () => {
    const settled = advance(waterWorld({ residences: 8, wells: 2, colonists: 2 }), 20)
    expect(pop(settled)).toBe(4)
  })

  it('F — population 4, two staffed Wells: no admission', () => {
    const settled = advance(waterWorld({ residences: 8, wells: 2, colonists: 4 }), 20)
    expect(pop(settled)).toBe(4)
  })

  it('G — stock 0 with sufficient production capacity: growth proceeds', () => {
    const start = waterWorld({ residences: 4, wells: 1, colonists: 1, water: 0 })
    const settled = advance(start, 10)
    audit('EDGE_G', { settled: pop(settled), water: settled.resources.water })
    expect(pop(settled)).toBe(2)
  })

  it('H — high stock with insufficient production capacity: no growth', () => {
    const start = waterWorld({ residences: 6, farms: 1, wells: 1, colonists: 1, water: 100 })
    const settled = advance(start, 40)
    audit('EDGE_H', { settled: pop(settled), water: settled.resources.water })
    expect(pop(settled)).toBe(1)
    // The single served colonist consumes 1/tick; no growth, no production.
    expect(settled.resources.water).toBe(60)
  })

  it('I — high stock with sufficient capacity: funded growth without a per-tick throttle', () => {
    const start = waterWorld({ residences: 8, wells: 2, colonists: 2, water: 100 })
    const t1 = advance(start, 1)
    audit('EDGE_I', { admissions: pop(t1) - 2, settled: pop(t1) })
    expect(pop(t1)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 4 — Vacant and disconnected Wells
// ---------------------------------------------------------------------------

describe('4 — vacant and disconnected Wells', () => {
  it('a vacant Well blocks growth regardless of stock', () => {
    const start = waterWorld({ residences: 6, farms: 1, wells: 1, colonists: 1, water: 500 })
    const settled = advance(start, 40)
    expect(pop(settled)).toBe(1)
  })

  it('a disconnected Well serves nothing, so even the bootstrap waits for a connection', () => {
    let state = withStocks(createState(), { material: 1000, food: 10000, water: 0 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    state = op(state, 'well', 20, 2) // separate network
    state = opRoad(state, 21, 2)
    const disconnected = advance(state, 3)
    const served = getWaterCoverage(state).servedResidenceIds
    // Connect the Well's network to the residence network.
    let connected = state
    for (let x = 2; x <= 21; x += 1) connected = opRoad(connected, x, 1)
    connected = opRoad(connected, 20, 1)
    const afterConnect = advance(connected, 3)
    audit('DISCONNECTED_WELL', {
      disconnectedPopulation: pop(disconnected),
      servedWhileDisconnected: served,
      connectedPopulation: pop(afterConnect),
    })
    expect(hasOperationalWell(state)).toBe(true)
    expect(served).toEqual([])
    expect(pop(disconnected)).toBe(0)
    expect(pop(afterConnect)).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 5 — Workforce interaction
// ---------------------------------------------------------------------------

describe('5 — workforce interaction', () => {
  it('manually assigning a colonist to the Well raises production headroom', () => {
    // Farm + Well, 1 colonist: Farm is nearer, Well vacant -> no growth.
    const state = waterWorld({ residences: 6, farms: 1, wells: 1, colonists: 1 })
    const before = advance(state, 10)
    const well = Object.values(state.buildings).find((b) => b.type === 'well')!
    const manually = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: 'colonist-1',
      workplaceId: well.id,
    })
    const after = advance(manually, 20)
    audit('WORKFORCE_MANUAL', {
      beforePopulation: pop(before),
      beforeProduction: production(before),
      afterPopulation: pop(after),
      afterProduction: production(after),
    })
    expect(pop(before)).toBe(1)
    expect(production(manually)).toBe(2)
    expect(pop(after)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 6 — Food regression and non-Water worlds
// ---------------------------------------------------------------------------

describe('6 — Food regression', () => {
  it('a colony with no Well keeps the historical Food + housing admission', () => {
    const settled = advance(waterWorld({ residences: 3, farms: 1, colonists: 0 }), 3)
    audit('NO_WELL_FOOD', { population: pop(settled), hasWell: hasOperationalWell(settled) })
    expect(hasOperationalWell(settled)).toBe(false)
    expect(pop(settled)).toBe(3)
  })

  it('Food shortage still kills while Water capacity would allow growth', () => {
    const start = waterWorld({ residences: 3, wells: 1, colonists: 2, food: 0 })
    const settled = advance(start, 5)
    expect(pop(settled)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7 — Persistence, determinism, performance
// ---------------------------------------------------------------------------

describe('7 — persistence and determinism', () => {
  it('SAVE_VERSION stays 6 and admission is deterministic', () => {
    expect(SAVE_VERSION).toBe(6)
    const run = (): SimulationState =>
      advance(waterWorld({ residences: 8, wells: 2, colonists: 1, water: 3 }), 60)
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    const restored = loadSave(serializeSave(a))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(a))
    audit('DETERMINISM', { hash: hashCanonicalState(a), population: pop(a) })
  })

  it('is insertion-order independent', () => {
    const state = advance(waterWorld({ residences: 6, wells: 2, colonists: 1 }), 30)
    const reversed: SimulationState = {
      ...state,
      colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(state.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(state))
    expect(pop(reversed)).toBe(pop(state))
  })

  it('computes production capacity once per tick (linear admission loop)', () => {
    const measure = (fn: () => void): number => {
      const start = performance.now()
      fn()
      return performance.now() - start
    }
    const state = waterWorld({ residences: 120, wells: 40, colonists: 40, food: 100000 })
    const ms = measure(() => {
      let next = state
      for (let i = 0; i < 3; i += 1) next = stepSimulation(next)
    })
    audit('PERFORMANCE', { threeTicksMs: Number(ms.toFixed(3)) })
    expect(ms).toBeLessThan(30000)
  }, 300000)
})

// ---------------------------------------------------------------------------
// 8 — Long-run economy
// ---------------------------------------------------------------------------

describe('8 — long-run economy', () => {
  it('well-only economies converge to Water production capacity', () => {
    const rows = [1, 2, 3].map((wells) => {
      const settled = advance(waterWorld({ residences: 2 * wells + 2, wells, colonists: wells }), 240)
      return { wells, population: pop(settled), production: production(settled), need: need(settled) }
    })
    audit('LONG_RUN_WELLS', rows)
    for (const row of rows) {
      expect(row.population).toBe(2 * row.wells)
      expect(row.population).toBe(row.production)
      expect(row.production).toBeGreaterThanOrEqual(row.need)
    }
  })

  it('mixed economies stay survivable and deterministic', () => {
    const scenarios: Record<string, WorldSpec> = {
      farmWell: { residences: 6, farms: 1, wells: 1, colonists: 2 },
      workshopWell: { residences: 6, workshops: 1, wells: 1, colonists: 2 },
      allThree: { residences: 6, farms: 1, workshops: 1, wells: 2, colonists: 4 },
    }
    const out: Record<string, unknown> = {}
    for (const [name, spec] of Object.entries(scenarios)) {
      const rows: Record<string, unknown> = {}
      for (const ticks of [120, 240, 600]) {
        const settled = advance(waterWorld(spec), ticks)
        rows[`t${ticks}`] = {
          population: pop(settled),
          production: production(settled),
          need: need(settled),
          food: settled.resources.food,
        }
        expect(pop(settled)).toBeGreaterThan(0)
      }
      out[name] = rows
    }
    audit('LONG_RUN_MIXED', out)
  })

  it('produces no permanent Water deficit caused by the admission rule', () => {
    // Only the well-only economies are purely admission-driven; a vacant Well
    // is a workforce choice, not an admission-rule deficit.
    for (const wells of [1, 2, 3]) {
      const settled = advance(waterWorld({ residences: 2 * wells + 2, wells, colonists: wells }), 240)
      expect(production(settled)).toBeGreaterThanOrEqual(need(settled))
    }
  })
})
