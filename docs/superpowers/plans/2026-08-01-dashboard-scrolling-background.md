# Dashboard Scrolling Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dashboard background with `new_fond_dashbord.png` and make it scroll with dashboard content.

**Architecture:** Bundle the source image under mobile assets. Move `ImageBackground` inside the existing `ScrollView`, so it grows with and scrolls alongside the content.

**Tech Stack:** React Native, Expo Metro, Node contract tests.

---

### Task 1: Bundle the scrolling background

**Files:**
- Create: `apps/mobile/assets/new_fond_dashbord.png`
- Modify: `apps/mobile/app/(admin)/dashboard.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] Write a failing test asserting `new_fond_dashbord.png` and that `ImageBackground` is nested under `ScrollView`.
- [ ] Run `pnpm --filter mobile test` and confirm it fails.
- [ ] Copy `maquette/new_fond_dashbord.png` to mobile assets; change the dashboard to `<ScrollView><ImageBackground source={background}>…</ImageBackground></ScrollView>` with `flexGrow: 1` content styling.
- [ ] Run `pnpm --filter mobile test`, `pnpm --filter mobile typecheck`, and `pnpm --filter mobile exec expo export --platform android --output-dir .expo-export-scrolling-background`.
- [ ] Commit with `git add apps/mobile/assets/new_fond_dashbord.png apps/mobile/app/(admin)/dashboard.tsx apps/mobile/test/routes.test.mjs && git commit -m "feat: add scrolling dashboard background"`.
