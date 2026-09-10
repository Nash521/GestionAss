import { createHandler } from "./index.ts";

Deno.test("send-password-reset-otp keeps a neutral response for invalid input", async () => {
  const previousSecret = Deno.env.get("OTP_HASH_SECRET");
  Deno.env.set("OTP_HASH_SECRET", "test-otp-hash-secret");
  try {
    const handler = createHandler(() => {
      throw new Error("runtime must not be created for invalid input");
    });
    const response = await handler(new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "invalid" }),
    }));
    if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
    const body = await response.json();
    if (body.sent !== true) throw new Error("expected neutral sent=true response");
  } finally {
    if (previousSecret === undefined) Deno.env.delete("OTP_HASH_SECRET");
    else Deno.env.set("OTP_HASH_SECRET", previousSecret);
  }
});

Deno.test("send-password-reset-otp releases the reserved OTP when SMS delivery fails", async () => {
  const previousSecret = Deno.env.get("OTP_HASH_SECRET");
  Deno.env.set("OTP_HASH_SECRET", "test-otp-hash-secret");
  let reserveCalls = 0;
  let releaseCalls = 0;
  let smsCalls = 0;

  try {
    const handler = createHandler(() => ({
      isEligibleAccount: async () => true,
      reserveOtp: async () => {
        reserveCalls += 1;
        return true;
      },
      releaseOtp: async () => {
        releaseCalls += 1;
        return true;
      },
      sendSms: async () => {
        smsCalls += 1;
        throw new Error("simulated SMS provider failure");
      },
    }));

    const response = await handler(new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+2250701020304" }),
    }));

    if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
    const body = await response.json();
    if (body.sent !== true) throw new Error("expected neutral sent=true response");
    if (reserveCalls !== 1) throw new Error(`expected one reservation, got ${reserveCalls}`);
    if (smsCalls !== 1) throw new Error(`expected one SMS attempt, got ${smsCalls}`);
    if (releaseCalls !== 1) throw new Error(`expected one OTP release, got ${releaseCalls}`);
  } finally {
    if (previousSecret === undefined) Deno.env.delete("OTP_HASH_SECRET");
    else Deno.env.set("OTP_HASH_SECRET", previousSecret);
  }
});
