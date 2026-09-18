# NOVA — Step 08B — Operational Upkeep Design Contract

## Context

NOVA est un city-builder/simulation déterministe.

L'audit économique Step 08A est terminé.

Verdict :

```text
STATUS: READY FOR DESIGN CONTRACT
```

La boucle actuelle est :

```text
Residence
→ Housing
→ Colonist
→ Food / Farm
→ Workshop
→ Material
→ More buildings
```

Le problème identifié est structurel :

```text
Workshop
→ Worker
→ +2 material/tick
→ More Workshops
→ More Workers
→ More Material
→ ...
```

Après stabilisation de la nourriture, le matériau devient progressivement non contraint.

L'audit a démontré :

* 1 worker = +2 material/tick ;
* coût de construction = 25 material ;
* 1 worker peut générer un coût de bâtiment en ~12.5 ticks ;
* avec plusieurs workers, le temps entre constructions diminue ;
* après `Residence + Farm + Workshop`, la rareté devient principalement temporelle ;
* il n'existe actuellement qu'un sink majeur : la construction ;
* aucun upkeep n'existe ;
* Money/Income/Demand n'est pas encore suffisamment défini pour être un système utile.

L'audit recommande donc un seul prochain mécanisme :

```text
Operational buildings
→ Material upkeep
→ recurring material sink
```

Ce step est **DESIGN ONLY**.

---

# Mission

Produire le **design contract complet et minimal de l'Operational Upkeep**.

Ne rien implémenter.

Ne modifier aucun fichier de gameplay.

Ne modifier aucun comportement existant.

Ne modifier ni Farm, ni Food, ni Workshop, ni Jobs.

Le résultat doit être suffisamment précis pour qu'un prochain Step 08C puisse implémenter le mécanisme sans prendre de décisions de game design supplémentaires.

---

# 1. Read the authoritative documentation

Relire au minimum :

```text
docs/06-*
docs/08-economy.md
docs/09-economy-foundation.md
docs/11-time-and-events.md
docs/18-*
docs/20-*
docs/21-progression.md
docs/26-roadmap.md
docs/28-*
docs/29-design-rules.md
docs/30-*
docs/31-*
```

Relire également :

* Step 07B — Jobs Design Contract
* Step 07C — Jobs Implementation
* Step 08A — Economy / Progression Audit

Identifier précisément toutes les règles déjà établies concernant :

* maintenance ;
* recurring costs ;
* resource sinks ;
* operational buildings ;
* shortage ;
* production;
* construction;
* failure consequences;
* deterministic phase ordering.

Ne pas remplacer une règle documentée par une préférence personnelle.

---

# 2. Preserve existing semantics

Le nouveau système doit préserver strictement :

### Food

```text
Food consumption = population × 1
Farm production = operational farms × 2
```

### Jobs

```text
employed colonists × 2 material/tick
```

### Construction

```text
25 material
2 ticks
```

### Buildings

```text
Residence
Farm
Workshop
```

doivent conserver leurs coûts, capacités et comportements actuels.

L'upkeep est un nouveau sink.

Il ne doit pas devenir :

* une nouvelle ressource ;
* une nouvelle need ;
* une nouvelle abstraction générique ;
* une nouvelle économie monétaire ;
* un remplacement du système Food ;
* une dépendance du Farm à des workers.

---

# 3. Define exactly what has upkeep

Le concept doit être précisément défini.

Décider et documenter :

```text
Quels bâtiments paient l'upkeep ?
```

Le point de départ attendu est :

```text
TOUS LES BÂTIMENTS OPÉRATIONNELS
```

mais cela doit être confirmé contre la documentation.

Important :

```text
underConstruction → aucun upkeep
operational → upkeep
```

Un bâtiment détruit/non présent ne coûte rien.

Un bâtiment qui devient opérationnel au début d'un tick doit-il payer son upkeep sur ce même tick ?

Cette question doit être explicitement tranchée.

La règle doit être cohérente avec les précédentes décisions de NOVA concernant les transitions same-tick.

---

# 4. Define the upkeep amount

C'est la principale décision de design.

Le contrat doit définir une valeur concrète :

```text
MATERIAL_UPKEEP_PER_OPERATIONAL_BUILDING_PER_TICK = X
```

Ne pas simplement écrire :

```text
X à déterminer
```

Le prochain step d'implémentation ne doit pas avoir à choisir le montant.

Cependant, le montant doit être justifié quantitativement.

Analyser plusieurs valeurs possibles, par exemple :

```text
0.5
1
2
```

ou d'autres valeurs si les simulations montrent qu'elles sont plus cohérentes.

Comparer chaque valeur avec :

```text
material production
building cost
food production
population scaling
workforce scaling
```

Le résultat doit expliquer pourquoi la valeur retenue crée un sink significatif sans rendre la progression impossible.

Attention aux types :

Le projet utilise actuellement des ressources entières.

Déterminer si l'upkeep doit donc être :

```text
entier par bâtiment/tick
```

ou si le domaine doit introduire une mécanique décimale.

Ne pas introduire des décimales uniquement pour obtenir un meilleur balancing.

Le contrat doit privilégier la cohérence avec le modèle actuel.

---

# 5. Define the exact tick order

C'est obligatoire.

Le système actuel est :

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ assignJobs
→ produceMaterial
→ advanceTime
```

L'upkeep doit être positionné explicitement.

Le point de départ attendu est :

```text
produceMaterial
→ upkeep
→ advanceTime
```

mais cette proposition doit être analysée et validée.

Le contrat doit répondre précisément à :

### Case A — Worker produces material

```text
worker production
→ upkeep
```

### Case B — no workers

```text
material production = 0
→ upkeep still occurs?
```

### Case C — starvation

Si la colonie meurt pendant `updatePopulation` :

```text
colonists = 0
```

mais les bâtiments opérationnels existent toujours.

Doivent-ils payer l'upkeep sur ce même tick ?

Attention :

Le système actuel établit déjà que la starvation annule la material production du tick.

Il faut donc déterminer la relation exacte :

```text
starvation
→ population removed
→ jobs removed
→ material production = 0
→ upkeep ?
```

Ne pas supposer.

Documenter une règle déterministe.

---

# 6. Define insufficient-material behavior

C'est le point le plus important.

Que se passe-t-il lorsque :

```text
material < upkeep
```

?

Plusieurs possibilités existent :

### Option A — upkeep all-or-nothing

Si le stock ne suffit pas :

```text
no upkeep charged
```

### Option B — partial payment

```text
material → 0
```

avec un bâtiment partiellement entretenu.

### Option C — operational failure

Un bâtiment incapable de payer son upkeep devient :

```text
inactive / non-operational
```

### Option D — another documented consequence

Seulement si la documentation existante l'impose.

Ne choisissez pas simplement la solution qui semble intéressante.

Analysez :

* les règles existantes ;
* les implications sur Food ;
* les implications sur Jobs ;
* les implications sur production ;
* les risques de soft-lock ;
* les risques de feedback loops ;
* la possibilité de recovery.

---

# 7. Avoid catastrophic recursive failure unless explicitly justified

Attention au scénario :

```text
Material shortage
→ Workshop loses operation
→ Worker disappears
→ Material production decreases
→ More buildings cannot pay upkeep
→ More buildings lose operation
→ ...
```

Cela pourrait créer un effondrement économique en cascade.

Il faut explicitement analyser cette possibilité.

Question fondamentale :

> L'upkeep doit-il simplement ralentir la croissance, ou peut-il provoquer une contraction de l'économie ?

Les deux sont possibles, mais le choix doit être intentionnel et documenté.

Tester conceptuellement :

```text
1 worker
1 Workshop
```

puis :

```text
4 workers
4 Workshops
```

et :

```text
4 workers
10 operational buildings
```

---

# 8. Preserve recovery

Le système doit permettre une récupération compréhensible.

Définir :

```text
What happens after upkeep shortage?
```

Exemples :

```text
material reaches 0
→ construction stops
→ existing production continues
→ material can recover
```

ou autre comportement documenté.

Il faut notamment éviter un état :

```text
zero material
+
zero workers
+
no possible recovery
```

sauf si cette conséquence est explicitement voulue par le game design.

Le contrat doit démontrer qu'un joueur peut comprendre comment sortir d'un déficit.

---

# 9. Analyze economic equations

Établir les équations exactes.

Avec :

```text
W = employed workers
B = operational buildings
P = population
F = operational farms
U = upkeep per operational building
```

Définir :

```text
materialProduction = W × 2
materialUpkeep = B × U
netMaterial = materialProduction - materialUpkeep
```

Puis analyser :

```text
netMaterial > 0
netMaterial = 0
netMaterial < 0
```

Faire la même analyse pour Food :

```text
foodProduction = F × 2
foodConsumption = P × 1
netFood = foodProduction - foodConsumption
```

Le but est de comprendre les deux gouverneurs :

```text
Food → population viability
Material → infrastructure viability
```

---

# 10. Runaway analysis

Reprendre le scénario identifié en Step 08A :

```text
1 worker
→ 2 workers
→ 3 workers
→ 4 workers
```

et appliquer différents niveaux d'upkeep.

Pour chaque valeur candidate, déterminer :

```text
workers
buildings
material/tick
upkeep/tick
net material/tick
```

Déterminer si l'économie :

```text
A. explose
B. croît durablement
C. atteint un équilibre
D. devient négative
```

Le contrat doit choisir un comportement cible.

Ne pas chercher nécessairement un équilibre mathématique parfait.

Le but est de créer une contrainte économique récurrente et compréhensible.

---

# 11. Building choice analysis

L'upkeep doit réintroduire un coût d'opportunité entre :

```text
Residence
Farm
Workshop
```

Analyser :

### Residence

Coût :

```text
25 material
```

Effets :

```text
+1 housing
→ potential colonist
→ +1 food consumption
→ potential worker
```

### Farm

Coût :

```text
25 material
```

Effets :

```text
+2 food/tick
```

### Workshop

Coût :

```text
25 material
```

Effets :

```text
+1 job capacity
→ potential worker
→ +2 material/tick
```

Ajouter l'upkeep et déterminer si les trois choix restent économiquement distincts.

Ne pas équilibrer les trois bâtiments artificiellement.

---

# 12. Define the exact player-visible consequences

L'upkeep est un système invisible s'il n'est pas expliqué.

Le contrat doit définir le minimum de feedback nécessaire.

Exemples :

```text
1 workshop produced 2 material · upkeep 1
```

ou :

```text
2 workers produced 4 material · buildings consumed 3 upkeep
```

ou une autre formulation cohérente avec l'UX existante.

Le système actuel utilise déjà des messages causaux.

Le design doit préserver cette philosophie :

```text
cause → flow → consequence
```

Ne pas créer de dashboard.

Ne pas créer de nouvelle page.

Ne pas créer de système de notification complexe.

---

# 13. Define derived queries

Identifier précisément quelles valeurs doivent être dérivées plutôt que stockées.

Potentiellement :

```text
getMaterialUpkeepPerTick(state)
getNetMaterialPerTick(state)
```

Déterminer si ces queries sont réellement nécessaires.

Règle :

> derive, don't persist.

Ne pas ajouter de valeurs au `SimulationState` si elles peuvent être calculées.

---

# 14. Persistence and hashing

Déterminer si l'introduction de l'upkeep :

```text
changes SimulationState
```

ou seulement :

```text
changes resource flow
```

Si aucune nouvelle donnée persistante n'est nécessaire :

```text
SAVE_VERSION
```

doit-il changer ?

Probablement non.

Mais cela doit être explicitement vérifié.

Si une nouvelle state field est réellement nécessaire, documenter :

* son type ;
* sa validation ;
* sa persistance ;
* sa participation au hash ;
* la version ;
* la politique de migration/rejet.

Ne pas augmenter la save version sans nécessité.

---

# 15. Determinism

Le contrat doit préserver :

```text
no Math.random()
no Date.now()
no performance.now()
no hidden mutable simulation state
```

Le calcul doit être purement déterministe :

```text
state
→ count operational buildings
→ calculate upkeep
→ deduct material
→ new state
```

Définir également l'ordre d'itération si nécessaire.

Préférer un agrégat numérique plutôt qu'une mutation bâtiment-par-bâtiment si cela permet de conserver une transition simple et atomique.

---

# 16. Failure semantics

Le contrat doit définir précisément :

### Material >= upkeep

```text
upkeep is paid
```

### Material < upkeep

```text
???
```

### Material = 0

```text
???
```

### No operational buildings

```text
upkeep = 0
```

### No population

```text
upkeep = ???
```

### No workers

```text
upkeep = ???
```

### All buildings under construction

```text
upkeep = 0
```

Chaque cas doit être déterministe.

---

# 17. Interaction with construction

Construction coûte actuellement :

```text
25 material
```

L'upkeep doit créer une distinction entre :

```text
build once
```

et :

```text
maintain continuously
```

Analyser le cas :

```text
material = 25
upkeep = X
```

Le joueur peut-il :

```text
build
→ immediately become unable to pay upkeep
```

?

Si oui, est-ce acceptable ?

Le contrat doit éviter les comportements arbitraires.

---

# 18. Interaction with Food

L'upkeep ne doit pas modifier directement :

```text
food
population admission
starvation
farm production
```

mais il peut modifier indirectement la capacité à construire Farms.

Documenter cette relation :

```text
Material shortage
→ fewer new Farms
→ Food constraint remains relevant
```

ou autre si les simulations montrent un problème.

---

# 19. Interaction with Jobs

L'upkeep ne doit pas changer directement :

```text
assignment algorithm
job capacity
workplaceId
employment ordering
```

Mais il peut influencer indirectement :

```text
material
→ Workshop construction
→ job capacity
→ workers
→ material
```

Analyser la boucle complète.

---

# 20. No generic maintenance framework

Do NOT design :

```text
MaintenanceSystem
UpkeepEngine
CostResolver
EconomicModifier
RecurringCostFramework
```

Il n'y a actuellement qu'un seul use case.

Respecter la règle :

> no abstraction without a second use case.

Le design doit rester spécifique au matériau et aux bâtiments opérationnels.

---

# 21. Playability contract

Définir ce qu'un joueur doit pouvoir comprendre dans un vrai navigateur.

Après implémentation, il devra être possible de constater :

1. les bâtiments opérationnels génèrent un coût courant ;
2. ce coût est visible ;
3. le matériau ne monte pas simplement indéfiniment ;
4. agrandir le parc augmente le coût ;
5. un Workshop reste utile mais n'est plus automatiquement gratuit ;
6. le joueur peut comprendre la relation production/upkeep ;
7. une situation déficitaire a une conséquence claire ;
8. une situation saine reste récupérable.

Ne pas implémenter ces tests maintenant.

Définir seulement le contrat qui permettra de les tester en Step 08C.

---

# 22. E2E scenarios to specify

Définir les scénarios E2E minimaux du prochain step.

Au minimum :

### Scenario A — no upkeep

```text
fresh state
→ no operational buildings
→ upkeep = 0
```

### Scenario B — first operational building

```text
Residence operational
→ upkeep charged
```

### Scenario C — production vs upkeep

```text
1 worker
+ operational buildings
→ production
→ upkeep
→ net material
```

### Scenario D — scaling

```text
1 worker
→ 2 workers
→ increasing building count
→ increasing upkeep
```

### Scenario E — deficit

```text
material insufficient for upkeep
→ documented consequence
```

### Scenario F — recovery

```text
deficit
→ player action / existing production
→ recovery
```

Les scénarios doivent être déterministes et basés sur les valeurs du contrat.

---

# 23. Balance guardrails

Définir quelques invariants de design.

Par exemple :

```text
upkeep must be > 0
upkeep must not modify Food directly
upkeep must not create workers
upkeep must not create buildings
upkeep must not bypass construction cost
upkeep must not depend on frame rate
upkeep must be deterministic
```

Ajouter uniquement les invariants réellement nécessaires.

Ne pas transformer le document en système de règles générique.

---

# 24. Explicitly out of scope

Le contrat doit confirmer que les éléments suivants restent hors scope :

```text
Money
Income
Demand
Trade
Taxes
Salaries
Prices
Market
Business revenue
Second Need
Second service
Power
Water
Farm workers
Building degradation
Repairs
Building destruction
Generic maintenance framework
```

Si un de ces éléments est réellement nécessaire à l'upkeep, le signaler comme problème de design plutôt que de l'inventer.

---

# 25. Final Design Decision

Le contrat doit finir par une décision claire sur :

```text
UPKEEP RESOURCE:
Material

UPKEEP SUBJECT:
Operational buildings

UPKEEP FREQUENCY:
Every simulation tick

UPKEEP AMOUNT:
<exact value>

PAYMENT ORDER:
<exact phase/order>

INSUFFICIENT MATERIAL:
<exact behavior>

RECOVERY:
<exact behavior>
```

Puis :

```text
CURRENT LOOP

Residence
→ Colonist
→ Food
→ Farm
→ Workshop
→ Worker
→ Material
→ Upkeep
→ Construction
```

et :

```text
NEXT CAUSAL RELATIONSHIP

Operational buildings
→ recurring material cost
```

---

# 26. Validation

Comme il s'agit d'un **design-only step** :

Do NOT modify implementation files.

Do NOT add production code.

Do NOT alter tests.

You may inspect and reason from the existing tests.

At the end verify:

```bash
git status --short
```

Any existing dirty state must be distinguished from changes caused by this audit.

---

# Final report format

Return exactly these major sections:

## 1. Executive Summary

```text
STATUS: READY FOR IMPLEMENTATION
```

or:

```text
STATUS: BLOCKED
```

Explain why.

---

## 2. Authoritative Rules

List the documentation rules that govern upkeep.

Separate:

```text
REQUIREMENT
INTENTION
OPEN QUESTION
```

---

## 3. Upkeep Contract

Give the exact:

* subject;
* resource;
* amount;
* frequency;
* tick phase;
* same-tick semantics;
* insufficient-material behavior;
* recovery behavior.

---

## 4. Economic Model

Give the formulas:

```text
material production
material upkeep
net material
food production
food consumption
net food
```

---

## 5. Balance Analysis

Use concrete scenarios.

Include:

| Configuration | Workers | Operational buildings | Production/tick | Upkeep/tick | Net material |
| ------------- | ------: | --------------------: | --------------: | ----------: | -----------: |

Explain the progression consequences.

---

## 6. Failure & Recovery

Explicitly document:

* deficit;
* zero material;
* zero workers;
* zero population;
* starvation;
* recovery.

---

## 7. Player-Facing Contract

Define the minimum causal feedback.

---

## 8. Persistence / Hash / Determinism

State exactly what changes and what does not.

---

## 9. E2E Contract

List the scenarios that Step 08C must implement and verify in a real browser.

---

## 10. Out of Scope

Explicit list.

---

## 11. Final Verdict

End with exactly:

```text
NEXT STEP:
Step 08C — Operational Upkeep Implementation

IMPLEMENTATION:
NOT PERFORMED

STATUS:
READY FOR IMPLEMENTATION
```

If the design is genuinely blocked by missing documentation or an unresolved fundamental choice, do not fabricate a value. Return:

```text
STATUS:
BLOCKED — DESIGN DECISION REQUIRED
```

and identify the exact decision required.

The goal is to produce a **small, deterministic, numerically justified upkeep contract**, not to redesign NOVA's economy.

