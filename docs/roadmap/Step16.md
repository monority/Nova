# Step 16 — Urban Inspection & Causality

## Contexte

NOVA possède maintenant une simulation capable de produire une morphologie urbaine émergente.

Les systèmes existants comprennent notamment :

* population ;
* logement ;
* nourriture ;
* maisons ;
* appartements ;
* fermes ;
* routes ;
* hiérarchie `local` / `arterial` ;
* zones résidentielles ;
* zones agricoles ;
* développement autonome ;
* pression de développement ;
* influence des routes ;
* influence des services ;
* extension routière ;
* densification ;
* scénario initial déterministe ;
* sélection par cellule.

Les derniers milestones ont fait évoluer NOVA d'une collection d'entités vers une colonie ayant progressivement une structure spatiale.

Le prochain problème est désormais la **compréhension**.

Le joueur doit pouvoir regarder un élément de la ville et comprendre :

> « Pourquoi est-il ici ? »

et :

> « Quel rôle joue-t-il dans l'évolution de la ville ? »

---

# Objectif

Créer une couche d'inspection légère permettant de comprendre les objets urbains existants.

Exemple :

```text
┌─────────────────────────┐
│ APARTMENT               │
│ Residential building    │
│                         │
│ Population              │
│ 10 / 12                 │
│                         │
│ Connected to road       │
│ Community coverage     ✓│
│                         │
│ Densification            │
│ Mature residential area │
└─────────────────────────┘
```

L'objectif n'est **pas** d'afficher tous les calculs internes.

Le joueur doit comprendre les **causes importantes**, pas les détails de l'algorithme.

---

# Principe fondamental

Ne pas créer de nouveau système de simulation.

L'inspection est une **projection de l'état existant**.

Architecture souhaitée :

```text
Domain state
     ↓
Inspection projection
     ↓
UI
```

et non :

```text
UI
 ↓
simulation logic
```

La logique d'inspection doit rester déterministe et sans dépendance à React ou Three.js.

---

# 1. Inspecter l'architecture actuelle

Avant toute modification :

Identifier :

* modèle `Building` ;
* modèle `Road` ;
* modèle `Service` ;
* `CityState` ;
* `SimulationState` ;
* `RenderSnapshot` ;
* résolution de sélection ;
* état actuel de sélection UI ;
* panneaux ou contrôles existants.

Réutiliser les structures existantes.

Ne pas créer un deuxième système de sélection.

---

# 2. Créer un modèle d'inspection

Si nécessaire, créer un module du type :

```text
src/domain/inspection/
```

ou une projection dans le domaine approprié.

Le modèle doit être une donnée de présentation pure.

Exemple conceptuel :

```ts
type InspectionKind =
  | 'building'
  | 'road'
  | 'service';

type BuildingInspection = {
  kind: 'building';
  id: string;
  buildingType: 'house' | 'apartment' | 'farm';
  position: GridPosition;
  population?: number;
  capacity?: number;
  roadAccess: boolean;
  serviceCoverage: boolean;
};
```

Ne pas reprendre cet exemple aveuglément.

Adapter au modèle réellement existant.

---

# 3. Inspection d'une maison

Une maison sélectionnée doit pouvoir montrer des informations utiles :

```text
HOUSE

Residential building

Population
3 / 4

Road access
Connected

Community service
Covered

Status
Growing
```

Les informations exactes doivent refléter l'état réel.

Ne jamais inventer une donnée simplement pour remplir le panneau.

---

# 4. Inspection d'un appartement

Exemple :

```text
APARTMENT

Dense residential building

Population
10 / 12

Road access
Connected

Community service
Covered

Status
Densified
```

Si l'architecture ne possède pas encore un historique d'évolution, ne pas prétendre afficher :

```text
Built because of...
```

si cette information n'est pas réellement disponible.

Présenter uniquement les faits observables.

---

# 5. Inspection d'une ferme

Exemple :

```text
FARM

Agricultural building

Food production
Active

Agricultural zone
Yes

Road access
Connected
```

Ne pas créer un système agricole supplémentaire.

Utiliser uniquement les données existantes.

---

# 6. Inspection d'une route

Une route doit pouvoir afficher :

```text
ROAD

Arterial

Connected network

Length
...

Nearby development
...

Status
Active
```

Pour une route locale :

```text
ROAD

Local

Connected network
```

Éviter d'afficher des statistiques de trafic puisque le trafic n'existe pas encore.

Ne jamais créer artificiellement :

```text
cars
traffic
flow
congestion
```

---

# 7. Inspection du service communautaire

Exemple :

```text
COMMUNITY

Community service

Coverage
Active

Residential influence
Active
```

Si le rayon réel existe dans le domaine, l'afficher éventuellement sous une forme simple :

```text
Coverage
6 cells
```

Sinon ne pas inventer de valeur.

---

# 8. Afficher les relations importantes

La force de cette étape doit être la compréhension des relations.

Par exemple :

```text
HOUSE
 ├─ Residential zone
 ├─ Road
 └─ Community coverage
```

ou :

```text
APARTMENT
 ├─ Residential cluster
 ├─ Road corridor
 └─ Community coverage
```

Attention :

Ces relations doivent être **déduites de l'état réel**, pas inventées comme un texte narratif.

---

# 9. Ne pas afficher les scores internes

Ne pas afficher :

```text
Development score: 42.73
Road influence: +12
Cluster score: +8
Service score: +5
```

Ces informations sont utiles au développeur, mais pas au joueur.

Le joueur doit voir :

```text
Near residential buildings
Connected to road
Within community coverage
```

plutôt que les valeurs mathématiques.

---

# 10. Expliquer la densification

Lorsqu'un appartement est sélectionné, l'interface peut afficher un état synthétique :

```text
Dense residential building
```

et éventuellement :

```text
Developed area
```

Si une information causale fiable existe réellement :

```text
Residential pressure
```

peut être utilisée.

Mais ne pas prétendre connaître une cause précise si le système n'enregistre pas cette causalité.

---

# 11. Causalité réelle

Si le système actuel permet de déterminer de manière fiable qu'une décision a été influencée par :

* proximité résidentielle ;
* route ;
* service ;
* zone ;

il est possible de projeter cette information.

Exemple :

```text
Development context

Residential cluster
Road proximity
Community coverage
```

Mais uniquement si ces informations peuvent être calculées depuis l'état actuel.

Ne pas ajouter un journal d'événements complexe uniquement pour alimenter ce panneau.

---

# 12. Pas de Event History

Ne pas créer :

```text
EventManager
HistoryManager
CausalGraph
DecisionHistory
UrbanNarrativeEngine
```

Ce milestone ne nécessite pas de mémoire historique.

L'objectif est une inspection de l'état courant.

---

# 13. Interface

Le panneau doit être :

* compact ;
* discret ;
* sombre ;
* architectural ;
* lisible ;
* non intrusif.

Éviter :

* énorme sidebar ;
* cartes arrondies partout ;
* gradients ;
* glassmorphism ;
* dashboard coloré ;
* HUD futuriste ;
* gros chiffres décoratifs.

Exemple de direction :

```text
┌──────────────────────┐
│ APARTMENT            │
│ Residential building │
│                      │
│ 10 / 12 residents    │
│                      │
│ ROAD       CONNECTED │
│ SERVICE    COVERED   │
│ ZONE       RESIDENT. │
└──────────────────────┘
```

---

# 14. Position du panneau

Le panneau ne doit pas cacher la ville.

Selon l'architecture actuelle :

* coin de l'écran ;
* panneau flottant compact ;
* panneau latéral étroit.

Ne pas modifier la caméra top-down.

---

# 15. Sélection

Réutiliser exactement la résolution existante :

```text
Pointer
 ↓
world position
 ↓
GridPosition
 ↓
resolveSelectableAt
 ↓
stable ID
 ↓
inspection
```

Aucune logique de sélection spécifique à Three.js.

Les objets suivants doivent rester sélectionnables :

* house ;
* apartment ;
* farm ;
* local road ;
* arterial road ;
* community service.

---

# 16. Cellule vide

Cliquer une cellule vide doit :

* fermer l'inspection ;
* ou revenir à l'état neutre.

Ne pas afficher un panneau vide.

---

# 17. Construction mode

L'inspection ne doit pas casser :

* construction ;
* placement preview ;
* suppression ;
* sélection ;
* Escape ;
* Delete / Backspace.

Si le joueur entre en mode construction, le panneau d'inspection doit se comporter de manière cohérente avec l'architecture UI existante.

---

# 18. État UI

Ne pas créer un énorme store global.

Si l'application possède déjà un état de sélection, l'étendre proprement.

Exemple conceptuel :

```text
selectedObjectId
selectedObjectKind
```

ou une structure existante équivalente.

L'UI doit seulement observer l'état.

---

# 19. Tests unitaires

Créer des tests de projection d'inspection.

Minimum :

### House

```text
house
→ inspection
→ correct type
→ correct position
→ correct capacity
```

### Apartment

```text
apartment
→ inspection
→ correct capacity
→ correct type
```

### Farm

```text
farm
→ inspection
→ agricultural information
```

### Road

```text
road
→ local / arterial correctly projected
```

### Service

```text
service
→ coverage/influence correctly projected
```

### Empty

```text
empty cell
→ no inspection
```

---

# 20. Déterminisme

Deux états identiques doivent produire exactement la même inspection.

```text
state A
 ↓
inspect
 ↓
projection A

state A
 ↓
inspect
 ↓
projection A
```

Pas de :

```ts
Date.now()
Math.random()
```

dans la projection.

---

# 21. Browser validation

La validation navigateur reste secondaire tant que le stall GPU/WebGL connu empêche Playwright de fonctionner.

Si le navigateur fonctionne :

1. lancer NOVA ;
2. sélectionner une maison ;
3. vérifier le panneau ;
4. sélectionner une ferme ;
5. sélectionner une route ;
6. sélectionner un appartement ;
7. sélectionner le service ;
8. cliquer une cellule vide ;
9. vérifier qu'aucune sélection ne casse la simulation.

Si le stall réapparaît :

documenter le problème d'infrastructure comme précédemment.

Ne pas modifier le renderer pour contourner artificiellement le problème.

---

# 22. Ne pas ajouter de nouveaux bâtiments

Ce milestone ne doit pas ajouter :

* mairie ;
* école ;
* hôpital ;
* magasin ;
* usine ;
* gare ;
* monument.

Les types actuels suffisent.

---

# 23. Ne pas modifier la simulation

Le Step 16 ne doit pas modifier :

* vitesse de population ;
* scoring de développement ;
* cadence autonome ;
* économie ;
* routes ;
* densification ;
* services.

L'objectif est uniquement de **rendre l'état actuel compréhensible**.

Si un problème de simulation est découvert pendant l'inspection, le documenter plutôt que le corriger opportunément.

---

# 24. Performance

La projection d'inspection doit être légère.

Elle n'a pas besoin d'être calculée à chaque frame.

Calculer uniquement lorsque :

* la sélection change ;
* l'état sélectionné change ;
* les données nécessaires changent.

Ne pas introduire de scan complet du monde à chaque render React.

---

# 25. Validation finale

Exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Vérifier particulièrement :

* aucune régression de sélection ;
* aucune régression de construction ;
* aucune régression de suppression ;
* aucune modification de simulation ;
* aucune modification de caméra.

---

# Definition of Done

Step 16 est terminé lorsque :

* [ ] une maison peut être inspectée ;
* [ ] un appartement peut être inspecté ;
* [ ] une ferme peut être inspectée ;
* [ ] une route locale peut être inspectée ;
* [ ] une route artérielle peut être inspectée ;
* [ ] le service communautaire peut être inspecté ;
* [ ] les informations affichées proviennent de l'état réel ;
* [ ] aucune donnée fictive n'est affichée ;
* [ ] les scores internes ne sont pas exposés ;
* [ ] les relations importantes sont compréhensibles ;
* [ ] la sélection existante est réutilisée ;
* [ ] une cellule vide ferme l'inspection ;
* [ ] la construction fonctionne toujours ;
* [ ] la suppression fonctionne toujours ;
* [ ] la simulation n'a pas changé ;
* [ ] la caméra reste strictement top-down ;
* [ ] le panneau reste compact ;
* [ ] aucun nouveau système de simulation n'a été créé ;
* [ ] aucun nouveau bâtiment n'a été créé ;
* [ ] les tests unitaires passent ;
* [ ] typecheck passe ;
* [ ] lint passe ;
* [ ] build passe ;
* [ ] validation navigateur effectuée si l'environnement le permet.

---

# Principe final

Step 15 a commencé à donner une **forme** à la ville.

Step 16 doit lui donner une **lisibilité**.

Le joueur doit pouvoir faire :

```text
voir une maison
      ↓
cliquer
      ↓
comprendre son état
      ↓
voir qu'elle est connectée à une route
      ↓
voir qu'elle appartient à une zone résidentielle
      ↓
voir qu'elle est couverte par le service
      ↓
regarder la ville
      ↓
comprendre pourquoi cette zone devient dense
```

NOVA ne doit pas seulement produire une ville.

Elle doit progressivement permettre au joueur de **comprendre comment cette ville est devenue ce qu'elle est**.
