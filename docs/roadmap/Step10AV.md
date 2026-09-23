# STEP 10AV — TERRAIN AS SPATIAL INPUT

## CONTEXTE

HEAD attendu :

```text
2a408a6 — Step 10AU: terrain & obstacles design contract (design only, not implemented)
```

Step 10AU est **CLOSED**.

10AU a démontré qu'un système de terrain minimal est justifié, mais uniquement comme **contrainte spatiale d'entrée**.

Le phénomène nouveau et réellement causal est :

### Cell-role competition at a chokepoint

Une cellule stratégique peut être utilisée :

* comme route → elle connecte deux régions ;
* comme bâtiment → elle sépare les réseaux ;
* comme terrain bloqué → elle interdit les deux usages.

Ce phénomène n'est pas reproductible avec les seules ressources actuelles : les états séparés restent identiques même avec Material 100 ou 1000. Le problème est donc la **faisabilité spatiale**, pas l'affordability.

Le contrat 10AU est volontairement minimal.

---

# OBJECTIF

Implémenter **Terrain as Spatial Input**.

Terrain doit uniquement :

1. exister dans `WorldConfig`,
2. pouvoir être fourni par les scénarios,
3. empêcher la construction sur une cellule bloquée,
4. être rendu visuellement,
5. être sérialisé/haché de manière déterministe,
6. être couvert par les tests et le navigateur.

Terrain ne doit créer **aucune nouvelle mécanique économique**.

---

# CONTRAT GELÉ

## Deux états seulement

```text
buildable
blocked
```

Aucun troisième type.

Pas de terrain fertile, eau naturelle, montagne, forêt, minerai, etc.

---

# 1. AUDIT ARCHITECTURAL AVANT MODIFICATION

Inspecter d'abord les points suivants :

* `WorldConfig`
* création du monde
* `canonicalJson`
* hash d'état
* save/load
* validation bâtiment
* validation route
* `getPlacementAffordability`
* scénario
* renderer du board
* E2E existants

Identifier les plus petits points d'insertion.

**Ne pas refactorer l'architecture existante.**

Après inspection, implémenter directement.

---

# 2. WORLDCONFIG

Ajouter au monde :

```ts
blockedCells?: string[]
```

Format canonique :

```text
"x,y"
```

Exemple :

```text
["3,2", "3,3", "3,4"]
```

Règles :

* absence = aucun obstacle ;
* tableau vide = aucun obstacle ;
* coordonnées entières uniquement ;
* coordonnées dans les limites du monde ;
* représentation canonique `"x,y"` ;
* ordre canonique indépendant de l'ordre d'insertion ;
* doublons normalisés ;
* aucune dépendance à l'ordre d'un `Set`/`Map`.

Créer le plus petit helper approprié, par exemple :

```ts
isTerrainBlocked(world, x, y)
```

Ne pas créer de `TerrainSystem`.

---

# 3. PERSISTENCE

Le choix recommandé par 10AU est :

## Omettre `blockedCells` lorsqu'il est vide

Donc :

### Monde sans terrain

Le save conserve le comportement actuel.

`SAVE_VERSION` reste :

```text
7
```

### Monde avec terrain

Le save contient :

```json
"blockedCells": ["1,2", "2,2", "3,2"]
```

dans `config.world`.

Les anciens saves sans `blockedCells` doivent charger comme :

```text
blockedCells = []
```

Ne pas ajouter de migration.

Ne pas passer à SAVE_VERSION 8.

Si l'architecture actuelle rend réellement cette stratégie impossible, **arrêter cette partie et signaler précisément pourquoi**, plutôt que d'inventer un nouveau format.

---

# 4. CANONICAL HASH

`blockedCells` doit faire partie de la représentation canonique de la configuration du monde.

Ces deux entrées :

```ts
["3,4", "1,2"]
```

et :

```ts
["1,2", "3,4"]
```

doivent produire exactement le même état canonique et le même hash.

En revanche :

```text
aucun obstacle
```

et :

```text
un obstacle
```

doivent représenter deux configurations différentes.

Tester explicitement cette propriété.

---

# 5. BUILDING PLACEMENT

Modifier **la validation authoritative existante**, pas créer une deuxième validation.

Si la cellule ciblée est bloquée :

```text
terrainBlocked
```

doit être retourné comme raison structurée.

Le comportement doit être :

* aucun bâtiment créé ;
* aucun coût payé ;
* aucun Material consommé ;
* aucune construction lancée ;
* aucun état partiellement modifié.

La query de placement doit exposer cette raison au même endroit que les autres raisons existantes.

Ne pas contourner le contrat depuis l'UI.

---

# 6. ROAD PLACEMENT

Même règle pour les routes.

Une cellule bloquée doit retourner :

```text
terrainBlocked
```

Une commande de route multi-cellules contenant une cellule bloquée doit être **atomique** :

```text
toute la commande est refusée
```

et non :

```text
placer les cellules valides puis arrêter sur la cellule bloquée
```

Donc :

* aucune route partielle ;
* aucun Material dépensé ;
* aucune construction partielle.

Conserver toutes les règles existantes :

* route 1 cellule ;
* drag horizontal/vertical ;
* coût 5 Material/cellule ;
* construction 2 ticks ;
* lifecycle existant ;
* pas de stacking.

Terrain est seulement une condition de refus supplémentaire.

---

# 7. UI

Utiliser les mécanismes de feedback existants.

Pour une cellule bloquée :

* hover bâtiment → refus explicite ;
* hover route → refus explicite ;
* tentative de placement → refus sans mutation.

Le joueur doit comprendre :

> cette cellule n'est pas constructible.

Ne pas afficher `terrainBlocked` directement comme texte utilisateur si l'application possède déjà un système de messages.

Ne pas ajouter un nouveau HUD.

---

# 8. RENDERING

Rendre les cellules bloquées visibles.

Contraintes :

* **un seul `InstancedMesh`** pour les cellules bloquées ;
* ordre d'instance déterministe ;
* utiliser les matériaux/palette existants ;
* top-down strict ;
* rendu lisible mais discret.

La cellule doit être clairement différente de :

* cellule vide ;
* route ;
* bâtiment ;
* bâtiment en construction.

Ne pas ajouter :

* biomes ;
* textures complexes ;
* relief ;
* particules ;
* végétation ;
* éclairage spécial ;
* système de terrain procédural.

Le rendu doit simplement communiquer :

> **non constructible**

---

# 9. SCENARIO DEFINITION

Ajouter :

```ts
blockedCells?: string[]
```

à la définition déclarative des scénarios.

Le chargement d'un scénario doit produire :

```text
ScenarioDefinition.blockedCells
        ↓
createScenarioState
        ↓
config.world.blockedCells
```

Aucune logique spécifique au scénario.

Aucun effet économique.

Ne pas persister le nom du scénario ou une nouvelle métadonnée de terrain dans le save.

---

# 10. FIXTURE VARIANT C

Implémenter **un seul fixture de test/E2E** dérivé du Variant C de 10AU.

Le fixture doit contenir :

* un chokepoint ;
* une région ouest ;
* une région est ;
* une cellule connectrice ;
* un emplacement alternatif de Well bloqué.

Il doit permettre de démontrer le phénomène suivant.

## Cas A — connecteur = route

Résultat attendu :

```text
1 réseau
2 Residences servies
mobilité inter-régions possible
```

## Cas B — connecteur = bâtiment

Résultat attendu :

```text
2 réseaux
1 Residence non servie
cross-region workplace = notConnected
```

## Cas C — emplacement alternatif du Well = terrain bloqué

Le joueur ne peut pas résoudre la situation simplement en plaçant le Well à cet emplacement.

Il doit donc composer avec la géométrie existante.

**Utiliser les coordonnées/fixture mesurés dans 10AU lorsque disponibles.**

Ne pas inventer une nouvelle mécanique pour rendre le fixture intéressant.

---

# 11. TERRAIN = INPUT ONLY

Ajouter une preuve automatisée que terrain ne modifie pas directement :

* Food ;
* Water ;
* Material ;
* workforce ;
* jobs ;
* production ;
* consommation ;
* construction duration ;
* road cost.

Le seul effet direct autorisé est :

```text
placement impossible sur cellule bloquée
```

Une cellule bloquée qui n'est jamais ciblée par une commande ne doit pas produire de comportement économique.

---

# 12. TEST MATRIX

Ajouter les tests nécessaires.

## Terrain

* cellule libre → constructible ;
* cellule bloquée → non constructible ;
* coordonnée hors limites rejetée ;
* coordonnée malformée rejetée ;
* doublons normalisés ;
* ordre d'insertion sans effet.

## Building

* bâtiment bloqué refusé ;
* bâtiment libre accepté ;
* aucun coût sur refus ;
* aucun état partiel.

## Road

* route bloquée refusée ;
* drag traversant une cellule bloquée refusé ;
* aucun segment partiel ;
* aucun coût sur refus.

## Persistence

* ancien save sans `blockedCells` → terrain vide ;
* terrain vide → champ omis ;
* terrain non vide → champ présent ;
* save/load conserve exactement le terrain ;
* comportement identique après reload.

## Hash

* même terrain, ordre différent → même hash ;
* terrain différent → hash différent ;
* même scénario rechargé → hash identique.

## Scenario

* `blockedCells` transféré correctement ;
* scénarios existants inchangés ;
* fixture Variant C déterministe.

## Regression

Tous les tests existants doivent continuer à passer.

---

# 13. BROWSER VALIDATION

Faire une vraie validation navigateur.

Vérifier :

### Desktop

* terrain visible ;
* cellule bloquée lisible ;
* placement bâtiment refusé ;
* placement route refusé ;
* feedback cohérent ;
* aucune mutation après refus.

### Chokepoint

* route sur connecteur → réseaux correctement connectés ;
* bâtiment sur connecteur → réseaux séparés ;
* comportement Water/workforce cohérent ;
* emplacement Well bloqué réellement inutilisable.

### Responsive

Tester au minimum les tailles déjà utilisées par le projet :

```text
1280×800
420×740
360×640
```

Vérifier :

* aucun débordement horizontal ;
* board toujours utilisable ;
* overlay/panel ne masque pas les cellules importantes.

Puis exécuter le workflow GPU/headed existant.

---

# 14. ARCHITECTURE À PRÉSERVER

Conserver :

* simulation déterministe ;
* queries pures ;
* scénarios déclaratifs ;
* objectifs data-driven ;
* absence d'état dérivé persistant ;
* insertion-order invariance ;
* séparation domaine/application/rendu.

Ne pas introduire :

```text
TerrainSystem
TerrainManager
TerrainEconomy
TerrainProduction
TerrainService
BiomeSystem
```

sauf si une abstraction existante impose naturellement un nom équivalent.

Le terrain doit rester une donnée de configuration.

---

# 15. NON-GOALS ABSOLUS

Cette étape ne doit PAS implémenter :

* fertilité ;
* ressources naturelles ;
* minerais ;
* eau naturelle ;
* pollution ;
* densité ;
* adjacency bonus ;
* land value ;
* zoning ;
* elevation ;
* biomes ;
* production modifiers ;
* worker bonuses ;
* destruction ;
* excavation ;
* terraforming ;
* terrain cost multipliers ;
* nouveaux bâtiments ;
* nouveaux jobs ;
* nouveau resource type ;
* nouvelle mécanique économique ;
* Town ;
* Metropolis ;
* Autonome.

Ne modifier aucune constante économique existante.

---

# 16. VALIDATION FINALE

Avant de considérer Step 10AV terminé :

```text
pnpm typecheck
pnpm lint
pnpm build
```

Puis :

* Vitest complet ;
* déterminisme ;
* insertion-order ;
* save/load ;
* browser headless ;
* browser headed ;
* GPU.

Le résultat attendu doit être une extension minimale du moteur, pas une refonte.

---

# FINAL REPORT

Retourner exactement une synthèse structurée contenant :

```text
STEP 10AV — FINAL REPORT

Starting commit:
Final commit:

WORLD
- blockedCells:
- canonical representation:
- normalization:
- validation:

PLACEMENT
- building:
- road:
- atomicity:
- terrainBlocked:

SCENARIOS
- ScenarioDefinition:
- Variant C fixture:
- user-facing scenario added:

RENDERING
- InstancedMesh:
- deterministic order:
- visual distinction:

PERSISTENCE
- SAVE_VERSION:
- empty terrain:
- non-empty terrain:
- backward compatibility:

HASH
- canonical:
- insertion-order:
- terrain distinction:

INPUT-ONLY
- Food:
- Water:
- Material:
- Workforce:
- Production:
- Construction:

TESTS
- total:
- terrain:
- placement:
- roads:
- persistence:
- determinism:
- scenarios:

BROWSER
- desktop:
- responsive:
- headed:
- GPU:

ARCHITECTURE
- domain:
- application:
- rendering:
- persistence:

TOWN
- implemented: NO

VALIDATION
- typecheck:
- lint:
- build:
- Vitest:
- determinism:
- insertion-order:
- save/load:
- browser:
- GPU:

NEXT DEPENDENCY:
```

## CRITICAL SUCCESS CRITERION

Step 10AV est réussi uniquement si :

> **Le terrain bloque réellement la construction et rend possible le phénomène de chokepoint identifié en 10AU, tout en restant une donnée spatiale passive qui ne modifie aucune économie ou règle de simulation par elle-même.**

Si une décision d'architecture non prévue devient nécessaire, ne l'invente pas silencieusement : documente-la dans le rapport avec son impact sur SAVE_VERSION, le hash et la compatibilité.


---


# Documentation (as-built) — Step 10AV

Starting commit: `2a408a6` (Step 10AU).
Final commit: this commit.

**Terrain is IMPLEMENTED — as spatial input only.** The engine refuses a
building or a road on a blocked cell and nothing else changed: no economic
constant, no production/consumption rule, no objective kind, no new state key
outside `config.world`, and SAVE_VERSION stays **7**.

## 1. What shipped

```text
STATE            src/domain/world/grid.ts
                 WorldConfig.blockedCells?: readonly string[]
                 parseBlockedCell / normalizeBlockedCells / isTerrainBlocked /
                 listBlockedCells — no TerrainSystem, no TerrainManager
                 src/domain/simulation/state.ts
                 normalizeWorldConfig + normalizeConfig (dedupe + numeric (x,y)
                 sort; an EMPTY list is dropped), bounds check in assertValidConfig

PLACEMENT        src/domain/simulation/phases.ts
                 validatePlacement      -> new reason 'terrainBlocked'
                 validateRoadsPlacement -> new reason 'terrainBlocked'
                 both check bounds -> terrain -> occupancy -> affordability, so
                 a blocked cell is never reported as a cost problem
                 src/application/queries/placement.ts: UNCHANGED (it already
                 surfaces whatever the authoritative validator returns)

UI               src/app/main.ts
                 hover:  "cell x,y — blocked by terrain"
                 click:  "Cannot build <X> — blocked by terrain"
                 road:   "road N cells — blocked by terrain" (whole command)
                 no new HUD, no new control, same status line

RENDERING        src/application/queries/renderSnapshot.ts
                 RenderSnapshot.blockedCells (canonical order, empty when none)
                 src/renderer/three/novaRenderer.ts: ONE InstancedMesh, one
                 instance per blocked cell in snapshot order, rebuilt only when
                 the set changes, disposed with the renderer

SCENARIO         src/application/scenarios.ts
                 ScenarioDefinition.blockedCells?: readonly string[]
                 createScenarioState -> config.world.blockedCells (through the
                 shared constructor, so normalization and bounds still apply)

PERSISTENCE      src/application/persistence/save.ts
                 omit-when-empty: the field exists only when the world owns
                 blocked cells, so every pre-existing save and every terrain-free
                 world keeps its EXACT canonical bytes and hash; an old save
                 loads with no terrain. An explicit empty list in a save is
                 accepted as "no terrain"; a non-canonical (unsorted, duplicated,
                 out-of-bounds, malformed) list is REJECTED.
```

## 2. Fixture (variant C) and the catalogue

`TERRAIN_CHOKEPOINT_FIXTURE` (`id: terrain-chokepoint`) is built on the
coordinates 10AU measured — Residences (1,0)/(5,0), Farm (1,2), Well (5,2),
vacant Farm (4,2), roads (1,1)(3,1)(4,1)(5,1), connector (2,1) — with the ridge
extended to the whole column x = 2 except the connector (10AU emulated only rows
1..5 because its harness, not the engine, blocked cells; a real scenario needs a
genuine separation) plus variant C: **(0,1) is blocked**, the only west cell that
could ever host a Road-accessible Well. Material 30 is exactly one Residence (25)
plus the connector road (5).

**Architecture decision (not in the prompt, documented as required).** The
fixture is NOT added to `SCENARIOS`: the curated catalogue (7 entries) is pinned
by the content/readability audits and by `tests/scenarios.test.ts`, and a step
fixture is evidence, not product content. The browser reaches it through an
explicit `?scenario=<fixture id>` deep link that resolves only
`SCENARIO_FIXTURES`; the scenario select still lists the 7 catalogue scenarios
(asserted by the E2E). Impact on SAVE_VERSION, hashing and compatibility: none —
a fixture is ordinary scenario data assembled by `createScenarioState`.

## 3. Measured phenomena (real engine, fixture)

| connector (2,1) | networks | served Residences | served colonists | west colonist → east Farm |
| --- | --- | --- | --- | --- |
| road (case A) | **1** | **2** | **2** | eligible |
| building (case B) | **2** | **1** | **1** | `notConnected` |

Variant C: a Well on (0,1) is refused `terrainBlocked` WITH 3000 Material, and
(0,1) is the only free neighbour of the west road — the connector is the only
route that exists. Stock cannot reproduce the severing (30 vs 3000 Material leave
the same 2 networks / 1 served Residence / same employment).

## 4. Validation

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        77 files / 1443 tests PASS  (76 / 1404 before: +1 file, +39 tests)
determinism      PASS (canonical list in canonicalJson; no Set/Map iteration decides an outcome)
insertion-order  PASS (normalized at construction: shuffled authoring -> same hash)
save/load        PASS (omit-when-empty; v4-v6 migration chain untouched)
browser          16 / 16 suites ALL PASS headless (15 existing + e2e/terrainRun.mjs)
                 e2e/terrainRun.mjs ALSO PASS headed
GPU              GPU E2E ALL PASS (headed, ANGLE/NVIDIA RTX 3070, not software)
```

One earlier-step measurement was corrected rather than dropped: the Step 10AU
audit asserted "an unknown world field is rejected" using `blockedCells` as the
probe field. Terrain now exists, so the probe field moved to `terrain` — the
measured property (unknown world fields are refused) is unchanged.

## 5. Non-goals (frozen, unchanged)

```text
terrain productivity · fertile soil · natural resources · minerals · natural water ·
pollution · density · adjacency bonus · land value · zoning · elevation · biomes ·
production modifiers · worker bonuses · destruction · excavation · terraforming ·
terrain cost multipliers · new buildings · new jobs · new resource types · new
economic mechanics · Town · Metropolis · Autonome
```

No economic constant moved: Food 2/Farm, Water 2/Well, Material 2/worker,
upkeep 1, storage 25, building 25 (Workshop 25+1 Water), road 5, initial
100/100/0, 7 catalogue scenarios, SAVE_VERSION 7. Terrain is **space as
constraint**, never a second economy.

---

## 6. FINAL REPORT

```text
STEP 10AV — FINAL REPORT

Starting commit: 2a408a6 (Step 10AU)
Final commit:    this commit

WORLD
- blockedCells: optional `readonly string[]` in WorldConfig; absent == no terrain
- canonical representation: "x,y" keys, deduplicated, sorted numerically by (x, y)
- normalization: normalizeBlockedCells + normalizeWorldConfig at construction
  (every state is canonical by construction; an empty list is dropped)
- validation: malformed key throws; out-of-bounds blocked cell throws; the save
  validator rejects a non-canonical stored list

PLACEMENT
- building: validatePlacement -> { valid: false, reason: 'terrainBlocked' }
- road: validateRoadsPlacement -> { valid: false, reason: 'terrainBlocked' }
- atomicity: a multi-cell road command with one blocked cell is refused whole —
  no partial road, no Material, no counter move, no tick (same state reference)
- terrainBlocked: checked after bounds, before occupancy and affordability

SCENARIOS
- ScenarioDefinition: `blockedCells?: readonly string[]` -> createScenarioState
  -> config.world.blockedCells (shared constructor, no scenario-only rule)
- Variant C fixture: TERRAIN_CHOKEPOINT_FIXTURE ('terrain-chokepoint'): the ridge
  x = 2 minus the connector (2,1), plus the west Well site (0,1) blocked
- user-facing scenario added: NO — the curated catalogue stays at 7; the fixture
  lives in SCENARIO_FIXTURES and the browser E2E loads it through an explicit
  `?scenario=terrain-chokepoint` deep link (documented architecture addition)

RENDERING
- InstancedMesh: ONE, one instance per blocked cell, flat quad, existing palette
- deterministic order: snapshot order == canonical list order (no Map/Set)
- visual distinction: dark matte rock (0x5a4436) at y=0.02, a different value
  from the ground, the construction gray, the road slate and every building colour

PERSISTENCE
- SAVE_VERSION: 7 (UNCHANGED, no migration added)
- empty terrain: the field is omitted, so terrain-free saves and hashes are
  byte-identical to the pre-step world
- non-empty terrain: "blockedCells":["x,y",...] inside config.world
- backward compatibility: an old save without the field loads as terrain-free; an
  explicit empty list is accepted as no terrain; a non-canonical list is rejected

HASH
- canonical: blockedCells participates through canonicalJson(config.world)
- insertion-order: ["3,4","1,2"] and ["1,2","3,4"] normalize to one list and one
  hash; authoring the fixture in reverse order produces the same state
- terrain distinction: no terrain != one obstacle (different canonical JSON and
  different hash)

INPUT-ONLY
- Food: unchanged (2/Farm, 1/colonist, all-or-nothing feeding)
- Water: unchanged (2/Well, coverage from roads, admission gate untouched)
- Material: unchanged (2/worker, storage 25, upkeep 1, building costs unchanged)
- Workforce: unchanged (jobs, mobility and the 09M preference read roads only)
- Production: unchanged — two states differing only by a blocked set that no
  command targets stay identical tick for tick (measured, 6 ticks)
- Construction: unchanged (2 ticks, 1 with a crew; roads 2 ticks, 5 Material/cell)

TESTS
- total: 77 files / 1443 tests PASS (+1 file, +39 tests)
- terrain: format, malformed keys, out-of-bounds, dedupe, numeric order,
  insertion order, empty == absent, canonical hash, render projection
- placement: blocked vs free cell, zero mutation on refusal, reason order
  (bounds -> terrain -> occupancy -> affordability), affordability query
- roads: single cell, drag crossing the ridge (atomic), reason order, cost
- persistence: omit-when-empty, field present with terrain, old save, exact
  round trip, empty list accepted, non-canonical list rejected
- determinism: fixture assembled twice and with shuffled authoring -> same hash
- scenarios: catalogue unchanged and terrain-free, fixture wired and validated

BROWSER
- desktop: terrain visible, 12 rendered instances, blocked-cell hover/click
  refused with zero mutation, west Well site refused
- responsive: 1280x800 / 420x740 / 360x640 — no horizontal overflow, board
  usable, terrain still drawn after every resize
- headed: e2e/terrainRun.mjs PASS headed and headless
- GPU: GPU E2E ALL PASS (headed, real ANGLE/NVIDIA, not software)

ARCHITECTURE
- domain: one config field + four pure helpers + two validator reasons
- application: renderSnapshot projection; placement query unchanged
- rendering: one InstancedMesh in the existing renderer, disposed with the scene
- persistence: the existing validator, one field, one omission rule

TOWN
- implemented: NO

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 77 / 1443 PASS
- determinism: PASS
- insertion-order: PASS
- save/load: PASS
- browser: 16 / 16 suites ALL PASS (headless), terrain suite also headed
- GPU: ALL PASS (headed)

NEXT DEPENDENCY:
- Terrain now exists as CONTENT input; the next justified step is content, not
  mechanics: a curated scenario built on the chokepoint decision (the fixture is
  not product content), plus the standing Town/Metropolis definition question.
  No further terrain capability is justified by 10AV's evidence.
```
