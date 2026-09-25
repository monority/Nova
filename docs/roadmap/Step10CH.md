# Step 10CH — Town Product Direction Gate

## Mission

NOVA vient de terminer une longue phase de validation de ses fondations de simulation et de son expérience Town.

Les étapes récentes ont établi :

- `10BY` — Core Simulation Hardening
- `10BZ` — Simulation Contract Freeze
- `10CA` — Next Gameplay Pressure Audit
- `10CB` — Repository Cleanup / Performance / Refactor Audit
- `10CC` — Production Ratio Timeout Resolution
- `10CD` — Next Gameplay Pressure Implementation Gate
- `10CE` — Mixed-Town Water Pressure Audit
- `10CF` — Town Decision Frontier Audit
- `10CG` — Town Gameplay Quality Audit

Les conclusions importantes sont maintenant suffisamment stables :

- Food / Water / Material forment déjà un vrai trade-off.
- Le workforce management est réel, réversible et déterministe.
- Les routes et l'accessibilité apportent déjà une dimension spatiale.
- Le temps crée déjà des conséquences via stocks, production et réallocation.
- Town apporte déjà une capacité supplémentaire de lecture/rééquilibrage.
- Les décisions existantes sont suffisamment visibles dans l'interface.
- Aucun nouvel « impératif » de gameplay n'a été démontré.
- Aucun nouveau mécanisme ne doit être inventé simplement pour continuer la roadmap.

**Le but de ce step est donc de sortir du cycle d'audits de simulation et de décider explicitement ce que NOVA doit devenir ensuite.**

Ce step est un **product direction gate**, pas un gameplay implementation step.

---

# 1. Règle fondamentale

Tu dois travailler à partir du produit réel.

Inspecte le repository, le code, les tests, les documents de roadmap existants et l'interface actuelle.

Ne pars pas d'une vision théorique de ce qu'un city-builder « devrait » avoir.

Ne suppose pas qu'il manque une mécanique.

Ne crée aucune fonctionnalité pendant cet audit.

Le résultat doit répondre à une question simple :

> **Après Town, quelle évolution apporterait le plus de sens au produit NOVA lui-même ?**

---

# 2. Documents obligatoires à lire

Avant toute conclusion, inspecte au minimum :

- `docs/roadmap/STEP10CA.md`
- `docs/roadmap/Step10CB.md`
- `docs/roadmap/Step10CC.md`
- `docs/roadmap/Step10CD.md`
- `docs/roadmap/Step10CE.md`
- `docs/roadmap/Step10CF.md`
- `docs/roadmap/Step10CG.md`
- `docs/roadmap/Step10BZ.md`
- `docs/roadmap/Step10BY.md`

Inspecte également :

- architecture actuelle ;
- domain/application/rendering ;
- progression Village → Town ;
- bâtiments ;
- ressources ;
- workforce ;
- roads/accessibility ;
- simulation tick ;
- HUD ;
- Town UI ;
- placement/building UI ;
- rendering ;
- tests ;
- E2E ;
- responsive behavior ;
- documentation produit/design existante.

Ne te limite pas aux documents de roadmap.

---

# 3. Reconstituer le produit actuel

Établis une représentation factuelle du produit tel qu'il existe aujourd'hui.

Documente :

### Simulation

- ressources ;
- production ;
- consommation ;
- workforce ;
- bâtiments ;
- stocks ;
- capacité ;
- routes ;
- accessibilité ;
- progression ;
- temporalité ;
- déterminisme.

### Player loop

Reconstitue le parcours réel :

```text
Wilderness
→ premiers bâtiments
→ premiers travailleurs
→ production
→ routes / accessibilité
→ arbitrages Food / Water / Material
→ optimisation de l'allocation
→ Town
→ ?
```

Le `?` est précisément ce que ce step doit résoudre.

### Interface

Identifie :

- ce que le joueur voit ;
- ce qu'il comprend ;
- ce qu'il décide ;
- ce qu'il peut modifier ;
- ce que le jeu lui demande implicitement de poursuivre.

Ne propose pas de nouvelle UI pendant cette phase.

---

# 4. Répondre explicitement aux questions produit

Réponds séparément et concrètement aux questions suivantes.

## Q1 — Quelle est la fonction de Town dans NOVA ?

Town est-il actuellement :

- une destination ;
- une transition ;
- un seuil de complexité ;
- une démonstration du système économique ;
- le début d'une nouvelle phase du jeu ?

Ne réponds pas par une formulation vague.

Décris ce que Town signifie **dans le produit actuel**.

---

## Q2 — Pourquoi le joueur continuerait-il après Town ?

C'est la question centrale.

Analyse ce qui existe réellement aujourd'hui.

Cherche notamment :

- objectifs ;
- progression ;
- construction ;
- optimisation ;
- identité de colonie ;
- exploration ;
- découverte ;
- anticipation ;
- contraintes ;
- expression spatiale ;
- atmosphère ;
- curiosité ;
- sentiment de développement.

Ne fabrique pas artificiellement une réponse.

Si le produit actuel ne donne pas encore une réponse forte, dis-le clairement.

---

## Q3 — Quelle dimension du produit est actuellement sous-développée ?

Compare objectivement les axes suivants :

1. **World / Content**
2. **Spatial Composition**
3. **Progression**
4. **Presentation / Atmosphere**
5. **Player Goals / Scenarios**
6. **Simulation Depth**

Pour chaque axe, explique :

- état actuel ;
- ce qui existe déjà ;
- ce qui manque éventuellement ;
- pourquoi cela est important ou non ;
- risques d'investir maintenant dans cet axe ;
- dépendances avec les autres axes.

**Ne donne pas de score.**

Ne produis pas de classement numérique.

---

# 5. World / Content

Inspecte particulièrement le contenu disponible.

Pose la question :

> Est-ce que NOVA possède déjà suffisamment de matière pour que la colonie ait une identité ?

Analyse :

- variété des bâtiments ;
- identité visuelle ;
- distinction fonctionnelle ;
- environnement ;
- traces de civilisation ;
- infrastructure ;
- variété spatiale ;
- densité de contenu ;
- sentiment d'évolution.

Détermine si le prochain besoin réel pourrait être davantage de contenu plutôt qu'une nouvelle règle de simulation.

---

# 6. Spatial Composition

NOVA repose fortement sur une grille et possède déjà des routes/accessibilité.

Analyse si le placement constitue actuellement :

- uniquement une contrainte logistique ;
- une contrainte logistique + composition ;
- ou déjà une forme d'expression du joueur.

Analyse notamment :

- lisibilité des bâtiments ;
- relations spatiales ;
- densité ;
- routes ;
- réseaux ;
- espaces libres ;
- organisation générale ;
- évolution du settlement.

Attention :

**ne propose pas automatiquement de nouveau système d'adjacency, zoning ou décoration.**

Cherche d'abord ce que le système actuel permet déjà.

---

# 7. Progression

Analyse la trajectoire :

```text
Wilderness → Village → Town → ?
```

Détermine :

- ce que Town débloque réellement ;
- ce que Town représente ;
- ce que le joueur pourrait raisonnablement attendre ensuite ;
- si une prochaine étape de progression est nécessaire ;
- ou si la progression doit temporairement laisser place à autre chose.

Ne crée pas arbitrairement un « City » ou une nouvelle étape.

---

# 8. Presentation / Atmosphere

Analyse le produit sous son angle esthétique.

Réfère-toi à la direction existante de NOVA :

- top-down ;
- dark modern futuristic maquette ;
- lisibilité ;
- architecture distincte ;
- lumières futuristes ;
- ambiance contemplative ;
- monde limité ;
- settlement hors-monde.

Détermine si la prochaine valeur produit pourrait venir davantage de :

- présentation ;
- lighting ;
- environmental storytelling ;
- building identity ;
- visual feedback ;
- atmosphere ;
- sense of place.

Attention :

ne propose pas une refonte graphique gratuite.

La question est :

> **Est-ce que la présentation actuelle empêche le produit d'exprimer correctement ce que son système représente ?**

---

# 9. Player Goals / Scenarios

Analyse l'absence ou la présence de buts explicites.

Le joueur sait-il :

- pourquoi il construit ;
- pourquoi il optimise ;
- ce qu'il cherche à atteindre ;
- ce qui définit une colonie réussie ;
- ce qui pourrait arriver ensuite ?

Distingue soigneusement :

- **simulation intéressante**
- **objectif intéressant**

Ce ne sont pas la même chose.

N'ajoute aucun objectif pendant cet audit.

---

# 10. Simulation Depth

Réouvre la question de la profondeur uniquement pour vérifier qu'elle est réellement justifiée.

Utilise les résultats de :

- 10CA
- 10CE
- 10CF
- 10CG

Réponds :

> Existe-t-il maintenant une lacune de simulation suffisamment importante pour justifier de rouvrir le Simulation Contract Freeze ?

Si oui :

- laquelle ;
- quelle preuve existe ;
- pourquoi les audits précédents ne l'ont-ils pas détectée ;
- quelle serait la conséquence produit.

Si non :

documente explicitement pourquoi la simulation doit rester gelée pour le moment.

**Ne crée aucune mécanique.**

---

# 11. Identifier le vrai problème produit

Après les analyses précédentes, formule :

> **Le principal problème produit de NOVA aujourd'hui est : ________.**

Cette phrase doit être spécifique.

Évite :

- « il manque de profondeur » ;
- « il faut plus de contenu » ;
- « il faut améliorer l'UX » ;
- « il faut rendre le jeu plus intéressant ».

Ces formulations sont insuffisantes.

Le problème doit décrire une conséquence observable dans l'expérience actuelle.

---

# 12. Définir la prochaine direction

À partir des preuves recueillies, identifie **une seule direction principale**.

Elle peut être par exemple :

- world/content ;
- spatial composition ;
- progression ;
- presentation/atmosphere ;
- player goals/scenarios ;
- simulation.

Mais ne choisis pas une catégorie simplement parce qu'elle semble « normale » pour un city-builder.

La direction doit être justifiée par le produit actuel.

Formule-la ainsi :

```text
Direction:
[...]

Pourquoi maintenant:
[...]

Ce que cela doit améliorer:
[...]

Ce que cela ne doit PAS devenir:
[...]

Dépendances:
[...]

Ce que nous devons préserver:
[...]
```

---

# 13. Minimum meaningful next step

Détermine ensuite ce que serait le **plus petit gros step réellement utile** dans cette direction.

Important :

« minimum » ne signifie pas « minuscule ».

Le prochain step doit être suffisamment substantiel pour produire une différence perceptible dans NOVA.

Mais il ne doit pas embarquer :

- deux systèmes ;
- une nouvelle économie ;
- une refonte UI ;
- une nouvelle progression ;
- une nouvelle couche d'automatisation ;
- un nouveau système de simulation ;

tout en même temps.

Décris :

```text
Next step intent:
[...]

Player-visible outcome:
[...]

Core scope:
[...]

Explicit non-goals:
[...]

Expected validation:
[...]
```

---

# 14. Anti-feature gate

Avant de valider la direction, vérifie explicitement qu'elle n'introduit pas :

- spreadsheet gameplay ;
- busywork ;
- resource treadmill ;
- artificial scarcity ;
- forced automation ;
- unnecessary management layers ;
- UI bloat ;
- fake complexity ;
- duplicate information;
- progression for progression's sake ;
- mechanics whose only purpose is to justify another mechanic ;
- destruction de la lisibilité actuelle ;
- dépendance excessive à de nouveaux états persistants ;
- perte du déterminisme ;
- contournement du workforce system existant.

Si un risque apparaît, documente-le.

---

# 15. Préserver les fondations

Le gate doit explicitement confirmer les invariants qui restent gelés :

- deterministic simulation ;
- domain/application/rendering separation ;
- FNV-1a hashing ;
- save/load compatibility ;
- `SAVE_VERSION = 8` tant qu'aucun changement de persistence n'est réellement requis ;
- workforce assignment semantics ;
- Farm / Well / Workshop economy ;
- roads/accessibility ;
- Town progression ;
- existing commands ;
- existing UI readability ;
- responsive behavior.

Aucun de ces éléments ne doit être modifié uniquement pour faciliter la prochaine direction.

---

# 16. Decision Gate

La conclusion doit être l'une des deux formes suivantes :

### Direction validée

```text
10CH DECISION

NOVA should move next toward:
[ONE CLEAR DIRECTION]

Because:
[CONCRETE PRODUCT REASON]

The next implementation step should:
[CONCRETE INTENT]

Simulation remains:
FROZEN / REOPENED

Persistence:
UNCHANGED / CHANGE REQUIRED
```

ou :

### Direction insuffisamment définie

Si les preuves ne permettent honnêtement pas de choisir une direction :

```text
10CH DECISION

No implementation direction is sufficiently justified yet.

Reason:
[...]

Missing evidence:
[...]

Required next investigation:
[...]
```

Ne force jamais une décision uniquement pour produire un prochain commit.

---

# 17. Tests / artefacts

Ce step est principalement documentaire.

Ajoute :

```text
docs/roadmap/STEP10CH.md
```

Ajoute un test uniquement si un invariant/documentation contractuel existant doit être vérifié.

**Ne crée pas artificiellement des tests de gameplay pour donner du volume au step.**

Aucun changement runtime n'est attendu.

---

# 18. Validation

Même si aucun code runtime n'est modifié :

### Obligatoire

- vérifier que le repository reste cohérent ;
- vérifier que les documents de roadmap cités existent et ont été réellement consultés ;
- vérifier que les conclusions correspondent au code actuel ;
- vérifier que le step n'introduit aucune contradiction avec `10BY`, `10BZ`, `10CA`, `10CE`, `10CF`, `10CG`.

Si du code est exceptionnellement modifié :

- tests ciblés ;
- full Vitest ;
- typecheck ;
- lint ;
- build ;
- browser E2E si comportement UI/runtime ;
- responsive si UI ;
- GPU/WebGL2 si rendering/runtime ;
- diff audit.

Ne lance pas inutilement un GPU E2E uniquement parce que le step existe.

---

# 19. User-owned files

Les fichiers suivants sont explicitement hors scope :

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Ne les modifie jamais.

---

# 20. Commit

Si et seulement si le travail est complet et validé :

```text
Step 10CH: Town Product Direction Gate
```

Un seul commit pour ce step.

Ne modifie pas l'historique précédent.

---

# 21. Final report obligatoire

À la fin, retourne un rapport structuré :

```text
Step 10CH — Complete

1. Product state reconstructed
2. Town role
3. Post-Town player motivation
4. Underdeveloped product dimension
5. Current product gap
6. Direction selected / no direction
7. Why now
8. Minimum meaningful next step
9. Explicit non-goals
10. Simulation freeze status
11. Persistence status
12. Validation
13. Files changed
14. Commit
```

La partie **7 — Why now** et surtout **8 — Minimum meaningful next step** doivent être suffisamment concrètes pour servir directement de base au prochain prompt d'implémentation.

## Final constraint

**Ne code pas le futur. Décide-le.**

10CH doit être le point où NOVA cesse de demander :

> « Quelle mécanique manque ? »

et commence à répondre :

> **« Quel produit voulons-nous construire à partir de la fondation que nous avons maintenant ? »**

---

# Documentation (as-built)

## 0. Baseline

- HEAD at execution: `5c86b00` (Step 10CG)
- SAVE_VERSION: `8` (verified in `src/application/persistence/save.ts`)
- Full Vitest at this HEAD: `1,723 / 1,723` (verified during 10CG session)
- Step type: **product direction gate — documentary, no runtime change**

File convention note: the prompt asks for `docs/roadmap/STEP10CH.md`
(uppercase), but this filesystem is case-insensitive and already holds
the mixed-case prompt `Step10CH.md`; both names resolve to one file.
Per the established dual-purpose convention (prompt + appended as-built,
as in 10BY–10CG), the as-built is appended here instead of creating a
second file. The prompt section above is preserved verbatim.

### Documents consulted

All nine exist in mixed case (`Step10XX.md`); the prompt's uppercase
`STEP10CA.md`-style paths do not exist on disk. The following were
actually read (as-built sections in full, plus methods where needed):

- `docs/roadmap/Step10BY.md` — core hardening, 8 invariant families, no defect found
- `docs/roadmap/Step10BZ.md` — simulation contract freeze, command boundaries, tick order
- `docs/roadmap/Step10CA.md` — three candidates, "no new mechanic justified yet"
- `docs/roadmap/Step10CB.md` — repo cleanup, one dead module removed
- `docs/roadmap/Step10CC.md` — 600-tick test timeout root-caused, test-only fix
- `docs/roadmap/Step10CD.md` — implementation gate refused: conditional direction, not a selected mechanic
- `docs/roadmap/Step10CE.md` — Water pressure is "existing-control pressure", no new persistent decision
- `docs/roadmap/Step10CF.md` — no persistent decision frontier beyond allocation; design conclusion A
- `docs/roadmap/Step10CG.md` — final diagnosis **Meaningful + legible**; no UX correction needed

Code inspected directly: `src/application/queries/progression.ts`,
`src/application/queries/objective.ts`, `src/application/scenarios.ts`,
`src/domain/building/building.ts`, `index.html` (testids), `e2e/` catalogue.

## 1. Product state reconstructed

### Simulation (frozen, verified)

- Resources: Food / Water / Material; rates distinct from stocks.
- Production: 2 Food per staffed Farm, 2 Water capacity per staffed Well,
  Workshop material rate; one worker per building; type-blind workforce,
  manual reassignment, distance/ID order, Construction Crew.
- Buildings: exactly 4 types —
  `residence | farm | workshop | well` (+ roads).
- Stocks, capacities, road accessibility, tick phases per 10BZ contract.
- Determinism: FNV-1a hashing, sorted canonical iteration, save/load/continue
  equivalence. SAVE_VERSION 8.

### Player loop (actual)

```text
Wilderness → first buildings → first workers → production
→ roads / accessibility → Food / Water / Material arbitration
→ allocation optimisation → Town → (nothing authored)
```

`getProgression()` returns `nextStage: null` at Town
(`progression.ts:192-193`). The loop has a terminal node with no exit edge.

### Interface (actual)

- Resource HUD stats, allocation summary line, building inspection
  (status/worker/construction/crew/housing), progression panel with
  blockers, `town-capability` review line, scenario select, reassignment
  controls. 10CG verified all of this legible; no change made here.

## 2. Town role (Q1)

Town is currently a **threshold + demonstration**, not a destination and
not a new phase:

- Derived state: Village conditions + staffed Workshop + Food balance.
  No persisted state; reallocating the Workshop worker invalidates it.
- Its only capability is a review line:
  "Town workforce allocation — Farm / Well / Workshop allocation is
  active; use Move worker to rebalance." It unlocks no building, no
  command, no worker, no goal.
- It is terminal: `nextStage` is `null`, `nextStageLabel` is `null`.

Town proves the player mastered the three-way allocation, then asks
nothing further. A milestone that certifies the past without opening a
future.

## 3. Post-Town motivation (Q2)

There is currently **no authored answer**:

- The scenario catalogue (`src/application/scenarios.ts`, 10 entries:
  first-settlement, water-constraint, industrial-expansion,
  water-reserve-industry, spatial-efficiency, population-expansion,
  recovery, housing-composition, terrain-chokepoint, +1) resolves
  entirely at Settlement/Village level. Verified: **zero occurrences of
  "town" in `scenarios.ts`**. No scenario requires, mentions, or rewards
  Town.
- The objective requirement kinds (`stage | population | waterCapacity |
  foodBalance | building`) already support `stage: 'town'` — the vehicle
  exists, it is simply never aimed at Town.
- Free play after Town = re-optimising an already-solved allocation with
  no success criterion. 10CG proved the player *can* perceive decisions;
  nothing gives the player a *reason* to keep deciding.

Stated plainly: the product's own milestone is never asked for.

## 4. Underdeveloped dimension (Q3)

1. **World / Content** — 4 buildings + roads. Thin: colony identity rests
   on arrangement, not variety. Real, but expanding it reopens simulation
   surface (costs, production, balance) against a frozen contract.
2. **Spatial Composition** — placement is logistical + weakly compositional
   (networks, clustering, stranded-farm recovery). No evidence players
   need adjacency/zoning/decor systems; 10CA candidate C measured
   "validity rather than strategy".
3. **Progression** — terminal at Town by construction. Inventing a "City"
   stage now would be progression for progression's sake (explicitly
   forbidden by this gate's own rules without a goal to fill it).
4. **Presentation / Atmosphere** — Three.js dark-futuristic maquette,
   distinct entity views, headed GPU regression green. Presentation does
   not prevent the product from expressing its system. Not the bottleneck.
5. **Player Goals / Scenarios** — the system exists (derived objectives,
   scenario select, content-closure + playability audits green) but stops
   a full stage before the game's end. Smallest gap between existing
   vehicle and missing coverage.
6. **Simulation Depth** — four independent audits (CA/CE/CF/CG) converge:
   no persistent frontier survives existing controls. Reopening the freeze
   has no evidence behind it.

No scores, no ranking. The structural observation: axis 5 is the only one
where the capability is built, shipped, tested — and unused where it
matters most.

## 5. World / Content note

NOVA does not yet give a colony strong identity (4 buildings, no visual
variety beyond arrangement/lighting). Content may well be the *second*
need. But content without goals is decoration: new buildings would enter
a game that already leaves its best milestone unasked-for. Goals first —
they will reveal which content is actually missing instead of guessing.

## 6. Spatial note

The current system already permits composition (road networks, clustering,
reconnection puzzles like the stranded Farm). Nothing measured shows
players exhausting spatial expression. No adjacency/zoning/decoration
system is justified by evidence.

## 7. Progression note

`Wilderness → Settlement → Village → Town → ?` — the `?` must not be a
new stage. A stage without a goal repeats Town's exact defect one level
higher. Fill Town with purpose before considering anything after it.

## 8. Presentation note

The maquette direction is intact and sufficient. The audit question —
"does presentation prevent the system from being expressed?" — answers
no (10CG: meaningful + legible). No lighting/redesign work is the next
bottleneck.

## 9. Goals / Scenarios note

Interesting simulation ≠ interesting objective. NOVA has the first and a
working vehicle for the second. The catalogue's ceiling (Village) sits
below the progression's ceiling (Town). That one-stage mismatch is the
cheapest verified gap in the product: no new rule, no new state, no new
UI concept is required to close it — the `stage` requirement kind already
accepts `'town'`.

## 10. Simulation depth (freeze check)

> Is there now a simulation gap large enough to reopen the contract freeze?

No. 10CH adds no measurement of its own; it relies on CA/CE/CF/CG, which
agree. The freeze holds because the product problem found here lives
entirely in authored goals, which the frozen simulation already supports.
Reopening would be a category error: you don't change physics to fix an
empty quest log.

## 11. The product problem

> **The principal product problem of NOVA today is: its goal system ends
> at Village while its progression ends at Town, so the game's own
> milestone is never requested, never framed, and never followed by a
> next question — leaving post-Town play as repetition without purpose.**

## 12. Direction

```text
Direction:
Player Goals / Scenarios — aim the existing derived objective/scenario
system at Town and the post-Village game.

Why now:
- Simulation is frozen by converging evidence; UX is legible by direct
  audit. Neither axis needs work, so goal coverage is the binding
  constraint, not a consolation prize.
- The vehicle is shipped and tested (objectives, scenario select,
  closure + playability suites). Only its ceiling is wrong.
- It is the only direction whose minimum step needs no contract,
  persistence, or UI-concept change.

What it must improve:
A player opening the scenario list must find reasons to reach Town and
to exploit it — Town as destination, with explicit framing and success
criteria, instead of a silent derived flag.

What it must NOT become:
- A quest framework (no history, no chains, no BLOCKED/NOT_STARTED —
  10AN deliberately excluded these).
- A City stage or any new progression level.
- New buildings/resources/commands smuggled in as "scenario content".
- Spreadsheet objectives (e.g. "hold 500 food for 50 ticks").

Dependencies:
None on simulation, rendering, or persistence. Depends only on the
existing requirement kinds and scenario data contract.

What we must preserve:
Derived-only objectives, catalogue playability (every scenario completable
with existing commands), determinism, SAVE_VERSION 8, the contemplative
non-dashboard UI.
```

## 13. Minimum meaningful next step

```text
Next step intent:
Add Town-targeted scenarios to the existing catalogue using only the
current requirement kinds and starting-state tools (data-only change to
src/application/scenarios.ts plus catalogue/playability test coverage).

Player-visible outcome:
The scenario select offers goals that end at Town (e.g. reach Town;
reach Town with N colonists and balanced Food/Water) with framing
sentences explaining why Town matters. Selecting one, the progression
panel and objective status carry the player from Village into Town with
a stated purpose. Post-Town free play is unchanged — but it is no longer
the only thing after Village.

Core scope:
- 2–4 new scenario entries (starting states + objective labels +
  constraints in the existing style).
- Catalogue contract tests (ids unique, requirements mappable, scenarios
  completable via existing commands — mirror existing suites).
- As-built doc.

Explicit non-goals:
- No new requirement kind.
- No evaluation-semantics change in objective.ts.
- No persisted state, no SAVE_VERSION change.
- No new building/resource/command/progression stage.
- No scenario UI redesign (entries flow through the existing select +
  objective status).

Expected validation:
- New + existing scenario suites green (including a replay/completability
  pass for each added scenario).
- Full Vitest, typecheck, lint, build, git diff --check.
- No browser/GPU run required beyond existing regressions unless UI text
  changes break selectors (they must not).
```

## 14. Anti-feature gate

- Spreadsheet gameplay: risk if objectives become stock-hoarding quotas.
  Mitigate with state-based criteria (stage/population/balance), not
  accumulation thresholds.
- Busywork / treadmill / artificial scarcity: no new costs or sinks are
  introduced, so absent by construction.
- Forced automation / management layers / UI bloat: no new controls or
  panels; scenarios reuse select + objective status.
- Fake complexity: each scenario must be completable with existing
  commands (playability suite enforces).
- Progression for progression's sake: explicitly no City stage.
- Mechanics justifying mechanics: none added.
- Readability: new entries are data; HUD/progression UI untouched.
- Persistent state / determinism: objectives stay derived; catalogue is
  code, not save data.

## 15. Preserved foundations

Confirmed frozen/unchanged by this gate (verified against code, not
assumed): deterministic simulation, domain/application/rendering
separation, FNV-1a hashing, save/load compatibility, SAVE_VERSION 8,
workforce assignment semantics, Farm/Well/Workshop economy,
roads/accessibility, Town progression rules, existing commands, UI
readability, responsive behavior. No element is modified to facilitate
the chosen direction — the direction was chosen because it needs none
of them modified.

## 16. Decision

```text
10CH DECISION

NOVA should move next toward:
Player Goals / Scenarios — extend the existing derived scenario
catalogue to Town using current requirement kinds (data-only).

Because:
The simulation is frozen by converging audit evidence, the UI exposes it
legibly, and the shipped goal system stops one stage short of the game's
own terminal milestone — verified in code (nextStage null at Town; zero
"town" references in scenarios.ts). Closing that one-stage mismatch is
the smallest change that gives the existing product a reason to be
finished.

The next implementation step should:
Add 2–4 Town-targeted scenarios (data + catalogue/playability tests),
with no change to evaluation semantics, persistence, progression, or UI.

Simulation remains:
FROZEN

Persistence:
UNCHANGED
```

## 17. Artefacts

- This file: `docs/roadmap/Step10CH.md` — prompt (above, verbatim) +
  this as-built, per the dual-purpose convention. No separate uppercase
  file: the filesystem is case-insensitive, both names resolve to one
  file, and the mixed-case convention (10BY–10CG) wins.
- No test added: the key facts this gate establishes ("no scenario
  targets Town", "nextStage null at Town") describe the pre-step state
  that the *next* step intentionally changes; freezing them in a test
  would manufacture a failure for the follow-up to delete.
- No runtime change: `src/`, `e2e/`, `index.html` untouched.

## 18. Validation

- Repository coherent: worktree clean before work; one file added
  (`Step10CH.md`, force-added — `docs/` is gitignored, same as 10CG).
- Cited documents: all nine exist and were read (mixed-case paths;
  prompt's uppercase variants don't exist — noted, not blocking).
- Conclusions match code: 4 building types (`building.ts:11`),
  `nextStage null` at Town (`progression.ts:192-193`), Town capability
  label (`progression.ts:167-174`), zero "town" in `scenarios.ts`,
  `stage` requirement kind accepts `ProgressionStage` (`objective.ts`),
  SAVE_VERSION 8 (`save.ts:62`).
- No contradiction with 10BY/10BZ/10CA/10CE/10CF/10CG: freeze held,
  candidates unselected, diagnosis legible, gate refusals respected.
- Full Vitest / typecheck / lint / build: not rerun — no code changed;
  HEAD values from the 10CG session stand (1,723/1,723, all PASS).
- User-owned files (`Step10BO - Copy.md`, `Step10BT.md`): untouched.

## 19. Handoff to the next prompt

The next implementation prompt should contain: the direction (§12), the
minimum step spec (§13), the non-goals, the anti-feature constraints
(§14), and the preserved foundations (§15). Suggested title: "Step 10CI:
Town Goal Coverage". Suggested gate: every added scenario must be
replay-completable with existing commands and must reference Town in its
requirements or framing — otherwise it does not count toward closing
this gap.

## Files changed

- `docs/roadmap/Step10CH.md` (prompt + as-built, dual-purpose convention)

## Validation summary

- Focused tests: n/a (no test added per §17 gate — deliberate)
- Full Vitest: 1,723 / 1,723 (HEAD value, no code changed)
- Typecheck / lint / build: HEAD values PASS, no code changed
- Browser / GPU: not rerun per prompt §18 (no runtime/UI change)
- `git diff --check`: clean
- User-owned files: untouched
