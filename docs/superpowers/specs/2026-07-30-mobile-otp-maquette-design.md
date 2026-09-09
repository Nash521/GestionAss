# Mobile OTP maquette design

## Purpose

Restyle phone verification to match `maquette/page_OTP.png` and let a registrant resend an OTP after a visible 45-second delay.

## Layout

The OTP page uses the existing unified wave background and logo. It shows the draft phone number, a “Modifier” action back to sign-up, six visual code cells, the five-minute validity message, primary verification button, countdown and resend action, plus a back action.

## Behaviour

One hidden numeric text input owns the six-digit code, supporting typing and paste; six styled cells reflect its digits and focus. Verification keeps the existing OTP verification and membership-request calls. The resend control is disabled for 45 seconds initially and after each successful `send-registration-otp` call; it sends the draft phone and invitation token from in-memory registration state. The keyboard-safe screen keeps the cells above the keyboard.

## Safety and feedback

No password or tokens leave in-memory state. Resend and verification errors are generic. The server remains authoritative for rate limits even if the local timer is bypassed.

## Verification

Tests assert the code cells, resend countdown, existing Edge Function names, keyboard-safe container and return route. Mobile tests, TypeScript and the Android bundle must pass.
