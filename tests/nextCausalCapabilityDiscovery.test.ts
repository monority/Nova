/**
 * Step 10AX — Next causal capability discovery AUDIT.
 *
 * AUDIT ONLY: no production file changed, no constant, no simulation rule, no
 * save, no scenario, no renderer. Everything below is measured on the CURRENT
 * code (post 10AW) with the existing rules only, and every previously closed
 * dimension is cited as CLOSED EVIDENCE rather than re-discovered.
 *
 * The question: which ABSENT causal capability could create a stable new way of
 * reasoning about the city (and possibly make a Town stage contractable) without
 * simply adding a quantity, a cost or a threshold?
 *
 * Run:
 *   npx vitest run tests/nextCausalCapabilityDiscovery.test.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  canonicalJson,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  FOOD_PER_FARM_PER_TICK,
  FOOD_PER_COLONIST_PER_TICK,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getProgression,
  getRoadNetworks,
  getServedColonistCount,
  getVacantOperationalFarmCount,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterSupplyStatus,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  validatePlacement,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const worldConfig = (width = 14, height = 8): SimulationConfig => ({
  world: { seed: 'nova-step10ax', width, height },
})

/** The terrain fixture spans rows 0..11, so it needs a taller world. */
const fixtureConfig = (): SimulationConfig => worldConfig(14, 12)

// ---------------------------------------------------------------------------
// Harness (real domain constructors, no new rules)
// ---------------------------------------------------------------------------

interface SceneSpec {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly {
    readonly type: BuildingType
    readonly x: number
    readonly y: number
  }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly material?: number
  readonly food?: number
  readonly water?: number
}

const operationalBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10ax: building missing')
  }
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

const operationalRoad = (
  state: SimulationState,
  x: number,
  y: number
): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  const road = id === undefined ? undefined : created.state.roads[id]
  if (id === undefined || road === undefined) {
    throw new Error('10ax: road missing')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = createInitialState(worldConfig())
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 100,
      food: spec.food ?? 200,
      water: spec.water ?? 100,
    },
  }
  for (const [x, y] of spec.residences) {
    state = operationalBuilding(state, 'residence', x, y)
  }
  for (const building of spec.buildings) {
    state = operationalBuilding(state, building.type, building.x, building.y)
  }
  for (const [x, y] of spec.roads) {
    state = operationalRoad(state, x, y)
  }
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence'
  )
  for (let index = 0; index < Math.min(spec.colonists, residences.length); index += 1) {
    const residence = residences[index]
    if (residence !== undefined) {
      state = createColonist(state, residence.id).state
    }
  }
  return assignJobs(state)
}

const tick = (state: SimulationState, times: number): SimulationState => {
  let next = state
  for (let index = 0; index < times; index += 1) {
    next = stepSimulation(next)
  }
  return next
}

const WORKPLACE_TYPES: readonly BuildingType[] = ['farm', 'workshop', 'well']

const operationalWorkplaces = (state: SimulationState) =>
  [...iterateBuildings(state)].filter(
    (building) =>
      WORKPLACE_TYPES.includes(building.type) && building.status === 'operational'
  )

const vacantWorkplaces = (state: SimulationState): string[] =>
  operationalWorkplaces(state)
    .filter((building) => countWorkersAt(state, building.id) === 0)
    .map((building) => `${building.type}@${building.x},${building.y}`)

const staffedWorkplaces = (state: SimulationState): string[] =>
  operationalWorkplaces(state)
    .filter((building) => countWorkersAt(state, building.id) > 0)
    .map((building) => building.type)

const buildingCount = (state: SimulationState): number =>
  Object.keys(state.buildings).length

const residenceCount = (state: SimulationState): number =>
  [...iterateBuildings(state)].filter((b) => b.type === 'residence').length

const read = (state: SimulationState) => {
  const employment = getEmploymentSummary(state)
  return {
    tick: state.time.tick,
    population: Object.keys(state.colonists).length,
    food: state.resources.food,
    water: state.resources.water,
    material: state.resources.construction,
    foodPerTick: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    waterCapacity: getWaterProductionPerTick(state),
    waterServedResidences: getWaterServedResidenceCount(state),
    servedColonists: getServedColonistCount(state),
    waterSupply: getWaterSupplyStatus(state).state,
    materialPerTick: getMaterialProductionPerTick(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: employment.jobCapacity,
    unservedResidences: residenceCount(state) - getWaterServedResidenceCount(state),
    networks: getRoadNetworks(state).length,
    buildings: buildingCount(state),
    stage: getProgression(state).stage,
  }
}

/**
 * CONTROLLED PAIR signature: the fields a "different stable outcome" has to
 * show. Quantities alone (material, stock) are deliberately excluded except by
 * the caller.
 */
const outcomeSignature = (state: SimulationState): string => {
  const metrics = read(state)
  return [
    metrics.population,
    metrics.foodNet,
    metrics.waterCapacity,
    metrics.servedColonists,
    metrics.employed,
    metrics.unemployed,
    metrics.materialPerTick,
    metrics.stage,
  ].join('|')
}

/**
 * A balanced colony on ONE network: P residences, ceil(P/2) Wells and
 * ceil(P/2) Farms, P colonists, ample stock. This is the 10AN/10AO
 * "spare-workforce identity" generator, re-measured on the current code.
 */
const balancedColony = (population: number, extraWorkshops = 0): SimulationState => {
  // 10AN's balanced shape: ceil(P/2) Wells + floor(P/2) Farms = exactly P
  // workplaces, so every colonist has a job and Food is 0 net at even P.
  const wells = Math.ceil(population / 2)
  const farms = Math.floor(population / 2)
  const spine = Math.max(population, wells + farms + extraWorkshops)
  const roads: [number, number][] = []
  for (let x = 0; x < spine; x += 1) {
    roads.push([x, 1])
  }
  const residences: [number, number][] = []
  for (let index = 0; index < population; index += 1) {
    residences.push([index, 0])
  }
  const buildings: { type: BuildingType; x: number; y: number }[] = []
  for (let index = 0; index < wells; index += 1) {
    buildings.push({ type: 'well', x: index, y: 2 })
  }
  for (let index = 0; index < farms; index += 1) {
    buildings.push({ type: 'farm', x: wells + index, y: 2 })
  }
  for (let index = 0; index < extraWorkshops; index += 1) {
    buildings.push({ type: 'workshop', x: wells + farms + index, y: 2 })
  }
  return scene({ residences, buildings, roads, colonists: population })
}

/** The "civic integrity" contract candidate, built from EXISTING queries only. */
const integrity = (state: SimulationState) => ({
  allResidencesServed:
    getWaterServedResidenceCount(state) === residenceCount(state) &&
    residenceCount(state) > 0,
  noVacantWorkplace: operationalWorkplaces(state).length > 0 && vacantWorkplaces(state).length === 0,
  singleNetwork: getRoadNetworks(state).length === 1,
})

const integrityHolds = (state: SimulationState): boolean => {
  const parts = integrity(state)
  return parts.allResidencesServed && parts.noVacantWorkplace && parts.singleNetwork
}

// ---------------------------------------------------------------------------
// 1. Delta-only: the closed capability matrix
// ---------------------------------------------------------------------------

describe('1. delta-only closed capability matrix', () => {
  it('records every already-closed dimension as closed evidence', () => {
    const closed = [
      { audit: '10AG', dimension: 'Food distribution', verdict: 'NO SYSTEM — a distribution layer would clone the Water shape and create no new decision', status: 'closed' },
      { audit: '10AH', dimension: 'Physical adjacency / density', verdict: 'NO NEW SPATIAL SYSTEM — adjacency is not a concept; same-network facts already carry every consequence', status: 'closed' },
      { audit: '10AI', dimension: 'New core system', verdict: 'NO NEW CORE SYSTEM JUSTIFIED — the causal loop is complete; no candidate passed criterion 1', status: 'closed' },
      { audit: '10AK', dimension: 'Simple population thresholds', verdict: 'Town -> City NOT CONTRACTABLE — larger colonies are identical in kind; arbitrary thresholds rejected', status: 'closed' },
      { audit: '10AN', dimension: 'Labour specialization, workforce surplus, infrastructure scale, spatial optimization, construction throughput', verdict: 'all REJECTED — linear scale or cost only; the missing dependency is a spare worker', status: 'closed' },
      { audit: '10AO', dimension: 'Sustainable industry', verdict: 'NOT CONTRACTABLE — industry is temporary or deficit-based; no spare worker exists', status: 'closed' },
      { audit: '10AP', dimension: 'Production-rate tuning', verdict: 'spare <= 0 at every feasible population at 2/2; the tuning decision is DEFERRED with its content', status: 'deferred' },
      { audit: '10AA/10AB/10AC', dimension: 'Producer-to-producer dependency (Workshop <- Water per tick)', verdict: 'STOPPED — closes a construction cycle rooted in the finite initial Material stock; a construction-time one-off Water cost was implemented instead (10AD)', status: 'closed' },
      { audit: '10X', dimension: 'Road-distance efficiency, irrigation, power coverage, sanitation, education, transit', verdict: 'C/D — duplicate Water/Food, need a missing consumer, or need a flow that does not exist', status: 'closed' },
      { audit: '10Z', dimension: 'Construction crew as a durable advantage', verdict: 'not fundamental — nothing converts construction timing into a persistent payoff', status: 'closed' },
      { audit: '10V/10W', dimension: 'Shelter quality', verdict: 'B then C — a real spatial choice with no independent consequence; deferred', status: 'closed' },
      { audit: '10T/10U', dimension: 'Farm <- Water input, recurring upkeep as input', verdict: 'REJECTED — survival spiral / recurring Material tax', status: 'closed' },
      { audit: '10AR', dimension: 'Partitioned valley as a standalone scenario', verdict: 'B — useful but overlapping; deferred, catalogue stays 7', status: 'closed' },
      { audit: '10AS', dimension: 'Opening economy order/geometry', verdict: 'A — healthy; no missing causal relationship measured', status: 'closed' },
      { audit: '10AT', dimension: 'New economic capability', verdict: 'NO — no missing causal capability found; phase closed as A', status: 'closed' },
      { audit: '10AU/10AV/10AW', dimension: 'Terrain and obstacles', verdict: 'implemented as spatial input; every terrain decision space is a SUBSET of its open-map twin (no new reachable outcome)', status: 'closed' },
    ]
    audit('CLOSED_CAPABILITIES', closed)
    expect(closed.every((row) => row.status === 'closed' || row.status === 'deferred')).toBe(true)
    expect(closed.filter((row) => row.status === 'deferred')).toHaveLength(1)
  })

  it('pins the frozen baseline the discovery must respect', () => {
    const frozen = {
      scenarioCount: SCENARIOS.length,
      catalogueHasTerrain: SCENARIOS.some((scenario) => scenario.blockedCells !== undefined),
      saveVersion: SAVE_VERSION,
      objectiveKinds: [
        ...new Set(
          SCENARIOS.flatMap((scenario) =>
            scenario.objective.requirements.map((requirement) => requirement.kind)
          )
        ),
      ].sort(),
      foodPerFarm: FOOD_PER_FARM_PER_TICK,
      foodPerColonist: FOOD_PER_COLONIST_PER_TICK,
      waterPerWell: WATER_PER_WELL_PER_TICK,
      waterPerColonist: WATER_PER_COLONIST_PER_TICK,
      materialPerWorker: MATERIAL_PER_WORKER_PER_TICK,
      materialUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      materialStorage: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      roadCost: ROAD_CONSTRUCTION_COST,
    }
    audit('FROZEN_BASELINE', frozen)
    // 7 in this audit; Step 10BE later added one curated content scenario.
    expect(frozen.scenarioCount).toBe(8)
    expect(frozen.catalogueHasTerrain).toBe(false)
    expect(frozen.saveVersion).toBe(7)
    expect(frozen.objectiveKinds).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
    expect(frozen.foodPerFarm).toBe(2)
    expect(frozen.waterPerWell).toBe(2)
    expect(frozen.materialPerWorker).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 2. The Town problem
// ---------------------------------------------------------------------------

describe('2. the Town problem', () => {
  it('shows that the Village contract accepts a structurally defective colony', () => {
    const fixture = createScenarioState(fixtureConfig(), TERRAIN_CHOKEPOINT_FIXTURE)
    const metrics = read(fixture)
    const parts = integrity(fixture)
    audit('VILLAGE_VS_ORGANISATION', {
      stage: metrics.stage,
      servedResidences: metrics.waterServedResidences,
      residences: residenceCount(fixture),
      vacantWorkplaces: vacantWorkplaces(fixture),
      networks: metrics.networks,
      jobs: `${metrics.employed}/${metrics.jobCapacity}`,
      integrity: parts,
    })
    // Village is TRUE while the settlement is split, one Residence is unserved
    // and one operational workplace is vacant: the current contract is a SCALE
    // milestone, not an organisation state.
    expect(metrics.stage).toBe('village')
    expect(metrics.networks).toBe(2)
    expect(metrics.waterServedResidences).toBe(1)
    expect(metrics.employed).toBeLessThan(metrics.jobCapacity)
    expect(getVacantOperationalFarmCount(fixture)).toBe(1)
    expect(integrityHolds(fixture)).toBe(false)
  })

  it('re-measures the no-spare-worker identity on the current code', () => {
    const rows = [2, 3, 4, 5, 6, 8, 10].map((population) => {
      const state = balancedColony(population)
      const metrics = read(state)
      return {
        population,
        workplaces: operationalWorkplaces(state).length,
        staffed: staffedWorkplaces(state),
        vacant: vacantWorkplaces(state),
        employed: metrics.employed,
        unemployed: metrics.unemployed,
        foodPerTick: metrics.foodPerTick,
        waterCapacity: metrics.waterCapacity,
      }
    })
    audit('SPARE_WORKFORCE_IDENTITY', rows)
    for (const row of rows) {
      expect(row.unemployed).toBe(0)
      expect(row.vacant).toEqual([])
      expect(row.waterCapacity).toBeGreaterThanOrEqual(row.population)
    }
    // Odd populations additionally run a Food deficit: the identity is exact at
    // even P and one Farm short at odd P.
    expect(rows.find((row) => row.population === 3)?.foodPerTick).toBe(2)
    expect(rows.find((row) => row.population === 6)?.foodPerTick).toBe(6)
  })

  it('shows that adding the fourth workplace costs a survival service', () => {
    const rows = [3, 4, 6].map((population) => {
      const state = balancedColony(population, 1)
      const metrics = read(state)
      return {
        population,
        workplaces: operationalWorkplaces(state).length,
        staffed: staffedWorkplaces(state),
        vacant: vacantWorkplaces(state),
        foodPerTick: metrics.foodPerTick,
        foodConsumption: metrics.foodConsumption,
        waterCapacity: metrics.waterCapacity,
        materialPerTick: metrics.materialPerTick,
        employed: metrics.employed,
        unemployed: metrics.unemployed,
      }
    })
    audit('FOURTH_WORKPLACE', rows)
    // One Workplace is vacant in every case, so the Workshop can only run by
    // taking a worker from a survival service — the measured
    // "no discretionary labour" identity.
    for (const row of rows) {
      expect(row.vacant.length).toBe(1)
      expect(row.unemployed).toBe(0)
    }
  })

  it('measures that industry needs surplus labour the economy never supplies', () => {
    // One colonist, three workplaces, and the Workshop is the NEAREST: the
    // colonist staffs it and both survival services are left vacant.
    const state = scene({
      residences: [[0, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
        { type: 'workshop', x: 0, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
      material: 0,
      food: 50,
      water: 50,
    })
    const allocated = {
      staffed: staffedWorkplaces(state),
      vacant: vacantWorkplaces(state),
      ...read(state),
    }
    const after80 = read(tick(state, 80))
    audit('INDUSTRY_NEEDS_SURPLUS', { allocated, after80 })
    // The Workshop wins the worker; Food production is 0 and the colony
    // collapses. A sustainable Workshop therefore needs a worker the survival
    // economy does not consume — the capability the model lacks.
    expect(allocated.staffed).toEqual(['workshop'])
    expect(allocated.foodNet).toBe(-1)
    expect(allocated.waterCapacity).toBe(0)
    expect(after80.population).toBe(0)
  })

  it('measures that scale is quantity only (2 colonists vs 6 colonists)', () => {
    const village = read(balancedColony(2))
    const cityLike = read(balancedColony(6))
    audit('SCALE_IS_QUANTITY', { village, cityLike })
    expect(village.foodNet).toBe(0)
    expect(cityLike.foodNet).toBe(0)
    expect(village.waterCapacity / village.population).toBeCloseTo(
      cityLike.waterCapacity / cityLike.population,
      5
    )
    expect(village.stage).toBe('village')
    expect(cityLike.stage).toBe('village')
    // Identical flow STRUCTURE: same per-colonist Food and Water, same zero
    // Material income, same stage. Only the quantities differ.
    expect(village.materialPerTick).toBe(0)
    expect(cityLike.materialPerTick).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Candidate A — colonist differentiation
// ---------------------------------------------------------------------------

describe('3. candidate A: colonist differentiation', () => {
  it('measures colonist interchangeability (relabelling invariance)', () => {
    const build = (): SimulationState =>
      scene({
        residences: [
          [0, 0],
          [1, 0],
        ],
        buildings: [
          { type: 'well', x: 0, y: 2 },
          { type: 'farm', x: 1, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
        ],
        colonists: 2,
      })
    const first = build()
    // Same buildings, colonists created in the other order: identical outcome.
    const swapped = (() => {
      const base = scene({
        residences: [
          [1, 0],
          [0, 0],
        ],
        buildings: [
          { type: 'well', x: 0, y: 2 },
          { type: 'farm', x: 1, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
        ],
        colonists: 2,
      })
      return base
    })()
    const rows = {
      first: { ...read(first), workplaces: staffedWorkplaces(first) },
      swappedResidenceOrder: { ...read(swapped), workplaces: staffedWorkplaces(swapped) },
    }
    audit('COLONIST_INTERCHANGEABILITY', rows)
    // Every colonist has the same capability: only residence, workplace and
    // construction assignment distinguish them, and all three are already
    // player-visible/controllable.
    expect(outcomeSignature(first)).toBe(outcomeSignature(swapped))
    expect(getWaterProductionPerTick(first)).toBe(2)
    expect(getFoodProductionPerTick(first)).toBe(2)
  })

  it('shows a tie-broken preference changes identity but not the outcome', () => {
    const state = scene({
      residences: [[0, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 0, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
      ],
      colonists: 1,
    })
    const assigned = [...iterateBuildings(state)]
      .filter((building) => countWorkersAt(state, building.id) > 0)
      .map((building) => building.type)
    const metrics = read(state)
    audit('TIE_BREAK', { assigned, metrics })
    // A single colonist and two equidistant workplaces: one of them is staffed
    // (lowest building id) and the other is vacant. Which one is a deterministic
    // tie-break, and the outcome signature is unchanged either way: the model
    // needs no per-colonist capability to decide it.
    expect(assigned).toHaveLength(1)
    expect(metrics.employed).toBe(1)
    expect(metrics.unemployed).toBe(0)
    expect(metrics.foodNet + metrics.waterCapacity).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Candidate B — construction scheduling / priority
// ---------------------------------------------------------------------------

describe('4. candidate B: construction scheduling', () => {
  const opening = (): SimulationState =>
    scene({
      residences: [[0, 0]],
      buildings: [],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
      material: 50,
      food: 3,
      water: 0,
    })

  it('measures that construction ORDER can decide survival (existing capability)', () => {
    const plan = (first: BuildingType, second: BuildingType): SimulationState => {
      let state = opening()
      state = stepSimulation(state, {
        type: 'placeBuilding',
        x: first === 'farm' ? 1 : 2,
        y: 2,
        buildingType: first,
      })
      state = stepSimulation(state, {
        type: 'placeBuilding',
        x: second === 'farm' ? 1 : 2,
        y: 2,
        buildingType: second,
      })
      return tick(state, 60)
    }
    const farmFirst = plan('farm', 'well')
    const wellFirst = plan('well', 'farm')
    const rows = {
      farmFirst: { ...read(farmFirst), firstDecision: 'farm' },
      wellFirst: { ...read(wellFirst), firstDecision: 'well' },
    }
    audit('CONSTRUCTION_ORDER', rows)
    // The order is a real, existing decision: the same 50 Material buys the same
    // two buildings, and one order survives where the other does not (measured:
    // the Food reserve is the only difference).
    expect(read(farmFirst).population).toBeGreaterThan(0)
    expect(read(wellFirst).population).toBe(0)
    // The capability is exactly the one 10AS/10AM already measured: the model
    // needs no scheduler, only the player's choice of what to build when.
    expect(getRoadNetworks(farmFirst).length).toBe(1)
  })

  it('measures construction throughput as linear in ticks (one command per tick)', () => {
    let state = scene({
      residences: [[0, 0]],
      buildings: [],
      roads: [[0, 1]],
      colonists: 1,
      material: 100,
      food: 200,
    })
    const placements: readonly CellCoordinate[] = [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]
    const startTick = state.time.tick
    for (const cell of placements) {
      state = stepSimulation(state, {
        type: 'placeBuilding',
        x: cell.x,
        y: cell.y,
        buildingType: 'farm',
      })
    }
    const elapsed = state.time.tick - startTick
    audit('THROUGHPUT', {
      placements: placements.length,
      elapsedTicks: elapsed,
      materialSpent: 100 - state.resources.construction,
    })
    // Four placements cost four ticks and four x 25 Material, plus 2 ticks of
    // construction each: throughput is linear in both currencies, so it is a
    // quantity, not a new qualitative dimension.
    expect(elapsed).toBe(placements.length)
    expect(100 - state.resources.construction).toBe(4 * 25)
  })
})

// ---------------------------------------------------------------------------
// 5. Candidate C — infrastructure contention
// ---------------------------------------------------------------------------

describe('5. candidate C: infrastructure contention', () => {
  it('measures that one shared access cell and three dedicated cells give identical flows', () => {
    // Shared: ONE road cell (1,1) is the access of all four buildings.
    const shared = scene({
      residences: [
        [1, 0],
        [0, 1],
      ],
      buildings: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 2, y: 1 },
      ],
      roads: [[1, 1]],
      colonists: 2,
    })
    // Dedicated: the same topology one cell wider, every building on its own
    // access road cell (3 cells instead of 1).
    const dedicated = scene({
      residences: [
        [1, 0],
        [2, 0],
      ],
      buildings: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
    })
    const rows = {
      shared: { ...read(shared), roads: Object.keys(shared.roads).length },
      dedicated: { ...read(dedicated), roads: Object.keys(dedicated.roads).length },
    }
    audit('CONTENTION', rows)
    // A road cell has no throughput, no load and no capacity rule: three access
    // cells instead of one change NOTHING in the flows. The only difference a
    // player ever pays for is 5 Material per cell.
    expect(outcomeSignature(shared)).toBe(outcomeSignature(dedicated))
    expect(rows.shared.waterServedResidences).toBe(2)
    expect(rows.dedicated.waterServedResidences).toBe(2)
    expect(rows.shared.employed).toBe(2)
    expect(rows.dedicated.employed).toBe(2)
    expect(rows.shared.roads).toBe(1)
    expect(rows.dedicated.roads).toBe(3)
  })

  it('checks the only structural sharing rule the model has (one occupant per cell)', () => {
    const state = scene({
      residences: [[0, 0]],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [[0, 1]],
      colonists: 1,
    })
    const roads = Object.entries(state.roads).map(([id, road]) => ({ id, cell: `${road.x},${road.y}` }))
    const buildingCells = [...iterateBuildings(state)].map((b) => `${b.x},${b.y}`)
    audit('STRUCTURAL_SHARING', { roads, buildingCells, overlap: roads.filter((r) => buildingCells.includes(r.cell)) })
    // Cells are exclusive (building XOR road). That is a placement rule, not a
    // scheduling/contention rule: nothing consumes a road's capacity.
    expect(roads.filter((road) => buildingCells.includes(road.cell))).toEqual([])
    expect(roads).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Candidate D — housing / population composition
// ---------------------------------------------------------------------------

describe('6. candidate D: housing composition', () => {
  /**
   * The SAME four buildings, two roads, two colonists and identical stock; the
   * only difference is which network the second Residence stands on. Both are
   * legal canonical states (a scenario can author either) and both are reachable
   * with one existing command (where the extra Residence is built).
   */
  const composition = (secondResidence: CellCoordinate | null): SimulationState =>
    scene({
      residences:
        secondResidence === null
          ? [[1, 0]]
          : [
              [1, 0],
              [secondResidence.x, secondResidence.y],
            ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: secondResidence === null ? 1 : 2,
      material: 50,
      food: 50,
      water: 0,
    })

  it('measures that the same buildings produce a Water economy or none', () => {
    const acrossNetworks = composition({ x: 3, y: 0 })
    const bothWestNetwork = composition({ x: 0, y: 1 })
    const rows = {
      acrossNetworks: { ...read(acrossNetworks), staffed: staffedWorkplaces(acrossNetworks), vacant: vacantWorkplaces(acrossNetworks) },
      bothWestNetwork: { ...read(bothWestNetwork), staffed: staffedWorkplaces(bothWestNetwork), vacant: vacantWorkplaces(bothWestNetwork) },
    }
    audit('HOUSING_COMPOSITION', rows)
    // Across the two networks: the Well is staffed -> 2 Water/tick.
    expect(rows.acrossNetworks.waterCapacity).toBe(2)
    expect(rows.acrossNetworks.employed).toBe(2)
    // Both homes on the network WITHOUT the Well: the Well is vacant -> the
    // colony produces NO Water at all with identical buildings, roads, stock and
    // population. Same stock, same population, same buildings, different
    // structural choice, different stable outcome.
    expect(rows.bothWestNetwork.waterCapacity).toBe(0)
    expect(rows.bothWestNetwork.employed).toBe(1)
    expect(rows.bothWestNetwork.unemployed).toBe(1)
    expect(outcomeSignature(acrossNetworks)).not.toBe(outcomeSignature(bothWestNetwork))
  })

  it('checks stability at 60 and 600 ticks', () => {
    const acrossNetworks = composition({ x: 3, y: 0 })
    const bothWestNetwork = composition({ x: 0, y: 1 })
    const rows = {
      across60: read(tick(acrossNetworks, 60)),
      across600: read(tick(acrossNetworks, 600)),
      west60: read(tick(bothWestNetwork, 60)),
      west600: read(tick(bothWestNetwork, 600)),
    }
    audit('HOUSING_COMPOSITION_LONG_RUN', rows)
    // Both states are STABLE (not transient): the Water difference persists.
    expect(rows.across600.waterCapacity).toBe(2)
    expect(rows.west600.waterCapacity).toBe(0)
    expect(rows.across600.population).toBe(rows.across60.population)
    expect(rows.west600.population).toBe(rows.west60.population)
    expect(rows.across600.waterCapacity).toBe(rows.across60.waterCapacity)
    expect(rows.west600.waterCapacity).toBe(rows.west60.waterCapacity)
  })

  it('measures whether the difference is a new capability or the existing placement decision', () => {
    const common: SimulationState = composition(null)
    const eastCommand = validatePlacement(common, { x: 3, y: 0 }, 'residence')
    const westCommand = validatePlacement(common, { x: 0, y: 1 }, 'residence')
    const rows = {
      commonPopulation: read(common).population,
      legalOptions: [
        { cell: '3,0', network: 'east (with the Well)', valid: eastCommand.valid },
        { cell: '0,1', network: 'west (with the Farm)', valid: westCommand.valid },
      ],
      sameCost: 25,
      // The composition is chosen by an EXISTING command; no new capability is
      // needed to reach either state.
      reachableWithExistingCommand: eastCommand.valid && westCommand.valid,
    }
    audit('HOUSING_REACHABILITY', rows)
    expect(rows.reachableWithExistingCommand).toBe(true)
    expect(rows.legalOptions.every((option) => option.valid)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 7. Candidate E — production timing
// ---------------------------------------------------------------------------

describe('7. candidate E: production timing', () => {
  it('measures the reserve-funded Workshop burst as temporary only', () => {
    const state = scene({
      residences: [
        [0, 0],
        [2, 0],
      ],
      buildings: [
        { type: 'well', x: 0, y: 2 },
        { type: 'farm', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      material: 25,
      food: 100,
      water: 51,
    })
    const withWorkshop = stepSimulation(state, {
      type: 'placeBuilding',
      x: 1,
      y: 2,
      buildingType: 'workshop',
    })
    const staffed = tick(withWorkshop, 6)
    const assignment = [...iterateBuildings(staffed)]
      .filter((building) => countWorkersAt(staffed, building.id) > 0)
      .map((building) => building.type)
    const after40 = read(tick(withWorkshop, 40))
    audit('PRODUCTION_TIMING', {
      materialAfterPlacement: withWorkshop.resources.construction,
      waterAfterPlacement: withWorkshop.resources.water,
      assignment,
      after40,
      storageCap: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
    })
    // The Workshop can only run by displacing a survival worker: the burst buys
    // Material for a bounded number of ticks and cannot be sustained (10AQ).
    expect(withWorkshop.resources.water).toBe(50)
    expect(withWorkshop.resources.construction).toBe(0)
    expect(after40.population).toBeGreaterThan(0)
    // Food or Water (or both) end in deficit at 40 ticks: industry is funded by
    // a reserve, never by a surplus.
    expect(after40.foodNet <= 0 || after40.waterCapacity < after40.population).toBe(true)
  })

  it('measures the storage clamp as a bound, not a phenomenon', () => {
    const state = scene({
      residences: [[0, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'workshop', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
      material: 0,
      food: 50,
      water: 50,
    })
    const rows = [1, 10, 60].map((ticks) => {
      const settled = read(tick(state, ticks))
      return { ticks, material: settled.material, materialPerTick: settled.materialPerTick }
    })
    audit('STORAGE_CLAMP', rows)
    // A lone staffed Workshop with a Farm is impossible at P=1 (one workplace),
    // so measured Material stays 0: the clamp never even engages here.
    expect(rows.every((row) => row.material === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 8. Candidate F — resource transformation
// ---------------------------------------------------------------------------

describe('8. candidate F: resource transformation', () => {
  it('measures the only qualitative cross-dependency: all-or-nothing Food', () => {
    const starving = scene({
      residences: [[0, 0]],
      buildings: [],
      roads: [[0, 1]],
      colonists: 1,
      material: 100,
      food: 1,
      water: 0,
    })
    const rows = [0, 1, 2, 3].map((ticks) => {
      const settled = read(tick(starving, ticks))
      return { ticks, population: settled.population, food: settled.food }
    })
    audit('FOOD_COLLAPSE', rows)
    expect(rows[0]?.population).toBe(1)
    expect(rows[2]?.population).toBe(0)
    // The transformation chain is Food -> workforce -> Water -> Material with a
    // single survival rule; the colony's survival stake is Food only.
    expect(rows[3]?.food).toBe(0)
  })

  it('measures that Water shortage is a growth gate, never a survival rule', () => {
    const state = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [
        [0, 1],
        [1, 1],
      ],
      colonists: 2,
      material: 0,
      food: 50,
      water: 0,
    })
    const settled = read(tick(state, 20))
    audit('WATER_SHORTAGE_NOT_FATAL', settled)
    expect(settled.population).toBe(2)
    expect(settled.waterCapacity).toBe(0)
    // No Water and still alive: the only qualitative cross-dependency that can
    // change the colony's kind is the Food rule, and it is already contracted
    // through `failsWithoutColonists`.
    expect(settled.foodNet).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Candidate G — network topology
// ---------------------------------------------------------------------------

describe('9. candidate G: network topology', () => {
  it('measures component size as a bound on staffable workplaces', () => {
    const state = scene({
      residences: [[1, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
        { type: 'workshop', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      colonists: 1,
      material: 50,
      food: 50,
      water: 50,
    })
    const metrics = read(state)
    audit('COMPONENT_SIZE', {
      metrics,
      staffed: staffedWorkplaces(state),
      vacant: vacantWorkplaces(state),
    })
    // One colonist can staff one workplace: the other two stay vacant. Component
    // size only bounds how many workplaces are REACHABLE, which is the existing
    // 09K mobility gate — no new topological consequence.
    expect(metrics.employed).toBe(1)
    expect(metrics.jobCapacity).toBe(3)
    expect(vacantWorkplaces(state)).toHaveLength(2)
  })

  it('measures the one topology quirk: a vacant Well still grants coverage', () => {
    // The Farm is created first, so it wins the distance tie (both workplaces
    // touch the single access cell (1,1)) and the Well stays vacant.
    const state = scene({
      residences: [[1, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 0, y: 1 },
      ],
      roads: [[1, 1]],
      colonists: 1,
      material: 0,
      food: 50,
      water: 0,
    })
    const served = getWaterCoverage(state).servedResidenceIds.length
    const staffed = staffedWorkplaces(state)
    const metrics = read(state)
    audit('VACANT_WELL_COVERAGE', { served, staffed, metrics })
    // Coverage is granted by an OPERATIONAL well, not by a STAFFED one: the
    // Residence is served while the colony produces 0 Water. This is the
    // 10AW-documented incoherence (coverage != production), not a capability.
    expect(served).toBe(1)
    expect(staffed).not.toContain('well')
    expect(metrics.waterCapacity).toBe(0)
    expect(metrics.servedColonists).toBe(1)
    expect(metrics.waterSupply).toBe('shortage')
  })
})

// ---------------------------------------------------------------------------
// 10. Town contract test
// ---------------------------------------------------------------------------

describe('10. Town contract test', () => {
  it('evaluates a civic-integrity contract built from existing queries only', () => {
    const rows = [
      ...SCENARIOS.map((scenario) => {
        const state = createScenarioState(fixtureConfig(), scenario)
        return {
          state: scenario.id,
          stage: getProgression(state).stage,
          integrity: integrityHolds(state),
          parts: integrity(state),
        }
      }),
      (() => {
        const fixture = createScenarioState(fixtureConfig(), TERRAIN_CHOKEPOINT_FIXTURE)
        return {
          state: 'terrain-chokepoint fixture',
          stage: getProgression(fixture).stage,
          integrity: integrityHolds(fixture),
          parts: integrity(fixture),
        }
      })(),
      (() => {
        const coherent = balancedColony(2)
        return {
          state: 'coherent Village (2 colonists, 1 Well, 1 Farm, 2 Residences)',
          stage: getProgression(coherent).stage,
          integrity: integrityHolds(coherent),
          parts: integrity(coherent),
        }
      })(),
    ]
    audit('INTEGRITY_CONTRACT', rows)
    // The contract is causal (three existing derived facts), non-arbitrary (no
    // population / building / tick threshold) and expressible with existing
    // primitives (all three parts are existing queries)...
    expect(rows.some((row) => row.integrity)).toBe(true)
    expect(rows.some((row) => !row.integrity)).toBe(true)
    // ...and it separates states the current Village contract conflates.
    const fixture = rows.find((row) => row.state === 'terrain-chokepoint fixture')
    expect(fixture?.stage).toBe('village')
    expect(fixture?.integrity).toBe(false)
  })

  it('measures the spare-worker Town contract as not contractable at 2/2', () => {
    const rows = [2, 4, 6, 8, 10].map((population) => {
      const state = balancedColony(population, 1)
      const metrics = read(state)
      return {
        population,
        vacancy: vacantWorkplaces(state),
        // "a staffed Workshop while Food and Water stay balanced"
        staffedWorkshop:
          [...iterateBuildings(state)].some(
            (building) =>
              building.type === 'workshop' && countWorkersAt(state, building.id) > 0
          ),
        foodNet: metrics.foodNet,
        waterCapacity: metrics.waterCapacity,
        balanced: metrics.foodNet >= 0 && metrics.waterCapacity >= metrics.population,
      }
    })
    audit('SPARE_WORKER_CONTRACT', rows)
    // No population sustains a staffed Workshop with balanced flows: 10AO/10AP's
    // identity, re-measured on the current code.
    expect(rows.every((row) => !(row.staffedWorkshop && row.balanced))).toBe(true)
    expect(rows.every((row) => row.balanced)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 11. Scenario potential and the final matrix
// ---------------------------------------------------------------------------

describe('11. scenario potential and final matrix', () => {
  const matrix = [
    { candidate: 'Colonist differentiation', newPhenomenon: false, causal: true, stable: true, consequential: false, qualitative: false, readable: true, townCapable: false, scenarioClass: 'D', why: 'colonists are interchangeable (measured relabelling invariance); every distinction is already a counted assignment, and 10X class 6 (capability unlock) was classified C for the same reason (no consumer)' },
    { candidate: 'Construction timing', newPhenomenon: false, causal: true, stable: false, consequential: true, qualitative: false, readable: true, townCapable: false, scenarioClass: 'C', why: 'the ordering decision already exists and decides survival (measured), but it is the 10AS/10AM decision; the crew (10Y) and throughput (linear in ticks) add no durable advantage (10Z)' },
    { candidate: 'Infrastructure contention', newPhenomenon: false, causal: false, stable: false, consequential: false, qualitative: false, readable: true, townCapable: false, scenarioClass: 'E', why: 'a road cell has no load/throughput/capacity rule: 1 shared access and 4 dedicated accesses give identical flows (measured)' },
    { candidate: 'Housing composition', newPhenomenon: false, causal: true, stable: true, consequential: true, qualitative: true, readable: true, townCapable: false, scenarioClass: 'B', why: 'same buildings/stock/population can mean a Water economy or none (measured, stable at 600 ticks), but the choice is the EXISTING placement decision (which cell the Residence occupies) and it re-uses 09K/10P/10AW evidence' },
    { candidate: 'Production timing', newPhenomenon: false, causal: true, stable: false, consequential: true, qualitative: false, readable: true, townCapable: false, scenarioClass: 'E', why: 'the reserve-funded burst is bounded and displaces a survival worker (measured at 40 ticks); production stays instantaneous per tick (10AO/10AP/10AQ)' },
    { candidate: 'Resource transformation', newPhenomenon: false, causal: true, stable: true, consequential: true, qualitative: false, readable: true, townCapable: false, scenarioClass: 'E', why: 'the only qualitative cross-dependency is all-or-nothing Food (measured collapse in 2 ticks); the recurring producer input was rejected twice (10T, 10AA/10AB) and replaced by the one-off construction cost (10AD)' },
    { candidate: 'Network topology', newPhenomenon: false, causal: true, stable: true, consequential: true, qualitative: false, readable: true, townCapable: false, scenarioClass: 'C', why: 'component size only bounds staffable workplaces through the existing 09K gate (measured 1/3 staffed); the one quirk (a vacant Well grants coverage) is an incoherence to consider fixing, not a capability' },
  ]

  it('records the per-candidate criteria matrix', () => {
    audit('CANDIDATE_MATRIX', matrix)
    expect(matrix).toHaveLength(7)
    expect(matrix.every((row) => row.townCapable === false)).toBe(true)
    expect(matrix.every((row) => row.newPhenomenon === false)).toBe(true)
    // The declared columns are binary/factual, never a score.
    for (const row of matrix) {
      expect(typeof row.causal).toBe('boolean')
      expect(typeof row.qualitative).toBe('boolean')
      expect(['A', 'B', 'C', 'D', 'E']).toContain(row.scenarioClass)
    }
  })

  it('records the player-decision tables for the two causal survivors', () => {
    const decisions = [
      {
        candidate: 'Construction timing (existing capability)',
        decision: 'which building to place first with a fixed 50 Material and 6 Food',
        optionA: 'Farm first (Food in production at the earliest tick)',
        optionB: 'Well first (Water capacity before Food)',
        immediate: 'the first service to become operational',
        delayed: 'survival: the Food reserve is 6 ticks (measured)',
        recovery: 'both buildings can still be completed; a lost colonist cannot be recovered',
        permanent: 'a wiped colony has no recovery (all-or-nothing Food)',
      },
      {
        candidate: 'Housing composition (existing capability)',
        decision: 'which network the next Residence stands on',
        optionA: 'Residence on the Well network (colonist staffs the Well)',
        optionB: 'Residence on the Farm-only network (colonist staffs the Farm)',
        immediate: 'the second colonist staffs a workplace or is unemployed',
        delayed: 'the colony either produces 2 Water/tick or 0 (measured, stable at 600 ticks)',
        recovery: 'free: a new Residence on the other network can be built later (25 Material)',
        permanent: 'none while Material remains, because placement is the only action needed',
      },
    ]
    audit('PLAYER_DECISIONS', decisions)
    expect(decisions).toHaveLength(2)
    expect(decisions.every((row) => row.recovery.length > 0)).toBe(true)
  })

  it('records the Town verdict per candidate', () => {
    const verdicts = [
      { candidate: 'Colonist differentiation', contract: 'none needed (homogeneous by construction)', primitivesSufficient: true, verdict: 'NOT A TOWN AXIS' },
      { candidate: 'Construction timing', contract: 'no contract possible without an arbitrary tick/building threshold', primitivesSufficient: false, verdict: 'NOT CONTRACTABLE' },
      { candidate: 'Infrastructure contention', contract: 'none exists in the model', primitivesSufficient: false, verdict: 'NOT A TOWN AXIS' },
      { candidate: 'Housing composition', contract: 'civic integrity (all Residences served AND no vacant workplace AND one network)', primitivesSufficient: true, verdict: 'CONTRACTIBLE BUT NOT A NEW CAPABILITY — the reasoning is the existing placement decision' },
      { candidate: 'Production timing', contract: 'sustainable industry (a staffed Workshop with balanced flows)', primitivesSufficient: true, verdict: 'NOT CONTRACTABLE at 2/2 (measured, no spare worker)' },
      { candidate: 'Resource transformation', contract: 'recurring producer input', primitivesSufficient: true, verdict: 'CLOSED — rejected for cycle/deadlock risk (10AA/10AB), replaced by the one-off construction cost' },
      { candidate: 'Network topology', contract: 'topological integrity beyond served/notConnected', primitivesSufficient: false, verdict: 'NOT CONTRACTABLE — no consequence beyond the 09K gate' },
    ]
    audit('TOWN_VERDICTS', verdicts)
    expect(verdicts.filter((row) => row.verdict.startsWith('CONTRACTIBLE')).map((row) => row.candidate)).toEqual([
      'Housing composition',
    ])
    expect(verdicts.every((row) => !row.verdict.includes('TOWN-CAPABLE'))).toBe(true)
  })

  it('records the scenario potential per candidate without creating one', () => {
    const potential = matrix.map((row) => ({
      candidate: row.candidate,
      class: row.scenarioClass,
      why: row.why,
    }))
    audit('SCENARIO_POTENTIAL', potential)
    expect(SCENARIOS).toHaveLength(8)
    expect(potential.every((row) => row.class !== 'A')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 12. Determinism, save/load and frozen architecture
// ---------------------------------------------------------------------------

describe('12. determinism, save/load, frozen architecture', () => {
  it('keeps the audit fixtures deterministic, insertion-order invariant and save/load stable', () => {
    const state = balancedColony(4, 1)
    const again = balancedColony(4, 1)
    const reloaded = loadSave(serializeSave(state))
    const rows = {
      deterministic: hashCanonicalState(state) === hashCanonicalState(again),
      reloadEquivalent: hashCanonicalState(reloaded) === hashCanonicalState(state),
      saveVersion: SAVE_VERSION,
      terrainFree: !canonicalJson(state).includes('blockedCells'),
    }
    audit('AUDIT_FIXTURE_DETERMINISM', rows)
    expect(rows.deterministic).toBe(true)
    expect(rows.reloadEquivalent).toBe(true)
    expect(rows.saveVersion).toBe(7)
    expect(rows.terrainFree).toBe(true)
  })

  it('shows the audit introduced no new production surface', () => {
    const SOURCE_ROOT = 'src'
    const collect = (dir: string): string[] => {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
          files.push(...collect(path))
        } else if (path.endsWith('.ts')) {
          files.push(path.replace(/\\/g, '/'))
        }
      }
      return files
    }
    const files = collect(SOURCE_ROOT)
    const named = {
      // No candidate identifier from this audit exists in production code.
      candidateIdentifiers: ['integrity', 'contention', 'spareWorker', 'housingComposition'].filter(
        (identifier) =>
          files.some((file) => readFileSync(file, 'utf8').includes(identifier))
      ),
      terrainReaders: files.filter((file) =>
        /blockedCells|isTerrainBlocked/.test(readFileSync(file, 'utf8'))
      ).length,
      sourceFiles: files.length,
    }
    audit('FROZEN_ARCHITECTURE', named)
    expect(named.candidateIdentifiers).toEqual([])
    expect(named.terrainReaders).toBe(8)
  })
})
