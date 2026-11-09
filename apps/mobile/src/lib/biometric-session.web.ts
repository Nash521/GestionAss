import type { Session } from "@supabase/supabase-js";

export async function canEnableBiometricLogin() {
  return false;
}

export async function isBiometricLoginEnabled() {
  return false;
}

export async function enableBiometricLogin(_session: Session) {
  throw new Error("Authentification biométrique indisponible.");
}

export async function unlockWithBiometrics() {
  return false;
}

export async function clearBiometricLogin() {}
