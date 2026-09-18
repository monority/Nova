NOVA — Step 08C — Operational Upkeep Implementation

CONTEXTE

Step 08C est l’implémentation directe du contrat de design fourni ci-dessous.
Le design est FINAL et AUTHORITATIVE.

NE PAS redessiner, rebalance, généraliser ou élargir le système.
NE PAS inventer de nouvelle abstraction.
NE PAS modifier les règles économiques existantes.
NE PAS ajouter de nouvel état persistant.

OBJECTIF UNIQUE

Implémenter le coût d’upkeep récurrent :

- Resource: Material
- Subject: operational + staffed Workshops uniquement
- Amount: 1 Material / staffed Workshop / simulation tick
- Frequency: chaque simulation tick
- Payment order:
  assignJobs
  → produceMaterial
  → upkeepBuildings
  → advanceTime
- Same-tick semantics: oui
- Insufficient Material: paiement partiel jusqu’à 0
- Jamais de Material négatif
- Jamais de désactivation/destruction/dette
- Recovery automatique
- Aucun champ SimulationState supplémentaire
- SAVE_VERSION reste 4

==================================================
1. AUTHORITATIVE ECONOMIC RULE
==================================================

Pour chaque tick :

materialProduction = workers × 2

staffedOperationalWorkshops =
  nombre de Workshops avec :
    - lifecycle = operational
    - au moins 1 worker assigné

materialUpkeep = staffedOperationalWorkshops × 1

netMaterial =
  materialProduction - materialUpkeep

Le flux doit être :

1. assignJobs
2. production
3. upkeep
4. advanceTime

L’upkeep doit donc observer :

- le staffing résultant de assignJobs du tick courant ;
- le Material après production du tick courant ;
- les bâtiments devenus operational conformément aux règles actuelles.

==================================================
2. UPKEEP PAYMENT
==================================================

Implémenter :

deduct = min(materialAfterProduction, upkeepDue)

materialAfterUpkeep =
  materialAfterProduction - deduct

Garanties :

- Material >= 0 toujours
- deduct >= 0
- deduct <= upkeepDue
- aucun throw en cas de déficit
- aucun bâtiment désactivé
- aucun état de dette
- aucun report au tick suivant

Si Material = 0 :

upkeep payment = 0

Le jeu continue normalement.

IMPORTANT :

Ne pas implémenter un système générique :

- MaintenanceSystem
- UpkeepEngine
- CostResolver
- GenericMaintenance
- BuildingMaintenance abstraction

Le contrat est volontairement local et minimal.
Une abstraction n’est acceptable que si elle est déjà imposée par l’architecture existante.

==================================================
3. SUBJECT EXACT
==================================================

SEULS les Workshops :

- operational
- ET staffed

paient l’upkeep.

Ne PAS faire payer :

- Residences
- Farms
- Workshops under construction
- Workshops planned
- Workshops disabled
- Workshops operational mais vacants

Un Workshop vacant coûte exactement 0.

Le comptage doit rester déterministe.

Si une itération est nécessaire, respecter les conventions de déterminisme existantes, notamment l’ordre canonique des IDs lorsqu’il est requis.

==================================================
4. SAME-TICK SEMANTICS
==================================================

Respecter exactement les phases existantes.

Cas important :

Si un bâtiment devient operational au tick N via advanceConstruction,
utiliser les sémantiques déjà définies par le moteur.

Ne pas créer de second passage same-tick non prévu.

Ne pas modifier l’ordre global des phases sauf nécessité absolue démontrée par le code existant.

L’upkeep doit être explicitement placé après produceMaterial et avant advanceTime.

==================================================
5. NO PERSISTED STATE
==================================================

NE PAS modifier SimulationState pour stocker :

- upkeep
- upkeepDue
- netMaterial
- staffedWorkshopCount
- maintenance
- dette
- historique d’upkeep

Tout cela doit être dérivé.

SAVE_VERSION reste :

4

Hash canonique inchangé.

Round-trip save/load inchangé.

Aucune migration.

==================================================
6. DERIVED QUERIES
==================================================

Ajouter uniquement les queries dérivées nécessaires si elles n’existent pas déjà :

getMaterialUpkeepPerTick(state)

getNetMaterialPerTick(state)

Elles doivent être :

- pures
- déterministes
- non persistées
- non hashées
- sans mutation
- sans wall-clock
- sans random

Ne pas ajouter inutilement :

isMaterialSustainable()

Le contrat établit déjà que le net Material est >= 0 avec la règle actuelle.
Exposer le net brut est plus utile.

Réutiliser les conventions existantes des queries économiques.

==================================================
7. PLAYER-FACING CAUSAL FEEDBACK
==================================================

Le système doit rendre la causalité visible sans créer de nouveau dashboard,
nouvelle jauge ou nouvelle page.

Le status existant doit pouvoir afficher :

1 worker produced 2 material · upkeep 1

2 workers produced 4 material · upkeep 2

Quand W = 0 :

No production · upkeep 0

En cas de paiement partiel :

upkeep shortfall — paid A/B

Utiliser les valeurs réelles.

NE PAS inventer un nouveau système de notification.

Inspection Workshop :

- staffed operational Workshop → upkeep 1/tick
- vacant Workshop → upkeep 0 (vacant)

Residence/Farm :

- aucun upkeep

Conserver les textes/UI existants autant que possible.

==================================================
8. IMPORTANT — EXISTING BEHAVIOR
==================================================

NE PAS casser :

- Residence cost = 25
- Farm cost = 25
- Workshop cost = 25
- construction duration = 2 ticks
- Food production = Farm × 2
- Food consumption = population × 1
- Workshop production = workers × 2
- Jobs/capacity existants
- assignJobs
- starvation behavior
- colonist admission
- construction lifecycle
- deterministic tick ordering
- existing save/load
- existing hash
- existing UI contract

L’upkeep est un nouveau sink Material.
Il ne doit pas devenir un nouveau système économique.

==================================================
9. IMPLEMENTATION STRATEGY
==================================================

Avant de modifier :

1. inspecter phases.ts
2. inspecter resources.ts
3. inspecter buildings/construction domain
4. inspecter assignJobs
5. inspecter production
6. inspecter existing status/UI
7. inspecter existing tests/E2E
8. identifier exactement où Material est actuellement produit et muté

Puis implémenter le minimum nécessaire.

Préférer une fonction pure du style conceptuel :

applyMaterialUpkeep(state)

mais adapter le nom et l’emplacement aux conventions existantes.

La fonction doit :

- dériver staffed operational Workshops
- calculer upkeep
- déduire min(stock, upkeep)
- retourner le nouvel état/resource flow
- ne muter aucun bâtiment

Ne pas introduire de mutation bâtiment-par-bâtiment.

==================================================
10. TESTS UNITAIRES
==================================================

Ajouter des tests déterministes couvrant au minimum :

A — no operational Workshop

upkeep = 0

B — operational vacant Workshop

upkeep = 0

C — one staffed operational Workshop

upkeep = 1

D — two staffed operational Workshops

upkeep = 2

E — four staffed operational Workshops

upkeep = 4

F — zero workers

upkeep = 0

G — production + upkeep

1 worker:

production = 2
upkeep = 1
net = +1

H — insufficient Material

stock < upkeep

payment = stock
final stock = 0
no negative value

I — zero Material

stock = 0
upkeep due > 0
final stock = 0
no exception

J — buildings remain operational after deficit

K — recovery

stock = 0
workers > 0

next tick:
production continues
upkeep is paid from production
Material becomes positive when net > 0

L — starvation

population → 0
jobs purged
workers = 0
upkeep = 0

No double penalty.

M — determinism

same state + same commands => same final state

==================================================
11. E2E / HEADLESS CHROMIUM
==================================================

Ajouter ou adapter les E2E selon les patterns existants
(jobsRun / productionRun notamment).

Minimum :

Scenario A
fresh state
no operational Workshop
upkeep 0

Scenario B
operational Residence/Farm/Workshop
Workshop vacant
upkeep 0

Scenario C
1 worker + 1 staffed Workshop

production = 2
upkeep = 1
net = +1/tick

Sur >=10 ticks :
Material doit progresser de +1/tick hors coûts de construction.

Scenario D
2 workers + 2 staffed Workshops

production = 4
upkeep = 2
net = +2/tick

Scenario E
Material = 0 + workers > 0

production continue
upkeep partial
Material ne devient jamais négatif

Scenario F
recovery

Après un stock à 0 :

production continue
Material remonte
construction redevient possible lorsque stock >= 25

Scenario G
0 workers

upkeep = 0
Material ne fuit pas
admission/re-staffing reste possible selon les règles existantes

ASSERTIONS :

- utiliser le DOM réel
- ne pas utiliser uniquement window.__nova
- vérifier les textes causaux
- vérifier les valeurs économiques visibles
- screenshots si le framework existant le permet
- inspecter visuellement les screenshots produits

==================================================
12. DETERMINISM AUDIT
==================================================

Après implémentation :

chercher dans src/ :

Math.random
Date.now
performance.now

et vérifier qu’aucune nouvelle source de non-déterminisme
n’a été introduite.

Vérifier également :

- aucune dépendance à l’ordre non déterministe d’un Set/Map
  lorsqu’elle influence le résultat
- aucun état mutable caché
- aucun wall-clock
- aucun side effect dans les queries

==================================================
13. SAVE / HASH AUDIT
==================================================

Confirmer explicitement :

SAVE_VERSION = 4

Aucun nouveau champ sérialisé.

Aucun changement du hash canonique.

Save → load → hash identique.

==================================================
14. SCOPE GUARD
==================================================

NE PAS implémenter :

- Money
- Income
- Demand
- Trade
- Taxes
- Salaries
- Prices
- Market
- Business revenue
- Power
- Water
- Farm upkeep
- Farm workers
- Building degradation
- Repairs
- Building destruction
- Generic maintenance framework
- Decimal resources
- New SimulationState fields
- SAVE_VERSION bump
- Dashboard
- Notifications
- Cost rebalance
- Production rebalance
- Food rebalance
- assignJobs redesign
- phase-order redesign

Si une de ces modifications semble nécessaire :

STOP.

Documenter le conflit avec le contrat 08C au lieu de contourner le design.

==================================================
15. COMPLETION CRITERIA
==================================================

Step 08C est COMPLETE uniquement si :

[ ] staffed operational Workshops paient 1 Material/tick
[ ] vacant Workshops paient 0
[ ] non-Workshops paient 0
[ ] upkeep intervient après production
[ ] same-tick staffing respecté
[ ] Material ne devient jamais négatif
[ ] déficit = paiement partiel
[ ] aucun bâtiment désactivé
[ ] aucune dette
[ ] recovery automatique
[ ] zero workers => upkeep 0
[ ] starvation => upkeep 0
[ ] aucun nouvel état persisté
[ ] SAVE_VERSION = 4
[ ] hash inchangé
[ ] queries dérivées pures
[ ] status causal visible
[ ] inspection Workshop cohérente
[ ] tests unitaires passent
[ ] E2E passent
[ ] tests existants passent
[ ] lint/typecheck passent
[ ] determinism audit OK
[ ] screenshots E2E inspectés
[ ] git diff ne contient aucun changement hors scope

==================================================
16. FINAL REPORT
==================================================

À la fin, fournir :

1. fichiers modifiés
2. résumé des changements
3. tests exécutés + résultats
4. E2E exécutés + résultats
5. confirmation SAVE_VERSION
6. confirmation hash
7. confirmation aucune nouvelle donnée persistée
8. confirmation determinism audit
9. screenshots produits + résultat de leur inspection
10. éventuels problèmes rencontrés

IMPORTANT :

Ne pas déclarer COMPLETE sur la seule base de tests unitaires.

Le Step 08C doit être validé par :

code + tests + E2E + inspection UI + audit determinism/save/hash.

COMMIT UNIQUEMENT SI TOUT EST VERT.

Commit message :

Step 08C: operational material upkeep
