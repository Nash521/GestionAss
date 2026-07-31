# Biometric login design

## Goal

Let a member unlock a previously authenticated GestionAss session with device biometrics while retaining password login as the fallback.

## Enrollment

After a successful password login and membership-destination resolution, the app checks for biometric hardware and an enrolled biometric. If both exist, it asks the member whether to enable biometric login. Accepting stores the current Supabase session in `expo-secure-store` with `requireAuthentication: true`; declining does not store biometric credentials.

No password is stored locally.

## Unlock flow

At application launch, the app checks whether biometric login was enabled and offers the system biometric prompt. The login page also displays `Se connecter avec empreinte` only when the feature was enabled. A successful biometric unlock restores the saved session and resolves the member destination through `get-session-destination`.

Cancellation, failed recognition, unavailable hardware, no enrolled biometric, or invalidated secure storage leave the member on the password login screen without showing a sensitive error.

## Configuration

The mobile app adds `expo-local-authentication` and `expo-secure-store`. `app.json` configures the two Expo plugins and the French Face ID usage text required for iOS builds. Android fingerprint support is requested through the library manifest.

## Testing

Tests cover the secure-session helper contract, the enrollment call after password login, the conditional fingerprint button, and startup fallback to the login page. Mobile tests and TypeScript type checking run before completion.
