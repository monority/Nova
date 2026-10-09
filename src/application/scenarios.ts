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
 * existing economy (25 Money per building, 5 per road cell, 2 Food per
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
  readonly money: number
  readonly food: number
  readonly water: number
  /** Step003: optional wood seed (defaults 0 — no scenario ships wood). */
  readonly wood?: number
  /** Step005: optional stone seed (defaults 0 — no scenario ships stone). */
  readonly stone?: number
  /** Step006: optional plank seed (defaults 0 — no scenario ships planks). */
  readonly planks?: number
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
  /**
   * Step 10AV: terrain as declarative data. Canonical `"x,y"` keys of cells
   * that can never hold a building or a road. Absent means no terrain; the
   * list is normalized by the shared assembler exactly like roads are, so no
   * scenario owns a rule. Declaring terrain here has no economic effect: the
   * ONLY consequence is that a placement on a blocked cell is refused.
   */
  readonly blockedCells?: readonly string[]
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
  // Step 10AV: scenario terrain is written into the world config exactly once,
  // through the same constructor every other state uses (normalization and
  // bounds validation included). No scenario-only rule is introduced.
  const scenarioConfig: SimulationConfig =
    scenario.blockedCells === undefined
      ? config
      : { world: { ...config.world, blockedCells: scenario.blockedCells } }
  let state = createInitialState(scenarioConfig)
  state = {
    ...state,
    resources: {
      money: scenario.resources.money,
      food: scenario.resources.food,
      water: scenario.resources.water,
      wood: scenario.resources.wood ?? 0,
      stone: scenario.resources.stone ?? 0,
      planks: scenario.resources.planks ?? 0,
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
      constraint: 'Money 100 funds a Residence, a road and a Farm with 45 to spare.',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      // Starts empty: population 0 is the opening, not a collapse.
      failsWithoutColonists: false,
    },
    resources: { money: 100, food: 100, water: 0 },
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
    resources: { money: 100, food: 50, water: 0 },
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
      'A Village with a full treasury and no commerce yet: the Workshop must be connected before it pays.',
    objective: {
      label: 'Reach Village and build a Workshop.',
      description:
        'Industry costs 25 Money, 1 Water and a worker. A connected Workshop earns commerce every tick, so the 100 this colony already holds keeps growing once commerce flows — but staffing the Workshop needs a fourth pair of hands the colony does not have.',
      constraint:
        'Two limits: the Water admission gate caps the population at its current capacity, and commerce requires a road-connected Workshop.',
      requirements: [
        { kind: 'stage', stage: 'village' },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
      ],
      failsWithoutColonists: true,
    },
    resources: { money: 100, food: 50, water: 10 },
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
    // Step001: the industrial archetype. Money 25 is exactly the Workshop;
    // the second Well is paid from the treasury as taxes and Workshop
    // commerce accumulate. Water 51 covers the Workshop's 1 construction
    // Water with a reserve to spare. Every number is derived from the
    // canonical rates.
    id: 'water-reserve-industry',
    name: 'Water reserve industry',
    description:
      'A Village with just enough treasury for a Workshop: connect it and let commerce fund the second Well.',
    objective: {
      label: 'Reach Village, build a Workshop and a second Well.',
      description:
        'Money 25 buys the Workshop and nothing else. The second Well is paid from the treasury as taxes and Workshop commerce accumulate: build the Workshop, connect it, then build.',
      constraint: 'Money 25, Water 51: the Workshop first, then commerce funds the Well.',
      requirements: [
        { kind: 'stage', stage: 'village' },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
        { kind: 'building', buildingType: 'well', atLeast: 2 },
      ],
      failsWithoutColonists: true,
    },
    resources: { money: 25, food: 50, water: 51 },
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
      'Exactly enough Money for one Residence, one road cell and one Farm: the road budget is the whole margin.',
    objective: {
      label: 'Reach Settlement.',
      description: 'Exactly enough Money for one Residence, one road cell and one Farm: the road budget is the whole margin.',
      constraint: 'Money 55 = Residence (25) + road (5) + Farm (25).',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: false,
    },
    resources: { money: 55, food: 100, water: 0 },
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
      constraint: 'Money 100 = two Wells (50) plus two Farms (50).',
      requirements: [
        { kind: 'population', atLeast: 4 },
        { kind: 'waterCapacity', atLeast: 4 },
        { kind: 'foodBalance' },
      ],
      failsWithoutColonists: true,
    },
    resources: { money: 100, food: 100, water: 0 },
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
      constraint: 'Money 30 and Food 30: the reserve is finite.',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: true,
    },
    resources: { money: 30, food: 30, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'farm', x: 4, y: 2, operational: true },
    ],
    roads: [{ x: 1, y: 1 }],
    colonists: [{ residence: { x: 1, y: 0 } }],
  },
  {
    // Step 10BE: the first catalogue scenario whose dominant decision is HOUSING
    // TOPOLOGY. 10AZ measured the phenomenon on this exact shape (same
    // buildings, same population, same road count: only the new Residence's
    // network changes) and classified it B/deferred for lack of authored
    // content; 10BA's placement preview made it readable. Two networks that do
    // not touch: the Well and its serviced Residence on the east side, the only
    // Farm on the west side. The next Residence decides whether its colonist is
    // refused (unserved), admitted but unemployed (served, cannot reach the
    // Farm), or admitted AND productive (a cell that touches both networks, or a
    // 5-Money road that joins them). Money 30 is exactly one Residence
    // plus one road cell, so a wrong placement is recoverable but not free.
    id: 'housing-composition',
    name: 'Housing composition',
    description:
      'Two road networks stand side by side without touching: the Well serves the east side, and the colony\u2019s only Farm stands alone on the west side. The next Residence decides whether its colonist can be served at all \u2014 and whether anyone can reach the food.',
    objective: {
      label: 'Reach Village.',
      description:
        'Village needs a second colonist, and a second colonist needs a water-served Residence. Food has to be produced as well, and the only Farm is on the other network.',
      constraint:
        'Money 30: one Residence (25) plus at most one road cell (5). The Well and the Farm are on separate networks.',
      requirements: [{ kind: 'stage', stage: 'village' }],
      failsWithoutColonists: true,
    },
    resources: { money: 30, food: 40, water: 0 },
    buildings: [
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'well', x: 3, y: 2, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
    ],
    roads: [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ],
    colonists: [{ residence: { x: 3, y: 0 } }],
  },
  {
    id: 'town-threshold',
    name: 'Town threshold',
    description:
      'A complete Village with an idle fourth colonist and a reserve worth exactly one Workshop: industry is the only missing threshold, and the choice is whether the reserve is spent crossing it.',
    objective: {
      label: 'Reach Town.',
      description:
        'The Village already feeds and waters four colonists. Build the Workshop and let the idle colonist staff it: the staffed Workshop is the last Town condition.',
      constraint:
        'Money 30 = Workshop (25) with 5 to spare; Water 5 pays the Workshop water cost (1). Staffing comes from the idle fourth colonist.',
      requirements: [{ kind: 'stage', stage: 'town' }],
      failsWithoutColonists: true,
    },
    resources: { money: 30, food: 60, water: 5 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'residence', x: 5, y: 0, operational: true },
      { type: 'residence', x: 7, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
      { type: 'farm', x: 3, y: 2, operational: true },
      { type: 'well', x: 5, y: 2, operational: true },
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
    colonists: [
      { residence: { x: 1, y: 0 } },
      { residence: { x: 3, y: 0 } },
      { residence: { x: 5, y: 0 } },
      { residence: { x: 7, y: 0 } },
    ],
  },
  {
    id: 'town-balance',
    name: 'Town balance',
    description:
      'Five colonists share two Farms while the Workshop already runs: the colony is one harvest short of Town, and the idle fifth colonist is the only hand left to close the gap.',
    objective: {
      label: 'Reach Town.',
      description:
        'Industry is staffed but five mouths eat more than two Farms grow. Build the third Farm and keep the Workshop running: Town needs the staffed Workshop AND a balanced Food supply.',
      constraint:
        'Money 30 = third Farm (25) with 5 to spare; the idle fifth colonist staffs it once it completes.',
      requirements: [{ kind: 'stage', stage: 'town' }],
      failsWithoutColonists: true,
    },
    resources: { money: 30, food: 60, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'residence', x: 5, y: 0, operational: true },
      { type: 'residence', x: 7, y: 0, operational: true },
      { type: 'residence', x: 9, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
      { type: 'farm', x: 3, y: 2, operational: true },
      { type: 'well', x: 5, y: 2, operational: true },
      { type: 'workshop', x: 7, y: 2, operational: true },
    ],
    roads: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
      { x: 8, y: 1 },
      { x: 9, y: 1 },
    ],
    colonists: [
      { residence: { x: 1, y: 0 } },
      { residence: { x: 3, y: 0 } },
      { residence: { x: 5, y: 0 } },
      { residence: { x: 7, y: 0 } },
      { residence: { x: 9, y: 0 } },
    ],
  },
  {
    id: 'town-connection',
    name: 'Town connection',
    description:
      'The Workshop stands built and empty beyond the road network while an idle colonist waits inside it: one stretch of road is the whole distance between this Village and Town.',
    objective: {
      label: 'Reach Town.',
      description:
        'Food and Water are balanced and the Workshop is operational, but it has no road access so nobody can staff it. Extend the network to the Workshop door: access is the last Town condition.',
      constraint:
        'Money 15 = two road cells (10) with 5 to spare; the idle fourth colonist staffs the Workshop once it is connected.',
      requirements: [{ kind: 'stage', stage: 'town' }],
      failsWithoutColonists: true,
    },
    resources: { money: 15, food: 60, water: 0 },
    buildings: [
      { type: 'residence', x: 1, y: 0, operational: true },
      { type: 'residence', x: 3, y: 0, operational: true },
      { type: 'residence', x: 5, y: 0, operational: true },
      { type: 'residence', x: 7, y: 0, operational: true },
      { type: 'farm', x: 1, y: 2, operational: true },
      { type: 'farm', x: 3, y: 2, operational: true },
      { type: 'well', x: 5, y: 2, operational: true },
      { type: 'workshop', x: 7, y: 2, operational: true },
    ],
    roads: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ],
    colonists: [
      { residence: { x: 1, y: 0 } },
      { residence: { x: 3, y: 0 } },
      { residence: { x: 5, y: 0 } },
      { residence: { x: 7, y: 0 } },
    ],
  },
]

export const findScenario = (id: string): ScenarioDefinition | undefined =>
  SCENARIOS.find((scenario) => scenario.id === id)

// ---------------------------------------------------------------------------
// Step 10AV fixtures. NOT part of the curated catalogue: a fixture is
// evidence for a step, it is never offered as product content. It is still
// plain declarative scenario data assembled by `createScenarioState`, so it
// runs on the untouched engine. The browser E2E reaches it through an
// explicit `?scenario=<id>` deep link; the scenario select lists SCENARIOS
// only, so the player-facing catalogue is unchanged (still 7).
// ---------------------------------------------------------------------------

/**
 * `terrain-chokepoint` — variant C of the Step 10AU contract, built on the
 * coordinates 10AU measured:
 *
 *   west region (x <= 1)              east region (x >= 3)
 *   Residence (1,0)                   Residence (5,0)
 *   Farm      (1,2)                   Well      (5,2)  <- the only Water
 *   road      (1,1)                   Farm      (4,2)  <- vacant workplace
 *                                     roads (3,1) (4,1) (5,1)
 *
 * A rock ridge occupies the whole column x = 2 EXCEPT the connector cell
 * (2,1), so the two regions can only ever be joined through that one cell
 * (10AU measured the ridge as rows 1..5 with an emulated blocker; the fixture
 * makes the separation genuine by blocking the other rows too). Variant C:
 * the only cell of the west region that could host a second Well with road
 * access, (0,1), is terrain-blocked, so the west Residence can NEVER be
 * served by a Well of its own — the connector road is the only Water route
 * that exists, and no stock change can make a blocked cell legal.
 *
 * Money 30 is exactly one Residence (25) plus the connector road (5): the
 * last building and the only connection compete for the same budget. Both
 * outcomes complete the objective, with structurally different results —
 * which is precisely the cell-role competition 10AU identified.
 */
export const TERRAIN_CHOKEPOINT_FIXTURE: ScenarioDefinition = {
  id: 'terrain-chokepoint',
  name: 'Terrain chokepoint (fixture)',
  description:
    'A rock ridge splits the valley. The east settlement holds the only Well; the west Residence stands outside its network, and one cell in the ridge is the only way through.',
  objective: {
    label: 'Reach Village with 3 colonists.',
    description:
      'The third colonist needs a Water-served Residence. Money 30 is exactly one Residence (25) plus the connector road (5), and the west Well site is blocked by terrain.',
    constraint:
      'Money 30 = Residence (25) + connector road (5); the west Well site (0,1) is terrain-blocked.',
    requirements: [
      { kind: 'stage', stage: 'village' },
      { kind: 'population', atLeast: 3 },
    ],
    failsWithoutColonists: true,
  },
  resources: { money: 30, food: 30, water: 20 },
  buildings: [
    { type: 'residence', x: 1, y: 0, operational: true },
    { type: 'residence', x: 5, y: 0, operational: true },
    { type: 'farm', x: 1, y: 2, operational: true },
    { type: 'well', x: 5, y: 2, operational: true },
    // Vacant on purpose: it is the cross-region probe workplace of the
    // chokepoint measurement (the automatic pass keeps it free).
    { type: 'farm', x: 4, y: 2, operational: true },
  ],
  roads: [
    { x: 1, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
  ],
  colonists: [
    { residence: { x: 1, y: 0 } },
    { residence: { x: 5, y: 0 } },
  ],
  blockedCells: [
    // The only West cell that could host a Well with road access (variant C).
    '0,1',
    // The ridge: every cell of column 2 except the connector (2,1).
    '2,0',
    '2,2',
    '2,3',
    '2,4',
    '2,5',
    '2,6',
    '2,7',
    '2,8',
    '2,9',
    '2,10',
    '2,11',
  ],
}

/** Step 10AV fixtures, separated from the curated catalogue. */
export const SCENARIO_FIXTURES: readonly ScenarioDefinition[] = [
  TERRAIN_CHOKEPOINT_FIXTURE,
]

/** Resolve a fixture id (never a catalogue scenario). */
export const findScenarioFixture = (
  id: string
): ScenarioDefinition | undefined =>
  SCENARIO_FIXTURES.find((fixture) => fixture.id === id)

/** The default game: unchanged starting state, no scenario framing. */
export const DEFAULT_SCENARIO_ID = 'default'

export const createDefaultState = (config: SimulationConfig): SimulationState =>
  createInitialState(config)
