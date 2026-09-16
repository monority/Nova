# NOVA — Determinism & Verification Contract

## Determinism invariant

For a fixed simulation version:

```text
same initial canonical state
+ same ordered commands
+ same deterministic configuration
= same canonical final state
```

Therefore the canonical state hash must be reproducible.

## Sources of nondeterminism to avoid

Never use simulation-critical:

- `Math.random()` without a controlled seed;
- wall-clock time;
- frame rate;
- browser state;
- network responses;
- unordered object/key iteration when order affects outcomes;
- unstable IDs;
- renderer ordering;
- GPU results;
- locale-dependent sorting.

If randomness is eventually required, use an explicit seeded RNG whose state is part of canonical simulation state or otherwise reproducible from canonical inputs.

## Stable ordering

When multiple candidates are valid, define a deterministic tie-break.

Typical pattern:

```text
primary score
→ secondary score
→ stable coordinate
→ stable entity ID
```

Never rely on insertion order unless insertion order itself is an explicit canonical rule.

## Simulation verification ladder

Every simulation feature should be verified at the lowest useful level first.

### Level 1 — Static inspection

Confirm:

- correct layer;
- no forbidden imports;
- no duplicate source of truth;
- no unrelated feature creep.

### Level 2 — Unit tests

Test pure domain behavior and invariants.

### Level 3 — Simulation integration

Run a deterministic scenario across several ticks and assert state transitions.

### Level 4 — Deterministic repeat

Run the same scenario twice and compare canonical state/hash.

### Level 5 — Persistence

For persisted systems:

```text
state A
→ save
→ load
→ state B
```

Then compare canonical equivalence.

### Level 6 — UI/query verification

Verify that queries and inspection expose the authoritative state correctly.

### Level 7 — Browser/E2E

Use browser verification for interaction/rendering concerns.

Browser verification must not replace domain tests.

## Required commands

Use the repository's actual scripts. Where available:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
npx madge --circular --extensions ts src
```

Do not invent commands that do not exist in the repository.

## WebGL/GPU limitation

A browser/WebGL stall is an infrastructure verification problem, not a reason to weaken domain invariants or alter simulation code.

If browser verification is blocked:

- report it;
- keep domain/integration verification running;
- do not claim visual verification succeeded;
- do not modify architecture merely to hide the failure.

## Behavioral scenario requirement

For a meaningful simulation feature, the final report should include a concrete before/after scenario, for example:

```text
Initial:
house = under_construction
capacity = 0
colonists = 0

Tick 1:
house = under_construction
capacity = 0

Tick 2:
house = operational
capacity = 1

Next eligible population phase:
colonist = created
residence = house
```

The exact scenario depends on the feature.

## Completion report

Every implementation report should contain:

```text
Implementation
- what changed
- files changed

Behavior
- expected causal chain
- observed result

Verification
- targeted tests
- full tests
- typecheck
- lint
- build
- deterministic repeat
- persistence/E2E if relevant

Invariants verified
- ...

Not verified / blocked
- ...

Regressions
- ...

Status
COMPLETE | PARTIAL | BLOCKED
```

Never use `COMPLETE` when a required acceptance criterion remains unverified.
