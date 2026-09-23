# STEP 10AZ — HOUSING COMPOSITION SCENARIO

## CONTEXTE

HEAD attendu :

```text
1161c35 — Step 10AY: Water Coverage & Service Consistency
```

Les audits système sont maintenant fermés :

* économie 2/2 gelée ;
* Water contract fermé ;
* Food contract fermé ;
* Material contract fermé ;
* terrain implémenté mais non retenu comme nouvelle capacité ;
* aucune capacité Town justifiée par 10AX ;
* progression Village contractuelle ;
* Town+ volontairement non défini.

10AX a néanmoins identifié un phénomène déjà causalement présent :

> Deux colonies avec les mêmes bâtiments, ressources et population peuvent avoir des états différents selon la répartition des Residences entre réseaux routiers.

Ce phénomène utilise uniquement les mécaniques existantes :

* réseau routier ;
* Water coverage ;
* workforce mobility ;
* Residence ;
* Well/Farm ;
* progression.

Il ne nécessite aucune nouvelle règle.

---

# OBJECTIF

Déterminer si ce phénomène peut devenir un **scénario jouable distinct**, utile et lisible, sans modifier le moteur.

Le scénario doit tester une idée précise :

> **Le placement de plusieurs Residences n'est pas seulement une question de capacité : leur appartenance au réseau détermine quelles populations peuvent être servies et employer la workforce disponible.**

Ce n'est pas un audit général du housing.

---

# 1. RECONSTRUIRE LE PHÉNOMÈNE

Reproduire les controlled pairs de 10AX.

Construire au minimum :

### Layout A — distributed housing

Deux Residences réparties de manière à être connectées aux réseaux permettant :

* Water coverage ;
* workforce mobility ;
* Farm access.

### Layout B — concentrated housing

Deux Residences placées de manière à ce que leur réseau ne donne pas accès aux mêmes workplaces.

Conserver strictement :

* même population ;
* mêmes bâtiments ;
* même Material ;
* même Food ;
* même Water ;
* même terrain ;
* même nombre de roads ;
* même nombre de networks lorsque possible.

La seule différence doit être la **composition spatiale des Residences**.

---

# 2. SIGNATURES À MESURER

Pour chaque layout :

* population ;
* served Residences ;
* Water capacity ;
* Water balance ;
* Food production ;
* Food balance ;
* employed colonists ;
* vacant workplaces ;
* workforce eligibility ;
* network count ;
* stage ;
* objective status ;
* Material reserve.

Simuler :

```text
20 ticks
60 ticks
600 ticks
```

Vérifier que la différence est stable.

---

# 3. PLAYER DECISION

Identifier exactement la décision :

```text
Decision:
Where should the second Residence be placed?
```

Comparer au minimum :

```text
Option A — Residence connected to productive network
Option B — Residence isolated / attached to a different network
```

Décrire :

* coût immédiat ;
* conséquence immédiate ;
* conséquence différée ;
* conséquence sur population ;
* conséquence sur workforce ;
* possibilité de récupération ;
* coût de récupération.

Ne pas ajouter de coût spécifique au scénario.

---

# 4. DISTINGUER LE SCÉNARIO D'UN SIMPLE TUTORIEL

Le scénario n'est valable que si le joueur doit réellement choisir.

Tester plusieurs ouvertures :

### Opening A

Le joueur peut naturellement construire les deux Residences de manière productive.

### Opening B

Le second emplacement paraît attractif mais crée une séparation.

### Opening C

La mauvaise décision peut être récupérée avec les outils existants :

* road ;
* Well ;
* workforce reassignment ;
* construction.

Mesurer les conséquences.

Le scénario ne doit pas dépendre d'un piège arbitraire où une seule case est correcte.

---

# 5. NOUVELLE SCENARIO DEFINITION

Si le phénomène est suffisamment distinct, proposer un scénario data-only.

Ne pas l'implémenter avant d'avoir démontré qu'il apporte une vraie décision.

Format conceptuel :

```text
Housing Composition
```

avec :

```text
Initial state
Existing buildings
Existing roads
Existing terrain
Initial resources
Objective
```

Aucune nouvelle propriété de simulation.

---

# 6. OBJECTIVE

Tester les objectifs existants.

Priorité aux objectifs déjà supportés :

* Settlement ;
* Village ;
* population ;
* Water capacity ;
* Food balance ;
* building requirement.

Ne pas créer un nouveau type d'objectif.

Chercher un objectif du genre :

```text
Reach Village with both Residences contributing to a connected settlement.
```

Mais **ne pas utiliser cette formulation si "connected settlement" n'est pas une primitive objective existante**.

Si aucun objectif existant ne permet de représenter proprement le phénomène :

```text
Objective capability insufficient
```

et ne pas inventer de nouveau type.

---

# 7. FAILURE / RECOVERY

Le scénario doit exploiter les mécaniques réelles.

Tester :

```text
good placement
→ Village
```

et :

```text
bad placement
→ Settlement / blocked growth
→ recovery
→ Village
```

Mesurer :

* ticks jusqu'à recovery ;
* Material dépensé ;
* population perdue ou conservée ;
* workforce récupérée ;
* Water status ;
* Food status.

Important :

> Une mauvaise décision qui peut être récupérée est acceptable.

Elle ne doit pas être rendue artificiellement terminale.

---

# 8. TERRAIN

Le terrain est autorisé uniquement comme **contrainte de fixture**.

Ne pas lui ajouter de mécanique.

Comparer :

```text
scenario open map
```

si nécessaire avec :

```text
scenario terrain constrained
```

Le but est de vérifier si le phénomène housing existe sans terrain.

Si oui, le scénario ne doit pas dépendre du terrain.

Si le terrain est indispensable uniquement pour empêcher une récupération triviale, le documenter comme contenu, pas comme mécanique.

---

# 9. READABILITY

Tester le scénario dans le browser réel.

Desktop :

```text
1280x800
```

Mobile :

```text
420x740
360x640
```

Vérifier que le joueur peut répondre à :

1. Combien de Residences sont servies ?
2. Pourquoi une Residence n'est-elle pas servie ?
3. Quels workplaces sont accessibles à chaque colonist ?
4. Pourquoi un colonist est-il unemployed ?
5. Pourquoi la progression reste-t-elle Settlement ?
6. Quelle action peut corriger la situation ?

Ne pas ajouter une UI dédiée si les inspections actuelles suffisent.

---

# 10. SCENARIO DISTINCTIVENESS TEST

Comparer ce scénario avec les scénarios existants :

* First Settlement ;
* Water Constraint ;
* Spatial Efficiency ;
* Population Expansion ;
* Industrial Expansion ;
* Recovery ;
* Water Reserve Industry.

Pour chacun :

```text
Same decision?
Same consequence?
Same recovery?
Same objective?
Same spatial pattern?
```

Classer :

```text
A — genuinely distinct
B — useful but overlapping
C — redundant
```

Le scénario ne doit pas être ajouté uniquement parce qu'il utilise un autre layout.

---

# 11. CONTENT QUALITY TEST

Le scénario doit avoir :

### Une décision

Le joueur choisit réellement entre deux placements.

### Une conséquence

Le choix modifie un état causal.

### Une lecture

Le joueur peut comprendre le résultat.

### Une récupération

Une mauvaise décision n'est pas arbitrairement terminale.

### Une raison de rejouer

Un autre placement produit réellement une autre trajectoire.

Si l'un de ces éléments manque :

```text
NOT READY
```

---

# 12. IMPLEMENTATION GATE

Cette étape comporte deux phases.

## Phase A — audit / fixture

D'abord :

* controlled fixture ;
* measurements ;
* browser validation ;
* scenario distinctiveness.

Aucune modification du moteur.

## Phase B — implementation

Uniquement si le scénario passe le gate :

* ajouter la définition data-only ;
* ajouter l'objectif existant approprié ;
* ajouter les tests ;
* ajouter le deep link ;
* ajouter le test browser.

Ne toucher à aucun système de simulation.

---

# 13. ARCHITECTURE

Si implémenté :

* `ScenarioDefinition` reste l'autorité du contenu ;
* aucun nouveau domain rule ;
* aucun nouveau persisted field ;
* aucun nouveau save version ;
* aucun nouveau objective type ;
* aucune nouvelle mécanique de réseau.

SAVE_VERSION doit rester :

```text
7
```

---

# 14. VALIDATION

Obligatoire :

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
* tous les scénarios ;
* browser headless ;
* browser headed ;
* GPU E2E.

Pour le scénario :

* real browser commands ;
* pas de mocks pour la validation gameplay ;
* vérifier les signatures finales.

---

# 15. FINAL REPORT

Retourner exactement :

```text
STEP 10AZ — FINAL REPORT

Starting commit:
Final commit:

PHENOMENON
- Layout A:
- Layout B:
- Same inputs:
- Different outcome:
- Difference at 20 ticks:
- Difference at 60 ticks:
- Difference at 600 ticks:

PLAYER DECISION
- Decision:
- Option A:
- Option B:
- Immediate consequence:
- Delayed consequence:
- Recovery:
- Recovery cost:

CAUSALITY
- Water:
- Workforce:
- Network:
- Housing:
- Progression:

SCENARIO DISTINCTIVENESS
| Existing scenario | Same decision? | Same consequence? | Same recovery? | Verdict |
|---|---:|---:|---:|---|

READABILITY
| Question | Answerable? | Existing UI sufficient? |
|---|---:|---:|
| Served Residences | | |
| Residence cause | | |
| Workplace eligibility | | |
| Unemployment cause | | |
| Progression blocker | | |
| Recovery action | | |

SCENARIO DESIGN
- Name:
- Initial state:
- Objective:
- Success:
- Failure:
- Recovery:
- Terrain dependency:

IMPLEMENTATION
- Scenario added:
- Domain changes:
- Application changes:
- Persistence changes:
- SAVE_VERSION:
- New objective types:
- New mechanics:

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

A — genuinely distinct
B — useful but overlapping
C — redundant

DECISION

[One factual paragraph.]

NEXT DEPENDENCY:
```

# HARD BOUNDARIES

Ne pas :

* créer de nouveau système de housing ;
* créer de nouveaux types de colonists ;
* créer de nouveaux jobs ;
* créer de nouvelles ressources ;
* modifier Water ;
* modifier Food ;
* modifier Material ;
* modifier production rates ;
* modifier le 2/2 baseline ;
* créer Town ;
* modifier la progression ;
* créer un nouvel objectif ;
* ajouter une mécanique d'adjacency ;
* ajouter de la densité ;
* ajouter de la pollution ;
* ajouter du trafic ;
* transformer le terrain en système économique.

Le phénomène doit être produit **uniquement par les mécaniques existantes**.

Si le scénario n'est pas suffisamment distinct :

> **ne pas l'ajouter.**

La bonne conclusion de 10AZ peut donc être :

```text
NO SCENARIO ADDED
```

Si le phénomène est réellement distinct et lisible, alors seulement l'ajouter comme contenu data-only.


# Documentation (as-built) — Step 10AZ

Starting commit: `1161c35` (Step 10AY).
Final commit: this commit.

**PHASE A ONLY — audit + fixtures + browser readability. NO SCENARIO ADDED.**
`src/` is untouched: the step adds one audit file
(`tests/housingCompositionScenarioAudit.test.ts`, 16 tests), one browser audit
(`e2e/housingCompositionReadabilityAudit.mjs`) and this document. The curated
catalogue stays at 7, `SCENARIO_FIXTURES` still holds exactly the 10AV terrain
fixture, SAVE_VERSION stays 7 and no objective type was invented.

## 1. The phenomenon, reproduced as a controlled pair

Identical in both layouts: the same two road cells `(1,1)` and `(3,1)`, the same
four buildings (2 Residences, 1 Farm `(1,2)`, 1 Well `(3,2)`), the same types,
2 networks, 2 colonists, Material 100, Food 100, Water 0, no terrain.
**Only the second Residence's cell changes.**

| measurement | Layout A — distributed `(1,0)+(3,0)` | Layout B — concentrated `(1,0)+(0,1)` |
| --- | ---: | ---: |
| served Residences | **1** | **0** |
| Water capacity | **2** | **0** |
| Water supply | `noReserve`/`supplied` | `noService` |
| Food production | 2 / tick | 2 / tick |
| employed / capacity | **2 / 2** | **1 / 2** |
| unemployed | 0 | 1 |
| vacant workplaces | none | `well@3,2` |
| networks | 2 | 2 |
| stage | **village** | **settlement** |

Stable and identical at **20, 60 and 600 ticks**. Workforce eligibility measured:
in Layout A the Well option is reachable (`reason: null`, distance 0 for the east
colonist); in Layout B every Reconstruction option is `notConnected` for both
colonists, and the stranded colonist's `workplaceId` is null.

## 2. The playable opening and the real decision

The controlled pair uses authored colonists; the *playable* shape starts with one
colonist on the Well's network, the Farm alone on the other network, and 25
Material for exactly one Residence:

```text
roads (1,1) west, (3,1) east          two networks
Residence (3,0) + Well (3,2)          east: served, Well staffed, capacity 2
Farm (1,2)                            west: vacant AND unreachable from (3,0)
opening: population 1, capacity 2, Food production 0, stage wilderness
```

| option (both legal, both 25 Material) | outcome after 20 ticks |
| --- | --- |
| A — Residence on the bridge cell `(2,1)` (touches **both** roads) | population **2**, served **2**, employed **2**, Food **2/tick**, **Village** |
| B — Residence on the Farm network `(0,1)` | population **1**, served 1, employed 1, Food **0/tick**, stage **wilderness** |

Option B's delayed consequence is fatal, not merely slow: with Food production 0
the reserve of 100 is consumed by the single colonist and **population reaches 0
by tick 200** (measured at 20 / 60 / 110 / 200 ticks). Option A is stable at 600
ticks with both workplaces staffed.

**Openings measured** (§4 of the step prompt):

* **Opening A (single network):** both candidate cells produce an *identical*
  state — on one network the placement is network-blind, so the phenomenon does
  not exist without a second network.
* **Opening B (the tempting plot):** `(2,1)` is the bridge (adjacent to both
  roads), `(0,1)` is on the Farm network, `(4,1)` is on the Well network but
  cannot reach the Farm — the readable asymmetry the decision rests on.
* **Opening C (recovery), real commands:**

| recovery | cost | result |
| --- | ---: | --- |
| join the two networks with one road at `(2,1)` | **5 Material** | networks 1, served 2, population 2, Food 2/tick, **Village** |
| build the bridge Residence instead | 25 Material | population 2, Food 2/tick, **Village** |
| do nothing | 0 | population **0** — the unreachable Farm means no Food at all |

## 3. Objective capability

| existing primitive | verdict |
| --- | --- |
| `stage: village` | **separates A from B** (village vs settlement) — the closest expressible objective |
| `population`, `waterCapacity`, `foodBalance`, `building` | usable, but they describe the *symptoms* (growth blocked, capacity 0) |
| the exact claim ("both Residences contribute to a connected, staffed settlement") | **NOT expressible**: the 10AV fixture is `village` while one Residence is unserved and one workplace is vacant (measured), so the stage accepts a structurally defective settlement |

Conclusion: **objective capability insufficient** for the precise claim, and
inventing a new objective type is explicitly forbidden. The closest objective
(`stage: village`) is already owned by `water-constraint`.

## 4. Distinctiveness against the curated catalogue

| Existing scenario | Same decision? | Same consequence? | Same recovery? | Verdict |
| --- | ---: | ---: | ---: | --- |
| First Settlement | no | no | no | C |
| Water Constraint | no | **yes** (blocked growth, Village unreachable, capacity 0) | **yes** (build the missing link) | B |
| Spatial Efficiency | **yes** (a placement with an exact Material budget) | no | no | B |
| Population Expansion | no | **yes** (housing vs Water capacity) | no | B |
| Industrial Expansion | no | no | no | C |
| Recovery | **yes** (repair the missing link or duplicate it) | **yes** (a stranded building, an unemployed colonist, 5 vs 25 Material) | **yes** | B |
| Water Reserve Industry | no | no | no | C |

Measured anchors: no existing scenario starts with two networks (the only new
starting shape here); `recovery` starts with exactly one road and one stranded
workplace and its repair is the same 5-Material link; `spatial-efficiency` starts
with the placement budget 55; `water-constraint` already owns `stage: village`
with blocked growth. This is the same relationship 10AR measured for Partitioned
Valley, which was classified **B — useful but overlapping** and deferred with the
catalogue unchanged: consistency requires the same treatment.

The §11 content-quality test nevertheless **passes** on all five points (a real
decision, a causal consequence, a readable result, a cheap recovery, a replay
reason) — the scenario fails the *distinctness* bar, not the quality bar.

## 5. Terrain independence

Both layouts are built on a completely open map (measured: no `blockedCells`
anywhere) and the phenomenon is full strength there — so a scenario built on it
must not depend on terrain, and no terrain rule may be added to make the wrong
placement unrecoverable. Terrain remains a fixture option only.

## 6. Readability (real browser, `e2e/housingCompositionReadabilityAudit.mjs`)

Driven through the existing content (the terrain-chokepoint fixture, which has
exactly the housing causal shape, plus `recovery` and `water-constraint` through
the real scenario select). Six answers, at 1280×800 / 420×740 / 360×640, no
horizontal overflow anywhere:

| Question | Answerable? | Existing UI sufficient? |
| --- | --- | --- |
| Served Residences | partially | **no** — per-Residence only; the colony-wide count is not in the HUD (measured: Water row `20` + supply suffix `· served`) |
| Residence cause | **yes** | yes — `Water not served (no covered Well on this network)` |
| Workplace eligibility | **yes** | yes — the reassignment list shows `Farm 2 — no road access` (disabled) |
| Unemployment cause | **no** | no — jobs read `0 / 1` but the reassignment list is **empty** for an unemployed colonist (the control only appears for a building that already employs someone) |
| Progression blocker | **yes** | yes — `✗ Food balance` / `Blocked by — Water capacity 2` |
| Recovery action | **yes** | yes — `road 1 cell — ready · material 5` |

**Findings recorded (not fixed, presentation only):**

1. There is no colony-wide **served-Residence count**; service must be checked
   Residence by Residence.
2. The word **"served"** on the Water row is the *supply state* (`supplied`), so
   the HUD can read `Water 20 · served` while a Residence is **not** served — the
   same word describes two different facts on one screen.
3. The **placement hover carries identical information** for a cell that yields a
   served Residence and one that yields an unserved one (`ready · material 25`):
   which network a new Residence joins is only visible **after** building, in the
   Residence inspector. This is the decisive information of the whole phenomenon.
4. The **unemployment cause is not inspectable** (no reassignment surface for an
   unemployed colonist).
5. At 420×740 the HUD occupies **95 %** and at 360×640 **96 %** of the viewport
   width: the board — and therefore the Residence cells the decision is about —
   sits behind the panel.

## 7. Phase A boundary

Catalogue unchanged (7), fixtures unchanged (only `terrain-chokepoint`),
SAVE_VERSION 7, no new objective type, no new domain rule, no new persisted
field, no new network mechanic. The layouts are deterministic and save/load
stable (measured), and every catalogue scenario still uses its declared key set
only.

---

## 8. FINAL REPORT

```text
STEP 10AZ — FINAL REPORT

Starting commit: 1161c35 (Step 10AY)
Final commit:    this commit

PHENOMENON
- Layout A: Residences (1,0) and (3,0) — one per network — with roads (1,1) and
  (3,1), Farm (1,2), Well (3,2), 2 colonists: capacity 2, served 1, employed 2,
  Food 2/tick, Village
- Layout B: the SAME roads, buildings, resources, population and terrain with the
  second Residence on the Farm network (0,1): capacity 0, served 0, employed 1,
  unemployed 1, Well vacant, Settlement
- Same inputs: 2 road cells (identical), 4 buildings (same types), 2 networks,
  population 2, Material 100, Food 100, Water 0, no terrain
- Different outcome: capacity 2 vs 0, served 1 vs 0, employed 2 vs 1, vacant
  workplace none vs well@3,2, stage village vs settlement, supply noReserve vs
  noService
- Difference at 20 ticks: full and stable
- Difference at 60 ticks: full and stable
- Difference at 600 ticks: full and stable (identical signatures)

PLAYER DECISION
- Decision: where the second Residence goes — which road network it joins
- Option A: the bridge cell (2,1), adjacent to BOTH roads (served AND reaches the
  vacant Farm) -> the second colonist is admitted and staffs the Farm -> Village
- Option B: a Farm-network cell (0,1) (unserved, cannot reach the Well) -> nobody
  is admitted, the Farm stays unreachable, Food production stays 0
- Immediate consequence: whether the new Residence is Water-served, and therefore
  whether it can receive a colonist at all
- Delayed consequence: the colony's whole Food economy and its survival — option B
  drains the 100-Food reserve and reaches population 0 by tick 200
- Recovery: join the two networks with one road cell (2,1), or build the bridge
  Residence instead; both measured with real commands
- Recovery cost: 5 Material (road join, cheapest) / 25 Material (bridge Residence)
  / 0 (do nothing -> colony lost)

CAUSALITY
- Water: coverage is per road network, so an unserved Residence never receives a
  colonist (the 10P gate) and the Well is never staffed
- Workforce: 09K mobility is residence-to-workplace, so the network membership of
  the Residence decides which workplaces a colonist can ever take
- Network: two networks with one road cell each; the bridge cell belongs to both,
  which is the only cell that satisfies both requirements
- Housing: the ONLY variable in the pair — every other input was held identical
- Progression: Village requires capacity >= 2, which requires a staffed Well, which
  requires a colonist whose Residence shares the Well's network

SCENARIO DISTINCTIVENESS
| Existing scenario | Same decision? | Same consequence? | Same recovery? | Verdict |
|---|---:|---:|---:|---|
| First Settlement | no | no | no | C |
| Water Constraint | no | yes | yes | B |
| Spatial Efficiency | yes | no | no | B |
| Population Expansion | no | yes | no | B |
| Industrial Expansion | no | no | no | C |
| Recovery | yes | yes | yes | B |
| Water Reserve Industry | no | no | no | C |

READABILITY
| Question | Answerable? | Existing UI sufficient? |
|---|---:|---:|
| Served Residences | partially | no (per-Residence only; no colony count in the HUD) |
| Residence cause | yes | yes ("Water not served (no covered Well on this network)") |
| Workplace eligibility | yes | yes ("Farm 2 — no road access", disabled) |
| Unemployment cause | no | no (no reassignment surface for an unemployed colonist) |
| Progression blocker | yes | yes ("Blocked by — Water capacity 2") |
| Recovery action | yes | yes ("road 1 cell — ready · material 5") |

SCENARIO DESIGN (documented, NOT added)
- Name: Housing Composition
- Initial state: two networks (roads (1,1) and (3,1)), Residence (3,0), Well (3,2),
  Farm (1,2), 1 colonist, Material 25, Food 100, Water 0
- Objective: `stage: village` (the only existing primitive that separates the two
  layouts)
- Success: the second Residence joins the Well's network (or the networks are
  joined), both workplaces end up staffed, capacity 2, Village
- Failure: the Residence lands unserved on the Farm network -> no admission, no
  Food, starvation by ~tick 100
- Recovery: one road cell at (2,1) for 5 Material, or a bridge Residence for 25
- Terrain dependency: NONE (measured on a fully open map); terrain would only be a
  fixture option

IMPLEMENTATION
- Scenario added: NO (phase A only — the distinctness gate failed)
- Domain changes: none
- Application changes: none
- Persistence changes: none
- SAVE_VERSION: 7
- New objective types: none (and the precise claim has no primitive)
- New mechanics: none

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 81 files / 1536 tests PASS (+1 file / +16 tests; 80/1520 before)
- determinism: PASS     - insertion-order: PASS     - save/load: PASS
- browser: 18 / 18 suites headless ALL PASS (17 existing + the housing
  readability audit; `upkeepRun` needed one re-run for a port start race)
- GPU: ALL PASS (headed)

CLASSIFICATION

B — useful but overlapping

DECISION

The housing-composition phenomenon is real, causal, stable at 600 ticks and fully
reproducible with the existing mechanics — the same buildings, roads, resources,
population and terrain produce Village with both workplaces staffed when the new
Residence joins the Well's network, and a permanent capacity-0 shortage that kills
the colony when it joins the Farm network — and its content-quality test passes on
all five counts (a real decision, a causal consequence, a readable result, a
5-Material recovery, and a replay reason). It is nevertheless NOT added to the
catalogue, because it fails the distinctness gate rather than the quality gate: its
consequence and recovery are the ones the existing catalogue already prices —
Recovery owns the "repair the missing link for 5, or duplicate for 25" decision on
a stranded building with an unemployed colonist, Water Constraint owns the same
blocked-growth Village objective, Spatial Efficiency owns placement under an exact
Material budget, and Population Expansion owns housing-versus-capacity — while the
precise claim the scenario would teach ("both Residences contribute to a connected,
staffed settlement") has no existing objective primitive (the 10AV fixture is
already `village` with an unserved Residence and a vacant workplace, measured), and
inventing one is forbidden. This is the same relationship 10AR measured for
Partitioned Valley, which was classified B and deferred with the catalogue left at
7. Four readability findings are recorded for the future content step, the most
important being that the placement hover gives identical feedback for a cell that
will be served and one that will not — the decisive information of the whole
phenomenon appears only after building.

NEXT DEPENDENCY:
- Content/UX, not mechanics, and no scenario from this audit. The recorded items
  are: (1) surface which network a candidate Residence would join (and/or the
  colony-wide served-Residence count) before building — the decisive information of
  the housing decision; (2) disambiguate the word "served" between the Water supply
  state and Residential coverage; (3) make the unemployment cause inspectable;
  (4) the 420x740 / 360x640 HUD width (95-96 % of the viewport) recorded in 10AW
  as well; and (5) unchanged from 10AX: the deferred 10AP production-rate tuning
  remains the only measured route to a surplus state, i.e. to any real Town stage.
```
