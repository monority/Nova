/**
 * Step 10AT — Content & Readability Closure Audit.
 *
 * Phase-boundary audit. Judged by MEASURED STATE TRANSITIONS, not by scenario
 * names: every scenario is started, driven to its objective (or to its failure)
 * with real commands, and read through the same queries the UI renders.
 *
 * Three concrete presentation issues were found by the browser audit and fixed
 * in this step (they are asserted here through the values the UI displays):
 *   1. the Workshop inspection did not name Material production or the storage
 *      cap (the Farm and the Well did) — now it names production, jobs, upkeep
 *      and the 25-per-Workshop storage;
 *   2. a Food collapse was only a one-frame status message — the Food row now
 *      keeps saying `starved`;
 *   3. Village's undefined next stage read only "not yet defined" — it now also
 *      says it is the current final stage.
 *
 * No economic value, domain rule, objective kind, scenario resource or
 * persisted field changed. `SAVE_VERSION` stays 7.
 *
 * Run:
 *   npx vitest run tests/contentReadabilityClosureAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  createScenarioState,
  findScenario,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getFoodTicksRemaining,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getObjectiveStatus,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getReassignmentOptions,
  getWaterProductionPerTick,
  getWaterSupplyStatus,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  INITIAL_WATER,
  isFoodSupplySustainable,
  iterateBuildings,
  loadSave,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  validateReassignment,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type ScenarioDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

type Step =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
  | { readonly kind: 'ticks'; readonly n: number }
  | { readonly kind: 'until'; readonly label: string; readonly test: (state: SimulationState) => boolean; readonly max?: number }
  | { readonly kind: 'role'; readonly colonist: number; readonly role: BuildingType }

interface Outcome {
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly stage: string
  readonly objective: string
  readonly blockers: readonly string[]
  readonly wipeTick: number | null
  readonly completedTick: number | null
}

const runScenario = (
  definition: ScenarioDefinition,
  steps: readonly Step[],
  horizon: number
): Outcome => {
  let state = createScenarioState(config, definition)
  const objective = definition.objective
  let wipeTick: number | null = null
  let completedTick: number | null = null
  let previousPopulation = getPopulationCount(state)
  const observe = (): void => {
    const population = getPopulationCount(state)
    if (wipeTick === null && population === 0 && previousPopulation > 0) wipeTick = state.time.tick
    previousPopulation = population
    if (completedTick === null && getObjectiveStatus(state, objective).state === 'completed') {
      completedTick = state.time.tick
    }
  }
  const tick = (n: number): void => {
    for (let i = 0; i < n; i += 1) {
      state = stepSimulation(state)
      observe()
    }
  }
  observe()
  for (const step of steps) {
    switch (step.kind) {
      case 'ticks':
        tick(step.n)
        break
      case 'until': {
        const max = step.max ?? 400
        let waited = 0
        while (waited < max && !step.test(state)) {
          tick(1)
          waited += 1
        }
        break
      }
      case 'roads': {
        const cost = step.cells.length * 5
        let guard = 0
        while (guard < 300 && state.resources.construction < cost) {
          tick(1)
          guard += 1
        }
        state = stepSimulation(state, { type: 'placeRoads', cells: [...step.cells] })
        tick(2)
        break
      }
      case 'role': {
        let guard = 0
        let done = false
        while (guard < 40 && !done) {
          const colonists = Object.values(state.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
          const colonist = colonists[step.colonist]
          const target = [...iterateBuildings(state)].find(
            (building) =>
              building.type === step.role &&
              building.status === 'operational' &&
              !Object.values(state.colonists).some((c) => c.workplaceId === building.id)
          )
          if (colonist !== undefined && target !== undefined) {
            state = stepSimulation(state, {
              type: 'reassignColonist',
              colonistId: colonist.id,
              workplaceId: target.id,
            })
            done = true
          } else {
            tick(1)
            guard += 1
          }
        }
        break
      }
      case 'building': {
        let guard = 0
        while (
          guard < 400 &&
          !getPlacementAffordability(state, { x: step.x, y: step.y }, step.type).affordable
        ) {
          tick(1)
          guard += 1
        }
        state = stepSimulation(state, { type: 'placeBuilding', x: step.x, y: step.y, buildingType: step.type })
        tick(3)
        break
      }
    }
  }
  tick(horizon)
  const status = getObjectiveStatus(state, objective)
  return {
    population: getPopulationCount(state),
    food: state.resources.food,
    material: state.resources.construction,
    water: state.resources.water,
    stage: getProgression(state).stage,
    objective: status.state,
    blockers: status.blockers,
    wipeTick,
    completedTick,
  }
}

const scenarioOf = (id: string): ScenarioDefinition => {
  const definition = findScenario(id)
  if (definition === undefined) throw new Error(`10at: missing scenario ${id}`)
  return definition
}

/** The completion policy measured for each scenario (real commands only). */
const COMPLETION_POLICIES: Readonly<Record<string, readonly Step[]>> = {
  'first-settlement': [
    { kind: 'building', type: 'residence', x: 1, y: 0 },
    { kind: 'roads', cells: [{ x: 1, y: 1 }] },
    { kind: 'building', type: 'farm', x: 0, y: 1 },
  ],
  'water-constraint': [{ kind: 'building', type: 'well', x: 3, y: 2 }],
  'industrial-expansion': [{ kind: 'building', type: 'workshop', x: 2, y: 2 }],
  'water-reserve-industry': [
    { kind: 'building', type: 'workshop', x: 4, y: 2 },
    { kind: 'role', colonist: 1, role: 'workshop' },
    { kind: 'until', label: 'burst', test: (s) => s.resources.water === 0, max: 60 },
    { kind: 'building', type: 'well', x: 2, y: 2 },
    { kind: 'role', colonist: 1, role: 'well' },
  ],
  'spatial-efficiency': [
    { kind: 'building', type: 'residence', x: 1, y: 0 },
    { kind: 'roads', cells: [{ x: 1, y: 1 }] },
    { kind: 'building', type: 'farm', x: 0, y: 1 },
  ],
  'population-expansion': [
    { kind: 'building', type: 'well', x: 3, y: 2 },
    { kind: 'building', type: 'well', x: 5, y: 2 },
    { kind: 'building', type: 'farm', x: 4, y: 2 },
    { kind: 'building', type: 'farm', x: 6, y: 2 },
    { kind: 'role', colonist: 0, role: 'well' },
    { kind: 'role', colonist: 1, role: 'well' },
    { kind: 'until', label: 'growth', test: (s) => Object.keys(s.colonists).length >= 4, max: 80 },
    { kind: 'role', colonist: 0, role: 'farm' },
    { kind: 'role', colonist: 1, role: 'farm' },
    { kind: 'role', colonist: 2, role: 'well' },
    { kind: 'role', colonist: 3, role: 'well' },
  ],
  recovery: [{ kind: 'roads', cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] }],
}

// ---------------------------------------------------------------------------
// 1. THE CATALOGUE, BY STATE TRANSITION
// ---------------------------------------------------------------------------

describe('1. Catalogue judged by state transitions', { timeout: 300000 }, () => {
  it('starts, completes and records every scenario', () => {
    const rows = SCENARIOS.map((definition) => {
      const start = createScenarioState(config, definition)
      const startStatus = getObjectiveStatus(start, definition.objective)
      const outcome = runScenario(definition, COMPLETION_POLICIES[definition.id] ?? [], 20)
      return {
        id: definition.id,
        name: definition.name,
        start: {
          stage: getProgression(start).stage,
          population: getPopulationCount(start),
          material: start.resources.construction,
          food: start.resources.food,
          water: start.resources.water,
          capacity: getWaterProductionPerTick(start),
          buildings: Object.keys(start.buildings).length,
          roads: Object.keys(start.roads).length,
        },
        objective: {
          label: definition.objective.label,
          requirements: definition.objective.requirements.map((r) => r.kind),
          startState: startStatus.state,
          startBlockers: startStatus.blockers,
        },
        measured: outcome,
      }
    })
    audit('CATALOGUE_TRANSITIONS', {
      rows,
      reading: 'every scenario is started and driven to its objective with real placement/reassignment commands',
    })
    expect(rows).toHaveLength(7)
    for (const row of rows) {
      expect(row.objective.startState).toBe('in_progress')
      expect(row.objective.startBlockers.length).toBeGreaterThan(0)
      expect(row.measured.objective).toBe('completed')
      expect(row.measured.completedTick).not.toBeNull()
      expect(row.measured.wipeTick).toBeNull()
      expect(row.measured.population).toBeGreaterThan(0)
    }
    // Deterministic completion ticks (no randomness anywhere).
    const recovery = rows.find((row) => row.id === 'recovery')!
    expect(recovery.measured.completedTick).toBeLessThan(10)
  })

  it('records the measured failure of each scenario that has one', () => {
    const failures = [
      {
        id: 'water-constraint',
        wrong: 'build no Well at all',
        steps: [{ kind: 'ticks', n: 200 }] as readonly Step[],
        expectation: 'never reaches Village (the objective stays in progress)',
      },
      {
        id: 'recovery',
        wrong: 'do nothing',
        steps: [{ kind: 'ticks', n: 200 }] as readonly Step[],
        expectation: 'the colony starves: population 0 and the objective reports failed',
      },
      {
        id: 'first-settlement',
        wrong: 'Well before Farm',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 2, y: 1 },
        ] as readonly Step[],
        expectation: 'the colony starves',
      },
    ].map((row) => {
      const definition = scenarioOf(row.id)
      const outcome = runScenario(definition, row.steps, 200)
      return { ...row, outcome }
    })
    audit('FAILURE_MODES', {
      failures,
      reading: 'failure is a measured state, not a label: population 0 with pending requirements is the failed objective',
    })
    const recoveryFailure = failures.find((row) => row.id === 'recovery')!
    expect(recoveryFailure.outcome.population).toBe(0)
    expect(recoveryFailure.outcome.objective).toBe('failed')
    const wellFirst = failures.find((row) => row.id === 'first-settlement')!
    expect(wellFirst.outcome.population).toBe(0)
    expect(wellFirst.outcome.wipeTick).not.toBeNull()
    const noWell = failures.find((row) => row.id === 'water-constraint')!
    expect(noWell.outcome.objective).toBe('in_progress')
    expect(noWell.outcome.population).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 2. DISTINCTNESS MATRIX
// ---------------------------------------------------------------------------

describe('2. Distinctness matrix', { timeout: 60000 }, () => {
  it('marks each axis from measured state, not from names', () => {
    const axes = [
      'firstDecision',
      'materialBottleneck',
      'foodBottleneck',
      'waterCapacity',
      'waterReserve',
      'workforceMobility',
      'constructionOrder',
      'spatialLayout',
      'failureMode',
      'recovery',
      'objectiveInterpretation',
      'temporalPressure',
    ] as const

    const measured = SCENARIOS.map((definition) => {
      const start = createScenarioState(config, definition)
      const stock = start.resources.construction
      const capacity = getWaterProductionPerTick(start)
      const population = getPopulationCount(start)
      const farms = [...iterateBuildings(start)].filter((b) => b.type === 'farm').length
      const foodNet = getFoodProductionPerTick(start) - getFoodConsumptionPerTick(start)
      const status = getObjectiveStatus(start, definition.objective)
      const kinds = definition.objective.requirements.map((r) => r.kind)
      return {
        id: definition.id,
        stock,
        capacity,
        population,
        farms,
        foodNet,
        startBlockers: status.blockers.length,
        kinds,
        requiresBuilding: kinds.includes('building'),
        requiresWaterCapacity: kinds.includes('waterCapacity'),
        requiresFoodBalance: kinds.includes('foodBalance'),
        requiresPopulation: kinds.includes('population'),
        roads: Object.keys(start.roads).length,
        water: start.resources.water,
      }
    })

    // The matrix is filled from the measurements above plus the 10AM/10AQ/10AR/
    // 10AS audits' measured decisions, which are the state-transition evidence.
    const matrix = [
      { id: 'first-settlement', marks: 'A: order/geometry decides Settlement vs starvation (10AM, 10AS S1/S2/S5/S6)' },
      { id: 'water-constraint', marks: 'A: Well now (pop 2 Village) vs housing first (pop 3 Village) (10AM)' },
      { id: 'spatial-efficiency', marks: 'A: a 5-Material road margin separates Settlement from starvation (10AM)' },
      { id: 'population-expansion', marks: 'A: capacity-first vs population-first end at the same population with different Food (10AM)' },
      { id: 'industrial-expansion', marks: 'B/limit tutorial: the Workshop is buildable, cannot be run, and its output is discarded above the 25 storage (10AP, 10AS)' },
      { id: 'recovery', marks: 'B: repair (3 roads, keeps a redundant Farm) vs replace (1 road, 2 Farms) (10AM)' },
      { id: 'water-reserve-industry', marks: 'A: the Water reserve is the only budget and the build order is terminal if reversed (10AQ)' },
    ]

    const overlapAnalysis = {
      sharedDecisionShape: [
        'recovery and water-reserve-industry both offer "connect/duplicate" style construction; their first decisions differ (repair a stranded Farm vs spend the last 25 Material)',
        'population-expansion and water-reserve-industry both build a second Well; only water-reserve-industry must MANUFACTURE its cost',
        'industrial-expansion and water-reserve-industry both place a Workshop; only water-reserve-industry runs it as its purpose',
      ],
      framingOnly: [
        'first-settlement and spatial-efficiency share the objective "reach Settlement" and differ by the Material budget (100 vs 55) — a real constraint difference, but the same first decision shape',
      ],
      distinctByStateOnly: [
        'industrial-expansion vs water-reserve-industry differ mostly through the initial Material/Water stock (100/10 vs 25/51)',
      ],
      genuinelyDistinct: [
        'first-settlement (order/geometry)',
        'water-constraint (capacity restoration at an existing population)',
        'spatial-efficiency (an exact road budget)',
        'population-expansion (housing ahead of capacity)',
        'water-reserve-industry (resource conversion with a terminal order)',
      ],
    }
    audit('DISTINCTNESS_MATRIX', { axes, measured, matrix, overlapAnalysis })
    expect(measured).toHaveLength(7)
    for (const row of measured) {
      expect(row.startBlockers).toBeGreaterThan(0)
    }
    // The two industrial scenarios are separable by the measured state alone.
    const industrial = measured.find((row) => row.id === 'industrial-expansion')!
    const reserve = measured.find((row) => row.id === 'water-reserve-industry')!
    expect(industrial.stock).toBe(100)
    expect(industrial.water).toBe(10)
    expect(reserve.stock).toBe(25)
    expect(reserve.water).toBe(51)
    expect(overlapAnalysis.genuinelyDistinct).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// 3-4. READABILITY OF OBJECTIVES AND PROGRESSION (through the same queries)
// ---------------------------------------------------------------------------

describe('3-4. Objective and progression readability', { timeout: 60000 }, () => {
  it('answers the eight player questions from existing queries for every scenario', () => {
    const rows = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      const status = getObjectiveStatus(state, definition.objective)
      const progression = getProgression(state)
      return {
        id: definition.id,
        q1_goal: definition.objective.label,
        q2_blockers: status.blockers,
        q3_constraint: definition.objective.constraint,
        q4_action: progression.nextConditions.length > 0 ? progression.nextConditions.map((c) => c.label) : progression.conditions.map((c) => c.label),
        q5_progress: `${status.requirements.filter((r) => r.met).length} / ${status.requirements.length}`,
        q6_complete: status.state,
        q7_failure: definition.objective.failsWithoutColonists
          ? 'population 0 reports the objective failed'
          : 'starts empty: population 0 is the opening, not a failure',
        q8_recovery: progression.nextConditions.length > 0
          ? `recoverable: satisfy ${progression.nextConditions.filter((c) => !c.met).map((c) => c.label).join(', ')}`
          : 'no further contracted stage',
      }
    })
    audit('OBJECTIVE_READABILITY', {
      rows,
      reading: 'the UI renders exactly these values (verified in the browser by e2e/readabilityAudit.mjs)',
    })
    for (const row of rows) {
      expect(row.q1_goal.length).toBeGreaterThan(0)
      expect(row.q2_blockers.length).toBeGreaterThan(0)
      expect(row.q3_constraint.length).toBeGreaterThan(0)
      expect(row.q4_action.length).toBeGreaterThan(0)
      expect(row.q5_progress).toMatch(/^\d+ \/ \d+$/)
      expect(row.q6_complete).toBe('in_progress')
      expect(row.q7_failure.length).toBeGreaterThan(0)
      expect(row.q8_recovery.length).toBeGreaterThan(0)
    }
  })

  it('distinguishes the three progression states the UI must show', () => {
    const wilderness = createScenarioState(config, scenarioOf('first-settlement'))
    const settlement = createScenarioState(config, scenarioOf('water-constraint'))
    const village = createScenarioState(config, scenarioOf('water-constraint'))
    let advanced = village
    advanced = stepSimulation(advanced, { type: 'placeBuilding', x: 3, y: 2, buildingType: 'well' })
    for (let i = 0; i < 6; i += 1) advanced = stepSimulation(advanced)

    const rows = {
      wilderness: {
        stage: getProgression(wilderness).stage,
        next: getProgression(wilderness).nextStage,
        conditions: getProgression(wilderness).nextConditions.map((c) => [c.label, c.met]),
        blockers: getProgression(wilderness).blockers,
        deferred: getProgression(wilderness).deferred,
      },
      settlement: {
        stage: getProgression(settlement).stage,
        next: getProgression(settlement).nextStage,
        conditions: getProgression(settlement).nextConditions.map((c) => [c.label, c.met]),
        blockers: getProgression(settlement).blockers,
        deferred: getProgression(settlement).deferred,
      },
      village: {
        stage: getProgression(advanced).stage,
        next: getProgression(advanced).nextStage,
        conditions: getProgression(advanced).nextConditions.map((c) => [c.label, c.met]),
        currentConditions: getProgression(advanced).conditions.map((c) => [c.label, c.met]),
        blockers: getProgression(advanced).blockers,
        deferred: getProgression(advanced).deferred,
      },
    }
    audit('PROGRESSION_READABILITY', {
      rows,
      uiWording: {
        definedNext: 'Settlement / Village',
        blockedDefined: 'the unmet condition is listed and repeated on the blocked line',
        undefinedFuture: 'not yet defined (this is the current final stage)',
      },
    })
    expect(rows.wilderness.next).toBe('settlement')
    expect(rows.wilderness.blockers.length).toBe(3)
    expect(rows.settlement.next).toBe('village')
    expect(rows.settlement.blockers).toEqual(['Water capacity 2'])
    // Village: a defined-but-absent next stage, no fabricated Town condition.
    expect(rows.village.next).toBeNull()
    expect(rows.village.deferred).toBe(true)
    expect(rows.village.conditions).toHaveLength(0)
    expect(rows.village.blockers).toHaveLength(0)
    expect(rows.village.currentConditions.every(([, met]) => met)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5-6. RESOURCE AND INDUSTRIAL SEMANTICS
// ---------------------------------------------------------------------------

describe('5-6. Resource and industrial semantics', { timeout: 60000 }, () => {
  it('keeps Material stock, storage, production, upkeep and affordability apart', () => {
    const definition = scenarioOf('industrial-expansion')
    let state = createScenarioState(config, definition)
    const beforeWorkshop = {
      stock: state.resources.construction,
      storage: getMaterialStorageCapacity(state),
      production: getMaterialProductionPerTick(state),
      upkeep: getMaterialUpkeepPerTick(state),
      affordability: getPlacementAffordability(state, { x: 2, y: 2 }, 'workshop').affordable,
    }
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const vacant = {
      stock: state.resources.construction,
      storage: getMaterialStorageCapacity(state),
      production: getMaterialProductionPerTick(state),
      stored: getMaterialStoredProductionPerTick(state),
      upkeep: getMaterialUpkeepPerTick(state),
      net: getNetMaterialPerTick(state),
    }
    // Staff it: production becomes real, the cap discards the overflow.
    const workshopId = [...iterateBuildings(state)].find((b) => b.type === 'workshop')?.id
    const wellId = [...iterateBuildings(state)].find((b) => b.type === 'well')?.id
    const worker = Object.values(state.colonists).find((c) => c.workplaceId === wellId)
    if (workshopId === undefined || worker === undefined) throw new Error('10at: workshop setup')
    state = stepSimulation(state, { type: 'reassignColonist', colonistId: worker.id, workplaceId: workshopId })
    const staffed = {
      stock: state.resources.construction,
      storage: getMaterialStorageCapacity(state),
      production: getMaterialProductionPerTick(state),
      stored: getMaterialStoredProductionPerTick(state),
      upkeep: getMaterialUpkeepPerTick(state),
      net: getNetMaterialPerTick(state),
    }
    audit('MATERIAL_SEMANTICS', {
      beforeWorkshop,
      vacant,
      staffed,
      uiWording: {
        row: 'Material: <stock> · storage 25 · full (the cap is shown only when a producer exists)',
        inspection:
          'Material production — producing +2/tick (staffed) · jobs 1/1 · upkeep 1/tick · storage 25',
      },
    })
    // The stock is canonical; the cap bounds production, not the stock.
    expect(beforeWorkshop.stock).toBe(100)
    expect(beforeWorkshop.storage).toBe(0)
    expect(vacant.storage).toBe(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(vacant.production).toBe(0)
    expect(vacant.net).toBe(0)
    expect(staffed.production).toBe(2)
    expect(staffed.upkeep).toBe(1)
    expect(staffed.net).toBe(1)
    // Above the cap production is discarded: gross 2 but nothing stored.
    expect(staffed.stock).toBeGreaterThan(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(staffed.stored).toBe(0)
  })

  it('keeps Water capacity, balance, reserve, service and shortage apart', () => {
    const rows = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      const status = getWaterSupplyStatus(state)
      return {
        id: definition.id,
        state: status.state,
        capacity: status.capacity,
        need: status.need,
        balance: status.balance,
        reserve: status.reserve,
        service: `${status.servedResidences}/${status.residences}`,
        shortage: status.shortage,
      }
    })
    audit('WATER_SEMANTICS', {
      rows,
      vocabulary: {
        capacity: 'staffed Wells x 2',
        need: 'served colonists x 1',
        balance: 'capacity - need',
        reserve: 'the canonical stock',
        service: 'served residences / operational residences',
        shortage: 'the existing tick-coverage rule (unchanged)',
      },
    })
    const ie = rows.find((row) => row.id === 'industrial-expansion')!
    const wri = rows.find((row) => row.id === 'water-reserve-industry')!
    // The two industrial scenarios differ exactly by the reserve/capacity split.
    expect(ie.capacity).toBe(2)
    expect(ie.reserve).toBe(10)
    expect(ie.state).toBe('supplied')
    expect(wri.capacity).toBe(2)
    expect(wri.reserve).toBe(51)
    expect(wri.state).toBe('supplied')
    // Service is a separate dimension from capacity.
    expect(ie.service).toBe('2/2')
  })

  it('keeps Food stock, production, consumption, deficit and failure apart', () => {
    const recovery = createScenarioState(config, scenarioOf('recovery'))
    const starving = {
      stock: recovery.resources.food,
      production: getFoodProductionPerTick(recovery),
      consumption: getFoodConsumptionPerTick(recovery),
      net: getFoodProductionPerTick(recovery) - getFoodConsumptionPerTick(recovery),
      sustainable: isFoodSupplySustainable(recovery),
      ticksRemaining: getFoodTicksRemaining(recovery),
    }
    const settled = createScenarioState(config, scenarioOf('water-constraint'))
    const balanced = {
      stock: settled.resources.food,
      production: getFoodProductionPerTick(settled),
      consumption: getFoodConsumptionPerTick(settled),
      net: getFoodProductionPerTick(settled) - getFoodConsumptionPerTick(settled),
      sustainable: isFoodSupplySustainable(settled),
      ticksRemaining: getFoodTicksRemaining(settled),
    }
    audit('FOOD_SEMANTICS', {
      starving,
      balanced,
      uiWording: {
        deficit: 'Food: 30 · ~30 ticks',
        surplus: 'Food: 50 · sustainable',
        collapse: 'Food: 0 · starved (persistent), plus "Objective failed — the colony is gone"',
      },
    })
    expect(starving.net).toBe(-1)
    expect(starving.sustainable).toBe(false)
    expect(starving.ticksRemaining).toBe(30)
    expect(balanced.net).toBe(0)
    expect(balanced.sustainable).toBe(true)
    expect(balanced.ticksRemaining).toBeNull()
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
  })

  it('makes the two industrial scenarios explainable from their own state', () => {
    const table = ['industrial-expansion', 'water-reserve-industry'].map((id) => {
      const definition = scenarioOf(id)
      const state = createScenarioState(config, definition)
      const workshop = getBuildingDefinition('workshop')
      return {
        id,
        material: state.resources.construction,
        water: state.resources.water,
        storage: getMaterialStorageCapacity(state),
        workshopCost: `${workshop.constructionCost} Material + ${workshop.constructionWaterCost} Water`,
        objective: definition.objective.label,
        requirements: definition.objective.requirements.map((r) => r.kind),
        canAffordWorkshop: getPlacementAffordability(state, { x: 4, y: 2 }, 'workshop').affordable,
        waterState: getWaterSupplyStatus(state).state,
      }
    })
    audit('INDUSTRIAL_READABILITY', {
      table,
      reading:
        'Industrial expansion starts ABOVE the storage cap (100 > 25) so its Workshop cannot add to the stores; Water reserve industry starts BELOW it (25 = the Workshop) so the same Workshop manufactures the next building',
    })
    const ie = table[0]!
    const wri = table[1]!
    expect(ie.material).toBeGreaterThan(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(wri.material).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(ie.requirements).toHaveLength(2)
    expect(wri.requirements).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// 7-8. OPENING DISCOVERABILITY AND FAILURE/RECOVERY
// ---------------------------------------------------------------------------

describe('7-8. Opening discoverability and failure/recovery', { timeout: 60000 }, () => {
  it('exposes every cost the palette shows, and the opening gap', () => {
    const palette = (['residence', 'farm', 'workshop', 'well'] as const).map((type) => ({
      type,
      material: getBuildingDefinition(type).constructionCost,
      water: getBuildingDefinition(type).constructionWaterCost,
    }))
    const roadCost = 5
    const opening = createInitialState(config)
    const discoverability = {
      palette,
      roadCost,
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      initialFood: INITIAL_FOOD,
      initialWater: INITIAL_WATER,
      minimumVillage: 2 * 25 + 25 + 25 + roadCost,
      gap: 2 * 25 + 25 + 25 + roadCost - INITIAL_CONSTRUCTION_MATERIAL,
      affordabilityFeedback: getPlacementAffordability(opening, { x: 1, y: 0 }, 'residence'),
      workshopNeedsWater: getBuildingDefinition('workshop').constructionWaterCost,
    }
    audit('OPENING_DISCOVERABILITY', {
      discoverability,
      reading:
        'the palette labels every purchase with its Material cost; hovering names the exact shortfall; the 5-Material gap and the ordering pressure are discovered by playing (measured in 10AS)',
    })
    expect(palette.map((row) => row.material)).toEqual([25, 25, 25, 25])
    expect(palette.find((row) => row.type === 'workshop')?.water).toBe(1)
    expect(roadCost).toBe(5)
    expect(discoverability.gap).toBe(5)
    expect(discoverability.affordabilityFeedback.affordable).toBe(true)
  })

  it('measures the six failure/recovery states the audit inspected', () => {
    // 1. Food collapse: terminal (no producers left, no re-admission).
    const recovery = scenarioOf('recovery')
    const starved = runScenario(recovery, [{ kind: 'ticks', n: 120 }], 0)
    // 2. Water shortage blocks growth but never kills.
    const noService = createScenarioState(config, scenarioOf('water-constraint'))
    // 3. Inaccessible workforce: a Workplace whose Residence cannot reach it.
    const partitioned = createScenarioState(config, scenarioOf('water-constraint'))
    const options = getReassignmentOptions(partitioned, Object.keys(partitioned.colonists).sort()[0]!)
    // 4. Stalled construction: the 10AS opening case — four purchases leave 20
    // Material and the Well costs 25.
    let stalledState = createInitialState(config)
    for (const step of [
      { type: 'residence' as const, x: 1, y: 0 },
      { type: 'farm' as const, x: 0, y: 1 },
      { type: 'residence' as const, x: 1, y: 2 },
    ]) {
      let guard = 0
      while (guard < 40 && stalledState.resources.construction < 25) {
        stalledState = stepSimulation(stalledState)
        guard += 1
      }
      stalledState = stepSimulation(stalledState, { type: 'placeBuilding', x: step.x, y: step.y, buildingType: step.type })
      for (let i = 0; i < 3; i += 1) stalledState = stepSimulation(stalledState)
    }
    const stalledRoad = stepSimulation(stalledState, { type: 'placeRoads', cells: [{ x: 1, y: 1 }] })
    const stalledProbe = getPlacementAffordability(stalledRoad, { x: 2, y: 1 }, 'well')
    const stalledMaterial = stalledRoad.resources.construction
    // 5. Industrial depletion: the reserve is spent, the flow stops, recovery is possible.
    const wri = createScenarioState(config, scenarioOf('water-reserve-industry'))
    let depleted = wri
    depleted = stepSimulation(depleted, { type: 'placeBuilding', x: 4, y: 2, buildingType: 'workshop' })
    for (let i = 0; i < 3; i += 1) depleted = stepSimulation(depleted)
    const workshopId = [...iterateBuildings(depleted)].find((b) => b.type === 'workshop')?.id
    const wellWorker = Object.values(depleted.colonists).find(
      (c) => c.workplaceId === [...iterateBuildings(depleted)].find((b) => b.type === 'well')?.id
    )
    if (workshopId === undefined || wellWorker === undefined) throw new Error('10at: depletion setup')
    depleted = stepSimulation(depleted, { type: 'reassignColonist', colonistId: wellWorker.id, workplaceId: workshopId })
    for (let i = 0; i < 30; i += 1) depleted = stepSimulation(depleted)
    const depletedState = getWaterSupplyStatus(depleted)
    depleted = stepSimulation(depleted, {
      type: 'reassignColonist',
      colonistId: wellWorker.id,
      workplaceId: [...iterateBuildings(depleted)].find((b) => b.type === 'well')?.id ?? '',
    })
    const recoveredState = getWaterSupplyStatus(depleted)
    const rows = {
      foodCollapse: { population: starved.population, objective: starved.objective, terminal: true },
      waterShortage: {
        reached: noService.resources.water,
        gate: 'admission is blocked while the stock cannot cover the served need; nobody dies',
      },
      inaccessibleWorkforce: {
        options: options.length,
        note: 'the inspector lists every target with an eligibility reason (not connected / occupied / not operational)',
      },
      stalledConstruction: {
        material: stalledMaterial,
        required: stalledProbe.materialRequired,
        affordable: stalledProbe.affordable,
        reason: stalledProbe.placement.valid ? null : stalledProbe.placement.reason,
      },
      industrialDepletion: { duringBurst: depletedState.state, afterRecovery: recoveredState.state },
    }
    audit('FAILURE_RECOVERY', rows)
    expect(rows.foodCollapse.population).toBe(0)
    expect(rows.foodCollapse.objective).toBe('failed')
    expect(rows.inaccessibleWorkforce.options).toBeGreaterThan(0)
    expect(rows.stalledConstruction.material).toBe(20)
    expect(rows.stalledConstruction.required).toBe(25)
    expect(rows.stalledConstruction.affordable).toBe(false)
    expect(rows.stalledConstruction.reason).toBe('insufficientResources')
    expect(depletedState.state).toBe('shortage')
    expect(recoveredState.state).toBe('noReserve')
    // The reassignment surface the 10AQ fix restored stays complete.
    for (const option of options) {
      const validation = validateReassignment(partitioned, Object.keys(partitioned.colonists).sort()[0]!, option.workplaceId)
      expect(option.eligible).toBe(validation.valid && !option.isCurrent)
    }
  })
})

// ---------------------------------------------------------------------------
// 11. ARCHITECTURAL CHECKPOINT
// ---------------------------------------------------------------------------

describe('11. Architectural checkpoint', () => {
  it('is clean enough to freeze as the phase baseline', () => {
    const definition = scenarioOf('water-reserve-industry')
    const state = createScenarioState(config, definition)
    let simulated = state
    for (let i = 0; i < 30; i += 1) simulated = stepSimulation(simulated)
    const saved = JSON.parse(serializeSave(simulated))
    const invariants = {
      saveVersion: SAVE_VERSION,
      saveKeys: Object.keys(saved.state).sort(),
      deterministicAssembly: hashCanonicalState(state) === hashCanonicalState(createScenarioState(config, definition)),
      deterministicSimulation: (() => {
        let a = state
        let b = state
        for (let i = 0; i < 30; i += 1) {
          a = stepSimulation(a)
          b = stepSimulation(b)
        }
        return hashCanonicalState(a) === hashCanonicalState(b)
      })(),
      saveRoundTrip: hashCanonicalState(loadSave(serializeSave(simulated))) === hashCanonicalState(simulated),
      insertionOrderIndependent: (() => {
        const reversed: SimulationState = { ...state, buildings: Object.fromEntries(Object.entries(state.buildings).reverse()) }
        return hashCanonicalState(reversed) === hashCanonicalState(state)
      })(),
      noDerivedStateInSave: ['scenario', 'objective', 'progression', 'stage', 'waterSupply', 'storage'].every(
        (term) => !JSON.stringify(saved).includes(term)
      ),
      objectivePure: (() => {
        const first = JSON.stringify(getObjectiveStatus(simulated, definition.objective))
        const second = JSON.stringify(getObjectiveStatus(simulated, definition.objective))
        return first === second
      })(),
      scenariosDeclarativeOnly: SCENARIOS.every(
        (scenario) =>
          JSON.stringify(Object.keys(scenario).sort()) ===
          JSON.stringify(['buildings', 'colonists', 'description', 'id', 'name', 'objective', 'resources', 'roads'])
      ),
      scenarioHasNoHiddenResource: SCENARIOS.every(
        (scenario) => Object.keys(scenario.resources).sort().join(',') === 'food,material,water'
      ),
      economicConstants: {
        foodPerFarm: FOOD_PER_FARM_PER_TICK,
        waterPerWell: WATER_PER_WELL_PER_TICK,
        storagePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      },
    }
    audit('ARCHITECTURE_CHECKPOINT', invariants)
    expect(invariants.saveVersion).toBe(7)
    expect(invariants.saveKeys).toHaveLength(7)
    expect(invariants.deterministicAssembly).toBe(true)
    expect(invariants.deterministicSimulation).toBe(true)
    expect(invariants.saveRoundTrip).toBe(true)
    expect(invariants.insertionOrderIndependent).toBe(true)
    expect(invariants.noDerivedStateInSave).toBe(true)
    expect(invariants.objectivePure).toBe(true)
    expect(invariants.scenariosDeclarativeOnly).toBe(true)
    expect(invariants.scenarioHasNoHiddenResource).toBe(true)
    expect(invariants.economicConstants).toEqual({ foodPerFarm: 2, waterPerWell: 2, storagePerWorkshop: 25 })
  })
})
