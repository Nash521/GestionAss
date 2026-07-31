# Invitation-based registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate invitation codes before OTP delivery and create pending membership requests in the invited organization.

**Architecture:** PostgreSQL stores and atomically consumes invitation uses. Edge Functions exchange valid invitations and OTP verification for short-lived HMAC-signed tokens. The service role creates the inactive application user and pending request only after both tokens are verified.

**Tech Stack:** Supabase PostgreSQL/RLS, Supabase Edge Functions, Deno Web Crypto, pgtap, Deno tests.

---

### Task 1: Persist invitations and consume uses atomically

**Files:**
- Create: `supabase/migrations/202607290001_invitation_registration.sql`
- Create: `supabase/tests/invitation_registration.sql`

- [ ] **Step 1: Write the failing database test**

```sql
select throws_ok(
  $$ select public.consume_registration_invitation('40000000-0000-0000-0000-000000000001') $$,
  '42883', 'function does not exist', 'invitation consumption RPC is initially absent'
);
```

- [ ] **Step 2: Run the database tests**

Run: `supabase test db`
Expected: FAIL because invitation persistence is absent.

- [ ] **Step 3: Create table and RPC**

```sql
create table public.organization_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code_hash bytea not null unique check (octet_length(code_hash) = 32),
  is_active boolean not null default true,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  check (usage_limit is null or usage_count <= usage_limit)
);
create function public.consume_registration_invitation(invitation_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare organization uuid;
begin
  update public.organization_invitations set usage_count = usage_count + 1
  where id = invitation_id and is_active and (expires_at is null or expires_at > now()) and (usage_limit is null or usage_count < usage_limit)
  returning organization_id into organization;
  if organization is null then raise exception 'invitation is unavailable' using errcode = 'P0001'; end if;
  return organization;
end; $$;
```

- [ ] **Step 4: Expand and run database tests**

Run: `supabase test db`
Expected: PASS for active, expired, inactive, exhausted and one-use invitations.

- [ ] **Step 5: Commit database work**

Run: `git add supabase/migrations/202607290001_invitation_registration.sql supabase/tests/invitation_registration.sql && git commit -m "feat: add invitation registration persistence"`

### Task 2: Sign and validate opaque registration tokens

**Files:**
- Create: `supabase/functions/_shared/registration-token.ts`
- Create: `supabase/functions/_shared/registration-token_test.ts`

- [ ] **Step 1: Write a failing signature test**

```ts
import { issueRegistrationToken, verifyRegistrationToken } from "./registration-token.ts";
Deno.test("rejects an altered registration token", async () => {
  const token = await issueRegistrationToken({ invitationId: "inv-1", phone: "+2250701020304", purpose: "invite" }, "test-secret");
  if (await verifyRegistrationToken(`${token}x`, "test-secret") !== null) throw new Error("altered token accepted");
});
```

- [ ] **Step 2: Run the test**

Run: `deno test supabase/functions/_shared/registration-token_test.ts`
Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement expiring HMAC tokens**

```ts
export type RegistrationTokenPayload = { invitationId: string; phone: string; purpose: "invite" | "otp"; expiresAt: number };
const encode = (value: Uint8Array | string) => btoa(typeof value === "string" ? value : String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const sign = async (value: string, secret: string) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), new TextEncoder().encode(value)));
export async function issueRegistrationToken(input: Omit<RegistrationTokenPayload, "expiresAt">, secret: string): Promise<string> {
  const payload = encode(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60_000 }));
  return `${payload}.${encode(await sign(payload, secret))}`;
}
export async function verifyRegistrationToken(token: string, secret: string): Promise<RegistrationTokenPayload | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || encode(await sign(payload, secret)) !== signature) return null;
  const value = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/"))) as RegistrationTokenPayload;
  return value.expiresAt > Date.now() && (value.purpose === "invite" || value.purpose === "otp") ? value : null;
}
```

- [ ] **Step 4: Run tests**

Run: `deno test supabase/functions/_shared/registration-token_test.ts`
Expected: PASS for valid, expired and altered tokens.

### Task 3: Gate OTP by invitation evidence

**Files:**
- Create: `supabase/functions/validate-registration-invitation/index.ts`
- Modify: `supabase/functions/send-registration-otp/index.ts`
- Modify: `supabase/functions/verify-registration-otp/index.ts`

- [ ] **Step 1: Write failing token-gate tests**

```ts
const response = await fetch(functionUrl, { method: "POST", body: JSON.stringify({ phone: "+2250701020304" }) });
if (response.status !== 401) throw new Error("OTP sending requires invitation evidence");
```

- [ ] **Step 2: Run tests**

Run: `deno test supabase/functions`
Expected: FAIL because sending currently accepts only a phone number.

- [ ] **Step 3: Implement invitation-to-OTP token flow**

```ts
const invitation = await verifyRegistrationToken(registrationToken, secret);
if (!invitation || invitation.purpose !== "invite" || invitation.phone !== phone) return response({ error: "Unauthorized" }, 401);
// verification success returns an equivalent token with purpose: "otp"
```

- [ ] **Step 4: Verify function modules**

Run: `deno test supabase/functions && deno check supabase/functions/validate-registration-invitation/index.ts supabase/functions/send-registration-otp/index.ts supabase/functions/verify-registration-otp/index.ts`
Expected: PASS.

- [ ] **Step 5: Commit OTP gate**

Run: `git add supabase/functions && git commit -m "feat: require invitations for registration OTP"`

### Task 4: Create pending membership requests

**Files:**
- Create: `supabase/functions/create-membership-request/index.ts`
- Create: `supabase/functions/create-membership-request/index_test.ts`

- [ ] **Step 1: Write a failing verification-token test**

```ts
const response = await fetch(functionUrl, { method: "POST", body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone: "+2250701020304", password: "Strong!Pass1" }) });
if (response.status !== 401) throw new Error("request creation requires OTP evidence");
```

- [ ] **Step 2: Run test**

Run: `deno test supabase/functions/create-membership-request/index_test.ts`
Expected: FAIL because the function is absent.

- [ ] **Step 3: Implement service-role creation**

```ts
const verification = await verifyRegistrationToken(otpVerificationToken, secret);
if (!verification || verification.purpose !== "otp" || verification.phone !== phone) return response({ error: "Unauthorized" }, 401);
const { data: organizationId, error: consumeError } = await database.rpc("consume_registration_invitation", { invitation_id: verification.invitationId });
if (consumeError) return response({ error: "Invalid or expired invitation" }, 400);
const { data: created } = await database.auth.admin.createUser({ phone, password, phone_confirm: true });
await database.from("users").insert({ id: created.user.id, organization_id: organizationId, role: "member", is_active: false });
await database.from("membership_requests").insert({ organization_id: organizationId, user_id: created.user.id, first_name: firstName, last_name: lastName, phone, phone_verified_at: new Date().toISOString() });
```

- [ ] **Step 4: Run integration tests**

Run: `supabase test db && deno test supabase/functions/create-membership-request/index_test.ts`
Expected: PASS; an exhausted invitation creates neither Auth user nor request.

- [ ] **Step 5: Commit membership creation**

Run: `git add supabase/functions/create-membership-request && git commit -m "feat: create pending membership requests"`

### Task 5: Document and verify backend configuration

**Files:**
- Create: `supabase/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add environment examples**

```dotenv
REGISTRATION_TOKEN_SECRET=replace-with-a-32-byte-random-secret
SUPABASE_SERVICE_ROLE_KEY=local-development-only
DENO_ENV=development
```

- [ ] **Step 2: Run full verification**

Run: `supabase test db && deno test supabase/functions && deno check supabase/functions/validate-registration-invitation/index.ts supabase/functions/send-registration-otp/index.ts supabase/functions/verify-registration-otp/index.ts supabase/functions/create-membership-request/index.ts`
Expected: all commands exit 0.

- [ ] **Step 3: Commit configuration docs**

Run: `git add README.md supabase/.env.example && git commit -m "docs: configure invitation registration"`
