/**
 * Manual Workforce Reassignment Audit (Step 10L).
 *
 * AUDIT ONLY — `src/` is untouched. Three conceptual models:
 *
 *   A CURRENT   automatic `assignJobs` only (production code)
 *   B MANUAL    automatic default + a player override of one colonist
 *   C AUTO      an automatic "vacant Workshop steals a Farm worker" policy
 *
 * B and C are modelled ONLY inside this file:
 *   - B by a full-tick harness that re-applies an override map after
 *     `assignJobs` (`stepWithHook` + `applyOverrides`);
 *   - C by the same harness with an `applyAutoPolicy` hook.
 *
 * Canonical state already carries `ColonistState.workplaceId`, so no new state
 * is introduced anywhere.
 *
 * Run:
 *   npx vitest run tests/manualWorkforceReassignmentAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  areAccessesConnected,
  assignJobs,
  consumeFood,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getDistanceBetweenAccesses,
  getEmploymentSummary,
  getPopulationCount,
  hashCanonicalState,
  loadSave,
  produceFood,
  produceMaterial,
  progressPlacedBuilding,
  progressPlacedRoads,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10l', width: 60, height: 20 },
}

const createAuditState = (): SimulationState => createInitialState(auditConfig)

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

interface RowSpec {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly colonists?: number
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

const rowWorld = (spec: RowSpec): SimulationState => {
  let state = withStocks(createAuditState(), {
    food: spec.food ?? 2000,
    material: spec.material ?? 10,
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
  const colonists = spec.colonists ?? spec.residences
  for (let i = 0; i < Math.min(colonists, residenceIds.length); i += 1) {
    state = addColonist(state, residenceIds[i]!)
  }
  return assignJobs(state)
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Audit harness with an assignment hook (candidate-independent)
// ---------------------------------------------------------------------------

type AssignmentHook = (state: SimulationState) => SimulationState

/** Exact mirror of stepSimulation with `hook` replacing the final assignment. */
const stepWithHook = (state: SimulationState, hook: AssignmentHook): SimulationState => {
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  const produced = produceFood(constructed)
  const consumed = consumeFood(produced, requiredFood)
  const populated = updatePopulation(consumed.state, consumed.fed)
  const staffed = assignJobs(populated)
  const adjusted = hook(staffed)
  const materialized = produceMaterial(adjusted)
  const commanded = applyCommand(materialized, undefined)
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed = progressPlacedRoads(progressedBuilding, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(maintained)
}

const identityHook: AssignmentHook = (state) => state

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly unemployment: number
}

const snapshot = (state: SimulationState): Snapshot => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  staffedFarms: countStaffedOperationalFarms(state),
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  unemployment: getEmploymentSummary(state).unemployed,
})

const runHook = (
  start: SimulationState,
  ticks: number,
  hook: AssignmentHook
): { state: SimulationState; snapshots: Snapshot[] } => {
  let state = start
  const snapshots: Snapshot[] = []
  for (let i = 0; i < ticks; i += 1) {
    state = stepWithHook(state, hook)
    snapshots.push(snapshot(state))
  }
  return { state, snapshots }
}

// ---------------------------------------------------------------------------
// Model B — manual override
// ---------------------------------------------------------------------------

/** Pure canonical mutation: set one colonist's workplaceId. */
const reassignColonist = (
  state: SimulationState,
  colonistId: string,
  workplaceId: string
): SimulationState => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) throw new Error('audit: unknown colonist')
  return {
    ...state,
    colonists: { ...state.colonists, [colonistId]: { ...colonist, workplaceId } },
  }
}

/** Re-applies an override map after `assignJobs` (sticky manual control). */
const overrideHook = (overrides: ReadonlyMap<string, string>): AssignmentHook =>
  (state) => {
    let next = state
    let changed = false
    let colonists = next.colonists
    for (const [colonistId, workplaceId] of overrides) {
      const colonist = colonists[colonistId]
      if (colonist !== undefined && colonist.workplaceId !== workplaceId) {
        colonists = { ...colonists, [colonistId]: { ...colonist, workplaceId } }
        changed = true
      }
    }
    if (changed) next = { ...next, colonists }
    return next
  }

// ---------------------------------------------------------------------------
// Model C — automatic policy counterfactual
// ---------------------------------------------------------------------------

type AutoPolicy = 'literal' | 'adaptive'

/**
 * A Workshop is a valid auto target when it is operational, road-accessible,
 * vacant, and mobility-connected to the colonist's Residence.
 */
const eligibleVacantWorkshops = (
  state: SimulationState,
  colonistId: string
): string[] => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined || colonist.residenceId === null) return []
  const residenceAccess = getBuildingRoadAccess(state, colonist.residenceId)
  const result: string[] = []
  for (const building of Object.values(state.buildings)) {
    if (building.type !== 'workshop' || building.status !== 'operational') continue
    if (countWorkersAt(state, building.id) > 0) continue
    const access = getBuildingRoadAccess(state, building.id)
    if (!areAccessesConnected(residenceAccess, access)) continue
    if (getDistanceBetweenAccesses(state, residenceAccess, access) === null) continue
    result.push(building.id)
  }
  return result.sort()
}

const autoPolicyHook = (policy: AutoPolicy): AssignmentHook =>
  (state) => {
    const colonists = [...Object.values(state.colonists)].sort((a, b) => (a.id < b.id ? -1 : 1))
    let next = state
    for (const colonist of colonists) {
      const current = next.colonists[colonist.id]
      if (current === undefined || current.workplaceId === null) continue
      const workplace = next.buildings[current.workplaceId]
      if (workplace === undefined || workplace.type !== 'farm') continue
      const target = eligibleVacantWorkshops(next, colonist.id)[0]
      if (target === undefined) continue
      if (policy === 'adaptive') {
        const staffedFarms = countStaffedOperationalFarms(next)
        const population = getPopulationCount(next)
        // Only move if the remaining Farms still feed the colony.
        if ((staffedFarms - 1) * 2 < population) continue
      }
      next = {
        ...next,
        colonists: {
          ...next.colonists,
          [colonist.id]: { ...current, workplaceId: target },
        },
      }
    }
    return next
  }

// ---------------------------------------------------------------------------
// 3/4 — Current workforce model and hypothetical contract
// ---------------------------------------------------------------------------

describe('3/4 — current workforce model and hypothetical contract', () => {
  it('hook=identity is byte-identical to stepSimulation', () => {
    for (const start of [
      rowWorld({ residences: 2, farms: 1, workshops: 1, material: 10 }),
      rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0 }),
    ]) {
      let withHook = start
      let production = start
      for (let i = 0; i < 25; i += 1) {
        withHook = stepWithHook(withHook, identityHook)
        production = stepSimulation(production)
      }
      expect(serializeCanonicalState(withHook)).toBe(serializeCanonicalState(production))
      expect(hashCanonicalState(withHook)).toBe(hashCanonicalState(production))
    }
    audit('HOOK_FIDELITY', { identical: true })
  })

  it('documents the canonical employment state (workplaceId + assignment mode since Step 10M)', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    const keys = Object.keys(Object.values(state.colonists)[0]!).sort()
    audit('COLONIST_STATE', { keys, note: 'reassignment is a workplaceId + workplaceAssignmentMode value change, not new state' })
    expect(keys).toEqual(['id', 'residenceId', 'workplaceAssignmentMode', 'workplaceId'])
  })

  it('documents the hypothetical validation contract', () => {
    audit('CONTRACT', {
      operation: 'reassignColonist(colonistId, workplaceId)',
      requires: [
        'colonist exists',
        'workplace exists',
        'workplace operational',
        'workplace has capacity (no other worker)',
        'workplace is a Farm or Workshop',
        'colonist residence exists',
        'residence and workplace are mobility-connected',
      ],
      rejects: [
        'unknown colonist / workplace',
        'under-construction workplace',
        'non-workplace building type',
        'already-occupied workplace',
        'no residence',
        'no road access / disconnected network',
      ],
      newRules: 0,
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5 — Problem reproduction
// ---------------------------------------------------------------------------

describe('5 — canonical problematic scenario', () => {
  const problemState = (material = 5, food = 2000): SimulationState =>
    rowWorld({ residences: 2, farms: 2, workshops: 2, material, food })

  it('reproduces 2 Residences / 2 Farms / 2 Workshops with both workers on Farms', () => {
    const state = problemState()
    const ids = Object.values(state.colonists)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((c) => ({ colonist: c.id, residence: c.residenceId, workplace: c.workplaceId }))
    audit('PROBLEM_STATE', {
      assignments: ids,
      staffedFarms: countStaffedOperationalFarms(state),
      staffedWorkshops: countStaffedOperationalWorkshops(state),
      food: state.resources.food,
      material: state.resources.construction,
      roadNetworks: 'single row network (y=1)',
    })
    expect(countStaffedOperationalFarms(state)).toBe(2)
    expect(countStaffedOperationalWorkshops(state)).toBe(0)
  })

  it('runs 60 ticks and confirms the state stays inefficient', () => {
    const trace = runHook(problemState(), 60, identityHook)
    const last = trace.snapshots[59]!
    audit('PROBLEM_60_TICKS', {
      materialStart: 5,
      materialEnd: last.material,
      staffedWorkshopsEnd: last.staffedWorkshops,
      staffedFarmsEnd: last.staffedFarms,
      foodEnd: last.food,
    })
    expect(last.material).toBe(5)
    expect(last.staffedWorkshops).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6 — Manual reassignment counterfactual (one-tick flows)
// ---------------------------------------------------------------------------

describe('6 — manual reassignment counterfactual', () => {
  it('verifies the directional deltas from the actual simulation', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    // building-5 is the near Workshop (x=5); colonist-2 is on Farm building-4.
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const override = overrideHook(new Map([['colonist-2', 'building-5']]))
    const current = runHook(start, 1, identityHook)
    const changed = runHook(manual, 1, override)

    const delta = {
      food: changed.snapshots[0]!.food - current.snapshots[0]!.food,
      material: changed.snapshots[0]!.material - current.snapshots[0]!.material,
      staffedFarms: changed.snapshots[0]!.staffedFarms - current.snapshots[0]!.staffedFarms,
      staffedWorkshops:
        changed.snapshots[0]!.staffedWorkshops - current.snapshots[0]!.staffedWorkshops,
    }
    audit('MANUAL_ONE_TICK', {
      current: current.snapshots[0],
      manual: changed.snapshots[0],
      delta,
    })
    // Farm -> Workshop: -2 Food/tick, +1 net Material/tick, +1 Workshop.
    expect(delta.staffedFarms).toBe(-1)
    expect(delta.staffedWorkshops).toBe(1)
    expect(delta.food).toBe(-2)
    expect(delta.material).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 7 — Recovery with a sticky manual override
// ---------------------------------------------------------------------------

describe('7 — recovery experiment', () => {
  it('one sticky manual reassignment restores a viable trajectory', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const overrides = new Map([['colonist-2', 'building-5']])
    const trace = runHook(manual, 60, overrideHook(overrides))
    audit('RECOVERY_MANUAL', {
      t1: trace.snapshots[0],
      t5: trace.snapshots[4],
      t10: trace.snapshots[9],
      t30: trace.snapshots[29],
      t60: trace.snapshots[59],
      constructionAffordableAt60: trace.snapshots[59]!.material >= 25,
    })
    expect(trace.snapshots[0]!.staffedWorkshops).toBe(1)
    expect(trace.snapshots[59]!.material).toBeGreaterThan(5)
    expect(trace.snapshots[59]!.food).toBeGreaterThan(0)
    expect(trace.snapshots[59]!.population).toBe(2)
  })

  it('a PURE workplaceId mutation is reverted by assignJobs (implementation caveat)', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const afterOneTick = stepSimulation(manual)
    audit('NON_STICKY_REVERT', {
      beforeTick: manual.colonists['colonist-2']!.workplaceId,
      afterOneTick: afterOneTick.colonists['colonist-2']!.workplaceId,
      staffedWorkshopsAfterOneTick: countStaffedOperationalWorkshops(afterOneTick),
      note: 'assignJobs preserves an existing assignment only when it is still among the nearest, so an override to a farther Workshop is reverted unless the control is made sticky',
    })
    expect(afterOneTick.colonists['colonist-2']!.workplaceId).not.toBe('building-5')
    expect(countStaffedOperationalWorkshops(afterOneTick)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 8 — Reverse reassignment
// ---------------------------------------------------------------------------

describe('8 — reverse reassignment (Workshop -> Farm)', () => {
  it('measures the reverse deltas and confirms it is a real choice', () => {
    // 2 Residences / 2 Farms / 2 Workshops, Workshop-first geometry: both
    // colonists start on Workshops (building-3 x=1, building-4 x=3).
    const shopFirst = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop' })
    const current = runHook(shopFirst, 1, identityHook).snapshots[0]!
    const moved = reassignColonist(shopFirst, 'colonist-2', 'building-5')
    const changed = runHook(moved, 1, overrideHook(new Map([['colonist-2', 'building-5']]))).snapshots[0]!
    audit('REVERSE_REASSIGNMENT', {
      current,
      changed,
      delta: {
        food: changed.food - current.food,
        material: changed.material - current.material,
        staffedFarms: changed.staffedFarms - current.staffedFarms,
      },
    })
    // Workshop -> Farm: +2 Food/tick production (pop 2 -> net +2), -1 net Material.
    expect(changed.staffedFarms - current.staffedFarms).toBe(1)
    expect(changed.food - current.food).toBe(2)
    expect(changed.material - current.material).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// 9 — Reassignment scenarios
// ---------------------------------------------------------------------------

describe('9 — reassignment scenarios', () => {
  it('A — Farm -> Workshop restores a Workshop', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const r = runHook(manual, 1, overrideHook(new Map([['colonist-2', 'building-5']]))).snapshots[0]!
    audit('SCENARIO_A', { staffedFarms: r.staffedFarms, staffedWorkshops: r.staffedWorkshops })
    expect(r.staffedWorkshops).toBe(1)
    expect(r.staffedFarms).toBe(1)
  })

  it('B — Workshop -> Farm restores Food', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop' })
    // Workshop-first: both colonists on Workshops (building-3, building-4).
    const r = snapshot(start)
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const changed = runHook(manual, 1, overrideHook(new Map([['colonist-2', 'building-5']]))).snapshots[0]!
    audit('SCENARIO_B', { before: r, after: changed })
    expect(r.staffedWorkshops).toBe(2)
    expect(changed.staffedWorkshops).toBe(1)
    expect(changed.staffedFarms).toBe(1)
  })

  it('C — two eligible Workshops: both are valid manual targets', () => {
    // The colonist starts on a Farm so BOTH Workshops are vacant and eligible.
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'farm', 1, 2) // building-2, nearest -> staffed
    state = op(state, 'workshop', 5, 2) // building-3, vacant
    state = op(state, 'workshop', 7, 2) // building-4, vacant
    for (let x = 0; x <= 8; x += 1) state = opRoad(state, x, 1)
    state = addColonist(state, 'building-1')
    state = assignJobs(state)
    const targets = eligibleVacantWorkshops(state, 'colonist-1')
    audit('SCENARIO_C', { eligibleTargets: targets, automatic: state.colonists['colonist-1']!.workplaceId })
    expect(targets).toEqual(['building-3', 'building-4'])
  })

  it('D — different distances: manual can name the far Workshop but assignJobs reverts it', () => {
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'workshop', 3, 2) // near: 0 road steps
    state = op(state, 'workshop', 9, 2) // far: 6 road steps
    for (let x = 0; x <= 10; x += 1) state = opRoad(state, x, 1)
    state = addColonist(state, 'building-1')
    state = assignJobs(state)
    const auto = state.colonists['colonist-1']!.workplaceId
    const manual = reassignColonist(state, 'colonist-1', 'building-3')
    const reverted = stepSimulation(manual)
    audit('SCENARIO_D', {
      automatic: auto,
      manualChosen: manual.colonists['colonist-1']!.workplaceId,
      afterPlainTick: reverted.colonists['colonist-1']!.workplaceId,
      note: 'a manual override of a farther workplace needs stickiness, otherwise it is not a real control',
    })
    expect(auto).toBe('building-2')
    expect(reverted.colonists['colonist-1']!.workplaceId).toBe('building-2')
  })

  it('E — invalid targets are rejected by existing eligibility rules', () => {
    // Disconnected and roadless workshops + an occupied one + under-construction.
    let state = withStocks(createAuditState(), { material: 100, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    state = op(state, 'workshop', 3, 0) // connected, will be occupied
    state = op(state, 'workshop', 9, 9) // no road at all
    state = addColonist(state, 'building-1')
    state = assignJobs(state)
    // Occupied target.
    expect(countWorkersAt(state, 'building-2')).toBe(1)
    // Roadless / disconnected target.
    const targets = eligibleVacantWorkshops(state, 'colonist-1')
    // Under-construction target.
    const created = createBuilding(state, 'workshop', 5, 0, 2)
    const underConstruction = created.state.buildings[created.buildingId]!
    audit('SCENARIO_E', {
      occupied: 'building-2 rejected (full capacity)',
      roadless: 'building-4 rejected (no road access)',
      eligibleVacant: targets,
      underConstructionStatus: underConstruction.status,
    })
    expect(targets).toEqual([])
    expect(underConstruction.status).toBe('underConstruction')
  })
})

// ---------------------------------------------------------------------------
// 10 — Automatic policy counterfactual
// ---------------------------------------------------------------------------

describe('10 — automatic policy counterfactual', () => {
  it('literal policy moves every Farm worker to a Workshop and starves the colony', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 100 })
    const trace = runHook(start, 60, autoPolicyHook('literal'))
    audit('AUTO_POLICY_LITERAL', {
      t1: trace.snapshots[0],
      t30: trace.snapshots[29],
      t60: trace.snapshots[59],
      note: 'both Farm workers move, Food production becomes 0 and the colony starves',
    })
    expect(trace.snapshots[0]!.staffedFarms).toBe(0)
    expect(trace.snapshots[0]!.staffedWorkshops).toBe(2)
    expect(trace.snapshots[59]!.population).toBe(0)
  })

  it('adaptive policy keeps Food sustainable but removes the player choice', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const trace = runHook(start, 60, autoPolicyHook('adaptive'))
    audit('AUTO_POLICY_ADAPTIVE', {
      t1: trace.snapshots[0],
      t60: trace.snapshots[59],
      note: 'the colony settles at 1F/1W automatically, so 2F (food priority) and 2W (material priority) are no longer reachable',
    })
    expect(trace.snapshots[0]!.staffedFarms).toBe(1)
    expect(trace.snapshots[0]!.staffedWorkshops).toBe(1)
  })

  it('adaptive policy collapses to 2F when the colony needs more Food', () => {
    const start = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 5, food: 2000 })
    const trace = runHook(start, 1, autoPolicyHook('adaptive'))
    audit('AUTO_POLICY_ADAPTIVE_PRESSURE', { t1: trace.snapshots[0], population: 3 })
    // 2 Farms + 1 Workshop stay staffed: the policy refuses to move a Farm
    // worker because 1 Farm could not feed 3 colonists.
    expect(trace.snapshots[0]!.staffedFarms).toBe(2)
    expect(trace.snapshots[0]!.staffedWorkshops).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 11 — Oscillation
// ---------------------------------------------------------------------------

describe('11 — oscillation audit', () => {
  it('the literal policy is monotone (no oscillation) but an adaptive policy flips at the food boundary', () => {
    // Population 3 needs 3 Food; 2 Farms give 4. Adaptive keeps 2F. Admit a
    // 4th colonist (need 4): 2 Farms give 4, still fine. Population 5: 2F give
    // 4 < 5, so no move. The flip surface is population vs 2 x staffedFarms.
    const flips: { population: number; staffedFarms: number; staffedWorkshops: number }[] = []
    for (const population of [2, 3, 4, 5]) {
      const start = rowWorld({
        residences: population,
        colonists: population,
        farms: 2,
        workshops: 2,
        material: 5,
        food: 2000,
      })
      const t1 = runHook(start, 1, autoPolicyHook('adaptive')).snapshots[0]!
      flips.push({ population, staffedFarms: t1.staffedFarms, staffedWorkshops: t1.staffedWorkshops })
    }
    audit('OSCILLATION', {
      boundary: flips,
      literalPolicy: 'monotone: always Workshop, no oscillation, but starves',
      adaptivePolicy: 'flips Farm/Workshop at the Food boundary; if population oscillates the assignment would too',
    })
    // The literal auto policy never oscillates; the adaptive one changes its
    // answer with population, which is the oscillation surface.
    expect(flips[0]!.staffedWorkshops).toBe(1)
    expect(flips[3]!.staffedFarms).toBe(2)
  })

  it('the current automatic assignment does not oscillate over 240 idle ticks', () => {
    const trace = runHook(rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 4000 }), 240, identityHook)
    const firstAssignment = trace.snapshots[0]!
    const stable = trace.snapshots.every(
      (s) => s.staffedFarms === firstAssignment.staffedFarms && s.staffedWorkshops === firstAssignment.staffedWorkshops
    )
    audit('CURRENT_STABILITY', { stable, staffedFarms: firstAssignment.staffedFarms, staffedWorkshops: firstAssignment.staffedWorkshops })
    expect(stable).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 12 — Spatial interaction
// ---------------------------------------------------------------------------

describe('12 — spatial interaction', () => {
  it('a disconnected Workshop becomes a valid manual target only after the roads connect', () => {
    let state = withStocks(createAuditState(), { material: 100, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    state = op(state, 'farm', 3, 0)
    state = op(state, 'workshop', 9, 0) // network A only; B not built yet
    state = addColonist(state, 'building-1')
    state = assignJobs(state)
    const before = eligibleVacantWorkshops(state, 'colonist-1')
    // Connect the Workshop's network to the residence network.
    for (let x = 3; x <= 10; x += 1) state = opRoad(state, x, 0)
    const after = eligibleVacantWorkshops(state, 'colonist-1')
    audit('SPATIAL_CONNECT', {
      beforeConnection: before,
      afterConnection: after,
      note: 'manual reassignment inherits the 09K mobility gate unchanged',
    })
    expect(before).toEqual([])
    expect(after).toEqual(['building-3'])
  })

  it('same network, different distances: automatic picks the nearest, manual can name any valid one', () => {
    // Farm-first geometry leaves both Workshops vacant for the manual choice.
    let state = withStocks(createAuditState(), { material: 20, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = op(state, 'farm', 1, 2)
    state = op(state, 'workshop', 5, 2)
    state = op(state, 'workshop', 7, 2)
    for (let x = 0; x <= 8; x += 1) state = opRoad(state, x, 1)
    state = addColonist(state, 'building-1')
    state = assignJobs(state)
    const targets = eligibleVacantWorkshops(state, 'colonist-1')
    audit('SPATIAL_DISTANCE', { targets, automatic: state.colonists['colonist-1']!.workplaceId })
    expect(targets.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 13 — Multiple colonists
// ---------------------------------------------------------------------------

describe('13 — multiple colonists', () => {
  it('3 colonists / 2F+2W: the action names one colonist and one workplace', () => {
    const start = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 5 })
    const before = snapshot(start)
    const colonistOnFarm = Object.values(start.colonists).find((c) => {
      const w = start.buildings[c.workplaceId ?? '']
      return w?.type === 'farm'
    })!
    const manual = reassignColonist(start, colonistOnFarm.id, 'building-7')
    const after = runHook(manual, 1, overrideHook(new Map([[colonistOnFarm.id, 'building-7']]))).snapshots[0]!
    audit('MULTI_3', { before, moved: { colonist: colonistOnFarm.id, to: 'building-7' }, after })
    expect(before.staffedWorkshops).toBe(1)
    expect(after.staffedWorkshops).toBe(2)
  })

  it('4 colonists / 2F+2W: full staffing leaves nothing to reassign', () => {
    const start = rowWorld({ residences: 4, farms: 2, workshops: 2 })
    const r = snapshot(start)
    audit('MULTI_4', r)
    expect(r.staffedFarms + r.staffedWorkshops).toBe(4)
    expect(r.unemployment).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 14/15 — Player-control granularity and automation preservation
// ---------------------------------------------------------------------------

describe('14/15 — granularity and automation preservation', () => {
  it('classifies the control options', () => {
    audit('GRANULARITY', {
      individualReassignment: {
        classification: 'REAL CANDIDATE',
        agency: 'high (exact worker and workplace)',
        microManagement: 'low at 1-5 colonists, grows with colony size',
        determinism: 'fully deterministic',
        spatialCompatibility: 'uses 09M eligibility; needs a stickiness rule to override distance',
      },
      workplacePriority: {
        classification: 'REAL CANDIDATE',
        agency: 'medium (sets a policy, not a worker)',
        microManagement: 'low',
        determinism: 'deterministic',
        spatialCompatibility: 'keeps 09M inside the priority band',
      },
      buildingLevelLaborPreference: {
        classification: 'WEAK CANDIDATE',
        agency: 'medium',
        microManagement: 'medium',
        determinism: 'deterministic',
        spatialCompatibility: 'needs per-building priority state',
      },
      automaticCorrection: {
        classification: 'OVER-CONTROL',
        agency: 'none (removes the Farm/Workshop choice)',
        microManagement: 'none',
        determinism: 'deterministic but can starve (literal) or shadow the player (adaptive)',
        spatialCompatibility: 'ignores deliberate placement intent',
      },
    })
    expect(true).toBe(true)
  })

  it('shows the normal case stays automatic and the override is exceptional', () => {
    const automatic = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 10 })
    const trace = runHook(automatic, 60, identityHook)
    const changed = trace.snapshots.some(
      (s, i) => i > 0 && s.staffedFarms !== trace.snapshots[0]!.staffedFarms
    )
    audit('AUTOMATION_PRESERVED', {
      automaticStable: !changed,
      note: 'without an override the simulation assigns and keeps a stable optimum; the override is an exception, not the normal workflow',
    })
    expect(changed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 16/17 — Persistence and invalid-control audit
// ---------------------------------------------------------------------------

describe('16/17 — persistence and invalid-control audit', () => {
  it('reassignment is representable in existing canonical state and round-trips', () => {
    const start = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const manual = reassignColonist(start, 'colonist-2', 'building-5')
    const restored = loadSave(serializeSave(manual))
    expect(restored.colonists['colonist-2']!.workplaceId).toBe('building-5')
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(manual))
    audit('PERSISTENCE', { saveVersion: SAVE_VERSION, newStateFields: 0, workplaceId: restored.colonists['colonist-2']!.workplaceId })
    expect(SAVE_VERSION).toBe(6)
  })

  it('one colonist can never hold two workplaces and capacity is one per workplace', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const colonists = Object.values(state.colonists)
    // workplaceId is a single scalar; no list can exist.
    for (const colonist of colonists) {
      expect(typeof colonist.workplaceId === 'string' || colonist.workplaceId === null).toBe(true)
    }
    for (const building of Object.values(state.buildings)) {
      expect(countWorkersAt(state, building.id)).toBeLessThanOrEqual(1)
    }
    audit('INVALID_CONTROL', {
      duplicateWorkplace: 'impossible: workplaceId is scalar',
      overCapacity: 'assignJobs and the canonical relation cap each workplace at 1',
      roadAccess: '09K mobility gate is inherited',
      operationalStatus: 'only operational workplaces are eligible',
      underConstruction: 'rejected by the operational check',
      noResidence: 'colonist without residenceId has no eligible workplace',
    })
  })
})

// ---------------------------------------------------------------------------
// 18/19 — Agency and safety
// ---------------------------------------------------------------------------

describe('18/19 — agency and safety', () => {
  it('classifies the three models on agency', () => {
    audit('AGENCY', {
      manualReassignment: 'REAL',
      automaticPolicy: 'ABSENT (it performs the move for the player)',
      currentSystem: 'WEAK (agency exists through build order and housing, but a committed allocation cannot be corrected)',
    })
    expect(true).toBe(true)
  })

  it('manual is the smallest recovery; automatic over-corrects; the control is symmetric', () => {
    const stuckFarmHeavy = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const manualFarmToShop = reassignColonist(stuckFarmHeavy, 'colonist-2', 'building-5')
    const fixed = runHook(manualFarmToShop, 30, overrideHook(new Map([['colonist-2', 'building-5']])))

    const stuckShopHeavy = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 100, first: 'workshop' })
    const manualShopToFarm = reassignColonist(stuckShopHeavy, 'colonist-2', 'building-5')
    const fixedReverse = runHook(manualShopToFarm, 30, overrideHook(new Map([['colonist-2', 'building-5']])))

    audit('SAFETY', {
      farmHeavyAtMaterial5: {
        current: 'stuck (Material 5, 0 Workshops staffed)',
        manualAfter30: fixed.snapshots[29],
        automaticLiteral: 'starves (0 Farms staffed)',
      },
      workshopHeavy: {
        current: 'Food-negative (0 Farms staffed)',
        manualAfter30: fixedReverse.snapshots[29],
        symmetric: true,
      },
    })
    expect(fixed.snapshots[29]!.staffedWorkshops).toBe(1)
    expect(fixed.snapshots[29]!.material).toBeGreaterThan(5)
    expect(fixedReverse.snapshots[29]!.staffedFarms).toBe(1)
    expect(fixedReverse.snapshots[29]!.food).toBeGreaterThanOrEqual(100)
  })
})
