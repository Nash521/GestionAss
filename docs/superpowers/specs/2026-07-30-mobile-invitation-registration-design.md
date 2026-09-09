# Mobile invitation registration design

## Scope

Connect the existing invitation, OTP and pending-request backend to Expo mobile screens styled after the supplied green maquettes.

## Screens and flow

`sign-up` validates the invitation code first, then collects identity, Ivorian phone and password. It keeps invitation evidence and non-sensitive draft data in memory, requests the OTP, and navigates to `verify-phone`. `verify-phone` submits the code and invitation evidence, receives OTP evidence, creates the pending membership request, then navigates to `request-pending`. The final screen explains that an administrator must approve the request.

## Safety and feedback

Passwords and tokens are never persisted on device storage. Buttons are disabled during network requests. Invalid invitation, OTP and backend failures show safe French messages without organization details. Leaving the flow clears in-memory registration state.

## Verification

React Native tests cover form validation, no network call on invalid input, successful route transitions, API errors and pending-screen rendering.
