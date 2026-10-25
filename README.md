# Certipilot

Logiciel SaaS pour les organismes testeurs certifiés (OTC) CACES® : préparation des
sessions de test, passage des tests sur tablette (y compris hors connexion), puis
délivrance et vérification des certificats.

> « Certipilot » est un nom de code provisoire, centralisé dans `lib/constants.ts`.
> CACES® est une marque déposée de la Cnam : le nom de l'application ne doit pas la contenir.

## Prérequis

- Node.js 20 ou plus récent, et pnpm 10 (`corepack enable`)
- Docker, pour faire tourner Supabase en local

## Installation

```bash
pnpm install
cp .env.example .env.local
pnpm db:start            # démarre Supabase en local (Postgres, Auth, Storage)
pnpm supabase status     # affiche l'URL et les clés à copier dans .env.local
```

Renseignez dans `.env.local` les valeurs `API URL`, `anon key` et `service_role key`
affichées par `pnpm supabase status`.

## Lancer en local

```bash
pnpm dev
```

L'application est disponible sur http://localhost:3000. Le Studio Supabase local est
sur http://127.0.0.1:54323 et les e-mails envoyés (invitations) sont visibles dans
Mailpit sur http://127.0.0.1:54324.

`pnpm db:reset` recrée la base à partir des migrations de `supabase/migrations` et du
jeu de données `supabase/seed.sql`.

## Tests

| Commande | Contenu |
| --- | --- |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm test:coverage` | Tests unitaires avec couverture ; les règles métier de `lib/rules/` doivent être couvertes à 100 % |
| `pnpm test:db` | Tests de la base (isolation entre organisations par la RLS, triggers) ; nécessite `pnpm db:start` |
| `pnpm test:e2e` | Parcours principaux dans un navigateur (Playwright) ; la première fois : `pnpm exec playwright install chromium` |
| `pnpm lint` et `pnpm typecheck` | Qualité du code |

## Déploiement

Le déploiement complet (Vercel et Supabase en Europe) est décrit à la fin du projet.
