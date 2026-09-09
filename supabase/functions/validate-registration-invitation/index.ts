import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { issueRegistrationToken } from "../_shared/registration-token.ts";

const PHONE_PATTERN = /^\+2250[157]\d{8}$/;
// Invitation codes are trimmed and limited to URL-safe administrative codes.
const INVITATION_CODE_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function invalidInvitation(): Response {
  return response({ error: "Invalid or expired invitation" }, 400);
}

async function hashInvitationCode(code: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)),
  );
  return `\\x${
    Array.from(hash, (value) => value.toString(16).padStart(2, "0")).join("")
  }`;
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
    let invitationCode: unknown;
    try {
      ({ phone, invitationCode } = await request.json());
    } catch {
      return invalidInvitation();
    }
    if (
      typeof phone !== "string" || typeof invitationCode !== "string" ||
      !PHONE_PATTERN.test(phone)
    ) {
      return invalidInvitation();
    }
    const normalizedInvitationCode = invitationCode.trim();
    if (
      !INVITATION_CODE_PATTERN.test(normalizedInvitationCode)
    ) return invalidInvitation();

    const secret = Deno.env.get("REGISTRATION_TOKEN_SECRET")?.trim();
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret || !url || !serviceKey) {
      return response({
        error: "Service unavailable",
      }, 503);
    }

    const database = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: invitation, error } = await database
      .from("organization_invitations")
      .select("id, is_active, expires_at, usage_limit, usage_count")
      .eq("code_hash", await hashInvitationCode(normalizedInvitationCode))
      .maybeSingle();
    if (error) return response({ error: "Service unavailable" }, 503);
    if (
      !invitation || !invitation.is_active ||
      (invitation.expires_at !== null &&
        new Date(invitation.expires_at).getTime() <= Date.now()) ||
      (invitation.usage_limit !== null &&
        invitation.usage_count >= invitation.usage_limit)
    ) {
      return invalidInvitation();
    }

    return response({
      invitationToken: await issueRegistrationToken({
        invitationId: invitation.id,
        phone,
        purpose: "invite",
      }, secret),
    });
  },
);
