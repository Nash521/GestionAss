import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOtp, hashToDatabase, isResendAllowed, OTP_EXPIRY_MS } from "../_shared/otp.ts";
import { createSmsProvider } from "../_shared/sms.ts";

const PURPOSE = "registration";
const PHONE_PATTERN = /^\+2250[157]\d{8}$/;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  let phone: unknown;
  try {
    ({ phone } = await request.json());
  } catch {
    return response({ error: "Invalid request" }, 400);
  }
  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone)) return response({ error: "Invalid request" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();
  const { data: existing, error: lookupError } = await database
    .from("auth_otps")
    .select("last_sent_at")
    .eq("phone", phone)
    .eq("purpose", PURPOSE)
    .maybeSingle();
  if (lookupError) return response({ error: "Service unavailable" }, 503);
  if (existing && !isResendAllowed(existing.last_sent_at, now)) {
    return response({ error: "Please wait before requesting another code" }, 429);
  }

  const otp = await createOtp();
  try {
    await createSmsProvider().send({ to: phone, body: `Votre code de verification GestionAss est : ${otp.code}` });
  } catch (error) {
    console.error("OTP SMS delivery failed", error instanceof Error ? error.message : "unknown error");
    return response({ error: "Service unavailable" }, 503);
  }

  const { error: writeError } = await database.from("auth_otps").upsert({
    phone,
    purpose: PURPOSE,
    code_hash: hashToDatabase(otp.codeHash),
    expires_at: new Date(now.getTime() + OTP_EXPIRY_MS).toISOString(),
    attempts: 0,
    last_sent_at: now.toISOString(),
    consumed_at: null,
  }, { onConflict: "phone,purpose" });
  if (writeError) return response({ error: "Service unavailable" }, 503);
  return response({ sent: true });
});
