# Mobile login design

## Goal

Provide the GestionAss mobile login screen from `maquette/page_logIn.png` and route authenticated members according to their membership status.

## User flow

1. The user enters an Ivorian phone number and password on `/login`.
2. The app normalizes the phone number to the Ivorian `+2250XXXXXXXXX` format and signs in through Supabase Auth's phone-and-password API.
3. With the authenticated session, the app invokes `get-session-destination`.
4. The function returns one of three outcomes:
   - `pending`: redirect to `/request-pending`;
   - `active`: redirect to `/home`;
   - `unavailable`: keep the user on the login screen and show a neutral access error.
5. `Mot de passe oublié ?` opens a temporary informational screen. `Créer un compte` opens `/sign-up`.

## Components

- `apps/mobile/app/(auth)/login.tsx`: visual form, validation, loading and error states, route links.
- `apps/mobile/src/lib/supabase.ts`: authenticated calls to Supabase Auth and Edge Functions.
- `supabase/functions/get-session-destination/index.ts`: validates the bearer token and resolves the session user's membership state without exposing table access directly to the mobile client.
- `apps/mobile/app/(auth)/password-reset.tsx`: temporary reset-information screen.
- `apps/mobile/app/home.tsx`: minimal authenticated landing screen.

## Status resolution

The Edge Function reads the signed-in user's records with server-side credentials. A pending membership request yields `pending`. An active user/member yields `active`. Rejected, suspended, removed, missing, or inconsistent records yield `unavailable`.

The mobile client never decides a user's membership state and receives only the route outcome.

## Error handling

- Missing or invalid inputs are rejected locally before sending a request.
- Invalid credentials show a generic French error.
- Network, configuration, and unexpected server failures show a retryable generic French error.
- The submit button is disabled while requests are in progress.

## Testing

- Mobile tests assert the visible login controls, the two links, input validation, loading behavior, and routing for `pending` and `active` responses.
- Edge Function tests verify that an unauthenticated request is rejected and that pending, active, and unavailable states produce the correct minimal response.
- The full mobile test suite and TypeScript type check run before completion.
