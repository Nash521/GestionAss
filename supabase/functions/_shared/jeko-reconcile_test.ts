import { getJekoPayment } from "./jeko-client.ts";
const credentials = { apiKey: "secret", apiKeyId: "id", storeId: "store-a" };
const requestId = "59ae202a-f583-4a15-970f-9e99bd1e0baa";
Deno.test("reconciliation verifies provider ID, association store and reference", async () => {
  const value = { id: requestId, storeId: "store-a", reference: "ref-123", status: "pending", redirectUrl: "https://pay.jeko.africa/pay" };
  const input = { credentials, requestId, reference: "ref-123" };
  const fetcher = (body: unknown): typeof fetch => () => Promise.resolve(Response.json(body));
  if ((await getJekoPayment(input, fetcher(value))).status !== "pending") throw new Error("Valid response rejected");
  for (const invalid of [{ ...value, storeId: "other" }, { ...value, reference: "other" }, { ...value, id: "other" }, { ...value, status: "unknown" }, { ...value, redirectUrl: "http://example.com" }]) {
    let rejected = false;
    try { await getJekoPayment(input, fetcher(invalid)); } catch { rejected = true; }
    if (!rejected) throw new Error("Invalid response accepted");
  }
});
