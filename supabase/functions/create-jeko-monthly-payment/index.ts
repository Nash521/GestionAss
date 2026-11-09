import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJekoSecret } from "../_shared/jeko-credentials.ts";
import { createJekoPayment } from "../_shared/jeko-client.ts";
import type { JekoPaymentMethod } from "../_shared/jeko.ts";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-supabase-api-version" };
const reply = (value: Record<string, unknown>, status = 200) => new Response(JSON.stringify(value), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply({ error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), master = Deno.env.get("JEKO_CREDENTIALS_ENCRYPTION_KEY"), successUrl = Deno.env.get("JEKO_SUCCESS_URL"), errorUrl = Deno.env.get("JEKO_ERROR_URL");
    if (!url || !service || !master || !successUrl || !errorUrl) return reply({ error: "Service unavailable" }, 503);
    const db = createClient(url, service, { auth: { persistSession: false } });
    const { data: identity, error: authError } = await db.auth.getUser(token);
    if (authError || !identity.user) return reply({ error: "Unauthorized" }, 401);
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "amount,method,monthlyDueId,memberId".split(",").sort().join(",") || typeof input.memberId !== "string" || !uuid.test(input.memberId) || typeof input.monthlyDueId !== "string" || !uuid.test(input.monthlyDueId) || !Number.isSafeInteger(input.amount) || input.amount < 1 || input.amount > 9999999999 || !["wave", "orange", "mtn", "moov", "djamo", "jeko"].includes(input.method)) return reply({ error: "Invalid request" }, 400);
    const reference = `ga_${crypto.randomUUID()}`;
    const { data: intentId, error: reserveError } = await db.rpc("reserve_jeko_monthly_payment", { admin_id: identity.user.id, target_member_id: input.memberId, target_due_id: input.monthlyDueId, payment_amount: input.amount, payment_reference: reference });
    if (reserveError || !intentId) return reply({ error: "Impossible de créer la demande. Vérifiez la mensualité, la configuration ou une demande déjà en cours." }, 409);
    try {
      const { data: intent, error: intentError } = await db.from("jeko_payment_intents").select("organization_id, store_id").eq("id", intentId).single();
      if (intentError || !intent) throw new Error("Missing intent");
      const { data: config, error: configError } = await db.from("jeko_configurations").select("api_key_id, encrypted_api_key, store_id").eq("organization_id", intent.organization_id).single();
      if (configError || !config || config.store_id !== intent.store_id) throw new Error("Invalid configuration");
      const apiKey = await decryptJekoSecret(config.encrypted_api_key, master, intent.organization_id);
      const result = await createJekoPayment({ credentials: { apiKey, apiKeyId: config.api_key_id, storeId: config.store_id }, amountXof: input.amount, reference, method: input.method as JekoPaymentMethod, successUrl, errorUrl });
      const { error: saveError } = await db.from("jeko_payment_intents").update({ provider_request_id: result.id, checkout_url: result.redirectUrl, status: "pending", updated_at: new Date().toISOString() }).eq("id", intentId).eq("status", "creating");
      if (saveError) throw saveError;
      return reply({ redirectUrl: result.redirectUrl, status: "pending" });
    } catch {
      // The provider might have created a request even if the response was lost.
      // Never repeat with a fresh reference until the intent is reconciled.
      await db.from("jeko_payment_intents").update({ status: "needs_review", updated_at: new Date().toISOString() }).eq("id", intentId).eq("status", "creating");
      return reply({ error: "La demande n’a pas pu être confirmée. Une vérification est nécessaire avant de réessayer." }, 503);
    }
  } catch { return reply({ error: "Service unavailable" }, 503); }
}
if (import.meta.main) Deno.serve(handler);
