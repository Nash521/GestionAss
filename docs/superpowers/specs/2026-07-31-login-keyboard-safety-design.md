# Login keyboard safety design

## Goal

Keep the active login input visible above the on-screen keyboard.

## Implementation

Only `apps/mobile/app/(auth)/login.tsx` changes. Its content is wrapped by the existing `KeyboardSafeScreen` component, which combines keyboard avoidance and Android-aware scrolling. The background image stays outside that container and all compact styles and login behavior remain unchanged.

## Testing

The mobile route contract test asserts that the login screen imports and renders `KeyboardSafeScreen`. The mobile test suite and TypeScript type check verify the change.
