import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOtp, hashToDatabase } from "../_shared/otp.ts";
import { createSmsProvider } from "../_shared/sms.ts";

const phonePattern = /^\+2250[157]\d{8}$/;
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { headers, status });

type ResetOtpRuntime = {
  isEligibleAccount: (phone: string) => Promise<boolean>;
  reserveOtp: (phone: string, codeHash: string) => Promise<boolean>;
  releaseOtp: (phone: string, codeHash: string) => Promise<boolean>;
  sendSms: (phone: string, code: string) => Promise<void>;
};

type RuntimeFactory = () => ResetOtpRuntime | null;

const runtimeFromEnvironment: RuntimeFactory = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  return {
    isEligibleAccount: async (phone) => {
      const { data: membership, error } = await database
        .from("membership_requests")
        .select("status,user_id,users!inner(is_active)")
        .eq("phone", phone)
        .maybeSingle();
      if (error) throw error;
      const account = Array.isArray(membership?.users) ? membership.users[0] : membership?.users;
      return membership?.status === "approved" && account?.is_active === true;
    },
    reserveOtp: async (phone, codeHash) => {
      const { data, error } = await database.rpc("issue_registration_otp", {
        p_phone: phone,
        p_purpose: "password_reset",
        p_code_hash: codeHash,
      });
      if (error) throw error;
      return data === true;
    },
    releaseOtp: async (phone, codeHash) => {
      const { data, error } = await database.rpc("release_registration_otp", {
        p_phone: phone,
        p_purpose: "password_reset",
        p_code_hash: codeHash,
      });
      if (error) throw error;
      return data === true;
    },
    sendSms: async (phone, code) => {
      await createSmsProvider().send({
        to: phone,
        body: `Votre code de réinitialisation GestionAss est : ${code}`,
      });
    },
  };
};

export const createHandler = (runtimeFactory: RuntimeFactory = runtimeFromEnvironment) => async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const otpHashSecret = Deno.env.get("OTP_HASH_SECRET")?.trim();
  if (!otpHashSecret) return response({ error: "Service unavailable" }, 503);

  let phone: unknown;
  try {
    ({ phone } = await request.json());
  } catch {
    return response({ sent: true });
  }
  if (typeof phone !== "string" || !phonePattern.test(phone)) return response({ sent: true });

  const runtime = runtimeFactory();
  if (!runtime) return response({ sent: true });

  let eligible = false;
  try {
    eligible = await runtime.isEligibleAccount(phone);
  } catch {
    console.error("Password reset eligibility lookup failed");
    return response({ sent: true });
  }
  if (!eligible) return response({ sent: true });

  const otp = await createOtp(otpHashSecret);
  const codeHash = hashToDatabase(otp.codeHash);

  let reserved = false;
  try {
    reserved = await runtime.reserveOtp(phone, codeHash);
  } catch {
    console.error("Password reset OTP reservation failed");
    return response({ sent: true });
  }
  if (!reserved) return response({ sent: true });

  try {
    await runtime.sendSms(phone, otp.code);
  } catch {
    try {
      const released = await runtime.releaseOtp(phone, codeHash);
      if (!released) console.error("Password reset OTP release returned false");
    } catch {
      console.error("Password reset OTP release failed");
    }
    console.error("Password reset SMS delivery failed");
  }

  return response({ sent: true });
};

if (import.meta.main) {
  Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
}
