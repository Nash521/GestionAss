import { getSupabaseClient } from "../../lib/supabase-client";

export type MemberProfile = {
  firstName: string;
  lastName: string;
  memberNumber: string;
  phone: string;
  joiningDate: string;
  memberStatus: "pending_membership" | "active" | "suspended";
  organizationName: string;
  membershipStatus: "paid" | "partial" | "unpaid";
  membershipAmountDue: number;
  membershipAmountPaid: number;
};

export type MemberTransaction = {
  id: string;
  kind: "membership" | "monthly" | "exceptional";
  label: string;
  month: string | null;
  amount: number;
  paidOn: string;
  paymentSource: "manual" | "wave" | "jeko";
  reference: string | null;
};

export type MemberTransactionsPage = { items: MemberTransaction[]; total: number };

export async function getMyMemberProfile(): Promise<MemberProfile> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_profile", {} as never);
  if (error || !data) throw error ?? new Error("Profil indisponible.");
  return data as unknown as MemberProfile;
}

export async function getMyMemberTransactions(offset = 0, limit = 30): Promise<MemberTransactionsPage> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_transactions", { page_limit: limit, page_offset: offset } as never);
  if (error || !data) throw error ?? new Error("Transactions indisponibles.");
  return data as unknown as MemberTransactionsPage;
}
