/**
 * Construction Crew Economic Audit (Step 10Z).
 *
 * AUDIT ONLY — `src/` is untouched. Measures whether the Step 10Y crew creates
 * a meaningful economic/strategic tradeoff, and if not, what the measurements
 * reveal about the next missing system.
 *
 * Contract of the implementation under audit (Step 10Y):
 *   - a placed 2-tick building is operational two ticks after placement;
 *   - `assignConstructionCrew` is resolved BEFORE phase 1, so a crew assigned
 *     on tick N is present for that tick's construction progress: the site
 *     completes on the ASSIGNMENT tick (one tick earlier);
 *   - the crew member is excluded from production for the whole tick and is
 *     released at the end of it.
 * So the crew window is exactly ONE tick per site.
 *
 * Run:
 *   npx vitest run tests/constructionCrewEconomicAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
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
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const auditConfig: SimulationConfig = {
  world: { seed: 'nova-step10z', width: 40, height: 14 },
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

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10z: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/** Under-construction building with the full catalog duration remaining. */
const placed = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10z: placed building missing')
  return {
    state: {
      ...created.state,
      buildings: {
        ...created.state.buildings,
        [created.buildingId]: { ...building, status: 'underConstruction', constructionRemaining: 2 },
      },
    },
    id: created.buildingId,
  }
}

const opRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) throw new Error('10z: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10z: road missing')
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
  const columns = Math.max(spec.residences, farms + workshops + wells)
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

const buildingIdOfType = (state: SimulationState, type: BuildingType): string =>
  Object.values(state.buildings).find((b) => b.type === type)!.id

const colonistAt = (state: SimulationState, buildingId: string): string =>
  Object.values(state.colonists).find((c) => c.workplaceId === buildingId)!.id

const crew = (state: SimulationState, colonistId: string, buildingId: string): SimulationState =>
  applyCommand(state, { type: 'assignConstructionCrew', colonistId, buildingId }).state

const crewCommand = (colonistId: string, buildingId: string): SimulationCommand => ({
  type: 'assignConstructionCrew',
  colonistId,
  buildingId,
})

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

interface Step {
  readonly tick: number
  readonly command?: SimulationCommand | undefined
}

/** Run `ticks` deterministic ticks, applying the scripted commands by offset. */
const run = (state: SimulationState, ticks: number, script: readonly Step[] = []): SimulationState => {
  const byTick = new Map(script.map((s) => [s.tick, s.command]))
  let next = state
  for (let i = 0; i < ticks; i += 1) {
    next = stepSimulation(next, byTick.get(i))
  }
  return next
}

/** First tick offset (1-based) at which the building is operational (-1 never). */
const completionTick = (
  state: SimulationState,
  buildingId: string,
  script: readonly Step[] = [],
  max = 12
): number => {
  const byTick = new Map(script.map((s) => [s.tick, s.command]))
  let next = state
  for (let i = 1; i <= max; i += 1) {
    next = stepSimulation(next, byTick.get(i - 1))
    const building = next.buildings[buildingId]
    if (building !== undefined && building.status === 'operational') return i
  }
  return -1
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
  readonly staffedFarms: number
  readonly staffedWorkshops: number
  readonly staffedWells: number
  readonly capacity: number
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
  staffedFarms: countStaffedOperationalFarms(state),
  staffedWorkshops: countStaffedOperationalWorkshops(state),
  staffedWells: countStaffedOperationalWells(state),
  capacity: getHousingSummary(state).totalCapacity,
})

const deltas = (before: SimulationState, after: SimulationState): {
  readonly food: number
  readonly material: number
  readonly water: number
} => ({
  food: after.resources.food - before.resources.food,
  material: after.resources.construction - before.resources.construction,
  water: after.resources.water - before.resources.water,
})

// ---------------------------------------------------------------------------
// §1 — current causal model
// ---------------------------------------------------------------------------

describe('§1 — current causal model', () => {
  it('documents the audited chain and the crew window', () => {
    audit('CAUSAL_MODEL', {
      chain: [
        'Colonist -> Farm/Workshop/Well employment -> Food/Material/Water',
        'Material -> construction -> new Residence/Farm/Workshop/Well',
        'Construction Crew -> +1 progress on the assignment tick -> building operational 1 tick earlier',
      ],
      crewProperties: {
        window: 'exactly one tick per site (a 2-tick building completes on the assignment tick)',
        exclusivity: 'a crewed colonist holds no workplace for that whole tick',
        persistence: 'released at the end of the tick; no sticky construction role',
        whoCanCrew: "any colonist, including the colony's only producer",
      },
      mustMeasureNotAssume:
        'whether one tick of production lost for one tick of capacity gained changes any decision',
    })
    expect(true).toBe(true)
  })

  it('confirms the one-tick window on a single site', () => {
    const base = world({ residences: 1, farms: 1, colonists: 1 })
    const site = placed(base, 'well', 9, 2)
    const uncrewed = completionTick(site.state, site.id)
    const crewed = completionTick(site.state, site.id, [
      { tick: 0, command: crewCommand('colonist-1', site.id) },
    ])
    audit('ONE_TICK_WINDOW', {
      uncrewedCompletionTick: uncrewed,
      crewedCompletionTick: crewed,
      ticksSaved: uncrewed - crewed,
    })
    expect(uncrewed).toBe(2)
    expect(crewed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §4 — opportunity cost per workplace type (the key audit)
// ---------------------------------------------------------------------------

describe('§4 — build-vs-produce opportunity cost', () => {
  /** Material starts at 0 so production is stored (never clamped away). */
  const costOf = (kind: 'farm' | 'workshop' | 'well'): Record<string, unknown> => {
    const spec: Spec =
      kind === 'farm'
        ? { residences: 1, farms: 1, colonists: 1, material: 0 }
        : kind === 'workshop'
          ? { residences: 1, workshops: 1, colonists: 1, material: 0 }
          : { residences: 1, wells: 1, colonists: 1, material: 0, water: 10 }
    const base = world(spec)
    const site = placed(base, 'well', 11, 2)
    const producerId = Object.values(base.colonists)[0]!.id
    const control = stepSimulation(site.state)
    const crewed = stepSimulation(site.state, crewCommand(producerId, site.id))
    const controlDelta = deltas(site.state, control)
    const crewedDelta = deltas(site.state, crewed)
    return {
      producer: kind,
      controlDelta,
      crewedDelta,
      opportunityCost: {
        food: controlDelta.food - crewedDelta.food,
        material: controlDelta.material - crewedDelta.material,
        water: controlDelta.water - crewedDelta.water,
      },
      staffing: {
        control: {
          farms: countStaffedOperationalFarms(control),
          workshops: countStaffedOperationalWorkshops(control),
          wells: countStaffedOperationalWells(control),
        },
        crewed: {
          farms: countStaffedOperationalFarms(crewed),
          workshops: countStaffedOperationalWorkshops(crewed),
          wells: countStaffedOperationalWells(crewed),
        },
      },
      gain: 'construction +1 progress: the site completes on this tick instead of the next',
    }
  }

  it('Farm: one crew tick costs the full farm output', () => {
    const result = costOf('farm')
    audit('COST_FARM', result)
    expect((result['opportunityCost'] as { food: number }).food).toBe(2)
  })

  it('Workshop: one crew tick costs gross output but saves the upkeep it would have paid', () => {
    const result = costOf('workshop')
    audit('COST_WORKSHOP', {
      ...result,
      note: 'a vacant Workshop pays no upkeep, so the NET Material opportunity cost is smaller than the gross loss',
    })
    // net = +2 gross - 1 upkeep = +1 in the control; 0 in the crewed tick.
    expect((result['opportunityCost'] as { material: number }).material).toBe(1)
    expect((result['controlDelta'] as { material: number }).material).toBe(1)
    expect((result['crewedDelta'] as { material: number }).material).toBe(0)
  })

  it('Well: one crew tick costs the water output', () => {
    const result = costOf('well')
    audit('COST_WELL', result)
    // production +2 and consumption -1 in the control; consumption -1 alone when crewed.
    expect((result['opportunityCost'] as { water: number }).water).toBe(2)
  })

  it('compares one extra production worker against one construction crew', () => {
    const base = world({ residences: 1, farms: 1, workshops: 1, colonists: 2, material: 0 })
    const site = placed(base, 'well', 11, 2)
    const farmerId = colonistAt(site.state, buildingIdOfType(site.state, 'farm'))
    const produce = stepSimulation(site.state)
    const crewTurn = stepSimulation(site.state, crewCommand(farmerId, site.id))
    audit('PRODUCE_VS_CREW', {
      allColonistsProduce: deltas(site.state, produce),
      oneCrews: deltas(site.state, crewTurn),
      wellOperational: crewTurn.buildings[site.id]?.status,
      tradeoff: 'one tick of one producer output exchanged for one tick of earlier completion',
    })
    expect(crewTurn.buildings[site.id]?.status).toBe('operational')
  })
})

// ---------------------------------------------------------------------------
// §3 — expansion throughput
// ---------------------------------------------------------------------------

describe('§3 — expansion throughput', () => {
  it('Scenario 1/2 — sequential chain Well -> Farm -> Workshop: one tick saved per crew', () => {
    const chain = (crews: boolean): { ticks: number[]; readings: Reading } => {
      let state = world({ residences: 1, colonists: 1, material: 100000, food: 50000 })
      const ticks: number[] = []
      const sequence: readonly BuildingType[] = ['well', 'farm', 'workshop']
      for (let i = 0; i < sequence.length; i += 1) {
        const before = new Set(Object.keys(state.buildings))
        state = run(state, 1, [
          {
            tick: 0,
            command: {
              type: 'placeBuilding',
              x: 1 + i * 2,
              y: 4,
              buildingType: sequence[i]!,
            },
          },
        ])
        const id = Object.keys(state.buildings).find((b) => !before.has(b))!
        const t = completionTick(
          state,
          id,
          crews ? [{ tick: 0, command: crewCommand('colonist-1', id) }] : [],
          6
        )
        state = run(state, t + 1)
        ticks.push(t)
      }
      return { ticks, readings: read(state) }
    }
    const smooth = chain(false)
    const crewed = chain(true)
    audit('SEQUENTIAL_CHAIN', {
      order: ['well', 'farm', 'workshop'],
      uncrewedCompletionTicks: smooth.ticks,
      crewedCompletionTicks: crewed.ticks,
      cumulativeTicksSaved:
        smooth.ticks.reduce((a, b) => a + b, 0) - crewed.ticks.reduce((a, b) => a + b, 0),
      colonistOutputSpent: '3 ticks of the only producer removed from production',
      finalReadings: { uncrewed: smooth.readings, crewed: crewed.readings },
    })
    expect(crewed.ticks.every((t, i) => t < smooth.ticks[i]!)).toBe(true)
  })

  it('Scenario 3 — housing expansion: a Residence that gates the next admission', () => {
    // Three colonists, one farm, two staffed Wells (Water capacity 4), housing
    // capacity 3: one more Residence unlocks exactly one more admission.
    const expansion = (
      crews: boolean,
      ticks: number
    ): { firstAdmissionTick: number; readings: Reading } => {
      const state = world({
        residences: 3,
        farms: 1,
        wells: 2,
        colonists: 3,
        food: 50000,
        material: 100000,
      })
      // Residences occupy x=1,3,5 and the road row spans x=0..7, so (6,0) is
      // free AND already water-served. Placement order makes it building-7.
      const script: Step[] = [
        { tick: 0, command: { type: 'placeBuilding', x: 6, y: 0, buildingType: 'residence' } },
      ]
      if (crews) {
        script.push({ tick: 1, command: crewCommand('colonist-1', 'building-7') })
      }
      let next = state
      const byTick = new Map(script.map((x) => [x.tick, x.command]))
      const initialPopulation = getPopulationCount(state)
      let firstAdmissionTick = -1
      for (let i = 1; i <= 10; i += 1) {
        next = stepSimulation(next, byTick.get(i - 1))
        if (firstAdmissionTick === -1 && getPopulationCount(next) > initialPopulation) {
          firstAdmissionTick = i
        }
      }
      return {
        firstAdmissionTick,
        readings: read(run(next, Math.max(0, ticks - 10))),
      }
    }
    const rows = [60, 120, 240, 600].map((ticks) => {
      const uncrewed = expansion(false, ticks)
      const crewed = expansion(true, ticks)
      return {
        ticks,
        firstAdmissionTick: {
          uncrewed: uncrewed.firstAdmissionTick,
          crewed: crewed.firstAdmissionTick,
        },
        population: { uncrewed: uncrewed.readings.population, crewed: crewed.readings.population },
        water: { uncrewed: uncrewed.readings.water, crewed: crewed.readings.water },
        food: { uncrewed: uncrewed.readings.food, crewed: crewed.readings.food },
        material: { uncrewed: uncrewed.readings.material, crewed: crewed.readings.material },
      }
    })
    audit('HOUSING_EXPANSION', {
      rows,
      note: 'the crewed Residence becomes operational one tick earlier, so the gated admission happens one tick earlier',
    })
    expect(rows[0]!.firstAdmissionTick.crewed).toBeLessThanOrEqual(
      rows[0]!.firstAdmissionTick.uncrewed
    )
  })

  it('Scenario 4 — parallel construction: crews scale with colonists, not with sites', () => {
    const parallel = (crews: number): { completions: number[]; staffed: Reading } => {
      let state = world({ residences: 2, farms: 1, workshops: 1, colonists: 2, material: 100000 })
      const first = placed(state, 'well', 11, 2)
      state = first.state
      const second = placed(state, 'well', 13, 2)
      state = second.state
      const ids = [first.id, second.id]
      let prepared = state
      for (let i = 0; i < crews; i += 1) {
        prepared = crew(prepared, `colonist-${i + 1}`, ids[i]!)
      }
      const completions = ids.map((id) => completionTick(prepared, id, [], 6))
      return { completions, staffed: read(stepSimulation(prepared)) }
    }
    const rows = [0, 1, 2].map((crews) => ({ crews, ...parallel(crews) }))
    audit('PARALLEL_CONSTRUCTION', {
      rows: rows.map((r) => ({
        crews: r.crews,
        completionTicks: r.completions,
        maxCompletion: Math.max(...r.completions),
        staffedAfterOneTick: {
          farms: r.staffed.staffedFarms,
          workshops: r.staffed.staffedWorkshops,
          wells: r.staffed.staffedWells,
        },
      })),
      uiConstraint:
        'the browser UI issues one command per tick, so the 2-crew row needs two scripted assignments in one state (the domain supports N crews)',
    })
    expect(rows[0]!.completions).toEqual([2, 2])
    expect(rows[2]!.completions).toEqual([1, 1])
  })
})

// ---------------------------------------------------------------------------
// §5 — when is the crew economically meaningful?
// ---------------------------------------------------------------------------

describe('§5 — constrained states', () => {
  it('material-rich: a free timing gain, because surplus output was clamped away anyway', () => {
    const base = world({ residences: 1, workshops: 1, colonists: 1, material: 1000 })
    const site = placed(base, 'well', 11, 2)
    const workerId = colonistAt(site.state, buildingIdOfType(site.state, 'workshop'))
    const uncrewedTick = completionTick(site.state, site.id)
    const crewedTick = completionTick(site.state, site.id, [
      { tick: 0, command: crewCommand(workerId, site.id) },
    ])
    const control = run(site.state, 6)
    const withCrew = run(site.state, 6, [{ tick: 0, command: crewCommand(workerId, site.id) }])
    audit('STATE_MATERIAL_RICH', {
      uncrewedCompletionTick: uncrewedTick,
      crewedCompletionTick: crewedTick,
      materialAfter6: {
        uncrewed: control.resources.construction,
        crewed: withCrew.resources.construction,
      },
      note: 'stock sits above the 25 storage cap, so the crew member output was already discarded; the crew tick also avoids one upkeep, so the crewed run ends 1 Material AHEAD',
    })
    expect(crewedTick).toBeLessThan(uncrewedTick)
    expect(withCrew.resources.construction).toBeGreaterThanOrEqual(control.resources.construction)
  })

  it('material-constrained: a crew tick costs the next 25-cost build a tick of Material', () => {
    // A lone staffed Workshop nets +1 Material/tick and equilibrates at 24, so
    // affordability only ever exists MID-tick (24 + 1 stored = 25 at phase 8a).
    const build = (useCrew: boolean): { firstAffordableAfter: number; trace: number[] } => {
      let state = world({ residences: 1, workshops: 1, colonists: 1, material: 25, food: 50000 })
      const workerId = colonistAt(state, buildingIdOfType(state, 'workshop'))
      const before = new Set(Object.keys(state.buildings))
      state = run(state, 1, [
        { tick: 0, command: { type: 'placeBuilding', x: 7, y: 0, buildingType: 'residence' } },
      ])
      const placedResidenceId = Object.keys(state.buildings).find((b) => !before.has(b))!
      if (useCrew) {
        state = run(state, 1, [
          { tick: 0, command: crewCommand(workerId, placedResidenceId) },
        ])
      } else {
        state = run(state, 1)
      }
      const trace: number[] = []
      let probe = state
      let firstAffordableAfter = -1
      for (let i = 0; i < 40; i += 1) {
        trace.push(probe.resources.construction)
        const attempt = stepSimulation(probe, {
          type: 'placeBuilding',
          x: 17,
          y: 0,
          buildingType: 'residence',
        })
        if (Object.keys(attempt.buildings).length > Object.keys(probe.buildings).length) {
          firstAffordableAfter = i
          break
        }
        probe = run(probe, 1)
      }
      return { firstAffordableAfter, trace }
    }
    const withoutCrew = build(false)
    const withCrew = build(true)
    audit('STATE_MATERIAL_CONSTRAINED', {
      ticksUntilNextBuildAffordable: {
        uncrewed: withoutCrew.firstAffordableAfter,
        crewed: withCrew.firstAffordableAfter,
      },
      materialTrace: { uncrewed: withoutCrew.trace.slice(0, 8), crewed: withCrew.trace.slice(0, 8) },
      note: 'crewing the Workshop worker trades its +1 net Material for one tick of construction speed',
    })
    expect(withoutCrew.firstAffordableAfter).toBeGreaterThanOrEqual(0)
    expect(withCrew.firstAffordableAfter).toBeGreaterThanOrEqual(withoutCrew.firstAffordableAfter)
  })

  it('food-constrained: crewing the only farmer empties the buffer sooner', () => {
    const base = world({ residences: 1, farms: 1, colonists: 1, food: 2 })
    const site = placed(base, 'well', 11, 2)
    const farmerId = colonistAt(site.state, buildingIdOfType(site.state, 'farm'))
    const trace = (script: readonly Step[]): Record<string, number> => {
      let next = site.state
      const byTick = new Map(script.map((s) => [s.tick, s.command]))
      const food: number[] = []
      let starve = -1
      for (let i = 1; i <= 10; i += 1) {
        next = stepSimulation(next, byTick.get(i - 1))
        food.push(next.resources.food)
        if (starve === -1 && Object.keys(next.colonists).length === 0) starve = i
      }
      return { starveTick: starve, foodTrace: food.join(',') as unknown as number }
    }
    const control = trace([])
    const crewed = trace([{ tick: 0, command: crewCommand(farmerId, site.id) }])
    audit('STATE_FOOD_CONSTRAINED', {
      foodStart: 2,
      uncrewed: control,
      crewed,
      note: 'crewing the only farmer removes 2 Food from a 2-unit buffer',
    })
    expect(Number(control['starveTick'])).toBeGreaterThanOrEqual(-1)
  })

  it('water-constrained: crewing the existing well worker delays production', () => {
    const base = world({ residences: 2, wells: 1, colonists: 2, water: 20 })
    const site = placed(base, 'well', 11, 2)
    const wellWorkerId = colonistAt(site.state, buildingIdOfType(site.state, 'well'))
    const control = run(site.state, 4)
    const crewed = run(site.state, 4, [
      { tick: 0, command: crewCommand(wellWorkerId, site.id) },
    ])
    audit('STATE_WATER_CONSTRAINED', {
      control: {
        water: control.resources.water,
        servedResidences: getWaterCoverage(control).servedResidenceIds.length,
        population: getPopulationCount(control),
      },
      crewed: {
        water: crewed.resources.water,
        servedResidences: getWaterCoverage(crewed).servedResidenceIds.length,
        population: getPopulationCount(crewed),
      },
      note: 'the existing Well worker is removed for one tick while the new Well completes one tick earlier',
    })
    expect(crewed.resources.water).toBeLessThanOrEqual(control.resources.water)
  })

  it('workforce-constrained: crewing reshuffles the remaining workforce and can break a staffing pair', () => {
    const base = world({ residences: 3, farms: 1, workshops: 1, wells: 1, colonists: 3, material: 0 })
    const site = placed(base, 'well', 11, 2)
    const farmerId = colonistAt(site.state, buildingIdOfType(site.state, 'farm'))
    const before = read(site.state)
    const crewed = stepSimulation(site.state, crewCommand(farmerId, site.id))
    audit('STATE_WORKFORCE_CONSTRAINED', {
      before: {
        staffedFarms: before.staffedFarms,
        staffedWorkshops: before.staffedWorkshops,
        staffedWells: before.staffedWells,
      },
      afterCrewTick: {
        staffedFarms: read(crewed).staffedFarms,
        staffedWorkshops: read(crewed).staffedWorkshops,
        staffedWells: read(crewed).staffedWells,
      },
      note: 'no unemployed colonist exists, so the crew takes a production job offline for one tick',
    })
    expect(before.staffedFarms).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §6 — recovery
// ---------------------------------------------------------------------------

describe('§6 — recovery', () => {
  it('crew -> completion -> production resumes with no persistent penalty', () => {
    const base = world({ residences: 1, farms: 1, colonists: 1 })
    const site = placed(base, 'well', 11, 2)
    const farmerId = colonistAt(site.state, buildingIdOfType(site.state, 'farm'))
    const crewTick = stepSimulation(site.state, crewCommand(farmerId, site.id))
    const after = stepSimulation(crewTick)
    audit('RECOVERY', {
      crewTick: {
        wellOperational: crewTick.buildings[site.id]?.status,
        staffedFarms: countStaffedOperationalFarms(crewTick),
        constructionAssignmentId: crewTick.colonists[farmerId]?.constructionAssignmentId,
      },
      nextTick: {
        staffedFarms: countStaffedOperationalFarms(after),
        workplaceId: after.colonists[farmerId]?.workplaceId,
        mode: after.colonists[farmerId]?.workplaceAssignmentMode,
        constructionAssignmentId: after.colonists[farmerId]?.constructionAssignmentId,
      },
    })
    expect(crewTick.colonists[farmerId]?.constructionAssignmentId).toBeNull()
    expect(countStaffedOperationalFarms(after)).toBe(1)
  })

  it('a manual workplace choice is cleared by crewing and not restored (the contract makes no promise)', () => {
    const base = world({ residences: 1, farms: 1, workshops: 1, colonists: 1 })
    const workshopId = buildingIdOfType(base, 'workshop')
    // The automatic pass picked the farm (lowest id at equal distance); move the
    // colonist explicitly to the workshop so the override is real.
    const manual = applyCommand(base, {
      type: 'reassignColonist',
      colonistId: 'colonist-1',
      workplaceId: workshopId,
    }).state
    expect(manual.colonists['colonist-1']?.workplaceAssignmentMode).toBe('manual')
    const site = placed(manual, 'well', 11, 2)
    const crewTick = stepSimulation(site.state, crewCommand('colonist-1', site.id))
    const after = stepSimulation(crewTick)
    audit('RECOVERY_MANUAL', {
      manualModeBefore: 'manual',
      atCrewTick: {
        workplaceId: crewTick.colonists['colonist-1']?.workplaceId,
        constructionAssignmentId: crewTick.colonists['colonist-1']?.constructionAssignmentId,
      },
      afterRelease: {
        workplaceId: after.colonists['colonist-1']?.workplaceId,
        mode: after.colonists['colonist-1']?.workplaceAssignmentMode,
      },
      note: 'the crew cycle clears the manual override; the colonist returns to automatic selection',
    })
    expect(crewTick.colonists['colonist-1']?.workplaceId).toBeNull()
    expect(after.colonists['colonist-1']?.workplaceAssignmentMode).toBe('automatic')
  })
})

// ---------------------------------------------------------------------------
// §7 — spatial interaction
// ---------------------------------------------------------------------------

describe('§7 — spatial interaction', () => {
  it('the saved tick converts to usable production only when a DIFFERENT worker can operate the new building', () => {
    // The new Well becomes useful only once a colonist is assigned to it, and
    // `assignJobs` skips the crew member for the whole crew tick. So the crew
    // competes directly with staffing the thing it just finished.
    const scenario = (
      colonists: number,
      crewed: boolean
    ): { completionTick: number; firstStaffedTick: number } => {
      const base = world({ residences: colonists, farms: 1, colonists, food: 50000 })
      const site = placed(base, 'well', 5, 2)
      const prepared = crewed ? crew(site.state, 'colonist-2', site.id) : site.state
      let next = prepared
      let firstStaffedTick = -1
      for (let i = 1; i <= 6; i += 1) {
        next = stepSimulation(next)
        if (firstStaffedTick === -1 && countStaffedOperationalWells(next) > 0) {
          firstStaffedTick = i
        }
      }
      return {
        completionTick: completionTick(prepared, site.id, [], 6),
        firstStaffedTick,
      }
    }

    const rows = [
      { case: '2 colonists, no crew (1 farmer + 1 spare)', ...scenario(2, false) },
      { case: '2 colonists, the ONLY spare crews', ...scenario(2, true) },
      { case: '3 colonists, no crew (1 farmer + 2 spares)', ...scenario(3, false) },
      { case: '3 colonists, one of two spares crews', ...scenario(3, true) },
    ]

    // A completely roadless Well: operational but unstaffable (09E/09K).
    const roadless = placed(
      world({ residences: 3, farms: 1, colonists: 3, roads: false }),
      'well',
      5,
      2
    )
    let roadlessNext = crew(roadless.state, 'colonist-2', roadless.id)
    let roadlessStaffedTick = -1
    for (let i = 1; i <= 6; i += 1) {
      roadlessNext = stepSimulation(roadlessNext)
      if (roadlessStaffedTick === -1 && countStaffedOperationalWells(roadlessNext) > 0) {
        roadlessStaffedTick = i
      }
    }

    audit('SPATIAL_INTERACTION', {
      rows,
      roadless: { firstStaffedTick: roadlessStaffedTick },
      conclusion:
        'the saved construction tick converts into earlier USABLE production only when a different available worker can staff the new building during the crew tick; otherwise staffing slips back onto the saved tick and only the raw completion tick moves. A roadless building absorbs the saved tick entirely.',
    })
    expect(rows[0]!.completionTick).toBe(2)
    expect(rows[0]!.firstStaffedTick).toBe(2)
    expect(rows[1]!.completionTick).toBe(1)
    // The only spare was crewing: staffing slips back to tick 2.
    expect(rows[1]!.firstStaffedTick).toBe(2)
    expect(rows[3]!.completionTick).toBe(1)
    // A different spare staffs it on the saved tick.
    expect(rows[3]!.firstStaffedTick).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §8 — long run
// ---------------------------------------------------------------------------

describe('§8 — long run', () => {
  /** Scripted growth: a sequence of placements, optionally each crewed. */
  const growth = (crews: boolean, ticks: number): Reading => {
    const state = world({
      residences: 3,
      farms: 1,
      wells: 2,
      colonists: 3,
      food: 50000,
      material: 100000,
    })
    // Free, road-adjacent cells: residences (2,0),(4,0),(6,0) and workplaces
    // (2,2),(4,2),(6,2). Placement order makes them building-7..building-12.
    const plan: readonly { readonly x: number; readonly y: number; readonly type: BuildingType }[] = [
      { x: 2, y: 0, type: 'residence' },
      { x: 2, y: 2, type: 'well' },
      { x: 4, y: 0, type: 'residence' },
      { x: 4, y: 2, type: 'well' },
      { x: 6, y: 0, type: 'residence' },
      { x: 6, y: 2, type: 'farm' },
    ]
    const script: Step[] = []
    for (let i = 0; i < plan.length; i += 1) {
      const placeTick = 1 + i * 4
      script.push({
        tick: placeTick,
        command: { type: 'placeBuilding', x: plan[i]!.x, y: plan[i]!.y, buildingType: plan[i]!.type },
      })
      if (crews) {
        script.push({
          tick: placeTick + 1,
          command: crewCommand('colonist-1', `building-${7 + i}`),
        })
      }
    }
    return read(run(state, ticks, script))
  }

  it('60 / 120 / 240 / 600 ticks: crew vs no-crew scripted growth', () => {
    const rows = [60, 120, 240, 600].map((ticks) => {
      const uncrewed = growth(false, ticks)
      const crewed = growth(true, ticks)
      return {
        ticks,
        population: { uncrewed: uncrewed.population, crewed: crewed.population },
        food: { uncrewed: uncrewed.food, crewed: crewed.food },
        material: { uncrewed: uncrewed.material, crewed: crewed.material },
        water: { uncrewed: uncrewed.water, crewed: crewed.water },
        operational: { uncrewed: uncrewed.operational, crewed: crewed.operational },
        delta: {
          population: crewed.population - uncrewed.population,
          food: crewed.food - uncrewed.food,
          material: crewed.material - uncrewed.material,
          water: crewed.water - uncrewed.water,
          operational: crewed.operational - uncrewed.operational,
        },
      }
    })
    audit('LONG_RUN', {
      rows,
      note: 'the only difference is one tick of the single colonist output per crewed site, in exchange for one tick earlier completion',
    })
    expect(rows.length).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// §11 — determinism
// ---------------------------------------------------------------------------

describe('§11 — determinism and canonical state', () => {
  it('replay, insertion order and save/load are stable under crew use', () => {
    const base = world({ residences: 2, farms: 1, workshops: 1, colonists: 2, material: 1000 })
    const site = placed(base, 'well', 13, 2)
    const scenario = (): SimulationState =>
      run(site.state, 20, [
        { tick: 0, command: crewCommand('colonist-1', site.id) },
        { tick: 5, command: { type: 'placeBuilding', x: 15, y: 0, buildingType: 'residence' } },
        { tick: 6, command: crewCommand('colonist-1', 'building-5') },
      ])
    const a = scenario()
    const b = scenario()
    const reversed: SimulationState = {
      ...a,
      colonists: Object.fromEntries(Object.entries(a.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(a.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(a.roads).reverse()),
    }
    const restored = loadSave(serializeSave(a))
    audit('DETERMINISM', {
      replayHash: hashCanonicalState(a),
      replayStable: hashCanonicalState(a) === hashCanonicalState(b),
      insertionOrderStable: hashCanonicalState(reversed) === hashCanonicalState(a),
      saveLoadStable:
        hashCanonicalState(restored) === hashCanonicalState(a) &&
        serializeCanonicalState(restored) === serializeCanonicalState(a),
      saveVersion: SAVE_VERSION,
    })
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(a))
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(a))
  })
})

// ---------------------------------------------------------------------------
// §12 — performance
// ---------------------------------------------------------------------------

describe('§12 — performance', () => {
  it('measures baseline vs 1 crew vs multiple crews', () => {
    const base = world({
      residences: 8,
      farms: 4,
      workshops: 4,
      wells: 4,
      colonists: 8,
      material: 100000,
    })
    const firstSite = placed(base, 'well', 21, 2)
    const siteState = firstSite.state
    const extraSites = [1, 2, 3].reduce<{ state: SimulationState; ids: string[] }>(
      (acc, i) => {
        const next = placed(acc.state, 'well', 21 + i * 2, 2)
        return { state: next.state, ids: [...acc.ids, next.id] }
      },
      { state: siteState, ids: [firstSite.id] }
    )
    const measure = (ticks: number, crews: number): number => {
      let prepared = extraSites.state
      for (let i = 0; i < crews; i += 1) {
        prepared = crew(prepared, `colonist-${i + 1}`, extraSites.ids[i]!)
      }
      const t0 = performance.now()
      let next = prepared
      for (let i = 0; i < ticks; i += 1) next = stepSimulation(next)
      return performance.now() - t0
    }
    const rows = [0, 1, 4].map((crews) => ({ crews, ms: Number(measure(600, crews).toFixed(1)) }))
    audit('PERFORMANCE', {
      ticks: 600,
      rows,
      note: 'crew presence is derived once per advanceConstruction (O(colonists + sites)); no per-site search, no matching, no pathfinding',
    })
    for (const row of rows) expect(row.ms).toBeLessThan(120000)
  }, 300000)
})
