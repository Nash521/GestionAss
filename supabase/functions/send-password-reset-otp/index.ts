import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOtp, hashToDatabase } from "../_shared/otp.ts";
import { createSmsProvider } from "../_shared/sms.ts";

const phonePattern = /^\+2250[157]\d{8}$/;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { headers, status });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  let phone: unknown; try { ({ phone } = await request.json()); } catch { return response({ sent: true }); }
  if (typeof phone !== "string" || !phonePattern.test(phone)) return response({ sent: true });
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ sent: true });
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: membership } = await database.from("membership_requests").select("status,user_id,users!inner(is_active)").eq("phone", phone).maybeSingle();
  const account = Array.isArray(membership?.users) ? membership.users[0] : membership?.users;
  if (membership?.status === "approved" && account?.is_active) {
    const otp = await createOtp();
    const { data: reserved } = await database.rpc("issue_registration_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hashToDatabase(otp.codeHash) });
    if (reserved === true) await createSmsProvider().send({ to: phone, body: `Votre code de réinitialisation GestionAss est : ${otp.code}` }).catch(() => undefined);
  }
  return response({ sent: true });
});
