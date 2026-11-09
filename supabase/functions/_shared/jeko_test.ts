import { buildJekoPaymentRequest, matchesJekoPayment, verifyJekoSignature } from "./jeko.ts";

Deno.test("Jèko charge converts francs to centimes and rejects unsafe inputs", () => {
  const input = { amountXof: 5000, reference: "cotisation_123", storeId: "59ae202a-f583-4a15-970f-9e99bd1e0baa", method: "wave" as const, successUrl: "https://example.com/success", errorUrl: "https://example.com/error" };
  const result = buildJekoPaymentRequest(input);
  if (result.amountCents !== 500000 || result.currency !== "XOF" || result.paymentDetails.data.paymentMethod !== "wave") throw new Error("Invalid request");
  for (const invalid of [{ ...input, amountXof: 0 }, { ...input, amountXof: 2.5 }, { ...input, storeId: "another-store" }, { ...input, successUrl: "http://example.com" }]) {
    let rejected = false; try { buildJekoPaymentRequest(invalid); } catch { rejected = true; }
    if (!rejected) throw new Error("Invalid input accepted");
  }
});

Deno.test("Jèko signature authenticates raw payload", async () => {
  // RFC 4231 HMAC-SHA256 test vector 1.
  const body = new TextEncoder().encode("Hi There");
  const secret = "\u000b".repeat(20);
  const signature = "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7";
  if (!await verifyJekoSignature(body, signature, secret)) throw new Error("Valid signature rejected");
  if (await verifyJekoSignature(new TextEncoder().encode("Hi there"), signature, secret)) throw new Error("Modified payload accepted");
  if (await verifyJekoSignature(body, signature, "wrong")) throw new Error("Wrong secret accepted");
  if (await verifyJekoSignature(body, "not-a-signature", secret)) throw new Error("Malformed signature accepted");
});

Deno.test("Jèko confirmation is scoped to the exact request, association and amount", () => {
  const expected = { storeId: "store-a", requestId: "request-a", reference: "due-a", amountXof: 5000 };
  const event = { id: "transaction-a", status: "success", transactionType: "payment", storeId: "store-a", amount: { amount: 500000, currency: "XOF" }, transactionDetails: { id: "request-a", reference: "due-a" } };
  if (!matchesJekoPayment("TRANSACTION_COMPLETED", event, expected)) throw new Error("Valid transaction rejected");
  for (const invalid of [
    { ...event, storeId: "store-b" }, { ...event, status: "pending" }, { ...event, transactionType: "transfer" },
    { ...event, amount: { amount: 5000, currency: "XOF" } }, { ...event, amount: { amount: 500000, currency: "EUR" } },
    { ...event, transactionDetails: { id: "request-b", reference: "due-a" } }, { ...event, transactionDetails: { id: "request-a", reference: "due-b" } },
  ]) if (matchesJekoPayment("TRANSACTION_COMPLETED", invalid, expected)) throw new Error("Mismatched transaction accepted");
  if (matchesJekoPayment("OTHER_EVENT", event, expected)) throw new Error("Wrong event accepted");
});
