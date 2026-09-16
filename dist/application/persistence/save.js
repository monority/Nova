/**
 * Persistence over canonical state (docs/17, docs/18).
 *
 * - Saves represent canonical simulation state, never renderer state.
 * - Explicit format version from the first save implementation.
 * - Unknown/unsupported versions are rejected, never silently migrated.
 */
import { canonicalJson } from '../../domain/simulation/hash.js';
export const SAVE_FORMAT = 'nova-save';
export const SAVE_VERSION = 1;
export const serializeSave = (state) => {
    const save = {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        state,
    };
    return canonicalJson(save);
};
export class SaveValidationError extends Error {
}
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const assertFiniteInt = (value, field) => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new SaveValidationError(`Invalid field: ${field}`);
    }
};
const assertString = (value, field) => {
    if (typeof value !== 'string') {
        throw new SaveValidationError(`Invalid field: ${field}`);
    }
};
/** Restore canonical state from serialized content. Rejects anything not matching SAVE_VERSION. */
export const loadSave = (raw) => {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new SaveValidationError('Malformed save: invalid JSON');
    }
    if (!isRecord(parsed)) {
        throw new SaveValidationError('Malformed save: expected object');
    }
    if (parsed['format'] !== SAVE_FORMAT) {
        throw new SaveValidationError('Malformed save: unknown format');
    }
    if (parsed['version'] !== SAVE_VERSION) {
        throw new SaveValidationError(`Unsupported save version: ${String(parsed['version'])} (expected ${SAVE_VERSION})`);
    }
    const rawState = parsed['state'];
    if (!isRecord(rawState)) {
        throw new SaveValidationError('Malformed save: missing state');
    }
    return validateStateShape(rawState);
};
/** Minimal canonical-shape validation. Full behavioral validation lives in tests. */
export const validateStateShape = (raw) => {
    const config = raw['config'];
    const time = raw['time'];
    const buildings = raw['buildings'];
    const colonists = raw['colonists'];
    const counters = raw['counters'];
    if (!isRecord(config) || !isRecord(time) || !isRecord(buildings) ||
        !isRecord(colonists) || !isRecord(counters)) {
        throw new SaveValidationError('Malformed save: state shape mismatch');
    }
    const world = config['world'];
    if (!isRecord(world)) {
        throw new SaveValidationError('Malformed save: missing world config');
    }
    assertString(world['seed'], 'config.world.seed');
    assertFiniteInt(world['width'], 'config.world.width');
    assertFiniteInt(world['height'], 'config.world.height');
    assertFiniteInt(time['tick'], 'time.tick');
    assertFiniteInt(counters['nextBuildingId'], 'counters.nextBuildingId');
    assertFiniteInt(counters['nextColonistId'], 'counters.nextColonistId');
    const validatedBuildings = {};
    for (const [id, value] of Object.entries(buildings)) {
        if (!isRecord(value)) {
            throw new SaveValidationError(`Malformed save: building ${id}`);
        }
        assertString(value['id'], `buildings.${id}.id`);
        assertString(value['type'], `buildings.${id}.type`);
        assertFiniteInt(value['x'], `buildings.${id}.x`);
        assertFiniteInt(value['y'], `buildings.${id}.y`);
        assertString(value['status'], `buildings.${id}.status`);
        assertFiniteInt(value['constructionRemaining'], `buildings.${id}.constructionRemaining`);
        if (value['id'] !== id) {
            throw new SaveValidationError(`Malformed save: building key/id mismatch for ${id}`);
        }
        validatedBuildings[id] = value;
    }
    const validatedColonists = {};
    for (const [id, value] of Object.entries(colonists)) {
        if (!isRecord(value)) {
            throw new SaveValidationError(`Malformed save: colonist ${id}`);
        }
        assertString(value['id'], `colonists.${id}.id`);
        const residenceId = value['residenceId'];
        if (residenceId !== null && typeof residenceId !== 'string') {
            throw new SaveValidationError(`Malformed save: colonists.${id}.residenceId`);
        }
        if (value['id'] !== id) {
            throw new SaveValidationError(`Malformed save: colonist key/id mismatch for ${id}`);
        }
        validatedColonists[id] = value;
    }
    const state = {
        config: {
            world: {
                seed: world['seed'],
                width: world['width'],
                height: world['height'],
            },
        },
        time: { tick: time['tick'] },
        buildings: validatedBuildings,
        colonists: validatedColonists,
        counters: {
            nextBuildingId: counters['nextBuildingId'],
            nextColonistId: counters['nextColonistId'],
        },
    };
    // Round-trip consistency: re-serializing the validated state must match,
    // otherwise the save contained fields the validator dropped.
    if (canonicalJson(state) !== canonicalJson(raw)) {
        throw new SaveValidationError('Malformed save: state contains unexpected fields');
    }
    return state;
};
//# sourceMappingURL=save.js.map