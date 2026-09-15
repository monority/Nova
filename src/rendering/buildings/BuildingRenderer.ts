import * as THREE from 'three'
import type { RenderBuilding } from '../../application/contracts/render-snapshot'
import type { BuildingId, GridPosition } from '../../domain/city'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

export class BuildingRenderer {
  private readonly group = new THREE.Group()
  private readonly baseGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.62, 0.32, CELL_SIZE * 0.62)
  private readonly roofGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.48, 0.035, CELL_SIZE * 0.48)
  private readonly buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x64736f, roughness: 0.88 })
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: 0xc8a26b, emissive: 0x3a2b18, emissiveIntensity: 0.3, roughness: 0.7 })
  private readonly farmMaterial = new THREE.MeshStandardMaterial({ color: 0x668b78, emissive: 0x14281f, emissiveIntensity: 0.25, roughness: 0.9 })
  private readonly apartmentMaterial = new THREE.MeshStandardMaterial({ color: 0x7b8291, emissive: 0x242532, emissiveIntensity: 0.3, roughness: 0.82 })
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
        if (existing.userData.buildingType !== building.type) {
          this.group.remove(existing)
          const evolved = this.createBuilding(building)
          this.buildingGroups.set(building.id, evolved)
          this.group.add(evolved)
          return
        }
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

  getBuildingIdAt(position: GridPosition): BuildingId | null {
    const building = [...this.buildingGroups.entries()].find(([, group]) => group.position.x === position.x * CELL_SIZE && group.position.z === position.y * CELL_SIZE)
    return building ? building[0] as BuildingId : null
  }

  dispose(): void {
    this.group.clear()
    this.baseGeometry.dispose()
    this.roofGeometry.dispose()
    this.buildingMaterial.dispose()
    this.roofMaterial.dispose()
    this.farmMaterial.dispose()
    this.apartmentMaterial.dispose()
    this.previewMaterial.dispose()
    this.preview?.geometry.dispose()
    this.buildingGroups.clear()
  }

  private createBuilding(building: RenderBuilding): THREE.Group {
    const buildingGroup = new THREE.Group()
    buildingGroup.userData.buildingId = building.id
    buildingGroup.userData.buildingType = building.type
    const baseMaterial = building.type === 'farm' ? this.farmMaterial : building.type === 'apartment' ? this.apartmentMaterial : this.buildingMaterial
    const base = new THREE.Mesh(this.baseGeometry, baseMaterial)
    base.position.y = building.type === 'apartment' ? 0.34 : 0.2
    if (building.type === 'apartment') base.scale.set(1.1, 1.8, 1.1)
    if (building.type === 'farm') base.scale.set(1.12, 0.65, 1.12)
    const roof = new THREE.Mesh(this.roofGeometry, this.roofMaterial)
    roof.position.y = building.type === 'apartment' ? 0.68 : building.type === 'farm' ? 0.3 : 0.39
    if (building.type === 'apartment') roof.scale.set(1.1, 1, 1.1)
    buildingGroup.add(base, roof)
    this.positionGroup(buildingGroup, building.position)
    return buildingGroup
  }

  private positionGroup(buildingGroup: THREE.Group, position: GridPosition): void {
    buildingGroup.position.set(position.x * CELL_SIZE, 0, position.y * CELL_SIZE)
  }
}
