/**
 * Simulation phases (docs/11-time-and-events.md).
 *
 * Phase order is part of the simulation contract. Step 0 order:
 *
 *   1. applyCommand       - player placement (validated, deterministic)
 *   2. advanceConstruction- construction progress -> operational
 *   3. updatePopulation   - colonist arrives iff housing capacity exists
 *   4. advanceTime        - tick += 1
 *
 * Every phase is a pure function: (state, ...) -> new state.
 * No phase mutates its input. No phase depends on rendering, UI,
 * wall-clock time or randomness.
 */
import { BUILDING_CATALOG } from '../building/building.js';
import { availableResidenceIds, iterateBuildings, } from '../housing/housing.js';
import { isInBounds } from '../world/grid.js';
import { createBuilding, createColonist, } from './state.js';
// ---------------------------------------------------------------------------
// Phase 1 - Apply player commands
// ---------------------------------------------------------------------------
/** A cell is occupied iff a building exists on it. */
export const isCellOccupied = (state, cell) => {
    for (const building of iterateBuildings(state)) {
        if (building.x === cell.x && building.y === cell.y) {
            return true;
        }
    }
    return false;
};
/**
 * Valid placement: known type, inside bounds, free cell.
 * Invalid command = explicit no-op (same canonical state), never an error
 * thrown across the phase boundary.
 */
export const applyCommand = (state, command) => {
    if (command === undefined) {
        return { state, accepted: false, reason: null };
    }
    switch (command.type) {
        case 'placeBuilding': {
            const cell = { x: command.x, y: command.y };
            if (BUILDING_CATALOG[command.buildingType] === undefined) {
                return { state, accepted: false, reason: 'unknownBuildingType' };
            }
            if (!isInBounds(state.config.world, cell)) {
                return { state, accepted: false, reason: 'outOfBounds' };
            }
            if (isCellOccupied(state, cell)) {
                return { state, accepted: false, reason: 'cellOccupied' };
            }
            const definition = BUILDING_CATALOG[command.buildingType];
            const created = createBuilding(state, command.buildingType, cell.x, cell.y, definition.constructionTicks);
            return { state: created.state, accepted: true, reason: null };
        }
    }
};
// ---------------------------------------------------------------------------
// Phase 2 - Construction / lifecycle
// ---------------------------------------------------------------------------
/** progressConstruction is pure; remaining reaches 0 => operational. */
export const progressOneBuilding = (building) => {
    if (building.status === 'operational') {
        return building;
    }
    const remaining = building.constructionRemaining - 1;
    if (remaining < 0) {
        throw new Error(`Construction below zero for ${building.id}`);
    }
    if (remaining === 0) {
        return { ...building, status: 'operational', constructionRemaining: 0 };
    }
    return { ...building, constructionRemaining: remaining };
};
export const advanceConstruction = (state) => {
    const nextBuildings = {};
    let changed = false;
    for (const building of iterateBuildings(state)) {
        const progressed = progressOneBuilding(building);
        nextBuildings[building.id] = progressed;
        if (progressed !== building) {
            changed = true;
        }
    }
    if (!changed) {
        return state;
    }
    return { ...state, buildings: nextBuildings };
};
// ---------------------------------------------------------------------------
// Phase 3 - Population / housing admission
// ---------------------------------------------------------------------------
/**
 * A colonist is created only when an operational residence without a
 * resident exists (docs/07: first colonist appears only when valid housing
 * capacity exists). Residences are consumed in ascending id order.
 */
export const updatePopulation = (state) => {
    let nextState = state;
    let pendingCapacity = availableResidenceIds(nextState);
    while (pendingCapacity.length > 0) {
        const residenceId = pendingCapacity[0];
        if (residenceId === undefined) {
            break;
        }
        nextState = createColonist(nextState, residenceId).state;
        pendingCapacity = availableResidenceIds(nextState);
    }
    return nextState;
};
// ---------------------------------------------------------------------------
// Phase 4 - Advance simulation time
// ---------------------------------------------------------------------------
/** Simulation time is canonical state, never wall-clock (docs/11). */
export const advanceTime = (state) => ({
    ...state,
    time: { tick: state.time.tick + 1 },
});
//# sourceMappingURL=phases.js.map