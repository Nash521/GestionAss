# Admin membership approval design

## Goal

Let an active administrator approve or reject pending membership requests from a temporary Expo admin page.

## Approval

A PostgreSQL transaction, callable only by an active administrator of the request organisation, locks the pending request, generates the next organisation-local member number in `M-000001` format, creates an active member, creates the membership fee from the organisation amount, activates the application user, and marks the request approved with audit fields. It rejects a second decision and cross-organisation access.

## Rejection

Rejection requires a non-empty reason. It records the reviewing admin and timestamp, keeps the user inactive, and prevents further decisions on the request.

## Interface

`/(admin)/membership-requests` lists only pending requests for the active administrator’s organisation. Each request supports Approve and Reject actions; Reject presents a reason field. Buttons are disabled while the decision is pending, and the list refreshes after success.

## Security and tests

The mobile app calls an authenticated Edge Function rather than directly mutating membership tables. Database, function, and interface tests cover authorization, approval, rejection, member-number uniqueness, and repeated decisions.
