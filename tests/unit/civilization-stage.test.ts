import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import {
  detectStageTransition,
  projectStageTransitionGroup,
  toCivilizationStage,
} from '../../src/application/queries/to-civilization-stage'
import { CIVILIZATION_THRESHOLDS, evaluateCivilizationStage } from '../../src/domain/civilization'

describe('step22 civilization evaluator', () => {
  it('uses contract thresholds 20 / 50 / 500', () => {
    expect(CIVILIZATION_THRESHOLDS.settlement).toEqual({ population: 20, houses: 1 })
    expect(CIVILIZATION_THRESHOLDS.village).toEqual({ population: 50 })
    expect(CIVILIZATION_THRESHOLDS.town).toEqual({ population: 500 })
  })

  it('wilderness below every threshold', () => {
    expect(evaluateCivilizationStage({ population: 0, houses: 0 })).toBe('wilderness')
    expect(evaluateCivilizationStage({ population: 19, houses: 0 })).toBe('wilderness')
    expect(evaluateCivilizationStage({ population: 19, houses: 1 })).toBe('wilderness')
    expect(evaluateCivilizationStage({ population: 20, houses: 0 })).toBe('wilderness')
  })

  it('settlement from 20 people with at least one house', () => {
    expect(evaluateCivilizationStage({ population: 20, houses: 1 })).toBe('settlement')
    expect(evaluateCivilizationStage({ population: 20, houses: 10 })).toBe('settlement')
    expect(evaluateCivilizationStage({ population: 49, houses: 1 })).toBe('settlement')
  })

  it('village from 50 people', () => {
    expect(evaluateCivilizationStage({ population: 50, houses: 0 })).toBe('village')
    expect(evaluateCivilizationStage({ population: 100, houses: 3 })).toBe('village')
    expect(evaluateCivilizationStage({ population: 499, houses: 9 })).toBe('village')
  })

  it('town from 500 people', () => {
    expect(evaluateCivilizationStage({ population: 500, houses: 0 })).toBe('town')
    expect(evaluateCivilizationStage({ population: 1000, houses: 40 })).toBe('town')
  })

  it('is deterministic', () => {
    const input = { population: 49, houses: 2 }
    expect(evaluateCivilizationStage(input)).toBe(evaluateCivilizationStage({ ...input }))
  })
})

describe('step22 stage transitions', () => {
  const base = () => createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 }))

  it('initial settlement reads wilderness (population 12 < 20)', () => {
    const state = base()
    expect(state.population.total).toBeLessThan(20)
    expect(toCivilizationStage(state)).toBe('wilderness')
  })

  it('detects wilderness → settlement with tick', () => {
    const previous = base()
    const current = { ...previous, population: { total: 20, growthProgress: 0 } }
    const transition = detectStageTransition(previous, current)
    expect(transition).toEqual({ previous: 'wilderness', current: 'settlement', tick: current.clock.currentTick })
  })

  it('detects settlement → village and village → town', () => {
    const previous = base()
    const village = { ...previous, population: { total: 50, growthProgress: 0 } }
    expect(detectStageTransition(previous, village)?.current).toBe('village')
    const town = { ...previous, population: { total: 500, growthProgress: 0 } }
    expect(detectStageTransition(village, town)).toEqual({ previous: 'village', current: 'town', tick: town.clock.currentTick })
  })

  it('emits no event when the stage is unchanged', () => {
    const previous = base()
    expect(detectStageTransition(previous, previous)).toBeNull()
    expect(projectStageTransitionGroup(previous, previous)).toBeNull()
  })

  it('projects a single feed group with a stable key and label', () => {
    const previous = base()
    const current = { ...previous, population: { total: 50, growthProgress: 0 } }
    const group = projectStageTransitionGroup(previous, current)
    expect(group?.label).toBe('VILLAGE ESTABLISHED')
    expect(group?.tick).toBe(current.clock.currentTick)
    expect(group?.changes).toHaveLength(0)
    expect(projectStageTransitionGroup(previous, { ...current })?.key).toBe(group?.key)
  })
})
