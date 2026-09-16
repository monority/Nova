import { countHousingStock, evaluateCivilizationStage, type CivilizationStage } from '../civilization'
import type { SimulationState } from './simulation-state'

/**
 * Step 23 — Canonical simulation state.
 *
 * Only data that determines the future of the simulation is included.
 * Excluded: React state, Three.js objects, camera, DOM, callbacks, functions,
 * transient UI state (selection, hover), wall-clock timestamps.
 *
 * The world is fully expanded (seed + dimensions regenerate it, but explicit
 * cells make the hash sensitive to any simulation-relevant terrain change).
 * The civilization stage is recomputed during canonicalization — never a
 * second source of truth.
 */

export interface CanonicalSimulationState {
  readonly tick: number
  readonly seed: number
  readonly world: {
    readonly width: number
    readonly height: number
    readonly cells: readonly {
      readonly id: string
      readonly x: number
      readonly y: number
      readonly elevation: number
      readonly water: boolean
      readonly buildable: string
    }[]
  }
  readonly population: { readonly total: number; readonly growthProgress: number }
  readonly economy: {
    readonly food: number
    readonly energy: number
    readonly materials: number
    readonly foodShortage: number
    readonly energyShortage: number
  }
  readonly buildings: readonly { readonly id: string; readonly type: string; readonly x: number; readonly y: number }[]
  readonly roads: readonly { readonly id: string; readonly x: number; readonly y: number }[]
  readonly zones: readonly {
    readonly id: string
    readonly type: string
    readonly cells: readonly { readonly x: number; readonly y: number }[]
  }[]
  readonly services: readonly { readonly id: string; readonly x: number; readonly y: number }[]
  readonly sequences: { readonly building: number; readonly road: number; readonly zone: number; readonly service: number }
  readonly stage: CivilizationStage
}

/** Normalize floats so equal logical values serialize identically. */
function round6(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Canonical state cannot contain non-finite numbers')
  return Math.round(value * 1_000_000) / 1_000_000
}

function compareId(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

export function toCanonicalSimulationState(state: SimulationState): CanonicalSimulationState {
  return {
    tick: state.clock.currentTick,
    seed: state.world.seed,
    world: {
      width: state.world.width,
      height: state.world.height,
      cells: [...state.world.cells]
        .sort(compareId)
        .map((cell) => ({
          id: cell.id,
          x: cell.x,
          y: cell.y,
          elevation: round6(cell.elevation),
          water: cell.water,
          buildable: cell.buildable,
        })),
    },
    population: { total: state.population.total, growthProgress: round6(state.population.growthProgress) },
    economy: {
      food: round6(state.economy.food),
      energy: round6(state.economy.energy),
      materials: round6(state.economy.materials),
      foodShortage: round6(state.economy.foodShortage),
      energyShortage: round6(state.economy.energyShortage),
    },
    buildings: [...state.city.buildings]
      .sort(compareId)
      .map((building) => ({ id: building.id, type: building.type, x: building.position.x, y: building.position.y })),
    roads: [...state.city.roads]
      .sort(compareId)
      .map((road) => ({ id: road.id, x: road.position.x, y: road.position.y })),
    zones: [...state.city.zones]
      .sort(compareId)
      .map((zone) => ({
        id: zone.id,
        type: zone.type,
        cells: [...zone.cells].sort((a, b) => a.y - b.y || a.x - b.x).map((cell) => ({ x: cell.x, y: cell.y })),
      })),
    services: [...state.city.services]
      .sort(compareId)
      .map((service) => ({ id: service.id, x: service.position.x, y: service.position.y })),
    sequences: {
      building: state.city.nextBuildingSequence,
      road: state.city.nextRoadSequence,
      zone: state.city.nextZoneSequence,
      service: state.city.nextServiceSequence,
    },
    stage: evaluateCivilizationStage({ population: state.population.total, houses: countHousingStock(state.city) }),
  }
}

/** Same logical state always produces the same bytes. */
export function serializeCanonicalState(canonical: CanonicalSimulationState): string {
  return JSON.stringify(canonical)
}

/**
 * FNV-1a 32-bit hash as 8 hex chars. Sync, zero-dependency, deterministic.
 * Divergence detector, not a cryptographic proof.
 */
export function hashCanonicalString(serialized: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** One-call API: state in, stable hash out. No canonicalization knowledge needed. */
export function getSimulationStateHash(state: SimulationState): string {
  return hashCanonicalString(serializeCanonicalState(toCanonicalSimulationState(state)))
}
