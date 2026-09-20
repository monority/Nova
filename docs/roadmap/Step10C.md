# NOVA — Step 10C — Food Security Pressure Audit

## Mission

Perform a **design + architecture audit only** of the Food Security system established by Step 10A.

This is an **audit step**.

Do not add a new need.
Do not add a generic needs framework.
Do not add Food logistics.
Do not add transport mechanics.
Do not modify `src/` unless a purely diagnostic/test hook is absolutely necessary; prefer tests only.
Do not begin the next gameplay mechanic.

The purpose is to answer one question:

> **Does the current Food Security system create meaningful spatial/economic pressure, and if not, what is the smallest missing causal rule?**

The answer must be based on executable scenarios, not intuition.

---

# 1. Start from the current repository

Parent implementation:

```text
Step 10A
commit: 62febd9
parent: 50d6b46
```

First inspect:

* current git status;
* `docs/roadmap/Step10A.md`;
* current Food domain/application code;
* Food tests;
* population update;
* Farm production;
* resource handling;
* current road/mobility systems;
* current roadmap after the user's renaming to Step10C.

Confirm the repository is actually at the expected 10A state before running the audit.

Do not assume the roadmap document naming is still identical to the previous version.

---

# 2. Establish the current causal chain

Document the exact implemented chain:

```text
population
→ foodNeed
→ farm production
→ food stock
→ consumption
→ satisfaction / shortage
→ population consequence
```

Record:

* Food need coefficient;
* Farm production coefficient;
* construction cost;
* construction duration;
* Food stock behavior;
* population admission behavior;
* famine behavior;
* tick ordering;
* whether Food is spatially blind;
* whether roads affect any Food rule.

Separate:

### Existing rules

What already exists in code.

### Derived observations

What can be calculated from existing state.

### Design consequences

What those rules actually cause when the player builds a settlement.

Do not turn an observation into a new rule during this audit.

---

# 3. Baseline bootstrap audit

Reproduce the current bootstrap sequence from a fresh deterministic world.

Record at each relevant tick:

```text
tick
population
food stock
food need
food produced
food consumed
food shortage
farms
residences
materials
```

Determine:

1. When does the first colonist appear?
2. When can the first Farm become operational?
3. When does Food first become a constraint?
4. Can the colony reach a stable Food-positive state?
5. Can the colony enter famine?
6. What player action causes famine?
7. Is Food ever a reason to choose one spatial layout over another?

Do not change any coefficient.

---

# 4. Controlled Food pressure experiments

Construct deterministic scenarios that vary **one factor at a time**.

At minimum:

## A — No Farm

Measure:

```text
population
foodNeed
foodStock
shortage
population consequence
```

Purpose:

Determine the exact starvation pressure without production.

---

## B — One Farm

Compare against A.

Determine:

* whether one Farm can sustain the initial colony;
* sustainable population implied by current production;
* whether excess production accumulates;
* whether storage can become a meaningful constraint.

---

## C — Multiple Farms

Test at least:

```text
1 Farm
2 Farms
3 Farms
```

Measure:

```text
production
consumption
stock trajectory
population
```

Determine whether additional Farms create a meaningful decision or merely linear surplus.

---

## D — Farm timing

Compare:

```text
Farm built early
Farm built late
```

with otherwise identical commands.

Determine whether timing produces meaningful Food pressure.

---

## E — Residence growth

Test increasing residential capacity/population while holding Farm count constant.

Determine:

* whether Food becomes a growth constraint;
* whether growth creates a meaningful tradeoff;
* whether the player has to anticipate Food demand.

---

## F — Food surplus

Create a scenario where production substantially exceeds consumption.

Determine:

* whether surplus accumulates indefinitely;
* whether storage constrains it;
* whether excess Food has any gameplay consequence;
* whether additional Farms eventually become economically meaningless.

Do not add a storage rule.

The purpose is only to document the current behavior.

---

# 5. Spatial pressure audit

Food is intentionally independent from transport.

That remains true.

However, determine whether Food nevertheless creates **indirect spatial pressure** through the existing construction/resource system.

Test scenarios such as:

### Scenario G — Farm placement

Place equivalent Farms at different coordinates.

Verify whether simulation outcome differs.

Expected likely result:

```text
same Farm count
same operational state
same production
same Food outcome
```

If so, document that Farm geometry currently has no effect.

---

### Scenario H — Residence/Farm geometry

Create identical settlements with:

```text
Residence near Farm
Residence far from Farm
```

Do not introduce logistics.

Measure whether any existing rule distinguishes them.

If not, document the absence of spatial Food pressure.

---

### Scenario I — Roads

Repeat equivalent Food scenarios with:

```text
no roads
roads
different road topology
```

Food results must remain equivalent.

This is a regression proof, not a request for Food transport.

---

# 6. Economic pressure audit

Food currently consumes no Material directly.

Audit whether Food nevertheless competes indirectly for Material through construction.

Compare:

```text
more Residences
more Farms
more Workshops
```

under otherwise equivalent conditions.

Measure:

* Material expenditure;
* Food trajectory;
* population;
* productive capacity;
* upkeep;
* construction opportunity cost.

Determine whether the existing economy creates a meaningful tradeoff:

```text
housing growth
vs
food security
vs
industrial capacity
```

Do not add money.

Do not add Food cost.

Do not rebalance coefficients.

The audit must describe the pressure that already exists.

---

# 7. Identify the actual bottleneck

Classify Food Security into one of these categories:

### A — Strong pressure

Food already creates meaningful decisions through existing rules.

### B — Weak pressure

Food can constrain growth, but the player has limited meaningful choices.

### C — Linear accounting

Food mostly behaves as:

```text
population × coefficient
vs
farms × coefficient
```

with little strategic consequence.

### D — Purely informational

Food rarely constrains the player under normal settlement development.

Do not choose the category from intuition.

Use the measured scenarios.

---

# 8. Find the smallest missing causal rule

If Food is not yet strategically meaningful, identify **exactly one smallest missing causal dependency**.

Examples of possible categories:

```text
capacity
placement
maintenance
production input
population demand
growth dependency
```

But these are only investigation categories.

Do NOT automatically implement any of them.

For the candidate rule, document:

1. what existing state it consumes;
2. what existing rule it modifies;
3. what new decision it creates;
4. why it belongs in Phase 3;
5. why it does not prematurely introduce Phase 4/5/8/9 mechanics;
6. what minimum test would prove it meaningful.

If no missing rule is justified, explicitly say:

```text
NO NEW RULE JUSTIFIED
```

---

# 9. Explicitly reject design drift

The audit must verify that the following remain deferred:

* food road access;
* food network connectivity;
* food delivery;
* farm/residence mobility;
* road distance for food;
* food logistics;
* vehicles;
* cargo;
* generic needs framework;
* multiple simultaneous needs;
* food workers;
* food-specific transport;
* arbitrary balancing changes.

Also do not use the audit as justification to reopen 09M/09N.

---

# 10. Tests

Add audit tests under:

```text
tests/foodSecurityPressureAudit.test.ts
```

Tests must encode the experiments.

They should verify deterministic observations such as:

* baseline bootstrap;
* no Farm;
* 1/2/3 Farms;
* early/late Farm;
* increasing residential capacity;
* surplus Food;
* Farm coordinate equivalence;
* Residence/Farm distance equivalence;
* road topology equivalence;
* Material competition.

Do not modify production rules to make the audit scenarios interesting.

The tests are evidence.

They are not new gameplay rules.

---

# 11. Determinism and regression

Run:

```text
Vitest
lint
typecheck
build
relevant E2E
determinism replay
save/load
hash comparison
```

Expected:

* all existing tests remain green;
* no persistence changes;
* `SAVE_VERSION = 4`;
* canonical hash unchanged for equivalent scenarios;
* repeated audit scenarios produce identical observations.

If browser verification is useful for any scenario, run it.

If GPU verification is available, run it.

Do not create UI solely for this audit.

---

# 12. Documentation

Create/update:

```text
docs/roadmap/Step10C.md
```

This document must be an **audit report**, not a future implementation specification.

Required sections:

```text
1. Scope
2. Existing Food Contract
3. Bootstrap Measurements
4. Controlled Experiments
5. Spatial Pressure
6. Economic Pressure
7. Food/Transport Isolation
8. Bottleneck Classification
9. Missing Causal Dependency
10. Candidate Next Rule
11. Deferred Mechanics
12. Verification
13. Final Design Decision
```

Include actual measured values.

Do not write vague conclusions such as:

> Food seems balanced.

Instead provide concrete observations:

```text
1 Farm → X Food/tick
Population → Y need/tick
Net → Z Food/tick
```

and explain the resulting trajectory.

---

# 13. Critical design constraint

Do not rebalance Food during this audit.

No coefficient changes.

No new costs.

No new capacity.

No new storage.

No road interaction.

No new state.

No generic architecture.

The purpose is to discover what the existing system teaches us.

---

# 14. Commit discipline

Before changes:

```text
git status
git log -1 --oneline
```

Expected latest commit:

```text
62febd9
```

During the audit:

* tests are allowed;
* documentation is allowed;
* production gameplay changes are not;
* do not modify previous Step10A history;
* do not start implementation of the candidate next rule.

Commit only:

```text
docs/roadmap/Step10C.md
tests/foodSecurityPressureAudit.test.ts
```

plus strictly necessary audit-only files.

Suggested commit:

```text
Step 10C: audit food security pressure
```

---

# 15. Final report

Return:

## A. Repository state

* starting commit;
* final commit;
* files changed.

## B. Food measurements

Provide the important numeric trajectories.

## C. Scenario results

Summarize A–I and the economic experiments.

## D. Pressure classification

Choose exactly one:

```text
A — Strong pressure
B — Weak pressure
C — Linear accounting
D — Purely informational
```

and justify it with measurements.

## E. Smallest missing causal rule

Either:

```text
NO NEW RULE JUSTIFIED
```

or identify exactly one candidate dependency.

Do not implement it.

## F. Transport isolation

Explicitly confirm Food remains independent from:

* roads;
* networks;
* mobility;
* distance;
* topology.

## G. Verification

Report:

* Vitest total;
* lint;
* typecheck;
* build;
* E2E;
* determinism;
* persistence/hash;
* GPU/browser status.

## H. Scope verdict

Return exactly one:

```text
COMPLETE — AUDIT
```

or

```text
BLOCKED
```

Do not begin the candidate next gameplay rule.

The most important output of Step10C is **not code**.

It is a measured answer to:

> What does Food Security actually make the player care about today, and what is the smallest causal dependency missing from that loop?


---

# As-Built — Audit Report (Step 10C: audit food security pressure)

Exécuté au commit `62febd9` (Step 10A). Audit uniquement : **zéro modification
de `src/`**, zéro rééquilibrage, zéro nouvelle règle. Seuls ajoutés :
`tests/foodSecurityPressureAudit.test.ts` (14 tests) + ce rapport.

## 1. Scope

- NEW `tests/foodSecurityPressureAudit.test.ts` — 14 tests d'audit (§3–§6, §11).
- APPENDED ce rapport à `docs/roadmap/Step10C.md` (prompt préservé, rien remplacé).
- Rien d'autre. `src/`, `e2e/`, configs, existants : intacts.

## 2. Existing Food Contract

Confirmé à `62febd9`, identique au contrat Step 10A :

```text
foodNeed       = population x 1            (updateNeeds, dérivé, jamais stocké)
foodProduced   = fermes opérationnelles x 2 (produceFood, sans gate routière)
foodConsumed   = min(stock avant, besoin)  (consumeFood, all-or-nothing)
foodShortage   = besoin - consommé         (dérivé, jamais persisté)
foodStock      >= 0                        (jamais négatif)
```

Ordre des ticks (step.ts, inchangé) : advanceConstruction → updateNeeds →
produceFood → consumeFood → updatePopulation → assignJobs → produceMaterial →
applyCommand → progressPlaced* → upkeepBuildings → advanceTime.

Règles existantes (code) vs observations dérivées vs conséquences design :
tout ce qui suit est mesuré sur le code existant, aucune observation n'est
devenue une règle.

## 3. Bootstrap Measurements

Séquence : résidence tick 1, ferme tick 2. Table mesurée
(`tests/foodSecurityPressureAudit.test.ts`, log BOOTSTRAP) :

```text
t  pop  food  need  prod  mat  farms  res
1  0    100   0     0     75   0      1
2  1    100   1     0     50   1      1
3  1    101   1     2     50   1      1
4  1    102   1     2     50   1      1
5  1    103   1     2     50   1      1
6  1    104   1     2     50   1      1
7  1    105   1     2     50   1      1
8  1    106   1     2     50   1      1
```

Réponses §3 :

1. Premier colonist : **tick 2** (bâtiment placé tick T → opérationnel tick T+1,
   admission fin de tick).
2. Première ferme opérationnelle : **tick 3** (placée tick 2), production same-tick.
3. Food devient contrainte : jamais dans cette séquence (net +1/tick) ;
   après 40 ticks food = 138, aucune famine.
4. État food-positif stable : **oui**, atteignable et monotone.
5. Famine : uniquement si le joueur ignore la production (voir §4A/§4E).
6. Action causant famine : construire des résidences sans ferme suffisante, ou
   attendre l'épuisement du stock initial (100) sans production.
7. Food = raison de choisir un layout spatial : **non** (voir §5).

Dynamiques confirmées : admission remplit TOUTES les résidences op libres tant
que food > 0 (post-consommation) ; nouveau colonist mangé au tick suivant ;
placement rejeté silencieusement si stock Material insuffisant (4 résidences =
100, une 5e construction est rejetée sans erreur — observé en test).

## 4. Controlled Experiments

**A — No Farm** : stock 100, pop 1 → 100 fed ticks, **famine tick 101**
(pop 0, food 0). Pression de famine pure, entièrement temporelle.

**B/C — Farm count** : 1/2/3 fermes → production 2/4/6 (strictement linéaire) ;
net vs pop 1 : **+1/+3/+5 par tick**. Population soutenable par ferme = 2
(break-even mesuré : pop 2 + 1 ferme → food constant ; pop 3 → décroissance
exacte **-1/tick**).

**D — Farm timing** : ferme tick 2 vs tick 51 → écart food **98 (= 49 x 2)**
au tick 60, pop 1 des deux côtés, **aucune famine ni d'un côté ni de l'autre**.
Le timing ne crée de pression que via le buffer, jamais via un seuil.

**E — Residence growth** : ferme + 3 résidences (budget 100 épuisé) →
pop 3 au tick 5, décroissance **-1/tick depuis food 105**, famine ~tick 111.
L'admission (food > 0) crée le dépassement : le joueur peut construire une
famine à retardement.

**F — Surplus** : 3 fermes, pop 1 → **+5/tick linéaire pour toujours**
(mesuré 103 + 50 x 5 = 353, aucun cap, pop 1 inchangé). Les fermes
supplémentaires deviennent économiquement vides : aucun usage du surplus
au-delà du seuil d'admission (food > 0).

**Finding majeur — boom-bust** : après famine la colonie re-boome : les fermes
produisent sans population, l'admission remplit dès food > 0, nouvelle famine.
Oscillation mesurée ticks 120–144 : `pop 3, food 2 → 3, 1 → 3, 0 → 0, 0 →
3, 2 → …` (période 4, indéfinie). **La famine n'est pas absorbante.** Ceci
affaiblit la pression de famine : l'échec ne coûte qu'un cycle de 4 ticks.

## 5. Spatial Pressure

**G — Farm placement** : mêmes fermes en (5,5), (7,7), résidence en (1,1) vs
(6,1)/(1,6) → pop, food, production **identiques**. Géométrie ferme sans effet.

**H — Residence near vs far** : résidence (2,2) vs (7,7), ferme (1,1) →
food identique (+2 − 1 dans les deux cas). Aucune règle ne distingue.

**Conclusion §5** : **zéro pression spatiale food**. La géométrie des fermes et
résidences n'a aucun effet mesurable.

## 6. Economic Pressure

Budget 100 Material, deux colonies réelles (commandes uniquement) :

- **HOUSING** (2 résidences + 1 ferme = 75) : pop 2, food plat (2 − 2, mesuré
  constant), material 25 figé, upkeep 0. Sécurité alimentaire, aucune industrie.
- **INDUSTRY** (1 résidence + 1 workshop + 2 routes = 60) : pop 1, food −1/tick
  (pas de ferme), worker employé, upkeep 1/tick. Mesuré : material 40 → 32
  sur 8 ticks (**-1/tick**, pas +1).

**Finding majeur — storage cap** : stock 40 > cap 25 (1 workshop) → la
production Material est **rejetée silencieusement** tant que stock > cap ;
seul l'upkeep (−1/tick) draine. L'industrie construite à stock élevé ne produit
rien pendant 15 ticks. Documenté dans le test (40 − 8 = 32).

Tradeoff mesuré : housing = food plat mais jamais de Material ; industry =
Material futur mais brûle le stock food ET est throttlée par le cap au départ.
La pression économique existe, mais elle vient du budget construction et du
cap de stockage — pas de la food elle-même.

## 7. Food/Transport Isolation

Confirmé par tests : topologies no-road / straight / loop → food, population,
production **byte-identiques** (2 ticks consécutifs mesurés). Food reste
indépendante de : routes, réseaux, mobilité, distance, topologie. Régression
transport : road + transport E2E ALL PASS.

## 8. Bottleneck Classification

```text
C — Linear accounting
```

Justification par mesures :

- La food se comporte en `population x 1 vs fermes x 2` : comptabilité linéaire
  (B/C/F). Le joueur optimise un ratio, pas une stratégie.
- La famine existe (A/E) mais le **boom-bust** (§4) la rend non absorbante :
  l'échec coûte un cycle de 4 ticks, pas la colonie (elle re-boome seule).
- **Zéro pression spatiale** (§5) : aucun layout ne bat un autre à food égale.
- La seule pression indirecte (budget Material, cap stockage) n'est pas de la
  food (§6).
- Pas B (weak) : même la contrainte de croissance est prévisible et
  contournable par le ratio 2:1. Pas D (purement informationnel) : la famine
  et l'overshoot existent et se mesurent. **C est la catégorie correcte.**

## 9. Missing Causal Dependency

Le système manque d'une dépendance qui rendrait la food stratégique :
aujourd'hui rien ne lie la production alimentaire à la population active
(les fermes produisent sans workers, sans placement, sans coût récurrent),
rien ne rend le surplus utile, et la famine s'auto-répare.

## 10. Candidate Next Rule

**Candidat unique : farm employment (production input).**

1. Consomme : l'affectation existante `assignJobs` (un colonist = un poste ;
   ferme = lieu de travail au même titre que le workshop).
2. Modifie : `produceFood` — une ferme ne produit que si elle est
   opérationnelle ET dotée d'un worker (miroir exact de la règle 09F Material).
3. Nouvelle décision : chaque colonist travaille ferme OU workshop —
   sécurité alimentaire vs capacité industrielle deviennent rivales pour la
   même ressource rare (le travail). Le ratio 2:1 cesse d'être gratuit.
4. Phase 3 : c'est une dépendance **population demand** (besoin satisfait par
   le travail des colonists), pas une chaîne de production (Phase 8).
5. Pas de mécanique Phase 4/5/8/9 : pas d'input matériel, pas de monnaie,
   pas de logistique, pas de transport, pas de generic needs.
6. Test minimal de preuve : colonie pop 1 + 1 ferme + 1 workshop → food +2
   ssi le worker est à la ferme ; à l'atelier → material +2 mais food −1/tick
   → famine mesurable à horizon fini. Si la distance/choix d'emploi (09M)
   arbitre entre les deux postes, la pression spatiale apparaît gratuitement.

Alternative considérée et rejetée : gate d'admission sur food soutenable
(admettre seulement si production ≥ besoin). Rejetée car elle SUPPRIME la
pression de famine (plus d'overshoot possible) au lieu d'en créer une.

**Règle NON implémentée ici** (audit uniquement). Décision d'implémentation :
prochain step gameplay.

## 11. Deferred Mechanics

Vérifié toujours différés, aucun rouvert par cet audit :

- food road access, food network connectivity, food delivery,
  farm/residence mobility, road distance for food, food logistics,
  vehicles, cargo, generic needs framework, multiple simultaneous needs,
  food workers (= le candidat §10, documenté mais non implémenté),
  food-specific transport, arbitrary balancing changes.
- 09M/09N non rouverts. Aucun coefficient modifié (coûts 25, food 1/2,
  INITIAL_FOOD 100, cap stockage 25 : tous intacts).

## 12. Verification

```text
pnpm test        → 486 passed (486) / 29 fichiers  (avant: 472 / 28; +14 audit, 0 affaibli)
pnpm lint        → clean (2 directives corrigées pendant l'audit)
pnpm typecheck   → clean
pnpm build       → success (0 erreur)
E2E food/production/resource/temporal/road/transport → ALL PASS, 0 console error
E2E GPU          → ALL PASS
SAVE_VERSION     → 4 (inchangé)
Nouveaux champs persistés/hashés → 0
Replay/déterminisme → hash stable, audit rejoué identique
```

## 13. Final Design Decision

Réponse à la question de mission : **le système Food Security actuel ne crée
pas de pression spatiale/économique significative** (catégorie C — linear
accounting). Ce qu'il fait payer au joueur : le ratio 2:1 (anticipation
ferme-vs-résidences sur budget 100) et la famine en cas d'overshoot — mais la
famine s'auto-répare en cycle boom-bust de période 4, et aucun layout spatial
ne surperforme un autre.

La plus petite dépendance causale manquante : **farm employment** (§10) —
prochain step gameplay recommandé. Aucun approfondissement transport requis ;
aucun rebalancement requis.

Record classification :

```text
DISCOVERED  boom-bust post-famine (période 4, famine non absorbante) ; storage cap Material rejette silencieusement la production (stock > 25) ; placement rejeté silencieusement si budget insuffisant ; admission remplit toutes les résidences op (overshoot structurel)
DERIVED     toutes les métriques d'audit (trajectoires, nets, famine ticks) — calculées en tests, jamais stockées
INTENTIONAL audit uniquement ; zéro changement src/ ; transport reste hors food ; candidat farm employment documenté mais non implémenté
DEFERRED    voir §11 (logistique, distance, needs génériques, rebalancement)
```
