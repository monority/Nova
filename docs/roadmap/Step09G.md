# NOVA — Step 09G — Residential-to-Work Mobility Contract

## Context

NOVA a maintenant :

```text
09A  Transport network foundation
09B  Road infrastructure contract
09C  Road construction
09D  Road network connectivity
09E  Building → Road access
09F  Road access → Workshop production
```

La causalité actuelle est :

```text
Residence
    ↓
population
    ↓
jobs
    ↓
Workshop
    ↓
Road Access
    ↓
Material production
```

09F a volontairement introduit une première conséquence gameplay du réseau routier :

```text
Workshop sans road access
→ workers toujours assignés
→ production = 0
```

Mais le système ne représente toujours pas **le déplacement d'un colon entre sa résidence et son lieu de travail**.

C'est maintenant la question architecturale importante.

---

# 1. OBJECTIF

Ce step ne doit PAS encore implémenter un système complet de transport.

L'objectif est de déterminer et, si le modèle actuel le permet proprement, établir le **contrat de mobilité résidentielle → travail**.

Le résultat recherché est conceptuellement :

```text
Residence
    │
    │ road access
    ▼
Road Network
    │
    │ network connectivity
    ▼
Road Network
    │
    │ road access
    ▼
Workplace
```

La question est :

> Comment NOVA sait-il qu'un colon peut potentiellement rejoindre son lieu de travail ?

Le mot important est **potentiellement**.

Ce step ne doit pas simuler :

* position du colon ;
* vitesse ;
* trajet ;
* distance ;
* temps de trajet ;
* pathfinding ;
* véhicules ;
* passagers ;
* animation ;
* congestion.

---

# 2. AUDIT OBLIGATOIRE

Avant toute modification, auditer le modèle réel.

Inspecter notamment :

```text
src/domain/simulation/
src/domain/population/
src/domain/building/
src/domain/road/
src/application/queries/
tests/
e2e/
docs/roadmap/
```

Identifier précisément :

### Population

* où les colonists sont créés ;
* comment leur résidence est déterminée ;
* si chaque colonist possède un `residenceId` ;
* si ce lien est persistant ou dérivé ;
* comment un colonist sans résidence est représenté.

### Jobs

* comment le workplace est déterminé ;
* si chaque colonist possède un `workplaceId` ;
* comment `assignJobs` choisit les workplaces ;
* si l'affectation dépend uniquement de la capacité ou d'autres contraintes.

### Spatial

* si résidence et workplace ont toujours une cellule unique ;
* si les bâtiments possèdent déjà un identifiant stable ;
* si les bâtiments peuvent être placés dans n'importe quelle cellule ;
* si un bâtiment peut être sans road access.

### Road

Réutiliser :

```text
getBuildingRoadAccess
getRoadNetworks
```

et ne pas recréer la connectivité.

---

# 3. NE PAS CODER UNE RÈGLE AVANT L'AUDIT

L'agent doit produire avant implémentation :

```text
AUDIT
- Population representation:
- Residence assignment:
- Workplace assignment:
- Spatial relation:
- Road access:
- Persisted state:
- Derived state:
```

Puis :

```text
DESIGN OBSERVATION
```

Cette section doit répondre à :

> Le modèle actuel possède-t-il suffisamment d'informations pour déterminer une connectivité résident → travail sans introduire un nouveau système de déplacement ?

---

# 4. DESIGN CIBLE

Si le modèle actuel le permet, la relation minimale à établir est :

```text
Colonist
   ↓ residence
Residence
   ↓ road access
Road Network
   ↓ road access
Workplace
```

Un colonist est alors **mobility-connected-to-work** si :

1. son bâtiment de résidence est opérationnel ;
2. son workplace est opérationnel ;
3. la résidence possède au moins une route opérationnelle adjacente ;
4. le workplace possède au moins une route opérationnelle adjacente ;
5. les deux bâtiments ont au moins un `networkId` commun.

Formellement :

```text
mobilityConnected =
    residenceOperational
    AND workplaceOperational
    AND
    intersection(
        residence.networkIds,
        workplace.networkIds
    ).length > 0
```

Cette relation est **dérivée**.

Elle ne signifie pas encore :

```text
"le colon se déplace"
```

Elle signifie :

```text
"le réseau routier offre actuellement une continuité entre les deux bâtiments"
```

---

# 5. IMPORTANT — NE PAS MODIFIER LES JOBS

09G ne doit PAS encore faire :

```text
if not mobilityConnected:
    unassignWorker()
```

et ne doit PAS faire :

```text
if not mobilityConnected:
    job unavailable
```

Le système actuel de jobs reste inchangé.

Exemple :

```text
Colonist
Residence A
Workplace B
```

avec deux réseaux incompatibles peut toujours avoir :

```text
assignedWorkplace = B
```

mais :

```text
mobilityConnected = false
```

Cette distinction est essentielle.

Nous ne savons pas encore si le futur système doit :

* empêcher le job ;
* appliquer un temps de trajet ;
* diminuer la productivité ;
* nécessiter un transport public ;
* faire apparaître des flux ;
* ou utiliser une autre mécanique.

Ne pas choisir cela dans 09G.

---

# 6. API / CONTRAT

Après audit, introduire une query pure uniquement si le modèle réel le justifie.

Par exemple :

```ts
getColonistWorkMobility(state, colonistId)
```

ou une API équivalente adaptée aux conventions du repository.

Le résultat peut conceptuellement contenir :

```text
{
  colonistId,
  residenceId,
  workplaceId,
  residenceNetworkIds,
  workplaceNetworkIds,
  connected
}
```

Mais **ne pas recopier cette structure aveuglément**.

Utiliser les types existants et éviter de créer un objet excessivement riche si une simple query booléenne suffit actuellement.

Priorité :

```text
simplicité
>
réutilisation des queries existantes
>
nouveaux types
```

---

# 7. CAS PARTICULIER — PLUSIEURS RÉSEAUX

Ne supposer qu'un bâtiment appartient qu'à un seul réseau.

09E permet :

```text
Building
  ↓
Road A → Network 1
  ↓
Road B → Network 2
```

Un bâtiment peut donc avoir plusieurs `networkIds`.

Pour déterminer la connectivité résidence → workplace :

```text
Residence networks ∩ Workplace networks
```

doit être utilisé.

Exemple :

```text
Residence:
[N1, N2]

Workshop:
[N2, N3]
```

Résultat :

```text
connected = true
```

car :

```text
N2 ∈ intersection
```

Ne pas imposer arbitrairement :

```text
networkId = firstNetwork
```

---

# 8. CAS SANS ROUTE

### Résidence sans route

```text
Residence
   X
Workshop
```

Résultat :

```text
mobilityConnected = false
```

### Workplace sans route

Même résultat.

### Aucun des deux

Même résultat.

### Routes diagonales seulement

Même résultat.

### Route en construction

Même résultat.

Utiliser les règles opérationnelles de 09E.

---

# 9. CAS RÉSEAU COMMUN

Tester :

```text
Residence
   │
  R1
   │
  R2
   │
  R3
   │
Workshop
```

Résultat :

```text
connected = true
```

Même si la distance est plusieurs cellules.

Aucun calcul de chemin détaillé n'est nécessaire.

---

# 10. CAS RÉSEAUX DISTINCTS

Tester :

```text
Residence
   │
  N1


  N2
   │
Workshop
```

Résultat :

```text
connected = false
```

Le fait que les deux bâtiments aient chacun une route ne suffit pas.

Il faut un réseau commun.

---

# 11. NE PAS UTILISER LA DISTANCE

Ne pas introduire :

```text
Manhattan distance
Euclidean distance
travel time
max commute distance
```

dans ce step.

Une résidence à :

```text
distance = 2
```

et une résidence à :

```text
distance = 20
```

sont toutes deux connectées si leurs réseaux sont connectés.

La notion de temps de trajet appartient à un futur step.

---

# 12. NE PAS INTRODUIRE DE PATHFINDING

La connectivité actuelle est :

```text
Road
→ connected component
```

Elle suffit pour ce contrat.

Ne pas introduire :

```text
A*
Dijkstra
BFS résidence → workplace
```

pour déterminer `connected`.

Le réseau 09D fournit déjà l'information nécessaire.

---

# 13. PERFORMANCE

Ne pas calculer les réseaux indépendamment pour chaque colonist si le repository permet de réutiliser les résultats dérivés.

Cependant :

**ne pas introduire de cache persistant.**

Une stratégie raisonnable peut être :

```text
road networks
      ↓
building access
      ↓
colonist mobility query
```

Le réseau reste une donnée dérivée.

Si une optimisation est nécessaire, utiliser un cache local à la requête/simulation, jamais un nouvel état canonique.

---

# 14. PAS D'EFFET GAMEPLAY

C'est le point central de 09G.

La nouvelle relation ne doit pas encore modifier :

* population ;
* housing capacity ;
* jobs ;
* worker assignment ;
* production ;
* food ;
* upkeep ;
* construction ;
* Material ;
* stockage.

09F reste la seule conséquence gameplay du road access :

```text
Workshop sans road access
→ production 0
```

09G ajoute seulement :

```text
Residence ↔ Workplace
→ mobilityConnected
```

---

# 15. TESTS

Créer une suite dédiée adaptée au repository, par exemple :

```text
tests/colonistMobility.test.ts
```

Couvrir au minimum :

### A — Résidence et workplace sur même réseau

```text
connected = true
```

### B — Réseaux distincts

```text
connected = false
```

### C — Résidence sans road access

```text
connected = false
```

### D — Workplace sans road access

```text
connected = false
```

### E — Routes underConstruction

```text
connected = false
```

### F — Buildings underConstruction

```text
connected = false
```

### G — Réseau indirect

Plusieurs routes entre les deux bâtiments :

```text
connected = true
```

### H — Plusieurs réseaux sur un bâtiment

Résidence :

```text
[N1, N2]
```

Workplace :

```text
[N2, N3]
```

Résultat :

```text
connected = true
```

### I — Aucun réseau commun

```text
[N1, N2]
[N3, N4]
```

Résultat :

```text
connected = false
```

### J — Plusieurs colonists

Vérifier que la query fonctionne indépendamment pour plusieurs colonists.

### K — Colonist sans workplace

Ne pas inventer une règle.

Retourner le résultat cohérent avec le modèle existant :

```text
no workplace
→ no work mobility relationship
```

### L — Colonist sans residence

Même principe.

### M — Save/load

```text
save
→ load
→ query
```

doit produire le même résultat.

### N — Determinism

Même état :

```text
query A
query B
```

→ même résultat.

### O — Insertion order

Si le repository garantit déjà l'indépendance vis-à-vis de l'ordre d'insertion :

```text
state A
state B
```

doivent produire le même résultat.

---

# 16. RÉGRESSION

Les tests historiques doivent rester inchangés sauf si une vraie dépendance est découverte.

Vérifier :

```text
housing
population
jobs
production
food
storage
upkeep
construction
roads
road networks
road access
determinism
save/load
```

En particulier :

```text
mobilityConnected = false
```

ne doit actuellement pas modifier :

```text
assigned workers
production
population
```

---

# 17. DEBUG / BROWSER

Si `__nova.stats` existe déjà, exposer éventuellement une information minimale permettant de vérifier :

```text
colonistMobility
```

Mais ne pas créer d'interface joueur.

09G n'est pas une feature UI.

Si aucun E2E navigateur naturel n'est possible :

```text
Browser E2E deferred:
no player-facing mobility UI exists yet.
```

La couverture Vitest doit alors être complète.

---

# 18. PERSISTENCE

Aucune donnée de mobilité ne doit être ajoutée à l'état canonique.

Ne pas persister :

```text
colonist.mobilityConnected
colonist.routeId
colonist.networkId
colonist.travelTime
```

Le résultat doit être recalculé à partir de :

```text
Colonist
+
Residence
+
Workplace
+
Roads
```

SAVE_VERSION devrait rester :

```text
4
```

si aucun changement de schéma n'est nécessaire.

---

# 19. HASH

La relation de mobilité ne doit pas être directement ajoutée au hash.

Le hash continue de représenter l'état canonique.

Deux états canoniques identiques :

```text
state A === state B
```

doivent donner :

```text
hash A === hash B
```

et donc la même mobilité dérivée.

---

# 20. DOCUMENTATION

Créer :

```text
docs/roadmap/Step09G.md
```

Documenter explicitement :

### Audit

Ce que le modèle réel permet de représenter.

### Observation

Pourquoi le système a maintenant besoin d'une relation résidence → workplace.

### Design decision

Définition de :

```text
mobilityConnected
```

### Important distinction

```text
mobilityConnected
≠
worker can physically move
```

### Current gameplay

Aucune conséquence gameplay supplémentaire dans 09G.

### Deferred

* déplacement ;
* trajet ;
* durée ;
* transit public ;
* passagers ;
* véhicules ;
* congestion ;
* transport cost ;
* productivity modifiers ;
* commute requirements.

---

# 21. SCOPE AUDIT

Avant le commit :

```bash
git diff --stat
git diff
git status
```

Refuser toute dérive vers :

```text
movement
pathfinding
vehicles
transit
passengers
traffic
congestion
travel time
commute penalty
job reassignment
population penalty
road upkeep
road demolition
road tiers
```

---

# 22. COMMIT

Si le step est réellement minimal et toutes les vérifications passent :

```text
Step 09G: Residential to Work Mobility Contract
```

---

# 23. ACCEPTANCE CRITERIA

* [ ] audit réel effectué ;
* [ ] modèle residence/workplace compris ;
* [ ] relation résidence → workplace explicitement définie ;
* [ ] road access 09E réutilisé ;
* [ ] road networks 09D réutilisés ;
* [ ] plusieurs networks correctement gérés ;
* [ ] intersection des réseaux utilisée ;
* [ ] aucun pathfinding ajouté ;
* [ ] aucune distance ajoutée ;
* [ ] aucun temps de trajet ajouté ;
* [ ] aucun nouveau gameplay effect ;
* [ ] jobs inchangés ;
* [ ] production inchangée par 09G ;
* [ ] population inchangée ;
* [ ] food inchangée ;
* [ ] upkeep inchangé ;
* [ ] aucun état de mobilité persisté ;
* [ ] SAVE_VERSION = 4 si possible ;
* [ ] hash inchangé conceptuellement ;
* [ ] save/load vérifié ;
* [ ] déterminisme vérifié ;
* [ ] tests complets ;
* [ ] lint ;
* [ ] typecheck ;
* [ ] build ;
* [ ] E2E naturel si possible, sinon report justifié ;
* [ ] documentation créée ;
* [ ] scope audit effectué ;
* [ ] commit dédié ;
* [ ] working tree propre.

---

# 24. RAPPORT FINAL

Terminer exactement par :

```text
## Step 09G — Final Report

### A. Audit
- ...

### B. Observation
- ...

### C. Design Decision
- ...

### D. Implementation
- ...

### E. Tests
- ...

### F. Browser / E2E
- ...

### G. Persistence
- ...

### H. Determinism
- ...

### I. Regression
- ...

### J. Scope Audit
- ...

### K. Git
- ...

### L. Next Design Question
Une seule question de conception révélée par ce step.
```

---

# Principe directeur

09G ne doit pas encore répondre à :

> « Comment le colon se déplace-t-il ? »

Il doit seulement répondre à :

> « Le modèle de mobilité sait-il déterminer si le réseau routier relie potentiellement le lieu de résidence au lieu de travail ? »

La distinction est volontaire :

```text
09E
Building → Road

09F
Road Access → Production

09G
Residence → Road Network → Workplace

Future
Mobility connection → actual movement / transit
```

Ne pas sauter directement à la dernière étape.
VERIFICATION PLAYABILITE A LA FIN

---

# Documentation (as-built)

## A. Audit

Architecture réellement trouvée (≠ formulation du prompt) :

* `ColonistState = { id, residenceId, workplaceId }` (`src/domain/population/colonist.ts`) : les deux relations sont **canoniques et persistées**. Aucune position, aucune vitesse, aucun champ spatial sur le colon.
* **Résidence** : affectée par `updatePopulation` via `createColonist(state, residenceId)`, la résidence étant choisie par `availableResidenceIds` (housing.ts, ordre d'id croissant). `residenceId` peut être `null` (sans-abri) ; Step 0 n'en crée jamais.
* **Workplace** : affecté uniquement par `assignJobs` (phase 6 de `phases.ts`). `isEmployed` (jobs.ts) résout la référence : un `workplaceId` valide pointe un Workshop **opérationnel**. L'affectation ne dépend ni d'une distance ni d'une proximité.
* **Spatial** : chaque bâtiment possède une cellule unique `(x, y)` et un id stable `building-N` ; il peut être `underConstruction` ou `operational` et peut n'avoir **aucun** accès routier.
* **Road access** : 09E `getBuildingRoadAccess(state, buildingId)` expose déjà `roadIds`, `networkIds` (id de réseau = plus petit id de route du composant 09D) et `hasRoadAccess`. Il ne renvoie des réseaux que si le bâtiment est **opérationnel** et possède une route **opérationnelle** adjacente **orthogonale** (les routes diagonales ou en construction ne comptent pas).
* **Réseaux** : 09D `getRoadNetworks(state)` = composantes connexes orthogonales de routes opérationnelles. Aucune distance, aucun chemin, aucun coût.
* **État persisté** : `config, time, resources, buildings, colonists, roads, counters` — rien de dérivé. `SAVE_VERSION = 4`.
* **Debug** : `__nova.stats` (src/app/main.ts) exposait déjà `accessibleBuildings`, `roadNetworks`, `buildingsWithRoadAccess`, `productionBlockedByRoad`.
* **Navigateur** : aucune palette route player-facing n'existe (09C n'a livré que le domaine et la commande `placeRoads`) : un joueur ne peut pas construire de route à l'écran.

## B. Observation

Le modèle possédait déjà **toutes** les informations nécessaires : chaque colon porte sa résidence et son lieu de travail, et 09E sait quels réseaux routiers chaque bâtiment atteint. La relation résidence → réseau → lieu de travail est donc dérivable par **simple intersection**, sans introduire de système de déplacement.

NOVA peut désormais répondre à *si* l'infrastructure routière relie potentiellement les deux lieux, sans savoir *comment* un colon se déplace.

## C. Design Decision

Source unique de vérité : **09E**, réutilisée telle quelle (aucune deuxième dérivation d'adjacence ou de connectivité). Nouvelle dérivation pure `getColonistWorkMobility(state, colonistId)` dans `src/domain/mobility/mobility.ts` :

```text
mobilityConnected = residenceNetworkIds ∩ workplaceNetworkIds ≠ ∅
```

où les deux listes proviennent de `getBuildingRoadAccess`, qui garantit déjà : bâtiment opérationnel + route opérationnelle adjacente orthogonale. Un colon sans résidence ou sans workplace reçoit une forme explicite « pas de relation de mobilité » (listes vides, `mobilityConnected: false`) : aucune règle n'est inventée.

Choix assumés :

* **intersection**, jamais « premier réseau == premier réseau » (§7) : un bâtiment peut atteindre plusieurs réseaux (09E §7) ;
* un seul type retourné (`ColonistWorkMobility`), contenant les deux listes de réseaux pour rendre l'intersection explicite et testable — même précédent que `BuildingRoadAccess` en 09E ;
* pas de wrapper `application/queries/*` supplémentaire : `main.ts` importe déjà les dérivations du domaine via le barrel (`getBuildingRoadAccess`), un fichier de plus n'apporterait qu'une indirection ;
* **aucun cache** : ni persistant (§18), ni local. Justification : le coût est de deux dérivations 09E par colon, à l'échelle de colonie du contrat ; introduire un cache serait le premier pas vers l'état canonique de mobilité que 09G refuse explicitement.

## D. Distinction importante

```text
mobilityConnected  ≠  « le colon se déplace réellement »
mobilityConnected  ==  « le réseau routier offre une continuité entre les deux bâtiments »
```

Aucune notion de distance, de durée, de véhicule ou de trajet n'est représentée. Deux bâtiments séparés par vingt cellules de route sont connectés exactement comme deux bâtiments adjacents.

## E. Gameplay courant (aucun effet en 09G)

09G **n'ajoute aucune conséquence gameplay**. La seule conséquence du road access reste celle de 09F :

| Situation                              | Production Material | Upkeep | Workers assignés |
| -------------------------------------- | ------------------: | -----: | ---------------- |
| Workshop + staff + route               |             normale |      1 | conservés        |
| Workshop + staff sans route            |               **0** |      1 | conservés        |
| Résidence reliée / non reliée au travail | inchangée          | inchangé | inchangés      |

Jobs, population, logement, nourriture, production, stockage, upkeep et construction sont **inchangés** par 09G : `mobilityConnected = false` n'unassigne aucun worker et ne modifie aucune valeur.

## F. Persistence et hash

* `SAVE_VERSION` reste **4** : aucun champ de mobilité n'entre dans `SimulationState` (`colonist.mobilityConnected`, `colonist.networkId`, `colonist.routeId` n'existent pas) ;
* la relation est recalculée depuis `Colonist + Residence + Workplace + Roads` ;
* le hash canonique est inchangé par la query (test de pureté), et deux états canoniques identiques ont la même mobilité dérivée ;
* save/load conserve le résultat (test M).

## G. Browser / E2E

```text
Browser E2E deferred:
no player-facing mobility UI exists yet.
```

Raison : aucune palette route n'existe à l'écran, donc un scénario navigateur « résidence reliée / non reliée au travail » n'est pas constructible sans fabriquer une UI artificielle (interdit §17). La couverture Vitest (`tests/colonistMobility.test.ts`, cas A–O) est complète sur le vrai chemin de simulation.

Surface de debug : `__nova.stats` expose désormais `mobilityConnectedColonists` (nombre de colons dérivés connectés). Diagnostic seul, jamais persisté ; aucune interface joueur n'est créée.

## H. Vérification de jouabilité (demandée en fin de prompt)

Sonde navigateur réelle (vite preview + Chromium, clics palette et STEP réels, `__nova` en lecture seule) :

```text
P1 load:      tick=0 buildings=0 mobilityConnectedColonists=0
P2 residence: tick=2 operational=1 colonists=1
P3 workshop:  tick=4 employed=1 materialProduction=0 materialUpkeep=1
P4 after 2 ticks: construction=47 food=96 productionBlockedByRoad=1 roadNetworks=0
P5 status:    1 colonist consumed 1 food
P6 browser errors: none
```

Conclusion : l'application est jouable (chargement, palette, construction, admission d'un colon, affectation d'un worker, tick, HUD, zéro erreur console) et la nouvelle dérivation est bien exposée. **Mais** la boucle économique reste bloquée en navigateur : sans palette route, un Workshop ne peut jamais produire (règle 09F), l'upkeep draine le stock et `productionBlockedByRoad = 1`. C'est l'état transitoire documenté par 09F, pas une régression de 09G — il devient le sujet de design prioritaire (voir question de conception ci-dessous).

## I. Deferred systems

Non implémentés : position des colons, vitesse, trajet, durée, temps de trajet, distance, pathfinding (A\*/Dijkstra/BFS résidence → lieu de travail), véhicules, passagers, transit public, congestion, coût de transport, pénalités de commute, exigences de distance, réassignation d'emploi, pénalité de population, démolition de route, upkeep de route, road tiers, highways, money, pollution, cache de mobilité persistant, UI mobilité player-facing.
