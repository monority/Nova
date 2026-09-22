/**
 * Scenario definitions (Step 10AL).
 *
 * DATA ONLY. A scenario is a starting state plus an objective label:
 *
 *   SCENARIO = initial state + existing constraints + objective/framing
 *
 * No scenario contains a rule, a callback with simulation logic, a modifier
 * or a fork of the engine. The shared assembler below uses exactly the same
 * domain constructors the simulation itself uses, so every scenario runs on
 * the canonical engine and the default game is untouched.
 *
 * Initial states are deliberately minimal (Step 10AL §13): the smallest
 * valid state that expresses the scenario, with every value inside the
 * existing economy (25 Material per building, 5 per road cell, 2 Food per
 * staffed Farm, 2 Water per staffed Well).
 */

import type { BuildingType } from '../domain/building/building.js'
import { getBuildingDefinition } from '../domain/building/building.js'
import {
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  type SimulationState,
} from '../domain/simulation/state.js'
import { assignJobs } from '../domain/simulation/phases.js'
import type { SimulationConfig } from '../domain/simulation/state.js'
import type { ObjectiveDefinition } from './queries/objective.js'

export interface ScenarioResources {
  readonly material: number
  readonly food: number
  readonly water: number
}

export interface ScenarioBuilding {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
  /** Operational initial states are for partially developed scenarios. */
  readonly operational: boolean
}

export interface ScenarioCell {
  readonly x: number
  readonly y: number
}

export interface ScenarioColonist {
  /** The Residence cell this colonist lives in (must be a residence in `buildings`). */
  readonly residence: ScenarioCell
}

export interface ScenarioDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  /** Evaluatable success condition plus framing. Pure data. */
  readonly objective: ObjectiveDefinition
  readonly resources: ScenarioResources
  readonly buildings: readonly ScenarioBuilding[]
  readonly roads: readonly ScenarioCell[]
  readonly colonists: readonly ScenarioColonist[]
}

const cellKey = (cell: ScenarioCell): string => `${cell.x},${cell.y}`

/**
 * Deterministic assembly of a canonical state from scenario data. Shared by
 * every scenario (no per-scenario logic). Buildings and roads are created
 * through the domain constructors, so ids and counters stay canonical;
 * operational flags are applied as data on the created state.
 */
export const createScenarioState = (
  config: SimulationConfig,
  scenario: ScenarioDefinition
): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      construction: scenario.resources.material,
      food: scenario.resources.food,
      water: scenario.resources.water,
    },
  }
  const buildingIdByCell = new Map<string, string>()
  for (const building of scenario.buildings) {
    const created = createBuilding(
      state,
      building.type,
      building.x,
      building.y,
      getBuildingDefinition(building.type).constructionTicks
    )
    state = created.state
    buildingIdByCell.set(cellKey(building), created.buildingId)
    if (building.operational) {
      const placed = state.buildings[created.buildingId]
      if (placed !== undefined) {
        state = {
          ...state,
          buildings: {
            ...state.buildings,
            [created.buildingId]: {
              ...placed,
              status: 'operational',
              constructionRemaining: 0,
            },
          },
        }
      }
    }
  }
  if (scenario.roads.length > 0) {
    const created = createRoads(state, scenario.roads.map((cell) => ({ x: cell.x, y: cell.y })))
    state = created.state
    const roads = { ...state.roads }
    for (const roadId of created.roadIds) {
      const road = roads[roadId]
      if (road !== undefined) {
        roads[roadId] = {
          ...road,
          status: 'operational',
          constructionRemaining: 0,
        }
      }
    }
    state = { ...state, roads }
  }
  for (const colonist of scenario.colonists) {
    const residenceId = buildingIdByCell.get(cellKey(colonist.residence))
    if (residenceId === undefined) {
      throw new Error(
        `Scenario colonist references unknown Residence at ${cellKey(colonist.residence)}`
      )
    }
    state = createColonist(state, residenceId).state
  }
  // Same deterministic assignment phase the simulation uses; a scenario
  // never invents an assignment rule.
  return assignJobs(state)
}

// ---------------------------------------------------------------------------
// Scenario set (Step 10AL §11). Only states expressible with existing rules.
// ---------------------------------------------------------------------------

const RESIDENCE_FARM_WELL_ROADS: readonly ScenarioCell[] = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
]

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'first-settlement',
    name: 'First settlement',
    description:
      'The canonical opening: three buildings and one road cell stand between a wilderness and a first sustainable settlement.',
    objective: {
      label: 'Reach Settlement.',
      description: 'A first sustainable settlement: a colonist, a Food-producing Farm and a road network.',
      constraint: 'Material 100 funds a Residence, a road and a Farm with 45 to spare.',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      // Starts empty: population 0 is the opening, not a collapse.
      failsWithoutColonists: false,
    },
    resources: { material: 100, food: 100, water: 0 },
    buildings: [],
    roads: [],
    colonists: [],
  },
  {
    id: 'water-constraint',
    name: 'Water constraint',
    description:
      'A working Farm and two colonists are already in place, but no Well exists: Food is stable and growth is blocked by Water capacity alone.',
    objective: {
      label: 'Reach Village.',
      description: 'Restore Water capacity without losing the Food balance: the single blocker is one staffed Well.',
      constraint: 'Two colonists already live here; the Farm holds one of them.',
      requirements: [{ kind: 'stage', stage: 'village' }],
      failsWithoutColonists: true,
    },
    resources: { material: 100, food: 50, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
    ],
    roads: RESIDENCE_FARM_WELL_ROADS,
    colonists: [{ residence: { x: 1, y: 0 } }, { residence: { x: 3, y: 0 } }],
  },
  {
    id: 'industrial-expansion',
    name: 'Industrial expansion',
    description:
      'A Village with Water and Food already balanced; the Workshop is buildable here, but running it is a burst that costs Water — not a permanent job.',
    objective: {
      label: 'Reach Village and build a Workshop.',
      description:
        'Industry costs 25 Material, 1 Water and a worker. A Workshop can be built here; running it needs a fourth pair of hands this colony does not have, so its output is a reserve-funded burst, never a permanent income.',
      constraint: 'The Water admission gate caps this colony at its current capacity.',
      requirements: [
        { kind: 'stage', stage: 'village' },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
      ],
      failsWithoutColonists: true,
    },
    resources: { material: 100, food: 50, water: 10 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
      { type: 'well', x: 3, y: 2, operational: true },
    ],
    roads: RESIDENCE_FARM_WELL_ROADS,
    colonists: [{ residence: { x: 1, y: 0 } }, { residence: { x: 3, y: 0 } }],
  },
  {
    // Step 10AQ: the industrial CONVERSION archetype. Material 25 is exactly
    // the Workshop, so the only way to pay for the second Well is the burst:
    // 50 Water (25 ticks x 2 Water/tick) becomes 24-25 Material, which the
    // 25-per-Workshop storage permits and the placement query accepts on the
    // tick whose production crests the cap. Water 51 = 25 x 2 + the Workshop's
    // 1 construction Water. Every number is derived from the canonical rates.
    id: 'water-reserve-industry',
    name: 'Water reserve industry',
    description:
      'A Village whose Water reserve is the only construction budget left: the Workshop turns Water into Material.',
    objective: {
      label: 'Reach Village, build a Workshop and a second Well.',
      description:
        'Material 25 buys the Workshop and nothing else. The second Well must be paid for by the Workshop itself: run it on the Water reserve, then build.',
      constraint: 'Material 25, Water 51: the Workshop first, then the reserve buys the Well.',
      requirements: [
        { kind: 'stage', stage: 'village' },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
        { kind: 'building', buildingType: 'well', atLeast: 2 },
      ],
      failsWithoutColonists: true,
    },
    resources: { material: 25, food: 50, water: 51 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
      { type: 'well', x: 3, y: 2, operational: true },
    ],
    roads: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ],
    colonists: [{ residence: { x: 1, y: 0 } }, { residence: { x: 3, y: 0 } }],
  },
  {
    id: 'spatial-efficiency',
    name: 'Spatial efficiency',
    description:
      'Exactly enough Material for one Residence, one road cell and one Farm: the road budget is the whole margin.',
    objective: {
      label: 'Reach Settlement.',
      description: 'Exactly enough Material for one Residence, one road cell and one Farm: the road budget is the whole margin.',
      constraint: 'Material 55 = Residence (25) + road (5) + Farm (25).',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: false,
    },
    resources: { material: 55, food: 100, water: 0 },
    buildings: [],
    roads: [],
    colonists: [],
  },
  {
    id: 'population-expansion',
    name: 'Population expansion',
    description:
      'Housing for three, Food for two: growth is planned ahead of the Water capacity that would support it.',
    objective: {
      label: 'Grow to 4 colonists with Water capacity 4 and Food balanced.',
      description: 'Two Wells support four colonists and two Farms feed them: the objective costs the whole budget.',
      constraint: 'Material 100 = two Wells (50) plus two Farms (50).',
      requirements: [
        { kind: 'population', atLeast: 4 },
        { kind: 'waterCapacity', atLeast: 4 },
        { kind: 'foodBalance' },
      ],
      failsWithoutColonists: true,
    },
    resources: { material: 100, food: 100, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'residence', x: 5, y: 0, operational: false },
      { type: 'residence', x: 7, y: 0, operational: false },
      { type: 'farm', x: 1, y: 2, operational: true },
    ],
    roads: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
    ],
    colonists: [{ residence: { x: 1, y: 0 } }, { residence: { x: 3, y: 0 } }],
  },
  {
    id: 'recovery',
    name: 'Recovery',
    description:
      'The Farm stands one road cell beyond the network, so it is staffed by nobody and produces nothing: the settlement is starving on its reserve.',
    objective: {
      label: 'Reach Settlement by reconnecting the stranded Farm.',
      description: 'The Farm stands one road cell outside the network, so nobody staffs it and the reserve is draining.',
      constraint: 'Material 30 and Food 30: the reserve is finite.',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: true,
    },
    resources: { material: 30, food: 30, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'farm', x: 4, y: 2, operational: true },
    ],
    roads: [{ x: 1, y: 1 }],
    colonists: [{ residence: { x: 1, y: 0 } }],
  },
]

export const findScenario = (id: string): ScenarioDefinition | undefined =>
  SCENARIOS.find((scenario) => scenario.id === id)

/** The default game: unchanged starting state, no scenario framing. */
export const DEFAULT_SCENARIO_ID = 'default'

export const createDefaultState = (config: SimulationConfig): SimulationState =>
  createInitialState(config)
