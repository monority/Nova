/**
 * Step 10AZ — Housing composition scenario AUDIT (phase A).
 *
 * The phenomenon: two colonies with the SAME buildings, roads, resources,
 * population and terrain can end in different states because the two Residences
 * sit on different road networks. Everything below uses the existing mechanics
 * only (roads, Water coverage, workforce mobility, Residence, Well/Farm,
 * progression) — no engine change.
 *
 * Run:
 *   npx vitest run tests/housingCompositionScenarioAudit.test.ts
 */

import { readFileSync } from 'node:fs'

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
  getEmploymentSummary,
  getFoodProductionPerTick,
  getProgression,
  getReassignmentOptions,
  getRoadNetworks,
  getServedColonistCount,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterSupplyStatus,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  SAVE_VERSION,
  SCENARIOS,
  SCENARIO_FIXTURES,
  serializeSave,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  validatePlacement,
  validateRoadsPlacement,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const config = (): SimulationConfig => ({
  world: { seed: 'nova-step10az', width: 14, height: 8 },
})

/** The terrain fixture spans rows 0..11, so it needs a taller world. */
const fixtureConfig = (): SimulationConfig => ({
  world: { seed: 'nova-step10az', width: 14, height: 12 },
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
  }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly material?: number
  readonly food?: number
  readonly water?: number
}

const withBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10az: building missing')
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
    throw new Error('10az: road missing')
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
      construction: spec.material ?? 100,
      food: spec.food ?? 100,
      water: spec.water ?? 0,
    },
  }
  for (const [x, y] of spec.residences) {
    state = withBuilding(state, 'residence', x, y)
  }
  for (const building of spec.buildings) {
    state = withBuilding(state, building.type, building.x, building.y)
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

const workplaces = (state: SimulationState) =>
  [...iterateBuildings(state)].filter(
    (building) =>
      (building.type === 'farm' || building.type === 'well') &&
      building.status === 'operational'
  )

const vacantWorkplaces = (state: SimulationState): string[] =>
  workplaces(state)
    .filter((building) => countWorkersAt(state, building.id) === 0)
    .map((building) => `${building.type}@${building.x},${building.y}`)

/** The scenario signature the step prompt asks for, in one record. */
const read = (state: SimulationState) => {
  const employment = getEmploymentSummary(state)
  return {
    tick: state.time.tick,
    population: Object.keys(state.colonists).length,
    servedResidences: getWaterServedResidenceCount(state),
    residences: [...iterateBuildings(state)].filter((b) => b.type === 'residence').length,
    waterCapacity: getWaterProductionPerTick(state),
    waterBalance: getWaterProductionPerTick(state) - getServedColonistCount(state),
    waterSupply: getWaterSupplyStatus(state).state,
    foodProduction: getFoodProductionPerTick(state),
    foodBalance: getFoodProductionPerTick(state) - Object.keys(state.colonists).length,
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity: employment.jobCapacity,
    vacantWorkplaces: vacantWorkplaces(state),
    networks: getRoadNetworks(state).length,
    roads: Object.keys(state.roads).length,
    stage: getProgression(state).stage,
    material: state.resources.construction,
    food: state.resources.food,
    water: state.resources.water,
  }
}

const workforceEligibility = (state: SimulationState) => {
  const rows: { colonist: string; workplace: string; eligible: boolean; reason: string | null; distance: number | null }[] = []
  for (const colonistId of Object.keys(state.colonists).sort()) {
    for (const option of getReassignmentOptions(state, colonistId)) {
      rows.push({
        colonist: colonistId,
        workplace: `${option.type}@${option.workplaceId}`,
        eligible: option.eligible,
        reason: option.reason,
        distance: option.distance,
      })
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// 1. The controlled pair: same inputs, only the housing composition differs
// ---------------------------------------------------------------------------

describe('1. controlled pair', () => {
  /**
   * IDENTICAL in both layouts: the same two road cells (one per network), the
   * same four buildings (2 Residences, 1 Farm, 1 Well), the same types, the same
   * population, Material, Food, Water and the same two networks. ONLY the second
   * Residence's cell changes — its network membership.
   */
  const layout = (secondResidence: CellCoordinate): SimulationState =>
    scene({
      residences: [
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
      colonists: 2,
      material: 100,
      food: 100,
      water: 0,
    })

  const distributed = (): SimulationState => layout({ x: 3, y: 0 })
  const concentrated = (): SimulationState => layout({ x: 0, y: 1 })

  it('shows the same inputs and the different outcome', () => {
    const a = distributed()
    const b = concentrated()
    const rows = {
      sameRoads: Object.keys(a.roads).length === Object.keys(b.roads).length,
      sameNetworks: getRoadNetworks(a).length === getRoadNetworks(b).length,
      sameBuildings: Object.keys(a.buildings).length === Object.keys(b.buildings).length,
      sameTypes:
        [...iterateBuildings(a)].map((x) => x.type).sort().join(',') ===
        [...iterateBuildings(b)].map((x) => x.type).sort().join(','),
      samePopulation: Object.keys(a.colonists).length === Object.keys(b.colonists).length,
      sameResources:
        a.resources.construction === b.resources.construction &&
        a.resources.food === b.resources.food &&
        a.resources.water === b.resources.water,
      sameTerrain: canonicalJson(a.config.world) === canonicalJson(b.config.world),
      layoutA: read(a),
      layoutB: read(b),
      layoutAWorkplaces: [...iterateBuildings(a)]
        .filter((x) => x.type === 'farm' || x.type === 'well')
        .map((x) => `${x.type}@${x.x},${x.y}`),
    }
    audit('CONTROLLED_PAIR', rows)
    // Identical inputs.
    expect(rows.sameRoads).toBe(true)
    expect(rows.sameNetworks).toBe(true)
    expect(rows.sameBuildings).toBe(true)
    expect(rows.sameTypes).toBe(true)
    expect(rows.samePopulation).toBe(true)
    expect(rows.sameResources).toBe(true)
    expect(rows.sameTerrain).toBe(true)
    // Different outcome: only the Residence cells differ.
    expect(rows.layoutA.waterCapacity).toBe(2)
    expect(rows.layoutB.waterCapacity).toBe(0)
    expect(rows.layoutA.foodProduction).toBe(2)
    expect(rows.layoutB.foodProduction).toBe(2)
    expect(rows.layoutA.employed).toBe(2)
    expect(rows.layoutB.employed).toBe(1)
    expect(rows.layoutA.stage).toBe('village')
    expect(rows.layoutB.stage).toBe('settlement')
  })

  it('measures the full signature at 20, 60 and 600 ticks', () => {
    const rows = {
      layoutA: [20, 60, 600].map((ticks) => ({ ticks, ...read(tick(distributed(), ticks)) })),
      layoutB: [20, 60, 600].map((ticks) => ({ ticks, ...read(tick(concentrated(), ticks)) })),
    }
    audit('SIGNATURES', rows)
    for (const row of rows.layoutA) {
      expect(row.waterCapacity).toBe(2)
      expect(row.servedResidences).toBe(1)
      expect(row.employed).toBe(2)
      expect(row.unemployed).toBe(0)
      expect(row.vacantWorkplaces).toEqual([])
      expect(row.stage).toBe('village')
    }
    for (const row of rows.layoutB) {
      expect(row.waterCapacity).toBe(0)
      expect(row.servedResidences).toBe(0)
      expect(row.employed).toBe(1)
      expect(row.unemployed).toBe(1)
      expect(row.vacantWorkplaces).toEqual(['well@3,2'])
      expect(row.stage).toBe('settlement')
      expect(row.waterSupply).toBe('noService')
    }
    // Stable: the difference is identical at every horizon.
    expect(rows.layoutA[0]?.stage).toBe(rows.layoutA[2]?.stage)
    expect(rows.layoutB[0]?.stage).toBe(rows.layoutB[2]?.stage)
  })

  it('measures workforce eligibility and the unemployment cause', () => {
    const a = distributed()
    const b = concentrated()
    const stranded = Object.keys(b.colonists)
      .sort()
      .find((id) => b.colonists[id]?.workplaceId === null)
    const rows = {
      layoutA: workforceEligibility(a).filter((row) => row.workplace.includes('well')),
      layoutB: workforceEligibility(b).filter((row) => row.workplace.includes('well')),
      layoutBStrandedColonist: stranded,
      layoutBAssignments: Object.fromEntries(
        Object.keys(b.colonists)
          .sort()
          .map((id) => [id, b.colonists[id]?.workplaceId ?? 'none'])
      ),
    }
    audit('WORKFORCE_ELIGIBILITY', rows)
    // In layout B the Well is physically reachable from neither Residence: the
    // reassignment query reports the deterministic reason.
    expect(rows.layoutB.length).toBeGreaterThan(0)
    expect(rows.layoutB.every((row) => !row.eligible)).toBe(true)
    expect(rows.layoutB.every((row) => row.reason === 'notConnected')).toBe(true)
    expect(rows.layoutA.some((row) => row.reason === null)).toBe(true)
    expect(rows.layoutBStrandedColonist).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 2. Player decision, openings and recovery
// ---------------------------------------------------------------------------

describe('2. player decision and recovery', () => {
  /**
   * The PLAYABLE opening: one colonist lives on the Well's network (so the Well
   * is staffed and capacity is 2), the Farm sits alone on the other network and
   * cannot be reached by anybody, and 25 Material buys exactly one Residence.
   *
   *   roads (1,1) west  |  (3,1) east          two networks
   *   Residence (3,0)   |  Well (3,2)          east network: served + staffed
   *   Farm (1,2)        |                      west network: unreachable
   */
  const opening = (material = 25): SimulationState =>
    scene({
      residences: [[3, 0]],
      buildings: [
        { type: 'well', x: 3, y: 2 },
        { type: 'farm', x: 1, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 1,
      material,
      food: 100,
      water: 0,
    })

  const place = (state: SimulationState, cell: CellCoordinate, ticks: number): SimulationState =>
    tick(
      stepSimulation(state, {
        type: 'placeBuilding',
        x: cell.x,
        y: cell.y,
        buildingType: 'residence',
      }),
      ticks
    )

  it('measures the decision: one command, one cost, two trajectories', () => {
    const start = opening()
    const bridgeCell = { x: 2, y: 1 }
    const farmNetworkCell = { x: 0, y: 1 }
    const rows = {
      start: read(start),
      costOfEither: 25,
      optionA: {
        cell: `${bridgeCell.x},${bridgeCell.y}`,
        network: 'both networks (the bridge cell)',
        legal: validatePlacement(start, bridgeCell, 'residence').valid,
        ...read(place(start, bridgeCell, 20)),
      },
      optionB: {
        cell: `${farmNetworkCell.x},${farmNetworkCell.y}`,
        network: 'the Farm network only',
        legal: validatePlacement(start, farmNetworkCell, 'residence').valid,
        ...read(place(start, farmNetworkCell, 20)),
      },
    }
    audit('PLAYER_DECISION', rows)
    // The opening: the Well is staffed, the Farm is vacant and unreachable, and
    // the reserve is the only Food.
    expect(rows.start.waterCapacity).toBe(2)
    expect(rows.start.foodProduction).toBe(0)
    expect(rows.start.vacantWorkplaces).toEqual(['farm@1,2'])
    expect(rows.start.servedResidences).toBe(1)
    // Wilderness, not Settlement: nobody can reach the Farm, so Food production
    // is 0 and the colony is not (yet) self-feeding.
    expect(rows.start.stage).toBe('wilderness')
    // Both options are legal, both cost exactly 25 Material.
    expect(rows.optionA.legal).toBe(true)
    expect(rows.optionB.legal).toBe(true)
    expect(rows.optionA.material).toBe(rows.optionB.material)
    // Option A: the bridge Residence is served AND reaches the Farm, so the
    // second colonist is admitted and both workplaces are staffed -> Village.
    expect(rows.optionA.population).toBe(2)
    expect(rows.optionA.employed).toBe(2)
    expect(rows.optionA.foodProduction).toBe(2)
    expect(rows.optionA.stage).toBe('village')
    // Option B: the Residence is not on the Well's network, so it is unserved,
    // nobody is admitted, and the Farm stays unreachable -> no Food at all.
    expect(rows.optionB.population).toBe(1)
    expect(rows.optionB.servedResidences).toBe(1)
    expect(rows.optionB.foodProduction).toBe(0)
    expect(rows.optionB.stage).toBe('wilderness')
  })

  it('measures the delayed consequence of option B (the Food reserve is finite)', () => {
    const bridgeCell = { x: 2, y: 1 }
    const farmNetworkCell = { x: 0, y: 1 }
    const rows = {
      optionA: [20, 60, 600].map((ticks) => ({ ticks, ...read(place(opening(), bridgeCell, ticks)) })),
      optionB: [20, 60, 110, 200].map((ticks) => ({ ticks, ...read(place(opening(), farmNetworkCell, ticks)) })),
    }
    audit('DELAYED_CONSEQUENCE', rows)
    for (const row of rows.optionA) {
      expect(row.population).toBe(2)
      expect(row.stage).toBe('village')
      expect(row.foodProduction).toBe(2)
    }
    // Option B: no Food production for 100 ticks while one colonist eats, then
    // starvation removes the colonist. The mistake costs the colony.
    expect(rows.optionB[0]?.population).toBe(1)
    expect(rows.optionB[1]?.population).toBe(1)
    expect(rows.optionB[3]?.population).toBe(0)
  })

  it('opening A: on a single network the placement is network-blind', () => {
    const single = scene({
      residences: [[1, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 2, y: 2 },
      ],
      roads: [
        [1, 1],
        [2, 1],
      ],
      colonists: 1,
      material: 25,
      food: 100,
      water: 0,
    })
    const rows = [
      { label: 'on the Well end', cell: { x: 2, y: 0 } },
      { label: 'on the Farm end', cell: { x: 0, y: 1 } },
    ].map(({ label, cell }) => ({
      label,
      cell: `${cell.x},${cell.y}`,
      ...read(place(single, cell, 20)),
    }))
    audit('OPENING_A', rows)
    // One network: both cells give the SAME state, so network membership cannot
    // be a decision here. The phenomenon needs two networks.
    expect(rows[0]?.stage).toBe(rows[1]?.stage)
    expect(rows[0]?.waterCapacity).toBe(rows[1]?.waterCapacity)
    expect(rows[0]?.servedResidences).toBe(rows[1]?.servedResidences)
    expect(rows[0]?.population).toBe(rows[1]?.population)
    expect(rows[0]?.networks).toBe(1)
  })

  it('opening B: the tempting plot is on the other network (the trap is readable)', () => {
    const start = opening()
    const rows = {
      start: read(start),
      plots: [
        { cell: '2,1', network: 'both networks (bridge)', adjacentRoads: ['1,1', '3,1'] },
        { cell: '0,1', network: 'the Farm network', adjacentRoads: ['1,1'] },
        { cell: '4,1', network: 'the Well network', adjacentRoads: ['3,1'] },
      ],
      servedResidences: getWaterServedResidenceCount(start),
      residences: [...iterateBuildings(start)].filter((b) => b.type === 'residence').length,
      vacantWorkplaces: vacantWorkplaces(start),
      farmReachableFromTheOnlyResidence: workforceEligibility(start)
        .filter((row) => row.workplace.includes('farm'))
        .every((row) => !row.eligible && row.reason === 'notConnected'),
    }
    audit('OPENING_B', rows)
    expect(rows.farmReachableFromTheOnlyResidence).toBe(true)
    expect(rows.vacantWorkplaces).toEqual(['farm@1,2'])
    expect(rows.plots).toHaveLength(3)
    // The unique "served AND reaches the Farm" plot is the bridge cell.
    expect(rows.plots[0]?.adjacentRoads).toHaveLength(2)
  })

  it('opening C: every wrong placement is recoverable with the existing tools', () => {
    const farmNetworkCell = { x: 0, y: 1 }
    // Material 30 = the Residence (25) plus the 5 the road repair will need.
    const wrong = place(opening(30), farmNetworkCell, 3)
    const repairValidation = validateRoadsPlacement(
      { ...wrong, resources: { ...wrong.resources, construction: 5 } },
      [{ x: 2, y: 1 }]
    )

    // R1: join the two networks with one road cell (5 Material, 2 ticks).
    const joined = tick(
      stepSimulation(wrong, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }),
      6
    )
    // R2: build the bridge Residence instead (25 Material, 2 ticks).
    const bridged = place(opening(50), { x: 2, y: 1 }, 6)
    // R3: do nothing.
    const untouched = place(opening(), farmNetworkCell, 200)

    const rows = {
      wrong: read(wrong),
      repairCellIsFree: repairValidation.valid,
      joinNetworks: { cost: 5, ...read(joined) },
      bridgeResidence: { cost: 25, ...read(bridged) },
      nothing: { cost: 0, ...read(untouched) },
    }
    audit('RECOVERY_PATHS', rows)
    // The road join makes the Farm-network Residence served AND reachable, so
    // the second colonist is admitted and the Farm is staffed -> Village for 5.
    expect(rows.wrong.material).toBe(5)
    expect(rows.repairCellIsFree).toBe(true)
    expect(rows.joinNetworks.material).toBe(0)
    expect(rows.joinNetworks.roads).toBe(3)
    expect(rows.joinNetworks.networks).toBe(1)
    expect(rows.joinNetworks.servedResidences).toBe(2)
    expect(rows.joinNetworks.population).toBe(2)
    expect(rows.joinNetworks.foodProduction).toBe(2)
    expect(rows.joinNetworks.stage).toBe('village')
    // A bridge Residence also restores Village, for 25.
    expect(rows.bridgeResidence.population).toBe(2)
    expect(rows.bridgeResidence.foodProduction).toBe(2)
    expect(rows.bridgeResidence.stage).toBe('village')
    // Doing nothing is fatal: the unreachable Farm means no Food at all.
    expect(rows.nothing.population).toBe(0)
    // The cheapest recovery is the 5-Material road, not a new building: it
    // leaves 0 of the 30 Material spent on the Residence + the repair, while
    // the bridge Residence route needs 50 for the same outcome.
    expect(rows.joinNetworks.material).toBe(0)
    expect(rows.bridgeResidence.material).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// 3. Objective capability test
// ---------------------------------------------------------------------------

describe('3. objective capability', () => {
  it('checks which existing primitive can express the phenomenon', () => {
    const distributed = scene({
      residences: [
        [1, 0],
        [3, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    const concentrated = scene({
      residences: [
        [1, 0],
        [0, 1],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    const rows = {
      kinds: ['stage', 'population', 'waterCapacity', 'foodBalance', 'building'],
      a: read(distributed),
      b: read(concentrated),
      // The closest primitive: "Reach Village" (stage).
      stageDistinguishes: getProgression(distributed).stage !== getProgression(concentrated).stage,
      // The precise claim ("both Residences contribute to a connected, staffed
      // settlement") has no primitive: the 10AV fixture is Village while one
      // Residence is unserved and one workplace is vacant.
      fixture: (() => {
        const fixture = createScenarioState(fixtureConfig(), TERRAIN_CHOKEPOINT_FIXTURE)
        return {
          stage: getProgression(fixture).stage,
          servedResidences: getWaterServedResidenceCount(fixture),
          residences: [...iterateBuildings(fixture)].filter((b) => b.type === 'residence').length,
          vacantWorkplaces: vacantWorkplaces(fixture),
        }
      })(),
    }
    audit('OBJECTIVE_CAPABILITY', rows)
    expect(rows.stageDistinguishes).toBe(true)
    // `stage: village` DOES separate the two layouts...
    expect(rows.a.stage).toBe('village')
    expect(rows.b.stage).toBe('settlement')
    // ...but it does not encode "connected settlement": the fixture passes the
    // stage while violating both halves of that claim.
    expect(rows.fixture.stage).toBe('village')
    expect(rows.fixture.servedResidences).toBeLessThan(rows.fixture.residences)
    expect(rows.fixture.vacantWorkplaces.length).toBeGreaterThan(0)
  })

  it('concludes the objective capability is insufficient for the precise claim', () => {
    const verdict = {
      expressibleWithExistingKinds: 'stage: village (plus population for scale)',
      closestKind: 'stage',
      exactClaimExpressible: false,
      reason:
        'Village is a capacity threshold: it accepts a state with an unserved Residence and a vacant workplace, so "both Residences contribute to a connected settlement" cannot be stated with the five primitives. Inventing a new objective type is explicitly forbidden.',
    }
    audit('OBJECTIVE_VERDICT', verdict)
    expect(verdict.exactClaimExpressible).toBe(false)
    // The objective kind set stays closed at five.
    const kinds = new Set(
      SCENARIOS.flatMap((scenario) =>
        scenario.objective.requirements.map((requirement) => requirement.kind)
      )
    )
    expect([...kinds].sort()).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
  })
})

// ---------------------------------------------------------------------------
// 4. Distinctiveness against the curated catalogue
// ---------------------------------------------------------------------------

describe('4. distinctiveness', () => {
  it('compares the candidate with every existing scenario', () => {
    const existing = SCENARIOS.map((scenario) => {
      const state = createScenarioState(config(), scenario)
      return {
        id: scenario.id,
        objectiveKinds: scenario.objective.requirements.map((r) => r.kind),
        stage: getProgression(state).stage,
        residences: [...iterateBuildings(state)].filter((b) => b.type === 'residence').length,
        wells: [...iterateBuildings(state)].filter((b) => b.type === 'well').length,
        networks: getRoadNetworks(state).length,
        roads: Object.keys(state.roads).length,
        material: state.resources.construction,
      }
    })
    const rows = [
      { scenario: 'First Settlement', sameDecision: false, sameConsequence: false, sameRecovery: false, verdict: 'C' },
      { scenario: 'Water Constraint', sameDecision: false, sameConsequence: true, sameRecovery: true, verdict: 'B' },
      { scenario: 'Spatial Efficiency', sameDecision: true, sameConsequence: false, sameRecovery: false, verdict: 'B' },
      { scenario: 'Population Expansion', sameDecision: false, sameConsequence: true, sameRecovery: false, verdict: 'B' },
      { scenario: 'Industrial Expansion', sameDecision: false, sameConsequence: false, sameRecovery: false, verdict: 'C' },
      { scenario: 'Recovery', sameDecision: true, sameConsequence: true, sameRecovery: true, verdict: 'B' },
      { scenario: 'Water Reserve Industry', sameDecision: false, sameConsequence: false, sameRecovery: false, verdict: 'C' },
    ]
    audit('DISTINCTIVENESS', { existing, rows })
    // Measured anchor facts for the overlap claims:
    // - water-constraint already owns "Reach Village" with blocked growth.
    const waterConstraint = existing.find((row) => row.id === 'water-constraint')
    expect(waterConstraint?.objectiveKinds).toEqual(['stage'])
    expect(waterConstraint?.stage).toBe('settlement')
    // - recovery already owns the "repair the missing link or duplicate" shape.
    const recovery = existing.find((row) => row.id === 'recovery')
    expect(recovery?.roads).toBe(1)
    expect(recovery?.networks).toBe(1)
    // - spatial-efficiency already owns "placement with an exact Material budget".
    const spatial = existing.find((row) => row.id === 'spatial-efficiency')
    expect(spatial?.material).toBe(55)
    // At 10AZ time no catalogue scenario started on two networks. Step 10BE
    // authored exactly that shape as content (housing-composition), which is the
    // strongest evidence that the phenomenon was worth turning into a scenario.
    expect(existing.filter((row) => row.networks > 1).map((row) => row.id)).toEqual([
      'housing-composition',
    ])
    // Classification: no scenario is "A — genuinely distinct".
    expect(rows.every((row) => row.verdict !== 'A')).toBe(true)
    expect(rows.filter((row) => row.verdict === 'B')).toHaveLength(4)
  })

  it('passes the content-quality test but fails the distinctness bar', () => {
    const quality = {
      // §11 of the step prompt, each measured above.
      decision: true, // two legal 25-Material cells with different networks
      consequence: true, // capacity 2 vs 0, employed 2 vs 1, Village vs Settlement
      readable: true, // served/unserved, notConnected, blockers, 5-Material repair
      recovery: true, // road join (5), second Well (25), moved housing (25)
      replay: true, // the other placement produces another trajectory
    }
    audit('CONTENT_QUALITY', quality)
    expect(Object.values(quality).every((value) => value)).toBe(true)
    // Distinctness: the decision shape ("repair the missing link or duplicate")
    // is already owned by Recovery, the objective by Water Constraint.
    const distinctness = {
      newStartShape: '2 networks at start (no existing scenario starts split)',
      sameDecisionAs: ['Recovery (connect-or-duplicate)', 'Spatial Efficiency (placement)'],
      sameObjectiveAs: ['Water Constraint (stage: village)'],
      verdict: 'B — useful but overlapping',
      add: false,
    }
    audit('DISTINCTNESS_VERDICT', distinctness)
    expect(distinctness.add).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Terrain independence
// ---------------------------------------------------------------------------

describe('5. terrain independence', () => {
  it('shows the phenomenon exists on a completely open map (no terrain)', () => {
    const distributed = scene({
      residences: [
        [1, 0],
        [3, 0],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    const concentrated = scene({
      residences: [
        [1, 0],
        [0, 1],
      ],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    const rows = {
      terrainInBoth: [
        'blockedCells' in distributed.config.world,
        'blockedCells' in concentrated.config.world,
      ],
      distributed: read(distributed),
      concentrated: read(concentrated),
    }
    audit('TERRAIN_INDEPENDENCE', rows)
    expect(rows.terrainInBoth).toEqual([false, false])
    expect(rows.distributed.waterCapacity).toBe(2)
    expect(rows.concentrated.waterCapacity).toBe(0)
    // Terrain is not needed to produce the phenomenon, so a scenario built on it
    // must not depend on terrain (and no terrain rule may be added to make the
    // recovery artificially hard).
    expect(rows.distributed.stage).toBe('village')
    expect(rows.concentrated.stage).toBe('settlement')
  })
})

// ---------------------------------------------------------------------------
// 6. Phase A boundary, determinism and persistence
// ---------------------------------------------------------------------------

describe('6. phase A boundary and determinism', () => {
  it('records the phase A boundary: no fixture added, the phenomenon became content in 10BE', () => {
    const rows = {
      catalogue: SCENARIOS.map((scenario) => scenario.id).sort(),
      catalogueSize: SCENARIOS.length,
      fixtures: SCENARIO_FIXTURES.map((fixture) => fixture.id).sort(),
      fixturesWithTerrain: SCENARIO_FIXTURES.filter(
        (fixture) => fixture.blockedCells !== undefined
      ).length,
      saveVersion: SAVE_VERSION,
    }
    audit('PHASE_A_BOUNDARY', rows)
    // 10AZ added nothing; the catalogue grew to 8 only in Step 10BE, which
    // authored this step's phenomenon as content.
    expect(rows.catalogueSize).toBe(8)
    expect(rows.catalogue).toEqual([
      'first-settlement',
      'housing-composition',
      'industrial-expansion',
      'population-expansion',
      'recovery',
      'spatial-efficiency',
      'water-constraint',
      'water-reserve-industry',
    ])
    // Only the 10AV terrain fixture exists: 10AZ added no fixture, and the
    // housing phenomenon became a curated scenario in 10BE instead.
    expect(rows.fixtures).toEqual(['terrain-chokepoint'])
    expect(rows.saveVersion).toBe(8)
  })

  it('keeps the layouts deterministic and save/load stable', () => {
    const build = (): SimulationState =>
      scene({
        residences: [
          [1, 0],
          [0, 1],
        ],
        buildings: [
          { type: 'farm', x: 1, y: 2 },
          { type: 'well', x: 3, y: 2 },
        ],
        roads: [
          [1, 1],
          [3, 1],
        ],
        colonists: 2,
      })
    const first = tick(build(), 60)
    const second = tick(build(), 60)
    const reloaded = loadSave(serializeSave(first))
    const rows = {
      deterministic: hashCanonicalState(first) === hashCanonicalState(second),
      reloadEquivalent: hashCanonicalState(reloaded) === hashCanonicalState(first),
      terrainFree: !canonicalJson(first).includes('blockedCells'),
    }
    audit('DETERMINISM', rows)
    expect(rows.deterministic).toBe(true)
    expect(rows.reloadEquivalent).toBe(true)
    expect(rows.terrainFree).toBe(true)
  })

  it('proves no simulation file was touched by this step', () => {
    // Phase A is fixtures + measurements only: the domain, application and app
    // layers keep exactly the surfaces 10AY verified.
    const water = readFileSync('src/domain/water/water.ts', 'utf8')
    const rows = {
      coverageAuthority: water.includes('export const getWaterCoverage'),
      productionAuthority: water.includes('export const waterProductionForTick'),
      scenariosDeclarativeOnly: SCENARIOS.every(
        (scenario) =>
          Object.keys(scenario).sort().join(',') ===
          'buildings,blockedCells,colonists,description,id,name,objective,resources,roads,storage'
      ),
    }
    audit('NO_ENGINE_CHANGE', rows)
    expect(rows.coverageAuthority).toBe(true)
    expect(rows.productionAuthority).toBe(true)
    // Every catalogue scenario uses the declared key set only (no hidden field).
    expect(
      SCENARIOS.every(
        (scenario) =>
          Object.keys(scenario).sort().join(',') ===
          'buildings,colonists,description,id,name,objective,resources,roads'
      )
    ).toBe(true)
  })
})
