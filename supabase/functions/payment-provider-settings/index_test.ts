import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { decryptPaymentCredential, encryptPaymentCredential } from "../_shared/payment-credentials.ts";
import { createHandler } from "./index.ts";

const organizationId = "51000000-0000-0000-0000-000000000001";
const adminId = "52000000-0000-0000-0000-000000000001";
const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

Deno.test("credentials use randomized authenticated encryption bound to association and provider", async () => {
  Deno.env.set("PAYMENT_CREDENTIAL_ENCRYPTION_KEY", key);
  const first = await encryptPaymentCredential("secret-merchant-key", organizationId, "wave");
  const second = await encryptPaymentCredential("secret-merchant-key", organizationId, "wave");
  assert(first !== second);
  assert(!first.includes("secret-merchant-key"));
  assertEquals(await decryptPaymentCredential(first, organizationId, "wave"), "secret-merchant-key");
  await assertRejects(() => decryptPaymentCredential(first, organizationId, "orange_money"));
  await assertRejects(() => decryptPaymentCredential(first, "61000000-0000-0000-0000-000000000001", "wave"));
});

Deno.test("provider settings never return saved keys and reject non-admins", async () => {
  Deno.env.set("PAYMENT_CREDENTIAL_ENCRYPTION_KEY", key);
  let saved: Record<string, unknown> = {};
  const database = {
    auth: { getUser: async () => ({ data: { user: { id: adminId } }, error: null }) },
    from: (table: string) => ({
      select: () => table === "users"
        ? { eq: () => ({ single: async () => ({ data: { organization_id: organizationId, role: "admin", is_active: true }, error: null }) }) }
        : { eq: async () => ({ data: Object.keys(saved).length ? [{ provider: "wave", updated_at: "2026-10-04" }] : [], error: null }) },
      upsert: async (row: Record<string, unknown>) => { saved = row; return { error: null }; },
    }),
  };
  const handler = createHandler(() => database as never);
  const request = (body: Record<string, unknown>) => new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer valid", "content-type": "application/json" }, body: JSON.stringify(body) });
  const save = await handler(request({ action: "save", provider: "wave", apiKey: "secret-merchant-key" }));
  assertEquals(save.status, 200);
  assertEquals(await save.json(), { configured: true });
  assert(typeof saved.encrypted_credentials === "string");
  assert(!JSON.stringify(saved).includes("secret-merchant-key"));
  const status = await handler(request({ action: "status" }));
  assertEquals(status.status, 200);
  assert(!JSON.stringify(await status.json()).includes("secret-merchant-key"));

  const member = createHandler(() => ({ ...database, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { organization_id: organizationId, role: "member", is_active: true }, error: null }) }) }) }) }) as never);
  assertEquals((await member(request({ action: "status" }))).status, 403);
});
