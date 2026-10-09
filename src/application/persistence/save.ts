/**
 * Persistence over canonical state (docs/17, docs/18).
 *
 * - Saves represent canonical simulation state, never renderer state.
 * - Explicit format version from the first save implementation.
 * - Unknown/unsupported versions are rejected. A version that the repository
 *   explicitly knows how to migrate (v4 -> v5 -> v6 -> v7, Steps 10M/10P/10Y)
 *   is migrated with deterministic semantics; everything else is rejected.
 */

import { canonicalJson } from '../../domain/simulation/hash.js'
import type { BuildingState } from '../../domain/building/building.js'
import type { ColonistState } from '../../domain/population/colonist.js'
import type { ResourceStock } from '../../domain/resource/resource.js'
import { createInitialStorageHub, type StorageHub } from '../../domain/storage/storage.js'
import { type RoadState } from '../../domain/road/road.js'
import type { SimulationState } from '../../domain/simulation/state.js'
import {
  isInBounds,
  normalizeBlockedCells,
  parseBlockedCell,
  type WoodDepositSeed,
  type WorldConfig,
} from '../../domain/world/grid.js'

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
/**
 * v7: ColonistState gained `constructionAssignmentId` (Step 10Y). A v6 save
 * (and any older save chained through v6) is migrated deterministically by
 * adding `constructionAssignmentId: null` to every colonist — historical
 * colonists are never retroactively interpreted as construction crew.
 */
/**
 * v8: SimulationState gained `storage` (Step 10BG). A v7 save is migrated
 * deterministically by adding an empty StorageHub to every state.
 */
/**
 * v9: Step001 money migration. `resources.construction` becomes `money`,
 * and the removed hub material slot is folded into the treasury — no
 * stored value is lost, money is simply no longer double-counted as a
 * physical stock. Capacities drop the material slot.
 */
/**
 * Step 10AV: terrain (`config.world.blockedCells`) is an OPTIONAL field that
 * is omitted whenever the world has no blocked cell, so a terrain-free world
 * — every save written before this step — keeps exactly its historical
 * canonical bytes and hash, and an old save loads with NO terrain. Only a
 * world that actually owns blocked cells carries the field. No migration and
 * therefore NO version bump: SAVE_VERSION stays 8.
 */
export const SAVE_VERSION = 11
/** The single previous version this build knows how to migrate (v4..v10 chain through it). */
export const MIGRATABLE_SAVE_VERSION = 10
/** Every older version the chained migration still accepts. */
export const MIGRATABLE_SAVE_VERSIONS: readonly number[] = [4, 5, 6, 7, 8, 9, 10]

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
 *   v5 -> v6: add `water: 0` to the resource stock;
 *   v6 -> v7: stamp every colonist `constructionAssignmentId: null`;
 *   v7 -> v8: add empty StorageHub;
 *   v8 -> v9: rename `resources.construction` to `money`, fold hub
 *     `storage.material` into the treasury, drop the hub material slot;
 *   v9 -> v10: add `resources.wood` (0) and empty `woodDeposits` (Step003);
 *   v10 -> v11: pre-place the Colony Center anchor (Step004).
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
    } else if (version === 6) {
      current = migrateV6ToV7(current)
    } else if (version === 7) {
      current = migrateV7ToV8(current)
    } else if (version === 8) {
      current = migrateV8ToV9(current)
    } else if (version === 9) {
      current = migrateV9ToV10(current)
    } else if (version === 10) {
      current = migrateV10ToV11(current)
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

/** v6 -> v7: stamp every colonist `constructionAssignmentId: null`. */
const migrateV6ToV7 = (save: Record<string, unknown>): Record<string, unknown> => {
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
      value['constructionAssignmentId'] === undefined
        ? { ...value, constructionAssignmentId: null }
        : value
  }
  return { ...save, state: { ...state, colonists } }
}

/**
 * v10 -> v11: Step004 Day-0 bootstrap hardening. Every colony owns exactly
 * one pre-placed, operational, maintenance-exempt Colony Center (audit D4).
 * Old saves (where the Center was player-placeable and usually absent) gain
 * it deterministically: first valid cell of the SAVED world (y-then-x scan,
 * skipping blocked cells and wood deposits), canonical id `colony-center`.
 * If the save already carries a Colony Center (e.g. a player-placed one),
 * it is preserved untouched — no duplicates.
 */
const migrateV10ToV11 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state)) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const buildings = isRecord(state['buildings'])
    ? (state['buildings'] as Record<string, unknown>)
    : {}
  const alreadyAnchored = Object.values(buildings).some(
    (b) => isRecord(b) && b['type'] === 'colonyCenter'
  )
  if (alreadyAnchored) {
    return save
  }
  const world = isRecord(state['config']) && isRecord(state['config']['world'])
    ? (state['config']['world'] as Record<string, unknown>)
    : {}
  const width = typeof world['width'] === 'number' ? world['width'] : 0
  const height = typeof world['height'] === 'number' ? world['height'] : 0
  const blocked = Array.isArray(world['blockedCells'])
    ? new Set(world['blockedCells'] as string[])
    : new Set<string>()
  const deposits = isRecord(state['woodDeposits'])
    ? new Set(Object.keys(state['woodDeposits'] as Record<string, unknown>))
    : new Set<string>()
  let anchor: Record<string, unknown> | null = null
  for (let y = 0; y < height && anchor === null; y += 1) {
    for (let x = 0; x < width && anchor === null; x += 1) {
      const key = `${x},${y}`
      if (blocked.has(key) || deposits.has(key)) continue
      anchor = {
        id: 'colony-center',
        type: 'colonyCenter',
        x,
        y,
        status: 'operational',
        constructionRemaining: 0,
      }
    }
  }
  if (anchor === null) {
    // No buildable cell in the saved world: preserve the save as-is rather
    // than fabricate an anchor that could not exist (the state stays loadable).
    return save
  }
  return {
    ...save,
    state: { ...state, buildings: { ...buildings, 'colony-center': anchor } },
  }
}

/**
 * v9 -> v10: Step003 physical-wood slice. Adds `resources.wood` (deterministic
 * default 0: wood only ever enters through extraction, so pre-Step003 colonies
 * hold none) and `woodDeposits` (deterministic default: no deposits — the
 * world had none before this version). Value-preserving: no existing field is
 * renamed or dropped.
 */
const migrateV9ToV10 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state) || !isRecord(state['resources'])) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const resources = state['resources'] as Record<string, unknown>
  return {
    ...save,
    state: {
      ...state,
      resources: {
        ...resources,
        wood: typeof resources['wood'] === 'number' ? resources['wood'] : 0,
      },
      woodDeposits: state['woodDeposits'] ?? {},
    },
  }
}

/** v8 -> v9: Step001 money migration (value-preserving, see version doc). */
const migrateV8ToV9 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state) || !isRecord(state['resources'])) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const resources = state['resources']
  const construction = resources['construction']
  if (typeof construction !== 'number') {
    throw new SaveValidationError('Malformed save: missing resources.construction')
  }
  let money = construction
  let storage = state['storage']
  if (isRecord(storage) && typeof storage['material'] === 'number') {
    money += storage['material'] as number
    const { material: _dropped, ...restStorage } = storage as Record<string, unknown> & { material?: unknown }
    void _dropped
    const capacities = (restStorage['capacities'] as Record<string, unknown> | undefined) ?? {}
    const { material: _droppedCap, ...restCapacities } = capacities
    void _droppedCap
    storage = { ...restStorage, capacities: restCapacities }
  }
  const { construction: _renamed, ...restResources } = resources as Record<string, unknown> & { construction?: unknown }
  void _renamed
  return {
    ...save,
    state: { ...state, resources: { ...restResources, money }, storage },
  }
}

/** v7 -> v8: add empty StorageHub (Step 10BG). */
const migrateV7ToV8 = (save: Record<string, unknown>): Record<string, unknown> => {
  const state = save['state']
  if (!isRecord(state)) {
    throw new SaveValidationError('Malformed save: missing state')
  }
  const storage = state['storage']
  return {
    ...save,
    state: storage === undefined
      ? { ...state, storage: createInitialStorageHub() }
      : state,
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
  if (
    version !== SAVE_VERSION &&
    !MIGRATABLE_SAVE_VERSIONS.includes(version as number)
  ) {
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
  const blockedCells = validateBlockedCells(world)
  assertFiniteInt(time['tick'], 'time.tick')
  assertFiniteInt(counters['nextBuildingId'], 'counters.nextBuildingId')
  assertFiniteInt(counters['nextColonistId'], 'counters.nextColonistId')
  assertFiniteInt(resources['money'], 'resources.money')
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
    const constructionAssignmentId = value['constructionAssignmentId']
    if (
      constructionAssignmentId !== null &&
      typeof constructionAssignmentId !== 'string'
    ) {
      throw new SaveValidationError(
        `Malformed save: colonists.${id}.constructionAssignmentId`
      )
    }
    if (value['id'] !== id) {
      throw new SaveValidationError(`Malformed save: colonist key/id mismatch for ${id}`)
    }
    validatedColonists[id] = value as unknown as ColonistState
  }

  const resourcesStock: ResourceStock = {
    money: resources['money'] as number,
    food: resources['food'] as number,
    water: resources['water'] as number,
    wood: resources['wood'] as number,
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
        // Step 10AV: present ONLY when the world owns blocked cells, so the
        // canonical form of a terrain-free save is byte-identical.
        ...(blockedCells === undefined ? {} : { blockedCells }),
        // Step003: deposit seeds round-trip through the world config (the
        // mutable state lives in state.woodDeposits; this is the seed).
        ...(Array.isArray(world['woodDeposits'])
          ? { woodDeposits: world['woodDeposits'] as WoodDepositSeed[] }
          : {}),
      },
    },
    time: { tick: time['tick'] as number },
    resources: resourcesStock,
    storage: validateStorage(raw),
    buildings: validatedBuildings,
    colonists: validatedColonists,
    roads: validatedRoads,
    // Step003: deposits are canonical persisted state — validated as a whole
    // by the round-trip check below (normalized form: canonical keys).
    woodDeposits: (raw['woodDeposits'] ?? {}) as SimulationState['woodDeposits'],
    counters: {
      nextBuildingId: counters['nextBuildingId'] as number,
      nextColonistId: counters['nextColonistId'] as number,
      nextRoadId: counters['nextRoadId'] as number,
    },
  }
  // Round-trip consistency: re-serializing the validated state must match,
  // otherwise the save contained fields the validator dropped. An explicitly
  // EMPTY blockedCells list is the one tolerated spelling difference (Step
  // 10AV): it normalizes to "no terrain", whose canonical form omits the key.
  if (canonicalJson(state) !== canonicalJson(withoutEmptyBlockedCells(raw))) {
    throw new SaveValidationError('Malformed save: state contains unexpected fields')
  }
  return state
}

/**
 * Validate storage state from a save. Returns the default empty hub for
 * saves that predate Step 10BG (v7 and earlier).
 */
const validateStorage = (raw: Record<string, unknown>): StorageHub => {
  const storage = raw['storage']
  if (!isRecord(storage)) {
    // Pre-Step 10BG save: return default empty hub
    return createInitialStorageHub()
  }
  const food = storage['food']
  const water = storage['water']
  const capacities = storage['capacities']
  if (
    typeof food !== 'number' || !Number.isInteger(food) || food < 0 ||
    typeof water !== 'number' || !Number.isInteger(water) || water < 0
  ) {
    return createInitialStorageHub()
  }
  if (!isRecord(capacities)) {
    return createInitialStorageHub()
  }
  const capFood = capacities['food']
  const capWater = capacities['water']
  if (
    typeof capFood !== 'number' || !Number.isInteger(capFood) || capFood < 0 ||
    typeof capWater !== 'number' || !Number.isInteger(capWater) || capWater < 0
  ) {
    return createInitialStorageHub()
  }
  return {
    food,
    water,
    capacities: { food: capFood, water: capWater },
  }
}

/**
 * Step 10AV: validate `config.world.blockedCells` and return its canonical
 * form, or undefined when the world has no terrain. The list must already be
 * canonical (sorted, unique) because saves are canonical state; a save that
 * carries a non-canonical list is rejected rather than silently rewritten.
 */
const validateBlockedCells = (
  world: Record<string, unknown>
): readonly string[] | undefined => {
  const raw = world['blockedCells']
  if (raw === undefined) {
    return undefined
  }
  if (!Array.isArray(raw) || raw.some((key) => typeof key !== 'string')) {
    throw new SaveValidationError('Malformed save: config.world.blockedCells')
  }
  const keys = raw as string[]
  const width = world['width']
  const height = world['height']
  let canonical: string[]
  try {
    canonical = normalizeBlockedCells(keys)
  } catch {
    throw new SaveValidationError('Malformed save: config.world.blockedCells')
  }
  if (canonical.length !== keys.length) {
    throw new SaveValidationError(
      'Malformed save: config.world.blockedCells must not contain duplicates'
    )
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (canonical[index] !== keys[index]) {
      throw new SaveValidationError(
        'Malformed save: config.world.blockedCells must be sorted'
      )
    }
  }
  const bounds: WorldConfig = {
    seed: '',
    width: typeof width === 'number' ? width : 0,
    height: typeof height === 'number' ? height : 0,
  }
  for (const key of canonical) {
    if (!isInBounds(bounds, parseBlockedCell(key))) {
      throw new SaveValidationError(
        `Malformed save: config.world.blockedCells out of bounds (${key})`
      )
    }
  }
  return canonical.length === 0 ? undefined : canonical
}

/** The same save with an explicitly empty blockedCells list removed (Step 10AV). */
const withoutEmptyBlockedCells = (
  raw: Record<string, unknown>
): Record<string, unknown> => {
  const config = raw['config']
  if (!isRecord(config)) {
    return raw
  }
  const world = config['world']
  if (!isRecord(world)) {
    return raw
  }
  const blocked = world['blockedCells']
  if (!Array.isArray(blocked) || blocked.length > 0) {
    return raw
  }
  const restWorld: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(world)) {
    if (key !== 'blockedCells') {
      restWorld[key] = value
    }
  }
  return { ...raw, config: { ...config, world: restWorld } }
}
