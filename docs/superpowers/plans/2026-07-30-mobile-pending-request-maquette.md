# Mobile pending-request maquette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the post-registration pending-validation page from `maquette/page_attente.png`, with its supplied local illustration and a return-to-login action.

**Architecture:** The existing `request-pending` route remains a presentation-only component. It uses local raster assets and Feather icons, with no state and no network access, because the membership request has already been created by the OTP route before navigation.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, `@expo/vector-icons`, TypeScript, Node built-in tests.

---

## File structure

- Create: `apps/mobile/assets/image_attente.png` — bundled waiting illustration copied from the approved maquette source.
- Modify: `apps/mobile/app/(auth)/request-pending.tsx` — visual confirmation route and login navigation.
- Modify: `apps/mobile/test/routes.test.mjs` — route-level static regression test.

### Task 1: Define the pending-request screen contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing route test**

Append this test:

```js
test('the pending-request screen uses the waiting illustration and returns to login', async () => {
  const source = await readFile(new URL('../app/(auth)/request-pending.tsx', import.meta.url), 'utf8');

  assert.match(source, /image_attente\.png/);
  assert.match(source, /fond_effetvague\.png/);
  assert.match(source, /Demande d’inscription reçue/);
  assert.match(source, /En attente de validation/);
  assert.match(source, /hourglass/);
  assert.match(source, /send/);
  assert.match(source, /href="\/login"/);
});
```

- [ ] **Step 2: Run the suite to verify the test fails**

Run: `pnpm --filter mobile test`

Expected: FAIL in `the pending-request screen uses the waiting illustration...` because the current route does not use the maquette assets or status card.

- [ ] **Step 3: Commit the red test**

```bash
git add -- 'apps/mobile/test/routes.test.mjs'
git commit -m "test: define mobile pending request screen contract"
```

### Task 2: Build the pending-validation maquette

**Files:**
- Create: `apps/mobile/assets/image_attente.png`
- Modify: `apps/mobile/app/(auth)/request-pending.tsx`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Bundle the approved illustration**

Copy `maquette/image_attente.png` to `apps/mobile/assets/image_attente.png` without modifying its pixels. Reference it from the route with:

```ts
const waitingIllustration = require("../../assets/image_attente.png");
```

- [ ] **Step 2: Replace the basic confirmation route with the approved hierarchy**

Import `Feather`, `Image`, `Pressable`, `Link`, and React Native layout primitives. Define local `background`, `logo`, and `waitingIllustration` requires. Render, in order:

```tsx
<Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
<Image source={waitingIllustration} style={styles.illustration} accessibilityLabel="Illustration de demande en attente" />
<Text style={styles.title}>Demande d’inscription reçue</Text>
<View style={styles.separator} />
<Text style={styles.message}>Votre demande d’inscription a bien été envoyée. Elle est actuellement en cours de validation par l’administrateur.</Text>
```

Place these inside the same full-screen `fond_effetvague.png` background pattern used by sign-up and OTP.

- [ ] **Step 3: Add the status card and patient-information area**

Use a bordered card containing `Feather name="hourglass"`, the heading `En attente de validation`, and `Vous recevrez une notification dès que votre compte sera approuvé.`. Below it, render decorative `Feather name="send"` with `accessible={false}`, then:

```tsx
<Text style={styles.thanks}>Merci pour votre patience.</Text>
<Text style={styles.notice}>Nous vous informons dès que possible.</Text>
```

Use the maquette’s navy text, teal accent, generous whitespace, rounded border, and no data fetched from Supabase.

- [ ] **Step 4: Add the discrete connection return link**

Render this at the bottom of the content:

```tsx
<Link href="/login" style={styles.loginLink} accessibilityRole="link">
  Retour à la connexion
</Link>
```

Do not use `/(auth)/login`: Expo Router resolves the existing public `/login` path, matching the other mobile authentication routes.

- [ ] **Step 5: Run the route suite to verify the test passes**

Run: `pnpm --filter mobile test`

Expected: PASS, including the new pending-request contract test.

- [ ] **Step 6: Commit the page and asset**

```bash
git add -- 'apps/mobile/app/(auth)/request-pending.tsx' 'apps/mobile/assets/image_attente.png'
git commit -m "feat: add mobile pending request maquette"
```

### Task 3: Validate the mobile integration

**Files:**
- Modify: none
- Test: `apps/mobile/app/(auth)/request-pending.tsx`

- [ ] **Step 1: Run TypeScript validation**

Run: `pnpm --filter mobile typecheck`

Expected: exit code 0.

- [ ] **Step 2: Build the Android Expo bundle**

Run: `pnpm --filter mobile exec expo start --lan --clear`

Request the Android Expo Router bundle URL printed by Metro and verify it returns HTTP 200.

- [ ] **Step 3: Check the route on Expo Go**

Complete the registration/OTP flow and verify the final screen has the supplied illustration, status card, login return link, and no keyboard or scrolling requirement.

