# Mobile compact sign-up design

## Purpose

Make the invitation registration form fit on one non-scrollable mobile screen using the unified `fond_effetvague.png` artwork.

## Layout

The unified artwork fills the full screen behind the form. The logo is 70 px square, the title is 24 px, and the subtitle is 13 px. Six 42 px input fields keep their existing order: invitation, last name, first name, phone, password, and password confirmation. Compact vertical gaps keep the button visible at the bottom on ordinary phone screens.

## Behaviour

The route no longer uses a scroll view. Validation, safe error messages, the invitation verification, OTP request and navigation to `verify-phone` are unchanged. A keyboard can temporarily cover the lower screen area on unusually short devices; this trade-off is accepted to keep the initial page fixed and fully composed.

## Assets and verification

`fond_effetvague.png` is copied to `apps/mobile/assets`; the separate wave files are no longer referenced by the route. Route tests assert the unified asset, absence of `ScrollView`, compact input height and the unchanged OTP navigation contract.
