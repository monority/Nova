# NOVA — Step 23 — Canonical Simulation Tick + State Hash

## Contexte

NOVA est maintenant arrivé à un état où les fondations principales suivantes sont en place :

* construction ;
* zones ;
* développement autonome ;
* population agrégée ;
* économie Food / Energy / Materials ;
* civilisation Wilderness → Settlement → Village → Town ;
* simulation déterministe ;
* événements dérivés des changements réels ;
* GPU E2E validé.

Step 22 est terminé :

```text
pnpm typecheck: PASS
pnpm lint: PASS
pnpm test: PASS (85/85)
pnpm build: PASS
pnpm test:e2e:gpu: PASS (6/6)
```

Le prochain objectif est de verrouiller formellement la déterminisme de la simulation.

---

# Objectif

Introduire :

1. un ordre canonique explicite du tick ;
2. une définition claire d'un tick de simulation ;
3. un état canonique sérialisable ;
4. un hash déterministe de cet état ;
5. des tests prouvant :

```text
same seed
+ same initial state
+ same commands
+ same ticks
= same state hash
```

Cette étape est une **fondation technique** pour la persistence future.

Elle ne doit pas ajouter de gameplay.

---

# 1. Source de vérité

Lire avant toute modification :

```text
docs/20-product-contract.md
docs/21-economy-foundation.md
docs/22-civilization-progression.md
docs/19-mvp.md
```

Inspecter également :

```text
src/domain/
src/application/
src/engine/
src/app/
tests/unit/
tests/e2e/
```

Identifier le chemin réel actuel de :

```text
command
→ simulation
→ state update
→ projections
→ events
→ rendering
```

Ne pas supposer l'architecture : la documenter à partir du code existant.

---

# 2. Définition du tick

Le Product Contract définit :

```text
1 tick = 1 simulated day
30 ticks = 1 month
360 ticks = 1 year
```

Step 23 doit rendre cette convention explicite.

Créer ou adapter les constantes existantes afin d'avoir une source unique.

Exemple conceptuel :

```ts
export const SIMULATION_TIME = {
  TICKS_PER_DAY: 1,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 360,
} as const;
```

Ne pas conserver une ambiguïté où :

```text
1/60 second = simulation tick
```

tout en affirmant :

```text
1 tick = 1 day
```

### Important

Ne pas nécessairement supprimer le fixed timestep de rendu/animation.

Il faut distinguer :

```text
render frame
```

de :

```text
simulation tick
```

Le renderer peut continuer à fonctionner à 60 FPS.

Le domaine de simulation doit avoir sa propre unité canonique.

---

# 3. Simulation clock

Inspecter l'implémentation actuelle de :

* pause ;
* STEP ;
* speed 1× / 2× / 5× / 20× / 100× ;
* RESET ;
* temps simulé.

Adapter l'architecture pour que les vitesses contrôlent le **nombre de simulation ticks exécutés**, et non la définition du tick lui-même.

Conceptuellement :

```text
render frames
     ↓
simulation accumulator / scheduler
     ↓
0..N simulation ticks
```

Un tick doit toujours représenter :

```text
1 day
```

indépendamment de la vitesse d'affichage.

---

# 4. Ordre canonique

Le Product Contract impose :

```text
commands
→ accessibility
→ production
→ consumption
→ housing
→ construction
→ events
→ hash
```

Formaliser cet ordre dans le code.

Ne pas simplement le documenter.

Créer une orchestration explicite, par exemple :

```text
advanceSimulationTick()
```

ou équivalent.

Le nom doit suivre les conventions existantes.

L'objectif est qu'un lecteur puisse voir clairement :

```text
1. Commands
2. Accessibility
3. Production
4. Consumption
5. Housing
6. Construction
7. Events
8. Hash
```

---

# 5. Adapter l'existant sans inventer de systèmes

Le projet actuel n'a pas nécessairement toutes ces phases sous forme de systèmes distincts.

Ne pas créer artificiellement :

```text
AccessibilitySystem
HousingSystem
CommandBus
HashSystem
```

si cela n'est pas nécessaire.

À la place, mapper les systèmes existants sur les phases du contrat.

Par exemple :

```text
commands
  → existing player commands

accessibility
  → existing road/accessibility logic if applicable

production
  → existing economy production

consumption
  → existing food/energy consumption

housing
  → existing population capacity/growth

construction
  → existing autonomous development/construction

events
  → existing change/event derivation

hash
  → canonical state hash
```

Si une phase est actuellement vide, elle peut être explicitement représentée comme une phase vide.

Ne pas inventer du gameplay uniquement pour remplir le tableau.

---

# 6. Command boundary

Clarifier la différence entre :

```text
player command
```

et :

```text
simulation tick
```

Les commandes doivent être appliquées de manière déterministe.

Ne pas utiliser :

```text
Date.now()
performance.now()
Math.random()
browser state
DOM state
Three.js state
```

pour influencer le résultat.

Le renderer reste consommateur du snapshot.

---

# 7. Canonical State

Créer une représentation explicite de l'état nécessaire au hash.

Exemple conceptuel :

```ts
type CanonicalSimulationState = {
  tick: number;
  population: ...;
  economy: ...;
  buildings: ...;
  roads: ...;
  zones: ...;
  civilization: ...;
  world: ...;
};
```

Ne pas copier aveuglément toute la structure runtime.

Le canonical state doit contenir uniquement les données qui déterminent réellement la simulation future.

Il ne doit pas contenir :

```text
React state
Three.js objects
Mesh
Material
Camera
DOM
callbacks
functions
transient UI state
selection state
hover state
timestamps réels
```

---

# 8. Canonical ordering

Le hash ne doit jamais dépendre de l'ordre accidentel d'un :

```text
Map
Set
object insertion order
render traversal
```

Avant sérialisation :

* trier les bâtiments par ID stable ;
* trier les routes par ID stable ;
* trier les zones par ID stable ;
* trier toute collection pertinente ;
* normaliser les objets dans un ordre explicite.

Réutiliser les identités stables déjà introduites dans les étapes précédentes.

Ne pas inventer des IDs différents uniquement pour le hash.

---

# 9. Canonical serialization

Créer une fonction pure du type :

```text
toCanonicalSimulationState(...)
```

puis :

```text
serializeCanonicalState(...)
```

La sérialisation doit être :

```text
same state → same bytes/string
```

indépendamment de l'ordre d'insertion des collections.

Éviter une sérialisation générique magique qui pourrait silencieusement inclure de nouveaux champs runtime.

Le format doit être explicite et testable.

---

# 10. Hash

Créer une fonction pure :

```text
hashSimulationState(...)
```

Le hash doit être :

* déterministe ;
* stable ;
* suffisamment compact ;
* indépendant du renderer ;
* indépendant de React ;
* indépendant du navigateur autant que possible.

Privilégier une primitive de hashing disponible dans l'environnement de production et compatible avec le build actuel.

Ne pas ajouter une dépendance lourde uniquement pour cela.

Le résultat peut être une chaîne hexadécimale.

Exemple conceptuel :

```text
state hash:
7c8e...
```

Ne pas présenter le hash comme une preuve cryptographique.

Il sert ici à détecter une divergence déterministe d'état.

---

# 11. Hash et events

Le hash doit représenter l'état **après le tick canonique**.

Conceptuellement :

```text
commands
↓
accessibility
↓
production
↓
consumption
↓
housing
↓
construction
↓
events
↓
canonical state
↓
hash
```

Les événements eux-mêmes ne doivent pas introduire de non-déterminisme.

Si les événements sont dérivés du changement :

```text
previous state → current state
```

ils doivent rester déterministes.

---

# 12. State hash API

Expose une API simple au niveau application/domain approprié.

Par exemple :

```text
getSimulationStateHash(state)
```

ou équivalent.

L'appelant ne doit pas avoir besoin de connaître les détails de canonicalisation.

Exemple conceptuel :

```ts
const hash = getSimulationStateHash(simulationState);
```

---

# 13. Tests — canonical serialization

Créer des tests spécifiques.

### Même état

```text
state A → serialization A
state A → serialization A
```

Résultat identique.

### Ordre différent

Créer deux états logiquement identiques mais avec des collections insérées dans des ordres différents.

Résultat :

```text
serialization A === serialization B
hash A === hash B
```

### Différence réelle

Modifier :

```text
population
food
building position
building type
road
zone
tick
```

et vérifier que le hash change.

---

# 14. Tests — deterministic simulation

Créer un test de référence :

```text
seed = 4242
initial state = canonical initial state
commands = known command sequence
ticks = N
```

Exécuter deux simulations indépendantes.

Résultat attendu :

```text
simulation A hash === simulation B hash
```

Tester au minimum :

```text
1 tick
10 ticks
100 ticks
```

---

# 15. Replay minimal

Ne pas créer un système de replay produit.

Pour les tests uniquement, permettre de rejouer une séquence déterministe de commandes :

```text
commands:
[
  build house,
  build road,
  build farm,
  ...
]
```

Puis :

```text
run(commands, 100 ticks)
```

et comparer les hashes.

Ce mécanisme doit rester un helper de test si possible.

Ne pas introduire une infrastructure de replay dans le produit.

---

# 16. STEP

`STEP` doit correspondre exactement à :

```text
+1 simulation tick
```

donc :

```text
+1 simulated day
```

Après un STEP :

```text
tick += 1
day += 1
hash = new state hash
```

Pas :

```text
+1 render frame
```

---

# 17. Speed controls

Conserver les contrôles existants :

```text
Pause
1×
2×
5×
20×
100×
STEP
RESET
```

Ne pas changer leur UX sans nécessité.

Les vitesses ne doivent modifier que la quantité de ticks exécutés par unité de temps réel.

Elles ne doivent jamais modifier :

```text
production per tick
consumption per tick
construction costs
population growth per tick
```

---

# 18. UI

Le hash n'a pas besoin d'être visible en permanence.

Ne pas ajouter un gros panneau technique.

Il peut éventuellement être exposé uniquement dans :

* debug tooling ;
* tests ;
* diagnostics.

La UI utilisateur doit continuer à afficher :

```text
STAGE
POPULATION
FOOD
ENERGY
MATERIALS
```

sans devenir un dashboard technique.

---

# 19. Persistence — explicitement hors scope

Step 23 prépare la persistence mais ne l'implémente pas.

NE PAS créer :

```text
SaveGameV1
localStorage persistence
IndexedDB
autosave
manual save
load UI
save slots
```

Ces éléments appartiennent à Step 24.

---

# 20. World state

Le hash doit inclure les éléments du monde qui influencent réellement la simulation.

Le monde généré à partir du seed ne doit pas forcément être entièrement copié dans le hash si le seed + dimensions + génération déterministe suffisent à le reconstruire.

Choisir une représentation cohérente.

Documenter explicitement le choix.

Le hash doit cependant changer si une donnée du monde pertinente à la simulation change.

---

# 21. Civilization stage

Le stage introduit à Step 22 doit être traité correctement.

S'il est purement dérivé de :

```text
population
houses
```

il peut être :

* soit inclus explicitement dans le canonical state ;
* soit recalculé lors de la canonicalisation.

Éviter de stocker deux sources de vérité.

Le hash doit refléter le résultat civilisationnel réel sans créer de duplication incohérente.

---

# 22. Economy

Inclure les ressources qui influencent la simulation :

```text
food
energy
materials
```

ainsi que les autres données économiques nécessaires à la continuation déterministe de la simulation.

Ne pas inclure les éléments purement UI.

---

# 23. Floating-point determinism

Inspecter les calculs actuels.

Ne pas entreprendre une réécriture générale du moteur numérique.

Mais identifier les valeurs qui pourraient provoquer des divergences :

* accumulation de floats ;
* ordre de réduction ;
* NaN ;
* Infinity ;
* valeurs non normalisées.

Si nécessaire, appliquer des normalisations simples et documentées.

Ne pas inventer un système complexe de fixed-point arithmetic pour cette étape.

---

# 24. Documentation

Créer :

```text
docs/23-canonical-simulation.md
docs/qa/step23-canonical-simulation.md
```

Documenter :

* définition du tick ;
* séparation render frame / simulation tick ;
* ordre canonique ;
* canonical state ;
* canonical serialization ;
* hashing ;
* collections triées ;
* données incluses/exclues ;
* stratégie de déterminisme ;
* tests ;
* limites connues.

Ajouter un diagramme textuel simple :

```text
Commands
   ↓
Accessibility
   ↓
Production
   ↓
Consumption
   ↓
Housing
   ↓
Construction
   ↓
Events
   ↓
Canonical State
   ↓
State Hash
```

---

# 25. Scope strict

## À faire

```text
canonical simulation tick
tick = 1 simulated day
render frame / simulation tick separation
explicit phase order
canonical state
canonical serialization
stable collection ordering
state hash
determinism tests
STEP alignment
speed alignment
documentation
```

## À NE PAS faire

```text
SaveGameV1
autosave
manual save
load
localStorage
IndexedDB
households
workers
jobs
wellbeing
markets
trade
logistics
power grid
new buildings
new resources
new terrain
biomes
128x128 world
technology tree
quests
achievements
XP
performance instrumentation
major renderer changes
```

Ne pas résoudre les autres gaps du Product Contract dans cette étape.

---

# 26. Validation obligatoire

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

Les 85 tests existants doivent rester verts.

Le nombre de tests doit augmenter avec les tests de canonicalisation et déterminisme.

---

# 27. Critères de réussite

Step 23 est terminé lorsque les propriétés suivantes sont démontrées :

### Tick

```text
1 simulation tick = 1 simulated day
```

### STEP

```text
STEP = exactement +1 tick
```

### Canonical order

```text
commands
→ accessibility
→ production
→ consumption
→ housing
→ construction
→ events
→ hash
```

### Serialization

```text
logical same state
+ different insertion order
= same canonical serialization
```

### Hash

```text
same canonical state
= same hash
```

### Determinism

```text
same seed
+ same initial state
+ same commands
+ same ticks
= same hash
```

### Divergence detection

```text
different simulation state
= different hash
```

### Architecture

```text
renderer ≠ source of truth
React ≠ source of truth
UI ≠ source of truth
```

Le domaine/application reste propriétaire de la simulation.

---

# 28. Rapport final obligatoire

Retourner :

```text
# QA — Step 23 Canonical Simulation Tick + State Hash

Date:
Status:

## Scope verification

Implemented:
- ...

Not implemented:
- ...

## Canonical tick

Tick definition:
Tick order:
STEP behavior:
Speed behavior:

## Canonical state

Included:
- ...

Excluded:
- ...

## Serialization

...

## Hash

Algorithm/API:
Output format:
Determinism:

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

Le rapport doit signaler explicitement tout écart entre le Product Contract et l'implémentation finale.

---

## Principe directeur

Cette étape ne doit pas rendre NOVA plus complexe à jouer.

Elle doit simplement rendre sa simulation **formellement reproductible et vérifiable**.

Après cette étape, on doit pouvoir dire :

```text
NOVA state at tick 100
→ hash X

NOVA state at tick 100
with same seed + same commands
→ hash X
```

sans dépendre du renderer, de React, du navigateur ou de l'ordre accidentel des collections.
