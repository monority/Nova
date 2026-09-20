# NOVA — Step 09M — Spatial Employment Preference

## Mission

Implémenter la première préférence spatiale réelle de NOVA :

> Un colonist peut travailler uniquement dans un Workshop auquel son logement est connecté par le réseau routier opérationnel.
> Parmi plusieurs Workshops éligibles, il choisit celui dont la distance routière depuis sa résidence est la plus courte.
> En cas d’égalité parfaite, l’ID du Workshop départage.

Cette étape doit rester **strictement limitée au choix d'emploi**.

Ne pas implémenter :

* déplacement de colonists ;
* animation de déplacement ;
* temps de trajet ;
* véhicules ;
* transport collectif ;
* congestion ;
* capacité des routes ;
* pathfinding générique ;
* coûts de trajet ;
* pollution ;
* money ;
* migration ;
* commute penalty ;
* road upkeep ;
* road tiers/upgrades ;
* nouvelle ressource persistée.

---

# 1. Workflow obligatoire

Suivre exactement :

`AUDIT → OBSERVATIONS → DESIGN DECISION → IMPLEMENTATION → VERIFICATION`

Avant toute modification de `src/`, inspecter l'implémentation actuelle de :

* `src/domain/road/`
* `src/domain/mobility/`
* `src/domain/jobs/`
* `src/domain/simulation/phases.ts`
* `src/application/queries/`
* représentation actuelle des `RoadState`
* tests 09D → 09L
* E2E road / transport / production / temporal.

Ne pas supposer les APIs existantes.

Le rapport initial doit répondre explicitement à :

1. Comment les routes opérationnelles sont actuellement représentées ?
2. Comment leurs voisins sont-ils déterminés ?
3. Comment les réseaux routiers sont-ils actuellement calculés ?
4. Comment l'accès d'un bâtiment à une route est-il actuellement calculé ?
5. Comment `assignJobs` détermine-t-il aujourd'hui les Workshops éligibles ?
6. Existe-t-il déjà une primitive BFS réutilisable sans créer une abstraction générique inutile ?
7. Comment traiter une résidence adjacente à plusieurs routes ?
8. Comment traiter un Workshop adjacent à plusieurs routes ?
9. Comment définir exactement la distance lorsque les bâtiments eux-mêmes ne sont pas des cellules routières ?
10. Le calcul peut-il rester une query pure et dérivée ?

**Ne modifier aucun fichier avant cette analyse.**

---

# 2. Règle de gameplay à introduire

La règle cible est :

```text
eligible Workshops
    ↓
shortest operational road distance
    ↓
lowest distance wins
    ↓
Workshop ID tie-break
```

Exemple :

```text
Residence
   │
   R
   │
   R ── R ── Workshop A

Residence
   │
   R
   │
   R ── R ── R ── Workshop B
```

Si A et B sont tous deux accessibles, le colonist choisit A.

La distance doit être basée sur **le réseau routier opérationnel**, pas sur la distance euclidienne, Manhattan libre, ni sur l'ordre de création.

---

# 3. Contrat de distance

Avant implémentation, formaliser dans la documentation la convention retenue.

La convention attendue est :

* seuls les `RoadState` `operational` participent ;
* les routes sont des cellules orthogonales ;
* un bâtiment fournit ses cellules de contact routier via les routes orthogonalement adjacentes ;
* plusieurs cellules de contact sont autorisées ;
* la distance entre résidence et Workshop est la longueur minimale du chemin routier reliant une cellule de route adjacente à la résidence à une cellule de route adjacente au Workshop ;
* la distance doit être exprimée dans une unité déterministe documentée ;
* un même réseau peut avoir plusieurs points de contact ;
* on prend le minimum parmi tous les couples de points de contact ;
* une route sous construction ne peut jamais contribuer à la distance.

Ne pas inventer de distance géométrique approximative.

Si l'implémentation actuelle impose une convention légèrement différente, **documenter l'écart et justifier la décision avant de coder**.

---

# 4. Ne pas créer un pathfinding générique

C'est un point important.

Ne pas introduire :

```text
Pathfinder
GraphEngine
TransportGraph
GenericShortestPath
NetworkService
```

simplement pour cette étape.

Le besoin est beaucoup plus petit :

> calculer une distance routière dérivée pour choisir un Workshop.

Une implémentation BFS locale et pure est acceptable.

Si une primitive existante peut être réutilisée proprement, la réutiliser.

Sinon créer la plus petite fonction spécifique possible, par exemple conceptuellement :

```text
getRoadDistanceBetweenBuildings(state, residenceId, workshopId)
```

ou une primitive interne équivalente.

Le nom et l'emplacement doivent suivre l'architecture réellement découverte pendant l'audit.

---

# 5. Multi-source / multi-target

Le calcul doit être correct lorsqu'un bâtiment touche plusieurs routes.

Exemple :

```text
R ─ R ─ R
│
R
│
Residence
```

La résidence possède plusieurs contacts routiers.

Le calcul ne doit pas dépendre :

* du premier contact rencontré ;
* de l'ordre d'insertion ;
* de l'ID de route ;
* de l'ordre des voisins.

Une stratégie BFS multi-source est préférable si elle simplifie le déterminisme :

```text
sources = toutes les routes opérationnelles adjacentes à la résidence
targets = toutes les routes opérationnelles adjacentes au Workshop
```

Puis :

```text
distance = distance minimale source → target
```

Le calcul doit être déterministe.

---

# 6. Nouvelle règle `assignJobs`

Modifier `assignJobs` uniquement sur la sélection du Workshop.

Comportement :

### Étape A — conserver les affectations existantes

Une affectation existante est conservée si :

* colonist valide ;
* residence valide ;
* workplace valide ;
* workplace opérationnel ;
* workplace = Workshop ;
* Workshop encore disponible ;
* mobilité résidence ↔ workplace valide.

La nouvelle distance ne doit pas provoquer de churn inutile si l'affectation actuelle reste le choix optimal.

### Étape B — pour un colonist sans emploi

Construire les Workshops éligibles.

Pour chacun :

```text
mobilityConnected === true
```

puis calculer :

```text
roadDistance
```

Sélection :

```text
smallest roadDistance
```

Tie-break :

```text
smallest workshop.id
```

### Étape C — capacité

Conserver :

```text
Workshop jobCapacity = 1
```

Donc deux colonists ne peuvent pas choisir le même Workshop.

Le choix doit être déterministe selon :

```text
colonist ID ascending
```

puis, pour chaque colonist :

```text
distance ascending
Workshop ID ascending
```

---

# 7. Cas de capacité importante

Tester explicitement ce scénario :

```text
          Workshop A
              │
Residence ────R

              │
              R
              │
              R
              │
          Workshop B
```

A et B sont accessibles.

Si A est plus proche :

```text
Colonist → A
```

Même si B possède un ID inférieur.

Cela prouve que la distance est désormais prioritaire sur l'ancien tie-break par ID.

---

# 8. Cas d'égalité

Créer un cas où deux Workshops sont à exactement la même distance.

Résultat obligatoire :

```text
lowest Workshop ID wins
```

Puis inverser l'ordre d'insertion des bâtiments.

Le résultat doit rester identique.

---

# 9. Cas multi-réseaux

Préserver le comportement 09K :

```text
Residence ─ Network A ─ Workshop A

Residence ─ Network B ─ Workshop B
```

Si les deux réseaux sont accessibles depuis la résidence, les deux Workshops sont éligibles.

La distance est calculée séparément sur chaque réseau.

Ne pas fusionner les réseaux.

Ne pas créer de connectivité implicite.

---

# 10. Cas sous construction

Une route sous construction ne doit jamais participer.

Scénario :

```text
Residence ─ operational road ─ Workshop A

Residence ─ underConstruction road ─ Workshop B
```

B reste inéligible.

Même si la géométrie semblerait créer une connexion.

Même règle que 09D/09E/09K.

---

# 11. Réactivité à une modification du réseau

Tester :

1. Residence + Workshop A proche ;
2. Workshop B plus loin ;
3. A sélectionné ;
4. modifier le réseau pour rendre B plus proche ;
5. prochain `assignJobs` ;
6. vérifier que la préférence spatiale est recalculée correctement.

Le système doit refléter l'état actuel du réseau.

Ne pas mettre en cache la distance.

Ne pas persister la distance.

---

# 12. Suppression logique d'un chemin

Tester une rupture :

```text
Residence ─ R ─ R ─ R ─ Workshop A
                 X
```

Après suppression/désactivation d'une route :

* le Workshop devient éventuellement inéligible ;
* l'emploi est réévalué ;
* un autre Workshop accessible peut être choisi ;
* aucun état dérivé de distance ne reste périmé.

---

# 13. Déterminisme

Ajouter des tests pour :

### Même état

Deux calculs successifs :

```text
same assignment
same distance
same hash
```

### Ordre des bâtiments

Construire le même état avec des ordres d'insertion différents.

Résultat identique.

### Ordre des routes

Même test avec les routes insérées dans un ordre différent.

Résultat identique.

### Rejouabilité

Même séquence de commandes :

```text
same final state
same final hash
same employment assignments
```

---

# 14. Tests unitaires obligatoires

Créer un bloc de tests dédié 09M.

Minimum :

### M-A — direct road

Residence → Workshop via une seule route.

### M-B — short vs long

Deux Workshops accessibles, le plus proche gagne.

### M-C — reversed IDs

Le Workshop le plus proche possède un ID supérieur.

La distance doit gagner.

### M-D — equal distance

Égalité → ID inférieur gagne.

### M-E — multiple residence contacts

Résidence touchant plusieurs routes.

### M-F — multiple workshop contacts

Workshop touchant plusieurs routes.

### M-G — shortest contact pair

Plusieurs contacts, choisir le couple le plus court.

### M-H — disconnected

Pas de chemin → distance absente / Workshop inéligible.

### M-I — under construction

Route sous construction ignorée.

### M-J — network partition

Deux réseaux distincts conservés.

### M-K — network merge

Après connexion, le Workshop devient éligible.

### M-L — reassignment

Le réseau change et le choix d'emploi est recalculé.

### M-M — capacity

Deux colonists, un Workshop.

### M-N — two Workshops / two colonists

Assignments déterministes.

### M-O — insertion-order invariance

Même résultat malgré ordre différent.

### M-P — repeated assignment

Pas de churn.

### M-Q — deterministic distance

Même état → même distance.

### M-R — no persistence

Distance absente du state sauvegardé.

### M-S — hash invariance

Le calcul dérivé ne modifie pas le hash.

---

# 15. Tests économiques

Ne pas changer les coefficients économiques.

Vérifier que :

```text
road preference
```

n'introduit aucun nouveau coût.

Les règles existantes restent :

* production dépend de l'emploi ;
* production dépend de l'accès routier du Workshop ;
* upkeep dépend du Workshop opérationnel + staffed ;
* stockage inchangé.

Le seul changement causal doit être :

```text
Workshop selection
```

---

# 16. E2E navigateur

Mettre à jour l'E2E road si nécessaire.

Créer un scénario réel joueur :

1. construire Residence ;
2. construire deux Workshops ;
3. construire les routes ;
4. rendre les deux accessibles ;
5. avancer la simulation ;
6. vérifier que le colonist travaille dans le Workshop le plus proche ;
7. modifier le réseau ;
8. vérifier la nouvelle affectation.

Si l'UI ne permet pas encore d'exposer l'identité du Workshop occupé, ajouter **uniquement le minimum de debug observable nécessaire**.

Ne pas construire une UI d'emploi complète.

Vérifier :

* aucun `console.error` ;
* aucune `pageerror` ;
* aucun crash ;
* simulation jouable ;
* routes visibles ;
* état cohérent.

---

# 17. GPU / navigateur

Lancer la vérification navigateur existante.

Si l'environnement utilise encore SwiftShader/ANGLE au lieu du GPU NVIDIA réel, le signaler comme :

```text
ENVIRONMENTAL BLOCKER
```

Ne pas modifier le renderer simplement pour faire passer ce test.

---

# 18. Persistence / hash

Conserver :

```text
SAVE_VERSION = 4
```

sauf nécessité absolument démontrée.

La distance routière est une donnée dérivée.

Elle ne doit pas être persistée.

Elle ne doit pas être ajoutée au hash.

Vérifier :

```text
save → load → same state
save → load → same hash
```

---

# 19. Architecture

Respecter :

```text
domain
  ↓
application queries
  ↓
rendering/UI
```

La règle de distance doit vivre dans le domaine ou dans une query dérivée appropriée.

Ne pas mettre de logique métier dans le renderer.

Ne pas mettre de logique de sélection d'emploi dans l'UI.

Ne pas dupliquer les règles de connectivité existantes.

---

# 20. Documentation

Créer/compléter :

```text
docs/roadmap/Step09M.md
```

Structure obligatoire :

```text
# Step 09M — Spatial Employment Preference

## Status
## Context
## Audit
## Observations
## Design Decision
## Distance Contract
## Assignment Rule
## Implementation
## Tests
## E2E
## Persistence
## Determinism
## Architecture Review
## Known Limitations
## Deferred
## As-Built
```

**Important : ne jamais remplacer brutalement un document roadmap existant.**

Si `Step09M.md` existe déjà, l'inspecter puis le compléter.

Préserver toute section/spec existante.

---

# 21. Vérification finale

Exécuter au minimum :

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis les E2E pertinentes.

Comparer le total de tests avant/après.

Aucun test existant ne doit être affaibli, supprimé ou rendu conditionnel uniquement pour faire passer l'étape.

---

# 22. Audit final obligatoire

Le rapport final doit répondre explicitement :

### Gameplay

1. Est-ce que deux Workshops accessibles peuvent maintenant produire des choix spatiaux différents ?
2. La distance routière influence-t-elle réellement l'emploi ?
3. L'ID n'est-il utilisé qu'en tie-break ?
4. Le réseau reste-t-il une contrainte d'éligibilité ?
5. Le coût des routes reste-t-il la seule conséquence économique directe de leur longueur ?

### Technique

6. La distance est-elle pure et dérivée ?
7. Est-elle déterministe ?
8. Les routes sous construction sont-elles ignorées ?
9. Les multi-contacts sont-ils corrects ?
10. Les réseaux restent-ils séparés ?
11. Aucun pathfinding générique prématuré n'a-t-il été introduit ?
12. Aucun état dérivé n'a-t-il été persisté ?

### Régression

13. Production inchangée hors effet de l'emploi ?
14. Upkeep inchangé ?
15. Storage inchangé ?
16. SAVE_VERSION inchangé ?
17. Hash stable ?
18. Replays déterministes ?
19. E2E navigateur propre ?

### Design

Classer le résultat :

```text
A — Strong new spatial pressure
B — Useful but limited pressure
C — Mostly equivalent / cosmetic
D — Informational only
E — Missing future pressure
```

Puis expliquer avec des scénarios concrets.

---

# 23. Règles de scope

Ne pas implémenter dans cette étape :

* distance des colonists ;
* déplacement ;
* travel time ;
* commute ;
* congestion ;
* vehicles ;
* transit ;
* cargo ;
* traffic simulation ;
* road capacity ;
* road maintenance ;
* road upgrades ;
* highway geometry ;
* pollution ;
* money ;
* migration ;
* desirability ;
* generic pathfinding;
* cached distance;
* persisted network metrics.

Si l'audit révèle qu'une modification hors de ce périmètre est indispensable, **la documenter avant de l'implémenter**.

---

# 24. Commit

À la fin :

```text
git status --short
git diff --stat
git diff
```

Vérifier qu'il n'y a :

* aucun fichier parasite ;
* aucun texte hors sujet ;
* aucune modification accidentelle de roadmap précédente ;
* aucune donnée générée non désirée ;
* aucun secret.

Commit :

```text
Step 09M: spatial employment preference
```

Puis fournir :

```text
commit hash
tests
lint
typecheck
build
E2E
GPU status
persistence/hash status
determinism status
files changed
scope audit
design classification
```

Le rapport doit distinguer clairement :

```text
DISCOVERED
DERIVED
INTENTIONAL
DEFERRED
```

Ne pas déclarer l'étape terminée avant que toutes les vérifications applicables soient exécutées.

---

# Step 09M — Spatial Employment Preference

## Status

`COMPLETE` — implemented, verified, committed as `Step 09M: spatial employment preference`.
(Commit hash/parent at the end of this document; see **As-Built**.)

## Context

Phase 9 so far: 09A transport foundation → 09B road contract → 09C road construction →
09D road networks → 09E building road access → 09F road-access-gated production →
09G residence↔work mobility fact → 09H player road UI → 09I bootstrap economy audit →
09J spatial network pressure audit → 09K mobility-gated employment → 09L employment
mobility pressure audit.

09L established, with evidence, that binary connectivity was exhausted as a source of
spatial pressure: road **length** and **shape** were simulation-invisible (cost only) and
job **choice** was id-ordered, never proximity-ordered. 09L named the smallest missing
rule — a length-aware assignment preference — and deferred it. 09M implements exactly
that rule and nothing else.

## Audit

Re-read from source before any modification:

1. **How are operational roads represented?** `RoadState { id, x, y, status,
   constructionRemaining }` in `state.roads: Record<string, RoadState>`; one road per
   orthogonal grid cell; `isOperationalRoad` is `status === 'operational'`;
   `iterateRoads` yields ascending id order; road and building occupancy are mutually
   exclusive.
2. **How are neighbours determined?** `areRoadsAdjacent(a, b)` = Manhattan-1 orthogonal
   only (`|dx| + |dy| === 1`); diagonals never connect.
3. **How are networks computed?** `getConnectedRoadIds` runs a multi-source BFS over
   operational roads from a seed; `getRoadNetworks` collects the connected components,
   each ascending by id, networks ordered by lowest road id. Derived only.
4. **How is building road access computed?** `getBuildingRoadAccess(state, id)` returns
   `{ buildingId, roadIds, networkIds, hasRoadAccess }`, requiring the building to be
   operational and to have at least one orthogonally adjacent **operational** road.
5. **How did `assignJobs` determine eligible Workshops?** It walked operational Workshops
   in ascending id and took the first vacancy passing `areBuildingsMobilityConnected` —
   id-ordered, topology-blind apart from the 09K connectivity gate.
6. **Is there a reusable BFS primitive?** Yes: `getConnectedRoadIds` already contains a
   deterministic multi-source BFS over operational roads (ascending-id discovery). It
   returns **membership**, not distance, so 09M adds a distance variant in the same
   module rather than introducing any generic pathfinder.
7. **Residence adjacent to several roads?** `getBuildingRoadAccess(...).roadIds` already
   returns **all** adjacent operational roads (ascending). They become BFS sources.
8. **Workshop adjacent to several roads?** Same list; the Workshop is a multi-target and
   its distance is the minimum over its contacts.
9. **How to define distance when buildings are not road cells?** Contacts from 09E on
   both sides, then the minimum number of orthogonal road-to-road steps between any
   contact pair. Not Euclidean, not free Manhattan, not creation order.
10. **Can it stay a pure derived query?** Yes: contacts and BFS are pure functions of
    canonical state; nothing persisted, nothing hashed, no cache.

An audit probe (temporary, deleted) confirmed the contact lists and measured the real
fixtures before any code change, e.g. the 09K stability fixture has its two Workshops at
road distance 6 and 8 from the residence — which is why 09M intentionally supersedes the
old id-order tie-break.

## Observations

* **DISCOVERED**: `getBuildingRoadAccess` already exposes every contact road, so both
  sides of a pair are ready for a multi-source / multi-target BFS; no new adjacency or
  connectivity derivation is needed.
* **DISCOVERED**: BFS discovery order is already deterministic because `iterateRoads`
  sorts by id.
* **DERIVED**: because `assignJobs` recomputes fully every tick, re-ranking by distance
  automatically reacts to network changes with no cache, no event, and no new state.
* **DERIVED**: `distance !== null` is exactly equivalent to `areBuildingsMobilityConnected`
  (a path exists iff both have contacts on a shared component) — the 09K gate is therefore
  kept as the explicit eligibility step and distance is used only for ranking, so the two
  contracts stay separately documented.
* **INTENTIONAL**: existing assignments are preserved only while they remain among the
  nearest; otherwise the colonist moves. This narrows the 09K "employment never churns"
  guarantee to "never churns unnecessarily".
* **DEFERRED**: distance is a graph fact only — no travel time, speed, cost or animation is
  attached to it.

## Design Decision

Keep 09K eligibility exactly as-is and add one ordering rule on top:

```text
eligible Workshops
    ↓
shortest operational road distance from the residence
    ↓
lowest distance wins
    ↓
lowest Workshop id breaks an exact tie
```

An existing assignment is kept when it is still eligible **and** still tied at the minimum
distance; otherwise it is re-evaluated. No new persisted field, no schema change, no UI
rule, no economic coefficient touched.

## Distance Contract

* Only `RoadState` with `status === 'operational'` participate; under-construction and
  unknown roads are excluded on both sides.
* Roads are orthogonal cells; adjacency is Manhattan-1 (`areRoadsAdjacent`).
* A building contributes its **contact set**: every orthogonally adjacent operational road
  (`getBuildingRoadAccess(...).roadIds`). Multiple contacts are normal and allowed.
* **Distance = the minimum number of orthogonal road-to-road steps (BFS edges) between any
  contact road of the residence and any contact road of the Workshop.**
* Therefore: sharing a contact road ⇒ `0`; one intermediate road cell ⇒ `1`; and so on.
* The unit is a documented deterministic count of road transitions; it is **not** a
  geometric distance and carries no duration.
* The result is the minimum over **all** contact pairs, so it never depends on which contact
  is discovered first, on record insertion order, on road-id allocation order, or on the
  order of neighbours.
* `null` means "no operational road path exists" — the same condition as the 09K
  connectivity gate being false.

Implementation note: the 09M convention counts **edges**, not cells. The spec's prose ("the
minimum length of the road path") is ambiguous between the two; edges were chosen because it
is the BFS-native value and makes `0` mean "directly connected through a shared or adjacent
contact". The relative ordering — which is all `assignJobs` uses — is identical under either
convention, so this choice cannot change any employment outcome.

## Assignment Rule

`assignJobs` (`src/domain/simulation/phases.ts`), one greedy pass over colonists in
ascending id:

1. **Eligibility (09K, unchanged)**: candidate Workshops are operational, not yet taken by
   an earlier colonist, and `areBuildingsMobilityConnected(residence, workshop)`.
2. **Ranking (09M)**: compute `getRoadDistanceBetweenBuildings(residence, workshop)` for
   each candidate; the preferred Workshop is the smallest distance, tie-broken by the
   smallest id.
3. **Preservation**: if the colonist's current `workplaceId` is still a candidate **and**
   still at the minimum distance (ties included), it is kept — no churn on a stable network.
   Otherwise the colonist moves to the preferred Workshop.
4. **Capacity**: the taken-set plus ascending colonist order guarantees at most one colonist
   per Workshop (capacity stays 1).
5. Colonists without a residence stay unemployed; the function returns the input state
   reference when nothing changes.

## Implementation

| File | Change |
| --- | --- |
| `src/domain/road/road.ts` | New `getRoadDistance(state, sourceRoadIds, targetRoadIds): number \| null` — a local multi-source / multi-target BFS over operational roads returning the minimum edge count between the two sets, or `null`. Placed next to `getConnectedRoadIds`/`getRoadNetworks`; no graph/pathfinder abstraction introduced. |
| `src/domain/mobility/mobility.ts` | New `getRoadDistanceBetweenBuildings(state, a, b): number \| null` — resolves each building's 09E contact roads and delegates to `getRoadDistance`. Header updated for 09M. `areBuildingsMobilityConnected` unchanged. |
| `src/domain/simulation/phases.ts` | `assignJobs` rewritten as one pass: eligibility (09K) → distance ranking + id tie-break (09M) → preserve-if-optimal. The previous preserve-pass/`vacancyIndex` split is gone (the unified loop is smaller and expresses the same capacity contract). |
| `src/domain/jobs/jobs.ts` | Header/comment only: records that the CHOICE among eligible Workshops is distance-ordered. |
| `src/app/main.ts` | `__nova.stats()` gains two diagnostic-only fields: `workshopIds` and `staffedWorkshopIds` (ascending, comma-joined), the minimum observable identity needed by the browser E2E. Never persisted, never rendered. |
| `e2e/roadRun.mjs` | New sections H/I: nearest-Workshop selection (nearer, higher id beats farther, lower id) and reassignment after a shortcut. |
| `tests/spatialEmploymentPreference.test.ts` | New dedicated 09M suite M-A … M-S (23 tests). |
| `tests/jobs.test.ts` | Two assertions that encoded the pre-09M id-order rule updated to the 09M contract (see **Tests**). |
| `tests/employmentMobilityPressure.test.ts` | 09L audit assertions that pinned "id-order decides" updated to "distance decides", with explicit notes that 09M supersedes that finding. |

## Tests

```text
Before 09M : 25 files / 398 tests passing
After  09M : 26 files / 421 tests passing
```

New `tests/spatialEmploymentPreference.test.ts` covers the mandatory blocks:

| Block | Covers |
| --- | --- |
| M-A | direct shared road ⇒ distance 0, employment, production 2, upkeep 1 |
| M-B | two eligible Workshops: the nearer is chosen |
| M-C | the nearest wins even with a **higher** id |
| M-D / M-D2 | exact tie ⇒ lowest id; record order and creation order invariance |
| M-E | residence with 2 contacts measured through its best contact |
| M-F | Workshop with 2 contacts measured through its best contact |
| M-G / M-G2 | shortest contact pair wins over the long leg; independent of discovery order |
| M-H | no operational path ⇒ `null`, ineligible, no production, no upkeep |
| M-I / M-I2 | under-construction road ignored; completing it makes the Workshop eligible |
| M-J | two networks stay two; residence stays multi-network |
| M-K | merging networks makes a Workshop eligible |
| M-L / M-L2 | a shortcut reassigns the worker; removing it restores the previous choice |
| M-M | one Workshop, two colonists ⇒ exactly one job |
| M-N | two Workshops / two colonists on independent networks |
| M-O | reversed record order and reversed road-id order give the same result |
| M-P | repeated `assignJobs` is a no-op reference (no churn) |
| M-Q | distance is pure and does not mutate the state |
| M-R | `SAVE_VERSION` 4; no distance in the save |
| M-S | computing distances leaves the canonical hash untouched; deterministic replay |

**Superseded assertions (not weakened — intentionally changed).** Two `tests/jobs.test.ts`
assertions encoded the pre-09M contract and could not survive it:

* `multiple colonists / multiple workshops: deterministic id ordering` asserted
  `colonist-1 -> building-3`. Under 09M the same fixture resolves by distance
  (`colonist-1 -> building-4` at 4 steps vs 6, then `colonist-2 -> building-3` at 2 steps).
  The test is renamed to `... deterministic nearest-Workshop preference (09M)` and asserts
  the measured 09M outcome.
* `preserves existing valid assignments instead of churning them` forced a colonist into
  the **farther** Workshop and asserted it stayed there. 09M deliberately re-evaluates that
  case. It is replaced by `preserves an existing assignment while it remains the nearest
  Workshop (09M)`, which asserts the surviving guarantee (no churn when already optimal)
  **and** the new rule (moves to a strictly nearer Workshop).

Three 09L audit assertions (`experiment B3`, `experiment D2`, `audit classification summary
S1`) pinned "creation order decides, not geometry" — precisely the finding 09M supersedes.
They were updated to "the nearest wins, creation order is irrelevant", with comments
recording the change. No other 09L measurement changed, and no test was deleted or made
conditional.

## E2E

```text
ROAD E2E       ALL PASS  (14 assertions incl. 09M)
  H nearest Workshop staffed: building-3 (nearer, higher id) beats building-2 (farther, lower id)
  I shortcut reassigned the worker to building-2 (now at distance 0)
TRANSPORT E2E  ALL PASS
PRODUCTION E2E ALL PASS
RESOURCE E2E   ALL PASS
FOOD E2E       ALL PASS
TEMPORAL E2E   ALL PASS
zero console/page errors in every suite
```

Sections H/I are a real player scenario driven only by palette clicks and canvas drags
(`window.__nova` is read-only): build a residence, build the farther Workshop first and the
nearer one second, connect both, then watch the worker pick the nearer one and switch after a
single-cell shortcut. `__nova.stats()` gained only the two diagnostic id lists required to
observe the outcome — no employment UI was built.

## Persistence

* `SAVE_VERSION` remains **4**; no schema change.
* Road distance is derived only: no `distance`, `roadDistance` or `preference` field exists in
  the serialized save (M-R).
* `save → load` preserves state and hash; `workplaceId` remains the only canonical employment
  field.

## Determinism

* `getRoadDistance` discovers neighbours in ascending road-id order and returns the first
  target dequeued, so the result is order-independent and stable (M-Q).
* `assignJobs` iterates colonists ascending id and Workshops ascending id (M-N, M-O).
* Reversed record insertion order and reversed road-id allocation order produce identical
  assignments and hashes (M-D, M-O).
* Repeated `assignJobs` on a stable network returns the same state reference (M-P).

## Architecture Review

```text
domain (road.ts BFS primitive, mobility.ts pair wrapper, phases.ts assignment)
  ↓
application queries (unchanged; already delegate to the domain)
  ↓
rendering / UI (only two diagnostic stat fields added)
```

The rule lives entirely in the domain. The renderer contains no business logic; the E2E
contains no duplicated domain calculation (it reads `__nova.stats()`). No connectivity logic
was duplicated: contacts come from 09E, connectivity from 09D, exactly as before.

## Known Limitations

* Distance carries **no** duration or cost: two Workshops at 0 and 40 steps are equally
  "commutable" once the nearer one is taken — there is no productivity or upkeep difference.
* If every candidate Workshop is already taken, distance is not consulted (capacity is 1 per
  Workshop), so a colonist may still be unemployed next to a reachable-but-staffed Workshop.
* `assignJobs` runs one BFS per (colonist, candidate Workshop) per tick; at the current scale
  (a handful of buildings) this is irrelevant, and no cache is introduced on purpose. It is
  noted as the first thing to revisit if the colony grows large.
* Ties are broken by id, so in a perfectly symmetric layout the older Workshop wins —
  deterministic but not "spatially" meaningful.
* The distance convention counts edges (see **Distance Contract**); the spec's prose admits a
  cell-count reading, which would only shift every value by one.

## Deferred

Not implemented in 09M: colonist movement, movement animation, travel time, commute cost or
penalty, vehicles, public transit, congestion, road capacity, generic pathfinding, cargo,
traffic simulation, road maintenance/upkeep, road tiers, upgrades, highway geometry,
demolition, pollution, money, migration, desirability, cached distance, persisted network
metrics, and any employment UI beyond the two diagnostic stat fields.

## As-Built

Final report (the §22 checklist, answered from the implemented state):

### Gameplay

1. **Two accessible Workshops now produce different spatial choices?** Yes — M-B/M-C and
   Road E2E section H (`building-3`, the nearer but higher-id Workshop, is staffed).
2. **Does road distance really influence employment?** Yes — M-L and Road E2E section I show
   a single added road moving the worker.
3. **Is the id only a tie-break?** Yes — M-C proves distance outranks a lower id; M-D shows
   the id deciding only an exact tie.
4. **Does the network remain an eligibility constraint?** Yes — M-H/M-I keep the 09K gate
   (no path ⇒ ineligible), and distance is only consulted for already-eligible candidates.
5. **Is road cost still the only direct economic consequence of length?** Yes for the
   economy: building, road, production, upkeep and storage coefficients are untouched. Length
   now also steers the employment CHOICE, which is a distribution effect, not a new cost.

### Technical

6. **Pure and derived?** Yes — M-Q, M-S; no cache, no persistence.
7. **Deterministic?** Yes — M-O, M-Q; ascending-id BFS discovery.
8. **Under-construction roads ignored?** Yes — M-I/M-I2.
9. **Multi-contacts correct?** Yes — M-E/M-F/M-G (minimum over all pairs).
10. **Networks remain separate?** Yes — M-J; merge only on a real road bridge (M-K).
11. **No premature generic pathfinding?** Correct: one local BFS (`getRoadDistance`) plus one
    building-pair wrapper (`getRoadDistanceBetweenBuildings`). No `Pathfinder`, `GraphEngine`,
    `TransportGraph` or `NetworkService` was introduced.
12. **No derived state persisted?** Correct — M-R, `SAVE_VERSION` 4.

### Regression

13. **Production unchanged outside the employment effect?** Yes — coefficients and the
    road-access gate are untouched; only which Workshop is staffed can change.
14. **Upkeep unchanged?** Yes — still operational + staffed, one per staffed Workshop.
15. **Storage unchanged?** Yes — operational Workshop count, staffing-independent.
16. **`SAVE_VERSION` unchanged?** Yes — 4.
17. **Hash stable?** Yes — M-S; distance is absent from the hash.
18. **Deterministic replays?** Yes — M-O/M-P/M-S.
19. **Clean browser E2E?** Yes — ROAD/TRANSPORT/PRODUCTION/RESOURCE/FOOD/TEMPORAL pass with
    zero console/page errors; GPU is blocked by SwiftShader (**ENVIRONMENTAL BLOCKER**, see
    below).

### GPU / environment

```text
GPU E2E: FAIL — ENVIRONMENTAL BLOCKER
unmaskedRenderer "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)"
```

The renderer is untouched: this environment simply exposes CPU rasterisation instead of a
hardware GPU, which trips the suite's software-renderer guard. Reported, not "fixed".

### Design

```text
A — Strong new spatial pressure  (primary)
B — Useful but limited pressure  (qualifier)
E — Missing future pressure      (qualifier)
```

* **A (strong)**: layout now decides *who works where*. M-C and E2E H show a nearer,
  higher-id Workshop beating a farther, lower-id one, and M-L/E2E I show a single new road
  moving a worker. Before 09M both outcomes were id-determined, so this is a genuinely new
  causal relationship, not a re-skin.
* **B (limited)**: the aggregate economy is unchanged. When the same number of Workshops ends
  up staffed, production, upkeep and storage totals are identical (M-J, M-N); only the
  *distribution* of workers differs. Capacity 1 and the absence of any commute cost cap how
  much pressure the rule can generate. So the pressure is real but localised.
* **E (missing)**: distance is now a first-class computed fact with no duration, cost or
  productivity attached. A future step could attach a commute cost/duration to it, which is
  the next natural causal layer — deliberately not implemented here.

### Discovered / Derived / Intentional / Deferred

```text
DISCOVERED   getBuildingRoadAccess already exposes every contact road; iterateRoads already
             guarantees ascending-id BFS discovery.
DERIVED      distance !== null is equivalent to the 09K connectivity gate; because
             assignJobs recomputes every tick, distance needs no cache or invalidation.
INTENTIONAL  the 09K "never churns" guarantee is narrowed to "never churns unnecessarily":
             an assignment survives only while it is still tied at the minimum distance.
DEFERRED     travel time, commute cost, congestion, transit, road upkeep, road tiers,
             demolition, cached distance, persisted network metrics, employment UI.
```

### Scope audit

```text
files changed: 9 (4 domain/app sources, 1 app debug projection, 3 test files, 1 E2E script)
no new persisted field · no new resource · no schema change · no economic coefficient change
no generic pathfinding abstraction · no business logic in the renderer
```

### Commit

* Message: `Step 09M: spatial employment preference`
* Parent: `e65ed81` (Step 09L: Employment Mobility Pressure Audit)
* Commit hash: recorded on the commit itself.

### Final verification summary

```text
tests      : 26 files / 421 tests passing (was 25 / 398)
lint       : PASS
typecheck  : PASS
build      : PASS
e2e        : ROAD / TRANSPORT / PRODUCTION / RESOURCE / FOOD / TEMPORAL ALL PASS
gpu        : ENVIRONMENTAL BLOCKER (SwiftShader), renderer untouched
persistence: SAVE_VERSION 4, save/load/hash stable, distance not persisted
determinism: replay, insertion-order and road-id-order invariant
```

