Tu travailles sur NOVA.

# Step 10AK — Progression & Scenario Design Contract Audit

## Starting point

Starting commit:

`8605593`

Step 10AJ a conclu :

```text
B — GAMEPLAY LOOP EXISTS BUT NEEDS READABILITY/CONTENT
```

Constats établis :

* le gameplay loop actuel est conséquent ;
* les décisions court terme produisent des trajectoires différentes ;
* les décisions spatiales peuvent avoir des conséquences à long terme ;
* plusieurs configurations atteignent des équilibres distincts ;
* la simulation est déterministe ;
* la lisibilité runtime est déjà fortement couverte ;
* le problème principal n'est plus un manque de simulation core ;
* il n'existe actuellement **aucun objectif/progression state** ;
* les premiers stades peuvent être distingués par des états existants ;
* `Town → City → Metropolis → Autonome` ne sont pas actuellement justifiables par des métriques existantes ;
* les scénarios peuvent déjà produire des espaces de décision différents sans nouvelles règles.

Le point particulièrement important identifié par 10AJ :

```text
initial resources = 100 Material
```

alors qu'un archétype simple :

```text
2 Residences + Well + Farm + required roads
```

dépasse le budget initial.

Cela signifie que le joueur reçoit actuellement un choix d'ouverture implicite, mais **sans framing explicite de l'objectif**.

---

# HARD CONSTRAINT

**Step 10AK est un DESIGN-CONTRACT AUDIT.**

Ne pas implémenter le système de progression.

Ne pas implémenter les scénarios.

Ne pas modifier `src/`.

Ne pas changer les valeurs économiques.

Ne pas ajouter :

* nouvelles ressources ;
* nouveaux bâtiments ;
* nouveaux systèmes économiques ;
* bonus de progression ;
* multiplicateurs ;
* technologies ;
* upgrades ;
* XP ;
* arbre technologique ;
* achievements ;
* bonheur ;
* satisfaction ;
* pollution ;
* services ;
* logistics ;
* transport ;
* adjacency ;
* nouvelles règles de production.

Le but est de définir **ce que la progression et les scénarios devraient signifier**, en utilisant exclusivement les états et causalités déjà présents.

---

# 1. AUDIT — Inventory the existing progression signals

À partir du code réel, liste toutes les métriques actuellement disponibles sans nouvelle simulation.

Minimum à examiner :

* population ;
* Residence count ;
* Farm count ;
* Well count ;
* Workshop count ;
* operational building count ;
* road cells ;
* road networks ;
* water-served residences ;
* staffed Farms ;
* staffed Wells ;
* staffed Workshops ;
* unemployed colonists ;
* Food production ;
* Food stock ;
* Water production;
* Water stock ;
* Material production ;
* Material stock ;
* construction activity ;
* construction completion ;
* sustained stability ;
* road/network extent ;
* workforce capacity ;
* industrial capacity.

Pour chaque métrique :

| Metric | Existing state | Deterministic | Persistent? | Derived? | Monotonic? | Meaning |
| ------ | -------------- | ------------- | ----------- | -------- | ---------- | ------- |

Ne crée aucune métrique nouvelle.

---

# 2. AUDIT — Separate "milestone" from "score"

Le système de progression ne doit pas transformer NOVA en jeu de score arbitraire.

Définis précisément la différence entre :

```text
MILESTONE
```

et :

```text
SCORE
```

Un milestone doit représenter un changement réel de capacité/état du settlement.

Un score peut simplement augmenter sans modifier la simulation.

Le système futur doit privilégier les milestones.

Teste les métriques existantes contre cette définition.

---

# 3. AUDIT — Wilderness → Settlement

Détermine si `Wilderness → Settlement` peut être défini à partir d'un état déjà existant.

Teste notamment :

* première infrastructure ;
* première Residence ;
* premier réseau ;
* première population ;
* première production ;
* premier état soutenable.

Pour chaque candidat :

```text
measurable
causal
stable
player-visible
non-arbitrary
```

Utilise :

```text
PASS / PARTIAL / FAIL
```

Ne sélectionne pas encore de contrat final si plusieurs candidats restent plausibles.

---

# 4. AUDIT — Settlement → Village

Même méthode.

Cherche un changement qualitatif réel déjà présent.

Examine notamment :

* plusieurs colonists ;
* plusieurs Residences ;
* Food production ;
* Water capacity ;
* workforce ;
* multiple production buildings ;
* stable population;
* infrastructure expansion.

Important :

Ne considère pas automatiquement :

```text
population >= N
```

comme un milestone.

Explique pourquoi le seuil correspond ou non à une transformation réelle du settlement.

---

# 5. AUDIT — Village → Town

C'est probablement le premier point difficile.

Step 10AJ a signalé que certains seuils de population sont arbitraires.

Cherche une combinaison de métriques existantes qui représenterait réellement :

```text
settlement
→
economically established town
```

Possible dimensions à examiner :

* population ;
* infrastructure ;
* productive capacity ;
* industrial capacity ;
* sustained stability ;
* network extent ;
* multiple building types.

Tu peux proposer une **combinaison** de métriques existantes.

Tu ne peux pas créer une nouvelle mécanique pour rendre la combinaison intéressante.

---

# 6. AUDIT — Town → City

Step 10AJ indique que cette transition n'est pas actuellement supportée.

Vérifie cette conclusion.

Cherche si l'état actuel possède réellement un changement qualitatif identifiable.

Si aucun signal ne le permet :

```text
TOWN → CITY = NOT YET CONTRACTABLE
```

Ne force pas un seuil arbitraire.

Explique précisément ce qui manque dans l'état actuel.

---

# 7. AUDIT — City → Metropolis

Même analyse.

Ne suppose pas qu'une population plus grande suffit.

Demande :

> Qu'est-ce qui rendrait une colonie qualitativement différente d'une simple colonie plus grande ?

Si aucun phénomène existant ne permet de répondre :

```text
CITY → METROPOLIS = NOT YET CONTRACTABLE
```

---

# 8. AUDIT — Metropolis → Autonome

Cette transition est particulièrement importante pour le concept NOVA.

Détermine si "Autonome" peut être représenté par les systèmes actuels.

Attention :

Ne crée pas artificiellement une nouvelle ressource ou une nouvelle règle d'autonomie.

Cherche uniquement si l'état actuel peut déjà démontrer :

* production suffisante ;
* consommation soutenable ;
* stabilité prolongée ;
* capacité productive ;
* indépendance vis-à-vis d'un état extérieur.

Si ce n'est pas représentable :

```text
METROPOLIS → AUTONOME = NOT YET CONTRACTABLE
```

C'est une conclusion valide.

---

# 9. AUDIT — Progression contract candidates

Construis une table :

| Stage | Candidate contract | Existing data | Causal | Stable | Non-arbitrary | Status |
| ----- | ------------------ | ------------- | ------ | ------ | ------------- | ------ |

Pour chaque transition, autorise uniquement :

```text
SUPPORTED
PARTIALLY SUPPORTED
NOT CONTRACTABLE
```

Ne fais aucun classement global.

---

# 10. AUDIT — Avoid arbitrary thresholds

Pour chaque seuil numérique proposé, applique cette question :

> Pourquoi ce nombre correspond-il à un changement du système plutôt qu'à une préférence de game design ?

Exemples :

```text
population >= 4
roads >= 5
Workshop >= 1
Water capacity >= 4
```

Un nombre n'est acceptable que s'il est relié à une causalité existante.

Si aucune justification causale n'existe :

```text
ARBITRARY THRESHOLD
```

Ne l'utilise pas comme contrat.

---

# 11. AUDIT — Scenario design

Le système actuel permet potentiellement des scénarios sans nouvelles règles.

Définis ce qu'est un scénario dans NOVA :

```text
SCENARIO =
initial state + constraints + objective/framing
```

et non :

```text
SCENARIO =
new simulation mechanics
```

Inventorie les dimensions d'état déjà disponibles :

* starting Material ;
* starting Food ;
* starting Water ;
* initial buildings ;
* initial roads ;
* initial colonists ;
* initial workforce assignments ;
* initial network topology ;
* available build space ;
* existing production capacity.

Ne code rien.

---

# 12. Scenario archetypes

À partir uniquement des variables existantes, examine au minimum :

### Scenario A — First Settlement

Très peu d'infrastructure.

Question :

> Le joueur peut-il établir un premier settlement durable ?

### Scenario B — Water Constraint

Water initiale/capacité limitée.

Question :

> Le joueur doit-il prioriser la capacité Water ?

### Scenario C — Industrial Expansion

Workshop / Material deviennent le centre du problème.

Question :

> Le joueur doit-il arbitrer production, workforce et construction ?

### Scenario D — Spatial Efficiency

Budget Material limité + coût des routes.

Question :

> Le joueur doit-il optimiser le réseau ?

### Scenario E — Population Expansion

Plusieurs Residences potentielles.

Question :

> Le joueur doit-il planifier Food/Water/workforce avant de croître ?

### Scenario F — Recovery

Settlement partiellement construit avec une contrainte existante.

Question :

> Le joueur peut-il récupérer une mauvaise situation ?

Pour chaque scénario, indique :

* état initial minimal ;
* décision centrale ;
* systèmes mobilisés ;
* variable limitante ;
* condition de réussite possible ;
* condition d'échec possible ;
* pourquoi il est différent du jeu libre.

Ne crée aucune règle nouvelle.

---

# 13. Scenario objective audit

Un scénario doit avoir un objectif compréhensible.

Examine trois formes :

### Survival objective

```text
maintain a stable settlement for N ticks
```

### Milestone objective

```text
reach an existing measurable state
```

### Constraint objective

```text
reach a measurable state while respecting an existing constraint
```

Pour chaque scénario candidat, détermine quelle forme est naturellement compatible avec les systèmes existants.

Ne choisis pas arbitrairement une durée ou un seuil.

---

# 14. Failure conditions

Les scénarios doivent pouvoir échouer pour des raisons causales existantes.

Examine :

* Food collapse ;
* Water shortage ;
* inability to staff production ;
* inaccessible production ;
* resource exhaustion ;
* construction deadlock ;
* inability to expand.

Ne crée pas de nouvelle condition d'échec.

---

# 15. Free-play vs scenario mode

Détermine conceptuellement la différence entre :

```text
FREE PLAY
```

et :

```text
SCENARIO
```

Le scénario ne doit pas modifier les règles fondamentales.

La différence devrait être limitée à :

```text
starting state
+
constraints
+
objective/framing
```

Vérifie si cela suffit avec les systèmes actuels.

---

# 16. Progression UX contract

Sans modifier l'UI, définis les informations qu'une future progression devrait exposer.

Minimum :

```text
Current stage
Next milestone
Progress toward milestone
Current blocking condition
Primary objective
```

Mais seulement si ces informations peuvent être calculées à partir de l'état existant.

Ne crée pas de pseudo-progress bars pour des métriques arbitraires.

---

# 17. Objective readability

Le joueur doit pouvoir répondre :

1. Où en suis-je ?
2. Que suis-je en train d'essayer d'accomplir ?
3. Pourquoi suis-je bloqué ?
4. Quelle décision peut débloquer la situation ?
5. Qu'est-ce que j'ai accompli ?

Teste si les données existantes permettent de répondre à ces questions.

Si non, indique précisément quelle information manque.

Ne crée pas encore cette information.

---

# 18. Initial-state audit

Reproduis le problème identifié en 10AJ :

```text
100 Material initial
```

Teste plusieurs ouvertures plausibles.

Détermine :

* quelles ouvertures sont réellement disponibles ;
* lesquelles échouent ;
* pourquoi ;
* si le jeu explique actuellement ces contraintes ;
* si plusieurs ouvertures sont viables ;
* si une ouverture dominante existe mécaniquement.

Le but n'est pas de modifier les coûts.

Le but est de déterminer ce que le futur framing doit expliquer.

---

# 19. Content depth audit

Pour chaque scénario potentiel, mesure combien de temps le joueur dispose avant convergence vers l'équilibre.

Examine :

* nombre de décisions significatives ;
* nombre de constructions ;
* nombre de contraintes rencontrées ;
* nombre de trajectoires différentes ;
* moment de convergence ;
* état final.

Le but est de déterminer si un scénario est réellement un contenu de gameplay ou simplement une simulation plus courte.

---

# 20. Final design contract

À la fin, produis un contrat **proposé mais non implémenté** contenant :

### A. Progression

Pour chaque transition :

```text
SUPPORTED
PARTIALLY SUPPORTED
NOT CONTRACTABLE
```

### B. Scenario system

Définis :

```text
Scenario =
initial state
+ existing constraints
+ objective
```

### C. Objective types

Liste uniquement les types d'objectifs naturellement supportés par le modèle actuel.

### D. Stage information

Définis quelles informations doivent être visibles.

### E. Deferred progression

Liste explicitement les transitions qui ne doivent pas encore être implémentées.

---

# 21. Architecture audit

Vérifie :

* `src/` inchangé ;
* SAVE_VERSION = 7 ;
* 7 persisted keys ;
* aucun nouvel état persistant requis ;
* aucune migration ;
* deterministic ;
* insertion-order invariant ;
* save/load invariant.

Si le contrat proposé nécessiterait un nouvel état persistant, indique-le mais **ne l'implémente pas**.

---

# 22. Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Run également :

* determinism ;
* insertion-order;
* save/load ;
* browser validation si les états/metrics sont affichés.

Audit tests uniquement :

```text
tests/*Progression*Audit.test.ts
tests/*Scenario*Audit.test.ts
```

No `src/` modifications.

---

# 23. Final report

Créer :

`docs/roadmap/Step10AK.md`

Structure exacte :

```text
STEP 10AK — PROGRESSION & SCENARIO DESIGN CONTRACT AUDIT

Starting commit:
Final commit:

1. Existing progression signals
2. Milestone vs score
3. Wilderness → Settlement
4. Settlement → Village
5. Village → Town
6. Town → City
7. City → Metropolis
8. Metropolis → Autonome
9. Progression contract candidates
10. Arbitrary-threshold audit
11. Scenario definition
12. Scenario archetypes
13. Scenario objectives
14. Failure conditions
15. Free-play vs scenario
16. Progression UX contract
17. Objective readability
18. Initial-state audit
19. Content depth
20. Final design contract
21. Architecture
22. Verification
23. Final decision
24. Next dependency
```

---

# FINAL DECISION

Choose one:

```text
A — PROGRESSION CONTRACT READY
```

Use only if existing state supports a coherent initial progression contract and at least one useful scenario contract without arbitrary thresholds.

```text
B — PARTIAL PROGRESSION CONTRACT
```

Use if early stages/scenarios are supported but later stages require future design work.

```text
C — SCENARIO CONTRACT READY, PROGRESSION DEFERRED
```

Use if scenarios can already be meaningfully defined but stage progression cannot.

```text
D — DESIGN GAP
```

Use only if neither progression nor scenario framing can be grounded in existing state.

Do not select A merely because a complete progression list would be convenient.

The conclusion must follow the measured evidence.

---

# Hard constraints

* NO `src/` modifications.
* NO new gameplay mechanics.
* NO new resources.
* NO new buildings.
* NO balance changes.
* NO progression bonuses.
* NO unlock bonuses.
* NO XP.
* NO technology tree.
* NO achievements system.
* NO new persistence.
* NO migrations.
* NO adjacency.
* NO pollution.
* NO logistics.
* NO transport.
* NO satisfaction/happiness.
* NO arbitrary thresholds presented as causal facts.
* NO implementation of the progression system.
* NO implementation of scenarios.

The purpose of Step 10AK is:

> **Turn the evidence from Steps 10AI–10AJ into the smallest defensible progression/scenario design contract, using only state and causal relationships that already exist in NOVA.**

If a stage cannot currently be justified, leave it explicitly deferred rather than inventing a rule to fill the gap.

---
# STEP 10AK — PROGRESSION & SCENARIO DESIGN CONTRACT AUDIT (report)

Design-contract only. `src/` was NOT modified: every value below is measured from
the real runtime with real placement commands, by
`tests/progressionScenarioContractAudit.test.ts` (18 tests, deterministic;
`--reporter=verbose` prints the `AUDIT …` rows quoted here). Nothing is implemented.

```text
STEP 10AK — PROGRESSION & SCENARIO DESIGN CONTRACT AUDIT

Starting commit: 8605593 ("Step 10AJ: gameplay loop & progression contract audit")
Final commit:    this commit

1  Existing progression signals: 25 metrics inventoried, all existing and deterministic; 11
   persisted / 14 derived; 22 monotonic across the five staged states.
2  Milestone vs score: Water capacity >= 2 changes the state (served Residences 0 -> 2);
   road cells >= 5 changes nothing (population/Food/Material deltas 0).
3  Wilderness -> Settlement: SUPPORTED (population >= 1 AND Food balance AND a road network).
4  Settlement -> Village: SUPPORTED (population >= 2 AND Water capacity >= 2 AND Food balance).
5  Village -> Town: PARTIALLY SUPPORTED (capacity-derived thresholds, quantitative change only).
6  Town -> City: NOT YET CONTRACTABLE.
7  City -> Metropolis: NOT YET CONTRACTABLE.
8  Metropolis -> Autonome: NOT YET CONTRACTABLE.
9  Contract candidates: 2 SUPPORTED, 1 PARTIALLY SUPPORTED, 3 NOT CONTRACTABLE.
10 Arbitrary thresholds: population >= 6, roads >= 5, ticks >= N are ARBITRARY; capacity-derived
   numbers (2 / 4 colonists per staffed Well) are causal.
11 Scenario definition: initial state + existing constraints + objective/framing (no new rules).
12 Scenario archetypes: 6 defined (First Settlement, Water Constraint, Industrial Expansion,
   Spatial Efficiency, Population Expansion, Recovery).
13 Objective forms: survival / milestone / constraint; the only causal duration anchor is the
   measured settling window (105 ticks).
14 Failure conditions: 7 existing failures, all reachable from the scenarios; none invented.
15 Free play vs scenario: only the starting state differs; the catalog and rules are identical.
16 Progression UX contract: 4 of 5 fields computable from existing state; the objective label
   belongs to the scenario layer.
17 Objective readability: 5 questions answerable; only "what am I trying to accomplish" needs
   the scenario layer.
18 Initial-state audit: 4 openings -> O1 viable (2 colonists), O4 viable (1 colonist, no growth),
   O2 collapses at tick 55, O3 collapses at tick 104; the 115-Material archetype is unframed.
19 Content depth: 4-5 significant decisions per archetype, settling tick 105, 3 trajectories
   per starting state.
20 Final design contract: proposed, not implemented (detailed below).
21 Architecture: SAVE_VERSION 7, 7 persisted keys, no new persistent state, deterministic.
22 Verification: 64 files / 1257 tests, typecheck, lint, build, determinism, save/load, 12/12 browser.
23 FINAL DECISION: B — PARTIAL PROGRESSION CONTRACT.
24 Next dependency: implement the partial contract (Settlement/Village + scenarios + UX framing),
   keep Town -> City and beyond explicitly deferred.
```

## 1. Existing progression signals

25 metrics, all available without new simulation (measured across the five staged states
Wilderness / Settlement / Village / Town / City-like):

```text
persisted (11): population, Residence/Farm/Well/Workshop counts, road cells, Food stock,
                Water stock, Material stock, building count
DERIVED  (14): operational buildings, road networks, water-served Residences, staffed
                Farms/Wells/Workshops, unemployed colonists, Food production, Water
                production, Material production, upkeep, stability spread, road extent,
                job capacity
monotonic across stages (22 of 25): everything except unemployed colonists, Material stock
                and the stability spread
```

## 2. Milestone versus score

```text
MILESTONE = a state change that alters what the settlement can do
SCORE     = a number that can grow without changing the simulation
```

Measured test:

| candidate | measurement | verdict |
| --- | --- | --- |
| Water capacity >= 2 | population 2 in both cases, but Water production **0 vs 2** and served Residences **0 vs 2** | **MILESTONE** |
| road cells >= 5 | population delta **0**, Food-net delta **0**, Material-net delta **0** | **SCORE** |
| construction history (buildings placed) | two colonies with the same buildings and different histories have identical state | **SCORE** |

## 3. Wilderness → Settlement

| candidate | measurable | causal | stable | visible | non-arbitrary | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| first infrastructure (any building) | yes | no | no | yes | yes | FAIL |
| first Residence | yes | yes | no | yes | yes | PARTIAL |
| first Road network | yes | yes | no | yes | yes | PARTIAL |
| first population (>= 1) | yes | yes | no | yes | yes | PARTIAL |
| first Food production | yes | yes | yes | yes | yes | **PASS** |
| first sustainable state | yes | yes | yes | yes | yes | **PASS** |

Measured: 1 Residence + 1 Farm survives 600 ticks with population 1 and a **+1 Food/tick** surplus.

```text
SETTLEMENT = population >= 1 AND Food production >= Food consumption AND a Road network exists
status: SUPPORTED
```

## 4. Settlement → Village

| candidate | measurable | causal | stable | visible | non-arbitrary | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| population >= 2 | yes | no | yes | yes | **no** | FAIL |
| two Residences | yes | no | yes | yes | **no** | FAIL |
| Food production >= 2 | yes | yes | yes | yes | no | PARTIAL |
| Water capacity >= 2 | yes | yes | yes | yes | yes | **PASS** |
| population >= 2 AND Water capacity >= 2 | yes | yes | yes | yes | yes | **PASS** |

Measured counter-example to a raw population threshold: two colonies both reach **population 2**,
but only one has a staffed Well — Water production **0 vs 2**, served Residences **0 vs 2**.
The number 2 is only meaningful as the capacity consequence (one staffed Well serves exactly 2).

```text
VILLAGE = population >= 2 AND Water capacity >= 2 AND Food production >= Food consumption
status: SUPPORTED
```

## 5. Village → Town

Measured Village vs Town:

| state | population | staffed Wells | Water production | Food net | road cells | staffed Workshops |
| --- | --- | --- | --- | --- | --- | --- |
| Village | 2 | 1 | 2 | 0 | 3 | 0 |
| Town | 4 | 2 | 4 | 0 | 9 | 0 |

```text
TOWN = population >= 4 AND Water capacity >= 4 AND Food production >= Food consumption
       AND at least 2 staffed Farms
status: PARTIALLY SUPPORTED
```

Justification: the thresholds are **model-produced** (2 colonists per staffed Well; one Farm feeds
two), so they are not arbitrary. Limitation: the change is **quantitative** — the second Well and
Farm exist for scale rather than for the bootstrap, but no new mechanic or qualitative state
appears. Industry cannot be part of the contract: measured, `staffed Workshops = 0` at every scale
because the Workshop worker costs a Farm worker.

## 6. Town → City

```text
TOWN -> CITY = NOT YET CONTRACTABLE
```

Measured Town (population 4, 2 staffed Wells, Water 4, Food net 0) vs City-like (population 6,
3 staffed Wells, Water 6, Food net 0): **identical in kind** — Water per colonist is identical
(1 each), the flow structure is identical, and both sit at the same equilibrium.

What is missing: **a state that a larger colony can express and a Town cannot.** Measured, the
extra capacity is dormant: population equals 2 x staffed Wells, and adding buildings without a
free worker changes population by 0 and Material net by 0.

## 7. City → Metropolis

```text
CITY -> METROPOLIS = NOT YET CONTRACTABLE
```

Same measurement as section 6. A larger population does not make a colony qualitatively different:
there is no second production layer, no local consequence, no new role and no capacity that a Town
lacks. No threshold was invented to fill the gap.

## 8. Metropolis → Autonome

| proxy | measured at Village scale | measured at "industrial" scale (3 colonists, 2 Wells, 1 Farm, 1 Workshop) |
| --- | --- | --- |
| sufficient production | Food net 0 | Food net **-1** |
| sustainable consumption | Water net 0 | Water net +1 |
| prolonged stability | population constant for 600 ticks | — |
| productive capacity | 2 staffed workplaces | **0 staffed Workshops** (the Workshop never wins a worker) |
| independence from an external state | no external state exists in the runtime | same |

```text
METROPOLIS -> AUTONOME = NOT YET CONTRACTABLE
```

Reason: the only autonomy proxy the model has — neutral flows — is already reached at **Village**
scale (2 colonists, 1 Well, 1 Farm: Food 0, Water 0, Material 0). Autonomy therefore has no
runtime referent to scale with, and there is no external state to be independent from.

## 9. Progression contract candidates

| stage | candidate contract | existing data | causal | stable | non-arbitrary | status |
| --- | --- | --- | --- | --- | --- | --- |
| Wilderness → Settlement | population >= 1 AND Food balance AND a road network | yes | yes | yes | yes | **SUPPORTED** |
| Settlement → Village | population >= 2 AND Water capacity >= 2 AND Food balance | yes | yes | yes | yes | **SUPPORTED** |
| Village → Town | population >= 4 AND Water capacity >= 4 AND Food balance AND >= 2 staffed Farms | yes | yes | yes | yes | **PARTIALLY SUPPORTED** |
| Town → City | none identified | no | no | no | no | **NOT CONTRACTABLE** |
| City → Metropolis | none identified | no | no | no | no | **NOT CONTRACTABLE** |
| Metropolis → Autonome | none identified | no | no | no | no | **NOT CONTRACTABLE** |

## 10. Arbitrary-threshold audit

| threshold | causal | classification |
| --- | --- | --- |
| population >= 1 | the first admission | CAUSAL |
| population >= 2 | one staffed Well serves 2 colonists | CAUSAL (capacity consequence) |
| Water capacity >= 2 | the minimum capacity that activates the gate and serves | CAUSAL |
| Water capacity >= 4 | 2 staffed Wells x 2 colonists | CAUSAL (scale) |
| population >= 4 | only as a consequence of Water capacity >= 4 | CAUSAL ONLY VIA CAPACITY |
| staffed Farms >= 1 | one Farm feeds two colonists | CAUSAL |
| Workshop >= 1 | industry requires the Water chain (placement costs 1 Water) | CAUSAL (unreachable in equilibrium) |
| **population >= 6** | no rule produces 6 as a distinct state: it is 3 x 2 | **ARBITRARY THRESHOLD** |
| **roads >= 5** | road cells are a cost; extra cells change nothing (measured) | **ARBITRARY THRESHOLD** |
| **ticks >= N** | no rule produces a duration | **ARBITRARY** unless anchored to the measured settling window |

## 11. Scenario definition

```text
SCENARIO = initial state + existing constraints + objective/framing
(never new mechanics)
```

Available state dimensions (10, all existing): starting Material / Food / Water, initial buildings,
initial roads, initial colonists, initial workforce assignments, initial network topology,
available build space, existing production capacity.

Same-rules probe: three starts differing **only** in `resources.construction` (25 / 100 / 1000)
produce identical simulation behaviour (Food production identical); the scenario is a starting
state, not a rule change. The building catalog is untouched
(`Workshop = 25 Material + 1 Water`).

## 12. Scenario archetypes

| scenario | initial state (minimal) | central decision | systems | limiting variable | success | failure | why different |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A First Settlement** | 100 Material, 100 Food, nothing built | which archetype to fund | construction, housing, Food, Water, roads | Material (115 needed for a full settlement) | population >= 1 with Food balance | Food collapse before a Farm is staffed | every rule must be bootstrapped |
| **B Water Constraint** | Water 0, a Well site prepared | Water capacity before Food, or the reverse | Water, admission, workforce, Food | Water capacity (2 per staffed Well) | Water capacity >= population and Food balance | measured: Water ceiling at tick 6, Food collapse at tick 55 | the Water gate binds from tick 1 |
| **C Industrial Expansion** | Material 100, a Well plan | when to spend 25 Material + 1 Water on a Workshop | Workshop, Material, workforce, construction | the workforce (1 job per colonist) | a staffed Workshop without losing Food balance | measured: industry at tick 9, Food collapse at tick 104 | the tension is the workforce, not the cost |
| **D Spatial Efficiency** | a low Material budget and a fixed building goal | how many road cells for the same buildings | roads, network, mobility, coverage | 5 Material per road cell | the buildings connected at minimum road cost | none: overspending only delays construction | the target is the layout |
| **E Population Expansion** | several Residences planned, Food/Water unbuilt | grow before or after capacity | housing, admission, Food, Water | 1 Food and 1 Water per colonist per tick | growth matched by capacity | measured: 3 colonists against 1 Farm wipes in 1 tick | housing is intentionally ahead of capacity |
| **F Recovery** | a partly built settlement with one broken constraint | which rule to repair first | roads, mobility, production, Food | 5 Material per connector cell | the constraint is repaired without a reset | Food collapse before the repair completes | the opening state is suboptimal by construction |

## 13. Scenario objectives

| form | shape | compatible scenarios | anchor | arbitrary risk |
| --- | --- | --- | --- | --- |
| Survival | maintain a stable settlement for N ticks | A, B, C, E | measured settling tick **105** (population constant for 100+ ticks with neutral flows) | N is arbitrary unless tied to that measured window |
| Milestone | reach an existing measurable state | all six | the stage contracts (capacity-based) | none when the contract uses capacity rather than counts |
| Constraint | reach a measurable state while respecting an existing constraint | B, D, E, F | existing constraints: Water capacity, workforce, Material budget, network membership | none: the constraint is already enforced by the simulation |

## 14. Failure conditions

| failure | causal (existing rule) | reachable in |
| --- | --- | --- |
| Food collapse | colony-wide all-or-nothing consumption | A, B, C, E, F |
| Water shortage (growth blocked) | admission gate reads production capacity | A, B, E |
| inability to staff production | 1 job per colonist | C, E |
| inaccessible production | 09E/09K mobility gate | D, F |
| resource exhaustion (Material 0, no income) | construction + upkeep only sinks | C, D |
| construction deadlock (no Material and no Water) | placement transaction | C, D |
| inability to expand (Water capacity ceiling) | 2 colonists per staffed Well | A, B, E |

No new failure condition is introduced: every entry is a rule the simulation already enforces.

## 15. Free play versus scenario

Measured: a free-play state and an empty scenario state differ **only** by the initial
buildings/roads; after 100 ticks the free-play state produces 2 Food/tick while the empty start
produces nothing until the player acts. The building catalog and every rule are unchanged, so
`starting state + constraints + framing` is sufficient to define a scenario.

## 16. Progression UX contract

| field | computable from existing state | measured value on a probe state |
| --- | --- | --- |
| current stage | yes | Village (population 2, Water capacity 2) |
| next milestone | yes | Town: Water capacity >= 4 (2 staffed Wells) |
| progress toward it | yes | 1 / 2 staffed Wells |
| current blocking condition | yes | "Water capacity does not cover the population plus one admission", "no vacant workplace: industry needs an extra colonist", "Material 10 is below the 25 building cost" |
| primary objective | **no** (scenario layer) | requires the scenario/objective definition |

4 of 5 fields are computable from existing queries; the objective label belongs to the scenario
layer. No pseudo-progress bar is proposed for an arbitrary metric.

## 17. Objective readability

| question | answered from | measured answer on the probe state |
| --- | --- | --- |
| Where am I? | population + building counts | population 2, 2 buildings, Village |
| What am I trying to accomplish? | scenario layer | (scenario objective) |
| Why am I blocked? | Water production vs need + resource stock | Water capacity 2 vs population 2 (no headroom); Material 10 < 25 |
| Which decision unblocks it? | build options + manual reassignment | build a Well (25 Material) after saving |
| What have I accomplished? | the stage contract | Settlement reached; Village in progress |

Only question 2 needs information the simulation does not have.

## 18. Initial-state audit

| opening | viable | wipe tick | final population | final Material | reason |
| --- | --- | --- | --- | --- | --- |
| O1 housing + Food first | **yes** | — | 2 | 15 | stable two-colonist settlement |
| O2 Water capacity first | no | 55 | 0 | 15 | Food collapse: the only worker did not staff a Farm |
| O3 industry first | no | 104 | 0 | 24 | Food collapse: the only worker did not staff a Farm |
| O4 one colonist + two Farms | **yes** | — | 1 | 10 | stable single-colonist settlement, no growth |

Budget finding: `2 Residences + Well + Farm + roads = 115 Material` against a 100 start. Two of
four plausible openings are viable, and the only opening that reaches a stable two-colonist
settlement is O1. The game explains none of this today — that is the framing gap.

## 19. Content depth

| archetype | significant decisions | constructions accepted/skipped | constraints encountered | settling tick | final state |
| --- | --- | --- | --- | --- | --- |
| A First Settlement | 4 | 4 / 0 | 3 | **105** | population 2, Food net 0, Water net 0 |
| D Spatial Efficiency | 4 | 4 / 0 | 2 | **105** | population 1, Food net +1 |
| C Industrial Expansion | 5 | 4 / 1 | 2 | **105** | population 1, Food net +1 |

Each archetype contains 4-5 significant decisions, 3 distinct trajectories from the same start,
and converges around tick 105. The scenario is short (a dozen constructions); the depth comes from
the decision space, not from the number of buildings.

## 20. Final design contract (proposed, NOT implemented)

**A. Progression**

```text
Wilderness -> Settlement : SUPPORTED
Settlement -> Village    : SUPPORTED
Village    -> Town       : PARTIALLY SUPPORTED
Town       -> City       : NOT CONTRACTABLE
City       -> Metropolis : NOT CONTRACTABLE
Metropolis -> Autonome   : NOT CONTRACTABLE
```

**B. Scenario system**

```text
SCENARIO = initial state + existing constraints + objective/framing
```

**C. Objective types** (only those the model naturally supports): survival (anchored to the
measured settling window), milestone (a stage contract in capacity terms), constraint (an existing
constraint respected).

**D. Stage information**: current stage, next milestone, progress, current blocking condition,
and the scenario objective label.

**E. Deferred**: `Town -> City`, `City -> Metropolis`, `Metropolis -> Autonome`, and any
progression that would need a new state field, a new resource or a multiplier.

## 21. Architecture

`src/` unchanged; `SAVE_VERSION` stays 7; exactly 7 persisted top-level keys (`buildings`,
`colonists`, `config`, `counters`, `resources`, `roads`, `time`); **no new persistent state is
required** by the contract (every stage condition is computed from derived queries and the
canonical state); no migration; the same canonical hash for two identical 200-tick runs;
insertion-order invariance preserved; `stage`, `milestone`, `progress`, `objective` and `score`
are all absent from the canonical payload.

## 22. Verification

```text
Vitest:        64 files / 1257 tests passed (before 63 / 1239; audit tests added 18)
Typecheck:     passed
Lint:          passed
Build:         passed
Determinism:   tests/determinism.test.ts passed
Save/load:     tests/persistence.test.ts passed
Browser/UI:    12 / 12 suites pass (run, production, temporal, water, food, resource,
               reassign, crew, road, transport, jobs, upkeep)
```

## 23. Final decision

```text
B — PARTIAL PROGRESSION CONTRACT
```

* **A is excluded**: the later transitions are not contractable and the step forbids selecting A
  for convenience;
* **C is excluded**: early progression IS contractable (2 SUPPORTED + 1 PARTIALLY SUPPORTED), so
  progression is not wholly deferred;
* **D is excluded**: both a partial progression contract and a full scenario contract are grounded
  in existing state and measured evidence.

## 24. Next dependency

A design/implementation step for the **partial contract only**: the Settlement and Village stage
contracts, the scenario layer (6 archetypes, initial state + constraints + objective), and the UX
framing of the stage/blocking information. `Town -> City` and beyond stay explicitly deferred
until the simulation can express a state that a larger colony has and a Town does not — which is
not a threshold problem but a design question the current model cannot answer.

