import {
  STAGE_LABELS,
  countHousingStock,
  evaluateCivilizationStage,
  type CivilizationStage,
} from '../../domain/civilization'
import type { SimulationState } from '../../domain/simulation/simulation-state'
import type { UrbanChangeGroup } from './simulation-events'

export function toCivilizationStage(state: SimulationState): CivilizationStage {
  return evaluateCivilizationStage({ population: state.population.total, houses: countHousingStock(state.city) })
}

export interface StageTransition {
  readonly previous: CivilizationStage
  readonly current: CivilizationStage
  readonly tick: number
}

/** Detect a real stage change between two committed states. Null when unchanged. */
export function detectStageTransition(previous: SimulationState, current: SimulationState): StageTransition | null {
  const before = toCivilizationStage(previous)
  const after = toCivilizationStage(current)
  if (before === after) return null
  return { previous: before, current: after, tick: current.clock.currentTick }
}

const TRANSITION_LABELS: Readonly<Record<CivilizationStage, string>> = {
  wilderness: 'WILDERNESS',
  settlement: 'SETTLEMENT ESTABLISHED',
  village: 'VILLAGE ESTABLISHED',
  town: 'TOWN ESTABLISHED',
}

/**
 * Project a stage transition as a feed group. No selectable object exists,
 * so the group carries no changes; the feed must not attempt selection.
 */
export function projectStageTransitionGroup(
  previous: SimulationState,
  current: SimulationState,
): UrbanChangeGroup | null {
  const transition = detectStageTransition(previous, current)
  if (!transition) return null
  return {
    key: `${transition.tick}:STAGE:${transition.current}`,
    changes: [],
    label: TRANSITION_LABELS[transition.current] ?? STAGE_LABELS[transition.current],
    context: { zone: null, adjacentToRoad: false, nearCommunityService: false },
    tick: transition.tick,
  }
}
