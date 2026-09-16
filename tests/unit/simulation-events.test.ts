import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import { detectSimulationEvents, groupUrbanChanges, projectUrbanChanges } from '../../src/application/queries/simulation-events'

describe('simulation event projection', () => {
  it('detects a new building', () => {
    const previous = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    const cell = previous.world.cells.find((candidate) => candidate.buildable === 'buildable')!
    const position = { x: cell.x, y: cell.y }
    const current = { ...previous, city: { ...previous.city, buildings: [...previous.city.buildings, { id: 'building:test' as never, type: 'house' as const, position }] } }
    expect(detectSimulationEvents(previous, current)).toEqual([{ type: 'building-created', buildingId: 'building:test', buildingType: 'house' }])
  })

  it('detects evolution on the persistent building id', () => {
    const previous = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    const building = previous.city.buildings[0]
    const current = { ...previous, city: { ...previous.city, buildings: previous.city.buildings.map((candidate) => candidate.id === building.id ? { ...candidate, type: 'apartment' as const } : candidate) } }
    expect(detectSimulationEvents(previous, current)).toEqual([{ type: 'building-evolved', buildingId: building.id, from: 'house', to: 'apartment' }])
  })

  it('detects a new road', () => {
    const previous = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    const current = { ...previous, city: { ...previous.city, roads: [...previous.city.roads, { id: 'road:test' as never, position: { x: 1, y: 1 }, orientation: 'horizontal' as const }] } }
    expect(detectSimulationEvents(previous, current)).toContainEqual(expect.objectContaining({ type: 'road-created', roadId: 'road:test' }))
  })

  it('returns no changes and remains deterministic', () => {
    const state = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    expect(detectSimulationEvents(state, state)).toEqual([])
    expect(detectSimulationEvents(state, { ...state, city: { ...state.city, buildings: [...state.city.buildings].reverse() } })).toEqual([])
  })

  it('projects stable position, tick and zone context', () => {
    const previous = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    const building = previous.city.buildings[0]
    const current = {
      ...previous,
      clock: { ...previous.clock, currentTick: 42, simulationTimeSeconds: 0.7 },
      city: {
        ...previous.city,
        zones: [{ id: 'zone:test' as never, type: 'residential' as const, cells: [building.position] }],
        buildings: previous.city.buildings.map((candidate) => candidate.id === building.id ? { ...candidate, type: 'apartment' as const } : candidate),
      },
    }
    expect(projectUrbanChanges(previous, current)).toEqual([expect.objectContaining({ kind: 'BUILDING_EVOLVED', id: building.id, position: building.position, tick: 42, label: 'DENSIFICATION', context: expect.objectContaining({ zone: 'residential' }) })])
  })

  it('groups similar changes deterministically', () => {
    const previous = createInitialSettlement(createWorld({ seed: 1, width: 16, height: 16 }))
    const current = { ...previous, clock: { ...previous.clock, currentTick: 8 }, city: { ...previous.city, zones: [], buildings: [...previous.city.buildings, { id: 'building:z' as never, type: 'house' as const, position: { x: 1, y: 1 } }, { id: 'building:a' as never, type: 'house' as const, position: { x: 2, y: 1 } }] } }
    const groups = groupUrbanChanges(projectUrbanChanges(previous, current))
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('2 HOUSES BUILT')
    expect(groups[0].changes.map((change) => change.id)).toEqual(['building:a', 'building:z'])
  })
})
