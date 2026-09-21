Tu reprends NOVA depuis le commit final de Step 10AE :

`deb6d32`

Working tree attendu : propre.

# STEP 10AF — POPULATION GROWTH & SETTLEMENT CONSEQUENCE AUDIT

## Nature du step

**AUDIT ONLY.**

Ne modifie pas `src/`.

10AE a conclu :

```text
NO NEW SYSTEM JUSTIFIED
```

Ne contourne pas cette conclusion en ajoutant artificiellement un système.

Le prochain objectif est de déterminer si **la croissance de la colonie elle-même** produit désormais une conséquence suffisamment forte pour justifier Phase 5.

---

# 1. ÉTAT ACTUEL

Documente le modèle réel :

```text
Residence
  ↓
Housing capacity
  ↓
Population admission
  ↓
Food + Water
  ↓
Workforce
  ↓
Farm / Well / Workshop
```

Puis :

```text
Workshop
  ↓
Material
  ↓
Construction
  ↓
more buildings
  ↓
more housing
```

Identifier précisément les boucles existantes et les endroits où elles s'arrêtent.

---

# 2. POPULATION SCALING

Mesurer des colonies avec :

```text
1 colonist
2 colonists
3 colonists
4 colonists
6 colonists
8 colonists
10 colonists
```

Pour chaque taille :

* Food production ;
* Food consumption ;
* Water production ;
* Water consumption ;
* Material production ;
* Material upkeep ;
* workforce disponible ;
* workers Farm;
* workers Well;
* workers Workshop;
* residences ;
* buildings ;
* roads ;
* construction throughput ;
* stock Material ;
* stock Water.

Faire les mesures sur plusieurs horizons :

```text
10
30
60
120
240
600
```

---

# 3. RESIDENCE ADDITION

Tester l'ajout progressif de logements :

```text
R1
→ R2
→ R3
→ R4
→ ...
```

Pour chaque nouvelle Residence, mesurer :

* coût immédiat ;
* population réellement gagnée ;
* délai avant admission ;
* ressources nécessaires ;
* workforce supplémentaire ;
* production supplémentaire ;
* pression sur Food ;
* pression sur Water ;
* pression sur Material ;
* conséquence spatiale.

Question :

> Une Residence supplémentaire crée-t-elle aujourd'hui une décision intéressante, ou seulement davantage de capacité ?

---

# 4. POPULATION VS WORKFORCE

Tester explicitement les ratios :

```text
population / productive workers
```

et :

```text
population / Farms
population / Wells
population / Workshops
```

Mesurer les configurations :

```text
2P / 1F / 1W
4P / 2F / 1W
4P / 1F / 2W
6P / 2F / 2W
6P / 3F / 1W
6P / 1F / 3W
```

Adapter les noms dans les tests pour distinguer clairement :

* `P` = colonists ;
* `F` = Farms ;
* `W` = Workshops ;
* `WaterW` = Wells.

Ne pas supposer qu'une configuration est stable : la faire tourner.

---

# 5. MARGINAL COLONIST

Mesurer le coût et le bénéfice du colonist supplémentaire.

Pour :

```text
P → P+1
```

mesurer :

* Food supplémentaire ;
* Water supplémentaire ;
* workforce supplémentaire ;
* production supplémentaire ;
* capacité de construction supplémentaire ;
* éventuelle baisse de production ailleurs lorsqu'il faut affecter le nouveau worker.

Comparer :

```text
+1 colonist
```

avec :

```text
+1 Farm
+1 Well
+1 Workshop
+1 Residence
```

Le but est de voir si la population est devenue un **levier économique**, ou seulement une conséquence automatique du logement.

---

# 6. SPATIAL GROWTH

Tester si la croissance modifie réellement les contraintes spatiales déjà existantes.

Au minimum :

### Compact

Résidences, producteurs et réseau proches.

### Corridor

Résidences éloignées des producteurs.

### Partition

Deux réseaux séparés.

### Extension

Une nouvelle zone résidentielle ajoutée à distance de la colonie initiale.

Mesurer :

* road cost ;
* network membership ;
* building access ;
* mobility eligibility ;
* workplace availability ;
* workforce assignment ;
* Food/Water consequences ;
* Material consequences.

Question centrale :

> L'agrandissement spatial transforme-t-il déjà une décision économique en décision de layout ?

---

# 7. POPULATION GROWTH FAILURE MODES

Chercher systématiquement les situations :

* Food shortage ;
* Water shortage ;
* absence de workforce ;
* trop de Farms ;
* trop de Wells ;
* trop de Workshops ;
* logements inutiles ;
* colonists sans emploi ;
* réseau résidentiel isolé ;
* bâtiment productif inaccessible ;
* Material bloqué ;
* construction impossible.

Pour chaque failure mode :

```text
recoverable
ou
terminal
```

et :

```text
player-controllable
ou
automatic
```

Ne propose pas encore de mécanisme de récupération.

---

# 8. MARGINAL VALUE OF HOUSING

Mesurer :

```text
Residence #1
Residence #2
Residence #3
Residence #4
...
```

en distinguant :

* housing capacity ;
* population effective ;
* population réellement admise ;
* workforce effectivement disponible ;
* production marginale ;
* consommation marginale.

Une Residence qui n'ajoute aucun colonist faute de Food/Water doit être documentée comme **capacité dormante**, pas comme nouveau système.

---

# 9. CANDIDATS DE CONSÉQUENCE

Sans implémenter, examiner uniquement les conséquences qui pourraient émerger naturellement du modèle.

### A — Population density / housing quality

Existe-t-il une pression réelle pour densifier plutôt que simplement construire davantage de Residences ?

### B — Service coverage

La croissance spatiale rend-elle nécessaire un service localisé supplémentaire ?

### C — Food distribution

Le modèle global Food commence-t-il à devenir trop abstrait avec la croissance ?

### D — Water distribution

Même question pour Water.

### E — Settlement stages

Les quantités actuelles produisent-elles naturellement des seuils significatifs permettant de faire émerger :

```text
Settlement → Village → Town
```

ou ces stages seraient-ils encore purement décoratifs ?

### F — Labor specialization

La taille de population rend-elle nécessaire une distinction entre types de travailleurs ?

Ne pas implémenter.

---

# 10. CLASSIFICATION

Pour chaque candidat :

* **A — fundamental**
* **B — useful but incomplete**
* **C — weak**
* **D — premature**
* **E — rejected**

Ne fais aucun classement entre les candidats.

Chaque classification doit être accompagnée de mesures.

Un candidat ne peut être A que s'il satisfait réellement les critères :

1. tension causale réelle ;
2. décision joueur ;
3. interaction avec au moins deux systèmes ;
4. pas de bootstrap irrécupérable ;
5. implémentation localisable ;
6. conséquence observable.

---

# 11. ARCHITECTURE

Vérifier :

* aucun changement persisté ;
* aucun état dérivé persistant ;
* aucun nouveau framework ;
* domaine/application/rendering toujours séparés ;
* déterminisme ;
* insertion-order invariance ;
* save/load.

**`src/` doit rester inchangé.**

---

# 12. TESTS

Ajouter uniquement les tests d'audit nécessaires.

Ils doivent rester dans le système d'audit existant.

Puis exécuter :

* full Vitest ;
* typecheck ;
* lint ;
* build.

Si le nombre de tests augmente, documenter :

```text
before:
after:
audit tests added:
```

---

# 13. RAPPORT FINAL

Créer :

`docs/roadmap/Step10AF.md`

Format :

```text
STEP 10AF — POPULATION GROWTH & SETTLEMENT CONSEQUENCE AUDIT

Starting commit:
Final commit:

Current causal model:
...

Population scaling:
...

Residence marginal value:
...

Marginal colonist:
...

Workforce scaling:
...

Spatial growth:
...

Failure modes:
...

Housing:
...

Candidate A:
Classification:
Evidence:

Candidate B:
Classification:
Evidence:

Candidate C:
Classification:
Evidence:

Candidate D:
Classification:
Evidence:

Candidate E:
Classification:
Evidence:

Candidate F:
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

## Final rule

Ne pas implémenter de nouveau système pendant 10AF.

Si aucun candidat ne satisfait les six critères :

```text
NO NEW SYSTEM JUSTIFIED
```

Si un candidat satisfait réellement les critères, documenter **pourquoi les mesures le démontrent**, sans encore l'implémenter.

Le but de 10AF est de trouver le prochain point de causalité réel du city-builder, pas d'augmenter artificiellement le nombre de mécaniques.

---
# STEP 10AF — POPULATION GROWTH & SETTLEMENT CONSEQUENCE AUDIT (report)

Audit-only. `src/` was NOT modified. Every number below is measured from the
running model by `tests/populationGrowthSettlementAudit.test.ts` (18 tests,
deterministic; `--reporter=verbose` prints the `AUDIT …` rows quoted here).

```text
STEP 10AF — POPULATION GROWTH & SETTLEMENT CONSEQUENCE AUDIT

Starting commit: deb6d32 ("Step 10AE: Water x construction x workforce economic pressure audit")
Final commit:    this commit

Current causal model: Residence -> capacity 1 -> admission (food AND Water production capacity
                 AND a free water-served Residence) -> 1 job per colonist -> Farm/Well/Workshop
                 -> Food/Water/Material -> construction -> more Residences.
                 The loop closes: ceil(P/2) Wells + ceil(P/2) Farms consume EXACTLY P workers,
                 leaving no labour for industry or further growth.

Population scaling: even populations are exactly self-balanced (food net 0, water net 0,
                 material 0, Workshop never staffed, storage 25 idle); odd populations always
                 leave one infrastructure slot vacant.

Residence marginal value: fixed Water capacity -> dormant capacity (R3..R6 add 0 colonists);
                 Water-matched -> every added Well unlocks up to two colonists.

Marginal colonist: +1 colonist is the ONLY addition that changes anything (+1 Material net,
                 -1 Food, -1 Water); +1 Farm / Well / Workshop / Residence with no free worker
                 changes NOTHING.

Workforce scaling: of the six explicit ratios, three are population-stable with material 0 and
                 three are industrial with a permanent Food deficit. None is both.

Spatial growth:   compact 11 road cells / 55 Material; corridor 13 / 65; partition 2 / 10 but
                 1 of 2 Residences loses Water service; extension 32 / 160 and one colonist
                 unemployed. Growth is already a layout decision.

Failure modes:    Food shortage = terminal + automatic; exact Water balance = permanent shortage
                 (steady state); everything else is player-controllable and non-terminal.

Housing:          capacity is exactly 1 per Residence; under one Well only 33% of a 6-Residence
                 settlement is usable -> dormant capacity, not a system.

Candidate A — Density / housing quality:   C — weak
Candidate B — Service coverage:            D — premature
Candidate C — Food distribution:           B — useful but incomplete
Candidate D — Water distribution:          C — weak
Candidate E — Settlement stages:           C — weak
Candidate F — Labor specialization:        D — premature

Architectural findings: persisted model unchanged (7 save keys), no derived state persisted,
                 no new framework, determinism + insertion-order invariance preserved.

Tests:            59 files / 1183 tests passed (before 58 / 1165; audit tests added 18).

Determinism:      same-run hash equal; insertion-order invariant; save/load unchanged; SAVE_VERSION 7.

Conclusion:       population growth is a CAPACITY, not an economic lever: the colony has no
                 endogenous labour surplus, so growth stops at the Water capacity and industry
                 costs a permanent Food deficit. No new consequence emerges from growth itself.

Next dependency:  NO NEW SYSTEM JUSTIFIED
```

## Current causal model (measured)

```text
Residence -> housing capacity (1 each)
  -> admission: free Residence AND Food > 0 after this tick's consumption
                AND (once a Well exists) Water-served Residence AND no shortage
                AND productionCapacity >= servedNeed + admissions + 1
  -> population -> workforce (exactly 1 job per colonist)
  -> Farm (2 Food), Well (2 Water), Workshop (2 Material, 1 upkeep)
  -> resources -> construction -> more buildings -> more housing
```

Measured admission limits (60 ticks, otherwise identical colonies):

| limit tested | fixture | population |
| --- | --- | --- |
| housing only (no Well) | 3 Residences, food 100000 | **3** |
| Water production capacity | 3 Residences, 1 Well, 2 colonists | **2** |
| Food below need | 2 colonists, food 1 | **0** (whole colony dies in one tick) |
| Food exactly balanced (no Well) | 4 Residences, 1 Farm, 2 colonists, food 0 | **2** (nobody admitted) |
| Food surplus (no Well) | 4 Residences, 2 Farms, 2 colonists, food 0 | **4** |
| Water priority with no Farm | 2 Wells + 1 Farm, 2 colonists | **0** (the Farm worker is gone) |

Where the loops stop:

* **admission** = min(housing, Water production capacity, Food).
* **workforce** = the population, with no specialist and no overtime; two colonists cannot run
  both Water headroom and Food.
* **material** = only a staffed Workshop produces, and the storage cap is 25 per operational
  Workshop (idle at 25 in every measured colony).
* **food** = uncapped; without a deficit there is no ceiling at all.

## Population scaling (balanced colony, tick 600)

`wells = ceil(P/2)`, `farms = ceil(P/2)`, `1 Workshop`, `residences = P`, `colonists = P`:

| P | workplaces | staffed Well/Farm/Ws | food prod/need | water prod/need | material gross/upkeep/net | storage | material | water |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 1 / 0 / 0 | 0 / 1 | 2 / 1 | 0 / 0 / 0 | 25 | 500 (seeded) | 650 |
| 2 | 3 | 1 / 1 / 0 | 2 / 2 | 2 / 2 | 0 / 0 / 0 | 25 | 500 | 50 |
| 3 | 5 | 2 / 1 / 0 | 2 / 3 | 4 / 3 | 0 / 0 / 0 | 25 | 500 | 650 |
| 4 | 5 | 2 / 2 / 0 | 4 / 4 | 4 / 4 | 0 / 0 / 0 | 25 | 500 | 50 |
| 6 | 7 | 3 / 3 / 0 | 6 / 6 | 6 / 6 | 0 / 0 / 0 | 25 | 500 | 50 |
| 8 | 9 | 4 / 4 / 0 | 8 / 8 | 8 / 8 | 0 / 0 / 0 | 25 | 500 | 50 |
| 10 | 11 | 5 / 5 / 0 | 10 / 10 | 10 / 10 | 0 / 0 / 0 | 25 | 500 | 50 |

Measured law: `workplaces = wells + farms + 1 >= P` in every row, so the Workshop never wins a
worker and Material stays exactly 0 at every population. Even populations are **exactly
self-balanced** (food net 0, water net 0); odd populations always leave one slot vacant
(`food net -1`, the Well surplus accumulating instead). Building more capacity does not change
this: it only adds vacant workplaces.

**The cost of one staffed Workshop** (remove the Farm that pays for its worker):

| P | farms kept | staffed Workshop | food net | material net |
| --- | --- | --- | --- | --- |
| 2 | 0 | 1 | **-2** | +1 |
| 4 | 1 | 1 | **-2** | +1 |
| 6 | 2 | 1 | **-2** | +1 |
| 8 | 3 | 1 | **-2** | +1 |
| 10 | 4 | 1 | **-2** | +1 |

The industrial deficit is a constant −2 Food/tick (one Farm is always the price of the Workshop
worker) while Material income is +1/tick and the storage cap is 25.

## Residence marginal value

Fixed Water capacity (1 Well = 2 colonists), 120 ticks:

| Residences | population | dormant capacity |
| --- | --- | --- |
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 4 | 2 | 2 |
| 5 | 2 | 3 |
| 6 | 2 | 4 |

Water-matched (`wells = ceil(R/2)`):

| Residences | Wells added | immediate cost | population |
| --- | --- | --- | --- |
| 2 | 1 | 25 | 2 |
| 3 | 2 | 50 | 3 |
| 4 | 2 | 50 | 4 |
| 5 | 3 | 75 | 5 |
| 6 | 3 | 75 | 6 |

**A Residence on its own only adds capacity.** Population only grows when the Water production
capacity grows with it, so the real decision is "Residence **or** Well", i.e. an existing Water
decision, not a housing decision. Capacity that cannot be used is documented as **dormant
capacity**, not a system.

## Marginal colonist versus one more building (60 ticks)

| change | population | food net | water net | material net | staffed |
| --- | --- | --- | --- | --- | --- |
| base: 2P / 1 Well / 1 Farm / 1 Workshop | 2 | 0 | 0 | 0 | Well + Farm |
| **+1 colonist** (audit-forced above the cap) | 3 | **-1** | **-1** | **+1** | Well + Farm + Workshop |
| +1 Farm | 2 | 0 | 0 | 0 | unchanged |
| +1 Well | 2 | 0 | 0 | 0 | unchanged |
| +1 Workshop | 2 | 0 | 0 | 0 | unchanged |
| +1 Residence | 2 | 0 | 0 | 0 | unchanged |

Every building added without a worker changes **nothing at all**; the third colonist is the only
addition that changes the economy, and it immediately buys +1 Material/tick at the price of a
permanent −1 Food and −1 Water balance. Population is therefore the lever, and it is capped by
Water, not by housing.

## Workforce scaling (six explicit ratios, 600 ticks)

| config | Wells | staffed Well/Farm/Ws | food prod/need | water prod/need | material gross/net | outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 2P/1F/1Ws | 1 | 1/1/0 | 2/2 | 2/2 | 0/0 | stable, no industry |
| 4P/2F/1Ws | 2 | 2/2/0 | 4/4 | 4/4 | 0/0 | stable, no industry |
| 4P/1F/2Ws | 2 | 2/1/1 | 2/4 | 4/4 | 2/+1 | industrial, food −2/tick |
| 6P/2F/2Ws | 3 | 3/2/1 | 4/6 | 6/6 | 2/+1 | industrial, food −2/tick |
| 6P/3F/1Ws | 3 | 3/3/0 | 6/6 | 6/6 | 0/0 | stable, no industry |
| 6P/1F/3Ws | 3 | 3/1/2 | 2/6 | 6/6 | 4/+2 | industrial, food −4/tick |

Measured dichotomy: **a configuration is either population-stable and Food-balanced with zero
industry, or industrial with a permanent Food deficit.** No measured configuration is both.

## Spatial growth (120 ticks)

| layout | road cells | road cost | networks | accessible | mobility-connected | served Residences | population | food net | water net | material net |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| compact | 11 | 55 | 1 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| corridor | 13 | 65 | 1 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| partition | 2 | 10 | 2 | 2 | 2 | **1** | 2 | 0 | +1 | 0 |
| extension | 32 | 160 | 1 | 4 | 3 | 4 | 4 | -2 | -2 | +1 |

Growth already turns economics into layout: the same 2 colonist / 1 Well / 1 Farm / 1 Workshop
colony costs 55, 65 or 10 Material in roads depending on the shape, a partitioned settlement
loses Water service on one network (the second Well costs 25 more), and the extension zone costs
160 Material in roads while leaving one colonist unemployed. All of this is produced by the
existing 09C/09D/09E/09K/09M systems — no new rule was needed to observe it.

## Failure modes (240 ticks)

| failure | population | food net | water net | shortage | leading block | recoverable | player-controllable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| food-shortage | 3 -> **0** | 0 | 0 | no | colony died (all-or-nothing) | **no (terminal)** | yes |
| water-shortage-transient | 3 -> 3 | -1 | **+1** | no | housing full | yes | yes |
| water-shortage-at-capacity | 3 -> **4** | 0 | 0 | **yes** | Water capacity (steady state) | no (steady) | yes (build a Well) |
| no-workforce | 1 -> 1 | -1 | +1 | no | housing full, 1 job | no (needs population) | yes |
| too-many-farms | 2 -> 2 | +2 | **-2** | yes | Well unstaffed (Water) | yes | yes |
| too-many-wells | 2 -> 2 | **-2** | +2 | no | Farm unstaffed (Food) | yes | yes |
| too-many-workshops | 2 -> 2 | 0 | 0 | no | industry worker absent | yes | yes |
| useless-housing | 2 -> 2 | 0 | 0 | no | dormant capacity | yes (harmless) | yes |
| unemployed-colonists | 3 -> 3 | -1 | 0 | no | housing full | yes (inert) | yes |
| isolated-residential-network | 1 -> 1 | -1 | +1 | no | 1 unserved Residence | yes | yes |
| inaccessible-productive-building | 1 -> 1 | -1 | +1 | no | producer unstaffed | yes | yes |
| material-blocked | 2 -> 2 | 0 | 0 | no | no Workshop worker | yes | yes |
| construction-impossible | 2 -> 2 | -2 | +2 | no | no Material and no Water | yes | yes |

Two structural results: **Food shortage is the only terminal failure** (the colony is wiped in one
tick and, with production 0, never recovers); and **a colony that fills its Water capacity sits
permanently in `waterShortage`** because production equals consumption and the stock returns to 0
every tick — shortage is the *steady state* of a full colony, not a failure.

## Housing

| Residences | housing capacity | effective population | dormant capacity | marginal production |
| --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 0 | - |
| 2 | 2 | 2 | 0 | +1 colonist |
| 3 | 3 | 2 | 1 | **0** |
| 4 | 4 | 2 | 2 | **0** |
| 5 | 5 | 2 | 3 | **0** |
| 6 | 6 | 2 | 4 | **0** |

Housing capacity is exactly 1 per Residence and is usable only up to the Water production
capacity (2 per staffed Well). Under one Well a 6-Residence settlement uses 33% of its capacity:
the rest is **dormant capacity**, not a new system.

## Candidate A — Population density / housing quality

**Classification: C — weak.** Evidence: capacity is exactly 1 per Residence
(`perResidenceCapacity = 1`) and only 33% of a 6-Residence settlement's capacity is usable under
one Well; there is no density, quality or per-cell concept anywhere in the runtime. Densifying
would therefore be a presentation score with no consumer, and it would not change the binding
constraint (Water production capacity).

## Candidate B — Service coverage

**Classification: D — premature.** Evidence: the Water service is *already* localized by road
network — with 2 isolated networks, 1 of 2 Residences is unserved and the settlement must build a
second Well (+25 Material) — so the localized-service dependency that this candidate would add
already exists in the model. A second service would duplicate the pattern without a new consumer
consequence (10AE reached "B — useful but incomplete" for a *new* service's dependency; this
measurement shows the dependency is already provided).

## Candidate C — Food distribution

**Classification: B — useful but incomplete.** Evidence: Food is produced and consumed
colony-wide with no distance term (2 networks, isolated Farm, `foodNet 0`, population fed), while
Water is already localized through 09D networks + 09E access. A local Food model would reuse the
existing coverage primitives and would create a real farm-placement decision, but the missing
piece is a *consequence* — and the only Food consequence that exists (starvation) is already
terminal and already global.

## Candidate D — Water distribution

**Classification: C — weak.** Evidence: Water is already distributed by network: with 2 networks
and 2 Wells, both Residences and both colonists are served (`servedResidences = 2`), and with 1
Well exactly 1 network is served. Nothing can be added without duplicating `getWaterCoverage`.

## Candidate E — Settlement stages (Settlement -> Village -> Town)

**Classification: C — weak.** Evidence: objective thresholds already exist and scale cleanly
(P = 1/2/4/6/8/10 -> 4/5/9/13/17/21 buildings, 9/11/19/27/35/43 road cells, Water capacity
2/2/4/6/8/10), but nothing in the runtime consumes a stage value. The quantities are real; the
stages would be decorative until a consumer exists.

## Candidate F — Labor specialization

**Classification: D — premature.** Evidence: with 6 colonists and 8 workplaces the assignment
is fully determined by 09K connectivity + 09M distance-then-id, and the colonists carry no
worker attribute at all (`workerAttributes = 0`). Specialization would *add* a constraint rather
than express an existing tension, and no measured configuration is limited by worker *type* —
only by worker *count*.

No ranking between candidates is implied (as required).

## Architectural findings

* persisted model unchanged: save top level = `config, time, resources, buildings, roads,
  colonists, counters`; `SAVE_VERSION` stays 7;
* no derived state persisted: `coverage` / `mobility` / `networkId` / `served` / `staffed` /
  `density` are absent from the canonical payload;
* domain / application / rendering separation unchanged, no new framework, no UI import into the
  domain (the audit reads `@/index` only);
* determinism preserved: two identical 200-tick runs hash identically and reversing the record
  key insertion order leaves the canonical hash unchanged;
* the placement contract is unchanged (Workshop still `insufficientWater` without Water);
* the audit itself is `src`-immutable (only `tests/` and this document changed).

## Tests

```text
before:            58 files / 1165 tests
after:             59 files / 1183 tests
audit tests added: 18 (tests/populationGrowthSettlementAudit.test.ts)
```

`typecheck`, `lint`, `build`: passed.

## Determinism

Same scenario twice => same canonical hash (measured); insertion-order invariance over
`buildings` / `roads` / `colonists` => same hash (measured); save/load unchanged.

## Conclusion

Colony growth does not currently produce a new consequence strong enough to justify Phase 5.
The measured structure is:

* **the growth loop is closed**: `ceil(P/2)` Wells + `ceil(P/2)` Farms consume exactly `P`
  workers for `P` colonists, so the colony has **no endogenous labour surplus**;
* **industry is a deficit**, not an upgrade: the Workshop worker always costs exactly −2 Food/tick
  (measured for every even population 2..10), and the storage cap stops the benefit at 25;
* **population is capacity-gated, not lever-driven**: extra Residences are dormant capacity, and
  only a Water-capacity increase lets population grow;
* **the only structural failure is Food** (terminal, all-or-nothing); exact Water balance is the
  normal steady state of a full colony.

What growth *does* produce is already a decision — but it is the existing *workforce allocation*
(Water vs Food vs Material) and the existing *layout* decision (road cost, network membership,
service coverage), both of which are already modelled by 09C/09D/09E/09K/09M and 10P/10S.

## Next dependency

Applying the six criteria to the candidate table:

| criterion | A Density | B Service | C Food distr. | D Water distr. | E Stages | F Specialization |
| --- | --- | --- | --- | --- | --- | --- |
| 1 real causal tension | weak | no (exists) | yes | no (exists) | no | no (adds one) |
| 2 understandable decision | no | no | yes | no | no | partial |
| 3 interacts with >= 2 systems | no | no | yes (roads, farms, population) | no | no | yes |
| 4 no unrecoverable bootstrap loop | yes | yes | yes | yes | yes | yes |
| 5 reasonably local implementation | yes | yes | yes | yes | yes | yes |
| 6 observable simulation consequence | no | no | yes (but duplicate of starvation) | no | no | yes |

No candidate satisfies all six: A/D/E describe something the runtime already models or does not
consume, B duplicates the localized Water service, F adds a dimension where only a count is
binding, and C is a real tension that lacks a non-duplicative consequence (classified B).

```text
NO NEW SYSTEM JUSTIFIED
```

Recommendation: do not implement a growth system. The next useful measurement is the *consequence*
axis identified above — the **dormant-capacity state** (a colony can hold population capacity it
can never use, and industry it can never staff) and whether one narrowly scoped consumer can make
that state a decision without adding a resource, a building or a framework. Until such a consumer
is measured, no new system should be implemented.

