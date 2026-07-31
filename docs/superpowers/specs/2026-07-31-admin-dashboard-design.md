# Dashboard administrateur et jeu de démonstration

## Objectif

Ajouter un premier dashboard administrateur mobile fidèle à `maquette/page_dashbord.png`, dont les statistiques proviennent de l'organisation de l'administrateur connecté. Créer également un jeu de données de démonstration local, sans toucher à une base distante.

## Compte de démonstration local

Une commande de seed idempotente crée ou met à jour les données suivantes dans Supabase local :

- organisation : `Association Démo GestionAss` ;
- administrateur actif : `+2250701020304` ;
- mot de passe : `Teste01@`.

Le script utilise l'API d'administration Supabase pour créer le compte Auth, puis crée ou réutilise son enregistrement `public.users` avec le rôle `admin`. Il ne doit jamais être exécuté contre une URL non locale.

## Écran

Le nouvel écran remplace l'accueil générique lorsqu'un utilisateur authentifié est administrateur. Il reprend le fond `maquette/arriere_plan_admin.png`, l'en-tête, les cartes et la barre de navigation de la maquette.

Les cartes affichent les valeurs de l'organisation de l'administrateur connecté :

- nombre total de membres ;
- membres à jour : cotisation `paid` ;
- membres en retard : cotisation `unpaid` ou `partial` ;
- total dû des droits/cotisations ;
- total encaissé ;
- solde restant à encaisser.

Les cartes Membres et Demandes d'adhésion sont actives. Membres mène à un état provisoire, tandis que Demandes d'adhésion ouvre l'écran déjà existant.

## Limites du premier lot

Le schéma ne contient pas encore de transactions, de dépenses ni d'historique mensuel. Le graphique, le bloc des dernières transactions et les fonctions Événements, Paramètres et Finances montrent donc un état vide explicite au lieu de valeurs fictives.

## Chargement et sécurité

L'écran obtient d'abord la session et son organisation, puis lit uniquement les membres et cotisations de cette organisation. En cas de session non administrateur ou d'erreur, il n'expose aucune donnée et affiche un message de chargement ou d'erreur.

## Validation

Les tests de contrat mobile vérifient le chargement des statistiques, les liens des cartes et l'utilisation du fond. Le seed est vérifié contre Supabase local avec les identifiants ci-dessus.
