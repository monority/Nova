/**
 * Simulation phases (docs/11-time-and-events.md).
 *
 * Phase order is part of the simulation contract. Step 07C order, with the
 * Step 08G construction-transaction position:
 *
 *   1. advanceConstruction - construction progress -> operational
 *   2. updateNeeds         - derive food requirement from the colony (docs/11 #4)
 *   3. produceFood         - operational farms add food (Step 06B, Phase 4)
 *   4. consumeFood         - all-or-nothing feeding (docs/11 #5)
 *   5. updatePopulation    - starvation then food-gated admission (docs/11 #9)
 *   6. assignJobs          - deterministic Workshop employment (Step 07C §4)
 *   7. produceMaterial     - employed colonists add construction material,
 *       clamped to operational Workshop storage (Step 08F §5)
 *   8a. applyCommand       - player construction transaction (Step 08G §5):
 *       validated against the post-production stock, deducted before upkeep,
 *       never negative, atomic (check -> deduct -> create)
 *   8b. upkeepBuildings    - staffed operational Workshops pay 1 material
 *       (Step 08C, after production AND after construction, before time:
 *       partial payment clamped to stock, never negative, no deactivation,
 *       no debt)
 *   9. advanceTime         - tick += 1
 *
 * Production (4) precedes consumption (5): food produced on the tick a farm
 * becomes operational — or on any tick the colony would otherwise starve —
 * saves the colony on THAT tick, not the next one. Deterministic and tested.
 *
 * Jobs (7-8) come after population (6) and before time (9), so:
 *
 *   - a colonist admitted on tick N is assigned and produces on tick N;
 *   - a Workshop operational on tick N is staffed and produces on tick N;
 *   - starvation on tick N removes workers BEFORE produceMaterial, so no
 *     colonist produces construction material on the tick they starve.
 *
 * Every phase is a pure function: (state, ...) -> new state.
 * No phase mutates its input. No phase depends on rendering, UI,
 * wall-clock time or randomness.
 */

import { BUILDING_CATALOG, type BuildingState, type BuildingType } from '../building/building.js'
import {
  availableResidenceIds,
  iterateBuildings,
  iterateColonists,
} from '../housing/housing.js'
import { countEmployedWorkers, countWorkersAt, isOperationalWorkshop } from '../jobs/jobs.js'
import type { ColonistState } from '../population/colonist.js'
import {
  deductFood,
  deductResources,
  FOOD_PER_COLONIST_PER_TICK,
  FOOD_PER_FARM_PER_TICK,
  hasSufficientFood,
  hasSufficientResources,
  MATERIAL_PER_WORKER_PER_TICK,
  MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP,
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK,
} from '../resource/resource.js'
import type { CellCoordinate } from '../world/grid.js'
import { isInBounds } from '../world/grid.js'
import type { SimulationCommand } from './command.js'
import {
  createBuilding,
  createColonist,
  type SimulationState,
} from './state.js'

// ---------------------------------------------------------------------------
// Player construction transaction (Step 08G §5)
// ---------------------------------------------------------------------------

/** A cell is occupied iff a building exists on it. */
export const isCellOccupied = (
  state: SimulationState,
  cell: CellCoordinate
): boolean => {
  for (const building of iterateBuildings(state)) {
    if (building.x === cell.x && building.y === cell.y) {
      return true
    }
  }
  return false
}

export interface CommandApplicationResult {
  readonly state: SimulationState
  readonly accepted: boolean
  readonly reason: string | null
  /**
   * Id of the building created by an accepted placeBuilding command, else
   * null. Lets the tick orchestrator (step.ts) progress exactly the new
   * building once: the transaction runs after this tick's construction
   * progress, so the placed building missed its progress slot (Step 08G).
   */
  readonly placedBuildingId: string | null
}

/**
 * Placement validation. Single source of truth: used by the simulation
 * phase (applyCommand) and by application queries (hover indicator).
 * Two distinct constraint categories stay distinguishable (Step 4 §4):
 * spatial validity and resource availability.
 */
export type PlacementValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'unknownBuildingType' | 'outOfBounds' | 'cellOccupied' | 'insufficientResources' }

export const validatePlacement = (
  state: SimulationState,
  cell: CellCoordinate,
  buildingType: BuildingType
): PlacementValidation => {
  const definition = BUILDING_CATALOG[buildingType]
  if (definition === undefined) {
    return { valid: false, reason: 'unknownBuildingType' }
  }
  if (!isInBounds(state.config.world, cell)) {
    return { valid: false, reason: 'outOfBounds' }
  }
  if (isCellOccupied(state, cell)) {
    return { valid: false, reason: 'cellOccupied' }
  }
  if (!hasSufficientResources(state.resources, definition.constructionCost)) {
    return { valid: false, reason: 'insufficientResources' }
  }
  return { valid: true }
}

/**
 * Valid placement: known type, inside bounds, free cell, affordable against
 * the stock of the state this runs on. Invalid command = explicit no-op
 * (same canonical state), never an error thrown across the phase boundary.
 *
 * Step 08G §5: the orchestrator runs this AFTER produceMaterial, so the
 * validated stock already includes this tick's STORED production (never
 * hypothetical overflow: the 08F clamp discarded it before this runs), and
 * BEFORE upkeepBuildings, so upkeep sees the post-construction stock.
 */
export const applyCommand = (
  state: SimulationState,
  command: SimulationCommand | undefined
): CommandApplicationResult => {
  if (command === undefined) {
    return { state, accepted: false, reason: null, placedBuildingId: null }
  }
  switch (command.type) {
    case 'placeBuilding': {
      const cell = { x: command.x, y: command.y }
      const validation = validatePlacement(state, cell, command.buildingType)
      if (!validation.valid) {
        return { state, accepted: false, reason: validation.reason, placedBuildingId: null }
      }
      const definition = BUILDING_CATALOG[command.buildingType]
      // Atomic (Step 4 §6, Step 08G §7/§14): building creation and resource
      // deduction happen in the same pure step; a rejected placement changes
      // neither. Deduction consumes authoritative stock only.
      const created = createBuilding(
        state,
        command.buildingType,
        cell.x,
        cell.y,
        definition.constructionTicks
      )
      const deducted = deductResources(created.state.resources, definition.constructionCost)
      return {
        state: { ...created.state, resources: deducted },
        accepted: true,
        reason: null,
        placedBuildingId: created.buildingId,
      }
    }
  }
}

/**
 * Catch-up progress for a newly placed building (Step 08G). The construction
 * transaction runs after advanceConstruction, so the placed building missed
 * this tick's progress slot; progress it once to preserve the catalog 2-tick
 * completion contract (placed tick: 2 -> 1, next tick: 1 -> 0 operational).
 * Reuses progressOneBuilding, so a hypothetical 1-tick catalog entry would
 * complete exactly as if placed before advanceConstruction. No-op when no
 * building was placed, or when the id is absent (defensive: never throws).
 */
export const progressPlacedBuilding = (
  result: CommandApplicationResult
): SimulationState => {
  if (result.placedBuildingId === null) {
    return result.state
  }
  const placed = result.state.buildings[result.placedBuildingId]
  if (placed === undefined) {
    return result.state
  }
  const advanced = progressOneBuilding(placed)
  if (advanced === placed) {
    return result.state
  }
  return {
    ...result.state,
    buildings: { ...result.state.buildings, [advanced.id]: advanced },
  }
}

// ---------------------------------------------------------------------------
// Phase 2 - Construction / lifecycle
// ---------------------------------------------------------------------------

/** progressConstruction is pure; remaining reaches 0 => operational. */
export const progressOneBuilding = (
  building: BuildingState,
): BuildingState => {
  if (building.status === 'operational') {
    return building
  }
  const remaining = building.constructionRemaining - 1
  if (remaining < 0) {
    throw new Error(
      `Construction below zero for ${building.id}`
    )
  }
  if (remaining === 0) {
    return { ...building, status: 'operational', constructionRemaining: 0 }
  }
  return { ...building, constructionRemaining: remaining }
}

export const advanceConstruction = (
  state: SimulationState
): SimulationState => {
  const nextBuildings: Record<string, BuildingState> = {}
  let changed = false
  for (const building of iterateBuildings(state)) {
    const progressed = progressOneBuilding(building)
    nextBuildings[building.id] = progressed
    if (progressed !== building) {
      changed = true
    }
  }
  if (!changed) {
    return state
  }
  return { ...state, buildings: nextBuildings }
}

// ---------------------------------------------------------------------------
// Phase 3 - Food need (Step 05)
// ---------------------------------------------------------------------------

/** Number of live colonists (pure colony count over canonical state). */
export const getPopulationCount = (state: SimulationState): number =>
  Object.keys(state.colonists).length

/**
 * The need is derived, never stored (Step 05B §Food need semantics): every
 * live colonist requires FOOD_PER_COLONIST_PER_TICK food unit(s) this tick.
 * Consumption (phase 4) runs on the population BEFORE admission, so a
 * colonist admitted in this tick is first fed next tick.
 */
export const updateNeeds = (state: SimulationState): number =>
  getPopulationCount(state) * FOOD_PER_COLONIST_PER_TICK

export interface FoodConsumptionResult {  readonly state: SimulationState
  /**
   * True when the whole colony was fed this tick, false on a shortage tick.
   * Intra-tick value only: never stored in canonical state, never persisted,
   * never hashed (Step 05C §4).
   */
  readonly fed: boolean
}

/**
 * All-or-nothing colony feeding (Step 05B §Food resource semantics).
 *
 * - requiredFood === 0: nothing is consumed, the tick is vacuously fed.
 * - food >= requiredFood: deduct exactly `requiredFood`.
 * - food < requiredFood: shortage — the reserve is exhausted to 0 and the
 *   tick is NOT fed. No partial deduction, no error thrown across the phase
 *   boundary (same spirit as Step 04 placement rejection).
 */
export const consumeFood = (
  state: SimulationState,
  requiredFood: number
): FoodConsumptionResult => {
  if (requiredFood < 0) {
    throw new Error(`Negative food requirement: ${requiredFood}`)
  }
  if (requiredFood === 0) {
    return { state, fed: true }
  }
  if (hasSufficientFood(state.resources, requiredFood)) {
    return {
      state: { ...state, resources: deductFood(state.resources, requiredFood) },
      fed: true,
    }
  }
  return {
    state: { ...state, resources: { ...state.resources, food: 0 } },
    fed: false,
  }
}

// ---------------------------------------------------------------------------
// Phase 4 - Food production (Step 06B, roadmap Phase 4)
// ---------------------------------------------------------------------------

/**
 * Operational farms feeding the shared stock (Step 06B §9-10).
 * Deterministic ascending-id iteration; outputs simply sum — no priority,
 * no efficiency, no workers. Addition commutes, so multi-farm output is
 * order-independent by construction.
 */
export const countOperationalFarms = (state: SimulationState): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (building.type === 'farm' && building.status === 'operational') {
      count += 1
    }
  }
  return count
}

/** Deterministic farm output for this tick (Step 06B §12). */
export const foodProductionForTick = (state: SimulationState): number =>
  countOperationalFarms(state) * FOOD_PER_FARM_PER_TICK

/**
 * Add this tick's farm output to the shared stock. Pure: returns the input
 * state reference when nothing produces. Runs after construction (a farm
 * operational as of this tick produces this tick) and before consumption,
 * so same-tick production can prevent starvation. Produces with zero
 * colonists (stockpiling); food may exceed the initial 100 — the Step 06B
 * invariant is food >= 0, with no stock cap.
 */
export const produceFood = (state: SimulationState): SimulationState => {
  const output = foodProductionForTick(state)
  if (output === 0) {
    return state
  }
  return {
    ...state,
    resources: { ...state.resources, food: state.resources.food + output },
  }
}

// ---------------------------------------------------------------------------
// Phase 6 - Population / housing admission + shortage consequence
// ---------------------------------------------------------------------------

/**
 * Colonists are admitted only when an operational residence without a
 * resident exists AND the colony still has food after this tick's
 * consumption (docs/07 growth conditions, Step 05B §Admission gating).
 * Residences are consumed in ascending id order.
 *
 * Shortage consequence: when the tick was NOT fed, the entire colony
 * starves in the same tick — every colonist leaves, freeing all residences
 * (all-or-nothing, Step 05B §Shortage consequence).
 */
export const updatePopulation = (
  state: SimulationState,
  fed: boolean
): SimulationState => {
  let nextState = fed
    ? state
    : { ...state, colonists: {} }
  while (nextState.resources.food > 0) {
    const pendingCapacity = availableResidenceIds(nextState)
    if (pendingCapacity.length === 0) {
      break
    }
    const residenceId = pendingCapacity[0]
    if (residenceId === undefined) {
      break
    }
    nextState = createColonist(nextState, residenceId).state
  }
  return nextState
}

// ---------------------------------------------------------------------------
// Phase 7 - Jobs / employment (Step 07C §4)
// ---------------------------------------------------------------------------

/**
 * Deterministic job assignment (Step 07C §4). Exactly:
 *
 *   1. any colonist whose `workplaceId` refers to a missing, non-operational
 *      or non-workshop building becomes unemployed (`workplaceId = null`);
 *   2. existing valid assignments are preserved untouched — employment never
 *      churns from one tick to the next;
 *   3. unemployed colonists (ascending colonist id) fill available operational
 *      Workshops (ascending building id), one colonist per Workshop;
 *   4. surplus colonists stay unemployed and surplus Workshops stay vacant.
 *
 * No randomness, no distance, no proximity, no skill, no priority, no player
 * assignment command. Pure: returns the input state reference when nothing
 * changes.
 */
export const assignJobs = (state: SimulationState): SimulationState => {
  const colonists = [...iterateColonists(state)]
  if (colonists.length === 0) {
    return state
  }
  // Ascending building-id order (iterateBuildings sorts by id).
  const availableWorkshopIds = [...iterateBuildings(state)]
    .filter(isOperationalWorkshop)
    .map((building) => building.id)
  const operationalWorkshopIds = new Set(availableWorkshopIds)
  const takenWorkplaceIds = new Set<string>()

  const nextColonists: Record<string, ColonistState> = {}
  let changed = false

  // Steps 1-2: drop invalid references, never allow two workers in one
  // Workshop, and keep every still-valid assignment as it is.
  for (const colonist of colonists) {
    const workplaceId = colonist.workplaceId
    let resolvedWorkplaceId: string | null = null
    if (
      workplaceId !== null &&
      operationalWorkshopIds.has(workplaceId) &&
      !takenWorkplaceIds.has(workplaceId)
    ) {
      resolvedWorkplaceId = workplaceId
      takenWorkplaceIds.add(workplaceId)
    }
    if (resolvedWorkplaceId === workplaceId) {
      nextColonists[colonist.id] = colonist
    } else {
      nextColonists[colonist.id] = { ...colonist, workplaceId: resolvedWorkplaceId }
      changed = true
    }
  }

  // Steps 3-4: fill vacancies. Colonists are iterated in ascending id order
  // and vacancies are consumed in ascending Workshop id order.
  const vacancies = availableWorkshopIds.filter(
    (workshopId) => !takenWorkplaceIds.has(workshopId)
  )
  let vacancyIndex = 0
  for (const colonist of colonists) {
    const vacancyId = vacancies[vacancyIndex]
    if (vacancyId === undefined) {
      break
    }
    const current = nextColonists[colonist.id]
    if (current === undefined || current.workplaceId !== null) {
      continue
    }
    vacancyIndex += 1
    nextColonists[colonist.id] = { ...current, workplaceId: vacancyId }
    changed = true
  }

  if (!changed) {
    return state
  }
  return { ...state, colonists: nextColonists }
}

// ---------------------------------------------------------------------------
// Phase 8 - Construction-material production (Step 07C §6)
// ---------------------------------------------------------------------------

/**
 * Deterministic material output for this tick: employed colonists × 2.
 * Direct production into the existing construction stock — no stored labour,
 * no recipe, no efficiency, no cap. Workers with zero or non-operational
 * Workshops produce nothing (no hidden autonomous production, §7).
 */
export const materialProductionForTick = (state: SimulationState): number =>
  countEmployedWorkers(state) * MATERIAL_PER_WORKER_PER_TICK

/**
 * Operational Workshops, staffed or vacant (Step 08F §7). Storage capacity
 * is infrastructure, not labor: vacant counts, under-construction does not.
 * Deterministic ascending-id iteration like countOperationalFarms.
 */
export const countOperationalWorkshops = (state: SimulationState): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (isOperationalWorkshop(building)) {
      count += 1
    }
  }
  return count
}

/**
 * Material storage capacity this tick (Step 08F §2): operational Workshops
 * × 25. Pure derivation, never stored. Zero with no operational Workshop —
 * the bootstrap stock above capacity is preserved (§4): the cap bounds
 * production inflow only, never retroactively mutates stock.
 */
export const materialStorageCapacityForTick = (
  state: SimulationState
): number =>
  countOperationalWorkshops(state) * MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP

/**
 * Production actually stored this tick (Step 08F §5): min(gross, available
 * space). Excess is deterministically discarded — no overflow resource, no
 * debt, no buffer, no backlog. Integer arithmetic, never negative.
 */
export const materialStoredProductionForTick = (
  state: SimulationState
): number => {
  const gross = materialProductionForTick(state)
  if (gross <= 0) {
    return 0
  }
  const available = Math.max(
    0,
    materialStorageCapacityForTick(state) - state.resources.construction
  )
  return Math.min(gross, available)
}

/**
 * Add this tick's labor output to the shared construction stock, clamped to
 * available storage (Step 08F §5-6). Pure: returns the input state reference
 * when nothing is stored. Runs after assignJobs, so a colonist admitted —
 * or a Workshop completed — on this tick produces on this tick, while a
 * starving colonist produces nothing. A Workshop operational as of this tick
 * (advanceConstruction ran before) contributes capacity this same tick.
 * Upkeep still runs after: production never bypasses the cap merely because
 * upkeep later frees space.
 */
export const produceMaterial = (state: SimulationState): SimulationState => {
  const stored = materialStoredProductionForTick(state)
  if (stored === 0) {
    return state
  }
  return {
    ...state,
    resources: {
      ...state.resources,
      construction: state.resources.construction + stored,
    },
  }
}

// ---------------------------------------------------------------------------
// Phase 8b - Operational upkeep (Step 08C)
// ---------------------------------------------------------------------------

/**
 * Staffed operational Workshops: operational AND at least one worker
 * assigned. Residences, Farms, under-construction and vacant Workshops
 * cost exactly 0. Deterministic: iterateBuildings sorts by id.
 */
export const countStaffedOperationalWorkshops = (
  state: SimulationState
): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (
      isOperationalWorkshop(building) &&
      countWorkersAt(state, building.id) > 0
    ) {
      count += 1
    }
  }
  return count
}

/** Deterministic upkeep due this tick: staffed operational Workshops × 1. */
export const materialUpkeepDueForTick = (state: SimulationState): number =>
  countStaffedOperationalWorkshops(state) *
  MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK

/**
 * Deduct this tick's upkeep from the construction stock. Runs after
 * produceMaterial so same-tick production pays same-tick upkeep, and after
 * assignJobs/starvation so the staffing served is this tick's. Partial
 * payment clamped to stock: deduct = min(stock, due). Never throws on
 * deficit, never deactivates buildings, no debt, no carry-over.
 */
export const upkeepBuildings = (state: SimulationState): SimulationState => {
  const due = materialUpkeepDueForTick(state)
  if (due <= 0) {
    return state
  }
  const deduct = Math.min(state.resources.construction, due)
  if (deduct <= 0) {
    return state
  }
  return {
    ...state,
    resources: {
      ...state.resources,
      construction: state.resources.construction - deduct,
    },
  }
}

// ---------------------------------------------------------------------------
// Phase 9 - Advance simulation time
// ---------------------------------------------------------------------------

/** Simulation time is canonical state, never wall-clock (docs/11). */
export const advanceTime = (state: SimulationState): SimulationState => ({
  ...state,
  time: { tick: state.time.tick + 1 },
})
