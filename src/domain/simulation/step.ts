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
  consumeWater,
  produceFood,
  produceMaterial,
  produceWater,
  progressPlacedBuilding,
  progressPlacedRoads,
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
  // Construction progress / lifecycle. Runs BEFORE the player transaction
  // (Step 08G §5): a placed building misses this slot and is progressed
  // once explicitly below, preserving the 2-tick completion contract.
  const constructed = advanceConstruction(state)
  // Phase 3: food need — derived from the colony before admission.
  const requiredFood = updateNeeds(constructed)
  // Phase 4: farm production into the shared stock.
  const produced = produceFood(constructed)
  // Phase 4b: Well production into the shared Water stock.
  const watered = produceWater(produced)
  // Phase 5: all-or-nothing colony feeding.
  const consumed = consumeFood(watered, requiredFood)
  // Phase 5b: Water coverage/consumption (Step 10P). Coverage is derived once
  // per tick from the existing 09D/09E network data and reused for the need
  // and the admission gate. Water shortage is a growth gate, never a survival
  // gate — Food starvation below remains the only population-loss rule.
  // Bootstrap rule: the Water gate only activates once the colony owns an
  // operational Well, because the first colonist cannot exist to staff a Well
  // before the first admission.
  const waterActive = hasOperationalWell(consumed.state)
  const coverage = waterActive ? getWaterCoverage(consumed.state) : null
  const servedNeed =
    coverage === null
      ? 0
      : coverage.servedColonistIds.length * WATER_PER_COLONIST_PER_TICK
  // Step 10S: the growth gate is Water production CAPACITY, not stock. The
  // capacity is derived once per tick from the same coverage the admission
  // gate uses; the stock stays the consumable resource.
  const productionCapacity =
    coverage === null ? 0 : waterProductionForTick(consumed.state)
  const waterConsumed =
    coverage === null
      ? { state: consumed.state, shortage: false }
      : consumeWater(consumed.state, servedNeed)
  // Phase 6: population — starvation (when the tick was not fed) then
  // food-and-water-gated admission. The fed/starved decision is passed
  // explicitly; Water only restricts admission.
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
  // Phase 7: deterministic employment. Runs after population so a colonist
  // admitted this tick can be employed this tick.
  const staffed = assignJobs(populated)
  // Phase 8: labor output into the construction stock. Runs after employment
  // and after starvation, so a starved worker produces nothing this tick.
  const materialized = produceMaterial(staffed)
  // Phase 8a: player construction transaction (Step 08G §5). Runs after
  // production so this tick's STORED output is spendable at the valid point
  // in the flow (a lone staffed Workshop crests 25 mid-tick, never at rest),
  // before upkeep so upkeep sees the post-construction stock. Consumes
  // authoritative stock only: overflow was already discarded by the 08F
  // storage clamp, and affordability still means current stock >= cost (§13).
  const commanded = applyCommand(materialized, command)
  // The placed building / roads missed this tick's construction progress:
  // catch each up once so catalog completion timing is unchanged (Step 08G,
  // Step 09C Phase D). At most one command type applies per tick, so only
  // one of the two catch-ups ever does work.
  const progressedBuilding = progressPlacedBuilding(commanded)
  const progressed = progressPlacedRoads(progressedBuilding, commanded)
  // Phase 8b: operational upkeep (Step 08C). Runs after production so
  // same-tick output pays same-tick upkeep, and after construction so a
  // 25-cost build from a 25 stock leaves upkeep 0 under the existing
  // partial-clamp semantics (Step 08G §11). No debt, no deactivation.
  const maintained = upkeepBuildings(progressed)
  // Phase 9: advance simulation time.
  return advanceTime(maintained)
}
