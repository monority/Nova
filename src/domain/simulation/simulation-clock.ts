/**
 * Step 23 — Canonical simulation time.
 *
 * One simulation tick equals one simulated day. Render frames and simulation
 * ticks are separate units: the renderer may run at 60 FPS while the domain
 * advances whole days. Speeds control how many ticks run per real second.
 */
export const SIMULATION_TIME = {
  TICKS_PER_DAY: 1,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 360,
  SECONDS_PER_DAY: 24 * 60 * 60,
} as const

export const SIMULATION_SPEEDS = [0, 1, 2, 5, 20, 100] as const

/** Ticks per real second at 1x. Speed N runs N ticks per second. */
export const BASE_TICKS_PER_SECOND = 1

export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number]
export type SimulationStatus = 'paused' | 'running'

export interface SimulationClock {
  readonly currentTick: number
  readonly simulationTimeSeconds: number
  readonly timeScale: SimulationSpeed
  readonly status: SimulationStatus
}

export function createSimulationClock(): SimulationClock {
  return {
    currentTick: 0,
    simulationTimeSeconds: 0,
    timeScale: 1,
    status: 'paused',
  }
}

export function startClock(clock: SimulationClock): SimulationClock {
  return {
    ...clock,
    timeScale: clock.timeScale === 0 ? 1 : clock.timeScale,
    status: 'running',
  }
}

export function pauseClock(clock: SimulationClock): SimulationClock {
  return { ...clock, status: 'paused' }
}

export function setClockSpeed(clock: SimulationClock, timeScale: SimulationSpeed): SimulationClock {
  if (!SIMULATION_SPEEDS.includes(timeScale)) throw new Error(`Unsupported simulation speed: ${timeScale}`)
  return {
    ...clock,
    timeScale,
    status: timeScale === 0 ? 'paused' : clock.status,
  }
}

export function advanceClock(clock: SimulationClock, ticks: number): SimulationClock {
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error('Ticks must be a non-negative integer')
  return {
    ...clock,
    currentTick: clock.currentTick + ticks,
    simulationTimeSeconds: clock.simulationTimeSeconds + ticksToSeconds(ticks),
  }
}

export function stepClock(clock: SimulationClock): SimulationClock {
  return advanceClock(clock, 1)
}

export function resetClock(): SimulationClock {
  return createSimulationClock()
}

export function ticksToSeconds(ticks: number): number {
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error('Ticks must be a non-negative integer')
  return ticks * SIMULATION_TIME.SECONDS_PER_DAY
}

/** Whole simulated days elapsed (tick 0 = day 1). */
export function ticksToDays(ticks: number): number {
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error('Ticks must be a non-negative integer')
  return ticks * SIMULATION_TIME.TICKS_PER_DAY
}
