import type { GridPosition } from './grid-position'
export type ServiceBuildingId = string & { readonly __brand: 'ServiceBuildingId' }
export type ServiceType = 'community'
export interface ServiceBuilding { readonly id: ServiceBuildingId; readonly type: ServiceType; readonly position: GridPosition }
export function toServiceBuildingId(value: string): ServiceBuildingId { return value as ServiceBuildingId }
