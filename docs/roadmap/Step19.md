# Step 19 — Urban State & Causal Readout

## Objectif

Faire évoluer le feedback temporel de Step 18 vers une lecture plus claire de **l’évolution de la ville**.

Step 18 permet maintenant de savoir qu'un événement vient de se produire :

* bâtiment créé ;
* route créée ;
* bâtiment évolué.

Step 19 doit permettre au joueur de comprendre davantage **où**, **quoi** et **dans quel état urbain** cela s'est produit, sans prétendre expliquer artificiellement une causalité que la simulation ne possède pas.

Le principe reste :

> **La simulation produit des changements. L'interface les rend lisibles.**

Ne pas ajouter de nouvelle mécanique de simulation importante.

---

# 1. Contraintes architecturales

Respecter strictement l'architecture actuelle :

```text
Domain
  ↓
Application projections / queries
  ↓
UI

Simulation
  ↓
RenderSnapshot
  ↓
Renderer
```

Les nouvelles projections doivent rester :

* pures ;
* déterministes ;
* sans React ;
* sans Three.js ;
* sans accès DOM ;
* sans `Math.random()` ;
* sans mutation de l'état de simulation.

Ne pas créer :

* `EventManager`
* `CityAI`
* `CausalityEngine`
* `UrbanBrain`
* `NotificationManager`
* `GlobalStore`
* système d'event sourcing
* replay system
* historique persistant de simulation.

Le système d'événements de Step 18 reste une **projection applicative**.

---

# 2. Concept : Urban Change

Créer une abstraction applicative légère représentant un changement lisible par le joueur.

Par exemple :

```ts
type UrbanChangeKind =
  | "BUILDING_CREATED"
  | "ROAD_CREATED"
  | "BUILDING_EVOLVED";
```

Chaque changement doit pouvoir exposer au minimum :

```ts
interface UrbanChange {
  kind: UrbanChangeKind;
  id: string;
  position: GridPosition;
  tick: number;
  label: string;
}
```

Adapter les types aux conventions déjà présentes dans Step 18 plutôt que de dupliquer inutilement les modèles existants.

Le changement doit référencer les **identifiants métier stables** :

```text
building:1
road:4
```

Jamais :

* Three.js UUID ;
* référence de mesh ;
* index de tableau comme identité ;
* objet React.

---

# 3. Enrichissement contextuel

Lorsqu'un changement est détecté, produire un contexte minimal permettant de comprendre sa situation.

Exemples :

### Maison créée

```text
HOUSE BUILT
Residential zone
Near road
```

### Ferme créée

```text
FARM BUILT
Agricultural zone
```

### Appartement créé

```text
DENSIFICATION
House → Apartment
Residential area
```

### Route créée

```text
ROAD EXTENDED
Local road
Near residential buildings
```

Important :

**ne pas inventer de causalité.**

Ne pas afficher :

```text
A road was built because population increased.
```

si cette relation n'est pas explicitement calculée par la simulation.

Préférer :

```text
ROAD EXTENDED
Residential area
```

ou :

```text
APARTMENT CREATED
Residential area
```

Le contexte doit être basé uniquement sur les données réellement disponibles.

---

# 4. Context projection

Créer une projection dédiée, par exemple :

```text
src/application/queries/to-urban-change.ts
```

ou une structure équivalente cohérente avec l'organisation actuelle.

Cette projection reçoit :

```text
previousSimulationState
currentSimulationState
```

et éventuellement les projections existantes nécessaires.

Elle doit :

1. détecter les changements ;
2. déterminer leur position ;
3. identifier le type d'objet ;
4. déterminer la zone applicable ;
5. déterminer quelques attributs structurels disponibles ;
6. retourner un résultat immuable et déterministe.

Exemple conceptuel :

```ts
const change = projectUrbanChange(
  previousState,
  currentState,
);
```

Résultat :

```ts
{
  kind: "BUILDING_EVOLVED",
  id: "building:7",
  position: { x: 14, y: 9 },
  tick: 240,
  label: "DENSIFICATION",
  context: {
    from: "house",
    to: "apartment",
    zone: "residential",
  },
}
```

Les champs exacts doivent suivre les modèles existants.

---

# 5. Zone awareness

Les changements doivent pouvoir être contextualisés par rapport aux zones existantes.

Pour un objet situé dans :

```text
residential
```

afficher :

```text
Residential zone
```

Pour :

```text
agricultural
```

afficher :

```text
Agricultural zone
```

Si aucune zone ne couvre la cellule :

```text
Outside designated zone
```

ou une formulation équivalente sobre.

Ne jamais supposer qu'un bâtiment appartient à une zone simplement parce que son type correspond à celle-ci.

Le contexte doit utiliser la géométrie réelle des zones.

---

# 6. Spatial context

Ajouter éventuellement un contexte spatial simple lorsque les données le permettent.

Exemples :

```text
Adjacent to road
```

```text
Near community service
```

```text
Residential cluster
```

Mais rester très conservateur.

Ces informations doivent être dérivées de fonctions existantes ou de petites fonctions pures locales.

Ne pas créer un nouveau système de "desirability".

Ne pas exposer directement les scores internes de développement.

Ne pas transformer les heuristiques internes en fausse explication destinée au joueur.

---

# 7. UI — Change feed

Faire évoluer le feed de Step 18.

Le feed doit rester compact.

Exemple :

```text
RECENT CHANGES

12:04
DENSIFICATION
House → Apartment
Residential zone

11:58
ROAD EXTENDED
Local road
Residential area

11:42
HOUSE BUILT
Residential zone
Near road
```

L'objectif est que le joueur puisse regarder la ville pendant quelques secondes et comprendre :

> "La ville vient de faire ça."

Pas :

> "Je dois lire un journal de simulation."

---

# 8. Regroupement

Conserver le regroupement anti-spam de Step 18.

Si plusieurs événements similaires se produisent rapidement :

```text
4 HOUSES BUILT
Residential zone
```

plutôt que :

```text
HOUSE BUILT
HOUSE BUILT
HOUSE BUILT
HOUSE BUILT
```

Le regroupement doit rester déterministe.

Ordre recommandé :

1. tick ;
2. type d'événement ;
3. position ;
4. identifiant stable.

Ne jamais dépendre de l'ordre accidentel d'itération d'un `Map` ou d'un objet si celui-ci peut varier.

---

# 9. Timeline readability

Améliorer légèrement la lecture temporelle existante.

Le joueur doit pouvoir voir simultanément :

```text
YEAR 1 / DAY 03
12.4s
RUNNING
5×
```

ou une représentation équivalente adaptée au système temporel réel de NOVA.

Important :

ne pas ajouter artificiellement un calendrier complexe si le domaine ne le possède pas.

Utiliser uniquement le temps simulé déjà disponible.

Le tick reste une donnée technique.

Le temps simulé doit être la donnée principale destinée au joueur.

---

# 10. Interaction avec l'inspection

Lorsqu'un changement récent correspond à un objet existant, permettre éventuellement au joueur de sélectionner cet objet depuis le feed.

Exemple :

```text
DENSIFICATION
House → Apartment
Residential zone
```

Un clic peut sélectionner :

```text
building:7
```

et ouvrir le panneau d'inspection existant.

Architecture :

```text
Change Feed
    ↓
stable object ID
    ↓
selection state
    ↓
existing inspection
```

Ne pas créer un deuxième système d'inspection.

Si cette interaction complexifie inutilement l'architecture actuelle, privilégier une première implémentation non interactive.

---

# 11. Visual language

Respecter strictement la direction NOVA :

* top view stricte ;
* sombre ;
* architectural ;
* minimal ;
* lisible ;
* discret.

Pas de :

* gros HUD ;
* panneaux flottants massifs ;
* glow excessif ;
* gradients agressifs ;
* animations permanentes ;
* couleurs arcade ;
* notifications type mobile game ;
* esthétique cyberpunk.

Le feed peut utiliser :

```text
RECENT
12:04
DENSIFICATION
House → Apartment
```

avec hiérarchie typographique et séparateurs subtils.

L'information doit paraître issue d'un **observatoire urbain**, pas d'un jeu mobile.

---

# 12. Animation

Si une animation est nécessaire :

* apparition courte ;
* translation très faible ;
* opacity ;
* aucune animation infinie.

Ne pas synchroniser l'animation avec les ticks de simulation.

La simulation reste indépendante du rendu UI.

---

# 13. Tests unitaires

Ajouter des tests ciblés.

## Urban change projection

Tester :

* bâtiment nouvellement créé ;
* route nouvellement créée ;
* évolution house → apartment ;
* aucun changement ;
* position correcte ;
* ID stable ;
* tick correct ;
* zone résidentielle ;
* zone agricole ;
* absence de zone ;
* contexte routier si applicable ;
* déterminisme.

## Grouping

Tester :

```text
4 houses
→ 1 grouped change
```

et :

```text
house + farm + road
→ 3 catégories distinctes
```

Tester également que l'ordre est stable.

## Regression

Vérifier que :

* la simulation ne change pas ;
* les événements Step 18 restent corrects ;
* l'inspection reste correcte ;
* la sélection reste correcte ;
* les zones restent correctes ;
* les routes restent correctes ;
* la densification reste correcte.

---

# 14. Validation

Exécuter obligatoirement :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Puis tenter :

```bash
pnpm test:e2e
```

Si Chromium rencontre encore le stall GPU/WebGL connu :

* ne pas modifier l'architecture pour contourner artificiellement le problème ;
* documenter précisément l'échec ;
* distinguer clairement problème environnemental et problème applicatif.

---

# 15. Ce qui est explicitement hors scope

Ne pas implémenter :

* citoyens individuels ;
* IA de citoyens ;
* trafic ;
* pathfinding ;
* emploi ;
* bonheur ;
* criminalité ;
* pollution ;
* météo ;
* événements catastrophiques ;
* système politique ;
* districts ;
* statistiques historiques complexes ;
* graphiques ;
* replay ;
* event sourcing ;
* sauvegarde de l'historique ;
* nouveau moteur de causalité ;
* nouveau système de scoring urbain.

Step 19 est une étape de **lisibilité de la simulation**, pas une nouvelle couche de simulation.

---

# 16. Definition of Done

Step 19 est terminé lorsque :

* [ ] les changements de simulation peuvent être projetés en `UrbanChange` ;
* [ ] chaque changement possède un ID métier stable ;
* [ ] chaque changement possède une position ;
* [ ] le contexte de zone est correctement dérivé ;
* [ ] les informations spatiales éventuelles sont factuelles ;
* [ ] aucune causalité fictive n'est affichée ;
* [ ] le feed reste compact ;
* [ ] le regroupement est déterministe ;
* [ ] le temps simulé reste lisible ;
* [ ] l'inspection existante peut être réutilisée ;
* [ ] aucun système global supplémentaire n'est introduit ;
* [ ] aucun changement de simulation n'est nécessaire ;
* [ ] typecheck passe ;
* [ ] lint passe ;
* [ ] tous les tests passent ;
* [ ] build de production passe ;
* [ ] E2E est tenté et son éventuel stall GPU documenté.

---

# Principe directeur

NOVA ne doit pas expliquer la ville avec des phrases artificielles.

Elle doit montrer suffisamment de **faits spatiaux et temporels** pour que le joueur puisse lui-même comprendre les transformations.

```text
SIMULATION
    ↓
CHANGE
    ↓
CONTEXT
    ↓
PLAYER OBSERVATION
    ↓
UNDERSTANDING
```

La simulation reste souveraine.

L'interface ne fait que rendre ses conséquences observables.
