# NOVA — Step 22 — Civilization Progression

## Contexte

NOVA est un city-builder déterministe et contemplatif.

Le joueur place des conditions et des intentions. La simulation détermine ensuite quand et comment l'établissement se développe.

Step 20 a défini le Product Contract.

Step 20.1 a audité l'implémentation et identifié les gaps MVP.

Step 21 — Economy Foundation — est maintenant terminé et validé :

* Food
* Energy
* Materials
* construction costs
* affordability gating
* deterministic resource production/consumption
* resource summary UI

Validation Step 21 :

```text
pnpm typecheck: PASS
pnpm lint: PASS
pnpm test: PASS (74/74)
pnpm build: PASS
pnpm test:e2e:gpu: PASS (5/5)
```

Ne pas revenir modifier Step 21 sauf nécessité directe.

---

# Objectif

Implémenter la progression civilisationnelle minimale définie dans le Product Contract :

```text
Wilderness → Settlement → Village → Town
```

Cette étape doit donner au joueur une lecture claire de la croissance de son établissement sans introduire un système de progression complexe.

Le stage est une **projection déterministe de l'état de simulation**.

Il ne doit pas devenir une nouvelle simulation parallèle.

---

# 1. Contract de référence

Utiliser `docs/20-product-contract.md` comme source de vérité.

Seuils actuels :

```text
Wilderness → Settlement
  houses >= 1
  population >= 20

Settlement → Village
  population >= 50

Village → Town
  population >= 500
```

Important :

* ne pas inventer de nouveaux seuils ;
* ne pas ajouter de score civilisationnel ;
* ne pas ajouter de bonheur ;
* ne pas ajouter de prestige ;
* ne pas ajouter de niveau technologique ;
* ne pas ajouter de ressources spécifiques aux stages.

Le stage dépend uniquement des conditions contractuelles actuellement disponibles.

---

# 2. Première étape obligatoire : inspecter l'existant

Avant toute modification :

Inspecter au minimum :

```text
src/domain/
src/application/
src/engine/
src/ui/
src/app/
tests/unit/
tests/e2e/
docs/20-product-contract.md
docs/19-mvp.md
docs/21-economy-foundation.md
```

Identifier précisément :

* représentation actuelle de la population ;
* représentation actuelle des bâtiments ;
* représentation actuelle du snapshot ;
* cycle de simulation ;
* projections UI existantes ;
* système `SimulationEvent`;
* `UrbanChange`;
* conventions de nommage ;
* exports publics ;
* tests de domaine existants.

Ne pas créer une architecture parallèle.

Réutiliser les primitives existantes.

---

# 3. Domaine — CivilizationStage

Créer un type explicite, par exemple :

```ts
type CivilizationStage =
  | 'wilderness'
  | 'settlement'
  | 'village'
  | 'town'
```

Utiliser la convention de nommage déjà présente dans le projet si elle diffère.

Le domaine doit rester :

* pur ;
* déterministe ;
* sans React ;
* sans Three.js ;
* sans DOM ;
* sans Date.now();
* sans random ;
* sans état global mutable.

---

# 4. Stage evaluator

Créer une fonction pure responsable de l'évaluation :

```ts
evaluateCivilizationStage(...)
```

ou équivalent selon les conventions existantes.

Elle doit prendre uniquement les données nécessaires.

Exemple conceptuel :

```text
population
numberOfHouses
```

et retourner :

```text
wilderness | settlement | village | town
```

Règles :

```text
if population >= 500
  → town

else if population >= 50
  → village

else if population >= 20 AND houses >= 1
  → settlement

else
  → wilderness
```

L'ordre des conditions est important.

L'évaluation doit être **monotone** pour l'état normal de simulation :

```text
wilderness
  ↓
settlement
  ↓
village
  ↓
town
```

Cependant, ne pas introduire un historique ou un état de progression uniquement pour empêcher une régression.

Le stage doit rester une projection de l'état courant.

---

# 5. Centraliser les règles

Ne pas disperser les nombres :

```text
20
50
500
```

dans plusieurs fichiers.

Créer une source unique pour les seuils, par exemple :

```text
src/domain/civilization/civilization-thresholds.ts
```

avec des constantes explicites.

Exemple conceptuel :

```ts
export const CIVILIZATION_THRESHOLDS = {
  settlement: {
    population: 20,
    houses: 1,
  },
  village: {
    population: 50,
  },
  town: {
    population: 500,
  },
} as const;
```

Adapter au style du projet.

---

# 6. Intégration simulation

Le stage doit être disponible dans le snapshot/state utilisé par l'application.

Ne pas créer une deuxième boucle de simulation.

Ne pas ajouter un nouveau tick spécifique.

Ne pas recalculer le stage à chaque render frame.

Le calcul doit être effectué lors de la mise à jour de l'état de simulation ou dans une projection dérivée appropriée.

Respecter l'architecture actuelle :

```text
commands
    ↓
simulation state
    ↓
domain rules
    ↓
snapshot
    ↓
projections
    ↓
UI / renderer
```

Le renderer Three.js ne doit jamais devenir propriétaire du stage.

---

# 7. Transitions

Identifier les changements de stage :

```text
Wilderness → Settlement
Settlement → Village
Village → Town
```

Utiliser le mécanisme d'événements existant si cela s'intègre naturellement.

Créer un événement uniquement lorsqu'un changement réel est observé.

Par exemple :

```text
CIVILIZATION_STAGE_CHANGED
```

avec :

```text
previousStage
currentStage
tick
```

ou l'équivalent adapté aux types existants.

Ne pas créer un EventManager global.

Ne pas créer de système de replay.

Ne pas ajouter d'historique persistant.

Les événements doivent rester dérivés de changements réels de l'état.

---

# 8. UX

Ajouter une lecture compacte du stage dans l'interface.

Exemple :

```text
SETTLEMENT
POPULATION 32
```

ou une présentation équivalente respectant le langage visuel actuel.

Contraintes :

* pas de gros badge gamifié ;
* pas de progression XP ;
* pas de barre de niveau ;
* pas de popup ;
* pas de confettis ;
* pas de néons ;
* pas de dashboard ;
* pas de modal.

Le stage doit être visible mais secondaire par rapport à la ville.

Réutiliser les patterns UI existants, notamment le style du readout population/resources.

---

# 9. Feedback de transition

Lorsqu'un stage change, le joueur doit pouvoir comprendre qu'une étape importante vient d'être franchie.

Utiliser le système `RECENT CHANGES` existant.

Exemple conceptuel :

```text
YEAR 2 · DAY 143

VILLAGE ESTABLISHED
```

ou une formulation cohérente avec le vocabulaire existant.

Ne pas inventer de causalité.

Le message doit simplement signaler la transition réelle.

Il ne doit pas prétendre que le joueur a obtenu le stage grâce à une action particulière si le domaine ne le démontre pas.

---

# 10. Important — ne pas modifier le modèle de population

Le Product Contract mentionne :

```text
households
workers
wellbeing
housingRatio
foodRatio
```

Mais ces éléments ne doivent **PAS** être implémentés dans Step 22.

Le modèle actuel de population agrégée reste volontairement :

```text
population
growthProgress
```

ou son équivalent actuel.

Utiliser la population existante pour les seuils.

Ne pas introduire :

* households ;
* workers ;
* jobs ;
* wages ;
* wellbeing ;
* housing ratio ;
* food ratio ;
* migration ;
* unemployment.

Ces systèmes appartiennent à une éventuelle étape ultérieure et ne sont pas nécessaires pour rendre les stages fonctionnels.

---

# 11. Interaction avec Step 21 Economy

Ne pas modifier le modèle économique.

Les stages ne doivent pas consommer :

* food ;
* energy ;
* materials.

Ils ne doivent pas produire de nouvelles ressources.

Ils ne doivent pas débloquer des bâtiments dans cette étape.

Ils ne doivent pas modifier les coûts de construction.

Ils ne doivent pas modifier les taux de production.

Step 22 est uniquement un système de **lecture/progression civilisationnelle**.

---

# 12. Tests unitaires

Créer des tests ciblés pour l'évaluateur.

Minimum :

### Wilderness

```text
population 0, houses 0 → wilderness
population 19, houses 0 → wilderness
population 19, houses 1 → wilderness
```

### Settlement

```text
population 20, houses 1 → settlement
population 20, houses 10 → settlement
population 49, houses 1 → settlement
```

### Village

```text
population 50 → village
population 100 → village
population 499 → village
```

### Town

```text
population 500 → town
population 1000 → town
```

### Boundary behavior

Tester explicitement les frontières :

```text
19 → wilderness
20 → settlement

49 → settlement
50 → village

499 → village
500 → town
```

Ajouter également un test de déterminisme :

```text
same input → same stage
```

---

# 13. Tests de transition

Tester :

```text
wilderness → settlement
settlement → village
village → town
```

et vérifier :

* un seul événement lors de la transition ;
* aucun événement si le stage ne change pas ;
* ordre déterministe ;
* tick correct.

Ne pas tester uniquement le rendu UI.

Tester le domaine/application.

---

# 14. E2E

Étendre `tests/e2e/nova.spec.ts` uniquement si nécessaire.

Minimum user-visible contract :

* le stage initial est visible ;
* la valeur affichée correspond au snapshot ;
* aucune régression des contrôles existants ;
* le resource summary de Step 21 reste visible ;
* STEP continue de fonctionner.

Ne pas construire un scénario E2E qui attend artificiellement 500 habitants si le modèle actuel rend cela trop long.

Pour tester une transition, préférer une fixture/scénario de test contrôlé au niveau approprié plutôt qu'un test E2E extrêmement long.

Conserver le GPU runner :

```text
pnpm test:e2e:gpu
```

Le test CPU Playwright avec SwiftShader reste une limitation environnementale connue et ne doit pas être transformé en modification du renderer.

---

# 15. Performance

Le calcul du stage est trivial.

Ne pas :

* recalculer sur chaque frame Three.js ;
* scanner inutilement toute la ville plusieurs fois ;
* ajouter un système d'observation complexe.

Une évaluation basée sur les compteurs déjà disponibles est suffisante.

---

# 16. Documentation

Créer :

```text
docs/22-civilization-progression.md
docs/qa/step22-civilization-progression.md
```

Documenter :

* les quatre stages ;
* les seuils ;
* la règle d'évaluation ;
* la place du stage dans l'architecture ;
* les événements ;
* ce qui est volontairement hors scope ;
* les tests ;
* les validations.

Ne pas modifier `docs/20-product-contract.md` sauf si une contradiction réelle est découverte.

Le Product Contract reste la source de vérité.

---

# 17. Scope strict

## À faire

```text
CivilizationStage
stage thresholds
pure evaluator
simulation/snapshot integration
stage transition detection
RECENT CHANGES integration
compact stage readout
unit tests
transition tests
E2E smoke adjustment if needed
documentation
```

## À NE PAS faire

```text
households
workers
jobs
wages
wellbeing
happiness
migration
markets
trade
logistics
power grid
technology tree
unlock tree
quests
achievements
XP
level system
new resources
new buildings
new terrain
persistence
SaveGameV1
state hash
canonical command log
performance instrumentation
```

Ne pas profiter de Step 22 pour résoudre les autres gaps du Product Contract.

---

# 18. Validation obligatoire

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e:gpu
```

Attendu :

```text
typecheck PASS
lint PASS
all unit tests PASS
build PASS
GPU E2E PASS
```

Le nombre de tests doit augmenter avec les nouveaux tests.

Aucune régression des 74 tests actuels.

---

# 19. Rapport final obligatoire

Retourner un rapport structuré :

```text
# QA — Step 22 Civilization Progression

Date:
Status:

## Scope verification

Implemented:
- ...

Not implemented:
- ...

## Architecture

Created:
- ...

Modified:
- ...

## Civilization model

Wilderness:
Settlement:
Village:
Town:

## Transitions

...

## UX

...

## Tests

...

## Validation

pnpm typecheck:
pnpm lint:
pnpm test:
pnpm build:
pnpm test:e2e:gpu:

## Production changes

...

## Contract impact

...

## Final status

PASS / PARTIAL
```

Le rapport doit distinguer clairement :

* ce qui a été implémenté ;
* ce qui reste volontairement hors scope ;
* les éventuels écarts au Product Contract.

---

# Critère de réussite

Step 22 est terminé lorsque NOVA peut répondre de manière déterministe à :

> « Où en est actuellement mon établissement ? »

avec exactement :

```text
WILDERNESS
SETTLEMENT
VILLAGE
TOWN
```

et que les transitions :

```text
Wilderness → Settlement
Settlement → Village
Village → Town
```

sont testées, visibles et dérivées de l'état réel de simulation.

Le système doit rester petit, lisible et déterministe.

Ne pas élargir la simulation au-delà de cette progression.
