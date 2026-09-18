/**
 * GameController (Step 1 #8).
 *
 * The single sanctioned path from user intent to simulation change:
 *
 *   command -> dispatchCommand -> stepSimulation -> new canonical state
 *           -> toRenderSnapshot -> renderer + UI listeners
 *
 * UI/renderer never mutate SimulationState directly. The controller holds
 * the current canonical state reference; everything else is derived.
 */

import { dispatchCommand, type SimulationCommand, type SimulationState } from '../index.js'
import { toRenderSnapshot, type RenderSnapshot } from '../application/queries/renderSnapshot.js'

export interface GameController {
  getState: () => SimulationState
  getSnapshot: () => RenderSnapshot
  /** Apply an optional player command as one simulation tick. */
  dispatch: (command?: SimulationCommand) => void
  /** Subscribe to canonical state changes (renderer + UI). */
  subscribe: (listener: (state: SimulationState) => void) => () => void
}

export const createGameController = (
  initialState: SimulationState
): GameController => {
  let state = initialState
  const listeners = new Set<(state: SimulationState) => void>()

  const notify = (): void => {
    for (const listener of listeners) {
      listener(state)
    }
  }

  return {
    getState: () => state,
    getSnapshot: () => toRenderSnapshot(state),
    dispatch: (command) => {
      const next = dispatchCommand(state, command)
      if (next !== state) {
        state = next
        notify()
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
