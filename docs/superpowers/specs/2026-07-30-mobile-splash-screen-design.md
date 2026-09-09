# Mobile splash screen design

## Purpose

Show the existing GestionAss logo on a white launch screen before the mobile entry page.

## Behaviour

`app/index.tsx` renders a white, full-screen splash screen with `maquette/logo-removebg-preview.png` centered both horizontally and vertically. On mount, it starts one three-second timer. When the timer completes, Expo Router replaces the current route with `/login`, so the system Back action cannot return to the splash screen.

## Safety and accessibility

The logo has an accessibility label. The timeout is cleared when the component unmounts, preventing navigation from a stale screen.

## Verification

Mobile route tests confirm the logo asset is rendered and that the scheduled navigation replaces the route with `/login` after three seconds.
