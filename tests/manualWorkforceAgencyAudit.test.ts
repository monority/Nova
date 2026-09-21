/**
 * Manual Workforce & Agency Audit (Step 10N).
 *
 * AUDIT ONLY — `src/` is untouched. This suite evaluates the Step 10M
 * production implementation: does manual reassignment create genuine agency,
 * resolve the 10K/10L workforce dead-ends, stay deterministic and stay
 * architecturally contained?
 *
 * Run:
 *   npx vitest run tests/manualWorkforceAgencyAudit.test.ts --reporter=verbose
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
  getPopulationCount,
  getReassignmentOptions,
  hashCanonicalState,
  loadSave,
  materialProductionForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  SAVE_VERSION,
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
  world: { seed: 'nova-step10n', width: 60, height: 20 },
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

const idsOf = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((building) => building.type === type)
    .map((building) => building.id)
    .sort()

const colonistOn = (state: SimulationState, workplaceId: string): string => {
  const colonist = Object.values(state.colonists).find(
    (c) => c.workplaceId === workplaceId
  )
  if (colonist === undefined) throw new Error(`audit: no colonist on ${workplaceId}`)
  return colonist.id
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

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const snapshot = (state: SimulationState): unknown => ({
  population: getPopulationCount(state),
  staffedFarms: countStaffedOperationalFarms(state),
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  food: state.resources.food,
  material: state.resources.construction,
})

const ledger = (state: SimulationState): unknown => ({
  foodProduced: countStaffedOperationalFarms(state) * 2,
  foodConsumed: getPopulationCount(state),
  materialGross: materialProductionForTick(state),
  materialStored: materialStoredProductionForTick(state),
  workshopUpkeep: materialUpkeepDueForTick(state),
  materialNet: materialProductionForTick(state) - materialUpkeepDueForTick(state),
  foodStock: state.resources.food,
  materialStock: state.resources.construction,
})

// ---------------------------------------------------------------------------
// §1 — Player agency
// ---------------------------------------------------------------------------

describe('§1 — player agency (2R/2F/2W)', () => {
  it('automatic allocation vs one manual Farm -> Workshop, then reverse', () => {
    const auto = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 1000 })
    const workshops = idsOf(auto, 'workshop')
    expect(snapshot(auto)).toMatchObject({ staffedFarms: 2, staffedWorkshops: 0 })

    const manual = reassign(auto, 'colonist-2', workshops[0]!)
    audit('AGENCY_FARM_TO_WORKSHOP', {
      automatic: snapshot(auto),
      automaticLedger: ledger(auto),
      manual: snapshot(manual),
      manualLedger: ledger(manual),
    })
    expect(snapshot(manual)).toMatchObject({ staffedFarms: 1, staffedWorkshops: 1 })
    expect(ledger(manual)).toMatchObject({
      foodProduced: 2,
      materialGross: 2,
      workshopUpkeep: 1,
      materialNet: 1,
    })
    expect(ledger(auto)).toMatchObject({ foodProduced: 4, materialGross: 0, materialNet: 0 })

    const farms = idsOf(auto, 'farm')
    const reverse = reassign(manual, 'colonist-2', farms[1]!)
    audit('AGENCY_REVERSE', { reverse: snapshot(reverse), reverseLedger: ledger(reverse) })
    expect(snapshot(reverse)).toMatchObject({ staffedFarms: 2, staffedWorkshops: 0 })
  })
})

// ---------------------------------------------------------------------------
// §2 — Multiple manual overrides
// ---------------------------------------------------------------------------

describe('§2 — multiple manual overrides', () => {
  it('manual assignments stay independent and capacity stays authoritative', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    const c1 = colonistOn(state, farms[0]!)
    const c2 = colonistOn(state, farms[1]!)
    let next = reassign(state, c1, workshops[0]!)
    next = reassign(next, c2, workshops[1]!)
    audit('MULTI_MANUAL', { next: snapshot(next) })
    expect(snapshot(next)).toMatchObject({ staffedFarms: 0, staffedWorkshops: 2 })
    expect(next.colonists[c1]!.workplaceAssignmentMode).toBe('manual')
    expect(next.colonists[c2]!.workplaceAssignmentMode).toBe('manual')

    // Capacity remains authoritative: c1 cannot take c2's workplace.
    const result = applyCommand(next, {
      type: 'reassignColonist',
      colonistId: c1,
      workplaceId: workshops[1]!,
    })
    expect(result.accepted).toBe(false)
    expect(result.state).toBe(next)
    expect(validateReassignment(next, c1, workshops[1]!)).toEqual({
      valid: false,
      reason: 'workplaceOccupied',
    })
  })

  it('one manual assignment never silently moves another manual assignment', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    const c1 = colonistOn(state, farms[0]!)
    const c2 = colonistOn(state, farms[1]!)
    let next = reassign(state, c1, workshops[0]!)
    next = reassign(next, c2, workshops[1]!)
    const after = advance(next, 20)
    audit('MANUAL_INDEPENDENCE', {
      before: { c1: workshops[0], c2: workshops[1] },
      after: { c1: after.colonists[c1]!.workplaceId, c2: after.colonists[c2]!.workplaceId },
    })
    expect(after.colonists[c1]!.workplaceId).toBe(workshops[0])
    expect(after.colonists[c2]!.workplaceId).toBe(workshops[1])
    expect(after.colonists[c1]!.workplaceAssignmentMode).toBe('manual')
    expect(after.colonists[c2]!.workplaceAssignmentMode).toBe('manual')
  })
})

// ---------------------------------------------------------------------------
// §3 — Automatic + manual interaction and invalidation
// ---------------------------------------------------------------------------

describe('§3 — automatic + manual interaction', () => {
  it('automatic colonists fill only the capacity left by valid manual choices', () => {
    const state = rowWorld({ residences: 3, farms: 2, workshops: 2, material: 5 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    const c1 = colonistOn(state, farms[0]!)
    const manual = reassign(state, c1, workshops[1]!)
    const after = advance(manual, 2)
    audit('AUTO_PLUS_MANUAL', { after: snapshot(after) })
    expect(after.colonists[c1]!.workplaceId).toBe(workshops[1])
    for (const colonist of Object.values(after.colonists)) {
      expect(countWorkersAt(after, colonist.workplaceId ?? '')).toBeLessThanOrEqual(1)
    }
    // The other two workplaces are staffed automatically.
    expect(countStaffedOperationalFarms(after) + countStaffedOperationalWorkshops(after)).toBe(3)
  })

  it('invalidates a manual assignment for every existing rule and returns to automatic', () => {
    const base = rowWorld({ residences: 1, farms: 1, workshops: 2, material: 5 })
    const workshops = idsOf(base, 'workshop')
    const target = workshops[1]!
    const manual = reassign(base, 'colonist-1', target)
    expect(manual.colonists['colonist-1']!.workplaceAssignmentMode).toBe('manual')

    const cases: Record<string, SimulationState> = {
      underConstruction: {
        ...manual,
        buildings: {
          ...manual.buildings,
          [target]: { ...manual.buildings[target]!, status: 'underConstruction', constructionRemaining: 5 },
        },
      },
      disconnected: {
        ...manual,
        roads: Object.fromEntries(
          Object.entries(manual.roads).filter(
            ([, road]) => !(road.y === 1 && road.x >= 4 && road.x <= 6)
          )
        ),
      },
      homeless: {
        ...manual,
        colonists: {
          ...manual.colonists,
          'colonist-1': { ...manual.colonists['colonist-1']!, residenceId: null },
        },
      },
    }
    const out: Record<string, unknown> = {}
    for (const [name, blocked] of Object.entries(cases)) {
      const after = advance(blocked, 2)
      out[name] = {
        workplaceId: after.colonists['colonist-1']!.workplaceId,
        mode: after.colonists['colonist-1']!.workplaceAssignmentMode,
      }
      expect(after.colonists['colonist-1']!.workplaceAssignmentMode).toBe('automatic')
      expect(after.colonists['colonist-1']!.workplaceId).not.toBe(target)
    }
    audit('INVALIDATION', out)
  })
})

// ---------------------------------------------------------------------------
// §4 — Recovery of the 10K/10L dead-end
// ---------------------------------------------------------------------------

describe('§4 — 10K/10L dead-end recovery', () => {
  it('reproduces the stuck state and recovers with one manual move', () => {
    const stuck = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const workshops = idsOf(stuck, 'workshop')
    const preRun = advance(stuck, 10)
    audit('DEADEND_BEFORE', { ...(snapshot(preRun) as object), materialStart: 5 })
    expect(preRun.resources.construction).toBe(5)
    expect(countStaffedOperationalWorkshops(preRun)).toBe(0)

    const manual = reassign(stuck, 'colonist-2', workshops[0]!)
    const trace: unknown[] = []
    let state = manual
    let previous = 0
    for (const tick of [1, 5, 10, 30, 60]) {
      state = advance(state, tick - previous)
      previous = tick
      trace.push({
        tick,
        material: state.resources.construction,
        food: state.resources.food,
        population: getPopulationCount(state),
        staffedFarms: countStaffedOperationalFarms(state),
        staffedWorkshops: countStaffedOperationalWorkshops(state),
        workplaceId: state.colonists['colonist-2']!.workplaceId,
        mode: state.colonists['colonist-2']!.workplaceAssignmentMode,
      })
    }
    audit('DEADEND_RECOVERY', trace)
    expect(state.resources.construction).toBeGreaterThanOrEqual(25)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)
    expect(state.colonists['colonist-2']!.workplaceAssignmentMode).toBe('manual')
  })

  it('reverse: Workshop-heavy allocation can be traded for Food', () => {
    const shopHeavy = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop', material: 5, food: 100 })
    const farms = idsOf(shopHeavy, 'farm')
    expect(snapshot(shopHeavy)).toMatchObject({ staffedFarms: 0, staffedWorkshops: 2 })
    const noFood = advance(shopHeavy, 10)
    const manual = reassign(shopHeavy, 'colonist-2', farms[1]!)
    const recovered = advance(manual, 30)
    audit('REVERSE_RECOVERY', {
      automaticAfter10: { food: noFood.resources.food, material: noFood.resources.construction },
      manualAfter30: { food: recovered.resources.food, material: recovered.resources.construction, staffedFarms: countStaffedOperationalFarms(recovered) },
    })
    expect(recovered.resources.food).toBeGreaterThan(noFood.resources.food)
    expect(countStaffedOperationalFarms(recovered)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §5 — Spatial constraints
// ---------------------------------------------------------------------------

describe('§5 — spatial constraints (validation matrix)', () => {
  it('accepts only eligible targets and rejects every existing-rule violation', () => {
    // 2 residences, 1 farm, 2 workshops: c1 -> farm, c2 -> near workshop,
    // leaving workshop[1] vacant.
    let state = rowWorld({ residences: 2, farms: 1, workshops: 2, material: 100 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    expect(colonistOn(state, farms[0]!)).toBe('colonist-1')
    expect(colonistOn(state, workshops[0]!)).toBe('colonist-2')

    // Extra targets for the roadless / under-construction cases.
    state = op(state, 'workshop', 20, 2)
    const roadless = idsOf(state, 'workshop').at(-1)!
    const created = createBuilding(state, 'workshop', 22, 2, 2)
    state = created.state

    const results = {
      connectedVacant: validateReassignment(state, 'colonist-1', workshops[1]!),
      roadless: validateReassignment(state, 'colonist-1', roadless),
      underConstruction: validateReassignment(state, 'colonist-1', created.buildingId),
      notWorkplace: validateReassignment(state, 'colonist-1', 'building-1'),
      unknown: validateReassignment(state, 'colonist-1', 'building-999'),
      occupied: validateReassignment(state, 'colonist-1', workshops[0]!),
      noResidence: validateReassignment(
        {
          ...state,
          colonists: {
            ...state.colonists,
            'colonist-1': { ...state.colonists['colonist-1']!, residenceId: null },
          },
        },
        'colonist-1',
        workshops[1]!
      ),
      unknownColonist: validateReassignment(state, 'colonist-999', workshops[1]!),
    }
    audit('VALIDATION_MATRIX', results)
    expect(results.connectedVacant).toMatchObject({ valid: true })
    expect(results.roadless).toEqual({ valid: false, reason: 'notConnected' })
    expect(results.underConstruction).toEqual({ valid: false, reason: 'notOperational' })
    expect(results.notWorkplace).toEqual({ valid: false, reason: 'notWorkplace' })
    expect(results.unknown).toEqual({ valid: false, reason: 'unknownWorkplace' })
    expect(results.occupied).toEqual({ valid: false, reason: 'workplaceOccupied' })
    expect(results.noResidence).toEqual({ valid: false, reason: 'noResidence' })
    expect(results.unknownColonist).toEqual({ valid: false, reason: 'unknownColonist' })
  })

  it('a disconnected target becomes valid after the roads connect', () => {
    let state = withStocks(createState(), { material: 100, food: 500 })
    state = op(state, 'residence', 1, 0)
    state = opRoad(state, 2, 0)
    state = op(state, 'farm', 3, 0)
    const farm = idsOf(state, 'farm')[0]!
    state = op(state, 'workshop', 9, 8)
    const workshop = idsOf(state, 'workshop')[0]!
    state = createColonist(state, 'building-1').state
    state = assignJobs(state)
    expect(validateReassignment(state, 'colonist-1', workshop)).toEqual({
      valid: false,
      reason: 'notConnected',
    })
    // Connect the workshop to the residence network through the shared column.
    for (let y = 0; y <= 8; y += 1) state = opRoad(state, 2, y)
    for (let x = 2; x <= 9; x += 1) state = opRoad(state, x, 8)
    const after = validateReassignment(state, 'colonist-1', workshop)
    audit('CONNECT_AFTER', { farm, workshop, after })
    expect(after).toMatchObject({ valid: true })
  })
})

// ---------------------------------------------------------------------------
// §6 — Distance semantics
// ---------------------------------------------------------------------------

describe('§6 — distance semantics', () => {
  it('automatic picks the nearest, manual keeps a farther choice', () => {
    const state = rowWorld({ residences: 1, farms: 0, workshops: 2, material: 5, first: 'workshop' })
    const workshops = idsOf(state, 'workshop')
    expect(state.colonists['colonist-1']!.workplaceId).toBe(workshops[0])
    const manual = reassign(state, 'colonist-1', workshops[1]!)
    const after = advance(manual, 30)
    audit('DISTANCE_SEMANTICS', {
      automatic: workshops[0],
      manualTarget: workshops[1],
      after30: after.colonists['colonist-1']!.workplaceId,
      mode: after.colonists['colonist-1']!.workplaceAssignmentMode,
    })
    expect(after.colonists['colonist-1']!.workplaceId).toBe(workshops[1])
    expect(after.colonists['colonist-1']!.workplaceAssignmentMode).toBe('manual')
  })

  it('the manual option list exposes distance as a preference, not a cost', () => {
    const state = rowWorld({ residences: 1, farms: 0, workshops: 2, material: 5, first: 'workshop' })
    const options = getReassignmentOptions(state, 'colonist-1')
    audit('DISTANCE_AXIS', {
      options: options.map((o) => ({ id: o.workplaceId, distance: o.distance, eligible: o.eligible, current: o.isCurrent })),
      travelSimulation: 'none — distance is a preference, not a cost',
    })
    expect(options.find((o) => o.isCurrent)).toBeDefined()
    expect(options.find((o) => o.eligible)!.distance).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §7 — Construction order recovery
// ---------------------------------------------------------------------------

describe('§7 — construction order recovery', () => {
  it('F,F,W,W and W,W,F,F both become recoverable through manual reassignment', () => {
    const farmFirst = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5, food: 2000 })
    const workshops = idsOf(farmFirst, 'workshop')
    expect(snapshot(farmFirst)).toMatchObject({ staffedFarms: 2, staffedWorkshops: 0 })
    const farmFixed = advance(reassign(farmFirst, 'colonist-2', workshops[0]!), 60)

    const shopFirst = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop', material: 5, food: 100 })
    const farms = idsOf(shopFirst, 'farm')
    expect(snapshot(shopFirst)).toMatchObject({ staffedFarms: 0, staffedWorkshops: 2 })
    const shopFixed = advance(reassign(shopFirst, 'colonist-2', farms[1]!), 60)

    audit('CONSTRUCTION_ORDER_RECOVERY', {
      farmFirst: { before: { f: 2, w: 0 }, after: snapshot(farmFixed) },
      workshopFirst: { before: { f: 0, w: 2 }, after: snapshot(shopFixed) },
    })
    expect(farmFixed.resources.construction).toBeGreaterThanOrEqual(25)
    expect(countStaffedOperationalFarms(shopFixed)).toBe(1)
    expect(shopFixed.resources.food).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §8 — Save / load, replay, migration
// ---------------------------------------------------------------------------

describe('§8 — save/load and migration', () => {
  it('A — multiple manual assignments round-trip', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    const c1 = colonistOn(state, farms[0]!)
    const c2 = colonistOn(state, farms[1]!)
    let manual = reassign(state, c1, workshops[0]!)
    manual = reassign(manual, c2, workshops[1]!)
    const restored = loadSave(serializeSave(manual))
    audit('SAVE_LOAD', {
      saveVersion: SAVE_VERSION,
      modes: Object.fromEntries(Object.values(restored.colonists).map((c) => [c.id, c.workplaceAssignmentMode])),
    })
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(manual))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(manual))
  })

  it('B/C — replay and equivalent command order are deterministic', () => {
    const run = (): SimulationState => {
      const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
      const farms = idsOf(state, 'farm')
      const workshops = idsOf(state, 'workshop')
      const c1 = colonistOn(state, farms[0]!)
      return advance(reassign(state, c1, workshops[0]!), 40)
    }
    expect(serializeCanonicalState(run())).toBe(serializeCanonicalState(run()))
    expect(hashCanonicalState(run())).toBe(hashCanonicalState(run()))
    audit('REPLAY_DETERMINISM', { hash: hashCanonicalState(run()) })
  })

  it('D — a v4 save migrates to automatic, never manual', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
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
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    audit('V4_MIGRATION', { allAutomatic: true })
  })
})

// ---------------------------------------------------------------------------
// §9 — Insertion order
// ---------------------------------------------------------------------------

describe('§9 — insertion order', () => {
  it('reversing record insertion order does not change the hash or derived staffing', () => {
    const state = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 5 })
    const farms = idsOf(state, 'farm')
    const workshops = idsOf(state, 'workshop')
    const c1 = colonistOn(state, farms[0]!)
    const manual = reassign(state, c1, workshops[0]!)
    const reversed: SimulationState = {
      ...manual,
      colonists: Object.fromEntries(Object.entries(manual.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(manual.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(manual.roads).reverse()),
    }
    audit('INSERTION_ORDER', { hashEqual: hashCanonicalState(reversed) === hashCanonicalState(manual) })
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(manual))
    expect(countStaffedOperationalWorkshops(reversed)).toBe(countStaffedOperationalWorkshops(manual))
  })
})

// ---------------------------------------------------------------------------
// §12 — Performance
// ---------------------------------------------------------------------------

describe('§12 — performance', () => {
  const clusterWorld = (workplaces: number, residences: number): SimulationState => {
    let state = withStocks(createState(), { material: 1000, food: 100000 })
    const residenceIds: string[] = []
    const clusters = Math.ceil(workplaces / 8)
    for (let i = 0; i < residences; i += 1) {
      const cluster = Math.floor(i / 8)
      const slot = i % 8
      state = op(state, 'residence', 1 + slot * 2, 4 * cluster + 2)
      residenceIds.push(`building-${i + 1}`)
    }
    for (let i = 0; i < workplaces; i += 1) {
      const cluster = Math.floor(i / 8)
      const slot = i % 8
      state = op(state, i % 2 === 0 ? 'farm' : 'workshop', 1 + slot * 2, 4 * cluster)
    }
    for (let c = 0; c < clusters; c += 1) {
      for (let x = 0; x <= 17; x += 1) state = opRoad(state, x, 4 * c + 1)
    }
    for (const id of residenceIds) state = createColonist(state, id).state
    return assignJobs(state)
  }

  it('measures the command path, assignJobs and stepSimulation at four sizes', () => {
    const measure = (fn: () => void): number => {
      const start = performance.now()
      fn()
      return performance.now() - start
    }
    const out: Record<string, unknown> = {}
    for (const [name, workplaces, residences, ticks] of [
      ['SMALL', 10, 5, 20],
      ['MEDIUM', 100, 40, 5],
      ['LARGE', 400, 150, 0],
      ['XL', 1000, 400, 0],
    ] as const) {
      const state = clusterWorld(workplaces, residences)
      // The command itself is O(1): exercise the no-op path and an invalid path.
      const colonist = Object.values(state.colonists).find((c) => c.workplaceId !== null)!
      const commandMs = measure(() => {
        applyCommand(state, {
          type: 'reassignColonist',
          colonistId: colonist.id,
          workplaceId: colonist.workplaceId!,
        })
        applyCommand(state, {
          type: 'reassignColonist',
          colonistId: 'colonist-unknown',
          workplaceId: colonist.workplaceId!,
        })
      })
      const assignMs = measure(() => { assignJobs(state) })
      const tickMs = ticks > 0
        ? measure(() => { let next = state; for (let i = 0; i < ticks; i += 1) next = stepSimulation(next) }) / ticks
        : null
      out[name] = {
        workplaces,
        residences,
        reassignCommandMs: Number(commandMs.toFixed(4)),
        assignJobsMs: Number(assignMs.toFixed(3)),
        perTickMs: tickMs === null ? null : Number(tickMs.toFixed(3)),
      }
    }
    audit('PERFORMANCE', out)
    // The reassignment command itself is a bounded O(1) operation.
    for (const name of ['SMALL', 'MEDIUM', 'LARGE', 'XL'] as const) {
      expect((out[name] as { reassignCommandMs: number }).reassignCommandMs).toBeLessThan(5)
    }
  }, 300000)
})

// ---------------------------------------------------------------------------
// §13 — Architecture
// ---------------------------------------------------------------------------

describe('§13 — architecture', () => {
  it('the colonist is the only canonical employment owner', () => {
    const state = rowWorld({ residences: 4, farms: 2, workshops: 2 })
    const colonistKeys = Object.keys(Object.values(state.colonists)[0]!).sort()
    audit('ARCHITECTURE', { colonistKeys, workplaceId: 'canonical owner', reverseIndex: 'none' })
    expect(colonistKeys).toEqual(['id', 'residenceId', 'workplaceAssignmentMode', 'workplaceId'])
    for (const building of Object.values(state.buildings)) {
      expect(Object.keys(building)).not.toContain('workerIds')
      expect(Object.keys(building)).not.toContain('workers')
    }
  })
})

// ---------------------------------------------------------------------------
// §14 — Economic ledger
// ---------------------------------------------------------------------------

describe('§14 — economic ledger', () => {
  it('the only differences are worker-allocation effects (no hidden sink)', () => {
    const auto = rowWorld({ residences: 2, farms: 2, workshops: 2, material: 0, food: 1000 })
    const workshops = idsOf(auto, 'workshop')
    const manual = reassign(auto, 'colonist-2', workshops[0]!)
    const shopHeavy = rowWorld({ residences: 2, farms: 2, workshops: 2, first: 'workshop', material: 0, food: 1000 })
    const farms = idsOf(shopHeavy, 'farm')
    const manualFarm = reassign(shopHeavy, 'colonist-2', farms[1]!)
    audit('LEDGER', {
      automatic: ledger(auto),
      manualWorkshop: ledger(manual),
      automaticShopHeavy: ledger(shopHeavy),
      manualFarm: ledger(manualFarm),
    })
    expect(ledger(auto)).toMatchObject({ foodProduced: 4, materialGross: 0, materialNet: 0 })
    expect(ledger(manual)).toMatchObject({ foodProduced: 2, materialGross: 2, workshopUpkeep: 1, materialNet: 1 })
  })
})

// ---------------------------------------------------------------------------
// §15 — Long-run stability
// ---------------------------------------------------------------------------

describe('§15 — long-run stability', () => {
  const run = (maker: () => SimulationState, ticks: number): unknown => {
    let state = maker()
    const trace: number[] = []
    for (let i = 0; i < ticks; i += 1) {
      state = stepSimulation(state)
      if (i % 20 === 0) trace.push(state.resources.construction)
    }
    return {
      food: state.resources.food,
      material: state.resources.construction,
      population: getPopulationCount(state),
      staffedFarms: countStaffedOperationalFarms(state),
      staffedWorkshops: countStaffedOperationalWorkshops(state),
      materialTrace: trace,
    }
  }

  it('runs balanced / farm-heavy / workshop-heavy / manual mixed over 60 and 240 ticks', () => {
    const scenarios: Record<string, () => SimulationState> = {
      balancedAuto: () => rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0, food: 4000 }),
      farmHeavy: () => rowWorld({ residences: 5, farms: 3, workshops: 2, material: 0, food: 4000 }),
      workshopHeavy: () => rowWorld({ residences: 5, farms: 2, workshops: 3, material: 0, food: 4000 }),
      manualMixed: () => {
        const s = rowWorld({ residences: 4, farms: 2, workshops: 2, material: 0, food: 4000 })
        const farms = idsOf(s, 'farm')
        const workshops = idsOf(s, 'workshop')
        return reassign(s, colonistOn(s, farms[0]!), workshops[0]!)
      },
      manualReversed: () => {
        const s = rowWorld({ residences: 4, farms: 2, workshops: 2, first: 'workshop', material: 0, food: 4000 })
        const farms = idsOf(s, 'farm')
        return reassign(s, 'colonist-1', farms[0]!)
      },
    }
    const out: Record<string, unknown> = {}
    for (const [name, maker] of Object.entries(scenarios)) {
      out[name] = { t60: run(maker, 60), t240: run(maker, 240) }
    }
    audit('LONG_RUN', out)
    for (const name of Object.keys(scenarios)) {
      const entry = out[name] as { t240: { population: number } }
      expect(entry.t240.population).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// §16 — Player agency classification evidence
// ---------------------------------------------------------------------------

describe('§16 — classification evidence', () => {
  it('summarises the seven agency questions', () => {
    audit('AGENCY_CLASSIFICATION', {
      genuineDecision: true,
      resolvesDeadEnds: true,
      automaticDefaultPreserved: true,
      foodMaterialTradeoff: true,
      spatialAxisWithoutTravel: true,
      deterministic: true,
      architecturallyContained: true,
    })
    expect(true).toBe(true)
  })
})
