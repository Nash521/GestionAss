# Invitation-based registration design

## Scope

Add invitation-code validation before registration OTP delivery and define the server-side contract needed to create a pending membership request in the invited organization. Mobile screens and administrator invitation-management screens are outside this lot.

## Invitation model

`public.organization_invitations` belongs to one organization. It stores a SHA-256 code hash, an active flag, an optional expiry timestamp, an optional usage limit, a usage count, and audit timestamps. Plaintext invitation codes are never persisted.

An invitation is valid only when active, unexpired, and below its usage limit. It is consumed atomically when a membership request is created, rather than when the OTP is sent, so an abandoned registration does not waste a use.

## Registration flow

1. The applicant submits an invitation code.
2. `validate-registration-invitation` validates it and issues a short-lived signed registration token containing the invitation and organization identifiers.
3. `send-registration-otp` requires that token before sending a code to the provided Ivorian phone number.
4. The applicant verifies the OTP.
5. `create-membership-request` revalidates and consumes the signed registration token in a database transaction, creates the Auth user, application user and pending membership request for the invited organization, then prevents access until an administrator approves it.

## Error handling and privacy

Invitation validation returns a generic invalid-or-expired response for unknown, inactive, expired, and exhausted codes. Function responses do not reveal organization identifiers. Tokens expire quickly, are signed with a server-only secret, and are accepted only for the registration flow.

## Verification

Database tests cover invitation validity, expiry, use limits, and atomic consumption. Deno tests cover token signing and verification, expiry and invalid tokens. Edge Function checks ensure the invitation token is required before OTP delivery and membership-request creation.
