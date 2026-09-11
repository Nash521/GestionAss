import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const phonePattern = /^\+2250[157]\d{8}$/;
const actions = new Set(["update", "suspend", "reactivate", "archive"]);

export const createHandler = (databaseFactory = (url: string, key: string) => createClient(url, key, { auth: { persistSession: false } })) => async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization"); if (!authorization) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  try {
    const body = await request.json(); const memberId = typeof body?.memberId === "string" ? body.memberId : ""; const action = typeof body?.action === "string" ? body.action : "";
    if (!memberId || !actions.has(action) || (action === "update" && (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.phone !== "string" || !phonePattern.test(body.phone)))) return response({ error: "Invalid request" }, 400);
    const database = databaseFactory(url, serviceKey); const { data: identity, error: identityError } = await database.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
    const { data, error } = await database.rpc("manage_admin_member", { admin_id: identity.user.id, target_member_id: memberId, action, first_name_value: action === "update" ? body.firstName : null, last_name_value: action === "update" ? body.lastName : null, phone_value: action === "update" ? body.phone : null });
    if (error) { const message = error.message ?? ""; if (/not found/i.test(message)) return response({ error: "Membre introuvable" }, 404); if (/phone already|unique/i.test(message)) return response({ error: "Numéro déjà utilisé" }, 409); if (/last active/i.test(message)) return response({ error: "Le dernier administrateur actif ne peut pas être désactivé." }, 409); if (/unauthorized/i.test(message)) return response({ error: "Unauthorized" }, 401); if (/invalid/i.test(message)) return response({ error: "Action non valide" }, 400); return response({ error: "Service unavailable" }, 503); }
    return response({ status: data }, 200);
  } catch { return response({ error: "Invalid request" }, 400); }
};

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
