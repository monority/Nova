# NOVA — Step 04 : First Resource Constraint & Construction Cost

## Objectif

Construire la première vraie boucle économique minimale de NOVA :

```text
Resource stock
      ↓
Building placement request
      ↓
Construction cost validation
      ↓
Accepted / Rejected
      ↓
Resource deduction
      ↓
Construction lifecycle
      ↓
Operational building
```

Cette étape doit prouver que NOVA peut introduire une contrainte de gameplay réelle dans son architecture déterministe sans créer de logique économique dans l'UI ou le renderer.

## IMPORTANT

Cette étape ne doit PAS devenir un système économique complet.

Ne pas implémenter :

* plusieurs ressources ;
* production ;
* consommation ;
* emplois ;
* marchés ;
* commerce ;
* prix dynamiques ;
* population needs ;
* énergie ;
* nourriture ;
* chaînes de production ;
* bâtiments producteurs ;
* stockage complexe ;
* transport ;
* routes ;
* pathfinding.

Une seule ressource abstraite suffit.

Le but est de démontrer l'architecture.

---

# 0. AUDIT OBLIGATOIRE

Avant toute modification, inspecte :

* `SimulationState`
* world config
* building domain
* construction lifecycle
* commands
* command validation
* queries
* persistence
* hashing
* `RenderSnapshot`
* `getBuildingInspection`
* UI
* `GameController`
* `window.__nova`
* E2E existants
* GPU E2E
* roadmap/docs.

Identifie précisément où un stock global de ressources peut naturellement appartenir.

Ne crée pas une nouvelle architecture si une structure existante peut être étendue proprement.

---

# 1. RESOURCE MODEL

Introduire une seule ressource abstraite.

Le nom peut être déterminé à partir des conventions/documents du projet.

Exemple conceptuel :

```ts
type ResourceStock = {
  construction: number
}
```

ou :

```ts
resources: {
  constructionMaterial: number
}
```

Choisis un nom cohérent avec le vocabulaire actuel de NOVA.

IMPORTANT :

La ressource doit être une donnée de simulation.

Elle appartient donc à `SimulationState` ou à une structure de domaine équivalente.

Elle ne doit PAS vivre uniquement dans :

* React/UI ;
* `window.__nova`;
* renderer ;
* localStorage ;
* variable globale JavaScript.

---

# 2. INITIAL STATE

Définir un stock initial déterministe.

Par exemple :

```text
construction material: 100
```

Mais utilise la valeur appropriée selon les documents existants.

Ne rends pas cette valeur aléatoire.

À état initial identique :

```text
SimulationState A
===
SimulationState B
```

doit produire exactement le même stock.

---

# 3. BUILDING COST

Chaque bâtiment constructible doit avoir un coût déterministe.

Pour commencer, un seul type de bâtiment peut suffire.

Exemple conceptuel :

```text
Residence
Construction cost: 25
```

Le coût doit être défini dans le domaine/catalogue de bâtiments existant.

Ne mets pas :

```ts
if (building.type === "residence") cost = 25
```

dans `main.ts`.

Le renderer/UI ne doit jamais connaître la règle économique.

---

# 4. PLACEMENT VALIDATION

Le placement doit désormais vérifier deux catégories de contraintes :

```text
Spatial constraints
+
Resource constraints
```

Conceptuellement :

```text
validatePlacement(...)
        ↓
spatial validity
        +
resource availability
```

Ne mélange pas les responsabilités.

Il doit être possible de distinguer :

```text
invalid cell
```

de :

```text
insufficient resources
```

Le message de refus doit être déterministe.

---

# 5. COMMAND FLOW

Le flux attendu doit rester :

```text
Browser
 ↓
UI/controller
 ↓
dispatchCommand()
 ↓
domain/application command
 ↓
validation
 ↓
SimulationState
 ↓
RenderSnapshot
 ↓
renderer
```

Le navigateur ne doit jamais faire :

```text
resources -= cost
```

La déduction doit être effectuée par la simulation.

---

# 6. TRANSACTIONAL BEHAVIOR

Le placement doit être atomique du point de vue de la simulation.

Si les ressources sont insuffisantes :

```text
building NOT created
resources NOT changed
tick behavior unchanged according to current command semantics
```

Il ne doit jamais être possible d'obtenir :

```text
resource deducted
+
building not created
```

ou :

```text
building created
+
resource not deducted
```

pour une commande acceptée.

---

# 7. ACCEPTED PLACEMENT

Lorsqu'un placement est accepté :

```text
before:

resources = 100
build cost = 25
buildings = 0

after:

resources = 75
buildings = 1
```

Le coût exact doit être celui défini par le domaine.

La déduction doit être visible dans l'état de simulation.

---

# 8. FAILED PLACEMENT

Tester explicitement :

```text
resources < constructionCost
```

Exemple :

```text
resources = 10
cost = 25
```

Résultat :

```text
placement rejected
resources = 10
buildings = unchanged
```

La simulation doit rester cohérente.

---

# 9. RESOURCE QUERY

Ajouter une query pure pour exposer le stock à l'interface.

Conceptuellement :

```ts
getResourceStock(state)
```

Elle doit être :

* pure ;
* déterministe ;
* sans DOM ;
* sans Three.js ;
* sans browser.

Ne crée pas une seconde représentation mutable des ressources.

---

# 10. RENDER SNAPSHOT

Si le HUD existant doit afficher le stock, faire évoluer le snapshot ou le modèle de présentation proprement.

Par exemple :

```ts
type RenderSnapshot = {
  ...
  resources: {
    construction: number
  }
}
```

Mais seulement si cela correspond réellement aux conventions actuelles.

Ne force pas une donnée de gameplay dans `RenderSnapshot` si une query/application presentation model est plus appropriée.

Décide après audit.

---

# 11. UI

Ajouter une présentation minimale du stock.

Exemple :

```text
CONSTRUCTION MATERIAL
75
```

ou une forme cohérente avec le design actuel.

Ne transforme pas le HUD en interface de city-builder complète.

L'utilisateur doit simplement pouvoir comprendre :

```text
stock actuel
coût du bâtiment
```

---

# 12. PLACEMENT PREVIEW

Le preview de placement doit utiliser la même vérité que la commande réelle.

Cas :

```text
spatial valid
+
resources sufficient
```

→ preview valide.

Cas :

```text
spatial valid
+
resources insufficient
```

→ preview clairement invalide.

IMPORTANT :

Ne duplique pas la règle économique dans le renderer.

Le renderer reçoit le résultat d'une validation/query.

---

# 13. EXPLAINABLE FAILURE

Lorsque le placement est refusé, l'UI doit pouvoir indiquer la vraie raison.

Exemple :

```text
Cannot build Residence

Insufficient construction material
Required: 25
Available: 10
```

Les valeurs doivent provenir de la simulation/query réelle.

Ne fabrique jamais un message à partir de constantes UI indépendantes.

---

# 14. TEMPORAL BEHAVIOR

La construction continue de fonctionner comme avant.

Important :

**Ne modifie pas la durée de construction de Step 03.**

Si la construction durait 2 ticks, elle doit toujours durer 2 ticks.

La nouvelle ressource concerne :

```text
permission to start construction
```

pas :

```text
construction progression
```

---

# 15. MULTIPLE BUILDINGS

Tester au minimum deux constructions.

Exemple :

```text
initial resources = 100
cost = 25

place building 1
resources = 75

place building 2
resources = 50
```

Puis continuer jusqu'à :

```text
resources < cost
```

et vérifier que la construction suivante est refusée.

Le système doit rester déterministe.

---

# 16. DETERMINISTIC ORDER

Si plusieurs commandes peuvent être appliquées dans une même progression, vérifie que l'ordre est explicite et déterministe.

Ne dépendre d'aucun :

* object iteration order implicite ;
* Date ;
* random ;
* browser timing.

---

# 17. PERSISTENCE

Puisque les ressources font maintenant partie de `SimulationState`, vérifier :

```text
save
 ↓
load
 ↓
same resource stock
```

Le hash canonique doit également prendre en compte les ressources.

Deux états avec des stocks différents doivent produire des hashes différents.

Exemple conceptuel :

```text
state A:
resources = 100

state B:
resources = 75

hash A !== hash B
```

---

# 18. VERSIONNED PERSISTENCE

Si l'ajout de ressources modifie le schema persisté :

* mettre à jour la version selon les conventions existantes ;
* mettre à jour la validation ;
* ne pas accepter silencieusement un état invalide ;
* tester les données incompatibles.

Ne contourne pas le système de persistence existant.

---

# 19. DETERMINISM TESTS

Ajouter des tests prouvant :

### Same input

```text
same initial state
+
same placement commands
=
same final state
```

### Resource deduction

```text
same placement
=
same cost
=
same resulting stock
```

### Rejection

```text
insufficient stock
=
same rejection
=
same state
```

### Hash

```text
different resources
=
different canonical state/hash
```

---

# 20. UNIT TESTS

Tester au minimum :

* initial resource state ;
* building cost ;
* sufficient resources ;
* insufficient resources ;
* resource deduction ;
* rejected placement leaves resources unchanged ;
* rejected placement leaves buildings unchanged ;
* multiple accepted constructions ;
* construction lifecycle unchanged ;
* persistence roundtrip ;
* deterministic hashing.

Les tests doivent tester le domaine/application réel.

---

# 21. BROWSER E2E

Créer ou étendre un vrai scénario Playwright.

Le test doit utiliser le navigateur réel comme les étapes précédentes.

Scénario minimum :

```text
LOAD
 ↓
resource stock visible
 ↓
select build placement
 ↓
hover valid cell
 ↓
preview valid
 ↓
real mouse click
 ↓
building created
 ↓
resource stock decreased
 ↓
STEP
 ↓
construction progresses
 ↓
STEP
 ↓
building operational
```

---

# 22. RESOURCE DEPLETION E2E

Le scénario doit ensuite consommer suffisamment de ressources.

Par exemple :

```text
place building
place building
...
```

jusqu'à ce que le stock soit inférieur au coût.

Puis :

```text
hover valid cell
```

mais :

```text
preview = invalid
```

et :

```text
real mouse click
```

doit être refusé.

Assertions :

```text
building count unchanged
resource stock unchanged
```

après la tentative refusée.

---

# 23. REAL BROWSER INTERACTION

Ne simule pas uniquement les appels JavaScript.

Utilise réellement :

```text
mouse.move()
mouse.click()
```

sur le canvas pour les interactions de placement.

Les assertions DOM sont complémentaires.

Elles ne remplacent pas l'interaction réelle.

---

# 24. PLAY / PAUSE / STEP

Vérifier que l'ajout des ressources ne casse pas :

* PLAY ;
* PAUSE ;
* STEP ;
* vitesse 1x ;
* vitesse 2x ;
* vitesse 4x.

Le stock de ressources ne doit pas changer spontanément pendant :

```text
PLAY
```

sauf si un système existant le justifie explicitement.

Il n'y a pas encore de production de ressources.

---

# 25. SCREENSHOTS

Capturer au minimum :

```text
artifacts/resources/
```

avec :

```text
01-initial.png
02-valid-placement.png
03-after-construction-start.png
04-operational.png
05-low-resources.png
06-rejected-placement.png
```

Les noms peuvent suivre les conventions existantes.

Les screenshots doivent correspondre à de vrais états observés.

---

# 26. GPU E2E

Le GPU E2E doit être conservé et continuer à passer.

Idéalement, étendre `gpuRun.mjs` pour couvrir :

```text
GPU detected
 ↓
NOVA loaded
 ↓
resource UI
 ↓
real placement
 ↓
resource deduction
 ↓
construction
 ↓
operational
 ↓
resource exhaustion
 ↓
rejected placement
```

Le renderer doit toujours confirmer :

```text
WebGL2
NVIDIA
Software Renderer = false
```

Aucun fallback SwiftShader accepté.

---

# 27. CONSOLE

Pendant les E2E :

* écouter `console`;
* écouter `pageerror`;
* échouer en cas d'erreur pertinente.

Objectif :

```text
Console errors: 0
Page errors: 0
```

---

# 28. VISUAL INSPECTION

L'agent doit capturer les screenshots.

S'il dispose réellement d'un mécanisme permettant de lire/inspecter les images ou le navigateur visuellement, il doit l'utiliser.

Sinon, il doit explicitement écrire :

```text
Visual inspection: NOT EXECUTED
```

et ne doit PAS prétendre avoir vérifié visuellement les PNG.

La présence d'un fichier PNG n'est pas une preuve de qualité visuelle.

---

# 29. ARCHITECTURE

Après implementation, vérifier que :

```text
Domain
 ↓
Application
 ↓
Presentation
 ↓
Browser
```

reste intact.

Aucun code du type :

```ts
window.resources
document.resources
threeScene.resources
```

ne doit devenir la source de vérité.

La source de vérité est `SimulationState`.

---

# 30. PERFORMANCE

Ne recalculer le stock inutilement à chaque frame.

Le stock est une donnée discrète de simulation.

Le renderer/UI doit être mis à jour lorsque le snapshot/application state change.

Ne créer aucun nouvel objet Three.js à chaque frame pour afficher le stock.

---

# 31. TESTS FINAUX

Exécuter :

```text
unit tests
integration tests
E2E
resource E2E
GPU E2E
lint
typecheck
build
architecture checks
```

Vérifier également :

```text
domain → no browser
domain → no Three.js
domain → no random
domain → no Date.now
domain → no performance.now
```

---

# 32. CRITÈRES DE SUCCÈS

## Domain

* [ ] ressource dans l'état de simulation ;
* [ ] coût dans le domaine/catalogue ;
* [ ] validation économique déterministe ;
* [ ] déduction atomique ;
* [ ] refus atomique ;
* [ ] aucune logique économique dans UI/renderer.

## Simulation

* [ ] construction existante inchangée ;
* [ ] durée de construction inchangée ;
* [ ] population existante inchangée ;
* [ ] ressources correctement déduites.

## Persistence

* [ ] roundtrip correct ;
* [ ] hash intègre les ressources ;
* [ ] validation schema correcte.

## Browser

* [ ] stock visible ;
* [ ] coût observable ;
* [ ] preview cohérent ;
* [ ] placement réel ;
* [ ] stock diminué ;
* [ ] placement refusé si stock insuffisant ;
* [ ] état inchangé après refus.

## GPU

* [ ] GPU E2E PASS ;
* [ ] NVIDIA confirmée ;
* [ ] Software Renderer = false ;
* [ ] WebGL2 PASS.

## Quality

* [ ] Unit PASS ;
* [ ] Integration PASS ;
* [ ] E2E PASS ;
* [ ] Resource E2E PASS ;
* [ ] GPU E2E PASS ;
* [ ] Lint PASS ;
* [ ] Typecheck PASS ;
* [ ] Build PASS ;
* [ ] architecture PASS.

---

# 33. STATUT

Utiliser uniquement :

### COMPLETE

Toutes les validations réellement exécutées et passées.

### PARTIAL

Implémentation fonctionnelle mais une validation demandée n'a pas pu être exécutée.

### BLOCKED

Une dépendance empêche l'implémentation ou la validation.

Ne jamais déclarer COMPLETE sur la base de tests non exécutés.

---

# 34. RAPPORT FINAL

Fournir :

## Implementation

Tous les fichiers créés/modifiés avec leur rôle.

## Resource model

Décrire :

```text
initial stock
building cost
deduction
rejection
```

avec les valeurs réellement utilisées.

## Simulation

Montrer un scénario réel :

```text
Initial:
resources = ?

After placement:
resources = ?
buildings = ?

After second placement:
resources = ?
buildings = ?

Insufficient:
resources = ?
buildings = unchanged
```

## Browser

Rapporter :

```text
Navigation
Mouse
Click
Preview
Resource UI
Placement
Rejection
STEP
PLAY
PAUSE
Speed
Screenshots
Console
Page errors
```

## GPU

Donner les valeurs réellement observées :

```text
WebGL:
Vendor:
Renderer:
Unmasked Vendor:
Unmasked Renderer:
Software Renderer:
NVIDIA:
```

## Tests

Donner les résultats exacts.

## Persistence

Confirmer le roundtrip et le hash.

## Limitations

Déclarer honnêtement ce qui n'a pas été vérifié.

## Final status

```text
COMPLETE
PARTIAL
BLOCKED
```

Ne choisir `COMPLETE` que si toutes les preuves correspondantes existent réellement.

