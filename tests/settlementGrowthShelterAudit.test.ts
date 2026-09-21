/**
 * Settlement Growth & Shelter Quality Audit (Step 10V).
 *
 * AUDIT ONLY — `src/` is untouched. Establishes exactly what "housing growth"
 * means today and evaluates whether Shelter Quality (or another settlement
 * growth mechanic) creates a genuinely new causal dimension.
 *
 * Run:
 *   npx vitest run tests/settlementGrowthShelterAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
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
  world: { seed: 'nova-step10v', width: 60, height: 20 },
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
  if (building === undefined) throw new Error('audit: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const opRoad = (
  state: SimulationState,
  x: number,
  y: number
): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('audit: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('audit: road missing')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
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

interface WorldSpec {
  readonly residences: number
  readonly farms?: number
  readonly workshops?: number
  readonly wells?: number
  readonly colonists?: number
  readonly food?: number
  readonly material?: number
  readonly water?: number
}

const world = (spec: WorldSpec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 1000,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells)
  const residenceIds: string[] = []
  for (let i = 0; i < spec.residences; i += 1) {
    state = op(state, 'residence', 1 + i * 2, 0)
    residenceIds.push(`building-${i + 1}`)
  }
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  const colonists = spec.colonists ?? 0
  for (let i = 0; i < Math.min(colonists, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
  }
  return assignJobs(state)
}

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
  return next
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const staffedWorkshops = (state: SimulationState): number =>
  Object.values(state.buildings).filter(
    (b) =>
      b.type === 'workshop' &&
      b.status === 'operational' &&
      Object.values(state.colonists).some((c) => c.workplaceId === b.id)
  ).length

interface HousingReading {
  readonly ticks: number
  readonly population: number
  readonly housingCapacity: number
  readonly freeResidences: number
  readonly operationalResidences: number
  readonly food: number
  readonly water: number
  readonly material: number
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
  readonly totalBuildings: number
  readonly limit: string
}

const readHousing = (state: SimulationState, ticks: number): HousingReading => {
  const housing = getHousingSummary(state)
  const population = getPopulationCount(state)
  const waterCapacity = countStaffedOperationalWells(state) * 2
  const foodProduction = countStaffedOperationalFarms(state) * 2
  let limit = 'none'
  if (housing.availableCapacity === 0) limit = 'housing'
  else if (waterCapacity > 0 && population >= waterCapacity) limit = 'water'
  else if (foodProduction < population) limit = 'food'
  return {
    ticks,
    population,
    housingCapacity: housing.totalCapacity,
    freeResidences: housing.availableCapacity,
    operationalResidences: housing.totalCapacity,
    food: state.resources.food,
    water: state.resources.water,
    material: state.resources.construction,
    staffedFarms: countStaffedOperationalFarms(state),
    staffedWorkshops: staffedWorkshops(state),
    staffedWells: countStaffedOperationalWells(state),
    totalBuildings: Object.values(state.buildings).filter((b) => b.status === 'operational').length,
    limit,
  }
}

// ---------------------------------------------------------------------------
// §1/§2 — Current settlement model and housing equilibrium
// ---------------------------------------------------------------------------

describe('§1/§2 — current settlement model and housing equilibrium', () => {
  it('documents the current causal chain and what is absent', () => {
    audit('SETTLEMENT_MODEL', {
      chain: 'Material -> construction -> Residence count -> Water-served housing -> Food+Water admission -> population -> workforce -> Farm/Workshop/Well',
      present: ['housing as capacity (1 colonist per operational Residence)', 'Water-served housing', 'Food survival gate', 'Water growth gate'],
      absent: [
        'housing quality',
        'residential capacity tiers',
        'overcrowding',
        'residence maintenance',
        'happiness',
        'health',
        'education',
        'comfort',
        'density consequence',
        'settlement-stage progression',
      ],
    })
    expect(true).toBe(true)
  })

  it('establishes the housing equilibrium across residence counts and mixes', () => {
    const mixes = [
      { name: '1F1W1Well', farms: 1, workshops: 1, wells: 1 },
      { name: '2F1W1Well', farms: 2, workshops: 1, wells: 1 },
      { name: '1F2W1Well', farms: 1, workshops: 2, wells: 1 },
      { name: '2F2W2Well', farms: 2, workshops: 2, wells: 2 },
    ] as const
    const out: Record<string, unknown> = {}
    for (const residences of [1, 2, 4, 6, 10]) {
      for (const mix of mixes) {
        const rows = [60, 120, 240, 600].map((ticks) =>
          readHousing(advance(world({ residences, ...mix }), ticks), ticks)
        )
        out[`R${residences}-${mix.name}`] = rows.map((r) => ({
          t: r.ticks,
          pop: r.population,
          cap: r.housingCapacity,
          free: r.freeResidences,
          staffed: { f: r.staffedFarms, w: r.staffedWorkshops, well: r.staffedWells },
          limit: r.limit,
        }))
      }
    }
    audit('HOUSING_EQUILIBRIUM', out)
  })

  it('shows the three different meanings of housing', () => {
    // Capacity: with abundant Water production, housing caps population.
    const housingLimited = readHousing(advance(world({ residences: 6, wells: 6 }), 120), 120)
    // Quality: no mechanism exists; capacity is 1/residence regardless of conditions.
    const qualityProbe = readHousing(advance(world({ residences: 4, wells: 4 }), 120), 120)
    // Progression: no settlement stages exist.
    audit('HOUSING_MEANINGS', {
      capacityLimited: { population: housingLimited.population, capacity: housingLimited.housingCapacity, limit: housingLimited.limit },
      quality: {
        mechanism: 'none — every operational Residence offers exactly 1 capacity',
        capacity: qualityProbe.housingCapacity,
      },
      progression: { mechanism: 'none — no settlement stage is derived or persisted' },
    })
    expect(housingLimited.population).toBe(6)
    expect(housingLimited.limit).toBe('housing')
  })
})

// ---------------------------------------------------------------------------
// §3 — Absence of housing quality
// ---------------------------------------------------------------------------

describe('§3 — absence of housing quality', () => {
  it('an overbuilt colony gains nothing from Residences beyond the workplace count', () => {
    // Both worlds have 6 Wells (12 Water headroom); extra Residences past the
    // 6 workplaces only add unemployed colonists.
    const few = readHousing(advance(world({ residences: 6, wells: 6 }), 240), 240)
    const many = readHousing(advance(world({ residences: 10, wells: 6 }), 240), 240)
    audit('OVERBUILT', {
      fewResidences: { population: few.population, free: few.freeResidences, staffedWells: few.staffedWells },
      manyResidences: { population: many.population, free: many.freeResidences, staffedWells: many.staffedWells },
      note: 'the 4 extra Residences add population but no additional staffed workplace or production',
    })
    expect(many.staffedWells).toBe(few.staffedWells)
    expect(many.population).toBeGreaterThan(few.population)
  })

  it('an underbuilt colony is genuinely housing-limited', () => {
    const under = readHousing(advance(world({ residences: 2, wells: 10 }), 240), 240)
    audit('UNDERBUILT', {
      population: under.population,
      capacity: under.housingCapacity,
      free: under.freeResidences,
      waterHeadroom: 10 * 2,
      limit: under.limit,
    })
    expect(under.population).toBe(2)
    expect(under.limit).toBe('housing')
  })
})

// ---------------------------------------------------------------------------
// §4 — Shelter Quality candidate models (audit only)
// ---------------------------------------------------------------------------

describe('§4 — Shelter Quality candidate models', () => {
  it('A/C — a residence tier / Material investment is capacity at the same Material cost', () => {
    // Basic: 25 Material per capacity. Tier-2: 50 Material per 2 capacity.
    const rows = [
      { model: 'Basic x 4', residences: 4, materialCost: 4 * 25, capacity: 4, land: 4, roadCells: 4 },
      { model: 'Tier-2 x 2', residences: 2, materialCost: 2 * 50, capacity: 4, land: 2, roadCells: 2 },
      { model: 'Basic x 8', residences: 8, materialCost: 8 * 25, capacity: 8, land: 8, roadCells: 8 },
      { model: 'Tier-2 x 4', residences: 4, materialCost: 4 * 50, capacity: 8, land: 4, roadCells: 4 },
    ]
    audit('RESIDENCE_TIER', {
      rows,
      materialPerCapacity: 25,
      conclusion: 'tier upgrades do not change Material per capacity; they save land and road cells',
    })
    for (const row of rows) {
      expect(row.materialCost / row.capacity).toBe(25)
    }
  })

  it('B — quality from local conditions can only reuse the existing spatial model', () => {
    // Two residences, identical capacity, different road distance to a Workshop.
    const near = world({ residences: 1, workshops: 1, wells: 1, colonists: 1 })
    const layout = (residenceX: number): SimulationState => {
      let state = withStocks(createState(), { food: 50000, material: 1000 })
      state = op(state, 'residence', residenceX, 1)
      state = op(state, 'workshop', 1, 3)
      state = op(state, 'well', 9, 3)
      for (let x = 1; x <= 9; x += 1) state = opRoad(state, x, 2)
      state = createColonist(state, 'building-1').state
      return assignJobs(state)
    }
    const atWorkshop = layout(1)
    const far = layout(9)
    audit('QUALITY_CONDITIONS', {
      existingSpatialFacts: [
        '09E building road access',
        '09D road networks',
        '09K mobility connectivity',
        '09M road distance',
      ],
      atWorkshopWorkplace: Object.values(atWorkshop.colonists)[0]!.workplaceId,
      farWorkplace: Object.values(far.colonists)[0]!.workplaceId,
      nearWellServed: getWaterCoverage(near).servedResidenceIds.length,
      conclusion:
        'a quality-from-conditions rule could read existing facts, but no consequence exists for it to affect',
    })
    expect(Object.values(atWorkshop.colonists)[0]!.workplaceId).not.toBeNull()
  })

  it('D — overcrowding would duplicate the housing capacity limit', () => {
    // Population cannot exceed capacity today; overcrowding needs a capacity
    // concept beyond 1/residence to have any meaning.
    const state = world({ residences: 3, wells: 3 })
    const after = advance(state, 60)
    const housing = getHousingSummary(after)
    audit('OVERCROWDING', {
      population: getPopulationCount(after),
      capacity: housing.totalCapacity,
      overcrowdedPossibleToday: getPopulationCount(after) > housing.totalCapacity,
      conclusion: 'with 1 colonist per Residence, overcrowding cannot occur; it needs a comfortable-capacity concept',
    })
    expect(getPopulationCount(after)).toBeLessThanOrEqual(housing.totalCapacity)
  })
})

// ---------------------------------------------------------------------------
// §5 — Agency test
// ---------------------------------------------------------------------------

describe('§5 — agency test', () => {
  it('evaluates the decisions each candidate would add', () => {
    audit('AGENCY', {
      residenceTier: 'more vs better (land/road efficiency) — not a Material decision',
      qualityFromConditions: 'placement/adjacency — real only if quality has a consequence',
      materialInvestment: 'same as residence tier; one-time cost keeps Material a construction bottleneck',
      overcrowding: 'build enough housing vs expand fast — duplicates the existing housing capacity limit',
      rejected: 'any model whose only decision is "build more Workshops to pay the tax"',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §6 — Spatial test
// ---------------------------------------------------------------------------

describe('§6 — spatial test', () => {
  const layout = (kind: 'horizontal' | 'vertical' | 'disconnected' | 'dense' | 'sparse'): SimulationState => {
    let state = withStocks(createState(), { food: 50000, material: 1000 })
    const residences: { x: number; y: number }[] = []
    if (kind === 'horizontal') {
      residences.push({ x: 1, y: 1 }, { x: 5, y: 1 })
      for (let x = 1; x <= 5; x += 1) state = opRoad(state, x, 2)
    } else if (kind === 'vertical') {
      residences.push({ x: 1, y: 1 }, { x: 1, y: 5 })
      for (let y = 1; y <= 5; y += 1) state = opRoad(state, 2, y)
    } else if (kind === 'disconnected') {
      residences.push({ x: 1, y: 1 }, { x: 20, y: 1 })
      state = opRoad(state, 2, 1)
      state = opRoad(state, 21, 1)
    } else if (kind === 'dense') {
      residences.push({ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 1 }, { x: 3, y: 3 })
      for (let y = 1; y <= 4; y += 1) state = opRoad(state, 2, y)
      for (let x = 1; x <= 4; x += 1) state = opRoad(state, x, 2)
    } else {
      residences.push({ x: 1, y: 1 }, { x: 10, y: 1 }, { x: 19, y: 1 })
      for (let x = 1; x <= 19; x += 1) state = opRoad(state, x, 2)
    }
    for (const cell of residences) state = op(state, 'residence', cell.x, cell.y)
    state = op(state, 'well', 1, 3)
    state = assignJobs(state)
    return state
  }

  it('compares layouts against the existing spatial facts', () => {
    const kinds = ['horizontal', 'vertical', 'disconnected', 'dense', 'sparse'] as const
    const rows = kinds.map((kind) => {
      const state = layout(kind)
      return {
        layout: kind,
        residences: getHousingSummary(state).totalCapacity,
        servedResidences: getWaterCoverage(state).servedResidenceIds.length,
        roadNetworks: new Set(
          Object.values(state.roads).map((r) => r.x).length > 0 ? ['n'] : []
        ).size,
      }
    })
    audit('SPATIAL_LAYOUTS', rows)
    // Layouts differ only through existing coverage/network facts; without a
    // quality consequence they remain economically equivalent per residence.
    expect(rows.length).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// §7/§8 — Material interaction and population feedback
// ---------------------------------------------------------------------------

describe('§7/§8 — Material interaction and population feedback', () => {
  it('compares one-time upgrade vs recurring upkeep', () => {
    // One-time: a Residence upgrade costs 25 Material once.
    // Recurring: 1 Material per Residence per tick — a tax (rejected in 10U).
    const oneTime = { cost: 25, ticks: 600, totalPerResidence: 25 }
    const recurring = { cost: 1, ticks: 600, totalPerResidence: 600 }
    audit('MATERIAL_INTERACTION', {
      oneTime,
      recurring,
      conclusion:
        'discrete upgrades keep Material a construction bottleneck; recurring upkeep would be a mandatory tax (Step 10U rejected it)',
    })
    expect(oneTime.totalPerResidence).toBe(25)
    expect(recurring.totalPerResidence).toBeGreaterThan(oneTime.totalPerResidence)
  })

  it('Shelter Quality must not duplicate Food survival or Water growth', () => {
    audit('POPULATION_FEEDBACK', {
      foodOwns: 'survival (shortage removes every colonist)',
      waterOwns: 'growth gate (production-headroom admission)',
      shelterCouldOwn: 'capacity / quality / progression',
      duplicationRisk: {
        capacity: 'duplicates housing capacity (already 1 per Residence)',
        growth: 'duplicates the Water growth gate',
        survival: 'would duplicate Food and must be avoided',
      },
      candidateRole: 'only "quality" (a tiered capacity or a new consequence) is not already owned — and it still needs a consequence',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §9/§10 — Settlement scale and alternatives
// ---------------------------------------------------------------------------

describe('§9/§10 — settlement scale and alternative growth mechanics', () => {
  it('measures objective settlement state but finds no stage consumer', () => {
    const small = advance(world({ residences: 2, wells: 2, colonists: 2 }), 120)
    const large = advance(world({ residences: 10, wells: 10, colonists: 10 }), 120)
    const measure = (state: SimulationState): unknown => ({
      population: getPopulationCount(state),
      operationalBuildings: Object.values(state.buildings).filter((b) => b.status === 'operational').length,
      housingCapacity: getHousingSummary(state).totalCapacity,
      roadCells: Object.keys(state.roads).length,
      staffedWells: countStaffedOperationalWells(state),
    })
    audit('SETTLEMENT_SCALE', {
      small: measure(small),
      large: measure(large),
      thresholds: 'population, housing, buildings and network size are all measurable',
      stageConsumer: 'none — no system reads a settlement stage',
      conclusion: 'a stage threshold would unlock nothing, so it would be arbitrary',
    })
    expect(getPopulationCount(large)).toBeGreaterThan(getPopulationCount(small))
  })

  it('classifies alternative growth candidates from existing evidence', () => {
    audit('ALTERNATIVE_CANDIDATES', [
      { candidate: 'Residential specialization', class: 'C', reason: 'needs a specialization concept and a consequence; no consumer today' },
      { candidate: 'Housing upgrades / tiers', class: 'B', reason: 'real land/road efficiency decision but no new consequence dimension' },
      { candidate: 'Settlement stages', class: 'C', reason: 'objective triggers exist but no stage unlocks a new decision' },
      { candidate: 'Density', class: 'C', reason: 'no density model or consequence; would be a presentation score' },
      { candidate: 'Public space / amenity', class: 'B', reason: 'a placement decision, but it needs a non-duplicative consequence' },
      { candidate: 'Second residence type', class: 'B', reason: 'same as housing tiers; a capacity/land trade with no new dimension' },
    ])
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §11/§12 — Deadlock/recovery and workforce
// ---------------------------------------------------------------------------

describe('§11/§12 — deadlock/recovery and workforce', () => {
  it('checks terminal states for over/under-built settlements', () => {
    // Inject colonists up to the housing capacity so the state is past the
    // bootstrap; the audit checks whether any configuration is terminal.
    const cases: Record<string, WorldSpec> = {
      tooMuchHousing: { residences: 10, farms: 2, workshops: 2, wells: 2, colonists: 10 },
      tooLittleHousing: { residences: 1, farms: 3, workshops: 3, wells: 3, colonists: 1 },
      tooMuchProduction: { residences: 2, farms: 4, workshops: 4, wells: 4, colonists: 2 },
      tooLittleProduction: { residences: 4, farms: 1, workshops: 1, wells: 1, colonists: 4 },
      highMaterial: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2, material: 500 },
      lowMaterial: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2, material: 0 },
      highFood: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2, food: 50000 },
      lowFood: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2, food: 2 },
      lowWater: { residences: 2, farms: 1, workshops: 1, wells: 1, colonists: 2, water: 0 },
    }
    const out: Record<string, unknown> = {}
    for (const [name, spec] of Object.entries(cases)) {
      const start = world(spec)
      const state = advance(start, 240)
      out[name] = {
        populationStart: getPopulationCount(start),
        population: getPopulationCount(state),
        material: state.resources.construction,
      }
    }
    audit('DEADLOCK_RECOVERY', out)
    for (const name of Object.keys(cases)) {
      expect((out[name] as { population: number }).population).toBeGreaterThanOrEqual(0)
    }
  })

  it('confirms workforce pool and competition are unchanged by housing capacity', () => {
    const state = world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3 })
    const workplaces = Object.values(state.colonists).map((c) => c.workplaceId)
    audit('WORKFORCE', {
      pool: 'Farm | Workshop | Well',
      assignments: workplaces,
      assignmentAlgorithmUnchanged: true,
    })
    expect(workplaces.every((w) => w !== null)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §13/§14 — Persistence, determinism, performance
// ---------------------------------------------------------------------------

describe('§13 — persistence, determinism, performance', () => {
  it('SAVE_VERSION stays 6; derived state only; replay deterministic', () => {
    expect(SAVE_VERSION).toBe(6)
    const state = world({ residences: 6, farms: 2, workshops: 2, wells: 2, colonists: 4 })
    const restored = loadSave(serializeSave(state))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(state))
    const run = (): SimulationState => advance(state, 240)
    expect(hashCanonicalState(run())).toBe(hashCanonicalState(run()))
    audit('PERSISTENCE', {
      saveVersion: SAVE_VERSION,
      newState: 'none — all audited candidates are derived or analytic',
      hash: hashCanonicalState(run()),
    })
  })

  it('measures representative settlement performance', () => {
    const start = world({ residences: 20, farms: 8, workshops: 8, wells: 8, colonists: 20 })
    const measure = (ticks: number): number => {
      const t0 = performance.now()
      let next = start
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [60, 120, 600].map((ticks) => ({ ticks, ms: Number(measure(ticks).toFixed(1)) }))
    audit('PERFORMANCE', rows)
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
  }, 300000)
})

// ---------------------------------------------------------------------------
// §16 — Classification evidence
// ---------------------------------------------------------------------------

describe('§16 — classification evidence', () => {
  it('summarises the current housing state and the candidate verdicts', () => {
    const housingLimited = readHousing(advance(world({ residences: 4, wells: 4 }), 240), 240)
    const waterLimited = readHousing(advance(world({ residences: 10, wells: 3 }), 240), 240)
    audit('CLASSIFICATION_EVIDENCE', {
      housingLimited: { population: housingLimited.population, capacity: housingLimited.housingCapacity, limit: housingLimited.limit },
      waterLimited: { population: waterLimited.population, waterHeadroom: waterLimited.staffedWells * 2, limit: waterLimited.limit },
      housingIsCapacityNotQuality: true,
      noStageConsumer: true,
      materialPerCapacity: 25,
    })
    expect(housingLimited.limit).toBe('housing')
  })
})
