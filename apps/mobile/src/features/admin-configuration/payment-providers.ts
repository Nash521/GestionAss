import { invokeRegistrationFunction } from "../../lib/supabase-client";

export type PaymentProvider = "wave" | "orange_money" | "mtn_momo";
export type ProviderStatus = { provider: PaymentProvider; configured: boolean; updatedAt: string | null };

export async function getPaymentProviderStatuses(): Promise<ProviderStatus[]> {
  const result = await invokeRegistrationFunction<{ providers: ProviderStatus[] }>("payment-provider-settings", { action: "status" });
  return result.providers;
}

export async function savePaymentProviderKey(provider: PaymentProvider, apiKey: string): Promise<void> {
  await invokeRegistrationFunction("payment-provider-settings", { action: "save", provider, apiKey });
}

export async function removePaymentProviderKey(provider: PaymentProvider): Promise<void> {
  await invokeRegistrationFunction("payment-provider-settings", { action: "remove", provider });
}
