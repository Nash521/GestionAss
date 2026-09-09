import { issueRegistrationToken } from "../_shared/registration-token.ts";

const secret = "test-registration-token-secret";
const port = 18082;
const baseUrl = `http://127.0.0.1:${port}`;
const functionFile = new URL("./index.ts", import.meta.url).pathname;
const localSupabaseUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceRoleKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await fetch(baseUrl, { method: "OPTIONS" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("verify-registration-otp did not start");
}

function assertCors(response: Response): void {
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("missing Allow-Origin");
  if (response.headers.get("access-control-allow-methods") !== "POST, OPTIONS") throw new Error("missing Allow-Methods");
  if (response.headers.get("access-control-allow-headers") !== "content-type, authorization, apikey") throw new Error("missing Allow-Headers");
}

Deno.test("verify-registration-otp rejects requests without invitation evidence", async () => {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", functionFile],
    env: { PORT: String(port), REGISTRATION_TOKEN_SECRET: secret, OTP_HASH_SECRET: "test-otp-hash-secret" },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await waitForServer();
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+2250701020304", code: "123456" }),
    });
    assertCors(response);
    if (response.status !== 401) throw new Error(`expected 401, received ${response.status}`);
  } finally {
    process.kill("SIGTERM");
    await process.status;
  }
});

Deno.test({
  name: "verify-registration-otp returns a generic 400 for an invalid OTP against local Supabase",
  ignore: !localSupabaseUrl || !localServiceRoleKey,
  fn: async () => {
    const suffix = (10_000_000 + crypto.getRandomValues(new Uint32Array(1))[0] % 90_000_000).toString();
    const phone = `+22507${suffix}`;
    const invitationToken = await issueRegistrationToken({
      invitationId: "11111111-1111-1111-1111-111111111111",
      phone,
      purpose: "invite",
    }, secret);
    const headers = {
      "Content-Type": "application/json",
      apikey: localServiceRoleKey!,
      Authorization: `Bearer ${localServiceRoleKey}`,
    };
    const seed = await fetch(`${localSupabaseUrl}/rest/v1/rpc/issue_registration_otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_phone: phone,
        p_purpose: "registration",
        p_code_hash: "\\x" + "01".repeat(32),
      }),
    });
    if (!seed.ok) throw new Error(`local OTP setup failed: ${seed.status}`);

    const process = new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-net", "--allow-env", functionFile],
      env: {
        PORT: String(port),
        REGISTRATION_TOKEN_SECRET: secret,
        OTP_HASH_SECRET: "test-otp-hash-secret",
        SUPABASE_URL: localSupabaseUrl!,
        SUPABASE_SERVICE_ROLE_KEY: localServiceRoleKey!,
      },
      stdout: "null",
      stderr: "null",
    }).spawn();
    try {
      await waitForServer();
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: "000000", invitationToken }),
      });
      assertCors(response);
      if (response.status !== 400) throw new Error(`expected 400, received ${response.status}`);
      const body = await response.json();
      if (body.error !== "Invalid or expired code") throw new Error("expected a generic invalid OTP response");
    } finally {
      process.kill("SIGTERM");
      await process.status;
    }
  },
});
