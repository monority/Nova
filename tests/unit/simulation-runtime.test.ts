import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createSimulationState } from '../../src/domain/simulation/simulation-state'
import { SIMULATION_TIME } from '../../src/domain/simulation/simulation-clock'
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

  it('runs one tick per second at 1x (1 tick = 1 day)', () => {
    const runtime = createRuntime()
    runtime.start()
    let processed = 0
    for (let frame = 0; frame < 4; frame += 1) processed += runtime.update(250)
    expect(processed).toBe(1)
    expect(runtime.getState().clock.currentTick).toBe(1)
    expect(runtime.getState().clock.simulationTimeSeconds).toBe(SIMULATION_TIME.SECONDS_PER_DAY)
  })

  it('is independent of elapsed-time frame partitioning', () => {
    const whole = createRuntime()
    const partitioned = createRuntime()
    whole.start()
    partitioned.start()
    for (let frame = 0; frame < 8; frame += 1) whole.update(250)
    for (let frame = 0; frame < 16; frame += 1) partitioned.update(125)
    expect(partitioned.getState().clock.currentTick).toBe(whole.getState().clock.currentTick)
    expect(partitioned.getState().clock.simulationTimeSeconds).toBe(whole.getState().clock.simulationTimeSeconds)
  })

  it('scales ticks without using wall-clock waits', () => {
    const runtime = createRuntime()
    runtime.start()
    runtime.setSpeed(5)
    let processed = 0
    for (let frame = 0; frame < 8; frame += 1) processed += runtime.update(250)
    expect(processed).toBe(10)
    expect(runtime.getState().clock.currentTick).toBe(10)
  })

  it('steps exactly one tick regardless of speed', () => {
    const runtime = createRuntime()
    runtime.setSpeed(100)
    runtime.step()
    expect(runtime.getState().clock.currentTick).toBe(1)
    expect(runtime.getState().clock.simulationTimeSeconds).toBe(SIMULATION_TIME.SECONDS_PER_DAY)
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
    runtime.setSpeed(100)
    expect(runtime.update(10_000)).toBe(4)
    expect(runtime.getMetrics().droppedRealSeconds).toBe(9.75)
    expect(runtime.getMetrics().droppedSimulationTicks).toBe(21)
  })

  it('resets to the initial simulation state', () => {
    const runtime = createRuntime()
    runtime.start()
    runtime.advance(3)
    runtime.reset()
    expect(runtime.getState().clock.currentTick).toBe(0)
    expect(runtime.getState().clock.status).toBe('paused')
  })
})
