# NOVA — Step 1: Foundation & World

Tu travailles sur **NOVA**, un city-builder procédural et contemplatif.

Avant toute modification :

1. Lis `ARCHITECTURE.md`.
2. Lis les documents produit pertinents dans `docs/`, en particulier :

   * `00-product-vision.md`
   * `01-game-design.md`
   * `02-core-loop.md`
   * `04-world-and-terrain.md`
   * `12-rendering-architecture.md`
   * `13-technical-architecture.md`
   * `19-mvp.md`
3. Inspecte intégralement la structure actuelle du repository.
4. Identifie ce qui existe déjà avant de créer quoi que ce soit.
5. Respecte strictement l'architecture définie dans `ARCHITECTURE.md`.

## Objectif

Implémenter le **premier socle fonctionnel de NOVA** :

> Un monde procédural déterministe peut être créé à partir d'un seed, stocké dans le domaine, puis rendu dans une scène 3D minimale.

À la fin de cette étape, l'application doit pouvoir :

* démarrer une partie ;
* générer un monde déterministe ;
* représenter son terrain dans le domaine ;
* exposer ce monde à l'application ;
* afficher le terrain dans le renderer ;
* utiliser une caméra orthographique ;
* permettre pan + zoom ;
* conserver une séparation stricte entre simulation, domaine, renderer et UI.

Ce n'est **pas encore** un city-builder fonctionnel.

Ne pas implémenter :

* population ;
* économie ;
* bâtiments ;
* routes ;
* technologies ;
* événements ;
* pathfinding ;
* trafic ;
* shaders complexes ;
* système météo ;
* sauvegarde complète ;
* ECS ;
* architecture Worker ;
* optimisation prématurée.

---

# 1. Architecture à respecter

Respecte cette direction de dépendances :

```text
UI
 ↓
Application
 ↓
Domain

Engine → Domain / Application contracts
Rendering → Render contracts
Infrastructure → Domain contracts
```

Règles absolues :

* `domain/` ne dépend jamais de React.
* `domain/` ne dépend jamais de Three.js.
* `domain/` ne dépend jamais de Next.js.
* `domain/` ne dépend jamais du DOM.
* `application/` orchestre les use cases.
* `rendering/` ne contient aucune règle métier.
* React ne devient pas le moteur de simulation.
* Ne crée pas de `GameManager`.
* Ne crée pas de `useGameStore` géant.
* Ne crée pas de fichier `utils.ts` générique.
* Ne crée pas de singleton global pour la simulation.
* Ne pas utiliser `Math.random()` dans le domaine ou l'engine.
* Toute génération procédurale doit être déterministe à partir d'un seed.

---

# 2. World Domain

Implémente le premier modèle de monde dans :

```text
src/domain/world/
```

Le domaine doit représenter au minimum :

### World

Un `World` doit posséder au minimum :

```ts
World {
  id
  seed
  width
  height
  cells
}
```

Les IDs doivent être stables et typés lorsque c'est pertinent.

Évite les types primitifs ambigus pour les identifiants importants.

Exemple conceptuel :

```ts
type WorldId = string & { readonly __brand: 'WorldId' }
type CellId = string & { readonly __brand: 'CellId' }
```

N'introduis cependant pas de système de branding inutile partout.

---

# 3. Terrain

Chaque cellule du monde doit pouvoir représenter au minimum :

```text
elevation
water
buildable
```

Prévoir une structure extensible permettant plus tard d'ajouter :

```text
biome
fertility
resources
temperature
moisture
```

Mais **ne pas implémenter ces systèmes maintenant**.

Le terrain doit rester simple.

Exemple conceptuel :

```ts
TerrainCell {
  id
  x
  y
  elevation
  water
  buildable
}
```

Choisis une représentation adaptée à une simulation qui pourra évoluer vers des milliers voire des millions de cellules.

Ne crée pas une architecture inutilement complexe.

---

# 4. Seeded Random

Créer dans :

```text
src/engine/random/
```

un petit générateur pseudo-aléatoire déterministe.

Contraintes :

```text
same seed
    ↓
same sequence
    ↓
same world
```

Exemple :

```ts
createRandom(seed)
```

avec une API minimale :

```ts
random.next()
random.nextInt(min, max)
random.nextFloat(min, max)
```

Ne pas utiliser `Math.random()` pour la génération du monde.

Tester explicitement la déterminisme.

---

# 5. World Generation

Créer la génération dans :

```text
src/engine/terrain/
```

Responsabilité :

```text
seed
 ↓
terrain generator
 ↓
World
```

Créer un générateur simple et déterministe.

Le terrain peut utiliser une combinaison de fonctions simples pour produire :

* plaines ;
* variations d'altitude ;
* zones d'eau ;
* zones constructibles.

Ne cherche pas encore à produire un terrain réaliste.

L'objectif est d'obtenir une base :

```text
████████████████
██████░░░░██████
████░░░░░░░░████
███░░░░░░░░░░███
███░░░░░░░░░░███
████░░░░░░░░████
██████░░░░██████
████████████████
```

avec une variation suffisamment intéressante pour commencer à construire dessus.

La génération doit être pure autant que possible :

```ts
generateWorld({
  seed,
  width,
  height,
})
```

---

# 6. Application Layer

Créer le premier use case :

```text
src/application/commands/create-world.ts
```

Responsabilité :

```text
CreateWorldCommand
        ↓
world generator
        ↓
World
```

Le use case ne doit pas contenir les algorithmes de génération.

Créer une API minimale du type :

```ts
createWorld({
  seed,
  width,
  height,
})
```

Le reste de l'application doit passer par cette frontière plutôt que d'appeler directement le générateur.

---

# 7. Render Contract

Créer une frontière claire entre le domaine et Three.js.

Le renderer ne doit pas recevoir directement des objets métier complexes.

Créer un contrat de rendu minimal dans un endroit cohérent de l'architecture, par exemple :

```text
src/rendering/core/
```

ou un module de contrats partagé avec le rendering.

Conceptuellement :

```ts
RenderWorld {
  width
  height
  cells
}
```

Le principe important est :

```text
Domain World
      ↓
Render Snapshot / Render Model
      ↓
Three.js
```

Le renderer ne doit jamais modifier le `World`.

---

# 8. Renderer

Créer le renderer initial dans :

```text
src/rendering/
```

Il doit :

* initialiser Three.js ;
* créer une scène ;
* créer une caméra orthographique ;
* créer un renderer ;
* gérer resize ;
* afficher le terrain ;
* gérer la boucle de rendu.

Le renderer doit être indépendant de React autant que possible.

React doit seulement :

* monter le canvas ;
* initialiser le runtime ;
* gérer le lifecycle.

Ne mets pas la boucle Three.js dans un composant React sous forme de logique métier.

---

# 9. Visualisation du terrain

Le premier rendu doit rester volontairement minimal.

Style :

* fond sombre ;
* terrain géométrique ;
* couleurs discrètes ;
* eau différenciée ;
* élévation légèrement visible ;
* aucune texture réaliste ;
* aucun HUD massif ;
* aucun gradient décoratif inutile.

Le résultat doit déjà évoquer une **maquette architecturale numérique**.

Ne cherche pas encore le rendu final de NOVA.

---

# 10. Camera

Implémenter une caméra orthographique avec :

* pan ;
* zoom ;
* limites raisonnables ;
* resize correct.

La caméra doit être indépendante du domaine.

Créer les abstractions nécessaires dans :

```text
src/rendering/camera/
```

Ne pas coupler les contrôles caméra à React state si cela peut être évité.

---

# 11. Application bootstrap

Créer le bootstrap minimal permettant :

```text
Application
   ↓
CreateWorld
   ↓
World
   ↓
Render Snapshot
   ↓
Renderer
```

Le seed initial peut être temporairement défini dans le bootstrap.

Il doit cependant être évident où remplacer ce seed plus tard par :

```text
New Game
Seed Input
Load Game
```

Ne crée pas encore ces interfaces.

---

# 12. Tests

Ajouter des tests unitaires pour le domaine et l'engine.

Minimum obligatoire :

### Random

Tester :

```text
same seed → same sequence
different seed → different sequence
```

### World generation

Tester :

```text
same seed + same dimensions → identical world
```

Tester également :

```text
width / height respected
cells count correct
```

### Terrain

Tester quelques invariants :

```text
elevation within expected range
water cells correctly flagged
buildability deterministic
```

### Application

Tester :

```text
createWorld() → valid World
```

Ne teste pas Three.js de manière excessive à ce stade.

---

# 13. TypeScript

Respecter le strict mode.

Éviter :

```ts
any
as any
@ts-ignore
@ts-expect-error
```

sauf justification réelle et documentée.

Préférer :

* types explicites ;
* discriminated unions lorsque pertinentes ;
* fonctions pures ;
* petites interfaces ;
* dépendances explicites.

---

# 14. Performance

Ne fais aucune optimisation prématurée.

Mais prépare correctement l'architecture.

Évite :

```text
one React component = one terrain cell
```

Évite également de créer des milliers d'objets Three.js individuels si une représentation instanciée est naturellement adaptée.

Pour cette étape, quelques milliers de cellules doivent rester parfaitement raisonnables.

La priorité est :

```text
correctness
→ architecture
→ determinism
→ profiling
→ optimization
```

---

# 15. UI minimale

Créer uniquement ce qui est nécessaire pour lancer et observer le prototype.

L'écran doit principalement montrer :

```text
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│                NOVA WORLD                    │
│                                              │
│            procedural terrain                │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

Pas de dashboard.

Pas de sidebar massive.

Pas de menus complexes.

Pas de données fictives.

---

# 16. Code quality

Avant de terminer :

* supprimer les fichiers inutilisés ;
* supprimer les imports inutilisés ;
* vérifier les aliases TypeScript ;
* vérifier les dépendances ;
* respecter le naming défini dans `ARCHITECTURE.md` ;
* éviter les abstractions sans consommateur ;
* garder les APIs publiques minimales.

Chaque fichier doit avoir une responsabilité claire.

---

# 17. Validation obligatoire

À la fin, exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Puis lancer l'application en développement.

Vérifier manuellement :

1. l'application démarre ;
2. un monde est généré ;
3. le terrain est visible ;
4. le zoom fonctionne ;
5. le pan fonctionne ;
6. resize fonctionne ;
7. aucun warning React/Three.js évident ;
8. le même seed produit le même terrain.

Si un problème apparaît, corrige-le avant de considérer l'étape terminée.

---

# 18. Ne pas faire

Ne fais surtout pas :

* population ;
* bâtiments ;
* routes ;
* économie ;
* technologie ;
* événements ;
* sauvegarde ;
* ECS ;
* Zustand global ;
* Redux ;
* simulation Worker ;
* multiplayer ;
* backend ;
* authentification ;
* système de mod ;
* génération procédurale extrêmement complexe ;
* architecture plugin ;
* abstractions génériques sans besoin réel.

Cette étape doit rester **petite, propre et fondatrice**.

---

# 19. Definition of Done

Le Step 1 est terminé uniquement si :

```text
[ ] Architecture existante respectée
[ ] World domain fonctionnel
[ ] Terrain domain fonctionnel
[ ] Seeded random fonctionnel
[ ] World generation déterministe
[ ] CreateWorld use case fonctionnel
[ ] Render contract séparé du domain
[ ] Three.js renderer fonctionnel
[ ] Orthographic camera fonctionnelle
[ ] Pan fonctionnel
[ ] Zoom fonctionnel
[ ] Terrain visible
[ ] TypeScript clean
[ ] ESLint clean
[ ] Tests passants
[ ] Application démarre
[ ] Aucun système futur implémenté prématurément
```

---

# 20. Rapport final attendu

À la fin, ne donne pas un long commentaire.

Retourne un rapport structuré :

```text
## Step 1 — Foundation & World

### Implemented
- ...
- ...
- ...

### Architecture
- ...
- ...

### Tests
- pnpm typecheck: ...
- pnpm lint: ...
- pnpm test: ...

### Runtime
- ...
- ...

### Files created
- ...
- ...

### Files modified
- ...
- ...

### Decisions
- ...
- ...

### Known limitations
- ...

### Next step
- ...
```

Ne commence pas le Step 2 automatiquement.

Arrête-toi après ce jalon et attends une nouvelle instruction.
