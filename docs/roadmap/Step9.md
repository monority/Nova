# Step 9 — Road Influence & Urban Accessibility

## Objectif

Faire évoluer le système de développement autonome de NOVA afin que les routes commencent à influencer **où les bâtiments se développent**.

À la fin de cette étape, le développement autonome ne doit plus seulement rechercher :

```text
proximité des bâtiments similaires
+
adjacence aux bâtiments similaires
```

mais également prendre en compte :

```text
proximité / accessibilité routière
```

Cela doit commencer à produire une morphologie urbaine plus crédible :

```text
ZONE
  ↓
ROADS
  ↓
BUILDING DEVELOPMENT
  ↓
URBAN FORM
```

L'objectif est de permettre à la ville de commencer à **se structurer autour de ses infrastructures**.

---

# 1. Contraintes architecturales

Respecter strictement l'architecture existante.

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Simulation
```

Le système de développement reste dans le domaine.

Ne pas introduire :

* `CityAI`
* `UrbanAI`
* `PlannerAI`
* `AgentManager`
* `LandValueSystem`
* système générique de desirability
* pathfinding
* trafic
* citoyens individuels
* navigation
* économie supplémentaire
* système de zoning supplémentaire

Le système doit rester petit, explicite et déterministe.

---

# 2. État actuel

Step 8 fournit déjà :

```text
zone
  ↓
candidate cells
  ↓
development pressure
  ↓
deterministic score
  ↓
best candidate
  ↓
normal construction
```

Le système actuel prend notamment en compte :

* distance Manhattan aux bâtiments similaires ;
* bonus d'adjacence ;
* tie-break déterministe ;
* validation normale de construction ;
* développement résidentiel autour des maisons ;
* développement agricole autour des fermes.

**Ne pas remplacer ce système.**

Step 9 doit simplement ajouter un nouveau facteur :

```text
road influence
```

---

# 3. Nouveau concept : Road Influence

Créer un concept de domaine minimal représentant l'influence spatiale des routes.

Il n'est pas nécessaire de créer une grosse abstraction.

Une fonction pure suffit si elle correspond mieux à l'architecture actuelle.

Exemple conceptuel :

```ts
getRoadInfluence(
  position: GridPosition,
  roads: readonly Road[],
): number
```

Elle doit être :

* pure ;
* déterministe ;
* indépendante de React ;
* indépendante de Three.js ;
* indépendante du navigateur ;
* sans état mutable ;
* sans random ;
* testable isolément.

---

# 4. Distance à la route

Utiliser la distance Manhattan existante ou en créer une seule si elle n'existe pas déjà.

```ts
distance =
  Math.abs(x1 - x2) +
  Math.abs(y1 - y2)
```

Pour une cellule candidate :

```text
candidate
    ↓
nearest road
    ↓
Manhattan distance
```

Ne pas utiliser :

* distance euclidienne ;
* raycasting ;
* navigation mesh ;
* pathfinding ;
* recherche de chemin ;
* coût de déplacement.

À cette étape, la route est simplement une **structure spatiale proche**.

---

# 5. Influence résidentielle

Le résidentiel doit être le premier type à bénéficier fortement de l'influence des routes.

Une cellule résidentielle proche d'une route doit être plus attractive qu'une cellule équivalente éloignée.

Utiliser une influence discrète et simple.

Exemple :

```text
distance 0 → très fort
distance 1 → fort
distance 2 → moyen
distance 3 → faible
distance >= 4 → aucun bonus
```

Mais attention :

Une cellule située directement sur une route ne doit normalement jamais être candidate puisque les routes et bâtiments ne peuvent pas occuper la même cellule.

La distance `0` doit donc seulement être possible si l'architecture actuelle représente les routes différemment.

Avec le modèle actuel où une route occupe une cellule :

```text
distance 1 = adjacent à une route
```

devient le cas le plus important.

Utiliser donc une fonction cohérente avec le modèle spatial actuel.

Exemple conceptuel :

```ts
function roadInfluence(distance: number): number {
  if (distance <= 1) return 3
  if (distance === 2) return 2
  if (distance === 3) return 1

  return 0
}
```

Les valeurs exactes peuvent être adaptées au système de scoring existant.

**Ne pas introduire de nombres arbitraires dispersés dans le code.**

Les poids doivent être centralisés.

---

# 6. Adjacence routière

L'adjacence directe à une route doit être explicitement représentée.

Pour une cellule :

```text
 R
 R C R
   R
```

si `C` est directement adjacente à une ou plusieurs routes, elle obtient un bonus.

Exemple :

```ts
const adjacentRoadBonus = 4
```

Le nombre exact doit être déterminé à partir du système de scoring actuel.

Important :

L'adjacence routière doit être un **bonus**, pas une condition obligatoire.

Une zone résidentielle peut toujours construire loin des routes.

---

# 7. Score final

Le score Step 9 doit conserver les facteurs Step 8.

Conceptuellement :

```text
development score =
    building proximity
  + building adjacency
  + road influence
```

Par exemple :

```ts
score =
  similarBuildingProximityScore +
  similarBuildingAdjacencyBonus +
  roadProximityScore +
  roadAdjacencyBonus
```

Ne pas remplacer les anciens facteurs.

La route est un nouveau facteur.

---

# 8. Importance relative des facteurs

Le comportement souhaité est :

### Priorité 1

Les bâtiments continuent de se regrouper avec leurs bâtiments similaires.

### Priorité 2

Les routes influencent la croissance.

### Priorité 3

Le système utilise les tie-breaks déterministes.

On ne veut surtout pas obtenir :

```text
route → construction obligatoire
```

mais :

```text
bâtiments similaires
        +
route
        ↓
cellule plus attractive
```

La route doit influencer la morphologie sans devenir une règle absolue.

---

# 9. Exemple comportemental

Supposons :

```text
. . . . . . . .
. H H . . . . .
. . . . R R . .
. . . . . . . .
. . . . . . . .
```

`H` = maison
`R` = route

Plusieurs cellules sont valides.

Le système doit préférer une cellule qui :

```text
- reste dans la zone résidentielle
- est proche des maisons
- est proche de la route
```

plutôt qu'une cellule :

```text
- proche des maisons
- mais complètement isolée de la route
```

Cela doit progressivement produire :

```text
      H H H
      H H
R R R R R R
    H H H
      H
```

plutôt qu'une croissance totalement indépendante du réseau routier.

---

# 10. Agriculture

Ne pas donner exactement le même poids aux routes pour les fermes.

L'agriculture doit conserver son comportement Step 8 :

```text
farm
 ↓
nearby farm
 ↓
cluster
```

La route peut éventuellement avoir une influence secondaire, mais **elle ne doit pas devenir le principal facteur agricole dans cette étape**.

Le comportement attendu est :

```text
Residential:
    buildings + roads

Agricultural:
    farms primarily
    roads secondary or negligible
```

Choisir la solution la plus simple compatible avec le code actuel.

Ne pas inventer un modèle économique de transport agricole.

---

# 11. Recherche des routes

Ne pas créer prématurément de spatial index.

Le nombre de cellules évaluées est actuellement suffisamment contrôlé.

Pour chaque candidat :

```text
for candidate:
    find nearest relevant road
    calculate Manhattan distance
    calculate road influence
```

Une recherche simple sur les routes existantes est acceptable.

L'objectif est de conserver :

```text
correctness
→ maintainability
→ determinism
→ profiling
→ optimization
```

Ne pas optimiser avant d'avoir une mesure.

---

# 12. Séparation des responsabilités

Conserver une séparation claire :

### Candidate eligibility

Détermine :

```text
Can this cell contain a building?
```

### Development pressure

Détermine :

```text
How desirable is this cell?
```

### Construction

Détermine :

```text
Can the building actually be placed?
```

La route ne doit jamais modifier la validation de construction.

Exemple :

```text
road proximity
      ↓
score

NOT

road proximity
      ↓
placement validity
```

---

# 13. Déterminisme

Le résultat doit être strictement déterministe.

Interdit :

```ts
Math.random()
Date.now()
performance.now()
```

Interdit également :

* ordre dépendant du navigateur ;
* ordre non déterministe des collections ;
* état global mutable ;
* scoring dépendant du rendu.

À score égal conserver le tie-break Step 8 :

```text
score décroissant
y croissant
x croissant
```

ou exactement l'ordre déjà adopté dans Step 8.

Ne pas créer un second système de tie-break.

---

# 14. Tests unitaires

Ajouter des tests ciblés.

## Test 1 — Road distance

Vérifier :

```text
candidate adjacent to road
```

obtenant une influence supérieure à :

```text
candidate two cells away
```

---

## Test 2 — Road adjacency

Vérifier qu'une cellule directement adjacente à une route reçoit le bonus approprié.

---

## Test 3 — No road

Vérifier qu'une cellule suffisamment éloignée des routes reçoit :

```text
road influence = 0
```

---

## Test 4 — Residential preference

Créer une situation où deux cellules sont comparables en distance aux maisons :

```text
candidate A → proche road
candidate B → loin road
```

Le système doit sélectionner A.

---

## Test 5 — Existing building pressure remains dominant

Vérifier qu'une cellule proche d'une maison reste correctement favorisée même lorsqu'une autre cellule est légèrement plus proche d'une route.

Cela protège le comportement de Step 8.

---

## Test 6 — Agricultural behavior

Vérifier que les fermes continuent à privilégier le clustering autour des fermes existantes.

Une route ne doit pas complètement détourner le développement agricole.

---

## Test 7 — Determinism

Exécuter plusieurs fois exactement le même scénario.

Le résultat doit être identique :

```text
same world
same zones
same roads
same buildings
same ticks

→ same construction sequence
```

---

## Test 8 — Regression

Tous les tests Step 7 et Step 8 doivent continuer à passer.

---

# 15. Test morphologique

Ajouter au moins un test qui vérifie un comportement émergent plutôt qu'une simple fonction numérique.

Exemple :

```text
1 residential zone
1 road
0 houses
```

Puis laisser la simulation autonome construire plusieurs maisons.

Vérifier que les constructions successives ont tendance à se rapprocher du réseau routier tout en conservant le clustering résidentiel.

Le test ne doit pas dépendre d'un rendu visuel.

Il doit inspecter les `GridPosition`.

---

# 16. Simulation

Ne modifier que la partie nécessaire du pipeline de développement.

Conserver le rythme actuel :

```text
1 autonomous construction / 10 simulated seconds
```

Ne pas accélérer le développement.

Ne pas ajouter de nouveau timer.

Ne pas modifier :

* SimulationClock
* simulation speed
* population growth
* food production
* food consumption
* zoning rules

---

# 17. UI / Rendering

Pas de refonte visuelle.

Ne pas ajouter :

* heatmap de desirability ;
* overlay routier ;
* debug UI ;
* indicateurs de score ;
* nouveaux panneaux.

Les changements doivent être observables indirectement par la morphologie de la ville.

Le renderer continue simplement à afficher les bâtiments et routes existants.

La caméra reste **strictement top-down**.

Ne jamais réintroduire une caméra isométrique ou oblique.

---

# 18. Fichiers

Commencer par inspecter :

```text
src/domain/development/
src/domain/roads/
src/domain/construction/
src/domain/city/
src/domain/simulation/
```

Identifier les abstractions déjà créées par Step 8.

Réutiliser :

* `GridPosition`
* Manhattan distance existante
* `DevelopmentPressure`
* candidate evaluation
* scoring existant
* tie-break existant
* construction validation existante
* road domain model

Ne pas dupliquer ces concepts.

---

# 19. Architecture souhaitée

Le résultat doit rester conceptuellement proche de :

```text
DevelopmentSystem
        │
        ├── candidate eligibility
        │
        ├── similar building pressure
        │
        ├── road pressure
        │
        ├── deterministic scoring
        │
        └── best candidate
                 │
                 ▼
          normal construction
```

Éviter une architecture du type :

```text
DevelopmentSystem
  └── UrbanAI
       ├── RoadAI
       ├── BuildingAI
       ├── ZoneAI
       └── DesirabilityEngine
```

Ce serait prématuré.

---

# 20. Non-objectifs

Step 9 ne doit PAS implémenter :

* pathfinding ;
* traffic simulation ;
* cars ;
* pedestrians ;
* road capacity ;
* congestion ;
* public transport ;
* commute simulation ;
* travel time ;
* road hierarchy ;
* avenues ;
* intersections intelligentes ;
* zoning automatique ;
* land value ;
* pollution ;
* happiness ;
* jobs ;
* services ;
* districts ;
* procedural street generation.

Ces systèmes pourront venir plus tard.

---

# 21. Critère de réussite

Step 9 est réussi si la simulation produit désormais cette relation :

```text
Road
 ↓
spatial influence
 ↓
development pressure
 ↓
building placement
```

et si :

```text
Roads no longer behave as purely passive infrastructure.
```

Mais sans transformer le système en simulation de trafic.

Le résultat attendu est une ville qui commence naturellement à prendre une forme :

```text
       H H H
       H H
R R R R R R R
    H H H
      H
```

plutôt qu'une distribution uniforme des bâtiments dans les zones.

---

# 22. Validation finale

Exécuter obligatoirement :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Toutes les commandes doivent réussir.

Vérifier particulièrement :

```text
Step 7 tests
Step 8 tests
Step 9 tests
```

Aucun comportement existant ne doit régresser.

---

# Definition of Done

Step 9 est terminé lorsque :

* [ ] Road influence existe dans le domaine.
* [ ] L'influence utilise la distance Manhattan.
* [ ] L'adjacence aux routes est prise en compte.
* [ ] Le résidentiel bénéficie clairement de la proximité routière.
* [ ] Le clustering résidentiel de Step 8 reste actif.
* [ ] L'agriculture reste principalement guidée par les fermes.
* [ ] Les scores restent déterministes.
* [ ] Le tie-break de Step 8 est conservé.
* [ ] La validation de construction n'est pas modifiée.
* [ ] Aucun pathfinding n'est introduit.
* [ ] Aucun système de trafic n'est introduit.
* [ ] Aucun système d'IA générique n'est introduit.
* [ ] Aucun changement de caméra n'est effectué.
* [ ] Les tests unitaires couvrent l'influence routière.
* [ ] Un test morphologique valide le comportement global.
* [ ] `pnpm typecheck` passe.
* [ ] `pnpm lint` passe.
* [ ] `pnpm test` passe.
* [ ] `pnpm test:e2e` passe.
* [ ] `pnpm build` passe.

---

## Principe directeur

Ne pas chercher à rendre NOVA "intelligente".

Chercher à rendre ses **règles simples suffisamment cohérentes pour produire de la complexité émergente**.

Step 8 a introduit :

```text
buildings influence buildings
```

Step 9 introduit :

```text
roads influence buildings
```

C'est cette combinaison qui doit commencer à faire émerger une véritable structure urbaine.
