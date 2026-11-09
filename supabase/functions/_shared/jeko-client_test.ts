import { createJekoPayment, JekoApiError } from "./jeko-client.ts";
const input = { credentials: { apiKey: "api-secret", apiKeyId: "key-id", storeId: "59ae202a-f583-4a15-970f-9e99bd1e0baa" }, amountXof: 5000, reference: "cotisation_123", method: "wave" as const, successUrl: "https://example.com/success", errorUrl: "https://example.com/error" };
Deno.test("Jèko request uses server credentials and converts XOF to centimes", async () => {
  const fetcher: typeof fetch = (_url, init) => {
    const headers = new Headers(init?.headers);
    const payload = JSON.parse(String(init?.body));
    if (headers.get("X-API-KEY") !== "api-secret" || headers.get("X-API-KEY-ID") !== "key-id" || payload.amountCents !== 500000 || payload.storeId !== input.credentials.storeId) throw new Error("Invalid request");
    return Promise.resolve(Response.json({ id: "request-id", reference: input.reference, storeId: input.credentials.storeId, status: "pending", redirectUrl: "https://checkout.jeko.africa/pay" }));
  };
  const result = await createJekoPayment(input, fetcher);
  if (result.id !== "request-id" || result.status !== "pending") throw new Error("Invalid result");
});
Deno.test("Jèko errors and mismatched responses are rejected without revealing response bodies", async () => {
  let error: unknown;
  try { await createJekoPayment(input, () => Promise.resolve(new Response("api-secret", { status: 401 }))); } catch (e) { error = e; }
  if (!(error instanceof JekoApiError) || error.status !== 401 || error.message.includes("api-secret")) throw new Error("Unsafe error");
  for (const response of [
    { id: "r", reference: input.reference, storeId: "wrong", status: "pending", redirectUrl: "https://example.com" },
    { id: "r", reference: input.reference, storeId: input.credentials.storeId, status: "success", redirectUrl: "https://example.com" },
    { id: "r", reference: input.reference, storeId: input.credentials.storeId, status: "pending", redirectUrl: "http://example.com" },
  ]) {
    let rejected = false;
    try { await createJekoPayment(input, () => Promise.resolve(Response.json(response))); } catch { rejected = true; }
    if (!rejected) throw new Error("Invalid response accepted");
  }
});
