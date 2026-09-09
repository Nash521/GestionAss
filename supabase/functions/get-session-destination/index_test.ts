Deno.test("get-session-destination rejects requests without a bearer token", async () => {
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", "supabase/functions/get-session-destination/index.ts"],
    stdout: "null",
    stderr: "null",
  }).spawn();

  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST" });
    if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
  } finally {
    try { child.kill("SIGTERM"); } catch { /* the missing function already stopped */ }
  }
});
