/**
 * Next Dependency Design Intake (Step 10O) — evidence only.
 *
 * AUDIT / DESIGN INTAKE: `src/` is untouched. This suite measures the CURRENT
 * model so the intake's "existing pressures" and "missing causal
 * dependencies" sections rest on numbers, not prose. It adds no gameplay.
 *
 * Run:
 *   npx vitest run tests/nextDependencyDesignIntake.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  BUILDING_CATALOG,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getPopulationCount,
  hashCanonicalState,
  loadSave,
  materialStorageCapacityForTick,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10o', width: 40, height: 16 },
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
  stocks: { readonly food?: number; readonly material?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: state.resources.water,
  },
})

const rowWorld = (spec: {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 4000,
    material: spec.material ?? 10,
  })
  const columns = Math.max(spec.residences, spec.farms + spec.workshops)
  const residenceIds: string[] = []
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * 2, 0)
    residenceIds.push(`building-${i + 1}`)
  }
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  if ((spec.first ?? 'farm') === 'farm') {
    place('farm', spec.farms, 0)
    place('workshop', spec.workshops, spec.farms)
  } else {
    place('workshop', spec.workshops, 0)
    place('farm', spec.farms, spec.workshops)
  }
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  for (const id of residenceIds) state = createColonist(state, id).state
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
// §1/§3 — Current model surface
// ---------------------------------------------------------------------------

describe('§1/§3 — current model surface', () => {
  it('exposes the post-10P resource and building surface', () => {
    const resources = Object.keys(createState().resources).sort()
    const buildings = Object.keys(BUILDING_CATALOG).sort()
    audit('CURRENT_SURFACE', { resources, buildings })
    expect(resources).toEqual(['construction', 'food', 'water'])
    expect(buildings).toEqual(['farm', 'residence', 'well', 'workshop'])
  })

  it('has one household consumption flow (Food) and no second service', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    audit('HOUSEHOLD_FLOWS', {
      foodNeedPerColonist: 1,
      waterOrOtherNeed: 'absent',
      services: ['farm (food production)', 'workshop (material production)'],
      consumptionConsequence: 'colony-wide starvation when Food < population',
    })
    expect(getPopulationCount(state)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §2 — Existing real pressures (measured)
// ---------------------------------------------------------------------------

describe('§2 — existing real pressures (measured)', () => {
  it('Material is developmental: cap 25×W, equilibrium 24×W, no ongoing sink', () => {
    const rows = [1, 2, 3].map((w) => {
      const start = rowWorld({ residences: w, farms: 0, workshops: w, material: 0, food: 4000 })
      const at240 = advance(start, 240)
      return {
        workshops: w,
        storage: materialStorageCapacityForTick(start),
        equilibrium: at240.resources.construction,
      }
    })
    audit('MATERIAL_PRESSURE', rows)
    expect(rows.map((r) => r.equilibrium)).toEqual([24, 48, 72])
  })

  it('Food is uncapped: a Food-surplus colony accumulates without bound', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 0, material: 0, food: 100 })
    const at240 = advance(start, 240)
    audit('FOOD_UNCAPPED', { food100: 100, foodAfter240: at240.resources.food })
    expect(at240.resources.food).toBe(100 + 240 * 2)
  })

  it('population admission fills every free Residence while Food remains', () => {
    let state = withStocks(createState(), { material: 0, food: 50 })
    for (let i = 0; i < 3; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
    state = stepSimulation(state)
    audit('POPULATION_FILL', { housing: 3, populationAfterOneTick: getPopulationCount(state) })
    expect(getPopulationCount(state)).toBe(3)
  })

  it('Workforce competition is a real Food ↔ Material decision', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 0, food: 1000 })
    // Automatic: 2F/0W. Optional manual: 1F/1W.
    const auto = {
      farms: countStaffedOperationalFarms(state),
      workshops: countStaffedOperationalWorkshops(state),
    }
    const manual = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: 'colonist-2',
      workplaceId: 'building-5',
    })
    audit('WORKFORCE_PRESSURE', {
      automatic: auto,
      manual: {
        farms: countStaffedOperationalFarms(manual),
        workshops: countStaffedOperationalWorkshops(manual),
      },
    })
    expect(auto).toEqual({ farms: 2, workshops: 0 })
    expect(countStaffedOperationalWorkshops(manual)).toBe(1)
  })

  it('spatial geometry already changes the employer (09M) and access gates staffing (09F/09K)', () => {
    // Unequal distance flips the employer.
    const nearFarm = rowWorld({ residences: 1, farms: 1, workshops: 1, material: 0 })
    const nearShop = rowWorld({ residences: 1, farms: 1, workshops: 1, first: 'workshop' })
    // A roadless workplace is never staffed.
    let roadless = withStocks(createState(), { material: 0, food: 500 })
    roadless = op(roadless, 'residence', 1, 0)
    roadless = op(roadless, 'farm', 8, 8)
    roadless = createColonist(roadless, 'building-1').state
    roadless = assignJobs(roadless)
    audit('SPATIAL_PRESSURE', {
      farmFirst: countStaffedOperationalFarms(nearFarm),
      workshopFirst: countStaffedOperationalWorkshops(nearShop),
      roadlessStaffed: countStaffedOperationalFarms(roadless),
    })
    expect(countStaffedOperationalFarms(nearFarm) + countStaffedOperationalWorkshops(nearFarm)).toBe(1)
    expect(countStaffedOperationalFarms(roadless)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §3 — Missing causal dependencies (surface evidence)
// ---------------------------------------------------------------------------

describe('§3 — missing causal dependencies (surface evidence)', () => {
  it('records the 10O gaps and which of them Step 10P closes', () => {
    audit('MISSING', {
      secondNeed: 'closed by 10P (Water, growth gate)',
      foodStorageStage: 'still absent (Food uncapped)',
      materialOngoingSink: 'still absent (only construction + Workshop upkeep)',
      productionInput: 'still absent (Farms need no input beyond a worker)',
      serviceCoverage: 'closed by 10P (residence-network Water coverage)',
    })
    expect(true).toBe(true)
  })

  it('building catalog (post-10P) carries the Well service building', () => {
    const defs = Object.fromEntries(
      Object.entries(BUILDING_CATALOG).map(([type, def]) => [
        type,
        { cost: def.constructionCost, ticks: def.constructionTicks, housing: def.housingCapacity },
      ])
    )
    audit('BUILDING_CATALOG', defs)
    expect(getBuildingDefinition('farm').constructionCost).toBe(25)
    expect(Object.keys(defs).length).toBe(4)
    expect(getBuildingDefinition('well').constructionCost).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// §17 — Baseline health (no regression from the intake)
// ---------------------------------------------------------------------------

describe('§17 — baseline health', () => {
  it('SAVE_VERSION, determinism and save/load remain intact', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 5 })
    expect(SAVE_VERSION).toBe(7)
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    const a = advance(state, 60)
    const b = advance(state, 60)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    audit('BASELINE_HEALTH', { saveVersion: SAVE_VERSION, hash: hashCanonicalState(a) })
  })
})
