# Comptes de paiement par association

La section « Finance » des paramètres administrateur permet d'enregistrer une clé par association pour Wave, Orange Money et MTN MoMo. La clé passe par HTTPS vers l'Edge Function `payment-provider-settings`, est chiffrée en AES-256-GCM avec une clé côté serveur et n'est jamais renvoyée au client. La table `payment_provider_credentials` est inaccessible aux rôles `anon` et `authenticated`. L'administrateur voit uniquement l'état « clé enregistrée », peut la remplacer ou la supprimer.

Définir `PAYMENT_CREDENTIAL_ENCRYPTION_KEY` dans les secrets des Edge Functions avant d'enregistrer une clé. La valeur doit être 32 octets aléatoires encodés en base64. La conserver dans le gestionnaire de secrets de l'hébergement et dans une sauvegarde sécurisée : sa perte rend les clés stockées illisibles. Le fichier local `supabase/functions/.env` est ignoré par Git. Ne jamais utiliser de variable `EXPO_PUBLIC_*` pour ce secret ou pour les clés marchandes.

L'enregistrement d'une clé ne déclenche pas encore de paiement. Chaque fournisseur impose une intégration distincte, des accès marchands de production et une validation de transaction côté serveur avant d'inscrire le versement en comptabilité. Aucune confirmation ne doit être fondée uniquement sur une redirection du navigateur ou une déclaration du membre.

- Wave : clé du portefeuille Business et Checkout API, puis vérification serveur du statut de la session et rapprochement avec la mensualité.
- Orange Money : contrat marchand Web Payment / M Payment et paramètres techniques fournis par Orange pour le pays de l'association.
- MTN MoMo : accès Collection et paramètres de production associés au portefeuille Business.

La table `provider_payment_attempts` est réservée au futur suivi des tentatives et aux références de paiement. Aucun flux de paiement n'y écrit encore.

Logos affichés : Wave (actif du projet), Orange Money ([Orange Developer](https://developer.orange.com/resources/orange-apis-for-the-middle-east-africa/)) et MTN MoMo ([MTN MoMo Developer](https://momodeveloper.mtn.com/content/html_widgets/1tio4.html)). Les règles d'usage de marque des opérateurs restent applicables.
