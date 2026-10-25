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

### Tests de la base sans Docker

Si Supabase ne peut pas tourner en local, les tests de la base fonctionnent aussi sur un
PostgreSQL 16 classique. Le script crée une base jetable avec une imitation minimale des
schémas `auth` et `storage` de Supabase, puis applique les migrations et le seed :

```bash
ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres pnpm db:test-bootstrap
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/certipilot_test pnpm test:db
```

C'est ce que fait l'intégration continue.

## Données

- `supabase/migrations/` : le schéma, la RLS, les triggers de conformité et d'audit, le
  stockage et le référentiel par défaut (les 8 recommandations, leurs catégories et deux
  grilles d'exemple). Ce référentiel est copié dans chaque organisme à son inscription,
  qui peut ensuite l'adapter. Les grilles d'exemple ne sont **pas officielles** et sont
  marquées « À VALIDER avec un testeur ».
- `supabase/seed.sql` : un organisme de démonstration, pour le développement local
  uniquement. Comptes (mot de passe `certipilot-demo`) :
  `admin@demo.certipilot.test`, `secretariat@demo.certipilot.test`,
  `testeur1@demo.certipilot.test`, `testeur2@demo.certipilot.test`. La « Session du jour
  (démo) » attribue deux épreuves pratiques du jour à `testeur1` (Marc Testeur).

## Application testeur hors connexion

Le testeur se connecte sur la tablette et arrive sur `/testeur` : la liste de ses
candidats du jour. Tant que la tablette a du réseau, les épreuves du jour (grilles,
photos des candidats) sont téléchargées dans la tablette (IndexedDB, via Dexie).

Ensuite tout se fait sans réseau : contrôle d'identité (type et numéro de pièce, case
« vérifié » horodatée), démarrage de l'épreuve, notation critère par critère avec le
score en direct et le chronomètre, résultat, puis signature au doigt. Chaque action est
mise dans une file d'attente et envoyée dans l'ordre dès le retour du réseau. Le serveur
refait tous les contrôles (identité, testeur, engin, calcul du résultat) : si une
modification est refusée, elle reste sur la tablette avec le message d'erreur et peut
être renvoyée une fois le problème corrigé.

L'indicateur en haut de l'écran affiche « Hors ligne », « Synchronisation en cours »,
« Synchronisé » ou « Erreur de synchronisation ». Avec une version de production
(`pnpm build && pnpm start`), un service worker (`public/sw.js`) garde aussi la page
disponible hors connexion : elle se recharge même sans réseau, et peut être installée
sur l'écran d'accueil de la tablette.

## Certificats

Sur la page d'une session, le bouton « Délivrer le certificat » apparaît pour un candidat
dès que la théorie (QCM, et QCM-IPR pour la R.482) et au moins une catégorie pratique sont
réussies. La base refait ces contrôles, numérote le certificat (`PRÉFIXE-ANNÉE-000001`) et
calcule la fin de validité depuis le référentiel (5 ans par défaut, 10 ans pour la R.482,
modifiable par recommandation ou par catégorie). Seuls le responsable et le secrétariat
délivrent.

Le PDF (`lib/certificates/`) est généré côté serveur avec @react-pdf/renderer : photo du
candidat, catégories obtenues uniquement, dates, et un QR code vers la page publique
`/verifier/[jeton]`. Il est rangé dans le bucket privé `certificates` et téléchargé par une
URL signée d'une minute. Un certificat ne se modifie jamais : il peut seulement être
révoqué par le responsable, avec un motif, et la page de vérification affiche alors
« Révoqué ».

Les photos des candidats sont réenregistrées en JPEG (800 px maximum, sans métadonnées
EXIF ni GPS) au moment de l'envoi.

## Déploiement

Le déploiement complet (Vercel et Supabase en Europe) est décrit à la fin du projet.
