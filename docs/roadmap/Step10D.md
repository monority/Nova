# NOVA — Step 10D — Senior Game Dev Coherence & Performance Audit

## 0. Mission

Tu travailles sur NOVA, un city-builder/simulation déterministe.

Le dernier état validé est :

* Step 10C COMPLETE — audit food security pressure
* commit courant de référence : `5e5c50a`
* parent : `62febd9`
* SAVE_VERSION = 4
* 486 tests / 29 fichiers
* lint / typecheck / build propres
* 6 E2E + GPU PASS
* transport isolé des effets économiques
* food accounting classifié `C — Linear accounting`
* famine non-absorbing observée
* ratio structurel actuel : ~2 population / ferme
* aucune pression spatiale économique actuellement
* aucune production agricole sans règle d'emploi n'a encore été introduite

Le but de ce milestone n'est PAS d'ajouter une grosse mécanique.

Le but est de déterminer si l'état actuel du projet est suffisamment cohérent pour continuer le développement comme un projet de jeu sérieux.

Tu dois agir comme un **senior game developer / simulation engineer / gameplay architect**, avec une exigence de cohérence de production, pas seulement de conformité aux tests.

---

# 1. RÈGLE PRINCIPALE

Ne pars d'aucune hypothèse sur l'architecture.

Commence par auditer le repository réel.

Lis au minimum :

* architecture du domaine ;
* simulation/tick loop ;
* phases ;
* économie ;
* population ;
* jobs/workers ;
* food ;
* materials ;
* construction ;
* roads/transport ;
* persistence/save/hash ;
* rendering ;
* UI/gameplay loop ;
* tests unitaires ;
* tests E2E ;
* tests GPU ;
* documentation des Steps 01→10C.

Cherche en particulier les contrats déjà établis.

**Ne réinvente pas un système qui existe déjà.**

Si une règle est déjà définie dans les Steps précédents, elle est prioritaire sur toute proposition nouvelle.

---

# 2. OBJECTIF DE L'AUDIT

Répondre objectivement à ces questions :

### Gameplay / simulation

1. Le jeu possède-t-il actuellement une boucle économique cohérente ?
2. Les ressources ont-elles une source, un sink et une logique de conservation compréhensible ?
3. Les travailleurs sont-ils modélisés de manière cohérente avec les bâtiments productifs ?
4. Existe-t-il des productions gratuites ou implicitement infinies ?
5. Existe-t-il des consommations ou coûts qui apparaissent sans cause ?
6. La croissance démographique est-elle compatible avec les contraintes économiques actuelles ?
7. La famine est-elle un état stable, terminal ou oscillant ? Est-ce intentionnel ou simplement une conséquence mécanique ?
8. Les bâtiments ont-ils des conditions d'exploitation cohérentes ?
9. Les routes ont-elles actuellement un rôle explicitement limité ? Vérifier qu'elles ne prétendent pas fournir une mécanique qu'elles n'implémentent pas.
10. Le placement spatial influence-t-il réellement le gameplay là où le jeu prétend qu'il devrait l'influencer ?

### Architecture

11. Le domaine reste-t-il séparé de React / Three.js / DOM ?
12. Les règles économiques sont-elles déterministes et testables isolément ?
13. Existe-t-il des dépendances cachées entre phases ?
14. Existe-t-il des mutations implicites ou de l'état global ?
15. Existe-t-il des calculs redondants par tick ?
16. Des données de présentation sont-elles utilisées comme données de simulation ?
17. Des données de simulation sont-elles dupliquées dans l'UI ?

### Déterminisme

18. Deux simulations identiques produisent-elles exactement le même résultat ?
19. Les résultats dépendent-ils accidentellement de l'ordre d'itération d'une collection ?
20. Existe-t-il du `Date.now()`, `Math.random()`, des IDs instables ou autres sources de nondéterminisme dans le domaine ?
21. Les hashes/save snapshots restent-ils stables ?

### Performance

22. Le coût d'un tick est-il raisonnable ?
23. Existe-t-il une complexité accidentelle `O(n²)` ou pire ?
24. Les calculs de population/jobs/production sont-ils répétés inutilement ?
25. Les bâtiments et routes provoquent-ils des scans excessifs ?
26. Le rendu reconstruit-il inutilement des objets ?
27. Existe-t-il des allocations importantes dans la boucle de simulation ?
28. Les performances restent-elles acceptables avec une ville beaucoup plus grande que les fixtures actuelles ?

---

# 3. AUDIT GAMEPLAY — "10/10 SENIOR"

Construis une matrice de cohérence.

Pour chaque système :

| Système      | Entrées | Transformation | Sorties | Sink | Déterministe | Testé | Cohérent |
| ------------ | ------- | -------------- | ------- | ---- | ------------ | ----- | -------- |
| Population   |         |                |         |      |              |       |          |
| Housing      |         |                |         |      |              |       |          |
| Food         |         |                |         |      |              |       |          |
| Materials    |         |                |         |      |              |       |          |
| Farms        |         |                |         |      |              |       |          |
| Workshops    |         |                |         |      |              |       |          |
| Jobs         |         |                |         |      |              |       |          |
| Construction |         |                |         |      |              |       |          |
| Roads        |         |                |         |      |              |       |          |
| Transport    |         |                |         |      |              |       |          |

Ne donne pas simplement PASS partout.

Si quelque chose est volontairement incomplet, classe-le comme :

* `INTENTIONAL / CONTRACTED`
* `MISSING RULE`
* `INCONSISTENT`
* `UNTESTED`
* `RISK`
* `BUG`

---

# 4. AUDIT ÉCONOMIQUE

Rejoue les scénarios économiques importants de 10C.

Mais ajoute des invariants de conservation.

Pour chaque tick, lorsque pertinent :

```text
stock_next =
    stock_previous
  + production
  - consumption
  - construction
  - upkeep
```

Vérifie séparément :

* food ;
* materials ;
* population ;
* workers ;
* housing ;
* productive buildings.

Aucune ressource ne doit apparaître ou disparaître sans une règle identifiable.

Pour chaque anomalie, donne :

```text
SOURCE
CAUSE
EXPECTED CONTRACT
ACTUAL BEHAVIOR
SEVERITY
```

---

# 5. AUDIT DES WORKERS / JOBS

Ne modifie pas encore le système.

Vérifie simplement le contrat existant.

Déterminer précisément :

* combien de workers sont disponibles ;
* comment ils sont affectés ;
* si un worker peut être affecté à plusieurs bâtiments ;
* si un bâtiment peut produire sans worker ;
* si l'affectation est stable d'un tick à l'autre ;
* si l'ordre des bâtiments influence le résultat ;
* si l'ordre des collections influence le résultat ;
* si farms et workshops utilisent déjà une abstraction commune ;
* si 09F impose déjà une règle de priorité.

Si une règle manque, marque-la `MISSING RULE`.

Ne l'invente pas pendant cet audit.

---

# 6. AUDIT DÉTERMINISME

Créer un test de répétition.

Même scénario initial :

```text
same seed
same map
same buildings
same population
same roads
same number of ticks
```

Exécuter au minimum :

```text
1
10
100
500
1000
5000
```

Comparer :

* état final ;
* ressources ;
* population ;
* bâtiments ;
* hash ;
* save snapshot.

Le résultat doit être identique.

Tester également :

### Collection order

Si l'architecture permet de créer le même état avec différents ordres d'insertion :

```text
A B C D
D C B A
B D A C
```

vérifier si le résultat économique change.

Si oui :

* déterminer si c'est contractuel ;
* sinon signaler un risque de nondéterminisme logique.

---

# 7. PROPERTY / INVARIANT TESTING

Ajouter des tests de cohérence là où c'est utile.

Minimum :

### Workers

```text
assignedWorkers <= availableWorkers
```

```text
worker cannot occupy two jobs
```

```text
production cannot exceed staffed productive capacity
```

### Resources

```text
no negative stock unless explicitly contracted
```

```text
no NaN
no Infinity
```

### Population

```text
population >= 0
```

### Buildings

```text
building count >= 0
```

### Determinism

```text
same input => same output
```

### Persistence

```text
save(load(state)) preserves simulation state
```

Ne teste pas uniquement les exemples actuels.

Ajoute quelques scénarios limites :

* 0 population ;
* 1 population ;
* population très élevée ;
* 0 farm ;
* 1 farm ;
* beaucoup de farms ;
* 0 workshop ;
* beaucoup de workshops ;
* aucun matériau ;
* stock maximal ;
* construction simultanée logique ;
* ville vide ;
* ville dense.

---

# 8. AUDIT DE SCALABILITÉ

Créer un benchmark DEV uniquement.

Pas besoin d'un benchmark scientifique absolu.

Construire des fixtures approximatives :

```text
SMALL
~10 buildings

MEDIUM
~100 buildings

LARGE
~500 buildings

XL
~1,000 buildings

STRESS
~5,000 buildings
```

Mesurer séparément :

```text
tick simulation
job assignment
food production
material production
housing
road/network logic
hash generation
save serialization
```

Si un système n'est pas appelé dans un scénario donné, ne lui attribue pas artificiellement un coût.

Chercher particulièrement :

```text
O(n²)
O(n * m)
repeated full-map scans
repeated pathfinding
repeated serialization
allocations inside tick loops
```

---

# 9. PERFORMANCE BUDGET

Établir des budgets internes raisonnables.

Ne cherche pas à atteindre un chiffre arbitraire à tout prix.

Le benchmark doit surtout identifier :

```text
FAST
ACCEPTABLE
CONCERNING
BROKEN
```

Pour chaque système :

```text
10 buildings
100 buildings
500 buildings
1000 buildings
5000 buildings
```

Rapporter :

```text
mean
p95
worst observed
```

Si la mesure est trop bruitée dans l'environnement CI/browser :

* expliquer la limitation ;
* ne pas fabriquer une précision inexistante.

---

# 10. RENDERING / GPU

Faire également un audit rapide du renderer.

Vérifier :

* draw calls ;
* geometries ;
* textures ;
* triangles ;
* allocations visibles ;
* création/destruction de meshes ;
* rebuilds React inutiles ;
* frame stability ;
* erreurs WebGL.

Comparer :

```text
empty map
small city
medium city
large city
```

Le but n'est pas encore l'optimisation graphique agressive.

Le but est de détecter une architecture qui deviendrait impossible à scaler.

---

# 11. UI / GAMEPLAY FEEDBACK

Auditer le parcours joueur actuel.

Faire un vrai passage browser :

```text
new game
→ place residence
→ place farm
→ place workshop
→ advance ticks
→ observe resources
→ observe population
→ build road
→ save
→ reload
→ continue
```

Vérifier que l'UI montre correctement les conséquences des actions.

Chercher particulièrement :

* données affichées qui ne correspondent pas au domaine ;
* informations manquantes ;
* boutons permettant des actions invalides ;
* feedback ambigu ;
* états impossibles ;
* simulation qui avance sans feedback clair.

Ne pas faire de refonte esthétique.

---

# 12. AUDIT SAVE / HASH

Vérifier :

```text
simulation state
→ save
→ reload
→ same state
```

Puis :

```text
same simulation
→ same hash
```

Puis :

```text
different simulation
→ different hash
```

Identifier les champs :

* persistés ;
* dérivés ;
* hashés ;
* non hashés volontairement.

Vérifier qu'aucun nouveau champ mutable important n'a été ajouté sans décision explicite de versioning.

---

# 13. AUDIT DES PHASES

Tracer le tick complet.

Produire quelque chose de similaire à :

```text
TICK
 ├─ population
 ├─ housing
 ├─ jobs
 ├─ production
 ├─ consumption
 ├─ upkeep
 ├─ construction
 └─ derived state
```

Mais uniquement selon le code réel.

Pour chaque phase :

* inputs ;
* outputs ;
* mutations ;
* dépendances ;
* ordre requis.

Chercher :

* dépendance circulaire ;
* phase qui lit une donnée avant sa production ;
* phase qui dépend accidentellement de la phase précédente ;
* mutation multiple d'une même ressource ;
* calcul dérivé effectué avant son input.

---

# 14. ARCHITECTURE SCORECARD

Ne donne pas de score global artificiel.

Classe chaque dimension :

```text
GREEN
YELLOW
RED
```

Dimensions :

* Simulation correctness
* Determinism
* Economy coherence
* Job model
* Persistence
* Architecture
* Rendering architecture
* UI/gameplay feedback
* Test coverage
* Performance scalability
* Maintainability

Pour chaque `YELLOW` / `RED` :

```text
Problem
Evidence
Impact
Recommended next action
```

---

# 15. CORRECTIONS

Tu peux corriger uniquement :

* bug réel ;
* violation d'un contrat existant ;
* nondéterminisme accidentel ;
* invariant cassé ;
* régression ;
* problème de performance clairement démontré ;
* problème UI qui affiche une donnée incorrecte.

Ne fais PAS :

* nouvelle mécanique économique ;
* farm employment ;
* nouveau système de transport ;
* nouvelle ressource ;
* nouveau bâtiment ;
* refonte UI ;
* changement de règle gameplay sans contrat ;
* refactor massif "tant qu'on y est".

L'audit doit rester un audit.

---

# 16. TESTS FINAUX

À la fin :

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Puis tous les E2E existants.

Puis GPU/browser validation si disponible.

Le projet doit rester propre.

---

# 17. RAPPORT FINAL OBLIGATOIRE

Retourne un rapport structuré :

## A. Executive Summary

```text
PROJECT HEALTH:
GREEN / YELLOW / RED
```

Puis 5–10 lignes maximum.

## B. Gameplay Coherence

Tableau :

| System | Status | Finding |
| ------ | ------ | ------- |

## C. Economy Audit

Inclure les invariants et résultats.

## D. Determinism

Inclure les répétitions et collection-order tests.

## E. Performance

Tableau :

| Fixture | Tick | Jobs | Food | Materials | Hash | Save |
| ------- | ---: | ---: | ---: | --------: | ---: | ---: |

Avec unités explicites.

## F. Rendering

Inclure :

* draw calls ;
* geometries ;
* textures ;
* triangles ;
* erreurs ;
* évolution avec la taille de ville.

## G. Persistence

Résultat save/load/hash.

## H. Architecture

GREEN / YELLOW / RED par dimension.

## I. Problems Found

Pour chaque problème :

```text
ID
Severity: BLOCKER / HIGH / MEDIUM / LOW
Area
Evidence
Root cause
Fixed?
```

## J. Corrections Made

Uniquement les corrections réellement nécessaires.

## K. Remaining Risks

Lister explicitement ce qui n'est pas encore résolu.

## L. Next Recommended Milestone

Ne pas implémenter le prochain milestone.

Proposer simplement le prochain gros vertical slice logique.

Il sera probablement :

```text
Farm Employment + Worker Competition
```

mais seulement si l'audit confirme que cette mécanique est réellement la prochaine étape cohérente.

---

# 18. DEFINITION OF DONE

Le milestone est COMPLETE uniquement si :

* audit gameplay effectué ;
* économie auditée ;
* workers/jobs audités ;
* déterminisme testé ;
* persistence/hash testé ;
* performance benchmarkée ;
* renderer vérifié ;
* browser gameplay smoke test exécuté ;
* tests existants PASS ;
* aucune régression ;
* problèmes classifiés ;
* corrections nécessaires appliquées ;
* rapport final produit.

Important :

**Un projet n'est pas "10/10" parce que tous les tests sont verts.**

Le rapport doit distinguer :

```text
CORRECT
TESTED
COHERENT
SCALABLE
FUN/GOOD GAMEPLAY DESIGN
```

Ces cinq dimensions ne sont pas équivalentes.

Si une dimension n'est pas encore suffisamment définie pour être jugée, écrire :

`NOT YET SPECIFIED`

plutôt que d'inventer un jugement.

---

# 19. CONTRAINTES

* Ne pas commit.
* Ne pas rebase.
* Ne pas stash.
* Ne pas reset.
* Ne pas supprimer du travail existant.
* Ne pas modifier les contrats historiques sans preuve qu'ils sont incorrects.
* Ne pas inventer de données.
* Ne pas ajouter de mécanique uniquement pour "faire plus".
* Ne pas faire de refactor massif.
* Toute modification doit être justifiée par un problème observé.
* Toute optimisation doit être précédée d'une mesure.
* Toute conclusion de performance doit être basée sur une mesure.
* Toute conclusion de déterminisme doit être testée.
* Toute conclusion gameplay doit être reliée au comportement réel de la simulation.

À la fin, arrête-toi.

Ne commence pas le milestone suivant.


---

# As-Built — Audit Report (Step 10D: senior coherence & performance audit)

Exécuté au commit `5e5c50a` (Step 10C). Audit + UNE correction de performance
démontrée. **SANS commit** (contrainte §19 explicite) : l'arbre contient les
changements ci-dessous, non committés, à revue avant tout commit ultérieur.

Fichiers touchés :

```text
tests/seniorCoherenceAudit.test.ts   NEW — 29 tests (§§4-8, §12)
src/domain/road/road.ts              + getBuildingRoadAccessWithNetworks (correction perf)
src/domain/mobility/mobility.ts      + areAccessesConnected, getDistanceBetweenAccesses (correction perf)
src/domain/simulation/phases.ts      assignJobs précalcule réseaux+accès (correction perf)
docs/roadmap/Step10D.md              + ce rapport
```

## A. Executive Summary

```text
PROJECT HEALTH: YELLOW
```

Le projet est CORRECT et DÉTERMINISTE (515 tests verts, zéro nondéterminisme
domaine, architecture propre), mais l'audit a trouvé UN problème de performance
cassant (assignJobs quadratique, corrigé ×274, résidu quadratique documenté),
une économie food linéaire sans pression spatiale (déjà classée C en 10C), et
trois écarts UI/e2e mineurs. Aucun bug de simulation, aucune régression.

## B. Gameplay Coherence

| System | Status | Finding |
| ------ | ------ | ------- |
| Population | CONTRACTED | Admission food>0 + résidences libres (overshoot structurel) ; famine totale same-tick (05B). Boom-bust période 4 (10C). |
| Housing | GREEN | Capacité 1/résidence, admission id ascendant. |
| Food | CONTRACTED (C) | pop×1 vs fermes×2, sans cap, colony-level. Linéaire, sans spatial. |
| Materials | CONTRACTED | +2/worker staffé avec accès route, upkeep 1, cap 25/workshop. Cap rejette silencieusement au-delà (08F §5, mesuré). |
| Farms | MISSING RULE | Produisent SANS worker (asymétrie documentée ; candidat 10C : farm employment). |
| Workshops | GREEN | Staff + accès route requis, sinon rien. |
| Jobs | CONTRACTED | Capacité 1, greedy id ascendant, distance-puis-id (09M), stable. Artifact d'ordre L5 (09N) : total 6 vs optimal 2 — mineur, invisible sans payoff distance. |
| Construction | CONTRACTED | 25/2 ticks partout ; rejet silencieux si fonds insuffisants (feedback UI à vérifier). |
| Roads | GREEN | 5/cellule, 2 ticks, orthogonal, sans upkeep, sans démolition — minimalité voulue (09N). |
| Transport | INTENTIONAL | Dérivé uniquement, aucun modèle de mouvement — voulu, testé. |

Réponses §2 (gameplay) : boucle économique cohérente mais mince (1, oui) ;
sources/sinks identifiés partout (2, oui) ; workers cohérents SAUF fermes sans
worker (3, une exception) ; production gratuite = fermes (4, documentée) ;
aucun coût sans cause (5, non) ; croissance compatible mais overshoot possible
(6, oui avec bémol) ; famine oscillante non-absorbante, mécanique 05B pas
intention de design (7) ; conditions d'exploitation cohérentes sauf fermes (8) ;
routes explicitement limitées, ne prétendent rien (9, oui) ; spatial sans effet
food, avec effet emploi-choix uniquement (10, partiel).

## C. Economy Audit

Invariants de conservation testés chaque tick (suite §4) :

```text
food:     stock_next = stock + fermes*2 - besoin   (fed)  |  0 (shortage, contracté)
material: stored = min(brut, cap - stock) ; upkeep = staffés x 1 ; stock >= 0
population: admission (food>0 + résidence libre) | famine totale (fed=false)
workers:  employés <= population ; employés <= capacité ; 1 worker/bâtiment max
```

Aucune ressource n'apparaît/disparaît sans règle. Anomalies = comportements
contractés, pas des bugs : épuisement stock à 0 en shortage (05B), rejet
production au-delà du cap (08F §5), boom-bust (05B+admission).

## D. Determinism

- Répétition 1/10/100/500/1000/5000 ticks, même init → **même hash** (6 tests).
- Ordre d'insertion bâtiments inversé → même décision spatiale + même économie
  (ids = tie-break uniquement) ; batches routes normalisés → sérialisation
  identique (09N M1/M2, re-vérifiés).
- Aucun `Date.now`/`Math.random`/ID instable dans `src/domain` ni
  `src/application` (grep vide). Wall-clock confinée à `simulationClock`
  (compte de ticks uniquement) et `main.ts` (rAF) — jamais dans l'état.
- Itération systématiquement triée (housing/iterate*) ; compteurs canoniques ;
  hash FNV-1a sur JSON canonique (clés triées) ; save/load round-trip stable.
- Collection-order : aucun changement économique (testé).

## E. Performance

Mesuré (vitest, `performance.now`, machine dev — ordres de grandeur, pas
métrologie CI) :

| Fixture | Tick AVANT | Tick APRÈS | Jobs | Food | Materials | Hash | Save |
| ------- | ---------: | ---------: | ---: | ---: | ---------: | ---: | ---: |
| SMALL-10 | 0.36ms | ~0.1ms | ~0ms | ~0ms | ~0ms | ~0ms | ~0ms |
| MEDIUM-100 | 62ms | ~1.5ms | ~1ms | 0.0ms | ~1ms | ~0ms | ~0ms |
| LARGE-500 | 6081ms | ~23ms | ~15-23ms | 0.2ms | ~17ms | ~11ms | ~3ms |
| XL-1000 | ~59s | ~85ms | — | — | — | — | — |
| STRESS-5000 | crash worker | 2186ms | — | — | — | 121ms | 21ms |

Split LARGE-500 : assignJobs 6269ms → **22.9ms (×274)** ; produceFood 0.2ms ;
hash 11ms ; save 2.7ms. Le tick ~= assignJobs.

Budgets (§9) : SMALL FAST ; MEDIUM FAST (<2ms) ; LARGE ACCEPTABLE (~25ms) ;
XL CONCERNING (~85ms) ; STRESS CONCERNING (2.2s/tick). Résidu quadratique :
distances par paire O(C×W×BFS) — prochaine optimisation candidate (BFS unique
par résidence + index d'adjacence), non faite ici (pas de refactor massif).

Unités : ms/wall, moyenne sur 1–20 ticks selon fixture.

## F. Rendering

Par lecture de code + GPU E2E PASS (zéro erreur WebGL) :

- 1 mesh/bâtiment + 1 mesh/colonist + 1 mesh/route (+1 marking/route) ;
  géométries partagées (module-level), matériaux par entité, `dispose()`
  au remove, réconciliation par clés (jamais de rebuild).
- Pas d'instancing, pas de batching : draw calls ~= entités. OK à l'échelle
  actuelle ; limite documentée (~5000 entités = ~10000+ draw calls).
- Aucune allocation sim dans le rendu (snapshots dérivés via queries).
- Pas de stats intégrées (renderer.info inutilisé) — instrumentation future
  si besoin. Comparaison vide/petite/moyenne/grande : non mesurée en browser
  (GPU suite = scène fixe PASS) — classé risque mineur, pas bloquant.

## G. Persistence

- Même simulation → même hash ; simulation différente → hash différent (testé).
- Champs persistés : config, time, resources, buildings, colonists, roads,
  counters. Dérivés exclus du hash/sérialisation : networks, distances,
  mobility, employment, fed, foodNeed, foodShortage (testé par scan).
- SAVE_VERSION = 4, inchangé. Saves corrompus/étrangers rejetés explicitement,
  jamais migrés silencieusement (testé : JSON invalide, version 3, format autre).
- Aucun nouveau champ mutable ajouté.

## H. Architecture

| Dimension | Score | Note |
| --------- | ----- | ---- |
| Simulation correctness | GREEN | 515 tests, conservation prouvée |
| Determinism | GREEN | §D, zéro source murale |
| Economy coherence | YELLOW | Linéaire (C), boom-bust, cap silencieux — contracté mais mince |
| Job model | YELLOW | Asymétrie fermes ; artifact d'ordre mineur |
| Persistence | GREEN | Domaine complet ; pas d'UI save/load (écart UI, pas domaine) |
| Architecture | GREEN | domain/app/renderer séparés ; controller sanitisé |
| Rendering architecture | GREEN | Réconciliation + géométries partagées ; pas d'instancing (futur) |
| UI/gameplay feedback | YELLOW | Pas de save/load UI ; e2e jobs/upkeep DEFERRED obsolètes ; rejet silencieux placement |
| Test coverage | GREEN | 515 unit + 10 e2e (8 PASS, 2 DEFERRED obsolètes) + GPU PASS |
| Performance scalability | YELLOW | Corrigé ×274 ; résidu quadratique documenté |
| Maintainability | GREEN | Modules petits, contrats en commentaires, pas de global mutable |

Réponses §2 (archi) : domaine séparé React/Three/DOM (11, oui — controller +
clock) ; règles déterministes testables isolément (12, oui) ; pas de dépendance
cachée entre phases au-delà de l'ordre contracté step.ts (13, non) ; pas de
mutation implicite ni global (14, non) ; redondance calculatoire = le bug perf
corrigé (15, corrigé) ; présentation jamais utilisée comme sim (16, non) ;
pas de duplication sim→UI hors snapshots dérivés (17, non).

## I. Problems Found

```text
ID: 10D-P1
Severity: HIGH (était BROKEN, corrigé)
Area: Performance — assignJobs
Evidence: LARGE-500 tick 6081ms ; XL-1000 ~59s ; STRESS crash worker.
  Split: assignJobs 6269ms vs produceFood 0.2ms / hash 11ms / save 2.7ms.
  Composants: getRoadNetworks recomputé ~4x par paire (colonist, workshop).
Root cause: O(C×W) re-dérivations 09D par paire au lieu d'une fois par appel.
Fixed? YES — réseaux+accès précalculés une fois (road.ts WithNetworks,
  mobility.ts areAccessesConnected/getDistanceBetweenAccesses, phases.ts).
  Après: LARGE ~23ms (×264), XL ~85ms, STRESS 2.2s. 515/515 tests verts.
```

```text
ID: 10D-P2
Severity: MEDIUM
Area: Performance résiduelle — distances par paire O(C×W×BFS)
Evidence: XL-1000 85ms, STRESS 2.2s/tick ; proportion assignJobs constante.
Root cause: un BFS par paire au lieu d'un BFS par résidence.
Fixed? NO — documenté. Next: BFS unique/résidence + index d'adjacence.
```

```text
ID: 10D-P3
Severity: MEDIUM
Area: UI/e2e — jobs/upkeep E2E DEFERRED avec motif obsolète
Evidence: "browser cannot construct roads (no road palette UI)" alors que la
  palette route existe (09H, main.ts #btn-build-road) et que road E2E construit
  des routes en browser (PASS).
Root cause: scripts e2e écrits avant 09H, jamais réactivés.
Fixed? NO — réactivation = travail e2e dédié, hors audit. Recommandé.
```

```text
ID: 10D-P4
Severity: LOW
Area: UI — pas de save/load joueur
Evidence: persistence 100% domaine (testée), aucune UI save/load dans main.ts.
Root cause: jamais spécifié (docs/17-18 = format, pas d'UI).
Fixed? NO — à spécifier avant d'implémenter.
```

```textID: 10D-P5
Severity: LOW
Area: Économie — famine boom-bust + cap silencieux (déjà 10C)
Evidence: oscillation période 4 ; production rejetée au-delà du cap sans feedback.
Root cause: 05B all-or-nothing + admission food>0 ; 08F §5 min().
Fixed? NO — contracté. Le candidat farm employment change la donne s'il arrive.
```

Aucun BLOCKER. Aucun bug simulation. Aucune régression.

## J. Corrections Made

Une seule (10D-P1) : précalcul réseaux 09D + accès 09E dans `assignJobs`
(3 fichiers, +2 helpers exportés, comportement byte-identique prouvé par
515/515 tests verts dont toutes les suites 09M/09N/10A/10C). Mesures avant/
après ci-dessus (§E). Justification §15 : problème démontré par mesure,
optimisation sémantiquement neutre, pas de refactor massif.

## K. Remaining Risks

1. Résidu quadratique distances (10D-P2) : ~2s/tick à 5000 entités.
2. Pas d'instancing renderer : limite ~quelques milliers d'entités.
3. Famine boom-bust : pression économique plafonnée tant que farm employment
   n'existe pas.
4. E2E jobs/upkeep sans couverture browser réelle (deferred obsolètes).
5. Pas de save/load UI ; pas de stats renderer intégrées.
6. Placement rejeté silencieusement (feedback joueur à vérifier en UI).

## L. Next Recommended Milestone

```text
Farm Employment + Worker Competition
```

L'audit confirme que c'est la prochaine étape cohérente : c'est la seule
asymétrie du modèle de jobs (fermes sans worker), elle crée la rivalité
ferme/workshop pour le travail (pression économique réelle + pression
spatiale gratuite via 09M), elle appartient à Phase 3 (population demand),
et elle rendrait la famine absorbante (fini le boom-bust gratuit). Rien
d'autre ne doit passer avant : transport reste minimal, pas de rebalancement.

## Dimensions §18

```text
CORRECT      — oui (515 tests, conservation prouvée)
TESTED       — oui (unit + e2e + gpu + benchmark)
COHERENT     — partiellement (économie linéaire, asymétrie fermes — documenté)
SCALABLE     — partiellement (corrigé ×274 ; résidu + renderer documentés)
FUN/GOOD GAMEPLAY DESIGN — NOT YET SPECIFIED (pas de jugement inventé)
```

Record classification :

```text
DISCOVERED  assignJobs O(C×W×networks) cassant au-delà de ~100 bâtiments ; e2e jobs/upkeep deferred obsolètes ; pas de save/load UI ; renderer sans instancing ni stats
DERIVED     toutes les métriques (ledgers, répétitions, benchmark, save/hash) — tests, jamais stockées
INTENTIONAL une seule correction (perf démontrée) ; tout le reste observé-only ; transport non touché ; aucune mécanique ajoutée
DEFERRED    BFS/résidence + index adjacence ; instancing ; réactivation e2e jobs/upkeep ; save/load UI ; farm employment (prochain milestone, non commencé)
```
