/**
 * Workshop Water construction cost (Step 10AD).
 *
 * Focused implementation coverage for the one-off Water construction
 * investment: `Workshop = 25 Material + 1 Water`, charged atomically at
 * placement, never consumed by operation.
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  BUILDING_CATALOG,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getMaterialProductionPerTick,
  getMaterialUpkeepPerTick,
  getPopulationCount,
  getResourceStock,
  getWaterStock,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validatePlacement,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10ad', width: 20, height: 10 } }

const createState = (): SimulationState => createInitialState(config)

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

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ad: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10ad: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ad: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

const place = (x: number, y: number, type: BuildingType) =>
  ({ type: 'placeBuilding', x, y, buildingType: type }) as const

const canPay = (material: number, water: number): SimulationState =>
  withStocks(opRoad(createState(), 1, 1), { food: 500, material, water })

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// §1/§2 — contract, placement and atomic deduction
// ---------------------------------------------------------------------------

describe('§1/§2 — Workshop construction contract', () => {
  it('declares 25 Material + 1 Water and leaves every other building uncosted', () => {
    audit('CATALOG', {
      residence: BUILDING_CATALOG.residence,
      farm: BUILDING_CATALOG.farm,
      workshop: BUILDING_CATALOG.workshop,
      well: BUILDING_CATALOG.well,
    })
    expect(getBuildingDefinition('workshop').constructionCost).toBe(25)
    expect(getBuildingDefinition('workshop').constructionWaterCost).toBe(1)
    for (const type of ['residence', 'farm', 'well'] as const) {
      expect(getBuildingDefinition(type).constructionWaterCost).toBe(0)
    }
  })

  it('deducts exactly 25 Material and 1 Water in one accepted placement', () => {
    const before = canPay(25, 1)
    const after = stepSimulation(before, place(2, 2, 'workshop'))
    audit('PLACEMENT', {
      material: `${before.resources.construction} -> ${after.resources.construction}`,
      water: `${before.resources.water} -> ${after.resources.water}`,
      status: after.buildings['building-1']?.status,
      constructionRemaining: after.buildings['building-1']?.constructionRemaining,
    })
    expect(after.resources.construction).toBe(0)
    expect(after.resources.water).toBe(0)
    expect(after.buildings['building-1']?.status).toBe('underConstruction')
  })

  it('rejects without mutation when Water is insufficient (and reports the reason)', () => {
    const before = canPay(25, 0)
    const validation = validatePlacement(before, { x: 2, y: 2 }, 'workshop')
    const result = applyCommand(before, place(2, 2, 'workshop'))
    const after = stepSimulation(before, place(2, 2, 'workshop'))
    audit('REJECT_WATER', {
      validation,
      accepted: result.accepted,
      reason: result.reason,
      materialUnchanged: getResourceStock(after).construction,
      waterUnchanged: getWaterStock(after),
      buildings: Object.keys(after.buildings).length,
    })
    expect(validation).toEqual({ valid: false, reason: 'insufficientWater' })
    expect(result.accepted).toBe(false)
    expect(result.state).toBe(before)
    // A rejected placement is an explicit no-op tick: no mutation at all.
    expect(after.resources).toEqual(before.resources)
    expect(Object.keys(after.buildings)).toHaveLength(0)
  })

  it('keeps the existing Material rejection and the both-insufficient case', () => {
    const brokeMaterial = canPay(24, 5)
    const brokeBoth = canPay(0, 0)
    audit('REJECT_MATERIAL', {
      materialOnly: validatePlacement(brokeMaterial, { x: 2, y: 2 }, 'workshop'),
      both: validatePlacement(brokeBoth, { x: 2, y: 2 }, 'workshop'),
    })
    expect(validatePlacement(brokeMaterial, { x: 2, y: 2 }, 'workshop')).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
    expect(validatePlacement(brokeBoth, { x: 2, y: 2 }, 'workshop')).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
  })
})

// ---------------------------------------------------------------------------
// §10 — isolation: every other building is unaffected
// ---------------------------------------------------------------------------

describe('§10 — isolation', () => {
  it('Residence, Farm, Well and Road still place with zero Water', () => {
    for (const type of ['residence', 'farm', 'well'] as const) {
      const before = canPay(25, 0)
      const after = stepSimulation(before, place(2, 2, type))
      expect(after.buildings['building-1']?.type).toBe(type)
      expect(after.resources.construction).toBe(0)
      expect(after.resources.water).toBe(0)
    }
    const roadBase = withStocks(createState(), { food: 500, material: 5, water: 0 })
    const roads = stepSimulation(roadBase, { type: 'placeRoads', cells: [{ x: 1, y: 1 }] })
    audit('ISOLATION', {
      residenceFarmWell: 'placed with Water 0',
      road: { roads: Object.keys(roads.roads).length, material: roads.resources.construction, water: roads.resources.water },
    })
    expect(Object.keys(roads.roads)).toHaveLength(1)
    expect(roads.resources.water).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §4 — operation consumes no Water
// ---------------------------------------------------------------------------

describe('§4 — operation consumes no Water', () => {
  it('a staffed operational Workshop never draws Water and keeps its Material rules', () => {
    // Residence + staffed Workshop, no Well: coverage is inactive, so the
    // colony has no Water sink at all. Ten ticks of production must leave the
    // Water stock exactly where it started, while Material behaves as before.
    let state = withStocks(createState(), { food: 500, material: 0, water: 10 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'workshop', 1, 2)
    state = opRoad(state, 1, 1)
    state = createColonist(state, 'building-1').state
    state = assignJobs(state)
    const waterBefore = state.resources.water
    const after = advance(state, 10)
    audit('NO_OPERATIONAL_WATER_DRAW', {
      waterBefore,
      waterAfter: after.resources.water,
      staffedWorkshops: countStaffedOperationalWorkshops(after),
      materialProduction: getMaterialProductionPerTick(after),
      materialUpkeep: getMaterialUpkeepPerTick(after),
      note: 'the Workshop is operational and staffed for all ten ticks and never touches Water',
    })
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    expect(after.resources.water).toBe(waterBefore)
    expect(getMaterialProductionPerTick(after)).toBe(2)
    expect(getMaterialUpkeepPerTick(after)).toBe(1)
  })

  it('multiple Workshops never multiply Water consumption per tick', () => {
    let state = withStocks(createState(), { food: 500, material: 0, water: 5 })
    for (let i = 0; i < 3; i += 1) state = op(state, 'workshop', 1 + i * 2, 2)
    for (let x = 0; x < 8; x += 1) state = opRoad(state, x, 1)
    const before = state.resources.water
    const after = advance(state, 30)
    audit('MULTI_WORKSHOP_WATER', {
      workshops: Object.values(after.buildings).filter((b) => b.type === 'workshop').length,
      waterBefore: before,
      waterAfter: after.resources.water,
      note: 'no Wells and no colonists: 30 ticks with three Workshops move Water by exactly zero',
    })
    expect(after.resources.water).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// §6 — Construction Crew interaction
// ---------------------------------------------------------------------------

describe('§6 — Construction Crew', () => {
  const crewWorld = (): SimulationState => {
    let state = withStocks(createState(), { food: 500, material: 25, water: 1 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 1, 1)
    state = opRoad(state, 2, 1)
    state = createColonist(state, 'building-1').state
    return assignJobs(state)
  }

  it('uncrewed Workshop takes 2 ticks, crewed 1 tick, and both pay exactly one Water', () => {
    const measure = (crew: boolean): Record<string, unknown> => {
      const start = crewWorld()
      let next = stepSimulation(start, place(2, 2, 'workshop'))
      const waterAfterPlacement = next.resources.water
      const siteId = 'building-2'
      let completion = -1
      for (let i = 1; i <= 4; i += 1) {
        const command =
          crew && i === 1
            ? { type: 'assignConstructionCrew' as const, colonistId: 'colonist-1', buildingId: siteId }
            : undefined
        next = stepSimulation(next, command)
        if (completion === -1 && next.buildings[siteId]?.status === 'operational') completion = i
      }
      return {
        crew,
        waterAfterPlacement,
        waterAfterConstruction: next.resources.water,
        completionTick: completion,
      }
    }
    const uncrewed = measure(false)
    const crewed = measure(true)
    audit('CREW_AND_WATER', { uncrewed, crewed })
    expect(uncrewed.waterAfterPlacement).toBe(0)
    expect(crewed.waterAfterPlacement).toBe(0)
    expect(uncrewed.completionTick).toBe(2)
    expect(crewed.completionTick).toBe(1)
    // No extra Water is charged by crewing (no Wells here, so Water is frozen).
    expect(uncrewed.waterAfterConstruction).toBe(0)
    expect(crewed.waterAfterConstruction).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §10 — Water economy interaction
// ---------------------------------------------------------------------------

describe('§10 — Water economy', () => {
  it('one Workshop payment coexists with the existing admission gate', () => {
    // A residence and its colonist staff a Well (2 Water/tick) and need 1, so a
    // Water surplus exists: the Workshop placement can be paid while the 10S
    // admission gate keeps operating on production capacity.
    let state = withStocks(createState(), { food: 500, material: 25, water: 0 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'well', 3, 2)
    state = opRoad(state, 1, 1)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 3, 1)
    state = createColonist(state, 'building-1').state
    state = assignJobs(state)
    const grown = advance(state, 4)
    const placedWorkshop = stepSimulation(grown, place(1, 2, 'workshop'))
    audit('WATER_ECONOMY', {
      waterAfterFourTicks: grown.resources.water,
      populationBefore: getPopulationCount(grown),
      workshopPlaced: placedWorkshop.buildings['building-3']?.type,
      waterAfterWorkshopPayment: placedWorkshop.resources.water,
      note: 'admission is unchanged: the gate reads production capacity while the Workshop charge reads the stock',
    })
    expect(grown.resources.water).toBeGreaterThan(0)
    expect(placedWorkshop.buildings['building-3']?.type).toBe('workshop')
    // Water arithmetic of the payment tick: -1 payment +2 Well production
    // -1 colonist consumption = unchanged. The payment consumes exactly the
    // tick's surplus, which is the causal pressure Step 10AC measured.
    expect(placedWorkshop.resources.water).toBe(grown.resources.water)
  })

  it('Water never becomes negative across repeated Workshop placements', () => {
    let state = withStocks(createState(), { food: 500, material: 500, water: 3 })
    for (let x = 0; x < 9; x += 1) state = opRoad(state, x, 1)
    let placed = 0
    for (let i = 0; i < 5; i += 1) {
      const next = stepSimulation(state, place(1 + i * 2, 2, 'workshop'))
      if (Object.keys(next.buildings).length > Object.keys(state.buildings).length) placed += 1
      state = next
      expect(state.resources.water).toBeGreaterThanOrEqual(0)
    }
    audit('WATER_NEVER_NEGATIVE', { attempted: 5, placed, waterEnd: state.resources.water })
    expect(placed).toBe(3)
    expect(state.resources.water).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §8 — persistence and determinism
// ---------------------------------------------------------------------------

describe('§8 — persistence and determinism', () => {
  it('keeps SAVE_VERSION 7 with no migration, and the Water deduction is canonical', () => {
    const before = canPay(25, 2)
    const after = stepSimulation(before, place(2, 2, 'workshop'))
    const restored = loadSave(serializeSave(after))
    audit('PERSISTENCE', {
      saveVersion: SAVE_VERSION,
      migration: 'none',
      newPersistedField: 'none (water already canonical)',
      hashBefore: hashCanonicalState(before),
      hashAfter: hashCanonicalState(after),
      hashChangedByDeduction: hashCanonicalState(before) !== hashCanonicalState(after),
      saveLoadStable: serializeCanonicalState(restored) === serializeCanonicalState(after),
      water: getWaterStock(after),
    })
    expect(SAVE_VERSION).toBe(7)
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(after))
    expect(hashCanonicalState(before)).not.toBe(hashCanonicalState(after))
  })

  it('is replay-deterministic and insertion-order independent', () => {
    const run = (): SimulationState =>
      advance(canPay(50, 5), 20)
    const a = run()
    const b = run()
    const state = stepSimulation(canPay(50, 5), place(2, 2, 'workshop'))
    const reversed: SimulationState = {
      ...state,
      buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(state.roads).reverse()),
      colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
    }
    audit('DETERMINISM', {
      replayStable: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderStable: hashCanonicalState(reversed) === hashCanonicalState(state),
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(state))
  })
})
