/**
 * Scenario objective contract tests (Step 10AN).
 *
 * The objective layer is derived and declarative: a closed set of five
 * requirement kinds, each mapped to an existing authoritative query, and three
 * status values (in_progress / completed / failed). No history, no persistence
 * and no simulation change is involved.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  findScenario,
  getObjectiveStatus,
  getPopulationCount,
  getProgression,
  hashCanonicalState,
  iterateBuildings,
  SCENARIOS,
  serializeCanonicalState,
  stepSimulation,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type ObjectiveDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10an: building missing')
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
  if (id === undefined) throw new Error('10an: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10an: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface SceneSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly { readonly type: BuildingType; readonly x: number; readonly y: number }[]
  readonly roads?: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = createInitialState(shipConfig)
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 100,
      food: spec.food ?? 100,
      water: spec.water ?? 0,
    },
  }
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) {
    state = op(state, placement.type, placement.x, placement.y)
  }
  for (const cell of spec.roads ?? []) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const rowRoads = (maxX: number): CellCoordinate[] =>
  Array.from({ length: maxX + 1 }, (_, x) => ({ x, y: 1 }))

const settlementState = (): SimulationState =>
  scene({
    residences: [{ x: 1, y: 0 }],
    workplaces: [{ type: 'farm', x: 1, y: 2 }],
    roads: [{ x: 1, y: 1 }],
    colonists: 1,
  })

const villageState = (): SimulationState =>
  scene({
    residences: [
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ],
    workplaces: [
      { type: 'farm', x: 1, y: 2 },
      { type: 'well', x: 3, y: 2 },
    ],
    roads: rowRoads(3),
    colonists: 2,
  })

describe('objective — requirement kinds', () => {
  it('evaluates a stage requirement against the progression stage', () => {
    const wilderness = getObjectiveStatus(createInitialState(shipConfig), {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: false,
    })
    expect(wilderness.met).toBe(false)
    expect(wilderness.requirements[0]?.label).toBe('Reach Settlement')
    expect(wilderness.requirements[0]?.detail).toBe('stage wilderness')
    const settlement = getObjectiveStatus(settlementState(), {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: false,
    })
    expect(settlement.met).toBe(true)
    // A Village satisfies a Settlement requirement (rank comparison).
    expect(
      getObjectiveStatus(villageState(), {
        label: 'x',
        description: 'x',
        constraint: 'x',
        requirements: [{ kind: 'stage', stage: 'settlement' }],
        failsWithoutColonists: false,
      }).met
    ).toBe(true)
    expect(
      getObjectiveStatus(settlementState(), {
        label: 'x',
        description: 'x',
        constraint: 'x',
        requirements: [{ kind: 'stage', stage: 'village' }],
        failsWithoutColonists: false,
      }).met
    ).toBe(false)
  })

  it('evaluates population, Water capacity, Food balance and building requirements', () => {
    const state = villageState()
    const objective: ObjectiveDefinition = {
      label: 'combined',
      description: 'x',
      constraint: 'x',
      requirements: [
        { kind: 'population', atLeast: 2 },
        { kind: 'waterCapacity', atLeast: WATER_PER_WELL_PER_TICK },
        { kind: 'foodBalance' },
        { kind: 'building', buildingType: 'well', atLeast: 1 },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
      ],
      failsWithoutColonists: false,
    }
    const status = getObjectiveStatus(state, objective)
    expect(status.requirements.map((entry) => entry.met)).toEqual([true, true, true, true, false])
    expect(status.blockers).toEqual(['Workshop built'])
    expect(status.requirements[1]?.detail).toBe('capacity 2 / tick')
    expect(status.requirements[3]?.detail).toBe('1 operational Well')
    expect(status.state).toBe('in_progress')
  })
})

describe('objective — status semantics', () => {
  it('reports completed only when every requirement holds', () => {
    const objective: ObjectiveDefinition = {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'stage', stage: 'village' }],
      failsWithoutColonists: false,
    }
    expect(getObjectiveStatus(settlementState(), objective).state).toBe('in_progress')
    expect(getObjectiveStatus(villageState(), objective).state).toBe('completed')
  })

  it('reports failed when the colony is gone with requirements pending', () => {
    const dead = runTicks(
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
        ],
        workplaces: [],
        roads: rowRoads(5),
        colonists: 3,
        food: 0,
      }),
      5
    )
    expect(getPopulationCount(dead)).toBe(0)
    const status = getObjectiveStatus(dead, {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: true,
    })
    expect(status.state).toBe('failed')
    expect(status.blockers).toEqual(['Reach Settlement'])
    // A completed objective on a dead colony still reports completed first:
    // success is a property of the current state, not of history.
    const triviallyMet = getObjectiveStatus(dead, {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'population', atLeast: 0 }],
      failsWithoutColonists: true,
    })
    expect(triviallyMet.state).toBe('completed')
  })

  it('is momentary: a degraded state falls back to in_progress', () => {
    const objective: ObjectiveDefinition = {
      label: 'x',
      description: 'x',
      constraint: 'x',
      requirements: [{ kind: 'waterCapacity', atLeast: WATER_PER_WELL_PER_TICK }],
      failsWithoutColonists: true,
    }
    const withWell = villageState()
    const withoutWell = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: rowRoads(3),
      colonists: 2,
    })
    expect(getObjectiveStatus(withWell, objective).state).toBe('completed')
    expect(getObjectiveStatus(withoutWell, objective).state).toBe('in_progress')
  })
})

function runTicks(state: SimulationState, ticks: number): SimulationState {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

describe('objective — the six scenario objectives', () => {
  it('evaluates every scenario objective from its starting state', () => {
    const rows = SCENARIOS.map((scenario) => {
      const state = createScenarioState(shipConfig, scenario)
      const status = getObjectiveStatus(state, scenario.objective)
      return {
        scenario: scenario.id,
        state: status.state,
        requirements: status.requirements.length,
        blockers: status.blockers,
        stage: getProgression(state).stage,
      }
    })
    console.log(`AUDIT OBJECTIVE_STARTS: ${JSON.stringify(rows)}`)
    for (const row of rows) {
      expect(row.state).toBe('in_progress')
      expect(row.requirements).toBeGreaterThan(0)
    }
    expect(rows.find((row) => row.scenario === 'industrial-expansion')?.blockers).toEqual([
      'Workshop built',
    ])
    expect(rows.find((row) => row.scenario === 'population-expansion')?.blockers).toEqual([
      'Population 4',
      'Water capacity 4',
    ])
    // The `failsWithoutColonists` flag cannot drift from the scenario data:
    // it is exactly "this scenario starts with colonists".
    for (const scenario of SCENARIOS) {
      const initialPopulation = createScenarioState(shipConfig, scenario).colonists
      expect(scenario.objective.failsWithoutColonists).toBe(Object.keys(initialPopulation).length > 0)
    }
  })

  it('reaches the objectives with real placement commands', () => {
    // First settlement: Residence + road + Farm.
    let first = createScenarioState(shipConfig, findScenario('first-settlement')!)
    first = stepSimulation(first, { type: 'placeBuilding', x: 1, y: 0, buildingType: 'residence' })
    first = stepSimulation(first, { type: 'placeRoads', cells: [{ x: 1, y: 1 }] })
    first = stepSimulation(first, { type: 'placeBuilding', x: 0, y: 1, buildingType: 'farm' })
    for (let i = 0; i < 5; i += 1) first = stepSimulation(first)
    const firstObjective = findScenario('first-settlement')!.objective
    expect(getObjectiveStatus(first, firstObjective).state).toBe('completed')

    // Industrial expansion: Village is already satisfied, so building the
    // Workshop completes the objective (the as-worded success condition).
    let industrial = createScenarioState(shipConfig, findScenario('industrial-expansion')!)
    industrial = stepSimulation(industrial, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    for (let i = 0; i < 3; i += 1) industrial = stepSimulation(industrial)
    const industrialObjective = findScenario('industrial-expansion')!.objective
    const industrialStatus = getObjectiveStatus(industrial, industrialObjective)
    expect(industrialStatus.state).toBe('completed')
    expect(industrialStatus.requirements.every((entry) => entry.met)).toBe(true)

    // Population expansion: 2 Wells + 2 Farms reaches all three requirements.
    let population = createScenarioState(shipConfig, findScenario('population-expansion')!)
    for (const step of [
      { type: 'well' as const, x: 3, y: 2 },
      { type: 'well' as const, x: 5, y: 2 },
      { type: 'farm' as const, x: 4, y: 2 },
      { type: 'farm' as const, x: 6, y: 2 },
    ]) {
      population = stepSimulation(population, {
        type: 'placeBuilding',
        x: step.x,
        y: step.y,
        buildingType: step.type,
      })
    }
    for (let i = 0; i < 20; i += 1) population = stepSimulation(population)
    const populationObjective = findScenario('population-expansion')!.objective
    const populationStatus = getObjectiveStatus(population, populationObjective)
    expect(populationStatus.state).toBe('completed')
    expect(getPopulationCount(population)).toBe(4)
  })
})

describe('objective — purity, determinism and persistence', () => {
  it('never mutates state and is deterministic and insertion-order invariant', () => {
    const state = villageState()
    const objective = findScenario('water-constraint')!.objective
    const before = serializeCanonicalState(state)
    const a = getObjectiveStatus(state, objective)
    const b = getObjectiveStatus(state, objective)
    expect(serializeCanonicalState(state)).toBe(before)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...state,
      buildings: reorder(state.buildings),
      roads: reorder(state.roads),
      colonists: reorder(state.colonists),
    }
    expect(JSON.stringify(getObjectiveStatus(reordered, objective))).toBe(JSON.stringify(a))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(state))
  })

  it('stores nothing: objectives are data, status is derived', () => {
    const state = createScenarioState(shipConfig, findScenario('recovery')!)
    const serialized = serializeCanonicalState(state)
    expect(serialized).not.toContain('objective')
    expect(serialized).not.toContain('scenario')
    // The scenario data itself is declarative: one objective per scenario with
    // a closed set of requirement kinds.
    const kinds = new Set(SCENARIOS.flatMap((s) => s.objective.requirements.map((r) => r.kind)))
    expect([...kinds].sort()).toEqual(['building', 'foodBalance', 'population', 'stage', 'waterCapacity'])
  })
})
