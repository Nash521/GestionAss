# Password reset design

## Goal

Let an active member reset a forgotten password through an SMS OTP, then return to the login screen.

## Flow

1. The member enters an Ivorian phone number on the password-reset page.
2. `send-password-reset-otp` returns a neutral success response. It sends a `password_reset` OTP only for an active application user.
3. The member enters the six-digit code, a new password, and its confirmation.
4. `reset-password-with-otp` consumes the OTP atomically, updates the Supabase Auth password, signs the user out everywhere, and returns success.
5. The mobile app clears biometric session data and replaces the route with `/login`.

## Security

The existing OTP expiry, resend cooldown, and five-attempt limit apply to the `password_reset` purpose. Pending, rejected, suspended, removed, missing, or inactive accounts do not receive an exploitable reset. Responses remain neutral to avoid account enumeration.

## Interface

The temporary password-reset screen becomes a three-step form: phone, OTP, then new password. It validates password confirmation locally, disables active submissions, and supports returning to login.

## Tests

Edge tests cover unauthenticated input, inactive accounts, OTP verification, password update, and session invalidation. Mobile tests cover steps, validation, reset calls, biometric cleanup, and login redirection.
