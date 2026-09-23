# STEP 10AW — TERRAIN CONTENT & SCENARIO INTEGRATION AUDIT

## CONTEXTE

HEAD attendu :

```text
b686a4d — Step 10AV: Terrain as Spatial Input
```

Step 10AV est CLOSED.

Terrain est maintenant une capacité réelle du moteur :

* `WorldConfig.blockedCells`
* terrain `buildable` / `blocked`
* refus `terrainBlocked`
* routes et bâtiments refusés sur terrain bloqué
* routes multi-cellules atomiques
* rendu via un `InstancedMesh`
* scénarios capables de fournir `blockedCells`
* persistence compatible SAVE_VERSION 7
* déterminisme et insertion-order invariants
* fixture `TERRAIN_CHOKEPOINT_FIXTURE`
* 7 scénarios utilisateur inchangés

Validation 10AV :

* 77 fichiers
* 1443 tests
* typecheck PASS
* lint PASS
* build PASS
* determinism PASS
* insertion-order PASS
* save/load PASS
* browser 16/16 PASS
* headed terrain PASS
* GPU PASS

Le terrain n'est donc plus une hypothèse architecturale.

La question de 10AW est maintenant :

> **Le terrain produit-il suffisamment de décisions de gameplay distinctes pour devenir du contenu jouable, et si oui sous quelle forme minimale ?**

---

# IMPORTANT

Cette étape est **AUDIT-ONLY**.

Ne pas ajouter de nouvelle mécanique.

Ne pas modifier :

* production ;
* consommation ;
* workforce ;
* Water ;
* Food ;
* Material ;
* construction ;
* routes ;
* coûts ;
* progression ;
* objectifs ;
* SAVE_VERSION.

Ne pas ajouter de scénario utilisateur avant la fin de l'audit.

Le but est de mesurer la valeur du terrain **avec les mécaniques existantes**.

---

# 1. AUDIT DU PHÉNOMÈNE VARIANT C

Commencer par reproduire précisément le fixture :

```text
TERRAIN_CHOKEPOINT_FIXTURE
```

Mesurer les trois états :

### A — Connector = road

Mesurer :

* nombre de réseaux ;
* Residences servies ;
* colonists served ;
* workforce eligibility ;
* workplace assignment ;
* Food ;
* Water ;
* Material ;
* tick nécessaire pour atteindre les mêmes états.

### B — Connector = building

Mesurer les mêmes métriques.

### C — Connector = blocked / alternative Well blocked

Mesurer :

* placements refusés ;
* options encore disponibles ;
* réseau ;
* Water coverage ;
* workforce mobility ;
* ressources ;
* capacité de croissance.

Ne pas se contenter d'un snapshot visuel.

Comparer les états causalement.

---

# 2. MESURER LA DÉCISION DU JOUEUR

Pour chaque variante, déterminer :

1. Quelle cellule doit être choisie ?
2. Quelles sont les options légales ?
3. Combien d'options produisent des états différents ?
4. À quel moment la conséquence devient-elle visible ?
5. La décision est-elle réversible ?
6. Quel coût de récupération existe ?
7. La conséquence est-elle économique, spatiale, ou les deux ?
8. Peut-on obtenir le même résultat simplement en dépensant davantage de Material ?
9. Peut-on obtenir le même résultat sans terrain en utilisant une autre disposition ?

Cette dernière question est importante.

Le but est de distinguer :

```text
terrain = vraie contrainte structurelle
```

de :

```text
terrain = simple taxe supplémentaire en Material
```

---

# 3. TEST AFFORDABILITY VS FEASIBILITY

10AU a démontré :

> Well bloqué avec 100 Material = impossible
> Well bloqué avec 3000 Material = toujours impossible.

Reproduire cette propriété dans l'audit.

Tester au minimum :

```text
Material = 25
Material = 100
Material = 300
Material = 3000
```

Pour une même cellule bloquée.

Comparer avec une cellule libre.

Objectif :

```text
blocked = feasibility constraint
free = affordability constraint
```

Si les résultats diffèrent uniquement par le coût, documenter-le.

---

# 4. TEST ROAD DETOUR

Le terrain peut aussi produire des détours.

Construire plusieurs configurations contrôlées :

### Configuration A

Route directe.

### Configuration B

Obstacle nécessitant un détour.

### Configuration C

Obstacle nécessitant un détour plus long.

Mesurer :

* nombre de cellules de route ;
* Material dépensé ;
* distance routière ;
* réseau obtenu ;
* workforce ;
* Water coverage ;
* population ;
* résultat à long terme.

Calculer le coût marginal du terrain :

```text
Δ road cells
Δ Material
Δ road distance
```

Déterminer si le détour produit une décision différente ou uniquement une dépense supplémentaire.

---

# 5. TEST MULTI-ROUTE

Créer un fixture avec au moins deux chemins possibles entre deux régions.

Comparer :

```text
route courte
route longue
```

Mesurer :

* coût ;
* distance ;
* réseau ;
* workforce ;
* Water ;
* résultat économique.

Déterminer si le joueur peut avoir une décision :

> construire moins cher

versus :

> construire plus long mais obtenir une meilleure organisation spatiale.

Ne pas introduire de nouveau bonus.

Utiliser uniquement les règles existantes de :

* road distance ;
* network ;
* Water coverage ;
* workforce mobility ;
* Material cost.

---

# 6. TEST CELL-ROLE COMPETITION

C'est le phénomène principal à valider.

Créer plusieurs fixtures contrôlées où une cellule peut être :

```text
road
```

ou :

```text
building
```

ou :

```text
blocked
```

Comparer les états.

Chercher au minimum trois conséquences possibles :

* connectivité ;
* Water service ;
* workforce mobility.

Ne retenir que les conséquences réellement observées.

Ne pas inventer de conséquence théorique.

---

# 7. TEST CONSTRAINED WATER RECOVERY

Reprendre le cas Variant C où le site alternatif du Well est bloqué.

Tester plusieurs solutions :

### Solution 1

Construire le Well sur un emplacement disponible.

### Solution 2

Étendre le réseau routier.

### Solution 3

Modifier l'ordre de construction.

### Solution 4

Ajouter une Residence ailleurs.

Pour chaque solution :

* coût ;
* délai ;
* Water capacity ;
* served Residences ;
* workforce ;
* résultat final.

L'objectif est de vérifier si le terrain crée une vraie **allocation spatiale sous contrainte**, ou seulement une interdiction.

---

# 8. TEST DE REDONDANCE AVEC LES MÉCANIQUES EXISTANTES

Pour chaque phénomène observé, demander :

> Peut-on reproduire exactement la même décision sans terrain ?

Tester notamment :

### Road budget

Le terrain apporte-t-il autre chose que :

```text
+N road cells
+N Material
```

### Water

Le terrain apporte-t-il autre chose que :

```text
Well plus loin
```

### Workforce

Le terrain produit-il une vraie contrainte de mobilité que la simple distance ne reproduit pas ?

### Housing

Le terrain crée-t-il une contrainte spatiale qui ne se résume pas à ajouter une Residence ?

Classer chaque phénomène :

```text
A — fondamental / non redondant
B — utile mais partiellement redondant
C — faible
D — prématuré
E — redondant
```

Ne pas produire de score global.

---

# 9. SCENARIO CANDIDATES

À partir des mesures uniquement, explorer au maximum ces formes :

## Candidate A — Chokepoint Settlement

Terrain bloque une partie du plateau et laisse un connecteur stratégique.

Décision :

```text
où utiliser le connecteur ?
```

---

## Candidate B — Split Settlement

Un obstacle sépare deux zones constructibles.

Décision :

```text
connecter ou développer séparément ?
```

---

## Candidate C — Constrained Expansion

Le joueur dispose de plusieurs cellules bloquées et doit organiser l'expansion autour.

Décision :

```text
où placer les nouveaux bâtiments et routes ?
```

---

## Candidate D — Constrained Water

Un ou plusieurs emplacements naturels de Well sont bloqués.

Décision :

```text
comment conserver Water coverage ?
```

---

## Candidate E — Multi-route Geometry

Deux corridors permettent de connecter les mêmes zones.

Décision :

```text
court/cher
vs
long/moins coûteux ailleurs
```

Attention :

ne considérer cette candidate comme distincte que si les mécaniques existantes produisent réellement une conséquence supplémentaire.

---

# 10. SCENARIO DISTINCTNESS TEST

Pour chaque candidate viable, mesurer :

### Starting state

Le nombre de bâtiments, ressources et colonists peut rester identique.

### Spatial state

Seul le terrain change.

### Decision space

Identifier les décisions réellement différentes.

### Consequences

Mesurer au moins deux métriques causales différentes.

### Recovery

Mesurer si une erreur peut être récupérée.

### Reproducibility

Rejouer la même séquence et vérifier le même résultat.

Une candidate n'est considérée comme distincte que si :

```text
terrain change
        ↓
decision space changes
        ↓
observable consequence changes
```

et pas seulement :

```text
terrain change
        ↓
more road cells
```

---

# 11. USER-FACING SCENARIO DECISION

À la fin de l'audit, déterminer si un ou plusieurs scénarios doivent rejoindre le catalogue actuel.

Règles :

### Ajouter un scénario seulement si

* décision spatiale claire ;
* conséquence causale ;
* non-redondant avec les 7 scénarios existants ;
* objectif existant suffisant ;
* aucune nouvelle mécanique nécessaire ;
* scénario jouable de bout en bout ;
* erreur/recovery compréhensible.

### Ne pas ajouter si

* c'est seulement un tutoriel visuel ;
* c'est seulement une taxe Material ;
* c'est seulement une version différente de Partitioned Valley ;
* cela nécessite un nouveau système ;
* la décision optimale est triviale ;
* le terrain n'a pas de conséquence mesurable.

Le catalogue actuel doit rester inchangé si aucune candidate ne passe.

---

# 12. OBJECTIFS EXISTANTS

Ne créer **aucun nouveau type d'objectif**.

Tester si les objectifs existants suffisent :

* milestone ;
* population ;
* Water capacity ;
* Food balance ;
* building requirement ;
* stage.

Pour chaque scénario candidat, déterminer si son objectif peut être exprimé avec ces primitives.

Si non :

```text
scenario = deferred
```

Ne pas créer une nouvelle primitive d'objectif uniquement pour sauver le scénario.

---

# 13. READABILITY AUDIT

Utiliser le navigateur.

Le joueur doit pouvoir comprendre :

1. quelles cellules sont bloquées ;
2. pourquoi il ne peut pas construire ;
3. quelles zones sont connectées ;
4. pourquoi une Residence est ou n'est pas servie ;
5. pourquoi un colonist est ou n'est pas eligible ;
6. pourquoi un détour coûte davantage ;
7. quelle décision spatiale il est réellement en train de prendre.

Tester :

```text
1280×800
420×740
360×640
```

Ne pas corriger immédiatement les problèmes de présentation.

Les documenter d'abord.

---

# 14. LONG-RUN REGRESSION

Pour les fixtures retenus :

* 60 ticks minimum ;
* 600 ticks si l'état devient stable.

Vérifier :

* pas d'effet économique caché du terrain ;
* pas d'oscillation ;
* pas de divergence déterministe ;
* pas de changement de règle après plusieurs ticks.

Le terrain doit rester statique.

---

# 15. DETERMINISM / SAVE / INSERTION ORDER

Pour chaque fixture :

### Determinism

Même terrain + mêmes commandes → même résultat.

### Insertion order

Modifier l'ordre des `blockedCells` → même résultat.

### Save/load

Sauvegarder avant et après construction → même résultat après reload.

### Hash

Même configuration canonique → même hash.

Aucun état dérivé du terrain ne doit devenir persisté.

---

# 16. ARCHITECTURE AUDIT

Vérifier que 10AV n'a pas introduit de couplage indésirable.

Terrain doit rester lu uniquement par :

```text
world/config
placement validation
scenario construction
rendering
```

Le terrain ne doit pas être lu directement par :

```text
Food
Water production
Material production
Workforce assignment
Population admission
Construction progression
Objectives
```

sauf indirectement parce qu'une construction n'a pas pu avoir lieu.

Cette distinction est essentielle.

---

# 17. NO IMPLEMENTATION

Cette étape doit rester **audit-only**.

Ne pas modifier :

```text
src/domain/economy
src/domain/workforce
src/domain/resources
src/domain/simulation
```

Ne pas ajouter de scénario utilisateur.

Ne pas changer les constantes.

Ne pas ajouter de terrain types.

Ne pas ajouter de terrain bonuses.

Ne pas ajouter de nouvelle règle de gameplay.

Si une correction purement documentaire ou test-only est nécessaire, elle est autorisée.

Si une correction de production est nécessaire :

1. documenter le défaut ;
2. ne pas corriger silencieusement ;
3. proposer le correctif comme prochaine étape.

---

# 18. VALIDATION

Exécuter :

```text
pnpm typecheck
pnpm lint
pnpm build
```

Puis :

* Vitest complet ;
* tests terrain ;
* determinism ;
* insertion-order ;
* save/load ;
* browser headless ;
* browser headed ;
* GPU.

Le commit final doit rester audit-only sauf corrections test/docs explicitement nécessaires.

---

# FINAL REPORT

Retourner exactement :

```text
STEP 10AW — FINAL REPORT

Starting commit:
Final commit:

BASELINE
- Terrain implementation:
- Existing scenario count:
- SAVE_VERSION:

VARIANT C
- connector as road:
- connector as building:
- blocked Well:
- causal consequences:

AFFORDABILITY VS FEASIBILITY
- Material 25:
- Material 100:
- Material 300:
- Material 3000:
- conclusion:

ROAD DETOUR
- direct:
- detour:
- marginal cost:
- distinct decision: yes/no

MULTI-ROUTE
- routes tested:
- observed consequences:
- distinct decision: yes/no

CELL-ROLE COMPETITION
- road:
- building:
- blocked:
- non-redudant consequence:

WATER CONSTRAINT
- alternatives tested:
- costs:
- outcomes:
- recovery:

REDUNDANCY AUDIT
| Phenomenon | Classification | Evidence |
|---|---|---|
| Chokepoint | | |
| Detour | | |
| Multi-route | | |
| Water constraint | | |
| Expansion | | |

SCENARIO CANDIDATES
| Candidate | Distinct | Causal | Existing objective sufficient | Decision |
|---|---|---|---|---|
| Chokepoint Settlement | | | | |
| Split Settlement | | | | |
| Constrained Expansion | | | | |
| Constrained Water | | | | |
| Multi-route Geometry | | | | |

CATALOGUE
- Scenarios added:
- Scenarios rejected:
- Scenarios deferred:
- Reason:

READABILITY
- Desktop:
- 420×740:
- 360×640:
- Findings:

LONG RUN
- 60 ticks:
- 600 ticks:
- hidden terrain effects:

DETERMINISM
- deterministic:
- insertion-order:
- save/load:
- hash:

ARCHITECTURE
- terrain consumers:
- forbidden direct consumers:
- production changes:
- domain changes:

VALIDATION
- typecheck:
- lint:
- build:
- Vitest:
- browser:
- headed:
- GPU:

CLASSIFICATION

A / B / C / D / E

DECISION

[one factual paragraph explaining whether terrain has demonstrated enough distinct gameplay value to justify user-facing scenario content]

NEXT DEPENDENCY:
```

## CRITICAL QUESTION

La question de Step 10AW n'est **pas** :

> « Est-ce que le terrain est cool ? »

Elle est :

> **« Parmi les phénomènes que le terrain rend possibles, lesquels changent réellement l'espace de décision du joueur avec les mécaniques NOVA déjà existantes ? »**

Ne pas chercher à justifier le terrain à tout prix.

Si les mesures montrent que seul le chokepoint est réellement nouveau, conserver uniquement ce phénomène.

Si aucun scénario supplémentaire ne dépasse les scénarios existants, conclure que le terrain est une capacité valide mais que son contenu doit rester différé.

Si un scénario est réellement distinct, le documenter précisément sans encore l'implémenter.


# Documentation (as-built) — Step 10AW

Starting commit: `b686a4d` (Step 10AV).
Final commit: this commit.

**AUDIT ONLY.** No production file changed: no mechanic, no scenario, no
economic constant, no objective primitive, no SAVE_VERSION change, no new
terrain type. The catalogue is still 7 scenarios and SAVE_VERSION is still 7.
The step adds one audit test file (`tests/terrainContentScenarioIntegrationAudit.test.ts`,
25 tests) and one browser audit script (`e2e/terrainReadabilityAudit.mjs`).

## 1. What was measured, and how

Everything below is measured on the IMPLEMENTED Step 10AV terrain with the
existing mechanics only. Two instruments carry the whole audit:

* **`subsetAnalysis`** — apply the same candidate actions to the same starting
  state in both worlds (with terrain / without it), settle for a fixed horizon,
  and compare the sets of reachable outcome signatures
  `population | servedResidences | waterCapacity | foodPerTick | foodConsumption | networks | employed | stage`.
  A terrain world that only removes options yields a **subset**; a terrain world
  that changes the action→outcome mapping yields **new** signatures.
* **`roadCellsToReconnect`** — a 0/1-cost search (existing roads free, free
  cells cost one new road cell, buildings and terrain impassable) for the
  minimum road length that would join two existing networks, or `null` when no
  route exists. This is the affordability-vs-feasibility probe for a ROUTE.

## 2. Variant C, measured causally

| connector (2,1) | networks | served Res. | served colonists | capacity | material left | Food/tick | pop | stage | west Res. served | cross-region eligible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| road | **1** | **2** | 2 | 2 | 25 | 2 | 2 | village | yes | **yes** |
| building (farm) | **2** | **1** | 1 | 2 | 5 | 2 | 2 | village | no | **no** (`notConnected`) |
| blocked (no command) | 2 | 1 | 1 | 2 | 30 | 2 | 2 | village | no | no |

The two worlds differ in **service and mobility only**: population, Food
balance, Water capacity, jobs and stage are identical. Ticks to effect: 2 (a
placed road/building needs its 2 construction ticks).

## 3. Affordability vs feasibility

| Material | blocked cell | free cell |
| --- | --- | --- |
| 20 | `terrainBlocked` | `insufficientResources` |
| 25 | `terrainBlocked` | accepted |
| 100 | `terrainBlocked` | accepted |
| 300 | `terrainBlocked` | accepted |
| 3000 | `terrainBlocked` | accepted |

A blocked cell is refused with the state reference unchanged at every level;
the free cell follows money. Extended to a route (candidate A): after a building
occupies the connector, reconnecting the two networks costs **7 new road cells
(35 Material)** on the open map and is **impossible at any Material** with the
ridge.

## 4. Road detour — a Material tax

| variant | road cells laid | Material spent | road distance | networks | served Res. | capacity | pop @60 | Food net @60 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A direct | 4 | 20 | 4 | 1 | 1 | 2 | 1 | −1 |
| B one blocked cell | 6 | 30 | 6 | 1 | 1 | 2 | 1 | −1 |
| C longer detour | 8 | 40 | 8 | 1 | 1 | 2 | 1 | −1 |

Marginal: **+2 cells / +10 Material / +2 distance** and **+4 cells / +20
Material / +4 distance**. Nothing else changes: same network, same coverage,
same capacity, same population, same Food balance.

## 5. Multi-route — the one non-obvious consequence found

Same buildings, same resources, same one network; only the corridor to the Well
changes (terrain blocks the first cell of the short arm):

| world | well distance | farm distance | colonist works | Water capacity | Food/tick | @120 ticks |
| --- | --- | --- | --- | --- | --- | --- |
| open (short arm) | 0 | 3 | **well** | 2 | 0 | population **0** (starved), Water 101 |
| terrain (long arm) | 4 | 3 | **farm** | 0 | 2 | population **1**, Food 220, `shortage` |

Blocking one cell **flips the 09M nearest-workplace choice**, so the same Well
produces 0 Water and the Farm produces 2 Food. This is a real, measurable
consequence created by route geometry — using only existing rules (09M distance
preference + staffing + Water production). It is nevertheless reproducible on an
open map by placing the buildings differently, which is why it is classified B
rather than A.

## 6. Cell-role competition — three consequences, one cell

| role | connectivity | Water service | west Residence served | cross-region eligible | jobs | population | stage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| road | 1 | 2 | **yes** | **yes** | 2/3 | 2 | village |
| building (farm) | 2 | 1 | no | no | 2/4 | 2 | village |
| blocked | 2 | 1 | no | no | 2/3 | 2 | village |

Three consequences are real (connectivity, Water service, cross-region workforce
mobility). The only jobs difference comes from the building role adding a
workplace — not from terrain. Stage and population never change.

Recovery of a wrong role (a Residence on the connector): **no attempt is legal** —
`cellOccupiedByBuilding` on the connector, `terrainBlocked` on every ridge cell
and on the west Well site. 40 ticks later the colony is alive, at population 3,
with 2 served Residences and Food +1/tick — i.e. the penalty is **permanent but
narrow**: exactly one Residence (the west one) stays outside Water coverage
forever, and the connector Residence is itself served because it touches both
networks.

## 7. Constrained Water — every solution

West-network extension candidates (the only road of the west region is (1,1)):

| cell | adjacent to the west road | verdict |
| --- | --- | --- |
| 0,1 | yes | `terrainBlocked` |
| 1,0 | yes | `cellOccupiedByBuilding` (Residence) |
| 1,2 | yes | `cellOccupiedByBuilding` (Farm) |
| 2,1 | yes | **accepted** (the connector) |

Well placement: (0,1) `terrainBlocked` **even with 3000 Material**; (2,1) and a
free east cell (3,2) are accepted. So **every viable west Water solution passes
through the connector cell**:

| solution | cost | 20 ticks later |
| --- | --- | --- |
| Well on the connector (2,1) | 25 Material | 2 served Residences, capacity 2, 1 network +… stays 2 networks, jobs 2/**4**, the Well stays vacant |
| connector road (2,1) | **5 Material** | 2 served Residences, capacity 2, **1** network, jobs 2/3 |
| Residence in the east instead | 25 Material | population 3, west Residence still **unserved** |

The connector road is strictly cheaper than the Well on the same cell, so the
optimum is trivial. Two incidental observations are recorded as future work
(not fixed here): a **vacant operational Well still grants coverage**, so the
Well-on-connector solution "serves" the west Residence while producing nothing;
and the west Residence's service is permanent either way.

## 8. Redundancy classification (measurements only)

| Phenomenon | Classification | Evidence |
| --- | --- | --- |
| Chokepoint | **A** | the same command yields a severed state that 40 ticks and every recovery attempt leave identical; `terrainBlocked` at 20/25/100/300/3000 Material; the repair route is impossible at any Material with terrain and costs 7 cells without it |
| Detour | **E** | +2 cells/+10 Material and +4 cells/+20 Material; network, coverage, capacity, population and Food identical after 60 ticks |
| Multi-route | **B** | the 09M flip is measurable and live-or-die (state table above), but the mechanism is existing and the same outcome is reachable on an open map by another layout |
| Water constraint | **C** | the blocked site forbids one placement; every viable solution passes through the connector and the cheapest is a 5-Material road versus a 25-Material Well — money, not a new decision |
| Expansion | **C** | terrain only removes candidate cells; the existing road budget (5/cell) already prices that, and no outcome differs from the open map except the Material spent |

## 9. Scenario candidates

| Candidate | Distinct | Causal | Existing objective sufficient | Decision |
| --- | --- | --- | --- | --- |
| Chokepoint Settlement | feasibility yes, decision space no (`onlyWithTerrain = []`, the open map reaches a superset) | yes (service + mobility, permanent) | yes (`stage village` + `population 3`) | **deferred** — the optimum (connect through the connector) is trivial and the recovery rule is not comprehensible because buildings cannot be removed |
| Split Settlement | no (`onlyWithTerrain = []`, `onlyWithoutTerrain = []`) | yes (cost of one Well per network vs one connector road) | yes (`stage village` + 2 operational Wells) | **rejected** — this is 10AR's partitioned valley re-parameterised |
| Constrained Expansion | no (same signature set, fewer legal cells) | weak (placement availability only) | yes (`stage settlement` + population) | **rejected** — a renamed layout-efficiency decision |
| Constrained Water | no (one cell refused; alternatives are money) | yes but trivial | yes (`waterCapacity 4`) | **rejected** — the optimum is a 5-Material road |
| Multi-route Geometry | subset on terrain, but the open-map choice is meaningful | yes (workplace flip → Water/Food/survival) | yes (`waterCapacity 2` + `foodBalance`) | **deferred** — the most promising phenomenon measured, but it needs no terrain: a content author can already build it on an open map |

**Central finding**: in every candidate measured, the terrain world's reachable
outcome set is a **subset** of its open-map twin's (`onlyWithTerrain = []` in all
five). Terrain never adds a reachable outcome; it removes options, raises their
price, and can make a mistake permanent.

## 10. Catalogue

* Scenarios added: **none** (audit step; the catalogue stays at 7 and every
  scenario is still terrain-free).
* Objective primitives: the five existing kinds are sufficient for every
  candidate; **no new objective type is needed** (and none was added).
* The Step 10AV fixture stays where it is (`SCENARIO_FIXTURES`, deep-link only).

## 11. Readability (browser, `e2e/terrainReadabilityAudit.mjs`)

Measured at 1280×800 / 420×740 / 360×640: no horizontal overflow, the board is
usable, all 12 blocked cells stay rendered, hover and click explain the refusal
(`cell 2,3 — blocked by terrain`, `Cannot build Residence — blocked by terrain`,
`road 1 cell — blocked by terrain`), a free neighbour still reads `ready`, and a
refused click mutates nothing. **Findings (documented, not fixed):**

1. No HUD surface (legend, label or test id) explains terrain: the explanation
   lives only in the transient status line, so the information disappears as
   soon as the pointer moves.
2. The panel mentions terrain only through the scenario's constraint sentence
   ("the west Well site (0,1) is terrain-blocked") — never as a rule, and there
   is no legend for the visual style (dark matte quads).
3. **420×740: 11 of 12 blocked cells project behind the left HUD overlay;
   360×640: 10 of 12.** The terrain is obscured exactly where the decision is
   made, and the panel cannot be collapsed (existing 10AT layout).

## 12. Long run, determinism, architecture

| check | result |
| --- | --- |
| 60 ticks | identical to the connected state (network 1, 2 served, capacity 2, Food 0 net) |
| 600 ticks | static terrain (byte-identical `blockedCells`), two independent runs hash-identical, no oscillation, no rule drift |
| hidden effects | a never-targeted blocked set leaves the whole 600-tick trajectory byte-identical (terrain stripped from the compared JSON) |
| determinism | same terrain + same commands → same hash |
| insertion order | reversed authoring → same state and hash (`df4eb7e6e890bba3` → `dab8bd8f6f9d5938` are the before/after-build saves, both reload-stable) |
| save/load | terrain survives exactly; SAVE_VERSION 7; no derived terrain key is persisted (top-level keys unchanged, `config.world` = `blockedCells, height, seed, width`) |
| architecture | terrain references exist in exactly 8 source files (config, state, placement validators, save, renderSnapshot, scenarios, renderer, app) and in **0 of 17** forbidden files (resource, water, jobs, housing, mobility, network, building, road, colonist, step, hash, resources/progression/objective/inspection/network/roads queries) |

---

## 13. FINAL REPORT

```text
STEP 10AW — FINAL REPORT

Starting commit: b686a4d (Step 10AV)
Final commit:    this commit

BASELINE
- Terrain implementation: config.world.blockedCells (canonical "x,y", optional,
  omit-when-empty), 'terrainBlocked' in both placement validators, one
  InstancedMesh renderer, scenario wiring, SAVE_VERSION 7
- Existing scenario count: 7 (unchanged, all terrain-free)
- SAVE_VERSION: 7 (unchanged)

VARIANT C
- connector as road: 1 network, 2 served Residences, 2 served colonists,
  capacity 2, 25 Material left, cross-region workplace eligible
- connector as building: 2 networks, 1 served Residence, 5 Material left,
  cross-region refused 'notConnected'
- blocked Well: (0,1) terrainBlocked at 20/25/100/300/3000 Material and at any
  route; every west extension except the connector is terrain or occupied
- causal consequences: Water service (2 -> 1 served Residences), connectivity
  (1 -> 2 networks), workforce mobility (eligible -> notConnected); production,
  Food balance, capacity, jobs and stage are IDENTICAL in all three roles

AFFORDABILITY VS FEASIBILITY
- Material 25: blocked refused, free accepted
- Material 100: blocked refused, free accepted
- Material 300: blocked refused, free accepted
- Material 3000: blocked refused, free accepted
- conclusion: blocked = feasibility (refused at every price, state unchanged),
  free = affordability (refused only below 25); extended to a route: 7 new road
  cells / 35 Material without terrain, impossible at any Material with it

ROAD DETOUR
- direct: 4 cells / 20 Material / distance 4
- detour: 6 cells / 30 Material / distance 6 (one blocked cell), 8 cells /
  40 Material / distance 8 (two)
- marginal cost: +2 cells / +10 Material / +2 distance and +4 cells /
  +20 Material / +4 distance
- distinct decision: NO — after 60 ticks network, coverage, capacity,
  population and Food balance are identical: a Material tax

MULTI-ROUTE
- routes tested: a short arm (2 cells) and a long arm (3 cells of detour) to the
  same Well, with the first cell of the short arm blocked
- observed consequences: the 09M preference flips (well distance 0 -> 4 versus
  farm 3), the colonist staffs the Farm instead of the Well, Water capacity
  2 -> 0, Food 0 -> 2, and after 120 ticks the direct world has starved
  (population 0) while the detoured world is alive and Food-positive
- distinct decision: NO (but the closest to one) — the mechanism is existing
  (09M + staffing) and the same outcomes are reachable on an open map by
  placing the buildings differently

CELL-ROLE COMPETITION
- road: 1 network, 2 served Residences, cross-region eligible
- building: 2 networks, 1 served Residence, cross-region notConnected
- blocked: identical to the building role in service and mobility
- non-redundant consequence: none that is NEW — the three consequences are real
  and causal, but every one of them is a narrowing of what the open map already
  allows (a repair route exists without terrain, at a price)

WATER CONSTRAINT
- alternatives tested: Well on a west cell (0,1 blocked, 2,1 legal, 3,2 legal),
  extending the west road (only the connector is legal), a Well on the
  connector, the connector road, a third Residence in the east
- costs: 25 (Well), 5 (connector road), 25 (east Residence)
- outcomes: Well-on-connector and connector road both restore the west
  Residence (2 served, capacity 2); the east Residence leaves the west
  Residence unserved forever while reaching population 3
- recovery: none for the west Residence once the connector is built on, and the
  cheaper solution (5 Material) needs the same cell, so the optimum is trivial

REDUNDANCY AUDIT
| Phenomenon | Classification | Evidence |
|---|---|---|
| Chokepoint | A | feasibility at any Material; the repair route is impossible with terrain and 7 cells without it |
| Detour | E | +2/+4 cells = +10/+20 Material, everything else identical |
| Multi-route | B | measurable 09M flip with live-or-die consequences, but existing rules and reproducible by layout |
| Water constraint | C | one placement forbidden; the alternatives are money and the cheapest is trivial |
| Expansion | C | candidate cells only; existing road-budget pricing, no new outcome |

SCENARIO CANDIDATES
| Candidate | Distinct | Causal | Existing objective sufficient | Decision |
|---|---|---|---|---|
| Chokepoint Settlement | no (strict subset) | yes, permanent, narrow | yes | deferred |
| Split Settlement | no | yes (cost only) | yes | rejected (10AR re-parameterised) |
| Constrained Expansion | no | weak | yes | rejected |
| Constrained Water | no | yes but trivial | yes | rejected |
| Multi-route Geometry | no (subset), most promising | yes | yes | deferred (needs no terrain) |

CATALOGUE
- Scenarios added: none
- Scenarios rejected: Split Settlement, Constrained Expansion, Constrained Water
- Scenarios deferred: Chokepoint Settlement, Multi-route Geometry
- Reason: every measured terrain decision space is a strict subset of its
  open-map twin (onlyWithTerrain = [] in all five candidates), so no candidate
  changes the decision space in the way Step 10AW §10 requires; the two deferred
  ones are the only phenomena with a causal consequence and both must first be
  re-measured as CONTENT (they are expression-complete with the existing
  objective primitives and need no new mechanic)

READABILITY
- Desktop 1280x800: terrain visible, 12 instances, hover/click refusal
  explained, free neighbour still reads ready, zero mutation on refusal
- 420x740: no overflow, board usable; 11 of 12 blocked cells project behind the
  left HUD overlay
- 360x640: no overflow, board usable; 10 of 12 blocked cells project behind the
  left HUD overlay, so the ridge is largely obscured where the decision is made
- Findings: (1) no legend or permanent HUD explanation of terrain — the reason
  exists only in the transient status line; (2) the panel mentions terrain only
  as scenario framing, never as a rule; (3) at 420x740 and 360x640 the panel
  obscures the terrain and cannot be collapsed. Documented, not fixed (audit).

LONG RUN
- 60 ticks: identical to the connected state (1 network, 2 served, capacity 2)
- 600 ticks: static terrain, no oscillation, two runs hash-identical, no rule
  drift, and a never-targeted blocked set leaves the trajectory byte-identical
- hidden terrain effects: none measured

DETERMINISM
- deterministic: yes (same terrain + same commands -> same hash)
- insertion-order: yes (reversed blockedCells authoring -> same state and hash)
- save/load: yes (terrain survives exactly, pre- and post-build saves reload to
  the same hashes; no derived terrain key persisted)
- hash: yes (terrain participates through canonicalJson(config.world))

ARCHITECTURE
- terrain consumers: src/domain/world/grid.ts, src/domain/simulation/state.ts,
  src/domain/simulation/phases.ts, src/application/scenarios.ts,
  src/application/queries/renderSnapshot.ts,
  src/application/persistence/save.ts, src/renderer/three/novaRenderer.ts,
  src/app/main.ts (exactly 8, measured by source scan)
- forbidden direct consumers: resource, water, jobs, housing, mobility, network,
  building, road, colonist, step, hash, resources/progression/objective/
  inspection/network/roads queries — 0 of 17 offenders
- production changes: none
- domain changes: none (the placement validators already own the refusal)

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 78 files / 1468 tests PASS (+1 audit file, +25 tests; 77/1443 before)
- browser: 17 / 17 headless ALL PASS (15 existing + terrain + terrain readability)
- headed: terrain suite PASS, terrain readability PASS
- GPU: GPU E2E ALL PASS (headed, ANGLE/NVIDIA, not software)

CLASSIFICATION

B — PROMISING BUT PARTIALLY REDUNDANT. Terrain is a valid, well-isolated
capability (architecture, determinism, persistence and readability verified),
and exactly one property is genuinely non-redundant: feasibility — a blocked
cell or a blocked route is unusable at ANY Material, which no resource change
can express. But that property manifests as a permanent NARROWING of the
player's options (a trap for the cell-role choice, a Material tax for detours,
a deterministically avoidable flip for multi-route), never as a new reachable
outcome: in all five candidates the terrain decision space is a strict subset of
the open-map one, and the only non-trivial measured consequence (the 09M
workplace flip) needs no terrain at all.

DECISION

Terrain has demonstrated enough to remain in the engine as a spatial input and
NEITHER enough to justify user-facing scenario content NOW NOR nothing at all:
the audit measured one non-redundant structural property (feasibility /
irreversibility), three redundant or trivial phenomena (detour tax, constrained
Water with a trivial optimum, expansion candidate-cell reduction) and one
promising-but-reproducible phenomenon (the multi-route workplace flip). Because
every terrain decision space measured is a strict subset of its open-map twin,
no candidate passes Step 10AW §10's distinctness bar, so the catalogue stays
unchanged at 7 scenarios and the terrain content question is DEFERRED rather
than answered. The two deferred candidates (Chokepoint Settlement, Multi-route
Geometry) are documented above with their measured numbers so a future CONTENT
step can decide between them without re-deriving the mechanics; before that,
three findings must be addressed as content/readability work, not as mechanics:
the absent terrain legend, the panel obscuring 10-11 of 12 blocked cells at
420x740 and 360x640, and the fact that a VACANT operational Well still grants
Water coverage (which lets a Well on a chokepoint "serve" a Residence while
producing nothing).

NEXT DEPENDENCY:
- Content, not mechanics. Either (a) author the Chokepoint Settlement scenario
  as the trap it is — with a budget that makes the open-map repair route
  affordable so the mistake is recoverable and comprehensible — or (b) author
  the Multi-route phenomenon as ordinary open-map content, where it needs no
  terrain. Both are content steps on the frozen 2/2 economy, both need only the
  existing objective primitives, and both require the readability findings of §11
  to be resolved first. No further terrain capability is justified by the
  evidence of this audit.
```
