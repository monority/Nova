import * as THREE from 'three'
import type { RenderRoad } from '../../application/contracts/render-snapshot'
import { ROAD_CONNECTION } from '../../domain/construction'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

const ROAD_WIDTH = CELL_SIZE * 0.28
const ROAD_HEIGHT = 0.045

export class RoadRenderer {
  private readonly group = new THREE.Group()
  private readonly material = new THREE.MeshStandardMaterial({ color: 0x6e9d91, emissive: 0x173d39, emissiveIntensity: 0.35, roughness: 0.82 })
  private readonly selectedMaterial = new THREE.MeshStandardMaterial({ color: 0xb6e6cf, emissive: 0x397d6c, emissiveIntensity: 0.7, roughness: 0.75 })
  private readonly previewMaterial = new THREE.MeshStandardMaterial({ color: 0x82d3bf, transparent: true, opacity: 0.48, roughness: 0.75 })
  private readonly roadGroups = new Map<string, THREE.Group>()
  private readonly roadKeys = new Map<string, string>()
  private selectedRoadId: string | null = null
  private preview: THREE.Group | null = null

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
  }

  sync(roads: readonly RenderRoad[]): void {
    const visibleIds = new Set<string>(roads.map((road) => road.id))
    this.roadGroups.forEach((roadGroup, roadId) => {
      if (!visibleIds.has(roadId)) {
        this.group.remove(roadGroup)
        this.roadGroups.delete(roadId)
        this.roadKeys.delete(roadId)
      }
    })
    roads.forEach((road) => {
      const existing = this.roadGroups.get(road.id)
      if (existing) {
        const key = this.getRoadKey(road)
        if (this.roadKeys.get(road.id) !== key) {
          this.updateGroup(existing, road)
          this.roadKeys.set(road.id, key)
        }
        return
      }
      const roadGroup = this.createRoad(road)
      this.roadGroups.set(road.id, roadGroup)
      this.roadKeys.set(road.id, this.getRoadKey(road))
      this.group.add(roadGroup)
    })
  }

  setPreview(position: { x: number; y: number } | null, valid: boolean, connectionMask = 0): void {
    if (this.preview) {
      this.group.remove(this.preview)
      this.disposeGroup(this.preview)
      this.preview = null
    }
    if (!position) return
    this.preview = this.createRoadGroup(position.x, position.y, connectionMask, this.previewMaterial)
    this.group.add(this.preview)
    this.preview.userData.preview = true
    this.preview.traverse((object) => { object.userData.preview = true; if (object instanceof THREE.Mesh) object.material = this.previewMaterial })
    this.preview.scale.setScalar(valid ? 1 : 0.92)
  }

  setSelected(roadId: string | null): void {
    this.selectedRoadId = roadId
    this.roadGroups.forEach((roadGroup, currentId) => this.setGroupMaterial(roadGroup, currentId === roadId ? this.selectedMaterial : this.material))
  }

  getPickableObjects(): THREE.Object3D[] {
    return [...this.roadGroups.values()]
  }

  getRoadIdAt(position: { x: number; y: number }): string | null {
    for (const roadGroup of this.roadGroups.values()) {
      if (roadGroup.position.x === position.x * CELL_SIZE && roadGroup.position.z === position.y * CELL_SIZE) return roadGroup.userData.roadId ?? null
    }
    return null
  }

  dispose(): void {
    this.group.clear()
    this.roadGroups.clear()
    this.roadKeys.clear()
    this.preview = null
    this.material.dispose()
    this.selectedMaterial.dispose()
    this.previewMaterial.dispose()
  }

  private createRoad(road: RenderRoad): THREE.Group {
    const roadGroup = this.createRoadGroup(road.position.x, road.position.y, road.connectionMask, road.id === this.selectedRoadId ? this.selectedMaterial : this.material)
    roadGroup.userData.roadId = road.id
    return roadGroup
  }

  private updateGroup(roadGroup: THREE.Group, road: RenderRoad): void {
    roadGroup.clear()
    const rebuilt = this.createRoadGroup(road.position.x, road.position.y, road.connectionMask, road.id === this.selectedRoadId ? this.selectedMaterial : this.material)
    while (rebuilt.children.length > 0) roadGroup.add(rebuilt.children[0])
    roadGroup.userData.roadId = road.id
  }

  private getRoadKey(road: RenderRoad): string {
    return `${road.position.x}:${road.position.y}:${road.connectionMask}`
  }

  private createRoadGroup(x: number, y: number, mask: number, material: THREE.Material): THREE.Group {
    const roadGroup = new THREE.Group()
    roadGroup.position.set(x * CELL_SIZE, 0.14, y * CELL_SIZE)
    const center = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, ROAD_HEIGHT, ROAD_WIDTH), material)
    roadGroup.add(center)
    const addArm = (offsetX: number, offsetZ: number, width: number, depth: number) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(width, ROAD_HEIGHT, depth), material)
      arm.position.set(offsetX, 0, offsetZ)
      roadGroup.add(arm)
    }
    if (mask & ROAD_CONNECTION.north) addArm(0, -CELL_SIZE / 2, ROAD_WIDTH, CELL_SIZE)
    if (mask & ROAD_CONNECTION.east) addArm(CELL_SIZE / 2, 0, CELL_SIZE, ROAD_WIDTH)
    if (mask & ROAD_CONNECTION.south) addArm(0, CELL_SIZE / 2, ROAD_WIDTH, CELL_SIZE)
    if (mask & ROAD_CONNECTION.west) addArm(-CELL_SIZE / 2, 0, CELL_SIZE, ROAD_WIDTH)
    return roadGroup
  }

  private setGroupMaterial(group: THREE.Group, material: THREE.Material): void {
    group.traverse((object) => { if (object instanceof THREE.Mesh) object.material = material })
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
  }
}
