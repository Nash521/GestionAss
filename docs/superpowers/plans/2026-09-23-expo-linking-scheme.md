# Expo Linking Scheme Implementation Plan

> **For agentic workers:** Follow this plan inline. Steps use checkbox syntax for tracking.

**Goal:** Give GestionAss an explicit URL scheme so Expo Router can resolve app links without the missing-scheme warning.

**Architecture:** Add the app slug as the custom scheme in Expo's existing app config. Keep routes and outgoing links unchanged; verify the resolved public Expo config exposes the exact scheme.

**Tech Stack:** Expo SDK 57, Expo Router, JSON app config.

---

### Task 1: Declare and verify the app scheme

**Files:**
- Modify: `apps/mobile/app.json`

- [x] Add `"scheme": "gestion-ass"` under the top-level `expo` configuration.
- [x] Run `pnpm --dir apps/mobile exec expo config --type public --json` and confirm its JSON contains `"scheme": "gestion-ass"`.
- [x] Run `pnpm --dir apps/mobile typecheck`.
- [x] Restart the Expo server on port 8082 so it reloads the app config; confirm Metro starts and advertises `exp://10.90.134.164:8082`.
- [x] Commit the app config and plan, then push the commit to `origin/codex/admin-dashboard-metrics` to update PR #3.
