# NOVA — Step 19.2 — Browser & WebGL Validation

## Objectif

Résoudre ou isoler précisément le problème qui empêche actuellement le playtest navigateur de NOVA.

Le problème connu est :

```text
pnpm test:e2e
        ↓
Playwright Chromium
        ↓
browser/WebGL stall
        ↓
tests timeout
```

Cette étape ne doit **pas ajouter de fonctionnalité à NOVA**.

Elle doit déterminer si le problème vient :

* de Playwright ;
* de Chromium ;
* du lancement Vite preview ;
* de WebGL/ANGLE ;
* du GPU ;
* du driver ;
* des flags Chromium ;
* de l'environnement Windows ;
* ou réellement du code de NOVA.

---

# 1. Règle absolue

Ne pas modifier le renderer NOVA pour contourner le problème.

Ne pas :

* remplacer Three.js ;
* désactiver WebGL ;
* remplacer WebGL par Canvas 2D ;
* supprimer le renderer ;
* ajouter un fallback artificiel uniquement pour les tests ;
* modifier la caméra ;
* modifier le système de coordonnées ;
* modifier le runtime ;
* supprimer les tests E2E.

L'objectif est d'obtenir une vraie exécution :

```text
Windows
  ↓
Chromium
  ↓
GPU / WebGL
  ↓
Three.js
  ↓
NOVA
```

---

# 2. Baseline

Commencer par reproduire exactement :

```bash
pnpm test:e2e
```

Documenter :

* durée avant blocage ;
* test actuellement exécuté ;
* URL ;
* éventuel message Chromium ;
* éventuel message Playwright ;
* logs navigateur ;
* console errors ;
* erreurs page ;
* processus qui restent actifs après le timeout.

Ne rien corriger à ce stade.

---

# 3. Vérifier Vite indépendamment de Playwright

Lancer :

```bash
pnpm build
pnpm preview
```

ou le script équivalent existant.

Vérifier manuellement que le serveur répond.

Tester simplement :

```text
http://127.0.0.1:<port>
```

Si possible, ouvrir cette URL dans un navigateur Windows installé localement.

Objectif :

déterminer si le problème apparaît déjà sans Playwright.

---

# 4. Test Chromium minimal

Créer temporairement un test minimal indépendant de NOVA.

Ce test doit uniquement :

1. lancer Chromium ;
2. ouvrir une page HTML minimale ;
3. vérifier JavaScript ;
4. vérifier WebGL ;
5. fermer Chromium.

Créer temporairement quelque chose équivalent à :

```text
WebGL diagnostic
```

Le diagnostic doit récupérer :

```text
WEBGL renderer
WEBGL vendor
WEBGL version
ANGLE renderer
```

et détecter notamment :

```text
SwiftShader
llvmpipe
Microsoft Basic Render Driver
unknown software renderer
```

Le diagnostic ne doit pas être intégré à NOVA.

---

# 5. Comparer avec et sans GPU

Tester plusieurs configurations Chromium.

Au minimum :

### A

Chromium standard.

### B

Chromium avec GPU explicitement activé.

### C

Chromium avec GPU désactivé.

L'objectif n'est pas de choisir immédiatement une configuration.

L'objectif est de comprendre :

```text
GPU enabled
    ↓
works / stalls

GPU disabled
    ↓
works / stalls
```

Si GPU désactivé fonctionne mais GPU activé bloque :

```text
→ problème probable Chromium / ANGLE / driver / GPU environment
```

Si les deux bloquent :

```text
→ chercher côté lancement browser / page / Playwright / application
```

Ne pas tirer de conclusion définitive uniquement à partir d'un test.

---

# 6. Vérifier le renderer réel

Si Chromium démarre correctement, collecter le renderer WebGL réel.

Le résultat attendu pour la validation matérielle est un renderer NVIDIA/RTX ou équivalent matériel réel.

Un résultat comme :

```text
Google SwiftShader
```

ne doit pas être considéré comme une validation GPU.

De même :

```text
llvmpipe
Microsoft Basic Render Driver
```

ne constitue pas une validation matérielle correcte.

---

# 7. Test Three.js minimal

Après validation du WebGL minimal, créer un deuxième test totalement indépendant de NOVA :

```text
HTML
 ↓
Three.js
 ↓
WebGLRenderer
 ↓
simple cube
 ↓
animation
```

Pas de :

* React ;
* Next.js ;
* simulation ;
* runtime NOVA ;
* terrain ;
* caméra NOVA.

Objectif :

déterminer si :

```text
WebGL minimal
    ↓
PASS

Three.js minimal
    ↓
PASS / FAIL
```

---

# 8. Test NOVA minimal

Si Three.js fonctionne, revenir progressivement vers NOVA.

Tester :

```text
NOVA page
 ↓
canvas
 ↓
renderer
 ↓
terrain uniquement
```

Puis :

```text
terrain
+
camera
```

Puis :

```text
terrain
+
camera
+
buildings
```

Puis l'application complète.

Ne pas réécrire l'architecture.

L'objectif est uniquement d'identifier le point où le stall apparaît.

---

# 9. Inspecter les erreurs navigateur

Ajouter uniquement pendant le diagnostic les logs nécessaires pour récupérer :

```text
console
pageerror
requestfailed
WebGL errors
browser process errors
```

Si Playwright permet de récupérer les logs Chromium, les conserver.

Chercher notamment :

```text
GPU process
ANGLE
WebGL
Context lost
GPU channel
Renderer
Crash
```

Ne pas modifier le comportement applicatif sur la base d'une hypothèse.

---

# 10. Vérifier l'environnement Windows

Collecter les informations disponibles :

```text
GPU
GPU driver
Chromium version
Playwright version
Node version
pnpm version
Vite version
Three.js version
```

Le but est d'avoir une photographie reproductible de l'environnement.

Ne pas effectuer de mise à jour massive du système.

---

# 11. Ne pas confondre nvidia-smi et WebGL

Important :

Le fait que :

```text
nvidia-smi
```

détecte une carte NVIDIA ne signifie pas que Chromium utilise réellement cette carte pour WebGL.

La validation pertinente est :

```text
Chromium
 ↓
WebGL
 ↓
actual renderer
```

Un renderer logiciel doit être signalé comme tel.

---

# 12. Tester le navigateur Windows réel si disponible

Si un navigateur Chromium basé Windows est installé et déjà disponible dans l'environnement :

tester NOVA directement dedans.

Exemples possibles :

```text
Chrome
Edge
```

Ne pas installer arbitrairement plusieurs navigateurs.

L'objectif est de répondre à :

```text
Playwright Chromium
        vs
Windows Chromium browser
```

Si le navigateur Windows fonctionne alors que Playwright Chromium bloque :

```text
→ problème probablement lié à Playwright / Chromium lancé par Playwright
```

Si les deux bloquent :

```text
→ problème plus probablement lié à WebGL / ANGLE / driver / environnement
```

---

# 13. Tester Playwright avec le navigateur système

Si l'environnement le permet, tester Playwright avec le navigateur Chromium/Edge système plutôt que son binaire embarqué.

Ne pas supposer que cette configuration est automatiquement correcte.

Documenter :

```text
browser executable
browser version
WebGL renderer
result
```

Si cette approche fonctionne, conserver la configuration uniquement comme solution de validation E2E si elle reste reproductible.

---

# 14. Diagnostic de la caméra

Une fois NOVA rendu correctement, vérifier visuellement :

```text
camera
 ↓
top-down
```

Vérifier :

* caméra parfaitement verticale ;
* aucun tilt ;
* aucun effet isométrique ;
* terrain et bâtiments alignés ;
* grille cohérente ;
* placement cohérent.

Ne modifier aucun code simplement parce qu'une hypothèse visuelle semble suspecte.

Le but est d'abord de confirmer le comportement réel.

---

# 15. Playtest minimal

Une fois le renderer fonctionnel, effectuer uniquement un smoke test :

```text
launch
 ↓
initial settlement
 ↓
place house
 ↓
place road
 ↓
select object
 ↓
run simulation
 ↓
pause
 ↓
reset
```

Puis vérifier :

```text
feed
inspection
timeline
```

Ce n'est pas encore le playtest complet de Step 19.1.

C'est uniquement une preuve que :

> NOVA peut réellement être exécuté et observé dans un navigateur GPU fonctionnel.

---

# 16. Aucun changement produit

Pendant cette étape, ne pas ajouter :

* gameplay ;
* simulation ;
* bâtiments ;
* UI ;
* shaders ;
* effets ;
* événements ;
* économie ;
* population ;
* nouvelles mécaniques.

Ne pas profiter du diagnostic pour faire du refactoring.

---

# 17. Rapport

Créer :

```text
docs/qa/step19.2-webgl-validation.md
```

Le rapport doit répondre clairement :

## Environment

```text
OS:
Node:
pnpm:
Playwright:
Chromium:
Three.js:
GPU:
Driver:
```

## Tests

| Test                   | Result    | Renderer | Notes |
| ---------------------- | --------- | -------- | ----- |
| Chromium minimal WebGL | PASS/FAIL | ...      | ...   |
| Three.js minimal       | PASS/FAIL | ...      | ...   |
| NOVA renderer          | PASS/FAIL | ...      | ...   |
| NOVA full app          | PASS/FAIL | ...      | ...   |
| Playwright             | PASS/FAIL | ...      | ...   |
| Windows browser        | PASS/FAIL | ...      | ...   |

## Root cause

Si possible :

```text
CONFIRMED
PROBABLE
UNKNOWN
```

Ne pas présenter une hypothèse comme une certitude.

## Workaround

Si une configuration fiable est trouvée :

```text
browser:
flags:
launcher:
```

Documenter précisément pourquoi elle fonctionne.

## Product impact

Déterminer si :

```text
NOVA code issue
```

ou :

```text
environment issue
```

ou :

```text
undetermined
```

---

# 18. Validation finale

Si aucun code produit n'a été modifié :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Puis :

```bash
pnpm test:e2e
```

Si une modification strictement liée à l'infrastructure E2E est effectuée, vérifier que :

* elle ne modifie pas le renderer ;
* elle ne modifie pas la simulation ;
* elle reste documentée ;
* elle est reproductible.

---

# Definition of Done

Step 19.2 est terminé lorsque l'un des deux résultats suivants est obtenu.

## Résultat A — Browser fonctionnel

```text
WebGL hardware
      ↓
Three.js
      ↓
NOVA
      ↓
Playwright
      ↓
interactive application
```

et un smoke test réel fonctionne.

OU :

## Résultat B — Root cause isolée

Le problème reste présent mais son origine est suffisamment isolée pour pouvoir être traitée séparément.

Dans ce cas, documenter :

* ce qui fonctionne ;
* ce qui bloque ;
* où le blocage apparaît ;
* renderer WebGL observé ;
* navigateur concerné ;
* configuration testée ;
* prochaine action technique.

---

# Principe directeur

Ne pas "faire passer les tests".

Il faut obtenir une réponse à cette question :

> **Est-ce que NOVA fonctionne réellement dans un navigateur WebGL matériel, et si non, exactement à quel niveau cela casse-t-il ?**

Tant que cette réponse n'est pas connue, ne pas modifier le renderer NOVA sur hypothèse.
