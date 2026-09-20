/**
 * Food Security Pressure Audit (Step 10C).
 *
 * AUDIT ONLY — no production rule is changed. This suite encodes the mandatory
 * experiments of docs/roadmap/Step10C.md as deterministic measurements:
 *
 *   §3  baseline bootstrap trajectory
 *   §4  A no-farm · B/C farm count · D farm timing · E residence growth · F surplus
 *   §5  G farm placement · H residence/farm geometry · I road topology
 *   §6  Material competition (housing vs food security vs industry)
 *
 * Measured dynamics (confirmed by this audit, unchanged rules):
 *   - a building placed on tick T becomes operational on tick T+1;
 *   - admission fills EVERY free operational residence while food > 0, after
 *     consumption; a colonist admitted on tick T eats from tick T+1;
 *   - famine (fed=false) removes the ENTIRE colony on the same tick;
 *   - a placement costing more than the Material stock is silently rejected.
 *
 * The tests are EVIDENCE, not new gameplay rules. Food behavior comes from the
 * unchanged Step 10A chain (need = pop × 1, farm = 2/tick, food ≥ 0, no cap).
 */

import { describe, expect, it } from 'vitest'

import {
  createBuilding,
  createColonist,
  createRoads,
  foodProductionForTick,
  getPopulationCount,
  hashCanonicalState,
  INITIAL_FOOD,
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

/** Run `ticks` steps; a script entry (0-based step index) places a building. */
const runScript = (
  state: SimulationState,
  ticks: number,
  script: Readonly<
    Record<number, { x: number; y: number; buildingType: BuildingType }>
  >
): readonly Snapshot[] => {
  let next = state
  const history: Snapshot[] = []
  for (let t = 0; t < ticks; t += 1) {
    const entry = script[t]
    const command: SimulationCommand | undefined = entry
      ? {
          type: 'placeBuilding',
          x: entry.x,
          y: entry.y,
          buildingType: entry.buildingType,
        }
      : undefined
    next = stepSimulation(next, command)
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

/** Operationalize the one under-construction farm of the given state (audit shortcut). */
const operationalizePendingFarm = (
  state: SimulationState
): SimulationState => {
  const pendingId = Object.keys(state.buildings).find((id) => {
    const building = state.buildings[id]
    return building?.type === 'farm' && building.status !== 'operational'
  })
  if (pendingId === undefined) {
    throw new Error('audit helper: no pending farm')
  }
  const building = state.buildings[pendingId]!
  return {
    ...state,
    buildings: {
      ...state.buildings,
      [pendingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

/** Place a farm through the real command path, then operationalize it. */
const placeFarm = (state: SimulationState, x: number, y: number): SimulationState =>
  operationalizePendingFarm(
    stepSimulation(state, {
      type: 'placeBuilding',
      x,
      y,
      buildingType: 'farm',
    })
  )

const roadAt = (
  state: SimulationState,
  cell: CellCoordinate
): SimulationState => {
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

const firstTickWith = (
  history: readonly Snapshot[],
  predicate: (s: Snapshot) => boolean
): number | null => {
  const found = history.find(predicate)
  return found ? found.tick : null
}

// ---------------------------------------------------------------------------
// §3 — Baseline bootstrap
// ---------------------------------------------------------------------------

describe('§3 — baseline bootstrap trajectory', () => {
  it('residence first, farm next: first colonist at tick 2, food-positive from tick 3', () => {
    const history = runScript(createTestState(), 8, {
      0: { x: 1, y: 1, buildingType: 'residence' },
      1: { x: 5, y: 5, buildingType: 'farm' },
    })
    // Diagnostic table for docs/roadmap/Step10C.md (t = canonical tick).
    console.log(
      'BOOTSTRAP ' +
        JSON.stringify(
          history.map((s) => ({
            t: s.tick,
            pop: s.population,
            food: s.food,
            need: s.foodNeed,
            prod: s.foodProduced,
            mat: s.material,
            farms: s.farms,
            res: s.residences,
          }))
        )
    )
    // Residence placed tick 1 -> operational tick 2 -> colonist admitted tick 2.
    expect(firstTickWith(history, (s) => s.population === 1)).toBe(2)
    // Farm placed tick 2 -> operational tick 3: production from tick 3.
    expect(history[1]!.foodProduced).toBe(0)
    expect(history[2]!.food).toBe(INITIAL_FOOD - 1 + 2) // eat 1, produce 2
    expect(history[0]!.material).toBe(INITIAL_FOOD - 25)
    expect(history[1]!.material).toBe(INITIAL_FOOD - 50)
    // Food-positive and growing afterwards.
    expect(history[7]!.food).toBeGreaterThan(history[2]!.food)
  })

  it('stable food-positive state is reachable: 1 residence + 1 farm never famines', () => {
    const history = runScript(createTestState(), 40, {
      0: { x: 1, y: 1, buildingType: 'residence' },
      1: { x: 5, y: 5, buildingType: 'farm' },
    })
    const last = history[history.length - 1]!
    expect(last.population).toBe(1)
    // Consumption from tick 3 to tick 40 = 38 ticks, net +1/tick.
    expect(last.food).toBe(INITIAL_FOOD + 38)
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
    // 100 fed ticks (100 -> 0), then the 101st tick is a shortage tick.
    expect(ticks).toBe(INITIAL_FOOD + 1)
  })
})

describe('§4B/§4C — farm count: production is strictly linear', () => {
  it('1/2/3 farms: production 2/4/6; net vs pop 1 is +1/+3/+5', () => {
    for (const [farms, net] of [
      [1, 1],
      [2, 3],
      [3, 5],
    ] as const) {
      let state = createTestState()
      const residence = manualOperational(state, 'residence', 1, 1)
      state = residence.state
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      for (let i = 0; i < farms; i += 1) {
        state = placeFarm(state, 5 + i, 5)
      }
      expect(foodProductionForTick(state)).toBe(farms * 2)
      const before = state.resources.food
      const after = stepSimulation(state)
      expect(after.resources.food).toBe(before + farms * 2 - 1)
      expect(after.resources.food - before).toBe(net)
    }
  })

  it('sustainable population implied by 1 farm = 2; overshoot decays at (pop-2)/tick', () => {
    const colony = (pop: number) => {
      let state = createTestState()
      const ids: string[] = []
      for (let i = 0; i < pop; i += 1) {
        const residence = manualOperational(state, 'residence', 1 + i * 2, 1)
        state = residence.state
        ids.push(residence.id)
      }
      for (const id of ids) {
        const colonist = withColonist(state, id)
        state = colonist.state
      }
      return placeFarm(state, 6, 6)
    }
    // Break-even: 2 colonists eat exactly the single farm's output.
    const breakEven = colony(2)
    const after2 = stepSimulation(breakEven)
    expect(after2.resources.food).toBe(breakEven.resources.food)
    // Overshoot: 3 colonists on 1 farm decay by 1/tick.
    const decay = colony(3)
    const after3 = stepSimulation(decay)
    expect(after3.resources.food).toBe(decay.resources.food - 1)
  })
})

describe('§4D — farm timing', () => {
  it('a farm built 50 ticks late costs exactly 49 x 2 food of buffer; no famine either way', () => {
    const early = runScript(createTestState(), 60, {
      0: { x: 1, y: 1, buildingType: 'residence' },
      1: { x: 5, y: 5, buildingType: 'farm' },
    })
    const late = runScript(createTestState(), 60, {
      0: { x: 1, y: 1, buildingType: 'residence' },
      50: { x: 5, y: 5, buildingType: 'farm' },
    })
    const earlyAt60 = early[59]!
    const lateAt60 = late[60 - 1]!
    expect(earlyAt60.population).toBe(1)
    expect(lateAt60.population).toBe(1)
    // Early farm produces from tick 3, late farm from tick 52: 49 ticks of 2.
    expect(earlyAt60.food - lateAt60.food).toBe(49 * 2)
    expect(earlyAt60.food).toBeGreaterThan(0)
    expect(lateAt60.food).toBeGreaterThan(0)
  })
})

describe('§4E — residence growth ahead of production (real command chain)', () => {
  it('farm first + 3 residences: pop 3, decay -1/tick from the overshoot tick on', () => {
    // Budget: farm (25) + 3 residences (75) = 100. Farm placed tick 1 so it is
    // affordable; admissions then fill all residences (food > 0 throughout).
    const history = runScript(createTestState(), 10, {
      0: { x: 6, y: 6, buildingType: 'farm' },
      1: { x: 1, y: 1, buildingType: 'residence' },
      2: { x: 3, y: 1, buildingType: 'residence' },
      3: { x: 5, y: 1, buildingType: 'residence' },
    })
    // Admissions: residence-1 op tick 3 -> pop 1 @3; r2 op tick 4 -> pop 2;
    // r3 op tick 5 -> pop 3.
    expect(firstTickWith(history, (s) => s.population === 1)).toBe(3)
    expect(firstTickWith(history, (s) => s.population === 3)).toBe(5)
    // From tick 6 on: production 2, need 3 -> net -1/tick.
    const t5 = history[4]!
    const t9 = history[8]!
    expect(t9.food).toBe(t5.food - 4)
    // Material fully spent: silent rejection would show here if a 4th were built.
    expect(history[3]!.material).toBe(0)
  })

  it('overshoot ends in famine: 1 farm + 3 residences decays to zero', () => {
    const history = runScript(createTestState(), 120, {
      0: { x: 6, y: 6, buildingType: 'farm' },
      1: { x: 1, y: 1, buildingType: 'residence' },
      2: { x: 3, y: 1, buildingType: 'residence' },
      3: { x: 5, y: 1, buildingType: 'residence' },
    })
    const famineTick = (() => {
      const startIdx = history.findIndex((s) => s.population === 3)
      const found = history
        .slice(startIdx + 1)
        .find((s) => s.population === 0)
      return found ? found.tick : null
    })()
    expect(famineTick).not.toBeNull()
    // Decay starts at tick 6 from a food level of 103: -1/tick -> famine at ~109.
    expect(famineTick!).toBeGreaterThan(100)
    expect(famineTick!).toBeLessThan(120)
    const after = history[history.length - 1]!
    // MEASURED FINDING (boom-bust): after famine the colony re-booms — farms
    // produce without population, admission re-fills residences as soon as
    // food > 0, and the colony re-famines. Period-4 oscillation: pop 3, 3, 3,
    // 0 repeating (verified t120-t144).
    expect(after.population).toBe(3)
    expect(after.food).toBe(2)
  })
})

describe('§4F — surplus accumulates unbounded (no cap)', () => {
  it('3 farms, pop 1: +5/tick, linear forever', () => {
    let state = createTestState()
    const residence = manualOperational(state, 'residence', 1, 1)
    state = residence.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    for (let i = 0; i < 3; i += 1) {
      state = placeFarm(state, 5 + i, 5)
    }
    expect(foodProductionForTick(state)).toBe(6)
    const before = state.resources.food
    for (let t = 0; t < 50; t += 1) {
      state = stepSimulation(state)
    }
    // 50 ticks of net +5.
    expect(state.resources.food).toBe(before + 50 * 5)
    expect(getPopulationCount(state)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §5 — Spatial pressure audit
// ---------------------------------------------------------------------------

describe('§5G/§5H — farm and residence geometry have no food effect', () => {
  const colonyAt = (
    rx: number,
    ry: number,
    fx: number,
    fy: number
  ): SimulationState => {
    let state = createTestState()
    const residence = manualOperational(state, 'residence', rx, ry)
    state = residence.state
    const colonist = withColonist(state, residence.id)
    state = colonist.state
    return placeFarm(state, fx, fy)
  }

  it('G — same farm count/operational state, different coordinates: same food outcome', () => {
    const a = stepSimulation(colonyAt(1, 1, 5, 5))
    const b = stepSimulation(colonyAt(1, 1, 7, 7))
    const c = stepSimulation(colonyAt(6, 1, 1, 6))
    for (const s of [a, b, c]) {
      expect(getPopulationCount(s)).toBe(1)
      expect(s.resources.food).toBe(a.resources.food)
      expect(foodProductionForTick(s)).toBe(2)
    }
  })

  it('H — residence near vs far from the farm: no rule distinguishes them', () => {
    const near = colonyAt(2, 2, 1, 1)
    const far = colonyAt(7, 7, 1, 1)
    const nearAfter = stepSimulation(near)
    const farAfter = stepSimulation(far)
    expect(nearAfter.resources.food).toBe(farAfter.resources.food)
    expect(nearAfter.resources.food).toBe(near.resources.food + 1) // +2 prod, -1 need
  })
})

describe('§5I — road topology: food equivalence (regression proof)', () => {
  it('no roads / straight / loop: identical food trajectories', () => {
    const base = () => {
      let state = createTestState()
      const residence = manualOperational(state, 'residence', 1, 1)
      state = residence.state
      const colonist = withColonist(state, residence.id)
      state = colonist.state
      return placeFarm(state, 5, 5)
    }
    const noRoads = base()
    const straight = [{ x: 3, y: 1 }, { x: 4, y: 1 }].reduce(
      (s, cell) => roadAt(s, cell),
      base()
    )
    const loop = [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 1, y: 4 },
    ].reduce((s, cell) => roadAt(s, cell), base())

    const outcomes = [noRoads, straight, loop].map((s) => {
      const after = stepSimulation(stepSimulation(s))
      return {
        food: after.resources.food,
        population: getPopulationCount(after),
        production: foodProductionForTick(after),
      }
    })
    for (const o of outcomes) {
      expect(o.food).toBe(outcomes[0]!.food)
      expect(o.population).toBe(outcomes[0]!.population)
      expect(o.production).toBe(outcomes[0]!.production)
    }
  })
})

// ---------------------------------------------------------------------------
// §6 — Economic pressure: Material competition (real command chains)
// ---------------------------------------------------------------------------

describe('§6 — housing growth vs food security vs industrial capacity', () => {
  it('equal 100-material budget: housing+farm vs industry diverge', () => {
    // HOUSING: 2 residences + 1 farm = 75. Admissions fill both residences;
    // farm from tick 4 makes food flat (2 - 2). No industry, no upkeep.
    const housing = runScript(createTestState(), 10, {
      0: { x: 1, y: 1, buildingType: 'residence' },
      1: { x: 5, y: 1, buildingType: 'residence' },
      2: { x: 3, y: 5, buildingType: 'farm' },
    })
    const housingT4 = housing[3]!
    const housingT10 = housing[9]!
    expect(housingT10.population).toBe(2)
    expect(housingT4.food).toBe(housingT10.food) // flat: 2 - 2
    expect(housingT4.material).toBe(25)
    expect(housingT10.material).toBe(25)

    // INDUSTRY: 1 residence + 1 workshop + 2-cell road = 60. Pop 1 (no farm:
    // food decays -1/tick); rebuilt step-by-step below for road placement.
    // Road placed through a direct command on the final-state line below.
    let industryState = createTestState()
    industryState = stepSimulation(industryState, {
      type: 'placeBuilding',
      x: 1,
      y: 1,
      buildingType: 'residence',
    })
    industryState = stepSimulation(industryState, {
      type: 'placeBuilding',
      x: 3,
      y: 1,
      buildingType: 'workshop',
    })
    industryState = stepSimulation(industryState, {
      type: 'placeRoads',
      cells: [
        { x: 2, y: 1 },
        { x: 3, y: 2 },
      ],
    })
    // Workshop op tick 3 (road only complete tick 4): worker employed tick 4.
    const series: Snapshot[] = []
    for (let t = 0; t < 8; t += 1) {
      industryState = stepSimulation(industryState)
      series.push(snapshot(industryState))
    }
    const last = series[series.length - 1]!
    expect(last.population).toBe(1)
    expect(last.food).toBeLessThan(100) // decaying: no farm
    // MEASURED FINDING (storage cap): the 100-material budget leaves stock 40
    // > storage cap 25 (1 workshop) -> Material output is DISCARDED while
    // stock > cap; only staffed upkeep (-1/tick) drains it. Material decreases
    // -1/tick during these 8 ticks: 40 - 8 = 32.
    expect(last.material).toBe(32)
    expect(materialUpkeepDueForTick(industryState)).toBe(1)

    // The measured tradeoff: housing keeps food flat but never builds Material;
    // industry burns food stock AND is throttled by the storage cap at start.
    expect(housingT10.food).toBeGreaterThan(last.food)
    expect(housingT10.material).toBe(25)
    expect(last.material).toBeGreaterThan(housingT10.material)
  })
})

// ---------------------------------------------------------------------------
// §11 — determinism of the audit itself
// ---------------------------------------------------------------------------

describe('audit determinism', () => {
  it('repeating the bootstrap produces identical canonical state and hash', () => {
    const run = (): SimulationState => {
      let s = createTestState()
      const history = runScript(s, 8, {
        0: { x: 1, y: 1, buildingType: 'residence' },
        1: { x: 5, y: 5, buildingType: 'farm' },
      })
      void history
      // Rebuild the same sequence state-by-state for hash comparison.
      s = stepSimulation(s, {
        type: 'placeBuilding',
        x: 1,
        y: 1,
        buildingType: 'residence',
      })
      s = stepSimulation(s, {
        type: 'placeBuilding',
        x: 5,
        y: 5,
        buildingType: 'farm',
      })
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
})
