# NOVA — Step 06A — Population Growth & Playability Audit

## Objective

Before implementing the next population mechanic, perform a **design + playability audit** of the current NOVA build.

This is an **AUDIT-ONLY STEP**.

Do NOT modify simulation code, UI code, tests, E2E infrastructure, or architecture.

The purpose is to determine:

1. what the current population loop actually does;
2. what the authoritative design documents intend;
3. whether the current loop is coherent as a city-builder;
4. whether a real player can understand what is happening;
5. what the smallest next population mechanic should be.

This step must include an actual browser playability test.

Do not consider passing tests sufficient evidence of playability.

---

# 1. Repository and documentation audit

Read the relevant authoritative documents first:

```text
docs/00-CMD.md
docs/02-game-design.md
docs/03-core-loop.md
docs/07-population.md
docs/08-economy.md
docs/09-economy-foundation.md
docs/11-time-and-events.md
docs/22-canonical-simulation.md
docs/26-roadmap.md
docs/29-design-rules.md
docs/roadmap/Step05B.md
```

Then inspect the current implementation:

```text
src/domain/population/
src/domain/housing/
src/domain/resource/
src/domain/simulation/
src/application/
src/app/
src/renderer/
tests/
e2e/
```

Reconstruct the actual current population lifecycle.

Document it as a causal chain.

For example:

```text
Residence built
→ operational
→ housing capacity
→ admission condition
→ colonist admitted
→ food consumption
→ starvation / survival
```

Do not assume the previous reports are still perfectly accurate. Verify against the current repository.

---

# 2. City-builder coherence audit

Answer explicitly:

### Population

* What causes a colonist to exist?
* What causes a colonist to be admitted?
* What prevents admission?
* What causes population to increase?
* What causes population to decrease?
* Is population currently a meaningful simulation variable or mostly a representation?

### Housing

* Does housing merely provide capacity?
* Is housing causally connected to population?
* What happens when housing is insufficient?

### Food

* Does food currently create a meaningful population constraint?
* Is food consumption understandable?
* Is starvation understandable?
* Is the current all-or-nothing starvation rule coherent with the documented MVP?

### Growth

Determine from the authoritative docs whether the next intended mechanic is:

* automatic population growth;
* immigration/admission;
* household formation;
* birth/growth;
* settlement viability;
* another mechanism.

Do not invent a mechanism because it seems typical of city-builders.

Use the repository's actual design.

---

# 3. REAL PLAYABILITY TEST — mandatory

This is the most important part of this audit.

Launch the actual application in a real browser using the established E2E/browser infrastructure.

Do not test only through unit tests or direct simulation calls.

Play the game as if you were a first-time player.

Do NOT read source code during the first playability pass.

---

## 3.1 First-impression test

Start from a clean initial state.

Before interacting, record:

* what is immediately understandable;
* what is unclear;
* what the player appears expected to do;
* whether there is a visible objective;
* whether the available controls communicate their purpose.

Do not use implementation knowledge to fill gaps.

Report:

```text
FIRST IMPRESSION
Understandable:
- ...

Unclear:
- ...

Player's likely assumption:
- ...
```

---

# 4. Blind interaction test

Perform the simplest plausible player actions.

Use the real mouse/keyboard and visible UI.

Test:

1. placing a building;
2. observing construction;
3. waiting/stepping;
4. observing operational state;
5. observing colonist admission;
6. observing food consumption;
7. continuing until shortage;
8. observing starvation;
9. attempting to recover/grow again.

Do not optimize the sequence based on source knowledge.

The purpose is to discover whether the interface itself teaches the simulation.

---

# 5. Causal comprehension test

For every major transition, ask:

> Could a player understand WHY this happened from the UI alone?

Evaluate:

| Event                        | Visible? | Cause understandable? | Consequence understandable? |
| ---------------------------- | -------: | --------------------: | --------------------------: |
| Building placed              |          |                       |                             |
| Construction progresses      |          |                       |                             |
| Building becomes operational |          |                       |                             |
| Colonist appears             |          |                       |                             |
| Food decreases               |          |                       |                             |
| Food shortage                |          |                       |                             |
| Colony starves               |          |                       |                             |
| Further admission blocked    |          |                       |                             |

Use:

```text
YES
PARTIAL
NO
```

Do not score the game globally.

This is a diagnostic table, not a ranking.

---

# 6. Player feedback audit

Inspect the visible feedback for:

* placement;
* invalid placement;
* insufficient construction resources;
* construction progress;
* operational state;
* colonist admission;
* food consumption;
* shortage;
* starvation;
* blocked admission.

For each, determine whether the player gets:

```text
Action
→ Immediate feedback
→ State change
→ Explanation
```

Identify gaps.

Do not implement fixes during this step.

---

# 7. Information hierarchy audit

Without redesigning the UI, determine whether the current information hierarchy is sufficient.

Specifically inspect:

### Global state

Can the player understand:

```text
Population
Housing
Construction material
Food
```

at a glance?

### Selected building

Can the player understand:

```text
what it is
what it costs
whether it is under construction
when it becomes operational
what capacity it provides
```

?

### Failure

When something does not happen, can the player determine why?

Examples:

```text
Why can't I place this?
Why wasn't a colonist admitted?
Why did the colony starve?
Why can't another colonist appear?
```

Again: audit only.

---

# 8. Playability friction

Identify concrete friction points.

Examples:

* no obvious next action;
* unclear controls;
* state changes too subtle;
* important information too small;
* shortage not noticeable;
* starvation appears arbitrary;
* player cannot tell whether time is running;
* player cannot distinguish preview from committed action;
* player does not know why admission happened;
* player does not know why admission stopped.

Do not invent hypothetical problems.

Only report issues actually observed during the browser session or clearly demonstrated by the current UI.

---

# 9. Temporal comprehension

Because NOVA is a simulation, explicitly test whether time is understandable.

Test:

```text
PAUSE
STEP
PLAY
speed changes
```

Determine:

* Can the player tell when a tick happened?
* Can the player understand what changed because of the tick?
* Does STEP produce understandable feedback?
* Does PLAY feel deterministic and observable?
* Are important events easy to notice?

Do not redesign the time controls yet.

---

# 10. Food loop playability

Perform the complete Food loop as a player.

Start:

```text
Food = 100
Population = 0
```

Build enough housing to admit multiple colonists.

Then observe:

```text
Population > 0
↓
Food decreases
↓
Food reaches shortage
↓
Population disappears
```

Do not inspect source code during this test.

Answer:

### Can the player understand that colonists consume food?

### Can the player understand that food is finite?

### Can the player anticipate the shortage?

### Can the player understand why the colony disappeared?

### Can the player understand why new colonists no longer appear?

If the answer is NO or PARTIAL, identify exactly what observable information is missing.

---

# 11. Visual inspection

If screenshots can actually be inspected in the current environment, inspect them.

Inspect at minimum:

```text
artifacts/food/01-initial.png
artifacts/food/02-colonists-fed.png
artifacts/food/03-shortage.png
artifacts/food/04-after-starvation.png
artifacts/food/05-rejected-growth.png
```

Look only at concrete UI/visual issues:

* hierarchy;
* readability;
* spacing;
* contrast;
* accidental overlap;
* visual state clarity;
* excessive empty space;
* confusing controls;
* important information being visually buried.

Do NOT start a visual redesign.

If screenshots cannot actually be viewed, explicitly report:

```text
Visual inspection: NOT EXECUTED
```

Do not infer visual quality from screenshot existence or file metadata.

---

# 12. Technical audit

After the blind playability pass, inspect implementation details.

Verify:

* simulation remains deterministic;
* browser UI reads real state;
* no duplicated simulation logic exists in UI;
* food state is canonical;
* population transitions remain deterministic;
* no hidden mutable state;
* no random/time dependency;
* E2E diagnostics remain read-only.

Run the existing relevant tests to ensure the audit itself did not expose a regression.

Do not modify anything.

---

# 13. Identify the smallest next population mechanic

Using:

1. authoritative design docs;
2. current implementation;
3. actual player experience;

identify the **single smallest next mechanic** required to move NOVA toward the intended population loop.

Do NOT propose a large population system.

The next mechanic must be:

* causally useful;
* understandable to the player;
* deterministic;
* compatible with the current architecture;
* testable;
* small enough for one implementation step.

Explicitly list alternatives considered and why they are not the immediate next step.

Do not rank them.

---

# 14. UI decision

Based on the playability audit, decide whether NOVA should:

### A. Continue gameplay-first

Current UI is sufficient to validate the next mechanic.

### B. Add a small UX correction step

The next mechanic is understandable technically but important causal information is missing.

### C. Stop gameplay temporarily for a UI/UX foundation step

Only choose this if the current UI materially prevents meaningful play/testing.

This must be evidence-based.

Do not choose a UI redesign simply because the current UI is visually basic.

---

# 15. No implementation

This step MUST NOT:

* add population mechanics;
* change food behavior;
* change UI;
* change renderer;
* refactor architecture;
* add generic abstractions;
* alter persistence;
* modify E2E behavior except if absolutely necessary to execute the audit, and if so report it explicitly.

If the current E2E tooling cannot perform the required playability test, diagnose the limitation rather than silently changing the product.

---

# 16. Final report

Return a structured report:

## 1. Current population model

Concrete causal chain.

## 2. Authoritative design intent

Relevant conclusions from the docs.

## 3. Real playability session

Describe exactly what was done in the browser.

Include:

* actions;
* observed state changes;
* unexpected behavior;
* understandable/unclear moments.

## 4. Causal comprehension

Use the event table.

## 5. Player friction

Only observed issues.

## 6. Food loop comprehension

Explicit answers to the five questions above.

## 7. Visual inspection

Only if actually performed.

## 8. Technical audit

Relevant validation results.

## 9. Next smallest mechanic

One concrete proposal grounded in the docs.

## 10. UI decision

One of:

```text
CONTINUE GAMEPLAY-FIRST
SMALL UX CORRECTION
UI/UX FOUNDATION REQUIRED
```

with evidence.

## 11. Scope integrity

Confirm no unintended product/code changes.

## 12. Final decision

Use exactly one:

```text
READY FOR IMPLEMENTATION
```

if the next mechanic is sufficiently defined.

or:

```text
DESIGN BLOCKED
```

if the audit reveals unresolved semantic/design questions.

Do not implement anything in this step.

Most importantly:

**Do not confuse passing automated tests with being playable.**

A green test suite proves that the implementation satisfies programmed assertions.

This audit must additionally establish whether a human player can understand and operate the current simulation through the actual browser UI.

