import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOtp, hashToDatabase } from "../_shared/otp.ts";
import { verifyRegistrationToken } from "../_shared/registration-token.ts";
import { createSmsProvider } from "../_shared/sms.ts";

const PURPOSE = "registration";
const PHONE_PATTERN = /^\+2250[157]\d{8}$/;
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  let phone: unknown;
  let invitationToken: unknown;
  try {
    ({ phone, invitationToken } = await request.json());
  } catch {
    return response({ error: "Invalid request" }, 400);
  }
  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone)) return response({ error: "Invalid request" }, 400);

  const secret = Deno.env.get("REGISTRATION_TOKEN_SECRET")?.trim();
  if (!secret) return response({ error: "Service unavailable" }, 503);
  if (typeof invitationToken !== "string") return response({ error: "Unauthorized" }, 401);
  const invitation = await verifyRegistrationToken(invitationToken, secret);
  if (!invitation || invitation.purpose !== "invite" || invitation.phone !== phone) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const otp = await createOtp();
  const codeHash = hashToDatabase(otp.codeHash);
  const { data: reserved, error: reserveError } = await database.rpc(
    "issue_registration_otp",
    { p_phone: phone, p_purpose: PURPOSE, p_code_hash: codeHash },
  );
  if (reserveError) return response({ error: "Service unavailable" }, 503);
  if (reserved !== true) return response({ error: "Please wait before requesting another code" }, 429);
  try {
    await createSmsProvider().send({ to: phone, body: `Votre code de verification GestionAss est : ${otp.code}` });
  } catch (error) {
    console.error("OTP SMS delivery failed", error instanceof Error ? error.message : "unknown error");
    const { error: releaseError } = await database.rpc(
      "release_registration_otp",
      { p_phone: phone, p_purpose: PURPOSE, p_code_hash: codeHash },
    );
    if (releaseError) console.error("OTP reservation release failed", releaseError.message);
    return response({ error: "Service unavailable" }, 503);
  }

  return response({ sent: true });
});
