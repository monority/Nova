/**
 * Step 10CN — Post-Town Reorientation Gate measurements.
 *
 * AUDIT ONLY. Locks the structural evidence behind the FREEZE decision:
 * distinct valid layouts produce identical economic outcomes (placement is
 * validity + cost, not strategy), so no hidden spatial depth exists to
 * develop with existing systems. No simulation rule is changed here.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFoodProductionPerTick,
  getProgression,
  getWaterProductionPerTick,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10cn', width: 12, height: 12 } }

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10cn: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const operationalRoads = (
  state: SimulationState,
  cells: readonly { readonly x: number; readonly y: number }[]
): SimulationState => {
  const created = createRoads(state, [...cells])
  const roads = { ...created.state.roads }
  for (const roadId of created.roadIds) {
    const road = roads[roadId]
    if (road !== undefined) {
      roads[roadId] = { ...road, status: 'operational', constructionRemaining: 0 }
    }
  }
  return { ...created.state, roads }
}

const staffedPair = (
  residenceCells: readonly [number, number][],
  farmCell: readonly [number, number],
  wellCell: readonly [number, number],
  roadCells: readonly { readonly x: number; readonly y: number }[]
): SimulationState => {
  let state = {
    ...createInitialState(config),
    resources: { construction: 10000, food: 100, water: 0 },
  }
  for (const [x, y] of residenceCells) state = operational(state, 'residence', x, y)
  state = operationalRoads(state, roadCells)
  state = operational(state, 'farm', farmCell[0] ?? 0, farmCell[1] ?? 0)
  state = operational(state, 'well', wellCell[0] ?? 0, wellCell[1] ?? 0)
  state = createColonist(state, 'building-1').state
  state = createColonist(state, 'building-2').state
  return assignJobs(state)
}

describe('10CN — layout equivalence (validity, not strategy)', () => {
  it('produces identical economics from a compact and a spread layout', () => {
    let compact = staffedPair(
      [
        [1, 0],
        [3, 0],
      ],
      [1, 2],
      [3, 2],
      [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]
    )
    let spread = staffedPair(
      [
        [0, 0],
        [10, 0],
      ],
      [0, 2],
      [10, 2],
      Array.from({ length: 11 }, (_, x) => ({ x, y: 1 }))
    )
    for (let index = 0; index < 24; index += 1) {
      compact = stepSimulation(compact)
      spread = stepSimulation(spread)
    }
    // Same buildings, same staffing, same rates, same stage, same stocks:
    // distance and geometry change nothing once access holds. The only
    // differentiator the simulation offers layouts is road cost.
    expect(getFoodProductionPerTick(spread)).toBe(getFoodProductionPerTick(compact))
    expect(getWaterProductionPerTick(spread)).toBe(getWaterProductionPerTick(compact))
    expect(getProgression(spread).stage).toBe(getProgression(compact).stage)
    expect(spread.resources.food).toBe(compact.resources.food)
  })
})
