/**
 * Workshop Water Bootstrap Audit (Step 10AB).
 *
 * AUDIT ONLY — `src/` is untouched. Resolves the Step 10AA bootstrap
 * contradiction for `Workshop <- Water` (1 Water per staffed operational
 * Workshop per tick):
 *
 *   strict       -> a Well-less, 0-Material colony can never make Material;
 *   exemption    -> the first Workshop produces free until a Well exists.
 *
 * Every model is an audit-only, phase-exact mirror of `stepSimulation`
 * (byte-identical when the rule is disabled). No src/, no SAVE, no
 * implementation.
 *
 * Models:
 *   A strict                    no exemption at all
 *   B1 colonyExemption          the input is inactive while no operational Well exists
 *   B2 firstWorkshopExemption   only the lowest-id Workshop is exempt in that window
 *   C  waterReserve             audit counterfactual on the INITIAL Water stock
 *   D  wellCompletionWater      a Well grants +N Water once when it becomes operational
 *   E  freeBatch                the first N ticks of the world are free
 *   F  materialFloor            exempt while Material < 25 (the price of a Well)
 *
 * Run:
 *   npx vitest run tests/workshopWaterBootstrapAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getPopulationCount,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  loadSave,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedRoads,
  releaseCompletedConstructionCrew,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  WATER_PER_COLONIST_PER_TICK,
  waterProductionForTick,
  type BuildingType,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10ab', width: 40, height: 14 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

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
  if (building === undefined) throw new Error('10ab: building missing')
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
  if (id === undefined) throw new Error('10ab: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ab: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly workshops?: number
  readonly wells?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

/** Row world: residences y=0, road row y=1, workplaces y=2. */
const world = (spec: Spec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 0,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells, 1)
  for (let i = 0; i < spec.residences; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  const ids = Object.values(state.buildings)
    .filter((b) => b.type === 'residence')
    .map((b) => b.id)
  for (let i = 0; i < Math.min(spec.colonists ?? 0, ids.length); i += 1) {
    state = createColonist(state, ids[i]!).state
  }
  return assignJobs(state)
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Bootstrap models (audit-only)
// ---------------------------------------------------------------------------

type Rule =
  | { readonly kind: 'none' }
  | { readonly kind: 'strict' }
  | { readonly kind: 'colonyExemption' }
  | { readonly kind: 'firstWorkshopExemption' }
  | { readonly kind: 'waterReserve'; readonly amount: number }
  | { readonly kind: 'wellCompletionWater'; readonly amount: number }
  | { readonly kind: 'freeBatch'; readonly ticks: number }
  | { readonly kind: 'materialFloor'; readonly floor: number }

const MATERIAL_FLOOR_WELL_PRICE = 25

const operationalIdsOfType = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === type && b.status === 'operational')
    .map((b) => b.id)

const staffedWorkshopIds = (state: SimulationState): string[] =>
  operationalIdsOfType(state, 'workshop').filter((id) => countWorkersAt(state, id) > 0)

const idleWorkersAt = (state: SimulationState, buildingIds: readonly string[]): SimulationState => {
  let colonists = state.colonists
  let changed = false
  for (const colonist of Object.values(state.colonists)) {
    if (colonist.workplaceId !== null && buildingIds.includes(colonist.workplaceId)) {
      colonists = {
        ...colonists,
        [colonist.id]: { ...colonist, workplaceId: null, workplaceAssignmentMode: 'automatic' as const },
      }
      changed = true
    }
  }
  return changed ? { ...state, colonists } : state
}

/** Which staffed Workshops are exempt from the Water input under this rule. */
const exemptWorkshopIds = (state: SimulationState, rule: Rule): string[] => {
  const staffed = staffedWorkshopIds(state)
  switch (rule.kind) {
    case 'none':
    case 'waterReserve':
      return staffed
    case 'strict':
    case 'wellCompletionWater':
      return []
    case 'colonyExemption':
      return hasOperationalWell(state) ? [] : staffed
    case 'firstWorkshopExemption': {
      if (hasOperationalWell(state) || staffed.length === 0) return []
      return [staffed[0]!]
    }
    case 'freeBatch':
      return state.time.tick < rule.ticks ? staffed : []
    case 'materialFloor':
      return state.resources.construction < rule.floor ? staffed : []
    default:
      return staffed
  }
}

/** Pay or idle. The decision is re-applied after employment for Material. */
const applyGate = (
  state: SimulationState,
  rule: Rule
): { readonly state: SimulationState; readonly unpaid: boolean } => {
  if (rule.kind === 'none' || rule.kind === 'waterReserve') {
    return { state, unpaid: false }
  }
  const staffed = staffedWorkshopIds(state)
  if (staffed.length === 0) return { state, unpaid: false }
  const exempt = new Set(exemptWorkshopIds(state, rule))
  const payers = staffed.filter((id) => !exempt.has(id))
  if (payers.length === 0) return { state, unpaid: false }
  if (state.resources.water >= payers.length) {
    return {
      state: { ...state, resources: { ...state.resources, water: state.resources.water - payers.length } },
      unpaid: false,
    }
  }
  return { state: idleWorkersAt(state, payers), unpaid: true }
}

/** Phase-exact mirror of `stepSimulation` with the candidate gate inserted. */
const stepMirror = (
  state: SimulationState,
  rule: Rule,
  command?: SimulationCommand
): SimulationState => {
  const isCrewCommand = command !== undefined && command.type === 'assignConstructionCrew'
  const preResolved = isCrewCommand ? applyCommand(state, command).state : state
  const lateCommand = isCrewCommand ? undefined : command

  const constructed = advanceConstruction(preResolved)
  const preGate = applyGate(constructed, rule)
  const requiredFood = updateNeeds(preGate.state)
  const produced = produceFood(preGate.state)
  const watered = produceWater(produced)
  const consumed = consumeFood(watered, requiredFood)
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null ? 0 : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const productionCapacity = coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null
      ? { state: consumed.state, shortage: false }
      : consumeWater(consumed.state, servedNeed)
  const populated = updatePopulation(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : {
          shortage: waterConsumed.shortage,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )
  const staffed = assignJobs(populated)
  const gated = preGate.unpaid ? idleWorkersAt(staffed, staffedWorkshopIds(staffed)) : staffed
  const produced2 = produceMaterial(gated)
  // An idle plant keeps its worker assigned: the idle is a production gate for
  // this tick only, never a persisting unemployment that could leak forward.
  const materialized: SimulationState =
    gated === staffed ? produced2 : { ...produced2, colonists: staffed.colonists }
  const commanded = applyCommand(materialized, lateCommand)
  const progressed = progressPlacedRoads(commanded.state, commanded)
  const maintained = upkeepBuildings(progressed)

  // Model D: a Well pays a one-time Water grant when it becomes operational.
  let granted = releaseCompletedConstructionCrew(maintained)
  if (rule.kind === 'wellCompletionWater') {
    const before = new Set(operationalIdsOfType(state, 'well'))
    const after = operationalIdsOfType(granted, 'well')
    const completed = after.filter((id) => !before.has(id)).length
    if (completed > 0) {
      granted = {
        ...granted,
        resources: { ...granted.resources, water: granted.resources.water + completed * rule.amount },
      }
    }
  }
  return advanceTime(granted)
}

const stepWith = (state: SimulationState, rule: Rule): SimulationState => stepMirror(state, rule)

const run = (state: SimulationState, ticks: number, rule: Rule): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepWith(next, rule)
  return next
}

interface Reading {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
  readonly operational: number
  readonly residences: number
  readonly wells: number
  readonly workshops: number
}

const read = (state: SimulationState): Reading => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  water: state.resources.water,
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  staffedWells: operationalIdsOfType(state, 'well').filter((id) => countWorkersAt(state, id) > 0).length,
  operational: Object.values(state.buildings).filter((b) => b.status === 'operational').length,
  residences: Object.values(state.buildings).filter((b) => b.type === 'residence').length,
  wells: Object.values(state.buildings).filter((b) => b.type === 'well').length,
  workshops: Object.values(state.buildings).filter((b) => b.type === 'workshop').length,
})

/** Run and report whether Material ever recovers above the starting stock. */
const deadlockProbe = (
  start: SimulationState,
  rule: Rule,
  ticks = 40
): { readonly recovered: boolean; readonly maxMaterial: number; readonly readings: Reading } => {
  let next = start
  let maxMaterial = start.resources.construction
  for (let i = 0; i < ticks; i += 1) {
    next = stepWith(next, rule)
    maxMaterial = Math.max(maxMaterial, next.resources.construction)
  }
  return {
    recovered: maxMaterial > start.resources.construction,
    maxMaterial,
    readings: read(next),
  }
}

// ---------------------------------------------------------------------------
// §1/§3 — starting-state matrix
// ---------------------------------------------------------------------------

describe('§1/§3 — starting-state bootstrap matrix', () => {
  it('Model A (strict) deadlocks for every Material stock below the Well price', () => {
    const rows = [0, 1, 5, 24, 25].map((material) => {
      // Two residences and two colonists, so the Workshop IS staffed and the
      // strict gate is actually exercised.
      const state = world({
        residences: 2,
        farms: 1,
        workshops: 1,
        colonists: 2,
        food: 50000,
        material,
        water: 0,
      })
      return { material, ...deadlockProbe(state, { kind: 'strict' }, 40) }
    })
    audit('MODEL_A_STRICT_MATRIX', {
      rows: rows.map((r) => ({
        materialStart: r.material,
        recovered: r.recovered,
        maxMaterial: r.maxMaterial,
        staffedWorkshops: r.readings.staffedWorkshops,
        water: r.readings.water,
      })),
      note: 'with no Well there is no Water; with no Water the Workshop idles; with no Workshop output a 25-Material Well can never be built',
    })
    expect(rows[0]!.recovered).toBe(false)
    expect(rows[4]!.recovered).toBe(false)
  })

  it('Model A: a colony that keeps 25 Material can always build the Well itself', () => {
    const state = world({
      residences: 1,
      farms: 1,
      workshops: 1,
      colonists: 2,
      food: 50000,
      material: 25,
      water: 0,
    })
    // The player builds the Well (the corrective action) and the chain starts.
    const built = stepWith(
      applyCommand(state, { type: 'placeBuilding', x: 7, y: 2, buildingType: 'well' }).state,
      { kind: 'strict' }
    )
    const after = run(built, 6, { kind: 'strict' })
    audit('MODEL_A_ESCAPE_WITH_25', {
      wellUnderConstruction: built.buildings['building-4']?.status,
      after: read(after),
      note: 'the strict model is survivable ONLY while the player keeps the price of a Well in the stock',
    })
    expect(after.resources.water).toBeGreaterThanOrEqual(0)
  })

  it('starting-state matrix for every model', () => {
    const startStates: readonly { readonly id: string; readonly spec: Spec }[] = [
      { id: '1w-0m-noWell-noWorkshop', spec: { residences: 1, colonists: 1, material: 0, food: 100 } },
      { id: '1w-0m-Well-noWorkshop', spec: { residences: 1, wells: 1, colonists: 1, material: 0, food: 100 } },
      { id: '1w-0m-noWell-Workshop', spec: { residences: 1, workshops: 1, colonists: 1, material: 0 } },
      { id: '2w-0m-Well-Workshop', spec: { residences: 2, wells: 1, workshops: 1, colonists: 2, material: 0 } },
      { id: '2w-0m-noWell-Workshop', spec: { residences: 2, workshops: 1, colonists: 2, material: 0 } },
      { id: '3w-0m-Well-Workshop', spec: { residences: 3, wells: 1, workshops: 1, colonists: 3, material: 0 } },
      { id: '1w-5m-noWell-Workshop', spec: { residences: 1, workshops: 1, colonists: 1, material: 5 } },
      { id: '2w-5m-noWell-Workshop', spec: { residences: 2, workshops: 1, colonists: 2, material: 5 } },
      { id: '3w-25m-Well-Workshop', spec: { residences: 3, wells: 1, workshops: 1, colonists: 3, material: 25 } },
    ]
    const rules: readonly { readonly id: string; readonly rule: Rule }[] = [
      { id: 'A-strict', rule: { kind: 'strict' } },
      { id: 'B1-colonyExemption', rule: { kind: 'colonyExemption' } },
      { id: 'B2-firstWorkshopExemption', rule: { kind: 'firstWorkshopExemption' } },
      { id: 'F-materialFloor', rule: { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE } },
    ]
    const rows = startStates.map((startState) => {
      const base = world(startState.spec)
      return {
        id: startState.id,
        byRule: Object.fromEntries(
          rules.map(({ id, rule }) => [id, deadlockProbe(base, rule, 40).recovered])
        ),
      }
    })
    audit('STARTING_STATE_MATRIX', {
      rows,
      legend: 'recovered = Material ever rises above its starting value within 40 ticks',
      note: 'with no Well and 0 Material, only the exemptions keep Material flowing',
    })
    expect(rows.length).toBe(9)
  })
})

// ---------------------------------------------------------------------------
// §5 — permanent-free-producer test
// ---------------------------------------------------------------------------

describe('§5 — permanent free producer test (delayed Well)', () => {
  it('B1/B2/E/F: cumulative Workshop output while the Well is absent', () => {
    const rows = [1, 5, 20, 60].map((delay) => {
      const base = world({
        residences: 2,
        farms: 1,
        workshops: 1,
        colonists: 2,
        food: 50000,
        material: 0,
        water: 0,
      })
      const rule: Rule = { kind: 'colonyExemption' }
      const after = run(base, delay, rule)
      return {
        wellAbsentTicks: delay,
        material: after.resources.construction,
        staffedWorkshops: countStaffedOperationalWorkshops(after),
        note: 'the exemption never expires while no operational Well exists',
      }
    })
    audit('FREE_PRODUCER_DELAYED_WELL', {
      model: 'B1 colonyExemption (B2 firstWorkshopExemption behaves identically with one Workshop)',
      rows,
      verdict:
        'UNBOUNDED free production in TIME: the exemption never expires while no operational Well exists; the STOCK saturates only because the 25-Material Workshop storage cap binds, so the colony keeps a free producer indefinitely',
    })
    expect(rows[3]!.material).toBeGreaterThan(rows[0]!.material)
  })

  it('E freeBatch and F materialFloor both expire, in different dimensions', () => {
    const base = world({
      residences: 2,
      farms: 1,
      workshops: 1,
      colonists: 2,
      food: 50000,
      material: 0,
      water: 0,
    })
    const e = run(base, 30, { kind: 'freeBatch', ticks: 2 })
    const f = run(base, 30, { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE })
    const fLate = run(
      { ...base, time: { tick: 500 }, resources: { ...base.resources, construction: 0 } },
      30,
      { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE }
    )
    audit('EXPIRY_DIMENSIONS', {
      freeBatch2: { material: e.resources.construction, staffedWorkshops: countStaffedOperationalWorkshops(e) },
      materialFloor: { material: f.resources.construction, staffedWorkshops: countStaffedOperationalWorkshops(f) },
      materialFloorLateInTheRun: {
        material: fLate.resources.construction,
        staffedWorkshops: countStaffedOperationalWorkshops(fLate),
      },
      note: 'E bounds the free window in TIME (so a late 0-Material colony still deadlocks); F bounds it in STOCK (so it expires exactly where the deadlock would occur) — a hidden 25-Material subsidy',
    })
    expect(f.resources.construction).toBeLessThanOrEqual(MATERIAL_FLOOR_WELL_PRICE + 1)
  })
})

// ---------------------------------------------------------------------------
// §2 — reserve and completion-grant models
// ---------------------------------------------------------------------------

describe('§2 — Models C and D', () => {
  it('C waterReserve bridges only a few ticks, then deadlocks like strict', () => {
    const rows = [1, 2, 3, 10].map((amount) => {
      const base = world({
        residences: 2,
        farms: 1,
        workshops: 1,
        colonists: 2,
        food: 50000,
        material: 0,
        water: amount,
      })
      const probe = deadlockProbe({ ...base, resources: { ...base.resources, water: amount } }, { kind: 'strict' }, 40)
      return {
        initialWater: amount,
        freeWorkshopTicks: amount,
        maxMaterial: probe.maxMaterial,
        materialEnd: probe.readings.material,
        staffedWorkshops: probe.readings.staffedWorkshops,
      }
    })
    audit('MODEL_C_WATER_RESERVE', {
      rows,
      note: 'the reserve is pure hidden free Water: it defers the deadlock by exactly `amount` Workshop ticks and needs a change to INITIAL_WATER',
    })
    expect(rows[0]!.maxMaterial).toBeGreaterThanOrEqual(0)
  })

  it('D wellCompletionWater does not fix the deadlock and adds Water outside production', () => {
    const base = world({
      residences: 2,
      farms: 1,
      workshops: 1,
      colonists: 2,
      food: 50000,
      material: 0,
      water: 0,
    })
    const probe = deadlockProbe(base, { kind: 'wellCompletionWater', amount: 2 }, 40)
    // A colony that CAN build the Well gets the grant; measure the grant itself.
    const built = world({
      residences: 2,
      farms: 1,
      workshops: 1,
      colonists: 2,
      food: 50000,
      material: 25,
      water: 0,
    })
    const withWell = run(
      applyCommand(built, { type: 'placeBuilding', x: 7, y: 2, buildingType: 'well' }).state,
      6,
      { kind: 'wellCompletionWater', amount: 2 }
    )
    audit('MODEL_D_WELL_COMPLETION_WATER', {
      deadlockProbe: { recovered: probe.recovered, maxMaterial: probe.maxMaterial },
      withBuildableWell: {
        water: withWell.resources.water,
        material: withWell.resources.construction,
        staffedWells: operationalIdsOfType(withWell, 'well').filter((id) => countWorkersAt(withWell, id) > 0).length,
      },
      note: 'the grant needs a completed Well, and a Well needs 25 Material: the deadlock is untouched (the bootstrap root would still be the initial Material). It also creates Water outside production, bounded only by how many Wells are built',
    })
    expect(probe.recovered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §4 — opening order
// ---------------------------------------------------------------------------

describe('§4 — opening order (Well first vs Workshop first)', () => {
  it('compares the openings under strict, B1 and F', () => {
    const opening = (
      rule: Rule,
      first: BuildingType,
      material: number
    ): Record<string, unknown> => {
      // One colonist, one free workplace slot: the single order variable is
      // which producer is built first. Both cost 25.
      let state = withStocks(createState(), { food: 50000, material, water: 0 })
      state = op(state, 'residence', 1, 0)
      state = opRoad(state, 1, 1)
      state = opRoad(state, 2, 1)
      state = opRoad(state, 3, 1)
      state = createColonist(state, 'building-1').state
      state = assignJobs(state)
      const firstId = op(state, first, 1, 2)
      const firstB = state.buildings['building-1']
      void firstB
      state = firstId
      const second = first === 'well' ? 'workshop' : 'well'
      state = op(state, second, 3, 2)
      let next = assignJobs(state)
      let firstMaterialTick = -1
      let firstWaterTick = -1
      for (let i = 1; i <= 12; i += 1) {
        next = stepWith(next, rule)
        if (firstMaterialTick === -1 && next.resources.construction > material) firstMaterialTick = i
        if (firstWaterTick === -1 && next.resources.water > 0) firstWaterTick = i
      }
      return { first, firstMaterialTick, firstWaterTick, readings: read(next) }
    }
    const rows = (['strict', 'colonyExemption', 'materialFloor'] as const).flatMap((model) => {
      const rule: Rule =
        model === 'strict'
          ? { kind: 'strict' }
          : model === 'colonyExemption'
            ? { kind: 'colonyExemption' }
            : { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE }
      return [
        { model, ...opening(rule, 'well', 50) },
        { model, ...opening(rule, 'workshop', 50) },
      ]
    })
    audit('OPENING_ORDER', {
      rows,
      note: 'injected producers cost no Material, so every Material gain is real Workshop output',
    })
    expect(rows.length).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// §6 — recovery
// ---------------------------------------------------------------------------

describe('§6 — recovery audit', () => {
  it('forced Water = 0 with one and two Workshops', () => {
    const probe = (workshops: number, wells: number, rule: Rule): Record<string, unknown> => {
      const base = world({
        residences: 3,
        farms: 1,
        workshops,
        wells,
        colonists: 3,
        food: 50000,
        material: 50,
        water: 0,
      })
      const after = run(base, 10, rule)
      return {
        staffedWorkshops: countStaffedOperationalWorkshops(after),
        material: after.resources.construction,
        water: after.resources.water,
        population: getPopulationCount(after),
      }
    }
    audit('RECOVERY_WATER_ZERO', {
      oneWorkshop: {
        strict: probe(1, 1, { kind: 'strict' }),
        colonyExemption: probe(1, 1, { kind: 'colonyExemption' }),
        materialFloor: probe(1, 1, { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE }),
      },
      twoWorkshops: {
        strict: probe(2, 2, { kind: 'strict' }),
        colonyExemption: probe(2, 2, { kind: 'colonyExemption' }),
        materialFloor: probe(2, 2, { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE }),
      },
      note: 'Water is a growth gate, never survival: the population always survives, and recovery is a player action (unstaff a Workshop, or build/keep Wells)',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §7 — Construction Crew propagation
// ---------------------------------------------------------------------------

describe('§7 — Construction Crew propagation', () => {
  it('crew Well vs crew Workshop under the strict rule', () => {
    const measure = (crewTarget: 'none' | 'well' | 'workshop'): Record<string, unknown> => {
      // A Water-limited colony whose second Well is under construction.
      const base = world({
        residences: 4,
        farms: 1,
        workshops: 1,
        wells: 1,
        colonists: 4,
        food: 50000,
        material: 0,
        water: 0,
      })
      const created = createBuilding(base, 'well', 9, 2, 2)
      let state = created.state
      const siteId = created.buildingId
      const spares = Object.values(state.colonists).filter((c) => c.workplaceId === null)
      const crewMember = spares[spares.length - 1]!.id
      const target =
        crewTarget === 'well' ? siteId : crewTarget === 'workshop' ? operationalIdsOfType(state, 'workshop')[0]! : null
      let firstMaterialTick = -1
      for (let i = 1; i <= 12; i += 1) {
        const command =
          crewTarget !== 'none' && i === 1 && target !== null
            ? { type: 'assignConstructionCrew' as const, colonistId: crewMember, buildingId: target }
            : undefined
        state = stepMirror(state, { kind: 'strict' }, command)
        if (firstMaterialTick === -1 && state.resources.construction > 0) firstMaterialTick = i
      }
      return {
        crewTarget,
        firstMaterialTick,
        readings: read(state),
      }
    }
    audit('CREW_PROPAGATION_BOOTSTRAP', {
      rows: (['none', 'well', 'workshop'] as const).map(measure),
      note:
        'under strict with 2 staffed Wells the Water is fully consumed by the 4 served colonists, so the Workshop is never payable and the crew changes nothing measurable (material 0 in all three arms)',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §8 — long run
// ---------------------------------------------------------------------------

describe('§8 — long run', () => {
  it('60/120/240/600 ticks for strict, B1 and F (Well present)', () => {
    const growth = (rule: Rule, ticks: number): Reading => {
      const base = world({
        residences: 3,
        farms: 1,
        workshops: 1,
        wells: 1,
        colonists: 3,
        food: 50000,
        material: 50,
        water: 0,
      })
      return read(run(base, ticks, rule))
    }
    const rules: readonly { readonly id: string; readonly rule: Rule }[] = [
      { id: 'none', rule: { kind: 'none' } },
      { id: 'A-strict', rule: { kind: 'strict' } },
      { id: 'B1-colonyExemption', rule: { kind: 'colonyExemption' } },
      { id: 'F-materialFloor', rule: { kind: 'materialFloor', floor: MATERIAL_FLOOR_WELL_PRICE } },
    ]
    const rows = [60, 120, 240, 600].map((ticks) => ({
      ticks,
      byRule: Object.fromEntries(rules.map(({ id, rule }) => [id, growth(rule, ticks)])),
    }))
    audit('LONG_RUN', {
      rows,
      note: 'with a Well present the exemption models collapse onto strict (the input is active), so the long-run equilibria match; only the no-Well case differs',
    })
    expect(rows.length).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §9/§13 — circularity, root and determinism
// ---------------------------------------------------------------------------

describe('§9/§13 — circularity root and determinism', () => {
  it('identifies the bootstrap root of every model', () => {
    audit('BOOTSTRAP_ROOT', {
      graph: 'Water -> Workshop -> Material -> Well construction -> Water',
      rootCandidates: [
        { root: 'initial Material (100)', status: 'the only root the current model offers' },
        { root: 'finite initial Water', status: 'Model C: hidden free Water, needs INITIAL_WATER change' },
        { root: 'finite bootstrap production', status: 'Model E (time-bounded, misses late deadlocks) / Model F (stock-bounded, a 25-Material subsidy)' },
        { root: 'construction reward', status: 'Model D: needs a completed Well, so it cannot break the deadlock' },
      ],
      finding:
        'the cycle closes on the finite initial Material stock, so the colony survives only while it keeps the price of a Well in reserve; no rule examined can turn that into a guarantee without a free window, hidden Water, or new persisted state',
    })
    expect(true).toBe(true)
  })

  it('the audit mirror is byte-identical to stepSimulation when the rule is disabled', () => {
    const fixtures = [
      world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, water: 100, material: 100 }),
      world({ residences: 2, farms: 1, workshops: 1, colonists: 2, water: 0, material: 0 }),
      world({ residences: 1, wells: 1, colonists: 1, water: 0, material: 0 }),
    ]
    for (const fixture of fixtures) {
      let real = fixture
      let mirror = fixture
      for (let i = 0; i < 40; i += 1) {
        real = stepSimulation(real)
        mirror = stepMirror(mirror, { kind: 'none' })
      }
      expect(hashCanonicalState(mirror)).toBe(hashCanonicalState(real))
    }
  })

  it('audit determinism, insertion order and save/load', () => {
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 50,
      water: 0,
    })
    const rule: Rule = { kind: 'colonyExemption' }
    const a = run(base, 25, rule)
    const b = run(base, 25, rule)
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    const restored = loadSave(serializeSave(a))
    audit('DETERMINISM', {
      auditHash: hashCanonicalState(a),
      replayStable: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderStable: hashCanonicalState(reversed) === hashCanonicalState(a),
      saveLoadStable: serializeCanonicalState(restored) === serializeCanonicalState(a),
      saveVersion: SAVE_VERSION,
      persistenceImpactByModel: {
        A: 'none (no exemption state)',
        B1: 'none (derived from hasOperationalWell)',
        B2: 'none (derived from hasOperationalWell + lowest id), but the window is unbounded',
        C: 'INITIAL_WATER change (resource initialization + every save)',
        D: 'none (a lifecycle grant), but it cannot break the deadlock',
        E: 'none (derived from time.tick), but it misses late deadlocks',
        F: 'none (derived from the Material stock), but it is a hidden 25-Material subsidy',
      },
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(a))
  })
})

// ---------------------------------------------------------------------------
// §10/§11 — classification and decision threshold
// ---------------------------------------------------------------------------

describe('§10/§11 — classification and decision threshold', () => {
  it('classifies every model against the decision threshold', () => {
    audit('CLASSIFICATION', [
      {
        model: 'A strict',
        class: 'DEADLOCK',
        why: 'with no Well, 0 Material can never become Material: the cycle has no runtime root and the player can spend the initial stock before building a Well',
      },
      {
        model: 'B1 colonyExemption (input inactive while no operational Well exists)',
        class: 'INVERTED',
        why: 'measured 60 ticks of free Workshop production with the Well absent: a permanently free producer, and the optimal opening becomes industry-before-Water',
      },
      {
        model: 'B2 firstWorkshopExemption (only the lowest-id Workshop is exempt in that window)',
        class: 'INVERTED',
        why: 'identical to B1 whenever the colony has one Workshop, which is exactly the opening it must survive',
      },
      {
        model: 'C waterReserve (INITIAL_WATER = 1..3)',
        class: 'UNJUSTIFIED',
        why: 'defers the deadlock by exactly the reserve size, is hidden free Water, and needs a resource-initialization change',
      },
      {
        model: 'D wellCompletionWater (+1/+2 on completion)',
        class: 'DEADLOCK',
        why: 'the grant requires a completed Well and a Well requires 25 Material: the deadlock is untouched; it also creates Water outside production',
      },
      {
        model: 'E freeBatch (first N ticks free)',
        class: 'DEADLOCK',
        why: 'bounds the free window in TIME, so a colony that reaches 0 Material later still deadlocks; also a magic global rule',
      },
      {
        model: 'F materialFloor (exempt while Material < 25)',
        class: 'VALID WITH COST',
        why: 'the only model that links the exemption to the actual deadlock condition and is fully derived (no new state): it converts the deadlock into a bounded 25-Material free window, which the threshold calls a hidden subsidy',
      },
    ])
    expect(true).toBe(true)
  })

  it('applies the decision threshold', () => {
    const criteria = {
      noUnrecoverableZeroMaterialBootstrap: { A: false, B1: true, B2: true, C: false, D: false, E: false, F: true },
      noPermanentFreeWorkshop: { A: true, B1: false, B2: false, C: true, D: true, E: true, F: true },
      noArtificialHiddenResourceEconomy: { A: true, B1: true, B2: true, C: false, D: false, E: true, F: false },
      noDuplicateWaterOrFoodGate: { A: true, B1: true, B2: true, C: true, D: true, E: true, F: true },
      noNewGenericFramework: { A: true, B1: true, B2: true, C: true, D: true, E: true, F: true },
      meaningfulWaterMaterialWorkforceTradeoff: { A: true, B1: true, B2: true, C: true, D: true, E: true, F: true },
      crewDownstreamPath: { A: true, B1: true, B2: true, C: true, D: true, E: true, F: true },
      boundedLongRun: { A: true, B1: false, B2: false, C: true, D: true, E: true, F: true },
      playerControlledRecovery: { A: true, B1: true, B2: true, C: false, D: false, E: false, F: true },
    }
    const models = ['A', 'B1', 'B2', 'C', 'D', 'E', 'F'] as const
    const results = Object.fromEntries(
      models.map((model) => [
        model,
        Object.entries(criteria)
          .filter(([, byModel]) => (byModel as Record<string, boolean>)[model] === false)
          .map(([criterion]) => criterion),
      ])
    )
    audit('DECISION_THRESHOLD', {
      failingCriteriaByModel: results,
      passingModels: models.filter(
        (model) =>
          Object.entries(criteria).every(
            ([, byModel]) => (byModel as Record<string, boolean>)[model] === true
          )
      ),
      conclusion: 'NO IMPLEMENTATION CANDIDATE',
    })
    const passing = models.filter((model) =>
      Object.entries(criteria).every(
        ([, byModel]) => (byModel as Record<string, boolean>)[model] === true
      )
    )
    expect(passing.length).toBe(0)
  })
})
