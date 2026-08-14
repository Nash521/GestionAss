# Fiche membre, cotisations et aides reçues

## Objectif

Permettre à un administrateur d’ouvrir depuis la liste Membres une fiche complète, alimentée par les données réelles de l’association : droit d’adhésion, cotisations mensuelles, cotisations exceptionnelles et aides reçues.

## Navigation et interface

- Chaque carte de la liste Membres devient sélectionnable et ouvre la route administrateur `members/[memberId]`.
- La fiche possède un retour vers la liste et conserve le chrome administrateur persistant.
- Son en-tête affiche les initiales, le nom, le téléphone, le rôle et le statut du membre.
- Un bloc « Droit d’adhésion » affiche le montant dû, le montant réglé, le solde et le statut payé/partiel/non payé.
- Un calendrier mensuel affiche les échéances du membre ; chaque mois indique son statut payé, partiel ou impayé, son montant et son échéance.
- Une liste distincte affiche les cotisations exceptionnelles obligatoires qui ciblent ce membre, avec leur libellé, échéance, montants payé/restant et statut.
- Des cartes récapitulatives affichent : total cotisé, total de mensualités payé, total de mensualités restant à payer, total exceptionnel payé et total exceptionnel restant à payer.
- Le bloc « Aides reçues » affiche le nombre de décaissements associés au membre, le total reçu et le détail daté de ces décaissements.
- Un graphique sur les six derniers mois compare les montants de cotisations payés et encore impayés.

## Modèle de données

- `monthly_contribution_dues` enregistre une échéance individuelle mensuelle : membre, mois, montant dû, montant payé, solde, échéance et statut.
- `exceptional_contributions` définit une cotisation obligatoire de l’organisation : libellé, montant et échéance.
- `exceptional_contribution_dues` affecte une cotisation exceptionnelle à un membre avec les mêmes montants et statut de règlement.
- `disbursements` enregistre une sortie d’argent de l’organisation. La colonne nullable `member_id` référence le membre lorsqu’il s’agit d’une aide personnelle ; sans membre, le décaissement est général.
- Le droit d’adhésion existant reste lu depuis `membership_fees` et ne se mélange pas aux cotisations.

## Accès et agrégation serveur

- Une fonction/RPC de détail contrôle que l’appelant est un administrateur actif de la même organisation que le membre demandé.
- Elle retourne en une réponse l’identité du membre, le droit d’adhésion, les échéances mensuelles et exceptionnelles, les décaissements associés, les totaux et les six points mensuels du graphique.
- Aucune donnée d’un membre d’une autre organisation n’est renvoyée. Un identifiant inconnu ou hors organisation retourne une erreur non ambiguë et sans détail sensible.
- Les tables utilisent des contraintes de montants, de solde et de statut cohérentes avec `membership_fees`; les index couvrent les recherches par organisation, membre et date.

## Périmètre de cette livraison

- La fiche est en lecture seule : elle ne crée pas encore de cotisation, ne saisit pas de paiement et ne crée pas de décaissement.
- Les nouvelles tables et leur lecture sont incluses afin que les indicateurs reposent sur de vraies données, même si elles sont initialement vides.
- La future page Finances créera les décaissements et associera `member_id` lorsqu’une aide vise un membre.
- Le paiement Wave, les relances automatiques, l’édition de membre et les exports restent hors périmètre.

## Tests

- Tests SQL : isolation multi-organisation, contraintes de soldes, droit d’adhésion, agrégats mensuels/exceptionnels et agrégats d’aides reçues.
- Tests Edge Function : session invalide, administrateur non autorisé, membre absent/hors organisation et sérialisation complète d’un détail valide.
- Tests mobile : ouverture depuis une carte membre, présence des sections de fiche et affichage de l’état vide.
