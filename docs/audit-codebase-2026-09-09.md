# Audit de la codebase — 9 septembre 2026

## Portée examinée

Le dépôt principal `main` ne contient que les spécifications et les maquettes. L'application est dans le worktree et la branche `feat/authentication`.

## Résumé des réalisations

- Application mobile Expo/React Native et TypeScript.
- Inscription sur invitation, OTP SMS, demande d'adhésion, connexion, récupération de mot de passe et biométrie.
- Administration mobile des adhésions et des membres.
- Tableau de bord et premières fonctions financières : mensualités, cotisations exceptionnelles, paiements et décaissements.
- Backend Supabase : migrations PostgreSQL, RLS, fonctions SQL, Edge Functions et tests Deno.

## Vérifications réalisées

- `pnpm test` : 42 tests mobile et 19 tests de validation réussis.
- `pnpm typecheck` : réussi pour les trois packages.
- `deno test -A supabase/functions supabase/seed-admin-demo_test.ts` : 60 réussis, 8 ignorés faute de Supabase local configuré.
- `pnpm audit --prod` : 45 vulnérabilités transitives, dont 37 de sévérité élevée.
- Les tests SQL Supabase n'ont pas été lancés : la CLI Supabase n'est pas disponible dans l'environnement d'audit.

## Constats prioritaires

1. La politique de mot de passe forte est appliquée par le mobile mais contournable par les fonctions serveur d'inscription et de réinitialisation.
2. Les OTP sont protégés par un SHA-256 simple ; une fuite de base permettrait de retrouver un code à six chiffres par force brute hors ligne.
3. La réinitialisation consomme l'OTP avant l'appel à Supabase Auth. Une panne transitoire peut donc invalider un code sans modifier le mot de passe.
4. Les tests mobiles recherchent souvent des chaînes de caractères dans les sources au lieu d'exécuter les composants.
5. Les journaux `.turbo` sont versionnés et les fichiers générés ne sont pas suffisamment ignorés.
6. Il n'y a ni README, ni CI, ni linting configuré.
7. Les règles métier de surpaiement et d'avance ne sont pas implémentées : le backend refuse les montants supérieurs au solde.

## Éléments non couverts à ce stade

Caisses, transferts, reçus, corrections et annulations comptables complètes, notifications, rapports/export, import historique, espace membre complet et application web d'administration.

## Limite de révocation des sessions après réinitialisation

Supabase ne permet pas à une Edge Function de révoquer les refresh tokens d'un utilisateur avec son UUID : l'opération `signOut` côté serveur exige le JWT utilisateur. Les access tokens déjà émis ne sont pas révocables avant leur expiration. Une révocation globale fiable après une réinitialisation demandera une conception distincte, par exemple une version de session contrôlée à chaque endpoint ; le parcours actuel ne prétend donc pas révoquer les sessions existantes.

## Ordre de correction retenu

1. Sécurité de l'inscription et de la réinitialisation.
2. Qualité, tests et hygiène du dépôt.
3. Fonctions financières et modules métier manquants.
