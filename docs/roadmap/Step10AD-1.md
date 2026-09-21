Tu reprends **Step 10AD** depuis le commit propre `b411e0c`.

Le cœur de Step 10AD est déjà implémenté et vérifié :

* Workshop = **25 Material + 1 Water**, coût unique à la pose.
* Residence/Farm/Well/Road inchangés.
* `constructionWaterCost` est une propriété concrète du catalogue.
* `validatePlacement` rejette `insufficientWater`.
* `applyCommand` déduit Material + Water dans la même transaction atomique.
* UI/palette/hover utilisent désormais le catalogue.
* 1136 tests Vitest, typecheck, eslint, build et plusieurs suites browser passent.
* SAVE_VERSION reste 7.
* Le working tree est propre.

**Ne change pas la règle économique. Ne lance pas un nouveau design audit. Termine simplement 10AD.**

## 1. Corriger le feedback d'affordabilité UI

Audit précisément `describeCellStatus` et le chemin d'affordabilité utilisé par le dispatch authoritative.

Le domaine accepte déjà l'affordabilité Material de fin/même tick via `coveredSameTick`. Le preview UI doit refléter **exactement cette règle existante**, au lieu d'utiliser un simple `stock >= constructionMaterialCost`.

Objectif :

* si la pose est réellement autorisée par le domaine, le preview ne doit pas afficher `insufficient material`;
* si elle est réellement refusée, le preview doit rester refusé ;
* ne crée aucune seconde règle d'économie dans l'UI ;
* le domaine reste la source de vérité ;
* ne transforme pas cela en système générique de transactions/ressources.

Ajoute un test ciblé couvrant explicitement le cas du Workshop au mur des 24 Material :

* stock visible = 24 ;
* * production du tick courant permettant d'atteindre 25 ;
* domaine = placement autorisé ;
* `describeCellStatus` = état prêt/constructible correspondant.

Vérifie aussi que le cas réellement insuffisant reste refusé.

## 2. Migrer les 6 suites browser restantes

Les suites suivantes échouent encore parce qu'elles supposent qu'un Workshop ne coûte pas de Water :

* jobs
* upkeep
* road
* transport
* resource
* food

Ne modifie pas leurs assertions pour masquer le changement.

Adapte leurs scénarios bootstrap à la nouvelle économie :

**bootstrap canonique :**

* Residence : 25 Material
* Road : 5 Material
* Well : 25 Material
* attendre le buffer Water nécessaire
* puis Workshop : 25 Material + 1 Water

Lorsque le scénario a besoin d'un Workshop supplémentaire, utiliser le mécanisme d'affordabilité déjà existant, notamment `coveredSameTick` si le Workshop doit être posé au mur des 24 Material.

### Important

Ne duplique pas dans les tests une logique économique différente du runtime.

Si un helper `placeAt` attend actuellement que le preview affiche strictement `ready`, rends-le **gate-aware** afin qu'il attende l'état réellement autorisé par le domaine.

Le helper doit rester générique pour les tests, mais ne doit pas inventer une nouvelle règle de construction.

## 3. Recalculer uniquement les attentes devenues obsolètes

Après migration, réévalue les ticks et stocks des suites.

Les changements attendus peuvent notamment toucher :

* jobs : scénario autour de ~21 ticks ;
* upkeep : scénarios autour de ~35 ticks ;
* toute assertion dépendant du premier Workshop ;
* tout snapshot/ledger dépendant du Water initial.

Ne fais pas de modification mécanique globale.

Pour chaque assertion modifiée :

1. expliquer pourquoi le nouveau résultat découle de la règle 10AD ;
2. vérifier qu'il ne s'agit pas simplement de rendre le test vert.

Conserve les assertions qui restent valides.

## 4. Vérification complète

Après migration :

### Unit

* focused Workshop Water construction tests
* full Vitest

### Static

* typecheck
* eslint
* production build

### Browser

* jobs
* upkeep
* road
* transport
* resource
* food
* reassign
* construction crew
* temporal

### GPU

Exécuter la vérification GPU/browser existante du projet si elle fait partie du workflow actuel.

### Déterminisme

Vérifier :

* replay/hash ;
* save/load ;
* insertion-order invariance ;
* même scénario → même état final.

Le nouveau coût Water est un coût de commande persistant uniquement via l'état résultant ; il ne doit introduire aucun état dérivé ou aléatoire.

## 5. Audit final 10AD

Une fois tout vert, compléter `docs/roadmap/Step10AD.md`.

Le rapport doit distinguer clairement :

### Implémenté

* Workshop 25 Material + 1 Water à la pose ;
* transaction atomique ;
* Water non consommée ensuite par le Workshop ;
* autres bâtiments inchangés ;
* UI issue du catalogue ;
* validation authoritative.

### Validation

* tests unitaires ;
* tests browser ;
* GPU ;
* déterminisme ;
* save/load ;
* insertion order.

### Migration

Documenter que les fixtures/scénarios historiques Workshop ont été adaptés au nouveau contrat.

### Aucun changement

Confirmer :

* SAVE_VERSION = 7 ;
* aucune migration supplémentaire ;
* aucun nouveau champ persisté ;
* aucun nouveau framework générique ;
* Construction Crew inchangé ;
* production du Workshop inchangée après construction.

## Contraintes d'architecture

Ne fais PAS :

* de `InputSystem` générique ;
* de `ResourceTransaction` générique ;
* de nouveau framework de coûts ;
* de `Need` générique ;
* de cache de coût ;
* de modification du modèle Water ;
* de modification de la consommation Water ;
* de modification de l'économie Material ;
* de modification de Construction Crew.

Le seul objectif est de **terminer proprement Step 10AD** et de faire correspondre les scénarios de test au contrat désormais réel.

## Rapport final obligatoire

Retourne :

```text
STEP 10AD — FINAL

Starting commit:
Final commit:

Rule:
Workshop = 25 Material + 1 Water, one-off at placement.

Implementation:
...

UI/domain affordability:
...

Browser migration:
jobs:
upkeep:
road:
transport:
resource:
food:
reassign:
crew:
temporal:

Verification:
Vitest:
Typecheck:
Lint:
Build:
Browser:
GPU:
Determinism:
Save/load:
Insertion order:

SAVE_VERSION:
Migration:

Files changed:
...

Economic/design impact:
...

Remaining issues:
...

STATUS: COMPLETE / BLOCKED
```

Si quelque chose reste réellement bloqué, **arrête-toi sur ce point et documente précisément la cause** plutôt que de contourner l'échec.

