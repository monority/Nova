/**
 * Step004 — Day-0 bootstrap hardening (audit D4).
 *
 * The Colony Center is a guaranteed Day-0 singleton anchor: pre-placed,
 * operational, maintenance-exempt, unplaceable, and it always preserves the
 * primitive Wood recovery path.
 */

import { describe, expect, it } from 'vitest'

import {
  COLONY_CENTER_ID,
  applyCommand,
  createInitialState,
  hashCanonicalState,
  loadSave,
  getMaintenanceDuePerTick,
  produceWood,
  serializeSave,
  validatePlacement,
  countOperationalBuildings,
  type SimulationConfig,
} from '@/index'

const config: SimulationConfig = {
  world: {
    seed: 'nova-step004-day0',
    width: 12,
    height: 12,
    // A deposit adjacent to the deterministic anchor cell (bottom-right
    // corner of a 12x12 = (11,11)).
    woodDeposits: [{ x: 10, y: 11, remaining: 10 }],
  },
}

describe('Step004 — day-0 Colony Center', () => {
  it('day-0 existence: every new colony owns exactly one operational Colony Center', () => {
    const state = createInitialState(config)
    expect(Object.keys(state.buildings)).toEqual([COLONY_CENTER_ID])
    const anchor = state.buildings[COLONY_CENTER_ID]
    expect(anchor?.type).toBe('colonyCenter')
    expect(anchor?.status).toBe('operational')
    expect(countOperationalBuildings(state)).toBe(1)
  })

  it('day-0 recovery: the anchor extracts wood with population 0 and no Lumber Camp', () => {
    const state = createInitialState(config)
    expect(Object.keys(state.colonists)).toHaveLength(0)
    expect(
      Object.values(state.buildings).some((b) => b.type === 'lumberCamp')
    ).toBe(false)

    const after = produceWood(state)
    expect(after.resources.wood).toBe(1)
    expect(after.woodDeposits['10,11']!.remaining).toBe(9)
  })

  it('maintenance-exempt: the anchor never bills the treasury (economy unchanged)', () => {
    const state = createInitialState(config)
    expect(getMaintenanceDuePerTick(state)).toBe(0)
  })

  it('uniqueness: a second Colony Center can never be created', () => {
    const state = createInitialState(config)
    const validation = validatePlacement(state, { x: 3, y: 3 }, 'colonyCenter')
    expect(validation).toEqual({ valid: false, reason: 'colonyCenterExists' })
    const attempt = applyCommand(state, {
      type: 'placeBuilding',
      x: 3,
      y: 3,
      buildingType: 'colonyCenter',
    })
    expect(attempt.accepted).toBe(false)
    expect(Object.keys(attempt.state.buildings)).toEqual([COLONY_CENTER_ID])
  })

  it('anchor placement is deterministic: bottom-right first valid cell', () => {
    const anchor = createInitialState(config).buildings[COLONY_CENTER_ID]
    expect(anchor?.x).toBe(11)
    expect(anchor?.y).toBe(11)
  })

  it('anchor placement respects blocked cells and deposits', () => {
    const blockedConfig: SimulationConfig = {
      world: {
        seed: 'nova-step004-blocked',
        width: 4,
        height: 4,
        blockedCells: ['3,3', '3,2'],
        woodDeposits: [{ x: 3, y: 1, remaining: 5 }],
      },
    }
    const anchor = createInitialState(blockedConfig).buildings[COLONY_CENTER_ID]
    // Reverse scan: (3,3) blocked, (2,3) free.
    expect([anchor?.x, anchor?.y]).toEqual([2, 3])
  })

  it('persistence: save/load preserves the Colony Center exactly', () => {
    const state = createInitialState(config)
    const restored = loadSave(serializeSave(state))
    expect(restored.buildings[COLONY_CENTER_ID]).toEqual(
      state.buildings[COLONY_CENTER_ID]
    )
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
  })

  it('anchor placement never overlaps a wood deposit or blocked terrain', () => {
    // The deposit cell itself is not buildable and the anchor avoids it.
    const state = createInitialState(config)
    expect(
      Object.values(state.buildings).some(
        (b) => b.x === 10 && b.y === 11
      )
    ).toBe(false)
  })
})
