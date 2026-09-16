# Résumé de conversation — NOVA

## Intention initiale

Le projet NOVA doit évoluer vers une direction artistique :

- top view stricte, vue réellement du dessus ;
- aucune projection isométrique ;
- monde moderne et dystopique ;
- esthétique minimaliste, sombre et architecturale ;
- interface lisible, sans surcharge de type HUD cyberpunk.

## Problème visuel identifié

Lorsqu’une maison est placée, le terrain semblait se décaler et reprendre une apparence isométrique.

Les ajustements réalisés autour de ce problème ont notamment porté sur :

- caméra orthographique strictement verticale ;
- repère caméra stabilisé pour conserver une vue top-down ;
- conversion écran → grille cohérente avec la projection ;
- placement et sélection basés sur les coordonnées de grille plutôt que sur les identifiants de meshes Three.js ;
- rendu du terrain, des bâtiments et des routes aligné sur le même système de coordonnées.

## Fonctionnalités développées

Le projet dispose maintenant d’une boucle de simulation urbaine complète :

```text
intention joueur
      ↓
zones
      ↓
simulation
      ↓
développement autonome
      ↓
bâtiments et routes
      ↓
densification
      ↓
observation du joueur
```

Fonctionnalités principales :

- construction manuelle de maisons et de fermes ;
- construction et suppression de routes ;
- services communautaires ;
- zones résidentielles et agricoles ;
- développement autonome déterministe ;
- extension automatique des routes ;
- classification des routes locales et artérielles ;
- densification des maisons en appartements ;
- population, capacité de logement et économie alimentaire ;
- scénario initial de ville ;
- sélection des bâtiments, routes, services et zones ;
- panneau d’inspection contextuel ;
- contrôles pause, reprise, vitesse, step et reset.

## Roadmap traitée

Les documents roadmap ont été suivis progressivement jusqu’à `Step18.md`, notamment :

- fondations de simulation et horloge déterministe ;
- population et économie ;
- construction et morphologie urbaine ;
- routes et extension du réseau ;
- zones et services ;
- inspection et sélection ;
- feedback temporel et événements de simulation.

## Step18 — Feedback temporel

La dernière étape ajoute une projection applicative indépendante de React qui compare deux états de simulation.

Événements détectés :

- `BUILDING_CREATED` ;
- `ROAD_CREATED` ;
- `BUILDING_EVOLVED`.

Le feedback UI comprend :

- un historique court des changements récents ;
- un regroupement des événements pour éviter le spam ;
- l’affichage de l’état `PAUSED` ou `RUNNING` ;
- l’affichage du temps simulé et du tick courant ;
- les vitesses directes `1×`, `2×`, `5×`, `20×` et `100×`.

Les événements ne sont pas persistés dans le monde et ne modifient pas la simulation.

## État des validations

Validations réussies :

- typecheck TypeScript ;
- lint ESLint ;
- tests unitaires — 62 tests ;
- build de production Vite.

La validation E2E Chromium reste limitée par un stall GPU/WebGL déjà observé dans l’environnement. Les scénarios Playwright expirent pendant le démarrage ou les interactions navigateur ; ce problème est environnemental et ne correspond pas à une erreur TypeScript, lint, test unitaire ou build.

## Fichiers importants

- `src/app/composition/App.tsx` — composition de l’application et contrôles UI ;
- `src/app/composition/app.css` — direction visuelle ;
- `src/application/queries/simulation-events.ts` — projection des événements ;
- `src/application/queries/to-inspection.ts` — projection d’inspection ;
- `src/engine/simulation/SimulationRuntime.ts` — runtime et horloge ;
- `src/domain/simulation/simulation-state.ts` — état et progression de simulation ;
- `src/rendering/camera/OrthographicCameraController.ts` — caméra top-down ;
- `docs/roadmap/Step18.md` — spécification du feedback temporel.
