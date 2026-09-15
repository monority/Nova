import * as THREE from 'three'
import type { RenderZone } from '../../application/contracts/render-snapshot'
import { CELL_SIZE } from '../terrain/TerrainRenderer'

export class ZoneRenderer {
  private readonly group = new THREE.Group()
  private readonly materials = {
    residential: new THREE.MeshBasicMaterial({ color: 0x6b9f91, transparent: true, opacity: 0.13, side: THREE.DoubleSide }),
    agricultural: new THREE.MeshBasicMaterial({ color: 0xb59c63, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
  }
  constructor(scene: THREE.Scene) { scene.add(this.group) }
  sync(zones: readonly RenderZone[]): void {
    this.group.clear()
    zones.forEach((zone) => zone.cells.forEach((cell) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL_SIZE * 0.92, CELL_SIZE * 0.92), this.materials[zone.type])
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(cell.x * CELL_SIZE, 0.13, cell.y * CELL_SIZE)
      this.group.add(mesh)
    }))
  }
  dispose(): void { this.group.clear(); this.materials.residential.dispose(); this.materials.agricultural.dispose() }
}
