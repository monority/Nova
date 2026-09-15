import * as THREE from 'three'
import type { RenderBuilding } from '../../application/contracts/render-snapshot'
import type { GridPosition } from '../../domain/city'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

export class BuildingRenderer {
  private readonly group = new THREE.Group()
  private readonly baseGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.58, 0.8, CELL_SIZE * 0.58)
  private readonly roofGeometry = new THREE.ConeGeometry(CELL_SIZE * 0.45, 0.32, 4)
  private readonly buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xf1bd78, roughness: 0.78 })
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: 0xc85f4e, roughness: 0.82 })
  private readonly previewMaterial = new THREE.MeshStandardMaterial({ color: 0x82d3bf, transparent: true, opacity: 0.42, wireframe: true })
  private readonly buildingGroups = new Map<string, THREE.Group>()
  private preview: THREE.Mesh | null = null

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
  }

  sync(buildings: readonly RenderBuilding[]): void {
    const visibleIds = new Set<string>(buildings.map((building) => building.id))
    this.buildingGroups.forEach((buildingGroup, buildingId) => {
      if (!visibleIds.has(buildingId)) {
        this.group.remove(buildingGroup)
        this.buildingGroups.delete(buildingId)
      }
    })

    buildings.forEach((building) => {
      const existing = this.buildingGroups.get(building.id)
      if (existing) {
        this.positionGroup(existing, building.position)
        return
      }
      const buildingGroup = this.createBuilding(building)
      this.buildingGroups.set(building.id, buildingGroup)
      this.group.add(buildingGroup)
    })
  }

  setPreview(position: GridPosition | null, valid: boolean): void {
    if (this.preview) {
      this.group.remove(this.preview)
      this.preview.geometry.dispose()
      this.preview = null
    }
    if (!position) return
    this.preview = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.62, 0.9, CELL_SIZE * 0.62), this.previewMaterial)
    this.previewMaterial.color.set(valid ? 0x82d3bf : 0xe87868)
    this.preview.position.set(position.x * CELL_SIZE, 0.45, position.y * CELL_SIZE)
    this.group.add(this.preview)
  }

  setSelected(buildingId: string | null): void {
    this.buildingGroups.forEach((buildingGroup, currentId) => {
      buildingGroup.scale.setScalar(currentId === buildingId ? 1.1 : 1)
    })
  }

  getPickableObjects(): THREE.Object3D[] {
    return [...this.buildingGroups.values()]
  }

  dispose(): void {
    this.group.clear()
    this.baseGeometry.dispose()
    this.roofGeometry.dispose()
    this.buildingMaterial.dispose()
    this.roofMaterial.dispose()
    this.previewMaterial.dispose()
    this.preview?.geometry.dispose()
    this.buildingGroups.clear()
  }

  private createBuilding(building: RenderBuilding): THREE.Group {
    const buildingGroup = new THREE.Group()
    buildingGroup.userData.buildingId = building.id
    const base = new THREE.Mesh(this.baseGeometry, this.buildingMaterial)
    base.position.y = 0.4
    const roof = new THREE.Mesh(this.roofGeometry, this.roofMaterial)
    roof.position.y = 0.96
    roof.rotation.y = Math.PI / 4
    buildingGroup.add(base, roof)
    this.positionGroup(buildingGroup, building.position)
    return buildingGroup
  }

  private positionGroup(buildingGroup: THREE.Group, position: GridPosition): void {
    buildingGroup.position.set(position.x * CELL_SIZE, 0, position.y * CELL_SIZE)
  }
}
