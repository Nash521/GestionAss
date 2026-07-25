# Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-and-password authentication flow where a verified applicant can access the application only after an administrator approves the membership request.

**Architecture:** Expo Router renders the mobile flow and calls Supabase Auth plus typed Edge Functions. PostgreSQL holds application profiles and membership requests; RLS controls visibility while database functions perform approval atomically. Orange SMS is hidden behind an Edge Function provider interface, with a deterministic development provider.

**Tech Stack:** pnpm/Turborepo, Expo, TypeScript, Expo Router, React Hook Form, Zod, Supabase Auth/PostgreSQL/RLS/Edge Functions, Vitest, Maestro.

---

## Planned file structure

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`: workspace commands and package boundaries.
- `apps/mobile`: Expo Router screens, form components and authentication state.
- `packages/validation`: shared phone/password/request schemas.
- `packages/types`: shared database and function payload types.
- `packages/api`: typed Supabase client and Edge Function callers.
- `supabase/migrations`: tables, constraints, RLS policies and approval RPC.
- `supabase/functions`: SMS OTP and membership-decision functions.
- `supabase/tests`: database-level tests for access and approval invariants.

### Task 1: Create the mobile-first monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Create the workspace manifests**

```json
// package.json
{
  "name": "gestion-ass",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev:mobile": "pnpm --filter mobile start",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": { "turbo": "^2.3.0", "typescript": "^5.7.0" }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: Configure Expo Router with a neutral loading route**

```tsx
// apps/mobile/app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 3: Install dependencies and verify the baseline**

Run: `pnpm install && pnpm dev:mobile`

Expected: Expo starts and displays the login route without a routing error.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json apps/mobile
git commit -m "chore: bootstrap Expo authentication workspace"
```

### Task 2: Create shared validation and domain types

**Files:**
- Create: `packages/validation/src/auth.ts`
- Create: `packages/validation/src/auth.test.ts`
- Create: `packages/types/src/auth.ts`

- [ ] **Step 1: Write failing validation tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeIvorianPhone, signUpSchema } from "./auth";

describe("normalizeIvorianPhone", () => {
  it("normalizes a local mobile number", () => {
    expect(normalizeIvorianPhone("07 01 02 03 04")).toBe("+2250701020304");
  });

  it("rejects a number outside Côte d’Ivoire", () => {
    expect(() => normalizeIvorianPhone("+221770102030")).toThrow("Numéro ivoirien invalide");
  });
});

it("requires a strong password", () => {
  expect(signUpSchema.safeParse({ firstName: "Awa", lastName: "Koné", phone: "0701020304", password: "weakpass" }).success).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @gestion-ass/validation test`

Expected: FAIL because the validation module does not yet exist.

- [ ] **Step 3: Implement the schemas and types**

```ts
// packages/validation/src/auth.ts
import { z } from "zod";

export function normalizeIvorianPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^225/, "");
  if (!/^0[157]\d{8}$/.test(digits)) throw new Error("Numéro ivoirien invalide");
  return `+225${digits}`;
}

export const passwordSchema = z.string().min(8).regex(/[A-Z]/).regex(/\d/).regex(/[^A-Za-z0-9]/);
export const signUpSchema = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), phone: z.string().transform(normalizeIvorianPhone), password: passwordSchema });
```

```ts
// packages/types/src/auth.ts
export type MembershipRequestStatus = "pending" | "approved" | "rejected";
export type AccountRole = "admin" | "member";
```

- [ ] **Step 4: Run tests and type checks**

Run: `pnpm --filter @gestion-ass/validation test && pnpm --filter @gestion-ass/validation typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/validation packages/types
git commit -m "feat: add shared authentication validation"
```

### Task 3: Add the authentication database model and RLS

**Files:**
- Create: `supabase/migrations/202607230001_authentication.sql`
- Create: `supabase/tests/authentication.sql`

- [ ] **Step 1: Write the failing database test**

```sql
begin;
select plan(2);
select throws_ok(
  $$ select * from public.membership_requests where user_id <> auth.uid() $$,
  '42501', 'RLS must prevent applicants reading other requests'
);
select * from finish();
rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `supabase test db`

Expected: FAIL because `membership_requests` and its policies do not exist.

- [ ] **Step 3: Create the profile and request tables, constraints and policies**

```sql
create type public.membership_request_status as enum ('pending', 'approved', 'rejected');
create type public.account_role as enum ('admin', 'member');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  role public.account_role not null default 'member',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.is_admin(candidate_id uuid) returns boolean language sql stable security definer
set search_path = public as $$ select exists (select 1 from public.users where id = candidate_id and role = 'admin' and is_active) $$;

create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null unique references auth.users(id),
  first_name text not null,
  last_name text not null,
  phone text not null unique check (phone ~ '^\\+2250[157][0-9]{8}$'),
  status public.membership_request_status not null default 'pending',
  phone_verified_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  member_id uuid unique references public.members(id),
  check ((status = 'rejected') = (rejection_reason is not null))
);

alter table public.membership_requests enable row level security;
create policy "applicant reads own request" on public.membership_requests for select using (user_id = auth.uid());
create policy "admin manages requests" on public.membership_requests for all using (public.is_admin(auth.uid()));

create table public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('registration', 'password_reset')),
  code_hash bytea not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  last_sent_at timestamptz not null default now(),
  consumed_at timestamptz,
  unique (phone, purpose)
);
```

- [ ] **Step 4: Re-run the database test**

Run: `supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607230001_authentication.sql supabase/tests/authentication.sql
git commit -m "feat: add membership request access controls"
```

### Task 4: Implement OTP delivery and verification Edge Functions

**Files:**
- Create: `supabase/functions/_shared/sms.ts`
- Create: `supabase/functions/_shared/otp.ts`
- Create: `supabase/functions/send-registration-otp/index.ts`
- Create: `supabase/functions/verify-registration-otp/index.ts`
- Create: `supabase/functions/_shared/otp.test.ts`

- [ ] **Step 1: Write failing OTP tests**

```ts
import { expect, it } from "jsr:@std/expect";
import { hashOtp, verifyOtp } from "./otp.ts";

it("accepts only the matching unexpired code", async () => {
  const hash = await hashOtp("413829");
  await expect(verifyOtp("413829", hash, new Date(Date.now() + 60_000))).resolves.toBe(true);
  await expect(verifyOtp("000000", hash, new Date(Date.now() + 60_000))).resolves.toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test supabase/functions/_shared/otp.test.ts`

Expected: FAIL because `otp.ts` does not exist.

- [ ] **Step 3: Implement a provider boundary and secure OTP operations**

```ts
// supabase/functions/_shared/sms.ts
export interface SmsProvider { send(input: { to: string; body: string }): Promise<void>; }
export const smsProvider: SmsProvider = Deno.env.get("APP_ENV") === "development"
  ? { send: async () => undefined }
  : { send: async ({ to, body }) => { /* Orange SMS HTTP request using server secret */ } };
```

```ts
// supabase/functions/_shared/otp.ts
export async function hashOtp(code: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code))); }
export async function verifyOtp(code: string, hash: Uint8Array, expiresAt: Date) {
  const candidate = await hashOtp(code);
  let difference = candidate.length ^ hash.length;
  for (let index = 0; index < Math.min(candidate.length, hash.length); index += 1) difference |= candidate[index] ^ hash[index];
  return expiresAt > new Date() && difference === 0;
}
```

- [ ] **Step 4: Add rate limits and persistence in the function handlers**

In `send-registration-otp`, reject a request when `last_sent_at > now() - interval '5 minutes'`; otherwise generate `String(Math.floor(100000 + Math.random() * 900000))`, hash it, and upsert `auth_otps` with `expires_at = now() + interval '10 minutes'`, `attempts = 0` and `consumed_at = null`. In `verify-registration-otp`, lock the matching row, reject expired/consumed rows, increment `attempts` for a mismatch, reject after five attempts, and set `consumed_at = now()` for a match. Return `{"error":"invalid_or_expired_code"}` for every verification failure.

- [ ] **Step 5: Run tests and serve functions locally**

Run: `deno test supabase/functions/_shared/otp.test.ts && supabase functions serve --env-file supabase/.env.local`

Expected: tests PASS; local functions start without missing environment variables in development mode.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions
git commit -m "feat: add registration OTP functions"
```

### Task 5: Implement sign-up, approval, rejection and activation SMS

**Files:**
- Create: `supabase/functions/create-membership-request/index.ts`
- Create: `supabase/functions/decide-membership-request/index.ts`
- Modify: `supabase/migrations/202607230001_authentication.sql`
- Test: `supabase/tests/authentication.sql`

- [ ] **Step 1: Add a failing atomic-approval test**

```sql
select throws_ok(
  $$ select public.approve_membership_request('00000000-0000-0000-0000-000000000000', 'M-001', auth.uid()) $$,
  'P0001', 'approval rejects an invalid pending request'
);
```

- [ ] **Step 2: Implement the approval RPC**

```sql
create function public.approve_membership_request(request_id uuid, new_member_number text, admin_id uuid)
returns uuid language plpgsql security definer as $$
declare request_row public.membership_requests; new_member_id uuid;
begin
  if not public.is_admin(admin_id) then raise exception 'unauthorized'; end if;
  select * into request_row from public.membership_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'request is not pending'; end if;
  insert into public.members (organization_id, user_id, member_number, first_name, last_name, phone, joining_date, status, created_by)
  values (request_row.organization_id, request_row.user_id, new_member_number, request_row.first_name, request_row.last_name, request_row.phone, current_date, 'pending_membership', admin_id)
  returning id into new_member_id;
  insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status)
  select new_member_id, membership_fee_amount, 0, membership_fee_amount, 'unpaid' from public.organizations where id = request_row.organization_id;
  update public.membership_requests set status = 'approved', member_id = new_member_id, reviewed_by = admin_id, reviewed_at = now() where id = request_id;
  return new_member_id;
end; $$;
```

- [ ] **Step 3: Implement the function handlers**

`create-membership-request` creates the Supabase Auth user only after OTP verification, writes the pending request with the service role, then revokes the just-created session. `decide-membership-request` checks the caller role, invokes the RPC for approval or records a mandatory refusal reason and disables the Auth user. Both send an SMS only after their database operation succeeds.

- [ ] **Step 4: Run database and function tests**

Run: `supabase test db && deno test supabase/functions`

Expected: PASS; a failed member creation leaves the request pending and sends no activation SMS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/functions supabase/tests
git commit -m "feat: approve and reject membership requests"
```

### Task 6: Add typed mobile API and session gate

**Files:**
- Create: `packages/api/src/supabase.ts`
- Create: `packages/api/src/auth.ts`
- Create: `apps/mobile/src/features/auth/use-session-gate.ts`
- Create: `apps/mobile/src/features/auth/use-session-gate.test.ts`
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Write the failing session-gate tests**

```ts
import { expect, it } from "vitest";
import { resolveInitialRoute } from "./use-session-gate";

it.each([
  [{ role: "admin", isActive: true, requestStatus: null }, "/(admin)"],
  [{ role: "member", isActive: true, requestStatus: "approved" }, "/(member)"],
  [{ role: "member", isActive: true, requestStatus: "pending" }, "/(auth)/login"],
])("routes account state", (state, route) => expect(resolveInitialRoute(state)).toBe(route));
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test use-session-gate`

Expected: FAIL because `resolveInitialRoute` does not exist.

- [ ] **Step 3: Implement the route resolver and sign-in client**

```ts
export function resolveInitialRoute(state: { role: "admin" | "member"; isActive: boolean; requestStatus: "approved" | "pending" | "rejected" | null }) {
  if (!state.isActive || state.requestStatus === "pending" || state.requestStatus === "rejected") return "/(auth)/login";
  return state.role === "admin" ? "/(admin)" : "/(member)";
}
```

Use `supabase.auth.signInWithPassword({ phone, password })`; after success, fetch the application user and request status, sign out disallowed accounts and display the matching message.

- [ ] **Step 4: Re-run the unit tests**

Run: `pnpm --filter mobile test use-session-gate`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api apps/mobile
git commit -m "feat: gate mobile sessions by approval status"
```

### Task 7: Build the mobile sign-up and OTP screens from the maquettes

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Create: `apps/mobile/app/(auth)/verify-phone.tsx`
- Create: `apps/mobile/app/(auth)/request-pending.tsx`
- Create: `apps/mobile/src/features/auth/components/auth-field.tsx`
- Create: `apps/mobile/src/features/auth/sign-up-form.test.tsx`

- [ ] **Step 1: Write the failing form test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SignUpForm } from "./sign-up";

it("does not request an OTP while the password is invalid", async () => {
  const requestOtp = vi.fn();
  render(<SignUpForm requestOtp={requestOtp} />);
  fireEvent.press(screen.getByText("Envoyer ma demande"));
  expect(requestOtp).not.toHaveBeenCalled();
  expect(await screen.findByText(/mot de passe/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test sign-up-form`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement visual screens and form behavior**

Create fields matching the supplied green visual system: name, first name, `+225` telephone, OTP input, password and confirmation. `sign-up.tsx` validates using `signUpSchema`, calls `send-registration-otp`, stores only non-sensitive draft identity in memory, then routes to `verify-phone.tsx`. Verification calls `verify-registration-otp` then `create-membership-request`; success routes to `request-pending.tsx`.

- [ ] **Step 4: Run the component tests**

Run: `pnpm --filter mobile test sign-up-form`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat: add membership request mobile flow"
```

### Task 8: Build password reset and account-state feedback

**Files:**
- Create: `apps/mobile/app/(auth)/forgot-password.tsx`
- Create: `apps/mobile/app/(auth)/reset-password.tsx`
- Create: `apps/mobile/src/features/auth/account-access-message.ts`
- Create: `apps/mobile/src/features/auth/account-access-message.test.ts`

- [ ] **Step 1: Write the failing state-message test**

```ts
import { expect, it } from "vitest";
import { accountAccessMessage } from "./account-access-message";

it("does not reveal account details for invalid login", () => {
  expect(accountAccessMessage("invalid_credentials")).toBe("Numéro ou mot de passe incorrect.");
});
```

- [ ] **Step 2: Implement password-reset calls and safe messages**

```ts
export function accountAccessMessage(code: "invalid_credentials" | "pending" | "rejected" | "disabled") {
  return {
    invalid_credentials: "Numéro ou mot de passe incorrect.",
    pending: "Votre demande est en attente de validation.",
    rejected: "Votre demande n’a pas été acceptée.",
    disabled: "Ce compte est désactivé.",
  }[code];
}
```

The reset screens reuse the OTP provider with purpose `password_reset`; only a verified code may call `supabase.auth.updateUser({ password })`.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter mobile test account-access-message`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile
git commit -m "feat: add password reset and access feedback"
```

### Task 9: Add the administrator decision screens

**Files:**
- Create: `apps/admin-web/src/app/membership-requests/page.tsx`
- Create: `apps/admin-web/src/app/membership-requests/[id]/page.tsx`
- Create: `apps/admin-web/src/features/membership-requests/decision-form.tsx`
- Create: `apps/admin-web/src/features/membership-requests/decision-form.test.tsx`

- [ ] **Step 1: Write the failing decision form test**

```tsx
it("requires a member number when approving", async () => {
  render(<DecisionForm requestId="request-1" />);
  fireEvent.press(screen.getByText("Accepter"));
  fireEvent.press(screen.getByText("Confirmer"));
  expect(await screen.findByText("Le numéro de membre est requis.")).toBeTruthy();
});
```

- [ ] **Step 2: Implement the request list and approval/refusal forms**

The list displays only pending requests for administrators. Approval submits `requestId` and `memberNumber` to `decide-membership-request`; refusal submits `requestId`, `decision: "rejected"` and a nonempty `reason`. Disable the confirmation button while the request is in flight and refresh the list after success.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter admin-web test decision-form`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-web
git commit -m "feat: allow admins to decide membership requests"
```

### Task 10: Run end-to-end checks and document configuration

**Files:**
- Create: `apps/mobile/.env.example`
- Create: `supabase/.env.example`
- Create: `apps/mobile/maestro/authentication.yaml`
- Modify: `README.md`

- [ ] **Step 1: Create the failing Maestro scenario**

```yaml
appId: com.gestionass.mobile
---
- launchApp
- tapOn: "Créer un compte"
- inputText: "Awa"
- assertVisible: "Envoyer ma demande"
```

- [ ] **Step 2: Run it to verify the missing flow**

Run: `maestro test apps/mobile/maestro/authentication.yaml`

Expected: FAIL until the application is built with the completed authentication flow.

- [ ] **Step 3: Fill environment examples and README instructions**

Document `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Orange credentials, `APP_ENV`, local Supabase startup, test commands, and the fact that secrets never belong in Git.

- [ ] **Step 4: Run the full verification suite**

Run: `pnpm test && pnpm typecheck && supabase test db && deno test supabase/functions && maestro test apps/mobile/maestro/authentication.yaml`

Expected: all checks PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md apps/mobile/.env.example supabase/.env.example apps/mobile/maestro
git commit -m "test: verify authentication workflow"
```
