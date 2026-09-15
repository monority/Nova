import { useEffect, useRef, type PointerEvent } from 'react'
import type { SimulationRuntimePort } from '../../application/contracts/simulation-runtime'
import { toRenderSnapshot } from '../../application/queries/to-render-snapshot'
import type { BuildingId, GridPosition } from '../../domain/city'
import { ThreeWorldRenderer } from '../../rendering/core/ThreeWorldRenderer'

interface WorldViewportProps {
  runtime: SimulationRuntimePort
  constructionMode: boolean
  placementPosition: GridPosition | null
  placementValid: boolean
  selectedBuildingId: BuildingId | null
  onHoverGrid: (position: GridPosition | null) => void
  onPlaceBuilding: (position: GridPosition) => void
  onSelectBuilding: (buildingId: BuildingId | null) => void
  onExitConstruction: () => void
}

export function WorldViewport({ runtime, constructionMode, placementPosition, placementValid, selectedBuildingId, onHoverGrid, onPlaceBuilding, onSelectBuilding, onExitConstruction }: WorldViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ThreeWorldRenderer | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const renderer = new ThreeWorldRenderer()
    renderer.initialize(canvasRef.current)
    rendererRef.current = renderer
    const render = () => renderer.render(toRenderSnapshot(runtime.getState()))
    render()
    const unsubscribe = runtime.subscribe(render)
    return () => {
      unsubscribe()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [runtime])

  useEffect(() => {
    rendererRef.current?.setPlacementPreview(constructionMode ? placementPosition : null, placementValid)
  }, [constructionMode, placementPosition, placementValid])

  useEffect(() => {
    rendererRef.current?.setSelectedBuilding(selectedBuildingId)
  }, [selectedBuildingId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExitConstruction()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExitConstruction])

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!constructionMode) return
    onHoverGrid(rendererRef.current?.screenToGrid(event.clientX, event.clientY) ?? null)
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !rendererRef.current) return
    if (constructionMode) {
      const position = rendererRef.current.screenToGrid(event.clientX, event.clientY)
      if (position) onPlaceBuilding(position)
      return
    }
    onSelectBuilding(rendererRef.current.pickBuildingId(event.clientX, event.clientY))
  }

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    onExitConstruction()
  }

  return <canvas ref={canvasRef} className="world-viewport" aria-label="NOVA procedural terrain" onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onContextMenu={handleContextMenu} />
}
