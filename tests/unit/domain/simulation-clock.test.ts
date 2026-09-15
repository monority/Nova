import { describe, expect, it } from 'vitest'
import { advanceSimulationClock, createSimulationClock, TICKS_PER_YEAR } from '../../../src/domain/simulation/simulation-clock'

describe('simulation clock', () => {
    it('starts at day one of year one', () => {
        expect(createSimulationClock()).toEqual({ tick: 0, day: 1, year: 1 })
    })

    it('advances deterministically across years', () => {
        expect(advanceSimulationClock(createSimulationClock(), TICKS_PER_YEAR)).toEqual({ tick: 360, day: 1, year: 2 })
    })

    it('rejects invalid tick counts', () => {
        expect(() => advanceSimulationClock(createSimulationClock(), -1)).toThrow()
    })
})
