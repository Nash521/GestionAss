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
