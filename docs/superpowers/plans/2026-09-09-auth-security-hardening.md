# Auth Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the password policy server-side, protect OTP hashes with a server secret, and preserve reset OTP usability when Supabase Auth fails.

**Architecture:** Edge Functions keep validating external input but delegate password and OTP logic to focused shared modules. PostgreSQL atomically reserves a valid reset OTP before the external Auth call; the Edge Function finalizes or releases that reservation according to the outcome.

**Tech Stack:** Deno, Supabase Edge Functions, PostgreSQL migrations, Deno tests.

**Status:** Code completed on 9 September 2026. The local-Supabase migration contract remains pending because no local credentials or instance were available.

---

### Task 1: Centralize server password validation

**Files:**
- Create: `supabase/functions/_shared/password.ts`
- Create: `supabase/functions/_shared/password_test.ts`
- Modify: `supabase/functions/create-membership-request/index.ts`
- Modify: `supabase/functions/reset-password-with-otp/index.ts`

- [ ] **Step 1: Write the failing password-policy test**

```ts
import { isStrongPassword } from "./password.ts";

Deno.test("isStrongPassword requires all four password rules", () => {
  const rejected = ["abcdefgh", "Abcdefgh", "Abcdefg1", "Abcdefg!"];
  for (const password of rejected) {
    if (isStrongPassword(password)) throw new Error(`accepted weak password: ${password}`);
  }
  if (!isStrongPassword("Motdepasse1!")) throw new Error("rejected a compliant password");
});
```

- [ ] **Step 2: Verify that it fails**

Run: `deno test -A supabase/functions/_shared/password_test.ts`

Expected: failure because `password.ts` does not exist.

- [ ] **Step 3: Implement the shared policy**

```ts
export function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
}
```

Import `isStrongPassword` in both Edge Functions. Replace each `password.length < 8` condition with `!isStrongPassword(password)`. Keep the current neutral `Invalid request` response.

- [ ] **Step 4: Verify the focused test and the complete Edge suite**

Run: `deno test -A supabase/functions/_shared/password_test.ts && deno test -A supabase/functions`

Expected: all tests pass.

- [ ] **Step 5: Commit the isolated change**

```bash
git add supabase/functions/_shared/password.ts supabase/functions/_shared/password_test.ts supabase/functions/create-membership-request/index.ts supabase/functions/reset-password-with-otp/index.ts
git commit -m "fix: enforce password policy in auth functions"
```

### Task 2: Replace raw OTP hashes with HMAC hashes

**Files:**
- Modify: `supabase/functions/_shared/otp.ts`
- Modify: `supabase/functions/_shared/otp_test.ts`
- Modify: `supabase/functions/send-registration-otp/index.ts`
- Modify: `supabase/functions/verify-registration-otp/index.ts`
- Modify: `supabase/functions/send-password-reset-otp/index.ts`
- Modify: `supabase/functions/reset-password-with-otp/index.ts`
- Modify: affected function tests to provide `OTP_HASH_SECRET`

- [ ] **Step 1: Write the failing HMAC test**

```ts
import { createOtp, safeVerifyOtp } from "./otp.ts";

Deno.test("OTP hashes require the same server secret to verify", async () => {
  const otp = await createOtp("test-otp-hash-secret");
  if (!await safeVerifyOtp(otp.code, otp.codeHash, "test-otp-hash-secret")) throw new Error("matching secret must verify");
  if (await safeVerifyOtp(otp.code, otp.codeHash, "another-secret")) throw new Error("different secret must not verify");
});
```

- [ ] **Step 2: Verify that it fails**

Run: `deno test -A supabase/functions/_shared/otp_test.ts`

Expected: failure because `createOtp` and `safeVerifyOtp` do not accept a secret.

- [ ] **Step 3: Implement HMAC-SHA-256**

```ts
export async function hashOtp(code: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code)));
}

export async function createOtp(secret: string): Promise<Otp> {
  const code = secureSixDigitNumber().toString().padStart(6, "0");
  return { code, codeHash: await hashOtp(code, secret) };
}

export async function safeVerifyOtp(code: string, expectedHash: Uint8Array, secret: string): Promise<boolean> {
  return timingSafeEqual(await hashOtp(code, secret), expectedHash);
}
```

Each OTP endpoint reads `Deno.env.get("OTP_HASH_SECRET")?.trim()`. If missing, return 503 before computing or issuing an OTP. Pass that secret to `createOtp` or `hashOtp`. Every process-based test reaching OTP code receives `OTP_HASH_SECRET: "test-otp-hash-secret"`.

- [ ] **Step 4: Verify focused and complete tests**

Run: `deno test -A supabase/functions/_shared/otp_test.ts && deno test -A supabase/functions`

Expected: all tests pass; a different secret cannot verify a persisted hash.

- [ ] **Step 5: Commit the isolated change**

```bash
git add supabase/functions/_shared/otp.ts supabase/functions/_shared/otp_test.ts supabase/functions/send-registration-otp supabase/functions/verify-registration-otp supabase/functions/send-password-reset-otp supabase/functions/reset-password-with-otp
git commit -m "fix: protect OTP hashes with a server secret"
```

### Task 3: Reserve reset OTPs around the external password update

**Files:**
- Create: `supabase/migrations/202609090001_reserve_password_reset_otp.sql`
- Modify: `supabase/functions/reset-password-with-otp/index.ts`
- Modify: `supabase/functions/reset-password-with-otp/index_test.ts`

- [ ] **Step 1: Add the failing reservation contract test**

Add this import and test to `reset-password-with-otp/index_test.ts`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const localUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

Deno.test({
  name: "password-reset reservation releases after failure and consumes after success",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = (10_000_000 + crypto.getRandomValues(new Uint32Array(1))[0] % 90_000_000).toString();
    const phone = `+22507${suffix}`;
    const hash = "\\x" + "01".repeat(32);
    const seeded = await database.rpc("issue_registration_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hash });
    if (seeded.data !== true || seeded.error) throw new Error("unable to seed reset OTP");
    const first = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (typeof first.data !== "string" || first.error) throw new Error("valid OTP was not reserved");
    const released = await database.rpc("release_password_reset_otp", { p_phone: phone, p_reservation: first.data });
    if (released.data !== true || released.error) throw new Error("reservation was not released");
    const second = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (typeof second.data !== "string" || second.error) throw new Error("released OTP was not reservable");
    const finalized = await database.rpc("finalize_password_reset_otp", { p_phone: phone, p_reservation: second.data });
    if (finalized.data !== true || finalized.error) throw new Error("reservation was not finalized");
    const afterFinalization = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (afterFinalization.data !== null || afterFinalization.error) throw new Error("consumed OTP was reservable");
  },
});
```

- [ ] **Step 2: Verify the pre-migration failure**

Run: `deno test -A supabase/functions/reset-password-with-otp/index_test.ts`

Expected: without local Supabase, the integration test is skipped; with it, the test fails because `reserve_password_reset_otp` does not exist.

- [ ] **Step 3: Add the reservation migration**

```sql
alter table public.auth_otps
  add column reset_reservation uuid,
  add column reset_reserved_at timestamptz;

create function public.reserve_password_reset_otp(p_phone text, p_code_hash bytea)
returns uuid language plpgsql security definer set search_path = '' as $$
declare otp_record public.auth_otps%rowtype; reservation uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then return null; end if;
  select * into otp_record from public.auth_otps where phone=p_phone and purpose='password_reset' for update;
  if not found or otp_record.consumed_at is not null or otp_record.attempts >= 5 or otp_record.expires_at <= pg_catalog.now() then return null; end if;
  if otp_record.reset_reserved_at is not null and otp_record.reset_reserved_at > pg_catalog.now() - interval '5 minutes' then return null; end if;
  if otp_record.code_hash <> p_code_hash then
    update public.auth_otps set attempts=attempts+1 where id=otp_record.id;
    return null;
  end if;
  reservation := extensions.gen_random_uuid();
  update public.auth_otps set reset_reservation=reservation, reset_reserved_at=pg_catalog.now() where id=otp_record.id;
  return reservation;
end;
$$;

create function public.finalize_password_reset_otp(p_phone text, p_reservation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.auth_otps set consumed_at=pg_catalog.now(), reset_reservation=null, reset_reserved_at=null
  where phone=p_phone and purpose='password_reset' and reset_reservation=p_reservation and consumed_at is null;
  return found;
end;
$$;

create function public.release_password_reset_otp(p_phone text, p_reservation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.auth_otps set reset_reservation=null, reset_reserved_at=null
  where phone=p_phone and purpose='password_reset' and reset_reservation=p_reservation and consumed_at is null;
  return found;
end;
$$;

revoke all on function public.reserve_password_reset_otp(text, bytea) from public;
revoke all on function public.finalize_password_reset_otp(text, uuid) from public;
revoke all on function public.release_password_reset_otp(text, uuid) from public;
grant execute on function public.reserve_password_reset_otp(text, bytea) to service_role;
grant execute on function public.finalize_password_reset_otp(text, uuid) to service_role;
grant execute on function public.release_password_reset_otp(text, uuid) to service_role;
```

- [ ] **Step 4: Change reset flow**

Replace `verify_and_consume_otp` with `reserve_password_reset_otp`. On an Auth update failure, call `release_password_reset_otp` and return 503. On success, call `finalize_password_reset_otp`; only after a `true` result call global sign-out and return success.

- [ ] **Step 5: Verify all available checks**

Run: `deno test -A supabase/functions/reset-password-with-otp/index_test.ts && deno test -A supabase/functions && pnpm test && pnpm typecheck`

Expected: all available checks pass. With local Supabase configured, the reservation contract passes.

- [ ] **Step 6: Commit the isolated change**

```bash
git add supabase/migrations/202609090001_reserve_password_reset_otp.sql supabase/functions/reset-password-with-otp/index.ts supabase/functions/reset-password-with-otp/index_test.ts
git commit -m "fix: preserve reset OTPs when auth updates fail"
```

## Review checklist

- The four server password rules match the mobile schema.
- `OTP_HASH_SECRET` is a deployment secret and is absent from version control.
- OTP hashes remain 32-byte `bytea` values.
- Reservation functions are granted only to `service_role`.
- No response or log contains a password, OTP, registration token, or server secret.
- Existing untracked files and unrelated local modifications remain untouched.
