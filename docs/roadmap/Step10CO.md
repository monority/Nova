# NOVA — Step 10CO: Foundation Release Readiness Gate

## Mission

NOVA has now completed and frozen its current foundation phase.

The repository currently contains a deterministic colony-management foundation centered on:

- constrained 12×12 spatial planning;
- Farm / Well / Workshop production;
- Food / Water / Material economy;
- manual workforce allocation;
- road networks and building accessibility;
- Town progression;
- Town workforce review;
- 11 authored scenarios;
- deterministic save/load and hashing;
- contract/invariant coverage;
- responsive browser coverage;
- headed GPU/WebGL2 validation.

However, this does **not** mean NOVA is finished.

The original product vision and broader roadmap extend substantially beyond the current Town/foundation phase.

The purpose of this step is therefore **not to invent another mechanic** and **not to declare the whole game complete**.

The purpose is to establish whether the current foundation is sufficiently solid, coherent, and shippable as the technical/product base from which the remaining roadmap can continue.

This is a concrete release-readiness gate.

---

# 1. Read the project history first

Before changing anything, inspect:

- the current repository state;
- the roadmap;
- the product/design documentation;
- `docs/roadmap/Step10CN.md`;
- `docs/roadmap/Step10CK.md`;
- `docs/roadmap/Step10CJ.md`;
- `docs/roadmap/Step10CI.md`;
- `docs/roadmap/Step10CF.md`;
- `docs/roadmap/Step10CA.md`;
- the current scenario catalogue;
- the current save/load implementation;
- the current application entry points;
- the current browser/E2E infrastructure.

Do not assume the project is near completion merely because the foundation is frozen.

Explicitly reconstruct:

1. what has actually been implemented;
2. what the current playable product can actually do;
3. what remains on the broader roadmap;
4. which parts of the vision are intentionally future work;
5. which remaining roadmap items depend on the current foundation.

The distinction between **foundation complete** and **game complete** must remain explicit throughout this step.

---

# 2. Establish the actual current product boundary

Describe the current playable experience from a clean start:

```text
Start
→ Wilderness
→ early settlement
→ workforce allocation
→ economy balancing
→ roads/accessibility
→ Village
→ Town
→ scenario completion
```

Verify this from the actual application rather than documentation alone.

Determine:

- what the player can currently do;
- what decisions are actually available;
- what the player cannot yet do;
- where the current authored experience ends;
- whether the current endpoint is understandable;
- whether the product communicates that this is a foundation/phase boundary rather than the entirety of NOVA.

Do not add new gameplay to solve this.

---

# 3. Production build verification

Run the real production build path.

Verify:

- clean dependency installation assumptions;
- production build;
- generated artifact;
- application startup from the production artifact;
- no development-only dependency accidentally required at runtime;
- no missing assets;
- no broken imports;
- no runtime exceptions;
- no unexpected network dependency;
- no console errors during the core journey.

If the repository has a documented deployment/start command, use it.

If there is no documented production path, record that as a concrete release-readiness finding.

Do not invent a deployment platform.

---

# 4. Clean-start player journey

Test the actual game as a new player.

Use a fresh state and verify:

### Initial state

- application loads;
- world renders;
- controls are understandable;
- available actions are discoverable;
- no stale state leaks into the session.

### Early settlement

Verify that a new player can reasonably understand:

- how to place buildings;
- what Farm / Well / Workshop do;
- how workers are assigned;
- how production changes;
- how roads affect accessibility;
- what causes actions to be rejected.

### Village → Town

Verify the complete current progression.

### Town scenarios

Exercise all 11 scenarios at catalogue level and all 3 Town scenarios sufficiently to verify that:

- they are selectable;
- their starting states are valid;
- their objectives are reachable;
- completion is correctly detected;
- the player receives a clear completion signal;
- completion does not corrupt or trap the application.

Do not redesign the scenario system.

---

# 5. Save / load / restart readiness

Verify the real player lifecycle:

```text
new game
→ build
→ allocate workers
→ tick
→ save
→ reload
→ continue
```

Also verify:

- reload after Town;
- scenario state preservation;
- deterministic continuation;
- hash consistency;
- restart/new-game behavior;
- malformed or invalid save handling if such handling already exists.

Do not add new persistence fields.

Do not increment `SAVE_VERSION`.

If the current implementation intentionally does not support a lifecycle operation, document the concrete limitation instead of inventing a feature.

---

# 6. Error and rejection UX

Audit actual rejected actions.

At minimum inspect:

- invalid building placement;
- insufficient material;
- invalid worker reassignment;
- inaccessible building;
- invalid road placement;
- invalid progression action;
- invalid scenario interaction where applicable.

For each rejection, determine:

1. Is the command correctly rejected?
2. Does simulation state remain unchanged?
3. Does the UI provide enough feedback?
4. Can the player understand what blocked the action?
5. Is the behavior consistent with the rest of the product?

Only classify something as a release blocker if the defect materially prevents understanding or progression.

Do not redesign the error system globally.

---

# 7. Responsive verification

Run the real application at:

- `1280×800`
- `420×740`
- `360×640`

Verify the complete currently supported journey.

Check:

- no horizontal overflow;
- no clipped essential controls;
- no inaccessible primary actions;
- no broken inspector/panel behavior;
- scenario catalogue remains usable;
- Town completion remains understandable;
- no critical information disappears;
- no browser console errors.

Do not add a generic responsive framework.

Fix only concrete defects if they are genuinely release-blocking.

---

# 8. Accessibility baseline

Perform a practical accessibility pass over the current product.

Inspect at minimum:

- keyboard reachability of interactive controls;
- focus visibility;
- semantic buttons versus non-interactive elements;
- labels for important controls;
- readable contrast;
- text scaling/layout resilience;
- disabled/rejected state clarity;
- screen-reader-relevant labels where the current UI exposes important controls.

This is a baseline audit, not a complete WCAG certification.

Do not introduce an accessibility abstraction layer unless the existing architecture demonstrably requires one.

---

# 9. Performance and rendering stability

Measure the actual current application.

Check:

- startup;
- scene initialization;
- normal simulation interaction;
- scenario switching;
- building placement;
- road placement;
- workforce reassignment;
- prolonged ticking;
- save/load;
- production build behavior.

Look for:

- obvious frame instability;
- runaway allocations;
- repeated expensive derived calculations;
- unnecessary React rerenders;
- rendering leaks;
- accumulating event listeners;
- runaway timers;
- console warnings/errors.

Use the existing architecture and measurement tools.

Do not optimize speculative code.

Do not rewrite architecture based on theoretical concerns.

---

# 10. GPU / browser verification

Because NOVA already has a working headed GPU/WebGL2 verification path, run it.

Verify:

- headed browser;
- WebGL2;
- NVIDIA GPU path;
- actual scene rendering;
- no shader/runtime errors;
- no context loss;
- no browser console errors.

Record the detected GPU/runtime information.

Do not replace the existing GPU test with a software-rendering fallback.

---

# 11. Test-suite health

Run:

1. targeted release-readiness tests where appropriate;
2. relevant compatibility suites;
3. full Vitest suite;
4. typecheck;
5. lint;
6. production build.

The repository currently has known historical behavior where some expensive deterministic tests can exceed Vitest's default five-second timeout.

Do not misclassify a known deterministic timeout as a gameplay failure.

If such tests still exist, distinguish:

- genuine failure;
- timeout configuration;
- flaky behavior;
- deterministic expensive execution;
- unrelated pre-existing issue.

Do not globally increase timeouts.

---

# 12. Documentation and repository hygiene

Inspect:

- roadmap consistency;
- stale claims;
- dead documentation;
- stale source references;
- outdated SAVE_VERSION claims;
- scenario counts;
- outdated architecture descriptions;
- accidental debug files;
- generated files;
- temporary files;
- unnecessary dependencies;
- dead source code.

Do not perform a broad cleanup campaign.

Only correct concrete inconsistencies discovered during this release gate.

The user's existing untracked documents must remain untouched:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

---

# 13. Scope audit against the broader roadmap

This section is mandatory.

Produce a factual map:

| Area | Current state | Roadmap state |
|---|---|---|
| Core simulation | implemented/frozen | foundation |
| Workforce | implemented/frozen | foundation |
| Economy | implemented/frozen | foundation |
| Roads/accessibility | implemented/frozen | foundation |
| Village | implemented | foundation |
| Town | implemented | foundation phase boundary |
| Scenarios | 11 implemented | current authored content |
| Growth | intentionally absent | future |
| Post-Town systems | intentionally absent | future |
| World/external systems | intentionally absent | future |
| Later settlement development | not implemented | future roadmap |
| Presentation/polish | current baseline | ongoing |
| Other roadmap phases | inspect actual roadmap | future |

Do not claim completion of roadmap items merely because the foundation enables them.

The purpose is to prevent the release gate from accidentally redefining the entire roadmap as complete.

---

# 14. Classify findings

Every finding must be classified into exactly one of:

### RELEASE BLOCKER

A concrete defect that currently prevents:

- starting the game;
- understanding a core action;
- progressing through the current experience;
- completing an existing scenario;
- saving/loading correctly;
- using the supported viewport;
- rendering reliably;
- or running the production build.

### HARDENING ISSUE

A real defect or technical weakness that does not block the current experience but should reasonably be corrected before using this foundation as the base for substantial future development.

### NON-BLOCKING IMPROVEMENT

A legitimate improvement that is not required for release-readiness of the current foundation.

### FUTURE ROADMAP

Something intentionally absent because it belongs to the unfinished broader NOVA roadmap.

Do not turn future roadmap work into release blockers.

---

# 15. Decision gate

At the end, produce exactly one of:

## FOUNDATION-READY

The current foundation is sufficiently solid to continue the broader roadmap.

## HARDEN

Concrete hardening work should be performed before continuing the broader roadmap.

## BLOCKED

A concrete defect prevents the current foundation from being considered a usable base.

Do not rank or score findings.

Do not invent a quality score.

Do not declare the entire game finished.

---

# 16. Implementation rule

This step is primarily a **release-readiness gate**, not a feature-development step.

If there are no RELEASE BLOCKER or meaningful HARDENING issues:

**make no product-code changes.**

If a concrete release blocker is discovered:

- fix only that blocker;
- add the smallest appropriate regression test;
- do not introduce new gameplay;
- do not alter the simulation contract;
- do not alter progression semantics;
- do not add new resources/buildings/mechanics;
- do not change SAVE_VERSION unless absolutely unavoidable, and if so stop and report it rather than improvising.

If multiple independent blockers exist, fix only blockers necessary to establish foundation readiness.

Do not start the next roadmap phase inside this step.

---

# 17. Mandatory anti-scope-creep rules

Do NOT:

- invent a new gameplay mechanic;
- add City;
- add post-Town growth;
- add money;
- add transport;
- add trade;
- add factions;
- add external settlements;
- add quests;
- add automation;
- add timers;
- add new resource sinks;
- add population systems;
- add a new progression stage;
- redesign the scenario system;
- redesign the UI merely for taste;
- rewrite architecture;
- perform speculative optimization;
- change simulation coefficients;
- change SAVE_VERSION;
- reopen 10CA/10CL/10CM/10CN conclusions without concrete evidence.

The broader roadmap remains intact.

This step exists to ensure the foundation is strong enough to support that roadmap.

---

# 18. Required documentation

Create:

```text
docs/roadmap/Step10CO.md
```

The document must contain:

1. Mission
2. Current product boundary
3. Broader roadmap context
4. Production build result
5. Clean-start journey result
6. Scenario verification
7. Save/load result
8. Error/rejection audit
9. Responsive result
10. Accessibility baseline
11. Performance result
12. GPU/WebGL2 result
13. Test-suite result
14. Repository/documentation hygiene
15. Release blockers
16. Hardening issues
17. Non-blocking improvements
18. Future roadmap items
19. Final decision:
   - FOUNDATION-READY
   - HARDEN
   - BLOCKED
20. Exact scope of any code changes
21. Validation performed
22. Final diff audit

Make clear that:

> FOUNDATION-READY means the current foundation is ready to serve as the base for the remaining NOVA roadmap. It does not mean NOVA itself is feature-complete.

---

# 19. Required tests

If no product-code changes are made, do not manufacture large test suites merely for this step.

Add focused regression tests only when the audit exposes a concrete defect or lifecycle contract that benefits from permanent coverage.

Existing tests remain authoritative for:

- simulation contracts;
- economy;
- workforce;
- roads;
- progression;
- scenarios;
- determinism;
- save/load.

---

# 20. Required final validation

Before declaring the step complete, run the applicable:

- focused tests;
- relevant compatibility tests;
- full Vitest;
- typecheck;
- lint;
- production build;
- headed browser journey;
- responsive browser verification;
- GPU/WebGL2 verification;
- console-error check;
- final git diff/status audit.

If a validation is intentionally skipped because no relevant runtime/code change occurred, state why.

Do not claim a validation passed unless it was actually run.

---

# 21. Final report

Return a concise but complete final report containing:

### Decision

`FOUNDATION-READY`, `HARDEN`, or `BLOCKED`

### What was verified

Bullet list.

### Concrete blockers

Bullet list, or `None`.

### Hardening issues

Bullet list, or `None`.

### Future roadmap

Explicitly state that the broader NOVA roadmap remains unfinished and list the major future areas discovered from the actual roadmap.

### Changes

Exact files changed and why.

### Validation

Exact results.

### Commit

If the work is complete and the repository is clean:

```text
Step 10CO: Foundation Release Readiness Gate
```

Commit the changes.

Do NOT push.

---

## Critical interpretation

Do not confuse:

```text
Foundation frozen
```

with:

```text
Game finished
```

The current goal is to make the existing foundation trustworthy enough that the project can move back onto its **larger roadmap** without accumulating avoidable technical/product debt.

If the foundation is ready, the correct outcome is not another audit loop.

The correct outcome is:

> **Foundation validated → return to the broader NOVA roadmap.**

Only concrete evidence discovered during this gate may justify additional hardening before that transition.


--
- Pre-existing chunk-size warning (not introduced by this step) left as cosmetic.

## 15. Release blockers

**None.**

No defect prevents: starting the game, understanding a core action, progressing through the current experience, completing an existing scenario, saving/loading correctly, using the supported viewport, rendering reliably, or running the production build.

## 16. Hardening issues

**None rising to the 10CO gate threshold.** Two observations below are intentionally non-blocking improvements, not hardening blockers:

### Non-blocking improvement 1 — Canvas a11y label
`#nova-canvas` has no `role` or `aria-label`. The current input model is mouse/touch-driven; keyboard users do not interact with the canvas directly. Adding a label would improve screen-reader discoverability and is zero-cost. Not a blocker.

### Non-blocking improvement 2 — Placement rejection clarity
When a second building is placed on an occupied cell, the status line shows the existing building ("Residence building-1 — Under construction") rather than an explicit "cell occupied" message. The player can infer the rejection from the unchanged state; the message is not misleading. Not a blocker.

Both items are future-improvement candidates only if evidence later shows they impede understanding at scale.

## 17. Non-blocking improvements catalogued

Only the two observations above qualify; both are already classified as non-blocking.

## 18. Future roadmap items (explicitly NOT completed)

- Growth mechanics (deferred by 10CL, deferred by 10CM).
- Post-Town continuation systems (deferred by 10CN).
- World/external context (deferred by 10CM).
- Transport, technology, money, urban growth (future roadmap phases per `docs/26-roadmap.md`, unstarted).
- Scene/polish enhancements (future workstream).
- Any other phase beyond Foundation listed in the broader roadmap.

**Foundation readiness ≠ game completion.** The broader roadmap remains unfinished.

## 19. Final decision

```text
FOUNDATION-READY
```

The current foundation is sufficiently solid, coherent, and shippable as the technical/product base from which the remaining NOVA roadmap can continue.

Not due to perfection, but because:
- deterministic simulation is frozen and contract-covered;
- the playable chain from Wilderness through Town completes correctly;
- all 11 scenarios load, run, and complete canonically;
- save/load and hash invariants hold;
- responsive and GPU paths are clean;
- no release blockers or hardening issues were found;
- typecheck/lint/build pass;
- performance is within acceptable bounds;
- the broader roadmap remains explicitly open and unfrozen.

## 20. Exact scope of any code changes

**None.** This gate introduced zero production changes, zero new gameplay, and zero new persisted state. The only artifacts are documentation; the throwaway browser audit script (`e2e/zz-coAudit.mjs`) was deleted after validation.

## 21. Validation performed

- Production build: `npm run build` → PASS.
- Headed E2E (existing `e2e/run.mjs`): ALL PASS (zero console/page errors).
- Headed GPU (existing `e2e/gpuRun.mjs`): ALL PASS (WebGL2, NVIDIA RTX 3070, ANGLE Direct3D11, hardware path).
- Audit script (`e2e/zz-coAudit.mjs`, throwaway, deleted): PASS — all 11 scenarios selectable with valid starts, viewport suite clean at 1280×800/420×740/360×640, save/load roundtrips, malformed rejection, 600-tick performance (2 ms), a11y counts (16 interactive, 0 unnamed).
- Typecheck: `npm run typecheck` → PASS.
- Lint: `npm run lint` → PASS.
- Full Vitest: 1746/1749 PASS, 105/108 test files PASS (3 known load-flake failures, all pass when isolated per 10CC precedent).
- `git diff --check`: clean.
- SAVE_VERSION: 8 (unchanged).
- User-owned files: confirmed present and untouched.

## 22. Final diff audit

Zero tracked-file modifications. Worktree clean before and after. Commit contains only the documentation file.

## Files changed

- `docs/roadmap/Step10CO.md` (prompt + this as-built; prompt requests `STEP10CO.md` but case-insensitive FS keeps a single file per prior convention)

## Commit

`c9e37ca` — Step 10CO: Foundation Release Readiness Gate
