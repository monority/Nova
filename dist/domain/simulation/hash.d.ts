/**
 * Deterministic canonical serialization + hashing (docs/22, docs/31).
 *
 * - canonicalJson: stable key ordering, no locale/format drift.
 * - hash: FNV-1a 64-bit (BigInt), printed as fixed-width hex.
 *
 * Adding a simulation-critical field automatically changes the hash; that
 * is intended (schema change => save version bump, docs/22 migration rule).
 */
import type { SimulationState } from './state.js';
/** Stable serialization: object keys sorted, arrays kept in order. */
export declare const canonicalJson: (value: unknown) => string;
/** FNV-1a 64-bit over UTF-16 code units of the string. Pure, deterministic, environment-independent. */
export declare const fnv1a64: (input: string) => string;
/** Canonical JSON of the full canonical state. */
export declare const serializeCanonicalState: (state: SimulationState) => string;
/** Deterministic canonical state hash. Same state => same hash. */
export declare const hashCanonicalState: (state: SimulationState) => string;
