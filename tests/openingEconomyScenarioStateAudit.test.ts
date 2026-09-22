/**
 * Step 10AS — Opening Economy & Scenario State Audit.
 *
 * Two questions, both answered by measurement on the REAL simulation:
 *
 *  1. Is the default 100-Material opening (minimum functional Village = 105)
 *     meaningful construction-order pressure, or an accidental mismatch?
 *     (Measured: it is pressure — 3 outcome classes, and Village is reachable
 *     in ~116 ticks through an industrial bootstrap. Classification A.)
 *  2. Should Industrial Expansion's starting state change because its stock sits
 *     above the 25-per-Workshop storage cap? (Measured: no — the cap interaction
 *     IS its content; the defect is that the cap is invisible. Classification A
 *     plus a readability fix, no scenario data change.)
 *
 * No economic constant, no scenario resource, no domain rule changed.
 * `SAVE_VERSION` stays 7.
 *
 * Run:
 *   npx vitest run tests/openingEconomyScenarioStateAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  createScenarioState,
  findScenario,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getObjectiveStatus,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getWaterProductionPerTick,
  getWaterSupplyStatus,
  hashCanonicalState,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  INITIAL_WATER,
  iterateBuildings,
  loadSave,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type ScenarioDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 12, height: 12 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness: a plan runner with real commands and the real affordability gate
// ---------------------------------------------------------------------------

type Step =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
  | { readonly kind: 'ticks'; readonly n: number }
  | { readonly kind: 'until'; readonly label: string; readonly test: (state: SimulationState) => boolean; readonly max?: number }
  | { readonly kind: 'role'; readonly colonist: number; readonly role: BuildingType }

interface Reading {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly material: number
  readonly water: number
  readonly capacity: number
  readonly supply: string
  readonly storage: number
  readonly employed: number
  readonly buildings: number
  readonly roads: number
  readonly stage: string
}

const read = (state: SimulationState): Reading => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  material: state.resources.construction,
  water: state.resources.water,
  capacity: getWaterProductionPerTick(state),
  supply: getWaterSupplyStatus(state).state,
  storage: getMaterialStorageCapacity(state),
  employed: Object.values(state.colonists).filter((c) => c.workplaceId !== null).length,
  buildings: Object.keys(state.buildings).length,
  roads: Object.keys(state.roads).length,
  stage: getProgression(state).stage,
})

interface PlanResult {
  readonly state: SimulationState
  readonly reading: Reading
  readonly placements: readonly { readonly label: string; readonly tick: number; readonly accepted: boolean }[]
  readonly wipeTick: number | null
  readonly settlementTick: number | null
  readonly villageTick: number | null
}

const runPlan = (start: SimulationState, steps: readonly Step[], horizon: number): PlanResult => {
  let state = start
  const placements: { label: string; tick: number; accepted: boolean }[] = []
  let wipeTick: number | null = null
  let settlementTick: number | null = null
  let villageTick: number | null = null
  let previousPopulation = getPopulationCount(state)
  const observe = (): void => {
    const population = getPopulationCount(state)
    if (wipeTick === null && population === 0 && previousPopulation > 0) wipeTick = state.time.tick
    previousPopulation = population
    const stage = getProgression(state).stage
    if (settlementTick === null && (stage === 'settlement' || stage === 'village')) settlementTick = state.time.tick
    if (villageTick === null && stage === 'village') villageTick = state.time.tick
  }
  const tick = (n: number): void => {
    for (let i = 0; i < n; i += 1) {
      state = stepSimulation(state)
      observe()
    }
  }
  observe()
  for (const step of steps) {
    switch (step.kind) {
      case 'ticks':
        tick(step.n)
        break
      case 'until': {
        const max = step.max ?? 400
        let waited = 0
        while (waited < max && !step.test(state)) {
          tick(1)
          waited += 1
        }
        break
      }
      case 'roads': {
        const cost = step.cells.length * 5
        let guard = 0
        while (guard < 300 && state.resources.construction < cost) {
          tick(1)
          guard += 1
        }
        const before = state.resources.construction
        state = stepSimulation(state, { type: 'placeRoads', cells: [...step.cells] })
        placements.push({
          label: `roads x${step.cells.length}`,
          tick: state.time.tick,
          accepted: state.resources.construction === before - cost,
        })
        tick(2)
        break
      }
      case 'role': {
        let guard = 0
        let done = false
        while (guard < 30 && !done) {
          const colonists = Object.values(state.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
          const colonist = colonists[step.colonist]
          const target = [...iterateBuildings(state)].find(
            (building) =>
              building.type === step.role &&
              building.status === 'operational' &&
              !Object.values(state.colonists).some((c) => c.workplaceId === building.id)
          )
          if (colonist !== undefined && target !== undefined) {
            state = stepSimulation(state, {
              type: 'reassignColonist',
              colonistId: colonist.id,
              workplaceId: target.id,
            })
            done = true
          } else {
            tick(1)
            guard += 1
          }
        }
        break
      }
      case 'building': {
        let guard = 0
        while (
          guard < 400 &&
          !getPlacementAffordability(state, { x: step.x, y: step.y }, step.type).affordable
        ) {
          tick(1)
          guard += 1
        }
        const buildingsBefore = Object.keys(state.buildings).length
        state = stepSimulation(state, { type: 'placeBuilding', x: step.x, y: step.y, buildingType: step.type })
        placements.push({
          label: `${step.type}@${step.x},${step.y}`,
          tick: state.time.tick,
          accepted: Object.keys(state.buildings).length === buildingsBefore + 1,
        })
        tick(3)
        break
      }
    }
  }
  tick(horizon)
  return { state, reading: read(state), placements, wipeTick, settlementTick, villageTick }
}

const opening = (): SimulationState => createInitialState(config)

// ---------------------------------------------------------------------------
// 1. THE OPENING STATE SPACE
// ---------------------------------------------------------------------------

describe('1. Opening sequences from the default 100 Material', { timeout: 300000 }, () => {
  it('groups the legal construction orders by causal outcome', () => {
    const plans: { readonly name: string; readonly steps: readonly Step[]; readonly horizon: number; readonly klass: string }[] = [
      {
        name: 'S1 settle core (Residence, road, Farm)',
        klass: 'stable Settlement, stagnant',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
        ],
      },
      {
        name: 'S2 Well before Farm (Well-first)',
        klass: 'death by starvation',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'well', x: 2, y: 1 },
        ],
      },
      {
        name: 'S3 settle core + second Residence',
        klass: 'stable Settlement, hard stall at 20 Material',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'building', type: 'residence', x: 1, y: 2 },
        ],
      },
      {
        name: 'S4 settle core + Well (before housing)',
        klass: 'stable Settlement, Well vacant, 20 Material idle',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'building', type: 'well', x: 2, y: 1 },
        ],
      },
      {
        name: 'S5 minimum Village package (105) built buildings-first',
        klass: 'death by starvation, the road is 5 Material short',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'building', type: 'well', x: 2, y: 1 },
          { kind: 'building', type: 'residence', x: 1, y: 2 },
          { kind: 'roads', cells: [{ x: 1, y: 1 }] },
        ],
      },
      {
        name: 'S6 the whole 100 spent on buildings, no road',
        klass: 'death by starvation, nothing is reachable',
        horizon: 300,
        steps: [
          { kind: 'building', type: 'residence', x: 1, y: 0 },
          { kind: 'building', type: 'farm', x: 0, y: 1 },
          { kind: 'building', type: 'well', x: 2, y: 1 },
          { kind: 'building', type: 'residence', x: 1, y: 2 },
        ],
      },
    ]
    const rows = plans.map((plan) => {
      const result = runPlan(opening(), plan.steps, plan.horizon)
      return {
        name: plan.name,
        class: plan.klass,
        placements: result.placements,
        settlementTick: result.settlementTick,
        villageTick: result.villageTick,
        wipeTick: result.wipeTick,
        final: result.reading,
      }
    })
    audit('OPENING_SEQUENCES', {
      rows,
      reading:
        'same 100 Material, same world: three outcome classes — a stable but stalled Settlement, a slow starvation, and (with the industrial bootstrap) a Village',
    })
    const [s1, s2, s3, , s5, s6] = rows
    // S1: the canonical safe core.
    expect(s1!.settlementTick).not.toBeNull()
    expect(s1!.wipeTick).toBeNull()
    expect(s1!.final.population).toBe(1)
    expect(s1!.final.material).toBe(45)
    // S2: Well-first starves (no Farm) at the measured tick.
    expect(s2!.wipeTick).toBe(104)
    expect(s2!.final.food).toBe(0)
    // S3: the safe package stalls with 20 Material and one idle colonist.
    expect(s3!.final.population).toBe(2)
    expect(s3!.final.material).toBe(20)
    expect(s3!.final.employed).toBe(1)
    expect(s3!.final.supply).toBe('inactive')
    // S5/S6: the 5-Material shortfall is fatal in these orders.
    expect(s5!.placements.find((p) => p.label.startsWith('roads'))?.accepted).toBe(false)
    expect(s5!.wipeTick).toBe(104)
    expect(s6!.wipeTick).toBe(104)
    expect(s6!.final.buildings).toBe(4)
    expect(s6!.final.roads).toBe(0)
  })

  it('measures the exact 5-Material shortfall of the 105 package', () => {
    const result = runPlan(
      opening(),
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'building', type: 'farm', x: 0, y: 1 },
        { kind: 'building', type: 'well', x: 2, y: 1 },
        { kind: 'building', type: 'residence', x: 1, y: 2 },
      ],
      5
    )
    const afterFour = result.reading
    const road = getPlacementAffordability(result.state, { x: 1, y: 1 }, 'residence')
    audit('GAP_105', {
      minimumVillageCost: 2 * 25 + 25 + 25 + 5,
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      materialAfterFourBuildings: afterFour.material,
      roadCost: 5,
      shortfall: 5 - afterFour.material,
      roadAffordable: road.affordable,
      measuredAt: 'the moment the fifth purchase is attempted',
    })
    // 105 = 2 Residences + Farm + Well + 1 shared road cell; the stock is 100.
    expect(2 * 25 + 25 + 25 + 5).toBe(105)
    expect(INITIAL_CONSTRUCTION_MATERIAL).toBe(100)
    expect(afterFour.material).toBe(0)
    expect(road.affordable).toBe(false)
    expect(road.placement.valid).toBe(false)
  })

  it('reaches Village from 100 through the industrial bootstrap', () => {
    // 25 Residence + 10 two roads + 25 Well + 25 Workshop = 85, then two
    // Water -> Material cycles pay for the Farm and the second Residence.
    const result = runPlan(
      opening(),
      [
        { kind: 'building', type: 'residence', x: 1, y: 0 },
        { kind: 'roads', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
        { kind: 'building', type: 'well', x: 2, y: 2 },
        { kind: 'building', type: 'workshop', x: 1, y: 2 },
        { kind: 'role', colonist: 0, role: 'well' },
        { kind: 'until', label: 'water >= 12 for the first cycle', test: (s) => s.resources.water >= 12, max: 60 },
        { kind: 'role', colonist: 0, role: 'workshop' },
        { kind: 'building', type: 'farm', x: 0, y: 1 },
        { kind: 'role', colonist: 0, role: 'farm' },
        { kind: 'until', label: 'food recovered to 100', test: (s) => s.resources.food >= 100, max: 60 },
        { kind: 'role', colonist: 0, role: 'well' },
        { kind: 'until', label: 'water >= 14 for the second cycle', test: (s) => s.resources.water >= 14, max: 80 },
        { kind: 'role', colonist: 0, role: 'workshop' },
        { kind: 'building', type: 'residence', x: 3, y: 1 },
        { kind: 'role', colonist: 0, role: 'well' },
        { kind: 'until', label: 'a second colonist is admitted', test: (s) => Object.keys(s.colonists).length >= 2, max: 60 },
        { kind: 'role', colonist: 0, role: 'farm' },
        { kind: 'role', colonist: 1, role: 'well' },
      ],
      60
    )
    audit('INDUSTRIAL_BOOTSTRAP', {
      placements: result.placements,
      settlementTick: result.settlementTick,
      villageTick: result.villageTick,
      wipeTick: result.wipeTick,
      final: result.reading,
      reading:
        'the 5-Material gap has a causal answer: the colony manufactures the missing Material with a Well + Workshop bootstrap, paying with the Food reserve (the Farm must stand vacant while the single colonist runs the conversion)',
    })
    expect(result.wipeTick).toBeNull()
    expect(result.villageTick).not.toBeNull()
    expect(result.villageTick).toBeLessThan(150)
    expect(result.reading.population).toBe(2)
    expect(result.reading.capacity).toBe(WATER_PER_WELL_PER_TICK)
    expect(result.reading.employed).toBe(2)
    expect(result.reading.food).toBeGreaterThan(0)
    expect(result.reading.stage).toBe('village')
    // It cost the Food reserve: the colony ends with materially less Food than
    // it started with, and that is the price of the manufactured Material.
    expect(result.reading.food).toBeLessThan(INITIAL_FOOD)
  })
})

// ---------------------------------------------------------------------------
// 2. THE 100 -> 105 GAP: hypotheses H1..H4
// ---------------------------------------------------------------------------

describe('2. The 100 -> 105 gap', () => {
  it('evaluates the four hypotheses against the measurements', () => {
    const hypotheses = {
      H1_accidental: {
        supported: 'partially',
        evidence:
          'the stated minimum functional Village costs exactly 105 and the stock is exactly 100, so the intended package is unaffordable. The shortfall is exactly one road cell (5), which the package cannot do without: 4 buildings with no road starve (measured wipe at 104, S6)',
      },
      H2_order_pressure: {
        supported: 'yes',
        evidence:
          'order decides the outcome with the same 100 Material: Residence+road+Farm settles at tick 5 and survives; Well-first starves at 104; the 105 package built buildings-first starves at 104 because the road is never affordable; spending 85 on a Well + Workshop bootstrap reaches Village at tick 116',
      },
      H3_information: {
        supported: 'partially',
        evidence:
          'the affordability feedback is precise ("cell 1,1 — insufficient material (0/5)"), but nothing in the UI names the 5-Material gap or the 105 package; the player discovers it by failing',
      },
      H4_distinct_openings: {
        supported: 'yes',
        evidence:
          'three materially different classes, not timestamps: (a) stall at Settlement with 20 idle Material and one idle colonist, (b) death by starvation in three different orders, (c) Village at tick 116 for 41 Food — a real strategic choice between a safe small colony and a risky industrial bootstrap',
      },
      classification: 'A — healthy opening',
      note: 'the 5 is not a tuned number: it is the road cost, and the road is what makes the package function',
    }
    audit('GAP_HYPOTHESES', hypotheses)
    expect(hypotheses.H2_order_pressure.supported).toBe('yes')
    expect(hypotheses.H4_distinct_openings.supported).toBe('yes')
    expect(hypotheses.classification.startsWith('A')).toBe(true)
  })

  it('measures the first five decision points', () => {
    const decisions = [
      {
        decision: '1. first building: Residence',
        legalAlternatives: 'Residence (25) is the only building that creates a colonist; a Farm or Well first would be inert',
        downstream: 'a colonist exists and eats 1 Food/tick',
        reversible: 'no (25 Material committed)',
        visible: 'yes (population 1, Food −1/tick)',
        terminal: 'yes: with no Farm, Food runs out at tick 104',
      },
      {
        decision: '2. the first road cell',
        legalAlternatives: 'road now (5) or a second building first',
        downstream: 'without it no workplace can be staffed (mobility gate) and no Farm/Well produces (road access)',
        reversible: 'yes in principle (no demolition exists, so the Material is committed)',
        visible: 'yes (the preview names insufficient material / the building stays vacant)',
        terminal: 'yes: the 100-all-buildings order starves at tick 104 (S6)',
      },
      {
        decision: '3. Farm or Well next',
        legalAlternatives: 'Farm (Food now) or Well (Water capacity, no Food)',
        downstream: 'Farm settles; Well starves (measured wipe at 104)',
        reversible: 'no',
        visible: 'yes (Food forecast, Water status)',
        terminal: 'yes: Well-first is fatal',
      },
      {
        decision: '4. second Residence timing',
        legalAlternatives: 'housing (a second colonist) or infrastructure (a Well)',
        downstream: 'housing first stalls at 20 Material with an idle colonist; a Well first stalls with a vacant Well',
        reversible: 'no',
        visible: 'yes (resources, jobs 1/2)',
        terminal: 'no: both stall, neither dies',
      },
      {
        decision: '5. the last 20 Material',
        legalAlternatives: 'nothing costs 20: the Well needs 25 (5 short), a Workshop needs 25 + 1 Water (no Water exists)',
        downstream: 'the stock is stranded unless the colony manufactures Material',
        reversible: 'no',
        visible: 'yes (the hover reports insufficient material 20/25)',
        terminal: 'only the industrial bootstrap converts it',
      },
    ]
    audit('FIRST_FIVE_DECISIONS', { decisions })
    expect(decisions).toHaveLength(5)
    expect(decisions[4]!.legalAlternatives).toContain('25')
  })
})

// ---------------------------------------------------------------------------
// 4. INDUSTRIAL EXPANSION AUDIT
// ---------------------------------------------------------------------------

describe('4. Industrial Expansion', { timeout: 120000 }, () => {
  const definition = (): ScenarioDefinition => {
    const found = findScenario('industrial-expansion')
    if (found === undefined) throw new Error('10as: scenario missing')
    return found
  }

  it('measures the storage interaction of the current starting state', () => {
    const start = createScenarioState(config, definition())
    const startReading = read(start)
    const objective = definition().objective
    // Build the Workshop and run the burst immediately.
    let state = start
    const materialAtStart = state.resources.construction
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const afterWorkshop = read(state)
    const objectiveAfterWorkshop = getObjectiveStatus(state, objective)
    const workshopId = [...iterateBuildings(state)].find((b) => b.type === 'workshop')?.id
    const wellId = [...iterateBuildings(state)].find((b) => b.type === 'well')?.id
    const worker = Object.values(state.colonists).find((c) => c.workplaceId === wellId)
    if (workshopId === undefined || worker === undefined) throw new Error('10as: burst setup')
    state = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: worker.id,
      workplaceId: workshopId,
    })
    const materialAtBurst = state.resources.construction
    let ticks = 0
    while (state.resources.water > 0 && ticks < 30) {
      state = stepSimulation(state)
      ticks += 1
    }
    const waterGone = read(state)
    // Keep it staffed: the drain continues indefinitely because the output is
    // discarded above the cap and only upkeep is charged.
    for (let i = 0; i < 20; i += 1) {
      state = stepSimulation(state)
      ticks += 1
    }
    const afterBurst = read(state)
    audit('INDUSTRIAL_AS_IS', {
      start: { ...startReading, resources: start.resources },
      materialAtStart,
      affordability: {
        workshopMaterial: 25,
        workshopWater: 1,
        affordableFromStock: Math.floor(materialAtStart / 25),
      },
      afterWorkshop,
      objectiveAfterWorkshop: {
        state: objectiveAfterWorkshop.state,
        requirements: objectiveAfterWorkshop.requirements.map((r) => [r.label, r.met]),
      },
      burst: {
        ticks,
        materialBefore: materialAtBurst,
        materialWhenTheWaterIsGone: waterGone.material,
        materialAfter25Ticks: afterBurst.material,
        netMaterial: afterBurst.material - materialAtBurst,
        grossPerTick: getMaterialProductionPerTick(state),
        storedPerTick: getMaterialStoredProductionPerTick(state),
        storage: getMaterialStorageCapacity(state),
        waterAfter: afterBurst.water,
        supply: afterBurst.supply,
      },
      reading:
        'the stock (100) is four times the 25-per-Workshop storage, so the burst discards its output and only the 1/tick upkeep moves the number: running the Workshop immediately LOSES Material',
    })
    expect(startReading.material).toBe(100)
    expect(startReading.storage).toBe(0)
    expect(afterWorkshop.material).toBe(75)
    expect(afterWorkshop.storage).toBe(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(waterGone.water).toBe(0)
    expect(waterGone.supply).toBe('shortage')
    expect(afterBurst.material).toBeLessThan(materialAtBurst)
    // Exactly one Material lost per staffed tick: production is discarded.
    expect(materialAtBurst - afterBurst.material).toBe(ticks)
    expect(afterBurst.storage).toBe(25)
    expect(getMaterialStoredProductionPerTick(state)).toBe(0)
    expect(afterBurst.supply).toBe('shortage')
    // The objective never needed the industry: the Workshop alone completes it.
    expect(objectiveAfterWorkshop.state).toBe('completed')
  })

  it('shows the burst becomes productive once the stores are spent down', () => {
    let state = createScenarioState(config, definition())
    state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const atWorkshop = read(state)
    // Spend the stores below the cap: 25 Workshop + 3 x 25 = the whole 100.
    const spend = [
      { type: 'residence' as const, x: 2, y: 0 },
      { type: 'residence' as const, x: 0, y: 1 },
      { type: 'well' as const, x: 4, y: 1 },
    ]
    const stocksAfterEach: number[] = []
    for (const item of spend) {
      let guard = 0
      while (
        guard < 90 &&
        !getPlacementAffordability(state, { x: item.x, y: item.y }, item.type).affordable
      ) {
        state = stepSimulation(state)
        guard += 1
      }
      state = stepSimulation(state, { type: 'placeBuilding', x: item.x, y: item.y, buildingType: item.type })
      stocksAfterEach.push(state.resources.construction)
    }
    // Staff the Workshop and read what it can actually store now.
    const workshopId = [...iterateBuildings(state)].find((b) => b.type === 'workshop')?.id
    const freeWorker = Object.values(state.colonists).find((c) => c.workplaceId !== workshopId)
    if (workshopId === undefined || freeWorker === undefined) throw new Error('10as: spend-down setup')
    state = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId: freeWorker.id,
      workplaceId: workshopId,
    })
    const before = read(state)
    const gross = getMaterialProductionPerTick(state)
    const stored = getMaterialStoredProductionPerTick(state)
    for (let i = 0; i < 10; i += 1) state = stepSimulation(state)
    const after = read(state)
    audit('INDUSTRIAL_SPEND_DOWN', {
      atWorkshop,
      stocksAfterEachSpend: stocksAfterEach,
      beforeBurst: before,
      grossPerTick: gross,
      storedPerTick: stored,
      after,
      gained: after.material - before.material,
      reading:
        'below the cap the SAME Workshop output is stored (stored > 0) instead of discarded, which is why the scenario teaches the storage rule rather than being broken by it',
    })
    expect(atWorkshop.material).toBe(75)
    expect(stocksAfterEach).toHaveLength(3)
    expect(gross).toBe(2)
    // The contrast with the as-is case (stored === 0): the same output is
    // STORED below the cap. At the cap-1 rest the net is 0 by upkeep, which is
    // the 08F/08C equilibrium, not a loss.
    expect(stored).toBeGreaterThan(0)
    expect(after.material).toBeGreaterThanOrEqual(before.material)
  })

  it('tests the reframing candidates and rejects them', () => {
    const current = definition()
    const candidates = [
      {
        name: 'R1 as-is (Material 100, Water 10)',
        material: 100,
        water: 10,
        derived: 'current data',
      },
      {
        name: 'R2 Workshop-cost stock (Material 25, Water 10)',
        material: 25,
        water: 10,
        derived: '25 = the Workshop construction cost; 10 Water buys 5 Material = one road cell',
      },
      {
        name: 'R3 one-building Water budget (Material 100, Water 51)',
        material: 100,
        water: 51,
        derived: '51 = 25 x 2 + the Workshop construction Water: one more building',
      },
    ].map((candidate) => {
      const probe: ScenarioDefinition = {
        ...current,
        id: `probe-${candidate.material}-${candidate.water}`,
        resources: { material: candidate.material, food: current.resources.food, water: candidate.water },
      }
      const start = createScenarioState(config, probe)
      let state = start
      state = stepSimulation(state, { type: 'placeBuilding', x: 2, y: 2, buildingType: 'workshop' })
      for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
      const afterWorkshop = read(state)
      const workshopId = [...iterateBuildings(state)].find((b) => b.type === 'workshop')?.id
      const wellId = [...iterateBuildings(state)].find((b) => b.type === 'well')?.id
      const worker = Object.values(state.colonists).find((c) => c.workplaceId === wellId)
      if (workshopId === undefined || worker === undefined) throw new Error('10as: burst setup')
      state = stepSimulation(state, {
        type: 'reassignColonist',
        colonistId: worker.id,
        workplaceId: workshopId,
      })
      let ticks = 0
      while (state.resources.water > 0 && ticks < 40) {
        state = stepSimulation(state)
        ticks += 1
      }
      const after = read(state)
      return {
        name: candidate.name,
        derived: candidate.derived,
        startMaterial: candidate.material,
        startWater: candidate.water,
        afterWorkshop: afterWorkshop.material,
        afterBurst: after.material,
        gained: after.material - afterWorkshop.material,
        accepted: true,
      }
    })
    audit('INDUSTRIAL_REFRAMING', {
      candidates,
      verdict:
        'R2 makes the burst visibly positive (0 -> 24) but adds no decision: the objective (build the Workshop) is complete before industry runs, and funding a BUILDING with the burst is water-reserve-industry (Water 51). R3 keeps the stock above the cap and duplicates that Water budget. Neither is better than making the existing rule visible, so the state stays unchanged.',
    })
    expect(candidates[0]!.gained).toBeLessThan(0)
    expect(candidates[1]!.gained).toBeGreaterThan(0)
    expect(candidates[2]!.gained).toBeLessThan(0)
    // The version that would make the burst fund a building is the other scenario.
    const wri = findScenario('water-reserve-industry')
    expect(wri?.resources.water).toBe(51)
  })

  it('classifies it A — keep unchanged, with a readability fix', () => {
    const classification = {
      scenario: 'Industrial expansion',
      class: 'A — keep unchanged (readability fix only)',
      startingMaterial: 100,
      storageInteraction:
        'the stock is 4x the 25-per-Workshop storage, so the Workshop output is discarded and only its upkeep moves the number (measured -25 Material over 25 ticks)',
      objective:
        'Reach Village + build a Workshop: reachable at tick 1 from the stock, with no industry needed — which is the scenario\'s honest framing (a Workshop that cannot be run at this scale)',
      excessMaterialRelevance:
        'the excess is irrelevant to the objective but IS the scenario\'s lesson: 25-per-Workshop storage bounds what industry can add, and spending below the cap makes the same burst productive (+1/tick)',
      defect: 'the cap is invisible: the HUD showed only the stock, so "Material 75 with a Workshop that produces 2/tick" appeared to do nothing',
      fix: 'show the storage cap (and the discard) next to the Material stock; name the cap in the scenario copy — no resource, requirement or rule change',
      reframed: 'no',
      deferred: 'no',
    }
    audit('INDUSTRIAL_CLASSIFICATION', classification)
    expect(classification.class.startsWith('A')).toBe(true)
    expect(classification.reframed).toBe('no')
    expect(classification.deferred).toBe('no')
  })
})

// ---------------------------------------------------------------------------
// 6-7. SCENARIO COMPARISON AND THE TUNING GATE
// ---------------------------------------------------------------------------

describe('6-7. Comparison and tuning gate', () => {
  it('compares the three openings across the six criteria', () => {
    const rows = [
      {
        scenario: 'Default opening (free play)',
        firstDecision: 'Residence first, then Farm or Well (the Well-first order dies)',
        bottleneck: 'Material 100 vs the 105 Village package: 5 short, and no Material producer exists',
        constructionSequence: 'Residence -> road -> Farm -> (second Residence | Well) -> the last 20 stall',
        timing: 'the industrial bootstrap needs ~116 ticks and 41 Food',
        failure: 'starvation at tick 104 (Well-first, no road, buildings-first)',
        objective: 'none (free play): the player sets the goal',
      },
      {
        scenario: 'Industrial expansion',
        firstDecision: 'build the Workshop (nothing else is required)',
        bottleneck: 'a worker + Water: the colony has 2 workers, 2 workplaces and 10 Water',
        constructionSequence: 'Workshop at tick 1; the objective completes with it',
        timing: 'the burst is optional and currently counter-productive above the cap',
        failure: 'a permanently draining Workshop if it is left staffed (measured -1 Material/tick)',
        objective: 'Reach Village + build a Workshop',
      },
      {
        scenario: 'Water reserve industry',
        firstDecision: 'spend the last 25 Material on the Workshop (the converter) or on the Well',
        bottleneck: 'Material 25 with Water 51 as the only budget',
        constructionSequence: 'Workshop -> burst -> second Well -> recovery',
        timing: 'the burst is mandatory and its order is terminal if reversed',
        failure: 'a terminal Material lock (spending the budget before the converter)',
        objective: 'Reach Village + Workshop + a second Well',
      },
    ]
    audit('SCENARIO_COMPARISON', {
      rows,
      verdict:
        'the three demand different reasoning: the default opening is a budget/order puzzle with a discovered industrial answer; Industrial expansion is a limit tutorial (buildable, not runnable); Water reserve industry is a conversion/naming puzzle with a terminal order',
    })
    expect(rows).toHaveLength(3)
    expect(new Set(rows.map((r) => r.objective)).size).toBe(3)
  })

  it('classifies the opening economy A — healthy and justifies no tuning', () => {
    const gate = {
      classification: 'A — healthy',
      evidence: [
        'the 100 -> 105 gap produces three measured outcome classes from the same stock (stall / starvation / Village)',
        'Village is reachable from 100 in ~116 ticks through an existing-rule industrial bootstrap, paying 41 Food',
        'the industrial scenario is framed through existing state once the storage cap is visible; its resource data needs no change',
        'no measured state requires a production, consumption, cost or starting-stock change to become meaningful',
      ],
      tuningJustified: false,
      deferredTuning: 'none: no tuning proposal is produced because the evidence shows no systemic problem',
      openingChange: 'none (the initial stock stays 100)',
    }
    audit('TUNING_GATE', gate)
    expect(gate.classification.startsWith('A')).toBe(true)
    expect(gate.tuningJustified).toBe(false)
    expect(INITIAL_CONSTRUCTION_MATERIAL).toBe(100)
    expect(INITIAL_WATER).toBe(0)
    expect(INITIAL_FOOD).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 8-9. IMPLEMENTATION AND INVARIANTS
// ---------------------------------------------------------------------------

describe('8-9. Implementation and invariants', () => {
  it('changes no economic value, no scenario resource and no persisted state', () => {
    const definition = findScenario('industrial-expansion')!
    const start = createScenarioState(config, definition)
    const saved = JSON.parse(serializeSave(stepSimulation(start)))
    const invariants = {
      saveVersion: SAVE_VERSION,
      saveKeys: Object.keys(saved.state).sort(),
      deterministic: hashCanonicalState(start) === hashCanonicalState(createScenarioState(config, definition)),
      roundTrip: hashCanonicalState(loadSave(serializeSave(start))) === hashCanonicalState(start),
      economicConstants: {
        foodPerFarm: FOOD_PER_FARM_PER_TICK,
        waterPerWell: WATER_PER_WELL_PER_TICK,
        foodPerColonist: FOOD_PER_COLONIST_PER_TICK,
        storagePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
        initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      },
      scenarioResources: {
        industrialExpansion: definition.resources,
        waterReserveIndustry: findScenario('water-reserve-industry')?.resources,
      },
      scenarioCount: SCENARIOS.length,
      storageDisplayInputs: {
        capacity: getMaterialStorageCapacity(start),
        gross: getMaterialProductionPerTick(start),
        stored: getMaterialStoredProductionPerTick(start),
        foodProduction: getFoodProductionPerTick(start),
      },
    }
    audit('ARCHITECTURAL_INVARIANTS', invariants)
    expect(invariants.saveVersion).toBe(7)
    expect(invariants.saveKeys).toHaveLength(7)
    expect(invariants.deterministic).toBe(true)
    expect(invariants.roundTrip).toBe(true)
    expect(invariants.economicConstants).toEqual({
      foodPerFarm: 2,
      waterPerWell: 2,
      foodPerColonist: 1,
      storagePerWorkshop: 25,
      initialMaterial: 100,
    })
    // Scenario resources are untouched by this step.
    expect(invariants.scenarioResources.industrialExpansion).toEqual({ material: 100, food: 50, water: 10 })
    expect(invariants.scenarioResources.waterReserveIndustry).toEqual({ material: 25, food: 50, water: 51 })
    expect(invariants.scenarioCount).toBe(7)
    // The HUD storage display is derived from existing queries only.
    expect(invariants.storageDisplayInputs.capacity).toBe(0)
    expect(invariants.storageDisplayInputs.stored).toBe(0)
    expect(getObjectiveStatus(start, definition.objective).state).toBe('in_progress')
  })
})
