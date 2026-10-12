# Déploiement de test

L'application Expo utilise Supabase pour PostgreSQL, l'authentification et les Edge Functions. Le Supabase lancé par la CLI sur ce PC sert au développement local ; il ne doit pas être exposé sur Internet. Netlify peut publier le **frontend web**, mais ne remplace pas le backend Supabase.

## Backend Supabase hébergé

1. Créer ou sélectionner un projet Supabase hébergé réservé aux tests.
2. Appliquer toutes les migrations du dossier `supabase/migrations`, puis déployer les Edge Functions du dossier `supabase/functions`.
3. Configurer les secrets serveur requis par les fonctions (notamment les services SMS/OTP si les inscriptions et réinitialisations doivent être testées). Les clés `service_role`, les mots de passe de base et les secrets Wave ne doivent jamais être placés dans les variables `EXPO_PUBLIC_*` ni dans Netlify.
4. Utiliser l'URL publique HTTPS du projet et sa clé **anon/publishable** pour le frontend. Les données et utilisateurs du Supabase local ne sont pas transférés automatiquement ; prévoir une migration de données distincte si nécessaire.

## Web sur Netlify

Le fichier `netlify.toml` exporte le frontend web d'Expo dans `apps/mobile/dist`. Dans les variables d'environnement du site Netlify, configurer `EXPO_PUBLIC_SUPABASE_URL` avec l'URL du projet Supabase hébergé et `EXPO_PUBLIC_SUPABASE_ANON_KEY` avec sa clé publique. Ces deux valeurs sont intégrées au bundle web lors du build ; toute modification impose un nouveau build. Vérifier les domaines et URL de redirection autorisés côté Supabase avant de tester l'authentification.

## APK Android de test

Le profil `preview` dans `apps/mobile/eas.json` produit un APK installable (`distribution: internal`). L'identifiant Android `com.gestionass.test` est réservé à cette version de test. Connecter un compte Expo/EAS, définir pour l'environnement `preview` les deux mêmes variables publiques pointant vers le Supabase HTTPS hébergé, puis lancer depuis `apps/mobile` :

```sh
eas build --platform android --profile preview
```

EAS fournit un lien d'installation une fois la compilation et la signature terminées. Un APK construit avec l'adresse locale `192.168.x.x` ne fonctionnera que sur le même réseau ; utiliser le projet Supabase hébergé pour les tests à distance.

## Registre des comptes marchands

Le registre manuel se trouve dans Finances → Comptes marchands Wave. Il présente le marchand actuel et les anciens marchands enregistrés lors d'un changement approuvé. Chaque mouvement est une déclaration administrateur et doit être rapproché du relevé Wave. Les écritures ne peuvent pas être modifiées : une erreur se corrige par une écriture inverse avec sa référence. Le solde calculé n'est pas une interrogation du solde Wave réel. Les paiements confirmés et les décaissements de l'application ne sont pas automatiquement importés dans ce registre, afin de ne pas les attribuer au mauvais compte lors d'un changement de marchand. Le rapprochement automatique demandera une clé API autorisée pour chaque portefeuille.
