# Mobile OTP maquette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a keyboard-safe OTP verification screen matching `maquette/page_OTP.png`, including a 45-second SMS resend countdown.

**Architecture:** `verify-phone.tsx` remains the sole UI/controller for the in-memory registration draft. It renders an accessible hidden numeric input and maps its six digits into visual cells, while keeping the existing Supabase Edge Function verification and membership-request flow. A local timer only controls the resend affordance; the server retains rate-limit authority.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, `@expo/vector-icons`, TypeScript, `react-native-keyboard-aware-scroll-view`, Supabase Edge Functions, Node built-in tests.

---

## File structure

- Modify: `apps/mobile/app/(auth)/verify-phone.tsx` — OTP visual layout, code-entry state, resend timer, verification and navigation.
- Modify: `apps/mobile/test/routes.test.mjs` — static regression coverage for OTP page contracts.
- Reuse: `apps/mobile/src/components/keyboard-safe-screen.tsx` — Android focused-input scrolling.
- Reuse: `apps/mobile/src/features/auth/registration-flow.ts` — in-memory phone and invitation token.
- Reuse: `apps/mobile/src/lib/supabase.ts` — typed Edge Function invocation.

### Task 1: Define OTP screen regression coverage

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing OTP route contract test**

Append this test to `apps/mobile/test/routes.test.mjs`:

```js
test('the OTP screen renders six code cells, keyboard support and a guarded resend flow', async () => {
  const source = await readFile(new URL('../app/(auth)/verify-phone.tsx', import.meta.url), 'utf8');

  assert.match(source, /KeyboardSafeScreen/);
  assert.match(source, /Array\.from\(\{ length: 6 \}\)/);
  assert.match(source, /maxLength=\{6\}/);
  assert.match(source, /send-registration-otp/);
  assert.match(source, /verify-registration-otp/);
  assert.match(source, /create-membership-request/);
  assert.match(source, /RESEND_DELAY_SECONDS = 45/);
  assert.match(source, /router\.replace\("\/\(auth\)\/sign-up"\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL in `the OTP screen renders six code cells...`, because the existing route has a single text field and no resend timer.

- [ ] **Step 3: Commit the red test**

```bash
git add -- 'apps/mobile/test/routes.test.mjs'
git commit -m "test: define mobile OTP screen contract"
```

### Task 2: Build the OTP maquette and resend timer

**Files:**
- Modify: `apps/mobile/app/(auth)/verify-phone.tsx`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Replace the basic page with the maquette layout**

In `apps/mobile/app/(auth)/verify-phone.tsx`, import `useEffect`, `useRef`, `Feather`, `Image`, `Pressable`, and `KeyboardSafeScreen`. Add these module constants:

```ts
const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");
const RESEND_DELAY_SECONDS = 45;
```

Render the background/logo, title `Vérification par SMS`, the registration draft phone, a `Modifier` pressable, six cells from `Array.from({ length: 6 })`, the five-minute message, the verification button, countdown/resend controls, and `Retour`. Wrap the content in `KeyboardSafeScreen` so the focused OTP input remains visible on Android.

- [ ] **Step 2: Implement controlled six-digit entry**

Use a single `TextInput` ref and state:

```ts
const inputRef = useRef<TextInput>(null);
const [code, setCode] = useState("");

const updateCode = (value: string) => {
  setCode(value.replace(/\D/g, "").slice(0, 6));
};
```

Set the input to `keyboardType="number-pad"`, `maxLength={6}`, `value={code}`, and `onChangeText={updateCode}`. Keep it visually hidden but accessible (`accessibilityLabel="Code de vérification à six chiffres"`), and make the code-cell row focus it on press. Each cell shows `code[index] ?? ""` and gets an active border while the input is focused.

- [ ] **Step 3: Implement the 45-second resend lifecycle**

Create `remainingSeconds` initialized to `RESEND_DELAY_SECONDS`. Add an effect that decrements once per second only while the value is above zero and clears the interval on cleanup. Format the display with:

```ts
const countdown = `00:${String(remainingSeconds).padStart(2, "0")}`;
```

When the resend pressable is enabled, require `draft.invitationToken`, call:

```ts
await invokeRegistrationFunction("send-registration-otp", {
  phone: draft.phone,
  invitationToken: draft.invitationToken,
});
setRemainingSeconds(RESEND_DELAY_SECONDS);
```

Disable this control while loading or while `remainingSeconds > 0`. On error, show only `Impossible de renvoyer le code. Réessayez plus tard.`

- [ ] **Step 4: Preserve secure verification and return behavior**

Keep the existing `verify-registration-otp` call with `phone`, `code`, and `invitationToken`; require a six-digit code and invitation token before calling it. Keep the returned `otpToken` only in `registrationFlow`, call `create-membership-request` with the existing payload, clear the draft only after success, and navigate to `/(auth)/request-pending`.

Make both `Modifier` and `Retour` call:

```ts
router.replace("/(auth)/sign-up");
```

Use generic French errors for all failures; do not render passwords, invitation tokens, or server error details.

- [ ] **Step 5: Run the test suite to verify the implementation passes**

Run: `pnpm --filter mobile test`

Expected: PASS, including `the OTP screen renders six code cells, keyboard support and a guarded resend flow`.

- [ ] **Step 6: Commit the OTP page**

```bash
git add -- 'apps/mobile/app/(auth)/verify-phone.tsx'
git commit -m "feat: add mobile OTP verification maquette"
```

### Task 3: Verify type safety and Android bundle

**Files:**
- Modify: none
- Test: `apps/mobile/app/(auth)/verify-phone.tsx`

- [ ] **Step 1: Run TypeScript validation**

Run: `pnpm --filter mobile typecheck`

Expected: exit code 0.

- [ ] **Step 2: Start Expo and validate the Android bundle**

Run: `pnpm --filter mobile exec expo start --lan --clear`

Then request the Expo Router Android bundle URL printed by Metro and confirm it returns HTTP 200. Keep the server available at `exp://192.168.1.126:8081` for device validation.

- [ ] **Step 3: Manually validate the device flow**

On Expo Go, open the registration path, submit a valid invitation draft, then verify:

1. The OTP page matches the provided hierarchy and keeps the code cells above the keyboard.
2. Six typed or pasted digits fill the separate cells.
3. `Renvoyer le code` is disabled for 45 seconds, then enabled; a successful resend restarts the countdown.
4. `Modifier` and `Retour` return to the sign-up route.
5. A valid code proceeds to the existing pending-request route.

- [ ] **Step 4: Commit only if a verification change was necessary**

```bash
git add -- 'apps/mobile/app/(auth)/verify-phone.tsx' 'apps/mobile/test/routes.test.mjs'
git commit -m "fix: polish mobile OTP verification"
```

