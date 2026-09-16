# Step 17 — Urban Rules & Player Intent

## Contexte

NOVA possède désormais :

* un monde déterministe ;
* une simulation à ticks fixes ;
* population ;
* logement ;
* nourriture ;
* maisons ;
* appartements ;
* fermes ;
* routes ;
* routes locales et artérielles ;
* zones résidentielles ;
* zones agricoles ;
* développement autonome ;
* pression de développement ;
* influence routière ;
* influence des services ;
* extension routière ;
* densification ;
* scénario initial ;
* inspection des objets urbains.

Le joueur peut observer la ville et comprendre ses éléments.

Mais le concept fondamental de NOVA n'est pas :

> « Le joueur construit chaque bâtiment. »

Le concept est :

> **Le joueur définit les conditions. La simulation décide comment la ville évolue.**

Les systèmes actuels permettent déjà une forme de développement autonome.

Cette étape doit rendre le rôle du joueur plus explicite sans transformer NOVA en city-builder classique.

---

# Objectif

Permettre au joueur de définir quelques **intentions urbaines simples**.

Exemples :

```text
Residential
Agricultural
```

Le joueur ne dit pas :

```text
"Construis une maison ici."
```

Il dit :

```text
"Cette zone doit devenir résidentielle."
```

Puis la simulation décide :

* où construire ;
* quand construire ;
* si une route doit s'étendre ;
* si une maison devient un appartement ;
* comment la densité évolue.

---

# Principe fondamental

Le joueur contrôle :

```text
WHERE / WHAT SHOULD DEVELOP
```

La simulation contrôle :

```text
WHEN / HOW DEVELOPMENT HAPPENS
```

Cette séparation doit rester stricte.

---

# 1. Inspecter les systèmes existants

Avant toute modification :

inspecter :

* `Zone`;
* `CityState`;
* placement ;
* construction ;
* développement ;
* scoring ;
* services ;
* routes ;
* sélection ;
* inspection ;
* UI actuelle.

Déterminer comment les zones sont actuellement créées.

Ne pas créer un deuxième mécanisme de zonage.

---

# 2. Zones comme expression d'intention

Les zones existantes doivent devenir clairement une **intention du joueur**.

Exemple :

```text
RESIDENTIAL
```

signifie :

> Le joueur souhaite que cette partie du territoire accueille principalement du développement résidentiel.

Et :

```text
AGRICULTURAL
```

signifie :

> Le joueur souhaite préserver et développer une activité agricole ici.

Le système de simulation reste responsable du résultat.

---

# 3. Mode de création de zone

Ajouter si nécessaire un mode UI compact :

```text
BUILD
ZONE
  RESIDENTIAL
  AGRICULTURAL
```

Le joueur peut ensuite dessiner ou sélectionner une zone sur la grille.

Ne pas transformer l'interface en toolbar gigantesque.

---

# 4. Création de zone

La création doit passer par :

```text
UI
 ↓
application command
 ↓
domain validation
 ↓
CityState
```

Ne jamais modifier directement `CityState` depuis React.

---

# 5. Dessin de zone

Si l'architecture actuelle le permet, privilégier une interaction simple :

```text
click + drag
```

pour définir un rectangle.

Exemple :

```text
start
  ↓
┌───────────────┐
│               │
│ RESIDENTIAL   │
│               │
└───────────────┘
```

La zone doit être composée de cellules de grille.

---

# 6. Ne pas créer de polygon system

Ne pas créer :

* géométrie polygonale complexe ;
* triangulation ;
* GIS ;
* spatial indexing ;
* formes libres complexes.

Le monde actuel est basé sur une grille.

Utiliser cette grille.

---

# 7. Validation

Une zone doit vérifier les règles existantes.

Exemples :

* dans les limites ;
* cellules compatibles ;
* pas de conflit illégal ;
* taille minimale ;
* type valide.

Ne pas inventer de nouvelles contraintes économiques.

---

# 8. Chevauchement

Définir explicitement le comportement.

Recommandation :

```text
Residential ↔ Agricultural
```

ne doivent pas pouvoir se chevaucher.

Une nouvelle zone incompatible doit être refusée ou remplacer explicitement l'ancienne selon les règles existantes.

Ne jamais laisser deux intentions contradictoires occuper silencieusement les mêmes cellules.

---

# 9. Suppression

Permettre de supprimer une zone sans supprimer :

* maisons ;
* appartements ;
* fermes ;
* routes ;
* services.

C'est une modification d'intention.

La ville existante reste en place.

---

# 10. Modifier une zone existante

Permettre éventuellement :

```text
Residential
     ↓
Agricultural
```

uniquement si la nouvelle zone est valide.

La modification ne doit pas détruire automatiquement les bâtiments existants.

Les constructions déjà présentes persistent.

---

# 11. Simulation

Une zone ne construit rien directement.

Elle fournit simplement un espace éligible au développement existant.

Flux :

```text
PLAYER
  │
  ▼
ZONE
  │
  ▼
DEVELOPMENT SYSTEM
  │
  ├── population
  ├── building pressure
  ├── road influence
  ├── service influence
  └── local clustering
  │
  ▼
CANDIDATE CELL
  │
  ▼
NORMAL CONSTRUCTION
```

Ne pas introduire :

```text
ZoneManager
CityPlanner
UrbanAI
```

---

# 12. Donner un poids à l'intention

Le type de zone doit être une contrainte/éligibilité forte.

Exemple :

```text
RESIDENTIAL
```

favorise :

* house ;
* apartment.

```text
AGRICULTURAL
```

favorise :

* farm.

Ne pas créer immédiatement d'autres catégories.

---

# 13. Ne pas forcer la construction

Une zone résidentielle vide peut rester vide.

Si :

* population insuffisante ;
* aucune pression ;
* logement disponible ;
* contraintes de terrain ;

alors aucun bâtiment n'est créé.

Cela est important.

Le joueur définit les conditions, pas le résultat.

---

# 14. Interaction avec le scoring

Le scoring actuel reste responsable du choix précis.

Par exemple :

```text
RESIDENTIAL ZONE
       ↓
eligible cells
       ↓
urban scoring
       ↓
road influence
       ↓
service influence
       ↓
residential clustering
       ↓
best candidate
```

Ne pas remplacer le système de Step 15.

---

# 15. Visualisation des zones

Les zones doivent être visibles mais discrètes.

Direction :

* teinte très légère ;
* grille ou contour subtil ;
* faible opacité ;
* pas de gros remplissage opaque.

La ville doit rester l'élément principal.

Exemple conceptuel :

```text
┌───────────────────────────┐
│ · · · · · · · · · · · · │
│ ·  HOUSE  HOUSE         · │
│ ·  HOUSE  ROAD          · │
│ ·  COMMUNITY            · │
│ · · · · · · · · · · · · │
└───────────────────────────┘
```

La zone doit être comprise sans devenir une énorme couleur de stratégie.

---

# 16. États visuels

Prévoir au minimum :

```text
inactive
selected
drawing
valid
invalid
```

Pendant le dessin :

```text
valid → subtil
invalid → clairement différent
```

Ne pas utiliser de gros effets lumineux.

---

# 17. Interaction avec l'inspection

Une zone sélectionnée doit pouvoir être inspectée.

Exemple :

```text
RESIDENTIAL ZONE

Cells
42

Developed
18

Population
34

Buildings
9

Status
Developing
```

Attention :

Ne pas afficher des statistiques qui ne peuvent pas être calculées réellement.

Si certaines informations sont faciles à dériver de l'état courant, les utiliser.

Sinon afficher uniquement :

```text
RESIDENTIAL
42 cells
```

---

# 18. Zone et bâtiments existants

La zone ne doit jamais posséder les bâtiments.

Architecture :

```text
World
 ├── Zones
 ├── Buildings
 ├── Roads
 └── Services
```

et non :

```text
Zone
 └── Buildings
```

Les bâtiments restent indépendants.

---

# 19. Zone et route

Une route peut traverser une zone.

Une route ne devient pas une propriété de la zone.

Les systèmes existants continuent de fonctionner.

---

# 20. Zone et service

Un service peut se trouver dans une zone.

Le service continue d'exercer son influence selon les règles existantes.

La zone ne doit pas modifier artificiellement le rayon du service.

---

# 21. Zone et agriculture

Les zones agricoles doivent préserver la logique existante :

```text
farm
farm
farm
```

avec clustering autour des fermes.

Une zone agricole ne doit pas automatiquement créer des fermes.

---

# 22. Persistance

Si le système de sauvegarde existe déjà :

les zones doivent être sérialisables.

Utiliser des IDs déterministes.

Ne pas stocker :

* Three.js UUID ;
* références de renderer ;
* objets React.

---

# 23. Déterminisme

Une même intention :

```text
seed
+
same zones
+
same simulation time
```

doit produire exactement le même résultat.

Les zones doivent avoir des IDs déterministes.

---

# 24. Tests de domaine

Ajouter au minimum :

### Création

```text
valid rectangle
→ zone created
```

### Invalid

```text
outside world
→ rejected
```

### Overlap

```text
incompatible overlap
→ rejected
```

### Removal

```text
remove zone
→ buildings remain
```

### Simulation

```text
same zone
+
same seed
+
same ticks
=
same buildings
```

### Residential

```text
residential zone
→ residential development eligible
```

### Agricultural

```text
agricultural zone
→ farm development eligible
```

---

# 25. Test de comportement

Créer un scénario :

```text
empty residential zone
+
population pressure
```

Faire avancer la simulation.

Vérifier :

```text
zone
 ↓
development system
 ↓
house
```

et non :

```text
zone
 ↓
direct spawn
```

---

# 26. Test de modification d'intention

Scénario :

```text
residential zone
+
existing house
```

Modifier la zone.

Vérifier :

* house conservée ;
* zone modifiée ;
* simulation cohérente.

---

# 27. Test de déterminisme

Exécuter deux simulations :

```text
simulation A
simulation B
```

avec :

* même seed ;
* même monde ;
* mêmes zones ;
* mêmes ticks.

Comparer :

* zones ;
* bâtiments ;
* routes ;
* population ;
* nourriture.

Les états doivent être identiques.

---

# 28. UI

L'interface doit rester minimaliste.

Direction :

```text
BUILD

ZONE
[ Residential ]
[ Agricultural ]
```

Puis interaction directement dans la scène.

Éviter une barre d'outils complexe.

---

# 29. Raccourcis

Si cohérent avec les contrôles existants :

```text
Z → zone mode
R → residential
A → agricultural
Escape → cancel
```

Mais ne pas ajouter de raccourcis si cela crée des conflits.

Les contrôles doivent rester accessibles sans clavier.

---

# 30. Construction classique

Ne pas casser :

```text
HOUSE
FARM
ROAD
SERVICE
```

Le joueur doit toujours pouvoir utiliser les outils de construction existants.

La nouvelle logique de zone est une intention supplémentaire, pas un remplacement immédiat du système manuel.

---

# 31. Construction manuelle vs intention

Les deux modes doivent coexister :

```text
MANUAL
   ↓
Place exact building

AUTONOMOUS
   ↓
Zone + simulation
   ↓
Building chosen automatically
```

C'est important pour préserver les fonctionnalités déjà construites.

---

# 32. Pas de zoning automatique

Le système ne doit pas automatiquement créer :

* zones résidentielles ;
* zones agricoles.

Le joueur définit les intentions.

---

# 33. Pas de district

Toujours interdit :

* districts ;
* neighborhoods ;
* city center;
* suburbs ;
* industrial districts.

Ces formes doivent continuer à émerger de la géométrie.

---

# 34. Validation runtime

Si le navigateur fonctionne :

1. lancer NOVA ;
2. créer une zone résidentielle ;
3. créer une zone agricole ;
4. lancer la simulation ;
5. observer le développement ;
6. sélectionner la zone ;
7. inspecter la zone ;
8. modifier/supprimer une zone ;
9. vérifier que les bâtiments existants persistent ;
10. vérifier que le développement reprend correctement.

Si le stall GPU/WebGL apparaît :

documenter le problème d'infrastructure comme précédemment.

---

# 35. Performance

Ne pas optimiser prématurément.

Le monde reste relativement petit.

Ne pas ajouter :

* spatial index ;
* ECS ;
* Worker ;
* GPU compute.

Ces optimisations seront justifiées uniquement par un profilage réel.

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

---

# Definition of Done

Step 17 est terminé lorsque :

* [ ] le joueur peut créer une zone résidentielle ;
* [ ] le joueur peut créer une zone agricole ;
* [ ] les zones utilisent la grille existante ;
* [ ] la validation reste dans le domaine ;
* [ ] les zones ne créent pas directement de bâtiments ;
* [ ] le développement autonome réutilise le scoring existant ;
* [ ] les routes continuent d'influencer le développement ;
* [ ] les services continuent d'influencer le développement ;
* [ ] la densification continue de fonctionner ;
* [ ] les bâtiments existants survivent à la modification/suppression d'une zone ;
* [ ] les zones sont inspectables ;
* [ ] les zones sont discrètement visibles ;
* [ ] aucune nouvelle IA urbaine n'est créée ;
* [ ] aucun district n'est créé ;
* [ ] aucun nouveau système économique n'est créé ;
* [ ] la simulation reste déterministe ;
* [ ] la construction manuelle fonctionne toujours ;
* [ ] la caméra reste top-down ;
* [ ] les tests de zone passent ;
* [ ] les tests de simulation passent ;
* [ ] typecheck passe ;
* [ ] lint passe ;
* [ ] build passe.

---

# Principe final

NOVA doit maintenant commencer à réaliser sa promesse fondamentale :

```text
Le joueur ne dessine pas la ville.
Le joueur dessine les règles.
```

Le joueur trace :

```text
"ici, je veux du résidentiel"
```

La simulation décide :

```text
où construire
quand construire
comment se connecter
quand densifier
où apparaissent les appartements
```

Le résultat ne doit jamais être parfaitement prévisible.

Il doit être **contraint par l'intention du joueur, mais produit par la simulation**.
