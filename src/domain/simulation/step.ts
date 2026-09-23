/**
 * Simulation entry point.
 *
 *   stepSimulation(state, command?) -> new SimulationState
 *
 * Pure: never mutates `state`, always produces a new canonical state.
 * Deterministic: same input state + same command => same output state,
 * regardless of environment, frame rate or execution moment (docs/31).
 *
 * Step 10BG: Settlement phase adds a centralized storage hub. Storage captures
 * production overflow that would otherwise be discarded — it does NOT
 * reduce resources available for construction or consumption.
 */

import type { SimulationCommand } from './command.js'
import {
  advanceConstruction,
  advanceTime,
  applyCommand,
  assignJobs,
  consumeFood,
  consumeWater,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedRoads,
  releaseCompletedConstructionCrew,
  updateNeeds,
  updatePopulation,
  upkeepBuildings,
} from './phases.js'
import { getWaterCoverage, hasOperationalWell, waterProductionForTick } from '../water/water.js'
import { WATER_PER_COLONIST_PER_TICK } from '../resource/resource.js'
import type { SimulationState } from './state.js'

export const stepSimulation = (
  state: SimulationState,
  command?: SimulationCommand
): SimulationState => {

  const isCrewCommand =
    command !== undefined && command.type === 'assignConstructionCrew'
  const preResolved = isCrewCommand ? applyCommand(state, command).state : state
  const lateCommand = isCrewCommand ? undefined : command

  // Phase 1: Construction progress / lifecycle.
  const constructed = advanceConstruction(preResolved)

  // Phase 3: food need — derived from the colony before admission.
  const requiredFood = updateNeeds(constructed)

  // Phase 4: farm production into the shared stock.
  const produced = produceFood(constructed)

  // Phase 4b: Well production into the shared Water stock.
  const watered = produceWater(produced)

  // Phase 5: all-or-nothing colony feeding.
  const consumed = consumeFood(watered, requiredFood)

  // Phase 5b: Water coverage/consumption (Step 10P).
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null
      ? 0
      : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK

  const productionCapacity =
    coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null
      ? { state: consumed.state, shortage: false }
      : consumeWater(consumed.state, servedNeed)

  // Phase 6: population — starvation then food-and-water-gated admission.
  const populated = updatePopulation(
    waterConsumed.state,
    consumed.fed,
    coverage === null
      ? undefined
      : {
          shortage: waterConsumed.shortage,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )

  // Phase 7: deterministic employment.
  const staffed = assignJobs(populated)

  // Phase 8: labor output into the construction stock.
  const materialized = produceMaterial(staffed)

  // Phase 8a: player construction transaction (Step 08G §5).
  const commanded = applyCommand(materialized, lateCommand)

  const progressed = progressPlacedRoads(commanded.state, commanded)

  // Phase 8b: operational upkeep.
  const maintained = upkeepBuildings(progressed)

  // Release completed construction crews.
  const released = releaseCompletedConstructionCrew(maintained)

  return advanceTime(released)
}
