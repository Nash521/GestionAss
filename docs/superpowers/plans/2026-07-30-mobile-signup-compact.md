# Mobile Compact Sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the six-field invitation sign-up form on one compact, non-scrollable screen over the unified wave background.

**Architecture:** The sign-up route keeps its existing local form state and Edge Function flow. Its layout changes from two decorative images plus `ScrollView` to one absolute full-screen `Image` and a compact fixed `View`; validation and navigation do not change.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native, Node test runner, TypeScript.

---

### Task 1: Cover the compact single-background contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing source-contract test**

```js
test('the sign-up screen uses the unified background without scrolling and compact inputs', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /fond_effetvague\.png/);
  assert.doesNotMatch(source, /ScrollView/);
  assert.doesNotMatch(source, /effet_haut_page\.png/);
  assert.doesNotMatch(source, /effet_bas_page\.png/);
  assert.match(source, /minHeight: 42/);
  assert.match(source, /router\.push\("\/\(auth\)\/verify-phone"\)/);
});
```

- [ ] **Step 2: Run the mobile tests to verify the expected failure**

Run: `pnpm --filter mobile test`

Expected: FAIL because the route still contains `ScrollView` and separate wave file names.

### Task 2: Bundle unified artwork and compact the page

**Files:**
- Create: `apps/mobile/assets/fond_effetvague.png` (copy from `maquette/fond_effetvague.png`)
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Copy the unified background into mobile assets**

Run:

```powershell
Copy-Item -LiteralPath 'maquette/fond_effetvague.png' -Destination 'apps/mobile/assets/fond_effetvague.png'
```

- [ ] **Step 2: Replace separate waves and scroll container**

Use the following primitives while retaining the existing six `TextInput` controls and `submit` function:

```tsx
const background = require("../../assets/fond_effetvague.png");

return (
  <View style={styles.page}>
    <Image source={background} style={styles.background} accessible={false} />
    <View style={styles.content}>
      <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez-nous et faites la différence.</Text>
      {/* Keep the six controlled input fields, error and submit button. */}
    </View>
  </View>
);
```

Set `background` to absolute fill with `resizeMode: "cover"`; set `content` horizontal padding to 22 and vertical padding to 34; set the logo to 70×70, title to 24, subtitle to 13, inputs to `minHeight: 42` with 8 px bottom margin, and the button to 44 px vertical height. Remove `ScrollView`, `KeyboardAvoidingView`, `Platform`, `topWave`, and `bottomWave` imports and styles.

- [ ] **Step 3: Run the full mobile verification**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript exits with code 0.

- [ ] **Step 4: Commit and push the compact variant**

```bash
git add apps/mobile/assets/fond_effetvague.png apps/mobile/app/(auth)/sign-up.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: compact mobile sign-up layout"
git push
```
