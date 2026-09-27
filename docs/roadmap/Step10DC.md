# Step 10DC — Visual Identity & Presentation Gate

## Objective

Evaluate NOVA's current visual identity and presentation as a shipped product.

The foundation, simulation, UX, responsive behavior, and interaction model have now been extensively validated:

- Step 10CY found and fixed HUD occlusion.
- Step 10CZ repaired the related browser baseline.
- Step 10DA found no remaining Class-A product UX issue.
- Step 10DB measured narrow viewport board clipping and intentionally froze it as an acceptable product characteristic.

This step changes focus.

The question is now:

> Does NOVA's current visual presentation communicate a coherent, distinctive, finished product identity?

This is **not** a request for a generic visual redesign.

It is a product-direction gate.

Do not modify the rendering or UI unless a concrete, player-visible presentation problem is demonstrated.

---

# 1. Read the current product direction

Before evaluating anything, read:

- `docs/roadmap/Step10DA.md`
- `docs/roadmap/Step10DB.md`
- `docs/roadmap/Step10CZ.md`
- `docs/26-roadmap.md`
- current rendering code
- scene/camera setup
- building renderers
- terrain/grid rendering
- road rendering
- colonist rendering
- HUD/UI implementation
- scenario/objective presentation
- current E2E/browser audit infrastructure

Treat the current HEAD as authoritative.

Current baseline:

- Step 10DB commit: `5a83b09`
- `SAVE_VERSION = 8`
- 11 scenarios
- Phase 7 complete
- Phase 8 deferred
- simulation/economy foundations frozen
- product experience currently classified healthy

Do not reopen gameplay design.

---

# 2. Establish the intended visual direction

Recover the visual intent from the actual repository documentation and implementation.

Do not invent a new art direction.

Determine what the current product is actually trying to communicate.

In particular inspect whether the current implementation supports the established direction:

- top-down rather than isometric;
- dark / futuristic;
- modern maquette / miniature quality;
- readable luminous elements;
- distinct buildings;
- clean rather than primitive presentation;
- contemplative rather than noisy;
- spatial planning as the visual focus.

Separate:

1. explicit documented intent;
2. observable implementation;
3. personal aesthetic preference.

Only (1) and reproducible product effects can justify an implementation step.

---

# 3. Perform a real rendered-product audit

Use headed browser screenshots and actual interaction.

Inspect at minimum:

```text
1280×800
420×740
360×640
```

Use representative states:

### State A — early settlement

- terrain;
- initial buildings;
- colonists;
- HUD;
- objective.

### State B — developed settlement

Include:

- several residences;
- Farm;
- Well;
- Workshop;
- roads;
- staffed buildings;
- multiple colonists;
- different building states.

### State C — pressure / transition

Where possible show:

- construction;
- idle/unavailable building;
- resource pressure;
- workforce reassignment;
- accessibility difference.

### State D — Town

Show:

- Town progression;
- workforce review;
- developed board;
- scenario completion state.

Do not judge only the empty initial board.

---

# 4. Evaluate visual hierarchy

Determine whether the rendered product has a clear hierarchy.

Measure/inspect:

### Primary

- board;
- buildings;
- roads;
- settlement layout.

### Secondary

- colonists;
- operational state;
- construction state;
- accessibility.

### Tertiary

- resources;
- objective;
- controls;
- debug/status information.

Look for concrete problems such as:

- HUD overpowering the world;
- buildings blending into terrain;
- roads visually disappearing;
- colonists becoming invisible;
- construction state being unclear;
- important state conveyed only through text;
- too many competing high-contrast elements;
- status information visually dominating the board;
- decorative effects obscuring spatial information.

Do not classify something as a problem merely because a different hierarchy could look nicer.

---

# 5. Evaluate building identity

For each building type:

- Residence;
- Farm;
- Well;
- Workshop;

inspect whether it is immediately distinguishable without reading its label.

Evaluate:

- silhouette;
- footprint;
- color/value contrast;
- lighting;
- roof/body differentiation;
- operational state;
- construction state;
- staffing state.

The question is not:

> "Could the art be prettier?"

The question is:

> "Can the player reliably read the settlement spatially?"

---

# 6. Evaluate roads and accessibility visually

Inspect:

- road readability;
- road/building relationship;
- connected vs disconnected road networks;
- accessible vs inaccessible buildings;
- road construction feedback;
- road density.

Determine whether the visual language supports the existing simulation rules.

The player should not need to inspect source code to understand:

> "This building is physically disconnected."

Do not add new indicators automatically.

Only identify a gap if existing visual feedback is insufficient.

---

# 7. Evaluate simulation-state readability

Check whether important state changes are visible.

Examples:

### Building

- under construction;
- operational;
- idle;
- staffed;
- unstaffed;
- inaccessible.

### Workforce

- assigned;
- vacant;
- reassigned.

### Economy

- production;
- income;
- upkeep;
- affordability.

### Progression

- Village;
- Town;
- objective completion.

Determine which states are:

- visually obvious;
- communicated through HUD/status;
- communicated only through interaction;
- ambiguous.

Do not duplicate information unnecessarily.

---

# 8. Evaluate lighting and atmosphere

Inspect the actual scene.

Evaluate:

- light direction;
- shadow readability;
- building separation;
- road readability;
- terrain contrast;
- emissive elements;
- atmospheric depth;
- contrast between world and HUD;
- visual noise.

The target is not photorealism.

The target is a coherent **dark futuristic maquette**.

Check whether the scene currently feels:

- too flat;
- too bright;
- too noisy;
- too primitive;
- too game-like;
- too UI-heavy;
- insufficiently spatial.

Only document concrete observations.

Avoid vague statements such as:

> "The graphics could be improved."

---

# 9. Evaluate responsive visual identity

Compare desktop and narrow layouts.

Check whether:

- buildings remain distinguishable;
- roads remain visible;
- colonists remain visible;
- lighting remains coherent;
- HUD remains secondary;
- board remains the primary visual object;
- text does not overwhelm the world;
- no responsive state creates a visibly broken composition.

The 10DB accepted board clipping is not itself a defect.

Do not reopen it unless visual presentation creates a separate meaningful problem.

---

# 10. Identify placeholder-quality elements

Search the rendered product for elements that visibly communicate:

- prototype;
- debug tool;
- unfinished implementation;
- accidental browser-default UI;
- inconsistent visual language;
- temporary visual treatment.

Examples worth investigating:

- raw debug-looking labels;
- inconsistent typography;
- arbitrary borders;
- generic placeholder icons;
- mismatched shadows;
- visibly temporary colors;
- rendering artifacts;
- duplicated UI conventions.

Do not remove useful debug/status information merely because it is technical.

The criterion is whether it damages the shipped product experience.

---

# 11. Evaluate visual consistency

Check consistency between:

- world;
- buildings;
- roads;
- colonists;
- HUD;
- objective panel;
- scenario selection;
- buttons;
- status feedback;
- progression UI.

Look for contradictions such as:

- one component using a completely different visual language;
- inconsistent spacing;
- inconsistent corner treatment;
- inconsistent typography;
- inconsistent state indicators;
- inconsistent intensity of borders/glows;
- multiple competing design systems.

Do not introduce a design system abstraction in this step.

---

# 12. Distinguish visual quality from personal preference

Every finding must be classified as one of:

### A — Concrete presentation problem

Reproducible and materially affects:

- comprehension;
- spatial readability;
- state readability;
- product identity;
- perceived completeness.

### B — Minor polish opportunity

Real but not sufficient for a dedicated implementation step.

### C — Intentional / acceptable

Different from some possible aesthetic, but coherent with the product.

### D — New product direction

A larger visual opportunity that would constitute a deliberate art-direction decision rather than a bug.

Do not rank or score findings.

---

# 13. Implementation gate

At the end choose exactly one outcome.

## OUTCOME A — TARGETED VISUAL IMPROVEMENT JUSTIFIED

Use only if one or more Class-A presentation problems are demonstrated.

Define:

- exact problem;
- affected states;
- affected viewports;
- player impact;
- current root cause;
- smallest viable correction;
- explicit non-goals;
- validation requirements.

Do not implement the correction in 10DC.

The next step should be a tightly scoped visual implementation.

---

## OUTCOME B — VISUAL PRESENTATION HEALTHY

Use if the current presentation is coherent and no Class-A issue exists.

Do not create a visual redesign.

Record:

- what was evaluated;
- what works;
- minor polish opportunities;
- why they do not justify implementation;
- what evidence would reopen visual work.

---

## OUTCOME C — VISUAL DIRECTION DECISION REQUIRED

Use only if the audit demonstrates that the current visual identity is internally inconsistent or insufficiently defined, such that a targeted fix cannot be chosen without an explicit art-direction decision.

Do not implement.

Document the specific unresolved direction choices.

---

# 14. Anti-scope

Do NOT:

- redesign the whole UI;
- replace the renderer;
- replace Three.js;
- change camera mechanics;
- change board dimensions;
- add gameplay mechanics;
- add buildings;
- add resources;
- add progression;
- add scenarios;
- change economy;
- change roads;
- change persistence;
- change SAVE_VERSION;
- introduce a design-system rewrite;
- introduce a new asset pipeline;
- add post-processing merely because it looks impressive;
- add animations without a demonstrated purpose;
- add decorative effects that reduce readability.

Do not turn this into an art-production project.

---

# 15. Required audit artifact

Create:

```text id="n2k5q8"
tests/visualIdentityPresentationAudit.test.ts
```

The test should encode deterministic, measurable findings where possible.

Examples:

- building type visual differentiation;
- board/world visibility;
- state indicator presence;
- HUD/world bounds;
- responsive visual constraints;
- required visual elements present;
- absence of known rendering regressions.

Do not encode subjective judgments as tests.

---

# 16. Documentation

Create:

```text id="r7v4cx"
docs/roadmap/Step10DC.md
```

It must contain:

1. original prompt/specification;
2. recovered visual direction;
3. rendered states inspected;
4. viewport measurements;
5. hierarchy findings;
6. building identity findings;
7. road/accessibility findings;
8. simulation-state readability;
9. lighting/atmosphere findings;
10. responsive findings;
11. placeholder/inconsistency findings;
12. classified findings;
13. final outcome;
14. reopening evidence;
15. explicit non-goals;
16. complete validation results.

Include actual screenshots or measurable browser evidence where the existing audit infrastructure supports them.

---

# 17. Validation

### Focused

```bash id="yqg3j1"
pnpm vitest run tests/visualIdentityPresentationAudit.test.ts
```

### Full

```bash id="v4w1z6"
pnpm vitest run
```

Expected baseline is approximately:

```text id="y5l6p2"
1836 / 1836
```

If the repository has changed legitimately, report the actual result.

### Static

```bash id="w8n0kd"
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm exec prettier --check .
git diff --check
```

Use the project's actual formatting command if different.

### Browser

Use headed browser validation.

Required:

```text id="j3d8pk"
1280×800
420×740
360×640
```

Validate representative states:

- early settlement;
- developed settlement;
- construction/pressure state;
- Town;
- scenario completion.

Run the existing product and relevant E2E audits as regression coverage.

### GPU

Run the existing headed GPU/WebGL2 verification.

Expected:

```text id="k4s9mw"
WebGL2
NVIDIA RTX 3070
hardware accelerated
0 errors
```

Do not claim GPU validation unless actually run.

---

# 18. Final scope audit

Before committing:

```bash id="b7v3kq"
git status --short
git diff --stat
git diff --check
git diff --name-only
```

Expected changes:

```text id="c9m2tx"
tests/visualIdentityPresentationAudit.test.ts
docs/roadmap/Step10DC.md
```

If the investigation discovers that implementation is required, stop at the gate.

Do not silently implement the visual correction in 10DC.

Do not touch:

```text id="e4r6ps"
AGENTS.md
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

If absent, report them as absent.

---

# 19. Commit

If the investigation is complete:

```text id="u6k1rp"
Step 10DC: Visual Identity and Presentation Gate
```

Commit only the intended audit artifacts.

Do not push.

---

# Final report

Return:

- Outcome A/B/C;
- recovered visual direction;
- concrete findings;
- representative states inspected;
- viewport results;
- building identity;
- road/accessibility readability;
- simulation-state readability;
- lighting/atmosphere;
- responsive presentation;
- placeholder/inconsistency findings;
- focused tests;
- full Vitest;
- typecheck;
- lint;
- build;
- browser;
- GPU;
- diff-check;
- changed files;
- commit hash;
- confirmation that gameplay, economy, persistence, progression, and `SAVE_VERSION` were unchanged.

Core principle:

> Do not improve NOVA's visuals because they could theoretically be prettier.
>
> Improve them only when the rendered product demonstrates a concrete presentation problem or a clearly justified product-direction gap.

---

## As-Built

Audit only. `src/` is unchanged; the artefacts are
`tests/visualIdentityPresentationAudit.test.ts` (deterministic visual-spec
checks) and this record. Rendered evidence: the headed browser suites, whose
screenshots live in the gitignored `artifacts/` tree (referenced below).

### Recovered Visual Direction

**Explicit documented intent** (`docs/12-visual-direction.md`):

- identity: futuristic, functional, restrained;
- palette: black, graphite, deep blue, cold cyan accents, restrained pale
  highlights;
- architecture: engineered masses, clear entrances, modular, controlled
  emissive details, visibly integrated infrastructure;
- transport lines: luminous blue lines that represent real network state, not
  decorative trails;
- world appearance communicates simulation state (construction, operational,
  occupied, active network, unavailable service, shortage);
- avoid giant gradients, excess bloom, cyberpunk clutter, random holograms,
  decorative roads.

**Observable implementation** (inspected, `src/renderer/three/`):

- `scene.ts`: dark `#0b0e13` background, `#14181f` ground, `#2a3140` grid,
  ambient 0.55 + one directional key (1.1) from `(6, 12, 4)`, fixed angled
  perspective camera;
- `entityViews.ts`: per-type colour + silhouette + height (below);
- `novaRenderer.ts`: teal `#7fd1c8` valid / red `#d1584f` invalid placement
  indicator and road preview, brown `#5a4436` blocked-terrain instances;
- `index.html`: dark panel `rgba(13,17,24,0.86)`, `#2a3140` borders, gold
  `#d9a441` product/objective accent, teal `#7fd1c8` status, red `#d98f8f`
  blocked warning.

**Personal preference**: not used as evidence anywhere in this audit.

### Rendered States Inspected

| State | How produced | Screenshot evidence |
| --- | --- | --- |
| Early settlement | free-play start / `first-settlement` | `artifacts/progression/01-free-play-wilderness.png`, `artifacts/product-audit/01-first-settlement.png` |
| Developed settlement | `housing-composition` at Village (2 residences, Farm, Well, network) | `artifacts/housing-composition/03-village.png` |
| Village transition | `water-constraint` reaching Village | `artifacts/progression/04-village.png` |
| Staffed/vacant production | `upkeep` staffed and vacant Workshop | `artifacts/upkeep/03-staffed.png`, `02-vacant.png` |
| Construction | Workshop/Residence under construction | `artifacts/upkeep/09-construction.png`, `artifacts/product-audit/01-town-threshold.png` |
| Town | `town-threshold` / `town-gate` | `artifacts/product-audit/01-town-threshold.png` (`Town` capability run) |
| Completion | `Objective complete` states | `artifacts/progression/04-village.png`, `artifacts/housing-composition/03-village.png` |

### Viewport Measurements

- Board bounds and framing: unchanged from Step 10DB (1280x800 board
  x∈[310,970] y∈[255,619]; narrow viewports clip only the outer two columns).
- HUD occlusion: 0 playable cells at 1280x800 / 420x740 / 360x640 (10CZ intact,
  re-verified by the product audit during this step).
- The narrow screenshot (`artifacts/product-audit/02-360.png`) shows the HUD as
  a compact top-left panel with the board as the dominant object beneath it.

### Hierarchy Findings

The rendered product has a clear three-level hierarchy:

- **Primary** — board, buildings, roads, layout: the largest, brightest masses
  (gold/green/blue/teal on a near-black ground); nothing in the HUD competes.
- **Secondary** — colonists (small teal spheres on residences), operational vs
  construction state (colour + height), accessibility (road slabs + marking).
- **Tertiary** — HUD rows, objective/checklist, controls, status: contained in a
  single panel that no longer overlaps the board.

No HUD-overpowers-world, buildings-blend-into-terrain, roads-disappear,
colonists-invisible, state-only-in-text or competing-high-contrast problems were
found. The board reads as the primary spatial object at every viewport.

### Building Identity Findings

Pinned deterministically by the new test:

| Type | Silhouette | Operational colour | Height |
| --- | --- | --- | --- |
| Residence | box | gold `0xd9a441` | 0.55 |
| Farm | box | green `0x5da85f` | 0.55 |
| Workshop | cylinder | staffed blue `0x4a90d9` / vacant dim `0x2f4a63` | 0.72 |
| Well | cylinder | teal `0x39c5bb` | 0.55 |
| under construction | (any) | grey `0x6b7280` | 0.18 |

All four operational colours are pairwise distinct, and the construction form is
distinct from every operational form in both colour and height. Residence/Farm
share a silhouette but differ strongly in hue; Workshop/Well share a cylinder but
differ in hue and height. Each building is readable without its label.

### Road / Accessibility Findings

The road language matches the simulation rules: an operational road is a slate
slab `0x39404f` with a lighter marking `0x8f9aad`; an under-construction road is
the grey slab with **no marking**; the marking's shape is derived from the
snapshot's connection flags (span `0.9` along connected axes, pad `0.34` when
isolated or cornered). Disconnected networks therefore read as visibly
unmarked/separated slabs, and the placement preview colours valid/ready teal and
refused red before the player commits. No new indicator is required.

### Simulation-State Readability

| State | Visual channel | Verdict |
| --- | --- | --- |
| under construction | grey + short + inspector `Under construction` | obvious |
| operational | type colour + taller | obvious |
| staffed Workshop | bright blue vs vacant dim blue | obvious |
| vacant / idle | dim colour + inspector `vacant` / `upkeep 0` | visible/contextual |
| inaccessible production | inspector `production blocked by road` + no output | contextual |
| resource pressure | HUD rows + causal status line (`consumed N food`, `upkeep shortfall — paid 0/1`) | obvious |
| affordability | hover text + teal/red placement indicator | obvious |
| progression / Town | Stage/Next + checklist + Town capability line | obvious |
| objective completion | `Objective complete` (persistent) | obvious |

No important state is conveyed solely through text where a visual channel is
required, and no information is duplicated to the point of noise.

### Lighting / Atmosphere Findings

- One directional key at `(6, 12, 4)` with ambient fill gives a coherent
  top-right-lit dark maquette; building tops read brighter than sides.
- Shadow maps are **not** enabled, so there are no cast shadows; separation
  relies on colour, silhouette and height. In the inspected screenshots this is
  clean and legible rather than broken, matching the restrained direction.
- Emissive treatment is limited to the flat placement indicators and the road
  markings; no bloom/holograms/clutter, consistent with the "avoid" list.
- Terrain blocked cells use a muted brown `0x5a4436` that stays subordinate to
  buildings.
- No rendering artifacts, z-fighting or broken lighting were observed.

### Responsive Findings

- At 420x740 and 360x640 the board remains the dominant object, the HUD is a
  height-capped scrollable panel, and buildings/roads/colonists stay
  proportional and distinguishable.
- No responsive state produced a visibly broken composition; text never
  overflows the panel; the 10DB outer-column clipping is accepted and is not a
  visual-identity problem.
- The screenshots confirm the narrow HUD does not cover board cells (10CZ).

### Placeholder / Inconsistency Findings

- No raw debug panels, JSON dumps, browser-default controls, mismatched shadows
  or competing design systems were found. Buttons, panel, objective, status and
  progression share one styling language; the world palette and the HUD palette
  use the same gold/teal/red semantics.
- Minor: the inspector empty state reads `Building: [ none ]` (square brackets)
  next to `No building selected` — slightly tool-like and redundant.
- Minor: the HUD body type is 11-12px and the panel scrolls even at 1280x800, so
  lower rows need scrolling.

### Classified Findings

- **A — concrete presentation problem: none.** No state, hierarchy, identity,
  road, atmosphere or responsive finding materially harms comprehension, spatial
  readability or perceived completeness.
- **B — minor polish opportunities (recorded, no dedicated step justified):**
  - B1 Workshop and Well share a cylinder silhouette and a similar cool hue;
    they differ by height (0.72 vs 0.55) and hue, and the inspector labels them,
    but the contrast could be stronger at a glance.
  - B2 the inspector empty state `[ none ]` is slightly tool-like/redundant.
  - B3 HUD body type is small and the panel scrolls at desktop.
  - B4 grid/ground contrast is deliberately low; cell targeting leans on the
    hover indicator.
- **C — intentional / acceptable:** the dark restrained maquette identity,
  palette, gold/teal/red semantics, building colours and silhouettes, road
  lifecycle language, colonist markers, three-level hierarchy, and the absence
  of bloom/shadows/animations.
- **D — new product direction: none proposed.** A richer visual tier (shadow
  maps, ambient occlusion, emissive animation, post-processing) would be a
  deliberate art-direction decision, not a defect, and is not justified by any
  observed presentation problem.

### Final Outcome

**OUTCOME B — VISUAL PRESENTATION HEALTHY.**

The rendered product communicates a coherent, distinctive dark-futuristic
maquette identity; building identity, road/accessibility language, state
readability, hierarchy, atmosphere and responsive behaviour are all adequate for
the shipped product. No Class-A problem exists, so no visual implementation step
is created.

### Reopening Evidence

Reopen visual work only with new evidence:

- a reproducible Class-A presentation problem (buildings no longer readable
  without labels, roads disappearing, HUD dominating the board, a state visible
  only in text, a visibly broken responsive composition); or
- an explicit product decision to add a visual tier (shadows/AO/emissive
  animation/post-processing) with a stated player-facing purpose; or
- a new building/entity type added to the simulation that lacks a distinct
  silhouette/colour, which would require extending the identity rules.

### Explicit Non-Goals

No UI redesign, renderer/Three.js replacement, camera mechanic change, board
size change, gameplay/building/resource/progression/scenario change, economy or
road rule change, persistence or `SAVE_VERSION` change, design-system rewrite,
new asset pipeline, post-processing, animations, or decorative effects.

### Complete Validation Results

- focused: `tests/visualIdentityPresentationAudit.test.ts` — **11/11 PASS**
- full Vitest: **1847 passed / 0 failed (115 files)** (10DB baseline 1836 + 11)
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean
- Prettier: **not configured** in this repository (no config and no dependency);
  the project's formatting/static check is ESLint, which passes. `prettier --check`
  was therefore not applicable.
- browser (headed): product audit PASS; progression, housing, upkeep,
  industrial, town-gate, spatial-readability — all pass; viewports 1280x800,
  420x740, 360x640; representative states early/developed/construction/Town/
  completion inspected via `artifacts/`
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), WebGL2, hardware path,
  zero console/page errors
- `SAVE_VERSION` remains **8**; no gameplay, economy, persistence, progression
  or scenario change.

Commit: `Step 10DC: Visual Identity and Presentation Gate`
