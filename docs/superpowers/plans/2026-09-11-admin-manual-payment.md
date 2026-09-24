# Paiement manuel administrateur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre l’enregistrement d’un paiement manuel par sélection du membre et de sa cotisation ouverte.

**Architecture:** Une Edge Function dédiée renvoie les échéances ouvertes d’un membre après contrôle JWT, rôle actif et organisation. Le mobile utilise cette liste et l’action financière SQL existante pour enregistrer le paiement atomiquement.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Supabase Edge Functions, PostgreSQL, Deno et tests Node.

---

### Task 1: Endpoint backend des échéances ouvertes

**Files:**
- Create: `supabase/migrations/202609110002_admin_open_dues.sql`
- Create: `supabase/functions/get-member-open-dues/index.ts`
- Test: `supabase/functions/get-member-open-dues/index_test.ts`

- [ ] **Step 1: Write failing tests** pour JWT absent/invalide, administrateur non actif, membre d’une autre organisation, membre introuvable, réponse vide et sérialisation des échéances ouvertes.
- [ ] **Step 2: Run `deno test -A supabase/functions/get-member-open-dues/index_test.ts`** et confirmer les échecs attendus.
- [ ] **Step 3: Add SQL RPC** `get_member_open_dues(admin_id, target_member_id)` avec vérification d’organisation et retour des trois types d’échéances dont `remaining_amount > 0`.
- [ ] **Step 4: Implement the Edge Function** avec validation stricte de `memberId`, identité issue du JWT, mapping d’erreurs sûr et réponse typée `{ dues }`.
- [ ] **Step 5: Run the focused tests** puis `deno check supabase/functions/get-member-open-dues/index.ts`.
- [ ] **Step 6: Commit** avec `feat: add open dues lookup for manual payments`.

### Task 2: Client typé et formulaire de sélection

**Files:**
- Modify: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/app/(admin)/finances/new.tsx`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write failing mobile contract tests** pour le client `getMemberOpenDues`, le chargement après sélection et l’absence de saisie manuelle d’un identifiant de cotisation.
- [ ] **Step 2: Run `pnpm --filter mobile test`** et confirmer les échecs attendus.
- [ ] **Step 3: Add typed client functions** `getMemberOpenDues(memberId)` et les types d’échéances ouvertes.
- [ ] **Step 4: Replace the payment ID field** par une sélection recherchable de membre, un état de chargement, une sélection d’échéance et l’affichage du solde restant.
- [ ] **Step 5: Validate payment amount locally** contre le solde affiché, tout en conservant la validation backend atomique.
- [ ] **Step 6: Add accessible UX states** : libellés, focus clavier, bouton désactivé pendant les appels, erreurs et confirmation de succès.
- [ ] **Step 7: Run `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`**.
- [ ] **Step 8: Commit** avec `feat: improve manual payment form selection`.

### Task 3: Intégration et qualité

**Files:**
- Modify: `docs/audit-codebase-2026-09-09.md`

- [ ] **Step 1: Apply the migration** avec `pnpm dlx supabase@latest migration up --local`.
- [ ] **Step 2: Run the complete checks** : `pnpm test`, `pnpm typecheck`, `pnpm lint` et `pnpm test:edge`.
- [ ] **Step 3: Verify the admin flow** avec un membre ayant une échéance ouverte et vérifier qu’un montant supérieur au solde est refusé.
- [ ] **Step 4: Update the audit document** avec la gestion des paiements manuels livrée et Wave restant hors périmètre.
- [ ] **Step 5: Commit** avec `test: verify manual payment workflow`.
