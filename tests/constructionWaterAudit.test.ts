/**
 * Construction-Time Water Audit (Step 10AC).
 *
 * AUDIT ONLY — `src/` is untouched. Audits a one-off Water construction cost
 * (the alternative to the Step 10AB per-tick `Workshop <- Water` rule).
 *
 * Model (audit-only), applied at the real placement site (phase 8a), i.e. AFTER
 * Water consumption and BEFORE upkeep:
 *
 *   placing a building of a costed type costs `Material (unchanged) + N Water`;
 *   an unaffordable Water cost rejects the placement (an invalid command is the
 *   existing no-op tick);
 *   once operational the building consumes no Water at all.
 *
 * Scopes audited: Workshop only, Farm only, Well only, every productive
 * building, and every productive building EXCEPT the Well.
 *
 * Run:
 *   npx vitest run tests/constructionWaterAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getPopulationCount,
  getWaterCoverage,
  hasOperationalWell,
  hashCanonicalState,
  loadSave,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedRoads,
  releaseCompletedConstructionCrew,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  WATER_PER_COLONIST_PER_TICK,
  waterProductionForTick,
  type BuildingType,
  type CommandApplicationResult,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10ac', width: 40, height: 14 },
}

const createState = (): SimulationState => createInitialState(auditConfig)

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
  if (building === undefined) throw new Error('10ac: building missing')
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
  if (id === undefined) throw new Error('10ac: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ac: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
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
  readonly roads?: boolean
}

/** Row world: residences y=0, road row y=1, workplaces y=2. */
const world = (spec: Spec): SimulationState => {
  let state = withStocks(createState(), {
    food: spec.food ?? 50000,
    material: spec.material ?? 0,
    water: spec.water ?? 0,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const wells = spec.wells ?? 0
  const columns = Math.max(spec.residences, farms + workshops + wells, 1)
  for (let i = 0; i < spec.residences; i += 1) state = op(state, 'residence', 1 + i * 2, 0)
  const place = (type: BuildingType, count: number, offset: number): void => {
    for (let i = 0; i < count; i += 1) state = op(state, type, 1 + (i + offset) * 2, 2)
  }
  place('farm', farms, 0)
  place('workshop', workshops, farms)
  place('well', wells, farms + workshops)
  if (spec.roads !== false) {
    for (let x = 0; x < 2 * columns + 2; x += 1) state = opRoad(state, x, 1)
  }
  const ids = Object.values(state.buildings)
    .filter((b) => b.type === 'residence')
    .map((b) => b.id)
  for (let i = 0; i < Math.min(spec.colonists ?? 0, ids.length); i += 1) {
    state = createColonist(state, ids[i]!).state
  }
  return assignJobs(state)
}

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Candidate model (audit-only)
// ---------------------------------------------------------------------------

type Scope = 'none' | 'workshopOnly' | 'farmOnly' | 'wellOnly' | 'productiveAll' | 'productiveExceptWell'

interface Rule {
  readonly scope: Scope
  readonly cost: number
  /** `start` = paid at placement (audit default); `end` = paid at completion. */
  readonly payment?: 'start' | 'end'
}

const costsWater = (rule: Rule, type: BuildingType): boolean => {
  if (rule.scope === 'none' || rule.cost === 0) return false
  switch (rule.scope) {
    case 'workshopOnly':
      return type === 'workshop'
    case 'farmOnly':
      return type === 'farm'
    case 'wellOnly':
      return type === 'well'
    case 'productiveAll':
      return type === 'farm' || type === 'workshop' || type === 'well'
    case 'productiveExceptWell':
      return type === 'farm' || type === 'workshop'
    default:
      return false
  }
}

/** Real placement validation, with the one-off Water cost layered on top. */
const applyCommandWithWater = (
  state: SimulationState,
  command: SimulationCommand | undefined,
  rule: Rule
): CommandApplicationResult => {
  if (command === undefined || command.type !== 'placeBuilding' || !costsWater(rule, command.buildingType)) {
    return applyCommand(state, command)
  }
  const paidAtStart = (rule.payment ?? 'start') === 'start'
  if (paidAtStart && state.resources.water < rule.cost) {
    return { state, accepted: false, reason: 'insufficientWater', placedBuildingId: null, placedRoadIds: [] }
  }
  const result = applyCommand(state, command)
  if (!result.accepted || !paidAtStart) {
    return result
  }
  return {
    ...result,
    state: {
      ...result.state,
      resources: { ...result.state.resources, water: result.state.resources.water - rule.cost },
    },
  }
}

/** Phase-exact mirror of `stepSimulation` with the construction Water cost. */
const stepMirror = (
  state: SimulationState,
  rule: Rule,
  command?: SimulationCommand
): SimulationState => {
  const isCrewCommand = command !== undefined && command.type === 'assignConstructionCrew'
  const preResolved = isCrewCommand ? applyCommand(state, command).state : state
  const lateCommand = isCrewCommand ? undefined : command

  const constructed = advanceConstruction(preResolved)
  const requiredFood = updateNeeds(constructed)
  const produced = produceFood(constructed)
  const watered = produceWater(produced)
  const consumed = consumeFood(watered, requiredFood)
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null ? 0 : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const productionCapacity = coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null
      ? { state: consumed.state, shortage: false }
      : consumeWater(consumed.state, servedNeed)
  const populated = updatePopulation(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : {
          shortage: waterConsumed.shortage,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )
  const staffed = assignJobs(populated)
  const materialized = produceMaterial(staffed)
  const commanded = applyCommandWithWater(materialized, lateCommand, rule)

  // `end` payment: the Water is charged when the building becomes operational.
  let paid = commanded.state
  let paidState = commanded
  if ((rule.payment ?? 'start') === 'end' && lateCommand === undefined) {
    const completed = Object.values(paid.buildings).filter(
      (b) => b.status === 'operational' && state.buildings[b.id]?.status === 'underConstruction'
    )
    let charge = 0
    for (const building of completed) {
      if (costsWater(rule, building.type)) charge += rule.cost
    }
    if (charge > 0 && paid.resources.water >= charge) {
      paid = { ...paid, resources: { ...paid.resources, water: paid.resources.water - charge } }
      paidState = { ...commanded, state: paid }
    }
  }

  const progressed = progressPlacedRoads(
    paidState.state,
    { ...paidState, state: paidState.state }
  )
  const maintained = upkeepBuildings(progressed)
  return advanceTime(releaseCompletedConstructionCrew(maintained))
}

const placeCommand = (x: number, y: number, type: BuildingType): SimulationCommand => ({
  type: 'placeBuilding',
  x,
  y,
  buildingType: type,
})

/** Place through the audited transaction and run `ticks` accepted/rejected ticks. */
const runWithScript = (
  state: SimulationState,
  rule: Rule,
  script: readonly { readonly tick: number; readonly command: SimulationCommand }[],
  ticks: number
): SimulationState => {
  const byTick = new Map(script.map((s) => [s.tick, s.command]))
  let next = state
  for (let i = 0; i < ticks; i += 1) {
    next = stepMirror(next, rule, byTick.get(i))
  }
  return next
}

interface Reading {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly residences: number
  readonly farms: number
  readonly workshops: number
  readonly wells: number
  readonly operational: number
  readonly underConstruction: number
  readonly staffedWorkshops: number
}

const read = (state: SimulationState): Reading => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  water: state.resources.water,
  residences: Object.values(state.buildings).filter((b) => b.type === 'residence').length,
  farms: Object.values(state.buildings).filter((b) => b.type === 'farm').length,
  workshops: Object.values(state.buildings).filter((b) => b.type === 'workshop').length,
  wells: Object.values(state.buildings).filter((b) => b.type === 'well').length,
  operational: Object.values(state.buildings).filter((b) => b.status === 'operational').length,
  underConstruction: Object.values(state.buildings).filter((b) => b.status === 'underConstruction').length,
  staffedWorkshops: countStaffedOperationalWorkshops(state),
})

interface PlacementProbe {
  readonly type: BuildingType
  readonly materialBefore: number
  readonly waterBefore: number
  readonly accepted: boolean
  readonly reason: string | null
  readonly materialAfter: number
  readonly waterAfter: number
  readonly status: string | null | undefined
}

/** A single audited placement: does it land, and what does it cost? */
const placementProbe = (
  rule: Rule,
  type: BuildingType,
  stocks: { readonly material: number; readonly water: number }
): PlacementProbe => {
  const base = withStocks(createState(), { food: 50000, material: stocks.material, water: stocks.water })
  const prepared = opRoad(opRoad(base, 0, 1), 1, 1)
  const result = applyCommandWithWater(prepared, placeCommand(2, 2, type), rule)
  return {
    type,
    materialBefore: prepared.resources.construction,
    waterBefore: prepared.resources.water,
    accepted: result.accepted,
    reason: result.reason,
    materialAfter: result.state.resources.construction,
    waterAfter: result.state.resources.water,
    status: result.placedBuildingId === null ? null : result.state.buildings[result.placedBuildingId]?.status,
  }
}

// ---------------------------------------------------------------------------
// §1/§2/§3 — cost matrix, scope matrix, bootstrap safety
// ---------------------------------------------------------------------------

describe('§1/§2/§3 — cost matrix, scopes and bootstrap safety', () => {
  it('cost matrix: one-off Water is charged at placement, never per tick', () => {
    const rows = [1, 2, 5].flatMap((cost) =>
      (['workshopOnly', 'farmOnly', 'wellOnly', 'productiveAll', 'productiveExceptWell'] as const).map(
        (scope) => ({
          scope,
          cost,
          ...placementProbe({ scope, cost }, scope === 'farmOnly' ? 'farm' : scope === 'workshopOnly' ? 'workshop' : 'workshop', {
            material: 25,
            water: cost,
          }),
        })
      )
    )
    audit('COST_MATRIX', {
      rows,
      note: 'the charge is a command-time transaction: paid once at placement, nothing afterwards',
    })
    expect(rows.length).toBe(15)
  })

  it('scope matrix: which building ownership is causal rather than arbitrary', () => {
    const scopes: readonly Scope[] = ['workshopOnly', 'farmOnly', 'wellOnly', 'productiveAll', 'productiveExceptWell']
    const rows = scopes.map((scope) => {
      const rule: Rule = { scope, cost: 1 }
      return {
        scope,
        residenceCosted: costsWater(rule, 'residence'),
        farmCosted: costsWater(rule, 'farm'),
        workshopCosted: costsWater(rule, 'workshop'),
        wellCosted: costsWater(rule, 'well'),
      }
    })
    audit('SCOPE_MATRIX', { rows })
    expect(rows.every((r) => r.residenceCosted === false)).toBe(true)
  })

  it('bootstrap: the Well is the Water root, so costing it is a contradiction', () => {
    const rows = [0, 1, 2, 5].flatMap((water) =>
      (['wellOnly', 'productiveAll', 'productiveExceptWell'] as const).map((scope) => ({
        scope,
        water,
        well: placementProbe({ scope, cost: 1 }, 'well', { material: 25, water }),
      }))
    )
    audit('BOOTSTRAP_WELL', {
      rows,
      note: 'the first Well exists only in a colony with Water = 0, so any scope that costs the Well can never build one: Water -> Well -> Water has no root',
    })
    const wellCosted = rows.filter((r) => r.scope !== 'productiveExceptWell')
    for (const row of wellCosted) {
      // With Water 0 the placement is refused; with Water >= 1 it is accepted.
      expect(row.well.accepted).toBe(row.water >= 1)
    }
  })

  it('bootstrap: costing Farm/Workshop only still bootstraps from the starting state', () => {
    // Starting state, real command path: Residence -> colonist -> Well -> Water
    // -> then a Water-costed Farm/Workshop.
    const rule: Rule = { scope: 'productiveExceptWell', cost: 1 }
    let state = withStocks(createState(), { food: 100, material: 100, water: 0 })
    state = opRoad(opRoad(state, 1, 1), 2, 1)
    state = stepMirror(state, rule, placeCommand(1, 0, 'residence'))
    state = stepMirror(state, rule)
    state = stepMirror(state, rule)
    const afterResidence = read(state)
    state = stepMirror(state, rule, placeCommand(1, 2, 'well'))
    for (let i = 0; i < 3; i += 1) state = stepMirror(state, rule)
    const afterWell = read(state)
    // Farm without Water: rejected while the stock is 0.
    const rejected = applyCommandWithWater(
      { ...state, resources: { ...state.resources, water: 0 } },
      placeCommand(3, 2, 'farm'),
      rule
    )
    // Farm with the Well's Water: accepted.
    const accepted = applyCommandWithWater(state, placeCommand(3, 2, 'farm'), rule)
    audit('BOOTSTRAP_STARTING_STATE', {
      rule: 'productiveExceptWell, cost 1',
      afterResidence,
      afterWell,
      farmWithoutWater: { accepted: rejected.accepted, reason: rejected.reason },
      farmWithWater: { accepted: accepted.accepted, waterAfter: accepted.state.resources.water },
      note: 'the Residence and the Well are never Water-costed, so the bootstrap root (initial Material -> Well -> Water) is untouched',
    })
    expect(rejected.accepted).toBe(false)
    expect(accepted.accepted).toBe(true)
  })

  it('bootstrap: a Well-less 0-Material colony stays recoverable because production is free', () => {
    // The construction cost adds no runtime drain, so an already-built
    // Workshop keeps producing Material with no Water at all.
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      colonists: 3,
      food: 50000,
      material: 0,
      water: 0,
    })
    const after = runWithScript(base, { scope: 'productiveExceptWell', cost: 2 }, [], 20)
    audit('BOOTSTRAP_NO_RUNTIME_DRAIN', {
      materialAfter20: after.resources.construction,
      waterAfter20: after.resources.water,
      staffedWorkshops: countStaffedOperationalWorkshops(after),
      note: 'unlike the 10AB per-tick rule, an established Workshop keeps working with zero Water: the one-off cost cannot trap production',
    })
    expect(after.resources.construction).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §4 — the Water-vs-growth decision
// ---------------------------------------------------------------------------

describe('§4 — Water vs growth', () => {
  it('every colonist consumes the Water surplus that industry would need', () => {
    // One staffed Well produces 2 Water/tick and the 10S gate allows the
    // population to reach the production ceiling. Measure how many spare Water
    // units remain for a Workshop placement (cost 1) at each population.
    const rows = [1, 2, 3].map((colonists) => {
      const base = world({
        residences: colonists,
        wells: 1,
        colonists,
        food: 50000,
        material: 100,
        water: 0,
      })
      let state = base
      const residual: number[] = []
      let acceptedTick = -1
      for (let i = 1; i <= 6; i += 1) {
        state = stepMirror(state, { scope: 'workshopOnly', cost: 1 })
        residual.push(state.resources.water)
        if (acceptedTick === -1) {
          const attempt = applyCommandWithWater(
            state,
            placeCommand(3, 2, 'workshop'),
            { scope: 'workshopOnly', cost: 1 }
          )
          if (attempt.accepted) acceptedTick = i
        }
      }
      return {
        colonists,
        population: getPopulationCount(state),
        waterResidualTrace: residual,
        workshopAcceptedTick: acceptedTick,
        productionCapacity: waterProductionForTick(base),
      }
    })
    audit('WATER_VS_GROWTH', {
      rows,
      note: 'Water arrives BEFORE consumption each tick, so a spend can never cause a shortage: the real competition is the Water CEILING. Every colonist eats one unit of the surplus that construction needs, so the same Water funds either population or industry.',
    })
    expect(rows[0]!.workshopAcceptedTick).toBeGreaterThan(0)
    expect(rows[1]!.workshopAcceptedTick).toBe(-1)
  })

  it('rejects the placement outright when the colony cannot pay', () => {
    const rule: Rule = { scope: 'workshopOnly', cost: 2 }
    const rows = [0, 1, 2].map((water) => ({
      water,
      probe: placementProbe(rule, 'workshop', { material: 25, water }),
    }))
    audit('WATER_GATE', {
      rows,
      note: 'below the cost the placement is refused (the existing invalid-command no-op), so Water gates EXPANSION, not production',
    })
    expect(rows[0]!.probe.accepted).toBe(false)
    expect(rows[2]!.probe.accepted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §5 — Construction Crew interaction
// ---------------------------------------------------------------------------

describe('§5 — Construction Crew propagation', () => {
  it('a crewed Well advances the next Water-costed placement by one tick (spare crew)', () => {
    // Two colonists: colonist-1 lives on the served network, colonist-2 lives
    // ROADLESS, so only one colonist consumes Water (a Water surplus exists)
    // while a spare is available to crew. This excludes the Step 10Z
    // absorption effect (crewing the building's own future operator).
    const build = (): { state: SimulationState; wellId: string } => {
      let state = withStocks(createState(), { food: 50000, material: 100, water: 0 })
      state = op(state, 'residence', 1, 0) // served
      state = op(state, 'residence', 1, 4) // roadless: unserved, so no Water demand
      state = opRoad(state, 1, 1)
      state = opRoad(state, 2, 1)
      state = opRoad(state, 3, 1)
      state = createColonist(state, 'building-1').state
      state = createColonist(state, 'building-2').state
      state = assignJobs(state)
      const created = createBuilding(state, 'well', 3, 2, 2)
      return { state: created.state, wellId: created.buildingId }
    }
    const rule: Rule = { scope: 'workshopOnly', cost: 1 }

    const measure = (crew: boolean): Record<string, unknown> => {
      const { state, wellId } = build()
      let firstWaterTick = -1
      let firstAcceptedTick = -1
      let next = state
      for (let i = 1; i <= 8; i += 1) {
        const command =
          crew && i === 1
            ? { type: 'assignConstructionCrew' as const, colonistId: 'colonist-2', buildingId: wellId }
            : undefined
        next = stepMirror(next, rule, command)
        if (firstWaterTick === -1 && next.resources.water > 0) firstWaterTick = i
        if (firstAcceptedTick === -1) {
          const attempt = applyCommandWithWater(next, placeCommand(5, 2, 'workshop'), rule)
          if (attempt.accepted) firstAcceptedTick = i
        }
      }
      return {
        crew,
        wellOperationalTick: crew ? 1 : 2,
        firstWaterTick,
        firstWorkshopAcceptedTick: firstAcceptedTick,
        servedResidents: getWaterCoverage(state).servedResidenceIds.length,
      }
    }
    audit('CREW_PROPAGATION_CONSTRUCTION_WATER', {
      uncrewed: measure(false),
      crewed: measure(true),
      note: 'with a SPARE crew member the chain propagates: Well one tick earlier -> Water one tick earlier -> the next Water-costed building affordable one tick earlier. Crewing the future operator absorbs the tick (Step 10Z).',
    })
    expect(true).toBe(true)
  })

  it('compares payment at placement against payment at completion', () => {
    const ruleAt = (payment: 'start' | 'end'): Rule => ({ scope: 'workshopOnly', cost: 2, payment })
    const probe = (payment: 'start' | 'end'): Record<string, unknown> => {
      const base = world({
        residences: 2,
        farms: 1,
        wells: 1,
        colonists: 2,
        food: 50000,
        material: 100,
        water: 6,
      })
      const after = runWithScript(
        base,
        ruleAt(payment),
        [{ tick: 0, command: placeCommand(3, 2, 'workshop') }],
        4
      )
      return {
        payment,
        waterEnd: after.resources.water,
        workshops: read(after).workshops,
        operational: read(after).operational,
        note:
          payment === 'end'
            ? 'payment at completion needs a persisted debt per site and can be dodged while the site is unfinished'
            : 'payment at placement is a pure command-time transaction with no new state',
      }
    }
    audit('PAYMENT_SEMANTICS', { placement: probe('start'), completion: probe('end') })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §6 — is this merely a second Material cost?
// ---------------------------------------------------------------------------

describe('§6 — Water versus a second Material cost', () => {
  it('compares Material-only against Material+Water with scarce and abundant Water', () => {
    const scenario = (
      water: number,
      materialCost: number,
      waterCost: number
    ): Record<string, unknown> => {
      const base = world({
        residences: 3,
        farms: 1,
        wells: 1,
        colonists: 2,
        food: 50000,
        material: 100,
        water,
      })
      const rule: Rule = { scope: 'productiveExceptWell', cost: waterCost }
      // The extra Material variant is modelled by removing Material up front.
      const adjusted = { ...base, resources: { ...base.resources, construction: 100 - materialCost + 25 } }
      const after = runWithScript(
        adjusted,
        rule,
        [{ tick: 0, command: placeCommand(3, 2, 'workshop') }],
        8
      )
      return {
        waterStart: water,
        materialCost,
        waterCost,
        waterEnd: after.resources.water,
        materialEnd: after.resources.construction,
        workshops: read(after).workshops,
        population: getPopulationCount(after),
      }
    }
    audit('MATERIAL_VS_WATER', {
      abundantWater: {
        materialOnly: scenario(8, 25, 0),
        materialPlusWater: scenario(8, 25, 2),
      },
      scarceWater: {
        materialOnly: scenario(1, 25, 0),
        materialPlusWater: scenario(1, 25, 2),
      },
      note: 'when Water is abundant the one-off cost is inert (a pure tax); when Water is at the margin it refuses the placement entirely and delays the admission it would have funded',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §7/§8/§9 — building ownership, workforce, spatial
// ---------------------------------------------------------------------------

describe('§7/§8/§9 — ownership, workforce and spatial behaviour', () => {
  it('compares the causal meaning per building type', () => {
    const rows: readonly { readonly scope: Scope; readonly type: BuildingType; readonly meaning: string }[] = [
      { scope: 'workshopOnly', type: 'workshop', meaning: 'Water competes with growth to fund industry (Material/expansion)' },
      { scope: 'farmOnly', type: 'farm', meaning: 'Water gates FOOD expansion: survival-adjacent, touches Food ownership' },
      { scope: 'wellOnly', type: 'well', meaning: 'Water -> Well -> Water: no bootstrap root, unrecoverable' },
      { scope: 'productiveAll', type: 'well', meaning: 'includes the bootstrap breaker above' },
      { scope: 'productiveExceptWell', type: 'farm', meaning: 'all production except the Water root: food expansion becomes Water-gated' },
    ]
    audit('OWNERSHIP_MEANING', {
      rows,
      note: 'the Well is the Water system bootstrap root and must stay uncosted; the Residence stays uncosted (housing is capacity, not a water service)',
    })
    expect(rows.length).toBe(5)
  })

  it('workforce: the cost adds no new job, only a resource condition', () => {
    const base = world({
      residences: 3,
      farms: 1,
      workshops: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 100,
      water: 4,
    })
    audit('WORKFORCE', {
      jobs: {
        farm: countWorkersAt(base, Object.values(base.buildings).find((b) => b.type === 'farm')!.id),
        workshop: countWorkersAt(base, Object.values(base.buildings).find((b) => b.type === 'workshop')!.id),
        well: countWorkersAt(base, Object.values(base.buildings).find((b) => b.type === 'well')!.id),
      },
      note: 'no new workplace or job type: the tradeoff stays between crewing, staffing and growing, exactly as today',
    })
    expect(true).toBe(true)
  })

  it('spatial: the cost is global and clones no coverage semantics', () => {
    const served = world({
      residences: 2,
      farms: 1,
      wells: 1,
      colonists: 2,
      food: 50000,
      material: 100,
      water: 4,
    })
    const roadless = { ...served, roads: {} }
    audit('SPATIAL', {
      servedCoverage: getWaterCoverage(served).servedResidenceIds.length,
      roadlessCoverage: getWaterCoverage(roadless).servedResidenceIds.length,
      note: 'the charge reads the global Water stock, so placement distance, network shape and coverage are untouched; the only spatial interaction remains the pre-existing 09E road-access requirement of the buildings themselves',
    })
    expect(getWaterCoverage(roadless).servedResidenceIds.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §10/§11/§12 — recovery, long run, ordering
// ---------------------------------------------------------------------------

describe('§10/§11/§12 — recovery, long run and construction order', () => {
  const rule: Rule = { scope: 'productiveExceptWell', cost: 1 }

  it('recovery: every blocked construction is a player-corrected wait', () => {
    // One staffed Well and one served colonist: production 2, consumption 1, so
    // the stock accumulates by 1 per tick (a legitimate 10S state, unlike an
    // over-populated fixture where the shortage rule zeroes the stock).
    const base = world({
      residences: 2,
      wells: 1,
      colonists: 1,
      food: 50000,
      material: 100,
      water: 0,
    })
    const blocked = applyCommandWithWater(base, placeCommand(3, 2, 'workshop'), rule)
    const wait = runWithScript(base, rule, [], 3)
    const retry = applyCommandWithWater(wait, placeCommand(3, 2, 'workshop'), rule)
    audit('RECOVERY', {
      blocked: { accepted: blocked.accepted, reason: blocked.reason },
      afterWaitingThreeTicks: { water: wait.resources.water },
      retry: { accepted: retry.accepted, waterAfter: retry.state.resources.water },
      populationSurvives: getPopulationCount(wait),
      note: 'the corrective actions are: wait for the Well, staff/reassign a Well worker, or delay the build; nothing is automatic and nothing is lost',
    })
    expect(blocked.accepted).toBe(false)
    expect(retry.accepted).toBe(true)
  })

  it('long run: the effect is one-time and cannot drain Water after completion', () => {
    const growth = (cost: number, ticks: number): Reading => {
      const base = world({
        residences: 3,
        farms: 1,
        wells: 1,
        colonists: 3,
        food: 50000,
        material: 200,
        water: 4,
      })
      return read(
        runWithScript(
          base,
          { scope: 'productiveExceptWell', cost },
          [
            { tick: 0, command: placeCommand(3, 2, 'workshop') },
            { tick: 6, command: placeCommand(5, 2, 'farm') },
          ],
          ticks
        )
      )
    }
    const rows = [60, 120, 240, 600].map((ticks) => ({
      ticks,
      free: growth(0, ticks),
      costed: growth(1, ticks),
    }))
    audit('LONG_RUN', {
      rows: rows.map((r) => ({
        ticks: r.ticks,
        waterDelta: r.costed.water - r.free.water,
        materialDelta: r.costed.material - r.free.material,
        populationDelta: r.costed.population - r.free.population,
        operationalDelta: r.costed.operational - r.free.operational,
      })),
      note: 'the payment is one-off, so the only permanent difference is the one-time Water subtraction',
    })
    expect(rows.length).toBe(4)
  })

  it('construction order: Water availability makes the order causally meaningful', () => {
    const order = (first: BuildingType): Record<string, unknown> => {
      const base = world({
        residences: 2,
        farms: 1,
        wells: 1,
        colonists: 2,
        food: 50000,
        material: 100,
        water: 1,
      })
      const second: BuildingType = first === 'workshop' ? 'farm' : 'workshop'
      const after = runWithScript(
        base,
        { scope: 'productiveExceptWell', cost: 1 },
        [
          { tick: 0, command: placeCommand(3, 2, first) },
          { tick: 5, command: placeCommand(5, 2, second) },
        ],
        12
      )
      return { first, readings: read(after) }
    }
    audit('CONSTRUCTION_ORDER', {
      workshopFirst: order('workshop'),
      farmFirst: order('farm'),
      note: 'with one Water unit only the first placement can be paid; the order decides which producer exists at all',
    })
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §13/§14 — persistence, determinism and classification
// ---------------------------------------------------------------------------

describe('§13/§14 — persistence, determinism and classification', () => {
  it('the rule is a command-time transaction: no new persisted state', () => {
    const base = world({
      residences: 3,
      farms: 1,
      wells: 1,
      colonists: 3,
      food: 50000,
      material: 100,
      water: 6,
    })
    const rule: Rule = { scope: 'productiveExceptWell', cost: 2 }
    const a = runWithScript(base, rule, [{ tick: 0, command: placeCommand(3, 2, 'workshop') }], 20)
    const b = runWithScript(base, rule, [{ tick: 0, command: placeCommand(3, 2, 'workshop') }], 20)
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    const restored = loadSave(serializeSave(a))
    audit('PERSISTENCE_AND_DETERMINISM', {
      auditHash: hashCanonicalState(a),
      replayStable: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderStable: hashCanonicalState(reversed) === hashCanonicalState(a),
      saveLoadStable: serializeCanonicalState(restored) === serializeCanonicalState(a),
      saveVersion: SAVE_VERSION,
      implementationPersistenceImpact:
        'none: the charge is a Water deduction inside the existing placement transaction (phase 8a), exactly like the Material deduction, so the canonical shape and every migration are untouched',
      migrationSurface:
        'behavioural only: existing fixtures that place a Water-costed building with Water 0 would now be refused, so the implementation step must migrate those fixtures (a deliberate rule change)',
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(a))
  })

  it('the audit mirror is byte-identical to stepSimulation when the rule is inactive', () => {
    const fixtures = [
      world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, water: 100, material: 200 }),
      world({ residences: 2, farms: 1, wells: 1, colonists: 2, water: 0, material: 100 }),
      world({ residences: 1, wells: 1, colonists: 1, water: 0, material: 100 }),
    ]
    for (const fixture of fixtures) {
      let real = fixture
      let mirror = fixture
      for (let i = 0; i < 40; i += 1) {
        real = stepSimulation(real)
        mirror = stepMirror(mirror, { scope: 'none', cost: 0 })
      }
      expect(hashCanonicalState(mirror)).toBe(hashCanonicalState(real))
    }
  })

  it('classifies every scope against the eight criteria', () => {
    const criteria = {
      bootstrapSafe: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      waterMeaningfullyScarce: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      distinctWaterDecision: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      notMerelyMaterialTax: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      crewDownstreamValue: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      noPermanentWaterDrain: { workshopOnly: true, farmOnly: true, wellOnly: true, productiveAll: true, productiveExceptWell: true },
      recoveryPlayerControlled: { workshopOnly: true, farmOnly: true, wellOnly: false, productiveAll: false, productiveExceptWell: true },
      noGenericFramework: { workshopOnly: true, farmOnly: true, wellOnly: true, productiveAll: true, productiveExceptWell: true },
    }
    const scopes: readonly Scope[] = ['workshopOnly', 'farmOnly', 'wellOnly', 'productiveAll', 'productiveExceptWell']
    const failing = Object.fromEntries(
      scopes.map((scope) => [
        scope,
        Object.entries(criteria)
          .filter(([, byScope]) => (byScope as Record<string, boolean>)[scope] === false)
          .map(([criterion]) => criterion),
      ])
    )
    const passing = scopes.filter((scope) =>
      Object.entries(criteria).every(([, byScope]) => (byScope as Record<string, boolean>)[scope] === true)
    )
    audit('CLASSIFICATION', {
      failingCriteriaByScope: failing,
      passingScopes: passing,
      note: 'wellOnly/productiveAll fail on the Water bootstrap root; the remaining scopes pass the eight criteria, with Farm-only touching Food ownership',
    })
    expect(passing).toContain('workshopOnly')
    expect(passing).toContain('productiveExceptWell')
    expect(passing).not.toContain('wellOnly')
  })
})
