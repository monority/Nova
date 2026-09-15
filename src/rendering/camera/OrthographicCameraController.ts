import * as THREE from 'three'

export interface CameraBounds {
  width: number
  height: number
}

export class OrthographicCameraController {
  readonly camera: THREE.OrthographicCamera
  private readonly target = new THREE.Vector3()
  private readonly canvas: HTMLCanvasElement
  private dragging = false
  private pointerX = 0
  private pointerY = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    // In a zenith view the default Y-up vector is parallel to the view direction.
    // Use Z as screen-up so lookAt never falls back to an oblique orientation.
    this.camera.up.set(0, 0, -1)
    this.camera.position.set(0, 48, 0)
    this.camera.lookAt(this.target)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerUp)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  resize(width: number, height: number): void {
    const aspect = width / Math.max(height, 1)
    const viewSize = 18
    this.camera.left = -viewSize * aspect
    this.camera.right = viewSize * aspect
    this.camera.top = viewSize
    this.camera.bottom = -viewSize
    this.camera.updateProjectionMatrix()
  }

  fitToWorld(bounds: CameraBounds): void {
    this.target.set((bounds.width - 1) / 2, 0, (bounds.height - 1) / 2)
    // True zenith: the city is read as a plan, never as an isometric miniature.
    this.camera.position.set(this.target.x, 48, this.target.z)
    this.camera.lookAt(this.target)
    this.camera.zoom = Math.min(1, 42 / Math.max(bounds.width, bounds.height))
    this.camera.updateProjectionMatrix()
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return
    this.dragging = true
    this.pointerX = event.clientX
    this.pointerY = event.clientY
    this.canvas.setPointerCapture(event.pointerId)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.dragging) return
    const deltaX = event.clientX - this.pointerX
    const deltaY = event.clientY - this.pointerY
    this.pointerX = event.clientX
    this.pointerY = event.clientY
    const panScale = 0.025 / this.camera.zoom
    this.target.x -= deltaX * panScale
    this.target.z -= deltaY * panScale
    this.camera.position.x = this.target.x
    this.camera.position.y = 48
    this.camera.position.z = this.target.z
    this.camera.lookAt(this.target)
  }

  private handlePointerUp = (event: PointerEvent) => {
    this.dragging = false
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    const nextZoom = this.camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1)
    this.camera.zoom = THREE.MathUtils.clamp(nextZoom, 0.35, 4)
    this.camera.updateProjectionMatrix()
  }
}
