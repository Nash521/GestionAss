# Finance Tab Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Finance tab chips with the compact three-segment navigation bar from the approved reference image.

**Architecture:** Keep the existing `FinanceTab` state and data loading unchanged. Only the tab selector markup/styles and its source-contract tests change; the persistent admin navigation and Finance API remain untouched.

**Tech Stack:** Expo Router, React Native `StyleSheet`, Feather icons, Node test runner.

---

### Task 1: Replace the Finance selector

**Files:**
- Modify: `apps/mobile/app/(admin)/finances.tsx`
- Test: `apps/mobile/test/finance.test.mjs`

- [ ] **Step 1: Add failing UI contracts**

Assert that the Finance screen contains `calendar`, `gift`, and `external-link` icons, a white rounded tab bar, active green styling, all three labels, and no horizontal `ScrollView`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test apps/mobile/test/finance.test.mjs`

Expected: FAIL because the current selector renders text-only chip buttons.

- [ ] **Step 3: Implement the approved selector**

Replace the current `styles.tabs` / `styles.tab` chip row with a single rounded white container. Render each tab as a flex child containing its icon and label; use `numberOfLines={2}` for the exceptional label. Apply `activeTab` to the selected segment with `#00A99D` background and white icon/text, and use dark-blue icon/text for inactive segments. Keep `onPress={() => setTab(entry.key)}` unchanged and use `flex: 1`, compact padding and `minWidth: 0` so the bar cannot overflow narrow screens.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `node --test apps/mobile/test/finance.test.mjs` and `pnpm --filter mobile typecheck`

Expected: all Finance tests pass and TypeScript exits successfully.

- [ ] **Step 5: Commit the focused UI change**

```bash
git add "apps/mobile/app/(admin)/finances.tsx" apps/mobile/test/finance.test.mjs
git commit -m "feat: redesign finance tab bar"
```

### Task 2: Final regression verification

- [ ] **Step 1: Run the complete mobile suite**

Run: `pnpm --filter mobile test`

Expected: all existing and Finance tests pass.

- [ ] **Step 2: Run workspace typecheck**

Run: `pnpm typecheck`

Expected: all workspace packages pass.
