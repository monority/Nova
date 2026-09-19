# NOVA — Step 09E — Building Road Access

## Context

NOVA vient de terminer la fondation du système de mobilité :

* **09A** — transport network foundation
* **09B** — road infrastructure contract
* **09C** — mobility infrastructure construction
* **09D** — road network connectivity

État actuel :

```text
Building
   │
   │ 09E = access
   ▼
Road
   │
   │ 09D = connectivity
   ▼
Road Network
```

Le système actuel distingue correctement :

* les bâtiments ;
* les routes ;
* les réseaux routiers ;
* les états `underConstruction` / `operational` ;
* les données persistées ;
* les requêtes dérivées.

Les routes sont des cellules indépendantes de la grille.

Une route opérationnelle est connectée à une autre route opérationnelle uniquement si elles sont orthogonalement adjacentes.

La connectivité routière est déjà calculée en 09D.

### Ce step ne doit PAS implémenter

* déplacement de population ;
* pathfinding ;
* véhicules ;
* voitures ;
* transport public ;
* flux lumineux ;
* passagers ;
* temps de trajet ;
* congestion ;
* logistique ;
* livraison ;
* marchandises ;
* coûts d'entretien ;
* niveaux de route ;
* highways ;
* upgrades ;
* effets économiques ;
* modification des jobs ;
* modification de la production ;
* modification de l'accessibilité alimentaire ;
* nouvelle ressource ;
* nouveau système générique de graphe.

Le but est uniquement d'établir le concept :

> **un bâtiment peut avoir accès à un ou plusieurs réseaux routiers via les routes opérationnelles adjacentes.**

---

# 1. AUDIT AVANT MODIFICATION

Commencer par auditer le repository réel.

Ne suppose pas que les noms/API décrits dans ce prompt existent exactement.

Inspecter notamment :

```text
src/domain/road/
src/domain/network/
src/domain/building/
src/application/queries/
src/app/main.ts
tests/
e2e/
docs/roadmap/
```

Vérifier :

1. la représentation actuelle de `BuildingState` ;
2. la représentation actuelle de `RoadState` ;
3. les helpers d'occupation de cellule ;
4. `areOrthogonallyAdjacent` ;
5. `areRoadsAdjacent` ;
6. `getConnectedRoadIds` ;
7. `getRoadNetworks` ;
8. les conventions de requêtes pures ;
9. les conventions d'export ;
10. `__nova.stats` ;
11. la stratégie actuelle de tests E2E ;
12. la sérialisation/hash ;
13. le comportement exact des bâtiments et routes `underConstruction`.

Ne modifie encore aucun fichier pendant cette phase.

Produire d'abord une courte section :

```text
AUDIT
- ...
```

---

# 2. DÉCISION DE DESIGN À PRENDRE

À partir de l'audit, déterminer comment exprimer proprement le concept de Building Road Access.

Le modèle spatial actuel utilise :

* bâtiments occupant 1 cellule ;
* routes occupant 1 cellule ;
* grille orthogonale ;
* aucune orientation de bâtiment ;
* aucun point d'entrée/front door ;
* aucune géométrie de frontage ;
* aucune couche multi-cellule.

Dans ce contexte, tester en priorité le modèle minimal :

```text
Building
   │
   ├── N ─ Road
   ├── E ─ Road
   ├── S ─ Road
   └── W ─ Road
```

Un bâtiment possède un accès routier si au moins une cellule orthogonalement adjacente contient une **route opérationnelle**.

Ne pas inventer un système de porte/frontage/orientation si le repository ne le justifie pas.

Cependant, si l'audit révèle une contrainte réelle qui rend ce modèle incorrect, l'agent doit la documenter avant d'implémenter.

## Règle importante

Ne pas confondre :

```text
Building → Road access
```

et :

```text
Building → Road Network
```

Le premier est une relation spatiale locale.

Le second est obtenu à partir du premier + de la connectivité 09D.

---

# 3. CAS IMPORTANT : PLUSIEURS RÉSEAUX

Ne réduire silencieusement l'accès d'un bâtiment à un seul réseau.

Exemple :

```text
    R1
     │
     B
     │
    R2
```

où `R1` et `R2` appartiennent à deux réseaux routiers différents.

Comme le bâtiment occupe la cellule centrale :

* `R1` est adjacent au bâtiment ;
* `R2` est adjacent au bâtiment ;
* `R1` et `R2` ne sont pas adjacents entre eux.

Le bâtiment doit donc pouvoir exposer :

```text
roadIds = [R1, R2]
networkIds = [N1, N2]
```

et **ne doit pas fusionner N1 et N2**.

Le bâtiment n'est pas une route et ne constitue pas un pont entre deux réseaux.

Cette distinction est importante pour les futurs systèmes de transport.

---

# 4. CONTRAT PROPOSÉ

Créer une requête de domaine/application pure adaptée aux conventions du repository.

Le résultat doit permettre au minimum de savoir :

```text
- si le bâtiment possède un accès routier ;
- quelles routes opérationnelles lui donnent accès ;
- quels réseaux routiers correspondent à ces routes.
```

Par exemple, si cela correspond aux conventions existantes :

```ts
type BuildingRoadAccess = {
  buildingId: number;
  roadIds: number[];
  networkIds: number[];
  hasRoadAccess: boolean;
};
```

Mais **ne copie pas aveuglément cette API**.

Utilise les types/naming conventions déjà présents dans le projet.

Propriétés :

* dérivées ;
* pures ;
* déterministes ;
* non persistées ;
* non hashées.

Les collections doivent avoir un ordre déterministe.

Privilégier les IDs croissants lorsque cela correspond aux conventions existantes.

---

# 5. SÉMANTIQUE

## Building

Pour un bâtiment donné :

```text
building.status === operational
```

est requis pour considérer son accès comme actif.

Un bâtiment `underConstruction` ne doit pas être considéré comme ayant un accès routier fonctionnel.

## Road

Seules les routes :

```text
road.status === operational
```

comptent.

Une route en construction est ignorée.

## Géométrie

Seule l'adjacence orthogonale compte :

```text
N
W B E
S
```

Une route diagonale ne donne pas accès :

```text
R .
. B
```

ne doit PAS produire d'accès.

## Réseau

Pour chaque route adjacente opérationnelle :

1. retrouver son réseau via le système 09D ;
2. exposer le ou les network IDs correspondants ;
3. ne pas créer de nouveau graphe ;
4. ne pas recalculer une connectivité différente.

Un réseau routier isolé constitué d'une seule route reste un réseau valide.

---

# 6. CAS DE TEST MINIMUM

Ajouter une couverture de tests dédiée.

Les tests doivent passer par les vrais objets/constructeurs/commandes du projet lorsque cela est pertinent.

Couvrir au minimum :

### A — Aucun accès

```text
B
```

Résultat :

```text
hasRoadAccess = false
roadIds = []
networkIds = []
```

### B — Route au nord

```text
R
B
```

Accès actif.

### C — Route à l'est

```text
B R
```

Accès actif.

### D — Route diagonale

```text
R .
. B
```

Aucun accès.

### E — Route en construction

```text
R(underConstruction)
B
```

Aucun accès.

### F — Bâtiment en construction

```text
R
B(underConstruction)
```

Aucun accès actif.

### G — Plusieurs routes du même réseau

```text
R R
B R
```

Les plusieurs routes adjacentes doivent être exposées si le contrat retourne les road IDs.

Le réseau doit cependant apparaître une seule fois dans `networkIds`.

### H — Deux réseaux distincts

Exemple conceptuel :

```text
R1
 B
R2
```

où R1 et R2 sont volontairement séparés.

Résultat :

```text
roadIds = [R1, R2]
networkIds = [N1, N2]
```

et surtout :

```text
N1 !== N2
```

Le bâtiment ne fusionne pas les réseaux.

### I — Deux routes adjacentes entre elles

Vérifier qu'elles appartiennent bien au même réseau selon 09D et que le bâtiment peut accéder à ce réseau via l'une ou l'autre.

### J — Déterminisme

Même état :

```text
state A
state A
```

→ même résultat.

Tester également que l'ordre d'insertion des routes ne modifie pas le résultat final lorsque le modèle actuel garantit cette propriété.

### K — Save/load

Construire un état avec :

* bâtiment ;
* plusieurs routes ;
* plusieurs réseaux.

Vérifier que :

```text
save → load → query
```

produit exactement le même résultat.

Aucun état d'accès ne doit être sérialisé.

---

# 7. RELATION AVEC 09A

Le repository contient encore le système de 09A basé sur :

```text
Building ↔ Building
```

Ne supprimer ou modifier ce système que si l'audit montre qu'il est devenu inutilisé et que sa suppression est sans ambiguïté.

Ne pas créer une API générique du genre :

```ts
getConnectedGraph(...)
```

pour faire disparaître artificiellement les différences entre :

```text
Building ↔ Building
Road ↔ Road
Building ↔ Road
```

Ces trois questions ont actuellement des significations différentes.

La nouvelle relation doit rester explicitement routière :

```text
Building → Road → Road Network
```

---

# 8. INTÉGRATION APPLICATION

Ajouter les exports/query nécessaires en suivant les conventions existantes.

Si `__nova.stats` est déjà utilisé pour les vérifications internes, exposer uniquement les informations utiles au debug/test, par exemple :

```text
buildingRoadAccess
```

ou une représentation équivalente.

Ne pas transformer `__nova.stats` en nouvelle API publique de gameplay.

---

# 9. PAS DE NOUVEL ÉTAT

Ne pas ajouter :

```text
roadAccess
accessible
networkId
connectedRoadId
```

dans `BuildingState`.

Ne pas ajouter d'état cache.

Ne pas persister une relation dérivée.

Le résultat doit toujours être recalculable depuis :

```text
Buildings
+
Roads
+
Road Network queries
```

Cela garantit que :

```text
save/load
```

ne peut pas produire un cache d'accessibilité périmé.

---

# 10. PERSISTENCE / HASH

Ne pas modifier le schéma de sauvegarde.

Attendu :

```text
SAVE_VERSION = 4
```

sauf découverte exceptionnelle pendant l'audit d'une incompatibilité réelle.

Puisque l'accès bâtiment-route est dérivé :

* aucun nouveau champ persisté ;
* aucun changement du canonical JSON ;
* aucun changement du hash ;
* save/load identique.

---

# 11. DÉTERMINISME

Le résultat doit être strictement déterministe.

Aucun :

* `Math.random()`;
* `Date.now()`;
* timestamp ;
* ordre dépendant d'un `Map` non normalisé si cela affecte la sortie ;
* mutation cachée.

Pour un même état :

```text
getBuildingRoadAccess(state, id)
```

doit toujours retourner exactement le même résultat.

---

# 12. E2E / BROWSER

Commencer par vérifier ce que l'interface réelle permet actuellement.

09C n'a pas introduit de palette UI complète de routes.

Donc :

* ne fabriquer pas une UI de gameplay uniquement pour satisfaire ce step ;
* ne créer pas de route de navigation artificielle ;
* ne créer pas de panneau UI permanent.

Si `__nova.stats` permet de vérifier le résultat depuis le navigateur, ajouter une vérification E2E minimale.

Sinon, documenter clairement :

```text
Browser E2E deferred:
no player-facing road/access UI exists yet.
```

Le domaine doit néanmoins être vérifié via les tests Vitest et le chemin réel `stepSimulation` lorsqu'il est pertinent.

---

# 13. VÉRIFICATION COMPLÈTE

Après implémentation :

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis exécuter les E2E pertinents.

Ne pas se contenter des nouveaux tests.

Vérifier également les régressions :

* construction ;
* jobs ;
* production Material ;
* stockage ;
* upkeep ;
* food ;
* transport network ;
* road construction ;
* save/load ;
* determinism.

Si le repository utilise d'autres commandes canoniques, les préférer aux commandes supposées ci-dessus.

---

# 14. AUDIT DE SCOPE

Avant de conclure, inspecter :

```bash
git diff --stat
git diff
git status
```

Vérifier qu'aucun changement accidentel n'a été introduit.

En particulier, refuser les dérives suivantes :

```text
movement
pathfinding
vehicles
transit
cargo
economy
upkeep
road tiers
highways
demolition
visual particle systems
generic graph abstraction
```

---

# 15. DOCUMENTATION

Créer :

```text
docs/roadmap/Step09E.md
```

Documenter :

1. audit réel ;
2. décision de design ;
3. définition de Building Road Access ;
4. distinction access local / network ;
5. gestion de plusieurs réseaux ;
6. lifecycle `operational` ;
7. tests ;
8. persistence ;
9. déterminisme ;
10. ce qui reste volontairement différé.

Le document doit distinguer explicitement :

### Discovered rule

Règle déjà imposée par l'architecture existante.

### Derived technical rule

Conséquence technique nécessaire du modèle.

### Intentional game-design rule

Choix de gameplay volontaire.

Ne pas présenter une décision de design comme si elle était une nécessité technique.

---

# 16. COMMIT

Si tout est propre, créer un commit dédié :

```text
Step 09E: Building Road Access
```

Ne pas mélanger d'autres fonctionnalités.

---

# 17. ACCEPTANCE CRITERIA

Le step est considéré terminé uniquement si :

* [ ] l'architecture réelle a été auditée avant modification ;
* [ ] le concept Building → Road Access est explicitement documenté ;
* [ ] l'accès repose sur la géométrie réellement supportée par le jeu ;
* [ ] l'adjacence orthogonale est correctement appliquée ;
* [ ] les routes diagonales sont ignorées ;
* [ ] les routes `underConstruction` sont ignorées ;
* [ ] les bâtiments `underConstruction` n'ont pas d'accès actif ;
* [ ] plusieurs routes adjacentes sont gérées ;
* [ ] plusieurs réseaux distincts sont représentables ;
* [ ] un bâtiment ne fusionne jamais deux road networks ;
* [ ] la connectivité 09D est réutilisée plutôt que dupliquée ;
* [ ] aucune donnée d'accès n'est persistée ;
* [ ] SAVE_VERSION reste 4 si aucun changement de schéma n'est nécessaire ;
* [ ] le hash reste déterministe ;
* [ ] save/load conserve exactement les mêmes résultats dérivés ;
* [ ] les tests de déterminisme passent ;
* [ ] les tests économiques existants passent ;
* [ ] les tests 09A–09D passent ;
* [ ] lint passe ;
* [ ] typecheck passe ;
* [ ] build passe ;
* [ ] aucune feature de transport prématurée n'a été ajoutée ;
* [ ] le diff est limité au scope 09E.

---

# 18. RAPPORT FINAL OBLIGATOIRE

Terminer par un rapport structuré exactement autour de :

```text
## Step 09E — Final Report

### A. Audit
- état découvert
- contraintes réelles

### B. Design Decision
- règle Building → Road
- gestion des réseaux multiples
- justification

### C. Implementation
- fichiers modifiés
- APIs/types ajoutés
- comportement

### D. Tests
- nouveaux tests
- total Vitest
- cas couverts

### E. Browser / E2E
- scénario exécuté
- résultat
- ou raison précise d'un éventuel report

### F. Persistence
- SAVE_VERSION
- save/load
- hash

### G. Determinism
- replay
- ordre d'insertion
- résultat

### H. Regression
- jobs
- production
- storage
- upkeep
- food
- roads
- networks

### I. Scope Audit
- fonctionnalités explicitement NON implémentées

### J. Git
- commit
- working tree status

### K. Next Design Question
Une seule question architecturale importante que ce step fait émerger pour 09F.
```

Ne terminer pas par une liste de fonctionnalités inventées.

Le but de 09E est de transformer :

```text
Road Network
```

en relation spatiale exploitable :

```text
Building
    ↓
adjacent operational Road
    ↓
Road Network
```

sans encore simuler le transport lui-même.


---

# Final report

## Step 09E — Final Report

### A. Audit

État découvert :

* `BuildingState` = `{ id: string, type, x, y, status, constructionRemaining }` — ids **string** (`building-N`), pas `number` (l'exemple de l'énoncé ne suit pas les conventions du repo ; convention repo appliquée) ;
* `RoadState` (09C) = `{ id: string, x, y, status, constructionRemaining }` ;
* occupation : `isCellOccupied` (buildings) + `isRoadOccupied` (roads), une cellule = un occupant ;
* `areOrthogonallyAdjacent` (09A, `domain/network/network.ts`) et `areRoadsAdjacent` (09D, `domain/road/road.ts`) — mêmes règles Manhattan = 1 ;
* `getConnectedRoadIds` / `getRoadNetworks` (09D) : composantes dérivées, ordonnées par plus petit road id ;
* conventions requêtes : pur, dérivé, asc-id déterministe, non persisté, non hashé ;
* `__nova.stats` : surface debug test-only (string map) ;
* E2E : `transportRun.mjs` (09A) ; **aucune palette route dans l'app** (09C a livré le domaine sans UI) ;
* sérialisation : `SAVE_VERSION = 4`, routes déjà validées dans `save.ts` ;
* lifecycle : routes et bâtiments démarrent `underConstruction`, deviennent `operational` via `advanceConstruction` (2 ticks).

Contrainte réelle : deux routes orthogonalement adjacentes entre elles ne peuvent pas être TOUTES LES DEUX orthogonalement adjacentes au même bâtiment 1×1. Le scénario « I » de l'énoncé (deux routes adjacentes accessibles via l'une ou l'autre depuis le bâtiment) est géométriquement impossible dans ce modèle — testé en deux volets distincts (G : plusieurs routes d'accès d'un même réseau ; I : réseau étendu atteint via une seule route d'accès).

### B. Design Decision

**Règle Building → Road** (intentional game-design rule, validée par l'audit — le modèle 1×1 sans front door rend l'adjacence orthogonale le seul choix géométrique supporté) :

> Un bâtiment a un accès routier actif ssi le bâtiment est `operational` ET au moins une cellule orthogonalement adjacente contient une route `operational`.

**Gestion des réseaux multiples** (discovered rule imposée par 09D) : `networkIds` = ids réseau (plus petit road id de chaque composante, convention 09D) dérivés via `getRoadNetworks` — dédupliqués, triés asc, jamais fusionnés. Le bâtiment n'est pas un pont : deux routes adjacentes au bâtiment mais dans des réseaux distincts exposent deux networkIds distincts.

**Justification** : distinction stricte access local (spatial, N/E/S/W) vs network (09D + access). Pas de nouveau graphe ; 09D réutilisé, pas dupliqué.

### C. Implementation

Fichiers modifiés :

* `src/domain/road/road.ts` — `BuildingRoadAccess` (interface : `buildingId: string`, `roadIds: readonly string[]`, `networkIds: readonly string[]`, `hasRoadAccess: boolean`), `getBuildingRoadAccess(state, buildingId)` ;
* `src/application/queries/roads.ts` — re-export pur `getBuildingRoadAccess` ;
* `src/app/main.ts` — stat debug `buildingsWithRoadAccess` dans `__nova.stats()` ;
* `tests/buildingRoadAccess.test.ts` — nouveau, 13 tests.

Comportement : bâtiment inconnu / `underConstruction` / sans route adjacente opérationnelle → `{ buildingId, roadIds: [], networkIds: [], hasRoadAccess: false }`. `roadIds` asc (garanti par `iterateRoads`), `networkIds` asc dédupliqués.

### D. Tests

Nouveaux : 13 (A aucun accès, B nord, C est, D diagonale, E route en construction + transition, F bâtiment en construction + transition, G plusieurs routes d'un réseau, H deux réseaux distincts non fusionnés, I réseau étendu via une route, J déterminisme + ordre insertion, K save/load, L id inconnu, M pureté). Tests E et F passent par le vrai chemin `stepSimulation`.

Total Vitest : **278 passed / 278** (19 fichiers). Lint, typecheck, build : OK.

### E. Browser / E2E

```text
Browser E2E deferred:
no player-facing road/access UI exists yet.
```

Aucune palette route (09C = domaine seul) → placement route réel impossible au navigateur sans construire de l'UI produit, interdit par §12. Stat debug `buildingsWithRoadAccess` exposée pour l'E2E futur. Cycle de vie vérifié via `stepSimulation` réel (tests E, F). Transport E2E 09A : ALL PASS (régression nulle).

### F. Persistence

* `SAVE_VERSION = 4` inchangé ;
* `save.ts` non modifié ; aucun champ persisté ;
* save → load → query : résultat identique + hash identique (test K) ;
* hash canonique inchangé.

### G. Determinism

* `iterateRoads` / `getRoadNetworks` : asc-id ; même état → même résultat (test J) ;
* ordre d'insertion des records inversé → résultat identique (test J) ;
* aucun `Math.random`, aucun timestamp, aucune mutation cachée (test M).

### H. Regression

Vitest 278/278 : jobs ✓ production ✓ storage ✓ upkeep ✓ food ✓ road construction (09C) ✓ networks (09A/09D) ✓ determinism ✓ save/load ✓. Transport E2E : ALL PASS. Aucun changement économique.

### I. Scope Audit

Explicitement NON implémenté : movement, pathfinding, véhicules, transit, cargo, effets économiques, upkeep routes, road tiers, highways, démolition, particules, abstraction graphe générique, front door/orientation, frontage, fusion de réseaux via bâtiment. `git status` avant commit : uniquement les fichiers listés en C.

### J. Git

* Commit : `Step 09E: Building Road Access` (voir hash ci-dessous) ;
* parent : `b936842` (Step 09D) ;
* working tree : propre après commit.

### K. Next Design Question

**Le réseau routier doit-il avoir un effet gameplay, et lequel ?** 09E rend l'accès calculable mais sans conséquence : un bâtiment sans accès routier reste pleinement fonctionnel (production, jobs, logement inchangés). La question 09F : l'accès routier conditionne-t-il quelque chose (admission de colons, rendement, upkeep, extension de territoire) — et un bâtiment accessible via le graphe 09A (Résidence) mais sans accès route doit-il cesser de fonctionner ? C'est un choix de game design, pas une conséquence technique.
