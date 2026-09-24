/**
 * Step 10AY — Water coverage & service consistency audit.
 *
 * AUDIT + CLOSURE. The subject is the ONE thing 10AX flagged: an operational
 * but VACANT Well grants Water coverage to a Residence while producing no Water.
 * This file traces the real pipeline, measures the three concepts separately
 * (capacity / service / reserve), runs the controlled matrix, the critical
 * vacant-versus-staffed case, the recovery path, the scenario regression and the
 * terrain regression — and pins the contract the code documents.
 *
 * Run:
 *   npx vitest run tests/waterCoverageServiceConsistencyAudit.test.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  canonicalJson,
  countWorkersAt,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  getBuildingRoadAccess,
  getEmploymentSummary,
  getFoodProductionPerTick,
  getProgression,
  getRoadNetworks,
  getServedColonistCount,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterSupplyStatus,
  getWaterStatus,
  hasOperationalWell,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  waterNeedForTick,
  waterProductionForTick,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const config = (): SimulationConfig => ({
  world: { seed: 'nova-step10ay', width: 14, height: 12 },
})

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface SceneSpec {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly {
    readonly type: BuildingType
    readonly x: number
    readonly y: number
    readonly operational?: boolean
  }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly food?: number
  readonly water?: number
}

const withBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number,
  operational: boolean
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10ay: building missing')
  }
  if (!operational) {
    return created.state
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

const withRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  const road = id === undefined ? undefined : created.state.roads[id]
  if (id === undefined || road === undefined) {
    throw new Error('10ay: road missing')
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
  let state = createInitialState(config())
  state = {
    ...state,
    resources: {
      construction: 100,
      food: spec.food ?? 100,
      water: spec.water ?? 0,
    },
  }
  for (const [x, y] of spec.residences) {
    state = withBuilding(state, 'residence', x, y, true)
  }
  for (const building of spec.buildings) {
    state = withBuilding(
      state,
      building.type,
      building.x,
      building.y,
      building.operational ?? true
    )
  }
  for (const [x, y] of spec.roads) {
    state = withRoad(state, x, y)
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

const operationalWellIds = (state: SimulationState): string[] =>
  [...iterateBuildings(state)]
    .filter((building) => building.type === 'well' && building.status === 'operational')
    .map((building) => building.id)

/** The three Water concepts plus service and admission, side by side. */
const water = (state: SimulationState) => {
  const status = getWaterStatus(state)
  const supply = getWaterSupplyStatus(state)
  const staffedWells = countStaffedOperationalWells(state)
  return {
    // capacity: what the colony CAN produce per tick (staffed + accessible)
    capacity: waterProductionForTick(state),
    staffedWells,
    operationalWells: operationalWellIds(state).length,
    foodProduction: getFoodProductionPerTick(state),
    // service: which Residences share a covered network
    servedResidences: status.servedResidenceCount,
    servedColonists: status.servedColonistCount,
    coveredNetworks: getWaterCoverage(state).coveredNetworkIds.size,
    // reserve: what is available right now
    reserve: state.resources.water,
    need: waterNeedForTick(state),
    balance: waterProductionForTick(state) - waterNeedForTick(state),
    // derived vocabulary
    supply: supply.state,
    active: hasOperationalWell(state),
    shortage: status.shortage,
    population: Object.keys(state.colonists).length,
    stage: getProgression(state).stage,
  }
}

const wellIsWorkplace = (state: SimulationState): boolean =>
  [...iterateBuildings(state)].some(
    (building) =>
      building.type === 'well' &&
      building.status === 'operational' &&
      getBuildingRoadAccess(state, building.id).hasRoadAccess
  )

// ---------------------------------------------------------------------------
// 1. Reconstruct the current contract (pipeline, step by step)
// ---------------------------------------------------------------------------

describe('1. the current contract, step by step', () => {
  /**
   * One fixture that exercises every step: a road spine, two Residences on it,
   * a Farm (always staffable) and a Well that is the FARTHEST workplace, so the
   * automatic assignment leaves it vacant while it still covers the network.
   */
  const pipelineFixture = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 0, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 3,
    })

  it('traces well -> operational -> accessible -> staffed -> capacity -> service -> reserve', () => {
    const vacantWell = pipelineFixture()
    const staffedWell = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 3,
    })
    const rows = {
      vacantWell: { ...water(vacantWell), workers: countWorkersAt(vacantWell, operationalWellIds(vacantWell)[0] ?? '') },
      staffedWell: { ...water(staffedWell), workers: countWorkersAt(staffedWell, operationalWellIds(staffedWell)[0] ?? '') },
    }
    audit('PIPELINE', rows)
    // operational + road-accessible => COVERAGE (vacant or not)
    expect(rows.vacantWell.coveredNetworks).toBe(1)
    expect(rows.vacantWell.servedResidences).toBe(2)
    expect(rows.staffedWell.coveredNetworks).toBe(1)
    expect(rows.staffedWell.servedResidences).toBe(2)
    // staffed => CAPACITY. This is the ONLY step that depends on the worker.
    expect(rows.vacantWell.operationalWells).toBe(1)
    expect(rows.vacantWell.staffedWells).toBe(0)
    expect(rows.vacantWell.workers).toBe(0)
    expect(rows.vacantWell.capacity).toBe(0)
    expect(rows.staffedWell.operationalWells).toBe(1)
    expect(rows.staffedWell.staffedWells).toBe(1)
    expect(rows.staffedWell.workers).toBe(1)
    expect(rows.staffedWell.capacity).toBe(WATER_PER_WELL_PER_TICK)
    // reserve is canonical state and never derived from either.
    expect(rows.vacantWell.reserve).toBe(3)
    expect(rows.staffedWell.reserve).toBe(3)
    expect(rows.vacantWell.population).toBe(2)
    expect(rows.staffedWell.population).toBe(2)
  })

  it('checks the three concepts cannot collapse: capacity != service != reserve', () => {
    const vacant = pipelineFixture()
    const staffed = scene({
      residences: [[0, 0]],
      buildings: [{ type: 'well', x: 0, y: 2 }],
      roads: [[0, 1]],
      colonists: 1,
      water: 5,
    })
    const rows = { vacant: water(vacant), staffed: water(staffed) }
    audit('THREE_CONCEPTS', rows)
    // service without capacity: two Residences are served, nothing is produced.
    expect(rows.vacant.servedResidences).toBe(2)
    expect(rows.vacant.capacity).toBe(0)
    expect(rows.vacant.reserve).toBe(3)
    // capacity with service and a reserve: all three differ from each other.
    expect(rows.staffed.capacity).toBe(2)
    expect(rows.staffed.servedResidences).toBe(1)
    expect(rows.staffed.reserve).toBe(5)
    expect(new Set([rows.staffed.capacity, rows.staffed.servedResidences, rows.staffed.reserve]).size).toBe(3)
  })

  it('keeps one authority per responsibility (source scan)', () => {
    const collect = (dir: string): string[] => {
      const out: string[] = []
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry).replace(/\\/g, '/')
        if (statSync(join(dir, entry)).isDirectory()) {
          out.push(...collect(path))
        } else if (path.endsWith('.ts')) {
          out.push(path)
        }
      }
      return out
    }
    const all = collect('src')
    const contents = new Map(all.map((file) => [file, readFileSync(file, 'utf8')]))
    const definitions = {
      coverage: all.filter((file) => contents.get(file)?.includes('export const getWaterCoverage') === true),
      production: all.filter((file) => contents.get(file)?.includes('export const waterProductionForTick') === true),
      gate: all.filter((file) => contents.get(file)?.includes('export const hasOperationalWell') === true),
      staffedWellCount: all.filter((file) => contents.get(file)?.includes('export const countStaffedOperationalWells') === true),
      rateConstant: all.filter((file) => contents.get(file)?.includes('WATER_PER_WELL_PER_TICK') === true),
    }
    audit('WATER_AUTHORITY', definitions)
    expect(definitions.coverage).toEqual(['src/domain/water/water.ts'])
    expect(definitions.production).toEqual(['src/domain/water/water.ts'])
    expect(definitions.gate).toEqual(['src/domain/water/water.ts'])
    expect(definitions.staffedWellCount).toEqual(['src/domain/water/water.ts'])
    // The rate constant is DEFINED once (resource.ts), COMPUTED once (water.ts)
    // and otherwise only READ as a threshold (progression.ts), a UI label
    // (main.ts) or inside documentation comments (resources.ts, phases.ts).
    expect(definitions.rateConstant.sort()).toEqual([
      'src/app/main.ts',
      'src/application/queries/progression.ts',
      'src/application/queries/resources.ts',
      'src/domain/resource/resource.ts',
      'src/domain/simulation/phases.ts',
      'src/domain/water/water.ts',
    ])
  })
})

// ---------------------------------------------------------------------------
// 2. Controlled matrix (A-E) and the vacant Well case
// ---------------------------------------------------------------------------

describe('2. controlled matrix', () => {
  /**
   * Cases A-E of the step prompt, one Well and one Residence network:
   *   A  well under construction, not accessible, not staffed
   *   A0 control: no Well at all (the pre-10P bootstrap path)
   *   B  well operational, NOT road-accessible
   *   C  well operational + accessible + VACANT (a nearer Farm holds the worker)
   *   D  well operational + accessible + staffed, reserve 0
   *   E  same as D with a reserve > 0
   */
  const caseA = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2, operational: false },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
    })
  const caseA0 = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [
        [0, 1],
        [1, 1],
      ],
      colonists: 1,
    })
  const caseB = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 6, y: 6 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
      ],
      colonists: 1,
    })
  const caseC = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 0, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 2,
    })
  const caseD = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 0,
    })
  const caseE = (): SimulationState => {
    const state = caseD()
    return { ...state, resources: { ...state.resources, water: 6 } }
  }

  it('measures capacity, service, balance, admission, Village and the Well workplace in every case', () => {
    const rows = [
      { case: 'A well under construction', state: caseA() },
      { case: 'A0 no Well at all', state: caseA0() },
      { case: 'B operational, not accessible', state: caseB() },
      { case: 'C operational, accessible, VACANT', state: caseC() },
      { case: 'D operational, accessible, staffed', state: caseD() },
      { case: 'E staffed with a reserve', state: caseE() },
    ].map(({ case: name, state }) => {
      const after = water(tick(state, 20))
      return {
        case: name,
        operational: operationalWellIds(state).length > 0,
        accessible: wellIsWorkplace(state),
        staffed: countStaffedOperationalWells(state) > 0,
        capacity: water(state).capacity,
        service: water(state).servedResidences,
        balance: water(state).balance,
        supply: water(state).supply,
        gateActive: water(state).active,
        populationAfter20: after.population,
        admissionHappened: after.population > water(state).population,
        village: after.stage === 'village',
        wellWorkplace: wellIsWorkplace(state),
        staffedAfter20: after.staffedWells > 0,
      }
    })
    audit('CONTROL_MATRIX', rows)
    const byName = (needle: string) => rows.find((row) => row.case.includes(needle))

    // A / A0: no operational Well => the gate is INACTIVE, so the historical
    // Food + housing admission applies and the colony grows (bootstrap).
    expect(byName('A well under construction')?.gateActive).toBe(false)
    expect(byName('A well under construction')?.capacity).toBe(0)
    expect(byName('A0 no Well')?.gateActive).toBe(false)
    expect(byName('A well under construction')?.populationAfter20).toBe(2)
    expect(byName('A0 no Well')?.populationAfter20).toBe(2)
    // B: operational but unreachable => gate ACTIVE, no coverage, no admission,
    // and the Well is not even a workplace.
    expect(byName('B operational')?.gateActive).toBe(true)
    expect(byName('B operational')?.service).toBe(0)
    expect(byName('B operational')?.capacity).toBe(0)
    expect(byName('B operational')?.wellWorkplace).toBe(false)
    expect(byName('B operational')?.admissionHappened).toBe(false)
    // C: accessible + VACANT => service 2, capacity 0, no admission.
    expect(byName('C operational')?.service).toBe(2)
    expect(byName('C operational')?.capacity).toBe(0)
    expect(byName('C operational')?.balance).toBe(-2)
    expect(byName('C operational')?.wellWorkplace).toBe(true)
    expect(byName('C operational')?.admissionHappened).toBe(false)
    expect(byName('C operational')?.village).toBe(false)
    // D: staffed => capacity 2, balance 0, reserve 0 => 'noReserve'.
    expect(byName('D operational')?.capacity).toBe(2)
    expect(byName('D operational')?.balance).toBe(0)
    expect(byName('D operational')?.supply).toBe('noReserve')
    // E: staffed with a reserve => 'supplied'.
    expect(byName('E staffed')?.capacity).toBe(2)
    expect(byName('E staffed')?.supply).toBe('supplied')
    // Village needs CAPACITY 2, so only the staffed cases reach it.
    expect(byName('D operational')?.village).toBe(true)
    expect(byName('E staffed')?.village).toBe(true)
    expect(byName('C operational')?.village).toBe(false)
  })

  it('separates the vacancy from the infrastructure: only the worker moves', () => {
    const vacant = caseC()
    const staffed = caseD()
    const rows = {
      vacant: water(vacant),
      staffed: water(staffed),
      sameAccessibleWell:
        wellIsWorkplace(vacant) === true && wellIsWorkplace(staffed) === true,
    }
    audit('VACANCY_ONLY', rows)
    // Identical infrastructure facts: an operational, road-accessible Well
    // covering one network with two served Residences in both states.
    expect(rows.sameAccessibleWell).toBe(true)
    expect(rows.vacant.coveredNetworks).toBe(1)
    expect(rows.staffed.coveredNetworks).toBe(1)
    expect(rows.vacant.servedResidences).toBe(2)
    expect(rows.staffed.servedResidences).toBe(2)
    // Only the worker differs.
    expect(rows.vacant.operationalWells).toBe(1)
    expect(rows.vacant.staffedWells).toBe(0)
    expect(rows.staffed.operationalWells).toBe(1)
    expect(rows.staffed.staffedWells).toBe(1)
    expect(rows.vacant.capacity).toBe(0)
    expect(rows.staffed.capacity).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 3. The critical case: does removing the worker change "served"?
// ---------------------------------------------------------------------------

describe('3. the critical case', () => {
  const fixture = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 0, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 4,
    })

  it('answers the central question: removing the worker does NOT change servicio', () => {
    const vacantWell = fixture()
    const before = water(vacantWell)
    const after = water(tick(vacantWell, 1))
    audit('CRITICAL_CASE', { before, after })
    // SERVICE (coverage) is infrastructure-based: it is unchanged by staffing.
    expect(before.servedResidences).toBe(2)
    expect(after.servedResidences).toBe(2)
    expect(before.servedColonists).toBe(2)
    expect(after.servedColonists).toBe(2)
    // CAPACITY is labour-based: 0 while the Well is vacant.
    expect(before.capacity).toBe(0)
    expect(after.capacity).toBe(0)
    expect(after.operationalWells).toBe(1)
    expect(after.staffedWells).toBe(0)
    // The colony is served AND short: the two facts are reported separately.
    expect(after.need).toBe(2)
    expect(after.supply).toBe('draining')
    expect(after.shortage).toBe(false)
  })

  it('measures the same fixture staffed vs vacant at identical stock', () => {
    const vacant = tick(fixture(), 20)
    const staffed = tick(
      scene({
        residences: [
          [0, 0],
          [1, 0],
        ],
        buildings: [
          { type: 'well', x: 2, y: 2 },
          { type: 'farm', x: 1, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        colonists: 2,
        water: 4,
      }),
      20
    )
    const rows = { vacant: water(vacant), staffed: water(staffed) }
    audit('CRITICAL_CASE_PAIR', rows)
    // Same Residences, same access, same stock: only the Well worker differs.
    expect(rows.vacant.servedResidences).toBe(rows.staffed.servedResidences)
    expect(rows.vacant.servedResidences).toBe(2)
    expect(rows.vacant.capacity).toBe(0)
    expect(rows.staffed.capacity).toBe(2)
    expect(rows.staffed.reserve).toBeGreaterThan(rows.vacant.reserve)
    expect(rows.staffed.stage).toBe('village')
    expect(rows.vacant.stage).toBe('settlement')
    expect(rows.vacant.foodProduction).toBe(4)
    expect(rows.staffed.foodProduction).toBe(2)
  })

  it('is stable at 20, 60 and 600 ticks in both shapes', () => {
    const vacant = fixture()
    const staffed = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 4,
    })
    const rows = {
      vacant: [20, 60, 600].map((ticks) => ({ ticks, ...water(tick(vacant, ticks)) })),
      staffed: [20, 60, 600].map((ticks) => ({ ticks, ...water(tick(staffed, ticks)) })),
    }
    audit('CRITICAL_CASE_LONG_RUN', rows)
    for (const row of rows.vacant) {
      expect(row.capacity).toBe(0)
      expect(row.servedResidences).toBe(2)
      expect(row.stage).toBe('settlement')
    }
    for (const row of rows.staffed) {
      expect(row.capacity).toBe(2)
      expect(row.servedResidences).toBe(2)
      expect(row.stage).toBe('village')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Intent (why coverage is not staffed-gated)
// ---------------------------------------------------------------------------

describe('4. intent: the documented bootstrap rule', () => {
  it('shows that a staffed-coverage rule would deadlock the first admission', () => {
    // Zero colonists, a Well, and housing: the ONLY possible admission moment.
    const before = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [{ type: 'well', x: 2, y: 2 }],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 0,
      food: 50,
      water: 0,
    })
    const snapshotBefore = water(before)
    const after = stepSimulation(before)
    const snapshotAfter = water(after)
    audit('BOOTSTRAP', { before: snapshotBefore, after: snapshotAfter })
    // Before the first admission: population 0 => no colonist can staff a Well
    // => capacity 0. A staffed-coverage rule would give coverage 0 as well and
    // no Residence could ever be admitted: deadlock.
    expect(snapshotBefore.population).toBe(0)
    expect(snapshotBefore.staffedWells).toBe(0)
    expect(snapshotBefore.capacity).toBe(0)
    // The implemented rule covers the Well's network from the OPERATIONAL Well,
    // so the first colonist IS admitted (bootstrap exemption) and is employed by
    // the same phase sequence on the same tick.
    expect(snapshotBefore.coveredNetworks).toBe(1)
    expect(snapshotAfter.population).toBe(1)
    expect(snapshotAfter.staffedWells).toBe(1)
    expect(snapshotAfter.capacity).toBe(2)
  })

  it('verifies the documented contract text exists in the domain source', () => {
    const source = readFileSync('src/domain/water/water.ts', 'utf8').replace(/\r\n/g, '\n')
    const rows = {
      staffedCoverageRejected: source.includes('Step 10O proposed requiring a'),
      coverageIsInfrastructure: source.includes('Coverage therefore requires an operational, road-accessible Well'),
      staffingGatesProduction: source.includes('staffing still gates Water *production*'),
      noGrowthBeyondBootstrap: source.includes('cannot\n * sustain growth beyond the first colonist'),
      productionStaffedOnly: source.includes('Vacant, roadless or\n * under-construction Wells produce exactly 0'),
    }
    audit('DOCUMENTED_INTENT', rows)
    expect(rows.staffedCoverageRejected).toBe(true)
    expect(rows.coverageIsInfrastructure).toBe(true)
    expect(rows.staffingGatesProduction).toBe(true)
    expect(rows.productionStaffedOnly).toBe(true)
  })

  it('shows the vacant Well never grants capacity through any path', () => {
    const vacant = scene({
      residences: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      buildings: [
        { type: 'farm', x: 0, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 10,
    })
    const rows = {
      capacity: getWaterProductionPerTick(vacant),
      operationalWells: operationalWellIds(vacant).length,
      staffedWells: countStaffedOperationalWells(vacant),
      served: getWaterServedResidenceCount(vacant),
      servedColonists: getServedColonistCount(vacant),
      supply: getWaterSupplyStatus(vacant).state,
      need: waterNeedForTick(vacant),
    }
    audit('NO_UNEARNED_CAPACITY', rows)
    // Service exists, capacity does not, and the derived vocabulary reports the
    // gap instead of hiding it.
    expect(rows.operationalWells).toBe(1)
    expect(rows.staffedWells).toBe(0)
    expect(rows.capacity).toBe(0)
    expect(rows.served).toBe(3)
    expect(rows.servedColonists).toBe(2)
    expect(rows.need).toBe(2)
    expect(rows.capacity).toBeLessThan(rows.need)
  })
})

// ---------------------------------------------------------------------------
// 5. Economic consequence (the four prompt cases)
// ---------------------------------------------------------------------------

describe('5. economic consequence', () => {
  it('case 1: a Residence cannot be ADMITTED on a vacant Well alone', () => {
    const state = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
      food: 100,
      water: 0,
    })
    // The single colonist staffs the Farm (lower id, equal distance), so the
    // Well is vacant while covering the network.
    const before = water(state)
    const after = water(tick(state, 60))
    audit('ADMISSION_WITH_VACANT_WELL', { before, after })
    expect(before.operationalWells).toBe(1)
    expect(before.staffedWells).toBe(0)
    expect(before.capacity).toBe(0)
    expect(before.servedResidences).toBe(2)
    // No growth: capacity 0 can never satisfy the headroom rule.
    expect(after.population).toBe(1)
    expect(after.supply).toBe('shortage')
  })

  it('case 2: a colony cannot reach Village on a vacant Well', () => {
    const state = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 0, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 4,
    })
    const settled = water(tick(state, 60))
    audit('VILLAGE_WITH_VACANT_WELL', settled)
    expect(settled.population).toBe(2)
    expect(settled.capacity).toBe(0)
    expect(settled.stage).not.toBe('village')
  })

  it('case 3: an existing population may exceed real production, and that is the shortage rule', () => {
    // 4 colonists, ONE staffed Well: capacity 2 < need 4. The population came
    // from the scenario/authoring, not from the vacant-Well coverage.
    const state = scene({
      residences: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      colonists: 4,
      food: 200,
      water: 0,
    })
    const rows = [20, 60, 600].map((ticks) => ({ ticks, ...water(tick(state, ticks)) }))
    audit('POPULATION_ABOVE_PRODUCTION', rows)
    for (const row of rows) {
      expect(row.population).toBe(4)
      expect(row.capacity).toBeLessThan(row.need)
      expect(row.supply).toBe('shortage')
      // The Village condition is capacity >= 2, NOT capacity >= population, so
      // the stage keeps reading village while the supply vocabulary reports the
      // shortage. The population came from the scenario, never from coverage.
      expect(row.stage).toBe('village')
    }
  })

  it('case 4: removing the worker IS immediately observable', () => {
    const staffed = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 4,
    })
    // A real command moves the Well's worker to a new Farm.
    const placed = stepSimulation(staffed, {
      type: 'placeBuilding',
      x: 4,
      y: 2,
      buildingType: 'farm',
    })
    const withThirdWorkplace = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 1, y: 2 },
        { type: 'farm', x: 4, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
      ],
      colonists: 2,
      water: 4,
    })
    const wellWorker = Object.keys(withThirdWorkplace.colonists)
      .sort()
      .find(
        (id) =>
          withThirdWorkplace.colonists[id]?.workplaceId ===
          operationalWellIds(withThirdWorkplace)[0]
      )
    const emptyFarm = [...iterateBuildings(withThirdWorkplace)].find(
      (building) =>
        building.type === 'farm' &&
        countWorkersAt(withThirdWorkplace, building.id) === 0
    )
    const moved =
      wellWorker === undefined || emptyFarm === undefined
        ? withThirdWorkplace
        : stepSimulation(withThirdWorkplace, {
            type: 'reassignColonist',
            colonistId: wellWorker,
            workplaceId: emptyFarm.id,
          })
    const rows = {
      before: water(withThirdWorkplace),
      after: water(moved),
      placeAccepted: placed.buildings !== staffed.buildings,
      moveAccepted:
        wellWorker !== undefined &&
        emptyFarm !== undefined &&
        moved !== withThirdWorkplace,
    }
    audit('WORKER_REMOVAL', rows)
    expect(rows.before.capacity).toBe(2)
    expect(rows.before.stage).toBe('village')
    // Removing the worker flips capacity, supply and stage on the same tick.
    expect(rows.after.capacity).toBe(0)
    expect(rows.after.supply).not.toBe('supplied')
    expect(rows.after.stage).toBe('settlement')
    // Service is unchanged: only the production side moved.
    expect(rows.after.servedResidences).toBe(2)
    expect(rows.moveAccepted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Recovery
// ---------------------------------------------------------------------------

describe('6. recovery', () => {
  const fixture = (): SimulationState =>
    scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
        { type: 'farm', x: 4, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
      ],
      colonists: 2,
      water: 4,
    })

  it('staffed -> served -> admitted -> vacated -> restored, deterministically', () => {
    const state = fixture()
    const wellId = operationalWellIds(state)[0] ?? ''
    const wellWorker = Object.keys(state.colonists)
      .sort()
      .find((id) => state.colonists[id]?.workplaceId === wellId)
    const vacantFarm = [...iterateBuildings(state)].find(
      (building) => building.type === 'farm' && countWorkersAt(state, building.id) === 0
    )
    expect(wellWorker).toBeDefined()
    expect(vacantFarm).toBeDefined()
    if (wellWorker === undefined || vacantFarm === undefined) {
      return
    }
    const staffed = water(state)
    const movedAway = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: wellWorker,
      workplaceId: vacantFarm.id,
    })
    const vacant = water(movedAway)
    const restored = water(
      stepSimulation(movedAway, {
        type: 'reassignColonist',
        colonistId: wellWorker,
        workplaceId: wellId,
      })
    )
    const rows = { staffed, vacant, restored }
    audit('RECOVERY', rows)
    expect(staffed.capacity).toBe(2)
    expect(vacant.capacity).toBe(0)
    expect(restored.capacity).toBe(2)
    // Service is identical throughout: coverage is infrastructure.
    expect(staffed.servedResidences).toBe(2)
    expect(vacant.servedResidences).toBe(2)
    expect(restored.servedResidences).toBe(2)
    // The stage follows capacity, so the player sees the regression and the fix.
    expect(staffed.stage).toBe('village')
    expect(vacant.stage).toBe('settlement')
    expect(restored.stage).toBe('village')
    // Determinism: the same command sequence rebuilds the same canonical state.
    const again = stepSimulation(
      stepSimulation(fixture(), {
        type: 'reassignColonist',
        colonistId: wellWorker,
        workplaceId: vacantFarm.id,
      }),
      { type: 'reassignColonist', colonistId: wellWorker, workplaceId: wellId }
    )
    expect(hashCanonicalState(again)).toBe(hashCanonicalState(
      stepSimulation(movedAway, {
        type: 'reassignColonist',
        colonistId: wellWorker,
        workplaceId: wellId,
      })
    ))
  })
})

// ---------------------------------------------------------------------------
// 7. Scenario regression
// ---------------------------------------------------------------------------

describe('7. scenario regression', () => {
  const names = [
    'first-settlement',
    'water-constraint',
    'population-expansion',
    'recovery',
    'water-reserve-industry',
    'terrain-chokepoint',
  ]

  it('keeps the Water contract intact across the scenarios and the terrain fixture', () => {
    const rows = names.map((id) => {
      const definition =
        SCENARIOS.find((scenario) => scenario.id === id) ??
        (id === 'terrain-chokepoint' ? TERRAIN_CHOKEPOINT_FIXTURE : undefined)
      if (definition === undefined) {
        throw new Error(`10ay: unknown scenario ${id}`)
      }
      const start = createScenarioState(config(), definition)
      const settled = water(tick(start, 40))
      const again = tick(createScenarioState(config(), definition), 40)
      return {
        scenario: id,
        start: water(start),
        after40: settled,
        deterministic: hashCanonicalState(again) === hashCanonicalState(tick(start, 40)),
        // Contract invariants that must hold in every state.
        capacityMatchesStaffedWells:
          settled.capacity === settled.staffedWells * WATER_PER_WELL_PER_TICK,
        noCapacityWithoutOperationalWell:
          settled.capacity === 0 || settled.active === true,
        servedResidencesWithinHousing:
          settled.servedResidences <=
          [...iterateBuildings(start)].filter((b) => b.type === 'residence').length,
      }
    })
    audit('SCENARIO_REGRESSION', rows)
    for (const row of rows) {
      expect(row.capacityMatchesStaffedWells).toBe(true)
      expect(row.noCapacityWithoutOperationalWell).toBe(true)
      expect(row.servedResidencesWithinHousing).toBe(true)
      expect(row.deterministic).toBe(true)
    }
    // The fixture keeps its measured shape: split, 1 of 2 served, capacity 2.
    const fixture = rows.find((row) => row.scenario === 'terrain-chokepoint')
    expect(fixture?.after40.servedResidences).toBe(1)
    expect(fixture?.after40.capacity).toBe(2)
  })

  it('keeps the supplied vocabulary consistent with the measured quantities', () => {
    const vocabulary = [
      // inactive: no operational Well at all.
      scene({
        residences: [[0, 0]],
        buildings: [],
        roads: [[0, 1]],
        colonists: 1,
        water: 5,
      }),
      // noService: an operational Well with no served colonist.
      scene({
        residences: [[0, 0]],
        buildings: [{ type: 'well', x: 4, y: 4 }],
        roads: [[0, 1]],
        colonists: 1,
        water: 5,
      }),
      // noReserve: capacity >= need, reserve 0.
      scene({
        residences: [[0, 0]],
        buildings: [{ type: 'well', x: 0, y: 2 }],
        roads: [[0, 1]],
        colonists: 1,
        water: 0,
      }),
      // supplied: capacity >= need, reserve >= need.
      scene({
        residences: [[0, 0]],
        buildings: [{ type: 'well', x: 0, y: 2 }],
        roads: [[0, 1]],
        colonists: 1,
        water: 5,
      }),
      // draining: capacity < need, reserve covers this tick.
      scene({
        residences: [
          [0, 0],
          [1, 0],
        ],
        buildings: [
          { type: 'farm', x: 0, y: 2 },
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 2, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        colonists: 2,
        water: 5,
      }),
      // shortage: capacity < need, reserve cannot cover this tick.
      scene({
        residences: [
          [0, 0],
          [1, 0],
        ],
        buildings: [
          { type: 'farm', x: 0, y: 2 },
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 2, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        colonists: 2,
        water: 1,
      }),
    ].map((state) => {
      const status = getWaterSupplyStatus(state)
      return {
        state: status.state,
        capacity: status.capacity,
        need: status.need,
        balance: status.balance,
        reserve: status.reserve,
        servedResidences: status.servedResidences,
        residences: status.residences,
        servedColonists: status.servedColonists,
        shortage: status.shortage,
      }
    })
    audit('VOCABULARY', vocabulary)
    expect(vocabulary.map((row) => row.state).sort()).toEqual([
      'draining',
      'inactive',
      'noReserve',
      'noService',
      'shortage',
      'supplied',
    ])
    for (const row of vocabulary) {
      // Every label is a function of measured quantities, never a second rule.
      expect(row.balance).toBe(row.capacity - row.need)
      if (row.state === 'inactive') {
        expect(row.capacity).toBe(0)
        expect(row.servedColonists).toBe(0)
      }
      if (row.state === 'noService') {
        expect(row.servedColonists).toBe(0)
      }
      if (row.state === 'noReserve') {
        expect(row.capacity).toBeGreaterThanOrEqual(row.need)
        expect(row.reserve).toBeLessThan(row.need)
      }
      if (row.state === 'supplied') {
        expect(row.capacity).toBeGreaterThanOrEqual(row.need)
        expect(row.reserve).toBeGreaterThanOrEqual(row.need)
      }
      if (row.state === 'draining' || row.state === 'shortage') {
        expect(row.capacity).toBeLessThan(row.need)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Terrain regression (the contract must not change with terrain)
// ---------------------------------------------------------------------------

describe('8. terrain regression', () => {
  it('gives the same Water contract with and without blocked terrain', () => {
    const build = (blockedCells: readonly string[]): SimulationState =>
      createScenarioState(
        {
          world: {
            seed: 'nova-step10ay',
            width: 14,
            height: 12,
            ...(blockedCells.length === 0 ? {} : { blockedCells }),
          },
        },
        {
          ...TERRAIN_CHOKEPOINT_FIXTURE,
          blockedCells: [...blockedCells],
        }
      )
    const open = build([])
    const ridge = build(TERRAIN_CHOKEPOINT_FIXTURE.blockedCells ?? [])
    const rows = {
      open: { ...water(tick(open, 20)), networks: getRoadNetworks(tick(open, 20)).length },
      ridge: { ...water(tick(ridge, 20)), networks: getRoadNetworks(tick(ridge, 20)).length },
    }
    audit('TERRAIN_REGRESSION', rows)
    // Terrain changes only which cells can carry a road (measured in 10AV/10AW);
    // the Water contract is IDENTICAL: capacity is still staffed Wells x 2 and
    // coverage still follows the operational Well's networks.
    expect(rows.open.capacity).toBe(rows.open.staffedWells * WATER_PER_WELL_PER_TICK)
    expect(rows.ridge.capacity).toBe(rows.ridge.staffedWells * WATER_PER_WELL_PER_TICK)
    expect(rows.open.networks).toBe(rows.ridge.networks)
    expect(rows.open.capacity).toBe(rows.ridge.capacity)
    expect(rows.open.servedResidences).toBe(rows.ridge.servedResidences)
    // No terrain-specific Water rule exists: the same constants are used.
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
  })

  it('uses the same coverage rule on each network independently', () => {
    const state = scene({
      residences: [
        [0, 0],
        [3, 0],
      ],
      buildings: [
        { type: 'well', x: 0, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: [
        [0, 1],
        [3, 1],
      ],
      colonists: 2,
      water: 5,
    })
    const rows = {
      ...water(state),
      residenceNetworks: [...iterateBuildings(state)]
        .filter((building) => building.type === 'residence')
        .map((building) => ({
          id: building.id,
          access: getBuildingRoadAccess(state, building.id).hasRoadAccess,
        })),
    }
    audit('PER_NETWORK_COVERAGE', rows)
    // A Well covers only the network it touches: the second Residence is not
    // served even though the colony produces Water.
    expect(rows.capacity).toBe(2)
    expect(rows.servedResidences).toBe(1)
    expect(rows.residenceNetworks).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 9. Persistence and architecture
// ---------------------------------------------------------------------------

describe('9. persistence and closure', () => {
  it('keeps Water derived-only: no new state, no new save field, SAVE_VERSION 7', () => {
    const state = tick(
      scene({
        residences: [
          [0, 0],
          [1, 0],
        ],
        buildings: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 2, y: 2 },
        ],
        roads: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        colonists: 2,
        water: 4,
      }),
      10
    )
    const saved = JSON.parse(serializeSave(state)) as {
      version: number
      state: Record<string, unknown>
    }
    const waterKeys = Object.keys(saved.state).filter((key) =>
      key.toLowerCase().includes('water')
    )
    const rows = {
      saveVersion: saved.version,
      topLevelKeys: Object.keys(saved.state).sort(),
      waterKeys,
      canonicalWaterKeys: Object.keys(
        saved.state['resources'] as Record<string, unknown>
      ).sort(),
      reloadEquivalent:
        hashCanonicalState(loadSave(serializeSave(state))) === hashCanonicalState(state),
      terrainFree: !canonicalJson(state).includes('blockedCells'),
    }
    audit('PERSISTENCE', rows)
    expect(rows.saveVersion).toBe(SAVE_VERSION)
    expect(rows.saveVersion).toBe(8)
    expect(rows.topLevelKeys).toEqual([
      'buildings',
      'colonists',
      'config',
      'counters',
      'resources',
      'roads',
      'storage',
      'time',
    ])
    expect(rows.waterKeys).toEqual([])
    expect(rows.canonicalWaterKeys).toEqual(['construction', 'food', 'water'])
    expect(rows.reloadEquivalent).toBe(true)
  })

  it('keeps the employment summary independent of Water (no hidden coupling)', () => {
    const state = scene({
      residences: [
        [0, 0],
        [1, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
      water: 4,
    })
    const employment = getEmploymentSummary(state)
    const rows = {
      employment,
      food: getFoodProductionPerTick(state),
      water: water(state),
    }
    audit('NO_HIDDEN_COUPLING', rows)
    // Jobs follow mobility and capacity only; Water staffing is one workplace
    // among the others and never a separate rule.
    expect(employment.employed).toBe(2)
    expect(employment.unemployed).toBe(0)
    expect(rows.water.capacity).toBe(2)
    expect(rows.food).toBe(2)
  })
})
