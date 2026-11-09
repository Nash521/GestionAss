import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptJekoSecret } from "../_shared/jeko-credentials.ts";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-supabase-api-version" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply({ error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), master = Deno.env.get("JEKO_CREDENTIALS_ENCRYPTION_KEY");
    if (!url || !service || !master) return reply({ error: "Service unavailable" }, 503);
    const db = createClient(url, service, { auth: { persistSession: false } });
    const { data: identity, error: authError } = await db.auth.getUser(token);
    if (authError || !identity.user) return reply({ error: "Unauthorized" }, 401);
    const { data: admin, error: adminError } = await db.from("users").select("organization_id, organizations!inner(is_active)").eq("id", identity.user.id).eq("role", "admin").eq("is_active", true).eq("organizations.is_active", true).maybeSingle();
    if (adminError || !admin?.organization_id) return reply({ error: "Unauthorized" }, 403);
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ error: "Invalid request" }, 400);
    if (input.action === "status" && Object.keys(input).length === 1) {
      const { data, error } = await db.from("jeko_configurations").select("api_key_id, store_id, updated_at").eq("organization_id", admin.organization_id).maybeSingle();
      if (error) throw error;
      return reply({ configured: !!data, apiKeyId: data?.api_key_id ?? null, storeId: data?.store_id ?? null, updatedAt: data?.updated_at ?? null });
    }
    if (input.action !== "save" || Object.keys(input).sort().join(",") !== "action,apiKey,apiKeyId,storeId,webhookSecret" || typeof input.apiKey !== "string" || input.apiKey.trim().length < 1 || input.apiKey.length > 1024 || typeof input.apiKeyId !== "string" || !input.apiKeyId.trim() || input.apiKeyId.length > 256 || typeof input.storeId !== "string" || !uuid.test(input.storeId) || typeof input.webhookSecret !== "string" || !input.webhookSecret.trim() || input.webhookSecret.length > 1024) return reply({ error: "Invalid request" }, 400);
    const encrypted = await encryptJekoSecret(input.apiKey.trim(), master, admin.organization_id);
    const encryptedWebhook = await encryptJekoSecret(input.webhookSecret.trim(), master, admin.organization_id);
    const { error } = await db.from("jeko_configurations").upsert({ encrypted_webhook_secret: encryptedWebhook, organization_id: admin.organization_id, api_key_id: input.apiKeyId.trim(), store_id: input.storeId, encrypted_api_key: encrypted, updated_at: new Date().toISOString(), updated_by: identity.user.id });
    if (error) throw error;
    return reply({ configured: true, apiKeyId: input.apiKeyId.trim(), storeId: input.storeId });
  } catch { return reply({ error: "Service unavailable" }, 503); }
}
if (import.meta.main) Deno.serve(handler);
