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
