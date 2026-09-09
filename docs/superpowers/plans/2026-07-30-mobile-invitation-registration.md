# Mobile invitation registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver green-styled Expo screens for invitation validation, OTP verification and pending-request feedback.

**Architecture:** An in-memory registration context holds invitation and OTP tokens during the flow. Screen components call typed wrappers around Supabase Edge Functions and never persist passwords or tokens.

**Tech Stack:** Expo Router, React Native, React Hook Form, Zod, Supabase Functions, Vitest.

---

### Task 1: Add mobile registration state and function client

**Files:**
- Create: `apps/mobile/src/features/auth/registration-flow.ts`
- Create: `apps/mobile/src/features/auth/registration-flow.test.ts`

- [ ] **Step 1: Write a failing state test**

```ts
it("clears tokens when registration ends", () => {
  const state = createRegistrationFlow();
  state.setInvitationToken("invite");
  state.setOtpToken("otp");
  state.clear();
  expect(state.snapshot()).toEqual({ invitationToken: null, otpToken: null });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter mobile test registration-flow`
Expected: FAIL because the flow module is absent.

- [ ] **Step 3: Implement memory-only state and Edge calls**

```ts
export type RegistrationFlow = { invitationToken: string | null; otpToken: string | null; clear(): void };
export async function invokeRegistrationFunction(name: string, body: Record<string, unknown>) { return supabase.functions.invoke(name, { body }); }
```

- [ ] **Step 4: Re-run tests and commit**

Run: `pnpm --filter mobile test registration-flow`

```bash
git add apps/mobile/src/features/auth/registration-flow.ts apps/mobile/src/features/auth/registration-flow.test.ts
git commit -m "feat: add mobile registration flow state"
```

### Task 2: Build invitation and identity screen

**Files:**
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Create: `apps/mobile/src/features/auth/sign-up-form.test.tsx`

- [ ] **Step 1: Write a failing invalid-form test**

```tsx
render(<SignUpScreen />);
fireEvent.press(screen.getByText("Envoyer le code"));
expect(await screen.findByText(/code d'invitation/i)).toBeTruthy();
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter mobile test sign-up-form`
Expected: FAIL because the screen is absent.

- [ ] **Step 3: Implement the green invitation, identity and password form**

```tsx
await invokeRegistrationFunction("validate-registration-invitation", { code: invitationCode, phone });
await invokeRegistrationFunction("send-registration-otp", { phone, invitationToken });
router.push("/(auth)/verify-phone");
```

- [ ] **Step 4: Re-run tests and commit**

Run: `pnpm --filter mobile test sign-up-form`

```bash
git add apps/mobile/app/(auth)/sign-up.tsx apps/mobile/src/features/auth/sign-up-form.test.tsx
git commit -m "feat: add mobile invitation sign-up"
```

### Task 3: Build OTP and pending-request screens

**Files:**
- Create: `apps/mobile/app/(auth)/verify-phone.tsx`
- Create: `apps/mobile/app/(auth)/request-pending.tsx`
- Create: `apps/mobile/src/features/auth/verify-phone.test.tsx`

- [ ] **Step 1: Write a failing success-navigation test**

```tsx
fireEvent.press(screen.getByText("Vérifier le code"));
expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/request-pending");
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter mobile test verify-phone`
Expected: FAIL because the screen is absent.

- [ ] **Step 3: Implement OTP verification and request creation**

```tsx
const otp = await invokeRegistrationFunction("verify-registration-otp", { phone, code, invitationToken });
await invokeRegistrationFunction("create-membership-request", { firstName, lastName, phone, password, otpToken: otp.otpToken });
flow.clear();
router.replace("/(auth)/request-pending");
```

- [ ] **Step 4: Re-run tests and commit**

Run: `pnpm --filter mobile test verify-phone`

```bash
git add apps/mobile/app/(auth)/verify-phone.tsx apps/mobile/app/(auth)/request-pending.tsx apps/mobile/src/features/auth/verify-phone.test.tsx
git commit -m "feat: add mobile OTP registration screens"
```

### Task 4: Verify the mobile flow

**Files:**
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Route login users to sign-up**

```tsx
<Link href="/(auth)/sign-up">Créer un compte</Link>
```

- [ ] **Step 2: Run all mobile checks**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`
Expected: all tests and type checks pass.

- [ ] **Step 3: Commit wiring**

Run: `git add apps/mobile && git commit -m "test: verify mobile invitation registration"`
