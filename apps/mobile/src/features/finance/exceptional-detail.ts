import { getSupabaseClient } from "../../lib/supabase-client";
import type { ExceptionalContribution, FinanceStatus } from "../../lib/supabase";

export type ExceptionalStatusFilter = "all" | FinanceStatus;
export type ExceptionalMemberDue = {
  id: string; memberId: string; firstName: string; lastName: string; memberNumber: string;
  amountDue: number; amountPaid: number; amountRemaining: number; status: FinanceStatus;
};
export type ExceptionalContributionDetail = {
  contribution: ExceptionalContribution;
  summary: { memberCount: number; paidCount: number; partialCount: number; unpaidCount: number; totalExpected: number; totalCollected: number; totalRemaining: number };
  items: ExceptionalMemberDue[];
  metadata: { offset: number; limit: number; total: number };
};

export async function getExceptionalContributionDetail(id: string, status: ExceptionalStatusFilter = "all", offset = 0, query = ""): Promise<ExceptionalContributionDetail | null> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_exceptional_contribution_detail", {
    target_contribution_id: id, status_filter: status, page_offset: offset, page_limit: 30, search_query: query.trim(),
  } as never);
  if (error) throw error;
  return data as unknown as ExceptionalContributionDetail | null;
}
