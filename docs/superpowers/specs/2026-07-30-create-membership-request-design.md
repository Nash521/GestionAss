# Pending membership request creation design

## Scope

Create a pending membership request after an applicant has verified their phone with an OTP and a valid invitation. Mobile screens and administrator approval are outside this lot.

## Flow

`create-membership-request` accepts first name, last name, Ivorian phone, password and an OTP registration token. It verifies the encrypted and HMAC-authenticated token, requiring purpose `otp` and an exact phone match. It atomically consumes the associated invitation to obtain the organization, then creates a confirmed Supabase Auth user, an inactive application user and a `pending` membership request.

## Failure handling

The function never returns an authenticated session. If any application-record insertion fails after Auth user creation, it deletes that Auth user and reverses the consumed invitation use so the applicant can retry. Duplicate phones, invalid tokens, unavailable invitations and validation failures return safe errors without exposing organization data.

## Verification

Tests cover absent or invalid OTP tokens, an exhausted invitation, successful pending request creation, and compensating cleanup after an inserted-record failure. Tests assert the resulting application user is inactive and no partial Auth user or invitation use remains after compensation.
