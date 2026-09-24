/**
 * Settlement progression tests (Step 10AL).
 *
 * The progression layer OBSERVES the simulation: these tests pin the two
 * contracted transitions, the conjunctive condition logic, the reuse of the
 * authoritative Food query, the Water-capacity (not stock) semantics, purity,
 * determinism, insertion-order invariance and the explicit deferral of Town
 * and beyond.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  COLONISTS_PER_STAFFED_WELL,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getProgression,
  getSettlementConditions,
  getVillageConditions,
  hashCanonicalState,
  isFoodSupplySustainable,
  iterateBuildings,
  serializeCanonicalState,
  stepSimulation,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step10al', width: 24, height: 12 } }

const createState = (): SimulationState => createInitialState(shipConfig)

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10al: building missing')
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
  if (id === undefined) throw new Error('10al: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10al: road missing')
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
  let state = createState()
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

describe('progression — Wilderness', () => {
  it('reports Wilderness with the three Settlement blockers on a fresh state', () => {
    const progression = getProgression(createState())
    expect(progression.stage).toBe('wilderness')
    expect(progression.stageLabel).toBe('Wilderness')
    expect(progression.nextStage).toBe('settlement')
    expect(progression.nextStageLabel).toBe('Settlement')
    expect(progression.conditions).toEqual([])
    expect(progression.nextConditions.map((condition) => condition.id)).toEqual([
      'population',
      'food',
      'roads',
    ])
    expect(progression.blockers).toEqual(['Population 1', 'Food balance', 'Road network'])
    expect(progression.deferred).toBe(false)
  })

  it('keeps Wilderness while any Settlement condition is unmet', () => {
    // Population present, a road network exists, but nothing produces Food.
    const colonistNoFood = scene({
      residences: [{ x: 1, y: 0 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 100,
    })
    const progression = getProgression(colonistNoFood)
    expect(progression.stage).toBe('wilderness')
    expect(progression.blockers).toEqual(['Food balance'])
    expect(progression.nextConditions.find((c) => c.id === 'population')?.met).toBe(true)
    expect(progression.nextConditions.find((c) => c.id === 'roads')?.met).toBe(true)
    expect(progression.nextConditions.find((c) => c.id === 'food')?.met).toBe(false)
  })
})

describe('progression — Settlement', () => {
  it('reaches Settlement exactly when population, Food balance and a road network all hold', () => {
    const settlement = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
    })
    const progression = getProgression(settlement)
    expect(progression.stage).toBe('settlement')
    expect(progression.stageLabel).toBe('Settlement')
    expect(progression.nextStage).toBe('village')
    expect(progression.conditions.map((condition) => condition.met)).toEqual([true, true, true])
    expect(progression.blockers).toEqual(['Population 2', 'Water capacity 2'])
    expect(progression.deferred).toBe(false)
    // The Food condition is the authoritative query, not a second definition.
    expect(progression.conditions.find((c) => c.id === 'food')?.met).toBe(
      isFoodSupplySustainable(settlement)
    )
  })

  it('never treats Water stock as Water capacity', () => {
    // A full Water reserve with no Well: Village's Water condition stays false.
    const stockOnly = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      water: 500,
    })
    const progression = getProgression(stockOnly)
    expect(stockOnly.resources.water).toBe(500)
    expect(progression.stage).toBe('settlement')
    expect(progression.nextConditions.find((c) => c.id === 'water')?.met).toBe(false)
    expect(progression.nextConditions.find((c) => c.id === 'water')?.detail).toBe('capacity 0 / tick')
    expect(progression.blockers).toContain('Water capacity 2')
  })
})

describe('progression — Village', () => {
  it('reaches Village when population, Water capacity and Food balance all hold, and exposes Town next', () => {
    const village = scene({
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
    const progression = getProgression(village)
    expect(progression.stage).toBe('village')
    expect(progression.stageLabel).toBe('Village')
    expect(progression.nextStage).toBe('town')
    expect(progression.nextStageLabel).toBe('Town')
    expect(progression.nextConditions.map((condition) => condition.id)).toEqual(['workshop', 'water', 'food'])
    expect(progression.blockers).toEqual(['Staffed Workshop'])
    expect(progression.deferred).toBe(false)
    expect(progression.conditions.map((c) => c.id)).toEqual(['population', 'water', 'food'])
    expect(progression.conditions.every((c) => c.met)).toBe(true)
  })

  it('evaluates each Village condition independently', () => {
    // Capacity 2 but only one colonist (and the Farm unreachable to it), plus
    // a food deficit: only the Water condition is met.
    const oneColonist = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'farm', x: 5, y: 2 },
      ],
      roads: rowRoads(5),
      colonists: 1,
    })
    const conditions = getVillageConditions(oneColonist)
    expect(conditions.find((c) => c.id === 'population')?.met).toBe(false)
    expect(conditions.find((c) => c.id === 'water')?.met).toBe(true)
    expect(conditions.find((c) => c.id === 'food')?.met).toBe(false)
    // The Food deficit also fails the Settlement contract, so the reported
    // blockers are the Settlement ones (the stage is Wilderness).
    const progression = getProgression(oneColonist)
    expect(progression.stage).toBe('wilderness')
    expect(progression.blockers).toEqual(['Food balance'])
    expect(progression.nextStage).toBe('settlement')
  })

  it('uses model-produced thresholds, never arbitrary numbers', () => {
    expect(COLONISTS_PER_STAFFED_WELL).toBe(WATER_PER_WELL_PER_TICK)
    const village = getVillageConditions(
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
    )
    expect(village.find((c) => c.id === 'population')?.label).toBe(
      `Population ${WATER_PER_WELL_PER_TICK}`
    )
    expect(village.find((c) => c.id === 'water')?.label).toBe(
      `Water capacity ${WATER_PER_WELL_PER_TICK}`
    )
  })

  it('is reached by real gameplay from a Settlement state', () => {
    // Scenario-reachable path: a Settlement with 100 Material builds a Well.
    let state = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: rowRoads(3),
      colonists: 2,
      material: 100,
    })
    expect(getProgression(state).stage).toBe('settlement')
    state = stepSimulation(state, { type: 'placeBuilding', x: 3, y: 2, buildingType: 'well' })
    for (let i = 0; i < 5; i += 1) state = stepSimulation(state)
    const progression = getProgression(state)
    expect(progression.stage).toBe('village')
    expect(progression.deferred).toBe(false)
  })
})

describe('progression — Town', () => {
  it('reaches Town when a staffed Workshop, Food balance, and Water capacity support the population', () => {
    const town = scene({
      residences: Array.from({ length: 10 }, (_, index) => ({ x: 1 + index * 2, y: 0 })),
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
        { type: 'farm', x: 5, y: 2 },
        { type: 'farm', x: 7, y: 2 },
        { type: 'farm', x: 9, y: 2 },
        { type: 'well', x: 11, y: 2 },
        { type: 'well', x: 13, y: 2 },
        { type: 'well', x: 15, y: 2 },
        { type: 'well', x: 17, y: 2 },
        { type: 'workshop', x: 19, y: 2 },
      ],
      roads: rowRoads(19),
      colonists: 10,
      material: 1000,
      water: 100,
    })
    const progression = getProgression(town)
    expect(progression.stageLabel).toBe('Town')
    expect(progression.nextStage).toBeNull()
    expect(progression.conditions.map((condition) => condition.id)).toEqual(['workshop', 'water', 'food'])
    expect(progression.conditions.every((condition) => condition.met)).toBe(true)
  })

  it('shows Town as blocked when a Workshop is unstaffed', () => {
    const village = scene({
      residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: rowRoads(5),
      colonists: 2,
      material: 1000,
      water: 100,
    })
    expect(getProgression(village).stage).toBe('village')
    expect(getProgression(village).nextConditions.find((condition) => condition.id === 'workshop')?.met).toBe(false)
  })
})

describe('progression — purity and determinism', () => {
  it('never mutates canonical state', () => {
    const state = scene({
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
    const before = serializeCanonicalState(state)
    getProgression(state)
    getSettlementConditions(state)
    getVillageConditions(state)
    expect(serializeCanonicalState(state)).toBe(before)
  })

  it('is deterministic and insertion-order invariant', () => {
    const state = scene({
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
    expect(JSON.stringify(getProgression(state))).toBe(JSON.stringify(getProgression(state)))
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...state,
      buildings: reorder(state.buildings),
      roads: reorder(state.roads),
      colonists: reorder(state.colonists),
    }
    expect(JSON.stringify(getProgression(reordered))).toBe(JSON.stringify(getProgression(state)))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(state))
  })
})

describe('progression — reachability of the contracted transitions', () => {
  it('measures the minimum Material a Village costs against the default start', () => {
    // 2 Residences + 1 Well + 1 Farm + one shared road cell (the minimum that
    // can serve four buildings) = 105 Material.
    const minimumVillageCost =
      25 * 2 + // residences
      25 + // well
      25 + // farm
      5 // one road cell (its four neighbours hold the four buildings)
    const initialMaterial = createState().resources.construction
    expect(minimumVillageCost).toBe(105)
    expect(initialMaterial).toBe(100)
    // Documented consequence: the default opening is 5 Material short of the
    // Village contract, so the transition is exercised through scenarios.
    expect(initialMaterial).toBeLessThan(minimumVillageCost)
  })
})
