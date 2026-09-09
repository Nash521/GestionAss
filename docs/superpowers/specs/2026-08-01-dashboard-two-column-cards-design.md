# Dashboard two-column cards

## Objective

Display the six dashboard statistic cards in two columns on the mobile screen.

## Scope

- Keep the existing wrapping grid and its 10-pixel gap.
- Change each card width from `31%` to `48%`.
- Preserve the card content, height, background, scrolling behavior, and navigation.
- Extend the route-source test with the two-column width assertion.

## Verification

The source-contract test must first fail when it expects `width:"48%"`, then pass after the dashboard style uses that width. Mobile tests and TypeScript checking must pass.
