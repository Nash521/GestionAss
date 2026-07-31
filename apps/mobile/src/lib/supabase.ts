import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function invokeRegistrationFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke<T>(name, { body });
  if (error || !data) throw error ?? new Error("Réponse Supabase manquante.");
  return data;
}

export type SessionDestination = "pending" | "active" | "unavailable";

export async function signInWithPhone(phone: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ phone, password });
  if (error) throw error;
}

export async function getSessionDestination() {
  return invokeRegistrationFunction<{ destination: SessionDestination }>("get-session-destination", {});
}
