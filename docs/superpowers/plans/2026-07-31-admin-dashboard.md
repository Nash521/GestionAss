# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local demo administrator and a mobile admin dashboard that displays real organisation membership and fee statistics.

**Architecture:** A local-only Deno seed creates the demo organisation and admin through Supabase's service role. A protected Edge Function derives all dashboard metrics server-side after verifying the bearer token and active admin role. The mobile dashboard uses the function, the supplied background asset, and routes from the current home screen.

**Tech Stack:** Expo Router, React Native, `@expo/vector-icons`, Supabase Edge Functions/Deno, Supabase Auth and Postgres.

---

### Task 1: Local-only demo administrator seed

**Files:**
- Create: `supabase/seed-admin-demo.ts`
- Create: `supabase/seed-admin-demo_test.ts`

- [ ] **Step 1: Write the failing local-safety test**

```ts
Deno.test('seed rejects a non-local Supabase URL', () => {
  assertEquals(isLocalSupabaseUrl('https://project.supabase.co'), false);
  assertEquals(isLocalSupabaseUrl('http://127.0.0.1:54321'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-net --allow-env supabase/seed-admin-demo_test.ts`

Expected: FAIL because `isLocalSupabaseUrl` does not yet exist.

- [ ] **Step 3: Implement the idempotent seed**

```ts
export const DEMO_ADMIN = { phone: '+2250701020304', password: 'Teste01@', organization: 'Association Démo GestionAss' };
export function isLocalSupabaseUrl(url: string) {
  const hostname = new URL(url).hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
}
// Reject non-local SUPABASE_URL, create/reuse the organisation, create/reuse
// the Auth user with phone_confirm: true, then upsert public.users as an active admin.
```

Use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only; abort when either is absent or the URL is not local. Print the phone and organisation after success, never the password.

- [ ] **Step 4: Run tests and seed the local instance**

Run: `deno test --allow-net --allow-env supabase/seed-admin-demo_test.ts` then `deno run --allow-net --allow-env supabase/seed-admin-demo.ts`.

Expected: safety test passes; one active admin exists in the local organisation.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed-admin-demo.ts supabase/seed-admin-demo_test.ts
git commit -m "feat: seed local demo admin"
```

### Task 2: Protected dashboard statistics function

**Files:**
- Create: `supabase/functions/get-admin-dashboard/index.ts`
- Create: `supabase/functions/get-admin-dashboard/index_test.ts`

- [ ] **Step 1: Write a failing contract test**

```ts
Deno.test('get-admin-dashboard rejects a request without a bearer token', async () => {
  const response = await fetch('http://127.0.0.1:8000', { method: 'POST' });
  assertEquals(response.status, 401);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/get-admin-dashboard/index_test.ts`

Expected: FAIL because the function does not yet exist.

- [ ] **Step 3: Implement the function**

Verify the bearer token with `auth.getUser`, read that user's `organization_id`, `role`, and `is_active`, and return 401 unless they are an active admin. Query members and membership fees scoped to that organisation and return:

```ts
type DashboardSummary = {
  organizationName: string;
  totalMembers: number;
  membersPaid: number;
  membersLate: number;
  totalDue: number;
  totalCollected: number;
  totalOutstanding: number;
};
```

`membersLate` counts `unpaid` and `partial`; all monetary values are sums of `amount_due`, `amount_paid`, and `remaining_amount`, defaulting to zero. Use the service-role client only after authentication succeeds.

- [ ] **Step 4: Run the contract test and type-check**

Run: `deno check supabase/functions/get-admin-dashboard/index.ts` and `deno test --allow-net --allow-env --allow-run supabase/functions/get-admin-dashboard/index_test.ts`.

Expected: type check succeeds and the unauthenticated request returns 401.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/get-admin-dashboard
git commit -m "feat: add admin dashboard statistics"
```

### Task 3: Mobile dashboard route and data client

**Files:**
- Modify: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/app/(admin)/dashboard.tsx`
- Modify: `apps/mobile/app/home.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write failing source-contract tests**

```js
test('the admin dashboard uses protected statistics and its supplied background', async () => {
  const source = await readFile(new URL('../app/(admin)/dashboard.tsx', import.meta.url), 'utf8');
  assert.match(source, /getAdminDashboard/);
  assert.match(source, /arriere_plan_admin\.png/);
  assert.match(source, /membership-requests/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the dashboard route and client helper do not exist.

- [ ] **Step 3: Add the typed client helper and dashboard**

Add `getAdminDashboard()` in `src/lib/supabase.ts`, calling `invokeRegistrationFunction<DashboardSummary>('get-admin-dashboard', {})`.

In `app/(admin)/dashboard.tsx`, load this helper in `useEffect`, render a loading and error state, then use an `ImageBackground` with `arriere_plan_admin.png`. Match the maquette with a greeting, six metric cards, Feather icons, and bottom navigation. Format XOF with `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })`. Link the requests card to `/(admin)/membership-requests`; leave Members, Finance, Events and Settings as explicit “Bientôt disponible” alerts. For the graph and transactions, render `Module Finances bientôt disponible` rather than fake values.

Replace the existing admin link in `app/home.tsx` with a role-aware redirect to `/(admin)/dashboard`; member accounts keep the generic member home.

- [ ] **Step 4: Run mobile verification**

Run: `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`.

Expected: all source-contract tests and TypeScript checking pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/supabase.ts apps/mobile/app/(admin)/dashboard.tsx apps/mobile/app/home.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: add admin dashboard"
```

### Task 4: End-to-end local verification

**Files:**
- Modify: `docs/superpowers/specs/2026-07-31-admin-dashboard-design.md` only if verification exposes a documented mismatch.

- [ ] **Step 1: Start local Supabase and apply migrations**

Run: `npx --yes supabase@latest start` then `npx --yes supabase@latest db reset`.

- [ ] **Step 2: Seed the demo account**

Run: `deno run --allow-net --allow-env supabase/seed-admin-demo.ts`.

Expected: output identifies `Association Démo GestionAss` and `+2250701020304`.

- [ ] **Step 3: Verify final checks**

Run: `pnpm --filter mobile test`, `pnpm --filter mobile typecheck`, `deno check supabase/functions/get-admin-dashboard/index.ts`, and its Deno test.

Expected: all commands exit 0.

- [ ] **Step 4: Commit any verification documentation adjustment**

```bash
git add docs/superpowers/specs/2026-07-31-admin-dashboard-design.md
git commit -m "docs: verify admin dashboard" 
```
