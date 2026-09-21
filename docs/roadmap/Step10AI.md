Tu travailles sur NOVA.

## Step 10AI — System Sufficiency & Phase Boundary Audit

### Starting point

Starting commit:

`1b61e11`

Step 10AH vient de conclure :

* aucune mécanique d'adjacence/densité/neighbour n'est actuellement justifiée ;
* la spatialité possède déjà quatre conséquences économiques mesurables :

  1. road access,
  2. network membership,
  3. road-distance workplace preference,
  4. road Material cost ;
* les systèmes Food, Water, Workforce, Construction Crew, Material et Workshop ont déjà été audités ;
* aucun nouveau système spatial n'est justifié ;
* `src/` doit rester inchangé pendant cet audit.

### Important

**Step 10AI est un audit de frontière de phase, pas une invitation à inventer une mécanique.**

Ne rien implémenter dans `src/`.

Ne pas ajouter :

* pollution ;
* satisfaction ;
* bonheur ;
* services ;
* zonage ;
* commerce ;
* transport avancé ;
* agriculture locale ;
* chaîne de production ;
* densité ;
* adjacency bonuses ;
* settlement stages mécaniques ;
* nouvelles ressources ;
* nouveaux bâtiments.

L'objectif est de déterminer objectivement si le modèle actuel possède encore un **manque causal suffisamment important pour justifier un nouveau système**, ou si la prochaine phase doit être consacrée à la consolidation, au contenu et à l'expérience de jeu.

---

# 1. AUDIT — Reconstruct the current causal model

À partir du code réel, reconstruis la boucle complète actuelle.

Documente explicitement :

```text
Residence
  ↓
housing capacity
  ↓
admission
  ↓
colonist
  ↓
workforce
  ↓
Farm / Well / Workshop
  ↓
Food / Water / Material
  ↓
construction
  ↓
new buildings
  ↓
new housing / production
```

Puis ajoute les contraintes spatiales :

```text
building
  ↓
adjacent operational road
  ↓
road network
  ├─ Water coverage
  └─ worker mobility
       ↓
road distance preference
```

Et les coûts :

```text
Residence/Farm/Well = 25 Material
Workshop            = 25 Material + 1 Water
Road                = 5 Material
Workshop             = +2 Material gross / -1 upkeep
Farm                 = +2 Food
Well                 = +2 Water
colonist             = -1 Food / -1 Water
```

Vérifie ces valeurs directement dans le code et les tests. Ne te fie pas uniquement aux anciens rapports.

---

# 2. AUDIT — Identify every actual player lever

Liste uniquement les décisions que le joueur peut réellement prendre aujourd'hui.

Pour chaque décision, indique :

| Decision | Immediate effect | Economic consequence | Spatial consequence | Long-term consequence |
| -------- | ---------------- | -------------------- | ------------------- | --------------------- |

Examine notamment :

* où construire une Residence ;
* où construire une Farm ;
* où construire un Well ;
* où construire un Workshop ;
* où construire une Road ;
* comment connecter ou séparer les réseaux ;
* comment organiser les travailleurs ;
* quand utiliser Construction Crew ;
* quelle workplace choisir manuellement ;
* quand développer plutôt que conserver des ressources ;
* compact layout vs corridor layout ;
* réseau unique vs réseaux séparés.

Ne transforme pas cette section en brainstorming.

---

# 3. AUDIT — Measure actual decision consequence

Pour chaque levier, réalise si possible une paire de simulations contrôlées :

```text
same initial state
same buildings
same population
same resources
same workers
same construction budget
only ONE player decision differs
```

Mesure :

* population ;
* Food ;
* Water ;
* Material ;
* active workers ;
* unemployed workers ;
* construction completion;
* Workshop count;
* Farm count;
* Well count;
* Residence count;
* road cells;
* road cost;
* network count;
* water-served residences;
* accessible workplaces;
* workplace assignments.

L'objectif est de savoir si les décisions actuelles produisent réellement des trajectoires différentes.

---

# 4. AUDIT — Search for dead decisions

Cherche les décisions qui semblent exister dans l'UI/API mais qui n'ont pratiquement aucun effet causal.

Exemples à vérifier :

* construction d'un type de bâtiment dans certaines configurations ;
* ordre de construction ;
* emplacement d'un bâtiment ;
* nombre de Residences ;
* nombre de Workshops ;
* utilisation de Construction Crew ;
* manual workforce assignment ;
* séparation des réseaux ;
* surplus de Food ;
* surplus de Water ;
* accumulation de Material.

Pour chaque mécanisme :

```text
FUNDAMENTAL
USEFUL
WEAK
PREMATURE
REDUNDANT
```

Mais ne produis **aucun classement global** des systèmes. Le but est uniquement de repérer les leviers qui n'ont pas de conséquence.

---

# 5. AUDIT — Find the current economic bottleneck

Mesure séparément les trois ressources :

## Food

Cherche :

* quand Food devient limitante ;
* quand elle est excédentaire ;
* si le joueur peut volontairement arbitrer croissance vs réserve ;
* si Food possède plusieurs usages concurrents.

## Water

Cherche :

* quand Water devient limitante ;
* effet de la couverture réseau ;
* effet de l'augmentation de population ;
* effet de la construction d'un Well ;
* si Water possède plusieurs usages concurrents.

## Material

Cherche :

* quand Material devient limitant ;
* combien de temps il faut pour financer :

  * Residence,
  * Farm,
  * Well,
  * Workshop,
  * Road ;
* si Workshop upkeep + production crée réellement une décision économique ;
* si le stockage de 25 crée une contrainte réelle ;
* si Material devient simplement une monnaie de construction.

Ne propose aucune nouvelle ressource.

---

# 6. AUDIT — Marginal value of every building

Pour chaque bâtiment, mesure son effet marginal :

```text
+1 Residence
+1 Farm
+1 Well
+1 Workshop
+1 Road
```

Dans plusieurs états :

1. population faible ;
2. population au plafond actuel ;
3. Food abondante ;
4. Water abondante ;
5. Material abondant ;
6. manque de travailleurs ;
7. réseau fragmenté ;
8. réseau compact ;
9. réseau corridor.

Réponds :

> Est-ce que construire ce bâtiment produit une nouvelle capacité utile, ou simplement une capacité dormante ?

Cette distinction est essentielle.

---

# 7. AUDIT — Bootstrap and self-sustaining loop

Vérifie si le système actuel possède :

### A. Bootstrap

Peut-on passer de :

```text
initial resources
→ first useful production
→ first population
→ first construction
→ sustainable settlement
```

sans exemption artificielle ?

### B. Sustainability

Existe-t-il un état stable où :

* population survit ;
* Food est soutenable ;
* Water est soutenable ;
* Material est soutenable ;
* bâtiments restent opérationnels ;
* aucune mécanique n'est artificiellement alimentée ?

### C. Expansion

Existe-t-il une différence réelle entre :

```text
survive
```

et

```text
expand
```

?

Mesure notamment si l'expansion crée réellement une nouvelle pression ou si elle finit simplement par atteindre un état dormant.

---

# 8. AUDIT — Growth ceiling

Cherche le plafond organique actuel.

Teste plusieurs configurations afin de déterminer si le plafond vient de :

* Food ;
* Water ;
* Workforce ;
* Material ;
* Housing ;
* Construction throughput ;
* Road cost ;
* Workshop economy ;
* ou d'une combinaison.

Ne modifie aucune règle pour créer artificiellement un plafond.

Le résultat doit répondre à :

> Qu'est-ce qui empêche actuellement la colonie de continuer à croître indéfiniment ?

Et, séparément :

> Qu'est-ce qui empêche actuellement la colonie de devenir économiquement plus productive après avoir atteint son équilibre ?

---

# 9. AUDIT — Does the player actually build a city?

C'est un audit particulièrement important.

À partir du système actuel, demande :

### Test A — Spatial identity

Deux colonies économiquement équivalentes peuvent-elles avoir des layouts réellement différents ?

### Test B — Optimization

Le joueur peut-il faire mieux en réfléchissant au placement ?

### Test C — Trade-off

Une amélioration dans une dimension crée-t-elle un coût dans une autre ?

### Test D — Expansion

L'ajout de bâtiments crée-t-il de nouvelles contraintes ?

### Test E — Recovery

Une mauvaise décision est-elle récupérable sans reset ?

### Test F — Long-term planning

Une décision prise aujourd'hui modifie-t-elle significativement la trajectoire future ?

Pour chaque test :

```text
PASS
PARTIAL
FAIL
```

Avec expérience reproductible à l'appui.

---

# 10. Audit — Existing systems vs missing system

Ne cherche pas "quelle feature serait cool".

Cherche uniquement :

> Quel phénomène important de la simulation n'est actuellement représenté par aucun système ?

Construis une table :

| Phenomenon                | Already represented by   | Missing? | Evidence |
| ------------------------- | ------------------------ | -------- | -------- |
| Housing                   | Residence capacity       |          |          |
| Food production           | Farm                     |          |          |
| Food consumption          | Colonists                |          |          |
| Water production          | Well                     |          |          |
| Water distribution        | Road network             |          |          |
| Workforce                 | Workforce system         |          |          |
| Mobility                  | Road network             |          |          |
| Construction              | Construction system      |          |          |
| Industrial production     | Workshop                 |          |          |
| Construction acceleration | Construction Crew        |          |          |
| Spatial cost              | Roads                    |          |          |
| Spatial efficiency        | Roads/access             |          |          |
| Population growth         | Admission                |          |          |
| Economic expansion        | Construction + resources |          |          |

Un phénomène déjà correctement représenté ne doit pas recevoir un deuxième système uniquement parce qu'une autre abstraction serait possible.

---

# 11. Candidate discovery

Seulement si l'audit révèle réellement un manque, examine les candidats.

Pour chaque candidat potentiel, exige :

1. phénomène actuellement non représenté ;
2. conséquence mesurable ;
3. décision joueur identifiable ;
4. au moins deux systèmes affectés ;
5. distinction claire avec les réseaux existants ;
6. distinction claire avec Food/Water/Workforce ;
7. pas de simple bonus numérique ;
8. pas de système purement cosmétique ;
9. pas de bootstrap impossible ;
10. implémentation locale compatible avec l'architecture actuelle.

Classe chaque candidat individuellement :

```text
A — Fundamental
B — Useful but incomplete
C — Weak
D — Premature
E — Rejected
```

Ne choisis pas automatiquement un candidat.

---

# 12. Architecture boundary audit

Vérifie que les conclusions restent compatibles avec :

* pure domain/application/rendering separation ;
* deterministic simulation ;
* insertion-order invariance ;
* derived state non persisté ;
* SAVE_VERSION = 7 ;
* 7 persisted top-level save keys ;
* FNV-1a hash ;
* save/load determinism ;
* no UI-derived simulation;
* no rendering-derived simulation.

Vérifie aussi qu'aucun besoin artificiel de framework n'est apparu.

---

# 13. Phase boundary decision

À la fin, prends UNE des deux décisions suivantes.

## Option A — MODEL SUFFICIENT FOR NEXT PHASE

Si les systèmes actuels couvrent déjà les phénomènes fondamentaux et que les leviers joueur produisent suffisamment de conséquences :

```text
NO NEW CORE SYSTEM JUSTIFIED
```

Dans ce cas, recommande de passer à une phase de :

* gameplay loop validation ;
* scenario/progression validation ;
* UX/gameplay readability ;
* contenu ;
* balancing expérimental ;
* éventuellement stages de colonie si leur rôle peut maintenant être défini à partir des systèmes existants.

Mais **ne les implémente pas dans 10AI**.

## Option B — SPECIFIC MISSING SYSTEM

Si un véritable manque causal est démontré :

```text
NEW SYSTEM JUSTIFIED: <name>
```

Mais :

* ne l'implémente pas ;
* explique précisément pourquoi les systèmes existants ne couvrent pas le phénomène ;
* donne son plus petit contrat possible ;
* donne ses dépendances ;
* donne les risques de bootstrap ;
* propose le prochain step comme **un audit/design contract séparé**, pas comme une implémentation immédiate.

---

# 14. Required verification

Avant le rapport final :

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Puis exécute les tests de déterminisme pertinents :

* same-run determinism ;
* insertion-order invariance ;
* save/load round-trip.

Si l'UI ou les E2E sont impactés indirectement, exécute également les vérifications navigateur existantes.

Aucune modification de `src/`.

Les seuls changements autorisés :

```text
tests/*Audit.test.ts
docs/roadmap/Step10AI.md
```

---

# 15. Final report

Créer :

`docs/roadmap/Step10AI.md`

Le rapport doit contenir :

```text
STEP 10AI — SYSTEM SUFFICIENCY & PHASE BOUNDARY AUDIT

Starting commit:
Final commit:

1. Current causal model
2. Player decision inventory
3. Decision consequence experiments
4. Dead-decision findings
5. Food bottleneck
6. Water bottleneck
7. Material bottleneck
8. Marginal building value
9. Bootstrap
10. Sustainability
11. Growth ceiling
12. "Does the player actually build a city?" results
13. Missing-phenomenon matrix
14. Candidate systems
15. Architecture audit
16. Final phase-boundary decision
17. Verification
18. Exact next dependency
```

Include exact measured values and experiment configurations wherever possible.

Do not write vague conclusions such as:

> "The system seems balanced."

Instead write:

> "In configuration X, adding Y changes Z from A to B while all other variables remain constant."

---

# Hard constraints

* Do NOT modify `src/`.
* Do NOT change SAVE_VERSION.
* Do NOT add migrations.
* Do NOT add a new gameplay mechanic.
* Do NOT add a new resource.
* Do NOT add adjacency.
* Do NOT add pollution.
* Do NOT add services.
* Do NOT add satisfaction/happiness.
* Do NOT add logistics.
* Do NOT add transport.
* Do NOT add settlement-stage effects.
* Do NOT rebalance existing values.
* Do NOT introduce abstractions without evidence.
* Do NOT repeat 10AH's adjacency audit.
* Do NOT turn this into an implementation step.

The purpose of 10AI is to answer one architectural/game-design question:

> **Is NOVA still missing a fundamental causal system, or has the current simulation reached the point where the next meaningful work should move from system discovery toward actual gameplay/progression validation?**

If the evidence supports sufficiency, the preferred conclusion is:

```text
NO NEW CORE SYSTEM JUSTIFIED
```

Do not invent a missing system merely to keep adding mechanics.

---
# STEP 10AI — SYSTEM SUFFICIENCY & PHASE BOUNDARY AUDIT (report)

Audit-only. `src/` was NOT modified. Every value below is measured from the real
runtime (real placement commands + the derived queries) or read from the real
catalog, by `tests/systemSufficiencyPhaseBoundaryAudit.test.ts` (13 tests,
deterministic; `--reporter=verbose` prints the `AUDIT …` rows quoted here).

```text
STEP 10AI — SYSTEM SUFFICIENCY & PHASE BOUNDARY AUDIT

Starting commit: 1b61e11 ("Step 10AH: spatial externalities & adjacency pressure audit")
Final commit:    this commit

1  Current causal model: reconstructed and verified from the catalog + runtime (costs 25/25/25/2
   5+1 Water, road 5, outputs +2 Food / +2 Water / +2 Material -1 upkeep, housing 1, storage 25).
2  Player decision inventory: 10 real decisions (placement × 4 types, roads, connect/separate,
   manual assignment, crew, spend/bank, compact vs corridor).
3  Decision consequences: 6 controlled pairs, all with measurable trajectory differences.
4  Dead decisions: 4 mechanisms with 0 measured delta (dormant capacity) + 7 classified.
5  Food bottleneck: balanced Food is stable at 0 stock and admits nobody; a deficit wipes in 1 tick.
6  Water bottleneck: capacity 2 per staffed Well gates growth; the stock only buffers.
7  Material bottleneck: +1 net/tick at equilibrium; 5 ticks per road, 25 per building; capped at 25/Workshop.
8  Marginal building value: 36 measured cells, 28 dormant (the building adds capacity, not consequences).
9  Bootstrap: 0 exemptions; Residence -> Road -> Well -> Water -> Workshop -> labour -> next building
   (measured timeline, with the last Farm remaining vacant for lack of a worker).
10 Sustainability: 2 colonists / 1 Farm / 1 Well is stable for 600 ticks (Food net 0, Water 2 vs 2).
11 Growth ceiling: population = 2 x staffed Wells (measured 2 / 4 / 6 with 1 / 2 / 3 Wells), with
   2 Residences of dormant housing left over at every ceiling.
12 "Does the player build a city?": A PASS, B PASS, C PASS, D PARTIAL, E PASS, F PASS.
13 Missing phenomena: 0 of 14 phenomena unrepresented.
14 Candidate systems: none — criterion 1 (unrepresented phenomenon) fails for every candidate.
15 Architecture audit: SAVE_VERSION 7, 7 persisted keys, deterministic + insertion-order invariant.
16 Phase-boundary decision: NO NEW CORE SYSTEM JUSTIFIED.
17 Verification: 62 files / 1225 tests, typecheck, lint, build, determinism files.
18 Next dependency: gameplay/progression validation, readability, content, experimental balance.
```

## 1. Current causal model (verified)

```text
Residence -> housing capacity (1)
  -> admission (Food > 0 after consumption, water-served Residence, Water capacity headroom)
  -> colonist -> workforce (1 job per colonist)
  -> Farm (+2 Food) / Well (+2 Water) / Workshop (+2 Material, -1 upkeep)
  -> Food / Water / Material -> construction -> new buildings -> new housing/production

building -> adjacent operational road -> road network
  -> Water coverage (per network) + worker mobility (per network)
  -> road distance -> 09M workplace preference

costs: Residence/Farm/Well 25 Material; Workshop 25 Material + 1 Water; Road 5 Material/cell
outputs: 2 Food / 2 Water / 2 Material per staffed building; 1 Food and 1 Water per colonist
storage: 25 Material per operational Workshop (staffing-independent)
```

Measured on a 3-colonist reference colony (1 Farm + 1 Well + 1 Workshop): Food 2/2,
Water 2/2, Material gross 0 because the Workshop never wins a worker against the Farm and the
Well — the first measurement of the step and the pattern the whole audit confirms.

## 2. Player decision inventory

| decision | immediate effect | economic consequence | spatial consequence | long-term consequence |
| --- | --- | --- | --- | --- |
| place a Residence | housing +1 | unlocks admission | needs an adjacent road | population ceiling step |
| place a Farm | +2 Food when staffed | food survivability | worker must share the network | starvation risk removal |
| place a Well | +2 Water when staffed | growth headroom + Workshop unlock | coverage is per network | growth ceiling |
| place a Workshop | +2 Material, -1 upkeep, 1 Water one-off | construction income | worker must share the network | expansion speed |
| place a Road | -5 Material | road budget | access + network + distance | layout efficiency |
| connect vs separate networks | 5 Material per connector | how many Wells are needed | coverage/mobility scope | network count |
| assign workers manually | switches the output | Water vs Material vs Food mix | only inside the connected set | colony role |
| use a Construction Crew | 1 tick saved, worker idles | timing vs lost output | none | next building 1 tick earlier |
| spend vs bank Material | -25 now vs +1/tick later | expansion speed | needs a free network cell | trajectory |
| compact vs corridor | same access, different cost | 5 vs 15 Material for 4 buildings | road cells | Material for the next building |

## 3. Decision consequence experiments (one decision differs)

| pair | measured difference |
| --- | --- |
| Farm inside vs outside the worker network | Food **2/tick vs 0/tick**; the outside colony survives on its stock only |
| connect the two networks vs leave them separate | water-served Residences **1 vs 2**; cost 2 vs 9 road cells (10 vs 45 Material) |
| manually assign the only worker to Well vs Workshop | **+2 Water / 0 Material** vs **0 Water / +2 Material (−1 upkeep ⇒ +1 net)** |
| crew the Workshop site vs not | completion in **2 vs 1 ticks** |
| compact vs corridor (same 4 buildings, 2 colonists) | identical flows (Food 2/2, Water 2/2, 2 served) with **1 vs 3 road cells** (5 vs 15 Material) |
| spend 25 Material on a Workshop vs bank it | after 60 ticks: Material **24 with net 0** vs **24 with net +1/tick** |

All six decisions produce a measurable difference in at least one tracked metric
(population, Food/Water/Material stock and net, employed/unemployed, staffed buildings, road cells
and road cost, networks, water-served Residences).

## 4. Dead-decision findings

Baseline: 2 colonists, 1 Farm, 1 Well, everything staffed and balanced. Adding one building with
no free worker, then running 120 ticks:

| mechanism | measured delta |
| --- | --- |
| +1 Farm | population 0, Food net 0, Water net 0, Material net 0, employed 0 |
| +1 Well | identical (all 0) |
| +1 Workshop | identical (all 0) |
| +1 Residence above the Water capacity | identical (all 0): population unchanged |

The only delta is the road cell added by the fixture. Surplus Food accumulates without bound
(measured `+1 Food/tick` for 300 ticks ⇒ Food 300 with one colonist on two Farms), and
Material above the storage cap is discarded (measured `storedProduction 0` at the cap of 25).

Per-mechanism classification (no global ranking):

| mechanism | class | evidence |
| --- | --- | --- |
| build a Farm/Well/Workshop with no worker | **PREMATURE** | measured delta 0 in every flow |
| build a Residence above the Water cap | **PREMATURE** | population unchanged: dormant capacity |
| Food surplus | **USEFUL** | absorbs an outage: 100 Food = 51 ticks of a 2/tick deficit |
| Water surplus | **USEFUL** | admission headroom + the one-off Workshop cost |
| Material above the storage cap | **WEAK** | overflow discarded, `storedProduction 0` |
| Construction Crew | **FUNDAMENTAL** | 2 → 1 construction tick, measured |
| manual workplace assignment | **USEFUL** | switches the colony between Water and Material |
| separating networks | **USEFUL** | forces one Well per network |
| construction order | **FUNDAMENTAL** | a Workshop cannot be placed before a Well produced Water |

## 5. Food bottleneck

* **limiting**: a deficit is terminal (3 colonists against 1 Farm with Food 0 → population **0**).
* **balanced**: production 2 against consumption 2 with Food 0 is stable but `food > 0` never holds,
  so **nobody is admitted** (population stays 2 for 120 ticks).
* **surplus**: unbounded (measured +1/tick; 300 Food after 300 ticks) — no cap, no spoilage.
* **competing uses**: exactly **one** (colonist consumption). The only player arbitration is
  indirect (build more Farms vs build housing).

## 6. Water bottleneck

* **limiting**: admission requires `productionCapacity >= servedNeed + 1`; with 1 Well the colony
  stops at 2 colonists (measured 2 with 4 Residences) while the stock stays irrelevant.
* **capacity effect**: 1 Well → 2 colonists; 2 Wells → 4 (measured, 240 ticks: population 4).
* **population effect**: net Water = 2 × staffed Wells − served colonists (measured 0 at the cap).
* **Well effect**: each staffed Well adds exactly 2 capacity and costs one worker.
* **competing uses**: **two** — colonist consumption and the one-off Workshop construction cost
  (measured: 25 Water available → Workshop placed and −1 Water charged).
* A full colony sits permanently in `waterShortage` (production == need ⇒ stock 0 every tick);
  shortage is the steady state, not a failure.

## 7. Material bottleneck

* **income at equilibrium**: one staffed Workshop = +2 gross, −1 upkeep = **+1 net/tick**;
  storage cap 25 per operational Workshop; above the cap the output is discarded.
* **time to finance** (from 0 Material at +1/tick): Road **5 ticks**, Residence / Farm / Well /
  Workshop **25 ticks each**.
* **upkeep decision**: real but narrow — the upkeep is 1 against a 2 gross, so a staffed Workshop is
  always net positive; the decision is *which* workforce slot gets the Workshop, not whether to run it.
* **storage constraint**: real (25 = exactly one building), and it is what makes the 08G same-tick
  crest the practical construction gate.
* **currency verdict**: Material is consumed only by construction and by Workshop upkeep, i.e. it is
  a construction currency with a small recurring cost — measured, it never becomes a second economy.

## 8. Marginal building value (36 measured cells)

Nine base states (S1 low population … S9 corridor network) × four buildings, 60 ticks each:

```text
dormant (delta 0 in every flow): 28 of 36 cells
only delta present: +1 road cell from the fixture
```

A building adds **capacity**, not consequences. It becomes economically live only when an unmet
need or a free worker exists: +1 Farm is live with a free worker, dead without one; +1 Well is live
while the population is below its capacity, dead at the cap; +1 Residence is live below the Water
cap, dormant above it; +1 Workshop is live only with a free worker (and 1 Water for the placement).

## 9. Bootstrap (0 exemptions)

Real commands from `createInitialState`:

| step | tick | Material | Water | population | employed | staffed Workshops |
| --- | --- | --- | --- | --- | --- | --- |
| Residence + 3 road cells placed | 4 | 60 | 0 | 1 | 0 | 0 |
| Well operational | 8 | 35 | 1 | 1 | 1 | 0 |
| Workshop operational (25 + 1 Water) | 12 | 12 | 2 | 1 | 1 | **1** |
| Farm placed with labour income | 84 | 24 | 0 | 1 | 1 | 1 |

Initial resources → first production → first population → first construction all work with no
exemption. The last row is the audit's own bottleneck made visible: the Farm is **affordable but
stays vacant** (no free worker), exactly as predicted by the workforce ceiling.

## 10. Sustainability

2 colonists, 1 Farm, 1 Well, 1 network (3 road cells), Food 100, Water 0, Material 0 — after
**600 ticks**: population **2**, Food net **0**, Water production 2 vs need 2 (net 0,
`waterShortage true`), Material net 0, employed 2, unemployed 0, all buildings operational.
The colony is self-sustaining with no artificial input; its water shortage is the growth gate,
not a survival problem.

## 11. Growth ceiling

| configuration | population reached | Water production/need | dormant housing |
| --- | --- | --- | --- |
| 1 Well, 1 Farm, 4 Residences | **2** | 2 / 2 | 2 |
| 2 Wells, 2 Farms, 6 Residences | **4** | 4 / 4 | 2 |
| 3 Wells, 3 Farms, 8 Residences | **6** | 6 / 6 | 2 |

* **What stops indefinite growth**: Water production capacity (2 per staffed Well). Housing is
  never the ceiling (2 dormant Residences remain at every measured ceiling).
* **What stops becoming more productive after equilibrium**: the workforce. A balanced colony
  (2 colonists + Farm + Well + Workshop) leaves the Workshop vacant (Material net **0**); the same
  colony with one extra colonist runs it (Material net **+1**) but runs a permanent Food deficit
  (**-1/tick**). The workers needed to sustain Water and Food are the workers a Workshop needs.

## 12. "Does the player actually build a city?"

| test | result | measured evidence |
| --- | --- | --- |
| **A spatial identity** | **PASS** | two layouts with identical flows (population 2, Food net 0, Water net 0) but 1 vs 3 road cells |
| **B optimization** | **PASS** | the same 4 buildings cost 5 vs 15 Material in roads |
| **C trade-off** | **PASS** | the only worker on a Well gives +2 Water / 0 Material; on a Workshop +2 Material / 0 Water |
| **D expansion** | **PARTIAL** | population 2 → 4 with 9 road cells; the expanded colony is an equilibrium again, not a new constraint |
| **E recovery** | **PASS** | a Farm outside the network produced 0/tick; 8 connector roads (40 Material) restored 2/tick with no demolition or reset |
| **F long-term planning** | **PASS** | a Workshop placed before the Water chain is rejected (Material net 0/tick); Well first then Workshop gives +1/tick |

## 13. Missing-phenomenon matrix

| phenomenon | represented by | missing | evidence |
| --- | --- | --- | --- |
| Housing | Residence capacity | no | 4 Residences, population capped at 2 by Water |
| Food production | Farm | no | 2 Farms → 4 Food/tick |
| Food consumption | Colonists | no | Food below need → wipe in 1 tick |
| Water production | Well | no | 1 Well = capacity for 2 colonists |
| Water distribution | Road network | no | 2 networks → 1 of 2 Residences served |
| Workforce | 1 job per colonist, 09M | no | cross-network assignment rejected |
| Mobility | Road network + 09K | no | unreachable Farm produces 0 |
| Construction | 2 ticks + real Material charge | no | Workshop also charges +1 Water |
| Industrial production | Workshop | no | 1 staffed Workshop = +1 net, storage 25 |
| Construction acceleration | Construction Crew | no | 2 ticks → 1 tick |
| Spatial cost | Roads | no | same 4 buildings: 5 vs 15 Material |
| Spatial efficiency | Road access + networks + distance | no | 4.0 vs 1.0 buildings per road cell |
| Population growth | Admission | no | 2 colonists per staffed Well |
| Economic expansion | Construction + resources | no | labour income funds the next building |

**0 of 14 phenomena are unrepresented.** No phenomenon receives a second system merely because
another abstraction would be possible.

## 14. Candidate systems

**No candidate is raised.** Criterion 1 of the candidate rules — "a phenomenon currently not
represented" — fails for every candidate surveyed in Steps 10AE–10AH (Water storage, Food storage,
Food distribution, Farm input, production dependency, settlement service, pollution, service
radius, local production chain, density/adjacency). Every one of them either duplicates an
existing rule or has no consumer in the current model. Per the step's constraint, no mechanic was
invented to keep adding mechanics.

## 15. Architecture audit

* pure domain/application/rendering separation unchanged; nothing reads UI or rendering state;
* deterministic simulation: two identical 200-tick runs produce the same canonical hash;
* insertion-order invariance over `buildings` / `roads` / `colonists`: same hash;
* derived state not persisted: `coverage`, `mobility`, `networkId`, `served`, `adjacency`,
  `satisfaction`, `happiness`, `pollution` are all absent from the canonical payload;
* `SAVE_VERSION = 7`; exactly **7** persisted top-level keys (`buildings`, `colonists`, `config`,
  `counters`, `resources`, `roads`, `time`);
* FNV-1a 64 hash over canonical JSON unchanged; save/load round-trip deterministic;
* no new framework requirement appeared; after 600 ticks no resource is negative and the upkeep
  clamp holds.

## 16. Final phase-boundary decision

```text
NO NEW CORE SYSTEM JUSTIFIED
```

The audit's evidence:

1. every fundamental phenomenon of the current simulation is already represented by a system
   (section 13);
2. every real player lever produces a measurable trajectory difference (section 3), and the levers
   that do not are dormant *capacity*, not missing systems (sections 4, 8);
3. the causal loop is complete and self-sustaining (sections 9, 10) and its ceiling is a modelled
   constraint (Water capacity; workforce allocation), not a hole (section 11);
4. the city tests show the layout is already an optimisation with identity, trade-offs, recovery
   and long-term consequences (section 12: 5 PASS, 1 PARTIAL);
5. no candidate system passes criterion 1 (section 14), so adding one would be invention rather
   than discovery.

**Recommended next phase** (not implemented in 10AI): gameplay loop validation, scenario and
progression validation, UX/gameplay readability, content, and experimental balancing — potentially
including colony stages *if and only if* their role can now be defined from the existing systems.

## 17. Verification

```text
Vitest:          62 files / 1225 tests passed (before 61 / 1212; audit tests added 13)
Typecheck:       passed
Lint:            passed
Build:           passed
Determinism:     tests/determinism.test.ts (same-run hash + insertion order) passed
Save/load:       tests/persistence.test.ts (round-trip) passed
Invariants:      tests/economicInvariants.test.ts passed
Browser/E2E:     not re-run: `src/` is unchanged, so no UI/E2E behaviour can have changed
```

## 18. Exact next dependency

```text
NO NEW CORE SYSTEM JUSTIFIED
-> next phase: gameplay loop validation / progression validation / readability / content / balance
-> colony stages: only as a design question defined from the existing systems, not as a mechanic in 10AI
```

