import * as THREE from 'three'
import type { RenderBuilding } from '../../application/contracts/render-snapshot'
import type { GridPosition } from '../../domain/city'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

export class BuildingRenderer {
  private readonly group = new THREE.Group()
  private readonly baseGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.62, 0.32, CELL_SIZE * 0.62)
  private readonly roofGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.48, 0.035, CELL_SIZE * 0.48)
  private readonly buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x64736f, roughness: 0.88 })
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: 0xc8a26b, emissive: 0x3a2b18, emissiveIntensity: 0.3, roughness: 0.7 })
  private readonly farmMaterial = new THREE.MeshStandardMaterial({ color: 0x668b78, emissive: 0x14281f, emissiveIntensity: 0.25, roughness: 0.9 })
  private readonly previewMaterial = new THREE.MeshStandardMaterial({ color: 0x9fe3ce, transparent: true, opacity: 0.5, wireframe: true })
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
    this.preview = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.7, 0.08, CELL_SIZE * 0.7), this.previewMaterial)
    this.previewMaterial.color.set(valid ? 0x9fe3ce : 0xe87868)
    this.preview.position.set(position.x * CELL_SIZE, 0.18, position.y * CELL_SIZE)
    this.group.add(this.preview)
  }

  setSelected(buildingId: string | null): void {
    this.buildingGroups.forEach((buildingGroup, currentId) => {
      buildingGroup.scale.setScalar(currentId === buildingId ? 1.12 : 1)
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
    this.farmMaterial.dispose()
    this.previewMaterial.dispose()
    this.preview?.geometry.dispose()
    this.buildingGroups.clear()
  }

  private createBuilding(building: RenderBuilding): THREE.Group {
    const buildingGroup = new THREE.Group()
    buildingGroup.userData.buildingId = building.id
    const base = new THREE.Mesh(this.baseGeometry, building.type === 'farm' ? this.farmMaterial : this.buildingMaterial)
    base.position.y = 0.2
    const roof = new THREE.Mesh(this.roofGeometry, this.roofMaterial)
    roof.position.y = 0.39
    buildingGroup.add(base, roof)
    this.positionGroup(buildingGroup, building.position)
    return buildingGroup
  }

  private positionGroup(buildingGroup: THREE.Group, position: GridPosition): void {
    buildingGroup.position.set(position.x * CELL_SIZE, 0, position.y * CELL_SIZE)
  }
}
