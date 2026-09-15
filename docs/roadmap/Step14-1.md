# Step 14.1 — Runtime Showcase & Experiential Validation

## Contexte

NOVA possède maintenant plusieurs systèmes fonctionnels :

* scénario initial déterministe ;
* population agrégée ;
* maisons et appartements ;
* fermes et nourriture ;
* zones résidentielles et agricoles ;
* développement autonome ;
* pression de développement ;
* influence des routes ;
* extension routière autonome ;
* hiérarchie `local` / `arterial` ;
* services communautaires ;
* sélection par cellule ;
* simulation déterministe ;
* caméra orthographique strictement top-down.

Le Step 14 a ajouté un scénario initial déterministe :

* 6 maisons ;
* 2 fermes ;
* 5 routes ;
* 1 service communautaire ;
* 1 zone résidentielle ;
* 1 zone agricole ;
* population initiale ;
* stock de nourriture initial.

Le problème historique de NOVA est cependant différent :

> L'architecture et les fichiers peuvent évoluer correctement sans que l'application donne réellement l'impression d'évoluer.

Ce milestone ne doit donc **pas introduire une nouvelle mécanique de simulation majeure**.

Son objectif est de vérifier et, uniquement si nécessaire, calibrer l'expérience réelle.

---

# Objectif

Quand l'utilisateur ouvre NOVA, il doit pouvoir comprendre immédiatement :

1. qu'une petite colonie existe déjà ;
2. qu'elle possède une population ;
3. qu'elle possède des logements, des fermes et des routes ;
4. que la simulation peut être lancée ;
5. que la ville évolue sans intervention constante ;
6. que cette évolution provient réellement des systèmes existants.

Après quelques minutes, la scène doit être visiblement différente.

Le résultat recherché est :

```text
T=0
petite colonie
    ↓
population
    ↓
pression résidentielle
    ↓
nouveau bâtiment
    ↓
route locale
    ↓
augmentation de capacité
    ↓
nouvelle croissance
    ↓
densification
    ↓
appartement
```

Le joueur doit pouvoir observer cette chaîne sans devoir consulter le code.

---

# Règle principale

## NE PAS ajouter de nouveau système majeur

Interdiction de profiter de ce milestone pour ajouter :

* industrie ;
* commerce ;
* emplois ;
* bonheur ;
* citoyens individuels ;
* trafic ;
* piétons ;
* transports publics ;
* technologie ;
* nouveaux types de ressources ;
* météo ;
* saisons ;
* nouveaux systèmes d'IA ;
* système de districts complet ;
* nouveau système économique ;
* nouveau système de pathfinding ;
* ECS ;
* Workers ;
* refonte massive du renderer.

Le travail porte sur **l'expérience observable des systèmes existants**.

---

# Phase 1 — Inspecter réellement l'application

Avant toute modification importante du code :

1. lancer l'application en développement ou production ;
2. ouvrir l'application dans un navigateur ;
3. observer la scène initiale ;
4. vérifier le cadrage caméra ;
5. vérifier la densité visuelle ;
6. démarrer la simulation ;
7. observer au minimum :

```text
0 s
30 s
60 s
120 s
180 s
300 s
```

Si l'automatisation navigateur fonctionne, l'utiliser.

Si elle ne fonctionne pas à cause d'un problème Chromium/WebGL :

* ne pas masquer le problème ;
* noter précisément l'erreur ;
* poursuivre la validation avec les tests déterministes ;
* effectuer autant que possible une observation manuelle.

Ne jamais déclarer l'expérience validée uniquement parce que TypeScript, les tests et le build passent.

---

# Phase 2 — Établir un état initial lisible

Le scénario initial doit produire une scène immédiatement compréhensible.

À T=0, vérifier :

* 6 maisons réellement visibles ;
* 2 fermes réellement visibles ;
* 5 routes réellement visibles ;
* 1 service réellement visible ;
* zone résidentielle identifiable mais discrète ;
* zone agricole identifiable mais discrète ;
* population affichée ;
* nourriture affichée ;
* simulation initialement cohérente ;
* aucun objet caché hors caméra ;
* aucun bâtiment superposé de manière accidentelle ;
* routes correctement connectées ;
* service placé dans une position pertinente.

Le scénario ne doit pas sembler être une collection arbitraire d'objets.

Il doit donner l'impression d'une **petite colonie existante**.

---

# Phase 3 — Vérifier le cadrage caméra

La caméra doit rester :

```text
Orthographic
Top-down
```

Ne pas revenir à une caméra isométrique ou oblique.

Vérifier :

* tous les éléments initiaux sont visibles ;
* la colonie occupe suffisamment l'écran ;
* les bâtiments ne sont pas minuscules ;
* les routes sont lisibles ;
* le monde ne donne pas l'impression d'être infiniment vide ;
* le joueur peut distinguer les différentes structures sans zoom excessif.

Si nécessaire, modifier uniquement :

* zoom initial ;
* position initiale ;
* taille visuelle des éléments ;
* échelle de présentation.

Ne pas modifier le modèle spatial du domaine.

---

# Phase 4 — Vérifier la lisibilité architecturale

Les quatre catégories principales doivent être immédiatement distinguables :

```text
HOUSE
FARM
APARTMENT
COMMUNITY
```

La distinction doit venir principalement de :

* silhouette ;
* footprint ;
* proportions ;
* hauteur ;
* toiture ;
* géométrie.

Éviter :

* couleurs criardes ;
* gros labels permanents ;
* glow excessif ;
* particules ;
* effets futuristes ;
* textures réalistes.

La scène doit rester :

* sombre ;
* architecturale ;
* géométrique ;
* calme ;
* lisible.

---

# Phase 5 — Vérifier les routes

Les routes doivent être visibles sans devenir l'élément dominant.

Vérifier :

```text
local
arterial
```

La différence doit être perceptible à zoom normal.

Utiliser principalement :

* largeur ;
* géométrie ;
* continuité ;
* éventuellement une différence très légère de matériau.

Ne pas transformer les routes en autoroutes lumineuses.

Vérifier également que les extensions routières autonomes sont réellement visibles lorsqu'un nouveau bâtiment apparaît.

---

# Phase 6 — Vérifier le démarrage de la simulation

Au lancement :

* état clairement `paused` ou `running` ;
* bouton/action de démarrage compréhensible ;
* vitesse visible ;
* temps simulé visible ;
* STEP disponible ;
* RESET disponible.

L'interface doit rester compacte.

Exemple de niveau de densité souhaité :

```text
▶ 1×    00:42
Population 28
Housing 24/24
Food  +2
Buildings 9
Roads 5
```

Ne pas construire un HUD de jeu traditionnel.

---

# Phase 7 — Vérifier l'évolution réelle

Lancer la simulation.

Observer précisément les changements.

Créer si possible une petite table de diagnostic dans les tests/outils ou dans les logs de développement :

| Temps | Population | Houses | Apartments | Farms | Roads | Services |
| ----- | ---------: | -----: | ---------: | ----: | ----: | -------: |
| 0s    |        ... |    ... |        ... |   ... |   ... |      ... |
| 30s   |        ... |    ... |        ... |   ... |   ... |      ... |
| 60s   |        ... |    ... |        ... |   ... |   ... |      ... |
| 120s  |        ... |    ... |        ... |   ... |   ... |      ... |
| 180s  |        ... |    ... |        ... |   ... |   ... |      ... |
| 300s  |        ... |    ... |        ... |   ... |   ... |      ... |

Cette instrumentation peut rester dans les tests/outils de développement.

Ne pas afficher ces informations internes dans l'UI finale.

---

# Phase 8 — Vérifier le développement autonome

Le scénario doit permettre au système existant de réellement construire.

Vérifier :

```text
zone résidentielle
        ↓
candidate cells
        ↓
development pressure
        ↓
eligible cell
        ↓
placeBuilding
        ↓
new house
```

Si rien ne se produit pendant plusieurs minutes, ne pas écrire un nouvel algorithme.

Diagnostiquer :

* population trop faible ;
* capacité de logement trop élevée ;
* intervalle autonome trop long ;
* zone trop petite ;
* cellules candidates invalides ;
* pression trop faible ;
* nourriture bloquante ;
* terrain bloquant ;
* bâtiment existant trop dense ;
* service ou route mal placé.

Corriger **la plus petite cause possible**.

---

# Phase 9 — Vérifier l'extension routière

Lorsqu'un nouveau bâtiment autonome apparaît :

```text
new building
      ↓
not adjacent to road
      ↓
existing road network
      ↓
local Manhattan extension
```

Vérifier que l'extension est réellement visible.

Ne pas ajouter d'animation artificielle.

Ne pas ajouter :

```ts
setTimeout(...)
```

ou :

```ts
if (elapsed > ...)
```

pour simuler visuellement une route.

La route doit provenir du système Step 10.

---

# Phase 10 — Vérifier l'évolution House → Apartment

Le système Step 12 doit pouvoir produire naturellement :

```text
HOUSE
  ↓
housing saturation
  ↓
APARTMENT
```

Vérifier :

* même cellule ;
* même identité ;
* capacité augmentée ;
* rendu modifié ;
* population compatible ;
* aucune création artificielle d'appartement.

Si l'évolution n'arrive jamais :

1. déterminer pourquoi ;
2. vérifier la saturation ;
3. vérifier la population ;
4. vérifier les conditions existantes ;
5. ajuster uniquement les seuils nécessaires.

Ne pas créer un nouveau système d'évolution.

---

# Phase 11 — Vérifier l'influence du service

Le service communautaire doit être placé de manière pertinente.

Vérifier que :

```text
community service
       ↓
coverage
       ↓
residential development influence
       ↓
candidate scoring
```

est réellement observable à travers la morphologie de la colonie.

Ne pas afficher en permanence un cercle de rayon autour du service.

L'influence doit être un comportement de simulation, pas un effet graphique.

---

# Phase 12 — Calibrage de la vitesse

Objectif d'expérience :

```text
observer
   ↓
comprendre
   ↓
voir un changement
   ↓
observer à nouveau
```

Pas :

```text
lancer
   ↓
ville explose immédiatement
```

Ni :

```text
lancer
   ↓
attendre cinq minutes
   ↓
aucun changement
```

Cible indicative :

### 0–30 secondes

La colonie est immédiatement lisible.

### 30–90 secondes

Les premiers changements deviennent visibles.

### 1–3 minutes

La morphologie commence clairement à évoluer.

### 3–5 minutes

Une densification ou extension structurelle doit être perceptible.

Ces valeurs sont des objectifs UX, pas des timers artificiels.

---

# Phase 13 — Déterminisme

Tous les changements doivent continuer à dépendre du temps simulé.

Vérifier :

```text
seed A
+ même état initial
+ même temps simulé
= même état final
```

Indépendamment de la partition des frames :

```text
60 × 1 tick
```

doit produire le même résultat que :

```text
6 × 10 ticks
```

Ne pas introduire de logique dépendant directement du nombre de frames.

---

# Phase 14 — Tests

Ajouter uniquement les tests nécessaires.

Minimum :

## Scenario

* scénario initial valide ;
* contenu attendu ;
* seed identique → même état ;
* IDs déterministes ;
* placement via les règles normales.

## Simulation

* population évolue ;
* développement autonome possible ;
* construction autonome déterministe ;
* extension routière déterministe ;
* évolution house → apartment possible ;
* influence du service active.

## Regression

Tous les tests existants doivent continuer à passer.

---

# Phase 15 — Browser validation

Si Playwright/browser fonctionne :

1. lancer l'application ;
2. capturer l'état initial ;
3. démarrer la simulation ;
4. attendre suffisamment de temps simulé ;
5. inspecter le résultat ;
6. vérifier que la scène contient réellement davantage d'activité ;
7. vérifier qu'aucune régression visuelle majeure n'est apparue.

Le test doit vérifier le comportement observable, pas seulement la présence de fichiers ou de composants.

Si WebGL/Chromium bloque :

```text
INFRASTRUCTURE ISSUE
```

doit être clairement séparé d'un :

```text
APPLICATION FAILURE
```

---

# Phase 16 — Instrumentation de diagnostic temporaire

Si nécessaire, ajouter temporairement une instrumentation de développement permettant de voir :

```text
tick
population
housing capacity
food
building count
road count
service count
last autonomous event
```

Cette instrumentation doit être :

* dev-only ;
* facilement supprimable ;
* séparée du domaine ;
* non nécessaire au fonctionnement.

Ne pas transformer cette instrumentation en système permanent de debug UI.

---

# Phase 17 — Ce qu'il faut modifier si l'expérience est trop pauvre

Modifier dans cet ordre :

1. scénario initial ;
2. placement initial ;
3. caméra initiale ;
4. zoom ;
5. échelle visuelle ;
6. seuils existants ;
7. cadence autonome existante ;
8. population initiale ;
9. capacité initiale ;
10. uniquement ensuite, si nécessaire, logique existante.

Ne pas commencer par créer une nouvelle abstraction.

---

# Phase 18 — Ce qu'il ne faut surtout pas faire

Ne pas résoudre le problème visuel avec :

* plus de glow ;
* plus de particules ;
* animations décoratives ;
* bâtiments géants ;
* couleurs criardes ;
* HUD massif ;
* panneaux partout ;
* faux événements ;
* timers visuels ;
* scripts de spawn ;
* villes préconstruites artificiellement ;
* nouveaux systèmes de simulation sans besoin démontré.

NOVA doit être intéressante parce que **la simulation produit une ville**, pas parce que le renderer cache l'absence d'évolution.

---

# Validation finale

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Puis effectuer une vraie observation runtime.

Documenter brièvement :

```text
Initial state
-------------
Buildings:
Roads:
Population:
Food:
Services:

30s
---
Changes:

60s
---
Changes:

120s
----
Changes:

180s
----
Changes:

300s
----
Changes:
```

---

# Definition of Done

Step 14.1 est terminé uniquement si :

* [ ] l'application démarre avec une colonie lisible ;
* [ ] les 6 maisons sont visibles ;
* [ ] les 2 fermes sont visibles ;
* [ ] les routes sont lisibles ;
* [ ] le service communautaire est pertinent ;
* [ ] les zones sont perceptibles sans dominer la scène ;
* [ ] la caméra reste strictement top-down ;
* [ ] les bâtiments ont des silhouettes distinctes ;
* [ ] local / arterial est visuellement identifiable ;
* [ ] la simulation peut être lancée immédiatement ;
* [ ] la population évolue réellement ;
* [ ] de nouveaux bâtiments peuvent apparaître ;
* [ ] les routes peuvent réellement s'étendre ;
* [ ] une maison peut réellement devenir un appartement ;
* [ ] le service influence réellement le développement ;
* [ ] les changements ne sont pas scriptés artificiellement ;
* [ ] la simulation reste déterministe ;
* [ ] la sélection fonctionne toujours ;
* [ ] l'UI reste compacte ;
* [ ] aucun nouveau système majeur inutile n'a été ajouté ;
* [ ] les tests passent ;
* [ ] le build passe ;
* [ ] l'application a été réellement observée en runtime.

---

# Principe final

Ce milestone ne doit pas rendre NOVA techniquement plus complexe.

Il doit rendre **les systèmes déjà construits perceptibles**.

Le résultat recherché est que l'utilisateur puisse simplement lancer NOVA, regarder la colonie et constater :

> « Je n'ai presque rien fait, et pourtant la ville est en train de devenir différente. »
