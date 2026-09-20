# NOVA — Step 09N — Transport / Employment Boundary Audit

## Mission

Réaliser un audit complet de la frontière actuelle entre :

```text
spatial layout
  → roads
  → network connectivity
  → building access
  → residential/work mobility
  → employment eligibility
  → spatial employment preference
  → production
  → upkeep
```

L'objectif est de déterminer si NOVA doit :

1. approfondir le système de transport ;
2. revenir à la roadmap principale ;
3. modifier une règle existante ;
4. conserver le transport comme infrastructure minimale jusqu'à l'apparition d'un besoin réel.

**Cette étape est un audit de conception et de gameplay.**

Ne pas implémenter de nouvelle règle de simulation.

Ne pas modifier `src/`.

Ne pas modifier les coefficients économiques.

Ne pas créer de nouveau système de transport.

---

# 1. Workflow obligatoire

Suivre exactement :

```text
AUDIT
→ OBSERVATIONS
→ SCÉNARIOS
→ MESURES
→ DESIGN DECISION
→ VERIFICATION
```

Avant toute modification, inspecter :

* `docs/roadmap/Step09A.md` à `Step09M.md` ;
* `src/domain/road/`;
* `src/domain/mobility/`;
* `src/domain/jobs/`;
* `src/domain/simulation/`;
* `src/application/queries/`;
* `src/app/main.ts`;
* `e2e/roadRun.mjs`;
* les tests 09D à 09M ;
* le dernier état de la roadmap principale.

Confirmer d'abord :

* le commit courant ;
* l'état du working tree ;
* le nombre actuel de tests ;
* les commandes disponibles dans `package.json`.

Ne pas supposer que les résultats de 09M sont corrects sans les relire et les reproduire.

---

# 2. Résumé des règles actuellement en vigueur

Reconstituer précisément les règles réelles, avec références de fichiers et tests.

Documenter séparément :

## 2.1 Routes

* occupation d'une cellule ;
* exclusivité bâtiment/route ;
* coût ;
* durée de construction ;
* état opérationnel ;
* connectivité orthogonale ;
* réseaux distincts ;
* comportement des routes sous construction.

## 2.2 Accès

* accès d'un bâtiment à une route ;
* conditions d'accès ;
* différence entre route adjacente et réseau connecté ;
* conditions d'éligibilité d'un Workshop.

## 2.3 Mobilité

* définition actuelle de la connexion résidence/Workshop ;
* traitement des résidences touchant plusieurs réseaux ;
* traitement des Workshops touchant plusieurs réseaux ;
* rôle de la distance routière introduite en 09M ;
* règles de tie-break ;
* recalcul ;
* déterminisme.

## 2.4 Travail

* ordre d'affectation des colonists ;
* capacité des Workshops ;
* conservation des affectations ;
* comportement en cas de rupture ;
* comportement lorsque plusieurs Workshops sont accessibles ;
* effet sur la production ;
* effet sur l'upkeep.

## 2.5 Économie

* coûts des bâtiments ;
* coût des routes ;
* production de Material ;
* upkeep ;
* stockage ;
* conséquence d'un Workshop non desservi ;
* conséquence d'un colonist sans emploi.

Ne pas modifier ces règles pendant l'audit.

---

# 3. Objectif de l'audit

Répondre avec des scénarios exécutables à la question :

> Le transport actuel crée-t-il des décisions spatiales suffisamment riches pour justifier une simulation plus profonde ?

Ne pas répondre uniquement avec une opinion.

Chaque conclusion doit être liée à :

* un état initial ;
* une séquence de commandes ;
* un résultat observé ;
* une comparaison ;
* une classification.

---

# 4. Scénarios obligatoires

Créer des tests d'audit dédiés, sans modifier les règles de production.

Les tests doivent mesurer les faits suivants :

```text
employment
production
upkeep
material stock
road count
road cost
road network count
road distance
workplace assignment
mobility eligibility
```

Les métriques d'audit doivent rester dérivées et ne doivent pas être ajoutées au state persistant.

## A — Distance utile

Créer deux Workshops :

* tous deux opérationnels ;
* tous deux accessibles ;
* l'un proche ;
* l'autre plus éloigné ;
* IDs volontairement inversés.

Vérifier que 09M choisit le plus proche.

Puis comparer :

* production ;
* upkeep ;
* stock ;
* emploi.

Objectif : confirmer que la distance change réellement le résultat économique.

## B — Distance sans capacité

Créer :

* une résidence ;
* deux Workshops accessibles ;
* un seul colonist ;
* deux capacités disponibles.

Vérifier que la distance détermine l'emploi.

Puis ajouter un second colonist.

Vérifier si la distance crée encore une décision ou si la capacité masque l'effet.

## C — Distance avec capacité saturée

Créer :

* deux colonists ;
* deux Workshops ;
* un Workshop proche ;
* un Workshop éloigné ;
* ordre d'ID inversé.

Mesurer :

* qui va où ;
* si les deux sont employés ;
* si la distance change le résultat économique ;
* si la capacité provoque une différence observable.

## D — Rupture de réseau

Construire une connexion puis supprimer ou désactiver une route intermédiaire.

Mesurer :

* emploi avant/après ;
* production avant/après ;
* upkeep avant/après ;
* réaffectation ;
* état de mobilité.

Vérifier qu'aucune donnée dérivée périmée ne subsiste.

## E — Raccordement de réseau

Construire deux réseaux séparés puis les relier.

Mesurer :

* nombre de réseaux ;
* Workshops éligibles avant/après ;
* emploi avant/après ;
* production avant/après ;
* upkeep avant/après.

Déterminer si le raccordement crée une vraie pression ou seulement un changement binaire d'accès.

## F — Géométrie équivalente

Comparer à coût routier égal :

* ligne droite ;
* L ;
* branche ;
* boucle ;
* détour ;
* réseau avec route redondante.

Mesurer toutes les métriques pertinentes.

Identifier les géométries qui restent économiquement équivalentes.

## G — Résidence multi-réseaux

Créer une résidence adjacente à plusieurs réseaux.

Comparer :

* Workshop sur réseau A ;
* Workshop sur réseau B ;
* distances différentes ;
* distances égales ;
* IDs inversés.

Vérifier si la résidence peut choisir correctement entre les réseaux.

## H — Workshop multi-contacts

Créer un Workshop adjacent à plusieurs routes.

Vérifier que la distance choisie est bien la distance minimale entre tous les contacts valides.

Tester :

* contact court ;
* contact long ;
* réseau secondaire ;
* route sous construction.

## I — Routes sous construction

Comparer :

* réseau entièrement opérationnel ;
* même réseau avec un segment sous construction.

Vérifier que le segment sous construction :

* ne connecte rien ;
* ne rend pas le Workshop éligible ;
* ne contribue pas à la distance ;
* ne crée pas d'affectation temporaire incorrecte.

## J — Changement de préférence

Créer deux Workshops accessibles.

1. A est initialement le plus proche ;
2. affecter le colonist ;
3. modifier la géométrie du réseau ;
4. rendre B plus proche ;
5. exécuter `assignJobs` ;
6. vérifier le comportement.

Déterminer si l'affectation change réellement.

Documenter si le système privilégie :

* la stabilité de l'affectation ;
* l'optimisation spatiale ;
* l'ordre de recalcul.

## K — Coût contre distance

Comparer plusieurs configurations :

* chemin court et coûteux ;
* chemin long et moins coûteux ;
* chemin partagé ;
* chemins indépendants.

Ne pas introduire de nouvelle formule.

Mesurer uniquement les coûts déjà existants.

Déterminer si le joueur doit arbitrer entre :

```text
construction cost
vs
employment distance
vs
network connectivity
```

## L — Plusieurs colonists et plusieurs Workshops

Créer une matrice :

* 1 résidence / 2 Workshops ;
* 2 résidences / 2 Workshops ;
* 2 résidences / 3 Workshops ;
* 3 résidences / 2 Workshops.

Mesurer :

* affectations ;
* colonists sans emploi ;
* Workshops vacants ;
* production ;
* upkeep ;
* distances.

Vérifier si l'ordre de traitement des colonists masque la préférence spatiale.

## M — Invariance topologique

Comparer des réseaux de même coût et même distance :

* ordre d'insertion différent ;
* IDs de routes différents ;
* IDs de bâtiments différents ;
* ordre des commandes différent.

Vérifier que les résultats déterministes restent identiques lorsque les identifiants sont utilisés uniquement comme tie-break prévu.

## N — Rejouabilité

Rejouer les mêmes commandes plusieurs fois.

Comparer :

* état final ;
* hash ;
* affectations ;
* production ;
* upkeep ;
* réseau ;
* distances dérivées.

---

# 5. Classification obligatoire

Pour chaque scénario, classer le résultat :

```text
A — Strong gameplay pressure
B — Useful but limited pressure
C — Economically equivalent
D — Informational only
E — Missing future pressure
```

Ne pas classer globalement avant d'avoir présenté les observations.

La classification doit distinguer :

* pression sur l'éligibilité ;
* pression sur le choix d'emploi ;
* pression sur le coût ;
* pression sur la production ;
* pression sur l'upkeep ;
* pression sur la forme du réseau ;
* pression sur la longueur du réseau.

---

# 6. Questions de design à trancher

Répondre explicitement :

1. La distance routière crée-t-elle une décision différente de la simple accessibilité ?
2. La distance influence-t-elle la production réelle ou seulement une donnée de debug ?
3. La longueur d'une route a-t-elle une conséquence autre que son coût de construction ?
4. La forme du réseau a-t-elle une conséquence à coût et distance égaux ?
5. Les routes partagées créent-elles un avantage économique observable ?
6. La présence de plusieurs résidences change-t-elle la décision spatiale ?
7. La capacité des Workshops masque-t-elle la préférence de distance ?
8. L'ordre des colonists crée-t-il une pression artificielle ?
9. Le système a-t-il besoin d'un temps de trajet ?
10. Le système a-t-il besoin d'une capacité de transport ?
11. Le système a-t-il besoin de congestion ?
12. Le système a-t-il besoin de transport collectif ?
13. Le système a-t-il besoin d'un entretien des routes ?
14. Le système a-t-il besoin d'une préférence autre que la distance ?
15. Quelle est la plus petite règle future qui créerait une nouvelle décision réelle ?

Pour les questions 9 à 14, ne pas implémenter la réponse. Décrire seulement les preuves ou l'absence de preuves.

---

# 7. Comparaison avec la roadmap principale

Relire la roadmap complète.

Identifier les dépendances encore manquantes pour :

* besoins ;
* production ;
* travail ;
* argent ;
* transport ;
* croissance ;
* spécialisation.

Répondre :

1. Quelle mécanique principale manque encore avant de poursuivre le transport ?
2. Quelle mécanique bénéficierait réellement des routes déjà présentes ?
3. Le transport doit-il rester un prérequis minimal ?
4. Quelle fonctionnalité produirait davantage de causalité avec moins de complexité ?
5. Le système actuel est-il prêt à accueillir une nouvelle ressource ou un nouveau besoin ?

Ne pas proposer une fonctionnalité uniquement parce qu'elle est techniquement facile.

---

# 8. Audit de complexité

Mesurer la complexité ajoutée par 09M :

* fichiers modifiés ;
* lignes ajoutées ;
* nouvelles fonctions ;
* nouvelles règles ;
* nouvelles dépendances ;
* nouvelles queries ;
* nouvelles données persistées ;
* impact sur les phases ;
* coût algorithmique.

Comparer cette complexité avec la quantité de gameplay réellement produite.

Conclure si le ratio est :

```text
low complexity / meaningful pressure
medium complexity / limited pressure
high complexity / weak pressure
```

Cette conclusion doit être descriptive, pas seulement subjective.

---

# 9. Non-régression

L'audit doit confirmer :

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis exécuter les E2E existantes :

* road ;
* transport ;
* production ;
* resource ;
* food ;
* temporal.

Vérifier :

* zéro `console.error` ;
* zéro `pageerror` ;
* aucune régression de l'UI ;
* aucune régression de construction ;
* aucune régression de production ;
* aucune régression de sauvegarde.

Si un test échoue, diagnostiquer la cause.

Ne pas modifier le code pour masquer l'échec.

---

# 10. Persistence et déterminisme

Confirmer :

* `SAVE_VERSION` inchangé ;
* distance non persistée ;
* réseaux non persistés ;
* métriques d'audit non persistées ;
* hash stable ;
* save/load stable ;
* replay stable ;
* ordre d'insertion correctement traité.

Vérifier qu'aucun test d'audit ne modifie le state canonique.

---

# 11. Documentation

Créer :

```text
docs/roadmap/Step09N.md
```

Structure obligatoire :

```text
# Step 09N — Transport / Employment Boundary Audit

## Status
## Scope
## Current Rules
## Audit Method
## Scenarios
## Measurements
## Observations
## Gameplay Classification
## Complexity Audit
## Roadmap Comparison
## Design Decision
## Recommended Next Step
## Known Limitations
## Deferred
## Verification
## As-Built
```

Le document doit contenir :

* les règles observées ;
* les scénarios ;
* les résultats ;
* les mesures ;
* les classifications ;
* les décisions ;
* les limites ;
* les commandes exécutées.

Ne pas remplacer un document existant.

Si le fichier existe, l'inspecter puis le compléter.

---

# 12. Scope strict

Cette étape ne doit pas modifier :

* `src/domain/**`
* `src/application/**`
* `src/app/**`
* les règles de simulation ;
* les coefficients économiques ;
* le modèle de données ;
* `SAVE_VERSION`.

Les seules modifications autorisées sont :

* `docs/roadmap/Step09N.md` ;
* tests d'audit dédiés ;
* éventuellement un script d'audit isolé ;
* éventuellement une extension minimale de l'E2E si nécessaire pour mesurer un résultat déjà observable.

Les tests d'audit ne doivent pas affaiblir les tests existants.

---

# 13. Rapport final obligatoire

Le rapport final doit inclure :

```text
STATUS
COMMIT
PARENT
WORKING TREE
FILES CHANGED
TEST COUNT BEFORE
TEST COUNT AFTER
UNIT TESTS
LINT
TYPECHECK
BUILD
E2E
GPU STATUS
PERSISTENCE STATUS
HASH STATUS
DETERMINISM STATUS
```

Puis répondre clairement :

```text
1. Ce que 09M ajoute réellement.
2. Ce que 09M ne crée pas.
3. Les scénarios qui produisent une vraie pression.
4. Les scénarios économiquement équivalents.
5. La complexité introduite.
6. La prochaine dépendance logique.
7. Ce qui doit rester différé.
```

Le rapport doit séparer :

```text
DISCOVERED
DERIVED
INTENTIONAL
DEFERRED
```

Ne pas déclarer 09N terminé si :

* les scénarios ne sont pas exécutés ;
* les résultats ne sont pas comparés ;
* le document ne contient pas les observations ;
* le commit contient des modifications de `src/` ;
* des tests existants ont été affaiblis ;
* la conclusion est basée uniquement sur une intuition.

---

# 14. Commit

Avant commit :

```bash
git status --short
git diff --stat
git diff
```

Vérifier spécialement :

* aucune modification accidentelle de 09M ;
* aucun texte hors sujet ;
* aucun fichier généré parasite ;
* aucun secret ;
* aucun changement de `src/`.

Commit attendu :

```text
Step 09N: transport employment boundary audit
```


---

# Documentation (as-built)

# Step 09N — Transport / Employment Boundary Audit

## Status

COMPLETE — audit only. No `src/` change, no rule change, no coefficient change, no `SAVE_VERSION` change. Commit `Step 09N: transport employment boundary audit`, parent `56e7dc6` (Step 09M).

## Scope

- NEW `tests/transportEmploymentBoundaryAudit.test.ts` — 32 audit tests covering mandatory scenarios A–N.
- APPENDED this documentation block to `docs/roadmap/Step09N.md` (prompt preserved, nothing replaced).
- Nothing else. Working tree verified clean of `src/`, `e2e/`, config, or generated files before commit.

## Current Rules

Observed at commit `56e7dc6`, reproduced by the audit tests (references: file + test block).

### 2.1 Routes (`src/domain/road/road.ts`)

- One road = one grid cell (`RoadState { id, x, y, status, constructionRemaining }`).
- Statuses: `underConstruction` → `operational` (`ROAD_CONSTRUCTION_TICKS = 2`).
- Cost: `ROAD_CONSTRUCTION_COST = 5` Material per road, validated against stock (`validateRoadsPlacement`, phases.ts) before any mutation.
- Exclusivity: a cell cannot hold both a building and a road (`cellOccupiedByBuilding` / `cellOccupiedByRoad`).
- Connectivity: orthogonal adjacency only (`areRoadsAdjacent`, Manhattan = 1); diagonal never connects.
- Networks: connected components of OPERATIONAL roads (`getRoadNetworks`); under-construction roads are in no network and in no distance.
- Command path: `placeRoads` normalizes input (`normalizeRoadCells`: dedupe + ascending (x,y)) before id allocation — id allocation is drag-direction independent (verified by audit M2).

### 2.2 Access (`getBuildingRoadAccess`, road.ts §09E)

- Operational building + at least one orthogonally adjacent OPERATIONAL road ⇒ `hasRoadAccess`.
- Access roads = ALL adjacent operational roads (multi-contact measured, audit H: a Workshop had 3 contacts, distance = min over contacts).
- Building is never a bridge: reachable networks = networks of its contact roads (intersection of 09D components), never merged through the building.
- Under-construction contact roads drop out of access the moment their status changes (audit H2, D2).
- Workshop production eligibility (09F): operational + staffed + road access (`materialProductionForTick`).

### 2.3 Mobility (`src/domain/mobility/mobility.ts`)

- Residence–workshop link = shared network id between the two 09E `networkIds` sets (`haveSharedNetwork` = true set intersection, 09K gate `areBuildingsMobilityConnected`).
- Multi-network endpoints handled by intersection, not first-match (audit G: residence on 2 networks sees workshops on both).
- Road distance (09M): `getRoadDistanceBetweenBuildings` = multi-source/multi-target BFS over operational roads between ALL contact pairs; shared contact = 0; `null` ⇔ not connected.
- Tie-break: equal distance ⇒ lowest Workshop id (audit G2; M-D in the 09M suite).
- Recompute: every `assignJobs` call re-derives everything from canonical state; no cache, no persistence (audit D2: fixed point after re-run; J2: flip when strictly nearer).
- Determinism: `iterateRoads`/`iterateBuildings` ascending-id; BFS neighbor discovery ascending-id (audit M1/M2, N1).

### 2.4 Work (`src/domain/simulation/phases.ts` — `assignJobs`)

- Colonist scan: ascending colonist id (`iterateColonists`).
- Workshop capacity: 1 (`WORKSHOP_JOB_CAPACITY`); a taken slot is skipped for later colonists (`takenWorkplaceIds`).
- Eligibility (09K): workshop operational + free + `areBuildingsMobilityConnected(residence, workshop)` + finite distance.
- Preference (09M): smallest road distance wins; perfect tie ⇒ lowest workshop id.
- Preservation: current assignment kept iff still eligible AND tied at the minimum distance (no churn); otherwise re-evaluated — audit J shows flip on strict improvement, stability on additive-only reshaping.
- Rupture: assignment dropped on next `assignJobs` when network broken (audit D2: employed → null, production 2 → 0, upkeep 1 → 0, no stale derived data, re-run is a fixed point).

### 2.5 Economy (phases.ts, resource.ts)

- Workshop: produces 2 Material/tick/worker when staffed + road-accessible, upkeep 1/tick when staffed.
- Storage: 25 Material per operational workshop (vacant counts, §08F); production clamped to available space.
- Road: cost 5, no upkeep, no storage role.
- Unserved workshop: vacant ⇒ 0 production AND 0 upkeep from it (audit D2: both fell together).
- Unemployed colonist: effect limited to the missing 2/tick; no further penalty modeled in these fixtures.

## Audit Method

- AUDIT → OBSERVATIONS → SCÉNARIOS → MESURES → DESIGN DECISION → VERIFICATION, in order, as mandated.
- Baseline confirmed first: HEAD `56e7dc6`, working tree clean (untracked step doc only), 421 tests / 26 files passing, scripts inventoried from `package.json`.
- 09M results re-derived, not assumed: every audit scenario re-measures distances, assignments, production, upkeep from canonical state.
- All audit metrics DERIVED in-test (`measure()` helper: employment, production, upkeepDue, stock, roadCount, roadCost, networks). Nothing added to `SimulationState`; nothing persisted; nothing hashed.
- The ONLY state manipulation outside the public creation API is `setRoadStatus()` — an audit-side helper flipping an existing road between `underConstruction`/`operational`. This models rupture/repair, which has no demolition command yet (road removal is a MISSING future pressure, see classification). It changes canonical road status exactly as the real lifecycle would; it does not weaken any existing test.

## Scenarios

Block → test names in `tests/transportEmploymentBoundaryAudit.test.ts`:

| Block | Tests | Scenario |
|---|---|---|
| A | A1, A2 | Nearest vs far workshop, ids reversed; economy with/without the near one |
| B | B1, B2 | 1 colonist / 2 workshops / 2 free jobs; then 2nd colonist saturates |
| C | C1 | 2 colonists / 2 workshops, reversed ids, both mapped |
| D | D1, D2 | Rupture mid-network (no effect) and rupture at residence contact (clean unemploy) |
| E | E1, E2 | Bridge two networks with both workshops already eligible; bridge that changes eligibility |
| F | F1, F2, F3 | Straight vs L (equal cost); branch vs loop (extra cost); 5-road detour |
| G | G1, G2, G3 | Residence multi-network: sees both; tie; nearer-across-network wins |
| H | H1, H2 | Workshop 3 contacts → min distance; lose nearest contact → next-best |
| I | I1, I2 | Under-construction segment connects nothing; repaired ⇒ employed |
| J | J1, J2 | Additive reshaping keeps choice; strictly-nearer flips it (no hysteresis) |
| K | K1, K2 | Cost vs distance; shared chain vs independent pairs |
| L | L1–L5 | 1R/2W, 2R/2W, 2R/3W, 3R/2W matrix + ascending-order artifact measurement |
| M | M1, M2 | Building insertion order invariance; single-call road batch normalization |
| N | N1, N2 | Replay hash equality + save/load; nothing derived persisted; SAVE_VERSION=4 |

## Measurements

Key measured facts (all reproduced by assertions):

- **A**: same colony, near vs far workshop the only difference: production 2, upkeep 1, stock, employment IDENTICAL in both. Distance chose WHO; it never changed HOW MUCH.
- **B**: with slack capacity distance still decides (B1: near workshop taken, far vacant). With 2 colonists both slots fill (B2: production 4, upkeep 2, vacant 0). Capacity does not mask the choice at intake; it only fills the remainder.
- **C**: reversed ids under saturation: each colonist lands on its own nearest workshop (full employment, production 4). No assignment error.
- **D**: rupture NOT on the colonist's path: zero effect (assignment retained). Rupture AT the contact: employed→unemployed, production 2→0, upkeep 1→0, distance null, re-run fixed point. Road count unchanged (5) — the road still blocks its cell.
- **E**: bridging two networks when BOTH workshops already eligible (tie at d2): network count 2→1, chosen workshop UNCHANGED, economy identical — pure informational change. Bridging when the only workshop was on the other network: eligibility flips false→true, production 0→2, upkeep 0→1 — real pressure.
- **F**: straight (3 roads, cost 15, d2) ≡ L-shape (3 roads, cost 15, d2): identical economy. Branch (4 roads) and loop (5 roads): extra cost with SAME distance 2 and same economy — extra geometry bought nothing. 5-road detour (cost 25, d4): economy still identical (production 2, upkeep 1).
- **G**: residence with contacts on 2 networks: `networkIds.length = 2`; workshops on different networks compared by distance across networks (nearer on the OTHER network wins, G3); equal distance ⇒ lowest id (G2).
- **H**: 3-contact workshop: distance = min = 5 (contacts at d5/d7/d9). After degrading the nearest contact: distance 7, employment survives, economy unchanged. No stale derived value.
- **I**: 1 under-construction segment: networks 2, distance null, mobility false, employment 0, production 0, upkeep 0; road still exists (roadCount 3). Repair ⇒ 1 network, employed, production 2, upkeep 1. No temporary assignment ever created.
- **J**: additive-only reshaping (new roads never strictly nearer): choice stable. One road making a strictly nearer workshop (d2 vs d4): assignment flips immediately on next `assignJobs` — the system optimizes spatially, no hysteresis. Post-flip re-run is a fixed point.
- **K**: short+cheap (1 road, cost 5) vs long+costly (5 roads, cost 25): IDENTICAL production (2) and upkeep (1). Cost is the ONLY economic difference. Shared chain (cost 25) vs independent pairs (cost 10): both fully employ; sharing bought nothing (and forced a d3 assignment vs d0).
- **L**: 1R/2W → 1 vacancy, near chosen. 2R/2W → full. 2R/3W → 1 vacant workshop, economy unchanged. 3R/2W → 1 unemployed. **L5 (artifact)**: ascending colonist-id processing takes a distance TIE first (d2 vs d2, lowest id), forcing the second colonist onto a d4 workshop: measured total distance 6 vs optimal 2. Order, not space, decided.
- **M**: different building insertion order (ids differ) → same spatial decision, same economy; ids only ever act as the planned tie-break. Single-call road batches normalized by `validateRoadsPlacement` → identical canonical serialization regardless of cell order. (DISCOVERED: bare `createRoads` does NOT normalize — id allocation follows input order; only the command path normalizes. Audit tests use the command path.)
- **N**: identical command sequences → identical serialization, identical hash; save→load preserves hash; serialized state contains no distance/network/mobility/audit keys; SAVE_VERSION unchanged at 4.

## Observations

1. **Employment eligibility is binary road topology.** Everything before 09M's preference (access, networks, 09K gate) is set-membership: connected or not. Rupture and bridging move employment only when they move that membership (D2, E2).
2. **Road distance is a pure ordering device.** It ranks already-eligible workshops. It never changes production (2/tick/worker everywhere), never changes upkeep (1/tick/staffed), never changes stock trajectories. Two colonies differing ONLY by distance are economically identical (A2, F3, K1).
3. **Cost is the only economic consequence of road geometry.** Length ⇒ cost (5/road) and nothing else. A d4 colony pays 20 more Material than a d0 colony and produces the same (K1, F3).
4. **Network shape beyond the shortest path is economically invisible.** Branches, loops, redundant roads: same distance, same economy, pure sunk cost (F2).
5. **Capacity interacts with distance only at intake.** While a near slot is free, distance decides; once taken, the next colonist takes the best remaining (B2, C1). Capacity never reverses a distance preference.
6. **Ascending colonist-id processing creates a measurable misallocation under ties and contention** (L5): total assigned distance 6 vs optimal 2 in a 2×2 fixture. The preference is per-colonist greedy, not globally optimal.
7. **Stability rule interacts benignly with the preference**: current assignment survives iff still tied at minimum; strict improvements flip; additive-only changes never churn (J1/J2). No oscillation observed.
8. **No stale derived state anywhere**: after rupture, re-bridging, contact loss, and flips, re-running `assignJobs` is always a fixed point; distances recomputed from scratch each call (D2, H2, J2).
9. **Under-construction roads are fully inert** for connectivity, eligibility, distance, and assignment (I1) while still blocking their cell and costing their build — an honest WIP cost.
10. **Road removal does not exist.** Every rupture in this audit had to be simulated by a status flip. A player cannot currently undo a misplaced road — no demolition command, no refund rule.

## Gameplay Classification

Per scenario (A–E scale of §5; pressure types noted):

| Block | Class | Pressure |
|---|---|---|
| A | B — Useful but limited | choice of employment (distance orders the pick); none on production/upkeep |
| B | B — Useful but limited | choice at intake; masked once capacity fills |
| C | B — Useful but limited | choice under saturation; correct mapping |
| D | A — Strong (rupture direction) | eligibility + production + upkeep via topology; strongest observed causal chain |
| D (repair) | E — Missing future pressure | no repair/demolition command exists for the player |
| E (bridge w/ eligibility change) | A — Strong | eligibility flip → production appears; real network-level decision |
| E (bridge w/o eligibility change) | C — Economically equivalent | informational only |
| F | C — Economically equivalent | geometry beyond shortest path buys nothing; pressure on cost only |
| G | B — Useful but limited | multi-network choice is real but rare, resolved by the same rule |
| H | B — Useful but limited | multi-contact min-distance: correctness property, low decision weight |
| I | B — Useful but limited | WIP roads honestly inert; no temp-assignment bug |
| J | B — Useful but limited | stability vs re-optimization works; flip only on strict improvement |
| K | C — Economically equivalent (distance axis) | cost is the ONLY lever; distance-vs-cost arbitration NOT yet real |
| L (1–4) | B — Useful but limited | matrix behaves; scarcity reads through |
| L5 | D — Informational (today) / E — future | processing-order artifact: real misallocation, currently invisible |
| M | D — Informational only | determinism invariants hold |
| N | D — Informational only | persistence/replay invariants hold |

Summary: pressure exists on **eligibility** (D, E2 — strong), on **choice** (A/B/C/G/H/J — useful), on **cost** (F, K — the only economic gradient), and **nowhere else**. Production and upkeep are step functions of eligibility, blind to distance and shape.

## Complexity Audit

Step 09M (measured from `git show 56e7dc6 --stat`):

- Files: 10 (+2366 / −123).
- Production code: `road.ts` (+65: `getRoadDistance` BFS), `mobility.ts` (+66/−24: `getRoadDistanceBetweenBuildings`), `jobs.ts` (+15: docs/exports), `phases.ts` (assignJobs preference + preservation), `main.ts` (+15 wiring).
- New functions: 2 (`getRoadDistance`, `getRoadDistanceBetweenBuildings`); `assignJobs` gained one eligibility-collection + min-selection loop.
- New persisted data: **zero**. New queries: **zero** (both are exported domain helpers). New dependencies: **zero**.
- Algorithmic cost: `assignJobs` worst case O(C × W × (access + BFS)) per tick; BFS is O(R²) in road count (full-list neighbor scan per dequeued node). At NOVA scale (C, W, R in tens) this is noise; at city scale the O(R²) BFS would need an adjacency index — noted, not built (09G §13 already refused premature caching).
- Gameplay produced: one new DECISION (which eligible workshop, by distance) + one preservation rule. Measured against A/K/F: that decision currently moves nothing but which vacancy is filled and the total-distance number.

Verdict: **low complexity / meaningful-but-narrow pressure.** The rule is small, pure, derived-only, deterministic, and correct (M, N). Its pressure is real but currently capped by the economy's blindness to distance: it is the cheapest possible first spatial preference, and the audit found no bug, no churn, no staleness. Classification is descriptive: 2 functions, ~130 production lines, one observable decision axis.

## Roadmap Comparison

Main roadmap state: Phase 0–2 done; Phase 3 (needs) NOT started; Phase 4 (production flow) partial (Material only, no consumption); Phase 5 (service) absent; Phase 6 (work) done; Phase 7 (money) absent; Phase 8 (production economy: inputs→outputs→consumption) NOT started; Phase 9 (transport) — where roads sit, deliberately minimal; Phase 10 (growth) absent.

Missing dependencies, per §7 questions:

1. **Main mechanic missing before deeper transport**: a consumption loop (Phase 3/8). Production exists but nothing consumes Material except construction and workshop upkeep; nothing produces pressure over time except starvation. Without consumption, transport has no flow to carry.
2. **Mechanic that would benefit from existing roads**: farms/food distribution (Phase 3→4) and later service radius: 09E access + 09D networks + 09M distance are exactly the primitives a "residence must reach food/service" rule needs. Zero new transport code required.
3. **Transport as minimal prerequisite**: YES — keep it exactly as is. The audit found its current shape (access + networks + distance ordering) sufficient for every near-term rule, with no technical debt.
4. **More causality per complexity**: needs/consumption (Phase 3) — one need with a full chain (docs/26 Phase 3) reuses mobility for distribution and gives distance its first economic teeth (delivery range / service access), without touching transport code.
5. **Ready for a new resource/need**: yes at the state level (resources record, phases pipeline, SAVE_VERSION migration path established); the blocker is design (which need first), not architecture.

Not proposed because technically easy: congestion, vehicles, pathfinding frameworks — all explicitly deferred (below).

## Design Decision

Answers to §6 (evidence-linked; 9–14 evidence only, nothing implemented):

1. **Distance ≠ accessibility?** Yes — measured. Eligibility is binary; distance orders among eligible (A1: near wins over lower id; J2: strict improvement flips). But today the two produce the same ECONOMY whenever both endpoints are eligible (A2).
2. **Distance influences real production?** No. Production = 2/tick/worker regardless of distance (A2, F3, K1). Distance is observable only through assignment choice and derived distance values — currently a decision input, not an economic output.
3. **Length beyond construction cost?** No. Length ⇒ cost 5/cell and nothing else (K1: 1-road vs 5-road colonies, same production/upkeep). No maintenance, no decay, no capacity.
4. **Network shape at equal cost+distance?** No (F1: straight ≡ L; F2: branch/loop add cost without changing anything). Shape is economically invisible.
5. **Shared routes: observable economic advantage?** No (K2: shared chain cost 25 vs independent pairs cost 10, identical employment/production/upkeep). Sharing is currently strictly worse (sunk cost, longer distances).
6. **Multiple residences change the spatial decision?** Yes, through contention only (B2, C1, L): slots get taken, later colonists take next-best. Order of processing, not distance, then decides (L5).
7. **Capacity masks distance preference?** Partially, at saturation: the preference fills the FIRST slot; remaining colonists compare remaining options (B2: 2nd colonist takes far workshop). The preference itself is never violated.
8. **Colonist order = artificial pressure?** Measured: YES under ties/contention (L5: total distance 6 vs optimal 2). It is deterministic and currently invisible to the player; it would matter only if distance gained an economic payoff.
9. **Travel time needed?** No evidence yet: nothing consumes time-in-transit; employment is instantaneous connectivity. Revisit only when a flow (goods/commute) with a per-tick consequence exists. Evidence: A/F/K show a time-free economy.
10. **Transport capacity needed?** No: no flow exists to cap. Roads carry infinite employment links at zero marginal cost (K2). Evidence: identical outcomes at any length.
11. **Congestion needed?** No: same reason as 10 — no flow, no scarcity on roads. Would become evidence-based only after Phase 3/8 consumption creates per-tick flows.
12. **Collective transport needed?** No: no scale pressure (colonists ≤ 3 in meaningful fixtures; road distance never gates anything time-based). Deferred without prejudice.
13. **Road maintenance needed?** Evidence FOR: roads are permanently free after construction while workshops pay upkeep — an asymmetry with no current justification (F2: redundant roads are pure sunk cost with zero carrying cost). Evidence AGAINST: road upkeep today would only tax the player with no counter-decision. Decision: not needed now; the asymmetry is recorded as the first argument FOR when money arrives (Phase 7).
14. **Preference other than distance?** No evidence of need: distance is the only spatial dimension with causal meaning (networks, access are binary pre-filters). Any second preference has nothing to rank yet.
15. **Smallest future rule creating a REAL new decision**: give road distance one economic payoff — e.g. "workshop output scales with worker travel efficiency" OR "residence must be within road-distance ≤ N of a food source". Either single rule converts today's invisible ordering into production/consumption pressure and instantly makes D/E2-class topology decisions plus cost-vs-distance (K) real arbitrations. Recommended: attach it to the FIRST need (Phase 3), not to transport.

**Decision**: keep transport as minimal infrastructure (option 4 of the mission). Do NOT deepen transport now. Return to the main roadmap at Phase 3 (one need, full causal chain). The 09A–09M chain is complete, deterministic, debt-free, and already provides every primitive (access, networks, distance) a distribution rule will need.

## Recommended Next Step

Main roadmap **Phase 3 — Needs**: one need with a complete causal chain (docs/26-roadmap.md), designed to consume an existing resource and to USE road distance as its delivery/quality gradient (per Design Decision Q15). No new transport system. No transport deepening.

## Known Limitations

- Audit fixtures run on the 8×8 test world with hand-placed operational buildings/roads (same fixture style as the 09M suite); no construction timing is exercised — WIP semantics audited via status flips only.
- `setRoadStatus` audit helper bypasses the command layer (no road-removal/repair command exists to use); it edits exactly one canonical field (`status` + `constructionRemaining`) and does not leak into other tests.
- `assignJobs` worst-case cost is O(C·W·R²) (per-colonist BFS with full-list neighbor scan); fine at current scale, would need an adjacency index at city scale.
- Colonist processing order artifact (L5) is documented, not fixed — fixing it would change production rules, out of audit scope.

## Deferred

- Road demolition / repair commands (with refund rule) — first candidate when construction UX returns.
- Distance-based economic payoff (Q15) — belongs to Phase 3 design, not transport.
- Travel time / transport capacity / congestion / collective transport (Q9–12) — all lack any current evidence of need; revisit after a consumption flow exists.
- Road upkeep (Q13) — revisit with money (Phase 7); the free-roads-vs-paid-workshops asymmetry is the recorded trigger.
- Global (non-greedy) assignment optimization (L5) — only if distance gains an economic payoff that makes the misallocation visible.
- BFS adjacency index / per-call caching — refused again (09G §13); scale does not justify it.

## Verification

Executed at audit time, all green:

```text
pnpm test        → 453 passed (453) / 27 files   (before: 421 / 26; +32 audit tests, 0 weakened)
pnpm lint        → clean
pnpm typecheck   → clean (tsc --noEmit)
pnpm build       → success (pre-existing chunk-size warning only)
```

E2E (existing suites, unchanged):

```text
pnpm test:e2e:road        → ALL PASS (zero console/page errors)
pnpm test:e2e:transport   → ALL PASS (zero console/page errors)
pnpm test:e2e:production  → ALL PASS (zero console/page errors)
pnpm test:e2e:resource    → ALL PASS (zero console/page errors)
pnpm test:e2e:food        → ALL PASS (zero console/page errors)
pnpm test:e2e:temporal    → ALL PASS (zero console/page errors)
```

## As-Built

Final report (§13 format):

```text
STATUS              COMPLETE (audit only; no src/ change)
COMMIT              (this commit) "Step 09N: transport employment boundary audit"
PARENT              56e7dc6 "Step 09M: spatial employment preference"
WORKING TREE        clean at commit time (this doc + 1 new test file only)
FILES CHANGED       2 (docs/roadmap/Step09N.md appended, tests/transportEmploymentBoundaryAudit.test.ts new)
TEST COUNT BEFORE   421 (26 files)
TEST COUNT AFTER    453 (27 files) — +32 audit tests, 0 removed, 0 weakened
UNIT TESTS          PASS
LINT                PASS
TYPECHECK           PASS
BUILD               PASS
E2E                 road / transport / production / resource / food / temporal — ALL PASS
GPU STATUS          not exercised (no rendering change; GPU suite untouched)
PERSISTENCE STATUS  SAVE_VERSION unchanged (4); no new persisted field; save/load roundtrip hash-stable (N1)
HASH STATUS         identical command sequences → identical canonical hash (N1); insertion-order invariance (M1/M2)
DETERMINISM STATUS  re-run fixed points verified after rupture, contact loss, and preference flips (D2/H2/J2)
```

§13 answers:

1. **What 09M actually adds**: an ordering rule among already-eligible workplaces (shortest operational road distance, lowest-id tie-break), plus a no-churn preservation clause. One decision axis, derived-only.
2. **What 09M does NOT create**: any economic effect of distance (production/upkeep/stock are distance-blind); any cost difference beyond road count; any pressure on network shape; any flow, time, or capacity.
3. **Scenarios with real pressure**: D2 (rupture → unemploy → production stop), E2 (bridge → eligibility → production), I2 (repair → employment). All are topology-driven eligibility flips.
4. **Economically equivalent scenarios**: A2, F1–F3, K1 (distance axis), E1 (bridge without eligibility change) — identical economies under different distances/shapes.
5. **Complexity introduced**: 2 pure functions + `assignJobs` preference loop (~130 production lines in 09M), zero persisted data, zero new dependencies; audited ratio: low complexity / meaningful-but-narrow pressure.
6. **Next logical dependency**: main roadmap Phase 3 — one need with a complete causal chain, designed so road distance becomes its delivery/quality gradient (Q15).
7. **What stays deferred**: demolition/repair, travel time, capacity, congestion, collective transport, road upkeep, global assignment optimization, BFS indexing (see Deferred).

Record classification:

```text
DISCOVERED  bare createRoads does NOT normalize id allocation (only the validateRoadsPlacement command path does); colonist-order assignment artifact (L5: 6 vs optimal 2); free-roads vs paid-workshops upkeep asymmetry
DERIVED     all audit metrics (employment, production, upkeep, stock, networks, cost, distance) — computed in tests, never stored
INTENTIONAL transport stays minimal infrastructure; audit-only step; distance kept decision-only, not economic
DEFERRED    see Deferred above
```
