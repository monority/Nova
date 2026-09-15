import type { Buildability } from '../../domain/world'
import type { BuildingId, BuildingTypeId, GridPosition } from '../../domain/city'
import type { RoadConnectionMask, RoadId, RoadOrientation } from '../../domain/construction'
import type { RoadClass, ServiceBuildingId, ServiceType, ZoneId, ZoneType } from '../../domain/city'

export interface RenderWorldCell {
    readonly x: number
    readonly y: number
    readonly elevation: number
    readonly water: boolean
    readonly buildable: Buildability
}

export interface RenderWorld {
    readonly width: number
    readonly height: number
    readonly cells: readonly RenderWorldCell[]
}

export interface RenderSnapshot {
    readonly simulationTick: number
    readonly world: RenderWorld
    readonly buildings: readonly RenderBuilding[]
    readonly roads: readonly RenderRoad[]
    readonly population: RenderPopulation
    readonly zones: readonly RenderZone[]
    readonly services: readonly RenderService[]
}

export interface RenderZone { readonly id: ZoneId; readonly type: ZoneType; readonly cells: readonly GridPosition[] }
export interface RenderService { readonly id: ServiceBuildingId; readonly type: ServiceType; readonly position: GridPosition }

export interface RenderPopulation {
    readonly total: number
}

export interface RenderRoad {
    readonly id: RoadId
    readonly position: GridPosition
    readonly orientation: RoadOrientation
    readonly connectionMask: RoadConnectionMask
    readonly roadClass: RoadClass
}

export interface RenderBuilding {
    readonly id: BuildingId
    readonly type: BuildingTypeId
    readonly position: GridPosition
}
