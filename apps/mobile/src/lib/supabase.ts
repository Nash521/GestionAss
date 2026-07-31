import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function invokeRegistrationFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke<T>(name, { body });
  if (error) throw error;
  return data;
}
