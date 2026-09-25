/**
 * Step 10CI — Town Goal Coverage.
 *
 * The 10CH direction gate found the catalogue ceiling (Village) one stage
 * below the progression ceiling (Town). This suite pins the three new
 * Town-targeted scenarios: catalogue validity, real-command playability to
 * Town, canonical Town semantics (no scenario-side approximation), and
 * determinism. No simulation rule is changed here.
 */

import { describe, expect, it } from 'vitest'

import {
  createScenarioState,
  findScenario,
  getObjectiveStatus,
  getPopulationCount,
  getProgression,
  getRoadNetworks,
  getWaterProductionPerTick,
  hashCanonicalState,
  SCENARIOS,
  stepSimulation,
  type BuildingType,
  type CellCoordinate,
  type ScenarioDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const TOWN_IDS = ['town-threshold', 'town-balance', 'town-connection'] as const

const townScenario = (id: string): ScenarioDefinition => {
  const definition = findScenario(id)
  if (definition === undefined) throw new Error(`10ci: missing scenario ${id}`)
  return definition
}

/** Real-command solution scripts: the player policy each scenario teaches. */
const SOLUTIONS: Readonly<Record<string, readonly string[]>> = {
  // Spend the reserve on the missing Workshop, then let construction finish.
  'town-threshold': ['workshop@7,2'],
  // Build the third Farm, then let construction finish.
  'town-balance': ['farm@9,2'],
  // Extend the network to the cut-off Workshop door.
  'town-connection': ['roads:6,1+7,1'],
}

const applySolution = (state: SimulationState, id: string): SimulationState => {
  let next = state
  for (const action of SOLUTIONS[id] ?? []) {
    if (action.startsWith('roads:')) {
      const cells: CellCoordinate[] = action
        .slice('roads:'.length)
        .split('+')
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number)
          return { x: x ?? 0, y: y ?? 0 }
        })
      next = stepSimulation(next, { type: 'placeRoads', cells })
    } else {
      const [type, coords] = action.split('@')
      const [x, y] = (coords ?? '0,0').split(',').map(Number)
      next = stepSimulation(next, {
        type: 'placeBuilding',
        x: x ?? 0,
        y: y ?? 0,
        buildingType: type as BuildingType,
      })
    }
  }
  return next
}

interface DriveResult {
  readonly completedTick: number | null
  readonly townTick: number | null
  readonly wipeTick: number | null
  readonly finalState: SimulationState
}

const driveToTown = (id: string, horizon: number): DriveResult => {
  const definition = townScenario(id)
  let state = createScenarioState(config, definition)
  let completedTick: number | null = null
  let townTick: number | null = null
  let wipeTick: number | null = null
  const previousPopulation = getPopulationCount(state)
  void previousPopulation
  let populationWasPositive = getPopulationCount(state) > 0

  const observe = (): void => {
    if (getProgression(state).stage === 'town' && townTick === null) townTick = state.time.tick
    if (getObjectiveStatus(state, definition.objective).state === 'completed' && completedTick === null) {
      completedTick = state.time.tick
    }
    if (populationWasPositive && getPopulationCount(state) === 0 && wipeTick === null) {
      wipeTick = state.time.tick
    }
    if (getPopulationCount(state) > 0) populationWasPositive = true
  }

  observe()
  state = applySolution(state, id)
  observe()
  for (let tick = 0; tick < horizon; tick += 1) {
    state = stepSimulation(state)
    observe()
    if (completedTick !== null) break
  }
  return { completedTick, townTick, wipeTick, finalState: state }
}

describe('10CI — Town scenario catalogue', () => {
  it('adds exactly three Town-targeted scenarios to the catalogue', () => {
    expect(SCENARIOS).toHaveLength(11)
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
    for (const id of TOWN_IDS) {
      expect(findScenario(id)).toBeDefined()
    }
  })

  it('keeps the Town scenarios data-only with the catalogue shape', () => {
    const allowedKeys = ['id', 'name', 'description', 'objective', 'resources', 'buildings', 'roads', 'colonists']
    for (const id of TOWN_IDS) {
      const scenario = townScenario(id)
      expect(Object.keys(scenario).sort()).toEqual([...allowedKeys].sort())
      expect(scenario.objective.requirements).toEqual([{ kind: 'stage', stage: 'town' }])
      expect(scenario.objective.label).toBe('Reach Town.')
      expect(scenario.objective.description.length).toBeGreaterThan(0)
      expect(scenario.objective.constraint.length).toBeGreaterThan(0)
      for (const cell of [...scenario.buildings, ...scenario.roads]) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeGreaterThanOrEqual(0)
        expect(cell.x).toBeLessThan(12)
        expect(cell.y).toBeLessThan(12)
      }
    }
  })

  it('starts every Town scenario in-progress with a named blocker', () => {
    // town-balance starts one step lower (wilderness): five mouths on two
    // Farms are not even Settlement-sustainable — that shortage IS the scenario.
    const expectedStartStage: Readonly<Record<string, string>> = {
      'town-threshold': 'village',
      'town-balance': 'wilderness',
      'town-connection': 'village',
    }
    for (const id of TOWN_IDS) {
      const scenario = townScenario(id)
      const state = createScenarioState(config, scenario)
      expect(getProgression(state).stage).toBe(expectedStartStage[id])
      const status = getObjectiveStatus(state, scenario.objective)
      expect(status.state).toBe('in_progress')
      expect(status.blockers.length).toBeGreaterThan(0)
    }
  })

  it('assembles Town scenarios deterministically with distinct states', () => {
    const hashes = new Set<string>()
    for (const id of TOWN_IDS) {
      const scenario = townScenario(id)
      const a = createScenarioState(config, scenario)
      const b = createScenarioState(config, scenario)
      expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
      hashes.add(hashCanonicalState(a))
    }
    const existing = new Set(SCENARIOS.filter((s) => !(TOWN_IDS as readonly string[]).includes(s.id)).map((s) => hashCanonicalState(createScenarioState(config, s))))
    for (const hash of hashes) expect(existing.has(hash)).toBe(false)
    expect(hashes.size).toBe(TOWN_IDS.length)
  })
})

describe('10CI — Town playability through real commands', () => {
  it.each([...TOWN_IDS])('completes %s at Town with no wipe', (id) => {
    const definition = townScenario(id)
    const { completedTick, townTick, wipeTick, finalState } = driveToTown(id, 120)
    expect(wipeTick).toBeNull()
    expect(completedTick).not.toBeNull()
    expect(townTick).not.toBeNull()
    // The objective completes exactly at the canonical Town stage.
    expect(completedTick).toBe(townTick)
    expect(getProgression(finalState).stage).toBe('town')
    expect(getObjectiveStatus(finalState, definition.objective).state).toBe('completed')
    expect(getPopulationCount(finalState)).toBeGreaterThan(0)
  })

  it('completes every Town scenario deterministically on the same tick', () => {
    for (const id of TOWN_IDS) {
      const first = driveToTown(id, 120)
      const second = driveToTown(id, 120)
      expect(first.completedTick).toBe(second.completedTick)
      expect(hashCanonicalState(first.finalState)).toBe(hashCanonicalState(second.finalState))
    }
  })

  it('pins the measured starting blockers', () => {
    const blockers: Readonly<Record<string, readonly string[]>> = {
      'town-threshold': ['Reach Town'],
      'town-balance': ['Reach Town'],
      'town-connection': ['Reach Town'],
    }
    for (const id of TOWN_IDS) {
      const scenario = townScenario(id)
      const state = createScenarioState(config, scenario)
      expect(getObjectiveStatus(state, scenario.objective).blockers).toEqual(blockers[id])
      expect(getProgression(state).blockers.length).toBeGreaterThan(0)
    }
  })
})

describe('10CI — canonical Town semantics', () => {
  it('completes the Town objective by the canonical progression state, not an approximation', () => {
    for (const id of TOWN_IDS) {
      const definition = townScenario(id)
      const start = createScenarioState(config, definition)
      // Before the solution, the canonical stage is below Town even though
      // most Town ingredients may already be present (village for threshold
      // and connection, wilderness for the food-short balance start).
      expect(getProgression(start).stage).not.toBe('town')
      const { finalState } = driveToTown(id, 120)
      expect(getProgression(finalState).stage).toBe('town')
      expect(getObjectiveStatus(finalState, definition.objective).state).toBe('completed')
      // The single stage requirement is met exactly when progression says Town.
      const requirement = getObjectiveStatus(finalState, definition.objective).requirements
      expect(requirement).toHaveLength(1)
      expect(requirement[0]?.met).toBe(true)
      expect(requirement[0]?.detail).toBe('stage town')
    }
  })

  it('labels the Town requirement Reach Town', () => {
    for (const id of TOWN_IDS) {
      const scenario = townScenario(id)
      const state = createScenarioState(config, scenario)
      const status = getObjectiveStatus(state, scenario.objective)
      expect(status.requirements.map((r) => r.label)).toEqual(['Reach Town'])
    }
  })

  it('keeps town-connection on a single road network at start', () => {
    const state = createScenarioState(config, townScenario('town-connection'))
    expect(getRoadNetworks(state)).toHaveLength(1)
  })

  it('keeps town-balance water capacity at the Village floor until the third Farm', () => {
    const state = createScenarioState(config, townScenario('town-balance'))
    expect(getWaterProductionPerTick(state)).toBe(2)
    expect(getProgression(state).stage).toBe('wilderness')
    expect(getProgression(state).blockers).toContain('Food balance')
  })
})
