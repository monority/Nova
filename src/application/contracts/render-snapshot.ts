import type { Buildability } from '../../domain/world'
import type { BuildingId, BuildingTypeId, GridPosition } from '../../domain/city'

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
}

export interface RenderBuilding {
    readonly id: BuildingId
    readonly type: BuildingTypeId
    readonly position: GridPosition
}
