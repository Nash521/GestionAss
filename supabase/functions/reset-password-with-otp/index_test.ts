import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const localUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");
const resetPhone = "+2250701020304";
const resetUserId = "22222222-2222-2222-2222-222222222222";
const reservationId = "11111111-1111-1111-1111-111111111111";

type MockOutcome = "ok" | "error" | "false";

async function startResetFunction(mock: { reserve?: MockOutcome; update?: MockOutcome; finalize?: MockOutcome; release?: MockOutcome }) {
  const events: string[] = [];
  const database = Deno.serve({ port: 0 }, async (request) => {
    const url = new URL(request.url);
    const rpc = url.pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/);
    if (rpc) {
      events.push(rpc[1]);
      const outcome = rpc[1] === "reserve_password_reset_otp" ? mock.reserve : rpc[1] === "finalize_password_reset_otp" ? mock.finalize : mock.release;
      if (outcome === "error") return Response.json({ message: "temporary database outage" }, { status: 500 });
      if (rpc[1] === "reserve_password_reset_otp") return Response.json(reservationId);
      return Response.json(outcome === "false" ? false : true);
    }
    if (url.pathname === "/rest/v1/membership_requests") {
      return Response.json([{ user_id: resetUserId, status: "approved", users: { is_active: true } }]);
    }
    if (url.pathname.startsWith(`/auth/v1/admin/users/${resetUserId}`)) {
      events.push(request.method === "PUT" ? "updateUser" : "signOut");
      if (request.method === "PUT" && mock.update === "error") return Response.json({ message: "temporary auth outage" }, { status: 500 });
      return Response.json({});
    }
    if (url.pathname === "/auth/v1/logout") {
      events.push("signOut");
      return Response.json({});
    }
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
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    events,
    request: () => fetch(`http://127.0.0.1:${port}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: resetPhone, code: "123456", password: "Strong!Pass1" }),
    }),
    stop: async () => {
      try { child.kill("SIGTERM"); } catch { /* ended */ }
      await child.status;
      await database.shutdown();
    },
  };
}

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
    const aged = await database.from("auth_otps").update({ reset_reserved_at: new Date(Date.now() - 6 * 60 * 1000).toISOString() }).eq("phone", phone).eq("purpose", "password_reset");
    if (aged.error) throw new Error("unable to age reset OTP reservation");
    const whileReserved = await database.rpc("reserve_password_reset_otp", { p_phone: phone, p_code_hash: hash });
    if (whileReserved.data !== null || whileReserved.error) throw new Error("reserved OTP became reusable before expiry");
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
  const server = await startResetFunction({ update: "error" });
  try {
    const response = await server.request();
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
    if (server.events.join(",") !== "reserve_password_reset_otp,updateUser,release_password_reset_otp") throw new Error("failed password update did not release its OTP reservation");
  } finally {
    await server.stop();
  }
});

Deno.test("reset-password-with-otp returns 503 when reservation storage is unavailable", async () => {
  const server = await startResetFunction({ reserve: "error" });
  try {
    const response = await server.request();
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
    if (server.events.join(",") !== "reserve_password_reset_otp") throw new Error("password update ran without an OTP reservation");
  } finally {
    await server.stop();
  }
});

Deno.test("reset-password-with-otp does not sign out when OTP finalization fails", async () => {
  const server = await startResetFunction({ finalize: "error" });
  try {
    const response = await server.request();
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
    if (server.events.join(",") !== "reserve_password_reset_otp,updateUser,finalize_password_reset_otp") throw new Error("finalization failure must not release or sign out");
  } finally {
    await server.stop();
  }
});

Deno.test("reset-password-with-otp finalizes before globally signing out", async () => {
  const server = await startResetFunction({});
  try {
    const response = await server.request();
    if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
    if (server.events.join(",") !== "reserve_password_reset_otp,updateUser,finalize_password_reset_otp,signOut") throw new Error(`successful reset did not finalize before sign-out: ${server.events.join(",")}`);
  } finally {
    await server.stop();
  }
});
