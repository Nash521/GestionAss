# Compact login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the login screen's density to the sign-up screen without changing login behavior.

**Architecture:** Only `login.tsx` style values change. The existing source-contract test protects the compact dimensions and preserves the established authentication and routing tests.

**Tech Stack:** Expo Router, React Native, Node test runner.

---

### Task 1: Compact the login screen

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Write the failing compact-layout test**

```js
test('the login screen uses the compact sign-up dimensions', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /height: 86/);
  assert.match(source, /fontSize: 24/);
  assert.match(source, /fontSize: 13/);
  assert.match(source, /minHeight: 42/);
  assert.match(source, /minHeight: 44/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the login styles still use 150 px logo, 38 px title, 70 px fields, and 66 px buttons.

- [ ] **Step 3: Apply the compact styles**

```ts
logo: { height: 86, width: 86, marginBottom: 4 },
title: { fontSize: 24 },
subtitle: { fontSize: 13, marginBottom: 9 },
field: { minHeight: 42, marginBottom: 6, borderRadius: 13 },
input: { fontSize: 14, minHeight: 42 },
submitButton: { minHeight: 44, borderRadius: 14 },
createButton: { minHeight: 44, borderRadius: 14 },
```

- [ ] **Step 4: Run the mobile test and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the compact layout**

```bash
git add apps/mobile/app/(auth)/login.tsx apps/mobile/test/routes.test.mjs
git commit -m "fix: compact mobile login layout"
```
