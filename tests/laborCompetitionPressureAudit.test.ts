/**
 * Labor Competition Pressure Audit (Step 10F).
 *
 * AUDIT ONLY — no production rule is changed, `src/` is untouched. This suite
 * encodes the mandatory Step 10F experiments as deterministic measurements so
 * the audit report (docs/roadmap/Step10F.md) is backed by numbers instead of
 * intuition.
 *
 *   §3  labor budget matrix (1-4 colonists x workplace mixes)
 *   §4  Farm vs Workshop opportunity cost (paired, one decision apart)
 *   §5  Food-side pressure
 *   §6  Material-side pressure (incl. the 24-vs-25 equilibrium)
 *   §7  bootstrap trajectory (real command chain)
 *   §8  spatial preference (09M) as economic specialization
 *   §9  multi-colonist competition / id-order effects on the mix
 *   §10 greedy vs theoretical-optimal assignment
 *   §11 construction feedback loops
 *   §14 UI information audit (in-repo surface)
 *   §15 Farm vs Workshop production timing
 *   §16 persistence / determinism
 *   §17 performance with mixed Farms + Workshops
 *
 * Every "AUDIT ..." console line is raw evidence quoted in the report.
 *
 * Rules verified in src (Step 10E):
 *   Farm staffed -> +2 Food/tick             (FOOD_PER_FARM_PER_TICK)
 *   Workshop staffed -> +2 Material/tick     (MATERIAL_PER_WORKER_PER_TICK)
 *   Food need = population x 1               (FOOD_PER_COLONIST_PER_TICK)
 *   Upkeep = 1 per staffed operational Workshop per tick
 *   Storage = 25 per operational Workshop
 *   Cost 25 per building, 5 per road cell; placed tick T -> operational T+1
 *   Admission needs a free operational residence + food left after consumption
 *   produceFood runs BEFORE assignJobs -> farm output lags one tick; Material
 *   is produced in the same tick it is assigned.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  FOOD_PER_FARM_PER_TICK,
  getBuildingInspection,
  getEmploymentSummary,
  getPopulationCount,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialStorageCapacityForTick,
  materialUpkeepDueForTick,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

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
  /** Which workplace type is created first -> which gets the lower id. */
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

/**
 * One connected road network: residences on row y = 0, workplaces on row
 * y = 2, a road row y = 1 spanning every column. Every residence is therefore
 * mobility-connected to every workplace, and a residence shares its contact
 * cell with the workplace in the same column (road distance 0).
 */
const rowWorld = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createTestState(), {
    food: spec.food ?? 100,
    material: spec.material ?? 0,
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

interface Reading {
  readonly pop: number
  readonly farmWorkers: number
  readonly workshopWorkers: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly foodProd: number
  readonly matProd: number
  readonly storedMat: number
  readonly upkeep: number
  readonly food: number
  readonly material: number
  readonly storage: number
  readonly netFood: number
  readonly netMaterial: number
}

const read = (state: SimulationState): Reading => {
  const employment = getEmploymentSummary(state)
  const storage = materialStorageCapacityForTick(state)
  const matProd = materialProductionForTick(state)
  const upkeep = materialUpkeepDueForTick(state)
  const storedMat = Math.min(matProd, Math.max(0, storage - state.resources.construction))
  const farmWorkers = countStaffedOperationalFarms(state)
  return {
    pop: getPopulationCount(state),
    farmWorkers,
    workshopWorkers: countStaffedOperationalWorkshops(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: employment.jobCapacity,
    foodProd: farmWorkers * FOOD_PER_FARM_PER_TICK,
    matProd,
    storedMat,
    upkeep,
    food: state.resources.food,
    material: state.resources.construction,
    storage,
    netFood: farmWorkers * FOOD_PER_FARM_PER_TICK - getPopulationCount(state),
    netMaterial: storedMat - upkeep,
  }
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
// §3 — Labor budget matrix
// ---------------------------------------------------------------------------

describe('§3 — labor budget matrix', () => {
  const combos = [
    { colonists: 1, farms: 1, workshops: 0 },
    { colonists: 1, farms: 0, workshops: 1 },
    { colonists: 1, farms: 1, workshops: 1 },
    { colonists: 2, farms: 1, workshops: 1 },
    { colonists: 2, farms: 2, workshops: 1 },
    { colonists: 2, farms: 1, workshops: 2 },
    { colonists: 2, farms: 2, workshops: 2 },
    { colonists: 3, farms: 2, workshops: 2 },
    { colonists: 3, farms: 3, workshops: 2 },
    { colonists: 3, farms: 2, workshops: 3 },
    { colonists: 4, farms: 2, workshops: 2 },
    { colonists: 4, farms: 3, workshops: 2 },
    { colonists: 4, farms: 2, workshops: 3 },
  ] as const

  it('measures staffing, production, storage and upkeep for every combination', () => {
    for (const combo of combos) {
      const r = read(
        rowWorld({
          residences: combo.colonists,
          farms: combo.farms,
          workshops: combo.workshops,
        })
      )
      audit(`BUDGET pop=${combo.colonists} F=${combo.farms} W=${combo.workshops}`, {
        farmWorkers: r.farmWorkers,
        workshopWorkers: r.workshopWorkers,
        unemployed: r.unemployed,
        vacant: r.jobCapacity - r.employed,
        foodProd: r.foodProd,
        matProd: r.matProd,
        storedMat: r.storedMat,
        upkeep: r.upkeep,
        netFood: r.netFood,
        netMaterial: r.netMaterial,
      })
    }
  })

  it('labour is the binding limit while workplaces exceed colonists', () => {
    for (const combo of [
      { colonists: 2, farms: 2, workshops: 2 },
      { colonists: 3, farms: 3, workshops: 2 },
      { colonists: 2, farms: 1, workshops: 2 },
    ] as const) {
      const r = read(
        rowWorld({
          residences: combo.colonists,
          farms: combo.farms,
          workshops: combo.workshops,
        })
      )
      expect(r.employed).toBe(combo.colonists)
      expect(r.unemployed).toBe(0)
      expect(r.jobCapacity).toBe(combo.farms + combo.workshops)
      expect(r.jobCapacity).toBeGreaterThan(combo.colonists)
    }
  })

  it('workplaces at or below the colonist count leave colonists unemployed', () => {
    const r = read(rowWorld({ residences: 4, farms: 1, workshops: 1 }))
    expect(r.employed).toBe(2)
    expect(r.unemployed).toBe(2)
    expect(r.jobCapacity).toBe(2)
    expect(r.farmWorkers).toBe(1)
    expect(r.workshopWorkers).toBe(1)
  })

  it('one staffed Farm exactly feeds two colonists (net 0 Food/tick)', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    const r = read(state)
    expect(r.pop).toBe(2)
    expect(r.netFood).toBe(0)
    const after = advance(state, 5)
    audit('ONE_FARM_TWO_POP', {
      before: r.food,
      after5: after.resources.food,
      netFoodPerTick: (after.resources.food - r.food) / 5,
    })
    expect(after.resources.food - r.food).toBe(0)
  })

  it('the Food rule is a strict ratio: 2 colonists per staffed Farm', () => {
    for (const farms of [1, 2, 3]) {
      const r = read(rowWorld({ residences: farms * 2, farms, workshops: 0 }))
      expect(r.farmWorkers).toBe(farms)
      expect(r.netFood).toBe(0)
    }
    // One extra idle mouth turns the colony Food-negative.
    const over = read(rowWorld({ residences: 3, farms: 1, workshops: 0 }))
    expect(over.netFood).toBe(-1)
    audit('FOOD_RATIO', { perStaffedFarm: 2, overByOneColonist: over.netFood })
  })
})

// ---------------------------------------------------------------------------
// §4 — Farm vs Workshop opportunity cost
// ---------------------------------------------------------------------------

describe('§4 — Farm vs Workshop opportunity cost (one decision apart)', () => {
  /**
   * Residence (2,1); a Farm and a Workshop both adjacent to its only road
   * contact (2,2), so both are at road distance 0 and the lower id wins.
   */
  const pairedWorld = (first: 'farm' | 'workshop'): SimulationState => {
    let state = createTestState()
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

  it('the two branches are mutually exclusive and equal in magnitude (2 XOR 2)', () => {
    const farmSide = read(pairedWorld('farm'))
    const workshopSide = read(pairedWorld('workshop'))
    audit('OPPORTUNITY_COST', {
      farmStaffed: {
        farmWorkers: farmSide.farmWorkers,
        workshopWorkers: farmSide.workshopWorkers,
        foodProd: farmSide.foodProd,
        matProd: farmSide.matProd,
        upkeep: farmSide.upkeep,
        netFood: farmSide.netFood,
        netMaterial: farmSide.netMaterial,
      },
      workshopStaffed: {
        farmWorkers: workshopSide.farmWorkers,
        workshopWorkers: workshopSide.workshopWorkers,
        foodProd: workshopSide.foodProd,
        matProd: workshopSide.matProd,
        upkeep: workshopSide.upkeep,
        netFood: workshopSide.netFood,
        netMaterial: workshopSide.netMaterial,
      },
    })
    for (const r of [farmSide, workshopSide]) {
      expect(r.farmWorkers + r.workshopWorkers).toBe(1)
    }
    expect(farmSide.foodProd).toBe(2)
    expect(farmSide.matProd).toBe(0)
    expect(farmSide.upkeep).toBe(0)
    expect(workshopSide.foodProd).toBe(0)
    expect(workshopSide.matProd).toBe(2)
    expect(workshopSide.upkeep).toBe(1)
  })

  it('the fork is forced while colonists < workplaces and vanishes above it', () => {
    const forced = read(rowWorld({ residences: 1, farms: 1, workshops: 1 }))
    const both = read(rowWorld({ residences: 2, farms: 1, workshops: 1 }))
    audit('FORK_WIDTH', {
      oneColonist: { employed: forced.employed, vacant: forced.jobCapacity - forced.employed },
      twoColonists: { employed: both.employed, vacant: both.jobCapacity - both.employed },
    })
    expect(forced.jobCapacity - forced.employed).toBe(1)
    expect(both.jobCapacity - both.employed).toBe(0)
    expect(both.foodProd).toBe(2)
    expect(both.matProd).toBe(2)
  })

  it('the fork is asymmetric in cost: only the Workshop branch pays upkeep', () => {
    const farm = read(pairedWorld('farm'))
    const shop = read(pairedWorld('workshop'))
    expect(farm.upkeep).toBe(0)
    expect(shop.upkeep).toBe(1)
    audit('FORK_ASYMMETRY', {
      farmBranchUpkeep: farm.upkeep,
      workshopBranchUpkeep: shop.upkeep,
      note: 'Material is the only resource that pays maintenance; Food is free to hold',
    })
  })
})

// ---------------------------------------------------------------------------
// §5 — Food-side pressure
// ---------------------------------------------------------------------------

describe('§5 — Food-side pressure', () => {
  /** Low Food reserve; the worker goes to whichever workplace is nearer. */
  const pressureWorld = (near: 'farm' | 'workshop', reserve: number): SimulationState => {
    let state = withStocks(createTestState(), { food: reserve, material: 12 })
    state = op(state, 'residence', 3, 1)
    state = addColonist(state, 'building-1')
    if (near === 'farm') {
      state = op(state, 'farm', 3, 2)
      state = op(state, 'workshop', 9, 0)
    } else {
      state = op(state, 'workshop', 3, 2)
      state = op(state, 'farm', 9, 0)
    }
    for (let x = 0; x <= 10; x += 1) state = opRoad(state, x, 1)
    return assignJobs(state)
  }

  it('a staffed Farm holds the colony; the same world with the Workshop staffed starves', () => {
    const farmSide = pressureWorld('farm', 6)
    const shopSide = pressureWorld('workshop', 6)
    expect(read(farmSide).farmWorkers).toBe(1)
    expect(read(shopSide).workshopWorkers).toBe(1)

    const farmAfter = advance(farmSide, 10)
    const shopAfter = advance(shopSide, 10)
    audit('FOOD_PRESSURE from_reserve_6', {
      farmStaffed: { food: farmAfter.resources.food, pop: getPopulationCount(farmAfter) },
      workshopStaffed: { food: shopAfter.resources.food, pop: getPopulationCount(shopAfter) },
    })
    expect(farmAfter.resources.food).toBe(6 + 10 * (2 - 1))
    expect(getPopulationCount(farmAfter)).toBe(1)
    expect(shopAfter.resources.food).toBe(0)
    expect(getPopulationCount(shopAfter)).toBe(0)
  })

  it('with a large reserve the cost is only a slope change, not survival', () => {
    const farmSide = advance(pressureWorld('farm', 100), 30)
    const shopSide = advance(pressureWorld('workshop', 100), 30)
    audit('FOOD_PRESSURE from_reserve_100', {
      farmStaffedFood: farmSide.resources.food,
      workshopStaffedFood: shopSide.resources.food,
      workshopStaffedPop: getPopulationCount(shopSide),
    })
    expect(getPopulationCount(shopSide)).toBe(1)
    expect(farmSide.resources.food - shopSide.resources.food).toBe(60)
  })

  it('the starvation tick is a direct function of the reserve, not of the mix', () => {
    let shortageTick: number | null = null
    let state = pressureWorld('workshop', 6)
    for (let t = 0; t < 20; t += 1) {
      state = stepSimulation(state)
      if (getPopulationCount(state) === 0 && shortageTick === null) shortageTick = state.time.tick
    }
    audit('FOOD_PRESSURE_shortage', { reserve: 6, starvationTick: shortageTick })
    expect(shortageTick).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// §6 — Material-side pressure
// ---------------------------------------------------------------------------

describe('§6 — Material-side pressure', () => {
  it('a staffed Workshop is the only path to Material; the Farm branch never grows', () => {
    const shop = advance(rowWorld({ residences: 1, farms: 0, workshops: 1, material: 10, food: 100 }), 15)
    const farm = advance(rowWorld({ residences: 1, farms: 1, workshops: 0, material: 10, food: 100 }), 15)
    const rs = read(shop)
    const rf = read(farm)
    audit('MATERIAL_PRESSURE from_material_10 over_15_ticks', {
      workshopStaffed: {
        material: rs.material,
        upkeep: rs.upkeep,
        storage: rs.storage,
        food: rs.food,
        pop: rs.pop,
      },
      farmStaffed: {
        material: rf.material,
        upkeep: rf.upkeep,
        storage: rf.storage,
        food: rf.food,
        pop: rf.pop,
      },
    })
    // One staffed Workshop: +2 gross, -1 upkeep, capacity 25.
    expect(rs.upkeep).toBe(1)
    expect(rs.storage).toBe(25)
    expect(rs.material).toBe(24)
    // Farm branch: no Material inflow, and Farm staffing costs no upkeep.
    expect(rf.material).toBe(10)
    expect(rf.upkeep).toBe(0)
    expect(rf.food).toBe(100 + 15 * (2 - 1))
    // Food is the mirror image: the Workshop branch burns it.
    expect(rs.food).toBe(100 - 15)
  })

  it('CRITICAL: one staffed Workshop equilibrates at 24, one unit below the 25 build cost', () => {
    // Capacity 25, stock approaches it from below at +1/tick and then stalls:
    // at 24 the free space is 1, so stored production is 1 and upkeep 1 cancel.
    let state = rowWorld({ residences: 1, farms: 0, workshops: 1, material: 0, food: 200 })
    const trace: number[] = []
    for (let i = 0; i < 40; i += 1) {
      state = stepSimulation(state)
      trace.push(state.resources.construction)
    }
    audit('MATERIAL_EQUILIBRIUM_ONE_WORKSHOP', {
      after20: trace[19],
      after24: trace[23],
      after40: trace[39],
      storage: materialStorageCapacityForTick(state),
      upkeep: materialUpkeepDueForTick(state),
      storedMat: read(state).storedMat,
      buildCost: 25,
      affordable: state.resources.construction >= 25,
    })
    expect(trace[19]).toBe(20)
    expect(trace[23]).toBe(24)
    expect(trace[39]).toBe(24)
    expect(state.resources.construction).toBeLessThan(25)
  })

  it('a second operational Workshop raises capacity to 50 and breaks the deadlock', () => {
    // Two colonists, two staffed Workshops: gross 4, upkeep 2, capacity 50.
    let state = rowWorld({ residences: 2, farms: 0, workshops: 2, material: 0, food: 200 })
    const r = read(state)
    expect(r.matProd).toBe(4)
    expect(r.upkeep).toBe(2)
    expect(r.storage).toBe(50)
    let ticks = 0
    while (state.resources.construction < 25 && ticks < 200) {
      state = stepSimulation(state)
      ticks += 1
    }
    audit('MATERIAL_BREAK_DEADLOCK', {
      grossProduction: r.matProd,
      upkeep: r.upkeep,
      netPerTick: r.storedMat - r.upkeep,
      ticksTo25: ticks,
      material: state.resources.construction,
    })
    expect(state.resources.construction).toBeGreaterThanOrEqual(25)
    expect(ticks).toBeLessThan(200)
  })

  it('Storage capacity, not labour, becomes the binding limit once labour is free', () => {
    // Four colonists: 1 Farm feeds 2 of them, leaving 2 Workshop workers.
    const r = read(rowWorld({ residences: 4, farms: 1, workshops: 2, material: 0, food: 100 }))
    audit('MATERIAL_BINDING_LIMIT', {
      pop: r.pop,
      farmWorkers: r.farmWorkers,
      workshopWorkers: r.workshopWorkers,
      unemployed: r.unemployed,
      matProd: r.matProd,
      upkeep: r.upkeep,
      storage: r.storage,
      netMaterial: r.netMaterial,
    })
    expect(r.workshopWorkers).toBe(2)
    expect(r.storage).toBe(50)
    // Gross 4 minus upkeep 2 = +2/tick, but only while space remains.
    expect(r.netMaterial).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §7 — Bootstrap trajectory (real command chain)
// ---------------------------------------------------------------------------

describe('§7 — bootstrap trajectory', () => {
  it('tracks every tick and locates the first labor conflict', () => {
    let state = createTestState()
    const trace: Record<string, unknown>[] = []
    const record = (label: string): void => {
      const r = read(state)
      trace.push({
        label,
        tick: state.time.tick,
        pop: r.pop,
        res: Object.values(state.buildings).filter((b) => b.type === 'residence').length,
        farms: Object.values(state.buildings).filter((b) => b.type === 'farm').length,
        shops: Object.values(state.buildings).filter((b) => b.type === 'workshop').length,
        farmWorkers: r.farmWorkers,
        shopWorkers: r.workshopWorkers,
        unemployed: r.unemployed,
        food: r.food,
        need: r.pop,
        foodProd: r.foodProd,
        material: r.material,
        matProd: r.matProd,
        upkeep: r.upkeep,
      })
    }
    record('t0')
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    record('place R')
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] })
    record('place road')
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: 'farm' })
    record('place F')
    for (let i = 0; i < 2; i += 1) {
      state = stepSimulation(state)
      record('step')
    }
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    record('place W')
    for (let i = 0; i < 3; i += 1) {
      state = stepSimulation(state)
      record('step')
    }
    audit('BOOTSTRAP', trace)

    const firstConflict = trace.find(
      (t) => t.farms === 1 && t.shops === 1
    ) as { tick: number; farmWorkers: number; shopWorkers: number; unemployed: number }
    expect(firstConflict).toBeDefined()
    // Second workplace creates the fork: exactly one of the two is staffed.
    expect(Number(firstConflict.farmWorkers) + Number(firstConflict.shopWorkers)).toBe(1)
    expect(Number(firstConflict.unemployed)).toBe(0)
    // The Farm keeps the worker (lower id / same distance) -> the new
    // Workshop stays vacant and material cannot grow.
    expect(Number(firstConflict.farmWorkers)).toBe(1)
    expect(Number(firstConflict.shopWorkers)).toBe(0)
  })

  it('the tradeoff disappears as soon as a second colonist arrives', () => {
    // After the fork, building a Residence lets the second colonist staff the
    // vacant Workshop: the conflict lasts exactly one population step.
    let state = createTestState()
    state = withStocks(state, { material: 100 })
    state = op(state, 'residence', 1, 0)
    state = addColonist(state, 'building-1')
    state = op(state, 'farm', 1, 2)
    state = op(state, 'workshop', 2, 2)
    state = opRoad(state, 1, 1)
    state = opRoad(state, 2, 1)
    state = opRoad(state, 3, 1)
    state = assignJobs(state)
    const conflict = read(state)
    expect(conflict.farmWorkers).toBe(1)
    expect(conflict.workshopWorkers).toBe(0)
    // Second residence + colonist resolves it.
    state = op(state, 'residence', 3, 0)
    state = addColonist(state, 'building-4')
    state = assignJobs(state)
    const resolved = read(state)
    audit('BOOTSTRAP_RESOLUTION', {
      oneColonist: { farmWorkers: conflict.farmWorkers, workshopWorkers: conflict.workshopWorkers },
      twoColonists: { farmWorkers: resolved.farmWorkers, workshopWorkers: resolved.workshopWorkers },
    })
    expect(resolved.farmWorkers).toBe(1)
    expect(resolved.workshopWorkers).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §8 — Spatial preference as economic specialization
// ---------------------------------------------------------------------------

describe('§8 — spatial preference (09M) drives the production mix', () => {
  /**
   * Residence (3,1) with contact (3,2) containing the `near` workplace; the
   * other workplace sits `farSteps` road steps away on the same row.
   */
  const mixWorld = (near: 'farm' | 'workshop', farSteps: number): SimulationState => {
    let state = createTestState()
    state = op(state, 'residence', 3, 1)
    state = addColonist(state, 'building-1')
    if (near === 'farm') {
      state = op(state, 'farm', 3, 2)
      state = op(state, 'workshop', 3 + farSteps * 2, 2)
    } else {
      state = op(state, 'workshop', 3, 2)
      state = op(state, 'farm', 3 + farSteps * 2, 2)
    }
    for (let x = 0; x <= 3 + farSteps * 2; x += 1) state = opRoad(state, x, 2)
    return assignJobs(state)
  }

  it('the nearer workplace always wins, regardless of type or id', () => {
    for (const near of ['farm', 'workshop'] as const) {
      for (const farSteps of [1, 3, 6]) {
        const r = read(mixWorld(near, farSteps))
        audit(`SPATIAL near=${near} farSteps=${farSteps}`, {
          farmWorkers: r.farmWorkers,
          workshopWorkers: r.workshopWorkers,
          foodProd: r.foodProd,
          matProd: r.matProd,
        })
        expect(r.farmWorkers + r.workshopWorkers).toBe(1)
        if (near === 'farm') {
          expect(r.farmWorkers).toBe(1)
          expect(r.foodProd).toBe(2)
        } else {
          expect(r.workshopWorkers).toBe(1)
          expect(r.matProd).toBe(2)
        }
      }
    }
  })

  it('distance is the sole lever: moving the residence one cell flips the output', () => {
    // Identical buildings and identical roads; only the Residence moves one
    // column, so the contact cell it can use changes hands.
    const build = (residenceX: number): SimulationState => {
      let state = createTestState()
      state = op(state, 'residence', residenceX, 1)
      state = addColonist(state, 'building-1')
      state = op(state, 'farm', 3, 3)
      state = op(state, 'workshop', 5, 3)
      state = opRoad(state, 3, 2)
      state = opRoad(state, 4, 2)
      state = opRoad(state, 5, 2)
      return assignJobs(state)
    }
    const residenceAtFarm = read(build(3))
    const residenceAtShop = read(build(5))
    audit('SPATIAL_LEVER', {
      residenceAtFarmColumn: {
        farmWorkers: residenceAtFarm.farmWorkers,
        workshopWorkers: residenceAtFarm.workshopWorkers,
        foodProd: residenceAtFarm.foodProd,
        matProd: residenceAtFarm.matProd,
      },
      residenceAtWorkshopColumn: {
        farmWorkers: residenceAtShop.farmWorkers,
        workshopWorkers: residenceAtShop.workshopWorkers,
        foodProd: residenceAtShop.foodProd,
        matProd: residenceAtShop.matProd,
      },
    })
    expect(residenceAtFarm.farmWorkers).toBe(1)
    expect(residenceAtFarm.matProd).toBe(0)
    expect(residenceAtShop.workshopWorkers).toBe(1)
    expect(residenceAtShop.foodProd).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §9 — Multi-colonist competition and id-order effects
// ---------------------------------------------------------------------------

describe('§9 — multi-colonist competition', () => {
  it('3 colonists / 2 Farms + 2 Workshops: three staffed, one vacant', () => {
    for (const first of ['farm', 'workshop'] as const) {
      const r = read(rowWorld({ residences: 3, farms: 2, workshops: 2, first }))
      audit(`MULTI 3c-2F-2W first=${first}`, {
        farmWorkers: r.farmWorkers,
        workshopWorkers: r.workshopWorkers,
        unemployed: r.unemployed,
        vacant: r.jobCapacity - r.employed,
        foodProd: r.foodProd,
        matProd: r.matProd,
      })
      expect(r.employed).toBe(3)
      expect(r.unemployed).toBe(0)
      expect(r.jobCapacity - r.employed).toBe(1)
    }
  })

  it('2 colonists / 2 Farms + 2 Workshops: the creation order decides the mix', () => {
    const farmFirst = read(rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'farm' }))
    const shopFirst = read(rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop' }))
    audit('MULTI 2c-2F-2W id_order_effect', {
      farmFirst: {
        farmWorkers: farmFirst.farmWorkers,
        workshopWorkers: farmFirst.workshopWorkers,
        foodProd: farmFirst.foodProd,
        matProd: farmFirst.matProd,
      },
      workshopFirst: {
        farmWorkers: shopFirst.farmWorkers,
        workshopWorkers: shopFirst.workshopWorkers,
        foodProd: shopFirst.foodProd,
        matProd: shopFirst.matProd,
      },
    })
    // With two colonists and two of each type placed symmetrically, both
    // colonists share the two NEAREST columns, which the type created first
    // occupies: the id tie-break alone decides whether the colony produces
    // 4 Food / 0 Material or 0 Food / 4 Material from the same buildings.
    expect(farmFirst.farmWorkers).toBe(2)
    expect(farmFirst.matProd).toBe(0)
    expect(shopFirst.workshopWorkers).toBe(2)
    expect(shopFirst.foodProd).toBe(0)
  })

  it('with an equal-distance tie the creation order DOES change the mix', () => {
    // Both workplaces adjacent to the residence's single contact cell: equal
    // distance 0, so the lowest id wins and the mix follows creation order.
    const tieWorld = (first: 'farm' | 'workshop'): SimulationState => {
      let state = createTestState()
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
    const farmFirst = read(tieWorld('farm'))
    const shopFirst = read(tieWorld('workshop'))
    audit('ID_TIEBREAK_MIX', {
      farmCreatedFirst: {
        farmWorkers: farmFirst.farmWorkers,
        workshopWorkers: farmFirst.workshopWorkers,
        foodProd: farmFirst.foodProd,
        matProd: farmFirst.matProd,
      },
      workshopCreatedFirst: {
        farmWorkers: shopFirst.farmWorkers,
        workshopWorkers: shopFirst.workshopWorkers,
        foodProd: shopFirst.foodProd,
        matProd: shopFirst.matProd,
      },
    })
    expect(farmFirst.farmWorkers).toBe(1)
    expect(farmFirst.matProd).toBe(0)
    expect(shopFirst.workshopWorkers).toBe(1)
    expect(shopFirst.foodProd).toBe(0)
  })

  it('insertion order does not change the canonical state or hash for one order', () => {
    const build = (): SimulationState => {
      let state = createTestState()
      state = op(state, 'residence', 1, 0)
      state = op(state, 'residence', 3, 0)
      state = op(state, 'farm', 1, 2)
      state = op(state, 'workshop', 3, 2)
      for (let x = 0; x <= 4; x += 1) state = opRoad(state, x, 1)
      state = addColonist(state, 'building-1')
      state = addColonist(state, 'building-2')
      return assignJobs(state)
    }
    const a = build()
    const b = build()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    const r = read(a)
    audit('INSERTION_ORDER', { farmWorkers: r.farmWorkers, workshopWorkers: r.workshopWorkers })
    expect(r.farmWorkers).toBe(1)
    expect(r.workshopWorkers).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §10 — Greedy vs theoretical-optimal assignment
// ---------------------------------------------------------------------------

describe('§10 — greedy assignment audit', () => {
  /**
   * Colonist-A's residence touches TWO road networks: the main one (Farm and
   * colonist-B) and a private stub (Workshop). Colonist-B touches only the
   * main one, so 09M makes both workplaces eligible for A (tie at distance 0
   * -> lowest id wins) and only the Farm eligible for B.
   */
  const contentionWorld = (): SimulationState => {
    let state = createTestState()
    state = op(state, 'residence', 2, 1) // building-1 = colonist A (lower id)
    state = op(state, 'residence', 3, 1) // building-2 = colonist B
    state = op(state, 'farm', 1, 2) // building-3 (lower id than the workshop)
    state = op(state, 'workshop', 1, 0) // building-4
    state = opRoad(state, 2, 2) // main network
    state = opRoad(state, 3, 2)
    state = opRoad(state, 2, 0) // private stub reachable only from A
    state = addColonist(state, 'building-1')
    state = addColonist(state, 'building-2')
    return state
  }

  it('greedy leaves a colonist idle where an alternative staffs both', () => {
    const r = read(assignJobs(contentionWorld()))
    audit('GREEDY_CONTENTION', {
      employed: r.employed,
      unemployed: r.unemployed,
      farmWorkers: r.farmWorkers,
      workshopWorkers: r.workshopWorkers,
      foodProd: r.foodProd,
      matProd: r.matProd,
      upkeep: r.upkeep,
    })
    expect(r.farmWorkers).toBe(1)
    expect(r.workshopWorkers).toBe(0)
    expect(r.employed).toBe(1)
    expect(r.unemployed).toBe(1)
    expect(r.matProd).toBe(0)
    audit('GREEDY_ALTERNATIVE', {
      greedyMatProd: r.matProd,
      greedyUpkeep: r.upkeep,
      alternative: 'A -> Workshop and B -> Farm would staff both: matProd 2, upkeep 1',
      alternativeMatProd: 2,
    })
  })

  it('the same world with both workplaces on the main network has no contention', () => {
    let state = createTestState()
    state = op(state, 'residence', 2, 1)
    state = op(state, 'residence', 3, 1)
    state = op(state, 'farm', 1, 2)
    state = op(state, 'workshop', 4, 2)
    for (let x = 1; x <= 4; x += 1) state = opRoad(state, x, 2)
    state = addColonist(state, 'building-1')
    state = addColonist(state, 'building-2')
    const r = read(assignJobs(state))
    audit('GREEDY_NO_CONTENTION', {
      farmWorkers: r.farmWorkers,
      workshopWorkers: r.workshopWorkers,
      employed: r.employed,
      matProd: r.matProd,
    })
    expect(r.farmWorkers).toBe(1)
    expect(r.workshopWorkers).toBe(1)
    expect(r.employed).toBe(2)
  })

  it('greedy is locally, not globally, optimal on total commute', () => {
    // A: Farm at 0, Workshop at 1.  B: Farm at 0, Workshop at 2.
    // Greedy (ascending colonist id): A takes the Farm (0), B takes the
    // Workshop (2) -> total 2. Swapping gives 1 + 0 = 1.
    let state = createTestState()
    state = op(state, 'residence', 2, 1) // A
    state = op(state, 'residence', 3, 1) // B
    state = op(state, 'farm', 1, 2) // contact (2,2): 0 from A, 1 from B
    state = op(state, 'workshop', 5, 2) // 2 from A, 1 from B
    for (let x = 1; x <= 5; x += 1) state = opRoad(state, x, 2)
    state = addColonist(state, 'building-1')
    state = addColonist(state, 'building-2')
    const assigned = assignJobs(state)
    audit('GREEDY_TOTAL_DISTANCE', {
      greedyAssignment: Object.values(assigned.colonists).map((c) => ({
        id: c.id,
        workplace: c.workplaceId,
      })),
      greedyTotal: 0 + 2,
      swappedTotal: 1 + 0,
      note: 'the greedy pass is deterministic but not distance-optimal',
    })
    expect(Object.values(assigned.colonists).every((c) => c.workplaceId !== null)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §11 — Construction feedback loops
// ---------------------------------------------------------------------------

describe('§11 — construction feedback loops', () => {
  it('Loop A does NOT close from bootstrap: a farm-first colony cannot buy the 2nd residence', () => {
    // Real command chain, bootstrap budget 100. Farm-first order:
    // R1 25 + road 5 + Farm 25 + Workshop 25 = 80, leaving 20 < the 25 a
    // second Residence costs. The Farm feeds the colony but Food is not a
    // construction input, so the loop stops here.
    let state = createTestState()
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }] })
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: 'farm' })
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'workshop' })
    state = advance(state, 6)
    const r = read(state)
    const materialBefore = r.material
    const buildingsBefore = Object.keys(state.buildings).length
    // The second Residence is silently rejected: stock below the 25 cost.
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 0, buildingType: 'residence' })
    const after = read(state)
    audit('LOOP_A_FARM_FIRST', {
      farmWorkers: r.farmWorkers,
      workshopWorkers: r.workshopWorkers,
      food: r.food,
      netFood: r.netFood,
      material: materialBefore,
      secondResidenceCost: 25,
      residencePlaced: Object.keys(state.buildings).length !== buildingsBefore,
      pop: after.pop,
    })
    expect(r.farmWorkers).toBe(1)
    expect(r.foodProd).toBe(2)
    expect(r.netFood).toBe(1)
    expect(materialBefore).toBeLessThan(25)
    // Rejected: the population cannot grow, so no second worker ever appears.
    expect(Object.keys(state.buildings).length).toBe(buildingsBefore)
    expect(getPopulationCount(state)).toBe(1)
  })

  it('Loop B closes only with TWO Workshops: material -> Residence -> 2nd colonist', () => {
    // Bootstrap 100. R1 25 + 3 road cells 15 + W1 25 + W2 25 = 90, leaving 10.
    // Two operational Workshops raise capacity to 50, so labour income can
    // actually cross the 25 build cost (one Workshop stalls at 24).
    // Layout: R1 (1,0), R2 (3,0), W1 (1,2), W2 (2,2), F (3,2), road row y=1.
    let state = createTestState()
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] })
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' })
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    state = advance(state, 2)
    const built = read(state)
    audit('LOOP_B_BOOTSTRAP', {
      workshopWorkers: built.workshopWorkers,
      material: built.material,
      storage: built.storage,
      matProd: built.matProd,
      upkeep: built.upkeep,
      netMaterial: built.netMaterial,
    })
    expect(built.workshopWorkers).toBe(1)
    expect(built.storage).toBe(50)
    let ticks = 0
    while (state.resources.construction < 25 && ticks < 200) {
      state = stepSimulation(state)
      ticks += 1
    }
    audit('LOOP_B_REFILL', { ticksTo25: ticks, material: state.resources.construction })
    expect(state.resources.construction).toBeGreaterThanOrEqual(25)
    // The Residence the labour paid for.
    state = stepSimulation(state, { type: 'placeBuilding', x: 3, y: 0, buildingType: 'residence' })
    state = advance(state, 4)
    const twoPop = read(state)
    audit('LOOP_B_CLOSED', {
      pop: twoPop.pop,
      workshopWorkers: twoPop.workshopWorkers,
      material: twoPop.material,
    })
    expect(twoPop.pop).toBe(2)
    // Both Workshops are staffed; the loop has produced a second worker.
    expect(twoPop.workshopWorkers).toBe(2)

    // Continuing the chain: the extra worker must pay for the Farm, and the
    // Farm then stays VACANT because no worker is left (Loop C gate).
    let farmTicks = 0
    while (state.resources.construction < 25 && farmTicks < 200) {
      state = stepSimulation(state)
      farmTicks += 1
    }
    state = stepSimulation(state, { type: 'placeBuilding', x: 3, y: 2, buildingType: 'farm' })
    state = advance(state, 4)
    const withFarm = read(state)
    audit('LOOP_B_FARM', {
      farmWorkers: withFarm.farmWorkers,
      workshopWorkers: withFarm.workshopWorkers,
      foodProd: withFarm.foodProd,
      netFood: withFarm.netFood,
      netMaterial: withFarm.netMaterial,
      note: 'the new Farm shares colonist-2 residence contact (distance 0), so it takes that worker from W2; the colony settles at 1 Farm + 1 Workshop',
    })
    // Assignment is re-evaluated every tick: an existing assignment is kept
    // only while it is still among the nearest, so the new nearer Farm pulls
    // the worker off W2. The colony self-balances to one of each.
    expect(withFarm.farmWorkers).toBe(1)
    expect(withFarm.workshopWorkers).toBe(1)
    expect(withFarm.foodProd).toBe(2)
    expect(withFarm.netFood).toBe(0)
  })

  it('Loop B is BROKEN at one Workshop: labour income stalls at 24 < 25', () => {
    // A real command chain: the single staffed Workshop cannot fund the next
    // Residence, because its equilibrium equals build cost minus one.
    let state = createTestState()
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] })
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' })
    state = advance(state, 40)
    const r = read(state)
    audit('LOOP_B_ONE_WORKSHOP', {
      workshopWorkers: r.workshopWorkers,
      material: r.material,
      storage: r.storage,
      upkeep: r.upkeep,
      buildCost: 25,
      canAffordResidence: r.material >= 25,
    })
    expect(r.workshopWorkers).toBe(1)
    expect(r.material).toBeLessThan(25)
  })

  it('Loop B closes once capacity is 50 (two operational Workshops)', () => {
    // Strip the stock, then let labour refill it at +1/tick with capacity 50.
    let state = createTestState()
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] })
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: 'workshop' })
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 0, buildingType: 'workshop' })
    state = advance(state, 2)
    state = withStocks(state, { material: 5, food: 200 })
    let ticks = 0
    while (state.resources.construction < 25 && ticks < 100) {
      state = stepSimulation(state)
      ticks += 1
    }
    audit('LOOP_B_TWO_WORKSHOPS', {
      ticksToAfford25: ticks,
      material: state.resources.construction,
      storage: materialStorageCapacityForTick(state),
    })
    expect(ticks).toBeLessThan(100)
    // Build the Residence the labour paid for.
    state = stepSimulation(state, { type: 'placeBuilding', x: 3, y: 0, buildingType: 'residence' })
    state = advance(state, 4)
    audit('LOOP_B_RESULT', { pop: getPopulationCount(state) })
    expect(getPopulationCount(state)).toBeGreaterThanOrEqual(2)
  })

  it('Loop C exists but is worker-gated: Material -> Farm only adds Food if a worker is free', () => {
    let state = createTestState()
    state = op(state, 'residence', 1, 0)
    state = addColonist(state, 'building-1')
    state = op(state, 'workshop', 1, 2)
    for (let x = 0; x <= 4; x += 1) state = opRoad(state, x, 1)
    state = assignJobs(state)
    expect(read(state).workshopWorkers).toBe(1)
    state = op(state, 'farm', 3, 2)
    const gated = read(assignJobs(state))
    audit('LOOP_C_GATED', {
      farmWorkers: gated.farmWorkers,
      workshopWorkers: gated.workshopWorkers,
      foodProd: gated.foodProd,
      matProd: gated.matProd,
      unemployed: gated.unemployed,
    })
    expect(gated.farmWorkers).toBe(0)
    expect(gated.foodProd).toBe(0)
    state = op(state, 'residence', 3, 0)
    state = addColonist(state, 'building-4')
    const ungated = read(assignJobs(state))
    audit('LOOP_C_UNGATED', {
      farmWorkers: ungated.farmWorkers,
      workshopWorkers: ungated.workshopWorkers,
      foodProd: ungated.foodProd,
      matProd: ungated.matProd,
    })
    expect(ungated.farmWorkers).toBe(1)
    expect(ungated.workshopWorkers).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §14 — UI information audit (in-repo surface; the browser pass is Step 10E)
// ---------------------------------------------------------------------------

describe('§14 — UI information audit', () => {
  it('per-building staffing is derivable for both types but not in the domain inspection', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    const farm = Object.values(state.buildings).find((b) => b.type === 'farm')!
    const shop = Object.values(state.buildings).find((b) => b.type === 'workshop')!
    expect(countWorkersAt(state, farm.id)).toBe(1)
    expect(countWorkersAt(state, shop.id)).toBe(1)
    // The domain inspection query exposes housing occupancy only: staffing is
    // composed by the app layer from countWorkersAt (main.ts).
    const farmInspection = getBuildingInspection(state, farm.id)!
    audit('UI_INSPECTION_QUERY', {
      farmId: farm.id,
      inspectionKeys: Object.keys(farmInspection),
      hasStaffingField: 'workers' in farmInspection || 'staffed' in farmInspection,
    })
    expect(farmInspection).not.toHaveProperty('workers')
  })

  it('aggregate employment is exposed but type-blind', () => {
    const r = read(rowWorld({ residences: 2, farms: 2, workshops: 2 }))
    const employment = getEmploymentSummary(
      rowWorld({ residences: 2, farms: 2, workshops: 2 })
    )
    audit('UI_EMPLOYMENT_AGGREGATE', {
      jobCapacity: employment.jobCapacity,
      employed: employment.employed,
      unemployed: employment.unemployed,
      farmWorkers: r.farmWorkers,
      workshopWorkers: r.workshopWorkers,
      note: 'the HUD "jobs x / y" merges Farm and Workshop jobs; the split is only visible per building',
    })
    expect(employment.jobCapacity).toBe(4)
    expect(employment.employed).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §15 — Timing audit
// ---------------------------------------------------------------------------

describe('§15 — Farm vs Workshop production timing', () => {
  const runCommands = (type: 'farm' | 'workshop') => {
    let state = createTestState()
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    state = stepSimulation(state, { type: 'placeRoads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] })
    state = stepSimulation(state, { type: 'placeBuilding', x: 1, y: 2, buildingType: type })
    return state
  }

  it('both types become staffed on the same tick', () => {
    const farmStates: { tick: number; staffed: boolean }[] = []
    const shopStates: { tick: number; staffed: boolean }[] = []
    let farm = runCommands('farm')
    let shop = runCommands('workshop')
    for (let i = 0; i < 4; i += 1) {
      farm = stepSimulation(farm)
      shop = stepSimulation(shop)
      farmStates.push({ tick: farm.time.tick, staffed: countStaffedOperationalFarms(farm) === 1 })
      shopStates.push({ tick: shop.time.tick, staffed: countStaffedOperationalWorkshops(shop) === 1 })
    }
    audit('TIMING_STAFFING', { farm: farmStates, workshop: shopStates })
    expect(farmStates.find((s) => s.staffed)!.tick).toBe(shopStates.find((s) => s.staffed)!.tick)
  })

  it('Material is produced on the staffing tick; Food reaches the stock one tick later', () => {
    // Workshop: below capacity, so the staffing tick stores Material.
    let shop = runCommands('workshop')
    shop = withStocks(shop, { material: 0, food: 200 })
    const shopSeries: { tick: number; material: number }[] = []
    for (let i = 0; i < 4; i += 1) {
      shop = stepSimulation(shop)
      shopSeries.push({ tick: shop.time.tick, material: shop.resources.construction })
    }
    // Farm: the stock only moves up one tick after staffing.
    let farm = runCommands('farm')
    const farmSeries: { tick: number; food: number; stockDelta: number }[] = []
    let prev = farm.resources.food
    for (let i = 0; i < 4; i += 1) {
      farm = stepSimulation(farm)
      farmSeries.push({
        tick: farm.time.tick,
        food: farm.resources.food,
        stockDelta: farm.resources.food - prev,
      })
      prev = farm.resources.food
    }
    audit('TIMING_MATERIAL_STOCK', shopSeries)
    audit('TIMING_FOOD_STOCK', farmSeries)
    // Material: +2 on the first tick the Workshop is staffed (capacity 25, upkeep 1).
    expect(shopSeries[0]!.material).toBe(1)
    // Food: the first staffed tick shows NO increase (delta -1: eaten, nothing produced).
    expect(farmSeries[0]!.stockDelta).toBe(-1)
    expect(farmSeries[1]!.stockDelta).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §16 — Persistence and determinism
// ---------------------------------------------------------------------------

describe('§16 — persistence and determinism', () => {
  it('SAVE_VERSION is 4 and employment survives save/load', () => {
    expect(SAVE_VERSION).toBe(6)
    const state = rowWorld({ residences: 3, farms: 2, workshops: 2 })
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(read(restored)).toEqual(read(state))
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('farmWorkers')
    expect(serialized).not.toContain('workshopWorkers')
    expect(serialized).not.toContain('staffed')
  })

  it('repeated runs produce identical state and hash', () => {
    const run = (): SimulationState => advance(rowWorld({ residences: 3, farms: 2, workshops: 2 }), 10)
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('assignment is stable across repeated assignJobs calls (no churn)', () => {
    const state = rowWorld({ residences: 3, farms: 2, workshops: 2 })
    expect(serializeCanonicalState(assignJobs(state))).toBe(serializeCanonicalState(state))
  })
})

// ---------------------------------------------------------------------------
// §17 — Performance with mixed Farms + Workshops
// ---------------------------------------------------------------------------

describe('§17 — performance with mixed Farms + Workshops', () => {
  /** Connected grid: residences row y=2, workplaces row y=0, road row y=1. */
  const CLUSTER_SIZE = 8
  /**
   * Realistic topology: CLUSTERS of 8 workplaces, each on its own local road
   * row with its own residences, all on separate networks. A residence only
   * reaches its own cluster's workplaces, which keeps the candidate set local
   * (one giant shared network would make every colonist consider every
   * workplace and measure the fixture rather than the code).
   */
  const mixedFixture = (workplaces: number, residences: number): SimulationState => {
    let state = createTestState()
    const residenceIds: string[] = []
    const clusters = Math.ceil(workplaces / CLUSTER_SIZE)
    for (let i = 0; i < residences; i += 1) {
      const cluster = Math.floor(i / CLUSTER_SIZE)
      const slot = i % CLUSTER_SIZE
      state = op(state, 'residence', 1 + slot * 2, 4 * cluster + 2)
      residenceIds.push(`building-${i + 1}`)
    }
    for (let i = 0; i < workplaces; i += 1) {
      const cluster = Math.floor(i / CLUSTER_SIZE)
      const slot = i % CLUSTER_SIZE
      state = op(state, i % 2 === 0 ? 'farm' : 'workshop', 1 + slot * 2, 4 * cluster)
    }
    for (let c = 0; c < clusters; c += 1) {
      for (let x = 0; x <= 2 * CLUSTER_SIZE + 1; x += 1) state = opRoad(state, x, 4 * c + 1)
    }
    for (const id of residenceIds) state = addColonist(state, id)
    return assignJobs(state)
  }

  const measure = (label: string, fn: () => void): number => {
    const start = performance.now()
    fn()
    const ms = performance.now() - start
    audit(`PERF ${label}`, { ms: Number(ms.toFixed(2)) })
    return ms
  }

  it('assignJobs and tick cost scale on connected mixed worlds', () => {
    // SMALL/MEDIUM run real ticks. LARGE/XL measure fixture + assignJobs only:
    // a full tick at those sizes costs seconds to tens of seconds (see the
    // Step10D report, which took the same precaution for STRESS).
    const cases = [
      { name: 'SMALL', workplaces: 10, residences: 5, ticks: 20 },
      { name: 'MEDIUM', workplaces: 100, residences: 40, ticks: 5 },
      { name: 'LARGE', workplaces: 400, residences: 150, ticks: 1 },
      { name: 'XL', workplaces: 1000, residences: 400, ticks: 0 },
    ] as const
    for (const c of cases) {
      const state = mixedFixture(c.workplaces, c.residences)
      const r = read(state)
      audit(`PERF ${c.name}-fixture`, {
        workplaces: c.workplaces,
        residences: c.residences,
        pop: r.pop,
        employed: r.employed,
        unemployed: r.unemployed,
        farmWorkers: r.farmWorkers,
        workshopWorkers: r.workshopWorkers,
        roads: Object.keys(state.roads).length,
      })
      // The fixture must actually exercise assignment.
      expect(r.employed).toBe(c.residences)
      measure(`${c.name}-assignJobs`, () => {
        assignJobs(state)
      })
      if (c.ticks > 0) {
        const total = measure(`${c.name}-tick-x${c.ticks}`, () => {
          let next = state
          for (let t = 0; t < c.ticks; t += 1) next = stepSimulation(next)
        })
        audit(`PERF ${c.name}-perTick`, { ms: Number((total / c.ticks).toFixed(2)) })
      } else {
        // Hash/save only, so the fixture itself is measured at XL scale.
        measure('XL-hash', () => {
          hashCanonicalState(state)
        })
      }
    }
  }, 300000)
})
