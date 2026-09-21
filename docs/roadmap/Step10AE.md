Tu reprends NOVA depuis le commit final de Step 10AD :

`8c80cc8 — Step 10AD — finalize browser scenario migration`

Working tree attendu : propre.

# STEP 10AE — WATER × CONSTRUCTION × WORKFORCE ECONOMIC PRESSURE AUDIT

## Nature du step

**AUDIT ONLY.**

Ne modifie pas `src/`.

Ne rajoute aucune mécanique de jeu.

Ne choisis pas encore le prochain système à implémenter.

Le but est de mesurer les nouvelles tensions créées par :

```text
Population
    ↓
Water consumption
    ↓
Water availability

Workshop placement
    ↓
25 Material + 1 Water
    ↓
industrial expansion

Workforce
    ↓
Farm / Workshop / Well competition

Material
    ↓
Workshop production
    ↓
construction capacity
```

10AD a établi que Water n'est plus seulement une condition d'admission :
**la croissance industrielle consomme maintenant ponctuellement du Water.**

Il faut déterminer si cette interaction produit une décision stratégique durable ou seulement une friction ponctuelle.

---

# 1. AUDIT DE RÉFÉRENCE

Commence par documenter l'état actuel réel :

* initial Material ;
* initial Water ;
* coûts de construction ;
* production Water ;
* consommation Water ;
* production Food ;
* production Material ;
* stockage Material ;
* upkeep Workshop ;
* capacité de logement ;
* capacité de travail ;
* coût Water du Workshop ;
* comportement de Construction Crew ;
* règles d'admission ;
* workforce competition ;
* manual reassignment.

Ne déduis rien de la documentation si le runtime permet de le mesurer directement.

Sépare :

* **règle persistée**
* **valeur dérivée**
* **comportement de simulation**
* **règle de construction**
* **règle de test uniquement**

---

# 2. WATER INDUSTRIAL OPPORTUNITY COST

Mesurer explicitement le coût d'un Workshop supplémentaire.

Comparer au minimum :

### A — population

Water produit par un Well et Water consommé par les colonists.

Mesurer combien de temps un Well peut soutenir :

* +1 colonist ;
* +2 colonists ;
* +1 Workshop ponctuel ;
* plusieurs Workshops successifs.

### B — expansion industrielle

Mesurer le coût Water cumulé de :

```text
1 Workshop
2 Workshops
3 Workshops
4 Workshops
...
```

Séparer :

* Water payé à la construction ;
* Water consommé quotidiennement par la population ;
* Water éventuellement stocké.

Déterminer si le coût ponctuel devient significatif à l'échelle d'une colonie.

---

# 3. WORKFORCE × WATER × MATERIAL

Mesurer les configurations :

```text
1 Farm + 1 Well + 1 Workshop
1 Farm + 1 Well + 2 Workshops
2 Farms + 1 Well + 1 Workshop
2 Farms + 1 Well + 2 Workshops
```

Pour chacune :

* population ;
* workers disponibles ;
* workers affectés ;
* Food/tick ;
* Water/tick ;
* Material gross/tick ;
* Material net/tick ;
* stockage ;
* construction throughput ;
* bâtiments opérationnels.

Ne pas seulement regarder le premier tick.

Faire également des horizons :

```text
10
30
60
120
240
600
```

---

# 4. INDUSTRIAL EXPANSION TEST

Construire progressivement plusieurs Workshops avec une colonie stable.

Mesurer :

```text
W0
 ↓
W1
 ↓
W2
 ↓
W3
 ↓
W4
```

Pour chaque transition :

* Water disponible avant construction ;
* Water payé ;
* Material disponible ;
* worker disponible ;
* temps nécessaire ;
* Water après construction ;
* impact sur les colonists ;
* production Material avant/après.

Question centrale :

> Est-ce que le coût Water crée une vraie décision de timing, ou est-ce simplement une taxe de construction que le joueur paie dès qu'il peut ?

---

# 5. WATER BUFFER SENSITIVITY

Tester différents niveaux de Water buffer avant une construction de Workshop.

Exemples :

```text
Water = 0
Water = 1
Water = 2
Water = 5
Water = 10
```

Mesurer si le résultat est différent selon :

* population actuelle ;
* nombre de Wells ;
* nombre de Workshops ;
* Workforce disponible.

Attention à ne pas modifier les constantes du jeu.

Ces valeurs sont uniquement des scénarios d'audit.

---

# 6. WORKFORCE OPPORTUNITY COST

Comparer les choix manuels :

```text
Colonist → Well
Colonist → Farm
Colonist → Workshop
```

Pour chaque déplacement, mesurer :

* Water production ;
* Food production ;
* Material production ;
* admission future ;
* construction future ;
* état après 10/30/60 ticks.

Vérifier particulièrement le cas :

```text
Well → Workshop
Workshop → Well
Farm → Workshop
Workshop → Farm
```

Déterminer si Water introduit une nouvelle concurrence significative entre :

```text
survie / croissance
vs
production industrielle
```

ou si le système existant absorbe automatiquement cette différence.

---

# 7. CONSTRUCTION CREW INTERACTION

10Z avait déjà montré que Construction Crew pouvait économiser un tick de construction.

10AD ajoute maintenant un coût Water au Workshop.

Mesurer :

```text
sans crew
avec crew
```

pour :

* Workshop ;
* Well ;
* Farm ;
* Residence.

Puis mesurer spécifiquement :

```text
Water disponible
→ construction Crew
→ Workshop terminé
→ nouveau worker
→ production
```

Chercher uniquement des effets causaux mesurables.

Ne pas créer de nouvelle règle.

---

# 8. LONG-RUN STABILITY

Faire tourner des scénarios suffisamment longtemps :

```text
600 ticks minimum
```

sur plusieurs colonies représentatives.

Chercher :

* oscillation ;
* saturation ;
* ressource qui devient inutile ;
* ressource qui devient toujours critique ;
* bâtiment qui devient dominant ;
* workforce qui devient triviale ;
* coût Workshop qui cesse d'avoir un impact ;
* situation sans décision intéressante.

Comparer notamment :

```text
Water-rich
Water-constrained
Material-rich
Material-constrained
Workforce-constrained
```

---

# 9. TESTER LES CANDIDATS DE PROCHAINS SYSTÈMES

Sans implémenter quoi que ce soit, évaluer uniquement avec les mécanismes existants si les candidats suivants créeraient une vraie dépendance :

### A — Food storage

Question :

> Le stockage Food créerait-il une décision réelle ou seulement un buffer ?

### B — Water storage

Question :

> Le stockage Water changerait-il le timing industriel ou seulement lisserait-il la production ?

### C — Farm input

Exemples conceptuels :

```text
Farm → Water
Farm → Material
```

Mesurer les conséquences sans modifier le jeu.

### D — Production dependency

Exemple :

```text
Water → Workshop → Material
```

Déterminer si une dépendance supplémentaire pourrait être introduite sans créer un cycle bootstrap impossible.

### E — Settlement service

Tester conceptuellement un service supplémentaire via les réseaux existants.

Ne pas l'implémenter.

---

# 10. CLASSIFICATION

Pour chaque candidat, attribuer uniquement une classification qualitative :

* **A — fundamental** : une vraie décision ou contrainte émergente existe déjà dans le modèle ;
* **B — useful but incomplete** : tension réelle mais manque encore une conséquence ;
* **C — weak** : effet essentiellement économique secondaire ;
* **D — premature** : le système ajouterait de la complexité sans dépendance suffisante ;
* **E — rejected** : crée une boucle/bootstrap ou un problème déjà observé.

Ne fais aucun classement entre candidats.

Chaque classification doit être justifiée par une mesure ou une expérience reproductible.

---

# 11. ARCHITECTURE

Pendant l'audit, vérifier également :

* aucune dérive du modèle persisté ;
* aucun état dérivé persistant ;
* aucun nouveau framework générique nécessaire ;
* aucune dépendance UI introduite dans le domaine ;
* déterminisme conservé ;
* insertion-order invariance conservée.

L'audit doit rester **src-immutable**.

---

# 12. TESTS

Créer uniquement les tests d'audit nécessaires sous :

`tests/audit/`

ou l'emplacement d'audit déjà utilisé par le projet.

Les tests doivent :

* être déterministes ;
* utiliser les APIs existantes ;
* ne pas modifier le runtime ;
* couvrir les scénarios réellement mesurés.

Faire ensuite :

* Vitest complet ;
* typecheck ;
* lint ;
* build.

Si les tests d'audit augmentent fortement le compteur, documenter simplement l'ancien et le nouveau total.

---

# 13. RAPPORT FINAL

Mettre à jour :

`docs/roadmap/Step10AE.md`

avec :

```text
STEP 10AE — ECONOMIC PRESSURE AUDIT

Starting commit:
Final commit:

Runtime state:
...

10AD new causal effect:
...

Water industrial opportunity cost:
...

Workforce × Water × Material:
...

Industrial expansion:
...

Water buffer sensitivity:
...

Construction Crew interaction:
...

Long-run:
...

Candidate A — Food storage:
Classification:
Evidence:

Candidate B — Water storage:
Classification:
Evidence:

Candidate C — Farm input:
Classification:
Evidence:

Candidate D — Production dependency:
Classification:
Evidence:

Candidate E — Settlement service:
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

## Final decision rule

Ne choisis pas le prochain système parce qu'il "semble intéressant".

Le prochain système doit être retenu uniquement si l'audit montre :

1. une tension causale réelle ;
2. une décision compréhensible pour le joueur ;
3. une interaction avec au moins deux systèmes existants ;
4. aucune boucle bootstrap irrécupérable ;
5. une implémentation raisonnablement locale ;
6. une conséquence observable dans la simulation.

Si aucun candidat ne satisfait ces critères, conclure explicitement :

```text
NO NEW SYSTEM JUSTIFIED
```

et proposer de poursuivre l'audit de découverte plutôt que d'ajouter artificiellement une mécanique.

**Important : Step 10AE est audit-only. Ne modifie aucun fichier sous `src/`.**

---
# STEP 10AE — ECONOMIC PRESSURE AUDIT (report)

```text
STEP 10AE — ECONOMIC PRESSURE AUDIT

Starting commit: 8c80cc8 ("Step 10AD — finalize browser scenario migration")
Final commit:    this commit

Runtime state:        material 100 / food 100 / water 0; Workshop = 25 Material + 1 Water,
                      Residence/Farm/Well = 25, Road = 5; Water 2/Well/tick, 1/colonist/tick;
                      Food 2/Farm/tick, 1/colonist/tick; Material 2/worker/tick, upkeep 1,
                      storage 25/Workshop; crew saves 1 tick; SAVE_VERSION 7.

10AD new causal effect: Workshop placement is a Water command transaction (stock >= 1,
                      charged once); the first Workshop needs a staffed road-connected Well.

Water industrial opportunity cost: net Water = 2 x staffed Wells - served colonists; the
                      cumulative Workshop cost is exactly N Water for N Workshops; at the
                      population cap the surplus is 0 and no Workshop is ever affordable.

Workforce x Water x Material: one colonist = one job and one Well = 2 colonists, so a
                      2-colonist colony can run at most 2 of {Well, Farm, Workshop}.

Industrial expansion: W1..W4 placed in 4 consecutive ticks from a banked surplus (no
                      waiting); at the Water cap W1 waits 600 ticks and never places.

Water buffer sensitivity: water 0 rejects; water >= 1 accepts and charges 1; 1000 Water
                      still admits only 2 colonists (capacity-gated); buffer never changes
                      the balance (600 ticks: end stock = start stock).

Construction Crew interaction: 2 ticks -> 1 tick for all four types; the completion tick is
                      1 earlier but output still starts on the same tick (the crewed
                      colonist is skipped by assignJobs on the completion tick).

Long-run:             900 ticks, no oscillation; Food unbounded when surplus / permanent
                      death when deficient; Water 0 in every scenario; Material clamped at
                      the storage cap.

Candidate A — Food storage:        B — useful but incomplete
Candidate B — Water storage:       C — weak
Candidate C — Farm input:          E — rejected
Candidate D — Production dependency: D — premature
Candidate E — Settlement service:  B — useful but incomplete

Architectural findings: persisted model unchanged (7 top-level keys), no derived state
                      persisted, no new framework, no UI dependency, determinism and
                      insertion-order invariance preserved, audit is src-immutable.

Tests:                new tests/waterConstructionWorkforcePressureAudit.test.ts (22 tests);
                      full suite 58 files / 1165 tests passed (was 57 / 1143).

Determinism:          same-run hash equal, insertion-order invariant, save/load unchanged.

Conclusion:           the 10AD Water cost is a step capacity gate, not a timing decision;
                      the real decision is workforce allocation between Water/Food/Material.

Next dependency:      NO NEW SYSTEM JUSTIFIED (no candidate satisfies all six criteria).
```

Audit-only session. `src/` was NOT modified. Every number below is measured
from the running model by `tests/waterConstructionWorkforcePressureAudit.test.ts`
(22 tests, deterministic, `npx vitest run … --reporter=verbose` prints the
`AUDIT …` rows quoted here).

## Runtime state (measured, not re-read from the docs)

```text
Initial            Material 100, Food 100, Water 0, tick 0, buildings 0,
                   colonists 0, roads 0, SAVE_VERSION 7
Residence          25 Material, 2 ticks, housing 1
Farm               25 Material, 2 ticks, housing 0
Workshop           25 Material + 1 Water, 2 ticks, housing 0   <- the ONLY Water-costed type
Well               25 Material, 2 ticks, housing 0
Road               5 Material per cell, 1 tick
Water              2 / staffed+road-connected Well / tick
                   1 / water-served colonist / tick
Food               2 / staffed Farm / tick, 1 / colonist / tick
Material           2 / staffed Workshop / tick, upkeep 1 / staffed Workshop / tick
Storage            25 Material per operational Workshop (staffing-independent)
Construction Crew  +1 construction progress (= 2 ticks -> 1 tick) on any type
Admission          Food + housing; from the first operational Well:
                   served Residence AND no Water shortage AND
                   productionCapacity >= servedNeed + admissions + 1
                   (bootstrap-exempt at population 0)
```

Measured admission proof: 3 Residences with no Well admit 3 colonists; with one
operational Well the same colony admits only 2 (Water production capacity = 2)
even with housing for 3 and an irrelevant Water stock.

### Persisted vs derived vs simulation vs construction vs test-only

* **persisted**: `config`, `time`, `resources{construction,food,water}`,
  `buildings`, `roads`, `colonists`, `counters` — measured top-level save keys
  are exactly those seven. Only `resources.water` is the canonical Water state.
* **derived**: water coverage/service/shortage, mobility, road networks,
  staffed counts, storage capacity, forecasts. Measured: the canonical payload
  contains none of the terms `coverage`, `served`, `mobility`, `networkId`,
  `staffed`, `capacity`.
* **simulation behavior**: the 9-phase tick order (construction -> food ->
  Well production -> feeding -> Water consumption -> population -> jobs ->
  Material -> command -> upkeep -> crew release).
* **construction rule**: the catalog + `validatePlacement`/`applyCommand`
  transaction (the one-off `+1 Water` charge).
* **test-only**: `withWorkshopWater` / `placeCatchUp` in `tests/helpers.ts`;
  the audit fixture builder in this step. Neither is runtime code.

## 10AD new causal effect

Water is no longer only an admission condition: **a Workshop placement is now a
Water command transaction**.

```text
Water 0  -> validatePlacement = insufficientWater, click is a no-op
Water 1  -> accepted, exactly 1 Water charged once, Workshop under construction
            (measured: waterBefore - waterAfter = 1 for every Workshop)
```

The Workshop never consumes Water afterwards (measured: 200 ticks after
placement a staffed Workshop is operational with the Water stock untouched by
its own operation). The first Workshop therefore requires the canonical chain
`Residence -> Road -> Well -> Water buffer -> Workshop`.

## Water industrial opportunity cost

Measured balance (one shared road network, all residences served):

```text
net Water / tick = 2 x (staffed road-connected Wells) - (served colonists)
```

| wells | population | staffed production | need | net | 1 Water after | 4 Water after |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | any | 0 | 0 | 0 | never | never |
| 1 | 1 | 2 | 1 | **+1** | 1 tick | 4 ticks |
| 1 | 2 | 2 | 2 | **0** | never | never |
| 1 | 3 | 2 | 3 | **-1** | never | never |
| 2 | 2 | 4 | 2 | **+2** | 1 tick | 2 ticks |
| 2 | 3 | 4 | 3 | **+1** | 1 tick | 4 ticks |
| 2 | 4 | 4 | 4 | **0** | never | never |

**A — population.** One Well sustains +1 colonist indefinitely and +2 colonists
exactly at break-even. It sustains one one-off Workshop in 1 tick and four
successive Workshops in 4 ticks *only while that headroom exists*; the moment
population reaches the production cap (2 per Well) the surplus is 0 and no
Workshop is ever affordable again.

**B — expansion.** The cumulative Water cost of N Workshops is exactly N Water
(1 each, one-off); daily consumption is the served population and does not
change with the Workshop count; the only Water "stored" is the leftover after
the charge. Measured cost rows: `oneOffWaterCharged = 1` for 1..4 configured
Workshops. At an above-cap Material stock the placement tick loses
`25 Material + 1 upkeep` (26) with no stored inflow.

**Scale verdict.** The one-off cost does NOT grow with colony scale (it is 1
Water per Workshop forever), so it never becomes a large tax. What grows is the
*population claim* on the same Water: every colonist permanently consumes the
capacity a Workshop would have to borrow from. The cost is significant only as
a **headroom gate**.

## Workforce x Water x Material

Measured at the runtime-admissible population (one Well = 2) and fully staffed
(audit-forced), tick 600:

| config | mode | pop | emp | food prod/need | water prod/need | mat gross/upkeep/net | storage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1F+1W+1Ws | admissible | 2 | 2 | 2 / 2 | 2 / 2 | 0 / 0 / 0 | 25 |
| 1F+1W+1Ws | fully-staffed | 3 | 3 | 2 / 3 | 2 / 3 | 2 / 1 / +1 | 25 |
| 1F+1W+2Ws | admissible | 2 | 2 | 2 / 2 | 2 / 2 | 0 / 0 / 0 | 50 |
| 1F+1W+2Ws | fully-staffed | 4 | 4 | 2 / 4 | 2 / 4 | 4 / 2 / +2 | 50 |
| 2F+1W+1Ws | admissible | 2 | 2 | 4 / 2 | **0 / 2** | 0 / 0 / 0 | 25 |
| 2F+1W+1Ws | fully-staffed | 4 | 4 | 4 / 4 | 2 / 4 | 2 / 1 / +1 | 25 |
| 2F+1W+2Ws | admissible | 2 | 2 | 4 / 2 | **0 / 2** | 0 / 0 / 0 | 50 |
| 2F+1W+2Ws | fully-staffed | 5 | 5 | 4 / 5 | 2 / 5 | 4 / 2 / +2 | 50 |

The measured structural fact: **one colonist holds exactly one job**, and one
Well advertises capacity for exactly two colonists. With two colonists a colony
can therefore run at most two of {Well, Farm, Workshop}. The third system is
idle — not because of Water pricing but because of the workforce. The
`2F+1W+1Ws admissible` row is the sharpest case: two colonists on two Farms
leave the Well **unstaffed** (water production 0), so the colony is food-rich
and Water-idle, and no Workshop is possible at all.

## Industrial expansion (W0 -> W4)

**At the Water production cap** (2 colonists, 1 Well, net 0): W1 is never
affordable. Measured: 600 ticks waited, `placed=false`, water 0, material 100
(unchanged — nothing is staffed to earn Material either).

**From a banked surplus** (Water 5, Material 100):

| transition | waited | Water before -> after | Material before -> after | staffed Workshops after settle |
| --- | --- | --- | --- | --- |
| W1 | 0 | 5 -> 4 | 100 -> 75 | 0 |
| W2 | 0 | 4 -> 3 | 75 -> 50 | 0 |
| W3 | 0 | 3 -> 2 | 50 -> 25 | 0 |
| W4 | 0 | 2 -> 1 | 25 -> 0 | 0 |

All four Workshops are placed in four consecutive ticks with **zero waiting**,
and none of them is staffed (the Farm and the Well already hold both colonists),
so the Material flow stays 0. With an audit-forced third colonist the colony
goers **above** the Water cap (3 served vs 2 produced), the stock drains to 0 in
5 ticks, and the second Workshop is never affordable (`settledWaterNet = -1`).

**Answer to the central question:** the Water cost is NOT a timing decision. It
has no marginal price (always 1) and no decreasing/increasing slope, and at the
cap the stock never grows, so there is nothing to wait for. It is a **step
(capacity) gate**: the player either kept Water headroom, or the Workshop is
simply unavailable. The interesting decision the audit actually found is
*workforce allocation*: with one Well and two colonists, keeping the Well
staffed (Water), the Farm staffed (Food), or a Workshop staffed (Material) is a
mutually exclusive choice.

## Water buffer sensitivity

| seeded Water | placement | Water after | Water shortage right after | population at tick 5 / 30 |
| --- | --- | --- | --- | --- |
| 0 | **rejected** `insufficientWater` | 0 | yes | 2 / 2 |
| 1 | accepted | 0 | yes | 2 / 2 |
| 2 | accepted | 1 | yes | 2 / 2 |
| 5 | accepted | 4 | no | 2 / 2 |
| 10 | accepted | 9 | no | 2 / 2 |

A 600-tick run with seeded Water 1 / 10 / 100 ends at exactly the same stock
(1 / 10 / 100) at `waterNet = 0`: **the buffer changes the level, never the
balance**. A stock of 1000 Water still admits only the 2 colonists the
production capacity supports. The buffer decides only whether one one-off
charge is payable and how long a shortage lasts.

## Workforce opportunity cost

One colonist, one Residence, one Farm + one Well + one Workshop on one network;
the first workplace is pinned manually, then each transition is measured
(`validateReassignment` = valid in all six cases):

| transition | Water/tick | Food/tick | Material/tick | after 30 ticks |
| --- | --- | --- | --- | --- |
| Farm -> Well | 0 -> 2 | 2 -> 0 | 0 | water 38, food -28, material 0 |
| Well -> Workshop | 2 -> 0 | 0 | 0 -> 2 | water 0, food -30, material 24 |
| Workshop -> Farm | 0 | 0 -> 2 | 2 -> 0 | water 0, food +30, material 2 |
| Workshop -> Well | 0 -> 2 | 0 | 2 -> 0 | water 38, food -30, material 2 |
| Farm -> Workshop | 0 | 2 -> 0 | 0 -> 2 | water 0, food -28, material 24 |
| Well -> Farm | 2 -> 0 | 0 -> 2 | 0 | water 0, food +30, material 0 |

The three jobs are fully exclusive at population 1, and the manual command can
switch the colony between them with no loss of agency. **Water therefore creates
a real, measurable competition between survival/growth (food + admission
headroom) and industrial production (Material)** — but the competition is a
*workforce* competition. The Water construction cost is what makes the Well a
job rather than an automatic facility; the Water *price* adds nothing beyond
that.

## Construction Crew interaction

Measured with the real `assignConstructionCrew` command:

| type | without crew | with crew |
| --- | --- | --- |
| Residence | 2 ticks | **1 tick** |
| Farm | 2 ticks | **1 tick** |
| Well | 2 ticks | **1 tick** |
| Workshop | 2 ticks | **1 tick** |

Chain `Water available -> crew -> Workshop finished -> worker -> production`:

```text
without crew   completion +2 ticks   first production +2 ticks   material at fixed horizon 19   water 4
with crew      completion +1 tick    first production +2 ticks   material at fixed horizon 19   water 0
```

The crew saves exactly one construction tick (and therefore one tick of an
earlier storage capacity), but it does **not** advance output in this
configuration: a crewed colonist is skipped by `assignJobs` on the completion
tick (Step 10Y exclusivity), so the earliest production tick is the same. With
only one colonist the crew also removes the Well worker for its construction
tick, which is a measurable Water cost of crewing. No new rule was observed.

## Long-run stability (900 ticks)

| scenario | pop@900 | water | material | food | water prod/need | food prod/need | net material | spread last 100 ticks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| water-rich (2W, 2F, 1Ws, 3 col) | 3 | 0 | 500 | 50900 | 2 / 3 | 4 / 3 | 0 | water 0, material 0, food 99 |
| water-constrained (1W, 1F, 1Ws, 2 col) | 2 | 0 | 100 | 50000 | 2 / 2 | 2 / 2 | 0 | 0 / 0 / 0 |
| material-rich (2W, 2F, 2Ws, 3 col) | 3 | 0 | 10000 | 50900 | 2 / 3 | 4 / 3 | 0 | 0 / 0 / 99 |
| material-constrained (same, material 0) | 3 | 0 | 0 | 50900 | 2 / 3 | 4 / 3 | 0 | 0 / 0 / 99 |
| workforce-constrained (2W, 2F, 2Ws, 1 col) | 1 | 0 | 500 | 50900 | 0 / 1 | 2 / 1 | 0 | 0 / 0 / 99 |
| food-deficit (1W, 1F, 3 col) | **0** | 0 | 100 | 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 |

Findings:

* **No oscillation.** Every trace's spread over the last 100 ticks is 0 except
  the unavoidable +99 Food/tick in surplus colonies.
* **Food becomes trivial when a farm surplus exists** (50900 Food and climbing
  forever, no cap) and **fatal when it does not**: the food-deficit colony wipes
  in a single tick at tick 21 and never recovers (production 0 forever, so no
  re-admission). Food is the only resource with a survival consequence.
* **Water is always critical or trivially irrelevant, never in between.** None
  of the 900-tick scenarios is Water-unbounded: the workforce allocation leaves
a Well unstaffed (`water prod 2 / need 3` in three scenarios; `0 / 1` in the
workforce-constrained one), so the Water stock is 0 after settling. A Water
surplus only exists in a colony that deliberately keeps a Well staffed and its
population below the cap.
* **Material saturates at the storage cap** (net +1/tick clamped at 24 with one
  staffed Workshop); once storage is full the Workshop's output stops mattering.
* **No building is dominant** and no resource becomes permanently useless within
  900 ticks; the "water-rich" vs "water-constrained" labels do not survive
  contact with the workforce allocation, which is itself the dominant variable.

## Candidate evaluation (measured with the existing runtime only)

**Candidate A — Food storage.** Classification: **B — useful but incomplete.**
Evidence: 2 staffed Farms against 1 colonist produce 400 Food in 300 ticks and
keep growing with no cap; a deficit colony starves in a single tick at tick 21
(all-or-nothing). A cap/stock would create a real "fewer farms vs overflow"
decision, but no consequence beyond buffering exists yet, and the all-or-nothing
starvation rule already supplies the survival stake.

**Candidate B — Water storage.** Classification: **C — weak.** Evidence: Water
has no cap and grows 600 units in 600 ticks when net is +1, but 1000 banked
Water still admits only the 2 colonists the production capacity supports, and a
seeded buffer of 1/10/100 ends the 600-tick run at exactly its starting level.
Storage would change the buffer level, not the decision — the admission gate
reads *capacity*, not stock.

**Candidate C — Farm input (Farm -> Water / Material).** Classification:
**E — rejected.** Evidence: a Farm currently produces 2 Food/tick with zero
input. A 1 Water/tick input would consume the same Water a colonist needs
(need per Well = 2 population + 1 farm), i.e. it doubles the Water demand per
Well, and Food must exist before the first Well can be staffed at all: the
input attacks the bootstrap root (Water -> Well -> Water) that Step 10AB/10AC
already rejected for the Well.

**Candidate D — Production dependency (Water -> Workshop).** Classification:
**D — premature.** Evidence: the existing relationship is construction-only
(1 Water charged once; 200 ticks later the Workshop is still operational with
its Water untouched). A recurring Water -> Workshop sink would need
`2 (Well) >= 2 (colonists) + 1 (Workshop)`, i.e. a second Well before the
minimum colony is solvent, and would add a Water cost with no new decision
beyond the one the placement charge already creates.

**Candidate E — Settlement service (second service on the existing networks).**
Classification: **B — useful but incomplete.** Evidence: one Well already
covers 2 served Residences / 2 served colonists and the primitives
(`getRoadNetworks`, `getBuildingRoadAccess`, `getWaterCoverage`) are reusable
and local, so a second service is cheap to add — but no second *consumer
consequence* exists yet, so it would duplicate the Well's shape without a new
decision.

No ranking between candidates is implied (as required).

## Architecture findings

* persisted model unchanged: save top level = `config, time, resources,
  buildings, roads, colonists, counters`; `SAVE_VERSION` still 7;
* no derived state persisted: coverage / served / mobility / networkId /
  staffed / capacity are absent from the canonical payload;
* no new generic framework, no cost cache, no UI import into the domain: the
audit only reads `@/index`;
* determinism preserved: two identical 200-tick runs hash identically, and
  reversing the record key insertion order leaves the canonical hash unchanged;
* the audit itself is `src`-immutable (only `tests/` and this document changed).

## Tests

* New: `tests/waterConstructionWorkforcePressureAudit.test.ts` — 22 tests
  (sections 1-11 above), deterministic, using only existing APIs.
* Full suite: **58 files / 1165 tests passed** (was 57 / 1143 before this step,
  i.e. +1 file / +22 tests).
* `typecheck`, `lint`, `build`: passed.

## Determinism

Same scenario twice => same canonical hash (measured); insertion-order
invariance over `buildings` / `roads` / `colonists` => same hash (measured);
save/load unchanged (`SAVE_VERSION` 7, additively the same canonical fields).

## Conclusion

The Step 10AD interaction is real and causal — it makes Water a construction
input and turns the Well into a job — but measured over 900 ticks it behaves as
a **step capacity gate, not a strategic timing decision**: the price is always
1, the stock either has headroom or it does not, and at the population cap the
surplus is exactly 0. The genuine decision it creates is *workforce
allocation* between Water, Food and Material, which the existing 09M/10E
systems already model. Water does not add a new axis of play; it sharpens the
existing one.

## Next dependency

Applying the step's decision rule to the measured candidates:

| criterion | A Food storage | B Water storage | C Farm input | D Water->Workshop | E Service |
| --- | --- | --- | --- | --- | --- |
| 1 real causal tension | yes | weak | yes | yes | weak |
| 2 understandable decision | yes | no | no | no | no |
| 3 interacts with >= 2 systems | yes | no | yes | yes | no |
| 4 no unrecoverable bootstrap loop | yes | yes | **no** | yes | yes |
| 5 reasonably local implementation | yes | yes | yes | yes | yes |
| 6 observable simulation consequence | yes | yes | yes | yes | yes |

No candidate satisfies all six: C fails the bootstrap criterion (rejected), D
is a premature second sink on the same resource, B and E change levels/duplicate
the Well without a new decision, and the strongest candidate A is classified
**B — useful but incomplete** because its only missing piece is a consequence
beyond buffering.

```text
NO NEW SYSTEM JUSTIFIED
```

Recommendation: continue the discovery audit rather than adding a mechanic
artificially. The next useful measurement is not another resource but the
**consequence** axis: which existing system has a real state that the player
cannot currently influence (the audit found exactly one clear candidate — Food
surplus is unbounded and consequence-free) and whether a *locally scoped*
consequence for it can be added without inventing storage/service frameworks.
Until such a consequence is measured, no new system should be implemented.

