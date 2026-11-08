import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJekoSecret } from "../_shared/jeko-credentials.ts";
import { getJekoPayment } from "../_shared/jeko-client.ts";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const reply = (value: Record<string, unknown>, status = 200) => new Response(JSON.stringify(value), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply({ error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), master = Deno.env.get("JEKO_CREDENTIALS_ENCRYPTION_KEY");
    if (!url || !key || !master) return reply({ error: "Service unavailable" }, 503);
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: identity, error: authError } = await db.auth.getUser(bearer);
    if (authError || !identity.user) return reply({ error: "Unauthorized" }, 401);
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((k) => !["monthlyDueId", "providerRequestId"].includes(k)) || typeof input.monthlyDueId !== "string" || !uuid.test(input.monthlyDueId) || (input.providerRequestId !== undefined && (typeof input.providerRequestId !== "string" || !uuid.test(input.providerRequestId)))) return reply({ error: "Invalid request" }, 400);
    const { data: admin, error: adminError } = await db.from("users").select("organization_id, organizations!inner(is_active)").eq("id", identity.user.id).eq("role", "admin").eq("is_active", true).eq("organizations.is_active", true).maybeSingle();
    if (adminError || !admin?.organization_id) return reply({ error: "Unauthorized" }, 403);
    const { data: intent, error: intentError } = await db.from("jeko_payment_intents").select("id, reference, provider_request_id, provider_transaction_id, store_id, checkout_url, status").eq("organization_id", admin.organization_id).eq("monthly_due_id", input.monthlyDueId).in("status", ["creating", "pending", "needs_review"]).maybeSingle();
    if (intentError) throw intentError;
    if (!intent) return reply({ error: "Aucune demande en cours." }, 404);
    if (intent.provider_transaction_id) return reply({ status: "needs_review", reference: intent.reference });
    const requestId = intent.provider_request_id ?? input.providerRequestId;
    if (!requestId) return reply({ status: "missing_request_id", reference: intent.reference });
    if (intent.provider_request_id && input.providerRequestId && input.providerRequestId !== intent.provider_request_id) return reply({ error: "Identifiant incompatible." }, 400);
    const { data: config, error: configError } = await db.from("jeko_configurations").select("api_key_id,encrypted_api_key,store_id").eq("organization_id", admin.organization_id).single();
    if (configError || !config || config.store_id !== intent.store_id) throw new Error("Invalid configuration");
    const apiKey = await decryptJekoSecret(config.encrypted_api_key, master, admin.organization_id);
    const remote = await getJekoPayment({ credentials: { apiKey, apiKeyId: config.api_key_id, storeId: config.store_id }, requestId, reference: intent.reference });
    const next = remote.status === "error" ? "failed" : "pending";
    const { data: changed, error: updateError } = await db.from("jeko_payment_intents").update({ provider_request_id: requestId, checkout_url: intent.checkout_url ?? remote.redirectUrl, status: next, updated_at: new Date().toISOString() }).eq("id", intent.id).eq("status", intent.status).is("provider_transaction_id", null).select("status").maybeSingle();
    if (updateError) throw updateError;
    if (!changed) return reply({ status: "changed" });
    // Success remains pending until the signed Jèko webhook is processed.
    return reply({ status: remote.status === "success" ? "awaiting_confirmation" : next, reference: intent.reference });
  } catch { return reply({ error: "Impossible de vérifier la demande auprès de Jèko." }, 503); }
}
if (import.meta.main) Deno.serve(handler);
