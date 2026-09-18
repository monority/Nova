# NOVA — Step 04 Closure

## Context

Step 04 — First Resource Constraint & Construction Cost est déjà implémenté.

L'audit a confirmé que le code et les tests unitaires sont corrects :

* ResourceStock dans le domaine ;
* stock initial déterministe ;
* coût de construction dans le catalogue ;
* validation économique déterministe ;
* déduction atomique ;
* rejet sans mutation ;
* query pure ;
* UI connectée aux vraies données ;
* preview cohérent ;
* persistence v2 ;
* hash intégrant les ressources ;
* 63/63 tests ;
* lint PASS ;
* typecheck PASS ;
* build PASS ;
* architecture PASS.

Le statut actuel est `PARTIAL` uniquement parce que la validation E2E complète n'a pas encore été exécutée.

## Objectif

**Ne pas refaire l'implémentation Step 04.**

Compléter uniquement les validations manquantes afin de déterminer si Step 04 peut devenir `COMPLETE`.

---

# 1. AUDIT RAPIDE AVANT ACTION

Inspecte uniquement les éléments pertinents :

```text
e2e/resourceRun.mjs
e2e/gpuRun.mjs
package.json
artifacts/
```

Vérifie que le scénario resource E2E existe déjà et que les assertions prévues sont présentes.

Ne réécris pas `resourceRun.mjs` si le scénario est déjà complet.

---

# 2. EXÉCUTER LE RESOURCE E2E

Lance réellement :

```text
pnpm build
pnpm test:e2e:resource
```

Le test doit être exécuté dans le vrai navigateur.

Ne simule pas le résultat.

Ne déclare pas PASS simplement parce que le script existe.

---

# 3. VÉRIFIER LES SCREENSHOTS

Le scénario doit générer :

```text
artifacts/resources/01-initial.png
artifacts/resources/02-valid-placement.png
artifacts/resources/03-after-construction-start.png
artifacts/resources/04-operational.png
artifacts/resources/05-low-resources.png
artifacts/resources/06-rejected-placement.png
```

Les noms exacts peuvent être ceux déjà définis par le script.

Après l'exécution :

1. vérifier que chaque fichier existe ;
2. vérifier que chaque PNG est non vide ;
3. vérifier les dimensions ;
4. vérifier que les fichiers ne sont pas identiques par erreur.

Ne crée PAS artificiellement les screenshots.

Ils doivent être produits par le véritable E2E.

---

# 4. INSPECTION VISUELLE

Si l'environnement dispose réellement d'un moyen de lire les images, inspecter les six screenshots.

Vérifier visuellement :

### Initial

* monde initial ;
* stock visible ;
* aucune construction inattendue.

### Valid placement

* preview valide ;
* état visuel cohérent.

### Construction

* bâtiment visible ;
* état construction cohérent ;
* stock diminué.

### Operational

* bâtiment opérationnel ;
* UI cohérente ;
* stock correct.

### Low resources

* stock proche de l'épuisement ;
* monde cohérent.

### Rejected placement

* tentative refusée ;
* raison visible si prévue ;
* état du monde cohérent.

Si aucun outil visuel réel n'est disponible, écrire explicitement :

```text
Visual inspection: NOT EXECUTED
```

Ne jamais prétendre avoir vu les images.

---

# 5. GPU E2E — EXTENSION MINIMALE

Inspecte `e2e/gpuRun.mjs`.

Le GPU E2E actuel vérifie déjà :

* WebGL2 ;
* renderer NVIDIA ;
* absence de software renderer ;
* chargement NOVA ;
* interaction réelle ;
* progression temporelle ;
* console ;
* page errors.

Il manque uniquement la couverture explicite Step 04.

Ajoute les assertions minimales suivantes au scénario GPU existant.

---

# 6. GPU RESOURCE ASSERTIONS

Après le chargement de NOVA :

vérifier le stock initial réel :

```text
construction resources = 100
```

Ne hardcode cette valeur que si elle provient déjà explicitement du contrat Step 04.

Ensuite effectuer un vrai placement avec :

```text
mouse.move()
mouse.click()
```

sur le canvas.

Après placement :

```text
resources = 75
buildings = 1
```

si le coût réel est 25.

Les valeurs doivent correspondre aux données du domaine.

---

# 7. GPU DEPLETION

Continuer le scénario GPU pour consommer les ressources.

Vérifier réellement :

```text
100
 ↓
75
 ↓
50
 ↓
25
 ↓
0
```

et le nombre de bâtiments correspondant.

Ne contourner aucune étape avec des mutations JavaScript directes.

Toutes les constructions doivent être déclenchées par les interactions normales du navigateur.

---

# 8. GPU REJECTION

Lorsque :

```text
resources = 0
```

effectuer une nouvelle tentative réelle :

```text
mouse.move()
mouse.click()
```

sur une cellule spatialement valide.

Vérifier :

```text
building count unchanged
resources unchanged
```

et vérifier si l'UI affiche la raison d'échec réelle.

La raison doit correspondre à :

```text
insufficientResources
```

ou à la représentation UI existante.

---

# 9. GPU + TEMPORAL

Conserver également la validation Step 03 :

```text
building placed
 ↓
underConstruction
 ↓
STEP
 ↓
operational
 ↓
colonist
```

Le GPU E2E doit donc maintenant couvrir les deux dimensions :

```text
GPU
+
Resources
+
Temporal lifecycle
```

Ne supprimer aucune assertion existante.

---

# 10. GPU DIAGNOSTIC

Le test doit toujours vérifier le renderer WebGL réel.

Rapporter :

```text
WebGL:
Vendor:
Renderer:
Unmasked Vendor:
Unmasked Renderer:
Software Renderer:
NVIDIA:
```

Le renderer attendu doit continuer à indiquer NVIDIA hardware.

Un résultat du type :

```text
SwiftShader
llvmpipe
Microsoft Basic Render Driver
Software Renderer
```

doit faire échouer le test.

Ne transforme jamais ce cas en warning.

---

# 11. REAL BROWSER

Toutes les interactions resource doivent être réalisées dans le vrai navigateur.

Le test doit utiliser les mécanismes déjà validés :

```text
Playwright Windows
headed browser
real mouse movement
real mouse click
real canvas
real Three.js renderer
real NVIDIA GPU
```

Ne remplace pas les interactions par :

```text
controller.dispatchCommand(...)
```

dans le test GPU.

L'objectif est de tester la chaîne complète :

```text
Mouse
 ↓
Application
 ↓
Command
 ↓
Simulation
 ↓
RenderSnapshot
 ↓
Three.js
 ↓
WebGL
 ↓
NVIDIA GPU
```

---

# 12. CONSOLE

Conserver :

```text
console errors = 0
page errors = 0
```

Le test doit échouer si une erreur pertinente apparaît.

---

# 13. EXÉCUTION FINALE

Après les modifications minimales :

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:resource
pnpm test:e2e:gpu
```

Exécute réellement toutes les commandes.

Ne réutilise pas un ancien résultat comme résultat actuel.

---

# 14. ARTIFACTS

Vérifier que les screenshots resource sont réellement présents.

Rapporter :

```text
artifacts/resources/...
artifacts/gpu/...
```

avec taille et dimensions si possible.

Ne pas créer de screenshots artificiels.

---

# 15. PAS DE MODIFICATION INUTILE

Cette étape est une étape de clôture.

Ne pas :

* modifier le modèle économique ;
* changer le coût ;
* changer le stock initial ;
* changer la durée de construction ;
* modifier le renderer ;
* refactorer le domaine ;
* ajouter une ressource supplémentaire ;
* modifier persistence sans nécessité ;
* ajouter de gameplay.

Si une modification est nécessaire pour le GPU E2E, elle doit rester limitée au test/diagnostic.

---

# 16. CRITÈRES POUR COMPLETE

Step 04 peut passer à `COMPLETE` si :

### Resource E2E

* [ ] test réellement exécuté ;
* [ ] placement réel ;
* [ ] stock initial vérifié ;
* [ ] déduction vérifiée ;
* [ ] depletion vérifiée ;
* [ ] rejet vérifié ;
* [ ] état inchangé après rejet ;
* [ ] console 0 ;
* [ ] page errors 0.

### Screenshots

* [ ] six screenshots réellement générés ;
* [ ] PNG non vides ;
* [ ] dimensions valides ;
* [ ] inspection visuelle effectuée si réellement possible.

### GPU E2E

* [ ] WebGL2 ;
* [ ] NVIDIA renderer ;
* [ ] software renderer false ;
* [ ] stock initial vérifié ;
* [ ] déduction vérifiée ;
* [ ] depletion vérifiée ;
* [ ] rejet vérifié ;
* [ ] temporal lifecycle toujours vérifié ;
* [ ] interaction souris réelle ;
* [ ] console 0 ;
* [ ] page errors 0.

### Existing quality

* [ ] Unit PASS ;
* [ ] Integration PASS ;
* [ ] E2E PASS ;
* [ ] Resource E2E PASS ;
* [ ] GPU E2E PASS ;
* [ ] Lint PASS ;
* [ ] Typecheck PASS ;
* [ ] Build PASS.

---

# 17. STATUT

### COMPLETE

Uniquement si les validations ci-dessus ont réellement été exécutées.

### PARTIAL

Si le code fonctionne mais qu'une validation reste impossible ou non exécutée.

### BLOCKED

Si une dépendance empêche réellement l'exécution.

Ne jamais promouvoir à COMPLETE uniquement parce que le code semble correct.

---

# 18. RAPPORT FINAL

Retourne un rapport court mais factuel :

## Resource E2E

```text
Executed:
Initial stock:
After placement:
After depletion:
Rejected placement:
Console:
Page errors:
```

## GPU E2E

```text
WebGL:
Renderer:
NVIDIA:
Software:
Resource assertions:
Temporal assertions:
Console:
Page errors:
```

## Screenshots

Lister les fichiers réellement créés.

## Tests

Lister les résultats exacts.

## Visual inspection

```text
PASS
ou
NOT EXECUTED
```

avec une explication honnête.

## Final status

```text
COMPLETE
PARTIAL
BLOCKED
```

Le statut doit être basé exclusivement sur les vérifications réellement exécutées.

