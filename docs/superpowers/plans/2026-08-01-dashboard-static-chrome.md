# Dashboard Static Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the dashboard header and icon-only navigation static while the dashboard content scrolls.

**Architecture:** The fixed header and bottom bar are siblings of the `ScrollView` inside the dashboard root view. The existing `ImageBackground` remains inside the scroll view so its background moves with content. Scroll content gets top and bottom padding to clear the static chrome.

**Tech Stack:** React Native, Expo Router, Feather icons, Node test runner, TypeScript.

---

### Task 1: Add static chrome source contract

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs:263-268`

- [ ] **Step 1: Write failing assertions**

Add the following assertions to the dashboard test:

```js
assert.match(source, /name="calendar"/);
assert.match(source, /name="settings"/);
assert.match(source, /name="grid"/);
assert.match(source, /name="users"/);
assert.match(source, /name="wallet"/);
assert.match(source, /header:\{[^}]*position:"absolute"[^}]*top:0/);
assert.match(source, /nav:\{[^}]*position:"absolute"[^}]*bottom:20/);
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the current dashboard has text actions and no fixed header or navigation styles.

### Task 2: Implement static icon-only chrome

**Files:**
- Modify: `apps/mobile/app/(admin)/dashboard.tsx:14-29`

- [ ] **Step 1: Move header and navigation outside the ScrollView**

Render the scroll view and its `ImageBackground` inside a root `View`, then render a `header` view and a `nav` view after it. Keep `header` and `nav` absolute.

- [ ] **Step 2: Replace labels with selected icons**

Use `calendar` and `settings` for the header actions. Use `grid`, `users`, and `wallet` for the bottom navigation. Do not render any action or navigation text.

- [ ] **Step 3: Apply fixed-chrome spacing and button styling**

Use a 64-pixel logo, white rounded 46-pixel header buttons with elevation, and `content` top/bottom padding that clears the header and navigation.

- [ ] **Step 4: Run regression and type checks**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: 26 tests pass and TypeScript exits with code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: make dashboard chrome static and icon-only"
```
