import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const phonePattern = /^\+2250[157][0-9]{8}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type CreateMemberRequest = { firstName: string; lastName: string; phone: string; password: string; passwordConfirmation: string; role: "member" | "admin" };

const parseRequest = (body: unknown): CreateMemberRequest | null => {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  if (typeof data.firstName !== "string" || typeof data.lastName !== "string" || typeof data.phone !== "string" || typeof data.password !== "string" || typeof data.passwordConfirmation !== "string" || (data.role !== "member" && data.role !== "admin")) return null;
  const firstName = data.firstName.trim(), lastName = data.lastName.trim(), phone = data.phone.trim();
  if (firstName.length < 1 || firstName.length > 100 || lastName.length < 1 || lastName.length > 100 || !phonePattern.test(phone) || data.password !== data.passwordConfirmation || !passwordPattern.test(data.password)) return null;
  return { firstName, lastName, phone, password: data.password, passwordConfirmation: data.passwordConfirmation, role: data.role };
};

const isConflict = (message: string) => /already|duplicate|unique|exists|conflict/i.test(message);
const isUnauthorized = (error: { message?: string; status?: number }) => error.status === 401 || error.status === 403 || /^unauthorized$/i.test(error.message ?? "");
const isDomainRpcError = (error: { code?: string }) => error.code === "P0001";
const logOperationalFailure = (context: string) => console.error(`create-admin-member: ${context}`);

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
    const { data: created, error: createError } = await database.auth.admin.createUser({ phone: input.phone, password: input.password, phone_confirm: true });
    if (createError) return response({ error: isConflict(createError.message) ? "Unable to create member" : "Service unavailable" }, isConflict(createError.message) ? 409 : 503);
    if (!created.user) return response({ error: "Service unavailable" }, 503);
    const compensate = async () => {
      try {
        const { error } = await database.auth.admin.deleteUser(created.user.id);
        if (!error) return true;
      } catch { /* return the same safe operational error below */ }
      logOperationalFailure("Auth compensation failed");
      return false;
    };
    let memberId: unknown, provisionError: { message?: string; code?: string } | null;
    try {
      ({ data: memberId, error: provisionError } = await database.rpc("provision_admin_member", {
        admin_id: identity.user.id, new_user_id: created.user.id, first_name: input.firstName, last_name: input.lastName,
        phone: input.phone, requested_role: input.role,
      }));
    } catch {
      await compensate();
      return response({ error: "Service unavailable" }, 503);
    }
    if (provisionError) {
      if (!await compensate()) return response({ error: "Service unavailable" }, 503);
      if (isUnauthorized(provisionError)) return response({ error: "Unauthorized" }, 401);
      return response({ error: "Unable to create member" }, isDomainRpcError(provisionError) ? 400 : 503);
    }
    return response({ memberId }, 201);
  } catch {
    logOperationalFailure("unexpected dependency failure");
    return response({ error: "Service unavailable" }, 503);
  }
});
