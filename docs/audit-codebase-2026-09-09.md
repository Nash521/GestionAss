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

## Limites restantes après le lot sécurité

- La migration de réservation OTP doit encore être appliquée et testée sur une instance Supabase locale ou de préproduction ; les variables locales nécessaires n'étaient pas disponibles pendant cet audit.
- Supabase exige le JWT actif de l'utilisateur pour révoquer ses refresh tokens et ne permet pas de révoquer un access token avant son expiration. La réinitialisation ne tente donc plus une déconnexion globale invalide avec un UUID. Une révocation globale fiable nécessite un futur mécanisme de version de session contrôlé par chaque endpoint.
- Une demande de nouvel OTP après le délai de renvoi peut concurrencer une réinitialisation exceptionnellement longue. Ce cas doit recevoir une conception dédiée avant une garantie de sérialisation complète entre Supabase Auth et PostgreSQL.

## Note d’avancement — 23 septembre 2026 — workflow disciplinaire membre

- L’ouverture d’un dossier disciplinaire conserve le membre et son compte actifs. Le dossier enregistre l’administrateur initiateur et une règle SQL interdit deux dossiers ouverts simultanément pour le même membre.
- Les sanctions de suspension et d’exclusion ne sont appliquées qu’à la décision. La décision est transactionnelle, auditée et protège le dernier administrateur actif. Une suspension n’expire pas automatiquement : la réactivation reste une action manuelle d’un administrateur.
- La politique de cotisation `continue` génère les échéances pendant une suspension confirmée ; `stop` ne le fait pas. Les écritures financières existantes ne sont pas supprimées.
- Les dossiers sont isolés par organisation via une Edge Function qui valide les actions et masque les erreurs internes. Les anciens points d’entrée génériques refusent désormais `suspend` et `archive`; le module mobile membre est isolé derrière une API dédiée.
- Vérifications locales : `pnpm quality` réussi (52 tests mobile, 83 tests Edge réussis et 9 ignorés car dépendants de services locaux) ; `supabase test db --local` réussi (231 assertions pgTAP). Les migrations `202609220001` et `202609230001` sont appliquées à la base locale sans réinitialisation.
- La validation manuelle complète sur téléphone avec un compte de test et le déploiement/vérification en production restent à faire ; ces résultats locaux ne prouvent pas l’état d’un projet Supabase distant.
