# Gestion du cycle de vie des membres — Conception

## Objectif

Permettre à un administrateur de modifier une fiche membre, suspendre temporairement un membre, réactiver un membre suspendu et archiver un membre sans supprimer son historique financier.

## Règles métier

- Les statuts gérés sont `active`, `suspended` et `removed`.
- `suspended` est réversible vers `active`.
- `removed` est un archivage logique : aucune ligne membre, utilisateur ou financière n’est supprimée.
- Un membre `suspended` ou `removed` ne peut pas se connecter ni accéder aux fonctions réservées aux comptes actifs.
- Un administrateur ne peut agir que sur un membre de sa propre organisation.
- Il est interdit d’archiver ou de suspendre le dernier administrateur actif de l’organisation.
- Les paiements, cotisations, aides et autres écritures restent consultables après archivage.
- Les modifications de nom et de téléphone respectent les validations existantes ; le téléphone reste unique.

## Architecture

Le backend expose une Edge Function dédiée, `manage-admin-member`, qui authentifie le JWT, vérifie l’administrateur actif, valide l’action et appelle une fonction SQL `manage_admin_member`. La fonction SQL effectue la transition atomique, applique les contraintes d’organisation et écrit une entrée d’audit dans une table dédiée.

L’application mobile ajoute une action d’édition sur la fiche membre et des actions contextuelles selon le statut : suspendre, réactiver ou archiver. Chaque action demande une confirmation explicite, affiche une erreur métier sûre et recharge la fiche après succès.

## Flux de données

1. L’administrateur ouvre la fiche membre.
2. L’application affiche les actions autorisées selon le statut courant.
3. Après confirmation, elle envoie `{ memberId, action, firstName?, lastName?, phone? }` à l’Edge Function.
4. L’Edge Function vérifie le JWT et transmet uniquement l’identité de l’administrateur authentifié à la fonction SQL.
5. PostgreSQL vérifie l’organisation, la transition de statut et la règle du dernier administrateur, puis met à jour la fiche et crée l’audit dans une transaction.
6. L’application recharge la fiche et affiche le nouveau statut.

## Audit et erreurs

La table d’audit conserve : membre ciblé, administrateur, organisation, action, ancien statut, nouveau statut, date et métadonnées minimales. Les réponses publiques ne révèlent jamais les erreurs SQL ou les détails d’identité ; elles utilisent des messages métier (`Membre introuvable`, `Action non autorisée`, `Numéro déjà utilisé`, `Service indisponible`).

## Tests

- Tests SQL/Edge Function : absence de JWT, administrateur non actif, membre d’une autre organisation, transitions valides et invalides, dernier administrateur, téléphone dupliqué et conservation des écritures financières.
- Tests mobiles de contrat : affichage des actions selon le statut, confirmation, appel de l’action et rechargement après succès.
- Vérifications globales : tests mobiles, typecheck, lint et tests Edge Functions.

## Hors périmètre

- Suppression physique des données.
- Gestion des événements et notifications.
- Modification des montants financiers depuis la fiche membre.
- Historique détaillé affiché dans l’application (la table d’audit le prépare pour une évolution ultérieure).
