import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isStrongPassword } from "../_shared/password.ts";
import { verifyRegistrationToken } from "../_shared/registration-token.ts";

const phonePattern = /^\+2250[157]\d{8}$/;
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
  let firstName: unknown, lastName: unknown, phone: unknown, password: unknown, otpToken: unknown;
  try { ({ firstName, lastName, phone, password, otpToken } = await request.json()); } catch { return response({ error: "Invalid request" }, 400); }
  if (typeof phone !== "string" || !phonePattern.test(phone) || typeof otpToken !== "string") return response({ error: "Unauthorized" }, 401);
  if (typeof firstName !== "string" || !firstName.trim() || typeof lastName !== "string" || !lastName.trim() || !isStrongPassword(password)) return response({ error: "Invalid request" }, 400);
  const secret = Deno.env.get("REGISTRATION_TOKEN_SECRET")?.trim();
  if (!secret) return response({ error: "Service unavailable" }, 503);
  const token = await verifyRegistrationToken(otpToken, secret);
  if (!token || token.purpose !== "otp" || token.phone !== phone) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: organizationId, error: inviteError } = await database.rpc("consume_registration_invitation", { invitation_id: token.invitationId });
  if (inviteError || !organizationId) return response({ error: "Invalid or expired invitation" }, 400);
  const { data: created, error: authError } = await database.auth.admin.createUser({ phone, password, phone_confirm: true });
  if (authError || !created.user) { await database.rpc("release_registration_invitation", { invitation_id: token.invitationId }); return response({ error: "Unable to create request" }, 503); }
  const rollback = async () => { await database.from("membership_requests").delete().eq("user_id", created.user!.id); await database.from("users").delete().eq("id", created.user!.id); await database.auth.admin.deleteUser(created.user!.id); await database.rpc("release_registration_invitation", { invitation_id: token.invitationId }); };
  const { error: userError } = await database.from("users").insert({ id: created.user.id, organization_id: organizationId, role: "member", is_active: false });
  if (userError) { await rollback(); return response({ error: "Unable to create request" }, 503); }
  const { error: requestError } = await database.from("membership_requests").insert({ organization_id: organizationId, user_id: created.user.id, first_name: firstName.trim(), last_name: lastName.trim(), phone, phone_verified_at: new Date().toISOString() });
  if (requestError) { await rollback(); return response({ error: "Unable to create request" }, 503); }
  return response({ requestCreated: true }, 201);
});
