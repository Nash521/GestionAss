# Compact login design

## Goal

Align the login screen density with the existing sign-up screen while preserving the login flow and actions.

## Layout

`apps/mobile/app/(auth)/login.tsx` will use the sign-up screen's compact measurements: an 86 px logo, 24 px heading, 13 px subtitle, 42 px fields, 44 px buttons, and short vertical margins. The full screen remains visible without a scroll container.

## Preserved behavior

Phone and password validation, password visibility, Supabase sign-in, destination routing, password-reset link, and account-creation link are unchanged.

## Testing

The mobile route contract test will assert the compact dimensions and continue to assert login routing and both links.
