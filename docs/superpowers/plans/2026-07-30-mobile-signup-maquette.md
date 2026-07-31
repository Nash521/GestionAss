# Mobile Sign-up Maquette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the invitation registration screen to the supplied GestionAss sign-up maquette while preserving the existing OTP flow.

**Architecture:** `sign-up.tsx` owns local field state and performs one validation pass before calling the existing Supabase wrappers. Three PNG assets live inside `apps/mobile/assets`, while absolute decorative images sit behind a scrollable form so narrow or keyboard-covered screens remain usable.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native, Supabase Edge Functions, Node test runner, TypeScript.

---

### Task 1: Cover local assets and form contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing source-contract test**

```js
test('the sign-up screen uses local wave artwork and requires matching passwords', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /effet_haut_page\.png/);
  assert.match(source, /effet_bas_page\.png/);
  assert.match(source, /Confirmer le mot de passe/);
  assert.match(source, /password !== passwordConfirmation/);
  assert.match(source, /router\.push\("\/\(auth\)\/verify-phone"\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the current sign-up route has no wave assets or password-confirmation state.

### Task 2: Bundle the maquette assets and implement the scrollable form

**Files:**
- Create: `apps/mobile/assets/effet_haut_page.png` (copy from `maquette/effet_haut_page.png`)
- Create: `apps/mobile/assets/effet_bas_page.png` (copy from `maquette/effet_bas_page.png`)
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Copy the two decorative PNGs into the mobile asset directory**

Run:

```powershell
Copy-Item -LiteralPath 'maquette/effet_haut_page.png' -Destination 'apps/mobile/assets/effet_haut_page.png'
Copy-Item -LiteralPath 'maquette/effet_bas_page.png' -Destination 'apps/mobile/assets/effet_bas_page.png'
```

- [ ] **Step 2: Replace the form shell with decorated, scrollable React Native layout**

Use local assets and keep waves decorative:

```tsx
const topWave = require("../../assets/effet_haut_page.png");
const bottomWave = require("../../assets/effet_bas_page.png");
const logo = require("../../assets/logo-removebg-preview.png");

return (
  <View style={styles.page}>
    <Image source={topWave} style={styles.topWave} accessible={false} />
    <Image source={bottomWave} style={styles.bottomWave} accessible={false} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez-nous et faites la différence.</Text>
      {/* controlled invitation, name, phone and password fields */}
    </ScrollView>
  </View>
);
```

Add `passwordConfirmation` state and reject submission before `setLoading(true)` when `password !== passwordConfirmation`, with the French message `Les mots de passe ne correspondent pas.` Keep the existing invitation validation, call sequence and `router.push("/(auth)/verify-phone")` unchanged.

- [ ] **Step 3: Run the complete mobile verification**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript exits with code 0.

- [ ] **Step 4: Commit the feature**

```bash
git add apps/mobile/assets/effet_haut_page.png apps/mobile/assets/effet_bas_page.png apps/mobile/app/(auth)/sign-up.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: style mobile sign-up from maquette"
```
