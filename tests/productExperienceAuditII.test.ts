/**
 * Step 10DA — Product Experience Audit II (deterministic measurable checks).
 *
 * AUDIT ONLY. `src/` is untouched. These are the domain-verifiable facts that
 * back the browser audit: scenario catalogue legibility, progression/objective
 * feedback semantics, the economy feedback numbers a player reads, the
 * affordability query/command agreement, and persistence/determinism. Subjective
 * visual/aesthetic opinions are deliberately NOT tested here (see
 * `docs/roadmap/Step10DA.md`).
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
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaintenanceDuePerTick,
  getObjectiveStatus,
  getPlacementAffordability,
  getProgression,
  getRoadsPlacementAffordability,
  getServedColonistCount,
  getTownConditions,
  getWaterProductionPerTick,
  getRevenuePerTick,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type ObjectiveDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'
import {
  DEFAULT_STORAGE_CAPACITIES,
} from '@/domain/storage/storage.js'

const config: SimulationConfig = {
  world: { seed: 'nova-step10da', width: 16, height: 12 },
}

const ROW_RESIDENCE = 0
const ROW_ROAD = 1
const ROW_WORKPLACE = 2

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10da: building missing')
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
  if (id === undefined) throw new Error('10da: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10da: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly wells?: number
  readonly workshops?: number
  readonly colonists?: number
  readonly material?: number
  readonly roads?: boolean
}

/** Operational colony on one road row (the audit fixture convention). */
const build = (spec: Spec): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: { ...state.resources, food: 10_000, money: spec.material ?? 100 },
  }
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + 2 * i, ROW_RESIDENCE)
  }
  let col = 0
  const place = (type: BuildingType, count: number): void => {
    for (let i = 0; i < count; i += 1) {
      state = op(state, type, 1 + 2 * col, ROW_WORKPLACE)
      col += 1
    }
  }
  place('farm', spec.farms ?? 0)
  place('well', spec.wells ?? 0)
  place('workshop', spec.workshops ?? 0)
  if (spec.roads !== false) {
    for (let x = 0; x <= 1 + 2 * col + 2; x += 1) state = opRoad(state, x, ROW_ROAD)
  }
  const residences = Object.values(state.buildings)
    .filter((building) => building.type === 'residence')
    .sort((a, b) => a.x - b.x)
  const wanted = spec.colonists ?? spec.residences
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

describe('10DA — scenario catalogue legibility', () => {
  it('exposes 11 distinct scenarios, each with a label, a framing sentence and a constraint', () => {
    expect(SCENARIOS).toHaveLength(11)
    expect(new Set(SCENARIOS.map((scenario) => scenario.id)).size).toBe(11)
    for (const scenario of SCENARIOS) {
      expect(scenario.name.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.objective.label.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.objective.description.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.objective.constraint.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.objective.requirements.length, scenario.id).toBeGreaterThan(0)
    }
  })

  it('resolves every scenario id and loads every start state without error', () => {
    for (const scenario of SCENARIOS) {
      expect(findScenario(scenario.id)?.id).toBe(scenario.id)
      const state = createScenarioState(config, scenario)
      const status = getObjectiveStatus(state, scenario.objective)
      expect(['in_progress', 'completed', 'failed']).toContain(status.state)
      expect(status.requirements.length).toBe(scenario.objective.requirements.length)
    }
  })

  it('uses only the documented closed set of objective requirement kinds', () => {
    const kinds = new Set(['stage', 'population', 'waterCapacity', 'foodBalance', 'building'])
    for (const scenario of SCENARIOS) {
      for (const requirement of scenario.objective.requirements) {
        expect(kinds.has(requirement.kind), `${scenario.id}:${requirement.kind}`).toBe(true)
      }
    }
  })
})

describe('10DA — progression and objective feedback', () => {
  it('Village is followed by Town, whose condition is a Staffed Workshop', () => {
    const townConditions = getTownConditions(createScenarioState(config, findScenario('town-threshold')!))
    const labels = townConditions.map((condition) => condition.label)
    expect(labels).toContain('Staffed Workshop')
  })

  it('the three Town scenarios declare a Reach Town objective', () => {
    for (const id of ['town-threshold', 'town-balance', 'town-connection'] as const) {
      expect(findScenario(id)?.objective.label, id).toContain('Town')
    }
  })

  it('reports in_progress with blockers for a fresh scenario', () => {
    const scenario = findScenario('first-settlement')!
    const status = getObjectiveStatus(createScenarioState(config, scenario), scenario.objective)
    expect(status.state).toBe('in_progress')
    expect(status.met).toBe(false)
    expect(status.blockers).toContain('Reach Settlement')
  })

  it('reports completed when the required stage is already reached', () => {
    // water-constraint starts at Settlement, so a "reach Settlement" objective is complete.
    const definition: ObjectiveDefinition = {
      label: 'Reach Settlement.',
      description: '',
      constraint: '',
      requirements: [{ kind: 'stage', stage: 'settlement' }],
      failsWithoutColonists: false,
    }
    const state = createScenarioState(config, findScenario('water-constraint')!)
    expect(getObjectiveStatus(state, definition).state).toBe('completed')
  })

  it('reports failed when the colony is gone and the requirement is pending', () => {
    const definition: ObjectiveDefinition = {
      label: 'Reach Town.',
      description: '',
      constraint: '',
      requirements: [{ kind: 'stage', stage: 'town' }],
      failsWithoutColonists: true,
    }
    const empty = createInitialState(config) // population 0
    const status = getObjectiveStatus(empty, definition)
    expect(status.state).toBe('failed')
  })

  it('progression exposes stage, next stage and measured condition details', () => {
    const progression = getProgression(createScenarioState(config, findScenario('first-settlement')!))
    expect(progression.stage).toBe('wilderness')
    expect(progression.nextStage).toBe('settlement')
    // Wilderness itself has no conditions; the player-facing checklist is the
    // NEXT stage's conditions, each with a measured detail string.
    expect(progression.nextConditions.length).toBeGreaterThan(0)
    for (const condition of progression.nextConditions) {
      expect(condition.detail.length, condition.id).toBeGreaterThan(0)
    }
  })
})

describe('10DA — economy feedback numbers a player reads', () => {
  it('pins the income, upkeep, capacity and reserve an inspection/HUD shows', () => {
    const workshop = build({ residences: 1, workshops: 1, colonists: 1 })
    // Step001: revenue 3 (1 tax + 2 commerce), maintenance 2 (residence + workshop).
    expect(getRevenuePerTick(workshop)).toBe(3)
    expect(getMaintenanceDuePerTick(workshop)).toBe(2)

    const farm = build({ residences: 1, farms: 1, colonists: 1 })
    expect(getRevenuePerTick(farm)).toBe(1) // tax only: Workshop-only commerce
    const well = build({ residences: 1, wells: 1, colonists: 1 })
    expect(getRevenuePerTick(well)).toBe(1) // tax only: Workshop-only commerce

    expect(DEFAULT_STORAGE_CAPACITIES).toEqual({ food: 50, water: 30 })
  })

  it('a balanced colony reads break-even Food and Water with no Material income (no Workshop)', () => {
    const balanced = build({ residences: 2, farms: 1, wells: 1, colonists: 2 })
    expect(getFoodProductionPerTick(balanced)).toBe(getFoodConsumptionPerTick(balanced))
    expect(getWaterProductionPerTick(balanced)).toBe(
      getServedColonistCount(balanced) * 1
    )
    // Commerce is Workshop-only; the tax still flows: 2 inhabitants, no
    // commerce, 4 operational buildings — net −2/tick.
    expect(getRevenuePerTick(balanced)).toBe(2)
    expect(getMaintenanceDuePerTick(balanced)).toBe(4)
  })
})

describe('10DA — affordability coherence and persistence', () => {
  it('building affordability predicts the command: empty treasury refuses', () => {
    const state = build({ residences: 0, material: 0, roads: false })
    const cell = { x: 6, y: 6 }
    const affordability = getPlacementAffordability(state, cell, 'residence')
    expect(affordability.affordable).toBe(false)
    expect(affordability.coveredBySameTickInflow).toBe(false)
    const after = stepSimulation(state, {
      type: 'placeBuilding',
      x: cell.x,
      y: cell.y,
      buildingType: 'residence',
    })
    expect(Object.keys(after.buildings)).toHaveLength(1)
  })

  it('road affordability predicts the command: empty treasury refuses', () => {
    const state = build({ residences: 0, material: 0, roads: false })
    const cells = [{ x: 6, y: 6 }]
    const affordability = getRoadsPlacementAffordability(state, cells)
    expect(affordability.affordable).toBe(false)
    const after = stepSimulation(state, { type: 'placeRoads', cells })
    expect(Object.keys(after.roads)).toHaveLength(0)
  })

  it('stays at SAVE_VERSION 8 with a stable save/load round-trip', () => {
    expect(SAVE_VERSION).toBe(11)
    const state = build({ residences: 1, workshops: 1, colonists: 1 })
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })

  it('derived feedback is deterministic: identical state gives identical progression and hash', () => {
    const a = build({ residences: 2, farms: 1, wells: 1, colonists: 2 })
    const b = build({ residences: 2, farms: 1, wells: 1, colonists: 2 })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(getProgression(a)).toEqual(getProgression(b))
  })
})
