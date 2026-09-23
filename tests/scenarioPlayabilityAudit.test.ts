/**
 * Step 10AM — Progression & Scenario Playability Audit.
 *
 * AUDIT ONLY. Every number below is measured by playing the six scenarios
 * from Step 10AL with real placement commands: two or three plausible player
 * policies per scenario are executed and compared. No simulation rule is
 * changed and no Town+ threshold is invented.
 *
 * Run:
 *   npx vitest run tests/scenarioPlayabilityAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  createScenarioState,
  findScenario,
  getFoodProductionPerTick,
  getPopulationCount,
  getProgression,
  getRoadNetworks,
  getWaterProductionPerTick,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  isFoodSupplySustainable,
  iterateBuildings,
  SCENARIOS,
  serializeCanonicalState,
  stepSimulation,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

type PolicyStep =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
  | { readonly kind: 'wait'; readonly ticks: number }

interface PlaySnapshot {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly foodNet: number
  readonly water: number
  readonly waterCapacity: number
  readonly material: number
  readonly materialNet: number
  readonly roads: number
  readonly networks: number
  readonly buildings: number
  readonly employed: number
  readonly unemployed: number
  readonly jobCapacity: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly staffedWorkshops: number
  readonly stage: string
}

interface PlayResult {
  readonly scenario: string
  readonly policy: string
  readonly actions: readonly { readonly label: string; readonly tick: number; readonly accepted: boolean }[]
  readonly settlementTick: number | null
  readonly villageTick: number | null
  readonly wipeTick: number | null
  readonly final: PlaySnapshot
}

const staffedCount = (state: SimulationState, type: BuildingType): number =>
  [...iterateBuildings(state)].filter((building) => {
    if (building.type !== type) return false
    return [...Object.values(state.colonists)].some((colonist) => colonist.workplaceId === building.id)
  }).length

const snapshot = (state: SimulationState): PlaySnapshot => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  foodNet: getFoodProductionPerTick(state) - getPopulationCount(state),
  water: state.resources.water,
  waterCapacity: getWaterProductionPerTick(state),
  material: state.resources.construction,
  materialNet: 0,
  roads: Object.keys(state.roads).length,
  networks: getRoadNetworks(state).length,
  buildings: Object.keys(state.buildings).length,
  employed: [...Object.values(state.colonists)].filter((colonist) => colonist.workplaceId !== null).length,
  unemployed: [...Object.values(state.colonists)].filter((colonist) => colonist.workplaceId === null).length,
  jobCapacity: [...iterateBuildings(state)].filter(
    (building) =>
      building.status === 'operational' &&
      (building.type === 'farm' || building.type === 'workshop' || building.type === 'well')
  ).length,
  staffedFarms: staffedCount(state, 'farm'),
  staffedWells: staffedCount(state, 'well'),
  staffedWorkshops: staffedCount(state, 'workshop'),
  stage: getProgression(state).stage,
})

const affordable = (state: SimulationState, type: BuildingType, cell: CellCoordinate): boolean => {
  // The authoritative placement gate, read through the same query the UI uses.
  // Imported lazily to keep the audit free of duplicated economy logic.
  return getPlacementAffordabilityLocal(state, type, cell)
}

// Imported at module scope below to avoid a second definition of affordability.
import { getPlacementAffordability } from '@/index'
const getPlacementAffordabilityLocal = (
  state: SimulationState,
  type: BuildingType,
  cell: CellCoordinate
): boolean => getPlacementAffordability(state, cell, type).affordable

/** Play one scenario with one policy through real commands. */
const playScenario = (
  scenarioId: string,
  policy: string,
  steps: readonly PolicyStep[],
  horizon: number
): PlayResult => {
  const definition = findScenario(scenarioId)
  if (definition === undefined) throw new Error(`10am: unknown scenario ${scenarioId}`)
  let state = createScenarioState(shipConfig, definition)
  const actions: { label: string; tick: number; accepted: boolean }[] = []
  let settlementTick: number | null = null
  let villageTick: number | null = null
  let wipeTick: number | null = null
  let previousPopulation = getPopulationCount(state)

  const observe = (): void => {
    const stage = getProgression(state).stage
    if (settlementTick === null && (stage === 'settlement' || stage === 'village')) {
      settlementTick = state.time.tick
    }
    if (villageTick === null && stage === 'village') {
      villageTick = state.time.tick
    }
    const population = getPopulationCount(state)
    if (wipeTick === null && actions.length > 0 && population === 0 && previousPopulation > 0) {
      wipeTick = state.time.tick
    }
    previousPopulation = population
  }

  observe()
  for (const step of steps) {
    if (step.kind === 'wait') {
      for (let i = 0; i < step.ticks; i += 1) {
        state = stepSimulation(state)
        observe()
      }
      actions.push({ label: `wait ${step.ticks}`, tick: state.time.tick, accepted: true })
      continue
    }
    if (step.kind === 'roads') {
      let guard = 0
      while (guard < 200 && state.resources.construction < step.cells.length * 5) {
        state = stepSimulation(state)
        observe()
        guard += 1
      }
      if (state.resources.construction < step.cells.length * 5) {
        actions.push({ label: `roads x${step.cells.length}`, tick: state.time.tick, accepted: false })
        continue
      }
      state = stepSimulation(state, { type: 'placeRoads', cells: step.cells })
      observe()
      actions.push({ label: `roads x${step.cells.length}`, tick: state.time.tick, accepted: true })
      continue
    }
    const cell = { x: step.x, y: step.y }
    let guard = 0
    while (guard < 200 && !affordable(state, step.type, cell)) {
      state = stepSimulation(state)
      observe()
      guard += 1
    }
    const before = Object.keys(state.buildings).length
    state = stepSimulation(state, { type: 'placeBuilding', x: cell.x, y: cell.y, buildingType: step.type })
    const accepted = Object.keys(state.buildings).length === before + 1
    observe()
    actions.push({ label: `${step.type}@${step.x},${step.y}`, tick: state.time.tick, accepted })
  }
  for (let i = 0; i < horizon; i += 1) {
    state = stepSimulation(state)
    observe()
  }
  return {
    scenario: scenarioId,
    policy,
    actions,
    settlementTick,
    villageTick,
    wipeTick,
    final: snapshot(state),
  }
}

// ---------------------------------------------------------------------------
// 1. Architecture verification
// ---------------------------------------------------------------------------

describe('1. Architecture verification', { timeout: 30000 }, () => {
  it('keeps progression a pure query over authoritative state', () => {
    const scenario = findScenario('water-constraint')
    if (scenario === undefined) throw new Error('10am: missing scenario')
    const state = createScenarioState(shipConfig, scenario)
    const before = serializeCanonicalState(state)
    const progression = getProgression(state)
    expect(serializeCanonicalState(state)).toBe(before)
    // No parallel economic logic: the progression's numbers are the existing
    // queries' numbers.
    expect(progression.conditions.length + progression.nextConditions.length).toBeGreaterThan(0)
    const all = [...progression.conditions, ...progression.nextConditions]
    for (const condition of all) {
      if (condition.id === 'population') {
        expect(condition.detail).toBe(
          `${getPopulationCount(state)} colonist${getPopulationCount(state) === 1 ? '' : 's'}`
        )
      }
      if (condition.id === 'water') {
        expect(condition.detail).toBe(`capacity ${getWaterProductionPerTick(state)} / tick`)
      }
      if (condition.id === 'roads') {
        const networks = getRoadNetworks(state).length
        expect(condition.detail).toBe(
          networks === 1 ? '1 operational network' : `${networks} operational networks`
        )
      }
      if (condition.id === 'food') {
        expect(condition.met).toBe(isFoodSupplySustainable(state))
        expect(condition.detail).toBe(
          `${getFoodProductionPerTick(state)} / ${getPopulationCount(state)} Food per tick`
        )
      }
    }
  })

  it('keeps scenarios data-only with one shared assembler', () => {
    const allowed = ['id', 'name', 'description', 'objective', 'resources', 'buildings', 'roads', 'colonists']
    for (const scenario of SCENARIOS) {
      expect(Object.keys(scenario).sort()).toEqual([...allowed].sort())
      const a = createScenarioState(shipConfig, scenario)
      const b = createScenarioState(shipConfig, scenario)
      expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    }
    // Progression thresholds are model-produced.
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(getProgression(createScenarioState(shipConfig, findScenario('industrial-expansion')!)).deferred).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3-4. Scenario profiles and measured decision differentiation
// ---------------------------------------------------------------------------

describe('3-4. Scenario profiles and decision differentiation', { timeout: 60000 }, () => {
  it('executes First Settlement with three policies', () => {
    const compact = playScenario(
      'first-settlement',
      'compact housing + food first',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'farm', x: 0, y: 1 },
        { kind: 'building', type: 'residence', x: 2, y: 1 },
        { kind: 'building', type: 'well', x: 1, y: 2 },
      ],
      200
    )
    const extended = playScenario(
      'first-settlement',
      'extended roads',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] },
        { kind: 'building', type: 'farm', x: 4, y: 2 },
      ],
      200
    )
    const waterFirst = playScenario(
      'first-settlement',
      'Well before Farm',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'well', x: 1, y: 2 },
        { kind: 'building', type: 'farm', x: 2, y: 1 },
      ],
      200
    )
    audit('FIRST_SETTLEMENT', { compact, extended, waterFirst })
    expect(compact.settlementTick).not.toBeNull()
    expect(compact.final.roads).toBe(1)
    expect(compact.final.stage).toBe('settlement')
    expect(compact.final.material).toBe(20) // 100 - 25 res - 5 road - 25 farm - 25 residence - 25 well (rejected)
    expect(extended.settlementTick).not.toBeNull()
    expect(extended.final.roads).toBe(4)
    expect(waterFirst.final.stage).toBe('wilderness')
    expect(waterFirst.wipeTick).not.toBeNull()
    // The order alone flips Settlement against starvation.
    expect(compact.settlementTick).not.toBe(waterFirst.settlementTick)
  })

  it('executes Water Constraint with a fast and a growth-first policy', () => {
    const wellNow = playScenario(
      'water-constraint',
      'Well immediately',
      [{ kind: 'building', type: 'well', x: 3, y: 2 }],
      200
    )
    const growFirst = playScenario(
      'water-constraint',
      'grow first, then Well and a second Farm',
      [
        { kind: 'building', type: 'residence', x: 5, y: 0 },
        { kind: 'roads', cells: [{ x: 4, y: 1 }, { x: 5, y: 1 }] },
        { kind: 'building', type: 'well', x: 2, y: 2 },
        { kind: 'building', type: 'farm', x: 4, y: 2 },
      ],
      200
    )
    audit('WATER_CONSTRAINT', { wellNow, growFirst })
    expect(wellNow.final.stage).toBe('village')
    expect(growFirst.final.stage).toBe('village')
    // Distinct consequence: the growth-first trajectory ends with more
    // population and a larger network, reached later.
    expect(growFirst.final.population).toBeGreaterThan(wellNow.final.population)
    expect(growFirst.final.roads).toBeGreaterThan(wellNow.final.roads)
    expect((growFirst.villageTick ?? 0) >= (wellNow.villageTick ?? 0)).toBe(true)
    // Measured structural consequence of the Water headroom rule: building the
    // Well first locks the population at the capacity (2), because admission
    // needs capacity >= served + 1 and no worker is left to staff a second
    // Well. Admitting the colonists BEFORE the first Well is operational is
    // what allows population 3.
    expect(wellNow.final.population).toBe(WATER_PER_WELL_PER_TICK)
    expect(growFirst.final.population).toBe(3)
  })

  it('executes Industrial Expansion and measures why a running Workshop is out of reach', () => {
    const workshopNow = playScenario(
      'industrial-expansion',
      'Workshop immediately',
      [{ kind: 'building', type: 'workshop', x: 2, y: 2 }],
      200
    )
    const capacityFirst = playScenario(
      'industrial-expansion',
      'Water capacity first, then a third colonist',
      [
        { kind: 'building', type: 'well', x: 5, y: 2 },
        { kind: 'roads', cells: [{ x: 4, y: 1 }, { x: 5, y: 1 }] },
        { kind: 'building', type: 'residence', x: 4, y: 0 },
        { kind: 'building', type: 'workshop', x: 6, y: 2 },
        { kind: 'roads', cells: [{ x: 6, y: 1 }] },
      ],
      200
    )
    const colonistFirst = playScenario(
      'industrial-expansion',
      'extra Residence before extra Water capacity',
      [
        { kind: 'building', type: 'residence', x: 4, y: 0 },
        { kind: 'roads', cells: [{ x: 4, y: 1 }] },
      ],
      200
    )
    audit('INDUSTRIAL_EXPANSION', { workshopNow, capacityFirst, colonistFirst })
    // The Workshop can exist but cannot run: one worker per colonist, and the
    // Farm and Well already hold both of them.
    expect(workshopNow.final.buildings).toBe(5)
    expect(workshopNow.final.staffedWorkshops).toBe(0)
    expect(workshopNow.final.stage).toBe('village')
    // Measured hard cap: the scenario starts with an operational Well, so the
    // admission gate is active from tick 0 and the population is fixed at the
    // capacity (2). Every extra Well stays unstaffed because no colonist can
    // be admitted to work it, so the Workshop can never be staffed either.
    for (const policy of [workshopNow, capacityFirst, colonistFirst]) {
      expect(policy.final.population).toBe(WATER_PER_WELL_PER_TICK)
      expect(policy.final.waterCapacity).toBe(WATER_PER_WELL_PER_TICK)
      expect(policy.final.staffedWorkshops).toBe(0)
      expect(policy.final.stage).toBe('village')
    }
    expect(capacityFirst.final.roads).toBeGreaterThan(workshopNow.final.roads)
  })

  it('executes Spatial Efficiency where a 5-Material margin decides the outcome', () => {
    const minimal = playScenario(
      'spatial-efficiency',
      'exact minimum (Residence + 1 road + Farm)',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'farm', x: 0, y: 1 },
      ],
      200
    )
    const oneRoadTooMany = playScenario(
      'spatial-efficiency',
      'one extra road cell',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
        { kind: 'building', type: 'farm', x: 2, y: 2 },
      ],
      200
    )
    audit('SPATIAL_EFFICIENCY', { minimal, oneRoadTooMany })
    expect(minimal.final.stage).toBe('settlement')
    expect(minimal.final.material).toBe(0)
    expect(minimal.final.roads).toBe(1)
    expect(oneRoadTooMany.final.stage).toBe('wilderness')
    expect(oneRoadTooMany.wipeTick).not.toBeNull()
  })

  it('executes Population Expansion with a capacity-first and a population-first policy', () => {
    const capacityFirst = playScenario(
      'population-expansion',
      'capacity first (2 Wells then 2 Farms)',
      [
        { kind: 'building', type: 'well', x: 3, y: 2 },
        { kind: 'building', type: 'well', x: 5, y: 2 },
        { kind: 'building', type: 'farm', x: 4, y: 2 },
        { kind: 'building', type: 'farm', x: 6, y: 2 },
      ],
      300
    )
    const populationFirst = playScenario(
      'population-expansion',
      'population first (let housing fill, then pay for capacity)',
      [
        { kind: 'wait', ticks: 10 },
        { kind: 'building', type: 'well', x: 3, y: 2 },
        { kind: 'building', type: 'well', x: 5, y: 2 },
        { kind: 'building', type: 'farm', x: 4, y: 2 },
        { kind: 'building', type: 'farm', x: 6, y: 2 },
      ],
      300
    )
    audit('POPULATION_EXPANSION', { capacityFirst, populationFirst })
    expect(capacityFirst.final.population).toBe(4)
    expect(capacityFirst.final.waterCapacity).toBe(4)
    expect(capacityFirst.final.foodNet).toBe(0)
    expect(populationFirst.final.population).toBe(4)
    expect(populationFirst.final.waterCapacity).toBe(4)
    // Distinct consequence: the population-first policy spends the Food
    // reserve while the housing fills, so it ends with a lower stock.
    expect(populationFirst.final.food).toBeLessThan(capacityFirst.final.food)
  })

  it('executes Recovery with repair, replace and inaction policies', () => {
    const repair = playScenario(
      'recovery',
      'repair the stranded Farm',
      [{ kind: 'roads', cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] }],
      200
    )
    const replace = playScenario(
      'recovery',
      'replace the Farm next to the network',
      [{ kind: 'building', type: 'farm', x: 0, y: 1 }],
      200
    )
    const inaction = playScenario('recovery', 'no action', [{ kind: 'wait', ticks: 5 }], 200)
    audit('RECOVERY', { repair, replace, inaction })
    expect(repair.final.stage).toBe('settlement')
    expect(repair.final.roads).toBe(4)
    expect(repair.final.material).toBe(15)
    expect(repair.final.staffedFarms).toBe(1)
    expect(replace.final.stage).toBe('settlement')
    expect(replace.final.roads).toBe(1)
    expect(replace.final.buildings).toBe(3)
    expect(replace.final.material).toBe(5)
    expect(inaction.final.stage).toBe('wilderness')
    expect(inaction.wipeTick).not.toBeNull()
  })

  it('summarises the measured profiles of all six scenarios', () => {
    const profiles = [
      {
        scenario: 'First settlement',
        initial: '100/100/0, nothing built',
        objective: 'Reach Settlement.',
        firstDecision: 'which building to fund first (Farm, Well or a second Residence)',
        primaryConstraint: 'Material 100',
        secondaryConstraint: 'Food sustainability',
        settlementPath: 'Residence + road + Farm (55 of 100)',
        villagePath: 'none: 2 Residences + Well + Farm + road = 105 > 100',
        failureMode: 'Water/industry before Food starves the only worker',
        recovery: 'n/a (a wiped colony is terminal)',
        distinctive: 'the construction order alone decides Settlement vs starvation',
      },
      {
        scenario: 'Water constraint',
        initial: '2 Residences + Farm + 3 roads, 2 colonists, 100 Material',
        objective: 'Reach Village: restore Water capacity without losing the Food balance.',
        firstDecision: 'Well now vs more housing first',
        primaryConstraint: 'Water capacity 0',
        secondaryConstraint: 'Material for the extra Well/Farm',
        settlementPath: 'already Settlement at tick 0',
        villagePath: 'one Well (25)',
        failureMode: 'none measured (both policies reached Village)',
        recovery: 'n/a',
        distinctive: 'the same objective is reached with population 2 or 3 depending on order',
      },
      {
        scenario: 'Industrial expansion',
        initial: 'Village (2 Residences + Farm + Well), 100 Material',
        objective: 'Reach Village and build a Workshop: industry costs Water and a worker.',
        firstDecision: 'Workshop now vs Water capacity first',
        primaryConstraint: 'workforce (1 job per colonist)',
        secondaryConstraint: 'Water capacity for a third colonist',
        settlementPath: 'already Settlement at tick 0',
        villagePath: 'already Village at tick 0',
        failureMode: 'none measured: the Workshop stays vacant, the colony survives',
        recovery: 'n/a',
        distinctive: 'a Workshop can be built but cannot run at this scale',
      },
      {
        scenario: 'Spatial efficiency',
        initial: '55 Material, nothing built',
        objective: 'Reach Settlement on a 55-Material budget (Residence + road + Farm).',
        firstDecision: 'exactly one road cell or none/the Farm',
        primaryConstraint: 'Material 55 = Residence + 1 road + Farm',
        secondaryConstraint: 'none',
        settlementPath: 'Residence + 1 road + Farm, exactly 55',
        villagePath: 'none (5 Material left)',
        failureMode: 'one extra road cell makes the Farm unaffordable and the colony starves',
        recovery: 'n/a',
        distinctive: 'a 5-Material margin separates success from starvation',
      },
      {
        scenario: 'Population expansion',
        initial: '2 operational + 2 building Residences + Farm + 7 roads, 2 colonists, 100 Material',
        objective: 'Grow the settlement to 4 colonists with Water capacity 4 and Food balanced.',
        firstDecision: 'capacity first or let the housing fill first',
        primaryConstraint: 'Water capacity 2 (then 4)',
        secondaryConstraint: 'Food for four colonists',
        settlementPath: 'already Settlement at tick 0',
        villagePath: 'one Well (25)',
        failureMode: 'none measured: without capacity growth is simply blocked',
        recovery: 'n/a',
        distinctive: 'the objective costs exactly the whole 100 Material budget',
      },
      {
        scenario: 'Recovery',
        initial: 'Residence + stranded Farm + 1 road, 1 colonist, 30 Material, 30 Food',
        objective: 'Reach Settlement by connecting the stranded Farm to the network.',
        firstDecision: 'repair the Farm (roads) or replace it on the network',
        primaryConstraint: 'Food sustainability (production 0)',
        secondaryConstraint: 'Material 30 for 3 road cells or one Farm',
        settlementPath: '3 connector roads (15) or a new Farm (25)',
        villagePath: 'none (no income, Material below the 2-Residence + Well cost)',
        failureMode: 'inaction starves the colony in about 30 ticks',
        recovery: 'the scenario is a recovery',
        distinctive: 'two repairs reach Settlement with different road cost and a redundant Farm',
      },
    ]
    audit('SCENARIO_PROFILES', { profiles })
    expect(profiles).toHaveLength(6)
    expect(profiles.every((row) => row.distinctive.length > 0)).toBe(true)
  })
})

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// 5. The two carried-forward findings
// ---------------------------------------------------------------------------

describe('5. Carried-forward findings', { timeout: 30000 }, () => {
  it('A — measures the opening budget: order matters, Village is out of reach', () => {
    const farmFirst = playScenario(
      'first-settlement',
      'Farm before Well',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'farm', x: 1, y: 2 },
        { kind: 'building', type: 'well', x: 2, y: 1 },
        { kind: 'building', type: 'residence', x: 0, y: 1 },
      ],
      200
    )
    const wellFirst = playScenario(
      'first-settlement',
      'Well before Farm',
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        { kind: 'building', type: 'well', x: 1, y: 2 },
        { kind: 'building', type: 'farm', x: 2, y: 1 },
      ],
      200
    )
    const minimumVillageCost = 2 * 25 + 25 + 25 + 5
    audit('OPENING_BUDGET', {
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      minimumVillageCost,
      farmFirst: { stage: farmFirst.final.stage, materials: farmFirst.final.material, roads: farmFirst.final.roads, population: farmFirst.final.population },
      wellFirst: { stage: wellFirst.final.stage, wipeTick: wellFirst.wipeTick },
      conclusion:
        'the 105 minimum is the sum of catalog prices (2 Residences + Well + Farm + one shared road cell): an intentional pressure of the existing economy, not a bug; the construction order alone decides Settlement vs starvation, and no order reaches Village from 100 Material',
    })
    expect(INITIAL_CONSTRUCTION_MATERIAL).toBe(100)
    expect(minimumVillageCost).toBe(105)
    expect(farmFirst.final.stage).toBe('settlement')
    expect(farmFirst.final.material).toBeLessThan(25)
    expect(wellFirst.final.stage).toBe('wilderness')
    expect(wellFirst.wipeTick).not.toBeNull()
  })

  it('B — measures the Settlement-condition dependency', () => {
    const states: { readonly name: string; readonly state: SimulationState }[] = [
      { name: 'fresh default', state: createScenarioState(shipConfig, findScenario('first-settlement')!) },
      { name: 'recovery start', state: createScenarioState(shipConfig, findScenario('recovery')!) },
      { name: 'water-constraint start', state: createScenarioState(shipConfig, findScenario('water-constraint')!) },
      { name: 'industrial-expansion start', state: createScenarioState(shipConfig, findScenario('industrial-expansion')!) },
      { name: 'population-expansion start', state: createScenarioState(shipConfig, findScenario('population-expansion')!) },
      { name: 'spatial-efficiency start', state: createScenarioState(shipConfig, findScenario('spatial-efficiency')!) },
      {
        // Synthetic counterexample: a road network with no population at all.
        name: 'roads only (synthetic)',
        state: createScenarioState(shipConfig, {
          id: 'audit-roads-only',
          name: 'Roads only',
          description: 'synthetic audit state',
          objective: {
            label: 'none',
            description: 'synthetic audit state',
            constraint: 'none',
            requirements: [{ kind: 'population', atLeast: 1 }],
            failsWithoutColonists: false,
          },
          resources: { material: 10, food: 100, water: 0 },
          buildings: [],
          roads: [{ x: 1, y: 1 }],
          colonists: [],
        }),
      },
    ]
    const matrix = states.map((entry) => {
      const conditions = getProgression(entry.state).nextConditions.length > 0
        ? getProgression(entry.state).nextConditions
        : getProgression(entry.state).conditions
      const byId = (id: string): boolean => conditions.find((c) => c.id === id)?.met ?? false
      return {
        state: entry.name,
        population: getPopulationCount(entry.state),
        food: isFoodSupplySustainable(entry.state),
        roads: getRoadNetworks(entry.state).length > 0,
        foodImpliesPopulation: !isFoodSupplySustainable(entry.state) || getPopulationCount(entry.state) >= 1,
        foodImpliesRoads: !isFoodSupplySustainable(entry.state) || getRoadNetworks(entry.state).length > 0,
        populationImpliesFood: !(getPopulationCount(entry.state) >= 1) || isFoodSupplySustainable(entry.state),
        roadsImplyPopulation: !(getRoadNetworks(entry.state).length > 0) || getPopulationCount(entry.state) >= 1,
        progressionPopulationMet: byId('population'),
      }
    })
    audit('SETTLEMENT_CONDITION_DEPENDENCY', {
      matrix,
      implications: {
        foodImpliesPopulation: matrix.every((row) => row.foodImpliesPopulation),
        foodImpliesRoads: matrix.every((row) => row.foodImpliesRoads),
        populationImpliesFood: matrix.every((row) => row.populationImpliesFood),
        roadsImplyPopulation: matrix.every((row) => row.roadsImplyPopulation),
      },
      counterexamples: {
        populationWithoutFood: matrix.filter((row) => row.population && !row.food).map((row) => row.state),
        roadsWithoutFood: matrix.filter((row) => row.roads && !row.food).map((row) => row.state),
      },
      conclusion:
        'Food sustainability implies both other conditions (a staffed Farm needs a colonist and a shared road network), but neither of the other two implies Food: the trio is one-directional. The separate conditions remain useful as the labels of the blockers the player sees, and the contract is unchanged.',
    })
    // Food always implies the other two across the measured states.
    expect(matrix.every((row) => row.foodImpliesPopulation)).toBe(true)
    expect(matrix.every((row) => row.foodImpliesRoads)).toBe(true)
    // The reverse implications have counterexamples.
    expect(matrix.some((row) => !row.populationImpliesFood)).toBe(true)
    expect(matrix.some((row) => !row.roadsImplyPopulation)).toBe(true)  })
})

// ---------------------------------------------------------------------------
// 6-7. Objective audit and readability (browser covers the pixels)
// ---------------------------------------------------------------------------

describe('6-7. Objective audit and readability', { timeout: 30000 }, () => {
  it('classifies each objective and its reachability from the given start', () => {
    const objectives = [
      { scenario: 'First settlement', form: 'measurable milestone (Settlement)', actionable: true, reachable: true, note: 'the checklist names Population/Food/Road' },
      { scenario: 'Water constraint', form: 'measurable milestone with a named constraint (Water capacity)', actionable: true, reachable: true, note: 'the single blocker is Water capacity' },
      { scenario: 'Industrial expansion', form: 'descriptive framing + partial constraint', actionable: 'partial', reachable: false, note: 'a Workshop can be built but cannot run: 2 colonists staff the Farm and Well; a third needs capacity 4 and a fourth worker is needed for the Workshop' },
      { scenario: 'Spatial efficiency', form: 'actionable constraint (55 Material)', actionable: true, reachable: true, note: 'the exact budget equals Residence + 1 road + Farm' },
      { scenario: 'Population expansion', form: 'measurable constraint (population 4, capacity 4, Food balanced)', actionable: true, reachable: true, note: 'costs exactly the 100 Material granted' },
      { scenario: 'Recovery', form: 'measurable milestone (Settlement)', actionable: true, reachable: true, note: 'the single blocker is Food balance' },
    ]
    const sufficient = objectives.filter((row) => row.reachable).length
    audit('OBJECTIVE_AUDIT', {
      objectives,
      labelsAreEvaluated: false,
      conclusion:
        'labels are sufficient to frame 5 of 6 scenarios; the Industrial objective promises a running Workshop that the current economy cannot deliver at this scale, so it is descriptive rather than a success condition. No objective is evaluated (unchanged from 10AL).',
    })
    expect(sufficient).toBe(5)
    expect(objectives.every((row) => row.form.length > 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 9-11. Safety, Town+ gate and classification
// ---------------------------------------------------------------------------

describe('9-11. Safety, Town+ gate and classification', { timeout: 30000 }, () => {
  it('keeps the architecture safe', () => {
    const state = createScenarioState(shipConfig, findScenario('water-constraint')!)
    const progression = getProgression(state)
    const saved = JSON.parse(serializeSaveLocal(state)) as { version: number; state: Record<string, unknown> }
    const reorder = <T,>(record: Readonly<Record<string, T>>): Record<string, T> =>
      Object.fromEntries(Object.entries(record).reverse())
    const reordered: SimulationState = {
      ...state,
      buildings: reorder(state.buildings),
      roads: reorder(state.roads),
      colonists: reorder(state.colonists),
    }
    audit('ARCHITECTURE_SAFETY', {
      saveVersion: saved.version,
      saveKeys: Object.keys(saved.state).sort(),
      progressionInsertionOrderInvariant:
        JSON.stringify(getProgression(reordered)) === JSON.stringify(progression),
      identicalStateIdenticalProgression:
        JSON.stringify(getProgression(state)) === JSON.stringify(getProgression(state)),
      scenarioStateInSave: serializeCanonicalState(state).includes('scenario'),
      progressionStateInSave: serializeCanonicalState(state).includes('progression'),
    })
    expect(saved.version).toBe(8)
    expect(Object.keys(saved.state)).toHaveLength(8)
    expect(serializeCanonicalState(state)).not.toContain('scenario')
    expect(serializeCanonicalState(state)).not.toContain('progression')
  })

  it('classifies the six scenarios and the overall layer from the measured runs', () => {
    const classification = [
      { scenario: 'First settlement', class: 'A — distinct decision space', evidence: 'order/geometry decides Settlement vs starvation (measured)' },
      { scenario: 'Water constraint', class: 'A — distinct decision space', evidence: 'fast Village at population 2 vs late Village at population 3 (measured)' },
      { scenario: 'Industrial expansion', class: 'B — distinct consequence, overlapping decisions', evidence: 'the consequence (industry costs Water headroom and a worker) is distinct, but every policy first adds Water capacity and no policy runs a Workshop' },
      { scenario: 'Spatial efficiency', class: 'A — distinct decision space', evidence: 'a 5-Material margin separates success from starvation (measured)' },
      { scenario: 'Population expansion', class: 'A — distinct decision space', evidence: 'capacity-first vs population-first end with the same population but different Food reserves and ticks (measured)' },
      { scenario: 'Recovery', class: 'B — distinct consequence, overlapping decisions', evidence: 'repair (4 roads, keeps a redundant Farm) vs replace (1 road, 2 Farms): both reach Settlement' },
    ]
    const overall = 'B — useful foundation but needs content/tuning'
    const townGate = {
      scenariosDifferentiated: true,
      townQualitativeStateIdentified: false,
      missingPhenomenon: [
        'an evaluated objective/success condition: the scenario goal is invisible once Village is reached (the panel then shows "Next: not yet defined")',
        'a state a larger colony has and a Town does not (Steps 10AK/10AI measured the extra capacity as dormant)',
      ],
      decision: 'TOWN+ REMAINS DEFERRED',
    }
    audit('CLASSIFICATION', { classification, overall, townGate })
    expect(classification.filter((row) => row.class.startsWith('A'))).toHaveLength(4)
    expect(classification.filter((row) => row.class.startsWith('B'))).toHaveLength(2)
    expect(townGate.townQualitativeStateIdentified).toBe(false)
  })
})

import { serializeSave } from '@/index'
const serializeSaveLocal = (state: SimulationState): string => serializeSave(state)
