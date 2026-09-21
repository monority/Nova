/**
 * Persistence over canonical state (docs/17, docs/18).
 *
 * - Saves represent canonical simulation state, never renderer state.
 * - Explicit format version from the first save implementation.
 * - Unknown/unsupported versions are rejected. A version that the repository
 *   explicitly knows how to migrate (v4 -> v5, Step 10M) is migrated with
 *   deterministic semantics; everything else is rejected.
 */

import { canonicalJson } from '../../domain/simulation/hash.js'
import type { BuildingState } from '../../domain/building/building.js'
import type { ColonistState } from '../../domain/population/colonist.js'
import type { ResourceStock } from '../../domain/resource/resource.js'
import { type RoadState } from '../../domain/road/road.js'
import type { SimulationState } from '../../domain/simulation/state.js'

export const SAVE_FORMAT = 'nova-save'
/** v2: SimulationState gained a `resources` field (Step 4). */
/** v3: ResourceStock gained `food` (Step 05). v2 saves are rejected. */
/**
 * v4: ColonistState gained `workplaceId` (Step 07C). v3 saves are rejected
 * explicitly — no silent migration is invented, following the repository's
 * established versioning policy.
 */
/**
 * v5: ColonistState gained `workplaceAssignmentMode` (Step 10M). A v4 save is
 * migrated deterministically by adding `workplaceAssignmentMode: 'automatic'`
 * to every colonist — historical assignments are NEVER reinterpreted as
 * manual overrides. Saves older than v4 remain rejected.
 */
/**
 * v6: ResourceStock gained `water` (Step 10P). A v5 save (and a v4 save
 * chained through v5) is migrated deterministically by adding `water: 0`.
 * Historical Water is never inferred. Saves older than v4 remain rejected.
 */
export const SAVE_VERSION = 6
/** The single previous version this build knows how to migrate (and v4 chains through it). */
export const MIGRATABLE_SAVE_VERSION = 5

export interface SaveFile {
  readonly format: typeof SAVE_FORMAT
  readonly version: number
  readonly state: SimulationState
}

export const serializeSave = (state: SimulationState): string => {
  const save: SaveFile = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    state,
  }
  return canonicalJson(save)
}

export class SaveValidationError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertFiniteInt = (value: unknown, field: string): void => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new SaveValidationError(`Invalid field: ${field}`)
  }
}

const assertString = (value: unknown, field: string): void => {
  if (typeof value !== 'string') {
    throw new SaveValidationError(`Invalid field: ${field}`)
  }
}

/**
 * Deterministic, chained migration to the current SAVE_VERSION:
 *   v4 -> v5: stamp every colonist `workplaceAssignmentMode: 'automatic'`;
 *   v5 -> v6: add `water: 0` to the resource stock.
 * Pure: the same old bytes always yield the same current state.
 */
const migrateSave = (save: Record<string, unknown>): Record<string, unknown> => {
  let current = save
  let version = current['version']
  while (typeof version === 'number' && version < SAVE_VERSION) {
    if (version === 4) {
      current = migrateV4ToV5(current)
    } else if (version === 5) {
      current = migrateV5ToV6(current)
    } else {
      break
    }
    version += 1
    current = { ...current, version }
  }
  return current
}

/** v4 -> v5: stamp every colonist automatic. */
const migrateV4ToV5 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state) || !isRecord(state['colonists'])) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const colonists: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(state['colonists'])) {
    if (!isRecord(value)) {
      throw new SaveValidationError(`Malformed save: colonist ${id}`)
    }
    colonists[id] =
      value['workplaceAssignmentMode'] === undefined
        ? { ...value, workplaceAssignmentMode: 'automatic' }
        : value
  }
  return { ...save, state: { ...state, colonists } }
}

/** v5 -> v6: add `water: 0` to the resource stock. */
const migrateV5ToV6 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state) || !isRecord(state['resources'])) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const resources = state['resources']
  return {
    ...save,
    state: {
      ...state,
      resources:
        resources['water'] === undefined ? { ...resources, water: 0 } : resources,
    },
  }
}

/** Restore canonical state from serialized content. Migrates v4/v5 saves. */
export const loadSave = (raw: string): SimulationState => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SaveValidationError('Malformed save: invalid JSON')
  }
  if (!isRecord(parsed)) {
    throw new SaveValidationError('Malformed save: expected object')
  }
  if (parsed['format'] !== SAVE_FORMAT) {
    throw new SaveValidationError('Malformed save: unknown format')
  }
  const version = parsed['version']
  if (version !== SAVE_VERSION && version !== 4 && version !== MIGRATABLE_SAVE_VERSION) {
    throw new SaveValidationError(
      `Unsupported save version: ${String(version)} (expected ${SAVE_VERSION})`
    )
  }
  const migrated = migrateSave(parsed)
  const rawState = migrated['state']
  if (!isRecord(rawState)) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  return validateStateShape(rawState)
}

/** Minimal canonical-shape validation. Full behavioral validation lives in tests. */
export const validateStateShape = (raw: Record<string, unknown>): SimulationState => {
  const config = raw['config']
  const time = raw['time']
  const buildings = raw['buildings']
  const colonists = raw['colonists']
  const counters = raw['counters']
  const resources = raw['resources']
  if (!isRecord(config) || !isRecord(time) || !isRecord(buildings) ||
      !isRecord(colonists) || !isRecord(counters) || !isRecord(resources)) {
    throw new SaveValidationError('Malformed save: state shape mismatch')
  }
  const world = config['world']
  if (!isRecord(world)) {
    throw new SaveValidationError('Malformed save: missing world config')
  }
  assertString(world['seed'], 'config.world.seed')
  assertFiniteInt(world['width'], 'config.world.width')
  assertFiniteInt(world['height'], 'config.world.height')
  assertFiniteInt(time['tick'], 'time.tick')
  assertFiniteInt(counters['nextBuildingId'], 'counters.nextBuildingId')
  assertFiniteInt(counters['nextColonistId'], 'counters.nextColonistId')
  assertFiniteInt(resources['construction'], 'resources.construction')
  assertFiniteInt(resources['food'], 'resources.food')
  assertFiniteInt(resources['water'], 'resources.water')
  if ((resources['food'] as number) < 0) {
    throw new SaveValidationError('Malformed save: resources.food must be >= 0')
  }
  if ((resources['water'] as number) < 0) {
    throw new SaveValidationError('Malformed save: resources.water must be >= 0')
  }

  const validatedBuildings: Record<string, BuildingState> = {}
  for (const [id, value] of Object.entries(buildings)) {
    if (!isRecord(value)) {
      throw new SaveValidationError(`Malformed save: building ${id}`)
    }
    assertString(value['id'], `buildings.${id}.id`)
    assertString(value['type'], `buildings.${id}.type`)
    assertFiniteInt(value['x'], `buildings.${id}.x`)
    assertFiniteInt(value['y'], `buildings.${id}.y`)
    assertString(value['status'], `buildings.${id}.status`)
    assertFiniteInt(value['constructionRemaining'], `buildings.${id}.constructionRemaining`)
    if (value['id'] !== id) {
      throw new SaveValidationError(`Malformed save: building key/id mismatch for ${id}`)
    }
    validatedBuildings[id] = value as unknown as BuildingState
  }

  const validatedColonists: Record<string, ColonistState> = {}
  for (const [id, value] of Object.entries(colonists)) {
    if (!isRecord(value)) {
      throw new SaveValidationError(`Malformed save: colonist ${id}`)
    }
    assertString(value['id'], `colonists.${id}.id`)
    const residenceId = value['residenceId']
    if (residenceId !== null && typeof residenceId !== 'string') {
      throw new SaveValidationError(`Malformed save: colonists.${id}.residenceId`)
    }
    const workplaceId = value['workplaceId']
    if (workplaceId !== null && typeof workplaceId !== 'string') {
      throw new SaveValidationError(`Malformed save: colonists.${id}.workplaceId`)
    }
    const mode = value['workplaceAssignmentMode']
    if (mode !== 'automatic' && mode !== 'manual') {
      throw new SaveValidationError(
        `Malformed save: colonists.${id}.workplaceAssignmentMode`
      )
    }
    if (value['id'] !== id) {
      throw new SaveValidationError(`Malformed save: colonist key/id mismatch for ${id}`)
    }
    validatedColonists[id] = value as unknown as ColonistState
  }

  const resourcesStock: ResourceStock = {
    construction: resources['construction'] as number,
    food: resources['food'] as number,
    water: resources['water'] as number,
  }

  const validatedRoads: Record<string, RoadState> = {}
  for (const [id, value] of Object.entries(raw['roads'] ?? {})) {
    if (!isRecord(value)) {
      throw new SaveValidationError(`Malformed save: road ${id}`)
    }
    assertString(value['id'], `roads.${id}.id`)
    assertFiniteInt(value['x'], `roads.${id}.x`)
    assertFiniteInt(value['y'], `roads.${id}.y`)
    assertString(value['status'], `roads.${id}.status`)
    assertFiniteInt(value['constructionRemaining'], `roads.${id}.constructionRemaining`)
    if (value['id'] !== id) {
      throw new SaveValidationError(`Malformed save: road key/id mismatch for ${id}`)
    }
    validatedRoads[id] = value as unknown as RoadState
  }

  if (Object.keys(validatedRoads).length !== Object.keys(raw['roads'] ?? {}).length) {
    throw new SaveValidationError('Malformed save: road key/id mismatch count')
  }

  const state: SimulationState = {
    config: {
      world: {
        seed: world['seed'] as string,
        width: world['width'] as number,
        height: world['height'] as number,
      },
    },
    time: { tick: time['tick'] as number },
    resources: resourcesStock,
    buildings: validatedBuildings,
    colonists: validatedColonists,
    roads: validatedRoads,
    counters: {
      nextBuildingId: counters['nextBuildingId'] as number,
      nextColonistId: counters['nextColonistId'] as number,
      nextRoadId: counters['nextRoadId'] as number,
    },
  }
  // Round-trip consistency: re-serializing the validated state must match,
  // otherwise the save contained fields the validator dropped.
  if (canonicalJson(state) !== canonicalJson(raw)) {
    throw new SaveValidationError('Malformed save: state contains unexpected fields')
  }
  return state
}
