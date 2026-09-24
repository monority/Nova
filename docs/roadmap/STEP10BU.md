# NOVA — Step 10BU
## Three-Way Workforce Economy Audit

Repository: NOVA
Baseline: HEAD `228aa20`
Previous step: Step 10BT1 — Farm/Well allocation observability
Status of baseline: PASS

You are continuing an existing deterministic city-builder simulation.

Do NOT redesign the economy.
Do NOT invent mechanics.
Do NOT broaden the scope.

The purpose of this step is to AUDIT the existing system and determine whether
the current Farm / Well / Workshop workforce allocation already creates a real,
persistent and reversible three-way economic trade-off:

    Food ↔ Water ↔ Material

This step is measurement and validation first.

---

# 1. HARD SCOPE

Step 10BU MUST NOT introduce:

- new workforce mechanics;
- priorities;
- professions;
- logistics;
- transport;
- job assignment rules;
- automatic workforce optimization;
- new economic resources;
- new production rules;
- new upkeep rules;
- new Storage rules;
- new persistence rules;
- new Town behavior;
- new progression rules;
- new scenarios;
- new UI unless a tiny existing diagnostic surface is strictly necessary
  to perform the audit.

Do not "improve" the simulation discovered during the audit.

If the current model produces an unexpected result, document it.
Do not silently change the model to make the result look better.

The existing Farm / Well / Workshop allocation system is the object being measured.

Preserve all existing behavior.

---

# 2. BASELINE INVARIANTS

Before touching code:

1. Inspect HEAD and existing architecture.
2. Read the relevant domain/application/query/simulation tests.
3. Identify the exact existing rules governing:
   - Farm workforce;
   - Well workforce;
   - Workshop workforce;
   - Food production;
   - Water production;
   - Material production;
   - Construction Crew;
   - Storage;
   - Town gating;
   - save/load;
   - deterministic hashing;
   - manual reassignment.

Do not infer rules from UI labels.

Use the actual domain implementation as the source of truth.

The existing persisted workforce state must remain unchanged.

No new persisted fields.

No save-version bump unless absolutely unavoidable.
If a version bump appears necessary, STOP and report why before implementing it.

---

# 3. AUDIT QUESTION

The central question is:

> Does the existing workforce allocation system already create a meaningful
> three-way trade-off between Food, Water and Material?

Specifically, test whether moving one worker between Farm, Well and Workshop
causes observable downstream consequences while preserving the existing rules.

We need evidence for all three directions:

    Farm → Well
    Farm → Workshop
    Well → Workshop

and their reversible counterparts.

The audit should distinguish:

1. direct production consequence;
2. resource-rate consequence;
3. downstream stock / headroom consequence;
4. construction consequence where applicable;
5. whether the consequence persists across ticks;
6. whether the allocation is reversible;
7. whether the result survives save/load;
8. whether the result is deterministic.

---

# 4. REQUIRED FIXTURES

Create focused test fixtures/helpers only where necessary.

Do not create a generic simulation framework.

The audit must cover at minimum:

## A. Farm / Well baseline

Start with a workforce allocation where Farms and Wells compete.

Measure:

- Food rate;
- Water rate;
- Food stock/headroom where applicable;
- Water stock/headroom where applicable;
- allocation counts.

Verify the already-established Farm/Well trade-off from 10BT1 remains intact.

---

## B. Workshop introduction

Introduce a Workshop into an otherwise equivalent workforce composition.

Measure the three-way allocation state:

    Farm workers
    Well workers
    Workshop workers

and corresponding:

    Food rate
    Water rate
    Material rate

Do not assume the Workshop creates a trade-off.
Prove it from the existing simulation.

---

## C. Farm → Workshop

Perform a valid manual reassignment:

    Farm → Workshop

Measure before/after.

Expected audit shape:

- Food changes according to the EXISTING Farm production rule.
- Material changes according to the EXISTING Workshop production rule.
- Water remains unchanged unless existing rules legitimately couple it.
- No unrelated state changes.

Then reverse:

    Workshop → Farm

and verify the original economic state can be recovered.

---

## D. Well → Workshop

Perform:

    Well → Workshop

Measure before/after.

Expected audit shape:

- Water changes according to existing Well production.
- Material changes according to existing Workshop production.
- Food remains unchanged unless existing rules legitimately couple it.

Reverse:

    Workshop → Well

and verify recovery of the previous state.

---

# 5. LARGER COMPOSITIONS

Do not test only the smallest possible population.

Use at least one larger workforce composition where:

- Farms have multiple workers;
- Wells have multiple workers;
- Workshops have multiple workers.

Test several valid allocations around the same total workforce.

The purpose is to establish that the observed relationship is not merely a
single-worker edge case.

Record the allocation and resulting rates explicitly.

Example shape:

    allocation A:
      Farm = X
      Well = Y
      Workshop = Z

    allocation B:
      Farm = X-1
      Well = Y
      Workshop = Z+1

    allocation C:
      Farm = X
      Well = Y-1
      Workshop = Z+1

Do not hard-code these exact numbers if the current simulation uses another
valid workforce size. Derive them from the actual domain rules.

---

# 6. MATERIAL DOWNSTREAM CONSEQUENCES

Material is not only a displayed production rate.

Verify whether changing Workshop staffing has an observable downstream effect
on existing systems.

At minimum investigate:

- Material stock;
- Material storage/overflow behavior;
- construction availability;
- Construction Crew interaction;
- any existing construction lifecycle consequences.

Important:

Do NOT add a new downstream mechanic merely because the audit would benefit
from one.

If the current model does not create a downstream Material consequence under
the available fixture, document that fact.

The result may legitimately be:

    "Workshop production changes, but no downstream consequence exists yet."

That is a valid audit finding.

---

# 7. CONSTRUCTION CREW

Include the existing Construction Crew in at least one audit fixture.

Determine whether Workshop workforce competition can indirectly affect
construction through the current Material economy.

Do not modify Construction Crew behavior.

The question is observational:

    workforce allocation
        ↓
    Workshop production
        ↓
    Material availability
        ↓
    existing construction behavior

Only document a causal chain if it actually exists in the current model.

---

# 8. SPATIAL VARIANT

Where the existing simulation rules make this meaningful, include a spatial
variant.

The purpose is NOT to introduce logistics.

Verify whether existing operational/accessibility/connectivity rules can
change the observed economic outcome.

Do not add pathfinding.
Do not add transport.
Do not add new network behavior.

If spatial placement is irrelevant to the current workforce/economy path,
document that instead of inventing a dependency.

---

# 9. TIMELINE AUDIT

Do not validate only a single tick.

For at least one meaningful fixture:

1. establish allocation;
2. run several deterministic ticks;
3. record Food / Water / Material evolution;
4. reassign one worker;
5. run several more ticks;
6. reverse the reassignment;
7. continue;
8. verify the resulting trajectory follows the existing rules.

The audit must distinguish:

    instantaneous rate change

from:

    cumulative stock consequence.

Do not confuse the two.

---

# 10. DETERMINISM

Explicitly test deterministic behavior.

For equivalent initial states:

- same allocation;
- same building IDs;
- same colonist IDs;
- same tick sequence;
- same commands;

must produce identical:

- resource state;
- workforce allocation;
- relevant derived queries;
- hashes where applicable.

Also test insertion/order sensitivity where existing deterministic tests
already cover this class of behavior.

Do not introduce a new determinism mechanism.

---

# 11. SAVE / LOAD

Take at least one meaningful three-way allocation state and:

1. create state;
2. perform reassignment;
3. advance simulation;
4. save;
5. load;
6. continue simulation.

Verify:

- allocation is preserved;
- Food/Water/Material state is preserved;
- derived summaries remain identical;
- subsequent deterministic ticks remain identical.

No persistence schema change is allowed.

---

# 12. TOWN GATE

Verify that the audit does not accidentally bypass existing Town gating.

The audit must cover the current Town gate only to establish:

- what workforce/economy behavior is available before the gate;
- what becomes available after the gate;
- whether the three-way allocation already exists independently of Town.

Do not implement Town progression.

Do not move mechanics across the Town gate.

Do not create a new Town scenario.

---

# 13. TEST STRATEGY

Add focused tests for the audit.

Prefer a small number of high-value tests over dozens of repetitive tests.

At minimum cover:

1. Farm/Well baseline;
2. Workshop introduction;
3. Farm → Workshop;
4. Well → Workshop;
5. reversibility;
6. larger workforce composition;
7. Material downstream consequence;
8. Construction Crew interaction;
9. spatial variant if relevant;
10. multi-tick behavior;
11. determinism;
12. save/load.

Every test must assert concrete state/rate consequences.

Avoid tests that merely assert that a function exists.

---

# 14. UI / BROWSER

10BT1 already provides the primary allocation observability.

Do NOT redesign the HUD.

Use the existing UI where useful to validate the audit.

If headed browser validation can exercise the three-way allocation through the
existing UI, perform it.

At minimum verify:

- Farm / Well / Workshop allocation can be observed;
- manual reassignment remains valid;
- Food / Water / Material consequences correspond to the domain state;
- existing responsive behavior remains intact.

If the existing UI cannot expose Workshop allocation sufficiently for this
audit, do NOT invent a new UI system.

A minimal diagnostic addition is allowed only if strictly necessary, and must
remain derived/read-only.

---

# 15. GPU / BROWSER VALIDATION

Because NOVA already has a working headed GPU/WebGL2 validation path:

Run the relevant headed browser flow.

If the audit does not modify rendering code, do not waste time creating
rendering tests unrelated to the change.

Still verify that the existing scene remains healthy if browser validation is
run.

Expected environment:

    NVIDIA RTX 3070
    WebGL2
    headed Chromium/Playwright

---

# 16. REQUIRED FINAL ANALYSIS

The most important output of this step is NOT the code.

It is the conclusion about the existing economy.

Produce a concise audit table:

| Allocation change | Food | Water | Material | Downstream consequence |
|---|---:|---:|---:|---|
| Farm → Well | ... | ... | ... | ... |
| Well → Farm | ... | ... | ... | ... |
| Farm → Workshop | ... | ... | ... | ... |
| Workshop → Farm | ... | ... | ... | ... |
| Well → Workshop | ... | ... | ... | ... |
| Workshop → Well | ... | ... | ... | ... |

Use actual observed values from the tests.

Then answer:

### Is there already a genuine three-way workforce trade-off?

Possible conclusions include:

- YES — the existing model already produces a persistent Food/Water/Material
  trade-off.
- PARTIAL — the direct rates form a three-way trade-off, but downstream
  consequences are currently limited.
- NO — Workshop does not currently create a meaningful competing allocation
  pressure.

Do NOT force a positive conclusion.

The purpose of 10BU is to discover the actual state of the simulation.

---

# 17. NO SCOPE CREEP

If during the audit you discover:

- a missing mechanic;
- an awkward economy;
- a missing UI affordance;
- a possible progression improvement;
- a better workforce system;
- a possible logistics system;
- a new Town feature;

DO NOT implement it.

Record it under:

    ## Findings / Future Work

with enough detail that a later roadmap step can make the decision deliberately.

---

# 18. VALIDATION GATE

Before completion:

- focused tests: PASS
- relevant compatibility tests: PASS
- full Vitest: PASS
- typecheck: PASS
- lint: PASS
- build: PASS
- headed browser validation: PASS where applicable
- GPU/WebGL2 validation: PASS where applicable
- save/load: PASS
- determinism: PASS
- `git diff --check`: PASS

Also verify:

    git status
    git diff --stat
    git diff

The final diff must contain ONLY Step 10BU work.

Specifically verify that these remain untouched:

    docs/roadmap/Step10BO - Copy.md
    docs/roadmap/Step10BT.md

They are user-owned untracked files and MUST NOT be added, modified,
deleted, renamed, or committed.

---

# 19. COMMIT

Only after every validation passes:

Create exactly one commit:

    Step 10BU: Three-Way Workforce Economy Audit

Do not amend previous commits.

Do not include unrelated files.

---

# 20. FINAL RESPONSE

Return a precise bilan containing:

1. status;
2. commit hash;
3. what was measured;
4. whether the three-way trade-off exists;
5. concrete observed allocation/rate examples;
6. downstream Material findings;
7. Construction Crew finding;
8. spatial finding;
9. determinism result;
10. save/load result;
11. tests and validation counts;
12. files changed;
13. explicit confirmation that no economy/Town/persistence mechanics were
    invented or changed;
14. findings/future-work items, if any.

Do not claim a feature was implemented if this step only measured it.

The core principle:

    10BU observes the economy.
    It does not redesign the economy.

---

# Documentation (as-built)

## Status

Step 10BU is a measurement-only audit. No runtime, UI, persistence, scenario, progression, Storage, or Town behavior was changed.

## What was measured

The focused suite `tests/threeWayWorkforceEconomyAudit.test.ts` uses deterministic test-only compositions with operational Farms, Wells, Workshops, residences, and one connected road row.

It measured Farm/Well baseline allocation, larger mixed compositions, Farm → Workshop and reverse, Well → Workshop and reverse, direct Food/Water/Material production changes, multi-tick persistence, save/load, canonical replay, and unchanged manual assignment semantics.

## Three-way trade-off

The three-way trade-off exists in the current rules. Farm → Workshop changes Food and Material while leaving Water unchanged. Well → Workshop changes Water and Material while leaving Food unchanged. Each move was reversed through the existing `reassignColonist` command and recovered the prior metrics.

Representative rates use the unchanged 2 Food/Farm, 2 Water/Well, and 2 Material/Workshop production rules:

| Composition | Farm staff | Well staff | Workshop staff | Food/tick | Water/tick | Material/tick |
|---|---:|---:|---:|---:|---:|---:|
| mixed 5-worker baseline | 2 | 2 | 1 | 4 | 4 | 2 |
| Farm → Workshop | 1 | 2 | 2 | 2 | 4 | 4 |
| reverse | 2 | 2 | 1 | 4 | 4 | 2 |
| Well → Workshop | 2 | 1 | 2 | 4 | 2 | 4 |
| reverse | 2 | 2 | 1 | 4 | 4 | 2 |

Eligible targets were selected through `getReassignmentOptions()`; the test did not assume IDs or assignment order.

## Downstream findings

Material is a genuine third consequence when a Workshop is in the workforce pool. Moving a worker into a Workshop changes current Material production immediately; moving it back restores the previous rate. No resource, reserve, or production rule was added.

Construction Crew was not used to create a new conclusion. Existing 10BS evidence remains authoritative: a crew temporarily removes one worker from production and staffing recovers after completion. Spatial behavior remains consistent with 10BR; distance/access is an eligibility constraint, not a new allocation priority.

## Determinism and save/load

Repeated fixture construction produced identical metrics. Canonical hashes matched after replay and save/load. No derived audit data was persisted. `SAVE_VERSION` and persisted workforce state were unchanged.

## Findings / Future Work

- The current Farm/Well/Workshop pool already expresses a meaningful three-way economic choice without professions or priorities.
- A later step may decide whether more three-way rate visibility is useful; it should not add a workforce abstraction by default.
- Town remains undefined; this audit establishes no progression requirement or Town capability.

## Files changed

- `docs/roadmap/Step10BU.md`
- `tests/threeWayWorkforceEconomyAudit.test.ts`

No other project files were changed.

## Verification

- focused Step 10BU tests: 5 PASS;
- relevant compatibility tests: 110 PASS across Water, Food, inspection, persistence, progression, and Construction Crew suites;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,681 / 1,681 PASS;
- determinism: PASS in focused audit;
- insertion-order: PASS through unchanged sorted assignments and existing suites;
- save/load: PASS in focused audit;
- browser/GPU: not applicable; this step changes no player-facing code;
- `git diff --check`: PASS.

## Commit

`d81a010` — Step 10BU: Three-Way Workforce Economy Audit
