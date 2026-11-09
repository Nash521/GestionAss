import { verifyBictorysWebhook } from "./bictorys-webhook.ts";

Deno.test("Bictorys webhook rejects tampering, expired signatures and authentication downgrade", async () => {
  const secret = "local-test-secret", timestamp = "1700000000000", now = Number(timestamp);
  const body = new TextEncoder().encode('{"id":"transaction-1","status":"succeeded"}');
  // Independently calculated HMAC-SHA256 for timestamp + '.' + raw body.
  const signature = "6d22e134b7c60875a32de4ce2d8b515f4142221f346c432af02ac2ff37bfae76";
  const signed = new Headers({ "x-webhook-signature": signature, "x-webhook-timestamp": timestamp });
  if (!await verifyBictorysWebhook(body, signed, secret, now)) throw new Error("Signature rejetée");
  if (await verifyBictorysWebhook(new TextEncoder().encode("{}"), signed, secret, now)) throw new Error("Corps modifié accepté");
  if (await verifyBictorysWebhook(body, signed, secret, now + 300001)) throw new Error("Signature expirée acceptée");
  if (!await verifyBictorysWebhook(body, new Headers({ "x-secret-key": secret }), secret, now)) throw new Error("Clé valide rejetée");
  if (await verifyBictorysWebhook(body, new Headers({ "x-secret-key": "autre" }), secret, now)) throw new Error("Clé incorrecte acceptée");
  if (await verifyBictorysWebhook(body, new Headers({ "x-secret-key": secret, "x-webhook-signature": "incorrect" }), secret, now)) throw new Error("Repli non sûr accepté");
});
