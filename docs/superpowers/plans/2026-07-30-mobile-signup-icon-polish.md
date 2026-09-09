# Mobile Sign-up Icon Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Feather field icons, password feedback and a temporary login link to the compact sign-up screen.

**Architecture:** Expo’s vector icons render all field, eye and check visuals. `SignUp` derives four password-requirement booleans from the current password and retains local visibility state for both password inputs; the existing invitation/OTP submit function stays unchanged.

**Tech Stack:** Expo SDK 54, `@expo/vector-icons`, Expo Router 6, React Native, Node test runner, TypeScript.

---

### Task 1: Cover the polished form contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing source-contract test**

```js
test('the sign-up screen exposes Feather icons, password criteria and the temporary login route', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /@expo\/vector-icons/);
  assert.match(source, /showPassword/);
  assert.match(source, /showPasswordConfirmation/);
  assert.match(source, /Une majuscule/);
  assert.match(source, /Un chiffre/);
  assert.match(source, /Un caractère spécial/);
  assert.match(source, /router\.replace\("\/login"\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the compact screen has no Feather import or criteria labels.

### Task 2: Install icons and implement password feedback

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Install the Expo-compatible icon package**

Run: `pnpm --filter mobile exec expo install @expo/vector-icons`

- [ ] **Step 2: Add icon and feedback state**

Add the Feather import, visibility state and requirement derivations:

```tsx
import { Feather } from "@expo/vector-icons";

const [showPassword, setShowPassword] = useState(false);
const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
const passwordRequirements = [
  ["8 caractères", password.length >= 8],
  ["Une majuscule", /[A-Z]/.test(password)],
  ["Un chiffre", /\d/.test(password)],
  ["Un caractère spécial", /[^A-Za-z0-9]/.test(password)],
] as const;
```

Wrap each `TextInput` in a `View` with the appropriate `Feather` icon. Add `Pressable` eye icons to the two password fields that invert their matching visibility state. Render `passwordRequirements` in a two-column grid below confirmation with `check-circle` when true and `circle` when false. Set the logo dimensions to 86×86 and render the login line below the submit button; its `Pressable` calls `router.replace("/login")`.

- [ ] **Step 3: Run complete verification**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript exits with code 0.

- [ ] **Step 4: Verify Android bundling**

Run:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8081/node_modules/.pnpm/expo-router@6.0.24_@expo+me_2720bd0368e4708fee2d39dd9f883972/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable' -UseBasicParsing
```

Expected: HTTP status 200.

- [ ] **Step 5: Commit and push**

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/app/(auth)/sign-up.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: polish mobile sign-up fields"
git push
```
