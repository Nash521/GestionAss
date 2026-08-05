# Dashboard mobile background

## Objective

Use the supplied `Fond_ecranMobile.png` image as the scrolling dashboard background.

## Scope

- Copy `maquette/Fond_ecranMobile.png` to `apps/mobile/assets/Fond_ecranMobile.png`.
- Replace the dashboard image module reference with the copied asset.
- Preserve the existing `ScrollView` and nested `ImageBackground` behavior with `resizeMode: "cover"`.
- Update the dashboard source-contract test to assert the new asset.

## Verification

The mobile route test first fails after expecting `Fond_ecranMobile.png`, then passes after the dashboard asset reference is changed. Type checking and Android export must pass.
