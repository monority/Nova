/**
 * Step 10DE — Foundation Freeze Audit (executable protections).
 *
 * AUDIT ONLY. `src/` is unchanged apart from stale-comment documentation fixes.
 * These tests pin the frozen foundation contracts that were not already
 * protected together: the persistence/schema shape, the scenario baseline, the
 * economy constants, the progression boundary, deterministic replay, and the
 * domain/application -> Three.js architectural boundary.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  createInitialState,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getProgression,
  getTownConditions,
  hashCanonicalState,
  loadSave,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  MIGRATABLE_SAVE_VERSION,
  MIGRATABLE_SAVE_VERSIONS,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  TAX_PER_INHABITANT_PER_TICK,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type SimulationConfig,
  type SimulationState,
} from '@/index'
import {
  DEFAULT_STORAGE_CAPACITIES,
} from '@/domain/storage/storage.js'

const config: SimulationConfig = {
  world: { seed: 'nova-step10de', width: 12, height: 12 },
}

const FROZEN_SCENARIO_IDS = [
  'first-settlement',
  'water-constraint',
  'industrial-expansion',
  'water-reserve-industry',
  'spatial-efficiency',
  'population-expansion',
  'recovery',
  'housing-composition',
  'town-threshold',
  'town-balance',
  'town-connection',
] as const

const projectFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...projectFiles(path))
    else if (entry.name.endsWith('.ts')) out.push(path)
  }
  return out
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

describe('10DE — persistence contract', () => {
  it('freezes SAVE_VERSION 13 with the v4-v12 migration chain and a 10-key state', () => {
    expect(SAVE_VERSION).toBe(13)
    expect(MIGRATABLE_SAVE_VERSION).toBe(12)
    expect([...MIGRATABLE_SAVE_VERSIONS]).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12])

    const parsed = JSON.parse(serializeSave(createInitialState(config))) as {
      version: number
      state: Record<string, unknown>
    }
    expect(parsed.version).toBe(13)
    expect(Object.keys(parsed.state)).toHaveLength(10)
  })

  it('keeps derived progression/objective/scenario state out of the save', () => {
    const serialized = serializeSave(createInitialState(config))
    for (const term of ['objective', 'progression', 'stage', 'blocker', 'scenario']) {
      expect(serialized.includes(term), term).toBe(false)
    }
  })

  it('round-trips a canonical state with a stable hash', () => {
    const state = createInitialState(config)
    const restored = loadSave(serializeSave(state))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })
})

describe('10DE — economy contracts', () => {
  it('pins the income, upkeep, capacity and storage constants', () => {
    expect(TAX_PER_INHABITANT_PER_TICK).toBe(1)
    expect(COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK).toBe(2)
    expect(MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK).toBe(1)
    expect(DEFAULT_STORAGE_CAPACITIES).toEqual({ food: 50, water: 30 })
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
  })

  it('pins the construction and road costs', () => {
    expect(ROAD_CONSTRUCTION_COST).toBe(5)
    for (const type of ['residence', 'farm', 'workshop', 'well'] as const) {
      expect(getBuildingDefinition(type).constructionCost, type).toBe(25)
      expect(getBuildingDefinition(type).constructionTicks, type).toBe(2)
    }
    expect(getBuildingDefinition('workshop').constructionWaterCost).toBe(1)
    expect(getBuildingDefinition('residence').constructionWaterCost).toBe(0)
  })
})

describe('10DE — progression contract', () => {
  it('starts at Wilderness with Settlement next and Town gated by a Staffed Workshop', () => {
    const progression = getProgression(createInitialState(config))
    expect(progression.stage).toBe('wilderness')
    expect(progression.nextStage).toBe('settlement')

    const townConditions = getTownConditions(createInitialState(config))
    expect(townConditions.some((condition) => condition.label === 'Staffed Workshop')).toBe(true)
  })
})

describe('10DE — scenario baseline', () => {
  it('freezes the 11 authored scenario ids in catalogue order', () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([...FROZEN_SCENARIO_IDS])
  })

  it('keeps every objective inside the closed requirement-kind set', () => {
    const kinds = new Set(['stage', 'population', 'waterCapacity', 'foodBalance', 'building'])
    for (const scenario of SCENARIOS) {
      expect(scenario.objective.requirements.length, scenario.id).toBeGreaterThan(0)
      for (const requirement of scenario.objective.requirements) {
        expect(kinds.has(requirement.kind), `${scenario.id}:${requirement.kind}`).toBe(true)
      }
    }
  })
})

describe('10DE — determinism and architecture boundary', () => {
  it('replays identical state and commands to an identical hash', () => {
    const a = runTicks(createInitialState(config), 5)
    const b = runTicks(createInitialState(config), 5)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('keeps the domain and application layers free of Three.js imports', () => {
    const offenders = [...projectFiles('src/domain'), ...projectFiles('src/application')]
      .filter((file) => /from\s+['"]three['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(/\\/g, '/'))
    expect(offenders).toEqual([])
  })
})
