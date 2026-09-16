import {
  BASE_TICKS_PER_SECOND,
  pauseClock,
  setClockSpeed,
  startClock,
  type SimulationSpeed,
} from '../../domain/simulation/simulation-clock'
import type { SimulationState } from '../../domain/simulation/simulation-state'
import type { SimulationStepper } from './simulation-stepper'

export interface SimulationRuntimeOptions {
  maxFrameDeltaSeconds?: number
  maxTicksPerUpdate?: number
}

export interface SimulationRuntimeMetrics {
  readonly droppedRealSeconds: number
  readonly droppedSimulationTicks: number
  readonly lastProcessedTicks: number
}

const DEFAULT_MAX_FRAME_DELTA_SECONDS = 0.25
const DEFAULT_MAX_TICKS_PER_UPDATE = 120

/**
 * Step 23 — The runtime schedules whole simulation ticks (1 tick = 1 day).
 * Speed N executes N ticks per real second; it never changes tick math.
 */
export class SimulationRuntime {
  private readonly initialState: SimulationState
  private readonly stepper: SimulationStepper
  private readonly maxFrameDeltaSeconds: number
  private readonly maxTicksPerUpdate: number
  private state: SimulationState
  private accumulatorTicks = 0
  private frameHandle: number | null = null
  private lastFrameTimestamp: number | null = null
  private metrics: SimulationRuntimeMetrics = {
    droppedRealSeconds: 0,
    droppedSimulationTicks: 0,
    lastProcessedTicks: 0,
  }
  private readonly listeners = new Set<() => void>()

  constructor(initialState: SimulationState, stepper: SimulationStepper, options: SimulationRuntimeOptions = {}) {
    this.initialState = initialState
    this.stepper = stepper
    this.maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? DEFAULT_MAX_FRAME_DELTA_SECONDS
    this.maxTicksPerUpdate = options.maxTicksPerUpdate ?? DEFAULT_MAX_TICKS_PER_UPDATE
    if (this.maxFrameDeltaSeconds <= 0 || this.maxTicksPerUpdate <= 0) {
      throw new Error('Runtime limits must be positive')
    }
    this.state = initialState
  }

  getState = (): SimulationState => this.state

  getMetrics = (): SimulationRuntimeMetrics => this.metrics

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    this.state = { ...this.state, clock: startClock(this.state.clock) }
    this.notify()
    this.ensureLoop()
  }

  pause(): void {
    this.state = { ...this.state, clock: pauseClock(this.state.clock) }
    this.stopLoop()
    this.notify()
  }

  setSpeed(timeScale: SimulationSpeed): void {
    this.state = { ...this.state, clock: setClockSpeed(this.state.clock, timeScale) }
    if (timeScale === 0) this.stopLoop()
    else if (this.state.clock.status === 'running') this.ensureLoop()
    this.notify()
  }

  /** Exactly one canonical tick (one simulated day), regardless of speed. */
  step(): void {
    this.state = this.stepper.step(this.state)
    this.accumulatorTicks = 0
    this.notify()
  }

  advance(ticks: number): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('Ticks must be a non-negative integer')
    if (ticks === 0) return
    for (let index = 0; index < ticks; index += 1) this.state = this.stepper.step(this.state)
    this.notify()
  }

  reset(): void {
    this.stopLoop()
    this.accumulatorTicks = 0
    this.metrics = { droppedRealSeconds: 0, droppedSimulationTicks: 0, lastProcessedTicks: 0 }
    this.state = this.initialState
    this.notify()
  }

  commitState(state: SimulationState): void {
    this.state = state
    this.accumulatorTicks = 0
    this.notify()
  }

  update(elapsedMilliseconds: number): number {
    if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) {
      throw new Error('Elapsed milliseconds must be a non-negative finite number')
    }
    if (this.state.clock.status !== 'running' || this.state.clock.timeScale === 0) return 0

    const elapsedSeconds = elapsedMilliseconds / 1000
    const boundedSeconds = Math.min(elapsedSeconds, this.maxFrameDeltaSeconds)
    const droppedRealSeconds = elapsedSeconds - boundedSeconds
    this.accumulatorTicks += boundedSeconds * BASE_TICKS_PER_SECOND * this.state.clock.timeScale

    let processedTicks = 0
    while (this.accumulatorTicks >= 1 && processedTicks < this.maxTicksPerUpdate) {
      this.state = this.stepper.step(this.state)
      this.accumulatorTicks -= 1
      processedTicks += 1
    }

    const overdueTicks = Math.floor(this.accumulatorTicks)
    this.accumulatorTicks -= overdueTicks
    this.metrics = {
      droppedRealSeconds: this.metrics.droppedRealSeconds + droppedRealSeconds,
      droppedSimulationTicks: this.metrics.droppedSimulationTicks + overdueTicks,
      lastProcessedTicks: processedTicks,
    }
    if (processedTicks > 0) this.notify()
    return processedTicks
  }

  dispose(): void {
    this.stopLoop()
    this.listeners.clear()
  }

  private ensureLoop(): void {
    if (this.frameHandle !== null || typeof window === 'undefined') return
    this.lastFrameTimestamp = null
    this.frameHandle = window.requestAnimationFrame(this.handleFrame)
  }

  private stopLoop(): void {
    if (this.frameHandle !== null && typeof window !== 'undefined') window.cancelAnimationFrame(this.frameHandle)
    this.frameHandle = null
    this.lastFrameTimestamp = null
  }

  private handleFrame = (timestamp: number): void => {
    this.frameHandle = null
    if (this.state.clock.status !== 'running') return
    const elapsedMilliseconds = this.lastFrameTimestamp === null ? 0 : timestamp - this.lastFrameTimestamp
    this.lastFrameTimestamp = timestamp
    this.update(elapsedMilliseconds)
    this.ensureLoop()
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}
