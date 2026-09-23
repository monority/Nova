/**
 * Scenario tests (Step 10AL).
 *
 * Scenarios are DATA: an initial state + existing constraints + an objective
 * label. These tests pin that every scenario assembles to a valid canonical
 * state through the shared assembler, that the assembly is deterministic,
 * that no scenario changes a rule, and that the progression layer reads the
 * expected stage from each starting state.
 */

import { describe, expect, it } from 'vitest'

import {
  createDefaultState,
  createScenarioState,
  findScenario,
  getFoodProductionPerTick,
  getPopulationCount,
  getProgression,
  getWaterProductionPerTick,
  hashCanonicalState,
  iterateBuildings,
  SCENARIOS,
  serializeCanonicalState,
  type SimulationConfig,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

describe('scenarios — data-only definitions', () => {
  it('exposes only data fields per scenario', () => {
    const allowedKeys = ['id', 'name', 'description', 'objective', 'resources', 'buildings', 'roads', 'colonists']
    for (const scenario of SCENARIOS) {
      expect(Object.keys(scenario).sort()).toEqual([...allowedKeys].sort())
      expect(scenario.id.length).toBeGreaterThan(0)
      expect(scenario.name.length).toBeGreaterThan(0)
      expect(scenario.description.length).toBeGreaterThan(0)
      expect(scenario.objective.label.length).toBeGreaterThan(0)
      expect(scenario.objective.description.length).toBeGreaterThan(0)
      expect(scenario.objective.constraint.length).toBeGreaterThan(0)
      expect(scenario.objective.requirements.length).toBeGreaterThan(0)
      expect(typeof scenario.resources.material).toBe('number')
      expect(Array.isArray(scenario.buildings)).toBe(true)
      expect(Array.isArray(scenario.roads)).toBe(true)
      expect(Array.isArray(scenario.colonists)).toBe(true)
    }
    // Step 10BE added one curated content scenario (no new mechanic).
    expect(SCENARIOS).toHaveLength(8)
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
  })

  it('keeps every scenario cell inside the real game world', () => {
    const { width, height } = shipConfig.world
    for (const scenario of SCENARIOS) {
      for (const cell of [...scenario.buildings, ...scenario.roads]) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeGreaterThanOrEqual(0)
        expect(cell.x).toBeLessThan(width)
        expect(cell.y).toBeLessThan(height)
      }
      for (const colonist of scenario.colonists) {
        const residence = scenario.buildings.find(
          (building) =>
            building.type === 'residence' &&
            building.x === colonist.residence.x &&
            building.y === colonist.residence.y
        )
        expect(residence).toBeDefined()
      }
    }
  })
})

describe('scenarios — deterministic assembly', () => {
  it('assembles a canonical, deterministic state for every scenario', () => {
    for (const scenario of SCENARIOS) {
      const a = createScenarioState(shipConfig, scenario)
      const b = createScenarioState(shipConfig, scenario)
      expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
      expect(Object.keys(a).sort()).toEqual(
        ['buildings', 'colonists', 'config', 'counters', 'resources', 'roads', 'storage', 'time'].sort()
      )
      expect(a.time.tick).toBe(0)
      // Every colonist lives in an operational Residence of this scenario.
      for (const colonist of Object.values(a.colonists)) {
        const residence = colonist.residenceId === null ? undefined : a.buildings[colonist.residenceId]
        expect(residence?.type).toBe('residence')
        expect(residence?.status).toBe('operational')
      }
      for (const road of Object.values(a.roads)) {
        expect(road.status).toBe('operational')
      }
    }
  })

  it('produces distinct states (except the first-settlement scenario, which is the default game)', () => {
    const hashes = SCENARIOS.map((scenario) => hashCanonicalState(createScenarioState(shipConfig, scenario)))
    expect(new Set(hashes).size).toBe(SCENARIOS.length)
    const firstSettlement = findScenario('first-settlement')
    expect(firstSettlement).toBeDefined()
    if (firstSettlement === undefined) return
    expect(hashCanonicalState(createScenarioState(shipConfig, firstSettlement))).toBe(
      hashCanonicalState(createDefaultState(shipConfig))
    )
  })

  it('never changes the economy: costs and rates are the catalog values', () => {
    const state = createScenarioState(shipConfig, findScenario('industrial-expansion')!)
    // The scenario only supplies starting resources and existing buildings.
    expect(state.resources.construction).toBe(100)
    expect(state.resources.food).toBe(50)
    expect(state.resources.water).toBe(10)
    expect(getPopulationCount(state)).toBe(2)
    expect(getWaterProductionPerTick(state)).toBe(2)
    expect(getFoodProductionPerTick(state)).toBe(2)
  })
})

describe('scenarios — starting states and progression framing', () => {
  it('maps each scenario to its measured starting stage', () => {
    const expectations: Readonly<Record<string, { stage: string; blockers: readonly string[] }>> = {
      'first-settlement': { stage: 'wilderness', blockers: ['Population 1', 'Food balance', 'Road network'] },
      'water-constraint': { stage: 'settlement', blockers: ['Water capacity 2'] },
      'industrial-expansion': { stage: 'village', blockers: [] },
      'water-reserve-industry': { stage: 'village', blockers: [] },
      'spatial-efficiency': { stage: 'wilderness', blockers: ['Population 1', 'Food balance', 'Road network'] },
      'population-expansion': { stage: 'settlement', blockers: ['Water capacity 2'] },
      // Step 10BE: two networks, no Food production at the start.
      'housing-composition': { stage: 'wilderness', blockers: ['Food balance'] },
      recovery: { stage: 'wilderness', blockers: ['Food balance'] },
    }
    for (const scenario of SCENARIOS) {
      const state = createScenarioState(shipConfig, scenario)
      const progression = getProgression(state)
      const expected = expectations[scenario.id]
      expect(expected).toBeDefined()
      expect(progression.stage).toBe(expected?.stage)
      expect(progression.blockers).toEqual(expected?.blockers)
    }
  })

  it('gives the recovery scenario a stranded Farm and a starving reserve', () => {
    const state = createScenarioState(shipConfig, findScenario('recovery')!)
    expect(getPopulationCount(state)).toBe(1)
    // The Farm is operational but has no road access, so nobody staffs it.
    const farms = [...iterateBuildings(state)].filter((building) => building.type === 'farm')
    expect(farms).toHaveLength(1)
    expect(getFoodProductionPerTick(state)).toBe(0)
    expect(state.resources.food).toBe(30)
    // Its objective is the Settlement contract, and the only blocker is Food.
    expect(getProgression(state).blockers).toEqual(['Food balance'])
  })

  it('keeps the default game free of scenario framing', () => {
    const state = createDefaultState(shipConfig)
    expect(state.resources.construction).toBe(100)
    expect(state.resources.food).toBe(100)
    expect(state.resources.water).toBe(0)
    expect(Object.keys(state.buildings)).toHaveLength(0)
    expect(Object.keys(state.roads)).toHaveLength(0)
    expect(Object.keys(state.colonists)).toHaveLength(0)
    // Scenario framing is UI state, so the canonical payload is untouched.
    expect(serializeCanonicalState(state)).not.toContain('scenario')
  })
})
