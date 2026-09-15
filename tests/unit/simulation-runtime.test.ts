import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { SimulationRuntime } from '../../src/engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../src/engine/simulation/simulation-stepper'

function createRuntime(options = {}) {
  const world = createWorld({ seed: 42, width: 4, height: 4 })
  return new SimulationRuntime(createSimulationState(world), deterministicSimulationStepper, {
    maxTicksPerUpdate: 1000,
    ...options,
  })
}

describe('simulation runtime', () => {
  it('does not advance while paused', () => {
    const runtime = createRuntime()
    expect(runtime.update(1000)).toBe(0)
    expect(runtime.getState().clock.currentTick).toBe(0)
  })

  it('advances fixed ticks from controlled elapsed time', () => {
    const runtime = createRuntime()
    runtime.start()
    expect(runtime.update(100)).toBe(6)
    expect(runtime.getState().clock.currentTick).toBe(6)
  })

  it('is independent of elapsed-time frame partitioning', () => {
    const whole = createRuntime()
    const partitioned = createRuntime()
    whole.start()
    partitioned.start()
    whole.update(100)
    ;[16, 16, 16, 16, 16, 20].forEach((delta) => partitioned.update(delta))
    expect(partitioned.getState().clock.currentTick).toBe(whole.getState().clock.currentTick)
    expect(partitioned.getState().clock.simulationTimeSeconds).toBe(whole.getState().clock.simulationTimeSeconds)
  })

  it('scales ticks without using wall-clock waits', () => {
    const runtime = createRuntime()
    runtime.start()
    runtime.setSpeed(5)
    expect(runtime.update(100)).toBe(30)
    expect(runtime.getState().clock.currentTick).toBe(30)
  })

  it('steps exactly one tick regardless of speed', () => {
    const runtime = createRuntime()
    runtime.setSpeed(100)
    runtime.step()
    expect(runtime.getState().clock.currentTick).toBe(1)
  })

  it('advances explicit ticks through the simulation stepper', () => {
    const runtime = createRuntime()
    runtime.advance(4)
    expect(runtime.getState().clock.currentTick).toBe(4)
  })

  it('bounds stalled frames and reports discarded catch-up ticks', () => {
    const runtime = new SimulationRuntime(
      createSimulationState(createWorld({ seed: 42, width: 4, height: 4 })),
      deterministicSimulationStepper,
      { maxTicksPerUpdate: 4 },
    )
    runtime.start()
    expect(runtime.update(10_000)).toBe(4)
    expect(runtime.getMetrics().droppedRealSeconds).toBe(9.75)
    expect(runtime.getMetrics().droppedSimulationTicks).toBeGreaterThan(0)
  })

  it('resets to the initial simulation state', () => {
    const runtime = createRuntime()
    runtime.start()
    runtime.update(100)
    runtime.reset()
    expect(runtime.getState().clock.currentTick).toBe(0)
    expect(runtime.getState().clock.status).toBe('paused')
  })
})
