# NOVA — Step 0 — Foundation Reset & Clean Architecture

## Statut

**Step 0 — Foundation Reset**

## Objectif

Reconstruire la fondation technique de NOVA à partir de la documentation consolidée actuelle.

Ce step ne doit **pas** ajouter de nouvelles mécaniques de gameplay significatives.

L'objectif est d'obtenir une base :

* propre ;
* cohérente ;
* déterministe ;
* testable ;
* persistable ;
* découplée du rendering ;
* découplée de React ;
* suffisamment petite pour être comprise et maintenue ;
* prête à recevoir les prochains systèmes de simulation.

Le code existant doit être considéré comme **une base à auditer**, pas comme une architecture à conserver automatiquement.

Ne fais pas un simple refactor cosmétique.

Si une partie de l'ancien code contredit l'architecture documentaire, reconstruis-la proprement plutôt que de préserver artificiellement sa structure.

---

# 1. DOCUMENTATION — OBLIGATOIRE AVANT TOUTE MODIFICATION

Avant de modifier le moindre fichier :

1. inspecte le repository ;
2. lis intégralement les documents NOVA pertinents ;
3. identifie les contradictions entre :

   * documentation ;
   * architecture actuelle ;
   * code actuel ;
   * tests actuels ;
4. établis mentalement la cible architecturale ;
5. seulement ensuite commence l'implémentation.

Les documents de référence sont ceux présents dans `docs/`.

Commence obligatoirement par :

```text
docs/README.md
docs/00-CMD.md
docs/01-product-vision.md
docs/23-product-contract.md
docs/25-mvp.md
docs/26-roadmap.md
docs/27-agent-workflow.md
docs/29-design-rules.md
docs/30-architecture-foundation.md
docs/31-determinism-and-verification.md
```

Puis lis les documents techniques/domaines nécessaires à l'implémentation :

```text
docs/02-game-design.md
docs/03-core-loop.md
docs/04-city-simulation.md
docs/05-world-and-terrain.md
docs/06-construction.md
docs/07-population.md
docs/08-economy.md
docs/09-economy-foundation.md
docs/10-technology.md
docs/11-time-and-events.md
docs/14-rendering-architecture.md
docs/15-technical-architecture.md
docs/17-save-and-persistence.md
docs/18-save-game.md
docs/21-simulation-progression.md
docs/22-canonical-simulation.md
docs/24-project-architecture.md
```

Ne traite jamais un ancien fichier comme une autorité supérieure aux documents consolidés.

En cas de contradiction :

```text
product contract / CMD
        ↓
architecture foundation
        ↓
canonical simulation / determinism
        ↓
MVP
        ↓
domain-specific documents
        ↓
ancien code
```

Si une contradiction importante ne peut pas être résolue sans décision produit, **arrête-toi et signale-la** au lieu d'inventer une règle.

---

# 2. AUDIT INITIAL

Avant toute modification, inspecte notamment :

```text
package.json
tsconfig*
src/
tests/
app/
components/
lib/
domain/
simulation/
rendering/
ui/
```

Adapte les chemins à la structure réellement présente.

Identifie :

* point d'entrée de l'application ;
* état global actuel ;
* modèle de ville ;
* bâtiments ;
* construction ;
* population ;
* simulation ;
* persistence ;
* rendering ;
* UI ;
* commandes utilisateur ;
* tests ;
* dépendances externes ;
* éventuels singletons ;
* logique métier dans React ;
* logique métier dans Three.js ;
* état mutable partagé ;
* utilisation de `Math.random()` ;
* utilisation directe de `Date.now()` ;
* dépendances au navigateur dans le domaine ;
* logique de simulation dépendante du rendering.

Avant de supprimer quoi que ce soit, détermine ce qui est réellement valide.

---

# 3. PRINCIPE — RECONSTRUIRE, NE PAS EMPILER

Ne transforme pas l'ancienne architecture en une succession de wrappers.

Évite notamment :

```text
OldGameManager
    ↓
NewSimulationManager
    ↓
NewGameService
    ↓
NewWorldService
```

ou :

```text
React state
    ↓
Game state
    ↓
Simulation state
    ↓
Render state
```

avec plusieurs sources de vérité.

Il doit exister **un état canonique de simulation**.

Les autres représentations sont des projections.

---

# 4. ARCHITECTURE CIBLE

La structure cible doit être proche de :

```text
src/
├── domain/
│   ├── world/
│   ├── building/
│   ├── population/
│   ├── housing/
│   └── simulation/
│
├── application/
│   ├── commands/
│   ├── queries/
│   └── persistence/
│
├── rendering/
│
└── ui/
```

Tu peux adapter les noms si le projet possède déjà une convention cohérente.

Mais les responsabilités doivent rester séparées.

---

# 5. DOMAIN

Le domaine contient les règles de simulation.

Il ne doit dépendre d'aucun framework UI ou rendering.

Interdit dans `domain/` :

```text
React
Three.js
WebGL
DOM
window
document
localStorage
sessionStorage
fetch
network
filesystem
browser APIs
Date.now()
Math.random()
```

Le domaine doit pouvoir être exécuté dans un environnement Node pur.

---

# 6. CANONICAL SIMULATION STATE

Créer ou reconstruire un état canonique unique.

Il doit représenter uniquement ce qui est nécessaire pour déterminer l'évolution future de la simulation.

Conceptuellement :

```ts
interface SimulationState {
  world: WorldState
  buildings: BuildingState[]
  population: PopulationState
  time: SimulationTime
}
```

Adapte les noms aux modèles réellement définis dans les documents.

Ne crée pas prématurément :

```text
jobs
happiness
food
energy
technology tree
weather
diplomacy
diseases
families
traffic
etc.
```

simplement parce que ces systèmes sont envisageables.

Ils appartiennent aux futurs steps.

---

# 7. SIMULATION FUNCTION

La simulation doit tendre vers une fonction pure :

```ts
stepSimulation(
  state: SimulationState,
  command?: SimulationCommand
): SimulationState
```

ou une structure équivalente si les documents imposent une autre API.

Règles :

* ne pas muter `state` ;
* produire un nouvel état ;
* ordre des phases explicite ;
* aucune dépendance au rendering ;
* aucune dépendance à React ;
* aucun accès à l'horloge système ;
* aucun hasard implicite ;
* comportement reproductible.

---

# 8. PHASES

Les phases doivent être explicites.

Par exemple :

```text
1. Apply player commands
2. Construction / lifecycle
3. Population / housing
4. Autonomous development
5. Other enabled systems
6. Advance simulation time
```

**Ne recopie pas aveuglément cet ordre**.

Utilise l'ordre défini par la documentation consolidée.

Le code doit cependant rendre cet ordre visible.

Évite une fonction monolithique :

```ts
simulateEverything()
```

Préférer des fonctions composables :

```ts
applyCommands(...)
advanceConstruction(...)
updatePopulation(...)
...
```

uniquement pour les systèmes réellement présents.

---

# 9. TIME

Le temps de simulation doit être indépendant du temps réel du navigateur.

Ne fais pas :

```ts
Date.now()
```

pour déterminer l'état du monde.

Le temps simulé doit être stocké explicitement dans `SimulationState`.

Par exemple :

```ts
interface SimulationTime {
  tick: number
}
```

ou le modèle défini dans la documentation.

---

# 10. BUILDINGS

Le modèle bâtiment doit être minimal mais causalement correct.

Si le système de construction actuel est conservé, la règle fondamentale reste :

```text
placement
    ↓
under construction
    ↓
construction ticks
    ↓
operational
```

Les capacités fonctionnelles d'un bâtiment ne doivent pas être disponibles avant son état opérationnel lorsque la documentation l'impose.

Ne rajoute pas de nouveaux coûts économiques ou matériaux dans ce Step si ces systèmes ne font pas partie de la fondation actuelle.

---

# 11. POPULATION

Le modèle de population doit rester minimal.

Step 0 ne doit pas transformer NOVA en simulateur social complet.

Si les concepts `Colonist` / `residence` existent déjà dans le code, audite-les mais ne lance pas encore l'ensemble du Step 1 sauf si le code est nécessaire à la cohérence de la fondation.

La priorité de Step 0 est :

```text
SimulationState
    ↓
Simulation tick
    ↓
Building lifecycle
    ↓
stable deterministic state
```

La population détaillée viendra ensuite.

---

# 12. APPLICATION LAYER

L'application orchestre les commandes et les cas d'utilisation.

Elle peut contenir par exemple :

```text
commands/
queries/
persistence/
```

Elle ne doit pas devenir un nouveau "God Service".

Évite les abstractions prématurées :

```text
GameService
SimulationService
WorldService
UniversalRepository
EventBus
CommandBus
Clock
GenericManager
```

Une abstraction n'est acceptable que si elle résout un problème réellement présent dans le code.

---

# 13. COMMANDS

Les actions du joueur doivent être représentées comme des intentions explicites lorsque le modèle le justifie.

Exemples conceptuels :

```ts
type SimulationCommand =
  | PlaceBuildingCommand
  | EvolveBuildingCommand
  | ...
```

Ne crée pas une architecture générique de commandes si une simple structure suffit.

Une commande doit :

* être explicite ;
* être validable ;
* être déterministe ;
* produire une modification du canonical state ;
* ne pas modifier directement Three.js ou React.

---

# 14. QUERIES / RENDER SNAPSHOT

Le rendering ne doit jamais lire directement la totalité du canonical state si cela crée un couplage inutile.

Créer ou conserver une projection dédiée :

```text
SimulationState
      ↓
Query / Projection
      ↓
RenderSnapshot
      ↓
Three.js
```

Le snapshot est dérivé.

Il ne doit jamais devenir une deuxième source de vérité.

Le renderer ne doit pas modifier `SimulationState`.

---

# 15. UI

React doit être une couche de présentation et d'interaction.

L'UI peut :

```text
display state
dispatch commands
display inspection data
display simulation controls
```

Elle ne doit pas implémenter :

```text
construction rules
housing rules
population rules
simulation rules
determinism rules
```

Ne déplace pas de logique métier dans les composants React.

---

# 16. RENDERING

Three.js/WebGL doit rester une projection visuelle.

Interdit :

```ts
mesh.userData.population += 1
```

comme source de vérité.

Interdit également :

```ts
if (mesh.visible) {
  simulationState...
}
```

Le renderer reçoit les données nécessaires.

Il les représente.

Il ne décide pas de l'évolution du monde.

---

# 17. PERSISTENCE

La persistence doit fonctionner sur le canonical state.

Ne sauvegarde pas :

```text
Three.js objects
React state
camera objects
meshes
materials
GPU resources
render caches
DOM state
```

Le format doit être versionné.

La restauration doit être validée.

Si une version ancienne n'est pas explicitement supportée, elle doit être rejetée proprement plutôt que silencieusement transformée.

---

# 18. DETERMINISM

Deux simulations ayant :

```text
same initial canonical state
+
same command sequence
```

doivent produire :

```text
same canonical state
```

indépendamment :

* du navigateur ;
* du FPS ;
* du rendu ;
* de l'ordre d'insertion des collections ;
* du moment réel d'exécution.

Évite :

```ts
Math.random()
Date.now()
new Date()
Object.keys(...)
```

lorsque leur ordre ou leur valeur peut influencer la simulation.

Utilise des ordres explicites et déterministes.

---

# 19. IDS

Les IDs des entités simulées doivent être stables.

Ne génère pas un ID aléatoire pendant un tick.

Un ID doit être :

* déterministe ;
* unique dans son domaine ;
* stable lors des projections ;
* persistable.

---

# 20. TESTS À CRÉER OU RECONSTRUIRE

Step 0 doit laisser une suite de tests claire.

Minimum :

### Canonical state

* création d'un état initial valide ;
* sérialisation déterministe ;
* hash/empreinte déterministe si le projet en possède une.

### Simulation

* un tick produit le résultat attendu ;
* deux exécutions identiques produisent le même résultat ;
* le tick ne mute pas l'état initial.

### Construction

Si le système existe déjà :

* placement crée le bon état ;
* construction progresse correctement ;
* passage à operational est déterministe ;
* capacité fonctionnelle respecte le lifecycle.

### Rendering

* render snapshot est dérivé du canonical state ;
* aucune mutation du canonical state par la projection.

### Persistence

* save/load round-trip ;
* état restauré équivalent ;
* version invalide rejetée.

### Ordering

Tester explicitement au moins un cas où l'ordre d'insertion ne doit pas changer le résultat.

---

# 21. TEST DE DÉTERMINISME OBLIGATOIRE

Créer un scénario reproductible :

```text
initialState
    ↓
command sequence
    ↓
N simulation ticks
    ↓
finalState
```

Exécuter ce scénario au moins deux fois.

Comparer le résultat canonique.

Le résultat doit être identique.

Si un hash canonique existe :

```text
run A → hash X
run B → hash X
```

Si ce test échoue :

**ne considère pas Step 0 comme terminé.**

---

# 22. VERIFICATION BUILD

Après l'implémentation, exécuter réellement les vérifications disponibles dans le repository.

Au minimum, si les scripts existent :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Ajouter les commandes spécifiques pertinentes si le projet en possède.

Ne jamais déclarer :

```text
COMPLETE
```

si une vérification obligatoire échoue.

---

# 23. VERIFICATION ARCHITECTURALE

Faire également une inspection statique.

Vérifier notamment :

```text
domain → React ?
domain → Three.js ?
domain → browser ?
domain → network ?
domain → persistence ?
simulation → rendering ?
renderer → simulation mutation ?
UI → business rules ?
```

Toute violation doit être :

1. corrigée si elle appartient au scope ;
2. ou explicitement signalée comme dette / blocage.

Ne pas masquer une violation pour obtenir un résultat "propre".

---

# 24. VERIFICATION COMPORTEMENTALE

Ne te limite pas aux tests unitaires.

Construis un scénario représentatif :

```text
create initial world
    ↓
place building
    ↓
tick
    ↓
tick
    ↓
inspect state
    ↓
save
    ↓
load
    ↓
continue simulation
```

Vérifie que le comportement après chargement est identique à celui d'une simulation continue équivalente.

---

# 25. GPU / VISUAL QA

Si le projet possède des tests Playwright/WebGL ou une capture visuelle :

* tente réellement leur exécution ;
* vérifie le résultat si l'environnement le permet ;
* ne confonds pas "test JavaScript réussi" avec "rendu WebGL vérifié".

Si l'environnement GPU/browser empêche une validation fiable :

```text
BLOCKED — visual verification unavailable
```

doit apparaître explicitement dans le rapport.

Ne prétends jamais avoir vérifié visuellement quelque chose qui n'a pas pu être observé.

---

# 26. NETTOYAGE

Supprime uniquement :

* code mort clairement identifié ;
* anciens managers devenus inutiles ;
* duplications introduites par l'ancienne architecture ;
* abstractions contradictoires avec la fondation ;
* tests obsolètes.

Ne supprime pas une fonctionnalité simplement parce qu'elle est imparfaite.

Avant toute suppression importante, vérifie ses dépendances.

---

# 27. PAS DE NOUVELLE FEATURE

Ce Step ne doit PAS introduire :

```text
economy complète
jobs
needs
happiness
technology tree
resources complexes
weather
combat
diplomacy
trade
families
diseases
advanced AI
procedural world generation
multiplayer
```

sauf si une partie est absolument nécessaire à la reconstruction de la fondation déjà documentée.

Step 0 = **architecture + fondation + simulation minimale + vérification**.

---

# 28. DOCUMENTATION DE STEP

À la fin, créer :

```text
docs/roadmap/Step0.md
```

Ce document doit contenir :

## Objective

Pourquoi Step 0 existe.

## Initial architecture

Résumé honnête de l'architecture trouvée.

## Problems found

Liste des problèmes réellement constatés.

## Target architecture

Architecture obtenue.

## Implementation

Liste des changements.

## Domain model

Modèles canoniques réellement présents.

## Simulation

Ordre réel des phases.

## Determinism

Garanties réellement vérifiées.

## Persistence

Comportement réellement vérifié.

## Tests

Nombre et nature des tests.

## Verification

Résultats réels :

```text
lint:
typecheck:
test:
build:
determinism:
persistence:
E2E:
visual:
```

## Remaining issues

Uniquement les problèmes réellement présents.

## Deferred features

Ce qui appartient explicitement aux futurs steps.

## Architectural decisions

Toute décision importante prise pendant le Step.

---

# 29. RAPPORT FINAL OBLIGATOIRE

À la fin de ta réponse, utilise exactement cette structure :

```text
# NOVA — Step 0 — Final Report

## Status

COMPLETE / BLOCKED / PARTIAL

## 1. Implementation

...

## 2. Architecture

...

## 3. Files created

...

## 4. Files modified

...

## 5. Files removed

...

## 6. Domain changes

...

## 7. Simulation changes

...

## 8. Persistence changes

...

## 9. Tests

...

## 10. Verification

| Check | Result |
|---|---|
| lint | |
| typecheck | |
| tests | |
| build | |
| determinism | |
| persistence | |
| E2E | |
| visual | |

## 11. Invariants verified

...

## 12. Not verified

...

## 13. Remaining concerns

...

## 14. Deferred work

...

## 15. Recommendation for Step 1

...
```

Ne mets pas `COMPLETE` si un élément obligatoire de Step 0 n'a pas été vérifié.

---

# 30. RÈGLE FINALE

La priorité n'est pas de produire beaucoup de code.

La priorité est de produire une fondation que les futurs steps pourront étendre sans devoir réécrire le projet.

À la fin de Step 0, un développeur doit pouvoir répondre clairement à ces questions :

1. Où se trouve l'état canonique ?
2. Où vivent les règles métier ?
3. Comment avance un tick ?
4. Dans quel ordre les systèmes s'exécutent-ils ?
5. Comment une commande modifie-t-elle le monde ?
6. Comment le renderer obtient-il ses données ?
7. Comment sauvegarde-t-on le monde ?
8. Comment prouve-t-on le déterminisme ?
9. Comment teste-t-on une nouvelle mécanique ?
10. Comment ajouter un nouveau système sans créer de dépendance circulaire ?

Si l'une de ces réponses reste ambiguë, corrige la fondation ou signale explicitement le problème avant de considérer Step 0 comme terminé.

**Ne commence pas Step 1 dans ce même travail.**

Step 1 sera lancé séparément une fois que Step 0 aura été vérifié et accepté.

