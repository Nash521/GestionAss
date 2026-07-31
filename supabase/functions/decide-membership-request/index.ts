import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { headers, status });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization) return response({ error: "Unauthorized" }, 401);
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  let requestId: unknown, decision: unknown, reason: unknown;
  try { ({ requestId, decision, reason } = await request.json()); } catch { return response({ error: "Invalid request" }, 400); }
  if (typeof requestId !== "string" || (decision !== "approved" && decision !== "rejected") || (reason !== undefined && typeof reason !== "string")) return response({ error: "Invalid request" }, 400);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await database.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (userError || !userData.user) return response({ error: "Unauthorized" }, 401);
  const { data, error } = await database.rpc("decide_membership_request", { request_id: requestId, decision, reason: decision === "rejected" ? reason ?? null : null, admin_id: userData.user.id });
  if (error) return response({ error: "Unable to decide request" }, 400);
  return response({ memberId: data });
});
