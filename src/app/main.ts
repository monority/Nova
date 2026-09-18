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

import type { BuildingInspection, BuildingType, SimulationConfig, SimulationState } from '../index.js'
import {
  countOperationalFarms,
  countWorkersAt,
  createInitialState,
  FOOD_PER_FARM_PER_TICK,
  getBuildingDefinition,
  getBuildingIdAtCell,
  getBuildingInspection,
  getEmploymentSummary,
  getFoodProductionPerTick,
  getFoodTicksRemaining,
  getHousingSummary,
  getMaterialProductionPerTick,
  getMaterialStorageCapacity,
  getMaterialStoredProductionPerTick,
  getMaterialUpkeepPerTick,
  getProductiveWorkerCount,
  getNetMaterialPerTick,
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
  speed: document.querySelector<HTMLSelectElement>('#speed'),
  tick: document.querySelector<HTMLSpanElement>('#ui-tick'),
  construction: document.querySelector<HTMLSpanElement>('#ui-construction'),
  food: document.querySelector<HTMLSpanElement>('#ui-food'),
  foodForecast: document.querySelector<HTMLSpanElement>('#ui-food-forecast'),
  buildings: document.querySelector<HTMLSpanElement>('#ui-buildings'),
  operational: document.querySelector<HTMLSpanElement>('#ui-operational'),
  colonists: document.querySelector<HTMLSpanElement>('#ui-colonists'),
  jobs: document.querySelector<HTMLSpanElement>('#ui-jobs'),
  status: document.querySelector<HTMLDivElement>('#ui-status'),
  insType: document.querySelector<HTMLElement>('#ins-type'),
  insStatus: document.querySelector<HTMLElement>('#ins-status'),
  insConstruction: document.querySelector<HTMLElement>('#ins-construction'),
  insHousing: document.querySelector<HTMLElement>('#ins-housing'),
}

const BUILDING_LABELS: Readonly<Record<string, string>> = {
  residence: 'Residence',
  farm: 'Farm',
  workshop: 'Workshop',
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
      ui.insHousing.textContent =
        building.status === 'operational'
          ? `Food production — producing +${FOOD_PER_FARM_PER_TICK}/tick`
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
    } else {
      ui.insHousing.textContent = `Housing — Capacity ${building.housingCapacity} · Residents ${building.occupiedHousing}`
    }
  }
}

// --- Building selection (Step 06B Part B) ------------------------------------
// Minimal palette: the placement command carries the selected type through
// the single sanctioned dispatch path. Costs come from the domain catalog.
let selectedBuildingType: BuildingType = 'residence'

const refreshBuildButtons = (): void => {
  ui.buildResidence?.setAttribute(
    'aria-pressed',
    String(selectedBuildingType === 'residence')
  )
  ui.buildFarm?.setAttribute(
    'aria-pressed',
    String(selectedBuildingType === 'farm')
  )
  ui.buildWorkshop?.setAttribute(
    'aria-pressed',
    String(selectedBuildingType === 'workshop')
  )
}

const selectBuildingType = (type: BuildingType): void => {
  selectedBuildingType = type
  refreshBuildButtons()
  const cost = getBuildingDefinition(type).constructionCost
  setStatus(
    `${BUILDING_LABELS[type] ?? type} selected — material ${cost} per building`
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
refreshBuildButtons()

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

  // Causal message from the state transition, highest priority first.
  // Steady while its condition holds; never a per-tick event queue.
  tickCausalMessage = false
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
    // Consumption: what left the stock besides this tick's farm output.
    // (Starvation ticks are handled above; here the colony was fed.)
    const produced = getFoodProductionPerTick(s)
    const consumed = prevFood + produced - food
    const material = getMaterialProductionPerTick(s)
    const parts: string[] = []
    if (employment.employed > prevEmployed) {
      parts.push('Colonist assigned to Workshop')
    }
    if (consumed > 0) {
      parts.push(
        `${pluralize(prevColonists, 'colonist')} consumed ${consumed} food`
      )
    }
    if (produced > 0) {
      const farms = countOperationalFarms(s)
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
    } else if (starved && colonists === 0) {
      setStatus('Food shortage — colony starved (population 0)')
      tickCausalMessage = true
    }
  }
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

const placementIsValid = (
  cell: { readonly x: number; readonly y: number }
): boolean =>
  validatePlacement(controller.getState(), cell, selectedBuildingType).valid

const describeCellStatus = (
  cell: { readonly x: number; readonly y: number }
): string => {
  const placement = validatePlacement(
    controller.getState(),
    cell,
    selectedBuildingType
  )
  if (placement.valid) {
    const cost = getBuildingDefinition(selectedBuildingType).constructionCost
    return `cell ${cell.x},${cell.y} — ready · material ${cost}`
  }
  if (placement.reason === 'insufficientResources') {
    // Explainable failure (Step 4 §13): values come from real queries.
    const required = getBuildingDefinition(selectedBuildingType).constructionCost
    const available = getResourceStock(controller.getState()).construction
    return `cell ${cell.x},${cell.y} — insufficient material (${available}/${required})`
  }
  return `cell ${cell.x},${cell.y} — ${
    placement.reason === 'cellOccupied' ? 'occupied' : 'out of bounds'
  }`
}

const updateHover = (clientX: number, clientY: number): void => {
  const cell = novaRenderer.pickCell(clientX, clientY)
  if (cell === null) {
    novaRenderer.showPlacementIndicator(null, false)
    setStatus('')
    return
  }
  const valid = placementIsValid(cell)
  novaRenderer.showPlacementIndicator(cell, valid)
  setStatus(describeCellStatus(cell))
}

canvas.addEventListener('pointermove', (event) => {
  updateHover(event.clientX, event.clientY)
})
canvas.addEventListener('pointerleave', () => {
  novaRenderer.showPlacementIndicator(null, false)
})
canvas.addEventListener('pointerdown', (event) => {
  isPointerDownOnCanvas = true
  updateHover(event.clientX, event.clientY)
})
canvas.addEventListener('pointerup', (event) => {
  if (!isPointerDownOnCanvas) {
    return
  }
  isPointerDownOnCanvas = false
  const cell = novaRenderer.pickCell(event.clientX, event.clientY)
  if (cell === null) {
    return
  }
  // Clicking an existing building selects it (Step 3 §5): the renderer
  // only returns a cell; the application decides its domain meaning.
  const buildingId = getBuildingIdAtCell(controller.getState(), cell)
  if (buildingId !== null) {
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
  const attempt = validatePlacement(
    controller.getState(),
    cell,
    selectedBuildingType
  )
  // Step 08G §5: the construction transaction executes mid-tick, after this
  // tick's STORED production is authoritative and before upkeep drains it.
  // A click at 24 with +1 stored this tick therefore succeeds: the domain
  // (applyCommand) re-validates mid-tick and stays authoritative. This gate
  // only mirrors that check so a reachable construction is still dispatched.
  // It never predicts future ticks: stored production is this tick's clamped
  // 08F inflow, and any other failure reason still refuses without ticking.
  const coveredSameTick =
    attempt.valid ||
    (attempt.reason === 'insufficientResources' &&
      getResourceStock(controller.getState()).construction +
        getMaterialStoredProductionPerTick(controller.getState()) >=
        getBuildingDefinition(selectedBuildingType).constructionCost)
  if (!coveredSameTick) {
    if (attempt.reason === 'insufficientResources') {
      // Explainable failure (Step 4 §13): explicit reason and real values.
      const required =
        getBuildingDefinition(selectedBuildingType).constructionCost
      const available = getResourceStock(controller.getState()).construction
      setStatus(
        `Cannot build ${BUILDING_LABELS[selectedBuildingType] ?? selectedBuildingType} — insufficient material (${available}/${required})`
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
    buildingType: selectedBuildingType,
  })
  const placedLabel =
    BUILDING_LABELS[selectedBuildingType] ?? selectedBuildingType
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
      stats: () => { readonly tick: string; readonly buildings: string; readonly operational: string; readonly farms: string; readonly workshops: string; readonly colonists: string; readonly jobs: string; readonly employed: string; readonly unemployed: string; readonly jobCapacity: string; readonly construction: string; readonly materialProduction: string; readonly materialUpkeep: string; readonly netMaterial: string; readonly storageCapacity: string; readonly storedProduction: string; readonly food: string; readonly foodForecast: string; readonly foodStatus: string; readonly status: string }
      webgl: () => { readonly engine: string | null; readonly rendererActive: boolean }
      gpu: () => WebGLDiagnostic
      context: () => WebGLDiagnostic
      selectedBuilding: () => BuildingInspection | null
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
      buildings: ui.buildings?.textContent ?? '',
      operational: ui.operational?.textContent ?? '',
      farms: String(
        Object.values(state.buildings).filter((b) => b.type === 'farm').length
      ),
      workshops: String(
        Object.values(state.buildings).filter((b) => b.type === 'workshop')
          .length
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
