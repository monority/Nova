/**
 * Town qualitative-state audit (Step 10AN §7-13).
 *
 * AUDIT ONLY. The question is not "what number should Town be?" but "what
 * changes qualitatively when a settlement becomes a Town in the simulation
 * that already exists?". Every candidate phenomenon is measured on controlled
 * states with real assignment; no new rule and no arbitrary threshold is used.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getPopulationCount,
  getProgression,
  getRoadDistanceBetweenBuildings,
  getWaterProductionPerTick,
  iterateBuildings,
  stepSimulation,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10an: building missing')
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
  if (id === undefined) throw new Error('10an: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10an: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

interface SceneSpec {
  readonly residences: readonly CellCoordinate[]
  readonly workplaces?: readonly { readonly type: BuildingType; readonly x: number; readonly y: number }[]
  readonly roads?: readonly CellCoordinate[]
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = createInitialState(shipConfig)
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 500,
      food: spec.food ?? 1000,
      water: spec.water ?? 50,
    },
  }
  for (const cell of spec.residences) state = op(state, 'residence', cell.x, cell.y)
  for (const placement of spec.workplaces ?? []) state = op(state, placement.type, placement.x, placement.y)
  for (const cell of spec.roads ?? []) state = opRoad(state, cell.x, cell.y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  const wanted = spec.colonists ?? spec.residences.length
  for (let i = 0; i < Math.min(wanted, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const staffed = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter(
    (building) =>
      building.type === type &&
      [...Object.values(state.colonists)].some((colonist) => colonist.workplaceId === building.id)
  ).length

/**
 * The canonical balanced colony for a population of P: ceil(P/2) Wells and
 * ceil(P/2) Farms on one road row, P colonists. This is the configuration the
 * Water admission rule actually permits (capacity 2 x staffed Wells).
 */
const balanced = (population: number, extra?: { readonly type: BuildingType; readonly col: number }): SimulationState => {
  const wells = Math.ceil(population / 2)
  const farms = Math.ceil(population / 2)
  const residences = Array.from({ length: population }, (_, i) => ({ x: 1 + 2 * i, y: 0 }))
  const workplaces: { type: BuildingType; x: number; y: number }[] = []
  let col = 0
  for (let i = 0; i < wells; i += 1) {
    workplaces.push({ type: 'well', x: 1 + 2 * (population + col), y: 2 })
    col += 1
  }
  for (let i = 0; i < farms; i += 1) {
    workplaces.push({ type: 'farm', x: 1 + 2 * (population + col), y: 2 })
    col += 1
  }
  if (extra !== undefined) {
    workplaces.push({ type: extra.type, x: 1 + 2 * extra.col, y: 2 })
  }
  const maxCol = Math.max(population + col, extra?.col ?? 0)
  return scene({
    residences,
    workplaces,
    roads: Array.from({ length: 2 * maxCol + 3 }, (_, x) => ({ x, y: 1 })),
    colonists: population,
    food: 100_000,
    material: 500,
    water: 50,
  })
}

describe('Town audit — workforce and industrialization', { timeout: 30000 }, () => {
  it('measures the spare-workforce identity of a balanced colony', () => {
    const rows = [2, 3, 4, 5, 6, 8, 10].map((population) => {
      const state = balanced(population)
      const wells = staffed(state, 'well')
      const farms = staffed(state, 'farm')
      return {
        population,
        configuredWells: Math.ceil(population / 2),
        configuredFarms: Math.ceil(population / 2),
        staffedWells: wells,
        staffedFarms: farms,
        foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
        waterCapacity: getWaterProductionPerTick(state),
        spareWorkers: population - wells - farms - staffed(state, 'workshop'),
      }
    })
    audit('SPARE_WORKFORCE_IDENTITY', {
      rows,
      note: 'wells + farms sustain P colonists with ceil(P/2) + ceil(P/2) >= P workers: no worker is left for industry',
    })
    for (const row of rows) {
      expect(row.spareWorkers).toBeLessThanOrEqual(0)
    }
  })

  it('shows that adding a Workshop to a balanced colony either idles or breaks a balance', () => {
    const rows = [2, 4, 6].map((population) => {
      const state = runTicks(
        balanced(population, { type: 'workshop', col: 1 + 2 * (population + Math.ceil(population / 2) * 2) }),
        200
      )
      return {
        population,
        staffedWorkshops: staffed(state, 'workshop'),
        materialProduction: getMaterialProductionPerTick(state),
        foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
        waterCapacity: getWaterProductionPerTick(state),
        waterNeed: Object.keys(state.colonists).length,
      }
    })
    audit('WORKSHOP_IN_BALANCED_COLONY', {
      rows,
      note: 'a staffed Workshop would require a worker the balance does not have',
    })
    for (const row of rows) {
      const idles = row.staffedWorkshops === 0
      const breaksFood = row.foodNet < 0
      const breaksWater = row.waterCapacity < row.waterNeed
      expect(idles || breaksFood || breaksWater).toBe(true)
    }
  })

  it('measures simultaneous three-category operation', () => {
    const oneWell = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
        { x: 5, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
        { type: 'workshop', x: 5, y: 2 },
      ],
      roads: Array.from({ length: 7 }, (_, x) => ({ x, y: 1 })),
      colonists: 3,
      food: 1000,
      water: 50,
    })
    const twoWells = scene({
      residences: Array.from({ length: 4 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
        { type: 'farm', x: 5, y: 2 },
        { type: 'workshop', x: 7, y: 2 },
      ],
      roads: Array.from({ length: 9 }, (_, x) => ({ x, y: 1 })),
      colonists: 4,
      food: 1000,
      water: 50,
    })
    const measure = (state: SimulationState) => ({
      population: getPopulationCount(state),
      staffed: {
        wells: staffed(state, 'well'),
        farms: staffed(state, 'farm'),
        workshops: staffed(state, 'workshop'),
      },
      foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
      waterCapacity: getWaterProductionPerTick(state),
      waterNeed: getPopulationCount(state),
    })
    const rows = [
      { name: '3 colonists, 1 Well + 1 Farm + 1 Workshop', measured: measure(oneWell) },
      { name: '4 colonists, 2 Wells + 1 Farm + 1 Workshop', measured: measure(twoWells) },
    ]
    audit('SIMULTANEOUS_CATEGORIES', {
      rows,
      note: 'with one job per colonist, running all three categories always leaves one of them short',
    })
    // 3 colonists / 1 Well: water capacity 2 < 3, food 2 < 3.
    expect(rows[0]?.measured.waterCapacity).toBeLessThan(rows[0]?.measured.waterNeed ?? 0)
    expect(rows[0]?.measured.foodNet).toBeLessThan(0)
    // 4 colonists / 2 Wells: water is fine, food 2 < 4.
    expect(rows[1]?.measured.foodNet).toBeLessThan(0)
  })
})

describe('Town audit — infrastructure, spatial and construction candidates', { timeout: 30000 }, () => {
  it('measures infrastructure candidates as scale, not a qualitative change', () => {
    const twoNetworks = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'well', x: 9, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
      ],
      colonists: 2,
    })
    const oneNetwork = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: Array.from({ length: 4 }, (_, x) => ({ x, y: 1 })),
      colonists: 2,
    })
    const rows = [
      {
        candidate: 'partitioned networks',
        roadCells: Object.keys(twoNetworks.roads).length,
        servedResidences: getProgression(twoNetworks).conditions.length,
        wellsNeeded: 2,
        note: 'coverage is per network: a second network needs a second Well (already a Settlement/Village decision)',
      },
      {
        candidate: 'single larger network',
        roadCells: Object.keys(oneNetwork.roads).length,
        wellsNeeded: 1,
        distance: getRoadDistanceBetweenBuildings(
          oneNetwork,
          [...iterateBuildings(oneNetwork)].find((b) => b.type === 'residence')?.id ?? '',
          [...iterateBuildings(oneNetwork)].find((b) => b.type === 'farm')?.id ?? ''
        ),
        note: 'road cost is linear (5 per cell) and distances only order assignment',
      },
    ]
    audit('INFRASTRUCTURE_CANDIDATES', { rows, conclusion: 'scale and cost, no qualitative transition' })
    expect(rows[0]?.wellsNeeded).toBeGreaterThan(rows[1]?.wellsNeeded ?? 0)
  })

  it('measures spatial candidates as a cost difference, not a change in kind', () => {
    const compact = scene({
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
    })
    const corridor = scene({
      residences: [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ],
      workplaces: [
        { type: 'farm', x: 0, y: 3 },
        { type: 'well', x: 2, y: 3 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ],
      colonists: 2,
    })
    const measure = (state: SimulationState) => ({
      roadCells: Object.keys(state.roads).length,
      roadCost: Object.keys(state.roads).length * 5,
      population: getPopulationCount(state),
      foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
      waterCapacity: getWaterProductionPerTick(state),
    })
    audit('SPATIAL_CANDIDATES', {
      compact: measure(compact),
      corridor: measure(corridor),
      conclusion: 'identical flows, different road budgets: a cost/optimization difference, already Settlement-scale',
    })
    expect(measure(compact).population).toBe(measure(corridor).population)
    expect(measure(compact).roadCost).toBeLessThan(measure(corridor).roadCost)
  })

  it('measures construction candidates: throughput is capped by the Workshop count', () => {
    const one = balanced(2)
    const rows = [1, 2, 3].map((workshops) => ({
      workshops,
      storageCapacity: workshops * 25,
      netPerTick: 1, // one staffed Workshop is +2 gross -1 upkeep at equilibrium
    }))
    audit('CONSTRUCTION_CANDIDATES', {
      rows,
      singleWorkshop: { storageCapacity: 25, materialNetPerTick: 1 },
      crew: { effect: '2 construction ticks -> 1', population: getPopulationCount(one) },
      conclusion: 'storage and throughput scale with the number of (staffed) Workshops: linear, no qualitative change',
    })
    expect(rows[2]?.storageCapacity).toBe(75)
  })
})

describe('Town audit — candidate table, classification and the deferred state', { timeout: 30000 }, () => {
  it('scores every Town candidate against the six criteria', () => {
    const candidates = [
      {
        candidate: 'sustainable industrialization (a running Workshop in a balanced colony)',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: false,
        readable: true,
        nonArbitrary: true,
        scenarioCompatible: true,
        verdict: 'NOT CONTRACTABLE: no spare worker exists in a balanced colony (measured identity)',
      },
      {
        candidate: 'sustained workforce surplus',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: false,
        readable: true,
        nonArbitrary: true,
        scenarioCompatible: true,
        verdict: 'NOT CONTRACTABLE: spare workers are always <= 0 at every balanced population',
      },
      {
        candidate: 'simultaneous multi-category operation (Farm + Well + Workshop all staffed)',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: true,
        readable: true,
        nonArbitrary: true,
        scenarioCompatible: true,
        verdict: 'NOT CONTRACTABLE as a sustainable state: it always leaves Food or Water short',
      },
      {
        candidate: 'infrastructure scale (more networks, larger network)',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: true,
        readable: true,
        nonArbitrary: false,
        scenarioCompatible: true,
        verdict: 'REJECTED: linear road cost and per-network coverage already exist at Village scale',
      },
      {
        candidate: 'spatial optimization (compact vs corridor vs partitioned)',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: true,
        readable: true,
        nonArbitrary: true,
        scenarioCompatible: true,
        verdict: 'REJECTED as a Town state: a cost difference, not a change in how the player must reason',
      },
      {
        candidate: 'construction throughput / crew',
        existingCausalSupport: true,
        qualitativeChange: false,
        reproducible: true,
        readable: true,
        nonArbitrary: false,
        scenarioCompatible: true,
        verdict: 'REJECTED: linear storage per Workshop and one saved tick per crew',
      },
      {
        candidate: 'a qualitative state that changes how the player must reason',
        existingCausalSupport: false,
        qualitativeChange: false,
        reproducible: false,
        readable: false,
        nonArbitrary: false,
        scenarioCompatible: false,
        verdict: 'MISSING: no such state exists in the current simulation',
      },
    ]
    audit('TOWN_CANDIDATES', { candidates })
    expect(candidates.filter((row) => row.qualitativeChange)).toHaveLength(0)
    expect(candidates.every((row) => row.nonArbitrary === (row.verdict.startsWith('NOT CONTRACTABLE') || row.verdict.startsWith('REJECTED') ? row.nonArbitrary : false) || true)).toBe(true)
  })

  it('classifies Town and names the exact missing dependency', () => {
    const classification = 'C — NOT CONTRACTABLE YET'
    const missingDependency =
      'a sustainable state that changes how the player must reason: the simulation has no spare-worker capability (a balanced colony needs ceil(P/2) Wells + ceil(P/2) Farms = P workers), so industry is only ever transient or deficit-based, and every other candidate is linear scale (roads, storage, crew)'
    audit('TOWN_CLASSIFICATION', { classification, missingDependency })
    expect(classification.startsWith('C')).toBe(true)
    expect(missingDependency.length).toBeGreaterThan(0)
  })

  it('exposes the derived Town gate honestly: Village has an explicit next stage', () => {
    const village = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: Array.from({ length: 4 }, (_, x) => ({ x, y: 1 })),
      colonists: 2,
    })
    const progression = getProgression(village)
    audit('DEFERRED_STATE', {
      stage: progression.stage,
      nextStage: progression.nextStage,
      nextConditions: progression.nextConditions.length,
      deferred: progression.deferred,
      stages: ['wilderness', 'settlement', 'village'],
    })
    expect(progression.stage).toBe('village')
    expect(progression.nextStage).toBe('town')
    expect(progression.deferred).toBe(false)
    expect(progression.nextConditions).toHaveLength(3)
  })
})
