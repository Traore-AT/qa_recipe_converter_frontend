# Audit frontend QA Recipe Converter

> **Phase 1 uniquement - audit realise le 19/09/2026**
> Perimetre : `qa_recipe_converter_frontend/`. Le backend `qa_recipe_converter/` a ete lu comme source de verite et n'a pas ete modifie.

## 1. Synthese executive

Le frontend dispose deja de fondations correctes : React 19 + TypeScript, Vite, React Router, TanStack Query 5, Axios centralise, gestion de session/CSRF, code splitting partiel, ErrorBoundary, theme persiste et services API par domaine. Il ne faut donc pas repartir de zero.

L'etat actuel n'est toutefois pas livrable : le build TypeScript echoue sur `TestSuitesPage.tsx`, le rendu de cette page leve une `ReferenceError`, ESLint retourne 27 erreurs et les tests Vitest echouent avec 7 erreurs non gerees. Plusieurs controles d'interface restent egalement decoratifs ou incomplets.

### Validation de reference

| Commande | Resultat observe |
|---|---|
| `npm run build` | Echec : 8 erreurs TypeScript dans `src/pages/TestSuitesPage.tsx` |
| `npm run lint` | Echec : 27 erreurs, dont `no-explicit-any`, hooks, `no-empty` et variables inutilisees |
| `npm test -- --reporter=dot` | Echec : erreurs dans `TestSuitesPage.test.tsx`, 7 erreurs non gerees ; `successRate is not defined` |

Les validations ont ete lancees depuis le dossier frontend. Les compteurs peuvent evoluer apres les modifications deja presentes dans l'arbre de travail.

## 2. Cartographie backend

### 2.1 Configuration transversale

- Authentification DRF : `SessionAuthentication` uniquement. Les mutations exigent un cookie de session et le header CSRF ; aucune authentification JWT/token n'est configuree.
- CORS : `http://localhost:3000`, `http://127.0.0.1:3000`, `https://localhost`, avec credentials autorises.
- Pagination : `PageNumberPagination`, `PAGE_SIZE=20`, reponse `count`, `next`, `previous`, `results`.
- Taille upload globale : 50 MB (`MAX_UPLOAD_SIZE_MB`, `DATA_UPLOAD_MAX_MEMORY_SIZE`, `FILE_UPLOAD_MAX_MEMORY_SIZE`). Extensions Word : `.doc`, `.docx`; template : `.xlsx`.
- Erreurs non homogenes : `{"error": "..."}` dans plusieurs vues metier, `{"detail": "..."}` pour certaines erreurs DRF, ou dictionnaire de champs pour les erreurs de serializer.
- Fichiers binaires : Excel, CSV, ZIP Gherkin/Cypress et PDF sont renvoyes en flux avec `Content-Disposition`.
- Routes hors API : `/teams/` expose encore les vues Django templates ; `/media/` sert les fichiers media ; `/api/schema/`, `/api/docs/` et `/api/redoc/` exposent la documentation.

### 2.2 Inventaire exhaustif des endpoints

Les URLs ci-dessous sont relatives a `/api/`. Les reponses paginees suivent le format DRF indique ci-dessus.

#### API de conversion (`apps/api/urls.py`)

| Methode | URL | Payload / parametres | Reponse | Erreurs principales | Auth |
|---|---|---|---|---|---|
| GET | `health/` | Aucun | `{status, service}` | 5xx possible | Non |
| GET | `csrf/` | Aucun | `{detail}`, cookie `csrftoken` | 5xx | Non |
| POST | `upload/` | multipart `word_file`; optionnels `excel_template`, `company_logo`, `company_name`, `excel_filename`, `project` | 201 `ConversionJobSerializer` avec `use_cases[]` | 400 validation/fichier/.doc, 422 aucun tableau, 500 traitement | Non obligatoire |
| GET | `jobs/` | `page` optionnel | Page de `ConversionJobListSerializer`; vide si anonyme | 5xx | Liste filtree par utilisateur connecte |
| GET | `jobs/<uuid:job_id>/` | Aucun | `ConversionJobSerializer` | 404 | Non |
| DELETE | `jobs/<uuid:job_id>/` | Aucun | 204 | 403/404 | Oui selon proprietaire/admin |
| PATCH | `jobs/<job_id>/use-cases/<uc_id>/` | Champs partiels de l'UC : texte, description, preconditions, steps, expected/observed results, `is_automated`, `status` | `ExtractedUseCaseSerializer` | 400/404 | Non |
| GET | `jobs/<job_id>/generate/` | Aucun | Flux `.xlsx` | 404 | Non |
| GET | `jobs/<job_id>/gherkin/` | `mode=gherkin` ou `cypress` | Flux `.zip` | 404 | Non |
| POST | `jobs/<job_id>/save/` | `company_name?`, `excel_filename?`, `use_cases[]` | `{success, automated_count}` | 404, erreurs d'UC | Non |
| POST | `jobs/<job_id>/vscode/` | Aucun | `{success, vscode_opened, project_path, automated_count, message}` | 404/erreur execution | Non |
| POST | `jobs/<job_id>/bulk-status/` | `{uc_ids[], status}` | `{updated, status}` | 400/404 | Non |
| GET | `files/search/` | `q` minimum 2 caracteres, `ext[]` | `{results, count}` ou `{results, error}` | 500 | Non |
| GET | `jobs/<job_id>/csv/` | Aucun | Flux `.csv` | 404 | Non |

#### Authentification, equipes et projets (`apps/teams/urls.py`)

| Methode | URL | Payload / reponse | Auth |
|---|---|---|---|
| POST | `auth/register/` | `{username,email,password,first_name?,last_name?}` -> utilisateur public, 201 | Non |
| POST | `auth/login/` | `{username ou email,password}` -> utilisateur public | Non |
| POST | `auth/logout/` | Aucun -> `{detail}` | Oui |
| GET | `auth/me/` | Aucun -> utilisateur public | Oui |
| POST | `auth/password-reset/` | `{email}` | Non |
| POST | `auth/password-reset/confirm/` | `{uidb64,token,password,password_confirm}` | Non |
| GET/POST | `teams/` | POST multipart `{name,description,avatar?}` -> equipe ou page | Oui pour POST |
| GET/PATCH/DELETE | `teams/<slug>/` | PATCH selon serializer equipe -> equipe | Membre selon action |
| GET | `teams/<slug>/members/` | Aucun -> page de membres | Membre |
| POST | `teams/<slug>/members/` | `{email,role}` -> invitation | Admin |
| PATCH/DELETE | `teams/<slug>/members/<user_id>/` | PATCH `{role}` | Admin/owner |
| GET | `teams/invitations/<token>/` | Aucun -> invitation | Non |
| POST | `teams/invitations/<token>/{accept,reject}/` | Aucun | Selon vue |
| GET | `teams/<slug>/dashboard/` | Aucun -> `{team,stats,projects,members,recent_activity}` | Membre |
| GET/POST | `teams/<slug>/projects/` | POST `{name,description,icon,color,visibility,avatar?}` -> page/projet | Membre |
| GET/PATCH/DELETE | `teams/<slug>/projects/<project_slug>/` | PATCH champs projet -> projet | Membre selon action |
| POST | `.../avatar/` | multipart image, 2 MB max | Gestionnaire |
| GET/POST/PATCH/DELETE | `.../members/` et `.../members/<user_id>/` | Membres de projet | Gestionnaire |
| GET | `.../progress/` | Aucun -> progression projet | Membre |
| POST | `.../assign-members/` | `{members:[{user_id,role}]}` | Admin equipe |
| GET | `teams/<slug>/reports/{daily-scrum,weekly}/` | Aucun -> PDF | Membre |

#### Gestion QA (`apps/qamanagement/urls.py`)

| Methode | URL | Payload / reponse | Auth |
|---|---|---|---|
| GET/POST | `teams/<slug>/projects/<project_slug>/sprints/` | POST sprint ; page de sprints | Membre |
| GET/PATCH/DELETE | `.../sprints/<sprint_id>/` | Sprint | Membre |
| GET | `.../sprints/<sprint_id>/board/` | `{sprint,columns,stats}` | Membre |
| GET/POST/DELETE | `.../assignments/` et `.../<assignment_id>/` | `{use_case_ids[],sprint_id?,user_id}` ; suppression | Membre |
| GET | `.../unassigned-ucs/` | Aucun -> page d'UC | Membre |
| PATCH | `.../use-cases/<uc_id>/status/` | `{status,observed_results?}` | Membre |
| GET/POST | `.../use-cases/<uc_id>/comments/` | POST `{content}` ; page | Membre |
| GET/POST/PATCH/DELETE | `.../defects/` et `.../<defect_id>/` | Defect ; multipart si piece jointe | Membre |
| GET | `.../defects/stats/` | Statistiques de defauts | Membre |
| GET/POST/PATCH/DELETE | `teams/<slug>/weekly-reports/` et `.../current/`, `.../<report_id>/` | Champs de rapport hebdomadaire | Membre |
| GET | `.../member-progress/` | Page de `MemberProgressSerializer` | Membre |
| GET/PATCH/POST | `notifications/`, `.../<id>/read/`, `mark-all-read/` | Notifications / marquage lu | Connecte |
| GET | `teams/<slug>/activity/` et `.../projects/<project_slug>/activity/` | Page `ActivityLogSerializer` | Membre |
| GET | `.../assignments/<id>/detail/` | Affectation, UC, captures, commentaires | Membre |
| GET/POST/DELETE | `.../assignments/<id>/screenshots/` et `.../<sid>/` | multipart `{image,caption}` | Membre |
| GET | `.../sprints/<id>/export/csv/` | Aucun -> flux CSV | Membre |

## 3. Cartographie frontend

- Entree : `src/main.tsx`; composition globale dans `src/App.tsx`.
- Routing : React Router 7 ; routes publiques de conversion, apercu, recettes et suites ; routes equipe/projet protegees par `ProtectedRoute`.
- Etat serveur : TanStack Query 5, mais cles et invalidations ne sont pas uniformes.
- HTTP : `src/api/client.ts` est le client Axios unique ; `src/api/auth.ts`, `conversion.ts` et `teams.ts` regroupent les appels par domaine.
- Etat transverse : `AuthContext`, `ThemeContext`, `SidebarContext`.
- UI : layout, sidebar/topbar, composants `Button`, `Input`, `Card`, `Badge`, `StatusPill`, `Toggle`, `Modal`, `ConfirmDialog`, `Pagination`.
- Pages : authentification, dashboard, conversion/apercu, equipes/projets et suivi QA.

### Appels reseau identifies

Tous les appels applicatifs passent par `src/api/client.ts`; aucun `fetch` direct n'a ete trouve dans `src/`. Les modules ciblent les routes `auth/*`, `csrf/`, `upload/`, `jobs/*`, `files/search/`, `teams/*`, `sprints/*`, `assignments/*`, `defects/*`, `weekly-reports/*`, `member-progress`, `notifications/*`, `activity/*` et `screenshots/*` documentees ci-dessus.

Endpoints definis mais non consommes par une page identifiee : `files/search/`, `notifications/*` et les journaux `activity/*`. Ils sont presents dans les services mais aucune UI visible ne les exploite.

## 4. Findings par severite

### Bloquant

**B1 - Le build et le rendu de la page Suites sont casses.**
References : `src/pages/TestSuitesPage.tsx:40-50`, `:153-162`, `:193-236`.

- Le calcul local produit `conversionRate` et chaque groupe produit `converted`, mais le JSX utilise encore `successRate`, `totalPassed` et `suite.passed`.
- TypeScript signale 8 erreurs ; au runtime `successRate is not defined` provoque des erreurs non gerees dans Vitest et un ecran inutilisable pour les suites non vides.
- `isError`, `error` et `refetch` sont declares mais non rendus ; une erreur API n'a donc pas d'etat UI visible.
- Correction proposee en Phase 2 : aligner le vocabulaire sur la conversion (`conversionRate`, `converted`) et afficher un etat d'erreur/reessai. Ne pas reintroduire la notion de test passe : le backend renvoie le statut du job de conversion, pas un resultat d'execution QA.

**B2 - Les validations qualite sont rouges.**
References : `package.json`, fichiers signales par ESLint et `src/pages/TestSuitesPage.test.tsx`.

- `npm run build` echoue ; `npm run lint` echoue avec 27 erreurs ; Vitest rapporte des erreurs non gerees.
- Tant que B1 n'est pas corrige, le nombre de tests passants ne constitue pas un indicateur fiable.
- Correction proposee : reparer B1, puis traiter les erreurs ESLint par tranche et relancer les tests sans modifier le backend.

### Majeur

**M1 - La pagination backend n'est pas refletee uniformement dans l'UI.**
References : `src/api/conversion.ts:37-38`, `src/pages/RecipesPage.tsx`, `src/pages/ConvertPage.tsx`, `src/pages/TestSuitesPage.tsx`.

Le backend limite les listes a 20 elements. Le service accepte maintenant `page`, mais les pages inspectees demandent uniquement la page 1 et n'affichent pas de pagination complete. Une partie des recettes peut donc disparaitre silencieusement.

**M2 - Les erreurs HTTP et les contrats d'erreur DRF restent partiellement non uniformes.**
References : `src/api/client.ts`, `src/lib/errors.ts`, pages de formulaires et pages de listes.

Le timeout, CSRF, redirection 401 et base URL configurable sont deja presents dans `client.ts`, mais le client ne fournit pas un mapping central complet pour `error`, `detail` et erreurs par champ. Plusieurs pages conservent des captures `any`, des messages locaux et des etats d'erreur incomplets. Correction proposee : typer une erreur API commune et l'exploiter partout.

**M3 - Parcours de conversion incomplet sur les etats de traitement.**
References : `src/pages/ConvertPage.tsx:55-107`, `src/api/conversion.ts:7-35`.

La taille maximale est controlee cote client et la progression Axios est exposee, ce qui est positif. En revanche, le MIME reel n'est pas verifie de maniere fiable, le template `.xlsx` et le logo ne disposent pas de validations client equivalentes, et le traitement backend est synchrone : l'UI ne modelise pas distinctement upload, conversion, echec recuperable et resultat termine. Correction proposee : validation commune, etats explicites, reprise et message `.doc` coherent avec la dependance LibreOffice backend.

**M4 - Plusieurs controles restent decoratifs ou partiellement branches.**
References : `src/components/layout/Topbar.tsx`, `src/pages/SettingsPage.tsx`.

La recherche du Topbar est maintenant soumise par formulaire, mais son comportement doit etre verifie comme recherche metier reelle et non comme navigation implicite. Les parametres sont explicitement en lecture seule car aucun endpoint backend de modification du profil n'existe ; cette decision est saine mais doit etre appliquee a tous les controles. Les notifications backend ne sont pas exposees dans la navigation.

**M5 - Accessibilite des interactions complexes insuffisante.**
References : modales dans `src/pages/RecipesPage.tsx`, `PreviewPage.tsx`, `SprintBoardPage.tsx`, `TeamDashboardPage.tsx`; controles dans `src/pages/ConvertPage.tsx`.

Les modales ne sont pas toutes garanties avec `role="dialog"`, `aria-modal`, focus initial, retour du focus et fermeture par `Escape`. Plusieurs boutons icon-only et zones d'action doivent etre verifies avec un label accessible et une cible tactile minimale de 44 px. Les labels de formulaire ne sont pas toujours associes a leur champ.

**M6 - Caches React Query redondants et invalidations incompletes.**
References : pages utilisant `['jobs']`, `['jobs','list',1]`, `['recipes']` et `['test-suites']`.

Le meme endpoint jobs peut alimenter plusieurs caches. Apres edition ou suppression, une vue peut afficher une version obsolete. Correction proposee : cles de requete metier centralisees et invalidation coordonnee.

### Mineur

**m1 - Contrat de style pas totalement applique.**
References : `src/pages/ConvertPage.tsx`, `src/pages/TestSuitesPage.tsx`, `src/index.css`.

Des couleurs hexadecimales, gradients, styles inline, emojis et noms de classes hors tokens coexistent avec le design system. `font-sans` utilise Inter mais aucune importation de police n'a ete constatee ; le navigateur peut retomber sur system-ui. Le fichier CSS contient aussi des utilitaires maison et plusieurs animations globales, ce qui augmente le risque de styles involontaires.

**m2 - Langue et vocabulaire a harmoniser.**
References : `src/components/layout/Sidebar.tsx`, `Topbar.tsx`, pages et attributs `title`/`aria-label`.

La navigation principale est en francais, mais des libelles anglais ou mixtes et des termes techniques subsistent. Correction proposee : dictionnaire de libelles central et audit des textes visibles et accessibles.

**m3 - Showcase et endpoints non utilises.**
References : `src/App.tsx` route `/components`, `src/api/conversion.ts`, `src/api/teams.ts`.

Le showcase est limite au mode developpement dans `App.tsx`, ce qui est correct ; il faut conserver cette garantie. Les services `searchFiles`, notifications et activity restent du code mort tant qu'une page ne les consomme pas.

**m4 - Quelques risques de maintenance.**
References : erreurs ESLint `no-explicit-any`, `no-empty`, `react-hooks/set-state-in-effect`.

Les types faibles et les effets qui synchronisent directement l'etat rendent les regressions plus probables. Ils doivent etre traites apres la remise en etat du build, sans refactor global premature.

### Amelioration

- Ajouter une bibliotheque commune pour `Skeleton`, `EmptyState`, `Toast`, `FileDropzone`, `Select`, `Table` et les etats d'erreur ; plusieurs equivalents sont encore codes dans les pages.
- Exposer les notifications et l'activite si ces fonctionnalites font partie du produit cible.
- Ajouter une pagination visible pour toutes les listes DRF et un filtre debounce si le volume augmente.
- Mesurer Lighthouse apres correction et documenter les seuils reels ; aucune mesure Lighthouse n'a ete produite durant cet audit.
- Virtualiser les longues tables uniquement lorsque le volume depasse effectivement 100 lignes ; la pagination a 20 rend cette optimisation prematuree aujourd'hui.

## 5. Audit UI/UX

| Domaine | Constat | Priorite |
|---|---|---|
| Hierarchie | Tokens typographiques et surfaces sont presents dans `index.css`; B1 rend toutefois la page Suites inutilisable et plusieurs pages melangent encore des styles inline. | Bloquant/Majeur |
| Palette/contraste | Palette semantique claire/sombre disponible ; les couleurs arbitraires et overlays inline doivent etre controles avec un contraste WCAG AA reel. | Majeur |
| Navigation | Sidebar responsive et routes protegees presentes ; recherche, notifications et parcours anonyme des recettes restent a clarifier. | Majeur |
| Etats | Loading souvent present ; erreurs, empty states et reprise ne sont pas uniformes, notamment Suites et listes paginees. | Majeur |
| Interactions | Hover/focus partiels ; modales, boutons icon-only et zones tactiles doivent etre audites au clavier et au tactile. | Majeur |
| Responsive | Layout mobile-first visible dans les composants ; les tableaux et zones d'aperçu doivent etre testes a 320 px, 768 px et 1920 px. | Mineur/Majeur |
| Parcours principal | Upload Word -> apercu -> export est branche sur les vrais endpoints ; validation des pieces jointes, feedback de traitement et gestion d'erreur doivent etre uniformises. | Majeur |
| Donnees de production | Aucun mock de production identifie ; les constantes d'interface et calculs de presentation ne doivent pas etre confondus avec des donnees backend. | A surveiller |

## 6. Ecarts frontend/backend a arbitrer

| ID | Ecart | Impact | Decision demandee |
|---|---|---|---|
| E1 | `GET /jobs/` est vide pour un utilisateur anonyme, alors que `/recipes` et `/suites` sont publiques. | Ecran vide potentiellement surprenant. | Proteger ces routes ou afficher un CTA de connexion explicite. |
| E2 | `TeamSerializer` n'expose pas `projects_count`; le dashboard ne doit pas le lire comme champ contractuel. | Compteur projets non garanti. | Calcul frontend depuis une source complete ou evolution backend ulterieure, apres validation. |
| E3 | Aucun `PATCH /auth/me/` ni avatar utilisateur. | Parametres non modifiables. | Conserver une page lecture seule ou valider une evolution backend. |
| E4 | Erreurs backend heterogenes (`error`, `detail`, erreurs par champ). | Messages et tests dupliques. | Mapper cote frontend maintenant ; aucune modification backend sans validation. |
| E5 | React et vues Django templates coexistent sous `/teams/`; nginx route notamment les invitations templates. | Deux experiences UI concurrentes. | Choisir l'UI de reference avant de refondre les invitations. |
| E6 | Endpoints notifications, activity et file search presents mais sans UI identifiee. | Fonctionnalites backend invisibles. | Confirmer le perimetre produit ou retirer ces services frontend plus tard. |

## 7. Corrections proposees pour la Phase 2

1. Corriger `TestSuitesPage.tsx`, ses etats d'erreur et ses tests ; retablir `npm run build`.
2. Normaliser les types d'erreur et supprimer les `any` du chemin critique.
3. Unifier les query keys jobs, implementer la pagination visible et invalider les listes apres mutation.
4. Finaliser validation upload/template/logo, progression et messages de reprise.
5. Auditer modales, labels, focus clavier et zones tactiles.
6. Harmoniser tokens, libelles francais, toasts et composants d'etat sans refonte inutile.

## 8. Decisions necessaires avant Phase 2

1. Les pages `/recipes` et `/suites` doivent-elles etre reservees aux utilisateurs connectes ?
2. `SettingsPage` reste-t-elle volontairement en lecture seule tant qu'aucun endpoint profil n'existe ?
3. La recherche du Topbar doit-elle rechercher les jobs uniquement, ou les jobs et projets ?
4. Les notifications et journaux d'activite sont-ils dans le perimetre produit de cette refonte ?
5. Quelle UI doit rester de reference pour les invitations : React ou templates Django ?

## 9. Fichiers modifies pendant la Phase 1

- `AUDIT.md` : remplace par ce rapport verifie.
- Aucun fichier du backend n'a ete modifie.
- Aucun fichier frontend applicatif n'a ete modifie pendant cette phase.

**Fin de la Phase 1. La Phase 2 est volontairement en attente de validation.**

---

# Partie 2 — Suivi des Phases 2 à 4 (20/09/2026)

> Re-verification de l'arbre courant **avant** toute modification : les bloquants
> B1 (page Suites), B2 (erreurs ESLint) et B3 (tests) etaient deja corriges par les
> commits `458c1c5`, `e3f2a0c` et `fe577b3`. Le reste du plan a donc ete execute sur
> un socle sain, en iterations verifiees (build + lint + tests apres chaque lot).

## 10. Mesures avant / apres cette iteration

| Controle | Avant | Apres |
|---|---|---|
| `npm run build` | OK | OK (aucune erreur, aucun avertissement) |
| `npm run lint` | 0 erreur | 0 erreur |
| `npm test` | 30 fichiers / 298 tests OK, avertissement `No queryFn` repete en console | 30 fichiers / 298 tests OK, **0 avertissement console** |
| CSS produit | 85,62 kB (gzip 13,88 kB) | **79,45 kB (gzip 13,13 kB)** |
| JS initial | 304,10 kB (gzip 87,22 kB) | 311,04 kB (gzip 89,13 kB) + chunk partage `cn` 124,41 kB (gzip 43,68 kB) |
| Boutons `<button>` sans `type`/label | nombreux | composant `Button` unique, zones tactiles >= 44 px (sauf `size="sm"` a 36 px) |

Statut des findings de la Partie 1 : **B1, B2, B3** deja resolus ; **M1, M2, M3, M6** traites ;
**M4, M5** traites partiellement (voir §13) ; **m1, m4** traites ; **m2, m3** a arbitrer.

## 11. Phase 2 — Corrections et couche API

### 11.1 Client HTTP unique (`src/api/client.ts`)

- Base URL toujours issue de `VITE_API_URL` (defaut `/api`), `withCredentials`, `Accept: application/json`, timeout 30 s (120 s sur l'upload Word).
- Intercepteur requete : injection du jeton CSRF sur toutes les mutations.
- Intercepteur reponse : redirection unique vers `/login` sur 401 (hors routes d'authentification).
- **Nouveau** : `extractApiError()` normalise toutes les formes d'erreur backend
  (`{detail}`, `{error}`, erreurs par champ, erreur reseau, timeout, annulation) en
  `ApiErrorInfo { kind, status, detail, fieldErrors, raw }`, avec messages francais
  par code HTTP (400/401/403/404/409/413/415/422/429/5xx).

### 11.2 Helpers d'erreur (`src/lib/errors.ts`)

`getApiErrorMessage` (message global), `getApiFieldErrors` (injection dans les
formulaires), `getApiErrorStatus`, `isRetryableApiError` (politique de retry).

### 11.3 Requetes serveur

- `src/lib/queryKeys.ts` : fabrique de cles centralisee + `invalidateJobs`,
  `invalidateProjectScope`, `defectsRoot`. **Toutes** les pages (14) utilisent
  desormais ces cles : plus de doublons `['jobs']` / `['jobs','list',1]`, une seule
  source de cache par ressource.
- `App.tsx` : `retry` conditionnel (reseau / 429 / 5xx uniquement), `gcTime` 5 min,
  `refetchOnReconnect`. Plus de retry sur les erreurs 4xx metier.
- Invalidation corrigee apres suppression/edition d'une recette et apres mutations
  de suivi QA (vue projet, defauts, progression, tableau de bord).
- Suppression d'une invalidation morte (`['board', slug]`) dans `SprintBoardPage`.

### 11.4 Donnees mockees

Aucune donnee mockee en production n'a ete trouvee : les valeurs en dur restantes
sont des constantes de presentation (icones, libelles, couleurs d'accent projet).
Les listes proviennent exclusivement de `conversionApi` / `teamsApi`.

### 11.5 Parcours de conversion

- Validation centralisee par `FileDropzone` : extension **et** taille (Word `.doc/.docx`
  50 Mo, template `.xlsx`, logo image), messages d'erreur explicites.
- Etats explicites : upload (progression reelle Axios), conversion (bouton `loading`),
  echec recuperable (alerte inline + toast avec le message DRF), succes (toast + navigation).
- Toasts branches sur : conversion Word, suppression de recette, export Excel,
  enregistrement des cas, mise a jour de statuts en masse.

## 12. Phase 3 — Design system et experience

### 12.1 Tokens

Tailwind v4 est utilise avec la configuration CSS-first : les tokens vivent dans
`src/index.css` (`@theme` + surcharge `html.dark`), equivalent du `tailwind.config.js`
des versions precedentes. Aucun fichier `tailwind.config.js` n'est donc requis.

- Palette semantique deja presente (`primary`, `success`, `warning`, `error`, `info`,
  surfaces, contours) : conservee.
- **Correction de contraste (WCAG AA) en mode sombre** : les fonds de badges/pastilles
  `*-container` etaient saturees avec texte blanc (ratio ~3,3:1). Ils deviennent des
  fonds sombres avec texte clair (`#064e3b`/`#a7f3d0`, `#78350f`/`#fde68a`,
  `#7f1d1d`/`#fecaca`, `#0c4a6e`/`#bae6fd`), ratio >= 7:1.
- Focus visible global : `:focus-visible { outline: 2px solid var(--color-primary) }`.
- Nettoyage CSS : suppression des animations mortes (`fadeInDown/Left/Right`, `shimmer`,
  `gradient-x`, `pulse-glow`, `countUp`, `stagger-*`) et surtout des **redefinitions
  des utilitaires Tailwind** (`animate-pulse`, `animate-spin`, `animate-bounce`) qui
  provoquaient des conflits de cascade. `card-hover`, `btn-hover`, `status-pill`,
  `table-row`, `badge`, `icon` (aucune utilisation) sont supprimes.

### 12.2 Bibliotheque de composants (`src/components/ui/`)

| Composant | Etat | Apport |
|---|---|---|
| `Button` | refondu | variantes via `cva`, `loading`, `aria-busy`, zone tactile 44 px |
| `Badge` | refondu | variantes semantiques, tokens (`*-container`) |
| `Card` / `StatCard` / `KpiCard` | refondu | `cn()`, rendu `article/section` possible |
| `Input` / `Textarea` / `Select` | refondu | `aria-invalid`, `aria-describedby`, `hint`, typage `SelectHTMLAttributes` corrige |
| `Toggle` | refondu | cible 44 px, anneau de focus, `id` explicite |
| `Modal` | refondu | piege de focus (Tab/Maj+Tab), verrou de scroll, Echap, restitution du focus, aucun vol de focus au re-render |
| `Pagination` | refondu | numeros de page + ellipses, `aria-current`, `aria-busy`, `isFetching` |
| `StatusPill` | refondu | statuts conversion / test / defaut en tokens |
| `Skeleton` | **nouveau** | `Skeleton`, `SkeletonCard`, `SkeletonList`, `SkeletonTable` |
| `Spinner` | **nouveau** | indicateur accessible pour actions ponctuelles |
| `EmptyState` | **nouveau** | etat vide uniforme (icone, titre, description, action) |
| `ErrorState` | **nouveau** | etat d'erreur recuperable + bouton « Reessayer » |
| `Toast` / `ToastProvider` / `useToast` | **nouveau** | file de toasts, `role=status/alert`, fermeture, actions, nettoyage des minuteurs |
| `FileDropzone` | **nouveau** | depot/parcours clavier+clic, validation type/taille, `aria-describedby` |
| `Table` (+ `THead`, `TBody`, `TR`, `TH`, `TD`, `DataCardList`) | **nouveau** | scroll horizontal controle, `caption` sr-only, variante cartes empilees |
| `PageHeader` | **nouveau** | en-tete de page homogene |
| `variants.ts` | **nouveau** | definitions `cva` hors composants (regle `react-refresh` respectee) |

Outillage : `clsx` + `tailwind-merge` (`cn()` dans `src/lib/cn.ts`) et
`class-variance-authority`. Aucun style duplique dans les composants.

### 12.3 Responsive et micro-interactions

- Grilles et tableaux : `overflow-x-auto` via `TableWrapper`, `DataCardList` pour le
  rendu cartes en mobile, `min-w-[36rem]` pour eviter les colonnes ecrasees.
- Cibles tactiles : boutons >= 44 px, liens d'action >= 44 px, interrupteur 44 px.
- Transitions 150-250 ms, `prefers-reduced-motion` conserve (animations et transitions
  ramenees a 0 ms).
- Squelettes de chargement a la place des spinners plein ecran (routes, listes, cartes).
- Toasts pour tous les retours d'action ; progression d'upload reelle conservee.

## 13. Phase 4 — Performance et qualite

- **Code splitting par route** deja en place (`React.lazy` + `Suspense`) : conserve,
  avec un fallback factorise (`RouteFallback` base sur `Skeleton`) partage par toutes
  les routes.
- **Memoisation ciblee** : `useMemo` sur la liste filtree des recettes (avec recherche
  differee) ; pas de `React.memo`/`useCallback` ajoute sans mesure — les composants
  lourds (board, apercu) restent inchanges pour eviter une regression de comportement.
- **Debounce** : `useDebouncedValue` (250 ms) sur la recherche des recettes (la
  recherche du Topbar navigue toujours immediatement, c'est une soumission explicite).
- **Virtualisation** : non implementee volontairement. La pagination DRF est fixee a
  20 elements par page ; le seuil de 100 lignes n'est jamais atteint. A reevaluer si la
  taille de page backend augmente.
- **Purge CSS** : Tailwind v4 (purge automatique via `@tailwindcss/vite`), verifiee par
  la baisse du CSS produit (85,62 kB -> 79,45 kB) apres suppression des utilitaires morts.
- **Bundle** : 311,04 kB (gzip 89,13 kB) pour l'entree + 124,41 kB (gzip 43,68 kB) pour
  le chunk partage `cn` (tailwind-merge). Piste d'optimisation si besoin : limiter
  `tailwind-merge` a une configuration `extendTailwindMerge` reduite.
- **Lighthouse** : non mesurable dans cet environnement (pas de navigateur headless
  disponible). A relancer cote poste : build + `npm run preview`, cibles Performance >= 90,
  Accessibilite >= 95, Bonnes pratiques >= 95. Les points bloquants connus ont ete
  corriges (contraste, focus, labels, `aria-*`, ordre de tabulation des modales).
- **Console** : 0 avertissement en test (l'avertissement TanStack `No queryFn` sur
  `['notifications']` est corrige) ; 0 erreur ESLint ; 0 erreur TypeScript.
- **Fuites memoire** : minuteurs des toasts nettoyes, `URL.revokeObjectURL` centralise
  dans `downloadBlob`, `useEffect` du Topbar et de la modale nettoyes, `FileDropzone`
  libere la valeur de l'input apres chaque selection.

## 14. Fichiers crees / modifies

**Crees** : `src/lib/cn.ts`, `src/lib/queryKeys.ts`, `src/lib/download.ts`,
`src/hooks/useDebouncedValue.ts`, `src/components/ui/variants.ts`,
`src/components/ui/Skeleton.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `ErrorState.tsx`,
`Toast.tsx`, `FileDropzone.tsx`, `Table.tsx`, `PageHeader.tsx`.

**Modifies** : `src/api/client.ts`, `src/lib/errors.ts`, `src/index.css`, `src/App.tsx`,
`src/components/ui/{Button,Badge,Card,Input,Toggle,Modal,Pagination,StatusPill}.tsx`,
`src/components/ui/Badge.test.tsx`, `src/components/layout/Topbar.tsx`,
`src/pages/{ConvertPage,PreviewPage,RecipesPage,TestSuitesPage,DashboardPage,TeamDashboardPage,ProjectsPage,ProjectDetailPage,DefectTrackerPage,MemberProgressPage,WeeklyReportPage,SprintBoardPage,InvitationPage,CreateProjectPage,TeamCreatePage}.tsx`,
`package.json` / `package-lock.json` (clsx, tailwind-merge, class-variance-authority).

**Supprimes** : aucun fichier applicatif.

**Backend** : aucun fichier de `qa_recipe_converter/` modifie.

## 15. Ecarts frontend / backend restants a arbitrer

| ID | Sujet | Etat dans cette iteration | Decision attendue |
|---|---|---|---|
| E1 | `GET /jobs/` vide pour un anonyme alors que `/recipes` et `/suites` sont publiques | CTA « + Convertir un fichier » et etat vide explicites ; pas de garde de route ajoutee | **Decision prise (voir 16.1) : on garde le bandeau** (empty-state + « Se connecter »), pas de garde de route. Clos. |
| E2 | `TeamSerializer` n'expose pas `projects_count` | Compteur calcule cote frontend via les dashboards d'equipe (N requetes) | Valider une evolution backend (`projects_count`) pour supprimer ces requetes. |
| E3 | Aucun `PATCH /auth/me/` | `SettingsPage` en lecture seule conserve | Ouvrir la modification de profil (backend) ou assumer la lecture seule. |
| E4 | Erreurs backend heterogenes (`error`, `detail`, erreurs par champ) | Mappees centralement cote frontend | Aucune action backend : ce point est clos cote frontend. |
| E5 | Vues Django templates et React coexistent sous `/teams/` | Non traite (hors perimetre frontend). **A relever backend** : `apps/teams/web_views.py` et `web_urls.py` referencent encore 6 templates supprimes par le commit `bf77ee2` (`teams/home|login|register|dashboard|project_form|project_detail.html`) ; `config/urls.py` inclut toujours `apps.teams.web_urls` (les routes `/teams/...` non-API echoueraient en `TemplateDoesNotExist`). | Choisir l'UI de reference pour les invitations **et retirer les vues/URLs templates mortes ou restaurer les templates**. |
| E6 | Endpoints `notifications`, `activity`, `files/search` | Traite : page dedicatede `/notifications`, fil d'activite equipe/projet, recherche globale `/recherche` (section fichiers) | Aucune decision supplementaire ; fonctionnalites consommees. |

## 16. Points necessitant une decision

1. **`/recipes` et `/suites` en anonyme** (E1) : **decision prise** : on conserve le bandeau
   existant (empty-state « Connectez-vous pour retrouver vos recettes/suites » + CTA « Se connecter »),
   sans garde de route : les pages restent publiques et invitent a la connexion seulement quand leur
   contenu est vide. Pas de redirection forcée.
2. **Recherche du Topbar** : etendue (decision 16.2) : la Topbar navigue desormais vers
   `/recherche?q=` ; la page `SearchPage` couvre recettes, fichiers locaux (F08) et projets.
3. **Notifications** : page dedicacee `NotificationsPage` (`/notifications`) creee en complément du panneau Topbar (lien « Voir toutes les notifications »).
4. **Bundle** : **decision prise** : on conserve la configuration par defaut de `tailwind-merge`.
   Le chunk partage `cn` mesure 124,41 kB brut / 43,68 kB gzip mais il est genere par Vite
   (modules partages React/axios/utilitaires), `tailwind-merge` n'y est pas dominant (0 marqueur
   `tailwind-merge` dans le chunk minifie). Une config `extendTailMerge` reduite n'economiserait
   que quelques kB sur un chunk deja charge une seule fois : gain negligeable, risque de casser
   des surcharges de classes. Clos.
5. **Virtualisation** : confirmer que la pagination backend reste a 20 elements (decision de
   ne pas virtualiser). **Confirme** : `DEFAULT_PAGINATION_CLASS = PageNumberPagination`,
   `PAGE_SIZE = 20` dans `config/settings/base.py`. Clos.

**Fin du suivi des Phases 2 a 4. Aucune modification backend. Validations : `npm run build`,
`npm run lint` et `npm test` (30 fichiers / 298 tests) passent.**

## 17. Complement de session (20/09/2026)

Refonte technique poursuivie : standardisation des modales sur les composants accessibles et
nettoyage final des classes de palette brute au profit des tokens `@theme`.

### Modales standardisees (`Modal` / `ConfirmDialog`)

- `DefectTrackerPage` : modale de creation finalisee (`htmlFor`/`id`, `Button variant="secondary"`).
- `PreviewPage` : 3 modales inline remplacees (en-tete, VS Code, suppression sur `ConfirmDialog`) ;
  ajout d'un `aria-label` sur le toggle « automatisable ».
- `ProjectDetailPage` : modale d'assignation sur `Modal` ; telechargement via `lib/download` partagee
  (`revokeObjectURL` robuste) ; suppression de l'implementation locale.
- `SprintBoardPage` : 3 modales sur `Modal` (create sprint, assignation, detail Use Case) ;
  suppression de `modalRef`, de l'effet scrollTo, de `createPortal` et de la prop `detailAssignmentId`.
- `TeamDashboardPage` : indentation et alignement sur le composant `Modal`.

### Tokens Tailwind (suppression de la palette brute)

Toutes les classes de palette brute et valeurs arbitraires ont ete remplacees par des tokens dans :
`DashboardPage`, `TeamDashboardPage`, `MemberProgressPage`, `ProjectDetailPage`, `PreviewPage`,
`ConvertPage`, `InvitationPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `HomePage`.

Conservees (exceptions documentees) : simulation du document Excel (bandeau navy `#0f2342` et
en-tete de tableau de `PreviewPage`), prop `color` hex des `KpiCard` (API composant), couleurs
utilisateur (`colorOptions`, avatars generes en `hsl()`).

### Validation

| Commande | Resultat |
|---|---|
| `npm run build` | OK |
| `npm run lint` | 0 erreur |
| `npm test` | 30 fichiers / 298 tests OK |

Les ecarts E1-E6 et les points de decision (ss8-16) restent ouverts : decision produit attendue,
aucune modification backend apportee.

## 18. Complement de session (21/09/2026)

Consommation des endpoints backend restaient sans UI : notifications, fil d'activite et
recherche de fichiers locaux.

### Nouvelles pages

- `SearchPage` (`/recherche?q=`) : remplace l'usage de `/recipes?q=` dans la Topbar. Trois sections
  sous un terme de recherche (debounce 300 ms) :
  - **Recettes** : listes `listJobs(1)` filtrées du cote client (StatusPill, lien vers `/preview/:id`).
  - **Fichiers locaux (F08)** : appelle `conversionApi.searchFiles(q, exts)` avec `paramsSerializer
    { indexes: null }` (le backend lit `ext` via `getlist`), exige >= 2 caracteres, filtres
    `.doc/.docx/.xlsx`, affiche nom, chemin, taille.
  - **Projets** (si connecte) : `listTeams` puis `listProjects` par equipe via `useQueries`, carte
    clique vers `/teams/:slug/projects/:slug` ; CTA de connexion sinon.
- `ActivityPage` (`/teams/:slug/activity` et `/teams/:slug/projects/:projectSlug/activity`) : consomme
  `getTeamActivity` / `getProjectActivity` (E6). Libelles FR pour `sprint_created`, `sprint_updated`,
  `assignments_created`, `use_case_status`, `defect_created`, `defect_status`, `screenshot_uploaded`,
  `weekly_report_submitted`.
- `NotificationsPage` (`/notifications`, route protegee, item Sidebar) : consomme `getNotifications`,
  marquage lu individuel et « Tout marquer comme lu » (invalidation query). Panneau Topbar dote d'un
  lien « Voir toutes les notifications ».

### Acces

- Topbar : `handleSearch` -> `/recherche?q=`, placeholder enrichi.
- `TeamDashboardPage` : bouton « Activite » ; `ProjectDetailPage` : bouton « Activite ».
- `Sidebar` : item « Notifications » (icone cloche, utilisateur connecte uniquement).

### Validation

| Commande | Resultat |
|---|---|
| `npm run build` | OK |
| `npm run lint` | 0 erreur |
| `npm test` | 33 fichiers / 316 tests OK |

## 19. Complement de session (21/09/2026) — cloture des points ouverts restants

Arbitrage des derniers points de decision et fin de la pagination (constat M1).

### M1 — Pagination uniforme sur toutes les listes paginees DRF

- Listes deja paginees (exercice precedent) : `RecipesPage`, `TestSuitesPage`.
- **Ajoute** : `DefectTrackerPage` (anomalies, filtre par statut) et `ProjectsPage` — passent
  desormais le parametre `page` (DRF `PageNumberPagination`, 20/page) et affichent le composant
  `Pagination` (numeros + ellipses, `aria-current`, `aria-busy`, compteur « x–y sur n »).
  Le changement de filtre reinitialise la page a 1 (`DefectTrackerPage`).
- `api/teams.ts` : `listDefects` et `listProjects` acceptent `page`.
- `lib/queryKeys.ts` : `defects(slug, project, statut, page)` et `projects(slug, page)` incluent
  la page ; ajout de `projectsRoot(slug)` pour invalider toutes les pages apres creation d'un projet
  (`CreateProjectPage`).
- **Hors perimetre** : `ActivityPage` et `NotificationsPage` ne sont pas paginees DRF (bornes cote
  serveur `[:30]`/`[:50]`, reponse `results` sans `next`/`previous`) — pagination non applicable.

### Decisions actees

- **16.1 / E1** : bandeau conserve (pas de garde de route) sur `/recipes` et `/suites` — voir §16.1.
- **16.4** : configuration `tailwind-merge` par defaut conservee — voir §16.4.
- **16.5** : pagination backend confirmee a 20 (`base.py`) — voir §16.5.
- **E2 / E3** : evolutions backend conservees ouvertes (`projects_count`, `PATCH /auth/me/`).
- **E5** : signalement backend ajoute (§15) : `web_views.py`/`web_urls.py` referencent des templates
  supprimes par `bf77ee2` (routes `/teams/` non-API cassées potentiellement).

### Validation

| Commande | Resultat |
|---|---|
| `npm run build` | OK |
| `npm run lint` | 0 erreur |
| `npm test` | 33 fichiers / 320 tests OK |



