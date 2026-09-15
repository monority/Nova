import { useEffect, useState, useSyncExternalStore } from 'react'
import { createWorld } from '../../application/commands/create-world'
import { placeBuilding, removeBuilding } from '../../application/commands/construction'
import { pauseSimulation, resetSimulation, setSimulationSpeed, startSimulation, stepSimulation } from '../../application/commands/simulation-controls'
import { createSimulationState } from '../../domain/simulation/simulation-state'
import { SIMULATION_SPEEDS, type SimulationSpeed } from '../../domain/simulation/simulation-clock'
import { validatePlacement } from '../../domain/construction'
import type { BuildingId, GridPosition } from '../../domain/city'
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
    const [hoveredPosition, setHoveredPosition] = useState<GridPosition | null>(null)
    const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null)
    const speedIndex = SIMULATION_SPEEDS.indexOf(state.clock.timeScale)
    const changeSpeed = (direction: -1 | 1) => {
        const nextIndex = Math.max(0, Math.min(SIMULATION_SPEEDS.length - 1, speedIndex + direction))
        setSimulationSpeed(runtime, SIMULATION_SPEEDS[nextIndex] as SimulationSpeed)
    }
    const placementCheck = constructionMode && hoveredPosition
        ? validatePlacement(state.world, state.city, 'house', hoveredPosition)
        : { valid: false as const, reason: 'out_of_bounds' as const }
    const exitConstruction = () => {
        setConstructionMode(false)
        setHoveredPosition(null)
    }
    const handlePlaceBuilding = (position: GridPosition) => {
        const result = placeBuilding(runtime, { type: 'house', position })
        if (result.valid) {
            setSelectedBuildingId(result.building.id)
        }
    }
    const handleRemoveBuilding = (buildingId: BuildingId) => {
        removeBuilding(runtime, { buildingId })
        setSelectedBuildingId(null)
    }
    const handleReset = () => {
        resetSimulation(runtime)
        setSelectedBuildingId(null)
        exitConstruction()
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBuildingId) {
                removeBuilding(runtime, { buildingId: selectedBuildingId })
                setSelectedBuildingId(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [runtime, selectedBuildingId])

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
                    placementPosition={hoveredPosition}
                    placementValid={placementCheck.valid}
                    selectedBuildingId={selectedBuildingId}
                    onHoverGrid={setHoveredPosition}
                    onPlaceBuilding={handlePlaceBuilding}
                    onSelectBuilding={setSelectedBuildingId}
                    onExitConstruction={exitConstruction}
                />
            </section>
            <aside className="construction-panel" aria-label="Construction tools">
                <p className="eyebrow">CONSTRUCTION</p>
                {!constructionMode ? (
                    <button type="button" aria-label="Enter construction mode" onClick={() => setConstructionMode(true)}>BUILD</button>
                ) : (
                    <>
                        <button type="button" className="building-choice active" aria-label="Select house building" onClick={() => setConstructionMode(true)}>HOUSE</button>
                        <p className={placementCheck.valid ? 'placement-status valid' : 'placement-status'}>{placementCheck.valid ? 'VALID PLACEMENT' : placementCheck.reason.replace('_', ' ').toUpperCase()}</p>
                        <button type="button" onClick={exitConstruction}>CANCEL</button>
                    </>
                )}
                {selectedBuildingId && !constructionMode && <button type="button" className="remove-building" onClick={() => handleRemoveBuilding(selectedBuildingId)}>REMOVE SELECTED</button>}
                <p className="building-count" data-testid="building-count">BUILDINGS {state.city.buildings.length}</p>
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
