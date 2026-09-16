/**
 * Building domain model.
 *
 * Lifecycle (docs/06-construction.md):
 *   placement -> under_construction -> operational
 *
 * Construction is not operation: a building only contributes housing
 * capacity once operational. No economic/material costs in Step 0.
 */
/**
 * Deterministic building catalog. Part of the simulation contract:
 * changing a value here is a simulation-behavior change.
 */
export const BUILDING_CATALOG = {
    residence: { constructionTicks: 2, housingCapacity: 1 },
};
export const getBuildingDefinition = (type) => {
    const definition = BUILDING_CATALOG[type];
    if (definition === undefined) {
        throw new Error(`Unknown building type: ${type}`);
    }
    return definition;
};
//# sourceMappingURL=building.js.map