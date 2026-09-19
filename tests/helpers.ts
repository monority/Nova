import {
  createInitialState,
  createRoads,
  iterateBuildings,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

export const testConfig: SimulationConfig = {
  world: { seed: 'nova-step0', width: 8, height: 8 },
}

export const createTestState = () => createInitialState(testConfig)

const NEIGHBOR_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const isCellFree = (state: SimulationState, cell: { readonly x: number; readonly y: number }): boolean => {
  for (const building of iterateBuildings(state)) {
    if (building.x === cell.x && building.y === cell.y) {
      return false
    }
  }
  for (const road of Object.values(state.roads)) {
    if (road.x === cell.x && road.y === cell.y) {
      return false
    }
  }
  return true
}

/**
 * Give every workshop an adjacent operational road (Step 09F fixtures).
 *
 * The 09F gameplay contract gates Material production on road access. The
 * historical economic fixtures predate roads, so workshop scenarios that
 * assert production must be road-connected. Injection is a direct domain
 * operation (no cost, no tick, no resource change) so existing numeric
 * assertions stay untouched. Deterministic: first free orthogonal neighbor
 * (N, E, S, W) per workshop.
 */
export const withRoadsForWorkshops = (state: SimulationState): SimulationState => {
  let next = state
  for (const building of iterateBuildings(state)) {
    if (building.type !== 'workshop') {
      continue
    }
    for (const [dx, dy] of NEIGHBOR_DELTAS) {
      const cell = { x: building.x + dx, y: building.y + dy }
      if (!isCellFree(next, cell)) {
        continue
      }
      const created = createRoads(next, [cell])
      const roadId = created.roadIds[0]
      if (roadId === undefined) {
        continue
      }
      const road = created.state.roads[roadId]
      if (road === undefined) {
        continue
      }
      next = {
        ...created.state,
        roads: {
          ...created.state.roads,
          [roadId]: { ...road, status: 'operational', constructionRemaining: 0 },
        },
      }
      break
    }
  }
  return next
}
