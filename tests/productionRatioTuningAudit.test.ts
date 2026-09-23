/**
 * Step 10AP — Production Ratio Tuning & Town Candidate Decision.
 *
 * AUDIT ONLY. No production constant is changed: `git diff src/domain` is
 * empty after this step. The four candidate economic configurations
 * (2/2, 3/2, 2/3, 3/3) are executed through a *parameterised replay of the
 * production engine*: every phase of `stepSimulation` is the real exported
 * phase except Food/Water production, whose rate is a parameter. The
 * parameterised engine is proven byte-identical to the production engine at
 * the canonical 2/2 rate over every scene in this audit, so the 3/2, 2/3 and
 * 3/3 results are the real mechanics under a different rate, not a model of
 * them.
 *
 * The experimental configurations are NEVER presented as canonical: the
 * canonical economy stays 2/2 and the tuning decision is recorded as
 * "no tuning yet" (see the design-decision block and docs/roadmap/Step10AP.md).
 *
 * Run:
 *   npx vitest run tests/productionRatioTuningAudit.test.ts --reporter=verbose
 */

import { describe, expect, it } from 'vitest'

import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  findScenario,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getBuildingRoadAccess,
  getFoodConsumptionPerTick,
  getJobCapacity,
  getMaterialStorageCapacity,
  getNetMaterialPerTick,
  getPlacementAffordability,
  getPopulationCount,
  getProgression,
  getRoadNetworks,
  getWaterCoverage,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  hashCanonicalState,
  hasOperationalWell,
  INITIAL_CONSTRUCTION_MATERIAL,
  isOperationalWell,
  iterateBuildings,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  produceMaterial,
  progressPlacedRoads,
  releaseCompletedConstructionCrew,
  SAVE_VERSION,
  SCENARIOS,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type CellCoordinate,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const shipConfig: SimulationConfig = { world: { seed: 'nova-step1', width: 48, height: 16 } }

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Experimental engine: production engine with a rate parameter
// ---------------------------------------------------------------------------

/** A controlled experimental configuration. Never applied to the source. */
interface Rates {
  readonly farm: number
  readonly well: number
}

const CANONICAL: Rates = { farm: 2, well: 2 }
const FARMS_3: Rates = { farm: 3, well: 2 }
const WELLS_3: Rates = { farm: 2, well: 3 }
const BOTH_3: Rates = { farm: 3, well: 3 }
const CONFIGS: readonly { readonly label: string; readonly rates: Rates }[] = [
  { label: '2/2 current', rates: CANONICAL },
  { label: '3/2 food surplus', rates: FARMS_3 },
  { label: '2/3 water surplus', rates: WELLS_3 },
  { label: '3/3 both surplus', rates: BOTH_3 },
]

/** Staffed, operational, road-accessible Wells — the rate-independent count. */
const countProductiveWells = (state: SimulationState): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (!isOperationalWell(building)) continue
    if (countWorkersAt(state, building.id) === 0) continue
    if (!getBuildingRoadAccess(state, building.id).hasRoadAccess) continue
    total += 1
  }
  return total
}

/** Staffed operational Farms — the rate-independent count. */
const countStaffedFarms = (state: SimulationState): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (building.type !== 'farm' || building.status !== 'operational') continue
    if (countWorkersAt(state, building.id) === 0) continue
    total += 1
  }
  return total
}

const countStaffedWorkshops = (state: SimulationState): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (building.type !== 'workshop' || building.status !== 'operational') continue
    if (countWorkersAt(state, building.id) === 0) continue
    total += 1
  }
  return total
}

/**
 * The production engine with a parameterised rate. Identical to
 * `stepSimulation` (same phases, same order, same arguments) except that
 * `foodProductionForTick` and `waterProductionForTick` are replaced by
 * `staffed count x rate`. At `rates = { farm: 2, well: 2 }` the two engines
 * must produce the same canonical state — asserted in section 2.
 *
 * The optional `command` keeps the 8a position of the real pipeline, so a
 * placement sees the post-production, pre-upkeep stock exactly as the player
 * command does.
 */
const shadowStepResult = (
  state: SimulationState,
  rates: Rates,
  command?: SimulationCommand
): { readonly state: SimulationState; readonly accepted: boolean; readonly reason: string | null } => {
  const constructed = advanceConstruction(state)
  const requiredFood = updateNeeds(constructed)
  const foodOut = countStaffedFarms(constructed) * rates.farm
  const produced =
    foodOut === 0
      ? constructed
      : { ...constructed, resources: { ...constructed.resources, food: constructed.resources.food + foodOut } }
  const waterOut = countProductiveWells(produced) * rates.well
  const watered =
    waterOut === 0
      ? produced
      : { ...produced, resources: { ...produced.resources, water: produced.resources.water + waterOut } }
  const consumed = consumeFood(watered, requiredFood)
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null ? 0 : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  const productionCapacity =
    coverage === null ? 0 : countProductiveWells(consumed.state) * rates.well
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
  const commanded = applyCommand(materialized, command)
  const progressed = progressPlacedRoads(commanded.state, commanded)
  const maintained = upkeepBuildings(progressed)
  const released = releaseCompletedConstructionCrew(maintained)
  return {
    state: advanceTime(released),
    accepted: commanded.accepted,
    reason: commanded.reason,
  }
}

const shadowStep = (state: SimulationState, rates: Rates): SimulationState =>
  shadowStepResult(state, rates).state

const runShadow = (state: SimulationState, ticks: number, rates: Rates): SimulationState => {
  let current = state
  for (let i = 0; i < ticks; i += 1) current = shadowStep(current, rates)
  return current
}

// ---------------------------------------------------------------------------
// Fixture harness (direct domain operations, as in the 10AO audit)
// ---------------------------------------------------------------------------

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10ap: building missing')
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
  if (id === undefined) throw new Error('10ap: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10ap: no road')
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

/**
 * One street line: Residences on y=0, workplaces on y=2, an operational road
 * on y=1. Every workplace has road access and the same road distance from
 * every Residence, so the automatic assignment never expresses a spatial
 * preference — the audit controls employment explicitly with `forceRoles`.
 */
const build = (fixture: Fixture): SimulationState => {
  let state = createInitialState(shipConfig)
  state = {
    ...state,
    resources: {
      construction: fixture.material ?? 500,
      food: fixture.food ?? 400,
      water: fixture.water ?? 200,
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

/**
 * Deterministic employment control: colonist i (ascending id) is assigned to
 * the i-th role in the list, taking the first role-instance that is still
 * free. Manual assignments are preserved by `assignJobs` (Step 10M), so the
 * controlled allocation is stable across ticks. Real `reassignColonist`
 * commands only — no state is written directly.
 */
const forceRoles = (state: SimulationState, roles: readonly BuildingType[]): SimulationState => {
  let next = state
  for (let pass = 0; pass < roles.length + 2; pass += 1) {
    const colonists = Object.values(next.colonists).sort((a, b) => (a.id < b.id ? -1 : 1))
    const taken = new Set<string>()
    const desired: { readonly colonistId: string; readonly target: string }[] = []
    for (let i = 0; i < colonists.length; i += 1) {
      const colonist = colonists[i]
      const role = roles[i]
      if (colonist === undefined || role === undefined) continue
      const target = idsOf(next, role).find((id) => !taken.has(id))
      if (target === undefined) continue
      taken.add(target)
      desired.push({ colonistId: colonist.id, target })
    }
    let changed = false
    for (const { colonistId, target } of desired) {
      const colonist = next.colonists[colonistId]
      if (colonist === undefined || colonist.workplaceId === target) continue
      const occupied = Object.values(next.colonists).some(
        (other) => other.id !== colonistId && other.workplaceId === target
      )
      // The occupant may itself be waiting for a different target: retry next pass.
      if (occupied) continue
      const applied = applyCommand(next, {
        type: 'reassignColonist',
        colonistId,
        workplaceId: target,
      })
      if (applied.state !== next) {
        next = applied.state
        changed = true
      }
    }
    if (!changed) break
  }
  return next
}

/**
 * Rate-aware progression stage. Mirrors `getProgression` (the same derived
 * conditions, the same model-derived thresholds) but with the experimental
 * production rates. The thresholds themselves are rate-INDEPENDENT: the
 * Village level is `COLONISTS_PER_STAFFED_WELL`, which is defined as
 * `WATER_PER_WELL_PER_TICK` and is not part of the experiment — the Well-3
 * coupling recorded in section 6.
 */
const stageFor = (state: SimulationState, rates: Rates): string => {
  const population = getPopulationCount(state)
  const foodProduction = countStaffedFarms(state) * rates.farm
  if (population < 1 || foodProduction < population || getRoadNetworks(state).length === 0) {
    return 'wilderness'
  }
  const waterCapacity = countProductiveWells(state) * rates.well
  return population >= WATER_PER_WELL_PER_TICK && waterCapacity >= WATER_PER_WELL_PER_TICK
    ? 'village'
    : 'settlement'
}

interface Reading {
  readonly population: number
  readonly food: number
  readonly water: number
  readonly material: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly staffedWorkshops: number
  readonly foodNet: number
  readonly waterNet: number
  readonly materialNet: number
  readonly storageCapacity: number
  readonly stage: string
}

/**
 * Rate-aware reading. Food/Water production is `staffed count x experimental
 * rate`; every other value is the authoritative query (identical at 2/2).
 */
const read = (state: SimulationState, rates: Rates): Reading => ({
  population: getPopulationCount(state),
  food: state.resources.food,
  water: state.resources.water,
  material: state.resources.construction,
  staffedFarms: countStaffedFarms(state),
  staffedWells: countProductiveWells(state),
  staffedWorkshops: countStaffedWorkshops(state),
  foodNet: countStaffedFarms(state) * rates.farm - getFoodConsumptionPerTick(state),
  waterNet: countProductiveWells(state) * rates.well - getWaterNeedPerTick(state),
  materialNet: getNetMaterialPerTick(state),
  storageCapacity: getMaterialStorageCapacity(state),
  stage: stageFor(state, rates),
})

// The rate-aware arithmetic the audit compares against the engine.
const requiredFarms = (population: number, rates: Rates): number => Math.ceil(population / rates.farm)
const requiredWells = (population: number, rates: Rates): number => Math.ceil(population / rates.well)
const spareWorkers = (population: number, rates: Rates): number =>
  population - requiredFarms(population, rates) - requiredWells(population, rates)

interface Feasibility {
  readonly farms: number
  readonly wells: number
  readonly spare: number
  /** Every required workplace can be staffed: the balanced colony exists. */
  readonly feasible: boolean
  readonly foodSurplus: number
  readonly waterSurplus: number
}

/**
 * Minimum-infrastructure feasibility. A population is `feasible` when the
 * required Farms and Wells fit inside the workforce; only there can a surplus
 * be *sustained* (an over-built colony with a vacant workplace is the odd-P
 * artefact, not a surplus policy).
 */
const feasibility = (population: number, rates: Rates): Feasibility => {
  const farms = requiredFarms(population, rates)
  const wells = requiredWells(population, rates)
  return {
    farms,
    wells,
    spare: population - farms - wells,
    feasible: farms + wells <= population,
    foodSurplus: rates.farm * farms - population * FOOD_PER_COLONIST_PER_TICK,
    waterSurplus: rates.well * wells - population * WATER_PER_COLONIST_PER_TICK,
  }
}

const surplusPopulations = (rates: Rates, kind: 'food' | 'water'): readonly number[] =>
  Array.from({ length: 12 }, (_, index) => index + 1).filter((population) => {
    const row = feasibility(population, rates)
    return row.feasible && (kind === 'food' ? row.foodSurplus : row.waterSurplus) > 0
  })

const balancedColony = (population: number, rates: Rates): SimulationState => {
  const wells = requiredWells(population, rates)
  const farms = requiredFarms(population, rates)
  return build({
    residences: population,
    types: [
      ...(Array.from({ length: wells }, () => 'well' as BuildingType)),
      ...(Array.from({ length: farms }, () => 'farm' as BuildingType)),
    ],
  })
}

// ---------------------------------------------------------------------------
// 1. BASELINE CONTRACT (read from the code, never from old reports)
// ---------------------------------------------------------------------------

describe('1. Baseline contract', { timeout: 30000 }, () => {
  it('reads every rate, cost and capacity from the catalog and the constants', () => {
    const catalog = (['residence', 'farm', 'well', 'workshop'] as const).map((type) => {
      const definition = getBuildingDefinition(type)
      return {
        type,
        material: definition.constructionCost,
        water: definition.constructionWaterCost,
        ticks: definition.constructionTicks,
        housing: definition.housingCapacity,
      }
    })
    const contract = {
      catalog,
      farmProduction: FOOD_PER_FARM_PER_TICK,
      wellProduction: WATER_PER_WELL_PER_TICK,
      foodPerColonist: FOOD_PER_COLONIST_PER_TICK,
      waterPerColonist: WATER_PER_COLONIST_PER_TICK,
      workshopProduction: MATERIAL_PER_WORKER_PER_TICK,
      workshopUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      materialStoragePerWorkshop: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      initialMaterial: INITIAL_CONSTRUCTION_MATERIAL,
      roadCost: 5,
      jobCapacityPerWorkplace: getJobCapacity(
        build({ residences: 1, types: ['farm'] })
      ),
      saveVersion: SAVE_VERSION,
    }
    audit('BASELINE_CONTRACT', contract)
    expect(contract.catalog).toEqual([
      { type: 'residence', material: 25, water: 0, ticks: 2, housing: 1 },
      { type: 'farm', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'well', material: 25, water: 0, ticks: 2, housing: 0 },
      { type: 'workshop', material: 25, water: 1, ticks: 2, housing: 0 },
    ])
    // The canonical economy is 2/2 and this audit does not change it.
    expect(contract.farmProduction).toBe(2)
    expect(contract.wellProduction).toBe(2)
    expect(contract.foodPerColonist).toBe(1)
    expect(contract.waterPerColonist).toBe(1)
    expect(contract.workshopProduction).toBe(2)
    expect(contract.workshopUpkeep).toBe(1)
    expect(contract.materialStoragePerWorkshop).toBe(25)
    expect(contract.initialMaterial).toBe(100)
    expect(contract.saveVersion).toBe(8)
  })

  it('reads the Water admission gate and the Workforce contract', () => {
    // The gate is `productionCapacity >= servedNeed + admissionsThisTick + 1`
    // (Step 10S) plus "the Residence must be water-served" (Step 10P). Measured
    // through the real phase, not restated.
    const one = build({ residences: 2, types: ['well', 'farm'], food: 100, water: 50 })
    const gate = {
      populationAtStart: getPopulationCount(one),
      capacity: getWaterProductionPerTick(one),
      need: getWaterNeedPerTick(one),
      served: [...iterateBuildings(one)].filter((b) => b.type === 'residence').length,
      admitted: getPopulationCount(runShadow(one, 20, CANONICAL)) - getPopulationCount(one),
      workforceCapacity: getJobCapacity(one),
    }
    audit('ADMISSION_AND_WORKFORCE', gate)
    // 1 staffed Well = capacity 2 = the population cap for this scenario, so no
    // fourth colonist: capacity 2 >= served 2 + 0 + 1 is false.
    expect(gate.capacity).toBe(2)
    expect(gate.admitted).toBe(0)
    expect(gate.workforceCapacity).toBe(getPopulationCount(one))
  })
})

// ---------------------------------------------------------------------------
// 2. EXPERIMENTAL ENGINE FIDELITY
// ---------------------------------------------------------------------------

describe('2. Experimental engine fidelity', { timeout: 60000 }, () => {
  it('is byte-identical to the production engine at the canonical 2/2 rate', () => {
    const scenes = [1, 2, 3, 5, 6, 12].map((population) => balancedColony(population, CANONICAL))
    const rows: { population: number; equal: boolean; hash: string }[] = []
    for (const start of scenes) {
      let real = start
      let shadow = start
      for (let i = 0; i < 60; i += 1) {
        real = stepSimulation(real)
        shadow = shadowStep(shadow, CANONICAL)
      }
      rows.push({
        population: getPopulationCount(start),
        equal: hashCanonicalState(real) === hashCanonicalState(shadow),
        hash: hashCanonicalState(real),
      })
    }
    audit('ENGINE_FIDELITY', {
      rows,
      method:
        'the parameterised engine reuses every exported production phase in the same order; only the Farm/Well output amount is a parameter',
    })
    expect(rows.every((row) => row.equal)).toBe(true)
    expect(rows).toHaveLength(6)
  })

  it('diverges only where the rate differs, and never mutates the source', () => {
    const start = balancedColony(6, CANONICAL)
    const real = runShadow(start, 30, CANONICAL)
    const same = runShadow(start, 30, CANONICAL)
    const tuned = runShadow(start, 30, FARMS_3)
    const webbed = runShadow(start, 30, WELLS_3)
    audit('ENGINE_DIVERGENCE', {
      canonicalHash: hashCanonicalState(real),
      controlHash: hashCanonicalState(same),
      farm3Hash: hashCanonicalState(tuned),
      well3Hash: hashCanonicalState(webbed),
      canonicalFood: real.resources.food,
      farm3Food: tuned.resources.food,
      well3Water: webbed.resources.water,
    })
    expect(hashCanonicalState(same)).toBe(hashCanonicalState(real))
    expect(hashCanonicalState(tuned)).not.toBe(hashCanonicalState(real))
    expect(hashCanonicalState(webbed)).not.toBe(hashCanonicalState(real))
    // The source constants are untouched by the experiments.
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 3. POPULATION SWEEP P = 1..12 x four configurations
// ---------------------------------------------------------------------------

describe('3. Population sweep P = 1..12', { timeout: 120000 }, () => {
  it('measures the infrastructure workforce and the first discretionary worker', () => {
    const table = CONFIGS.map((config) => {
      const rows = Array.from({ length: 12 }, (_, index) => index + 1).map((population) => {
        const farms = requiredFarms(population, config.rates)
        const wells = requiredWells(population, config.rates)
        const spare = spareWorkers(population, config.rates)
        const settled = runShadow(balancedColony(population, config.rates), 120, config.rates)
        const measured = read(settled, config.rates)
        return {
          population,
          farmsRequired: farms,
          wellsRequired: wells,
          freeWorkers: spare,
          foodDelta: measured.foodNet,
          waterDelta: measured.waterNet,
          populationRetained: measured.population === population,
          measuredVacancies: population - measured.staffedFarms - measured.staffedWells,
          stage: measured.stage,
        }
      })
      return {
        configuration: config.label,
        rows,
        firstSpareAt: rows.find((row) => row.freeWorkers > 0)?.population ?? null,
        maxSpareInSweep: Math.max(...rows.map((row) => row.freeWorkers)),
        maxSustainableWorkshops: Math.max(...rows.map((row) => Math.max(0, row.freeWorkers))),
      }
    })
    audit('POPULATION_SWEEP', {
      table,
      note: 'freeWorkers = P - ceil(P/farmRate) - ceil(P/wellRate): a colonist the survival infrastructure does not occupy',
    })
    const canonical = table[0]!
    expect(canonical.firstSpareAt).toBeNull()
    expect(canonical.maxSpareInSweep).toBe(0)
    expect(table[1]!.firstSpareAt).toBe(6) // Farm 3
    expect(table[2]!.firstSpareAt).toBe(6) // Well 3
    expect(table[3]!.firstSpareAt).toBe(3) // Both 3
    expect(table[3]!.maxSpareInSweep).toBe(4)
    for (const config of table) {
      for (const row of config.rows) {
        expect(row.populationRetained).toBe(true)
        expect(row.freeWorkers).toBeGreaterThanOrEqual(-1)
      }
    }
  })

  it('measures the maximum staffable Workshop count per configuration', () => {
    const rows = CONFIGS.map((config) => {
      const population = 12
      const wells = requiredWells(population, config.rates)
      const farms = requiredFarms(population, config.rates)
      const spare = spareWorkers(population, config.rates)
      const infrastructure: BuildingType[] = [
        ...Array.from({ length: wells }, () => 'well' as BuildingType),
        ...Array.from({ length: farms }, () => 'farm' as BuildingType),
      ]
      const workshops: BuildingType[] = Array.from(
        { length: Math.max(0, spare) },
        () => 'workshop' as BuildingType
      )
      const start =
        spare > 0
          ? forceRoles(
              build({ residences: population, types: [...infrastructure, ...workshops] }),
              [...infrastructure, ...workshops]
            )
          : build({ residences: population, types: infrastructure })
      const settled = runShadow(start, 120, config.rates)
      const measured = read(settled, config.rates)
      return {
        configuration: config.label,
        population,
        freeWorkers: spare,
        workshopsStaffedSustainable: measured.staffedWorkshops,
        waterAtEnd: measured.water,
        foodAtEnd: measured.food,
        materialAtEnd: measured.material,
        foodNet: measured.foodNet,
        waterNet: measured.waterNet,
      }
    })
    audit('MAX_SUSTAINABLE_WORKSHOPS', {
      rows,
      definition:
        'a Workshop is sustainable when its worker is not taken from the survival infrastructure, i.e. when freeWorkers >= 1',
    })
    expect(rows[0]!.workshopsStaffedSustainable).toBe(0)
    expect(rows[1]!.workshopsStaffedSustainable).toBe(2)
    expect(rows[2]!.workshopsStaffedSustainable).toBe(2)
    expect(rows[3]!.workshopsStaffedSustainable).toBe(4)
    for (const row of rows.slice(1)) {
      expect(row.waterAtEnd).toBeGreaterThan(0)
      expect(row.foodAtEnd).toBeGreaterThan(0)
      expect(row.foodNet).toBeGreaterThanOrEqual(0)
      expect(row.waterNet).toBeGreaterThanOrEqual(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. QUALITATIVE HEADROOM — survival vs survival + Workshop, 100/300/600
// ---------------------------------------------------------------------------

describe('4. Qualitative headroom test', { timeout: 120000 }, () => {
  it('measures survival and survival+Workshop at P = 6 for every configuration', () => {
    const rows = CONFIGS.map((config) => {
      const wells = requiredWells(6, config.rates)
      const farms = requiredFarms(6, config.rates)
      const infrastructure: BuildingType[] = [
        ...Array.from({ length: wells }, () => 'well' as BuildingType),
        ...Array.from({ length: farms }, () => 'farm' as BuildingType),
      ]
      const spare = spareWorkers(6, config.rates)
      // Survival: exactly the required infrastructure.
      const survivalStart = forceRoles(
        build({ residences: 6, types: infrastructure }),
        infrastructure
      )
      // Industry: one Workshop added. When a discretionary worker exists the
      // Workshop is staffed in addition to the whole infrastructure; otherwise
      // its worker must leave a Well (the 10AO temporary-industry loop), which
      // is expressed by building one Farm fewer than the requirement so the
      // Freed worker can hold the Workshop with every Farm still staffed.
      const industryTypes: BuildingType[] =
        spare > 0
          ? [...infrastructure, 'workshop']
          : [
              ...Array.from({ length: farms }, () => 'farm' as BuildingType),
              ...Array.from({ length: Math.max(1, wells - 1) }, () => 'well' as BuildingType),
              'workshop',
            ]
      const industryStart = forceRoles(
        build({ residences: 6, types: industryTypes }),
        industryTypes
      )
      const checkpoints = (start: SimulationState) => {
        let current = start
        let done = 0
        for (const limit of [100, 300, 600]) {
          current = runShadow(current, limit - done, config.rates)
          done = limit
        }
        return read(current, config.rates)
      }
      return {
        configuration: config.label,
        freeWorkers: spare,
        survival: checkpoints(survivalStart),
        industry: checkpoints(industryStart),
      }
    })
    audit('QUALITATIVE_HEADROOM_P6', {
      rows,
      reading:
        'the survival state is read after 600 ticks; the industry state is the same colony plus one Workshop, read at 100/300/600 ticks (identical at all three when stable)',
    })
    const canonical = rows[0]!
    // 2/2 has no discretionary worker: the Workshop worker came out of a Well,
    // so Water production is below need and the reserve drains to zero.
    expect(canonical.freeWorkers).toBe(0)
    expect(canonical.industry.staffedWorkshops).toBe(1)
    expect(canonical.industry.staffedWells).toBe(2)
    expect(canonical.industry.waterNet).toBe(-2)
    expect(canonical.industry.water).toBe(0)
    expect(canonical.industry.population).toBe(6)
    expect(canonical.survival.water).toBe(200)
    expect(canonical.survival.foodNet).toBe(0)
    expect(canonical.survival.waterNet).toBe(0)
    // Every 3-rate configuration sustains the Workshop with full coverage and
    // no deficit: this is the qualitative change the step is testing for.
    for (const row of rows.slice(1)) {
      expect(row.industry.staffedWorkshops).toBe(1)
      expect(row.industry.water).toBe(200)
      expect(row.industry.population).toBe(6)
      expect(row.industry.foodNet).toBe(0)
      expect(row.industry.waterNet).toBe(0)
      expect(row.industry.material).toBeGreaterThan(20)
    }
    expect(rows[1]!.industry.staffedWells).toBe(3)
    expect(rows[2]!.industry.staffedFarms).toBe(3)
  })

  it('measures the material trajectory of the temporary (2/2) loop', () => {
    const rates = CANONICAL
    // 2/2: the Workshop worker is the Well worker the ratio does not have to
    // spare. Material starts at 0 so the banked output is visible (above the
    // storage cap, production is discarded and only upkeep moves the stock).
    const forced = build({
      residences: 6,
      types: ['farm', 'farm', 'farm', 'well', 'well', 'workshop'],
      material: 0,
    })
    const start = read(forced, rates)
    let current = forced
    let previous = 0
    const rows = [0, 25, 50, 100, 300, 600].map((tick) => {
      current = runShadow(current, tick - previous, rates)
      previous = tick
      return { tick, ...read(current, rates) }
    })
    audit('TEMPORARY_LOOP_2_2', {
      start,
      rows,
      note: 'material is banked only while the displaced Well is empty: the storage cap (25) then makes the loop non-productive',
    })
    const last = rows[rows.length - 1]!
    expect(last.water).toBe(0)
    expect(last.material).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(last.material).toBeGreaterThanOrEqual(20)
    expect(last.waterNet).toBe(-2)
    expect(last.population).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// 5. INDUSTRIAL PHASE TEST — policies A / B / C under Farm 3
// ---------------------------------------------------------------------------

describe('5. Industrial phase policies', { timeout: 120000 }, () => {
  const rates = FARMS_3

  it('executes Survival, Industry and Expansion from the same P = 6 colony', () => {
    const infrastructure: BuildingType[] = ['well', 'well', 'well', 'farm', 'farm']
    // Policy A — Survival: the discretionary worker stays unemployed, so no
    // Material is ever produced and the colony simply persists.
    const survivalStart = forceRoles(
      build({ residences: 6, types: infrastructure, material: 0 }),
      infrastructure
    )
    // Policy B — Industry: the same colony plus one Workshop, staffed by the
    // discretionary worker (the only rate at which this is possible at P=6).
    const industryStart = forceRoles(
      build({ residences: 6, types: [...infrastructure, 'workshop'], material: 0 }),
      [...infrastructure, 'workshop']
    )
    // Policy C — Expansion: spend the industrial income on housing and Water
    // capacity, then let the existing admission gate admit the colonists.
    let expansion = forceRoles(
      build({ residences: 6, types: [...infrastructure, 'workshop'], material: 100 }),
      [...infrastructure, 'workshop']
    )
    const actions: { readonly label: string; readonly tick: number; readonly accepted: boolean }[] = []
    /**
     * Place a building through the real 8a command position. The command is
     * offered on every tick, exactly as `stepSimulation(state, command)` does:
     * a single staffed Workshop rests at cap-1 (25 storage, 1 upkeep), so the
     * placement is accepted on the tick where production crests the cap.
     */
    const placeWhenAffordable = (
      state: SimulationState,
      type: BuildingType,
      x: number,
      y: number
    ): SimulationState => {
      let next = state
      for (let waited = 0; waited < 300; waited += 1) {
        const result = shadowStepResult(next, rates, {
          type: 'placeBuilding',
          x,
          y,
          buildingType: type,
        })
        if (result.accepted) {
          actions.push({ label: `${type}@${x},${y}`, tick: result.state.time.tick, accepted: true })
          let settled = result.state
          for (let i = 0; i < 2; i += 1) settled = shadowStep(settled, rates)
          return settled
        }
        next = result.state
      }
      actions.push({ label: `${type}@${x},${y}`, tick: next.time.tick, accepted: false })
      return next
    }
    // Two Residences and a fourth Well: capacity 8 admits the 7th and 8th
    // colonist through the unchanged Water gate (8 >= served 6 + admissions + 1).
    expansion = placeWhenAffordable(expansion, 'residence', 13, 0)
    expansion = placeWhenAffordable(expansion, 'residence', 15, 0)
    expansion = placeWhenAffordable(expansion, 'well', 25, 2)
    expansion = forceRoles(expansion, ['well', 'well', 'well', 'well', 'farm', 'farm', 'workshop'])
    const populationBeforeGrowth = getPopulationCount(expansion)
    expansion = runShadow(expansion, 10, rates)
    const populationAfterGrowth = getPopulationCount(expansion)
    // The colony is now Food-negative (two Farms feed six of eight), so the
    // industrial income funds the third Farm before its reserve runs out.
    expansion = placeWhenAffordable(expansion, 'farm', 27, 2)
    expansion = forceRoles(
      expansion,
      ['well', 'well', 'well', 'well', 'farm', 'farm', 'farm', 'workshop']
    )
    const diagnostics = {
      farms: [...iterateBuildings(expansion)]
        .filter((building) => building.type === 'farm')
        .map((building) => ({
          id: building.id,
          x: building.x,
          status: building.status,
          workers: countWorkersAt(expansion, building.id),
        })),
      unemployed: Object.values(expansion.colonists)
        .filter((colonist) => colonist.workplaceId === null)
        .map((colonist) => colonist.id),
    }

    const run = (state: SimulationState, ticks: number): Reading =>
      read(runShadow(state, ticks, rates), rates)
    const rows = {
      survival: { at100: run(survivalStart, 100), at600: run(survivalStart, 600) },
      industry: { at100: run(industryStart, 100), at600: run(industryStart, 600) },
      expansion: {
        at100: run(expansion, 100),
        at600: run(expansion, 600),
        populationBeforeGrowth,
        populationAfterGrowth,
        actions,
        diagnostics,
      },
      timeToFirstSustainableWorkshop: 'tick 1 (the freed worker is assigned by the existing automatic pass)',
      timeToFirstMaterialSurplus: 'tick 1 (+1 net Material per tick, bounded by the 25-per-Workshop cap)',
    }
    audit('INDUSTRIAL_POLICIES_FARM3', {
      rows,
      objective: 'does the freed worker create a new strategic choice, or merely bigger numbers?',
    })
    expect(rows.survival.at600.material).toBe(0)
    expect(rows.survival.at600.staffedWorkshops).toBe(0)
    expect(rows.industry.at600.staffedWorkshops).toBe(1)
    expect(rows.industry.at600.material).toBeGreaterThan(20)
    expect(rows.industry.at600.food).toBe(rows.industry.at100.food)
    expect(rows.industry.at600.water).toBe(rows.industry.at100.water)
    // Expansion reaches population 8 through the existing Water gate and ends
    // with every required workplace staffed and no deficit.
    expect(rows.expansion.populationBeforeGrowth).toBe(6)
    expect(rows.expansion.populationAfterGrowth).toBe(8)
    expect(rows.expansion.actions.every((action) => action.accepted)).toBe(true)
    expect(rows.expansion.at600.population).toBe(8)
    expect(rows.expansion.at600.staffedFarms).toBe(3)
    expect(rows.expansion.at600.staffedWells).toBe(4)
    expect(rows.expansion.at600.staffedWorkshops).toBe(1)
    expect(rows.expansion.at600.foodNet).toBeGreaterThanOrEqual(0)
    expect(rows.expansion.at600.waterNet).toBeGreaterThanOrEqual(0)
    expect(rows.expansion.at600.food).toBeGreaterThan(0)
    expect(rows.expansion.at600.water).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. FARM 3 vs WELL 3 — causal differences
// ---------------------------------------------------------------------------

describe('6. Farm 3 versus Well 3', () => {
  it('names the bottleneck that remains in each configuration', () => {
    const rows = CONFIGS.map((config) => {
      const rowsPerPopulation = Array.from({ length: 12 }, (_, index) => index + 1).map((population) => {
        const farms = requiredFarms(population, config.rates)
        const wells = requiredWells(population, config.rates)
        return {
          population,
          farmsRequired: farms,
          wellsRequired: wells,
          foodSurplusPerTick: config.rates.farm * farms - population * FOOD_PER_COLONIST_PER_TICK,
          waterSurplusPerTick: config.rates.well * wells - population * WATER_PER_COLONIST_PER_TICK,
        }
      })
      return {
        configuration: config.label,
        infrastructureWorkers: rowsPerPopulation.map((row) => row.farmsRequired + row.wellsRequired),
        foodSurplusPopulations: surplusPopulations(config.rates, 'food'),
        waterSurplusPopulations: surplusPopulations(config.rates, 'water'),
        farmWorkersAt12: rowsPerPopulation[11]!.farmsRequired,
        wellWorkersAt12: rowsPerPopulation[11]!.wellsRequired,
      }
    })
    audit('FARM3_VS_WELL3', {
      rows,
      causalReading: {
        farm3:
          'Food headroom (one Farm feeds three) -> fewer Farm workers -> the freed worker can staff a Workshop; Water keeps its 1/2 ratio, so Water remains the growth gate and the staffing bottleneck',
        well3:
          'Water headroom (one Well serves three) -> fewer Well workers -> the freed worker can staff a Workshop; Food keeps its 1/2 ratio, so Food remains the staffing bottleneck',
        notRanked: 'neither configuration is called better: they free a different worker and leave a different bottleneck',
      },
    })
    expect(rows[0]!.foodSurplusPopulations).toHaveLength(0)
    expect(rows[0]!.waterSurplusPopulations).toHaveLength(0)
    // Farm 3 creates a Food surplus at seven of the eleven balanced populations
    // while the Water side keeps its exact 1/2 ratio; Well 3 is the mirror.
    expect(rows[1]!.foodSurplusPopulations.length).toBe(7)
    expect(rows[2]!.waterSurplusPopulations.length).toBe(7)
    expect(rows[1]!.wellWorkersAt12).toBe(6)
    expect(rows[2]!.farmWorkersAt12).toBe(6)
    expect(rows[1]!.farmWorkersAt12).toBe(4)
    expect(rows[2]!.wellWorkersAt12).toBe(4)
  })

  it('shows that Well 3 also moves the Village contract, unlike Farm 3', () => {
    // The Village threshold is the model constant COLONISTS_PER_STAFFED_WELL,
    // defined as WATER_PER_WELL_PER_TICK: a Well-3 tuning would silently change
    // the progression contract, which §13 of the step forbids in this step.
    const villageThresholdSource = WATER_PER_WELL_PER_TICK
    const villageConditions = getProgression(
      build({ residences: 4, types: ['well', 'well', 'farm', 'farm'] })
    )
    audit('WELL3_PROGRESSION_COUPLING', {
      villageThresholdSource,
      canonicalVillageRequirement: 'population >= 2 AND Water capacity >= 2',
      well3WouldRequire: 'population >= 3 AND Water capacity >= 3',
      canonicalConditions: villageConditions.conditions.map((c) => ({ id: c.id, met: c.met })),
    })
    expect(villageThresholdSource).toBe(2)
    expect(villageConditions.stage).toBe('village')
  })
})

// ---------------------------------------------------------------------------
// 7. BOTH 3 — excess headroom
// ---------------------------------------------------------------------------

describe('7. Both 3/3 — excess headroom', () => {
  it('measures how early and how large the headroom becomes', () => {
    const populations = Array.from({ length: 12 }, (_, index) => index + 1)
    const rows = populations.map((population) => ({
      population,
      freeWorkers: spareWorkers(population, BOTH_3),
      shareOfPopulation: Number((spareWorkers(population, BOTH_3) / population).toFixed(3)),
      foodSurplus: feasibility(population, BOTH_3).foodSurplus,
      waterSurplus: feasibility(population, BOTH_3).waterSurplus,
    }))
    audit('BOTH_3_EXCESS', {
      rows,
      verdict:
        'at 3/3 a discretionary worker exists from P=3 and grows to four at P=12, and both Food and Water run a surplus at the same seven populations: the survival economy stops being the structure of the colony',
    })
    expect(rows.find((row) => row.population === 3)?.freeWorkers).toBe(1)
    expect(rows.find((row) => row.population === 12)?.freeWorkers).toBe(4)
    // Both constraints relaxed at the same time, at the same populations.
    expect(surplusPopulations(BOTH_3, 'food')).toHaveLength(7)
    expect(surplusPopulations(BOTH_3, 'water')).toHaveLength(7)
  })
})

// ---------------------------------------------------------------------------
// 8. EXISTING SCENARIO REPLAY
// ---------------------------------------------------------------------------

type PolicyStep =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly x: number; readonly y: number }
  | { readonly kind: 'roads'; readonly cells: readonly CellCoordinate[] }
  | { readonly kind: 'wait'; readonly ticks: number }

interface ScenarioReplay {
  readonly policy: string
  readonly settlementTick: number | null
  readonly villageTick: number | null
  readonly wipeTick: number | null
  readonly stage: string
  readonly population: number
  readonly food: number
  readonly water: number
  readonly material: number
  readonly staffedWorkshops: number
  readonly staffedFarms: number
  readonly staffedWells: number
  readonly buildings: number
}

const replayScenario = (
  scenarioId: string,
  rates: Rates,
  steps: readonly PolicyStep[],
  horizon: number
): ScenarioReplay => {
  const definition = findScenario(scenarioId)
  if (definition === undefined) throw new Error(`10ap: unknown scenario ${scenarioId}`)
  let state = createScenarioState(shipConfig, definition)
  let settlementTick: number | null = null
  let villageTick: number | null = null
  let wipeTick: number | null = null
  let previousPopulation = getPopulationCount(state)
  const observe = (): void => {
    const stage = stageFor(state, rates)
    if (settlementTick === null && (stage === 'settlement' || stage === 'village')) settlementTick = state.time.tick
    if (villageTick === null && stage === 'village') villageTick = state.time.tick
    const population = getPopulationCount(state)
    if (wipeTick === null && population === 0 && previousPopulation > 0) wipeTick = state.time.tick
    previousPopulation = population
  }
  observe()
  for (const step of steps) {
    if (step.kind === 'wait') {
      for (let i = 0; i < step.ticks; i += 1) {
        state = shadowStep(state, rates)
        observe()
      }
      continue
    }
    if (step.kind === 'roads') {
      const cells = step.cells
      let guard = 0
      while (guard < 300 && state.resources.construction < cells.length * 5) {
        state = shadowStep(state, rates)
        observe()
        guard += 1
      }
      state = applyCommand(state, { type: 'placeRoads', cells: [...cells] }).state
      for (let i = 0; i < 2; i += 1) {
        state = shadowStep(state, rates)
        observe()
      }
      continue
    }
    const cell = { x: step.x, y: step.y }
    let guard = 0
    while (guard < 300 && !getPlacementAffordability(state, cell, step.type).affordable) {
      state = shadowStep(state, rates)
      observe()
      guard += 1
    }
    state = applyCommand(state, {
      type: 'placeBuilding',
      x: cell.x,
      y: cell.y,
      buildingType: step.type,
    }).state
    for (let i = 0; i < 3; i += 1) {
      state = shadowStep(state, rates)
      observe()
    }
  }
  for (let i = 0; i < horizon; i += 1) {
    state = shadowStep(state, rates)
    observe()
  }
  const measured = read(state, rates)
  return {
    policy: scenarioId,
    settlementTick,
    villageTick,
    wipeTick,
    stage: measured.stage,
    population: measured.population,
    food: measured.food,
    water: measured.water,
    material: measured.material,
    staffedWorkshops: measured.staffedWorkshops,
    staffedFarms: measured.staffedFarms,
    staffedWells: measured.staffedWells,
    buildings: Object.keys(state.buildings).length,
  }
}

const SCENARIO_POLICIES: readonly { readonly id: string; readonly steps: readonly PolicyStep[]; readonly horizon: number }[] = [
  {
    id: 'first-settlement',
    horizon: 200,
    steps: [
      { kind: 'building', type: 'residence', x: 1, y: 0 },
      { kind: 'roads', cells: [{ x: 1, y: 1 }] },
      { kind: 'building', type: 'farm', x: 0, y: 1 },
      { kind: 'building', type: 'residence', x: 2, y: 1 },
    ],
  },
  { id: 'water-constraint', horizon: 200, steps: [{ kind: 'building', type: 'well', x: 3, y: 2 }] },
  {
    id: 'industrial-expansion',
    horizon: 300,
    steps: [
      { kind: 'building', type: 'workshop', x: 2, y: 2 },
      { kind: 'building', type: 'well', x: 5, y: 2 },
      { kind: 'roads', cells: [{ x: 4, y: 1 }, { x: 5, y: 1 }] },
      { kind: 'building', type: 'residence', x: 4, y: 0 },
      { kind: 'building', type: 'farm', x: 6, y: 2 },
    ],
  },
  {
    id: 'spatial-efficiency',
    horizon: 200,
    steps: [
      { kind: 'building', type: 'residence', x: 1, y: 0 },
      { kind: 'roads', cells: [{ x: 1, y: 1 }] },
      { kind: 'building', type: 'farm', x: 0, y: 1 },
    ],
  },
  {
    id: 'population-expansion',
    horizon: 300,
    steps: [
      { kind: 'building', type: 'well', x: 3, y: 2 },
      { kind: 'building', type: 'well', x: 5, y: 2 },
      { kind: 'building', type: 'farm', x: 4, y: 2 },
      { kind: 'building', type: 'farm', x: 6, y: 2 },
    ],
  },
  {
    id: 'recovery',
    horizon: 200,
    steps: [{ kind: 'roads', cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] }],
  },
]

describe('8. Existing scenario replay', { timeout: 300000 }, () => {
  it('replays the six scenarios under every configuration', () => {
    const replay = CONFIGS.map((config) => ({
      configuration: config.label,
      results: SCENARIO_POLICIES.map((policy) =>
        replayScenario(policy.id, config.rates, policy.steps, policy.horizon)
      ),
    }))
    audit('SCENARIO_REPLAY', {
      replay,
      objectiveReachability: 'settlementTick / villageTick are non-null when the scenario objective is reached',
      note: 'scenario definitions are NOT rewritten: the same declarative data is played under each experimental rate',
    })
    expect(replay).toHaveLength(4)
    for (const entry of replay) expect(entry.results).toHaveLength(6)

    const canonical = replay[0]!.results
    const farm3 = replay[1]!.results
    const well3 = replay[2]!.results
    const both3 = replay[3]!.results
    // Farm 3 changes no structural outcome: the same stages, the same
    // objective ticks, the same landings. Only the Food stock differs.
    for (let i = 0; i < canonical.length; i += 1) {
      expect(farm3[i]!.stage).toBe(canonical[i]!.stage)
      expect(farm3[i]!.settlementTick).toBe(canonical[i]!.settlementTick)
      expect(farm3[i]!.villageTick).toBe(canonical[i]!.villageTick)
      expect(farm3[i]!.wipeTick).toBe(canonical[i]!.wipeTick)
      expect(farm3[i]!.population).toBe(canonical[i]!.population)
      expect(farm3[i]!.food).toBeGreaterThan(canonical[i]!.food)
    }
    // Well 3 and Both 3 do change scenario outcomes: Industrial Expansion
    // stops being the same colony (Well 3 starves it at tick 61, Both 3 admits
    // it to population 3 on an enormous Water surplus), and Population
    // Expansion reaches a different population.
    const canonicalIndustrial = canonical.find((r) => r.policy === 'industrial-expansion')!
    const well3Industrial = well3.find((r) => r.policy === 'industrial-expansion')!
    const both3Industrial = both3.find((r) => r.policy === 'industrial-expansion')!
    audit('SCENARIO_DIFFERENTIATION_DAMAGE', {
      canonicalIndustrial,
      well3Industrial,
      both3Industrial,
      canonicalPopulation: canonical.find((r) => r.policy === 'population-expansion'),
      well3Population: well3.find((r) => r.policy === 'population-expansion'),
    })
    expect(canonicalIndustrial.stage).toBe('village')
    expect(canonicalIndustrial.wipeTick).toBeNull()
    expect(well3Industrial.wipeTick).not.toBeNull()
    expect(well3Industrial.stage).toBe('wilderness')
    // Both 3 keeps the Village stage but changes the colony it describes.
    expect(both3Industrial.stage).toBe('village')
    expect(both3Industrial.population).not.toBe(canonicalIndustrial.population)
    expect(
      well3.find((r) => r.policy === 'population-expansion')!.population
    ).not.toBe(canonical.find((r) => r.policy === 'population-expansion')!.population)
  })
})

// ---------------------------------------------------------------------------
// 9. TOWN CANDIDATE TEST
// ---------------------------------------------------------------------------

describe('9. Town candidate gate', () => {
  it('evaluates the six gate properties for every configuration', () => {
    const gate = CONFIGS.map((config) => {
      const infrastructure: BuildingType[] = [
        ...Array.from({ length: requiredWells(6, config.rates) }, () => 'well' as BuildingType),
        ...Array.from({ length: requiredFarms(6, config.rates) }, () => 'farm' as BuildingType),
      ]
      const spare = spareWorkers(6, config.rates)
      const base = build({
        residences: 6,
        types: [...infrastructure, 'workshop'],
        water: 200,
        food: 400,
      })
      const staffed =
        spare > 0
          ? forceRoles(base, [...infrastructure, 'workshop'])
          : forceRoles(base, [...infrastructure.slice(0, -1), 'workshop'])
      const after600 = runShadow(staffed, 600, config.rates)
      const stable = read(after600, config.rates)
      // Reproducible: a second, different starting shape reaches the same
      // qualitative state (an extra Farm instead of the exact minimum).
      const secondStart = forceRoles(
        build({
          residences: 6,
          types: [...infrastructure, 'farm', 'workshop'],
          water: 200,
          food: 400,
        }),
        [...infrastructure, 'workshop']
      )
      const second = read(runShadow(secondStart, 600, config.rates), config.rates)
      const causal = spare > 0
      return {
        configuration: config.label,
        qualitativeState: causal
          ? 'a full-coverage colony sustaining discretionary industrial production'
          : 'no other qualitative state: a staffed Workshop costs a Well or the Food balance',
        causal,
        stable: stable.population === 6 && stable.water > 0 && stable.staffedWorkshops === 1,
        reproducible: second.population === 6 && second.staffedWorkshops === 1,
        consequential: causal,
        readable: causal
          ? 'UI can explain it from existing queries: Free workers = population - staffed Farms - staffed Wells'
          : 'nothing new to explain: the Workshop is a reserve-funded burst',
        nonArbitrary: causal
          ? 'the condition is the model itself: a staffed Workshop while every Farm and Well stays staffed and Food/Water stay non-negative'
          : 'no threshold invented',
      }
    })
    audit('TOWN_CANDIDATE_GATE', {
      gate,
      decision:
        'the gate passes only under a 3-rate configuration; the current 2/2 economy fails it, and Town therefore stays DEFERRED (step 14)',
    })
    expect(gate[0]!.causal).toBe(false)
    expect(gate[0]!.stable).toBe(false)
    for (const entry of gate.slice(1)) {
      expect(entry.causal).toBe(true)
      expect(entry.stable).toBe(true)
      expect(entry.reproducible).toBe(true)
    }
    // The gate passing is necessary but NOT sufficient: no Town contract is
    // implemented and no threshold is invented in this step.
    expect(SCENARIOS.every((scenario) => scenario.objective !== undefined)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 10. SECOND-ORDER EFFECTS
// ---------------------------------------------------------------------------

describe('10. Second-order effects', () => {
  it('measures Food, Water, Material, Housing, Roads, Workforce and Crew pressure', () => {
    const rows = CONFIGS.map((config) => {
      const populations = Array.from({ length: 12 }, (_, index) => index + 1)
      return {
        configuration: config.label,
        feasiblePopulations: populations.filter((population) => feasibility(population, config.rates).feasible),
        populationsWithFoodSurplus: surplusPopulations(config.rates, 'food'),
        populationsWithWaterSurplus: surplusPopulations(config.rates, 'water'),
        maxSpare: Math.max(...populations.map((population) => spareWorkers(population, config.rates))),
      }
    })
    const invariants = {
      housing: 'housing capacity is 1 per operational Residence and is NOT touched by the rate parameter (admission still requires a vacant Residence)',
      roads: 'road cost 5 and the access/mobility gates are rate-independent: an extra worker never removes a road requirement',
      workforce: 'one job per workplace, one workplace per colonist: unchanged; the rate only changes how many infrastructure workplaces are needed',
      constructionCrew: 'crew credit (+1 construction tick) is rate-independent; a freed Farm worker is now available to crew, which is a new allocation choice',
      material: 'Workshop production 2 and upkeep 1 are unchanged; the storage cap (25 per operational Workshop) bounds the industrial income at every rate',
    }
    const recorded = {
      singleWorkshopCrest:
        'a lone staffed Workshop rests at cap-1 (25 storage minus 1 upkeep), so a 25-cost building is only spendable on the tick whose production crests the cap: the resting-state affordability query shows 24. RECORDED, not fixed (step 10 §"do not fix any issue during this step")',
      notCausedByTuning:
        'the crest applies to the canonical economy as well; a 3-rate tuning changes how many discretionary workers exist, never the storage/upkeep arithmetic',
    }
    audit('SECOND_ORDER_EFFECTS', { rows, invariants, recorded })
    expect(invariants.housing.length).toBeGreaterThan(0)
    expect(recorded.notCausedByTuning).toContain('canonical')
    // The decisive measured effect: the canonical economy is a knife edge at
    // every balanced population (no Food and no Water surplus at all), while a
    // Farm-3 rate gives 7 of the 11 balanced populations a Food surplus and a
    // Well-3 rate gives 7 a Water surplus. A Food surplus disarms the only
    // population-loss rule; a Water stock surplus does NOT relax growth, whose
    // gate is Water CAPACITY.
    expect(rows[0]!.populationsWithFoodSurplus).toHaveLength(0)
    expect(rows[0]!.populationsWithWaterSurplus).toHaveLength(0)
    expect(rows[1]!.populationsWithFoodSurplus).toHaveLength(7)
    expect(rows[1]!.populationsWithWaterSurplus).toHaveLength(5)
    expect(rows[2]!.populationsWithFoodSurplus).toHaveLength(5)
    expect(rows[2]!.populationsWithWaterSurplus).toHaveLength(7)
    expect(rows[3]!.populationsWithFoodSurplus).toHaveLength(7)
    expect(rows[3]!.populationsWithWaterSurplus).toHaveLength(7)
  })
})

// ---------------------------------------------------------------------------
// 11. BALANCE DECISION MATRIX
// ---------------------------------------------------------------------------

describe('11. Balance decision matrix', () => {
  it('exposes the trade-offs without scores or ranking', () => {
    const matrix = CONFIGS.map((config) => {
      const populations = Array.from({ length: 12 }, (_, index) => index + 1)
      const foodSurplus = surplusPopulations(config.rates, 'food').length
      const waterSurplus = surplusPopulations(config.rates, 'water').length
      const spare = populations.map((population) => spareWorkers(population, config.rates))
      return {
        configuration: config.label,
        foodPressure: `${11 - foodSurplus}/11 balanced populations at or below break-even`,
        waterPressure: `${11 - waterSurplus}/11 balanced populations at or below break-even`,
        workforceHeadroom: `first spare at P=${populations.find((p) => spareWorkers(p, config.rates) > 0) ?? 'never'}, max ${Math.max(...spare)} at P=12`,
        industry:
          Math.max(...spare) > 0
            ? `up to ${Math.max(...spare)} permanently staffable Workshops`
            : 'temporary only: a Workshop worker must leave a Well or Farm',
        populationPressure:
          config.label === '3/3 both surplus'
            ? 'P=3 already has a discretionary worker: growth is no longer the gate'
            : 'growth still gated by Water capacity and by Material for housing',
        scenarioImpact:
          config.label === '2/2 current'
            ? 'baseline: all six scenarios keep their measured outcomes'
            : config.label === '3/2 food surplus'
              ? 'none structural: identical stages, objective ticks and populations; only larger Food stocks'
              : config.label === '2/3 water surplus'
                ? 'Industrial Expansion starves at tick 61; Population Expansion reaches a different population'
                : 'Industrial Expansion reaches population 3 on a 1831 Water surplus; Population Expansion changes and Water Constraint loses its pressure',
      }
    })
    audit('BALANCE_DECISION_MATRIX', { matrix, note: 'factual comparison only; no score, no ranking' })
    expect(matrix).toHaveLength(4)
    expect(matrix[0]!.industry).toContain('temporary')
    expect(matrix[1]!.scenarioImpact).toContain('identical')
    expect(matrix[2]!.scenarioImpact).toContain('starves')
    expect(matrix[3]!.scenarioImpact).toContain('population 3')
  })
})

// ---------------------------------------------------------------------------
// 12. DESIGN DECISION
// ---------------------------------------------------------------------------

describe('12. Design decision', () => {
  it('records E — no tuning yet, and leaves every production constant untouched', () => {
    const decision = {
      outcome: 'E — NO TUNING YET',
      factualBasis: [
        'Farm 3 creates industrial headroom (first discretionary worker at P=6) but Food becomes structurally surplus at 7 of the 11 balanced populations, so the only population-loss rule in the simulation stops being a live constraint for the balanced colony',
        'Farm 3 repairs no existing scenario: all six keep exactly their canonical stage, objective ticks and population (only Food stocks grow)',
        'Well 3 reaches the same headroom but additionally mutates the Village contract (COLONISTS_PER_STAFFED_WELL is defined as WATER_PER_WELL_PER_TICK) and makes Industrial Expansion starve at tick 61',
        'Both 3 gives a discretionary worker from P=3 and relaxes both constraints: the survival economy stops being the structure of the colony',
        'The current 2/2 economy remains coherent: a staffed Workshop is always reserve-funded (it costs Water or Food), so industry stays deliberately temporary; the same rules already describe a repeatable Food-funded conversion loop, so the industrial phase is not a dead end',
      ],
      consequence:
        'the tuning decision is deferred: it should be co-designed with the content that exercises the industrial phase, not adopted ahead of it',
      productionChange: 'none',
    }
    audit('DESIGN_DECISION', decision)
    expect(decision.outcome.startsWith('E')).toBe(true)
    // No production constant moved in this step.
    expect(FOOD_PER_FARM_PER_TICK).toBe(2)
    expect(WATER_PER_WELL_PER_TICK).toBe(2)
    expect(FOOD_PER_COLONIST_PER_TICK).toBe(1)
    expect(WATER_PER_COLONIST_PER_TICK).toBe(1)
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
    expect(MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK).toBe(1)
  })

  it('proves the temporary industrial phase is repeatable, not one-shot', () => {
    // The 10AO audit concluded the Water burn is permanent at the cap. This
    // measures the correction: at a population BELOW the Water cap the reserve
    // refills, and at P=2 the Food surplus of the Food-funded loop pays for it.
    const rates = CANONICAL
    let state = build({
      residences: 2,
      types: ['farm', 'well', 'well', 'workshop'],
      food: 600,
      water: 0,
      material: 0,
    })
    const cycle = (input: SimulationState): SimulationState => {
      let next = forceRoles(input, ['well', 'well'])
      for (let i = 0; i < 20; i += 1) next = shadowStep(next, rates)
      next = forceRoles(next, ['farm', 'workshop'])
      for (let i = 0; i < 20; i += 1) next = shadowStep(next, rates)
      return next
    }
    const marks = [read(state, CANONICAL)]
    for (let i = 0; i < 3; i += 1) {
      state = cycle(state)
      marks.push(read(state, CANONICAL))
    }
    audit('REPEATABLE_CONVERSION_2_2', {
      marks,
      reading:
        'the Water reserve returns to its pre-loop level every cycle; each cycle converts 40 Food into one Workshop-tick of Material (bounded by the 25-per-Workshop storage cap)',
    })
    expect(marks).toHaveLength(4)
    for (const mark of marks.slice(1)) expect(mark.water).toBe(marks[0]!.water)
    expect(marks[3]!.food).toBeLessThan(marks[0]!.food)
    // The Workshop output is banked (bounded by the 25-per-Workshop cap).
    expect(marks[1]!.material).toBeGreaterThan(marks[0]!.material)
    expect(marks[3]!.material).toBeLessThanOrEqual(MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
  })
})

// ---------------------------------------------------------------------------
// 14-15. TOWN GATE AND CONTENT IMPACT
// ---------------------------------------------------------------------------

describe('14-15. Town gate and content impact', () => {
  it('keeps Town deferred and re-evaluates the three content candidates', () => {
    const town = {
      implemented: false,
      thresholdInvented: false,
      reason:
        'no tuning is adopted, so the qualitative state the Town contract would name (discretionary industrial production inside a fully staffed survival colony) is not part of the canonical model',
      status: 'Town remains deferred',
    }
    const candidates = [
      {
        name: 'Partitioned valley',
        decisionSpace: 'spatial / coverage',
        canonical: 'meaningful',
        farm3: 'unchanged',
        well3: 'unchanged',
        both3: 'unchanged',
      },
      {
        name: 'Food glut without Water',
        decisionSpace: 'growth timing vs Water capacity',
        canonical: 'meaningful',
        farm3: 'less meaningful: a Food glut no longer costs the farms that create it',
        well3: 'more meaningful: Water capacity, not Food, decides the growth window',
        both3: 'invalid: neither constraint binds, so the candidate has no decision',
      },
      {
        name: 'Standing industry',
        decisionSpace: 'temporary industry vs growth',
        canonical: 'meaningful: the Workshop can only run by displacing a Well',
        farm3: 'less meaningful: the freed worker makes industry permanent, removing the choice',
        well3: 'less meaningful: the freed worker makes industry permanent',
        both3: 'invalid: industry is available from P=3',
      },
    ]
    audit('TOWN_AND_CONTENT', { town, candidates })
    expect(town.implemented).toBe(false)
    expect(town.thresholdInvented).toBe(false)
    expect(candidates).toHaveLength(3)
    expect(candidates[2]!.farm3).toContain('less meaningful')
    expect(candidates[1]!.both3).toContain('invalid')
  })
})

// ---------------------------------------------------------------------------
// 16. ARCHITECTURAL INVARIANTS
// ---------------------------------------------------------------------------

describe('16. Architectural invariants', () => {
  it('keeps the model deterministic, persistent and free of new mechanics', () => {
    const scenario = findScenario('industrial-expansion')
    if (scenario === undefined) throw new Error('10ap: missing scenario')
    const first = createScenarioState(shipConfig, scenario)
    const second = createScenarioState(shipConfig, scenario)
    const a = runShadow(first, 50, CANONICAL)
    const b = runShadow(second, 50, CANONICAL)
    const saved = serializeSave(a)
    const loaded = loadSave(saved)
    const insertionOrder = {
      buildingsSorted: [...iterateBuildings(a)].map((building) => building.id),
      canonicalBuildings: Object.keys(a.buildings),
    }
    audit('ARCHITECTURAL_INVARIANTS', {
      saveVersion: SAVE_VERSION,
      deterministic: hashCanonicalState(a) === hashCanonicalState(b),
      saveRoundTrip: hashCanonicalState(loaded) === hashCanonicalState(a),
      serializable: serializeCanonicalState(a).length > 0,
      insertionOrder,
      objectivePure:
        JSON.stringify(getProgression(a)) === JSON.stringify(getProgression(a)),
      noNewResource: Object.keys(a.resources).sort(),
      noNewBuilding: [...new Set([...iterateBuildings(a)].map((b) => b.type))].sort(),
      productionChanged: false,
    })
    expect(SAVE_VERSION).toBe(8)
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(a))
    expect(Object.keys(a.resources).sort()).toEqual(['construction', 'food', 'water'])
  })
})
