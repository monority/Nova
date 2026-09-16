import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/application/commands/create-world'
import { createDevelopmentZone, placeBuilding, placeRoad } from '../../src/application/commands/construction'
import { createInitialSettlement } from '../../src/application/scenarios/create-initial-settlement'
import {
  getSimulationStateHash,
  serializeCanonicalState,
  toCanonicalSimulationState,
} from '../../src/domain/simulation/canonical-state'
import { CANONICAL_TICK_PHASES, advanceSimulationTick } from '../../src/domain/simulation/simulation-state'
import { SimulationRuntime } from '../../src/engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../src/engine/simulation/simulation-stepper'

describe('step23 canonical tick', () => {
  it('declares the contract phase order explicitly', () => {
    expect([...CANONICAL_TICK_PHASES]).toEqual([
      'commands',
      'accessibility',
      'production',
      'consumption',
      'housing',
      'construction',
      'events',
      'hash',
    ])
  })

  it('advances exactly one day per tick', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 }))
    const next = advanceSimulationTick(state)
    expect(next.clock.currentTick).toBe(state.clock.currentTick + 1)
  })
})

describe('step23 canonical serialization', () => {
  it('serializes the same state identically twice', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 }))
    expect(serializeCanonicalState(toCanonicalSimulationState(state))).toBe(
      serializeCanonicalState(toCanonicalSimulationState(state)),
    )
    expect(getSimulationStateHash(state)).toBe(getSimulationStateHash(state))
  })

  it('is insensitive to collection insertion order', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 }))
    const reordered = {
      ...state,
      city: {
        ...state.city,
        buildings: [...state.city.buildings].reverse(),
        roads: [...state.city.roads].reverse(),
        zones: [...state.city.zones].reverse(),
        services: [...state.city.services].reverse(),
        occupancy: new Map([...state.city.occupancy.entries()].reverse()),
      },
    }
    expect(serializeCanonicalState(toCanonicalSimulationState(reordered))).toBe(
      serializeCanonicalState(toCanonicalSimulationState(state)),
    )
    expect(getSimulationStateHash(reordered)).toBe(getSimulationStateHash(state))
  })

  it('detects every real state difference', () => {
    const state = createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 }))
    const baseline = getSimulationStateHash(state)
    const variants = [
      { ...state, population: { total: state.population.total + 1, growthProgress: 0 } },
      { ...state, economy: { ...state.economy, food: state.economy.food + 1 } },
      {
        ...state,
        city: {
          ...state.city,
          buildings: state.city.buildings.map((building, index) =>
            index === 0 ? { ...building, position: { x: building.position.x + 1, y: building.position.y } } : building,
          ),
        },
      },
      {
        ...state,
        city: {
          ...state.city,
          buildings: state.city.buildings.map((building, index) =>
            index === 0 ? { ...building, type: 'farm' as const } : building,
          ),
        },
      },
      { ...state, city: { ...state.city, roads: state.city.roads.slice(1) } },
      { ...state, city: { ...state.city, zones: [] } },
      { ...state, clock: { ...state.clock, currentTick: state.clock.currentTick + 1 } },
    ]
    for (const variant of variants) {
      expect(getSimulationStateHash(variant)).not.toBe(baseline)
    }
  })

  it('produces a compact hex hash', () => {
    const state = createInitialSettlement(createWorld({ seed: 1, width: 8, height: 8 }))
    expect(getSimulationStateHash(state)).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('step23 deterministic simulation', () => {
  function freeCell(runtime: SimulationRuntime, offset: number) {
    const state = runtime.getState()
    const taken = new Set([
      ...state.city.buildings.map((b) => `${b.position.x}:${b.position.y}`),
      ...state.city.roads.map((r) => `${r.position.x}:${r.position.y}`),
    ])
    const cells = state.world.cells
      .filter((cell) => cell.buildable === 'buildable' && !taken.has(`${cell.x}:${cell.y}`))
      .sort((a, b) => a.y - b.y || a.x - b.x)
    const cell = cells[offset % cells.length]
    return { x: cell.x, y: cell.y }
  }

  function replay(ticks: number): string {
    const runtime = new SimulationRuntime(
      createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 })),
      deterministicSimulationStepper,
    )
    placeBuilding(runtime, { type: 'house', position: freeCell(runtime, 0) })
    placeRoad(runtime, { position: freeCell(runtime, 1) })
    placeBuilding(runtime, { type: 'farm', position: freeCell(runtime, 2) })
    createDevelopmentZone(runtime, {
      type: 'residential',
      cells: [freeCell(runtime, 3), freeCell(runtime, 4), freeCell(runtime, 5)],
    })
    runtime.advance(ticks)
    return getSimulationStateHash(runtime.getState())
  }

  it('replays the same seed, commands and ticks to the same hash', () => {
    for (const ticks of [1, 10, 100]) {
      expect(replay(ticks)).toBe(replay(ticks))
    }
  })

  it('diverges when commands differ', () => {
    expect(replay(10)).not.toBe(
      (() => {
        const runtime = new SimulationRuntime(
          createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 })),
          deterministicSimulationStepper,
        )
        placeBuilding(runtime, { type: 'farm', position: freeCell(runtime, 0) })
        runtime.advance(10)
        return getSimulationStateHash(runtime.getState())
      })(),
    )
  })

  it('STEP advances exactly one tick and one day', () => {
    const runtime = new SimulationRuntime(
      createInitialSettlement(createWorld({ seed: 4242, width: 16, height: 16 })),
      deterministicSimulationStepper,
    )
    runtime.setSpeed(100)
    runtime.step()
    expect(runtime.getState().clock.currentTick).toBe(1)
  })
})
