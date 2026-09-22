# QA Recipe Converter — Frontend

Interface utilisateur React pour l'application QA Recipe Converter, basée sur les maquettes Stitch (design system "Bleu-Blanc").

---

## Stack technique

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS v4** (design tokens Stitch)
- **React Router v6** (routing SPA)
- **TanStack Query** (data fetching / cache)
- **Axios** (client HTTP)

## Pages

| Route | Page | Maquette Stitch |
|---|---|---|
| `/login` | Connexion | connexion_desktop |
| `/register` | Inscription | — |
| `/` | Dashboard principal | dashboard_principal_desktop |
| `/teams/:slug` | Dashboard équipe | dashboard_quipe_desktop |
| `/teams/:slug/projects` | Liste des projets | liste_des_projets_desktop |
| `/teams/:slug/projects/new` | Créer un projet | cr_er_un_projet_desktop |
| `/teams/:slug/projects/:projectSlug` | Détail du projet | d_tail_du_projet_desktop |
| `/convert` | Outil de conversion | outil_de_conversion_desktop |
| `/settings` | Paramètres profil | param_tres_profil_desktop |
| `/components` | Planche de composants | planche_de_composants_desktop |

## Design system

- **Couleurs** : Palette Bleu-Blanc issue du DESIGN.md Stitch (`#1E40AF`, `#F8FAFC`, etc.)
- **Typographie** : Inter (sans-serif), JetBrains Mono (monospace)
- **Composants** : Button, Input, Card, Badge, StatusPill, Toggle
- **Dark mode** : Support via classe `html.dark` (thème "Nocturnal Precision")
- **Icônes** : SVG inline (Material Design)

## Démarrage

```bash
# Installation
npm install

# Développement
npm run dev          # http://localhost:3000

# Build production
npm run build

# Prévisualisation du build
npm run preview
```

Le proxy Vite redirige `/api/*` vers `http://127.0.0.1:8000` (backend Django).

## Structure

```
src/
├── api/              # Client Axios + endpoints (auth, teams, conversion)
├── components/
│   ├── layout/       # Sidebar, Topbar, PageLayout, AuthLayout, ProtectedRoute
│   └── ui/           # Button, Input, Card, Badge, StatusPill, Toggle
├── context/          # AuthContext (connexion), ThemeContext (dark/light)
├── pages/            # 10 pages (Login, Dashboard, Convert, Settings...)
├── types/            # TypeScript interfaces (User, Team, Project, etc.)
├── App.tsx           # Routing principal
├── main.tsx          # Point d'entrée
└── index.css         # Design tokens Tailwind + dark mode
```

## Docker

```bash
# Build production
docker build -t qa-recipe-frontend .

# Ou via docker-compose à la racine du projet
cd ../qa_recipe_converter
docker compose up --build

# Développement avec Mailpit
docker compose -f ../docker-compose.yml -f ../docker-compose.dev.yml up --build
```

L'image Nginx sert les fichiers statiques et proxy `/api/` vers le backend Django.

## Email

En développement, les emails (bienvenue, invitation) sont envoyés via **Mailpit** :
- SMTP : `localhost:1025`
- UI Web : http://localhost:8025
