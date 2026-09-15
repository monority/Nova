import { describe, expect, it } from 'vitest'
import {
  FIXED_TIMESTEP_SECONDS,
  advanceClock,
  createSimulationClock,
  pauseClock,
  setClockSpeed,
  startClock,
  stepClock,
} from '../../../src/domain/simulation/simulation-clock'

describe('simulation clock', () => {
  it('starts paused at tick zero', () => {
    expect(createSimulationClock()).toEqual({
      currentTick: 0,
      simulationTimeSeconds: 0,
      timeScale: 1,
      status: 'paused',
    })
  })

  it('starts and pauses without changing simulation time', () => {
    const running = startClock(createSimulationClock())
    expect(running.status).toBe('running')
    expect(pauseClock(running).status).toBe('paused')
    expect(pauseClock(running).currentTick).toBe(0)
  })

  it('supports centralized speeds and zero speed pauses', () => {
    const clock = createSimulationClock()
    expect(setClockSpeed(clock, 20).timeScale).toBe(20)
    expect(setClockSpeed(startClock(clock), 0).status).toBe('paused')
    expect(() => setClockSpeed(clock, 3 as never)).toThrow()
  })

  it('steps exactly one fixed tick', () => {
    const stepped = stepClock(createSimulationClock())
    expect(stepped.currentTick).toBe(1)
    expect(stepped.simulationTimeSeconds).toBe(FIXED_TIMESTEP_SECONDS)
  })

  it('advances only by requested ticks', () => {
    const advanced = advanceClock(createSimulationClock(), 6)
    expect(advanced.currentTick).toBe(6)
    expect(advanced.simulationTimeSeconds).toBe(6 * FIXED_TIMESTEP_SECONDS)
    expect(() => advanceClock(advanced, -1)).toThrow()
  })
})
