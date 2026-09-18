/**
 * Simulation entry point.
 *
 *   stepSimulation(state, command?) -> new SimulationState
 *
 * Pure: never mutates `state`, always produces a new canonical state.
 * Deterministic: same input state + same command => same output state,
 * regardless of environment, frame rate or execution moment (docs/31).
 */

import type { SimulationCommand } from './command.js'
import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  produceFood,
  produceMaterial,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
} from './phases.js'
import type { SimulationState } from './state.js'

export const stepSimulation = (
  state: SimulationState,
  command?: SimulationCommand
): SimulationState => {
  // Phase 1: apply player command.
  const applied = applyCommand(state, command)
  // Phase 2: construction / lifecycle.
  const constructed = advanceConstruction(applied.state)
  // Phase 3: food need — derived from the colony before admission.
  const requiredFood = updateNeeds(constructed)
  // Phase 4: farm production into the shared stock.
  const produced = produceFood(constructed)
  // Phase 5: all-or-nothing colony feeding.
  const consumed = consumeFood(produced, requiredFood)
  // Phase 6: population — starvation (when the tick was not fed) then
  // food-gated admission. The fed/starved decision is passed explicitly.
  const populated = updatePopulation(consumed.state, consumed.fed)
  // Phase 7: deterministic employment. Runs after population so a colonist
  // admitted this tick can be employed this tick.
  const staffed = assignJobs(populated)
  // Phase 8: labor output into the construction stock. Runs after employment
  // and after starvation, so a starved worker produces nothing this tick.
  const materialized = produceMaterial(staffed)
  // Phase 8b: operational upkeep (Step 08C). Runs after production so
  // same-tick output pays same-tick upkeep; partial payment on deficit.
  const maintained = upkeepBuildings(materialized)
  // Phase 9: advance simulation time.
  return advanceTime(maintained)
}
