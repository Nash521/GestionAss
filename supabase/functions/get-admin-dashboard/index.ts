import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  try {
    const database = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: identity, error: identityError } = await database.auth.getUser(token);
    if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
    const { data, error } = await database.rpc("get_admin_dashboard_summary", { admin_id: identity.user.id });
    if (error) return response({ error: error.message === "Unauthorized" ? "Unauthorized" : "Service unavailable" }, error.message === "Unauthorized" ? 401 : 503);
    return response(data as Record<string, unknown>);
  } catch {
    return response({ error: "Service unavailable" }, 503);
  }
});
