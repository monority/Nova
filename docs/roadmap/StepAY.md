# STEP 10AY — WATER COVERAGE & SERVICE CONSISTENCY AUDIT + CLOSURE

## CONTEXTE

HEAD attendu :

```text
2875afc — Step 10AX: Next Causal Capability Discovery
```

10AX est fermé avec :

* aucune nouvelle capacité causale justifiée ;
* aucun nouveau système ;
* aucun nouveau seuil Town ;
* SAVE_VERSION 7 ;
* économie 2/2 inchangée.

10AX a toutefois confirmé une incohérence précise :

> Un Well opérationnel mais vacant peut actuellement accorder Water coverage à une Residence alors qu'il ne produit aucun Water.

Cela crée potentiellement une divergence entre :

```text
Water service
```

et :

```text
Water production capacity
```

Le but de 10AY est de déterminer si cette divergence est :

* une règle intentionnelle ;
* une conséquence acceptable du modèle ;
* ou une incohérence réelle à corriger.

Cette étape doit rester **petite et ciblée**. Ne pas rouvrir les audits généraux Water déjà fermés.

---

# OBJECTIF

Établir un contrat unique et explicite entre :

* Well opérationnel ;
* Well road-accessible ;
* Well staffed ;
* Water capacity ;
* Water balance ;
* Water reserve ;
* Residence service ;
* admission ;
* progression Village ;
* scénarios.

Puis décider :

```text
A — cohérent, aucun changement
B — incohérence réelle, correction minimale justifiée
C — ambiguïté de design nécessitant une décision produit
```

---

# 1. RECONSTRUIRE LE CONTRAT ACTUEL

Tracer précisément le pipeline réel dans le code :

```text
Well
 ↓
operational ?
 ↓
road-accessible ?
 ↓
staffed ?
 ↓
Water production capacity
 ↓
Water balance
 ↓
network coverage
 ↓
Residence served?
 ↓
admission / progression / UI
```

Identifier pour chaque étape :

* le query utilisé ;
* la condition exacte ;
* si `staffed` est nécessaire ;
* si `operational` est nécessaire ;
* si le réseau est nécessaire.

Ne rien modifier à ce stade.

---

# 2. DISTINGUER LES TROIS CONCEPTS

Produire explicitement trois définitions :

### Water capacity

Combien de Water peut produire la colonie par tick ?

### Water service

Quelle Residence est considérée comme desservie ?

### Water reserve

Combien de Water est actuellement disponible ?

Vérifier qu'aucun booléen ne mélange ces trois notions.

Le résultat doit permettre de dire clairement :

```text
capacity ≠ service ≠ reserve
```

si c'est bien le modèle voulu.

---

# 3. CONTROLLED MATRIX

Construire une matrice minimale avec un seul Well et une Residence.

Tester :

| Well | Operational | Road-accessible | Staffed | Water reserve | Expected questions  |
| ---- | ----------: | --------------: | ------: | ------------: | ------------------- |
| A    |          no |              no |      no |             0 | service / capacity  |
| B    |         yes |              no |      no |             0 | service / capacity  |
| C    |         yes |             yes |      no |             0 | service / capacity  |
| D    |         yes |             yes |     yes |             0 | service / capacity  |
| E    |         yes |             yes |     yes |            >0 | reserve interaction |

Pour chaque état mesurer :

* Water capacity ;
* Water balance ;
* Residence served ;
* admission ;
* Village progression ;
* workforce eligibility ;
* UI status ;
* simulation sur 20 ticks.

---

# 4. CAS CRITIQUE

Reproduire exactement le cas découvert en 10AX :

```text
operational Well
+
road-accessible
+
vacant
+
Residence on same covered network
```

Puis comparer :

```text
Well staffed
```

vs

```text
Well vacant
```

à stock identique.

Comparer :

* Residence served ;
* admission ;
* population ;
* Food ;
* Water capacity ;
* Water balance ;
* Water reserve ;
* progression ;
* jobs ;
* stage.

Le point essentiel :

> Le simple fait de retirer le worker doit-il changer le statut "Water served" ?

---

# 5. DETERMINE INTENT

Chercher le contrat existant dans :

* domain rules ;
* application queries ;
* admission ;
* progression ;
* scenarios ;
* UI labels ;
* tests historiques.

Ne pas déduire l'intention à partir d'un seul composant.

Si le code contient déjà deux contrats différents, les documenter explicitement.

---

# 6. ECONOMIC CONSEQUENCE

Tester si la divergence produit réellement une conséquence gameplay.

Exemples :

### Cas A

Vacant Well :

```text
capacity = 0
service = true
```

La Residence peut-elle être admise alors qu'aucun Water production worker n'existe ?

### Cas B

Une colonie peut-elle atteindre Village grâce à un Well vacant ?

### Cas C

Une colonie peut-elle conserver une population supérieure à sa Water production réelle grâce à cette couverture ?

### Cas D

Le worker peut-il être retiré du Well sans provoquer immédiatement de changement observable ?

Mesurer au moins :

```text
20 ticks
60 ticks
600 ticks
```

si un état stable est possible.

---

# 7. RECOVERY TEST

Tester le scénario :

```text
Well staffed
→ Residence served
→ colonist admitted
→ Well worker removed
```

Puis :

```text
Well vacant
→ worker returns
```

Mesurer :

* service ;
* capacity ;
* balance ;
* reserve ;
* admission ;
* progression ;
* Food ;
* population.

Le comportement doit être déterministe et compréhensible.

---

# 8. SCENARIO REGRESSION

Tester au minimum :

* First Settlement ;
* Water Constraint ;
* Population Expansion ;
* Partitioned Valley ;
* Water Reserve Industry ;
* Terrain Chokepoint fixture.

Ne pas créer de scénario.

Vérifier seulement que la correction éventuelle ne casse aucun contrat existant.

---

# 9. DESIGN DECISION

À partir des mesures, choisir uniquement l'une des trois conclusions.

## A — INTENTIONAL

Le modèle veut explicitement distinguer :

```text
service = infrastructure exists
capacity = worker exists
```

Dans ce cas :

* aucune correction ;
* documenter pourquoi ;
* vérifier que les UI utilisent le bon vocabulaire ;
* ajouter des tests de contrat si nécessaire.

---

## B — INCONSISTENT

Si une Residence est dite "served" alors que le système ne possède aucun moyen causal de produire Water pour elle, corriger le minimum nécessaire.

La correction doit être :

* locale ;
* déterministe ;
* sans nouveau système ;
* sans nouvelle ressource ;
* sans nouveau seuil ;
* sans modification des constantes économiques ;
* sans modification du modèle de réseau.

Ne pas refactorer largement.

---

## C — PRODUCT DECISION

Si les deux interprétations sont cohérentes mais entraînent des gameplay différents :

* ne pas choisir arbitrairement ;
* documenter les deux contrats ;
* mesurer leur impact ;
* laisser la décision comme design call séparé.

---

# 10. UI SEMANTICS

Si la règle finale change ou si l'audit révèle des ambiguïtés, vérifier les termes :

* `served`
* `capacity`
* `balance`
* `reserve`
* `draining`
* `shortage`
* `noReserve`

Chaque terme doit correspondre à une quantité ou un état causal précis.

Ne pas ajouter de nouvelle UI si les labels existants suffisent.

---

# 11. TERRAIN REGRESSION

Le terrain a déjà été fermé.

Ne pas refaire 10AW.

Vérifier uniquement que le contrat Water reste identique avec :

```text
open network
blocked terrain
partitioned network
chokepoint fixture
```

Le terrain ne doit pas acquérir de comportement économique supplémentaire.

---

# 12. ARCHITECTURE

Avant modification :

```text
src/domain
src/application
src/app
```

Identifier exactement l'autorité responsable de :

* Water capacity ;
* Water service ;
* Water reserve.

Objectif :

> une seule autorité par responsabilité.

Éviter de créer :

* `WaterSystem`;
* cache ;
* état dérivé persistant ;
* nouvelle couche de services ;
* nouvelle abstraction de réseau.

---

# 13. IMPLEMENTATION

Si et seulement si la conclusion est B :

implémenter la correction minimale.

Exigences :

* aucun changement des constantes ;
* aucun changement de SAVE_VERSION ;
* aucun changement de save schema ;
* aucune migration ;
* aucune nouvelle règle économique ;
* aucune nouvelle mécanique.

Ajouter les tests de régression correspondant exactement au bug.

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
* scénarios ;
* browser E2E ;
* GPU E2E si le browser est exécuté.

Si `src/` reste inchangé :

> l'étape doit rester audit-only.

Si `src/` est modifié :

> justifier précisément pourquoi la correction était nécessaire.

---

# 15. FINAL REPORT

Retourner :

```text
STEP 10AY — FINAL REPORT

Starting commit:
Final commit:

CURRENT WATER CONTRACT
- Capacity:
- Service:
- Reserve:
- Balance:
- Staffing dependency:

CRITICAL CASE
- Operational:
- Road-accessible:
- Staffed:
- Capacity:
- Service:
- Reserve:
- Admission:
- Village:
- 20 ticks:
- 60 ticks:
- 600 ticks:

CONTROL MATRIX
| Case | Operational | Accessible | Staffed | Capacity | Service | Balance | Admission | Village |
|---|---:|---:|---:|---:|---:|---:|---:|---:|

ECONOMIC CONSEQUENCE
- Vacant Well effect:
- Staff removal effect:
- Recovery:
- Long-run consequence:

SCENARIO REGRESSION
| Scenario | Result |
|---|---|
| First Settlement | |
| Water Constraint | |
| Population Expansion | |
| Partitioned Valley | |
| Water Reserve Industry | |
| Terrain Chokepoint | |

DESIGN CLASSIFICATION

A / B / C

IMPLEMENTATION
- src changes:
- tests:
- persistence:
- SAVE_VERSION:
- constants changed:

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

DECISION

[One factual paragraph.]

NEXT DEPENDENCY:
```

# HARD BOUNDARIES

Ne pas :

* rouvrir 10AG/10AR comme audits généraux ;
* retuner Food/Water ;
* toucher au 2/2 baseline ;
* créer Town ;
* créer une nouvelle mécanique ;
* ajouter une capacité Well ;
* modifier les coûts ;
* modifier les taux ;
* modifier la progression ;
* ajouter un scénario ;
* refaire l'audit terrain.

Le seul sujet de 10AY est :

> **Est-ce qu'un Well vacant doit réellement pouvoir "servir" une Residence dans le modèle actuel ?**

Si la réponse est oui, fermer proprement le sujet.

Si la réponse est non, corriger uniquement cette incohérence et rien d'autre.


# Documentation (as-built) — Step 10AY

Starting commit: `2875afc` (Step 10AX).
Final commit: this commit.

**AUDIT + CLOSURE, no production change.** `src/` is untouched (verified by the
source scans in the audit itself); the step adds one audit file
(`tests/waterCoverageServiceConsistencyAudit.test.ts`, 22 tests) and this
document. The one question was:

> **Can an operational but VACANT Well legitimately "serve" a Residence?**

**Answer: yes — it is the documented, deliberate contract, and it is coherent.**
Classification **A — INTENTIONAL**. No correction, no new rule, no threshold, no
constant, no persistence change.

## 1. The current contract, step by step (traced, then measured)

```text
Well                     -> building.status === 'operational'
  operational ?          -> isOperationalWell
  road-accessible ?      -> getBuildingRoadAccess(...).hasRoadAccess   [SERVICE gate]
  staffed ?              -> countWorkersAt(...) > 0                    [CAPACITY gate]
  Water capacity         -> waterProductionForTick = staffed x accessible x 2
  Water balance          -> capacity - need (need = served colonists x 1)
  network coverage       -> union of the networks an operational accessible Well touches
  Residence served ?     -> operational Residence sharing a covered network
  admission              -> gate ACTIVE iff an operational Well exists;
                            allowed iff capacity >= served need + admissions + 1
                            (bootstrap exemption while population === 0)
  progression Village    -> population >= 2 AND capacity >= 2 AND Food balance
  UI                     -> six derived supply states (below), never a second rule
```

Measured in one fixture (`AUDIT PIPELINE`): the same Well, the same network and
the same two served Residences give `capacity 0` when vacant and `capacity 2`
when staffed; service is `2 served Residences` in both. `AUDIT WATER_AUTHORITY`
proves there is exactly ONE definition of coverage, production, the gate and the
staffed-Well count, all in `src/domain/water/water.ts`; the rate constant is
defined once (`resource.ts`), computed once (`water.ts`) and elsewhere only read
as a threshold (`progression.ts`), a UI label (`main.ts`) or a comment.

## 2. capacity ≠ service ≠ reserve (measured, not asserted)

| state | capacity | service | reserve |
| --- | --- | --- | --- |
| Well accessible but vacant | **0** | 2 served Residences | 3 |
| Well staffed | **2** | 1 served Residence | 5 |

No boolean merges the three: capacity is labour-based, service is
infrastructure-based, the reserve is canonical state. A colony can be served and
producing nothing (`supply: draining` / `shortage`), and can produce while one
Residence on another network stays unserved (measured: 1 of 2 served with
capacity 2 on two networks).

## 3. Controlled matrix (A–E of the step prompt, measured)

| Case | Operational | Accessible | Staffed | Capacity | Service | Balance | Admission (20 t) | Village |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A Well under construction | no | no | no | 0 | 0 | 0 | **yes** (gate inactive, Food+housing bootstrap) | yes (the Well completes on tick 2) |
| A0 no Well at all (control) | no | no | no | 0 | 0 | 0 | **yes** (identical to A: the gate is inactive) | no (no capacity is ever produced) |
| B operational, NOT accessible | yes | no | no | 0 | 0 | 0 | **no** (gate active, coverage 0, `noService`) | no |
| C operational, accessible, **VACANT** | yes | yes | no | **0** | **2** | −2 | **no** (headroom cannot be met) | no |
| D operational, accessible, staffed, reserve 0 | yes | yes | yes | 2 | 2 | 0 | yes | **yes** (`noReserve`) |
| E same as D with a reserve | yes | yes | yes | 2 | 2 | 0 | yes | **yes** (`supplied`) |

In case B the Well is not even a workplace (no road access → no mobility
connection → nobody can staff it). In case C the Well *is* a workplace and
covers the network, but the automatic assignment fills the two Farms first; the
colony is served, produces no Water, and cannot grow.

## 4. The critical case: does removing the worker change "served"?

**No.** `AUDIT CRITICAL_CASE` and `AUDIT CRITICAL_CASE_PAIR` (same Residences,
same access, same stock, only the worker differs):

| measurement | vacant Well | staffed Well |
| --- | --- | --- |
| served Residences | 2 | 2 |
| served colonists | 2 | 2 |
| covered networks | 1 | 1 |
| **capacity** | **0** | **2** |
| need / balance | 2 / −2 | 2 / 0 |
| supply state | `draining` → `shortage` | `supplied` |
| Food production | 4 | 2 |
| stage | `settlement` | `village` |

Stable at 20, 60 and 600 ticks in both shapes (`AUDIT CRITICAL_CASE_LONG_RUN`):
the vacant shape sits at reserve 0 with a permanent shortage and never dies, the
staffed shape is `village` and `supplied`. So the *service* label is deliberately
about infrastructure, and every consequence of losing the worker is visible
immediately in capacity, the supply state and the stage.

## 5. Intent (found in the code, not inferred from one call site)

The domain file states the contract and the rejected alternative in its own
header, and the audit asserts that text (`AUDIT DOCUMENTED_INTENT`):

```text
Step 10O proposed requiring a *staffed* Well for coverage. That is impossible at
bootstrap — the first colonist needs water service to be admitted, but only a
colonist can staff the Well. Coverage therefore requires an operational,
road-accessible Well; staffing still gates Water *production*, so an unstaffed
Well cannot sustain growth beyond the first colonist.
```

`AUDIT BOOTSTRAP` demonstrates the deadlock the rule avoids: at population 0 the
colony has `staffedWells = 0` and `capacity = 0` **but coverage exists**, so the
first colonist is admitted and employed by the Well on the same tick (capacity 2
afterwards). Under a staffed-coverage rule the coverage set would be empty at the
only admissible moment and the colony could never start.

## 6. Economic consequence (the four prompt cases, measured)

* **Can a Residence be admitted on a vacant Well alone?** No. With one colonist
  and a vacant Well the colony stays at 1 colonist for 60 ticks (`shortage`).
* **Can a colony reach Village on a vacant Well?** No: the Village condition is
  `capacity >= 2`, and a vacant Well contributes 0.
* **Can a population exceed real production?** Yes, **but never because of
  coverage**: 4 colonists with one staffed Well (capacity 2) sit at
  `capacity 2 < need 4`, `shortage`, stable at 20/60/600 ticks, and **the stage
  keeps reading `village`** because the Village condition is `capacity >= 2`, not
  `capacity >= population`. The population came from the scenario/authoring, not
  from the vacant-Well service. (10P §27: a shortage never removes a colonist.)
* **Is removing the worker observable?** Yes, on the same tick: a real
  `reassignColonist` command moves the Well worker to a Farm and capacity flips
  `2 → 0`, the supply state leaves `supplied`, and the stage falls
  `village → settlement` while service stays at 2/2.

**Two consequences worth recording (not defects, no change made):**

1. A vacant Well is *worse for growth* than no Well at all: without any Well the
   gate is inactive (the pre-10P Food + housing path admits colonists), while a
   vacant Well activates the gate with zero capacity. This is the documented
   corollary of the bootstrap rule (a built Well is expected to be staffed), and
   the player sees it as `served · shortage`.
2. The stage label and the supply label can legitimately disagree: a
   scenario-authored population above capacity reads `village` + `shortage`
   indefinitely. Both labels are honest about different quantities (a scale
   threshold versus a flow), and no rule removes it without either a new
   population-scaled threshold (arbitrary, rejected by 10AK) or removing the
   shortage gate (which would change the 2/2 economy).

## 7. Recovery

`AUDIT RECOVERY`, all with real commands: staffed (capacity 2, `supplied`,
`village`) → the Well worker is reassigned to a second Farm (capacity 0,
`draining`, `settlement`, service unchanged, the reserve drains) → the worker
returns to the Well (capacity 2, `supplied`, `village`). The same command
sequence rebuilds the same canonical hash, so the behaviour is deterministic and
comprehensible.

## 8. Scenario regression and terrain regression

| Scenario | Result |
| --- | --- |
| First Settlement | contract invariants hold; deterministic |
| Water Constraint | contract invariants hold; deterministic |
| Population Expansion | contract invariants hold; deterministic |
| Recovery | contract invariants hold; deterministic |
| Water Reserve Industry | contract invariants hold; deterministic |
| Terrain Chokepoint (fixture) | contract invariants hold; deterministic; keeps 2 networks, 1 served Residence, capacity 2 |

Invariants checked in each state (after 40 ticks and on a second run):
`capacity === staffedWells × 2`, `capacity > 0 ⇒ an operational Well exists`,
`served Residences ≤ operational Residences`, and hash equality between the two
runs. **Terrain**: the same fixture with and without the ridge produces the same
capacity (2), the same served count (1) and the same reserve — terrain changes
which cells can carry a road, never a Water rule; the per-network coverage rule
is unchanged (measured: one Well covers only its own network).

## 9. UI semantics

The six supply states are each a function of measured quantities
(`AUDIT VOCABULARY`, all six constructed and verified):

| state | condition | measured |
| --- | --- | --- |
| `inactive` | no operational Well | capacity 0, served 0 |
| `noService` | a Well exists, no served colonist | served colonists 0 |
| `noReserve` | capacity ≥ need, reserve < need | 2 ≥ 1, reserve 0 |
| `supplied` | capacity ≥ need, reserve ≥ need | 2 ≥ 1, reserve 5 |
| `draining` | capacity < need, reserve ≥ need | 0 < 2, reserve 5 |
| `shortage` | capacity < need, reserve < need | 0 < 2, reserve 1 |

Labels verified in the UI vocabulary (`no service / shortage / draining /
reserve 0 / served`, 10AR): `served` and `shortage` are separate strings, so the
vacant-Well state reads `2 · served` plus `· shortage`, never a single conflated
word. No UI change was needed and none was made.

## 10. Architecture and persistence

One authority per responsibility (source scan, measured): `getWaterCoverage`,
`waterProductionForTick`, `hasOperationalWell` and `countStaffedOperationalWells`
are each defined exactly once, in `src/domain/water/water.ts`. No `WaterSystem`,
no cache, no persisted derived state: `serializeSave` still writes exactly seven
top-level keys, `resources` still holds `construction/food/water` only, no key
contains "water" outside that stock, SAVE_VERSION stays 7 and the round-trip
reloads to the same hash.

---

## 11. FINAL REPORT

```text
STEP 10AY — FINAL REPORT

Starting commit: 2875afc (Step 10AX)
Final commit:    this commit

CURRENT WATER CONTRACT
- Capacity: staffed AND operational AND road-accessible Wells x 2 per tick
  (waterProductionForTick -> getWaterProductionPerTick)
- Service: an OPERATIONAL, road-accessible Well covers the road networks it
  touches; any operational Residence sharing a covered network is served
  (getWaterCoverage); staffing is NOT part of coverage
- Reserve: the canonical `resources.water` stock, never derived
- Balance: capacity - need, need = served colonists x 1 per tick
- Staffing dependency: staffing gates PRODUCTION only; coverage and the grid
  vocabulary are infrastructure-based by the documented 10P bootstrap rule

CRITICAL CASE
- Operational: yes
- Road-accessible: yes (the Well is a valid workplace)
- Staffed: no
- Capacity: 0 (staffed Wells x 2)
- Service: 2 of 2 Residences served (1 covered network)
- Reserve: unchanged by the vacancy (4 at the pair measurement)
- Admission: blocked — capacity 0 cannot satisfy the headroom rule
- Village: not reached (Village needs capacity >= 2)
- 20 ticks: capacity 0, service 2, supply `draining`/`shortage`, population 2
- 60 ticks: identical
- 600 ticks: identical (stable, no death — Water is a growth gate only)

CONTROL MATRIX
| Case | Operational | Accessible | Staffed | Capacity | Service | Balance | Admission | Village |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A under construction | no | no | no | 0 | 0 | 0 | yes (gate inactive) | yes after tick 2 |
| A0 no Well (control) | no | no | no | 0 | 0 | 0 | yes (gate inactive) | no |
| B operational, no road | yes | no | no | 0 | 0 | 0 | no (`noService`) | no |
| C operational, accessible, VACANT | yes | yes | no | 0 | 2 | -2 | no | no |
| D staffed, reserve 0 | yes | yes | yes | 2 | 2 | 0 | yes | yes (`noReserve`) |
| E staffed, reserve > 0 | yes | yes | yes | 2 | 2 | 0 | yes | yes (`supplied`) |

ECONOMIC CONSEQUENCE
- Vacant Well effect: coverage yes, capacity 0, admission blocked, supply
  `draining`/`shortage`, stage settlement — a bounded, visible penalty
- Staff removal effect: same tick, capacity 2 -> 0, supply leaves `supplied`,
  stage village -> settlement, service unchanged (2/2), Food 2 -> 4
- Recovery: free and deterministic with one existing command; capacity and stage
  are restored, the reserve only pays for the ticks actually served
- Long-run consequence: both shapes are stable at 600 ticks; the vacant shape
  never dies (Water is a growth gate, never a survival gate)

SCENARIO REGRESSION
| Scenario | Result |
|---|---|
| First Settlement | invariants hold, deterministic |
| Water Constraint | invariants hold, deterministic |
| Population Expansion | invariants hold, deterministic |
| Partitioned Valley (Recovery / Water Constraint shapes) | invariants hold, deterministic |
| Water Reserve Industry | invariants hold, deterministic |
| Terrain Chokepoint | invariants hold, deterministic (2 networks, 1 served, capacity 2) |

DESIGN CLASSIFICATION

A — INTENTIONAL

IMPLEMENTATION
- src changes: none (audit-only; verified: no candidate identifier added, the
  Water authority scan is unchanged, SAVE_VERSION 7)
- tests: tests/waterCoverageServiceConsistencyAudit.test.ts, 22 contract tests
  (pipeline, three concepts, control matrix, critical case, bootstrap, four
  economic cases, recovery, six scenarios, six supply states, terrain, authority
  scan, persistence)
- persistence: untouched (7 top-level keys, `resources` = construction/food/water)
- SAVE_VERSION: 7
- constants changed: none

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 80 files / 1520 tests PASS (+1 file / +22 tests; 79/1498 before)
- determinism: PASS     - insertion-order: PASS     - save/load: PASS
- browser: 17 / 17 suites headless ALL PASS
- GPU: ALL PASS (headed)

DECISION

The vacant-Well coverage is intentional, documented and coherent rather than an
inconsistency: `src/domain/water/water.ts` records the deliberate 10P correction
that coverage is infrastructure-based (an operational, road-accessible Well),
because a staffed-coverage rule would deadlock the very first admission — measured
here at population 0, where the colony has zero staffed Wells and zero capacity
yet coverage exists and the first colonist is admitted and staffed on the same
tick. Staffing gates production only, and the audit shows the vacant Well grants
no unearned capacity anywhere: capacity stays 0, admission is blocked by the
headroom rule, Village (capacity >= 2) is unreachable, and the state reports
`served` and `shortage` as separate facts with an immediate, recoverable penalty.
The three concepts are separated by measurement (capacity != service != reserve),
each of the six derived supply states is a function of measured quantities, the
Water contract is identical with and without terrain, and no scenario regresses.
Two consequences are recorded as documentation/UX notes rather than defects, and
no production file was changed: (1) a vacant Well is worse for growth than no Well
at all (it activates the admission gate with zero capacity), and (2) the stage
label and the supply label can legitimately disagree, because Village is a scale
threshold (`capacity >= 2`) while the shortage gate is a per-tick flow test.

NEXT DEPENDENCY:
- Nothing is owed by Water. The next work is content and UX outside Town
  progression, as 10AX concluded: the housing-composition placement scenario, the
  10AW readability items (terrain legend; the HUD occluding 10-11 of 12 blocked
  cells at 420x740 / 360x640), and — if the product wants a real Town stage — the
  deferred 10AP production-rate tuning, which remains the only measured route to a
  surplus state. If a future step wants to revisit the two recorded notes, the
  smallest candidates are a HUD hint that a vacant Well still covers its network
  (presentation only) and an explicit statement that Village is a capacity
  threshold rather than a per-colonist balance.
```
