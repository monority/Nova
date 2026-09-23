# STEP 10AX — NEXT CAUSAL CAPABILITY DISCOVERY

## CONTEXTE

HEAD attendu :

```text
b7d896d — Step 10AW: Terrain Content & Scenario Integration Audit
```

Les phases suivantes sont désormais fermées :

* économie 2/2 gelée ;
* progression Wilderness → Settlement → Village implémentée ;
* Town+ non contractable ;
* scénarios actuels : 7 ;
* terrain implémenté mais valeur gameplay limitée ;
* terrain = contrainte spatiale, pas nouveau système économique.

10AW a établi un résultat important :

> Le terrain ne crée aucun nouvel outcome atteignable par rapport à la carte ouverte. Il retire des options, augmente certains coûts et peut rendre certaines erreurs irréversibles.

Le terrain ne doit donc plus être utilisé comme justification artificielle pour créer du contenu.

---

# OBJECTIF

Identifier, **sans implémenter**, le prochain phénomène causal qui pourrait permettre à NOVA de dépasser le stade Village et éventuellement rendre contractable une progression Town.

Ce n'est PAS :

* un brainstorming de features ;
* une liste de mécaniques amusantes ;
* une nouvelle passe sur les audits déjà fermés.

La question est :

> **Quelle capacité causale absente du modèle actuel pourrait créer une nouvelle manière stable de raisonner sur la ville, sans simplement ajouter une quantité, un coût ou un seuil ?**

---

# 1. DELTA-ONLY AUDIT

Commencer par récupérer les conclusions de :

* 10AI — System Sufficiency
* 10AJ — Gameplay Loop
* 10AK — Progression Contract
* 10AN — Town Qualitative State
* 10AO — Industrial Headroom
* 10AP — Production Tuning
* 10AQ — Industrial Gameplay Contract
* 10AR — Water / Partition
* 10AS — Opening Economy
* 10AT — Content / Readability Closure
* 10AU — Terrain Design
* 10AV — Terrain Implementation
* 10AW — Terrain Content Audit

Construire une matrice des capacités déjà examinées.

Ne pas réévaluer comme candidates principales les systèmes déjà classés :

* Food distribution ;
* Water distribution ;
* pollution ;
* adjacency ;
* density ;
* shelter quality ;
* service radius ;
* labor specialization sous économie 2/2 ;
* sustainable industry sous 2/2 ;
* terrain productivity ;
* terrain bonuses ;
* terrain multi-route comme système ;
* simple road efficiency ;
* simple population thresholds.

Si une ancienne conclusion est utilisée, l'indiquer comme **closed evidence**, pas comme nouvelle découverte.

---

# 2. DÉFINIR LE PROBLÈME TOWN

Avant de chercher une mécanique, définir précisément ce qui manque.

Comparer :

### Village

Le modèle sait déjà exprimer :

* population ;
* Water capacity ;
* Food balance ;
* housing ;
* workforce ;
* production ;
* construction ;
* réseau ;
* spatial access.

### Town

Un véritable état Town devrait introduire au moins une dimension où :

```text
A → B
```

n'est pas simplement :

```text
plus de population
plus de bâtiments
plus de routes
plus de ressources
```

mais modifie qualitativement la manière dont le joueur doit organiser la colonie.

Formuler cette différence sans inventer de système.

---

# 3. OUTCOME-SPACE ANALYSIS

Utiliser l'instrumentation existante lorsque possible.

Pour chaque capacité candidate :

1. définir deux états contrôlés ;
2. garder les mêmes ressources ;
3. garder la même population ;
4. garder les mêmes bâtiments lorsque possible ;
5. changer une seule propriété structurelle ;
6. simuler ;
7. comparer les outcome signatures.

Chercher un phénomène où :

```text
same stock
same population
same buildings
different structural choice
        ↓
different stable outcome
```

et où cette différence ne se réduit pas à :

* coût supplémentaire ;
* distance supplémentaire ;
* capacité supplémentaire ;
* seuil arbitraire.

---

# 4. CANDIDATE DISCOVERY

Explorer uniquement des capacités réellement absentes du modèle.

Pour chaque candidate, partir du code et du comportement actuel, pas d'une feature fantasy.

Quelques axes autorisés à investiguer :

### A — Colonist differentiation

Le modèle actuel traite les colonists comme une population homogène.

Question :

> Existe-t-il une différenciation minimale qui créerait un véritable choix sans simplement multiplier les travailleurs ?

Ne rien implémenter.

Mesurer d'abord si l'économie actuelle possède réellement une situation où cette distinction serait causalement nécessaire.

---

### B — Construction scheduling / priority

Le modèle possède Construction Crew et construction duration.

Question :

> L'ordre temporel des constructions crée-t-il déjà une capacité qualitative sous-exploitée ?

Tester uniquement avec les règles existantes.

Ne pas ajouter de file d'attente ou de priorité.

---

### C — Infrastructure contention

Le réseau routier possède déjà :

* coût ;
* connectivité ;
* distance ;
* Water coverage ;
* workforce mobility.

Question :

> Existe-t-il une forme de contention structurelle non capturée par ces règles ?

Ne pas inventer congestion, capacité routière ou trafic.

Chercher seulement un phénomène déjà latent dans le modèle.

---

### D — Housing / population composition

Residence = capacité 1.

Question :

> La population actuelle est-elle réellement trop homogène pour permettre une nouvelle décision ?

Tester avec les règles existantes.

Si aucune différence causale n'existe, classer immédiatement D/E.

---

### E — Production timing

Le système possède déjà :

* construction delay ;
* crew ;
* production ;
* upkeep ;
* storage ;
* workforce assignment.

Question :

> Existe-t-il un phénomène temporel qualitatif non encore exploité, distinct du simple Material/Food/Water balance ?

Tester sur des scénarios contrôlés.

---

### F — Resource transformation

Le Workshop peut transformer du travail + Water en Material.

Question :

> Existe-t-il une seconde transformation déjà implicite dans le modèle, ou une dépendance croisée actuellement sans conséquence qualitative ?

Ne pas ajouter de nouvelle recette.

Chercher uniquement ce que les règles actuelles permettent déjà de démontrer.

---

### G — Network topology

Terrain + roads produisent maintenant plusieurs réseaux.

Question :

> Existe-t-il une propriété topologique déjà calculable qui crée un changement qualitatif autre que served/notConnected ?

Tester :

* nombre de réseaux ;
* taille des composantes ;
* articulation/chokepoint ;
* accès ;
* couverture Water ;
* mobilité.

Ne pas ajouter de graph theory gameplay arbitraire.

---

# 5. INTERDICTION DE RECYCLAGE

Pour chaque phénomène trouvé, répondre :

```text
Déjà mesuré en 10AI ? 
Déjà rejeté en 10AH ?
Déjà rejeté en 10AG ?
Déjà rejeté en 10AO/AP?
Déjà couvert par 10AR ?
Déjà couvert par 10AW ?
```

Si oui :

```text
CLOSED — not a new candidate
```

Ne pas le compter comme découverte.

---

# 6. QUALITATIVE TEST

Une candidate ne peut être considérée comme Town-capable que si elle passe les six critères :

### 1. Causal

Le phénomène découle réellement des règles.

### 2. Stable

Il persiste suffisamment longtemps pour constituer un état de ville.

### 3. Reproducible

Même état + mêmes commandes → même résultat.

### 4. Consequential

Le joueur doit faire un choix qui change un résultat important.

### 5. Non-linear / qualitative

Ce n'est pas simplement :

```text
+1 bâtiment
+1 ressource
+1 route
+1 colonist
```

### 6. Readable

Le joueur peut comprendre pourquoi son choix produit cet état.

Une candidate qui échoue à un seul des critères doit être classée comme insuffisante pour Town.

---

# 7. CONTROLLED PAIRS

Pour chaque candidate prometteuse, construire au moins une paire :

```text
CONTROL A
```

vs

```text
CONTROL B
```

avec :

* mêmes ressources initiales ;
* même population ;
* même bâtiments ;
* même terrain ;
* mêmes constantes ;
* seule la décision étudiée change.

Comparer :

* tick ;
* population ;
* Food ;
* Water ;
* Material ;
* workforce ;
* networks ;
* services ;
* stage ;
* objective ;
* stabilité à 60 ticks ;
* stabilité à 600 ticks.

---

# 8. LONG-RUN

Toute candidate prometteuse doit être testée :

```text
60 ticks
600 ticks
```

Si elle produit seulement un effet transitoire :

```text
TEMPORARY
```

et non :

```text
QUALITATIVE CITY STATE
```

Ne pas la promouvoir artificiellement.

---

# 9. PLAYER DECISION TEST

Pour chaque candidate survivante :

Identifier explicitement :

```text
Decision:
Option A:
Option B:

Immediate consequence:
Delayed consequence:
Recovery:
Permanent consequence:
```

Le choix doit être compréhensible sans connaître les internals du moteur.

---

# 10. TOWN CONTRACT TEST

Pour chaque candidate survivante, tenter de construire un contrat Town avec les primitives existantes.

Exemple de forme :

```text
Town:
condition A
AND
condition B
AND
qualitative state C
```

Mais :

* aucun seuil arbitraire ;
* aucune condition basée uniquement sur `ticks`;
* aucune condition basée uniquement sur `buildingCount`;
* aucune condition basée uniquement sur `population`;
* aucun score artificiel.

Si aucun contrat causal n'est possible :

```text
NOT CONTRACTABLE
```

---

# 11. SCENARIO POTENTIAL

Pour chaque candidate réellement valide :

Déterminer si elle permet de créer un scénario distinct avec :

* état initial ;
* contrainte ;
* objectif existant ;
* décision ;
* conséquence ;
* recovery.

Ne pas créer le scénario.

Classer :

```text
A — scenario-ready
B — promising but needs another capability
C — weak
D — premature
E — redundant
```

---

# 12. ARCHITECTURE CONSTRAINT

Cette étape est audit-only.

Ne modifier aucun comportement de production.

Ne modifier aucune constante.

Ne modifier aucune règle de simulation.

Ne modifier aucun save.

Ne modifier aucun scénario utilisateur.

Ne modifier aucun renderer.

Les seuls changements autorisés sont :

* instrumentation de test ;
* tests d'audit ;
* documentation ;
* scripts d'analyse temporaires nécessaires aux mesures.

Si une nouvelle capacité semble nécessaire :

> **ne pas l'implémenter.**

La documenter comme prochaine proposition.

---

# 13. FINAL DECISION MATRIX

Construire une table finale :

| Candidate                 | New phenomenon | Causal | Stable | Consequential | Qualitative | Readable | Town-capable |
| ------------------------- | -------------- | -----: | -----: | ------------: | ----------: | -------: | -----------: |
| Colonist differentiation  |                |        |        |               |             |          |              |
| Construction timing       |                |        |        |               |             |          |              |
| Infrastructure contention |                |        |        |               |             |          |              |
| Housing composition       |                |        |        |               |             |          |              |
| Production timing         |                |        |        |               |             |          |              |
| Resource transformation   |                |        |        |               |             |          |              |
| Network topology          |                |        |        |               |             |          |              |

Ne pas donner de score numérique.

Les colonnes sont des critères binaires/factuels, pas une note globale.

---

# 14. NEXT STEP SELECTION

À la fin, une seule des trois conclusions est autorisée :

### A — New capability justified

Une capacité précise est suffisamment démontrée.

Documenter :

* phénomène ;
* preuve ;
* mécanisme minimal nécessaire ;
* pourquoi les systèmes précédents ne suffisent pas ;
* impact potentiel sur Town ;
* impact architecture ;
* impact persistence éventuel.

**Ne pas l'implémenter dans 10AX.**

---

### B — Existing mechanics sufficient, content missing

Le modèle possède déjà une capacité qualitative, mais elle n'est pas correctement exploitée.

Documenter :

* mécanisme ;
* scénario possible ;
* objectif possible ;
* contenu nécessaire.

---

### C — No capability justified

Aucune nouvelle capacité ne produit un phénomène qualitatif suffisamment robuste.

Dans ce cas :

> ne pas inventer Town.

Le prochain travail doit devenir contenu, UX ou expérimentation explicitement hors progression Town.

---

# 15. VALIDATION

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
* browser si des fixtures UI sont ajoutés ;
* GPU si le browser est utilisé.

Aucune régression acceptée.

---

# FINAL REPORT

Retourner exactement :

```text
STEP 10AX — FINAL REPORT

Starting commit:
Final commit:

CLOSED CAPABILITIES
- list of already rejected dimensions:
- terrain status:
- economy status:

TOWN PROBLEM
- qualitative gap:
- what Village currently represents:
- what a Town state would need to represent:

CANDIDATE MATRIX
| Candidate | New phenomenon | Causal | Stable | Consequential | Qualitative | Readable | Town-capable |
|---|---|---:|---:|---:|---:|---:|---:|

CONTROLLED PAIRS
- Candidate:
  - Control A:
  - Control B:
  - Difference:
  - 60 ticks:
  - 600 ticks:

PLAYER DECISIONS
- Candidate:
  - Decision:
  - Option A:
  - Option B:
  - Immediate consequence:
  - Delayed consequence:
  - Recovery:
  - Permanent consequence:

TOWN CONTRACTS
- Candidate:
  - Contract:
  - Causal:
  - Non-arbitrary:
  - Existing primitives sufficient:
  - Verdict:

SCENARIO POTENTIAL
| Candidate | Class | Why |
|---|---|---|

ARCHITECTURE
- src changes:
- test instrumentation:
- persistence:
- economic constants:
- simulation rules:

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

FINAL CLASSIFICATION

A / B / C

DECISION

[One factual paragraph explaining whether a new causal capability is justified, existing mechanics merely need content, or no Town-capable capability currently exists.]

NEXT DEPENDENCY:
```

## CRITICAL RULE

Ne pas chercher à fabriquer une réponse positive.

Le résultat correct peut parfaitement être :

> **C — aucune nouvelle capacité causale suffisamment robuste n'est actuellement justifiée.**

Dans ce cas, Town reste volontairement non contractable.

Le but de 10AX est de trouver **la prochaine vraie frontière du modèle**, pas de remplir artificiellement la roadmap.


# Documentation (as-built) — Step 10AX

Starting commit: `b7d896d` (Step 10AW).
Final commit: this commit.

**AUDIT ONLY.** No production file changed: no constant, no simulation rule, no
save, no scenario, no renderer, no new capability. `git status` shows exactly
one new test file (`tests/nextCausalCapabilityDiscovery.test.ts`, 30 tests) and
this document.

## 1. Method (delta-only, measured, not re-litigated)

Every previously closed dimension is cited as **closed evidence** and only then
re-measured on the CURRENT code where a measurement adds information. The
discovery instrument is the controlled pair: two states with the same
resources, population, buildings and terrain where **one structural property**
changes, settled for 60 and 600 ticks and compared by outcome signature
(`population | foodNet | waterCapacity | servedColonists | employed | unemployed | materialPerTick | stage`).

## 2. Closed capability matrix (14 dimensions, all previously closed)

| audit | dimension | verdict |
| --- | --- | --- |
| 10AG | Food distribution | NO SYSTEM — would clone the Water shape, creates no new decision |
| 10AH | adjacency / density | NO NEW SPATIAL SYSTEM — adjacency is not a concept; same-network facts carry every consequence |
| 10AI | new core system | NO NEW CORE SYSTEM JUSTIFIED — the loop is complete, no candidate passed criterion 1 |
| 10AK | simple population thresholds | Town → City NOT CONTRACTABLE — larger colonies are identical in kind |
| 10AN | specialization, workforce surplus, infrastructure scale, spatial optimization, throughput | all REJECTED — linear scale or cost only; missing dependency = a spare worker |
| 10AO | sustainable industry | NOT CONTRACTABLE — temporary or deficit-based only |
| 10AP | production-rate tuning | spare ≤ 0 at every feasible population at 2/2; tuning DEFERRED with its content |
| 10AA/10AB/10AC | producer→producer dependency (Workshop ← Water/tick) | STOPPED — closes a construction cycle rooted in the finite initial Material; a one-off construction Water cost was implemented instead (10AD) |
| 10X | road-distance efficiency, irrigation, power coverage, sanitation, education, transit | C/D — duplicate Water/Food, need a missing consumer, or need a flow that does not exist |
| 10Z | construction crew as a durable advantage | not fundamental — nothing converts construction timing into a persistent payoff |
| 10V/10W | shelter quality | B then C — a real spatial choice with no independent consequence |
| 10T/10U | Farm ← Water input, recurring upkeep as input | REJECTED — survival spiral / recurring Material tax |
| 10AR | partitioned valley as a scenario | B — overlapping; catalogue stays 7 |
| 10AS / 10AT | opening economy / new economic capability | healthy; **no missing causal capability found**, phase closed as A |
| 10AU/10AV/10AW | terrain and obstacles | implemented as spatial input; every terrain decision space is a **subset** of its open-map twin |

Frozen baseline re-pinned by the audit: 7 scenarios, none terrain-bearing,
SAVE_VERSION 7, the five objective kinds, and every economic constant
(2 Food/Farm, 2 Water/Well, 2 Material/worker, 1 upkeep, 25 storage, 2 ticks,
5 Material/road, 25 per building).

## 3. The Town problem, measured

**The Village contract is a scale milestone, not an organisation state.** The
10AV chokepoint fixture is `village` (population 2, capacity 2, Food 2/2) while
it is structurally defective on every axis the model can see:

| measurement | value |
| --- | --- |
| stage | `village` |
| served Residences | 1 of 2 |
| vacant operational workplaces | 1 (`farm@4,2`) |
| jobs | 2 / 3 |
| road networks | 2 |
| integrity contract (all served ∧ no vacancy ∧ one network) | **false (all three parts false)** |

**Scale is quantity only** (re-measured, 10AN/10AO): with the balanced shape
`ceil(P/2)` Wells + `floor(P/2)` Farms the workplaces equal the population
exactly, every workplace is staffed and `unemployed = 0` at P = 2, 3, 4, 5, 6,
8, 10. P = 2 and P = 6 have the same flow structure (Food net 0, Water capacity
= P, Material income 0, stage `village`): only the numbers differ.

## 4. The seven candidate axes, each measured

**A — Colonist differentiation.** Two colonists created in the other order (and
with swapped Residences) produce **identical outcome signatures**: a colonist is
`id + residence + workplace + construction assignment`, all already
player-visible, and every colonist is equally capable everywhere. A distance tie
is resolved by building id and changes *which* workplace is staffed without
changing the outcome signature. No situation was found in which differentiation
would be causally necessary.

**B — Construction scheduling.** Same 50 Material, same two buildings, same
one-road opening, Food reserve 3, order swapped: Farm first → the colony
survives (population 1, Food net +1 at tick 62); Well first → the colony is
**wiped** (population 0). The ordering decision is real and consequential — and
it is the decision 10AS/10AM already measured; the model needs no scheduler.
Throughput is linear: four placements cost four ticks and 4 × 25 Material.

**C — Infrastructure contention.** One road cell serving all four buildings
(2 Residences, 1 Well, 1 Farm) versus three access cells with identical
topology: **identical** outcome signature, coverage (2/2 served), employment
(2/2) and flows. Cells are exclusive (building XOR road, measured), but nothing
consumes a road's capacity: there is no contention phenomenon in the model, and
adding one would be a new system.

**D — Housing composition (the only qualitatively different candidate).** Same
four buildings, two roads, two colonists, identical stock:

| variant | networks | Water capacity | served | employed | unemployed | stage |
| --- | --- | --- | --- | --- | --- | --- |
| homes across both networks | 2 | **2** | 1 | 2 | 0 | village |
| both homes on the Farm-only network | 2 | **0** | 0 | 1 | 1 | **settlement** |

Stable at 60 and 600 ticks. The causation is real, stable and qualitative — and
it is reachable with **one existing command**: which network the extra Residence
stands on (both cells measured legal, same 25 Material). The model is not blind
to it either: the composition also moves the *stage*. So the candidate is an
existing decision (placement) plus existing gates (09K/10P), not a missing
capability.

**E — Production timing.** A reserve-funded Workshop at P = 2 (Material 25,
Water 51, 51 = 25 × 2 + 1) pays 25 Material + 1 Water, equilibrates at 0
Material and produces nothing at 40 ticks with a colony-wide deficit. Measured
more sharply: one colonist with a Farm, a Well and a nearest Workshop staffs the
**Workshop**, leaving Food 0 and Water 0 → the colony collapses at tick 80
(population 0) after producing 24 Material. Timing is a reserve, never a surplus:
production stays instantaneous per tick (10AO/10AP/10AQ).

**F — Resource transformation.** The only qualitative cross-dependency is the
all-or-nothing Food rule: with Food 1 the colonist is fed on tick 1 and the
colony is **wiped on tick 2** (measured); Water shortage never kills (2
colonists, 0 capacity, alive at tick 20). The recurring producer input was
rejected twice (10T, 10AA/10AB) and replaced by the one-off construction cost
(10AD): there is no second implicit transformation left to expose.

**G — Network topology.** Component size only bounds how many workplaces are
*reachable*: one colonist with three connected workplaces staffs one of them
(jobs 1/3, two vacant) — the existing 09K mobility gate. The one quirk found is
an **incoherence, not a capability**: an operational but *vacant* Well grants
Water coverage (the Residence is `served`, `servedColonists = 1`) while the
colony produces 0 Water and reports `shortage`.

## 5. Candidate matrix (§13 of the step prompt, measurements only)

| Candidate | New phenomenon | Causal | Stable | Consequential | Qualitative | Readable | Town-capable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Colonist differentiation | no | yes | yes | no | no | yes | **no** |
| Construction timing | no | yes | no | yes | no | yes | **no** |
| Infrastructure contention | no | **no** | no | no | no | yes | **no** |
| Housing composition | no | yes | yes | yes | yes | yes | **no** |
| Production timing | no | yes | no | yes | no | yes | **no** |
| Resource transformation | no | yes | yes | yes | no | yes | **no** |
| Network topology | no | yes | yes | yes | no | yes | **no** |

No row is Town-capable, and no row introduces a new phenomenon: each is either
an existing decision, a linear cost, or a deficit.

## 6. Player decisions and Town contracts (the two causal survivors)

**Construction timing** — decision: which building first with 50 Material and
3 Food. Option A: Farm first (survives). Option B: Well first (wiped).
Immediate: which service becomes operational. Delayed: survival. Recovery: the
second building can still be completed, a lost colonist cannot. Permanent:
death is permanent (all-or-nothing Food). Verdict: **not contractable** without
an arbitrary tick/building threshold.

**Housing composition** — decision: which network the next Residence stands on.
Option A: the Well's network (the new colonist staffs the Well → 2 Water/tick).
Option B: the Farm-only network (the colonist staffs the Farm → the Well stays
vacant → 0 Water/tick, stage falls to Settlement). Immediate: staffing.
Delayed: the colony's Water economy. Recovery: free (build on the other network
for 25 Material). Permanent: none while Material remains. Verdict: the
**civic-integrity contract** (all Residences served ∧ no vacant operational
workplace ∧ one network) is causal, non-arbitrary (no population/building/tick
threshold) and expressible with existing queries only — it is TRUE for two of
the seven scenario starts (`industrial-expansion`, `water-reserve-industry`) and
FALSE for the 10AV fixture while that fixture is already `village` — but it
requires no new capability and no new reasoning: a competently placed settlement
gets it for free. **Contractible, not a capability.**

**The spare-worker contract** ("a staffed Workshop while Food and Water remain
balanced") measured false at P = 2, 4, 6, 8, 10: the Workshop is the vacant
workplace in every balanced shape, and forcing it staffed collapses the colony.
**NOT CONTRACTABLE at the frozen rates** (10AO/10AP, re-measured).

## 7. Scenario potential

| Candidate | Class | Why |
| --- | --- | --- |
| Colonist differentiation | D | premature: no situation needs it (10X class 6 = C for the same reason) |
| Construction timing | C | weak: the existing opening/order decision, already exercised by 4 scenarios |
| Infrastructure contention | E | redundant: the phenomenon does not exist |
| Housing composition | B | promising as *content* (a placement scenario), needs no new capability |
| Production timing | E | redundant: bounded burst, already exercised by `water-reserve-industry` |
| Resource transformation | E | redundant: closed twice (10T/10U, 10AA/10AB) |
| Network topology | C | weak: only the existing 09K gate plus one incoherence to consider |

## 8. Architecture and validation

```text
src changes:            none (audit only; verified by a source scan: no candidate
                        identifier exists in src/, terrain readers unchanged at 8)
test instrumentation:   1 new file (30 tests); no production export added
persistence:            untouched; SAVE_VERSION 7; audit fixtures round-trip
economic constants:     untouched (re-pinned in the audit)
simulation rules:       untouched
typecheck / lint / build: PASS
Vitest:                 79 files / 1498 tests PASS (+1 file / +30 tests)
determinism / insertion-order / save-load: PASS (audit fixtures)
browser:                17 / 17 suites headless ALL PASS (src/ untouched, re-run for the claim)
GPU:                    ALL PASS (headed)
```

---

## 9. FINAL REPORT

```text
STEP 10AX — FINAL REPORT

Starting commit: b7d896d (Step 10AW)
Final commit:    this commit

CLOSED CAPABILITIES
- list of already rejected dimensions: Food distribution (10AG), adjacency/density
  (10AH), new core system (10AI), simple population thresholds and Town->City
  (10AK), specialization/workforce surplus/infrastructure scale/spatial
  optimization/construction throughput (10AN), sustainable industry (10AO),
  production-rate tuning (10AP, deferred), recurring producer->producer
  dependency (10AA/10AB/10AC, replaced by 10AD's one-off construction cost),
  road-distance efficiency/irrigation/power/sanitation/education/transit (10X
  C/D), construction crew durability (10Z), shelter quality (10V/10W), Farm<-
  Water and recurring upkeep inputs (10T/10U), partitioned valley as a scenario
  (10AR), new economic capability (10AS/10AT), terrain productivity/bonuses
  (10AU-AW)
- terrain status: IMPLEMENTED as spatial input (10AV); 10AW measured that every
  terrain decision space is a strict subset of its open-map twin, so terrain
  supplies no new reachable outcome
- economy status: frozen 2/2 (Farm 2, Well 2, Material 2/worker gross, upkeep 1,
  storage 25, 2-tick construction, road 5, initial 100/100/0), SAVE_VERSION 7,
  7 terrain-free scenarios, five objective kinds

TOWN PROBLEM
- qualitative gap: the Village contract is a SCALE milestone; it is satisfied by
  a colony that is split (2 networks), has one unserved Residence and one vacant
  operational workplace (measured), and a larger colony is identical in kind
  (measured at P = 2 and P = 6)
- what Village currently represents: population >= 2, Water capacity >= 2, Food
  balance, on one or more networks
- what a Town state would need to represent: a state a larger colony can express
  and a Village cannot, i.e. a change in HOW the player must reason (10AN's
  missing dependency: a surplus state), not more of the same quantities

CANDIDATE MATRIX
| Candidate | New phenomenon | Causal | Stable | Consequential | Qualitative | Readable | Town-capable |
|---|---|---:|---:|---:|---:|---:|---:|
| Colonist differentiation | no | yes | yes | no | no | yes | no |
| Construction timing | no | yes | no | yes | no | yes | no |
| Infrastructure contention | no | no | no | no | no | yes | no |
| Housing composition | no | yes | yes | yes | yes | yes | no |
| Production timing | no | yes | no | yes | no | yes | no |
| Resource transformation | no | yes | yes | yes | no | yes | no |
| Network topology | no | yes | yes | yes | no | yes | no |

CONTROLLED PAIRS
- Candidate: Housing composition (the only qualitative one)
  - Control A: four buildings / two roads / two colonists, homes on BOTH networks
  - Control B: identical, both homes on the Farm-only network
  - Difference: Water capacity 2 -> 0, served Residences 1 -> 0, employment 2 -> 1,
    stage village -> settlement (same stock, same population, same buildings)
  - 60 ticks: difference persists unchanged
  - 600 ticks: difference persists unchanged (both states stable)
- Candidate: Construction timing
  - Control A: Farm first, then Well (50 Material, Food 3)
  - Control B: Well first, then Farm
  - Difference: survival (population 1 with Food net +1 at tick 62 versus wiped)
  - 60 ticks / 600 ticks: the wiped branch stays wiped; the surviving branch is stable
- Candidate: Infrastructure contention
  - Control A: ONE road cell serving all four buildings
  - Control B: three access cells, same topology
  - Difference: NONE in flows (identical outcome signature, 2/2 served, 2/2 employed)
  - 60 / 600 ticks: identical (the only difference is 5 Material per extra cell)
- Candidate: Colonist differentiation
  - Control A / B: colonists created in the other order / with swapped Residences
  - Difference: NONE (identical outcome signature)
  - 60 / 600 ticks: identical
- Candidate: Production timing
  - Control A: 2 colonists with a Farm + Well (balanced)
  - Control B: the same plus a Workshop held by a reassigned worker
  - Difference: a bounded Material burst bought by a Food/Water deficit
  - 40 ticks: deficit; 80 ticks (P = 1 variant): collapse
- Candidate: Resource transformation
  - Control A: 1 colonist with 1 Food; Control B: the same with Water 0 and no Well
  - Difference: Food kills (wiped at tick 2), Water does not (alive at tick 20)
  - 60 / 600 ticks: the Food branch is empty; the Water branch is stable
- Candidate: Network topology
  - Control A: 1 colonist, 3 connected workplaces; Control B: 1 colonist, 1 workplace
  - Difference: job capacity 3 vs 1 (staffed 1 either way): the 09K gate, no new fact
  - 60 / 600 ticks: unchanged; the vacant-Well coverage quirk is stable

PLAYER DECISIONS
- Candidate: Construction timing (existing capability)
  - Decision: which building to place first with a fixed 50 Material and 3 Food
  - Option A: Farm first (Food production arrives before the reserve ends)
  - Option B: Well first (Water capacity before Food)
  - Immediate consequence: which service becomes operational
  - Delayed consequence: survival (measured: option B is wiped)
  - Recovery: the remaining building can still be completed; a lost colonist cannot
  - Permanent consequence: colony death (all-or-nothing Food)
- Candidate: Housing composition (existing capability)
  - Decision: which network the next Residence stands on
  - Option A: the Well's network (the new colonist staffs the Well)
  - Option B: the Farm-only network (the Well stays vacant)
  - Immediate consequence: which workplace gets the colonist
  - Delayed consequence: 2 Water/tick or 0 Water/tick; Village or Settlement
  - Recovery: free, 25 Material for a Residence on the other network
  - Permanent consequence: none while Material remains

TOWN CONTRACTS
- Candidate: Housing composition
  - Contract: civic integrity = all Residences Water-served AND no vacant
    operational workplace AND exactly one road network
  - Causal: yes (three existing derived facts, each already player-visible)
  - Non-arbitrary: yes (no population, building-count, tick or score condition)
  - Existing primitives sufficient: yes (getWaterServedResidenceCount,
    countWorkersAt, getRoadNetworks); true for 2 of 7 scenario starts, false for
    the 10AV fixture while it is already Village
  - Verdict: CONTRACTIBLE BUT NOT A CAPABILITY — a competently placed settlement
    satisfies it for free, so it adds no new reasoning and no new decision
- Candidate: Production timing
  - Contract: a staffed Workshop while Food and Water stay balanced
  - Causal: yes; Non-arbitrary: yes; Primitives sufficient: yes
  - Verdict: NOT CONTRACTABLE at the frozen rates (measured false at P = 2, 4, 6,
    8, 10; forcing it staffed collapses the colony)
- All five other candidates: no contract possible without an arbitrary threshold
  (construction timing), no phenomenon to contract (contention), no consumer
  (differentiation, topology), or closed evidence (resource transformation)

SCENARIO POTENTIAL
| Candidate | Class | Why |
|---|---|---|
| Colonist differentiation | D | no situation needs it; 10X class 6 already C |
| Construction timing | C | the existing opening/order decision, already in 4 scenarios |
| Infrastructure contention | E | the phenomenon does not exist in the model |
| Housing composition | B | promising as CONTENT (a placement scenario); needs no capability |
| Production timing | E | bounded burst, already exercised by water-reserve-industry |
| Resource transformation | E | closed twice (10T/10U, 10AA/10AB) |
| Network topology | C | only the existing 09K gate plus the vacant-Well incoherence |

ARCHITECTURE
- src changes: none
- test instrumentation: 1 audit file (30 tests); source scan confirms no candidate
  identifier reached src/ and the terrain reader set is unchanged (8 files)
- persistence: untouched (SAVE_VERSION 7; audit fixtures round-trip)
- economic constants: untouched (re-pinned in the audit)
- simulation rules: untouched

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 79 files / 1498 tests PASS (+1 file / +30 tests; 78/1468 before)
- determinism: PASS       - insertion-order: PASS       - save/load: PASS
- browser: 17 / 17 suites headless ALL PASS (re-run although src/ is untouched)
- GPU: ALL PASS (headed)

FINAL CLASSIFICATION

C — NO CAPABILITY JUSTIFIED

DECISION

The seven candidate axes were each measured with controlled pairs on the current
code and none introduces a new, robust qualitative phenomenon: colonist
differentiation has no causal need (colonists are interchangeable by
measurement), infrastructure contention does not exist (one shared access cell
and three dedicated cells give identical flows), construction timing and housing
composition are real and consequential but they are decisions the model ALREADY
contains (placement and build order, measured to flip survival and to add or
remove the colony's whole Water economy), production timing remains a bounded
reserve-funded burst that displaces a survival worker, resource transformation
is closed by the all-or-nothing Food rule and the rejected recurring producer
input, and network topology adds only the existing 09K gate plus one incoherence
(a vacant Well grants coverage without producing Water). The single qualitative
state the model cannot reach — a spare worker sustaining a staffed Workshop with
balanced flows — is blocked by the rate identity measured again at P = 2, 4, 6,
8, 10, and the only measured path to it remains the production-rate tuning that
10AP deferred with its content; that is a design decision, not a discoverable
capability. Town therefore stays deliberately non-contractable, no new mechanic
or threshold is invented, and the next work is content, UX and experimentation
outside Town progression (the housing-composition scenario being the strongest
content lead, and the terrain legend / HUD occlusion plus the vacant-Well
coverage semantics being the outstanding readability/semantics items).

NEXT DEPENDENCY:
- Content + UX, outside Town progression. Concretely: (1) the housing-composition
  placement scenario (class B, needs no capability, only content and an existing
  objective), (2) the outstanding readability items recorded in 10AW (terrain
  legend, panel occlusion at 420x740 / 360x640) and the vacant-Well
  coverage-versus-production incoherence, and (3) — only if the product wants a
  genuine Town stage — the deferred 10AP tuning decision (Farm 3 / Well 3 / both),
  which is the single measured route to a surplus state and must ship together
  with the content that exercises it.
```
