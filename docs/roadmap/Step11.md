# Step 11 — Road Network Structure & Hierarchy

## Objectif

Faire évoluer le modèle routier de NOVA.

Actuellement, les routes savent déjà :

* occuper une cellule ;
* se connecter aux voisines ;
* être placées manuellement ;
* être étendues automatiquement ;
* influencer le développement ;
* former des connexions orthogonales.

Step 10 a introduit :

```text id="b6u4dj"
Building
   ↓
local road extension
   ↓
existing road network
```

La prochaine étape consiste à donner au réseau une **structure spatiale minimale**.

L'objectif est de pouvoir distinguer :

```text
local street
```

d'un :

```text
larger connecting road
```

sans encore implémenter de trafic ou de simulation de déplacement.

---

# 1. Principe

Ne pas créer un système complexe de transport.

Le réseau routier doit simplement commencer à posséder une notion de **rôle structurel**.

Conceptuellement :

```text id="j7p4sn"
Road
 ├── local
 └── arterial
```

Deux niveaux suffisent pour cette étape.

Ne pas créer :

* highway ;
* motorway ;
* avenue ;
* boulevard ;
* street ;
* lane ;
* highway network ;
* traffic graph.

Deux niveaux seulement :

```text
local
arterial
```

---

# 2. Pourquoi maintenant

Le réseau possède désormais une capacité d'extension autonome.

Sans structure, toutes les routes restent équivalentes :

```text
R R R R R R
```

Le résultat devient difficile à faire évoluer.

Nous voulons préparer :

```text id="0s9qba"
       local
         │
         │
local ─ arterial ─ local
         │
         │
       local
```

Cette structure pourra ensuite influencer :

* développement ;
* extension ;
* futurs déplacements ;
* districts ;
* services.

Mais ces systèmes ne doivent pas être implémentés maintenant.

---

# 3. Modèle de domaine

Ajouter un type explicite.

Par exemple :

```ts id="l9uv2v"
type RoadClass = "local" | "arterial"
```

ou l'équivalent correspondant au modèle actuel.

Une route existante doit avoir une classe déterministe.

Par défaut :

```text id="8g8pl6"
manual road → local
automatic extension → local
```

Ne pas introduire de distinction basée sur l'auteur.

---

# 4. Important : pas de classification arbitraire

Une route ne devient pas `arterial` simplement parce qu'elle est ancienne.

Ne pas utiliser :

```text id="lvw8uw"
road.id
creation order
randomness
```

pour déterminer sa classe.

La classification doit dépendre de propriétés spatiales mesurables.

---

# 5. Classification structurelle

Introduire une petite fonction pure permettant d'évaluer la structure d'une route.

Exemple conceptuel :

```ts id="qx1r8h"
classifyRoad(
  road: Road,
  context: RoadNetworkContext,
): RoadClass
```

Le contexte peut utiliser :

* longueur de la composante ;
* nombre de connexions ;
* nombre d'intersections ;
* rôle de connexion entre zones.

Mais rester simple.

---

# 6. Première règle d'artérialisation

Une route peut devenir `arterial` lorsqu'elle constitue un axe suffisamment important.

Par exemple, utiliser une combinaison de :

```text id="yobw9v"
longueur
+
connectivité
```

Exemple de règle raisonnable :

```text
road component >= 6 cells
AND
contains at least one meaningful junction
```

→ `arterial`

Les seuils doivent être centralisés et facilement modifiables.

Ne pas créer un moteur de scoring général.

---

# 7. Composante routière

Une composante correspond à un ensemble de cellules routières connectées orthogonalement.

Exemple :

```text id="s8r8zv"
R R R
    R
    R
```

est une seule composante.

Deux réseaux séparés :

```text id="5vwj5j"
R R R

      R R
```

sont deux composantes.

Créer une fonction pure permettant éventuellement d'obtenir la composante d'une route.

Exemple :

```ts id="m2djcv"
getRoadComponent(
  roads: readonly Road[],
  start: GridPosition,
): readonly GridPosition[]
```

Utiliser BFS ou DFS si nécessaire.

C'est acceptable ici.

Ce n'est PAS encore du pathfinding.

---

# 8. Intersection

Une cellule routière possède déjà probablement un connection mask.

Réutiliser cette information.

Définir une intersection structurelle comme une cellule ayant au moins 3 voisins routiers.

```text id="vl4j1g"
  R
R R R
```

→ intersection.

Une simple ligne :

```text id="jyh9ap"
R R R R
```

→ pas d'intersection.

Cette information peut participer à la classification.

---

# 9. Longueur

Calculer la longueur d'une composante en nombre de cellules.

Exemple :

```text id="h5m8vv"
R R R R R
```

→ longueur 5.

Ne pas utiliser une longueur physique flottante.

Tout reste exprimé en cellules.

---

# 10. Classification

Créer une fonction pure déterministe.

Exemple conceptuel :

```ts id="o9r0yc"
if (
  component.length >= ARTERIAL_MIN_LENGTH &&
  intersectionCount >= ARTERIAL_MIN_INTERSECTIONS
) {
  return "arterial"
}

return "local"
```

Les seuils sont des exemples.

Adapter aux structures existantes.

Le résultat doit être reproductible.

---

# 11. Pas de mutation obligatoire

La classification ne doit pas nécessairement muter chaque `Road`.

Il est préférable d'envisager :

```text id="hyslmm"
RoadNetworkAnalysis
```

comme projection calculée du réseau.

Exemple :

```ts id="f3sm0v"
type RoadNetworkAnalysis = {
  components: ...
  intersections: ...
  classifications: ...
}
```

Mais ne créer cette abstraction que si elle simplifie réellement le code.

Ne pas créer une architecture inutilement complexe.

---

# 12. Conservation du modèle actuel

Les routes restent :

```text id="h9qzob"
GridPosition
+
orientation
+
connection mask
+
stable ID
```

La classe structurelle est une information supplémentaire.

Ne pas casser :

* placement ;
* suppression ;
* occupancy ;
* connection masks ;
* rendering ;
* autonomous extension ;
* development pressure.

---

# 13. Routes existantes

Toutes les routes existantes doivent continuer à fonctionner.

Pour une route actuelle sans classe explicite :

```text id="c1ezhp"
local
```

peut être utilisé comme valeur par défaut.

Les anciennes sauvegardes ne doivent pas devenir invalides.

---

# 14. Extension autonome

Step 10 doit continuer à fonctionner.

Mais la classification peut maintenant influencer légèrement les extensions futures.

Une extension d'un axe `arterial` doit pouvoir rester connectée à cet axe.

Ne pas encore générer automatiquement de nouvelles artères.

---

# 15. Development Pressure

Step 9 utilise la proximité des routes.

Step 11 peut maintenant distinguer :

```text id="m3f4nf"
local road
arterial road
```

mais **ne pas modifier fortement le scoring maintenant**.

Conserver le comportement actuel.

Si nécessaire, ajouter seulement un petit bonus structurel :

```text
arterial > local
```

mais uniquement si cela améliore réellement la cohérence.

Ne pas refaire tout le système de development pressure.

---

# 16. Visualisation

Introduire une distinction visuelle très subtile.

Exemple :

```text id="qk8hzz"
local:
thin road

arterial:
slightly wider road
```

Pas de texture réaliste.

Pas de glow excessif.

Pas de couleurs criardes.

Le langage visuel de NOVA reste :

```text id="e7txpg"
minimal
architectural
dark
geometric
restrained
```

La différence doit être visible sans devenir une interface de jeu vidéo.

---

# 17. Renderer

Le renderer doit consommer une information de rendu.

Ne pas déplacer la logique de classification dans Three.js.

Mauvais :

```ts id="z8b3a6"
if (road.mesh.length > ...)
```

Correct :

```text id="5w3gdu"
Domain
 ↓
RoadNetworkAnalysis
 ↓
RenderSnapshot
 ↓
Three.js
```

---

# 18. Render Snapshot

Si le modèle `RenderSnapshot` contient déjà les routes, ajouter uniquement l'information nécessaire.

Exemple :

```ts id="0q4csg"
type RenderRoad = {
  id: RoadId
  position: GridPosition
  orientation: RoadOrientation
  connectionMask: RoadConnectionMask
  roadClass: RoadClass
}
```

Adapter aux types existants.

Le renderer ne doit pas recalculer la classe.

---

# 19. Sélection

Le picking déjà corrigé dans Step 9.1 doit continuer à fonctionner.

Une route sélectionnée doit toujours produire :

```text id="a7k9a3"
road:1
```

La nouvelle classe ne doit pas modifier l'identité métier.

---

# 20. Tests unitaires

Ajouter des tests purs.

## Test 1 — Single road

```text id="fjcbw0"
R
```

→ `local`

---

## Test 2 — Short road

```text id="j5p9q3"
R R R
```

→ `local`

---

## Test 3 — Long road

Créer une composante suffisamment longue.

→ `arterial` si les seuils sont atteints.

---

## Test 4 — Intersection

```text id="5u9f3h"
  R
R R R
  R
```

→ intersection détectée.

---

## Test 5 — Separate components

Deux réseaux indépendants doivent être analysés séparément.

---

## Test 6 — Determinism

Même réseau :

```text id="g9h1as"
same roads
same positions
```

→ même classification.

---

## Test 7 — Removal

Supprimer une route d'un axe.

La classification doit être recalculée correctement.

Exemple :

```text id="9s2lqf"
long arterial
      ↓
remove central segment
      ↓
two local components
```

si les seuils ne sont plus atteints.

---

## Test 8 — Existing road behavior

Les règles de placement et d'occupation doivent rester inchangées.

---

# 21. Tests d'intégration

Créer un réseau :

```text id="l7pvx7"
R R R R R
    R
    R
    R
```

Vérifier :

* composante unique ;
* intersection détectée ;
* classification cohérente ;
* snapshot correct.

---

# 22. Pas de simulation de trafic

Explicitement interdit dans cette étape.

Ne pas ajouter :

```text id="rx0wbr"
traffic density
vehicle count
speed
capacity
congestion
travel time
commute
```

La classe de route est uniquement structurelle.

---

# 23. Pas de graph de navigation

Une composante routière n'est pas encore un graphe de déplacement.

BFS/DFS peut servir à identifier une composante connectée.

Mais ne pas créer :

```text id="zjbx7k"
RoadGraph
Node
Edge
Path
Route
Navigation
```

sauf si le modèle actuel en possède déjà réellement besoin.

---

# 24. Performance

Le réseau reste petit.

Une analyse complète du réseau à chaque modification de route est acceptable.

Ne pas introduire :

* cache complexe ;
* spatial index ;
* worker ;
* GPU ;
* memoization sophistiquée.

Optimiser uniquement après mesure.

---

# 25. Architecture souhaitée

Le modèle conceptuel devient :

```text id="xwq5an"
Road cells
   ↓
Road connectivity
   ↓
Connected components
   ↓
Structural analysis
   ↓
Road class
   ↓
RenderSnapshot
```

Puis :

```text id="eml2d5"
Road class
   ↓
future development influence
   ↓
future urban morphology
```

---

# 26. Non-objectifs

Ne pas implémenter :

* trafic ;
* véhicules ;
* piétons ;
* pathfinding ;
* congestion ;
* transport public ;
* coûts routiers ;
* entretien ;
* feux ;
* panneaux ;
* parkings ;
* routes à sens unique ;
* autoroutes ;
* génération complète de rues ;
* optimisation du réseau ;
* démolition automatique ;
* routes adaptatives
