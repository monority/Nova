# Step G1.1 — Demand-Driven Settlement Growth

## Objective

Implement the first real post-foundation product phase identified by `Step10DG`.

NOVA's current foundation is complete and frozen. The next product objective is:

> **Demand-driven spatial settlement growth.**

The missing experience is that the settlement currently does not physically expand as a consequence of the demand and infrastructure the player has created.

Implement the first coherent G1 slice:

```text
existing settlement demand
        ↓
derived growth demand
        ↓
growth eligibility
        ↓
deterministic expansion cell
        ↓
Residence construction
        ↓
population / housing capacity
        ↓
new demand
```

Growth must be a **causal consequence of the simulation**, not a timer, random event, or arbitrary "level up".

---

# 1. Read Before Coding

Read:

- `docs/roadmap/Step10DG.md`
- `docs/README.md`
- `docs/00-CMD.md`
- `docs/04-*.md` or the current document defining growth principles
- current progression/product documents
- current economy documentation
- current housing/residence rules
- current construction rules
- current road/access rules
- current persistence/determinism documentation
- relevant source and tests for:
  - Residence
  - housing
  - construction
  - population
  - roads
  - affordability
  - simulation tick ordering
  - derived queries
  - state hashing
  - RenderSnapshot

Also inspect the existing implementation rather than relying on roadmap descriptions.

The existing code is the authority for current mechanics.

---

# 2. Preserve the Foundation

Do NOT redesign existing systems.

The following remain frozen:

- economy foundations
- workforce foundations
- road foundations
- progression foundations
- scenarios
- persistence model
- SAVE_VERSION = 8
- RenderSnapshot boundary
- visual identity
- HUD model
- fixed camera

Do not modify existing rules unless G1 cannot be implemented correctly without a clearly documented change.

If a frozen contract genuinely blocks G1, stop and report the conflict rather than silently changing the foundation.

---

# 3. Define Growth Demand

Introduce a **derived growth-demand query**.

Do not add persisted `growthDemand` state.

The query must derive demand from existing simulation state.

First determine the exact causal condition from the product documentation and current rules.

The implementation must answer something equivalent to:

> "Does the current settlement have enough unmet housing demand / pressure and sufficient infrastructure conditions for another Residence to be justified?"

Do not use:

- elapsed time;
- random chance;
- arbitrary every-N-ticks rules;
- population alone as a timer;
- hidden counters;
- persisted growth flags.

The demand signal must be explainable from observable simulation state.

Document the exact formula/condition.

---

# 4. Growth Eligibility

Growth should require an appropriate infrastructure context.

The 10DG conclusion explicitly identifies:

> **roads/services as growth infrastructure**

For the first G1 slice, determine the smallest defensible rule consistent with the existing architecture.

A candidate shape is:

```text
growth demand exists
AND
there is an eligible road-adjacent location
AND
Residence can be afforded under the existing affordability rules
→ one Residence construction may begin
```

Do not introduce additional services, zoning, land-value systems, population simulation, or new resource categories.

The first slice must remain intentionally small.

---

# 5. Deterministic Expansion Cell

The expansion location must be completely deterministic.

There must be exactly one canonical selection rule.

For example, the implementation may derive the next eligible cell using a stable ordering such as:

```text
candidate cells
→ filter valid empty cells
→ filter road adjacency
→ stable coordinate ordering
→ select first
```

The exact ordering should follow existing project conventions.

Do NOT use:

- random selection;
- iteration order that is not explicitly stable;
- object-key ordering as an accidental rule;
- renderer state;
- browser state;
- timestamps.

Add tests proving that identical simulation states always select the same expansion cell.

---

# 6. Reuse Existing Construction

Growth must use the existing Residence construction transaction.

Do not create a parallel "growth construction" system.

The resulting Residence must obey the same:

- Material cost;
- construction duration;
- crew acceleration;
- housing rules;
- affordability;
- completion/admission rules;
- hashing;
- persistence;
- deterministic tick semantics

as a player-built Residence.

The only difference is the **source of the build decision**:

```text
player placement
vs
derived autonomous growth
```

Do not duplicate the underlying transaction.

---

# 7. Tick Ordering

Be extremely precise about simulation ordering.

Determine where G1 belongs in the current tick pipeline.

Document and test:

- when growth demand is evaluated;
- when affordability is evaluated;
- when the construction transaction starts;
- whether the new Residence can affect same-tick income;
- when housing capacity changes;
- when population admission occurs;
- whether a newly started Residence can itself trigger another growth event.

Avoid accidental recursive growth in a single tick.

The first G1 slice should produce **at most one new Residence construction per tick**.

Do not introduce a hidden queue unless the existing construction model already requires one.

---

# 8. Prevent a Growth Treadmill

This is one of the explicit risks from 10DG.

Do not implement:

```text
Residence appears
→ population increases
→ another Residence immediately appears
→ repeat forever
```

unless the existing demand model genuinely produces that behavior and the resulting causal loop is intended.

The system needs a real demand/capacity relationship.

A Residence should not automatically create infinite growth merely because it exists.

Use existing housing/population/need mechanics to establish the pressure.

If the current simulation does not contain enough information to define a meaningful demand signal, stop and report the exact missing prerequisite rather than inventing one.

---

# 9. Player Agency

Growth is autonomous, but it must remain legible and connected to player decisions.

The player should be able to influence whether/where growth can occur through existing decisions such as:

- road placement;
- settlement layout;
- resource/economic investment;
- housing availability.

Do NOT add a new growth toggle, growth menu, zoning UI, or policy system in this slice.

The player's agency should emerge from the existing simulation.

---

# 10. Domain/Application/Rendering Boundaries

Respect the current architecture.

The growth rule belongs in the simulation/application layer, not rendering.

Do not import Three.js into:

```text
src/domain/**
src/application/**
```

The renderer must consume the resulting state/RenderSnapshot exactly like existing player-built Residences.

No renderer-specific growth state.

No UI-only simulation logic.

---

# 11. Persistence

G1 must introduce **no new persisted state**.

Therefore:

```text
SAVE_VERSION = 8
```

must remain unchanged.

Verify:

- save/load round-trip;
- hash determinism;
- growth state is reconstructed from persisted canonical state;
- no derived growth query is persisted;
- replaying the same state produces the same expansion.

If a new persistent field appears necessary, stop and document why rather than silently introducing it.

---

# 12. Scenarios

Do not rewrite the 11 frozen scenarios.

First determine whether G1 should be active universally or only after a particular existing progression condition.

Do not introduce new scenarios in this slice.

Existing scenarios must remain deterministic and valid.

The implementation should not accidentally cause authored scenarios to become fundamentally different without explicit product justification.

If scenarios require a deliberate activation boundary for G1, use an existing progression boundary rather than adding a new progression tier.

---

# 13. UX / Visual Feedback

The first implementation should reuse the existing Residence rendering.

Do not redesign the HUD.

However, autonomous growth must be observable.

At minimum, verify through browser testing that:

1. the settlement reaches the growth condition;
2. an eligible location exists;
3. a Residence construction appears;
4. construction follows the normal lifecycle;
5. the resulting Residence is visually indistinguishable from an equivalent player-built Residence;
6. no visual state lies about why it exists.

If the current UI has no appropriate way to explain autonomous growth, do not invent a large notification system.

A minimal derived status/query may be acceptable only if it is necessary for comprehension and consistent with existing UX patterns.

Prefer proving the causal chain through existing observable state.

---

# 14. Tests

Add focused deterministic tests for G1.

At minimum cover:

### Demand

- no demand → no growth;
- demand → growth eligibility can become true;
- demand is derived, not persisted.

### Infrastructure

- no eligible road-adjacent cell → no growth;
- valid road-adjacent cell → growth can select it.

### Selection

- deterministic candidate ordering;
- identical state → identical selected cell;
- occupied cells skipped;
- invalid cells skipped;
- road adjacency respected.

### Construction

- growth uses the normal Residence construction transaction;
- correct Material cost;
- correct construction duration;
- crew acceleration remains unchanged;
- construction completion produces a normal Residence.

### Tick semantics

- at most one autonomous Residence starts per tick;
- no same-tick recursive chain;
- ordering relative to existing economy/housing/population logic is explicit.

### Persistence

- save/load preserves the canonical state;
- SAVE_VERSION remains 8;
- growth query after load produces the same result;
- hash remains deterministic.

### Regression

All existing tests must continue to pass.

Do not weaken or delete existing assertions merely to accommodate G1.

---

# 15. Browser / E2E Verification

This is a player-facing simulation change, so real browser verification is required.

Add a focused E2E path for G1.

The test must demonstrate an actual causal sequence rather than directly manipulating internal state.

Verify in a real browser:

```text
prepare a valid settlement state
→ create the conditions for growth
→ observe growth demand
→ observe deterministic Residence construction
→ wait through construction
→ verify the resulting Residence
```

Use stable semantic selectors and state-based waits.

Do NOT rely on arbitrary sleeps.

If the test requires a scenario, use an existing scenario and document why.

Also verify that the existing player-controlled Residence construction path still works.

---

# 16. GPU / Rendering Verification

Because G1 produces new visible world state, run the existing headed GPU/WebGL2 verification.

Verify:

- WebGL2 active;
- NVIDIA RTX 3070 path active;
- no rendering errors;
- no console errors;
- autonomous Residence renders correctly;
- construction state renders correctly;
- no duplicate/ghost Residence appears.

Do not modify the visual system merely to make the test pass.

---

# 17. Performance

Do not introduce an expensive board scan every frame.

Growth evaluation belongs to the simulation tick.

Candidate selection should operate on the small 12×12 board and remain deterministic.

Do not put growth logic in:

- React render;
- Three.js animation/render loop;
- pointer handlers;
- per-frame effects.

Add a regression test or instrumentation if useful to demonstrate that the new logic is simulation-bound rather than frame-bound.

---

# 18. Documentation

Create:

`docs/roadmap/StepG1.1.md`

Document:

1. Product objective
2. Growth demand definition
3. Infrastructure eligibility
4. Deterministic expansion-cell rule
5. Tick ordering
6. Construction reuse
7. Anti-treadmill reasoning
8. Player agency
9. Persistence impact
10. Scenario impact
11. UX/visual impact
12. Tests
13. Browser/GPU verification
14. Known limitations
15. Next G1 work

Clearly distinguish:

- implemented in G1.1;
- intentionally deferred to later G1 slices;
- future G2/G3 systems.

Do not let G1.1 silently expand into production chains, transport, technology, or late-game systems.

---

# 19. Product Boundary

This is the first slice of G1.

Do NOT implement:

- production chains;
- factories;
- transport vehicles;
- logistics;
- technology;
- markets;
- external demand;
- civilization/end-game systems;
- new resources;
- new population simulation;
- zoning;
- land value;
- procedural generation;
- camera redesign;
- visual-tier expansion.

Those belong to later product phases unless the existing architecture makes a minimal dependency unavoidable.

---

# 20. Full Validation

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Run the focused G1 tests separately.

Run the focused G1 browser suite.

Run relevant regression browser suites covering:

- housing;
- construction;
- progression;
- economy;
- roads;
- workforce;
- save/load.

Run headed GPU/WebGL2 verification.

Inspect the final diff carefully.

Verify:

```bash
git status --short
git diff --stat
git diff
```

Confirm:

- only intended files changed;
- no SAVE_VERSION change;
- no unrelated gameplay changes;
- no architecture boundary violations;
- no user-owned files modified.

---

# 21. Commit

If implementation and all required verification pass, create exactly one commit:

```text
feat(nova): add demand-driven settlement growth
```

Do not push.

---

# 22. Final Report

Report:

## Product result

What new player-facing experience now exists?

## Growth rule

Give the exact deterministic demand and eligibility rule.

## Causal chain

Show:

```text
condition
→ demand
→ eligibility
→ selected cell
→ construction
→ completion
→ resulting state
```

## Player agency

Explain which existing player decisions influence growth.

## Treadmill protection

Explain why growth does not simply run indefinitely.

## Persistence

Confirm SAVE_VERSION and persisted-state impact.

## Tests

Give exact counts.

## Browser

Give exact E2E results.

## GPU

Give exact WebGL2/GPU result.

## Quality

Report:

- typecheck
- lint
- build
- diff check

## Git

Give:

- commit hash
- commit message
- final status
- no push

## Next G1 slice

Do not automatically implement it.

Identify the next missing piece of G1 only after evaluating what G1.1 actually demonstrates.

---

# Critical Principle

This is not "add houses automatically".

The product objective is:

> **Make the settlement visibly and causally grow because of the conditions the player created.**

The player should eventually be able to look at NOVA and understand:

```text
I built infrastructure
        ↓
the settlement created capacity
        ↓
people generated demand
        ↓
the simulation justified expansion
        ↓
the settlement physically grew
```

That causal relationship is the beginning of NOVA's next major product phase.

Build the smallest coherent version of that system, verify it in the real browser, and stop before drifting into G2.

---

# As-Built — Step G1.1: Demand-Driven Settlement Growth

## 1. Product Objective

Make the settlement **physically grow because of the conditions the player
created**. Once a settlement has reached **Town**, the simulation adds one
Residence per tick while real housing pressure exists and the player's Water
infrastructure can serve it. Nothing happens on a timer; nothing is random; the
growth is a causal consequence of demand + infrastructure + affordability.

## 2. Growth Demand Definition

Derived, never persisted (`domain/simulation/growth.ts` +
`application/queries/growth.ts`):

```text
active          = Town capability (see §3 activation)
servedNeed      = water-served colonists x WATER_PER_COLONIST_PER_TICK (1)
shortage        = servedNeed > 0 AND water stock < servedNeed
housingPressure = availableResidenceIds(state).length === 0
waterHeadroom   = waterProductionForTick(state) >= servedNeed + 1
cell            = deterministic eligible cell (§4)
demand          = active AND NOT shortage AND housingPressure AND waterHeadroom AND cell != null
affordable      = main Material stock >= BUILDING_CATALOG.residence.constructionCost
```

Interpretation: the settlement wants another home exactly when it has no vacant
home (housing is the binding constraint), it can still serve one more colonist
(Water headroom), it is not currently short of Water, and there is a place it can
actually serve. At a minimal Town the Water capacity is already saturated, so
there is no demand until the player adds capacity — the anti-treadmill gate.

## 3. Infrastructure Eligibility

A candidate cell is eligible only when it is:

- in bounds and not terrain-blocked;
- not occupied by a building or a road (`isCellBlocked`);
- orthogonally adjacent to an **operational** road; and
- on a road network **covered by an operational Well** (`getWaterCoverage().coveredNetworkIds`),
  so the new Residence will actually be water-served.

The activation boundary is the existing **Town** stage (Village conditions plus a
staffed operational Workshop), which is exactly the vision's `Town → Growth` arc.
`growth.ts` mirrors the Town thresholds; `tests/settlementGrowth.test.ts` pins the
mirror to `getProgression(state).stage === 'town'` so the two cannot drift. The
freeze audit (`phaseFreezeTownDependencyAudit`) records growth as a Town consumer.

## 4. Deterministic Expansion-Cell Rule

One canonical rule: scan cells in ascending **(x, y)** order and return the first
eligible cell. No randomness, no renderer/browser state, no insertion-order
dependence. Identical states always pick the same cell (tested), and occupied or
invalid cells are skipped (tested). Growth follows the roads the player built in
the most literal sense: it can only expand onto Well-covered road frontage.

## 5. Tick Ordering

`growSettlement` runs inside the canonical pipeline, after the player's command
and after road progress, before upkeep:

```text
advanceConstruction
  → needs / food / water / population / jobs / produceMaterial
  → creditMaterialIncome
  → applyCommand            (player priority)
  → progressPlacedRoads
  → growSettlement          (<= 1 Residence)
  → upkeepBuildings
  → releaseCompletedConstructionCrew
  → advanceTime
```

Consequences, all tested:

- growth sees this tick's stored production **and** income (same-tick
affordability), and spends before upkeep;
- a newly grown Residence missed `advanceConstruction`, so it starts at the
catalog's 2 construction ticks exactly like a player placement;
- **at most one autonomous Residence per tick** (asserted over repeated ticks);
- no same-tick recursive chain: the phase evaluates once and never re-runs after
its own construction;
- the player's command is applied first, so a player build and a growth build can
never double-spend (growth re-checks affordability after the command).

## 6. Construction Reuse

The growth phase calls the **same** transaction as `placeBuilding`:
`createBuilding(state,'residence',x,y, definition.constructionTicks)` +
`deductResources(resources, definition.constructionCost)`. The resulting
Residence is byte-identical to a player-built one: same 25 Material cost, same 2
construction ticks, same lifecycle, same housing capacity, same admission,
same hashing/persistence. The only difference is the source of the decision.
Growth deliberately does **not** release the protected Storage reserve (that
remains a player-only affordance) and adds no Water cost (a Residence has none).

## 7. Anti-Treadmill Reasoning

Growth is bounded by three independent player-controlled constraints:

1. **Water capacity** — a new served colonist consumes headroom; a Town at its
   Village Water capacity has zero headroom, so growth cannot start until the
   player builds another (staffed) Well. Each Well supports only 2 served
   colonists, so sustained growth requires sustained service investment.
2. **Eligible frontage** — only cells adjacent to Well-covered operational roads
   qualify, so the player's road layout bounds the total number of growth sites.
3. **Material affordability** — growth spends the same 25 Material as a player
   build and can starve itself.

Measured: a Town fixture grows a few Residences, then `growthDemand` becomes
false and the building count is stable across further ticks (focused test and
browser E2E). Growth can also outrun Food production, which drops the derived
(momentary) progression stage and therefore deactivates growth until the player
catches up — the treadmill failure mode is a real settlement-management
consequence, not decoration.

## 8. Player Agency

No new control was added. The player influences growth entirely through existing
decisions: **where roads run** (growth can only use Well-covered frontage),
**whether to invest in Water capacity** (the headroom gate), **whether to keep
Food balanced** (the stage gate), and **how much Material to spend**
(affordability). The player can also deliberately deny growth by not building
service capacity.

## 9. Persistence Impact

No new persisted state. Growth creates existing buildings and consumes existing
Material; the decision is fully derived. `SAVE_VERSION = 8` — unchanged. Verified:
save/load round-trip preserves the canonical state and hash; the growth query
after load equals the pre-save query; the serialized save contains no
`growthDemand`/`growthCell`/`growthActive`.

## 10. Scenario Impact

The 11 scenarios are unchanged and remain deterministic. Growth activates only at
Town, which is the final current stage, so Settlement/Village scenario
trajectories are unaffected. The full suite confirmed this: the only test changes
required were four **source-scan inventory** expectations (two new files, and the
new terrain/water readers) in frozen-architecture audits — no behavioural
scenario assertion changed.

## 11. UX / Visual Impact

No HUD redesign, no new panel, no notification system. The autonomous Residence
reuses the existing Residence rendering and lifecycle, so it is visually
indistinguishable from a player-built one and no visual state lies about why it
exists. For verification and observability, `window.__nova.stats()` exposes four
derived fields (`growthActive`, `growthDemand`, `growthCell`, `growthAffordable`)
— no visible UI was added.

## 12. Tests

- `tests/settlementGrowth.test.ts` — **14/14**: Town activation, the demand
formula (no headroom / vacancy / shortage / unaffordable), derived-not-persisted,
deterministic cell, occupied/invalid skipping, construction reuse (catalog cost +
ticks, no reserve release), at most one per tick, anti-treadmill saturation,
no-op when unaffordable, identical replay hashes, save/load neutrality, and the
Town cross-check with `getProgression`.
- Migrated source-scan expectations: `nextCausalCapabilityDiscovery` (terrain
readers 8 -> 9), `phaseFreezeTownDependencyAudit` (domain files 16 -> 17, src
files 35 -> 37, terrain readers 8 -> 9, Town consumers), `terrainContentScenarioIntegrationAudit`
and `waterCoverageServiceConsistencyAudit` (reader lists).
- **Full Vitest: 1886 / 1886 PASS (118 files).**

## 13. Browser / GPU Verification

- `npm run test:e2e:growth` (new, headed): PASS — growth inactive before Town;
Town demand derived; deterministic cell `0,1`; affordable; exactly one
Residence per tick; Material spent; under construction -> operational through the
normal lifecycle; bounded (14 buildings then stable over 5 further ticks); the
player-controlled Residence path still works; zero console/page errors.
- Regression suites (headed): housing, road, progression, upkeep, jobs,
town-gate, readability, water — **all PASS**.
- Product audit (headed): PASS (HUD non-occlusion intact at all three viewports).
- `npm run test:e2e:gpu`: **PASS** — WebGL2, NVIDIA GeForce RTX 3070 (unmasked),
stable scene, zero console/page errors; the autonomous Residence renders through
the existing path.

## 14. Known Limitations

- Growth gives no explicit "why did this appear" message; the Residence itself is
the feedback. A minimal derived status line is a candidate for the next slice.
- A vacant **unserved** Residence blocks demand (housingPressure is false even
though the home cannot be used); this is conservative and recoverable by fixing
service, but it can stall growth until the player acts.
- The cell rule is deterministic but not "smart" (ascending x,y): growth can pick
a cell far from the settlement centre if it is the lowest coordinate.
- Sustained growth requires deliberately over-building Water/Food capacity
relative to current population, because food/water jobs consume the same worker
pool. This is the documented structural pressure, surfaced rather than removed.
- Growth can drop the derived stage (momentary progression) if Food cannot keep
up; this is intended pressure, not a bug, but it is a new player-facing outcome.

## 15. Next G1 Work (not implemented)

Evaluate after G1.1's evidence:

- **growth feedback**: a minimal causal status/notification explaining an
autonomous construction;
- **cell preference**: prefer road cells nearest the existing settlement or the
constrained cell, still deterministic;
- **service-aware growth**: consider Food/Water slack in the demand gate so growth
naturally paces with the player's service investment;
- **capacity signalling**: surface the Water-headroom requirement as a legible
growth precondition.

Deferred and out of scope: staged/automatic service construction, zoning, land
value, external demand, production chains, transport, technology, vehicles,
markets, and any G2/G3 system.

Commit: `feat(nova): add demand-driven settlement growth`
