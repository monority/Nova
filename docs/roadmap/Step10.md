# Step 10 — Emergent Road Network

## Objectif

Faire évoluer NOVA d'un système où les routes sont exclusivement posées par le joueur vers un système où la croissance de la ville peut provoquer une **extension déterministe et locale du réseau routier**.

Le principe :

```text
Buildings
    ↓
spatial growth
    ↓
isolated / underserved development
    ↓
road extension
    ↓
new accessible cells
    ↓
future development
```

Cette étape doit rester volontairement simple.

**Il ne faut pas implémenter de trafic, de pathfinding ou de simulation de véhicules.**

L'objectif est de commencer à créer une boucle émergente entre :

```text
urban growth ↔ infrastructure
```

---

# 1. État actuel

NOVA dispose maintenant de :

* monde déterministe ;
* grille entière ;
* bâtiments ;
* routes ;
* zones ;
* population ;
* économie ;
* développement autonome ;
* development pressure ;
* influence routière ;
* picking métier séparé du renderer.

La chaîne actuelle est :

```text
zone
 ↓
candidate cells
 ↓
building pressure
 ↓
road pressure
 ↓
best candidate
 ↓
building
```

Step 10 ajoute :

```text
building growth
 ↓
road extension
```

---

# 2. Principe architectural

Ne pas créer :

* `RoadAI`
* `TrafficAI`
* `CityAI`
* `InfrastructureAI`
* `UrbanPlanner`
* `RoadPlanner`
* `PathfindingSystem`

Créer un petit système de domaine explicite.

Exemple conceptuel :

```text
src/domain/development/
src/domain/roads/
```

Le système peut vivre dans `roads/` ou `development/` selon l'architecture existante.

Le nom doit refléter son comportement réel.

Par exemple :

```ts
extendRoadNetwork(...)
```

ou :

```ts
evaluateRoadExtension(...)
```

Pas :

```ts
runUrbanAI(...)
```

---

# 3. Première version : connecter les bâtiments isolés

Le premier cas d'usage doit être extrêmement simple.

Lorsqu'un bâtiment résidentiel ou agricole nouvellement construit se trouve sans route adjacente, le système peut proposer une extension routière locale.

Exemple :

```text
. . . . .
. . H . .
. . . . .
. . R R .
```

Après extension :

```text
. . R . .
. . H . .
. . R . .
. . R R .
```

L'objectif est de créer une connexion simple entre le bâtiment et le réseau existant.

---

# 4. Ne pas faire du pathfinding général

C'est essentiel.

Step 10 ne doit PAS implémenter :

```text
A*
Dijkstra
navigation mesh
flow field
graph routing
```

Nous n'avons pas encore besoin d'un moteur de déplacement.

Pour cette étape, utiliser une logique géométrique déterministe simple.

---

# 5. Connexion orthogonale

Les routes utilisent déjà une grille orthogonale.

Une extension doit donc utiliser uniquement :

```text
N
S
E
W
```

Jamais de diagonale.

Exemple :

```text
H
|
R
|
R
|
R
```

est valide.

Mais :

```text
H
 \
  R
```

ne l'est pas.

---

# 6. Détection du réseau existant

Pour un bâtiment donné :

```text
building position
      ↓
adjacent road?
```

Si une route est déjà adjacente :

```text
building
   |
 road
```

aucune extension n'est nécessaire.

Cela doit être une condition très importante pour éviter de produire des routes inutiles.

---

# 7. Cas sans route existante

Si aucun réseau routier n'existe encore, **ne pas créer automatiquement une route entière jusqu'au bord de la carte**.

Le système doit rester local.

Une stratégie acceptable pour cette étape :

```text
building
 ↓
one or more deterministic road segments
```

Mais ne pas construire un réseau arbitraire.

Le joueur reste responsable du réseau initial.

La simulation commence à l'étendre à partir d'une infrastructure existante.

---

# 8. Connexion au réseau existant

Lorsqu'un bâtiment est éloigné d'une route :

```text
H . . . R
```

le système doit pouvoir créer une connexion orthogonale :

```text
H R R R R
```

ou :

```text
H
R
R
R
R
```

selon la géométrie.

Le choix doit être déterministe.

---

# 9. Manhattan

La distance utilisée doit rester :

```ts
Math.abs(x1 - x2) + Math.abs(y1 - y2)
```

Une connexion minimale correspond donc à une distance Manhattan minimale.

Ne pas utiliser de distance euclidienne.

---

# 10. Construction de la connexion

Pour un bâtiment et une route cible :

```text
building
    ↓
nearest road
```

calculer un chemin orthogonal minimal.

Mais cette logique doit rester très limitée.

Une fonction pure peut produire :

```ts
GridPosition[]
```

représentant les cellules routières nécessaires.

Exemple :

```ts
buildRoadConnection(
  from: GridPosition,
  target: GridPosition,
): readonly GridPosition[]
```

La fonction ne doit pas modifier le monde.

Elle produit une proposition.

---

# 11. Déterminisme du chemin

Si plusieurs chemins Manhattan sont possibles :

```text
H . .
. . .
. . R
```

il faut une règle stable.

Par exemple :

```text
horizontal first
then vertical
```

ou :

```text
vertical first
then horizontal
```

Choisir une convention et la centraliser.

Ne pas choisir aléatoirement.

Ne pas dépendre de l'ordre d'itération.

---

# 12. Obstacles

Les bâtiments et routes existent sur une grille occupée.

Une route ne peut pas être créée sur une cellule occupée par un bâtiment.

Donc :

```text
proposed road cell
        ↓
normal road placement validation
```

La proposition de connexion doit utiliser la validation existante.

Ne pas contourner :

```text
canPlaceRoad()
```

---

# 13. Important : aucune mutation directe

Le système de connexion ne doit pas faire :

```ts
city.roads.push(...)
```

directement.

Il doit utiliser le mécanisme normal :

```text
road placement command
```

ou l'équivalent architectural existant.

Principe :

```text
road extension
      ↓
normal road placement
      ↓
CityState
```

Cela garantit que :

* IDs ;
* occupancy ;
* connection masks ;
* validation ;
* rendering snapshot

restent cohérents.

---

# 14. Limiter l'extension

Ne pas permettre à une seule construction de générer une autoroute infinie.

Introduire une limite explicite.

Exemple :

```text
max 4 new road cells / autonomous extension
```

La valeur exacte doit être adaptée à la taille actuelle des zones et du monde.

L'important est que la limite soit :

* explicite ;
* déterministe ;
* testable.

---

# 15. Quand déclencher l'extension

Ne pas exécuter un système de génération routière à chaque frame.

L'extension doit être liée à la simulation autonome.

Par exemple :

```text
autonomous development tick
        ↓
building created
        ↓
evaluate road connectivity
        ↓
optional road extension
```

Pas :

```text
60 times / second
```

---

# 16. Ordre de simulation

Conserver un ordre clair.

Une proposition :

```text
1. population
2. economy
3. zoning
4. autonomous development
5. road extension
```

ou l'ordre existant si celui-ci possède déjà une cohérence particulière.

Le point important :

**une route créée pendant un tick doit pouvoir influencer les futurs développements, pas rétroactivement les décisions déjà prises pendant ce même calcul.**

Éviter les boucles :

```text
building
 ↓
road
 ↓
building
 ↓
road
 ↓
...
```

dans un seul tick.

Une seule phase d'extension maximum par tick autonome.

---

# 17. Priorité des bâtiments

Ne pas traiter tous les bâtiments du monde à chaque tick.

Commencer par le bâtiment nouvellement créé.

Exemple :

```text
development creates building
        ↓
check this building
        ↓
road extension if necessary
```

Cela évite un comportement massif et facilite le raisonnement.

---

# 18. Agriculture

Les fermes peuvent également bénéficier de connexions routières, mais ne pas leur donner un traitement spécial complexe.

Même mécanisme :

```text
building
 ↓
no adjacent road
 ↓
nearest existing road
 ↓
deterministic connection
```

Le comportement économique de la ferme reste inchangé.

---

# 19. Boucle émergente

Après Step 10, un scénario devrait pouvoir ressembler à :

```text
Initial road
───────────────

Residential zone
    ↓
House
    ↓
House is isolated
    ↓
Road extension
    ↓
New road frontage
    ↓
Future house gets stronger road pressure
```

Puis :

```text
        H
        |
H H ─── R ─── H
        |
        H
```

La ville commence à produire une structure.

---

# 20. Ne pas sur-optimiser

Pour l'instant :

```text
O(buildings × roads)
```

ou une recherche locale similaire est acceptable.

La ville est encore petite.

Ne pas créer :

* spatial hash ;
* R-tree ;
* quadtree ;
* road graph cache ;
* worker ;
* GPU computation.

Nous profilerons avant d'optimiser.

---

# 21. Tests unitaires

Ajouter des tests purs.

## Test 1 — Already connected

```text
building adjacent road
→ no extension
```

---

## Test 2 — One-cell connection

```text
H . R
```

→ proposition d'une route intermédiaire.

---

## Test 3 — Manhattan connection

Vérifier que la connexion produite correspond à une distance Manhattan minimale.

---

## Test 4 — Deterministic route

Même input :

```text
from
target
```

produit toujours exactement le même chemin.

---

## Test 5 — Tie-break path

Lorsqu'un chemin horizontal-first et vertical-first sont tous deux possibles, vérifier que la convention choisie est respectée.

---

## Test 6 — Occupied cell

Une cellule occupée par un bâtiment ne peut pas devenir une route.

---

## Test 7 — Existing road reuse

Une extension doit réutiliser le réseau existant plutôt que créer une seconde route parallèle inutile.

---

## Test 8 — Maximum extension

Vérifier que la limite de segments est respectée.

---

## Test 9 — No road network

Un bâtiment isolé sans réseau initial ne doit pas provoquer la création d'une route infinie ou d'un réseau arbitraire.

---

## Test 10 — Deterministic simulation

Même état initial :

```text
same world
same buildings
same roads
same seed
```

→ même extension routière.

---

# 22. Tests d'intégration

Ajouter au moins un scénario :

```text
initial road
+
residential zone
+
autonomous development
```

Après suffisamment de ticks :

```text
building exists
+
road connection exists
```

Vérifier les `GridPosition`, pas le rendu.

---

# 23. E2E

Ne pas bloquer Step 10 sur le problème GPU Chromium déjà identifié.

Le système peut être validé principalement par :

```text
unit tests
integration tests
```

Si l'infrastructure E2E WebGL devient stable, ajouter un scénario navigateur.

Ne pas modifier arbitrairement l'architecture du renderer pour contourner le stall GPU.

---

# 24. Rendering

Aucun nouveau système visuel.

Les routes existantes doivent simplement être affichées.

Les connection masks existants doivent continuer à fonctionner.

Lorsqu'une nouvelle route est ajoutée :

```text
road state
 ↓
RenderSnapshot
 ↓
Three.js
```

Les segments voisins doivent recevoir leurs nouveaux connection masks comme aujourd'hui.

Ne pas créer un renderer spécifique pour les routes autonomes.

---

# 25. UI

Pas de nouveau panneau.

Pas de bouton :

```text
AUTO BUILD ROADS
```

Pas de visualisation de :

```text
road desirability
```

Pas de heatmap.

La fonctionnalité doit être observable par le comportement de la ville.

---

# 26. Sauvegarde

Si les routes font déjà partie du snapshot sérialisable, aucune nouvelle architecture de persistence n'est nécessaire.

Les routes créées automatiquement doivent être sauvegardées exactement comme les routes créées manuellement.

Pas de distinction :

```text
playerRoad
simulationRoad
```

dans le modèle métier sauf si cette distinction existe déjà pour une raison fonctionnelle réelle.

---

# 27. IDs

Continuer à utiliser :

```text
road:1
road:2
road:3
```

ou le mécanisme d'ID déjà existant.

L'extension automatique ne doit pas utiliser :

```text
random UUID
```

si le système actuel utilise des IDs déterministes.

---

# 28. Non-objectifs

Step 10 ne doit PAS implémenter :

* trafic ;
* véhicules ;
* piétons ;
* pathfinding général ;
* congestion ;
* capacité routière ;
* vitesse ;
* accidents ;
* feux ;
* transports publics ;
* routes principales ;
* autoroutes ;
* hiérarchie routière ;
* coût économique des routes ;
* entretien ;
* pollution ;
* land value ;
* bonheur ;
* emploi ;
* services publics ;
* districts ;
* génération procédurale complète du réseau.

---

# 29. Definition of Done

Step 10 est terminé lorsque :

* [ ] Un bâtiment nouvellement créé peut être détecté comme isolé.
* [ ] Un bâtiment déjà adjacent à une route ne provoque aucune extension.
* [ ] Une extension peut rejoindre le réseau routier existant.
* [ ] Les extensions utilisent uniquement N/S/E/W.
* [ ] La connexion est Manhattan-minimale.
* [ ] Le choix entre plusieurs chemins est déterministe.
* [ ] Les routes passent par la validation normale.
* [ ] Les bâtiments ne peuvent jamais être remplacés par des routes.
* [ ] Une limite d'extension est respectée.
* [ ] Une seule phase d'extension est exécutée par événement de développement.
* [ ] Aucun système de trafic n'est introduit.
* [ ] Aucun pathfinding général n'est introduit.
* [ ] Les connection masks existants restent corrects.
* [ ] Les IDs de routes restent déterministes.
* [ ] Les routes automatiques sont persistées comme les routes normales.
* [ ] Les tests unitaires passent.
* [ ] Les tests d'intégration passent.
* [ ] Aucun changement de caméra n'est effectué.
* [ ] Aucun changement du rythme de simulation n'est effectué.

---

# Validation

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Si `test:e2e` reste bloqué uniquement par le stall GPU/WebGL Chromium déjà documenté, ne pas masquer le problème et ne pas modifier le code métier pour le contourner.

Le rapport final doit distinguer :

```text
Code / domain validation
Browser infrastructure validation
```

---

# Principe directeur

Step 8 :

```text
Buildings influence Buildings
```

Step 9 :

```text
Roads influence Buildings
```

Step 10 :

```text
Buildings can cause Roads
```

La boucle devient :

```text
       ┌─────────────────────┐
       │                     ▼
Zones → Buildings → Roads → Development
       ▲                     │
       └─────────────────────┘
```

Cette boucle doit rester **simple, déterministe et locale**.

La complexité doit venir du comportement émergent de ces règles, pas d'un gros système d'IA caché.
