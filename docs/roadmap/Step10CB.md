# NOVA — Step 10CB — Full Repository Cleanup, Performance & Refactor Audit

## Baseline

* Previous step: `Step 10CA — Next Gameplay Pressure Audit`
* Expected baseline: the latest commit produced by 10CA
* SAVE_VERSION: must remain unchanged unless a pre-existing inconsistency is discovered; do not modify it as part of cleanup.

---

# Objective

Perform a **full repository cleanup, dead-code audit, performance audit, and behavior-preserving refactor** of NOVA.

The goal is to leave the repository in a clean, coherent, maintainable, production-quality state before the next gameplay implementation phase.

This is a **maintenance / quality step only**.

No gameplay feature is to be designed or added.

No simulation rule is to be changed intentionally.

No UI concept is to be introduced.

No architecture rewrite is allowed.

---

# 1. Absolute behavior-preservation rule

The most important constraint:

> The final application must behave exactly as it did before this step.

Allowed:

* deleting genuinely dead code;
* deleting genuinely unused files;
* deleting genuinely unused folders;
* removing unused dependencies;
* removing unused imports;
* removing obsolete comments;
* removing obsolete compatibility code;
* consolidating duplicated implementation;
* simplifying unnecessarily complex code;
* improving types;
* improving internal naming;
* extracting small reusable functions where this clearly improves maintainability;
* performance improvements that preserve behavior;
* test improvements;
* documentation cleanup;
* formatting cleanup;
* repository hygiene.

Not allowed:

* new gameplay;
* changed resource coefficients;
* changed production rules;
* changed workforce behavior;
* changed progression behavior;
* changed road/accessibility behavior;
* changed save format;
* changed hashing semantics;
* changed tick semantics;
* changed command semantics;
* changed UI behavior intentionally;
* new abstractions without concrete justification;
* speculative architecture;
* broad rewrites;
* changing public APIs merely for style;
* replacing working systems with different implementations solely because they are aesthetically preferable.

If something appears questionable but changing it could alter behavior, **leave it alone and document it**.

---

# 2. First: establish a clean baseline

Before modifying anything:

1. Inspect `git status`.
2. Record the current commit.
3. Inspect recent commits.
4. Inspect repository structure.
5. Inspect package manager configuration.
6. Inspect scripts.
7. Inspect TypeScript configuration.
8. Inspect test configuration.
9. Inspect Playwright configuration.
10. Inspect build configuration.
11. Inspect ESLint configuration.
12. Inspect existing roadmap/documentation conventions.
13. Run the existing baseline validation.

At minimum:

* full Vitest;
* typecheck;
* lint;
* build;
* existing relevant E2E if practical.

Record exact baseline results.

Do not clean user-owned files simply because they are untracked.

---

# 3. Git / dirty-state audit

Identify every dirty/untracked/ignored artifact.

Classify each as:

### A — Required tracked project file

Keep.

### B — Legitimate user-owned untracked file

Do not touch.

### C — Generated artifact

Candidate for deletion if safely reproducible and not intentionally retained.

### D — Temporary/debug artifact

Candidate for deletion.

### E — Obsolete roadmap/documentation artifact

Candidate for deletion only if clearly obsolete and not user-owned.

### F — Unknown

Do not delete.

Never delete files merely because they are untracked.

---

# 4. User-owned files

These files are explicitly protected:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

They must remain:

* untouched;
* unmodified;
* uncommitted;
* untracked.

Do not rename, move, delete, stage, or format them.

If other user-owned artifacts are discovered, preserve them unless their ownership and deletion intent are unambiguous.

---

# 5. Dead code audit

Perform a systematic dead-code audit.

Inspect:

* unused functions;
* unused classes;
* unused types;
* unused interfaces;
* unused constants;
* unused enums;
* unused exports;
* unused imports;
* unreachable branches;
* obsolete feature flags;
* stale compatibility paths;
* abandoned prototypes;
* old implementations superseded by newer ones;
* duplicate domain helpers;
* duplicate application helpers;
* unused rendering helpers;
* unused UI components;
* unused hooks;
* unused test utilities;
* obsolete fixtures.

Use actual references/search/type information.

Do not infer that something is dead solely because it is not imported from one obvious location.

Check:

* dynamic imports;
* route discovery;
* test discovery;
* Vite entry points;
* Playwright usage;
* package scripts;
* configuration references;
* documentation tooling;
* generated registries;
* string-based lookups.

Delete only when confident.

---

# 6. Dead files and dead folders

Audit the entire repository tree.

Look for:

* abandoned source files;
* duplicate files;
* obsolete experiments;
* empty directories;
* stale snapshots;
* temporary scripts;
* generated output;
* old migration artifacts;
* obsolete test fixtures;
* abandoned prototypes;
* unused assets;
* redundant documentation;
* obsolete roadmap copies.

For every deletion, establish why the file/folder is dead.

Do not delete historical documentation merely because it is old.

Do not delete user-owned files.

Do not clean `.gitignore` patterns unless you verify they are obsolete.

---

# 7. Dependency audit

Inspect `package.json` and lockfile.

Identify:

* unused runtime dependencies;
* unused dev dependencies;
* duplicate packages;
* packages only required by dead code;
* obsolete tooling;
* redundant utilities;
* unnecessary polyfills.

Before removing a dependency:

1. search the repository;
2. inspect scripts/configuration;
3. inspect dynamic usage;
4. run typecheck/lint/build/tests after removal.

Do not perform dependency upgrades unless strictly necessary for cleanup.

This is not a dependency modernization project.

---

# 8. Architecture audit

Inspect the current domain/application/rendering/UI boundaries.

Verify:

* domain does not depend on React/browser concerns;
* simulation does not depend on rendering;
* rendering does not become authoritative simulation state;
* UI does not directly mutate domain state outside intended application boundaries;
* persistence remains separated from gameplay rules;
* derived queries remain pure;
* commands remain explicit;
* tests do not introduce production-only shortcuts.

Look for:

* circular dependencies;
* suspicious imports;
* duplicated business rules;
* logic living in the wrong layer;
* UI-specific business logic;
* rendering-specific simulation logic;
* excessive coupling.

Fix only concrete issues.

Do not create a large dependency-injection framework, service layer, repository layer, event bus, ECS, or other abstraction merely because it is theoretically cleaner.

---

# 9. Refactor audit

Find code that is unnecessarily:

* duplicated;
* deeply nested;
* difficult to reason about;
* overly generic;
* overly abstract;
* mutation-heavy;
* dependent on incidental ordering;
* difficult to test;
* difficult to type safely.

Prefer:

* small pure functions;
* explicit data flow;
* existing domain vocabulary;
* narrow responsibilities;
* deterministic iteration;
* simple types;
* existing architectural patterns.

Avoid:

* premature abstractions;
* generic helper factories;
* unnecessary classes;
* wrapper-on-wrapper APIs;
* excessive indirection;
* "cleanup" that makes simple code harder to understand.

A refactor is justified only if it materially improves:

* correctness;
* maintainability;
* readability;
* determinism;
* performance;
* testability.

---

# 10. Simulation code audit

Inspect the core simulation for unnecessary work.

Pay particular attention to:

* repeated scans over colonists;
* repeated scans over buildings;
* repeated computation of the same derived information;
* unnecessary allocations per tick;
* repeated filtering/mapping chains in hot paths;
* repeated object cloning;
* redundant hashing;
* unnecessary serialization;
* repeated lookup construction;
* avoidable sorting;
* nested loops over independent collections.

Do not optimize blindly.

Measure or reason from concrete hot paths.

Do not introduce caches that can become stale unless their invalidation semantics are unquestionably correct.

Do not change the deterministic result.

---

# 11. Rendering performance audit

Inspect the Three.js/WebGL2 rendering path.

Look for:

* unnecessary per-frame allocations;
* object creation inside render loops;
* unnecessary geometry recreation;
* unnecessary material recreation;
* redundant scene traversal;
* repeated DOM queries;
* unnecessary React rerenders;
* unstable props causing avoidable rerenders;
* unnecessary state updates;
* resource leaks;
* textures/geometries/materials that are recreated unnecessarily;
* event listeners that are repeatedly attached;
* animation loops that survive component teardown.

Do not redesign the renderer.

Do not change visual output intentionally.

Do not lower visual quality to claim a performance improvement.

---

# 12. React/UI performance audit

Inspect:

* component rerender frequency;
* derived values recalculated unnecessarily;
* unstable callbacks/objects where relevant;
* expensive computations inside render;
* unnecessary state duplication;
* effects with incorrect dependencies;
* effects that can be replaced by pure derivation;
* event listeners;
* resize handling;
* viewport handling;
* inspector updates;
* simulation-to-UI synchronization.

Use memo

---

# Documentation (as-built)

## Baseline and scope

Baseline was `85b03ff`, with `SAVE_VERSION = 8`. Step 10CB was maintenance-only. No gameplay, command, resource, building, progression, UI, or persistence behavior was intentionally changed.

## Repository audit

- All declared runtime/dev dependencies are used.
- All E2E package scripts point to existing modules.
- All source modules are reachable from the public barrel or application entry.
- Domain/simulation code has no app/renderer/Three/React imports.
- The ignored `.kilo/worktrees` tree was preserved and excluded from ESLint scope.
- One genuinely dead module was removed: `src/application/queries/roads.ts`. It was not exported, imported, dynamically loaded, or used by tests; its domain functionality remains available through the existing road domain/query paths.

## Performance and refactor findings

No concrete hot-path defect justified a production optimization. Existing sorted iteration, derived queries, renderer reconciliation, and UI updates were retained. No dependency was removed because all declared packages have active consumers/config usage. No speculative cache, service layer, or architectural rewrite was added.

## Behavior preservation

- Full Vitest: 1,706 / 1,707 PASS.
- One unrelated existing timeout remains in `productionRatioTuningAudit.test.ts` (`Town candidate gate`).
- Typecheck: PASS.
- Lint: PASS after excluding the preserved `.kilo/` tool tree.
- Build: PASS.
- Focused cleanup audit: 4 PASS.
- Relevant compatibility set: 61 PASS.
- `git diff --check`: PASS.
- Browser/GPU: not required; no runtime/UI/rendering change.

## Files changed

- `docs/roadmap/Step10CB.md`
- `tests/repositoryCleanupAudit.test.ts`
- `eslint.config.js`
- deleted `src/application/queries/roads.ts`

## Scope confirmation

No new gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced. The only production-tree change was deletion of a proven-dead query module and a lint-scope exclusion for an existing ignored tool worktree.

## Commit

`1aa5193` — Step 10CB: audit repository cleanup
