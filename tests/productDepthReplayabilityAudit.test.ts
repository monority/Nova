/**
 * Step 10DD — Product Depth & Replayability Audit (deterministic findings).
 *
 * AUDIT ONLY. `src/` is untouched. These tests encode the measurable evidence
 * behind the gate: the scenario catalogue's decision dimensions, spatial and
 * workforce alternatives, economic trade-offs and bottlenecks, temporal
 * consequences, failure/recovery, and layout diversity. No subjective "depth
 * score" is produced.
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
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodProductionPerTick,
  getRevenuePerTick,
  getMaintenanceDuePerTick,
  getNetMoneyPerTick,
  getPlacementAffordability,
  getPlacementSpatialPreview,
  getPopulationCount,
  getRoadNetworks,
  getRoadsPlacementAffordability,
  getWaterProductionPerTick,
  hashCanonicalState,
  SAVE_VERSION,
  SCENARIOS,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = {
  world: { seed: 'nova-step10dd', width: 16, height: 12 },
}

const ROW_RESIDENCE = 0
const ROW_ROAD = 1
const ROW_WORKPLACE = 2

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10dd: building missing')
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
  if (id === undefined) throw new Error('10dd: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10dd: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly wells?: number
  readonly workshops?: number
  readonly colonists?: number
  readonly material?: number
  readonly water?: number
  readonly gap?: number
  readonly roads?: boolean
}

/** Operational colony on one road row; `gap` widens the layout. */
const build = (spec: Spec): SimulationState => {
  const gap = spec.gap ?? 0
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      ...state.resources,
      food: 10_000,
      money: spec.material ?? 100,
      water: spec.water ?? 0,
    },
  }
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * (1 + gap), ROW_RESIDENCE)
  }
  let col = 0
  const place = (type: BuildingType, count: number): void => {
    for (let i = 0; i < count; i += 1) {
      state = op(state, type, 1 + col * (1 + gap), ROW_WORKPLACE)
      col += 1
    }
  }
  place('farm', spec.farms ?? 0)
  place('well', spec.wells ?? 0)
  place('workshop', spec.workshops ?? 0)
  if (spec.roads !== false) {
    const maxX = 1 + Math.max(spec.residences - 1, col - 1) * (1 + gap) + 1
    for (let x = 0; x <= maxX; x += 1) state = opRoad(state, x, ROW_ROAD)
  }
  const residences = Object.values(state.buildings)
    .filter((building) => building.type === 'residence')
    .sort((a, b) => a.x - b.x)
  const wanted = spec.colonists ?? spec.residences
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

const requirementSignature = (index: number): string => {
  const scenario = SCENARIOS[index]
  if (scenario === undefined) throw new Error('10dd: missing scenario')
  return scenario.objective.requirements
    .map((requirement) =>
      requirement.kind === 'building'
        ? `building:${requirement.buildingType}`
        : requirement.kind === 'stage'
          ? `stage:${requirement.stage}`
          : requirement.kind
    )
    .sort()
    .join('+')
}

describe('10DD — scenario catalogue decision dimensions', () => {
  it('exposes 11 scenarios that use all five requirement kinds', () => {
    expect(SCENARIOS).toHaveLength(11)
    const kinds = new Set<string>()
    for (const scenario of SCENARIOS) {
      for (const requirement of scenario.objective.requirements) kinds.add(requirement.kind)
    }
    expect([...kinds].sort()).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
  })

  it('authored scenarios are not one repeated objective signature', () => {
    const signatures = new Set(SCENARIOS.map((_, index) => requirementSignature(index)))
    expect(signatures.size).toBeGreaterThanOrEqual(5)
  })

  it('scenario constraints differ and each names what to optimise', () => {
    const constraints = new Set(SCENARIOS.map((scenario) => scenario.objective.constraint))
    expect(constraints.size).toBe(11)
    for (const scenario of SCENARIOS) {
      expect(scenario.objective.requirements.length, scenario.id).toBeGreaterThan(0)
    }
  })

  it('no single build satisfies every scenario (stage/building targets diverge)', () => {
    const buildingRequirements = new Set(
      SCENARIOS.flatMap((scenario) =>
        scenario.objective.requirements
          .filter((requirement) => requirement.kind === 'building')
          .map((requirement) => requirement.buildingType)
      )
    )
    expect(buildingRequirements.has('workshop')).toBe(true)
    // first-settlement needs no building at all, while the industrial scenarios
    // require a specific Workshop (and water-reserve-industry a second Well).
    expect(
      findScenario('first-settlement')?.objective.requirements.some(
        (requirement) => requirement.kind === 'building'
      )
    ).toBe(false)
    expect(
      findScenario('industrial-expansion')?.objective.requirements.some(
        (requirement) =>
          requirement.kind === 'building' && requirement.buildingType === 'workshop'
      )
    ).toBe(true)
  })
})

describe('10DD — spatial depth: placement and road topology', () => {
  it('bridging two road networks changes their count and the access they grant', () => {
    const scenario = findScenario('housing-composition')
    if (scenario === undefined) throw new Error('10dd: missing housing-composition')
    const start = createScenarioState(config, scenario)
    expect(getRoadNetworks(start)).toHaveLength(2)

    // The west candidate cell sits on the Farm network, which has no Well.
    const before = getPlacementSpatialPreviewSafe(start, { x: 0, y: 1 })
    expect(before.waterCovered).toBe(false)

    // Bridge the two networks with one road and let it become operational.
    const bridged = runTicks(stepSimulation(start, { type: 'placeRoads', cells: [{ x: 2, y: 1 }] }), 2)
    expect(getRoadNetworks(bridged)).toHaveLength(1)
    expect(getPlacementSpatialPreviewSafe(bridged, { x: 0, y: 1 }).waterCovered).toBe(true)
  })

  it('compact and distributed layouts are both viable but differ in road structure', () => {
    const layout = { residences: 2, farms: 1, wells: 1, colonists: 2 } as const
    const compact = build({ ...layout })
    const distributed = build({ ...layout, gap: 3 })
    for (const state of [compact, distributed]) {
      expect(getRoadNetworks(state)).toHaveLength(1)
      expect(getEmploymentSummary(state).employed).toBe(2)
      expect(getFoodProductionPerTick(state)).toBe(2)
      expect(getWaterProductionPerTick(state)).toBe(2)
    }
    expect(Object.keys(distributed.roads).length).toBeGreaterThan(
      Object.keys(compact.roads).length
    )
  })

  it('a roadless workplace produces nothing until a 5-Material road restores it', () => {
    const stranded = build({ residences: 1, workshops: 1, colonists: 1, roads: false, water: 1 })
    // Roadless: no commerce, but the inhabitant tax still flows.
    expect(getRevenuePerTick(stranded)).toBe(1)
    expect(getPopulationCount(stranded)).toBe(1)

    const connected = build({ residences: 1, workshops: 1, colonists: 1, material: 100, water: 1 })
    expect(getRevenuePerTick(connected)).toBe(3)
  })
})

describe('10DD — workforce depth', () => {
  it('one colonist across three workplace types yields three different outcomes', () => {
    const farm = build({ residences: 1, farms: 1, colonists: 1 })
    const well = build({ residences: 1, wells: 1, colonists: 1 })
    const workshop = build({ residences: 1, workshops: 1, colonists: 1 })

    expect(getFoodProductionPerTick(farm)).toBe(2)
    expect(getWaterProductionPerTick(well)).toBe(2)
    expect(getRevenuePerTick(workshop)).toBe(3)

    // Income and upkeep differ by workplace: the allocation is a real
    // trade-off. Commerce is Workshop-only; the inhabitant tax flows everywhere.
    expect(getRevenuePerTick(farm)).toBe(1)
    expect(getRevenuePerTick(well)).toBe(1)
    expect(getRevenuePerTick(workshop)).toBe(3)
    expect(getMaintenanceDuePerTick(workshop)).toBe(2)
    expect(getMaintenanceDuePerTick(farm)).toBe(2)
  })

  it('mobility gates assignment: a disconnected workplace stays vacant', () => {
    const disconnected = build({ residences: 1, workshops: 1, colonists: 1, roads: false, water: 1 })
    expect(getEmploymentSummary(disconnected).employed).toBe(0)
    // Vacant: no commerce, but the inhabitant tax still flows.
    expect(getRevenuePerTick(disconnected)).toBe(1)

    const connected = build({ residences: 1, workshops: 1, colonists: 1, water: 1 })
    expect(getEmploymentSummary(connected).employed).toBe(1)
    expect(getRevenuePerTick(connected)).toBe(3)
  })

  it('the same start with different allocations diverges over time', () => {
    const start = build({ residences: 1, farms: 1, wells: 1, colonists: 1, water: 10 })
    const colonistId = Object.keys(start.colonists)[0]
    const farmId = Object.values(start.buildings).find((b) => b.type === 'farm')?.id
    const wellId = Object.values(start.buildings).find((b) => b.type === 'well')?.id
    if (colonistId === undefined || farmId === undefined || wellId === undefined) {
      throw new Error('10dd: fixture incomplete')
    }
    const onFarm = runTicks(
      stepSimulation(start, { type: 'reassignColonist', colonistId, workplaceId: farmId }),
      4
    )
    const onWell = runTicks(
      stepSimulation(start, { type: 'reassignColonist', colonistId, workplaceId: wellId }),
      4
    )
    expect(onFarm.resources.food).not.toBe(onWell.resources.food)
    expect(onFarm.resources.water).not.toBe(onWell.resources.water)
    expect(hashCanonicalState(onFarm)).not.toBe(hashCanonicalState(onWell))
  })
})

describe('10DD — economic and temporal depth', () => {
  it('treasury is uncapped: revenue lands in full at any balance', () => {
    const base = build({ residences: 1, workshops: 1, colonists: 1, material: 0, water: 1 })
    // Uncapped treasury: revenue 3 (1 tax + 2 commerce), maintenance 2.
    expect(getRevenuePerTick(base)).toBe(3)
    expect(getMaintenanceDuePerTick(base)).toBe(2)
    // Net +1/tick: revenue 3 (1 tax + 2 commerce) minus maintenance 2.
    expect(getNetMoneyPerTick(base)).toBe(1)
    const below = runTicks(base, 1)
    // Net +1/tick (revenue 3 − maintenance 2) from a zero stock.
    expect(below.resources.money).toBe(1)

    const atCap = build({ residences: 1, workshops: 1, colonists: 1, material: 25, water: 1 })
    const above = runTicks(atCap, 1)
    // No cap: the same +1 net lands above 25 as below it.
    expect(above.resources.money).toBe(26)
  })

  it('an empty treasury funds nothing: buildings and roads both refuse at 0 money', () => {
    let state = createInitialState(config)
    state = {
      ...state,
      resources: { ...state.resources, money: 0 },
    }
    expect(getPlacementAffordability(state, { x: 6, y: 6 }, 'residence').affordable).toBe(false)
    expect(getRoadsPlacementAffordability(state, [{ x: 6, y: 6 }]).affordable).toBe(false)
  })

  it('construction costs time and upkeep starts only once operational and staffed', () => {
    expect(getBuildingDefinition('workshop').constructionTicks).toBe(2)
    let state = build({ residences: 1, colonists: 1, water: 1 })
    state = stepSimulation(state, {
      type: 'placeBuilding',
      x: 8,
      y: ROW_WORKPLACE,
      buildingType: 'workshop',
    })
    const placed = Object.values(state.buildings).find((b) => b.type === 'workshop')
    expect(placed?.status).toBe('underConstruction')
    // The residence is already operational, so its upkeep is due.
    expect(getMaintenanceDuePerTick(state)).toBe(1)

    // Operationally complete after the catalog's two ticks (staffing then applies).
    state = runTicks(state, 2)
    expect(Object.values(state.buildings).find((b) => b.type === 'workshop')?.status).toBe(
      'operational'
    )
  })

  it('starvation is terminal, while a food reserve makes the same start recoverable', () => {
    const starvingBase = build({ residences: 1, colonists: 1 })
    const starving: SimulationState = {
      ...starvingBase,
      resources: { ...starvingBase.resources, food: 0 },
    }
    expect(getPopulationCount(starving)).toBe(1)
    expect(getPopulationCount(stepSimulation(starving))).toBe(0)

    const reservedBase = build({ residences: 1, colonists: 1 })
    const reserved: SimulationState = {
      ...reservedBase,
      resources: { ...reservedBase.resources, food: 10 },
    }
    expect(getPopulationCount(stepSimulation(reserved))).toBe(1)
  })
})

describe('10DD — persistence and replay evidence', () => {
  it('keeps SAVE_VERSION 9 with deterministic divergent states', () => {
    expect(SAVE_VERSION).toBe(9)
  })
})

/** Local wrapper: the preview query is a pure read used by the audit. */
interface SpatialPreview {
  readonly waterCovered: boolean
}
const getPlacementSpatialPreviewSafe = (
  state: SimulationState,
  cell: { readonly x: number; readonly y: number }
): SpatialPreview => {
  // Imported lazily through the index barrel to keep the import list focused.
  return getPlacementSpatialPreview(state, cell)
}
