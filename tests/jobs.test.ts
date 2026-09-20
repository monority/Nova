import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  BUILDING_CATALOG,
  countEmployedWorkers,
  countWorkersAt,
  getEmploymentSummary,
  getFoodConsumptionPerTick,
  getFoodTicksRemaining,
  getJobCapacity,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getNetMaterialPerTick,
  getResourceStock,
  hashCanonicalState,
  isEmployed,
  isFoodSupplySustainable,
  isOperationalWorkshop,
  jobCapacityOf,
  loadSave,
  MATERIAL_PER_WORKER_PER_TICK,
  materialProductionForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  type PlaceBuildingCommand,
  produceMaterial,
  SAVE_VERSION,
  SaveValidationError,
  serializeSave,
  stepSimulation,
  type SimulationState,
  toRenderSnapshot,
  WORKSHOP_JOB_CAPACITY,
} from '@/index'
import { createTestState, withRoadsForWorkshops } from './helpers.js'

const place = (
  buildingType: PlaceBuildingCommand['buildingType'],
  x: number,
  y: number
): PlaceBuildingCommand => ({ type: 'placeBuilding', x, y, buildingType })

const withFood = (state: SimulationState, food: number): SimulationState => ({
  ...state,
  resources: { ...state.resources, food },
})

const withConstruction = (
  state: SimulationState,
  construction: number
): SimulationState => ({
  ...state,
  resources: { ...state.resources, construction },
})

const colonistOf = (state: SimulationState, id: string) => {
  const colonist = state.colonists[id]
  if (colonist === undefined) {
    throw new Error(`test helper: missing colonist ${id}`)
  }
  return colonist
}

/** Force a workplace reference to build invalid/duplicate scenarios. */
const withWorkplace = (
  state: SimulationState,
  colonistId: string,
  workplaceId: string | null
): SimulationState => ({
  ...state,
  colonists: {
    ...state.colonists,
    [colonistId]: { ...colonistOf(state, colonistId), workplaceId },
  },
})

/** Tick 2: one operational residence + one unemployed colonist. */
const colonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2))
  state = stepSimulation(state)
  return state
}

/** Tick 4: operational residence + colonist employed in `building-2`. */
const workshopState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: residence operational, colonist-1
  state = stepSimulation(state, place('workshop', 4, 4)) // t3
  state = withRoadsForWorkshops(state) // 09F: road for production
  state = stepSimulation(state) // t4: workshop operational, employed, net +1
  return state
}

/** Tick 4: two operational residences + two unemployed colonists. */
const twoColonistState = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(state, place('residence', 4, 4)) // t3
  state = stepSimulation(state) // t4: colonist-2
  return state
}

/** Tick 6: two colonists, two operational Workshops (building-2, building-3). */
const twoWorkshopState = (): SimulationState => {
  let state = colonistState() // t2
  state = stepSimulation(state, place('workshop', 6, 6)) // t3: building-2
  state = withRoadsForWorkshops(state) // 09F: road for WS1
  state = stepSimulation(state) // t4: building-2 operational, colonist-1 employed
  state = stepSimulation(state, place('workshop', 7, 7)) // t5: building-3
  state = withRoadsForWorkshops(state) // 09F: road for WS2
  state = stepSimulation(state) // t6: building-3 operational
  return state
}

describe('workshop building (Step 07C §3)', () => {
  it('defines the minimal workplace contract in the catalog', () => {
    expect(BUILDING_CATALOG.workshop).toEqual({
      constructionTicks: 2,
      housingCapacity: 0,
      constructionCost: 25,
    })
    expect(WORKSHOP_JOB_CAPACITY).toBe(1)
    expect(MATERIAL_PER_WORKER_PER_TICK).toBe(2)
  })

  it('exposes job capacity for operational Farms and Workshops (Step 10E)', () => {
    expect(jobCapacityOf({ type: 'workshop', status: 'operational' })).toBe(1)
    expect(jobCapacityOf({ type: 'workshop', status: 'underConstruction' })).toBe(0)
    expect(jobCapacityOf({ type: 'farm', status: 'operational' })).toBe(1)
    expect(jobCapacityOf({ type: 'farm', status: 'underConstruction' })).toBe(0)
    expect(jobCapacityOf({ type: 'residence', status: 'operational' })).toBe(0)
    expect(isOperationalWorkshop({ type: 'workshop', status: 'underConstruction' })).toBe(false)
  })

  it('uses the existing construction lifecycle and deducts the catalog cost', () => {
    const state = stepSimulation(createTestState(), place('workshop', 1, 1))
    expect(getResourceStock(state).construction).toBe(75)
    const workshop = state.buildings['building-1']
    expect(workshop?.type).toBe('workshop')
    expect(workshop?.status).toBe('underConstruction')
    expect(workshop?.constructionRemaining).toBe(1)
    expect(state.time.tick).toBe(1)
  })

  it('becomes operational after the catalog construction duration', () => {
    let state = stepSimulation(createTestState(), place('workshop', 1, 1))
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(state.buildings['building-1']?.constructionRemaining).toBe(0)
    expect(getJobCapacity(state)).toBe(1)
  })

  it('never provides housing and never admits a colonist by itself', () => {
    let state = stepSimulation(createTestState(), place('workshop', 1, 1))
    state = stepSimulation(state)
    expect(state.buildings['building-1']?.status).toBe('operational')
    expect(Object.keys(state.colonists)).toHaveLength(0)
    expect(getJobCapacity(state)).toBe(1)
    expect(countEmployedWorkers(state)).toBe(0)
  })
})

describe('deterministic job assignment (Step 07C §4)', () => {
  it('does nothing without colonists', () => {
    const empty = createTestState()
    expect(assignJobs(empty)).toBe(empty)

    let state = stepSimulation(empty, place('workshop', 1, 1))
    state = stepSimulation(state)
    expect(getJobCapacity(state)).toBe(1)
    expect(assignJobs(state)).toBe(state)
    expect(Object.keys(assignJobs(state).colonists)).toHaveLength(0)
  })

  it('leaves every colonist unemployed while no workshop exists', () => {
    const state = colonistState()
    expect(assignJobs(state)).toBe(state)
    expect(getEmploymentSummary(state)).toEqual({
      population: 1,
      employed: 0,
      unemployed: 1,
      jobCapacity: 0,
      vacantJobs: 0,
    })
  })

  it('a non-operational workshop cannot employ', () => {
    let state = stepSimulation(colonistState(), place('workshop', 6, 6))
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    state = assignJobs(state)
    expect(getJobCapacity(state)).toBe(0)
    expect(state.colonists['colonist-1']?.workplaceId).toBeNull()
    expect(assignJobs(state)).toBe(state)
  })

  it('one colonist / one workshop: employed at that workshop', () => {
    const state = workshopState()
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(getEmploymentSummary(state)).toEqual({
      population: 1,
      employed: 1,
      unemployed: 0,
      jobCapacity: 1,
      vacantJobs: 0,
    })
    expect(countWorkersAt(state, 'building-2')).toBe(1)
    expect(isEmployed(state, colonistOf(state, 'colonist-1'))).toBe(true)
  })

  it('multiple colonists / one workshop: lowest colonist id wins', () => {
    let state = stepSimulation(twoColonistState(), place('workshop', 6, 6))
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state)
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-3')
    expect(state.colonists['colonist-2']?.workplaceId).toBeNull()
    expect(getEmploymentSummary(state)).toEqual({
      population: 2,
      employed: 1,
      unemployed: 1,
      jobCapacity: 1,
      vacantJobs: 0,
    })
  })

  it('one colonist / multiple workshops: ascending workshop id order', () => {
    const state = twoWorkshopState()
    expect(getJobCapacity(state)).toBe(2)
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(getEmploymentSummary(state).vacantJobs).toBe(1)
  })

  it('multiple colonists / multiple workshops: deterministic nearest-Workshop preference (09M)', () => {
    // Step 08F: storage clamp changes material flow, not assignment. Top up
    // the stock so this ordering test funds both placements deterministically.
    let state = withConstruction(twoColonistState(), 100) // t4
    state = stepSimulation(state, place('workshop', 6, 6)) // t5: building-3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // t6: colonist-1 -> building-3
    state = withConstruction(state, 100)
    state = stepSimulation(state, place('workshop', 0, 0)) // t7: building-4
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // t8: nearest-Workshop preference
    // Step 09M: among eligible Workshops the NEAREST road distance wins.
    // Residence (2,2) is 4 road steps from building-4 (0,0) and 6 from
    // building-3 (6,6), so colonist-1 takes building-4; residence (4,4) is
    // then 2 steps from building-3, so colonist-2 takes it. Deterministic.
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-4')
    expect(state.colonists['colonist-2']?.workplaceId).toBe('building-3')
    expect(getEmploymentSummary(state)).toEqual({
      population: 2,
      employed: 2,
      unemployed: 0,
      jobCapacity: 2,
      vacantJobs: 0,
    })
  })

  it('preserves an existing assignment while it remains the nearest Workshop (09M)', () => {
    // The natural state already sits in the nearest Workshop: re-running
    // assignJobs must be a no-op reference-for-reference (no churn).
    const natural = twoWorkshopState()
    expect(natural.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(assignJobs(natural)).toBe(natural)

    // An assignment forced to the farther Workshop does NOT survive: the 09M
    // spatial preference re-applies against the current network each tick.
    const forced = withWorkplace(natural, 'colonist-1', 'building-3')
    const after = assignJobs(forced)
    expect(after).not.toBe(forced)
    expect(after.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(countWorkersAt(after, 'building-3')).toBe(0)
  })

  it('clears a reference to a missing building', () => {
    const state = withWorkplace(colonistState(), 'colonist-1', 'building-99')
    const after = assignJobs(state)
    expect(after.colonists['colonist-1']?.workplaceId).toBeNull()
    expect(after).not.toBe(state)
  })

  it('clears a reference to a non-workshop building', () => {
    const residence = withWorkplace(colonistState(), 'colonist-1', 'building-1')
    expect(assignJobs(residence).colonists['colonist-1']?.workplaceId).toBeNull()

    let farmState = stepSimulation(colonistState(), place('farm', 6, 6))
    farmState = stepSimulation(farmState)
    expect(farmState.buildings['building-2']?.status).toBe('operational')
    const farm = withWorkplace(farmState, 'colonist-1', 'building-2')
    expect(assignJobs(farm).colonists['colonist-1']?.workplaceId).toBeNull()
  })

  it('never lets one workshop hold more than one worker', () => {
    let state = stepSimulation(twoColonistState(), place('workshop', 6, 6))
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    state = stepSimulation(state) // colonist-1 -> building-3
    const forced = withWorkplace(state, 'colonist-2', 'building-3')
    const after = assignJobs(forced)
    expect(after.colonists['colonist-1']?.workplaceId).toBe('building-3')
    expect(after.colonists['colonist-2']?.workplaceId).toBeNull()
    expect(countWorkersAt(after, 'building-3')).toBe(1)
  })

  it('holds the documented employment invariants', () => {
    const states = [
      colonistState(),
      workshopState(),
      twoWorkshopState(),
      withWorkplace(colonistState(), 'colonist-1', 'building-99'),
    ]
    for (const state of states) {
      const summary = getEmploymentSummary(state)
      expect(summary.employed).toBeLessThanOrEqual(summary.population)
      expect(summary.employed).toBeLessThanOrEqual(summary.jobCapacity)
      expect(summary.vacantJobs).toBeGreaterThanOrEqual(0)
      expect(Object.keys(assignJobs(state).colonists)).toHaveLength(summary.population)
    }
  })
})

describe('construction material production (Step 07C §6-§8)', () => {
  it('produces nothing with zero workers', () => {
    const state = colonistState()
    expect(materialProductionForTick(state)).toBe(0)
    expect(getMaterialProductionPerTick(state)).toBe(0)
    expect(produceMaterial(state)).toBe(state)
  })

  it('an operational workshop with no worker produces nothing', () => {
    let state = stepSimulation(createTestState(), place('workshop', 1, 1))
    state = stepSimulation(state)
    expect(getJobCapacity(state)).toBe(1)
    expect(materialProductionForTick(state)).toBe(0)
    expect(produceMaterial(state)).toBe(state)
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(75)
  })

  it('one worker produces gross +2, stored subject to workshop storage', () => {
    const state = workshopState()
    // Gross production is still 2/worker; upkeep due is still 1.
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialUpkeepDueForTick(state)).toBe(1)
    expect(getNetMaterialPerTick(state)).toBe(1)
    // Step 08F: workshopState carries bootstrap stock (49) above the
    // single-workshop capacity (25), so nothing is stored this tick and
    // only upkeep drains the stock.
    const before = getResourceStock(state).construction
    expect(materialStoredProductionForTick(state)).toBe(0)
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(before - 1)
    expect(getResourceStock(after).food).toBe(getResourceStock(state).food - 1)
    // Below capacity the full gross inflow is stored: 0 + 2 − 1 = 1.
    const empty = withConstruction(state, 0)
    expect(materialStoredProductionForTick(empty)).toBe(2)
    const recovered = stepSimulation(empty)
    expect(getResourceStock(recovered).construction).toBe(1)
  })

  it('multiple workers add linearly', () => {
    let state = twoWorkshopState() // 1 colonist, 2 workshops
    state = stepSimulation(state, place('residence', 0, 0)) // t7
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    state = stepSimulation(state) // t8: second colonist admitted and employed
    expect(getEmploymentSummary(state).employed).toBe(2)
    expect(materialProductionForTick(state)).toBe(4)
    // Step 08C: two staffed Workshops pay 2 upkeep, net +2.
    expect(materialUpkeepDueForTick(state)).toBe(2)
    expect(getNetMaterialPerTick(state)).toBe(2)
    const before = getResourceStock(state).construction
    const after = stepSimulation(state)
    expect(getResourceStock(after).construction).toBe(before + 2)
  })

  it('a newly operational workshop is staffed and produces the same tick', () => {
    let state = stepSimulation(colonistState(), place('workshop', 6, 6)) // t3
    state = withRoadsForWorkshops(state) // 09K: mobility connection
    const before = getResourceStock(state).construction
    expect(state.buildings['building-2']?.status).toBe('underConstruction')
    state = stepSimulation(state) // t4: operational this tick
    expect(state.buildings['building-2']?.status).toBe('operational')
    expect(state.colonists['colonist-1']?.workplaceId).toBe('building-2')
    // Step 08C: same-tick production (+2) pays same-tick upkeep (−1).
    // Step 08F: the bootstrap stock (50) already covers the new 25
    // capacity, so stored production is 0 and only upkeep drains it.
    expect(materialStoredProductionForTick(state)).toBe(0)
    expect(getResourceStock(state).construction).toBe(before - 1)
  })

  it('a newly admitted colonist is employed and produces the same tick', () => {
    let state = colonistState() // t2: colonist-1
    state = stepSimulation(state, place('workshop', 4, 4)) // t3
    state = withRoadsForWorkshops(state) // 09F: road for production
    state = stepSimulation(state, place('workshop', 6, 6)) // t4: W2 op, net +1
    state = withRoadsForWorkshops(state) // 09F: road for W2
    state = stepSimulation(state) // t5: W3 op, net +1
    state = stepSimulation(state, place('residence', 7, 7)) // t6
    state = withRoadsForWorkshops(state) // 09K: connect the new residence
    const beforeAdmission = getResourceStock(state).construction
    expect(Object.keys(state.colonists)).toHaveLength(1)
    state = stepSimulation(state) // t7: colonist-2 admitted this tick
    expect(Object.keys(state.colonists)).toHaveLength(2)
    expect(state.colonists['colonist-2']?.workplaceId).toBe('building-3')
    // Step 08C: two staffed Workshops produce +4 and pay 2 upkeep (net +2).
    expect(getResourceStock(state).construction).toBe(beforeAdmission + 2)
  })

  it('starvation removes the worker before production: no death-tick material', () => {
    const state = withFood(workshopState(), 0)
    const materialBefore = getResourceStock(state).construction
    expect(getEmploymentSummary(state).employed).toBe(1)
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(getResourceStock(after).food).toBe(0)
    expect(getEmploymentSummary(after).employed).toBe(0)
    expect(getMaterialProductionPerTick(after)).toBe(0)
    expect(getResourceStock(after).construction).toBe(materialBefore)
  })

  it('food shortage never generates workers by itself', () => {
    let state = stepSimulation(createTestState(), place('workshop', 1, 1))
    state = stepSimulation(state)
    state = withFood(state, 0)
    const after = stepSimulation(state)
    expect(Object.keys(after.colonists)).toHaveLength(0)
    expect(getResourceStock(after).construction).toBe(75)
    expect(materialProductionForTick(after)).toBe(0)
  })

  it('material production is bounded by operational workshop storage', () => {
    let state = workshopState()
    const start = getResourceStock(state).construction
    expect(start).toBe(49)
    // Step 08F: one operational Workshop stores 25. The over-capacity
    // bootstrap stock drains by upkeep only until the 24 equilibrium, and
    // never grows while above capacity.
    for (let i = 0; i < 60; i++) {
      state = stepSimulation(state)
      expect(getResourceStock(state).construction).toBeLessThanOrEqual(start)
    }
    expect(getResourceStock(state).construction).toBe(24)
    expect(getMaterialStorageCapacity(state)).toBe(25)
    expect(getResourceStock(state).food).toBeGreaterThan(0)
    expect(Object.keys(state.colonists)).toHaveLength(1)
  })
})

describe('jobs integration: housing -> colonist -> workshop -> employment -> material -> construction', () => {
  it('labor-generated material enables further construction with an exact deduction', () => {
    // Step 08F: workshopState carries bootstrap stock 49 above the single-
    // workshop capacity (25). Spending drops it into the storable range,
    // where worker output refills it; the second Workshop raises capacity.
    // Step 08G: the construction transaction runs AFTER production and
    // BEFORE upkeep, so a placement tick stores first, then deducts 25,
    // then pays upkeep on the remainder.
    let state = workshopState() // t4: 1 worker, material 49 (50 + 0 stored − 1)
    state = stepSimulation(state, place('workshop', 6, 6)) // t5: 49 + 0 stored − 25 − 1 upkeep → 23
    expect(getResourceStock(state).construction).toBe(23)
    state = stepSimulation(state) // t6: building-3 operational (vacant): cap 50, 23 + 2 − 1 → 24
    expect(getResourceStock(state).construction).toBe(24)
    expect(getMaterialStorageCapacity(state)).toBe(50)
    state = stepSimulation(state) // t7: cap 50, 24 + 2 − 1 → 25
    expect(getResourceStock(state).construction).toBe(25)
    state = stepSimulation(state, place('workshop', 7, 7)) // t8: 25 + 2 − 25 − 1 = 1
    expect(getResourceStock(state).construction).toBe(1)

    // Below the 25 cost: another building would be rejected right now.
    expect(getResourceStock(state).construction).toBeLessThan(
      BUILDING_CATALOG.workshop.constructionCost
    )

    // Only worker output can raise the stock back to the construction cost.
    // Refill runs at net +1/tick (1 → 25 = 24 ticks).
    let ticks = 0
    while (getResourceStock(state).construction < 25) {
      state = stepSimulation(state)
      ticks += 1
      expect(ticks).toBeLessThanOrEqual(30)
    }
    expect(getResourceStock(state).construction).toBe(25)
    expect(getEmploymentSummary(state).employed).toBe(1)

    const before = getResourceStock(state).construction
    state = stepSimulation(state, place('residence', 0, 0))
    expect(state.buildings['building-5']?.type).toBe('residence')
    // Exact deduction for the construction, plus this tick's stored labor
    // flow (+2 stored under the 75 capacity − 1 upkeep).
    expect(getResourceStock(state).construction).toBe(before - 25 + 2 - 1)
  })
})

describe('determinism and immutability (Step 07C §11)', () => {
  const runScenario = (): SimulationState => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2))
    state = stepSimulation(state)
    state = stepSimulation(state, place('workshop', 4, 4))
    state = stepSimulation(state)
    state = stepSimulation(state, place('workshop', 6, 6))
    state = stepSimulation(state)
    state = stepSimulation(state)
    return state
  }

  it('repeated identical simulations produce identical employment, material and hash', () => {
    const a = runScenario()
    const b = runScenario()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(a.colonists).toEqual(b.colonists)
    expect(a.buildings).toEqual(b.buildings)
    expect(getResourceStock(a)).toEqual(getResourceStock(b))
    expect(getEmploymentSummary(a)).toEqual(getEmploymentSummary(b))
  })

  it('jobs phases never mutate the input state', () => {
    const state = workshopState()
    const before = hashCanonicalState(state)
    assignJobs(state)
    produceMaterial(state)
    materialProductionForTick(state)
    getEmploymentSummary(state)
    expect(hashCanonicalState(state)).toBe(before)

    const stepped = stepSimulation(state)
    expect(hashCanonicalState(state)).toBe(before)
    expect(stepped).not.toBe(state)
  })

  it('the canonical hash covers employment state', () => {
    const employed = workshopState()
    const unemployed = withWorkplace(employed, 'colonist-1', null)
    expect(hashCanonicalState(employed)).not.toBe(hashCanonicalState(unemployed))
  })
})

describe('employment render projection (Step 07C §13)', () => {
  it('projects workers per building so a staffed workshop is visible', () => {
    const snapshot = toRenderSnapshot(twoWorkshopState())
    const byId = (id: string) => snapshot.buildings.find((b) => b.id === id)
    expect(byId('building-1')?.workers).toBe(0) // residence
    expect(byId('building-2')?.workers).toBe(1) // staffed workshop
    expect(byId('building-3')?.workers).toBe(0) // vacant workshop
    expect(snapshot.buildings.map((b) => b.workers)).toEqual([0, 1, 0])
  })

  it('drops the projection when the colony starves', () => {
    const starved = stepSimulation(withFood(workshopState(), 0))
    const snapshot = toRenderSnapshot(starved)
    expect(snapshot.colonists).toHaveLength(0)
    expect(snapshot.buildings.map((b) => b.workers)).toEqual([0, 0])
  })
})

describe('jobs persistence (Step 07C §10)', () => {
  it('bumps the save version to 4', () => {
    expect(SAVE_VERSION).toBe(4)
  })

  it('round-trips employment state with hash and behavioral equivalence', () => {
    const state = workshopState()
    const restored = loadSave(serializeSave(state))
    expect(restored.colonists['colonist-1']?.workplaceId).toBe('building-2')
    expect(hashCanonicalState(restored)).toBe(hashCanonicalState(state))
    expect(hashCanonicalState(stepSimulation(restored))).toBe(
      hashCanonicalState(stepSimulation(state))
    )
  })

  it('rejects invalid workplaceId values', () => {
    const save = serializeSave(workshopState())
    for (const invalid of [42, {}, true, []]) {
      const parsed = JSON.parse(save) as {
        state: { colonists: Record<string, Record<string, unknown>> }
      }
      const colonist = parsed.state.colonists['colonist-1']
      if (colonist === undefined) {
        throw new Error('test helper: missing serialized colonist')
      }
      colonist['workplaceId'] = invalid
      expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
    }
  })

  it('rejects a missing workplaceId field', () => {
    const save = serializeSave(workshopState())
    const parsed = JSON.parse(save) as {
      state: { colonists: Record<string, Record<string, unknown>> }
    }
    delete parsed.state.colonists['colonist-1']?.['workplaceId']
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })

  it('explicitly rejects v3 saves (no silent employment migration)', () => {
    const save = serializeSave(workshopState())
    const parsed = JSON.parse(save) as Record<string, unknown>
    parsed['version'] = 3
    expect(() => loadSave(JSON.stringify(parsed))).toThrow(SaveValidationError)
  })
})

describe('food forecast correction (Step 07C §1 / §17)', () => {
  it('reports no finite forecast when nobody needs food', () => {
    const state = createTestState()
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports the finite remaining ticks when production is zero', () => {
    const state = withFood(colonistState(), 5)
    expect(getFoodConsumptionPerTick(state)).toBe(1)
    expect(getFoodTicksRemaining(state)).toBe(5)
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports the exact finite forecast when production < consumption', () => {
    const state = withFood(twoColonistState(), 5)
    expect(getFoodConsumptionPerTick(state)).toBe(2)
    expect(getFoodTicksRemaining(state)).toBe(2)
    expect(isFoodSupplySustainable(state)).toBe(false)
  })

  it('reports sustainable when production equals consumption', () => {
    let state = twoColonistState()
    state = stepSimulation(state, place('farm', 6, 6))
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state)
    expect(getJobCapacity(state)).toBe(1)
    expect(getFoodConsumptionPerTick(state)).toBe(2)
    expect(state.resources.food).toBeGreaterThan(0)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
  })

  it('reports sustainable when production exceeds consumption', () => {
    let state = colonistState()
    state = stepSimulation(state, place('farm', 6, 6))
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
  })

  it('never claims a finite starvation time on a non-negative net flow', () => {
    // Step 10E timing: the completing farm is staffed tick 4 but produces
    // from tick 5, so the colony needs a 2-food buffer to survive the gap.
    let state = withFood(colonistState(), 2)
    state = stepSimulation(state, place('farm', 6, 6)) // t3: eat 1 -> 1
    state = withRoadsForWorkshops(state) // Step 10E: farm staffing needs roads
    state = stepSimulation(state) // t4: farm op + assigned; eat 1 -> 0
    state = stepSimulation(state) // t5: +2 produced, 1 eaten -> 1
    expect(state.resources.food).toBeGreaterThanOrEqual(0)
    expect(getFoodTicksRemaining(state)).toBeNull()
    expect(isFoodSupplySustainable(state)).toBe(true)
    // Zero food plus a net non-negative flow is not a finite countdown.
    expect(withFood(state, 0).resources.food).toBe(0)
    expect(getFoodTicksRemaining(withFood(state, 0))).toBeNull()
  })

  it('is derived only: never stored on the state, never a new resource', () => {
    const state = twoColonistState()
    getFoodTicksRemaining(state)
    isFoodSupplySustainable(state)
    expect(Object.keys(state.resources).sort()).toEqual(['construction', 'food'])
    expect(Object.keys(state).sort()).toEqual([
      'buildings',
      'colonists',
      'config',
      'counters',
      'resources',
      'roads',
      'time',
    ])
    expect(withConstruction(state, 10).resources.construction).toBe(10)
  })

  it('does not mutate the input state', () => {
    const state = withFood(colonistState(), 3)
    const before = hashCanonicalState(state)
    getFoodTicksRemaining(state)
    isFoodSupplySustainable(state)
    expect(hashCanonicalState(state)).toBe(before)
  })
})
