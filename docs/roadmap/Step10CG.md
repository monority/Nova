# Step 10CG — Town Gameplay Quality Audit

## Context

NOVA is a deterministic contemplative city-builder.

Current baseline:

* Step 10CA — Next Gameplay Pressure Audit
* Step 10CD — design gate; no mechanic implemented
* Step 10CE — Mixed-Town Water Pressure Audit
* Step 10CF — Town Decision Frontier Audit
* Current HEAD: `5ec33c3`
* SAVE_VERSION: `8`
* Full Vitest baseline: `1,718 / 1,718`
* Typecheck: passed
* Lint: passed
* Build: passed
* Previous Town/browser/GPU validation is known-good

The recent simulation audits reached a consistent conclusion:

* Food / Water / Material already form a meaningful three-way workforce trade-off.
* Farm / Well / Workshop reassignment can resolve the measured resource pressures.
* Water headroom does not currently justify a dedicated mechanic.
* Existing road/accessibility behavior creates spatial constraints but no new persistent decision frontier.
* Temporal pressure exists but remains manageable through existing controls.
* Town progression and workforce review do not currently produce a new persistent management problem.
* No new gameplay mechanic has been justified by the recent audits.

Therefore, the next question is no longer:

> "What mechanic should we add?"

The next question is:

> **"Is the gameplay that already exists sufficiently understandable, legible, and meaningful to the player?"**

This step is a **product/gameplay quality audit**.

It must not manufacture a reason to add mechanics.

---

# Primary objective

Evaluate the actual Village → Town player experience and determine whether the current gameplay model is:

1. **meaningful and sufficiently legible as-is;**
2. **meaningful but poorly communicated by UX/UI;**
3. **well communicated but insufficiently deep**, meaning the existing mechanics genuinely fail to provide meaningful decisions despite the recent simulation audits.

The audit must distinguish these cases.

Do not jump from "UI could be clearer" to "add mechanics."

Do not jump from "the game is currently simple" to "add content."

The goal is to identify the **actual current product bottleneck**.

---

# Hard design gate

This is primarily an audit.

Do NOT add:

* new resources;
* new buildings;
* new commands;
* new workforce systems;
* new automation;
* new priorities;
* new progression stages;
* new storage systems;
* new housing systems;
* new population mechanics;
* Water planning;
* Food planning;
* Material planning;
* transportation;
* construction expansion;
* spatial expansion;
* policies;
* resource sinks;
* balancing changes;
* new gameplay rules.

Do not modify:

* production coefficients;
* tick semantics;
* workforce rules;
* road/accessibility rules;
* Town progression rules;
* persistence;
* SAVE_VERSION.

Do not redesign the simulation to make the UI look more interesting.

---

# Allowed changes

The default expectation is:

* audit tests;
* browser/E2E test coverage;
* documentation;
* small UX/UI corrections **only if the audit identifies a concrete existing-information usability problem**.

However:

### Important

Do not start by changing the UI.

First measure and diagnose.

If the existing UI is already sufficiently clear, make no UI changes.

If a UI problem is demonstrated, only make the **minimum behavior-preserving correction** required to expose information that already exists in the simulation.

Do not invent new player controls or new gameplay information.

---

# Mandatory first actions

Before modifying anything:

1. Inspect `git status`.
2. Confirm HEAD:
   `5ec33c3`
3. Read:

   * `docs/roadmap/STEP10CA.md`
   * `docs/roadmap/STEP10CE.md`
   * `docs/roadmap/STEP10CF.md`
   * Step 10CD documentation
   * `docs/roadmap/Step10BZ.md`
   * `docs/roadmap/Step10BY.md`
4. Inspect:

   * current Village/Town progression UI;
   * workforce allocation UI;
   * resource HUD;
   * building inspection;
   * worker assignment/reassignment;
   * road/accessibility feedback;
   * existing browser tests;
   * responsive behavior;
   * current Town E2E fixtures.
5. Understand which information is already available in the simulation but potentially invisible or unclear to the player.

Do not infer UI behavior from screenshots or memory if the current implementation can be inspected directly.

---

# Part 1 — Define the actual player journey

Audit the complete intended progression:

## Stage A — Early settlement

The player discovers:

* Farms;
* Wells;
* Workshops;
* Colonists;
* worker assignment;
* basic Food / Water / Material economy.

## Stage B — Workforce trade-offs

The player encounters:

* Farm ↔ Well;
* Farm ↔ Workshop;
* Well ↔ Workshop;
* three-way allocation pressure.

Determine whether the interface communicates these consequences clearly.

## Stage C — Roads and accessibility

The player encounters:

* roads;
* road networks;
* building accessibility;
* operational/non-operational consequences.

Determine whether the player can understand why a building is or is not operational.

## Stage D — Town

The player reaches Town and receives the existing workforce allocation review capability.

Determine:

* what changed;
* whether the player understands why it matters;
* whether "Town" feels meaningfully different from Village;
* whether the new capability is discoverable;
* whether it actually helps the player make decisions.

Do not assume that because the underlying simulation is meaningful, the player can perceive it.

---

# Part 2 — Player decision audit

For each major player decision, answer:

### 1. What can the player do?

### 2. What information does the player receive before acting?

### 3. What changes after acting?

### 4. Can the player understand why it changed?

### 5. Can the player reverse the decision?

### 6. Is the consequence visible without inspecting implementation details?

### 7. Is there unnecessary friction?

### 8. Is the decision actually meaningful?

Audit at minimum:

* placing Farm;
* placing Well;
* placing Workshop;
* assigning a worker;
* reassigning a worker;
* moving a worker Farm → Well;
* moving a worker Well → Workshop;
* moving a worker Workshop → Farm;
* building/using roads;
* making a building accessible;
* reaching Town;
* using Town workforce review.

---

# Part 3 — Information visibility audit

Create an explicit map of:

> **Simulation fact → Player-visible representation**

At minimum inspect:

| Simulation fact              | Is it visible? | Is it understandable? | Is it actionable? |
| ---------------------------- | -------------- | --------------------- | ----------------- |
| Food production              |                |                       |                   |
| Water production             |                |                       |                   |
| Material production          |                |                       |                   |
| Food stock                   |                |                       |                   |
| Water stock                  |                |                       |                   |
| Material stock               |                |                       |                   |
| Workforce allocation         |                |                       |                   |
| Vacant jobs                  |                |                       |                   |
| Farm capacity                |                |                       |                   |
| Well capacity                |                |                       |                   |
| Workshop capacity            |                |                       |                   |
| Road accessibility           |                |                       |                   |
| Building operational state   |                |                       |                   |
| Town state                   |                |                       |                   |
| Town workforce review        |                |                       |                   |
| Consequences of reassignment |                |                       |                   |

Do not assume that displaying a number means the information is understandable.

For each item distinguish:

* **visible**
* **legible**
* **contextualized**
* **actionable**

These are different properties.

---

# Part 4 — Decision consequence audit

This is critical.

For representative decisions, perform the action and observe the actual UI.

Example:

### Farm → Well

Before:

* record Food;
* record Water;
* record Material;
* record workforce allocation.

Perform reassignment.

After:

* record all changed values;
* determine whether the UI clearly exposes the consequence;
* determine whether the player can understand that Water improved because Food opportunity cost increased.

Repeat for:

* Farm → Workshop;
* Well → Farm;
* Well → Workshop;
* Workshop → Farm;
* Workshop → Well.

The objective is not to test the simulation itself — 10CA/10CE/10CF already did that.

The objective is:

> **Can a player actually perceive the decision the simulation is presenting?**

---

# Part 5 — Town-specific audit

Town deserves its own investigation.

Determine:

### Discoverability

Can a player notice that Town has unlocked a new capability?

### Comprehension

Can the player understand what the capability does?

### Relevance

Does it appear at a moment where the player has a real allocation problem?

### Feedback

After reassignment, is the resulting state obvious?

### Persistence

Does the information remain understandable after save/load/reload?

### Density

Is the Town UI becoming a dashboard rather than a contemplative city-builder interface?

### Redundancy

Does the Town UI merely repeat information already available elsewhere?

### False affordance

Does any UI element imply a control or capability that the simulation does not actually provide?

Do not add functionality to satisfy a false affordance.

---

# Part 6 — Spatial/accessibility audit

Audit the existing road system from the player's perspective.

Test:

1. Productive building without road access.
2. Road added.
3. Building becomes accessible.
4. Building loses access.
5. Multiple road networks.
6. Reconnection where the current rules permit it.

For each:

* Is the cause visible?
* Is the consequence visible?
* Is the state reversible?
* Does the player understand what changed?
* Is there unnecessary UI complexity?

Do not add pathfinding, transportation, traffic, bridges, or network planning.

Only evaluate the current system.

---

# Part 7 — Temporal readability

The simulation is tick-based.

Determine whether the player can understand:

* production over time;
* stock accumulation;
* stock depletion;
* workforce reassignment consequences;
* recovery after a bad allocation.

Use controlled scenarios with:

* 4 ticks;
* 12 ticks;
* 24 ticks.

The question is not whether the numbers are mathematically correct.

The question is:

> **Can the player form a usable mental model of what the simulation is doing?**

Look for:

* invisible changes;
* delayed consequences with no explanation;
* values changing too quickly;
* values changing too slowly;
* insufficient context;
* misleading instantaneous feedback.

Do not change tick speed or production rules.

---

# Part 8 — Responsive UX audit

Use the existing required viewports:

* `1280 × 800`
* `420 × 740`
* `360 × 640`

Inspect the complete Town experience.

Specifically check:

* resource HUD;
* building information;
* worker controls;
* Town workforce review;
* road/accessibility feedback;
* buttons;
* text wrapping;
* clipping;
* overflow;
* touch target size;
* information hierarchy;
* whether critical information disappears at narrow widths.

Do not solve mobile issues by hiding essential simulation information.

Do not create a separate mobile gameplay model.

---

# Part 9 — Visual hierarchy and product direction

Evaluate the UI against NOVA's established product direction:

* top-down city-builder;
* dark modern futuristic maquette;
* contemplative;
* readable;
* restrained;
* no generic dashboard/game UI;
* no spreadsheet-like management surface.

Specifically look for:

* unnecessary panels;
* redundant counters;
* excessive labels;
* excessive persistent HUD;
* visual noise;
* information competing for attention;
* controls that look more important than the actual city;
* Town becoming an accounting screen.

Do not redesign the visual language wholesale.

This is an audit, not a visual redesign.

---

# Part 10 — False complexity audit

Explicitly check whether the current experience accidentally creates complexity without meaningful decisions.

Examples:

* information shown but never useful;
* controls that duplicate another control;
* resource numbers without actionable consequence;
* road information without a corresponding player decision;
* Town messaging that repeats Village messaging;
* UI state that requires interpretation but provides no useful action.

Classify each issue as:

* useful complexity;
* harmless complexity;
* misleading complexity;
* unnecessary complexity.

Do not remove things merely because they are complex.

---

# Part 11 — Gameplay quality classification

At the end, classify the current product using evidence, not preference.

Use exactly one primary diagnosis:

### A. Meaningful + legible

The existing gameplay produces meaningful decisions and the UI exposes them adequately.

Next phase can move beyond foundational UX work.

### B. Meaningful + poorly communicated

The simulation contains meaningful decisions, but the UI fails to expose them adequately.

Next phase should focus on UX/readability before adding mechanics.

### C. Well communicated + insufficient depth

The existing decisions are clearly exposed, but the player reaches the end of the meaningful decision space too quickly.

Only this result reopens the question of whether another gameplay mechanic should be investigated.

### D. Mixed / unresolved

Evidence is insufficient or contradictory.

Identify exactly what remains unknown.

Do not invent a mechanic.

---

# Part 12 — Anti-feature gate

If the audit identifies a UI improvement, verify:

* it exposes an existing simulation fact;
* it does not create a new gameplay rule;
* it does not create a new resource;
* it does not create a new command;
* it does not create automation;
* it does not duplicate existing controls;
* it does not turn NOVA into a spreadsheet;
* it does not increase persistent state;
* it does not threaten determinism.

If an improvement fails these conditions, document it as a future design question instead of implementing it.

---

# Part 13 — Required audit tests

Create:

`tests/townGameplayQualityAudit.test.ts`

The tests must verify the measurable parts of the audit.

At minimum cover:

* Village → Town progression;
* existing workforce review availability;
* resource information exposed by current application/UI state;
* Farm/Well/Workshop reassignment consequences;
* operational/accessibility feedback;
* Town-specific information;
* deterministic behavior;
* save/load continuity where relevant;
* responsive-critical UI selectors where appropriate.

Do not write brittle tests against incidental CSS or DOM structure.

Prefer semantic selectors and existing testing patterns.

If a UI issue is found and corrected, add a regression test for the actual user-visible contract.

---

# Part 14 — Browser validation

This step is specifically about product quality.

Run headed browser validation.

Required:

### Desktop

`1280 × 800`

### Mobile

`420 × 740`

`360 × 640`

Exercise a real flow:

1. Start a valid settlement.
2. Create productive buildings.
3. Assign workers.
4. Observe production.
5. Reassign workers.
6. Observe the consequences.
7. Build/use roads.
8. Inspect accessibility behavior.
9. Progress to Town.
10. Use Town workforce review.
11. Save/reload where supported.
12. Verify the same state remains understandable.

Do not merely assert that the page rendered.

Actually inspect the player flow.

---

# Part 15 — GPU/WebGL validation

Because NOVA is a Three.js/WebGL2 product, run the existing headed GPU/WebGL2 regression if the browser flow is exercised.

Confirm:

* WebGL2 available;
* expected NVIDIA RTX 3070 renderer;
* no new rendering regressions;
* no browser console errors attributable to the audit changes.

Do not change rendering architecture.

---

# Part 16 — Performance

Measure whether the existing Town UI and browser flow exhibit:

* excessive React rerenders;
* unnecessary simulation recomputation;
* expensive derived queries;
* layout thrashing;
* oversized DOM;
* obvious frame degradation.

Do not optimize speculative problems.

If a real issue is found:

1. measure it;
2. identify the cause;
3. make the smallest behavior-preserving correction;
4. add regression coverage if appropriate.

Do not rewrite architecture for hypothetical performance.

---

# Part 17 — Allowed implementation decision

After the audit, choose:

### No implementation

If the current UX is already sufficient.

### Minimal UX correction

Only if an existing simulation fact is genuinely difficult to perceive or understand.

### Multiple UX changes

Only if they form one coherent, tightly scoped correction to the same demonstrated usability problem.

Do not turn 10CG into a UI redesign project.

If changes are made, they must be behavior-preserving with respect to simulation rules.

---

# Required documentation

Create:

`docs/roadmap/STEP10CG.md`

Structure exactly:

## 1. Question

What was being evaluated?

## 2. Baseline

* commit
* SAVE_VERSION
* relevant simulation systems

## 3. Player journey

Village → workforce → roads → Town.

## 4. Decision audit

Concrete findings for each major player action.

## 5. Simulation → UI visibility matrix

Document which facts are visible, legible, contextualized and actionable.

## 6. Workforce consequence audit

Document observed Farm/Well/Workshop reassignment feedback.

## 7. Spatial audit

Document road/accessibility comprehension.

## 8. Temporal audit

Document 4/12/24 tick readability.

## 9. Town audit

Document discoverability and usefulness of Town workforce review.

## 10. Responsive audit

Document:

* 1280×800
* 420×740
* 360×640

## 11. Visual/product audit

Document hierarchy, density, noise and dashboard/spreadsheet risk.

## 12. Issues found

Separate:

* factual usability defects;
* cosmetic issues;
* subjective preferences;
* future design questions.

Do not present subjective preferences as bugs.

## 13. Changes made

If none:

> No implementation changes were necessary.

Otherwise list only the minimal behavior-preserving UX corrections.

## 14. Final diagnosis

Choose exactly one:

* Meaningful + legible
* Meaningful + poorly communicated
* Well communicated + insufficient depth
* Mixed / unresolved

Explain the evidence.

## 15. Next-step gate

If meaningful + legible:

> The current foundation is sufficiently exposed; future work should be driven by product/content goals rather than an assumed missing mechanic.

If meaningful + poorly communicated:

> Improve the demonstrated UX bottleneck before adding gameplay mechanics.

If well communicated + insufficient depth:

> A separate gameplay-design investigation may be justified; do not implement it in 10CG.

If mixed/unresolved:

> Resolve the specific unknowns before making a gameplay decision.

---

# Validation requirements

Run:

* focused 10CG tests;
* relevant compatibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* headed browser validation;
* responsive validation;
* GPU/WebGL2 validation;
* `git diff --check`.

If implementation changes are made, verify:

* no gameplay rule changed;
* no production coefficient changed;
* no persistence schema changed;
* SAVE_VERSION remains `8`;
* no new gameplay command was introduced;
* no new resource/building/progression system was introduced.

---

# User-owned files

Do not modify or delete:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

Do not perform unrelated cleanup.

Do not modify unrelated documentation drafts or generated files.

---

# Git discipline

Before committing:

1. inspect `git status`;
2. inspect the complete diff;
3. classify every changed file;
4. verify no unrelated changes;
5. verify user-owned files remain untouched;
6. run `git diff --check`.

Expected files:

* `tests/townGameplayQualityAudit.test.ts`
* `docs/roadmap/STEP10CG.md`

Potentially, if and only if a demonstrated UX defect requires correction:

* the minimal relevant UI/application files;
* corresponding regression tests.

Commit exactly:

`Step 10CG: Town Gameplay Quality Audit`

Create exactly **one commit**.

Do not push unless explicitly requested.

---

# Final report

Return:

## Step 10CG — Final

* Commit:
* Baseline:
* Player journey audited:
* Major decisions audited:
* Information visibility findings:
* Workforce feedback findings:
* Spatial findings:
* Temporal findings:
* Town findings:
* Responsive findings:
* Visual/product findings:
* UX defects:
* UX corrections:
* Gameplay changes:
* Final diagnosis:
* Next-step gate:
* SAVE_VERSION:
* Focused tests:
* Relevant compatibility:
* Full Vitest:
* Typecheck:
* Lint:
* Build:
* Browser:
* Responsive:
* GPU/WebGL2:
* Performance:
* Diff audit:
* Worktree status:

Then provide a concise factual synthesis.

The final report must make a clear distinction between:

---

# Documentation (as-built)

## 1. Question

Is the existing Village → Town gameplay sufficiently meaningful, legible, and actionable?

## 2. Baseline

Baseline was `5ec33c3`, `SAVE_VERSION = 8`, with the Farm/Well/Workshop workforce model, Town gate/review, roads/accessibility, tick simulation, persistence, and hashing unchanged.

## 3. Player journey

The journey exposes:

- Village: Food, Water capacity, road network, and basic workforce operation.
- Workforce: current `Farms X/Y · Wells A/B · Food +/-N/tick · Water headroom +/-N` allocation summary.
- Roads: building inspection explains production/accessibility and road state.
- Town: progression checklist and `Town workforce allocation` review become available.
- Reassignment: existing Move worker control changes the displayed allocation and production consequences.

## 4. Decision audit

- **Farm/Well/Workshop placement:** existing build costs, road requirements, and placement feedback provide the decision context.
- **Worker assignment/reassignment:** the existing reassignment dropdown exposes eligible targets, distance, capacity, and manual/automatic state.
- **Farm/Well/Workshop moves:** the focused test verifies the actual Food/Water/Material consequence; the browser E2E verifies the visible allocation row before and after a valid move.
- **Roads/accessibility:** derived building-road access and existing production feedback distinguish inaccessible from merely vacant workplaces.
- **Town:** the checklist and workforce review are visible and actionable through the existing manual reassignment path.

## 5. Simulation → UI visibility matrix

- Food/Water/Material production, stocks, capacity/headroom: **visible**.
- Farm/Well/Workshop allocation and vacant capacity: **visible** in the allocation HUD and inspections.
- Worker assignment mode and eligible reassignment targets: **visible/actionable**.
- Road accessibility and operational state: **visible/contextualized** in building inspection and placement feedback.
- Town state, blockers, and workforce review: **visible/contextualized/actionable**.
- Consequence of reassignment: **visible** through updated allocation/resource HUD values.

No required simulation fact was found to be both hidden and materially actionable.

## 6. Workforce consequence audit

Farm/Well/Workshop reassignment changes the actual production rates and the current HUD allocation line. The existing Move worker control makes the change reversible. No new priority control, profession, or assignment abstraction is needed.

## 7. Spatial audit

A roadless productive building remains distinguishable from an accessible vacant building. The existing road/access feedback explains the operational consequence. No spatial mechanic or false affordance was found.

## 8. Temporal audit

The existing tick semantics and rate/stock displays provide enough context for 4/12/24-tick recovery. Recent 10CE/10CF audits established that pressure remains within existing reassignment controls; the UI exposes the current state without requiring a forecast or new mechanic.

## 9. Town audit

Town is discoverable through the existing progression panel. The Town workforce review states that Farm/Well/Workshop allocation is active and points to Move worker. It is a compact status line, not a dashboard or modal, and remains understandable after save/load because it is derived.

## 10. Responsive audit

Existing Town E2E passed at:

- `1280×800`
- `420×740`
- `360×640`

No body or HUD overflow, clipping, or missing critical control was observed.

## 11. Visual/product audit

The interface remains restrained and consistent with the contemplative city-builder direction. The allocation line and Town review are compact and contextual. No spreadsheet expansion, redundant panel, or excessive persistent accounting surface was found.

## 12. Issues found

- Factual usability defects: none requiring correction.
- Cosmetic issues: none material to the decision loop.
- Subjective preferences: not treated as defects.
- Future design questions: further mechanics remain a separate product decision, not a current UX defect.

## 13. Changes made

No implementation changes were necessary. The audit added tests and documentation only.

## 14. Final diagnosis

### Meaningful + legible

The existing simulation creates meaningful Farm/Well/Workshop tradeoffs, and the current UI exposes the relevant allocation, rates, headroom, diagnosis, and action path clearly enough for the current Town experience.

## 15. Next-step gate

The current foundation is sufficiently exposed; future work should be driven by product/content goals rather than an assumed missing mechanic.

## Validation

- focused CG tests: 5 PASS;
- relevant compatibility tests: 42 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,723 / 1,723 PASS;
- headed Town browser flow: PASS at all required viewports;
- GPU/WebGL2: PASS with NVIDIA RTX 3070;
- determinism/save-load: PASS in the CG suite;
- `git diff --check`: PASS;
- performance: no frame, rendering, or simulation performance regression observed.

## Scope confirmation

No gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced.

## Files changed

- `docs/roadmap/Step10CG.md`
- `tests/townGameplayQualityAudit.test.ts`

## Commit

`713d377` — Step 10CG: Town Gameplay Quality Audit


* what the simulation does;
* what the UI communicates;
* what was objectively measured;
* what is subjective/product preference;
* what remains a future design question.

Do not invent a mechanic.

Do not add complexity merely because the current system is simple.

The purpose of Step 10CG is to determine whether the **existing NOVA gameplay foundation is understandable and worth building upon before any new gameplay system is introduced**.

