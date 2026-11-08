export type JekoPaymentMethod = "wave" | "orange" | "mtn" | "moov" | "djamo" | "jeko";

/** Construct a payment request from server-validated values; XOF amounts are whole francs. */
export function buildJekoPaymentRequest(input: {
  amountXof: number; reference: string; storeId: string; method: JekoPaymentMethod;
  successUrl: string; errorUrl: string;
}) {
  if (!Number.isSafeInteger(input.amountXof) || input.amountXof < 1 || input.amountXof > Math.floor(Number.MAX_SAFE_INTEGER / 100)) throw new Error("Invalid amount");
  if (!/^[A-Za-z0-9_-]{5,100}$/.test(input.reference)) throw new Error("Invalid reference");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.storeId)) throw new Error("Invalid store");
  if (!(["wave", "orange", "mtn", "moov", "djamo", "jeko"] as string[]).includes(input.method)) throw new Error("Invalid payment method");
  for (const value of [input.successUrl, input.errorUrl]) {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("Invalid return URL"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid return URL");
  }
  return { amountCents: input.amountXof * 100, currency: "XOF", reference: input.reference, storeId: input.storeId, paymentDetails: { type: "redirect", data: { paymentMethod: input.method, successUrl: input.successUrl, errorUrl: input.errorUrl } } };
}

/** Verify Jeko-Signature against the exact bytes delivered by Jèko. */
export async function verifyJekoSignature(body: Uint8Array, signature: string | null, secret: string): Promise<boolean> {
  if (!secret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const bytes = new Uint8Array(signature.match(/../g)!.map((part) => parseInt(part, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, bytes, new Uint8Array(body));
}

/** Match an authenticated event to one already-created payment request. */
export function matchesJekoPayment(eventName: string, payload: unknown, expected: {
  storeId: string; requestId: string; reference: string; amountXof: number;
}): boolean {
  if (eventName !== "TRANSACTION_COMPLETED" || !payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  if (!expected.storeId || !expected.requestId || !expected.reference || !Number.isSafeInteger(expected.amountXof) || expected.amountXof < 1 || expected.amountXof > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return false;
  const event = payload as Record<string, unknown>;
  if (event.status !== "success" || event.transactionType !== "payment" || typeof event.id !== "string" || !event.id.trim() || event.storeId !== expected.storeId) return false;
  if (!event.amount || typeof event.amount !== "object" || Array.isArray(event.amount) || !event.transactionDetails || typeof event.transactionDetails !== "object" || Array.isArray(event.transactionDetails)) return false;
  const amount = event.amount as Record<string, unknown>;
  const details = event.transactionDetails as Record<string, unknown>;
  return amount.currency === "XOF" && amount.amount === expected.amountXof * 100 && details.id === expected.requestId && details.reference === expected.reference;
}
