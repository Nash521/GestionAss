import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJekoSecret } from "../_shared/jeko-credentials.ts";
import { matchesJekoPayment, verifyJekoSignature } from "../_shared/jeko.ts";

type Intent = { id: string; organization_id: string; store_id: string; reference: string; provider_request_id: string | null; amount_xof: number };
type Dependencies = {
  findIntent(reference: string): Promise<Intent | null>;
  getSecret(organizationId: string): Promise<string | null>;
  confirm(intent: Intent, transactionId: string): Promise<void>;
};
const response = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
export const createHandler = (deps: Dependencies) => async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return response(405);
  if (request.headers.get("jeko-event") !== "TRANSACTION_COMPLETED") return response(200);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 65536) return response(413);
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length > 65536) return response(413);
    const event: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!event || typeof event !== "object" || Array.isArray(event)) return response(400);
    const value = event as Record<string, unknown>;
    if (!value.transactionDetails || typeof value.transactionDetails !== "object" || Array.isArray(value.transactionDetails)) return response(200);
    const reference = (value.transactionDetails as Record<string, unknown>).reference;
    if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{5,100}$/.test(reference)) return response(200);
    const intent = await deps.findIntent(reference);
    if (!intent) return response(200);
    const secret = await deps.getSecret(intent.organization_id);
    if (!secret || !await verifyJekoSignature(bytes, request.headers.get("jeko-signature"), secret)) return response(401);
    // A callback can race creation of the provider request; ask Jèko to retry.
    if (!intent.provider_request_id) return response(503);
    if (!matchesJekoPayment("TRANSACTION_COMPLETED", value, { storeId: intent.store_id, requestId: intent.provider_request_id, reference: intent.reference, amountXof: Number(intent.amount_xof) })) return response(400);
    await deps.confirm(intent, value.id as string);
    return response(200);
  } catch { return response(503); }
};

if (import.meta.main) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const master = Deno.env.get("JEKO_CREDENTIALS_ENCRYPTION_KEY") ?? "";
  const db = createClient(url, key, { auth: { persistSession: false } });
  Deno.serve(createHandler({
    async findIntent(reference) {
      const { data, error } = await db.from("jeko_payment_intents").select("id, organization_id, store_id, reference, provider_request_id, amount_xof").eq("reference", reference).maybeSingle();
      if (error) throw error;
      return data as Intent | null;
    },
    async getSecret(organizationId) {
      const { data, error } = await db.from("jeko_configurations").select("encrypted_webhook_secret").eq("organization_id", organizationId).maybeSingle();
      if (error) throw error;
      return data ? await decryptJekoSecret(data.encrypted_webhook_secret, master, organizationId) : null;
    },
    async confirm(intent, transactionId) {
      const { error } = await db.rpc("confirm_jeko_monthly_payment", { intent_id: intent.id, transaction_id: transactionId, request_id: intent.provider_request_id, store: intent.store_id, payment_reference: intent.reference, amount: intent.amount_xof });
      if (error) throw error;
    },
  }));
}
