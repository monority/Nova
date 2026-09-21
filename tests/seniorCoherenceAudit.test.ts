/**
 * Senior coherence + performance audit (Step 10D, §§4-8, §12).
 *
 * AUDIT ONLY. No production rule is changed. This suite encodes:
 *
 *   §4  conservation invariants (food, materials, population, workers)
 *   §5  workers/jobs contract (availability, uniqueness, capacity, stability)
 *   §6  determinism repetition (1/10/100/500/1000/5000 ticks) + collection order
 *   §7  property/invariant + edge cases (empty, zero, dense, extreme stocks)
 *   §8  scalability benchmark (DEV-only measurements, 10..5000 buildings)
 *   §12 save/load/hash field audit
 *
 * Failures here mean a REAL bug or a REAL contract violation — not a wish
 * for a new mechanic. Observed perf numbers are printed for the Step10D
 * report (see BOOTSTRAP-style BENCH logs); thresholds are descriptive.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  consumeFood,
  countEmployedWorkers,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  foodProductionForTick,
  getEmploymentSummary,
  getPopulationCount,
  hashCanonicalState,
  isEmployed,
  loadSave,
  materialProductionForTick,
  materialStorageCapacityForTick,
  materialUpkeepDueForTick,
  produceFood,
  produceMaterial,
  serializeCanonicalState,
  serializeSave,
  SAVE_VERSION,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState, testConfig } from './helpers.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
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

/** Colony: N residences (1 colonist each, first M workshops staffed via roads). */
const staffedColony = (
  residences: number,
  workshops: number
): { state: SimulationState; residenceIds: string[]; workshopIds: string[] } => {
  let state = createTestState()
  const residenceIds: string[] = []
  const workshopIds: string[] = []
  for (let i = 0; i < residences; i += 1) {
    const r = manualOperational(state, 'residence', i, 0)
    state = r.state
    residenceIds.push(r.id)
    const c = withColonist(state, r.id)
    state = c.state
  }
  for (let i = 0; i < workshops; i += 1) {
    const w = manualOperational(state, 'workshop', i, 2)
    state = w.state
    workshopIds.push(w.id)
    state = opRoad(state, i, 1)
  }
  return { state, residenceIds, workshopIds }
}

// ---------------------------------------------------------------------------
// §4 — Conservation invariants
// ---------------------------------------------------------------------------

describe('§4 — conservation: nothing appears or disappears without a rule', () => {
  it('food ledger: stock_next = stock + farms*2 - need (or 0 on shortage)', () => {
    let state = createTestState()
    const r = manualOperational(state, 'residence', 1, 1)
    state = r.state
    const c = withColonist(state, r.id)
    state = c.state
    const f = manualOperational(state, 'farm', 5, 5)
    state = f.state
    for (let t = 0; t < 20; t += 1) {
      const before = state.resources.food
      const need = updateNeeds(state)
      const produced = foodProductionForTick(state)
      const result = consumeFood(produceFood(state), need)
      const fed = result.fed
      const expected = fed
        ? before + produced - need
        : 0 // shortage exhausts the stock to 0 (contracted, Step 05B)
      expect(result.state.resources.food).toBe(expected)
      state = updatePopulation(result.state, fed)
    }
  })

  it('material ledger: stored = min(gross, cap - stock); upkeep = staffed x 1', () => {
    const { state } = staffedColony(2, 2)
    const assigned = assignJobs(state)
    const gross = materialProductionForTick(assigned)
    const cap = materialStorageCapacityForTick(assigned)
    const stockBefore = assigned.resources.construction
    const stored = produceMaterial(assigned)
    expect(stored.resources.construction - stockBefore).toBe(
      Math.min(gross, Math.max(0, cap - stockBefore))
    )
    const due = materialUpkeepDueForTick(assigned)
    expect(due).toBeGreaterThanOrEqual(0)
    const after = upkeepBuildings(stored)
    expect(after.resources.construction).toBe(
      stored.resources.construction - Math.min(stored.resources.construction, due)
    )
    expect(after.resources.construction).toBeGreaterThanOrEqual(0)
  })

  it('population ledger: pop only moves via admission (food>0 + free residence) or famine', () => {
    let state = createTestState()
    const r = manualOperational(state, 'residence', 1, 1)
    state = r.state
    // No colonist, food 100: admission fires inside stepSimulation.
    const after = stepSimulation(state)
    expect(getPopulationCount(after)).toBe(1)
    // Famine: stock 0 forces pop to 0 in one tick.
    const starved = updatePopulation(
      { ...after, resources: { ...after.resources, food: 0 } },
      false
    )
    expect(getPopulationCount(starved)).toBe(0)
  })

  it('workers: assigned <= available; one colonist = at most one job', () => {
    const { state } = staffedColony(4, 2)
    const assigned = assignJobs(state)
    const summary = getEmploymentSummary(assigned)
    expect(summary.employed).toBeLessThanOrEqual(summary.population)
    expect(summary.employed).toBeLessThanOrEqual(summary.jobCapacity)
    expect(countEmployedWorkers(assigned)).toBe(summary.employed)
    // Each colonist holds at most one workplaceId by construction of the type;
    // verify no workshop is double-staffed.
    for (const wid of Object.keys(assigned.buildings)) {
      expect(countWorkersAt(assigned, wid)).toBeLessThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// §5 — Workers/jobs contract
// ---------------------------------------------------------------------------

describe('§5 — workers/jobs: contract as implemented', () => {
  it('a building can produce Material only with a worker (no free production)', () => {
    const { state } = staffedColony(1, 1)
    // Unassigned state: nobody works the workshop.
    expect(countEmployedWorkers(state)).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    const assigned = assignJobs(state)
    expect(countEmployedWorkers(assigned)).toBe(1)
    expect(materialProductionForTick(assigned)).toBe(2)
  })

  it('farms produce zero when unstaffed (Step 10E: farms now require a worker)', () => {
    let state = createTestState()
    const f = manualOperational(state, 'farm', 2, 2)
    state = f.state
    expect(getPopulationCount(state)).toBe(0)
    expect(foodProductionForTick(state)).toBe(0)
  })

  it('assignment is stable tick-to-tick on an unchanged network', () => {
    const { state } = staffedColony(3, 3)
    const once = assignJobs(state)
    const twice = assignJobs(once)
    expect(serializeCanonicalState(twice)).toBe(serializeCanonicalState(once))
  })

  it('no priority rule between workshops beyond distance-then-id (09M)', () => {
    // Two eligible workshops at equal distance: lowest id wins, always.
    const { state, residenceIds, workshopIds } = staffedColony(1, 2)
    void residenceIds
    const assigned = assignJobs(state)
    const [low, high] = [...workshopIds].sort()
    expect(countWorkersAt(assigned, low!)).toBe(1)
    expect(countWorkersAt(assigned, high!)).toBe(0)
  })

  it('isEmployed resolves the reference (non-operational workplace = not employed)', () => {
    const { state } = staffedColony(1, 1)
    const assigned = assignJobs(state)
    const colonistId = Object.keys(assigned.colonists)[0]!
    const colonist = assigned.colonists[colonistId]!
    expect(isEmployed(assigned, colonist)).toBe(true)
    // Demolish-by-override: workplace gone -> not employed (audit-side check).
    const wid = colonist.workplaceId!
    const broken = {
      ...assigned,
      buildings: Object.fromEntries(
        Object.entries(assigned.buildings).filter(([id]) => id !== wid)
      ),
    }
    expect(
      isEmployed(broken, broken.colonists[colonistId]!)
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §6 — Determinism repetition + collection order
// ---------------------------------------------------------------------------

describe('§6 — determinism: repetition and insertion order', () => {
  const scriptedColony = (): SimulationState => {
    let s = createTestState()
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
    s = stepSimulation(s, {
      type: 'placeBuilding',
      x: 3,
      y: 1,
      buildingType: 'workshop',
    })
    s = stepSimulation(s, {
      type: 'placeRoads',
      cells: [
        { x: 2, y: 1 },
        { x: 3, y: 2 },
      ],
    })
    return s
  }

  it.each([1, 10, 100, 500, 1000, 5000])(
    'repetition: %i ticks from the same init give the same hash (%i)',
    (ticks) => {
      const run = (): string => {
        let s = scriptedColony()
        for (let t = 0; t < ticks; t += 1) {
          s = stepSimulation(s)
        }
        return hashCanonicalState(s)
      }
      expect(run()).toBe(run())
    },
    120000
  )

  it('collection order: reversed building insertion gives the same economy', () => {
    const build = (reverse: boolean) => {
      let s = createTestState()
      const defs = [
        { type: 'residence' as const, x: 1, y: 1 },
        { type: 'workshop' as const, x: 1, y: 3 },
        { type: 'workshop' as const, x: 5, y: 3 },
      ]
      const order = reverse ? [...defs].reverse() : defs
      const ids: Record<string, string> = {}
      for (const d of order) {
        const m = manualOperational(s, d.type, d.x, d.y)
        s = m.state
        ids[`${d.type}-${d.x}-${d.y}`] = m.id
      }
      s = opRoad(s, 1, 2)
      s = opRoad(s, 2, 2)
      s = opRoad(s, 3, 2)
      s = opRoad(s, 4, 2)
      s = opRoad(s, 5, 2)
      const r = withColonist(s, ids['residence-1-1']!)
      return assignJobs(r.state)
    }
    const a = build(false)
    const b = build(true)
    // Same spatial decision (nearest workshop chosen) and same economy.
    const nearOf = (s: SimulationState): string => {
      const cid = Object.keys(s.colonists)[0]!
      return s.colonists[cid]!.workplaceId ?? 'none'
    }
    const nearA = nearOf(a)
    const nearB = nearOf(b)
    // Both choose the workshop at (1,3) whatever its id is.
    expect(a.buildings[nearA]!.x).toBe(1)
    expect(a.buildings[nearA]!.y).toBe(3)
    expect(b.buildings[nearB]!.x).toBe(1)
    expect(b.buildings[nearB]!.y).toBe(3)
    expect(materialProductionForTick(a)).toBe(materialProductionForTick(b))
    expect(getEmploymentSummary(a).employed).toBe(
      getEmploymentSummary(b).employed
    )
  })
})

// ---------------------------------------------------------------------------
// §7 — Property/invariant + edge cases
// ---------------------------------------------------------------------------

describe('§7 — invariants hold on edge cases', () => {
  const assertGlobalInvariants = (s: SimulationState): void => {
    expect(s.resources.food).toBeGreaterThanOrEqual(0)
    expect(s.resources.construction).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(s.resources.food)).toBe(true)
    expect(Number.isFinite(s.resources.construction)).toBe(true)
    expect(getPopulationCount(s)).toBeGreaterThanOrEqual(0)
    expect(Object.keys(s.buildings).length).toBeGreaterThanOrEqual(0)
    for (const c of Object.values(s.colonists)) {
      expect(typeof c.id).toBe('string')
    }
  }

  it('empty city steps cleanly', () => {
    let s = createTestState()
    for (let t = 0; t < 10; t += 1) {
      s = stepSimulation(s)
      assertGlobalInvariants(s)
    }
    expect(getPopulationCount(s)).toBe(0)
  })

  it('zero population with farms: no production, no crash (Step 10E: farms need a worker)', () => {
    let s = createTestState()
    const f = manualOperational(s, 'farm', 1, 1)
    s = f.state
    for (let t = 0; t < 10; t += 1) {
      s = stepSimulation(s)
      assertGlobalInvariants(s)
    }
    // Vacant farm produces nothing; food stays at its stockpile (100).
    expect(s.resources.food).toBe(100)
  })

  it('dense city (full 8x8 grid of residences): admission saturates, invariants hold', () => {
    let s = createTestState()
    for (let x = 0; x < testConfig.world.width; x += 1) {
      for (let y = 0; y < testConfig.world.height; y += 1) {
        const m = manualOperational(s, 'residence', x, y)
        s = m.state
      }
    }
    for (let t = 0; t < 5; t += 1) {
      s = stepSimulation(s)
      assertGlobalInvariants(s)
    }
    // One colonist per residence at most.
    expect(getPopulationCount(s)).toBeLessThanOrEqual(64)
  })

  it('zero material stock: placements rejected, simulation continues', () => {
    let s = createTestState()
    s = { ...s, resources: { ...s.resources, construction: 0 } }
    s = stepSimulation(s, {
      type: 'placeBuilding',
      x: 1,
      y: 1,
      buildingType: 'residence',
    })
    expect(Object.keys(s.buildings)).toHaveLength(0)
    assertGlobalInvariants(s)
  })

  it('high population (40 colonists, 4 farms): shortage path stays integral', () => {
    let s = createTestState()
    const rids: string[] = []
    for (let i = 0; i < 10; i += 1) {
      const r = manualOperational(s, 'residence', i % 8, Math.floor(i / 8))
      s = r.state
      rids.push(r.id)
    }
    for (let i = 0; i < 40; i += 1) {
      const c = withColonist(s, rids[i % rids.length]!)
      s = c.state
    }
    for (let i = 0; i < 4; i += 1) {
      const f = manualOperational(s, 'farm', 7 - i, 7)
      s = f.state
    }
    for (let t = 0; t < 10; t += 1) {
      s = stepSimulation(s)
      assertGlobalInvariants(s)
    }
    // 40 mouths vs 8/tick production: stock drains, famine eventually.
    expect(s.resources.food).toBeLessThan(100)
  })

  it('many workshops, few workers: employment capped by population', () => {
    const { state } = staffedColony(2, 8)
    const assigned = assignJobs(state)
    expect(getEmploymentSummary(assigned).employed).toBe(2)
  })

  it('save(load(state)) preserves simulation state (round-trip)', () => {
    const { state } = staffedColony(2, 2)
    const after = stepSimulation(assignJobs(state))
    const reloaded = loadSave(serializeSave(after))
    expect(serializeCanonicalState(reloaded)).toBe(
      serializeCanonicalState(after)
    )
    expect(hashCanonicalState(reloaded)).toBe(hashCanonicalState(after))
  })
})

// ---------------------------------------------------------------------------
// §8 — Scalability benchmark (DEV measurements for the Step10D report)
// ---------------------------------------------------------------------------

describe('§8 — scalability benchmark', () => {
  /** Large deterministic fixture on a big grid: thirds residence/farm/workshop.
   * Assembled directly (no per-entity state spreads) so fixture build is O(n).
   */
  const bigFixture = (buildings: number, roads: number): SimulationState => {
    const side = Math.ceil(Math.sqrt(buildings * 2)) + 4
    const base = createInitialState({
      world: { seed: 'nova-10d-bench', width: side, height: side },
    })
    const third = Math.floor(buildings / 3)
    const buildingRecords: Record<string, (typeof base.buildings)[string]> = {}
    const colonistRecords: Record<string, (typeof base.colonists)[string]> = {}
    const roadRecords: Record<string, (typeof base.roads)[string]> = {}
    let nextBuildingId = 1
    let nextColonistId = 1
    let nextRoadId = 1
    const residenceIds: string[] = []
    for (let i = 0; i < buildings; i += 1) {
      const type: BuildingType =
        i < third ? 'residence' : i < 2 * third ? 'farm' : 'workshop'
      const id = `building-${nextBuildingId}`
      nextBuildingId += 1
      const x = (i % (side - 2)) + 1
      const y = Math.floor(i / (side - 2)) + 1
      buildingRecords[id] = {
        id,
        type,
        x,
        y,
        status: 'operational',
        constructionRemaining: 0,
      }
      if (type === 'residence') {
        residenceIds.push(id)
      }
    }
    for (const residenceId of residenceIds) {
      const id = `colonist-${nextColonistId}`
      nextColonistId += 1
      colonistRecords[id] = { id, residenceId, workplaceId: null, workplaceAssignmentMode: 'automatic' }
    }
    for (let i = 0; i < roads; i += 1) {
      const id = `road-${nextRoadId}`
      nextRoadId += 1
      roadRecords[id] = {
        id,
        x: (i % (side - 2)) + 1,
        y: 0,
        status: 'operational',
        constructionRemaining: 0,
      }
    }
    return {
      ...base,
      buildings: buildingRecords,
      colonists: colonistRecords,
      roads: roadRecords,
      counters: { nextBuildingId, nextColonistId, nextRoadId },
    }
  }

  const measure = (label: string, fn: () => void): number => {
    const start = performance.now()
    fn()
    const ms = performance.now() - start
    console.log(`BENCH ${label}: ${ms.toFixed(1)}ms`)
    return ms
  }

  it('tick cost across SMALL..STRESS fixtures', () => {
    const cases = [
      { name: 'SMALL-10', buildings: 10, roads: 5, ticks: 20 },
      { name: 'MEDIUM-100', buildings: 100, roads: 50, ticks: 10 },
      { name: 'LARGE-500', buildings: 500, roads: 200, ticks: 2 },
      { name: 'XL-1000', buildings: 1000, roads: 400, ticks: 1 },
    ] as const
    for (const c of cases) {
      const s = bigFixture(c.buildings, c.roads)
      const total = measure(`${c.name}-tick-x${c.ticks}`, () => {
        let next = s
        for (let t = 0; t < c.ticks; t += 1) {
          next = stepSimulation(next)
        }
      })
      console.log(
        `BENCH ${c.name}-per-tick: ${(total / c.ticks).toFixed(2)}ms ` +
          `(pop=${getPopulationCount(s)}, roads=${Object.keys(s.roads).length})`
      )
    }
  }, 300000)

  it('STRESS-5000: fixture build + hash + save stay linear (no full tick: see report)', () => {
    const built = measure('STRESS-fixture-build', () => {
      bigFixture(5000, 1500)
    })
    void built
    const s = bigFixture(5000, 1500)
    measure('STRESS-hash', () => {
      hashCanonicalState(s)
    })
    measure('STRESS-save', () => {
      serializeSave(s)
    })
    // A full STRESS tick is intentionally not executed here: MEDIUM->LARGE
    // already shows ~100x per 5x entities (see Step10D report). One full
    // tick at this scale would exceed CI budgets by orders of magnitude.
  }, 120000)

  it('subsystem split on LARGE-500', () => {
    const s = bigFixture(500, 200)
    measure('LARGE-assignJobs', () => {
      assignJobs(s)
    })
    measure('LARGE-produceFood', () => {
      produceFood(s)
    })
    measure('LARGE-produceMaterial', () => {
      produceMaterial(assignJobs(s))
    })
    measure('LARGE-hash', () => {
      hashCanonicalState(s)
    })
    measure('LARGE-save', () => {
      serializeSave(s)
    })
  }, 120000)
}, 300000)

// ---------------------------------------------------------------------------
// §12 — Save/hash field audit
// ---------------------------------------------------------------------------

describe('§12 — save/hash: persisted vs derived audit', () => {
  it('same simulation -> same hash; different simulation -> different hash', () => {
    const { state: a } = staffedColony(2, 2)
    const { state: b } = staffedColony(2, 2)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    const changed = stepSimulation(a)
    expect(hashCanonicalState(changed)).not.toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(b)).toBe(serializeCanonicalState(a))
  })

  it('no derived field is persisted or hashed (networks, distances, mobility)', () => {
    const { state } = staffedColony(2, 2)
    const assigned = assignJobs(state)
    const serialized = serializeCanonicalState(assigned)
    for (const key of [
      'network',
      'distance',
      'mobility',
      'employment',
      'fed',
      'foodNeed',
      'foodShortage',
    ]) {
      expect(serialized).not.toContain(`"${key}"`)
    }
    expect(SAVE_VERSION).toBe(6)
  })

  it('corrupt/foreign saves are rejected, never silently migrated', () => {
    expect(() => loadSave('not json')).toThrow()
    expect(() =>
      loadSave('{"format":"nova-save","version":3,"state":{}}')
    ).toThrow()
    expect(() =>
      loadSave('{"format":"other","version":4,"state":{}}')
    ).toThrow()
  })
})
