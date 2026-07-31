import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization) return response({ error: "Unauthorized" }, 401);
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);

  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await database.auth.getUser(token);
  if (userError || !userData.user) return response({ error: "Unauthorized" }, 401);

  const { data: account } = await database.from("users").select("is_active").eq("id", userData.user.id).maybeSingle();
  if (account?.is_active) return response({ destination: "active" });

  const { data: membershipRequest } = await database.from("membership_requests").select("status").eq("user_id", userData.user.id).maybeSingle();
  if (membershipRequest?.status === "pending") return response({ destination: "pending" });

  return response({ destination: "unavailable" });
});
