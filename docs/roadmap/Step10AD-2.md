Reprends le dépôt depuis le commit propre :

`9836115 — Step 10AD-1: shared placement affordability + palette fix`

Step 10AD est techniquement implémenté.

La règle définitive reste :

**Workshop = 25 Material + 1 Water, one-off at placement.**

Ne modifie PAS cette règle et ne modifie PAS le bootstrap global.

## Objectif

Terminer les 4 suites browser actuellement bloquées :

* jobs
* transport
* upkeep
* road

Leur problème est désormais clairement identifié :

```text
Initial Material = 100
Initial Water = 0

Residence 25
Road       5
Well      25
Workshop  25
----------------
Total     80
```

Les anciens scénarios dépensent ensuite plus de Material qu'ils n'en possèdent.

Ce n'est PAS une raison pour :

* augmenter INITIAL_CONSTRUCTION_MATERIAL ;
* ajouter INITIAL_WATER ;
* créer une exemption au premier Workshop ;
* modifier le coût Workshop ;
* modifier l'économie Material ;
* modifier Water ;
* introduire un revenu artificiel ;
* utiliser une commande hors sujet uniquement pour rendre un test vert.

## 1. Audit minimal de chaque scénario

Pour chacun des quatre tests, commence par identifier :

1. ce que le test cherche réellement à démontrer ;
2. les bâtiments réellement nécessaires à cette démonstration ;
3. les bâtiments actuellement construits uniquement parce que l'ancien bootstrap les imposait ;
4. le budget Material minimum permettant de conserver le même comportement testé.

Ne change aucune assertion avant d'avoir établi ce minimum.

## 2. Réduire les scénarios, pas les règles

Adapte chaque suite afin qu'elle construise **uniquement le setup nécessaire à son sujet**.

### jobs

Le scénario doit conserver son objectif de test du système d'emploi :

* colonists ;
* Farms ;
* Workshops ;
* concurrence de workforce ;
* affectation automatique/manual si le test le couvre.

Mais supprime tout bâtiment qui n'est pas nécessaire à l'assertion.

Le Well reste obligatoire lorsqu'il est nécessaire à l'admission moderne.

Si plusieurs configurations économiques sont nécessaires, construis-les progressivement plutôt que de reproduire un ancien gros bootstrap.

### upkeep

Le test doit conserver son objectif :

* Workshop opérationnel ;
* staffing ;
* upkeep Material ;
* comportement vacant/staffed.

Ne construis pas de bâtiments économiques supplémentaires sans nécessité pour l'assertion.

Si une seconde construction est nécessaire, fais-la uniquement si elle est réellement pertinente au comportement testé.

### road

Le test doit conserver son objectif spatial :

* placement de routes ;
* coût des routes ;
* connectivité/access ;
* conséquences sur le bâtiment testé.

Ne construis pas une colonie complète pour vérifier une propriété de route.

Conserve exactement la topologie nécessaire à l'assertion.

### transport

Même principe :

* conserve le réseau routier ;
* conserve les bâtiments nécessaires aux assertions de connectivité/mobilité ;
* supprime tout bâtiment économique qui n'est pas nécessaire.

Le test ne doit pas dépendre d'une économie complète si son sujet est le transport.

## 3. Ne pas masquer les conséquences économiques

Il est acceptable de changer :

```text
"construire 4 bâtiments avant l'assertion"
```

en :

```text
"construire seulement les 2 bâtiments nécessaires"
```

Il n'est PAS acceptable de changer :

```text
expected Material = X
```

en une autre valeur uniquement pour obtenir PASS.

Chaque assertion modifiée doit être justifiée par le nouveau bootstrap minimal.

## 4. Well / Water

Lorsque le scénario a besoin d'un Workshop moderne :

```text
Residence
→ Road
→ Well
→ Water buffer
→ Workshop
```

Utilise les helpers existants et le predicate d'affordabilité partagé.

Ne recrée pas un second `waitUntilAffordable`.

Si le Workshop est placé au mur des 24 Material, le helper doit utiliser l'état authoritative `getPlacementAffordability`.

## 5. Important : pas de nouveau système

Ne fais PAS :

* de modification de `INITIAL_CONSTRUCTION_MATERIAL`;
* de première-construction gratuite ;
* de crédit Material de test ;
* de crédit Water de test ;
* de bypass de validation ;
* de commande `reassignColonist` simplement pour produire du Material dans un test qui ne teste pas le workforce control ;
* de fixture spéciale injectant des ressources impossibles en jeu ;
* de nouveau système de test économique.

Les tests browser doivent représenter des séquences réellement possibles dans le jeu.

## 6. Vérification

Après adaptation :

### Tests

* full Vitest
* typecheck
* lint
* build

### Browser

Les 12 suites existantes doivent être exécutées.

Objectif :

```text
run         PASS
production  PASS
temporal    PASS
water       PASS
food        PASS
resource    PASS
reassign    PASS
crew        PASS
road        PASS
transport   PASS
jobs        PASS
upkeep      PASS
```

### GPU

Exécuter la suite GPU existante.

### Déterminisme

Vérifier :

* replay/hash ;
* save/load ;
* insertion order.

## 7. Documentation

Mettre à jour :

`docs/roadmap/Step10AD.md`

Le document doit maintenant expliquer que :

* le coût Workshop 25 Material + 1 Water est définitif ;
* le predicate d'affordabilité est partagé UI/domain ;
* les anciennes fixtures ont été réduites à leur setup économique minimal ;
* aucun changement du bootstrap global n'a été nécessaire ;
* SAVE_VERSION reste 7 ;
* aucune migration supplémentaire n'est nécessaire.

Pour les quatre suites précédemment bloquées, documenter brièvement **pourquoi leur ancien setup dépassait le budget et pourquoi le nouveau setup reste sémantiquement équivalent au test**.

## 8. Commit final

Si tout est vert :

```text
Step 10AD — finalize browser scenario migration
```

Puis fournir :

```text
STEP 10AD — FINAL

Starting commit:
Final commit:

Workshop rule:
...

Affordability predicate:
...

Scenario migrations:
jobs:
transport:
upkeep:
road:

Browser:
12/12

Vitest:
Typecheck:
Lint:
Build:
GPU:
Determinism:
Save/load:
Insertion order:

SAVE_VERSION:
Migration:

Global economy changed: NO

Files changed:
...

STATUS: COMPLETE
```

Si l'un des quatre scénarios ne peut réellement pas être ramené sous 100 Material sans changer ce qu'il mesure, ne force pas le test. Documente précisément le minimum requis et laisse-le BLOCKED.

