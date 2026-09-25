/**
 * Step 10CM — World / External Demand Investigation measurements.
 *
 * AUDIT ONLY. Locks the measured evidence behind the DEFER decision: the
 * world is a homogeneous board (terrain = placement refusal only, never an
 * economy), saves carry no external-actor state, and the catalogue frames
 * no external concept. No simulation rule is changed here.
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  createScenarioState,
  findScenario,
  getFoodProductionPerTick,
  getProgression,
  getWaterProductionPerTick,
  loadSave,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  validatePlacement,
  validateRoadsPlacement,
  type SimulationConfig,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10cm', width: 12, height: 12 } }
const withTerrain: SimulationConfig = {
  world: { ...config.world, blockedCells: ['11,11'] },
}

const termPresent = (text: string, term: string): boolean =>
  new RegExp(`\\b${term}s?\\b`).test(text)

const EXTERNAL_TERMS = [
  'faction',
  'npc',
  'visitor',
  'quest',
  'mission',
  'narrative',
  'lore',
  'trade',
  'trader',
  'diplomacy',
  'enemy',
  'enemies',
  'disaster',
  'signal',
  'anomaly',
  'discover',
  'event',
  'external',
]

describe('10CM — world model is a homogeneous board', () => {
  it('carries no yields, deposits, or properties per cell', () => {
    // WorldConfig is bounds + seed (+ optional blocked list): a cell has no
    // identity beyond its coordinate.
    expect(Object.keys(config.world).sort()).toEqual(['height', 'seed', 'width'])
    expect(config.world.blockedCells).toBeUndefined()
  })

  it('reads terrain only as placement refusal, never as economy', () => {
    const plain = createInitialState(config)
    const terrain = createInitialState(withTerrain)
    // A far-corner blocked cell changes nothing economic or progressional.
    expect(getFoodProductionPerTick(terrain)).toBe(getFoodProductionPerTick(plain))
    expect(getWaterProductionPerTick(terrain)).toBe(getWaterProductionPerTick(plain))
    expect(getProgression(terrain)).toEqual(getProgression(plain))
    // Its only effect: refusal with the terrain reason.
    const building = validatePlacement(terrain, { x: 11, y: 11 }, 'farm')
    expect(building.valid).toBe(false)
    if (!building.valid) expect(building.reason).toBe('terrainBlocked')
    const roads = validateRoadsPlacement(terrain, [{ x: 11, y: 11 }])
    expect(roads.valid).toBe(false)
    if (!roads.valid) expect(roads.reason).toBe('terrainBlocked')
  })

  it('never changes the world over time', () => {
    let state = createInitialState(withTerrain)
    for (let index = 0; index < 24; index += 1) state = stepSimulation(state)
    // No events, no erosion, no change: the board is fixed context.
    expect(state.config.world).toEqual(withTerrain.world)
  })
})

describe('10CM — no external-actor or narrative state exists', () => {
  it('persists no external concept in saves', () => {
    const scenario = findScenario('housing-composition')
    if (scenario === undefined) throw new Error('10cm: missing scenario')
    const state = createScenarioState(config, scenario)
    const serial = serializeSave(state).toLowerCase()
    for (const term of EXTERNAL_TERMS) {
      expect(termPresent(serial, term)).toBe(false)
    }
    // And the save round-trips without inventing any.
    const restored = loadSave(serializeSave(state))
    expect(serializeSave(restored).toLowerCase().includes('faction')).toBe(false)
  })

  it('frames no external concept in any catalogue objective', () => {
    for (const scenario of SCENARIOS) {
      const text =
        `${scenario.name} ${scenario.description} ${scenario.objective.label} ` +
        `${scenario.objective.description} ${scenario.objective.constraint}`.toLowerCase()
      for (const term of EXTERNAL_TERMS) {
        expect(
          termPresent(text, term),
          `${scenario.id} references external concept: ${term}`
        ).toBe(false)
      }
    }
  })
})
