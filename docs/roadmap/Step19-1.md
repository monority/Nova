# Step 19.1 — Playtest & Product QA

## Objectif

Tester NOVA comme un utilisateur réel.

Cette étape ne doit **pas ajouter de fonctionnalité**.

Le but est d'identifier les problèmes réels de :

* gameplay ;
* UX ;
* lisibilité ;
* simulation observable ;
* caméra ;
* construction ;
* sélection ;
* inspection ;
* feedback temporel ;
* feedback des changements ;
* direction visuelle.

L'objectif est de produire un **rapport QA exploitable**, pas de modifier immédiatement le produit.

---

# 1. Règle principale

**NE MODIFIE PAS LE CODE pendant la première phase.**

Tu dois d'abord :

1. lancer l'application ;
2. jouer avec elle ;
3. observer son comportement ;
4. noter les problèmes ;
5. reproduire les problèmes ;
6. produire un rapport structuré.

Aucune correction ne doit être effectuée avant le rapport.

---

# 2. Lancer NOVA

Utiliser les commandes et scripts existants du projet.

Vérifier que l'application démarre correctement.

Si plusieurs modes de lancement existent, utiliser le mode de développement normal.

Si le navigateur Chromium rencontre le stall GPU/WebGL déjà connu :

* ne pas modifier le renderer pour contourner le problème ;
* ne pas désactiver artificiellement Three.js ;
* ne pas considérer automatiquement cela comme un bug NOVA ;
* documenter exactement où le navigateur bloque.

Si un autre navigateur ou environnement local déjà disponible permet une observation réelle, l'utiliser uniquement si cela ne nécessite pas de modifier le projet.

---

# 3. Test initial

Observer la scène immédiatement après le lancement.

Vérifier :

### Caméra

* vue strictement verticale ;
* aucune projection isométrique ;
* aucune inclinaison perceptible ;
* grille cohérente ;
* terrain aligné avec bâtiments ;
* routes alignées avec bâtiments.

### Composition

Vérifier :

* lisibilité de la ville ;
* hiérarchie visuelle ;
* contraste ;
* densité ;
* position des éléments UI ;
* visibilité du terrain ;
* visibilité des bâtiments ;
* visibilité des routes.

Ne pas juger uniquement selon des conventions de dashboard.

Le produit doit conserver son identité :

> observatoire architectural / simulation urbaine contemplative.

---

# 4. Test de construction

Tester successivement :

```text
HOUSE
FARM
ROAD
COMMUNITY SERVICE
```

Pour chaque élément :

* entrer dans le mode de construction ;
* déplacer le curseur ;
* observer le preview ;
* placer ;
* sélectionner ;
* supprimer ;
* vérifier le retour visuel.

Tester également des placements invalides :

* eau ;
* hors limites ;
* cellule occupée ;
* chevauchement ;
* emplacement non constructible.

Vérifier que l'interface explique suffisamment l'état sans devenir verbeuse.

---

# 5. Test des zones

Créer :

* une zone résidentielle ;
* une zone agricole.

Tester :

* création ;
* sélection ;
* inspection ;
* suppression ;
* placement manuel dans les zones ;
* développement autonome.

Vérifier particulièrement que :

> supprimer une zone ne supprime pas les bâtiments existants.

---

# 6. Test de simulation

Démarrer la simulation.

Tester :

```text
1×
2×
5×
20×
100×
```

Puis :

* pause ;
* reprise ;
* STEP ;
* reset.

Observer la ville pendant suffisamment longtemps pour voir de vrais changements.

Vérifier :

* création autonome de bâtiments ;
* extension des routes ;
* densification ;
* évolution house → apartment ;
* influence des services ;
* évolution de la population ;
* évolution de la nourriture.

Ne pas accélérer uniquement pour vérifier qu'un nombre change.

Observer également si les transformations sont **visuellement compréhensibles**.

---

# 7. Test du feedback temporel

Observer le feed de changements.

Vérifier qu'un changement réel produit un feedback compréhensible.

Exemples attendus :

```text
HOUSE BUILT
Residential zone
Near road
```

```text
ROAD EXTENDED
Local road
Residential area
```

```text
DENSIFICATION
House → Apartment
Residential zone
```

Vérifier :

* absence de spam ;
* regroupement correct ;
* ordre temporel ;
* stabilité ;
* lisibilité ;
* disparition/rotation des anciens événements ;
* cohérence avec ce qui vient réellement de se produire dans la ville.

---

# 8. Test de navigation depuis le feed

Cliquer sur un événement récent.

Vérifier que :

```text
feed event
    ↓
stable object ID
    ↓
selection
    ↓
inspection
```

fonctionne correctement.

Vérifier que l'objet inspecté correspond réellement à l'événement sélectionné.

Tester au minimum :

* bâtiment ;
* route ;
* évolution d'un bâtiment.

Si l'événement concerne un objet supprimé entre-temps, vérifier que l'interface gère proprement ce cas.

---

# 9. Test d'inspection

Sélectionner :

* maison ;
* appartement ;
* ferme ;
* route locale ;
* route artérielle ;
* service ;
* zone.

Vérifier que le panneau affiche uniquement des informations réelles.

Rechercher notamment :

* informations contradictoires ;
* valeurs impossibles ;
* informations obsolètes ;
* catégories incorrectes ;
* contexte de zone erroné ;
* proximité route/service incorrecte.

---

# 10. Test de morphologie urbaine

Observer la ville sans construire manuellement pendant plusieurs périodes.

Chercher les comportements suivants :

```text
zones
 ↓
développement
 ↓
clusters
 ↓
routes
 ↓
densification
```

Question centrale :

> Est-ce que la ville donne réellement l'impression de se développer elle-même ?

Ne pas exiger une simulation réaliste au sens scientifique.

Chercher plutôt :

* cohérence spatiale ;
* continuité ;
* progression lisible ;
* absence de constructions totalement arbitraires ;
* densification compréhensible ;
* distinction entre zones résidentielles et agricoles.

---

# 11. Test de lisibilité

Après plusieurs minutes de simulation, répondre objectivement :

### Compréhension

* Est-il évident que la ville évolue ?
* Est-il évident pourquoi le joueur doit définir des zones ?
* Est-il évident que la simulation construit elle-même ?

### Spatial

* Les routes sont-elles lisibles ?
* Les bâtiments sont-ils suffisamment différenciés ?
* Les appartements sont-ils immédiatement reconnaissables ?
* Les zones sont-elles suffisamment visibles sans dominer la scène ?

### Temporal

* Le joueur comprend-il que le temps avance ?
* Les changements sont-ils perceptibles ?
* Le feed ajoute-t-il réellement de la compréhension ?

### UI

* Y a-t-il trop d'informations ?
* Des contrôles sont-ils difficiles à comprendre ?
* Certaines informations importantes sont-elles cachées ?
* L'interface couvre-t-elle inutilement le monde ?

---

# 12. Test de direction artistique

Évaluer NOVA selon sa direction définie, pas selon celle d'un city-builder traditionnel.

Vérifier :

* top-down strict ;
* sombre ;
* minimal ;
* architectural ;
* contemporain/dystopique ;
* absence de cyberpunk HUD excessif ;
* absence de look mobile game ;
* absence de surcharge ;
* bâtiments géométriques ;
* routes discrètes ;
* UI secondaire par rapport à la ville.

Identifier les éléments qui semblent encore :

* génériques ;
* trop "prototype" ;
* trop SaaS ;
* trop jeu vidéo classique ;
* trop techniques ;
* visuellement incohérents.

---

# 13. Performance perçue

Sans effectuer prématurément d'optimisation, observer :

* FPS perçus ;
* fluidité caméra ;
* fluidité zoom ;
* fluidité construction ;
* comportement à `100×` ;
* comportement lorsque la ville devient plus dense ;
* éventuelles fuites mémoire visibles ;
* accumulation de meshes ;
* lenteurs UI.

Ne pas conclure à un problème de performance uniquement à partir d'une impression vague.

Si possible, fournir une mesure.

---

# 14. Déterminisme

Faire au minimum deux runs équivalents :

```text
reset
→ même vitesse
→ même durée
→ même actions
```

Comparer le résultat.

Vérifier :

* mêmes bâtiments ;
* mêmes routes ;
* mêmes évolutions ;
* mêmes IDs ;
* mêmes événements ;
* même ordre du feed.

---

# 15. Rapport final

Ne modifier aucun fichier avant d'avoir produit ce rapport.

Créer :

```text
docs/qa/step19.1-playtest.md
```

Le rapport doit contenir :

## Executive summary

5–10 lignes maximum.

## Environment

* OS ;
* navigateur ;
* commande utilisée ;
* éventuel problème WebGL.

## Functional QA

Table :

| Area          | Result    | Issue |
| ------------- | --------- | ----- |
| Camera        | PASS/FAIL | ...   |
| Construction  | PASS/FAIL | ...   |
| Roads         | PASS/FAIL | ...   |
| Zones         | PASS/FAIL | ...   |
| Simulation    | PASS/FAIL | ...   |
| Population    | PASS/FAIL | ...   |
| Economy       | PASS/FAIL | ...   |
| Densification | PASS/FAIL | ...   |
| Inspection    | PASS/FAIL | ...   |
| Event feed    | PASS/FAIL | ...   |
| Timeline      | PASS/FAIL | ...   |
| Reset         | PASS/FAIL | ...   |

## UX observations

Lister les problèmes observés.

Pour chaque problème :

```text
Severity:
Area:
Reproduction:
Observed:
Expected:
Impact:
Evidence:
```

Severity :

```text
P0 = bloque l'utilisation
P1 = fonctionnalité importante cassée
P2 = problème UX significatif
P3 = détail mineur
```

## Visual observations

Séparer :

* caméra ;
* terrain ;
* bâtiments ;
* routes ;
* zones ;
* UI ;
* densité ;
* cohérence générale.

## Simulation observations

Documenter :

* rythme ;
* clustering ;
* extension des routes ;
* densification ;
* comportement des zones ;
* nourriture ;
* population.

## Performance

Inclure uniquement les problèmes réellement observés ou mesurés.

## WebGL limitation

Si le stall Chromium apparaît encore, documenter :

```text
Known environment limitation
```

et séparer clairement ce problème des bugs applicatifs.

## Recommended next actions

Ne pas corriger.

Classer simplement les observations par priorité :

```text
P0
P1
P2
P3
```

---

# 16. Validation après le rapport

Une fois le rapport créé, exécuter :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ne pas modifier le code de production uniquement pour faire passer les validations.

Si aucun code n'a été modifié, confirmer simplement que les validations restent vertes.

---

# 17. Definition of Done

Step 19.1 est terminé lorsque :

* [ ] NOVA a été réellement lancé ;
* [ ] un playtest fonctionnel a été effectué ;
* [ ] construction testée ;
* [ ] zones testées ;
* [ ] simulation testée ;
* [ ] vitesses testées ;
* [ ] densification observée ;
* [ ] routes testées ;
* [ ] feed testé ;
* [ ] inspection testée ;
* [ ] reset testé ;
* [ ] direction artistique évaluée ;
* [ ] performance observée ;
* [ ] déterminisme vérifié ;
* [ ] aucun code produit modifié avant le rapport ;
* [ ] `docs/qa/step19.1-playtest.md` créé ;
* [ ] typecheck OK ;
* [ ] lint OK ;
* [ ] tests OK ;
* [ ] build OK.

## Règle finale

Ne cherche pas à démontrer que NOVA fonctionne.

Cherche à découvrir **où NOVA ne fonctionne pas encore comme produit**.

Un problème trouvé pendant ce playtest est un résultat positif : il nous donne une information exploitable pour décider de la prochaine étape.
