# NOVA — Step 10A — First Need: Food Security

> **État du document** : réécrit à la demande de Step10A-1. La version précédente
> (road-gated food distribution) était un design drift — voir `## As-Built` et
> `docs/roadmap/Step10A-1.md`. Cette version est le design corrigé, prêt pour
> implémentation. Rien n'est implémenté à ce stade ; `src/` non modifié.

## Mission

Food = premier besoin de population explicite. La chaîne causale est :

```text
population
    ↓
food need
    ↓
food stock availability
    ↓
food consumption
    ↓
satisfied / shortage
    ↓
existing deterministic population consequence
```

Food reste **indépendant du transport**. Phase 3 demande : « que se passe-t-il quand
un colonist ne peut pas satisfaire un besoin ? » — pas « comment la food voyage-t-elle
physiquement ? » (dépendance production/transport ultérieure, si un jour la
simulation le démontre).

## Audit

Audit réalisé sur le commit `50d6b46` (Step 09N), reproduit par lecture du code et
des suites existantes. Constats détaillés dans `## Existing Food Rules`.

Verdict de l'audit : **la chaîne food existante satisfait déjà le contrat ci-dessous
presque intégralement**. Aucune incohérence réelle détectée. Aucun coefficient à
modifier. Aucune règle à changer. Le travail de 10A est donc :

1. formaliser le contrat (déjà appliqué de facto) ;
2. l'ancrer par des tests dédiés (tests du contrat + tests anti-couplage transport) ;
3. instrumenter l'e2e food si nécessaire.

La seule marge d'implémentation domaine serait d'exposer `foodConsumed` /
`foodShortage` dans `FoodConsumptionResult` — rejeté ici : ce sont des valeurs
dérivées intrinsèques au résultat actuel (`fed`, stock avant/après), aucun besoin
réel identifié, et « un seul changement de sémantique par étape » s'applique.
Décision : **zéro modification de `src/` en 10A**.

## Existing Food Rules

Observé à `50d6b46`, avec références :

- **Stockage** : `resources.food` (colony-level, unités entières), `INITIAL_FOOD = 100`
  (`src/domain/resource/resource.ts`).
- **Besoin** : `updateNeeds` (phases.ts, phase 3) = `getPopulationCount ×
  FOOD_PER_COLONIST_PER_TICK` (= 1/colonist/tick). Dérivé, jamais stocké, jamais
  hashé (Step 05B/05C §4).
- **Production** : `produceFood` (phase 4, Step 06B) = fermes opérationnelles ×
  `FOOD_PER_FARM_PER_TICK` (= 2/tick). Aucune gate routière, aucun worker requis,
  stockpiling autorisé (food peut dépasser 100, invariant food ≥ 0, pas de cap).
- **Consommation** : `consumeFood` (phase 5) — all-or-nothing colony :
  - `requiredFood = 0` → tick vacuously fed ;
  - `stock ≥ requiredFood` → déduction exacte, `fed = true` ;
  - `stock < requiredFood` → stock épuisé à 0, `fed = false` (pas de partiel,
    pas d'erreur trans-frontière).
- **Conséquence population** : `updatePopulation` (phase 6) —
  - `fed = false` ⇒ la colonie ENTIÈRE quitte le même tick (`colonists = {}`,
    tous-or-rien, Step 05B §Shortage) ;
  - puis admission food-gated : un colonist arrive tant qu'une résidence
    opérationnelle sans résident existe ET `food > 0` (ordre id ascendant).
- **Ordre des ticks** (`src/domain/simulation/step.ts`) :
  `advanceConstruction → updateNeeds → produceFood → consumeFood →
  updatePopulation → assignJobs → produceMaterial → applyCommand →
  progress* → upkeepBuildings → advanceTime`.
  La production précède la consommation (production same-tick anti-famine) ;
  la famine précède `produceMaterial` (le travailleur affamé ne produit pas) ;
  l'admission est post-consommation (colonist admis ce tick nourri au prochain).
- **Tests existants** : `tests/simulation.test.ts` (famine/admission),
  `tests/bootstrapEconomy.test.ts` (bootstrap, food 100 → consommation par tick),
  `tests/production.test.ts` (fermes), `tests/economicInvariants.test.ts`
  (invariants). E2E : `e2e/foodRun.mjs` (4 résidences → fed ticks delta = 4 →
  shortage → colonie entière meurt → pas de ré-admission post-famine),
  `e2e/productionRun.mjs`.
- **Bootstrap** : colonie de départ = food 100, material 100, 0 colonist ;
  viabilité sans aucune route (la food n'a jamais requis de route).

## Design Decision

| Option | Contenu | Verdict |
|---|---|---|
| A (gate ferme sur route) | production food conditionnée à 09E | REJETÉE — prématurée : 09N a conclu « transport = infrastructure minimale, ne pas approfondir » ; coupler la food au réseau étendrait le transport après une audit qui l'interdit |
| B (desserte par résidence) | nourrissage gated mobilité ferme↔résidence | REJETÉE — système de logistique alimentaire déguisé ; confond Phase 3 (besoin/satisfaction) avec Phase 9 (transport) ; exempterait les résidences isolées du besoin (dé-drive la causalité) |
| C (plafond de distance) | B + cap 09M | REJETÉE — double dépendance transport |
| **D (statu quo formalisé)** | conserver intégralement la chaîne 05B/06B, la formaliser en contrat, l'ancrer par tests | **RETENUE** |

Justification de D :

- l'audit prouve que la mécanique existante répond déjà à la question Phase 3
  (besoin → consommation → shortage → conséquence déterministe) ;
- la règle « food ≠ logistique » est explicitée dans Step10A-1 : ressource ≠
  transport nécessaire ;
- la distance routière a déjà sa conséquence économique candidate documentée
  (09N Q15) pour un FUTUR step, jamais en 10A ;
- zéro régression à gérer : 453 tests restent valides.

## Food Need Contract

```text
foodNeed =
    colonistCount × FOOD_PER_COLONIST_PER_TICK        // existant: updateNeeds
```

```text
foodConsumed =
    min(foodStockBeforeConsumption, foodNeed)         // existant: consumeFood
```

```text
foodShortage =
    foodNeed - foodConsumed
```

Invariants (à tester, dérivés du code existant) :

```text
foodStock >= 0
foodConsumed >= 0
foodShortage >= 0
foodConsumed <= foodNeed
foodConsumed <= foodStockBeforeConsumption
```

Notes :

- `colonistCount` = colonists VIVANTS (canonique, jamais négatif) ;
- `foodStockBeforeConsumption` = stock après `produceFood`, avant `consumeFood`
  (la production same-tick compte) ;
- pas de nouveau champ canonique : tout est dérivé du state + du tick.

## Satisfaction

```text
foodConsumed === foodNeed  →  SATISFIED   // fed = true (consumeFood)
```

Cas dégénérés couverts par l'existant :

- `foodNeed = 0` (aucun colonist) → SATISFIED vacuolemment, rien ne bouge ;
- `foodNeed > 0`, stock exactement égal → SATISFIED, stock à 0 après déduction.

## Shortage

```text
foodConsumed < foodNeed  →  SHORTAGE    // fed = false
```

Effet mesuré existant : `foodStock = 0` après le tick (épuisé), jamais négatif,
jamais de partiel, jamais d'erreur. Le `foodShortage` exact n'est pas exposé par
l'API actuelle — calculé dans les tests comme `foodNeed - foodStockAfter`
(stock après = 0 en shortage, donc `foodShortage = foodNeed` dès que stock <
need… voir mise en garde Known Limitations).

## Population Consequence

Réutilisé à l'identique (`updatePopulation`, aucun changement) :

```text
SHORTAGE tick
    → la colonie entière quitte le même tick (all-or-nothing, Step 05B)
    → résidences toutes libérées
SATISFIED tick (food > 0 restant)
    → admission: résidence opérationnelle libre, ordre id ascendant,
      tant que food > 0
```

Pas de second mécanisme de famine créé. Pas de famine partielle, pas de file.

## Tick Ordering

Inchangé (voir Audit). Contrats d'ordre testés :

1. `produceFood` avant `consumeFood` — une ferme opérationnelle ce tick nourrit ce tick ;
2. famine avant `produceMaterial` — un travailleur affamé ne produit pas ;
3. admission après consommation — un colonist admis ce tick mange au tick suivant ;
4. admission exige `food > 0` post-tick.

## Implementation

**Zéro modification de `src/`.** L'audit n'identifie aucune règle manquante ni
aucune incohérence de coefficient. Le contrat ci-dessus est déjà appliqué.

Interdits rappelés (Step10A-1) : ferme gated route, résidence gated mobilité,
exemption des résidences isolées, distance de food, cap de distance, toute
logistique, tout framework de besoins génériques :

```text
PAS de NeedSystem / NeedManager / NeedRegistry / NeedDefinition /
      GenericSatisfactionEngine / Need[]
```

Une concrétisation suffit. Food reste explicite jusqu'à ce qu'un second besoin
justifie une abstraction.

## Tests

Nouveau fichier `tests/foodSecurity.test.ts` (planned) — deux familles :

### Famille 1 — contrat du besoin

* besoin dérivé = population × 1 (0, 1, 2, 4 colonists) ;
* consommation exacte en tick fed (delta = besoin) ;
* `min(stock, need)` : stock ≥ need (déduction exacte) / stock < need (stock → 0,
  pas de négatif) ;
* invariants §Food Need Contract sur plusieurs ticks (aucun négatif, shortage
  borné) ;
* SATISFIED / SHORTAGE via `fed` ;
* conséquence population : shortage → colonie vide ; admission food-gated ;
  pas de ré-admission sans stock.

### Famille 2 — anti-couplage transport (obligatoire, Step10A-1)

* **A** ferme sans route + colonists : production suit la règle ferme existante
  (2/tick, indépendante du route) ;
* **B** même ferme + route : comportement food IDENTIQUE (la route ne change rien) ;
* **C** résidence isolée de toute route : le colonist a quand même un besoin
  (exigé, nourri si stock) ;
* **D** même résidence connectée : besoin IDENTIQUE ;
* **E** même stock, topologies routières différentes : satisfaction IDENTIQUE.

Ces tests verrouillent : aucune couplage accidentel food↔transport.

Les suites existantes restent intactes et passantes (aucune migration nécessaire —
la règle ne change pas).

## E2E

`e2e/foodRun.mjs` : inchangé et toujours PASS (il décrit exactement la chaîne
retenue : stock → fed ticks → shortage → starvation totale → pas de ré-admission).
Instrumentation supplémentaire non requise à ce stade.

## Persistence

* `SAVE_VERSION` inchangé (aucun champ canonique modifié) ;
* `foodNeed`/`foodConsumed`/`foodShortage` : dérivés, jamais persistés, jamais
  hashés (déjà vrai : Step 05C §4) ;
* save/load/replay : hash stable (aucun changement de forme).

## Determinism

* mêmes commandes ⇒ même état, même hash (déjà garanti, re-testé par la famille 1) ;
* itérateurs id ascendants (admission, production) — indépendance ordre d'insertion ;
* aucun timer réel, aucune wall-clock.

## Gameplay Result

Attendu après exécution des tests (à confirmer en implémentation) :

* le joueur voit déjà aujourd'hui la causalité complète d'un besoin :
  stock → consommation → shortage → famine → admission bloquée ;
* aucune décision spatiale liée à la food (assumé) ; la pression spatiale
  candidate pour la food (09N Q15) reste documentée pour un step futur ;
* boucle du joueur : produire/conserver du stock de food pour maintenir la
  population — c'est le « first need » jouable.

## Known Limitations

- **Sémantique all-or-nothing de famine** : `consumeFood` épuise le stock à 0 en
  shortage, donc `foodShortage` reconstitué post-hoc = `foodNeed` (pas
  `foodNeed - stockBefore`) quand stock < need — l'information exacte de manque
  du tick n'est pas observable après coup, seulement `fed = false` + stock 0.
  Si une instrumentation future en a besoin, exposer `foodConsumed` dans
  `FoodConsumptionResult` (changement `src/` dédié, pas en 10A).
- Famine = colonie entière (pas par-colonist) : plus radical que la plupart des
  city-builders, mais c'est la conséquence déterministe existante, conservée.
- Un seul type de producteur (ferme) et un seul besoin — voulu (complexité budget).

## Deferred

- Toute couplage food↔transport (gate ferme, desserte par résidence, distance,
  cap) — réévalué uniquement si la simulation démontre le besoin (audit 09N Q15
  garde la trace de la règle candidate la plus petite).
- Second besoin / abstraction de framework de besoins.
- Famine par-colonist ou partielle (révision explicite de la règle 05B requise).
- Exposition `foodConsumed` dans `FoodConsumptionResult`.
- Money / income (Phase 7), production economy inputs (Phase 8).

## Verification

Plan d'exécution (à confirmer) :

```text
pnpm test        → 453 + N nouveaux tests foodSecurity, 0 régression
pnpm lint        → clean
pnpm typecheck   → clean
pnpm build       → success
E2E food         → ALL PASS (inchangé)
E2E road/transport/production/resource/temporal → ALL PASS (inchangé)
SAVE_VERSION     → inchangé
HASH             → stable
```

## As-Built

**Rapport Step10A-1 (correction, avant implémentation 10A) :**

1. **Ce qui n'allait pas dans le Step10A précédent** : il transformait la food en
   système de distribution/logistique routière (ferme gated 09E, desserte
   résidence 09K, exemption des résidences isolées, distance différée) — exactement
   ce que 09N venait d'interdire (« transport = infrastructure minimale »), et il
   confondait Phase 3 (besoin/satisfaction) avec une dépendance transport/logistique
   ultérieure. Il créait aussi deux causes de mort (stock ET géographie) et cassait
   le bootstrap sans routes.
2. **Ce qui a été retiré** : gate de production ferme sur accès routier ; gate de
   nourrissage par mobilité ; exemption des résidences isolées ; plafond de
   distance food ; migration massive des tests food existants ; scénarios
   rupture/raccordement alimentaires.
3. **Ce que le design corrigé dit** : la chaîne causale besoin→stock→consommation→
   shortage→conséquence population EXISTE déjà (05B/06B/05C) et est correcte ;
   10A la formalise en contrat, la verrouille par tests dédiés + tests
   anti-couplage transport (A–E), et ne modifie PAS `src/`.
4. **Règles existantes réutilisées** : toutes — `updateNeeds`, `produceFood`,
   `consumeFood`, `updatePopulation`, ordre de ticks, invariants food ≥ 0,
   famine all-or-nothing, admission food-gated, INITIAL_FOOD = 100.
5. **Ce qui reste à auditer avant implémentation** : rien de bloquant. À l'exécution
   de 10A : écrire `tests/foodSecurity.test.ts` (2 familles), exécuter la
   non-régression complète (453+ tests, 6 E2E), confirmer les invariants,
   compléter les sections Implementation/Tests/E2E/Verification de ce document
   avec les résultats réels.

**Statut 10A-1 : COMPLETE (correction du design).** Working tree : uniquement
`docs/roadmap/Step10A.md` corrigé (+ ce fichier Step10A-1.md, prompt de la
correction). Pas de commit, `src/` intact.

Record classification :

```text
DISCOVERED  chaîne food existante déjà conforme au contrat demandé (aucun gap de règle) ; foodShortage n'est pas observabel après-coup (stock épuisé) — instrumentation future possible
DERIVED     foodNeed / foodConsumed / foodShortage — dérivés du state + tick, jamais persistés
INTENTIONAL zéro modif src/ en 10A ; food indépendant du transport ; pas de framework de besoins générique
DEFERRED    couplage food↔transport (Q15 09N), 2e besoin, famine partielle, exposition foodConsumed
```

---

# As-Built — Exécution 10A (Step 10A: formalize food security need)

Exécution du design ci-dessus, selon le prompt d'exécution `docs/roadmap/Step10B.md`.
Le bloc As-Built de la correction 10A-1 (ci-dessus) est préservé tel quel — historique cohérent.

## Implementation

**`src/` : ZÉRO modification.** L'audit avait conclu que l'implémentation 05B/06B
conformait déjà le contrat — confirmé à l'exécution. Aucune règle changée, aucun
coefficient touché, aucun champ persisté ajouté.

Fichiers modifiés/ajoutés :

```text
tests/foodSecurity.test.ts   NEW  — 19 tests (contrat + anti-coupling + déterminisme)
docs/roadmap/Step10A.md      UPDATE — ce bloc As-Built d'exécution
docs/roadmap/Step10A-1.md    NEW (inchangé) — rapport de correction, préservé
docs/roadmap/Step10B.md      NEW (inchangé) — prompt d'exécution, préservé
```

## Tests ajoutés (exact)

`tests/foodSecurity.test.ts`, 19 tests :

- **Contrat** : besoin = pop × 1 (0/1/4 colonists) ; production = fermes op × 2
  (0/1/2, ferme en construction ne produit pas) ; production identique sans/avec
  route ; consommation bornée au stock (stock 3 < besoin 4 → stock 0, jamais
  négatif) ; stock complet satisfait exactement (déduction = min(stock, besoin)) ;
  stock zéro → shortage total ; besoin 0 → fed vacuolemment, state inchangé ;
  famine = colonie entière quitte (full chain, food 1 < besoin 2) ; PAS de second
  mécanisme de mort (pas de ferme + stock > 0 → survit) ; admission food-gated
  (food 0 → rien, food > 0 → 1) ; observations dérivées (`updateNeeds`,
  `foodProductionForTick`) n'altèrent pas le state canonique.
- **Anti-couplage transport (A–E)** : ferme sans route produit/nourrit normalement ;
  même ferme + route = identique ; résidence isolée vs connectée : besoin et
  résultat identiques ; 3 topologies (no-road / straight / loop) → food,
  population, buildings identiques ; sortie ferme identique roadless vs networked.
- **Tick ordering** : production avant consommation (ferme opérationnelle ce tick
  nourrit ce tick : food 0 → 2 → 1, colonist survit) ; famine avant
  produceMaterial (travailleur affamé ne produit pas, stock Material intact).
- **Déterminisme/persistence** : même commandes → même hash ; replay ×2 stable ;
  save/load round-trip hash-stable ; sérialisation sans foodNeed/foodShortage/fed ;
  SAVE_VERSION = 4.

## Verification (réel)

```text
pnpm test        → 472 passed (472) / 28 fichiers  (avant: 453 / 27; +19, 0 supprimé, 0 affaibli)
pnpm lint        → clean
pnpm typecheck   → clean
pnpm build       → success (0 erreur)
E2E food         → ALL PASS
E2E production   → ALL PASS
E2E resource     → ALL PASS
E2E temporal     → ALL PASS
E2E road         → ALL PASS (régression transport: zéro)
E2E transport    → ALL PASS (régression transport: zéro)
GPU E2E          → ALL PASS (environment non bloqué)
SAVE_VERSION     → 4 (inchangé)
Nouveaux champs persistés  → 0
Nouveaux champs hashés     → 0
```

## Food contract (vérifié par tests)

```text
foodNeed       = population × 1                 (updateNeeds)
foodProduced   = fermes opérationnelles × 2     (foodProductionForTick / produceFood)
foodConsumed   = min(stock avant, besoin)       (consumeFood: déduction exacte sinon épuisement à 0)
foodShortage   = besoin - consommé              (dérivé, jamais persisté)
foodStock      >= 0                             (jamais négatif, testé)
```

## Transport isolation (vérifié)

Scénarios A–E exécutés : production, satisfaction, famine et admission de la food
sont **identiques** dans toutes les variantes routières (sans route, route droite,
boucle, résidence isolée vs connectée). Aucun concept transport n'entre dans la
chaîne food ; aucune régression road/transport.

## Scope verdict

```text
COMPLETE
```

10A n'a PAS introduit : logistique food, food road-gated, food distance-based,
framework de besoins générique, second mécanisme de famine, instrumentation
d'historique food. Le problème d'observabilité post-consommation de
`foodShortage` reste **différé** (documenté Known Limitations, non résolu ici).

