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
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'
import type { RenderSnapshot } from '../../application/queries/renderSnapshot.js'
import type { GridDimensions } from './coordinates.js'
import { isInGrid, simulationCellToWorldPosition, worldPositionToSimulationCell } from './coordinates.js'
import { buildingOps, colonistOps, roadOps } from './entityViews.js'
import type { NovaScene } from './scene.js'
import { reconcile } from './reconcile.js'

const PLACEMENT_VALID_COLOR = 0x7fd1c8
const PLACEMENT_INVALID_COLOR = 0xd1584f

/**
 * Step 10AV: terrain-blocked cells read as dark, matte, slightly raised rock —
 * flat quads, a deliberately different value from the ground (0x14181f), the
 * construction gray (0x6b7280) and the road slate (0x39404f). One
 * InstancedMesh draws all of them in canonical snapshot order.
 */
const TERRAIN_BLOCKED_COLOR = 0x5a4436
const TERRAIN_SURFACE_HEIGHT = 0.02

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
  /**
   * Show a multi-cell road preview (Step 09H): one indicator per cell of the
   * candidate road set, all sharing the caller's authoritative validity.
   * An empty list hides the preview. Purely presentational.
   */
  showRoadPreview: (
    cells: readonly { readonly x: number; readonly y: number }[],
    valid: boolean
  ) => void
  /** Diagnostic (Step 10AV): blocked-cell instances currently drawn, or 0. */
  terrainInstanceCount: () => number
  resize: (width: number, height: number) => void
  dispose: () => void
}

export const createNovaRenderer = (
  novaScene: NovaScene,
  grid: GridDimensions
): NovaRenderer => {
  const { scene, camera, renderer, ground } = novaScene

  const buildingGroup = new Group()
  const roadGroup = new Group()
  const colonistGroup = new Group()
  const terrainGroup = new Group()
  scene.add(buildingGroup)
  scene.add(roadGroup)
  scene.add(colonistGroup)
  scene.add(terrainGroup)

  const buildings = buildingOps(grid)
  const roads = roadOps(grid)
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

  // Road preview pool (Step 09H): grown on demand, hidden when unused. One
  // shared material so a single call colors the whole candidate set.
  const roadPreviewMaterial = new MeshStandardMaterial({
    transparent: true,
    opacity: 0.45,
  })
  const roadPreviewPool: Mesh[] = []

  // Terrain (Step 10AV): ONE InstancedMesh for every blocked cell of the
  // snapshot, instances placed in the snapshot's canonical cell order. The
  // mesh is rebuilt only when the blocked set actually changes.
  const terrainGeometry = new PlaneGeometry(0.92, 0.92)
  terrainGeometry.rotateX(-Math.PI / 2)
  const terrainMaterial = new MeshStandardMaterial({
    color: TERRAIN_BLOCKED_COLOR,
  })
  const terrainDummy = new Object3D()
  let terrainMesh: InstancedMesh | null = null
  let terrainSignature = ''

  const applyTerrain = (
    cells: readonly { readonly x: number; readonly y: number }[]
  ): void => {
    const signature = cells.map((cell) => `${cell.x},${cell.y}`).join(' ')
    if (signature === terrainSignature) {
      return
    }
    terrainSignature = signature
    if (terrainMesh !== null) {
      terrainGroup.remove(terrainMesh)
      terrainMesh.dispose()
      terrainMesh = null
    }
    if (cells.length === 0) {
      return
    }
    const mesh = new InstancedMesh(terrainGeometry, terrainMaterial, cells.length)
    cells.forEach((cell, index) => {
      const position = simulationCellToWorldPosition(cell, grid)
      terrainDummy.position.set(position.x, TERRAIN_SURFACE_HEIGHT, position.z)
      terrainDummy.updateMatrix()
      mesh.setMatrixAt(index, terrainDummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    terrainGroup.add(mesh)
    terrainMesh = mesh
  }

  const render = (snapshot: RenderSnapshot): void => {
    applyTerrain(snapshot.blockedCells)
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
    reconcile(roads.views, snapshot.roads, (r) => r.id, {
      create: (data) => {
        const view = roads.ops.create(data)
        roadGroup.add(view.mesh)
        return view
      },
      update: roads.ops.update,
      remove: roads.ops.remove,
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

  const showRoadPreview = (
    cells: readonly { readonly x: number; readonly y: number }[],
    valid: boolean
  ): void => {
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index]
      if (cell === undefined) {
        continue
      }
      let mesh = roadPreviewPool[index]
      if (mesh === undefined) {
        mesh = new Mesh(indicatorGeometry, roadPreviewMaterial)
        mesh.visible = false
        roadPreviewPool[index] = mesh
        scene.add(mesh)
      }
      const position = simulationCellToWorldPosition(cell, grid)
      mesh.position.set(position.x, 0.02, position.z)
      mesh.visible = true
    }
    for (let index = cells.length; index < roadPreviewPool.length; index += 1) {
      const mesh = roadPreviewPool[index]
      if (mesh !== undefined) {
        mesh.visible = false
      }
    }
    roadPreviewMaterial.color.setHex(
      valid ? PLACEMENT_VALID_COLOR : PLACEMENT_INVALID_COLOR
    )
  }

  return {
    render,
    pickCell,
    cellToScreen,
    showPlacementIndicator,
    showRoadPreview,
    terrainInstanceCount: () =>
      terrainMesh === null ? 0 : terrainMesh.count,
    resize: novaScene.resize,
    dispose: () => {
      indicatorMaterial.dispose()
      indicatorGeometry.dispose()
      roadPreviewMaterial.dispose()
      terrainGeometry.dispose()
      terrainMaterial.dispose()
      novaScene.dispose()
    },
  }
}
