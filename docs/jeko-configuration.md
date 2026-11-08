# Configuration Jèko

La configuration est propre à chaque association. L’administrateur saisit l’identifiant et la clé API Jèko ainsi que l’identifiant du magasin et le secret de signature du webhook Jèko. La clé et le secret webhook ne sont jamais renvoyés à l’application ; son remplacement exige de saisir une nouvelle valeur.

Avant de déployer la fonction `manage-jeko-configuration`, configurer le secret serveur `JEKO_CREDENTIALS_ENCRYPTION_KEY` avec 32 octets aléatoires encodés en base64. Conserver cette clé en lieu sûr et identique entre déploiements : sa perte rend les clés Jèko enregistrées irrécupérables. Ne jamais la placer dans une variable `EXPO_PUBLIC_` ou dans le dépôt. Appliquer la migration puis déployer la fonction. L’activation de l’accès API est nécessaire auprès de Jèko.

La configuration ne valide pas encore les identifiants auprès de Jèko. Le parcours complet doit être testé avant tout usage de production.

Le client serveur `jeko-client.ts` construit les demandes de paiement et vérifie la réponse Jèko. La table `jeko_payment_intents` prépare leur suivi séparément des paiements confirmés. Les fonctions serveur de création et de confirmation les utilisent, et l’écran de mensualité permet d’ouvrir ou de reprendre une demande en attente.

Les fonctions serveur de création d’une demande de mensualité et de réception du webhook sont en cours d’intégration. Configurer également les URL HTTPS de retour `JEKO_SUCCESS_URL` et `JEKO_ERROR_URL`. Le webhook doit être configuré sans JWT Supabase et vérifier la signature Jèko ; son secret est propre à l’association. Les migrations et le flux complet doivent encore être testés avant utilisation. Les demandes ambiguës ou en conflit sont marquées pour contrôle et nécessitent une procédure de rapprochement.
Le bouton « Vérifier auprès de Jèko » interroge la demande par son identifiant, en contrôlant sa référence et son magasin. Si l’identifiant a été perdu, l’administrateur peut le retrouver auprès de Jèko avec la référence affichée. Un échec confirmé libère la mensualité ; un succès reste en attente du webhook signé. Un paiement déjà marqué pour contrôle financier nécessite encore une procédure de résolution. En l’absence d’identifiant ou de webhook, contacter Jèko avant toute nouvelle demande.
