import { useEffect, useState, useSyncExternalStore } from 'react'
import { createWorld } from '../../application/commands/create-world'
import { placeBuilding, placeRoad, removeBuilding, removeRoad } from '../../application/commands/construction'
import { pauseSimulation, resetSimulation, setSimulationSpeed, startSimulation, stepSimulation } from '../../application/commands/simulation-controls'
import { createSimulationState } from '../../domain/simulation/simulation-state'
import { SIMULATION_SPEEDS, type SimulationSpeed } from '../../domain/simulation/simulation-clock'
import { validatePlacement } from '../../domain/construction'
import type { BuildingId, GridPosition, RoadId } from '../../domain/city'
import { getRoadConnectionMask, validateRoadPlacement } from '../../domain/construction'
import { SimulationRuntime } from '../../engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../engine/simulation/simulation-stepper'
import { WorldViewport } from '../../ui/components/WorldViewport'
import './app.css'

export function App() {
    const [runtime] = useState(() => new SimulationRuntime(
        createSimulationState(createWorld({ seed: 4242, width: 64, height: 48 })),
        deterministicSimulationStepper,
    ))
    const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState)
    const [constructionMode, setConstructionMode] = useState(false)
    const [constructionType, setConstructionType] = useState<'house' | 'road'>('house')
    const [hoveredPosition, setHoveredPosition] = useState<GridPosition | null>(null)
    const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null)
    const [selectedRoadId, setSelectedRoadId] = useState<RoadId | null>(null)
    const speedIndex = SIMULATION_SPEEDS.indexOf(state.clock.timeScale)
    const changeSpeed = (direction: -1 | 1) => {
        const nextIndex = Math.max(0, Math.min(SIMULATION_SPEEDS.length - 1, speedIndex + direction))
        setSimulationSpeed(runtime, SIMULATION_SPEEDS[nextIndex] as SimulationSpeed)
    }
    const placementCheck = constructionMode && hoveredPosition
        ? constructionType === 'road'
            ? validateRoadPlacement(state.world, state.city, hoveredPosition)
            : validatePlacement(state.world, state.city, 'house', hoveredPosition)
        : { valid: false as const, reason: 'out_of_bounds' as const }
    const placementConnectionMask = hoveredPosition ? getRoadConnectionMask(state.city, hoveredPosition) : 0
    const exitConstruction = () => {
        setConstructionMode(false)
        setHoveredPosition(null)
    }
    const handlePlaceBuilding = (position: GridPosition) => {
        if (constructionType === 'road') {
            const result = placeRoad(runtime, { position })
            if (result.valid) setSelectedRoadId(result.road.id)
        } else {
            const result = placeBuilding(runtime, { type: 'house', position })
            if (result.valid) setSelectedBuildingId(result.building.id)
        }
    }
    const handleRemoveBuilding = (buildingId: BuildingId) => {
        removeBuilding(runtime, { buildingId })
        setSelectedBuildingId(null)
    }
    const handleReset = () => {
        resetSimulation(runtime)
        setSelectedBuildingId(null)
        setSelectedRoadId(null)
        exitConstruction()
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') return
            if (selectedBuildingId) {
                removeBuilding(runtime, { buildingId: selectedBuildingId })
                setSelectedBuildingId(null)
            } else if (selectedRoadId) {
                removeRoad(runtime, { roadId: selectedRoadId })
                setSelectedRoadId(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [runtime, selectedBuildingId, selectedRoadId])

    return (
        <main className="app-shell">
            <header className="app-header">
                <span className="brand-mark">N</span>
                <div>
                    <strong>NOVA</strong>
                    <small>EMERGENCE PROTOCOL</small>
                </div>
            </header>
            <section className="world-stage" aria-labelledby="app-title">
                <div className="stage-label">
                    <p className="eyebrow">FOUNDATION / WORLD ONLINE</p>
                    <h1 id="app-title">NOVA WORLD</h1>
                    <p>SEED {state.world.seed} / {state.world.width} × {state.world.height}</p>
                </div>
                <WorldViewport
                    runtime={runtime}
                    constructionMode={constructionMode}
                    constructionType={constructionType}
                    placementPosition={hoveredPosition}
                    placementValid={placementCheck.valid}
                    placementConnectionMask={placementConnectionMask}
                    selectedBuildingId={selectedBuildingId}
                    selectedRoadId={selectedRoadId}
                    onHoverGrid={setHoveredPosition}
                    onPlaceBuilding={handlePlaceBuilding}
                    onSelectBuilding={setSelectedBuildingId}
                    onSelectRoad={setSelectedRoadId}
                    onExitConstruction={exitConstruction}
                />
            </section>
            <aside className="construction-panel" aria-label="Construction tools">
                <p className="eyebrow">CONSTRUCTION</p>
                {!constructionMode ? (
                    <><button type="button" aria-label="Enter house construction mode" onClick={() => { setConstructionType('house'); setConstructionMode(true) }}>HOUSE</button><button type="button" aria-label="Enter road construction mode" onClick={() => { setConstructionType('road'); setConstructionMode(true) }}>ROAD</button></>
                ) : (
                    <>
                        <button type="button" className={constructionType === 'house' ? 'building-choice active' : 'building-choice'} aria-label="Select house building" onClick={() => setConstructionType('house')}>HOUSE</button>
                        <button type="button" className={constructionType === 'road' ? 'building-choice active' : 'building-choice'} aria-label="Select road construction" onClick={() => setConstructionType('road')}>ROAD</button>
                        <p className={placementCheck.valid ? 'placement-status valid' : 'placement-status'}>{placementCheck.valid ? 'VALID PLACEMENT' : placementCheck.reason.replace('_', ' ').toUpperCase()}</p>
                        <button type="button" onClick={exitConstruction}>CANCEL</button>
                    </>
                )}
                {selectedBuildingId && !constructionMode && <button type="button" className="remove-building" onClick={() => handleRemoveBuilding(selectedBuildingId)}>REMOVE SELECTED</button>}
                {selectedRoadId && !constructionMode && <button type="button" className="remove-building" onClick={() => { removeRoad(runtime, { roadId: selectedRoadId }); setSelectedRoadId(null) }}>REMOVE ROAD</button>}
                <p className="building-count" data-testid="building-count">BUILDINGS {state.city.buildings.length} / ROADS {state.city.roads.length}</p>
            </aside>
            <footer className="debug-controls" aria-label="Simulation controls">
                <button type="button" aria-label={state.clock.status === 'running' ? 'Pause simulation' : 'Start simulation'} onClick={() => state.clock.status === 'running' ? pauseSimulation(runtime) : startSimulation(runtime)}>{state.clock.status === 'running' ? '❚❚' : '▶'}</button>
                <button type="button" onClick={() => changeSpeed(-1)} aria-label="Decrease simulation speed">−</button>
                <span>{state.clock.timeScale}×</span>
                <button type="button" onClick={() => changeSpeed(1)} aria-label="Increase simulation speed">+</button>
                <button type="button" aria-label="Advance one simulation tick" onClick={() => stepSimulation(runtime)}>STEP</button>
                <span className="debug-time">YEAR {Math.floor(state.clock.simulationTimeSeconds / (360 * 24 * 60 * 60))} / TICK {state.clock.currentTick}</span>
                <button type="button" onClick={handleReset}>RESET</button>
            </footer>
        </main>
    )
}
