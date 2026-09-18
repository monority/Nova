# NOVA — GPU E2E Validation Setup

## Objectif

Mettre en place dans le repository NOVA un **vrai pipeline E2E GPU sous Windows**, permettant de vérifier que le rendu Three.js/WebGL est exécuté avec l'accélération matérielle NVIDIA et non avec SwiftShader, llvmpipe ou un autre renderer logiciel.

Cette étape est **strictement une étape d'infrastructure et de validation**.

Ne développe aucun nouveau système de gameplay, d'économie, de population, de besoins, de pathfinding, de zones ou de contenu visuel complexe.

Le résultat attendu est un test reproductible permettant de distinguer clairement :

* WebGL disponible
* WebGL fonctionnel
* GPU détecté
* GPU NVIDIA réellement utilisé
* renderer logiciel détecté
* rendu NOVA réellement affiché dans Chromium
* screenshot GPU capturé
* absence d'erreurs navigateur

---

# 0. AUDIT OBLIGATOIRE AVANT MODIFICATION

Commence par inspecter complètement l'état actuel du repository.

Inspecte notamment :

* `package.json`
* scripts npm
* configuration Vite
* configuration TypeScript
* configuration Playwright si elle existe
* `e2e/`
* tests existants
* `src/`
* `index.html`
* renderer Three.js
* éventuels diagnostics WebGL existants
* scripts Windows `.ps1`, `.cmd`, `.bat`, `.mjs`
* documentation existante
* README
* roadmap
* fichiers liés à l'ancien diagnostic GPU s'ils existent.

Ne réimplémente pas quelque chose qui existe déjà.

Identifie précisément :

1. comment NOVA démarre actuellement ;
2. comment le serveur est lancé pour les E2E ;
3. comment Playwright est actuellement utilisé ;
4. comment le canvas Three.js est exposé ;
5. si un diagnostic WebGL existe déjà ;
6. si des hooks `window.__nova` existent ;
7. quels scripts E2E sont déjà présents ;
8. si le projet est actuellement exécuté depuis Windows, WSL ou les deux.

Avant toute modification, donne un court résumé de l'architecture constatée.

---

# 1. CONTRAINTE FONDAMENTALE : WINDOWS + VRAI GPU

Le test GPU doit être conçu pour être exécuté avec :

```text
Windows
↓
Node.js Windows
↓
Playwright Windows
↓
Chromium/Chrome Windows
↓
ANGLE
↓
NVIDIA GPU
↓
Three.js / WebGL
```

Ne considère PAS une exécution Chromium depuis WSL comme preuve du GPU matériel Windows.

Ne considère PAS :

```text
nvidia-smi
```

comme preuve que Chromium utilise le GPU.

`nvidia-smi` peut uniquement confirmer que le système voit le GPU.

La preuve doit venir du **renderer WebGL réellement utilisé par le navigateur**.

---

# 2. NE PAS CASSER LE TEST E2E EXISTANT

Conserve le test E2E fonctionnel existant.

S'il existe actuellement :

```text
npm run test:e2e
```

il doit continuer à fonctionner.

Ajoute un pipeline distinct, par exemple :

```text
npm run test:e2e:gpu
```

Le nom exact peut être adapté aux conventions existantes du repository.

Ne remplace pas silencieusement le test E2E normal par le test GPU.

Architecture souhaitée :

```text
test:e2e
    → validation fonctionnelle navigateur

test:e2e:gpu
    → validation fonctionnelle navigateur
    → validation WebGL
    → validation GPU NVIDIA
    → screenshots
```

---

# 3. PLAYWRIGHT WINDOWS

Détermine la meilleure manière de lancer Playwright depuis Windows dans le repository.

Le script GPU doit fonctionner avec Node.js Windows.

Ne dépends pas de :

* WSL ;
* Git Bash pour simuler Windows ;
* commandes Linux spécifiques ;
* chemins Linux ;
* Chromium WSL.

Si une commande doit être exécutée depuis Windows, documente-la clairement.

Le script doit pouvoir être lancé depuis PowerShell / terminal Windows.

Si le repository est situé sur un filesystem accessible depuis Windows, utilise les chemins Windows correctement.

---

# 4. DIAGNOSTIC WEBGL RÉEL

Implémente ou réutilise un diagnostic WebGL minimal et fiable.

Depuis le navigateur, récupère au minimum :

```js
gl.getParameter(gl.RENDERER)
gl.getParameter(gl.VENDOR)
gl.getParameter(gl.VERSION)
gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
```

Utilise également, si disponible :

```js
WEBGL_debug_renderer_info
```

pour récupérer :

```text
UNMASKED_VENDOR_WEBGL
UNMASKED_RENDERER_WEBGL
```

Le diagnostic doit retourner une structure claire, par exemple :

```ts
type WebGLDiagnostic = {
  available: boolean
  webglVersion: string | null
  vendor: string | null
  renderer: string | null
  unmaskedVendor: string | null
  unmaskedRenderer: string | null
  shadingLanguageVersion: string | null
}
```

Adapte évidemment cette structure à l'architecture existante plutôt que d'en créer une seconde si un diagnostic équivalent existe déjà.

---

# 5. CLASSIFICATION SOFTWARE / HARDWARE

Crée une classification déterministe du renderer.

Le test doit pouvoir identifier explicitement les renderers logiciels connus.

Au minimum, traite comme software / échec GPU les signatures telles que :

```text
SwiftShader
llvmpipe
Microsoft Basic Render Driver
Software Rasterizer
Software Renderer
```

La détection doit être insensible à la casse.

Ne fais pas une simple recherche de :

```text
"NVIDIA"
```

comme seule preuve.

Le diagnostic doit examiner le renderer complet.

---

# 6. EXIGENCE NVIDIA

Pour le test GPU NOVA, le test doit vérifier que le renderer WebGL correspond réellement à un GPU NVIDIA.

Le test doit produire des informations lisibles telles que :

```text
GPU validation
--------------
WebGL: WebGL2
Vendor: ...
Renderer: ...
Unmasked vendor: NVIDIA Corporation
Unmasked renderer: NVIDIA GeForce RTX ...
Software renderer: false
NVIDIA detected: true
```

Les valeurs exactes dépendent évidemment du navigateur, de la version de Chromium et du driver.

Ne hardcode PAS une chaîne exacte du type :

```text
NVIDIA GeForce RTX 3070 Ti
```

si cela rend le test fragile.

L'objectif est de vérifier la famille NVIDIA / hardware acceleration, pas une seule dénomination exacte.

---

# 7. ÉCHEC EXPLICITE

Le test GPU doit échouer avec un exit code non nul si :

* WebGL n'est pas disponible ;
* WebGL2 n'est pas disponible alors que NOVA l'exige ;
* aucun renderer n'est récupérable ;
* renderer logiciel détecté ;
* NVIDIA absente du renderer attendu ;
* canvas NOVA absent ;
* renderer Three.js non initialisé ;
* page error ;
* erreur console ;
* screenshot impossible.

Exemple :

```text
GPU E2E FAILED

Reason:
Software renderer detected.

Renderer:
ANGLE (Google, Vulkan 1.3.0 SwiftShader ...)
```

Ne transforme jamais un échec GPU en warning pour obtenir un faux `PASS`.

---

# 8. THREE.JS DOIT ÊTRE VÉRIFIÉ AUSSI

Ne te limite pas à créer un canvas WebGL indépendant.

Le test doit vérifier le **renderer réellement utilisé par NOVA**.

Vérifie autant que possible :

```text
NOVA loaded
↓
Three.js initialized
↓
WebGLRenderer active
↓
canvas present
↓
WebGL context available
↓
GPU renderer identified
```

Si NOVA expose déjà des informations via :

```text
window.__nova
```

réutilise cette infrastructure.

Sinon, ajoute uniquement une API de diagnostic de présentation minimale.

Ne mélange jamais ce diagnostic avec le domaine de simulation.

---

# 9. TEST DE RENDU RÉEL

Après avoir confirmé le GPU :

1. ouvrir NOVA dans Chromium ;
2. attendre le chargement ;
3. attendre l'initialisation Three.js ;
4. vérifier le canvas ;
5. vérifier WebGL2 ;
6. récupérer le diagnostic GPU ;
7. vérifier que le renderer n'est pas software ;
8. vérifier NVIDIA ;
9. capturer un screenshot.

Le screenshot doit être celui de la **page NOVA réellement rendue par Three.js**, pas simplement une page de diagnostic.

---

# 10. TEST INTERACTIF

Réutilise le scénario fonctionnel existant si possible.

Le test GPU doit au minimum :

```text
LOAD
↓
NOVA ready
↓
GPU diagnostic PASS
↓
canvas PASS
↓
interaction réelle
↓
simulation update
↓
render update
↓
screenshot
```

Si le test E2E actuel sait déjà :

```text
hover
click
STEP
STEP
```

réutilise ce scénario plutôt que de le dupliquer inutilement.

Le but est de prouver que :

```text
simulation + interaction + rendering + GPU
```

fonctionnent ensemble dans le vrai navigateur.

---

# 11. SCREENSHOT

Capture au minimum :

```text
artifacts/gpu/
```

avec un nom déterministe, par exemple :

```text
gpu-initial.png
gpu-final.png
```

ou selon les conventions existantes.

Les screenshots doivent être conservés en cas de succès afin de permettre une inspection manuelle.

Si possible, capture également un screenshot en cas d'échec.

Ne prétends pas avoir effectué une analyse pixel-perfect si aucune comparaison pixel-perfect n'est réellement implémentée.

---

# 12. CONSOLE / PAGE ERRORS

Le test doit écouter :

```text
console
pageerror
```

et échouer sur les erreurs pertinentes.

Rapporte clairement :

```text
Console errors: 0
Page errors: 0
```

ou les erreurs réellement rencontrées.

Ne masque pas les erreurs avec des `catch` silencieux.

---

# 13. DIAGNOSTIC DES FLAGS CHROMIUM

Inspecte les possibilités réelles de Chromium/Playwright pour l'accélération GPU.

Ne suppose pas qu'un flag arbitraire active forcément le GPU.

Si tu utilises des arguments Chromium, documente pourquoi ils sont utilisés.

Évite notamment de considérer automatiquement :

```text
--use-gl=swiftshader
```

comme une solution : ce serait précisément le renderer que nous voulons détecter comme échec.

Si des flags sont nécessaires pour forcer ou autoriser l'accélération matérielle, vérifie expérimentalement leur effet avec le renderer WebGL.

Le renderer WebGL final reste l'autorité du test.

---

# 14. HEADLESS VS HEADFUL

Teste d'abord les possibilités réelles de l'environnement.

Détermine si le GPU fonctionne :

```text
headless
```

avec la version actuelle de Chromium/Playwright.

Si le GPU matériel n'est pas utilisable en headless dans l'environnement, mets en place un mode :

```text
headed
```

pour le test GPU.

Le test ne doit pas déclarer :

```text
GPU PASS
```

uniquement parce que Chromium démarre.

Le renderer retourné doit confirmer le GPU.

Documente le mode réellement utilisé.

---

# 15. DIAGNOSTIC SYSTÈME OPTIONNEL

Si pertinent, ajoute un diagnostic système avant le lancement du navigateur.

Sous Windows, tu peux éventuellement vérifier que le système possède un GPU NVIDIA.

Mais cette information doit être présentée comme :

```text
System GPU detected: YES
WebGL GPU detected: YES
```

et non comme une preuve unique.

La preuve principale reste :

```text
WebGL unmasked renderer
```

du navigateur.

---

# 16. RAPPORT STRUCTURÉ

À la fin du script, imprime un rapport lisible.

Exemple :

```text
========================================
 NOVA GPU E2E VALIDATION
========================================

Environment
OS: Windows
Browser: Chromium
Mode: headed/headless
Playwright: ...

WebGL
WebGL: PASS
Version: WebGL 2.0
Vendor: ...
Renderer: ...
Unmasked Vendor: NVIDIA Corporation
Unmasked Renderer: NVIDIA GeForce RTX ...
Software Renderer: NO
NVIDIA GPU: YES

NOVA
Three.js: PASS
Canvas: PASS
Scene: PASS

Interaction
Mouse interaction: PASS
Simulation update: PASS
Render update: PASS

Diagnostics
Console errors: 0
Page errors: 0

Screenshots
Initial: PASS
Final: PASS

========================================
 GPU E2E: PASS
========================================
```

Les valeurs doivent évidemment être réelles.

---

# 17. SCRIPT REPRODUCTIBLE

Ajoute un script unique permettant de lancer le test.

Par exemple :

```text
npm run test:e2e:gpu
```

Il doit :

1. démarrer le serveur nécessaire ;
2. lancer Playwright Windows ;
3. ouvrir NOVA ;
4. effectuer le diagnostic ;
5. effectuer le scénario ;
6. prendre les screenshots ;
7. afficher le rapport ;
8. retourner exit code `0` en cas de succès ;
9. retourner exit code non nul en cas d'échec ;
10. fermer proprement le serveur et le navigateur.

Évite les étapes manuelles cachées.

---

# 18. NE PAS MODIFIER LE DOMÉNE

Cette étape doit respecter strictement la séparation actuelle :

```text
domain
    ↓
application
    ↓
RenderSnapshot
    ↓
renderer
    ↓
browser
```

Le diagnostic GPU appartient à la couche présentation / E2E.

Il ne doit introduire :

```text
Three.js
DOM
window
document
WebGL
browser
Math.random
Date.now
```

dans le domaine de simulation.

---

# 19. TESTS EXISTANTS

Après implementation, exécute au minimum :

```text
unit tests
integration tests
lint
typecheck
build
architecture checks
existing E2E
GPU E2E
```

Ne supprime aucun test existant.

Ne diminue pas la couverture pour faire passer le GPU test.

---

# 20. CRITÈRES DE SUCCÈS

L'étape est `COMPLETE` uniquement si :

### Code

* [ ] infrastructure GPU ajoutée proprement ;
* [ ] scripts reproductibles ;
* [ ] aucune régression ;
* [ ] architecture respectée.

### Browser

* [ ] vrai Chromium/Playwright Windows utilisé ;
* [ ] page NOVA réellement ouverte ;
* [ ] canvas réellement présent ;
* [ ] Three.js réellement initialisé ;
* [ ] WebGL2 réellement actif.

### GPU

* [ ] renderer WebGL récupéré ;
* [ ] renderer software explicitement exclu ;
* [ ] NVIDIA réellement identifiée ;
* [ ] GPU confirmé par le navigateur et non seulement par `nvidia-smi`.

### E2E

* [ ] interaction réelle ;
* [ ] simulation mise à jour ;
* [ ] rendu mis à jour ;
* [ ] screenshots capturés ;
* [ ] console errors vérifiées ;
* [ ] page errors vérifiées.

### Quality

* [ ] tests existants PASS ;
* [ ] lint PASS ;
* [ ] typecheck PASS ;
* [ ] build PASS ;
* [ ] GPU E2E PASS.

---

# 21. STATUTS HONNÊTES

Utilise exactement l'un de ces statuts :

## COMPLETE

Uniquement si le GPU NVIDIA a été réellement confirmé par le renderer WebGL du navigateur et que l'E2E complet passe.

## PARTIAL

Si le test fonctionnel navigateur passe mais que le GPU matériel ne peut pas être confirmé.

Dans ce cas, indique précisément pourquoi.

Exemple :

```text
PARTIAL

Chromium E2E: PASS
WebGL: PASS
Three.js: PASS
Renderer: SwiftShader
NVIDIA GPU: NOT CONFIRMED

Therefore GPU validation is NOT COMPLETE.
```

## BLOCKED

Si le test ne peut pas être exécuté dans l'environnement actuel.

Indique exactement la dépendance manquante.

---

# 22. INTERDICTIONS IMPORTANTES

Ne fais PAS :

* installer une nouvelle stack GPU inutile ;
* modifier WSL pour contourner le problème sans nécessité ;
* réécrire le renderer NOVA ;
* modifier le domaine de simulation ;
* ajouter des fonctionnalités gameplay ;
* considérer `nvidia-smi` comme preuve suffisante ;
* considérer WebGL PASS comme GPU PASS ;
* considérer Chromium démarré comme GPU PASS ;
* masquer SwiftShader ;
* ignorer les erreurs console ;
* supprimer les tests existants ;
* prétendre avoir vu un screenshot si aucun screenshot n'a réellement été capturé ;
* prétendre avoir utilisé le GPU si le renderer indique SwiftShader/software ;
* déclarer `COMPLETE` lorsque NVIDIA n'a pas été confirmée.

---

# 23. RAPPORT FINAL OBLIGATOIRE

À la fin, fournis :

## Implementation

Liste précise des fichiers créés/modifiés.

## Architecture

Explique où se situe le diagnostic GPU.

## Browser capability

Indique réellement :

```text
Navigation
DOM
Mouse
Click
Keyboard
Screenshot
Console
WebGL
GPU
```

avec PASS / NOT TESTED / BLOCKED.

## GPU evidence

Donne les valeurs réellement retournées :

```text
Vendor:
Renderer:
Unmasked Vendor:
Unmasked Renderer:
WebGL Version:
```

## Tests

Donne les résultats exacts :

```text
Unit:
Integration:
E2E:
GPU E2E:
Lint:
Typecheck:
Build:
```

## Screenshot

Indique les chemins exacts des screenshots produits.

## Limitations

Liste ce qui n'a pas pu être vérifié.

## Final status

Choisis uniquement :

```text
COMPLETE
PARTIAL
BLOCKED
```

Ne déduis jamais le statut à partir de ce qui était attendu.

Le statut doit refléter uniquement ce qui a réellement été exécuté et observé.

