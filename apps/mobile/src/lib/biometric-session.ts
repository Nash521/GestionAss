import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

const SESSION_KEY = "gestionass.biometric.session";
const ENABLED_KEY = "gestionass.biometric.enabled";
type StoredSession = { accessToken: string; refreshToken: string };

export async function canEnableBiometricLogin() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function isBiometricLoginEnabled() {
  return (await SecureStore.getItemAsync(ENABLED_KEY)) === "true";
}

export async function enableBiometricLogin(session: Session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ accessToken: session.access_token, refreshToken: session.refresh_token }), { requireAuthentication: true });
  await SecureStore.setItemAsync(ENABLED_KEY, "true");
}

export async function unlockWithBiometrics() {
  try {
    const serialized = await SecureStore.getItemAsync(SESSION_KEY, { requireAuthentication: true });
    if (!serialized) return false;
    const { accessToken, refreshToken } = JSON.parse(serialized) as StoredSession;
    const { error } = await getSupabaseClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return !error;
  } catch { return false; }
}
