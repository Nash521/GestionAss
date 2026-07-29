import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashFromDatabase, isExpired, OTP_ATTEMPT_LIMIT, safeVerifyOtp } from "../_shared/otp.ts";

const PURPOSE = "registration";
const PHONE_PATTERN = /^\+2250[157]\d{8}$/;
const CODE_PATTERN = /^\d{6}$/;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const invalidOtp = () => new Response(JSON.stringify({ error: "Invalid or expired code" }), { status: 400, headers });

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  let phone: unknown;
  let code: unknown;
  try {
    ({ phone, code } = await request.json());
  } catch {
    return invalidOtp();
  }
  if (typeof phone !== "string" || typeof code !== "string" || !PHONE_PATTERN.test(phone) || !CODE_PATTERN.test(code)) return invalidOtp();

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: otp, error: lookupError } = await database
    .from("auth_otps")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("phone", phone)
    .eq("purpose", PURPOSE)
    .maybeSingle();
  if (lookupError) return response({ error: "Service unavailable" }, 503);
  if (!otp || otp.consumed_at || otp.attempts >= OTP_ATTEMPT_LIMIT || isExpired(otp.expires_at)) return invalidOtp();

  let valid = false;
  try {
    valid = await safeVerifyOtp(code, hashFromDatabase(otp.code_hash));
  } catch {
    return invalidOtp();
  }
  if (!valid) {
    const { error } = await database.from("auth_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    if (error) return response({ error: "Service unavailable" }, 503);
    return invalidOtp();
  }

  const { data: consumed, error: consumeError } = await database
    .from("auth_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumeError) return response({ error: "Service unavailable" }, 503);
  if (!consumed) return invalidOtp();
  return response({ verified: true });
});
