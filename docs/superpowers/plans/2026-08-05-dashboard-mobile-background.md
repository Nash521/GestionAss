# Dashboard Mobile Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the supplied mobile background image in the scrolling dashboard.

**Architecture:** The image is copied into the mobile asset directory and required directly by `dashboard.tsx`. The current `ScrollView`/`ImageBackground` nesting and `cover` mode remain unchanged, so the image scrolls with dashboard content without stretching.

**Tech Stack:** React Native, Expo assets, Node test runner, TypeScript.

---

### Task 1: Replace the dashboard background asset

**Files:**
- Create: `apps/mobile/assets/Fond_ecranMobile.png`
- Modify: `apps/mobile/app/(admin)/dashboard.tsx:7`
- Modify: `apps/mobile/test/routes.test.mjs:264-266`

- [ ] **Step 1: Write failing assertions**

Replace the background asset assertion with:

```js
assert.match(source, /Fond_ecranMobile\.png/);
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the dashboard still requires `arriere_plan_admin.png`.

- [ ] **Step 3: Copy and reference the asset**

Copy `maquette/Fond_ecranMobile.png` to `apps/mobile/assets/Fond_ecranMobile.png`, then use:

```ts
const background = require("../../assets/Fond_ecranMobile.png");
```

- [ ] **Step 4: Verify the app bundle**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck && pnpm --filter mobile exec expo export --platform android --output-dir .expo-export-mobile-background`

Expected: tests pass, TypeScript exits with 0, and Android export completes.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/assets/Fond_ecranMobile.png apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: use mobile dashboard background"
```
