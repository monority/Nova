/**
 * Road access production constraint tests (Step 09F).
 *
 * One gameplay consequence of road access: an operational, staffed Workshop
 * produces Material ONLY with road access. Jobs, upkeep, storage,
 * construction, food and population are untouched.
 */

import { describe, expect, it } from 'vitest'

import {
  commerceRevenueForTick,

  createRoads,
  getBuildingRoadAccess,
  getRevenuePerTick,
  getMaintenanceDuePerTick,
  hashCanonicalState,
  loadSave,
  maintenanceDueForTick,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  type PlaceRoadsCommand,
  type SimulationState,
} from '@/index'
import { createTestState, withRoadsForWorkshops, withWorkshopWater } from './helpers.js'

const place = (
  buildingType: 'residence' | 'workshop' | 'farm',
  x: number,
  y: number
) => ({ type: 'placeBuilding' as const, x, y, buildingType })

const placeRoads = (cells: { readonly x: number; readonly y: number }[]): PlaceRoadsCommand => ({
  type: 'placeRoads',
  cells,
})

/**
 * Bootstrap: residence + colonist, staffed operational Workshop at (4,4),
 * NO road. Deterministic 09F base fixture through the real simulation path.
 */
const staffedWorkshopNoRoad = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(withWorkshopWater(state), place('workshop', 4, 4)) // t3
  state = stepSimulation(state) // t4: 1 construction tick left
  state = stepSimulation(state) // t5: operational + staffed, roadless
  return state
}

/** Same as staffedWorkshopNoRoad but with roads connecting the residence to the
 * workshop, then one more tick so assignJobs re-runs with the network present. */
const staffedWorkshopWithRoad = (): SimulationState =>
  stepSimulation(withRoadsForWorkshops(staffedWorkshopNoRoad()))

describe('road access production constraint (Step 09F)', () => {
  it('A — staffed + road access produces normally', () => {
    const state = staffedWorkshopWithRoad()
    expect(commerceRevenueForTick(state)).toBe(2)
    // Step001: revenue = taxes (1 colonist × 1) + commerce (1 connected
    // Workshop × 2) = 3.
    expect(getRevenuePerTick(state)).toBe(3)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(true)
  })

  it('B — no mobility connection: worker not assigned, commerce 0, taxes still flow (09K gate)', () => {
    const state = staffedWorkshopNoRoad()
    const workshop = state.buildings['building-2']!
    expect(workshop.status).toBe('operational')
    // Under 09K, the colonist is never employed without a road network
    // linking residence to workplace — the OLD 09F "workers kept" behavior
    // no longer applies.
    expect(countWorkersAtSafe(state, 'building-2')).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Step001: no commerce (no road), but the resident colonist still pays
    // taxes (1), and upkeep is per operational building — it applies to the
    // roadless Workshop + Residence regardless of employment.
    expect(getRevenuePerTick(state)).toBe(1)
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(false)
    // No persisted mutation: the workshop exists exactly as before.
    expect(workshop.constructionRemaining).toBe(0)
  })

  it('C — diagonal-only road gives no access, production 0', () => {
    let state = staffedWorkshopNoRoad()
    const created = createRoads(state, [{ x: 5, y: 5 }])
    state = forceOperational(created.state, created.roadIds[0]!)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(false)
    expect(commerceRevenueForTick(state)).toBe(0)
  })

  it('D — under-construction road gives no access, production 0', () => {
    let state = staffedWorkshopNoRoad()
    // Real path: roads placed this tick are under construction.
    // Path: residence(2,2) → (3,2) → (4,2) → (4,3) → workshop(4,4)
    state = stepSimulation(
      state,
      placeRoads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])
    )
    expect(
      Object.values(state.roads).every((r) => r.status === 'underConstruction')
    ).toBe(true)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(false)
    expect(commerceRevenueForTick(state)).toBe(0)
    // Completing the roads unlocks production (no persisted change needed).
    const advanced = stepSimulation(state)
    expect(
      Object.values(advanced.roads).every((r) => r.status === 'operational')
    ).toBe(true)
    expect(commerceRevenueForTick(advanced)).toBe(2)
  })

  it('E — under-construction workshop produces 0 even with a road', () => {
    let state = createTestState()
    state = stepSimulation(state, place('residence', 2, 2)) // t1
    state = stepSimulation(state) // t2: colonist-1
    // Road first (operational), then the workshop placed this tick.
    const roaded = withRoadsForWorkshops(
      stepSimulation(withWorkshopWater(state), place('workshop', 4, 4))
    )
    // Workshop is under construction (placed this tick, catch-up leaves 1).
    const workshop = roaded.buildings['building-2']!
    expect(workshop.status).toBe('underConstruction')
    expect(commerceRevenueForTick(roaded)).toBe(0)
  })

  it('F — indirect road network: adjacent operational road suffices', () => {
    let state = staffedWorkshopWithRoad()
    // Extend the adjacent road north: a real 3-road chain (no pathfinding).
    const adjId = Object.values(state.roads)[0]!.id
    const adj = state.roads[adjId]!
    const created = createRoads(state, [{ x: adj.x, y: adj.y - 1 }])
    state = forceOperational(created.state, created.roadIds[0]!)
    expect(commerceRevenueForTick(state)).toBe(2)
  })

  it('G — disconnected network does not grant access', () => {
    let state = staffedWorkshopWithRoad()
    // Far separate network (not adjacent to the workshop).
    const created = createRoads(state, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    state = forceOperational(created.state, created.roadIds[0]!)
    state = forceOperational(state, created.roadIds[1]!)
    const access = getBuildingRoadAccess(state, 'building-2')
    // Access stays local: only the adjacent road's network counts.
    expect(access.hasRoadAccess).toBe(true)
    expect(access.roadIds.length).toBe(1)
    expect(access.networkIds.length).toBe(1)
    expect(commerceRevenueForTick(state)).toBe(2)
  })

  it('H — employment respects mobility: roadless residence means no employment (09K)', () => {
    const state = staffedWorkshopNoRoad()
    const summary = getEmploymentSummarySafe(state)
    // Under 09K, without a road network between residence and workshop,
    // the colonist is not employed — no worker assigned.
    expect(summary.employed).toBe(0)
    expect(countWorkersAtSafe(state, 'building-2')).toBe(0)
    expect(commerceRevenueForTick(state)).toBe(0)
  })

  it('I — 09K mobility gate: no worker means no commerce, upkeep still applies', () => {
    const state = staffedWorkshopNoRoad()
    // Step001: no mobility connection means no worker and no commerce, but
    // upkeep is per operational building (Residence + Workshop = 2).
    expect(maintenanceDueForTick(state)).toBe(2)
    expect(getMaintenanceDuePerTick(state)).toBe(2)
    const before = state.resources.money
    const after = stepSimulation(state)
    // Revenue 1 (tax) − upkeep 2 = −1 per tick while roadless.
    expect(after.resources.money).toBe(before + 1 - 2)
    expect(getMaintenanceDuePerTick(after)).toBe(2)
  })

  it('J — storage mechanics (08F) unchanged with road access', () => {
    const state = staffedWorkshopWithRoad()
    // Stock at cap 25: stored production is 0 (clamped).
    const clamped = { ...state, resources: { ...state.resources, money: 25 } }
    expect(commerceRevenueForTick(clamped)).toBe(2)
    const storedClamped = stepSimulation(clamped)
    // Step001: income 3 (tax 1 + commerce 2) − upkeep 2 = 26. No separate
    // storage add: money = stock + revenue − upkeep.
    expect(storedClamped.resources.money).toBe(25 + 3 - 2)
    // Stock 24: same net (+1) — the 08F storage clamp does not apply to the
    // money stock (24 + 3 − 2 = 25).
    const equilibrium = { ...state, resources: { ...state.resources, money: 24 } }
    const after = stepSimulation(equilibrium)
    expect(after.resources.money).toBe(25)
  })

  it('K — construction flow unchanged: costs, ticks, progress', () => {
    const state = staffedWorkshopWithRoad()
    const before = state.resources.money
    const after = stepSimulation(state, place('farm', 0, 7))
    // Cost 25, same-tick net +1 (income 3 − upkeep 2): before − 25 + 3 − 2.
    // Farm under construction.
    expect(after.resources.money).toBe(before - 25 + 3 - 2)
    const placed = Object.values(after.buildings).find((b) => b.type === 'farm')!
    expect(placed.status).toBe('underConstruction')
  })

  it('L — save/load: production behavior and derived access preserved', () => {
    const state = staffedWorkshopWithRoad()
    const before = getBuildingRoadAccess(state, 'building-2')
    const productionBefore = commerceRevenueForTick(state)
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(getBuildingRoadAccess(loaded, 'building-2')).toEqual(before)
    expect(commerceRevenueForTick(loaded)).toBe(productionBefore)
    expect(SAVE_VERSION).toBe(13)
  })

  it('M — determinism: identical runs produce identical states and production', () => {
    const run = (): { hash: string; production: number } => {
      const state = stepSimulation(staffedWorkshopWithRoad())
      return {
        hash: hashCanonicalState(state),
        production: commerceRevenueForTick(state),
      }
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
  })

  it('N — connected vs disconnected states (no demolition primitive needed)', () => {
    const connected = staffedWorkshopWithRoad()
    const disconnected = staffedWorkshopNoRoad()
    expect(commerceRevenueForTick(connected)).toBe(2)
    expect(commerceRevenueForTick(disconnected)).toBe(0)
    // Same buildings/colonists; only the derived road access differs.
    expect(Object.keys(connected.buildings)).toEqual(
      Object.keys(disconnected.buildings)
    )
    expect(Object.keys(connected.colonists)).toEqual(
      Object.keys(disconnected.colonists)
    )
  })
})

// --- local helpers (avoid extra imports in the header) ---

import { countWorkersAt, getEmploymentSummary } from '@/index'

const countWorkersAtSafe = (state: SimulationState, id: string): number =>
  countWorkersAt(state, id)

const getEmploymentSummarySafe = (state: SimulationState) =>
  getEmploymentSummary(state)

const forceOperational = (
  state: SimulationState,
  roadId: string
): SimulationState => {
  const road = state.roads[roadId]!
  return {
    ...state,
    roads: {
      ...state.roads,
      [roadId]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}
