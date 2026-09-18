/**
 * NovaRenderer (Step 1 #2, #6, #10, #11).
 *
 * Facade between the application and Three.js:
 *
 *   snapshot -> reconcile views -> render frame
 *
 * Owns presentation objects only. Never mutates canonical state and never
 * reads anything outside the RenderSnapshot. Also exposes screen->cell
 * picking used by the application to dispatch placement commands.
 */

import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'
import type { RenderSnapshot } from '../../application/queries/renderSnapshot.js'
import type { GridDimensions } from './coordinates.js'
import { isInGrid, simulationCellToWorldPosition, worldPositionToSimulationCell } from './coordinates.js'
import { buildingOps, colonistOps } from './entityViews.js'
import type { NovaScene } from './scene.js'
import { reconcile } from './reconcile.js'

const PLACEMENT_VALID_COLOR = 0x7fd1c8
const PLACEMENT_INVALID_COLOR = 0xd1584f

export interface NovaRenderer {
  render: (snapshot: RenderSnapshot) => void
  /** Map a screen position (viewport CSS pixels) to a simulation cell, or null when off-grid. */
  pickCell: (clientX: number, clientY: number) => { readonly x: number; readonly y: number } | null
  /** Project a simulation cell center to viewport CSS pixels. Null when behind camera. */
  cellToScreen: (cell: { readonly x: number; readonly y: number }) => { readonly x: number; readonly y: number } | null
  /** Show the placement indicator at a cell; null hides it. */
  showPlacementIndicator: (
    cell: { readonly x: number; readonly y: number } | null,
    valid: boolean
  ) => void
  resize: (width: number, height: number) => void
  dispose: () => void
}

export const createNovaRenderer = (
  novaScene: NovaScene,
  grid: GridDimensions
): NovaRenderer => {
  const { scene, camera, renderer, ground } = novaScene

  const buildingGroup = new Group()
  const colonistGroup = new Group()
  scene.add(buildingGroup)
  scene.add(colonistGroup)

  const buildings = buildingOps(grid)
  const colonists = colonistOps(grid)

  const indicatorMaterial = new MeshStandardMaterial({
    transparent: true,
    opacity: 0.45,
  })
  const indicatorGeometry = new PlaneGeometry(0.9, 0.9)
  indicatorGeometry.rotateX(-Math.PI / 2)
  const indicator = new Mesh(indicatorGeometry, indicatorMaterial)
  indicator.visible = false
  scene.add(indicator)

  const render = (snapshot: RenderSnapshot): void => {
    // Keyed reconciliation: stable identity per entity id, no scene rebuild.
    reconcile(buildings.views, snapshot.buildings, (b) => b.id, {
      create: (data) => {
        const view = buildings.ops.create(data)
        buildingGroup.add(view.mesh)
        return view
      },
      update: buildings.ops.update,
      remove: buildings.ops.remove,
    })
    reconcile(colonists.views, snapshot.colonists, (c) => c.id, {
      create: (data) => {
        const view = colonists.ops.create(data)
        colonistGroup.add(view.mesh)
        return view
      },
      update: colonists.ops.update,
      remove: colonists.ops.remove,
    })
    renderer.render(scene, camera)
  }

  const pickCell = (
    clientX: number,
    clientY: number
  ): { readonly x: number; readonly y: number } | null => {
    const rect = renderer.domElement.getBoundingClientRect()
    const pointer = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new Raycaster()
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(ground, false)
    const hit = hits[0]
    if (hit === undefined) {
      return null
    }
    const cell = worldPositionToSimulationCell(hit.point.x, hit.point.z, grid)
    return isInGrid(cell, grid) ? cell : null
  }

  const cellToScreen = (
    cell: { readonly x: number; readonly y: number }
  ): { readonly x: number; readonly y: number } | null => {
    const position = simulationCellToWorldPosition(cell, grid)
    const vector = new Vector3(position.x, 0, position.z)
    vector.project(camera)
    if (vector.z > 1) {
      return null
    }
    const rect = renderer.domElement.getBoundingClientRect()
    return {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
    }
  }

  const showPlacementIndicator = (
    cell: { readonly x: number; readonly y: number } | null,
    valid: boolean
  ): void => {
    if (cell === null) {
      indicator.visible = false
      return
    }
    const position = simulationCellToWorldPosition(cell, grid)
    indicator.position.set(position.x, 0.02, position.z)
    indicatorMaterial.color.setHex(
      valid ? PLACEMENT_VALID_COLOR : PLACEMENT_INVALID_COLOR
    )
    indicator.visible = true
  }

  return {
    render,
    pickCell,
    cellToScreen,
    showPlacementIndicator,
    resize: novaScene.resize,
    dispose: () => {
      indicatorMaterial.dispose()
      indicatorGeometry.dispose()
      novaScene.dispose()
    },
  }
}
