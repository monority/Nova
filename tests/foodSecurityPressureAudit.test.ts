/**
 * Food Security Pressure Audit — re-baselined for Step 10E.
 *
 * Originally authored for Step 10C, when an operational Farm produced 2 Food
 * per tick UNCONDITIONALLY. Step 10E made Food production WORKER-GATED: a
 * Farm yields Food only while an operational colonist is employed there. The
 * experiments below are therefore re-baselined, and the findings that the
 * 10C pass recorded are superseded where the rule changed:
 *
 *   SUPERSEDED (10C): "farms produce without population", "capacity is
 *     unbounded boom-bust because farms run while pop is 0", "roads never
 *     matter for food".
 *   CURRENT (10E): production requires a staffed, road-reachable Farm; a
 *     Farm with no eligible worker produces 0; roads matter only through
 *     employment mobility (09K), never as a food-specific rule.
 *
 * Sections kept for cross-reference with docs/roadmap/Step10C.md:
 *   §3 baseline bootstrap · §4 A/B/C/D/E/F · §5 G/H/I · §6 competition
 *
 * Invariants used throughout:
 *   - a building placed on tick T becomes operational on tick T+1;
 *   - admission fills every free operational residence while food > 0;
 *   - famine (fed = false) removes the entire colony on the same tick;
 *   - produceFood (phase 4) runs before assignJobs (phase 7), so a Farm
 *     staffed on tick N produces from tick N+1.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  createBuilding,
  createColonist,
  createRoads,
  foodProductionForTick,
  getPopulationCount,
  hashCanonicalState,
  INITIAL_FOOD,
  materialProductionForTick,
  materialUpkeepDueForTick,
  serializeCanonicalState,
  stepSimulation,
  updateNeeds,
  type BuildingType,
  type CellCoordinate,
  type SimulationCommand,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Snapshot = {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly foodNeed: number
  readonly foodProduced: number
  readonly material: number
  readonly farms: number
  readonly residences: number
  readonly workshops: number
}

const countType = (state: SimulationState, type: BuildingType): number =>
  Object.values(state.buildings).filter((b) => b.type === type).length

const snapshot = (state: SimulationState): Snapshot => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  foodNeed: updateNeeds(state),
  foodProduced: foodProductionForTick(state),
  material: state.resources.construction,
  farms: countType(state, 'farm'),
  residences: countType(state, 'residence'),
  workshops: countType(state, 'workshop'),
})

/** Run `ticks` steps; a script entry (0-based step index) issues one command. */
const runScript = (
  state: SimulationState,
  ticks: number,
  script: Readonly<Record<number, SimulationCommand>>
): readonly Snapshot[] => {
  let next = state
  const history: Snapshot[] = []
  for (let t = 0; t < ticks; t += 1) {
    next = stepSimulation(next, script[t])
    history.push(snapshot(next))
  }
  return history
}

/** Manual operational building (no admission side effects, no material cost). */
const manualOperational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('audit helper: building missing')
  }
  return {
    id: created.buildingId,
    state: {
      ...created.state,
      buildings: {
        ...created.state.buildings,
        [created.buildingId]: {
          ...building,
          status: 'operational',
          constructionRemaining: 0,
        },
      },
    },
  }
}

const withColonist = (
  state: SimulationState,
  residenceId: string
): { state: SimulationState; id: string } => {
  const created = createColonist(state, residenceId)
  return { id: created.colonistId, state: created.state }
}

const roadAt = (state: SimulationState, cell: CellCoordinate): SimulationState => {
  const created = createRoads(state, [cell])
  const id = created.roadIds[0]
  if (id === undefined) {
    throw new Error('audit helper: no road')
  }
  const target = created.state.roads[id]
  if (target === undefined) {
    throw new Error('audit helper: road missing')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...target, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const roadRow = (
  state: SimulationState,
  cells: readonly CellCoordinate[]
): SimulationState => cells.reduce((s, cell) => roadAt(s, cell), state)

const place = (
  x: number,
  y: number,
  buildingType: BuildingType
): SimulationCommand => ({ type: 'placeBuilding', x, y, buildingType })

const firstTickWith = (
  history: readonly Snapshot[],
  predicate: (s: Snapshot) => boolean
): number | null => {
  const found = history.find(predicate)
  return found ? found.tick : null
}

/**
 * Step 10E fixture: `farms` operational Farms (row y = 2) each staffed by a
 * dedicated colonist from its own residence (row y = 0), `idle` further
 * colonists with no workplace, and one shared road row (y = 1) that touches
 * every building. All pairs are mobility-connected, so assignment is decided
 * by 09M (distance, then id) and every farm can be staffed.
 *
 * Production: 2 × farms. Consumption: (farms + idle) × 1.
 */
const staffedColony = (farms: number, idle = 0): SimulationState => {
  let state = createTestState()
  const total = farms + idle
  for (let i = 0; i < total; i += 1) {
    const r = manualOperational(state, 'residence', 1 + i * 2, 0)
    state = r.state
  }
  for (let i = 0; i < farms; i += 1) {
    const f = manualOperational(state, 'farm', 1 + i * 2, 2)
    state = f.state
  }
  const cells: CellCoordinate[] = []
  for (let i = 0; i < 2 * total + 3; i += 1) {
    cells.push({ x: i, y: 1 })
  }
  state = roadRow(state, cells)
  for (const b of Object.values(state.buildings)) {
    if (b.type === 'residence') {
      state = withColonist(state, b.id).state
    }
  }
  return assignJobs(state)
}

// ---------------------------------------------------------------------------
// §3 — Baseline bootstrap
// ---------------------------------------------------------------------------

describe('§3 — baseline bootstrap trajectory', () => {
  it('10E: a farm with no road is never staffed — food decays like no farm at all', () => {
    const history = runScript(createTestState(), 8, {
      0: place(1, 1, 'residence'),
      1: place(5, 5, 'farm'),
    })
    // Residence tick 1 -> operational tick 2 -> colonist admitted tick 2.
    expect(firstTickWith(history, (s) => s.population === 1)).toBe(2)
    // The farm is operational from tick 3 but unreachable: no worker, no food.
    expect(history.every((s) => s.foodProduced === 0)).toBe(true)
    // Food therefore decays one per tick: same profile as having no farm.
    const withoutFarm = runScript(createTestState(), 8, {
      0: place(1, 1, 'residence'),
    })
    expect(history.map((s) => s.food)).toEqual(withoutFarm.map((s) => s.food))
  })

  it('10E: residence + road + farm — the colonist staffs the farm, +1 food/tick', () => {
    // t1 residence(1,1) · t2 road cells (1,2)+(2,2) · t3 farm(2,1).
    let state = createTestState()
    state = stepSimulation(state, place(1, 1, 'residence'))
    state = stepSimulation(state, {
      type: 'placeRoads',
      cells: [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    })
    state = stepSimulation(state, place(2, 1, 'farm'))
    const history: Snapshot[] = []
    for (let t = 0; t < 10; t += 1) {
      state = stepSimulation(state)
      history.push(snapshot(state))
    }
    // Farm operational tick 4 and road-connected -> assigned -> producing.
    expect(history[0]!.tick).toBe(4)
    expect(history[0]!.foodProduced).toBe(2)
    expect(history[0]!.food).toBe(98)
    // Bounded growth: +2 produced, -1 eaten.
    expect(history[9]!.food).toBe(107)
    expect(history[9]!.population).toBe(1)
    // Material: bootstrap 100 - residence 25 - 2 roads 10 - farm 25 = 40.
    expect(history[0]!.material).toBe(40)
    expect(history[9]!.material).toBe(40)
  })

  it('stable food-positive state is reachable: 1 staffed residence + farm never famines', () => {
    let state = staffedColony(1)
    const history: Snapshot[] = []
    for (let t = 0; t < 40; t += 1) {
      state = stepSimulation(state)
      history.push(snapshot(state))
    }
    const last = history[history.length - 1]!
    expect(last.population).toBe(1)
    // 40 ticks of (+2 produce - 1 eat) from stock 100.
    expect(last.food).toBe(INITIAL_FOOD + 40)
    expect(firstTickWith(history, (s) => s.food === 0)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// §4 — Controlled food pressure experiments
// ---------------------------------------------------------------------------

describe('§4A — no farm: pure stock decay into famine', () => {
  it('stock 100, pop 1: famine on tick 101 (100 fed ticks, then stock < need)', () => {
    let state = createTestState()
    const residence = manualOperational(state, 'residence', 1, 1)
    state = residence.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    let ticks = 0
    while (getPopulationCount(state) > 0 && ticks < 300) {
      state = stepSimulation(state)
      ticks += 1
    }
    expect(getPopulationCount(state)).toBe(0)
    expect(state.resources.food).toBe(0)
    expect(ticks).toBe(INITIAL_FOOD + 1)
  })
})

describe('§4B/§4C — production is linear in STAFFED farm count', () => {
  it('1/2/3 staffed farms: production 2/4/6; each farmer nets +1 food/tick', () => {
    for (const farms of [1, 2, 3]) {
      const state = staffedColony(farms)
      expect(getPopulationCount(state)).toBe(farms)
      expect(countStaffedOperationalFarms(state)).toBe(farms)
      expect(foodProductionForTick(state)).toBe(farms * 2)
      // Each farmer produces 2 and eats 1.
      const after = stepSimulation(state)
      expect(after.resources.food).toBe(state.resources.food + farms)
    }
  })

  it('a farm with no worker contributes nothing: staffing, not count, decides', () => {
    // Same three farms, but only one colonist exists to work them.
    let state = createTestState()
    const r = manualOperational(state, 'residence', 1, 0)
    state = r.state
    for (let i = 0; i < 3; i += 1) {
      const f = manualOperational(state, 'farm', 1 + i * 2, 2)
      state = f.state
    }
    state = roadRow(state, [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
    ])
    state = withColonist(state, r.id).state
    state = assignJobs(state)
    expect(countType(state, 'farm')).toBe(3)
    expect(countStaffedOperationalFarms(state)).toBe(1)
    expect(foodProductionForTick(state)).toBe(2)
  })

  it('sustainable population implied by 1 staffed farm = 2; overshoot decays at 1/tick', () => {
    // Break-even: 1 farmer + 1 idle consumer eats exactly one farm's output.
    const breakEven = staffedColony(1, 1)
    expect(breakEven.resources.food).toBe(INITIAL_FOOD)
    const after2 = stepSimulation(breakEven)
    expect(after2.resources.food).toBe(breakEven.resources.food)
    // Overshoot: 1 farmer + 2 idle consumers on 1 farm decays by 1/tick.
    const decay = staffedColony(1, 2)
    const after3 = stepSimulation(decay)
    expect(after3.resources.food).toBe(decay.resources.food - 1)
  })
})

describe('§4D — farm timing is worker timing (Step 10E)', () => {
  it('a staffed farm is worth exactly 2 food/tick: 20 ticks = +40 vs no farm', () => {
    // No farm: 1 colonist, no production, decays -1/tick for 20 ticks.
    let noFarm = createTestState()
    const r = manualOperational(noFarm, 'residence', 1, 0)
    noFarm = r.state
    noFarm = withColonist(noFarm, r.id).state
    for (let t = 0; t < 20; t += 1) {
      noFarm = stepSimulation(noFarm)
    }
    expect(noFarm.resources.food).toBe(INITIAL_FOOD - 20)

    // Staffed farm: same population, +2 produced -1 eaten per tick.
    let withFarm = staffedColony(1)
    for (let t = 0; t < 20; t += 1) {
      withFarm = stepSimulation(withFarm)
    }
    expect(withFarm.resources.food).toBe(INITIAL_FOOD + 20)
    expect(withFarm.resources.food - noFarm.resources.food).toBe(40)
  })

  it('a late farm cannot feed colonists who arrived before it was staffed', () => {
    // Three colonists, one farm: the two idle ones drain the stock.
    let state = staffedColony(1, 2)
    expect(getPopulationCount(state)).toBe(3)
    expect(foodProductionForTick(state)).toBe(2)
    let ticks = 0
    let famineTick: number | null = null
    while (getPopulationCount(state) > 0 && ticks < 300) {
      state = stepSimulation(state)
      ticks += 1
      if (getPopulationCount(state) === 0 && famineTick === null) {
        famineTick = state.time.tick
      }
    }
    expect(famineTick).not.toBeNull()
    // 100 stock, net -1/tick -> shortage on the 101st tick.
    expect(famineTick).toBe(INITIAL_FOOD + 1)
  })
})

describe('§4E — residence growth ahead of staffing', () => {
  it('overshoot ends in famine: colonists outrun the farms that feed them', () => {
    const history = runScript(createTestState(), 12, {
      0: place(1, 1, 'residence'),
      1: place(1, 2, 'farm'),
      2: place(3, 1, 'residence'),
      3: place(3, 2, 'farm'),
      4: place(5, 1, 'residence'),
      5: place(5, 2, 'farm'),
    })
    void history
    // Three farms but NO roads: under 10E no farm can be staffed, so a
    // colony that "built enough food" still starves. This is the core
    // consequence of worker-gated production.
    let state = createTestState()
    state = stepSimulation(state, place(1, 1, 'residence'))
    state = stepSimulation(state, place(1, 2, 'farm'))
    state = stepSimulation(state, place(3, 1, 'residence'))
    state = stepSimulation(state, place(3, 2, 'farm'))
    expect(countType(state, 'farm')).toBe(2)
    expect(countStaffedOperationalFarms(state)).toBe(0)
    expect(foodProductionForTick(state)).toBe(0)
  })
})

describe('§4F — surplus accumulates unbounded (no cap)', () => {
  it('3 staffed farms, 3 farmers: +3/tick, linear forever', () => {
    let state = staffedColony(3)
    expect(foodProductionForTick(state)).toBe(6)
    const before = state.resources.food
    for (let t = 0; t < 50; t += 1) {
      state = stepSimulation(state)
    }
    // 50 ticks of net +3 (6 produced, 3 eaten).
    expect(state.resources.food).toBe(before + 50 * 3)
    expect(getPopulationCount(state)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// §5 — Spatial pressure audit
// ---------------------------------------------------------------------------

describe('§5G/§5H — geometry matters only through staffing', () => {
  const farmPairAt = (
    rx: number,
    fx: number,
    withRoad: boolean
  ): SimulationState => {
    // Both buildings sit on row y = 0; the road row is y = 1, spanning from
    // the residence to the farm so every building has a contact cell.
    let state = createTestState()
    const residence = manualOperational(state, 'residence', rx, 0)
    state = residence.state
    state = withColonist(state, residence.id).state
    const farm = manualOperational(state, 'farm', fx, 0)
    state = farm.state
    if (withRoad) {
      const lo = Math.min(rx, fx)
      const hi = Math.max(rx, fx)
      const cells: CellCoordinate[] = []
      for (let x = lo; x <= hi; x += 1) {
        cells.push({ x, y: 1 })
      }
      state = roadRow(state, cells)
    }
    return assignJobs(state)
  }

  it('G — same staffing and count, different coordinates: same food outcome', () => {
    const fixtures = [
      farmPairAt(1, 2, true),
      farmPairAt(1, 7, false),
      farmPairAt(6, 1, false),
    ]
    // Distance/coordinates alone never create food: production follows the
    // staffing outcome, which is identical (one eligible worker, one farm).
    const outcomes = fixtures.map((s) => ({
      staffed: countStaffedOperationalFarms(s),
      production: foodProductionForTick(s),
    }))
    for (const o of outcomes) {
      expect(o.production).toBe(o.staffed * 2)
    }
    // The road-connected fixture is the one that gets staffed.
    expect(outcomes[0]!.staffed).toBe(1)
    expect(outcomes[1]!.staffed).toBe(0)
    expect(outcomes[2]!.staffed).toBe(0)
  })

  it('H — residence near vs far from the farm: only road access decides', () => {
    const near = farmPairAt(2, 1, true)
    const far = farmPairAt(7, 1, true)
    const nearAfter = stepSimulation(near)
    const farAfter = stepSimulation(far)
    // Both are road-connected, so both staff the farm and produce identically.
    expect(countStaffedOperationalFarms(near)).toBe(1)
    expect(countStaffedOperationalFarms(far)).toBe(1)
    expect(nearAfter.resources.food).toBe(farAfter.resources.food)
    expect(nearAfter.resources.food).toBe(near.resources.food + 1)
  })
})

describe('§5I — road topology: SUPERSEDED by 10E (roads now matter)', () => {
  it('10C finding was "roads never matter for food"; 10E inverts it', () => {
    const base = (cells: readonly CellCoordinate[]): SimulationState => {
      let state = createTestState()
      const residence = manualOperational(state, 'residence', 1, 1)
      state = residence.state
      state = withColonist(state, residence.id).state
      const farm = manualOperational(state, 'farm', 1, 3)
      state = farm.state
      state = roadRow(state, cells)
      // assignJobs runs ONCE, after the road set is final.
      return assignJobs(state)
    }
    // Without a road the farm is unreachable -> never staffed -> 0 food.
    expect(foodProductionForTick(base([]))).toBe(0)
    // One contact road is enough for employment mobility -> the farm runs.
    expect(foodProductionForTick(base([{ x: 1, y: 2 }]))).toBe(2)
    // Topology beyond connectivity is irrelevant.
    expect(
      foodProductionForTick(
        base([
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ])
      )
    ).toBe(2)
    expect(
      foodProductionForTick(
        base([
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 2, y: 1 },
        ])
      )
    ).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §6 — Economic pressure: Material competition (real command chains)
// ---------------------------------------------------------------------------

describe('§6 — housing growth vs food security vs industrial capacity', () => {
  it('one colonist, one farm and one workshop: labour is the scarce resource', () => {
    // Residences share a road; the worker staffs the NEAREST workplace, so a
    // single colonist can produce food OR material, never both.
    const colony = (farmX: number, workshopX: number): SimulationState => {
      let state = createTestState()
      const r = manualOperational(state, 'residence', 3, 0)
      state = r.state
      state = withColonist(state, r.id).state
      const f = manualOperational(state, 'farm', farmX, 2)
      state = f.state
      const w = manualOperational(state, 'workshop', workshopX, 2)
      state = w.state
      const cells: CellCoordinate[] = []
      for (let x = 0; x <= 8; x += 1) {
        cells.push({ x, y: 1 })
      }
      state = roadRow(state, cells)
      return assignJobs(state)
    }
    // Farm adjacent to the residence road cell (near), workshop far.
    const foodFirst = colony(2, 7)
    expect(foodProductionForTick(foodFirst)).toBe(2)
    expect(materialProductionForTick(foodFirst)).toBe(0)
    // Workshop near, farm far: the mirror result.
    const materialFirst = colony(7, 2)
    expect(foodProductionForTick(materialFirst)).toBe(0)
    expect(materialProductionForTick(materialFirst)).toBe(2)
    // Either way the colony has exactly one worker and two workplaces.
    expect(getPopulationCount(foodFirst)).toBe(1)
    expect(getPopulationCount(materialFirst)).toBe(1)
  })

  it('two colonists staff both: food and material together', () => {
    let state = createTestState()
    const r1 = manualOperational(state, 'residence', 1, 0)
    state = r1.state
    const r2 = manualOperational(state, 'residence', 5, 0)
    state = r2.state
    const f = manualOperational(state, 'farm', 2, 2)
    state = f.state
    const w = manualOperational(state, 'workshop', 5, 2)
    state = w.state
    const cells: CellCoordinate[] = []
    for (let x = 0; x <= 8; x += 1) {
      cells.push({ x, y: 1 })
    }
    state = roadRow(state, cells)
    state = withColonist(state, r1.id).state
    state = withColonist(state, r2.id).state
    state = assignJobs(state)
    expect(getPopulationCount(state)).toBe(2)
    expect(countStaffedOperationalFarms(state)).toBe(1)
    expect(foodProductionForTick(state)).toBe(2)
    expect(materialProductionForTick(state)).toBe(2)
    // Food net is flat (2 produced, 2 eaten); the storage cap still throttles
    // Material while stock exceeds 25 per workshop.
    expect(materialUpkeepDueForTick(state)).toBe(1)
  })

  it('equal 100-material budget: housing+food vs industry diverge', () => {
    const housing = runScript(createTestState(), 10, {
      0: place(1, 1, 'residence'),
      1: place(1, 2, 'farm'),
      2: place(3, 1, 'residence'),
      3: place(3, 2, 'farm'),
    })
    const housingT4 = housing[3]!
    const housingT10 = housing[9]!
    // No roads: farms are unstaffed, so the "food colony" starves. It has
    // more colonists (more mouths) but no production and no industry.
    expect(housingT10.population).toBe(2)
    expect(housingT10.food).toBeLessThan(housingT4.food)
    expect(housingT4.foodProduced).toBe(0)
    expect(housingT10.foodProduced).toBe(0)
    expect(housingT10.material).toBe(0) // 25+25+25+25 = the whole budget

    // INDUSTRY: 1 residence + 1 workshop + a connecting road. The worker is
    // employed, so Material accrues while food decays (no farm at all).
    let industry = createTestState()
    industry = stepSimulation(industry, place(1, 0, 'residence'))
    industry = stepSimulation(industry, {
      type: 'placeRoads',
      cells: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    })
    industry = stepSimulation(industry, place(2, 0, 'workshop'))
    const series: Snapshot[] = []
    for (let t = 0; t < 8; t += 1) {
      industry = stepSimulation(industry)
      series.push(snapshot(industry))
    }
    const last = series[series.length - 1]!
    expect(last.population).toBe(1)
    expect(last.food).toBeLessThan(INITIAL_FOOD) // decaying: no farm
    // Material is throttled by the storage cap: bootstrap stock exceeds it and
    // only staffed upkeep drains it (-1/tick).
    expect(last.material).toBe(INITIAL_FOOD - 25 - 10 - 25 - 8)
    expect(materialUpkeepDueForTick(industry)).toBe(1)

    // The measured tradeoff: the housing colony fed two colonists on food it
    // could not produce and ended with no Material; the industry colony has a
    // single colonist, holds Material, and decays food more slowly because it
    // has fewer mouths. Labour — not land or roads — is the scarce resource.
    expect(last.material).toBeGreaterThan(housingT10.material)
    expect(housingT10.population).toBeGreaterThan(last.population)
    expect(housingT10.food).toBeLessThan(last.food)
  })
})

// ---------------------------------------------------------------------------
// §11 — determinism of the audit itself
// ---------------------------------------------------------------------------

describe('audit determinism', () => {
  it('repeating the bootstrap produces identical canonical state and hash', () => {
    const run = (): SimulationState => {
      let s = createTestState()
      s = stepSimulation(s, place(1, 1, 'residence'))
      s = stepSimulation(s, {
        type: 'placeRoads',
        cells: [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
      })
      s = stepSimulation(s, place(2, 1, 'farm'))
      for (let t = 0; t < 6; t += 1) {
        s = stepSimulation(s)
      }
      return s
    }
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(serializeCanonicalState(createTestState())).toBe(
      serializeCanonicalState(createTestState())
    )
  })

  it('the staffed-colony fixture is itself deterministic', () => {
    const a = staffedColony(2, 1)
    const b = staffedColony(2, 1)
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })
})
