# Pending membership request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create inactive application accounts and pending membership requests from verified OTP tokens.

**Architecture:** The Edge Function verifies a phone-bound `otp` token, consumes the invitation atomically, creates Auth and application records with service-role access, and compensates by deleting Auth and releasing the invitation if application writes fail.

**Tech Stack:** Supabase Edge Functions, Supabase Auth Admin API, PostgreSQL RPC, Deno tests.

---

### Task 1: Add atomic invitation-use release

**Files:**
- Create: `supabase/migrations/202607300004_release_consumed_invitation.sql`
- Modify: `supabase/tests/invitation_registration.sql`

- [ ] **Step 1: Write a failing database test**

```sql
select ok(public.release_registration_invitation('40000000-0000-0000-0000-000000000001'), 'compensation releases one consumed invitation use');
```

- [ ] **Step 2: Run database tests**

Run: `supabase test db`
Expected: FAIL because the release RPC does not exist.

- [ ] **Step 3: Implement guarded release**

```sql
create function public.release_registration_invitation(invitation_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.organization_invitations set usage_count = usage_count - 1 where id = invitation_id and usage_count > 0;
  return found;
end; $$;
revoke all on function public.release_registration_invitation(uuid) from public;
grant execute on function public.release_registration_invitation(uuid) to service_role;
```

- [ ] **Step 4: Re-run database tests**

Run: `supabase test db`
Expected: PASS.

### Task 2: Create pending requests with compensation

**Files:**
- Create: `supabase/functions/create-membership-request/index.ts`
- Create: `supabase/functions/create-membership-request/index_test.ts`

- [ ] **Step 1: Write failing token-enforcement test**

```ts
const response = await fetch(functionUrl, { method: "POST", body: JSON.stringify({ phone: "+2250701020304" }) });
if (response.status !== 401) throw new Error("OTP token must be required");
```

- [ ] **Step 2: Run test**

Run: `deno task test:edge`
Expected: FAIL because the function is absent.

- [ ] **Step 3: Implement the function**

```ts
const token = await verifyRegistrationToken(otpToken, secret);
if (!token || token.purpose !== "otp" || token.phone !== phone) return response({ error: "Unauthorized" }, 401);
const { data: organizationId, error: invitationError } = await database.rpc("consume_registration_invitation", { invitation_id: token.invitationId });
if (invitationError) return response({ error: "Invalid or expired invitation" }, 400);
const { data: created, error: authError } = await database.auth.admin.createUser({ phone, password, phone_confirm: true });
if (authError || !created.user) { await database.rpc("release_registration_invitation", { invitation_id: token.invitationId }); return response({ error: "Unable to create request" }, 503); }
const rollback = async () => { await database.from("membership_requests").delete().eq("user_id", created.user.id); await database.from("users").delete().eq("id", created.user.id); await database.auth.admin.deleteUser(created.user.id); await database.rpc("release_registration_invitation", { invitation_id: token.invitationId }); };
```

- [ ] **Step 4: Add success and compensation tests**

Run: `deno task test:edge`
Expected: PASS for invalid token, exhausted invitation, success with `is_active: false`, and forced application-write failure cleanup.

- [ ] **Step 5: Commit function work**

Run: `git add supabase/functions/create-membership-request && git commit -m "feat: create pending membership requests"`

### Task 3: Verify the backend flow

**Files:**
- Create: `supabase/.env.example`

- [ ] **Step 1: Document required secret**

```dotenv
REGISTRATION_TOKEN_SECRET=replace-with-a-32-byte-random-secret
SUPABASE_SERVICE_ROLE_KEY=local-development-only
```

- [ ] **Step 2: Run verification**

Run: `supabase test db && deno task test:edge && deno check supabase/functions/create-membership-request/index.ts`
Expected: all commands exit 0.

- [ ] **Step 3: Commit configuration**

Run: `git add supabase/.env.example && git commit -m "docs: configure membership request creation"`
