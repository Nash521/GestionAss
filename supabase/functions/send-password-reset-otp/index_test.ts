Deno.test("send-password-reset-otp returns a neutral response for a valid phone", async () => {
  const child = new Deno.Command(Deno.execPath(), { args: ["run", "--allow-net", "--allow-env", "supabase/functions/send-password-reset-otp/index.ts"], env: { OTP_HASH_SECRET: "test-otp-hash-secret" }, stdout: "null", stderr: "null" }).spawn();
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "+2250701020304" }) });
    if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
  } finally { try { child.kill("SIGTERM"); } catch { /* process ended */ } }
});
