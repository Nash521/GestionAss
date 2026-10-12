import { getSupabaseClient } from "../../lib/supabase-client";
import type { MemberDashboardData } from "./model";
import type { MonthlyPaymentContext } from "../../lib/supabase";
import type { WaveMonthlyLinks } from "../admin-configuration/wave";

export async function getMyMemberDashboard(year: number): Promise<MemberDashboardData> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_dashboard", { selected_year: year } as never);
  if (error || !data) throw error ?? new Error("Tableau de bord indisponible.");
  return data as unknown as MemberDashboardData;
}

export async function getMyMemberWavePaymentLink(): Promise<string | null> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_wave_payment_link");
  if (error) throw error;
  return data as string | null;
}

export async function getMyWaveMonthlyLinks(): Promise<WaveMonthlyLinks> {
  const { data, error } = await getSupabaseClient().rpc("get_my_wave_monthly_links");
  if (error || !data) throw error ?? new Error("Liens Wave indisponibles.");
  return data as WaveMonthlyLinks;
}

export async function getMyExceptionalWaveLink(dueId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient().rpc("get_my_exceptional_wave_link", { target_due_id: dueId } as never);
  if (error) throw error;
  return data as string | null;
}

export async function getMyMonthlyPaymentContext(month: string): Promise<MonthlyPaymentContext | null> {
  const { data, error } = await getSupabaseClient().rpc("get_my_monthly_payment_context", { target_month: `${month}-01` } as never);
  if (error) throw error;
  return data as MonthlyPaymentContext | null;
}
