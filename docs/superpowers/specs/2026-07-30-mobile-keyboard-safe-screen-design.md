# Mobile keyboard-safe screen design

## Purpose

Keep the focused form field visible when the mobile keyboard opens on the registration, OTP and future login screens.

## Architecture

Create `apps/mobile/src/components/keyboard-safe-screen.tsx`. The component wraps children in `KeyboardAvoidingView` and a `ScrollView` whose content is fixed-looking when no keyboard is visible but can scroll after the available viewport shrinks. It exposes a `contentContainerStyle` prop for each screen’s spacing.

## Platform behaviour

On iOS, `KeyboardAvoidingView` uses padding. On Android, Expo config uses `softwareKeyboardLayoutMode: "resize"` so the activity resizes instead of being covered. The sign-up screen adopts the component now; OTP and login will import the same component when implemented.

## Verification

Tests assert the reusable component’s `KeyboardAvoidingView` and `ScrollView` use, the sign-up import, and Android keyboard resize configuration. TypeScript and Android bundling must pass.
