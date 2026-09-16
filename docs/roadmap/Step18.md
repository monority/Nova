# Step 18 — Urban Feedback Loop & Simulation Timeline

## Contexte

NOVA dispose maintenant d'une boucle complète :

```text
PLAYER INTENT
     ↓
ZONES
     ↓
SIMULATION
     ↓
DEVELOPMENT
     ↓
BUILDINGS
     ↓
ROADS
     ↓
DENSIFICATION
     ↓
PLAYER OBSERVES
```

Le joueur peut maintenant :

* construire manuellement ;
* créer des zones ;
* laisser la simulation développer la ville ;
* sélectionner les éléments ;
* inspecter les bâtiments ;
* inspecter les routes ;
* inspecter les services ;
* inspecter les zones.

La simulation évolue réellement.

Le problème suivant est le **feedback temporel**.

Le joueur doit pouvoir comprendre :

> « Qu'est-ce qui vient de changer ? »

et :

> « Qu'est-ce que la simulation est en train de faire ? »

sans transformer NOVA en jeu de stratégie avec notifications permanentes.

---

# Objectif

Créer une représentation temporelle légère de l'évolution de la ville.

Le joueur doit pouvoir observer :

```text
Population ↑
     ↓
nouvelle maison
     ↓
nouvelle route
     ↓
logement saturé
     ↓
appartement
```

sans avoir besoin de regarder continuellement les compteurs.

---

# Principe

Les événements importants doivent être **observables**, mais pas nécessairement racontés par un système complexe.

Exemples :

```text
NEW HOUSE
NEW FARM
NEW ROAD
BUILDING DENSIFIED
POPULATION GROWING
```

L'objectif est de rendre la simulation lisible.

---

# 1. Inspecter l'architecture

Avant toute modification :

inspecter :

* simulation runtime ;
* `SimulationState` ;
* clock ;
* commands ;
* development system ;
* construction ;
* road extension ;
* densification ;
* UI actuelle ;
* inspection ;
* sélection ;
* éventuelle gestion existante d'événements.

Ne pas créer un système parallèle si un mécanisme existant peut être utilisé.

---

# 2. Ne pas créer un EventManager global

Interdit de créer immédiatement :

```text
EventManager
GameEventBus
NarrativeEngine
NotificationManager
CityStoryManager
```

La première version doit rester minimale.

---

# 3. Définir une projection d'événement

Créer si nécessaire une projection applicative/UI :

```text
src/application/queries/
```

ou un emplacement équivalent.

Exemple conceptuel :

```ts
type SimulationEvent =
  | {
      type: 'building-created';
      buildingId: string;
      buildingType: BuildingType;
    }
  | {
      type: 'road-created';
      roadId: string;
      roadClass: RoadClass;
    }
  | {
      type: 'building-evolved';
      buildingId: string;
      from: BuildingType;
      to: BuildingType;
    };
```

Adapter aux types réellement présents.

---

# 4. Événements dérivés de l'état

Privilégier les événements dérivés des changements d'état existants.

Exemple :

```text
previous state
      ↓
current state
      ↓
diff
      ↓
observable events
```

Cela évite de faire dépendre la simulation d'un système UI.

---

# 5. Ne pas faire dépendre le domaine de React

Architecture :

```text
Simulation
    ↓
State change
    ↓
Application projection
    ↓
UI feedback
```

Jamais :

```text
Domain
 ↓
React notification
```

---

# 6. Événements minimum

Commencer uniquement avec :

```text
BUILDING_CREATED
ROAD_CREATED
BUILDING_EVOLVED
```

Ne pas ajouter immédiatement :

* population milestones ;
* food milestones ;
* zone events ;
* service events ;
* economic events.

Ajouter uniquement ce qui est réellement utile.

---

# 7. Construction manuelle

Une construction manuelle peut générer un événement observable.

Exemple :

```text
NEW HOUSE
```

Mais le feedback doit rester identique pour :

* construction manuelle ;
* construction autonome.

Le joueur doit comprendre que les deux utilisent le même système de construction.

---

# 8. Construction autonome

Une construction autonome doit produire exactement le même type d'événement.

Exemple :

```text
NEW HOUSE
```

Pas :

```text
AI CREATED HOUSE
```

Le système interne ne doit pas être exposé.

---

# 9. Road extension

Lorsqu'une extension routière réelle se produit :

```text
NEW ROAD
```

Ne pas afficher chaque segment individuellement si plusieurs segments sont créés pendant une même extension.

Préférer un événement regroupé :

```text
ROAD EXTENDED
3 segments
```

uniquement si cette information est facilement disponible.

---

# 10. Densification

Lorsqu'une maison devient un appartement :

```text
BUILDING EVOLVED

HOUSE → APARTMENT
```

C'est probablement l'événement le plus important du système.

Il doit être clairement visible mais discret.

---

# 11. Notifications temporaires

Si une notification UI est nécessaire :

* durée courte ;
* position fixe ;
* pas de modal ;
* pas de son obligatoire ;
* pas d'animation excessive.

Exemple :

```text
┌──────────────────────┐
│ BUILDING EVOLVED     │
│ HOUSE → APARTMENT    │
└──────────────────────┘
```

Après quelques secondes :

disparition.

---

# 12. Pas de spam

Si la simulation construit 5 bâtiments rapidement :

ne pas afficher :

```text
NEW HOUSE
NEW HOUSE
NEW HOUSE
NEW HOUSE
NEW HOUSE
```

Créer un mécanisme minimal de regroupement.

Exemple :

```text
3 new buildings
```

ou :

```text
NEW DEVELOPMENT
3 buildings
```

Seulement si nécessaire.

---

# 13. Priorité des événements

Si plusieurs événements surviennent simultanément :

```text
building evolved
road created
building created
```

la priorité peut être :

```text
EVOLUTION
ROAD NETWORK
NEW BUILDING
```

mais ne pas transformer cela en système de score complexe.

---

# 14. Historique court

Conserver éventuellement les derniers événements :

```text
NEW HOUSE
NEW ROAD
HOUSE → APARTMENT
NEW FARM
```

Maximum quelques éléments.

Pas de journal de jeu complet.

---

# 15. Timeline

Ajouter une représentation temporelle très légère.

Exemple :

```text
▶  1×       03:42
────────────────────
```

ou :

```text
00:00 ───────●────── 03:42
```

Le joueur doit comprendre :

* temps courant ;
* simulation en pause ou active ;
* vitesse.

---

# 16. Contrôles temporels

Les contrôles existants doivent être regroupés clairement :

```text
▶
1×
2×
5×
20×
100×
STEP
RESET
```

Ne pas créer un système parallèle.

---

# 17. Pause

Lorsqu'on met la simulation en pause :

```text
PAUSED
```

doit être perceptible.

Pas besoin d'un grand écran.

---

# 18. Step

Le bouton STEP doit rester disponible.

Un STEP :

```text
advance exactly one simulation tick
```

doit éventuellement déclencher les événements correspondants.

Pas d'événement artificiel.

---

# 19. Reset

RESET doit :

* recréer le scénario initial ;
* réinitialiser le temps ;
* réinitialiser les événements UI ;
* réinitialiser la sélection ;
* réinitialiser l'inspection.

---

# 20. Métriques

Conserver les métriques actuelles :

```text
Population
Housing
Food
```

Ne pas ajouter 20 indicateurs.

Éventuellement :

```text
Buildings
Roads
```

uniquement si la place UI le permet sans surcharge.

---

# 21. Relation entre événements et inspection

Lorsqu'un événement se produit :

```text
NEW HOUSE
```

ne pas automatiquement sélectionner la maison.

Le joueur doit garder le contrôle.

Optionnellement, un clic sur la notification peut sélectionner l'objet.

Si cette interaction est facile à intégrer, elle est bienvenue.

Sinon ne pas la créer.

---

# 22. Relation avec les zones

Lorsqu'un bâtiment apparaît dans une zone :

ne pas créer automatiquement :

```text
ZONE DEVELOPED
```

tant que cela n'apporte pas une information utile.

Les zones restent des intentions.

---

# 23. Relation avec les services

Ne pas créer :

```text
SERVICE ATTRACTED BUILDING
```

car le système actuel ne possède pas nécessairement cette causalité explicite.

Afficher uniquement les changements réellement observables.

---

# 24. Causalité

Attention à ne pas prétendre :

```text
Road caused this house
```

si le système ne stocke pas cette causalité.

Il est acceptable d'afficher :

```text
NEW HOUSE
```

mais pas :

```text
HOUSE BUILT BECAUSE OF ROAD
```

sauf si la causalité est réellement déterminable.

---

# 25. Architecture de détection

Une approche simple est préférable :

```text
previousSnapshot
       ↓
currentSnapshot
       ↓
detectChanges()
       ↓
SimulationEvent[]
       ↓
UI
```

Le système doit rester :

* pur ;
* déterministe ;
* testable ;
* indépendant de React.

---

# 26. Détection des bâtiments

Comparer les IDs.

```text
previous IDs
current IDs
```

Nouveaux IDs :

```text
BUILDING_CREATED
```

IDs persistants dont le type change :

```text
BUILDING_EVOLVED
```

Attention à l'évolution :

```text
house
 ↓
apartment
```

Le même ID doit produire une évolution, pas :

```text
delete house
create apartment
```

---

# 27. Détection des routes

Comparer les IDs.

Nouveaux IDs :

```text
ROAD_CREATED
```

Si une classification change :

```text
local
 ↓
arterial
```

ne pas forcément générer une notification.

Cette évolution structurelle est secondaire.

---

# 28. Détection déterministe

Les événements doivent être produits dans un ordre déterministe.

Exemple :

```text
building evolution
building creation
road creation
```

avec tie-break stable par ID.

Ne jamais dépendre de l'ordre accidentel d'un `Set` ou d'un parcours non contrôlé.

---

# 29. Tests

Ajouter des tests pour :

### New building

```text
previous state
+
new building
=
BUILDING_CREATED
```

### Evolution

```text
house
→
apartment
=
BUILDING_EVOLVED
```

### Road

```text
new road
=
ROAD_CREATED
```

### No changes

```text
same state
=
[]
```

### Determinism

Même diff :

```text
same events
same order
```

---

# 30. Tests UI

Si le projet possède des tests UI adaptés :

vérifier :

* notification apparaît ;
* notification disparaît ;
* pause reste visible ;
* timeline reflète le temps ;
* reset efface les événements.

Ne pas ajouter une infrastructure de tests lourde pour cela.

---

# 31. Browser validation

Si Chromium/WebGL fonctionne :

1. démarrer NOVA ;
2. lancer la simulation ;
3. attendre une évolution ;
4. observer la notification ;
5. vérifier que l'événement correspond réellement au changement ;
6. sélectionner l'objet si nécessaire ;
7. continuer la simulation ;
8. vérifier que les notifications ne deviennent pas envahissantes.

Si le stall GPU/WebGL apparaît :

documenter le problème d'environnement.

---

# 32. Design visuel

La timeline et les notifications doivent respecter la direction NOVA :

* sombre ;
* minimal ;
* typographie nette ;
* faible contraste décoratif ;
* pas de glow excessif ;
* pas de panneaux massifs ;
* pas de cyberpunk HUD.

L'information doit sembler appartenir à un **outil d'observation architectural**, pas à un jeu mobile.

---

# 33. Performance

La détection d'événements ne doit pas nécessiter de reconstruire toute l'interface à chaque tick.

Limiter les recalculs aux changements de simulation.

Ne pas faire :

```text
React render
 ↓
scan complet du monde
```

à chaque frame.

---

# 34. Pas de persistance historique

Ne pas sauvegarder les événements dans le monde.

Les événements sont du feedback UI.

Après reset :

```text
events = []
```

Après rechargement :

pas besoin de restaurer les anciennes notifications.

---

# 35. Pas de replay

Ne pas créer de replay system.

Pas de :

```text
event sourcing
```

Pas de :

```text
simulation journal
```

Pas de :

```text
timeline scrubbing
```

Le timeline UI indique simplement le temps courant.

---

# 36. Validation finale

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Puis effectuer une observation réelle de la simulation si l'environnement navigateur le permet.

---

# Definition of Done

Step 18 est terminé lorsque :

* [ ] les changements importants sont perceptibles ;
* [ ] nouvelle construction détectée ;
* [ ] extension routière détectée ;
* [ ] densification détectée ;
* [ ] événements déterministes ;
* [ ] événements dérivés de changements réels ;
* [ ] aucun événement fictif ;
* [ ] aucune causalité inventée ;
* [ ] notifications discrètes ;
* [ ] pas de spam ;
* [ ] historique UI limité ;
* [ ] temps courant visible ;
* [ ] pause visible ;
* [ ] vitesse visible ;
* [ ] STEP fonctionne ;
* [ ] RESET réinitialise correctement l'UI ;
* [ ] inspection continue de fonctionner ;
* [ ] sélection continue de fonctionner ;
* [ ] zones continuent de fonctionner ;
* [ ] construction manuelle continue de fonctionner ;
* [ ] simulation inchangée ;
* [ ] déterminisme préservé ;
* [ ] aucune nouvelle mécanique de simulation majeure ;
* [ ] tests passent ;
* [ ] typecheck passe ;
* [ ] lint passe ;
* [ ] build passe.

---

# Principe final

NOVA doit donner au joueur la sensation :

```text
Je donne une intention.
        ↓
J'observe.
        ↓
La ville évolue.
        ↓
Quelque chose change.
        ↓
Je le remarque.
        ↓
Je comprends.
        ↓
Je modifie éventuellement mon intention.
        ↓
La ville évolue autrement.
```

La boucle fondamentale devient :

```text
INTENTION
   ↓
SIMULATION
   ↓
OBSERVATION
   ↓
COMPRÉHENSION
   ↓
NOUVELLE INTENTION
```

C'est cette boucle qui doit devenir le cœur de l'expérience NOVA.
