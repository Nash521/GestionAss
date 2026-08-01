# Dashboard Two-Column Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render dashboard statistic cards in two columns on mobile.

**Architecture:** Retain the current wrapping flex grid and 10-pixel gap. Change only `.card.width` and add a source-contract assertion that makes this visual contract explicit.

**Tech Stack:** React Native, Expo, Node test runner, TypeScript.

---

### Task 1: Change the dashboard grid to two columns

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs:253-267`
- Modify: `apps/mobile/app/(admin)/dashboard.tsx:29`

- [ ] **Step 1: Write a failing two-column assertion**

Add this line to the dashboard background test:

```js
assert.match(source, /card:\{[^}]*width:"48%"/);
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the source still declares `width:"31%"`.

- [ ] **Step 3: Change the card width**

In the `card` style declaration, replace:

```ts
width:"31%"
```

with:

```ts
width:"48%"
```

- [ ] **Step 4: Verify the mobile suite**

Run: `pnpm --filter mobile test`

Expected: 26 passing tests and 0 failures.

- [ ] **Step 5: Type-check**

Run: `pnpm --filter mobile typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: display dashboard cards in two columns"
```
