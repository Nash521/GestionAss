import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

let client: ReturnType<typeof createClient> | null = null;

export type AccountRole = "admin" | "member";

export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");
  client = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export async function invokeRegistrationFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().functions.invoke<T>(name, { body });
  if (error || !data) throw error ?? new Error("Réponse Supabase manquante.");
  return data;
}

export async function getFunctionErrorMessage(error: unknown) {
  const context = typeof error === "object" && error !== null ? (error as { context?: unknown }).context : null;
  if (!context || typeof context !== "object" || !("clone" in context)) return null;
  try {
    const response = context as { clone: () => { json: () => Promise<unknown> } };
    const body = await response.clone().json();
    return typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : null;
  } catch {
    return null;
  }
}
