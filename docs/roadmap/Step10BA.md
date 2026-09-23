# STEP 10BA — SPATIAL & WORKFORCE READABILITY CLOSURE

## CONTEXTE

HEAD attendu :

```text id="30663a1"
Step 10AZ — Housing Composition Scenario
```

10AZ est fermé :

* aucun nouveau scénario ;
* catalogue reste à 7 ;
* aucune mécanique ajoutée ;
* `src/` inchangé.

10AZ a toutefois identifié plusieurs problèmes de lisibilité réels :

1. aucune information colony-wide sur le nombre de Residences servies ;
2. le mot `served` sur la ligne Water peut désigner l'état de supply alors qu'une Residence individuelle peut être non desservie ;
3. le placement hover ne prédit pas qu'une Residence sera ou non servie ;
4. la cause d'unemployment n'est pas inspectable ;
5. à 420×740 et 360×640, le HUD couvre environ 95–96 % du viewport ;
6. plusieurs informations causales existent déjà mais apparaissent trop tard.

Cette étape est **UX/readability uniquement**.

---

# OBJECTIF

Améliorer la capacité du joueur à comprendre les conséquences spatiales et workforce de ses décisions **sans ajouter de nouvelle mécanique de simulation**.

Le principe :

> Une information dérivée existante peut être rendue visible plus tôt, mais aucune nouvelle causalité ne doit être créée.

---

# 1. AUDIT EXISTANT AVANT MODIFICATION

Identifier dans le code les sources d'autorité actuelles pour :

* Water supply status ;
* Residence service ;
* workforce eligibility ;
* workplace assignment ;
* unemployed colonists ;
* network membership ;
* placement affordability ;
* placement validation ;
* progression blockers.

Ne pas créer de nouvelles autorités.

---

# 2. PROBLÈME `SERVED`

10AZ montre une ambiguïté entre :

```text
Water row → "served"
```

et :

```text
Residence → served / not served
```

Déterminer les formulations actuelles exactes.

Objectif :

### Colony-wide Water

Décrire :

* capacity ;
* balance ;
* reserve ;
* supply state.

### Residence

Décrire explicitement :

```text
Water: served
```

ou :

```text
Water: not served
```

avec une cause existante si disponible.

Ne pas utiliser le même terme `served` pour deux concepts différents.

---

# 3. COLONY-WIDE SERVED RESIDENCES

Déterminer si le nombre :

```text
servedResidences
```

est déjà dérivable sans ambiguïté.

Si oui, l'exposer dans l'UI existante.

Format possible :

```text
Residences
1 / 2 served
```

ou équivalent cohérent avec le langage visuel actuel.

Ne pas créer de nouvelle règle.

Ne pas persister cette valeur.

Ne pas ajouter de nouveau modèle de state.

---

# 4. UNEMPLOYMENT CAUSE

Identifier pourquoi un colonist n'est pas employé.

Les causes existantes peuvent inclure :

* aucun workplace disponible ;
* workplace non accessible ;
* workplace déjà occupé ;
* workplace incompatible avec le réseau ;
* colonist affecté à une construction ;
* autre cause déjà présente dans le code.

Ne pas inventer de nouvelle classification.

Créer une représentation lisible uniquement à partir des raisons déjà calculées.

Exemple conceptuel :

```text
Work
Unemployed
Reason: no reachable workplace
```

ou :

```text
Work
Unemployed
Reason: all eligible workplaces occupied
```

Utiliser le vocabulaire réellement présent dans le moteur.

---

# 5. PLACEMENT PREVIEW

10AZ a identifié que :

> Deux cellules peuvent avoir le même coût et la même affordance, mais produire des conséquences Water/network différentes après placement.

Déterminer quelles conséquences sont **déjà calculables avant commit**.

Pour une Residence candidate :

* network auquel elle serait rattachée ;
* Water coverage ;
* served/not served ;
* éventuellement workforce connectivity si cela existe déjà dans les queries.

Ne pas recalculer la simulation.

Ne pas simuler un tick.

Ne pas créer de preview approximative.

Le preview doit être dérivé des mêmes primitives que l'autorité de placement.

---

# 6. PREVIEW CONTRACT

Si un preview est possible :

```text
hover cell
↓
existing placement validation
↓
existing derived network/access queries
↓
read-only consequence summary
```

Il doit respecter :

* déterminisme ;
* insertion-order invariance ;
* aucune mutation ;
* aucune réservation de ressource ;
* aucune création de réseau persisté.

Si le coût algorithmique ou architectural est disproportionné :

> ne pas implémenter.

Le rapport doit alors expliquer pourquoi.

---

# 7. MOBILE HUD

10AZ mesure :

* ~95 % du viewport occupé à 420×740 ;
* ~96 % à 360×640.

Ne pas résoudre cela par une refonte générale.

Mesurer précisément :

* hauteur occupée ;
* largeur occupée ;
* board visible ;
* overlay overlap ;
* éléments réellement nécessaires pendant la construction.

Chercher le **minimum de surface UI** permettant de conserver les informations causales.

---

# 8. INFORMATION PRIORITY

Classer les informations existantes en :

### Always visible

Informations nécessaires pour prendre une décision immédiate.

### Contextual

Informations visibles uniquement pendant :

* placement ;
* sélection ;
* inspection ;
* construction.

### Diagnostic

Informations détaillées uniquement dans l'inspector.

Ne pas supprimer une information importante uniquement pour gagner de la place.

---

# 9. DESKTOP

Valider à :

```text
1280x800
```

Vérifier :

* board ;
* HUD ;
* palette ;
* inspector ;
* placement preview ;
* construction feedback.

Aucune régression par rapport à 10AT/10AW.

---

# 10. MOBILE

Valider obligatoirement :

```text
420x740
360x640
```

Vérifier :

* aucune horizontal overflow ;
* cellules importantes visibles ;
* terrain/road/building placement visible ;
* feedback de refus visible ;
* selected building visible ;
* Water state lisible ;
* Residence service lisible ;
* workforce state lisible.

Ne pas accepter simplement :

> "l'overlay scroll".

La question est :

> Le joueur peut-il encore voir le monde et comprendre ce qu'il fait ?

---

# 11. TERRAIN READABILITY

10AW avait identifié que certains blocked cells peuvent être masqués derrière le HUD.

Tester :

* blocked cells dans le coin gauche ;
* blocked cells sous overlay ;
* blocked cells dans une zone libre ;
* terrain chokepoint fixture.

Si une légende terrain est nécessaire, utiliser l'existant.

Ne pas créer un nouveau système de terrain.

---

# 12. REAL COMMAND VALIDATION

Ne pas se limiter aux snapshots.

Dans le browser réel :

### Case A

Hover une Residence candidate sur un réseau servi.

### Case B

Hover une Residence candidate sur un réseau non servi.

### Case C

Sélectionner un colonist unemployed.

### Case D

Sélectionner une Residence non servie.

### Case E

Créer puis réparer un lien routier.

Observer que l'UI change réellement après chaque commande.

---

# 13. NO GAMEPLAY CHANGE

Cette étape ne doit modifier :

* production ;
* consommation ;
* coûts ;
* workforce rules ;
* Water rules ;
* Food rules ;
* Material rules ;
* terrain rules ;
* progression rules ;
* scenario objectives ;
* save schema.

SAVE_VERSION reste :

```text id="0slb1f"
7
```

---

# 14. IMPLEMENTATION SCOPE

Cette étape peut modifier uniquement :

* application queries si nécessaire pour exposer une donnée déjà calculable ;
* app UI ;
* renderer UI feedback ;
* tests ;
* E2E ;
* documentation.

Toute modification d'un domain rule est interdite.

Si une modification du domain devient nécessaire :

> arrêter l'implémentation de cette partie et la documenter comme nouvelle dépendance.

---

# 15. TESTS

Ajouter des tests pour :

### Water vocabulary

Vérifier que :

* colony supply ;
* Residence service ;

ne sont pas confondus.

### Served count

Vérifier plusieurs réseaux :

```text
2/2
1/2
0/2
```

### Workforce diagnosis

Vérifier les causes existantes.

### Placement preview

Si implémenté :

* same state before/after hover ;
* same state after repeated hover ;
* deterministic;
* insertion-order invariant.

### Mobile

E2E :

```text
420x740
360x640
```

---

# 16. ACCEPTANCE CRITERIA

Le step est PASS uniquement si :

### A — Water language

Un joueur ne peut plus raisonnablement confondre :

```text
Water supply
```

et :

```text
Residence served
```

### B — Residence service

Le nombre de Residences servies est visible quelque part lorsque pertinent.

### C — Workforce

Un colonist unemployed possède une explication inspectable lorsque le moteur connaît déjà la cause.

### D — Placement

Si une conséquence Water/network est calculable sans simulation, elle est visible avant placement.

Sinon, documenter pourquoi elle reste post-placement.

### E — Mobile

À 420×740 et 360×640 :

* le board reste exploitable ;
* l'UI ne masque pas systématiquement les cellules décisionnelles ;
* aucune horizontal overflow.

### F — Gameplay invariant

Les mêmes commandes produisent exactement les mêmes états de simulation qu'avant.

---

# 17. VALIDATION FINALE

Exécuter :

```text
pnpm typecheck
pnpm lint
pnpm build
```

Puis :

* Vitest complet ;
* determinism ;
* insertion-order ;
* save/load ;
* browser headless ;
* browser headed ;
* GPU E2E.

Comparer les résultats gameplay avec le baseline précédent.

---

# FINAL REPORT

Retourner :

```text id="c2x7pq"
STEP 10BA — FINAL REPORT

Starting commit:
Final commit:

WATER LANGUAGE
- Previous wording:
- Final wording:
- Colony supply:
- Residence service:

SERVED RESIDENCES
- 2/2:
- 1/2:
- 0/2:
- Query authority:

WORKFORCE READABILITY
- Existing causes:
- Newly exposed:
- Inspector result:

PLACEMENT PREVIEW
- Implemented:
- Existing data reused:
- Network preview:
- Water preview:
- Mutation:
- Determinism:

MOBILE
| Viewport | Board usable | HUD overlap | Horizontal overflow | Decision cells visible |
|---|---:|---:|---:|---:|
| 420x740 | | | | |
| 360x640 | | | | |

TERRAIN
- Legend:
- Blocked-cell visibility:
- Chokepoint readability:

GAMEPLAY INVARIANTS
- Food:
- Water:
- Material:
- Workforce:
- Progression:
- Terrain:
- Scenarios:

ARCHITECTURE
- Domain changes:
- Application changes:
- UI changes:
- Persistence:
- SAVE_VERSION:

VALIDATION
- typecheck:
- lint:
- build:
- Vitest:
- determinism:
- insertion-order:
- save/load:
- browser:
- GPU:

CLASSIFICATION

A — PASS
B — PARTIAL
C — NOT JUSTIFIED

DECISION

[One factual paragraph.]

NEXT DEPENDENCY:
```

# HARD BOUNDARIES

Ne pas :

* ajouter de mécanique ;
* ajouter de règle Water ;
* modifier la workforce ;
* modifier les coûts ;
* modifier les taux ;
* modifier la progression ;
* créer Town ;
* créer un nouvel objectif ;
* créer un nouveau scénario ;
* créer un nouveau type de colonist ;
* ajouter adjacency ;
* ajouter density ;
* ajouter congestion ;
* ajouter terrain economics ;
* persister une information dérivée.

Le but est uniquement :

> **rendre visibles plus tôt et plus clairement les conséquences causales que NOVA sait déjà calculer.**

Si une information ne peut pas être déterminée proprement avec les primitives existantes :

> ne pas l'inventer.


# Documentation (as-built) — Step 10BA

Starting commit: `30663a1` (Step 10AZ).
Final commit: this commit.

**UX / READABILITY ONLY — no gameplay change.** No domain file was touched: the
step adds application queries that only READ existing derivations, app/UI
surfaces, one contract test file (10 tests) and one browser verification suite.
SAVE_VERSION stays 7, the catalogue stays at 7 scenarios, no new objective type,
no new mechanic, no persisted derived value.

## 1. Existing authorities (audited before touching anything)

| responsibility | authority (unchanged) |
| --- | --- |
| Water supply state / capacity / balance / reserve | `getWaterSupplyStatus` → `getWaterStatus` → `waterProductionForTick`, `waterNeedForTick` (domain `water.ts`) |
| Residence service (coverage) | `getWaterCoverage().servedResidenceIds` (domain `water.ts`) |
| Network membership | `getRoadNetworks` (09D) + `getBuildingRoadAccessWithNetworks` (09E) |
| Workforce eligibility / assignment | `validateReassignment` / `getReassignmentOptions` (10M) + `assignJobs` |
| Placement affordability / validation | `getPlacementAffordability` / `validatePlacement` / `validateRoadsPlacement` |
| Progression blockers | `getProgression` + `getObjectiveStatus` |

Nothing new was invented: every surface this step adds composes those reads.

## 2. Water language (finding 1 and 2 of 10AZ)

| | before | after |
| --- | --- | --- |
| HUD Water row suffix | ` · served` for the **supplied** state | ` · supplied` (`WATER_SUPPLY_LABELS`: `no service` / `reserve 0` / `supplied` / `draining` / `shortage`, empty for the bootstrap `inactive`) |
| Residence inspector | `Water served` / `Water not served (no covered Well on this network)` | `Water: served` / `Water: not served (no covered Well on this network)` |
| colony-wide service | not shown | new stat row `Residences: N / M served` |

Measured in the browser on the split fixture: `Water 20 · supplied` **and**
`Residences 1 / 2 served` simultaneously — two different facts, two different
words, no contradiction. The word `served` now appears only for Residential
SERVICE; the supply vocabulary is pinned by a unit test that fails if any supply
label matches `/served/i`.

## 3. Colony-wide served count (10AZ finding 1)

Answerable now, from the EXISTING derived query (`getWaterSupplyStatus` already
carried `servedResidences` and `residences`): a new stat row formats
`server / total served`. Measured and pinned in tests: `2 / 2` (one joined
network), `1 / 2` (two networks, one of them the Well's), `0 / 2` (the Well is
unreachable), `0 / 0` (no operational Residence). Nothing is persisted.

## 4. Workforce diagnosis (10AZ finding 4)

The 10AZ measurement was that an unemployed colonist had **no inspectable
cause**: the reassignment control only appears for a building that already
employs someone, so `Jobs 0 / 1` was a dead end.

* Existing causes reused: the domain's own reassignment reasons
  (`notConnected`, `workplaceOccupied`, `notOperational`, `notWorkplace`,
  `unknownWorkplace`) plus the construction-assignment field. **No new
  classification was invented.**
* New surface: `getWorkDiagnosis(state, colonistId)` (application query) returns
  the colonist's employment flag, the crew flag, the assignment mode, the
  operational workplace count and a **tally per existing reason**. The Residence
  inspector's existing worker row now renders it:
  * `Work — unemployed · 1 with no road access` (measured in the Recovery
    scenario through real selection),
  * `Work — unemployed · no operational workplace`,
  * `Work — unemployed · 1 occupied`,
  * `Work — construction crew (not employed)`,
  * `Work — employed (automatic assignment)`.

## 5. Placement spatial preview (10AZ finding 3, the decisive one)

10AZ showed the hover gave identical feedback for a cell that would be served
and one that would not. Now, when a cell is placeable, the status line carries
the network consequence computed from existing primitives only
(`getPlacementSpatialPreview`: adjacent operational road cells → their 09D
network → whether 10P coverage includes it → how many operational workplaces
that network reaches):

```text
cell 3,0 — ready · material 25 · water: served · 2 workplaces reachable
cell 0,0 — ready · material 25 · no adjacent road → would never be water-served
cell 1,1 — ready · material 25 · water: NOT served (no covered Well on this network)
```

No simulation, no tick, no reservation, no approximation: the preview is the same
rule the placement authority uses, evaluated for a hypothetical cell. Pinned by
tests: **equivalence with the real access and coverage of every existing
building** in three states (including the terrain fixture) — same networks, same
covered verdict, and for Residences the preview's coverage verdict IS the service
verdict; plus purity (repeated calls identical, canonical JSON and hash
unchanged), insertion-order invariance (shuffled road creation → identical
preview) and a gameplay-invariant test (a full command sequence produces the
identical hash with and without preview/diagnosis reads interleaved).

## 6. Mobile HUD (10AZ finding 5)

| viewport | HUD before | HUD after (expanded) | board free (expanded) | board free (collapsed) | blocked cells behind the HUD |
| --- | ---: | ---: | ---: | ---: | --- |
| 1280×800 | 398 px (31 %) | 398 px (31 %) | 68 % | 71 % | 0 / 12 (both states) |
| 420×740 | ~397 px (**95 %**) | 244 px (**58 %**) | 40 % | 40 % | 11 / 12 expanded → **0 / 12 collapsed** |
| 360×640 | 344 px (**96 %**) | 210 px (**58 %**) | 39 % | 39 % | 11 / 12 expanded → **0 / 12 collapsed** |

Two minimal changes, no redesign:

1. a narrow-viewport media query (`max-width: 560px`) caps the panel at 58 % of
   the viewport and tightens padding/type so the content still fits;
2. a **HUD collapse control** (`HIDE` / `SHOW`, `aria-expanded`) hides the
   palette/progression/stats/inspection panels but deliberately KEEPS the status
   line, so the placement and refusal feedback stays visible while the board is
   free. The state is DOM-only: nothing about the HUD is persisted.

No horizontal overflow at any of the three viewports, and the board is clickable
(with the HUD collapsed, 0 of 12 blocked cells remain behind it).

## 7. Terrain legend (10AZ/10AW finding)

A terrain stat row now appears **only when the world has blocked cells**:
`Terrain: 12 blocked cells (no roads or buildings)`. It uses the existing stat
row pattern (no new terrain system, no new renderer work) and is exposed as
`stat-terrain` for the audits. Combined with the placement preview, the
chokepoint decision is readable before and after the command.

## 8. Real command verification (`e2e/spatialReadabilityAudit.mjs`)

All five cases the step asks for, through the shipped UI only:

| case | measured result |
| --- | --- |
| A — hover a Residence candidate on a served network | `cell 3,0 — ready · material 25 · water: served · 2 workplaces reachable` |
| B — hover a candidate that would not be served | `cell 0,0 — ready · material 25 · no adjacent road → would never be water-served` |
| C — the unemployed colonist (Recovery scenario) | `Jobs 0 / 1`, inspector: `Work — unemployed · 1 with no road access` |
| D — an unserved / served Residence | `Water: not served (no covered Well on this network)` / `Water: served` |
| E — build three real road cells, then observe | `Jobs 0 / 1 → 1 / 1`, inspector `Work — employed (automatic assignment)` |

Two earlier-step assertions were migrated with the wording (they asserted the old
`Water served` text): `e2e/readabilityAudit.mjs` and `e2e/waterRun.mjs`. The
superseded 10AZ readability audit (`e2e/housingCompositionReadabilityAudit.mjs`)
was removed and replaced by the wider `e2e/spatialReadabilityAudit.mjs`, which
covers the same six questions plus the five command cases and the mobile budget.

---

## 9. FINAL REPORT

```text
STEP 10BA — FINAL REPORT

Starting commit: 30663a1 (Step 10AZ)
Final commit:    this commit

WATER LANGUAGE
- Previous wording: the Water row used ` · served` for the supplied SUPPLY state,
  while the Residence inspector used `Water served` / `Water not served (...)`
  for COVERAGE — the same word for two different facts
- Final wording: supply labels live in ONE place (`WATER_SUPPLY_LABELS`, pinned by
  a test that rejects any label matching /served/i); the Residence inspector says
  `Water: served` / `Water: not served (no covered Well on this network)`
- Colony supply: `supplied` / `draining` / `shortage` / `reserve 0` / `no service`
  (empty when no Well exists — the documented bootstrap state)
- Residence service: `Water: served` per Residence, plus the colony-wide
  `Residences: N / M served` stat row

SERVED RESIDENCES
- 2/2: one joined network covering both Residences
- 1/2: two networks, one of them covered by the Well
- 0/2: the Well is unreachable, so it covers no network
- (0/0 when the colony has no operational Residence at all)
- Query authority: `getWaterSupplyStatus().servedResidences` / `.residences`
  (existing derived values; formatted by `formatResidenceService`, never stored)

WORKFORCE READABILITY
- Existing causes: the domain's reassignment reasons via
  `validateReassignment`/`getReassignmentOptions` (`notConnected`,
  `workplaceOccupied`, `notOperational`, `notWorkplace`, `unknownWorkplace`)
  plus the construction-assignment field
- Newly exposed: `getWorkDiagnosis` (application query) — counts per existing
  reason, the crew flag, the assignment mode and the operational workplace count
- Inspector result: `Work — unemployed · 1 with no road access` (measured),
  `... · no operational workplace`, `... · 1 occupied`,
  `Work — construction crew (not employed)`, `Work — employed (automatic assignment)`

PLACEMENT PREVIEW
- Implemented: YES — `getPlacementSpatialPreview(state, cell)` and the status-line
  suffix shown whenever the cell is placeable
- Existing data reused: adjacent operational road cells (getRoadIdAtCell +
  isOperationalRoad), 09D networks (getRoadNetworks), 10P coverage
  (getWaterCoverage), 09E access (getBuildingRoadAccessWithNetworks)
- Network preview: the networks the candidate would join, and whether one of them
  is covered: `water: served · N workplaces reachable` /
  `water: NOT served (no covered Well on this network)` /
  `no adjacent road → would never be water-served`
- Mutation: none (measured: canonical JSON and hash unchanged after repeated
  reads; the preview is a pure function of the state)
- Determinism: repeated calls identical, insertion-order invariant (shuffled road
  creation gives the same preview), and equivalence with the REAL access/coverage
  of every existing building in three states (no divergence from the authority)

MOBILE
| Viewport | Board usable | HUD overlap | Horizontal overflow | Decision cells visible |
|---|---:|---:|---:|---:|
| 420x740 | yes (40% of the board free expanded, 100% reachable collapsed) | 58% of the viewport width expanded, ~0% collapsed | none | yes — 11/12 blocked cells behind the HUD expanded, 0/12 collapsed |
| 360x640 | yes (39% free expanded, 100% reachable collapsed) | 58% expanded, ~0% collapsed | none | yes — 11/12 behind the HUD expanded, 0/12 collapsed |

TERRAIN
- Legend: new stat row, shown only when the world has blocked cells:
  `Terrain: 12 blocked cells (no roads or buildings)` (existing stat-row pattern,
  no new terrain system)
- Blocked-cell visibility: unchanged while the HUD is expanded at 420x740 and
  360x640 (the panel is left-aligned); zero occluded cells once the HUD is
  collapsed, measured in the spatial audit
- Chokepoint readability: the placement preview now names the network
  consequence, which is exactly the information 10AZ found missing

GAMEPLAY INVARIANTS
- Food: unchanged (same rates, same all-or-nothing rule; 1546 tests pass)
- Water: unchanged (capacity 2/Well, coverage per network, shortage semantics)
- Material: unchanged (2/worker gross, 1 upkeep, storage 25, costs)
- Workforce: unchanged (09K mobility, 09M preference, 10M manual override,
  10Y crew)
- Progression: unchanged (same thresholds; no new stage, no new condition)
- Terrain: unchanged (spatial input only; the legend is presentation)
- Scenarios: unchanged (catalogue 7, none terrain-bearing, no objective change)
- Measured invariant: an identical command sequence produces an identical
  canonical hash with and without the new preview/diagnosis reads interleaved

ARCHITECTURE
- Domain changes: none (no file under src/domain was modified)
- Application changes: +getPlacementSpatialPreview (queries/placement.ts),
  +getWorkDiagnosis (queries/inspection.ts), +WATER_SUPPLY_LABELS,
  formatWaterSupplySuffix, formatResidenceService, isResidenceWaterServed
  (queries/resources.ts) — derived reads only
- UI changes: index.html (Residences row, terrain legend row, HUD header +
  collapse control, narrow-viewport media query), src/app/main.ts (supply
  vocabulary, placement preview suffix, workforce diagnosis in the inspector,
  HUD collapse wiring, two new diagnostic stats fields)
- Persistence: none (7 save keys, `resources` = construction/food/water)
- SAVE_VERSION: 7 (unchanged)

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 82 files / 1546 tests PASS (+1 file / +10 tests; 81/1536 before)
- determinism: PASS     - insertion-order: PASS     - save/load: PASS
- browser: 18 / 18 suites headless ALL PASS (the superseded 10AZ readability
  audit was replaced by the wider spatial readability audit)
- GPU: ALL PASS (headed)

CLASSIFICATION

A — PASS

DECISION

All six acceptance criteria are met with measured evidence and no gameplay
change: the Water vocabulary can no longer be confused (the supply suffix never
contains the word `served`, and the browser shows `Water 20 · supplied` next to
`Residences 1 / 2 served`), the colony-wide served count is visible on a new stat
row built from the existing derived status, an unemployed colonist now has an
inspectable cause composed only of the domain's own rejection reasons
(`Work — unemployed · 1 with no road access`), and the decisive placement
consequence 10AZ identified is visible BEFORE committing — a Residence candidate
now reports the network it would join, whether that network is covered and how
many workplaces it reaches, proven equivalent to the real access/coverage of
existing buildings and provably read-only. On mobile, the HUD cap (58 % of the
viewport) plus a collapse control keep the board exploitable at 420x740 and
360x640 with no horizontal overflow — 11 of 12 blocked cells used to sit behind
the panel and none do once it is collapsed, while the status/refusal feedback
stays visible — and a terrain legend row names blocked cells the moment terrain
exists. A player who reaches the 10AZ housing decision can now read, before and
after building, exactly why one cell produces a served and staffed settlement
and the other does not.

NEXT DEPENDENCY:
- UX polish (optional) and the standing content decision. Concretely: (1) no
  further mechanic is justified — the deferred 10AP production-rate tuning
  remains the only measured route to a surplus state, i.e. to any real Town
  stage; (2) optional refinements this step deliberately did not take: defaulting
  the HUD to collapsed at narrow viewports (or remembering the player's choice),
  a colonist-roster surface so the workforce diagnosis is reachable without
  selecting the Residence, and a per-Residence service badge on the board itself;
  (3) the 10AZ housing-composition content question is unchanged (classified B,
  not added) and is now blocked only by content quality, not by readability.
```
