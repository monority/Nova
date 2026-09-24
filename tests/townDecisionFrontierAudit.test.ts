/** Step 10CF - Town decision frontier audit. Measurement only. */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  countStaffedOperationalFarms,
  countStaffedOperationalWells,
  countStaffedOperationalWorkshops,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingRoadAccess,
  getFoodProductionPerTick,
  getMaterialProductionPerTick,
  getProgression,
  getResourceStock,
  getRoadNetworks,
  getReassignmentOptions,
  getTownCapabilityStatus,
  getWaterNeedPerTick,
  getWaterProductionPerTick,
  hashCanonicalState,
  loadSave,
  serializeSave,
  stepSimulation,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step10cf', width: 32, height: 10 } }

const op = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('missing building')
  return { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } } }
}

const fixture = (workers: number, types: readonly BuildingType[], split = false, water = 100): SimulationState => {
  let state = createInitialState(config)
  state = { ...state, resources: { construction: 1000, food: 1000, water } }
  for (let index = 0; index < workers; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
  const cells = Array.from({ length: 29 }, (_, x) => ({ x, y: 1 })).filter(({ x }) => !(split && x === 8))
  const created = createRoads(state, cells)
  state = created.state
  const roads = { ...state.roads }
  for (const id of created.roadIds) {
    const road = roads[id]
    if (road !== undefined) roads[id] = { ...road, status: 'operational', constructionRemaining: 0 }
  }
  state = { ...state, roads }
  types.forEach((type, index) => { state = op(state, type, 1 + index * 2, 2) })
  for (let index = 0; index < workers; index += 1) state = createColonist(state, `building-${index + 1}`).state
  return assignJobs(state)
}

const metrics = (state: SimulationState) => ({
  population: Object.keys(state.colonists).length,
  farms: countStaffedOperationalFarms(state),
  wells: countStaffedOperationalWells(state),
  workshops: countStaffedOperationalWorkshops(state),
  workers: Object.values(state.colonists).filter((colonist) => colonist.workplaceId !== null).length,
  foodRate: getFoodProductionPerTick(state),
  foodStock: getResourceStock(state).food,
  waterRate: getWaterProductionPerTick(state),
  waterNeed: getWaterNeedPerTick(state),
  waterStock: getResourceStock(state).water,
  materialRate: getMaterialProductionPerTick(state),
  materialStock: getResourceStock(state).construction,
  networks: getRoadNetworks(state).length,
  accessible: Object.values(state.buildings).filter((building) => getBuildingRoadAccess(state, building.id).hasRoadAccess).length,
  stage: getProgression(state).stage,
  townReview: getTownCapabilityStatus(state).available,
})

const advance = (state: SimulationState, ticks: number): SimulationState => {
  let next = state
  for (let tick = 0; tick < ticks; tick += 1) next = stepSimulation(next)
  return next
}

const move = (state: SimulationState, from: BuildingType, to: BuildingType): SimulationState | null => {
  const source = Object.values(state.colonists).find((colonist) => {
    if (colonist.workplaceId === null) return false
    const building = state.buildings[colonist.workplaceId]
    return building?.type === from && getReassignmentOptions(state, colonist.id).some((option) => option.type === to && option.eligible)
  })
  if (source === undefined) return null
  const target = getReassignmentOptions(state, source.id).find((option) => option.type === to && option.eligible)
  return target === undefined ? null : stepSimulation(state, { type: 'reassignColonist', colonistId: source.id, workplaceId: target.workplaceId })
}

const compositions = {
  balanced: ['farm', 'well', 'workshop', 'farm', 'well', 'workshop'] as BuildingType[],
  waterHeavy: ['well', 'well', 'workshop', 'farm', 'well', 'workshop'] as BuildingType[],
  materialHeavy: ['workshop', 'workshop', 'farm', 'well', 'workshop', 'farm'] as BuildingType[],
  mixed: ['workshop', 'farm', 'well', 'well', 'workshop', 'farm'] as BuildingType[],
}

describe('Step 10CF — Town decision frontier audit', () => {
  it('sweeps low, balanced, saturated, and high populations', () => {
    const rows = [4, 6, 8, 10, 12].map((workers) => ({ ...metrics(fixture(workers, compositions.balanced)), populationSweep: workers }))
    expect(rows.every((row) => typeof row.stage === 'string')).toBe(true)
    expect(rows.every((row) => row.workers === Math.min(row.populationSweep, 6))).toBe(true)
    expect(rows.at(-1)?.workers).toBe(6)
  })

  it('enumerates the small Farm/Well/Workshop allocation envelope', () => {
    const rows: Record<string, ReturnType<typeof metrics>> = {}
    for (let farms = 0; farms <= 2; farms += 1) {
      for (let wells = 0; wells <= 2; wells += 1) {
        for (let workshops = 0; workshops <= 2; workshops += 1) {
          if (farms + wells + workshops > 4) continue
          const types: BuildingType[] = []
          for (let index = 0; index < farms; index += 1) types.push('farm')
          for (let index = 0; index < wells; index += 1) types.push('well')
          for (let index = 0; index < workshops; index += 1) types.push('workshop')
          rows[`${farms}/${wells}/${workshops}`] = metrics(fixture(4, [...types, 'farm', 'well'], true))
        }
      }
    }
    expect(Object.keys(rows).length).toBeGreaterThan(10)
    expect(new Set(Object.values(rows).map((row) => row.waterRate)).size).toBeGreaterThan(1)
  })

  it('classifies simultaneous Food/Water/Material pressure as an existing allocation decision', () => {
    const start = fixture(6, ['workshop', 'workshop', 'farm', 'well', 'well', 'farm', 'well'], false, 20)
    const before = metrics(start)
    const resolved = move(start, 'workshop', 'well')
    expect(resolved).not.toBeNull()
    if (resolved === null) return
    const after = metrics(resolved)
    expect(after.waterRate).toBeGreaterThan(before.waterRate)
    expect(after.materialRate).toBeLessThan(before.materialRate)
    expect(after.foodRate).toBe(before.foodRate)
  })

  it('measures 4/12/24-tick temporal stability and reassignment recovery', () => {
    const start = fixture(6, ['workshop', 'workshop', 'farm', 'well', 'well', 'farm', 'well'], false, 20)
    const horizons = [4, 12, 24].map((ticks) => metrics(advance(start, ticks)))
    const first = horizons[0]!
    const second = horizons[1]!
    const third = horizons[2]!
    expect(first.waterStock).toBeLessThan(start.resources.water)
    expect(second.waterRate).toBe(first.waterRate)
    expect(third.waterStock).toBeLessThanOrEqual(second.waterStock)
    const recovered = move(start, 'workshop', 'well')
    expect(recovered).not.toBeNull()
    if (recovered !== null) expect(metrics(recovered).waterRate).toBeGreaterThan(metrics(start).waterRate)
  })

  it('measures spatial and Town frontiers without adding mechanics', () => {
    const connected = fixture(6, ['workshop', 'farm', 'farm', 'farm', 'well', 'well'])
    const split = fixture(6, ['workshop', 'farm', 'farm', 'farm', 'well', 'well'], true)
    expect(metrics(connected).networks).toBe(1)
    expect(metrics(split).networks).toBe(2)
    expect(metrics(split).accessible).toBeLessThanOrEqual(metrics(connected).accessible)
    expect(metrics(connected).townReview).toBe(true)
    expect(getProgression(connected).stage).toBe('town')
  })

  it('keeps frontier measurements deterministic and save/load stable', () => {
    const start = fixture(10, ['workshop', 'farm', 'well', 'farm', 'well', 'workshop', 'farm', 'well', 'workshop', 'farm'])
    const replay = fixture(10, ['workshop', 'farm', 'well', 'farm', 'well', 'workshop', 'farm', 'well', 'workshop', 'farm'])
    expect(metrics(start)).toEqual(metrics(replay))
    expect(hashCanonicalState(assignJobs(start))).toBe(hashCanonicalState(assignJobs(replay)))
    const restored = loadSave(serializeSave(start))
    expect(metrics(restored)).toEqual(metrics(start))
    expect(metrics(advance(restored, 8))).toEqual(metrics(advance(start, 8)))
  })
})
