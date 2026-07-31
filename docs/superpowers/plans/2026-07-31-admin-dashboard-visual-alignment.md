# Admin Dashboard Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mobile admin dashboard to match the approved maquette while keeping unavailable financial data explicit.

**Architecture:** The existing `DashboardSummary` remains the only source of real member and contribution statistics. The screen is split into small presentational sections inside the dashboard route and uses a bundled copy of `arriere_plan_admin.png`, so Metro can resolve it on Android.

**Tech Stack:** Expo Router, React Native, Expo vector icons, existing Supabase dashboard function, Node contract tests.

---

### Task 1: Bundle and verify the administrator background

**Files:**
- Create: `apps/mobile/assets/arriere_plan_admin.png`
- Modify: `apps/mobile/app/(admin)/dashboard.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write the failing asset contract**

```js
assert.match(source, /assets\/arriere_plan_admin\.png/);
```

- [ ] **Step 2: Run the contract test**

Run: `pnpm --filter mobile test`

Expected: FAIL because the dashboard still loads `fond_effetvague.png`.

- [ ] **Step 3: Copy the approved `maquette/arriere_plan_admin.png` into `apps/mobile/assets/` and replace the `ImageBackground` source**

```tsx
const background = require('../../assets/arriere_plan_admin.png');
return <ImageBackground source={background} style={styles.page}>...</ImageBackground>;
```

- [ ] **Step 4: Verify Metro resolution**

Run: `pnpm --filter mobile exec expo export --platform android --output-dir .expo-export-check`

Expected: Android bundle completes with no `UnableToResolveError`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/assets/arriere_plan_admin.png apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: bundle admin dashboard background"
```

### Task 2: Rebuild the dashboard hierarchy

**Files:**
- Modify: `apps/mobile/app/(admin)/dashboard.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write failing contracts for the maquette sections**

```js
assert.match(source, /logo-removebg-preview\.png/);
assert.match(source, /Dernières transactions/);
assert.match(source, /Graphique évolution des cotisations/);
assert.match(source, /Tableau de bord/);
assert.match(source, /Membres/);
assert.match(source, /Finances/);
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter mobile test`

Expected: FAIL until all hierarchy labels and logo are rendered.

- [ ] **Step 3: Implement visual sections**

Render the top action buttons with Feather icons, centered logo, six three-column cards with real `DashboardSummary` values, a graph card with a six-month selector and `Module Finances bientôt disponible`, a structured empty transaction card, and the three-item bottom navigation. Card values use `money()` and unavailable actions use `Alert.alert('Bientôt disponible')`.

- [ ] **Step 4: Verify mobile code**

Run: `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`.

Expected: all contract tests pass and TypeScript reports no error.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs
git commit -m "feat: align admin dashboard with maquette"
```

### Task 3: Final Android bundle verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Export Android**

Run: `pnpm --filter mobile exec expo export --platform android --output-dir .expo-export-check`

Expected: success and a generated Android bundle.

- [ ] **Step 2: Run final tests**

Run: `pnpm --filter mobile test` and `pnpm --filter mobile typecheck`.

Expected: all tests and type checking pass.
