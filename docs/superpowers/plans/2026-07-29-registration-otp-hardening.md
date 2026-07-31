# Registration OTP hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify, harden where tests reveal a gap, and commit the registration OTP Edge Functions.

**Architecture:** Shared OTP helpers isolate cryptographic and timing behavior; Edge Functions own request validation and persistence; the SMS provider keeps development delivery offline. Tests first document the security guarantees and prevent regression.

**Tech Stack:** Deno, Supabase Edge Functions, Supabase local stack.

---

### Task 1: Verify OTP security helpers

**Files:**
- Modify: `supabase/functions/_shared/otp_test.ts`
- Modify if test fails: `supabase/functions/_shared/otp.ts`

- [ ] **Step 1: Add a failing test for malformed persisted hashes**

```ts
Deno.test("hashFromDatabase rejects malformed persisted values", async () => {
  const { hashFromDatabase } = await import("./otp.ts");
  let threw = false;
  try { hashFromDatabase("not-a-hash"); } catch { threw = true; }
  if (!threw) throw new Error("malformed hash must be rejected");
});
```

- [ ] **Step 2: Run the helper test suite**

Run: `deno test supabase/functions/_shared/otp_test.ts`
Expected: the new test is red only if malformed hashes are accepted.

- [ ] **Step 3: Implement the minimal validation only if needed**

```ts
if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error("Invalid OTP hash format");
```

- [ ] **Step 4: Re-run the helper test suite**

Run: `deno test supabase/functions/_shared/otp_test.ts`
Expected: all tests pass.

### Task 2: Verify SMS and function module safety

**Files:**
- Modify: `supabase/functions/_shared/sms_test.ts`
- Test: `supabase/functions/send-registration-otp/index.ts`
- Test: `supabase/functions/verify-registration-otp/index.ts`

- [ ] **Step 1: Add a failing test for incomplete production SMS configuration**

```ts
Deno.test("production SMS requires all secrets", () => {
  let threw = false;
  try { createSmsProvider("production"); } catch { threw = true; }
  if (!threw) throw new Error("production configuration must fail without secrets");
});
```

- [ ] **Step 2: Run the SMS tests without production SMS secrets**

Run: `deno test --allow-env supabase/functions/_shared/sms_test.ts`
Expected: the test is red only if production configuration is silently accepted.

- [ ] **Step 3: Implement the minimal configuration guard only if needed**

```ts
if (!apiUrl || !accessToken || !sender) throw new Error("Orange SMS production secrets are not configured");
```

- [ ] **Step 4: Check the Edge Function source graph**

Run: `deno check supabase/functions/send-registration-otp/index.ts supabase/functions/verify-registration-otp/index.ts`
Expected: type check exits with code 0.

### Task 3: Run local verification and commit the OTP lot

**Files:**
- Add: `supabase/functions/_shared/otp.ts`
- Add: `supabase/functions/_shared/otp_test.ts`
- Add: `supabase/functions/_shared/sms.ts`
- Add: `supabase/functions/_shared/sms_test.ts`
- Add: `supabase/functions/send-registration-otp/index.ts`
- Add: `supabase/functions/verify-registration-otp/index.ts`

- [ ] **Step 1: Run the full OTP unit suite**

Run: `deno test --allow-env supabase/functions/_shared/otp_test.ts supabase/functions/_shared/sms_test.ts`
Expected: all tests pass.

- [ ] **Step 2: Confirm the local Supabase stack is available**

Run: `C:\\Users\\HP\\node_modules\\@supabase\\cli-windows-x64\\bin\\supabase.exe status`
Expected: API URL, Studio URL, and database URL are printed.

- [ ] **Step 3: Review the staged scope**

Run: `git add supabase/functions && git diff --cached --name-only`
Expected: only the six OTP source and test files are staged; no `supabase/.temp`, `supabase/.branches`, or log file appears.

- [ ] **Step 4: Commit the verified lot**

Run: `git commit -m "feat: add registration OTP functions"`
Expected: one commit containing only OTP functions and tests.
