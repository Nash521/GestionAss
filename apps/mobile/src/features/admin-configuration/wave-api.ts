import { getSupabaseClient } from "../../lib/supabase-client";
import type { WaveMonthlyLinks } from "./wave";

export async function getAdminWaveMonthlyLinks(): Promise<WaveMonthlyLinks> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_wave_monthly_links");
  if (error || !data) throw error ?? new Error("Liens Wave indisponibles.");
  return data as WaveMonthlyLinks;
}

export async function updateAdminWaveMonthlyLinks(links: WaveMonthlyLinks): Promise<WaveMonthlyLinks> {
  const { data, error } = await getSupabaseClient().rpc("update_admin_wave_monthly_links", { full_url: links.fullUrl ?? "", half_url: links.halfUrl ?? "" } as never);
  if (error || !data) throw error ?? new Error("Enregistrement impossible.");
  return data as WaveMonthlyLinks;
}

export type WaveMerchantChangeState = {
  pending: null | { id: string; oldMerchantId: string; newMerchantId: string; fullUrl: string; halfUrl: string | null; requestedByMe: boolean; requestedAt: string };
  missingExceptionalLinks: { id: string; label: string; amount: number; dueDate: string }[];
};

export async function getWaveMerchantChangeState(): Promise<WaveMerchantChangeState> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_wave_merchant_change_state");
  if (error || !data) throw error ?? new Error("Impossible de charger les demandes Wave.");
  return data as WaveMerchantChangeState;
}

export async function requestWaveMerchantChange(fullUrl: string, halfUrl: string | null): Promise<void> {
  const { error } = await getSupabaseClient().rpc("request_wave_merchant_change", { full_url: fullUrl, half_url: halfUrl } as never);
  if (error) throw error;
}

export async function decideWaveMerchantChange(requestId: string, approve: boolean): Promise<void> {
  const { error } = await getSupabaseClient().rpc("decide_wave_merchant_change", { request_id: requestId, approve } as never);
  if (error) throw error;
}

export async function updateExceptionalWaveLink(contributionId: string, paymentUrl: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("update_admin_exceptional_wave_link", { contribution_id: contributionId, payment_url: paymentUrl } as never);
  if (error) throw error;
}
