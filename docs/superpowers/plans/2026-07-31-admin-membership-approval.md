# Admin membership approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an active administrator approve or reject pending membership requests from a temporary mobile admin page.

**Architecture:** A security-definer PostgreSQL function performs the state transition atomically and issues organisation-local member numbers. An authenticated Edge Function invokes it using the caller identity. Expo renders a protected temporary request list and submits decisions through the Edge Function.

**Tech Stack:** PostgreSQL, Supabase Edge Functions, Expo Router, React Native, Deno tests, Node test runner.

---

### Task 1: Create atomic approval and rejection functions

**Files:**
- Create: `supabase/migrations/202607310001_membership_request_decisions.sql`
- Modify: `supabase/tests/authentication.sql`

- [ ] **Step 1: Write the failing approval database test**

```sql
select lives_ok(
  $$ select public.decide_membership_request('30000000-0000-0000-0000-000000000001', 'approved', null, '20000000-0000-0000-0000-000000000001') $$,
  'an active admin approves a pending request'
);
select is((select status::text from public.membership_requests where id = '30000000-0000-0000-0000-000000000001'), 'approved', 'request is approved');
select is((select member_number from public.members where user_id = '10000000-0000-0000-0000-000000000001'), 'M-000001', 'member number is generated');
```

- [ ] **Step 2: Run the database test to verify it fails**

Run: `supabase test db`

Expected: FAIL because `decide_membership_request` does not exist.

- [ ] **Step 3: Implement the transaction**

```sql
alter table public.members drop constraint members_member_number_key;
alter table public.members add constraint members_organization_member_number_key unique (organization_id, member_number);

create function public.decide_membership_request(request_id uuid, decision public.membership_request_status, reason text, admin_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_row public.membership_requests; new_member_id uuid; next_number text;
begin
  select * into request_row from public.membership_requests where id = request_id and status = 'pending' for update;
  if not found or not public.is_active_admin_for_organization(admin_id, request_row.organization_id) then raise exception 'Unauthorized'; end if;
  if decision = 'rejected' then
    if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'Rejection reason required'; end if;
    update public.membership_requests set status = 'rejected', rejection_reason = btrim(reason), reviewed_by = admin_id, reviewed_at = now() where id = request_id;
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(request_row.organization_id::text, 0));
  select 'M-' || lpad((coalesce(max(substring(member_number from 3)::integer), 0) + 1)::text, 6, '0') into next_number from public.members where organization_id = request_row.organization_id;
  insert into public.members (organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values (request_row.organization_id, request_row.user_id, next_number, request_row.first_name, request_row.last_name, request_row.phone, 'active', admin_id) returning id into new_member_id;
  insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status) select new_member_id, membership_fee_amount, 0, membership_fee_amount, 'unpaid' from public.organizations where id = request_row.organization_id;
  update public.users set is_active = true where id = request_row.user_id;
  update public.membership_requests set status = 'approved', member_id = new_member_id, reviewed_by = admin_id, reviewed_at = now() where id = request_id;
  return new_member_id;
end; $$;
```

- [ ] **Step 4: Add rejection, duplicate-decision, and cross-organisation tests; run them**

Run: `supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit database decision logic**

```bash
git add supabase/migrations supabase/tests/authentication.sql
git commit -m "feat: decide membership requests atomically"
```

### Task 2: Add the authenticated decision Edge Function

**Files:**
- Create: `supabase/functions/decide-membership-request/index.ts`
- Create: `supabase/functions/decide-membership-request/index_test.ts`

- [ ] **Step 1: Write the failing unauthenticated request test**

```ts
const response = await fetch("http://127.0.0.1:8000", { method: "POST" });
if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/decide-membership-request/index_test.ts`

Expected: FAIL because the function is absent.

- [ ] **Step 3: Implement the request contract**

```ts
const { requestId, decision, reason } = await request.json();
const { data: { user } } = await database.auth.getUser(bearerToken);
if (!user) return response({ error: "Unauthorized" }, 401);
const { data, error } = await database.rpc("decide_membership_request", { request_id: requestId, decision, reason: decision === "rejected" ? reason : null, admin_id: user.id });
if (error) return response({ error: "Unable to decide request" }, 400);
return response({ memberId: data });
```

- [ ] **Step 4: Run the Edge Function tests**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/decide-membership-request/index_test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the function**

```bash
git add supabase/functions/decide-membership-request
git commit -m "feat: expose membership decisions securely"
```

### Task 3: Create the temporary admin page

**Files:**
- Create: `apps/mobile/app/(admin)/membership-requests.tsx`
- Modify: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing admin route contract test**

```js
const source = await readFile(new URL('../app/(admin)/membership-requests.tsx', import.meta.url), 'utf8');
assert.match(source, /Demandes d’adhésion/);
assert.match(source, /Approuver/);
assert.match(source, /Refuser/);
assert.match(source, /decide-membership-request/);
```

- [ ] **Step 2: Run the mobile tests to verify failure**

Run: `pnpm --filter mobile test`

Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement pending-request list and actions**

```tsx
const { data } = await getSupabaseClient().from("membership_requests").select("id, first_name, last_name, phone, submitted_at").eq("status", "pending").order("submitted_at");
await invokeRegistrationFunction("decide-membership-request", { requestId, decision: "approved" });
await invokeRegistrationFunction("decide-membership-request", { requestId, decision: "rejected", reason });
```

Show a controlled rejection-reason input, disable the active action while submitting, and reload after success.

- [ ] **Step 4: Run tests and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the temporary page**

```bash
git add apps/mobile/app/(admin)/membership-requests.tsx apps/mobile/src/lib/supabase.ts apps/mobile/test/routes.test.mjs
git commit -m "feat: add admin membership request page"
```
