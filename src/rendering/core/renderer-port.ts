import type { RenderSnapshot } from '../../application/contracts/render-snapshot'

export interface RendererPort {
    initialize(canvas: HTMLCanvasElement): void
    render(snapshot: RenderSnapshot): void
    resize(width: number, height: number): void
    dispose(): void
}
