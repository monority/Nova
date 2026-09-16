import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { placeBuilding, removeBuilding } from '../../src/application/commands/construction'
import { toBuildingId } from '../../src/domain/city'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { createInitialEconomyState } from '../../src/domain/economy'
import { SimulationRuntime } from '../../src/engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../src/engine/simulation/simulation-stepper'

function createRuntime() {
  const runtime = new SimulationRuntime(
    createSimulationState(createWorld({ seed: 4242, width: 16, height: 16 })),
    deterministicSimulationStepper,
  )
  const funded = runtime.getState()
  runtime.commitState({ ...funded, economy: createInitialEconomyState() })
  return runtime
}

function buildablePosition(runtime: ReturnType<typeof createRuntime>) {
  const cell = runtime.getState().world.cells.find((candidate) => candidate.buildable === 'buildable')
  if (!cell) throw new Error('Expected a buildable fixture cell')
  return { x: cell.x, y: cell.y }
}

describe('construction application commands', () => {
  it('places a building through the runtime boundary', () => {
    const runtime = createRuntime()
    const result = placeBuilding(runtime, { type: 'house', position: buildablePosition(runtime) })
    expect(result.valid).toBe(true)
    expect(runtime.getState().city.buildings).toHaveLength(1)
  })

  it('rejects invalid placement without changing state', () => {
    const runtime = createRuntime()
    const before = runtime.getState()
    const result = placeBuilding(runtime, { type: 'house', position: { x: -1, y: 0 } })
    expect(result).toEqual({ valid: false, reason: 'out_of_bounds' })
    expect(runtime.getState()).toBe(before)
  })

  it('removes a known building and ignores an unknown one', () => {
    const runtime = createRuntime()
    const placed = placeBuilding(runtime, { type: 'house', position: buildablePosition(runtime) })
    if (!placed.valid) throw new Error('Expected fixture placement to be valid')
    expect(removeBuilding(runtime, { buildingId: placed.building.id }).removed).toBe(true)
    expect(removeBuilding(runtime, { buildingId: toBuildingId('building:unknown') }).removed).toBe(false)
    expect(runtime.getState().city.buildings).toHaveLength(0)
  })

  it('keeps buildings while simulation ticks advance', () => {
    const runtime = createRuntime()
    const placed = placeBuilding(runtime, { type: 'house', position: buildablePosition(runtime) })
    if (!placed.valid) throw new Error('Expected fixture placement to be valid')
    runtime.advance(10)
    expect(runtime.getState().city.buildings.map((building) => building.id)).toEqual(['building:1'])
    expect(runtime.getState().clock.currentTick).toBe(10)
  })
})
