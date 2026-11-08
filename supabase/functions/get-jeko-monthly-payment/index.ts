import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply({ error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ error: "Service unavailable" }, 503);
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Unauthorized" }, 401);
    const input = await request.json();
    if (!input || Object.keys(input).join(",") !== "monthlyDueId" || typeof input.monthlyDueId !== "string" || !uuid.test(input.monthlyDueId)) return reply({ error: "Invalid request" }, 400);
    const { data: admin, error: adminError } = await db.from("users").select("organization_id, organizations!inner(is_active)").eq("id", auth.user.id).eq("role", "admin").eq("is_active", true).eq("organizations.is_active", true).maybeSingle();
    if (adminError || !admin?.organization_id) return reply({ error: "Unauthorized" }, 403);
    const { data, error } = await db.from("jeko_payment_intents").select("status,checkout_url,amount_xof,reference").eq("organization_id", admin.organization_id).eq("monthly_due_id", input.monthlyDueId).in("status", ["creating", "pending", "needs_review"]).maybeSingle();
    if (error) throw error;
    return reply({ status: data?.status ?? null, redirectUrl: data?.status === "pending" ? data.checkout_url : null, amount: data?.amount_xof ?? null, reference: data?.reference ?? null });
  } catch { return reply({ error: "Service unavailable" }, 503); }
}
if (import.meta.main) Deno.serve(handler);
