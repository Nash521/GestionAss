# Version de présentation

Le script `supabase/seed-presentation.ts` est réservé à une instance Supabase locale (`http://localhost` ou `http://127.0.0.1`). Il crée une association fictive distincte, 50 membres et des mensualités de janvier au mois courant, avec des paiements fictifs. Il ne supprime pas les données existantes et refuse de réutiliser des numéros appartenant à une autre association. Ne jamais utiliser ces comptes pour des données réelles.

Après avoir démarré Supabase local et appliqué les migrations, définir `SUPABASE_URL=http://127.0.0.1:54321` et `SUPABASE_SERVICE_ROLE_KEY` avec la clé service de cette instance, puis exécuter `deno run --allow-net --allow-env supabase/seed-presentation.ts`. La clé service est secrète : ne pas la publier ni la placer dans l'application. Le script ne réinitialise pas le mot de passe des comptes existants.

Comptes créés par le script, sur une base neuve : administrateur `+2250701990000`, membre `+2250701990001`, mot de passe `Demo2026!`.

Le profil EAS `presentation` produit un APK Android (`npx eas-cli build --platform android --profile presentation`). Il faut un compte Expo connecté et un projet EAS configuré. Définir les variables publiques `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` pour l'environnement de build. L'URL doit être accessible depuis le téléphone : `localhost` sur le téléphone ne pointe pas vers l'ordinateur. L'APK est un client : les données, les fonctions et l'authentification restent dans Supabase et ne sont pas embarquées hors ligne. Ne pas embarquer la clé service ni les secrets Jèko.

La configuration Jèko est en cours de validation ; ne pas utiliser cet APK pour des paiements réels avant les essais de bout en bout.
