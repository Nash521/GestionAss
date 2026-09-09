# Password reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset an active member password by SMS OTP, then return the member to login.

**Architecture:** Historical plan superseded in part by the 9 September 2026 authentication-security hardening plan. Edge Functions hide account existence and update Supabase Auth using service credentials, but cannot invalidate another user's sessions using only that user's UUID. A three-step Expo page requests the code and password before clearing biometric data and routing to login.

**Tech Stack:** Supabase Edge Functions, Supabase Auth, Expo Router, React Native, Deno, Node test runner.

---

### Task 1: Implement reset OTP Edge Functions

**Files:**
- Create: `supabase/functions/send-password-reset-otp/index.ts`
- Create: `supabase/functions/reset-password-with-otp/index.ts`
- Create: `supabase/functions/send-password-reset-otp/index_test.ts`
- Create: `supabase/functions/reset-password-with-otp/index_test.ts`

- [ ] **Step 1: Write failing reset-function tests**

```ts
const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "+2250701020304" }) });
if (response.status !== 200) throw new Error(`expected neutral 200, got ${response.status}`);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/send-password-reset-otp/index_test.ts`

Expected: FAIL because the function is absent.

- [ ] **Step 3: Implement neutral OTP sending**

```ts
const request = await database.from("membership_requests").select("user_id,status,users!inner(is_active)").eq("phone", phone).maybeSingle();
if (request.data?.status === "approved" && request.data.users.is_active) await database.rpc("issue_registration_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hashToDatabase(otp.codeHash) });
return response({ sent: true });
```

- [ ] **Step 4: Implement atomic password update**

```ts
const verified = await database.rpc("verify_and_consume_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hashToDatabase(await sha256(code)) });
if (verified.data !== true) return response({ error: "Invalid or expired code" }, 400);
const request = await database.from("membership_requests").select("user_id,status,users!inner(is_active)").eq("phone", phone).maybeSingle();
if (request.data?.status !== "approved" || !request.data.users.is_active) return response({ error: "Invalid or expired code" }, 400);
await database.auth.admin.updateUserById(request.data.user_id, { password });
return response({ reset: true });
```

- [ ] **Step 5: Run all reset tests and commit**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/send-password-reset-otp supabase/functions/reset-password-with-otp`

```bash
git add supabase/functions/send-password-reset-otp supabase/functions/reset-password-with-otp
git commit -m "feat: add SMS password reset"
```

### Task 2: Replace the temporary reset page

**Files:**
- Modify: `apps/mobile/app/(auth)/password-reset.tsx`
- Modify: `apps/mobile/src/lib/biometric-session.ts`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing page contract test**

```js
const source = await readFile(new URL('../app/(auth)/password-reset.tsx', import.meta.url), 'utf8');
assert.match(source, /send-password-reset-otp/);
assert.match(source, /reset-password-with-otp/);
assert.match(source, /clearBiometricLogin/);
assert.match(source, /router\.replace\("\/login"\)/);
```

- [ ] **Step 2: Run mobile tests to verify failure**

Run: `pnpm --filter mobile test`

Expected: FAIL because the page is informational only.

- [ ] **Step 3: Implement phone, code, and password steps**

```tsx
await invokeRegistrationFunction("send-password-reset-otp", { phone });
await invokeRegistrationFunction("reset-password-with-otp", { phone, code, password });
await clearBiometricLogin();
router.replace("/login");
```

- [ ] **Step 4: Run mobile tests and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the reset screen**

```bash
git add apps/mobile/app/(auth)/password-reset.tsx apps/mobile/src/lib/biometric-session.ts apps/mobile/test/routes.test.mjs
git commit -m "feat: add mobile password reset"
```
