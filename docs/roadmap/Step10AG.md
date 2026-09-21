Tu reprends NOVA depuis le commit final de Step 10AF :

`35dcab1`

Working tree attendu : propre.

# STEP 10AG — FOOD DISTRIBUTION & SPATIAL SUPPLY AUDIT

## Nature

**AUDIT ONLY.**

Ne modifie pas `src/`.

10AF a conclu :

```text
NO NEW SYSTEM JUSTIFIED
```

mais a identifié un seul candidat avec une tension réelle :

```text
Food distribution — B: useful but incomplete
```

Le but de 10AG est de déterminer si la globalité actuelle de Food masque une conséquence spatiale suffisamment importante pour justifier un futur système de distribution.

**Ne pas implémenter Food logistics.**

---

# 1. MODÈLE ACTUEL

Documenter précisément :

```text
Farm
 ↓
global Food stock
 ↓
Food consumption
 ↓
population
```

Comparer avec Water :

```text
Well
 ↓
road/network coverage
 ↓
served Residence
 ↓
Water consumption
```

Identifier exactement ce que Food gagne à rester global et ce que cela masque.

---

# 2. FOOD SPATIAL BLIND-SPOT

Construire des scénarios équivalents avec :

### Compact

```text
Residences + Farms proches
```

### Corridor

```text
Residences --- roads --- Farms
```

### Partition

```text
Network A: Residence
Network B: Farm
```

### Remote farm

Une Farm très éloignée du réseau résidentiel.

### Remote residence

Une Residence éloignée de toutes les Farms.

Pour chaque scénario mesurer :

* Food production ;
* Food consumption ;
* population ;
* shortage ;
* Water service ;
* road/network topology ;
* Material ;
* workforce assignment.

Question centrale :

> La position d'une Farm change-t-elle actuellement absolument rien, ou existe-t-il déjà une conséquence indirecte via workforce/mobility ?

---

# 3. FARM WORKFORCE VS FOOD LOGISTICS

C'est le point critique.

Une Farm est déjà soumise à :

```text
residence network
        ∩
farm network
```

pour son worker.

Mesurer les scénarios où :

* la Farm est inaccessible ;
* la Farm est accessible ;
* plusieurs Farms sont accessibles ;
* une Farm est proche mais une autre est éloignée ;
* le colonist est manuellement affecté.

Déterminer si la mobilité existante fournit déjà une forme indirecte de Food logistics.

Si oui, documenter précisément la différence entre :

```text
worker mobility
```

et :

```text
resource distribution
```

---

# 4. FOOD STORAGE VS DISTRIBUTION

Ne pas confondre les deux.

Mesurer séparément :

### A — stockage

Une réserve Food globale absorbe-t-elle suffisamment les variations ?

### B — distribution

Une Farm locale pourrait-elle produire Food utilisable uniquement par certaines Residences ?

Tester conceptuellement :

```text
Farm A → Residence A
Farm B → Residence B
```

versus :

```text
Farm A + Farm B → global Food
```

Sans modifier le runtime.

---

# 5. PARTITION TEST

Créer deux colonies/réseaux indépendants :

```text
Network A
Residence A
Farm A

Network B
Residence B
Farm B
```

Puis casser volontairement :

```text
Farm A inaccessible
Farm B intacte
```

Mesurer ce qui arrive.

Puis :

```text
Residence A inaccessible
Farm A intacte
```

Comparer avec Water où la couverture réseau est déjà locale.

Question :

> Existe-t-il actuellement une situation dans laquelle la séparation spatiale d'une colonie devrait logiquement affecter Food mais ne l'affecte pas ?

---

# 6. FAILURE MODES

Tester au minimum :

```text
Food = 0
Food < population
Food = population
Food > population
Farm inaccessible
Farm accessible mais non staffed
Farm accessible et staffed
```

Pour chacun :

* résultat ;
* durée ;
* récupération possible ;
* contrôle joueur ;
* interaction avec Water ;
* interaction avec workforce.

Attention au comportement actuel :

> Food shortage peut devenir terminal.

Mesurer précisément si la globalité Food rend ce failure mode trop brutal ou si le problème est indépendant de la distribution.

---

# 7. HYPOTHÈSES À TESTER

Évaluer les hypothèses suivantes sans les implémenter.

### H1 — Food doit rester global

Si la mobilité des travailleurs suffit à représenter la contrainte spatiale.

### H2 — Food doit devenir local

Si une Farm devrait nécessiter une chaîne logistique jusqu'aux Residences.

### H3 — Food storage avant distribution

Si le véritable manque actuel est le tampon temporel plutôt que la localisation.

### H4 — Food distribution serait redondante avec Water

Si elle ne fait que reproduire :

```text
network → coverage → served residence
```

avec Food à la place de Water.

### H5 — Food distribution créerait une nouvelle couche stratégique

Uniquement si elle produit une décision différente de la mobilité et du Water.

---

# 8. MESURE DE VALEUR SPATIALE

Construire des scénarios avec même nombre de bâtiments mais layouts différents :

```text
Layout A — compact
Layout B — corridor
Layout C — partition
Layout D — remote farm
```

Comparer :

* Food ;
* Water ;
* Material ;
* population ;
* workforce ;
* construction ;
* roads ;
* réseau.

L'objectif est de déterminer si Food introduit actuellement une **asymétrie spatiale réelle**.

---

# 9. CANDIDATS

Classer uniquement les options suivantes :

### A — Food storage

### B — Food distribution

### C — Farm service/coverage

### D — Farm input

### E — Aucun changement

Utiliser :

* A — fundamental
* B — useful but incomplete
* C — weak
* D — premature
* E — rejected

Ne pas faire de classement entre A/B/C/D/E.

---

# 10. CRITÈRES DE PASSAGE

Food distribution ne pourra être considéré comme fondamental que si l'audit démontre :

1. une conséquence spatiale actuellement absente ;
2. une décision joueur nouvelle ;
3. une interaction avec au moins deux systèmes existants ;
4. une différence claire avec Water coverage ;
5. une récupération possible ;
6. aucune boucle bootstrap catastrophique ;
7. une implémentation localisable sans framework générique.

Si ces critères ne sont pas satisfaits :

```text
NO FOOD DISTRIBUTION YET
```

---

# 11. ARCHITECTURE

Vérifier :

* `src/` inchangé ;
* SAVE_VERSION inchangé ;
* aucun état persistant nouveau ;
* aucun cache ;
* aucun framework logistique ;
* aucun système générique de ressources ;
* déterminisme ;
* insertion-order invariance.

Les tests d'audit uniquement peuvent être ajoutés.

---

# 12. TESTS

Ajouter les expériences nécessaires dans le dossier d'audit existant.

Puis :

* Vitest complet ;
* typecheck ;
* lint ;
* build.

Documenter :

```text
before:
after:
audit tests added:
```

---

# 13. RAPPORT FINAL

Créer :

`docs/roadmap/Step10AG.md`

Format :

```text
STEP 10AG — FOOD DISTRIBUTION & SPATIAL SUPPLY AUDIT

Starting commit:
Final commit:

Current Food model:
...

Food spatial blind spots:
...

Farm workforce interaction:
...

Storage vs distribution:
...

Partition results:
...

Failure modes:
...

H1 — Food global:
Classification:
Evidence:

H2 — Food local:
Classification:
Evidence:

H3 — Food storage:
Classification:
Evidence:

H4 — Food distribution vs Water:
Classification:
Evidence:

H5 — New strategic layer:
Classification:
Evidence:

Architectural findings:
...

Tests:
...

Determinism:
...

Conclusion:
...

Next dependency:
...
```

## Règle finale

Ne transforme pas automatiquement le résultat B de 10AF en implémentation.

Si Food distribution n'apporte pas une décision distincte de la mobilité et du Water :

```text
NO FOOD DISTRIBUTION YET
```

Si une vraie dépendance apparaît, documente-la précisément mais **n'implémente toujours rien dans 10AG**.

Le but est de savoir si Food est actuellement **trop abstrait**, ou simplement **correctement abstrait pour le stade actuel du modèle**.

---
# STEP 10AG — FOOD DISTRIBUTION & SPATIAL SUPPLY AUDIT (report)

Audit-only. `src/` was NOT modified. Every number below is measured from the
running model by `tests/foodDistributionSpatialSupplyAudit.test.ts` (15 tests,
deterministic; `--reporter=verbose` prints the `AUDIT …` rows quoted here).

```text
STEP 10AG — FOOD DISTRIBUTION & SPATIAL SUPPLY AUDIT

Starting commit: 35dcab1 ("Step 10AF: population growth & settlement consequence audit")
Final commit:    this commit

Current Food model: Farm (staffed, operational, road-accessible) -> ONE colony-wide Food
                 stock -> colony-wide consumption -> population. No distance, no network,
                 no delivery, no cap. Water is the opposite: Well -> 09D road networks
                 (coverage) -> served Residence -> served-colonist consumption.

Food spatial blind spots: Food crosses network boundaries (Farm B feeds Residence A)
                 while Water does not; the ONLY layout effect on Food is on the WORKER
                 (an unreachable Farm produces 0).

Farm workforce interaction: production follows the worker, not the Food. Measured:
                 farm-inaccessible 0 Food/tick, farm-accessible 2, two farms + one worker
                 2 with one vacant, near/far farm -> the near one staffed, cross-network
                 manual assignment rejected with `notConnected`.

Storage vs distribution: the global stock IS the storage (0 Food -> wipe in 1 tick;
                 100 Food -> 51 ticks of outage); a local model would only move where the
                 stock is counted.

Partition results: breaking Farm A drops total Food from 4 to 2 with both networks still
                 fed; an isolated Residence is unemployed but still fed (foodNet 0) while
                 Water coverage stays local (1 of 2 Residences served).

Failure modes:   Food = 0 or < population -> wipe in 1 tick (terminal, automatic);
                 Food = population with balanced production -> stable at 0 stock;
                 Food > population -> unbounded reserve; inaccessible/unstaffed Farm ->
                 -2 Food/tick and a wipe once the stock runs out.

H1 — Food global:              A — fundamental
H2 — Food local:               E — rejected
H3 — Food storage:             C — weak
H4 — Food redundant with Water: A — fundamental (redundancy measured)
H5 — New strategic layer:      E — rejected

Candidate A — Food storage:    C — weak
Candidate B — Food distribution: D — premature
Candidate C — Farm service:    D — premature
Candidate D — Farm input:      E — rejected
Candidate E — No change:       A — fundamental

Architectural findings: src unchanged, SAVE_VERSION 7, 7 persisted keys, no new persistent
                 state, no cache, no logistics framework, determinism + insertion-order
                 invariance preserved.

Tests:           before 59 files / 1183 tests; after 60 / 1198; audit tests added 15.
                 typecheck, lint, build pass.

Determinism:     same-run hash equal; insertion-order invariant; save/load unchanged.

Conclusion:      Food is not too abstract — it is abstracted exactly at the level the model
                 currently supports. The spatial constraint that exists is WORKER mobility,
                 not Food delivery, and a Food distribution system would reproduce the Water
                 coverage shape without a new decision.

Next dependency: NO FOOD DISTRIBUTION YET
```

## Current Food model

```text
Food:   Farm (staffed + operational + road-accessible)
          -> one colony-wide `resources.food`
          -> colony-wide consumption (1 per colonist, all-or-nothing)
          -> population

Water:  Well (staffed + operational + road-accessible)
          -> 09D road networks (coverage, derived)
          -> served Residence
          -> served-colonist consumption
```

Measured on one colony: production 2, consumption 2, net 0, population stable. The Food
rules have no distance, no network and no delivery term; the Water rules are entirely
network-local. What Food gains from being global is that **eating never depends on layout**;
what that hides is that **producing** still does — through the worker.

**The cross-network measurement** (Network A: Residence A + Well A; Network B: Residence B +
Farm B): 2 networks, Food production 2, consumption 2, population **2 fed**, served
Residences **1**. Farm B feeds the colonist of Residence A, while Well A serves only its own
network. That single asymmetry is the whole subject of this audit.

## Food spatial blind spots (60 ticks, same building count)

| layout | roads | networks | Food prod | Food net | population | employed | unemployed | served Residences |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| compact | 9 | 1 | 2 | 0 | 2 | 2 | 0 | 2 |
| corridor | 11 | 1 | 2 | 0 | 2 | 2 | 0 | 2 |
| partition | 2 | 2 | 2 | 0 | 2 | 2 | 0 | **1** |
| remote farm (no road) | 5 | 1 | **0** | **-2** | 2 | 1 | 1 | 2 |
| remote residence (no road) | 5 | 1 | 2 | 0 | 2 | 1 | **1** | 1 |

Central question — *does the position of a Farm change anything?* Measured answer: **Food
itself is position-independent**; every layout difference is a *workforce* difference. The
remote Farm loses its worker (production 0, the colony starts dying of starvation after the
stock runs out), and the remote Residence loses its worker (unemployment) but keeps eating
from the global stock. A partition costs Food nothing and Water one served Residence.

## Farm workforce interaction

The critical point of the step. A Farm is already gated by `residence network ∩ farm network`
for its **worker**:

| scenario | Food/tick | vacant Farms | farm workers |
| --- | --- | --- | --- |
| farm inaccessible (no road) | **0** | 1 | [0] |
| farm accessible | 2 | 0 | [1] |
| two farms, one worker | 2 | 1 | [1, 0] |
| near farm + far farm, one worker | 2 | 1 | [1, 0] (near wins) |
| manual assignment to the local farm | 2 | 0 | valid |
| manual assignment across networks | rejected `notConnected` | - | - |

**The mobility system already provides an indirect form of Food logistics.** The difference is
exact and worth stating:

* **worker mobility** decides *who can produce* — a Farm outside the worker's network produces
  nothing, and the player's real decision is "place the Farm inside the worker network";
* **resource distribution** would decide *who can consume* — which no measured scenario needs,
  because every colonist already eats from the same stock.

## Storage versus distribution

**A — storage.** The global stock is already the buffer; measured outage absorption with
production 0 and 2 colonists (2 Food/tick):

| initial Food | ticks before the colony is wiped |
| --- | --- |
| 0 | 1 |
| 5 | 3 |
| 20 | 11 |
| 100 | 51 |

The relationship is exactly `stock / consumption`, and the wipe is instantaneous at 0. A
storage *system* would only bound that buffer; it would not create a dependency.

**B — distribution.** Today `Farm B -> Residence A` works with no chain at all (measured:
2 networks, production 2, population 2 fed, Food ends at exactly 0). A local model would need
`Farm B -> Residence A` delivery, i.e. the same `network -> coverage -> served Residence` shape
Water already implements.

## Partition results

| experiment | result |
| --- | --- |
| two networks, Farm A + Farm B, both healthy | 4 Food/tick, both networks fed, 2 colonists |
| **Farm A broken** (under construction) | 2 Food/tick; the surviving Farm keeps feeding BOTH networks; population unchanged |
| **Residence A isolated** (off the road network) | its colonist is unemployed, still fed globally (`foodNet 0`); Water coverage is unaffected (1 Residence served on its own network) |
| two networks, one Well on A only | 1 of 2 Residences served, 1 of 2 colonists water-served (Water does NOT cross) |

There **is** a situation where separation logically should affect Food and does not today:
a colonist on an isolated network with no Farm within reach still eats from the stock produced
on the other network. But the same measurement shows the *production* side of that separation
is already handled (the farm on the unreachable side gets no worker). So the gap is a
distribution gap only, and its consequence is already covered by the terminal starvation rule.

## Failure modes

| state | outcome | duration | recoverable | player-controllable |
| --- | --- | --- | --- | --- |
| Food = 0, no production | colony wiped | **1 tick** | no (terminal) | yes |
| Food < population, no production | colony wiped | **1 tick** | no (terminal) | yes |
| Food = population, production = consumption | stable at 0 stock, nobody admitted | indefinite | yes | yes |
| Food > population, production > consumption | stable, reserves accumulate (50 -> 170 in 60 ticks) | indefinite | yes | yes |
| Farm inaccessible | -2 Food/tick, wipe at tick 26 (from 50 Food) | 26 ticks | yes while the stock lasts | yes |
| Farm accessible but unstaffed (Wells took both workers) | -2 Food/tick, wipe at tick 26 | 26 ticks | yes while the stock lasts | yes |
| Farm accessible + staffed | net 0, stable | indefinite | yes | yes |

Interaction with Water: the same workers that staff Wells are the ones that could staff Farms
(measured `farm-accessible-unstaffed`), so Food and Water compete for the workforce, not for
space. The brutality of the shortage is **independent of distribution**: it follows from the
colony-wide all-or-nothing consumption rule, not from transport.

## H1 — Food must stay global

**Classification: A — fundamental.** Evidence: the only measured layout effect on Food runs
through the worker (inaccessible Farm = 0 Food/tick); Food crosses network boundaries freely
and keeps both networks fed (2 networks, 2 colonists, no starvation). Global Food is therefore
not a missing constraint — it is the current expression of "eating is settlement-wide".

## H2 — Food must become local

**Classification: E — rejected.** Evidence: no measured scenario needs a chain; the partition,
corridor, remote-farm and remote-residence layouts change Food only through staffing, and the
global counterfactual (Farm B -> Residence A) already works with no chain at all.

## H3 — Food storage before distribution

**Classification: C — weak.** Evidence: the global stock already absorbs exactly
`stock / consumption` ticks of outage (0 -> 1 tick, 100 -> 51 ticks) and a production surplus
accumulates without bound (50 -> 170 in 60 ticks). A storage system would bound an existing
buffer; it adds no new dependency.

## H4 — Food distribution would be redundant with Water

**Classification: A — fundamental (the redundancy is measured).** Evidence: Water's shape is
`network -> coverage -> served Residence` and Food's counterfactual shape would be exactly the
same; the only localised thing Food already has is the worker, which is the 09K mobility rule.

## H5 — Food distribution would create a new strategic layer

**Classification: E — rejected.** Evidence: every measured difference between the layouts is
already a workforce decision (who works where) or a layout decision (road cost, network
membership) modelled by 09C/09D/09E/09K/09M. No measured decision is currently blocked by the
absence of Food delivery.

## Candidate classification (section 9 options)

| candidate | classification | evidence |
| --- | --- | --- |
| A — Food storage | **C — weak** | the global stock already is the buffer (measured outage absorption) |
| B — Food distribution | **D — premature** | duplicates `network -> coverage -> served Residence`; the spatial gate already exists via the worker |
| C — Farm service/coverage | **D — premature** | a Farm already needs a mobility-connected worker; residence coverage would stack the Water shape on top |
| D — Farm input | **E — rejected** | competes with population for the same Water/Food capacity and attacks the bootstrap root (10AE) |
| E — No change (Food stays global) | **A — fundamental** | the current model already produces the emergent constraints without adding a system |

No ranking between candidates is implied (as required).

## Pass criteria (section 10)

| criterion | satisfied | evidence |
| --- | --- | --- |
| 1 spatial consequence currently absent | **no** | an inaccessible Farm already loses its worker and produces 0 |
| 2 new player decision | **no** | the decision is already "place the Farm inside the worker network" |
| 3 interacts with >= 2 systems | yes | roads + farms + population (by duplication) |
| 4 clear difference from Water coverage | **no** | identical shape: network -> coverage -> served Residence |
| 5 possible recovery | yes | the stock absorbs the outage while it lasts |
| 6 no catastrophic bootstrap loop | yes | the first Farm needs only a road for its worker |
| 7 localizable without a generic framework | yes | it would reuse `getRoadNetworks` / `getBuildingRoadAccess` |

```text
NO FOOD DISTRIBUTION YET
```

## Architectural findings

* `src/` unchanged; `SAVE_VERSION` stays 7; persisted top level = `config, time, resources,
  buildings, roads, colonists, counters` (7 keys);
* no new persistent state, no cache, no food-delivery or logistics framework, no generic
  resource system;
* no derived term (`coverage`, `served`, `mobility`, `networkId`, `delivery`, `route`) appears
  in the canonical payload;
* determinism preserved: two identical 200-tick runs hash identically and reversing the record
  key insertion order leaves the canonical hash unchanged;
* the placement contract is unchanged (Workshop still `insufficientWater` without Water).

## Tests

```text
before:            59 files / 1183 tests
after:             60 files / 1198 tests
audit tests added: 15 (tests/foodDistributionSpatialSupplyAudit.test.ts)
```

`typecheck`, `lint`, `build`: passed.

## Determinism

Same scenario twice => same canonical hash (measured); insertion-order invariance over
`buildings` / `roads` / `colonists` => same hash (measured); save/load unchanged.

## Conclusion

Food is **correctly abstracted for the current model**, not too abstract. The measured facts:

* Food crossing network boundaries is exactly what "a colony eats together" should mean, and
  the model already has the spatial constraint that matters: a Farm only produces when a
  mobility-connected worker can reach it;
* a Food distribution layer would reproduce Water's `network -> coverage -> served Residence`
  shape (measured redundancy) while creating no new decision;
* the existing Food failure mode (terminal all-or-nothing starvation) is independent of
  distribution and is already the survival stake;
* Food storage is already provided by the uncapped global stock.

## Next dependency

```text
NO FOOD DISTRIBUTION YET
```

The 10AF conclusion stands: no new system is justified from the measured economy. If a future
step wants to revisit Food, the only angle with a genuinely new consequence is not
distribution but **timing** (the outage absorption curve measured above), and even that would
need a consumer that the current model does not have.

