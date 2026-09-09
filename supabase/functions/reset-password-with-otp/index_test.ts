Deno.test("reset-password-with-otp rejects an invalid request", async () => {
  const child = new Deno.Command(Deno.execPath(), { args: ["run", "--allow-net", "--allow-env", "supabase/functions/reset-password-with-otp/index.ts"], env: { OTP_HASH_SECRET: "test-otp-hash-secret" }, stdout: "null", stderr: "null" }).spawn();
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "+2250701020304" }) });
    if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  } finally { try { child.kill("SIGTERM"); } catch { /* ended */ } }
});
