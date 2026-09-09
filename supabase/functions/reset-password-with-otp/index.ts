import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashOtp, hashToDatabase } from "../_shared/otp.ts";
import { isStrongPassword } from "../_shared/password.ts";

const phonePattern = /^\+2250[157]\d{8}$/;
const codePattern = /^\d{6}$/;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { headers, status });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const otpHashSecret = Deno.env.get("OTP_HASH_SECRET")?.trim();
  if (!otpHashSecret) return response({ error: "Service unavailable" }, 503);
  let phone: unknown, code: unknown, password: unknown;
  try { ({ phone, code, password } = await request.json()); } catch { return response({ error: "Invalid request" }, 400); }
  if (typeof phone !== "string" || typeof code !== "string" || !phonePattern.test(phone) || !codePattern.test(code) || !isStrongPassword(password)) return response({ error: "Invalid request" }, 400);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: membership } = await database.from("membership_requests").select("user_id,status,users!inner(is_active)").eq("phone", phone).maybeSingle();
  const account = Array.isArray(membership?.users) ? membership.users[0] : membership?.users;
  if (membership?.status !== "approved" || !account?.is_active) return response({ error: "Invalid or expired code" }, 400);
  const { data: verified } = await database.rpc("verify_and_consume_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hashToDatabase(await hashOtp(code, otpHashSecret)) });
  if (verified !== true) return response({ error: "Invalid or expired code" }, 400);
  const { error } = await database.auth.admin.updateUserById(membership.user_id, { password });
  if (error) return response({ error: "Service unavailable" }, 503);
  await database.auth.admin.signOut(membership.user_id, "global");
  return response({ reset: true });
});
