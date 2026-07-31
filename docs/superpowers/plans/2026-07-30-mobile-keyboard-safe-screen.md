# Mobile Keyboard-safe Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure auth form fields can move above the keyboard on Android and iOS.

**Architecture:** `KeyboardSafeScreen` provides the reusable keyboard-aware container. The sign-up route supplies its current compact form as children, while Expo’s Android configuration uses `resize` so keyboard opening shrinks the activity safely.

**Tech Stack:** Expo SDK 54, React Native, Node test runner, TypeScript.

---

### Task 1: Cover reusable keyboard safety

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing source test**

```js
test('the sign-up screen uses the keyboard-safe container and Android resizes for the keyboard', async () => {
  const signUp = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');
  const container = await readFile(new URL('../src/components/keyboard-safe-screen.tsx', import.meta.url), 'utf8');
  const config = await readFile(new URL('../app.json', import.meta.url), 'utf8');

  assert.match(signUp, /KeyboardSafeScreen/);
  assert.match(container, /KeyboardAvoidingView/);
  assert.match(container, /ScrollView/);
  assert.match(config, /"softwareKeyboardLayoutMode": "resize"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the reusable container and Android configuration are absent.

### Task 2: Implement and adopt the container

**Files:**
- Create: `apps/mobile/src/components/keyboard-safe-screen.tsx`
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Create `KeyboardSafeScreen`**

```tsx
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

export function KeyboardSafeScreen({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ page: { flex: 1 }, content: { flexGrow: 1 } });
```

- [ ] **Step 2: Wrap the sign-up content**

Import `KeyboardSafeScreen` and replace the inner form `View` with it. Preserve the background image and `styles.content` so the page remains visually fixed before keyboard opening.

- [ ] **Step 3: Set Android keyboard resize mode**

Add to `apps/mobile/app.json`:

```json
"android": { "softwareKeyboardLayoutMode": "resize" }
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript exits with code 0.

```bash
git add apps/mobile/src/components/keyboard-safe-screen.tsx apps/mobile/app/(auth)/sign-up.tsx apps/mobile/app.json apps/mobile/test/routes.test.mjs
git commit -m "feat: keep auth fields visible above keyboard"
git push
```
