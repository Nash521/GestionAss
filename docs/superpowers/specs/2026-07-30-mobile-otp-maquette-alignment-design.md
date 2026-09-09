# Mobile OTP maquette alignment design

## Purpose

Bring the existing OTP screen visually into close alignment with `maquette/page_OTP.png` while preserving its already implemented verification and resend behaviour.

## Layout

The screen continues to use `fond_effetvague.png`, the same full-screen background as the account-creation screen. Its vertical hierarchy matches the maquette: GestionAss logo at the top, centered SMS-verification heading and explanatory text, phone card with phone icon and “Modifier”, six spacious OTP cells, validity text, full-width teal button, resend countdown/control, then a subtle bottom return action.

## Behaviour

The hidden six-digit numeric input, keyboard-safe scroll handling, verification call, membership-request creation, local 45-second resend timer, and server-side rate-limit authority remain unchanged. “Modifier” and “Retour” keep routing to sign-up.

## Verification

Static route tests assert the shared wave background, logo, phone card, six cells, verification and resend controls. Mobile tests, TypeScript, and the Android Expo bundle must pass.
