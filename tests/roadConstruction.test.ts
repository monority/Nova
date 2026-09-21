/**
 * Player-facing road construction tests (Step 09H).
 *
 * The Road tool is a UI/application extension: it must reach the existing
 * 09C command path (`placeRoads` -> dispatchCommand -> stepSimulation ->
 * applyCommand) and reuse the existing validation, cost and lifecycle.
 * Nothing here re-implements domain rules.
 */

import { describe, expect, it } from 'vitest'

import {
  countWorkersAt,
  createRoads,
  expandRoadDrag,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  hashCanonicalState,
  isOperationalRoad,
  loadSave,
  materialProductionForTick,
  materialStoredProductionForTick,
  materialUpkeepDueForTick,
  ROAD_CONSTRUCTION_COST,
  SAVE_VERSION,
  serializeCanonicalState,
  serializeSave,
  stepSimulation,
  toRenderSnapshot,
  validateRoadsPlacement,
  type PlaceRoadsCommand,
  type SimulationState,
} from '@/index'
import { createGameController } from '@/app/gameController.js'
import { createTestState } from './helpers.js'

const roads = (
  cells: readonly { readonly x: number; readonly y: number }[]
): PlaceRoadsCommand => ({ type: 'placeRoads', cells })

const place = (
  buildingType: 'residence' | 'workshop' | 'farm',
  x: number,
  y: number
) => ({ type: 'placeBuilding' as const, x, y, buildingType })

/** Road at a cell, forced operational (arbitrary canonical state). */
const operationalRoad = (
  state: SimulationState,
  x: number,
  y: number
): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  if (id === undefined) {
    throw new Error('test helper: no road created')
  }
  const road = created.state.roads[id]
  if (road === undefined) {
    throw new Error('test helper: road missing after createRoads')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/**
 * Staffed operational Workshop with NO road — built through the real
 * simulation path (same fixture family as tests/roadProduction.test.ts).
 */
const staffedWorkshopNoRoad = (): SimulationState => {
  let state = createTestState()
  state = stepSimulation(state, place('residence', 2, 2)) // t1
  state = stepSimulation(state) // t2: colonist-1
  state = stepSimulation(state, place('workshop', 4, 4)) // t3
  state = stepSimulation(state) // t4: operational + staffed
  return state
}

describe('road construction command path (Step 09H)', () => {
  it('A — Road tool command reaches the authoritative path from the controller', () => {
    // Exactly what the Road tool does: one placeRoads command via dispatch.
    const controller = createGameController(createTestState())
    const before = controller.getState()

    controller.dispatch(roads([{ x: 3, y: 3 }]))

    const after = controller.getState()
    expect(Object.keys(after.roads)).toEqual(['road-1'])
    const road = after.roads['road-1']
    expect(road?.x).toBe(3)
    expect(road?.y).toBe(3)
    // Existing 09C lifecycle: placed this tick, catch-up leaves 1 remaining.
    expect(road?.status).toBe('underConstruction')
    expect(road?.constructionRemaining).toBe(1)
    // Existing 09C cost, paid from authoritative Material, one tick advanced.
    expect(after.resources.construction).toBe(
      before.resources.construction - ROAD_CONSTRUCTION_COST
    )
    expect(after.time.tick).toBe(before.time.tick + 1)
  })

  it('B — single cell placement', () => {
    const state = stepSimulation(createTestState(), roads([{ x: 1, y: 1 }]))
    expect(Object.keys(state.roads)).toEqual(['road-1'])
    expect(state.resources.construction).toBe(100 - ROAD_CONSTRUCTION_COST)
  })

  it('C — vertical drag uses the existing 09C expansion and price', () => {
    const cells = expandRoadDrag({ x: 2, y: 1 }, { x: 2, y: 4 })
    expect(cells).toEqual([
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ])
    const state = stepSimulation(createTestState(), roads(cells ?? []))
    expect(Object.keys(state.roads).length).toBe(4)
    expect(state.resources.construction).toBe(100 - 4 * ROAD_CONSTRUCTION_COST)
    expect(Object.values(state.roads).map((road) => road.y)).toEqual([1, 2, 3, 4])
  })

  it('D — horizontal drag uses the existing 09C expansion and price', () => {
    const cells = expandRoadDrag({ x: 5, y: 6 }, { x: 2, y: 6 })
    expect(cells).toEqual([
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ])
    const state = stepSimulation(createTestState(), roads(cells ?? []))
    expect(Object.values(state.roads).map((road) => road.x)).toEqual([2, 3, 4, 5])
    expect(state.resources.construction).toBe(100 - 4 * ROAD_CONSTRUCTION_COST)
  })

  it('E — diagonal drag is not a supported road geometry', () => {
    // expandRoadDrag is the only drag geometry the UI accepts.
    expect(expandRoadDrag({ x: 1, y: 1 }, { x: 3, y: 3 })).toBeNull()
    expect(expandRoadDrag({ x: 1, y: 1 }, { x: 3, y: 2 })).toBeNull()
  })

  it('F — deterministic multi-cell placement is drag-direction independent', () => {
    const forward = stepSimulation(
      createTestState(),
      roads([{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }])
    )
    const reversed = stepSimulation(
      createTestState(),
      roads([{ x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }])
    )
    expect(serializeCanonicalState(reversed)).toBe(serializeCanonicalState(forward))
    expect(hashCanonicalState(reversed)).toBe(hashCanonicalState(forward))
    // Ids follow the normalized (x, y) order, never the input order.
    expect(forward.roads['road-1']).toMatchObject({ x: 2, y: 2 })
    expect(forward.roads['road-3']).toMatchObject({ x: 2, y: 4 })
  })

  it('G — duplicate cells in one gesture collapse to one road', () => {
    const state = stepSimulation(
      createTestState(),
      roads([{ x: 3, y: 3 }, { x: 3, y: 3 }])
    )
    expect(Object.keys(state.roads).length).toBe(1)
    expect(state.resources.construction).toBe(100 - ROAD_CONSTRUCTION_COST)
  })

  it('H — out-of-bounds gesture is rejected with zero mutation', () => {
    const before = createTestState()
    const state = stepSimulation(before, roads([{ x: -1, y: 0 }]))
    expect(Object.keys(state.roads)).toEqual([])
    expect(state.resources).toEqual(before.resources)
    expect(state.time.tick).toBe(1) // the tick still runs
  })

  it('I — building collision is rejected (roads never stack on buildings)', () => {
    let state = stepSimulation(createTestState(), place('residence', 3, 3))
    const materialBefore = state.resources.construction
    const roadsBefore = Object.keys(state.roads).length
    state = stepSimulation(state, roads([{ x: 3, y: 3 }]))
    expect(Object.keys(state.roads).length).toBe(roadsBefore)
    expect(state.resources.construction).toBe(materialBefore)
  })

  it('J — existing road occupancy is rejected (no double spend)', () => {
    let state = stepSimulation(createTestState(), roads([{ x: 3, y: 3 }]))
    const materialAfterFirst = state.resources.construction
    state = stepSimulation(state, roads([{ x: 3, y: 3 }]))
    expect(Object.keys(state.roads).length).toBe(1)
    expect(state.resources.construction).toBe(materialAfterFirst)
    // Same gesture over an already-road cell in a longer drag: rejected whole.
    const before = state.resources.construction
    state = stepSimulation(state, roads([{ x: 3, y: 4 }, { x: 3, y: 3 }]))
    expect(state.resources.construction).toBe(before)
    expect(Object.keys(state.roads).length).toBe(1)
  })

  it('K — insufficient Material is rejected with zero mutation', () => {
    const poor: SimulationState = {
      ...createTestState(),
      resources: { construction: ROAD_CONSTRUCTION_COST - 1, food: 100, water: 0 },
    }
    const state = stepSimulation(poor, roads([{ x: 2, y: 2 }]))
    expect(Object.keys(state.roads)).toEqual([])
    expect(state.resources.construction).toBe(ROAD_CONSTRUCTION_COST - 1)
  })
})

describe('road placement preview contract (Step 09H)', () => {
  it('L — the UI preview reads the authoritative 09C validator', () => {
    const state = createTestState()
    // Valid single cell: total cost is the domain cost.
    const valid = validateRoadsPlacement(state, [{ x: 2, y: 2 }])
    expect(valid).toEqual({
      valid: true,
      cells: [{ x: 2, y: 2 }],
      totalCost: ROAD_CONSTRUCTION_COST,
    })
    // Every failure reason the status line renders comes from the domain.
    expect(validateRoadsPlacement(state, [])).toEqual({
      valid: false,
      reason: 'emptyCells',
    })
    expect(validateRoadsPlacement(state, [{ x: 99, y: 0 }])).toEqual({
      valid: false,
      reason: 'outOfBounds',
    })
    const withBuilding = stepSimulation(state, place('farm', 2, 2))
    expect(validateRoadsPlacement(withBuilding, [{ x: 2, y: 2 }])).toEqual({
      valid: false,
      reason: 'cellOccupiedByBuilding',
    })
    const withRoad = stepSimulation(state, roads([{ x: 2, y: 2 }]))
    expect(validateRoadsPlacement(withRoad, [{ x: 2, y: 2 }])).toEqual({
      valid: false,
      reason: 'cellOccupiedByRoad',
    })
    const poor: SimulationState = {
      ...state,
      resources: { construction: 0, food: 100, water: 0 },
    }
    expect(validateRoadsPlacement(poor, [{ x: 2, y: 2 }])).toEqual({
      valid: false,
      reason: 'insufficientResources',
    })
    // A whole drag is priced as a set, never per cell.
    const drag = validateRoadsPlacement(state, [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ])
    expect(drag.valid && drag.totalCost).toBe(3 * ROAD_CONSTRUCTION_COST)
  })
})

describe('road construction lifecycle and gameplay proof (Step 09H)', () => {
  it('M — placed road stays under construction until the 09C rules complete it', () => {
    let state = stepSimulation(createTestState(), roads([{ x: 3, y: 3 }]))
    const id = 'road-1'
    expect(state.roads[id]?.status).toBe('underConstruction')
    state = stepSimulation(state)
    expect(state.roads[id]?.status).toBe('operational')
    expect(isOperationalRoad(state.roads[id]!)).toBe(true)
  })

  it('N — player-built road unlocks employment + production (09E + 09K)', () => {
    let state = staffedWorkshopNoRoad()
    // Roadless: under 09K no mobility means no worker, no production.
    expect(countWorkersAt(state, 'building-2')).toBe(0)
    expect(materialProductionForTick(state)).toBe(0)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(false)

    const materialBefore = state.resources.construction
    const upkeep = materialUpkeepDueForTick(state)
    // Player gesture: a Manhattan path from residence(2,2) to workshop(4,4).
    const pathCells = [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
    ]
    state = stepSimulation(state, roads(pathCells))
    // Authoritative cost (3 cells) + upkeep (0 — no worker yet).
    expect(state.resources.construction).toBe(
      materialBefore - pathCells.length * ROAD_CONSTRUCTION_COST - upkeep
    )
    expect(materialProductionForTick(state)).toBe(0)
    expect(
      Object.values(state.roads).every((r) => r.status === 'underConstruction')
    ).toBe(true)

    // Next tick the roads complete: mobility activates, worker employed,
    // production resumes.
    state = stepSimulation(state)
    expect(
      Object.values(state.roads).every((r) => r.status === 'operational')
    ).toBe(true)
    expect(getBuildingRoadAccess(state, 'building-2').hasRoadAccess).toBe(true)
    expect(materialProductionForTick(state)).toBe(2)
    // 09K: the mobility relationship is now derived and TRUE.
    expect(getColonistWorkMobility(state, 'colonist-1').mobilityConnected).toBe(
      true
    )
  })

  it('O — resumed production is stored through the unchanged 08F clamp', () => {
    let state = staffedWorkshopNoRoad()
    // Place roads (under construction), then set the stock to 24 with
    // storage capacity 25: exactly 1 unit of space for the completing tick.
    state = stepSimulation(
      state,
      roads([{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }])
    )
    state = { ...state, resources: { ...state.resources, construction: 24 } }
    expect(materialProductionForTick(state)).toBe(0)
    state = stepSimulation(state)
    // Gross production 2, one unit stored, upkeep 1 paid: equilibrium 24.
    expect(materialProductionForTick(state)).toBe(2)
    expect(materialStoredProductionForTick(state)).toBe(1)
    expect(state.resources.construction).toBe(24)
  })

  it('P — under-construction road keeps employment unchanged (09K)', () => {
    const before = staffedWorkshopNoRoad()
    const after = stepSimulation(before, roads([{ x: 4, y: 3 }]))
    // Employment unchanged: under-construction road does not connect
    // residence to the workshop, so no worker (09K).
    expect(countWorkersAt(after, 'building-2')).toBe(
      countWorkersAt(before, 'building-2')
    )
    expect(after.buildings).toEqual(before.buildings)
    expect(after.colonists).toEqual(before.colonists)
    // No worker → no upkeep.
    expect(materialUpkeepDueForTick(after)).toBe(0)
  })
})

describe('road projection, persistence and determinism (Step 09H)', () => {
  it('Q — snapshot derives road status and orthogonal continuity', () => {
    let state = createTestState()
    // Straight NS: (4,3) with (4,2) and (4,4).
    state = operationalRoad(state, 4, 3)
    state = operationalRoad(state, 4, 2)
    state = operationalRoad(state, 4, 4)
    // Isolated operational road + crossing at (6,6).
    state = operationalRoad(state, 0, 0)
    state = operationalRoad(state, 6, 6)
    state = operationalRoad(state, 6, 5)
    state = operationalRoad(state, 6, 7)
    state = operationalRoad(state, 5, 6)
    state = operationalRoad(state, 7, 6)

    const snapshot = toRenderSnapshot(state)
    const byCell = new Map(
      snapshot.roads.map((road) => [`${road.x},${road.y}`, road])
    )
    // Crossing: connected on all four axes.
    expect(byCell.get('6,6')?.connections).toEqual({
      north: true,
      east: true,
      south: true,
      west: true,
    })
    // Straight segment: only the vertical axis.
    expect(byCell.get('4,3')?.connections).toEqual({
      north: true,
      east: false,
      south: true,
      west: false,
    })
    // Endpoint of the straight segment.
    expect(byCell.get('4,2')?.connections).toEqual({
      north: false,
      east: false,
      south: true,
      west: false,
    })
    // Isolated: no continuity at all.
    expect(byCell.get('0,0')?.connections).toEqual({
      north: false,
      east: false,
      south: false,
      west: false,
    })
  })

  it('R — under-construction roads are never drawn as connected segments', () => {
    // One operational road, one under construction beside it.
    let state = operationalRoad(createTestState(), 4, 3)
    const created = createRoads(state, [{ x: 4, y: 4 }])
    state = created.state
    const snapshot = toRenderSnapshot(state)
    const underConstruction = snapshot.roads.find(
      (road) => road.status === 'underConstruction'
    )
    expect(underConstruction?.connections).toEqual({
      north: false,
      east: false,
      south: false,
      west: false,
    })
    const operational = snapshot.roads.find(
      (road) => road.status === 'operational'
    )
    expect(operational?.connections.south).toBe(false)
  })

  it('S — save/load round-trip preserves roads and never persists orientation', () => {
    let state = stepSimulation(
      createTestState(),
      roads([{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }])
    )
    state = stepSimulation(state) // complete the roads
    const loaded = loadSave(serializeSave(state))
    expect(serializeCanonicalState(loaded)).toBe(serializeCanonicalState(state))
    expect(hashCanonicalState(loaded)).toBe(hashCanonicalState(state))
    expect(Object.keys(loaded.roads).length).toBe(3)
    expect(Object.values(loaded.roads).every(isOperationalRoad)).toBe(true)
    // Derived orientation is not part of the save.
    const raw = serializeSave(state)
    expect(raw.includes('connections')).toBe(false)
    expect(raw.includes('orientation')).toBe(false)
    expect(SAVE_VERSION).toBe(6)
  })

  it('T — deterministic replay: same gestures, same state and hash', () => {
    const run = (): SimulationState => {
      let state = staffedWorkshopNoRoad()
      state = stepSimulation(state, roads([{ x: 4, y: 3 }]))
      state = stepSimulation(state)
      state = stepSimulation(state, roads([{ x: 3, y: 3 }, { x: 2, y: 3 }]))
      return stepSimulation(state)
    }
    const a = run()
    const b = run()
    expect(hashCanonicalState(a)).toBe(hashCanonicalState(b))
    expect(serializeCanonicalState(a)).toBe(serializeCanonicalState(b))
  })

  it('U — road construction never mutates the starting state (purity)', () => {
    const before = staffedWorkshopNoRoad()
    const hashBefore = hashCanonicalState(before)
    stepSimulation(before, roads([{ x: 4, y: 3 }]))
    stepSimulation(before, roads([{ x: 4, y: 3 }]))
    expect(hashCanonicalState(before)).toBe(hashBefore)
    expect(Object.keys(before.roads)).toEqual([])
  })

  it('V — building placement still uses the same command path (no regression)', () => {
    const controller = createGameController(createTestState())
    controller.dispatch(place('residence', 1, 1))
    controller.dispatch(roads([{ x: 4, y: 4 }]))
    const state = controller.getState()
    expect(Object.keys(state.buildings)).toEqual(['building-1'])
    expect(Object.keys(state.roads)).toEqual(['road-1'])
    // Building placement is unchanged by the Road tool (no createBuilding
    // helper is used for roads and vice versa).
    expect(state.buildings['building-1']?.x).toBe(1)
  })
})

describe('road cost display source (Step 09H)', () => {
  it('W — the palette label and the domain cost share one number', () => {
    // The UI label is rendered from ROAD_CONSTRUCTION_COST; assert the domain
    // constant is the single source the label reads.
    expect(ROAD_CONSTRUCTION_COST).toBe(5)
    const state = stepSimulation(createTestState(), roads([{ x: 0, y: 0 }]))
    expect(state.resources.construction).toBe(100 - ROAD_CONSTRUCTION_COST)
  })
})
