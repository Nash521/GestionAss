import { verifyWaveSignature } from "./wave-signature.ts";

Deno.test("Wave signature validates exact body and rejects altered, expired and malformed messages", async () => {
  const secret = "test-webhook-secret";
  const timestamp = 1_700_000_000;
  const body = new TextEncoder().encode('{"type":"checkout.session.completed"}');
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prefix = new TextEncoder().encode(String(timestamp));
  const payload = new Uint8Array(prefix.length + body.length); payload.set(prefix); payload.set(body, prefix.length);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, payload)), (b) => b.toString(16).padStart(2, "0")).join("");
  const header = `t=${timestamp},v1=${signature}`;
  if (!await verifyWaveSignature(body, header, secret, timestamp)) throw new Error("Valid signature rejected");
  if (!await verifyWaveSignature(body, `t=${timestamp},v1=${"0".repeat(64)},v1=${signature}`, secret, timestamp)) throw new Error("Rotated signature rejected");
  if (await verifyWaveSignature(new TextEncoder().encode("{}"), header, secret, timestamp)) throw new Error("Changed body accepted");
  if (await verifyWaveSignature(body, header, secret, timestamp + 301)) throw new Error("Expired signature accepted");
  if (await verifyWaveSignature(body, header, "wrong", timestamp)) throw new Error("Wrong secret accepted");
  if (await verifyWaveSignature(body, `t=${timestamp},t=${timestamp},v1=${signature}`, secret, timestamp)) throw new Error("Ambiguous timestamp accepted");
});
