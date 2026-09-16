/**
 * Deterministic canonical serialization + hashing (docs/22, docs/31).
 *
 * - canonicalJson: stable key ordering, no locale/format drift.
 * - hash: FNV-1a 64-bit (BigInt), printed as fixed-width hex.
 *
 * Adding a simulation-critical field automatically changes the hash; that
 * is intended (schema change => save version bump, docs/22 migration rule).
 */
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Stable serialization: object keys sorted, arrays kept in order. */
export const canonicalJson = (value) => {
    if (value === null)
        return 'null';
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'number':
            return Number.isFinite(value)
                ? JSON.stringify(value)
                : (() => { throw new Error(`Non-finite number not canonical: ${value}`); })();
        case 'boolean':
            return value ? 'true' : 'false';
        case 'object':
            break;
        default:
            throw new Error(`Value not canonically serializable: ${String(value)}`);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (isPlainObject(value)) {
        const entries = Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
        return `{${entries.join(',')}}`;
    }
    throw new Error(`Value not canonically serializable: ${String(value)}`);
};
/** FNV-1a 64-bit over UTF-16 code units of the string. Pure, deterministic, environment-independent. */
export const fnv1a64 = (input) => {
    const prime = 0x100000001b3n;
    let hash = 0xcbf29ce484222325n;
    for (let i = 0; i < input.length; i++) {
        hash ^= BigInt(input.charCodeAt(i));
        hash = (hash * prime) & 0xffffffffffffffffn;
    }
    return hash.toString(16).padStart(16, '0');
};
/** Canonical JSON of the full canonical state. */
export const serializeCanonicalState = (state) => canonicalJson(state);
/** Deterministic canonical state hash. Same state => same hash. */
export const hashCanonicalState = (state) => fnv1a64(serializeCanonicalState(state));
//# sourceMappingURL=hash.js.map