import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import { toInspection } from '../../src/application/queries/to-inspection'

describe('urban inspection projection', () => {
  it('projects a real house without exposing internal scores', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 }))
    const house = state.city.buildings.find((building) => building.type === 'house')
    if (!house) throw new Error('Expected house')
    const inspection = toInspection(state, { kind: 'building', id: house.id })
    expect(inspection).toMatchObject({ kind: 'building', title: 'HOUSE', capacity: 4 })
    expect(inspection).not.toHaveProperty('score')
  })

  it('projects roads, services and empty selection deterministically', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 }))
    expect(toInspection(state, { kind: 'road', id: state.city.roads[0].id })?.kind).toBe('road')
    expect(toInspection(state, { kind: 'service', id: state.city.services[0].id })?.kind).toBe('service')
    expect(toInspection(state, null)).toBeNull()
  })
})
