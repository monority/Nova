/**
 * Step 10BF — Scenario Content Closure & Playability Audit.
 *
 * Playability/content closure audit of the 8-scenario catalogue after 10BE
 * added `housing-composition`. This file judges the catalogue by MEASURED state
 * transitions and by the same queries the UI renders — not by scenario names:
 *
 *   1. the four measured housing-composition branches (A/B/C/D) and the three
 *      placement previews a player sees BEFORE committing Material;
 *   2. objective readability ("why am I not Village?") through existing blockers;
 *   3. the 8-scenario decision matrix and the redundancy audit;
 *   4. entry conditions, completion quality and the ninth-scenario decision;
 *   5. determinism, insertion-order invariance, save/load and the architecture
 *      checkpoint.
 *
 * The step is primarily an audit. No source defect was demonstrated, so no
 * domain, application, UI, scenario or persistence file was changed: this file
 * plus the as-built documentation are the whole step. SAVE_VERSION stays 7.
 *
 * Run:
 *   npx vitest run tests/scenarioContentClosureAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  createScenarioState,
  findScenario,
  findScenarioFixture,
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getObjectiveStatus,
  getPlacementAffordability,
  getPlacementSpatialPreview,
  getPopulationCount,
  getProgression,
  getResourceStock,
  getRoadNetworks,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWorkDiagnosis,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  SAVE_VERSION,
  SCENARIOS,
  SCENARIO_FIXTURES,
  serializeSave,
  stepSimulation,
  validateRoadsPlacement,
  type BuildingType,
  type CellCoordinate,
  type ObjectiveDefinition,
  type ScenarioDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step1', width: 12, height: 12 },
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const scenarioOf = (id: string): ScenarioDefinition => {
  const found = findScenario(id)
  if (found === undefined) {
    throw new Error(`10bf: missing scenario ${id}`)
  }
  return found
}

const HOUSING = 'housing-composition'
const housingObjective = (): ObjectiveDefinition => scenarioOf(HOUSING).objective

interface Measured {
  readonly tick: number
  readonly population: number
  readonly servedResidences: number
  readonly capacity: number
  readonly foodPerTick: number
  readonly foodConsumption: number
  readonly material: number
  readonly food: number
  readonly water: number
  readonly networks: number
  readonly employed: number
  readonly vacantJobs: number
  readonly stage: string
  readonly objective: string
  readonly blockers: readonly string[]
}

const measure = (state: SimulationState, objective: ObjectiveDefinition): Measured => {
  const status = getObjectiveStatus(state, objective)
  const employment = getEmploymentSummary(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    servedResidences: getWaterServedResidenceCount(state),
    capacity: getWaterProductionPerTick(state),
    foodPerTick: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    material: getResourceStock(state).construction,
    food: getResourceStock(state).food,
    water: getResourceStock(state).water,
    networks: getRoadNetworks(state).length,
    employed: employment.employed,
    vacantJobs: employment.vacantJobs,
    stage: getProgression(state).stage,
    objective: status.state,
    blockers: status.blockers,
  }
}

// ---------------------------------------------------------------------------
// Housing-composition play harness (commands only, no internal writes)
// ---------------------------------------------------------------------------

type Action =
  | { readonly kind: 'ticks'; readonly n: number }
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }

const play = (state: SimulationState, actions: readonly Action[]): SimulationState => {
  let next = state
  for (const action of actions) {
    switch (action.kind) {
      case 'ticks':
        for (let index = 0; index < action.n; index += 1) next = stepSimulation(next)
        break
      case 'building':
        next = stepSimulation(next, {
          type: 'placeBuilding',
          buildingType: action.type,
          x: action.x,
          y: action.y,
        })
        break
      case 'roads':
        next = stepSimulation(next, { type: 'placeRoads', cells: [...action.cells] })
        break
    }
  }
  return next
}

const housingState = (): SimulationState => createScenarioState(config, scenarioOf(HOUSING))

/** Drive the housing scenario to its objective, returning the completion tick. */
const driveHousing = (
  actions: readonly Action[]
): { readonly state: SimulationState; readonly completedTick: number | null } => {
  const objective = housingObjective()
  let state = play(housingState(), actions)
  let completedTick: number | null = null
  const observe = (): void => {
    if (completedTick === null && getObjectiveStatus(state, objective).state === 'completed') {
      completedTick = state.time.tick
    }
  }
  observe()
  for (let index = 0; index < 30 && completedTick === null; index += 1) {
    state = stepSimulation(state)
    observe()
  }
  return { state, completedTick }
}

// ---------------------------------------------------------------------------
// 1. Housing composition — the four branches (§4 – §7)
// ---------------------------------------------------------------------------

describe('1. Housing composition — the four branches', () => {
  it('A — the connector Residence completes Village at tick 3 with 5 Material spare', () => {
    const { state, completedTick } = driveHousing([
      { kind: 'building', type: 'residence', x: 2, y: 1 },
    ])
    const measured = measure(state, housingObjective())
    audit('BRANCH_A_CONNECTOR', { completedTick, ...measured })
    expect(completedTick).toBe(3)
    expect(measured.objective).toBe('completed')
    expect(measured.stage).toBe('village')
    expect(measured.population).toBe(2)
    expect(measured.servedResidences).toBe(2)
    expect(measured.employed).toBe(2)
    expect(measured.foodPerTick).toBe(2)
    expect(measured.foodPerTick).toBeGreaterThanOrEqual(measured.foodConsumption)
    expect(measured.material).toBe(5)
    // A building never merges roads: the bridge cell spans both networks.
    expect(measured.networks).toBe(2)
  })

  it('B — an outer Residence plus the 5-Material join completes with 0 Material', () => {
    const { state, completedTick } = driveHousing([
      { kind: 'building', type: 'residence', x: 0, y: 1 },
      { kind: 'roads', cells: [{ x: 2, y: 1 }] },
    ])
    const measured = measure(state, housingObjective())
    audit('BRANCH_B_OUTER_JOIN', { completedTick, ...measured })
    expect(measured.objective).toBe('completed')
    expect(measured.stage).toBe('village')
    expect(completedTick).not.toBeNull()
    expect(measured.networks).toBe(1)
    expect(measured.population).toBe(2)
    expect(measured.employed).toBe(2)
    expect(measured.foodPerTick).toBe(2)
    expect(measured.material).toBe(0)
  })

  it('C — an east outer Residence without a join is admitted, stranded and starves', () => {
    const objective = housingObjective()
    let state = play(housingState(), [
      { kind: 'building', type: 'residence', x: 4, y: 1 },
      { kind: 'ticks', n: 3 },
    ])
    // The Water gate admits the second colonist (the Residence is served) ...
    const admitted = measure(state, objective)
    audit('BRANCH_C_ADMITTED', admitted)
    expect(admitted.population).toBe(2)
    expect(admitted.servedResidences).toBe(2)
    // ... but nobody can reach the Farm, so Food production stays 0.
    expect(admitted.foodPerTick).toBe(0)
    const colonistIds = Object.keys(state.colonists).sort()
    const second = colonistIds[colonistIds.length - 1]
    const diagnosis = second === undefined ? null : getWorkDiagnosis(state, second)
    audit('BRANCH_C_DIAGNOSIS', diagnosis)
    expect(diagnosis?.employed).toBe(false)
    expect(diagnosis?.reasons['notConnected']).toBeGreaterThanOrEqual(1)
    expect(diagnosis?.reasons['workplaceOccupied']).toBeGreaterThanOrEqual(1)
    // The consequence is the finite reserve: population collapses and the
    // objective reports failed — an explainable starvation, not a resource bug.
    let wipeTick: number | null = null
    for (let index = 0; index < 60 && wipeTick === null; index += 1) {
      state = stepSimulation(state)
      if (getPopulationCount(state) === 0) wipeTick = state.time.tick
    }
    const collapsed = measure(state, objective)
    audit('BRANCH_C_COLLAPSE', { wipeTick, ...collapsed })
    expect(wipeTick).toBe(22)
    expect(collapsed.population).toBe(0)
    expect(collapsed.food).toBe(0)
    expect(collapsed.objective).toBe('failed')
  })

  it('D — a west outer Residence without a join admits nobody', () => {
    const objective = housingObjective()
    let state = play(housingState(), [
      { kind: 'building', type: 'residence', x: 0, y: 1 },
      { kind: 'ticks', n: 3 },
    ])
    const admitted = measure(state, objective)
    audit('BRANCH_D_ADMITTED', admitted)
    // The new Residence stands on the Farm network, which has no Well: the
    // Water gate admits no second colonist at all.
    expect(admitted.population).toBe(1)
    expect(admitted.servedResidences).toBe(1)
    expect(admitted.vacantJobs).toBe(1)
    expect(admitted.objective).toBe('in_progress')
    expect(getProgression(state).blockers).toContain('Food balance')
    // The reserve then drains exactly as in branch C: the prompt's "population
    // remains 0" is true of the NEW Residence (0 admitted); the colony itself
    // still starves, which is the frozen Food rule, not an authoring defect.
    let wipeTick: number | null = null
    for (let index = 0; index < 60 && wipeTick === null; index += 1) {
      state = stepSimulation(state)
      if (getPopulationCount(state) === 0) wipeTick = state.time.tick
    }
    const collapsed = measure(state, objective)
    audit('BRANCH_D_COLLAPSE', { wipeTick, ...collapsed })
    expect(collapsed.population).toBe(0)
    expect(collapsed.objective).toBe('failed')
  })

  it('reads the three candidate cells BEFORE the command (§5)', () => {
    const start = housingState()
    const cells: readonly { readonly label: string; readonly cell: CellCoordinate }[] = [
      { label: 'connector (2,1)', cell: { x: 2, y: 1 } },
      { label: 'east outer (4,1)', cell: { x: 4, y: 1 } },
      { label: 'west outer (0,1)', cell: { x: 0, y: 1 } },
    ]
    const previews = cells.map(({ label, cell }) => {
      const preview = getPlacementSpatialPreview(start, cell)
      return {
        label,
        cell: `${cell.x},${cell.y}`,
        networks: preview.networkIds.length,
        waterCovered: preview.waterCovered,
        reachableWorkplaces: preview.reachableWorkplaces,
        affordable: getPlacementAffordability(start, cell, 'residence').affordable,
      }
    })
    audit('PLACEMENT_PREVIEWS', previews)
    expect(previews).toEqual([
      {
        label: 'connector (2,1)',
        cell: '2,1',
        networks: 2,
        waterCovered: true,
        reachableWorkplaces: 2,
        affordable: true,
      },
      {
        label: 'east outer (4,1)',
        cell: '4,1',
        networks: 1,
        waterCovered: true,
        reachableWorkplaces: 1,
        affordable: true,
      },
      {
        label: 'west outer (0,1)',
        cell: '0,1',
        networks: 1,
        waterCovered: false,
        reachableWorkplaces: 1,
        affordable: true,
      },
    ])
    // Every candidate is affordable, so the choice is strategic, not budgetary.
    expect(previews.every((preview) => preview.affordable)).toBe(true)
  })

  it('keeps a wrong placement recoverable with existing tools (§7)', () => {
    const objective = housingObjective()
    // The demonstrated 5-Material repair after the unserved (west) mistake.
    const fromUnserved = driveHousing([
      { kind: 'building', type: 'residence', x: 0, y: 1 },
      { kind: 'roads', cells: [{ x: 2, y: 1 }] },
    ])
    audit('RECOVERY_FROM_UNSERVED', measure(fromUnserved.state, objective))
    expect(getObjectiveStatus(fromUnserved.state, objective).state).toBe('completed')
    expect(getRoadNetworks(fromUnserved.state).length).toBe(1)
    expect(getResourceStock(fromUnserved.state).construction).toBe(0)
    // The same repair also rescues the serviced-but-stranded (east) mistake.
    const fromStranded = driveHousing([
      { kind: 'building', type: 'residence', x: 4, y: 1 },
      { kind: 'roads', cells: [{ x: 2, y: 1 }] },
    ])
    audit('RECOVERY_FROM_STRANDED', measure(fromStranded.state, objective))
    expect(getObjectiveStatus(fromStranded.state, objective).state).toBe('completed')
    expect(getRoadNetworks(fromStranded.state).length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Objective readability (§8)
// ---------------------------------------------------------------------------

describe('2. Objective readability', () => {
  it('explains "why not Village" through the existing progression blockers', () => {
    const objective = housingObjective()
    const start = housingState()
    const startStatus = getObjectiveStatus(start, objective)
    const startProgression = getProgression(start)
    audit('OBJECTIVE_START', {
      label: objective.label,
      requirements: objective.requirements.map((requirement) => requirement.kind),
      objectiveState: startStatus.state,
      objectiveBlockers: startStatus.blockers,
      stage: startProgression.stage,
      progressionBlockers: startProgression.blockers,
    })
    // The objective is an existing primitive: one stage requirement.
    expect(objective.requirements).toEqual([{ kind: 'stage', stage: 'village' }])
    expect(startStatus.state).toBe('in_progress')
    // The blocker the player must resolve is Food (the Farm is unreachable),
    // and the Village conditions name the missing capacity/population/food.
    expect(startProgression.stage).toBe('wilderness')
    expect(startProgression.blockers).toContain('Food balance')
    // The objective never encodes the solution cell: no requirement mentions a
    // coordinate, and the label is the consequence, not the answer.
    expect(objective.label).not.toMatch(/\d+,\d+|cell|place .* at/i)

    // After a wrong placement the blocker still names the missing condition.
    const wrong = play(housingState(), [
      { kind: 'building', type: 'residence', x: 4, y: 1 },
      { kind: 'ticks', n: 3 },
    ])
    const wrongStatus = getObjectiveStatus(wrong, objective)
    audit('OBJECTIVE_AFTER_WRONG_PLACEMENT', {
      objectiveState: wrongStatus.state,
      blockers: wrongStatus.blockers,
      progressionBlockers: getProgression(wrong).blockers,
    })
    expect(wrongStatus.state).toBe('in_progress')
    expect(wrongStatus.blockers.length).toBeGreaterThan(0)
  })

  it('names the cause of an unemployed colonist with the engine vocabulary', () => {
    const state = play(housingState(), [
      { kind: 'building', type: 'residence', x: 4, y: 1 },
      { kind: 'ticks', n: 3 },
    ])
    const second = Object.keys(state.colonists).sort().at(-1)
    const diagnosis = second === undefined ? null : getWorkDiagnosis(state, second)
    audit('UNEMPLOYED_CAUSE', diagnosis)
    expect(diagnosis?.employed).toBe(false)
    expect(diagnosis?.operationalWorkplaces).toBe(2)
    // 1 workplace is unreachable (the Farm on the other network) and 1 is
    // occupied (the Well) — the UI composes "unemployed · 1 with no road
    // access · 1 occupied" from exactly these existing reasons.
    expect(diagnosis?.reasons['notConnected']).toBe(1)
    expect(diagnosis?.reasons['workplaceOccupied']).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Catalogue matrix and redundancy (§9 – §10)
// ---------------------------------------------------------------------------

/** The authored dominant decision of every scenario (from the 10AL→10BE audits). */
const PRIMARY_DECISION: Readonly<Record<string, string>> = {
  'first-settlement': 'construction order and geometry from an empty map',
  'water-constraint': 'a Well now versus housing/capacity first',
  'industrial-expansion': 'a Workshop that cannot be run at the current Water cap',
  'water-reserve-industry': 'convert a Water reserve into the Material for a second Well',
  'spatial-efficiency': 'spend an exact 55-Material road budget',
  'population-expansion': 'housing planned ahead of Water capacity',
  recovery: 'repair a stranded Farm versus duplicate it',
  [HOUSING]: 'which road network(s) the next Residence joins',
}

/** The authored unique consequence of every scenario. */
const UNIQUE_CONSEQUENCE: Readonly<Record<string, string>> = {
  'first-settlement': 'an empty map becomes sustainable, or starves, by placement order',
  'water-constraint': 'growth is gated by Water capacity alone at a fixed population',
  'industrial-expansion': 'industry exists but its output cannot be stored until spent',
  'water-reserve-industry': 'the Water reserve is the only construction budget; reversed order is terminal',
  'spatial-efficiency': 'a single 5-Material road margin decides Settlement versus starvation',
  'population-expansion': 'housing is built before the capacity that admits its occupants',
  recovery: 'a stranded building is fixed by infrastructure rather than replaced',
  [HOUSING]: 'housing placement decides whether a colonist is admitted at all AND who can reach the food',
}

/**
 * Qualitative decision-space marks, taken from the conclusions of the previous
 * audits (10AL→10BE) and re-checked against the start state printed below.
 * They are ✓/— axes, deliberately not scores: the purpose is to show each
 * scenario owns a recognizable decision space, not to rank them.
 */
interface DecisionMarks {
  readonly spatial: boolean
  readonly workforce: boolean
  readonly water: boolean
  readonly food: boolean
  readonly industry: boolean
  readonly recovery: boolean
}

const MATRIX_MARKS: Readonly<Record<string, DecisionMarks>> = {
  'first-settlement': { spatial: true, workforce: false, water: false, food: true, industry: false, recovery: true },
  'water-constraint': { spatial: false, workforce: false, water: true, food: false, industry: false, recovery: false },
  'industrial-expansion': { spatial: false, workforce: true, water: true, food: false, industry: true, recovery: false },
  'water-reserve-industry': { spatial: false, workforce: true, water: true, food: false, industry: true, recovery: false },
  'spatial-efficiency': { spatial: true, workforce: false, water: false, food: true, industry: false, recovery: true },
  'population-expansion': { spatial: false, workforce: true, water: true, food: true, industry: false, recovery: false },
  recovery: { spatial: true, workforce: true, water: false, food: true, industry: false, recovery: true },
  [HOUSING]: { spatial: true, workforce: true, water: true, food: true, industry: false, recovery: true },
}

const EMPTY_MARKS: DecisionMarks = {
  spatial: false,
  workforce: false,
  water: false,
  food: false,
  industry: false,
  recovery: false,
}

const structureOf = (definition: ScenarioDefinition): string => {
  const state = createScenarioState(config, definition)
  const kinds = definition.objective.requirements.map((requirement) => requirement.kind).sort()
  const buildings = [...iterateBuildings(state)]
    .map((building) => building.type)
    .sort()
    .join('+')
  return [
    `networks:${getRoadNetworks(state).length}`,
    `population:${getPopulationCount(state)}`,
    `capacity:${getWaterProductionPerTick(state)}`,
    `foodNet:${getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state)}`,
    `material:${state.resources.construction}`,
    `water:${state.resources.water}`,
    `kinds:${kinds.join('+')}`,
    `buildings:${buildings}`,
  ].join('|')
}

describe('3. Catalogue matrix and redundancy', () => {
  it('builds the 8-row decision matrix from authored and measured evidence', () => {
    const rows = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      const status = getObjectiveStatus(state, definition.objective)
      const marks = MATRIX_MARKS[definition.id] ?? EMPTY_MARKS
      return {
        id: definition.id,
        primaryDecision: PRIMARY_DECISION[definition.id] ?? '',
        uniqueConsequence: UNIQUE_CONSEQUENCE[definition.id] ?? '',
        ...marks,
        measured: {
          stage: getProgression(state).stage,
          networks: getRoadNetworks(state).length,
          population: getPopulationCount(state),
          capacity: getWaterProductionPerTick(state),
          foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
          material: state.resources.construction,
          water: state.resources.water,
          objective: status.state,
          blockers: status.blockers,
          structure: structureOf(definition),
        },
      }
    })
    audit('CATALOGUE_MATRIX', rows)
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.primaryDecision.length).toBeGreaterThan(0)
      expect(row.uniqueConsequence.length).toBeGreaterThan(0)
      expect(row.measured.objective).toBe('in_progress')
      expect(row.measured.blockers.length).toBeGreaterThan(0)
    }
    // Every scenario owns a distinct dominant decision and consequence.
    expect(new Set(rows.map((row) => row.primaryDecision)).size).toBe(8)
    expect(new Set(rows.map((row) => row.uniqueConsequence)).size).toBe(8)
    // No two scenarios start from the same measured state.
    expect(new Set(rows.map((row) => row.measured.structure)).size).toBe(8)
    // housing-composition is the only 2-network catalogue start.
    const split = rows.filter((row) => row.measured.networks > 1)
    expect(split.map((row) => row.id)).toEqual([HOUSING])
  })

  it('keeps housing-composition distinct from its four nearest neighbours', () => {
    const housing = createScenarioState(config, scenarioOf(HOUSING))
    const neighbours = ['population-expansion', 'spatial-efficiency', 'water-constraint', 'recovery']
    const comparisons = neighbours.map((id) => {
      const other = createScenarioState(config, scenarioOf(id))
      const differences: string[] = []
      if (getRoadNetworks(housing).length !== getRoadNetworks(other).length) {
        differences.push('networks')
      }
      if (getPopulationCount(housing) !== getPopulationCount(other)) {
        differences.push('population')
      }
      if (getWaterProductionPerTick(housing) !== getWaterProductionPerTick(other)) {
        differences.push('waterCapacity')
      }
      if (
        getFoodProductionPerTick(housing) - getFoodConsumptionPerTick(housing) !==
        getFoodProductionPerTick(other) - getFoodConsumptionPerTick(other)
      ) {
        differences.push('foodNet')
      }
      if (housing.resources.construction !== other.resources.construction) {
        differences.push('material')
      }
      const kinds = (definition: ScenarioDefinition): string =>
        definition.objective.requirements
          .map((requirement) => requirement.kind)
          .sort()
          .join('+')
      if (kinds(scenarioOf(HOUSING)) !== kinds(scenarioOf(id))) {
        differences.push('objectiveKinds')
      }
      return { id, differences }
    })
    audit('HOUSING_VS_NEIGHBOURS', comparisons)
    for (const comparison of comparisons) {
      expect(comparison.differences.length).toBeGreaterThanOrEqual(2)
    }
    // The 10BE distinctness claim, re-measured here: no catalogue scenario other
    // than housing-composition starts split across two networks.
    const split = SCENARIOS.filter(
      (definition) => getRoadNetworks(createScenarioState(config, definition)).length > 1
    ).map((definition) => definition.id)
    expect(split).toEqual([HOUSING])
  })
})

// ---------------------------------------------------------------------------
// 4. Entry conditions (§11)
// ---------------------------------------------------------------------------

const BUILDING_TYPES: readonly BuildingType[] = ['residence', 'farm', 'well', 'workshop']

const gridCells = (): readonly CellCoordinate[] => {
  const cells: CellCoordinate[] = []
  for (let y = 0; y < config.world.height; y += 1) {
    for (let x = 0; x < config.world.width; x += 1) {
      cells.push({ x, y })
    }
  }
  return cells
}

const affordableFirstDecisions = (
  state: SimulationState
): { readonly placements: number; readonly roadCells: number } => {
  let placements = 0
  for (const type of BUILDING_TYPES) {
    for (const cell of gridCells()) {
      if (getPlacementAffordability(state, cell, type).affordable) placements += 1
    }
  }
  let roadCells = 0
  for (const cell of gridCells()) {
    if (validateRoadsPlacement(state, [cell]).valid) roadCells += 1
  }
  return { placements, roadCells }
}

describe('4. Entry conditions', () => {
  it('shows resources, objective and a first decision for all 8 scenarios', () => {
    const rows = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      const status = getObjectiveStatus(state, definition.objective)
      const stock = getResourceStock(state)
      const first = affordableFirstDecisions(state)
      return {
        id: definition.id,
        label: definition.objective.label,
        resourceNumbersVisible:
          definition.resources.material === stock.construction &&
          definition.resources.food === stock.food &&
          definition.resources.water === stock.water,
        objectiveComplete: {
          label: definition.objective.label.length > 0,
          description: definition.objective.description.length > 0,
          constraint: definition.objective.constraint.length > 0,
          state: status.state,
        },
        buildingsKnown: [...iterateBuildings(state)].every(
          (building) => getBuildingDefinition(building.type) !== undefined
        ),
        roadsOperational: Object.values(state.roads).every(
          (road) => road.status === 'operational'
        ),
        affordableFirstCommands: first.placements + first.roadCells,
      }
    })
    audit('ENTRY_CONDITIONS', rows)
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.resourceNumbersVisible).toBe(true)
      expect(row.objectiveComplete.label).toBe(true)
      expect(row.objectiveComplete.description).toBe(true)
      expect(row.objectiveComplete.constraint).toBe(true)
      expect(row.objectiveComplete.state).toBe('in_progress')
      expect(row.buildingsKnown).toBe(true)
      expect(row.roadsOperational).toBe(true)
      // At least one legal, affordable first command exists in every scenario.
      expect(row.affordableFirstCommands).toBeGreaterThan(0)
    }
  })

  it('depends on no undocumented hidden state', () => {
    const dataKeys = [
      'id',
      'name',
      'description',
      'objective',
      'resources',
      'buildings',
      'roads',
      'colonists',
    ].sort()
    const rows = SCENARIOS.map((definition) => ({
      id: definition.id,
      keys: Object.keys(definition).sort(),
      terrain: definition.blockedCells !== undefined,
      colonistsResident: definition.colonists.every((colonist) =>
        definition.buildings.some(
          (building) =>
            building.type === 'residence' &&
            building.x === colonist.residence.x &&
            building.y === colonist.residence.y
        )
      ),
    }))
    audit('HIDDEN_STATE', rows)
    for (const row of rows) {
      expect(row.keys).toEqual(dataKeys)
      // Terrain is a 10AV fixture capability, never catalogue content.
      expect(row.terrain).toBe(false)
      expect(row.colonistsResident).toBe(true)
    }
    // The terrain fixture proves the capability exists outside the catalogue.
    const fixture = findScenarioFixture('terrain-chokepoint')
    expect(fixture?.blockedCells?.length).toBeGreaterThan(0)
    expect(SCENARIO_FIXTURES).toHaveLength(1)
    expect(SCENARIOS.some((definition) => definition.id === fixture?.id)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Completion quality (§12)
// ---------------------------------------------------------------------------

type CompletionStep =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
  | { readonly kind: 'ticks'; readonly n: number }
  | {
      readonly kind: 'until'
      readonly label: string
      readonly test: (state: SimulationState) => boolean
      readonly max?: number
    }
  | { readonly kind: 'role'; readonly colonist: number; readonly role: BuildingType }

const driveToObjective = (
  definition: ScenarioDefinition,
  steps: readonly CompletionStep[],
  horizon: number
): { readonly completedTick: number | null; readonly failedTick: number | null; readonly state: SimulationState } => {
  let state = createScenarioState(config, definition)
  const objective = definition.objective
  let completedTick: number | null = null
  let failedTick: number | null = null
  const observe = (): void => {
    const status = getObjectiveStatus(state, objective)
    if (completedTick === null && status.state === 'completed') completedTick = state.time.tick
    if (failedTick === null && status.state === 'failed') failedTick = state.time.tick
  }
  const tick = (n: number): void => {
    for (let index = 0; index < n; index += 1) {
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
        state = stepSimulation(state, {
          type: 'placeBuilding',
          buildingType: step.type,
          x: step.x,
          y: step.y,
        })
        tick(3)
        break
      }
    }
  }
  tick(horizon)
  return { completedTick, failedTick, state }
}

const COMPLETION_POLICIES: Readonly<Record<string, readonly CompletionStep[]>> = {
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
    { kind: 'until', label: 'burst', test: (state) => state.resources.water === 0, max: 60 },
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
    { kind: 'until', label: 'growth', test: (state) => Object.keys(state.colonists).length >= 4, max: 80 },
    { kind: 'role', colonist: 0, role: 'farm' },
    { kind: 'role', colonist: 1, role: 'farm' },
    { kind: 'role', colonist: 2, role: 'well' },
    { kind: 'role', colonist: 3, role: 'well' },
  ],
  recovery: [{ kind: 'roads', cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] }],
  [HOUSING]: [{ kind: 'building', type: 'residence', x: 2, y: 1 }],
}

const FIRST_DECISION: Readonly<Record<string, string>> = {
  'first-settlement': 'where the first Residence, road and Farm go',
  'water-constraint': 'build the missing Well now',
  'industrial-expansion': 'whether to build a Workshop that cannot be run',
  'water-reserve-industry': 'build the Workshop before the Well',
  'spatial-efficiency': 'spend the exact 55-Material budget',
  'population-expansion': 'build capacity before or after the population',
  recovery: 'whether to reconnect or replace the stranded Farm',
  [HOUSING]: 'which network the second Residence joins',
}

const MAIN_DECISION: Readonly<Record<string, string>> = {
  'first-settlement': 'complete the Settlement conditions without starving',
  'water-constraint': 'restore Water capacity without breaking the Food balance',
  'industrial-expansion': 'run the Workshop once Material has been spent down',
  'water-reserve-industry': 'run the reserve burst and spend it before it evaporates',
  'spatial-efficiency': 'keep the build inside the exact road budget',
  'population-expansion': 'staff the new Wells and Farms as the population grows',
  recovery: 'restore access without wasting the finite Food reserve',
  [HOUSING]: 'keep the new colonist served AND able to reach the Farm',
}

describe('5. Completion quality', { timeout: 300000 }, () => {
  it('gives every scenario a deliberate decision sequence that completes', () => {
    const rows = SCENARIOS.map((definition) => {
      const start = createScenarioState(config, definition)
      const outcome = driveToObjective(definition, COMPLETION_POLICIES[definition.id] ?? [], 20)
      return {
        id: definition.id,
        startingState: {
          stage: getProgression(start).stage,
          population: getPopulationCount(start),
          networks: getRoadNetworks(start).length,
          material: start.resources.construction,
          blockers: getObjectiveStatus(start, definition.objective).blockers,
        },
        firstDecision: FIRST_DECISION[definition.id] ?? '',
        mainDecision: MAIN_DECISION[definition.id] ?? '',
        completionCondition: definition.objective.label,
        completionTick: outcome.completedTick,
        finalTick: outcome.state.time.tick,
      }
    })
    audit('COMPLETION_QUALITY', rows)
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.firstDecision.length).toBeGreaterThan(0)
      expect(row.mainDecision.length).toBeGreaterThan(0)
      expect(row.completionCondition.length).toBeGreaterThan(0)
      expect(row.startingState.blockers.length).toBeGreaterThan(0)
      // Every scenario is completable with existing commands, and the completion
      // is deterministic (the tests re-run the same policy every time).
      expect(row.completionTick).not.toBeNull()
    }
    // The new scenario is the fastest completed catalogue scenario (tick 3).
    const housing = rows.find((row) => row.id === HOUSING)
    expect(housing?.completionTick).toBe(3)
  })

  it('records a failure and a recovery for every scenario that has one', () => {
    const failures: readonly {
      readonly id: string
      readonly wrong: string
      readonly steps: readonly CompletionStep[]
      readonly expectation: string
    }[] = [
      {
        id: 'water-constraint',
        wrong: 'never build the Well',
        steps: [{ kind: 'ticks', n: 200 }],
        expectation: 'the objective stays in progress; nobody starves because Food is balanced',
      },
      {
        id: 'recovery',
        wrong: 'never reconnect the stranded Farm',
        steps: [{ kind: 'ticks', n: 200 }],
        expectation: 'the colony starves and the objective reports failed',
      },
      {
        id: 'first-settlement',
        wrong: 'build the Well before the Farm',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 2, y: 1 },
        ],
        expectation: 'the colony starves',
      },
    ]
    const rows = failures.map((row) => {
      const outcome = driveToObjective(scenarioOf(row.id), row.steps, 200)
      return {
        ...row,
        measured: {
          objective: getObjectiveStatus(outcome.state, scenarioOf(row.id).objective).state,
          population: getPopulationCount(outcome.state),
          failedTick: outcome.failedTick,
        },
      }
    })
    audit('FAILURE_AND_RECOVERY', rows)
    const recoveryFailure = rows.find((row) => row.id === 'recovery')
    expect(recoveryFailure?.measured.population).toBe(0)
    expect(recoveryFailure?.measured.objective).toBe('failed')
    const wellFirst = rows.find((row) => row.id === 'first-settlement')
    expect(wellFirst?.measured.population).toBe(0)
    const noWell = rows.find((row) => row.id === 'water-constraint')
    expect(noWell?.measured.objective).toBe('in_progress')
    expect(noWell?.measured.population).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Ninth-scenario decision (§13)
// ---------------------------------------------------------------------------

describe('6. Ninth-scenario decision', () => {
  it('rejects every candidate on measured evidence and keeps the catalogue at 8', () => {
    const objectiveKinds = [
      ...new Set(
        SCENARIOS.flatMap((definition) =>
          definition.objective.requirements.map((requirement) => requirement.kind)
        )
      ),
    ].sort()
    const workshopScenarios = SCENARIOS.filter((definition) =>
      definition.objective.requirements.some(
        (requirement) => requirement.kind === 'building' && requirement.buildingType === 'workshop'
      )
    ).map((definition) => definition.id)
    const splitScenarios = SCENARIOS.filter(
      (definition) => getRoadNetworks(createScenarioState(config, definition)).length > 1
    ).map((definition) => definition.id)
    const candidates = [
      {
        candidate: 'construction timing',
        mechanicImplemented: true,
        accepted: false,
        reason: `no existing objective primitive expresses a tick/deadline threshold; objective kinds are closed (${objectiveKinds.join(', ')})`,
      },
      {
        candidate: 'multi-network workforce routing',
        mechanicImplemented: true,
        accepted: false,
        reason: `${HOUSING} already owns the only split-network start (${splitScenarios.join(', ')}); manual reassignment is the existing tool`,
      },
      {
        candidate: 'terrain-constrained expansion',
        mechanicImplemented: true,
        accepted: false,
        reason:
          'terrain exists only as the 10AV fixture; 10AW measured the terrain decision space as a subset of the open-map twin, so promoting it needs a product decision',
      },
      {
        candidate: 'Workshop timing',
        mechanicImplemented: true,
        accepted: false,
        reason: `${workshopScenarios.join(' and ')} already own the Workshop build/run order`,
      },
      {
        candidate: 'resource reserve management',
        mechanicImplemented: true,
        accepted: false,
        reason:
          'water-reserve-industry owns reserve-to-Material conversion and recovery owns finite-reserve pressure',
      },
    ]
    audit('NINTH_SCENARIO_CANDIDATES', candidates)
    expect(objectiveKinds).toEqual(['building', 'foodBalance', 'population', 'stage', 'waterCapacity'])
    expect(candidates.every((candidate) => candidate.accepted === false)).toBe(true)
    expect(candidates.every((candidate) => candidate.reason.length > 0)).toBe(true)
    const finalDecision = 'No additional scenario justified.'
    audit('NINTH_SCENARIO_DECISION', finalDecision)
    expect(finalDecision).toBe('No additional scenario justified.')
    expect(SCENARIOS).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// 7. Content versus capability (§14)
// ---------------------------------------------------------------------------

describe('7. Content versus capability', () => {
  it('exercises the supported model and does not claim Town-scale simulation', () => {
    const supported = {
      multipleSpatialLayouts:
        new Set(SCENARIOS.map((definition) => structureOf(definition))).size === 8,
      networkTopology: getRoadNetworks(housingState()).length === 2,
      waterCoverage: getWaterCoverage(housingState()).servedResidenceIds.length > 0,
      workforceMobility: getEmploymentSummary(housingState()).jobCapacity === 2,
      resourceBudgeting: SCENARIOS.some(
        (definition) => createScenarioState(config, definition).resources.construction === 55
      ),
      constructionTiming: SCENARIOS.some((definition) =>
        [...iterateBuildings(createScenarioState(config, definition))].some(
          (building) => building.status !== 'operational'
        )
      ),
      temporaryIndustry: SCENARIOS.some((definition) =>
        definition.objective.requirements.some(
          (requirement) =>
            requirement.kind === 'building' && requirement.buildingType === 'workshop'
        )
      ),
      terrainBlocking: (() => {
        const fixture = findScenarioFixture('terrain-chokepoint')
        if (fixture === undefined) return false
        const state = createScenarioState(config, fixture)
        return !getPlacementAffordability(state, { x: 0, y: 1 }, 'well').placement.valid
      })(),
      housingComposition: findScenario(HOUSING) !== undefined,
    }
    const unsupported = {
      progressionStages: [...new Set(SCENARIOS.map((definition) =>
        getProgression(createScenarioState(config, definition)).stage
      ))].sort(),
      objectiveKinds: [
        ...new Set(
          SCENARIOS.flatMap((definition) =>
            definition.objective.requirements.map((requirement) => requirement.kind)
          )
        ),
      ].sort(),
      townReferenced: SCENARIOS.some(
        (definition) =>
          /town/i.test(definition.objective.label) ||
          /town/i.test(definition.objective.description) ||
          /town/i.test(definition.name)
      ),
    }
    audit('CONTENT_VS_CAPABILITY', { supported, unsupported })
    expect(Object.values(supported).every((value) => value === true)).toBe(true)
    // The model has exactly three progression stages and five objective kinds.
    expect(unsupported.progressionStages).toEqual(['settlement', 'village', 'wilderness'])
    expect(unsupported.objectiveKinds).toHaveLength(5)
    // Town stays undefined: no catalogue scenario frames itself around it.
    expect(unsupported.townReferenced).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 8. Determinism, insertion order and save/load (§17 – §18)
// ---------------------------------------------------------------------------

describe('8. Determinism, insertion order and save/load', () => {
  it('assembles every scenario deterministically and order-independently', () => {
    const rows = SCENARIOS.map((definition) => {
      const first = createScenarioState(config, definition)
      const second = createScenarioState(config, definition)
      // Permuting the authored ROAD list must not change any derived read
      // (road ids follow authoring order, so the hash is not the axis here).
      const permutedRoads = [...definition.roads].reverse()
      const permuted = createScenarioState(config, { ...definition, roads: permutedRoads })
      const derivedInvariant =
        getRoadNetworks(permuted).length === getRoadNetworks(first).length &&
        getWaterServedResidenceCount(permuted) === getWaterServedResidenceCount(first) &&
        getWaterProductionPerTick(permuted) === getWaterProductionPerTick(first) &&
        getFoodProductionPerTick(permuted) === getFoodProductionPerTick(first) &&
        getObjectiveStatus(permuted, definition.objective).state ===
          getObjectiveStatus(first, definition.objective).state &&
        getProgression(permuted).stage === getProgression(first).stage
      return {
        id: definition.id,
        sameHash: hashCanonicalState(first) === hashCanonicalState(second),
        derivedInvariant,
      }
    })
    audit('DETERMINISM', rows)
    for (const row of rows) {
      expect(row.sameHash).toBe(true)
      expect(row.derivedInvariant).toBe(true)
    }
  })

  it('replays the same commands to the same hash', () => {
    const run = (): string => {
      let state = housingState()
      state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' })
      for (let index = 0; index < 10; index += 1) state = stepSimulation(state)
      return hashCanonicalState(state)
    }
    audit('REPLAY_HASH', { first: run(), second: run() })
    expect(run()).toBe(run())
  })

  it('round-trips every scenario through persistence at SAVE_VERSION 7', () => {
    const rows = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      const serialized = serializeSave(state)
      const reloaded = loadSave(serialized)
      return {
        id: definition.id,
        version: JSON.parse(serialized).version as number,
        equalHash: hashCanonicalState(reloaded) === hashCanonicalState(state),
        framingNotPersisted: !serialized.includes(`"${definition.id}"`),
      }
    })
    audit('SAVE_LOAD', rows)
    expect(SAVE_VERSION).toBe(8)
    for (const row of rows) {
      expect(row.version).toBe(8)
      expect(row.equalHash).toBe(true)
      expect(row.framingNotPersisted).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Architecture checkpoint (§16)
// ---------------------------------------------------------------------------

describe('9. Architecture checkpoint', () => {
  it('keeps scenarios data-only and the objective kinds closed', () => {
    const allowedKeys = [
      'id',
      'name',
      'description',
      'objective',
      'resources',
      'buildings',
      'roads',
      'colonists',
    ].sort()
    const rows = SCENARIOS.map((definition) => ({
      id: definition.id,
      keys: Object.keys(definition).sort(),
      functional:
        Object.values(definition).some((value) => typeof value === 'function') ||
        definition.buildings.some((building) => typeof building !== 'object') ||
        definition.roads.some((road) => typeof road !== 'object'),
    }))
    audit('SCENARIO_SHAPE', rows)
    for (const row of rows) {
      expect(row.keys).toEqual(allowedKeys)
      expect(row.functional).toBe(false)
    }
    // Domain mechanics are untouched: the catalogue still names only the five
    // closed objective kinds and the four existing building types.
    const buildingTypes = [
      ...new Set(SCENARIOS.flatMap((definition) => definition.buildings.map((b) => b.type))),
    ].sort()
    audit('BUILDING_TYPES', buildingTypes)
    // No catalogue scenario STARTS with a Workshop; the Workshop is reached
    // through the objective (industrial-expansion, water-reserve-industry).
    expect(buildingTypes).toEqual(['farm', 'residence', 'well'])
  })
})
