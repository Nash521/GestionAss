const MAX_AGE_SECONDS = 300;

/** Verify the Wave-Signature header against the exact, unparsed request body. */
export async function verifyWaveSignature(
  body: Uint8Array,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header || !secret) return false;
  const fields = header.split(",").map((part) => part.trim().split("="));
  const timestamps = fields.filter(([name]) => name === "t");
  const signatures = fields.filter(([name]) => name === "v1").map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d{1,12}$/.test(timestamps[0][1] ?? "")) return false;
  const timestamp = Number(timestamps[0][1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > MAX_AGE_SECONDS) return false;
  const validSignatures = signatures.filter((value): value is string => typeof value === "string" && /^[0-9a-f]{64}$/i.test(value));
  if (!validSignatures.length) return false;
  const prefix = new TextEncoder().encode(timestamps[0][1]);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix); signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const signature of validSignatures) {
    const bytes = new Uint8Array(signature.match(/../g)!.map((part) => parseInt(part, 16)));
    if (await crypto.subtle.verify("HMAC", key, bytes, signed)) return true;
  }
  return false;
}
