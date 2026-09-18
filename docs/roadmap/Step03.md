# NOVA — Step 3 : Causal Temporal Inspection & UX

## Objectif

Maintenant que les validations suivantes sont établies :

* simulation déterministe ;
* renderer Three.js réel ;
* E2E navigateur réel ;
* interactions souris réelles ;
* screenshots ;
* WebGL2 ;
* GPU NVIDIA matériel confirmé sous Windows ;
* pipeline `test:e2e:gpu` fonctionnel ;

construire la prochaine tranche verticale de NOVA :

> **rendre le déroulement temporel et causal de la simulation observable et compréhensible dans le navigateur.**

Le but n'est PAS encore d'ajouter de nouveaux systèmes de gameplay.

Le joueur doit pouvoir comprendre visuellement :

```text
placement
   ↓
construction
   ↓
progression temporelle
   ↓
construction terminée
   ↓
bâtiment opérationnel
   ↓
capacité de logement
   ↓
coloniste admis
   ↓
résidence attribuée
```

Chaque étape doit être observable dans le véritable navigateur.

---

# 0. AUDIT OBLIGATOIRE

Avant toute modification :

Inspecte :

* `src/domain`
* `src/application`
* `src/app`
* renderer Three.js
* `RenderSnapshot`
* `SimulationState`
* commandes
* queries
* simulation clock
* UI existante
* `window.__nova`
* E2E existants
* GPU E2E
* screenshots existants
* tests
* documentation/roadmap.

Ne suppose pas que l'architecture correspond exactement aux étapes précédentes.

Comprends d'abord le code réel.

Identifie notamment :

1. comment un bâtiment est placé ;
2. où son état `underConstruction` est stocké ;
3. comment la durée de construction est représentée ;
4. comment le passage d'un tick est appliqué ;
5. quand le bâtiment devient opérationnel ;
6. comment la capacité de logement est calculée ;
7. quand un coloniste est créé/admis ;
8. comment sa résidence est attribuée ;
9. comment ces informations arrivent actuellement jusqu'au renderer.

Ne réimplémente aucune logique déjà présente.

---

# 1. PRINCIPE ARCHITECTURAL

Conserver strictement :

```text
Domain
   ↓
Application
   ↓
RenderSnapshot / Query
   ↓
Presentation
   ↓
Three.js
```

Le domaine ne doit toujours dépendre d'aucun :

* DOM ;
* browser ;
* Three.js ;
* WebGL ;
* React ;
* `window`;
* `document`;
* `Date.now`;
* `performance.now`;
* `Math.random`.

Le renderer ne doit pas reconstruire des informations métier à partir d'informations visuelles.

Si une information causale est nécessaire au rendu/UI, elle doit être exposée proprement par le domaine/application.

---

# 2. INSPECTION D'UN BÂTIMENT

Créer ou compléter une query pure d'inspection du bâtiment.

Le nom exact doit respecter les conventions du repository.

Par exemple conceptuellement :

```ts
getBuildingInspection(...)
```

Elle doit permettre de connaître les informations réellement présentes dans le modèle.

Elle peut exposer, selon ce que le modèle contient réellement :

```text
id
type
cell
state
constructionRemaining
constructionDuration
housingCapacity
occupancy
```

et une représentation explicite du statut.

Exemple conceptuel :

```ts
type BuildingInspection = {
  id: string
  type: ...
  state: "underConstruction" | "operational"
  constructionRemaining: number | null
  constructionDuration: number | null
  housingCapacity: number
  occupiedHousing: number
}
```

Ne crée PAS de valeurs fictives.

Si le modèle ne contient pas encore une donnée, détermine d'abord si elle peut être dérivée proprement à partir des données existantes.

---

# 3. CAUSALITÉ EXPLICITE

L'interface doit permettre de comprendre pourquoi le bâtiment change d'état.

Par exemple :

```text
CONSTRUCTION
2 ticks remaining
```

puis :

```text
CONSTRUCTION
1 tick remaining
```

puis :

```text
OPERATIONAL
```

puis :

```text
1 resident
```

Ne crée pas une fausse simulation parallèle uniquement pour afficher ces valeurs.

Les informations affichées doivent être dérivées de la simulation réelle.

---

# 4. UI D'INSPECTION

Ajouter une UI d'inspection minimale et cohérente avec le design actuel.

Lorsqu'un bâtiment est sélectionné, afficher ses informations.

Exemple conceptuel :

```text
BUILDING #1

Residence

STATUS
Under construction

CONSTRUCTION
1 tick remaining

HOUSING
Capacity      1
Residents     0
```

Puis après progression :

```text
BUILDING #1

Residence

STATUS
Operational

HOUSING
Capacity      1
Residents     1
```

Le contenu exact doit suivre les données réelles du projet.

Ne construis pas un énorme panneau UI.

Il s'agit d'un outil d'observation du moteur, pas d'un HUD complet.

---

# 5. SÉLECTION

Permettre de sélectionner un bâtiment existant dans le navigateur.

Privilégier le mécanisme de picking déjà présent.

Si le projet dispose déjà d'une projection :

```text
cell → screen
```

et d'un système de picking, réutilise-les.

Ne crée pas un second système concurrent.

Le flux doit être :

```text
mouse
 ↓
picking
 ↓
building id
 ↓
application query
 ↓
inspection data
 ↓
UI
```

Le renderer ne doit pas décider de l'état métier.

---

# 6. PROGRESSION TEMPORELLE

Le bouton `STEP` doit rester la manière déterministe principale de faire progresser la simulation.

Le scénario minimum doit montrer :

### Tick initial

```text
Tick 0
Buildings 0
Colonists 0
```

### Placement

Après clic :

```text
Tick 1
Buildings 1
Construction
```

### Premier STEP

```text
Tick 2
Building still construction / transition according to actual domain rules
```

### STEP suivant

```text
Tick 3
Building operational
Colonist admitted
```

Les ticks exacts peuvent différer si l'implémentation actuelle possède une durée différente.

**Ne modifie pas arbitrairement la durée de construction uniquement pour correspondre à cet exemple.**

Le test doit suivre les règles réelles du domaine.

---

# 7. PLAY / PAUSE

Vérifie également que le mode PLAY existant continue de fonctionner.

Le test doit confirmer que :

```text
PLAY
 ↓
ticks progress
 ↓
construction progresses
 ↓
building becomes operational
```

Puis :

```text
PAUSE
 ↓
tick stops advancing
```

Le timing réel ne doit pas devenir une nouvelle source de non-déterminisme dans le domaine.

Le clock reste une préoccupation application/presentation.

---

# 8. VITESSES

Si les contrôles :

```text
1x
2x
4x
```

existent déjà, vérifie leur comportement sans réécrire le système.

Important :

la vitesse ne doit pas modifier la logique déterministe de `stepSimulation`.

Elle modifie uniquement la fréquence d'application des ticks par le clock de présentation.

---

# 9. CAUSALITÉ DU COLONISTE

Lorsque le bâtiment devient opérationnel et qu'un coloniste est admis :

l'UI doit permettre de comprendre le lien :

```text
Building
    ↓
Housing capacity
    ↓
Colonist admission
    ↓
Residence assignment
```

Si l'application possède déjà des données permettant d'exposer cette relation, utilise-les.

Ne crée pas de système de population supplémentaire.

Le coloniste doit toujours provenir de la simulation réelle.

---

# 10. SNAPSHOT

Si `RenderSnapshot` ne contient pas suffisamment d'informations pour afficher correctement l'état causal, fais l'évolution minimale nécessaire.

Par exemple, si actuellement :

```ts
RenderBuilding
```

ne contient que :

```ts
{
  id,
  cell,
  state
}
```

et que le renderer/UI doit connaître :

```text
constructionRemaining
```

ajoute cette donnée au snapshot si elle appartient naturellement à la représentation de rendu.

Mais :

* ne duplique pas la simulation ;
* ne calcule pas la durée dans Three.js ;
* ne stocke pas un état parallèle dans le renderer.

---

# 11. PAS DE NOUVEAUX SYSTÈMES DE GAMEPLAY

Cette étape ne doit PAS introduire :

* économie ;
* ressources ;
* production ;
* consommation ;
* besoins ;
* bonheur ;
* santé ;
* emploi ;
* transport ;
* routes ;
* pathfinding ;
* zones ;
* technologie ;
* services ;
* pollution ;
* météo ;
* agriculture ;
* énergie ;
* marché ;
* génération procédurale.

Ces systèmes viendront plus tard.

L'objectif actuel est de rendre le moteur existant observable.

---

# 12. TESTS UNITAIRES

Ajouter les tests nécessaires pour la nouvelle query / projection / inspection.

Tester au minimum :

### Inspection construction

```text
building exists
state = underConstruction
remaining > 0
```

### Progression

Après un tick :

```text
remaining decreases
```

### Transition

Lorsque le compteur atteint la condition prévue :

```text
state = operational
```

### Housing

Lorsque le bâtiment est opérationnel :

```text
housing capacity reflects domain
```

### Colonist

Lorsque les conditions réelles sont satisfaites :

```text
colonist exists
residence points to correct building/cell
```

Les tests doivent utiliser les vraies règles du domaine.

---

# 13. TESTS DE DÉTERMINISME

Vérifie que les nouvelles queries sont pures.

À état identique :

```text
query(state)
===
query(state)
```

et que deux simulations identiques produisent toujours les mêmes résultats.

Ne rajoute aucune dépendance temporelle réelle.

---

# 14. BROWSER E2E OBLIGATOIRE

Le test ne doit pas se limiter aux tests unitaires.

Utilise le vrai Playwright déjà établi.

Le scénario doit être exécuté dans un vrai navigateur.

Minimum :

```text
LOAD
 ↓
initial state
 ↓
real mouse interaction
 ↓
building placed
 ↓
select building
 ↓
inspection visible
 ↓
STEP
 ↓
inspection updated
 ↓
STEP
 ↓
operational state visible
 ↓
colonist state visible
```

Utilise les vrais événements souris.

Pas :

```js
element.click()
```

comme unique preuve si l'interaction normale passe par le canvas.

Privilégie :

```text
mouse.move()
mouse.click()
```

sur les coordonnées réelles calculées/projetées.

---

# 15. ASSERTIONS E2E

Vérifie réellement dans le navigateur :

### Initial

```text
Tick 0
Buildings 0
Colonists 0
```

### Après placement

```text
Buildings 1
```

et inspection :

```text
Under construction
```

### Après progression

Vérifie la valeur réelle de `constructionRemaining`.

### Après transition

Vérifie :

```text
Operational
```

### Population

Vérifie :

```text
Colonists 1
```

et la relation de résidence réelle.

### Sélection

Vérifie que l'inspection correspond au bâtiment réellement sélectionné.

---

# 16. SCREENSHOTS

Le test navigateur doit produire des screenshots représentant les étapes importantes.

Minimum :

```text
artifacts/temporal/
```

avec par exemple :

```text
01-initial.png
02-construction.png
03-progress.png
04-operational.png
05-colonist.png
```

Les noms peuvent suivre les conventions existantes.

Ne prétends pas avoir analysé visuellement une image si aucun outil d'inspection visuelle n'a réellement été utilisé.

---

# 17. GPU E2E

Le test GPU déjà mis en place doit continuer à fonctionner.

Ne contourne PAS :

```text
npm run test:e2e:gpu
```

pour gagner du temps.

Le nouveau scénario graphique doit rester compatible avec le renderer GPU réel.

Si possible, ajoute une variante du scénario temporal dans le pipeline GPU.

Objectif :

```text
real browser
+
real WebGL
+
real NVIDIA GPU
+
real interaction
+
real temporal progression
```

---

# 18. CONSOLE ET PAGE ERRORS

Pendant le test :

* écouter `console`;
* écouter `pageerror`;
* échouer en cas d'erreur pertinente ;
* afficher les erreurs dans le rapport.

Objectif :

```text
Console errors: 0
Page errors: 0
```

---

# 19. VISUAL INSPECTION

Si l'environnement permet réellement d'inspecter les screenshots ou le navigateur visuellement, fais-le.

Vérifie notamment :

* bâtiment visible ;
* état construction visible ;
* changement visuel après tick ;
* bâtiment opérationnel visible ;
* coloniste visible ;
* panneau d'inspection lisible ;
* sélection cohérente ;
* aucune UI cassée ;
* aucun élément hors écran inattendu.

Ne fais pas passer une simple assertion DOM pour une inspection visuelle.

Distinction obligatoire :

```text
DOM assertion
≠
visual inspection
```

---

# 20. ACCESSIBILITÉ MINIMALE

Pour les éléments UI nouvellement ajoutés :

* labels compréhensibles ;
* boutons accessibles ;
* informations importantes disponibles dans le DOM ;
* pas de texte uniquement rendu dans le canvas si une information d'inspection peut être exposée en HTML.

Le canvas reste responsable du monde 3D.

Le panneau d'information doit rester accessible au navigateur.

---

# 21. PERFORMANCE

Ne dégrade pas inutilement le renderer.

Ne crée pas à chaque frame :

* de nouveaux panneaux ;
* de nouveaux objets Three.js ;
* des allocations inutiles ;
* des queries lourdes.

L'inspection doit être mise à jour lorsqu'elle est nécessaire, pas à chaque frame si aucune information n'a changé.

---

# 22. VÉRIFICATIONS FINALES

Exécute :

```text
unit tests
integration tests
E2E
GPU E2E
lint
typecheck
build
architecture checks
```

Vérifie également :

```text
domain → no browser dependency
domain → no Three.js dependency
domain → no random
domain → no Date.now
domain → no performance.now
```

---

# 23. CRITÈRES DE SUCCÈS

L'étape peut être `COMPLETE` uniquement si :

### Architecture

* [ ] séparation Domain/Application/Presentation conservée ;
* [ ] aucune logique métier dans Three.js ;
* [ ] aucune simulation parallèle dans l'UI.

### Temporalité

* [ ] construction observable ;
* [ ] progression observable ;
* [ ] transition opérationnelle observable ;
* [ ] coloniste observable ;
* [ ] relation logement/résidence observable.

### Inspection

* [ ] sélection d'un bâtiment fonctionnelle ;
* [ ] inspection basée sur les données réelles ;
* [ ] informations cohérentes avec SimulationState ;
* [ ] pas de données fabriquées.

### Browser

* [ ] vrai navigateur ;
* [ ] vrais événements souris ;
* [ ] assertions E2E ;
* [ ] screenshots ;
* [ ] console vérifiée ;
* [ ] page errors vérifiées.

### GPU

* [ ] GPU E2E existant toujours PASS ;
* [ ] renderer NVIDIA toujours confirmé ;
* [ ] aucun fallback SwiftShader accepté.

### Quality

* [ ] unit tests PASS ;
* [ ] integration PASS ;
* [ ] E2E PASS ;
* [ ] GPU E2E PASS ;
* [ ] lint PASS ;
* [ ] typecheck PASS ;
* [ ] build PASS ;
* [ ] architecture PASS.

---

# 24. STATUT FINAL

Utilise uniquement :

## COMPLETE

Toutes les vérifications ci-dessus ont réellement été exécutées et passées.

## PARTIAL

L'implémentation fonctionne mais une partie de la validation demandée n'a pas pu être exécutée.

Indique précisément laquelle.

## BLOCKED

Une dépendance technique empêche réellement la validation.

Ne transforme jamais une limitation en PASS.

---

# 25. RAPPORT FINAL

À la fin, fournis obligatoirement :

## Implementation

Fichiers modifiés/créés et rôle exact.

## Architecture

Explique le flux :

```text
SimulationState
 ↓
Application Query
 ↓
Inspection / RenderSnapshot
 ↓
UI / Three.js
 ↓
Browser
```

## Temporal scenario

Rapporte les états réellement observés :

```text
Tick:
Building:
Construction remaining:
State:
Housing:
Colonists:
Residence:
```

## Browser

```text
Navigation:
Mouse:
Click:
Selection:
Inspection:
STEP:
PLAY:
PAUSE:
Screenshots:
Console:
Page errors:
```

## GPU

Donne les valeurs réellement observées :

```text
WebGL:
Vendor:
Renderer:
Unmasked Vendor:
Unmasked Renderer:
Software renderer:
NVIDIA:
```

## Tests

Donne les résultats exacts.

## Screenshots

Donne les chemins exacts.

## Limitations

Ne cache aucune limitation.

## Final status

```text
COMPLETE
PARTIAL
BLOCKED
```

Ne déclare `COMPLETE` que si les preuves existent réellement.

