import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

const SESSION_KEY = "gestionass.biometric.session";
const ENABLED_KEY = "gestionass.biometric.enabled";
type StoredSession = { accessToken: string; refreshToken: string };

export async function canEnableBiometricLogin() {
  return (await SecureStore.canUseBiometricAuthentication()) &&
    (await LocalAuthentication.hasHardwareAsync()) &&
    (await LocalAuthentication.isEnrolledAsync());
}

export async function isBiometricLoginEnabled() {
  return (await SecureStore.getItemAsync(ENABLED_KEY)) === "true" &&
    await canEnableBiometricLogin();
}

export async function enableBiometricLogin(session: Session) {
  if (!await canEnableBiometricLogin()) {
    throw new Error("Authentification biométrique indisponible.");
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ accessToken: session.access_token, refreshToken: session.refresh_token }), {
    requireAuthentication: true,
    authenticationPrompt: "Confirmez votre identité pour protéger votre session GestionAss.",
  });
  await SecureStore.setItemAsync(ENABLED_KEY, "true");
}

export async function unlockWithBiometrics() {
  try {
    const serialized = await SecureStore.getItemAsync(SESSION_KEY, {
      requireAuthentication: true,
      authenticationPrompt: "Confirmez votre identité pour vous connecter à GestionAss.",
    });
    if (!serialized) return false;
    const { accessToken, refreshToken } = JSON.parse(serialized) as StoredSession;
    const { error } = await getSupabaseClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return !error;
  } catch { return false; }
}

export async function clearBiometricLogin() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(ENABLED_KEY);
}
