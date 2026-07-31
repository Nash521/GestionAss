# Biometric login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow members to unlock a previously authenticated session with device biometrics.

**Architecture:** A singleton Supabase client keeps the active in-memory session. A biometric helper stores only refreshable session tokens in `expo-secure-store` protected by the device biometric gate, and restores them using `auth.setSession`. UI code asks the helper for availability and continues to resolve `pending` or `active` through the existing server function.

**Tech Stack:** Expo Local Authentication, Expo Secure Store, Supabase Auth, Expo Router, React Native, Node test runner.

---

### Task 1: Add biometric native configuration and secure-session helper

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/lib/biometric-session.ts`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing secure-session contract test**

```js
test('the biometric helper protects a stored session with device authentication', async () => {
  const source = await readFile(new URL('../src/lib/biometric-session.ts', import.meta.url), 'utf8');
  assert.match(source, /expo-local-authentication/);
  assert.match(source, /expo-secure-store/);
  assert.match(source, /requireAuthentication: true/);
  assert.match(source, /setSession/);
});
```

- [ ] **Step 2: Run the mobile test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because `biometric-session.ts` is absent.

- [ ] **Step 3: Install and configure native packages**

```bash
pnpm --filter mobile exec expo install expo-local-authentication expo-secure-store
```

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-local-authentication", { "faceIDPermission": "Autoriser GestionAss à utiliser Face ID pour vous connecter." }],
      "expo-secure-store"
    ]
  }
}
```

- [ ] **Step 4: Implement session enrollment and unlock**

```ts
const SESSION_KEY = "gestionass.biometric.session";
const ENABLED_KEY = "gestionass.biometric.enabled";

export async function enableBiometricLogin(session: Session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ accessToken: session.access_token, refreshToken: session.refresh_token }), { requireAuthentication: true });
  await SecureStore.setItemAsync(ENABLED_KEY, "true");
}

export async function unlockWithBiometrics() {
  const serialized = await SecureStore.getItemAsync(SESSION_KEY, { requireAuthentication: true });
  if (!serialized) return false;
  const { accessToken, refreshToken } = JSON.parse(serialized);
  await getSupabaseClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return true;
}
```

Make `getSupabaseClient()` return a module singleton and make `signInWithPhone()` return the successful `Session`.

- [ ] **Step 5: Run the mobile test and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit the helper**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/src/lib apps/mobile/test/routes.test.mjs pnpm-lock.yaml
git commit -m "feat: add biometric session storage"
```

### Task 2: Enroll after password login and unlock from the login screen

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing biometric-login screen test**

```js
test('the login screen offers an enabled biometric unlock', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /Se connecter avec empreinte/);
  assert.match(source, /enableBiometricLogin/);
  assert.match(source, /unlockWithBiometrics/);
});
```

- [ ] **Step 2: Run the mobile test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the login screen has no biometric UI.

- [ ] **Step 3: Implement the optional enrollment and unlock button**

```tsx
const session = await signInWithPhone(phone, password);
if (await canEnableBiometricLogin()) {
  Alert.alert("Activer l’empreinte ?", "Utilisez votre empreinte lors de votre prochaine connexion.", [
    { text: "Plus tard", style: "cancel" },
    { text: "Activer", onPress: () => enableBiometricLogin(session) },
  ]);
}

{biometricEnabled ? <Pressable onPress={unlock}><Feather name="fingerprint" /><Text>Se connecter avec empreinte</Text></Pressable> : null}
```

The `unlock` handler calls `unlockWithBiometrics()`, then resolves the existing `getSessionDestination()` result and routes to `/request-pending` or `/home`.

- [ ] **Step 4: Run the mobile test and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the screen behavior**

```bash
git add apps/mobile/app/(auth)/login.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: add biometric login action"
```

### Task 3: Offer biometric unlock at startup

**Files:**
- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing startup contract test**

```js
test('the splash screen attempts biometric unlock before showing login', async () => {
  const source = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.match(source, /unlockWithBiometrics/);
  assert.match(source, /getSessionDestination/);
});
```

- [ ] **Step 2: Run the mobile test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the splash screen always redirects to `/login` after three seconds.

- [ ] **Step 3: Implement biometric-first startup routing**

```ts
const unlocked = await unlockWithBiometrics();
if (unlocked) {
  const { destination } = await getSessionDestination();
  if (destination === "pending") return router.replace("/request-pending");
  if (destination === "active") return router.replace("/home");
}
router.replace("/login");
```

Keep the existing three-second splash delay only when no biometric unlock is available or it is cancelled.

- [ ] **Step 4: Run all checks**

Run: `pnpm test; pnpm typecheck`

Expected: all workspace tests and type checks pass.

- [ ] **Step 5: Commit the startup behavior**

```bash
git add apps/mobile/app/index.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: offer biometric unlock at startup"
```
