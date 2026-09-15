# Step 15 — Emergent Urban Morphology

## Contexte

NOVA dispose maintenant d'une boucle de simulation fonctionnelle :

```text
population
    ↓
housing pressure
    ↓
development pressure
    ↓
new buildings
    ↓
road extension
    ↓
additional capacity
    ↓
population growth
    ↓
densification
    ↓
house → apartment
```

Les étapes précédentes ont également introduit :

* zones résidentielles ;
* zones agricoles ;
* développement autonome ;
* pression de développement ;
* influence des routes ;
* hiérarchie routière ;
* extension routière autonome ;
* appartements ;
* services communautaires ;
* scénario initial ;
* métriques de simulation ;
* caméra top-down ;
* sélection par cellule.

Le système est désormais suffisamment riche pour commencer à produire une **morphologie urbaine émergente**.

Le but de ce milestone est de faire en sorte que la ville ne ressemble plus seulement à :

```text
objets placés sur une grille
```

mais progressivement à :

```text
une colonie qui possède une structure spatiale.
```

---

# Objectif

Faire émerger progressivement des formes reconnaissables :

```text
        FARM
          │
          │
     ┌────┴────┐
     │         │
     │ RESIDENTIAL
     │   CORE  │
     │    ●    │
     │   ╱│╲   │
     └──╱─┼─╲──┘
        ROAD
          │
       SERVICE
          │
     DENSIFICATION
```

Le joueur ne doit pas dessiner explicitement cette structure.

Elle doit émerger des systèmes existants.

---

# Principe fondamental

Ne pas créer un système de « ville intelligente ».

Ne pas créer :

* `CityAI`
* `UrbanPlanner`
* `DistrictManager`
* `UrbanMorphologyManager`
* `CityDirector`
* `MasterPlanner`
* `LayoutGenerator`

La morphologie doit être une **conséquence des règles existantes**.

---

# 1. Observer l'état actuel avant modification

Avant d'écrire du nouveau code :

1. inspecter `development-system.ts` ;
2. inspecter le système de routes ;
3. inspecter l'évolution house → apartment ;
4. inspecter les services ;
5. inspecter le scénario initial ;
6. lancer la simulation ;
7. déterminer où les bâtiments apparaissent actuellement.

Répondre à ces questions :

```text
Les bâtiments se regroupent-ils ?
Les routes renforcent-elles réellement les regroupements ?
Les services créent-ils un petit centre ?
Les appartements apparaissent-ils près des routes ?
Les fermes restent-elles spatialement séparées ?
La ville possède-t-elle déjà un centre implicite ?
```

Ne pas modifier ce qui fonctionne déjà.

---

# 2. Définir la notion minimale de proximité urbaine

Créer si nécessaire une petite abstraction pure permettant de répondre à :

```text
distance Manhattan entre deux cellules
```

et éventuellement :

```text
isAdjacent
```

Ne pas créer de système spatial complexe.

Le modèle actuel basé sur :

```text
GridPosition
```

reste la source de vérité.

---

# 3. Renforcer légèrement le rôle des routes

Les routes doivent devenir progressivement des **axes structurants**.

Le système existant de Step 9 possède déjà une influence routière.

Le système Step 10 possède déjà l'extension routière.

Le système Step 11 possède déjà :

```text
local
arterial
```

Le but de Step 15 est simplement de vérifier et calibrer leur interaction.

Pour le résidentiel :

```text
building pressure
+
adjacency
+
road proximity
+
arterial influence
```

peut déterminer le meilleur emplacement.

Mais les routes ne doivent pas complètement dominer la pression de proximité existante.

---

# 4. Renforcer les noyaux résidentiels

Une ville doit avoir tendance à développer :

```text
maison
  ↓
maison proche
  ↓
maison proche
  ↓
route
  ↓
densification
```

plutôt que :

```text
maison       maison

      maison

maison              maison

           maison
```

Le clustering existant de Step 8 doit rester la base.

Ajuster seulement les poids nécessaires afin que :

* les maisons attirent les nouvelles maisons ;
* les routes renforcent les corridors ;
* les zones libres proches du noyau soient favorisées ;
* les bâtiments ne soient pas uniformément dispersés.

---

# 5. Créer des corridors urbains émergents

Une conséquence souhaitée est :

```text
HOUSE
HOUSE
HOUSE
  │
  │ ROAD
  │
HOUSE
HOUSE
  │
APARTMENT
```

La ville peut donc progressivement développer des axes.

Important :

Ne pas générer de route simplement parce qu'un corridor serait « esthétique ».

Les routes doivent continuer à provenir du mécanisme réel de Step 10.

---

# 6. Donner aux services un rôle spatial plus visible

Le service communautaire existant possède déjà une influence résidentielle.

Cette influence doit favoriser l'apparition d'un petit noyau autour du service.

Exemple :

```text
       HOUSE
          │
HOUSE ─ COMMUNITY ─ HOUSE
          │
       HOUSE
```

Puis éventuellement :

```text
       APARTMENT
           │
HOUSE ─ COMMUNITY ─ HOUSE
           │
       APARTMENT
```

Le service ne doit pas :

* forcer des constructions ;
* créer directement des bâtiments ;
* créer un district ;
* créer une animation.

Il ne fait qu'influencer le scoring existant.

---

# 7. Densification spatiale

L'évolution :

```text
HOUSE → APARTMENT
```

doit commencer à produire une différence morphologique.

L'objectif :

```text
périphérie
    ↓
maisons
    ↓
routes
    ↓
centre
    ↓
appartements
```

Les appartements doivent avoir tendance à apparaître dans les zones où plusieurs facteurs convergent :

* population ;
* saturation du logement ;
* proximité résidentielle ;
* route ;
* service.

Ne pas introduire un nouveau système de densité.

Utiliser uniquement les conditions déjà présentes.

---

# 8. Préserver les espaces agricoles

Les fermes ne doivent pas progressivement être englouties par le résidentiel.

Le système agricole doit continuer à favoriser :

* proximité des autres fermes ;
* zone agricole ;
* cellules libres ;
* contraintes de terrain existantes.

Éviter de faire des routes ou des maisons traverser arbitrairement les zones agricoles.

L'objectif est d'obtenir quelque chose comme :

```text
┌──────────────────────┐
│ FARM   FARM          │
│ FARM                 │
│                      │
│────── ROAD ──────────│
│       │              │
│   HOUSE HOUSE         │
│   HOUSE APARTMENT     │
│       COMMUNITY       │
│   HOUSE HOUSE         │
└──────────────────────┘
```

Pas besoin de générer explicitement cette structure.

---

# 9. Définir une périphérie naturelle

Une fois qu'un noyau résidentiel devient dense, les nouvelles constructions doivent progressivement chercher :

* cellules libres proches ;
* continuité avec les bâtiments existants ;
* proximité des routes ;
* zones compatibles.

Cela doit produire naturellement :

```text
        FARM

      HOUSE HOUSE
    HOUSE APARTMENT
    HOUSE COMMUNITY
      HOUSE HOUSE
         │
         │
       ROAD
         │
      HOUSE
        HOUSE
```

Le système ne doit jamais choisir arbitrairement une cellule éloignée simplement parce qu'elle est libre.

---

# 10. Ne pas introduire de districts explicites

Pas de :

```text
District
Neighborhood
Downtown
Suburb
Industrial Zone
```

dans le domaine.

Ce sont des concepts visuels qui doivent émerger de la géométrie.

NOVA doit pouvoir produire une ville ressemblant à plusieurs quartiers sans posséder encore un système de quartiers.

---

# 11. Préserver le déterminisme

Toutes les nouvelles décisions doivent rester déterministes.

À score égal :

```text
score
↓
y
↓
x
```

ou une règle de tie-break déjà utilisée dans le projet.

Interdit :

```ts
Math.random()
```

dans la simulation.

Pas de dépendance à :

* FPS ;
* frame count ;
* heure réelle ;
* ordre non déterministe des collections.

---

# 12. Préserver l'architecture

La direction doit rester :

```text
UI
 ↓
Application
 ↓
Domain
```

et :

```text
Simulation
 ↓
RenderSnapshot
 ↓
Three.js
```

Aucun import :

```text
domain → React
domain → Three.js
domain → Next.js
```

Ne pas déplacer la logique de développement dans le renderer.

---

# 13. Visualisation

Ne pas refaire le renderer.

Les changements visuels doivent venir principalement de la morphologie réelle.

Les bâtiments existants doivent rester :

* géométriques ;
* sobres ;
* distincts ;
* top-down friendly.

Les routes doivent rester fines.

Les appartements doivent continuer à être plus hauts/plus massifs.

Le service doit rester identifiable sans devenir un monument lumineux.

---

# 14. Vérifier la simulation

Créer un scénario de test suffisamment long.

Exemple conceptuel :

```text
initial settlement
      ↓
advance 30s
      ↓
advance 60s
      ↓
advance 120s
      ↓
advance 300s
```

Observer :

* nombre de maisons ;
* nombre d'appartements ;
* nombre de fermes ;
* nombre de routes ;
* population ;
* logement ;
* services.

Mais surtout :

## Mesurer la structure spatiale

Par exemple :

* distance moyenne entre bâtiments résidentiels ;
* nombre de bâtiments résidentiels adjacents ;
* nombre de bâtiments proches des routes ;
* nombre d'appartements proches des routes ;
* concentration autour du service.

Ces métriques peuvent rester uniquement dans les tests.

---

# 15. Ajouter un test de clustering

Créer un test déterministe démontrant que, dans un scénario contrôlé :

```text
existing residential cluster
+
available residential cells
```

favorise les cellules proches du cluster plutôt qu'une cellule isolée équivalente.

Ne pas tester une valeur arbitraire du score si le comportement est ce qui importe.

Tester plutôt :

```text
expected candidate
```

---

# 16. Ajouter un test de corridor

Créer un scénario :

```text
ROAD
ROAD
ROAD
```

avec des cellules résidentielles disponibles autour.

Vérifier que le système favorise les cellules proches de l'axe routier lorsque les autres facteurs sont équivalents.

---

# 17. Ajouter un test de service center

Créer :

```text
COMMUNITY
```

avec plusieurs cellules résidentielles candidates.

Vérifier que la couverture du service augmente la priorité des cellules couvertes sans forcer leur construction.

---

# 18. Ajouter un test de séparation agricole

Créer :

```text
FARM FARM
```

et une zone agricole avec plusieurs cellules candidates.

Vérifier que le développement agricole continue à se concentrer autour des fermes.

Vérifier également que l'ajout de routes ne transforme pas l'agriculture en développement résidentiel.

---

# 19. Ajouter un test de densification

Créer un scénario avec :

```text
high residential pressure
+
saturated house
+
road nearby
+
service nearby
```

et vérifier que les conditions existantes permettent l'évolution vers :

```text
APARTMENT
```

sans modifier l'identité de la cellule.

---

# 20. Browser validation

La validation navigateur reste limitée par le stall GPU/WebGL connu.

Si le navigateur fonctionne :

* lancer la scène ;
* observer le noyau initial ;
* lancer la simulation ;
* observer la croissance ;
* vérifier que les nouvelles constructions forment des regroupements ;
* vérifier que les routes structurent progressivement l'espace ;
* vérifier que les appartements apparaissent dans les zones denses.

Si Chromium reproduit le stall :

ne pas transformer ce problème d'infrastructure en refonte applicative.

Documenter simplement :

```text
Browser validation blocked by existing Chromium/WebGL GPU stall.
Domain deterministic validation completed.
```

---

# 21. Tests et validation

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Les tests existants ne doivent pas régresser.

---

# 22. Definition of Done

Step 15 est terminé lorsque :

* [ ] le clustering résidentiel est réellement perceptible ;
* [ ] les routes jouent un rôle de structure spatiale ;
* [ ] des corridors urbains peuvent émerger ;
* [ ] les services favorisent localement le développement ;
* [ ] les appartements apparaissent naturellement dans les zones denses ;
* [ ] les fermes restent spatialement cohérentes ;
* [ ] les constructions ne sont pas dispersées arbitrairement ;
* [ ] aucune nouvelle IA urbaine n'a été créée ;
* [ ] aucun district explicite n'a été ajouté ;
* [ ] aucun nouveau système majeur n'a été introduit ;
* [ ] le déterminisme est conservé ;
* [ ] les règles existantes restent réutilisées ;
* [ ] le renderer reste consommateur de snapshots ;
* [ ] la caméra reste strictement top-down ;
* [ ] les tests de clustering passent ;
* [ ] les tests de corridor passent ;
* [ ] les tests de service passent ;
* [ ] les tests agricoles passent ;
* [ ] les tests de densification passent ;
* [ ] typecheck passe ;
* [ ] lint passe ;
* [ ] tests passent ;
* [ ] build passe.

---

# Principe final

Le but de Step 15 n'est pas :

> « Ajouter les quartiers à NOVA. »

Le but est :

> **Faire en sorte que les quartiers apparaissent avant même que NOVA sache ce qu'est un quartier.**

Le joueur doit progressivement percevoir :

```text
une colonie
     ↓
un noyau
     ↓
des axes
     ↓
des zones plus denses
     ↓
des périphéries
     ↓
des espaces agricoles
     ↓
une véritable forme urbaine
```

La ville doit commencer à avoir une géographie propre, tout en restant entièrement produite par les règles de simulation existantes.
