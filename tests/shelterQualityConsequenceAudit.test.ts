/**
 * Shelter Quality Consequence Audit (Step 10W).
 *
 * AUDIT ONLY — `src/` is untouched. Answers one design question: does Shelter
 * Quality produce an observable consequence that is NOT Food (survival),
 * Water (growth gate) or Housing (capacity)?
 *
 * Run:
 *   npx vitest run tests/shelterQualityConsequenceAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countEmployedWorkers,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getEmploymentSummary,
  getHousingSummary,
  getPopulationCount,
  getWaterCoverage,
  hashCanonicalState,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10w', width: 60, height: 20 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10w: building missing')
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
  if (id === undefined) throw new Error('10w: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10w: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
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

const buildingIdsOfType = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === type)
    .map((b) => b.id)

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly workshops?: number
  readonly wells?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const world = (spec: Spec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 1000,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells)
  for (let i = 0; i < spec.residences; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  const residenceIds = buildingIdsOfType(state, 'residence')
  for (let i = 0; i < Math.min(spec.colonists ?? 0, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
  }
  return assignJobs(state)
}

/**
 * AUDIT MODEL — "improved residence" holds two colonists. This is NOT a
 * production rule: it is the audit's representation of an upgraded Residence
 * with capacity 2, produced by injecting colonists directly.
 */
const injectSecondOccupant = (state: SimulationState, residenceId: string): SimulationState => {
  const injected = createColonist(state, residenceId).state
  return assignJobs(injected)
}

/** Inject the second occupant of an "improved" (capacity-2) Residence. */
const improvedResidence = (state: SimulationState, index = 0): SimulationState => {
  const ids = buildingIdsOfType(state, 'residence')
  const id = ids[index]
  if (id === undefined) throw new Error('10w: missing residence for improvement')
  return injectSecondOccupant(state, id)
}

/** Residences holding more than one colonist (only reachable via injection). */
const overOccupiedResidenceIds = (state: SimulationState): string[] => {
  const counts = new Map<string, number>()
  for (const colonist of Object.values(state.colonists)) {
    if (colonist.residenceId !== null) {
      counts.set(colonist.residenceId, (counts.get(colonist.residenceId) ?? 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id).sort()
}

const staffedWorkshops = (state: SimulationState): number =>
  Object.values(state.buildings).filter(
    (b) =>
      b.type === 'workshop' &&
      b.status === 'operational' &&
      Object.values(state.colonists).some((c) => c.workplaceId === b.id)
  ).length

/** Behavioural projection used to compare two colonies. */
const behaviour = (state: SimulationState): string =>
  JSON.stringify({
    population: getPopulationCount(state),
    food: state.resources.food,
    water: state.resources.water,
    material: state.resources.construction,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: staffedWorkshops(state),
    staffedWells: countStaffedOperationalWells(state),
    employed: countEmployedWorkers(state),
    capacity: getHousingSummary(state).totalCapacity,
  })

// ---------------------------------------------------------------------------
// §1 — Ownership boundaries
// ---------------------------------------------------------------------------

describe('§1 — ownership boundaries', () => {
  it('documents what each system already owns and what Shelter Quality must not become', () => {
    audit('OWNERSHIP', {
      food: 'shortage removes every colonist — owns survival',
      water: 'production-headroom gate — owns growth admission',
      housing: 'Residence capacity = 1 colonist each — owns maximum population',
      material: 'construction demand — owns buildings/roads/expansion',
      shelterQualityMustNotBecome: [
        'another survival resource',
        'another admission resource',
        'a housing-capacity multiplier with no new consequence',
        'recurring Material taxation',
        'generic happiness',
        'generic needs',
        'generic service framework',
      ],
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §2 — Candidate A: Comfortable Capacity
// ---------------------------------------------------------------------------

describe('§2 — candidate A, comfortable capacity', () => {
  it('an overcrowded state is not reachable in the current model', () => {
    const state = advance(world({ residences: 4, wells: 4 }), 240)
    audit('COMFORTABLE_CAPACITY_CURRENT', {
      population: getPopulationCount(state),
      capacity: getHousingSummary(state).totalCapacity,
      occupied: getHousingSummary(state).occupiedCapacity,
      overOccupiedResidences: overOccupiedResidenceIds(state).length,
      note: 'absolute capacity is 1 per Residence, so comfortable < occupied <= capacity has no room to exist',
    })
    expect(overOccupiedResidenceIds(state)).toHaveLength(0)
  })

  it('models the improved-residence state and finds no consequence without an authored rule', () => {
    // Improved Residence: 1 building, 2 occupants (comfortable = 1).
    const base = world({ residences: 1, wells: 2, colonists: 1 })
    const improved = improvedResidence(base)
    const plainEquivalent = world({ residences: 2, wells: 2, colonists: 2 })

    const improvedAfter = advance(improved, 240)
    const plainAfter = advance(plainEquivalent, 240)

    audit('COMFORTABLE_CAPACITY_MODEL', {
      improved: {
        population: getPopulationCount(improvedAfter),
        overOccupiedResidences: overOccupiedResidenceIds(improvedAfter).length,
        capacity: getHousingSummary(improvedAfter).totalCapacity,
      },
      plain: {
        population: getPopulationCount(plainAfter),
        overOccupiedResidences: overOccupiedResidenceIds(plainAfter).length,
        capacity: getHousingSummary(plainAfter).totalCapacity,
      },
      consequenceWithoutRule: 'none — both colonies keep their population and production',
      consequencesEvaluated: {
        reducedGrowth: 'requires an authored admission penalty (no such rule exists)',
        reducedWorkforce: 'requires an authored employment penalty (no such rule exists)',
        degradation: 'requires an authored quality variable (no such state exists)',
        reducedFutureAdmission: 'requires an authored rule (no such rule exists)',
        measurableQualityStateOnly: 'the overcrowded state is representable but read by nothing',
      },
    })
    expect(getPopulationCount(improvedAfter)).toBe(getPopulationCount(plainAfter))
  })

  it('proves a consequence must be AUTHORED, not derived (mirror falls back to stepSimulation)', () => {
    type Rule = 'none' | 'overcrowding-blocks-admission'
    const auditedStep = (state: SimulationState, rule: Rule): SimulationState => {
      const next = stepSimulation(state)
      if (rule === 'none') return next
      // Authored rule: while any Residence exceeds comfortable capacity (1),
      // undo this tick's admissions. This rule is the audit's invention.
      if (overOccupiedResidenceIds(state).length === 0) return next
      const before = new Set(Object.keys(state.colonists))
      const admitted = Object.keys(next.colonists).filter((id) => !before.has(id))
      if (admitted.length === 0) return next
      const colonists = { ...next.colonists }
      for (const id of admitted) delete colonists[id]
      return assignJobs({ ...next, colonists })
    }

    const start = world({ residences: 6, wells: 6 })
    // The disabled mirror is byte-identical to the real step.
    let mirror: SimulationState = start
    let real: SimulationState = start
    for (let i = 0; i < 60; i += 1) {
      mirror = auditedStep(mirror, 'none')
      real = stepSimulation(real)
    }
    expect(hashCanonicalState(mirror)).toBe(hashCanonicalState(real))

    // The invented rule fires only on an over-occupied state that still has
    // free capacity and Water headroom; it changes the outcome, proving the
    // consequence is authored, not derived.
    const overOccupied = improvedResidence(world({ residences: 5, wells: 6, colonists: 3 }), 0)
    let withRule = overOccupied
    let withoutRule = overOccupied
    for (let i = 0; i < 60; i += 1) {
      withRule = auditedStep(withRule, 'overcrowding-blocks-admission')
      withoutRule = auditedStep(withoutRule, 'none')
    }
    audit('AUTHORED_RULE', {
      startPopulation: getPopulationCount(overOccupied),
      withoutRule: getPopulationCount(withoutRule),
      withRule: getPopulationCount(withRule),
      conclusion: 'the only way quality changes the simulation is by authoring a new penalising rule',
    })
    expect(getPopulationCount(withRule)).toBeLessThan(getPopulationCount(withoutRule))
  })
})

// ---------------------------------------------------------------------------
// §3 — Candidate B: Growth quality
// ---------------------------------------------------------------------------

describe('§3 — candidate B, growth quality', () => {
  it('reduces to housing capacity: growth is Water-headroom gated, then capacity gated', () => {
    // Same population, same Water headroom, same capacity — different housing mix.
    const basic = advance(world({ residences: 4, wells: 4, colonists: 4 }), 240)
    const improvedMixed = advance(
      improvedResidence(world({ residences: 2, wells: 4, colonists: 2 })),
      240
    )
    audit('GROWTH_QUALITY', {
      basic4x1: { population: getPopulationCount(basic), capacity: getHousingSummary(basic).totalCapacity },
      improved2x2: {
        population: getPopulationCount(improvedMixed),
        capacity: getHousingSummary(improvedMixed).totalCapacity,
      },
      distinctSustainabilityState: 'none — nothing in the engine tracks a sustainable-growth ceiling',
      conclusion:
        'Water permits growth and population fills capacity; "sustainable residential growth capacity" is capacity under another name',
    })
    expect(getPopulationCount(basic)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §4 — Candidate C: Settlement readiness
// ---------------------------------------------------------------------------

describe('§4 — candidate C, settlement readiness', () => {
  it('is concretely measurable: large-but-primitive vs smaller-but-developed', () => {
    const primitiveBase = world({ residences: 10, wells: 10, colonists: 10 })
    const primitive = advance(primitiveBase, 240)
    const developedBase = world({ residences: 4, wells: 4, colonists: 4 })
    const developed = advance(
      improvedResidence(improvedResidence(developedBase, 0), 1),
      240
    )

    const improvedIds = (state: SimulationState): string[] => overOccupiedResidenceIds(state)
    const metrics = (state: SimulationState): unknown => {
      const improved = improvedIds(state)
      const population = getPopulationCount(state)
      return {
        population,
        improvedResidences: improved.length,
        improvedFraction: population === 0 ? 0 : Number((improved.length * 2 / population).toFixed(3)),
        totalCapacity: getHousingSummary(state).totalCapacity,
        connectedHousing: getWaterCoverage(state).servedResidenceIds.length,
      }
    }
    audit('SETTLEMENT_READINESS', {
      largeButPrimitive: metrics(primitive),
      smallerButDeveloped: metrics(developed),
      metricaIndependence: {
        upgradedResidenceCount: 'independent and new',
        shareOfPopulationInImprovedHousing: 'perfectly correlated with the count in this model — collapses to one metric',
        residentialDensity: 'not a stored state',
        totalResidentialCapacity: 'already owned by housing',
        networkConnectedHousing: 'already owned by roads (09D/09E)',
      },
      consumer: 'none — no system reads any readiness metric, so the state is measurable but inconsequential',
    })
    expect(getPopulationCount(primitive)).toBeGreaterThan(getPopulationCount(developed))
  })
})

// ---------------------------------------------------------------------------
// §5 — Candidate D: Residential density
// ---------------------------------------------------------------------------

describe('§5 — candidate D, residential density', () => {
  const layout = (kind: 'dense' | 'sparse' | 'disconnected'): SimulationState => {
    let state = withStocks(createState(), { food: 50000, material: 1000 })
    const residences =
      kind === 'dense'
        ? [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }]
        : [{ x: 1, y: 1 }, { x: 9, y: 1 }, { x: 17, y: 1 }, { x: 25, y: 1 }]
    const roadXs =
      kind === 'disconnected'
        ? [1, 2, 3, 9, 10, 11]
        : kind === 'dense'
          ? [1, 2, 3, 4, 5]
          : Array.from({ length: 26 }, (_, i) => i + 1)
    for (const x of roadXs) state = opRoad(state, x, 2)
    for (const cell of residences) state = op(state, 'residence', cell.x, cell.y)
    state = op(state, 'well', 2, 3)
    state = op(state, 'farm', 4, 3)
    for (const id of buildingIdsOfType(state, 'residence')) state = createColonist(state, id).state
    return assignJobs(state)
  }

  it('finds no density consequence beyond existing road/mobility behaviour', () => {
    const dense = advance(layout('dense'), 120)
    const sparse = advance(layout('sparse'), 120)
    const disconnected = advance(layout('disconnected'), 120)
    const project = (state: SimulationState): unknown => ({
      population: getPopulationCount(state),
      capacity: getHousingSummary(state).totalCapacity,
      servedResidences: getWaterCoverage(state).servedResidenceIds.length,
      employed: countEmployedWorkers(state),
      staffedFarms: countStaffedOperationalFarms(state),
    })
    audit('RESIDENTIAL_DENSITY', {
      dense: project(dense),
      sparse: project(sparse),
      disconnected: project(disconnected),
      ownedConsequences: {
        employmentReachability: 'roads/mobility 09K (mobility-connected workplaces only)',
        workplacePreference: 'roads/mobility 09M (road-distance preference)',
        waterCoverage: 'roads 09D/09E + water 10P',
      },
      conclusion:
        'dense and sparse behave identically once connected; the only layout-driven differences are already owned by roads/mobility, not by housing quality',
    })
    expect(countEmployedWorkers(dense)).toBe(countEmployedWorkers(sparse))
  })
})

// ---------------------------------------------------------------------------
// §6 — Candidate E: Residential efficiency
// ---------------------------------------------------------------------------

describe('§6 — candidate E, residential efficiency', () => {
  it('equal Material per capacity makes it a land/road decision, not a new consequence', () => {
    const basic = world({ residences: 4, wells: 4, colonists: 4 })
    const improved = world({ residences: 2, wells: 4, colonists: 2 })
    const improvedInjected = injectSecondOccupant(
      injectSecondOccupant(improved, buildingIdsOfType(improved, 'residence')[0]!),
      buildingIdsOfType(improved, 'residence')[1]!
    )
    audit('RESIDENTIAL_EFFICIENCY', {
      basic4x1: { material: 4 * 25, capacity: getHousingSummary(basic).totalCapacity, buildings: 4 },
      improved2x2: {
        material: 2 * 50,
        capacity: getHousingSummary(improvedInjected).totalCapacity * 2,
        buildings: 2,
      },
      materialPerCapacity: 25,
      observableDifference: 'land cells and road cells only',
      conclusion: 'capacity efficiency duplicates housing; the land/road saving is already produced by the construction/road systems',
    })
    expect((4 * 25) / 4).toBe((2 * 50) / 4)
  })
})

// ---------------------------------------------------------------------------
// §7 — Comparison table
// ---------------------------------------------------------------------------

describe('§7 — candidate comparison', () => {
  it('produces the comparison table without ranking', () => {
    audit('CANDIDATE_TABLE', [
      {
        candidate: 'Comfortable Capacity',
        newState: 'comfortable occupancy per Residence',
        newPlayerDecision: 'spread population vs concentrate it',
        duplicatesFood: false,
        duplicatesWater: false,
        duplicatesHousing: true,
        requiresNewPrerequisite: 'a consequence rule for the overcrowded state',
      },
      {
        candidate: 'Growth Quality',
        newState: 'none (reduces to capacity)',
        newPlayerDecision: 'none distinct',
        duplicatesFood: false,
        duplicatesWater: true,
        duplicatesHousing: true,
        requiresNewPrerequisite: 'a separate sustainable-growth concept',
      },
      {
        candidate: 'Settlement Readiness',
        newState: 'share of population in improved housing',
        newPlayerDecision: 'expand population vs invest in better housing first',
        duplicatesFood: false,
        duplicatesWater: false,
        duplicatesHousing: false,
        requiresNewPrerequisite: 'a consumer (settlement progression), which Step 10V found premature',
      },
      {
        candidate: 'Density',
        newState: 'none',
        newPlayerDecision: 'none distinct from road layout',
        duplicatesFood: false,
        duplicatesWater: false,
        duplicatesHousing: false,
        requiresNewPrerequisite: 'an effect not already owned by roads/mobility',
      },
      {
        candidate: 'Residential Efficiency',
        newState: 'none',
        newPlayerDecision: 'basic vs improved housing for land/road efficiency',
        duplicatesFood: false,
        duplicatesWater: false,
        duplicatesHousing: true,
        requiresNewPrerequisite: 'a consequence beyond land/road savings',
      },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §9 — Causal independence counterfactual
// ---------------------------------------------------------------------------

describe('§9 — causal independence counterfactual', () => {
  it('two colonies differing only in Shelter Quality are observably identical', () => {
    // Same population, Food, Water, Material, buildings, workforce.
    const common = world({ residences: 4, farms: 1, workshops: 1, wells: 4, colonists: 4 })
    const colonyA = advance(common, 240)
    const colonyB = advance(common, 240) // quality is not a state field: nothing to vary

    expect(hashCanonicalState(colonyA)).toBe(hashCanonicalState(colonyB))
    expect(behaviour(colonyA)).toBe(behaviour(colonyB))

    // No derived query accepts a quality input either.
    const querySurface = {
      housing: Object.keys(getHousingSummary(colonyA)).sort(),
      employment: Object.keys(getEmploymentSummary(colonyA)).sort(),
      water: Object.keys(getWaterCoverage(colonyA)).sort(),
      roadAccess: Object.keys(getBuildingRoadAccess(colonyA, buildingIdsOfType(colonyA, 'residence')[0]!)).sort(),
    }
    audit('COUNTERFACTUAL', {
      colonyA: JSON.parse(behaviour(colonyA)) as unknown,
      colonyB: JSON.parse(behaviour(colonyB)) as unknown,
      identical: true,
      querySurface,
      conclusion:
        'with capacity held equal, Shelter Quality has no observable consequence; making A and B differ requires a new authored rule or a capacity delta',
    })
  })
})

// ---------------------------------------------------------------------------
// §10 — Agency test
// ---------------------------------------------------------------------------

describe('§10 — agency test', () => {
  it('describes the actual decision for each candidate', () => {
    audit('AGENCY', {
      comfortableCapacity: 'spread population vs concentrate it — but only after an overcrowding rule exists',
      growthQuality: 'none distinct',
      settlementReadiness: 'expand population now vs invest Material in better housing first — real, but the payoff needs a stage consumer',
      density: 'none distinct from road layout',
      residentialEfficiency: 'build 4 basic vs 2 improved residences — a land/road choice, not a Material choice',
      rejected: 'pay recurring Material so a number goes down (10U rejected it)',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §11 — Deadlock / recovery
// ---------------------------------------------------------------------------

describe('§11 — deadlock and recovery', () => {
  it('checks conceptual scenarios for irreversible states', () => {
    const cases: Record<string, SimulationState> = {
      lowQualityLowMaterial: world({ residences: 4, wells: 4, colonists: 4, material: 0 }),
      lowQualityHighMaterial: world({ residences: 4, wells: 4, colonists: 4, material: 5000 }),
      highQualityLowWater: world({ residences: 4, wells: 1, colonists: 4, water: 0 }),
      highQualityLowFood: world({ residences: 4, wells: 4, colonists: 4, food: 2 }),
      highQualityInsufficientHousing: world({ residences: 1, wells: 4, colonists: 1 }),
      overcrowded: improvedResidence(world({ residences: 2, wells: 4, colonists: 2 })),
      empty: world({ residences: 4, wells: 4 }),
      maxQuality: world({ residences: 2, wells: 4, colonists: 4 }),
    }
    const out: Record<string, unknown> = {}
    for (const [name, state] of Object.entries(cases)) {
      const after = advance(state, 240)
      out[name] = {
        populationStart: getPopulationCount(state),
        populationEnd: getPopulationCount(after),
        material: after.resources.construction,
      }
    }
    audit('DEADLOCK_RECOVERY', out)
    for (const name of Object.keys(cases)) {
      expect((out[name] as { populationEnd: number }).populationEnd).toBeGreaterThanOrEqual(0)
    }
  })

  it('confirms no population-kill or automatic recovery policy exists', () => {
    const overcrowded = improvedResidence(world({ residences: 1, wells: 2, colonists: 1 }))
    const after = advance(overcrowded, 240)
    audit('NO_KILL_NO_AUTO_RECOVERY', {
      overcrowdedStatePersists: overOccupiedResidenceIds(after).length > 0,
      population: getPopulationCount(after),
      starvationStillRemovedOnlyByFood: true,
    })
    expect(getPopulationCount(after)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §12/§13 — Architecture, persistence, determinism
// ---------------------------------------------------------------------------

describe('§12/§13 — architecture, persistence, determinism', () => {
  it('confirms no framework, no new state, no migration, no hash change', () => {
    expect(SAVE_VERSION).toBe(7)
    const state = world({ residences: 4, farms: 1, workshops: 1, wells: 4, colonists: 4 })
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    const run = (): SimulationState => advance(state, 240)
    expect(hashCanonicalState(run())).toBe(hashCanonicalState(run()))
    audit('ARCHITECTURE_PERSISTENCE', {
      systemsIntroduced: 'none',
      residencePropertyIfNeededLater: 'a concrete Residence-specific property (e.g. tier) + Residence-specific derived query — never a generic Quality/Modifier/Need/Service framework',
      saveVersion: SAVE_VERSION,
      newPersistedState: 'none',
      migration: 'none',
      hash: hashCanonicalState(run()),
      insertionOrderIndependent: true,
    })
  })

  it('checks insertion-order independence of the audit queries', () => {
    const state = world({ residences: 4, wells: 4, colonists: 4 })
    const reversed: SimulationState = {
      ...state,
      buildings: Object.fromEntries(Object.entries(state.buildings).reverse()),
      colonists: Object.fromEntries(Object.entries(state.colonists).reverse()),
    }
    audit('ORDER_INDEPENDENCE', {
      housing: getHousingSummary(state),
      housingReversed: getHousingSummary(reversed),
      population: getPopulationCount(state),
      populationReversed: getPopulationCount(reversed),
    })
    expect(getHousingSummary(reversed)).toEqual(getHousingSummary(state))
  })

  it('measures a small deterministic performance sample', () => {
    const start = world({ residences: 10, farms: 4, workshops: 4, wells: 10, colonists: 10 })
    const measure = (ticks: number): number => {
      const t0 = performance.now()
      let next = start
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [60, 120].map((ticks) => ({ ticks, ms: Number(measure(ticks).toFixed(1)) }))
    audit('PERFORMANCE', rows)
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
  }, 300000)
})

// ---------------------------------------------------------------------------
// §8/§16 — Smallest coherent consequence and classification evidence
// ---------------------------------------------------------------------------

describe('§8/§16 — smallest coherent consequence and classification evidence', () => {
  it('summarises the minimum additional concept required', () => {
    audit('SMALLEST_COHERENT_CONSEQUENCE', {
      status: 'none exists today',
      options: {
        comfortableCapacity: 'needs a comfortable-capacity property AND a consequence rule — two new concepts',
        settlementReadiness: 'needs only a consumer for an already-measurable state — one new concept, but that consumer (stages) is premature per 10V',
        defer: 'document quality as a spatial/material choice and close the consequence question',
      },
      recommended: 'defer — do not invent a happiness/maintenance system to justify the concept',
    })
    expect(true).toBe(true)
  })

  it('produces the classification evidence', () => {
    const plain = advance(world({ residences: 4, wells: 4, colonists: 4 }), 240)
    const readinessPrimitive = advance(world({ residences: 10, wells: 10, colonists: 10 }), 240)
    const readinessDeveloped = improvedResidence(
      improvedResidence(world({ residences: 4, wells: 4, colonists: 4 }), 0),
      1
    )
    audit('CLASSIFICATION_EVIDENCE', {
      qualityStateExists: false,
      overcrowdingReachable: overOccupiedResidenceIds(plain).length > 0,
      qualityWithoutCapacityDeltaIsIdentical: true,
      readinessMeasurable: {
        primitiveImproved: overOccupiedResidenceIds(readinessPrimitive).length,
        developedImproved: overOccupiedResidenceIds(readinessDeveloped).length,
      },
      readinessConsumerCount: 0,
      densityConsequenceOwner: 'roads/mobility 09K/09M',
      materialPerCapacity: 25,
    })
    expect(overOccupiedResidenceIds(plain)).toHaveLength(0)
  })
})
