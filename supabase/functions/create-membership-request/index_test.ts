Deno.test({
  name: "create-membership-request creates an inactive pending request against local Supabase",
  ignore: !Deno.env.get("LOCAL_SUPABASE_URL") || !Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const { hashToDatabase, sha256 } = await import("../_shared/otp.ts");
    const { issueRegistrationToken } = await import("../_shared/registration-token.ts");
    const url = Deno.env.get("LOCAL_SUPABASE_URL")!;
    const key = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const secret = "integration-registration-secret";
    const database = createClient(url, key, { auth: { persistSession: false } });
    const organizationId = crypto.randomUUID();
    const invitationId = crypto.randomUUID();
    const phone = "+2250701020304";
    const { error: organizationError } = await database.from("organizations").insert({ id: organizationId, name: `Integration ${organizationId}` });
    if (organizationError) throw organizationError;
    const { error: invitationError } = await database.from("organization_invitations").insert({ id: invitationId, organization_id: organizationId, code_hash: hashToDatabase(await sha256("INTEGRATION-INVITE")) });
    if (invitationError) throw invitationError;
    const token = await issueRegistrationToken({ invitationId, phone, purpose: "otp" }, secret);
    const child = new Deno.Command(Deno.execPath(), { args: ["run", "--allow-net", "--allow-env", "supabase/functions/create-membership-request/index.ts"], env: { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, REGISTRATION_TOKEN_SECRET: secret }, stdout: "null", stderr: "null" }).spawn();
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone, password: "Strong!Pass1", otpToken: token }) });
      if (response.status !== 201) throw new Error(`expected 201, got ${response.status}`);
      const { data: request, error } = await database.from("membership_requests").select("user_id,status").eq("phone", phone).single();
      if (error || request.status !== "pending") throw error ?? new Error("missing pending request");
      const { data: user, error: userError } = await database.from("users").select("is_active").eq("id", request.user_id).single();
      if (userError || user.is_active) throw userError ?? new Error("user must be inactive");
      await database.auth.admin.deleteUser(request.user_id);
    } finally {
      child.kill("SIGTERM");
      await database.from("organizations").delete().eq("id", organizationId);
    }
  },
});

Deno.test("create-membership-request rejects a request without OTP evidence", async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", "supabase/functions/create-membership-request/index.ts"],
    stdout: "null",
    stderr: "null",
  });
  const child = command.spawn();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const response = await fetch("http://127.0.0.1:8000", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+2250701020304" }),
  });
  child.kill("SIGTERM");
  if (response.status !== 401) throw new Error("OTP token must be required");
});

Deno.test("create-membership-request rejects an invalid OTP token", async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", "supabase/functions/create-membership-request/index.ts"],
    env: { REGISTRATION_TOKEN_SECRET: "test-registration-secret" },
    stdout: "null",
    stderr: "null",
  });
  const child = command.spawn();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const response = await fetch("http://127.0.0.1:8000", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone: "+2250701020304", password: "Strong!Pass1", otpToken: "invalid" }),
  });
  child.kill("SIGTERM");
  if (response.status !== 401) throw new Error("invalid OTP token must be rejected");
});
