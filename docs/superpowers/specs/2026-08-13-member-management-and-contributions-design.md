# Gestion des membres, cotisations et paiement Wave

## Objectif

Permettre à un administrateur de gérer les membres de sa propre association, de suivre leurs cotisations mensuelles et exceptionnelles, puis de proposer aux membres un paiement Wave confirmé côté serveur.

## Découpage de livraison

### Étape 1 — Page Membres et création directe de compte

La route administrateur « Membres » reprend l’identité visuelle de `maquette/page_membre.png` : fond clair, en-tête fixe, barre de navigation fixe, titre, compteurs, recherche, filtres et liste de membres.

L’en-tête et le footer mobile deviennent des éléments partagés par les pages administrateur. Ils conservent le même logo, les mêmes actions et la même navigation que le tableau de bord. L’onglet Membres est actif sur la page Membres et l’onglet Tableau de bord renvoie vers le tableau de bord.

La liste est limitée à l’organisation de l’administrateur connecté. Elle offre une recherche par prénom, nom ou téléphone, ainsi que des filtres de statut, de situation de cotisation et de rôle. Les trois compteurs affichent le total de membres, le total en retard et le total à jour.

Le bouton « Ajouter un membre » ouvre un formulaire. L’administrateur saisit le prénom, le nom, le téléphone ivoirien, le mot de passe initial et sa confirmation, puis choisit le rôle `member` ou `admin`. La création produit, dans une transaction serveur, un compte Auth actif, une ligne `users` et une ligne `members` rattachées à l’organisation de l’administrateur. Aucun code d’invitation ni approbation ultérieure ne sont requis. Le membre peut se connecter immédiatement avec son numéro et son mot de passe.

## Étape 2 — Cotisations et dettes

Chaque organisation possède un montant de cotisation mensuelle et un jour d’échéance commun. Les administrateurs configurent ces paramètres dans la future page de réglages de leur organisation.

Un traitement serveur idempotent crée une échéance mensuelle pour chaque membre actif de l’organisation. L’échéance porte le mois concerné, le montant, la date d’échéance, le montant réglé, le solde et un statut. Une échéance non soldée après sa date d’échéance rend le membre « En retard ». Un membre sans échéance échue impayée est « À jour ».

Les administrateurs peuvent aussi créer une cotisation exceptionnelle obligatoire, avec un montant et une date d’échéance. Elle peut concerner tous les membres actifs ou une sélection explicite de membres. Une affectation est créée par membre cible ; son solde impayé est une dette. Les cotisations exceptionnelles obligatoires impayées contribuent au statut « En retard » et sont visibles dans la fiche du membre.

Le droit d’adhésion existant reste distinct des cotisations mensuelles et exceptionnelles. Les nouveaux écrans utilisent les nouvelles échéances pour afficher les situations de cotisation.

## Étape 3 — Paiement Wave

Wave est le seul moyen de paiement pour la première version. Chaque organisation renseigne son code marchand Wave dans ses réglages. Ce code est stocké avec l’organisation et n’est lisible ou modifiable que par ses administrateurs.

Depuis son interface, un membre sélectionne une échéance mensuelle ou exceptionnelle à régler. L’application appelle une fonction Supabase qui vérifie qu’il appartient à l’organisation et prépare une transaction Wave. Elle enregistre un paiement `pending` avant de renvoyer les informations nécessaires à l’application pour poursuivre le paiement.

La confirmation n’est jamais décidée par le client mobile. Un endpoint de webhook côté serveur vérifie l’authenticité du message Wave, retrouve le paiement, applique le montant de manière idempotente à l’échéance visée, puis marque le paiement comme confirmé ou échoué. Les notifications répétées de Wave ne peuvent pas créditer une échéance deux fois.

Les secrets d’API et de signature Wave sont configurés uniquement dans l’environnement Supabase. Ils ne sont jamais stockés dans Expo, dans la base accessible aux utilisateurs, ni saisis dans le formulaire mobile. Tant que les clés sandbox ou de production ne sont pas fournies, le flux Wave est implémenté derrière une configuration serveur incomplète qui renvoie une erreur explicite et sans fuite de secret.

## Architecture des données

- `organizations` reçoit le montant mensuel, le jour d’échéance et le code marchand Wave.
- `users` et `members` gardent l’identité, le rôle et le rattachement à l’organisation.
- `monthly_contribution_dues` contient les échéances mensuelles individuelles, uniques par membre et mois.
- `exceptional_contributions` définit une contribution obligatoire à l’échelle d’une organisation.
- `exceptional_contribution_dues` affecte cette contribution à chaque membre ciblé et suit son solde.
- `wave_payments` conserve la référence externe, l’échéance concernée, le montant, le statut et les données minimales nécessaires à la réconciliation.

Toutes les mutations sensibles passent par des fonctions ou Edge Functions Supabase avec vérification de session, rôle, organisation et règles de statut. Les politiques RLS limitent lecture et écriture à l’organisation concernée.

## Gestion des erreurs

- Un téléphone déjà associé à un compte ou un membre retourne un message utilisable par l’administrateur ; aucun compte partiel ne reste créé.
- La création d’un membre rejette un mot de passe non conforme ou des mots de passe différents.
- Une génération d’échéances peut être relancée sans créer de doublon.
- Une tentative de paiement d’une échéance déjà soldée est refusée.
- Une erreur de configuration Wave indique que le paiement n’est pas encore disponible, sans exposer de secret.
- Une confirmation Wave invalide, inconnue ou dupliquée ne modifie pas les soldes.

## Tests

Les tests couvriront la création atomique d’un membre et de son compte actif, l’isolation entre organisations, les recherches et filtres, la génération idempotente des échéances, le calcul des membres à jour/en retard, le ciblage des contributions exceptionnelles et l’idempotence de la confirmation Wave. Les tests de routes vérifieront la présence de la page Membres et l’utilisation du chrome partagé.

## Hors périmètre initial

- Plusieurs moyens de paiement.
- Saisie manuelle d’un paiement par un administrateur.
- Relances automatiques par SMS ou notifications.
- Édition complète de la fiche membre, export et rapports financiers.
