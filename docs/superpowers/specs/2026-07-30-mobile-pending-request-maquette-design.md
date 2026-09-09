# Mobile pending-request maquette design

## Purpose

Restyle the membership-request confirmation route to match `maquette/page_attente.png` after the OTP and membership-request flow succeeds.

## Layout

The screen uses the existing unified wave background and GestionAss logo. It displays the provided local `image_attente.png` illustration, the title “Demande d’inscription reçue”, the short green separator, the administrator-validation message, then a bordered status card. The card contains an hourglass icon, “En attente de validation”, and the notification message. A paper-plane icon and the patient-information message complete the page.

## Behaviour

The page is informational: it makes no new network or Supabase request. A subtle “Retour à la connexion” action at the bottom routes to `/login` so the user can leave the confirmation screen.

## Safety and accessibility

The page does not expose registration data, OTPs, invitation tokens, or passwords. The local logo and illustration have French accessibility labels; decorative icons are not announced.

## Verification

Static mobile-route tests verify use of the waiting illustration, the approval-status content, the shared visual background, and the connection return route. Mobile tests, TypeScript, and the Android Expo bundle must pass.
