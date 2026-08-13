# Écran dédié d’ajout de membre

## Objectif

Remplacer la modale d’ajout de membre par une page entière, plus confortable pour remplir les informations sur mobile.

## Navigation

Le bouton « Ajouter un membre » de la page Membres ouvre la route administrateur `/members/new`. Une flèche de retour ramène à la liste des membres sans créer de membre.

## Interface

L’écran n’affiche pas la navigation basse, afin de réserver sa hauteur au formulaire. Il comprend une flèche retour, le logo GestionAss, le titre « Ajouter un membre » et une courte indication. Le fond et les couleurs restent cohérents avec les autres pages administrateur.

Le formulaire défilant est compatible avec le clavier et contient : prénom, nom, téléphone, mot de passe initial, confirmation du mot de passe et choix du rôle Membre ou Administrateur. Le bouton « Ajouter le membre » est disponible en bas de l’écran et affiche « Ajout… » pendant l’envoi.

## Comportement

La validation, le format de téléphone, les règles de mot de passe, les erreurs et l’appel sécurisé `createAdminMember` restent identiques à l’ancienne modale. Après une création réussie, l’écran revient à la liste Membres. La liste recharge ses données au retour afin d’afficher le nouveau membre. En cas d’échec, l’erreur reste affichée sur l’écran de création.

## Hors périmètre

La création du compte serveur, les rôles autorisés, les filtres et la liste des membres ne changent pas.
