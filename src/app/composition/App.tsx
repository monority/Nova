import { useEffect, useState, useSyncExternalStore } from 'react'
import { createWorld } from '../../application/commands/create-world'
import { createDevelopmentZone, placeBuilding, placeRoad, placeService, removeBuilding, removeDevelopmentZone, removeRoad, removeService } from '../../application/commands/construction'
import { pauseSimulation, resetSimulation, setSimulationSpeed, startSimulation, stepSimulation } from '../../application/commands/simulation-controls'
import { SIMULATION_SPEEDS, type SimulationSpeed } from '../../domain/simulation/simulation-clock'
import { validatePlacement } from '../../domain/construction'
import type { BuildingId, GridPosition, RoadId, ServiceBuildingId } from '../../domain/city'
import { getRoadConnectionMask, validateRoadPlacement } from '../../domain/construction'
import { getHousingCapacity } from '../../domain/population'
import { SimulationRuntime } from '../../engine/simulation/SimulationRuntime'
import { deterministicSimulationStepper } from '../../engine/simulation/simulation-stepper'
import { WorldViewport } from '../../ui/components/WorldViewport'
import './app.css'
import { createInitialSettlement } from '../../application/scenarios/create-initial-settlement'

export function App() {
    const [runtime] = useState(() => new SimulationRuntime(
        createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 })),
        deterministicSimulationStepper,
    ))
    const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState)
    const [constructionMode, setConstructionMode] = useState(false)
    const [constructionType, setConstructionType] = useState<'house' | 'farm' | 'road' | 'zone' | 'service'>('house')
    const [zoneType, setZoneType] = useState<'residential' | 'agricultural'>('residential')
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
    const [selectedServiceId, setSelectedServiceId] = useState<ServiceBuildingId | null>(null)
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
            : constructionType === 'zone' || constructionType === 'service' ? { valid: true as const } : validatePlacement(state.world, state.city, constructionType, hoveredPosition)
        : { valid: false as const, reason: 'out_of_bounds' as const }
    const placementConnectionMask = hoveredPosition ? getRoadConnectionMask(state.city, hoveredPosition) : 0
    const exitConstruction = () => {
        setConstructionMode(false)
        setHoveredPosition(null)
    }
    const handlePlaceBuilding = (position: GridPosition) => {
        if (constructionType === 'service') {
            const result = placeService(runtime, { position })
            if (result.valid) setSelectedServiceId(result.service.id)
        } else if (constructionType === 'zone') {
            const result = createDevelopmentZone(runtime, { type: zoneType, cells: [position] })
            if (result.valid) setSelectedZoneId(result.zone.id)
        } else if (constructionType === 'road') {
            const result = placeRoad(runtime, { position })
            if (result.valid) setSelectedRoadId(result.road.id)
        } else {
            const result = placeBuilding(runtime, { type: constructionType, position })
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
        setSelectedZoneId(null)
        setSelectedServiceId(null)
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
                <div className="population-readout"><small>POPULATION</small><strong data-testid="population-count">{state.population.total.toLocaleString('en-US')}</strong></div>
                <div className="population-readout"><small>HOUSING / FOOD</small><strong>{getHousingCapacity(state.city)} / {state.economy.food.toFixed(0)}</strong></div>
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
                    onSelectService={setSelectedServiceId}
                    onExitConstruction={exitConstruction}
                />
            </section>
            <aside className="construction-panel" aria-label="Construction tools">
                <p className="eyebrow">CONSTRUCTION</p>
                {!constructionMode ? (
                    <><button type="button" aria-label="Enter house construction mode" onClick={() => { setConstructionType('house'); setConstructionMode(true) }}>HOUSE</button><button type="button" aria-label="Enter farm construction mode" onClick={() => { setConstructionType('farm'); setConstructionMode(true) }}>FARM</button><button type="button" aria-label="Enter road construction mode" onClick={() => { setConstructionType('road'); setConstructionMode(true) }}>ROAD</button><button type="button" aria-label="Enter community service construction mode" onClick={() => { setConstructionType('service'); setConstructionMode(true) }}>COMMUNITY</button><button type="button" aria-label="Enter zoning mode" onClick={() => { setConstructionType('zone'); setConstructionMode(true) }}>ZONE</button></>
                ) : (
                    <>
                        <button type="button" className={constructionType === 'house' ? 'building-choice active' : 'building-choice'} aria-label="Select house building" onClick={() => setConstructionType('house')}>HOUSE</button>
                        <button type="button" className={constructionType === 'farm' ? 'building-choice active' : 'building-choice'} aria-label="Select farm building" onClick={() => setConstructionType('farm')}>FARM</button>
                        <button type="button" className={constructionType === 'zone' ? 'building-choice active' : 'building-choice'} aria-label="Select zone mode" onClick={() => setConstructionType('zone')}>ZONE</button>
                        <button type="button" className={constructionType === 'service' ? 'building-choice active' : 'building-choice'} aria-label="Select community service" onClick={() => setConstructionType('service')}>COMMUNITY</button>
                        {constructionType === 'zone' && <><button type="button" className={zoneType === 'residential' ? 'building-choice active' : 'building-choice'} onClick={() => setZoneType('residential')}>RESIDENTIAL</button><button type="button" className={zoneType === 'agricultural' ? 'building-choice active' : 'building-choice'} onClick={() => setZoneType('agricultural')}>AGRICULTURAL</button></>}
                        <button type="button" className={constructionType === 'road' ? 'building-choice active' : 'building-choice'} aria-label="Select road construction" onClick={() => setConstructionType('road')}>ROAD</button>
                        <p className={placementCheck.valid ? 'placement-status valid' : 'placement-status'}>{placementCheck.valid ? 'VALID PLACEMENT' : placementCheck.reason.replace('_', ' ').toUpperCase()}</p>
                        <button type="button" onClick={exitConstruction}>CANCEL</button>
                    </>
                )}
                {selectedBuildingId && !constructionMode && <button type="button" className="remove-building" onClick={() => handleRemoveBuilding(selectedBuildingId)}>REMOVE SELECTED</button>}
                {selectedRoadId && !constructionMode && <button type="button" className="remove-building" onClick={() => { removeRoad(runtime, { roadId: selectedRoadId }); setSelectedRoadId(null) }}>REMOVE ROAD</button>}
                {selectedZoneId && !constructionMode && <button type="button" className="remove-building" onClick={() => { removeDevelopmentZone(runtime, { zoneId: selectedZoneId }); setSelectedZoneId(null) }}>REMOVE ZONE</button>}
                {selectedServiceId && !constructionMode && <button type="button" className="remove-building" onClick={() => { removeService(runtime, selectedServiceId); setSelectedServiceId(null) }}>REMOVE COMMUNITY</button>}
                <p className="building-count" data-testid="building-count">BUILDINGS {state.city.buildings.length} / ROADS {state.city.roads.length}</p>
            </aside>
            <footer className="debug-controls" aria-label="Simulation controls">
                <button type="button" aria-label={state.clock.status === 'running' ? 'Pause simulation' : 'Start simulation'} onClick={() => state.clock.status === 'running' ? pauseSimulation(runtime) : startSimulation(runtime)}>{state.clock.status === 'running' ? '❚❚' : '▶'}</button>
                <button type="button" onClick={() => changeSpeed(-1)} aria-label="Decrease simulation speed">−</button>
                <span>{state.clock.timeScale}×</span>
                <button type="button" onClick={() => changeSpeed(1)} aria-label="Increase simulation speed">+</button>
                <button type="button" aria-label="Advance one simulation tick" onClick={() => stepSimulation(runtime)}>STEP</button>
                <span className="debug-time">FOOD {state.economy.food.toFixed(1)} / SHORTAGE {state.economy.foodShortage.toFixed(1)} / YEAR {Math.floor(state.clock.simulationTimeSeconds / (360 * 24 * 60 * 60))} / TICK {state.clock.currentTick}</span>
                <button type="button" onClick={handleReset}>RESET</button>
            </footer>
        </main>
    )
}
