/**
 * Construction Crew (Step 10Y).
 *
 * Focused domain/application tests for the manual construction crew control:
 * one colonist may crew one under-construction site, adding exactly +1
 * construction progress per tick, and produces no workplace output meanwhile.
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createBuilding,
  createColonist,
  createRoads,
  FOOD_PER_FARM_PER_TICK,
  getBuildingInspection,
  getColonistInspection,
  getConstructionCrewId,
  getConstructionCrewOptions,
  hashCanonicalState,
  isConstructionSiteCrewed,
  loadSave,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  validateConstructionCrew,
  type BuildingType,
  type SimulationState,
} from '@/index'
import { createTestState } from './helpers.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

const idsOf = (state: SimulationState, type: BuildingType): string[] =>
  Object.values(state.buildings)
    .filter((b) => b.type === type)
    .map((b) => b.id)

const op = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10y: building missing')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const place = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): { state: SimulationState; id: string } => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10y: placed building missing')
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
  if (id === undefined) throw new Error('10y: no road')
  const road = created.state.roads[id]
  if (road === undefined) throw new Error('10y: road missing')
  return {
    ...created.state,
    roads: { ...created.state.roads, [id]: { ...road, status: 'operational', constructionRemaining: 0 } },
  }
}

/**
 * Row world: residences y=1, road row y=2, workplaces y=3. All buildings are
 * orthogonally adjacent to the road row, so every workplace is reachable.
 */
interface Spec {
  readonly residences: number
  readonly farms?: number
  readonly workshops?: number
  readonly underConstruction?: BuildingType
  readonly colonists?: number
  readonly material?: number
  readonly food?: number
}

const world = (spec: Spec): SimulationState => {
  let state = withStocks(createTestState(), {
    food: spec.food ?? 500,
    material: spec.material ?? 500,
  })
  const farms = spec.farms ?? 0
  const workshops = spec.workshops ?? 0
  const columns = Math.max(spec.residences, farms + workshops + 1)
  for (let i = 0; i < spec.residences; i += 1) state = op(state, 'residence', 1 + i * 2, 1)
  for (let i = 0; i < farms; i += 1) state = op(state, 'farm', 1 + i * 2, 3)
  for (let i = 0; i < workshops; i += 1) state = op(state, 'workshop', 1 + (farms + i) * 2, 3)
  for (let x = 1; x <= 2 * columns; x += 1) state = opRoad(state, x, 2)
  if (spec.underConstruction !== undefined) {
    state = place(state, spec.underConstruction, 1 + (farms + workshops) * 2, 5).state
  }
  const residenceIds = idsOf(state, 'residence')
  for (let i = 0; i < Math.min(spec.colonists ?? 0, residenceIds.length); i += 1) {
    state = createColonist(state, residenceIds[i]!).state
  }
  return assignJobs(state)
}

const crew = (state: SimulationState, colonistId: string, buildingId: string): SimulationState =>
  applyCommand(state, { type: 'assignConstructionCrew', colonistId, buildingId }).state

const release = (state: SimulationState, colonistId: string): SimulationState =>
  applyCommand(state, {
    type: 'assignConstructionCrew',
    colonistId,
    buildingId: null,
  }).state

/** Number of stepSimulation calls until the building is operational (-1 if never). */
const ticksToOperational = (state: SimulationState, buildingId: string): number => {
  let next = state
  for (let i = 1; i <= 12; i += 1) {
    next = stepSimulation(next)
    const building = next.buildings[buildingId]
    if (building !== undefined && building.status === 'operational') return i
  }
  return -1
}

// ---------------------------------------------------------------------------
// 1. Assignment validation
// ---------------------------------------------------------------------------

describe('1 — assignment validation', () => {
  it('accepts a valid crew assignment and transfers the colonist off the workplace', () => {
    const state = crewWorldWithSite()
    const wellId = idsOf(state, 'well')[0]!
    expect(state.colonists['colonist-1']!.workplaceId).toBe(idsOf(state, 'farm')[0])

    const validation = validateConstructionCrew(state, 'colonist-1', wellId)
    expect(validation.valid).toBe(true)

    const assigned = crew(state, 'colonist-1', wellId)
    const colonist = assigned.colonists['colonist-1']!
    expect(colonist.constructionAssignmentId).toBe(wellId)
    expect(colonist.workplaceId).toBeNull()
    expect(colonist.workplaceAssignmentMode).toBe('automatic')
    expect(countStaffedOperationalFarms(assigned)).toBe(0)
    expect(getConstructionCrewId(assigned, wellId)).toBe('colonist-1')
    expect(isConstructionSiteCrewed(assigned, wellId)).toBe(true)
  })

  it('rejects an unknown colonist', () => {
    const state = crewWorldWithSite()
    const wellId = idsOf(state, 'well')[0]!
    expect(validateConstructionCrew(state, 'colonist-999', wellId)).toEqual({
      valid: false,
      reason: 'unknownColonist',
    })
  })

  it('rejects an unknown building and a road id', () => {
    const state = crewWorldWithSite()
    expect(validateConstructionCrew(state, 'colonist-1', 'building-999')).toEqual({
      valid: false,
      reason: 'unknownBuilding',
    })
    // Roads are not buildings, so a road id is an unknown building (10Y §13).
    const roadId = Object.keys(state.roads)[0]!
    expect(validateConstructionCrew(state, 'colonist-1', roadId)).toEqual({
      valid: false,
      reason: 'unknownBuilding',
    })
  })

  it('rejects an operational building', () => {
    const state = crewWorldWithSite()
    const farmId = idsOf(state, 'farm')[0]!
    expect(validateConstructionCrew(state, 'colonist-1', farmId)).toEqual({
      valid: false,
      reason: 'notUnderConstruction',
    })
  })

  it('rejects an already-crewed site and a colonist already crewing elsewhere', () => {
    let state = crewWorldWithSite()
    const wellId = idsOf(state, 'well')[0]!
    const residenceId = idsOf(state, 'residence')[1]!
    state = createColonist(state, residenceId).state
    state = assignJobs(state)
    state = crew(state, 'colonist-1', wellId)

    // Second colonist cannot take the crewed site.
    expect(validateConstructionCrew(state, 'colonist-2', wellId)).toEqual({
      valid: false,
      reason: 'siteAlreadyCrewed',
    })
    // The crewed colonist cannot take a second site.
    const second = place(state, 'well', 7, 5)
    expect(validateConstructionCrew(second.state, 'colonist-1', second.id)).toEqual({
      valid: false,
      reason: 'alreadyAssignedToConstruction',
    })
  })

  it('treats a repeated identical assignment as an accepted no-op', () => {
    const state = crewWorldWithSite()
    const wellId = idsOf(state, 'well')[0]!
    const assigned = crew(state, 'colonist-1', wellId)
    const result = applyCommand(assigned, {
      type: 'assignConstructionCrew',
      colonistId: 'colonist-1',
      buildingId: wellId,
    })
    expect(result.accepted).toBe(true)
    expect(result.state).toBe(assigned)
  })

  it('releases a crew and rejects a release for an unknown colonist', () => {
    const state = crewWorldWithSite()
    const wellId = idsOf(state, 'well')[0]!
    const assigned = crew(state, 'colonist-1', wellId)
    const freed = release(assigned, 'colonist-1')
    expect(freed.colonists['colonist-1']!.constructionAssignmentId).toBeNull()
    // `assignJobs` may employ the released colonist again on the next pass.
    const restaffed = assignJobs(freed)
    expect(restaffed.colonists['colonist-1']!.workplaceId).not.toBeNull()

    expect(
      applyCommand(assigned, {
        type: 'assignConstructionCrew',
        colonistId: 'colonist-999',
        buildingId: null,
      }).accepted
    ).toBe(false)
    // Releasing a non-crewing colonist is an accepted no-op.
    const noOp = applyCommand(state, {
      type: 'assignConstructionCrew',
      colonistId: 'colonist-1',
      buildingId: null,
    })
    expect(noOp.accepted).toBe(true)
    expect(noOp.state).toBe(state)
  })
})

/** Two residences, a farm, a workshop and an under-construction Well; 2 colonists. */
const crewWorldWithSite = (): SimulationState =>
  world({ residences: 2, farms: 1, workshops: 1, underConstruction: 'well', colonists: 2 })

// ---------------------------------------------------------------------------
// 2. Construction throughput
// ---------------------------------------------------------------------------

describe('2 — construction throughput', () => {
  it('an uncrewed 2-tick building takes 2 ticks; a crewed one takes 1', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    expect(ticksToOperational(base, wellId)).toBe(2)

    const crewed = crew(base, 'colonist-1', wellId)
    expect(ticksToOperational(crewed, wellId)).toBe(1)
  })

  it('reports derived progress per tick in the inspection', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    expect(getBuildingInspection(base, wellId)).toMatchObject({
      constructionCrewId: null,
      constructionProgressPerTick: 1,
    })
    const crewed = crew(base, 'colonist-1', wellId)
    expect(getBuildingInspection(crewed, wellId)).toMatchObject({
      constructionCrewId: 'colonist-1',
      constructionProgressPerTick: 2,
    })
  })

  it('supports two sites crewed by two colonists independently', () => {
    let state = world({ residences: 2, colonists: 2 })
    const first = place(state, 'well', 1, 5)
    state = first.state
    const second = place(state, 'farm', 3, 5)
    state = second.state
    state = crew(state, 'colonist-1', first.id)
    state = crew(state, 'colonist-2', second.id)
    expect(getConstructionCrewId(state, first.id)).toBe('colonist-1')
    expect(getConstructionCrewId(state, second.id)).toBe('colonist-2')

    let next = state
    for (let i = 0; i < 1; i += 1) next = stepSimulation(next)
    expect(next.buildings[first.id]!.status).toBe('operational')
    expect(next.buildings[second.id]!.status).toBe('operational')
  })

  it('lists crew options and rejects the current crew through the query', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const before = getConstructionCrewOptions(base, wellId)
    expect(before.map((o) => o.colonistId)).toEqual(['colonist-1', 'colonist-2'])
    expect(before.every((o) => o.eligible)).toBe(true)

    const crewed = crew(base, 'colonist-1', wellId)
    const after = getConstructionCrewOptions(crewed, wellId)
    const current = after.find((o) => o.colonistId === 'colonist-1')!
    const other = after.find((o) => o.colonistId === 'colonist-2')!
    expect(current.isCurrent).toBe(true)
    expect(current.eligible).toBe(false)
    expect(other.eligible).toBe(false)
    expect(other.reason).toBe('siteAlreadyCrewed')
    // An operational building has no crew options.
    const operational = idsOf(base, 'farm')[0]!
    expect(getConstructionCrewOptions(base, operational)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. Production interaction
// ---------------------------------------------------------------------------

describe('3 — production interaction', () => {
  it('stops Farm output while the farmer crews, and resumes after completion', () => {
    const base = world({ residences: 2, farms: 1, workshops: 1, underConstruction: 'well', colonists: 2 })
    const wellId = idsOf(base, 'well')[0]!
    const farmerId = Object.values(base.colonists).find(
      (c) => c.workplaceId === idsOf(base, 'farm')[0]
    )!.id

    const assigned = crew(base, farmerId, wellId)
    expect(countStaffedOperationalFarms(assigned)).toBe(0)
    expect(countStaffedOperationalWorkshops(assigned)).toBe(1)

    // One tick: the crew completes the Well and the colonist is released.
    const afterCrewTick = stepSimulation(assigned)
    expect(afterCrewTick.buildings[wellId]!.status).toBe('operational')
    expect(afterCrewTick.colonists[farmerId]!.constructionAssignmentId).toBeNull()
    expect(getConstructionCrewId(afterCrewTick, wellId)).toBeNull()

    // The next tick `assignJobs` may re-employ the released colonist.
    const afterRelease = stepSimulation(afterCrewTick)
    expect(afterRelease.colonists[farmerId]!.workplaceId).not.toBeNull()
  })

  it('stops Workshop output while the worker crews', () => {
    const base = world({ residences: 2, farms: 1, workshops: 1, underConstruction: 'well', colonists: 2 })
    const wellId = idsOf(base, 'well')[0]!
    const workshopId = idsOf(base, 'workshop')[0]!
    const workerId = Object.values(base.colonists).find(
      (c) => c.workplaceId === workshopId
    )!.id

    const assigned = crew(base, workerId, wellId)
    expect(countStaffedOperationalWorkshops(assigned)).toBe(0)
    // The crew completes the Well, but the worker is released only at the end
    // of the tick: production ran with the Workshop vacant (no double credit).
    const afterTick = stepSimulation(assigned)
    expect(afterTick.buildings[wellId]!.status).toBe('operational')
    expect(afterTick.colonists[workerId]!.constructionAssignmentId).toBeNull()
    // From the next tick on, normal employment resumes.
    const nextTick = stepSimulation(afterTick)
    expect(countWorkersAt(nextTick, workshopId)).toBe(1)
  })

  it('never pays a colonist construction credit and production output in the same tick', () => {
    // One colonist, one Workshop, one under-construction Well. The colonist is
    // the only producer, so crewing leaves the Workshop vacant for the tick.
    const base = world({
      residences: 1,
      workshops: 1,
      underConstruction: 'well',
      colonists: 1,
      material: 10,
    })
    const wellId = idsOf(base, 'well')[0]!
    // Control: without a crew the Workshop produces 2 and pays 1 upkeep.
    const control = stepSimulation(base)
    expect(control.resources.construction).toBe(11)

    const assigned = crew(base, 'colonist-1', wellId)
    const afterTick = stepSimulation(assigned)
    // The colonist was crewing for the whole tick: even though the Well
    // completed, no production phase paid them and no upkeep was charged.
    expect(afterTick.buildings[wellId]!.status).toBe('operational')
    expect(afterTick.resources.construction).toBe(10)
    expect(countWorkersAt(afterTick, idsOf(base, 'workshop')[0]!)).toBe(0)
    // The release happens at the end of that tick, so the next tick produces.
    expect(afterTick.colonists['colonist-1']!.constructionAssignmentId).toBeNull()
    const nextTick = stepSimulation(afterTick)
    expect(nextTick.resources.construction).toBe(11)
  })

  it('stops Well output while the well worker crews another site', () => {
    let state = world({ residences: 2, farms: 1, colonists: 2 })
    state = op(state, 'well', 3, 3)
    state = assignJobs(state)
    const wellId = idsOf(state, 'well')[0]!
    const wellWorkerId = Object.values(state.colonists).find(
      (c) => c.workplaceId === wellId
    )!.id
    const site = place(state, 'farm', 7, 5)
    state = site.state

    const assigned = crew(state, wellWorkerId, site.id)
    expect(countWorkersAt(assigned, wellId)).toBe(0)
    const before = assigned.resources.water
    const afterTick = stepSimulation(assigned)
    expect(afterTick.resources.water).toBe(before)
  })

  it('never lets assignJobs reclaim a crewed colonist', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    let state = assigned
    for (let i = 0; i < 5; i += 1) {
      state = assignJobs(state)
      expect(state.colonists['colonist-1']!.constructionAssignmentId).toBe(wellId)
      expect(state.colonists['colonist-1']!.workplaceId).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Economy — cost and resources are unchanged
// ---------------------------------------------------------------------------

describe('4 — economy', () => {
  it('does not change construction cost or create resources', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    // Construction cost is unchanged by crewing.
    const costState = world({ residences: 1, colonists: 1, material: 100 })
    const before = costState.resources.construction
    const placed = applyCommand(costState, {
      type: 'placeBuilding',
      x: 1,
      y: 3,
      buildingType: 'residence',
    })
    expect(before - placed.state.resources.construction).toBe(25)

    // A crew tick neither creates nor destroys Food/Water except through the
    // unchanged consumption rules; the crew itself adds nothing.
    const crewed = crew(base, 'colonist-1', wellId)
    const crewTick = stepSimulation(crewed)
    const control = stepSimulation(base)
    // The crew creates nothing: the only difference is the Farm output that
    // the crewing farmer did not produce (FOOD_PER_FARM_PER_TICK).
    expect(control.resources.food - crewTick.resources.food).toBe(FOOD_PER_FARM_PER_TICK)
    expect(crewTick.resources.water).toBe(control.resources.water)
  })
})

// ---------------------------------------------------------------------------
// 5. Persistence, migration, hash
// ---------------------------------------------------------------------------

describe('5 — persistence and hash', () => {
  it('SAVE_VERSION is 8 and an active crew round-trips', () => {
    expect(SAVE_VERSION).toBe(8)
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    const restored = loadSave(serializeSave(assigned))
    expect(restored.colonists['colonist-1']!.constructionAssignmentId).toBe(wellId)
    expect(serializeCanonicalState(restored)).toBe(serializeCanonicalState(assigned))
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(assigned))
  })

  it('migrates a v6 save by stamping constructionAssignmentId null', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    const parsed = JSON.parse(serializeSave(assigned)) as {
      version: number
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    parsed.version = 6
    for (const colonist of Object.values(parsed.state.colonists)) {
      delete colonist['constructionAssignmentId']
    }
    const restored = loadSave(JSON.stringify(parsed))
    for (const colonist of Object.values(restored.colonists)) {
      expect(colonist.constructionAssignmentId).toBeNull()
    }
    // Historical crews are never inferred.
    expect(getConstructionCrewId(restored, wellId)).toBeNull()
  })

  it('chains v5 -> v6 -> v7', () => {
    const base = crewWorldWithSite()
    const parsed = JSON.parse(serializeSave(base)) as {
      version: number
      state: {
        colonists: Record<string, Record<string, unknown>>
        resources: Record<string, unknown>
        roads?: Record<string, unknown>
      }
    }
    parsed.version = 5
    for (const colonist of Object.values(parsed.state.colonists)) {
      delete colonist['constructionAssignmentId']
    }
    delete parsed.state.resources['water']
    const restored = loadSave(JSON.stringify(parsed))
    expect(restored.resources.water).toBe(0)
    for (const colonist of Object.values(restored.colonists)) {
      expect(colonist.constructionAssignmentId).toBeNull()
    }
  })

  it('rejects a malformed construction assignment', () => {
    const base = crewWorldWithSite()
    const parsed = JSON.parse(serializeSave(base)) as {
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    const first = Object.keys(parsed.state.colonists)[0]!
    parsed.state.colonists[first]!['constructionAssignmentId'] = 42
    expect(() => loadSave(JSON.stringify(parsed))).toThrow()
  })

  it('includes the assignment in the canonical hash', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    expect(hashCanonicalState(assigned)).not.toBe(hashCanonicalState(base))
    expect(serializeCanonicalState(assigned)).toContain('constructionAssignmentId')
  })

  it('is insertion-order independent with an active crew', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    const reversed: SimulationState = {
      ...assigned,
      colonists: Object.fromEntries(Object.entries(assigned.colonists).reverse()),
      buildings: Object.fromEntries(Object.entries(assigned.buildings).reverse()),
      roads: Object.fromEntries(Object.entries(assigned.roads).reverse()),
    }
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(assigned))
  })
})

// ---------------------------------------------------------------------------
// 6. Determinism
// ---------------------------------------------------------------------------

describe('6 — determinism', () => {
  it('replays the crew command deterministically', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const command = {
      type: 'assignConstructionCrew' as const,
      colonistId: 'colonist-1',
      buildingId: wellId,
    }
    const run = (): SimulationState => {
      let state = base
      state = stepSimulation(state, command)
      for (let i = 0; i < 4; i += 1) state = stepSimulation(state)
      return state
    }
    const a = run()
    const b = run()
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
  })

  it('takes effect on the tick the command is issued (one tick earlier)', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const command = {
      type: 'assignConstructionCrew' as const,
      colonistId: 'colonist-1',
      buildingId: wellId,
    }
    // Without a crew: two construction ticks.
    const uncrewed = stepSimulation(base)
    expect(uncrewed.buildings[wellId]!.status).toBe('underConstruction')
    expect(stepSimulation(uncrewed).buildings[wellId]!.status).toBe('operational')
    // With a crew assigned on this tick: the site completes on THIS tick, the
    // crew member produces nothing, and the assignment is released at the end.
    const crewed = stepSimulation(base, command)
    expect(crewed.buildings[wellId]!.status).toBe('operational')
    expect(crewed.colonists['colonist-1']!.constructionAssignmentId).toBeNull()
    expect(getConstructionCrewId(crewed, wellId)).toBeNull()
    expect(countStaffedOperationalFarms(crewed)).toBe(0)
  })

  it('reports the crew through the colonist inspection', () => {
    const base = crewWorldWithSite()
    const wellId = idsOf(base, 'well')[0]!
    const assigned = crew(base, 'colonist-1', wellId)
    expect(getColonistInspection(assigned, 'colonist-1')).toEqual({
      id: 'colonist-1',
      residenceId: idsOf(base, 'residence')[0],
      workplaceId: null,
      workplaceAssignmentMode: 'automatic',
      constructionAssignmentId: wellId,
    })
  })
})
