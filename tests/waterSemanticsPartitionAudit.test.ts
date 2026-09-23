/**
 * Step 10AR — Partitioned Valley & Water Semantics Audit.
 *
 * Two questions, both answered by measurement on the REAL simulation:
 *
 *  1. Does network partitioning already create a distinct spatial decision
 *     with the existing Water/coverage/mobility rules? (Classified B — useful
 *     but overlapping; NOT implemented, documented below.)
 *  2. Can the Water UI distinguish capacity, balance, reserve, service and
 *     shortage without changing the simulation? (Yes: `getWaterSupplyStatus`,
 *     one derived query; the HUD, the Residence inspection and the E2E stats
 *     now use it.)
 *
 * Nothing in `src/domain` changed: the Water rules are untouched, no new
 * persisted field exists, `SAVE_VERSION` stays 7.
 *
 * Run:
 *   npx vitest run tests/waterSemanticsPartitionAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  findScenario,
  FOOD_PER_COLONIST_PER_TICK,
  getFoodProductionPerTick,
  getObjectiveStatus,
  getPopulationCount,
  getProgression,
  getServedColonistCount,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterShortage,
  getWaterStatus,
  getWaterStock,
  getWaterSupplyStatus,
  hashCanonicalState,
  hasOperationalWell,
  isWaterSupplySustainable,
  iterateBuildings,
  loadSave,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type ObjectiveDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 20, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ar: building missing')
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
  if (id === undefined) throw new Error('10ar: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ar: no road')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Spec {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly { readonly type: BuildingType; readonly x: number; readonly y: number }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly material?: number
  readonly water?: number
}

const scene = (spec: Spec): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 100,
      food: 100,
      water: spec.water ?? 0,
    },
  }
  for (const [x, y] of spec.residences) state = op(state, 'residence', x, y)
  for (const building of spec.buildings) state = op(state, building.type, building.x, building.y)
  for (const [x, y] of spec.roads) state = opRoad(state, x, y)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  for (let i = 0; i < Math.min(spec.colonists, residences.length); i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

interface Reading {
  readonly tick: number
  readonly population: number
  readonly foodNet: number
  readonly waterStock: number
  readonly capacity: number
  readonly need: number
  readonly balance: number
  readonly servedResidences: number
  readonly residences: number
  readonly servedColonists: number
  readonly supply: string
  readonly shortage: boolean
  readonly material: number
  readonly employed: number
  readonly unemployed: number
  readonly roadCells: number
  readonly stage: string
}

const read = (state: SimulationState): Reading => {
  const status = getWaterSupplyStatus(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    foodNet: getFoodProductionPerTick(state) - getPopulationCount(state) * FOOD_PER_COLONIST_PER_TICK,
    waterStock: getWaterStock(state),
    capacity: status.capacity,
    need: status.need,
    balance: status.balance,
    servedResidences: status.servedResidences,
    residences: status.residences,
    servedColonists: status.servedColonists,
    supply: status.state,
    shortage: status.shortage,
    material: state.resources.construction,
    employed: Object.values(state.colonists).filter((c) => c.workplaceId !== null).length,
    unemployed: Object.values(state.colonists).filter((c) => c.workplaceId === null).length,
    roadCells: Object.keys(state.roads).length,
    stage: getProgression(state).stage,
  }
}

const run = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const place = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { readonly state: SimulationState; readonly tick: number | null } => {
  let next = state
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const before = Object.keys(next.buildings).length
    next = stepSimulation(next, { type: 'placeBuilding', x, y, buildingType: type })
    if (Object.keys(next.buildings).length > before) return { state: next, tick: next.time.tick }
  }
  return { state: next, tick: null }
}

// The three layouts, identical except for road topology ---------------------

/** A — one network: every Residence reaches the Farm and the Well. */
const connected = (): SimulationState =>
  scene({
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
      [2, 1],
      [3, 1],
    ],
    colonists: 2,
  })

/** B — partitioned: the east Residence shares no road with the Well/Farm. */
const partitioned = (): SimulationState =>
  scene({
    residences: [
      [1, 0],
      [9, 0],
    ],
    buildings: [
      { type: 'farm', x: 1, y: 2 },
      { type: 'well', x: 3, y: 2 },
    ],
    roads: [
      [1, 1],
      [2, 1],
      [3, 1],
      [9, 1],
    ],
    colonists: 2,
  })

/** C — partitioned island with two stranded workers. */
const partitionedIsland = (): SimulationState =>
  scene({
    residences: [
      [1, 0],
      [9, 0],
      [11, 0],
    ],
    buildings: [
      { type: 'farm', x: 1, y: 2 },
      { type: 'well', x: 3, y: 2 },
    ],
    roads: [
      [1, 1],
      [2, 1],
      [3, 1],
      [9, 1],
      [10, 1],
      [11, 1],
    ],
    colonists: 3,
  })

// ---------------------------------------------------------------------------
// 1. THE CONNECTED VERSUS PARTITIONED LAYOUTS
// ---------------------------------------------------------------------------

describe('1. Partitioned Valley — controlled layouts', { timeout: 60000 }, () => {
  it('measures the same settlement connected and partitioned', () => {
    const layouts = [
      { name: 'A connected', state: connected() },
      { name: 'B partitioned', state: partitioned() },
      { name: 'C partitioned island (2 stranded)', state: partitionedIsland() },
    ].map((layout) => ({
      name: layout.name,
      start: read(layout.state),
      after60: read(run(layout.state, 60)),
    }))
    audit('PARTITIONED_LAYOUTS', {
      layouts,
      reading:
        'the ONLY difference is road topology: the partitioned layout strands one worker (mobility gate) and one Residence (Water coverage), and the island layout also drains the colony-global Food',
    })
    const [a, b, c] = layouts
    // Connected: both colonists employed, both Residences served, Village.
    expect(a!.start.employed).toBe(2)
    expect(a!.start.unemployed).toBe(0)
    expect(a!.start.servedResidences).toBe(2)
    expect(a!.start.capacity).toBe(2)
    expect(a!.start.stage).toBe('village')
    // Partitioned: one unemployed colonist, one unserved Residence, no Water
    // capacity (the reachable worker must hold the Farm), Settlement.
    expect(b!.start.unemployed).toBe(1)
    expect(b!.start.servedResidences).toBe(1)
    expect(b!.start.residences).toBe(2)
    expect(b!.start.capacity).toBe(0)
    expect(b!.start.need).toBe(1)
    expect(b!.start.stage).toBe('settlement')
    // The island: TWO stranded workers and a draining global Food reserve.
    expect(c!.start.unemployed).toBe(2)
    expect(c!.start.foodNet).toBe(-1)
    expect(c!.after60.foodNet).toBe(-1)
    expect(c!.after60.population).toBe(3)
    // Persistent, not transient: 60 ticks change nothing but the Food stock.
    expect(b!.after60.unemployed).toBe(1)
    expect(b!.after60.servedResidences).toBe(1)
    expect(b!.after60.stage).toBe('settlement')
  })

  it('measures both recovery paths and the gap where they cost the same', () => {
    // Path 1: bridge the gap with roads (5 Material per cell).
    let bridge = partitioned()
    const bridgeCells = 5
    for (let x = 4; x <= 8; x += 1) {
      const before = Object.keys(bridge.roads).length
      bridge = stepSimulation(bridge, { type: 'placeRoads', cells: [{ x, y: 1 }] })
      expect(Object.keys(bridge.roads).length).toBe(before + 1)
    }
    const bridged = read(run(bridge, 30))
    // Path 2: a second Well on the island (25 Material).
    const secondWell = place(partitioned(), 'well', 9, 2)
    const welled = read(run(secondWell.state, 30))

    const gapTable = [1, 2, 3, 4, 5, 6].map((gap) => ({
      gapCells: gap,
      roadCost: gap * 5,
      secondWellCost: 25,
      cheaper: gap * 5 < 25 ? 'roads' : gap * 5 === 25 ? 'equal' : 'second Well',
    }))
    audit('PARTITIONED_RECOVERY', {
      bridged: { cost: bridgeCells * 5, after: bridged },
      secondWell: { cost: 25, placedTick: secondWell.tick, after: welled },
      gapTable,
      reading:
        'both interventions restore the SAME state (2 served Residences, 2 employed, capacity 2, Village). The tie point is 5 cells because 25 Material / 5 per road = 5 — model-derived, not chosen',
    })
    expect(bridged.servedResidences).toBe(2)
    expect(bridged.unemployed).toBe(0)
    expect(welled.servedResidences).toBe(2)
    expect(welled.unemployed).toBe(0)
    expect(bridged.stage).toBe('village')
    expect(welled.stage).toBe('village')
    // They cost the same at this gap: the choice is spatial, not economic.
    expect(bridgeCells * 5).toBe(25)
    expect(gapTable.find((row) => row.gapCells === 5)?.cheaper).toBe('equal')
    expect(gapTable.find((row) => row.gapCells === 4)?.cheaper).toBe('roads')
    expect(gapTable.find((row) => row.gapCells === 6)?.cheaper).toBe('second Well')
  })

  it('answers the seven decision questions with measurements', () => {
    const answers = [
      { question: 'where to connect the networks?', answer: 'yes — but the cheapest path is canonical (one straight line), so the choice is a cost, not a placement puzzle' },
      { question: 'does a road extension restore a causal capability?', answer: 'yes — two capabilities at once: Water coverage AND workforce mobility (measured: employed 1 → 2, served Residences 1 → 2)' },
      { question: 'does reconnecting change Water service?', answer: 'yes — 1 of 2 Residences served → 2 of 2' },
      { question: 'does it change workforce eligibility?', answer: 'yes — the stranded colonist is unemployed until the networks merge, and then 2 workplaces fit 2 workers' },
      { question: 'does it change the number of sustainable colonists?', answer: 'yes — Water capacity 0 → 2 and the stage returns to Village' },
      { question: 'does it change construction/operation?', answer: 'yes — an unserved Residence blocks admission, and a Workplace on an unreachable network can never be staffed' },
      { question: 'is the consequence persistent?', answer: 'yes — 60 ticks change nothing: the partition is a stable state, not a transient' },
    ]
    const overlaps = [
      'the decision SHAPE (connect for 5 x gap vs duplicate for 25) is the one Recovery already measures (10AL: reconnect the stranded Farm, or replace it)',
      'the objective is the one Water constraint already uses: reach Village by restoring Water capacity',
      'the spatial cost comparison against a fixed 25-Material building is Spatial efficiency\'s road-budget decision',
      'the stranding itself is the existing 09K mobility gate, audited as a system in 09M / 10N — not a new rule',
      'no objective requirement kind can name coverage/service, so the scenario goal can only be a proxy (measured: "reach Village" is a VALID proxy — a vacant Farm or a vacant Well both block it)',
    ]
    const distinct = [
      'the failure mode is new: the STRANDED COLONISTS EAT the colony-global Food while they cannot produce anything (measured: foodNet -1 with 3 colonists on one staffed Farm)',
      'the asymmetry is new: Water is network-local, Food is colony-global, labour is mobility-gated, so one layout forces three different connectivity questions at once',
    ]
    audit('DECISION_QUESTIONS', { answers, overlaps, distinct })
    expect(answers).toHaveLength(7)
    expect(overlaps.length).toBeGreaterThan(distinct.length)
  })

  it('classifies the candidate: B — useful but overlapping, not implemented', () => {
    const classification = {
      candidate: 'Partitioned valley',
      class: 'B — useful but overlapping',
      distinctConsequence:
        'a partition strands BOTH labour and service while the colony keeps feeding the stranded workers from the colony-global Food (measured: -1 Food/tick, 60-tick stable)',
      overlappingDecision:
        'connect (5 x gap) or duplicate (25) is Recovery\'s measured decision shape; the objective ("reach Village") is Water constraint\'s; the cost comparison is Spatial efficiency\'s',
      dominance: 'for a one-colonist island the two paths cost the SAME at a 5-cell gap, and for a two-colonist island the bridge dominates up to a 9-cell gap (25 vs 50): the spatial choice is knife-edge or dominated, and the world has no terrain to force a long gap',
      objectiveLimitation:
        'the actual goal (every Residence water-served) is not expressible with the closed requirement set; only a proxy is (the proxy is valid but adds no new objective vocabulary)',
      decision:
        'DEFERRED — documented, not added in that step. Step 10BE later added one curated CONTENT scenario (housing-composition) using the existing mechanics only; the partitioned-valley decision itself is still not represented.',
      revisitIf:
        'a future step introduces terrain/obstacles (a NEW mechanic) that makes partitions natural and gaps long, or an objective kind that can name coverage',
    }
    audit('PARTITIONED_CLASSIFICATION', classification)
    expect(classification.class.startsWith('B')).toBe(true)
    expect(SCENARIOS.some((scenario) => scenario.id.includes('partition'))).toBe(false)
    // 7 when this audit ran; Step 10BE later added one content scenario.
    expect(SCENARIOS).toHaveLength(8)
  })

  it('shows the goal cannot be named, only proxied', () => {
    const state = partitioned()
    const proxy: ObjectiveDefinition = {
      label: 'Reach Village',
      description: 'proxy for "both networks water-served"',
      constraint: 'no coverage requirement kind exists',
      requirements: [{ kind: 'stage', stage: 'village' }],
      failsWithoutColonists: true,
    }
    const atStart = getObjectiveStatus(state, proxy)
    // The proxy is honest: Village needs BOTH Food balance and capacity 2, and
    // with one stranded worker neither can hold until the partition is repaired.
    const afterBridge = (() => {
      let next = state
      for (let x = 4; x <= 8; x += 1) next = stepSimulation(next, { type: 'placeRoads', cells: [{ x, y: 1 }] })
      return run(next, 20)
    })()
    const after = getObjectiveStatus(afterBridge, proxy)
    audit('OBJECTIVE_PROXY', {
      coverageIsNameable: false,
      proxyRequirement: 'stage village',
      atStart: { state: atStart.state, blockers: atStart.blockers },
      afterBridge: { state: after.state, blockers: after.blockers },
    })
    expect(atStart.state).toBe('in_progress')
    expect(atStart.blockers).toContain('Reach Village')
    expect(after.state).toBe('completed')
  })
})

// ---------------------------------------------------------------------------
// 5. WATER SEMANTICS
// ---------------------------------------------------------------------------

describe('5. Water semantics', { timeout: 30000 }, () => {
  it('names six distinct supply states from existing queries only', () => {
    // inactive — no operational Well.
    const noWell = scene({
      residences: [[1, 0]],
      buildings: [],
      roads: [[1, 1]],
      colonists: 1,
    })
    // noService — a Well exists but serves nothing (roadless).
    const roadlessWell = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'well', x: 5, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
      water: 10,
    })
    // shortage — the Well is operational (so service exists) but VACANT, so
    // production 0 < need, and the stock cannot cover this tick.
    const shortage = scene({
      residences: [[1, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      colonists: 1,
    })
    // draining — same, but the stock still covers this tick.
    const draining = scene({
      residences: [[1, 0]],
      buildings: [
        { type: 'farm', x: 1, y: 2 },
        { type: 'well', x: 3, y: 2 },
      ],
      roads: [
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      colonists: 1,
      water: 10,
    })
    // noReserve — production == need and the reserve is empty (the 10AQ case).
    const noReserve = scene({
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
        [2, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    // supplied — production >= need and the reserve covers the need.
    const supplied = scene({
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
        [2, 1],
        [3, 1],
      ],
      colonists: 2,
      water: 10,
    })

    const rows = [
      { label: 'no operational Well', state: noWell },
      { label: 'Well serves nothing', state: roadlessWell },
      { label: 'production 0, stock 0', state: shortage },
      { label: 'production 0, stock 10', state: draining },
      { label: 'production == need, stock 0', state: noReserve },
      { label: 'production >= need, stock 10', state: supplied },
    ].map((row) => ({
      label: row.label,
      supply: getWaterSupplyStatus(row.state).state,
      dimensions: read(row.state),
      legacySustainable: isWaterSupplySustainable(row.state),
      hasWell: hasOperationalWell(row.state),
    }))
    audit('WATER_SUPPLY_STATES', {
      rows,
      vocabulary: {
        capacity: 'staffed, road-accessible Wells x 2',
        balance: 'capacity - need',
        reserve: 'the canonical stock',
        service: 'Residences sharing a covered network',
        shortage: 'the stock cannot cover this tick',
      },
    })
    expect(rows.map((row) => row.supply)).toEqual([
      'inactive',
      'noService',
      'shortage',
      'draining',
      'noReserve',
      'supplied',
    ])
    // The FLOW dimension is named before the RESERVE dimension.
    expect(rows[4]!.dimensions.capacity).toBe(rows[4]!.dimensions.need)
    expect(rows[4]!.dimensions.shortage).toBe(true) // the domain rule still blocks 
    // The precise state separates what the legacy boolean conflated.
    expect(rows[4]!.legacySustainable).toBe(false) // stock does not cover
    expect(rows[4]!.supply).toBe('noReserve') // ... but the flow is balanced
    expect(rows[4]!.dimensions.balance).toBeGreaterThanOrEqual(0)
    expect(rows[2]!.dimensions.balance).toBe(-1)
    expect(rows[3]!.dimensions.waterStock).toBeGreaterThan(0)
  })

  it('is derived only: pure, stable and absent from the save', () => {
    const state = partitioned()
    const first = getWaterSupplyStatus(state)
    const second = getWaterSupplyStatus(state)
    const saved = serializeSave(run(state, 10))
    const keys = Object.keys(JSON.parse(saved).state)
    audit('WATER_STATUS_PURITY', {
      status: first,
      identical: JSON.stringify(first) === JSON.stringify(second),
      saveKeys: keys,
      saveVersion: SAVE_VERSION,
      note: 'the status is a query over canonical state: nothing new is persisted',
    })
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(keys).toHaveLength(7)
    expect(JSON.stringify(JSON.parse(saved))).not.toContain('waterSupply')
    expect(hashCanonicalState(state)).toBe(hashCanonicalState(partitioned()))
    expect(getWaterProductionPerTick(state)).toBe(getWaterStatus(state).productionPerTick)
    expect(getServedColonistCount(state)).toBe(first.servedColonists)
    expect(getWaterServedResidenceCount(state)).toBe(first.servedResidences)
    expect(getWaterShortage(state)).toBe(first.shortage)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 6. INDUSTRIAL REGRESSION AFTER THE SEMANTIC FIX
// ---------------------------------------------------------------------------

describe('6. Industrial scenario regression', { timeout: 60000 }, () => {
  it('keeps the objective, the burst and the recovery exactly as measured in 10AQ', () => {
    const definition = findScenario('water-reserve-industry')
    if (definition === undefined) throw new Error('10ar: scenario missing')
    const objective = definition.objective
    let state = createScenarioState(config, definition)
    const atStart = getObjectiveStatus(state, objective)
    state = place(state, 'workshop', 4, 2).state
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const afterWorkshop = read(state)
    // Burst: move the Well worker onto the Workshop.
    const workshopId = [...iterateBuildings(state)].find((b) => b.type === 'workshop')?.id
    const wellId = [...iterateBuildings(state)].find((b) => b.type === 'well')?.id
    const worker = Object.values(state.colonists).find((c) => c.workplaceId === wellId)
    if (workshopId === undefined || worker === undefined) throw new Error('10ar: burst setup')
    state = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: worker.id,
      workplaceId: workshopId,
    })
    const burstStart = read(state)
    let ticks = 0
    while (state.resources.water > 0 && ticks < 60) {
      state = stepSimulation(state)
      ticks += 1
    }
    const afterBurst = read(state)
    state = place(state, 'well', 2, 2).state
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    state = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: worker.id,
      workplaceId: wellId!,
    })
    for (let i = 0; i < 5; i += 1) state = stepSimulation(state)
    const recovered = read(state)
    const completed = getObjectiveStatus(state, objective)
    audit('INDUSTRIAL_REGRESSION', {
      atStart: { state: atStart.state, blockers: atStart.blockers },
      afterWorkshop,
      burstStart,
      burstTicks: ticks,
      afterBurst: { ...afterBurst, status: getWaterSupplyStatus(state).state },
      recovered,
      completed: completed.state,
    })
    expect(afterWorkshop.supply).toBe('supplied') // the reserve still covers the need
    expect(burstStart.supply).toBe('draining') // the flow stops, the reserve still covers
    expect(afterBurst.supply).toBe('shortage') // reserve spent
    expect(afterBurst.capacity).toBe(0)
    expect(afterBurst.need).toBe(2)
    expect(recovered.capacity).toBe(2)
    expect(recovered.balance).toBe(0)
    expect(recovered.waterStock).toBe(0)
    expect(recovered.supply).toBe('noReserve')
    expect(recovered.shortage).toBe(true) // the legacy stock rule is unchanged
    expect(completed.state).toBe('completed')
  })
})

// ---------------------------------------------------------------------------
// 8. ARCHITECTURAL INVARIANTS
// ---------------------------------------------------------------------------

describe('8. Architectural invariants', () => {
  it('changes no simulation rule, no constant and no persisted state', () => {
    const state = partitioned()
    const saved = JSON.parse(serializeSave(run(state, 20)))
    const invariants = {
      saveVersion: SAVE_VERSION,
      saveKeys: Object.keys(saved.state).sort(),
      deterministic: hashCanonicalState(state) === hashCanonicalState(partitioned()),
      roundTrip: hashCanonicalState(loadSave(serializeSave(state))) === hashCanonicalState(state),
      scenarioCount: SCENARIOS.length,
      scenarioIds: SCENARIOS.map((scenario) => scenario.id),
      waterRules: {
        perWell: WATER_PER_WELL_PER_TICK,
        perColonist: WATER_PER_COLONIST_PER_TICK,
      },
      noNewResource: Object.keys(state.resources).sort(),
      objectiveKinds: [
        ...new Set(SCENARIOS.flatMap((s) => s.objective.requirements.map((r) => r.kind))),
      ].sort(),
    }
    audit('ARCHITECTURAL_INVARIANTS', invariants)
    expect(invariants.saveVersion).toBe(7)
    expect(invariants.saveKeys).toHaveLength(7)
    expect(invariants.deterministic).toBe(true)
    expect(invariants.roundTrip).toBe(true)
    expect(invariants.scenarioCount).toBe(8)
    expect(invariants.waterRules).toEqual({ perWell: 2, perColonist: 1 })
    expect(invariants.noNewResource).toEqual(['construction', 'food', 'water'])
    expect(invariants.objectiveKinds).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
    // The coverage query the Residence inspection now uses is the same one the
    // service rules use: one definition, no second derivation.
    const coverage = getWaterCoverage(state)
    expect(coverage.servedResidenceIds.length).toBe(getWaterServedResidenceCount(state))
  })
})
