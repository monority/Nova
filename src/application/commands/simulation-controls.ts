import type { SimulationSpeed } from '../../domain/simulation/simulation-clock'
import type { SimulationRuntimePort } from '../contracts/simulation-runtime'

export function startSimulation(runtime: SimulationRuntimePort): void {
  runtime.start()
}

export function pauseSimulation(runtime: SimulationRuntimePort): void {
  runtime.pause()
}

export function setSimulationSpeed(runtime: SimulationRuntimePort, timeScale: SimulationSpeed): void {
  runtime.setSpeed(timeScale)
}

export function stepSimulation(runtime: SimulationRuntimePort): void {
  runtime.step()
}

export function resetSimulation(runtime: SimulationRuntimePort): void {
  runtime.reset()
}
