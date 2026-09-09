# Mobile sign-up icon and password-feedback design

## Purpose

Polish the compact sign-up screen with familiar field icons, live password criteria and a temporary route back to the GestionAss home screen.

## Layout

The logo increases to 86×86 px. Each field card shows a Feather icon: ticket for invitation, user for first and last names, phone for phone, and lock for password fields. Password fields include an eye icon at the right that toggles visibility. The screen remains fixed and non-scrollable.

## Password feedback

Below password confirmation, four compact indicators display in two columns: at least eight characters, one uppercase letter, one digit and one special character. An indicator uses the green check icon when its requirement matches the current password; otherwise it stays muted. Submission retains the existing minimum-length and confirmation checks.

## Navigation

Below the primary button, show “Vous avez déjà un compte ? Se connecter”. The link goes to `/login` until a dedicated login route exists.

## Verification

Tests assert Feather imports, password visibility state, the four criteria and the temporary `/login` navigation. TypeScript and the Android bundle must pass.
