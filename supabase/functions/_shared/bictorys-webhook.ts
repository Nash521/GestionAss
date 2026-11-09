const encoder = new TextEncoder();
const windowMs = 5 * 60 * 1000;

/** Validate the exact webhook body. A malformed signed request cannot fall back to the static key. */
export async function verifyBictorysWebhook(body: Uint8Array, headers: Headers, secret: string, now = Date.now()): Promise<boolean> {
  if (!secret) return false;
  const signature = headers.get("x-webhook-signature");
  const timestamp = headers.get("x-webhook-timestamp");
  if (signature !== null || timestamp !== null) {
    if (!signature || !timestamp || !/^[0-9a-f]{64}$/i.test(signature) || !/^\d{13}$/.test(timestamp)) return false;
    const time = Number(timestamp);
    if (!Number.isSafeInteger(time) || Math.abs(now - time) > windowMs) return false;
    const prefix = encoder.encode(`${timestamp}.`);
    const message = new Uint8Array(prefix.length + body.length);
    message.set(prefix); message.set(body, prefix.length);
    const bytes = new Uint8Array(signature.match(/../g)!.map((value) => parseInt(value, 16)));
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", key, bytes, message);
  }
  const received = headers.get("x-secret-key");
  if (!received) return false;
  // Compare fixed-size MACs using Web Crypto rather than a variable-time string comparison.
  const message = encoder.encode("bictorys-webhook-secret");
  const expectedKey = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const receivedKey = await crypto.subtle.importKey("raw", encoder.encode(received), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const expectedMac = await crypto.subtle.sign("HMAC", expectedKey, message);
  return crypto.subtle.verify("HMAC", receivedKey, expectedMac, message);
}
