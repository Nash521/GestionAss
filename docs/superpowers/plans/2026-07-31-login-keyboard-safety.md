# Login keyboard safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep focused login inputs visible above the keyboard.

**Architecture:** Reuse `KeyboardSafeScreen`, the existing Android-aware keyboard container used by sign-up and OTP. The login background remains outside this container.

**Tech Stack:** Expo Router, React Native, react-native-keyboard-aware-scroll-view, Node test runner.

---

### Task 1: Apply keyboard safety to login

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Write the failing keyboard-safety test**

```js
test('the login screen keeps focused fields above the keyboard', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /KeyboardSafeScreen/);
  assert.match(source, /<KeyboardSafeScreen>/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the login content is directly inside a `View`.

- [ ] **Step 3: Reuse the existing keyboard-safe container**

```tsx
import { KeyboardSafeScreen } from "../../src/components/keyboard-safe-screen";

<View style={styles.page}>
  <Image source={background} style={styles.background} accessible={false} />
  <KeyboardSafeScreen>
    <View style={styles.content}>{/* existing login content */}</View>
  </KeyboardSafeScreen>
</View>
```

- [ ] **Step 4: Run mobile tests and the type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the keyboard-safe login**

```bash
git add apps/mobile/app/(auth)/login.tsx apps/mobile/test/routes.test.mjs
git commit -m "fix: keep login fields above keyboard"
```
