export interface SimulationClock {
  tick: number
  day: number
  year: number
}

export const TICKS_PER_YEAR = 360

export function createSimulationClock(): SimulationClock {
  return { tick: 0, day: 1, year: 1 }
}

export function advanceSimulationClock(clock: SimulationClock, ticks = 1): SimulationClock {
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer')
  const nextTick = clock.tick + ticks
  return {
    tick: nextTick,
    day: (nextTick % TICKS_PER_YEAR) + 1,
    year: Math.floor(nextTick / TICKS_PER_YEAR) + 1,
  }
}
