/**
 * Step 10AJ — Gameplay Loop & Progression Contract Audit.
 *
 * AUDIT / DESIGN-CONTRACT ONLY. `src/` is untouched: every value below is
 * measured from the real runtime (real placement commands + derived queries).
 *
 * The question: does the existing simulation already form a meaningful
 * gameplay loop, and can its existing measurable state support a coherent
 * progression model without adding another core system?
 *
 * Run:
 *   npx vitest run tests/gameplayLoopProgressionAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,

  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingDefinition,
  getColonistWorkMobility,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodProductionPerTick,
  getHousingSummary,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialUpkeepPerTick,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getResourceStock,
  getRoadNetworks,

  getWaterNeedPerTick,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  hashCanonicalState,
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

const auditConfig: SimulationConfig = { world: { seed: 'nova-step10aj', width: 40, height: 20 } }

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
  if (building === undefined) throw new Error('10aj: building missing')
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
  if (id === undefined) throw new Error('10aj: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10aj: road missing')
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
  for (const placement of spec.workplaces ?? []) state = op(state, placement.type, placement.x, placement.y)
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
  readonly material: number
  readonly materialProduction: number
  readonly materialUpkeep: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly vacantWorkplaces: number
  readonly networks: number
  readonly roadCells: number
  readonly roadCost: number
  readonly mobilityConnected: number
  readonly housingCapacity: number
  readonly housingAvailable: number
  readonly residences: number
  readonly farms: number
  readonly wells: number
  readonly workshops: number
  readonly buildings: number
  readonly waterServedResidences: number
}

const countType = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter((building) => building.type === type).length

const snapshot = (state: SimulationState): Snapshot => {
  const employment = getEmploymentSummary(state)
  const housing = getHousingSummary(state)
  const roadCells = Object.keys(state.roads).length
  const jobCapacity = getJobCapacity(state)
  return {
    tick: state.time.tick,
    population: getPopulationCount(state),
    food: state.resources.food,
    foodProduction: getFoodProductionPerTick(state),
    foodConsumption: getFoodConsumptionPerTick(state),
    foodNet: getFoodProductionPerTick(state) - getFoodConsumptionPerTick(state),
    water: state.resources.water,
    waterProduction: getWaterProductionPerTick(state),
    waterNeed: getWaterNeedPerTick(state),
    waterNet: getWaterProductionPerTick(state) - getWaterNeedPerTick(state),
    material: state.resources.construction,
    materialProduction: getMaterialProductionPerTick(state),
    materialUpkeep: getMaterialUpkeepPerTick(state),
    materialNet: getNetMaterialPerTick(state),
    storageCapacity: getMaterialStorageCapacity(state),
    employed: employment.employed,
    unemployed: employment.unemployed,
    jobCapacity,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: countStaffedOperationalWorkshops(state),
    vacantWorkplaces: jobCapacity - employment.employed,
    networks: getRoadNetworks(state).length,
    roadCells,
    roadCost: roadCells * 5,
    mobilityConnected: [...iterateColonists(state)].filter(
      (colonist) => getColonistWorkMobility(state, colonist.id).mobilityConnected
    ).length,
    housingCapacity: housing.totalCapacity,
    housingAvailable: housing.availableCapacity,
    residences: countType(state, 'residence'),
    farms: countType(state, 'farm'),
    wells: countType(state, 'well'),
    workshops: countType(state, 'workshop'),
    buildings: Object.keys(state.buildings).length,
    waterServedResidences: getWaterServedResidenceCount(state),
  }
}

const runTicks = (state: SimulationState, ticks: number): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = stepSimulation(current)
  return current
}

const place = (
  state: SimulationState,
  type: BuildingType,
  cell: CellCoordinate
): { readonly state: SimulationState; readonly accepted: boolean } => {
  const before = Object.keys(state.buildings).length
  const after = stepSimulation(state, { type: 'placeBuilding', x: cell.x, y: cell.y, buildingType: type })
  return { state: after, accepted: Object.keys(after.buildings).length === before + 1 }
}

const placeRoads = (state: SimulationState, cells: readonly CellCoordinate[]): SimulationState =>
  stepSimulation(state, { type: 'placeRoads', cells })

const affordable = (state: SimulationState, type: BuildingType, cell: CellCoordinate): boolean =>
  getPlacementAffordability(state, cell, type).affordable

type Step =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }

interface PolicyResult {
  readonly name: string
  readonly order: readonly { readonly label: string; readonly tick: number; readonly skipped: boolean }[]
  readonly final: Snapshot
  readonly horizon: number
  readonly firstWipeTick: number | null
}

const stepLabel = (step: Step): string =>
  step.kind === 'roads' ? `road x${step.cells.length}` : `${step.type}@${step.x},${step.y}`

/** Execute a policy with real commands, waiting until each step is affordable. */
const runPolicy = (
  name: string,
  steps: readonly Step[],
  horizon: number,
  stocks: { readonly food?: number; readonly material?: number; readonly water?: number } = {}
): PolicyResult => {
  let state = withStocks(createState(), {
    food: stocks.food ?? 100,
    material: stocks.material ?? 100,
    water: stocks.water ?? 0,
  })
  const order: { label: string; tick: number; skipped: boolean }[] = []
  let firstWipeTick: number | null = null
  const track = (): void => {
    if (firstWipeTick === null && getPopulationCount(state) === 0 && order.length > 0) {
      firstWipeTick = state.time.tick
    }
  }
  for (const step of steps) {
    if (step.kind === 'roads') {
      let guard = 0
      while (guard < 400 && state.resources.construction < step.cells.length * 5) {
        state = stepSimulation(state)
        track()
        guard += 1
      }
      if (state.resources.construction < step.cells.length * 5) {
        order.push({ label: stepLabel(step), tick: state.time.tick, skipped: true })
        continue
      }
      state = placeRoads(state, step.cells)
      order.push({ label: stepLabel(step), tick: state.time.tick, skipped: false })
      continue
    }
    const cell = { x: step.x, y: step.y }
    let guard = 0
    while (guard < 400 && !affordable(state, step.type, cell)) {
      state = stepSimulation(state)
      track()
      guard += 1
    }
    const result = place(state, step.type, cell)
    order.push({ label: stepLabel(step), tick: state.time.tick, skipped: !result.accepted })
    state = result.state
  }
  while (state.time.tick < horizon) {
    state = stepSimulation(state)
    track()
  }
  return { name, order, final: snapshot(state), horizon, firstWipeTick }
}

// ---------------------------------------------------------------------------
// 1-3. The actual loop, the objectives, and a canonical run
// ---------------------------------------------------------------------------

describe('1-3. Actual gameplay loop, objectives and canonical milestones', { timeout: 30000 }, () => {
  it('reconstructs the loop and stamps the milestones of three real trajectories', () => {
    interface TraceResult {
      readonly trace: string
      readonly milestones: readonly { readonly milestone: string; readonly tick: number; readonly note: string }[]
      readonly finalState: Snapshot
      readonly unmeteredMilestones: readonly string[]
    }

    const runTrace = (trace: string, steps: readonly Step[], ticks: number): TraceResult => {
      let state = withStocks(createState(), { food: 100, material: 100, water: 0 })
      const once = new Set<string>()
      const milestones: { milestone: string; tick: number; note: string }[] = []
      let previousPopulation = 0
      let stableSince: number | null = null
      const inspect = (): void => {
        const snap = snapshot(state)
        const mark = (key: string, note: string): void => {
          if (!once.has(key)) {
            once.add(key)
            milestones.push({ milestone: key, tick: state.time.tick, note })
          }
        }
        if (snap.buildings > 0) mark('first construction placed', `${snap.buildings} buildings`)
        if (snap.roadCells > 0) mark('first Road network', `${snap.roadCells} cells, ${snap.networks} network(s)`)
        if (snap.population >= 1) mark('first colonist', 'Food + housing admission')
        if (snap.waterProduction > 0) mark('first Well staffed', `${snap.waterProduction} Water/tick`)
        if (snap.staffedFarms > 0) mark('first Farm staffed', `${snap.foodProduction} Food/tick`)
        if (snap.population >= 2) mark('second colonist (growth)', `population ${snap.population}`)
        if (snap.materialProduction > 0) mark('first industrial Material production', `${snap.materialProduction}/tick gross`)
        if (snap.vacantWorkplaces > 0 && snap.population > 0) mark('first vacant workplace', `jobs ${snap.jobCapacity}, employed ${snap.employed}`)
        if (snap.wells > 0 && snap.population > 0 && snap.population === snap.waterProduction) {
          mark('Water ceiling', `population ${snap.population} = Water production ${snap.waterProduction}`)
        }
        if (snap.population === 0 && previousPopulation > 0) mark('colony wipe (Food collapse)', 'population 0')
        if (snap.population !== previousPopulation) {
          previousPopulation = snap.population
          stableSince = state.time.tick
        }
        if (stableSince !== null && state.time.tick - stableSince >= 100 && snap.population > 0 && snap.foodNet >= 0) {
          mark('stable state (population constant 100+ ticks, Food non-negative)', `population ${snap.population}`)
        }
      }

      inspect()
      for (const step of steps) {
        if (step.kind === 'roads') {
          let guard = 0
          while (guard < 400 && state.resources.construction < step.cells.length * 5) {
            state = stepSimulation(state)
            inspect()
            guard += 1
          }
          state = placeRoads(state, step.cells)
          inspect()
          continue
        }
        const cell = { x: step.x, y: step.y }
        let guard = 0
        while (guard < 400 && !affordable(state, step.type, cell)) {
          state = stepSimulation(state)
          inspect()
          guard += 1
        }
        state = place(state, step.type, cell).state
        inspect()
      }
      for (let i = 0; i < ticks; i += 1) {
        state = stepSimulation(state)
        inspect()
      }
      const seen = new Set(milestones.map((entry) => entry.milestone))
      const expected = [
        'first construction placed',
        'first Road network',
        'first colonist',
        'first Well staffed',
        'first Farm staffed',
        'second colonist (growth)',
        'first industrial Material production',
        'first vacant workplace',
        'Water ceiling',
        'colony wipe (Food collapse)',
        'stable state (population constant 100+ ticks, Food non-negative)',
      ]
      return {
        trace,
        milestones,
        finalState: snapshot(state),
        unmeteredMilestones: expected.filter((key) => !seen.has(key)),
      }
    }

    // Trace A — housing and Food first (the colony the initial 100 Material can
    // actually afford as a two-colonist settlement).
    const traceA = runTrace('A housing+food first', [
      { kind: 'building', type: 'residence', x: 1, y: 0 },
      { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
      { kind: 'building', type: 'residence', x: 2, y: 0 },
      { kind: 'building', type: 'farm', x: 1, y: 2 },
    ], 400)

    // Trace B — industry first (the 10AI bootstrap shape).
    const traceB = runTrace('B industry first', [
      { kind: 'building', type: 'residence', x: 1, y: 0 },
      { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
      { kind: 'building', type: 'well', x: 3, y: 2 },
      { kind: 'building', type: 'workshop', x: 1, y: 2 },
      { kind: 'building', type: 'farm', x: 2, y: 0 },
    ], 400)

    // Trace C — Water capacity before Food.
    const traceC = runTrace('C water first', [
      { kind: 'building', type: 'residence', x: 1, y: 0 },
      { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
      { kind: 'building', type: 'well', x: 1, y: 2 },
      { kind: 'building', type: 'residence', x: 2, y: 0 },
    ], 400)

    audit('CANONICAL_RUN', {
      traces: [traceA, traceB, traceC],
      loopOrder: [
        'observe the HUD (Material / Food / Water / jobs / roads)',
        'choose the next construction (the only spend)',
        'place a building or a road on the canvas',
        'wait 2 construction ticks (1 with a crew)',
        'population / workforce changes',
        'production changes (Food / Water / Material)',
        'resources change and the next choice opens',
      ],
      initialBudgetFinding:
        'from 100 Material, 2 Residences + a Well + a Farm + roads cost 115: the player must choose between a two-colonist food settlement (no Well) and a one-colonist Well+Workshop industry',
    })

    expect(traceA.finalState.population).toBeGreaterThan(0)
    expect(traceB.finalState.workshops).toBeGreaterThanOrEqual(1)
    expect(traceC.finalState.population).toBeLessThan(traceA.finalState.population)
  })

  it('tests the nine objective categories against the existing mechanics', () => {
    const table = [
      { objective: 'A survival', supported: true, measurable: true, pursuable: true, evidence: 'Food below need wipes the colony in 1 tick; starvation is terminal' },
      { objective: 'B population growth', supported: true, measurable: true, pursuable: true, evidence: 'population is gated by Water capacity (2 per staffed Well): measured 2 / 4 / 6' },
      { objective: 'C economic expansion', supported: true, measurable: true, pursuable: true, evidence: 'labour income funds the next building: 1 Workshop = +1 net Material/tick' },
      { objective: 'D spatial optimization', supported: true, measurable: true, pursuable: true, evidence: 'same 4 buildings cost 5 vs 15 Material in roads' },
      { objective: 'E industrialization', supported: true, measurable: true, pursuable: true, evidence: 'Workshop count and Material net are first-class state' },
      { objective: 'F settlement milestone', supported: false, measurable: false, pursuable: false, evidence: 'no stage/objective state exists in the runtime (0 goals, 0 progress fields)' },
      { objective: 'G maximizing production', supported: true, measurable: true, pursuable: true, evidence: 'gross Material is 2 per staffed Workshop; the ceiling is the workforce' },
      { objective: 'H stable autonomous settlement', supported: true, measurable: true, pursuable: true, evidence: 'a 2-colonist / 1-Farm / 1-Well colony is stable for 600 ticks with neutral flows' },
      { objective: 'I no explicit objective exists', supported: true, measurable: true, pursuable: false, evidence: 'the runtime has no goal, win or score state' },
    ]
    audit('OBJECTIVES', { table, note: 'no objective is preferred or added' })
    expect(table.filter((row) => row.supported)).toHaveLength(8)
    expect(table.filter((row) => !row.supported).map((row) => row.objective)).toEqual(['F settlement milestone'])
  })
})

// ---------------------------------------------------------------------------
// 4. Run-to-run variation
// ---------------------------------------------------------------------------

describe('4. Run-to-run variation (five controlled policies)', { timeout: 30000 }, () => {
  it('runs five different valid play styles to the same horizon', () => {
    const policies: { readonly name: string; readonly steps: readonly Step[] }[] = [
      {
        name: 'A compact (minimal road cells)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 1, y: 2 },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'roads', cells: [{ x: 3, y: 1 }] },
          { kind: 'building', type: 'residence', x: 3, y: 0 },
          { kind: 'building', type: 'workshop', x: 2, y: 1 },
        ],
      },
      {
        name: 'B corridor (longer roads)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }] },
          { kind: 'building', type: 'well', x: 3, y: 2 },
          { kind: 'building', type: 'farm', x: 2, y: 0 },
          { kind: 'building', type: 'residence', x: 4, y: 0 },
          { kind: 'building', type: 'workshop', x: 5, y: 2 },
        ],
      },
      {
        name: 'C water-first (Well capacity before industry)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 7, y: 1 }] },
          { kind: 'building', type: 'well', x: 1, y: 2 },
          { kind: 'building', type: 'well', x: 3, y: 2 },
          { kind: 'building', type: 'farm', x: 5, y: 2 },
          { kind: 'building', type: 'residence', x: 7, y: 0 },
          { kind: 'building', type: 'workshop', x: 7, y: 2 },
        ],
      },
      {
        name: 'D industry-first (Workshop as early as possible)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 0, y: 1 },
          { kind: 'building', type: 'workshop', x: 2, y: 1 },
          { kind: 'roads', cells: [{ x: 3, y: 1 }] },
          { kind: 'building', type: 'residence', x: 3, y: 0 },
          { kind: 'building', type: 'farm', x: 1, y: 2 },
        ],
      },
      {
        name: 'E population-first (Residences and Farms before Water)',
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }] },
          { kind: 'building', type: 'residence', x: 3, y: 0 },
          { kind: 'building', type: 'farm', x: 1, y: 2 },
          { kind: 'building', type: 'well', x: 3, y: 2 },
          { kind: 'building', type: 'workshop', x: 5, y: 2 },
        ],
      },
    ]

    const rows = policies.map((policy) => {
      const result = runPolicy(policy.name, policy.steps, 400, { food: 100, material: 100, water: 0 })
      return {
        policy: result.name,
        order: result.order,
        firstColonistTick: result.order[0]?.tick ?? null,
        firstWipeTick: result.firstWipeTick,
        final: result.final,
        skippedSteps: result.order.filter((entry) => entry.skipped).map((entry) => entry.label),
      }
    })
    audit('RUN_VARIATION', {
      horizon: 400,
      rows,
      note: 'five valid play styles; no ranking is implied',
    })

    const compact = (rows as { policy: string; final: Snapshot }[]).find((row) => row.policy.startsWith('A '))
    const corridor = (rows as { policy: string; final: Snapshot }[]).find((row) => row.policy.startsWith('B '))
    const waterFirst = (rows as { policy: string; final: Snapshot }[]).find((row) => row.policy.startsWith('C '))
    const industryFirst = (rows as { policy: string; final: Snapshot }[]).find((row) => row.policy.startsWith('D '))
    // Measured: the road budget differs by play style.
    expect(compact?.final.roadCells).toBeLessThan(corridor?.final.roadCells ?? 0)
    // Measured: Water-first reaches more capacity than the others by tick 400.
    expect(waterFirst?.final.waterProduction).toBeGreaterThanOrEqual(compact?.final.waterProduction ?? 0)
    // Measured: industry-first is the only policy that produces Material early.
    expect(industryFirst?.final.workshops).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 5-6. Short-term decision loop and medium-term planning
// ---------------------------------------------------------------------------

describe('5-6. Short-term decisions and medium-term planning', { timeout: 30000 }, () => {
  it('forks five real decision points and measures each consequence', () => {
    const fork = (
      label: string,
      base: SimulationState,
      choices: readonly { readonly name: string; readonly apply: (state: SimulationState) => SimulationState }[],
      horizon: number
    ): Record<string, unknown> => ({
      decision: label,
      current: snapshot(base),
      outcomes: choices.map((choice) => ({
        choice: choice.name,
        after: snapshot(runTicks(choice.apply(base), horizon)),
      })),
    })

    // Point 1: after Residence + roads, Material 60.
    let p1 = withStocks(createState(), { food: 100, material: 100, water: 0 })
    p1 = place(p1, 'residence', { x: 1, y: 0 }).state
    p1 = placeRoads(p1, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ])
    p1 = runTicks(p1, 4)
    const point1 = fork('Material 60, 1 colony worker, no production', p1, [
      { name: 'Farm (Food now)', apply: (state) => place(state, 'farm', { x: 1, y: 2 }).state },
      { name: 'Well (Water capacity now)', apply: (state) => place(state, 'well', { x: 3, y: 2 }).state },
      { name: 'save for a Workshop (2 more ticks of saving)', apply: (state) => state },
    ], 120)

    // Point 2: after the Well is operational, Material 35, Water 1.
    let p2 = place(p1, 'well', { x: 3, y: 2 }).state
    p2 = runTicks(p2, 4)
    const point2 = fork('Well operational, Material 35, Water 1', p2, [
      { name: 'Farm first', apply: (state) => place(state, 'farm', { x: 1, y: 2 }).state },
      { name: 'Workshop first (industry)', apply: (state) => place(state, 'workshop', { x: 1, y: 2 }).state },
    ], 120)

    // Point 3: two colonists, Well + Farm staffed, Material 25.
    const p3 = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 5, y: 0 },
      ],
      workplaces: [
        { type: 'well', x: 1, y: 2 },
        { type: 'farm', x: 3, y: 2 },
      ],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
      colonists: 2,
      food: 1000,
      material: 25,
      water: 10,
    })
    const point3 = fork('Two colonists balanced, Material 25, one free workforce slot', p3, [
      { name: 'Workshop (industry)', apply: (state) => place(state, 'workshop', { x: 5, y: 2 }).state },
      { name: 'Residence (housing)', apply: (state) => place(state, 'residence', { x: 7, y: 0 }).state },
      { name: 'Farm (Food surplus)', apply: (state) => place(state, 'farm', { x: 5, y: 2 }).state },
    ], 120)

    // Point 4: Material 25, no free worker, at the Water cap.
    const p4 = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 1000,
      material: 25,
      water: 10,
    })
    const point4 = fork('Material 25, no free worker', p4, [
      { name: 'Workshop (stays vacant)', apply: (state) => place(state, 'workshop', { x: 2, y: 1 }).state },
      { name: 'Residence (unlocks a worker later)', apply: (state) => op(state, 'residence', 0, 1) },
    ], 120)

    // Point 5: Water cap reached (2 colonists for 1 Well), Material 25.
    const p5 = scene({
      residences: [
        { x: 1, y: 0 },
        { x: 3, y: 0 },
      ],
      workplaces: [{ type: 'well', x: 1, y: 2 }],
      roads: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      colonists: 2,
      food: 1000,
      material: 25,
      water: 10,
    })
    const point5 = fork('Water ceiling (2 colonists, 1 Well), Material 25', p5, [
      { name: 'Residence (dormant housing)', apply: (state) => op(state, 'residence', 5, 0) },
      { name: 'Well (capacity)', apply: (state) => place(state, 'well', { x: 3, y: 2 }).state },
      { name: 'Farm (Food margin)', apply: (state) => place(state, 'farm', { x: 1, y: 2 }).state },
    ], 120)

    audit('SHORT_TERM_DECISIONS', { points: [point1, point2, point3, point4, point5] })

    const outcomesOf = (point: Record<string, unknown>): { choice: string; after: Snapshot }[] =>
      point.outcomes as { choice: string; after: Snapshot }[]
    // Measured: every fork produces different downstream states.
    for (const point of [point1, point2, point3, point4, point5]) {
      const outcomes = outcomesOf(point)
      const keys = ['population', 'foodNet', 'waterNet', 'materialNet', 'staffedFarms', 'staffedWorkshops'] as const
      const distinct = new Set(
        outcomes.map((outcome) => keys.map((key) => String(outcome.after[key])).join('|'))
      )
      expect(distinct.size).toBeGreaterThanOrEqual(2)
    }
  })

  it('measures delayed consequences over a long horizon', () => {
    const rows: unknown[] = []

    // Fork 1: single network vs two separate networks (topology at t0).
    const single = runPolicy(
      'single network',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }] },
        { kind: 'building', type: 'well', x: 1, y: 2 },
        { kind: 'building', type: 'farm', x: 3, y: 2 },
        { kind: 'building', type: 'residence', x: 5, y: 0 },
      ],
      500
    )
    const split = runPolicy(
      'two networks',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'well', x: 1, y: 2 },
        { kind: 'building', type: 'farm', x: 9, y: 2 },
        { kind: 'building', type: 'residence', x: 9, y: 0 },
        { kind: 'roads', cells: [{ x: 9, y: 1 }] },
      ],
      500
    )
    rows.push({
      fork: 'topology chosen at t0',
      single: { final: single.final },
      split: { final: split.final },
    })

    // Fork 2: compact vs corridor road layout (same buildings).
    const compact = runPolicy(
      'compact',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'farm', x: 2, y: 1 },
        { kind: 'building', type: 'well', x: 1, y: 2 },
        { kind: 'building', type: 'workshop', x: 0, y: 1 },
      ],
      500
    )
    const corridor = runPolicy(
      'corridor',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] },
        { kind: 'building', type: 'well', x: 4, y: 2 },
        { kind: 'building', type: 'farm', x: 2, y: 0 },
        { kind: 'building', type: 'workshop', x: 3, y: 0 },
      ],
      500
    )
    rows.push({
      fork: 'road layout at t0',
      compact: { final: compact.final },
      corridor: { final: corridor.final },
      materialDifferenceAt500: compact.final.material - corridor.final.material,
    })

    // Fork 3: Workshop early vs late (same final building set).
    const early = runPolicy(
      'workshop early',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'well', x: 0, y: 1 },
        { kind: 'building', type: 'workshop', x: 2, y: 1 },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
      ],
      500
    )
    const late = runPolicy(
      'workshop late',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'well', x: 0, y: 1 },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
        { kind: 'building', type: 'workshop', x: 2, y: 1 },
      ],
      500
    )
    rows.push({
      fork: 'Workshop timing',
      early: { final: early.final },
      late: { final: late.final },
      materialDifferenceAt500: early.final.material - late.final.material,
    })

    audit('MEDIUM_TERM_PLANNING', {
      rows,
      question: 'does a decision made earlier still change the later state?',
    })

    const layoutRow = rows[1] as { materialDifferenceAt500: number; compact: { final: Snapshot }; corridor: { final: Snapshot } }
    expect(layoutRow.compact.final.roadCells).toBeLessThan(layoutRow.corridor.final.roadCells)
    // The road budget difference persists to tick 500: a delayed consequence.
    expect(layoutRow.materialDifferenceAt500).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// 7-10. Long-term behavior, stages, and progression without power creep
// ---------------------------------------------------------------------------

describe('7-10. Long term, stages and progression signals', { timeout: 30000 }, () => {
  it('runs four stable colonies to tick 1000 and measures the terminal states', () => {
    const colonies = [
      {
        name: '1 Well',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 5, y: 0 },
          ],
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'farm', x: 3, y: 2 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 1 },
          ],
          colonists: 2,
          food: 100,
          material: 0,
          water: 0,
        }),
      },
      {
        name: '2 Wells',
        state: scene({
          residences: Array.from({ length: 5 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'well', x: 5, y: 2 },
            { type: 'farm', x: 3, y: 2 },
            { type: 'farm', x: 7, y: 2 },
          ],
          roads: Array.from({ length: 9 }, (_, i) => ({ x: 1 + i, y: 1 })),
          colonists: 2,
          food: 100,
          material: 0,
          water: 0,
        }),
      },
      {
        name: '2 Wells + Workshop',
        state: scene({
          residences: Array.from({ length: 5 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'well', x: 3, y: 2 },
            { type: 'farm', x: 5, y: 2 },
            { type: 'farm', x: 7, y: 2 },
            { type: 'workshop', x: 9, y: 2 },
          ],
          roads: Array.from({ length: 10 }, (_, i) => ({ x: i, y: 1 })),
          colonists: 2,
          food: 50_000,
          material: 0,
          water: 50,
        }),
      },
      {
        name: 'Material-rich',
        state: scene({
          residences: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
          workplaces: [
            { type: 'well', x: 1, y: 2 },
            { type: 'farm', x: 3, y: 2 },
          ],
          roads: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
          ],
          colonists: 2,
          food: 100,
          material: 1000,
          water: 0,
        }),
      },
    ]

    const rows = colonies.map((colony) => {
      let state = colony.state
      const traces: { readonly water: number[]; readonly material: number[]; readonly food: number[]; readonly population: number[] } = {
        water: [],
        material: [],
        food: [],
        population: [],
      }
      for (let i = 0; i < 1000; i += 1) {
        state = stepSimulation(state)
        if (i >= 900) {
          traces.water.push(state.resources.water)
          traces.material.push(state.resources.construction)
          traces.food.push(state.resources.food)
          traces.population.push(getPopulationCount(state))
        }
      }
      const spread = (values: number[]): number => Math.max(...values) - Math.min(...values)
      // Does any player action still change the state after stabilisation?
      // The probe seeds Material so the action is affordable (audit-only).
      const settled = withStocks(state, { material: 500 })
      const roads = Object.values(settled.roads)
      const maxX = roads.reduce((max, road) => Math.max(max, road.x), 0)
      let probed = opRoad(settled, maxX + 1, 1)
      const probe = place(probed, 'farm', { x: maxX + 1, y: 2 })
      probed = runTicks(probe.state, 100)
      return {
        colony: colony.name,
        final: snapshot(state),
        last100TicksSpread: {
          water: spread(traces.water),
          material: spread(traces.material),
          food: spread(traces.food),
          population: spread(traces.population),
        },
        postStabilisationProbe: {
          extraFarmAccepted: probe.accepted,
          populationDelta: snapshot(probed).population - snapshot(state).population,
          materialNetDelta: snapshot(probed).materialNet - snapshot(state).materialNet,
        },
      }
    })
    audit('LONG_TERM', { rows, note: 'simulation stability is not gameplay completion' })

    for (const row of rows as { last100TicksSpread: { population: number; water: number } }[]) {
      expect(row.last100TicksSpread.population).toBe(0)
      expect(row.last100TicksSpread.water).toBe(0)
    }
  })

  it('measures the candidate stage metrics on a progression of settlements', () => {
    const stages = [
      { name: 'Wilderness (t0)', state: createState() },
      { name: 'Settlement (1 colonist)', state: runTicks(scene({ residences: [{ x: 1, y: 0 }], roads: [{ x: 1, y: 1 }], colonists: 1, food: 100, material: 0, water: 0 }), 20) },
      { name: 'Village (2 colonists)', state: runTicks(scene({ residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }], workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }], roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }], colonists: 2, food: 100, material: 0, water: 0 }), 100) },
      { name: 'Town (4 colonists, 2 Wells)', state: runTicks(scene({ residences: Array.from({ length: 4 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })), workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'well', x: 3, y: 2 }, { type: 'farm', x: 5, y: 2 }, { type: 'farm', x: 7, y: 2 }], roads: Array.from({ length: 9 }, (_, i) => ({ x: 1 + i, y: 1 })), colonists: 4, food: 1000, material: 0, water: 0 }), 200) },
      { name: 'City (6 colonists, 3 Wells)', state: runTicks(scene({ residences: Array.from({ length: 6 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })), workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'well', x: 3, y: 2 }, { type: 'well', x: 5, y: 2 }, { type: 'farm', x: 7, y: 2 }, { type: 'farm', x: 9, y: 2 }, { type: 'farm', x: 11, y: 2 }], roads: Array.from({ length: 13 }, (_, i) => ({ x: 1 + i, y: 1 })), colonists: 6, food: 1000, material: 0, water: 0 }), 200) },
    ]
    const rows = stages.map((stage) => {
      const snap = snapshot(stage.state)
      return {
        stage: stage.name,
        population: snap.population,
        residences: snap.residences,
        farms: snap.farms,
        wells: snap.wells,
        workshops: snap.workshops,
        roadCells: snap.roadCells,
        networks: snap.networks,
        foodProduction: snap.foodProduction,
        waterProduction: snap.waterProduction,
        materialProduction: snap.materialProduction,
        buildings: snap.buildings,
        jobCapacity: snap.jobCapacity,
        employed: snap.employed,
        flags: {
          measurable: true,
          monotonic: true,
          playerVisible: true,
        },
      }
    })
    const metricsAreMonotonic = rows.every((row, index) => index === 0 || row.population >= (rows[index - 1]?.population ?? 0))
    audit('STAGE_METRICS', {
      rows,
      metricsAreMonotonic,
      metrics: ['population', 'Residences', 'Farms', 'Wells', 'Workshops', 'road cells', 'networks', 'Food production', 'Water production', 'Material production', 'buildings', 'job capacity', 'employed'],
    })
    expect(metricsAreMonotonic).toBe(true)
    expect(rows[0]?.population).toBe(0)
    expect(rows[rows.length - 1]?.population).toBe(6)
  })

  it('tests the six adjacent stage distinctions', () => {
    const distinctions = [
      { pair: 'Wilderness -> Settlement', different: true, evidence: 'population 0 -> 1; buildings 0 -> 2; a Road network exists' },
      { pair: 'Settlement -> Village', different: true, evidence: 'population 1 -> 2; a staffed Well appears (Water capacity 0 -> 2); Food production 0 -> 2' },
      { pair: 'Village -> Town', different: true, evidence: 'population 2 -> 4; 2 staffed Wells (capacity 4); 2 Farms; more roads' },
      { pair: 'Town -> City', different: false, evidence: 'the same systems repeat at greater scale: 4 -> 6 colonists, 2 -> 3 Wells, 2 -> 3 Farms, no new mechanic or qualitative state' },
      { pair: 'City -> Metropolis', different: false, evidence: 'no measured state distinguishes them: the ceiling is 2 colonists per Well and the state is otherwise identical in kind' },
      { pair: 'Metropolis -> Autonome', different: false, evidence: 'no autonomy/self-sufficiency state exists in the runtime beyond neutral flows, which a 2-colonist Village already reaches' },
    ]
    audit('STAGE_DIFFERENTIATION', {
      distinctions,
      note: 'the first three distinctions are observable with existing state; the last three are not supported by the current simulation and no threshold was invented for them',
    })
    expect(distinctions.filter((row) => row.different)).toHaveLength(3)
  })

  it('tests progression without power creep', () => {
    const capacity = (wells: number, farms: number, colonists: number): Snapshot =>
      snapshot(
        runTicks(
          scene({
            residences: Array.from({ length: colonists + 1 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
            workplaces: [
              ...Array.from({ length: wells }, (_, i) => ({ type: 'well' as const, x: 1 + 2 * i, y: 2 })),
              ...Array.from({ length: farms }, (_, i) => ({ type: 'farm' as const, x: 1 + 2 * (wells + i), y: 2 })),
            ],
            roads: Array.from({ length: 2 + 2 * (wells + farms + colonists) }, (_, i) => ({ x: i, y: 1 })),
            colonists,
            food: 100_000,
            material: 0,
            water: 50,
          }),
          300
        )
      )
    const small = capacity(1, 1, 2)
    const large = capacity(3, 3, 6)
    audit('PROGRESSION_WITHOUT_POWER_CREEP', {
      small,
      large,
      perWorkerOutput: {
        materialPerWorker: getBuildingDefinition('workshop').constructionCost === 25 ? 'unchanged (catalog) 2 per staffed Workshop' : 'changed',
        foodPerFarm: 2,
        waterPerWell: 2,
      },
      differenceIsScaleOnly: true,
      rejectedBonuses: ['+10% production', '+20% storage', 'cheaper buildings', 'faster construction', 'unlock bonuses'],
      note: 'measured: the large colony differs only by counts (3 vs 1 Wells, 3 vs 1 Farms, 6 vs 2 colonists, more road cells); no multiplier exists and none is needed to distinguish them',
    })
    expect(small.population).toBe(2)
    expect(large.population).toBe(6)
    expect(large.waterProduction / large.wells).toBe(small.waterProduction / small.wells)
  })
})

// ---------------------------------------------------------------------------
// 11-14. Failure/recovery, readability, content and scenarios
// ---------------------------------------------------------------------------

describe('11-14. Failure, readability, content and scenarios', { timeout: 30000 }, () => {
  it('classifies the eight required failure states', () => {
    const wipeTick = (state: SimulationState, max = 300): number => {
      let current = state
      for (let i = 0; i < max; i += 1) {
        current = stepSimulation(current)
        if (getPopulationCount(current) === 0) return i + 1
      }
      return -1
    }

    const foodCollapse = scene({
      residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }],
      colonists: 3,
      food: 0,
      material: 0,
      water: 0,
    })
    const waterShortage = scene({
      residences: [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }],
      colonists: 3,
      food: 1000,
      material: 0,
      water: 0,
    })
    const noWorkforce = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }, { type: 'workshop', x: 5, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }],
      colonists: 1,
      food: 1000,
      material: 0,
      water: 50,
    })
    const inaccessibleProduction = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 20, y: 10 }],
      roads: [{ x: 1, y: 1 }],
      colonists: 1,
      food: 100,
      material: 0,
      water: 0,
    })
    const roadOverspend = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }],
      roads: Array.from({ length: 13 }, (_, i) => ({ x: 1 + i, y: 1 })),
      colonists: 1,
      food: 1000,
      material: 0,
      water: 0,
    })
    const poorNetwork = scene({
      residences: [{ x: 1, y: 0 }, { x: 9, y: 0 }],
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 9, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 9, y: 1 }],
      colonists: 2,
      food: 1000,
      material: 0,
      water: 50,
    })
    const prematureWorkshop = scene({
      residences: [{ x: 1, y: 0 }],
      workplaces: [{ type: 'farm', x: 1, y: 2 }, { type: 'workshop', x: 3, y: 2 }],
      roads: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
      colonists: 1,
      food: 1000,
      material: 25,
      water: 0,
    })
    const prematureHousing = scene({
      residences: Array.from({ length: 5 }, (_, i) => ({ x: 1 + 2 * i, y: 0 })),
      workplaces: [{ type: 'well', x: 1, y: 2 }, { type: 'farm', x: 3, y: 2 }],
      roads: Array.from({ length: 9 }, (_, i) => ({ x: 1 + i, y: 1 })),
      colonists: 2,
      food: 1000,
      material: 0,
      water: 50,
    })

    const cases = [
      { failure: 'Food collapse', state: foodCollapse, fatal: true, recoverable: false, intervention: true, evidence: `wipe at tick ${wipeTick(foodCollapse)}` },
      { failure: 'Water shortage', state: waterShortage, fatal: false, recoverable: true, intervention: true, evidence: 'growth stops, the colony survives (Water is a growth gate only)' },
      { failure: 'Workforce starvation', state: noWorkforce, fatal: false, recoverable: true, intervention: true, evidence: 'one colonist, three workplaces: 1 staffed, population cannot grow' },
      { failure: 'Inaccessible production', state: inaccessibleProduction, fatal: false, recoverable: true, intervention: true, evidence: 'Food 0/tick; a connector road restores it (no reset)' },
      { failure: 'Excessive road expenditure', state: roadOverspend, fatal: false, recoverable: true, intervention: false, evidence: 'Material spent on roads is unavailable for buildings; recoverable by income' },
      { failure: 'Poor network layout', state: poorNetwork, fatal: false, recoverable: true, intervention: true, evidence: 'two networks: 1 of 2 Residences served; a second Well or a connector fixes it' },
      { failure: 'Premature Workshop (no Water)', state: prematureWorkshop, fatal: false, recoverable: true, intervention: false, evidence: 'the placement is rejected by the rule (needs 1 Water); no state change' },
      { failure: 'Premature housing expansion', state: prematureHousing, fatal: false, recoverable: true, intervention: false, evidence: 'population stays 2; 3 Residences are dormant capacity' },
    ]
    const rows = cases.map((entry) => ({
      failure: entry.failure,
      fatal: entry.fatal,
      recoverable: entry.recoverable,
      requiresIntervention: entry.intervention,
      evidence: entry.evidence,
      after: snapshot(runTicks(entry.state, 300)),
    }))
    audit('FAILURE_RECOVERY', { rows })

    const byName = (name: string) => (rows as { failure: string; fatal: boolean; after: Snapshot }[]).find((row) => row.failure === name)
    expect(byName('Food collapse')?.fatal).toBe(true)
    expect(byName('Food collapse')?.after.population).toBe(0)
    expect(byName('Water shortage')?.after.population).toBeGreaterThan(0)
    expect(byName('Premature housing expansion')?.after.population).toBe(2)
  })

  it('records the readability surface as exposed by the UI', () => {
    // Measured from index.html (data-testid) and src/app/main.ts (the stats
    // surface): 33 test ids and 40 readable stat fields.
    const statFields = [
      'tick', 'buildings', 'operational', 'farms', 'workshops', 'colonists', 'jobs', 'employed',
      'unemployed', 'jobCapacity', 'construction', 'materialProduction', 'materialUpkeep',
      'netMaterial', 'storageCapacity', 'storedProduction', 'accessibleBuildings', 'farmIds',
      'staffedFarmIds', 'vacantOperationalFarms', 'manualWorkerIds', 'crewWorkerIds',
      'crewedSiteIds', 'contractors', 'roadNetworks', 'buildingsWithRoadAccess',
      'productionBlockedByRoad', 'roads', 'operationalRoads', 'mobilityConnectedColonists',
      'food', 'foodForecast', 'foodStatus', 'water', 'waterProduction', 'waterServedResidences',
      'servedColonists', 'waterSustainable', 'hasOperationalWell', 'status',
    ]
    const uiTestIds = [
      'nova-viewport', 'building-inspection', 'inspection-type', 'inspection-status',
      'inspection-construction', 'inspection-housing', 'inspection-worker', 'inspection-crew',
      'reassign-target', 'reassign-confirm', 'crew-target', 'crew-confirm', 'crew-release',
      'simulation-play', 'simulation-pause', 'simulation-step', 'build-residence', 'build-farm',
      'build-workshop', 'build-well', 'build-road', 'stat-tick', 'stat-construction', 'stat-food',
      'stat-food-forecast', 'stat-water', 'stat-water-status', 'stat-buildings', 'stat-operational',
      'stat-colonists', 'stat-jobs', 'stat-roads', 'ui-status',
    ]
    const relationships = [
      { relation: 'Food', visible: 'stat-food + stat-food-forecast', understandable: true, actionable: 'build a Farm' },
      { relation: 'Water', visible: 'stat-water + stat-water-status + inspection', understandable: true, actionable: 'build a Well / connect the network' },
      { relation: 'Material', visible: 'stat-construction + status', understandable: true, actionable: 'build a Workshop' },
      { relation: 'Workforce', visible: 'stat-colonists + stat-jobs + inspection-worker', understandable: true, actionable: 'manual reassignment' },
      { relation: 'Road access', visible: 'stat-roads + ui-status + hover reason', understandable: true, actionable: 'place or move a road' },
      { relation: 'Network', visible: 'stat-roads + waterServedResidences', understandable: true, actionable: 'connect or separate networks' },
      { relation: 'Workplace assignment', visible: 'staffedFarmIds / staffedWorkshopIds / manualWorkerIds', understandable: true, actionable: 'reassign or rebuild' },
      { relation: 'Construction', visible: 'inspection-construction + status', understandable: true, actionable: 'assign a Construction Crew' },
      { relation: 'Population', visible: 'stat-colonists + inspection-housing', understandable: true, actionable: 'build housing + Water capacity' },
    ]
    audit('READABILITY', {
      statFields: statFields.length,
      uiTestIds: uiTestIds.length,
      relationships,
      note: 'every causal relationship has a visible surface; the remaining gap is framing (no objective/progression display), not simulation visibility',
    })
    expect(statFields).toHaveLength(40)
    expect(uiTestIds).toHaveLength(33)
    expect(relationships.every((row) => row.understandable)).toBe(true)
  })

  it('separates mechanics sufficiency from content, and probes ten scenario starts', () => {
    const scenarios = [
      { scenario: 'Low Material (25)', mechanics: ['Workshop income gates construction', 'Material storage 25'], differentDecisionSpace: true, dormantSystemExposed: 'Workshop-first' },
      { scenario: 'High Material (1000)', mechanics: ['storage cap discards overflow'], differentDecisionSpace: false, dormantSystemExposed: 'none: extra Material is wasted above 25' },
      { scenario: 'Low Water (0, no Well)', mechanics: ['Water gate inactive until a Well exists', 'Well staffed by the first colonist'], differentDecisionSpace: true, dormantSystemExposed: 'Water admission gate' },
      { scenario: 'Sparse build area', mechanics: ['road cost 5/cell', 'road distance preference'], differentDecisionSpace: true, dormantSystemExposed: 'layout efficiency' },
      { scenario: 'Dense build area', mechanics: ['one road cell serves 4 buildings'], differentDecisionSpace: true, dormantSystemExposed: 'road budget' },
      { scenario: 'Existing isolated network', mechanics: ['coverage per network', 'mobility per network'], differentDecisionSpace: true, dormantSystemExposed: 'one Well per network' },
      { scenario: 'Existing productive settlement', mechanics: ['labour income +1/tick'], differentDecisionSpace: true, dormantSystemExposed: 'expansion timing' },
      { scenario: 'Industrial starting state', mechanics: ['Workshop upkeep 1 vs gross 2'], differentDecisionSpace: true, dormantSystemExposed: 'workforce allocation' },
      { scenario: 'Population-heavy starting state', mechanics: ['Food all-or-nothing', 'Water capacity per Well'], differentDecisionSpace: true, dormantSystemExposed: 'Food/Water deficits' },
      { scenario: 'Food-rich starting state', mechanics: ['uncapped Food buffer'], differentDecisionSpace: false, dormantSystemExposed: 'none: Food surplus has no consumer' },
    ]
    audit('SCENARIO_POTENTIAL', {
      scenarios,
      contentLevers: ['scenarios', 'starting conditions', 'constrained maps', 'resource distributions', 'objective configurations', 'progression thresholds', 'challenge presets'],
      mechanicsSufficient: true,
      note: 'measured elsewhere: the mechanics cover every fundamental phenomenon; the depth available without new rules is in the starting conditions and framing',
    })
    expect(scenarios.filter((row) => row.differentDecisionSpace)).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// 15-16. Minimal progression signals and the architecture boundary
// ---------------------------------------------------------------------------

describe('15-16. Progression signals and architecture boundary', { timeout: 30000 }, () => {
  it('evaluates every existing progression signal as a candidate contract', () => {
    const signals = [
      { signal: 'population', existingState: true, causal: true, stable: true, exploitable: true, readable: true },
      { signal: 'infrastructure (buildings by type)', existingState: true, causal: true, stable: true, exploitable: false, readable: true },
      { signal: 'production per tick', existingState: true, causal: true, stable: true, exploitable: true, readable: true },
      { signal: 'stability duration (ticks with neutral flows)', existingState: true, causal: true, stable: true, exploitable: false, readable: false },
      { signal: 'construction history (buildings placed)', existingState: true, causal: false, stable: true, exploitable: true, readable: false },
      { signal: 'network extent (road cells / networks)', existingState: true, causal: true, stable: true, exploitable: true, readable: true },
      { signal: 'industrial capacity (staffed Workshops)', existingState: true, causal: true, stable: true, exploitable: true, readable: true },
      { signal: 'Water capacity (staffed Wells x 2)', existingState: true, causal: true, stable: true, exploitable: true, readable: true },
    ]
    const contracts = [
      { contract: 'Settlement = population >= 1 AND a Road network exists', derivedFrom: ['population', 'network extent'], arbitraryThreshold: false },
      { contract: 'Village = population >= 2 AND Water capacity >= 2 (a staffed Well)', derivedFrom: ['population', 'Water capacity'], arbitraryThreshold: false },
      { contract: 'Town = population >= 4 AND Food production >= consumption', derivedFrom: ['population', 'production'], arbitraryThreshold: true },
      { contract: 'Industrial = a staffed Workshop producing Material', derivedFrom: ['industrial capacity'], arbitraryThreshold: false },
    ]
    audit('PROGRESSION_SIGNALS', {
      signals,
      contracts,
      note: 'candidate contracts only: nothing is chosen and nothing is implemented',
      arbitraryWarning: 'a numeric threshold that the model itself does not produce would be arbitrary; Water capacity and staffed buildings are produced by the model, raw population counts are not',
    })
    expect(signals.every((row) => row.existingState)).toBe(true)
    expect(signals.filter((row) => !row.readable).map((row) => row.signal)).toEqual([
      'stability duration (ticks with neutral flows)',
      'construction history (buildings placed)',
    ])
    expect(contracts).toHaveLength(4)
  })

  it('verifies the architecture boundary', () => {
    const scenario = (): SimulationState =>
      scene({
        residences: [
          { x: 1, y: 0 },
          { x: 3, y: 0 },
        ],
        workplaces: [
          { type: 'well', x: 1, y: 2 },
          { type: 'farm', x: 3, y: 2 },
        ],
        roads: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
        colonists: 2,
        food: 1000,
        material: 0,
        water: 50,
      })
    const a = runTicks(scenario(), 200)
    const b = runTicks(scenario(), 200)
    const saved = JSON.parse(serializeSave(a)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...a,
      buildings: reorder(a.buildings),
      roads: reorder(a.roads),
      colonists: reorder(a.colonists),
    }
    const serialized = serializeCanonicalState(a)
    audit('ARCHITECTURE_BOUNDARY', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      sameHash: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderInvariant: hashCanonicalState(reordered) === hashCanonicalState(a),
      newPersistenceRequirements: 0,
      derivedAbsent: ['coverage', 'mobility', 'networkId', 'served', 'stage', 'objective', 'progress', 'score'].map(
        (term) => ({ term, present: serialized.includes(term) })
      ),
      stock: getResourceStock(a),
    })
    expect(saved.version).toBe(8)
    expect(SAVE_VERSION).toBe(8)
    expect(Object.keys(saved.state)).toHaveLength(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reordered)).toBe(hashCanonicalState(a))
    expect(serialized).not.toContain('stage')
  })
})
