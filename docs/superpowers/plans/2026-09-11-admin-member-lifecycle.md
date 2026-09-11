# Gestion du cycle de vie des membres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la modification, la suspension, la réactivation et l’archivage logique des membres administrés.

**Architecture:** Une Edge Function authentifie l’administrateur et appelle une fonction SQL atomique, qui applique les transitions et les contraintes d’organisation. L’application mobile ajoute un formulaire d’édition et des actions confirmées sur la fiche membre, avec rechargement après succès.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Supabase Edge Functions, PostgreSQL, tests Node/Deno.

---

### Task 1: Contrat backend et validations SQL

**Files:**
- Create: `supabase/migrations/202609110001_admin_member_lifecycle.sql`
- Test: `supabase/functions/manage-admin-member/index_test.ts`

- [ ] **Step 1: Write failing tests** couvrant l’absence de JWT, l’administrateur inactif, l’organisation différente, les transitions `active`/`suspended`/`removed`, le dernier administrateur actif, le téléphone dupliqué et la conservation des données financières.
- [ ] **Step 2: Run the focused Deno tests** avec `deno test -A supabase/functions/manage-admin-member/index_test.ts` et confirmer les échecs attendus.
- [ ] **Step 3: Add the SQL migration** avec une fonction `manage_admin_member(admin_id, target_member_id, action, first_name, last_name, phone)` en `security definer`, validation d’organisation, verrouillage de ligne, transitions autorisées et mise à jour atomique.
- [ ] **Step 4: Run the focused tests** et confirmer le passage des cas SQL simulés.
- [ ] **Step 5: Commit** avec `feat: add member lifecycle database contract`.

### Task 2: Edge Function d’administration

**Files:**
- Create: `supabase/functions/manage-admin-member/index.ts`
- Modify: `supabase/functions/index_test.ts` (si le registre global existe)

- [ ] **Step 1: Implement request parsing** pour accepter uniquement les actions et champs prévus, avec validation des noms et du numéro ivoirien.
- [ ] **Step 2: Implement authentication and safe error mapping** : JWT obligatoire, identité vérifiée, erreurs SQL converties en réponses `400`, `401`, `404`, `409` ou `503` sans fuite de détails.
- [ ] **Step 3: Call the SQL RPC** en transmettant l’identité issue du JWT, jamais un identifiant administrateur fourni par le client.
- [ ] **Step 4: Run `deno test -A supabase/functions/manage-admin-member/index_test.ts`** et les tests Edge existants.
- [ ] **Step 5: Commit** avec `feat: add member lifecycle edge function`.

### Task 3: Client mobile et formulaire d’édition

**Files:**
- Modify: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/app/(admin)/members/edit.tsx`
- Modify: `apps/mobile/app/(admin)/members/[memberId].tsx`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Add the typed client method** `manageAdminMember` avec les actions et le résultat typés.
- [ ] **Step 2: Add the edit route** avec champs nom, prénom et téléphone, validations locales, clavier adapté, bouton désactivé pendant l’enregistrement et messages accessibles.
- [ ] **Step 3: Add contextual actions** sur la fiche membre : modifier, suspendre, réactiver et archiver selon le statut courant.
- [ ] **Step 4: Add confirmations** pour suspension et archivage, puis recharger la fiche après succès.
- [ ] **Step 5: Add source-level contract tests** pour les routes, libellés accessibles, actions et états d’erreur.
- [ ] **Step 6: Run `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`**.
- [ ] **Step 7: Commit** avec `feat: add member lifecycle mobile actions`.

### Task 4: Vérification d’intégration et qualité

**Files:**
- Modify: `docs/audit-codebase-2026-09-09.md` (section état d’avancement)

- [ ] **Step 1: Apply the migration** sur l’instance Supabase locale et vérifier les transitions avec le compte administrateur de démonstration.
- [ ] **Step 2: Run the complete checks** : `pnpm test`, `pnpm typecheck`, `pnpm lint` et `pnpm test:edge`.
- [ ] **Step 3: Verify the Expo flow** : ouvrir une fiche, modifier, suspendre, réactiver, archiver, puis confirmer que l’historique financier est toujours visible.
- [ ] **Step 4: Update the audit document** avec les fonctionnalités livrées et les limites restantes.
- [ ] **Step 5: Commit** avec `test: verify admin member lifecycle`.
