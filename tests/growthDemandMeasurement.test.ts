/**
 * Step 10CL — Growth Demand Investigation measurements.
 *
 * AUDIT ONLY. These tests lock the measured evidence behind the DEFER
 * decision: at exact-balance scale every colonist is consumed by survival
 * work (zero slack), a population shock is recovered by construction — the
 * same Village/Town decision at larger scale — and surplus workplaces stay
 * vacant without the population growth that would consume their output.
 * No simulation rule is changed here.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getFoodProductionPerTick,
  getPopulationCount,
  getProgression,
  getReassignmentOptions,
  iterateBuildings,
  getWaterProductionPerTick,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10cl', width: 12, height: 12 } }

const operational = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('10cl: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
    },
  }
}

/**
 * Exact-balance colony: P residences on a road spine, P/2 Farms and P/2
 * Wells on the served row, one vacant Workshop. even P only.
 */
const balancedColony = (population: number): SimulationState => {
  let state = {
    ...createInitialState(config),
    resources: { money: 10000, food: 10000, water: 10000, wood: 0, stone: 0, planks: 0 },
  }
  for (let index = 0; index < population; index += 1) {
    state = operational(state, 'residence', index, 0)
  }
  const roads = createRoads(
    state,
    Array.from({ length: population + 1 }, (_, x) => ({ x, y: 1 }))
  )
  state = roads.state
  const roadRecords = { ...state.roads }
  for (const roadId of roads.roadIds) {
    const road = roadRecords[roadId]
    if (road !== undefined) {
      roadRecords[roadId] = { ...road, status: 'operational', constructionRemaining: 0 }
    }
  }
  state = { ...state, roads: roadRecords }
  for (let index = 0; index < population / 2; index += 1) {
    state = operational(state, 'farm', index, 2)
  }
  for (let index = 0; index < population / 2; index += 1) {
    state = operational(state, 'well', population / 2 + index, 2)
  }
  state = operational(state, 'workshop', population, 2)
  for (let index = 0; index < population; index += 1) {
    state = createColonist(state, `building-${index + 1}`).state
  }
  return assignJobs(state)
}

const employedCount = (state: SimulationState): number =>
  Object.values(state.colonists).filter((colonist) => colonist.workplaceId !== null).length

describe('10CL — zero-slack scaling', () => {
  it.each([4, 6, 8, 10])(
    'leaves no free worker at exact balance (P=%i)',
    (population: number) => {
      const state = balancedColony(population)
      // Survival consumes every colonist; the Workshop stays vacant.
      expect(employedCount(state)).toBe(population)
      expect(getFoodProductionPerTick(state)).toBe(population)
      expect(getWaterProductionPerTick(state)).toBe(population)
    }
  )

  it('recovers a population shock by construction, not by a new decision', () => {
    const shocked = assignJobs(createColonist(balancedColony(8), 'building-1').state)
    expect(getPopulationCount(shocked)).toBe(9)
    // Nine mouths on eight food: below Town, same as every food-tight state.
    expect(getProgression(shocked).stage).not.toBe('town')
    // No idle hands exist: the newcomer is auto-absorbed by the vacant
    // Workshop, which produces no Food, so production is unchanged.
    expect(employedCount(shocked)).toBe(9)
    expect(getFoodProductionPerTick(shocked)).toBe(8)
    // The recovery is the known Village/Town repertoire — build another Farm
    // through the real command, then reassign an existing worker onto it —
    // repeated at larger scale, not a qualitatively new problem.
    let recovered = stepSimulation(shocked, {
      type: 'placeBuilding',
      buildingType: 'farm',
      x: 8,
      y: 0,
    })
    for (let index = 0; index < 5; index += 1) recovered = stepSimulation(recovered)
    const vacantFarm = [...iterateBuildings(recovered)].find(
      (building) =>
        building.type === 'farm' &&
        building.status === 'operational' &&
        !Object.values(recovered.colonists).some(
          (colonist) => colonist.workplaceId === building.id
        )
    )
    const wellWorker = Object.values(recovered.colonists).find((colonist) => {
      const workplace =
        colonist.workplaceId === null ? undefined : recovered.buildings[colonist.workplaceId]
      return workplace?.type === 'well'
    })
    if (vacantFarm === undefined || wellWorker === undefined) {
      throw new Error('10cl: recovery fixture did not assemble')
    }
    const eligible = getReassignmentOptions(recovered, wellWorker.id).some(
      (option) => option.workplaceId === vacantFarm.id && option.eligible
    )
    expect(eligible).toBe(true)
    recovered = stepSimulation(recovered, {
      type: 'reassignColonist',
      colonistId: wellWorker.id,
      workplaceId: vacantFarm.id,
    })
    for (let index = 0; index < 3; index += 1) recovered = stepSimulation(recovered)
    // Sustainability restored with existing moves; the measured end state is
    // Village (the Workshop seat moved to the Farm) — the Town re-attainment
    // from here is the same staffing question, not a new mechanic.
    expect(getFoodProductionPerTick(recovered)).toBe(10)
    expect(getProgression(recovered).stage).toBe('village')
  })

  it('leaves surplus workplaces vacant without self-consuming growth', () => {
    // Two extra served Farms, but no free hands: full employment already.
    let state = operational(balancedColony(8), 'farm', 8, 0)
    state = operational(state, 'farm', 9, 0)
    state = assignJobs(state)
    expect(employedCount(state)).toBe(8)
    expect(getFoodProductionPerTick(state)).toBe(8)
    // Staffing them needs two more colonists, who would eat exactly the
    // +4 food the Farms produce: growth is self-consuming, no slack appears.
  })

  it('keeps every measured colony deterministic across assembly', () => {
    const first = balancedColony(8)
    const second = balancedColony(8)
    expect(getProgression(first)).toEqual(getProgression(second))
    expect(employedCount(first)).toBe(employedCount(second))
  })
})
