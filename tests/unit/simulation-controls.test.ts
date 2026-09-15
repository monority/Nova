import { describe, expect, it, vi } from 'vitest'
import { pauseSimulation, resetSimulation, setSimulationSpeed, startSimulation, stepSimulation } from '../../src/application/commands/simulation-controls'

function createPort() {
  return {
    getState: vi.fn(),
    subscribe: vi.fn(),
    commitState: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    setSpeed: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
  }
}

describe('simulation application controls', () => {
  it('forwards intent to the runtime port', () => {
    const runtime = createPort()
    startSimulation(runtime)
    pauseSimulation(runtime)
    setSimulationSpeed(runtime, 20)
    stepSimulation(runtime)
    resetSimulation(runtime)
    expect(runtime.start).toHaveBeenCalledOnce()
    expect(runtime.pause).toHaveBeenCalledOnce()
    expect(runtime.setSpeed).toHaveBeenCalledWith(20)
    expect(runtime.step).toHaveBeenCalledOnce()
    expect(runtime.reset).toHaveBeenCalledOnce()
  })
})
