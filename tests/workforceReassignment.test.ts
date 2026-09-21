/**
 * Manual workforce reassignment — implementation tests (Step 10M).
 *
 * Covers the command contract, `assignJobs` integration, capacity, spatial
 * override, the canonical recovery scenario, persistence/migration and
 * determinism. The audit that justified the feature lives in
 * `manualWorkforceReassignmentAudit.test.ts`.
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getColonistInspection,
  getReassignmentOptions,
  hashCanonicalState,
  loadSave,
  MIGRATABLE_SAVE_VERSION,
  SAVE_VERSION,
  SaveValidationError,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateReassignment,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10m', width: 40, height: 16 },
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
  stocks: { readonly food?: number; readonly material?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
  },
})

interface WorldSpec {
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly first?: 'farm' | 'workshop'
  readonly food?: number
  readonly material?: number
}

const rowWorld = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 2000,
    material: spec.material ?? 100,
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
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  for (const id of residenceIds) state = createColonist(state, id).state
  return assignJobs(state)
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const reassign = (
  state: SimulationState,
  colonistId: string,
  workplaceId: string
): SimulationState =>
  stepSimulation(state, { type: 'reassignColonist', colonistId, workplaceId })

// ---------------------------------------------------------------------------
// 1. Command contract
// ---------------------------------------------------------------------------

describe('1 — command contract', () => {
  it('accepts a valid assignment and marks it manual', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const next = reassign(state, 'colonist-2', 'building-5')
    const colonist = next.colonists['colonist-2']!
    expect(colonist.workplaceId).toBe('building-5')
    expect(colonist.workplaceAssignmentMode).toBe('manual')
    expect(countWorkersAt(next, 'building-4')).toBe(0)
    expect(countWorkersAt(next, 'building-5')).toBe(1)
  })

  it('rejects an unknown colonist without mutating state', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const result = applyCommand(state, {
      type: 'reassignColonist',
      colonistId: 'colonist-999',
      workplaceId: 'building-5',
    })
    expect(result.accepted).toBe(false)
    expect(result.state).toBe(state)
    expect(validateReassignment(state, 'colonist-999', 'building-5')).toEqual({
      valid: false,
      reason: 'unknownColonist',
    })
  })

  it('rejects an unknown workplace', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    expect(validateReassignment(state, 'colonist-1', 'building-999')).toEqual({
      valid: false,
      reason: 'unknownWorkplace',
    })
  })

  it('rejects a non-workplace building (residence)', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    expect(validateReassignment(state, 'colonist-1', 'building-2')).toEqual({
      valid: false,
      reason: 'notWorkplace',
    })
  })

  it('rejects an under-construction workplace', () => {
    let state = rowWorld({ residences: 1, farms: 1, workshops: 1 })
    const created = createBuilding(state, 'workshop', 9, 2, 2)
    state = created.state
    const underConstruction = created.buildingId
    expect(validateReassignment(state, 'colonist-1', underConstruction)).toEqual({
      valid: false,
      reason: 'notOperational',
    })
  })

  it('rejects a roadless / disconnected workplace', () => {
    let state = rowWorld({ residences: 1, farms: 1, workshops: 0 })
    state = op(state, 'workshop', 20, 2) // building-3, no road anywhere near it
    state = assignJobs(state)
    expect(validateReassignment(state, 'colonist-1', 'building-3')).toEqual({
      valid: false,
      reason: 'notConnected',
    })
  })

  it('rejects a full workplace', () => {
    const state = rowWorld({ residences: 2, farms: 1, workshops: 1 })
    // building-3 is the Farm (staffed by colonist-1); building-4 the Workshop.
    expect(validateReassignment(state, 'colonist-2', 'building-3')).toEqual({
      valid: false,
      reason: 'workplaceOccupied',
    })
  })

  it('rejects a colonist with no residence', () => {
    let state = rowWorld({ residences: 1, farms: 1, workshops: 1, first: 'workshop' })
    const homeless = {
      ...state,
      colonists: {
        ...state.colonists,
        'colonist-1': { ...state.colonists['colonist-1']!, residenceId: null },
      },
    }
    expect(validateReassignment(homeless, 'colonist-1', 'building-2')).toEqual({
      valid: false,
      reason: 'noResidence',
    })
    state = homeless
  })

  it('is a deterministic no-op when the target is already the current workplace', () => {
    const state = rowWorld({ residences: 1, farms: 1, workshops: 1 })
    const current = state.colonists['colonist-1']!.workplaceId!
    const next = reassign(state, 'colonist-1', current)
    expect(next.colonists['colonist-1']!.workplaceAssignmentMode).toBe('automatic')
    expect(countWorkersAt(next, current)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Capacity
// ---------------------------------------------------------------------------

describe('2 — capacity', () => {
  it('never allows two colonists in one workplace', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    // Force colonist-1 onto workshop building-5, then try to move colonist-2 there.
    const first = reassign(state, 'colonist-1', 'building-5')
    expect(countWorkersAt(first, 'building-5')).toBe(1)
    const result = applyCommand(first, {
      type: 'reassignColonist',
      colonistId: 'colonist-2',
      workplaceId: 'building-5',
    })
    expect(result.accepted).toBe(false)
    expect(result.state).toBe(first)
    expect(countWorkersAt(first, 'building-5')).toBe(1)
    expect(validateReassignment(first, 'colonist-2', 'building-5')).toEqual({
      valid: false,
      reason: 'workplaceOccupied',
    })
  })
})

// ---------------------------------------------------------------------------
// 3. assignJobs integration
// ---------------------------------------------------------------------------

describe('3 — assignJobs integration', () => {
  it('preserves a valid manual assignment across ticks (not overwritten by the nearest Farm)', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    // colonist-2 residence x=3: Farm building-4 at distance 0, Workshop
    // building-5 at distance 2. Automatic picks the Farm; the manual choice
    // must survive.
    const manual = reassign(state, 'colonist-2', 'building-5')
    const after = advance(manual, 5)
    expect(after.colonists['colonist-2']!.workplaceId).toBe('building-5')
    expect(after.colonists['colonist-2']!.workplaceAssignmentMode).toBe('manual')
    expect(countStaffedOperationalWorkshops(after)).toBe(1)
  })

  it('clears an invalid manual assignment and returns the colonist to automatic', () => {
    let state = rowWorld({ residences: 1, farms: 1, workshops: 2 })
    state = reassign(state, 'colonist-1', 'building-4')
    expect(state.colonists['colonist-1']!.workplaceAssignmentMode).toBe('manual')
    // The manual target becomes disconnected: the manual choice is no
    // longer valid and must be cleared, never left stale.
    const blocked: SimulationState = {
      ...state,
      roads: Object.fromEntries(
        Object.entries(state.roads).filter(
          ([, road]) => !(road.y === 1 && road.x >= 4 && road.x <= 6)
        )
      ),
    }
    const after = advance(blocked, 2)
    // The manual assignment is cleared; the automatic pass may reassign to the
    // remaining connected workplace (the Farm) — it is never left stale.
    expect(after.colonists['colonist-1']!.workplaceAssignmentMode).toBe('automatic')
    expect(after.colonists['colonist-1']!.workplaceId).not.toBe('building-4')
  })

  it('does not change automatic assignment behavior when no manual override exists', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const reassigned = assignJobs(state)
    expect(serializeCanonicalState(reassigned)).toBe(serializeCanonicalState(state))
    expect(reassigned.colonists['colonist-1']!.workplaceAssignmentMode).toBe('automatic')
  })
})

// ---------------------------------------------------------------------------
// 4. Spatial override
// ---------------------------------------------------------------------------

describe('4 — spatial override', () => {
  it('manual far target overrides the automatic near target', () => {
    const state = rowWorld({ residences: 1, farms: 0, workshops: 2, first: 'workshop' })
    // Automatic picks the nearest Workshop (building-2 at x=1).
    expect(state.colonists['colonist-1']!.workplaceId).toBe('building-2')
    const manual = reassign(state, 'colonist-1', 'building-3')
    expect(manual.colonists['colonist-1']!.workplaceId).toBe('building-3')
    expect(manual.colonists['colonist-1']!.workplaceAssignmentMode).toBe('manual')
    const after = advance(manual, 3)
    expect(after.colonists['colonist-1']!.workplaceId).toBe('building-3')
  })

  it('getReassignmentOptions exposes eligibility, distance and reasons', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const options = getReassignmentOptions(state, 'colonist-2')
    const byId = new Map(options.map((option) => [option.workplaceId, option]))
    // current Farm is marked current and not selectable
    expect(byId.get('building-3')!.isCurrent).toBe(false)
    expect(byId.get('building-4')!.isCurrent).toBe(true)
    expect(byId.get('building-4')!.eligible).toBe(false)
    // vacant near Workshop is eligible with a distance
    expect(byId.get('building-5')!.eligible).toBe(true)
    expect(byId.get('building-5')!.distance).toBe(2)
    // occupied Farm is rejected with a reason
    expect(byId.get('building-3')!.eligible).toBe(false)
    expect(byId.get('building-3')!.reason).toBe('workplaceOccupied')
  })
})

// ---------------------------------------------------------------------------
// 5. Economic symmetry and recovery
// ---------------------------------------------------------------------------

describe('5 — economic verification and recovery', () => {
  it('Farm -> Workshop: -2 Food, +1 net Material; stock recovers', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const manual = reassign(state, 'colonist-2', 'building-5')
    const after = advance(manual, 1)
    // Production of the reassignment tick still used the old assignment
    // (commands run at phase 8a, after produceMaterial); the next tick uses
    // the manual allocation.
    const next = advance(after, 1)
    expect(countStaffedOperationalFarms(next)).toBe(1)
    expect(countStaffedOperationalWorkshops(next)).toBe(1)
    expect(next.resources.construction).toBeGreaterThan(after.resources.construction)
    // Food stops draining (1 Farm feeds 2 colonists exactly), unlike the
    // 0-Farm Workshop-heavy state.
    expect(next.resources.food).toBeGreaterThanOrEqual(2000)
  })

  it('Workshop -> Farm is symmetric (Food priority)', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop', food: 100 })
    const currentAfter3 = advance(state, 4)
    const manual = reassign(state, 'colonist-2', 'building-5')
    const after = advance(manual, 4)
    expect(countStaffedOperationalFarms(after)).toBe(1)
    expect(countStaffedOperationalWorkshops(after)).toBe(1)
    // The manual Farm worker stops the Food drain the 0-Farm colony suffered.
    expect(after.resources.food).toBeGreaterThan(currentAfter3.resources.food)
  })

  it('canonical recovery: Material 5 -> 25+ from one manual move', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const before = advance(state, 10)
    expect(before.resources.construction).toBe(5)
    const manual = reassign(state, 'colonist-2', 'building-5')
    const after = advance(manual, 60)
    expect(countStaffedOperationalWorkshops(after)).toBe(1)
    expect(after.resources.construction).toBeGreaterThanOrEqual(25)
    expect(after.resources.food).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Persistence and migration
// ---------------------------------------------------------------------------

describe('6 — persistence and migration', () => {
  it('SAVE_VERSION is 5 and a manual assignment round-trips', () => {
    expect(SAVE_VERSION).toBe(5)
    expect(MIGRATABLE_SAVE_VERSION).toBe(4)
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const manual = reassign(state, 'colonist-2', 'building-5')
    const restored = loadSave(serializeSave(manual))
    expect(restored.colonists['colonist-2']!.workplaceId).toBe('building-5')
    expect(restored.colonists['colonist-2']!.workplaceAssignmentMode).toBe('manual')
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(manual))
  })

  it('migrates a v4 save by stamping automatic mode (never manual)', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const parsed = JSON.parse(serializeSave(state)) as {
      version: number
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    parsed.version = 4
    for (const colonist of Object.values(parsed.state.colonists)) {
      delete colonist['workplaceAssignmentMode']
    }
    const restored = loadSave(JSON.stringify(parsed))
    for (const colonist of Object.values(restored.colonists)) {
      expect(colonist.workplaceAssignmentMode).toBe('automatic')
    }
    // A v4 save whose assignments happened to be manual-looking is NOT
    // reinterpreted: the migrated state is all-automatic.
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })

  it('saves older than v4 are still rejected', () => {
    const save = serializeSave(rowWorld({ residences: 1, farms: 1, workshops: 1 }))
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 3
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })

  it('rejects a malformed assignment mode', () => {
    const save = serializeSave(rowWorld({ residences: 1, farms: 1, workshops: 1 }))
    const parsed = JSON.parse(save) as {
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    parsed.state.colonists['colonist-1']!['workplaceAssignmentMode'] = 'sometimes'
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })
})

// ---------------------------------------------------------------------------
// 7. Colonist inspection
// ---------------------------------------------------------------------------

describe('7 — colonist inspection', () => {
  it('reports the current workplace and assignment mode', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const manual = reassign(state, 'colonist-2', 'building-5')
    const inspection = getColonistInspection(manual, 'colonist-2')
    expect(inspection).toEqual({
      id: 'colonist-2',
      residenceId: 'building-2',
      workplaceId: 'building-5',
      workplaceAssignmentMode: 'manual',
    })
    expect(getColonistInspection(manual, 'colonist-999')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 8. Determinism
// ---------------------------------------------------------------------------

describe('8 — determinism', () => {
  it('same command sequence yields the same hash', () => {
    const run = (): SimulationState => {
      const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
      return advance(reassign(state, 'colonist-2', 'building-5'), 30)
    }
    expect(serializeCanonicalState(run())).toBe(serializeCanonicalState(run()))
  })

  it('command order is deterministic and semantically different', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    // reassign -> tick
    const a = advance(reassign(state, 'colonist-2', 'building-5'), 1)
    // tick -> reassign
    const b = reassign(advance(state, 1), 'colonist-2', 'building-5')
    expect(serializeCanonicalState(a)).not.toBe(serializeCanonicalState(b))
    // both are deterministic
    expect(serializeCanonicalState(b)).toBe(
      serializeCanonicalState(reassign(advance(state, 1), 'colonist-2', 'building-5'))
    )
  })

  it('insertion order does not leak into the canonical state', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2 })
    const manual = reassign(state, 'colonist-2', 'building-5')
    const reversed: SimulationState = {
      ...manual,
      colonists: Object.fromEntries(Object.entries(manual.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(manual.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(manual.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(manual))
    expect(countStaffedOperationalWorkshops(reversed)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 9. Regression: Farm upkeep remains absent
// ---------------------------------------------------------------------------

describe('9 — Farm upkeep remains absent', () => {
  it('a staffed Farm still pays no Material upkeep', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0 })
    const after = advance(state, 10)
    // 4 colonists -> 2 Farms + 2 Workshops staffed -> net +2/tick; no Farm tax.
    expect(countStaffedOperationalWorkshops(state)).toBe(2)
    expect(after.resources.construction).toBe(20)
  })
})
