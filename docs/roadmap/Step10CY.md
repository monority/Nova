# Step 10CY — Player Experience & Product Gap Audit

## Objective

Evaluate NOVA as a playable product rather than as a simulation architecture.

This is a **product-quality and player-experience investigation**.

The goal is not to invent a new gameplay mechanic.

The goal is to determine whether the current NOVA build has concrete, observable product problems that can be improved using the systems already implemented, and whether any genuinely new product problem emerges that could justify future roadmap work.

Current baseline:

- Latest commit: `b8e3f46` — `Step 10CX: Roadmap Re-entry After Phase 8 Defer`
- Full Vitest: `1814/1814` PASS
- Typecheck: PASS
- Lint: PASS
- Build: PASS
- SAVE_VERSION: `8`
- Phase 7: COMPLETE
- Phase 8: DEFERRED
- Phase 9: PARTIAL / BLOCKED
- Phase 10: DEFERRED
- Phase 11: BLOCKED
- Phase 12: BLOCKED
- Simulation roadmap currently frozen.
- No new gameplay mechanic should be implemented by this step.

---

# 1. Read the product context first

Read:

- `docs/26-roadmap.md`
- `docs/20-strategy.md`
- `docs/29-*` product/design rules referenced by the roadmap
- `docs/roadmap/Step10CN.md`
- `docs/roadmap/Step10CX.md`
- `docs/roadmap/Step10CJ.md`
- `docs/roadmap/Step10CG.md`
- `docs/roadmap/Step10CO.md`

Also inspect the current implementation of:

- scenario catalogue;
- objectives;
- progression;
- HUD;
- construction;
- workforce UI;
- road UI;
- inspection/selection;
- placement feedback;
- save/load;
- responsive layout;
- rendering/camera;
- visual presentation.

Do not assume an issue exists because a generic game would normally have a feature.

---

# 2. Establish the current player journey

Trace the actual player journey from a fresh launch.

At minimum:

```text id="xk4p2n"
Launch
  ↓
Scenario selection
  ↓
Scenario start
  ↓
Understand objective
  ↓
Inspect starting state
  ↓
Construct / place
  ↓
Assign workforce
  ↓
Manage Food / Water / Material
  ↓
Build roads / establish access
  ↓
Population growth
  ↓
Town
  ↓
Scenario completion
```

For each stage document:

- what the player sees;
- what the player is expected to understand;
- what action is available;
- what feedback is produced;
- what consequence follows;
- whether the next action is obvious.

Do this from actual code/UI behavior.

---

# 3. Test the product without reading internal documentation

Perform an actual headed-browser walkthrough as a player.

Use the current scenario catalogue.

At minimum inspect:

- one simple scenario;
- one Food/Water pressure scenario;
- one road/access scenario;
- one Town scenario.

Use:

- 1280×800;
- 420×740;
- 360×640.

Record concrete observations.

Do not turn normal game complexity into a defect.

Only record an issue if it produces an observable player-facing problem.

---

# 4. Player comprehension audit

Evaluate whether a player can answer these questions from the interface:

### Objective

- What am I trying to accomplish?
- How do I know when I have succeeded?
- What is the current objective state?

### Economy

- How much Food do I have?
- How much Water do I have?
- How much Material do I have?
- Why is a stock increasing/decreasing?
- Why can/can't I afford a building?
- What does a worker contribute?

### Workforce

- Which buildings are staffed?
- Which jobs are vacant?
- What happens when I move a worker?
- Why would I move one worker instead of another?

### Roads

- Which buildings have road access?
- Why is a building inaccessible?
- Which road network does a building belong to?
- What does a new road actually change?

### Construction

- Why can I place this building?
- Why can I not place it?
- How much does it cost?
- What happens after construction?

### Progression

- Why did the population change?
- What does Town mean?
- What changes when Town is reached?
- What is the scenario endpoint?

Do not redesign mechanics to answer these questions. First determine whether the current interface already answers them adequately.

---

# 5. UX friction audit

Look specifically for:

- hidden state;
- unclear feedback;
- ambiguous terminology;
- dead controls;
- false affordances;
- duplicated information;
- excessive information;
- missing information;
- unclear causal relationships;
- unnecessary clicks;
- poor error recovery;
- awkward interaction ordering;
- poor mobile/responsive behavior;
- visual hierarchy problems.

For each issue record:

```text
Problem
Evidence
Player impact
Current behavior
Minimal correction
```

Do not prescribe a large redesign when a small correction solves the problem.

---

# 6. Scenario experience audit

Inspect the current scenario catalogue as a product.

For each scenario evaluate:

- discoverability;
- objective comprehension;
- distinct starting state;
- meaningful player agency;
- interaction with existing systems;
- pacing;
- feedback;
- completion;
- replay value;
- similarity to other scenarios.

Determine whether the 11 scenarios collectively provide:

- introduction;
- learning;
- pressure;
- mastery;
- variety.

Do not add scenarios automatically.

Only identify a scenario-layer problem if the existing catalogue demonstrably has one.

---

# 7. Spatial experience audit

Do not add spatial mechanics.

Instead determine whether the current spatial systems already produce interesting choices.

Test layouts such as:

- compact;
- spread;
- Farm-heavy;
- Water-heavy;
- Workshop-heavy;
- multiple road networks;
- different building/road arrangements.

Ask:

> Can two valid layouts produce meaningfully different outcomes using the current rules?

If yes, document the observed difference.

If no, document why.

This is important because a real spatial decision frontier could constitute new evidence for future roadmap work.

Do not invent distance penalties or adjacency bonuses to manufacture one.

---

# 8. Post-Town experience

Play at least one scenario through Town.

Evaluate:

- whether completion feels understandable;
- whether the endpoint feels intentional;
- whether the player understands that the scenario is over;
- whether there is meaningful post-Town activity;
- whether the lack of post-Town activity is actually a product problem or simply the intended scenario boundary.

Do not automatically conclude that "nothing happens after Town" is a defect.

Compare the observed experience against the documented product identity.

---

# 9. Visual / presentation audit

Evaluate the current product visually without redesigning it yet.

Inspect:

- camera;
- grid;
- terrain;
- building readability;
- road readability;
- selected state;
- hover state;
- construction state;
- resource feedback;
- lighting;
- contrast;
- visual hierarchy;
- HUD density;
- panel density;
- consistency;
- responsive presentation.

Identify concrete visual problems, not subjective preferences.

For each:

```text
Observed problem
Where it occurs
Why it harms comprehension/presentation
Minimal viable correction
```

---

# 10. Performance / technical UX

Measure the player-facing runtime where appropriate.

Check:

- initial readiness;
- frame stability;
- simulation responsiveness;
- interaction latency;
- browser console errors;
- layout overflow;
- resize behavior.

Use the existing GPU/browser validation infrastructure.

Do not optimize code without measured evidence.

---

# 11. Distinguish four classes of findings

Every finding must be assigned to exactly one category:

### A — Fixable with existing systems

Examples:

- unclear feedback;
- confusing label;
- bad layout;
- scenario presentation;
- visual hierarchy;
- missing explanation;
- interaction friction.

These can potentially become normal implementation steps.

### B — Scenario/content problem

The simulation is adequate, but scenario configuration/content needs improvement.

### C — New gameplay evidence

The current systems expose a real missing decision or constraint that cannot be solved through UX/content alone.

This is evidence that may reopen the frozen roadmap.

### D — Not a problem

The behavior is intentional, documented, or appropriate to the product identity.

Do not force every observation into a defect.

---

# 12. Avoid the previous audit loop

This step must NOT become:

```text
audit
→ brainstorm mechanics
→ reject mechanics
→ write another audit
→ freeze
```

Instead, prioritize **actionable product findings**.

The desired result is one of:

### Outcome A — PRODUCT IMPROVEMENTS FOUND

There are concrete player-facing issues that can be fixed using existing systems.

Document the smallest implementation steps.

### Outcome B — CONTENT / SCENARIO IMPROVEMENTS FOUND

The engine is adequate but the authored scenarios/content can be improved.

Document the smallest content changes.

### Outcome C — NEW GAMEPLAY EVIDENCE

A genuinely new player decision/problem is demonstrated.

Document the evidence without implementing the mechanic.

### Outcome D — PRODUCTALLY HEALTHY

No significant player-facing problem is demonstrated.

Do not invent work merely to keep development moving.

---

# 13. Prioritization without scoring

Do not create numerical scores, tiers, rankings, or arbitrary priority numbers.

Instead group findings by:

- **blocking** — prevents understanding or use;
- **meaningful** — clearly reduces product quality;
- **minor** — polish or low-impact friction.

Use evidence to justify each classification.

Do not rank multiple valid findings against each other.

---

# 14. Implementation gate

If Outcome A or B occurs:

Define the smallest next implementation step.

It must:

- use existing mechanics;
- preserve deterministic simulation contracts;
- avoid SAVE_VERSION changes unless genuinely necessary;
- avoid introducing new systems;
- include focused tests where behavior changes;
- include browser/responsive/GPU validation where runtime/UI/rendering changes.

Do not implement that work inside 10CY.

10CY is the audit/gate.

---

# 15. Reopening the frozen roadmap

Only classify something as Outcome C if the evidence demonstrates a problem that cannot be resolved through:

- UI;
- presentation;
- scenario configuration;
- existing workforce decisions;
- existing resource decisions;
- existing roads/accessibility;
- existing construction;
- existing progression.

If a new gameplay problem is found, compare it against the existing reopening terms:

- 10CL scale-induced break / player-visible sink-demand;
- 10CW intermediate good creating a non-expressible decision;
- 10CW producer output with no sink;
- 10CM documented world/external concept;
- 10CM routing problem not solvable by existing roads;
- 10CN spatial decision with genuinely different outcomes.

Do not create new reopening criteria merely to justify a feature.

---

# 16. Tests / implementation constraints

This is primarily an investigation.

Allowed:

- focused audit tests;
- E2E audit scripts;
- documentation;
- minimal measurement helpers.

Do not modify runtime gameplay rules.

Do not add:

- resources;
- buildings;
- commands;
- production chains;
- transport;
- vehicles;
- technology;
- growth;
- new persistence;
- new economy mechanics.

---

# 17. Validation

Because this step explicitly evaluates the player-facing product, perform:

### Browser

Headed browser validation for representative scenarios.

### Responsive

At minimum:

- 1280×800
- 420×740
- 360×640

Check:

- no overflow;
- controls remain usable;
- scenario flow works;
- objective remains visible;
- construction/assignment interactions remain usable.

### GPU

Run the established GPU/WebGL2 validation.

Confirm:

- WebGL2;
- NVIDIA hardware path;
- no console errors;
- stable rendering.

### Automated

Run:

- focused audit tests;
- full Vitest if tests changed;
- typecheck;
- lint;
- build;
- `git diff --check`.

Do not skip browser/GPU simply because the audit is "mostly documentation": this step explicitly evaluates the real player-facing product.

---

# 18. Documentation

Create:

`docs/roadmap/Step10CY.md`

Preserve this prompt verbatim at the top.

Append:

```markdown
## As-Built

### Player Journey

...

### Player Comprehension

...

### UX Findings

...

### Scenario Findings

...

### Spatial Findings

...

### Post-Town Findings

...

### Visual Findings

...

### Performance Findings

...

### Finding Classification

...

### Decision Gate

...

### Recommended Next Step

...

### Validation

...

### Scope Audit

...
```

Every important finding must contain concrete evidence.

Separate:

- observed behavior;
- interpretation;
- recommendation.

Do not present subjective preference as objective product evidence.

---

# 19. Final scope audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
```

Ensure:

- no speculative gameplay mechanic;
- no unrelated source changes;
- no accidental persistence changes;
- `SAVE_VERSION` remains `8`;
- `AGENTS.md` untouched;
- user-owned files untouched;
- no generated artifacts.

---

# 20. Commit

If the audit is complete:

```text
Step 10CY: Player Experience & Product Gap Audit
```

Commit locally.

Do not push.

---

# Completion criterion

10CY is complete only when:

- a real player-facing walkthrough was performed;
- representative scenarios were tested;
- responsive behavior was checked;
- GPU/browser rendering was checked;
- current UX and visual behavior were evaluated from the actual product;
- findings are evidence-backed;
- findings are classified as:
  - existing-system improvement,
  - scenario/content,
  - new gameplay evidence,
  - or not a problem;
- no gameplay mechanic was invented;
- the next action, if any, is concrete and minimal;
- documentation is complete;
- validation is clean;
- diff scope is clean;
- the commit is created locally;
- nothing is pushed.

Do not create another generic roadmap audit immediately after 10CY. If it finds an actionable problem, the next step must address that problem directly.

---

## As-Built

Evidence sources: a real headed-browser walkthrough
(`e2e/productAuditRun.mjs`, registered as `npm run test:e2e:product-audit`),
the existing scenario E2E suites, and the GPU/WebGL2 run. Observations are
separated from interpretation and recommendation throughout.

### Player Journey

Traced from the real UI (`index.html`, `src/app/main.ts`, `application/scenarios.ts`)
and exercised in the browser.

| Stage | What the player sees | Expected understanding | Action | Feedback | Consequence | Next action obvious? |
| --- | --- | --- | --- | --- | --- | --- |
| Launch | NOVA HUD, empty board, PLAY/PAUSE/STEP, palette, scenario select | start is paused, a scenario exists | pick a scenario | status `Scenario — <name>: <objective>` | state loads | yes |
| Scenario start | objective + constraint, Stage/Next, progression checklist | what to reach and why | inspect board/HUD | `Objective in progress — 0 / 1 (Reach …)` | simulation runs | yes |
| Inspect | HUD stats, building inspection on click | stocks, stage, blockers | click a building | inspection lines (type, status, workers, upkeep) | selection only | yes |
| Construct | palette (`Residence/Farm/Workshop/Well · 25`, `Road · 5`) | cost is labelled | click a cell | hover `ready · material N …` or explicit refusal | Material deducted, site under construction | yes |
| Assign workforce | inspection + `Move worker` row | worker -> workplace | pick target, confirm | manual/automatic mode, eligibility | production/income changes | yes (with Move worker visible) |
| Manage Food/Water/Material | HUD rows + causal status line | rates vs stocks | build/assign | `+2/tick`, `served`, production-blocked-by-road | growth or shortage | yes |
| Roads/access | road palette, hover spatial consequence | road = access, not service | drag/click | `water: served / NOT served`, `N workplaces reachable` | production resumes/blocks | yes |
| Population growth | colonists count, admission gating | food + served residence | build/adjust | causal status (`colonist arrived`, `consumed N food`) | population changes | yes |
| Town | `Reach Town` objective, town capability line | what Town means | satisfy checklist | `Objective complete`, `Town workforce allocation …` | scenario endpoint | yes (framed, 10CJ) |
| Scenario completion | `Objective complete` (persists), stage unchanged | the scenario is finished | free play continues | no new unlocks (by design) | boundary | yes |

Walkthrough observations (verbatim from the audit run):

- `first-settlement`: objective + constraint rendered on two lines; hover
  `cell 6,6 — ready · material 25 · no adjacent road → would never be water-served`;
  placement succeeded; inspection showed `Residence`.
- `water-constraint`: objective `Reach Village.`; stage `Settlement`; same
  placement/inspection path works with a populated start.
- `recovery`: objective `Reach Settlement by reconnecting the stranded Farm.`;
  constraint `Material 30 and Food 30: the reserve is finite.`
- `town-threshold`: objective `Reach Town.`; stage `Village`; capability
  `Town workforce allocation locked — Reach Town to review and rebalance the live workforce.`

### Player Comprehension

The interface already answers the audit's comprehension questions from live data:

- **Objective** — `#ui-objective` (label + constraint, `white-space: pre-line`),
  `#ui-objective-status` (`Objective in progress — m / n (blockers)` /
  `Objective complete` / `Objective failed — the colony is gone`), progression checklist.
- **Economy** — HUD stat rows (Food, Water, Material, Tick), derived
  production/consumption/upkeep/net queries; the causal status line explains
  why a stock moved (`Reserve released N material`, `consumed N food`,
  `upkeep shortfall — paid 0/1`).
- **Affordability** — hover names the exact cost and shortfall, including the
  10CS/10CT inflow and reserve breakdown (`ready · material 25 (incl. 25 reserve)`,
  `insufficient material (a/b)`, `insufficient water (a/b)`).
- **Workforce** — inspection shows `jobs x/y`, staffed/vacant, production and
  income per building; `Move worker` exposes eligible targets, distance and mode.
- **Roads** — building inspection and placement preview distinguish
  inaccessible vs vacant, and name served/not-served and reachable workplaces.
- **Construction** — palette labels the cost; refusal feedback names the cause
  (material, water, terrain, occupancy); `under construction` is shown.
- **Progression** — Stage/Next, checklist, blockers, and the Town capability line.

No comprehension defect was found. This corroborates the earlier 10CG/10CJ/10CO
usability findings rather than contradicting them.

### UX Findings

**UX-1 (meaningful, Class A) — the open HUD occludes interactable board cells.**

- Observed: `e2e/productAuditRun.mjs` measured, by projecting every cell centre
  with the live camera and testing it against the HUD panel rectangle, that the
  default (open) HUD covers board cells: **1280x800 -> 25 cells** (the whole of
  column 0, plus parts of columns 1-2; panel 437px wide); **420x740 -> 67 cells**;
  **360x640 -> 66 cells**. A cell under the panel never receives a canvas pointer
  event, so it cannot be hovered, clicked or built on until the player hides the
  HUD.
- Corroboration: the existing `e2e/housingCompositionRun.mjs` fails at
  `west preview: cell 4,1 — ready …` instead of `cell 0,1 — … water: NOT served`.
  Cell (0,1) is in the 1280x800 covered set, so the west hover landed on the HUD
  and the status stayed on the previous cell (4,1). The housing-composition
  scenario's central decision cell is the occluded one.
- Player impact: on load the default HUD hides the entire first board column at
  desktop size and roughly a third to a half of the board at narrow sizes; an
  authored scenario decision sits inside the hidden region.
- Current behavior: `#ui-objective`... the HUD is open by default and the
  `HIDE` control (10BA) collapses only the panels while keeping the header and
  status line. That mitigation exists but is not the default.
- Minimal correction (not implemented in 10CY): default the HUD to collapsed
  when the viewport is narrow (reuse the existing DOM-only `collapsed` state and
  the `HIDE`/`SHOW` toggle; no persistence, no simulation change), and keep the
  desktop panel from straddling column 0 (offset or auto-collapse when it would
  cover a cell).

**UX-2 (minor, Class A) — the housing E2E preview can read a stale cell.** The
west preview's `waitFor(text.includes('ready'))` accepts the previous cell's
status; combined with UX-1 it produces a misleading failure. Minimal correction:
assert the status names the target cell.

### Scenario Findings

Catalogue: 11 scenarios (`first-settlement`, `water-constraint`,
`industrial-expansion`, `water-reserve-industry`, `spatial-efficiency`,
`population-expansion`, `recovery`, `housing-composition`, `town-threshold`,
`town-balance`, `town-connection`) plus the terrain-chokepoint fixture.

- Discoverability/objective: every scenario shows a label and a constraint; the
  walkthrough confirmed this for a simple, Food/Water, road/access and Town case.
- Distinct starts and agency: the walkthrough and the existing suites show
  distinct openings (empty board; pre-built Farm/Residence pairs; two-network
  composition; Town-ready colonies) with real placement/assignment decisions.
- Coverage: introduction (`first-settlement`), learning (`spatial-efficiency`,
  `industrial-expansion`), pressure (`water-constraint`, `recovery`,
  `water-reserve-industry`), mastery/Town (`town-threshold`, `town-balance`,
  `town-connection`), variety (`housing-composition`). No scenario-layer gap was
  demonstrated; the earlier 10CJ STOP stands.
- One content-adjacent consequence: because of UX-1, `housing-composition`'s
  intended decision cell is hidden by the default HUD. That is a UI defect, not
  a scenario-content defect (the scenario data is sound).

### Spatial Findings

Using only current systems, two valid layouts produce different outcomes, and
the UI already surfaces the difference:

- `housing-composition`: bridge cell (2,1) -> `water: served` + 2 workplaces;
  east cell (4,1) -> `water: served` + 1 workplace; west cell (0,1) ->
  `water: NOT served` (per the scenario contract). The bridge merges the two
  networks; the east and west placements do not.
- `recovery`: reconnecting the stranded Farm is the only non-terminal order.
- The walkthrough's generic hover also showed the spatial consequence
  (`no adjacent road -> would never be water-served`).

This is a real spatial decision frontier expressed in existing systems, and it
is already documented (10BE/10CJ/10CN). It is therefore **not new evidence** for
the frozen roadmap; only UX-1 prevents the player from exercising one instance
comfortably.

### Post-Town Findings

- On completion the objective status persists as `Objective complete` and the
  Town capability reads `Town workforce allocation locked — Reach Town to review
  and rebalance the live workforce.` The scenario boundary is explicit and
  authored (10CJ).
- No post-Town continuation exists, and per 10CN this is the intended scenario
  boundary, not a defect. The walkthrough observed no misleading "next step"
  affordance after completion.
- Classified **D — not a problem** (documented product boundary).

### Visual Findings

- No objective visual defect was found: the HUD, objective, checklist, palette,
  inspection and status line render consistently, the selected palette button is
  `aria-pressed`, and the board remains visible alongside the HUD.
- The only visual/comprehension issue is UX-1 (the open panel overlapping board
  cells). Colour/contrast/hierarchy were not measurably harmful in the captured
  screenshots (`artifacts/product-audit/`).
- Interpretation: the panel's default footprint, not its styling, is the issue.
- Recommendation: fold into UX-1; no styling redesign.

### Performance Findings

- Initial readiness: `window.__nova.ready` resolves and the first frame renders
  without console errors.
- Interaction latency: hover/placement/inspection responded within the audit's
  150-250 ms polling window; the simulation is pause/step controllable.
- Responsive: at all three viewports `scrollWidth <= clientWidth + 1` and the
  canvas keeps a positive size; the objective stays visible.
- GPU/WebGL2 (`npm run test:e2e:gpu`): PASS — WebGL2, NVIDIA hardware path,
  stable scene, zero console/page errors.
- No performance optimization is recommended; nothing measured is a bottleneck.

### Finding Classification

- **A — fixable with existing systems**
  - UX-1 (meaningful): default-open HUD occludes board cells (25 / 67 / 66 cells
    at 1280x800 / 420x740 / 360x640; includes the housing-composition decision
    cell (0,1)).
  - UX-2 (minor): housing E2E preview accepts a stale cell.
  - Verification drift (meaningful, non-gameplay): `readabilityAudit`,
    `progressionRun`, `upkeepRun`, `industrialRun` fail on stale expectations
    (reproduced identically with the source stashed at 10CT); the browser
    harness is not green even though the product walkthrough is.
- **B — scenario/content problem:** none. The catalogue is sound; its one
  affected scenario is blocked by UX-1, a UI issue.
- **C — new gameplay evidence:** none. No missing decision was demonstrated that
  cannot be resolved by UI, content, or the existing workforce/resource/road/
  construction/progression systems. The spatial frontier is real but already
  known and documented.
- **D — not a problem:** player comprehension (objective/economy/workforce/
  roads/construction/progression), the post-Town boundary, scenario coverage,
  and performance.

Grouping (no ranking): blocking — none; **meaningful** — UX-1, verification
drift; **minor** — UX-2.

### Decision Gate

**Outcome A — PRODUCT IMPROVEMENTS FOUND.**

There is one meaningful player-facing defect (UX-1: the default HUD hides
interactable board cells, including an authored scenario's decision cell) and a
concrete verification finding (stale E2E baseline). Both are fixable with the
systems already present. Outcome C is not selected: the evidence does not
demonstrate a gameplay decision that UI/content/existing systems cannot resolve.

### Recommended Next Step

A single minimal product-quality step (not implemented in 10CY):

**Step 10CZ — HUD non-occlusion and E2E baseline repair.**

1. Default the HUD to collapsed when it would occlude the board (narrow
   viewports, and the desktop panel straddling column 0), reusing the existing
   DOM-only `collapsed` state and `HIDE`/`SHOW` toggle. No persistence, no
   simulation or rendering-rule change.
2. Make `e2e/housingCompositionRun.mjs` assert the preview names the target cell
   (kills UX-2 as a failure mode).
3. Repair the stale expectations in `readabilityAudit` (scenario count),
   `progressionRun`, `upkeepRun` and `industrialRun` (all pre-Phase-7 income
   assumptions), so the browser harness returns to green.

Out of scope for that step: any simulation rule, economy, resource, building,
scenario data, SAVE_VERSION, or new mechanic.

### Validation

- product walkthrough (`e2e/productAuditRun.mjs`, headed): **PASS** — 4
  representative scenarios, hover/placement/inspection exercised, responsive
  checks and HUD-occlusion measurement, zero console/page errors.
- existing scenario E2E: `transport` PASS, `town-gate` PASS; `housing` FAIL
  (root-caused to UX-1); `readability`, `progression`, `upkeep`, `industrial`
  FAIL on pre-existing stale expectations (verified unchanged at baseline in
  10CT).
- GPU/WebGL2 (`npm run test:e2e:gpu`): **PASS** (NVIDIA, WebGL2, 0 errors).
- full Vitest: **1814 passed / 0 failed (112 files)**.
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean.

### Scope Audit

- Changed files: `e2e/productAuditRun.mjs` (new, audit-only), `package.json`
  (`test:e2e:product-audit` script), `docs/roadmap/Step10CY.md` (this as-built,
  force-added because `docs/` is gitignored).
- No `src/` change; no gameplay mechanic, resource, building, command, chain,
  transport, vehicle, technology, growth, UI behavior, persistence field or
  `SAVE_VERSION` change. `SAVE_VERSION` remains `8`.
- `AGENTS.md` untracked and untouched; user-owned roadmap files untouched; no
  generated artifacts (screenshots land in the gitignored `artifacts/`).

Commit: `Step 10CY: Player Experience & Product Gap Audit`
