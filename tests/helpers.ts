import { createInitialState, type SimulationConfig } from '@/index'

export const testConfig: SimulationConfig = {
  world: { seed: 'nova-step0', width: 8, height: 8 },
}

export const createTestState = () => createInitialState(testConfig)
