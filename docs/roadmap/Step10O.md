# Step 10O — Next Dependency Design Intake

## Mission

NOVA vient de clôturer les audits 10K → 10N.

Le système dispose maintenant de :

```text
Housing
→ Population
→ Food Need
→ Food Production
→ Food Consumption
→ Shortage
→ Population Consequence

Workforce
→ Automatic Assignment
→ Mobility Eligibility
→ Distance Preference
→ Manual Reassignment

Material
→ Workshop Production
→ Workshop Upkeep
→ Storage Capacity
→ Construction Spending

Transport
→ Roads
→ Road Networks
→ Building Access
→ Workforce Mobility
```

Step 10N conclut que :

* manual workforce reassignment est fondamental ;
* les dead-ends de workforce identifiés en 10K/10L sont récupérables ;
* Food ↔ Material constitue déjà une vraie décision ;
* Phase 3 — Needs est suffisamment complète pour avancer ;
* aucune nouvelle règle d'upkeep ou de workforce n'est actuellement justifiée.

Ce step est donc un **design intake**.

Il ne doit pas implémenter une nouvelle mécanique.

---

# HARD RULE

## Aucun changement de `src/`

Ce step doit être :

```text
AUDIT
→ INVENTAIRE
→ OPTIONS
→ COMPARAISON
→ DESIGN DECISION
```

Pas d'implémentation.

Ne pas ajouter :

* nouveau Need ;
* nouveau bâtiment ;
* nouveau service ;
* nouveau coût ;
* nouveau coefficient ;
* nouveau resource sink ;
* nouveau système de transport ;
* nouveau système de workforce ;
* nouveau système monétaire ;
* nouveau système de bonheur ;
* nouveau système de santé ;
* nouveau système générique de Needs.

Les seules modifications attendues sont :

```text
tests/...
docs/roadmap/Step10O.md
```

et uniquement si nécessaires à l'analyse.

---

# 1. RECONSTRUIRE LE MODÈLE ACTUEL

Avant de proposer quoi que ce soit, reconstruire explicitement le graphe causal actuel.

Produire un graphe textuel de ce type :

```text
Residence
    ↓
Population
    ↓
Food Need
    ↓
Food Consumption
    ↓
Shortage
    ↓
Population Consequence

Population
    ↓
Workforce
    ↓
Farm / Workshop
    ↓
Food / Material
```

Ajouter :

```text
Road
    ↓
Network
    ↓
Building Access
    ↓
Mobility Eligibility
    ↓
Workplace Eligibility
```

Et :

```text
Material
    ↓
Construction
    ↓
Buildings
    ↓
Housing / Workforce Capacity
```

Identifier précisément les boucles existantes.

---

# 2. IDENTIFIER LES CONTRAINTES DÉJÀ RÉELLES

Lister les contraintes qui produisent actuellement des décisions.

Au minimum :

### Spatial

* emplacement des Residences ;
* emplacement des Farms ;
* emplacement des Workshops ;
* longueur des routes ;
* connectivité ;
* accès routier ;
* distance résidence → workplace ;
* réseau partagé résidence/workplace.

### Workforce

* nombre de colonistes ;
* capacité des bâtiments ;
* compétition Farm/Workshop ;
* choix automatique ;
* override manuel.

### Food

* population ;
* production Farm ;
* consommation ;
* shortage ;
* admission/population.

### Material

* production Workshop ;
* upkeep Workshop ;
* stockage ;
* coût de construction ;
* timing de construction.

### Housing

* capacité résidentielle ;
* ordre de construction ;
* disponibilité des travailleurs.

Pour chaque contrainte, préciser :

```text
REAL DECISION
ou
INFORMATIONAL
ou
TEMPORARY PRESSURE
ou
TERMINAL PRESSURE
```

---

# 3. IDENTIFIER CE QUI MANQUE

Chercher les causalités importantes qui n'existent pas encore.

Ne pas chercher simplement "une fonctionnalité cool".

Chercher :

> Quelle contrainte naturelle devrait logiquement apparaître ensuite à partir du système actuel ?

Exemples de directions possibles, à examiner mais sans les présélectionner :

```text
Food quality / autre besoin
Water
Energy
Education
Health
Shelter quality
Storage / logistics
Population demand
Service coverage
Production input
```

Pour chaque possibilité, déterminer si elle crée réellement :

```text
production
→ availability
→ consumption
→ consequence
```

ou si elle ajoute seulement :

```text
resource
→ UI number
```

Les systèmes de simple comptabilité doivent être rejetés.

---

# 4. CANDIDATS

Identifier **3 à 5 candidats maximum** pour la prochaine dépendance.

Pour chaque candidat, fournir :

| Critère                                            | Analyse              |
| -------------------------------------------------- | -------------------- |
| Nouvelle ressource ?                               | oui/non              |
| Nouveau bâtiment nécessaire ?                      | oui/non              |
| Nouvelle production ?                              | oui/non              |
| Nouvelle consommation ?                            | oui/non              |
| Nouvelle conséquence ?                             | oui/non              |
| Interaction Food ?                                 | oui/non              |
| Interaction Material ?                             | oui/non              |
| Interaction Workforce ?                            | oui/non              |
| Interaction Housing ?                              | oui/non              |
| Interaction Roads ?                                | oui/non              |
| Pression spatiale ?                                | faible/moyenne/forte |
| Pression économique ?                              | faible/moyenne/forte |
| Pression workforce ?                               | faible/moyenne/forte |
| Risque de sur-complexification                     | faible/moyen/fort    |
| Peut être implémenté comme petite chaîne causale ? | oui/non              |

Ne pas faire de classement global.

L'objectif est de comparer les propriétés, pas de déclarer arbitrairement un "meilleur" candidat.

---

# 5. TESTER LES CANDIDATS CONTRE LA PHILOSOPHIE NOVA

Chaque candidat doit répondre aux questions suivantes.

### Causalité

Peut-on expliquer sa présence par une chaîne causale existante ?

### Spatialité

Son emplacement change-t-il réellement quelque chose ?

### Agency

Le joueur prend-il une décision différente selon la situation ?

### Interaction

Le système interagit-il avec plusieurs systèmes existants ?

### Recoverability

Une mauvaise décision est-elle récupérable ?

### Determinism

Peut-il rester entièrement déterministe ?

### Observability

Le joueur peut-il comprendre pourquoi le système produit le résultat observé ?

### Scope

Peut-il être introduit en une petite étape cohérente ?

---

# 6. TESTER L'ORDRE DE LA ROADMAP

Comparer les candidats avec :

```text
Phase 4 — First production flow
producer
→ output
→ availability/storage
→ household consumption
→ shortage consequence
```

et :

```text
Phase 5 — Additional essential service
```

et :

```text
Phase 6 — Work
```

Important :

Le système de Work existe déjà partiellement dans NOVA.

Ne pas supposer que la roadmap historique doit être suivie littéralement.

Déterminer quelle phase logique correspond maintenant réellement au système.

---

# 7. ÉVITER LES MAUVAISES DIRECTIONS

Identifier explicitement les propositions qui semblent séduisantes mais qui doivent rester différées.

Exemples possibles :

```text
Money
Vehicles
Traffic
Travel time
Congestion
Advanced transit
Technology tree
Global happiness
Generic needs framework
Generic service framework
Large population simulation
```

Pour chacune, donner une raison technique/game-design courte.

Le principe est :

> Si le système n'a pas encore de causalité suffisante pour justifier une mécanique, elle reste différée.

---

# 8. RECHERCHER LE PLUS PETIT NOUVEAU LOOP

Le prochain système doit idéalement ressembler à :

```text
existing condition
        ↓
new producer/service
        ↓
new output
        ↓
availability
        ↓
consumption / coverage
        ↓
consequence
```

Mais il ne faut pas créer un framework générique.

Chercher un **cas concret complet**.

Le système doit pouvoir être testé avec quelques bâtiments et quelques colonistes.

---

# 9. TESTER LA SPATIALITÉ

Pour chaque candidat viable, construire mentalement ou avec tests temporaires :

```text
Scenario A — colocated
Scenario B — separated
Scenario C — connected
Scenario D — disconnected
Scenario E — competing locations
```

Déterminer si la géométrie change réellement le résultat.

Si :

```text
same number of buildings
+
same workforce
+
same resources
+
different geometry
=
same simulation
```

alors le candidat n'apporte probablement pas suffisamment de pression spatiale.

Ne pas introduire artificiellement une règle de distance uniquement pour rendre le système spatial.

---

# 10. TESTER L'INTERACTION AVEC LE WORKFORCE

Chaque candidat doit répondre à :

```text
Qui travaille ici ?
```

Puis :

```text
Que se passe-t-il lorsqu'un coloniste quitte une Farm ou un Workshop ?
```

Tester conceptuellement :

```text
Farm ↔ Candidate Service
Workshop ↔ Candidate Service
```

Déterminer si le nouveau système crée une vraie opportunité de réallocation des travailleurs.

Ne pas ajouter de priorité automatique.

Le système actuel :

```text
automatic assignment
+
manual override
```

reste la base.

---

# 11. TESTER L'INTERACTION AVEC MATERIAL

Demander :

```text
Comment ce nouveau système est-il construit ?
```

Si la réponse est :

```text
Material → construction
```

cela est acceptable.

Mais il faut déterminer si le nouveau bâtiment :

* consomme uniquement du Material à la construction ;
* consomme ensuite une ressource ;
* produit quelque chose ;
* nécessite des travailleurs ;
* possède une capacité.

Ne pas ajouter d'upkeep automatiquement.

L'expérience 10G–10J a précisément montré que l'ajout d'un coût d'exploitation n'est pas automatiquement nécessaire.

---

# 12. TESTER L'INTERACTION AVEC FOOD

Déterminer si le candidat :

* influence Food ;
* concurrence les Farms pour les travailleurs ;
* influence population ;
* ou reste complètement indépendant.

Un candidat indépendant de Food n'est pas automatiquement mauvais.

Mais il faut expliquer pourquoi il constitue la prochaine dépendance causale.

---

# 13. TESTER LA RÉCUPÉRATION

Pour chaque candidat, imaginer :

```text
player makes wrong placement
player assigns wrong workforce
player builds wrong building first
player connects wrong network
```

Puis demander :

> Existe-t-il une action déjà disponible permettant de récupérer ?

Les états irréversibles doivent être signalés.

Ne pas créer automatiquement :

* demolition ;
* refunds ;
* reset ;
* dynamic reallocation.

Ce sont de futures décisions séparées.

---

# 14. ARCHITECTURE

Vérifier que le candidat peut être implémenté sans créer :

```text
GenericNeed
GenericService
GenericProductionSystem
GenericBuildingSystem
GenericResourceFramework
```

sauf preuve forte qu'une abstraction est maintenant nécessaire.

NOVA doit continuer à privilégier :

```text
concrete domain rule
→ concrete query
→ concrete simulation phase
→ concrete tests
```

plutôt qu'une architecture générique anticipée.

---

# 15. DESIGN DECISION

À la fin de l'analyse, sélectionner **une direction de travail** pour le prochain step.

La décision doit être formulée ainsi :

```text
Next dependency:

<name>

Why now:

<causal reason>

Existing systems it connects:

- ...
- ...
- ...

New causal chain:

A
→ B
→ C
→ D

Player decision:

...

Spatial consequence:

...

Workforce consequence:

...

Resource consequence:

...

Recovery:

...

Deferred:

...
```

Il ne faut pas implémenter cette direction dans 10O.

---

# 16. DÉFINIR LE FUTUR STEP 10P

Préparer le contrat du prochain step sans l'implémenter.

Il doit contenir :

```text
Step 10P — <concrete system>

Goal:
...

Canonical state:
...

Simulation rule:
...

Phase position:
...

Construction:
...

Workforce:
...

Resource flow:
...

Player agency:
...

Spatial behavior:
...

Persistence:
...

Determinism:
...

Out of scope:
...
```

Le contrat doit rester suffisamment petit pour qu'un seul step puisse l'implémenter puis l'auditer.

---

# 17. VERIFICATION

Même s'il n'y a pas de code de production, exécuter au minimum :

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis les E2E existants si nécessaire pour confirmer que l'état de départ reste sain.

Ne modifier aucun test existant uniquement pour faire passer la suite.

---

# 18. DOCUMENTATION

Créer :

```text
docs/roadmap/Step10O.md
```

Préserver ce prompt.

Ajouter ensuite une section :

```text
## As-Built / Design Intake
```

avec :

* état actuel ;
* graphe causal ;
* contraintes ;
* candidats ;
* comparaison ;
* candidats rejetés ;
* décision ;
* contrat Step 10P ;
* éléments explicitement différés.

---

# 19. FINAL REPORT

Terminer exactement avec :

```text
Step 10O COMPLETE — DESIGN INTAKE

Repository

Starting commit:
Final commit:

Production code changed:
Tests changed:
Docs changed:

Current causal model

...

Existing real pressures

...

Missing causal dependencies

...

Candidate A

...

Candidate B

...

Candidate C

...

Rejected directions

...

Design decision

...

Next dependency

...

Step 10P contract

...

Deferred

...

Verification

...

Scope verdict

COMPLETE — DESIGN INTAKE
```

## Important

Ne pas produire un classement du type :

```text
1. Best
2. Second best
3. Third best
```

Présenter les candidats factuellement et expliquer les conséquences de chacun.

Le but de 10O est de choisir une **dépendance causale justifiée par le modèle actuel**, pas une feature simplement parce qu'elle semble intéressante.

Final confirmations:

```text
- no src/ changes
- no new economic rule
- no new generic framework
- no Farm upkeep
- no new workforce priority
- no new transport simulation
- no premature money system
- existing SAVE_VERSION remains 5
- existing deterministic model remains intact
- Step 10P is defined but not implemented
```



---

# As-Built / Design Intake

**Type: DESIGN INTAKE (Step 10O).** No gameplay was implemented and `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/nextDependencyDesignIntake.test.ts` (10 tests); run it with

```text
npx vitest run tests/nextDependencyDesignIntake.test.ts --reporter=verbose
```

## Current state

`AUDIT CURRENT_SURFACE`: resources = `[construction, food]`; building types =
`[farm, residence, workshop]`. `AUDIT HOUSEHOLD_FLOWS`: exactly one household
need (Food, `1/colonist/tick`), one consequence (colony-wide starvation), no
second service, no production input, no storage stage.

## Causal graph

```text
Residence
  -> Population (admission while Food > 0 and housing free)
  -> Food Need (population x 1)
  -> Food Consumption (all-or-nothing)
  -> Shortage
  -> colony-wide population loss

Population
  -> Workforce
  -> Farm | Workshop (automatic assignment + manual override)
  -> Food | Material

Road -> Network -> Building Access -> Mobility Eligibility -> Workplace Eligibility

Material -> Construction -> Buildings -> Housing / Workplace capacity

Workshop -> Material gross -> storage clamp (25/Workshop) -> construction spending
Farm     -> Food  gross     -> (NO STORAGE STAGE)             -> consumption
```

Existing loops:

```text
Food loop      : Farm -> Food -> population -> workers -> Farm
Material loop  : Workshop -> Material -> construction -> Workshops -> capacity
Workforce loop : population -> workers -> Farm/Workshop -> Food/Material
Spatial loop   : roads -> access -> mobility -> staffing -> production
```

## Constraints already producing decisions (measured)

| Constraint | Class |
| --- | --- |
| Residence / Farm / Workshop placement, road length, connectivity, access, residence->workplace distance | **REAL DECISION** (09M flips the employer; roadless workplaces stay unstaffed) |
| Workforce allocation, Farm/Workshop competition, manual override | **REAL DECISION** (`AUDIT WORKFORCE_PRESSURE`: 2F/0W automatic <-> 1F/1W manual) |
| Food population/production/consumption/shortage | **REAL DECISION** while `2 x Farms < population`, then **TEMPORARY PRESSURE** |
| Material production/upkeep/storage/construction timing | **REAL DECISION** up to `24 x W` (`AUDIT MATERIAL_PRESSURE`: 24/48/72), then no sink |
| Housing capacity / construction order | **REAL DECISION** (housing gates the workforce) |

## Missing causal dependencies (measured)

`AUDIT MISSING` and `AUDIT FOOD_UNCAPPED` (100 -> 580 over 240 ticks):

1. **No availability/storage stage for Food.** Roadmap Phase 4 is
   `producer -> output -> availability/storage -> household consumption ->
   shortage consequence`; the storage stage is absent, so Food is an unbounded
   accumulator once `2 x Farms >= population`.
2. **No second household consumption flow.** Only Food is consumed.
3. **No production input.** A Farm needs only a worker.
4. **No service coverage.** Availability is colony-global; no service is
   delivered per residence/network.
5. **No ongoing Material sink.** Material stops mattering at `24 x W`.

## Candidates

### Candidate A — Water: additional essential service with residence-network coverage

New resource `water`; new building `well` (25 Material, 2 ticks, capacity 1,
road-access-gated staffing like a Farm/Workshop); a Well produces Water while
operational + staffed; Water is consumed per colonist; **coverage** = a
Residence is served only while mobility-connected to an operational staffed
Well; Water shortage gates new population admission (growth), while Food
shortage keeps the existing survival consequence.

| Criterion | Analysis |
| --- | --- |
| New resource | yes (water) |
| New building | yes (well) |
| New production | yes (Well) |
| New consumption | yes (per colonist) |
| New consequence | yes (admission gating, distinct from starvation) |
| Food interaction | yes (population/workforce, indirect) |
| Material interaction | yes (Well construction) |
| Workforce interaction | yes (Well competes with Farm/Workshop; manual override applies) |
| Housing interaction | yes (served Residences; admission) |
| Roads interaction | yes (network coverage) |
| Spatial pressure | **forte** (geometry changes who is served) |
| Economic pressure | moyenne |
| Workforce pressure | forte |
| Over-complexity risk | moyen |
| Small causal chain? | yes |

### Candidate B — Food availability/storage (Granary)

New building `granary` (25 Material, 2 ticks); Food storage capacity =
`BASE + operational Granaries x N`, with production clamped like Material
(08F) and overflow discarded.

| Criterion | Analysis |
| --- | --- |
| New resource | no |
| New building | yes |
| New production | no |
| New consumption | no (same Food) |
| New consequence | no (same starvation) |
| Food interaction | yes (direct) |
| Material interaction | yes |
| Workforce interaction | no (infrastructure, like Material storage) |
| Housing interaction | indirect |
| Roads interaction | no |
| Spatial pressure | **faible** |
| Economic pressure | moyenne (capacity vs supply) |
| Workforce pressure | faible |
| Over-complexity risk | faible |
| Small causal chain? | yes |

### Candidate C — Farm production input (Water/tools)

A Farm consumes a produced input per tick to yield Food; without it the Farm
yields 0.

| Criterion | Analysis |
| --- | --- |
| New resource | yes |
| New building | yes (input producer) |
| New production | yes |
| New consumption | yes (by Farms, not households) |
| New consequence | yes (Food output stops) |
| Food interaction | yes (direct, two-stage) |
| Material interaction | yes |
| Workforce interaction | yes |
| Housing interaction | indirect |
| Roads interaction | yes (workforce/access) |
| Spatial pressure | moyenne (workforce/roads only unless coverage added) |
| Economic pressure | forte |
| Workforce pressure | forte |
| Over-complexity risk | moyen |
| Small causal chain? | yes |

## Comparison

All three are deterministic, observable, recoverable and implementable as a
concrete chain without a generic framework. They differ in **what new causal
dimension** they add:

* A adds a **spatial consumption/coverage** dimension and a distinct
  consequence (growth vs survival) — the strongest new decision and the only
  one that makes geometry change *consumption*.
* B adds a **capacity** dimension to Food, mirroring Material storage — the
  smallest change and the most roadmap-literal completion of Phase 4, but it
  adds neither workforce nor spatial pressure.
* C adds a **multi-resource production chain** — strong economic/workforce
  pressure, but it changes the Farm's established production contract and its
  spatial pressure is not new unless coverage is added.

No overall ranking is produced; the properties differ rather than dominate.

## Rejected directions

| Direction | Reason |
| --- | --- |
| Road-gated Food distribution | Explicitly rejected by the user in Step 10A-1; do not reintroduce |
| Money / wages / prices | No causal income/expenditure chain exists yet; roadmap Phase 7 |
| Vehicles, traffic, congestion, travel time, transit | No causal need for movement cost; 09M distance is a preference, not a cost |
| Technology tree / research | No dependency graph to unlock; premature |
| Global happiness / generic Needs framework | No second consequence mechanism to differentiate; violates the concrete-domain rule |
| Generic Service/Production/Building framework | No evidence an abstraction is needed; four concrete buildings do not justify it |
| Large population simulation / demographics | Population is housing-gated and instant; no scale to simulate |
| Farm upkeep / new resource sink by default | 10G-10J closed this: unnecessary, and it created pathological or weak-pressure rules |
| Health / education / energy | Need scale (population, devices) NOVA does not have; defer |

## Design decision

```text
Next dependency:

Water — a second essential service delivered per road network by staffed Wells.

Why now:

Phase 3 (Needs) and the workforce control are complete and stable (10N).
The current model has exactly one household consumption flow and its
availability is colony-global, so geometry never changes consumption. Water is
the smallest new service that adds a genuinely new causal dimension — spatial
coverage of consumption — while reusing the existing road/network, staffing,
capacity, Material and population machinery. Food storage (Candidate B) is
smaller but adds only a capacity number; a Farm input (Candidate C) changes an
established production contract. Water completes the missing "availability"
half of Phase 4/5 with a spatial rule.

Existing systems it connects:

- Housing / Population (served residences, admission)
- Workforce (Well worker; automatic assignment + manual override)
- Material (Well construction; no new upkeep)
- Roads / Networks / Mobility (coverage)
- Food (population and workforce competition, indirect)

New causal chain:

Well (staffed, operational, road-connected)
  -> Water production
  -> Water availability per residence network (coverage)
  -> household consumption per served colonist
  -> shortage consequence (growth gate; Food keeps the survival gate)

Player decision:

Build a Well (Water capacity/growth) vs a Farm (Food/survival) vs a Workshop
(Material), and place/connect it so the intended Residences are covered.

Spatial consequence:

Residences on a network without an operational staffed Well are unserved; moving
the Well or connecting networks changes who is served. Geometry changes the
simulation result, using only the existing 09K connectivity rule.

Workforce consequence:

A Well is a third workplace competing for the same single-worker capacity;
manual reassignment (10M) applies unchanged.

Resource consequence:

New canonical `water` stock; Wells produce, colonists consume; no upkeep, no
new coefficient on Food, no change to Workshop/Material rules.

Recovery:

Build/connect a Well and staff it (automatic or manual override); a wrong
placement is recoverable because coverage follows the road network, which the
player already controls.

Deferred:

Food storage/Granary (Candidate B) and Farm production input (Candidate C) are
kept as future dependencies; they become relevant once Water has proven the
coverage pattern (B) or once the Food flow needs a second stage (C).
```

## Step 10P contract

```text
Step 10P — Water Service (coverage)

Goal:
  Introduce one additional essential service with spatial coverage, without any
  generic framework and without a second upkeep rule.

Canonical state:
  - new resource `water` in ResourceStock (integer, >= 0);
  - new building type `well` in BUILDING_CATALOG (25 Material, 2 ticks,
    housingCapacity 0);
  - coverage is DERIVED (residence <-> operational staffed Well connectivity),
    never stored.

Simulation rule:
  - a Well is a workplace (capacity 1, road-access-gated staffing like a Farm);
  - staffed operational Wells produce +2 Water/tick into the shared stock;
  - a Residence is "served" while mobility-connected to an operational staffed
    Well (existing 09K predicate);
  - Water is consumed per SERVED colonist per tick, all-or-nothing;
  - an unserved Residence cannot admit new colonists (growth gate), while Food
    keeps the existing survival gate.

Phase position:
  - `produceFood` phase family: a new `produceWater` before `consumeFood`;
  - `assignJobs` treats a Well as a workplace (one merged pool, no priority);
  - no phase reorder.

Construction:
  - `placeBuilding` with type `well`; existing 2-tick lifecycle; no road cost
    change; cost 25 Material.

Workforce:
  - Well capacity 1, type-blind automatic assignment, manual override applies;
    no new priority.

Resource flow:
  Well -> water stock -> served consumption -> admission gate.

Player agency:
  Water vs Food vs Material allocation; Well placement and network coverage.

Spatial behavior:
  coverage via existing road networks; no radius, no travel time, no pathfinding.

Persistence:
  new resource field => SAVE_VERSION bump to 6 with a deterministic v5 -> v6
  migration (water = 0); building type strings already canonical.

Determinism:
  derived coverage, sorted iteration, integer arithmetic; no randomness.

Out of scope:
  no new need framework, no upkeep, no road-gated Food distribution, no money,
  no demolition/refunds, no travel simulation, no generic service abstraction.
```

## Explicitly deferred

Food storage/Granary, Farm production input, Material ongoing sink, money
(Phase 7), health/education/energy, vehicles/traffic/congestion, technology
tree, generic frameworks, demolition/refunds, dynamic reallocation, large
population simulation.

## Verification

* `src/` untouched (`git diff --stat -- src/` empty).
* `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` succeeds.
* `npx vitest run` → **41 files, 819 tests passed** (10 new intake-evidence
  tests; no existing test weakened).
* E2E (headless): `run` 11, `road` 15, `transport` 10, `production` 12,
  `resource` 12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35,
  `reassign` 7 — all pass.
* `SAVE_VERSION = 5` unchanged; deterministic replay; no `Date.now()` /
  `Math.random()` in `src/`.

Final confirmations:

```text
- no src/ changes
- no new economic rule
- no new generic framework
- no Farm upkeep
- no new workforce priority
- no new transport simulation
- no premature money system
- existing SAVE_VERSION remains 5
- existing deterministic model remains intact
- Step 10P is defined but not implemented
```
