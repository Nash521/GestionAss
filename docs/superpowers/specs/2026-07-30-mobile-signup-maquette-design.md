# Mobile sign-up maquette design

## Purpose

Restyle the Expo `sign-up` screen to match `maquette/page1signIn.png` while preserving the invitation and OTP registration flow.

## Layout

The screen has a white background. `effet_haut_page.png` is fixed at the top and `effet_bas_page.png` is fixed at the bottom as non-interactive decoration. A scrollable form layer appears above them, with the GestionAss logo, the title “Créer un compte”, its supporting text, rounded white input cards, and the green primary button.

## Form behaviour

The fields are ordered: invitation code, last name, first name, Ivorian phone number, password, and password confirmation. The existing validation remains authoritative; confirmation must match the password before any Edge Function call. A valid submission validates the invitation, sends the OTP, and opens the OTP screen. Errors remain generic and safe.

## Assets and accessibility

The logo and the two wave PNGs are copied into `apps/mobile/assets` so Metro can bundle them. Decorative waves are inaccessible; the logo receives an accessibility label. The scroll view remains usable when the keyboard is open or the screen is short.

## Verification

Route tests assert the local wave assets, invitation field, password-confirmation validation, and OTP navigation source contract. Mobile tests and TypeScript must pass.
