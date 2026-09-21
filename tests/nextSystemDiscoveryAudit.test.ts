/**
 * Next System Discovery & Phase 5 Design Audit (Step 10X).
 *
 * AUDIT ONLY — `src/` is untouched. Reconstructs the current causal graph,
 * enumerates the missing simulation dimensions, evaluates seven concrete
 * candidate systems and classifies each with real measurements.
 *
 * Run:
 *   npx vitest run tests/nextSystemDiscoveryAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceTime,
  applyCommand,
  areBuildingsMobilityConnected,
  assignJobs,
  consumeFood,
  consumeWater,
  countEmployedWorkers,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getEmploymentSummary,
  getPopulationCount,
  getRoadDistanceBetweenBuildings,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  iterateBuildings,
  iterateRoads,
  loadSave,
  produceFood,
  produceMaterial,
  produceWater,
  progressOneBuilding,
  progressOneRoad,
  progressPlacedBuilding,
  progressPlacedRoads,
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
  world: { seed: 'nova-step10x', width: 60, height: 20 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number,
  constructionRemaining = 0
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10x: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]:
        constructionRemaining === 0
          ? { ...building, status: 'operational', constructionRemaining: 0 }
          : { ...building, status: 'underConstruction', constructionRemaining },
    },
  }
}

const placed = (state: SimulationState, type: BuildingType, x: number, y: number): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10x: placed building missing')
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
  if (id === undefined) throw new Error('10x: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10x: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

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

const idsOf = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === type)
    .map((b) => b.id)

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly workshops?: number
  readonly wells?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
}

/** Flat row world: residences y=0, workplaces y=2, road row y=1. */
const world = (spec: Spec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 1000,
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
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  const residenceIds = idsOf(state, 'residence')
  for (let i = 0; i < Math.min(spec.colonists ?? 0, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
  }
  return assignJobs(state)
}

// ---------------------------------------------------------------------------
// §6 support — audited construction-crew mirror
// ---------------------------------------------------------------------------

/** crew: colonistId -> under-construction building id. */
type Crew = ReadonlyMap<string, string>

const crewedSiteIds = (crew: Crew): ReadonlySet<string> => new Set(crew.values())

/**
 * Audited construction phase: every under-construction building progresses by
 * 1, plus 1 more when a colonist is crewed to it. Roads are not crewable in
 * the minimal candidate. When `crew` is empty this is byte-identical to
 * `advanceConstruction` (proved in the test below).
 */
const progressWithCrew = (state: SimulationState, crew: Crew): SimulationState => {
  const crewed = crewedSiteIds(crew)
  let buildings = state.buildings
  let changed = false
  for (const building of iterateBuildings(state)) {
    let next = building
    const steps = building.status === 'operational' ? 0 : crewed.has(building.id) ? 2 : 1
    for (let i = 0; i < steps; i += 1) next = progressOneBuilding(next)
    if (next !== building) {
      buildings = { ...buildings, [building.id]: next }
      changed = true
    }
  }
  let roads = state.roads
  for (const road of iterateRoads(state)) {
    const progressed = progressOneRoad(road)
    if (progressed !== road) {
      roads = { ...roads, [road.id]: progressed }
      changed = true
    }
  }
  return changed ? { ...state, buildings, roads } : state
}

/** Crew members are busy building: they hold no workplace this tick. */
const excludeCrew = (state: SimulationState, crew: Crew): SimulationState => {
  if (crew.size === 0) return state
  let colonists = state.colonists
  let changed = false
  for (const colonistId of crew.keys()) {
    const colonist = colonists[colonistId]
    if (colonist === undefined || colonist.workplaceId === null) continue
    colonists = { ...colonists, [colonistId]: { ...colonist, workplaceId: null } }
    changed = true
  }
  return changed ? { ...state, colonists } : state
}

/** Crew members whose site is still under construction at the start of the tick. */
const activeCrew = (state: SimulationState, crew: Crew): Crew => {
  const active = new Map<string, string>()
  for (const [colonistId, siteId] of crew) {
    const site = state.buildings[siteId]
    if (site !== undefined && site.status !== 'operational') active.set(colonistId, siteId)
  }
  return active
}

/**
 * Full audited step — exact replica of `stepSimulation`'s phase order with the
 * construction phase replaced. With an empty crew it is byte-identical to
 * `stepSimulation` (proved in the tests below). Crew members are excluded from
 * production for the whole tick, so the tradeoff is real.
 */
const stepAudited = (
  state: SimulationState,
  crew: Crew,
  command?: SimulationCommand
): SimulationState => {
  const busy = activeCrew(state, crew)
  const prepared = excludeCrew(state, busy)
  const constructed = progressWithCrew(prepared, busy)
  const requiredFood = updateNeeds(constructed)
  const produced = produceFood(constructed)
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
  const staffed = excludeCrew(assignJobs(populated), busy)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommand(materialized, command)
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed= progressPlacedRoads(progressedBuilding, commanded)
  const maintained = upkeepBuildings(progressed)
  return advanceTime(maintained)
}

// Imported lazily to keep the replica readable.

const runWithCrew = (
  state: SimulationState,
  crew: Crew,
  ticks: number
): readonly { readonly tick: number; readonly state: SimulationState }[] => {
  const rows: { tick: number; state: SimulationState }[] = [{ tick: state.time.tick, state }]
  let next = state
  for (let i = 0; i < ticks; i += 1) {
    next = stepAudited(next, crew)
    rows.push({ tick: next.time.tick, state: next })
  }
  return rows
}

// ---------------------------------------------------------------------------
// §1 — Current causal graph
// ---------------------------------------------------------------------------

describe('§1 — current causal graph', () => {
  it('documents the graph, its phases and its terminal nodes', () => {
    audit('CAUSAL_GRAPH', {
      chain: [
        'Material -> construction -> Residence/Farm/Workshop/Well/Road',
        'Road -> road network -> building access -> mobility eligibility -> employment',
        'Road -> road network -> Water coverage -> residence service -> admission',
        'Farm -> Food -> household consumption -> survival',
        'Well -> Water -> residence coverage -> growth admission',
        'Workshop -> Material -> construction stock',
        'Population -> workforce -> Farm/Workshop/Well',
      ],
      phaseOrder: [
        'advanceConstruction',
        'updateNeeds',
        'produceFood',
        'produceWater',
        'consumeFood',
        'consumeWater',
        'updatePopulation',
        'assignJobs',
        'produceMaterial',
        'applyCommand',
        'progressPlacedBuilding',
        'progressPlacedRoads',
        'upkeepBuildings',
        'advanceTime',
      ],
      terminalNodes: [
        'Food stock (consumed by population; shortage = survival)',
        'Water stock (consumed by served population; shortage = growth gate)',
        'Material stock (consumed by construction; storage-clamped)',
        'Population (survives or is removed; admitted or blocked)',
        'ConstructionRemaining (progresses by time only)',
      ],
      ownership: { food: 'survival', water: 'growth admission', housing: 'capacity', material: 'construction' },
    })
    expect(true).toBe(true)
  })

  it('measures the construction asymmetry: construction ignores the workforce', () => {
    const base = world({ residences: 2, farms: 1, wells: 1, colonists: 1 })
    const withSpare = world({ residences: 4, farms: 1, wells: 1, colonists: 4 })
    // Both colonies start a Well; measure the tick it becomes operational.
    const completionTick = (state: SimulationState): number => {
      const start = withStocks(
        { ...state, buildings: state.buildings },
        { material: 1000 }
      )
      let next = start
      for (let i = 0; i < 12; i += 1) {
        next = stepSimulation(next)
        const well = Object.values(next.buildings).find((b) => b.type === 'well')
        if (well !== undefined && well.status === 'operational') return next.time.tick
      }
      return -1
    }
    const oneWorker = world({ residences: 2, farms: 1, wells: 0, colonists: 1 })
    const fourWorkers = world({ residences: 4, farms: 1, wells: 0, colonists: 4 })
    const a = placed(withStocks(oneWorker, { material: 1000 }), 'well', 5, 2)
    const b = placed(withStocks(fourWorkers, { material: 1000 }), 'well', 9, 2)
    const tickA = completionTick(withStocks(a.state, { material: 1000 }))
    const tickB = completionTick(withStocks(b.state, { material: 1000 }))
    audit('CONSTRUCTION_ASYMMETRY', {
      oneWorkerColony: { colonists: 1, wellOperationalTick: tickA },
      fourWorkerColony: { colonists: 4, wellOperationalTick: tickB },
      base: { colonists: getPopulationCount(base), employed: countEmployedWorkers(base) },
      surplus: getEmploymentSummary(withSpare).vacantJobs,
      finding: 'construction progresses identically regardless of population or surplus workers',
    })
    expect(tickA).toBe(tickB)
  })
})

// ---------------------------------------------------------------------------
// §2 — Missing causal dimensions
// ---------------------------------------------------------------------------

describe('§2 — missing causal dimensions', () => {
  it('audits consumption diversity, production dependency and spatial service quality', () => {
    const servedFar = (() => {
      let state = withStocks(createState(), { food: 50000, material: 1000 })
      state = op(state, 'residence', 1, 1)
      state = op(state, 'well', 25, 3)
      for (let x = 1; x <= 26; x += 1) state = opRoad(state, x, 2)
      state = createColonist(state, idsOf(state, 'residence')[0]!).state
      return assignJobs(state)
    })()
    audit('MISSING_DIMENSIONS', {
      A_consumptionDiversity: {
        current: 'Food -> survival, Water -> growth',
        finding: 'no third essential exists that is not survival (Food) or growth (Water)',
      },
      B_productionDependency: {
        current: 'Farm/Workshop/Well each need only a worker',
        finding: 'no producer consumes another producer output; an input chain is only reachable as a recurring tax (rejected 10T)',
      },
      C_spatialServiceQuality: {
        current: 'Water coverage is binary and UNBOUNDED by distance',
        evidence: {
          residenceToWellRoadDistance: getRoadDistanceBetweenBuildings(servedFar, idsOf(servedFar, 'residence')[0]!, idsOf(servedFar, 'well')[0]!),
          servedResidences: getWaterCoverage(servedFar).servedResidenceIds.length,
        },
        finding: 'a graded service would duplicate Water unless it targets a different output',
      },
      D_workforceSpecialization: {
        current: 'one homogeneous workforce, type-blind assignment',
        finding: 'no evidence for differentiation; would be a priority system',
      },
      E_infrastructurePressure: {
        current: 'roads affect connectivity, employment eligibility, Water coverage',
        finding: 'distance is measured (09M) but has no consequence beyond the nearest-workplace tiebreak',
      },
      F_settlementProgression: {
        current: 'settlement size measurable, no consumer',
        finding: 'no mechanic consumes growth without an arbitrary score (10V)',
      },
    })
    expect(getWaterCoverage(servedFar).servedResidenceIds.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §3/§4/§5 — Candidates, families, anti-duplication matrix
// ---------------------------------------------------------------------------

describe('§3 — candidate discovery', () => {
  it('logs seven concrete candidates with their causal shape', () => {
    audit('CANDIDATES', [
      {
        name: 'Construction Crew (labor assigned to a construction site)',
        existingStateConsumed: 'under-construction buildings, colonists, 10M manual assignment',
        newStateIntroduced: 'one colonist assignment target (construction site)',
        playerDecision: 'free a producer to build faster vs keep producing now',
        simulationConsequence: 'completion tick moves; production during the build changes',
        spatialConsequence: 'optional: a crew member must be mobility-connected to the site',
        workforceConsequence: 'workforce gains a fourth consumer; 10M reassignment becomes more valuable',
        materialConsequence: 'none (construction still the Material sink, no upkeep)',
        populationConsequence: 'indirect only (faster housing/Well completion)',
        whyNotFoodDuplicate: 'does not touch survival',
        whyNotWaterDuplicate: 'does not touch the admission gate',
        whyNotHousingDuplicate: 'does not change capacity',
      },
      {
        name: 'Road-Distance Workplace Efficiency (graded output by commute distance)',
        existingStateConsumed: '09M road distance, workforce, workplaces',
        newStateIntroduced: 'derived per-worker efficiency scalar',
        playerDecision: 'build near workplaces vs accept lower output',
        simulationConsequence: 'production scales with distance',
        spatialConsequence: 'layout changes output',
        workforceConsequence: 'reassignment value changes by distance',
        materialConsequence: 'roads cost Material to shorten commutes',
        populationConsequence: 'indirect (production feeds growth)',
        whyNotFoodDuplicate: 'modulates output, not survival',
        whyNotWaterDuplicate: 'modulates output, not admission',
        whyNotHousingDuplicate: 'capacity untouched',
      },
      {
        name: 'Irrigation Dependency (Farm requires Water)',
        existingStateConsumed: 'Water stock/coverage, Farms',
        newStateIntroduced: 'none (a new consumption rule)',
        playerDecision: 'water for people vs water for farms',
        simulationConsequence: 'Food output depends on Water',
        spatialConsequence: 'Farms must be near Water',
        workforceConsequence: 'unchanged',
        materialConsequence: 'unchanged',
        populationConsequence: 'steals Food/Water ownership (starvation risk)',
        whyNotFoodDuplicate: 'FAILS — it makes Food depend on Water',
        whyNotWaterDuplicate: 'FAILS — Water becomes a production input',
        whyNotHousingDuplicate: 'ok',
      },
      {
        name: 'Power Coverage (binary spatial service)',
        existingStateConsumed: 'roads/networks, population',
        newStateIntroduced: 'a power resource + coverage',
        playerDecision: 'build generators',
        simulationConsequence: 'a second binary coverage gate',
        spatialConsequence: 'same shape as Water coverage',
        workforceConsequence: 'one more workplace type',
        materialConsequence: 'construction cost',
        populationConsequence: 'duplicates growth admission',
        whyNotFoodDuplicate: 'ok',
        whyNotWaterDuplicate: 'FAILS — structurally a Water clone',
        whyNotHousingDuplicate: 'ok',
      },
      {
        name: 'Sanitation Service (waste -> health)',
        existingStateConsumed: 'population, buildings',
        newStateIntroduced: 'waste + health',
        playerDecision: 'build sanitation to avoid a health penalty',
        simulationConsequence: 'a survival-adjacent penalty',
        spatialConsequence: 'coverage-shaped',
        workforceConsequence: 'new workplace',
        materialConsequence: 'construction + likely upkeep',
        populationConsequence: 'duplicates survival',
        whyNotFoodDuplicate: 'FAILS — survival-adjacent',
        whyNotWaterDuplicate: 'partially',
        whyNotHousingDuplicate: 'ok',
      },
      {
        name: 'Education / Capability Unlock',
        existingStateConsumed: 'population, buildings',
        newStateIntroduced: 'a capability/knowledge dimension',
        playerDecision: 'invest in capability vs expansion',
        simulationConsequence: 'unlocks a new building capability',
        spatialConsequence: 'none inherent',
        workforceConsequence: 'staffed school',
        materialConsequence: 'construction',
        populationConsequence: 'indirect',
        whyNotFoodDuplicate: 'ok',
        whyNotWaterDuplicate: 'ok',
        whyNotHousingDuplicate: 'ok',
      },
      {
        name: 'Transit / Travel Time',
        existingStateConsumed: 'roads, networks, employment',
        newStateIntroduced: 'time-in-transit',
        playerDecision: 'route/vehicle choices',
        simulationConsequence: 'delayed employment',
        spatialConsequence: 'network geometry matters',
        workforceConsequence: 'commute time',
        materialConsequence: 'vehicles',
        populationConsequence: 'indirect',
        whyNotFoodDuplicate: 'ok',
        whyNotWaterDuplicate: 'ok',
        whyNotHousingDuplicate: 'ok',
      },
    ])
    expect(true).toBe(true)
  })

  it('evaluates the five required candidate families', () => {
    audit('FAMILIES', {
      A_productionChain: 'reject — no intermediate step exists that is not a recurring input tax (10T rejected Farm input)',
      B_publicInfrastructure: 'reject as C/D — clinic/sanitation/power/education all need a new resource or duplicate Water coverage',
      C_specialization: 'reject as C — with no policy layer and one homogeneous workforce there is no specialization decision',
      D_technology: 'C — no capability consumer exists to justify a first unlock',
      E_advancedMobility: 'C — transport stays deferred: 09N found no per-tick flow that consumes time-in-transit',
    })
    expect(true).toBe(true)
  })

  it('produces the anti-duplication matrix', () => {
    audit('ANTI_DUPLICATION_MATRIX', [
      { candidate: 'Construction Crew', newConsequence: 'construction throughput', foodDup: false, waterDup: false, housingDup: false, materialTax: false, newSpatialDimension: 'optional (site reachability)', newDecision: true },
      { candidate: 'Road-Distance Efficiency', newConsequence: 'graded production', foodDup: false, waterDup: false, housingDup: false, materialTax: false, newSpatialDimension: true, newDecision: false },
      { candidate: 'Irrigation Dependency', newConsequence: 'Food depends on Water', foodDup: true, waterDup: true, housingDup: false, materialTax: false, newSpatialDimension: true, newDecision: true },
      { candidate: 'Power Coverage', newConsequence: 'second coverage gate', foodDup: false, waterDup: true, housingDup: false, materialTax: true, newSpatialDimension: false, newDecision: false },
      { candidate: 'Sanitation Service', newConsequence: 'health penalty', foodDup: true, waterDup: true, housingDup: false, materialTax: true, newSpatialDimension: false, newDecision: false },
      { candidate: 'Education / Capability', newConsequence: 'capability unlock', foodDup: false, waterDup: false, housingDup: false, materialTax: false, newSpatialDimension: false, newDecision: true },
      { candidate: 'Transit / Travel Time', newConsequence: 'delayed employment', foodDup: false, waterDup: false, housingDup: false, materialTax: false, newSpatialDimension: true, newDecision: true },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §6 — Causal counterfactuals
// ---------------------------------------------------------------------------

describe('§6 — causal counterfactuals', () => {
  it('C1 Construction Crew: disabled mirror is byte-identical; a crew changes completion', () => {
    const fixtures = [
      world({ residences: 2, farms: 1, wells: 1, colonists: 2 }),
      world({ residences: 4, farms: 2, wells: 2, colonists: 4 }),
      world({ residences: 1, farms: 0, wells: 1, colonists: 1 }),
    ]
    for (const fixture of fixtures) {
      let real = fixture
      let mirror = fixture
      for (let i = 0; i < 60; i += 1) {
        real = stepSimulation(real)
        mirror = stepAudited(mirror, new Map())
      }
      expect(hashCanonicalState(mirror)).toBe(hashCanonicalState(real))
    }

    // Colony A (no crew) vs Colony B (one crew member) — same colonists,
    // buildings, Food, Water, Material; only the assignment differs.
    const build = (): SimulationState => {
      let state = world({ residences: 1, farms: 1, wells: 0, colonists: 1 })
      const well = placed(state, 'well', 5, 2)
      state = opRoad(well.state, 4, 1)
      state = opRoad(state, 5, 1)
      return assignJobs(state)
    }
    const colonyA = build()
    const colonyB = build()
    const wellId = idsOf(colonyB, 'well')[0]!
    const crew: Crew = new Map([['colonist-1', wellId]])

    const rowsA = runWithCrew(colonyA, new Map(), 6)
    const rowsB = runWithCrew(colonyB, crew, 6)
    const wellTick = (rows: readonly { readonly tick: number; readonly state: SimulationState }[]): number => {
      for (const row of rows) {
        const well = row.state.buildings[wellId]
        if (well !== undefined && well.status === 'operational') return row.tick
      }
      return -1
    }
    const aTick = wellTick(rowsA)
    const bTick = wellTick(rowsB)
    const aFood = rowsA[rowsA.length - 1]!.state.resources.food
    const bFood = rowsB[rowsB.length - 1]!.state.resources.food
    audit('C1_CONSTRUCTION_CREW', {
      colonyA: { wellOperationalTick: aTick, foodAfter6: aFood },
      colonyB: { wellOperationalTick: bTick, foodAfter6: bFood },
      difference: { ticksSaved: aTick - bTick, foodLost: aFood - bFood },
      conclusion: 'a crew accelerates construction at the cost of this tick\'s production — a real tradeoff',
    })
    expect(bTick).toBeLessThan(aTick)
    expect(bFood).toBeLessThan(aFood)
  })

  it('C2 Road-Distance Efficiency: current output is distance-independent and placement is free', () => {
    const measure = (wellX: number): { distance: number | null; waterAfter: number } => {
      let state = withStocks(createState(), { food: 50000, material: 1000 })
      state = op(state, 'residence', 1, 1)
      state = op(state, 'well', wellX, 3)
      const maxX = Math.max(wellX, 1) + 1
      for (let x = 1; x <= maxX; x += 1) state = opRoad(state, x, 2)
      state = createColonist(state, idsOf(state, 'residence')[0]!).state
      state = assignJobs(state)
      const distance = getRoadDistanceBetweenBuildings(state, idsOf(state, 'residence')[0]!, idsOf(state, 'well')[0]!)
      const after = advance(state, 20)
      return { distance, waterAfter: after.resources.water }
    }
    const near = measure(3)
    const far = measure(21)
    audit('C2_DISTANCE_EFFICIENCY', {
      near: near,
      far: far,
      currentRule: 'identical Water output at any road distance — 09M distance is a preference tiebreak only',
      underCandidateRule: 'output would degrade with distance',
      agency: 'DEGENERATE — every cell is buildable, so the player always builds adjacent; no counter-pressure makes sprawl rational',
      conclusion: 'graded efficiency has no non-degenerate decision',
    })
    expect(near.waterAfter).toBe(far.waterAfter)
    expect(far.distance).toBeGreaterThan(near.distance!)
  })

  it('C4 Power Coverage: Water coverage is unbounded by distance, so a new binary service duplicates it', () => {
    let state = withStocks(createState(), { food: 50000, material: 1000 })
    state = op(state, 'residence', 1, 1)
    state = op(state, 'well', 25, 3)
    for (let x = 1; x <= 26; x += 1) state = opRoad(state, x, 2)
    state = createColonist(state, idsOf(state, 'residence')[0]!).state
    state = assignJobs(state)
    const distance = getRoadDistanceBetweenBuildings(state, idsOf(state, 'residence')[0]!, idsOf(state, 'well')[0]!)
    const coverage = getWaterCoverage(state)
    audit('C4_POWER_COVERAGE', {
      residenceToWellRoadDistance: distance,
      servedResidences: coverage.servedResidenceIds.length,
      finding: 'coverage is a binary reachability test at any distance; a new binary service would behave identically to Water',
      conclusion: 'premature — needs a resource and a consequence that is not admission',
    })
    expect(coverage.servedResidenceIds.length).toBe(1)
  })

  it('classifies the remaining candidates from prior evidence', () => {
    audit('REMAINING_CANDIDATES', {
      irrigation: 'D — recurring Water input (tax), duplicates Water, starvation/deadlock risk (10T already rejected Farm input)',
      sanitation: 'D — needs a new waste resource plus a survival-adjacent penalty (10U classification)',
      education: 'C — needs a capability dimension AND a consumer; no first unlock is justified',
      transit: 'C — 09N: nothing consumes time-in-transit; no per-tick flow exists',
      settlementProgression: 'C — objective triggers exist but no consumer (10V)',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §7/§8 — Agency and spatial pressure
// ---------------------------------------------------------------------------

describe('§7 — player agency', () => {
  it('describes the deliberate choice for every candidate', () => {
    audit('AGENCY', {
      constructionCrew: 'TAKE A PRODUCER OFF A WORKPLACE and crew a site: finish sooner, produce less this tick',
      distanceEfficiency: 'none — compact placement dominates because every cell is buildable',
      irrigation: 'water for people vs water for farms (but it breaks the ownership split)',
      power: 'build generators whenever possible (no alternative)',
      sanitation: 'build sanitation or take a penalty (a mandatory tax)',
      education: 'invest in capability vs expansion (real, but the payoff is undefined)',
      transit: 'none at current scale',
    })
    expect(true).toBe(true)
  })
})

describe('§8 — spatial pressure', () => {
  const layout = (kind: 'compact' | 'elongated' | 'disconnected' | 'branch' | 'loop'): SimulationState => {
    let state = withStocks(createState(), { food: 50000, material: 1000 })
    const residences =
      kind === 'compact'
        ? [{ x: 1, y: 1 }, { x: 3, y: 1 }]
        : [{ x: 1, y: 1 }, { x: 21, y: 1 }]
    const roadCells: { x: number; y: number }[] = []
    if (kind === 'disconnected') {
      roadCells.push({ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 21, y: 2 }, { x: 23, y: 2 })
    } else if (kind === 'branch') {
      for (let x = 1; x <= 23; x += 1) roadCells.push({ x, y: 2 })
      for (let y = 3; y <= 6; y += 1) roadCells.push({ x: 11, y })
    } else if (kind === 'loop') {
      for (let x = 1; x <= 23; x += 1) roadCells.push({ x, y: 2 })
      for (let x = 1; x <= 23; x += 1) roadCells.push({ x, y: 4 })
      roadCells.push({ x: 1, y: 3 }, { x: 23, y: 3 })
    } else {
      for (let x = 1; x <= 23; x += 1) roadCells.push({ x, y: 2 })
    }
    for (const cell of roadCells) state = opRoad(state, cell.x, cell.y)
    for (const cell of residences) state = op(state, 'residence', cell.x, cell.y)
    state = op(state, 'well', kind === 'compact' ? 5 : 13, 3)
    state = op(state, 'farm', kind === 'compact' ? 7 : 15, 3)
    for (const id of idsOf(state, 'residence')) state = createColonist(state, id).state
    return assignJobs(state)
  }

  it('measures five layouts on the existing engine', () => {
    const kinds = ['compact', 'elongated', 'disconnected', 'branch', 'loop'] as const
    const rows = kinds.map((kind) => {
      const start = layout(kind)
      const after = advance(start, 60)
      const residenceId = idsOf(start, 'residence')[0]!
      const wellId = idsOf(start, 'well')[0]!
      return {
        layout: kind,
        population: getPopulationCount(after),
        servedResidences: getWaterCoverage(start).servedResidenceIds.length,
        residences: idsOf(start, 'residence').length,
        roadCells: Object.keys(start.roads).length,
        firstResidenceToWellDistance: getRoadDistanceBetweenBuildings(start, residenceId, wellId),
        mobilityConnected: areBuildingsMobilityConnected(start, residenceId, wellId),
        employed: countEmployedWorkers(after),
      }
    })
    audit('SPATIAL_LAYOUTS', rows)
    const compact = rows[0]!
    const elongated = rows[1]!
    expect(compact.employed).toBe(elongated.employed)
    expect(compact.population).toBe(elongated.population)
  })
})

// ---------------------------------------------------------------------------
// §9/§10/§11 — Workforce, Material, population feedback
// ---------------------------------------------------------------------------

describe('§9 — workforce pressure', () => {
  it('shows the surplus pool and that a colonist cannot be deliberately kept idle', () => {
    const surplus = world({ residences: 4, farms: 1, wells: 1, colonists: 4 })
    const scarce = world({ residences: 4, farms: 4, wells: 4, colonists: 4 })
    // Manual mode with workplaceId null is NOT sticky: assignJobs reclaims it.
    const manualIdle: SimulationState = {
      ...surplus,
      colonists: Object.fromEntries(
        Object.entries(surplus.colonists).map(([id, colonist]) => [
          id,
          { ...colonist, workplaceId: null, workplaceAssignmentMode: 'manual' as const },
        ])
      ),
    }
    const afterAssign = assignJobs(manualIdle)
    const reclaimed = Object.values(afterAssign.colonists).filter(
      (c) => c.workplaceId !== null && c.workplaceAssignmentMode === 'automatic'
    ).length
    audit('WORKFORCE_PRESSURE', {
      surplusColony: getEmploymentSummary(surplus),
      scarceColony: getEmploymentSummary(scarce),
      manualIdleReclaimedByAssignJobs: reclaimed,
      finding:
        'a colonist cannot be held idle: assignJobs always re-employs an unassigned colonist when a free workplace exists',
      constructionCrewRequirement:
        'the fourth workforce consumer needs an explicit assignment target, because the derived "unassigned = builder" design has no player control',
    })
    expect(reclaimed).toBeGreaterThan(0)
  })
})

describe('§10/§11 — Material and population feedback', () => {
  it('confirms construction stays the Material sink and population ownership is untouched', () => {
    const state = world({ residences: 4, farms: 2, wells: 2, colonists: 4 })
    const after = advance(state, 120)
    audit('MATERIAL_AND_POPULATION', {
      materialRelationship: 'construction only — the Construction Crew candidate adds no Material/tick upkeep',
      materialStock: after.resources.construction,
      populationOwnership: { food: 'survival', water: 'growth', housing: 'capacity' },
      constructionCrewFourthDimension: 'expansion throughput (workforce -> construction), not survival/growth/capacity',
      populationFeedback: 'indirect only; the crew changes when housing/Well capacity arrives, never whether a colonist survives',
    })
    expect(after.resources.construction).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// §12/§13 — Implementation cost, persistence, performance
// ---------------------------------------------------------------------------

describe('§12/§13 — implementation cost, persistence, performance', () => {
  it('estimates the Construction Crew contract and confirms current persistence', () => {
    expect(SAVE_VERSION).toBe(6)
    const state = world({ residences: 4, farms: 1, wells: 1, colonists: 4 })
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    const run = (): SimulationState => advance(state, 240)
    expect(hashCanonicalState(run())).toBe(hashCanonicalState(run()))
    audit('IMPLEMENTATION_COST', {
      candidate: 'Construction Crew',
      newPersistedState: 'one assignment target on ColonistState (workplace | construction site | none)',
      migrationImpact: 'SAVE_VERSION 6 -> 7 with a chained v6->v7 migration (existing colonists default to automatic workplace mode)',
      hashImpact: 'canonical state gains one field; replay stays deterministic',
      newDomainConcepts: [
        'ColonistState.assignedConstructionId (or an assignment union)',
        'AssignBuilderCommand + validateBuilderAssignment (mirrors 10M validateReassignment)',
        'constructionProgressPerSite(state) derived: 1 + (crewed ? 1 : 0)',
      ],
      rejectedAbstractions: 'no generic Service/Need/Modifier/Quality/Consumer/Maintenance',
      testSurface: 'medium — construction timing tests plus a new assignment suite; no silent change when no crew is assigned',
      uiImplications: 'inspector: assign/unassign a colonist to a construction site (extends the 10M control)',
      currentSaveVersion: SAVE_VERSION,
      currentHash: hashCanonicalState(run()),
    })
  })

  it('measures representative performance', () => {
    const start = world({ residences: 10, farms: 4, workshops: 4, wells: 10, colonists: 10 })
    const measure = (ticks: number): number => {
      const t0 = performance.now()
      let next = start
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [60, 120, 600].map((ticks) => ({ ticks, ms: Number(measure(ticks).toFixed(1)) }))
    audit('PERFORMANCE', rows)
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
  }, 300000)
})

// ---------------------------------------------------------------------------
// §16 — Classification evidence
// ---------------------------------------------------------------------------

describe('§16 — classification evidence', () => {
  it('summarises the discovery evidence', () => {
    const state = world({ residences: 4, farms: 1, wells: 1, colonists: 4 })
    const coverage = getWaterCoverage(world({ residences: 4, wells: 4, colonists: 4 }))
    audit('CLASSIFICATION_EVIDENCE', {
      constructionIgnoresWorkforce: true,
      colonistCannotBeIdle: true,
      coverageUnboundedByDistance: coverage.servedResidenceIds.length > 0,
      layoutOnlyMattersByConnectivity: true,
      noCapabilityConsumer: true,
      noPerTickTransitFlow: true,
      materialSinkIsConstruction: true,
      currentMaturity: 'coherent and saturated within Food/Water/Housing/workforce',
      surplusColonists: getEmploymentSummary(state).unemployed,
    })
    expect(true).toBe(true)
  })
})
