import { createSmsProvider, NoopSmsProvider } from "./sms.ts";

Deno.test("development SMS provider is a no-op", async () => {
  const provider = createSmsProvider("development");
  if (!(provider instanceof NoopSmsProvider)) throw new Error("development must not use a live provider");
  await provider.send({ to: "+2250100000000", body: "123456" });
});

Deno.test("production SMS requires all secrets", () => {
  let threw = false;
  try {
    createSmsProvider("production");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("production configuration must fail without secrets");
});
