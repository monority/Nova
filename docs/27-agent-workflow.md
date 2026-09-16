# NOVA — Agent Workflow

## Before coding

1. Read `README.md` and `00-CMD.md`.
2. Read the relevant product/domain/architecture documents.
3. Inspect the real repository rather than trusting documentation blindly.
4. Identify the current canonical state and existing implementation.
5. Identify overlap with previous systems.
6. Define the smallest coherent change.
7. Define acceptance criteria and verification before editing.

## During coding

- follow dependency direction;
- keep domain rules independent of UI/rendering;
- prefer pure functions for domain calculations;
- use stable IDs and explicit ordering;
- preserve existing validated behavior when compatible;
- do not introduce speculative abstractions;
- do not implement future roadmap items;
- do not perform unrelated refactors.

## Verification

At minimum for code changes:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For simulation changes, additionally verify:

- representative multi-tick scenario;
- deterministic repeat;
- canonical hash/state comparison;
- persistence if affected.

For browser/rendering changes, additionally run the repository's E2E/visual checks where available.

If a command does not exist, inspect `package.json` and use the actual project scripts.

## Browser/GPU failures

A known WebGL/Chromium stall must be reported as an infrastructure blocker. Do not fake visual validation, weaken tests, or change domain architecture to bypass it.

## Final report

```text
Status: COMPLETE | PARTIAL | BLOCKED

Implementation
- ...

Files changed
- ...

Behavior verified
- ...

Tests
- targeted: ...
- full: ...

Static validation
- typecheck: ...
- lint: ...
- build: ...

Determinism
- ...

Persistence
- ...

E2E / visual
- ...

Not verified / blockers
- ...

Regressions
- ...

Next step
- ...
```

Never claim `COMPLETE` if a required acceptance criterion was not verified.
