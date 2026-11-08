import { createHandler } from "./index.ts";
const intent = { id: "intent-a", organization_id: "org-a", store_id: "store-a", reference: "payment_123", provider_request_id: "request-a", amount_xof: 5000 };
const payload = { id: "transaction-a", storeId: "store-a", status: "success", transactionType: "payment", amount: { amount: 500000, currency: "XOF" }, transactionDetails: { id: "request-a", reference: "payment_123" } };
async function signedRequest(body: unknown, secret = "webhook-secret") {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes)), (n) => n.toString(16).padStart(2, "0")).join("");
  return new Request("https://example.com/webhook", { method: "POST", headers: { "jeko-event": "TRANSACTION_COMPLETED", "jeko-signature": signature }, body: bytes });
}
Deno.test("webhook verifies signature and all payment fields before confirming", async () => {
  let count = 0;
  const handler = createHandler({ findIntent: () => Promise.resolve(intent), getSecret: () => Promise.resolve("webhook-secret"), confirm: () => { count++; return Promise.resolve(); } });
  if ((await handler(await signedRequest(payload))).status !== 200 || count !== 1) throw new Error("Valid webhook was rejected");
  if ((await handler(await signedRequest(payload, "other-secret"))).status !== 401 || count !== 1) throw new Error("Invalid signature accepted");
  if ((await handler(await signedRequest({ ...payload, amount: { amount: 1, currency: "XOF" } }))).status !== 400 || count !== 1) throw new Error("Mismatched payment accepted");
  if ((await handler(await signedRequest({ ...payload, storeId: "other" }))).status !== 400 || count !== 1) throw new Error("Wrong store accepted");
});
Deno.test("webhook asks Jèko to retry when provider request is not persisted yet", async () => {
  const handler = createHandler({ findIntent: () => Promise.resolve({ ...intent, provider_request_id: null }), getSecret: () => Promise.resolve("webhook-secret"), confirm: () => { throw new Error("Unexpected confirmation"); } });
  if ((await handler(await signedRequest(payload))).status !== 503) throw new Error("Expected retry");
});
