# Mobile OTP maquette alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the OTP verification screen’s layout and visual rhythm with `maquette/page_OTP.png` while retaining all existing OTP behaviour.

**Architecture:** Only `verify-phone.tsx` presentation styles and hierarchy change. The existing state, Edge Function calls, hidden numeric input, keyboard-safe wrapper, navigation, and resend timer stay intact.

**Tech Stack:** Expo SDK 54, React Native, Expo Router, `@expo/vector-icons`, TypeScript, Node built-in tests.

---

## File structure

- Modify: `apps/mobile/app/(auth)/verify-phone.tsx` — maquette-aligned spacing and visual hierarchy.
- Modify: `apps/mobile/test/routes.test.mjs` — static styling contract.

### Task 1: Define the visual alignment contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Add the failing visual contract**

Append this test:

```js
test('the OTP screen follows the approved maquette hierarchy', async () => {
  const source = await readFile(new URL('../app/(auth)/verify-phone.tsx', import.meta.url), 'utf8');

  assert.match(source, /fond_effetvague\.png/);
  assert.match(source, /logo-removebg-preview\.png/);
  assert.match(source, /phoneCard/);
  assert.match(source, /codeCells/);
  assert.match(source, /justifyContent: "space-evenly"/);
  assert.match(source, /minHeight: 52/);
  assert.match(source, /Vérification par SMS/);
});
```

- [ ] **Step 2: Run the test to prove it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the current content uses `justifyContent: "center"` and 46-pixel OTP cells.

- [ ] **Step 3: Commit the red test**

```bash
git add -- 'apps/mobile/test/routes.test.mjs'
git commit -m "test: define OTP maquette alignment"
```

### Task 2: Align OTP presentation to the maquette

**Files:**
- Modify: `apps/mobile/app/(auth)/verify-phone.tsx`
- Test: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Preserve all functional code and reorganize only visual groups**

Keep `submit`, `resend`, `updateCode`, the `TextInput`, and all Edge Function names byte-for-byte in purpose. Group the render hierarchy in this order: logo; title/subtitle; phone card; OTP cells and validity; error/button; resend text/control; return action.

- [ ] **Step 2: Apply maquette spacing and proportions**

Update the style values to make the page breathe like the approved reference:

```ts
content: { flexGrow: 1, justifyContent: "space-evenly", paddingHorizontal: 30, paddingVertical: 20 },
logo: { alignSelf: "center", width: 96, height: 96, resizeMode: "contain" },
phoneCard: { borderRadius: 15, marginTop: 8, paddingHorizontal: 16, paddingVertical: 14 },
codeCells: { marginTop: 14, justifyContent: "space-between", flexDirection: "row" },
codeCell: { width: 46, height: 52, borderRadius: 12, borderWidth: 1 },
verifyButton: { minHeight: 50, borderRadius: 15, marginTop: 12 },
```

Keep `background` as `StyleSheet.absoluteFillObject` using `fond_effetvague.png`, and retain the same navy (`#102B3D`) and teal (`#00A99D`) palette.

- [ ] **Step 3: Keep the controls visually discrete in the lower section**

Keep the existing resend and return Pressables. Use compact vertical gaps so the countdown, resend label, and `Retour` sit below the primary button without competing with the title or OTP cells.

- [ ] **Step 4: Run the route suite**

Run: `pnpm --filter mobile test`

Expected: PASS including `the OTP screen follows the approved maquette hierarchy`.

- [ ] **Step 5: Commit the visual correction**

```bash
git add -- 'apps/mobile/app/(auth)/verify-phone.tsx'
git commit -m "fix: align mobile OTP page with maquette"
```

### Task 3: Validate on Android

**Files:**
- Modify: none
- Test: `apps/mobile/app/(auth)/verify-phone.tsx`

- [ ] **Step 1: Run type validation**

Run: `pnpm --filter mobile typecheck`

Expected: exit code 0.

- [ ] **Step 2: Verify the Android bundle**

Run: `pnpm --filter mobile exec expo start --lan --clear`

Request the Android bundle URL from Metro and verify HTTP 200.

- [ ] **Step 3: Check the direct preview route**

Open `exp://192.168.1.126:8081/--/verify-phone` in Expo Go. Confirm the logo, background, card, six cells, primary button, resend controls, and return action match the maquette’s vertical hierarchy.

