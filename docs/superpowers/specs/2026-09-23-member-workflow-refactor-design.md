# Fiabilisation du workflow membre et refactoring du module — Conception

## Objectif

Rendre les dossiers disciplinaires utilisables et sûrs de bout en bout, puis établir une séparation claire entre l’interface membre et ses appels Supabase. Le travail préserve les parcours d’authentification, d’adhésion, de finance et les règles métier déjà en place.

## Décisions métier

- L’ouverture d’un dossier ne change pas le statut du membre et ne désactive pas son compte.
- Un membre ne peut avoir qu’un seul dossier disciplinaire ouvert à la fois.
- Chaque dossier mémorise l’administrateur qui l’a ouvert et, après décision, celui qui a rendu la décision.
- La durée saisie est indicative. Une suspension n’expire pas automatiquement ; un administrateur réactive le membre manuellement.
- Un dossier rejeté ou une sanction d’avertissement laisse le membre actif. Une sanction de suspension ou d’exclusion applique le statut correspondant après décision.
- Une suspension conserve la règle de cotisation choisie dans le dossier.
- Toute transition de statut, son audit et la décision du dossier sont enregistrés dans une transaction atomique.

## Architecture

### Backend

- Une fonction Edge dédiée valide les actions `list`, `open` et `decide`, authentifie l’appelant et dérive son identité exclusivement du JWT.
- Les fonctions SQL vérifient le rôle d’administrateur actif et l’organisation du membre ; les identifiants d’organisation et d’acteur fournis par le client ne sont jamais considérés comme autorité.
- Une contrainte unique partielle garantit qu’il n’existe pas deux dossiers ouverts pour le même membre, y compris en cas d’appels concurrents.
- Le dossier en état `open` conserve la sanction `none` ; la suspension ou l’exclusion n’est inscrite qu’au moment de la décision.
- Le dossier conserve l’identifiant de l’administrateur qui l’a ouvert. Les dossiers historiques peuvent rester sans cet identifiant si l’auteur ne peut pas être reconstitué.
- Les erreurs SQL et d’infrastructure sont journalisées côté serveur avec un contexte opérationnel minimal, puis converties en réponses publiques contrôlées. Les détails de la base ne sont jamais renvoyés au client.
- Les nouvelles modifications de schéma sont ajoutées dans des migrations successives ; les anciennes migrations déjà suivies ne sont pas réécrites.

### Application mobile

- La fiche membre garde les actions de modification et de réactivation, mais retire les appels directs `suspend` et `archive` de l’ancien parcours générique.
- Une section ou page disciplinaire permet de consulter les dossiers, d’en ouvrir un avec motif, durée indicative, observations, élément de preuve textuel et politique de cotisation, puis de rendre une décision sur un dossier ouvert.
- La gestion des dossiers est une route dédiée sous `app/(admin)/members/[memberId]/`, distincte de la fiche financière du membre.
- Les choix de sanction sont validés côté mobile pour l’expérience utilisateur et revalidés côté Edge Function et SQL.
- Les appels propres aux membres sont déplacés vers un module API dédié sous `src/features/members/`. Les écrans gardent la navigation et l’état d’interface ; les éléments de présentation réutilisables sont extraits seulement lorsqu’ils servent réellement plusieurs écrans.
- Le client Supabase partagé reste le point central de création de session et d’invocation HTTP ; les types et opérations des autres domaines ne sont pas déplacés dans cette première tranche.

## Transitions

| Moment | Dossier | Membre | Compte |
|---|---|---|---|
| Ouverture | `open` | inchangé | inchangé |
| Rejet ou avertissement | `dismissed` ou `confirmed` | `active` | actif |
| Suspension décidée | `confirmed` | `suspended` | désactivé |
| Exclusion décidée | `confirmed` | `removed` | désactivé |
| Réactivation manuelle ultérieure | dossier conservé | `active` | actif |

Chaque transition de statut crée une entrée d’audit avec le bon acte (`suspend`, `reactivate` ou `remove`). L’ouverture du dossier conserve son acteur sans la confondre avec une transition de statut.

## Validation et erreurs

- Les entrées sont validées par action : UUID, action connue, longueurs de texte bornées, durée entière dans la plage définie par le schéma, énumérations de décision/sanction et clés autorisées uniquement.
- Les réponses distinguent les erreurs publiques attendues (requête invalide, non authentifié, non autorisé, dossier ou membre absent, conflit métier) d’une indisponibilité du service.
- Le client reçoit des messages français stables ; les messages bruts Postgres/Supabase restent côté serveur.
- Les boutons empêchent les soumissions répétées pendant une requête et l’écran recharge le membre et les dossiers après succès.

## Vérifications prévues

- Tests Edge isolés via un gestionnaire injectable : authentification, validation stricte, réponses sûres, erreurs masquées, périmètre d’organisation, ouverture, liste, décision et conflits.
- Tests SQL sur la migration : ouverture sans suspension, unicité du dossier ouvert, isolation inter-association, transitions et audit exacts, suspension/exclusion appliquées seulement après décision, réactivation manuelle, conservation des données financières et règle de cotisation.
- Tests de routes/API mobile : affichage et soumission des actions, états de chargement/erreur, absence des anciens appels directs de suspension/archivage.
- Vérifications globales de type et de qualité après intégration.

## Portée exclue

- Refactoring des modules authentification, finance et tableau de bord ; ils seront traités par lots ultérieurs après stabilisation du module membres.
- Notifications, fichiers téléversés comme preuves, expiration automatique, paiements, rapports et refonte visuelle générale.
- Suppression de dossiers ou d’écritures financières.

## Critères d’acceptation

1. Ouvrir un dossier laisse le membre et son compte actifs.
2. Un deuxième dossier ouvert pour le même membre est refusé atomiquement.
3. Une décision de suspension ou d’exclusion change le statut du membre et l’accès au compte dans la même transaction que le dossier et l’audit.
4. Le rejet et l’avertissement gardent le membre actif ; une réactivation après suspension exige une action d’administrateur.
5. Aucun appel mobile ou Edge Function ne retourne un message SQL brut.
6. L’interface permet de consulter les dossiers et de terminer le cycle sans utiliser les anciennes actions génériques de suspension ou d’archivage.
7. Les opérations du module membres ont une frontière API dédiée sans changement fonctionnel des autres domaines.
