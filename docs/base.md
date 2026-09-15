# NOVA

> **Specification note:** [20-product-contract.md](./20-product-contract.md) is the source of truth for MVP scope, numerical simulation rules, persistence, performance budgets and acceptance gates. This document preserves the broader product vision and design rationale; where the two differ, the contract takes precedence.

> **Build a civilization. Watch it become something else.**

## 1. Product Vision

NOVA est un **city-builder expérimental et contemplatif** dans lequel le joueur construit progressivement une civilisation à partir d'un territoire vierge.

Le jeu ne cherche pas à reproduire une ville réelle.

Il cherche à représenter **l'émergence d'une civilisation comme un système vivant**.

Le joueur définit :

* où les habitants s'installent ;
* comment les quartiers se développent ;
* où passent les infrastructures ;
* quelles ressources sont exploitées ;
* quelles technologies sont développées ;
* quelles priorités sont données à la civilisation.

Puis la simulation prend progressivement le relais.

La ville devient alors un système autonome.

---

# 2. Positionnement

NOVA se situe entre :

* city-builder ;
* simulation systémique ;
* jeu de stratégie léger ;
* visualisation procédurale ;
* expérience contemplative.

Le joueur doit pouvoir passer plusieurs minutes simplement à **observer sa ville évoluer**.

L'objectif n'est pas de maximiser immédiatement un score.

L'objectif est de créer une civilisation intéressante à observer.

---

# 3. Philosophie fondamentale

## 3.1 Le joueur ne place pas tout

Le joueur ne doit pas construire chaque maison individuellement.

Il définit plutôt des **conditions de développement**.

Exemple :

```text
Zone résidentielle
    ↓
Densité moyenne
    ↓
Accès à l'énergie
    ↓
Accès à une route
    ↓
Population disponible
    ↓
Construction automatique
```

La ville détermine ensuite :

* quelles parcelles sont développées ;
* quels bâtiments apparaissent ;
* comment les quartiers évoluent ;
* où la population se concentre ;
* quelles infrastructures deviennent nécessaires.

---

# 4. Expérience utilisateur cible

Une partie typique doit suivre cette progression :

```text
Terrain vierge
      ↓
Première implantation
      ↓
Quelques maisons
      ↓
Petit village
      ↓
Routes
      ↓
Production
      ↓
Quartiers
      ↓
Ville
      ↓
Infrastructure avancée
      ↓
Métropole
      ↓
Civilisation autonome
```

Le joueur doit ressentir une transformation visuelle importante entre le début et la fin.

---

# 5. Échelle de civilisation

La civilisation possède plusieurs stades.

## Stage 0 — Wilderness

Terrain vierge.

Population :

```text
0
```

Infrastructure :

```text
aucune
```

---

## Stage 1 — Settlement

Premiers habitants.

Éléments visibles :

* maisons ;
* chemin ;
* puits ;
* petite production alimentaire.

---

## Stage 2 — Village

Population :

```text
50 → 500
```

Apparition :

* routes ;
* quartiers résidentiels ;
* agriculture ;
* stockage ;
* marché ;
* premières infrastructures publiques.

---

## Stage 3 — Town

Population :

```text
500 → 5 000
```

Apparition :

* centre-ville ;
* commerce ;
* industrie ;
* réseau énergétique ;
* écoles ;
* transports.

---

## Stage 4 — City

Population :

```text
5 000 → 100 000
```

Apparition :

* immeubles ;
* grands axes ;
* réseaux complexes ;
* centrales ;
* universités ;
* hôpitaux ;
* transports publics.

---

## Stage 5 — Metropolis

Population :

```text
100 000 → 1 000 000+
```

Apparition :

* quartiers très denses ;
* infrastructures massives ;
* réseaux automatisés ;
* transports autonomes ;
* architecture verticale.

---

## Stage 6 — Autonomous Civilization

La civilisation devient largement autonome.

Le joueur peut :

* intervenir ;
* définir des priorités ;
* modifier certaines règles ;
* observer.

La ville commence à prendre des décisions elle-même.

---

# 6. Core Gameplay Loop

Le gameplay principal :

```text
OBSERVE
   ↓
PLAN
   ↓
BUILD
   ↓
GROW
   ↓
RESEARCH
   ↓
ADAPT
   ↓
AUTOMATE
   ↓
OBSERVE
```

Cette boucle doit rester compréhensible sans nécessiter de micro-management permanent.

---

# 7. Construction

Le joueur dispose de plusieurs catégories.

## Zones

* Residential
* Commercial
* Industrial
* Agricultural
* Research
* Civic
* Energy
* Recreation

## Infrastructure

* Roads
* Bridges
* Power lines
* Water
* Transit
* Data networks

## Buildings

Les bâtiments individuels peuvent être proposés comme éléments importants, mais la majorité de la construction doit être générée automatiquement.

---

# 8. Zoning

Une zone possède des paramètres.

```ts
interface Zone {
  id: string
  type: ZoneType

  density: number
  priority: number

  growthRate: number
  landValue: number

  infrastructureRequirement: number
}
```

Le joueur peut modifier :

```text
Density
Growth
Priority
```

La simulation décide ensuite comment exploiter la zone.

---

# 9. Ville comme système

Chaque élément doit avoir des relations avec les autres.

Exemple :

```text
Population
   ↓
Housing
   ↓
Employment
   ↓
Transport
   ↓
Energy
   ↓
Production
   ↓
Resources
   ↓
Population
```

Une modification doit pouvoir produire des conséquences indirectes.

Exemple :

```text
Nouvelle industrie
      ↓
emplois
      ↓
migration
      ↓
besoin de logements
      ↓
augmentation du trafic
      ↓
nouvelle route
      ↓
extension de la ville
```

C'est cette propagation qui doit donner l'impression d'une ville vivante.

---

# 10. Population

La population est simulée au niveau agrégé dans un premier temps.

Le jeu ne simule pas chaque habitant individuellement.

Un groupe démographique possède :

```ts
interface PopulationGroup {
  population: number

  housingNeed: number
  foodNeed: number
  energyNeed: number
  transportNeed: number

  employmentRate: number
  satisfaction: number

  ageDistribution: AgeDistribution
}
```

Cela permet une simulation beaucoup plus légère.

---

# 11. Besoins

Les besoins principaux sont :

```text
Housing
Food
Water
Energy
Transport
Health
Education
Employment
Knowledge
```

Chaque besoin produit un niveau de satisfaction.

Exemple :

```text
Housing      91%
Food         87%
Energy       95%
Transport    61%
Health       83%
Education    74%
```

La satisfaction globale influence :

* croissance ;
* migration ;
* productivité ;
* stabilité ;
* développement.

---

# 12. Ressources

Le jeu conserve volontairement peu de ressources.

## Core resources

```text
Food
Materials
Energy
Knowledge
Credits
```

Chaque ressource possède :

```text
Production
Consumption
Storage
Flow
```

Exemple :

```text
Energy

Production     4 820
Consumption    4 210
Balance          +610
Storage         71%
```

---

# 13. Économie

L'économie n'est pas destinée à devenir un tableur.

Le joueur doit pouvoir comprendre la situation visuellement.

Exemple :

```text
ENERGY
██████████████████░░  91%

FOOD
██████████████░░░░░░  72%

MATERIALS
████████████████░░░░  81%
```

Les détails restent accessibles dans les panneaux secondaires.

---

# 14. Technologie

La civilisation possède un arbre technologique.

Exemple :

```text
SURVIVAL
   │
   ├── Agriculture
   │
   └── Construction
          │
          ├── Engineering
          │
          └── Industry
                 │
                 ├── Electricity
                 │
                 └── Computing
                        │
                        ├── AI
                        │
                        └── Autonomous Systems
```

Les technologies ne doivent pas seulement débloquer des menus.

Elles doivent **transformer visuellement la ville**.

---

# 15. Transformation visuelle

Exemple :

### Agriculture

Apparition de :

* champs ;
* greniers ;
* irrigation.

### Electricity

Apparition de :

* lignes énergétiques ;
* éclairage ;
* centrales.

### Computing

Apparition de :

* réseaux ;
* data centers ;
* infrastructures numériques.

### AI

Apparition de :

* transports autonomes ;
* bâtiments intelligents ;
* optimisation automatique.

---

# 16. Temps

Le joueur peut accélérer le temps.

```text
Pause
1×
2×
5×
20×
```

100× is post-MVP and is not exposed until the performance budget is proven. See [20-product-contract.md](./20-product-contract.md).

Le temps est une mécanique fondamentale.

La ville doit être agréable :

* en temps réel ;
* accélérée ;
* de nuit ;
* après plusieurs années.

---

# 17. Timeline

Une timeline permet de naviguer dans l'histoire de la civilisation.

Exemple :

```text
Year 0 ─── Year 25 ─── Year 100 ─── Year 300 ─── Year 1000
  ↑
  player
```

Le joueur peut consulter les événements historiques :

```text
Year 12
First settlement

Year 47
First power plant

Year 83
Population reaches 10,000

Year 121
Industrial revolution

Year 246
Autonomous transport activated
```

---

# 18. Événements

Les événements doivent émerger de la simulation.

Exemples :

* pénurie alimentaire ;
* migration ;
* découverte scientifique ;
* crise énergétique ;
* congestion ;
* croissance démographique ;
* accident industriel ;
* nouvelle technologie ;
* changement climatique local ;
* expansion territoriale.

Les événements ne doivent pas être uniquement des popups aléatoires.

Ils doivent avoir une cause identifiable.

---

# 19. Autonomie

À mesure que la civilisation progresse, le joueur intervient moins.

Au début :

```text
Player → City
```

À la fin :

```text
Player
   ↓
Policies
   ↓
AI / Systems
   ↓
City
```

Le joueur devient progressivement un **architecte de systèmes** plutôt qu'un constructeur manuel.

---

# 20. Monde

Le monde est généré à partir d'un seed.

```ts
interface WorldSeed {
  seed: number
}
```

Le même seed doit produire le même monde.

Le terrain peut contenir :

* plaines ;
* collines ;
* montagnes ;
* rivières ;
* lacs ;
* côtes ;
* îles.

La génération doit rester stylisée.

Pas de photoréalisme.

---

# 21. Carte

La carte doit être lisible à plusieurs niveaux.

### Strategic

Vue globale.

### City

Quartiers et infrastructures.

### District

Bâtiments.

### Detail

Petits éléments visuels.

Le zoom doit être continu.

---

# 22. Direction artistique

## Référence esthétique

NOVA doit ressembler davantage à une **maquette numérique lumineuse** qu'à un city-builder traditionnel.

Principes :

* fond sombre ;
* géométrie simple ;
* architecture abstraite ;
* éclairage contrôlé ;
* très peu de textures ;
* couleurs limitées ;
* beaucoup d'espace négatif ;
* lignes et flux lumineux ;
* silhouettes facilement reconnaissables.

---

# 23. Palette

La palette de base :

```text
Background
Near Black

Terrain
Dark Neutral

Buildings
Light Neutral

Infrastructure
Low-intensity accent

Active systems
Bright accent

Critical systems
Warm accent
```

Les couleurs doivent avoir une fonction.

Pas de rainbow UI.

---

# 24. Ville de nuit

La nuit est une partie importante de l'expérience visuelle.

Les bâtiments peuvent émettre :

```text
Window light
Street light
Transit light
Energy flow
Data flow
```

Les routes deviennent des flux lumineux subtils.

Les véhicules deviennent des particules en mouvement.

La ville doit presque devenir une constellation artificielle.

---

# 25. Routes

Les routes ne sont pas seulement des textures.

Elles sont des systèmes dynamiques.

```text
Road
 ├── capacity
 ├── traffic
 ├── connectivity
 └── importance
```

Le trafic peut être représenté par des flux.

Plus une route est utilisée :

```text
traffic ↑
brightness ↑
```

Une route congestionnée devient immédiatement identifiable.

---

# 26. Véhicules

Le jeu ne simule pas chaque véhicule individuellement au début.

On utilise des flux agrégés.

Visuellement :

```text
Particle → Road → Destination
```

Plus tard, certains véhicules peuvent être individualisés.

---

# 27. Bâtiments

Les bâtiments utilisent un système modulaire.

Un bâtiment est défini par :

```ts
interface Building {
  id: string
  type: BuildingType

  position: Vector2
  rotation: number

  height: number
  density: number

  populationCapacity: number
  energyConsumption: number
}
```

Les bâtiments d'un même type doivent varier légèrement.

La variation vient du seed.

---

# 28. Génération procédurale

Une ville ne doit pas être une collection de modèles identiques.

Le système peut générer :

```text
Building footprint
Height
Width
Spacing
Windows
Roof
Lights
Color variation
```

À partir du même seed :

```text
same seed → same city
```

---

# 29. Simulation déterministe

La simulation doit être déterministe autant que possible.

```text
seed
 +
initial state
 +
simulation steps
 =
same result
```

Cela permet :

* replay ;
* debugging ;
* partage ;
* sauvegarde ;
* tests ;
* reproduction de bugs.

---

# 30. Interaction

Interactions principales :

### Left click

Sélection.

### Drag

Placement / dessin de zones et routes.

### Wheel

Zoom.

### Middle drag

Pan.

### Right click

Cancel / contextual action.

### Keyboard

```text
Space
Pause

1
Normal speed

2
2×

3
5×

4
20×
```

100× is post-MVP and is not exposed until the performance budget is proven.

---

# 31. Interface

L'interface doit rester discrète.

## Top

```text
YEAR 128
POPULATION 84,291
ENERGY +610
FOOD +184
```

## Left

```text
BUILD

Zones
Infrastructure
Buildings
Transport
Energy
Research
```

## Bottom

Timeline.

## Right

Contextual inspector.

---

# 32. Règle UI

L'interface ne doit jamais devenir le sujet principal.

La ville doit rester visible.

Éviter :

* gros panneaux ;
* dashboards permanents ;
* cartes excessives ;
* badges partout ;
* gradients ;
* glassmorphism ;
* esthétique cyberpunk.

---

# 33. Camera

Caméra orthographique par défaut.

Perspective légèrement inclinée :

```text
70°–80°
```

Le joueur doit avoir une sensation :

```text
map
+
3D
+
architectural model
```

---

# 34. Rendering

Technologie cible pour le MVP :

```text
Three.js
WebGL2
```

Backend optionnel :

```text
WebGPU
WGSL
```

WebGL2 is the release baseline. See [12-rendering-architecture.md](./12-rendering-architecture.md).

---

# 35. Rendering strategy

Utiliser massivement :

* InstancedMesh ;
* GPU particles ;
* custom shaders ;
* batched geometry ;
* frustum culling ;
* LOD ;
* texture atlases si nécessaires.

Éviter :

```text
1 React component = 1 building
```

Le rendu doit être indépendant de React.

---

# 36. Simulation architecture

Architecture logique :

```text
World
 │
 ├── Terrain
 │
 ├── City
 │    ├── Zones
 │    ├── Buildings
 │    ├── Roads
 │    └── Infrastructure
 │
 ├── Population
 │
 ├── Economy
 │
 ├── Technology
 │
 └── Events
```

Puis :

```text
Simulation
      ↓
World State
      ↓
Renderer
      ↓
Visual State
```

React contrôle l'interface.

Il ne contrôle pas la simulation.

---

# 37. Architecture frontend

Stack cible :

```text
Next.js
React
TypeScript
Three.js
WebGPU
WGSL
CSS
```

Organisation :

```text
src/
├── app/
├── features/
│   ├── world/
│   ├── city/
│   ├── simulation/
│   ├── population/
│   ├── economy/
│   ├── technology/
│   ├── construction/
│   └── rendering/
│
├── engine/
│   ├── simulation/
│   ├── terrain/
│   ├── pathfinding/
│   └── spatial/
│
└── ui/
```

---

# 38. Simulation loop

La simulation fonctionne avec un timestep fixe.

```text
Input
  ↓
Simulation Tick
  ↓
Population
  ↓
Economy
  ↓
Construction
  ↓
Technology
  ↓
Events
  ↓
World State
```

Le renderer peut fonctionner à une fréquence différente.

---

# 39. Performance targets

Objectifs :

```text
60 FPS minimum
120 FPS target (post-MVP)
```

Pour une ville importante :

```text
10,000+ buildings
100,000+ population
large road network
large particle count
```

La population ne doit pas être simulée individuellement.

---

# 40. Web Worker

La simulation peut être déplacée dans un Worker lorsque nécessaire.

```text
Main Thread
 ├── Rendering
 └── UI

Worker
 └── Simulation
```

Le transfert de données doit être limité.

---

# 41. Sauvegarde

Une partie possède :

```ts
interface SaveGame {
   formatVersion: number
   gameVersion: string
   seed: number
   simulationTick: number
   prngState: number[]
   state: WorldState
   commandLog: Command[]
   stateHash: string
}
```

La sauvegarde suit le schema `SaveGameV1` et les regles de validation atomique de [20-product-contract.md](./20-product-contract.md). Elle doit etre versionnee.

---

# 42. Partage

Une ville doit pouvoir être partagée.

Format conceptuel :

```text
/nova/city/{seed}/{state}
```

ou une URL contenant un état sérialisé.

Un joueur doit pouvoir montrer :

> "Voici ma civilisation après 427 années."

---

# 43. Accessibilité

Prévoir :

* mode pause ;
* réduction des animations ;
* contraste suffisant ;
* navigation clavier ;
* états non dépendants uniquement de la couleur ;
* réduction des effets lumineux.

---

# 44. Tests

Tester principalement les systèmes déterministes.

### Unit tests

* croissance ;
* économie ;
* population ;
* consommation ;
* production ;
* technologie ;
* zoning ;
* génération.

### Integration tests

```text
zone
→ construction
→ population
→ économie
```

### E2E

Scénario :

```text
Create world
→ Place settlement
→ Advance time
→ City grows
→ Save
→ Reload
```

---

# 45. Non-goals

NOVA ne doit pas devenir :

* Cities: Skylines ;
* SimCity ;
* un jeu de gestion hardcore ;
* un jeu de placement de bâtiments pièce par pièce ;
* un simulateur économique réaliste ;
* un MMO ;
* un jeu multijoueur ;
* un dashboard de data visualization déguisé en jeu.

Le projet doit rester centré sur :

> **construction + émergence + observation.**

---

# 46. MVP

Le MVP doit être extrêmement réduit.

Il doit contenir :

```text
World
Terrain
Camera
Roads
Residential zones
Basic houses
Population
Food
Energy
Time
Day/night
Growth
Save
```

Le joueur doit pouvoir :

```text
Create world
      ↓
Place zone
      ↓
Build road
      ↓
Houses appear
      ↓
Population grows
      ↓
City expands
      ↓
Advance time
      ↓
Observe evolution
```

---

# 47. Vertical Slice

Avant d'ajouter :

* technologie ;
* économie complexe ;
* recherche ;
* événements ;
* IA ;
* grandes cartes ;

il faut obtenir une vertical slice visuellement convaincante.

Elle doit montrer :

```text
Terrain
   +
Road
   +
10–100 buildings
   +
Population
   +
Traffic
   +
Day/night
   +
Luminous visual language
```

Si cette scène est déjà belle et intéressante à observer, le concept fonctionne.

---

# 48. Milestones

## M0 — Foundation

* projet ;
* renderer ;
* caméra ;
* world ;
* seed ;
* boucle de simulation.

## M1 — Terrain

* génération ;
* biomes ;
* water ;
* navigation.

## M2 — Construction

* zones ;
* roads ;
* buildings ;
* placement.

## M3 — Population

* habitants ;
* housing ;
* growth ;
* migration.

## M4 — Economy

* food ;
* materials ;
* energy ;
* production/consumption.

## M5 — Living City

* traffic ;
* expansion ;
* district formation ;
* day/night.

## M6 — Technology

* research ;
* technology tree ;
* visual progression.

## M7 — Civilization

* advanced infrastructure ;
* automation ;
* autonomous systems.

## M8 — Events

* crises ;
* discoveries ;
* historical events.

## M9 — Persistence

* saves ;
* load;
* share URLs.

## M10 — Polish

* shaders ;
* lighting ;
* particles ;
* camera ;
* audio ;
* UX ;
* performance.

---

# 49. Premier objectif visuel

Le premier objectif n'est pas :

> "faire un city-builder."

Le premier objectif est :

> **faire apparaître une petite ville qui donne envie de la regarder vivre.**

Une scène idéale :

```text
       dark terrain

          ·  ·
      ───────────
         ╲
     ▫ ▫ ▫ ▫
       ╲
    ▫ ▫ ▫ ▫ ▫
         ╲
       ═══════
        · · ·

      faint lights
      moving traffic
      growing buildings
```

La ville doit sembler calme, précise et organique.

---

# 50. Design Principle

La règle fondamentale du projet :

> **Le joueur dessine les règles.
> La simulation dessine la ville.**

NOVA devient intéressant lorsque le joueur commence à dire :

> "Je n'avais pas prévu que ma ville ressemble à ça."

C'est cette émergence qui doit constituer l'identité du produit.
