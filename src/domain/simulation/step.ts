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
  collectRevenue,
  consumeFood,
  consumeWater,
  payMaintenance,
  produceFood,
  produceStone,
  produceWater,
  produceWood,
  progressPlacedRoads,
  releaseCompletedConstructionCrew,
  updateNeeds,
  updatePopulation,
} from './phases.js'
import { growSettlement } from './growth.js'
import { getWaterCoverage, hasOperationalWell, waterPotentialProductionForTick } from '../water/water.js'
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

  // Step001: no reserve release — the treasury is directly spendable.
  // Phase 3: food need — derived from the colony before admission.
  const requiredFood = updateNeeds(constructed)

  // Phase 4: farm production into the shared stock.
  const produced = produceFood(constructed)

  // Phase 4b: Well production into the shared Water stock.
  const watered = produceWater(produced)

  // Phase 4c: wood extraction from finite deposits (Step003). Staffed Lumber
  // Camps + the Colony Center's unstaffed primitive collection; decrements
  // the deposits. Runs before commands so a same-tick placement sees the
  // pre-extraction deposits (same convention as food/water production).
  const extractedWood = produceWood(watered)

  // Phase 4d: stone extraction from finite deposits (Step005). Staffed
  // Quarries only — wood remains the primitive recovery resource, so the
  // Colony Center does not collect stone.
  const extractedStone = produceStone(extractedWood)

  // Phase 5: all-or-nothing colony feeding.
  const consumed = consumeFood(extractedStone, requiredFood)

  // Phase 5b: Water coverage/consumption (Step 10P).
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null
      ? 0
      : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK

  // Deadlock fix: the admission gate reads POTENTIAL Water production
  // (staffed Wells plus vacant Wells a worker could reach), not just
  // staffed output — the colony that only lacks the worker the admission
  // itself provides must be able to progress. The stock shortage is excused
  // exactly while potential covers current need; genuinely insufficient
  // capacity still blocks via both guards in `updatePopulation`.
  const productionCapacity =
    coverage === null ? 0 : waterPotentialProductionForTick(consumed.state)
  const shortageExcused =
    coverage !== null && productionCapacity >= servedNeed
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
          shortage: waterConsumed.shortage && !shortageExcused,
          servedResidenceIds: new Set(coverage.servedResidenceIds),
          productionCapacity,
          servedNeed,
        }
  )

  // Phase 7: deterministic employment.
  const staffed = assignJobs(populated)

  // Phase 7: public revenue (taxes + commerce) into the treasury.
  const funded = collectRevenue(staffed)

  // Phase 8a: player construction transaction (Step 08G §5).
  const commanded = applyCommand(funded, lateCommand)

  const progressed = progressPlacedRoads(commanded.state, commanded)

  // Phase 8c: demand-driven settlement growth (Step G1.1). Runs after the
  // player's command (player priority) and after road progress, before upkeep;
  // at most one autonomous Residence construction per tick.
  const grown = growSettlement(progressed)

  // Phase 8b: building maintenance.
  const maintained = payMaintenance(grown)

  // Release completed construction crews.
  const released = releaseCompletedConstructionCrew(maintained)

  return advanceTime(released)
}
