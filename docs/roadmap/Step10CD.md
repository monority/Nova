# NOVA — Step 10CD — Next Gameplay Pressure Implementation

## Baseline

* Previous commit: `d1c1cb4`
* Previous step: `Step 10CC — Production Ratio Audit Timeout Resolution`
* Previous design/audit step: `Step 10CA — Next Gameplay Pressure Audit`
* SAVE_VERSION: `8`

---

# Objective

Implement the **single minimum gameplay mechanic identified by Step 10CA** as the next genuinely meaningful player pressure.

This is the first gameplay implementation after the simulation contract freeze.

The implementation must be derived from the actual findings of:

`docs/roadmap/STEP10CA.md`

Do not invent a different mechanic.

Do not broaden the scope.

Do not implement multiple candidate pressures.

---

# 1. Read the audit first

Before changing code, read:

* `docs/roadmap/STEP10CA.md`
* `docs/roadmap/Step10BZ.md`
* `docs/roadmap/Step10BY.md`
* the implementation relevant to the selected pressure.

Treat the conclusion of 10CA as the design input.

Identify:

1. the selected/minimum meaningful next mechanic;
2. the player problem it addresses;
3. the existing systems it reuses;
4. the minimum new state required;
5. the minimum new rules required;
6. the intended trade-off;
7. the persistence implications;
8. the UI implications;
9. the deterministic implications.

If `STEP10CA.md` does not contain a sufficiently concrete conclusion, **stop and report the missing design information rather than inventing a mechanic**.

---

# 2. Scope lock

Implement exactly one new gameplay capability.

Do not simultaneously add:

* another resource;
* another building;
* another workforce role;
* another progression stage;
* logistics;
* transportation;
* pollution;
* happiness;
* research;
* technology;
* events;
* disasters;
* automation;
* unrelated UI improvements;
* unrelated architectural refactors.

Existing systems may be modified only where required to integrate the selected mechanic.

---

# 3. Preserve the simulation contracts

The contracts established by 10BZ remain authoritative.

Preserve:

### Workforce

* valid assignments;
* one workplace per colonist;
* correct worker counts;
* deterministic reassignment;
* unassigned colonists.

### Economy

* stock/rate distinction;
* existing Farm/Well/Workshop rules unless 10CA explicitly identified one as the new pressure;
* resource safety;
* existing storage semantics.

### Progression

* Village/Town semantics unless the selected mechanic explicitly requires an existing progression condition to evolve;
* Town workforce review;
* deterministic derived progression.

### Persistence

* authoritative state only;
* derived values remain derived;
* save/load equivalence.

### Determinism

Equivalent logical states must continue producing equivalent simulation results and hashes.

---

# 4. Minimum-state principle

Before adding any state, prove why it cannot be derived from existing state.

For every new persisted field, answer:

> Why can this not be calculated from the existing authoritative state?

Prefer derived state whenever possible.

If new persistent state is genuinely required:

* add it explicitly;
* update serialization;
* update loading;
* update hashing;
* update deterministic equality;
* update fixtures;
* add the necessary migration;
* increment `SAVE_VERSION` only if the format genuinely changes.

Do not add persistence merely for convenience.

---

# 5. Define the mechanic formally

Before implementation, write down the exact rule.

Document:

### Inputs

Which existing/new state is read?

### State

What changes?

### Trigger

When does it happen?

### Timing

Does it occur:

* immediately;
* per tick;
* at construction;
* at reassignment;
* at progression;
* through an explicit command?

Use the existing simulation architecture.

### Consequence

What changes for the player?

### Reversibility

Can the player recover/reconfigure?

### Boundary behavior

What happens at:

* zero;
* minimum;
* maximum;
* unavailable;
* invalid;
* partially configured states?

### Determinism

What ordering, if any, is involved?

The implementation must follow this rule exactly.

---

# 6. Preserve decision quality

The mechanic must create an actual player decision.

Verify that the player can meaningfully choose between at least two states with different consequences.

Do not implement a mechanic where:

* one choice is always objectively dominant;
* the player merely clicks a mandatory button;
* the mechanic adds a tax without a decision;
* the player performs repetitive maintenance;
* the new system makes Farm/Well/Workshop allocation irrelevant.

The existing three-way workforce trade-off must remain meaningful unless 10CA explicitly demonstrated that the new mechanic is intended to transform it.

---

# 7. Avoid spreadsheet inflation

Do not create unnecessary numbers.

Every new value must have a gameplay reason.

Avoid:

```text
resource A
→ resource B
→ resource C
→ maintenance D
→ efficiency E
→ modifier F
```

when a simpler rule produces the same decision.

Prefer:

* existing resources;
* existing buildings;
* existing workforce;
* existing spatial rules;
* existing progression.

Reuse before adding.

---

# 8. Domain/application implementation

Follow the architecture frozen in 10BZ.

### Domain

Contains:

* pure rules;
* authoritative state;
* deterministic calculations;
* domain invariants.

Must not contain:

* React;
* browser APIs;
* rendering concerns;
* UI strings where avoidable.

### Application

Contains:

* commands;
* orchestration;
* state transitions;
* persistence integration where appropriate.

### Rendering/UI

Contains:

* presentation;
* interaction;
* visualization of the new capability.

Do not move simulation rules into React components.

---

# 9. UI implementation

Only expose the information necessary to understand and operate the new mechanic.

Reuse existing UI patterns wherever possible.

Do not introduce:

* a new dashboard;
* a new modal system;
* a new inspector architecture;
* a new navigation system;
* decorative UI unrelated to the mechanic.

The UI should answer:

1. What is happening?
2. Why is it happening?
3. What can the player change?
4. What consequence will that change have?

If the mechanic can be understood through existing inspection/HUD/progression surfaces, prefer that.

---

# 10. Tests

Create focused tests for the new mechanic.

At minimum cover:

### Happy path

The intended mechanic works.

### Opposite choice

The alternative decision produces the expected different consequence.

### Boundaries

* zero;
* minimum;
* maximum;
* missing dependency;
* invalid input.

### Reversibility

If the mechanic is reversible, verify both directions.

### Workforce interaction

Verify interaction with existing Farm/Well/Workshop allocation.

### Tick behavior

If tick-based, verify exact timing.

### Progression

Verify Village/Town interactions where relevant.

### Persistence

If state is persisted:

```text
simulate
→ save
→ load
→ continue
```

must match uninterrupted simulation.

### Determinism

Equivalent states must produce equivalent results/hashes.

### Regression

Existing three-way economy tests must remain valid.

---

# 11. Test the decision, not the implementation

Avoid tests that merely assert internal function calls.

Prefer:

* resulting state;
* resource consequences;
* production consequences;
* progression consequences;
* derived queries;
* persisted equivalence.

A test should fail if the player-visible simulation rule becomes wrong.

---

# 12. Existing regression suite

Run all relevant existing tests:

* workforce;
* Farm;
* Well;
* Workshop;
* economy;
* roads/accessibility;
* progression;
* Town;
* persistence;
* determinism;
* hardening;
* contract freeze;
* 10CA audit fixtures.

Then run:

* full Vitest;
* typecheck;
* lint;
* build.

Expected final state:

```text
Full Vitest: 100% passing
```

Do not accept unrelated failures silently.

---

# 13. Browser implementation validation

Because this is now a real gameplay feature, headed browser validation is mandatory.

Verify:

### Desktop

`1280×800`

### Mobile

`420×740`

`360×640`

Verify:

* mechanic is understandable;
* new state is visible when relevant;
* interaction works;
* existing allocation UI still works;
* Town UI still works;
* no console errors;
* no visual regression;
* no impossible interaction state.

---

# 14. GPU/WebGL2

Run the existing GPU/WebGL2 headed validation.

Expected environment:

* NVIDIA RTX 3070;
* WebGL2;
* existing NOVA GPU harness.

Verify:

* scene renders;
* new mechanic does not break rendering;
* no runtime errors;
* no obvious performance regression.

Do not change visual quality merely to pass the test.

---

# 15. Performance

Measure the new mechanic where relevant.

Pay attention to:

* per-tick work;
* repeated scans;
* unnecessary allocations;
* React rerenders;
* rendering updates;
* derived queries.

The mechanic should not introduce an avoidable hot-path cost.

Do not prematurely optimize.

---

# 16. Documentation

Create:

`docs/roadmap/STEP10CD.md`

Include:

## Step 10CD — Next Gameplay Pressure Implementation

### Baseline

`d1c1cb4`

### 10CA finding

Quote/paraphrase the exact design conclusion from 10CA.

### Player problem

What new problem is the player solving?

### Rule

Precise simulation rule.

### State

Persisted vs derived.

### Integration

How it connects to existing Farm/Well/Workshop/workforce/roads/progression.

### Player decision

What choices now exist?

### Trade-off

What is gained and sacrificed?

### UI

How the player understands and controls it.

### Persistence

Whether `SAVE_VERSION` changed and why.

### Determinism

How deterministic behavior is preserved.

### Performance

Relevant observations.

### Validation

Exact results.

### Scope confirmation

State explicitly:

> One new gameplay mechanic was implemented.

And:

> No unrelated gameplay system was added.

---

# 17. User-owned files

Do not modify:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

They remain untouched and untracked.

---

# 18. Diff audit

Before committing:

```text id="j7xk3p"
git status
git diff --check
git diff --stat
git diff
```

Verify:

* only the selected mechanic;
* its tests;
* its documentation;
* required integration changes;
* no unrelated cleanup;
* no generated artifacts;
* no accidental roadmap modifications.

---

# 19. Commit

Commit exactly:

`Step 10CD: Implement Next Gameplay Pressure`

Do not amend:

`d1c1cb4`

Do not mix unrelated fixes into this commit.

---

# 20. Final report

Return:

* commit hash;
* exact mechanic implemented;
* 10CA finding that justified it;
* new state;
* new rules;
* player decision;
* trade-off;
* UI changes;
* persistence changes;
* determinism impact;
* performance observations;
* focused test results;
* compatibility results;
* full Vitest count;
* typecheck;
* lint;
* build;
* browser results at all 3 viewports;
* GPU/WebGL2 result;
* diff audit;
* confirmation that user-owned files remain untouched.

Most importantly:

> **Do not invent a different feature from the one identified by 10CA.**
>
> **Do not implement a second mechanic "while we're here".**
>
> **Keep the implementation as small as possible while making the new player decision genuinely meaningful.**

---

# Documentation (as-built — design stop)

## Gate result

Step 10CD did not implement a gameplay mechanic. Its prerequisite design input is intentionally inconclusive: Step 10CA concluded:

> No new mechanic is justified yet.

Step 10CA measured three candidates but explicitly recommended another measurement/design gate before implementation. Its Water headroom direction is conditional, not a selected mechanic. Implementing it now would invent a feature rather than implement the identified conclusion.

## Exact blocker

The missing design information is a concrete, measured pressure that:

- persists at a meaningful scale;
- cannot be handled by existing placement, composition, manual reassignment, or Construction Crew;
- creates a new player decision rather than a rate readout;
- has a defined minimum rule and reversibility contract.

The current evidence does not establish that threshold.

## No implementation

- Runtime code: unchanged.
- UI: unchanged.
- Commands: unchanged.
- Resources/buildings/progression: unchanged.
- Persistence: unchanged.
- `SAVE_VERSION`: remains 8.
- Scenarios: unchanged.

## Validation

- Baseline full Vitest from Step 10CC: 1,707 / 1,707 PASS.
- No new tests or production changes were required for this design stop.
- Browser/GPU: not rerun; no implementation occurred.
- `git diff --check`: documentation-only result is clean.

## Next justified step

Run another focused measurement/design audit at larger mixed Town compositions, specifically testing whether Water headroom repeatedly forces a distinct decision after existing Farm/Well/Workshop allocation controls are exhausted. Do not implement Water planning, Construction expansion, spatial composition, or any other candidate until that evidence selects one.

## Scope confirmation

No gameplay functionality was added. Step 10CD stopped at its explicit insufficient-design gate rather than inventing a mechanic.

## Commit

`340d030` — Step 10CD: Implement Next Gameplay Pressure


