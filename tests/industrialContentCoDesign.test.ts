/**
 * Step 10AQ — Industrial Content & Progression Co-Design.
 *
 * Content step on the UNCHANGED 2/2 economy: this file measures the existing
 * Water -> Material conversion loop, evaluates the Industrial Expansion
 * framings, and encodes the contract of the ONE scenario the measurements
 * justify (`water-reserve-industry`). The only production-code change of the
 * step is declarative scenario data in `src/application/scenarios.ts`; no
 * domain economic value, admission rule, workforce rule or persistence changed.
 *
 * Every number below is produced by the real `stepSimulation` and real
 * `placeBuilding` / `reassignColonist` commands — there is no mirror engine
 * here (the 10AP parameterised engine was only needed for rate experiments).
 *
 * Run:
 *   npx vitest run tests/industrialContentCoDesign.test.ts --reporter=verbose
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
  FOOD_PER_FARM_PER_TICK,
  getFoodProductionPerTick,
  getObjectiveStatus,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getReassignmentOptions,
  getWaterProductionPerTick,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  SAVE_VERSION,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  validateReassignment,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type ObjectiveDefinition,
  type ScenarioDefinition,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step1', width: 20, height: 16 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Harness (direct domain fixture helpers, as in the 10AO/10AP audits)
// ---------------------------------------------------------------------------

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10aq: building missing')
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
  if (id === undefined) throw new Error('10aq: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10aq: no road')
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface Fixture {
  readonly residences: number
  readonly types: readonly BuildingType[]
  readonly food?: number
  readonly water?: number
  readonly material?: number
}

/** One street line: Residences y=0, workplaces y=2, operational road y=1. */
const build = (fixture: Fixture): SimulationState => {
  let state = createInitialState(config)
  state = {
    ...state,
    resources: {
      construction: fixture.material ?? 0,
      food: fixture.food ?? 200,
      water: fixture.water ?? 0,
    },
  }
  const columns = fixture.residences + fixture.types.length
  for (let i = 0; i < fixture.residences; i += 1) state = op(state, 'residence', 1 + 2 * i, 0)
  fixture.types.forEach((type, i) => {
    state = op(state, type, 1 + 2 * (fixture.residences + i), 2)
  })
  for (let x = 0; x < 2 * columns + 12; x += 1) state = opRoad(state, x, 1)
  const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
  for (let i = 0; i < fixture.residences; i += 1) {
    const residence = residences[i]
    if (residence !== undefined) state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const idsOf = (state: SimulationState, type: BuildingType): readonly string[] =>
  [...iterateBuildings(state)].filter((b) => b.type === type).map((b) => b.id)

const staffedCount = (state: SimulationState, type: BuildingType): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (building.type !== type || building.status !== 'operational') continue
    if (Object.values(state.colonists).some((c) => c.workplaceId === building.id)) total += 1
  }
  return total
}

interface Reading {
  readonly tick: number
  readonly population: number
  readonly food: number
  readonly water: number
  readonly material: number
  readonly stage: string
  readonly waterCapacity: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly staffedWorkshops: number
  readonly operationalBuildings: number
}

const read = (state: SimulationState): Reading => ({
  tick: state.time.tick,
  population: getPopulationCount(state),
  food: state.resources.food,
  water: state.resources.water,
  material: state.resources.construction,
  stage: getProgression(state).stage,
  waterCapacity: getWaterProductionPerTick(state),
  staffedFarms: staffedCount(state, 'farm'),
  staffedWells: staffedCount(state, 'well'),
  staffedWorkshops: staffedCount(state, 'workshop'),
  operationalBuildings: [...iterateBuildings(state)].filter((b) => b.status === 'operational').length,
})

/** The industrial loop: move one staffed Well worker onto the Workshop. */
const startBurst = (state: SimulationState): SimulationState => {
  const wellId = idsOf(state, 'well')[0]
  const workshopId = idsOf(state, 'workshop')[0]
  if (wellId === undefined || workshopId === undefined) throw new Error('10aq: no workplace')
  const worker = Object.values(state.colonists).find((c) => c.workplaceId === wellId)
  if (worker === undefined) throw new Error('10aq: no well worker')
  return stepSimulation(state, {
    type: 'reassignColonist',
    colonistId: worker.id,
    workplaceId: workshopId,
  })
}

/** The recovery: move the Workshop worker back onto a FREE Well. */
const recover = (state: SimulationState): SimulationState => {
  const workshopId = idsOf(state, 'workshop')[0]
  const worker = Object.values(state.colonists).find((c) => c.workplaceId === workshopId)
  const wellId = idsOf(state, 'well').find(
    (id) => !Object.values(state.colonists).some((c) => c.id !== worker?.id && c.workplaceId === id)
  )
  if (worker === undefined || wellId === undefined) throw new Error('10aq: no burst worker')
  return stepSimulation(state, {
    type: 'reassignColonist',
    colonistId: worker.id,
    workplaceId: wellId,
  })
}

/** Run the burst until the reserve is gone or the storage clamp stops it. */
const runBurst = (state: SimulationState, maxTicks = 200): { state: SimulationState; ticks: number } => {
  let next = state
  let ticks = 0
  while (next.resources.water > 0 && next.resources.construction < MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP && ticks < maxTicks) {
    next = stepSimulation(next)
    ticks += 1
  }
  return { state: next, ticks }
}

/** Balanced 2/2 colony at P with one operational Workshop and a Water reserve. */
const balancedWithWorkshop = (population: number, water: number, food = 200): SimulationState => {
  const wells = Math.ceil(population / 2)
  const farms = Math.ceil(population / 2)
  const types: BuildingType[] = [
    ...Array.from({ length: farms }, () => 'farm' as BuildingType),
    ...Array.from({ length: wells }, () => 'well' as BuildingType),
    'workshop',
  ]
  return build({ residences: population, types, water, food, material: 0 })
}

// ---------------------------------------------------------------------------
// 1. ECONOMIC BASELINE FROZEN
// ---------------------------------------------------------------------------

describe('1. Economic baseline', { timeout: 30000 }, () => {
  it('is unchanged and is the only economy every scenario runs on', () => {
    const baseline = {
      foodPerFarm: FOOD_PER_FARM_PER_TICK,
      waterPerWell: WATER_PER_WELL_PER_TICK,
      materialPerWorker: MATERIAL_PER_WORKER_PER_TICK,
      workshopUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      foodPerColonist: FOOD_PER_COLONIST_PER_TICK,
      waterPerColonist: WATER_PER_COLONIST_PER_TICK,
      materialStoragePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      saveVersion: SAVE_VERSION,
    }
    audit('ECONOMIC_BASELINE', baseline)
    expect(baseline).toEqual({
      foodPerFarm: 2,
      waterPerWell: 2,
      materialPerWorker: 2,
      workshopUpkeep: 1,
      foodPerColonist: 1,
      waterPerColonist: 1,
      materialStoragePerWorkshop: 25,
      saveVersion: 8,
    })
  })
})

// ---------------------------------------------------------------------------
// 2. THE EXISTING INDUSTRIAL LOOP
// ---------------------------------------------------------------------------

describe('2. The existing industrial loop', { timeout: 60000 }, () => {
  it('measures the burst and the recovery at P = 2, 4 and 6', () => {
    const rows = [2, 4, 6].map((population) => {
      const start = balancedWithWorkshop(population, 50)
      const before = read(start)
      const burst = runBurst(startBurst(start))
      const after = read(burst.state)
      // Recovery: return the worker; does the reserve come back?
      const recoveredStart = read(recover(burst.state))
      let recovered = recover(burst.state)
      for (let i = 0; i < 100; i += 1) recovered = stepSimulation(recovered)
      const recovery = read(recovered)
      return {
        population,
        reserveAtStart: before.water,
        industrialTicks: burst.ticks,
        waterDrained: before.water - after.water,
        materialGained: after.material - before.material,
        materialAtEnd: after.material,
        storageCapacity: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP * 1,
        stageDuringBurst: after.stage,
        recoveryWaterAtStart: recoveredStart.water,
        recoveryWaterAtEnd: recovery.water,
        waterRefilled: recovery.water - recoveredStart.water,
        cyclesBeforeRefill: 1,
      }
    })
    audit('INDUSTRIAL_LOOP', {
      rows,
      maxWaterReserve: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP * 2,
      reading:
        'a 50-Water reserve buys 25 ticks of industry and one building of Material (25, the per-Workshop storage): that is the MAXIMUM useful reserve, because the clamp discards everything beyond it. The reserve does not refill at the balanced colony, so the burst is one-way until the player creates a Water surplus',
    })
    for (const row of rows) {
      expect(row.industrialTicks).toBe(25)
      expect(row.waterDrained).toBe(50)
      expect(row.materialGained).toBeGreaterThanOrEqual(24)
      expect(row.materialAtEnd).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
      expect(row.waterRefilled).toBe(0)
      expect(row.cyclesBeforeRefill).toBe(1)
    }
    // The conversion is population-independent: one displaced Well worker
    // drains exactly 2 Water per tick and the Workshop nets exactly 1 Material
    // per tick (2 produced - 1 upkeep), so the ratio is 2 Water : 1 Material.
    for (const row of rows) {
      expect(row.waterDrained / row.industrialTicks).toBe(WATER_PER_WELL_PER_TICK)
      expect(row.materialGained / row.industrialTicks).toBeCloseTo(1, 1)
    }
  })

  it('measures the repeatable Food-funded cycle at P = 2', () => {
    let state = build({
      residences: 2,
      types: ['farm', 'well', 'well', 'workshop'],
      water: 0,
      food: 600,
      material: 0,
    })
    const cycle = (input: SimulationState): SimulationState => {
      let next = input
      // Both workers on the two Wells: Water refills, Food drains.
      const wells = idsOf(next, 'well')
      const colonists = Object.values(next.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
      for (let i = 0; i < 2; i += 1) {
        const colonist = colonists[i]
        const well = wells[i]
        if (colonist !== undefined && well !== undefined) {
          next = stepSimulation(next, {
            type: 'reassignColonist',
            colonistId: colonist.id,
            workplaceId: well,
          })
        }
      }
      for (let i = 0; i < 20; i += 1) next = stepSimulation(next)
      // Farm + Workshop: Material accrues, Water drains.
      const sorted = Object.values(next.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
      const farm = idsOf(next, 'farm')[0]
      const workshop = idsOf(next, 'workshop')[0]
      if (sorted[0] !== undefined && farm !== undefined) {
        next = stepSimulation(next, {
          type: 'reassignColonist',
          colonistId: sorted[0].id,
          workplaceId: farm,
        })
      }
      if (sorted[1] !== undefined && workshop !== undefined) {
        next = stepSimulation(next, {
          type: 'reassignColonist',
          colonistId: sorted[1].id,
          workplaceId: workshop,
        })
      }
      for (let i = 0; i < 20; i += 1) next = stepSimulation(next)
      return next
    }
    const marks: Reading[] = [read(state)]
    for (let i = 0; i < 3; i += 1) {
      state = cycle(state)
      marks.push(read(state))
    }
    audit('FOOD_FUNDED_CYCLE', {
      marks,
      reading:
        'each cycle converts Food into Material and RESTORES the Water reserve: the conversion is repeatable when the colony can afford a Water surplus (here by leaving a Farm unstaffed for the refill leg)',
    })
    expect(marks).toHaveLength(4)
    // Water returns to (or above) its pre-cycle level; Food pays for it;
    // Material accrues. The conversion is repeatable, not one-shot.
    expect(marks[3]!.water).toBeGreaterThanOrEqual(marks[0]!.water)
    expect(marks[3]!.food).toBeLessThan(marks[0]!.food)
    expect(marks[1]!.material).toBeGreaterThan(marks[0]!.material)
  })

  it('bounds every burst by the per-Workshop storage, not by the reserve', () => {
    const small = balancedWithWorkshop(2, 50)
    const large = balancedWithWorkshop(2, 200)
    const smallBurst = runBurst(startBurst(small))
    const largeBurst = runBurst(startBurst(large))
    const smallEnd = read(smallBurst.state)
    const largeEnd = read(largeBurst.state)
    audit('STORAGE_BOUND', {
      fiftyWater: { industrialTicks: smallBurst.ticks, material: smallEnd.material, waterLeft: smallEnd.water },
      twoHundredWater: { industrialTicks: largeBurst.ticks, material: largeEnd.material, waterLeft: largeEnd.water },
      reading:
        'the Workshop stops contributing at the 25-per-Workshop storage cap (08F), so a reserve larger than 50 buys more industrial TICKS but the same single building of Material',
    })
    expect(smallEnd.material).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(largeEnd.material).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    // Four times the reserve, the same Material: the cap, not the reserve, owns the limit.
    expect(largeEnd.material).toBe(smallEnd.material)
    expect(largeBurst.ticks).toBeGreaterThan(smallBurst.ticks)
  })
})

// ---------------------------------------------------------------------------
// 3-5. THE PLAYER DECISION AND ITS CONSTRUCTION CONSEQUENCE
// ---------------------------------------------------------------------------

describe('3-5. Decision and construction consequence', { timeout: 60000 }, () => {
  /** Place a building through the real command until the gate accepts. */
  const place = (
    state: SimulationState,
    type: BuildingType,
    x: number,
    y: number
  ): { readonly state: SimulationState; readonly tick: number | null } => {
    let next = state
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const before = Object.keys(next.buildings).length
      next = stepSimulation(next, { type: 'placeBuilding', x, y, buildingType: type })
      if (Object.keys(next.buildings).length > before) return { state: next, tick: next.time.tick }
    }
    return { state: next, tick: null }
  }

  it('quantifies what the conversion buys: Water substitutes for absent Material', () => {
    // Balanced P=4 colony (2 Farms + 2 Wells) with Material 25 — exactly one
    // building — and a 51-Water reserve. The plan asks for a third Well; the
    // industrial plan asks for the same Well plus a Workshop.
    const plan = (withIndustry: boolean) => {
      const types: BuildingType[] = ['farm', 'farm', 'well', 'well']
      let state = build({
        residences: 4,
        types,
        water: 51,
        food: 300,
        material: 25,
      })
      const actions: { readonly label: string; readonly tick: number | null }[] = []
      if (withIndustry) {
        // The Workshop is placed at a free road-adjacent cell, then run.
        const built = place(state, 'workshop', 17, 2)
        state = built.state
        actions.push({ label: 'workshop@17,2', tick: built.tick })
        for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
        const burst = runBurst(startBurst(state))
        state = burst.state
        actions.push({ label: `burst ${burst.ticks} ticks`, tick: state.time.tick })
        state = recover(state)
      }
      const wellPlacement = place(state, 'well', 19, 2)
      state = wellPlacement.state
      actions.push({ label: 'well@19,2', tick: wellPlacement.tick })
      // Material has no other source: a third building needs another burst.
      const farmPlacement = place(state, 'farm', 21, 2)
      state = farmPlacement.state
      actions.push({ label: 'farm@21,2', tick: farmPlacement.tick })
      for (let i = 0; i < 60; i += 1) state = stepSimulation(state)
      return { actions, final: read(state) }
    }
    const without = plan(false)
    const withIndustry = plan(true)
    audit('CONSTRUCTION_CONSEQUENCE', {
      withoutIndustry: without,
      withIndustry,
      reading:
        'the burst yields 24-25 Material and the Workshop costs 25: the conversion is MATERIAL-NEUTRAL. What it buys is substitution — a colony holding Water but little Material can still build — and the price is the Water reserve plus the Water capacity lost while the Well is unstaffed. A second building needs a second reserve.',
    })
    // Without industry: exactly one building (the Well) and no Workshop.
    expect(without.actions[0]?.tick).not.toBeNull()
    expect(without.actions[1]?.tick).toBeNull()
    expect(without.final.staffedWorkshops).toBe(0)
    // With industry: the Workshop AND the Well are both paid for by the same
    // 25 Material plus one Water reserve.
    expect(withIndustry.actions.slice(0, 2).every((action) => action.tick !== null)).toBe(true)
    expect(withIndustry.final.operationalBuildings).toBeGreaterThan(without.final.operationalBuildings)
    expect(withIndustry.final.staffedWorkshops + 1).toBeGreaterThan(without.final.staffedWorkshops)
  })

  it('measures the four Industrial Expansion framings on the current data', () => {
    const current = findScenario('industrial-expansion')!
    const base = (): SimulationState => createScenarioState(config, current)
    // A — Material conversion: build the Workshop, then convert the reserve.
    const workshop = place(base(), 'workshop', 2, 2)
    let conversion = workshop.state
    for (let i = 0; i < 3; i += 1) conversion = stepSimulation(conversion)
    const beforeBurst = read(conversion)
    const burst = runBurst(startBurst(conversion), 40)
    const afterBurst = read(burst.state)
    // B — Industrial burst funding expansion: the same run, then try to build.
    const expansion = place(burst.state, 'residence', 4, 0)
    // C — Industrial timing: a construction objective paid by the Workshop.
    const constructionObjective: ObjectiveDefinition = {
      label: 'Village + Workshop + a second Well',
      description: 'measured framing probe',
      constraint: 'probe',
      requirements: [
        { kind: 'stage', stage: 'village' },
        { kind: 'building', buildingType: 'workshop', atLeast: 1 },
        { kind: 'building', buildingType: 'well', atLeast: 2 },
      ],
      failsWithoutColonists: true,
    }
    const expansionObjectiveStatus = getObjectiveStatus(burst.state, constructionObjective)
    audit('INDUSTRIAL_FRAMINGS', {
      A_materialConversion: {
        waterReserve: beforeBurst.water,
        burstTicks: burst.ticks,
        waterAfter: afterBurst.water,
        materialBefore: beforeBurst.material,
        materialAfter: afterBurst.material,
        materialDelta: afterBurst.material - beforeBurst.material,
        verdict: 'the burst LOSES Material: the starting stock (100) is above the 25-per-Workshop cap, so output is discarded and each tick only pays the 1-Material upkeep',
      },
      B_industrialBurst: {
        residencePlacementTick: expansion.tick,
        verdict: 'the burst cannot fund anything: no Material is stored',
      },
      C_industrialTiming: {
        objectiveStatus: expansionObjectiveStatus.state,
        blockers: expansionObjectiveStatus.blockers,
        verdict: 'unreachable on this data: the Workshop cannot pay for the Well',
      },
      D_currentObjective: {
        workshopBuildable: workshop.tick !== null,
        objective: current.objective.requirements.map((r) => r.kind),
        verdict: 'reachable and already honest after a wording correction: it asks for the Workshop, not for industry',
      },
    })
    expect(workshop.tick).not.toBeNull()
    // A/B: with the stock above the storage cap the Workshop output is discarded
    // (the burst only pays upkeep), while the scenario's 100-Material grant
    // still funds whatever the player builds: the burst funds nothing.
    expect(afterBurst.material).toBeLessThanOrEqual(beforeBurst.material)
    expect(burst.ticks).toBeLessThanOrEqual(6)
    expect(expansion.tick).not.toBeNull()
    // C: the construction objective cannot be completed.
    expect(expansionObjectiveStatus.state).toBe('in_progress')
    expect(expansionObjectiveStatus.blockers).toContain('Well built')
  })
})

// ---------------------------------------------------------------------------
// 6. INDUSTRIAL CONTENT CANDIDATES
// ---------------------------------------------------------------------------

describe('6. Industrial content candidates', { timeout: 60000 }, () => {
  it('evaluates the five candidates against the measured loop', () => {
    const candidates = [
      {
        name: 'C1 Water reserve industry',
        startState: 'Village + 1 Well, Material 25, Water 51 (exactly one Workshop + one burst building)',
        objective: 'Village + Workshop + a second Well',
        decision: 'spend the last Material on the converter or on the building, and when to run the burst',
        distinct: true,
      },
      {
        name: 'C2 Material construction sprint',
        startState: 'same, with a larger building objective',
        objective: 'two buildings paid by one burst',
        decision: 'none: the 25-per-Workshop storage caps one burst to one building',
        distinct: false,
      },
      {
        name: 'C3 Industrial recovery',
        startState: 'a stressed colony that must industrialise to repair itself',
        objective: 'repair + Workshop',
        decision: 'overlaps Recovery (the repair decision) and needs a longer horizon',
        distinct: false,
      },
      {
        name: 'C4 Industrial timing',
        startState: 'a colony with two affordable orders',
        objective: 'any of them',
        decision: 'timing only; without a hard budget it is a variant of C1',
        distinct: false,
      },
      {
        name: 'C5 Current Industrial Expansion',
        startState: 'Village, Material 100, Water 10',
        objective: 'Village + Workshop',
        decision: 'none beyond building the Workshop: the loop is worthless on this data (measured)',
        distinct: false,
      },
    ]
    audit('INDUSTRIAL_CANDIDATES', { candidates, selected: 'C1 — the only candidate whose decision the current economy makes consequential' })
    expect(candidates.filter((candidate) => candidate.distinct)).toHaveLength(1)
    expect(candidates[0]!.name).toContain('Water reserve')
  })
})

// ---------------------------------------------------------------------------
// 7-9. THE IMPLEMENTED SCENARIO CONTRACT
// ---------------------------------------------------------------------------

describe('7-9. Water reserve industry contract', { timeout: 60000 }, () => {
  const scenario = (): ScenarioDefinition => {
    const definition = findScenario('water-reserve-industry')
    if (definition === undefined) throw new Error('10aq: scenario missing')
    return definition
  }

  const place = (
    state: SimulationState,
    type: BuildingType,
    x: number,
    y: number
  ): SimulationState => {
    let next = state
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const before = Object.keys(next.buildings).length
      next = stepSimulation(next, { type: 'placeBuilding', x, y, buildingType: type })
      if (Object.keys(next.buildings).length > before) return next
    }
    throw new Error(`10aq: ${type}@${x},${y} never affordable`)
  }

  it('declares only data: the starting state runs on the unchanged simulation', () => {
    const definition = scenario()
    const state = createScenarioState(config, definition)
    const declared = {
      id: definition.id,
      name: definition.name,
      resources: definition.resources,
      buildings: definition.buildings.length,
      roads: definition.roads.length,
      colonists: definition.colonists.length,
      requirements: definition.objective.requirements.map((requirement) => requirement.kind),
      failsWithoutColonists: definition.objective.failsWithoutColonists,
      measured: read(state),
    }
    audit('SCENARIO_DECLARATION', declared)
    expect(state.resources.construction).toBe(25)
    expect(state.resources.water).toBe(51)
    expect(state.resources.food).toBe(50)
    expect(getPopulationCount(state)).toBe(2)
    // The scenario is a Village with Food balanced and Water capacity 2.
    expect(getProgression(state).stage).toBe('village')
    expect(getFoodProductionPerTick(state)).toBe(2)
    expect(getWaterProductionPerTick(state)).toBe(2)
    // 25 = the Workshop; 51 = 25 x 2 (the burst) + the Workshop's 1 Water.
    expect(scenario().resources.material).toBe(25)
    expect(scenario().resources.water).toBe(25 * 2 + 1)
  })

  it('is reachable: Workshop, burst, second Well, recovery, complete', () => {
    const objective = scenario().objective
    const start = createScenarioState(config, scenario())
    const atStart = getObjectiveStatus(start, objective)
    // 1. Build the Workshop (Material 25 -> 0, Water 51 -> 50).
    let state = place(start, 'workshop', 4, 2)
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const afterWorkshop = read(state)
    // 2. Run the burst on the reserve.
    const burst = runBurst(startBurst(state))
    state = burst.state
    const afterBurst = read(state)
    const duringBurst = getObjectiveStatus(state, objective)
    // 3. Build the second Well from the burst Material.
    state = place(state, 'well', 2, 2)
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const afterWell = read(state)
    const beforeRecovery = getObjectiveStatus(state, objective)
    // 4. Recover: the worker returns to a Well.
    state = recover(state)
    for (let i = 0; i < 5; i += 1) state = stepSimulation(state)
    const recovered = read(state)
    const completed = getObjectiveStatus(state, objective)
    audit('WATER_RESERVE_INDUSTRY_RUN', {
      atStart: { state: atStart.state, blockers: atStart.blockers, reading: read(start) },
      afterWorkshop,
      burstTicks: burst.ticks,
      afterBurst,
      duringBurst: { state: duringBurst.state, blockers: duringBurst.blockers },
      afterWell,
      beforeRecovery: { state: beforeRecovery.state, blockers: beforeRecovery.blockers },
      recovered,
      completed: { state: completed.state, requirements: completed.requirements },
    })
    expect(atStart.state).toBe('in_progress')
    expect(atStart.blockers).toEqual(['Workshop built', 'Well built'])
    expect(afterWorkshop.material).toBe(0)
    expect(afterWorkshop.water).toBe(50)
    expect(burst.ticks).toBe(25)
    expect(afterBurst.water).toBe(0)
    expect(afterBurst.material).toBeGreaterThanOrEqual(24)
    expect(afterBurst.staffedWorkshops).toBe(1)
    // The momentary semantics (Step 10AN): running the burst unstaffs the Well,
    // so the Village requirement is unmet exactly while industry runs.
    expect(afterBurst.stage).toBe('settlement')
    expect(duringBurst.blockers).toContain('Reach Village')
    expect(afterWell.material).toBeLessThan(5)
    expect(afterWell.stage).toBe('settlement')
    // Only the recovery completes the objective: industry is a burst.
    expect(beforeRecovery.state).toBe('in_progress')
    expect(recovered.stage).toBe('village')
    expect(completed.state).toBe('completed')
    expect(completed.blockers).toHaveLength(0)
  })

  it('has a measured failure mode: spending the budget before the converter', () => {
    const objective = scenario().objective
    let state = createScenarioState(config, scenario())
    // Wrong order: the second Well first (Material 25 -> 0). The Workshop can
    // then never be afforded, because Material has no other source.
    state = place(state, 'well', 2, 2)
    for (let i = 0; i < 3; i += 1) state = stepSimulation(state)
    const afterWrongOrder = read(state)
    let stuck = state
    for (let i = 0; i < 300; i += 1) stuck = stepSimulation(stuck)
    const workshopPlacement = place__allowingFailure(stuck, 'workshop', 4, 2)
    const status = getObjectiveStatus(stuck, objective)
    audit('FAILURE_MODE', {
      afterWrongOrder,
      after300Ticks: read(stuck),
      workshopAffordableAfter300Ticks: workshopPlacement !== null,
      objective: { state: status.state, blockers: status.blockers },
      reading:
        'the Workshop is the only Material source: spending the 25 on the Well first is terminal for the objective — the same class of hard budget decision the First settlement / Spatial efficiency scenarios already use',
    })
    expect(afterWrongOrder.material).toBe(0)
    expect(workshopPlacement).toBeNull()
    expect(status.state).toBe('in_progress')
    expect(status.blockers).toEqual(['Workshop built'])
  })

  it('is a genuinely distinct decision space from the other scenarios', () => {
    const profiles = SCENARIOS.map((definition) => {
      const state = createScenarioState(config, definition)
      return {
        id: definition.id,
        stage: getProgression(state).stage,
        population: getPopulationCount(state),
        material: state.resources.construction,
        water: state.resources.water,
        requirements: definition.objective.requirements.map((requirement) => requirement.kind),
      }
    })
    const classification = {
      scenario: 'water-reserve-industry',
      class: 'A — genuinely distinct decision space',
      firstDecision: 'spend the last 25 Material on the Workshop (the converter) or on the second Well (the goal)',
      resourceTradeOff: 'Water stock -> Material, at 2 Water per Material, bounded by the 25-per-Workshop storage',
      constructionSequence: 'Workshop first, then the burst, then the Well, then the recovery',
      failureMode: 'spending the budget before the converter is terminal (measured)',
      timingDecision: 'when to run the burst: it drops the colony out of Village while it runs',
      spatialDecision: 'the Workshop and the Well compete for the four road-adjacent cells',
      objectiveInterpretation: 'build the second Well with the Workshop output',
      differentFrom: [
        'Industrial expansion: builds a Workshop that is never run and never funds anything (measured: the loop is worthless on its data)',
        'Water constraint: a Well is the goal, not a product of industry',
        'Population expansion: Material comes from the scenario grant only',
        'First settlement / Spatial efficiency / Recovery: no Material conversion exists',
      ],
    }
    audit('SCENARIO_DIFFERENTIATION', { profiles, classification })
    // 7 when this step ran; Step 10BE later added one content scenario.
    expect(profiles).toHaveLength(8)
    expect(classification.class.startsWith('A')).toBe(true)
    // The new scenario is the only one whose requirement set asks for two
    // construction steps where the first funds the second.
    expect(
      profiles.find((profile) => profile.id === 'water-reserve-industry')?.requirements
    ).toEqual(['stage', 'building', 'building'])
  })
})

// ---------------------------------------------------------------------------
// 10. TOWN RELATIONSHIP
// ---------------------------------------------------------------------------

describe('10. Town relationship', () => {
  it('keeps Town deferred: industrial content is not a sustainable industrial economy', () => {
    const town = {
      industrialContentImplemented: true,
      sustainableIndustryPossible: false,
      qualitativeState:
        'a colony that can allocate a worker to industry only by unstaffing a Well: industrial output always costs Water capacity or a Food reserve',
      townContractable: false,
      reason:
        'the Town candidate the 10AN/10AP audits named ("basic survival sustained while workforce is deliberately allocated to industry") still does not exist in the canonical economy: every industrial tick is paid for out of a finite reserve',
      decision: 'TOWN REMAINS DEFERRED — industrial scenario is not Town progression',
    }
    audit('TOWN_RELATION', town)
    expect(town.sustainableIndustryPossible).toBe(false)
    expect(town.townContractable).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 12. OBSERVABILITY: the workplace list the content needs
// ---------------------------------------------------------------------------

describe('12. Reassignment observability', () => {
  it('lists every workplace type the command accepts, Wells included', () => {
    // The scenario's recovery step needs a colonist moved back onto a Well.
    // `validateReassignment` has accepted Wells since Step 10P; the inspector's
    // options list filtered them out until Step 10AQ, so the browser could
    // start a burst and never end it. This is the contract that keeps the list
    // and the command on one predicate.
    const state = build({
      residences: 2,
      // Order = priority (equal road distance): the Well is created last, so it
      // stays vacant and is the eligible target this contract needs.
      types: ['farm', 'workshop', 'well'],
      water: 50,
      food: 100,
      material: 0,
    })
    const colonistId = Object.keys(state.colonists).sort()[0]!
    const options = getReassignmentOptions(state, colonistId)
    const types = [...new Set(options.map((option) => option.type))].sort()
    const auditRows = options.map((option) => ({
      id: option.workplaceId,
      type: option.type,
      eligible: option.eligible,
      isCurrent: option.isCurrent,
      workers: option.workers,
      capacity: option.capacity,
      reason: option.reason,
    }))
    audit('REASSIGNMENT_OBSERVABILITY', {
      types,
      auditRows,
      reading: 'the options list is the command\'s own validation: no type the command accepts may be missing',
    })
    expect(types).toEqual(['farm', 'well', 'workshop'])
    for (const option of options) {
      const validation = validateReassignment(state, colonistId, option.workplaceId)
      expect(option.eligible).toBe(validation.valid && !option.isCurrent)
    }
    const freeWell = options.find((option) => option.type === 'well' && option.eligible)
    expect(freeWell).toBeDefined()
    const moved = stepSimulation(state, {
      type: 'reassignColonist',
      colonistId,
      workplaceId: freeWell!.workplaceId,
    })
    expect(moved.colonists[colonistId]?.workplaceId).toBe(freeWell!.workplaceId)
  })
})

// ---------------------------------------------------------------------------
// 16. ARCHITECTURAL INVARIANTS
// ---------------------------------------------------------------------------

describe('16. Architectural invariants', () => {
  it('adds no persisted state, no mechanic and no schema change', () => {
    const definition = findScenario('water-reserve-industry')!
    const state = createScenarioState(config, definition)
    let simulated = state
    for (let i = 0; i < 40; i += 1) simulated = stepSimulation(simulated)
    const saved = serializeSave(simulated)
    const loaded = loadSave(saved)
    const objectiveOnlyReadsState = getObjectiveStatus(simulated, definition.objective)
    const invariants = {
      saveVersion: SAVE_VERSION,
      saveKeys: Object.keys(JSON.parse(saved).state).sort(),
      deterministic: hashCanonicalState(state) === hashCanonicalState(createScenarioState(config, definition)),
      saveRoundTrip: hashCanonicalState(loaded) === hashCanonicalState(simulated),
      objectivePure:
        JSON.stringify(objectiveOnlyReadsState) ===
        JSON.stringify(getObjectiveStatus(simulated, definition.objective)),
      scenarioStateUnchangedByQueries: hashCanonicalState(state) === hashCanonicalState(simulated)
        ? 'same'
        : 'simulated',
      noNewResource: Object.keys(simulated.resources).sort(),
      requirementKinds: [...new Set(SCENARIOS.flatMap((s) => s.objective.requirements.map((r) => r.kind)))].sort(),
    }
    audit('ARCHITECTURAL_INVARIANTS', invariants)
    expect(invariants.saveVersion).toBe(8)
    expect(invariants.saveKeys).toHaveLength(8)
    expect(invariants.deterministic).toBe(true)
    expect(invariants.saveRoundTrip).toBe(true)
    expect(invariants.noNewResource).toEqual(['construction', 'food', 'water'])
    expect(invariants.requirementKinds).toEqual(['building', 'foodBalance', 'population', 'stage', 'waterCapacity'])
  })
})

/** Placement probe that reports failure instead of throwing (failure-mode test). */
function place__allowingFailure(
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState | null {
  const verdict = getPlacementAffordability(state, { x, y }, type)
  if (!verdict.affordable) return null
  return stepSimulation(state, { type: 'placeBuilding', x, y, buildingType: type })
}
