# Conception — parcours d’authentification

## Objectif

Permettre à un visiteur de demander son adhésion depuis l’application mobile, sans lui donner accès tant qu’un administrateur n’a pas accepté sa demande. L’authentification se fait uniquement avec un numéro de téléphone ivoirien et un mot de passe.

## Périmètre

Ce premier lot comprend :

- connexion par téléphone et mot de passe ;
- inscription sous forme de demande d’adhésion ;
- vérification du numéro par code SMS ;
- blocage des demandes en attente, refusées ou inactives ;
- approbation ou refus par un administrateur ;
- création du membre et de son droit d’adhésion lors d’une approbation ;
- notification d’activation par SMS ;
- réinitialisation de mot de passe par SMS.

Les paiements, les mensualités et les tableaux de bord restent hors de ce lot, à l’exception de la création du droit d’adhésion requise pour un nouveau membre approuvé.

## Architecture retenue

Supabase Auth gère les identités, mots de passe et sessions. La base applicative contient les profils, membres et demandes. Les mots de passe ne sont jamais enregistrés dans les tables applicatives.

Les Edge Functions assurent l’envoi et la vérification des codes via Orange SMS en production. En développement, le fournisseur SMS est simulé derrière la même interface.

```text
Application mobile
  -> Supabase Auth (compte, session, mot de passe)
  -> Edge Functions (envoi et vérification SMS)
  -> PostgreSQL/RLS (demande, membre, droits d’accès)
  -> Orange SMS (production)
```

## Flux utilisateur

### Demande d’adhésion

1. Le visiteur fournit nom, prénom, téléphone `+225` et mot de passe.
2. L’application normalise et valide le téléphone.
3. Le système envoie un code à usage unique par SMS.
4. Après vérification du code, le système crée le compte Supabase et une `membership_request` au statut `pending`.
5. L’application affiche la confirmation d’envoi ; aucune session utilisable n’est accordée.

Une demande en attente avec le même téléphone ne peut pas être recréée. Un téléphone déjà associé à un compte actif est refusé.

### Décision administrative

1. Un administrateur consulte les demandes en attente et leur détail.
2. En cas d’acceptation, il renseigne le numéro de membre et les données d’adhésion requises.
3. Dans une transaction atomique, le système crée le membre, son droit d’adhésion, lie le `user_id`, met la demande à `approved` et enregistre l’audit.
4. Le système envoie un SMS d’activation au demandeur.

En cas de refus, le motif est obligatoire, la demande passe à `rejected` et le compte est désactivé. Pour ce lot, le numéro concerné ne peut pas soumettre une nouvelle demande.

### Connexion et accès

La connexion utilise téléphone et mot de passe. Après authentification, l’application consulte le profil et applique les règles suivantes :

- administrateur actif : accès à l’espace administrateur ;
- membre actif avec demande approuvée : accès à l’espace membre ;
- demande `pending`, `rejected` ou compte désactivé : session fermée et message adapté.

La redirection par rôle s’effectue uniquement après ce contrôle applicatif et les règles RLS empêchent tout accès direct aux données non autorisées.

### Réinitialisation du mot de passe

Le visiteur saisit son téléphone, reçoit un code SMS, le vérifie puis choisit un nouveau mot de passe conforme à la politique affichée dans la maquette.

## Données

Une table `membership_requests` sera ajoutée. Champs prévus :

- `id`, `user_id`, `organization_id` ;
- `first_name`, `last_name`, `phone` ;
- `status` : `pending`, `approved`, `rejected` ;
- `phone_verified_at`, `submitted_at` ;
- `reviewed_by`, `reviewed_at`, `rejection_reason` ;
- `member_id` une fois la demande acceptée.

La table applicative `users`, liée à `auth.users`, garde le rôle et l’état d’activation. La table `members` existante reste la source des informations d’un membre officiel. Une contrainte d’unicité protège le téléphone normalisé parmi les comptes pertinents.

Les codes OTP sont stockés hachés, ont une expiration courte et un nombre maximal de tentatives. Ils ne sont jamais exposés dans les réponses de production.

## Écrans

Mobile :

- démarrage et contrôle de session ;
- connexion (maquette existante) ;
- inscription (maquette existante), adaptée avec l’action « Envoyer ma demande » ;
- saisie/vérification du code SMS ;
- demande envoyée et en attente ;
- mot de passe oublié et nouveau mot de passe ;
- messages de compte en attente, refusé ou désactivé.

Administration :

- liste des demandes d’adhésion ;
- détail d’une demande ;
- formulaire d’acceptation avec numéro de membre et informations d’adhésion ;
- action de refus avec motif.

## Règles d’erreur

Les erreurs doivent être compréhensibles et ne pas divulguer inutilement l’existence d’un compte. Cas couverts : téléphone invalide, téléphone déjà utilisé, demande déjà en attente, code erroné ou expiré, limite de tentatives atteinte, mot de passe non conforme, compte non approuvé, compte désactivé et échec d’envoi SMS.

## Vérification

Les tests automatisés vérifieront :

- la normalisation du téléphone et les règles de mot de passe ;
- les expirations, hachages et limites OTP ;
- l’impossibilité de se connecter avant approbation ;
- l’approbation atomique et la création associée du membre/droit d’adhésion ;
- les redirections par rôle ;
- les règles RLS pour un visiteur, un membre et un administrateur ;
- les erreurs de fournisseur SMS, avec un adaptateur simulé en développement.
