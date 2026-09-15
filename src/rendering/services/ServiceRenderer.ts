import * as THREE from 'three'
import type { RenderService } from '../../application/contracts/render-snapshot'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

export class ServiceRenderer {
  private readonly group = new THREE.Group()
  private readonly material = new THREE.MeshStandardMaterial({ color: 0x8d8170, emissive: 0x302719, emissiveIntensity: 0.35, roughness: 0.78 })
  constructor(scene: THREE.Scene) { scene.add(this.group) }
  sync(services: readonly RenderService[]): void {
    this.group.clear()
    services.forEach((service) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.68, 0.16, CELL_SIZE * 0.68), this.material)
      base.position.set(service.position.x * CELL_SIZE, 0.2, service.position.y * CELL_SIZE)
      base.userData.serviceId = service.id
      this.group.add(base)
    })
  }
  dispose(): void { this.group.clear(); this.material.dispose() }
}
