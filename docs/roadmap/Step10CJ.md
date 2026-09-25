# Step 10CJ — Town Scenario Experience Audit

## Mission

Audit the actual player experience created by:

- `Step 10CH — Town Product Direction Gate`
- `Step 10CI — Town Goal Coverage`

10CH identified a concrete product gap:

```text
Simulation / Progression → Town
Goals / Scenarios        → Village
```

10CI closed that gap by adding three Town-targeted scenarios using the existing scenario/objective system:

- `town-threshold`
- `town-balance`
- `town-connection`

The purpose of 10CJ is **not to invent another mechanic**.

The purpose is to answer:

> **Did Town Goal Coverage actually turn Town into a meaningful authored gameplay endpoint, or did it merely repackage the existing Town milestone?**

This is an experience audit, not an implementation step.

---

# 1. Read first

Before drawing conclusions, inspect:

```text
docs/roadmap/STEP10CH.md
docs/roadmap/Step10CI.md
docs/roadmap/STEP10CG.md
docs/roadmap/STEP10CF.md
```

Then inspect the actual current implementation:

- `src/application/scenarios.ts`
- scenario catalogue;
- scenario assembler;
- objective query/evaluation;
- objective display;
- scenario selection UI;
- scenario start-state construction;
- Town progression;
- all Town Goal Coverage tests;
- existing scenario tests;
- relevant E2E tests.

Do not assume the 10CI report is still perfectly representative. Verify it against the repository.

---

# 2. Reconstruct the three scenarios

For each scenario, document the actual experience from the starting state to Town.

Use:

```text
town-threshold
town-balance
town-connection
```

For each one determine:

- starting population;
- buildings;
- resources;
- workforce;
- roads;
- accessibility;
- current progression state;
- objective shown to player;
- required player actions;
- consequences of those actions;
- Town completion condition;
- what changes at completion.

Produce a compact scenario flow:

```text
Start state
    ↓
Player understands problem
    ↓
Player acts
    ↓
Simulation responds
    ↓
Player approaches Town
    ↓
Reach Town
```

Do this from actual code and browser behavior.

---

# 3. Scenario discoverability

Audit the real scenario selection experience.

Verify:

- all three Town scenarios are visible;
- titles are understandable;
- descriptions communicate their purpose;
- Town relation is discoverable;
- scenarios are distinguishable without reading source code;
- selecting a scenario behaves correctly;
- starting states correspond to the selected scenario.

Use actual browser validation where the scenario UI is exposed.

Test:

```text
1280 × 800
420 × 740
360 × 640
```

Do not redesign the interface.

The question is only whether the current UI communicates the authored content adequately.

---

# 4. Distinctness audit

The three scenarios intentionally use the same final objective:

```text
stage: town
```

That is acceptable architecturally.

The question is whether the **journey to that objective** is meaningfully different.

For each pair:

```text
Threshold ↔ Balance
Threshold ↔ Connection
Balance   ↔ Connection
```

determine whether the player is presented with a genuinely different problem.

Distinguish:

### Meaningful difference

The player must reason differently because the initial state creates a different problem.

### Cosmetic difference

The starting numbers differ, but the optimal/reasonable player behavior is effectively identical.

Do not assign scores.

Do not rank the scenarios.

---

# 5. Goal comprehension

For each scenario answer:

> If the player only sees the current scenario UI, can they understand what they are trying to achieve?

Check:

- objective wording;
- scenario title;
- scenario description;
- current simulation state;
- relationship between actions and Town;
- progress feedback.

Pay special attention to:

```text
Reach Town
```

Determine whether this is enough in context or whether the surrounding authored scenario information provides the missing meaning.

Do not modify the UI during this step.

---

# 6. Causal comprehension

This is more important than objective comprehension.

A player may know:

> “I need to reach Town.”

without understanding:

> “Why am I doing these things?”

For each scenario inspect the causal chain.

### Threshold

Verify whether the player can understand the relationship between:

```text
Workshop requirement
→ staffing
→ Town threshold
```

### Balance

Verify whether the player can understand the relationship between:

```text
population / Food pressure
→ Farm decision
→ stabilization
→ Town
```

### Connection

Verify whether the player can understand the relationship between:

```text
Workshop accessibility
→ road construction
→ operational access
→ Town
```

These relationships must emerge from existing simulation/UI facts.

Do not invent explanatory systems.

---

# 7. Player agency

Determine whether the scenarios create genuine choices or merely prescribe a sequence.

For each scenario ask:

- Is there more than one reasonable way to progress?
- Can the player make a mistake and recover?
- Do existing workforce decisions still matter?
- Do roads/accessibility still matter where relevant?
- Can the player understand consequences from the existing UI?
- Is the scenario merely a checklist?

Do not judge whether a scenario is "good" or "bad".

Describe what agency actually exists.

---

# 8. Town as endpoint

This is the central audit.

Observe what happens when the player reaches Town.

Document:

- objective state;
- scenario completion;
- progression state;
- UI feedback;
- available actions;
- whether anything new becomes available;
- whether the scenario ends immediately;
- whether the player understands that they have completed the authored goal.

Then answer:

> **Does Town currently feel like an authored destination?**

Use evidence from the actual experience.

Do not create a new feature to fix the answer.

---

# 9. The post-Town question

10CH identified that there was previously no authored motivation after Town.

10CI intentionally did **not** create a post-Town system.

Therefore explicitly inspect:

> What does the player experience immediately after completing a Town scenario?

Document the current behavior.

Do not assume that the absence of a post-Town system is automatically a defect.

Instead distinguish:

### A

Town is currently a sufficient scenario endpoint.

### B

Town is a coherent endpoint, but the overall product now clearly needs a post-Town direction.

### C

The scenarios do not yet make Town feel meaningful even as an endpoint.

### D

The scenario layer exposes a different unresolved product problem.

Do not score or rank these.

Select the description that most accurately matches the evidence.

---

# 10. Scenario repetition audit

Check whether adding three scenarios introduced catalogue repetition.

Look for:

- identical player actions;
- identical starting patterns;
- identical economic trajectories;
- identical Town path;
- descriptions that promise differences that do not exist.

Do not remove or rewrite scenarios automatically.

First document whether repetition is real.

---

# 11. Simulation interaction

Do not reopen the simulation design.

Instead verify whether 10CI successfully **uses** the existing simulation.

Check:

- workforce;
- Food;
- Water;
- Material;
- Workshop;
- Farm;
- roads;
- accessibility;
- Town progression.

Determine which systems are actually exercised by each scenario.

The objective is to verify that scenarios expose existing gameplay rather than bypass it.

---

# 12. No hidden scenario mechanics

Verify that 10CI did not accidentally introduce scenario-specific rules.

Check for:

- special resource handling;
- scenario-only production;
- scenario-only progression;
- hidden state;
- custom completion logic;
- hard-coded shortcuts;
- objective evaluator changes beyond the documented display label.

If any are found, document them.

Do not silently expand scope to repair unrelated architecture.

---

# 13. Product quality classification

After the investigation, classify the current experience using exactly one of these descriptive categories:

```text
A — Town is now a meaningful and legible authored endpoint.

B — Town is meaningful, but important communication problems remain.

C — Town is clearly communicated, but the scenario layer does not create enough differentiated experience.

D — The scenario layer exposes a different unresolved product problem.
```

This is a **diagnostic classification**, not a score or ranking.

Support it with concrete evidence.

Do not produce numerical scores.

---

# 14. Decision gate

The conclusion must answer one of three practical questions.

### Continue

A specific, evidenced issue remains that justifies another focused scenario/product step.

If so, describe the exact issue.

### Stop

10CI successfully solved the identified product gap and the scenario layer is now sufficient for the current product stage.

If so, say explicitly:

> No immediate scenario-system change is justified.

### Redirect

The scenario layer is functioning, but the evidence shows that the next meaningful product direction lies elsewhere.

If so, identify the direction without implementing it.

---

# 15. Critical anti-loop rule

This step must **not** become another search for an excuse to add gameplay.

Do not propose:

- new resources;
- new buildings;
- new objective types;
- quest systems;
- City;
- achievements;
- automation;
- stock quotas;
- scenario scripting;
- branching quests;
- additional progression tiers;
- new persistence;
- another workforce mechanic.

If the current product is sufficient, the correct conclusion is:

```text
STOP / MOVE TO A NEW PRODUCT DIRECTION
```

A successful audit is allowed to produce **no new implementation step**.

---

# 16. No code changes unless a real defect is found

Default expectation:

```text
No runtime code changes.
```

Only modify code if the audit uncovers a clear regression introduced by 10CI, such as:

- broken scenario selection;
- incorrect objective display;
- impossible scenario;
- incorrect Town completion;
- responsive regression;
- deterministic regression.

Do not make speculative UX improvements during this audit.

If no defect exists, do not change code.

---

# 17. Validation

If no runtime code changes:

- inspect current test status;
- run focused scenario/Town tests if useful;
- run browser validation to inspect actual experience;
- verify responsive states;
- do not rerun GPU solely because this document exists.

If runtime code changes:

- focused tests;
- full Vitest;
- typecheck;
- lint;
- build;
- headed browser;
- responsive;
- GPU/WebGL2 if rendering/runtime is affected.

Report exact results.

---

# 18. Documentation

Create:

```text
docs/roadmap/STEP10CJ.md
```

Document:

1. 10CH problem.
2. 10CI solution.
3. Actual scenario reconstruction.
4. Discoverability findings.
5. Distinctness findings.
6. Goal comprehension.
7. Causal comprehension.
8. Player agency.
9. Town endpoint behavior.
10. Post-Town behavior.
11. Repetition findings.
12. Simulation interaction.
13. Product quality classification.
14. Decision gate.
15. Explicit non-goals.
16. Validation.
17. Files changed.

Keep the document factual and reasonably concise.

---

# 19. User-owned files

Do not modify:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

They are user-owned and out of scope.

---

# 20. Commit

If documentation-only work is complete:

```text
Step 10CJ: Town Scenario Experience Audit
```

If a real regression requires a code fix, still use the same commit title.

One commit only.

Do not rewrite previous history.

Do not force-push.

Do not claim a push unless one actually occurred.

---

# 21. Final report

Return:

```text
Step 10CJ — Complete

1. 10CH product gap
2. 10CI implementation verified
3. Scenario reconstruction
4. Discoverability
5. Distinctness
6. Goal comprehension
7. Causal comprehension
8. Player agency
9. Town endpoint
10. Post-Town experience
11. Repetition
12. Simulation interaction
13. Product quality classification
14. Decision: Continue / Stop / Redirect
15. Concrete evidence
16. Code changes
17. Tests
18. Browser
19. Responsive
20. GPU
21. Diff audit
22. Files changed
23. Commit
```

## Final constraint

**Do not decide what NOVA needs next before observing what 10CI actually produced.**

10CJ exists to answer:

> **Did adding Town goals complete the current authored gameplay loop, or did it reveal the next real product problem?**

Either answer is valid.

The purpose of this step is to make the next decision evidence-based rather than automatically extending the roadmap.

---

# Documentation (as-built)

## 0. Baseline and method

- HEAD at execution: `356b4fe` (Step 10CI), worktree clean, no code changed
  during this audit.
- 10CI report verified against the repo: 11 scenarios, three Town entries
  with single `{stage:'town'}` requirements, `Reach Town` label fix present,
  focused suite green (townGoalCoverage 13/13 + scenarios 8/8 = 21/21).
- Docs read: Step10CH (as-built), Step10CI (prompt + as-built), Step10CG /
  Step10CF as-builts (uppercase STEP10CA-style paths in prompts do not exist
  on disk; mixed-case files consulted).
- Flows reconstructed by executing real commands in scratch probes
  (deleted after) and by headed browser inspection of the actual UI.

## 1. 10CH problem

Catalogue ceiling (Village) one stage below progression ceiling (Town);
the game's own milestone was never asked for.

## 2. 10CI solution (verified)

Three data-only Town scenarios on existing primitives: town-threshold
(spend reserve on Workshop), town-balance (third Farm while industry runs),
town-connection (two road cells to cut-off Workshop). No new mechanic,
SAVE_VERSION 8.

## 3. Actual scenario reconstruction

Measured start → Town (real commands, deterministic):

```text
town-threshold: Village, pop 4, food 4/4, water 2, mat 30
  → place Workshop(7,2) → construction → auto-staff idle → Town tick 3
town-balance:   Wilderness, pop 5, food 4/5, water 2, mat 30
  → place Farm(9,2) → construction → auto-staff idle → Town tick 3
town-connection: Village, pop 4, food 4/4, water 2, mat 15, 1 network
  → place roads (6,1)+(7,1) → auto-staff idle → Town tick 2
```

Flows:

```text
threshold:  complete Village, idle colonist → understand Workshop missing
  → spend reserve → wait construction → staffed → Town
balance:    five mouths, two Farms → understand food deficit → build Farm
  → hold balance during construction → staffed → Town
connection: balanced Village, empty Workshop → understand no access
  → extend network → staffed → Town
```

## 4. Discoverability findings

Headed browser: all three present in the scenario select by name; selecting
loads the matching start state (stages Village/Wilderness/Village as
measured). Titles are understandable; constraints state the budget logic.
One real gap: scenario `description` text is never rendered anywhere
(`main.ts` shows name + `Objective — label` + `Constraint — constraint`
only). The authored descriptions exist solely in code. Impact is minor:
name + constraint + progression checklist carry the meaning, but the
richest framing sentences are invisible to players.

## 5. Distinctness findings

Genuinely different problems, not cosmetic: construction-commit vs
food-edge growth vs access restoration. Different starts, blockers, solutions
(building / building / roads), budgets (30 / 30 / 15), horizons (3 / 3 / 2
ticks) and exercised systems. One honest wrinkle: threshold and connection
show an IDENTICAL start checklist (✗ Staffed Workshop, ✓ Water, ✓ Food
4/4) — the differentiator is the map (Workshop absent vs present-but-cut-off)
plus the constraint text. The actions and systems differ, so the difference
is meaningful, but the shared blocker line undersells it.

## 6. Goal comprehension

Yes from UI alone. Each scenario shows `Objective — Reach Town.` plus a
concrete constraint (exact budget → exact action → exact staffer) plus the
progression checklist naming the missing condition (`✗ Staffed Workshop —
0 staffed`, `✗ Food balance — 4 / 5`). Status reads `Objective in
progress — 0 / 1 (Reach Town)`. `Reach Town` suffices because the
constraint and checklist supply the how.

## 7. Causal comprehension

The chains emerge from existing facts: the checklist names the missing
Town condition; the constraint names the priced action; construction and
auto-staffing visibly resolve it (tick 2–3). Threshold: Workshop → staffed
→ Town is explicit. Balance: 4/5 food → Farm → Town is explicit.
Connection: present-but-empty Workshop + road gap → roads → Town is
visible on the map. No explanatory system needed; none added.

## 8. Player agency

Narrow but real, and consistent with catalogue precedent (recovery,
water-reserve-industry): each scenario has one reasonable solution path.
Workforce auto-staffing executes the final step; the player decides the
commitment (spend/wait/build). Mistakes: threshold farm-first spends the
reserve down to 5 with no material income — a quiet stall (no starvation,
no recovery), i.e. a terminal order of the documented
water-reserve-industry kind. Not a checklist without thought (the wrong
order is genuinely terminal), but not an open decision space either.
Workforce decisions matter little inside these scenarios (one idle worker
each); roads matter decisively in connection only.

## 9. Town endpoint behavior

At completion the UI shows `Objective complete` (status line) and the Town
capability flips to `Town workforce allocation — Farm / Well / Workshop
allocation is active; use Move worker to rebalance.` Nothing new unlocks —
by design. The scenario ENDS with explicit framed feedback, which is what
makes Town feel authored rather than merely derived: previously the same
state arrived silently.

> **Does Town currently feel like an authored destination?** Yes — the
> framed completion (`Reach Town` asked → `Objective complete` answered +
> review capability named) is the difference between a milestone and a
> destination.

## 10. Post-Town behavior

After completion: free play continues with the Town review capability; no
post-Town system exists (10CI intentionally added none). Classification:
**A — Town is currently a sufficient scenario endpoint.** The scenarios
close with purpose; free-play-beyond-Town motivation is a separate future
product question, not a defect of this layer. No post-Town system is
justified by this audit.

## 11. Repetition findings

No catalogue repetition introduced: distinct starts/blockers/solutions/
structures (all `structureOf` hashes distinct; connection keeps one network
so housing-composition remains the sole split start). Descriptions promise
what the solutions deliver (verified tick-exact).

## 12. Simulation interaction

Threshold exercises construction + staffing; balance exercises Food/production
+ growth + staffing; connection exercises roads/accessibility + staffing.
All three terminate through the canonical Town gate (workshop staffed +
water + food). Scenarios expose existing gameplay; nothing is bypassed
(auto-staffing is the existing system working, not a shortcut).

## 13. Hidden-mechanics check

None. Catalogue entries are data; assembler shared; evaluation unchanged
since 10CI (one display-label line); no scenario-only production,
progression, state, or completion logic found.

## 14. Product quality classification

```text
A — Town is now a meaningful and legible authored endpoint.
```

Evidence: framed `Reach Town` goals (browser-verified) → distinct real-command
paths (tick-exact) → canonical Town completion → explicit `Objective
complete` + review capability. The two communication observations
(invisible descriptions §4, shared threshold/connection checklist §5) are
minor: they do not prevent understanding or action.

## 15. Decision gate

```text
STOP — 10CI solved the identified product gap; no immediate
scenario-system change is justified.
```

No evidenced scenario issue remains open. Any future work (e.g. free-play
post-Town motivation, description surfacing, construction-crew tutorialization)
is a new product-direction decision, not a repair this layer requires.
Per the anti-loop rule, no implementation step is proposed.

## 16. Explicit non-goals (all respected)

No resources/buildings/objective types/quests/City/achievements/automation/
quotas/scripting/branching/tiers/persistence/workforce mechanics proposed
or built.

## 17. Validation

- 10CI report re-verified: focused suites 21/21 PASS (no drift since 356b4fe).
- Full Vitest / typecheck / lint / build: NOT rerun — zero tracked-file
  modifications (audit added no code; worktree clean before and after).
  HEAD values stand: 1736/1736, typecheck/lint/build PASS.
- Headed browser: PASS — select/discover/select-behavior/objective display/
  completion feedback verified live at 1280×800; responsive overflow clean
  at 1280×800 / 420×740 / 360×640; zero console/page errors.
- GPU/WebGL2: not rerun per §17 (no runtime/rendering change).
- `git diff --check`: clean (doc-only addition).
- User-owned files (`Step10BO - Copy.md`, `Step10BT.md`): untouched.

## 18. Files changed

- `docs/roadmap/Step10CJ.md` (prompt + this as-built, dual-purpose
  convention; no uppercase variant — case-insensitive FS)

No runtime, test, or E2E file changed. Throwaway probe test and browser
script deleted before commit.
