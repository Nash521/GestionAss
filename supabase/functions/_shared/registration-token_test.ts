import {
  issueRegistrationToken,
  verifyRegistrationToken,
} from "./registration-token.ts";

const secret = "test-registration-token-secret";
const input = {
  invitationId: "inv-1",
  phone: "+2250701020304",
  purpose: "invite" as const,
};

Deno.test("issues a verifiable registration token", async () => {
  const token = await issueRegistrationToken(input, secret);
  const payload = await verifyRegistrationToken(token, secret);

  if (payload === null) throw new Error("valid token was rejected");
  if (payload.invitationId !== input.invitationId) throw new Error("invitation id changed");
  if (payload.phone !== input.phone) throw new Error("phone changed");
  if (payload.purpose !== input.purpose) throw new Error("purpose changed");
  if (payload.expiresAt <= Date.now()) throw new Error("token did not receive a future expiry");
});

Deno.test("rejects an altered registration token", async () => {
  const token = await issueRegistrationToken(input, secret);

  if (await verifyRegistrationToken(`${token}x`, secret) !== null) {
    throw new Error("altered token accepted");
  }
});

Deno.test("rejects an expired registration token", async () => {
  const token = await issueRegistrationToken(input, secret, 0);

  if (await verifyRegistrationToken(token, secret) !== null) {
    throw new Error("expired token accepted");
  }
});
