import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const localUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

Deno.test({
  name: "password-reset reservation releases after failure and consumes after success",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = (10_000_000 + crypto.getRandomValues(new Uint32Array(1))[0] % 90_000_000).toString();
    const phone = `+22507${suffix}`;
    const hash = "\\x" + "01".repeat(32);
    const seeded = await database.rpc("issue_registration_otp", { p_phone: phone, p_purpose: "password_reset", p_code_hash: hash });
    if (seeded.data !== true || seeded.error) throw new Error("unable to seed reset OTP");
    const first = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (typeof first.data !== "string" || first.error) throw new Error("valid OTP was not reserved");
    const released = await database.rpc("release_password_reset_otp", { p_phone: phone, p_reservation: first.data });
    if (released.data !== true || released.error) throw new Error("reservation was not released");
    const second = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (typeof second.data !== "string" || second.error) throw new Error("released OTP was not reservable");
    const finalized = await database.rpc("finalize_password_reset_otp", { p_phone: phone, p_reservation: second.data });
    if (finalized.data !== true || finalized.error) throw new Error("reservation was not finalized");
    const afterFinalization = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (afterFinalization.data !== null || afterFinalization.error) throw new Error("consumed OTP was reservable");
  },
});

Deno.test("reset-password-with-otp rejects an invalid request", async () => {
  const child = new Deno.Command(Deno.execPath(), { args: ["run", "--allow-net", "--allow-env", "supabase/functions/reset-password-with-otp/index.ts"], env: { OTP_HASH_SECRET: "test-otp-hash-secret" }, stdout: "null", stderr: "null" }).spawn();
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "+2250701020304" }) });
    if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  } finally { try { child.kill("SIGTERM"); } catch { /* ended */ } }
});

Deno.test("reset-password-with-otp releases its reservation when Auth rejects the password update", async () => {
  const rpcCalls: Array<{ name: string; body: Record<string, unknown> }> = [];
  const database = Deno.serve({ port: 0 }, async (request) => {
    const url = new URL(request.url);
    const rpc = url.pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/);
    if (rpc) {
      rpcCalls.push({ name: rpc[1], body: await request.json() });
      return Response.json(rpc[1] === "reserve_password_reset_otp" ? "11111111-1111-1111-1111-111111111111" : true);
    }
    if (url.pathname === "/rest/v1/membership_requests") {
      return Response.json([{ user_id: "22222222-2222-2222-2222-222222222222", status: "approved", users: { is_active: true } }]);
    }
    if (url.pathname.startsWith("/auth/v1/admin/users/")) return Response.json({ message: "temporary auth outage" }, { status: 500 });
    return new Response("not found", { status: 404 });
  });
  const databasePort = (database.addr as Deno.NetAddr).port;
  const port = 18082;
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", "supabase/functions/reset-password-with-otp/index.ts"],
    env: {
      PORT: String(port),
      OTP_HASH_SECRET: "test-otp-hash-secret",
      SUPABASE_URL: `http://127.0.0.1:${databasePort}`,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const response = await fetch(`http://127.0.0.1:${port}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+2250701020304", code: "123456", password: "Strong!Pass1" }),
    });
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
    const reservation = rpcCalls.find((call) => call.name === "reserve_password_reset_otp");
    const release = rpcCalls.find((call) => call.name === "release_password_reset_otp");
    if (!reservation || !release) throw new Error("failed password update did not release its OTP reservation");
    if (release.body.p_phone !== reservation.body.p_phone || release.body.p_reservation !== "11111111-1111-1111-1111-111111111111") {
      throw new Error("OTP release was not bound to the original reservation");
    }
  } finally {
    try { child.kill("SIGTERM"); } catch { /* ended */ }
    await child.status;
    await database.shutdown();
  }
});
