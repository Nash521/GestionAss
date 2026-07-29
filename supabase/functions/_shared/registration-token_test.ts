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

Deno.test("does not expose registration payload values to the token holder", async () => {
  const token = await issueRegistrationToken(input, secret);
  const decodedParts = token.split(".").map((part) => {
    const base64 = part.replaceAll("-", "+").replaceAll("_", "/");
    return atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  }).join("");

  for (const secretValue of Object.values(input)) {
    if (token.includes(secretValue)) throw new Error(`token exposes ${secretValue}`);
    if (decodedParts.includes(secretValue)) throw new Error(`decoded token exposes ${secretValue}`);
  }
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

Deno.test("rejects a token encrypted with another secret", async () => {
  const token = await issueRegistrationToken(input, secret);

  if (await verifyRegistrationToken(token, "another-secret") !== null) {
    throw new Error("token encrypted with a different secret was accepted");
  }
});

Deno.test("rejects malformed registration tokens", async () => {
  if (await verifyRegistrationToken("not-a-token", secret) !== null) {
    throw new Error("malformed token accepted");
  }
});

Deno.test("rejects oversized registration tokens before processing", async () => {
  const token = "a".repeat(8_193);
  if (await verifyRegistrationToken(token, secret) !== null) {
    throw new Error("oversized token accepted");
  }
});
