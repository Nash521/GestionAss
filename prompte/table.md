# Tables principales et leurs propriétés

Voici une structure de base de données adaptée aux règles de gestion validées. Les noms sont proposés en anglais pour faciliter le développement, mais tu peux les traduire en français.

---

# 1. Table `organizations`

Cette table contient les informations générales de l’organisation.

```text
organizations
```

| Propriété               | Type      | Description                               |
| ----------------------- | --------- | ----------------------------------------- |
| `id`                    | UUID      | Identifiant unique de l’organisation      |
| `name`                  | VARCHAR   | Nom de l’organisation                     |
| `logo_url`              | TEXT      | Adresse du logo                           |
| `address`               | TEXT      | Adresse de l’organisation                 |
| `phone`                 | VARCHAR   | Numéro de téléphone                       |
| `email`                 | VARCHAR   | Adresse e-mail                            |
| `currency`              | VARCHAR   | Devise utilisée, par exemple FCFA         |
| `membership_fee_amount` | DECIMAL   | Montant actuel du droit d’adhésion        |
| `monthly_fee_amount`    | DECIMAL   | Montant actuel de la cotisation mensuelle |
| `monthly_due_day`       | INTEGER   | Jour limite de paiement dans le mois      |
| `is_active`             | BOOLEAN   | Indique si l’organisation est active      |
| `created_at`            | TIMESTAMP | Date de création                          |
| `updated_at`            | TIMESTAMP | Date de dernière modification             |

Même si la première version ne gère qu’une organisation, conserver cette table permettra d’évoluer plus tard vers plusieurs organisations.

---

# 2. Table `users`

Cette table gère les comptes de connexion.

```text
users
```

| Propriété         | Type      | Description                                                             |
| ----------------- | --------- | ----------------------------------------------------------------------- |
| `id`              | UUID      | Identifiant du compte                                                   |
| `organization_id` | UUID      | Organisation associée                                                   |
| `email`           | VARCHAR   | Adresse e-mail de connexion                                             |
| `phone`           | VARCHAR   | Numéro de téléphone de connexion                                        |
| `password_hash`   | TEXT      | Mot de passe chiffré si l’authentification n’est pas gérée par Supabase |
| `role`            | ENUM      | Rôle de l’utilisateur                                                   |
| `is_active`       | BOOLEAN   | Autorisation de connexion                                               |
| `last_login_at`   | TIMESTAMP | Dernière connexion                                                      |
| `created_at`      | TIMESTAMP | Date de création                                                        |
| `updated_at`      | TIMESTAMP | Date de modification                                                    |

Valeurs possibles pour `role` :

```text
admin
member
```

Plus tard :

```text
president
treasurer
secretary
auditor
```

Avec Supabase Auth, le mot de passe ne doit pas être stocké dans cette table. Supabase le gère dans son propre système d’authentification.

---

# 3. Table `members`

Cette table contient les informations personnelles et administratives des membres.

```text
members
```

| Propriété                    | Type              | Description                               |
| ---------------------------- | ----------------- | ----------------------------------------- |
| `id`                         | UUID              | Identifiant du membre                     |
| `organization_id`            | UUID              | Organisation du membre                    |
| `user_id`                    | UUID, nullable    | Compte utilisateur associé                |
| `member_number`              | VARCHAR           | Numéro unique du membre                   |
| `first_name`                 | VARCHAR           | Prénom                                    |
| `last_name`                  | VARCHAR           | Nom                                       |
| `phone`                      | VARCHAR           | Téléphone                                 |
| `email`                      | VARCHAR, nullable | Adresse e-mail                            |
| `photo_url`                  | TEXT, nullable    | Photo du membre                           |
| `address`                    | TEXT, nullable    | Adresse                                   |
| `joining_date`               | DATE              | Date d’entrée dans l’organisation         |
| `membership_validation_date` | DATE, nullable    | Date de validation complète de l’adhésion |
| `first_monthly_due_date`     | DATE, nullable    | Date de début des mensualités             |
| `status`                     | ENUM              | Statut du membre                          |
| `available_credit`           | DECIMAL           | Avance disponible du membre               |
| `notes`                      | TEXT, nullable    | Observations administratives              |
| `created_by`                 | UUID              | Administrateur ayant créé le membre       |
| `created_at`                 | TIMESTAMP         | Date de création                          |
| `updated_at`                 | TIMESTAMP         | Date de modification                      |

Valeurs de `status` :

```text
pending_membership
active
suspended_investigation
withdrawn
```

Il est préférable de ne pas enregistrer directement le total payé ou le total dû dans cette table. Ces valeurs doivent être calculées à partir des paiements et cotisations.

---

# 4. Table `membership_fees`

Cette table représente le droit d’adhésion individuel d’un membre.

```text
membership_fees
```

| Propriété          | Type                | Description                |
| ------------------ | ------------------- | -------------------------- |
| `id`               | UUID                | Identifiant                |
| `member_id`        | UUID                | Membre concerné            |
| `amount_due`       | DECIMAL             | Montant attendu            |
| `amount_paid`      | DECIMAL             | Montant déjà payé          |
| `remaining_amount` | DECIMAL             | Montant restant            |
| `status`           | ENUM                | Statut du droit d’adhésion |
| `due_date`         | DATE, nullable      | Date limite éventuelle     |
| `fully_paid_at`    | TIMESTAMP, nullable | Date du paiement complet   |
| `created_at`       | TIMESTAMP           | Date de création           |
| `updated_at`       | TIMESTAMP           | Date de modification       |

Valeurs de `status` :

```text
unpaid
partial
paid
```

Le champ `amount_paid` peut être calculé à partir des affectations de paiements. Il peut aussi être conservé comme valeur mise en cache pour accélérer l’affichage.

---

# 5. Table `monthly_fee_rates`

Cette table conserve l’historique des différents montants mensuels.

```text
monthly_fee_rates
```

| Propriété         | Type           | Description                        |
| ----------------- | -------------- | ---------------------------------- |
| `id`              | UUID           | Identifiant                        |
| `organization_id` | UUID           | Organisation concernée             |
| `amount`          | DECIMAL        | Montant de la mensualité           |
| `effective_from`  | DATE           | Date de début d’application        |
| `effective_to`    | DATE, nullable | Date de fin d’application          |
| `created_by`      | UUID           | Administrateur ayant créé le tarif |
| `created_at`      | TIMESTAMP      | Date de création                   |

Exemple :

```text
5 000 FCFA du 1er janvier au 30 juin
7 500 FCFA à partir du 1er juillet
```

Cette table empêche une modification de tarif de changer les anciennes mensualités.

---

# 6. Table `monthly_dues`

Cette table représente les mensualités dues par chaque membre.

```text
monthly_dues
```

| Propriété          | Type           | Description                      |
| ------------------ | -------------- | -------------------------------- |
| `id`               | UUID           | Identifiant de la mensualité     |
| `member_id`        | UUID           | Membre concerné                  |
| `fee_rate_id`      | UUID, nullable | Tarif mensuel utilisé            |
| `year`             | INTEGER        | Année concernée                  |
| `month`            | INTEGER        | Mois concerné, de 1 à 12         |
| `period_date`      | DATE           | Date représentant la période     |
| `amount_due`       | DECIMAL        | Montant attendu                  |
| `amount_paid`      | DECIMAL        | Montant payé                     |
| `remaining_amount` | DECIMAL        | Montant restant                  |
| `due_date`         | DATE           | Date limite                      |
| `status`           | ENUM           | Statut de la mensualité          |
| `is_exempted`      | BOOLEAN        | Indique si le membre est exempté |
| `exemption_id`     | UUID, nullable | Exemption associée               |
| `created_at`       | TIMESTAMP      | Date de création                 |
| `updated_at`       | TIMESTAMP      | Date de modification             |

Valeurs de `status` :

```text
upcoming
unpaid
partial
paid
late
exempted
```

Contrainte recommandée :

```text
Un membre ne peut avoir qu’une seule mensualité par mois et par année.
```

Donc une contrainte unique sur :

```text
member_id + year + month
```

---

# 7. Table `exceptional_contributions`

Cette table contient les cotisations exceptionnelles créées par l’organisation.

```text
exceptional_contributions
```

| Propriété             | Type           | Description                   |
| --------------------- | -------------- | ----------------------------- |
| `id`                  | UUID           | Identifiant                   |
| `organization_id`     | UUID           | Organisation concernée        |
| `cashbox_id`          | UUID           | Caisse associée               |
| `title`               | VARCHAR        | Nom de la cotisation          |
| `description`         | TEXT           | Description                   |
| `contribution_type`   | ENUM           | Obligatoire ou facultative    |
| `default_amount`      | DECIMAL        | Montant demandé par défaut    |
| `allow_custom_amount` | BOOLEAN        | Autorise un montant différent |
| `allow_overpayment`   | BOOLEAN        | Autorise un montant supérieur |
| `start_date`          | DATE           | Date de début                 |
| `due_date`            | DATE, nullable | Date limite                   |
| `status`              | ENUM           | Statut de la cotisation       |
| `created_by`          | UUID           | Administrateur créateur       |
| `created_at`          | TIMESTAMP      | Date de création              |
| `updated_at`          | TIMESTAMP      | Date de modification          |

Valeurs de `contribution_type` :

```text
mandatory
optional
```

Valeurs de `status` :

```text
draft
active
completed
archived
cancelled
```

---

# 8. Table `member_exceptional_contributions`

Cette table relie les membres aux cotisations exceptionnelles.

```text
member_exceptional_contributions
```

| Propriété                     | Type           | Description               |
| ----------------------------- | -------------- | ------------------------- |
| `id`                          | UUID           | Identifiant               |
| `exceptional_contribution_id` | UUID           | Cotisation exceptionnelle |
| `member_id`                   | UUID           | Membre concerné           |
| `amount_due`                  | DECIMAL        | Montant demandé au membre |
| `amount_paid`                 | DECIMAL        | Montant versé             |
| `remaining_amount`            | DECIMAL        | Montant restant           |
| `status`                      | ENUM           | Situation du membre       |
| `is_exempted`                 | BOOLEAN        | Indique une exemption     |
| `exemption_id`                | UUID, nullable | Exemption associée        |
| `created_at`                  | TIMESTAMP      | Date d’affectation        |
| `updated_at`                  | TIMESTAMP      | Date de modification      |

Valeurs de `status` :

```text
unpaid
partial
paid
exempted
```

Contrainte recommandée :

```text
Un membre ne peut être affecté qu’une seule fois à une cotisation exceptionnelle.
```

---

# 9. Table `payments`

Cette table enregistre chaque somme d’argent reçue.

```text
payments
```

| Propriété             | Type                | Description                             |
| --------------------- | ------------------- | --------------------------------------- |
| `id`                  | UUID                | Identifiant du paiement                 |
| `organization_id`     | UUID                | Organisation concernée                  |
| `member_id`           | UUID                | Membre ayant payé                       |
| `cashbox_id`          | UUID                | Caisse ayant reçu l’argent              |
| `payment_number`      | VARCHAR             | Référence interne unique                |
| `payment_type`        | ENUM                | Type de paiement                        |
| `total_amount`        | DECIMAL             | Montant total reçu                      |
| `payment_date`        | TIMESTAMP           | Date réelle du paiement                 |
| `payment_method`      | ENUM                | Moyen de paiement                       |
| `external_reference`  | VARCHAR, nullable   | Référence Mobile Money, banque ou autre |
| `status`              | ENUM                | Statut du paiement                      |
| `note`                | TEXT, nullable      | Commentaire                             |
| `recorded_by`         | UUID                | Administrateur ayant saisi le paiement  |
| `validated_by`        | UUID, nullable      | Administrateur ayant validé             |
| `validated_at`        | TIMESTAMP, nullable | Date de validation                      |
| `cancelled_at`        | TIMESTAMP, nullable | Date d’annulation                       |
| `cancellation_reason` | TEXT, nullable      | Motif d’annulation                      |
| `source_type`         | ENUM                | Origine normale ou import initial       |
| `created_at`          | TIMESTAMP           | Date de création                        |
| `updated_at`          | TIMESTAMP           | Date de modification                    |

Valeurs de `payment_type` :

```text
membership_fee
monthly_due
exceptional_contribution
mixed
other
```

Valeurs de `payment_method` :

```text
cash
orange_money
mtn_money
moov_money
wave
bank_transfer
other
```

Valeurs de `status` :

```text
pending
validated
cancelled
```

Valeurs de `source_type` :

```text
application
initial_import
```

---

# 10. Table `payment_allocations`

Cette table répartit un paiement entre plusieurs cotisations.

```text
payment_allocations
```

| Propriété                            | Type           | Description                      |
| ------------------------------------ | -------------- | -------------------------------- |
| `id`                                 | UUID           | Identifiant                      |
| `payment_id`                         | UUID           | Paiement concerné                |
| `allocation_type`                    | ENUM           | Type de dette réglée             |
| `membership_fee_id`                  | UUID, nullable | Droit d’adhésion réglé           |
| `monthly_due_id`                     | UUID, nullable | Mensualité réglée                |
| `member_exceptional_contribution_id` | UUID, nullable | Cotisation exceptionnelle réglée |
| `allocated_amount`                   | DECIMAL        | Montant affecté                  |
| `created_at`                         | TIMESTAMP      | Date d’affectation               |

Valeurs de `allocation_type` :

```text
membership_fee
monthly_due
exceptional_contribution
member_credit
```

Exemple :

```text
Paiement reçu : 15 000 FCFA

5 000 FCFA → mensualité d’avril
5 000 FCFA → mensualité de mai
3 000 FCFA → mensualité de juin
2 000 FCFA → avance du membre
```

Règle importante :

```text
Somme des affectations = montant total du paiement
```

---

# 11. Table `member_credits`

Cette table conserve les avances disponibles des membres.

```text
member_credits
```

| Propriété          | Type           | Description                    |
| ------------------ | -------------- | ------------------------------ |
| `id`               | UUID           | Identifiant                    |
| `member_id`        | UUID           | Membre concerné                |
| `payment_id`       | UUID, nullable | Paiement ayant généré l’avance |
| `amount`           | DECIMAL        | Montant de l’avance            |
| `remaining_amount` | DECIMAL        | Montant encore disponible      |
| `status`           | ENUM           | État de l’avance               |
| `created_at`       | TIMESTAMP      | Date de création               |
| `updated_at`       | TIMESTAMP      | Date de modification           |

Valeurs de `status` :

```text
available
partially_used
used
cancelled
```

Une autre table peut enregistrer chaque utilisation d’une avance.

---

# 12. Table `cashboxes`

Cette table contient toutes les caisses séparées.

```text
cashboxes
```

| Propriété         | Type           | Description               |
| ----------------- | -------------- | ------------------------- |
| `id`              | UUID           | Identifiant de la caisse  |
| `organization_id` | UUID           | Organisation propriétaire |
| `name`            | VARCHAR        | Nom de la caisse          |
| `code`            | VARCHAR        | Code unique               |
| `description`     | TEXT, nullable | Description               |
| `cashbox_type`    | ENUM           | Type de caisse            |
| `opening_balance` | DECIMAL        | Solde initial             |
| `current_balance` | DECIMAL        | Solde actuel mis en cache |
| `is_active`       | BOOLEAN        | Caisse utilisable ou non  |
| `created_by`      | UUID           | Administrateur créateur   |
| `created_at`      | TIMESTAMP      | Date de création          |
| `updated_at`      | TIMESTAMP      | Date de modification      |

Valeurs possibles de `cashbox_type` :

```text
membership
monthly
exceptional
general
project
other
```

Le véritable solde doit toujours pouvoir être recalculé à partir des mouvements de caisse.

---

# 13. Table `cashbox_transactions`

Cette table constitue le registre financier de chaque caisse.

```text
cashbox_transactions
```

| Propriété            | Type           | Description              |
| -------------------- | -------------- | ------------------------ |
| `id`                 | UUID           | Identifiant du mouvement |
| `cashbox_id`         | UUID           | Caisse concernée         |
| `transaction_type`   | ENUM           | Nature du mouvement      |
| `direction`          | ENUM           | Entrée ou sortie         |
| `amount`             | DECIMAL        | Montant                  |
| `payment_id`         | UUID, nullable | Paiement associé         |
| `disbursement_id`    | UUID, nullable | Décaissement associé     |
| `transfer_id`        | UUID, nullable | Transfert associé        |
| `opening_balance_id` | UUID, nullable | Solde initial associé    |
| `description`        | TEXT           | Libellé                  |
| `transaction_date`   | TIMESTAMP      | Date du mouvement        |
| `status`             | ENUM           | Statut                   |
| `created_by`         | UUID           | Auteur                   |
| `created_at`         | TIMESTAMP      | Date de création         |

Valeurs de `transaction_type` :

```text
payment
disbursement
transfer_in
transfer_out
opening_balance
adjustment
payment_cancellation
disbursement_cancellation
```

Valeurs de `direction` :

```text
credit
debit
```

Cette table est essentielle pour pouvoir reconstruire exactement le solde d’une caisse.

---

# 14. Table `disbursements`

Cette table représente les sorties d’argent.

```text
disbursements
```

| Propriété                     | Type                | Description                     |
| ----------------------------- | ------------------- | ------------------------------- |
| `id`                          | UUID                | Identifiant                     |
| `organization_id`             | UUID                | Organisation concernée          |
| `disbursement_number`         | VARCHAR             | Référence unique                |
| `title`                       | VARCHAR             | Titre du décaissement           |
| `reason`                      | TEXT                | Motif                           |
| `category`                    | ENUM                | Catégorie de dépense            |
| `total_amount`                | DECIMAL             | Montant total                   |
| `beneficiary_name`            | VARCHAR, nullable   | Nom du bénéficiaire             |
| `beneficiary_member_id`       | UUID, nullable      | Membre bénéficiaire             |
| `exceptional_contribution_id` | UUID, nullable      | Cotisation exceptionnelle liée  |
| `disbursement_date`           | TIMESTAMP           | Date du décaissement            |
| `status`                      | ENUM                | Statut                          |
| `supporting_document_url`     | TEXT, nullable      | Justificatif                    |
| `note`                        | TEXT, nullable      | Observation                     |
| `recorded_by`                 | UUID                | Administrateur ayant enregistré |
| `validated_by`                | UUID, nullable      | Administrateur validateur       |
| `validated_at`                | TIMESTAMP, nullable | Date de validation              |
| `cancelled_at`                | TIMESTAMP, nullable | Date d’annulation               |
| `cancellation_reason`         | TEXT, nullable      | Motif d’annulation              |
| `source_type`                 | ENUM                | Application ou import           |
| `created_at`                  | TIMESTAMP           | Date de création                |
| `updated_at`                  | TIMESTAMP           | Date de modification            |

Valeurs possibles pour `category` :

```text
member_assistance
event_expense
operations
equipment
transport
communication
other
```

Valeurs de `status` :

```text
pending
validated
cancelled
```

---

# 15. Table `disbursement_allocations`

Cette table indique les caisses utilisées pour financer un décaissement.

```text
disbursement_allocations
```

| Propriété         | Type      | Description                    |
| ----------------- | --------- | ------------------------------ |
| `id`              | UUID      | Identifiant                    |
| `disbursement_id` | UUID      | Décaissement concerné          |
| `cashbox_id`      | UUID      | Caisse prélevée                |
| `amount`          | DECIMAL   | Montant retiré de cette caisse |
| `created_at`      | TIMESTAMP | Date de création               |

Exemple :

```text
Décaissement total : 300 000 FCFA

100 000 FCFA → Caisse mensualités
150 000 FCFA → Caisse mariage
50 000 FCFA → Caisse générale
```

Règle obligatoire :

```text
Somme des allocations = montant total du décaissement
```

---

# 16. Table `cashbox_transfers`

Cette table enregistre les transferts entre deux caisses.

```text
cashbox_transfers
```

| Propriété                | Type                | Description           |
| ------------------------ | ------------------- | --------------------- |
| `id`                     | UUID                | Identifiant           |
| `organization_id`        | UUID                | Organisation          |
| `transfer_number`        | VARCHAR             | Référence unique      |
| `source_cashbox_id`      | UUID                | Caisse source         |
| `destination_cashbox_id` | UUID                | Caisse de destination |
| `amount`                 | DECIMAL             | Montant transféré     |
| `reason`                 | TEXT                | Motif                 |
| `transfer_date`          | TIMESTAMP           | Date                  |
| `status`                 | ENUM                | Statut                |
| `recorded_by`            | UUID                | Auteur                |
| `validated_by`           | UUID, nullable      | Validateur            |
| `cancelled_at`           | TIMESTAMP, nullable | Date d’annulation     |
| `created_at`             | TIMESTAMP           | Date de création      |

Valeurs de `status` :

```text
pending
validated
cancelled
```

Un transfert validé génère :

```text
Une sortie dans la caisse source
Une entrée dans la caisse destination
```

---

# 17. Table `exemptions`

Cette table enregistre les exemptions accordées aux membres.

```text
exemptions
```

| Propriété                            | Type                | Description                         |
| ------------------------------------ | ------------------- | ----------------------------------- |
| `id`                                 | UUID                | Identifiant                         |
| `member_id`                          | UUID                | Membre concerné                     |
| `exemption_type`                     | ENUM                | Type de cotisation exemptée         |
| `monthly_due_id`                     | UUID, nullable      | Mensualité concernée                |
| `member_exceptional_contribution_id` | UUID, nullable      | Cotisation exceptionnelle concernée |
| `reason`                             | TEXT                | Motif obligatoire                   |
| `decision_date`                      | DATE                | Date de décision                    |
| `granted_by`                         | UUID                | Administrateur ayant enregistré     |
| `document_url`                       | TEXT, nullable      | Document justificatif               |
| `status`                             | ENUM                | Statut de l’exemption               |
| `cancelled_at`                       | TIMESTAMP, nullable | Date d’annulation                   |
| `cancellation_reason`                | TEXT, nullable      | Motif d’annulation                  |
| `created_at`                         | TIMESTAMP           | Date de création                    |

Valeurs de `exemption_type` :

```text
monthly_due
exceptional_contribution
```

Valeurs de `status` :

```text
active
cancelled
```

---

# 18. Table `member_suspensions`

Cette table contient les enquêtes disciplinaires et suspensions.

```text
member_suspensions
```

| Propriété               | Type                | Description                                 |
| ----------------------- | ------------------- | ------------------------------------------- |
| `id`                    | UUID                | Identifiant                                 |
| `member_id`             | UUID                | Membre concerné                             |
| `reason`                | TEXT                | Motif de l’enquête                          |
| `started_at`            | TIMESTAMP           | Date de début                               |
| `expected_end_date`     | DATE, nullable      | Date estimée de fin                         |
| `suspended_by`          | UUID                | Responsable de la suspension                |
| `contribution_policy`   | ENUM                | Traitement des cotisations durant l’enquête |
| `investigation_status`  | ENUM                | Statut de l’enquête                         |
| `final_decision`        | ENUM, nullable      | Décision finale                             |
| `final_decision_reason` | TEXT, nullable      | Motif de la décision                        |
| `decided_by`            | UUID, nullable      | Responsable de la décision                  |
| `decided_at`            | TIMESTAMP, nullable | Date de décision                            |
| `notes`                 | TEXT, nullable      | Observations                                |
| `created_at`            | TIMESTAMP           | Date de création                            |
| `updated_at`            | TIMESTAMP           | Date de modification                        |

Valeurs de `contribution_policy` :

```text
continue_generation
pause_generation
```

Valeurs de `investigation_status` :

```text
open
in_progress
completed
cancelled
```

Valeurs de `final_decision` :

```text
reactivated
withdrawn
no_violation
violation_confirmed
```

---

# 19. Table `receipts`

Cette table contient les reçus générés.

```text
receipts
```

| Propriété         | Type           | Description                      |
| ----------------- | -------------- | -------------------------------- |
| `id`              | UUID           | Identifiant                      |
| `organization_id` | UUID           | Organisation                     |
| `payment_id`      | UUID           | Paiement concerné                |
| `member_id`       | UUID           | Membre concerné                  |
| `receipt_number`  | VARCHAR        | Numéro unique du reçu            |
| `pdf_url`         | TEXT, nullable | Lien vers le PDF                 |
| `generated_at`    | TIMESTAMP      | Date de génération               |
| `generated_by`    | UUID           | Utilisateur ayant généré le reçu |
| `status`          | ENUM           | Statut du reçu                   |
| `created_at`      | TIMESTAMP      | Date de création                 |

Valeurs de `status` :

```text
valid
cancelled
replaced
```

Un reçu lié à un paiement annulé doit être marqué comme annulé, et non supprimé.

---

# 20. Table `notifications`

Cette table contient les notifications des utilisateurs.

```text
notifications
```

| Propriété             | Type                | Description                 |
| --------------------- | ------------------- | --------------------------- |
| `id`                  | UUID                | Identifiant                 |
| `user_id`             | UUID                | Destinataire                |
| `title`               | VARCHAR             | Titre                       |
| `message`             | TEXT                | Contenu                     |
| `notification_type`   | ENUM                | Type de notification        |
| `related_entity_type` | VARCHAR, nullable   | Type de ressource liée      |
| `related_entity_id`   | UUID, nullable      | Identifiant de la ressource |
| `is_read`             | BOOLEAN             | Notification lue ou non     |
| `read_at`             | TIMESTAMP, nullable | Date de lecture             |
| `created_at`          | TIMESTAMP           | Date de création            |

Valeurs possibles pour `notification_type` :

```text
payment_registered
payment_corrected
payment_cancelled
membership_validated
monthly_due_reminder
monthly_due_late
exceptional_contribution_created
receipt_available
member_status_changed
general_announcement
```

---

# 21. Table `audit_logs`

Cette table conserve l’historique des actions sensibles.

```text
audit_logs
```

| Propriété         | Type              | Description                         |
| ----------------- | ----------------- | ----------------------------------- |
| `id`              | UUID              | Identifiant                         |
| `organization_id` | UUID              | Organisation                        |
| `user_id`         | UUID              | Utilisateur ayant effectué l’action |
| `action`          | VARCHAR           | Action réalisée                     |
| `entity_type`     | VARCHAR           | Type de donnée modifiée             |
| `entity_id`       | UUID              | Identifiant de la donnée            |
| `old_values`      | JSONB, nullable   | Anciennes valeurs                   |
| `new_values`      | JSONB, nullable   | Nouvelles valeurs                   |
| `reason`          | TEXT, nullable    | Motif                               |
| `ip_address`      | VARCHAR, nullable | Adresse IP                          |
| `created_at`      | TIMESTAMP         | Date de l’action                    |

Exemples d’actions :

```text
payment_created
payment_cancelled
payment_corrected
member_suspended
member_reactivated
member_withdrawn
exemption_granted
cashbox_transfer_validated
disbursement_cancelled
```

---

# 22. Table `imports`

Cette table enregistre chaque migration de données historiques.

```text
imports
```

| Propriété          | Type                | Description               |
| ------------------ | ------------------- | ------------------------- |
| `id`               | UUID                | Identifiant               |
| `organization_id`  | UUID                | Organisation              |
| `import_type`      | ENUM                | Type de données importées |
| `file_name`        | VARCHAR             | Nom du fichier            |
| `file_url`         | TEXT, nullable      | Fichier source            |
| `status`           | ENUM                | État de l’import          |
| `total_rows`       | INTEGER             | Nombre total de lignes    |
| `successful_rows`  | INTEGER             | Lignes importées          |
| `failed_rows`      | INTEGER             | Lignes en erreur          |
| `error_report_url` | TEXT, nullable      | Rapport des erreurs       |
| `imported_by`      | UUID                | Administrateur            |
| `imported_at`      | TIMESTAMP, nullable | Date d’import             |
| `validated_by`     | UUID, nullable      | Responsable ayant validé  |
| `notes`            | TEXT, nullable      | Observations              |
| `created_at`       | TIMESTAMP           | Date de création          |

Valeurs possibles de `import_type` :

```text
members
membership_fees
monthly_dues
exceptional_contributions
payments
disbursements
cashbox_balances
full_migration
```

Valeurs de `status` :

```text
draft
processing
completed
partially_completed
failed
validated
```

---

# 23. Table `opening_balances`

Cette table contient les soldes existants avant le lancement de l’application.

```text
opening_balances
```

| Propriété                 | Type           | Description            |
| ------------------------- | -------------- | ---------------------- |
| `id`                      | UUID           | Identifiant            |
| `organization_id`         | UUID           | Organisation           |
| `cashbox_id`              | UUID           | Caisse concernée       |
| `amount`                  | DECIMAL        | Solde initial          |
| `balance_date`            | DATE           | Date du solde          |
| `source_description`      | TEXT           | Origine du montant     |
| `supporting_document_url` | TEXT, nullable | Justificatif           |
| `import_id`               | UUID, nullable | Import associé         |
| `status`                  | ENUM           | Statut                 |
| `recorded_by`             | UUID           | Administrateur         |
| `validated_by`            | UUID, nullable | Responsable validateur |
| `created_at`              | TIMESTAMP      | Date de création       |

Valeurs de `status` :

```text
pending
validated
cancelled
```

Un solde d’ouverture validé doit créer un mouvement de crédit dans `cashbox_transactions`.

---

# Relations principales

```text
organizations
 ├── users
 ├── members
 ├── cashboxes
 ├── exceptional_contributions
 ├── payments
 ├── disbursements
 └── imports
```

```text
members
 ├── membership_fees
 ├── monthly_dues
 ├── member_exceptional_contributions
 ├── payments
 ├── member_credits
 ├── exemptions
 └── member_suspensions
```

```text
payments
 ├── payment_allocations
 ├── receipts
 └── cashbox_transactions
```

```text
disbursements
 ├── disbursement_allocations
 └── cashbox_transactions
```

```text
cashboxes
 ├── payments
 ├── disbursement_allocations
 ├── cashbox_transfers
 ├── opening_balances
 └── cashbox_transactions
```

# Tables vraiment indispensables pour le MVP

Pour commencer le développement sans construire les 23 tables immédiatement, les tables prioritaires sont :

```text
organizations
users
members
membership_fees
monthly_dues
exceptional_contributions
member_exceptional_contributions
payments
payment_allocations
cashboxes
cashbox_transactions
disbursements
disbursement_allocations
receipts
```

Les tables suivantes peuvent arriver dans une deuxième étape :

```text
member_credits
cashbox_transfers
exemptions
member_suspensions
notifications
audit_logs
imports
opening_balances
monthly_fee_rates
```

La table la plus importante n’est pas seulement `payments`, mais le trio :

```text
payments
payment_allocations
cashbox_transactions
```

`payments` indique combien le membre a remis, `payment_allocations` indique quelles cotisations ont été réglées, et `cashbox_transactions` indique dans quelle caisse l’argent est réellement entré.
