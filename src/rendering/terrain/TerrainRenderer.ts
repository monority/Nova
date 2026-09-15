import * as THREE from 'three'
import type { RenderWorld } from '../../application/contracts/render-snapshot'

export const CELL_SIZE = 0.72

export class TerrainRenderer {
  private readonly group = new THREE.Group()
  private readonly tileGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.94, 1, CELL_SIZE * 0.94)
  private readonly landMaterial = new THREE.MeshStandardMaterial({ color: 0x355c54, roughness: 0.95 })
  private readonly waterMaterial = new THREE.MeshStandardMaterial({ color: 0x183f4e, roughness: 0.7, metalness: 0.15 })

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
  }

  setWorld(world: RenderWorld): void {
    this.group.clear()
    const landCells = world.cells.filter((cell) => !cell.water)
    const waterCells = world.cells.filter((cell) => cell.water)
    this.addInstances(landCells, this.landMaterial)
    this.addInstances(waterCells, this.waterMaterial)
  }

  dispose(): void {
    this.group.clear()
    this.tileGeometry.dispose()
    this.landMaterial.dispose()
    this.waterMaterial.dispose()
  }

  private addInstances(cells: RenderWorld['cells'], material: THREE.Material): void {
    if (cells.length === 0) return
    const mesh = new THREE.InstancedMesh(this.tileGeometry, material, cells.length)
    const matrix = new THREE.Matrix4()
    cells.forEach((cell, index) => {
      const height = cell.water ? 0.06 : 0.12 + cell.elevation * 0.7
      matrix.compose(
        new THREE.Vector3(cell.x * CELL_SIZE, height / 2, cell.y * CELL_SIZE),
        new THREE.Quaternion(),
        new THREE.Vector3(1, height, 1),
      )
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    this.group.add(mesh)
  }
}
