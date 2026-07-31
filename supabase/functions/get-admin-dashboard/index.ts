import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization) return response({ error: "Unauthorized" }, 401);
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await database.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
  const { data: account } = await database.from("users").select("organization_id,role,is_active").eq("id", identity.user.id).maybeSingle();
  if (!account?.is_active || account.role !== "admin") return response({ error: "Unauthorized" }, 401);
  const [{ data: organization }, { count: totalMembers }, { data: fees }] = await Promise.all([
    database.from("organizations").select("name").eq("id", account.organization_id).maybeSingle(),
    database.from("members").select("id", { count: "exact", head: true }).eq("organization_id", account.organization_id),
    database.from("membership_fees").select("amount_due,amount_paid,remaining_amount,status,members!inner(organization_id)").eq("members.organization_id", account.organization_id),
  ]);
  const rows = fees ?? [];
  const sum = (key: "amount_due" | "amount_paid" | "remaining_amount") => rows.reduce((total, fee) => total + Number(fee[key] ?? 0), 0);
  return response({ organizationName: organization?.name ?? "Association", totalMembers: totalMembers ?? 0, membersPaid: rows.filter((fee) => fee.status === "paid").length, membersLate: rows.filter((fee) => fee.status === "unpaid" || fee.status === "partial").length, totalDue: sum("amount_due"), totalCollected: sum("amount_paid"), totalOutstanding: sum("remaining_amount") });
});
