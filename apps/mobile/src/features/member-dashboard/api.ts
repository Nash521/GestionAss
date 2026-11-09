import { getSupabaseClient } from "../../lib/supabase-client";
import type { MemberDashboardData } from "./model";

export async function getMyMemberDashboard(year: number): Promise<MemberDashboardData> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_dashboard", { selected_year: year } as never);
  if (error || !data) throw error ?? new Error("Tableau de bord indisponible.");
  return data as unknown as MemberDashboardData;
}
