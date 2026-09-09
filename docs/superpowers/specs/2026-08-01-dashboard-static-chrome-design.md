# Dashboard static header and navigation

## Objective

Keep the dashboard header and bottom navigation visible while only the dashboard content scrolls.

## Layout

- The header is fixed 28 pixels below the top of the screen, clearing the system status area.
- Its logo is reduced to 64 pixels high and wide.
- Event and settings actions use `calendar` and `settings` Feather icons, without labels, in separate white rounded containers with a subtle shadow.
- The bottom navigation is fixed above the safe area, without labels.
- It uses `grid`, `users`, and `credit-card` Feather icons for dashboard, members, and finances. The dashboard icon is turquoise.
- The scrollable content reserves top and bottom spacing so it never sits under either fixed bar.

## Scope

- Keep the existing dashboard data, cards, background image, and routes unchanged.
- Retain the existing temporary action behavior for unavailable areas.
- Add source-contract tests for fixed chrome and icon-only controls.

## Verification

The mobile route test must fail before the fixed header/navigation markers are present, then pass after implementation. Mobile tests and TypeScript checking must pass.
