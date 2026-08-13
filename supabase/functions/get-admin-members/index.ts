import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

type ListRequest = { query: string; paymentStatus: "all" | "paid" | "unpaid" | "partial"; role: "all" | "member" | "admin"; offset: number; limit: number };
type RpcRow = { member_id: string | null; first_name: string | null; last_name: string | null; phone: string | null; role: "member" | "admin" | null; fee_status: "paid" | "unpaid" | "partial" | null; remaining_amount: number | string | null; total_members: number | string | null; members_paid: number | string | null; members_late: number | string | null };

const parseRequest = (body: unknown): ListRequest | null => {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const query = data.query ?? "", paymentStatus = data.paymentStatus ?? "all", role = data.role ?? "all", offset = data.offset ?? 0, limit = data.limit ?? 50;
  if (typeof query !== "string" || (paymentStatus !== "all" && paymentStatus !== "paid" && paymentStatus !== "unpaid" && paymentStatus !== "partial") || (role !== "all" && role !== "member" && role !== "admin") || typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) return null;
  return { query, paymentStatus, role, offset, limit };
};

const count = (value: number | string | null | undefined) => Number(value ?? 0);
const isUnauthorized = (error: { status?: number }) => error.status === 401 || error.status === 403;
const logOperationalFailure = (context: string) => console.error(`get-admin-members: ${context}`);

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  if (!authorization) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return response({ error: "Invalid request" }, 400); }
    const input = parseRequest(body);
    if (!input) return response({ error: "Invalid request" }, 400);
    const database = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: identity, error: identityError } = await database.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (identityError) return response({ error: isUnauthorized(identityError) ? "Unauthorized" : "Service unavailable" }, isUnauthorized(identityError) ? 401 : 503);
    if (!identity.user) return response({ error: "Unauthorized" }, 401);
    const { data, error } = await database.rpc("list_admin_members", {
      admin_id: identity.user.id, query: input.query, payment_status: input.paymentStatus, role_filter: input.role,
      offset_value: input.offset, limit_value: input.limit,
    });
    if (error) return response({ error: "Service unavailable" }, 503);
    const rows = (data ?? []) as RpcRow[];
    const metadata = rows[0];
    return response({
      totalMembers: count(metadata?.total_members), membersLate: count(metadata?.members_late), membersPaid: count(metadata?.members_paid),
      members: rows.filter((row) => row.member_id !== null).map((row) => ({
        id: row.member_id!, firstName: row.first_name, lastName: row.last_name, phone: row.phone,
        role: row.role, paymentStatus: row.fee_status, amountRemaining: row.remaining_amount === null ? null : Number(row.remaining_amount),
      })),
    });
  } catch {
    logOperationalFailure("unexpected dependency failure");
    return response({ error: "Service unavailable" }, 503);
  }
});
