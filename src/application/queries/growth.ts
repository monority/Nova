/**
 * Settlement growth status query (Step G1.1, feedback in G1.2, communication in
 * G1.3).
 *
 * Derived only: reports whether the settlement has reached the growth phase
 * (Town), whether it currently wants another Residence, the deterministic cell
 * growth would use, whether the cost is covered, and the single derived cause
 * growth is waiting on. Nothing is stored or persisted; the authoritative rule
 * lives in `domain/simulation/growth.ts`.
 *
 * `getGrowthMessage` is the player-facing projection of that state. It is a
 * pure function of canonical state (no UI-only logic, no hidden state), so the
 * HUD line, the tests and any future surface all read the same mapping.
 */

import { getBuildingDefinition } from '../../domain/building/building.js'
import {
  evaluateSettlementGrowth,
  type GrowthBlocker,
  type SettlementGrowthDecision,
} from '../../domain/simulation/growth.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export type GrowthStatus = SettlementGrowthDecision

export const getGrowthStatus = (state: SimulationState): GrowthStatus =>
  evaluateSettlementGrowth(state)

/**
 * One short, factual, player-facing line for the current growth state — the
 * single cause only, in the same "—" style as the objective/blocked lines, and
 * using existing NOVA terminology (Town, Residence, Water, Material, road).
 * Never exposes internal enum or query names.
 */
export const getGrowthMessage = (state: SimulationState): string => {
  const blocker: GrowthBlocker | null = evaluateSettlementGrowth(state).blocker
  switch (blocker) {
    case 'notTown':
      return 'Growth — waiting for Town'
    case 'noHousingPressure':
      return 'Growth — vacant Residence available'
    case 'waterShortage':
      return 'Growth — water shortage'
    case 'noWaterHeadroom':
      return 'Growth — needs more Water capacity'
    case 'noEligibleCell':
      return 'Growth — needs served road space'
    case 'unaffordable':
      return `Growth — needs ${getBuildingDefinition('residence').constructionCost} Material`
    case null:
      return 'Growth — ready'
  }
}
