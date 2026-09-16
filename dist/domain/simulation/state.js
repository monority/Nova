/**
 * Canonical simulation state (docs/22-canonical-simulation.md).
 *
 * One authoritative state. Contains only what is needed to reproduce and
 * advance the world. No rendering, UI or platform data.
 *
 * Determinism rules:
 * - entity maps are Records; all iteration must be sorted (housing.ts);
 * - IDs come from canonical counters, never from randomness;
 * - simulation time is explicit, never wall-clock.
 */
export const createInitialState = (config) => {
    assertValidConfig(config);
    return {
        config,
        time: { tick: 0 },
        buildings: {},
        colonists: {},
        counters: { nextBuildingId: 1, nextColonistId: 1 },
    };
};
const assertValidConfig = (config) => {
    const { world } = config;
    if (!Number.isInteger(world.width) || world.width < 1) {
        throw new Error('world.width must be a positive integer');
    }
    if (!Number.isInteger(world.height) || world.height < 1) {
        throw new Error('world.height must be a positive integer');
    }
    if (world.seed.length === 0) {
        throw new Error('world.seed must be a non-empty string');
    }
};
export const makeBuildingId = (n) => `building-${n}`;
export const makeColonistId = (n) => `colonist-${n}`;
export const createBuilding = (state, type, x, y, constructionTicks) => {
    const id = makeBuildingId(state.counters.nextBuildingId);
    const building = {
        id,
        type,
        x,
        y,
        status: 'underConstruction',
        constructionRemaining: constructionTicks,
    };
    return {
        buildingId: id,
        state: {
            ...state,
            buildings: { ...state.buildings, [id]: building },
            counters: { ...state.counters, nextBuildingId: state.counters.nextBuildingId + 1 },
        },
    };
};
export const createColonist = (state, residenceId) => {
    const id = makeColonistId(state.counters.nextColonistId);
    const colonist = { id, residenceId };
    return {
        colonistId: id,
        state: {
            ...state,
            colonists: { ...state.colonists, [id]: colonist },
            counters: { ...state.counters, nextColonistId: state.counters.nextColonistId + 1 },
        },
    };
};
//# sourceMappingURL=state.js.map