/**
 * Step 10BE — "Housing composition" scenario (content step).
 *
 * The first catalogue scenario whose DOMINANT DECISION is housing topology: two
 * road networks that do not touch, the Well on one and the only Farm on the
 * other, and Material for exactly one Residence plus at most one road cell.
 * 10AZ measured the underlying phenomenon (same buildings/population/road count,
 * only the new Residence's network differs) and 10BA made it readable through the
 * placement preview; this file pins the authored CONTENT: the start state, every
 * viable spatial solution, both failure modes with their visible cause,
 * determinism, persistence and the distinctness evidence.
 *
 * No new mechanic, no new objective kind, no new resource: existing scenarios are
 * data assembled by the shared `createScenarioState`.
 *
 * Run:
 *   npx vitest run tests/housingCompositionScenario.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  createScenarioState,
  findScenario,
  getEmploymentSummary,
  getFoodProductionPerTick,
  getObjectiveStatus,
  getPlacementSpatialPreview,
  getProgression,
  getRoadNetworks,
  getWaterCoverage,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  hashCanonicalState,
  iterateBuildings,
  loadSave,
  SCENARIOS,
  serializeSave,
  stepSimulation,
  type SimulationCommand,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const config: SimulationConfig = {
  world: { seed: 'nova-step1', width: 12, height: 12 },
}

const ID = 'housing-composition'

const definition = (): ReturnType<typeof findScenario> => {
  const found = findScenario(ID)
  if (found === undefined) {
    throw new Error(`10be: missing scenario ${ID}`)
  }
  return found
}

const read = (state: SimulationState) => ({
  population: Object.keys(state.colonists).length,
  servedResidences: getWaterServedResidenceCount(state),
  capacity: getWaterProductionPerTick(state),
  foodPerTick: getFoodProductionPerTick(state),
  material: state.resources.money,
  food: state.resources.food,
  water: state.resources.water,
  networks: getRoadNetworks(state).length,
  employed: getEmploymentSummary(state).employed,
  vacantJobs: getEmploymentSummary(state).vacantJobs,
  stage: getProgression(state).stage,
})

const run = (commands: readonly SimulationCommand[], ticks: number): SimulationState => {
  const scenario = definition()
  if (scenario === undefined) {
    throw new Error('10be: missing scenario')
  }
  let state = createScenarioState(config, scenario)
  for (const command of commands) {
    state = stepSimulation(state, command)
  }
  for (let index = 0; index < ticks; index += 1) {
    state = stepSimulation(state)
  }
  return state
}

const outcome = (state: SimulationState) =>
  getObjectiveStatus(state, definition()!.objective).state

// ---------------------------------------------------------------------------
// 1. The start state
// ---------------------------------------------------------------------------

describe('1. start state', () => {
  it('is a two-network split with a real blocker and a finite reserve', () => {
    const scenario = definition()
    if (scenario === undefined) {
      throw new Error('10be: missing scenario')
    }
    const state = createScenarioState(config, scenario)
    const status = getObjectiveStatus(state, scenario.objective)
    const measured = read(state)
    audit('HOUSING_START', {
      ...measured,
      objective: status.state,
      blockers: status.blockers,
      residences: [...iterateBuildings(state)]
        .filter((building) => building.type === 'residence')
        .map((building) => `${building.id}@${building.x},${building.y}`),
    })
    // Two networks that do not touch: the new starting shape of this scenario.
    expect(measured.networks).toBe(2)
    // The Well is staffed by the only colonist, so the colony is watered but
    // grows nothing: the Farm is on the other network.
    expect(measured.population).toBe(1)
    expect(measured.capacity).toBe(2)
    expect(measured.foodPerTick).toBe(0)
    expect(measured.servedResidences).toBe(1)
    // In progress with a blocker, and a finite reserve the player can see.
    expect(status.state).toBe('in_progress')
    expect(status.blockers.length).toBeGreaterThan(0)
    expect(measured.food).toBe(40)
    expect(measured.material).toBe(30)
    // Village is unreachable without placing anything: the start is Wilderness.
    expect(measured.stage).toBe('wilderness')
    // Only the existing objective primitive: a stage requirement.
    expect(scenario.objective.requirements).toEqual([{ kind: 'stage', stage: 'village' }])
  })

  it('is the only catalogue scenario that starts on two networks', () => {
    const rows = SCENARIOS.map((scenario) => ({
      id: scenario.id,
      networks: getRoadNetworks(createScenarioState(config, scenario)).length,
      roads: scenario.roads.length,
      residences: scenario.buildings.filter((building) => building.type === 'residence').length,
    }))
    audit('CATALOGUE_NETWORKS', rows)
    const split = rows.filter((row) => row.networks > 1)
    expect(split.map((row) => row.id)).toEqual([ID])
  })
})

// ---------------------------------------------------------------------------
// 2. The spatial solutions (real commands only)
// ---------------------------------------------------------------------------

describe('2. spatial solutions', () => {
  it('solution A — a cell that touches both networks completes (treasury floors, objective holds)', () => {
    const state = run(
      [{ type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' }],
      20
    )
    const measured = read(state)
    audit('SOLUTION_A_BRIDGE', measured)
    expect(measured.population).toBe(2)
    expect(measured.servedResidences).toBe(2)
    expect(measured.employed).toBe(2)
    expect(measured.foodPerTick).toBe(2)
    // Step001: no Workshop exists, so revenue (2 taxes) never covers
    // maintenance (4 buildings) — the 5 remainder drains to the floor.
    // The objective (Village) holds regardless of the empty treasury.
    expect(measured.material).toBe(0)
    expect(measured.stage).toBe('village')
    expect(outcome(state)).toBe('completed')
  })

  it('solution B — blocked under money: the joining road is unaffordable after the drain', () => {
    const state = run(
      [
        { type: 'placeBuilding', x: 0, y: 1, buildingType: 'residence' },
        { type: 'placeRoads', cells: [{ x: 2, y: 1 }] },
      ],
      20
    )
    const measured = read(state)
    audit('SOLUTION_B_JOIN', measured)
    // Step001: the t1 tick drains 30 - 25 - 3 = 2, so the t2 road (cost 5)
    // is REJECTED — networks never merge, the new residence stays
    // unserved, no second colonist arrives, and the objective stalls.
    // The topology solution is correct; the 30 budget cannot fund it.
    expect(measured.networks).toBe(2)
    expect(measured.population).toBe(1)
    expect(measured.material).toBe(0)
    expect(outcome(state)).toBe('in_progress')
  })

  it('solution C — blocked under money: the residence is unaffordable after the road', () => {
    const state = run(
      [
        { type: 'placeRoads', cells: [{ x: 2, y: 1 }] },
        { type: 'placeBuilding', x: 4, y: 1, buildingType: 'residence' },
      ],
      20
    )
    const measured = read(state)
    audit('SOLUTION_C_JOIN_FIRST', measured)
    // Step001: the road IS built (networks merge to 1), but the drain
    // leaves ~22 against the 25 residence cost — the residence is REJECTED,
    // no second colonist arrives, and the objective stalls.
    expect(measured.networks).toBe(1)
    expect(measured.population).toBe(1)
    expect(measured.material).toBe(0)
    expect(outcome(state)).toBe('in_progress')
  })

  it('shows the decision is about networks, not about a single magic cell', () => {
    // Every serviced cell is equivalent APART from which workplaces it can
    // reach; the placement preview (10BA) reports exactly that before the
    // command, which is what makes the scenario readable rather than a guess.
    const start = createScenarioState(config, definition()!)
    const previews = [
      { cell: '2,1', label: 'touches both networks' },
      { cell: '4,1', label: 'serviced, east only' },
      { cell: '0,1', label: 'west only (unserved)' },
    ].map(({ cell, label }) => {
      const [x, y] = cell.split(',').map(Number)
      const preview = getPlacementSpatialPreview(start, { x: x ?? 0, y: y ?? 0 })
      return {
        cell,
        label,
        networks: preview.networkIds.length,
        waterCovered: preview.waterCovered,
        reachableWorkplaces: preview.reachableWorkplaces,
      }
    })
    audit('PLACEMENT_PREVIEWS', previews)
    expect(previews[0]).toMatchObject({ networks: 2, waterCovered: true, reachableWorkplaces: 2 })
    expect(previews[1]).toMatchObject({ networks: 1, waterCovered: true, reachableWorkplaces: 1 })
    expect(previews[2]).toMatchObject({ networks: 1, waterCovered: false, reachableWorkplaces: 1 })
  })
})

// ---------------------------------------------------------------------------
// 3. Failure and recovery
// ---------------------------------------------------------------------------

describe('3. failure and recovery', () => {
  it('a serviced but stranded Residence starves the colony, and the cause is visible', () => {
    const state = run(
      [{ type: 'placeBuilding', x: 4, y: 1, buildingType: 'residence' }],
      60
    )
    const measured = read(state)
    audit('FAILURE_SERVICED_BUT_STRANDED', measured)
    // The colonist IS admitted (the Residence is served) but cannot reach the
    // Farm, so Food production stays 0 while two colonists eat: the reserve
    // runs out and the colony is lost.
    expect(measured.population).toBe(0)
    expect(measured.foodPerTick).toBe(0)
    expect(measured.food).toBe(0)
    expect(outcome(state)).toBe('failed')
  })

  it('an unserved Residence blocks growth entirely', () => {
    const state = run(
      [{ type: 'placeBuilding', x: 0, y: 1, buildingType: 'residence' }],
      60
    )
    const measured = read(state)
    audit('FAILURE_UNSERVED', measured)
    // No colonist is admitted at all (the Water gate), and the single colonist
    // still produces no Food: the reserve drains.
    expect(measured.population).toBe(0)
    expect(measured.foodPerTick).toBe(0)
    expect(outcome(state)).toBe('failed')
  })

  it('the wrong placement stays unrecoverable under money (road rejected, objective open)', () => {
    const recovered = run(
      [
        { type: 'placeBuilding', x: 0, y: 1, buildingType: 'residence' },
        { type: 'placeRoads', cells: [{ x: 2, y: 1 }] },
      ],
      20
    )
    audit('RECOVERY_FROM_UNSERVED', read(recovered))
    // Step001: same drain as solution B — the joining road is rejected,
    // networks stay split, and the objective stays open. Recovery needs
    // funds the drained treasury cannot provide.
    expect(outcome(recovered)).toBe('in_progress')
    expect(read(recovered).networks).toBe(2)
  })

  it('the serviced-but-stranded mistake collapses the colony under money', () => {
    const afterMistake = run(
      [
        { type: 'placeBuilding', x: 4, y: 1, buildingType: 'residence' },
        { type: 'placeRoads', cells: [{ x: 2, y: 1 }] },
      ],
      20
    )
    audit('RECOVERY_FROM_STRANDED', read(afterMistake))
    // Step001: with no recovery funds and no staffed Farm, the colony
    // starves to zero — the mistake is terminal under money, not a detour.
    expect(outcome(afterMistake)).toBe('failed')
    expect(read(afterMistake).networks).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 4. Determinism, persistence and architecture
// ---------------------------------------------------------------------------

describe('4. determinism, persistence and architecture', () => {
  it('assembles and plays deterministically', () => {
    const scenario = definition()!
    const first = createScenarioState(config, scenario)
    const second = createScenarioState(config, scenario)
    const commands: readonly SimulationCommand[] = [
      { type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' },
    ]
    const play = (state: SimulationState): SimulationState => {
      let next = state
      for (const command of commands) next = stepSimulation(next, command)
      for (let index = 0; index < 10; index += 1) next = stepSimulation(next)
      return next
    }
    const rows = {
      sameAssembly: hashCanonicalState(first) === hashCanonicalState(second),
      samePlaythrough:
        hashCanonicalState(play(first)) === hashCanonicalState(play(second)),
      // Derived behaviour is invariant under a permuted ROAD list (ids are
      // allocated in authoring order, so the hash is not the axis here).
      derivedInvariantUnderRoadOrder: (() => {
        const permuted = createScenarioState(config, {
          ...scenario,
          roads: [...scenario.roads].reverse(),
        })
        return (
          getRoadNetworks(permuted).length === getRoadNetworks(first).length &&
          getWaterServedResidenceCount(permuted) === getWaterServedResidenceCount(first) &&
          getWaterProductionPerTick(permuted) === getWaterProductionPerTick(first) &&
          getObjectiveStatus(permuted, scenario.objective).state ===
            getObjectiveStatus(first, scenario.objective).state
        )
      })(),
    }
    audit('HOUSING_DETERMINISM', rows)
    expect(rows.sameAssembly).toBe(true)
    expect(rows.samePlaythrough).toBe(true)
    expect(rows.derivedInvariantUnderRoadOrder).toBe(true)
  })

  it('round-trips through persistence at SAVE_VERSION 8', () => {
    const state = run(
      [{ type: 'placeBuilding', x: 2, y: 1, buildingType: 'residence' }],
      6
    )
    const reloaded = loadSave(serializeSave(state))
    const rows = {
      equalHash: hashCanonicalState(reloaded) === hashCanonicalState(state),
      scenarioFramingNotPersisted: !serializeSave(state).includes(ID),
      saveVersion: JSON.parse(serializeSave(state)).version,
      networks: getRoadNetworks(reloaded).length,
      served: getWaterServedResidenceCount(reloaded),
    }
    audit('HOUSING_PERSISTENCE', rows)
    expect(rows.equalHash).toBe(true)
    expect(rows.scenarioFramingNotPersisted).toBe(true)
    expect(rows.saveVersion).toBe(10)
    expect(rows.networks).toBe(2)
  })

  it('adds no objective kind, no resource and no mechanic', () => {
    const scenario = definition()!
    const kinds = [
      ...new Set(
        SCENARIOS.flatMap((entry) =>
          entry.objective.requirements.map((requirement) => requirement.kind)
        )
      ),
    ].sort()
    const rows = {
      kinds,
      resources: scenario.resources,
      keys: Object.keys(scenario).sort(),
      catalogue: SCENARIOS.length,
      coverageAuthorityUnchanged: getWaterCoverage(
        createScenarioState(config, scenario)
      ).servedResidenceIds.length,
    }
    audit('HOUSING_ARCHITECTURE', rows)
    expect(kinds).toEqual([
      'building',
      'foodBalance',
      'population',
      'stage',
      'waterCapacity',
    ])
    expect(rows.keys).toEqual(['buildings', 'colonists', 'description', 'id', 'name', 'objective', 'resources', 'roads'])
    // Step 10CI added three Town-goal scenarios; kinds and shape unchanged.
    expect(rows.catalogue).toBe(11)
  })
})
