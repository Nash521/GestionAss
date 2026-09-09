import {
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  createOtp,
  hashFromDatabase,
  isExpired,
  isResendAllowed,
  safeVerifyOtp,
} from "./otp.ts";

Deno.test("createOtp binds its hash to the supplied server secret", async () => {
  const secret = "otp-hash-secret";
  const otp = await createOtp(secret);

  if (!/^\d{6}$/.test(otp.code)) throw new Error("expected six digits");
  if (otp.codeHash.length !== 32) throw new Error("expected HMAC-SHA-256 hash");
  if (await safeVerifyOtp("000000", otp.codeHash, secret)) throw new Error("wrong code matched");
  if (!await safeVerifyOtp(otp.code, otp.codeHash, secret)) throw new Error("correct code did not match");
  if (await safeVerifyOtp(otp.code, otp.codeHash, "different-otp-hash-secret")) {
    throw new Error("a different server secret must not verify the OTP");
  }
});

Deno.test("OTP timing constants enforce the registration policy", () => {
  if (OTP_EXPIRY_MS !== 10 * 60 * 1000) throw new Error("expiry must be ten minutes");
  if (OTP_RESEND_COOLDOWN_MS !== 5 * 60 * 1000) throw new Error("cooldown must be five minutes");
  if (OTP_ATTEMPT_LIMIT !== 5) throw new Error("limit must be five attempts");
});

Deno.test("expiry and resend policy use their exact boundaries", () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS).toISOString();
  const lastSentAt = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS).toISOString();

  if (isExpired(expiresAt, now)) throw new Error("code should remain valid at expiry boundary");
  if (!isExpired(new Date(now.getTime() - 1).toISOString(), now)) throw new Error("past code should expire");
  if (!isResendAllowed(lastSentAt, now)) throw new Error("resend should be allowed at cooldown boundary");
  if (isResendAllowed(now.toISOString(), now)) throw new Error("immediate resend should be blocked");
});

Deno.test("hashFromDatabase rejects malformed persisted values", () => {
  let threw = false;
  try {
    hashFromDatabase("not-a-hash");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("malformed hash must be rejected");
});
