# Renforcement de la sécurité d'authentification

## Objectif

Rendre les règles de mot de passe obligatoires côté serveur, empêcher la récupération hors ligne des OTP à partir de la base, et éviter qu'une panne Supabase Auth fasse perdre un code de réinitialisation.

## Décisions

### Politique de mot de passe unique

Les Edge Functions appliquent exactement la politique déjà affichée par le mobile : au moins huit caractères, une minuscule, une majuscule, un chiffre et un caractère spécial. Les validations serveur sont l'autorité ; le contrôle client reste destiné au confort de saisie.

Une fonction partagée Deno valide les mots de passe. Elle est utilisée par `create-membership-request` et `reset-password-with-otp`. Les tests couvrent les mots de passe acceptés et les contournements précédemment possibles.

### OTP liés à un secret serveur

Les nouveaux OTP sont calculés avec HMAC-SHA-256 et la variable secrète `OTP_HASH_SECRET`, au lieu de SHA-256 seul. Le secret n'est jamais transmis au mobile ni stocké dans PostgreSQL.

Les OTP déjà émis avant le déploiement peuvent devenir invalides, mais leur durée maximale est de dix minutes. Cette fenêtre est acceptable pour éviter de maintenir durablement un ancien mécanisme faible.

### Réinitialisation robuste

Un OTP de réinitialisation est réservé de manière atomique avant la modification du mot de passe. La réservation possède un jeton aléatoire et une expiration courte.

1. L'Edge Function réserve le code valide.
2. Elle modifie le mot de passe dans Supabase Auth.
3. Elle consomme définitivement le code après succès.
4. En cas d'échec Auth, elle libère la réservation : le même code reste utilisable jusqu'à son expiration.

Les fonctions PostgreSQL ne reçoivent que les hashes et le jeton de réservation. Elles restent accordées uniquement au rôle `service_role`.

## Fichiers concernés

- `supabase/functions/_shared/password.ts` et son test : validation serveur.
- `supabase/functions/_shared/otp.ts` et son test : HMAC OTP.
- `supabase/functions/create-membership-request/index.ts` : validation serveur.
- `supabase/functions/reset-password-with-otp/index.ts` : réservation, mise à jour Auth, finalisation ou libération.
- `supabase/functions/send-registration-otp/index.ts`, `verify-registration-otp/index.ts`, `send-password-reset-otp/index.ts` : utilisation de `OTP_HASH_SECRET`.
- Nouvelle migration Supabase : colonnes de réservation et fonctions SQL de réservation, finalisation et libération.
- Tests Deno ciblant chaque comportement.

## Erreurs et exploitation

Les réponses externes restent neutres : elles ne révèlent ni l'existence d'un compte ni la cause exacte d'un refus. Les erreurs internes sont journalisées sans mot de passe, code OTP, token ou secret.

## Validation

- Les tests Deno doivent démontrer l'échec initial des validations insuffisantes et de la récupération sans `OTP_HASH_SECRET`.
- Les tests de réinitialisation vérifient qu'un échec Supabase Auth libère l'OTP, puis qu'un succès le consomme.
- La suite Deno complète, les tests TypeScript et les tests mobiles existants restent verts.
