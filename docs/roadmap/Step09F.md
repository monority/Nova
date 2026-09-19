# NOVA — Step 09F — Road Access & Operational Work

## Context

NOVA vient de terminer :

* 09A — Transport network foundation
* 09B — Road infrastructure contract
* 09C — Mobility infrastructure construction
* 09D — Road network connectivity
* 09E — Building Road Access

09E établit maintenant la relation :

```text
Building
    ↓
adjacent operational Road
    ↓
Road Network
```

Cette relation est actuellement **informative uniquement**.

Un bâtiment sans accès routier reste aujourd'hui pleinement fonctionnel :

* un Workshop peut recevoir des workers ;
* un Workshop peut produire du Material ;
* une Residence fournit toujours son logement ;
* les systèmes économiques ne tiennent pas compte du réseau routier.

La roadmap Phase 9 demande maintenant que le transport commence à créer une **contrainte spatiale réelle**.

Cependant, ne pas implémenter le transport physique lui-même.

---

# 1. OBJECTIF DU STEP

Introduire **une seule conséquence gameplay** du road access :

> Un Workshop opérationnel ne peut produire du Material que s'il possède un accès à un réseau routier.

Le système devient :

```text
Workshop
   │
   ├── operational
   │
   ├── staffed
   │
   └── road-accessible
          │
          ▼
     Material production
```

Sans accès :

```text
Workshop
   ↓
0 Material production
```

Cette règle doit s'appliquer uniquement à la **production de Material**.

Ne pas modifier simultanément :

* logement ;
* population ;
* nourriture ;
* jobs ;
* upkeep ;
* coûts ;
* stockage ;
* construction.

---

# 2. IMPORTANT — AUDIT AVANT CODAGE

Commencer par auditer le repository réel.

Ne pas supposer que les noms du prompt correspondent exactement au code.

Inspecter notamment :

```text
src/domain/simulation/
src/domain/building/
src/domain/road/
src/application/queries/
tests/
e2e/
docs/roadmap/
```

Identifier précisément :

1. où les jobs sont assignés ;
2. comment le nombre de workers productifs est calculé ;
3. où `produceMaterial` intervient dans l'ordre des phases ;
4. comment le Workshop est identifié ;
5. comment `getBuildingRoadAccess` est actuellement exposé ;
6. si la production utilise déjà une query pure permettant d'ajouter une condition ;
7. comment les tests économiques construisent leurs états ;
8. comment `__nova.stats` expose actuellement la production ;
9. comment les E2E vérifient la production.

Avant toute modification, produire :

```text
AUDIT
- ...
```

Puis seulement décider de l'implémentation.

---

# 3. DÉCISION DE DESIGN À VALIDER

Le choix proposé est :

> **Road access est une condition de production, pas une condition d'existence du bâtiment.**

Un Workshop peut donc être :

```text
operational
+ staffed
+ no road access
```

mais produire :

```text
0 Material
```

Il ne doit pas être détruit.

Il ne doit pas redevenir `underConstruction`.

Il ne doit pas perdre ses workers.

Il ne doit pas créer de dette.

Il ne doit pas modifier son état persistant.

Cette distinction est importante :

```text
construction ≠ operation ≠ productivity
```

Le bâtiment existe toujours, mais son activité productive est empêchée.

---

# 4. ORDRE CAUSAL

L'ordre actuel de simulation doit être audité avant modification.

Le système actuel ressemble à :

```text
needs
→ food
→ population
→ jobs
→ material production
→ construction
→ upkeep
→ advanceTime
```

Ne pas réordonner les phases sans nécessité.

La nouvelle règle doit idéalement être une condition dans la production existante :

```text
productive workers
AND
operational Workshop
AND
road access
→ Material production
```

et non un nouveau système parallèle.

---

# 5. RÈGLE EXACTE

Pour chaque Workshop :

```text
eligibleForMaterialProduction =
    operational
    AND
    productiveWorkers > 0
    AND
    hasRoadAccess
```

Si cette condition est vraie :

```text
Material += productiveWorkerCount × existingProductionRate
```

Si elle est fausse :

```text
Material += 0
```

Conserver **exactement** les coefficients économiques actuels.

Ne pas modifier :

```text
MATERIAL_PRODUCTION_PER_WORKER
```

Ne pas modifier :

```text
MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP
```

Ne pas modifier :

```text
WORKSHOP_UPKEEP
```

Ne pas modifier :

```text
construction cost
```

---

# 6. QUESTION IMPORTANTE : UPKEEP

L'audit doit explicitement déterminer la conséquence du nouveau design sur l'upkeep.

Le choix recommandé pour ce step est :

> **Un Workshop opérationnel et staffé continue de payer son upkeep même lorsqu'il n'a pas de road access.**

Donc :

```text
road access = false
production = 0
upkeep = 1
```

Pourquoi ?

Parce que le bâtiment est toujours :

```text
operational + staffed
```

et le manque d'accès empêche son activité productive, pas son existence ni son fonctionnement infrastructurel.

Ne pas utiliser le road access pour supprimer automatiquement l'upkeep.

Si le repository révèle une contradiction forte avec cette règle, documenter la contradiction et proposer la correction avant de modifier le comportement.

---

# 7. NE PAS CONDITIONNER LES JOBS

C'est un point essentiel.

09F ne doit pas transformer :

```text
road access → job eligibility
```

Les workers peuvent toujours être affectés au Workshop.

Exemple :

```text
2 colonists
1 Workshop
0 road access
```

doit pouvoir donner :

```text
assigned workers = 1
productive workers = 1
production = 0
```

Le worker est assigné mais ne peut pas produire parce que l'établissement n'est pas relié au réseau routier.

Cela prépare éventuellement un futur modèle plus riche où le transport pourra représenter le déplacement réel, sans l'implémenter maintenant.

---

# 8. CAS DE TEST OBLIGATOIRES

Ajouter une suite dédiée, par exemple :

```text
tests/roadProduction.test.ts
```

ou suivre la convention réelle du repository.

## A — Workshop opérationnel + staffé + road access

```text
Workshop
   │
  Road
```

Attendu :

```text
workers = existing count
production = existing production amount
```

---

## B — Workshop opérationnel + staffé + aucun accès

```text
Workshop
```

Attendu :

```text
workers = existing count
production = 0
```

Le Workshop reste opérationnel.

---

## C — Route diagonale uniquement

```text
Road .
. Workshop
```

Attendu :

```text
no road access
production = 0
```

---

## D — Route underConstruction

```text
Road(underConstruction)
Workshop
```

Attendu :

```text
no road access
production = 0
```

---

## E — Workshop underConstruction

Même si une route est adjacente :

```text
Road
Workshop(underConstruction)
```

Attendu :

```text
production = 0
```

---

## F — Road network indirect

Tester :

```text
Workshop
Road
Road
Road
```

Le Workshop doit produire si la route directement adjacente est opérationnelle et appartient au réseau.

Il n'est pas nécessaire de simuler un chemin.

---

## G — Réseau déconnecté

Construire deux réseaux :

```text
Workshop A — R1 — R1
```

et ailleurs :

```text
R2 — R2
```

Vérifier que le Workshop A n'est pas considéré comme connecté à R2.

---

## H — Worker assignment inchangé

Sans road access :

```text
assignedWorkers > 0
productiveWorkerCount > 0
production = 0
```

Cela garantit que la nouvelle règle ne fuit pas dans le système de jobs.

---

## I — Upkeep inchangé

Workshop :

```text
operational
staffed
no road access
```

Attendu :

```text
production = 0
upkeep = existing upkeep
```

Le stock ne doit pas bénéficier d'un faux allègement d'entretien.

---

## J — Storage unchanged

Tester qu'un Workshop avec accès continue d'utiliser exactement la mécanique 08F :

```text
gross production
→ storage capacity
→ stored production
```

Le road access ne doit intervenir qu'avant la production.

---

## K — Construction unchanged

Le road access ne doit pas modifier :

* coût de construction ;
* durée ;
* progress ;
* consommation Material.

---

## L — Save/load

Créer un état :

```text
Workshop + Road + colonists
```

Sauvegarder/recharger.

Vérifier :

```text
production before == production after
state before == state after
hash before == hash after
```

L'accès routier reste dérivé.

---

## M — Determinism

Exécuter plusieurs simulations identiques.

Attendu :

```text
state A == state B
hash A == hash B
production A == production B
```

---

## N — Network split

Créer un Workshop relié à un réseau.

Puis produire un état où la route adjacente est retirée uniquement si une primitive de suppression existe déjà.

**Ne pas ajouter de demolition uniquement pour ce test.**

Si aucune suppression n'existe, tester simplement deux états indépendants :

```text
state connected
state disconnected
```

---

# 9. API / ARCHITECTURE

Réutiliser :

```text
getBuildingRoadAccess(...)
```

créé en 09E.

Ne pas recréer :

```text
hasRoadAccess(...)
```

avec une logique différente.

La source de vérité doit rester :

```text
Building
→ getBuildingRoadAccess
→ Road Network
```

Si une nouvelle query est réellement nécessaire, elle doit être une simple dérivation de cette source de vérité.

Éviter :

```text
isWorkshopRoadAccessible
isProductionRoadAccessible
canProduceBecauseRoad
```

comme multiplication de règles spécifiques.

La distinction doit rester claire :

```text
road access = spatial/domain fact
production eligibility = simulation rule
```

---

# 10. PAS DE PERSISTENCE

Ne pas ajouter :

```text
building.hasRoadAccess
building.networkId
building.canProduce
```

dans `BuildingState`.

Tout doit être recalculé.

Le save schema doit rester :

```text
SAVE_VERSION = 4
```

si aucune autre modification de schéma n'est découverte.

---

# 11. HASH

Le hash ne doit pas contenir l'accès routier calculé.

Puisque :

```text
roads
+
buildings
```

sont déjà hashés, l'accès est implicitement déterminé.

Deux états ayant exactement les mêmes données persistées doivent avoir le même hash.

---

# 12. UI / DEBUG

Ne pas créer de nouvelle UI produit.

Si `__nova.stats` possède déjà des informations de production, ajouter éventuellement uniquement l'information minimale nécessaire pour vérifier :

```text
roadAccess
productionBlockedByRoad
```

Mais ne pas persister ce champ.

Si le debug existant suffit à démontrer le comportement, ne pas modifier l'UI.

---

# 13. BROWSER / E2E

09C n'a toujours pas de palette route player-facing.

Donc ne pas fabriquer une UI artificielle.

Si l'infrastructure `__nova.stats` permet de contrôler le scénario :

```text
Workshop sans route
Workshop avec route
```

ajouter un E2E minimal.

Sinon :

```text
Browser E2E deferred:
no player-facing route construction/access UI exists yet.
```

Dans ce cas, les tests Vitest doivent couvrir le vrai chemin de simulation.

---

# 14. VÉRIFICATION ÉCONOMIQUE

Après implémentation, vérifier explicitement les invariants précédents.

Le nouveau comportement attendu est :

| Situation                   |      Workers | Production |   Upkeep |
| --------------------------- | -----------: | ---------: | -------: |
| Workshop + staff + route    |     inchangé |    normale | inchangé |
| Workshop + staff sans route |     inchangé |      **0** | inchangé |
| Workshop vacant + route     |            0 |          0 |        0 |
| Workshop vacant sans route  |            0 |          0 |        0 |
| Workshop en construction    | 0 productifs |          0 |        0 |

Les valeurs numériques exactes doivent venir du repository actuel.

---

# 15. RÉGRESSION

Exécuter les commandes canoniques du repository, notamment :

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis les E2E pertinents.

Vérifier impérativement :

```text
09A transport
09C road construction
09D road networks
09E road access
jobs
food
population
production
storage
upkeep
construction
save/load
determinism
```

Aucun test économique historique ne doit être réécrit simplement pour masquer une régression.

Si un ancien test suppose implicitement qu'un Workshop sans route produit encore, modifier ce test uniquement si le nouveau contrat de gameplay est explicitement établi et documenté.

---

# 16. AUDIT DE SCOPE

Avant le commit :

```bash
git diff --stat
git diff
git status
```

Le diff doit rester concentré.

Refuser toute dérive vers :

```text
movement
pathfinding
vehicles
transit
passengers
cargo
logistics
traffic
congestion
travel time
road tiers
highways
demolition
road upkeep
money
pollution
visual transit particles
```

Ces systèmes restent différés.

---

# 17. DOCUMENTATION

Créer :

```text
docs/roadmap/Step09F.md
```

Documenter :

### A. Audit

Architecture réellement trouvée.

### B. Design decision

Pourquoi le road access conditionne la production mais pas :

* les jobs ;
* l'existence du bâtiment ;
* l'upkeep.

### C. Causal chain

Documenter :

```text
Road
→ Road Network
→ Building Road Access
→ Workshop Production Eligibility
→ Material Production
```

### D. Game-design rule

Identifier explicitement que :

> le choix de rendre la production dépendante de l'accès routier est une règle de gameplay volontaire.

Ce n'est pas une nécessité technique.

### E. Deferred systems

Lister les systèmes non implémentés.

---

# 18. COMMIT

Créer un commit dédié uniquement si toutes les vérifications passent :

```text
Step 09F: Road Access Production Constraint
```

Ne pas mélanger avec une future feature de transport.

---

# 19. ACCEPTANCE CRITERIA

Le step est terminé uniquement si :

* [ ] audit effectué avant implémentation ;
* [ ] road access 09E réutilisé comme source de vérité ;
* [ ] Workshop opérationnel + staffé + accessible produit normalement ;
* [ ] Workshop opérationnel + staffé + sans accès produit 0 ;
* [ ] workers restent assignés sans road access ;
* [ ] productive worker count reste conceptuellement inchangé ;
* [ ] upkeep reste inchangé ;
* [ ] storage reste inchangé ;
* [ ] construction reste inchangée ;
* [ ] food/population restent inchangés ;
* [ ] route underConstruction ignorée ;
* [ ] bâtiment underConstruction ignoré ;
* [ ] routes diagonales ignorées ;
* [ ] réseau routier indirect correctement reconnu ;
* [ ] réseau déconnecté correctement refusé ;
* [ ] aucun nouvel état persisté ;
* [ ] SAVE_VERSION reste 4 si possible ;
* [ ] hash inchangé pour un même état persisté ;
* [ ] save/load conserve le comportement ;
* [ ] déterminisme vérifié ;
* [ ] tests historiques passent ;
* [ ] lint passe ;
* [ ] typecheck passe ;
* [ ] build passe ;
* [ ] E2E pertinent passe ou report explicitement justifié ;
* [ ] aucun système de mouvement/transit n'est introduit ;
* [ ] diff limité au scope ;
* [ ] documentation créée ;
* [ ] commit dédié créé.

---

# 20. RAPPORT FINAL

Terminer par :

```text
## Step 09F — Final Report

### A. Audit
- ...

### B. Design Decision
- ...

### C. Implementation
- fichiers
- APIs
- règle de production

### D. Tests
- nouveaux tests
- total
- résultats

### E. Browser / E2E
- ...

### F. Persistence
- SAVE_VERSION
- save/load
- hash

### G. Determinism
- ...

### H. Regression
- jobs
- food
- population
- production
- storage
- upkeep
- roads
- networks

### I. Scope Audit
- fonctionnalités explicitement NON implémentées

### J. Git
- commit
- working tree

### K. Next Design Question
Une seule question de conception importante révélée par 09F.
```

## Principe directeur

Ne transforme pas encore NOVA en simulateur de transport.

Ce step doit simplement faire émerger une première conséquence spatiale :

```text
       Road Network
            │
            ▼
     Building Road Access
            │
            ▼
       Workshop
            │
            ▼
     Material Production
```

Le transport physique viendra seulement lorsque le modèle aura réellement besoin de représenter **comment** les colonists se déplacent, et non simplement **si** une infrastructure relie deux zones.


---

# Documentation (as-built)

## A. Audit

Architecture réellement trouvée (≠ formulation du prompt) :

* la production de Material n'est **pas** per-Workshop dans le code : elle valait `countEmployedWorkers(state) × MATERIAL_PER_WORKER_PER_TICK` ;
* `assignJobs` garantit qu'un colonist employé travaille dans **exactement un** Workshop opérationnel (`workplaceId` résolu, capacité 1 par Workshop) ;
* donc Σ `countWorkersAt(W)` sur les Workshops opérationnels = `countEmployedWorkers` : la règle per-Workshop du prompt est exprimable **sans réécrire l'économie** ;
* `materialProductionForTick` (phases.ts) est la source unique ; `materialStoredProductionForTick` (clamp 08F) et `produceMaterial` en dérivent ;
* `getMaterialProductionPerTick` (application) recalculait la formule en parallèle → aligné sur la source unique ;
* upkeep = `countStaffedOperationalWorkshops × 1` (staffé, pas road-accessible) ;
* storage capacity = `countOperationalWorkshops × 25` (vacant compte, 08F) ;
* **09E `getBuildingRoadAccess(state, buildingId)`** déjà disponible et dérivé ;
* `__nova.stats` expose déjà production/upkeep/stock ;
* E2E navigateur : `jobsRun`, `upkeepRun` assument la production d'un Workshop sans route ; **aucune palette route player-facing n'existe** (09C = domaine seul).

## B. Design Decision

* **Discovered rule** (imposée par l'architecture existante) : la capacité de production est dérivée de l'emploi réel ; un colonist employé est toujours rattaché à un Workshop opérationnel. L'upkeep et la capacité de stockage sont des dérivations séparées de l'accessibilité.
* **Derived technical rule** : pour gater la production par l'accès routier sans réécrire l'économie, la condition doit être évaluée **par Workshop employé** : `operational ∧ workers > 0 ∧ hasRoadAccess`. Σ des contributions = production du tick. Aucun nouvel état, aucune nouvelle requête de règle (09E est la source de vérité).
* **Intentional game-design rule** : rendre la production de Material dépendante de l'accès routier est un **choix de gameplay volontaire** (§1 de l'énoncé), pas une nécessité technique. Conséquences volontaires :

  * un Workshop sans accès reste `operational`, garde ses workers, paie son upkeep, compte sa capacité de stockage — il ne produit simplement pas ;
  * `construction ≠ operation ≠ productivity` ;
  * l'upkeep n'est **pas** supprimé par l'absence d'accès (infrastructure toujours en fonctionnement) ;
  * les jobs ne sont **pas** conditionnés par l'accès (les workers sont assignés, ils ne peuvent pas produire).

## C. Causal chain

```text
Road (operational)
    → Road Network (09D: composantes connexes orthogonales)
        → Building Road Access (09E: route adjacente orthogonale opérationnelle + bâtiment opérationnel)
            → Workshop Production Eligibility (09F: operational ∧ staffed ∧ hasRoadAccess)
                → Material Production (MATERIAL_PER_WORKER_PER_TICK, inchangé)
                    → Storage clamp (08F, inchangé) → Upkeep (08C, inchangé)
```

## D. Game-design rule (explicitement volontaire)

> Le choix de rendre la production de Material dépendante de l'accès routier est une règle de gameplay volontaire introduite par 09F. Ce n'est pas une conséquence technique du modèle de grille ni du système routier.

Contrepartie assumée : tant qu'aucune palette route player-facing n'existe, un joueur navigateur ne peut pas rendre un Workshop productif. C'est un état transitoire documenté, pas un bug : la construction de routes à l'écran est le prochain step d'UI mobilité.

## E. Deferred systems

Non implémentés : movement, pathfinding, véhicules, transit, passagers, cargo, logistics, trafic, congestion, temps de trajet, road tiers, highways, démolition, upkeep de route, money, pollution, particules de transit, abstraction graphe générique, accès des autres types de bâtiments (résidence/farm), effet de l'accès sur l'admission des colons.

---

## Step 09F — Final Report

### A. Audit

Voir « Documentation (as-built) §A ». Points décisifs : production globalisée par l'emploi (reformulable per-Workshop sans réécriture), 09E disponible comme source de vérité, upkeep/capacité/storage indépendants, pas d'UI route navigateur.

### B. Design Decision

Voir §B. Gate par Workshop employé : `isOperationalWorkshop ∧ countWorkersAt > 0 ∧ getBuildingRoadAccess(...).hasRoadAccess`. Upkeep, jobs, storage, construction, food, population, coûts et coefficients **inchangés**.

### C. Implementation

* `src/domain/simulation/phases.ts` — `materialProductionForTick` devient Σ per-Workshop road-accessible (`getBuildingRoadAccess` importé ; `countEmployedWorkers` retiré de l'import). Aucun nouveau système parallèle : la condition est branchée dans la production existante, à sa place dans l'ordre causal.
* `src/application/queries/resources.ts` — `getMaterialProductionPerTick` délègue à `materialProductionForTick` (source unique ; la formule dupliquée disparaît).
* `src/app/main.ts` — debug uniquement : `productionBlockedByRoad` (Workshops opérationnels staffés sans accès) dans `__nova.stats()`.
* `tests/helpers.ts` — nouveau `withRoadsForWorkshops(state)` : injecte une route opérationnelle adjacente par Workshop (opération de domaine directe : aucun coût, aucun tick, aucun changement de stock — les assertions numériques historiques restent valides).
* Fixtures économiques historiques road-connectées pendant leur construction (la route doit exister **avant** les ticks de production) : `constructionMaterialFlow`, `upkeep`, `laborCapacity`, `storageCapacity`, `jobs`, `economicInvariants`.
* `tests/roadProduction.test.ts` — nouveau, 14 tests (A–N).
* `e2e/transportRun.mjs` — réordonnancement D/E (voir §E).
* `e2e/jobsRun.mjs`, `e2e/upkeepRun.mjs` — garde de report explicite (voir §E).

Règle de production : `production(tick) = Σ_{W opérationnel, staffé, road-accessible} countWorkersAt(W) × MATERIAL_PER_WORKER_PER_TICK`.

### D. Tests

* Nouveaux : 14 (`tests/roadProduction.test.ts`) — A accès+production, B sans accès → 0 avec workers conservés, C diagonale ignorée, D route en construction ignorée puis transition, E Workshop en construction → 0, F réseau indirect, G réseau déconnecté, H jobs inchangés, I upkeep inchangé, J storage 08F inchangé, K construction inchangée, L save/load, M déterminisme, N connecté/déconnecté sans primitive de démolition.
* Total Vitest : **292 passed / 292** (20 fichiers).
* lint ✔, typecheck ✔, build ✔.

### E. Browser / E2E

* `run`, `foodRun`, `resourceRun`, `productionRun`, `temporalRun`, `gpuRun`, `transportRun` : **ALL PASS** (transport réordonné : le Workshop déconnecté ne produisant plus, le Workshop connecté est placé immédiatement après, depuis le stock restant 25, au lieu d'attendre un équilibre de production).
* `jobsRun`, `upkeepRun` : **DEFERRED** (garde explicite, exit 0 + message). Raison exacte :

```text
Browser E2E deferred: the browser has no player-facing road construction UI
(09C shipped the road domain without a palette), so a browser scenario cannot
build a road-connected Workshop and cannot exercise Material production under
the 09F rule. Remove the guard once a road palette ships and road-connect the
Workshops. Simulation-level coverage: tests/roadProduction.test.ts (A-N),
tests/upkeep.test.ts, tests/jobs.test.ts.
```

### F. Persistence

* `SAVE_VERSION = 4` inchangé ; `save.ts` non modifié ;
* aucun champ d'accès, de production éligible ou de réseau persisté ;
* save → load → production identique + hash identique (test L) ;
* hash canonique inchangé (roads + buildings suffisent à déterminer l'accès).

### G. Determinism

* `iterateBuildings` (asc-id) × `getBuildingRoadAccess` (asc-id, 09D déterministe) → même état, même résultat ;
* aucun `Math.random`, aucun timestamp, aucune mutation cachée ;
* test M : deux exécutions identiques → hash et production identiques.

### H. Regression

Vitest 292/292 : jobs ✔ food ✔ population ✔ production ✔ storage ✔ upkeep ✔ roads ✔ networks ✔ construction ✔ save/load ✔ determinism ✔. E2E navigateur : transport/temporal/food/production/resource/gpu/run ALL PASS ; jobs/upkeep reportés (raison ci-dessu
s). Aucun coefficient économique modifié (`MATERIAL_PER_WORKER_PER_TICK`, `MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP`, `MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK`, coûts de construction intacts).

### I. Scope Audit

Explicitement NON implémenté : movement, pathfinding, véhicules, transit, passagers, cargo, logistics, trafic, congestion, temps de trajet, road tiers, highways, démolition, upkeep de route, money, pollution, particules visuelles, abstraction graphe générique, accès des résidences/farms, effet de l'accès sur l'admission des colons. `git diff --stat` limité aux fichiers listés en C (+ fixtures et E2E).

### J. Git

* Commit : `Step 09F: Road Access Production Constraint` (hash ci-dessous) ;
* parent : `30ff36b` (Step 09E) ;
* working tree : propre après commit.

### K. Next Design Question

**La suppression de route doit-elle exister (démolition) et l'accès doit-il devenir une condition d'existence ou d'admission ?** 09F crée la première contrainte spatiale de production, mais aucune primitive ne permet de **retirer** une route (test N contourne par deux états indépendants) et l'accès ne conditionne encore ni l'admission des colons, ni l'existence du bâtiment. 09G doit trancher : introduit-on la démolition (avec le risque de « débrancher » une économie entière), et l'absence d'accès doit-elle un jour bloquer l'admission (Residence) ou seulement le rendement (Workshop) ? C'est un choix de game design, pas une conséquence technique.
