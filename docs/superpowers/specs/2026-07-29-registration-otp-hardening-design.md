# Registration OTP hardening design

## Scope

Secure and validate the existing registration OTP implementation only. Membership-request creation is explicitly out of scope.

## Components

- `supabase/functions/_shared/otp.ts` owns secure six-digit generation, SHA-256 hashing, constant-time comparison, expiry, resend cooldown and attempt-limit helpers.
- `supabase/functions/_shared/sms.ts` exposes a development no-op provider and an explicit configuration boundary for live delivery.
- `send-registration-otp` validates an Ivorian phone number, enforces the five-minute resend cooldown, sends through the provider, and persists a fresh hashed code with a ten-minute expiry.
- `verify-registration-otp` accepts only a six-digit code, rejects consumed, expired, or exhausted OTPs, increments failed attempts, and atomically consumes a valid code.

## Safety and error behavior

OTP codes are never persisted in plaintext. Verification returns the same invalid-or-expired response for invalid, expired, consumed, malformed, or exhausted codes. Development SMS never contacts an external provider. Configuration failures return a service-unavailable response.

## Verification

Deno unit tests cover generation, hashing, comparison, exact expiry and cooldown boundaries, and the development SMS provider. The functions are type-checked and exercised with the local Supabase environment where configuration permits.

## Commit scope

Commit only the function sources and their tests. Exclude Supabase runtime folders and start logs.
