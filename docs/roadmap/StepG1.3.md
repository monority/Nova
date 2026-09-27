# Step G1.3 — Growth Communication & Capacity Signalling

## Objective

Complete the first G1 product phase by making the existing demand-driven settlement growth system understandable to the player through the smallest possible communication surface.

G1.1 introduced autonomous demand-driven Residence growth.

G1.2 made that growth spatially coherent and introduced the derived `GrowthBlocker` causal state.

The current system is mechanically coherent, but one product question remains:

> Can a player understand why NOVA is growing, or why growth has stopped, without inspecting developer-facing state?

G1.3 should answer that question.

This is a **communication and capacity-signalling slice**, not a new gameplay mechanic.

---

# 1. Read First

Read:

- `docs/roadmap/Step10DG.md`
- `docs/roadmap/StepG1.1.md`
- `docs/roadmap/StepG1.2.md`
- current growth implementation
- current `GrowthBlocker` query
- current HUD implementation
- current objective/status presentation
- current UX documentation
- current visual direction
- relevant browser tests
- existing product/readability audits

Inspect the actual implementation.

Do not infer the UI architecture from documentation alone.

---

# 2. Product Question

The player should be able to understand a simple causal chain:

```text
Growth is happening
        OR
Growth is waiting
        ↓
Why?
        ↓
What existing action can affect it?
```

For example:

```text
No housing pressure
Water shortage
No Water capacity
No eligible infrastructure
Insufficient Material
Not yet Town
```

Only expose information that already exists in the simulation.

Do not invent new causes.

---

# 3. Minimal Communication Surface

Investigate the existing HUD and status hierarchy.

Determine the smallest existing UI surface capable of communicating:

- growth ready / active;
- growth blocked;
- the current single `GrowthBlocker`.

Prefer:

- an existing status line;
- an existing objective/status area;
- an existing compact simulation-status region.

Do not add:

- a new modal;
- a notification system;
- a popup;
- a tooltip system;
- a growth panel;
- a dashboard;
- a dedicated growth menu.

The implementation should feel native to the current NOVA HUD.

---

# 4. One Cause Only

G1.2 deliberately defines a single causal blocker:

```text
GrowthBlocker | null
```

with the canonical order:

```text
notTown
→ noHousingPressure
→ waterShortage
→ noWaterHeadroom
→ noEligibleCell
→ unaffordable
→ null
```

Preserve this rule.

The UI should show the current primary cause, not a list of every possible constraint.

This is important because NOVA's design principle is causal readability.

Do not produce:

> "Growth blocked: Water, Material, Roads, Housing..."

Instead communicate the one cause currently preventing growth.

---

# 5. Player-Facing Language

Define concise player-facing text for every blocker.

The language must be:

- short;
- factual;
- understandable;
- consistent with existing terminology;
- non-technical.

Do not expose:

- `GrowthBlocker`;
- query names;
- internal enum names;
- implementation terminology.

For example, the final copy might communicate concepts such as:

```text
Growth: waiting for Town
Growth: needs housing demand
Growth: water shortage
Growth: needs more Water capacity
Growth: needs road frontage
Growth: needs 25 Material
Growth: ready
```

These are examples only.

Use the project's existing terminology and UX language.

Do not introduce wording that implies mechanics not actually present.

---

# 6. Do Not Add a New Mechanic

The UI must be a pure representation of derived simulation state.

Do not add:

- growth priorities;
- player growth controls;
- zoning;
- residential policies;
- growth speed;
- growth cooldown;
- growth budget;
- growth queue;
- service tiers;
- growth points;
- population targets.

The player only receives information about the existing system.

---

# 7. Verify Actual Comprehension

Do not assume that adding text automatically improves UX.

Create a focused browser scenario demonstrating:

### Case A — Growth ready

The player can see that growth is possible.

### Case B — Growth blocked

Create a deterministic state where a specific blocker is active.

The UI must communicate the same blocker.

### Case C — Cause changes

Change the existing simulation condition through normal player interaction.

Verify the displayed cause changes accordingly.

Example:

```text
insufficient Material
        ↓
player gains Material
        ↓
Growth becomes ready
```

or another causal path supported by the actual simulation.

### Case D — Growth occurs

Verify that the communication correctly reflects the transition from waiting/ready to actual construction.

Do not use arbitrary sleeps.

Use stable state-based waits.

---

# 8. Avoid UI Occlusion

The HUD non-occlusion contract from 10CZ remains frozen.

Verify:

- 1280×800;
- 420×740;
- 360×640.

The new status must not cover playable cells.

Do not solve an overflow problem by silently changing the existing HUD geometry.

If the status cannot fit naturally, stop and report the conflict rather than redesigning the HUD.

---

# 9. Visual Identity

Follow the existing NOVA visual language.

Do not add:

- gradients;
- bloom;
- animations;
- flashing warnings;
- excessive color coding;
- futuristic holographic panels;
- decorative badges.

The communication should look like part of the existing dark maquette interface.

Use existing typography, spacing and semantic status conventions.

---

# 10. Derived State Only

`GrowthBlocker` remains derived.

Do not persist:

- blocker;
- growth status;
- growth progress;
- growth notification state.

The UI must consume the same application-level query already used by simulation/tests.

There must be no duplicated UI-only growth logic.

---

# 11. Architecture

Maintain the existing boundaries.

The correct flow should remain conceptually:

```text
canonical simulation state
        ↓
growth query
        ↓
application/UI state
        ↓
presentation
```

Do not move growth rules into React.

Do not introduce simulation logic into components.

Do not import Three.js into:

```text
src/domain/**
src/application/**
```

Do not make rendering responsible for deciding whether growth is possible.

---

# 12. Persistence

No persistence changes.

Confirm:

```text
SAVE_VERSION = 8
```

remains unchanged.

Save/load must produce identical growth communication for equivalent canonical state.

Do not add migration code.

---

# 13. Tests

Add focused tests for the communication layer.

At minimum verify:

### Mapping

Every `GrowthBlocker` maps to exactly one valid player-facing message.

### Ready

`null` / ready state maps correctly.

### Stability

The same blocker always produces the same message.

### No hidden state

UI communication derives entirely from the current query.

### Persistence

Equivalent pre/post save-load state produces equivalent communication.

### Regression

Existing growth tests remain valid.

Do not weaken existing behavioral assertions.

---

# 14. Browser Verification

Extend `e2e/growthRun.mjs` or create a focused G1 communication suite if that is cleaner.

The browser test must verify real player-visible text/state.

Cover:

```text
Town
→ growth state visible
→ blocker visible
→ existing action changes blocker
→ growth becomes ready
→ Residence construction starts
→ normal lifecycle completes
```

Do not directly call application functions from the E2E test to fake player behavior.

Use the existing browser interaction patterns.

---

# 15. GPU Verification

Because this changes visible HUD presentation, run headed GPU/WebGL2 verification.

Verify:

- WebGL2 active;
- NVIDIA RTX 3070;
- no console errors;
- no rendering errors;
- status remains visible;
- board remains interactive;
- grown Residence still renders correctly.

---

# 16. Accessibility

The communication must not rely exclusively on color.

Verify:

- readable text;
- sufficient semantic distinction;
- no color-only meaning;
- usable at narrow viewports;
- no inaccessible hidden overflow.

Use existing accessibility conventions rather than introducing a new accessibility framework.

---

# 17. Performance

This must be extremely cheap.

Do not poll growth state every animation frame.

Use the existing React/application state update path.

Do not add:

- timers;
- intervals;
- render-loop queries;
- expensive DOM observers.

---

# 18. Product Evaluation

After implementation, explicitly evaluate whether the communication actually improves the G1 experience.

Answer:

1. Can a player understand why growth is waiting?
2. Can a player identify an existing action that may change the condition?
3. Can the player distinguish "no demand" from "growth is blocked"?
4. Does the message remain concise?
5. Does it preserve NOVA's minimal interface?
6. Does it create any misleading expectation?

If the answer is no, fix the implementation within this slice.

Do not compensate with additional UI complexity.

---

# 19. G1 Completion Gate

At the end of G1.3, evaluate whether G1 can now be considered a complete gameplay phase.

G1 should have:

- causal demand;
- autonomous growth;
- deterministic spatial expansion;
- infrastructure-dependent frontier;
- real resource constraints;
- bounded growth;
- player influence through existing systems;
- understandable growth state;
- normal construction lifecycle;
- deterministic persistence;
- browser-verifiable player experience.

If all of these are satisfied, **do not immediately create another G1 feature**.

Document G1 as complete and prepare the handoff toward G2.

If one of these is materially missing, identify the exact remaining G1 requirement.

Do not add speculative mechanics.

---

# 20. Explicitly Out of Scope

Do not implement:

- production chains;
- transport;
- vehicles;
- logistics;
- markets;
- currency;
- technology;
- specialization;
- external demand;
- world simulation;
- new resources;
- zoning;
- growth policies;
- service-aware pacing;
- endgame;
- camera redesign;
- visual-tier expansion.

Those remain outside G1.3.

---

# 21. Documentation

Create:

`docs/roadmap/StepG1.3.md`

Document:

1. Product objective
2. Existing G1 growth model
3. Communication problem
4. Final UI surface
5. Player-facing messages
6. Mapping from derived blocker → message
7. Browser comprehension evidence
8. Accessibility
9. Performance
10. Persistence
11. Determinism
12. Validation
13. G1 completion assessment
14. Remaining limitations, if any
15. G2 handoff

Do not rewrite historical G1 documents.

---

# 22. Validation

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Run:

- focused G1.3 tests;
- G1 growth E2E;
- housing/construction regression;
- road/access regression;
- progression/Town regression;
- economy/water regression;
- product/readability tests;
- responsive viewport checks;
- headed GPU/WebGL2 verification.

Record exact results.

---

# 23. Final Diff Audit

Before commit:

```bash
git status --short
git diff --stat
git diff
```

Confirm:

- no SAVE_VERSION change;
- no persistence schema change;
- no frozen simulation contract change;
- no scenario changes;
- no architecture boundary violations;
- no unrelated files;
- no user-owned files modified;
- no debug code;
- no temporary artifacts.

---

# 24. Commit

If the implementation and verification pass:

```text
feat(nova): communicate settlement growth state
```

Create exactly one commit.

Do not push.

---

# 25. Final Report

Report:

## Product result

What can the player now understand that was previously hidden?

## UI

Where is the communication presented?

## Growth states

List the exact player-facing messages.

## Causal verification

Show at least one complete:

```text
blocker
→ player action
→ state change
→ new message
→ growth
```

sequence.

## G1 completion

Explicitly state whether G1 is now complete.

If not, identify the exact remaining requirement.

## Tests

Exact focused and full counts.

## Browser

Exact E2E results.

## GPU

Exact WebGL2 result.

## Quality

- typecheck
- lint
- build
- diff check

## Persistence

Confirm SAVE_VERSION = 8.

## Git

Commit hash and final status.

Do not push.

---

# Critical Principle

G1 should not become a UI-heavy "growth management" system.

The intended experience is:

```text
The settlement is under pressure
        ↓
The simulation knows why
        ↓
The player can understand why
        ↓
Existing player decisions can change the condition
        ↓
The settlement grows
```

If this can be communicated with one small piece of information, stop there.

**The purpose of G1.3 is to make the existing system legible, not to add another system.**

---

# As-Built — Step G1.3: Growth Communication & Capacity Signalling

## 1. Product Objective

Answer "why is the settlement growing, or why has it stopped?" from the
existing simulation, through the smallest possible HUD surface. No new mechanic,
no polling, no persisted state.

## 2. Existing G1 Growth Model

G1.1 (`3624b2a`) added autonomous demand-driven Residence growth at Town; G1.2
(`55e4f1d`) made the expansion cell spatially coherent (nearest to the existing
settlement) and added the derived single `GrowthBlocker`. The state was already
mechanically complete and inspectable on the stats surface
(`window.__nova.stats().growthBlocker`) but not visible to a player.

## 3. Communication Problem

A player could see a Residence appear (or growth stop) but had no in-product
cause: `growthBlocker` was developer-facing only. G1.2's blocker order already
encodes the one cause the player can act on; the missing piece was a one-line
player-facing projection of that state.

## 4. Final UI Surface

One line added to the existing progression block, reusing the established
`#ui-progress` / `#ui-blocked` typography and colour (11px, `#9aa4b5`, "—"
separator style):

```html
<div id="ui-growth" data-testid="progression-growth"></div>
```

No modal, notification, popup, tooltip, panel, dashboard, menu, badge,
animation, colour coding or new control. The line is part of the dark maquette
interface and lives inside the existing (collapsible) HUD region, so the 10CZ
non-occlusion contract is unchanged (re-verified: 0 covered cells at 1280×800,
420×740 and 360×640).

## 5. Player-Facing Messages

| Condition | Line |
| --- | --- |
| not at Town | `Growth — waiting for Town` |
| a vacant Residence exists | `Growth — vacant Residence available` |
| served colonists exceed the Water stock | `Growth — water shortage` |
| Water capacity cannot serve one more colonist | `Growth — needs more Water capacity` |
| no free Well-covered road-adjacent cell | `Growth — needs served road space` |
| main Material below the Residence cost | `Growth — needs 25 Material` |
| demand + eligible + affordable | `Growth — ready` |

One cause only, in G1.2's canonical order. The Material figure comes from the
building catalog (no magic number in the UI). No message contains an internal
enum or query name (asserted).

## 6. Mapping From Derived Blocker → Message

The mapping is a pure function in the application query layer
(`getGrowthMessage` in `src/application/queries/growth.ts`), not in the
component:

```text
evaluateSettlementGrowth(state).blocker (GrowthBlocker | null)
        ↓
getGrowthMessage(state): string
        ↓
#ui-growth textContent (refreshUi, same path as objective/blocked)
```

`notTown → 'waiting for Town'`, `noHousingPressure → 'vacant Residence
available'`, `waterShortage → 'water shortage'`, `noWaterHeadroom → 'needs more
Water capacity'`, `noEligibleCell → 'needs served road space'`,
`unaffordable → 'needs <catalog cost> Material'`, `null → 'ready'`. The switch is
exhaustive over the union, so a new blocker would fail type-check until a message
is added.

## 7. Browser Comprehension Evidence

`npm run test:e2e:growth` (headed, extended) — **PASS**, reading the real DOM
`[data-testid="progression-growth"]` text:

- pre-Town default settlement: `Growth — waiting for Town`;
- Town fixture: `Growth — ready` (feedback ready, no blocker);
- one STEP: a Residence is constructed at the coherent cell `2,0`; lifecycle
  completes;
- saturation: growth stops, blocker reported, line is a real constraint;
- **Case C — cause changes**: a Material-0 Town shows `Growth — needs 25
  Material`; growth resumes once accumulated income clears the cost; then a Town
  with one vacant served Residence shows `Growth — vacant Residence available`,
  and after admission fills it the line changes again (`Growth — waiting for
  Town`, because the extra colonist broke Food balance) — i.e. an existing system
  (admission) visibly moved the cause;
- responsive: the line stays visible with no horizontal overflow at 1280×800,
  420×740 and 360×640 (and the product audit reports **0 HUD-covered playable
  cells** at all three);
- the player-controlled Residence path still works; zero console/page errors.

## 8. Accessibility

The line is plain text with a state word in every message, so meaning is never
colour-only (the implementation adds no colour at all beyond the existing neutral
HUD text). It uses the same 11px typography as the other status lines, wraps
inside the existing `max-width`/narrow-viewport rules, and is reachable by
screen readers as ordinary text. No new ARIA, focus or motion behaviour was
introduced.

## 9. Performance

The message is computed inside `refreshUi`, which runs only when the simulation
notifies a state change (tick or command) — the same path as the objective,
checklist and blocked lines. No timers, intervals, render-loop queries,
observers or DOM polling; no per-frame growth evaluation.

## 10. Persistence

No persistence change. The blocker and its message are derived from canonical
state; `SAVE_VERSION = 8` unchanged; save → load produces the same message
(tested); the serialized save contains no growth fields.

## 11. Determinism

The message is a pure function of canonical state: the same state always yields
the same line (tested), calling it does not change the hash (tested), and it is
identical across two identically-built fixtures and after save/load (tested).
No randomness, time or DOM input is involved.

## 12. Validation

- focused: `tests/growthCommunication.test.ts` **7/7** (mapping for all six
blockers + ready, catalog cost, no internal terminology, purity, condition
change, save/load); `tests/settlementGrowth.test.ts` **14/14** and
`tests/settlementGrowthCoherence.test.ts` **12/12** unchanged;
- full Vitest: **1905 / 1905 PASS (120 files)**;
- typecheck PASS; lint PASS; production build PASS; `git diff --check` clean;
- browser: growth E2E PASS; housing, progression, readability, upkeep, jobs,
water, road, town-gate PASS; product audit PASS (0 covered cells);
`spatial-readability` PASS on re-run — it has a **pre-existing** scenario-load
timeout flake (reproduced with the G1 src stashed in Step G1.1), unrelated;
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), zero console/page
errors, status visible, board interactive, grown Residence renders correctly;
- `SAVE_VERSION = 8`.

## 13. G1 Completion Assessment

G1 is **complete**:

| Requirement | Status |
| --- | --- |
| causal demand | ✅ G1.1 (Town + housing pressure + Water headroom) |
| autonomous growth | ✅ one Residence/tick, no timer |
| deterministic spatial expansion | ✅ G1.2 nearest-settlement rule |
| infrastructure-dependent frontier | ✅ Well-covered road frontage |
| real resource constraints | ✅ Water capacity, Material, Food/workforce, stage |
| bounded growth | ✅ measured saturation, stable afterwards |
| player influence via existing systems | ✅ roads/coverage/Water/Material/Food (tested) |
| understandable growth state | ✅ G1.3 one derived HUD line |
| normal construction lifecycle | ✅ same transaction as `placeBuilding` |
| deterministic persistence | ✅ derived only, `SAVE_VERSION = 8`, tested |
| browser-verifiable player experience | ✅ growth E2E + regression suites |

No further G1 feature should be created. Remaining items are optional polish and
belong to a later deliberate decision.

## 14. Remaining Limitations

- The line is one neutral-coloured text; urgency is conveyed by wording only
(no colour/flash), by design.
- The per-home Material gate means the line can alternate ready ↔ `needs 25
Material` while the settlement grows; that is accurate feedback, not a bug.
- "Nearest building" remains a simple settlement proxy (no districts/density).
- The line is hidden when the HUD is collapsed (existing HUD behaviour).
- `spatial-readability` remains a pre-existing flaky suite (scenario-load
  timeout).

## 15. G2 Handoff

G1 is complete and frozen as a phase. The next phase (G2 — interdependence:
production inputs/outputs and transport/logistics) requires its own explicit
product objective and evidence before implementation; nothing from G2 is begun
here. Do not open another G1 feature.

Commit: `feat(nova): communicate settlement growth state`
