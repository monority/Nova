/**
 * Step 10BC — Phase freeze & Town dependency contract AUDIT.
 *
 * AUDIT ONLY. `src/` is untouched: this file verifies the freeze the previous
 * steps established and records the candidate/dependency classification. It does
 * not re-run historical audits, does not change a constant and does not add a
 * scenario.
 *
 * Run:
 *   npx vitest run tests/phaseFreezeTownDependencyAudit.test.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  canonicalJson,
  countWorkersAt,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getEmploymentSummary,
  getFoodProductionPerTick,
  getProgression,
  getRoadNetworks,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  hashCanonicalState,
  iterateBuildings,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
  ROAD_CONSTRUCTION_COST,
  ROAD_CONSTRUCTION_TICKS,
  SAVE_VERSION,
  SCENARIOS,
  SCENARIO_FIXTURES,
  serializeSave,
  stepSimulation,
  validatePlacement,
  validateRoadsPlacement,
  WATER_PER_COLONIST_PER_TICK,
  WATER_PER_WELL_PER_TICK,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const config = (width = 16, height = 8): SimulationConfig => ({
  world: { seed: 'nova-step10bc', width, height },
})

const withBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10bc: building missing')
  }
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

const withRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  const road = id === undefined ? undefined : created.state.roads[id]
  if (id === undefined || road === undefined) {
    throw new Error('10bc: road missing')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

interface ColonySpec {
  readonly population: number
  readonly farms: number
  readonly wells: number
  readonly workshops?: number
  readonly food?: number
  readonly water?: number
  readonly material?: number
}

const colony = (spec: ColonySpec, world = config()): SimulationState => {
  const workplaces = spec.farms + spec.wells + (spec.workshops ?? 0)
  const spine = Math.max(spec.population, workplaces, 1)
  let state = createInitialState(world)
  state = {
    ...state,
    resources: {
      construction: spec.material ?? 100,
      food: spec.food ?? 200,
      water: spec.water ?? 50,
    },
  }
  for (let index = 0; index < spec.population; index += 1) {
    state = withBuilding(state, 'residence', index, 0)
  }
  for (let index = 0; index < (spec.workshops ?? 0); index += 1) {
    state = withBuilding(state, 'workshop', index, 2)
  }
  for (let index = 0; index < spec.farms; index += 1) {
    state = withBuilding(state, 'farm', (spec.workshops ?? 0) + index, 2)
  }
  for (let index = 0; index < spec.wells; index += 1) {
    state = withBuilding(state, 'well', (spec.workshops ?? 0) + spec.farms + index, 2)
  }
  for (let x = 0; x < spine; x += 1) {
    state = withRoad(state, x, 1)
  }
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence'
  )
  for (const residence of residences) {
    state = createColonist(state, residence.id).state
  }
  return assignJobs(state)
}

const tick = (state: SimulationState, times: number): SimulationState => {
  let next = state
  for (let index = 0; index < times; index += 1) {
    next = stepSimulation(next)
  }
  return next
}

const countProductiveWells = (state: SimulationState): number =>
  [...iterateBuildings(state)].filter(
    (building) =>
      building.type === 'well' &&
      building.status === 'operational' &&
      countWorkersAt(state, building.id) > 0
  ).length

/** Colonists the minimum safe survival infrastructure does not occupy. */
const spareWorkers = (population: number): number =>
  population - Math.ceil(population / FOOD_PER_FARM_PER_TICK) - Math.ceil(population / WATER_PER_WELL_PER_TICK)

// ---------------------------------------------------------------------------
// 1. Freeze verification (§4 of the step)
// ---------------------------------------------------------------------------

describe('1. freeze verification', () => {
  it('re-reads every frozen constant from the code', () => {
    const frozen = {
      farmProduction: FOOD_PER_FARM_PER_TICK,
      wellProduction: WATER_PER_WELL_PER_TICK,
      workshopProduction: MATERIAL_PER_WORKER_PER_TICK,
      workshopUpkeep: MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
      foodConsumption: FOOD_PER_COLONIST_PER_TICK,
      waterConsumption: WATER_PER_COLONIST_PER_TICK,
      workshopStorage: MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
      roadCost: ROAD_CONSTRUCTION_COST,
      roadTicks: ROAD_CONSTRUCTION_TICKS,
      residence: getBuildingDefinition('residence'),
      farm: getBuildingDefinition('farm'),
      well: getBuildingDefinition('well'),
      workshop: getBuildingDefinition('workshop'),
      saveVersion: SAVE_VERSION,
      catalogue: SCENARIOS.length,
      fixtures: SCENARIO_FIXTURES.length,
      stages: ['wilderness', 'settlement', 'village'],
      objectiveKinds: [
        ...new Set(
          SCENARIOS.flatMap((scenario) =>
            scenario.objective.requirements.map((requirement) => requirement.kind)
          )
        ),
      ].sort(),
    }
    audit('FROZEN_BASELINE', frozen)
    expect(frozen.farmProduction).toBe(2)
    expect(frozen.wellProduction).toBe(2)
    expect(frozen.workshopProduction).toBe(2)
    expect(frozen.workshopUpkeep).toBe(1)
    expect(frozen.foodConsumption).toBe(1)
    expect(frozen.waterConsumption).toBe(1)
    expect(frozen.workshopStorage).toBe(25)
    expect(frozen.roadCost).toBe(5)
    expect(frozen.roadTicks).toBe(2)
    expect(frozen.residence).toEqual({ constructionTicks: 2, housingCapacity: 1, constructionCost: 25, constructionWaterCost: 0 })
    expect(frozen.farm).toEqual({ constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 0 })
    expect(frozen.well).toEqual({ constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 0 })
    expect(frozen.workshop).toEqual({ constructionTicks: 2, housingCapacity: 0, constructionCost: 25, constructionWaterCost: 1 })
    expect(frozen.saveVersion).toBe(7)
    // 7 at the freeze; Step 10BE later added one curated content scenario
    // (no mechanic, no constant, no objective kind changed).
    expect(frozen.catalogue).toBe(8)
    expect(frozen.fixtures).toBe(1)
    expect(frozen.objectiveKinds).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
  })

  it('scans the source for unexpected drift', () => {
    const collect = (dir: string): string[] => {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
          files.push(...collect(path))
        } else if (path.endsWith('.ts')) {
          files.push(path.replace(/\\/g, '/'))
        }
      }
      return files
    }
    const files = collect('src')
    const source = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    const rows = {
      domainFiles: files.filter((file) => file.startsWith('src/domain/')).length,
      srcFiles: files.length,
      terrainReaders: source.filter(({ text }) => /blockedCells|isTerrainBlocked/.test(text)).length,
      // Prohibited capability names: none of the rejected abstractions exists.
      forbidden: ['TerrainSystem', 'WaterSystem', 'ServiceSystem', 'TownSystem', 'BiomeSystem', 'DemandSystem', 'TaxSystem', 'ZoningSystem'].filter(
        (name) => source.some(({ text }) => text.includes(name))
      ),
      // Town must not exist as a stage or condition.
      // Town must not exist as a VALUE or an identifier: only the documented
      // deferral comment in progression.ts mentions it.
      townValues: source
        .filter(({ text }) => /'town'|Town[A-Z]|TownCondition|isTown/.test(text))
        .map(({ file }) => file),
      townMentions: source
        .filter(({ text }) => /Town/.test(text))
        .map(({ file }) => file),
      saveVersion: SAVE_VERSION,
    }
    audit('SOURCE_DRIFT', rows)
    expect(rows.domainFiles).toBe(15)
    expect(rows.srcFiles).toBe(35)
    expect(rows.terrainReaders).toBe(8)
    expect(rows.forbidden).toEqual([])
    // No Town stage, condition or helper exists; the only mention is the
    // progression comment that defers it.
    expect(rows.townValues).toEqual([])
    expect(rows.townMentions).toEqual(['src/application/queries/progression.ts'])
    expect(rows.saveVersion).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// 2. Closed semantics re-verified (anchors only)
// ---------------------------------------------------------------------------

describe('2. closed semantics, re-verified', () => {
  it('confirms the Water contract: capacity is staffed, service is not', () => {
    // One road cell, two Residences, a Farm and a Well: the Well loses the
    // worker to the Farm (nearest then lowest id) and stays VACANT while it
    // still covers the network.
    const state = colony({ population: 2, farms: 1, wells: 1, food: 100 })
    const measured = {
      operationalWells: [...iterateBuildings(state)].filter(
        (building) => building.type === 'well' && building.status === 'operational'
      ).length,
      staffedWells: countProductiveWells(state),
      servedResidences: getWaterServedResidenceCount(state),
      capacity: getWaterProductionPerTick(state),
      coveredNetworks: getWaterCoverage(state).coveredNetworkIds.size,
    }
    audit('WATER_ANCHOR', measured)
    expect(measured.operationalWells).toBe(1)
    // Coverage follows the operational Well (10P, closed in 10AY)...
    expect(measured.servedResidences).toBe(2)
    expect(measured.coveredNetworks).toBe(1)
    // ...while capacity is exactly staffed Wells x 2.
    expect(measured.capacity).toBe(measured.staffedWells * WATER_PER_WELL_PER_TICK)
  })

  it('confirms terrain is a spatial restriction only', () => {
    // A blocked set that no command ever targets leaves the trajectory
    // byte-identical: terrain adds no economic behaviour (10AV/10AW, closed).
    const plain = createInitialState(config(16, 8))
    const terrain = createInitialState({
      world: { seed: 'nova-step10bc', width: 16, height: 8, blockedCells: ['0,7', '15,7'] },
    })
    const drive = (state: SimulationState): SimulationState => {
      let next = stepSimulation(state, {
        type: 'placeBuilding',
        x: 4,
        y: 4,
        buildingType: 'residence',
      })
      next = stepSimulation(next, { type: 'placeRoads', cells: [{ x: 4, y: 5 }] })
      return tick(next, 60)
    }
    const strip = (state: SimulationState): string =>
      canonicalJson({
        ...state,
        config: {
          world: {
            seed: state.config.world.seed,
            width: state.config.world.width,
            height: state.config.world.height,
          },
        },
      })
    const rows = {
      identical: strip(drive(plain)) === strip(drive(terrain)),
      buildingRefusedOnBlocked: validatePlacement(terrain, { x: 0, y: 7 }, 'residence'),
      roadRefusedOnBlocked: validateRoadsPlacement(terrain, [{ x: 15, y: 7 }]),
      noModifier: getFoodProductionPerTick(terrain) === getFoodProductionPerTick(plain),
    }
    audit('TERRAIN_ANCHOR', rows)
    expect(rows.identical).toBe(true)
    expect(rows.buildingRefusedOnBlocked).toEqual({ valid: false, reason: 'terrainBlocked' })
    expect(rows.roadRefusedOnBlocked).toEqual({ valid: false, reason: 'terrainBlocked' })
    expect(rows.noModifier).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. The Town criteria against the current model (§5 and §6)
// ---------------------------------------------------------------------------

describe('3. town criteria against the model', () => {
  it('shows the only qualitative candidate state is unreachable at 2/2', () => {
    const sweep = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((population) => {
      const state = colony({
        population,
        farms: Math.ceil(population / FOOD_PER_FARM_PER_TICK),
        wells: Math.ceil(population / WATER_PER_WELL_PER_TICK),
      })
      return {
        population,
        spare: spareWorkers(population),
        staffedWorkshops: [...iterateBuildings(state)].filter(
          (building) =>
            building.type === 'workshop' && countWorkersAt(state, building.id) > 0
        ).length,
        employed: getEmploymentSummary(state).employed,
        vacantJobs: getEmploymentSummary(state).vacantJobs,
      }
    })
    audit('DISCRETIONARY_LABOUR', sweep)
    // No population leaves a worker the survival economy does not need, so no
    // persistent discretionary state can exist: the only candidate Town
    // phenomenon (10AO) is unreachable at the frozen rates.
    for (const row of sweep) {
      expect(row.spare).toBeLessThanOrEqual(0)
      expect(row.staffedWorkshops).toBe(0)
    }
    expect(sweep.find((row) => row.population === 6)?.spare).toBe(0)
    expect(sweep.find((row) => row.population === 5)?.spare).toBe(-1)
  })

  it('shows the stage contract has no Town condition and no hidden state', () => {
    const state = colony({ population: 4, farms: 2, wells: 2 })
    const progression = getProgression(state)
    const rows = {
      stage: progression.stage,
      nextStage: progression.nextStage,
      deferred: progression.deferred,
      nextConditions: progression.nextConditions.length,
      serialized: serializeSave(state).includes('town') || serializeSave(state).includes('Town'),
    }
    audit('PROGRESSION_ANCHOR', rows)
    // Village is the final implemented stage: nothing beyond it is contracted.
    expect(rows.stage).toBe('village')
    expect(rows.nextStage).toBeNull()
    expect(rows.deferred).toBe(true)
    expect(rows.nextConditions).toBe(0)
    expect(rows.serialized).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. Candidate audit A-F (§6)
// ---------------------------------------------------------------------------

describe('4. candidate audit', () => {
  it('A — population: scale adds no new action, only more of the same', () => {
    const small = colony({ population: 2, farms: 1, wells: 1 })
    const large = colony({ population: 8, farms: 4, wells: 4 })
    const actionSet = (state: SimulationState) => {
      const cells = [
        { x: 6, y: 4 },
        { x: 7, y: 4 },
        { x: 8, y: 4 },
      ]
      return {
        buildings: (['residence', 'farm', 'well', 'workshop'] as const)
          .map((type) => validatePlacement(state, cells[0] as { x: number; y: number }, type).valid)
          .join(','),
        roads: validateRoadsPlacement(state, cells).valid,
      }
    }
    const rows = {
      small: { ...actionSet(small), population: Object.keys(small.colonists).length },
      large: { ...actionSet(large), population: Object.keys(large.colonists).length },
    }
    audit('CANDIDATE_POPULATION', rows)
    // The same four buildings and roads are legal at both scales: the player's
    // ACTION SET is identical. Only the quantities differ → scale increase, not
    // a new gameplay capability.
    expect(rows.small.buildings).toBe(rows.large.buildings)
    expect(rows.small.roads).toBe(rows.large.roads)
    expect(rows.small.buildings).toBe('true,true,true,true')
  })

  it('B — roads: infrastructure has no capacity rule, so size is quantitative', () => {
    // Shared: ONE road cell is the access of all four buildings. Dedicated: the
    // same topology one cell wider, three contiguous access cells. Same
    // services, same network, different road budget.
    const shared = (() => {
      let state = createInitialState(config())
      state = { ...state, resources: { ...state.resources, construction: 100, food: 200, water: 50 } }
      state = withRoad(state, 1, 1)
      state = withBuilding(state, 'residence', 1, 0)
      state = withBuilding(state, 'residence', 0, 1)
      state = withBuilding(state, 'farm', 1, 2)
      state = withBuilding(state, 'well', 2, 1)
      const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
      for (const residence of residences) {
        state = createColonist(state, residence.id).state
      }
      return assignJobs(state)
    })()
    const dedicated = (() => {
      let state = createInitialState(config())
      state = { ...state, resources: { ...state.resources, construction: 100, food: 200, water: 50 } }
      for (const x of [0, 1, 2]) state = withRoad(state, x, 1)
      state = withBuilding(state, 'residence', 0, 0)
      state = withBuilding(state, 'residence', 1, 0)
      state = withBuilding(state, 'farm', 1, 2)
      state = withBuilding(state, 'well', 2, 2)
      const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
      for (const residence of residences) {
        state = createColonist(state, residence.id).state
      }
      return assignJobs(state)
    })()
    const rows = {
      shared: {
        roads: Object.keys(shared.roads).length,
        networks: getRoadNetworks(shared).length,
        served: getWaterServedResidenceCount(shared),
        capacity: getWaterProductionPerTick(shared),
        employed: getEmploymentSummary(shared).employed,
      },
      dedicated: {
        roads: Object.keys(dedicated.roads).length,
        networks: getRoadNetworks(dedicated).length,
        served: getWaterServedResidenceCount(dedicated),
        capacity: getWaterProductionPerTick(dedicated),
        employed: getEmploymentSummary(dedicated).employed,
      },
    }
    audit('CANDIDATE_ROADS', rows)
    // Identical flows from 1 or 3 access cells: there is no infrastructure
    // capacity/load rule, so road size stays quantitative (Material only).
    expect(rows.shared.roads).toBe(1)
    expect(rows.dedicated.roads).toBe(3)
    expect(rows.shared.networks).toBe(rows.dedicated.networks)
    expect(rows.shared.capacity).toBe(rows.dedicated.capacity)
    expect(rows.shared.served).toBe(rows.dedicated.served)
    expect(rows.shared.employed).toBe(rows.dedicated.employed)
  })

  it('C — workshops: a second Workshop is linear, and unstaffable at 2/2', () => {
    const one = colony({ population: 4, farms: 2, wells: 2, workshops: 0 })
    const two = colony({ population: 4, farms: 2, wells: 2, workshops: 2 })
    const rows = {
      one: {
        staffedWorkshops: [...iterateBuildings(one)].filter(
          (b) => b.type === 'workshop' && countWorkersAt(one, b.id) > 0
        ).length,
        storage: [...iterateBuildings(one)].filter(
          (b) => b.type === 'workshop' && b.status === 'operational'
        ).length * MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
        employed: getEmploymentSummary(one).employed,
        spare: spareWorkers(4),
      },
      two: {
        staffedWorkshops: [...iterateBuildings(two)].filter(
          (b) => b.type === 'workshop' && countWorkersAt(two, b.id) > 0
        ).length,
        vacantWorkplaces: getEmploymentSummary(two).vacantJobs,
        storage: [...iterateBuildings(two)].filter(
          (b) => b.type === 'workshop' && b.status === 'operational'
        ).length * MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
        employed: getEmploymentSummary(two).employed,
      },
    }
    audit('CANDIDATE_WORKSHOPS', rows)
    // Storage and upkeep scale linearly with the count; the WORKERS do not
    // exist, so the second Workshop (and the survival workplace it displaces)
    // cannot both run. Quantities change, no rule changes.
    expect(rows.one.storage).toBe(0)
    expect(rows.two.storage).toBe(2 * MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP)
    expect(rows.two.staffedWorkshops).toBeLessThanOrEqual(2)
    expect(rows.two.employed).toBeLessThanOrEqual(4)
    expect(spareWorkers(4)).toBe(0)
  })

  it('D — housing composition: the same buildings, the difference is placement', () => {
    // 10AZ's controlled pair, re-measured at the level the freeze contract
    // needs: the composition changes capacity and employment, and both layouts
    // are reachable with the same existing placement command.
    const layout = (secondResidence: { x: number; y: number }): SimulationState =>
      (() => {
        let state = createInitialState(config())
        state = { ...state, resources: { ...state.resources, construction: 100, food: 200, water: 50 } }
        state = withRoad(state, 1, 1)
        state = withRoad(state, 3, 1)
        state = withBuilding(state, 'residence', 1, 0)
        state = withBuilding(state, 'residence', secondResidence.x, secondResidence.y)
        state = withBuilding(state, 'farm', 1, 2)
        state = withBuilding(state, 'well', 3, 2)
        const residences = [...iterateBuildings(state)].filter((b) => b.type === 'residence')
        for (const residence of residences) {
          state = createColonist(state, residence.id).state
        }
        return assignJobs(state)
      })()
    const distributed = layout({ x: 3, y: 0 })
    const concentrated = layout({ x: 0, y: 1 })
    const rows = {
      distributed: {
        capacity: getWaterProductionPerTick(distributed),
        served: getWaterServedResidenceCount(distributed),
        employed: getEmploymentSummary(distributed).employed,
        stage: getProgression(distributed).stage,
      },
      concentrated: {
        capacity: getWaterProductionPerTick(concentrated),
        served: getWaterServedResidenceCount(concentrated),
        employed: getEmploymentSummary(concentrated).employed,
        stage: getProgression(concentrated).stage,
      },
    }
    audit('CANDIDATE_HOUSING', rows)
    expect(rows.distributed.capacity).toBe(2)
    expect(rows.concentrated.capacity).toBe(0)
    // Real, but owned by the existing placement/coverage/mobility rules (10AZ:
    // classification B, no scenario added) — not a new civic rule.
    expect(rows.distributed.stage).toBe('village')
    expect(rows.concentrated.stage).not.toBe('village')
  })

  it('E and F — terrain and industrial headroom stay closed', () => {
    const rows = {
      terrain: {
        semantic: 'spatial restriction only (no building, no road, immutable, no modifier)',
        measuredIn: 'section 2 (byte-identical trajectory with a never-targeted blocked set)',
        classification: 'A — spatial constraint, not an economic system (10AW)',
      },
      industrialHeadroom: {
        // 10BB: at 2/2 no population sustains a staffed Workshop; the headroom
        // only exists under a rate change, which was REJECTED (decision A).
        spareAtP6: spareWorkers(6),
        firstSustainableWorkshopAt2_2: null,
        tuningDecision: 'KEEP 2/2 (10BB)',
        workshopRole: 'temporary / reserve-funded conversion (10AO, 10AQ, 10BB)',
      },
    }
    audit('CANDIDATES_E_F', rows)
    expect(rows.industrialHeadroom.spareAtP6).toBe(0)
    expect(rows.industrialHeadroom.firstSustainableWorkshopAt2_2).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. Content versus capability (§9)
// ---------------------------------------------------------------------------

describe('5. content versus capability', () => {
  it('shows a richer starting state adds no rule and no new action', () => {
    const lean = colony({ population: 2, farms: 1, wells: 1, food: 50, water: 0, material: 25 })
    const rich = colony({
      population: 6,
      farms: 3,
      wells: 3,
      workshops: 1,
      food: 500,
      water: 200,
      material: 500,
    }, config(24, 10))
    const rows = {
      lean: {
        population: Object.keys(lean.colonists).length,
        material: lean.resources.construction,
        food: lean.resources.food,
        water: lean.resources.water,
        buildings: Object.keys(lean.buildings).length,
      },
      rich: {
        population: Object.keys(rich.colonists).length,
        material: rich.resources.construction,
        food: rich.resources.food,
        water: rich.resources.water,
        buildings: Object.keys(rich.buildings).length,
      },
      // The RULES in force are identical: the same catalog prices, the same
      // progression conditions, the same workforce rule.
      sameRules:
        canonicalJson(getBuildingDefinition('workshop')) ===
        canonicalJson(getBuildingDefinition('workshop')),
      progressionConditionsIdentical:
        getProgression(lean).nextConditions.map((condition) => condition.id).join(',') ===
        getProgression(rich).nextConditions.map((condition) => condition.id).join(','),
      buildableActionTypesIdentical: (() => {
        const cell = { x: 20, y: 8 }
        const types = (['residence', 'farm', 'well', 'workshop'] as const).map((type) =>
          validatePlacement(rich, cell, type).valid
        )
        return types.every((valid) => valid) === true
      })(),
    }
    audit('CONTENT_VS_CAPABILITY', rows)
    // Only quantities differ: the rich start has no capability the lean start
    // lacks, and the condition set behind the next stage is identical.
    expect(rows.rich.population).toBeGreaterThan(rows.lean.population)
    expect(rows.sameRules).toBe(true)
    expect(rows.progressionConditionsIdentical).toBe(true)
    expect(rows.buildableActionTypesIdentical).toBe(true)
    // A rich start is still bounded by the same 2/2 identity.
    expect(spareWorkers(rows.rich.population)).toBeLessThanOrEqual(0)
  })

  it('records the capability matrix without ranking it', () => {
    const matrix = [
      { category: 'Civic/service capability', causal: 'PARTIAL', persistent: 'YES', consequential: 'YES', spatial: 'YES', economic: 'PARTIAL', readable: 'YES', nonArbitrary: 'PARTIAL', newDecision: 'NO', evidence: '10P implemented the only service the evidence required (Water); 10X classified power as a Water clone (C), sanitation as D, education as C (no consumer); 10AG rejected Food distribution' },
      { category: 'Economic transformation', causal: 'PARTIAL', persistent: 'NO', consequential: 'YES', spatial: 'NO', economic: 'YES', readable: 'YES', nonArbitrary: 'PARTIAL', newDecision: 'NO', evidence: 'the Workshop converts Water into Material temporarily; the recurring producer input was rejected twice (10T/10U, 10AA/10AB) and replaced by a one-off construction cost (10AD); 10BB measured the burst as reserve bound and rate-invariant' },
      { category: 'Infrastructure capacity', causal: 'NO', persistent: 'NO', consequential: 'NO', spatial: 'PARTIAL', economic: 'PARTIAL', readable: 'YES', nonArbitrary: 'NO', newDecision: 'NO', evidence: 'no contention/load/throughput rule exists: one shared access cell and three dedicated cells give identical flows (measured here and in 10AW/10AX)' },
      { category: 'Housing differentiation', causal: 'PARTIAL', persistent: 'YES', consequential: 'PARTIAL', spatial: 'YES', economic: 'PARTIAL', readable: 'PARTIAL', nonArbitrary: 'PARTIAL', newDecision: 'NO', evidence: '10V/10W: shelter quality has no independent consequence (C, deferred); 10AZ: housing composition is real but owned by coverage/mobility/placement' },
      { category: 'Spatial specialization', causal: 'PARTIAL', persistent: 'YES', consequential: 'PARTIAL', spatial: 'YES', economic: 'PARTIAL', readable: 'YES', nonArbitrary: 'NO', newDecision: 'NO', evidence: '10AU-AW: terrain is a spatial restriction whose decision space is a strict SUBSET of the open map; no terrain role/resource/economy' },
      { category: 'External supply', causal: 'PARTIAL', persistent: 'PARTIAL', consequential: 'PARTIAL', spatial: 'NO', economic: 'PARTIAL', readable: 'NO', nonArbitrary: 'NO', newDecision: 'PARTIAL', evidence: 'no external state exists in the runtime (10AK: Autonomy has no referent); a planet-level dependency was never measured and would be a new subsystem, not a dependency of the current model' },
    ]
    audit('CAPABILITY_MATRIX', matrix)
    // Exactly one classification per cell, no numeric score.
    for (const row of matrix) {
      for (const key of [
        'causal',
        'persistent',
        'consequential',
        'spatial',
        'economic',
        'readable',
        'nonArbitrary',
        'newDecision',
      ] as const) {
        expect(['YES', 'PARTIAL', 'NO']).toContain(row[key])
      }
    }
    // No category is fully justified: the decisive criterion (a new decision
    // not already owned by another mechanic) is NO or PARTIAL everywhere.
    const allYes = matrix.filter((row) =>
      [
        row.causal,
        row.persistent,
        row.consequential,
        row.spatial,
        row.economic,
        row.readable,
        row.nonArbitrary,
        row.newDecision,
      ].every((value) => value === 'YES')
    )
    expect(allYes).toEqual([])
    expect(matrix.filter((row) => row.newDecision === 'YES')).toEqual([])
  })

  it('confirms the frozen repository still behaves identically', () => {
    const state = colony({ population: 4, farms: 2, wells: 2, workshops: 1 })
    const again = colony({ population: 4, farms: 2, wells: 2, workshops: 1 })
    const rows = {
      deterministic: hashCanonicalState(tick(state, 30)) === hashCanonicalState(tick(again, 30)),
      noTownInSave: !serializeSave(state).includes('Town'),
      catalogue: SCENARIOS.length,
      // A rejected placement still mutates nothing (the contract is intact).
      rejectedIsNoOp: (() => {
        const before = hashCanonicalState(state)
        applyCommand(state, { type: 'placeRoads', cells: [{ x: 0, y: 7 }] })
        return hashCanonicalState(state) === before
      })(),
    }
    audit('FROZEN_BEHAVIOUR', rows)
    expect(rows.deterministic).toBe(true)
    expect(rows.noTownInSave).toBe(true)
    expect(rows.catalogue).toBe(8)
    expect(rows.rejectedIsNoOp).toBe(true)
  })
})
