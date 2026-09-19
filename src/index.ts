/**
 * NOVA foundation barrel (Step 0).
 * Domain: pure simulation, no platform/browser/rendering dependency.
 * Application: commands, queries, persistence.
 */
export * from './domain/simulation/state.js'
export * from './domain/simulation/command.js'
export * from './domain/simulation/step.js'
export * from './domain/simulation/hash.js'
export * from './domain/simulation/phases.js'
export * from './domain/world/grid.js'
export * from './domain/building/building.js'
export * from './domain/network/network.js'
export * from './domain/road/road.js'
export * from './domain/population/colonist.js'
export * from './domain/jobs/jobs.js'
export * from './domain/mobility/mobility.js'
export * from './domain/housing/housing.js'
export * from './domain/resource/resource.js'
export * from './application/commands/dispatch.js'
export * from './application/queries/renderSnapshot.js'
export * from './application/queries/inspection.js'
export * from './application/queries/resources.js'
export * from './application/queries/network.js'
export * from './application/persistence/save.js'
