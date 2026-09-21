import {
  assignJobs,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getRoadIdAtCell,
  iterateBuildings,
  progressOneBuilding,
  stepSimulation,
  type BuildingState,
  type CellCoordinate,
  type PlaceBuildingCommand,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

export const testConfig: SimulationConfig = {
  world: { seed: 'nova-step0', width: 8, height: 8 },
}

export const createTestState = () => createInitialState(testConfig)

/**
 * Step 10Y timing isolation for the historical audit fixtures.
 *
 * Step 10Y removed the placement catch-up, so a 2-tick building now needs
 * exactly two construction ticks after placement (that is what makes a
 * construction crew's +1 observable at all). Audit fixtures from earlier
 * steps document HISTORICAL tick-by-tick trajectories; `placeCatchUp`
 * restores the old placement timing for them so their documented rows stay
 * exact. Current construction timing is asserted by constructionCrew,
 * inspection, jobs and simulation tests instead.
 */
export const catchUpPlaced = (
  state: SimulationState,
  buildingId: string
): SimulationState => {
  const building = state.buildings[buildingId]
  if (building === undefined) {
    return state
  }
  const advanced = progressOneBuilding(building)
  return advanced === building
    ? state
    : { ...state, buildings: { ...state.buildings, [buildingId]: advanced } }
}

/** Place a building with the historical placement catch-up (see above). */
export const placeCatchUp = (
  state: SimulationState,
  command: PlaceBuildingCommand | SimulationCommand | undefined
): SimulationState => {
  if (command === undefined || command.type !== 'placeBuilding') {
    return stepSimulation(state, command)
  }
  if (command === undefined || command.type !== 'placeBuilding') {
    return stepSimulation(state, command)
  }
  const before = new Set(Object.keys(state.buildings))
  const after = stepSimulation(state, command)
  const placedId = Object.keys(after.buildings).find((id) => !before.has(id))
  return placedId === undefined ? after : catchUpPlaced(after, placedId)
}

const NEIGHBOR_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const isCellFree = (state: SimulationState, cell: CellCoordinate): boolean => {
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

/** A cell a road can be written to: either free, or already a road. */
const isCellPlaceable = (state: SimulationState, cell: CellCoordinate): boolean =>
  isCellFree(state, cell) || getRoadIdAtCell(state, cell) !== null

/**
 * Manhattan intermediate cells from `from` to `to`, EXCLUDING both
 * endpoints. `horizontalFirst` picks the leg order. Callers use building
 * cells as endpoints (the path then ends orthogonally adjacent to the
 * building) or existing road cells (the path ends orthogonally adjacent to
 * the road, which is already a valid network endpoint).
 */
const manhattanPath = (
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  horizontalFirst: boolean
): CellCoordinate[] => {
  const path: CellCoordinate[] = []
  const stepX = Math.sign(to.x - from.x)
  const stepY = Math.sign(to.y - from.y)
  let x = from.x
  let y = from.y
  const push = (cx: number, cy: number): void => {
    if (cx !== to.x || cy !== to.y) {
      path.push({ x: cx, y: cy })
    }
  }
  if (horizontalFirst) {
    while (x !== to.x) {
      x += stepX
      push(x, y)
    }
    while (y !== to.y) {
      y += stepY
      push(x, y)
    }
  } else {
    while (y !== to.y) {
      y += stepY
      push(x, y)
    }
    while (x !== to.x) {
      x += stepX
      push(x, y)
    }
  }
  return path
}

/** Place an operational road at a free cell, or make an existing road operational. */
const placeOperationalRoad = (
  state: SimulationState,
  cell: CellCoordinate
): SimulationState => {
  const existingRoadId = getRoadIdAtCell(state, cell)
  if (existingRoadId !== null) {
    const road = state.roads[existingRoadId]
    if (road !== undefined && road.status !== 'operational') {
      return {
        ...state,
        roads: {
          ...state.roads,
          [existingRoadId]: { ...road, status: 'operational', constructionRemaining: 0 },
        },
      }
    }
    return state
  }
  if (!isCellFree(state, cell)) {
    return state
  }
  const created = createRoads(state, [cell])
  const roadId = created.roadIds[0]
  if (roadId === undefined) {
    return state
  }
  const road = created.state.roads[roadId]
  if (road === undefined) {
    return state
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [roadId]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/**
 * Connect one building to the nearest target cell with an all-placeable
 * Manhattan path. Both leg orders are tried; the nearest target first.
 * Returns the state unchanged when no free route exists.
 */
const connectBuildingToNearest = (
  state: SimulationState,
  building: BuildingState,
  targets: readonly CellCoordinate[]
): SimulationState => {
  if (targets.length === 0) {
    return state
  }
  const sorted = [...targets].sort((a, b) => {
    const da = Math.abs(a.x - building.x) + Math.abs(a.y - building.y)
    const db = Math.abs(b.x - building.x) + Math.abs(b.y - building.y)
    if (da !== db) {
      return da - db
    }
    if (a.x !== b.x) {
      return a.x - b.x
    }
    return a.y - b.y
  })
  for (const target of sorted) {
    for (const horizontalFirst of [false, true]) {
      const path = manhattanPath(building, target, horizontalFirst)
      if (path.length === 0) {
        continue
      }
      if (!path.every((cell) => isCellPlaceable(state, cell))) {
        continue
      }
      let candidate = state
      for (const cell of path) {
        candidate = placeOperationalRoad(candidate, cell)
      }
      return candidate
    }
  }
  return state
}

/**
 * Ensure every operational Farm has a worker (Step 10E: a Farm produces only
 * when staffed). For each vacant operational farm, inject a farmer residence
 * adjacent to the farm plus one colonist, with a shared operational road cell
 * so the farmer's nearest workplace is that farm (distance 0). Injection is a
 * direct domain operation — no cost, no tick, no resource change — the same
 * convention as `withRoadsForWorkshops`, so material/upkeep/storage numbers in
 * existing fixtures stay untouched. Returns the state with `assignJobs`
 * applied so the injected farmers are actually staffed.
 *
 * Fixtures that assert exact population/employment counts must NOT use this
 * helper: it adds one colonist per staffed farm. Prefer a pre-stocked food
 * buffer there instead (material fixtures isolate the variable they measure).
 */
export const withStaffedFarms = (state: SimulationState): SimulationState => {
  let next = state
  const farms = [...iterateBuildings(next)].filter(
    (building) => building.type === 'farm' && building.status === 'operational'
  )
  for (const farm of farms) {
    if (countWorkersAt(next, farm.id) > 0) {
      continue
    }
    // Shared contact road: first free orthogonal neighbour of the farm.
    const roadCell = NEIGHBOR_DELTAS.map(([dx, dy]) => ({
      x: farm.x + dx,
      y: farm.y + dy,
    })).find((cell) => isCellFree(next, cell))
    if (roadCell === undefined) {
      continue
    }
    next = placeOperationalRoad(next, roadCell)
    // Farmer residence: first free orthogonal neighbour of the road (not the
    // farm itself), so the farm is at road distance 0 from the residence.
    const residenceCell = NEIGHBOR_DELTAS.map(([dx, dy]) => ({
      x: roadCell.x + dx,
      y: roadCell.y + dy,
    })).find(
      (cell) =>
        isCellFree(next, cell) && !(cell.x === farm.x && cell.y === farm.y)
    )
    if (residenceCell === undefined) {
      continue
    }
    const created = createBuilding(
      next,
      'residence',
      residenceCell.x,
      residenceCell.y,
      0
    )
    next = created.state
    const building = next.buildings[created.buildingId]
    if (building === undefined) {
      continue
    }
    next = {
      ...next,
      buildings: {
        ...next.buildings,
        [created.buildingId]: {
          ...building,
          status: 'operational',
          constructionRemaining: 0,
        },
      },
    }
    next = createColonist(next, created.buildingId).state
  }
  return assignJobs(next)
}

/** Road cells currently present in canonical state. */
const roadCells = (state: SimulationState): CellCoordinate[] =>
  Object.values(state.roads).map((road) => ({ x: road.x, y: road.y }))

/**
 * Give every workshop and residence operational road access AND put them on
 * shared networks (09F + 09K fixtures).
 *
 * 09F gates Material production on road access; 09K gates employment on
 * residence-to-workplace mobility connectivity. The historical economic
 * fixtures predate roads, so scenarios that assert production or employment
 * must be road-connected. Injection is a direct domain operation (no cost,
 * no tick, no resource change) so existing numeric assertions stay
 * untouched. Deterministic: targets are sorted by (Manhattan distance, x, y)
 * and both Manhattan leg orders are tried in a fixed order.
 *
 * Existing road cells are preferred as connection targets (minimal new
 * roads, fewer collisions with buildings placed later in a scenario); when
 * no road exists yet, the other building type is used as the target.
 */
export const withRoadsForWorkshops = (state: SimulationState): SimulationState => {
  let next = state
  const buildings = [...iterateBuildings(state)]
  const residences = buildings.filter((b) => b.type === 'residence')
  const workshops = buildings.filter((b) => b.type === 'workshop')
  // Step 10E: Farms are workplaces too — they need road access for staffing.
  const farms = buildings.filter((b) => b.type === 'farm')
  const production = [...workshops, ...farms]

  // Connect each production building to an existing road (or, first time,
  // a residence).
  for (const workplace of production) {
    if (getBuildingRoadAccess(next, workplace.id).hasRoadAccess) {
      continue
    }
    const roads = roadCells(next)
    const targets: CellCoordinate[] =
      roads.length > 0
        ? roads
        : residences.map((r) => ({ x: r.x, y: r.y }))
    if (targets.length === 0) {
      // Synthetic fixtures (no residence): legacy 09F behavior — place one
      // adjacent operational road so production eligibility can be tested.
      for (const [dx, dy] of NEIGHBOR_DELTAS) {
        const cell = { x: workplace.x + dx, y: workplace.y + dy }
        if (!isCellFree(next, cell)) {
          continue
        }
        next = placeOperationalRoad(next, cell)
        break
      }
      continue
    }
    next = connectBuildingToNearest(next, workplace, targets)
  }

  // Connect each residence to an existing road (or a production building).
  for (const residence of residences) {
    if (getBuildingRoadAccess(next, residence.id).hasRoadAccess) {
      continue
    }
    const roads = roadCells(next)
    const targets: CellCoordinate[] =
      roads.length > 0
        ? roads
        : production.map((w) => ({ x: w.x, y: w.y }))
    next = connectBuildingToNearest(next, residence, targets)
  }

  return next
}
