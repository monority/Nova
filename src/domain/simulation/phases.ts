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
 * Construction crew ordering (Step 10Y): phase 1 progresses each site by 1,
 * plus 1 when the site has a crew (derived from `constructionAssignmentId` on
 * colonists). A crew assigned by the command phase (8a) therefore first
 * affects the NEXT tick's phase 1, and a newly placed building still uses the
 * existing 8a catch-up progress. The crew member stays crewed for the WHOLE
 * completion tick (so phase 8's `produceMaterial` cannot pay them twice) and
 * is released by the end-of-tick `releaseCompletedConstructionCrew`
 * normalization, run after upkeep and before `advanceTime`. Food/Water/
 * Material production rules are untouched: a crewed colonist holds no
 * workplace, so `countWorkersAt` and every production rule already exclude
 * them.
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
import {
  countWorkersAt,
  isOperationalFarm,
  isOperationalWorkplace,
  isOperationalWorkshop,
} from '../jobs/jobs.js'
import {
  areAccessesConnected,
  getDistanceBetweenAccesses,
} from '../mobility/mobility.js'
import type { ColonistState } from '../population/colonist.js'
import {
  getBuildingRoadAccess,
  getBuildingRoadAccessWithNetworks,
  getRoadNetworks,
  isOperationalRoad,
  isRoadOccupied,
  normalizeRoadCells,
  ROAD_CONSTRUCTION_COST,
  type BuildingRoadAccess,
  type RoadState,
} from '../road/road.js'
import { iterateRoads } from '../road/road.js'
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
import { waterProductionForTick } from '../water/water.js'
import type { SimulationCommand } from './command.js'
import {
  createBuilding,
  createColonist,
  createRoads,
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

/**
 * A cell is blocked iff it holds a building OR a road (Step 09C Phase B).
 * One occupant per cell: building XOR road. Both placement validators gate
 * on this so roads and buildings can never stack.
 */
export const isCellBlocked = (
  state: SimulationState,
  cell: CellCoordinate
): boolean => isCellOccupied(state, cell) || isRoadOccupied(state, cell)

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
  /**
   * Ids of the roads created by an accepted placeRoads command, in
   * deterministic cell order, else empty. Same catch-up contract as
   * placedBuildingId (Step 09C Phase D).
   */
  readonly placedRoadIds: readonly string[]
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
  if (isCellBlocked(state, cell)) {
    return { valid: false, reason: 'cellOccupied' }
  }
  if (!hasSufficientResources(state.resources, definition.constructionCost)) {
    return { valid: false, reason: 'insufficientResources' }
  }
  return { valid: true }
}

/**
 * Road placement validation (Step 09C Phase C/G). The input list is
 * normalized first (dedupe + deterministic (x, y) order), then the ENTIRE
 * set is validated before anything mutates: empty set, out-of-bounds cell,
 * building collision, road collision, then total-cost affordability. The
 * first failing cell in deterministic order decides the spatial reason, so
 * the result never depends on drag direction or input order.
 */
export type RoadPlacementValidation =
  | { readonly valid: true; readonly cells: CellCoordinate[]; readonly totalCost: number }
  | { readonly valid: false; readonly reason: 'emptyCells' | 'outOfBounds' | 'cellOccupiedByBuilding' | 'cellOccupiedByRoad' | 'insufficientResources' }

export const validateRoadsPlacement = (
  state: SimulationState,
  cells: readonly CellCoordinate[]
): RoadPlacementValidation => {
  const normalized = normalizeRoadCells(cells)
  if (normalized.length === 0) {
    return { valid: false, reason: 'emptyCells' }
  }
  for (const cell of normalized) {
    if (!isInBounds(state.config.world, cell)) {
      return { valid: false, reason: 'outOfBounds' }
    }
  }
  for (const cell of normalized) {
    if (isCellOccupied(state, cell)) {
      return { valid: false, reason: 'cellOccupiedByBuilding' }
    }
  }
  for (const cell of normalized) {
    if (isRoadOccupied(state, cell)) {
      return { valid: false, reason: 'cellOccupiedByRoad' }
    }
  }
  const totalCost = normalized.length * ROAD_CONSTRUCTION_COST
  if (!hasSufficientResources(state.resources, totalCost)) {
    return { valid: false, reason: 'insufficientResources' }
  }
  return { valid: true, cells: normalized, totalCost }
}

// ---------------------------------------------------------------------------
// Manual workforce reassignment (Step 10M)
// ---------------------------------------------------------------------------

/** Deterministic rejection reasons for `reassignColonist`. */
export type ReassignmentReason =
  | 'unknownColonist'
  | 'noResidence'
  | 'unknownWorkplace'
  | 'notWorkplace'
  | 'notOperational'
  | 'workplaceOccupied'
  | 'notConnected'

export type ReassignmentValidation =
  | { readonly valid: true; readonly distance: number }
  | { readonly valid: false; readonly reason: ReassignmentReason }

/**
 * Validation for an explicit player reassignment (Step 10M). Single source
 * of truth shared by `applyCommand` and the `getReassignmentOptions` query.
 * Reuses the EXISTING employment, mobility and capacity predicates — it adds
 * no new eligibility semantics and never bypasses a simulation rule.
 *
 * Deterministic validation order:
 *   1. colonist exists
 *   2. colonist has a residence
 *   3. target building exists
 *   4. target is a Farm or Workshop
 *   5. target is operational
 *   6. target has free capacity (the colonist's own workplace is never
 *      counted against itself, so a no-op re-selection stays valid)
 *   7. residence and target are mobility-connected (09K)
 */
export const validateReassignment = (
  state: SimulationState,
  colonistId: string,
  workplaceId: string
): ReassignmentValidation => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) {
    return { valid: false, reason: 'unknownColonist' }
  }
  const residenceId = colonist.residenceId
  if (residenceId === null) {
    return { valid: false, reason: 'noResidence' }
  }
  const workplace = state.buildings[workplaceId]
  if (workplace === undefined) {
    return { valid: false, reason: 'unknownWorkplace' }
  }
  if (workplace.type !== 'farm' && workplace.type !== 'workshop' && workplace.type !== 'well') {
    return { valid: false, reason: 'notWorkplace' }
  }
  if (!isOperationalWorkplace(workplace)) {
    return { valid: false, reason: 'notOperational' }
  }
  if (
    workplaceId !== colonist.workplaceId &&
    countWorkersAt(state, workplaceId) > 0
  ) {
    return { valid: false, reason: 'workplaceOccupied' }
  }
  const residenceAccess = getBuildingRoadAccess(state, residenceId)
  const workplaceAccess = getBuildingRoadAccess(state, workplaceId)
  if (!areAccessesConnected(residenceAccess, workplaceAccess)) {
    return { valid: false, reason: 'notConnected' }
  }
  const distance = getDistanceBetweenAccesses(
    state,
    residenceAccess,
    workplaceAccess
  )
  if (distance === null) {
    return { valid: false, reason: 'notConnected' }
  }
  return { valid: true, distance }
}

// ---------------------------------------------------------------------------
// Construction crew (Step 10Y)
// ---------------------------------------------------------------------------

/** Deterministic rejection reasons for `assignConstructionCrew`. */
export type ConstructionCrewReason =
  | 'unknownColonist'
  | 'unknownBuilding'
  | 'notUnderConstruction'
  | 'alreadyAssignedToConstruction'
  | 'siteAlreadyCrewed'

export type ConstructionCrewValidation =
  | { readonly valid: true; readonly currentCrewId: string | null }
  | { readonly valid: false; readonly reason: ConstructionCrewReason }

/**
 * The colonist crewing this site, or null (Step 10Y). Derived from colonist
 * state in ascending colonist-id order — never persisted, never cached, and
 * there is no site-side crew array. One crew per site is an invariant of
 * `assignConstructionCrew`, so the first match is the only match.
 */
export const getConstructionCrewId = (
  state: SimulationState,
  buildingId: string
): string | null => {
  for (const colonist of iterateColonists(state)) {
    if (colonist.constructionAssignmentId === buildingId) {
      return colonist.id
    }
  }
  return null
}

/** True iff an under-construction site currently has a crew (Step 10Y). */
export const isConstructionSiteCrewed = (
  state: SimulationState,
  buildingId: string
): boolean => getConstructionCrewId(state, buildingId) !== null

/**
 * Construction progress for one site this tick: the base 1 tick, plus 1 when
 * the site has a crew (Step 10Y §2). Derived, deterministic, never persisted.
 */
export const constructionProgressPerTick = (
  state: SimulationState,
  buildingId: string
): number => (isConstructionSiteCrewed(state, buildingId) ? 2 : 1)

/**
 * Validation for an explicit construction crew assignment (Step 10Y). Single
 * source of truth shared by `applyCommand` and `getConstructionCrewOptions`.
 *
 * Deterministic validation order:
 *   1. colonist exists
 *   2. target building exists (roads are not buildings, so a road id rejects here)
 *   3. target is under construction
 *   4. the colonist is not already crewing a DIFFERENT site
 *   5. the site has no other crew
 *
 * No mobility or residence requirement is introduced: construction crew is a
 * workforce allocation, not a commute (Step 10Y §4 lists exactly these five).
 */
export const validateConstructionCrew = (
  state: SimulationState,
  colonistId: string,
  buildingId: string
): ConstructionCrewValidation => {
  const colonist = state.colonists[colonistId]
  if (colonist === undefined) {
    return { valid: false, reason: 'unknownColonist' }
  }
  const building = state.buildings[buildingId]
  if (building === undefined) {
    return { valid: false, reason: 'unknownBuilding' }
  }
  if (building.status !== 'underConstruction') {
    return { valid: false, reason: 'notUnderConstruction' }
  }
  if (
    colonist.constructionAssignmentId !== null &&
    colonist.constructionAssignmentId !== buildingId
  ) {
    return { valid: false, reason: 'alreadyAssignedToConstruction' }
  }
  const currentCrewId = getConstructionCrewId(state, buildingId)
  if (currentCrewId !== null && currentCrewId !== colonistId) {
    return { valid: false, reason: 'siteAlreadyCrewed' }
  }
  return { valid: true, currentCrewId }
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
    return { state, accepted: false, reason: null, placedBuildingId: null, placedRoadIds: [] }
  }
  switch (command.type) {
    case 'placeBuilding': {
      const cell = { x: command.x, y: command.y }
      const validation = validatePlacement(state, cell, command.buildingType)
      if (!validation.valid) {
        return { state, accepted: false, reason: validation.reason, placedBuildingId: null, placedRoadIds: [] }
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
        placedRoadIds: [],
      }
    }
    case 'placeRoads': {
      // Atomic multi-cell transaction (Step 09C Phase G): validate the whole
      // normalized set and price the total BEFORE creating anything. Any
      // failure returns the input state reference: zero mutation of roads,
      // buildings, resources, counters and time.
      const validation = validateRoadsPlacement(state, command.cells)
      if (!validation.valid) {
        return { state, accepted: false, reason: validation.reason, placedBuildingId: null, placedRoadIds: [] }
      }
      const created = createRoads(state, validation.cells)
      const deducted = deductResources(created.state.resources, validation.totalCost)
      return {
        state: { ...created.state, resources: deducted },
        accepted: true,
        reason: null,
        placedBuildingId: null,
        placedRoadIds: created.roadIds,
      }
    }
    case 'reassignColonist': {
      // Deterministic no-op when the colonist already works there: the
      // player's intent is already satisfied and nothing changes.
      const current = state.colonists[command.colonistId]
      if (current !== undefined && current.workplaceId === command.workplaceId) {
        return { state, accepted: true, reason: null, placedBuildingId: null, placedRoadIds: [] }
      }
      const validation = validateReassignment(
        state,
        command.colonistId,
        command.workplaceId
      )
      if (!validation.valid) {
        return {
          state,
          accepted: false,
          reason: validation.reason,
          placedBuildingId: null,
          placedRoadIds: [],
        }
      }
      const colonist = state.colonists[command.colonistId]
      if (colonist === undefined) {
        // Defensive: validateReassignment already rejected this.
        return { state, accepted: false, reason: 'unknownColonist', placedBuildingId: null, placedRoadIds: [] }
      }
      return {
        state: {
          ...state,
          colonists: {
            ...state.colonists,
            [command.colonistId]: {
              ...colonist,
              workplaceId: command.workplaceId,
              workplaceAssignmentMode: 'manual',
            },
          },
        },
        accepted: true,
        reason: null,
        placedBuildingId: null,
        placedRoadIds: [],
      }
    }
    case 'assignConstructionCrew': {
      const current = state.colonists[command.colonistId]
      if (command.buildingId === null) {
        // Release (Step 10Y §15): the colonist returns to automatic workplace
        // behavior; `assignJobs` may employ them on the next assignment pass.
        if (current === undefined) {
          return { state, accepted: false, reason: 'unknownColonist', placedBuildingId: null, placedRoadIds: [] }
        }
        if (current.constructionAssignmentId === null) {
          return { state, accepted: true, reason: null, placedBuildingId: null, placedRoadIds: [] }
        }
        return {
          state: {
            ...state,
            colonists: {
              ...state.colonists,
              [current.id]: { ...current, constructionAssignmentId: null },
            },
          },
          accepted: true,
          reason: null,
          placedBuildingId: null,
          placedRoadIds: [],
        }
      }
      // Deterministic no-op when the colonist already crews this exact site.
      if (current !== undefined && current.constructionAssignmentId === command.buildingId) {
        return { state, accepted: true, reason: null, placedBuildingId: null, placedRoadIds: [] }
      }
      const validation = validateConstructionCrew(
        state,
        command.colonistId,
        command.buildingId
      )
      if (!validation.valid) {
        return {
          state,
          accepted: false,
          reason: validation.reason,
          placedBuildingId: null,
          placedRoadIds: [],
        }
      }
      if (current === undefined) {
        // Defensive: validateConstructionCrew already rejected this.
        return { state, accepted: false, reason: 'unknownColonist', placedBuildingId: null, placedRoadIds: [] }
      }
      // The crew relationship is exclusive with employment: the colonist is
      // transferred away from any workplace in the same atomic step, so no
      // duplicated assignment can remain.
      return {
        state: {
          ...state,
          colonists: {
            ...state.colonists,
            [current.id]: {
              ...current,
              workplaceId: null,
              workplaceAssignmentMode: 'automatic',
              constructionAssignmentId: command.buildingId,
            },
          },
        },
        accepted: true,
        reason: null,
        placedBuildingId: null,
        placedRoadIds: [],
      }
    }
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

/**
 * Road construction progress (Step 09C Phase D). Same countdown semantics
 * as progressOneBuilding — one shared lifecycle shape, not a second system.
 */
export const progressOneRoad = (road: RoadState): RoadState => {
  if (road.status === 'operational') {
    return road
  }
  const remaining = road.constructionRemaining - 1
  if (remaining < 0) {
    throw new Error(`Construction below zero for ${road.id}`)
  }
  if (remaining === 0) {
    return { ...road, status: 'operational', constructionRemaining: 0 }
  }
  return { ...road, constructionRemaining: remaining }
}

export const advanceConstruction = (
  state: SimulationState
): SimulationState => {
  // Step 10Y: derived crew presence. One crew per site (an
  // `assignConstructionCrew` invariant), read from colonist state in ascending
  // id order — never persisted, never cached. A crew assigned during tick N's
  // command phase (8a) accelerates tick N+1's construction phase (1).
  const crewedSiteIds = new Set<string>()
  for (const colonist of iterateColonists(state)) {
    if (colonist.constructionAssignmentId !== null) {
      crewedSiteIds.add(colonist.constructionAssignmentId)
    }
  }

  const nextBuildings: Record<string, BuildingState> = {}
  let changed = false
  for (const building of iterateBuildings(state)) {
    let progressed = progressOneBuilding(building)
    if (
      building.status === 'underConstruction' &&
      crewedSiteIds.has(building.id)
    ) {
      // +1 progress from the crew: a 2-tick building completes in one tick.
      // `progressOneBuilding` is a no-op on an already-operational building,
      // so a 1-tick remaining site never underflows.
      progressed = progressOneBuilding(progressed)
    }
    nextBuildings[building.id] = progressed
    if (progressed !== building) {
      changed = true
    }
  }
  const nextRoads: Record<string, RoadState> = {}
  for (const road of iterateRoads(state)) {
    const progressed = progressOneRoad(road)
    nextRoads[road.id] = progressed
    if (progressed !== road) {
      changed = true
    }
  }

  // Step 10Y §14: a construction assignment is valid only while its site is
  // under construction. The release is a SEPARATE end-of-tick normalization
  // (`releaseCompletedConstructionCrew`, run after all production) so a
  // colonist can never receive production output AND construction credit in
  // the same tick. Nothing to do here beyond progress.
  if (!changed) {
    return state
  }
  return { ...state, buildings: nextBuildings, roads: nextRoads }
}

/**
 * End-of-tick crew normalization (Step 10Y §14). Clears every construction
 * assignment whose site is no longer under construction (completed, or gone).
 *
 * Runs AFTER `produceMaterial`/`upkeepBuildings` in the orchestrator, i.e.
 * after every production rule of the tick, so the crew member is excluded from
 * production for the WHOLE tick in which the site completes — construction
 * credit and production output are mutually exclusive (Step 10Y §3). The
 * cleared colonist is `automatic` again and `assignJobs` may employ them from
 * the next tick on. Deterministic, pure, and a no-op when no crew exists.
 */
export const releaseCompletedConstructionCrew = (
  state: SimulationState
): SimulationState => {
  let nextColonists: Record<string, ColonistState> | null = null
  for (const colonist of iterateColonists(state)) {
    const siteId = colonist.constructionAssignmentId
    if (siteId === null) {
      continue
    }
    const site = state.buildings[siteId]
    if (site !== undefined && site.status === 'underConstruction') {
      continue
    }
    if (nextColonists === null) {
      nextColonists = { ...state.colonists }
    }
    nextColonists[colonist.id] = { ...colonist, constructionAssignmentId: null }
  }
  return nextColonists === null ? state : { ...state, colonists: nextColonists }
}

/**
 * Catch-up progress for newly placed roads (Step 09C Phase D). Mirrors
 * progressPlacedBuilding exactly: the phase-8a transaction runs after this
 * tick's advanceConstruction, so placed roads missed their progress slot
 * and each is progressed once to preserve the 2-tick completion contract
 * (placed tick 2 -> 1, next tick 1 -> 0 operational). No-op when no roads
 * were placed or an id is absent (defensive: never throws).
 */
export const progressPlacedRoads = (
  state: SimulationState,
  result: CommandApplicationResult
): SimulationState => {
  if (result.placedRoadIds.length === 0) {
    return state
  }
  let roads = state.roads
  let changed = false
  for (const id of result.placedRoadIds) {
    const placed = roads[id]
    if (placed === undefined || isOperationalRoad(placed)) {
      continue
    }
    roads = { ...roads, [id]: progressOneRoad(placed) }
    changed = true
  }
  if (!changed) {
    return state
  }
  return { ...state, roads }
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
 * Staffed operational Farms: operational AND at least one worker assigned
 * (Step 10E). Mirror of countStaffedOperationalWorkshops. Residences,
 * under-construction and vacant Farms produce exactly 0. Deterministic:
 * iterateBuildings sorts by id.
 */
export const countStaffedOperationalFarms = (
  state: SimulationState
): number => {
  let count = 0
  for (const building of iterateBuildings(state)) {
    if (
      isOperationalFarm(building) &&
      countWorkersAt(state, building.id) > 0
    ) {
      count += 1
    }
  }
  return count
}

/**
 * Operational farms feeding the shared stock (Step 06B §9-10, staffed-only
 * since Step 10E §7). Deterministic ascending-id iteration; outputs simply
 * sum — no priority, no efficiency. Addition commutes, so multi-farm output
 * is order-independent by construction.
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

/**
 * Deterministic farm output for this tick (Step 06B §12, Step 10E §7):
 * staffed operational Farms × FOOD_PER_FARM_PER_TICK. A vacant Farm
 * produces 0 — the 10E asymmetry removal.
 */
export const foodProductionForTick = (state: SimulationState): number =>
  countStaffedOperationalFarms(state) * FOOD_PER_FARM_PER_TICK

/**
 * Add this tick's farm output to the shared stock. Pure: returns the input
 * state reference when nothing produces. Runs after construction (a farm
 * operational as of this tick is staffable from the NEXT assignJobs) and
 * before consumption. TIMING CONTRACT (Step 10E §11-12): produceFood reads
 * the workplace assignments written by the PREVIOUS tick's assignJobs, so a
 * newly assigned Farm worker becomes productive on the NEXT tick. Phase order
 * is deliberately preserved (no reorder for same-tick convenience); Workshop
 * Material timing is unchanged (assignJobs -> produceMaterial same tick).
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
// Phase 4b - Water production & consumption (Step 10P)
// ---------------------------------------------------------------------------

/**
 * Add this tick's Well output to the shared Water stock. Mirrors
 * `produceFood`: reads the PREVIOUS tick's assignments (Wells are staffed by
 * `assignJobs`, which runs after this phase), so a newly assigned Well worker
 * produces from the next tick. Runs before `consumeWater`. No storage cap.
 */
export const produceWater = (state: SimulationState): SimulationState => {
  const output = waterProductionForTick(state)
  if (output === 0) {
    return state
  }
  return {
    ...state,
    resources: { ...state.resources, water: state.resources.water + output },
  }
}

export interface WaterConsumptionResult {
  readonly state: SimulationState
  /**
   * True when served colonists exist and the stock could not cover their
   * need. Intra-tick value only: never stored, persisted or hashed.
   */
  readonly shortage: boolean
}

/**
 * Water consumption (Step 10P). Served colonists consume one unit each;
 * missing water is CLAMPED (stock -> 0) and reported as a shortage — it never
 * kills an existing colonist. Water shortage is a growth gate, not a survival
 * gate; Food remains the only survival rule.
 */
export const consumeWater = (
  state: SimulationState,
  requiredWater: number
): WaterConsumptionResult => {
  if (requiredWater < 0) {
    throw new Error(`Negative water requirement: ${requiredWater}`)
  }
  if (requiredWater === 0) {
    return { state, shortage: false }
  }
  if (state.resources.water >= requiredWater) {
    return {
      state: {
        ...state,
        resources: { ...state.resources, water: state.resources.water - requiredWater },
      },
      shortage: false,
    }
  }
  return {
    state: { ...state, resources: { ...state.resources, water: 0 } },
    shortage: true,
  }
}

// ---------------------------------------------------------------------------
// Phase 6 - Population / housing admission + shortage consequence
// ---------------------------------------------------------------------------

/**
 * Water admission gate (Step 10P, growth headroom Step 10S). `shortage` blocks
 * admission for the tick; `servedResidenceIds` limits admission to Water-served
 * Residences; `productionCapacity` and `servedNeed` add the Step 10S headroom
 * invariant: a new colonist may only be admitted while the colony's Water
 * production capacity can sustain the resulting served population. The last two
 * are optional for historical audit harnesses; when omitted the pre-10S
 * behaviour applies. Absent gate => the historical Food+housing rule.
 */
export interface WaterAdmissionGate {
  readonly shortage: boolean
  readonly servedResidenceIds: ReadonlySet<string>
  /**
   * Water production capacity this tick: staffed operational road-accessible
   * Wells x WATER_PER_WELL_PER_TICK. Derived, never persisted.
   */
  readonly productionCapacity?: number
  /** Water need of the currently served population this tick. */
  readonly servedNeed?: number
}

/**
 * Colonists are admitted only when an operational residence without a
 * resident exists AND the colony still has food after this tick's
 * consumption (docs/07 growth conditions, Step 05B §Admission gating).
 * Residences are consumed in ascending id order.
 *
 * Step 10P: when a Water gate is supplied, the Residence must also be
 * Water-served and the colony must not be in Water shortage. Water NEVER
 * causes population loss here — only Food starvation does.
 *
 * Step 10S: when the gate also carries `productionCapacity` and `servedNeed`,
 * a served colonist may only be admitted while
 *
 *   productionCapacity >= servedNeed + admissionsThisTick + 1
 *
 * so the served population cannot settle above the colony's Water production.
 * `admissionsThisTick` is a transient local counter, never persisted. A colony
 * with zero colonists is explicitly exempt (the first colonist is needed to
 * staff the very Well that would produce the capacity).
 *
 * Shortage consequence: when the tick was NOT fed, the entire colony
 * starves in the same tick — every colonist leaves, freeing all residences
 * (all-or-nothing, Step 05B §Shortage consequence).
 */
export const updatePopulation = (
  state: SimulationState,
  fed: boolean,
  water?: WaterAdmissionGate
): SimulationState => {
  let nextState = fed
    ? state
    : { ...state, colonists: {} }
  if (water !== undefined && water.shortage) {
    return nextState
  }
  let admissionsThisTick = 0
  while (nextState.resources.food > 0) {
    const pendingCapacity = availableResidenceIds(nextState)
    if (pendingCapacity.length === 0) {
      break
    }
    const residenceId =
      water === undefined
        ? pendingCapacity[0]
        : pendingCapacity.find((id) => water.servedResidenceIds.has(id))
    if (residenceId === undefined) {
      break
    }
    if (
      water !== undefined &&
      water.productionCapacity !== undefined &&
      water.servedNeed !== undefined
    ) {
      const bootstrap = Object.keys(nextState.colonists).length === 0
      const hasHeadroom =
        water.productionCapacity >=
        water.servedNeed + admissionsThisTick + 1
      if (!bootstrap && !hasHeadroom) {
        break
      }
    }
    nextState = createColonist(nextState, residenceId).state
    admissionsThisTick += 1
  }
  return nextState
}

// ---------------------------------------------------------------------------
// Phase 7 - Jobs / employment (Step 07C §4)
// ---------------------------------------------------------------------------

/**
 * Deterministic job assignment (Step 07C §4, mobility gate Step 09K,
 * spatial preference Step 09M, Farm workplaces Step 10E). One greedy pass
 * over colonists in ascending id, each colonist taking at most one
 * workplace (Farm or Workshop):
 *
 *   1. eligible workplaces are operational, still free, and mobility-
 *      connected to the colonist's residence (09K gate, unchanged);
 *   2. among those, the preferred workplace is the one at the SMALLEST
 *      operational road distance from the residence (09M), tie-broken by
 *      the smallest workplace id — NO building-type priority: Farms and
 *      Workshops compete in one merged pool (Step 10E §5);
 *   3. an existing assignment is preserved when it is still eligible AND
 *      still among the nearest — no unnecessary churn — and is otherwise
 *      re-evaluated against the CURRENT road network;
 *   4. no distance, eligibility or network fact is cached or persisted, so
 *      connectivity and preference changes are reflected on the next tick.
 *
 * Capacity stays 1 per workplace: the ascending colonist-id scan plus the
 * taken-set can never place two colonists in one workplace. Colonists
 * without a residence stay unemployed. Pure: returns the input state
 * reference when nothing changes.
 */
export const assignJobs = (state: SimulationState): SimulationState => {
  const colonists = [...iterateColonists(state)]
  if (colonists.length === 0) {
    return state
  }
  // Ascending building-id order (iterateBuildings sorts by id). Step 10E:
  // operational Farms AND Workshops form ONE merged candidate pool — the
  // explicit distance-then-id selection below is the only ordering, so no
  // building-type priority can emerge.
  const availableWorkplaceIds = [...iterateBuildings(state)]
    .filter(isOperationalWorkplace)
    .map((building) => building.id)
  const takenWorkplaceIds = new Set<string>()

  // Step 10D perf: the 09D networks are derived ONCE per assignJobs call and
  // every residence/workshop 09E access is derived ONCE per building. The
  // per-pair predicates below then read these precomputed records instead of
  // re-deriving networks per (colonist, workshop) pair. Same inputs, same
  // pure functions, byte-identical results — only the recomputation is gone.
  const networks = getRoadNetworks(state)
  const accessByBuildingId = new Map<string, BuildingRoadAccess>()
  const accessOf = (buildingId: string): BuildingRoadAccess => {
    const cached = accessByBuildingId.get(buildingId)
    if (cached !== undefined) {
      return cached
    }
    const access = getBuildingRoadAccessWithNetworks(
      state,
      buildingId,
      networks
    )
    accessByBuildingId.set(buildingId, access)
    return access
  }

  // Step 10M: manual reservations are resolved FIRST, so an automatic
  // colonist can never take a workplace that a manual colonist still validly
  // holds, and so an invalid manual assignment is cleared before the
  // automatic pass (recovery to normal behavior).
  const manualValid = new Set<string>()
  for (const colonist of colonists) {
    if (colonist.workplaceAssignmentMode !== 'manual') {
      continue
    }
    const workplaceId = colonist.workplaceId
    const residenceId = colonist.residenceId
    if (workplaceId === null || residenceId === null) {
      continue
    }
    if (takenWorkplaceIds.has(workplaceId)) {
      continue
    }
    const workplace = state.buildings[workplaceId]
    if (workplace === undefined || !isOperationalWorkplace(workplace)) {
      continue
    }
    const residenceAccess = accessOf(residenceId)
    const workplaceAccess = accessOf(workplaceId)
    if (!areAccessesConnected(residenceAccess, workplaceAccess)) {
      continue
    }
    if (
      getDistanceBetweenAccesses(state, residenceAccess, workplaceAccess) ===
      null
    ) {
      continue
    }
    takenWorkplaceIds.add(workplaceId)
    manualValid.add(colonist.id)
  }

  const nextColonists: Record<string, ColonistState> = {}
  let changed = false

  for (const colonist of colonists) {
    // Step 10Y: a colonist on a construction crew is not available for
    // workplace employment. This is a manual-only relationship, so
    // `assignJobs` never creates OR reclaims it — it only guarantees the
    // exclusivity invariant (a crewed colonist holds no workplace). The
    // construction phase clears the assignment when the site completes.
    if (colonist.constructionAssignmentId !== null) {
      if (colonist.workplaceId !== null) {
        nextColonists[colonist.id] = { ...colonist, workplaceId: null }
        changed = true
      } else {
        nextColonists[colonist.id] = colonist
      }
      continue
    }
    // A still-valid manual choice is preserved verbatim: the player's
    // decision is never overwritten by the nearest-workplace preference.
    if (manualValid.has(colonist.id)) {
      nextColonists[colonist.id] = colonist
      continue
    }
    const residenceId = colonist.residenceId
    let selected: string | null = null

    if (residenceId !== null) {
      // 09K eligibility gate: operational, free, mobility-connected.
      // Step 10E: the gate is type-blind (Farm or Workshop).
      const eligible: { readonly id: string; readonly distance: number }[] = []
      const residenceAccess = accessOf(residenceId)
      for (const workplaceId of availableWorkplaceIds) {
        if (takenWorkplaceIds.has(workplaceId)) {
          continue
        }
        const workplaceAccess = accessOf(workplaceId)
        if (!areAccessesConnected(residenceAccess, workplaceAccess)) {
          continue
        }
        const distance = getDistanceBetweenAccesses(
          state,
          residenceAccess,
          workplaceAccess
        )
        if (distance === null) {
          continue
        }
        eligible.push({ id: workplaceId, distance })
      }

      if (eligible.length > 0) {
        // 09M preference: nearest operational road distance, then lowest id.
        let best = eligible[0]!
        for (const candidate of eligible) {
          const nearer = candidate.distance < best.distance
          const tiedAndLowerId =
            candidate.distance === best.distance && candidate.id < best.id
          if (nearer || tiedAndLowerId) {
            best = candidate
          }
        }
        // Preserve the current assignment when it is still optimal (tied at
        // the minimum distance included), so a stable network never churns.
        const current = colonist.workplaceId
        const currentIsOptimal =
          current !== null &&
          eligible.some(
            (candidate) =>
              candidate.id === current && candidate.distance === best.distance
          )
        const chosen = currentIsOptimal && current !== null ? current : best.id
        selected = chosen
        takenWorkplaceIds.add(chosen)
      }
    }

    const wasManual = colonist.workplaceAssignmentMode === 'manual'
    if (selected === colonist.workplaceId && !wasManual) {
      nextColonists[colonist.id] = colonist
    } else {
      // Clear an invalid manual choice back to automatic behavior, or apply
      // the automatic selection. The colonist is never left stale.
      nextColonists[colonist.id] = {
        ...colonist,
        workplaceId: selected,
        workplaceAssignmentMode: 'automatic',
      }
      changed = true
    }
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
 * Deterministic material output for this tick (Step 09F, employment gate Step
 * 09K): each operational, staffed Workshop with road access contributes its
 * workers × rate. Unassigned or non-operational Workshops produce nothing
 * (no hidden autonomous production, §7); since 09K a Workshop without road
 * access (or without a mobility-connected worker) is normally vacant rather
 * than staffed-but-blocked — the rule below is unchanged, it simply sees
 * fewer staffed roadless Workshops.
 *
 * Road access (Step 09E getBuildingRoadAccess) is the single source of truth;
 * the rate and storage coefficients are unchanged.
 */
export const materialProductionForTick = (state: SimulationState): number => {
  let total = 0
  for (const building of iterateBuildings(state)) {
    if (!isOperationalWorkshop(building)) {
      continue
    }
    const workers = countWorkersAt(state, building.id)
    if (workers === 0 || !getBuildingRoadAccess(state, building.id).hasRoadAccess) {
      continue
    }
    total += workers * MATERIAL_PER_WORKER_PER_TICK
  }
  return total
}

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
