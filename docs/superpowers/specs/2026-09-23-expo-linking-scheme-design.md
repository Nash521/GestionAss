# Schéma de liens Expo — conception

## Contexte

Expo Router tente de calculer l’URL racine de l’application. Comme `apps/mobile/app.json` ne définit pas `expo.scheme` et que les identifiants natifs ne fournissent pas de schéma de repli, Expo affiche un avertissement de configuration.

## Décision

Déclarer `"scheme": "gestion-ass"` dans la configuration Expo existante. Cela donne à l’application un schéma personnalisé cohérent avec son nom technique. Le périmètre est limité à `apps/mobile/app.json`; aucune route ni logique métier ne change.

## Vérification et limites

Vérifier que la configuration publique Expo expose `scheme: gestion-ass`. La configuration est incluse dans la PR existante. L’avertissement observé dans Expo Go est un avertissement, pas la cause du plantage de date précédent. Les liens profonds personnalisés sur une application native exigent un nouveau build; leur validation native n’est pas couverte par le serveur Expo Go.
