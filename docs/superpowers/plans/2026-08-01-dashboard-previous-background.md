# Dashboard Previous Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore `arriere_plan_admin.png` as the dashboard background while retaining the scrolling background behavior.

**Architecture:** The dashboard keeps its existing `ScrollView` containing `ImageBackground`. Only the image module reference changes. Source-contract tests in the mobile route suite protect both the selected asset and the nesting that makes it scroll.

**Tech Stack:** Expo Router, React Native, Node test runner, TypeScript.

---

### Task 1: Restore the dashboard asset reference

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs:253-266`
- Modify: `apps/mobile/app/(admin)/dashboard.tsx:7`

- [ ] **Step 1: Write the failing test expectation**

Replace both dashboard background assertions with:

```js
assert.match(source, /arriere_plan_admin\.png/);
```

- [ ] **Step 2: Run the mobile route test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because `dashboard.tsx` still contains `new_fond_dashbord.png`.

- [ ] **Step 3: Restore the previous asset in the dashboard**

Replace the background declaration with:

```ts
const background = require("../../assets/arriere_plan_admin.png");
```

Do not change the existing `ScrollView` and `ImageBackground` nesting.

- [ ] **Step 4: Run the mobile route test to verify it passes**

Run: `pnpm --filter mobile test`

Expected: all route tests PASS, including the restored-background and scroll-background assertions.

- [ ] **Step 5: Type-check the mobile app**

Run: `pnpm --filter mobile typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "fix: restore previous dashboard background"
```
