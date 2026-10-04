import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPaymentCredential, paymentProviders, type PaymentProvider } from "../_shared/payment-credentials.ts";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

export const createHandler = (factory?: () => ReturnType<typeof createClient>) => async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response({ error: "Unauthorized" }, 401);
  let input: { action?: string; provider?: string; apiKey?: string };
  try { input = await request.json(); } catch { return response({ error: "Invalid request" }, 400); }
  if (!input || !["status", "save", "remove"].includes(input.action ?? "")) return response({ error: "Invalid request" }, 400);
  if (input.action !== "status" && !paymentProviders.includes(input.provider as PaymentProvider)) return response({ error: "Invalid provider" }, 400);
  if (input.action === "save" && (typeof input.apiKey !== "string" || !input.apiKey.trim() || input.apiKey.length > 4096)) return response({ error: "Invalid API key" }, 400);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if ((!url || !serviceKey) && !factory) return response({ error: "Service unavailable" }, 503);
  try {
    const database = factory ? factory() : createClient(url!, serviceKey!, { auth: { persistSession: false } });
    const { data: identity, error: identityError } = await database.auth.getUser(token);
    if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
    const { data: admin, error: adminError } = await database.from("users").select("organization_id,role,is_active").eq("id", identity.user.id).single();
    if (adminError || !admin || admin.role !== "admin" || !admin.is_active) return response({ error: "Unauthorized" }, 403);
    if (input.action === "status") {
      const { data, error } = await database.from("payment_provider_credentials").select("provider,updated_at").eq("organization_id", admin.organization_id);
      if (error) return response({ error: "Service unavailable" }, 503);
      return response({ providers: paymentProviders.map((provider) => ({ provider, configured: !!data?.some((item) => item.provider === provider), updatedAt: data?.find((item) => item.provider === provider)?.updated_at ?? null })) });
    }
    if (input.action === "remove") {
      const { error } = await database.from("payment_provider_credentials").delete().eq("organization_id", admin.organization_id).eq("provider", input.provider);
      return error ? response({ error: "Service unavailable" }, 503) : response({ configured: false });
    }
    const provider = input.provider as PaymentProvider;
    const ciphertext = await encryptPaymentCredential(input.apiKey!.trim(), admin.organization_id, provider);
    const { error } = await database.from("payment_provider_credentials").upsert({ organization_id: admin.organization_id, provider, encrypted_credentials: ciphertext, updated_at: new Date().toISOString(), updated_by: identity.user.id }, { onConflict: "organization_id,provider" });
    return error ? response({ error: "Service unavailable" }, 503) : response({ configured: true });
  } catch { return response({ error: "Service unavailable" }, 503); }
};

if (import.meta.main) Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
