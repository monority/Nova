/**
 * Simulation clock (Step 1 #9, #10).
 *
 * Real browser time drives WHEN the application advances the simulation;
 * simulation time itself stays inside stepSimulation. This module never
 * touches canonical state and never leaks wall-clock into the domain.
 *
 *   animation frame -> clock.accumulate(elapsedMs) -> onTick() callbacks
 *
 * STEP advances exactly one tick. PLAY advances at `ticksPerSecond * speed`.
 */

export interface SimulationClock {
  /** Feed elapsed real time (ms) since last frame; may fire 0..N ticks. */
  accumulate: (elapsedMs: number) => void
  /** Advance exactly one tick, regardless of play state. */
  stepOnce: () => void
  play: () => void
  pause: () => void
  isPlaying: () => boolean
  setSpeed: (speed: 1 | 2 | 4) => void
  dispose: () => void
}

export interface ClockOptions {
  /** Ticks per real second at 1x. Presentation concern only. */
  readonly baseTicksPerSecond?: number
  onTick: () => void
}

export const createSimulationClock = (
  options: ClockOptions
): SimulationClock => {
  const baseTicksPerSecond = options.baseTicksPerSecond ?? 1
  let playing = false
  let speed: 1 | 2 | 4 = 1
  let accumulated = 0

  const tickIntervalMs = (): number =>
    1000 / (baseTicksPerSecond * speed)

  const advance = (): void => {
    options.onTick()
  }

  const accumulate = (elapsedMs: number): void => {
    if (!playing) {
      return
    }
    accumulated += elapsedMs
    // Cap catch-up so long tab stalls cannot fast-forward the simulation
    // unboundedly; simulation stays command/tick-driven, not time-driven.
    let ticks = 0
    while (accumulated >= tickIntervalMs() && ticks < 8) {
      accumulated -= tickIntervalMs()
      advance()
      ticks += 1
    }
    if (accumulated > tickIntervalMs()) {
      accumulated = 0
    }
  }

  return {
    accumulate,
    stepOnce: () => advance(),
    play: () => {
      playing = true
      accumulated = 0
    },
    pause: () => {
      playing = false
      accumulated = 0
    },
    isPlaying: () => playing,
    setSpeed: (next) => {
      speed = next
    },
    dispose: () => {
      playing = false
    },
  }
}
