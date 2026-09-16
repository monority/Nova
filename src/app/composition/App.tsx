import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
import { toInspection } from '../../application/queries/to-inspection'
import { toResourceSummary } from '../../application/queries/to-resource-summary'
import { projectStageTransitionGroup, toCivilizationStage } from '../../application/queries/to-civilization-stage'
import { STAGE_LABELS } from '../../domain/civilization'
import { InspectionPanel } from '../../ui/components/InspectionPanel'
import { groupUrbanChanges, projectUrbanChanges, type UrbanChangeGroup } from '../../application/queries/simulation-events'

export function App() {
    const [runtime] = useState(() => new SimulationRuntime(
        createInitialSettlement(createWorld({ seed: 4242, width: 64, height: 48 })),
        deterministicSimulationStepper,
    ))
    const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState)
    const previousStateRef = useRef<typeof state | null>(null)
    const [eventHistory, setEventHistory] = useState<UrbanChangeGroup[]>([])
    const [constructionMode, setConstructionMode] = useState(false)
    const [constructionType, setConstructionType] = useState<'house' | 'farm' | 'road' | 'zone' | 'service'>('house')
    const [zoneType, setZoneType] = useState<'residential' | 'agricultural'>('residential')
    const [selectedServiceId, setSelectedServiceId] = useState<ServiceBuildingId | null>(null)
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
    const [hoveredPosition, setHoveredPosition] = useState<GridPosition | null>(null)
    const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null)
    const [selectedRoadId, setSelectedRoadId] = useState<RoadId | null>(null)
    const selection = selectedBuildingId ? { kind: 'building' as const, id: selectedBuildingId } : selectedRoadId ? { kind: 'road' as const, id: selectedRoadId } : selectedServiceId ? { kind: 'service' as const, id: selectedServiceId } : selectedZoneId ? { kind: 'zone' as const, id: selectedZoneId } : null
    const inspection = toInspection(state, selection)
    const resources = toResourceSummary(state)
    const stage = toCivilizationStage(state)
    const selectSpeed = (speed: SimulationSpeed) => setSimulationSpeed(runtime, speed)
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
    const handleCreateZone = (cells: readonly GridPosition[]) => {
        const result = createDevelopmentZone(runtime, { type: zoneType, cells })
        if (result.valid) setSelectedZoneId(result.zone.id)
    }
    const handleRemoveBuilding = (buildingId: BuildingId) => {
        removeBuilding(runtime, { buildingId })
        setSelectedBuildingId(null)
    }
    const handleReset = () => {
        resetSimulation(runtime)
        previousStateRef.current = runtime.getState()
        setEventHistory([])
        setSelectedBuildingId(null)
        setSelectedRoadId(null)
        setSelectedZoneId(null)
        setSelectedServiceId(null)
        exitConstruction()
    }

    useEffect(() => {
        if (!previousStateRef.current) {
            previousStateRef.current = state
            return
        }
        const previous = previousStateRef.current
        const changes = projectUrbanChanges(previous, state)
        const stageGroup = projectStageTransitionGroup(previous, state)
        previousStateRef.current = state
        const groups = [...(stageGroup ? [stageGroup] : []), ...groupUrbanChanges(changes)]
        if (groups.length > 0) setEventHistory((history) => [...groups, ...history].slice(0, 5))
    }, [state])

    const selectChange = (group: UrbanChangeGroup) => {
        if (group.changes.length === 0) return
        const change = group.changes[0]
        if (change.kind === 'ROAD_CREATED') setSelectedRoadId(change.id as RoadId)
        else setSelectedBuildingId(change.id as BuildingId)
        setSelectedServiceId(null)
        setSelectedZoneId(null)
    }
    // Step 23 — canonical time: 1 tick = 1 simulated day.
    const simulationTick = state.clock.currentTick
    const simulationYear = Math.floor(simulationTick / 360) + 1
    const dayOfYear = (simulationTick % 360) + 1

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
                <div className="population-readout"><small>HOUSING / FOOD</small><strong>{getHousingCapacity(state.city)} / {resources.food}</strong></div>
                <div className="population-readout" data-testid="resource-summary"><small>RESOURCES</small><strong>FOOD {resources.food} · ENERGY {resources.energy} · MATERIALS {resources.materials}{resources.constrained ? ' · CONSTRAINED' : ''}</strong></div>
                <div className="population-readout" data-testid="civilization-stage"><small>STAGE</small><strong>{STAGE_LABELS[stage]}</strong></div>
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
                    onSelectZone={setSelectedZoneId}
                    onCreateZone={handleCreateZone}
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
            <InspectionPanel inspection={inspection} />
            <footer className="debug-controls" aria-label="Simulation controls">
                <button type="button" aria-label={state.clock.status === 'running' ? 'Pause simulation' : 'Start simulation'} onClick={() => state.clock.status === 'running' ? pauseSimulation(runtime) : startSimulation(runtime)}>{state.clock.status === 'running' ? '❚❚' : '▶'}</button>
                {SIMULATION_SPEEDS.filter((speed) => speed > 0).map((speed) => <button key={speed} type="button" className={state.clock.timeScale === speed ? 'speed-active' : ''} onClick={() => selectSpeed(speed)}>{speed}×</button>)}
                <button type="button" aria-label="Advance one simulation tick" onClick={() => stepSimulation(runtime)}>STEP</button>
                <span className="debug-time">YEAR {simulationYear} / DAY {String(dayOfYear).padStart(2, '0')} · TICK {simulationTick} · {state.clock.status === 'paused' ? 'PAUSED' : 'RUNNING'}</span>
                <button type="button" onClick={handleReset}>RESET</button>
            </footer>
            <aside className="event-feed" aria-label="Recent simulation events">
                <p className="eyebrow">RECENT CHANGES</p>
                {eventHistory.length === 0 ? <span className="event-empty">NO RECENT CHANGES</span> : eventHistory.map((group, index) => <button type="button" className={index === 0 ? 'event-entry event-current' : 'event-entry'} key={group.key} onClick={() => selectChange(group)}>
                    <span className="event-time">TICK {group.tick}</span>
                    <span className="event-label">{group.label}</span>
                    {group.context.from && group.context.to && <span>{group.context.from.toUpperCase()} → {group.context.to.toUpperCase()}</span>}
                    <span>{group.context.zone ? `${group.context.zone.toUpperCase()} ZONE` : 'OUTSIDE DESIGNATED ZONE'}</span>
                    {group.context.adjacentToRoad && <span>ADJACENT TO ROAD</span>}
                    {group.context.nearCommunityService && <span>NEAR COMMUNITY SERVICE</span>}
                    {group.context.roadClass && <span>{group.context.roadClass.toUpperCase()} ROAD</span>}
                </button>)}
            </aside>
        </main>
    )
}
