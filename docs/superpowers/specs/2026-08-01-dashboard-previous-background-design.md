# Dashboard previous background

## Objective

Restore the dashboard background used before the latest visual revision.

## Scope

- Use `apps/mobile/assets/arriere_plan_admin.png` in the admin dashboard.
- Preserve the current `ScrollView` and nested `ImageBackground` structure so the background scrolls with the dashboard content.
- Update the route-source test to assert the restored asset.

## Out of scope

- No dashboard layout, data-loading, or navigation changes.
- No modification to either image asset.

## Verification

The mobile route test must fail while it expects `new_fond_dashbord.png`, then pass after the dashboard and the assertion use `arriere_plan_admin.png`. Type checking will also run.
