# Gestion financière de l’association

## Objectif

Ajouter une page administrateur « Finances » pour suivre les mensualités, gérer les cotisations exceptionnelles et enregistrer les décaissements de l’association.

## Navigation et interface

- L’icône Finances de la barre de navigation administrateur ouvre `/(admin)/finances` et devient active sur cette route.
- La page conserve l’en-tête et la barre inférieure persistante ; elle présente trois onglets : `Mensualités`, `Cotisations exceptionnelles` et `Décaissements`.
- Chaque onglet affiche ses totaux, sa liste paginée et son bouton d’action dans le contexte correspondant.

### Mensualités

- Les paramètres de l’organisation définissent le montant mensuel et le jour d’échéance communs. Ils ne sont pas modifiables depuis Finances.
- Une génération idempotente crée une échéance pour chaque membre actif, par mois et par organisation.
- L’onglet affiche le total mensuel payé, le total restant à payer et l’objectif mensuel (montant mensuel multiplié par les membres actifs concernés).
- La liste affiche les règlements/échéances par membre, montant, solde, statut et date.
- Une action de relance prépare un message WhatsApp pour les membres ayant une échéance impayée ou partielle.

### Cotisations exceptionnelles

- L’administrateur crée une cotisation obligatoire avec un libellé, un montant positif, une date d’échéance et une cible : tous les membres actifs ou une sélection explicite de membres.
- La création ajoute les affectations individuelles et leurs soldes ; elle ne cible jamais un membre d’une autre organisation.
- L’onglet liste les cotisations créées, leur nombre de membres ciblés, le montant encaissé, le solde restant et leur état d’archivage.
- Le détail d’une cotisation affiche les membres concernés et leur statut de règlement.

### Décaissements

- L’administrateur peut enregistrer : une dépense générale, une aide destinée à un membre, ou le règlement par l’association d’une cotisation exceptionnelle.
- Chaque décaissement comporte un montant strictement positif, une date, un type et une justification textuelle obligatoire.
- Une aide exige un membre de la même association ; un règlement exceptionnel exige une cotisation exceptionnelle de la même association. Une dépense générale n’a pas de membre associé.
- L’onglet affiche le total décaissé et une liste datée des sorties avec leur type, bénéficiaire éventuel et justification.

## Règlements et historique

- Les paiements Wave confirmés restent la voie automatique : ils créditent exactement une échéance de droit d’adhésion, mensuelle ou exceptionnelle.
- La page Finances ajoute une saisie manuelle réservée à l’administrateur, pour ces mêmes trois catégories. L’administrateur choisit l’échéance, le montant positif, la date et une référence facultative.
- Un règlement manuel ne peut pas dépasser le solde de l’échéance. Il met à jour le montant payé, le solde et le statut de manière atomique, puis crée une ligne d’historique immuable distinguant `wave` et `manual`.
- Un décaissement ne constitue pas un règlement d’un membre : il est comptabilisé séparément, sauf son type descriptif « cotisation exceptionnelle payée par l’association ».

## Modèle de données et sécurité

- `organizations` reçoit `monthly_contribution_amount` et `monthly_contribution_due_day` avec des valeurs par défaut compatibles pour les organisations existantes.
- Les échéances mensuelles existantes sont complétées par une procédure de génération idempotente et une table d’historique de règlements.
- Les affectations exceptionnelles existantes sont complétées par le même historique de règlements.
- `disbursements` existants reçoivent un type explicite, une justification obligatoire et, si nécessaire, les références du membre ou de la cotisation exceptionnelle concernée.
- Toutes les écritures passent par des RPC/Edge Functions avec session valide, rôle administrateur actif et isolement strict par organisation. Les tables conservent RLS, contraintes de montant et index de liste.

## États, erreurs et tests

- Les listes vides expliquent clairement qu’aucune mensualité, cotisation exceptionnelle ou sortie n’est encore enregistrée.
- Les erreurs de saisie indiquent le champ invalide : montant, échéance, sélection de membres, justification ou solde insuffisant.
- Tests SQL : génération mensuelle sans doublon, cibles exceptionnelles, paiements manuels atomiques, interdiction de dépassement, isolement inter-organisation et contraintes de décaissement.
- Tests Edge Functions : authentification, autorisations, données hors organisation, validation des montants et sérialisation des listes.
- Tests mobile : navigation Finances, onglets, états vides, formulaires, relance WhatsApp et absence de barre locale dupliquée.

## Hors périmètre de cette livraison

- Modification des paramètres mensuels depuis la page Finances.
- Relances WhatsApp envoyées automatiquement : la page prépare seulement le message et ouvre WhatsApp.
- Plusieurs fournisseurs de paiement en ligne ou l’intégration de nouvelles clés Wave.
- Budgets, exports comptables et rapprochement bancaire.
