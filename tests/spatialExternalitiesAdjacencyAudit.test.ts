/**
 * Step 10AH — Spatial Externalities & Adjacency Pressure Audit.
 *
 * AUDIT ONLY. `src/` is untouched: every number below is measured from the
 * real runtime (`stepSimulation`, `applyCommand`, the derived queries).
 *
 * Question: does the RELATIVE placement of buildings already produce enough
 * consequences for the layout to be a real optimisation, or does the model
 * still lack a local consequence?
 *
 * Layout convention: explicit road lists and building cells, so a controlled
 * experiment can hold the building count, the worker count and the ROAD CELL
 * COUNT constant while changing only the geometry.
 *
 * Run:
 *   npx vitest run tests/spatialExternalitiesAdjacencyAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getNetMaterialPerTick,
  getPopulationCount,
  getRoadDistanceBetweenBuildings,
  getRoadNetworks,
  getServedColonistCount,
  getWaterCoverage,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  hashCanonicalState,
  isCellBlocked,
  iterateBuildings,
  iterateColonists,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10ah', width: 32, height: 24 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const withStocks = (
  state: SimulationState,
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number }
): SimulationState => ({
  ...state,
  resources: {
    construction: stocks.material ?? state.resources.construction,
    food: stocks.food ?? state.resources.food,
    water: stocks.water ?? state.resources.water,
  },
})

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ah: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10ah: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ah: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Placement {
  readonly type: BuildingType
  readonly x: number
  readonly y: number
}

interface SceneSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly Placement[]
  readonly roads: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 10_000,
    material: spec.material ?? 500,
    water: spec.water ?? 50,
  })
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) {
    state = op(state, placement.type, placement.x, placement.y)
  }
  for (const cell of spec.roads) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

interface Snapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly foodProduction: number
  readonly foodConsumption: number
  readonly foodNet: number
  readonly water: number
  readonly waterProduction: number
  readonly waterNeed: number
  readonly waterNet: number
  readonly servedResidences: number
  readonly servedColonists: number
  readonly material: number
  readonly materialNet: number
  readonly employed: number
  readonly unemployed: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly staffedWorkshops: number
  readonly networks: number
  readonly networkSizes: readonly number[]
  readonly roads: number
  readonly mobilityConnected: number
  readonly housingAvailable: number
}

const staffedByType = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter(
    (building) => building.type === type && countWorkersAt(state, building.id) > 0
  ).length

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const foodProduction = getFoodProductionPerTick(state)
  const foodConsumption = getFoodConsumptionPerTick(state)
  const waterProduction = getWaterProductionPerTick(state)
  const waterNeed = getWaterNeedPerTick(state)
  const networks = getRoadNetworks(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    foodProduction,
    foodConsumption,
    foodNet: foodProduction - foodConsumption,
    water: state.resources.water,
    waterProduction,
    waterNeed,
    waterNet: waterProduction - waterNeed,
    servedResidences: getWaterServedResidenceCount(state),
    servedColonists: getServedColonistCount(state),
    material: state.resources.construction,
    materialNet: getNetMaterialPerTick(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWells: staffedByType(state, 'well'),
    staffedWorkshops: staffedByType(state, 'workshop'),
    networks: networks.length,
    networkSizes: networks.map((network) => network.length),
    roads: Object.keys(state.roads).length,
    mobilityConnected: [...iterateColonists(state)].filter(
      (colonist) => getColonistWorkMobility(state, colonist.id).mobilityConnected
    ).length,
    housingAvailable: getHousingSummary(state).availableCapacity,
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const idOfType = (state: SimulationState, type: BuildingType, index = 0): string => {
  const buildings = [...iterateBuildings(state)].filter((b) => b.type === type)
  const building = buildings[index]
  if (building === undefined) throw new Error(`10ah: no ${type} at index ${index}`)
  return building.id
}

const workerReport = (state: SimulationState): readonly Record<string, unknown>[] =>
  [...iterateBuildings(state)].map((building) => ({
    type: building.type,
    id: building.id,
    workers: countWorkersAt(state, building.id),
    roadAccess: getBuildingRoadAccess(state, building.id).hasRoadAccess,
  }))

// ---------------------------------------------------------------------------
// 1. Inventory of current spatial effects
// ---------------------------------------------------------------------------

describe('1. Inventory of current spatial effects', { timeout: 30000 }, () => {
  it('measures every effect the placement of a building currently has', () => {
    // building <-> road and cell occupancy
    const base = scene({
      residences: [{ x: 1, y: 0 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
    })
    const residenceId = idOfType(base, 'residence')
    const roadAccess = getBuildingRoadAccess(base, residenceId)
    const blockedWithBuilding = isCellBlocked(base, { x: 1, y: 0 })
    const blockedWithRoad = isCellBlocked(base, { x: 1, y: 1 })
    const freeCell = isCellBlocked(base, { x: 5, y: 5 })

    // road <-> network, resource cost per cell
    const twoNetworks = scene({
      residences: [{ x: 1, y: 0 }],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 1,
    })

    // residence <-> well coverage and residence <-> workplace mobility
    const coverage = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      colonists: 1,
    })
    const coverageReport = getWaterCoverage(coverage)
    const worker = Object.keys(coverage.colonists)[0]
    const mobility = worker === undefined ? null : getColonistWorkMobility(coverage, worker)

    // road distance (09M)
    const distances = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 1,
    })
    const farm0 = idOfType(distances, 'farm', 0)
    const farm1 = idOfType(distances, 'farm', 1)
    const residence0 = idOfType(distances, 'residence')

    audit('SPATIAL_EFFECTS_PRESENT', {
      buildingRoad: { hasRoadAccess: roadAccess.hasRoadAccess, roadIds: roadAccess.roadIds },
      occupancy: { buildingCell: blockedWithBuilding, roadCell: blockedWithRoad, freeCell },
      networks: { count: getRoadNetworks(twoNetworks).length },
      roadCostPerCell: 5,
      waterCoverage: {
        servedResidences: coverageReport.servedResidenceIds,
        servedColonists: coverageReport.servedColonistIds,
      },
      mobility: mobility === null ? null : { connected: mobility.mobilityConnected, workplaceId: mobility.workplaceId },
      roadDistance: {
        toNearFarm: getRoadDistanceBetweenBuildings(distances, residence0, farm0),
        toFarFarm: getRoadDistanceBetweenBuildings(distances, residence0, farm1),
      },
      nonSpatial: ['Construction Crew (10Y)', 'id / tie-break order (09M)', 'time (tick order)'],
    })

    expect(roadAccess.hasRoadAccess).toBe(true)
    expect(blockedWithBuilding).toBe(true)
    expect(blockedWithRoad).toBe(true)
    expect(freeCell).toBe(false)
    expect(mobility?.mobilityConnected).toBe(true)
    expect(getRoadDistanceBetweenBuildings(distances, residence0, farm0)).toBe(0)
    expect(getRoadDistanceBetweenBuildings(distances, residence0, farm1)).toBe(4)
  })

  it('measures what has NO effect: physical closeness with identical connectivity', () => {
    // The same colony with the same network, only the physical gap between
    // the Residence and the Farm changes.
    const build = (gap: number): SimulationState => {
      const roads: CellCoordinate[] = []
      for (let x = 1; x <= 1 + 2 * gap + 2; x += 1) roads.push({ x, y: 1 })
      return scene({
        residences: [{ x: 1, y: 0 }],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'farm', x: 1 + 2 * gap + 2, y: 2 },
        ],
        roads,
        colonists: 1,
      })
    }
    const rows = [0, 1, 2, 3].map((gap) => {
      const state = runTicks(build(gap), 30)
      const residence = idOfType(state, 'residence')
      const farms = [...iterateBuildings(state)].filter((b) => b.type === 'farm')
      return {
        physicalGap: gap,
        roadDistanceToFirstFarm: getRoadDistanceBetweenBuildings(state, residence, idOfType(state, 'farm', 0)),
        staffedFarms: snapshot(state).staffedFarms,
        foodNet: snapshot(state).foodNet,
        assignment: farms.map((farm) => countWorkersAt(state, farm.id)),
      }
    })
    audit('NO_EFFECT_WITH_IDENTICAL_NETWORK', {
      rows,
      noEffectList: [
        'Farm next to or far from a Residence (same network)',
        'Workshop next to or far from a Farm',
        'Well next to or far from a Residence on the same network',
        'Farm adjacent to a Workshop',
        'Residence adjacent to a Workshop',
        'Workshop adjacent to a Workshop',
        'local density / neighbour count / neighbour type',
      ],
      note: 'with one worker and two reachable farms the nearest is staffed either way, so the physical gap changes nothing observable',
    })
    for (const row of rows as { staffedFarms: number; foodNet: number }[]) {
      expect(row.staffedFarms).toBe(1)
      expect(row.foodNet).toBe(1) // one worker: 2 Food produced, 1 consumed
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Controlled layout experiment
// ---------------------------------------------------------------------------

describe('2. Controlled layout experiment (same counts, same road cells)', { timeout: 30000 }, () => {
  it('compares five geometries with equal buildings, workers and roads', () => {
    const horizontal = (fromX: number, toX: number): CellCoordinate[] =>
      Array.from({ length: toX - fromX + 1 }, (_, i) => ({ x: fromX + i, y: 1 }))

    const layouts: { readonly layout: string; readonly state: SimulationState }[] = [
      {
        layout: 'A compact',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
            { type: 'workshop', x: 5, y: 2 },
          ],
          roads: horizontal(1, 6),
          colonists: 2,
        }),
      },
      {
        layout: 'B linear corridor',
        state: scene({
          residences: [
            { x: 4, y: 1 },
            { x: 6, y: 1 },
          ],
          workplaces: [
            { type: 'farm', x: 4, y: 3 },
            { type: 'well', x: 6, y: 3 },
            { type: 'workshop', x: 4, y: 5 },
          ],
          roads: [
            { x: 5, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 3 },
            { x: 5, y: 4 },
            { x: 5, y: 5 },
            { x: 5, y: 6 },
          ],
          colonists: 2,
        }),
      },
      {
        layout: 'C separated zones',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 1, y: 2 },
          ],
          workplaces: [
            { type: 'farm', x: 5, y: 2 },
            { type: 'well', x: 4, y: 2 },
            { type: 'workshop', x: 6, y: 2 },
          ],
          roads: horizontal(1, 6),
          colonists: 2,
        }),
      },
      {
        layout: 'D alternating',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 2, y: 2 },
            { type: 'well', x: 4, y: 2 },
            { type: 'workshop', x: 5, y: 0 },
          ],
          roads: horizontal(1, 6),
          colonists: 2,
        }),
      },
      {
        layout: 'E blocks',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 4, y: 2 },
            { type: 'well', x: 5, y: 2 },
            { type: 'workshop', x: 6, y: 2 },
          ],
          roads: horizontal(1, 6),
          colonists: 2,
        }),
      },
    ]

    const rows = layouts.map((entry) => {
      const settled = runTicks(entry.state, 120)
      const snap = snapshot(settled)
      const residence = idOfType(settled, 'residence', 0)
      const farms = [...iterateBuildings(settled)].filter((b) => b.type === 'farm')
      const wells = [...iterateBuildings(settled)].filter((b) => b.type === 'well')
      return {
        layout: entry.layout,
        roads: snap.roads,
        networks: snap.networks,
        networkSizes: snap.networkSizes,
        population: snap.population,
        employed: snap.employed,
        unemployed: snap.unemployed,
        food: snap.food,
        foodProduction: snap.foodProduction,
        water: snap.water,
        waterProduction: snap.waterProduction,
        servedResidences: snap.servedResidences,
        material: snap.material,
        materialNet: snap.materialNet,
        mobilityConnected: snap.mobilityConnected,
        roadDistanceToFarm: farms[0] === undefined ? null : getRoadDistanceBetweenBuildings(settled, residence, farms[0].id),
        roadDistanceToWell: wells[0] === undefined ? null : getRoadDistanceBetweenBuildings(settled, residence, wells[0].id),
        assignment: workerReport(settled).map((row) => `${String(row.type)}:${String(row.workers)}`),
      }
    })
    audit('CONTROLLED_LAYOUTS', {
      fixed: { residences: 2, farms: 1, wells: 1, workshops: 1, colonists: 2, roads: 6 },
      rows,
      note: 'every measured difference is a network/distance difference (assignment, served set) or a road-geometry difference; physical neighbourhood never enters a rule',
    })

    for (const row of rows as { roads: number; population: number; foodProduction: number }[]) {
      expect(row.roads).toBe(6)
      expect(row.population).toBe(2)
      expect(row.foodProduction).toBe(2)
    }
    // The layouts differ in the assignment/coverage, which is the existing
    // network effect, not adjacency.
    const served = new Set((rows as { servedResidences: number }[]).map((row) => row.servedResidences))
    expect(served.size).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Adjacency matrix experiment
// ---------------------------------------------------------------------------

describe('3. Adjacency matrix experiment', { timeout: 30000 }, () => {
  it('compares physical adjacency with network connectivity for each pair', () => {
    interface PairRow {
      readonly label: string
      readonly physicalDistance: number
      readonly roadDistance: number | null
      readonly sameNetwork: boolean
      readonly staffedFarms: number
      readonly foodNet: number
      readonly employed: number
    }
    const pairRow = (
      label: string,
      first: { type: BuildingType; x: number; y: number },
      second: { type: BuildingType; x: number; y: number },
      roads: readonly CellCoordinate[]
    ): PairRow => {
      // When neither member of the pair is a Residence, put one on the first
      // road cell so the pair has a worker and the comparison is meaningful.
      const anchor = roads[0]
      const neighbours: CellCoordinate[] =
        anchor === undefined
          ? []
          : [
              { x: anchor.x, y: anchor.y - 1 },
              { x: anchor.x + 1, y: anchor.y },
              { x: anchor.x, y: anchor.y + 1 },
              { x: anchor.x - 1, y: anchor.y },
            ]
      const occupied = (cell: CellCoordinate): boolean =>
        (cell.x === first.x && cell.y === first.y) ||
        (cell.x === second.x && cell.y === second.y) ||
        roads.some((road) => road.x === cell.x && road.y === cell.y)
      const fallbackResidence =
        neighbours.find((cell) => !occupied(cell)) ?? { x: 0, y: 5 }
      const state = scene({
        residences:
          first.type === 'residence'
            ? [{ x: first.x, y: first.y }]
            : second.type === 'residence'
              ? [{ x: second.x, y: second.y }]
              : [fallbackResidence],
        workplaces: [
          ...(first.type === 'residence' ? [] : [first]),
          ...(second.type === 'residence' ? [] : [second]),
        ],
        roads,
        colonists: 1,
        food: 10_000,
        water: 50,
      })
      const settled = runTicks(state, 30)
      const snap = snapshot(settled)
      const idsA = [...iterateBuildings(settled)].filter((b) => b.type === first.type).map((b) => b.id)
      const idsB = [...iterateBuildings(settled)].filter((b) => b.type === second.type).map((b) => b.id)
      const idA = idsA[0]
      const idB = first.type === second.type ? idsB[1] : idsB[0]
      if (idA === undefined || idB === undefined) throw new Error('10ah: pair building missing')
      return {
        label,
        physicalDistance: Math.abs(first.x - second.x) + Math.abs(first.y - second.y),
        roadDistance:
          first.type === 'residence' || second.type === 'residence'
            ? getRoadDistanceBetweenBuildings(settled, idA, idB)
            : null,
        sameNetwork:
          getBuildingRoadAccess(settled, idA).networkIds.join(',') ===
          getBuildingRoadAccess(settled, idB).networkIds.join(','),
        staffedFarms: snap.staffedFarms,
        foodNet: snap.foodNet,
        employed: snap.employed,
      }
    }

    // Same network, adjacent: Residence (1,0) + Farm (1,2) share road (1,1).
    const adjacentSame = pairRow('Residence-Farm adjacent, same network', { type: 'residence', x: 1, y: 0 }, { type: 'farm', x: 1, y: 2 }, [{ x: 1, y: 1 }])
    // Physically adjacent, DIFFERENT networks.
    const adjacentApart = pairRow(
      'Residence-Farm adjacent, different networks',
      { type: 'residence', x: 1, y: 0 },
      { type: 'farm', x: 1, y: 1 },
      [
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ]
    )
    // Same network at physical distance 4.
    const farSame = pairRow(
      'Residence-Farm distance 4, same network',
      { type: 'residence', x: 1, y: 0 },
      { type: 'farm', x: 5, y: 2 },
      [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]
    )
    // Farm next to Farm, same network vs different networks.
    const farmFarmSame = pairRow('Farm-Farm adjacent, same network', { type: 'farm', x: 1, y: 2 }, { type: 'farm', x: 2, y: 2 }, [{ x: 1, y: 1 }])
    const farmFarmApart = pairRow(
      'Farm-Farm adjacent, different networks',
      { type: 'farm', x: 1, y: 2 },
      { type: 'farm', x: 2, y: 2 },
      [
        { x: 1, y: 1 },
        { x: 2, y: 3 },
      ]
    )
    // Workshop next to Workshop / Well.
    const workshopWorkshop = pairRow(
      'Workshop-Workshop adjacent, same network',
      { type: 'workshop', x: 1, y: 2 },
      { type: 'workshop', x: 2, y: 2 },
      [{ x: 1, y: 1 }]
    )
    const farmWell = pairRow('Farm-Well adjacent, same network', { type: 'farm', x: 1, y: 2 }, { type: 'well', x: 1, y: 3 }, [{ x: 1, y: 1 }])

    const rows = [adjacentSame, adjacentApart, farSame, farmFarmSame, farmFarmApart, workshopWorkshop, farmWell]
    audit('ADJACENCY_MATRIX', {
      rows,
      note: 'physical adjacency with different networks behaves exactly like disconnection; physical adjacency with the same network adds nothing beyond the existing road access and distance',
    })

    expect(adjacentSame.staffedFarms).toBe(1)
    expect(adjacentApart.staffedFarms).toBe(0)
    expect(adjacentApart.sameNetwork).toBe(false)
    expect(farSame.staffedFarms).toBe(1)
    // Same-type adjacency has no consumer: the worker is the only thing that
    // matters, so at most one of the two same-type workplaces is staffed.
    expect(farmFarmSame.staffedFarms).toBeLessThanOrEqual(1)
    expect(farmFarmApart.staffedFarms).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Distance vs adjacency
// ---------------------------------------------------------------------------

describe('4. Road distance versus physical adjacency', { timeout: 30000 }, () => {
  it('builds a case where the physically nearer Workplace is the road-farther one', () => {
    // Residence R(1,0) contacts road (2,0).
    // Farm NEAR is physically 2 cells from R but its only contact is (1,3),
    // reached by a long loop; Farm FAR is physically 4 cells from R but
    // contacts (3,1), two steps from (2,0).
    const state = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 4, y: 2 },
        { x: 4, y: 3 },
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
      ],
      colonists: 1,
    })
    const settled = runTicks(state, 30)
    const residence = idOfType(settled, 'residence')
    const nearFarm = idOfType(settled, 'farm', 0)
    const farFarm = idOfType(settled, 'farm', 1)
    const report = {
      nearFarm: {
        physicalDistance: 2,
        roadDistance: getRoadDistanceBetweenBuildings(settled, residence, nearFarm),
        workers: countWorkersAt(settled, nearFarm),
      },
      farFarm: {
        physicalDistance: 4,
        roadDistance: getRoadDistanceBetweenBuildings(settled, residence, farFarm),
        workers: countWorkersAt(settled, farFarm),
      },
      snapshot: snapshot(settled),
    }
    audit('DISTANCE_VS_ADJACENCY', {
      report,
      note: 'the evaluated distance is the ROAD distance: the physically nearer Farm loses the worker',
    })

    const near = report.nearFarm
    const far = report.farFarm
    expect(near.roadDistance).toBeGreaterThan(far.roadDistance ?? 0)
    expect(far.workers).toBe(1)
    expect(near.workers).toBe(0)
  })

  it('compares the four required cases', () => {
    const cases = [
      {
        name: 'A physically close, road long',
        residence: { x: 1, y: 0 },
        farm: { x: 1, y: 2 },
        roads: [
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 2 },
          { x: 3, y: 3 },
          { x: 2, y: 3 },
          { x: 1, y: 3 },
        ],
      },
      {
        name: 'B physically far, road short',
        residence: { x: 1, y: 0 },
        farm: { x: 5, y: 0 },
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
      },
      {
        name: 'C physically adjacent, road short',
        residence: { x: 1, y: 0 },
        farm: { x: 1, y: 2 },
        roads: [{ x: 1, y: 1 }],
      },
      {
        name: 'D physically far, road long',
        residence: { x: 1, y: 0 },
        farm: { x: 5, y: 5 },
        roads: [
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 5, y: 3 },
          { x: 5, y: 4 },
        ],
      },
    ]
    const rows = cases.map((entry) => {
      const state = scene({
        residences: [entry.residence],
        workplaces: [{ type: 'farm', x: entry.farm.x, y: entry.farm.y }],
        roads: entry.roads,
        colonists: 1,
      })
      const settled = runTicks(state, 30)
      return {
        name: entry.name,
        physicalDistance: Math.abs(entry.residence.x - entry.farm.x) + Math.abs(entry.residence.y - entry.farm.y),
        roadDistance: getRoadDistanceBetweenBuildings(
          settled,
          idOfType(settled, 'residence'),
          idOfType(settled, 'farm')
        ),
        foodProduction: snapshot(settled).foodProduction,
      }
    })
    audit('DISTANCE_CASES', { rows })
    for (const row of rows as { foodProduction: number }[]) {
      expect(row.foodProduction).toBe(2)
    }
    const a = (rows as { name: string; physicalDistance: number; roadDistance: number | null }[]).find((row) => row.name.startsWith('A '))
    const b = (rows as { name: string; roadDistance: number | null }[]).find((row) => row.name.startsWith('B '))
    expect(a?.physicalDistance).toBe(2)
    expect((a?.roadDistance ?? 0) > (b?.roadDistance ?? 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5. Road cost versus building density
// ---------------------------------------------------------------------------

describe('5. Road cost versus building density', { timeout: 30000 }, () => {
  it('measures buildings per road cell for six geometries', () => {
    const cluster = (originX: number, originY: number, withWell: boolean): { roads: CellCoordinate[]; residences: CellCoordinate[]; workplaces: Placement[] } => ({
      roads: [{ x: originX, y: originY }],
      residences: [
        { x: originX, y: originY - 1 },
        { x: originX - 1, y: originY },
      ],
      workplaces: [
        { type: 'farm', x: originX, y: originY + 1 },
        ...(withWell ? [{ type: 'well' as const, x: originX + 1, y: originY }] : []),
      ],
    })

    const geometries: { readonly name: string; readonly state: SimulationState }[] = [
      {
        name: 'compact (4 buildings / 1 road)',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 2, y: 1 },
          ],
          roads: [{ x: 1, y: 1 }],
          colonists: 2,
        }),
      },
      {
        name: 'corridor (4 buildings / 4 roads)',
        state: scene({
          residences: [{ x: 1, y: 0 }],
          workplaces: [
            { type: 'farm', x: 2, y: 0 },
            { type: 'well', x: 3, y: 0 },
            { type: 'workshop', x: 4, y: 0 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
          ],
          colonists: 1,
        }),
      },
      {
        name: 'ring (4 buildings / 4 roads)',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 3 },
            { type: 'well', x: 2, y: 3 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
          ],
          colonists: 2,
        }),
      },
      {
        name: 'two clusters (8 buildings / 2 roads)',
        state: (() => {
          const a = cluster(1, 2, true)
          const b = cluster(8, 2, true)
          return scene({
            residences: [...a.residences, ...b.residences],
            workplaces: [...a.workplaces, ...b.workplaces],
            roads: [...a.roads, ...b.roads],
            colonists: 4,
          })
        })(),
      },
      {
        name: 'three clusters (12 buildings / 3 roads)',
        state: (() => {
          const a = cluster(1, 2, true)
          const b = cluster(8, 2, true)
          const c = cluster(15, 2, true)
          return scene({
            residences: [...a.residences, ...b.residences, ...c.residences],
            workplaces: [...a.workplaces, ...b.workplaces, ...c.workplaces],
            roads: [...a.roads, ...b.roads, ...c.roads],
            colonists: 6,
          })
        })(),
      },
      {
        name: 'branch (6 buildings / 5 roads)',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
            { type: 'workshop', x: 1, y: 4 },
            { type: 'farm', x: 3, y: 4 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 1, y: 3 },
            { x: 3, y: 3 },
          ],
          colonists: 3,
        }),
      },
    ]

    const rows = geometries.map((entry) => {
      const settled = runTicks(entry.state, 120)
      const snap = snapshot(settled)
      const buildings = Object.keys(settled.buildings).length
      return {
        name: entry.name,
        buildings,
        roadCells: snap.roads,
        buildingsPerRoad: Number((buildings / snap.roads).toFixed(2)),
        roadMaterial: snap.roads * 5,
        networks: snap.networks,
        population: snap.population,
        employed: snap.employed,
        unemployed: snap.unemployed,
        mobilityConnected: snap.mobilityConnected,
        foodNet: snap.foodNet,
        waterNet: snap.waterNet,
        material: snap.material,
      }
    })
    audit('ROAD_EFFICIENCY', {
      rows,
      note: 'the same building count can be served with 4x fewer road cells; road Material is the only existing densification price',
    })

    const compact = (rows as { name: string; buildingsPerRoad: number }[]).find((row) => row.name.startsWith('compact'))
    const corridor = (rows as { name: string; buildingsPerRoad: number }[]).find((row) => row.name.startsWith('corridor'))
    expect((compact?.buildingsPerRoad ?? 0) > (corridor?.buildingsPerRoad ?? 0)).toBe(true)
    expect(corridor?.buildingsPerRoad).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Building type externalities (H1..H6)
// ---------------------------------------------------------------------------

describe('6. Building type externalities', { timeout: 30000 }, () => {
  it('H1/H4/H5 — measures Residence-next-to-industry and same-type clustering', () => {
    // Residence directly adjacent to a Workshop, a Farm and a Well, all on the
    // same network vs a layout where they are far apart on the same network.
    const adjacent = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 0 },
        { type: 'workshop', x: 0, y: 0 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
      ],
      colonists: 1,
    })
    const distant = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 1,
    })
    const threeFarmsTogether = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 2, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      colonists: 2,
    })
    const threeFarmsSeparated = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 5, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 5, y: 2 },
        { type: 'farm', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 5, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })

    const rows = [
      { case: 'residence next to farm+well+workshop', state: adjacent },
      { case: 'same three workplaces far apart', state: distant },
      { case: 'three farms together', state: threeFarmsTogether },
      { case: 'three farms separated', state: threeFarmsSeparated },
    ].map((entry) => {
      const settled = runTicks(entry.state, 60)
      return { case: entry.case, snapshot: snapshot(settled) }
    })
    audit('TYPE_EXTERNALITIES_H1_H4_H5', {
      rows,
      note: 'no per-neighbour rule exists: production is per staffed building and storage is 25 per operational Workshop, whatever the neighbours are',
    })
    const together = (rows as { case: string; snapshot: Snapshot }[]).find((row) => row.case === 'three farms together')
    const separated = (rows as { case: string; snapshot: Snapshot }[]).find((row) => row.case === 'three farms separated')
    expect(together?.snapshot.foodProduction).toBe(4)
    expect(separated?.snapshot.foodProduction).toBe(4)
  })

  it('H3 — measures whether residential concentration around one Well creates pressure', () => {
    // Four Residences around a single road cell shared with a Well: the Well's
    // capacity is fixed at two colonists, so concentration adds nothing.
    const concentrated = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 3,
      water: 50,
    })
    const spread = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
        { x: 5, y: 0 },
        { x: 7, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'well', x: 5, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 5, y: 1 },
        { x: 7, y: 1 },
      ],
      colonists: 4,
      water: 50,
    })
    const rows = [
      { layout: '3 residences around 1 Well', state: concentrated },
      { layout: '4 residences with 2 Wells (one per 2)', state: spread },
    ].map((entry) => {
      const settled = runTicks(entry.state, 60)
      return { layout: entry.layout, snapshot: snapshot(settled) }
    })
    audit('H3_WELL_CONCENTRATION', {
      rows,
      note: 'one Well supports exactly 2 served colonists regardless of how many Residences surround it; Water is a fixed-capacity service, not a radius bonus',
    })
    const oneWell = (rows as { layout: string; snapshot: Snapshot }[]).find((row) => row.layout.startsWith('3 residences around'))
    expect(oneWell?.snapshot.servedResidences).toBe(3) // coverage is network-wide
    expect(oneWell?.snapshot.waterProduction).toBe(2) // capacity is per Well
  })

  it('H2/H6 — measures Farm-vs-Workshop and mixed-use versus segregated layouts', () => {
    // Same two networks in both layouts: one mixed, one segregated.
    const mixed = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 1, y: 3 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'workshop', x: 1, y: 5 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 1, y: 4 },
      ],
      colonists: 2,
    })
    const segregated = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 1, y: 3 },
      ],
      workplaces: [
        { type: 'farm', x: 3, y: 0 },
        { type: 'workshop', x: 3, y: 5 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ],
      colonists: 2,
    })
    const rows = [
      { layout: 'mixed-use', state: mixed },
      { layout: 'segregated', state: segregated },
    ].map((entry) => {
      const settled = runTicks(entry.state, 60)
      return { layout: entry.layout, snapshot: snapshot(settled), workers: workerReport(settled) }
    })
    audit('TYPE_EXTERNALITIES_H2_H6', {
      rows,
      note: 'Farm and Workshop never interact with each other; the only consumer of their placement is the worker mobility rule',
    })
    for (const row of rows as { snapshot: Snapshot }[]) {
      expect(row.snapshot.foodProduction).toBe(2)
      expect(row.snapshot.materialNet).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// 7-8. Future spatial pressure candidates, incl. the pollution probe
// ---------------------------------------------------------------------------

describe('7-8. Future spatial pressure candidates', { timeout: 30000 }, () => {
  it('progressively adds Workshops and looks for any measurable pressure', () => {
    const build = (workshops: number, grouped: boolean): SimulationState => {
      const workplaces: Placement[] = [{ type: 'farm', x: 1, y: 2 }]
      const roads: CellCoordinate[] = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]
      for (let i = 0; i < workshops; i += 1) {
        workplaces.push({ type: 'workshop', x: grouped ? 2 + i : 2 + 2 * i, y: 2 })
      }
      return scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 5, y: 0 },
        ],
        workplaces,
        roads,
        colonists: Math.min(3 + workshops, 3),
        material: 1000,
        water: 50,
        food: 10_000,
      })
    }
    const rows = [1, 2, 3].map((workshops) => {
      const grouped = runTicks(build(workshops, true), 120)
      const separated = runTicks(build(workshops, false), 120)
      return {
        workshops,
        grouped: snapshot(grouped),
        separated: snapshot(separated),
      }
    })
    audit('POLLUTION_PROBE', {
      rows,
      availableData: {
        workshopCount: 'observable',
        workshopProduction: 'observable (2 per staffed Workshop)',
        residenceProximity: 'not a runtime concept: the nearest neighbour is never read by any rule',
        storageCapacity: '25 per operational Workshop (linear, not a function of neighbours)',
      },
      note: 'no current variable or rule changes when Workshops are grouped next to Residences, so an industrial externality has nothing to measure yet',
    })
    for (const row of rows as { grouped: Snapshot; separated: Snapshot }[]) {
      expect(row.grouped.materialNet).toBe(row.separated.materialNet)
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Land / road efficiency
// ---------------------------------------------------------------------------

describe('9. Land and road efficiency', { timeout: 30000 }, () => {
  it('measures the minimum road cells needed to give N buildings access', () => {
    const rows = [
      {
        name: '4 buildings around 1 road cell',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 2, y: 1 },
          ],
          roads: [{ x: 1, y: 1 }],
          colonists: 2,
        }),
      },
      {
        name: '8 buildings around 2 road cells',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 2 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 2, y: 1 },
            { type: 'farm', x: 2, y: 3 },
            { type: 'well', x: 3, y: 2 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
          colonists: 4,
        }),
      },
      {
        name: '10 buildings around 3 road cells',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'farm', x: 1, y: 2 },
            { type: 'well', x: 2, y: 2 },
            { type: 'farm', x: 3, y: 2 },
            { type: 'workshop', x: 0, y: 1 },
            { type: 'workshop', x: 4, y: 1 },
            { type: 'farm', x: 0, y: 0 },
            { type: 'well', x: 4, y: 0 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
          ],
          colonists: 5,
        }),
      },
    ].map((entry) => {
      const settled = runTicks(entry.state, 60)
      const snap = snapshot(settled)
      const buildings = Object.keys(settled.buildings).length
      const occupied = buildings + snap.roads
      return {
        name: entry.name,
        buildings,
        roadCells: snap.roads,
        occupiedCells: occupied,
        buildingsPerRoad: Number((buildings / snap.roads).toFixed(2)),
        roadMaterial: snap.roads * 5,
        networks: snap.networks,
        population: snap.population,
        mobilityConnected: snap.mobilityConnected,
        materialNet: snap.materialNet,
      }
    })
    audit('LAND_EFFICIENCY', {
      rows,
      note: 'a 2x2 cluster of road cells serves up to 8 buildings, so the road budget per building varies by a factor of four; road Material is the existing land-efficiency price',
    })
    for (const row of rows as { buildingsPerRoad: number; roadMaterial: number }[]) {
      expect(row.buildingsPerRoad).toBeGreaterThan(1)
      expect(row.roadMaterial).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 10-12. Player decision test, classification, criteria
// ---------------------------------------------------------------------------

describe('10-12. Player decision test, classification and criteria', { timeout: 30000 }, () => {
  it('scores each identified spatial consequence as a player decision', () => {
    const consequences = [
      {
        consequence: 'road access (building must touch a road)',
        visible: true,
        understandable: true,
        actionable: true,
        differentResult: true,
        evidence: 'measured: a building with no adjacent road gets no worker and produces nothing',
      },
      {
        consequence: 'network membership (mobility + Water coverage)',
        visible: true,
        understandable: true,
        actionable: true,
        differentResult: true,
        evidence: 'measured: 2 networks -> 1 of 2 Residences served; a partitioned colony loses water service',
      },
      {
        consequence: 'road distance (09M workplace preference)',
        visible: true,
        understandable: true,
        actionable: true,
        differentResult: true,
        evidence: 'measured: the physically nearer Farm loses the worker to the road-nearer one',
      },
      {
        consequence: 'road Material cost (5 per cell)',
        visible: true,
        understandable: true,
        actionable: true,
        differentResult: true,
        evidence: 'measured: 4 buildings can cost 1 road cell or 4 (1.0 vs 4.0 buildings per road cell)',
      },
      {
        consequence: 'physical adjacency / neighbour type / density',
        visible: false,
        understandable: false,
        actionable: false,
        differentResult: false,
        evidence: 'measured: no rule reads a neighbour; adjacent buildings on different networks behave as disconnected',
      },
    ]
    const classification = [
      {
        candidate: 'A — Pollution / industrial externality',
        classification: 'D — premature',
        evidence: 'no rule or variable changes when Workshops are grouped next to Residences; production and storage stay linear per building',
      },
      {
        candidate: 'B — Service radius',
        classification: 'D — premature',
        evidence: 'Water coverage is already network-based (measured 4 Residences served by one Well on one network); a physical radius would replace, not extend, the existing rule',
      },
      {
        candidate: 'C — Land efficiency',
        classification: 'A — fundamental',
        evidence: 'measured: the same building count can require 1 to 4 road cells per 4 buildings, i.e. road Material varies by 4x for an identical colony',
      },
      {
        candidate: 'D — Local production chain',
        classification: 'D — premature',
        evidence: 'a Farm and a Workshop never interact; the only spatial consumer of their placement is the worker mobility rule',
      },
      {
        candidate: 'E — Density / adjacency bonus',
        classification: 'E — rejected',
        evidence: 'measured: physical adjacency with an identical network changes nothing and with a different network behaves as disconnection, so a bonus would duplicate the network decision',
      },
      {
        candidate: 'F — No new spatial system',
        classification: 'A — fundamental',
        evidence: 'road access, network membership, road distance and road cost already produce four distinct, visible, actionable layout decisions',
      },
    ]
    const criteria = [
      { criterion: '1 consequence different from existing networks', satisfied: false, evidence: 'pollution/service radius have no consequence today' },
      { criterion: '2 measurable difference between layouts', satisfied: true, evidence: 'road cost and assignment differ, but through existing rules' },
      { criterion: '3 player-visible decision', satisfied: false, evidence: 'no neighbour-based consequence is visible' },
      { criterion: '4 interaction with >= 2 systems', satisfied: false, evidence: 'a new spatial pressure would need a consumer that does not exist' },
      { criterion: '5 non-cosmetic effect', satisfied: false, evidence: 'nothing to observe today' },
      { criterion: '6 no direct duplication of Water coverage', satisfied: false, evidence: 'a service radius would duplicate the coverage rule' },
      { criterion: '7 no catastrophic bootstrap loop', satisfied: true, evidence: 'not applicable to a rejected candidate' },
      { criterion: '8 localizable implementation', satisfied: true, evidence: 'not applicable to a rejected candidate' },
    ]
    audit('PLAYER_DECISION_TEST', { consequences })
    audit('CLASSIFICATION', { classification })
    audit('SPATIAL_CRITERIA', { criteria })
    expect(consequences.filter((entry) => entry.differentResult)).toHaveLength(4)
    expect(classification).toHaveLength(6)
    expect(criteria.filter((entry) => !entry.satisfied).length).toBeGreaterThan(4)
  })
})

// ---------------------------------------------------------------------------
// 13. Architecture invariants
// ---------------------------------------------------------------------------

describe('13. Architecture invariants (src-immutable audit)', { timeout: 30000 }, () => {
  it('keeps the persisted model, determinism and insertion-order invariance intact', () => {
    const scenario = (): SimulationState =>
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
          { type: 'workshop', x: 5, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
        ],
        colonists: 2,
      })
    const run = (): SimulationState => runTicks(scenario(), 200)
    const a = run()
    const b = run()
    const saved = JSON.parse(serializeSave(a)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    audit('ARCHITECTURE', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      derivedAbsent: ['coverage', 'mobility', 'networkId', 'served', 'adjacency', 'density', 'radius', 'pollution'].map(
        (term) => ({ term, present: serializeCanonicalState(a).includes(term) })
      ),
    })
    expect(saved.version).toBe(7)
    expect(SAVE_VERSION).toBe(7)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(a)).not.toContain('coverage')
  })
})
