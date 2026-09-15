import type { SimulationSpeed } from '../../domain/simulation/simulation-clock'
import type { SimulationState } from '../../domain/simulation/simulation-state'

export interface SimulationRuntimePort {
  getState(): SimulationState
  subscribe(listener: () => void): () => void
  commitState(state: SimulationState): void
  start(): void
  pause(): void
  setSpeed(timeScale: SimulationSpeed): void
  step(): void
  reset(): void
}
