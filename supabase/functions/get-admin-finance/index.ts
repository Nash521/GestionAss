import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
type DatabaseError = { status?: number; message?: string };
type Database = { auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: DatabaseError | null }> }; rpc: (name: string, args: Record<string, string | number>) => Promise<{ data: unknown; error: DatabaseError | null }> };
type DatabaseFactory = () => Database;
type Input = { tab: "monthly" | "exceptional" | "disbursements"; offset: number; limit: number };

const parseInput = (body: unknown): Input | null => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length !== 3 || !["monthly", "exceptional", "disbursements"].includes(value.tab as string) || !Number.isInteger(value.offset) || (value.offset as number) < 0 || !Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 50) return null;
  return value as Input;
};
const unauthorized = (error: DatabaseError) => error.status === 401 || error.status === 403 || /^unauthorized$/i.test(error.message ?? "");
const databaseFor = (factory?: DatabaseFactory): Database | null => {
  if (factory) return factory();
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as Database : null;
};

export const createHandler = (databaseFactory?: DatabaseFactory) => async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return response({ error: "Unauthorized" }, 401);
  let body: unknown; try { body = await request.json(); } catch { return response({ error: "Invalid request" }, 400); }
  const input = parseInput(body); if (!input) return response({ error: "Invalid request" }, 400);
  try {
    const database = databaseFor(databaseFactory); if (!database) return response({ error: "Service unavailable" }, 503);
    const { data: identity, error: identityError } = await database.auth.getUser(bearer);
    if (identityError) return response({ error: unauthorized(identityError) ? "Unauthorized" : "Service unavailable" }, unauthorized(identityError) ? 401 : 503);
    if (!identity.user) return response({ error: "Unauthorized" }, 401);
    const { data, error } = await database.rpc("get_admin_finance", { admin_id: identity.user.id, tab_value: input.tab, offset_value: input.offset, limit_value: input.limit });
    if (error) return response({ error: unauthorized(error) ? "Unauthorized" : "Service unavailable" }, unauthorized(error) ? 401 : 503);
    return response(data as Record<string, unknown>);
  } catch { return response({ error: "Service unavailable" }, 503); }
};
if (import.meta.main) Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
