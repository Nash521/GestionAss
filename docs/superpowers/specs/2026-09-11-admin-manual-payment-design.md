# Paiement manuel administrateur — Conception

## Objectif

Permettre à un administrateur d’enregistrer un paiement manuel en sélectionnant un membre puis une cotisation ouverte, sans saisir d’identifiant interne.

## Parcours UX

1. L’administrateur ouvre « Nouveau paiement ».
2. Il sélectionne un membre actif de son organisation dans une liste recherchable.
3. L’application charge les cotisations ouvertes de ce membre via un endpoint dédié.
4. Il choisit le type et l’échéance, puis saisit un montant et une référence éventuelle.
5. Le solde restant est affiché avant confirmation ; le montant ne peut pas le dépasser.
6. Après succès, l’écran revient aux finances et la liste est actualisée.

Les champs, états de chargement, erreurs, confirmation et succès sont accessibles et cohérents avec les écrans administrateur existants. Le bouton d’enregistrement est désactivé pendant l’appel réseau.

## Architecture backend

Une Edge Function `get-member-open-dues` vérifie le JWT de l’administrateur actif, reçoit un `memberId`, vérifie l’organisation et renvoie uniquement les échéances ouvertes du membre. Le client appelle ensuite l’action financière existante `recordPayment` avec l’identifiant sélectionné.

Le contrôle d’autorisation, d’appartenance à l’organisation, de montant positif et de non-dépassement reste effectué côté SQL dans une transaction. Aucun montant ou statut n’est décidé uniquement par le mobile.

## Données renvoyées

Chaque échéance contient `id`, `kind`, `label`, `dueDate`, `amountDue`, `amountPaid`, `amountRemaining` et `status`. Les échéances entièrement réglées ne sont pas renvoyées.

## Tests

- Edge Function : JWT absent/invalide, administrateur non actif, membre d’une autre organisation, membre introuvable, réponse vide et échéances ouvertes correctement sérialisées.
- Mobile : sélection du membre, chargement des échéances, validation du montant, appel avec l’identifiant choisi et affichage des erreurs.
- Vérifications globales : tests, typecheck, lint et migration locale.

## Hors périmètre

- Paiement Wave et webhook.
- Reçus PDF et exports.
- Modification ou annulation d’un paiement déjà enregistré.
