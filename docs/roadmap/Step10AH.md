Tu reprends NOVA depuis le commit final de Step 10AG :

`8353ac6`

Working tree attendu : propre.

# STEP 10AH — SPATIAL EXTERNALITIES & ADJACENCY PRESSURE AUDIT

## Nature

**AUDIT ONLY.**

Ne modifie pas `src/`.

10AG a fermé la piste Food Distribution :

```text
Food = global
Food distribution = premature
Water = spatial
Worker mobility = spatial
```

Le modèle possède maintenant de vraies contraintes de réseau, mais il reste une question fondamentale pour le city-builder :

> Est-ce que le placement relatif des bâtiments produit suffisamment de conséquences pour que le joueur doive réellement penser son layout ?

Le but de 10AH est de mesurer les **externalités spatiales existantes et potentielles**, sans ajouter de mécanique.

---

# 1. INVENTAIRE DES EFFETS SPATIAUX ACTUELS

Documenter tous les effets du placement actuellement existants :

* bâtiment ↔ route ;
* route ↔ réseau ;
* résidence ↔ Water ;
* résidence ↔ workplace ;
* Farm ↔ worker mobility ;
* Workshop ↔ worker mobility ;
* Well ↔ Water coverage ;
* distance routière ;
* coût des routes ;
* Construction Crew ;
* ordre d'ID/tie-break ;
* occupation des cellules ;
* orientation/connectivité des routes.

Puis identifier explicitement ce qui n'a **aucun** effet :

* Farm à côté/distant d'une Residence ;
* Workshop à côté/distant d'une Farm ;
* Well à côté/distant d'une Residence si réseau identique ;
* Farm adjacent à Workshop ;
* Residence adjacent à Workshop ;
* Workshop adjacent à Workshop ;
* densité locale ;
* nombre de bâtiments voisins ;
* type des bâtiments voisins.

---

# 2. CONTROLLED LAYOUT EXPERIMENT

Construire plusieurs colonies avec exactement :

* même nombre de Residences ;
* même nombre de Farms ;
* même nombre de Wells ;
* même nombre de Workshops ;
* même nombre de workers ;
* même nombre de routes.

Seule la géométrie change.

### Layout A — compact

Tout regroupé.

### Layout B — linéaire

Bâtiments répartis le long d'un corridor.

### Layout C — séparé

Producteurs et logements sur des zones distinctes mais connectées.

### Layout D — alterné

Residence/Farm/Workshop/Residence/Farm/Workshop.

### Layout E — blocs

Chaque type regroupé avec les autres types dans des zones différentes.

Pour chaque layout mesurer :

* Food ;
* Water ;
* Material ;
* population ;
* workforce ;
* construction ;
* road count ;
* road distance ;
* network IDs ;
* workplace assignments ;
* Water-served residences.

Objectif :

> déterminer quelle partie de la différence vient déjà des réseaux, et quelle partie reste totalement invisible.

---

# 3. ADJACENCY MATRIX EXPERIMENT

Tester les paires :

```text
Residence ↔ Farm
Residence ↔ Well
Residence ↔ Workshop

Farm ↔ Well
Farm ↔ Workshop

Well ↔ Workshop

Workshop ↔ Workshop
Farm ↔ Farm
Residence ↔ Residence
```

Pour chaque paire :

1. cellules adjacentes ;
2. distance 1 ;
3. distance 2 ;
4. distance 3+ ;
5. réseaux identiques ;
6. réseaux différents.

Mesurer si une différence économique ou simulation apparaît **au-delà de la connectivité existante**.

Ne pas inventer de métrique de proximité si le runtime n'en possède pas.

---

# 4. DISTANCE VS ADJACENCY

Le système possède déjà une préférence de distance routière pour l'emploi.

Il faut distinguer :

```text
road distance
```

de :

```text
physical adjacency
```

Construire des cas où :

### A

Bâtiments physiquement proches mais réseau routier long.

### B

Bâtiments physiquement éloignés mais réseau routier court.

### C

Bâtiments physiquement adjacents et réseau court.

### D

Bâtiments éloignés et réseau long.

Mesurer :

* workplace assignment ;
* production ;
* Water service ;
* Material ;
* construction timing.

Déterminer si la géométrie physique apporte déjà quelque chose de différent du réseau.

---

# 5. ROAD COST VS BUILDING DENSITY

Le seul coût spatial général actuel est notamment le coût des routes.

Mesurer l'efficacité :

```text
bâtiments / cellules de route
```

pour :

* compact ;
* corridor ;
* branches ;
* boucles ;
* deux clusters ;
* trois clusters.

Puis mesurer :

* Material dépensé ;
* temps de construction ;
* accessibilité ;
* workforce mobility.

Question :

> Le joueur a-t-il déjà une raison économique de densifier simplement grâce au coût des routes ?

Si oui, documenter précisément la pression existante.

---

# 6. BUILDING TYPE EXTERNALITIES

Sans implémenter, tester les hypothèses suivantes.

### H1 — Residence ↔ industrial buildings

Une Residence proche d'un Workshop/Farm/Well devrait-elle avoir une conséquence indépendante des réseaux ?

### H2 — Farm ↔ Workshop

La proximité de production agricole et industrielle pourrait-elle créer une relation causale réelle ?

### H3 — Well ↔ population

La concentration résidentielle autour d'un Well crée-t-elle déjà une contrainte suffisante ?

### H4 — Workshop density

Plusieurs Workshops proches pourraient-ils produire une externalité naturelle ?

### H5 — Farm density

Plusieurs Farms regroupées pourraient-elles produire une externalité naturelle ?

### H6 — Mixed-use layout

Le mélange des bâtiments pourrait-il produire une conséquence différente du simple réseau ?

Pour chacune :

* chercher d'abord une conséquence déjà existante ;
* si aucune n'existe, mesurer si les données actuelles fournissent une base crédible ;
* ne rien implémenter.

---

# 7. CANDIDATS DE FUTURE SPATIAL PRESSURE

Examiner uniquement comme hypothèses :

### A — Pollution / industrial externality

Workshop proche des Residences.

### B — Service radius

Un bâtiment de service couvre physiquement une zone.

### C — Land efficiency

Certains layouts utilisent davantage de terrain/route pour le même nombre de bâtiments.

### D — Local production chain

Deux bâtiments ont intérêt à être proches pour une raison productive.

### E — Density / adjacency bonus

La proximité de certains bâtiments crée un effet positif ou négatif.

### F — Aucun nouveau système spatial

Le réseau + route cost + worker mobility suffisent pour le stade actuel.

**Ne pas implémenter ces candidats.**

---

# 8. POLLUTION : AUDIT SANS SYSTÈME

La pollution est un candidat intéressant mais doit être traité avec prudence.

Ne crée aucune variable Pollution.

Chercher uniquement si les données actuelles permettent de justifier :

```text
Workshop density
+
Residence proximity
+
industrial production
```

comme une future externalité.

Tester :

* 1 Workshop ;
* 2 Workshops ;
* 3 Workshops ;
* Workshops regroupés ;
* Workshops séparés ;
* Residences proches ;
* Residences éloignées.

Si aucune conséquence actuelle ne permet de mesurer une pression, classer la piste comme prématurée plutôt que l'inventer.

---

# 9. LAND / ROAD EFFICIENCY

Mesurer la quantité minimale de :

* cellules de route ;
* cellules occupées ;
* bâtiments ;
* distance de réseau ;

pour atteindre une configuration donnée.

Comparer des layouts économiquement équivalents.

Question :

> Existe-t-il déjà un coût de l'étalement suffisamment important pour que le placement soit une optimisation spatiale réelle ?

Ne transforme pas cette mesure en nouveau score de "land value".

---

# 10. PLAYER DECISION TEST

Pour chaque conséquence spatiale identifiée, répondre :

```text
Le joueur peut-il :
1. voir la contrainte ?
2. la comprendre ?
3. agir dessus ?
4. obtenir un résultat différent en choisissant un autre layout ?
```

Une simple différence technique invisible au joueur ne compte pas comme nouvelle décision.

---

# 11. CLASSIFICATION

Évaluer :

### A — Pollution / industrial externality

### B — Service radius

### C — Land efficiency

### D — Local production chain

### E — Density / adjacency

### F — No new spatial system

Utiliser :

* **A — fundamental**
* **B — useful but incomplete**
* **C — weak**
* **D — premature**
* **E — rejected**

Ne pas classer les candidats entre eux.

Chaque résultat doit être soutenu par une expérience reproductible.

---

# 12. CRITÈRES POUR UNE NOUVELLE PRESSION SPATIALE

Une nouvelle mécanique spatiale n'est justifiée que si l'audit montre :

1. une conséquence différente des réseaux existants ;
2. une différence mesurable entre layouts ;
3. une décision visible du joueur ;
4. une interaction avec au moins deux systèmes ;
5. un effet non purement cosmétique ;
6. aucune duplication directe de Water coverage ;
7. aucune boucle bootstrap catastrophique ;
8. une implémentation localisable.

---

# 13. ARCHITECTURE

`src/` doit rester inchangé.

Vérifier :

* SAVE_VERSION 7 ;
* 7 clés persistées ;
* aucun état dérivé nouveau ;
* déterminisme ;
* insertion-order invariance ;
* save/load ;
* aucun framework générique.

Ajouter uniquement les tests d'audit nécessaires.

---

# 14. TESTS

Créer les tests dans le répertoire d'audit existant.

Mesurer les layouts de manière déterministe.

Puis :

* full Vitest ;
* typecheck ;
* lint ;
* build.

Documenter :

```text id="f0m7u6"
before:
after:
audit tests added:
```

---

# 15. RAPPORT FINAL

Créer :

`docs/roadmap/Step10AH.md`

Format :

```text id="s3x0kq"
STEP 10AH — SPATIAL EXTERNALITIES & ADJACENCY PRESSURE AUDIT

Starting commit:
Final commit:

Current spatial mechanics:
...

Controlled layouts:
...

Adjacency results:
...

Distance vs adjacency:
...

Road efficiency:
...

Building externalities:
...

H1:
Classification:
Evidence:

H2:
Classification:
Evidence:

H3:
Classification:
Evidence:

H4:
Classification:
Evidence:

H5:
Classification:
Evidence:

H6:
Classification:
Evidence:

Candidate A — Pollution:
Classification:
Evidence:

Candidate B — Service radius:
Classification:
Evidence:

Candidate C — Land efficiency:
Classification:
Evidence:

Candidate D — Local production:
Classification:
Evidence:

Candidate E — Density/adjacency:
Classification:
Evidence:

Candidate F — No new spatial system:
Classification:
Evidence:

Player-visible decisions:
...

Architectural findings:
...

Tests:
...

Determinism:
...

Conclusion:
...

Next dependency:
...
```

## Final rule

Ne pas ajouter de mécanique simplement parce que NOVA est un city-builder.

Si les réseaux, les routes, la mobilité et le coût d'expansion fournissent déjà suffisamment de pression :

```text id="j0v6xq"
NO NEW SPATIAL SYSTEM JUSTIFIED
```

Si une externalité réellement distincte apparaît, documente-la comme prochaine dépendance, mais **n'implémente toujours rien dans 10AH**.

Le but est de savoir si le layout actuel est déjà un système économique émergent ou s'il lui manque réellement une conséquence locale.

---
# STEP 10AH — SPATIAL EXTERNALITIES & ADJACENCY PRESSURE AUDIT (report)

Audit-only. `src/` was NOT modified. Every number below is measured from the
running model by `tests/spatialExternalitiesAdjacencyAudit.test.ts` (14 tests,
deterministic; `--reporter=verbose` prints the `AUDIT …` rows quoted here).

```text
STEP 10AH — SPATIAL EXTERNALITIES & ADJACENCY PRESSURE AUDIT

Starting commit: 8353ac6 ("Step 10AG: food distribution & spatial supply audit")
Final commit:    this commit

Current spatial mechanics: building -> adjacent road (access); road -> road (network);
                 network -> Water coverage + worker mobility; road distance -> 09M
                 workplace preference; road cell -> 5 Material; cell -> building XOR road.
                 NOTHING reads a neighbour: no adjacency, no density, no neighbour type.

Controlled layouts: five geometries with EXACTLY the same building count, worker count and
                 road cell count (2 Residences, 1 Farm, 1 Well, 1 Workshop, 2 colonists,
                 6 roads) produce IDENTICAL flows in all five (2 Food, 2 Water, 2 employed,
                 2 served Residences). Only the road distances differ (0/1/2/3/4).

Adjacency results: physical adjacency on different networks behaves exactly like
                 disconnection (Residence and Farm sharing an edge: 0 workers, -1 Food/tick);
                 adjacency on the same network adds nothing beyond road access.

Distance vs adjacency: a physically NEARER Farm (2 cells) loses its worker to a physically
                 farther one (4 cells) because the road distance is 8 vs 2.

Road efficiency: the same 4 buildings can need 1 road cell (4.0 buildings/road, 5 Material) or
                 4 road cells (1.0, 20 Material); 8 buildings can need 2 (10 Material) or 8.

Building externalities: no neighbour-based consequence exists for any pair, including
                 Workshop-Workshop, Farm-Farm and mixed-use versus segregated layouts.

H1 — Residence next to industry:      E — rejected
H2 — Farm next to Workshop:           E — rejected
H3 — Well concentration:              C — weak
H4 — Workshop density:                E — rejected
H5 — Farm density:                    E — rejected
H6 — Mixed-use layout:                E — rejected

Candidate A — Pollution:              D — premature
Candidate B — Service radius:         D — premature
Candidate C — Land efficiency:        A — fundamental
Candidate D — Local production chain: D — premature
Candidate E — Density / adjacency:    E — rejected
Candidate F — No new spatial system:  A — fundamental

Player-visible decisions: four consequences already pass all four tests (road access,
                 network membership, road distance, road Material cost); adjacency/density
                 fails all four.

Architectural findings: src unchanged, SAVE_VERSION 7, 7 persisted keys, no derived state
                 persisted, no new framework, determinism + insertion-order invariance preserved.

Tests:           before 60 files / 1198 tests; after 61 / 1212; audit tests added 14.
                 typecheck, lint, build pass.

Determinism:     same-run hash equal; insertion-order invariant; save/load unchanged.

Conclusion:      the layout is ALREADY an emergent economic system through four measurable
                 consequences; what is missing is any local/neighbour consequence, and no
                 candidate supplies one without duplicating the network rules.

Next dependency: NO NEW SPATIAL SYSTEM JUSTIFIED
```

## 1. Current spatial mechanics (inventory)

**Effects that exist (measured):**

| effect | evidence |
| --- | --- |
| building ↔ adjacent road | `hasRoadAccess = true`, road ids recorded for the building |
| cell occupancy | building cell blocked, road cell blocked, free cell not blocked |
| road ↔ road (network) | two separate road cells → **2 networks** |
| road cost | 5 Material per cell (allocation/all roads are 1 construction tick) |
| Residence ↔ Water | coverage is network-wide; a Well serves every Residence on its network |
| Residence ↔ workplace | 09K mobility: the colonist must share a network with the workplace |
| road distance | 09M preference: measured 0 for a same-contact Farm, 4 for a Farm four cells along the row |
| not spatial | Construction Crew (10Y), id/tie-break order (09M), tick order |

**Effects that do NOT exist (measured):** four identical colonies with the Residence→Farm
physical gap varying 0, 1, 2 and 3 cells all produced `roadDistance 0`, `staffedFarms 1`,
`foodNet +1` and the same assignment `[1, 0]`. The full no-effect list: Farm next to or far
from a Residence on the same network; Workshop next to or far from a Farm; Well next to or far
from a Residence on the same network; Farm adjacent to a Workshop; Residence adjacent to a
Workshop; Workshop adjacent to a Workshop; local density; neighbour count; neighbour type.

## 2. Controlled layout experiment

Fixed: 2 Residences, 1 Farm, 1 Well, 1 Workshop, 2 colonists, **6 road cells**.

| layout | networks | road dist. to Farm | road dist. to Well | population | employed | Food prod. | Water prod. | served Residences | assignment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A compact | 1 | 0 | 2 | 2 | 2 | 2 | 2 | 2 | Farm 1, Well 1 |
| B linear corridor | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | Farm 1, Well 1 |
| C separated zones | 1 | 4 | 3 | 2 | 2 | 2 | 2 | 2 | Farm 1, Well 1 |
| D alternating | 1 | 1 | 3 | 2 | 2 | 2 | 2 | 2 | Farm 1, Well 1 |
| E blocks | 1 | 3 | 4 | 2 | 2 | 2 | 2 | 2 | Farm 1, Well 1 |

With the counts held constant, **all five layouts are economically identical**; only the road
distances differ, and those matter only when two workplaces compete for the same worker. The
visible part of a layout difference is therefore entirely produced by the existing network
rules — the invisible part (physical neighbourhood) has no consumer at all.

## 3. Adjacency results

| pair | physical distance | road distance | same network | Farm staffed | Food net | employed |
| --- | --- | --- | --- | --- | --- | --- |
| Residence-Farm, same network | 2 | 0 | yes | 1 | +1 | 1 |
| **Residence-Farm, physically adjacent** | **1** | n/a | **no** | **0** | **-1** | **0** |
| Residence-Farm, same network | 6 | 4 | yes | 1 | +1 | 1 |
| Farm-Farm adjacent | 1 | n/a | - | 1 (one worker) | +1 | 1 |
| Workshop-Workshop adjacent | 1 | n/a | - | 0 (1 Workshop staffed) | -1 | 1 |
| Farm-Well adjacent | 1 | n/a | (different) | 1 | +1 | 1 |

The decisive row is the second: **two buildings sharing an edge produce nothing if they are on
different networks.** Physical adjacency is not a runtime concept; the network is.

## 4. Distance versus adjacency

The runtime always evaluates the **road** distance:

| farm | physical distance to Residence | road distance | workers |
| --- | --- | --- | --- |
| nearer Farm | 2 | 8 | **0** |
| farther Farm | 4 | 2 | **1** |

The physically nearer Farm loses the worker to the road-nearer one. The four required cases
(pairs of physical/road distance): (2, 6), (4, 4), (2, 0), (9, 7) — all produce the same
2 Food/tick with a single workplace, confirming that with one workplace only *reachability*
matters, and with competing workplaces only the *road* distance decides.

## 5. Road efficiency

| geometry | buildings | road cells | buildings / road | road Material |
| --- | --- | --- | --- | --- |
| compact (4 around 1 cell) | 4 | 1 | **4.0** | 5 |
| corridor | 4 | 4 | 1.0 | 20 |
| ring | 4 | 4 | 1.0 | 20 |
| two clusters (8 around 2 cells) | 8 | 2 | **4.0** | 10 |
| three clusters (12 around 3 cells) | 12 | 3 | **4.0** | 15 |
| branch | 6 | 5 | 1.2 | 25 |

The same building count can be served with **four times fewer road cells**, i.e. road Material
varies by 4x for an identical colony. That is a real, already-existing densification price: the
player has an economic reason to build around a road cell rather than along a corridor.

## 6. Building externalities (H1–H6)

| hypothesis | measured |
| --- | --- |
| **H1** Residence next to Farm+Well+Workshop vs the same three far apart | Food 2, material net 0, employed 1 in BOTH |
| **H2** Farm next to Workshop | mixed-use and segregated layouts both give Food 2, material net +1, 1 staffed Workshop |
| **H3** residential concentration around one Well | 3 Residences around 1 Well: **served 3** (coverage is network-wide) but **production 2** (capacity is per Well) — concentration adds nothing, the fixed capacity is the constraint |
| **H4** Workshop density | 1/2/3 Workshops grouped vs separated: material net 1/2/2 identical in both layouts |
| **H5** Farm density | three Farms together vs separated: Food 4 in both |
| **H6** mixed-use vs segregated | identical flows (Food 2, material net +1) |

**H1: E — rejected.** Evidence: a Residence next to industry behaves exactly like one far
from it on the same network (Food 2, material net 0, employed 1 in both).

**H2: E — rejected.** Evidence: a Farm and a Workshop never read each other; both mixed and
segregated layouts give Food 2 and material net +1.

**H3: C — weak.** Evidence: one Well already serves every Residence on its network but
produces only 2 Water/tick, so the binding constraint is the fixed capacity, not the
concentration. The data exists, the consequence does not.

**H4: E — rejected.** Evidence: workshop output and storage are strictly per building
(2 Material and 25 storage each); grouping them changes nothing (material net 1/2/2 for
1/2/3 Workshops in both arrangements).

**H5: E — rejected.** Evidence: farm output is strictly per staffed building (Food 4 for two
staffed Farms, whether the Farms are adjacent or separated).

**H6: E — rejected.** Evidence: mixed-use and segregated layouts produce identical flows.

## 7-8. Future spatial pressure candidates and the pollution probe

The pollution candidate was probed without creating any variable. Available data: Workshop
count (observable), Workshop production (observable, linear), Residence proximity (**not a
runtime concept** — no rule reads a neighbour), storage capacity (25 per operational Workshop,
linear). Measured grouped vs separated for 1, 2 and 3 Workshops: material net 1/2/2 **in both**,
staffed Workshops identical. Since nothing in the model changes when industry is placed next to
housing, an industrial externality has no measurable basis yet.

## Player decision test

| consequence | visible | understandable | actionable | different result |
| --- | --- | --- | --- | --- |
| road access (building must touch a road) | yes | yes | yes | yes |
| network membership (mobility + Water coverage) | yes | yes | yes | yes |
| road distance (09M workplace preference) | yes | yes | yes | yes |
| road Material cost (5 per cell) | yes | yes | yes | yes |
| physical adjacency / neighbour type / density | no | no | no | no |

Four spatial consequences already pass all four player-decision tests. A technical difference
invisible to the player (adjacency, density) does not count as a new decision.

## Classification

| candidate | classification | evidence |
| --- | --- | --- |
| A — Pollution / industrial externality | **D — premature** | no rule or variable changes when Workshops are grouped next to Residences (material net 1/2/2 identical grouped vs separated) |
| B — Service radius | **D — premature** | Water coverage is already network-based and serves every Residence on a network; a physical radius would replace the existing rule, duplicating it |
| C — Land efficiency | **A — fundamental** | measured 4.0 vs 1.0 buildings per road cell for the same building count, i.e. road Material varies 4x; the pressure already exists |
| D — Local production chain | **D — premature** | a Farm and a Workshop never interact (identical flows in mixed and segregated layouts) |
| E — Density / adjacency bonus | **E — rejected** | physical adjacency with an identical network changes nothing; with a different network it behaves as disconnection, so a bonus would duplicate the network decision |
| F — No new spatial system | **A — fundamental** | four distinct, visible, actionable layout decisions already exist (road access, network, road distance, road cost) |

No ranking between candidates is implied (as required).

## Criteria for a new spatial pressure

| criterion | satisfied | evidence |
| --- | --- | --- |
| 1 consequence different from existing networks | **no** | no neighbour-based consequence exists today |
| 2 measurable difference between layouts | yes | but only through road cost and assignment |
| 3 player-visible decision | **no** | nothing neighbour-based is visible |
| 4 interaction with >= 2 systems | **no** | a new spatial pressure needs a consumer that does not exist |
| 5 non-cosmetic effect | **no** | nothing to observe today |
| 6 no duplication of Water coverage | **no** | a service radius would duplicate the coverage rule |
| 7 no catastrophic bootstrap loop | yes | not applicable to a rejected candidate |
| 8 localizable implementation | yes | not applicable to a rejected candidate |

```text
NO NEW SPATIAL SYSTEM JUSTIFIED
```

## Architectural findings

* `src/` unchanged; `SAVE_VERSION` stays 7; persisted top level = `config, time, resources,
  buildings, roads, colonists, counters` (7 keys);
* no new persistent or derived state, no cache, no adjacency/density/radius/pollution concept
  anywhere in the canonical payload, no generic framework;
* determinism preserved: two identical 200-tick runs hash identically and reversing the record
  key insertion order leaves the canonical hash unchanged;
* the audit itself is `src`-immutable (only `tests/` and this document changed).

## Tests

```text
before:            60 files / 1198 tests
after:             61 files / 1212 tests
audit tests added: 14 (tests/spatialExternalitiesAdjacencyAudit.test.ts)
```

`typecheck`, `lint`, `build`: passed.

## Determinism

Same scenario twice => same canonical hash (measured); insertion-order invariance over
`buildings` / `roads` / `colonists` => same hash (measured); save/load unchanged.

## Conclusion

The layout is **already an emergent economic system**, and the audit found exactly which part
of it is real:

* **four spatial consequences already work** and each passes the four player-decision tests:
  road access (a building with no adjacent road produces nothing), network membership (Water
  coverage and worker mobility), road distance (which workplace wins a worker) and road cost
  (5 Material per cell, with a measured 4x difference in buildings per road cell);
* **physical adjacency is not a concept in the model**: two buildings sharing an edge produce
  nothing when their networks differ, and adjacency on the same network is never read;
* **no neighbour-based consequence exists** for any pair (Residence-industry, Farm-Workshop,
  same-type clustering, mixed-use), so there is nothing to extend — only something to invent,
  and inventing it would duplicate the network rules.

## Next dependency

```text
NO NEW SPATIAL SYSTEM JUSTIFIED
```

The existing pressure is carried by **road access + network membership + road distance + road
cost**. If a future step wants a genuinely new spatial axis, the audit measured where the data
for one already exists — land/road efficiency (4.0 vs 1.0 buildings per road cell) and Well
capacity concentration — but neither has a consumer today, and no new mechanic should be added
until a consequence is measured that the current four cannot express.

