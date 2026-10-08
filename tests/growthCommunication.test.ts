/**
 * Step G1.3 — Growth communication (focused tests).
 *
 * Pins the derived growth message: every GrowthBlocker maps to exactly one
 * short player-facing line (no internal terminology, no color-only meaning),
 * the mapping is a pure function of canonical state, and save/load produces the
 * same message.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getGrowthMessage,
  getGrowthStatus,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeSave,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-g1-3-communication', width: 16, height: 12 },
}

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('g1.3: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const building = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState =>
  createBuilding(state, type, x, y, 2).state

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('g1.3: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('g1.3: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const base = (): SimulationState => {
  const state = createInitialState(config)
  return {
    ...state,
    resources: { ...state.resources, food: 10_000, water: 100, money: 1_000 },
  }
}

/** Town with Water headroom (same shape as the G1.1/G1.2 fixtures). */
const townFixture = (): SimulationState => {
  let state = base()
  for (const x of [1, 2, 3]) state = opRoad(state, x, 1)
  state = op(state, 'residence', 1, 0)
  state = op(state, 'residence', 3, 0)
  state = op(state, 'well', 1, 2)
  state = op(state, 'well', 3, 2)
  for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) state = opRoad(state, x, 1)
  for (const x of [6, 8, 10, 12]) state = op(state, 'residence', x, 0)
  for (const x of [6, 8, 10]) state = op(state, 'farm', x, 2)
  state = op(state, 'workshop', 12, 2)
  const residences = Object.values(state.buildings)
    .filter((b) => b.type === 'residence')
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  for (let i = 0; i < 6; i += 1) {
    const residence = residences[i]
    if (residence === undefined) throw new Error('g1.3: missing residence')
    state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const withoutSecondWell = (state: SimulationState): SimulationState => {
  const well = Object.values(state.buildings).find(
    (b) => b.type === 'well' && b.x === 3 && b.y === 2
  )
  return {
    ...state,
    buildings: Object.fromEntries(
      Object.entries(state.buildings).filter(([id]) => id !== well?.id)
    ),
  }
}

describe('G1.3 — blocker to message mapping', () => {
  it('maps every growth blocker to exactly one player-facing line', () => {
    const cases: ReadonlyArray<readonly [string | null, SimulationState]> = [
      ['notTown', base()],
      ['noHousingPressure', op(townFixture(), 'residence', 2, 0)],
      [
        'waterShortage',
        { ...townFixture(), resources: { ...townFixture().resources, water: 0 } },
      ],
      ['noWaterHeadroom', withoutSecondWell(townFixture())],
      ['unaffordable', { ...townFixture(), resources: { ...townFixture().resources, money: 0 } }],
      [null, townFixture()],
    ]
    const messages: string[] = []
    for (const [expectedBlocker, state] of cases) {
      expect(getGrowthStatus(state).blocker, String(expectedBlocker)).toBe(expectedBlocker)
      const message = getGrowthMessage(state)
      expect(message.startsWith('Growth — '), String(expectedBlocker)).toBe(true)
      messages.push(message)
    }
    // Ready maps to its own line; all messages are distinct.
    expect(getGrowthMessage(townFixture())).toBe('Growth — ready')
    expect(new Set(messages).size).toBe(messages.length)
  })

  it('maps the noEligibleCell blocker (all eligible cells occupied)', () => {
    let state = townFixture()
    for (const cell of [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    ]) {
      state = building(state, 'residence', cell.x, cell.y)
    }
    expect(getGrowthStatus(state).blocker).toBe('noEligibleCell')
    expect(getGrowthMessage(state)).toBe('Growth — needs served road space')
  })

  it('uses the catalog Residence cost in the Material message', () => {
    const broke: SimulationState = {
      ...townFixture(),
      resources: { ...townFixture().resources, money: 0 },
    }
    const cost = getBuildingDefinition('residence').constructionCost
    expect(getGrowthMessage(broke)).toBe(`Growth — needs ${cost} Material`)
  })

  it('never exposes internal terminology', () => {
    const internal = [
      'GrowthBlocker',
      'blocker',
      'noWaterHeadroom',
      'noHousingPressure',
      'noEligibleCell',
      'waterShortage',
      'notTown',
      'unaffordable',
      'demand',
    ]
    const states = [
      base(),
      op(townFixture(), 'residence', 2, 0),
      withoutSecondWell(townFixture()),
      townFixture(),
    ]
    for (const state of states) {
      const message = getGrowthMessage(state)
      for (const term of internal) {
        expect(message.includes(term), `${message} includes ${term}`).toBe(false)
      }
    }
  })
})

describe('G1.3 — derived, stable, persistent', () => {
  it('is a pure function of canonical state (no hidden state, deterministic)', () => {
    const state = townFixture()
    const before = hashCanonicalState(state)
    expect(getGrowthMessage(state)).toBe(getGrowthMessage(state))
    expect(hashCanonicalState(state)).toBe(before)
    expect(getGrowthMessage(townFixture())).toBe(getGrowthMessage(townFixture()))
  })

  it('changes with the condition it describes', () => {
    const broke: SimulationState = {
      ...townFixture(),
      resources: { ...townFixture().resources, money: 0 },
    }
    expect(getGrowthMessage(broke)).toBe('Growth — needs 25 Material')
    const funded: SimulationState = {
      ...broke,
      resources: { ...broke.resources, money: 25 },
    }
    expect(getGrowthMessage(funded)).toBe('Growth — ready')
  })

  it('survives save/load and stays out of the save schema', () => {
    const state = townFixture()
    const restored = loadSave(serializeSave(state))
    expect(getGrowthMessage(restored)).toBe(getGrowthMessage(state))

    const serialized = serializeSave(state)
    for (const term of ['Growth —', 'growthBlocker', 'growthMessage', 'growthState']) {
      expect(serialized.includes(term), term).toBe(false)
    }
    expect(SAVE_VERSION).toBe(9)
  })
})
