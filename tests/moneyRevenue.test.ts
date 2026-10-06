/**
 * Step001 — Money: taxes, commerce, maintenance.
 *
 * PINNED MEASUREMENTS. Public revenue is taxes per live inhabitant plus
 * commerce per connected operational Workshop; maintenance is due per
 * operational building. The treasury is uncapped by design.
 */

import { describe, expect, it } from 'vitest'

import {
  assignJobs,
  collectRevenue,
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  getBuildingInspection,
  getColonistInspection,
  getCommerceRevenuePerTick,
  getMaintenanceDuePerTick,
  getMoneyStock,
  getNetMoneyPerTick,
  getRevenuePerTick,
  getTaxRevenuePerTick,
  INITIAL_TREASURY,
  loadSave,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  payMaintenance,
  serializeSave,
  stepSimulation,
  TAX_PER_INHABITANT_PER_TICK,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const config: SimulationConfig = { world: { seed: 'nova-step001', width: 12, height: 12 } }

type BuildingType = 'workshop' | 'farm' | 'well' | 'residence'

const operational = (state: SimulationState, type: BuildingType, x: number, y: number): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) throw new Error('money: missing building')
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: { ...building, status: 'operational' as const, constructionRemaining: 0 },
    },
  }
}

const withOperationalRoads = (state: SimulationState, cells: { x: number; y: number }[]): SimulationState => {
  const roadCreated = createRoads(state, cells)
  const roads = { ...roadCreated.state.roads }
  for (const roadId of roadCreated.roadIds) {
    const road = roads[roadId]
    if (road !== undefined) {
      roads[roadId] = { ...road, status: 'operational' as const, constructionRemaining: 0 }
    }
  }
  return { ...roadCreated.state, roads }
}

/** One residence + N colonists, no workplaces, no roads. */
const residentsOnly = (count: number): SimulationState => {
  let state = createInitialState(config)
  for (let i = 0; i < count; i++) {
    state = operational(state, 'residence', i, 0)
  }
  const residenceIds = Object.keys(state.buildings)
    .filter((id) => state.buildings[id]?.type === 'residence')
    .sort()
  for (const resId of residenceIds) {
    state = createColonist(state, resId).state
  }
  return assignJobs(state)
}

/** One residence + one colonist + one workshop; connected iff roads built. */
const workshopFixture = (connected: boolean): SimulationState => {
  let state = createInitialState(config)
  state = operational(state, 'residence', 0, 0)
  state = operational(state, 'workshop', 0, 2)
  if (connected) {
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
  }
  const residenceId = Object.keys(state.buildings).find(
    (id) => state.buildings[id]?.type === 'residence'
  )
  if (residenceId === undefined) throw new Error('money: no residence')
  state = createColonist(state, residenceId).state
  return assignJobs(state)
}

describe('Step001 — taxes', () => {
  it('one live inhabitant pays the tax rate', () => {
    const state = residentsOnly(1)
    expect(getTaxRevenuePerTick(state)).toBe(TAX_PER_INHABITANT_PER_TICK)
  })

  it('taxes scale per inhabitant', () => {
    const state = residentsOnly(4)
    expect(getTaxRevenuePerTick(state)).toBe(4 * TAX_PER_INHABITANT_PER_TICK)
  })

  it('no inhabitants means no taxes', () => {
    const state = createInitialState(config)
    expect(getTaxRevenuePerTick(state)).toBe(0)
    expect(getRevenuePerTick(state)).toBe(0)
  })
})

describe('Step001 — commerce', () => {
  it('a connected operational Workshop earns the commerce rate', () => {
    const state = workshopFixture(true)
    expect(getCommerceRevenuePerTick(state)).toBe(
      COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('a roadless Workshop earns no commerce', () => {
    const state = workshopFixture(false)
    expect(getCommerceRevenuePerTick(state)).toBe(0)
  })

  it('a vacant connected Workshop still earns commerce (network, not labor)', () => {
    let state = createInitialState(config)
    state = operational(state, 'residence', 0, 0)
    state = operational(state, 'workshop', 0, 2)
    state = withOperationalRoads(state, [{ x: 0, y: 1 }])
    state = assignJobs(state)
    expect(getCommerceRevenuePerTick(state)).toBe(
      COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('an under-construction Workshop earns no commerce', () => {
    let state = createInitialState(config)
    state = operational(state, 'residence', 0, 0)
    const created = createBuilding(state, 'workshop', 0, 2, 2)
    state = withOperationalRoads(created.state, [{ x: 0, y: 1 }])
    expect(getCommerceRevenuePerTick(state)).toBe(0)
  })

  it('farms and wells never earn commerce', () => {
    let state = createInitialState(config)
    state = operational(state, 'residence', 0, 0)
    state = operational(state, 'farm', 0, 2)
    state = operational(state, 'well', 1, 2)
    state = withOperationalRoads(state, [{ x: 0, y: 1 }, { x: 1, y: 1 }])
    expect(getCommerceRevenuePerTick(state)).toBe(0)
  })
})

describe('Step001 — collectRevenue', () => {
  it('credits taxes plus commerce into the treasury', () => {
    const state = workshopFixture(true)
    const before = getMoneyStock(state)
    const after = collectRevenue(state)
    // 1 inhabitant tax + 1 connected workshop commerce.
    expect(getMoneyStock(after)).toBe(
      before + TAX_PER_INHABITANT_PER_TICK + COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('the treasury is uncapped: revenue always lands in full', () => {
    const base = workshopFixture(true)
    const rich: SimulationState = {
      ...base,
      resources: { ...base.resources, money: 100000 },
    }
    const after = collectRevenue(rich)
    expect(getMoneyStock(after)).toBe(
      100000 + TAX_PER_INHABITANT_PER_TICK + COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('returns the input reference when nothing is due', () => {
    const state = createInitialState(config)
    expect(collectRevenue(state)).toBe(state)
  })
})

describe('Step001 — maintenance', () => {
  it('every operational building pays, vacant included', () => {
    // residence + workshop = 2 operational buildings.
    const state = workshopFixture(true)
    expect(getMaintenanceDuePerTick(state)).toBe(
      2 * MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK
    )
  })

  it('under-construction buildings pay nothing', () => {
    let state = createInitialState(config)
    state = operational(state, 'residence', 0, 0)
    const created = createBuilding(state, 'workshop', 0, 2, 2)
    state = created.state
    expect(getMaintenanceDuePerTick(state)).toBe(
      MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK
    )
  })

  it('deducts maintenance from the treasury', () => {
    const state = workshopFixture(true)
    const before = getMoneyStock(state)
    const after = payMaintenance(state)
    expect(getMoneyStock(after)).toBe(before - getMaintenanceDuePerTick(state))
  })

  it('partial payment is clamped, never negative, never throws', () => {
    const base = workshopFixture(true)
    const broke: SimulationState = {
      ...base,
      resources: { ...base.resources, money: 0 },
    }
    const after = payMaintenance(broke)
    expect(getMoneyStock(after)).toBe(0)
  })

  it('net flow is revenue minus maintenance', () => {
    const state = workshopFixture(true)
    expect(getNetMoneyPerTick(state)).toBe(
      getRevenuePerTick(state) - getMaintenanceDuePerTick(state)
    )
  })
})

describe('Step001 — tick integration', () => {
  it('one tick moves the treasury by the net flow', () => {
    const state = workshopFixture(true)
    const before = getMoneyStock(state)
    // No command: revenue and maintenance only (no construction spending,
    // no starvation with a fed colonist).
    const after = stepSimulation(state)
    expect(getMoneyStock(after)).toBe(before + getNetMoneyPerTick(state))
  })

  it('treasury starts at the initial grant', () => {
    expect(getMoneyStock(createInitialState(config))).toBe(INITIAL_TREASURY)
  })
})

describe('Step001 — inspection', () => {
  it('a connected Workshop reports its commerce contribution', () => {
    const state = workshopFixture(true)
    const workshopId = Object.keys(state.buildings).find(
      (id) => state.buildings[id]?.type === 'workshop'
    )
    if (workshopId === undefined) throw new Error('money: no workshop')
    expect(getBuildingInspection(state, workshopId)?.revenueContribution).toBe(
      COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK
    )
  })

  it('a roadless Workshop reports zero contribution', () => {
    const state = workshopFixture(false)
    const workshopId = Object.keys(state.buildings).find(
      (id) => state.buildings[id]?.type === 'workshop'
    )
    if (workshopId === undefined) throw new Error('money: no workshop')
    expect(getBuildingInspection(state, workshopId)?.revenueContribution).toBe(0)
  })

  it('employment mints nothing per colonist anymore', () => {
    const state = workshopFixture(true)
    const colonistId = Object.keys(state.colonists)[0]
    if (colonistId === undefined) throw new Error('money: no colonist')
    const inspection = getColonistInspection(state, colonistId)
    expect(inspection).not.toBeNull()
    expect(inspection).not.toHaveProperty('materialIncome')
  })
})

describe('Step001 — save continuity', () => {
  it('money survives a serialize/load round-trip', () => {
    const state = workshopFixture(true)
    const restored = loadSave(serializeSave(state))
    expect(getMoneyStock(restored)).toBe(getMoneyStock(state))
  })
})
