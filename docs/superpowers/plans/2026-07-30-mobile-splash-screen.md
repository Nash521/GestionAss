# Mobile Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the GestionAss logo on a white startup screen for three seconds before opening the login page.

**Architecture:** The Expo Router index route becomes a self-contained splash screen. A `useEffect` schedules exactly one `router.replace("/login")` call; its cleanup cancels the timeout when the component unmounts. The existing logo is bundled with Metro through a static `require`.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native, Node test runner, TypeScript.

---

### Task 1: Cover splash route intent

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing route-source test**

```js
test('the splash screen renders the bundled logo and schedules a three-second login replacement', async () => {
  const source = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');

  assert.match(source, /logo-removebg-preview\.png/);
  assert.match(source, /setTimeout\(\(\) => \{\s*router\.replace\("\/login"\);\s*\}, 3000\)/s);
  assert.match(source, /clearTimeout\(timeout\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because `app/index.tsx` currently redirects immediately and does not reference the logo or timer.

- [ ] **Step 3: Implement the splash route**

Replace `apps/mobile/app/index.tsx` with this implementation:

```tsx
import { useEffect } from "react";
import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

const logo = require("../../../maquette/logo-removebg-preview.png");

export default function Index() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/login");
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.page}>
      <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  logo: { width: 180, height: 180, resizeMode: "contain" },
});
```

- [ ] **Step 4: Run the complete mobile verification**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all route tests pass and TypeScript exits with code 0.

- [ ] **Step 5: Commit the implementation**

```bash
git add apps/mobile/app/index.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: add mobile startup splash screen"
```
