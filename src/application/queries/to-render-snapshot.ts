import type { SimulationState } from '../../domain/simulation/simulation-state'
import { toRenderWorld } from './to-render-world'
import type { RenderSnapshot } from '../contracts/render-snapshot'

export function toRenderSnapshot(state: SimulationState): RenderSnapshot {
  return {
    simulationTick: state.clock.currentTick,
    world: toRenderWorld(state.world),
    buildings: state.city.buildings.map((building) => ({
      id: building.id,
      type: building.type,
      position: building.position,
    })),
  }
}
