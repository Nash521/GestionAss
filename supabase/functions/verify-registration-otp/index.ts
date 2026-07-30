import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashToDatabase, sha256 } from "../_shared/otp.ts";
import {
  issueRegistrationToken,
  verifyRegistrationToken,
} from "../_shared/registration-token.ts";

const PURPOSE = "registration";
const PHONE_PATTERN = /^\+2250[157]\d{8}$/;
const CODE_PATTERN = /^\d{6}$/;
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};
const invalidOtp = () =>
  new Response(JSON.stringify({ error: "Invalid or expired code" }), {
    status: 400,
    headers,
  });

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? "8000") },
  async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers });
    if (request.method !== "POST") {
      return response({
        error: "Method not allowed",
      }, 405);
    }

    let phone: unknown;
    let code: unknown;
    let invitationToken: unknown;
    try {
      ({ phone, code, invitationToken } = await request.json());
    } catch {
      return invalidOtp();
    }
    if (
      typeof phone !== "string" || typeof code !== "string" ||
      !PHONE_PATTERN.test(phone) || !CODE_PATTERN.test(code)
    ) return invalidOtp();

    const secret = Deno.env.get("REGISTRATION_TOKEN_SECRET")?.trim();
    if (!secret) return response({ error: "Service unavailable" }, 503);
    if (typeof invitationToken !== "string") {
      return response({
        error: "Unauthorized",
      }, 401);
    }
    const invitation = await verifyRegistrationToken(invitationToken, secret);
    if (
      !invitation || invitation.purpose !== "invite" ||
      invitation.phone !== phone
    ) return response({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return response(
        { error: "Service unavailable" },
        503,
      );
    }
    const database = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    let codeHash: string;
    try {
      codeHash = hashToDatabase(await sha256(code));
    } catch {
      return invalidOtp();
    }
    const { data: verified, error: verifyError } = await database.rpc(
      "verify_and_consume_otp",
      {
        p_phone: phone,
        p_purpose: PURPOSE,
        p_code_hash: codeHash,
      },
    );
    if (verifyError) return response({ error: "Service unavailable" }, 503);
    if (verified !== true) return invalidOtp();
    return response({
      verified: true,
      otpToken: await issueRegistrationToken({
        invitationId: invitation.invitationId,
        phone,
        purpose: "otp",
      }, secret),
    });
  },
);
