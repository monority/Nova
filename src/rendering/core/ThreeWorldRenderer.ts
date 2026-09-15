import * as THREE from 'three'
import type { RenderSnapshot } from '../../application/contracts/render-snapshot'
import type { RendererPort } from './renderer-port'
import { OrthographicCameraController } from '../camera/OrthographicCameraController'
import { CELL_SIZE, TerrainRenderer } from '../terrain/TerrainRenderer'
import { BuildingRenderer } from '../buildings/BuildingRenderer'
import type { BuildingId, GridPosition } from '../../domain/city'
import type { RoadId } from '../../domain/city'
import { RoadRenderer } from '../roads/RoadRenderer'
import { ZoneRenderer } from '../zones/ZoneRenderer'

export class ThreeWorldRenderer implements RendererPort {
  private canvas: HTMLCanvasElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private cameraController: OrthographicCameraController | null = null
  private terrainRenderer: TerrainRenderer | null = null
  private buildingRenderer: BuildingRenderer | null = null
  private roadRenderer: RoadRenderer | null = null
  private zoneRenderer: ZoneRenderer | null = null
  private raycaster = new THREE.Raycaster()
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private worldKey: string | null = null
  private cameraWorldKey: string | null = null
  private animationFrame = 0

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x091313, 1)
    this.scene = new THREE.Scene()
    this.scene.add(new THREE.HemisphereLight(0xa8c9c0, 0x071013, 1.8))
    const sun = new THREE.DirectionalLight(0xd9c5a0, 2.2)
    sun.position.set(-8, 32, 4)
    this.scene.add(sun)
    this.cameraController = new OrthographicCameraController(canvas)
    this.terrainRenderer = new TerrainRenderer(this.scene)
    this.buildingRenderer = new BuildingRenderer(this.scene)
    this.roadRenderer = new RoadRenderer(this.scene)
    this.zoneRenderer = new ZoneRenderer(this.scene)
    this.resize()
    window.addEventListener('resize', this.resize)
    this.animate()
  }

  render(snapshot: RenderSnapshot): void {
    if (!this.terrainRenderer || !this.cameraController || !this.buildingRenderer || !this.roadRenderer) return
    const nextWorldKey = `${snapshot.world.width}x${snapshot.world.height}`
    if (this.worldKey !== nextWorldKey) {
      this.terrainRenderer.setWorld(snapshot.world)
      this.worldKey = nextWorldKey
    }
    if (this.cameraWorldKey !== nextWorldKey) {
      this.cameraController.fitToWorld(snapshot.world)
      this.cameraWorldKey = nextWorldKey
    }
    this.buildingRenderer.sync(snapshot.buildings)
    this.roadRenderer.sync(snapshot.roads)
    this.zoneRenderer?.sync(snapshot.zones ?? [])
  }

  screenToGrid(clientX: number, clientY: number): GridPosition | null {
    if (!this.canvas || !this.cameraController) return null
    const rect = this.canvas.getBoundingClientRect()
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.cameraController.camera)
    const point = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return null
    const x = Math.floor(point.x / CELL_SIZE + 0.5)
    const y = Math.floor(point.z / CELL_SIZE + 0.5)
    return { x, y }
  }

  pickBuildingId(clientX: number, clientY: number): BuildingId | null {
    if (!this.canvas || !this.cameraController || !this.buildingRenderer) return null
    const rect = this.canvas.getBoundingClientRect()
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.cameraController.camera)
    const intersection = this.raycaster.intersectObjects(this.buildingRenderer.getPickableObjects(), true)[0]
    if (!intersection) {
      const gridPosition = this.screenToGrid(clientX, clientY)
      return gridPosition ? this.buildingRenderer.getBuildingIdAt(gridPosition) : null
    }
    let current: THREE.Object3D | null = intersection.object
    while (current) {
      if (typeof current.userData.buildingId === 'string') return current.userData.buildingId as BuildingId
      current = current.parent
    }
    return null
  }

  pickRoadId(clientX: number, clientY: number): RoadId | null {
    if (!this.canvas || !this.cameraController || !this.roadRenderer) return null
    const gridPosition = this.screenToGrid(clientX, clientY)
    const gridRoadId = gridPosition ? this.roadRenderer.getRoadIdAt(gridPosition) : null
    if (gridRoadId) return gridRoadId as RoadId
    const rect = this.canvas.getBoundingClientRect()
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.cameraController.camera)
    const intersection = this.raycaster.intersectObjects(this.roadRenderer.getPickableObjects(), true)[0]
    if (!intersection) return null
    let current: THREE.Object3D | null = intersection.object
    while (current) {
      if (typeof current.userData.roadId === 'string') return current.userData.roadId as RoadId
      current = current.parent
    }
    return null
  }

  setPlacementPreview(position: GridPosition | null, valid: boolean): void {
    this.buildingRenderer?.setPreview(position, valid)
    this.roadRenderer?.setPreview(null, false)
  }

  setRoadPreview(position: GridPosition | null, valid: boolean, connectionMask = 0): void {
    this.buildingRenderer?.setPreview(null, false)
    this.roadRenderer?.setPreview(position, valid, connectionMask)
  }

  setSelectedBuilding(buildingId: BuildingId | null): void {
    this.buildingRenderer?.setSelected(buildingId)
  }

  setSelectedRoad(roadId: RoadId | null): void {
    this.roadRenderer?.setSelected(roadId)
  }

  resize = (): void => {
    if (!this.canvas || !this.renderer || !this.cameraController) return
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    this.renderer.setSize(width, height, false)
    this.cameraController.resize(width, height)
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize)
    window.cancelAnimationFrame(this.animationFrame)
    this.cameraController?.dispose()
    this.terrainRenderer?.dispose()
    this.buildingRenderer?.dispose()
    this.roadRenderer?.dispose()
    this.zoneRenderer?.dispose()
    this.renderer?.dispose()
    this.canvas = null
    this.renderer = null
    this.scene = null
    this.cameraController = null
    this.terrainRenderer = null
    this.buildingRenderer = null
    this.roadRenderer = null
    this.zoneRenderer = null
    this.worldKey = null
    this.cameraWorldKey = null
  }

  private animate = (): void => {
    if (!this.renderer || !this.scene || !this.cameraController) return
    this.renderer.render(this.scene, this.cameraController.camera)
    this.animationFrame = window.requestAnimationFrame(this.animate)
  }
}
