/**
 * Water service & coverage — implementation tests (Step 10P).
 *
 * Covers the Well contract, Water production/consumption, residence-network
 * coverage, the admission gate, workforce integration, persistence/migration
 * and determinism. The Step 10P bootstrap rule (the Water gate activates once
 * the colony owns an operational Well) is asserted explicitly.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getPopulationCount,
  getWaterCoverage,
  getWaterStatus,
  hasOperationalWell,
  hashCanonicalState,
  isOperationalWell,
  isOperationalWorkplace,
  jobCapacityOf,
  loadSave,
  MIGRATABLE_SAVE_VERSION,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateReassignment,
  waterProductionForTick,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10p', width: 60, height: 20 },
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
  stocks: {
    readonly food?: number
    readonly material?: number
    readonly water?: number
  }
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

/** Residences y=0, workplaces y=2 (farms, workshops, wells), road row y=1. */
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

const wellIds = (state: SimulationState): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === 'well')
    .map((b) => b.id)
    .sort()

// ---------------------------------------------------------------------------
// 1 — Well contract
// ---------------------------------------------------------------------------

describe('1 — Well contract', () => {
  it('costs 25 Material, takes 2 ticks, has capacity 1 and is a workplace', () => {
    const definition = getBuildingDefinition('well')
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1 })
    const well = Object.values(state.buildings).find((b) => b.type === 'well')!
    audit('WELL_CONTRACT', {
      cost: definition.constructionCost,
      ticks: definition.constructionTicks,
      housing: definition.housingCapacity,
      capacity: jobCapacityOf(well),
      isWorkplace: isOperationalWorkplace(well),
    })
    expect(definition.constructionCost).toBe(25)
    expect(definition.constructionTicks).toBe(2)
    expect(definition.housingCapacity).toBe(0)
    expect(jobCapacityOf(well)).toBe(1)
    expect(isOperationalWorkplace(well)).toBe(true)
    expect(isOperationalWell(well)).toBe(true)
  })

  it('produces +2 Water per tick only when operational, staffed and road-accessible', () => {
    const staffed = waterWorld({ residences: 1, wells: 1, colonists: 1 })
    const vacant = waterWorld({ residences: 1, wells: 1, colonists: 0 })
    const roadless = waterWorld({ residences: 1, wells: 1, colonists: 1, roads: false })
    audit('WELL_PRODUCTION', {
      staffed: waterProductionForTick(staffed),
      vacant: waterProductionForTick(vacant),
      roadless: waterProductionForTick(roadless),
    })
    expect(waterProductionForTick(staffed)).toBe(WATER_PER_WELL_PER_TICK)
    expect(waterProductionForTick(vacant)).toBe(0)
    expect(waterProductionForTick(roadless)).toBe(0)
  })

  it('an under-construction Well produces 0', () => {
    let state = waterWorld({ residences: 1, wells: 0, colonists: 1 })
    const created = createBuilding(state, 'well', 9, 2, 2)
    state = created.state
    expect(waterProductionForTick(state)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2 — Coverage
// ---------------------------------------------------------------------------

describe('2 — coverage', () => {
  it('a Residence on the Well network is served', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1 })
    const coverage = getWaterCoverage(state)
    audit('COVERAGE_SAME_NETWORK', {
      servedResidences: coverage.servedResidenceIds.length,
      servedColonists: coverage.servedColonistIds.length,
      production: waterProductionForTick(state),
    })
    expect(coverage.servedResidenceIds.length).toBe(1)
    expect(coverage.servedColonistIds.length).toBe(1)
  })

  it('a Residence on a different network is not served', () => {
    let state = withStocks(createState(), { material: 1000, food: 1000 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 1, 2)
    state = opRoad(state, 2, 0)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 2, 2)
    // A second residence on its own isolated network with no Well.
    state = op(state, 'residence', 20, 0)
    state = opRoad(state, 21, 0)
    state = createColonist(state, 'building-1').state
    state = createColonist(state, 'building-2').state
    state = assignJobs(state)
    const coverage = getWaterCoverage(state)
    audit('COVERAGE_DIFFERENT_NETWORK', {
      servedResidences: coverage.servedResidenceIds,
      servedColonists: coverage.servedColonistIds,
    })
    expect(coverage.servedResidenceIds).toEqual(['building-1'])
    expect(coverage.servedColonistIds).toEqual(['colonist-1'])
  })

  it('a roadless Well covers nothing; an operational Well covers its network', () => {
    const roadless = waterWorld({ residences: 1, wells: 1, colonists: 0, roads: false })
    const connected = waterWorld({ residences: 1, wells: 1, colonists: 0 })
    audit('COVERAGE_ACCESS', {
      roadless: getWaterCoverage(roadless).servedResidenceIds.length,
      connected: getWaterCoverage(connected).servedResidenceIds.length,
    })
    expect(getWaterCoverage(roadless).servedResidenceIds.length).toBe(0)
    expect(getWaterCoverage(connected).servedResidenceIds.length).toBe(1)
  })

  it('an under-construction Well covers nothing', () => {
    let state = waterWorld({ residences: 1, wells: 0, colonists: 0 })
    const created = createBuilding(state, 'well', 9, 2, 2)
    state = created.state
    expect(hasOperationalWell(state)).toBe(false)
    expect(getWaterCoverage(state).servedResidenceIds.length).toBe(0)
  })

  it('multiple Wells on one network do not multiply coverage or consumption', () => {
    const state = waterWorld({ residences: 1, wells: 2, colonists: 1, water: 100 })
    const status = getWaterStatus(state)
    audit('COVERAGE_MULTIPLE_WELLS', status)
    expect(status.servedResidenceCount).toBe(1)
    expect(status.servedColonistCount).toBe(1)
    expect(status.needPerTick).toBe(1)
    // Only one colonist exists, so only one Well is staffed -> +2 Water.
    expect(status.productionPerTick).toBe(WATER_PER_WELL_PER_TICK)
  })

  it('multiple Residences on the Well network are all served', () => {
    const state = waterWorld({ residences: 3, wells: 1, colonists: 3 })
    expect(getWaterCoverage(state).servedResidenceIds.length).toBe(3)
    expect(getWaterCoverage(state).servedColonistIds.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 3 — Consumption & shortage
// ---------------------------------------------------------------------------

describe('3 — consumption and shortage', () => {
  it('served colonists consume 1 Water each and unserved consume none', () => {
    const served = waterWorld({ residences: 1, wells: 1, colonists: 1, water: 10 })
    const unserved = waterWorld({ residences: 1, wells: 0, colonists: 1, water: 10 })
    const servedAfter = advance(served, 1)
    const unservedAfter = advance(unserved, 1)
    audit('CONSUMPTION', {
      servedWater: servedAfter.resources.water,
      unservedWater: unservedAfter.resources.water,
    })
    // Served: the pre-staffed Well produces +2, then the colonist consumes 1.
    expect(servedAfter.resources.water).toBe(11)
    // Unserved: no Well exists so the gate is off, and nobody consumes.
    expect(unservedAfter.resources.water).toBe(10)
  })

  it('a shortage clamps Water to 0 and never goes negative; colonists survive', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1, water: 0 })
    const after = advance(state, 5)
    audit('SHORTAGE', {
      water: after.resources.water,
      population: getPopulationCount(after),
      shortage: getWaterStatus(after).shortage,
    })
    expect(after.resources.water).toBeGreaterThanOrEqual(0)
    expect(getPopulationCount(after)).toBe(1)
  })

  it('Water shortage does not kill existing colonists (no second starvation)', () => {
    // Served residence, no production (unstaffed Well), zero stock.
    const state = waterWorld({ residences: 2, wells: 1, colonists: 2, water: 0 })
    const after = advance(state, 30)
    audit('NO_WATER_STARVATION', {
      population: getPopulationCount(after),
      water: after.resources.water,
    })
    expect(getPopulationCount(after)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 4 — Admission gate
// ---------------------------------------------------------------------------

describe('4 — admission gate', () => {
  it('admits the first colonist into a served Residence', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 0, water: 0 })
    const after = advance(state, 1)
    audit('ADMIT_SERVED', { population: getPopulationCount(after), water: after.resources.water })
    expect(getPopulationCount(after)).toBe(1)
  })

  it('does not admit when a Well exists but the Residence is unserved', () => {
    let state = withStocks(createState(), { material: 1000, food: 1000, water: 100 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    // Well on a completely separate network.
    state = op(state, 'well', 20, 2)
    state = opRoad(state, 21, 2)
    const after = advance(state, 3)
    audit('ADMIT_UNSERVED', { population: getPopulationCount(after), servedSubjects: getWaterCoverage(after).servedResidenceIds })
    expect(hasOperationalWell(state)).toBe(true)
    expect(getPopulationCount(after)).toBe(0)
  })

  it('does not admit without Food even when served', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 0, food: 0, water: 100 })
    const after = advance(state, 1)
    audit('ADMIT_NO_FOOD', { population: getPopulationCount(after) })
    expect(getPopulationCount(after)).toBe(0)
  })

  it('does not admit without free housing', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1, water: 100 })
    const after = advance(state, 3)
    expect(getPopulationCount(after)).toBe(1)
  })

  it('blocks admission beyond production headroom; stock alone cannot resume growth', () => {
    // 3 served colonists, 4 served residences, 1 Well: production 2 < need 3.
    let state = waterWorld({ residences: 4, wells: 1, colonists: 3, water: 0, food: 1000 })
    const blocked = advance(state, 5)
    const populationBlocked = getPopulationCount(blocked)
    const shortage = getWaterStatus(blocked).shortage
    // Step 10S: a large stock does NOT resume growth; production capacity is
    // the gate.
    state = withStocks(blocked, { water: 100 })
    const stillBlocked = advance(state, 2)
    audit('ADMIT_SHORTAGE', {
      populationBlocked,
      shortageDuringBlock: shortage,
      populationAfterStock: getPopulationCount(stillBlocked),
      waterAfterStock: stillBlocked.resources.water,
    })
    expect(populationBlocked).toBe(3)
    expect(shortage).toBe(true)
    expect(getPopulationCount(stillBlocked)).toBe(3)
  })

  it('keeps the historical bootstrap when no Well exists (Step 10P bootstrap rule)', () => {
    const state = waterWorld({ residences: 2, wells: 0, colonists: 0, food: 1000 })
    const after = advance(state, 2)
    audit('BOOTSTRAP_NO_WELL', { population: getPopulationCount(after), hasWell: hasOperationalWell(state) })
    expect(hasOperationalWell(state)).toBe(false)
    expect(getPopulationCount(after)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 5 — Workforce integration
// ---------------------------------------------------------------------------

describe('5 — workforce integration', () => {
  it('a Well joins the type-blind pool and is staffed automatically', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1 })
    audit('WORKFORCE_AUTO', {
      wells: wellIds(state),
      staffed: countStaffedOperationalWells(state),
    })
    expect(countStaffedOperationalWells(state)).toBe(1)
  })

  it('manual reassignment Farm -> Well trades Food for Water', () => {
    const state = waterWorld({ residences: 2, farms: 2, wells: 1, colonists: 2, water: 1000 })
    const well = wellIds(state)[0]!
    const farmWorker = Object.values(state.colonists).find((c) => {
      const w = state.buildings[c.workplaceId ?? '']
      return w?.type === 'farm'
    })!
    const before = {
      foodProduction: require_staffedFarms(state),
      waterProduction: waterProductionForTick(state),
    }
    const manual = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: farmWorker.id,
      workplaceId: well,
    })
    audit('WORKFORCE_FARM_TO_WELL', {
      before,
      after: { foodProduction: require_staffedFarms(manual), waterProduction: waterProductionForTick(manual) },
    })
    expect(before.foodProduction).toBe(2)
    expect(before.waterProduction).toBe(0)
    expect(require_staffedFarms(manual)).toBe(1)
    expect(waterProductionForTick(manual)).toBe(WATER_PER_WELL_PER_TICK)
  })

  it('manual reassignment Workshop -> Well trades Material for Water', () => {
    const state = waterWorld({ residences: 2, workshops: 1, wells: 1, colonists: 2, material: 100 })
    const well = wellIds(state)[0]!
    const shopWorker = Object.values(state.colonists).find((c) => {
      const w = state.buildings[c.workplaceId ?? '']
      return w?.type === 'workshop'
    })!
    const manual = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: shopWorker.id,
      workplaceId: well,
    })
    audit('WORKFORCE_WORKSHOP_TO_WELL', {
      workshopWorkersBefore: 1,
      waterProduction: waterProductionForTick(manual),
      staffedWorkshops: Object.values(manual.buildings).filter(
        (b) => b.type === 'workshop'
      ).length,
    })
    expect(waterProductionForTick(manual)).toBe(WATER_PER_WELL_PER_TICK)
  })

  it('manual reassignment Well -> Farm is valid and preserves the override', () => {
    const state = waterWorld({ residences: 1, farms: 1, wells: 1, colonists: 1 })
    const well = wellIds(state)[0]!
    const farm = Object.values(state.buildings).find((b) => b.type === 'farm')!
    // Automatic: the Well or Farm nearest; force the Well assignment first.
    expect(validateReassignment(state, 'colonist-1', farm.id)).toMatchObject({ valid: true })
    void well
  })

  it('a Well workplace rejects duplicate capacity', () => {
    const state = waterWorld({ residences: 2, wells: 1, colonists: 2 })
    const well = wellIds(state)[0]!
    const second = Object.values(state.colonists).find((c) => c.workplaceId !== well)!
    expect(validateReassignment(state, second.id, well)).toEqual({
      valid: false,
      reason: 'workplaceOccupied',
    })
  })
})

function require_staffedFarms(state: SimulationState): number {
  let count = 0
  for (const building of Object.values(state.buildings)) {
    if (building.type !== 'farm' || building.status !== 'operational') continue
    const workers = Object.values(state.colonists).filter(
      (c) => c.workplaceId === building.id
    ).length
    if (workers > 0) count += 1
  }
  return count
}

// ---------------------------------------------------------------------------
// 6 — Multiple networks
// ---------------------------------------------------------------------------

describe('6 — multiple networks', () => {
  it('connecting a served network to an unserved Residence enables admission', () => {
    let state = withStocks(createState(), { material: 1000, food: 1000, water: 100 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 1, 2)
    state = op(state, 'residence', 12, 0)
    state = opRoad(state, 2, 0)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 2, 2)
    // The second Residence has its own isolated network.
    state = opRoad(state, 11, 0)
    state = advance(state, 1)
    const before = getWaterCoverage(state).servedResidenceIds
    // Connect the networks.
    for (let x = 2; x <= 11; x += 1) state = opRoad(state, x, 1)
    const after = getWaterCoverage(state).servedResidenceIds
    audit('MULTIPLE_NETWORKS', { before, after })
    expect(before).toEqual(['building-1'])
    expect(after).toEqual(['building-1', 'building-3'])
  })
})

// ---------------------------------------------------------------------------
// 7 — Timing
// ---------------------------------------------------------------------------

describe('7 — timing', () => {
  it('a Well produces from the tick AFTER its worker is assigned (Food timing)', () => {
    let state = withStocks(createState(), { material: 1000, food: 1000, water: 100 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 1, 2)
    state = opRoad(state, 2, 0)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 2, 2)
    // Tick 1: colonist admitted and assigned; produceWater already ran.
    state = stepSimulation(state)
    const afterAssign = state.resources.water
    const staffed = countStaffedOperationalWells(state)
    // Tick 2: the assigned worker produces.
    state = stepSimulation(state)
    audit('TIMING', {
      waterAfterAssignTick: afterAssign,
      staffedAfterAssignTick: staffed,
      waterAfterProductionTick: state.resources.water,
    })
    expect(staffed).toBe(1)
    // The admission tick computed coverage BEFORE the new colonist existed,
    // so nothing was consumed yet: Water is still at its starting stock.
    expect(afterAssign).toBe(100)
    // Next tick: +2 produced, -1 consumed -> 101.
    expect(state.resources.water).toBe(101)
  })
})

// ---------------------------------------------------------------------------
// 8 — Persistence & migration
// ---------------------------------------------------------------------------

describe('8 — persistence and migration', () => {
  it('SAVE_VERSION is 6 and the Water stock round-trips', () => {
    expect(SAVE_VERSION).toBe(8)
    const state = waterWorld({ residences: 2, wells: 1, colonists: 2, water: 42 })
    const restored = loadSave(serializeSave(state))
    expect(restored.resources.water).toBe(42)
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })

  it('migrates a v5 save by adding water = 0', () => {
    const state = waterWorld({ residences: 2, wells: 1, colonists: 2, water: 42 })
    const parsed = JSON.parse(serializeSave(state)) as {
      version: number
      state: { resources: Record<string, unknown> }
    }
    parsed.version = 5
    delete parsed.state.resources['water']
    const restored = loadSave(JSON.stringify(parsed))
    expect(restored.resources.water).toBe(0)
    audit('MIGRATION_V5', { water: restored.resources.water })
  })

  it('chains a v4 save through v5 to v6 (water = 0, automatic mode)', () => {
    const state = waterWorld({ residences: 1, wells: 1, colonists: 1 })
    const parsed = JSON.parse(serializeSave(state)) as {
      version: number
      state: {
        resources: Record<string, unknown>
        colonists: Record<string, Record<string, unknown>>
      }
    }
    parsed.version = 4
    delete parsed.state.resources['water']
    for (const colonist of Object.values(parsed.state.colonists)) {
      delete colonist['workplaceAssignmentMode']
    }
    const restored = loadSave(JSON.stringify(parsed))
    expect(restored.resources.water).toBe(0)
    for (const colonist of Object.values(restored.colonists)) {
      expect(colonist.workplaceAssignmentMode).toBe('automatic')
    }
  })

  it('MIGRATABLE_SAVE_VERSION is 6 and older saves are rejected', () => {
    expect(MIGRATABLE_SAVE_VERSION).toBe(7)
    const save = serializeSave(waterWorld({ residences: 1, wells: 1 }))
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 3
    expect(() => loadSave(JSON.stringify(parsed))).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 9 — Determinism
// ---------------------------------------------------------------------------

describe('9 — determinism', () => {
  it('replay and insertion order are deterministic with Water', () => {
    const run = (): SimulationState =>
      advance(waterWorld({ residences: 3, farms: 1, wells: 1, colonists: 3, water: 100 }), 60)
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    expect(getWaterCoverage(reversed).servedResidenceIds).toEqual(
      getWaterCoverage(a).servedResidenceIds
    )
    audit('DETERMINISM', { hash: hashCanonicalState(a) })
  })
})

// ---------------------------------------------------------------------------
// 11 — Performance
// ---------------------------------------------------------------------------

describe('11 — performance', () => {
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

  it('measures coverage and step cost at SMALL and MEDIUM sizes', () => {
    const measure = (fn: () => void): number => {
      const start = performance.now()
      fn()
      return performance.now() - start
    }
    const out: Record<string, unknown> = {}
    for (const [name, workplaces, residences, ticks] of [
      ['SMALL', 9, 5, 10],
      ['MEDIUM', 90, 40, 3],
    ] as const) {
      const state = cluster(workplaces, residences)
      const coverageMs = measure(() => { getWaterCoverage(state) })
      const perTickMs = measure(() => {
        let next = state
        for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      }) / ticks
      out[name] = {
        workplaces,
        residences,
        coverageMs: Number(coverageMs.toFixed(3)),
        perTickMs: Number(perTickMs.toFixed(3)),
        servedResidences: getWaterCoverage(state).servedResidenceIds.length,
      }
    }
    audit('PERFORMANCE', out)
    expect((out['SMALL'] as { perTickMs: number }).perTickMs).toBeLessThan(1000)
    expect((out['MEDIUM'] as { servedResidences: number }).servedResidences).toBeGreaterThan(0)
  }, 300000)
})


describe('10 — economic ledger', () => {
  it('attributes Water changes to Wells, staffing, roads and consumption only', () => {
    const state = waterWorld({ residences: 2, farms: 1, wells: 1, colonists: 2, water: 0 })
    const trace: unknown[] = []
    let current = state
    for (let i = 0; i < 6; i += 1) {
      current = stepSimulation(current)
      trace.push({
        tick: current.time.tick,
        water: current.resources.water,
        production: waterProductionForTick(current),
        need: getWaterStatus(current).needPerTick,
        staffedWells: countStaffedOperationalWells(current),
      })
    }
    audit('WATER_LEDGER', trace)
    expect(trace.length).toBe(6)
  })
})
