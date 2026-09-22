/**
 * Application entry point (Step 1).
 *
 * Wires together: Three.js renderer, GameController, simulation clock,
 * minimal diagnostic UI, pointer interaction.
 *
 * Flow enforced:
 *   pointer/UI -> command -> dispatchCommand -> stepSimulation
 *   -> new SimulationState -> RenderSnapshot -> renderer.update
 *
 * requestAnimationFrame drives presentation scheduling only; simulation
 * advancement goes exclusively through the SimulationClock.
 */

import type { BuildingInspection, BuildingType, ProgressionStatus, SimulationConfig, SimulationState } from '../index.js'
import {
  countStaffedOperationalWorkshops,
  countWorkersAt,
  createDefaultState,
  createInitialState,
  createScenarioState,
  findScenario,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getBuildingIdAtCell,
  getBuildingInspection,
  getColonistInspection,
  getConstructionCrewId,
  getConstructionCrewOptions,
  getObjectiveStatus,
  getProgression,
  getReassignmentOptions,
  SCENARIOS,
  type ObjectiveDefinition,
  type ObjectiveStatus,
  serializeSave,
  getAccessibleBuildingCount,
  getEmploymentSummary,
  getFoodTicksRemaining,
  getProductiveFarmWorkerCount,
  getHousingSummary,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getPlacementAffordability,
  getMaterialUpkeepPerTick,
  getProductiveWorkerCount,
  getVacantOperationalFarmCount,
  getNetMaterialPerTick,
  getBuildingRoadAccess,
  getColonistWorkMobility,
  getServedColonistCount,
  getWaterProductionPerTick,
  getWaterServedResidenceCount,
  getWaterStock,
  hasOperationalWell,
  isWaterSupplySustainable,
  WATER_PER_WELL_PER_TICK,
  expandRoadDrag,
  ROAD_CONSTRUCTION_COST,
  validateRoadsPlacement,
  type CellCoordinate,
  getRoadNetworkCount,
  getResourceStock,
  INITIAL_CONSTRUCTION_MATERIAL,
  INITIAL_FOOD,
  isFoodSupplySustainable,
  jobCapacityOf,
  validatePlacement,
} from '../index.js'
import { createGameController } from './gameController.js'
import { createSimulationClock } from './simulationClock.js'
import { createNovaScene } from '../renderer/three/scene.js'
import { createNovaRenderer } from '../renderer/three/novaRenderer.js'

const WORLD_CONFIG: SimulationConfig = {
  world: { seed: 'nova-step1', width: 12, height: 12 },
}

const container = document.querySelector<HTMLElement>('#nova-container')
if (container === null) {
  throw new Error('Missing #nova-container element')
}

const grid = WORLD_CONFIG.world
const novaScene = createNovaScene(container, grid)
const novaRenderer = createNovaRenderer(novaScene, grid)
const controller = createGameController(createInitialState(WORLD_CONFIG))

const clock = createSimulationClock({
  baseTicksPerSecond: 2,
  onTick: () => controller.dispatch(),
})

// --- UI references -----------------------------------------------------------

const ui = {
  play: document.querySelector<HTMLButtonElement>('#btn-play'),
  pause: document.querySelector<HTMLButtonElement>('#btn-pause'),
  step: document.querySelector<HTMLButtonElement>('#btn-step'),
  buildResidence: document.querySelector<HTMLButtonElement>('#btn-build-residence'),
  buildFarm: document.querySelector<HTMLButtonElement>('#btn-build-farm'),
  buildWorkshop: document.querySelector<HTMLButtonElement>('#btn-build-workshop'),
  buildWell: document.querySelector<HTMLButtonElement>('#btn-build-well'),
  buildRoad: document.querySelector<HTMLButtonElement>('#btn-build-road'),
  speed: document.querySelector<HTMLSelectElement>('#speed'),
  tick: document.querySelector<HTMLSpanElement>('#ui-tick'),
  construction: document.querySelector<HTMLSpanElement>('#ui-construction'),
  food: document.querySelector<HTMLSpanElement>('#ui-food'),
  foodForecast: document.querySelector<HTMLSpanElement>('#ui-food-forecast'),
  water: document.querySelector<HTMLSpanElement>('#ui-water'),
  waterStatus: document.querySelector<HTMLSpanElement>('#ui-water-status'),
  buildings: document.querySelector<HTMLSpanElement>('#ui-buildings'),
  operational: document.querySelector<HTMLSpanElement>('#ui-operational'),
  colonists: document.querySelector<HTMLSpanElement>('#ui-colonists'),
  jobs: document.querySelector<HTMLSpanElement>('#ui-jobs'),
  roads: document.querySelector<HTMLSpanElement>('#ui-roads'),
  scenario: document.querySelector<HTMLSelectElement>('#scenario'),
  stage: document.querySelector<HTMLSpanElement>('#ui-stage'),
  nextStage: document.querySelector<HTMLSpanElement>('#ui-next-stage'),
  objective: document.querySelector<HTMLElement>('#ui-objective'),
  objectiveStatus: document.querySelector<HTMLElement>('#ui-objective-status'),
  progress: document.querySelector<HTMLElement>('#ui-progress'),
  blocked: document.querySelector<HTMLElement>('#ui-blocked'),
  status: document.querySelector<HTMLDivElement>('#ui-status'),
  insType: document.querySelector<HTMLElement>('#ins-type'),
  insStatus: document.querySelector<HTMLElement>('#ins-status'),
  insConstruction: document.querySelector<HTMLElement>('#ins-construction'),
  insHousing: document.querySelector<HTMLElement>('#ins-housing'),
  insWorker: document.querySelector<HTMLElement>('#ins-worker'),
  insCrew: document.querySelector<HTMLElement>('#ins-crew'),
  reassignRow: document.querySelector<HTMLElement>('#reassign-row'),
  reassignTarget: document.querySelector<HTMLSelectElement>('#reassign-target'),
  reassignConfirm: document.querySelector<HTMLButtonElement>('#btn-reassign'),
  crewRow: document.querySelector<HTMLElement>('#crew-row'),
  crewTarget: document.querySelector<HTMLSelectElement>('#crew-target'),
  crewConfirm: document.querySelector<HTMLButtonElement>('#btn-crew'),
  crewRelease: document.querySelector<HTMLButtonElement>('#btn-crew-release'),
}

const BUILDING_LABELS: Readonly<Record<string, string>> = {
  residence: 'Residence',
  farm: 'Farm',
  workshop: 'Workshop',
  well: 'Well',
}

const labelOf = (building: BuildingInspection): string =>
  BUILDING_LABELS[building.type] ?? building.type

const inspectionStatusLabel = (
  building: BuildingInspection
): string =>
  building.status === 'operational' ? 'Operational' : 'Under construction'

const setStatus = (message: string): void => {
  if (ui.status !== null) {
    ui.status.textContent = message
  }
}

// --- Building selection + causal inspection panel (Step 3) ------------------

let selectedBuildingId: string | null = null

/** Colonist currently offered for reassignment (Step 10M). Derived per inspection refresh. */
let currentWorkerColonistId: string | null = null

const REASSIGN_REASON_LABELS: Readonly<Record<string, string>> = {
  unknownColonist: 'unknown worker',
  noResidence: 'no residence',
  unknownWorkplace: 'missing',
  notWorkplace: 'not a workplace',
  notOperational: 'not operational',
  workplaceOccupied: 'occupied',
  notConnected: 'no road access',
}

/** Step 10Y: deterministic crew-rejection labels. */
const CREW_REASON_LABELS: Readonly<Record<string, string>> = {
  unknownColonist: 'unknown worker',
  unknownBuilding: 'missing',
  notUnderConstruction: 'not under construction',
  alreadyAssignedToConstruction: 'already building elsewhere',
  siteAlreadyCrewed: 'site already crewed',
}

const refreshInspection = (): void => {
  const building =
    selectedBuildingId === null
      ? null
      : getBuildingInspection(controller.getState(), selectedBuildingId)
  if (ui.insType !== null) {
    ui.insType.textContent = building === null ? '[ none ]' : labelOf(building)
  }
  if (ui.insStatus !== null) {
    ui.insStatus.textContent = building === null
      ? 'No building selected'
      : inspectionStatusLabel(building)
  }
  if (ui.insConstruction !== null) {
    ui.insConstruction.textContent =
      building !== null && building.status === 'underConstruction'
        ? `Construction — ${building.constructionRemaining} / ${building.constructionDuration} ticks remaining`
        : ''
  }
  if (ui.insHousing !== null) {
    if (building === null) {
      ui.insHousing.textContent = ''
    } else if (building.type === 'farm') {
      // Step 10E §7: a Farm produces only when staffed. Vacant shows 0.
      const farmWorkers = countWorkersAt(controller.getState(), building.id)
      ui.insHousing.textContent =
        building.status === 'operational' && farmWorkers > 0
          ? `Food production — producing +${FOOD_PER_FARM_PER_TICK}/tick (staffed)`
          : building.status === 'operational'
            ? 'Food production — vacant, producing +0/tick'
            : 'Food production — not operational yet'
    } else if (building.type === 'workshop') {
      // Step 07C §12: job capacity is a Workshop property (1 once
      // operational); workers are derived from colonist assignments.
      // Step 08C §7: upkeep cause — 1/tick when staffed, 0 when vacant.
      const capacity = jobCapacityOf(building)
      const workers = countWorkersAt(controller.getState(), building.id)
      const upkeep =
        building.status === 'operational' && workers > 0
          ? 'upkeep 1/tick'
          : 'upkeep 0 (vacant)'
      ui.insHousing.textContent = `Jobs — Capacity ${capacity} · Workers ${workers}/${capacity} · ${upkeep}`
    } else if (building.type === 'well') {
      // Step 10P: the concrete Water production contract.
      const workers = countWorkersAt(controller.getState(), building.id)
      const roadAccess = getBuildingRoadAccess(
        controller.getState(),
        building.id
      ).hasRoadAccess
      ui.insHousing.textContent =
        building.status !== 'operational'
          ? 'Water production — not operational yet'
          : workers === 0
            ? 'Water production — vacant, producing +0/tick'
            : !roadAccess
              ? 'Water production — staffed but no road access, producing +0/tick'
              : `Water production — producing +${WATER_PER_WELL_PER_TICK}/tick (staffed)`
    } else {
      ui.insHousing.textContent = `Housing — Capacity ${building.housingCapacity} · Residents ${building.occupiedHousing}`
    }
  }

  // Step 10M: which colonist works here, and the explicit reassignment
  // control. Eligibility comes from the domain query, never re-derived here.
  const state = controller.getState()
  const workplace =
    selectedBuildingId === null ? undefined : state.buildings[selectedBuildingId]
  const isWorkplace =
    workplace !== undefined &&
    (workplace.type === 'farm' ||
      workplace.type === 'workshop' ||
      workplace.type === 'well')
  let workerId: string | null = null
  if (isWorkplace && workplace?.status === 'operational') {
    const workers = Object.values(state.colonists)
      .filter((colonist) => colonist.workplaceId === workplace.id)
      .map((colonist) => colonist.id)
      .sort()
    workerId = workers[0] ?? null
  }
  currentWorkerColonistId = workerId
  if (ui.insWorker !== null) {
    if (!isWorkplace) {
      ui.insWorker.textContent = ''
    } else if (workerId === null) {
      ui.insWorker.textContent = 'Worker — none (vacant)'
    } else {
      const colonist = getColonistInspection(state, workerId)
      const mode =
        colonist?.workplaceAssignmentMode === 'manual'
          ? 'manual override'
          : 'automatic assignment'
      ui.insWorker.textContent = `Worker — ${mode}`
    }
  }
  if (ui.reassignRow !== null && ui.reassignTarget !== null) {
    if (workerId === null) {
      ui.reassignRow.style.display = 'none'
      ui.reassignTarget.replaceChildren()
    } else {
      ui.reassignRow.style.display = 'flex'
      const options = getReassignmentOptions(state, workerId)
      // One ordinal per building TYPE (Farm 1, Workshop 1, Well 1, ...), so a
      // mixed list never relabels a Well as a Workshop (Step 10AQ).
      const ordinals = new Map<string, number>()
      const counts = new Map<BuildingType, number>()
      for (const option of options) {
        const next = (counts.get(option.type) ?? 0) + 1
        counts.set(option.type, next)
        ordinals.set(option.workplaceId, next)
      }
      const select = ui.reassignTarget
      select.replaceChildren()
      for (const option of options) {
        const element = document.createElement('option')
        element.value = option.workplaceId
        const typeLabel = BUILDING_LABELS[option.type] ?? option.type
        const ordinal = ordinals.get(option.workplaceId) ?? 0
        if (option.isCurrent) {
          element.textContent = `${typeLabel} ${ordinal} — current`
          element.disabled = true
        } else if (!option.eligible) {
          const reason =
            REASSIGN_REASON_LABELS[option.reason ?? ''] ?? option.reason
          element.textContent = `${typeLabel} ${ordinal} — ${reason}`
          element.disabled = true
        } else {
          const distance = option.distance ?? 0
          element.textContent = `${typeLabel} ${ordinal} · ${distance} step${distance === 1 ? '' : 's'} · workers ${option.workers}/${option.capacity}`
        }
        select.appendChild(element)
      }
      const hasEligible = options.some((option) => option.eligible)
      ui.reassignConfirm?.toggleAttribute('disabled', !hasEligible)
    }
  }

  // Step 10Y: construction crew surface. The player sees whether the site has
  // a crew, which colonist it is, and the resulting speed, and can assign an
  // eligible colonist or release the current crew. Eligibility comes from the
  // domain query, never re-derived here.
  const underConstruction = workplace !== undefined && workplace.status === 'underConstruction'
  if (ui.insCrew !== null) {
    if (!underConstruction || building === null) {
      ui.insCrew.textContent = ''
    } else {
      const crewId = building.constructionCrewId
      const crewLabel =
        crewId === null
          ? 'None'
          : `Colonist #${crewId.replace('colonist-', '')}`
      ui.insCrew.textContent =
        building.constructionProgressPerTick === 2
          ? `Crew — ${crewLabel} · Speed +1 per tick`
          : `Crew — ${crewLabel} · Speed normal`
    }
  }
  if (ui.crewRow !== null && ui.crewTarget !== null) {
    if (!underConstruction || selectedBuildingId === null) {
      ui.crewRow.style.display = 'none'
      ui.crewTarget.replaceChildren()
    } else {
      ui.crewRow.style.display = 'flex'
      const options = getConstructionCrewOptions(state, selectedBuildingId)
      const select = ui.crewTarget
      select.replaceChildren()
      for (const option of options) {
        const element = document.createElement('option')
        element.value = option.colonistId
        const ordinal = option.colonistId.replace('colonist-', '')
        if (option.isCurrent) {
          element.textContent = `Colonist #${ordinal} — current crew`
          element.disabled = true
        } else if (!option.eligible) {
          const reason =
            CREW_REASON_LABELS[option.reason ?? ''] ?? option.reason
          element.textContent = `Colonist #${ordinal} — ${reason}`
          element.disabled = true
        } else {
          element.textContent = `Colonist #${ordinal} · ${option.workplaceId === null ? 'idle' : 'working'}`
        }
        select.appendChild(element)
      }
      ui.crewConfirm?.toggleAttribute(
        'disabled',
        !options.some((option) => option.eligible)
      )
      ui.crewRelease?.toggleAttribute(
        'disabled',
        building?.constructionCrewId === null
      )
    }
  }
}

// --- Placement tool selection (Step 06B Part B, Road tool Step 09H) ----------
// Minimal extension of the existing palette convention: exactly one tool is
// active, `aria-pressed` reflects it, and every cost shown comes from the
// domain (building catalog / ROAD_CONSTRUCTION_COST). No generic tool
// framework is introduced for the Road tool.
type PlacementTool =
  | { readonly kind: 'building'; readonly type: BuildingType }
  | { readonly kind: 'road' }

let selectedTool: PlacementTool = { kind: 'building', type: 'residence' }

const refreshToolButtons = (): void => {
  const activeType = selectedTool.kind === 'building' ? selectedTool.type : null
  ui.buildResidence?.setAttribute(
    'aria-pressed',
    String(activeType === 'residence')
  )
  ui.buildFarm?.setAttribute('aria-pressed', String(activeType === 'farm'))
  ui.buildWorkshop?.setAttribute(
    'aria-pressed',
    String(activeType === 'workshop')
  )
  ui.buildWell?.setAttribute('aria-pressed', String(activeType === 'well'))
  ui.buildRoad?.setAttribute('aria-pressed', String(selectedTool.kind === 'road'))
}

const selectBuildingType = (type: BuildingType): void => {
  selectedTool = { kind: 'building', type }
  refreshToolButtons()
  // Step 10AD: the selection feedback states the FULL construction contract,
  // including the Workshop's one-off Water investment, straight from the
  // catalog (no second affordability rule, no hardcoded duplicate).
  const definition = getBuildingDefinition(type)
  const water = definition.constructionWaterCost
  setStatus(
    `${BUILDING_LABELS[type] ?? type} selected — material ${definition.constructionCost}${
      water === 0 ? '' : ` + ${water} water`
    } per building`
  )
}

const selectRoadTool = (): void => {
  selectedTool = { kind: 'road' }
  refreshToolButtons()
  setStatus(
    `Road selected — material ${ROAD_CONSTRUCTION_COST} per cell · drag horizontally or vertically`
  )
}

ui.buildResidence?.addEventListener('click', () => {
  selectBuildingType('residence')
})
ui.buildFarm?.addEventListener('click', () => {
  selectBuildingType('farm')
})
ui.buildWorkshop?.addEventListener('click', () => {
  selectBuildingType('workshop')
})
ui.buildWell?.addEventListener('click', () => {
  selectBuildingType('well')
})
ui.buildRoad?.addEventListener('click', selectRoadTool)
if (ui.buildRoad !== null) {
  // Cost label from the domain constant, never a hardcoded duplicate.
  ui.buildRoad.textContent = `Road · ${ROAD_CONSTRUCTION_COST}`
}
if (ui.buildWorkshop !== null) {
  // Step 10AD: the Workshop's construction contract (25 Material + 1 Water)
  // comes from the catalog. It is carried by the ACCESSIBLE NAME and the
  // tooltip, never by a wider palette label: the palette row width is part of
  // the layout the canvas hit-testing geometry assumes, so a longer label
  // reflows the row and breaks pointer/cell alignment. The visible cost is in
  // the hover status and the selection/rejection feedback below.
  const workshop = getBuildingDefinition('workshop')
  const cost = `${workshop.constructionCost} Material + ${workshop.constructionWaterCost} Water`
  ui.buildWorkshop.title = `Workshop — costs ${cost}`
  ui.buildWorkshop.setAttribute('aria-label', `Workshop — costs ${cost}`)
}
refreshToolButtons()

// Step 10M: the smallest player-facing control. The player selects the
// building where a colonist currently works, chooses a valid target from the
// domain-provided options, and dispatches `reassignColonist`. Validation and
// persistence stay in the domain/application layers; the UI never mutates
// canonical state directly.
const confirmReassign = (): void => {
  if (currentWorkerColonistId === null || ui.reassignTarget === null) {
    return
  }
  const targetId = ui.reassignTarget.value
  if (targetId === '') {
    return
  }
  const before = controller.getState()
  const target = before.buildings[targetId]
  const targetLabel =
    target === undefined
      ? targetId
      : (BUILDING_LABELS[target.type] ?? target.type)
  const colonistId = currentWorkerColonistId
  controller.dispatch({
    type: 'reassignColonist',
    colonistId,
    workplaceId: targetId,
  })
  const after = controller.getState()
  const updated = after.colonists[colonistId]
  if (
    updated !== undefined &&
    updated.workplaceId === targetId &&
    updated.workplaceAssignmentMode === 'manual'
  ) {
    setStatus(`Worker reassigned to ${targetLabel} — manual override`)
  } else {
    setStatus('Reassignment rejected')
  }
  refreshInspection()
}
ui.reassignConfirm?.addEventListener('click', confirmReassign)

// Step 10Y: the construction crew control reuses the 10M conventions — one
// domain-validated select plus explicit buttons, no drag, no dashboard.
const confirmCrewAssign = (): void => {
  if (selectedBuildingId === null || ui.crewTarget === null) {
    return
  }
  const colonistId = ui.crewTarget.value
  if (colonistId === '') {
    return
  }
  controller.dispatch({
    type: 'assignConstructionCrew',
    colonistId,
    buildingId: selectedBuildingId,
  })
  const after = controller.getState()
  const crewed = after.colonists[colonistId]?.constructionAssignmentId === selectedBuildingId
  // A 2-tick site completes on the assignment tick itself, so the crew is
  // already released by the time we look: an operational site also proves the
  // assignment was accepted.
  const completed = after.buildings[selectedBuildingId]?.status === 'operational'
  setStatus(
    crewed || completed
      ? `Construction crew assigned — Colonist #${colonistId.replace('colonist-', '')} builds +1 per tick`
      : 'Crew assignment rejected'
  )
}

const releaseCrew = (): void => {
  if (selectedBuildingId === null) {
    return
  }
  const crewId = getConstructionCrewId(controller.getState(), selectedBuildingId)
  if (crewId === null) {
    setStatus('No construction crew to release')
    return
  }
  controller.dispatch({
    type: 'assignConstructionCrew',
    colonistId: crewId,
    buildingId: null,
  })
  const after = controller.getState()
  setStatus(
    after.colonists[crewId]?.constructionAssignmentId === null
      ? 'Construction crew released'
      : 'Crew release rejected'
  )
}

ui.crewConfirm?.addEventListener('click', confirmCrewAssign)
ui.crewRelease?.addEventListener('click', releaseCrew)

// --- Render + UI update on canonical state change ----------------------------

// --- Causal status derivation (Step 06B Part A) -------------------------------
// The status line explains the most recent tick. refreshUi derives the message
// from the previous → current state transition and records whether this tick
// carried causal information. Control handlers must never overwrite such a
// message with a generic label (Step 06A finding: STEP erased the starvation
// explanation with "stepped one tick").
let starved = false
let previousColonistCount = 0
let previousFood = INITIAL_FOOD
let previousEmployed = 0
let previousConstruction = INITIAL_CONSTRUCTION_MATERIAL
let previousBuildingCount = 0
let tickCausalMessage = false

// Step 10AL: scenario framing. Pure UI state, never part of the simulation.
let currentScenarioId = 'default'
let currentScenarioObjective: ObjectiveDefinition | null = null
/** Step 10AM: skip the per-tick causal status for one scenario-load frame. */
let suppressCausalMessage = false

/**
 * Step 10AL: progression framing, derived from existing state only. The
 * checklist shows the next stage's conditions (or the current one once
 * progression is deferred); the objective label comes from the scenario.
 */
const renderProgression = (): void => {
  const status = getProgression(controller.getState())
  if (ui.stage !== null) {
    ui.stage.textContent = status.stageLabel
  }
  if (ui.nextStage !== null) {
    ui.nextStage.textContent = status.nextStageLabel ?? 'not yet defined'
  }
  const objectiveStatus: ObjectiveStatus | null =
    currentScenarioObjective === null
      ? null
      : getObjectiveStatus(controller.getState(), currentScenarioObjective)
  if (ui.objective !== null) {
    ui.objective.textContent =
      currentScenarioObjective === null
        ? ''
        : `Objective — ${currentScenarioObjective.label}
Constraint — ${currentScenarioObjective.constraint}`
  }
  if (ui.objectiveStatus !== null) {
    if (objectiveStatus === null) {
      ui.objectiveStatus.textContent = ''
    } else {
      const met = objectiveStatus.requirements.filter((entry) => entry.met).length
      const total = objectiveStatus.requirements.length
      const pending =
        objectiveStatus.blockers.length === 0
          ? ''
          : ` (${objectiveStatus.blockers.join(', ')})`
      ui.objectiveStatus.textContent =
        objectiveStatus.state === 'completed'
          ? 'Objective complete'
          : objectiveStatus.state === 'failed'
            ? 'Objective failed — the colony is gone'
            : `Objective in progress — ${met} / ${total}${pending}`
    }
  }
  const checklist =
    status.nextConditions.length > 0 ? status.nextConditions : status.conditions
  if (ui.progress !== null) {
    ui.progress.textContent = checklist
      .map(
        (condition) =>
          `${condition.met ? '✓' : '✗'} ${condition.label} — ${condition.detail}`
      )
      .join('\n')
  }
  if (ui.blocked !== null) {
    ui.blocked.textContent =
      status.blockers.length === 0
        ? ''
        : `Blocked by — ${status.blockers.join(', ')}`
  }
}

/**
 * Step 10AL: load a scenario (or the unchanged default game). The state is
 * assembled once from scenario data and handed to the controller; no
 * simulation rule runs here and no rule differs between scenarios.
 */
const applyScenario = (id: string): void => {
  const definition = findScenario(id) ?? null
  const next =
    definition === null
      ? createDefaultState(WORLD_CONFIG)
      : createScenarioState(WORLD_CONFIG, definition)
  clock.pause()
  selectedBuildingId = null
  selectedTool = { kind: 'building', type: 'residence' }
  currentScenarioId = definition === null ? 'default' : definition.id
  currentScenarioObjective = definition === null ? null : definition.objective
  // Reset transition tracking so the new state's first frame is not read as a
  // per-tick delta by the causal status messages.
  previousColonistCount = Object.keys(next.colonists).length
  previousFood = next.resources.food
  previousEmployed = getEmploymentSummary(next).employed
  previousConstruction = next.resources.construction
  previousBuildingCount = Object.keys(next.buildings).length
  starved = false
  tickCausalMessage = false
  suppressCausalMessage = true
  controller.load(next)
  refreshToolButtons()
  // The scenario status is written last so it is the frame's status line; the
  // load refresh already updated the stats and the progression panel.
  setStatus(
    definition === null
      ? 'Free play — no scenario objective'
      : `Scenario — ${definition.name}: ${definition.objective.label}`
  )
  refreshInspection()
}

const pluralize = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`

/** Presentation-only food status derived from real state (Step 05C §10). */
const foodStatusLabel = (state: SimulationState): string => {
  const food = getResourceStock(state).food
  const colonists = Object.keys(state.colonists).length
  if (starved) {
    return 'starved'
  }
  if (food === 0 && colonists > 0) {
    return 'shortage'
  }
  return 'fed'
}

/**
 * Step 07C §1: the forecast must never claim a finite starvation time while
 * the colony has a non-negative net food flow. Wording follows the existing
 * HUD (numeric Food stays in its own element; this is only the suffix).
 */
const foodForecastLabel = (state: SimulationState): string => {
  const remaining = getFoodTicksRemaining(state)
  if (remaining !== null) {
    return ` · ~${remaining} ticks`
  }
  return isFoodSupplySustainable(state) ? ' · sustainable' : ''
}

const refreshUi = (): void => {
  const s = controller.getState()
  const colonists = Object.keys(s.colonists).length
  const food = getResourceStock(s).food
  const employment = getEmploymentSummary(s)
  const prevColonists = previousColonistCount
  const prevFood = previousFood
  const prevEmployed = previousEmployed
  const prevConstruction = previousConstruction
  const prevBuildings = previousBuildingCount
  previousColonistCount = colonists
  previousFood = food
  previousEmployed = employment.employed
  previousConstruction = getResourceStock(s).construction
  previousBuildingCount = Object.keys(s.buildings).length

  if (ui.tick !== null) {
    ui.tick.textContent = String(s.time.tick)
  }
  if (ui.construction !== null) {
    ui.construction.textContent = String(getResourceStock(s).construction)
  }
  if (ui.food !== null) {
    ui.food.textContent = String(food)
  }
  if (ui.foodForecast !== null) {
    ui.foodForecast.textContent = foodForecastLabel(s)
  }
  if (ui.water !== null) {
    ui.water.textContent = String(getWaterStock(s))
  }
  if (ui.waterStatus !== null) {
    ui.waterStatus.textContent = !hasOperationalWell(s)
      ? ''
      : isWaterSupplySustainable(s)
        ? ' · served'
        : ' · shortage'
  }
  if (ui.buildings !== null) {
    ui.buildings.textContent = String(Object.keys(s.buildings).length)
  }
  if (ui.operational !== null) {
    ui.operational.textContent = String(
      Object.values(s.buildings).filter((b) => b.status === 'operational')
        .length
    )
  }
  if (ui.colonists !== null) {
    ui.colonists.textContent = String(colonists)
  }
  if (ui.jobs !== null) {
    ui.jobs.textContent = `${employment.employed} / ${employment.jobCapacity}`
  }
  if (ui.roads !== null) {
    const roadCount = Object.keys(s.roads).length
    const operationalRoads = Object.values(s.roads).filter(
      (road) => road.status === 'operational'
    ).length
    ui.roads.textContent = `${roadCount} (${operationalRoads} operational)`
  }

  // Causal message from the state transition, highest priority first.
  // Steady while its condition holds; never a per-tick event queue.
  //
  // Step 10AM: a scenario load replaces the canonical state without a
  // simulation tick, so the per-tick delta arithmetic below would invent a
  // production message ("0.5 farms produced 1 food"). The load path sets
  // this flag for exactly one refresh; the scenario status wins that frame.
  tickCausalMessage = false
  if (suppressCausalMessage) {
    suppressCausalMessage = false
    tickCausalMessage = true
    renderProgression()
    return
  }
  if (prevColonists > 0 && colonists === 0) {
    // Whole colony starved this tick: the reserve was exhausted (consumeFood)
    // and updatePopulation removed everyone in the same tick.
    starved = true
    setStatus('Food shortage — colony starved (population 0)')
    tickCausalMessage = true
  } else if (colonists > prevColonists) {
    starved = false
    setStatus('Colonist arrived — housing available and food is sufficient')
    tickCausalMessage = true
  } else if (prevColonists > 0) {
    // Causal readout from observable state only (Step 07C §12 composes the
    // existing food messages with the new employment/material causes).
    // (Starvation ticks are handled above; here the colony was fed and its
    // population is unchanged, so consumption is exactly the food need.)
    //
    // Step 10E timing: produceFood runs BEFORE assignJobs, so this tick's
    // food inflow came from the PREVIOUS tick's assignment — reading the
    // current assignment would credit production one tick early and inflate
    // "consumed". Derive the inflow from the measured delta instead:
    //   delta = produced_applied - consumed_applied
    const consumed = prevColonists
    const produced = food - prevFood + consumed
    const material = getMaterialProductionPerTick(s)
    const parts: string[] = []
    if (employment.employed > prevEmployed) {
      // Step 10E: Farms joined the workplace pool, so report the type(s) that
      // actually hold workers instead of always claiming "Workshop".
      const staffedFarms = getProductiveFarmWorkerCount(s)
      const staffedWorkshops = countStaffedOperationalWorkshops(s)
      parts.push(
        staffedFarms > 0 && staffedWorkshops > 0
          ? 'Colonists assigned to Farm and Workshop'
          : staffedFarms > 0
            ? 'Colonist assigned to Farm'
            : 'Colonist assigned to Workshop'
      )
    }
    if (consumed > 0) {
      parts.push(
        `${pluralize(prevColonists, 'colonist')} consumed ${consumed} food`
      )
    }
    if (produced > 0) {
      const farms = produced / FOOD_PER_FARM_PER_TICK
      parts.push(`${pluralize(farms, 'farm')} produced ${produced} food`)
    }
    if (material > 0) {
      // Step 08E §18: X is productive workers (valid Workshop assignments),
      // never raw population — excess unassigned colonists are excluded.
      const productive = getProductiveWorkerCount(s)
      parts.push(
        `${pluralize(productive, 'worker')} produced ${material} material`
      )
      // Step 08C §7: upkeep cause from real values. Paid is reconstructed
      // from the stock transition (one command per tick, every catalog cost
      // is 25 — Step 08C §8 frozen). Step 08F: production inflow is storage-
      // clamped, so reconstruction uses STORED production, not gross.
      // Step 08G: stored output filled the space available BEFORE the tick
      // (capacity − pre-tick stock). The post-tick stock is already reduced
      // by construction spending, so clamping against it would double-count
      // stored output as upkeep paid (a 25-build from a 25 stock must read
      // "shortfall — paid 0/1", not "upkeep 1").
      const upkeepDue = getMaterialUpkeepPerTick(s)
      if (upkeepDue > 0) {
        const buildCost = Math.max(0, Object.keys(s.buildings).length - prevBuildings) * 25
        const stored = Math.min(
          getMaterialProductionPerTick(s),
          Math.max(0, getMaterialStorageCapacity(s) - prevConstruction)
        )
        const upkeepPaid = Math.max(
          0,
          prevConstruction + stored - buildCost - getResourceStock(s).construction
        )
        if (upkeepPaid < upkeepDue) {
          parts.push(`upkeep shortfall — paid ${upkeepPaid}/${upkeepDue}`)
        } else {
          parts.push(`upkeep ${upkeepDue}`)
        }
      }
    }
    if (parts.length > 0) {
      // Step 10P: surface the Water admission block alongside the other
      // causal messages, so the player can see why population is not growing.
      if (
        hasOperationalWell(s) &&
        getHousingSummary(s).availableCapacity > 0 &&
        getWaterServedResidenceCount(s) === 0
      ) {
        parts.push('No water service — population cannot grow')
      }
      setStatus(parts.join(' · '))
      tickCausalMessage = true
    } else if (employment.employed === 0) {
      // Step 08C §7: no workers, nothing produced, upkeep is 0.
      setStatus('No production · upkeep 0')
      tickCausalMessage = true
    }
  }
  if (!tickCausalMessage) {
    if (getHousingSummary(s).availableCapacity > 0 && food === 0) {
      setStatus('No colonist admitted — food unavailable')
      tickCausalMessage = true
    } else if (
      hasOperationalWell(s) &&
      getHousingSummary(s).availableCapacity > 0 &&
      getWaterServedResidenceCount(s) === 0
    ) {
      // Step 10P: the second gate — Food and housing are not enough once a
      // Well exists but no Residence is served by it.
      setStatus('No water service — population cannot grow')
      tickCausalMessage = true
    } else if (starved && colonists === 0) {
      setStatus('Food shortage — colony starved (population 0)')
      tickCausalMessage = true
    }
  }
  renderProgression()
}

controller.subscribe(() => {
  novaRenderer.render(controller.getSnapshot())
  refreshUi()
  refreshInspection()
})

// Initial frame.
novaRenderer.render(controller.getSnapshot())
refreshUi()
refreshInspection()

// --- Scenario selection (Step 10AL) ------------------------------------------

if (ui.scenario !== null) {
  const options: HTMLOptionElement[] = []
  const freePlay = document.createElement('option')
  freePlay.value = 'default'
  freePlay.textContent = 'Free play'
  options.push(freePlay)
  for (const scenario of SCENARIOS) {
    const option = document.createElement('option')
    option.value = scenario.id
    option.textContent = scenario.name
    options.push(option)
  }
  ui.scenario.replaceChildren(...options)
  ui.scenario.value = currentScenarioId
  ui.scenario.addEventListener('change', () => {
    applyScenario(ui.scenario?.value ?? 'default')
  })
}

// --- Simulation controls -----------------------------------------------------

ui.play?.addEventListener('click', () => {
  clock.play()
  if (!tickCausalMessage) {
    setStatus('simulation running')
  }
})
ui.pause?.addEventListener('click', () => {
  clock.pause()
  if (!tickCausalMessage) {
    setStatus('simulation paused')
  }
})
ui.step?.addEventListener('click', () => {
  clock.pause()
  clock.stepOnce()
  if (!tickCausalMessage) {
    setStatus('stepped one tick')
  }
})
ui.speed?.addEventListener('change', () => {
  const value = Number(ui.speed?.value)
  clock.setSpeed(value === 2 ? 2 : value === 4 ? 4 : 1)
})

// --- Placement interaction ---------------------------------------------------

const canvas = novaScene.renderer.domElement
let isPointerDownOnCanvas = false
/** Road drag anchor (Step 09H): set on pointerdown while the Road tool is active. */
let roadDragStart: CellCoordinate | null = null
/** Candidate cells of the current road gesture; empty when the gesture is invalid. */
let roadDragCells: readonly CellCoordinate[] = []
let roadDragValid = false

const clearPreview = (): void => {
  novaRenderer.showPlacementIndicator(null, false)
  novaRenderer.showRoadPreview([], false)
}

/**
 * Candidate cells for the Road tool: the hovered cell alone, or the existing
 * 09C drag expansion from the anchor. `expandRoadDrag` returns null for
 * diagonal / L-shaped gestures, which the UI reports as unsupported instead of
 * inventing a geometry the domain would reject.
 */
const roadCandidateCells = (
  cell: CellCoordinate
): readonly CellCoordinate[] | null => {
  const start = roadDragStart
  if (start === null) {
    return [cell]
  }
  return expandRoadDrag(start, cell)
}

const describeCellStatus = (cell: CellCoordinate): string => {
  const tool = selectedTool
  if (tool.kind !== 'building') {
    return ''
  }
  // Step 10AD-1: the preview and the dispatch gate share ONE affordability
  // predicate (getPlacementAffordability), so the hover can never claim
  // "insufficient material" for a placement the domain would accept.
  const affordability = getPlacementAffordability(controller.getState(), cell, tool.type)
  const definition = getBuildingDefinition(tool.type)
  const waterSuffix =
    definition.constructionWaterCost === 0 ? '' : ` · water ${definition.constructionWaterCost}`
  if (affordability.affordable) {
    const cost = definition.constructionCost
    const storedSuffix = affordability.coveredByStoredProduction
      ? ` (incl. ${getMaterialStoredProductionPerTick(controller.getState())} stored this tick)`
      : ''
    return `cell ${cell.x},${cell.y} — ready · material ${cost}${storedSuffix}${waterSuffix}`
  }
  const placement = affordability.placement
  if (!placement.valid && placement.reason === 'insufficientResources') {
    // Explainable failure (Step 4 §13): values come from real queries.
    return `cell ${cell.x},${cell.y} — insufficient material (${affordability.materialAvailable}/${affordability.materialRequired})`
  }
  if (!placement.valid && placement.reason === 'insufficientWater') {
    // Step 10AD: the Water construction investment is its own causal reason,
    // and stored Material production never covers it.
    return `cell ${cell.x},${cell.y} — insufficient water (${affordability.waterAvailable}/${affordability.waterRequired})`
  }
  return `cell ${cell.x},${cell.y} — ${
    !placement.valid && placement.reason === 'cellOccupied' ? 'occupied' : 'out of bounds'
  }`
}

/**
 * Road feedback from the authoritative 09C validator — the UI never
 * re-implements bounds, occupancy, collision, cost or affordability.
 */
const describeRoadCells = (cells: readonly CellCoordinate[]): string => {
  const validation = validateRoadsPlacement(controller.getState(), cells)
  const prefix = `road ${cells.length} cell${cells.length === 1 ? '' : 's'}`
  if (validation.valid) {
    return `${prefix} — ready · material ${validation.totalCost}`
  }
  switch (validation.reason) {
    case 'emptyCells':
      return `${prefix} — nothing to place`
    case 'outOfBounds':
      return `${prefix} — out of bounds`
    case 'cellOccupiedByBuilding':
      return `${prefix} — occupied by building`
    case 'cellOccupiedByRoad':
      return `${prefix} — road already exists here`
    case 'insufficientResources':
      return `${prefix} — insufficient material (${getResourceStock(controller.getState()).construction}/${cells.length * ROAD_CONSTRUCTION_COST})`
  }
}

const updateHover = (clientX: number, clientY: number): void => {
  const cell = novaRenderer.pickCell(clientX, clientY)
  if (cell === null) {
    clearPreview()
    setStatus('')
    return
  }
  if (selectedTool.kind === 'building') {
    const valid = validatePlacement(
      controller.getState(),
      cell,
      selectedTool.type
    ).valid
    novaRenderer.showPlacementIndicator(cell, valid)
    setStatus(describeCellStatus(cell))
    return
  }
  // Road tool: the preview covers the whole candidate set, colored by the
  // single authoritative validation of that set (never per-cell guesses).
  const cells = roadCandidateCells(cell)
  if (cells === null) {
    novaRenderer.showRoadPreview([cell], false)
    roadDragCells = []
    roadDragValid = false
    const start = roadDragStart
    setStatus(
      start === null
        ? 'road — invalid cell'
        : `road ${start.x},${start.y} → ${cell.x},${cell.y} — diagonal drag not supported`
    )
    return
  }
  const validation = validateRoadsPlacement(controller.getState(), cells)
  novaRenderer.showRoadPreview(cells, validation.valid)
  setStatus(describeRoadCells(cells))
  roadDragCells = cells
  roadDragValid = validation.valid
}

/**
 * Commit the current road gesture (Step 09H). The set is re-validated against
 * the live state at commit time (the simulation may have ticked since the last
 * pointermove), and an invalid set dispatches nothing: no tick, no Material
 * spent. `applyCommand` re-validates again — the domain stays authoritative.
 */
const commitRoadPlacement = (): void => {
  const cells = roadDragCells
  const wasValid = roadDragValid
  roadDragStart = null
  roadDragCells = []
  roadDragValid = false
  if (cells.length === 0 || !wasValid) {
    setStatus('road placement rejected — no valid cells in this gesture')
    return
  }
  const validation = validateRoadsPlacement(controller.getState(), cells)
  if (!validation.valid) {
    setStatus(describeRoadCells(cells))
    return
  }
  controller.dispatch({ type: 'placeRoads', cells })
  clearPreview()
  setStatus(
    `${cells.length} road cell${cells.length === 1 ? '' : 's'} placed — under construction`
  )
}

canvas.addEventListener('pointermove', (event) => {
  updateHover(event.clientX, event.clientY)
})
canvas.addEventListener('pointerleave', () => {
  clearPreview()
  roadDragStart = null
  roadDragCells = []
  roadDragValid = false
})
canvas.addEventListener('pointerdown', (event) => {
  isPointerDownOnCanvas = true
  if (selectedTool.kind === 'road') {
    roadDragStart = novaRenderer.pickCell(event.clientX, event.clientY)
    roadDragCells = []
    roadDragValid = false
  }
  updateHover(event.clientX, event.clientY)
})
canvas.addEventListener('pointerup', (event) => {
  if (!isPointerDownOnCanvas) {
    return
  }
  isPointerDownOnCanvas = false
  const cell = novaRenderer.pickCell(event.clientX, event.clientY)
  if (cell === null) {
    roadDragStart = null
    return
  }
  // Clicking an existing building selects it (Step 3 §5): the renderer
  // only returns a cell; the application decides its domain meaning.
  const buildingId = getBuildingIdAtCell(controller.getState(), cell)
  if (buildingId !== null) {
    roadDragStart = null
    selectedBuildingId = buildingId
    refreshInspection()
    const inspection = getBuildingInspection(controller.getState(), buildingId)
    setStatus(
      inspection === null
        ? `building ${buildingId} selected`
        : `${labelOf(inspection)} ${inspection.id} — ${inspectionStatusLabel(inspection)}`
    )
    return
  }
  if (selectedTool.kind === 'road') {
    commitRoadPlacement()
    return
  }
  const buildingType = selectedTool.type
  // Step 08G §5 + Step 10AD-1: the same shared predicate the hover feedback
  // uses decides whether this click is worth dispatching. The domain
  // (applyCommand) still re-validates mid-tick and stays authoritative.
  const affordability = getPlacementAffordability(controller.getState(), cell, buildingType)
  const attempt = affordability.placement
  if (!affordability.affordable) {
    if (!attempt.valid && attempt.reason === 'insufficientResources') {
      // Explainable failure (Step 4 §13): explicit reason and real values.
      setStatus(
        `Cannot build ${BUILDING_LABELS[buildingType] ?? buildingType} — insufficient material (${affordability.materialAvailable}/${affordability.materialRequired})`
      )
    } else if (!attempt.valid && attempt.reason === 'insufficientWater') {
      // Step 10AD: Water is never covered by stored Material production.
      const required = affordability.waterRequired
      const available = affordability.waterAvailable
      setStatus(
        `Cannot build ${BUILDING_LABELS[buildingType] ?? buildingType} — requires ${required} water (${available} available)`
      )
    } else {
      setStatus(`placement rejected at ${cell.x},${cell.y}`)
    }
    return
  }
  // The only sanctioned mutation path:
  controller.dispatch({
    type: 'placeBuilding',
    x: cell.x,
    y: cell.y,
    buildingType,
  })
  const placedLabel = BUILDING_LABELS[buildingType] ?? buildingType
  setStatus(`${placedLabel} placed at ${cell.x},${cell.y} — under construction`)
})

// --- Presentation loop -------------------------------------------------------

let lastFrameTime: number | null = null
const frame = (time: number): void => {
  const elapsed = lastFrameTime === null ? 0 : time - lastFrameTime
  lastFrameTime = time
  clock.accumulate(elapsed)
  novaScene.resize(container.clientWidth, container.clientHeight)
  novaScene.renderer.render(novaScene.scene, novaScene.camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

window.addEventListener('beforeunload', () => {
  clock.dispose()
  novaRenderer.dispose()
})

// --- Browser E2E hook (Step 2) -------------------------------------------------
// Minimal observable surface for real browser tests. Presentation only:
// exposes projected screen coords (via live renderer) and UI stats.
// Never exposes mutation outside dispatchCommand.
declare global {
  interface Window {
    __nova?: {
      readonly ready: boolean
      cellToScreen: (cell: { readonly x: number; readonly y: number }) => { readonly x: number; readonly y: number } | null
      pickCell: (clientX: number, clientY: number) => { readonly x: number; readonly y: number } | null
      stats: () => { readonly tick: string; readonly buildings: string; readonly operational: string; readonly farms: string; readonly workshops: string; readonly colonists: string; readonly jobs: string; readonly employed: string; readonly unemployed: string; readonly jobCapacity: string; readonly construction: string; readonly materialProduction: string; readonly materialUpkeep: string; readonly netMaterial: string; readonly storageCapacity: string; readonly storedProduction: string; readonly accessibleBuildings: string; readonly farmIds: string; readonly staffedFarmIds: string; readonly vacantOperationalFarms: string; readonly manualWorkerIds: string; readonly crewWorkerIds: string; readonly crewedSiteIds: string; readonly contractors: string; readonly roadNetworks: string; readonly buildingsWithRoadAccess: string; readonly productionBlockedByRoad: string; readonly roads: string; readonly operationalRoads: string; readonly mobilityConnectedColonists: string; readonly food: string; readonly foodForecast: string; readonly foodStatus: string; readonly water: string; readonly waterProduction: string; readonly waterServedResidences: string; readonly servedColonists: string; readonly waterSustainable: string; readonly hasOperationalWell: string; readonly status: string }
      webgl: () => { readonly engine: string | null; readonly rendererActive: boolean }
      gpu: () => WebGLDiagnostic
      context: () => WebGLDiagnostic
      selectedBuilding: () => BuildingInspection | null
      readonly serialize: () => string
      progression: () => ProgressionStatus
      objective: () => ObjectiveStatus | null
      scenario: () => { readonly id: string; readonly objective: string }
      buildingAt: (cell: { readonly x: number; readonly y: number }) => BuildingInspection | null
    }
  }
}

type WebGLDiagnostic = {
  readonly available: boolean
  readonly webglVersion: string | null
  readonly vendor: string | null
  readonly renderer: string | null
  readonly unmaskedVendor: string | null
  readonly unmaskedRenderer: string | null
  readonly shadingLanguageVersion: string | null
}

const readWebGLInfo = (
  gl: WebGLRenderingContext | WebGL2RenderingContext | null
): WebGLDiagnostic => {
  if (gl === null) {
    return {
      available: false,
      webglVersion: null,
      vendor: null,
      renderer: null,
      unmaskedVendor: null,
      unmaskedRenderer: null,
      shadingLanguageVersion: null,
    }
  }
  const isWebGL2 =
    typeof WebGL2RenderingContext !== 'undefined' &&
    gl instanceof WebGL2RenderingContext
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    available: true,
    webglVersion: isWebGL2 ? 'WebGL2' : 'WebGL1',
    vendor: gl.getParameter(gl.VENDOR) as string | null,
    renderer: gl.getParameter(gl.RENDERER) as string | null,
    unmaskedVendor:
      debugInfo !== null
        ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string | null)
        : null,
    unmaskedRenderer:
      debugInfo !== null
        ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | null)
        : null,
    shadingLanguageVersion:
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string | null,
  }
}

window.__nova = {
  ready: true,
  cellToScreen: (cell) => novaRenderer.cellToScreen(cell),
  pickCell: (clientX, clientY) => novaRenderer.pickCell(clientX, clientY),
  stats: () => {
    const state = controller.getState()
    const forecast = getFoodTicksRemaining(state)
    const employment = getEmploymentSummary(state)
    return {
      tick: ui.tick?.textContent ?? '',
      construction: ui.construction?.textContent ?? '',
      food: ui.food?.textContent ?? '',
      foodForecast:
        forecast !== null
          ? String(forecast)
          : isFoodSupplySustainable(state)
            ? 'sustainable'
            : '',
      foodStatus: foodStatusLabel(state),
      // Step 10P: Water stock and derived service status (never persisted).
      water: String(getWaterStock(state)),
      waterProduction: String(getWaterProductionPerTick(state)),
      waterServedResidences: String(getWaterServedResidenceCount(state)),
      servedColonists: String(getServedColonistCount(state)),
      waterSustainable: String(isWaterSupplySustainable(state)),
      hasOperationalWell: String(hasOperationalWell(state)),
      buildings: ui.buildings?.textContent ?? '',
      operational: ui.operational?.textContent ?? '',
      farms: String(
        Object.values(state.buildings).filter((b) => b.type === 'farm').length
      ),
      workshops: String(
        Object.values(state.buildings).filter((b) => b.type === 'workshop')
          .length
      ),
      // Step 09M: minimal observable identity of the employment choice, so
      // the browser E2E can verify WHICH Workshop a colonist works in.
      // Ascending id order; diagnostic only, never persisted.
      workshopIds: Object.values(state.buildings)
        .filter((b) => b.type === 'workshop')
        .map((b) => b.id)
        .sort()
        .join(','),
      staffedWorkshopIds: Object.values(state.buildings)
        .filter(
          (b) => b.type === 'workshop' && countWorkersAt(state, b.id) > 0
        )
        .map((b) => b.id)
        .sort()
        .join(','),
      // Step 10E: Farm workplaces joined the employment pool, so the same
      // minimal observable identity is exposed for Farms (diagnostic only,
      // never persisted, never hashed).
      farmIds: Object.values(state.buildings)
        .filter((b) => b.type === 'farm')
        .map((b) => b.id)
        .sort()
        .join(','),
      staffedFarmIds: Object.values(state.buildings)
        .filter((b) => b.type === 'farm' && countWorkersAt(state, b.id) > 0)
        .map((b) => b.id)
        .sort()
        .join(','),
      vacantOperationalFarms: String(getVacantOperationalFarmCount(state)),
      // Step 10M: which colonists are under an explicit manual override
      // (diagnostic only; never persisted beyond workplaceAssignmentMode).
      manualWorkerIds: Object.values(state.colonists)
        .filter((colonist) => colonist.workplaceAssignmentMode === 'manual')
        .map((colonist) => colonist.id)
        .sort()
        .join(','),
      // Step 10Y: which colonists crew a construction site and which sites
      // are crewed (diagnostic only; never persisted beyond
      // constructionAssignmentId).
      crewWorkerIds: Object.values(state.colonists)
        .filter((colonist) => colonist.constructionAssignmentId !== null)
        .map((colonist) => colonist.id)
        .sort()
        .join(','),
      crewedSiteIds: Object.values(state.colonists)
        .filter((colonist) => colonist.constructionAssignmentId !== null)
        .map((colonist) => colonist.constructionAssignmentId as string)
        .sort()
        .join(','),
      contractors: String(
        Object.values(state.colonists).filter(
          (colonist) => colonist.constructionAssignmentId !== null
        ).length
      ),
      colonists: ui.colonists?.textContent ?? '',
      jobs: ui.jobs?.textContent ?? '',
      employed: String(employment.employed),
      unemployed: String(employment.unemployed),
      jobCapacity: String(employment.jobCapacity),
      materialProduction: String(getMaterialProductionPerTick(state)),
      materialUpkeep: String(getMaterialUpkeepPerTick(state)),
      netMaterial: String(getNetMaterialPerTick(state)),
      storageCapacity: String(getMaterialStorageCapacity(state)),
      storedProduction: String(getMaterialStoredProductionPerTick(state)),
      accessibleBuildings: String(getAccessibleBuildingCount(state)),
      roadNetworks: String(getRoadNetworkCount(state)),
      buildingsWithRoadAccess: String(
        Object.values(state.buildings).filter(
          (building) =>
            building.status === 'operational' &&
            getBuildingRoadAccess(state, building.id).hasRoadAccess
        ).length
      ),
      productionBlockedByRoad: String(
        Object.values(state.buildings).filter(
          (building) =>
            building.type === 'workshop' &&
            building.status === 'operational' &&
            countWorkersAt(state, building.id) > 0 &&
            !getBuildingRoadAccess(state, building.id).hasRoadAccess
        ).length
      ),
      // Step 09H: road infrastructure visible to the player (09C lifecycle).
      roads: String(Object.keys(state.roads).length),
      operationalRoads: String(
        Object.values(state.roads).filter(
          (road) => road.status === 'operational'
        ).length
      ),
      // Step 09G: derived residence -> network -> workplace relationship.
      // Diagnostic only — no gameplay consequence, never persisted.
      mobilityConnectedColonists: String(
        Object.values(state.colonists).filter(
          (colonist) =>
            getColonistWorkMobility(state, colonist.id).mobilityConnected
        ).length
      ),
      status: ui.status?.textContent ?? '',
    }
  },
  webgl: () => ({
    engine: canvas.getAttribute('data-engine'),
    rendererActive: canvas.isConnected,
  }),
  selectedBuilding: () =>
    selectedBuildingId === null
      ? null
      : getBuildingInspection(controller.getState(), selectedBuildingId),
  // Step 10Y diagnostic: the canonical save payload, read-only. Used by the
  // browser E2E to prove constructionAssignmentId is part of canonical save
  // state (the app itself has no save/load UI).
  serialize: () => serializeSave(controller.getState()),
  progression: () => getProgression(controller.getState()),
  objective: () =>
    currentScenarioObjective === null
      ? null
      : getObjectiveStatus(controller.getState(), currentScenarioObjective),
  scenario: () => ({ id: currentScenarioId, objective: currentScenarioObjective?.label ?? '' }),
  buildingAt: (cell) => {
    const buildingId = getBuildingIdAtCell(controller.getState(), cell)
    return buildingId === null
      ? null
      : getBuildingInspection(controller.getState(), buildingId)
  },
  gpu: () => {
    const probe = document.createElement('canvas')
    const gl =
      (probe.getContext('webgl2') as WebGL2RenderingContext | null) ??
      ((probe.getContext('webgl') as WebGLRenderingContext | null) ?? null)
    return readWebGLInfo(gl)
  },
  context: () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas#nova-canvas')
    if (canvas === null) {
      return {
        available: false,
        webglVersion: null,
        vendor: null,
        renderer: null,
        unmaskedVendor: null,
        unmaskedRenderer: null,
        shadingLanguageVersion: null,
      }
    }
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      ((canvas.getContext('webgl') as WebGLRenderingContext | null) ?? null)
    return readWebGLInfo(gl)
  },
}
