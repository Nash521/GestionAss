# Présentation en ligne

Netlify héberge l’application web construite avec Expo. Supabase hébergé fournit séparément l’authentification, PostgreSQL, le stockage et les Edge Functions ; les données ne sont pas contenues dans le site statique. Ne jamais envoyer les données locales vers un projet existant sans vérifier qu’il est dédié à la démonstration.

Dans Netlify, importer le dépôt sur la branche de présentation et définir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY avec les valeurs publiques du projet Supabase de démonstration. Ne jamais renseigner une clé service dans les variables EXPO_PUBLIC_. Le build refuse une adresse locale. Le fichier netlify.toml configure le routage des pages web.

Le script local seed-presentation.ts refuse délibérément les serveurs distants : un chargement séparé et contrôlé doit être préparé pour le projet hébergé. Les migrations, les fonctions, les comptes de démonstration et l’accès aux données doivent être validés avant d’annoncer le site opérationnel. Les identifiants publics de démonstration ne doivent jamais être utilisés pour de vraies données.
