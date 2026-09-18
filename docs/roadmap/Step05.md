# NOVA — Step 05A — Architecture & City-Builder Coherence Audit

## Mission

Step 04 — First Resource Constraint & Construction Cost est maintenant **COMPLETE**.

Le prochain objectif envisagé est l'introduction d'une première forme de **resource production** afin que l'économie ne soit plus uniquement :

```text
Initial stock
    ↓
Construction cost
    ↓
Stock decreases
    ↓
Stock reaches 0
    ↓
Construction blocked
```

Avant d'implémenter cette mécanique, réalise un **audit architectural et game-design approfondi** du projet NOVA.

### IMPORTANT

**Cette étape est une étape d'audit uniquement.**

Ne modifie aucun fichier de code.

Ne crée aucune feature.

Ne crée aucun bâtiment producteur.

Ne crée aucune abstraction de production.

Ne modifie aucun test.

Ne modifie aucune UI.

Ne modifie aucun E2E.

Ne refactorise rien.

L'objectif est uniquement de déterminer si une mécanique de production de ressources constitue réellement le prochain petit pas cohérent pour NOVA en tant que city-builder.

---

# 1. Audit du repository

Inspecte réellement le repository actuel.

Commence par identifier :

* architecture complète ;
* domaine ;
* application ;
* renderer ;
* UI ;
* persistence ;
* tests ;
* E2E ;
* GPU E2E ;
* documentation ;
* roadmap existante ;
* décisions architecturales déjà prises.

Ne suppose pas que la roadmap décrite dans ce prompt est la roadmap officielle.

**Si une roadmap ou documentation existe dans le repository, elle est prioritaire sur les suppositions de ce prompt.**

Inspecte notamment les fichiers concernés par :

```text
SimulationState
stepSimulation
simulation phases
BuildingDefinition
ResourceStock
construction cost
population
housing
persistence
RenderSnapshot
GameController
E2E
```

Utilise les fichiers réellement présents dans le repository et cite les chemins pertinents dans ton rapport.

---

# 2. Vérifier la cohérence de Step 04

Vérifie que le modèle actuel introduit par Step 04 est réellement sain comme fondation économique.

Analyse notamment :

```text
ResourceStock
construction cost
resource validation
resource deduction
building creation
construction lifecycle
persistence
hash/determinism
queries
UI
```

Réponds explicitement :

### A. ResourceStock

Est-ce actuellement :

* une abstraction suffisamment saine pour évoluer ;
* une abstraction temporaire acceptable ;
* ou une abstraction qui risque de bloquer les prochaines étapes ?

### B. `construction`

Détermine si cette ressource représente conceptuellement :

* un matériau générique ;
* une monnaie ;
* un stock abstrait ;
* ou autre chose.

Ne change rien.

Explique uniquement ce que le code actuel permet réellement de conclure.

### C. Construction

Vérifie que :

```text
construction accepted
→ resource deducted
→ building exists
→ construction progresses
→ building becomes operational
```

est correctement séparé d'un futur système de production.

---

# 3. Audit de la simulation temporelle

Inspecte précisément l'ordre actuel des phases de simulation.

Documente le pipeline réel :

```text
stepSimulation
    ↓
?
    ↓
?
    ↓
?
```

Pour chaque phase, explique :

* ce qu'elle lit ;
* ce qu'elle modifie ;
* si elle est pure ;
* si elle dépend du tick ;
* ses invariants.

Puis réponds à cette question :

> Où une future production de ressources pourrait-elle conceptuellement être intégrée sans casser la causalité actuelle ?

Ne modifie pas l'ordre.

Ne propose pas encore de code.

---

# 4. City-builder coherence audit

Analyse maintenant le projet comme un **city-builder**, pas seulement comme un moteur technique.

Détermine si une production de ressources est cohérente avec les mécaniques déjà présentes :

```text
construction
housing
population
colonist admission
simulation time
resource stock
```

Réponds concrètement :

### Question 1

Une ressource produite par des bâtiments est-elle une conséquence naturelle des systèmes déjà présents ?

### Question 2

Ou manque-t-il d'abord une autre mécanique fondamentale ?

Par exemple :

* emploi ;
* population active ;
* capacité de production ;
* maintenance ;
* stockage ;
* consommation ;
* besoins ;
* services ;
* zoning ;
* infrastructure ;
* transport ;
* etc.

Ne cherche pas à tout implémenter.

Le but est de déterminer **le prochain petit morceau**, pas de concevoir tout le jeu.

---

# 5. Analyse des futurs bâtiments producteurs

Sans créer de bâtiment, analyse ce que nécessiterait conceptuellement un premier bâtiment producteur.

Exemple hypothétique uniquement :

```text
Workshop
    construction cost = 25
    production = +10 construction/tick
```

Détermine quelles informations seraient réellement nécessaires.

Par exemple :

```text
constructionCost
production
operational state
production interval
worker requirement
storage
capacity
```

Pour chaque information, classe-la :

```text
REQUIRED NOW
NOT REQUIRED NOW
FUTURE
DANGEROUS PREMATURE ABSTRACTION
```

Le but est d'éviter de construire un système de production générique trop tôt.

---

# 6. Déterminisme

Vérifie comment une future production pourrait rester compatible avec les invariants actuels :

* pure functions ;
* immutability ;
* deterministic ordering ;
* deterministic IDs ;
* canonical hashing ;
* persistence ;
* replayability ;
* no `Math.random()`;
* no `Date.now()`;
* no browser dependency.

Identifie les risques éventuels.

---

# 7. Economic edge cases

Sans implémenter quoi que ce soit, analyse les cas suivants :

### Production

```text
0 producers
1 producer
2 producers
producer under construction
producer operational
producer removed/destroyed
```

### Stock

```text
stock = 0
stock > 0
large stock
production beyond expected capacity
```

### Construction

```text
stock insufficient
stock exactly sufficient
production makes construction possible
construction and production on adjacent ticks
```

### Temporal order

Analyse notamment cette question :

> Si un bâtiment devient `operational` pendant le tick N, doit-il produire pendant N ou seulement à partir de N+1 ?

Ne choisis pas arbitrairement.

Donne :

* les conséquences de chaque choix ;
* celui qui correspond le mieux aux invariants actuels ;
* les raisons.

---

# 8. Architecture future

Évalue si l'architecture actuelle peut évoluer vers :

```text
ResourceStock
     ↑
Production
     ↑
Operational Buildings
```

sans transformer immédiatement le code en système générique complexe.

Cherche spécifiquement les risques de :

```text
ProductionSystem<T>
ResourceType<T>
Recipe<TInput, TOutput>
BuildingProcessor
GenericEconomyEngine
```

ou autres abstractions prématurées.

Le principe recherché est :

> **Le minimum d'abstraction nécessaire pour la prochaine mécanique, pas une architecture pour un jeu hypothétique complet.**

---

# 9. UX / player feedback

Analyse aussi la conséquence UI.

Si une future production existe, le joueur devrait pouvoir comprendre :

```text
current stock
production rate
source of production
```

Mais détermine ce qui est réellement nécessaire au prochain petit step.

Classe :

```text
MUST HAVE
SHOULD HAVE
DEFER
```

Ne modifie aucune UI.

---

# 10. Performance / scalability

Analyse si le modèle actuel pourrait rester performant avec :

```text
10 buildings
100 buildings
1,000 buildings
10,000 buildings
```

Ne fais aucun benchmark artificiel.

Analyse seulement les structures actuelles et les risques évidents.

Une future production ne doit pas introduire inutilement :

```text
O(n × resources × buildings × ticks)
```

si une approche plus simple suffit.

---

# 11. Audit des tests

Analyse les tests actuels et détermine quels invariants seraient indispensables pour une future production.

Ne crée pas les tests.

Propose simplement les tests nécessaires, par exemple :

```text
producer under construction → +0
producer operational → +X
two producers → +2X
zero producers → +0
multiple ticks → deterministic accumulation
old state unchanged
same input → same output
```

Classe-les :

```text
MUST HAVE
SHOULD HAVE
FUTURE
```

---

# 12. E2E / browser strategy

Analyse comment une future production devrait être vérifiée avec le système E2E actuel.

Le test devra idéalement démontrer une causalité réelle :

```text
create producer
→ construction
→ operational
→ advance simulation
→ stock increases
→ construction becomes affordable
→ real placement
```

Mais ne code pas ce scénario.

Détermine uniquement :

* quelles assertions seraient nécessaires ;
* quelles interactions devraient être réelles ;
* quels états devraient être visibles ;
* quels screenshots seraient utiles ;
* ce qui doit rester une vérification simulation plutôt que visuelle.

---

# 13. Décision

À partir de tout l'audit, donne UNE recommandation.

Choisis parmi :

```text
PROCEED
DEFER
CHANGE DIRECTION
```

### PROCEED

Si une production minimale est effectivement le prochain petit morceau cohérent.

### DEFER

Si une autre mécanique doit être introduite avant.

### CHANGE DIRECTION

Si le modèle économique actuel nécessite d'abord une correction architecturale.

Ne choisis pas `PROCEED` simplement parce que ce prompt propose la production.

La décision doit venir de l'état réel du repository.

---

# 14. Si PROCEED

Si ta conclusion est `PROCEED`, propose **exactement un Step suivant minimal**.

Il doit contenir :

```text
Goal
Domain change
Simulation change
UI change
Tests
E2E
Out of scope
Acceptance criteria
```

Mais reste minimal.

Ne propose pas :

* plusieurs ressources ;
* chaînes de production ;
* workers ;
* maintenance ;
* consommation ;
* marché ;
* logistique ;
* recettes génériques ;
* système économique complet.

Le prochain step doit pouvoir être implémenté et validé indépendamment.

---

# 15. Si DEFER ou CHANGE DIRECTION

Explique :

1. pourquoi ;
2. quel problème doit être traité ;
3. quelle mécanique devrait venir ensuite ;
4. pourquoi elle est prioritaire ;
5. ce qu'il faut explicitement éviter d'implémenter maintenant.

---

# 16. Rapport final obligatoire

Structure exactement le rapport ainsi :

```text
# NOVA — Step 05A Architecture & City-Builder Coherence Audit

## Repository inspected

...

## Current architecture

...

## Step 04 assessment

...

## Simulation phase analysis

...

## City-builder coherence

...

## Economic model assessment

...

## Production feasibility

...

## Determinism assessment

...

## UX assessment

...

## Scalability assessment

...

## Test strategy

...

## E2E strategy

...

## Risks

...

## Decision

PROCEED / DEFER / CHANGE DIRECTION

## Recommended next step

...

## Explicitly out of scope

...

## Files inspected

...
```

## Final constraints

* **ZERO code changes.**
* **ZERO new files.**
* **ZERO refactors.**
* **ZERO dependency changes.**
* **ZERO test modifications.**
* Do not pretend a proposed design is already implemented.
* Base conclusions on the actual repository.
* Distinguish clearly between:

  * current behavior;
  * recommended future behavior;
  * speculative future systems.
* Do not design the entire game.
* Optimize for a **small, testable, deterministic next step**.
* If the existing roadmap contradicts the proposed production step, explicitly say so.
* If something cannot be established from the repository, say so rather than guessing.

The purpose of this step is to answer one question:

> **What is the smallest next mechanical addition that makes NOVA a more coherent deterministic city-builder without creating premature architecture?**

