# Step 9.1 — Picking & Selection Boundary

## Objectif

Stabiliser le système de sélection/picking de NOVA avant de poursuivre l'évolution de la simulation.

Step 9 est fonctionnellement terminé : l'influence routière fonctionne et les tests de domaine passent.

Cependant, l'E2E existant de sélection d'une maison échoue :

```text
building is created
        ↓
click on building
        ↓
selection callback
        ↓
expected building ID
        ↓
FAIL
```

Le renderer possède maintenant un fallback par cellule, mais ce fallback ne doit pas devenir une succession de contournements.

L'objectif de cette étape est de définir une frontière claire :

```text
Pointer input
    ↓
World position
    ↓
Grid position
    ↓
Selectable object resolution
    ↓
Stable domain ID
    ↓
Application/UI
```

---

# 1. Règle principale

Le picking visuel appartient au renderer.

La signification de l'objet sélectionné appartient au domaine/application.

Three.js ne doit jamais inventer ou reconstruire un identifiant métier arbitrairement.

Le système doit aboutir à un ID stable tel que :

```text
building:1
building:2
farm:1
road:1
zone:1
```

selon les objets existants dans le domaine.

---

# 2. Commencer par diagnostiquer

Avant toute modification importante, reproduire l'E2E existant.

Identifier précisément :

```text
pointer event
    ↓
screen coordinates
    ↓
camera projection
    ↓
world coordinates
    ↓
grid coordinates
    ↓
cell lookup
    ↓
object lookup
    ↓
selection callback
```

Déterminer à quelle étape la chaîne échoue.

Ne pas corriger uniquement le symptôme.

Ne pas ajouter immédiatement un nouveau fallback.

---

# 3. Vérifier le mapping écran → monde

La caméra est définitivement :

```text
TOP-DOWN
```

Ne pas modifier la caméra.

Vérifier que le picking utilise exactement la même transformation spatiale que la construction.

Le principe doit être :

```text
construction cell
==
selection cell
==
rendered cell
```

Pour une cellule :

```ts
GridPosition {
  x: number
  y: number
}
```

la conversion écran → monde → grille doit être cohérente avec celle utilisée par le placement.

Éviter d'avoir :

```text
construction coordinate conversion
```

et :

```text
selection coordinate conversion
```

avec deux implémentations légèrement différentes.

Si une fonction de conversion commune existe déjà, la réutiliser.

Sinon créer une petite abstraction partagée adaptée à l'architecture actuelle.

---

# 4. Séparer picking et selection

Ne pas mélanger :

```text
"Quel objet est sous le curseur ?"
```

avec :

```text
"Que signifie sélectionner cet objet ?"
```

Le renderer doit produire quelque chose de comparable à :

```ts
type PickResult =
  | {
      kind: "cell"
      position: GridPosition
    }
  | null
```

ou une forme équivalente adaptée au code existant.

Ensuite une couche de résolution peut faire :

```text
GridPosition
    ↓
CityState
    ↓
building / road / zone
    ↓
stable ID
```

---

# 5. Cell → object resolution

Créer ou réutiliser une fonction pure permettant de résoudre un objet à partir d'une cellule.

Conceptuellement :

```ts
resolveSelectableAt(
  city: CityState,
  position: GridPosition,
): SelectableObject | null
```

Elle doit être :

* pure ;
* déterministe ;
* indépendante de React ;
* indépendante de Three.js ;
* indépendante du DOM ;
* facilement testable.

Exemple conceptuel :

```ts
type SelectableObject =
  | {
      kind: "building"
      id: BuildingId
    }
  | {
      kind: "road"
      id: RoadId
    }
  | {
      kind: "zone"
      id: ZoneId
    }
```

Ne pas nécessairement utiliser exactement cette API si l'architecture actuelle possède déjà un modèle approprié.

Le principe est plus important que le nom.

---

# 6. Priorité des objets

Une cellule ne devrait normalement contenir qu'un seul objet physique à la fois grâce aux règles d'occupation existantes.

Ne pas créer de logique complexe de priorité si elle n'est pas nécessaire.

La résolution doit respecter les règles du domaine.

Exemple :

```text
cell
 ↓
building ?
 ↓
road ?
 ↓
other selectable object ?
```

Mais si `CityState` possède déjà une structure d'occupation permettant cette résolution, la réutiliser.

Ne pas parcourir inutilement toutes les collections si une information plus directe existe déjà.

---

# 7. IDs

Le picking ne doit jamais produire :

```text
mesh.uuid
object.uuid
threeObject.id
array index
```

comme identité métier.

Interdit :

```ts
selectedId = mesh.uuid
```

si l'UI attend :

```text
building:1
```

Le renderer peut conserver une référence interne permettant de résoudre un objet, mais la frontière vers le domaine doit utiliser les IDs métier existants.

---

# 8. Mesh metadata

Si l'architecture actuelle utilise des metadata Three.js pour accélérer le picking, c'est acceptable.

Par exemple :

```ts
mesh.userData
```

peut contenir une référence de rendu.

Mais ne pas transformer `userData` en source de vérité du domaine.

Source de vérité :

```text
CityState / domain
```

Renderer :

```text
representation
```

---

# 9. Fallback par cellule

Le fallback actuellement ajouté doit être évalué.

S'il est nécessaire, le conserver comme mécanisme explicite :

```text
raycast
   ↓
no direct mesh hit
   ↓
resolve world/grid cell
   ↓
resolve domain object
```

Mais il doit rester déterministe.

Ne pas faire :

```text
"chercher le bâtiment le plus proche"
```

sans règle spatiale explicite.

Ne pas sélectionner un objet voisin simplement parce que le clic était proche.

---

# 10. Sélection d'une maison

Le scénario E2E existant doit devenir fiable.

Scénario :

```text
create world
place house
click house
```

Résultat attendu :

```text
selectedBuildingId === "building:1"
```

ou l'ID réellement attribué par le domaine.

Le test ne doit pas dépendre d'une position fragile si une interaction plus robuste est possible.

Cependant, ne pas modifier le test simplement pour masquer un problème de picking.

---

# 11. Ferme

Ajouter le même scénario pour une ferme.

```text
place farm
click farm
→ farm selected
```

Vérifier que le type d'objet et l'ID sont corrects.

---

# 12. Route

Ajouter un test de sélection de route si le système UI expose déjà les routes comme sélectionnables.

```text
place road
click road
→ road selected
```

Si les routes ne sont volontairement pas sélectionnables dans l'UI actuelle, ne pas ajouter cette fonctionnalité uniquement pour cette étape.

Dans ce cas, documenter simplement le comportement actuel.

---

# 13. Cellule vide

Tester :

```text
click empty cell
```

Résultat :

```text
selection = null
```

Aucun objet voisin ne doit être sélectionné.

---

# 14. Sélection isolée

Créer un scénario avec deux bâtiments :

```text
building:1          building:2
```

Cliquer sur le premier.

Résultat :

```text
selectedId === "building:1"
```

Cliquer sur le second.

Résultat :

```text
selectedId === "building:2"
```

Cela permet de vérifier que le fallback par cellule ne sélectionne pas arbitrairement le mauvais objet.

---

# 15. Tests unitaires

Ajouter des tests purs autour de la résolution domaine.

Minimum :

### Test 1

```text
cell with building
→ building ID
```

### Test 2

```text
empty cell
→ null
```

### Test 3

```text
cell with road
→ road ID
```

si les routes sont sélectionnables.

### Test 4

```text
two buildings
→ each cell resolves independently
```

### Test 5

```text
same CityState + same GridPosition
→ same result
```

### Test 6

```text
invalid/out-of-bounds position
→ null
```

si ce cas est pertinent dans l'API actuelle.

---

# 16. E2E

Le test navigateur doit vérifier le comportement utilisateur réel.

Minimum :

```text
create building
↓
click
↓
selection state
↓
expected ID
```

Ajouter :

```text
two buildings
↓
click first
↓
click second
↓
selection changes correctly
```

Et :

```text
click empty cell
↓
nothing selected
```

Ne pas multiplier les E2E inutilement.

---

# 17. Ne pas modifier

Cette étape ne doit pas modifier :

* simulation clock ;
* simulation timestep ;
* autonomous development ;
* development pressure ;
* road influence ;
* economy ;
* population ;
* zoning ;
* construction validation ;
* building placement rules ;
* camera projection ;
* rendering style.

Le seul objectif est :

```text
reliable object selection
```

---

# 18. Architecture finale souhaitée

La chaîne devrait ressembler à :

```text
Pointer
  │
  ▼
Renderer picking
  │
  ▼
World position
  │
  ▼
GridPosition
  │
  ▼
Domain selection resolver
  │
  ▼
Stable object identity
  │
  ▼
Application/UI state
```

Et non :

```text
Pointer
  ↓
Three.js Mesh
  ↓
mesh.uuid
  ↓
UI
```

---

# 19. Performance

Ne pas introduire d'optimisation prématurée.

Le nombre actuel d'objets est faible.

Une résolution linéaire est acceptable si nécessaire.

L'ordre de priorité reste :

```text
correctness
→ maintainability
→ determinism
→ profiling
→ optimization
```

---

# 20. Definition of Done

Step 9.1 est terminé lorsque :

* [ ] La cause de l'E2E actuel a été identifiée.
* [ ] Le mapping écran → monde → cellule est cohérent.
* [ ] Le picking et la résolution métier sont séparés.
* [ ] La résolution `GridPosition → domain object` est déterministe.
* [ ] Les IDs métier sont utilisés.
* [ ] Aucun UUID Three.js n'est exposé comme identité métier.
* [ ] Le fallback par cellule, s'il est conservé, est explicite et déterministe.
* [ ] Une maison peut être sélectionnée par clic.
* [ ] Une ferme peut être sélectionnée si elle est sélectionnable dans l'UI actuelle.
* [ ] Une cellule vide ne sélectionne aucun objet.
* [ ] Deux bâtiments peuvent être sélectionnés indépendamment.
* [ ] Les tests unitaires de résolution passent.
* [ ] Les E2E concernés passent.
* [ ] Aucun comportement de simulation n'est modifié.

---

# Validation finale

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Le résultat attendu est :

```text
TypeScript    PASS
ESLint        PASS
Unit tests    PASS
E2E           PASS
Build         PASS
```

Ne pas considérer l'étape terminée tant que l'E2E de sélection n'est pas vert, sauf si l'échec est explicitement démontré comme provenant de l'infrastructure de test plutôt que du code NOVA.

---

## Principe directeur

Cette étape ne doit pas rendre le picking plus complexe.

Elle doit rendre la frontière **renderer → domaine** plus claire.

Le renderer répond :

> "Quelle cellule est sous le curseur ?"

Le domaine répond :

> "Quel objet existe dans cette cellule ?"

L'application répond :

> "Que signifie sélectionner cet objet ?"

Ces trois responsabilités doivent rester séparées.
