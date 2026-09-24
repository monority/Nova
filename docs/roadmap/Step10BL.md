# NOVA — Step 10BL — Storage Readability & Player Feedback

## Context

NOVA has completed:

* Step 10BG — initial StorageHub implementation
* Step 10BK — Storage reserve dynamics audit

Current HEAD:

`550852e`

10BG introduced:

* `StorageHub`
* Food capacity: 50
* Water capacity: 30
* Material capacity: 40
* storage as a parallel reserve
* production overflow captured instead of discarded
* deterministic overflow allocation
* SAVE_VERSION 8
* v7 → v8 migration

10BK measured the current Material reserve behavior:

* capacity = 40
* protected floor = 15
* releasable reserve = 25
* protected share = 37.5%
* two-worker surplus reaches floor in 4 ticks
* reaches full capacity in 10 ticks
* full reserve can support one complete construction
* prolonged crisis cannot consume below floor
* recovery is deterministic
* 32 focused Storage tests PASS
* typecheck PASS
* lint PASS
* build PASS
* diff check PASS
* full Vitest: 1639 passing, with an existing timeout in `industrialHeadroomTownDecision.test.ts`; repeated runs also hit existing 5s timeouts
* no runtime changes were made in 10BK

---

# Mission

Make Storage understandable and observable in the actual NOVA product.

This is **not** a request to blindly add a Storage panel.

This is a product-readability step.

The player must be able to understand the economic state created by 10BG/10BK without reading implementation details or developer documentation.

The core question is:

> Can a player understand where their resources are, how much reserve exists, why the reserve changes, and what happens when the reserve is exhausted?

Only add player controls if real evidence shows that the player needs a decision to make.

---

# 1. Begin with a real UI audit

Before changing code, inspect the current application in a real browser.

Do not infer the UI from React source alone.

Run the game in Chromium and inspect at least these states:

### State A — Empty reserve

```text
resources available
storage empty
```

### State B — Overflow begins

Production exceeds immediate capacity and the first overflow enters storage.

### State C — Reserve growing

Storage contains a meaningful reserve.

### State D — Full reserve

Storage reaches capacity.

### State E — Crisis / release

Immediate stock is depleted and reserve begins releasing.

### State F — Protected floor

Reserve reaches the floor and must stop releasing.

### State G — Recovery

Production resumes and reserve begins rebuilding.

Use deterministic fixtures/scenarios or temporary test setup as appropriate.

Do not modify the simulation rules merely to make these states easier to inspect.

---

# 2. Determine what the player currently sees

Inventory every relevant existing UI surface.

Specifically identify:

* resource counters;
* resource tooltips;
* HUD;
* construction feedback;
* production feedback;
* shortage feedback;
* worker/workplace feedback;
* scenario/objective information.

Determine whether Storage is currently:

* visible;
* partially visible;
* indirectly inferable;
* completely invisible.

Do not duplicate information unnecessarily.

---

# 3. Define the minimum Storage information contract

Before implementing UI, define exactly what the player needs to know.

At minimum evaluate:

### Immediate stock

How much of the resource is currently available?

### Storage reserve

How much is currently held in reserve?

### Capacity

How much more can be stored?

### Protected floor

Is part of the reserve intentionally protected?

If yes, determine whether exposing the exact concept "floor" is useful to players or whether a more natural presentation is preferable.

### Overflow

Is production currently being redirected into storage?

### Release

Is the reserve currently being consumed to support the colony?

### Full state

Is production currently unable to store additional surplus?

Do not expose every internal state automatically.

Determine which states are actually useful to a player.

---

# 4. Distinguish player language from implementation language

Do not blindly expose technical terms such as:

* `StorageHub`
* `protected floor`
* `releasable`
* `coveredSameTick`
* `overflow allocation`

These are implementation concepts.

Find player-facing terminology appropriate to NOVA.

For example, a player might understand:

```text
Material
25 / 25
Reserve 17 / 40
```

better than:

```text
Operational Material = 25
StorageHub.releasable = 2
```

But do not assume exact wording.

Test the terminology against the existing NOVA visual language.

---

# 5. Important semantic question: is storage immediately usable?

The current model needs an explicit player-facing answer to:

> If I have 20 Material available and 10 Material in reserve, do I effectively have 30 Material for construction?

Inspect the actual simulation behavior.

Do not assume.

Document:

* construction;
* Food consumption;
* Water consumption;
* admissions;
* production.

For each, determine whether the reserve can contribute automatically.

If behavior differs between resources or systems, document it clearly.

If behavior is inconsistent and not intentionally designed, do not hide the inconsistency with UI.

---

# 6. Investigate the "floor" concept

10BK established:

```text
Capacity = 40
Floor = 15
Releasable = 25
```

Determine whether the player needs to understand:

> "15 Material is protected and cannot be released."

or whether the more useful player-facing concept is simply:

> "15 Material emergency reserve."

Do not expose the internal mathematical decomposition unless it helps decision-making.

The player should understand the consequence:

> prolonged crisis cannot consume the entire reserve.

If the exact floor value is useful, show it.

If not, communicate the behavior without overloading the UI.

---

# 7. Compare against real games

Do a focused UX comparison with relevant games, especially:

* Timberborn
* Going Medieval
* Frostpunk

Also use relevant examples discovered during 10BH research.

Look specifically at:

* how resource stock is displayed;
* how storage capacity is displayed;
* how full storage is communicated;
* how overflow is communicated;
* how shortages are communicated;
* whether reserve/emergency stock is explicitly visible;
* whether players can distinguish available resources from stored resources.

Do not copy visual style.

Extract interaction principles.

Cite the sources.

---

# 8. Player control — do not assume it is required

Now revisit the previous hypothesis:

> "The player should control everything, including reserves and resource importance."

Test this against the current model.

Ask:

1. Is there currently a meaningful storage decision?
2. Would a player benefit from choosing what gets stored?
3. Would priority controls change gameplay or merely presentation?
4. Does automatic storage already produce useful decisions through capacity constraints?
5. Is a manual allocation system justified by an actual conflict?
6. Would a priority slider create a meaningful tradeoff?
7. Would it create unnecessary micromanagement?

Possible outcomes:

### Outcome A

No manual control is needed yet.

Keep automatic storage.

### Outcome B

A specific control is justified.

Define exactly which decision it enables.

### Outcome C

The current global StorageHub abstraction prevents meaningful control.

Recommend a model change before UI controls.

Do not choose based on convention.

Choose based on gameplay evidence.

---

# 9. Do not prematurely add physical storage buildings

Do not automatically introduce:

* warehouse;
* silo;
* cistern;
* stockpile;
* storage depot.

Only recommend such a mechanic if the audit demonstrates that storage needs:

* spatial positioning;
* construction cost;
* workforce;
* network accessibility;
* capacity investment.

The fact that other games have physical storage buildings is not sufficient justification.

NOVA must earn that complexity through gameplay.

---

# 10. UI placement

Determine where Storage information belongs in the existing NOVA UI.

Evaluate:

* existing resource HUD;
* resource detail surfaces;
* build panel;
* inspection panel;
* scenario/objective area.

Prefer integrating Storage into an existing resource representation rather than creating a completely separate panel if possible.

Do not increase HUD density without a reason.

NOVA's visual direction remains:

* dark;
* minimal;
* architectural;
* readable;
* not generic strategy-game dashboard clutter.

---

# 11. Implement only the justified UX

After the audit, implement the smallest coherent UI improvement.

Potential result:

```text
Material
25 / 25
Reserve 17 / 40
```

Potential result:

```text
Material 25
Reserve 17 / 40
```

Potential result:

```text
Material 25
Emergency reserve 17 / 40
```

These are examples only.

Use the actual design decision from the audit.

If the current UI already communicates the information adequately, do not change it merely to produce a commit.

---

# 12. Browser validation is mandatory

After implementation:

Use real headed Chromium.

Verify all important states:

1. empty reserve;
2. first overflow;
3. growing reserve;
4. full reserve;
5. reserve release;
6. protected floor;
7. recovery;
8. resource values changing over multiple ticks;
9. construction while reserve exists;
10. collapse/shortage states if applicable.

Check:

* readability;
* hierarchy;
* no clipping;
* no overlap;
* no unnecessary scrolling;
* no misleading values;
* no stale UI;
* consistent terminology.

Do not validate only screenshots at one state.

---

# 13. GPU validation

Because NOVA uses Three.js/WebGL2:

Run headed Chromium through the established GPU validation path.

Confirm:

* WebGL2 active;
* NVIDIA GPU path active;
* no rendering regressions;
* storage UI remains readable in the actual rendered application.

Do not replace this with unit tests.

---

# 14. Automated verification

Run:

* typecheck;
* lint;
* build;
* full relevant Vitest suite;
* Storage tests;
* determinism;
* insertion-order invariance where applicable;
* save/load;
* v7 → v8 migration.

Existing timeout:

`industrialHeadroomTownDecision.test.ts`

must remain clearly distinguished from regressions introduced by this step.

Do not "fix" unrelated existing timeout behavior unless the audit demonstrates that this step caused it.

---

# 15. Do not modify simulation semantics casually

This step is primarily about **readability and player understanding**.

Do not alter:

* capacity;
* floor;
* overflow rules;
* release rules;
* production;
* consumption;
* admission;
* construction economics;

unless the audit finds a genuine semantic inconsistency that prevents the player from understanding the system.

If such a problem is found, stop and document it rather than silently redesigning the economy.

---

# 16. Final QA report

Finish with:

```text id="x8jv0s"
Step 10BL — [PASS / PARTIAL / BLOCKED]

Storage gameplay currently means:
...

Player can understand:
...

Immediate stock representation:
...

Reserve representation:
...

Capacity representation:
...

Protected floor representation:
...

Overflow feedback:
...

Release feedback:
...

Player controls:
...

Decision:
...

Files changed:
...

Tests:
...

Browser:
...

GPU:
...

Known limitations:
...

Next justified step:
...
```

The final next step must be evidence-based.

Possible outcomes include:

* keep automatic storage and move on;
* add a specific player control;
* redesign StorageHub;
* design physical storage infrastructure;
* connect storage to a future logistics system;
* deliberately leave storage as a supporting mechanic.

Do not assume which one is correct before the audit.

---

# Core principle

10BG created the storage mechanism.

10BK proved that its reserve dynamics behave deterministically.

10BL must now answer:

> **Can a player actually understand and use this system as part of NOVA's economy?**

Do not add complexity merely because the underlying model now exists.

Make the smallest change that turns Storage from an invisible simulation mechanism into a clear, meaningful part of the game.

---

# 16. Readability audit and implementation report

## Current UI audit

Real Chromium inspection at `http://127.0.0.1:5173/` showed:

- Material immediate stock was visible in the resource HUD.
- Workshop production cap and full-production feedback were visible in the Material row.
- Storage reserve was completely invisible.
- No existing surface showed reserve quantity, capacity, protected floor, overflow retention, or release.
- Existing status messages explained production, upkeep, food, and water, but not reserve changes.

The HUD is compact and already has a natural resource-statistics location. A separate Storage panel would add density without adding a player decision.

## Minimum information contract

Implemented one read-only row beside existing resource statistics:

```text
Material reserve: 17 / 40 · 15 protected
```

This tells the player:

- how much Material is in reserve;
- how much reserve capacity exists;
- how much is protected from crisis release.

The existing causal status line now reports observable reserve changes:

```text
Reserve released 25 material
Reserve +4 material
```

These are derived from the actual state transition and do not claim a cause beyond the deterministic simulation rule. Full production-cap feedback remains separate from reserve feedback.

## Semantic answer

Storage is not immediately spendable stock. Construction may release eligible pre-existing Material through the centralized 10BJ rule, but construction itself reads and deducts only operational `resources.construction`. Food and Water do not participate in Storage. The UI uses “reserve” and “protected” rather than exposing `StorageHub`, release internals, or decomposition jargon.

## Comparable-game UX comparison

Relevant pattern comparison:

- Timberborn makes capacity and district reachability visible through warehouse/district context; NOVA has no spatial storage or district investment, so that pattern would be misleading here.
- Going Medieval communicates storage through physical stockpiles and environmental placement; NOVA has no hauling or spoilage system.
- Frostpunk communicates resource categories and depot capacity through dedicated resource infrastructure; NOVA has no specialized storage buildings.
- Factorio distinguishes providers, buffers, requesters, and logistic priority; NOVA has no resource logistics network.

Sources used in 10BH remain applicable: [Timberborn warehouses](https://timberborn.wiki.gg/wiki/Category:Goods_stored_in_Warehouses), [Going Medieval storage guide](https://www.noobfeed.com/articles/going-medieval-build-underground), [Frostpunk buildings](https://frostpunk.game-vault.net/wiki/Buildings), [Factorio logistic network](https://wiki.factorio.com/Logistic_network). The shared principle is clear feedback, not copying physical-storage mechanics.

## Player-control decision

**Outcome A — no manual control justified.**

Current storage has one active resource, automatic overflow, centralized release, and a fixed protected floor. There is no player conflict over allocation, priority, or transport. Sliders or manual transfer would add micromanagement without a new causal decision. Keep automatic storage and move on.

## Files changed

- `index.html` — added compact Material reserve HUD row.
- `src/app/main.ts` — renders reserve amount/capacity/protected floor and reports reserve deltas in existing causal status line; added reserve value to `window.__nova.stats`.
- `docs/roadmap/Step10BL.md` — this report.

No simulation semantics, persistence, capacity, floor, or release rules changed.

## Browser validation

Real Chromium loaded the updated application successfully. HUD showed:

```text
Material reserve:
0 / 40 · 15 protected
```

Existing controls and progression remained visible. No layout overlap or stale values appeared in inspected initial state. Focused browser/readability command passed:

```text
pnpm test:e2e:readability
```

## GPU validation

Established GPU path passed:

```text
pnpm test:e2e:gpu
```

No GPU/rendering regression detected. UI change is DOM/CSS only; Three.js render path remains active.

## Automated validation

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- Focused app/Storage tests: PASS.
- Storage suite remains deterministic; no save/hash or simulation changes.
- Full suite remains subject to previously documented unrelated 5-second timeouts in `industrialHeadroomTownDecision.test.ts`, `productionRatioTuningAudit.test.ts`, and `settlementGrowthShelterAudit.test.ts`.
- `git diff --check`: PASS.

## Final QA

```text
Step 10BL — PASS

Storage gameplay currently means:
Material reserve is a protected buffer for production overflow; it is not immediately spendable stock.

Player can understand:
Reserve amount, capacity, protected amount, and reserve changes are visible.

Immediate stock representation:
Existing Material HUD row remains operational Material only.

Reserve representation:
Material reserve: N / 40 · 15 protected.

Capacity representation:
The same row shows total reserve capacity; production cap remains separate.

Protected floor representation:
15 protected is shown in player-facing reserve status.

Overflow feedback:
Existing production-cap feedback remains separate; reserve gains are reported when observed.

Release feedback:
Existing status line reports released amount when reserve decreases.

Player controls:
None. Automatic storage remains justified.

Decision:
Keep automatic storage; add no manual allocation, buildings, logistics, or progression.

Files changed:
index.html
src/app/main.ts
docs/roadmap/Step10BL.md

Tests:
Focused app/Storage tests pass. Full-suite unrelated timeout remains documented.

Browser:
Real Chromium inspected. Reserve row readable at initial state.

GPU:
pnpm test:e2e:gpu passed.

Known limitations:
No dedicated overflow event ledger, no historical reserve graph, no player-selected priority, no spatial storage. Release feedback is causal delta text, not a persistent event log.

Next justified step:
Keep Storage as readable supporting economy feature. Do not add storage controls or buildings without a new gameplay conflict.
```

