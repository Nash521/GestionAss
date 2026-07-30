import { issueRegistrationToken } from "../_shared/registration-token.ts";

const secret = "test-registration-token-secret";
const port = 18081;
const baseUrl = `http://127.0.0.1:${port}`;
const functionFile = new URL("./index.ts", import.meta.url).pathname;

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await fetch(baseUrl, { method: "OPTIONS" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("send-registration-otp did not start");
}

function assertCors(response: Response): void {
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("missing Allow-Origin");
  if (response.headers.get("access-control-allow-methods") !== "POST, OPTIONS") throw new Error("missing Allow-Methods");
  if (response.headers.get("access-control-allow-headers") !== "content-type, authorization, apikey") throw new Error("missing Allow-Headers");
}

Deno.test("send-registration-otp rejects requests without invitation evidence", async () => {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", functionFile],
    env: { PORT: String(port), REGISTRATION_TOKEN_SECRET: secret },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await waitForServer();
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+2250701020304" }),
    });
    assertCors(response);
    if (response.status !== 401) throw new Error(`expected 401, received ${response.status}`);
  } finally {
    process.kill("SIGTERM");
    await process.status;
  }
});

Deno.test("send-registration-otp rejects invitation evidence bound to another phone", async () => {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", functionFile],
    env: { PORT: String(port), REGISTRATION_TOKEN_SECRET: secret },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await waitForServer();
    const invitationToken = await issueRegistrationToken({
      invitationId: "11111111-1111-1111-1111-111111111111",
      phone: "+2250701020304",
      purpose: "invite",
    }, secret);
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+2250101020304", invitationToken }),
    });
    if (response.status !== 401) throw new Error(`expected 401, received ${response.status}`);
  } finally {
    process.kill("SIGTERM");
    await process.status;
  }
});

Deno.test("send-registration-otp releases a failed SMS reservation so an immediate retry is allowed", async () => {
  const rpcCalls: Array<{ name: string; body: Record<string, unknown> }> = [];
  const database = Deno.serve({ port: 0 }, async (request) => {
    const match = new URL(request.url).pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/);
    if (!match) return new Response("not found", { status: 404 });
    rpcCalls.push({ name: match[1], body: await request.json() });
    return Response.json(true);
  });
  const databasePort = (database.addr as Deno.NetAddr).port;
  const invitationToken = await issueRegistrationToken({
    invitationId: "11111111-1111-1111-1111-111111111111",
    phone: "+2250701020304",
    purpose: "invite",
  }, secret);
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", functionFile],
    env: {
      PORT: String(port),
      DENO_ENV: "production",
      REGISTRATION_TOKEN_SECRET: secret,
      SUPABASE_URL: `http://127.0.0.1:${databasePort}`,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      ORANGE_SMS_API_URL: "http://127.0.0.1:1/unavailable",
      ORANGE_SMS_ACCESS_TOKEN: "test-access-token",
      ORANGE_SMS_SENDER: "+2250700000000",
    },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await waitForServer();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+2250701020304", invitationToken }),
      });
      if (response.status !== 503) throw new Error(`expected failed delivery to return 503, received ${response.status}`);
    }

    const reservations = rpcCalls.filter((call) => call.name === "issue_registration_otp");
    const releases = rpcCalls.filter((call) => call.name === "release_registration_otp");
    if (reservations.length !== 2) throw new Error(`expected immediate retry to reserve twice, received ${reservations.length}`);
    if (releases.length !== 2) throw new Error(`expected each failed SMS delivery to release its reservation, received ${releases.length}`);
    for (let index = 0; index < releases.length; index += 1) {
      const reservation = reservations[index].body;
      const release = releases[index].body;
      if (
        release.p_phone !== reservation.p_phone ||
        release.p_purpose !== reservation.p_purpose ||
        release.p_code_hash !== reservation.p_code_hash
      ) throw new Error("release must be conditional on the exact OTP reservation");
    }
  } finally {
    process.kill("SIGTERM");
    await process.status;
    await database.shutdown();
  }
});
