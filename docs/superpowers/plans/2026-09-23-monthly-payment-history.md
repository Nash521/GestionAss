# Historique des paiements mensuels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Afficher les six derniers paiements mensuels individuels, conserver la relance WhatsApp et permettre d’ouvrir un historique complet paginé.

**Architecture:** La RPC finance existante garde ses résumés et ses onglets exceptionnels/décaissements, mais l’onglet mensualités renvoie des événements de paiement au lieu de soldes agrégés. Une carte réutilisable sert l’aperçu et la page complète. Les événements sont calculés et cloisonnés côté serveur; le mobile ne reçoit que les données de l’organisation de l’administrateur authentifié.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Edge Functions, PostgreSQL, pgTAP et tests Node existants.

---

## Découpage des fichiers

- Create supabase/tests/admin_monthly_payment_history.sql — tests pgTAP d’ordre, cumul, limite et isolation.
- Create supabase/migrations/202609230002_admin_monthly_payment_history.sql — index de lecture ciblé et remplacement de get_admin_finance en conservant les résumés et les deux autres onglets.
- Modify apps/mobile/src/lib/supabase.ts — type de transaction mensuelle et contrat AdminFinance.
- Create apps/mobile/src/features/finance/monthly-payment-card.tsx — carte partagée avec statut historique, reste conditionnel et WhatsApp.
- Modify apps/mobile/app/(admin)/finances.tsx — aperçu limité à six; résumé et autres onglets restent inchangés.
- Create apps/mobile/app/(admin)/finances/monthly-transactions.tsx — historique complet paginé.
- Modify apps/mobile/test/finance.test.mjs — tests du contrat, rendu, limite et autres onglets.
- Modify apps/mobile/test/routes.test.mjs — route d’historique et navigation.

## Contrat de transaction

Chaque événement contient id, memberId, firstName, lastName, phone, month, amount, paidOn, source, statusAfterPayment et remainingAfterPayment.

- amount est le montant de cette ligne contribution_payments, pas le total cumulé.
- month est contribution_month au format ISO YYYY-MM-DD.
- source conserve wave ou manual; l’interface affiche « Wave » ou « Espèces » comme confirmé par le demandeur.
- statusAfterPayment vaut paid ou partial selon le cumul chronologique de la mensualité.
- remainingAfterPayment vaut le reste positif lorsque le statut est partial et null lorsque le statut est paid.
- L’aperçu passe limit = 6; l’historique complet utilise des pages de 20 selon metadata.

### Task 1: Couvrir les règles métier par pgTAP

**Files:**
- Create: supabase/tests/admin_monthly_payment_history.sql

- [ ] **Step 1: Écrire un scénario qui distingue transactions et soldes.** Créer deux organisations avec administrateurs actifs, membres et mensualités. Pour un dû de 1 000, appeler trois fois record_contribution_payment(admin_id, 'monthly', due_id, amount, paid_on, reference, source) avec 400/manual, 350/wave et 250/manual. Appeler get_admin_finance(admin_id, 'monthly', 0, 20) et vérifier trois lignes séparées, les montants transactionnels, le mois, le membre, les dates et les sources. Vérifier statusAfterPayment = partial, partial, paid et remainingAfterPayment = 600, 250, null. Vérifier également que l’administrateur inactif ou d’une autre organisation est refusé.
- [ ] **Step 2: Couvrir ordre, pagination et cloisonnement.** Ajouter au moins huit paiements pour vérifier qu’une limite de six retourne les six dates les plus récentes en ordre descendant, que l’offset renvoie la page suivante sans doublons, que l’organisation voisine et les paiements d’adhésion/exceptionnels sont exclus, et que created_at puis id départagent deux événements de même paid_on.
- [ ] **Step 3: Vérifier le rouge.** Exécuter pnpm dlx supabase test db supabase/tests/admin_monthly_payment_history.sql --local. Attendu avant migration : échec des assertions portant sur le contrat par transaction; toute erreur de fixture doit être corrigée avant de continuer.

### Task 2: Implémenter le contrat SQL

**Files:**
- Create: supabase/migrations/202609230002_admin_monthly_payment_history.sql
- Test: supabase/tests/admin_monthly_payment_history.sql

- [ ] **Step 1: Ajouter un index partiel pour les paiements mensuels.** Créer un index dont les clés commencent par organization_id, monthly_contribution_due_id, paid_on, created_at et id; appliquer un prédicat où monthly_contribution_due_id n’est pas null.
- [ ] **Step 2: Remplacer la RPC sans altérer ses autres branches.** Reprendre la fonction public.get_admin_finance(uuid, text, integer, integer) de supabase/migrations/202608200001_finance_management.sql en CREATE OR REPLACE. Conserver le contrôle d’administrateur actif, les validations d’onglet/pagination, search_path vide, le résumé mensuel et à l’identique les branches exceptional et disbursements.
- [ ] **Step 3: Calculer le cumul historique.** Dans la branche monthly, joindre contribution_payments, monthly_contribution_dues et members; filtrer sur l’organisation validée et sur monthly_contribution_due_id non null. Calculer les paiements cumulés de chaque dû avec:

~~~sql
sum(p.amount) over (
  partition by p.monthly_contribution_due_id
  order by p.paid_on, p.created_at, p.id
  rows between unbounded preceding and current row
)
~~~

- [ ] **Step 4: Sérialiser le statut et la pagination.** Pour chaque ligne, renvoyer le montant de l’événement, paidOn, source, le membre et son téléphone, le mois concerné, le statut paid si le cumul atteint amount_due sinon partial, et remainingAfterPayment uniquement pour partial. metadata.total compte les événements mensuels de l’organisation. Trier l’historique par paid_on desc, created_at desc, id desc, puis appliquer offset_value et limit_value.
- [ ] **Step 5: Garder les permissions restreintes.** Révoquer l’exécution à public et accorder uniquement service_role, comme dans la migration finance existante; ne pas accorder cette RPC à authenticated.
- [ ] **Step 6: Vérifier le vert pgTAP.** Relancer le test ciblé; attendu : toutes les assertions passent. Puis exécuter pnpm dlx supabase test db --local pour détecter toute régression SQL.

### Task 3: Définir le modèle mobile

**Files:**
- Modify: apps/mobile/src/lib/supabase.ts
- Modify: apps/mobile/test/finance.test.mjs

- [ ] **Step 1: Écrire le test de contrat.** Vérifier que MonthlyPaymentTransaction expose identité, mois, amount, paidOn, source, statusAfterPayment et remainingAfterPayment. Vérifier que getAdminFinance('monthly', 0, 6) transmet exactement { tab: 'monthly', offset: 0, limit: 6 } à get-admin-finance et préserve les montants retournés.
- [ ] **Step 2: Vérifier le rouge.** Lancer node --test apps/mobile/test/finance.test.mjs; attendu : le type ou contrat transactionnel manque avant modification.
- [ ] **Step 3: Ajouter le type sans casser les autres onglets.** Définir source comme "manual" | "wave", statusAfterPayment comme "paid" | "partial" et remainingAfterPayment comme number | null. Ajouter MonthlyPaymentTransaction au tableau mensuel d’AdminFinance sans changer les éléments ExceptionalContribution ou Disbursement.
- [ ] **Step 4: Vérifier le vert.** Relancer le test finance ciblé et pnpm --dir apps/mobile typecheck; attendu : succès.

### Task 4: Créer une carte transactionnelle réutilisable

**Files:**
- Create: apps/mobile/src/features/finance/monthly-payment-card.tsx
- Modify: apps/mobile/test/finance.test.mjs

- [ ] **Step 1: Ajouter les assertions de rendu.** Tester le nom du membre, le mois formaté, le montant de la transaction, la date, Wave/Espèces, Payé/Partiel, l’affichage du reste uniquement pour partial et la présence de l’action WhatsApp.
- [ ] **Step 2: Vérifier le rouge.** Lancer node --test apps/mobile/test/finance.test.mjs; attendu : le contrat de carte dédiée manque.
- [ ] **Step 3: Implémenter la carte typée.** Accepter MonthlyPaymentTransaction; afficher un nom de repli si le profil est incomplet; formater le mois en français et paidOn avec apps/mobile/src/lib/date-format.ts; traduire source et statut. Afficher remainingAfterPayment seulement en statut partial. Réutiliser la relance WhatsApp avec phone, firstName et month; ne pas afficher d’identifiants techniques.
- [ ] **Step 4: Vérifier tests et typecheck.** Relancer les tests finance et le typecheck mobile; attendu : carte typée, sans régression.

### Task 5: Remplacer l’aperçu Mensualités par les six dernières transactions

**Files:**
- Modify: apps/mobile/app/(admin)/finances.tsx
- Modify: apps/mobile/test/finance.test.mjs
- Modify: apps/mobile/test/routes.test.mjs

- [ ] **Step 1: Écrire les tests d’aperçu.** Vérifier que monthly demande limit 6, rend MonthlyPaymentCard, conserve le résumé, et affiche Voir toutes les transactions seulement si metadata.total > 6. Vérifier le chemin Router /(admin)/finances/monthly-transactions.
- [ ] **Step 2: Vérifier le rouge.** Lancer node --test apps/mobile/test/finance.test.mjs apps/mobile/test/routes.test.mjs; attendu : le contrat six éléments/lien échoue avant implémentation.
- [ ] **Step 3: Ajuster seulement la limite mensuelle.** Dans le chargement de finances, choisir six pour monthly et conserver PAGE_SIZE = 20 pour exceptional et disbursements. Garder la séquence de requête protégeant les réponses asynchrones obsolètes, les états loading et error et l’état vide.
- [ ] **Step 4: Relier la carte et le lien.** Afficher les transactions reçues sous le résumé existant; garder les autres onglets inchangés. Ajouter un bouton/lien accessible vers la route d’historique et le masquer si six transactions ou moins existent.
- [ ] **Step 5: Vérifier tests et typecheck.** Relancer les deux tests Node et pnpm --dir apps/mobile typecheck; attendu : succès.

### Task 6: Ajouter l’historique complet paginé

**Files:**
- Create: apps/mobile/app/(admin)/finances/monthly-transactions.tsx
- Modify: apps/mobile/test/routes.test.mjs
- Modify: apps/mobile/test/finance.test.mjs

- [ ] **Step 1: Écrire le test de pagination.** Vérifier getAdminFinance('monthly', offset, 20), la concaténation sans doublons, et le contrôle Charger plus tant que items.length < metadata.total.
- [ ] **Step 2: Vérifier le rouge.** Lancer node --test apps/mobile/test/routes.test.mjs apps/mobile/test/finance.test.mjs; attendu : route et contrat paginé absents.
- [ ] **Step 3: Construire la page.** Ajouter un titre et un retour accessibles, réutiliser MonthlyPaymentCard, charger 20 lignes par requête et concaténer les pages. Garder une séquence de requête pour ignorer les réponses tardives; prévoir séparément les états chargement, liste vide, erreur réessayable et fin de liste. Réutiliser AdminHeader et les styles finance existants.
- [ ] **Step 4: Vérifier navigation, pagination et typecheck.** Relancer les tests Node ciblés et le typecheck mobile; attendu : route fonctionnelle sans charger tout l’historique d’un coup.

### Task 7: Vérification finale

**Files:**
- Test: supabase/tests/admin_monthly_payment_history.sql
- Test: apps/mobile/test/finance.test.mjs
- Test: apps/mobile/test/routes.test.mjs

- [ ] **Step 1: Lancer pnpm quality.** Attendu : typecheck, tests, lint et tests Edge réussis; relever les tests ignorés comme dépendants de services.
- [ ] **Step 2: Lancer pnpm dlx supabase test db --local.** Attendu : toutes les suites pgTAP passent.
- [ ] **Step 3: Relire la migration et le diff.** Exécuter git diff --check; vérifier les validations d’organisation, les permissions service_role et l’absence de fichiers générés ou secrets.
- [ ] **Step 4: Tester sur téléphone avec des données de test.** Vérifier Wave, Espèces, un paiement partiel puis complet, la liste des six derniers, WhatsApp, l’absence du reste sur Payé, et la pagination. Ne pas effectuer ces essais sur des données de membres réels ni présenter une base locale comme preuve de production.
