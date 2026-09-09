import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DetailRequest = { memberId: string };
type DatabaseError = { status?: number; message?: string };
type Database = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: DatabaseError | null }> };
  rpc: (name: string, args: Record<string, string>) => Promise<{ data: unknown; error: DatabaseError | null }>;
};
type DatabaseFactory = () => Database;

const parseRequest = (body: unknown): DetailRequest | null => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || typeof data.memberId !== "string" || !uuidPattern.test(data.memberId)) return null;
  return { memberId: data.memberId };
};
const isUnauthorized = (error: DatabaseError) => error.status === 401 || error.status === 403 || /^unauthorized$/i.test(error.message ?? "");
const logOperationalFailure = (context: string) => console.error(`get-admin-member-detail: ${context}`);

export const createHandler = (databaseFactory?: DatabaseFactory) => async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return response({ error: "Unauthorized" }, 401);

  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: "Invalid request" }, 400); }
  const input = parseRequest(body);
  if (!input) return response({ error: "Invalid request" }, 400);

  try {
    let database: Database;
    if (databaseFactory) {
      database = databaseFactory();
    } else {
      const url = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
      database = createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as Database;
    }
    const { data: identity, error: identityError } = await database.auth.getUser(bearer);
    if (identityError) return response({ error: isUnauthorized(identityError) ? "Unauthorized" : "Service unavailable" }, isUnauthorized(identityError) ? 401 : 503);
    if (!identity.user) return response({ error: "Unauthorized" }, 401);
    const { data, error } = await database.rpc("get_admin_member_detail", { admin_id: identity.user.id, target_member_id: input.memberId });
    if (error?.message === "Member not found") return response({ error: "Membre introuvable." }, 404);
    if (error) return response({ error: isUnauthorized(error) ? "Unauthorized" : "Service unavailable" }, isUnauthorized(error) ? 401 : 503);
    return response(data as Record<string, unknown>);
  } catch {
    logOperationalFailure("unexpected dependency failure");
    return response({ error: "Service unavailable" }, 503);
  }
};

if (import.meta.main) Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
