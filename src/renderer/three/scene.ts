/**
 * Three.js scene setup (Step 1 #4).
 *
 * Minimal production-quality scene: WebGL renderer, fixed angled camera,
 * ambient + directional light, ground plane, cell grid. Deterministic
 * primitives only. No postprocessing, no shaders, no assets.
 *
 * This module owns presentation objects only. It holds no simulation state.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three'
import type { GridDimensions } from './coordinates.js'

const BACKGROUND_COLOR = 0x0b0e13
const GROUND_COLOR = 0x14181f
const GRID_COLOR = 0x2a3140
const GRID_CENTER_COLOR = 0x3a4356

export interface NovaScene {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly ground: Mesh
  resize: (width: number, height: number) => void
  dispose: () => void
}

export const createNovaScene = (
  container: HTMLElement,
  grid: GridDimensions
): NovaScene => {
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.domElement.id = 'nova-canvas'
  renderer.domElement.dataset['testid'] = 'nova-canvas'
  container.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = new Color(BACKGROUND_COLOR)

  const camera = new PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  )
  const cameraDistance = Math.max(grid.width, grid.height) * 1.4
  camera.position.set(0, cameraDistance * 0.8, cameraDistance * 0.9)
  camera.lookAt(0, 0, 0)

  scene.add(new AmbientLight(0xffffff, 0.55))
  const sun = new DirectionalLight(0xf0f4ff, 1.1)
  sun.position.set(6, 12, 4)
  scene.add(sun)

  const groundGeometry = new PlaneGeometry(grid.width, grid.height)
  groundGeometry.rotateX(-Math.PI / 2)
  const ground = new Mesh(
    groundGeometry,
    new MeshStandardMaterial({ color: GROUND_COLOR })
  )
  scene.add(ground)

  const gridHelper = new GridHelper(
    Math.max(grid.width, grid.height),
    Math.max(grid.width, grid.height),
    GRID_CENTER_COLOR,
    GRID_COLOR
  )
  gridHelper.position.y = 0.001
  scene.add(gridHelper)

  const resize = (width: number, height: number): void => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  const dispose = (): void => {
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { scene, camera, renderer, ground, resize, dispose }
}
