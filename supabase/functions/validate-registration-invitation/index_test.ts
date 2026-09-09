const port = 18080;
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
  throw new Error("validate-registration-invitation did not start");
}

function assertCors(response: Response): void {
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("missing Allow-Origin");
  if (response.headers.get("access-control-allow-methods") !== "POST, OPTIONS") throw new Error("missing Allow-Methods");
  if (response.headers.get("access-control-allow-headers") !== "content-type, authorization, apikey") throw new Error("missing Allow-Headers");
}

Deno.test("validate-registration-invitation rejects an oversized code before hashing", async () => {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", functionFile],
    env: { PORT: String(port) },
    stdout: "null",
    stderr: "null",
  }).spawn();
  try {
    await waitForServer();
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+2250701020304",
        invitationCode: "A".repeat(129),
      }),
    });
    assertCors(response);
    if (response.status !== 400) {
      throw new Error(`expected 400, received ${response.status}`);
    }
    const body = await response.json();
    if (body.error !== "Invalid or expired invitation") {
      throw new Error("expected generic invitation rejection");
    }
  } finally {
    process.kill("SIGTERM");
    await process.status;
  }
});
