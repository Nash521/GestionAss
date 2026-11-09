import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashToDatabase, sha256 } from "../_shared/otp.ts";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-supabase-api-version" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return response({ error: "Service unavailable" }, 503);
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: identity, error: identityError } = await db.auth.getUser(token);
    if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
    const { data: admin, error: adminError } = await db.from("users").select("organization_id, organizations!inner(is_active)").eq("id", identity.user.id).eq("role", "admin").eq("is_active", true).eq("organizations.is_active", true).maybeSingle();
    if (adminError) return response({ error: "Service unavailable" }, 503);
    if (!admin) return response({ error: "Unauthorized" }, 403);
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const code = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await db.from("organization_invitations").insert({ organization_id: admin.organization_id, code_hash: hashToDatabase(await sha256(code)), expires_at: expiresAt });
    if (error) return response({ error: "Service unavailable" }, 503);
    return response({ code, expiresAt }, 201);
  } catch {
    return response({ error: "Service unavailable" }, 503);
  }
});
