import { describe, expect, it } from 'vitest'
import {
  COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK,
  createBuilding,
  createColonist,
  createInitialState,
  countStaffedOperationalWorkshops,
  getEmploymentSummary,
  getProductiveFarmWorkerCount,
  getProductiveWorkerCount,
  MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK,
  TAX_PER_INHABITANT_PER_TICK,
  type SimulationConfig,
} from '@/index'

const testConfig: SimulationConfig = {
  world: { seed: 'audit-hardening', width: 10, height: 10 },
}

describe('Audit hardening regression tests', () => {
  it('pins the Step001 money rates (taxes, commerce, maintenance)', () => {
    expect(TAX_PER_INHABITANT_PER_TICK).toBe(1)
    expect(COMMERCE_PER_CONNECTED_WORKSHOP_PER_TICK).toBe(2)
    expect(MAINTENANCE_PER_OPERATIONAL_BUILDING_PER_TICK).toBe(1)
  })

  it('getProductiveWorkerCount scopes exclusively to Workshop workers in mixed economies', () => {
    let state = createInitialState(testConfig)

    // Add 1 Residence with colonist
    const r1 = createBuilding(state, 'residence', 0, 0, 0)
    state = {
      ...r1.state,
      buildings: {
        ...r1.state.buildings,
        [r1.buildingId]: { ...r1.state.buildings[r1.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }
    const c1 = createColonist(state, r1.buildingId)
    state = c1.state

    // Add 1 Residence with colonist
    const r2 = createBuilding(state, 'residence', 0, 2, 0)
    state = {
      ...r2.state,
      buildings: {
        ...r2.state.buildings,
        [r2.buildingId]: { ...r2.state.buildings[r2.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }
    const c2 = createColonist(state, r2.buildingId)
    state = c2.state

    // Add 1 Residence with colonist
    const r3 = createBuilding(state, 'residence', 0, 4, 0)
    state = {
      ...r3.state,
      buildings: {
        ...r3.state.buildings,
        [r3.buildingId]: { ...r3.state.buildings[r3.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }
    const c3 = createColonist(state, r3.buildingId)
    state = c3.state

    // Add 1 operational Farm
    const f1 = createBuilding(state, 'farm', 2, 0, 0)
    state = {
      ...f1.state,
      buildings: {
        ...f1.state.buildings,
        [f1.buildingId]: { ...f1.state.buildings[f1.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }

    // Add 1 operational Well
    const w1 = createBuilding(state, 'well', 2, 2, 0)
    state = {
      ...w1.state,
      buildings: {
        ...w1.state.buildings,
        [w1.buildingId]: { ...w1.state.buildings[w1.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }

    // Add 1 operational Workshop
    const ws1 = createBuilding(state, 'workshop', 2, 4, 0)
    state = {
      ...ws1.state,
      buildings: {
        ...ws1.state.buildings,
        [ws1.buildingId]: { ...ws1.state.buildings[ws1.buildingId]!, status: 'operational', constructionRemaining: 0 },
      },
    }

    // Staff c1 at Farm, c2 at Well, c3 at Workshop
    state = {
      ...state,
      colonists: {
        ...state.colonists,
        [c1.colonistId]: { ...state.colonists[c1.colonistId]!, workplaceId: f1.buildingId },
        [c2.colonistId]: { ...state.colonists[c2.colonistId]!, workplaceId: w1.buildingId },
        [c3.colonistId]: { ...state.colonists[c3.colonistId]!, workplaceId: ws1.buildingId },
      },
    }

    const summary = getEmploymentSummary(state)
    expect(summary.employed).toBe(3)
    expect(getProductiveFarmWorkerCount(state)).toBe(1)
    expect(countStaffedOperationalWorkshops(state)).toBe(1)

    // Workshop labor only: exactly 1 worker produces Material
    expect(getProductiveWorkerCount(state)).toBe(1)
  })
})
