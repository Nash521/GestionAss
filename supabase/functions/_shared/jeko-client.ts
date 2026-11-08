import { buildJekoPaymentRequest, type JekoPaymentMethod } from "./jeko.ts";

export type JekoCredentials = { apiKey: string; apiKeyId: string; storeId: string };
export type JekoPaymentRequest = { id: string; reference: string; storeId: string; status: "pending" | "success" | "error"; redirectUrl: string | null };

/** Jèko errors may contain account data: do not return their bodies to clients or logs. */
export class JekoApiError extends Error {
  constructor(readonly status: number) { super("Jèko request failed"); }
}

export async function createJekoPayment(input: {
  credentials: JekoCredentials; amountXof: number; reference: string; method: JekoPaymentMethod;
  successUrl: string; errorUrl: string;
}, fetcher: typeof fetch = fetch): Promise<JekoPaymentRequest> {
  const { credentials } = input;
  if (!credentials.apiKey || !credentials.apiKeyId) throw new Error("Missing Jèko credentials");
  const payload = buildJekoPaymentRequest({ ...input, storeId: credentials.storeId });
  const response = await fetcher("https://api.jeko.africa/partner_api/payment_requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": credentials.apiKey, "X-API-KEY-ID": credentials.apiKeyId },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new JekoApiError(response.status);
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Jèko response");
  const data = value as Record<string, unknown>;
  if (typeof data.id !== "string" || !data.id || data.reference !== input.reference || data.storeId !== credentials.storeId || data.status !== "pending" || typeof data.redirectUrl !== "string") throw new Error("Invalid Jèko response");
  let redirect: URL;
  try { redirect = new URL(data.redirectUrl); } catch { throw new Error("Invalid Jèko response"); }
  if (redirect.protocol !== "https:" || redirect.username || redirect.password) throw new Error("Invalid Jèko response");
  return { id: data.id, reference: input.reference, storeId: credentials.storeId, status: "pending", redirectUrl: redirect.toString() };
}
/** Retrieve a provider request for reconciliation, without exposing API credentials. */
export async function getJekoPayment(input: { credentials: JekoCredentials; requestId: string; reference: string }, fetcher: typeof fetch = fetch): Promise<{ status: "pending" | "success" | "error"; redirectUrl: string | null }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)) throw new Error("Invalid request ID");
  const response = await fetcher(`https://api.jeko.africa/partner_api/payment_requests/${input.requestId}`, { headers: { "X-API-KEY": input.credentials.apiKey, "X-API-KEY-ID": input.credentials.apiKeyId } });
  if (!response.ok) throw new JekoApiError(response.status);
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid Jèko response");
  const data = raw as Record<string, unknown>;
  if (data.id !== input.requestId || data.storeId !== input.credentials.storeId || data.reference !== input.reference || !["pending", "success", "error"].includes(String(data.status))) throw new Error("Mismatched Jèko response");
  let redirectUrl: string | null = null;
  if (typeof data.redirectUrl === "string") {
    const parsed = new URL(data.redirectUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Invalid Jèko redirect");
    redirectUrl = parsed.toString();
  }
  return { status: data.status as "pending" | "success" | "error", redirectUrl };
}
