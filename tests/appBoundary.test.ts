import { describe, expect, it } from 'vitest'

import { hashCanonicalState, type SimulationState } from '@/index'
import { createGameController } from '@/app/gameController.js'
import { createSimulationClock, type SimulationClock } from '@/app/simulationClock.js'
import { createTestState } from './helpers.js'

describe('game controller command flow', () => {
  it('dispatch goes through the application command dispatcher, not direct mutation', () => {
    const controller = createGameController(createTestState())
    const before = hashCanonicalState(controller.getState())

    controller.dispatch({ type: 'placeBuilding', x: 1, y: 1, buildingType: 'residence' })

    const after = controller.getState()
    expect(hashCanonicalState(after)).not.toBe(before)
    expect(Object.keys(after.buildings)).toEqual(['building-1'])
    expect(after.time.tick).toBe(1)
  })

  it('invalid placement adds no building but still advances time one tick', () => {
    const controller = createGameController(createTestState())
    controller.dispatch({ type: 'placeBuilding', x: 1, y: 1, buildingType: 'residence' })
    const afterFirst = controller.getState()
    controller.dispatch({ type: 'placeBuilding', x: 1, y: 1, buildingType: 'residence' })
    const afterSecond = controller.getState()
    // Only one building: rejected placement changed nothing structural.
    expect(Object.keys(afterSecond.buildings)).toEqual(['building-1'])
    // But simulation time always advances (dispatch = one tick).
    expect(afterSecond.time.tick).toBe(afterFirst.time.tick + 1)
  })

  it('notifies subscribers on each dispatched tick, never duplicates', () => {
    const controller = createGameController(createTestState())
    let notifications = 0
    controller.subscribe(() => {
      notifications += 1
    })
    controller.dispatch() // tick advances time => notify
    // Rejected placement still advances time => notify; no building added.
    controller.dispatch({ type: 'placeBuilding', x: -5, y: -5, buildingType: 'residence' })
    expect(notifications).toBe(2)
    expect(Object.keys(controller.getState().buildings)).toHaveLength(0)
  })

  it('exposes derived render snapshot', () => {
    const controller = createGameController(createTestState())
    controller.dispatch({ type: 'placeBuilding', x: 0, y: 0, buildingType: 'residence' })
    const snapshot = controller.getSnapshot()
    expect(snapshot.tick).toBe(1)
    expect(snapshot.buildings[0]?.id).toBe('building-1')
  })

  it('keeps canonical state independent of renderer presence', () => {
    const isolated: SimulationState = createTestState()
    const controller = createGameController(isolated)
    controller.dispatch({ type: 'placeBuilding', x: 2, y: 2, buildingType: 'residence' })
    // Original state object untouched (purity preserved through controller).
    expect(Object.keys(isolated.buildings)).toHaveLength(0)
  })
})

describe('simulation clock', () => {
  const makeClock = (): { clock: SimulationClock; ticks: () => number } => {
    let tickCount = 0
    const clock = createSimulationClock({
      baseTicksPerSecond: 2, // 500 ms per tick at 1x
      onTick: () => {
        tickCount += 1
      },
    })
    return { clock, ticks: () => tickCount }
  }

  it('does not advance when paused', () => {
    const { clock, ticks } = makeClock()
    clock.accumulate(10_000)
    expect(ticks()).toBe(0)
  })

  it('advances at configured rate when playing', () => {
    const { clock, ticks } = makeClock()
    clock.play()
    clock.accumulate(1000) // 1s at 2 ticks/s => 2 ticks
    expect(ticks()).toBe(2)
  })

  it('speed multiplies the tick rate', () => {
    const { clock, ticks } = makeClock()
    clock.setSpeed(4)
    clock.play()
    clock.accumulate(500) // 500ms at 8 ticks/s => 4 ticks
    expect(ticks()).toBe(4)
  })

  it('caps catch-up ticks per frame', () => {
    const { clock, ticks } = makeClock()
    clock.setSpeed(4)
    clock.play()
    clock.accumulate(60_000) // stalled tab: bounded burst, not 480 ticks
    expect(ticks()).toBe(8)
  })

  it('STEP advances exactly one tick', () => {
    const { clock, ticks } = makeClock()
    clock.stepOnce()
    clock.stepOnce()
    expect(ticks()).toBe(2)
    // STEP pauses implicit in app: accumulate after stepOnce does nothing.
    clock.accumulate(5000)
    expect(ticks()).toBe(2)
  })

  it('pause resets accumulation', () => {
    const { clock, ticks } = makeClock()
    clock.play()
    clock.accumulate(400)
    clock.pause()
    clock.play()
    clock.accumulate(100)
    expect(ticks()).toBe(0)
  })
})
