import { useEffect, useRef, type PointerEvent } from 'react'
import type { SimulationRuntimePort } from '../../application/contracts/simulation-runtime'
import { toRenderSnapshot } from '../../application/queries/to-render-snapshot'
import type { BuildingId, GridPosition, RoadId } from '../../domain/city'
import type { RoadConnectionMask } from '../../domain/construction'
import { ThreeWorldRenderer } from '../../rendering/core/ThreeWorldRenderer'

interface WorldViewportProps {
  runtime: SimulationRuntimePort
  constructionMode: boolean
  constructionType: 'house' | 'farm' | 'road' | 'zone'
  placementPosition: GridPosition | null
  placementValid: boolean
  placementConnectionMask: RoadConnectionMask
  selectedBuildingId: BuildingId | null
  selectedRoadId: RoadId | null
  onHoverGrid: (position: GridPosition | null) => void
  onPlaceBuilding: (position: GridPosition) => void
  onSelectBuilding: (buildingId: BuildingId | null) => void
  onSelectRoad: (roadId: RoadId | null) => void
  onExitConstruction: () => void
}

export function WorldViewport({ runtime, constructionMode, constructionType, placementPosition, placementValid, placementConnectionMask, selectedBuildingId, selectedRoadId, onHoverGrid, onPlaceBuilding, onSelectBuilding, onSelectRoad, onExitConstruction }: WorldViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ThreeWorldRenderer | null>(null)
  const drawingRoadRef = useRef(false)
  const lastRoadCellRef = useRef<GridPosition | null>(null)

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
    if (constructionType === 'road') rendererRef.current?.setRoadPreview(constructionMode ? placementPosition : null, placementValid, placementConnectionMask)
    else rendererRef.current?.setPlacementPreview(constructionMode ? placementPosition : null, placementValid)
  }, [constructionMode, constructionType, placementConnectionMask, placementPosition, placementValid])

  useEffect(() => {
    rendererRef.current?.setSelectedBuilding(selectedBuildingId)
  }, [selectedBuildingId])

  useEffect(() => {
    rendererRef.current?.setSelectedRoad(selectedRoadId)
  }, [selectedRoadId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExitConstruction()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExitConstruction])

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!constructionMode || !rendererRef.current) return
    const position = rendererRef.current.screenToGrid(event.clientX, event.clientY)
    onHoverGrid(position)
    if (constructionType === 'road' && drawingRoadRef.current && position && (lastRoadCellRef.current?.x !== position.x || lastRoadCellRef.current?.y !== position.y)) {
      lastRoadCellRef.current = position
      onPlaceBuilding(position)
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !rendererRef.current) return
    if (constructionMode) {
      const position = rendererRef.current.screenToGrid(event.clientX, event.clientY)
      if (position) {
        onPlaceBuilding(position)
        drawingRoadRef.current = constructionType === 'road'
        lastRoadCellRef.current = position
      }
      return
    }
    const roadId = rendererRef.current.pickRoadId(event.clientX, event.clientY)
    if (roadId) {
      onSelectRoad(roadId)
      onSelectBuilding(null)
      return
    }
    onSelectRoad(null)
    onSelectBuilding(rendererRef.current.pickBuildingId(event.clientX, event.clientY))
  }

  const stopDrawingRoad = () => {
    drawingRoadRef.current = false
    lastRoadCellRef.current = null
  }

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    onExitConstruction()
  }

  return <canvas ref={canvasRef} className="world-viewport" aria-label="NOVA procedural terrain" onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={stopDrawingRoad} onPointerLeave={stopDrawingRoad} onContextMenu={handleContextMenu} />
}
