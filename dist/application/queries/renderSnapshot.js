/**
 * Render snapshot projection (docs/14-rendering-architecture.md).
 *
 * canonical state -> projection -> renderer.
 * The snapshot is derived: it never mutates canonical state and never
 * becomes a second source of truth.
 */
import { iterateBuildings, iterateColonists } from '../../domain/housing/housing.js';
export const toRenderSnapshot = (state) => ({
    tick: state.time.tick,
    world: {
        width: state.config.world.width,
        height: state.config.world.height,
    },
    buildings: [...iterateBuildings(state)].map((b) => ({
        id: b.id,
        type: b.type,
        x: b.x,
        y: b.y,
        status: b.status,
    })),
    colonists: [...iterateColonists(state)].map((c) => ({
        id: c.id,
        residenceId: c.residenceId,
    })),
});
//# sourceMappingURL=renderSnapshot.js.map