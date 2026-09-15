import type { SimulationState } from '../../domain/simulation/simulation-state'
import { toRenderWorld } from './to-render-world'
import type { RenderSnapshot } from '../contracts/render-snapshot'
import { getRoadConnectionMask } from '../../domain/construction'
import { classifyRoad } from '../../domain/city'

export function toRenderSnapshot(state: SimulationState): RenderSnapshot {
  return {
    simulationTick: state.clock.currentTick,
    world: toRenderWorld(state.world),
    buildings: state.city.buildings.map((building) => ({
      id: building.id,
      type: building.type,
      position: building.position,
    })),
    roads: (state.city.roads ?? []).map((road) => ({
      id: road.id,
      position: road.position,
      orientation: road.orientation,
      connectionMask: getRoadConnectionMask(state.city, road.position),
      roadClass: classifyRoad(road, state.city.roads),
    })),
    population: { total: state.population?.total ?? 0 },
    zones: (state.city.zones ?? []).map((zone) => ({ id: zone.id, type: zone.type, cells: zone.cells })),
    services: (state.city.services ?? []).map((service) => ({ id: service.id, type: service.type, position: service.position })),
  }
}
