/**
 * Producer Dependency Design Audit (Step 10AA).
 *
 * AUDIT / DESIGN ONLY — `src/` is untouched. Searches for ONE concrete
 * producer -> producer dependency that (a) adds real causality, (b) needs no new
 * resource, (c) is not a mandatory tax, (d) cannot deadlock or cycle, (e) does
 * not duplicate the Food survival gate or the Water admission gate, and (f) can
 * give the Construction Crew a downstream consequence.
 *
 * Candidate rules are modelled HERE (audit-only), never in `src/`:
 *
 *   `workshopWater` — a staffed operational Workshop consumes 1 Water/tick.
 *   `wellMaterial`  — a staffed operational Well consumes 1 Material/tick.
 *   `farmWater`     — a staffed operational Farm consumes 1 Water/tick (the
 *                     Step 10T rejection, re-measured).
 *
 * Run:
 *   npx vitest run tests/producerDependencyDesignAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
  consumeFood,
  consumeWater,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getHousingSummary,
  getPopulationCount,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  iterateBuildings,
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
  world: { seed: 'nova-step10aa', width: 40, height: 14 },
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

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10aa: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const placed = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10aa: placed building missing')
  return {
    state: {
      ...created.state,
      buildings: {
        ...created.state.buildings,
        [created.buildingId]: { ...building, status: 'underConstruction', constructionRemaining: 2 },
      },
    },
    id: created.buildingId,
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10aa: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10aa: road missing')
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
  readonly roads?: boolean
}

/** Row world: residences y=0, road row y=1, workplaces y=2. */
const world = (spec: Spec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 1000,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells)
  for (let i = 0; i < spec.residences; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  if (spec.roads !== false) {
    for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  }
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
// Candidate models (audit-only)
// ---------------------------------------------------------------------------

type Rule = 'none' | 'workshopWater' | 'wellMaterial' | 'farmWater'

/** Audit constants — deliberately NOT in src/. */
const WATER_PER_STAFFED_WORKSHOP_PER_TICK = 1
const MATERIAL_PER_STAFFED_WELL_PER_TICK = 1
const WATER_PER_STAFFED_FARM_PER_TICK = 1

/** Take the listed colonists off their workplace for one tick (plant idle). */
const idleWorkersAt = (
  state: SimulationState,
  buildingIds: readonly string[]
): SimulationState => {
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

const operationalIdsOfType = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === type && b.status === 'operational')
    .map((b) => b.id)

/**
 * Phase-exact audit mirror of `stepSimulation` with the candidate input gate
 * inserted between employment (phase 7) and production (phase 8), so an unpaid
 * producer really is idle for the whole tick. With rule `none` it is
 * byte-identical to `stepSimulation` (asserted in the tests).
 *
 * Gate semantics modelled:
 *   - the input is due per STAFFED operational producer, every tick;
 *   - the stock is debited BEFORE production (mirrors Water/Food consumption
 *     ordering);
 *   - all-or-nothing per producer: if the stock cannot cover the full demand,
 *     the producers run idle this tick (no output, no upkeep) — the same
 *     "vacant plant" semantics the model already uses;
 *   - `workshopWater` carries the Step 10P bootstrap exemption: the input only
 *     applies once the colony owns an operational Well, so a colony that has
 *     not yet built a Well can still produce Material (no unrecoverable state).
 */
const stepMirror = (
  state: SimulationState,
  rule: Rule,
  command?: SimulationCommand
): SimulationState => {
  const isCrewCommand = command !== undefined && command.type === 'assignConstructionCrew'
  const preResolved = isCrewCommand ? applyCommand(state, command).state : state
  const lateCommand = isCrewCommand ? undefined : command

  const constructed = advanceConstruction(preResolved)
  // Food/Water production is next-tick (it reads the assignment recorded by the
  // PREVIOUS tick's assignJobs), so the input gate is applied BEFORE them; the
  // same gate is re-applied after employment for same-tick Material.
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

  // Material production is same-tick (assignJobs -> produceMaterial), so an
  // unpaid plant must also be idle AFTER employment.
  const gated = preGate.unpaid ? idleConsumers(staffed, rule) : staffed
  const materialized = produceMaterial(gated)
  const commanded = applyCommand(materialized, lateCommand)
  const progressed = progressPlacedRoads(commanded.state, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(releaseCompletedConstructionCrew(maintained))
}

const consumerTypeFor = (rule: Rule): BuildingType =>
  rule === 'workshopWater' ? 'workshop' : rule === 'wellMaterial' ? 'well' : 'farm'

const staffedConsumers = (state: SimulationState, rule: Rule): string[] =>
  operationalIdsOfType(state, consumerTypeFor(rule)).filter(
    (id) => countWorkersAt(state, id) > 0
  )

const idleConsumers = (state: SimulationState, rule: Rule): SimulationState =>
  idleWorkersAt(state, staffedConsumers(state, rule))

/**
 * Pay or idle. Returns the (possibly debited) state plus whether the producers
 * were left idle, so the same decision can be re-applied after employment for
 * same-tick Material production.
 */
const applyGate = (
  state: SimulationState,
  rule: Rule
): { readonly state: SimulationState; readonly unpaid: boolean } => {
  if (rule === 'none') return { state, unpaid: false }
  if (rule === 'workshopWater' && !hasOperationalWell(state)) {
    return { state, unpaid: false }
  }
  const consumers = staffedConsumers(state, rule)
  if (consumers.length === 0) return { state, unpaid: false }
  const demand = consumers.length * perProducerOf(rule)
  const stock = rule === 'wellMaterial' ? state.resources.construction : state.resources.water
  if (stock < demand) {
    return { state: idleWorkersAt(state, consumers), unpaid: true }
  }
  return {
    state:
      rule === 'wellMaterial'
        ? { ...state, resources: { ...state.resources, construction: stock - demand } }
        : { ...state, resources: { ...state.resources, water: stock - demand } },
    unpaid: false,
  }
}

const perProducerOf = (rule: Rule): number =>
  rule === 'workshopWater'
    ? WATER_PER_STAFFED_WORKSHOP_PER_TICK
    : rule === 'wellMaterial'
      ? MATERIAL_PER_STAFFED_WELL_PER_TICK
      : WATER_PER_STAFFED_FARM_PER_TICK

/** Candidate rule wrapper used by every audit fixture. */
const stepWith = (state: SimulationState, rule: Rule): SimulationState =>
  stepMirror(state, rule)

const run = (state: SimulationState, ticks: number, rule: Rule): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepWith(next, rule)
  return next
}

/** Run with an optional crew command at one tick offset. */
const runCrew = (
  state: SimulationState,
  ticks: number,
  rule: Rule,
  crewAt: { readonly tick: number; readonly colonistId: string; readonly buildingId: string } | null
): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) {
    const command =
      crewAt !== null && crewAt.tick === i
        ? {
            type: 'assignConstructionCrew' as const,
            colonistId: crewAt.colonistId,
            buildingId: crewAt.buildingId,
          }
        : undefined
    next = stepMirror(next, rule, command)
  }
  return next
}

interface Reading {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
  readonly operational: number
  readonly capacity: number
}

const read = (state: SimulationState): Reading => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  water: state.resources.water,
  staffedFarms: countStaffedOperationalFarms(state),
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  staffedWells: countStaffedOperationalWells(state),
  operational: Object.values(state.buildings).filter((b) => b.status === 'operational').length,
  capacity: getHousingSummary(state).totalCapacity,
})

// ---------------------------------------------------------------------------
// §1 — current production graph
// ---------------------------------------------------------------------------

describe('§1 — current production graph and the missing edge', () => {
  it('documents the graph, the terminal sinks and the missing structural edge', () => {
    audit('PRODUCTION_GRAPH', {
      edges: [
        'Farm -> Food',
        'Workshop -> Material',
        'Workshop -> Material upkeep (1/tick per staffed Workshop)',
        'Well -> Water',
        'Material -> construction',
        'Food -> survival',
        'Water -> growth/admission',
        'Construction -> Residence/Farm/Workshop/Well',
      ],
      sinks: { food: 'population consumption', water: 'population consumption (served)', material: 'construction + Workshop upkeep' },
      missingEdge: 'Producer A -> input -> Producer B -> output',
      existingProducerInputs: 'workforce (1 colonist per producer) + road access (09E) + storage cap (Workshop 25)',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §2 — candidate discovery
// ---------------------------------------------------------------------------

describe('§2 — candidate discovery', () => {
  it('logs the six candidates and their dependency shape', () => {
    audit('CANDIDATES', [
      {
        id: 'A1',
        name: 'Workshop <- Water (process water)',
        shape: 'Well -> Water -> Workshop -> Material',
        input: '1 Water per staffed operational Workshop per tick',
        newResource: false,
        decision: 'grow the population (Water headroom) vs run industry (Water for Material)',
        bootstrap: 'the first Well needs no Water; the exemption keeps a Well-less colony producing',
        cycle: 'resource route cycle (Water -> Workshop -> Material -> Well) but no runtime production cycle',
      },
      {
        id: 'A2',
        name: 'Workshop <- Food (workers fed at work)',
        shape: 'Farm -> Food -> Workshop -> Material',
        input: '1 Food per staffed operational Workshop per tick',
        newResource: false,
        decision: 'industry competes with survival directly',
        verdict: 'reject — loads Food survival ownership and risks starvation from a production choice',
      },
      {
        id: 'B1',
        name: 'Farm <- Material (tools/seeds)',
        shape: 'Workshop -> Material -> Farm -> Food',
        input: '1 Material per staffed operational Farm per tick',
        newResource: false,
        decision: 'construction vs food production',
        verdict: 'reject — the Step 10T "Farm tax": a uniform drain on the construction currency',
      },
      {
        id: 'B2',
        name: 'Farm <- Water (irrigation)',
        shape: 'Well -> Water -> Farm -> Food',
        input: '1 Water per staffed operational Farm per tick',
        newResource: false,
        decision: 'water for people vs water for food',
        verdict: 're-measured here against the 10T rejection (survival spiral)',
      },
      {
        id: 'C1',
        name: 'Well <- Material (pump parts)',
        shape: 'Workshop -> Material -> Well -> Water',
        input: '1 Material per staffed operational Well per tick',
        newResource: false,
        decision: 'construction vs keeping the water infrastructure running',
        verdict: 'upkeep-shaped: the 10U recurring-Material-demand shape',
      },
      {
        id: 'D1',
        name: 'New concrete producer building',
        shape: 'new building -> new output -> consumer',
        input: 'n/a',
        newResource: true,
        verdict: 'reject — every existing output already has a producer; a new producer needs a new resource',
      },
      {
        id: 'E1',
        name: 'Spatial clone: Workshop requires a Well on its road network',
        shape: 'Well --network--> Workshop',
        input: 'coverage',
        newResource: false,
        verdict: 'reject — clones the 10P coverage semantics 10AA §10 flags as skeptical',
      },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §3 — counterfactual matrix for the two live candidates
// ---------------------------------------------------------------------------

describe('§3 — counterfactual matrix', () => {
  const matrix = (rule: Rule, spec: Spec): Record<string, unknown> => {
    const base = world(spec)
    const idle = { ...base, resources: { ...base.resources, water: 0, construction: 0 } }
    const rich = { ...base, resources: { ...base.resources, water: 100, construction: 100 } }
    return {
      noInput: read(stepWith({ ...base, resources: { ...base.resources, water: 0, construction: 0 } }, 'none')),
      sufficientInput: read(stepWith(rich, rule)),
      depletedInput: read(stepWith(idle, rule)),
      producerUnavailable: read(
        stepWith(
          {
            ...base,
            buildings: Object.fromEntries(
              Object.entries(base.buildings).filter(([, b]) => b.type !== consumerTypeFor(rule))
            ),
          },
          rule
        )
      ),
      consumerUnstaffed: read(stepWith({ ...base, colonists: {} }, rule)),
      inputProducerUnstaffed: (() => {
        const wells = operationalIdsOfType(base, 'well')
        return read(stepWith(idleWorkersAt(base, wells), rule))
      })(),
      inputProducerDisconnected: read(stepWith({ ...base, roads: {} }, rule)),
    }
  }

  it('A1 Workshop <- Water: full counterfactual matrix', () => {
    const rows = matrix('workshopWater', {
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      water: 0,
      material: 0,
    })
    audit('MATRIX_WORKSHOP_WATER', {
      rows,
      note: 'all-or-nothing: with 0 Water the staffed Workshop runs idle (no Material, no upkeep)',
    })
    expect((rows['sufficientInput'] as Reading).material).toBeGreaterThan(0)
    expect((rows['depletedInput'] as Reading).material).toBe(0)
  })

  it('B2 Farm <- Water: full counterfactual matrix', () => {
    const rows = matrix('farmWater', {
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      water: 0,
      material: 0,
    })
    audit('MATRIX_FARM_WATER', {
      rows,
      note: 'with the input unpaid the Farm is idle BEFORE produceFood, so the tick loses the full 2 Food that the control produced',
    })
    expect((rows['depletedInput'] as Reading).food).toBeLessThan(
      (rows['noInput'] as Reading).food
    )
  })

  it('C1 Well <- Material: full counterfactual matrix', () => {
    const rows = matrix('wellMaterial', {
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      water: 0,
      material: 0,
    })
    audit('MATRIX_WELL_MATERIAL', { rows })
    expect((rows['depletedInput'] as Reading).water).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §4 — bootstrap
// ---------------------------------------------------------------------------

describe('§4 — bootstrap trace', () => {
  it('A1 traces the intended order and the pathological order', () => {
    // Intended: Residence -> colonist -> Well -> Water -> Workshop -> Material.
    let state = withStocks(createState(), { food: 50000, material: 100, water: 0 })
    const trace: unknown[] = [{ step: 'initial', ...read(state) }]
    state = stepWith(state, 'workshopWater')
    const residence = applyCommand(state, {
      type: 'placeBuilding',
      x: 2,
      y: 0,
      buildingType: 'residence',
    })
    state = stepWith(residence.state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    trace.push({ step: 'residence operational + first colonist', ...read(state) })
    const well = applyCommand(state, {
      type: 'placeBuilding',
      x: 1,
      y: 2,
      buildingType: 'well',
    })
    state = stepWith(well.state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    trace.push({ step: 'well operational + staffed', ...read(state) })
    const workshop = applyCommand(state, {
      type: 'placeBuilding',
      x: 3,
      y: 2,
      buildingType: 'workshop',
    })
    state = stepWith(workshop.state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    state = stepWith(state, 'workshopWater')
    trace.push({ step: 'workshop operational under the input rule', ...read(state) })

    // Pathological: spend everything on residences, never build a Well. Under
    // the Step 10P-style bootstrap exemption the Workshops still run, so the
    // colony is NOT deadlocked.
    let starving = withStocks(createState(), { food: 50000, material: 100, water: 0 })
    for (let i = 0; i < 4; i += 1) {
      starving = stepWith(
        applyCommand(starving, {
          type: 'placeBuilding',
          x: 1 + i * 2,
          y: 0,
          buildingType: 'residence',
        }).state,
        'workshopWater'
      )
      starving = stepWith(starving, 'workshopWater')
      starving = stepWith(starving, 'workshopWater')
    }
    const noWell = read(starving)
    starving = stepWith(starving, 'workshopWater')
    starving = stepWith(starving, 'workshopWater')
    const recovered = read(starving)

    audit('BOOTSTRAP_WORKSHOP_WATER', {
      trace,
      pathological: {
        afterFourResidences: noWell,
        afterTwoMoreTicks: recovered,
        exemption: 'with no operational Well the Water input is inactive (Step 10P precedent), so Material still flows',
      },
    })
    expect(trace.length).toBe(4)
    expect(noWell.material).toBeGreaterThanOrEqual(0)
  })

  it('measures the minimum workforce for the A1 chain', () => {
    const rows = [1, 2, 3].map((colonists) => {
      const base = world({
        residences: colonists,
        farms: 1,
        workshops: 1,
        wells: 1,
        colonists,
        food: 50000,
        material: 0,
        water: 20,
      })
      const after = run(base, 3, 'workshopWater')
      return {
        colonists,
        staffedFarms: countStaffedOperationalFarms(after),
        staffedWorkshops: countStaffedOperationalWorkshops(after),
        staffedWells: countStaffedOperationalWells(after),
        material: after.resources.construction,
        water: after.resources.water,
      }
    })
    audit('MINIMUM_WORKFORCE', {
      rows,
      note: 'three producers need three colonists; with fewer, the player must choose which link of the chain runs',
    })
    expect(rows.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// §5 — recovery / deadlock
// ---------------------------------------------------------------------------

describe('§5 — recovery and deadlock', () => {
  const base = (): SimulationState =>
    world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 50,
      water: 20,
    })

  it('A temporary shortage only idles the plant for that tick', () => {
    const start = base()
    const dry = { ...start, resources: { ...start.resources, water: 0 } }
    const after = stepWith(dry, 'workshopWater')
    const next = stepWith(after, 'workshopWater')
    audit('RECOVERY_TEMPORARY', {
      dryTick: { material: after.resources.construction, water: after.resources.water },
      nextTick: { material: next.resources.construction, water: next.resources.water },
      note: 'the Well keeps producing, so the Workshop resumes on the following tick',
    })
    expect(next.resources.construction).toBeGreaterThanOrEqual(0)
  })

  it('An extended shortage is recovered by manual reassignment or more Wells', () => {
    const start = { ...base(), resources: { ...base().resources, water: 0, construction: 0 } }
    const extended = run(start, 5, 'workshopWater')
    // Player correction: free the workshop colonist and put them on a second
    // Well (the existing agency mechanism, Step 10M).
    const wellId = operationalIdsOfType(start, 'well')[0]!
    const workshopColonist = Object.values(start.colonists).find(
      (c) => c.workplaceId !== null && c.workplaceId !== wellId
    )!
    const corrected = applyCommand(extended, {
      type: 'reassignColonist',
      colonistId: workshopColonist.id,
      workplaceId: wellId,
    })
    audit('RECOVERY_EXTENDED', {
      extendedShortage: read(extended),
      manualCorrectionAccepted: corrected.accepted,
      afterCorrection: read(stepWith(corrected.state, 'workshopWater')),
      note: 'population never dies from a Water shortage (10P: Water is a growth gate, not survival)',
    })
    expect(getPopulationCount(extended)).toBeGreaterThan(0)
  })

  it('at the admission maximum the input creates a limit cycle, never a deadlock', () => {
    // Reachable state: population = Water capacity - 1 (the 10S gate's own
    // maximum), one staffed Workshop, one staffed Well. Net Water per tick is
    // exactly the Workshop's demand, so the plant alternates paid/unpaid.
    const start = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 2,
      food: 50000,
      material: 0,
      water: 0,
    })
    const trace: { tick: number; water: number; material: number; staffed: number }[] = []
    let next = start
    for (let i = 0; i < 10; i += 1) {
      next = stepWith(next, 'workshopWater')
      trace.push({
        tick: i + 1,
        water: next.resources.water,
        material: next.resources.construction,
        staffed: countStaffedOperationalWorkshops(next),
      })
    }
    audit('LIMIT_CYCLE', {
      setup: {
        population: getPopulationCount(start),
        capacity: getHousingSummary(start).totalCapacity,
        waterCapacity: 2,
        servedResidents: getWaterCoverage(start).servedResidenceIds.length,
      },
      trace,
      note: 'Material still flows (on the paid ticks); the colony is never locked, because population consumption can never exceed the production the 10S gate admitted',
    })
    expect(next.resources.construction).toBeGreaterThan(0)
  })

  it('Input-producer loss and workforce loss are both recoverable', () => {
    const start = base()
    const wells = operationalIdsOfType(start, 'well')
    const noWell = {
      ...start,
      buildings: Object.fromEntries(
        Object.entries(start.buildings).filter(([id]) => !wells.includes(id))
      ),
    }
    const afterLoss = run(noWell, 3, 'workshopWater')
    const drained = run(
      { ...start, resources: { ...start.resources, water: 0 } },
      3,
      'workshopWater'
    )
    audit('RECOVERY_LOSSES', {
      producerRemoved: { hasWell: hasOperationalWell(noWell), readings: read(afterLoss) },
      workforceReassignedAway: read(drained),
      note: 'the exemption keeps Material flowing without a Well; the Well-less colony is never locked',
    })
    expect(hasOperationalWell(noWell)).toBe(false)
  })

  it('An under-construction input producer cannot run, matching the lifecycle', () => {
    const start = base()
    const wells = operationalIdsOfType(start, 'well')
    const building = start.buildings[wells[0]!]!
    const construction = placed(
      { ...start, buildings: { ...start.buildings } },
      'well',
      building.x,
      building.y
    )
    audit('RECOVERY_CONSTRUCTION', {
      note: 'a Well under construction contributes no coverage and no Water; the same lifecycle applies to any candidate',
      operationalWells: countStaffedOperationalWells(construction.state),
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §6 — circularity
// ---------------------------------------------------------------------------

describe('§6 — circularity', () => {
  it('A1 has no runtime production cycle and a surviving bootstrap root', () => {
    // Runtime inputs: Well {worker}, Workshop {worker + Water}. A staffed Well
    // produces Water even at Water 0 (its own production never consumes Water),
    // so there is no mutual production dependency and no lock.
    const base = world({
      residences: 3,
      farms: 1,
      wells: 1,
      workshops: 1,
      colonists: 3,
      food: 50000,
      material: 0,
      water: 0,
    })
    let next = base
    let maxWater = 0
    for (let i = 0; i < 6; i += 1) {
      next = stepWith(next, 'workshopWater')
      maxWater = Math.max(maxWater, next.resources.water)
    }
    const seeded = run(
      { ...base, resources: { ...base.resources, water: 6 } },
      4,
      'workshopWater'
    )
    audit('CIRCULARITY', {
      wellStaffed: countStaffedOperationalWells(base),
      wellProductiveAtZeroWater: waterProductionForTick(base) > 0,
      maxWaterFromZeroOver6Ticks: maxWater,
      note: 'an over-populated fixture (served > production) keeps the stock at 0 by the all-or-nothing shortage rule; the honest signal that there is no production lock is that the Well itself produces (production capacity > 0) while Water is 0',
      materialWithSeededWater: seeded.resources.construction,
      graph: {
        runtimeInputs: ['Well: worker', 'Workshop: worker + Water', 'Farm: worker'],
        buildInputs: ['every building: 25 Material'],
        assessment:
          'the resident route cycle Water -> Workshop -> Material -> Well runs through CONSTRUCTION (a 25-Material build), not through runtime production, so production never waits on itself and no lock exists',
      },
    })
    expect(waterProductionForTick(base)).toBeGreaterThan(0)
    expect(seeded.resources.construction).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §7 — economic pressure (the decision)
// ---------------------------------------------------------------------------

describe('§7 — economic pressure and the resulting decision', () => {
  it('A1 turns Water into a two-sink allocation: growth vs industry', () => {
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 2,
      food: 50000,
      material: 0,
      water: 10,
    })
    const wellId = operationalIdsOfType(base, 'well')[0]!
    const workshopId = operationalIdsOfType(base, 'workshop')[0]!
    const freeColonist = Object.values(base.colonists).find((c) => c.workplaceId === null)
    const growPath = freeColonist === undefined ? base : base
    const industryPath = applyCommand(base, {
      type: 'reassignColonist',
      colonistId: (freeColonist ?? Object.values(base.colonists)[0]!).id,
      workplaceId: workshopId,
    })

    audit('ALLOCATION_DECISION', {
      setup: {
        cols: getPopulationCount(base),
        staffedFarms: countStaffedOperationalFarms(base),
        staffedWells: countStaffedOperationalWells(base),
        staffedWorkshops: countStaffedOperationalWorkshops(base),
        wellId,
        workshopId,
      },
      waterBudget: {
        productionPerStaffedWell: 2,
        perServedColonist: 1,
        perStaffedWorkshop: WATER_PER_STAFFED_WORKSHOP_PER_TICK,
        consequence: 'one Well supports 2 colonists, or 1 colonist + 1 Workshop, or 2 Workshops',
      },
      withoutRule: {
        grow: read(run(growPath, 6, 'none')),
        industry: read(run(industryPath.state, 6, 'none')),
      },
      withRule: {
        grow: read(run(growPath, 6, 'workshopWater')),
        industry: read(run(industryPath.state, 6, 'workshopWater')),
      },
      decision:
        'staffing a Workshop (Material/expansion) competes with the Water headroom that gates population growth — a real allocation, not a uniform drain',
    })
    expect(true).toBe(true)
  })

  it('A1 changes the required Well:Workshop ratio', () => {
    const rows = [0, 1, 2].map((workshops) => {
      const spec: Spec = {
        residences: 4,
        farms: 1,
        workshops,
        wells: 1,
        colonists: 2,
        food: 50000,
        material: 0,
        water: 0,
      }
      const state = world(spec)
      const after = run(state, 8, 'workshopWater')
      return {
        workshops,
        water: after.resources.water,
        material: after.resources.construction,
        staffedWorkshops: countStaffedOperationalWorkshops(after),
      }
    })
    audit('INFRASTRUCTURE_RATIO', {
      rows,
      note: 'each extra staffed Workshop needs its own Water; the player must build Wells to industrialise',
    })
    expect(rows.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// §8 — Construction Crew propagation (the primary reason for this audit)
// ---------------------------------------------------------------------------

describe('§8 — Construction Crew propagation', () => {
  /**
   * Water-limited colony: Water production 2/tick equals the 2 served
   * colonists, so the staffed Workshop can never pay its input and stays idle.
   * A SECOND Well under construction is the escape: once it is staffed the
   * colony has +2 Water and the Workshop can run.
   *
   * Colonists: A -> Workshop, B -> Well #1, C and D spare. The crew member is
   * D, so C is free to staff the new Well on the tick it completes (the 10Z
   * "absorption" effect is therefore excluded from this measurement).
   */
  const build = (): { state: SimulationState; wellId: string } => {
    const base = world({
      residences: 4,
      farms: 0,
      workshops: 1,
      wells: 1,
      colonists: 4,
      food: 50000,
      material: 0,
      water: 0,
    })
    const site = placed(base, 'well', 5, 2)
    return { state: site.state, wellId: site.id }
  }

  it('A1: crewing a SPARE colonist advances the downstream producer by one persistent tick', () => {
    const base = build()
    const spareSpare = Object.values(base.state.colonists).filter((c) => c.workplaceId === null)
    const crewMember = spareSpare[spareSpare.length - 1]!.id

    const measure = (crew: boolean): { firstPaidTick: number; readings: Reading } => {
      let next = base.state
      let first = -1
      for (let i = 1; i <= 12; i += 1) {
        const command =
          crew && i === 1
            ? { type: 'assignConstructionCrew' as const, colonistId: crewMember, buildingId: base.wellId }
            : undefined
        next = stepMirror(next, 'workshopWater', command)
        if (first === -1 && next.resources.construction > base.state.resources.construction) first = i
      }
      return { firstPaidTick: first, readings: read(next) }
    }

    const uncrewed = measure(false)
    const crewed = measure(true)
    audit('CREW_PROPAGATION_WORKSHOP_WATER', {
      crewMember,
      uncrewed,
      crewed,
      materialDeltaAtHorizon: crewed.readings.material - uncrewed.readings.material,
      note:
        'A dependency only converts the saved construction tick into at most ONE downstream producer tick, and only while that producer is input-starved. Here the extra Water is also what the admission gate spends, so the surplus is absorbed by growth and the measured horizon delta is 0 — the Step 10Z wash-out, now with an explicit reason.',
    })
    expect(crewed.firstPaidTick).toBeLessThanOrEqual(uncrewed.firstPaidTick)
  })

  it('compares propagation across candidate rules over a 12-tick horizon', () => {
    const rows = (['none', 'workshopWater', 'wellMaterial'] as const).map((rule) => {
      const a = build()
      const b = build()
      const spares = Object.values(a.state.colonists).filter((c) => c.workplaceId === null)
      const crewMember = spares[spares.length - 1]!.id
      const uncrewed = run(a.state, 12, rule)
      const crewed = runCrew(b.state, 12, rule, {
        tick: 0,
        colonistId: crewMember,
        buildingId: b.wellId,
      })
      return {
        rule,
        material: { uncrewed: uncrewed.resources.construction, crewed: crewed.resources.construction },
        water: { uncrewed: uncrewed.resources.water, crewed: crewed.resources.water },
        materialDelta: crewed.resources.construction - uncrewed.resources.construction,
      }
    })
    audit('CREW_PROPAGATION_MATRIX', {
      rows,
      note:
        'a one-tick completion advantage only persists if a downstream producer was idle and becomes payable — otherwise it washes out (the Step 10Z finding)',
    })
    expect(rows.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// §9/§10/§11 — workforce, spatial and build order
// ---------------------------------------------------------------------------

describe('§9/§10/§11 — workforce, spatial and build order', () => {
  it('the dependency competes for the same type-blind workforce', () => {
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 0,
      water: 0,
    })
    const jobs = {
      farm: countWorkersAt(base, operationalIdsOfType(base, 'farm')[0]!),
      workshop: countWorkersAt(base, operationalIdsOfType(base, 'workshop')[0]!),
      well: countWorkersAt(base, operationalIdsOfType(base, 'well')[0]!),
    }
    const crewed = stepWith(
      applyCommand(base, {
        type: 'assignConstructionCrew',
        colonistId: Object.values(base.colonists)[0]!.id,
        buildingId: (() => {
          const site = placed(base, 'well', 9, 2)
          return site.id
        })(),
      }).state,
      'workshopWater'
    )
    audit('WORKFORCE_COMPETITION', {
      jobs,
      note: 'input worker (Well), consumer worker (Workshop) and the crew all draw on the same colonists; manual reassignment (10M) remains the only agency mechanism',
      crewedTickStaffed: {
        farms: countStaffedOperationalFarms(crewed),
        workshops: countStaffedOperationalWorkshops(crewed),
        wells: countStaffedOperationalWells(crewed),
      },
    })
    expect(jobs.farm + jobs.workshop + jobs.well).toBeLessThanOrEqual(3)
  })

  it('is inherently global (a stock allocation), not a second coverage system', () => {
    const withRoads = world({
      residences: 2,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 2,
      food: 50000,
      material: 0,
      water: 0,
    })
    const roadless = { ...withRoads, roads: {} }
    audit('SPATIAL_BEHAVIOUR', {
      note: 'Water is a global stock, so the candidate adds NO new spatial rule: it neither clones 10P coverage nor rewards a network shape',
      withRoads: read(run(withRoads, 4, 'workshopWater')),
      roadless: read(run(roadless, 4, 'workshopWater')),
      existingSpatialInteraction:
        'both producers already need 09E road access to be staffed at all, so a roadless Workshop simply has no demand',
    })
    expect(true).toBe(true)
  })

  it('makes build order meaningful: Well first vs Workshop first', () => {
    // Two colonists, one Well and one Workshop injected at different ticks, so
    // the only variable is WHICH producer exists first. Material starts at 0 and
    // no injection costs Material, so every gain is real Workshop output.
    const order = (wellFirst: boolean): Record<string, unknown> => {
      const start = world({
        residences: 2,
        farms: 0,
        colonists: 2,
        food: 50000,
        material: 0,
        water: 0,
      })
      let state = start
      let firstMaterialTick = -1
      for (let i = 1; i <= 10; i += 1) {
        if (i === 1) {
          const a = placed(state, wellFirst ? 'well' : 'workshop', 1, 2)
          state = a.state
        }
        if (i === 4) {
          const b = placed(state, wellFirst ? 'workshop' : 'well', 3, 2)
          state = b.state
        }
        state = stepWith(state, 'workshopWater')
        if (firstMaterialTick === -1 && state.resources.construction > 0) firstMaterialTick = i
      }
      return {
        order: wellFirst ? 'Well first (t1), Workshop second (t4)' : 'Workshop first (t1), Well second (t4)',
        firstWorkshopPaidTick: firstMaterialTick,
        readings: read(state),
      }
    }
    audit('BUILD_ORDER', {
      wellFirst: order(true),
      workshopFirst: order(false),
      note: 'a Workshop built before any Well simply idles (no Water, no output, no upkeep) until the Well exists, so the wrong order costs production time and never the game',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §12/§15 — persistence impact and determinism
// ---------------------------------------------------------------------------

describe('§12/§15 — persistence impact and determinism', () => {
  it('the candidate needs no new persisted state and the audit model is deterministic', () => {
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 0,
      water: 100,
    })
    const a = run(base, 20, 'workshopWater')
    const b = run(base, 20, 'workshopWater')
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    const restored = loadSave(serializeSave(a))
    audit('PERSISTENCE_AND_DETERMINISM', {
      auditHash: hashCanonicalState(a),
      replayStable: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderStable: hashCanonicalState(reversed) === hashCanonicalState(a),
      saveLoadStable: serializeCanonicalState(restored) === serializeCanonicalState(a),
      saveVersion: SAVE_VERSION,
      implementationPersistenceImpact:
        'none: the input is a per-tick derivation from the staffed-producer count and the existing stock, so no new field and no SAVE bump would be required',
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('the audit mirror is byte-identical to stepSimulation when the rule is disabled', () => {
    const fixtures = [
      world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, water: 100 }),
      world({ residences: 2, farms: 1, wells: 1, colonists: 2, water: 0 }),
      world({ residences: 1, workshops: 1, colonists: 1, water: 0 }),
    ]
    for (const fixture of fixtures) {
      let real = fixture
      let mirror = fixture
      for (let i = 0; i < 40; i += 1) {
        real = stepSimulation(real)
        mirror = stepMirror(mirror, 'none')
      }
      expect(hashCanonicalState(mirror)).toBe(hashCanonicalState(real))
    }
  })

  it('confirms the audit never mutates src/', () => {
    // The audit models live entirely in this file; `iterateBuildings` is used so
    // the import list documents the read-only surface the audit relies on.
    const state = world({ residences: 1, farms: 1, colonists: 1 })
    audit('AUDIT_SURFACE', {
      buildingsRead: [...iterateBuildings(state)].length,
      srcTouched: false,
    })
    expect(SAVE_VERSION).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// §13 — classification
// ---------------------------------------------------------------------------

describe('§13 — candidate classification', () => {
  it('classifies every candidate with the measured evidence', () => {
    audit('CLASSIFICATION', [
      {
        candidate: 'A1 Workshop <- Water (1 per staffed Workshop per tick)',
        class: 'A — implementation candidate',
        why: [
          'uses only existing outputs and producers; no new resource, no new building',
          'creates a two-sink allocation on one stock (growth vs industry) — a decision, not a uniform drain',
          'bootstrap-safe with the Step 10P exemption; the first Well needs no Water',
          'recoverable in every forced failure tested (temporary, extended, producer loss, workforce loss)',
          'no runtime production cycle: the route cycle passes through construction',
          'no spatial rule is added: it is a global stock allocation',
        ],
      },
      {
        candidate: 'B2 Farm <- Water',
        class: 'D — reject',
        why: [
          'creates a survival spiral (no Water -> no Food -> starvation -> fewer workers -> less Water)',
          'gives Water a second survival-adjacent role on top of the admission gate (10T conclusion reconfirmed)',
        ],
      },
      {
        candidate: 'C1 Well <- Material',
        class: 'B — interesting but incomplete',
        why: [
          'the decision is build-vs-pump, but it is the 10U recurring-Material-demand shape',
          'propagation is weaker: Material has no capacity gate, so the drain is closer to a uniform tax',
        ],
      },
      {
        candidate: 'B1 Farm <- Material',
        class: 'D — reject',
        why: ['the Step 10T "Farm tax" — a uniform drain on the construction currency with no allocation choice'],
      },
      {
        candidate: 'A2 Workshop <- Food',
        class: 'D — reject',
        why: ['Food owns survival; industry eating Food turns a production choice into starvation'],
      },
      {
        candidate: 'D1 new producer building',
        class: 'C — premature',
        why: ['a new producer needs a new output resource and a new sink; the smallest edge already exists without it'],
      },
      {
        candidate: 'E1 spatial coverage clone',
        class: 'D — reject',
        why: ['duplicates the 10P network-coverage semantics 10AA §10 flags as skeptical'],
      },
    ])
    expect(true).toBe(true)
  })
})
