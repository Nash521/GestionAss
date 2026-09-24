import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
export const createHandler = (factory = (url: string, key: string) => createClient(url, key, { auth: { persistSession: false } })) => async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization"); if (!authorization) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) return response({ error: "Service unavailable" }, 503);
  try { const body = await request.json(); if (typeof body?.memberId !== "string" || !body.memberId) return response({ error: "Invalid request" }, 400); const db = factory(url, key); const { data: identity, error: identityError } = await db.auth.getUser(authorization.replace(/^Bearer\s+/i, "")); if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401); const { data, error } = await db.rpc("get_member_open_dues", { admin_id: identity.user.id, target_member_id: body.memberId }); if (error) { if (/not found/i.test(error.message ?? "")) return response({ error: "Membre introuvable" }, 404); if (/unauthorized/i.test(error.message ?? "")) return response({ error: "Unauthorized" }, 401); return response({ error: "Service unavailable" }, 503); } return response({ dues: data ?? [] }); } catch { return response({ error: "Invalid request" }, 400); }
};
Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
