import { createClient, type Session } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function invokeRegistrationFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().functions.invoke<T>(name, { body });
  if (error || !data) throw error ?? new Error("Réponse Supabase manquante.");
  return data;
}

export type SessionDestination = "pending" | "active" | "unavailable";

export async function signInWithPhone(phone: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ phone, password });
  if (error || !data.session) throw error ?? new Error("Session Supabase manquante.");
  return data.session as Session;
}

export async function getSessionDestination() {
  return invokeRegistrationFunction<{ destination: SessionDestination }>("get-session-destination", {});
}
