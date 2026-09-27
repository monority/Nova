/**
 * Settlement growth status query (Step G1.1).
 *
 * Derived only: reports whether the settlement has reached the growth phase
 * (Town), whether it currently wants another Residence, the deterministic cell
 * growth would use, and whether the cost is covered. Nothing is stored or
 * persisted; the authoritative rule lives in
 * `domain/simulation/growth.ts`.
 */

import {
  evaluateSettlementGrowth,
  type SettlementGrowthDecision,
} from '../../domain/simulation/growth.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export type GrowthStatus = SettlementGrowthDecision

export const getGrowthStatus = (state: SimulationState): GrowthStatus =>
  evaluateSettlementGrowth(state)
