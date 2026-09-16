# NOVA — Résumé Steps 16 à 20

Date : 2026-09-16

---

## Vue d'ensemble

Steps 16 à 20 couvrent la transformation de NOVA d'une collection d'entités simulées vers un produit jouable et compréhensible. L'arc complet va de **l'inspection** à la **validation E2E**, en passant par l'**intention joueur**, le **feedback temporel**, et les **règles de contrat produit**.

```text
Step 16 — Inspection & Causalité
Step 17 — Règles urbaines & Intention joueur
Step 18 — Boucle de feedback & Timeline
Step 19 — État urbain & Lecture causale
Step 20 — Contrat produit MVP
```

---

## Step 16 — Urban Inspection & Causality

**Objectif** : Rendre la simulation compréhensible au joueur.

**Résultat** :
- Panneau d'inspection contextuel pour chaque type d'objet (maison, appartement, ferme, route, service communautaire)
- Projection pure de l'état du domaine, indépendante de React/Three.js
- Sélection réutilisée (pointer → grid position → resolveSelectableAt → stable ID)
- Cellule vide ferme l'inspection
- Aucune donnée fictive, aucun score interne exposé
- Relations déduites de l'état réel (zone, route, service)

**Contraintes respectées** :
- Pas de nouveau système de simulation
- Pas de nouveau bâtiment
- Pas de mémoire historique (EventManager, CausalGraph, etc.)
- Caméra strictement top-down
- Validation : typecheck, lint, tests, build

**Statut** : Terminé

---

## Step 17 — Urban Rules & Player Intent

**Objectif** : Donner au joueur le contrôle des **intentions** sans construire chaque bâtiment.

**Résultat** :
- Système de zones (résidentielle, agricole) comme expression d'intention
- UI compacte : `BUILD → ZONE → Residential / Agricultural`
- Dessin de zone par click+drag sur la grille
- Validation dans le domaine (limites, chevauchement, taille)
- Zones = espace éligible, pas construction directe
- Le développement autonome réutilise le scoring existant (population, routes, services, clustering)
- Suppression de zone préserve les bâtiments existants
- Zones inspectables et visuellement discrètes
- Les deux modes coexistent : construction manuelle + zones autonomes

**Principe fondamental** :
```text
Le joueur contrôle : WHERE / WHAT SHOULD DEVELOP
La simulation contrôle : WHEN / HOW DEVELOPMENT HAPPENS
```

**Statut** : Terminé

---

## Step 18 — Urban Feedback Loop & Simulation Timeline

**Objectif** : Rendre la simulation observable dans le temps.

**Résultat** :
- Projection applicative : `previousSnapshot → currentSnapshot → detectChanges() → SimulationEvent[]`
- 3 types d'événements : `BUILDING_CREATED`, `ROAD_CREATED`, `BUILDING_EVOLVED`
- Feed UI compact avec historique court (derniers événements)
- Regroupement anti-spam (ex: `4 houses built` au lieu de 4 notifications)
- Timeline avec temps simulé, pause, vitesse
- Contrôles : Pause, 1×, 2×, 5×, 20×, 100×, STEP, RESET
- Événements purement déterministes, dérivés de changements réels
- Pas de causalité inventée (pas de `Road caused this house`)
- Pas de EventManager global, pas de replay system

**Statut** : Terminé

---

## Step 19 — Urban State & Causal Readout

**Objectif** : Enrichir le feedback de Step 18 avec du contexte spatial et temporel.

**Résultat** :
- Concept `UrbanChange` avec ID métier stable, position, tick, label
- Contexte enrichi : zone, proximité route, type de bâtiment
- Feed amélioré : `RECENT CHANGES` avec horodatage et contexte
- Regroupement déterministe (ordre : tick → type → position → ID)
- Interaction optionnelle : clic sur feed → sélection → inspection
- Projection pure, sans React, sans Three.js

**Sous-étapes QA** :

| Sous-étape | Objet | Résultat |
|---|---|---|
| 19.1 | Playtest produit | **Partiellement bloqué** — Chromium stall GPU empêche le test visuel. Rapport QA créé sans modifier le code. |
| 19.2 | Validation WebGL | **Diagnostic terminé** — Le stall vient de SwiftShader (renderer logiciel) vs NVIDIA RTX 3070. Configuration `--enable-gpu --ignore-gpu-blocklist` résout le problème. |
| 19.3 | Validation E2E GPU | **PASS** — Configuration `playwright.gpu.config.ts` créée. Suite E2E complète passe avec hardware WebGL. |
| 19.4 | Alignement contrat E2E | **PASS** — 4 assertions obsolètes (TICK 0, empty city) alignées au contrat actuel. |

**Statut** : Terminé (y compris sous-étapes QA)

---

## Step 20 — Product Contract

**Objectif** : Définir la source de vérité pour le premier produit jouable.

**Contenu clé** :

### Promesse produit
> Un joueur peut fonder un établissement, comprendre pourquoi il grandit, et regarder une petite ville se former.

### Portée MVP

| Système | Engagement MVP |
|---|---|
| Monde | Seed 128×128, plaines, collines, côte, rivière, lac |
| Construction | Routes, zones résidentielles, nœuds food/énergie |
| Population | Ménages et travailleurs agrégés |
| Économie | Food, énergie, matériaux, stockage |
| Croissance | Settlement → Village → Town |
| Temps | Pause, 1×, 2×, 5×, 20× |
| Rendu | WebGL2 baseline, jour/nuit |
| Persistance | 1 slot manuel + 1 autosave |
| UX | Build tools, contrôles, métriques, inspecteur |

### Contrat simulation
- 1 tick = 1 jour simulé
- 30 ticks = 1 mois, 360 ticks = 1 an
- Tick order fixe : commands → accessibility → production → consumption → housing → construction → events → hash
- État de départ : 40 people, 12 households, 180 food, 120 energy, 300 materials

### Portées de civilisation
- Wilderness → Settlement (1 house, pop ≥ 20) → Village (pop ≥ 50) → Town (pop ≥ 500)

### Gates d'acceptation
1. Premier house en < 60s
2. Pop 50 en < 15min à 1×
3. Même seed + commands = même state hash
4. Save/reload = même hash après 100 ticks
5. Playwright smoke test passe
6. Performance budgets respectés
7. Navigation clavier complète

**Statut** : Document de référence, pas une étape d'implémentation

---

## Validations globales

| Validation | Statut |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 64 tests |
| `pnpm build` | PASS |
| `pnpm test:e2e` | Fail (SwiftShader, environnement) |
| `pnpm test:e2e:gpu` | PASS — 4/4 tests, 2.9s |

**GPU** : NVIDIA GeForce RTX 3070 / ANGLE / D3D11 (avec flags `--enable-gpu --ignore-gpu-blocklist`)

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/application/queries/to-inspection.ts` | Projection d'inspection (Step 16) |
| `src/application/queries/simulation-events.ts` | Projection d'événements (Step 18) |
| `src/application/queries/to-urban-change.ts` | Changements enrichis (Step 19) |
| `src/app/composition/App.tsx` | Composition UI, contrôles, feed |
| `src/engine/simulation/SimulationRuntime.ts` | Runtime et horloge |
| `src/domain/simulation/simulation-state.ts` | État et progression |
| `playwright.gpu.config.ts` | Configuration E2E GPU |
| `tests/e2e/nova.spec.ts` | Tests E2E |
| `docs/20-product-contract.md` | Contrat produit MVP |
| `docs/19-mvp.md` | Spécification MVP |

---

## État actuel du projet

NOVA dispose maintenant d'une **boucle complète fonctionnelle** :

```text
INTENTION JOUEUR
      ↓
ZONES
      ↓
SIMULATION DÉTERMINISTE
      ↓
DÉVELOPPEMENT AUTONOME
      ↓
BÂTIMENTS & ROUTES
      ↓
DENSIFICATION
      ↓
FEEDBACK TEMPOREL (événements, contexte)
      ↓
INSPECTION (compréhension)
      ↓
NOUVELLE INTENTION
```

Le produit peut être inspecté, compris, et validé. La prochaine étape logique est le **playtest visuel complet** dans un environnement WebGL fonctionnel, puis l'amélioration de l'expérience basée sur les retours réels.
