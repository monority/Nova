import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { placeRoad, removeRoad } from '../../src/application/commands/construction'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { createInitialEconomyState } from '../../src/domain/economy'
import { SimulationRuntime } from '../../src/engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../src/engine/simulation/simulation-stepper'
import { toRoadId } from '../../src/domain/city'

function createRuntime() {
  const runtime = new SimulationRuntime(createSimulationState(createWorld({ seed: 4242, width: 16, height: 16 })), deterministicSimulationStepper)
  const funded = runtime.getState()
  runtime.commitState({ ...funded, economy: createInitialEconomyState() })
  return runtime
}

function position(runtime: ReturnType<typeof createRuntime>) {
  const cell = runtime.getState().world.cells.find((candidate) => candidate.buildable === 'buildable')
  if (!cell) throw new Error('Expected buildable fixture cell')
  return { x: cell.x, y: cell.y }
}

describe('road application commands', () => {
  it('places and removes roads through the runtime boundary', () => {
    const runtime = createRuntime()
    const placed = placeRoad(runtime, { position: position(runtime) })
    expect(placed.valid).toBe(true)
    if (!placed.valid) return
    expect(runtime.getState().city.roads).toHaveLength(1)
    expect(removeRoad(runtime, { roadId: placed.road.id }).removed).toBe(true)
    expect(removeRoad(runtime, { roadId: toRoadId('road:unknown') }).removed).toBe(false)
  })

  it('keeps roads through simulation ticks', () => {
    const runtime = createRuntime()
    const placed = placeRoad(runtime, { position: position(runtime) })
    if (!placed.valid) throw new Error('Expected road fixture placement to be valid')
    runtime.advance(100)
    expect(runtime.getState().city.roads.map((road) => road.id)).toEqual(['road:1'])
  })
})
